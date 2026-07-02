import { describe, it, expect } from 'vitest';
import { resolveRouting } from '../../lib/content/concepts.js';

describe('resolveRouting', () => {
  it('expands the named shorthands to the exact rules and defaults to page', () => {
    expect(resolveRouting('feed', 'posts')).toEqual({ routable: true, dated: true, inFeeds: true });
    expect(resolveRouting('page', 'posts')).toEqual({ routable: true, dated: false, inFeeds: false });
    expect(resolveRouting('embedded', 'posts')).toEqual({ routable: false, dated: false, inFeeds: false });
    expect(resolveRouting(undefined, 'posts')).toEqual({ routable: true, dated: false, inFeeds: false });
  });

  // Surface-pruning Task 5: RoutingRule left ConceptConfig.routing's public type, so resolveRouting
  // no longer accepts an explicit rule; only the three named shorthands (or undefined) typecheck.
  // The runtime guard added alongside also throws if a cast forces an object through.
  it('rejects an explicit rule at compile time, and throws if a cast forces it through at runtime', () => {
    expect(() => {
      // @ts-expect-error routing accepts only the 'feed' | 'page' | 'embedded' shorthand now
      resolveRouting({ routable: true, dated: true, inFeeds: false }, 'posts');
    }).toThrow('cairn: concept "posts" routing "[object Object]" must be one of feed, page, embedded');
  });

  // Defense in depth: an untyped caller (or a value that survived a cast) can still hand
  // resolveRouting a defined-but-unrecognized string. That must fail loudly, the same way
  // parseSiteConfig's unknown-key check does, rather than silently falling through.
  it('throws on a defined-but-unrecognized routing value, naming the concept and the valid shorthands', () => {
    expect(() => resolveRouting('feeds' as never, 'posts')).toThrow(
      'cairn: concept "posts" routing "feeds" must be one of feed, page, embedded',
    );
  });
});
