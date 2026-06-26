import { describe, it, expect } from 'vitest';
import { compilePattern, stringLengthError, patternError, dateBoundsError } from '../../lib/content/field-rules.js';

describe('field-rules', () => {
  it('stringLengthError matches v1 wording', () => {
    expect(stringLengthError('ab', { min: 3 }, 'Name')).toBe('Name must be at least 3 characters');
    expect(stringLengthError('abcd', { max: 3 }, 'Name')).toBe('Name must be at most 3 characters');
    expect(stringLengthError('abcd', { length: 3 }, 'Name')).toBe('Name must be exactly 3 characters');
    expect(stringLengthError('abc', { min: 1, max: 5 }, 'Name')).toBeNull();
  });
  it('patternError matches v1 wording', () => {
    expect(patternError('xy', compilePattern('^\\d+$', 'Code'), 'Code')).toBe('Code is not in the expected format');
    expect(patternError('12', compilePattern('^\\d+$', 'Code'), 'Code')).toBeNull();
  });
  it('dateBoundsError matches v1 wording', () => {
    expect(dateBoundsError('2019-01-01', { min: '2020-01-01' }, 'Date')).toBe('Date must be on or after 2020-01-01');
    expect(dateBoundsError('2021-01-01', { max: '2020-12-31' }, 'Date')).toBe('Date must be on or before 2020-12-31');
    expect(dateBoundsError('2020-06-01', { min: '2020-01-01', max: '2020-12-31' }, 'Date')).toBeNull();
  });
  it('compilePattern throws a labeled error on a bad pattern', () => {
    expect(() => compilePattern('(', 'Code')).toThrow(/Code/);
  });
});
