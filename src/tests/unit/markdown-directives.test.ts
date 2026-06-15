import { describe, it, expect } from 'vitest';
import {
  caretContainerRange,
  containerRanges,
  directiveLineKind,
  directiveOpenerName,
  fenceDepths,
  fenceScan,
  fenceTokens,
  findInlineDirectives,
  markerPrefix,
} from '../../lib/components/markdown-directives.js';

// The field-report regression document, verbatim: a labeled four-colon container holding two
// attributed panels. Every fence line here must classify, and the depth model must pair them.
const NESTED_FIXTURE = [
  '::::split[Costs & volunteers]',
  ':::panel{icon="hand-coins"}',
  "**Cost.** Training and camp are free, and money never decides who joins. Families who want to give can; donations buy gas, campground nights, and shared gear, and outfit athletes who need skis or a ride. If cost is in the way of anything, tell a coach. We won't ask about your finances.",
  ':::',
  '',
  ':::panel{icon="handshake" role="secondary"}',
  "**Volunteers.** Adults make this work, drivers most of all, since practice moves between trailheads. The [Volunteers page](/volunteers) has this summer's coaches and the jobs we need filled. You don't need a coaching certificate or a ski background.",
  ':::',
  '::::',
];

describe('directiveLineKind', () => {
  it('recognizes container fences with and without names and attributes', () => {
    expect(directiveLineKind(':::gallery')).toBe('fence');
    expect(directiveLineKind('::: gallery')).toBe('fence');
    expect(directiveLineKind(':::gallery{cols=3}')).toBe('fence');
    expect(directiveLineKind(':::')).toBe('fence');
    expect(directiveLineKind('  :::')).toBe('fence');
  });
  it.each([
    ['::::split[Costs & volunteers]', 'a labeled opener with four colons'],
    [':::panel{icon="hand-coins"}', 'a quoted attribute'],
    [':::panel{icon="handshake" role="secondary"}', 'quoted attributes containing a space'],
    [':::note[A label]{kind="aside"}', 'name, label, and attributes together'],
    [':::::wide[Big]{cols="2 of 3"}', 'five colons with a label and a spaced quoted attribute'],
    [':::::', 'a bare five-colon closer'],
    ['::::', 'a bare four-colon closer'],
  ])('classifies %s as a fence (%s)', (line) => {
    expect(directiveLineKind(line)).toBe('fence');
  });
  it('classifies every fence line of the nested fixture and none of its prose', () => {
    const kinds = NESTED_FIXTURE.map((line) => directiveLineKind(line));
    expect(kinds).toEqual(['fence', 'fence', null, 'fence', null, 'fence', null, 'fence', 'fence']);
  });
  it('rejects fence-like lines trailed by prose', () => {
    expect(directiveLineKind('::: gallery opens here')).toBeNull();
    expect(directiveLineKind('::::split [a detached label]')).toBe('fence');
  });
  it('recognizes leaf directives', () => {
    expect(directiveLineKind('::hr')).toBe('leaf');
    expect(directiveLineKind('::youtube[Intro]{id=abc}')).toBe('leaf');
  });
  it('rejects prose, emphasis, and URLs', () => {
    expect(directiveLineKind('Plain prose line')).toBeNull();
    expect(directiveLineKind('a sentence with :colons: inside')).toBeNull();
    expect(directiveLineKind('https://example.com')).toBeNull();
  });
});

describe('directiveOpenerName', () => {
  it('reads the name from a three-colon container opener', () => {
    expect(directiveOpenerName(':::callout{kind="note"}')).toBe('callout');
  });
  it('reads the name from a four-colon labeled opener', () => {
    expect(directiveOpenerName('::::cta[Book]')).toBe('cta');
  });
  it('reads the name through a label and an attribute block together', () => {
    expect(directiveOpenerName(':::note[A label]{kind="aside"}')).toBe('note');
  });
  it('tolerates leading indentation', () => {
    expect(directiveOpenerName('  :::panel{icon="hand-coins"}')).toBe('panel');
  });
  it('returns null for a bare closer', () => {
    expect(directiveOpenerName(':::')).toBeNull();
    expect(directiveOpenerName('::::')).toBeNull();
  });
  it('returns null for a non-fence line', () => {
    expect(directiveOpenerName('plain prose')).toBeNull();
    expect(directiveOpenerName('::hr')).toBeNull();
  });
});

