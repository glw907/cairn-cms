/**
 * Pure markdown selection transforms for the editor toolbar. Each call maps a document and a
 * selection range to a new document and a new selection, with no DOM. The MarkdownEditor view
 * dispatches the result; keeping the logic here lets it unit-test without a browser.
 */
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import type { Link } from 'mdast';
import { escapeLinkText } from '../content/links.js';

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
