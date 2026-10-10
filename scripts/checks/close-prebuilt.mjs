// cairn-cms: the `check:close` runner. Many of the close checks start with `npm run package` when
// run as their own npm script, and each build takes one to two minutes, so a chain of `npm run`
// calls spent most of its time rebuilding an unchanged `dist`. This runner builds `dist`
// once, then runs every component with that leading build removed, the same way docs-gate.mjs
// builds once for the whole docs gate. A component still builds when a developer runs its own npm
// script alone.
//
// CI does not run this script. It runs each component as its own workflow step (or inside the
// docs gate), and the unit tests hold every entry of CLOSE_COMPONENTS to one of those steps.
//
// Interface: `node scripts/checks/close-prebuilt.mjs [<check> ...]`. With no names every component
// runs. Names (a component's label, such as `check:vale`) run only those components, in list
// order, and `dist` is still built once. A name outside the list is refused before the build.
// Every selected component runs even after one fails, so one run reports every red check and
// prints each check's seconds; the exit code is non-zero when any component or the build failed.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { delimiter, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { repoRoot } from '../repo-root.mjs';

const ROOT = repoRoot(import.meta.url);

/** The leading build a component script carries when run as its own npm script. */
export const PACKAGE_PREFIX = 'npm run package && ';

/**
 * Every close check, in run order, spelled as a shell command. A component that is an `npm run`
 * of this package runs its script's body, with the leading package build removed; any other
 * component runs exactly as spelled here.
 * @type {readonly string[]}
 */
export const CLOSE_COMPONENTS = Object.freeze([
  'npm run check',
  'npm run check:package',
  'npm run check:audit-pack',
  'npm run check:reference',
  'npm run check:reference:signatures',
  'npm run check:options',
  'npm run check:surface',
  'npm run check:self-use',
  'npm run check:custom-surface',
  'npm run check:chassis-boundary',
  'npm run check:cm-internals',
  'npm run check:idioms',
  'npm run check:invisible-craft',
  'npm run check:admin-css-classes',
  'npm run check:readiness',
  'npm run check:tool-conditions',
  'npm run check:docs',
  'npm run check:rulings-format',
  'npm run check:target-stack',
  'npm run check:arm-indexes',
  'npm run check:editor-quotes',
  'npm run check:facts',
  'npm run check:provenance',
  'npm run check:leaks',
  'npm run check:visuals',
  'npm run check:transcripts',
  'npm run check:symbols',
  'npm run check:snippets',
  'npm run check:prose',
  'npm run check:version',
  'npm run check:dev-package',
  'npm run check:template',
  'npm run check:consumers',
  'npm --prefix examples/showcase run check',
  'npm --prefix examples/showcase run check:cairn',
  'npm --prefix examples/showcase run format:check',
  'npm run check:public-skill',
  'npm run check:vale',
  'npm run check:comments',
  'npm run check:public-tokens',
]);

/**
 * The close steps, each a label plus the shell command this runner runs for it. A component whose
 * own script starts with the package build runs its script's remainder; any other component runs
 * exactly as the list spells it.
 * @param {Record<string, string>} scripts - package.json's `scripts` block.
 * @param {readonly string[]} [components] - The component list; defaults to CLOSE_COMPONENTS.
 * @returns {{ label: string, command: string }[]} The steps, in component order.
 */
export function closeSteps(scripts, components = CLOSE_COMPONENTS) {
  return components.map((component) => {
    const named = component.match(/^npm run (\S+)$/);
    if (!named) return { label: component, command: component };
    const label = named[1];
    const body = scripts[label];
    if (body === undefined) {
      throw new Error(`close-prebuilt: the component list names "${label}", which package.json lacks`);
    }
    if (body.startsWith(PACKAGE_PREFIX)) {
      const rest = body.slice(PACKAGE_PREFIX.length);
      // A second build inside the remainder would defeat the point, and would mean the script's
      // shape changed in a way this runner was not written for.
      if (rest.includes('npm run package')) {
        throw new Error(`close-prebuilt: "${label}" builds the package twice`);
      }
      return { label, command: rest };
    }
    if (body.includes('npm run package')) {
      throw new Error(`close-prebuilt: "${label}" builds the package somewhere other than its start`);
    }
    return { label, command: component };
  });
}

/**
 * Narrow the steps to the named subset, keeping list order. No names selects every step.
 * @param {{ label: string, command: string }[]} steps - Every step.
 * @param {string[]} names - Step labels.
 * @returns {{ label: string, command: string }[]} The selected steps.
 * @throws {Error} When a name matches no step label.
 */
export function selectSteps(steps, names) {
  if (names.length === 0) return steps;
  const known = new Set(steps.map((step) => step.label));
  const unknown = names.filter((name) => !known.has(name));
  if (unknown.length > 0) {
    throw new Error(`close-prebuilt: no such check: ${unknown.join(', ')}. Known checks: ${[...known].join(', ')}`);
  }
  return steps.filter((step) => names.includes(step.label));
}

/**
 * Build `dist` once, run every step, and report. A failing step never stops the ones after it.
 * @param {{ label: string, command: string }[]} steps - The steps to run, in order.
 * @param {{
 *   build?: () => boolean,
 *   run?: (step: { label: string, command: string }) => boolean,
 *   now?: () => number,
 *   out?: (line: string) => void,
 *   err?: (line: string) => void,
 * }} [options] - Seams for the build, a step's execution, the clock (milliseconds), and output.
 * @returns {number} The process exit code: 0 when the build and every step passed, else 1.
 */
export function runClose(steps, options = {}) {
  const build = options.build ?? buildDist;
  const run = options.run ?? runStep;
  const now = options.now ?? (() => performance.now());
  const out = options.out ?? ((line) => console.log(line));
  const err = options.err ?? ((line) => console.error(line));

  out('== npm run package (dist, built once for the whole close check) ==');
  if (!build()) {
    err('check:close: npm run package failed; no component ran');
    return 1;
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
    out(`== ${step.label} ==`);
    const started = now();
    const ok = run(step);
    timings.push(`${step.label} ${seconds(started, now())}`);
    if (!ok) failed.push(step.label);
  }

  out('== seconds per check ==');
  for (const line of timings) out(line);
  if (failed.length === 0) {
    out(`check:close: OK (${steps.length} check(s))`);
    return 0;
  }
  err(`check:close: ${failed.length} check(s) failed: ${failed.join(', ')}`);
  return 1;
}

/** @returns {boolean} Whether `npm run package` exited 0. */
function buildDist() {
  return spawnSync('npm', ['run', 'package'], { cwd: ROOT, stdio: 'inherit' }).status === 0;
}

/**
 * Run one step's shell command in the repo root with the package's tool binaries on PATH.
 * @param {{ label: string, command: string }} step - The step to run.
 * @returns {boolean} Whether the command exited 0.
 */
function runStep(step) {
  // A script body names its tools bare (publint, attw), which npm resolves from node_modules/.bin.
  const env = { ...process.env, PATH: `${join(ROOT, 'node_modules', '.bin')}${delimiter}${process.env.PATH ?? ''}` };
  return spawnSync('sh', ['-c', step.command], { cwd: ROOT, stdio: 'inherit', env }).status === 0;
}

/** Read the component list, apply any named subset from argv, and run the close. */
function main() {
  const { scripts } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  let steps;
  try {
    steps = selectSteps(closeSteps(scripts), process.argv.slice(2));
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
    return;
  }
  process.exitCode = runClose(steps);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
