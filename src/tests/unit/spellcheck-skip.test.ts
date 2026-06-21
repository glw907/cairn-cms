import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import { markdownLanguage } from '@codemirror/lang-markdown';
import { syntaxTree } from '@codemirror/language';
import type { Tree } from '@lezer/common';
import {
  classifyProse,
  extractWords,
  spellcheckRanges,
  arbitrateChecked,
  type SeqArbiter,
} from '../../lib/components/spellcheck.js';

// The unit drives the PURE classifier (part A) and the latest-wins arbiter, never a real Worker.
// A syntax tree is built in node from the markdown language, the same way the lint source gets it
// on the client through syntaxTree(state). CodeMirror state and language parsing run fine here.
function treeOf(doc: string): Tree {
  const state = EditorState.create({ doc, extensions: [markdownLanguage] });
  return syntaxTree(state);
}

// Every absolute character range the classifier judges to be prose, as the substrings it keeps.
// A range outside the prose set (code, a URL, frontmatter, directive machinery) never appears.
function keptText(doc: string): string[] {
  return spellcheckRanges(doc, treeOf(doc)).map((r) => doc.slice(r.from, r.to));
}

describe('classifyProse: the Lezer tree as the single skip authority', () => {
  it('skips code, links, URLs, HTML, and emphasis markers, keeps the prose', () => {
    const doc =
      '# A Heading with *emphasis* and `inlineCode`\n\n' +
      'A paragraph with a [visible label](https://example.com) here.\n\n' +
      '```js\nconst broke = misspelld;\n```\n\n' +
      '<div class="raw">rawhtml content</div>\n';
    const text = keptText(doc).join(' ');
    // Heading prose and the emphasis prose are kept (the markers around them are not).
    expect(text).toContain('Heading');
    expect(text).toContain('emphasis');
    // A link's visible text is kept; its URL destination is not.
    expect(text).toContain('visible');
    expect(text).toContain('label');
    expect(text).not.toContain('example');
    // Inline code, a fenced code body, and an HTML block are never checked.
    expect(text).not.toContain('inlineCode');
    expect(text).not.toContain('misspelld');
    expect(text).not.toContain('rawhtml');
  });

  it('keeps image alt text but not the image URL', () => {
    const doc = 'See ![alt words here](media:cat.0123456789abcdef) below.\n';
    const ranges = spellcheckRanges(doc, treeOf(doc));
    const words = ranges.flatMap((r) => extractWords(doc, r.from, r.to).map((w) => w.text));
    expect(words).toContain('alt');
    expect(words).toContain('words');
    expect(words).toContain('here');
    expect(words).toContain('below');
    // The hash and the media: token never surface as words.
    expect(words).not.toContain('media');
    expect(words.some((w) => w.includes('0123456789'))).toBe(false);
  });
});

describe('classifyProse: the directive and media skips', () => {
  it('skips the directive machinery but keeps the directive body prose and a [label]', () => {
    const doc = ':::figure[Caption words]{.wide}\nBody caption prose here.\n:::\n';
    const text = keptText(doc).join(' ');
    // The bracketed label is prose a reader sees, so it is kept.
    expect(text).toContain('Caption');
    expect(text).toContain('words');
    // The directive name and the body prose stay checkable.
    expect(text).toContain('Body');
    expect(text).toContain('prose');
    // The colon run and the {attrs} brace are machinery; "figure" the directive name and the
    // ".wide" class are never flagged as prose.
    expect(text).not.toContain(':::');
    expect(text).not.toContain('wide');
    const words = spellcheckRanges(doc, treeOf(doc)).flatMap((r) =>
      extractWords(doc, r.from, r.to).map((w) => w.text),
    );
    expect(words).not.toContain('figure');
  });

  it('skips a bare media: token in text so it is never split into "media" plus a hash', () => {
    const doc = 'A bare reference media:dog.fedcba9876543210 sits inline here.\n';
    const words = spellcheckRanges(doc, treeOf(doc)).flatMap((r) =>
      extractWords(doc, r.from, r.to).map((w) => w.text),
    );
    expect(words).toContain('bare');
    expect(words).toContain('reference');
    expect(words).toContain('inline');
    expect(words).toContain('here');
    // The whole media: token is one skipped run, never "media" plus the hex hash.
    expect(words).not.toContain('media');
    expect(words).not.toContain('dog');
    expect(words.some((w) => /[0-9a-f]{8}/.test(w))).toBe(false);
  });
});

