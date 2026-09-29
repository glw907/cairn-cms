// cairn-cms: the pure padding rule behind EditorApi.insert. Both insertAtCursor paths (the
// mounted CodeMirror dispatch and the pre-mount textarea fallback) call this so a block insert
// always separates from adjacent non-blank text by exactly one blank line, never a double blank
// line, and never a leading or trailing blank line at a document edge. The span form bounds only
// the whitespace the rule strips, so the mounted editor changes that span and nothing else.

/**
 * The result of padding an insertion: the whole resulting document and the caret offset at the
 *  end of the inserted block (its closing fence), before any trailing padding.
 */
export interface PaddedInsert {
  doc: string;
  caret: number;
}

/**
 * A padded insertion as a single change: replace `doc.slice(from, to)` with `insert`. `caret` is
 *  the offset in the resulting document at the end of the inserted block, before any trailing
 *  padding.
 */
export interface PaddedInsertSpan {
  from: number;
  to: number;
  insert: string;
  caret: number;
}

/**
 * The text after `pos` in `doc`, with only the whitespace that separates the caret from the next
 *  non-blank content removed. At a genuine line start (`pos` is 0 or follows a newline), a
 *  non-blank first line, including its own leading indentation, is left untouched: that
 *  indentation belongs to the line's content, not to the caret's separator. The same holds when
 *  the caret sits inside that indentation, so the whole line comes back from its start. Mid-line,
 *  only the inline whitespace immediately after the caret is dropped, since it once sat between
 *  two words on the same line. A blank first line, and any further whole blank lines after it, are
 *  dropped up to the first non-blank line, whose own indentation is always kept.
 */
function stripAfter(doc: string, pos: number): string {
  const after = doc.slice(pos);
  const lineStart = pos === 0 ? 0 : doc.lastIndexOf('\n', pos - 1) + 1;
  const inIndent = /^[ \t]*$/.test(doc.slice(lineStart, pos));
  const firstNewline = after.indexOf('\n');
  const firstLineEnd = firstNewline === -1 ? after.length : firstNewline;
  const firstLine = after.slice(0, firstLineEnd);
  if (firstLine.trim() !== '') {
    if (inIndent) return doc.slice(lineStart);
    return firstLine.replace(/^[ \t]*/, '') + after.slice(firstLineEnd);
  }
  let cursor = firstNewline === -1 ? after.length : firstNewline + 1;
  while (cursor < after.length) {
    const nextNewline = after.indexOf('\n', cursor);
    const lineEnd = nextNewline === -1 ? after.length : nextNewline;
    if (after.slice(cursor, lineEnd).trim() !== '') break;
    cursor = nextNewline === -1 ? after.length : nextNewline + 1;
  }
  return after.slice(cursor);
}

/**
 * The text before `pos` in `doc`, with only the whitespace that separates the caret from the
 *  preceding non-blank content removed. Mirrors `stripAfter`: at a genuine line end (`pos` is the
 *  document's length or precedes a newline), a non-blank last line is left untouched, indentation
 *  and all. Mid-line, only the inline whitespace immediately before the caret is dropped. A blank
 *  last line, and any further whole blank lines above it, are dropped up to the first non-blank
 *  line, which is kept intact.
 */
function stripBefore(doc: string, pos: number): string {
  const before = doc.slice(0, pos);
  const atLineEnd = pos === doc.length || doc[pos] === '\n';
  const lastNewline = before.lastIndexOf('\n');
  const lastLineStart = lastNewline === -1 ? 0 : lastNewline + 1;
  const lastLine = before.slice(lastLineStart);
  if (lastLine.trim() !== '') {
    if (atLineEnd) return before;
    return before.slice(0, lastLineStart) + lastLine.replace(/[ \t]*$/, '');
  }
  let cursor = lastNewline === -1 ? 0 : lastNewline;
  while (cursor > 0) {
    const prevNewline = before.lastIndexOf('\n', cursor - 1);
    const lineStart = prevNewline === -1 ? 0 : prevNewline + 1;
    if (before.slice(lineStart, cursor).trim() !== '') break;
    cursor = prevNewline === -1 ? 0 : prevNewline;
  }
  return before.slice(0, cursor);
}

/**
 * Insert `text` at `pos` in `doc`, padded by exactly one blank line on each side that touches
 *  non-blank content, as one change over only the whitespace the padding strips. An existing
 *  blank line (or several) collapses to exactly one rather than stacking a second one on top,
 *  and a whitespace-only line counts as blank; neither strip ever removes the indentation of a
 *  line that holds content. Nothing is added where the stripped `before` or `after` is empty, so
 *  a document's start or end gets no padding on that side, though a document that ended with a
 *  newline keeps exactly one after the block.
 */
export function paddedInsertSpan(doc: string, pos: number, text: string): PaddedInsertSpan {
  const before = stripBefore(doc, pos);
  const after = stripAfter(doc, pos);
  const leading = before.length > 0 ? '\n\n' : '';
  const trailing = after.length > 0 ? '\n\n' : '';
  const finalNewline = after.length === 0 && doc.endsWith('\n');
  const from = before.length;
  // The document's own final newline stays outside the changed range: the insert ends just before it.
  const to = doc.length - after.length - (finalNewline ? 1 : 0);
  return { from, to, insert: `${leading}${text}${trailing}`, caret: from + leading.length + text.length };
}

/**
 * Insert `text` at `pos` in `doc` under the same padding rule as `paddedInsertSpan`, returning
 *  the whole resulting document. The pre-mount fallback uses this form, where there is no editor
 *  state to dispatch a span against.
 */
export function padInsertedBlock(doc: string, pos: number, text: string): PaddedInsert {
  const span = paddedInsertSpan(doc, pos, text);
  return { doc: doc.slice(0, span.from) + span.insert + doc.slice(span.to), caret: span.caret };
}
