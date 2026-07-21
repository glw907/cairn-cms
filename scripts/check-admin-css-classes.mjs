// cairn-cms: the admin-CSS class-compilation gate. A daisyUI or Tailwind class a scanned
// component's template references must actually compile into the built cairn-admin.css; a class
// that only exists in markup and never reaches the compiled sheet silently fails to style anything
// (the T7 `text-balance` miss and the admin-toolkit `.join` near-miss are both instances of this
// failure mode: the class read as present in the author's mind, absent in the shipped CSS). Scans
// every `src/lib/admin-toolkit/*.svelte` and `src/lib/components/*.svelte` template for its literal
// class tokens (a static `class="..."` string, a quoted literal inside a `{...}` expression within
// one, and a `class:token` directive name), excludes any name the component's own scoped `<style>`
// block defines (locally scoped, not the admin sheet's job), and fails naming any remaining token
// absent from dist/components/cairn-admin.css. Conservative by design: a variant-prefixed token
// (`sm:table-cell`) and an arbitrary-value bracket (`text-[0.8125rem]`) are both skipped, since
// verifying their compiled (media-query-wrapped, escaped) form reliably is out of scope here; this
// gate exists to catch a plain missing class, not to police every token. A found class that turns
// out to be a deliberate naming or test-selector hook with no visual responsibility of its own
// (real styling rides on the sibling Tailwind utilities in the same class attribute), rather than
// a genuine daisy/Tailwind miss, is allowlisted by exact file+token+reason in
// scripts/admin-css-classes-allowlist.json, the same idiom check-invisible-craft.mjs's budget
// uses. Wired as `npm run check:admin-css-classes`.
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripComments } from './check-invisible-craft.mjs';
import { repoRoot } from './repo-root.mjs';

const ROOT = repoRoot(import.meta.url);
const SCAN_DIRS = ['src/lib/admin-toolkit', 'src/lib/components'];
const COMPILED_SHEET = 'dist/components/cairn-admin.css';
const ALLOWLIST_PATH = 'scripts/admin-css-classes-allowlist.json';

/**
 * The 1-based line number of a character offset in a source string.
 * @param {string} source
 * @param {number} index
 * @returns {number}
 */
function lineOf(source, index) {
  return source.slice(0, index).split('\n').length;
}

/**
 * The text with every top-level `{...}` expression removed (a Svelte mustache inside an attribute
 * value), paired with the removed expressions themselves. Brace-matched rather than a naive
 * non-greedy regex, so a nested object literal inside the expression does not truncate the match
 * early.
 * @param {string} text
 * @returns {{ withoutBraces: string, expressions: string[] }}
 */
function splitBraces(text) {
  let withoutBraces = '';
  const expressions = [];
  let depth = 0;
  let exprStart = -1;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') {
      if (depth === 0) exprStart = i + 1;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        expressions.push(text.slice(exprStart, i));
        withoutBraces += ' ';
      }
    } else if (depth === 0) {
      withoutBraces += ch;
    }
  }
  return { withoutBraces, expressions };
}

const CLASS_ATTR = /\bclass\s*=\s*"([^"]*)"/g;
// A quoted literal in a ternary's OUTPUT position only (right after `?` or `:`), never a
// comparison operand (`size === 'xs'`): the conditional-class idiom writes `cond ? 'a' : 'b'`, and
// only 'a'/'b' are candidate class names, not a value the condition itself compares against.
const TERNARY_OUTPUT_LITERAL = /[?:]\s*(?:'([^']*)'|"([^"]*)")/g;

/**
 * Every literal class token inside a component's `class="..."` attributes: the static
 * whitespace-separated tokens, plus any single- or double-quoted string literal in a ternary's
 * output position inside a `{...}` expression within one (the conditional-class idiom,
 * `{cond ? 'btn-active' : ''}`; a comparison operand like `{size === 'xs' ? ... }` is not a class
 * candidate and is left alone).
 * @param {string} source a `.svelte` file's raw source
 * @returns {{ token: string, line: number }[]}
 */
export function classAttributeTokens(source) {
  /** @type {{ token: string, line: number }[]} */
  const hits = [];
  for (const m of source.matchAll(CLASS_ATTR)) {
    const line = lineOf(source, m.index);
    const { withoutBraces, expressions } = splitBraces(m[1]);
    for (const token of withoutBraces.split(/\s+/).filter(Boolean)) hits.push({ token, line });
    for (const expr of expressions) {
      for (const lm of expr.matchAll(TERNARY_OUTPUT_LITERAL)) {
        const literal = lm[1] ?? lm[2] ?? '';
        for (const token of literal.split(/\s+/).filter(Boolean)) hits.push({ token, line });
      }
    }
  }
  return hits;
}

const CLASS_DIRECTIVE = /\bclass:([a-zA-Z0-9_:-]+)/g;

