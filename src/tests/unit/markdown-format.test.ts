import { describe, it, expect } from 'vitest';
import {
  applyMarkdownFormat,
  figureAtImage,
  findMediaImagesNeedingAlt,
  insertImage,
  insertInlineLink,
  unwrapCairnLink,
  unwrapFigure,
  updateFigure,
  wrapImageInFigure,
  type FormatKind,
} from '../../lib/components/markdown-format.js';

describe('applyMarkdownFormat', () => {
  const wrap: { kind: FormatKind; doc: string; out: string; from: number; to: number }[] = [
    { kind: 'bold', doc: 'abc', out: '**abc**', from: 2, to: 5 },
    { kind: 'italic', doc: 'abc', out: '_abc_', from: 1, to: 4 },
    { kind: 'code', doc: 'abc', out: '`abc`', from: 1, to: 4 },
    { kind: 'strike', doc: 'abc', out: '~~abc~~', from: 2, to: 5 },
  ];
  for (const c of wrap) {
    it(`wraps a selection for ${c.kind}`, () => {
      expect(applyMarkdownFormat(c.doc, 0, 3, c.kind)).toEqual({ doc: c.out, from: c.from, to: c.to });
    });
  }

  it('unwraps a strike selection whose surrounding text already carries the markers', () => {
    expect(applyMarkdownFormat('~~abc~~', 2, 5, 'strike')).toEqual({ doc: 'abc', from: 0, to: 3 });
  });

  it('unwraps a strike selection that includes the markers', () => {
    expect(applyMarkdownFormat('~~abc~~', 0, 7, 'strike')).toEqual({ doc: 'abc', from: 0, to: 3 });
  });

  const linePrefix: { kind: FormatKind; out: string; from: number; to: number }[] = [
    { kind: 'h2', out: '## abc', from: 3, to: 6 },
    { kind: 'h3', out: '### abc', from: 4, to: 7 },
    { kind: 'quote', out: '> abc', from: 2, to: 5 },
    { kind: 'ul', out: '- abc', from: 2, to: 5 },
    { kind: 'task', out: '- [ ] abc', from: 6, to: 9 },
  ];
  for (const c of linePrefix) {
    it(`prefixes the line for ${c.kind}`, () => {
      expect(applyMarkdownFormat('abc', 0, 3, c.kind)).toEqual({ doc: c.out, from: c.from, to: c.to });
    });
  }

  it('builds a link with the selection on the url placeholder', () => {
    expect(applyMarkdownFormat('abc', 0, 3, 'link')).toEqual({ doc: '[abc](url)', from: 6, to: 9 });
  });

  it('prefixes every line of a multi-line selection', () => {
    expect(applyMarkdownFormat('a\nb', 0, 3, 'h2')).toEqual({ doc: '## a\n## b', from: 3, to: 9 });
  });

  it('removes the h2 prefix from a line already at that level', () => {
    expect(applyMarkdownFormat('## abc', 0, 6, 'h2')).toEqual({ doc: 'abc', from: 0, to: 3 });
  });

  it('replaces another heading level with h2', () => {
    expect(applyMarkdownFormat('### abc', 0, 7, 'h2')).toEqual({ doc: '## abc', from: 0, to: 6 });
  });

  it('removes the h3 prefix from a line already at that level', () => {
    expect(applyMarkdownFormat('### abc', 0, 7, 'h3')).toEqual({ doc: 'abc', from: 0, to: 3 });
  });

  it('replaces another heading level with h3', () => {
    expect(applyMarkdownFormat('## abc', 0, 6, 'h3')).toEqual({ doc: '### abc', from: 1, to: 7 });
  });

  it('numbers each selected line for ol', () => {
    expect(applyMarkdownFormat('a\nb', 0, 3, 'ol')).toEqual({ doc: '1. a\n2. b', from: 3, to: 9 });
  });

  it('removes the numbering when every selected line is already numbered', () => {
    expect(applyMarkdownFormat('1. a\n2. b', 0, 9, 'ol')).toEqual({ doc: 'a\nb', from: 0, to: 3 });
  });

  it('removes the task prefix when every selected line already carries one', () => {
    expect(applyMarkdownFormat('- [ ] a\n- [x] b', 0, 15, 'task')).toEqual({ doc: 'a\nb', from: 0, to: 3 });
  });

  it('fences the selected lines for codeblock', () => {
    expect(applyMarkdownFormat('abc', 0, 3, 'codeblock')).toEqual({ doc: '```\nabc\n```', from: 4, to: 7 });
  });

  it('fences a selection inside surrounding text', () => {
    expect(applyMarkdownFormat('x\nabc\ny', 2, 5, 'codeblock')).toEqual({ doc: 'x\n```\nabc\n```\ny', from: 6, to: 9 });
  });

  it('removes the fences when the surrounding lines are already fences', () => {
    expect(applyMarkdownFormat('```\nabc\n```', 4, 7, 'codeblock')).toEqual({ doc: 'abc', from: 0, to: 3 });
    expect(applyMarkdownFormat('x\n```\nabc\n```\ny', 6, 9, 'codeblock')).toEqual({ doc: 'x\nabc\ny', from: 2, to: 5 });
  });

  it('inserts a divider at the cursor for hr and collapses the selection', () => {
    expect(applyMarkdownFormat('ab', 1, 1, 'hr')).toEqual({ doc: 'a\n\n---\n\nb', from: 8, to: 8 });
  });

  it('inserts a starter table at the cursor with the selection on the first header cell', () => {
    const grid = '| Column 1 | Column 2 |\n| -------- | -------- |\n|          |          |\n|          |          |';
    const res = applyMarkdownFormat('ab', 1, 1, 'table');
    expect(res.doc).toBe(`a\n\n${grid}\n\nb`);
    expect(res.doc.slice(res.from, res.to)).toBe('Column 1');
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

describe('insertImage', () => {
  it('inserts an image at the cursor with the alt and the media reference', () => {
    const doc = 'see  here';
    const at = 4; // between the two spaces
    const res = insertImage(doc, at, at, 'A trail map', 'media:trail-map.0123456789abcdef');
    expect(res.doc).toBe('see ![A trail map](media:trail-map.0123456789abcdef) here');
    // the cursor collapses just after the inserted image
    expect(res.from).toBe(res.to);
    expect(res.doc.slice(0, res.from)).toBe('see ![A trail map](media:trail-map.0123456789abcdef)');
  });

  it('replaces a selection with the image rather than wrapping it', () => {
    const res = insertImage('see keep here', 4, 8, 'Alt', 'media:x.0123456789abcdef');
    expect(res.doc).toBe('see ![Alt](media:x.0123456789abcdef) here');
    expect(res.from).toBe(res.to);
  });

  it('escapes a bracket in the alt text', () => {
    const res = insertImage('', 0, 0, 'A [B] C', 'media:x.0123456789abcdef');
    expect(res.doc).toBe('![A \\[B\\] C](media:x.0123456789abcdef)');
  });

  it('composes a pre-mount fallback image as inline markdown', () => {
    expect(insertImage('', 0, 0, 'Alt', 'media:x.0123456789abcdef').doc).toBe('![Alt](media:x.0123456789abcdef)');
  });

  it('builds the placeholder-swap token the resolveTo path inserts at a position', () => {
    // The optimistic placeholder resolves by inserting the bare token at its mapped position. The
    // editor-placeholder seam computes that token with insertImage over an empty doc, so the swap
    // text is exactly the committed reference with the alt escaped.
    const token = insertImage('', 0, 0, 'A trail map', 'media:trail-map.0123456789abcdef').doc;
    expect(token).toBe('![A trail map](media:trail-map.0123456789abcdef)');
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

describe('findMediaImagesNeedingAlt', () => {
  const hash = '0123456789abcdef';
  it('finds a media image with an empty alt and returns its slug, hash, and offsets', () => {
    const doc = `before ![](media:cat.${hash}) after`;
    const hits = findMediaImagesNeedingAlt(doc);
    expect(hits).toHaveLength(1);
    expect(hits[0].ref).toBe(`media:cat.${hash}`);
    expect(hits[0].slug).toBe('cat');
    expect(hits[0].hash).toBe(hash);
    const from = doc.indexOf('![');
    expect(hits[0].from).toBe(from);
    expect(doc.slice(hits[0].from, hits[0].to)).toBe(`![](media:cat.${hash})`);
  });
  it('finds a media image whose alt is whitespace only', () => {
    const doc = `![   ](media:cat.${hash})`;
    const hits = findMediaImagesNeedingAlt(doc);
    expect(hits).toHaveLength(1);
    expect(hits[0].slug).toBe('cat');
  });
  it('returns the bare media: form with an empty slug', () => {
    const doc = `![](media:${hash})`;
    const hits = findMediaImagesNeedingAlt(doc);
    expect(hits).toHaveLength(1);
    expect(hits[0].slug).toBe('');
    expect(hits[0].hash).toBe(hash);
  });
  it('ignores a media image that already carries alt text', () => {
    const doc = `![A cat](media:cat.${hash})`;
    expect(findMediaImagesNeedingAlt(doc)).toEqual([]);
  });
  it('ignores a non-media image with an http url', () => {
    expect(findMediaImagesNeedingAlt('![](https://example.com/a.png)')).toEqual([]);
  });
  it('ignores a non-media image with a cairn: url', () => {
    expect(findMediaImagesNeedingAlt('![](cairn:posts/x)')).toEqual([]);
  });
  it('ignores a malformed media token', () => {
    expect(findMediaImagesNeedingAlt('![](media:not-a-hash)')).toEqual([]);
  });
  it('ignores a media image inside a fenced code block', () => {
    const doc = `\`\`\`\n![](media:cat.${hash})\n\`\`\``;
    expect(findMediaImagesNeedingAlt(doc)).toEqual([]);
  });
  it('finds several empty-alt media images and orders them by source position', () => {
    const doc = `![](media:a.${hash}) text ![](media:b.${hash})`;
    const hits = findMediaImagesNeedingAlt(doc);
    expect(hits).toHaveLength(2);
    expect(hits[0].slug).toBe('a');
    expect(hits[1].slug).toBe('b');
    expect(hits[0].from).toBeLessThan(hits[1].from);
  });
});

const HASH = '0123456789abcdef';
const REF = `media:shore.${HASH}`;
const TOKEN = `![A shore at dusk](${REF})`;

describe('wrapImageInFigure', () => {
  it('produces the blank-line form with a role brace and leaves the token byte-identical', () => {
    const doc = TOKEN;
    const result = wrapImageInFigure(doc, 0, TOKEN.length, 'A quiet shore at dusk.', 'wide');
    expect(result.doc).toBe(`:::figure{.wide}\n${TOKEN}\n\nA quiet shore at dusk.\n:::`);
    expect(result.doc).toContain(TOKEN);
  });

  it('omits the role brace for the measure default (role null)', () => {
    const result = wrapImageInFigure(TOKEN, 0, TOKEN.length, 'A caption.', null);
    expect(result.doc).toBe(`:::figure\n${TOKEN}\n\nA caption.\n:::`);
  });

  it('omits the caption block when the caption is empty', () => {
    const result = wrapImageInFigure(TOKEN, 0, TOKEN.length, '   ', 'center');
    expect(result.doc).toBe(`:::figure{.center}\n${TOKEN}\n:::`);
  });

  it('lifts an inline image to a clean block with surrounding blank lines', () => {
    const doc = `Before ${TOKEN} after.`;
    const from = doc.indexOf('![');
    const to = from + TOKEN.length;
    const result = wrapImageInFigure(doc, from, to, 'Cap', 'wide');
    expect(result.doc).toBe(`Before \n\n:::figure{.wide}\n${TOKEN}\n\nCap\n:::\n\n after.`);
    expect(result.doc).toContain(TOKEN);
  });
});

describe('figureAtImage', () => {
  it('returns figure:null for a bare image with the exact token offsets', () => {
    const doc = `Some text ${TOKEN} more.`;
    const from = doc.indexOf('![');
    const info = figureAtImage(doc, from + 3);
    expect(info).not.toBeNull();
    expect(info!.figure).toBeNull();
    expect(doc.slice(info!.imageFrom, info!.imageTo)).toBe(TOKEN);
  });

  it('returns null when the caret is not on a media image', () => {
    const doc = `Plain text with no image.`;
    expect(figureAtImage(doc, 3)).toBeNull();
  });

  it('detects an existing figure: range, caption, and role', () => {
    const block = `:::figure{.wide}\n${TOKEN}\n\nA quiet shore at dusk.\n:::`;
    const info = figureAtImage(block, 20);
    expect(info).not.toBeNull();
    expect(info!.figure).not.toBeNull();
    expect(info!.figure!.role).toBe('wide');
    expect(info!.figure!.caption).toBe('A quiet shore at dusk.');
    expect(block.slice(info!.figure!.from, info!.figure!.to)).toBe(block);
    expect(block.slice(info!.imageFrom, info!.imageTo)).toBe(TOKEN);
  });

  it('returns null role for the measure default figure', () => {
    const block = `:::figure\n${TOKEN}\n\nCap\n:::`;
    const info = figureAtImage(block, 12);
    expect(info!.figure!.role).toBeNull();
  });

  it('finds the figure when the caret sits in the caption, off the image', () => {
    const block = `:::figure{.center}\n${TOKEN}\n\nThe caption text.\n:::`;
    const capPos = block.indexOf('The caption');
    const info = figureAtImage(block, capPos + 2);
    expect(info!.figure).not.toBeNull();
    expect(info!.figure!.caption).toBe('The caption text.');
  });

  it('preserves inline markdown in the caption (a bracket is not corrupted)', () => {
    const block = `:::figure\n${TOKEN}\n\nA [draft] note with *emphasis*.\n:::`;
    const info = figureAtImage(block, 12);
    expect(info!.figure!.caption).toBe('A [draft] note with *emphasis*.');
  });
});

describe('updateFigure', () => {
  it('changes role and caption in place, token byte-identical', () => {
    const block = `:::figure{.wide}\n${TOKEN}\n\nOld caption.\n:::`;
    const info = figureAtImage(block, 12)!;
    const result = updateFigure(block, info.figure!, 'New caption.', 'full');
    expect(result.doc).toBe(`:::figure{.full}\n${TOKEN}\n\nNew caption.\n:::`);
    expect(result.doc).toContain(TOKEN);
  });

  it('drops to the measure default when the role becomes null', () => {
    const block = `:::figure{.wide}\n${TOKEN}\n\nCap\n:::`;
    const info = figureAtImage(block, 12)!;
    const result = updateFigure(block, info.figure!, 'Cap', null);
    expect(result.doc).toBe(`:::figure\n${TOKEN}\n\nCap\n:::`);
  });
});

describe('unwrapFigure', () => {
  it('restores exactly the bare image token and selects it', () => {
    const block = `:::figure{.wide}\n${TOKEN}\n\nA caption.\n:::`;
    const info = figureAtImage(block, 12)!;
    const result = unwrapFigure(block, info.figure!);
    expect(result.doc).toBe(TOKEN);
    expect(result.doc.slice(result.from, result.to)).toBe(TOKEN);
  });
});

describe('the figure caption fence hazard', () => {
  it('neutralizes a caption beginning with ::: so a re-parse sees no directive, and round-trips', () => {
    const wrapped = wrapImageInFigure(TOKEN, 0, TOKEN.length, '::: not a fence', 'wide');
    // The escaped caption line must not open a nested directive.
    expect(wrapped.doc).toContain('\\::: not a fence');
    // Re-reading the figure yields the author's original caption, the backslash stripped.
    const info = figureAtImage(wrapped.doc, 12)!;
    expect(info.figure!.caption).toBe('::: not a fence');
  });
});

describe('the full wrap -> read -> update -> unwrap cycle', () => {
  it('returns the original bare token byte-for-byte', () => {
    const original = TOKEN;
    const wrapped = wrapImageInFigure(original, 0, original.length, 'First caption.', 'center');
    const afterWrap = figureAtImage(wrapped.doc, 12)!;
    const updated = updateFigure(wrapped.doc, afterWrap.figure!, 'Second [caption].', 'full');
    const afterUpdate = figureAtImage(updated.doc, 12)!;
    expect(afterUpdate.figure!.caption).toBe('Second [caption].');
    expect(afterUpdate.figure!.role).toBe('full');
    const unwrapped = unwrapFigure(updated.doc, afterUpdate.figure!);
    expect(unwrapped.doc).toBe(original);
  });
});
