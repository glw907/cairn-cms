# AI crawler token verification (2026-08-05)

The first-party verification behind `src/lib/delivery/ai-crawlers.ts`, run during the AI-posture pass.
The pass's governing constraint: a token no first-party page documents does not ship, however widely
it is repeated. Every record in the shipped table cites the operator's own documentation, and this
file records what that verification found, including the two records it changed.

## The table that ships

| Token | Operator | First-party citation |
|---|---|---|
| `Amazonbot` | Amazon | https://developer.amazon.com/amazonbot |
| `Applebot-Extended` | Apple | https://support.apple.com/en-us/119829 |
| `CCBot` | Common Crawl | https://commoncrawl.org/ccbot |
| `ClaudeBot` | Anthropic | https://support.claude.com/en/articles/8896518 |
| `Google-Extended` | Google | https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers |
| `GPTBot` | OpenAI | https://developers.openai.com/api/docs/bots |
| `meta-externalagent` | Meta | https://developers.facebook.com/docs/sharing/webmasters/crawler |

Each operator's page states that the token honors robots.txt, in these terms:

- Amazon: "Automated crawling from these listed user agents respects the Robots Exclusion Protocol,
  honoring the user-agent and the allow/disallow directives."
- Apple: "Web publishers can opt-out from having their content used to train generative foundation
  models by disallowing Applebot-Extended in the robots.txt file." Applebot-Extended does not crawl.
  It flags how data Applebot already fetched may be used.
- Common Crawl: "CCBot is an automated crawler, checking first the robots.txt, and if crawling a page
  is allowed, fetches pages using HTTP GET requests."
- Anthropic: "Anthropic's Bots respect 'do not crawl' signals by honoring industry standard
  directives in robots.txt."
- Google: "They always obey robots.txt rules when crawling automatically."
- OpenAI: the page documents the effect rather than making a bare promise. "Disallowing GPTBot
  indicates a site's content should not be used in training generative AI foundation models."
- Meta: robots.txt is the documented control. The page names `Meta-ExternalFetcher` and
  `FacebookExternalHit` as the crawlers that may bypass it, and `meta-externalagent` is not among
  them.

## Bytespider does not ship, against the plan's own starting set

The plan named Bytespider in the starting set and said it would stay in the table with its record
noting that ByteDance publishes no compliance commitment. Verification found something stronger than
the plan assumed: **ByteDance publishes no first-party documentation of the token at all.** Every
description of Bytespider found in the sweep is an aggregator, a bot-detection vendor, or an SEO
article. TikTok's own `robots.txt` names `Bytespider` only as a token it blocks, which is TikTok
blocking someone else's crawler rather than ByteDance documenting its own.

The plan's global constraint and its own "trimmed if any fails" clause both resolve this the same
way, so the token is dropped. The guide states the omission and why, so a developer comparing cairn's
output against Cloudflare's managed list (which does carry Bytespider) can see the reason rather than
read it as a gap. A site that wants the line can add it through the existing `disallow` option or at
the edge.

## CCBot's record carries a note, because its operator claims less than the table's category does

The table's category is `training`, and six of the seven operators say on their own pages that the
token feeds AI model training. Common Crawl does not. Its own pages describe an open web-archive
corpus for research, and say nothing about AI training. That Common Crawl dumps feed many training
sets is a widely known third-party fact, not a first-party claim, and this pass does not put
unsourced claims in shipped strings.

So the CCBot record carries a note recording exactly that, and the guide repeats it. Declining CCBot
is still the right line to emit for a declining site, because the corpus is the upstream of the
training use. The record just does not put words in Common Crawl's mouth.

## Content-Signal syntax

Cited to https://blog.cloudflare.com/content-signals-policy/, corroborated against the live file at
https://developers.cloudflare.com/robots.txt.

Directive `Content-Signal`, keys `search`, `ai-input`, `ai-train`, values `yes` and `no`, pairs
separated by a comma and a space. An absent key is no expressed preference, which is why a declining
site emits `ai-train=no` alone: cairn has no standing to assert a search preference on the site's
behalf.

Cloudflare's managed robots.txt appends a fourth key, `use=` with values `immediate`, `reference`,
and `full`. It appears in the managed output measured on the estate and in the managed-robots-txt
docs page, and not in the policy the blog post publishes. It is treated here as a newer managed
addition rather than core syntax, and cairn does not emit it.

## The user-triggered-fetch exemption

Both citations are first-party and both go in the guide.

- OpenAI, `ChatGPT-User`: "Because these actions are initiated by a user, robots.txt rules may not
  apply." https://developers.openai.com/api/docs/bots
- Perplexity, `Perplexity-User`: "Since a user requested the fetch, this fetcher generally ignores
  robots.txt rules." https://docs.perplexity.ai/docs/resources/perplexity-crawlers

The Perplexity help-center article carrying the same statement returns 403 to a non-browser fetch, so
the `docs.perplexity.ai` page is the citation of record.

## The search crawlers the table deliberately excludes

Disallowing these costs a site its search presence for no training benefit, which is why the table
carries training tokens only.

- `Googlebot` fetches pages for the main search index; `Google-Extended` is the training control.
  https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers
- `OAI-SearchBot` "is used to surface websites in search results in ChatGPT's search features."
  https://developers.openai.com/api/docs/bots
- `Claude-SearchBot` "navigates the web to improve search result quality for users."
  https://support.claude.com/en/articles/8896518
