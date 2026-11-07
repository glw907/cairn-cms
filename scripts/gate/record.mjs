// The gate's record: a `## Gate` table in the release's body, one row per leg. It reads the body
// first and replaces an earlier `## Gate` section rather than stacking, merging a leg's row over
// an earlier row for the same leg. A failed read, or an empty body, aborts with no write, and a URL
// carrying `token=` is refused, since the release body is public.
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** The table's columns, in order. */
export const GATE_COLUMNS = ['Leg', 'Path', 'URL', 'Commit', 'Marker', 'Fetched', 'Verdict', 'Run'];
const HEADING = '## Gate';

/**
 * @typedef {object} GateRow
 * @property {string} leg `A1`, `A2`, `B1`, or `B2`
 * @property {string} path the entry's public path
 * @property {string} url the address the fetch polled
 * @property {string} commit the marker's commit sha, or `-` when the leg has none
 * @property {string} marker the edit's unique marker
 * @property {string} fetched ISO time of the last fetch
 * @property {string} verdict `pass`, `fail: <every reason>`, `pending`, or `skipped: needs <leg>`
 * @property {string} run the run directory's name, which ties the row to one run
 */

/**
 * @typedef {object} GhResult
 * @property {number} code the exit code
 * @property {string} stdout what gh printed
 */

/**
 * Refuse a row that would publish a sign-in token.
 * @param {GateRow[]} rows the rows about to be written
 * @returns {void}
 */
export function assertNoToken(rows) {
  for (const row of rows) {
    for (const cell of Object.values(row)) {
      if (/token=/i.test(String(cell))) throw new Error(`The ${row.leg} row carries a URL with token=; the gate refuses to record it.`);
    }
  }
}

/** @param {string} cell */
const escapeCell = (cell) => cell.replace(/\|/g, '\\|').replace(/\n/g, ' ');
/** @param {string} cell */
const unescapeCell = (cell) => cell.replace(/\\\|/g, '|');

/**
 * Render rows as the section, heading first.
 * @param {GateRow[]} rows the rows, any order
 * @returns {string} the section, ending in a newline
 */
export function renderGateSection(rows) {
  const sorted = [...rows].sort((a, b) => a.leg.localeCompare(b.leg));
  const lines = [HEADING, '', `| ${GATE_COLUMNS.join(' | ')} |`, `| ${GATE_COLUMNS.map(() => '---').join(' | ')} |`];
  for (const row of sorted) {
    const cells = [row.leg, row.path, row.url, row.commit, row.marker, row.fetched, row.verdict, row.run];
    lines.push(`| ${cells.map(escapeCell).join(' | ')} |`);
  }
  return `${lines.join('\n')}\n`;
}

/**
 * Split a body around its `## Gate` section.
 * @param {string} body the release body
 * @returns {{ before: string, section: string, after: string }} the section is empty when absent
 */
export function splitBody(body) {
  const lines = body.split('\n');
  const start = lines.findIndex((line) => line.trim() === HEADING);
  if (start === -1) return { before: body, section: '', after: '' };
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^#{1,2}\s/.test(lines[i])) {
      end = i;
      break;
    }
  }
  return { before: lines.slice(0, start).join('\n'), section: lines.slice(start, end).join('\n'), after: lines.slice(end).join('\n') };
}

/**
 * The rows an earlier `## Gate` section holds.
 * @param {string} section the section text
 * @param {string[]} [rejected] collects a reason for each row left out, so a reader can fail on it
 * @returns {GateRow[]} the parsed rows
 */
export function parseGateRows(section, rejected = []) {
  /** @type {GateRow[]} */
  const rows = [];
  for (const line of section.split('\n')) {
    if (!line.startsWith('|') || /^\|\s*-/.test(line) || line.startsWith(`| ${GATE_COLUMNS[0]} `)) continue;
    const cells = line
      .replace(/^\||\|\s*$/g, '')
      .split(/(?<!\\)\|/)
      .map((cell) => unescapeCell(cell.trim()));
    if (cells.length !== GATE_COLUMNS.length) {
      rejected.push(`a row has ${cells.length} cells, expected ${GATE_COLUMNS.length}: ${line.slice(0, 60)}`);
      continue;
    }
    const [leg, rowPath, url, commit, marker, fetched, verdict, run] = cells;
    rows.push({ leg, path: rowPath, url, commit, marker, fetched, verdict, run });
  }
  return rows;
}

/**
 * Put a leg's row into a release body: the `## Gate` section is replaced in place (or appended
 * when absent), and an earlier row for the same leg gives way to the new one.
 * @param {string} body the release body as read
 * @param {GateRow} row the new row
 * @returns {string} the new body
 */
