// cairn-cms: the visuals gate for the published docs' diagram-and-image contract (the "Visuals"
// section of docs/internal/docs-register.md). It checks the mechanical, authored-source half of
// that contract: every mermaid fence carries mermaid's own `accTitle:`/`accDescr:` directives and
// is immediately followed by an emphasis-paragraph caption (`*...*`); every markdown image carries
// real alt text no longer than 150 characters (a deliberately decorative image is authored as HTML
// `<img alt="" ...>` instead, which this gate never flags); and every `repro` fence (the
// live-reproduction seam) satisfies the spec's gate 1: `validateReproFence` against the installed
// manifest, plus a page-prose check no fence-body validator can make on its own, that a marked
// story's numbered callouts are matched by a keyed list of the same length right after the fence.
// A `repro` fence carries its caption INSIDE the YAML body (a mermaid caption is the emphasis
// paragraph after the fence), so the two fence kinds read their captions from different places.
// Containment at narrow widths and a rendered accessible name are runtime properties this gate
// cannot see; they belong to cairn-pub's themed render and browser probe.
//
// `scanDocument`/`scanTree` take the manifest and `validateReproFence` as parameters rather than
// importing them at module scope: the validator compiles from TypeScript under NodeNext `.js`
// specifiers a plain `node` invocation cannot resolve against source (`check-skill-budget.mjs`
// documents the same constraint), so only `main()` (the CLI entry point, run after `npm run
// package`) imports the built `dist/reproductions/manifest.js`. A caller that already has both in
// hand (a test, importing straight from source under vitest) can call the scan functions directly.
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// The four published arms plus the front-door index. `docs/internal` is a contributor zone with
// its own filing rules, not a published arm, so it stays out of this gate the same way it stays
// out of the reader-facing register.
const SCAN_DIRS = ['docs/admin', 'docs/editors', 'docs/extend', 'docs/reference'];
const INDEX_FILES = ['docs/README.md'];

// Directory names skipped while walking an arm, since they hold generated or fixture output
// rather than published pages.
const SKIP_DIRS = new Set(['__snapshots__', 'snapshots']);

// The register's alt-text ceiling: "At most 150 characters."
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

// Spaces, not deletion: a blanked region keeps the document's line and column geometry, so an
// offset into the stripped text still points at the same place in the original.
/** @param {string} region */
function blankKeepingLines(region) {
  return region.replace(/[^\n]/g, ' ');
}

/**
 * `text` with every fenced code block and inline code span blanked to spaces (newlines kept), so
 * a documented example of image syntax never reads as an authored image. Mermaid fences are
 * blanked here too; `mermaidFences` reads them separately, before this stripping runs.
 * @param {string} text
 */
export function stripCodeRegions(text) {
  return text.replace(FENCE_RE, blankKeepingLines).replace(CODE_SPAN_RE, blankKeepingLines);
}

/**
 * True when `paragraph` (already isolated as one caption's raw lines) is the emphasis-paragraph
 * form the register requires: wrapped in single asterisks, not the doubled-asterisk (bold) form,
 * with real content between them.
 * @param {string} paragraph
 */
export function isEmphasisCaption(paragraph) {
  const trimmed = paragraph.trim();
  return /^\*(?!\*)[\s\S]*(?<!\*)\*$/.test(trimmed) && trimmed.length > 2;
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
  const start = lines.findIndex((line) => line.trim() !== '');
  if (start === -1) return null;
  let end = start;
  while (end < lines.length && lines[end].trim() !== '') end++;
  return lines.slice(start, end).join('\n');
}

/**
 * Every mermaid fence in `text`, each carrying its body and the index just past its closing
 * fence line, so a caller can locate the caption paragraph that must follow it.
 * @param {string} text
 */
