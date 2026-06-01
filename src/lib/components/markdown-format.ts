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
