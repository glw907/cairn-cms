// cairn-cms: the `Consumers must:` line gate. A changelog section is read for its upgrade action by
// one rule: a line matching LINE whose body is not `nothing.`. That rule is only sound when the line
// has one shape, so this gate holds every line under `## Unreleased` to the grammar and compares the
// legacy off-grammar lines against a baseline snapshot. A new off-grammar line fails, and a baseline
// entry no longer present fails as stale, so the snapshot only shrinks. The comparison is a multiset
// because the same text can be legacy twice and still be new a third time.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, runCheck } from './shared.mjs';

const CHANGELOG_PATH = 'CHANGELOG.md';
const BASELINE_PATH = 'scripts/checks/consumers-must-baseline.json';

/**
 * The shared line shape: bare lead at column 0 or two spaces, then a non-blank body. The body's
 * first class spells RE2's `\S` (`[^\t\n\f\r ]`), which JS's `\S` is not (it also excludes a
 * no-break space), and the `s` flag lets `.` take U+2028 as Go's does. Apply it to a line with its
 * trailing `\r` already removed.
 */
export const LINE = /^(?:  )?Consumers must: ([^\t\n\f\r ].*)$/s;
const CODE_SPAN = /`[^`]*`/g;

const isBlank = (/** @type {string | undefined} */ s) => s === undefined || s.trim() === '';

/**
 * Whether a section's text asks the consumer to act: any line matching the grammar's shape whose
 * body is other than `nothing.`.
 * @param {string} text one changelog section's text
 * @returns {boolean}
 */
export function isActionable(text) {
  for (const raw of text.split('\n')) {
    const m = raw.replace(/\r$/, '').match(LINE);
    if (m && m[1] !== 'nothing.') return true;
  }
  return false;
}

/**
 * Slice the `## Unreleased` window out of a CHANGELOG, from its heading to the next `## ` heading
 * (of any kind) or the end of the text. Returns null when there is no `## Unreleased` heading, the
 * ordinary case once a window has been cut and renamed to a version.
 * @param {string} changelogText the full CHANGELOG.md text
 * @returns {string | null}
 */
export function unreleasedWindow(changelogText) {
  const heading = changelogText.match(/^## Unreleased\b.*$/m);
  if (!heading) return null;
  const afterHeading = (heading.index ?? 0) + heading[0].length;
  const nextHeading = changelogText.slice(afterHeading).match(/^## .+$/m);
  const end = nextHeading ? afterHeading + (nextHeading.index ?? 0) : changelogText.length;
  return changelogText.slice(afterHeading, end);
}

/**
 * @typedef {{ line: number, text: string, reason: string }} OffGrammar
 *   a 1-based line within the section text, the line itself, and the rule it breaks.
 */

/**
 * Every line in a section that mentions `consumers must:` and is not on grammar. A mention inside a
 * code span is prose and is skipped.
 * @param {string} text one changelog section's text
 * @returns {OffGrammar[]}
 */
export function findOffGrammarLines(text) {
  const lines = text.split('\n');
  /** @type {OffGrammar[]} */
  const out = [];
  lines.forEach((raw, i) => {
    const line = raw.replace(/\r$/, '');
    if (!/consumers must:/i.test(line.replace(CODE_SPAN, ''))) return;
    const add = (/** @type {string} */ reason) => out.push({ line: i + 1, text: line, reason });
    const m = line.match(LINE);
    if (!m) return add('the lead is not a bare `Consumers must:` at column 0 or two spaces');
    if (!isBlank(lines[i - 1]) || !isBlank(lines[i + 1])) {
      return add('the line is not a paragraph of its own (blank line before and after)');
    }
    const body = m[1];
    if (body === 'nothing.') return;
    if (/^nothing\b/i.test(body)) return add('a body opening with "nothing" must be exactly "nothing."');
    if (!body.endsWith('.')) return add('the body must end in a period');
  });
  return out;
}

/**
 * Compare off-grammar lines against the baseline as multisets of line text.
 * @param {OffGrammar[]} lines the off-grammar lines found now
 * @param {string[]} baseline the legacy line texts
 * @returns {{ added: OffGrammar[], stale: string[] }} lines beyond the baseline, and baseline entries no longer present
 */
export function compareBaseline(lines, baseline) {
  /** @type {Map<string, number>} */
  const remaining = new Map();
  for (const b of baseline) remaining.set(b, (remaining.get(b) ?? 0) + 1);
  /** @type {OffGrammar[]} */
  const added = [];
  for (const l of lines) {
    const n = remaining.get(l.text) ?? 0;
    if (n > 0) remaining.set(l.text, n - 1);
    else added.push(l);
  }
  /** @type {string[]} */
  const stale = [];
  for (const [text, n] of remaining) for (let k = 0; k < n; k++) stale.push(text);
  return { added, stale };
}

function readBaseline() {
  try {
    const data = JSON.parse(readFileSync(join(ROOT, BASELINE_PATH), 'utf8'));
    if (!Array.isArray(data) || data.some((x) => typeof x !== 'string')) throw new Error('not an array of strings');
    return /** @type {string[]} */ (data);
  } catch (e) {
    throw new Error(`check-consumers-must: cannot read ${BASELINE_PATH}: ${e instanceof Error ? e.message : e}`);
  }
}

function main() {
  const changelog = readFileSync(join(ROOT, CHANGELOG_PATH), 'utf8');
  const windowText = unreleasedWindow(changelog) ?? '';
  const headingLine = changelog.split('\n').findIndex((l) => /^## Unreleased\b/.test(l)) + 1;
  const found = findOffGrammarLines(windowText);
  const baseline = readBaseline();
  const { added, stale } = compareBaseline(found, baseline);

  if (process.argv.includes('--update')) {
    const next = found.map((l) => l.text).sort();
    writeFileSync(join(ROOT, BASELINE_PATH), JSON.stringify(next, null, 2) + '\n');
    for (const l of added) console.log(`  + ${l.text}`);
    for (const s of stale) console.log(`  - ${s}`);
    console.log(`check-consumers-must: baseline rewritten (${next.length} entries, ${added.length} added, ${stale.length} removed)`);
    return [];
  }

  if (added.length === 0 && stale.length === 0) {
    console.log(`check-consumers-must: ${found.length} legacy off-grammar lines, no new ones`);
    return [];
  }
  return [
    `check-consumers-must: ${added.length} new off-grammar line(s), ${stale.length} stale baseline entr${stale.length === 1 ? 'y' : 'ies'}\n`,
    ...added.map((l) => `  ${CHANGELOG_PATH}:${headingLine + l.line - 1}: ${l.reason}\n    ${l.text}`),
    ...stale.map((s) => `  ${BASELINE_PATH}: stale entry (no longer in Unreleased)\n    ${s}`),
    '\nPut the line on grammar; `--update` is for a legacy line changed or removed.',
  ];
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) runCheck('check-consumers-must', main);
