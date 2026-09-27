// cairn-cms: the custom-surface ratchet gate. Holds the admin and showcase trees to their de-customized
// floor on enumerable signals (not line counts, which are gameable and would flag sanctioned patterns):
//   (1) the unlayered-rule set, pinned by exact selector, neither deletable nor extendable without an
//       allowlist change; (2) a cap on @layer components rule selectors per tree; (3) a cap on the
//       cairn-idiom sublayer's own selectors per tree (the one home every rule that overrides a daisyUI
//       declaration lives in: @layer utilities { @layer cairn-idiom { ... } }, parsed by brace matching
//       the same way the components block is, and excluded from the unlayered-rule scan the same way);
//       (4) a per-tree retired-token budget. The admin counts the muted and subtle parallel tokens wrapped
//       in a bracket utility or an inline style; the showcase counts any bracketed or inline
//       custom-property reference. The budget ratchets to zero across the sweep. Budgets, the per-tree
//       retired-token pattern, and the by-name Tier-2 allowlist live in
//       scripts/checks/custom-surface-budget.json, seeded at current values. Wired as
//       `npm run check:custom-surface`.
import { readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { walk } from '../walk-files.mjs';
import { repoRoot } from '../repo-root.mjs';

const ROOT = repoRoot(import.meta.url);

/**
 * The css with every `/* … *\/` comment blanked to whitespace. The signal scans below brace-match and
 * regex-scan structural CSS, so a comment that quotes `@layer components` or a `:where([data-theme…])`
 * selector (the walled Tier-2 sheet has both in its load-bearing-rules banner) must not be read as the
 * real at-rule or rule. Whitespace replacement keeps every byte offset, so a hit's `file:line` stays
 * accurate; only the markup retired-token scan, which is line-based, leaves comments intact.
 * @param {string} css
 * @returns {string}
 */
function stripCssComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

const COMPONENTS_LAYER = '@layer components';
// The one home every rule that overrides a daisyUI declaration lives in (spec, "The cairn-idiom
// sublayer"), nested inside `@layer utilities { … }` in the source.
const CAIRN_IDIOM_LAYER = '@layer cairn-idiom';

/**
 * Locates the first block opened by the literal `marker` text (`@layer components` or `@layer
 * cairn-idiom`) by brace matching, in the comment-blanked css. A nested block such as cairn-idiom
 * inside `@layer utilities { … }` is found by its own marker, so the outer wrapper never enters the
 * count.
 * @param {string} css comment-blanked css
 * @param {string} marker the at-rule text that opens the block
 * @returns {{ start: number, open: number, close: number } | null} the marker's offset and the
 *   block's opening and matching closing brace offsets, or null when absent or unbalanced
 */
function namedLayerSpan(css, marker) {
  const start = css.indexOf(marker);
  if (start === -1) return null;
  const open = css.indexOf('{', start);
  if (open === -1) return null;
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return { start, open, close: i };
  }
  return null;
}

/**
 * The body of the first `marker` block, or '' if absent. Comments are blanked first so a commented
 * mention of the marker is not mistaken for the real block.
 * @param {string} source
 * @param {string} marker
 * @returns {string}
 */
function namedLayerBody(source, marker) {
  const css = stripCssComments(source);
  const span = namedLayerSpan(css, marker);
  return span ? css.slice(span.open + 1, span.close) : '';
}

/**
 * The comment-blanked css with its first `marker` block removed. An empty block is left in place.
 * @param {string} source
 * @param {string} marker
 * @returns {string}
 */
function stripNamedLayer(source, marker) {
  const css = stripCssComments(source);
  const span = namedLayerSpan(css, marker);
  if (!span || span.close === span.open + 1) return css;
  return css.slice(0, span.start) + css.slice(span.close + 1);
}

