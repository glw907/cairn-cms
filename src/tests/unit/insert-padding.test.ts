import { describe, it, expect } from 'vitest';
import { padInsertedBlock } from '../../lib/admin/insert-padding.js';

// Table-driven proof of the padding rule behind EditorApi.insert: a block insert separates from
// adjacent non-blank text by exactly one blank line on each side, never a double blank line, and
// never padding at a document edge, without disturbing the indentation of a line that holds
// content. Each row asserts the whole resulting document and the caret offset, which lands at the
// end of the inserted block (its closing fence).
const rows: { name: string; doc: string; pos: number; text: string; out: string; caret: number }[] = [
  {
    name: 'an empty document',
    doc: '',
    pos: 0,
    text: '::::note\nBLOCK\n::::',
    out: '::::note\nBLOCK\n::::',
    caret: 19,
  },
  {
    name: 'the caret at the document start before body text',
    doc: 'The original body.',
    pos: 0,
    text: '::::note\nBLOCK\n::::',
    out: '::::note\nBLOCK\n::::\n\nThe original body.',
    caret: 19,
  },
  {
    name: 'the caret mid-line with text on both sides',
    doc: 'abcdef',
    pos: 3,
    text: 'X',
    out: 'abc\n\nX\n\ndef',
    caret: 6,
  },
  {
    name: "the caret at a line's end with a non-blank line below",
    doc: 'para1\npara2',
    pos: 5,
    text: 'X',
    out: 'para1\n\nX\n\npara2',
    caret: 8,
  },
  {
    name: 'the caret on a blank line already between two paragraphs (no double blank line)',
    doc: 'Paragraph one.\n\nParagraph two.',
    pos: 16,
    text: 'X',
    out: 'Paragraph one.\n\nX\n\nParagraph two.',
    caret: 17,
  },
  {
    name: "the caret at the document's end after text",
    doc: 'Some text',
    pos: 9,
    text: 'X',
    out: 'Some text\n\nX',
    caret: 12,
  },
  {
    name: 'the caret on an empty line directly under a paragraph line',
    doc: 'Paragraph text.\n',
    pos: 16,
    text: 'X',
    out: 'Paragraph text.\n\nX',
    caret: 18,
  },
  {
    name: 'a caret beside a line holding only whitespace (treated as blank)',
    doc: 'Paragraph one.\n   \nParagraph two.',
    pos: 17,
    text: 'X',
    out: 'Paragraph one.\n\nX\n\nParagraph two.',
    caret: 17,
  },
  {
    name: "the pre-mount fallback's case, the caret at the end of a non-empty value",
    doc: 'A plain prose line.',
    pos: 19,
    text: '::::note\nBLOCK\n::::',
    out: 'A plain prose line.\n\n::::note\nBLOCK\n::::',
    caret: 40,
  },
  {
    name: "a caller's inline text inserted mid-sentence",
    doc: 'I love the sunset.',
    pos: 6,
    text: 'really ',
    out: 'I love\n\nreally \n\nthe sunset.',
    caret: 15,
  },
  {
    name: 'the caret at the document start before an indented code line, which keeps its indentation',
    doc: '    const x = 1;',
    pos: 0,
    text: 'X',
    out: 'X\n\n    const x = 1;',
    caret: 1,
  },
  {
    name: "the caret at a line's end above a nested list item, which keeps its indentation",
    doc: '- a\n  - nested',
    pos: 3,
    text: 'X',
    out: '- a\n\nX\n\n  - nested',
    caret: 6,
  },
];

describe('padInsertedBlock', () => {
  for (const row of rows) {
    it(`pads correctly for ${row.name}`, () => {
      expect(padInsertedBlock(row.doc, row.pos, row.text)).toEqual({ doc: row.out, caret: row.caret });
    });
  }
});
