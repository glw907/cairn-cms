import { describe, expect, it } from 'vitest';
import { isBannerExpired } from './banner-expiry.js';

describe('isBannerExpired', () => {
  const now = new Date('2026-06-15T12:00:00');

  it('is expired with no expires date', () => {
    expect(isBannerExpired(undefined, now)).toBe(true);
  });

  it('is expired with an unparsable expires date', () => {
    expect(isBannerExpired('not-a-date', now)).toBe(true);
  });

  it('shows through the end of the expires day', () => {
    expect(isBannerExpired('2026-06-15', now)).toBe(false);
  });

  it('expires the day after the expires date', () => {
    expect(isBannerExpired('2026-06-14', now)).toBe(true);
  });

  it('is not expired for a future date', () => {
    expect(isBannerExpired('2026-06-16', now)).toBe(false);
  });
});