describe('the combined-skip agreement (the key contract)', () => {
  // One fixture exercising all three skip mechanisms at once: frontmatter, a :::figure directive,
  // a bare media: token, and a code fence. The three mechanisms must never disagree at a boundary,
  // every piece of machinery is skipped, and only body prose is kept.
  const doc =
    '---\n' +
    'title: My Photo Post\n' +
    'slug: photo-post\n' +
    '---\n' +
    '\n' +
    ':::figure{.wide}\n' +
    '![mountain sunrise](media:peak.0123456789abcdef)\n' +
    '\n' +
    'A caption with descriptive words.\n' +
    ':::\n' +
    '\n' +
    'A bare token media:lake.fedcba9876543210 in prose.\n' +
    '\n' +
    '```python\n' +
    'codeword = wrongspeld\n' +
    '```\n';

  it('skips frontmatter, directive machinery, media tokens, and code, keeps body prose', () => {
    const words = spellcheckRanges(doc, treeOf(doc)).flatMap((r) =>
      extractWords(doc, r.from, r.to).map((w) => w.text),
    );
    // Body prose is kept.
    expect(words).toContain('mountain');
    expect(words).toContain('sunrise');
    expect(words).toContain('caption');
    expect(words).toContain('descriptive');
    expect(words).toContain('words');
    expect(words).toContain('bare');
    expect(words).toContain('token');
    expect(words).toContain('prose');
    // Frontmatter keys and values are never flagged.
    expect(words).not.toContain('title');
    expect(words).not.toContain('slug');
    expect(words).not.toContain('photo');
    // Directive machinery, the bare media tokens, and the code body are never flagged.
    expect(words).not.toContain('figure');
    expect(words).not.toContain('wide');
    expect(words).not.toContain('media');
    expect(words).not.toContain('lake');
    expect(words).not.toContain('codeword');
    expect(words).not.toContain('wrongspeld');
  });

  it('the three mechanisms never disagree at a kept-range boundary', () => {
    // No kept prose range may overlap the frontmatter span, a directive fence line's machinery,
    // or a code node. Every kept character must lie strictly outside every skip region, which is
    // exactly the no-disagreement-at-a-boundary invariant.
    const ranges = spellcheckRanges(doc, treeOf(doc));
    const fmEnd = doc.indexOf('---\n\n') + 3;
    const fenceLine = doc.indexOf(':::figure{.wide}');
    const fenceEnd = fenceLine + ':::figure{.wide}'.length;
    const codeStart = doc.indexOf('```python');
    // The fenced code block runs from its opening fence to the end of its closing fence line.
    const codeEnd = doc.indexOf('```', codeStart + 3) + 3;
    for (const r of ranges) {
      // Outside frontmatter.
      expect(r.from).toBeGreaterThanOrEqual(fmEnd);
      // No kept range straddles the figure opener line's machinery span.
      const overlapsFence = r.from < fenceEnd && r.to > fenceLine;
      expect(overlapsFence).toBe(false);
      // No kept range reaches into the code fence.
      const overlapsCode = r.from < codeEnd && r.to > codeStart;
      expect(overlapsCode).toBe(false);
    }
  });
});

describe('extractWords: the Unicode-aware boundary', () => {
  it('keeps intra-word apostrophes and hyphens, records absolute ranges', () => {
    const doc = "It's a well-known fact.";
    const words = extractWords(doc, 0, doc.length);
    const texts = words.map((w) => w.text);
    expect(texts).toContain("it's");
    expect(texts).toContain('well-known');
    expect(texts).toContain('fact');
    // The range is absolute and slices back to the original (pre-lowercase) spelling.
    const wellKnown = words.find((w) => w.text === 'well-known')!;
    expect(doc.slice(wellKnown.from, wellKnown.to)).toBe('well-known');
  });

  it('skips sub-three-character words, pure numbers, and all-caps tokens', () => {
    const doc = 'a GO API to 1234 and longer ok word';
    const texts = extractWords(doc, 0, doc.length).map((w) => w.text);
    expect(texts).not.toContain('a'); // one char
    expect(texts).not.toContain('to'); // two chars
    expect(texts).not.toContain('ok'); // two chars
    expect(texts).not.toContain('go'); // all-caps token (GO)
    expect(texts).not.toContain('api'); // all-caps token (API)
    expect(texts).not.toContain('1234'); // pure number
    expect(texts).toContain('and');
    expect(texts).toContain('longer');
    expect(texts).toContain('word');
  });

  it('offsets the range into the document, not the slice', () => {
    const doc = 'skip this; checkword here';
    const start = doc.indexOf('checkword');
    const words = extractWords(doc, start, doc.length);
    const found = words.find((w) => w.text === 'checkword')!;
    expect(found.from).toBe(start);
    expect(doc.slice(found.from, found.to)).toBe('checkword');
  });
});

describe('arbitrateChecked: the latest-wins counter', () => {
  it('accepts the freshest seq and drops a stale answer that lands after it', () => {
    const arbiter: SeqArbiter = arbitrateChecked();
    // A run posts seq 1, then a newer run posts seq 2.
    expect(arbiter.accept(1)).toBe(true);
    expect(arbiter.accept(2)).toBe(true);
    // The seq-1 answer arrives late, after seq 2 has been seen, so it is dropped.
    expect(arbiter.accept(1)).toBe(false);
    // The seq-2 answer is still the latest, so it is honored.
    expect(arbiter.accept(2)).toBe(true);
  });

  it('hands out a monotonic next() and treats only the highest seq as current', () => {
    const arbiter: SeqArbiter = arbitrateChecked();
    const first = arbiter.next();
    const second = arbiter.next();
    expect(second).toBeGreaterThan(first);
    expect(arbiter.accept(second)).toBe(true);
    expect(arbiter.accept(first)).toBe(false);
  });
});

// classifyProse is the lower-level building block spellcheckRanges composes; assert it returns the
// keep spans directly so Tasks 5/6/8 can build on the same primitive.
describe('classifyProse returns keep spans for an explicit text window', () => {
  it('keeps only the prose inside a window over a code-fenced document', () => {
    const doc = 'Prose word one.\n\n```\nfencedword\n```\n\nProse word two.\n';
    const tree = treeOf(doc);
    const spans = classifyProse(doc, tree, 0, doc.length);
    const text = spans.map((s) => doc.slice(s.from, s.to)).join(' ');
    expect(text).toContain('Prose');
    expect(text).not.toContain('fencedword');
  });
});