/**
 * Every Svelte `class:token` directive's own token name (`class:dropdown-open={open}` yields
 * `dropdown-open`; a variant-prefixed name like `class:lg:drawer-open` yields the whole
 * `lg:drawer-open`, colon included, exactly as written).
 * @param {string} source a `.svelte` file's raw source
 * @returns {{ token: string, line: number }[]}
 */
export function classDirectiveTokens(source) {
  return [...source.matchAll(CLASS_DIRECTIVE)].map((m) => ({ token: m[1], line: lineOf(source, m.index) }));
}

const STYLE_BLOCK = /<style[^>]*>([\s\S]*?)<\/style>/;
const CLASS_SELECTOR = /\.(-?[a-zA-Z_][\w-]*)/g;

/**
 * Every class name a component's own scoped `<style>` block defines as a selector. These are
 * Svelte-scoped to the component, not the admin sheet's job, so a reference to one in the
 * component's own markup must never be checked against the compiled sheet.
 * @param {string} source a `.svelte` file's raw source
 * @returns {Set<string>}
 */
export function scopedClassNames(source) {
  const match = STYLE_BLOCK.exec(source);
  if (!match) return new Set();
  const css = stripComments(match[1]);
  return new Set([...css.matchAll(CLASS_SELECTOR)].map((m) => m[1]));
}

/**
 * Whether a token is in scope for the compiled-sheet check: a plain identifier-shaped class name
 * (letters, digits, hyphens, an optional leading hyphen for a negative-margin utility), excluding
 * a variant-prefixed token (contains `:`) and an arbitrary-value bracket token (contains `[`),
 * whose compiled (media-query-wrapped, escaped) form this conservative gate does not verify.
 * @param {string} token
 * @returns {boolean}
 */
export function isCheckable(token) {
  return /^-?[a-zA-Z][a-zA-Z0-9-]*$/.test(token);
}

/**
 * Whether the compiled sheet defines a rule for the exact class name (a whole-token match: `.join`
 * must not be satisfied by a compiled `.join-item`).
 * @param {string} compiledCss
 * @param {string} token
 * @returns {boolean}
 */
function sheetHasClass(compiledCss, token) {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\.${escaped}(?![\\w-])`).test(compiledCss);
}

/**
 * Every checkable, non-scoped class token a component's template references that the compiled
 * sheet does not define a rule for.
 * @param {string} source a `.svelte` file's raw source
 * @param {string} compiledCss the built dist/components/cairn-admin.css text
 * @returns {{ token: string, line: number }[]}
 */
export function findUncompiledClasses(source, compiledCss) {
  const scoped = scopedClassNames(source);
  const seen = new Set();
  /** @type {{ token: string, line: number }[]} */
  const findings = [];
  for (const hit of [...classAttributeTokens(source), ...classDirectiveTokens(source)]) {
    if (!isCheckable(hit.token)) continue;
    if (scoped.has(hit.token)) continue;
    if (sheetHasClass(compiledCss, hit.token)) continue;
    const key = `${hit.token}:${hit.line}`;
    if (seen.has(key)) continue;
    seen.add(key);
    findings.push(hit);
  }
  return findings;
}

/**
 * Whether the allowlist covers a finding, by exact file+token (the same shape
 * check-invisible-craft.mjs's own `isAllowed` uses for its budget).
 * @param {{ file: string, token: string }[]} allowlist
 * @param {string} file
 * @param {string} token
 * @returns {boolean}
 */
function isAllowed(allowlist, file, token) {
  return allowlist.some((entry) => entry.file === file && entry.token === token);
}

function main() {
  const compiledCss = readFileSync(resolve(ROOT, COMPILED_SHEET), 'utf8');
  const allowlist = JSON.parse(readFileSync(resolve(ROOT, ALLOWLIST_PATH), 'utf8'));
  /** @type {string[]} */
  const failures = [];
  let filesScanned = 0;
  for (const dir of SCAN_DIRS) {
    const full = resolve(ROOT, dir);
    for (const name of readdirSync(full)) {
      if (!name.endsWith('.svelte')) continue;
      filesScanned++;
      const path = join(full, name);
      const source = readFileSync(path, 'utf8');
      const relPath = relative(ROOT, path).split('\\').join('/');
      for (const finding of findUncompiledClasses(source, compiledCss)) {
        if (isAllowed(allowlist, relPath, finding.token)) continue;
        failures.push(`${relPath}:${finding.line}: class "${finding.token}" never compiles into ${COMPILED_SHEET}`);
      }
    }
  }
  console.log(`admin-css-classes: ${filesScanned} component(s) scanned`);
  if (failures.length === 0) {
    console.log('admin-css-classes: PASS');
    process.exit(0);
  }
  console.error('admin-css-classes: FAIL');
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
