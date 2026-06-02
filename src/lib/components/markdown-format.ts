/**
 * Pure markdown selection transforms for the editor toolbar. Each call maps a document and a
 * selection range to a new document and a new selection, with no DOM. The MarkdownEditor view
 * dispatches the result; keeping the logic here lets it unit-test without a browser.
 */
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
  const text = from < to ? doc.slice(from, to) : title;
  const inserted = `[${text}](${href})`;
  const end = from + inserted.length;
  return { doc: doc.slice(0, from) + inserted + doc.slice(to), from: end, to: end };
}
