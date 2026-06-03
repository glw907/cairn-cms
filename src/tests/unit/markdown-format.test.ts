import { describe, it, expect } from 'vitest';
import { applyMarkdownFormat, insertInlineLink, unwrapCairnLink, type FormatKind } from '../../lib/components/markdown-format.js';

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

describe('insertInlineLink', () => {
  it('wraps a selection as the display text', () => {
    const doc = 'see the guide here';
    const from = 8; // 'guide'
    const to = 13;
    const res = insertInlineLink(doc, from, to, 'cairn:posts/guide', 'Guide');
    expect(res.doc).toBe('see the [guide](cairn:posts/guide) here');
    // the cursor collapses just after the inserted link
    expect(res.from).toBe(res.to);
    expect(res.doc.slice(0, res.from)).toBe('see the [guide](cairn:posts/guide)');
  });
  it('inserts the title as the display text when there is no selection', () => {
    const doc = 'see  here';
    const at = 4; // between the two spaces
    const res = insertInlineLink(doc, at, at, 'cairn:pages/about', 'About');
    expect(res.doc).toBe('see [About](cairn:pages/about) here');
    expect(res.from).toBe(res.to);
    expect(res.doc.slice(0, res.from)).toBe('see [About](cairn:pages/about)');
  });
  it('escapes brackets in the title when there is no selection', () => {
    const res = insertInlineLink('see  here', 4, 4, 'cairn:pages/x', 'A [B] C');
    expect(res.doc).toBe('see [A \\[B\\] C](cairn:pages/x) here');
  });
  it('does not escape a live selection (the author owns that text)', () => {
    const res = insertInlineLink('see [keep] this', 4, 10, 'cairn:pages/x', 'Title');
    expect(res.doc).toBe('see [[keep]](cairn:pages/x) this');
  });
  it('composes a pre-mount fallback link as inline markdown', () => {
    // The MarkdownEditor pre-mount fallback appends insertInlineLink('', 0, 0, href, title).doc.
    expect(insertInlineLink('', 0, 0, 'cairn:pages/about', 'About').doc).toBe('[About](cairn:pages/about)');
  });
});

describe('unwrapCairnLink', () => {
  it('unwraps the link with the given href to its display text', () => {
    const doc = 'see [the guide](cairn:posts/gone) and [home](cairn:pages/home) now';
    expect(unwrapCairnLink(doc, 'cairn:posts/gone')).toBe('see the guide and [home](cairn:pages/home) now');
  });
  it('unwraps every occurrence of that href', () => {
    const doc = '[a](cairn:posts/x) and [b](cairn:posts/x)';
    expect(unwrapCairnLink(doc, 'cairn:posts/x')).toBe('a and b');
  });
  it('leaves the document unchanged when the href is absent', () => {
    expect(unwrapCairnLink('plain [keep](cairn:pages/home)', 'cairn:posts/gone')).toBe('plain [keep](cairn:pages/home)');
  });
  it('unwraps and unescapes a display text with an escaped bracket', () => {
    expect(unwrapCairnLink('see [Notes \\[draft\\]](cairn:posts/x) end', 'cairn:posts/x')).toBe('see Notes [draft] end');
  });
  it('unwraps a titled link', () => {
    expect(unwrapCairnLink('a [t](cairn:posts/x "title") b', 'cairn:posts/x')).toBe('a t b');
  });
  it('leaves an occurrence inside a code span untouched, unwrapping only the prose link', () => {
    expect(unwrapCairnLink('`[x](cairn:posts/x)` and [x](cairn:posts/x)', 'cairn:posts/x')).toBe('`[x](cairn:posts/x)` and x');
  });
});
