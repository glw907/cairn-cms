import { describe, it, expect } from 'vitest';
import { directiveLineKind, fenceDepths, findInlineDirectives } from '../../lib/components/markdown-directives.js';

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
