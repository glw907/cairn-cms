// cairn-cms: the admin-copy prose gate. It scans the user-facing strings in the admin components
// (`src/lib/components/*.svelte`) for AI-writing tells and fails on a hit. The component copy ships
// compiled inside the published package, so a consuming site's `prose-guard` hook never sees it (it
// would only ever scan that site's own source). The copy can only be guarded here, in this repo.
//
// This is a self-contained port of the BLOCKING layer of the workstation `prose-guard` tool
// (~/.local/bin/prose-guard), using its "general" (marketing-facing) tier, which is the right tier
// for product copy. prose-guard stays the canonical superset; this script exists so the gate runs in
// CI, where prose-guard is not installed, and so it sees Svelte markup text, which prose-guard's
// "comments" tier skips. When prose-guard's blocking rules change, mirror the change here.
//
// The mechanical rules below catch the lexical and structural class of tell. They cannot catch a
// judgment-level tell such as a tacked-on marketing closer, so the `--list` flag dumps every
// extracted string for a quick release-time prose read (the content-review skill, or a human).
//
//   node scripts/check-admin-prose.mjs          scan and fail on a hit
//   node scripts/check-admin-prose.mjs --list    print every extracted string, grouped by file
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const COMPONENTS_DIR = join(ROOT, 'src', 'lib', 'components');

// --- The general-tier blocking lists, ported verbatim from prose-guard. ---

const EM_DASH = '—'; // The en dash (ranges) is never flagged.

const BANNED_PHRASES = [
  "it's worth noting", 'when it comes to', 'dive into', 'delve', "let's explore",
  'at the end of the day', 'game-changer', 'game changer', 'state-of-the-art',
  'look no further', "in today's world",
  'to be honest', 'to be frank', 'the honest answer is', 'in the realm of',
  'in the world of',
];
const BANNED_OPENERS = [
  'moreover', 'additionally', 'furthermore', 'in conclusion',
  'needless to say', 'certainly', 'it should be noted',
];
const FILLER_WORDS = ['genuinely', 'honestly'];
const SLOP_WORDS = ['tapestry', 'multifaceted', 'testament', 'seamless'];
const MARKETING_WORDS = [
  'empower', 'streamline', 'supercharge', 'turbocharge', 'revolutionize',
  'effortless', 'effortlessly', 'plethora', 'myriad',
];
const JUDGMENT_WORDS = [
  'robust', 'leverage', 'comprehensive', 'dedicated', 'curated', 'tailored',
  'foster', 'elevate', 'transformative', 'pivotal', 'thriving', 'meticulous', 'nuanced',
  'embark', 'harness', 'bolster', 'groundbreaking', 'cutting-edge', 'innovative',
  'foundational',
];
// The general tier scans the slop and judgment word lists alongside the shared rules above.
const TIER_WORDS = [...SLOP_WORDS, ...JUDGMENT_WORDS];

const SENTENCE_SPLIT = /(?<=[.!?])\s+/;

/**
 * Count the em dashes in a string. (The en dash for ranges is never flagged.)
 * @param {string} text
 * @returns {number}
 */
function emDashCount(text) {
  return (text.match(new RegExp(EM_DASH, 'g')) ?? []).length;
}

// (kind, regex, hint). High-precision; ported from prose-guard's STRUCTURAL.
/** @type {Array<[string, RegExp, string]>} */
const STRUCTURAL = [
  ['negative antithesis',
    /\b(it|this|that)'?s?\s+(not|isn'?t)\b[^.!?;]{3,60}[,;]\s+(it|this|that|but)'?s?\b/i,
    "Explicit 'not X, it's Y' antithesis. Prefer an implicit contrast or a plain statement."],
  ['not just … but',
    /\bnot\s+just\b[^.!?]{5,60}\bbut\s+(also\s+)?/i,
    'The escalation frame reads as AI. State the point directly.'],
  ['setup-colon payoff',
    /\b(the\s+)?(point|takeaway|truth|reality|bottom line|catch|kicker)\s*:\s+[A-Z]/i,
    "The 'The point:' setup-payoff is a tell. Fold it into the sentence."],
  ['copula dodge (serves/stands as)',
    /\b(serves?|stands?|acts?|functions?)\s+as\s+a\b/i,
    "Use 'is' instead of 'serves as a'."],
  ['participial wind-up',
    /^\s*(building on|recognizing|leveraging|drawing on|having established|taking)\b[^,]{0,40},\s/im,
    'Start with the subject, not a participial bridge.'],
];