export function mergeGateSection(body, row) {
  const { before, section, after } = splitBody(body);
  const kept = parseGateRows(section).filter((earlier) => earlier.leg !== row.leg);
  const rendered = renderGateSection([...kept, row]);
  const head = before.trimEnd();
  const tail = after.trim() === '' ? '' : `\n${after.replace(/^\n+/, '')}`;
  return `${head === '' ? '' : `${head}\n\n`}${rendered.trimEnd()}\n${tail}`;
}

/**
 * Replace the `## Gate` section with exactly these rows.
 * @param {string} body the release body as read
 * @param {GateRow[]} rows the rows
 * @returns {string} the new body
 */
function replaceGateSection(body, rows) {
  const { before, after } = splitBody(body);
  const head = before.trimEnd();
  const tail = after.trim() === '' ? '' : `\n${after.replace(/^\n+/, '')}`;
  return `${head === '' ? '' : `${head}\n\n`}${renderGateSection(rows).trimEnd()}\n${tail}`;
}

/**
 * @param {string[]} args gh arguments
 * @returns {Promise<GhResult>} the result; a non-zero exit is a result, not a throw
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
 * Merge into a rehearsal record file: an absent or empty file is a body with no `## Gate` section,
 * unlike a release body, which must never read back empty. No call to GitHub is made.
 * @param {{ recordFile: string, transform: (body: string) => string }} input
 * @returns {Promise<void>}
 */
async function editFile({ recordFile, transform }) {
  /** @type {string} */
  let body = '';
  try {
    body = await readFile(recordFile, 'utf8');
  } catch (error) {
    if (/** @type {{ code?: string }} */ (error).code !== 'ENOENT') throw error;
  }
  await writeFile(recordFile, transform(body.replace(/\n$/, '')), { mode: 0o600 });
}

/**
 * Read the release body, transform its text, and write it back. A failed read, or an empty body,
 * aborts with no write. With `recordFile` the rehearsal file is edited instead and the release
 * is never read.
 * @param {{ version: string, notesDir: string, gh: (args: string[]) => Promise<GhResult>, recordFile?: string, transform: (body: string) => string }} input
 * @returns {Promise<void>}
 */
async function editBody({ version, notesDir, gh, recordFile, transform }) {
  if (recordFile) return editFile({ recordFile, transform });
  const tag = `v${version}`;
  const read = await gh(['release', 'view', tag, '--json', 'body', '--jq', '.body']);
  if (read.code !== 0) throw new Error(`Could not read release ${tag}; the gate wrote nothing.`);
  if (read.stdout.trim() === '') throw new Error(`Release ${tag} read back an empty body; the gate wrote nothing.`);
  const next = transform(read.stdout.replace(/\n$/, ''));
  await mkdir(notesDir, { recursive: true, mode: 0o700 });
  const file = path.join(notesDir, `release-notes-${tag}.md`);
  await writeFile(file, next, { mode: 0o600 });
  const write = await gh(['release', 'edit', tag, '--notes-file', file]);
  if (write.code !== 0) throw new Error(`gh release edit ${tag} failed (exit ${write.code}).`);
}

/**
 * Record one leg on release `v<version>`.
 * @param {{ version: string, row: GateRow, notesDir: string, gh?: (args: string[]) => Promise<GhResult>, recordFile?: string }} input
 *  `gh` runs the GitHub CLI as the maintainer (tests inject one); `notesDir` holds the notes file;
 *  `recordFile` sends the row to a rehearsal file and never to a release
 * @returns {Promise<void>}
 */
export async function recordLeg({ version, row, notesDir, gh = ghDefault, recordFile }) {
  assertNoToken([row]);
  await editBody({ version, notesDir, gh, recordFile, transform: (body) => mergeGateSection(body, row) });
}

/**
 * Mark legs `pending` under a run id before any of them starts, so an earlier run's `pass` cannot
 * stand for a leg this run has not finished. With `fresh` the whole `## Gate` section is replaced
 * by exactly these rows; without it each row replaces only its own leg's earlier row.
 * @param {{ version: string, legs: string[], run: string, notesDir: string, fresh?: boolean, gh?: (args: string[]) => Promise<GhResult>, recordFile?: string }} input
 * @returns {Promise<void>}
 */
export async function recordPending({ version, legs, run, notesDir, fresh = false, gh = ghDefault, recordFile }) {
  const rows = legs.map((leg) => ({ leg, path: '-', url: '-', commit: '-', marker: '-', fetched: '-', verdict: 'pending', run }));
  await editBody({
    version,
    notesDir,
    gh,
    recordFile,
    transform: (body) => (fresh ? replaceGateSection(body, rows) : rows.reduce((acc, row) => mergeGateSection(acc, row), body)),
  });
}
