// cairn-cms: the visuals gate for the published docs' diagram-and-image contract (the "Visuals"
// section of docs/internal/docs-register.md). It checks only the mechanical, authored-source
// half of that contract: every mermaid fence carries mermaid's own `accTitle:`/`accDescr:`
// directives and is immediately followed by an emphasis-paragraph caption (`*...*`), and every
// markdown image carries real alt text no longer than 150 characters (a deliberately decorative
// image is authored as HTML `<img alt="" ...>` instead, which this gate never flags). Containment
// at narrow widths and the SVG's rendered accessible name are runtime properties this gate cannot
// see; they belong to cairn-pub's themed render, per the diagram-pages plan.
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// The four published arms plus the front-door index. `docs/internal` is a contributor zone with
// its own filing rules, not a published arm, so it stays out of this gate the same way it stays
// out of the reader-facing register.
const SCAN_DIRS = ['docs/admin', 'docs/editors', 'docs/extend', 'docs/reference'];
const INDEX_FILES = ['docs/README.md'];

const SKIP_DIRS = new Set(['__snapshots__', 'snapshots']);

const MAX_ALT_LENGTH = 150;

// A fenced code block's language tag and body. `$` (multiline) anchors the closing fence to its
// own line, so this never matches a fence nested inside a blockquote or list indent; none of the
// scanned trees currently indent a fence, and an indented one is a shape this gate does not claim
// to cover.
const FENCE_RE = /^```([\w-]*)\n([\s\S]*?)\n```[ \t]*$/gm;