/**
 * Run the blocking lexical and structural rules over one extracted string.
 * @param {string} line
 * @returns {Array<{kind: string, hint: string}>}
 */
export function scan(line) {
  const issues = [];
  // General/marketing prose: an occasional em dash is human; flag a spray, and flag a
  // clause followed by a short tacked-on fragment after a dash.
  if (emDashCount(line) > 2) {
    issues.push({ kind: 'em-dash spray', hint: 'Keep at most one interruption (a pair) per line.' });
  }
  for (const sent of line.split(SENTENCE_SPLIT)) {
    if (emDashCount(sent) === 1) {
      let after = sent.split(EM_DASH)[1] ?? '';
      after = after.replace(/[*_`)\]]+$/, '').trim().replace(/[.!?]+$/, '').trim();
      const words = after.split(/\s+/).filter(Boolean).length;
      if (words >= 1 && words <= 6) {
        issues.push({ kind: 'em-dash appendage', hint: 'A clause plus a tacked-on fragment after a dash is a tell. Use a period, comma, or colon.' });
      }
    }
  }
  const low = line.toLowerCase();
  if (low.includes('not only') && low.includes('but also')) {
    issues.push({ kind: 'not only … but also', hint: 'Reword without the correlative pair.' });
  }
  for (const phrase of BANNED_PHRASES) {
    if (low.includes(phrase)) issues.push({ kind: `banned phrase: ${phrase}`, hint: 'Reword in a human voice.' });
  }
  for (const filler of FILLER_WORDS) {
    if (new RegExp(`\\b${filler}\\b`).test(low)) issues.push({ kind: `filler word: ${filler}`, hint: 'Drop the filler intensifier.' });
  }
  for (const word of MARKETING_WORDS) {
    if (new RegExp(`\\b${word}\\w*\\b`).test(low)) issues.push({ kind: `marketing word: ${word}`, hint: 'Cut the marketing verb; say what it does plainly.' });
  }
  for (const opener of BANNED_OPENERS) {
    for (const sent of low.split(SENTENCE_SPLIT)) {
      const head = sent.replace(/^[\s\-*>#]+/, '');
      if (head.startsWith(opener)) issues.push({ kind: `banned opener: ${opener}`, hint: 'Start with a subject, not a connector.' });
    }
  }
  for (const word of TIER_WORDS) {
    if (new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\w*\\b`).test(low)) {
      issues.push({ kind: `banned word: ${word}`, hint: 'Reword in a human voice.' });
    }
  }
  for (const [kind, rx, hint] of STRUCTURAL) {
    if (rx.test(line)) issues.push({ kind, hint });
  }
  return issues;
}

// --- Extracting the user-facing copy from a Svelte component. ---

// Attributes whose values are human-readable copy (not class names, ids, or bindings).
const COPY_ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];

/**
 * Keep only the extracted strings carrying a letter, de-duplicated. The shared tail both
 * extractors apply to their raw matches before returning.
 * @param {string[]} found
 * @returns {string[]}
 */
function lettersOnly(found) {
  return [...new Set(found.filter((s) => /[A-Za-z]/.test(s)))];
}

/**
 * Pull the user-facing strings out of one component's source: the markup text nodes plus the
 * static values of the copy-bearing attributes. Script and style blocks, comments, and `{...}`
 * expressions are removed first so only literal author-visible copy remains.
 * @param {string} src
 * @returns {string[]}
 */
