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
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { walk } from '../walk-files.mjs';
import { repoRoot } from '../repo-root.mjs';

const ROOT = repoRoot(import.meta.url);
const DOC_PATH = join(ROOT, 'docs/editors/when-something-goes-wrong.md');
const LIB_DIR = join(ROOT, 'src/lib');

// A candidate whose non-wildcard text totals less than this many characters proves nothing (an
// empty Svelte control-flow tag like `{#if x}` extracts as an all-wildcard "candidate" otherwise,
// which would vacuously ground any quote at all).
const MIN_LITERAL_LENGTH = 8;

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
 * anything (see MIN_LITERAL_LENGTH). The pattern is anchored (`^...$`): a candidate grounds a
 * quote only when its literal parts, in order, span the WHOLE quote, not merely appear somewhere
 * inside it. An unanchored pattern lets an unrelated 8+ character fragment shared by two
 * unrelated strings (a word like "published" or "fragment") vacuously ground a quote whose real
 * source string has since drifted; anchoring requires the candidate to account for the quote's
 * entire text, holes aside.
 * @param {string} raw
 * @returns {RegExp | null}
 */
export function buildPattern(raw) {
  const parts = raw.split(HOLE).map((p) => fold(p));
  const literalLength = parts.reduce((n, p) => n + p.length, 0);
  if (literalLength < MIN_LITERAL_LENGTH) return null;
  return new RegExp('^' + parts.map(escapeRegExp).join('.*') + '$');
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
 * a `.svelte` file's `<script>` block), with holes and all, for `buildPattern` to fold later.
 *
 * A single left-to-right scan, tracking comment-vs-code-vs-string state character by character,
 * rather than a comment-stripping regex pass followed by three independent per-quote-type regex
 * passes. Two failure modes that independence produces: a `//` inside a string literal (a literal
 * URL like `'https://internal.invalid'`) reads as a line comment under a standalone comment
 * regex, deleting the rest of the line and stranding the opening quote for every later pairing in
 * the file; and an apostrophe inside a double-quoted or template string (a contraction like
 * `"can't"`) reads as opening a single-quoted string under a standalone single-quote regex,
 * swallowing everything up to the next unrelated apostrophe anywhere later in the file. Scanning
 * once with explicit state (in a string, and which quote character closes it) never misreads
 * either.
 *
 * Residual gap, undefended here: a regex literal containing a quote character (`/can't/`,
 * `/[^"]/`) is not its own tracked state, so the scan reads the quote or apostrophe inside it as
 * opening a new string literal, corrupting everything parsed after it in the file. `src/lib`
 * carries few regex literals with an embedded quote today, so this has not yet mis-scanned a real
 * file, but a future one could.
 * @param {string} src
 * @returns {string[]}
 */
export function extractScriptCandidates(src) {
  const found = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    const next = src[i + 1];
    if (c === '/' && next === '/') {
      while (i < n && src[i] !== '\n') i++;
    } else if (c === '/' && next === '*') {
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i = Math.min(i + 2, n);
    } else if (c === "'" || c === '"' || c === '`') {
      const quote = c;
      let literal = '';
      i += 1;
      while (i < n) {
        if (src[i] === '\\') {
          literal += src.slice(i, i + 2);
          i += 2;
          continue;
        }
        if (src[i] === quote) {
          i += 1;
          break;
        }
        literal += src[i];
        i += 1;
      }
      found.push(literal);
    } else {
      i += 1;
    }
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
 * `.svelte` file, both every `<script>` block's string literals and its markup text nodes; for a
 * `.ts` file, its string literals alone.
 *
 * A `.svelte` file can carry more than one `<script>` block (a leading `<script module>` plus the
 * instance `<script>`), so this scans every block with `matchAll` rather than a single `match`,
 * which would stop at the first `</script>` and silently drop every literal in the blocks after it.
 * @param {string} file An absolute path.
 * @returns {string[]}
 */
export function candidatesForFile(file) {
  const src = readFileSync(file, 'utf8');
  if (!file.endsWith('.svelte')) return extractScriptCandidates(src);
  const scriptCandidates = [...src.matchAll(/<script[\s\S]*?<\/script>/gi)].flatMap((m) =>
    extractScriptCandidates(m[0]),
  );
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
  const files = walk(LIB_DIR, (name) => name.endsWith('.svelte') || name.endsWith('.ts'));
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

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
