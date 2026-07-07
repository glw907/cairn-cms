import { describe, it, expect } from 'vitest';
import { deriveExcerpt, wordCount } from '../../lib/content/excerpt.js';

describe('deriveExcerpt', () => {
  it('prefers a frontmatter description', () => {
    expect(deriveExcerpt('# Heading\n\nBody text.', { description: 'The summary.' })).toBe('The summary.');
  });

  it('strips markdown from the body when there is no description', () => {
    expect(deriveExcerpt('## Title\n\nA [link](/x) and `code`.')).toBe('Title A link and code.');
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
