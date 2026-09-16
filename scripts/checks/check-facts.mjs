// cairn-cms: the facts container gate. docs/internal/facts/README.md defines the grammar a fact
// bullet follows (one Source, one vocabulary tag at the end, in colon-qualifier form) and, until
// this script existed, review was the only thing enforcing it. This walks every arm file and
// fails on the first grammar violation, replacing the README's old hand-maintained index table
// with the per-file tag counts this script prints on success.
//
// README.md itself is excluded from the walk: it documents the grammar in prose, with example
// tags shown in backtick code spans (`` `[verified]` ``, `` `[docs-drift: page says "..."]` ``),
// not fact bullets of its own, so scanning it as a fact file produces only false positives.
//
// A bullet's line can soft-wrap across several markdown source lines (the container's own
// authoring convention keeps lines under roughly 100 columns); a bullet is every line from one
// `- ` at column 0 up to (not including) the next such line, a blank line, or a heading, joined
// with single spaces. Two headings are allowlisted and skipped entirely, per the README's "Fact
// format" section: `## Harvest record` and `## Provenance`.
//
// A bullet's tag is found by scanning for a vocabulary word inside square brackets, OUTSIDE any
// backtick code span or double-quoted span; a real fact bullet routinely carries brackets that
// are not tags at all (an array literal like `['media', 'vocabulary']`, a bot suffix like
// `cairn-cms[bot]`, a SvelteKit catch-all route segment like `[...path]`), and those all appear
// inside a code span or a quoted anchor, which is why they are stripped before the bracket scan
// runs rather than excluded by a vocabulary allowlist alone (a stray, non-code bracket outside
// the trailing tag is still a real grammar violation the gate should catch).
//
// A `path:line` or `path:line-line` pointer inside the bullet's `Source:` field is resolved two
// ways: first as a literal path from the repo root, then, when that fails and the pointer names
// no directory at all (a bare filename, the container's shorthand for "the file just named
// above, in the same directory" that this gate does not attempt to track), as a unique basename
// match anywhere under the repo (excluding `node_modules`, build output, and VCS/tooling
// directories). A pointer whose basename is not unique fails rather than guessing.
//
// A pointer that carries a quoted anchor (a backtick-quoted snippet in parens right after the
// pointer) is checked against a WINDOW around the cited line range, not the exact line: this
// container's own anchors are frequently a paraphrase or an elided quote of a multi-line block
// (an ellipsis `...` standing in for omitted code), and an occasional citation lands a few lines
// off the token it names, so per-line exact matching produces false positives against real,
// reviewed facts. The window is the cited range expanded by 10 lines on each side (clamped to the
// file); checking that every identifier-shaped token (3+ word characters) the anchor names
// appears somewhere in that window is a weaker proof than per-line verification, but it is the
// level this container's authored style actually supports, and it still catches an anchor naming
// a symbol nowhere near the cited line (measured against every anchored pointer in the real
// container: a whole-file check passed all of them, a window this size caught the two whose
// citation had drifted a full function away).
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRoot } from '../repo-root.mjs';

const ROOT = repoRoot(import.meta.url);
const FACTS_DIR = join(ROOT, 'docs/internal/facts');

/** Section headings whose bullets carry no Source/tag requirement. */
const SKIPPED_SECTIONS = new Set(['harvest record', 'provenance']);

/** The full status-tag vocabulary, in the order the README lists it. */
export const TAG_VOCABULARY = ['verified', 'docs-drift', 'external', 'vendor', 'candidate', 'rejected'];

const TAG_RE = new RegExp('\\[(' + TAG_VOCABULARY.join('|') + ')\\b[^\\]]*\\]', 'g');
const ANY_BRACKET_TAG_RE = /\[([a-zA-Z-]+)(:[^\]]*)?\]/g;

/** Lines on each side of a pointer's cited range an anchor's tokens may fall within. */
const ANCHOR_WINDOW = 10;

const EXCLUDED_DIRS = new Set([
  'node_modules',
  'dist',
  '.svelte-kit',
  '.git',
  '.claude',
  'coverage',
  '.cache',
]);

/**
 * One fact bullet extracted from an arm file: its section heading, its fully joined text (soft
 * wraps collapsed to single spaces), and the source line its `- ` marker started on.
 * @typedef {{ section: string | null, text: string, line: number }} Bullet
 */

