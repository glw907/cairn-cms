// cairn-cms: the code-idiom gate. Records the code-idiom charter's M4 rule (indentation is
// 2-space everywhere) as a running check rather than a one-time sweep; .editorconfig has
// declared `indent_size = 2` since the M4 pass, but nothing enforced it until this gate exists,
// so its claim becomes true only from here on. Three rules, two scopes:
//
//   1. Leading-tab indentation is banned in src/lib and scripts (*.ts, *.svelte, *.mjs).
//   2. `process.exit` is banned in scripts/checks/*.mjs ONLY (never scripts/lab, build, or
//      test): every one of those gates converts a failure into `process.exitCode` plus a
//      `return`/flow guard, so a caller in the same process (a test, a sibling gate importing a
//      helper) never has the process killed out from under it.
//   3. A gate under scripts/checks names itself one way in its own console output. A mismatch
//      (part of the file saying `check:foo`, another part saying `foo`, or `check-foo`) is the
//      exact drift a 2026-09 sweep found in check-chassis-boundary.mjs.
//
// Self-exclusion: this file lives under scripts/checks and is itself in scope for rules 2 and 3,
// so its own `process.exit` pattern is assembled from two literals (PROCESS_EXIT_PATTERN below)
// rather than written as the literal substring, and its own console output uses exactly one
// spelling (`check-idioms`). Every rule also excludes `scripts/checks/fixtures/`, where this
// gate's own tests keep deliberately-violating sample files. Wired as `npm run check:idioms`.
import { readFileSync } from 'node:fs';
import { resolve, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { walk } from '../walk-files.mjs';
import { repoRoot } from '../repo-root.mjs';

const ROOT = repoRoot(import.meta.url);
const FIXTURES_PREFIX = 'scripts/checks/fixtures/';

// Assembled, not written as the literal substring, so this file never itself contains the exact
// text rule 2 bans (see the header note above).
const PROCESS_EXIT_PATTERN = 'process.' + 'exit(';

/**
 * Every 1-based line number in `source` whose first character is a tab.
 * @param {string} source
 * @returns {number[]}
 */
export function findLeadingTabIndentLines(source) {
  /** @type {number[]} */
  const hits = [];
  source.split('\n').forEach((line, i) => {
    if (line.startsWith('\t')) hits.push(i + 1);
  });
  return hits;
}

/**
 * Every 1-based line number in `source` that calls `process.exit`.
 * @param {string} source
 * @returns {number[]}
 */
export function findProcessExitLines(source) {
  /** @type {number[]} */
  const hits = [];
  source.split('\n').forEach((line, i) => {
    if (line.includes(PROCESS_EXIT_PATTERN)) hits.push(i + 1);
  });
  return hits;
}

/**
 * The self-identity spellings a `check-<name>.mjs` gate could plausibly use for itself: the full
 * filename stem, the npm-script form (`check:<name>`), and the bare name with the `check-`
 * prefix dropped. A stem that does not start with `check-` (a shared helper like
 * reference-coverage.mjs) has exactly one plausible spelling, itself.
 * @param {string} stem the `.mjs` filename without its extension
 * @returns {string[]}
 */
export function selfIdentityCandidates(stem) {
  if (!stem.startsWith('check-')) return [stem];
  const bare = stem.slice('check-'.length);
  return [stem, `check:${bare}`, bare];
}

// Extracts a console.log/console.error call's first string or template-literal argument, quote
// characters included, so the caller can strip them and read the static leading text (the part
// before any `${...}` hole, which is always where a self-identity prefix lives in this codebase).
const CONSOLE_STRING_ARG = /console\.(?:log|error)\(\s*(`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g;

// A self-identity prefix: an identifier (letters, digits, hyphens, at most one internal colon for
// the `check:name` form) at the very start of a console message, followed by `: `.
const SELF_IDENTITY_LEADER = /^([a-zA-Z][\w-]*(?::[\w-]+)?):\s/;

/**
 * Every distinct self-identity spelling `source`'s console.log/console.error calls actually use,
 * restricted to the plausible candidates for `stem` (an unrelated leading word, like "OK" or
 * "Contrast check", is not a self-identity claim and is ignored). More than one distinct spelling
 * is the drift rule 3 bans.
 * @param {string} stem
 * @param {string} source
 * @returns {string[]}
 */
export function selfIdentityVariantsUsed(stem, source) {
  const candidates = new Set(selfIdentityCandidates(stem));
  const found = new Set();
  for (const m of source.matchAll(CONSOLE_STRING_ARG)) {
    const inner = m[1].slice(1, -1);
    const leader = SELF_IDENTITY_LEADER.exec(inner);
    if (leader && candidates.has(leader[1])) found.add(leader[1]);
  }
  return [...found];
}

/**
 * @typedef {{ tabs: string[], exit: string[], identity: string[] }} IdiomViolations
 */

/**
 * Scan the real tree for all three rules. Exported so the unit test can assert the gate is born
 * green without shelling out.
 * @returns {IdiomViolations}
 */
export function scanIdioms() {
  /** @type {IdiomViolations} */
  const violations = { tabs: [], exit: [], identity: [] };

  const tabScopeFiles = [
    ...walk(resolve(ROOT, 'src/lib'), (n) => /\.(ts|svelte)$/.test(n)),
    ...walk(resolve(ROOT, 'scripts'), (n) => /\.(ts|svelte|mjs)$/.test(n)),
  ];
  for (const file of tabScopeFiles) {
    const rel = relative(ROOT, file).split('\\').join('/');
    if (rel.startsWith(FIXTURES_PREFIX)) continue;
    const source = readFileSync(file, 'utf8');
    for (const line of findLeadingTabIndentLines(source)) violations.tabs.push(`${rel}:${line}`);
  }

  const checksFiles = walk(resolve(ROOT, 'scripts/checks'), (n) => n.endsWith('.mjs'));
  for (const file of checksFiles) {
    const rel = relative(ROOT, file).split('\\').join('/');
    if (rel.startsWith(FIXTURES_PREFIX)) continue;
    const source = readFileSync(file, 'utf8');
    for (const line of findProcessExitLines(source)) violations.exit.push(`${rel}:${line}`);
    const variants = selfIdentityVariantsUsed(basename(file, '.mjs'), source);
    if (variants.length > 1) violations.identity.push(`${rel}: mixes ${variants.join(', ')}`);
  }

  return violations;
}

/**
 * Render every violation as one gate report.
 * @param {IdiomViolations} violations
 * @returns {string}
 */
export function formatViolations(violations) {
  const lines = [];
  if (violations.tabs.length) {
    lines.push(`check-idioms: ${violations.tabs.length} leading-tab indentation hit(s) (repo convention is 2-space):`);
    for (const hit of violations.tabs) lines.push(`  ${hit}`);
  }
  if (violations.exit.length) {
    lines.push(`check-idioms: ${violations.exit.length} direct process.exit call(s) in scripts/checks (use process.exitCode plus a flow guard):`);
    for (const hit of violations.exit) lines.push(`  ${hit}`);
  }
  if (violations.identity.length) {
    lines.push(`check-idioms: ${violations.identity.length} self-identity spelling mismatch(es):`);
    for (const hit of violations.identity) lines.push(`  ${hit}`);
  }
  return lines.join('\n');
}

function main() {
  const violations = scanIdioms();
  const total = violations.tabs.length + violations.exit.length + violations.identity.length;
  if (total === 0) {
    console.log('check-idioms: OK (2-space indentation, no direct process.exit calls in scripts/checks, one self-identity spelling per gate)');
    return;
  }
  console.error(formatViolations(violations));
  process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
