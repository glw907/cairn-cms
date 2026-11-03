// The gate's record: a `## Gate` table in the release's body, one row per leg. It reads the body
// first and replaces an earlier `## Gate` section rather than stacking, merging a leg's row over
// an earlier row for the same leg. A failed read, or an empty body, aborts with no write, and a URL
// carrying `token=` is refused, since the release body is public.
import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** The table's columns, in order. */
export const GATE_COLUMNS = ['Leg', 'Path', 'URL', 'Commit', 'Marker', 'Fetched', 'Verdict'];
const HEADING = '## Gate';

/**
 * @typedef {object} GateRow
 * @property {string} leg `A1`, `A2`, `B1`, or `B2`
 * @property {string} path the entry's public path
 * @property {string} url the address the fetch polled
 * @property {string} commit the marker's commit sha, or `-` when the leg has none
 * @property {string} marker the edit's unique marker
 * @property {string} fetched ISO time of the last fetch
 * @property {string} verdict `pass`, or `fail` with the first reason
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
    const cells = [row.leg, row.path, row.url, row.commit, row.marker, row.fetched, row.verdict];
    lines.push(`| ${cells.map(escapeCell).join(' | ')} |`);
  }
  return `${lines.join('\n')}\n`;
}

/**
 * Split a body around its `## Gate` section.
 * @param {string} body the release body
 * @returns {{ before: string, section: string, after: string }} the section is empty when absent
 */
function splitBody(body) {
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
 * @returns {GateRow[]} the parsed rows
 */
function parseRows(section) {
  /** @type {GateRow[]} */
  const rows = [];
  for (const line of section.split('\n')) {
    if (!line.startsWith('|') || /^\|\s*-/.test(line) || line.startsWith(`| ${GATE_COLUMNS[0]} `)) continue;
    const cells = line
      .replace(/^\||\|\s*$/g, '')
      .split(/(?<!\\)\|/)
      .map((cell) => unescapeCell(cell.trim()));
    if (cells.length !== GATE_COLUMNS.length) continue;
    const [leg, rowPath, url, commit, marker, fetched, verdict] = cells;
    rows.push({ leg, path: rowPath, url, commit, marker, fetched, verdict });
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
  const kept = parseRows(section).filter((earlier) => earlier.leg !== row.leg);
  const rendered = renderGateSection([...kept, row]);
  const head = before.trimEnd();
  const tail = after.trim() === '' ? '' : `\n${after.replace(/^\n+/, '')}`;
  return `${head === '' ? '' : `${head}\n\n`}${rendered.trimEnd()}\n${tail}`;
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
 * Record one leg on release `v<version>`.
 * @param {{ version: string, row: GateRow, notesDir: string, gh?: (args: string[]) => Promise<GhResult> }} input
 *  `gh` runs the GitHub CLI as the maintainer (tests inject one); `notesDir` holds the notes file
 * @returns {Promise<void>}
 */
export async function recordLeg({ version, row, notesDir, gh = ghDefault }) {
  assertNoToken([row]);
  const tag = `v${version}`;
  const read = await gh(['release', 'view', tag, '--json', 'body', '--jq', '.body']);
  if (read.code !== 0) throw new Error(`Could not read release ${tag}; the gate wrote nothing.`);
  if (read.stdout.trim() === '') throw new Error(`Release ${tag} read back an empty body; the gate wrote nothing.`);
  const next = mergeGateSection(read.stdout.replace(/\n$/, ''), row);
  await mkdir(notesDir, { recursive: true, mode: 0o700 });
  const file = path.join(notesDir, `release-notes-${tag}.md`);
  await writeFile(file, next, { mode: 0o600 });
  const write = await gh(['release', 'edit', tag, '--notes-file', file]);
  if (write.code !== 0) throw new Error(`gh release edit ${tag} failed (exit ${write.code}).`);
}