describe('fenceDepths', () => {
  it('pairs the nested fixture by stack order, openers and closers sharing a depth', () => {
    expect(fenceDepths(NESTED_FIXTURE)).toEqual([1, 2, 2, 2, 1, 2, 2, 2, 1]);
  });
  it('marks lines outside any container as null', () => {
    expect(fenceDepths(['plain prose', ':::aside', 'inside', ':::', 'after'])).toEqual([null, 1, 1, 1, null]);
  });
  it('pairs by recency, not by colon count', () => {
    expect(fenceDepths([':::outer', '::::inner', '::::', 'body', ':::'])).toEqual([1, 2, 2, 1, 1]);
  });
  it('tolerates author errors without going below zero or throwing', () => {
    expect(fenceDepths([':::'])).toEqual([1]);
    expect(fenceDepths([':::aside', ':::', ':::', 'after'])).toEqual([1, 1, 1, null]);
  });
  it('ignores directive fences inside code blocks, so a documented example opens nothing', () => {
    expect(fenceDepths(['```', ':::note', '```', 'after'])).toEqual([null, null, null, null]);
    expect(fenceDepths(['~~~md', ':::note', '~~~', 'after'])).toEqual([null, null, null, null]);
  });
  it('keeps the surrounding container depth across a code block and pairs the real closer', () => {
    expect(fenceDepths([':::aside', '```', ':::', '```', 'inside', ':::', 'after'])).toEqual([
      1, 1, 1, 1, 1, 1, null,
    ]);
  });
  it('only the marker that opened a code block closes it', () => {
    // The tildes inside the backtick block are literal text; without marker tracking they would
    // end the block and let the directive example open a phantom container to end of document.
    expect(fenceDepths(['```', '~~~', ':::note', '~~~', '```', 'after'])).toEqual([
      null, null, null, null, null, null,
    ]);
  });
});

describe('fenceScan', () => {
  it('reports roles alongside depths, disowning fence-shaped lines inside code blocks', () => {
    const { depths, roles } = fenceScan([':::aside', '```', ':::note', ':::', '```', ':::']);
    expect(depths).toEqual([1, 1, 1, 1, 1, 1]);
    // The two fences inside the code block are documented examples, not delimiters, so their
    // roles come back null along with the code fences and any content line.
    expect(roles).toEqual(['opener', null, null, null, null, 'closer']);
  });
});

describe('fenceTokens', () => {
  it('splits a labeled opener into machinery and meaning', () => {
    expect(fenceTokens('::::split[Costs & volunteers]')).toEqual([
      { from: 0, to: 4, kind: 'mark' },
      { from: 4, to: 9, kind: 'label' },
      { from: 9, to: 10, kind: 'mark' },
      { from: 10, to: 28, kind: 'label' },
      { from: 28, to: 29, kind: 'mark' },
    ]);
  });
  it('marks the attribute braces as machinery and the name as meaning', () => {
    expect(fenceTokens(':::panel{title="Day pass"}')).toEqual([
      { from: 0, to: 3, kind: 'mark' },
      { from: 3, to: 8, kind: 'label' },
      { from: 8, to: 26, kind: 'mark' },
    ]);
  });
  it('treats a bare closer as all machinery', () => {
    expect(fenceTokens(':::')).toEqual([{ from: 0, to: 3, kind: 'mark' }]);
  });
  it('tolerates indent and trailing space', () => {
    expect(fenceTokens('  ::: ')).toEqual([{ from: 2, to: 5, kind: 'mark' }]);
  });
  it('returns nothing for a non-fence line', () => {
    expect(fenceTokens('plain prose')).toEqual([]);
    expect(fenceTokens('::leaf[Label]')).toEqual([]);
  });
});

describe('caretContainerRange', () => {
  const fixtureScan = fenceScan(NESTED_FIXTURE);
  it('finds the innermost container around the caret', () => {
    // Caret in the first panel's prose: the panel's opener through its closer, at depth 2.
    expect(caretContainerRange(fixtureScan, 2)).toEqual({ fromLine: 1, toLine: 3, depth: 2 });
    // A fence row carries the depth of the container it delimits, so a caret on the panel's
    // closer still belongs to the panel, not to the outer split.
    expect(caretContainerRange(fixtureScan, 3)).toEqual({ fromLine: 1, toLine: 3, depth: 2 });
  });
  it('returns the outer container when the caret sits between panels', () => {
    // The blank line between the panels is the outer split's own content line.
    expect(caretContainerRange(fixtureScan, 4)).toEqual({ fromLine: 0, toLine: 8, depth: 1 });
  });
  it('returns null outside any container', () => {
    const scan = fenceScan(['before', ':::aside', 'inside', ':::', 'after']);
    expect(caretContainerRange(scan, 0)).toBeNull();
    expect(caretContainerRange(scan, 4)).toBeNull();
  });
  it('runs an unclosed container to the document end', () => {
    const scan = fenceScan([':::aside', 'one', 'two']);
    expect(caretContainerRange(scan, 2)).toEqual({ fromLine: 0, toLine: 2, depth: 1 });
  });
  it('spans the real container across fence-shaped lines inside a code block', () => {
    // A documented directive example inside a fenced code block inside a real container: the
    // caret range must reach the real opener and closer, never clip at the fakes the code-block
    // tracking already disowned.
    const scan = fenceScan([':::aside', 'before', '```', ':::note', ':::', '```', 'after', ':::']);
    expect(caretContainerRange(scan, 1)).toEqual({ fromLine: 0, toLine: 7, depth: 1 });
    expect(caretContainerRange(scan, 6)).toEqual({ fromLine: 0, toLine: 7, depth: 1 });
  });
});

