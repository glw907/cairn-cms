// cairn-cms: the one full-document line-array read editor-highlight and editor-modes each rebuild
// per doc change (a caret move or scroll reuses the cached array; only a doc change refetches it).
// Both viewport-decoration passes need the whole document's lines up front, since a container's or
// a paragraph's boundaries can open above the visible range. The EditorView reference below is
// type-only, so this module carries no runtime CodeMirror dependency and stays safe for either
// dynamically-loaded caller.
import type { EditorView } from '@codemirror/view';

/** Every line's text in `view`'s document, indexed 0 to `doc.lines - 1`. */
export function docLines(view: EditorView): string[] {
  const doc = view.state.doc;
  const lines: string[] = [];
  for (let n = 1; n <= doc.lines; n++) lines.push(doc.line(n).text);
  return lines;
}