// An inline code span, single backticks only. Good enough to keep a documentation example like
// `` `![alt](media:slug.hash)` `` out of the image scan; a double-backtick span escaping a literal
// backtick does not appear in this corpus.
const CODE_SPAN_RE = /`[^`\n]*`/g;

const MD_IMAGE_RE = /!\[([^\]]*)\]\(([^)]*)\)/g;
const HTML_IMG_ALT_RE = /<img\b[^>]*\balt="([^"]*)"[^>]*>/gi;

/**
 * `text` with every fenced code block and inline code span blanked to spaces (newlines kept), so
 * a documented example of image syntax never reads as an authored image. Mermaid fences are
 * blanked here too; `mermaidFences` reads them separately, before this stripping runs.
 * @param {string} text
 */
export function stripCodeRegions(text) {
  const blank = (/** @type {string} */ s) => s.replace(/[^\n]/g, ' ');
  return text.replace(FENCE_RE, blank).replace(CODE_SPAN_RE, blank);
}

/**
 * True when `paragraph` (already isolated as one caption's raw lines) is the emphasis-paragraph
 * form the register requires: wrapped in single asterisks, not the doubled-asterisk (bold) form,
 * with real content between them.
 * @param {string} paragraph
 */
export function isEmphasisCaption(paragraph) {
  const t = paragraph.trim();
  return /^\*(?!\*)[\s\S]*(?<!\*)\*$/.test(t) && t.length > 2;
}

/**
 * The raw text of the first paragraph after `fromIndex`: leading blank lines are skipped, then
 * contiguous non-blank lines up to the next blank line (or end of text) are joined with `\n`.
 * `null` when only blank lines or nothing follow.
 * @param {string} text
 * @param {number} fromIndex
 */
export function nextParagraphAfter(text, fromIndex) {
  const lines = text.slice(fromIndex).split('\n');
  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i++;
  if (i >= lines.length) return null;
  const para = [];
  while (i < lines.length && lines[i].trim() !== '') para.push(lines[i++]);
  return para.join('\n');
}

/**
 * Every mermaid fence in `text`, each carrying its body and the index just past its closing
 * fence line, so a caller can locate the caption paragraph that must follow it.
 * @param {string} text
 */
export function mermaidFences(text) {
  const fences = [];
  FENCE_RE.lastIndex = 0;
  let m;
  while ((m = FENCE_RE.exec(text))) {
    const [full, lang, body] = m;
    if (lang === 'mermaid') fences.push({ body, endIndex: m.index + full.length });
  }
  return fences;
}

/**
 * The mermaid-authoring-convention violations in one fence: a missing `accTitle:` or `accDescr:`
 * directive, or a following caption that is absent or not the emphasis-paragraph form.
 * @param {string} file Repo-relative path, carried only to label a violation.
 * @param {{ body: string, endIndex: number }} fence
 * @param {string} text The full document `fence` came from, to read what follows it.
 */
export function fenceViolations(file, fence, text) {
  const problems = [];
  if (!/^\s*accTitle:\s*\S/m.test(fence.body)) {
    problems.push({ file, kind: 'missing-acctitle', message: `${file}: mermaid fence missing accTitle:` });
  }
  if (!/^\s*accDescr:\s*\S/m.test(fence.body)) {
    problems.push({ file, kind: 'missing-accdescr', message: `${file}: mermaid fence missing accDescr:` });
  }
  const caption = nextParagraphAfter(text, fence.endIndex);
  if (caption === null || !isEmphasisCaption(caption)) {
    problems.push({
      file,
      kind: 'missing-caption',
      message: `${file}: mermaid fence has no emphasis-paragraph caption (*...*) as the next line after it`,
    });
  }
  return problems;
}

/**
 * One document's full scan: every mermaid-fence and image violation, plus how many diagrams and
 * images it carries, so a caller can print scanned/found counts even on a clean run.
 * @param {string} file Repo-relative path, carried only to label a violation.
 * @param {string} text
 */
export function scanDocument(file, text) {
  const fences = mermaidFences(text);
  const violations = fences.flatMap((fence) => fenceViolations(file, fence, text));

  const scanText = stripCodeRegions(text);
  let imageCount = 0;

  MD_IMAGE_RE.lastIndex = 0;
  let m;
  while ((m = MD_IMAGE_RE.exec(scanText))) {
    imageCount++;
    const alt = m[1];
    if (alt.trim() === '') {
      violations.push({
        file,
        kind: 'empty-alt',
        message: `${file}: markdown image has empty alt text (a deliberate decorative image is HTML <img alt="">)`,
      });
    } else if (alt.length > MAX_ALT_LENGTH) {
      violations.push({
        file,
        kind: 'alt-too-long',
        message: `${file}: image alt text is ${alt.length} characters, over the ${MAX_ALT_LENGTH}-character limit`,
      });
    }
  }

  HTML_IMG_ALT_RE.lastIndex = 0;
  while ((m = HTML_IMG_ALT_RE.exec(scanText))) {
    imageCount++;
    const alt = m[1];
    if (alt.length > MAX_ALT_LENGTH) {
      violations.push({
        file,
        kind: 'alt-too-long',
        message: `${file}: image alt text is ${alt.length} characters, over the ${MAX_ALT_LENGTH}-character limit`,
      });
    }
  }

  return { violations, diagramCount: fences.length, imageCount };
}

/**
 * Every `.md` file under `dir`, recursively, skipping SKIP_DIRS.
 * @param {string} dir
 * @returns {string[]}
 */
function walkMarkdown(dir) {
  /** @type {string[]} */
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkMarkdown(full));
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

/**
 * The full corpus scan: every scanned file's violations, plus the total files/diagrams/images
 * counted, so `main` can print a scanned/found summary line even when a run is clean or vacuous.
 * @param {string} root
 */
export function scanTree(root = ROOT) {
  const files = SCAN_DIRS.flatMap((dir) => walkMarkdown(join(root, dir)));
  for (const indexFile of INDEX_FILES) files.push(join(root, indexFile));

  const violations = [];
  let diagrams = 0;
  let images = 0;
  for (const abs of files) {
    const file = relative(root, abs);
    const { violations: v, diagramCount, imageCount } = scanDocument(file, readFileSync(abs, 'utf8'));
    violations.push(...v);
    diagrams += diagramCount;
    images += imageCount;
  }
  return { filesScanned: files.length, diagrams, images, violations };
}

function main() {
  const { filesScanned, diagrams, images, violations } = scanTree();
  // Printed unconditionally, clean run or not, so a scan that finds zero visuals in a tree
  // expected to carry them is visible in the log rather than silently indistinguishable from OK.
  console.log(`check-visuals: scanned ${filesScanned} file(s), found ${diagrams} diagram(s) and ${images} image(s)`);
  if (violations.length === 0) {
    console.log('check-visuals: OK');
    return;
  }
  console.error(`check-visuals: ${violations.length} violation(s)`);
  for (const v of violations) console.error(`  ${v.message}`);
  process.exitCode = 1;
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) main();
