// Task 9: the pure git-committed personal dictionary store (spec 1.6). One word per line, sorted,
// comment and blank lines tolerated on read. The merge is case-insensitive, idempotent, and
// order-independent, so the action's commit-and-retry re-merges at a moved head and reaches the same
// sorted set. The action validates inbound words against isValidDictionaryWord before the merge, so a
// newline or control character can never inject an extra line into the committed file.
import { describe, it, expect } from 'vitest';
import {
  parseDictionary,
  mergeDictionaryWords,
  serializeDictionary,
  isValidDictionaryWord,
} from '../../lib/content/site-dictionary.js';

describe('parseDictionary', () => {
  it('reads one word per line, dropping comments and blank lines', () => {
    const text = '# cairn personal dictionary\n\nbeta\nalpha\n  # indented comment\ngamma\n';
    expect(parseDictionary(text)).toEqual(['beta', 'alpha', 'gamma']);
  });

  it('treats null and empty as an empty list', () => {
    expect(parseDictionary(null)).toEqual([]);
    expect(parseDictionary('')).toEqual([]);
    expect(parseDictionary('# only a header\n')).toEqual([]);
  });

  it('trims surrounding whitespace on each kept line', () => {
    expect(parseDictionary('  alpha  \n\tbeta\t\n')).toEqual(['alpha', 'beta']);
  });
});

describe('mergeDictionaryWords', () => {
  it('unions and sorts case-insensitively', () => {
    expect(mergeDictionaryWords(['gamma', 'alpha'], ['beta'])).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('is idempotent: adding an existing word is a no-op (collapses by case)', () => {
    expect(mergeDictionaryWords(['Cairn', 'beta'], ['cairn'])).toEqual(['beta', 'Cairn']);
    expect(mergeDictionaryWords(['alpha'], ['alpha'])).toEqual(['alpha']);
  });

  it('keeps the first-seen casing of a word', () => {
    expect(mergeDictionaryWords(['Cairn'], ['CAIRN'])).toEqual(['Cairn']);
  });

  it('is order-independent: the same additions at a moved head yield the same set', () => {
    // The retry re-reads a moved head (a concurrent editor's word already landed) and re-merges the
    // pending additions. The result must match a merge done the other way round.
    const headA = ['alpha', 'newword'];
    const headB = ['newword', 'alpha'];
    const additions = ['beta'];
    expect(mergeDictionaryWords(headA, additions)).toEqual(mergeDictionaryWords(headB, additions));
    expect(mergeDictionaryWords(headA, additions)).toEqual(['alpha', 'beta', 'newword']);
  });

  it('skips invalid additions as a backstop', () => {
    expect(mergeDictionaryWords(['alpha'], ['bad word', 'with\nnewline', ''])).toEqual(['alpha']);
  });
});

describe('serializeDictionary', () => {
  it('writes a header, then one sorted word per line, with a trailing newline', () => {
    const out = serializeDictionary(['gamma', 'alpha', 'beta']);
    const lines = out.split('\n');
    expect(lines[0]).toMatch(/^#/);
    expect(lines.slice(1, 4)).toEqual(['alpha', 'beta', 'gamma']);
    expect(out.endsWith('\n')).toBe(true);
  });

  it('round-trips through parse to the canonical sorted set', () => {
    const text = serializeDictionary(['Cairn', 'alpha', 'cairn']);
    expect(mergeDictionaryWords(parseDictionary(text), [])).toEqual(['alpha', 'Cairn']);
  });

  it('serializes an empty list to just the header', () => {
    expect(serializeDictionary([])).toBe('# cairn personal dictionary: one word per line, sorted, kept in git.\n');
  });
});

describe('isValidDictionaryWord', () => {
  it('accepts a single token within the length bound', () => {
    expect(isValidDictionaryWord('cairn')).toBe(true);
    expect(isValidDictionaryWord("O'Brien")).toBe(true);
  });

  it('rejects whitespace, newlines, control characters, and empties', () => {
    expect(isValidDictionaryWord('two words')).toBe(false);
    expect(isValidDictionaryWord('line\nbreak')).toBe(false);
    expect(isValidDictionaryWord('tab\tinside')).toBe(false);
    expect(isValidDictionaryWord('')).toBe(false);
  });

  it('rejects an over-length word', () => {
    expect(isValidDictionaryWord('a'.repeat(65))).toBe(false);
    expect(isValidDictionaryWord('a'.repeat(64))).toBe(true);
  });
});