describe('containerRanges', () => {
  it('pairs every container of the nested fixture, openers and closers sharing a depth', () => {
    // The outer split spans the whole fixture (depth 1); each panel pairs its own opener and
    // closer (depth 2). Every paired range is returned, the fold system's only source of ranges.
    expect(containerRanges(fenceScan(NESTED_FIXTURE))).toEqual([
      { fromLine: 1, toLine: 3, depth: 2 },
      { fromLine: 5, toLine: 7, depth: 2 },
      { fromLine: 0, toLine: 8, depth: 1 },
    ]);
  });
  it('pairs a simple single container', () => {
    expect(containerRanges(fenceScan(['before', ':::aside', 'inside', ':::', 'after']))).toEqual([
      { fromLine: 1, toLine: 3, depth: 1 },
    ]);
  });
  it('pairs by recency, deepest container closing first', () => {
    expect(containerRanges(fenceScan([':::outer', '::::inner', '::::', 'body', ':::']))).toEqual([
      { fromLine: 1, toLine: 2, depth: 2 },
      { fromLine: 0, toLine: 4, depth: 1 },
    ]);
  });
  it('yields no range for an unbalanced opener, so it earns no chevron', () => {
    // An opener that never closes can never fold: the safety invariant forbids a half-typed fence
    // swallowing the document, so the unpaired opener is simply absent from the ranges.
    expect(containerRanges(fenceScan([':::aside', 'one', 'two']))).toEqual([]);
    // A closed inner inside an unclosed outer: the inner pairs, the outer does not.
    expect(containerRanges(fenceScan([':::outer', ':::inner', 'body', ':::']))).toEqual([
      { fromLine: 1, toLine: 3, depth: 2 },
    ]);
  });
  it('ignores fence-shaped lines inside a code block, which never pair', () => {
    // The scan disowns the documented ::: example inside the code block (role null), so it can
    // neither open nor close a foldable range; only the real aside pairs.
    const scan = fenceScan([':::aside', 'before', '```', ':::note', ':::', '```', 'after', ':::']);
    expect(containerRanges(scan)).toEqual([{ fromLine: 0, toLine: 7, depth: 1 }]);
  });
  it('drops a stray closer with no matching opener', () => {
    // A bare closer with nothing open reads as depth 1 in the scan but pairs with no opener, so it
    // produces no range and never throws.
    expect(containerRanges(fenceScan([':::']))).toEqual([]);
    expect(containerRanges(fenceScan([':::aside', ':::', ':::', 'after']))).toEqual([
      { fromLine: 0, toLine: 1, depth: 1 },
    ]);
  });
});

describe('markerPrefix', () => {
  it('measures the marker prefix of a quote, list, ordered, and task line', () => {
    expect(markerPrefix('> quoted text')).toBe('> ');
    expect(markerPrefix('- item')).toBe('- ');
    // Ordered markers are wider than 2ch; the width comes from the match, never assumed.
    expect(markerPrefix('12. item')).toBe('12. ');
    expect(markerPrefix('- [ ] task')).toBe('- [ ] ');
  });
  it('counts leading indentation toward the hang', () => {
    expect(markerPrefix('  - nested item')).toBe('  - ');
  });
  it('returns null for a line with no marker', () => {
    expect(markerPrefix('plain text')).toBeNull();
  });
});

describe('findInlineDirectives', () => {
  it('finds inline directives with ranges', () => {
    expect(findInlineDirectives('See :icon[ski]{size=16} here')).toEqual([{ from: 4, to: 23 }]);
  });
  it('ignores URLs, bare colons, and leaf/container forms', () => {
    expect(findInlineDirectives('https://example.com and ::leaf')).toEqual([]);
    expect(findInlineDirectives('a :smile: emoji')).toEqual([]);
  });
});
