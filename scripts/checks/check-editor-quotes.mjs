// cairn-cms: the editor-quotes grounding gate. `docs/editors/when-something-goes-wrong.md`
// promises the editor "Every message below is quoted exactly as it appears, so you can match it
// to what you're seeing" and then bolds each message in double quotes. Nothing enforced that
// promise: a copy edit in a component (`LoginPage.svelte`, `EditPage.svelte`, `refusal-codes.ts`,
// and so on) can strand the doc's quote with no gate noticing, since `check:prose` scans
// components and `check:docs` scans links, and neither compares one against the other (the
// conventions-pass close caught one only via an Opus diff-review; see
// docs/internal/docs-friction-log.md's "contributor" finding).
//
// This gate extracts every bolded double-quoted sentence from the page and checks it is grounded
// in at least one shipped string somewhere under `src/lib`. A shipped string is rarely a plain
// literal: `EditPage.svelte`'s broken-link banner picks between "a page"/"pages" by a ternary,
// `CairnHistory.svelte` interpolates the draft's editor and save date, `taxonomy-enforce.ts`
// interpolates the tag name. Grounding a quote therefore does not mean exact equality; it means
// every LITERAL segment of some shipped template (the parts outside its `${...}`/`{...}` holes)
// appears in the quote, in order, so a doc quote naming a variable value in its own words (an
// editor's name, a placeholder tag) still grounds against the template that produces it.
//
// The candidate pool is deliberately broad (every `.svelte`/`.ts` file under `src/lib`, both the
// markup text nodes and the quoted/template string literals in `<script>` and plain `.ts`
// modules) rather than a curated list of "known message files": a message moving to a new
// component should not need this gate's own source edited to keep tracking it.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DOC_PATH = join(ROOT, 'docs/editors/when-something-goes-wrong.md');
const LIB_DIR = join(ROOT, 'src/lib');

// A candidate whose non-wildcard text totals less than this many characters proves nothing (an
// empty Svelte control-flow tag like `{#if x}` extracts as an all-wildcard "candidate" otherwise,
// which would vacuously ground any quote at all).
const MIN_LITERAL_LENGTH = 8;

/**
 * Recursively collect every file under `dir` whose name ends with one of `exts`.
 * @param {string} dir
 * @param {string[]} exts
 * @returns {string[]}
 */
function walkExts(dir, exts) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walkExts(full, exts));
    else if (exts.some((ext) => name.endsWith(ext))) out.push(full);
  }
  return out;
}

/**
 * Fold whitespace runs (including newlines) to a single space, lowercase, and strip every
 * quote-like character (straight and curly, single and double). Stripping quote characters
 * outright, rather than translating curly to straight, sidesteps needing to know which style a
 * given file or doc line used (a component's curly apostrophe vs. the doc's straight one, or a
 * doc quote's `'X'` vs. a template's `"${x}"`): both sides go through the same fold, so
 * whichever style either side picked, the comparison sees the same text.
 * @param {string} s
 * @returns {string}
 */
