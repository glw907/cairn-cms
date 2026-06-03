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

export type FormatKind = 'bold' | 'italic' | 'code' | 'heading' | 'quote' | 'ul' | 'link';

export interface FormatResult {
  doc: string;
  from: number;
  to: number;
}

const WRAP: Record<'bold' | 'italic' | 'code', string> = { bold: '**', italic: '_', code: '`' };
const LINE_PREFIX: Record<'heading' | 'quote' | 'ul', string> = { heading: '# ', quote: '> ', ul: '- ' };

export function applyMarkdownFormat(doc: string, from: number, to: number, kind: FormatKind): FormatResult {
  if (kind === 'bold' || kind === 'italic' || kind === 'code') {
    const marker = WRAP[kind];
    const next = doc.slice(0, from) + marker + doc.slice(from, to) + marker + doc.slice(to);
    return { doc: next, from: from + marker.length, to: to + marker.length };
  }

  if (kind === 'link') {
    const text = doc.slice(from, to);
    const placeholder = 'url';
    const lead = `[${text}](`; // everything before the url placeholder
    const inserted = `${lead}${placeholder})`;
    const urlStart = from + lead.length;
    return { doc: doc.slice(0, from) + inserted + doc.slice(to), from: urlStart, to: urlStart + placeholder.length };
  }

  const prefix = LINE_PREFIX[kind];
  const lineStart = doc.lastIndexOf('\n', from - 1) + 1; // 0 when the selection is on the first line
  const region = doc.slice(lineStart, to);
  const prefixed = region.replace(/^/gm, prefix);
  const added = prefixed.length - region.length;
  return { doc: doc.slice(0, lineStart) + prefixed + doc.slice(to), from: from + prefix.length, to: to + added };
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

/**
 * Rewrite every cairn: link whose href is exactly `oldHref` so its href becomes `newHref`, keeping
 * the display text and any link title byte-for-byte. Rename calls this to repoint a renamed entry's
 * inbound tokens. Parsed with the same remark pipeline as extractCairnLinks, so a token inside a code
 * span is not a link node and is never touched. Each matching node's source span is rewritten from
 * last to first, replacing only the `](oldHref` run so the label and title stay exact.
 */
export function rewriteCairnLink(doc: string, oldHref: string, newHref: string): string {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(doc);
  const spans: { start: number; end: number }[] = [];
  visit(tree, 'link', (node: Link) => {
    if (node.url !== oldHref) return;
    const start = node.position?.start?.offset;
    const end = node.position?.end?.offset;
    if (start == null || end == null) return;
    spans.push({ start, end });
  });
  spans.sort((a, b) => b.start - a.start);
  let out = doc;
  for (const span of spans) {
    const src = out.slice(span.start, span.end);
    const rewritten = src.replace(`](${oldHref}`, `](${newHref}`);
    out = out.slice(0, span.start) + rewritten + out.slice(span.end);
  }
  return out;
}
