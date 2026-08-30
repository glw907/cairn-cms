// cairn-cms: the engine-rulings shape-format gate. An earlier authoring pass truncated 54 of
// docs/internal/engine-rulings.md's `(shape: ...)` parentheticals to exactly 160 characters
// mid-thought (a fact the repair rounds establish by hand against each item's rank source, never
// something this gate re-derives); the sanctioned fix is not a length check but a format one, since
// truncation is an authoring defect and the ledger's own header now documents the migration: a
// repaired entry loses the `(shape: ...)` parenthetical from its `Reopens on:` line entirely and
// carries the shape as its own `- **Shape:**` line instead.
//
// This gate is a ratchet over that migration. Every entry whose `Reopens on:` line (continuation
// lines included) still carries `(shape:` must be named on the allowlist, one slug per unrepaired
// item; an allowlisted slug that no longer carries the parenthetical is stale and fails too, so the
// list cannot silently outlive the repairs it names. The allowlist shrinking to zero is this
// initiative's progress meter, not a settled bag of exceptions.
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const LEDGER_PATH = 'docs/internal/engine-rulings.md';
const ALLOWLIST_PATH = 'scripts/checks/check-rulings-format-allowlist.json';

const HEADING = /^## ([a-z0-9-]+):/;
const REOPENS_LABEL = /^- \*\*Reopens on:\*\*/;
const LABELED_LINE = /^- \*\*/;

/**
 * @typedef {{ slug: string, reopens: string | null }} LedgerEntry one ruled item: its slug and the
 *   full text of its `Reopens on:` line, continuation lines folded in with a single space each
 *   (null when the entry carries no `Reopens on:` line at all).
 */

/**
 * Parse the ledger into its entries, each carrying the slug from its heading and the full,
 * unwrapped text of its `Reopens on:` label. A continuation line is any line following the label
 * that is not itself a labeled line (`- **...**`) and not the next entry's heading; the ledger
 * wraps a long `Reopens on:` line this way rather than repeating the label.
 * @param {string} text the full ledger text
 * @returns {LedgerEntry[]}
 */
export function parseEntries(text) {
  const lines = text.split('\n');
  /** @type {LedgerEntry[]} */
  const entries = [];
  /** @type {LedgerEntry | null} */
  let current = null;
  for (let i = 0; i < lines.length; i++) {
    const heading = lines[i].match(HEADING);
    if (heading) {
      current = { slug: heading[1], reopens: null };
      entries.push(current);
      continue;
    }
    if (current && REOPENS_LABEL.test(lines[i])) {
      let block = lines[i];
      let j = i + 1;
      while (j < lines.length && !LABELED_LINE.test(lines[j]) && !HEADING.test(lines[j])) {
        if (lines[j].trim() !== '') block += ` ${lines[j].trim()}`;
        j++;
      }
      current.reopens = block;
    }
  }
  return entries;
}

/**
 * Every ledger entry whose `Reopens on:` line still carries the unmigrated `(shape:` parenthetical.
 * @param {LedgerEntry[]} entries
 * @returns {string[]} the slugs, in ledger order
 */
export function slugsWithShapeParenthetical(entries) {
  return entries.filter((e) => e.reopens?.includes('(shape:')).map((e) => e.slug);
}

/**
 * @typedef {{ kind: 'unmigrated', slug: string } | { kind: 'stale-allowlist', slug: string }} FormatProblem
 */

/**
 * Compare the ledger's actual `(shape:` slugs against the allowlist. A slug carrying the
 * parenthetical but missing from the allowlist is unmigrated; an allowlisted slug that no longer
 * carries it is a stale entry the allowlist must drop, so the list stays an accurate map of what
 * remains rather than a bag that only ever grows.
 * @param {LedgerEntry[]} entries
 * @param {string[]} allowlist
 * @returns {FormatProblem[]}
 */
export function findFormatProblems(entries, allowlist) {
  const withParenthetical = new Set(slugsWithShapeParenthetical(entries));
  const allowed = new Set(allowlist);
  /** @type {FormatProblem[]} */
  const problems = [];
  for (const slug of withParenthetical) {
    if (!allowed.has(slug)) problems.push({ kind: 'unmigrated', slug });
  }
  for (const slug of allowed) {
    if (!withParenthetical.has(slug)) problems.push({ kind: 'stale-allowlist', slug });
  }
  return problems;
}

function main() {
  const ledgerText = readFileSync(join(ROOT, LEDGER_PATH), 'utf8');
  const allowlist = JSON.parse(readFileSync(join(ROOT, ALLOWLIST_PATH), 'utf8'));
  const entries = parseEntries(ledgerText);
  const problems = findFormatProblems(entries, allowlist);

  if (problems.length === 0) {
    console.log(`check-rulings-format: OK (${allowlist.length} allowlisted, 0 unmigrated)`);
    return;
  }

  console.error(`check-rulings-format: ${problems.length} problem(s)\n`);
  for (const problem of problems) {
    if (problem.kind === 'unmigrated') {
      console.error(
        `  ${problem.slug}: carries an unmigrated (shape: ...) parenthetical and is not on the allowlist; migrate it to a "- **Shape:**" line or add it to ${ALLOWLIST_PATH}`
      );
    } else {
      console.error(
        `  ${problem.slug}: allowlisted in ${ALLOWLIST_PATH} but no longer carries a (shape: ...) parenthetical; drop the stale entry`
      );
    }
  }
  process.exitCode = 1;
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) main();