/**
 * Every bullet in a facts arm file, joined across soft-wrapped continuation lines, with the
 * section heading each bullet falls under. A continuation line is any non-blank, non-bullet,
 * non-heading line that follows an open bullet.
 * @param {string} markdown
 * @returns {Bullet[]}
 */
export function extractBullets(markdown) {
  const lines = markdown.split('\n');
  /** @type {Bullet[]} */
  const bullets = [];
  /** @type {string | null} */
  let current = null;
  let startLine = 0;
  /** @type {string | null} */
  let section = null;
  const flush = () => {
    if (current !== null) bullets.push({ section, text: current, line: startLine });
    current = null;
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('## ')) {
      flush();
      section = line.slice(3).trim();
      continue;
    }
    if (line.startsWith('- ')) {
      flush();
      current = line.slice(2);
      startLine = i + 1;
      continue;
    }
    if (line.trim().length === 0) {
      flush();
      continue;
    }
    if (current !== null) current += ' ' + line.trim();
  }
  flush();
  return bullets;
}

/**
 * Strip every backtick code span and double-quoted span from a bullet's text, replacing each
 * with a same-length run of `x` so a defect's reported column position still lines up with the
 * original text. Used before the bracket-outside-code scan, since a code span or a quoted
 * anchor routinely carries a bracket (`cairn-cms[bot]`, `['media']`, `[...path]`) that is not a
 * status tag.
 * @param {string} text
 * @returns {string}
 */
