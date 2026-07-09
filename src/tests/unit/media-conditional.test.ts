import { describe, it, expect } from 'vitest';
import { deriveOnlyIf, deriveRange } from '../../lib/sveltekit/media-conditional.js';

describe('deriveOnlyIf', () => {
  it('returns undefined when no conditional header is present', () => {
    expect(deriveOnlyIf(new Headers())).toBeUndefined();
  });

  it('derives etagMatches from a strong If-Match', () => {
    const headers = new Headers({ 'If-Match': '"abc123"' });
    expect(deriveOnlyIf(headers)).toEqual({ etagMatches: 'abc123' });
  });

  it('strips a weak W/ prefix and quotes from If-None-Match', () => {
    const headers = new Headers({ 'If-None-Match': 'W/"abc123"' });
    expect(deriveOnlyIf(headers)).toEqual({ etagDoesNotMatch: 'abc123' });
  });

  it('omits etagMatches for a multi-valued If-Match', () => {
    const headers = new Headers({ 'If-Match': '"abc123", "def456"' });
    expect(deriveOnlyIf(headers)).toBeUndefined();
  });

  it('omits etagDoesNotMatch for a wildcard If-None-Match', () => {
    const headers = new Headers({ 'If-None-Match': '*' });
    expect(deriveOnlyIf(headers)).toBeUndefined();
  });

  it('derives uploadedAfter and secondsGranularity from If-Modified-Since', () => {
    const headers = new Headers({ 'If-Modified-Since': 'Wed, 21 Oct 2015 07:28:00 GMT' });
    const result = deriveOnlyIf(headers);
    expect(result?.uploadedAfter).toEqual(new Date('Wed, 21 Oct 2015 07:28:00 GMT'));
    expect(result?.secondsGranularity).toBe(true);
  });

  it('derives uploadedBefore and secondsGranularity from If-Unmodified-Since', () => {
    const headers = new Headers({ 'If-Unmodified-Since': 'Wed, 21 Oct 2015 07:28:00 GMT' });
    const result = deriveOnlyIf(headers);
    expect(result?.uploadedBefore).toEqual(new Date('Wed, 21 Oct 2015 07:28:00 GMT'));
    expect(result?.secondsGranularity).toBe(true);
  });

  it('omits the date field for an unparsable If-Modified-Since', () => {
    const headers = new Headers({ 'If-Modified-Since': 'not-a-date' });
    expect(deriveOnlyIf(headers)).toBeUndefined();
  });

  it('combines an etag and a date into one plain object', () => {
    const headers = new Headers({
      'If-None-Match': '"abc123"',
      'If-Modified-Since': 'Wed, 21 Oct 2015 07:28:00 GMT',
    });
    const result = deriveOnlyIf(headers);
    expect(result?.etagDoesNotMatch).toBe('abc123');
    expect(result?.uploadedAfter).toEqual(new Date('Wed, 21 Oct 2015 07:28:00 GMT'));
    expect(result?.secondsGranularity).toBe(true);
  });

  it('survives structuredClone (no Headers instance anywhere in the result)', () => {
    const headers = new Headers({
      'If-None-Match': '"abc123"',
      'If-Modified-Since': 'Wed, 21 Oct 2015 07:28:00 GMT',
    });
    const result = deriveOnlyIf(headers);
    expect(() => structuredClone(result)).not.toThrow();
  });
});

describe('deriveRange', () => {
  it('parses a bounded range bytes=a-b', () => {
    expect(deriveRange('bytes=2-5')).toEqual({ offset: 2, length: 4 });
  });

  it('parses an open-ended range bytes=a-', () => {
    expect(deriveRange('bytes=10-')).toEqual({ offset: 10 });
  });

  it('parses a suffix range bytes=-n', () => {
    expect(deriveRange('bytes=-500')).toEqual({ suffix: 500 });
  });

  it('returns undefined for a multi-range value', () => {
    expect(deriveRange('bytes=0-1,4-5')).toBeUndefined();
  });

  it('returns undefined for a malformed value', () => {
    expect(deriveRange('not-a-range')).toBeUndefined();
    expect(deriveRange('bytes=')).toBeUndefined();
    expect(deriveRange('bytes=-')).toBeUndefined();
  });

  it('returns undefined when the end precedes the start', () => {
    expect(deriveRange('bytes=5-2')).toBeUndefined();
  });
});
