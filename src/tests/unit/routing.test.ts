import { describe, it, expect } from 'vitest';
import { resolveRouting } from '../../lib/content/concepts.js';

describe('resolveRouting', () => {
  it('expands the named shorthands to the exact rules and defaults to page', () => {
    expect(resolveRouting('feed')).toEqual({ routable: true, dated: true, inFeeds: true });
    expect(resolveRouting('page')).toEqual({ routable: true, dated: false, inFeeds: false });
    expect(resolveRouting('embedded')).toEqual({ routable: false, dated: false, inFeeds: false });
    expect(resolveRouting(undefined)).toEqual({ routable: true, dated: false, inFeeds: false });
  });
  it('passes an explicit rule through unchanged', () => {
    const rule = { routable: true, dated: true, inFeeds: false };
    expect(resolveRouting(rule)).toEqual(rule);
  });
});