// A scoped rule selector in EITHER authored form: the compiled `:where([data-theme=…])` form and the
// bare `[data-theme='cairn-admin'] .foo` form a developer types directly (the box-sizing reset and the
// reduced-motion block both use it). The build's postcss-prefix-selector only normalizes to `:where(…)`
// at compile time, so a bespoke bare-scoped rule would evade a `:where(`-only signal and ship unguarded.
// The `:where(` wrapper is optional; the `[data-theme=` anchor is what both forms share.
const SCOPED_RULE = /(?::where\(\s*)?\[data-theme=[^{]*?\{/g;

/**
 * The unlayered scoped rules (a scoped rule, in either authored form, NOT inside @layer components and
 * NOT inside the cairn-idiom sublayer), by selector.
 * @param {string} css
 * @returns {string[]}
 */
export function pinnedUnlayeredRules(css) {
  const out = [];
  const stripped = stripNamedLayer(stripNamedLayer(css, COMPONENTS_LAYER), CAIRN_IDIOM_LAYER);
  for (const m of stripped.matchAll(SCOPED_RULE)) {
    // Drop the trailing brace, keep the selector text.
    out.push(m[0].slice(0, -1).trim());
  }
  return out;
}

/**
 * Count of scoped rule selectors inside @layer components, in either authored form.
 * @param {string} css
 * @returns {number}
 */
export function componentsLayerSelectorCount(css) {
  return [...namedLayerBody(css, COMPONENTS_LAYER).matchAll(SCOPED_RULE)].length;
}

/**
 * Count of scoped rule selectors inside the cairn-idiom sublayer, in either authored form.
 * @param {string} css
 * @returns {number}
 */
export function cairnIdiomLayerSelectorCount(css) {
  return [...namedLayerBody(css, CAIRN_IDIOM_LAYER).matchAll(SCOPED_RULE)].length;
}

// The admin retired-token pattern (muted/subtle only): the default when a tree names no pattern, so the
// admin tree's signal is unchanged. A tree may override it (the showcase generalizes off muted/subtle to
// any var(--…) token; see scripts/checks/custom-surface-budget.json). Defined as a regex literal and read via
// .source: build-admin-css.mjs runs Tailwind, whose auto-content scan reaches scripts/, and an
// arbitrary-value bracket form written as a raw string here would be extracted as a utility candidate and
// could compile to malformed CSS (see the tailwind-scans-docs-bad-candidate gotcha). A regex literal is
// inert to that scan, and .source yields the same source string a hand-written constant would.
const DEFAULT_RETIRED_TOKEN_PATTERN =
  /\[[^\][]*var\(--color-(?:muted|subtle)\)[^\][]*\]|style="[^"]*var\(--color-(?:muted|subtle)\)/
    .source;

/**
 * Arbitrary retired-token references in `.svelte` markup under a dir. The de-customization Rule 2 retires
 * the parallel-token forms a developer reaches for instead of the named `text-muted` / `text-subtle`
 * utilities: any arbitrary-value Tailwind utility that wraps the var in square brackets
 * (`text-[var(--color-muted)]`, `bg-[var(--color-subtle)]`, `decoration-[var(--color-muted)]/55`, the
 * `[color:var(--color-subtle)]` long form) and an inline `style="…var(--color-muted)…"`. The named
 * utilities carry no brackets and no `var()`, so they are allowed; a scoped `<style>` block declaration
 * (`color: var(--color-muted)`) and a JS theme object are idiomatic token consumption, not the markup
 * anti-pattern, so the bracket/inline-style anchor leaves them out.
 * @param {string} dir
 * @param {string} patternSource A regex-source string anchored on the arbitrary-value bracket or the
 *   inline-style attribute. Defaults to the admin muted/subtle pattern; the showcase tree passes the
 *   generalized any-token form (see scripts/checks/custom-surface-budget.json).
 * @returns {{ file: string, line: number, text: string }[]}
 */
export function retiredTokenHits(dir, patternSource = DEFAULT_RETIRED_TOKEN_PATTERN) {
  const pat = new RegExp(patternSource);
  /** @type {{ file: string, line: number, text: string }[]} */
  const hits = [];
  for (const file of walk(resolve(ROOT, dir), (n) => n.endsWith('.svelte'))) {
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, i) => {
        if (pat.test(line)) hits.push({ file: relative(ROOT, file), line: i + 1, text: line.trim() });
      });
  }
  return hits;
}

/**
 * Evaluate one tree against its budget.
 * @param {{ adminCss: string | null, markupDirs: string[], retiredTokenPattern?: string }} tree The tree's
 *   optional `retiredTokenPattern` overrides the default admin muted/subtle pattern for its markup scan.
 * @param {{ unlayeredAllowlist: string[], componentsLayerCap: number, idiomLayerCap?: number, retiredTokenBudget: number }} budget
 *   `idiomLayerCap` is optional so a caller that predates the cairn-idiom category (an existing test
 *   fixture, a tree that authors no cairn-idiom rules yet) is not forced to name it; an absent cap is
 *   read as no limit.
 * @returns {{ pass: boolean, failures: string[] }}
 */
export function evaluate(tree, budget) {
  const failures = [];
  if (tree.adminCss) {
    const css = readFileSync(resolve(ROOT, tree.adminCss), 'utf8');
    // Pin the unlayered set by EXACT selector, not substring. A substring allow (`.menu li`) would pass
    // a swapped rule that merely CONTAINS the sanctioned text; whitespace-normalized set equality is the
    // tight pin. Normalize runs of whitespace to one space on both sides before comparing.
    const norm = (/** @type {string} */ s) => s.replace(/\s+/g, ' ').trim();
    const unlayered = pinnedUnlayeredRules(css).map(norm);
    const allow = budget.unlayeredAllowlist.map(norm);
    if (unlayered.length !== allow.length)
      failures.push(`unlayered rules: found ${unlayered.length}, allowlist has ${allow.length}`);
    const allowSet = new Set(allow);
    for (const sel of unlayered)
      if (!allowSet.has(sel)) failures.push(`unsanctioned unlayered rule: ${sel}`);
    const layerCount = componentsLayerSelectorCount(css);
    if (layerCount > budget.componentsLayerCap)
      failures.push(`@layer components selectors: ${layerCount} > cap ${budget.componentsLayerCap}`);
    const idiomCount = cairnIdiomLayerSelectorCount(css);
    const idiomCap = budget.idiomLayerCap ?? Infinity;
    if (idiomCount > idiomCap)
      failures.push(`cairn-idiom selectors: ${idiomCount} > idiomLayerCap ${idiomCap}`);
  }
  let retired = 0;
  for (const dir of tree.markupDirs) retired += retiredTokenHits(dir, tree.retiredTokenPattern).length;
  if (retired > budget.retiredTokenBudget)
    failures.push(`retired tokens: ${retired} > budget ${budget.retiredTokenBudget}`);
  return { pass: failures.length === 0, failures };
}

function main() {
  const budget = JSON.parse(readFileSync(resolve(ROOT, 'scripts/checks/custom-surface-budget.json'), 'utf8'));
  let failed = false;
  for (const [name, tree] of Object.entries(budget.trees)) {
    const { pass, failures } = evaluate(tree, tree.budget);
    if (pass) {
      console.log(`custom-surface [${name}]: PASS`);
    } else {
      console.error(`custom-surface [${name}]: FAIL`);
      for (const f of failures) console.error(`  ${f}`);
      failed = true;
    }
  }
  if (failed) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
