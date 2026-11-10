// The gate's record: a `## Gate` table in the release's body, one row per leg (`naive`, `scripted`,
// `owner`), each row naming the cairn-cms commit the leg ran against and the engine and tool versions
// it installed. It reads the body first and replaces an earlier `## Gate` section rather than
// stacking, merging a leg's row over an earlier row for the same leg. A failed read, or an empty
// body, aborts with no write, and a URL carrying `token=` is refused, since the release body is
// public. `carry` moves the `naive` and `owner` rows to a later commit when nothing a naive run reads
// changed in between. verdict.mjs runs from a sparse checkout, so this file imports only Node
// built-ins.
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** The legs, in the order the table lists them. */
export const LEGS = ['naive', 'scripted', 'owner'];
/** The table's columns, in order. */
export const GATE_COLUMNS = ['Leg', 'Commit', 'Engine', 'Tool', 'Verdict', 'Run'];
const HEADING = '## Gate';
/** The repository the compare reads and the release belongs to. */
export const REPO = 'glw907/cairn-cms';

/**
 * The paths a naive run or Geoff's install reads or runs, so a change under one of them makes an
 * earlier `naive` or `owner` pass stale. `**` ends a directory prefix, and `*` stays inside one
 * path segment.
 */
export const RERUN_PATHS = [
  'tool/internal/setup/**',
  'tool/internal/providers/**',
  'tool/internal/secrets/**',
  'tool/internal/ui/newview/**',
  'tool/cmd/cairn/new*.go',
  'tool/cmd/cairn/help_agents.go',
  'packages/create-cairn-site/**',
  'templates/**',
  'scripts/build/setup-overlay/**',
  'plugins/cairn/**',
  'README.md',
  'docs/admin/**',
];

/** A compare listing this many files or more may be truncated, so it is never trusted. */
export const COMPARE_FILE_LIMIT = 300;

