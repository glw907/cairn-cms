// cairn-cms: the pure padding rule behind EditorApi.insert. Both insertAtCursor paths (the
// mounted CodeMirror dispatch and the pre-mount textarea fallback) call this so a block insert
// always separates from adjacent non-blank text by exactly one blank line, never a double blank
// line, and never a leading or trailing blank line at a document edge.

/**
 * The result of padding an insertion: the whole resulting document and the caret offset at the
 *  end of the inserted block (its closing fence), before any trailing padding.
 */
export interface PaddedInsert {
  doc: string;
  caret: number;
}

/**
 * Insert `text` at `pos` in `doc`, padded by exactly one blank line on each side that touches
 *  non-blank content. Trims the whitespace already adjacent to `pos` first, so an existing blank
 *  line (or several) collapses to exactly one rather than stacking a second one on top; a
 *  whitespace-only line counts as blank. Nothing is added where `before` or `after` trims to
 *  empty, so a document's start or end gets no padding on that side.
 */
export function padInsertedBlock(doc: string, pos: number, text: string): PaddedInsert {
  const before = doc.slice(0, pos).trimEnd();
  const after = doc.slice(pos).trimStart();
  const leading = before.length > 0 ? '\n\n' : '';
  const trailing = after.length > 0 ? '\n\n' : '';
  return {
    doc: `${before}${leading}${text}${trailing}${after}`,
    caret: before.length + leading.length + text.length,
  };
}
