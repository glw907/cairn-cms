// The gate's reader: exits 0 only when the release body's `## Gate` table holds exactly one `pass`
// row each for `naive`, `scripted`, and `owner`, with `scripted` at the release's own commit and
// `naive` and `owner` at commits with no rerun-path change up to it. Pass B's `verdict` job runs it
// from a sparse checkout with no history and no install, so it reads each row's diff through the
// compare API and imports only Node built-ins and ./record.mjs.
//
// Usage: node scripts/gate/verdict.mjs <version> [--file <path>] [--commit <sha>]
//
// The release's commit is `--commit`, else `GITHUB_SHA`, else the checkout's HEAD. With --file it
// reads a local record instead of the release body.
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { LEGS, changedFiles, ghDefault, parseGateRows, rerunPathsTouched, sameCommit, splitBody } from './record.mjs';

const execFileAsync = promisify(execFile);

/**
 * @typedef {object} GhResult
 * @property {number} code the exit code
 * @property {string} stdout what gh printed
 */

/**
 * Judge a record's text.
 * @param {{ body: string, releaseCommit: string, gh: (args: string[]) => Promise<GhResult> }} input
 *  `gh` reads the compare between a row's commit and the release's
 * @returns {Promise<{ ok: boolean, reasons: string[] }>} every reason the record does not clear the gate
 */
export async function judge({ body, releaseCommit, gh }) {
  const { section } = splitBody(body);
  if (section === '') return { ok: false, reasons: ['the record has no `## Gate` section'] };
  /** @type {string[]} */
  const reasons = [];
  /** @type {string[]} */
  const rejected = [];
  const rows = parseGateRows(section, rejected);
  for (const reason of rejected) reasons.push(`cannot parse: ${reason}`);
  for (const leg of LEGS) {
    const own = rows.filter((row) => row.leg === leg);
    if (own.length === 0) {
      reasons.push(`missing row for ${leg}`);
      continue;
    }
    if (own.length > 1) {
      reasons.push(`${own.length} rows for ${leg}`);
      continue;
    }
    const [row] = own;
    if (row.verdict !== 'pass') {
      reasons.push(`${leg} reads "${row.verdict}", not pass`);
      continue;
    }
    if (sameCommit(row.commit, releaseCommit)) continue;
    if (leg === 'scripted') {
      reasons.push(`scripted passed at ${row.commit}, not at the release's commit ${releaseCommit}`);
      continue;
    }
    if (row.commit.length < 7 || row.commit === '-') {
      reasons.push(`${leg} names no commit`);
      continue;
    }
    const diff = await changedFiles(gh, row.commit, releaseCommit);
    if (!diff.ok) {
      reasons.push(`${leg}: ${diff.reason}`);
      continue;
    }
    const touched = rerunPathsTouched(diff.files);
    if (touched.length > 0) reasons.push(`${leg} passed at ${row.commit}, and ${touched.slice(0, 3).join(', ')} changed under a rerun path since`);
  }
  return { ok: reasons.length === 0, reasons };
}

/**
 * Read and judge a release.
 * @param {{ version: string, releaseCommit: string, file?: string, gh?: (args: string[]) => Promise<GhResult> }} input
 *  `gh` is the injected reader for the release body and the compares
 * @returns {Promise<{ ok: boolean, reasons: string[] }>} the verdict
 */
export async function verdict({ version, releaseCommit, file, gh = ghDefault }) {
  let body;
  if (file !== undefined) {
    try {
      body = await readFile(file, 'utf8');
    } catch {
      return { ok: false, reasons: [`could not read ${file}`] };
    }
  } else {
    const tag = `v${version}`;
    const read = await gh(['release', 'view', tag, '--json', 'body', '--jq', '.body']);
    if (read.code !== 0) return { ok: false, reasons: [`could not read release ${tag} (gh exit ${read.code})`] };
    body = read.stdout;
  }
  return judge({ body, releaseCommit, gh });
}

/**
 * @param {string | undefined} flagged the `--commit` value
 * @returns {Promise<string>} the release's commit: the flag, else `GITHUB_SHA`, else HEAD
 */
async function releaseCommitOf(flagged) {
  if (flagged) return flagged;
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD']);
  return stdout.trim();
}

/** @param {string[]} argv the arguments after the script name */
async function main(argv) {
  const value = (/** @type {string} */ name) => {
    const at = argv.indexOf(name);
    return at === -1 ? undefined : argv[at + 1];
  };
  const version = argv.find((arg, i) => !arg.startsWith('--') && !['--file', '--commit'].includes(argv[i - 1]));
  const file = value('--file');
  const commit = value('--commit');
  if (version === undefined || (argv.includes('--file') && file === undefined) || (argv.includes('--commit') && commit === undefined)) {
    console.error('Usage: node scripts/gate/verdict.mjs <version> [--file <path>] [--commit <sha>]');
    process.exit(2);
  }
  const result = await verdict({ version, file, releaseCommit: await releaseCommitOf(commit) });
  if (result.ok) {
    console.log(`Gate for ${version}: one pass row per leg, each at a commit that holds.`);
    return;
  }
  console.error(`Gate for ${version} does not pass:`);
  for (const reason of result.reasons) console.error(`- ${reason}`);
  process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main(process.argv.slice(2));