function fold(s) {
  return s
    .replace(/[‘’“”'"]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

/** @param {string} s */
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Matches one Svelte `{expr}` or JS template `${expr}` interpolation hole. Non-nested: the holes
// this gate has to cross (a ternary, a property access, a function call) never nest braces.
const HOLE = /\$?\{[^{}]*\}/g;

/**
 * Build the grounding pattern for one raw candidate string (still carrying its `${...}`/`{...}`
 * holes, not yet folded). Returns null when the candidate's literal text is too short to prove
 * anything (see MIN_LITERAL_LENGTH).
 * @param {string} raw
 * @returns {RegExp | null}
 */
export function buildPattern(raw) {
  const parts = raw.split(HOLE).map((p) => fold(p));
  const literalLength = parts.reduce((n, p) => n + p.length, 0);
  if (literalLength < MIN_LITERAL_LENGTH) return null;
  return new RegExp(parts.map(escapeRegExp).join('.*'));
}

/**
 * Whether one already-folded doc quote is grounded in at least one raw candidate string.
 * @param {string} foldedQuote
 * @param {string[]} candidates
 * @returns {boolean}
 */
export function isGrounded(foldedQuote, candidates) {
  return candidates.some((raw) => {
    const pattern = buildPattern(raw);
    return pattern !== null && pattern.test(foldedQuote);
  });
}

// --- Extracting the doc's own bolded quotes. ---

/**
 * Extract every `**"..."**` bolded double-quoted sentence from the editors page, folded to the
 * same comparable form `isGrounded` expects. Order and duplicates are preserved (a repeated
 * message, like "An entry with that address already exists.", is checked once per appearance so
 * a later edit that strands only one occurrence still fails).
 * @param {string} markdown
 * @returns {string[]}
 */
export function extractDocQuotes(markdown) {
  const found = [];
  for (const m of markdown.matchAll(/\*\*"([^"]+)"\*\*/g)) {
    found.push(fold(m[1]));
  }
  return found;
}

// --- Extracting candidate shipped strings. ---

/**
 * Extract every single-quoted, double-quoted, and backtick string literal from a `.ts` source (or
 * a `.svelte` file's `<script>` block), with holes and all, for `buildPattern` to fold later. Line
 * and block comments are stripped first so a stale TSDoc example is never read as shipped text.
 * @param {string} src
 * @returns {string[]}
 */
export function extractScriptCandidates(src) {
  const stripped = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
  const found = [];
  for (const rx of [/`((?:[^`\\]|\\.)*)`/g, /'((?:[^'\\]|\\.)*)'/g, /"((?:[^"\\]|\\.)*)"/g]) {
    for (const m of stripped.matchAll(rx)) found.push(m[1]);
  }
  return found;
}

/**
 * Extract every markup text node (the content between a closing `>` and the next `<`) from a
 * Svelte component, holes and all. `<script>`/`<style>` blocks and HTML comments are stripped
 * first, so a component's own code and doc comments are never read as rendered text.
 * @param {string} src
 * @returns {string[]}
 */
export function extractMarkupCandidates(src) {
  const stripped = src
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');
  const found = [];
  for (const m of stripped.matchAll(/>([^<>]+)</g)) found.push(m[1]);
  return found;
}

/**
 * Every candidate shipped string a `.svelte` or `.ts` file under `src/lib` carries: for a
 * `.svelte` file, both its `<script>` block's string literals and its markup text nodes; for a
 * `.ts` file, its string literals alone.
 * @param {string} file An absolute path.
 * @returns {string[]}
 */
export function candidatesForFile(file) {
  const src = readFileSync(file, 'utf8');
  if (!file.endsWith('.svelte')) return extractScriptCandidates(src);
  const scriptMatch = src.match(/<script[\s\S]*?<\/script>/i);
  const scriptCandidates = scriptMatch ? extractScriptCandidates(scriptMatch[0]) : [];
  return [...scriptCandidates, ...extractMarkupCandidates(src)];
}

// --- Driver. ---

/**
 * The quotes the editors page bolds but no shipped `src/lib` string grounds. Pure (no process
 * exit), so the unit test can assert against a stranded fixture without shelling out.
 * @param {string} markdown
 * @param {string[]} candidates
 * @returns {string[]}
 */
export function findStrandedQuotes(markdown, candidates) {
  return extractDocQuotes(markdown).filter((quote) => !isGrounded(quote, candidates));
}

function main() {
  const markdown = readFileSync(DOC_PATH, 'utf8');
  const files = walkExts(LIB_DIR, ['.svelte', '.ts']);
  const candidates = files.flatMap(candidatesForFile);
  const stranded = findStrandedQuotes(markdown, candidates);
  if (stranded.length === 0) {
    console.log(`check-editor-quotes: OK (${extractDocQuotes(markdown).length} quotes grounded)`);
    return;
  }
  console.error(`check-editor-quotes: ${stranded.length} stranded quote(s) in docs/editors/when-something-goes-wrong.md\n`);
  for (const quote of stranded) {
    console.error(`  "${quote}"`);
  }
  console.error('\nNo shipped string under src/lib grounds this quote. Update the doc to match the component, or the component broke a promised message.');
  process.exitCode = 1;
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) main();
