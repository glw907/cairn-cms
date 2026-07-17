import { describe, it, expect } from 'vitest';
import { deriveExcerpt, wordCount } from '../../lib/content/excerpt.js';

describe('deriveExcerpt', () => {
  it('prefers a frontmatter description', () => {
    expect(deriveExcerpt('# Heading\n\nBody text.', { description: 'The summary.' })).toBe('The summary.');
  });

  it('strips markdown from the body when there is no description', () => {
    expect(deriveExcerpt('## Title\n\nA [link](/x) and `code`.')).toBe('Title A link and code.');
  });

  // An entry with no frontmatter description ships its excerpt as the meta description, so a
  // directive marker reaching the excerpt would put raw markup in the page's head.
  it('drops an include directive rather than carrying its markup into the excerpt', () => {
    expect(deriveExcerpt('Before.\n\n::include{fragment="notice"}\n\nAfter.')).toBe('Before. After.');
  });

  it("keeps a container directive's own prose while dropping its fences", () => {
    expect(deriveExcerpt(':::callout\n\nInner prose.\n\n:::')).toBe('Inner prose.');
  });

  // A directive's authored prose rides its [label]: cairn serializes a component's title slot
  // there. Dropping the whole marker line deletes that prose from the excerpt and the word count
  // outright, which is worse than the raw markup it was meant to remove.
  it("keeps a container's label, which is where a title slot's prose lives", () => {
    expect(deriveExcerpt('::::callout[Avalanche advisory in effect]{tone="warning"}\nCheck the forecast.\n::::')).toBe(
      'Avalanche advisory in effect Check the forecast.',
    );
  });

  it('keeps the whole text of a component whose only slot is its title', () => {
    const md = ':::pull-quote[Write the post you wish someone had handed you on your first day.]\n:::';
    expect(deriveExcerpt(md)).toBe('Write the post you wish someone had handed you on your first day.');
    expect(wordCount(md)).toBe(13);
  });

  // A directive nested in a blockquote is still a real directive. The blockquote strip has to run
  // first, or the directive rule misses the line and the blockquote rule then exposes its markup.
  it('drops an include nested in a blockquote instead of exposing its markup', () => {
    expect(deriveExcerpt('> ::include{fragment="notice"}\n\nStay safe out there.')).toBe('Stay safe out there.');
  });

  it('unwraps a label that carries a link, keeping the text and dropping the target', () => {
    expect(deriveExcerpt(':::cta[Read the guide](https://example.test)\n:::')).toBe('Read the guide');
  });

  // At four spaces the line is an indented code block, not a directive, so its text is literal.
  it('leaves a four-space-indented directive line as literal text', () => {
    expect(deriveExcerpt('Before.\n\n    ::include{fragment="notice"}')).toContain('::include');
  });

  // Colons followed by a space are prose, not a directive. The blockquote rule runs first, so
  // without a name-or-nothing requirement the directive rule would swallow any heading or quote
  // whose text merely opens with two colons.
  it('keeps a heading whose text merely begins with colons', () => {
    expect(deriveExcerpt('## :: A note on colons\n\nBody text here.')).toBe(':: A note on colons Body text here.');
  });

  it('keeps a blockquote whose text merely begins with colons', () => {
    expect(deriveExcerpt('> :: quoted colons\n\nBody text here.')).toBe(':: quoted colons Body text here.');
  });

  it('cuts a long body at a word boundary with an ellipsis, never mid-word', () => {
    const body = 'one two three four five';
    expect(deriveExcerpt(body, { maxChars: 12 })).toBe('one two…');
  });

  it('adds no ellipsis when the body fits exactly within maxChars', () => {
    const body = 'one two three';
    expect(deriveExcerpt(body, { maxChars: body.length })).toBe(body);
  });

  it('degrades sanely when there is no space before maxChars: a hard cut plus an ellipsis', () => {
    const body = 'supercalifragilisticexpialidocious';
    expect(deriveExcerpt(body, { maxChars: 10 })).toBe('supercalif…');
  });

  it('returns an empty string for an empty body', () => {
    expect(deriveExcerpt('')).toBe('');
  });
});

describe('wordCount', () => {
  it('counts words in the stripped body', () => {
    expect(wordCount('# Title\n\nThree more words.')).toBe(4);
  });
  it('returns zero for an empty body', () => {
    expect(wordCount('')).toBe(0);
  });
});
