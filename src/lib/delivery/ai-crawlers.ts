// cairn-cms: the AI training-crawler table `buildRobots` reads under `posture: 'decline'`. Every
// record's `citation` is a first-party page from the operator itself, verified on 2026-08-05; the
// evidence, including the compliance quote pulled from each page, is recorded in
// docs/internal/2026-08-05-ai-crawler-token-verification.md. A token no first-party page documents
// does not ship here, however widely it is repeated elsewhere, which is why Bytespider is absent:
// ByteDance publishes no first-party documentation of that token at all.
//
// This table carries training tokens only. Googlebot, OAI-SearchBot, and Claude-SearchBot are
// search crawlers, deliberately excluded, since disallowing a search crawler costs a site its
// search presence for no training benefit.
//
// Listing a token here is a request, not an enforcement mechanism. Each operator's own page
// documents robots.txt as the control for its token, and four of the seven (Amazon, Anthropic,
// Google, Common Crawl) state outright that they honor it; the other three document the control
// without making that promise in those words. A declining site is asking, not blocking. See
// `AiPosture` on `CairnAdapter` for the honesty constraint this table exists to satisfy, and the
// verification doc above for what each operator actually says.

/**
 * One training crawler's robots.txt token, its operator, and the first-party page documenting it.
 * `note`, when present, qualifies a claim the operator's own page does not make (see `CCBot`'s
 * record), so the shipped table never puts words in an operator's mouth.
 */
export interface AiCrawler {
  /** The exact `User-agent` token, e.g. `GPTBot`. */
  token: string;
  /** The organization that operates the crawler. */
  operator: string;
  /** Always `'training'` today; the table carries no other category. */
  category: 'training';
  /** The operator's own documentation of this token. Always an `https:` URL. */
  citation: string;
  /** A qualification the operator's own page does not itself state; omitted when none applies. */
  note?: string;
}

/** The training-crawler table `buildRobots` disallows under `posture: 'decline'`. */
export const AI_CRAWLERS: readonly AiCrawler[] = [
  {
    token: 'Amazonbot',
    operator: 'Amazon',
    category: 'training',
    citation: 'https://developer.amazon.com/amazonbot',
  },
  {
    token: 'Applebot-Extended',
    operator: 'Apple',
    category: 'training',
    citation: 'https://support.apple.com/en-us/119829',
  },
  {
    token: 'CCBot',
    operator: 'Common Crawl',
    category: 'training',
    citation: 'https://commoncrawl.org/ccbot',
    note:
      "Common Crawl's own pages describe an open web-archive corpus for research and do not " +
      'themselves claim the data trains AI models, unlike the other operators in this table. That ' +
      'corpus is nonetheless a widely used upstream of AI training, which is why declining CCBot ' +
      'is still the right line for a declining site to emit.',
  },
  {
    token: 'ClaudeBot',
    operator: 'Anthropic',
    category: 'training',
    citation: 'https://support.claude.com/en/articles/8896518',
  },
  {
    token: 'Google-Extended',
    operator: 'Google',
    category: 'training',
    citation: 'https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers',
  },
  {
    token: 'GPTBot',
    operator: 'OpenAI',
    category: 'training',
    citation: 'https://developers.openai.com/api/docs/bots',
  },
  {
    token: 'meta-externalagent',
    operator: 'Meta',
    category: 'training',
    citation: 'https://developers.facebook.com/docs/sharing/webmasters/crawler',
  },
];

/** The date this table was last verified against every operator's first-party documentation. */
export const AI_CRAWLERS_REVIEWED = '2026-08-05';
