import { describe, it, expect } from 'vitest';
import { AI_CRAWLERS, AI_CRAWLERS_REVIEWED, type AiCrawler } from '../../lib/delivery/ai-crawlers.js';

// The excluded search crawlers, tested by absence: disallowing them would cost a site its search
// presence for no training benefit, so they must never appear in the training table.
const EXCLUDED_SEARCH_TOKENS = ['Googlebot', 'OAI-SearchBot', 'Claude-SearchBot'];

describe('AI_CRAWLERS', () => {
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
    const tokens = AI_CRAWLERS.map((c: AiCrawler) => c.token);
    for (const excluded of EXCLUDED_SEARCH_TOKENS) {
      expect(tokens).not.toContain(excluded);
    }
  });

  it('excludes Bytespider, which no first-party page documents', () => {
    expect(AI_CRAWLERS.map((c: AiCrawler) => c.token)).not.toContain('Bytespider');
  });

  it("qualifies CCBot's training claim with a note, since Common Crawl's own pages do not make it", () => {
    const ccbot = AI_CRAWLERS.find((c: AiCrawler) => c.token === 'CCBot');
    expect(ccbot?.note).toBeTruthy();
  });
});

describe('AI_CRAWLERS_REVIEWED', () => {
  it('is a non-empty date string', () => {
    expect(AI_CRAWLERS_REVIEWED.length).toBeGreaterThan(0);
    expect(new Date(AI_CRAWLERS_REVIEWED).toString()).not.toBe('Invalid Date');
  });
});
