/**
 * Pure markdown selection transforms for the editor toolbar. Each call maps a document and a
 * selection range to a new document and a new selection, with no DOM. The MarkdownEditor view
 * dispatches the result; keeping the logic here lets it unit-test without a browser.
 */
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import { visit } from 'unist-util-visit';
import type { Image, Link, Root, RootContent } from 'mdast';
import type { ContainerDirective } from 'mdast-util-directive';
import { escapeLinkText } from '../content/links.js';
import { parseMediaToken } from '../media/reference.js';

export type FormatKind =
  | 'bold'
  | 'italic'
  | 'code'
  | 'strike'
  | 'h2'
  | 'h3'
  | 'quote'
  | 'ul'
  | 'ol'
  | 'task'
  | 'codeblock'
  | 'hr'
  | 'table'
  | 'link';

export interface FormatResult {
  doc: string;
  from: number;
  to: number;
}

type WrapKind = 'bold' | 'italic' | 'code' | 'strike';
type LineKind = 'h2' | 'h3' | 'quote' | 'ul' | 'ol' | 'task';

const WRAP: Record<WrapKind, string> = { bold: '**', italic: '_', code: '`', strike: '~~' };

/**
 * Per-kind line-prefix behavior. `prefix` builds the marker for the line's 0-based index (only ol
 * varies by line). `exact` matches a line already carrying this kind's own marker; when every
 * selected line matches, the format toggles off. `strip` matches a competing marker to replace
 * before prefixing, so h2 on an h3 line swaps the level instead of stacking. Quote and ul keep
 * their original add-only behavior, so they carry neither regex.
 */
