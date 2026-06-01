import { describe, it, expect } from 'vitest';
import { applyMarkdownFormat, type FormatKind } from '../../lib/components/markdown-format.js';

describe('applyMarkdownFormat', () => {
  const wrap: { kind: FormatKind; doc: string; out: string; from: number; to: number }[] = [
    { kind: 'bold', doc: 'abc', out: '**abc**', from: 2, to: 5 },
    { kind: 'italic', doc: 'abc', out: '_abc_', from: 1, to: 4 },
    { kind: 'code', doc: 'abc', out: '`abc`', from: 1, to: 4 },
  ];
  for (const c of wrap) {
    it(`wraps a selection for ${c.kind}`, () => {
      expect(applyMarkdownFormat(c.doc, 0, 3, c.kind)).toEqual({ doc: c.out, from: c.from, to: c.to });
    });
  }

  const linePrefix: { kind: FormatKind; out: string; to: number }[] = [
    { kind: 'heading', out: '# abc', to: 5 },
    { kind: 'quote', out: '> abc', to: 5 },
    { kind: 'ul', out: '- abc', to: 5 },
  ];
  for (const c of linePrefix) {
    it(`prefixes the line for ${c.kind}`, () => {
      expect(applyMarkdownFormat('abc', 0, 3, c.kind)).toEqual({ doc: c.out, from: 2, to: c.to });
    });
  }

  it('builds a link with the selection on the url placeholder', () => {
    expect(applyMarkdownFormat('abc', 0, 3, 'link')).toEqual({ doc: '[abc](url)', from: 6, to: 9 });
  });

  it('prefixes every line of a multi-line selection', () => {
    expect(applyMarkdownFormat('a\nb', 0, 3, 'heading')).toEqual({ doc: '# a\n# b', from: 2, to: 7 });
  });
});
