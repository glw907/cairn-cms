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
const SHAPE_LABEL = /^- \*\*Shape:\*\*/;
const SHAPE_NEEDS_REDERIVATION = 'shape-needs-rederivation';

// The exit ratchet. Today's checks only assert that a slug leaving the allowlist no longer carries
// the raw `(shape:` parenthetical; that passes just as well when the shape text is deleted outright
// as when it is properly migrated to a `- **Shape:**` line. This is the fixed population the ratchet
// closes over: the 54 slugs whose `(shape: ...)` parenthetical the earlier authoring pass truncated
// to exactly 160 characters, established once by hand against each item's rank source and never
// re-derived from the ledger's current text. It never grows; a slug leaves it only by staying
// allowlisted or by carrying a real `- **Shape:**` line (or the explicit `shape-needs-rederivation`
// marker for a slug whose shape is not yet known).
export const ORIGINAL_TRUNCATED_SLUGS = [
  // The 40 foundations A left allowlisted (scripts/checks/check-rulings-format-allowlist.json).
  'audit-adapter-authbranding',
  'audit-adapter-publishactionsconfig',
  'audit-auth-devdelivery',
  'audit-auth-insertownerifempty',
  'audit-auth-authchannelevent',
  'audit-auth-authchannel',
  'audit-auth-channel-schema-sql',
  'audit-auth-authchannelconfig',
  'audit-auth-createauthchannel',
  'audit-cloudflare-checkratelimitkeys',
  'audit-cloudflare-checkratelimit',
  'audit-media-normalizeassets',
  'audit-delivery-feedview',
  'audit-delivery-unlistedroutes',
  'audit-render-strattr',
  'audit-log-auth-session-destroyed',
  'audit-log-dictionary-added',
  'audit-log-tidy-succeeded',
  'audit-log-commit-succeeded',
  'audit-log-taxonomy-unmarked-field',
  'audit-log-content-field-behavior-failed',
  'audit-log-include-missing',
  'audit-log-media-resolver-absent',
  'audit-log-preview-cleanup-failed',
  'audit-log-commit-failed',
  'audit-cli-check-dogfood-tripwire-proposed-into-cairn-audit-coherence-c',
  'audit-cli-unlistedroutes-proposed-as-a-cairn-audit-rendered-rule',
  'audit-cli-skill-admin-screens-check-and-cairn-doctor-fix',
  'audit-cli-edge-https-forced-and-edge-hsts',
  'audit-cli-chip-ground-collision-rendered-rule',
  'audit-cli-form-font-parity-rendered-rule',
  'audit-cli-admin-mount-shape-check',
  'audit-cli-config-tidy-key-check-and-its-active-anthropic-probe',
  'audit-cli-no-help-on-any-of-the-five-commands',
  'audit-cli-config-csrf-disable-check',
  'audit-cli-cairn-audit-config-json-contract-scope-cssfiles-palettefiles',
  'audit-cli-config-site-config-check',
  'audit-cli-create-cairn-site-cost-narrative-chapter-1-consent-email-adm',
  'audit-cli-config-dependency-floors-check',
  'audit-cli-cairn-manifest-command-vite-config-discovery-exit-behavior',
  // The 14 foundations A repaired (632cca35): the 10 audit-sveltekit-* and 4 audit-admin-* entries
  // feeding the next two remediation slices.
  'audit-sveltekit-contentformfailure',
  'audit-sveltekit-revertfailure',
  'audit-sveltekit-tidyclient',
  'audit-sveltekit-uploadresult',
  'audit-sveltekit-contentroutes',
  'audit-sveltekit-resolvenavlayoutoptions',
  'audit-sveltekit-resolvenavlayout',
  'audit-sveltekit-validatenavlayout',
  'audit-sveltekit-mintpreviewtoken',
  'audit-sveltekit-adminactionoptions',
  'audit-admin-officelist',
  'audit-admin-formattimestamp',
  'audit-admin-statuschip',
  'audit-admin-markdowneditor',
];

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

/**
 * Every slug whose ledger entry carries a `- **Shape:**` line, or the explicit
 * `shape-needs-rederivation` marker, anywhere in its body.
 * @param {string} text the full ledger text
 * @returns {Set<string>}
 */
export function slugsWithShapeLine(text) {
  const lines = text.split('\n');
  /** @type {Set<string>} */
  const result = new Set();
  let currentSlug = /** @type {string | null} */ (null);
  for (const line of lines) {
    const heading = line.match(HEADING);
    if (heading) {
      currentSlug = heading[1];
      continue;
    }
    if (currentSlug && (SHAPE_LABEL.test(line) || line.includes(SHAPE_NEEDS_REDERIVATION))) {
      result.add(currentSlug);
    }
  }
  return result;
}

/**
 * @typedef {{ kind: 'missing-shape', slug: string }} ExitRatchetProblem
 */

/**
 * The exit ratchet: a slug from the fixed {@link ORIGINAL_TRUNCATED_SLUGS} population that has left
 * the allowlist must carry a real `- **Shape:**` line (or the `shape-needs-rederivation` marker), not
 * merely lack the raw `(shape:` parenthetical `findFormatProblems` checks. Without this, deleting the
 * shape text outright, rather than migrating it, also passes that check.
 * @param {string} ledgerText the full ledger text
 * @param {string[]} allowlist
 * @returns {ExitRatchetProblem[]}
 */
export function findExitRatchetProblems(ledgerText, allowlist) {
  const allowed = new Set(allowlist);
  const withShape = slugsWithShapeLine(ledgerText);
  /** @type {ExitRatchetProblem[]} */
  const problems = [];
  for (const slug of ORIGINAL_TRUNCATED_SLUGS) {
    if (allowed.has(slug)) continue;
    if (!withShape.has(slug)) problems.push({ kind: 'missing-shape', slug });
  }
  return problems;
}

function main() {
  const ledgerText = readFileSync(join(ROOT, LEDGER_PATH), 'utf8');
  const allowlist = JSON.parse(readFileSync(join(ROOT, ALLOWLIST_PATH), 'utf8'));
  const entries = parseEntries(ledgerText);
  const problems = findFormatProblems(entries, allowlist);
  const ratchetProblems = findExitRatchetProblems(ledgerText, allowlist);

  if (problems.length === 0 && ratchetProblems.length === 0) {
    console.log(`check-rulings-format: OK (${allowlist.length} allowlisted, 0 unmigrated)`);
    return;
  }

  const total = problems.length + ratchetProblems.length;
  console.error(`check-rulings-format: ${total} problem(s)\n`);
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
  for (const problem of ratchetProblems) {
    console.error(
      `  ${problem.slug}: left the allowlist without a "- **Shape:**" line or a "${SHAPE_NEEDS_REDERIVATION}" marker; a slug cannot exit the ratchet by deleting its shape`
    );
  }
  process.exitCode = 1;
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) main();
