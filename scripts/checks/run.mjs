// cairn-cms: the check runner. It runs one row of the registry or one group of rows, and builds
// `dist` once when the run needs it, so a chain of checks never rebuilds an unchanged package.
//
// Interface:
//   node scripts/checks/run.mjs --list
//   node scripts/checks/run.mjs <check> [<word> ...]
//   node scripts/checks/run.mjs <group> [<check> ...] [--page <path>]
//
// A check run builds first only when its row sets `build`, then runs the row's command, its
// targets, and the words after its name. A group run always builds once before its first check,
// because some checks in a group read `dist` without asking for a build. Named checks narrow a group
// run to those checks, in the group's order. Every selected check runs even after one fails, and
// the exit code is 1 when the build or any check failed.
import { spawnSync } from 'node:child_process';
import { delimiter, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { repoRoot } from '../repo-root.mjs';
import { missingInstalls } from './close-prebuilt.mjs';
import { CHECKS, GROUPS } from './registry.mjs';

const ROOT = repoRoot(import.meta.url);

const USAGE = [
  'Usage: node scripts/checks/run.mjs --list',
  '       node scripts/checks/run.mjs <check> [<word> ...]',
  '       node scripts/checks/run.mjs <group> [<check> ...] [--page <path>]',
].join('\n');

/**
 * One check ready to run. The runner joins the command, the targets, and the words into one shell
 * line, quoting each target and word.
 * @typedef {object} Step
 * @property {string} name - The row's name, used in every output line.
 * @property {string} command - The row's command, run as written.
 * @property {readonly string[]} targets - Trailing words that follow the command.
 * @property {readonly string[]} words - Words that follow the targets.
 * @property {boolean} build - Whether a run outside a group builds `dist` for this step.
 */

/**
 * Parse the command line. Only a group run reads flags: a check run passes every word after the
 * check's name through to the check.
 * @param {string[]} argv - The arguments after the script path.
 * @returns {{ list: boolean, name: string | null, group: boolean, words: string[], page: string | null }}
 *   For a group run, `words` are the checks to narrow to; for a check run, the words to pass on.
 * @throws {Error} On no arguments, an unknown flag, a `--page` with no path, `--page` outside the
 *   docs-gate group, or a group that has no script.
 */
export function parseArgs(argv) {
  const parsed = { list: false, name: null, group: false, words: [], page: null };
  const [first, ...rest] = argv;
  if (first === undefined) throw new Error(`run.mjs: name a check or a group.\n${USAGE}`);
  if (first === '--list') {
    if (rest.length > 0) throw new Error(`run.mjs: --list takes no other arguments.\n${USAGE}`);
    return { ...parsed, list: true };
  }
  if (first.startsWith('-')) throw new Error(`run.mjs: unknown flag ${first}.\n${USAGE}`);
  if (!Object.hasOwn(GROUPS, first)) return { ...parsed, name: first, words: rest };

  if (GROUPS[first] === null) {
    throw new Error(`run.mjs: the ${first} group has no npm script, so run.mjs does not run it.`);
  }
  /** @type {string[]} */
  const names = [];
  /** @type {string | null} */
  let page = null;
  for (let i = 0; i < rest.length; i++) {
    const word = rest[i];
    if (word === '--page') {
      if (first !== 'docs-gate') throw new Error(`run.mjs: --page works only with the docs-gate group.`);
      page = rest[++i] ?? null;
      if (page === null) throw new Error('run.mjs: --page needs a path.');
    } else if (word.startsWith('-')) {
      throw new Error(`run.mjs: unknown flag ${word}.\n${USAGE}`);
    } else {
      names.push(word);
    }
  }
  return { ...parsed, name: first, group: true, words: names, page };
}

/**
 * The steps a group run takes, in the group's order. With `page` set, a row marked `narrow` runs
 * the page in place of its targets, and a row marked `skip` is left out. The group's `groupArgs`
 * become each row's words.
 * @param {readonly import('./registry.mjs').Check[]} rows - The registry rows to read.
 * @param {string} group - The group to run.
 * @param {string[]} names - Checks to narrow the run to; none runs the whole group.
 * @param {{ page?: string | null }} [options] - The page a docs-gate run narrows to.
 * @returns {Step[]} The steps, in the group's order.
 * @throws {Error} When no row belongs to the group, a name is not in the group, or a selected row's
 *   command runs `npm run package` itself.
 */
export function groupSteps(rows, group, names, { page = null } = {}) {
  const members = rows
    .filter((row) => Object.hasOwn(row.groups, group))
    .sort((a, b) => a.groups[group] - b.groups[group]);
  if (members.length === 0) throw new Error(`run.mjs: no check belongs to the ${group} group.`);

  const known = members.map((row) => row.name);
  const unknown = names.filter((name) => !known.includes(name));
  if (unknown.length > 0) {
    throw new Error(
      `run.mjs: the ${group} group has no check named ${unknown.join(', ')}. Its checks are ${known.join(', ')}.`,
    );
  }

  const selected = names.length === 0 ? members : members.filter((row) => names.includes(row.name));
  return selected
    .filter((row) => !(page && row.page === 'skip'))
    .map((row) => {
      // A row asks for dist only through `build`, so the runner can build once for a whole group.
      if (row.command.includes('npm run package')) {
        throw new Error(`run.mjs: ${row.name} runs npm run package in its command. Set its build field instead.`);
      }
      return {
        name: row.name,
        command: row.command,
        targets: page && row.page === 'narrow' ? [page] : (row.targets ?? []),
        words: row.groupArgs?.[group] ?? [],
        build: row.build,
      };
    });
}

/**
 * Run the steps and report each one. With `group` set, the run checks the installs first when the
 * group is `close`, always builds `dist` once, and ends with each check's seconds and a summary line
 * keyed on the group's npm script. Without it, the run builds only when a step sets `build`, and
 * ends with the step's own verdict line. A failing step never stops the ones after it.
 * @param {Step[]} steps - The steps to run, in order.
 * @param {{
 *   group?: string,
 *   build?: () => boolean,
 *   run?: (step: { name: string, command: string }) => boolean,
 *   now?: () => number,
 *   out?: (line: string) => void,
 *   err?: (line: string) => void,
 *   exists?: (path: string) => boolean,
 * }} [options] - The group being run, and seams for the build, a step's shell line, the clock
 *   (milliseconds), output, and the install check.
 * @returns {number} The process exit code: 0 when the build and every step passed, else 1.
 * @throws {Error} When `group` names a group with no npm script.
 */
export function runSteps(steps, options = {}) {
  const build = options.build ?? buildDist;
  const run = options.run ?? runStep;
  const now = options.now ?? (() => performance.now());
  const out = options.out ?? ((line) => console.log(line));
  const err = options.err ?? ((line) => console.error(line));
  const group = options.group;
  const script = group === undefined ? null : GROUPS[group];
  if (group !== undefined && !script) throw new Error(`run.mjs: the ${group} group has no npm script.`);
  const label = script ?? steps.map((step) => step.name).join(', ');

  if (group === 'close') {
    const missing = missingInstalls(options.exists);
    if (missing.length > 0) {
      err(`${script}: an install is missing. Run ${missing.join(' and ')}.`);
      return 1;
    }
  }

  if (script || steps.some((step) => step.build)) {
    out(`== npm run package (dist, built once for ${label}) ==`);
    if (!build()) {
      err(`${label}: npm run package failed, so no check ran.`);
      return 1;
    }
  }

  /**
   * @param {number} from - Start, in milliseconds.
   * @param {number} to - End, in milliseconds.
   * @returns {string} The span in seconds to one decimal place.
   */
  const seconds = (from, to) => `${((to - from) / 1000).toFixed(1)}s`;
  /** @type {string[]} */
  const timings = [];
  /** @type {string[]} */
  const failed = [];
  for (const step of steps) {
    out(`== ${step.name} ==`);
    const started = now();
    const ok = run({ name: step.name, command: shellLine(step) });
    timings.push(`${step.name} ${seconds(started, now())}`);
    out(`${step.name}: ${ok ? 'OK' : 'FAIL'}`);
    if (!ok) failed.push(step.name);
  }

  if (!script) return failed.length === 0 ? 0 : 1;
  out('== seconds per check ==');
  for (const line of timings) out(line);
  if (failed.length === 0) {
    out(`${script}: OK (${steps.length} check(s))`);
    return 0;
  }
  err(`${script}: ${failed.length} check(s) failed: ${failed.join(', ')}`);
  return 1;
}

/**
 * @param {Step} step - The step to spell.
 * @returns {string} The command, then each target and word in single quotes.
 */
function shellLine(step) {
  return [step.command, ...[...step.targets, ...step.words].map(quote)].join(' ');
}

/**
 * @param {string} word - Any word.
 * @returns {string} The word as one `sh` argument.
 */
function quote(word) {
  return `'${word.replaceAll("'", `'\\''`)}'`;
}

/** @returns {boolean} Whether `npm run package` exited 0. */
function buildDist() {
  return spawnSync('npm', ['run', 'package'], { cwd: ROOT, stdio: 'inherit' }).status === 0;
}

/**
 * Run one shell line in the repo root with the package's tool binaries on PATH.
 * @param {{ name: string, command: string }} step - The step's name and full shell line.
 * @returns {boolean} Whether the line exited 0.
 */
function runStep(step) {
  // A command names its tools bare (publint, attw, vale), which npm would resolve from node_modules/.bin.
  const env = { ...process.env, PATH: `${join(ROOT, 'node_modules', '.bin')}${delimiter}${process.env.PATH ?? ''}` };
  return spawnSync('sh', ['-c', step.command], { cwd: ROOT, stdio: 'inherit', env }).status === 0;
}

/** Read the command line, then list the checks or run one check or one group. */
function main() {
  let args;
  let steps;
  try {
    args = parseArgs(process.argv.slice(2));
    if (args.list) {
      for (const name of CHECKS.map((row) => row.name).sort()) console.log(name);
      return;
    }
    const name = /** @type {string} */ (args.name);
    if (args.group) {
      steps = groupSteps(CHECKS, name, args.words, { page: args.page });
    } else {
      const row = CHECKS.find((check) => check.name === name);
      if (!row) throw new Error(`run.mjs: no check or group named ${name}. Run node scripts/checks/run.mjs --list to see the checks.`);
      steps = [{ name: row.name, command: row.command, targets: row.targets ?? [], words: args.words, build: row.build }];
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }
  process.exitCode = runSteps(steps, args.group ? { group: /** @type {string} */ (args.name) } : {});
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
