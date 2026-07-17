// cairn-cms: the invisible-craft gate. Banks three mechanical rules from the 2026-07-15 admin
// polish rubric (docs/internal/2026-07-15-admin-resolved-polish-brief.md) as standing floors over
// src/lib/components: (1) TRANSITION-DURATION BAND, every transition/animation duration (a Tailwind
// `duration-<n>`/`duration-[<n>ms]` utility, or a literal `<n>ms` inside a `transition`/`animation`
// CSS declaration, including the EditorView.theme object syntax the CodeMirror modules use) sits in
// [150, 250]ms unless allowlisted; (2) SPACING-BRACKET ALLOWLIST, an arbitrary-value Tailwind spacing
// bracket in component markup (padding, margin, gap, or inset utilities) is allowlisted by exact
// file+token, everything else free-floating off the 4/8px scale is a finding; (3) NO ACHROMATIC
// COLORS, no pure-achromatic `oklch(n% 0 0)`, no `#000`/`#fff` hex, no bare `black`/`white` keyword in
// a style value (`transparent` and `currentColor` are fine). Each rule's exceptions live by exact
// file+token+reason in scripts/invisible-craft-budget.json beside this file, the same allowlist idiom
// check-custom-surface.mjs uses for its own budget. Wired as `npm run check:invisible-craft`.
import { readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { walk } from './walk-files.mjs';
import { repoRoot } from './repo-root.mjs';

const ROOT = repoRoot(import.meta.url);
const COMPONENTS_DIR = 'src/lib/components';
const DURATION_MIN = 150;
const DURATION_MAX = 250;

/**
 * The source with every comment blanked to whitespace: HTML `<!-- -->`, block `/* *\/`, and line
 * `//` (a `scheme://` URL is left alone, so a doc comment mentioning a link is not mis-stripped).
 * Blanking (not deleting) keeps every line and column number accurate for the reported hits.
 * @param {string} source
 * @returns {string}
 */
export function stripComments(source) {
  let out = source.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));
  out = out.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  out = out.replace(/(?<!:)\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, ' '));
  return out;
}

/**
 * The 1-based line number of a character offset in a source string.
 * @param {string} source
 * @param {number} index
 * @returns {number}
 */
function lineOf(source, index) {
  return source.slice(0, index).split('\n').length;
}