const LINE: Record<LineKind, { prefix: (i: number) => string; exact?: RegExp; strip?: RegExp }> = {
  h2: { prefix: () => '## ', exact: /^## /, strip: /^#{1,6} / },
  h3: { prefix: () => '### ', exact: /^### /, strip: /^#{1,6} / },
  quote: { prefix: () => '> ' },
  ul: { prefix: () => '- ' },
  ol: { prefix: (i) => `${i + 1}. `, exact: /^\d+\. /, strip: /^\d+\. / },
  task: { prefix: () => '- [ ] ', exact: /^- \[[ xX]\] /, strip: /^- \[[ xX]\] / },
};

const TABLE_GRID =
  '| Column 1 | Column 2 |\n| -------- | -------- |\n|          |          |\n|          |          |';

/** Wrap the selection in `marker`, or unwrap when the markers are already there (inside or just
 *  outside the selection). The returned range covers the text without its markers either way. */
function toggleWrap(doc: string, from: number, to: number, marker: string): FormatResult {
  const m = marker.length;
  const sel = doc.slice(from, to);
  if (sel.length >= 2 * m && sel.startsWith(marker) && sel.endsWith(marker)) {
    const inner = sel.slice(m, sel.length - m);
    return { doc: doc.slice(0, from) + inner + doc.slice(to), from, to: to - 2 * m };
  }
  if (from >= m && doc.slice(from - m, from) === marker && doc.slice(to, to + m) === marker) {
    return { doc: doc.slice(0, from - m) + sel + doc.slice(to + m), from: from - m, to: to - m };
  }
  const next = doc.slice(0, from) + marker + sel + marker + doc.slice(to);
  return { doc: next, from: from + m, to: to + m };
}

/** Apply a line-prefix kind to every selected line. When the kind toggles and every line already
 *  carries its marker, the markers come off; otherwise competing markers are replaced and each
 *  line gains the kind's prefix. The selection shifts with the first line's edit and stretches
 *  by the total length change, the same mechanics the original single-prefix version had. */
function applyLinePrefix(doc: string, from: number, to: number, kind: LineKind): FormatResult {
  const { prefix, exact, strip } = LINE[kind];
  const lineStart = doc.lastIndexOf('\n', from - 1) + 1; // 0 when the selection is on the first line
  const lines = doc.slice(lineStart, to).split('\n');
  const next =
    exact && lines.every((line) => exact.test(line))
      ? lines.map((line) => line.replace(exact, ''))
      : lines.map((line, i) => prefix(i) + (strip ? line.replace(strip, '') : line));
  const region = next.join('\n');
  const firstDelta = next[0].length - lines[0].length;
  const totalDelta = region.length - (to - lineStart);
  return {
    doc: doc.slice(0, lineStart) + region + doc.slice(to),
    from: Math.max(lineStart, from + firstDelta),
    to: to + totalDelta,
  };
}

/** Fence the selected lines in triple backticks on their own lines, or remove the fences when the
 *  lines just above and below the selection already are fences. */
function toggleCodeFence(doc: string, from: number, to: number): FormatResult {
  const lineStart = doc.lastIndexOf('\n', from - 1) + 1;
  const lineEndRaw = doc.indexOf('\n', to);
  const lineEnd = lineEndRaw === -1 ? doc.length : lineEndRaw;
  const prevStart = lineStart > 0 ? doc.lastIndexOf('\n', lineStart - 2) + 1 : -1;
  const prevLine = prevStart >= 0 ? doc.slice(prevStart, lineStart - 1) : null;
  const nextEndRaw = lineEnd < doc.length ? doc.indexOf('\n', lineEnd + 1) : -1;
  const nextEnd = nextEndRaw === -1 ? doc.length : nextEndRaw;
  const nextLine = lineEnd < doc.length ? doc.slice(lineEnd + 1, nextEnd) : null;
  if (prevLine === '```' && nextLine === '```') {
    const removedBefore = lineStart - prevStart; // the opening fence line and its newline
    const next = doc.slice(0, prevStart) + doc.slice(lineStart, lineEnd) + doc.slice(nextEnd);
    return { doc: next, from: from - removedBefore, to: to - removedBefore };
  }
  const open = '```\n';
  const next = doc.slice(0, lineStart) + open + doc.slice(lineStart, lineEnd) + '\n```' + doc.slice(lineEnd);
  return { doc: next, from: from + open.length, to: to + open.length };
}

export function applyMarkdownFormat(doc: string, from: number, to: number, kind: FormatKind): FormatResult {
  if (kind === 'bold' || kind === 'italic' || kind === 'code' || kind === 'strike') {
    return toggleWrap(doc, from, to, WRAP[kind]);
  }

  if (kind === 'link') {
    const text = doc.slice(from, to);
    const placeholder = 'url';
    const lead = `[${text}](`; // everything before the url placeholder
    const inserted = `${lead}${placeholder})`;
    const urlStart = from + lead.length;
    return { doc: doc.slice(0, from) + inserted + doc.slice(to), from: urlStart, to: urlStart + placeholder.length };
  }

  if (kind === 'codeblock') return toggleCodeFence(doc, from, to);

  if (kind === 'hr') {
    const inserted = '\n\n---\n\n';
    const at = from + inserted.length;
    return { doc: doc.slice(0, from) + inserted + doc.slice(to), from: at, to: at };
  }

  if (kind === 'table') {
    const inserted = `\n\n${TABLE_GRID}\n\n`;
    const cellStart = from + inserted.indexOf('Column 1');
    return {
      doc: doc.slice(0, from) + inserted + doc.slice(to),
      from: cellStart,
      to: cellStart + 'Column 1'.length,
    };
  }

  return applyLinePrefix(doc, from, to, kind);
}

/**
 * Insert an inline markdown link at the selection. With a non-empty selection the selected text
 * becomes the display text; with an empty selection the title is the display text. The cursor
 * collapses just after the inserted link. Unlike the block insert, this adds no surrounding
 * blank lines, since a link is inline. Pure, so the editor dispatches the result.
 */
export function insertInlineLink(doc: string, from: number, to: number, href: string, title: string): FormatResult {
  const text = from < to ? doc.slice(from, to) : escapeLinkText(title);
  const inserted = `[${text}](${href})`;
  const end = from + inserted.length;
  return { doc: doc.slice(0, from) + inserted + doc.slice(to), from: end, to: end };
}

/**
 * Insert an inline markdown image at the selection. The committed form is `![alt](ref)` where `ref`
 * is the full `media:slug.hash` token. The alt is escaped the way an inline link's title is (the `[`
 * and `]` an author types must not break the image syntax); a selection is replaced rather than
 * wrapped, since an image carries no display text to wrap. The cursor collapses just after the
 * inserted text, and no surrounding blank lines are added, since an image is inline. Pure, so the
 * editor dispatches the result.
 */
export function insertImage(doc: string, from: number, to: number, alt: string, ref: string): FormatResult {
  const inserted = `![${escapeLinkText(alt)}](${ref})`;
  const end = from + inserted.length;
  return { doc: doc.slice(0, from) + inserted + doc.slice(to), from: end, to: end };
}

/** One media image whose alt is empty, located by its source offsets and parsed to its ref parts. */
export interface MediaImageNeedingAlt {
  from: number;
  to: number;
  ref: string;
  slug: string;
  hash: string;
}

/**
 * Scan a markdown body for media images that carry no alt text, the publish-time accessibility debt
 * the edit page counts. The document is parsed with the same remark pipeline unwrapCairnLink uses,
 * so the two agree on what an image is. Each `image` node whose url is a valid `media:` reference and
 * whose alt is empty or whitespace-only is returned with its source offsets and parsed slug and hash.
 * Parsing (not a raw regex) means a `![](media:x)` written inside a code span or fence is not an
 * image node and is correctly ignored, as is an alt-bearing media image and any non-media image (an
 * http or cairn: url). Pure and node-safe, so the edit page derives the live count without a browser.
 * The bare `media:<hash>` form yields an empty slug.
 */
export function findMediaImagesNeedingAlt(doc: string): MediaImageNeedingAlt[] {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(doc);
  const hits: MediaImageNeedingAlt[] = [];
  visit(tree, 'image', (node: Image) => {
    const ref = parseMediaToken(node.url);
    if (!ref) return;
    if ((node.alt ?? '').trim() !== '') return;
    const from = node.position?.start?.offset;
    const to = node.position?.end?.offset;
    if (from == null || to == null) return;
    hits.push({ from, to, ref: node.url, slug: ref.slug ?? '', hash: ref.hash });
  });
  hits.sort((a, b) => a.from - b.from);
  return hits;
}

/** Concatenate a link node's text-child values. The parser has already unescaped them, so a source
 *  `Notes \[draft\]` yields `Notes [draft]`. Used instead of mdast-util-to-string, which is not a
 *  direct dependency. Non-text children (a nested emphasis, say) contribute no value, which is fine
 *  for the picker-produced links this fix targets. */
function linkText(node: Link): string {
  return node.children.map((c) => ('value' in c ? c.value : '')).join('');
}

/**
 * Unwrap every cairn: link whose href is exactly `href`, replacing it with its plain display text.
 * The save guard's one-click fix calls this to drop a broken link while keeping the words. The
 * document is parsed with the same remark pipeline extractCairnLinks uses, so the two agree on what
 * a link is. Each matching link node is located by its source offsets and spliced out from last to
 * first, which leaves the rest of the document exact and unescapes the display text. A token inside
 * a code span or fence is not a link node, so it is never touched, and a link with a different url
 * is left in place.
 */
export function unwrapCairnLink(doc: string, href: string): string {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(doc);
  const spans: { start: number; end: number; text: string }[] = [];
  visit(tree, 'link', (node: Link) => {
    if (node.url !== href) return;
    const start = node.position?.start?.offset;
    const end = node.position?.end?.offset;
    if (start == null || end == null) return;
    spans.push({ start, end, text: linkText(node) });
  });
  spans.sort((a, b) => b.start - a.start);
  let out = doc;
  for (const span of spans) {
    out = out.slice(0, span.start) + span.text + out.slice(span.end);
  }
  return out;
}

/** The closed placement role set the figure render step honors. A role outside it is the measure
 *  default (null), so the control never writes one. Mirrors the set in render/remark-figure.ts. */
export type FigureRole = 'center' | 'wide' | 'full';
const FIGURE_ROLES = new Set<string>(['center', 'wide', 'full']);

/**
 * The media image at a caret, with the enclosing `:::figure` block when there is one. `imageFrom`
 * and `imageTo` are the EXACT source offsets of the inner `![alt](media:slug.hash)` token, so a
 * transform reuses the token byte-for-byte and never reserializes it (open risk 3). `figure` is null
 * for a bare image (not in a figure); otherwise it carries the figure BLOCK's source offsets, the raw
 * caption source the author wrote (inline markdown preserved, the directive-fence escape stripped),
 * and the placement role (or null for the measure default).
 */
export interface FigureAtImage {
  /** The start offset of the inner `![...](media:...)` token. */
  imageFrom: number;
  /** The end offset of the inner `![...](media:...)` token. */
  imageTo: number;
  /** The enclosing figure, or null when the image is bare. */
  figure: {
    /** The figure block's start offset (the `:::figure` opener). */
    from: number;
    /** The figure block's end offset (just past the closing `:::`). */
    to: number;
    /** The raw caption source, inline markdown preserved; empty when the figure has no caption. */
    caption: string;
    /** The placement role, or null for the measure default. */
    role: FigureRole | null;
  } | null;
}

/** Parse a doc with the figure-aware pipeline (the render step's grammar), so the editor transforms
 *  agree with what renders. Container directives need remark-directive on top of the markdown base. */
function parseFigureDoc(doc: string): Root {
  return unified().use(remarkParse).use(remarkGfm).use(remarkDirective).parse(doc) as Root;
}

/** Find the media `image` node whose source range contains `pos`, or whose enclosing figure contains
 *  `pos`, along with its enclosing `figure` directive when there is one. Returns null when `pos` is
 *  not on a media image nor inside a figure that wraps one. */
function locateMediaImage(
  tree: Root,
  pos: number,
): { image: Image; figure: ContainerDirective | null } | null {
  let bareHit: { image: Image; figure: ContainerDirective | null } | null = null;
  let figureHit: { image: Image; figure: ContainerDirective } | null = null;
  // Track the figure ancestor while visiting; unist-util-visit hands the ancestors array last.
  visit(tree, 'image', (node: Image, _index, _parent) => {
    if (!parseMediaToken(node.url)) return;
    const from = node.position?.start?.offset;
    const to = node.position?.end?.offset;
    if (from == null || to == null) return;
    const figure = enclosingFigure(tree, node);
    if (pos >= from && pos <= to) {
      if (figure) figureHit = { image: node, figure };
      else if (!bareHit) bareHit = { image: node, figure: null };
      return;
    }
    // The caret can sit in the caption, off the image token; a media image inside a figure whose
    // block range contains pos still counts as "at" that figure.
    if (figure) {
      const f0 = figure.position?.start?.offset;
      const f1 = figure.position?.end?.offset;
      if (f0 != null && f1 != null && pos >= f0 && pos <= f1 && !figureHit) {
        figureHit = { image: node, figure };
      }
    }
  });
  // A figure hit (the caret on the image or anywhere in its block) wins over a bare hit.
  return figureHit ?? bareHit;
}

/** The `figure`-named container directive that encloses `node`, or null. Walks the tree to find the
 *  ancestor, since unist-util-visit's per-call ancestors are not retained across the traversal. */
function enclosingFigure(tree: Root, target: Image): ContainerDirective | null {
  let found: ContainerDirective | null = null;
  visit(tree, 'containerDirective', (dir: ContainerDirective) => {
    if (dir.name !== 'figure') return;
    let holds = false;
    visit(dir, 'image', (img: Image) => {
      if (img === target) holds = true;
    });
    if (holds) found = dir;
  });
  return found;
}

/** Strip one leading backslash sitting immediately before a colon, the inverse of the fence-escape
 *  wrapImageInFigure/updateFigure apply, so a caption that began with a directive-opening colon run
 *  round-trips to the author's original text. */
function unescapeCaption(raw: string): string {
  return raw.replace(/^\\(?=:)/, '');
}

/** Read the raw caption source from a figure directive: the source span from the first text-bearing
 *  block after the image to the last such block, with internal newlines collapsed to single spaces
 *  (the caption is single-line) and the fence escape stripped. Empty when the figure has no caption. */
function readCaption(doc: string, figure: ContainerDirective, image: Image): string {
  const imageEnd = image.position?.end?.offset ?? -1;
  let from = -1;
  let to = -1;
  for (const child of figure.children) {
    const start = child.position?.start?.offset;
    const end = child.position?.end?.offset;
    if (start == null || end == null) continue;
    if (start < imageEnd) continue; // the image's own paragraph (or anything before it)
    if (!blockHasText(child)) continue;
    if (from === -1) from = start;
    to = end;
  }
  if (from === -1) return '';
  const collapsed = doc.slice(from, to).replace(/\s*\n\s*/g, ' ').trim();
  return unescapeCaption(collapsed);
}

/** Whether a block's subtree carries any non-whitespace text, the caption-candidate test the render
 *  step uses (a bare image paragraph has no text node, so it is never read as a caption). */
function blockHasText(node: RootContent): boolean {
  let found = false;
  visit(node, 'text', (text) => {
    if (text.value.trim() !== '') found = true;
  });
  return found;
}

/**
 * Inspect the media image at caret position `pos`. Returns the image's exact token offsets plus the
 * enclosing `:::figure` block (its range, raw caption, and role) when the image is wrapped, or
 * `figure: null` when it is bare. Returns null when `pos` is not on or in a media image. The parse
 * uses the figure-aware pipeline, so this agrees with what remarkFigure renders. Pure and node-safe.
 */
export function figureAtImage(doc: string, pos: number): FigureAtImage | null {
  const tree = parseFigureDoc(doc);
  const hit = locateMediaImage(tree, pos);
  if (!hit) return null;
  const imageFrom = hit.image.position?.start?.offset;
  const imageTo = hit.image.position?.end?.offset;
  if (imageFrom == null || imageTo == null) return null;
  if (!hit.figure) return { imageFrom, imageTo, figure: null };
  const dir = hit.figure;
  const from = dir.position?.start?.offset;
  const to = dir.position?.end?.offset;
  if (from == null || to == null) return { imageFrom, imageTo, figure: null };
  const className = dir.attributes?.class ?? undefined;
  const role = className && FIGURE_ROLES.has(className) ? (className as FigureRole) : null;
  return { imageFrom, imageTo, figure: { from, to, caption: readCaption(doc, dir, hit.image), role } };
}

/** Sanitize a caption into a single safe body line: collapse internal newlines to single spaces,
 *  trim, and neutralize ONLY the directive-fence hazard (a leading colon would open a directive at
 *  line start) by prefixing one backslash. The author's inline markdown is preserved otherwise, so
 *  emphasis and links survive. figureAtImage strips the backslash on read for a clean round-trip. */
function sanitizeCaption(caption: string): string {
  const line = caption.replace(/\s*\n\s*/g, ' ').trim();
  return line.startsWith(':') ? '\\' + line : line;
}

/** Build the canonical figure block source: the opener (with the role brace only for a non-null
 *  role), the image token verbatim on its own line, then a blank line and the sanitized caption when
 *  the caption is non-empty, and the closing fence. This is the blank-line form remarkFigure reads as
 *  its primary path, and it reads cleanly when hand-edited. */
function buildFigureBlock(imageSrc: string, caption: string, role: FigureRole | null): string {
  const opener = role ? `:::figure{.${role}}` : ':::figure';
  const cap = sanitizeCaption(caption);
  const body = cap ? `${imageSrc}\n\n${cap}` : imageSrc;
  return `${opener}\n${body}\n:::`;
}

/**
 * Wrap a bare media image in a `:::figure` block. The image token is reused EXACTLY from its source
 * offsets and never reserialized (open risk 3: the atomic `media:` reference stays byte-identical).
 * The block lands on its own lines, with a blank line before it (unless it starts the document) and
 * after it, so it reads as a clean block even when the image sat inline in a paragraph. The selection
 * collapses just past the inserted block.
 */
export function wrapImageInFigure(
  doc: string,
  imageFrom: number,
  imageTo: number,
  caption: string,
  role: FigureRole | null,
): FormatResult {
  const imageSrc = doc.slice(imageFrom, imageTo);
  const block = buildFigureBlock(imageSrc, caption, role);
  const before = doc.slice(0, imageFrom);
  const after = doc.slice(imageTo);
  // Ensure the block starts on its own line: a blank line before it unless it opens the doc or the
  // text before it already ends with one. Trailing context gets a matching blank line.
  const lead = before === '' ? '' : before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
  const trail = after === '' ? '' : after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';
  const inserted = lead + block + trail;
  const blockStart = imageFrom + lead.length;
  const end = blockStart + block.length;
  return { doc: before + inserted + after, from: end, to: end };
}

/** The inner image token of the figure at `figureRange.from`, sliced verbatim from the source so it
 *  is reused byte-for-byte (open risk 3). Empty when no media image is found there, which leaves the
 *  rebuild image-less rather than throwing. Shared by updateFigure and unwrapFigure. */
function figureImageSrc(doc: string, figureRange: { from: number; to: number }): string {
  const info = figureAtImage(doc, figureRange.from);
  return info ? doc.slice(info.imageFrom, info.imageTo) : '';
}

/**
 * Rewrite an existing figure's caption and role in place. The inner image token is extracted from the
 * current block and PRESERVED BYTE-FOR-BYTE (open risk 3); the block is rebuilt in the blank-line
 * form with the new opener and caption. The selection collapses just past the rewritten block.
 */
export function updateFigure(
  doc: string,
  figureRange: { from: number; to: number },
  caption: string,
  role: FigureRole | null,
): FormatResult {
  const block = buildFigureBlock(figureImageSrc(doc, figureRange), caption, role);
  const end = figureRange.from + block.length;
  return { doc: doc.slice(0, figureRange.from) + block + doc.slice(figureRange.to), from: end, to: end };
}

/**
 * Unwrap a figure block back to its bare image line, dropping the caption and the directive fences.
 * The inner image token is reused verbatim (open risk 3). The selection lands on the restored image
 * so the author can act on it again.
 */
export function unwrapFigure(doc: string, figureRange: { from: number; to: number }): FormatResult {
  const imageSrc = figureImageSrc(doc, figureRange);
  return {
    doc: doc.slice(0, figureRange.from) + imageSrc + doc.slice(figureRange.to),
    from: figureRange.from,
    to: figureRange.from + imageSrc.length,
  };
}