/**
 * @typedef {object} GateRow
 * @property {string} leg `naive`, `scripted`, or `owner`
 * @property {string} commit the cairn-cms commit the leg ran against
 * @property {string} engine the engine version the leg installed
 * @property {string} tool the tool version the leg installed, since a tool-only round publishes no engine version
 * @property {string} verdict `pass`, `fail: <every reason>`, or `pending`
 * @property {string} run the run id, which ties the row to one run
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
  const order = (/** @type {string} */ leg) => (LEGS.includes(leg) ? LEGS.indexOf(leg) : LEGS.length);
  const sorted = [...rows].sort((a, b) => order(a.leg) - order(b.leg) || a.leg.localeCompare(b.leg));
  const lines = [HEADING, '', `| ${GATE_COLUMNS.join(' | ')} |`, `| ${GATE_COLUMNS.map(() => '---').join(' | ')} |`];
  for (const row of sorted) {
    const cells = [row.leg, row.commit, row.engine, row.tool, row.verdict, row.run];
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
    const [leg, commit, engine, tool, verdict, run] = cells;
    rows.push({ leg, commit, engine, tool, verdict, run });
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
export async function ghDefault(args) {
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
  const rows = legs.map((leg) => ({ leg, commit: '-', engine: '-', tool: '-', verdict: 'pending', run }));
  await editBody({
    version,
    notesDir,
    gh,
    recordFile,
    transform: (body) => (fresh ? replaceGateSection(body, rows) : rows.reduce((acc, row) => mergeGateSection(acc, row), body)),
  });
}

/**
 * Whether two commit ids name one commit, abbreviated or whole.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function sameCommit(a, b) {
  const x = a.trim().toLowerCase();
  const y = b.trim().toLowerCase();
  return x.length >= 7 && y.length >= 7 && (x.startsWith(y) || y.startsWith(x));
}

/**
 * @param {string} glob
 * @returns {RegExp}
 */
function globToRegExp(glob) {
  const source = glob
    .split('**')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*'))
    .join('.*');
  return new RegExp(`^${source}$`);
}
const RERUN_PATTERNS = RERUN_PATHS.map(globToRegExp);

/**
 * The files a change touched under a rerun path.
 * @param {string[]} files the changed files, repository-relative
 * @returns {string[]} those under a rerun path
 */
export function rerunPathsTouched(files) {
  return files.filter((file) => RERUN_PATTERNS.some((pattern) => pattern.test(file)));
}

/**
 * The files changed between two commits, read through the compare API with the caller's `gh`.
 * @param {(args: string[]) => Promise<GhResult>} gh
 * @param {string} from the earlier commit
 * @param {string} to the later commit
 * @returns {Promise<{ ok: true, files: string[] } | { ok: false, reason: string }>} fails closed: an
 *  unreadable compare, a base that is not an ancestor, and a listing of 300 files or more are all failures
 */
export async function changedFiles(gh, from, to) {
  if (sameCommit(from, to)) return { ok: true, files: [] };
  const read = await gh(['api', `repos/${REPO}/compare/${from}...${to}`, '--jq', '{status: .status, files: [.files[] | (.filename, .previous_filename // empty)]}']);
  if (read.code !== 0) return { ok: false, reason: `could not read the compare ${from}...${to} (gh exit ${read.code})` };
  /** @type {{ status?: string, files?: string[] }} */
  let parsed;
  try {
    parsed = JSON.parse(read.stdout);
  } catch {
    return { ok: false, reason: `the compare ${from}...${to} did not read back as JSON` };
  }
  if (!Array.isArray(parsed.files)) return { ok: false, reason: `the compare ${from}...${to} listed no files array` };
  if (parsed.status !== 'ahead' && parsed.status !== 'identical') return { ok: false, reason: `${to} is ${parsed.status ?? 'unrelated'} to ${from}, not ahead of it` };
  if (parsed.files.length >= COMPARE_FILE_LIMIT) return { ok: false, reason: `the compare ${from}...${to} lists ${parsed.files.length} files, which may be truncated` };
  return { ok: true, files: parsed.files };
}

/**
 * Move the `naive` and `owner` pass rows that ran at one commit to a later one.
 * @param {string} body the release body
 * @param {string} from the commit the rows ran against
 * @param {string} to the commit they carry to
 * @returns {{ body: string, carried: string[] }} the new body and the legs moved
 */
export function carryRows(body, from, to) {
  const { section } = splitBody(body);
  /** @type {string[]} */
  const carried = [];
  let next = body;
  for (const row of parseGateRows(section)) {
    if ((row.leg === 'naive' || row.leg === 'owner') && row.verdict === 'pass' && sameCommit(row.commit, from)) {
      next = mergeGateSection(next, { ...row, commit: to });
      carried.push(row.leg);
    }
  }
  return { body: next, carried };
}

/**
 * Copy the `naive` and `owner` rows forward from one commit to another, only when the diff touches
 * no rerun path. Nothing is written otherwise.
 * @param {{ version: string, from: string, to: string, notesDir: string, gh?: (args: string[]) => Promise<GhResult>, recordFile?: string }} input
 * @returns {Promise<string[]>} the legs carried
 * @throws when the diff cannot be read or touches a rerun path, or no row sits at `from`
 */
export async function carry({ version, from, to, notesDir, gh = ghDefault, recordFile }) {
  const diff = await changedFiles(gh, from, to);
  if (!diff.ok) throw new Error(`carry refused: ${diff.reason}.`);
  const touched = rerunPathsTouched(diff.files);
  if (touched.length > 0) throw new Error(`carry refused: ${touched.slice(0, 5).join(', ')} changed under a rerun path between ${from} and ${to}.`);
  /** @type {string[]} */
  let carried = [];
  await editBody({
    version,
    notesDir,
    gh,
    recordFile,
    transform: (body) => {
      const result = carryRows(body, from, to);
      carried = result.carried;
      if (carried.length === 0) throw new Error(`carry refused: no naive or owner pass row sits at ${from}.`);
      return result.body;
    },
  });
  return carried;
}

/**
 * @param {string[]} argv the arguments after the script name
 * @returns {Promise<number>} the exit code
 */
export async function main(argv) {
  const flag = (/** @type {string} */ name) => {
    const at = argv.indexOf(name);
    return at === -1 ? undefined : argv[at + 1];
  };
  const version = flag('--version');
  const base = flag('--from');
  const head = flag('--to');
  if (argv[0] !== 'carry' || !version || !base || !head) {
    console.error('Usage: node scripts/gate/record.mjs carry --version <version> --from <commit> --to <commit> [--file <path>]');
    return 2;
  }
  try {
    const notesDir = path.join(homedir(), '.local', 'state', 'cairn-gate', 'notes');
    const carried = await carry({ version, from: base, to: head, notesDir, recordFile: flag('--file') });
    console.log(`Carried ${carried.join(' and ')} from ${base} to ${head}.`);
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = await main(process.argv.slice(2));