const DURATION_BRACKET = /duration-\[(\d+(?:\.\d+)?)ms\]/g;
const DURATION_NUMERIC = /duration-(\d+)\b(?!\.)/g;
// A plain CSS declaration on one line, ending in `;` (the `.css` file and `<style>` block form).
const DURATION_DECL_UNQUOTED = /\b(?:transition|animation)(?:-duration)?\s*:\s*([^;{}\n]*);/g;
// The CodeMirror `EditorView.theme` object form: a quoted string value (the `.ts`/`.svelte` form).
const DURATION_DECL_QUOTED = /\b(?:transition|animation)(?:-duration)?\s*:\s*(['"])((?:(?!\1)[^\n])*)\1/g;
const MS_TOKEN = /(\d+(?:\.\d+)?)ms/g;

/**
 * Every transition/animation duration in a (comment-stripped) source, in or out of the
 * [150, 250]ms band. Each hit carries a `token`, the exact allowlist key: the matched Tailwind
 * utility text for a `duration-*` class, or the trimmed declaration text for a literal `<n>ms`.
 * @param {string} source
 * @returns {{ line: number, ms: number, token: string }[]}
 */
export function durationHits(source) {
  /** @type {{ line: number, ms: number, token: string }[]} */
  const hits = [];
  for (const m of source.matchAll(DURATION_BRACKET)) {
    hits.push({ line: lineOf(source, m.index), ms: Number(m[1]), token: m[0] });
  }
  for (const m of source.matchAll(DURATION_NUMERIC)) {
    hits.push({ line: lineOf(source, m.index), ms: Number(m[1]), token: m[0] });
  }
  for (const m of source.matchAll(DURATION_DECL_UNQUOTED)) {
    const token = m[0].trim();
    const line = lineOf(source, m.index);
    for (const msm of m[1].matchAll(MS_TOKEN)) hits.push({ line, ms: Number(msm[1]), token });
  }
  for (const m of source.matchAll(DURATION_DECL_QUOTED)) {
    const token = m[0].trim();
    const line = lineOf(source, m.index);
    for (const msm of m[2].matchAll(MS_TOKEN)) hits.push({ line, ms: Number(msm[1]), token });
  }
  return hits;
}

// Padding, margin, gap, and inset-family utilities. Deliberately excludes `duration-`, `max-w-`,
// `min-w-`, `text-`, and color brackets: this rule is spacing only.
const SPACING_BRACKET =
  /\b(?:gap-x|gap-y|gap|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|top|bottom|left|right|inset)-\[[^\]]*\]/g;

/**
 * Every arbitrary-value spacing bracket in a (comment-stripped) `.svelte` markup source. A
 * comment naming a retired or example bracket (documenting why it was removed, say) must never
 * itself count as a hit, the same posture durationHits and achromaticColorHits already take.
 * @param {string} source
 * @returns {{ line: number, token: string }[]}
 */
export function spacingBracketHits(source) {
  return [...source.matchAll(SPACING_BRACKET)].map((m) => ({ line: lineOf(source, m.index), token: m[0] }));
}

const OKLCH_ACHROMATIC = /oklch\(\s*[\d.]+%[\s,]+0[\s,]+0(?=[\s,)/])/g;
const HEX_ACHROMATIC = /#(?:000000|000|ffffff|fff)\b/gi;
// `white-space` is a CSS property name, not a color value; excluded by the negative lookahead.
const ACHROMATIC_KEYWORD = /\b(?:black|white)\b(?!-space)/g;

/**
 * Every achromatic color value in a (comment-stripped) source: a pure-achromatic `oklch(n% 0 0)`,
 * a `#000`/`#fff` hex, or a bare `black`/`white` keyword.
 * @param {string} source
 * @returns {{ line: number, token: string }[]}
 */
export function achromaticColorHits(source) {
  /** @type {{ line: number, token: string }[]} */
  const hits = [];
  for (const m of source.matchAll(OKLCH_ACHROMATIC)) hits.push({ line: lineOf(source, m.index), token: m[0] });
  for (const m of source.matchAll(HEX_ACHROMATIC)) hits.push({ line: lineOf(source, m.index), token: m[0] });
  for (const m of source.matchAll(ACHROMATIC_KEYWORD)) hits.push({ line: lineOf(source, m.index), token: m[0] });
  return hits;
}

/**
 * Every `src/lib/components` file matching the given extensions, as `{ path, source }` pairs
 * (`path` relative to the repo root, forward-slashed).
 * @param {(name: string) => boolean} keep
 * @returns {{ path: string, source: string }[]}
 */
function componentFiles(keep) {
  return walk(resolve(ROOT, COMPONENTS_DIR), keep).map((file) => ({
    path: relative(ROOT, file).split('\\').join('/'),
    source: readFileSync(file, 'utf8'),
  }));
}

/**
 * Whether an allowlist covers a hit, by exact file+token.
 * @param {{ file: string, token: string }[]} allowlist
 * @param {string} file
 * @param {string} token
 * @returns {boolean}
 */
function isAllowed(allowlist, file, token) {
  return allowlist.some((entry) => entry.file === file && entry.token === token);
}

/**
 * Run all three rules against the current tree.
 * @param {{ durations: {file: string, token: string, reason: string}[], spacingBrackets: {file: string, token: string, reason: string}[], achromaticColors: {file: string, token: string, reason: string}[] }} budget
 * @returns {{ pass: boolean, summary: string[], failures: string[] }}
 */
export function evaluate(budget) {
  const summary = [];
  const failures = [];

  let durationChecked = 0;
  for (const { path, source } of componentFiles((n) => /\.(svelte|ts|css)$/.test(n))) {
    const stripped = stripComments(source);
    for (const hit of durationHits(stripped)) {
      durationChecked++;
      if (hit.ms >= DURATION_MIN && hit.ms <= DURATION_MAX) continue;
      if (isAllowed(budget.durations, path, hit.token)) continue;
      failures.push(`duration out of [${DURATION_MIN}, ${DURATION_MAX}]ms: ${hit.ms}ms in ${path}:${hit.line} (${hit.token})`);
    }
  }
  summary.push(`transition-duration band: ${durationChecked} duration(s) scanned`);

  let spacingChecked = 0;
  for (const { path, source } of componentFiles((n) => n.endsWith('.svelte'))) {
    for (const hit of spacingBracketHits(stripComments(source))) {
      spacingChecked++;
      if (isAllowed(budget.spacingBrackets, path, hit.token)) continue;
      failures.push(`unallowlisted spacing bracket: ${hit.token} in ${path}:${hit.line}`);
    }
  }
  summary.push(`spacing-bracket allowlist: ${spacingChecked} bracket(s) scanned`);

  let colorChecked = 0;
  for (const { path, source } of componentFiles((n) => /\.(svelte|ts|css)$/.test(n))) {
    const stripped = stripComments(source);
    for (const hit of achromaticColorHits(stripped)) {
      colorChecked++;
      if (isAllowed(budget.achromaticColors, path, hit.token)) continue;
      failures.push(`achromatic color value: ${hit.token} in ${path}:${hit.line}`);
    }
  }
  summary.push(`achromatic colors: ${colorChecked} value(s) scanned`);

  return { pass: failures.length === 0, summary, failures };
}

function main() {
  const budget = JSON.parse(readFileSync(resolve(ROOT, 'scripts/invisible-craft-budget.json'), 'utf8'));
  const { pass, summary, failures } = evaluate(budget);
  for (const line of summary) console.log(`invisible-craft: ${line}`);
  if (pass) {
    console.log('invisible-craft: PASS');
    process.exit(0);
  }
  console.error('invisible-craft: FAIL');
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