export function extractCopy(src) {
  const stripped = src
    // Comments come out first. A doc comment that writes the literal `<style>` or `<script>` (the
    // `@component` block routinely does) would otherwise anchor the block strips below: the
    // non-greedy `<style[\s\S]*?</style>` would run from that mention to the real closing tag and
    // swallow the whole markup body, silently voiding the file's prose coverage.
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\{[^{}]*\}/g, ' '); // drop mustache interpolations, keeping surrounding text

  const found = [];
  // Copy-bearing attributes, static string values only (skip any value that began with a mustache).
  for (const attr of COPY_ATTRS) {
    const rx = new RegExp(`\\b${attr}\\s*=\\s*"([^"]*)"`, 'gi');
    for (const m of stripped.matchAll(rx)) {
      const v = m[1].trim();
      if (v) found.push(v);
    }
  }
  // Markup text nodes: content between a `>` and the next `<`.
  for (const m of stripped.matchAll(/>([^<>]+)</g)) {
    const v = m[1].replace(/\s+/g, ' ').trim();
    if (v) found.push(v);
  }
  return lettersOnly(found);
}

// --- Extracting the user-facing copy from a .ts copy module. ---

// A fixed allowlist of `.ts` modules that hold author-visible copy as string-array data. A `.ts`
// module is opt-in by name so type-only and logic modules are never scanned. Both modules below
// declare the copy the editor's help dialogs render, copy a Svelte markup scan never reaches.
const TS_COPY_MODULES = ['markdown-reference.ts', 'editor-shortcuts.ts'];

/**
 * Pull the user-facing strings out of a `.ts` copy module: every single-quoted, double-quoted, and
 * backtick literal. Line and block comments are removed first so a TSDoc gloss never reads as copy.
 * @param {string} src
 * @returns {string[]}
 */
export function extractTsCopy(src) {
  const stripped = src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ');

  const found = [];
  // Each quote style, captured non-greedily; escaped quotes inside a string are rare in this copy
  // and a split match still yields scannable text, so a simple class suffices.
  for (const rx of [/'([^'\\]*)'/g, /"([^"\\]*)"/g, /`([^`\\]*)`/g]) {
    for (const m of stripped.matchAll(rx)) {
      const v = m[1].replace(/\s+/g, ' ').trim();
      if (v) found.push(v);
    }
  }
  return lettersOnly(found);
}

// --- Driver. ---

// The admin component files, sorted, as plain names under COMPONENTS_DIR.
/** @returns {string[]} */
function componentFiles() {
  return readdirSync(COMPONENTS_DIR)
    .filter((f) => f.endsWith('.svelte'))
    .sort();
}

// Read one scanned file's extracted copy, choosing the extractor by extension.
/**
 * @param {string} file
 * @returns {string[]}
 */
function copyForFile(file) {
  const src = readFileSync(join(COMPONENTS_DIR, file), 'utf8');
  return file.endsWith('.ts') ? extractTsCopy(src) : extractCopy(src);
}

// Print every extracted string, grouped by file, then exit 0. Backs the `--list` flag.
/** @param {string[]} files */
function listCopy(files) {
  for (const file of files) {
    const copy = copyForFile(file);
    if (copy.length === 0) continue;
    console.log(`\n${file}`);
    for (const s of copy) console.log(`  ${s}`);
  }
  process.exit(0);
}

// Scan every file, report each tell on stderr, and exit 1 on any hit (0 when clean).
/** @param {string[]} files */
function scanCopy(files) {
  let hits = 0;
  for (const file of files) {
    const copy = copyForFile(file);
    for (const s of copy) {
      for (const issue of scan(s)) {
        hits += 1;
        console.error(`${file}: [${issue.kind}]`);
        console.error(`  "${s}"`);
        console.error(`  ${issue.hint}`);
      }
    }
  }
  if (hits > 0) {
    console.error(`\nadmin-copy prose gate: ${hits} tell(s) found. Rewrite in a plain human voice.`);
    console.error('Run `node scripts/check-admin-prose.mjs --list` to read all admin copy at once.');
    process.exit(1);
  }
  console.log(`admin-copy prose gate: clean (${files.length} components scanned).`);
}

function main() {
  // The Svelte components plus the named `.ts` copy modules, the latter checked for existence so a
  // rename surfaces here rather than silently dropping its coverage.
  const tsModules = TS_COPY_MODULES.filter((f) => existsSync(join(COMPONENTS_DIR, f)));
  const files = [...componentFiles(), ...tsModules];
  if (process.argv.includes('--list')) listCopy(files);
  else scanCopy(files);
}

// Run as a script, not on import (the unit test imports the extractors directly).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