export function mermaidFences(text) {
  const fences = [];
  for (const match of text.matchAll(FENCE_RE)) {
    const [full, lang, body] = match;
    if (lang === 'mermaid') fences.push({ body, endIndex: match.index + full.length });
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
 * Every `repro` fence in `text`, each carrying its raw body and the index just past its closing
 * fence line, so a caller can locate the keyed list that must follow a marked story's fence.
 * @param {string} text
 */
export function reproFences(text) {
  const fences = [];
  for (const match of text.matchAll(FENCE_RE)) {
    const [full, lang, body] = match;
    if (lang === 'repro') fences.push({ body, endIndex: match.index + full.length });
  }
  return fences;
}

// A markdown ordered- or unordered-list item's leading marker, one item per line: no established
// authored corpus fixes a wrapped-item convention yet (no shipped docs page carries a `repro`
// fence during this plan), so this gate holds to the simplest testable form, one list item per
// line, immediately following the fence with no intervening prose.
const LIST_ITEM_RE = /^\s*(?:[-*+]|\d+\.)\s+\S/;

/**
 * The number of contiguous markdown list items starting at the first non-blank line after
 * `fromIndex`, or `null` when that line is not a list item at all (no keyed list follows).
 * @param {string} text
 * @param {number} fromIndex
 */
export function nextListItemCount(text, fromIndex) {
  const lines = text.slice(fromIndex).split('\n');
  const start = lines.findIndex((line) => line.trim() !== '');
  if (start === -1 || !LIST_ITEM_RE.test(lines[start])) return null;
  let count = 0;
  let i = start;
  while (i < lines.length && LIST_ITEM_RE.test(lines[i])) {
    count++;
    i++;
  }
  return count;
}

/**
 * The violations in one `repro` fence: every issue `validateReproFence` finds against the
 * installed manifest, plus (for a well-formed fence naming a marked story) a page-prose check the
 * validator cannot make on its own, that the keyed list right after the fence carries exactly as
 * many items as the story declares marker keys.
 * @param {string} file Repo-relative path, carried only to label a violation.
 * @param {{ body: string, endIndex: number }} fence
 * @param {string} text The full document `fence` came from, to read what follows it.
 * @param {import('../../src/lib/reproductions/manifest.js').ReproManifestEntry[]} manifest
 * @param {typeof import('../../src/lib/reproductions/manifest.js').validateReproFence} validateFence
 */
export function reproFenceViolations(file, fence, text, manifest, validateFence) {
  const { issues } = validateFence(fence.body, manifest);
  if (issues.length > 0) {
    return issues.map((issue) => ({
      file,
      kind: 'repro-invalid',
      message: `${file}: repro fence: ${issue}`,
    }));
  }

  // Re-parsing here is safe: validateFence already proved the body is well-formed YAML naming a
  // real story, so this cannot throw or resolve to an unknown id.
  const { story } = parseYaml(fence.body);
  const entry = manifest.find((candidate) => candidate.id === story);
  if (!entry || entry.markerKeys.length === 0) return [];

  const count = nextListItemCount(text, fence.endIndex);
  if (count === null) {
    return [
      {
        file,
        kind: 'repro-marker-count',
        message: `${file}: repro fence for "${entry.id}" declares ${entry.markerKeys.length} marker(s) but no keyed list follows it`,
      },
    ];
  }
  if (count !== entry.markerKeys.length) {
    return [
      {
        file,
        kind: 'repro-marker-count',
        message: `${file}: repro fence for "${entry.id}" declares ${entry.markerKeys.length} marker(s) but the page's keyed list has ${count}`,
      },
    ];
  }
  return [];
}

/**
 * The alt-text violations for one image: alt that is absent (or blank) where the register demands
 * real text, or alt over the length ceiling.
 * @param {string} file Repo-relative path, carried only to label a violation.
 * @param {string} alt
 * @param {'markdown' | 'html'} form Which spelling carried the image. Only the HTML form may
 *   leave alt empty, since that is how the register has an author mark an image decorative.
 */
function altViolations(file, alt, form) {
  if (form === 'markdown' && alt.trim() === '') {
    return [{
      file,
      kind: 'empty-alt',
      message: `${file}: markdown image has empty alt text (a deliberate decorative image is HTML <img alt="">)`,
    }];
  }
  if (alt.length > MAX_ALT_LENGTH) {
    return [{
      file,
      kind: 'alt-too-long',
      message: `${file}: image alt text is ${alt.length} characters, over the ${MAX_ALT_LENGTH}-character limit`,
    }];
  }
  return [];
}

/**
 * One document's full scan: every mermaid-fence, repro-fence, and image violation, plus how many
 * diagrams, repros, and images it carries, so a caller can print scanned/found counts even on a
 * clean run. `manifest` and `validateFence` are needed only when the document carries a `repro`
 * fence; a caller that knows a tree carries none may omit them.
 * @param {string} file Repo-relative path, carried only to label a violation.
 * @param {string} text
 * @param {import('../../src/lib/reproductions/manifest.js').ReproManifestEntry[]} [manifest]
 * @param {typeof import('../../src/lib/reproductions/manifest.js').validateReproFence} [validateFence]
 */
export function scanDocument(file, text, manifest = [], validateFence) {
  const fences = mermaidFences(text);
  const violations = fences.flatMap((fence) => fenceViolations(file, fence, text));

  const repros = reproFences(text);
  if (repros.length > 0) {
    if (!validateFence) {
      throw new Error('scanDocument: a repro fence is present but no validateFence was supplied');
    }
    for (const fence of repros) {
      violations.push(...reproFenceViolations(file, fence, text, manifest, validateFence));
    }
  }

  const scanText = stripCodeRegions(text);
  let imageCount = 0;
  for (const [, alt] of scanText.matchAll(MD_IMAGE_RE)) {
    imageCount++;
    violations.push(...altViolations(file, alt, 'markdown'));
  }
  for (const [, alt] of scanText.matchAll(HTML_IMG_ALT_RE)) {
    imageCount++;
    violations.push(...altViolations(file, alt, 'html'));
  }

  return { violations, diagramCount: fences.length, reproCount: repros.length, imageCount };
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
 * The full corpus scan: every scanned file's violations, plus the total files/diagrams/repros/
 * images counted, so `main` can print a scanned/found summary line even when a run is clean or
 * vacuous.
 * @param {string} root
 * @param {import('../../src/lib/reproductions/manifest.js').ReproManifestEntry[]} [manifest]
 * @param {typeof import('../../src/lib/reproductions/manifest.js').validateReproFence} [validateFence]
 */
export function scanTree(root = ROOT, manifest = [], validateFence) {
  const files = SCAN_DIRS.flatMap((dir) => walkMarkdown(join(root, dir)));
  for (const indexFile of INDEX_FILES) files.push(join(root, indexFile));

  const violations = [];
  let diagrams = 0;
  let repros = 0;
  let images = 0;
  for (const abs of files) {
    const file = relative(root, abs);
    const { violations: v, diagramCount, reproCount, imageCount } = scanDocument(
      file,
      readFileSync(abs, 'utf8'),
      manifest,
      validateFence,
    );
    violations.push(...v);
    diagrams += diagramCount;
    repros += reproCount;
    images += imageCount;
  }
  return { filesScanned: files.length, diagrams, repros, images, violations };
}

async function main() {
  // The validator compiles from TypeScript under NodeNext `.js` specifiers a plain `node`
  // invocation cannot resolve against source, so this loads the packaged dist build; `npm run
  // check:visuals` runs `npm run package` first.
  const { manifest, validateReproFence } = await import(
    `file://${resolve(ROOT, 'dist/reproductions/manifest.js')}`
  );
  const { filesScanned, diagrams, repros, images, violations } = scanTree(ROOT, manifest, validateReproFence);
  // Printed unconditionally, clean run or not, so a scan that finds zero visuals in a tree
  // expected to carry them is visible in the log rather than silently indistinguishable from OK.
  console.log(
    `check-visuals: scanned ${filesScanned} file(s), found ${diagrams} diagram(s), ${repros} repro(s), and ${images} image(s)`,
  );
  if (violations.length === 0) {
    console.log('check-visuals: OK');
    return;
  }
  console.error(`check-visuals: ${violations.length} violation(s)`);
  for (const v of violations) console.error(`  ${v.message}`);
  process.exitCode = 1;
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