export function maskCodeAndQuotedSpans(text) {
  return text.replace(/`[^`]*`|"[^"]*"/g, (m) => 'x'.repeat(m.length));
}

/**
 * @typedef {{ ok: true, tag: string } | { ok: false, reason: string }} TagCheck
 */

/**
 * Validate a bullet's status tag: exactly one vocabulary tag, at the very end of the bullet, in
 * colon-qualifier form, with no other bracket outside a code span or quoted span anywhere else
 * in the bullet.
 * @param {string} bulletText
 * @returns {TagCheck}
 */
export function checkTag(bulletText) {
  const masked = maskCodeAndQuotedSpans(bulletText);
  const matches = [...masked.matchAll(TAG_RE)];
  if (matches.length === 0) {
    const anyTag = [...masked.matchAll(ANY_BRACKET_TAG_RE)];
    const trailing = anyTag[anyTag.length - 1];
    if (trailing && trailing.index + trailing[0].length >= masked.trimEnd().length) {
      return { ok: false, reason: `tag outside vocabulary: got "[${trailing[1]}${trailing[2] ?? ''}]"` };
    }
    return { ok: false, reason: 'missing a status tag from the vocabulary' };
  }
  if (matches.length > 1) {
    return { ok: false, reason: `${matches.length} status tags found, want exactly one` };
  }
  const match = matches[0];
  const end = match.index + match[0].length;
  if (masked.slice(end).trim().length > 0) {
    return { ok: false, reason: 'the status tag is not the last thing on the bullet' };
  }
  const tagName = match[1];
  const qualifier = match[0].slice(1 + tagName.length, -1);
  if (qualifier.length > 0 && !qualifier.startsWith(':')) {
    return { ok: false, reason: `tag "[${tagName}...]" uses a space qualifier; use the colon form "[${tagName}: ...]"` };
  }
  // A stray bracket earlier in the bullet, outside code/quoted spans, is a second tag-shaped
  // bracket even when it is not itself a vocabulary word (a malformed or out-of-vocabulary tag
  // placed mid-bullet rather than at the end).
  const strayBrackets = [...masked.slice(0, match.index).matchAll(/\[/g)];
  if (strayBrackets.length > 0) {
    return { ok: false, reason: 'a second bracket appears before the trailing status tag' };
  }
  return { ok: true, tag: tagName };
}

/**
 * Every basename in the repo tree, excluding build output, dependencies, and VCS/tooling
 * directories, mapped to the list of repo-relative paths carrying that basename. Built once and
 * reused across every pointer in a check-facts run.
 * @param {string} root
 * @returns {Map<string, string[]>}
 */
export function buildBasenameIndex(root) {
  /** @type {Map<string, string[]>} */
  const index = new Map();
  /** @param {string} dir */
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      if (EXCLUDED_DIRS.has(name)) continue;
      const full = join(dir, name);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        walk(full);
        continue;
      }
      const rel = full.slice(root.length + 1);
      const list = index.get(name);
      if (list) list.push(rel);
      else index.set(name, [rel]);
    }
  };
  walk(root);
  return index;
}

/**
 * Resolve a `Source:` pointer's path against the repo root: a literal path first, then, ONLY
 * when the pointer names no directory of its own (a bare filename), a unique basename match. A
 * pointer that does carry a directory and does not exist there fails outright rather than
 * falling back: the basename fallback exists for the container's bare-filename shorthand ("the
 * file just named above, in the same directory"), not to rescue a stale, fully-qualified path
 * whose basename happens to have relocated elsewhere in the repo under a same-named file.
 * @param {string} pointerPath
 * @param {string} root
 * @param {Map<string, string[]>} basenameIndex
 * @returns {string | null}
 */
export function resolvePointerPath(pointerPath, root, basenameIndex) {
  if (existsSync(join(root, pointerPath))) return pointerPath;
  if (pointerPath.includes('/')) return null;
  const matches = basenameIndex.get(pointerPath);
  if (matches && matches.length === 1) return matches[0];
  return null;
}

/**
 * @typedef {{ path: string, lineSpec: string, anchor: string | null, index: number }} Pointer
 */

// A backtick-quoted `path:line[,line|-line]...` pointer, path carrying a recognized source
// extension, optionally followed by a backtick-quoted anchor snippet in parens.
const POINTER_RE =
  /`([A-Za-z0-9_.\/-]+\.(?:ts|js|mjs|cjs|mts|svelte|css|json|sql|ya?ml|md))((?::\d+(?:-\d+)?)(?:,\d+(?:-\d+)?)*)`(?:\s*\(`([^`]*)`\))?/g;

/**
 * Every `path:line` style pointer inside a bullet's `Source:` field.
 * @param {string} sourceField
 * @returns {Pointer[]}
 */
export function extractPointers(sourceField) {
  const pointers = [];
  for (const m of sourceField.matchAll(POINTER_RE)) {
    pointers.push({ path: m[1], lineSpec: m[2].slice(1), anchor: m[3] ?? null, index: m.index });
  }
  return pointers;
}

/**
 * Every individual line number a pointer's line spec names, ranges expanded.
 * @param {string} lineSpec `"22,63"` or `"296-297"` or `"22"`.
 * @returns {number[]}
 */
function expandLineSpec(lineSpec) {
  const lines = [];
  for (const part of lineSpec.split(',')) {
    const [start, end] = part.split('-').map(Number);
    const last = end ?? start;
    for (let n = start; n <= last; n++) lines.push(n);
  }
  return lines;
}

/**
 * Identifier-shaped tokens (3+ word characters) in an anchor snippet, the unit the file-wide
 * anchor check requires each to appear in the resolved file.
 * @param {string} anchor
 * @returns {string[]}
 */
function anchorTokens(anchor) {
  return [...anchor.matchAll(/[A-Za-z_][A-Za-z0-9_]{2,}/g)].map((m) => m[0]);
}

/**
 * @typedef {{ verified: number, 'docs-drift': number, external: number, vendor: number,
 *   candidate: number, rejected: number }} TagCounts
 */

/** A fresh, zeroed tag-count record. @returns {TagCounts} */
function emptyCounts() {
  return { verified: 0, 'docs-drift': 0, external: 0, vendor: 0, candidate: 0, rejected: 0 };
}

/**
 * The lines a pointer's anchor is allowed to match against: the cited range expanded by
 * `ANCHOR_WINDOW` lines on each side, clamped to the file.
 * @param {number[]} citedLines
 * @param {number} fileLineCount
 * @returns {[number, number]} A 1-indexed, inclusive `[start, end]` pair.
 */
function anchorWindow(citedLines, fileLineCount) {
  const start = Math.max(1, Math.min(...citedLines) - ANCHOR_WINDOW);
  const end = Math.min(fileLineCount, Math.max(...citedLines) + ANCHOR_WINDOW);
  return [start, end];
}

/**
 * Validate one `Source:` pointer: its path resolves, every cited line is in range, and, when it
 * carries an anchor, every anchor token appears within the anchor window. Returns the one defect
 * string this pointer produces, or `null` when it is clean.
 * @param {Pointer} pointer
 * @param {string} root
 * @param {Map<string, string[]>} basenameIndex
 * @returns {string | null}
 */
function validatePointer(pointer, root, basenameIndex) {
  const resolved = resolvePointerPath(pointer.path, root, basenameIndex);
  if (!resolved) return `unresolved path "${pointer.path}"`;

  const fileLines = readFileSync(join(root, resolved), 'utf8').split('\n');
  const citedLines = expandLineSpec(pointer.lineSpec);
  const outOfRange = citedLines.some((n) => n < 1 || n > fileLines.length);
  if (outOfRange) {
    return `"${pointer.path}:${pointer.lineSpec}" is out of range (file has ${fileLines.length} lines)`;
  }

  if (!pointer.anchor) return null;
  const [windowStart, windowEnd] = anchorWindow(citedLines, fileLines.length);
  const window = fileLines.slice(windowStart - 1, windowEnd).join('\n');
  const missing = anchorTokens(pointer.anchor).filter((t) => !window.includes(t));
  if (missing.length === 0) return null;
  return `anchor for "${pointer.path}:${pointer.lineSpec}" names ${JSON.stringify(missing)}, not found within ${ANCHOR_WINDOW} lines of the cited range`;
}

/**
 * Validate one bullet's grammar and, for a `[verified]`/`[docs-drift]`/etc. bullet, every
 * `Source:` pointer it carries. Returns the defects found (empty when the bullet is clean) and,
 * when the tag itself was valid, the tag name for the caller's running count.
 * @param {Bullet} bullet
 * @param {string} root
 * @param {Map<string, string[]>} basenameIndex
 * @returns {{ defects: string[], tag: string | null }}
 */
export function validateBullet(bullet, root, basenameIndex) {
  /** @type {string[]} */
  const defects = [];
  if (!bullet.text.includes('Source:')) {
    defects.push('missing "Source:"');
  }
  const tagCheck = checkTag(bullet.text);
  if (!tagCheck.ok) defects.push(tagCheck.reason);

  const sourceIdx = bullet.text.indexOf('Source:');
  if (sourceIdx !== -1) {
    const sourceField = bullet.text.slice(sourceIdx);
    for (const pointer of extractPointers(sourceField)) {
      const defect = validatePointer(pointer, root, basenameIndex);
      if (defect) defects.push(defect);
    }
  }

  return { defects, tag: tagCheck.ok ? tagCheck.tag : null };
}

/**
 * Every fact arm file this gate walks: `docs/internal/facts/*.md`, excluding `README.md` (the
 * grammar document itself, not a fact file).
 * @param {string} factsDir
 * @returns {string[]}
 */
export function factsFiles(factsDir) {
  return readdirSync(factsDir)
    .filter((name) => name.endsWith('.md') && name !== 'README.md')
    .sort();
}

/**
 * A tag-count record as one line: `verified 66, candidate 12` (a zero-count tag is omitted).
 * @param {TagCounts} counts
 * @returns {string}
 */
function formatCounts(counts) {
  return Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([tag, n]) => `${tag} ${n}`)
    .join(', ');
}

function main() {
  const basenameIndex = buildBasenameIndex(ROOT);
  const files = factsFiles(FACTS_DIR);
  /** @type {string[]} */
  const allDefects = [];
  const report = [];
  for (const file of files) {
    const markdown = readFileSync(join(FACTS_DIR, file), 'utf8');
    const bullets = extractBullets(markdown).filter(
      (b) => !SKIPPED_SECTIONS.has((b.section ?? '').trim().toLowerCase()),
    );
    const counts = emptyCounts();
    for (const bullet of bullets) {
      const { defects, tag } = validateBullet(bullet, ROOT, basenameIndex);
      if (tag) counts[/** @type {keyof TagCounts} */ (tag)]++;
      for (const defect of defects) {
        allDefects.push(`docs/internal/facts/${file}:${bullet.line}: ${defect}`);
      }
    }
    report.push(`  ${file}: ${bullets.length} facts (${formatCounts(counts)})`);
  }

  if (allDefects.length === 0) {
    console.log('check-facts: OK');
    console.log(report.join('\n'));
    return;
  }
  console.error(`check-facts: ${allDefects.length} defect(s)\n`);
  for (const defect of allDefects) console.error(`  ${defect}`);
  process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
