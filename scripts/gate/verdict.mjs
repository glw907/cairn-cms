// The gate's reader: exits 0 only when the release body's `## Gate` table holds exactly one `pass`
// row each for A1, A2, B1, and B2 under one `Run` id. Pass B's `verdict` job runs it from a sparse
// checkout with no install, so it imports only Node built-ins and ./record.mjs.
//
// Usage: node scripts/gate/verdict.mjs <version> [--file <path>]
//
// With --file it reads a local record, and the one-run-id rule holds per group (A1 with A2, B1
// with B2), since the rehearsal reruns by group.
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { parseGateRows, splitBody } from './record.mjs';

const execFileAsync = promisify(execFile);
const LEGS = ['A1', 'A2', 'B1', 'B2'];
const GROUPS = [
  ['A1', 'A2'],
  ['B1', 'B2'],
];

/**
 * @typedef {object} GhResult
 * @property {number} code the exit code
 * @property {string} stdout what gh printed
 */

/**
 * @param {string[]} args gh arguments
 * @returns {Promise<GhResult>} a non-zero exit is a result, not a throw
 */
async function ghDefault(args) {
  try {
    const { stdout } = await execFileAsync('gh', args, { timeout: 60_000 });
    return { code: 0, stdout };
  } catch (error) {
    const failure = /** @type {{ code?: number, stdout?: string }} */ (error);
    return { code: typeof failure.code === 'number' ? failure.code : 1, stdout: failure.stdout ?? '' };
  }
}

/**
 * Judge a record's text.
 * @param {string} body the release body, or a local record
 * @param {boolean} perGroup whether the one-run-id rule holds per group instead of across all four
 * @returns {{ ok: boolean, reasons: string[] }} every reason the record does not clear the gate
 */
export function judge(body, perGroup) {
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
    if (own.length === 0) reasons.push(`missing row for ${leg}`);
    else if (own.length > 1) reasons.push(`${own.length} rows for ${leg}`);
    else if (own[0].verdict !== 'pass') reasons.push(`${leg} reads "${own[0].verdict}", not pass`);
  }
  const groups = perGroup ? GROUPS : [LEGS];
  for (const group of groups) {
    const runs = new Set(rows.filter((row) => group.includes(row.leg)).map((row) => row.run));
    if (runs.size > 1) reasons.push(`${group.join(', ')} carry more than one Run id: ${[...runs].join(', ')}`);
  }
  return { ok: reasons.length === 0, reasons };
}

/**
 * Read and judge a release.
 * @param {{ version: string, file?: string, gh?: (args: string[]) => Promise<GhResult> }} input
 *  `gh` is the injected reader for the release body
 * @returns {Promise<{ ok: boolean, reasons: string[] }>} the verdict
 */
export async function verdict({ version, file, gh = ghDefault }) {
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
  return judge(body, file !== undefined);
}

/** @param {string[]} argv the arguments after the script name */
async function main(argv) {
  const version = argv.find((arg, i) => !arg.startsWith('--') && argv[i - 1] !== '--file');
  const at = argv.indexOf('--file');
  const file = at === -1 ? undefined : argv[at + 1];
  if (version === undefined || (at !== -1 && file === undefined)) {
    console.error('Usage: node scripts/gate/verdict.mjs <version> [--file <path>]');
    process.exit(2);
  }
  const result = await verdict({ version, file });
  if (result.ok) {
    console.log(`Gate for ${version}: four pass rows under one run id.`);
    return;
  }
  console.error(`Gate for ${version} does not pass:`);
  for (const reason of result.reasons) console.error(`- ${reason}`);
  process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main(process.argv.slice(2));
