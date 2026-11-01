// cairn-cms: the engine-rulings format gate. `docs/internal/engine-rulings.md` is read through
// `grep '^## '`, so every entry heading must carry its slug, its item, and its verdict word, and every
// entry must name the evidence that would reopen it. A ruling with no reopen condition is a decision
// nobody can revisit, and the ledger keeps only rulings a session might need to revisit.
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const LEDGER_PATH = 'docs/internal/engine-rulings.md';

const ENTRY_HEADING = /^## /;
const HEADING = /^## ([a-z0-9-]+): .+? {2}\((accept|decline|defer|keep|reshape|retire)[,)]/;
const REOPENS_LABEL = /^- \*\*Reopens on:\*\*\s*\S/;

/**
 * @typedef {{ slug: string | null, heading: string, line: number, hasReopens: boolean }} LedgerEntry
 *   one ruled item: the slug from its heading (null when the heading is malformed), the heading
 *   text, its 1-based line, and whether it carries a non-empty `Reopens on:` line.
 */

/**
 * Parse the ledger into its entries. The first `## ` heading inside a fenced code block (the
 * format example in the header) is skipped.
 * @param {string} text the full ledger text
 * @returns {LedgerEntry[]}
 */
export function parseEntries(text) {
  const lines = text.split('\n');
  /** @type {LedgerEntry[]} */
  const entries = [];
  let fenced = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('```')) fenced = !fenced;
    if (fenced) continue;
    if (ENTRY_HEADING.test(lines[i])) {
      const match = lines[i].match(HEADING);
      entries.push({ slug: match ? match[1] : null, heading: lines[i], line: i + 1, hasReopens: false });
    } else if (entries.length > 0 && REOPENS_LABEL.test(lines[i])) {
      entries[entries.length - 1].hasReopens = true;
    }
  }
  return entries;
}

/**
 * @typedef {{ kind: 'malformed-heading' | 'duplicate-slug' | 'missing-reopens', line: number, text: string }} FormatProblem
 */

/**
 * Every format defect in the ledger.
 * @param {LedgerEntry[]} entries
 * @returns {FormatProblem[]}
 */
export function findFormatProblems(entries) {
  /** @type {FormatProblem[]} */
  const problems = [];
  const seen = new Set();
  for (const e of entries) {
    if (e.slug === null) {
      problems.push({ kind: 'malformed-heading', line: e.line, text: e.heading });
      continue;
    }
    if (seen.has(e.slug)) problems.push({ kind: 'duplicate-slug', line: e.line, text: e.slug });
    seen.add(e.slug);
    if (!e.hasReopens) problems.push({ kind: 'missing-reopens', line: e.line, text: e.slug });
  }
  return problems;
}

const MESSAGES = {
  'malformed-heading': 'heading is not "## <slug>: <item>  (<verdict>, <date>, <source>)"',
  'duplicate-slug': 'slug appears twice',
  'missing-reopens': 'has no "- **Reopens on:**" line',
};

function main() {
  const entries = parseEntries(readFileSync(join(ROOT, LEDGER_PATH), 'utf8'));
  const problems = findFormatProblems(entries);
  if (problems.length === 0) {
    console.log(`check-rulings-format: OK (${entries.length} entries)`);
    return;
  }
  console.error(`check-rulings-format: ${problems.length} problem(s)\n`);
  for (const p of problems) console.error(`  ${LEDGER_PATH}:${p.line}: ${p.text}: ${MESSAGES[p.kind]}`);
  process.exitCode = 1;
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) main();
