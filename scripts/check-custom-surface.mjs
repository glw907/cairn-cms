// cairn-cms: the custom-surface ratchet gate. Holds the admin and showcase trees to their de-customized
// floor on enumerable signals (not line counts, which are gameable and would flag sanctioned patterns):
//   (1) the unlayered-rule set, pinned by exact selector, neither deletable nor extendable without an
//       allowlist change; (2) a cap on @layer components rule selectors per tree; (3) a retired-token
//       budget (text-[var(--color-muted|subtle)] references in markup) that ratchets to zero across the
//       sweep. Budgets and the by-name Tier-2 allowlist live in scripts/custom-surface-budget.json,
//       seeded at current values. Wired as `npm run check:custom-surface`.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

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

/**
 * The body of the first `@layer components { … }` block by brace matching, or '' if absent.
 * @param {string} source
 * @returns {string}
 */
function componentsLayerBody(source) {
	const css = stripCssComments(source);
	const start = css.indexOf('@layer components');
	if (start === -1) return '';
	const open = css.indexOf('{', start);
	if (open === -1) return '';
	let depth = 0;
	for (let i = open; i < css.length; i++) {
		if (css[i] === '{') depth++;
		else if (css[i] === '}' && --depth === 0) return css.slice(open + 1, i);
	}
	return '';
}

/**
 * The css with its `@layer components { … }` block removed (brace-matched). Comments are blanked first
 * so a commented `@layer components` mention is not mistaken for the real block.
 * @param {string} source
 * @returns {string}
 */
function stripComponentsLayer(source) {
	const css = stripCssComments(source);
	const body = componentsLayerBody(source);
	if (!body) return css;
	const start = css.indexOf('@layer components');
	const open = css.indexOf('{', start);
	let depth = 0;
	for (let i = open; i < css.length; i++) {
		if (css[i] === '{') depth++;
		else if (css[i] === '}' && --depth === 0) return css.slice(0, start) + css.slice(i + 1);
	}
	return css;
}

// A scoped rule selector in EITHER authored form: the compiled `:where([data-theme=…])` form and the
// bare `[data-theme='cairn-admin'] .foo` form a developer types directly (the box-sizing reset and the
// reduced-motion block both use it). The build's postcss-prefix-selector only normalizes to `:where(…)`
// at compile time, so a bespoke bare-scoped rule would evade a `:where(`-only signal and ship unguarded.
// The `:where(` wrapper is optional; the `[data-theme=` anchor is what both forms share.
const SCOPED_RULE = /(?::where\(\s*)?\[data-theme=[^{]*?\{/g;

/**
 * The unlayered scoped rules (a scoped rule, in either authored form, NOT inside @layer components), by
 * selector.
 * @param {string} css
 * @returns {string[]}
 */
export function pinnedUnlayeredRules(css) {
	const out = [];
	for (const m of stripComponentsLayer(css).matchAll(SCOPED_RULE)) {
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
	return [...componentsLayerBody(css).matchAll(SCOPED_RULE)].length;
}

/**
 * Files under a dir matching an extension predicate, recursively.
 * @param {string} dir
 * @param {(name: string) => boolean} keep
 * @returns {string[]}
 */
function walk(dir, keep) {
	const out = [];
	for (const name of readdirSync(dir)) {
		const full = join(dir, name);
		if (statSync(full).isDirectory()) out.push(...walk(full, keep));
		else if (keep(name)) out.push(full);
	}
	return out;
}

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
 * @returns {{ file: string, line: number, text: string }[]}
 */
export function retiredTokenHits(dir) {
	const pat =
		/\[[^\][]*var\(--color-(?:muted|subtle)\)[^\][]*\]|style="[^"]*var\(--color-(?:muted|subtle)\)/;
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
 * @param {{ adminCss: string | null, markupDirs: string[] }} tree
 * @param {{ unlayeredAllowlist: string[], componentsLayerCap: number, retiredTokenBudget: number }} budget
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
	}
	let retired = 0;
	for (const dir of tree.markupDirs) retired += retiredTokenHits(dir).length;
	if (retired > budget.retiredTokenBudget)
		failures.push(`retired tokens: ${retired} > budget ${budget.retiredTokenBudget}`);
	return { pass: failures.length === 0, failures };
}

function main() {
	const budget = JSON.parse(readFileSync(resolve(ROOT, 'scripts/custom-surface-budget.json'), 'utf8'));
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
	process.exit(failed ? 1 : 0);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
