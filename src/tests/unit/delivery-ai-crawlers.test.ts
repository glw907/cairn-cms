import { describe, it, expect } from 'vitest';
import { AI_CRAWLERS } from '../../lib/delivery/ai-crawlers.js';

// The excluded search crawlers, tested by absence: disallowing them would cost a site its search
// presence for no training benefit, so they must never appear in the training table.
const EXCLUDED_SEARCH_TOKENS = ['Googlebot', 'OAI-SearchBot', 'Claude-SearchBot'];

describe('AI_CRAWLERS', () => {
  // Every assertion below iterates the table, so an emptied table would pass all of them
  // vacuously while a declining site silently emitted no Disallow group at all. Pin the count
  // first, so the structural gate cannot report green on exactly the failure it exists to catch.
  it('carries the seven verified records', () => {
    expect(AI_CRAWLERS).toHaveLength(7);
  });

  it('carries a citation that parses as an https: URL for every record', () => {
    for (const crawler of AI_CRAWLERS) {
      expect(crawler.citation.length).toBeGreaterThan(0);
      expect(() => new URL(crawler.citation)).not.toThrow();
      expect(new URL(crawler.citation).protocol).toBe('https:');
    }
  });

  it('carries a non-empty token and operator for every record', () => {
    for (const crawler of AI_CRAWLERS) {
      expect(crawler.token.length).toBeGreaterThan(0);
      expect(crawler.operator.length).toBeGreaterThan(0);
    }
  });

  it('excludes the search-crawler tokens', () => {
    const tokens = AI_CRAWLERS.map((c) => c.token);
    for (const excluded of EXCLUDED_SEARCH_TOKENS) {
      expect(tokens).not.toContain(excluded);
    }
  });

  it('excludes Bytespider, which no first-party page documents', () => {
    expect(AI_CRAWLERS.map((c) => c.token)).not.toContain('Bytespider');
  });

  it("qualifies CCBot's training claim with a note, since Common Crawl's own pages do not make it", () => {
    const ccbot = AI_CRAWLERS.find((c) => c.token === 'CCBot');
    expect(ccbot?.note).toBeTruthy();
  });
});
