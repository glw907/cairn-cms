# Choose an AI posture

Your adapter can carry `aiPosture`, set to `'decline'` or `'invite'`
([`CairnAdapter.aiPosture`](../reference/core.md#types)). Left unset, cairn writes nothing and
guesses nothing: your `robots.txt` looks exactly as it did before this field existed. That is a
legitimate choice, not a gap to fill in. Set the field once you have actually decided which way
your site should face AI training crawlers; this guide covers what each direction does, what it
doesn't do, and the one Cloudflare interaction that determines what a crawler actually sees.

Wherever this guide states a fact about how a crawler or a platform behaves, it cites the
operator's own page. A robots.txt line is a request, and the honesty this guide holds to is the
same one cairn's own doc comments and reference pages hold to: nothing here reads as "blocks AI
training," because nothing in this stack can make that claim truthfully.

## What `decline` writes

Your site's `robots.txt` route passes `aiPosture` to
[`robotsResponse`](../reference/delivery-data.md#robotsresponse) ([wiring it up](./wire-the-delivery-surface.md#publish-feeds-a-sitemap-and-robotstxt)
covers the route itself). Under `'decline'`, [`buildRobots`](../reference/delivery-data.md#buildrobots)
adds one `User-agent` / `Disallow: /` group per token in
[`AI_CRAWLERS`](../reference/delivery-data.md#ai_crawlers), the maintained table of training-crawler
tokens, plus a `Content-Signal: ai-train=no` line following
[Cloudflare's published Content-Signal policy](https://blog.cloudflare.com/content-signals-policy/).
cairn writes only the `ai-train` key; it has no standing to state a search preference on your
site's behalf, so `search` and `ai-input` stay unset.

The table carries training tokens only, never a search crawler. Disallowing Googlebot or a search
variant like OpenAI's `OAI-SearchBot` or Anthropic's `Claude-SearchBot` costs a site its search
presence for no training benefit, so none of the three appear here.

The table today:

| Token | Operator | First-party citation |
| --- | --- | --- |
| `Amazonbot` | Amazon | <https://developer.amazon.com/amazonbot> |
| `Applebot-Extended` | Apple | <https://support.apple.com/en-us/119829> |
| `CCBot` | Common Crawl | <https://commoncrawl.org/ccbot> |
| `ClaudeBot` | Anthropic | <https://support.claude.com/en/articles/8896518> |
| `Google-Extended` | Google | <https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers> |
| `GPTBot` | OpenAI | <https://developers.openai.com/api/docs/bots> |
| `meta-externalagent` | Meta | <https://developers.facebook.com/docs/sharing/webmasters/crawler> |

A token reaches this table only when the operator itself documents it. Plenty of tokens circulate
in aggregator lists and bot-vendor writeups with no operator page behind them, and those are the
ones cairn declines to ship. That is why one widely repeated token, ByteDance's `Bytespider`, is absent: ByteDance
publishes no first-party documentation of that token at all, so cairn has nothing to cite and
ships nothing. If you want the line anyway, either add it to your own site's `disallow` list on
`robotsResponse` or block it at the edge; either is a decision this guide leaves to you rather than
one cairn can back with a citation.

`CCBot`'s record in the table carries a qualification the other six don't need. Six of the seven
operators state on their own pages that the token feeds AI model training. Common Crawl's pages
describe an open web-archive corpus for research and don't make that claim about their own
service. Declining `CCBot` is still the right line for a declining site to write, since that
corpus is a widely used upstream of AI training, but cairn doesn't put words in Common Crawl's
mouth that its own page doesn't say.

## What `invite` writes

Under `'invite'`, `buildRobots` writes `Content-Signal: search=yes, ai-train=yes` and no
`Disallow` lines at all, because there's no robots directive that summons a crawler. Robots.txt
can only ask an obedient crawler to stay away; it has no opposite move that reaches out and pulls
one in. That asymmetry runs through this whole guide. A site can decline credibly, since every operator in
the table above documents robots.txt as the control for its token. No site can make a crawler
arrive.

## Declining is a request, not a block

Four of the seven operators state outright on their own pages that the token honors robots.txt.
Google's crawler docs say it "always obey[s] robots.txt rules when crawling automatically."
Amazon's say Amazonbot's crawling "respects the Robots Exclusion Protocol, honoring the user-agent
and the allow/disallow directives." Anthropic's say its bots "respect 'do not crawl' signals by
honoring industry standard directives in robots.txt." Common Crawl's say CCBot checks robots.txt
first and fetches only where crawling is allowed.

The other three document robots.txt as the control without making that promise in those words, and
the difference is worth knowing before you rely on it. Apple documents disallowing
`Applebot-Extended` as the opt-out from training use, and that token doesn't crawl at all: it flags
how data Applebot already fetched may be used. OpenAI documents the effect of the directive,
"Disallowing GPTBot indicates a site's content should not be used in training generative AI
foundation models," rather than a statement about what OpenAI does. Meta names robots.txt as the
control and lists the crawlers that may bypass it; `meta-externalagent` isn't among them, which is
an inference from that list rather than something Meta states.

None of that is enforcement. A `Disallow: /` line is a published preference a well-behaved crawler
chooses to read and act on, the same as a "no soliciting" sign is a preference a courteous visitor
chooses to respect. Nothing in cairn, in robots.txt, or in the `Content-Signal` extension can stop
an HTTP request from arriving. The one layer with actual enforcement is covered further down, and
it isn't robots.txt.

### The user-triggered-fetch exemption

Two of the crawlers a declining site is trying to keep out have a documented carve-out for a
different kind of request from the same operator. OpenAI's `ChatGPT-User` docs say that "because
these actions are initiated by a user, robots.txt rules may not apply." Perplexity's
`Perplexity-User` docs say, in the same spirit, that "since a user requested the fetch, this
fetcher generally ignores robots.txt rules." Both are first-party statements about the operators'
own live agent fetchers, not about their training crawlers. A fully declining site can still be
fetched the moment someone asks ChatGPT or Perplexity about it directly; the declined tokens above
are the automated training crawl, not the live answer to a live question.

### Nothing here is retroactive

A robots.txt line, however completely a crawler honors it, only ever governs a future request.
Declining `CCBot` today does not withdraw a Common Crawl dump that already shipped, and no
`Disallow` line anywhere untrains a model that already learned from your content. If your content
has already been crawled, this configuration changes what happens next, not what already happened.

## The layer with real teeth is Cloudflare's, and it isn't cairn's to configure

Every cairn site runs on Cloudflare, and Cloudflare's own edge product,
[AI Crawl Control](https://developers.cloudflare.com/ai-crawl-control/), categorizes crawler traffic
and can allow or block a crawler at the edge, independent of whether that crawler reads or honors
anything cairn writes. That is real enforcement, in the sense the robots.txt table above
deliberately is not, because it runs before a request ever reaches your site's origin. Cloudflare
documents a third action, [charging per crawl](https://developers.cloudflare.com/ai-crawl-control/features/pay-per-crawl/what-is-pay-per-crawl/);
check that page for its current availability before planning around it.

Configuring AI Crawl Control is your infrastructure's job, not cairn's. It lives in your Cloudflare
account, it governs traffic to more than the content this engine serves, and cairn has no seam that
reaches into a zone's WAF or bot-management settings. What cairn does instead is described below:
it fetches your own site's live `robots.txt` and tells you what actually shipped, because that edge
layer can rewrite the very file cairn generated before it ever reaches a crawler.

## Serve raw markdown alongside your pages

The other direction, inviting rather than declining, has one thing cairn can genuinely do well: it
already stores your content as markdown, so serving that markdown back is a direct read rather than
a reconstruction. Every routable, non-`noindex` entry gets a `.md`-suffixed twin of its own URL,
built from [`createPublicRoutes`](../reference/delivery.md#createpublicroutes)'s
`markdownEntries`/`markdownLoad` pair and wrapped in a response by
[`markdownResponse`](../reference/delivery-data.md#markdownresponse). Wire the twin's route
prerendered, as the showcase does, and it can only ever reach published `main` content, since a
prerender runs against the committed branch and there's no request path by which a pending
`cairn/*` edit branch reaches it. A runtime route reopens that question.
[`CairnHead`](../reference/delivery.md#cairnhead) adds a `rel="alternate" type="text/markdown"`
link pointing at the twin, so a page that links to itself also links to its own raw source.

Measured off a real build served through `wrangler dev`, the twin arrives as
`Content-Type: text/markdown; charset=utf-8`, matching the value `markdownResponse` sets. Treat that
as a match rather than as the engine's header surviving. For a prerendered route the served header
comes from Cloudflare's static-asset layer, which derives a content type from the file extension
rather than from what the origin sent, and the engine's `.xml` sitemap and feed lose their charset
on the way out for the same reason. Why `.md` keeps a charset where `.xml` doesn't is an
observation, not a rule Cloudflare publishes, so it's worth re-measuring rather than relying on.

Measure against `wrangler dev`, not `vite preview`. The two derive the header differently for the
identical built file, and `vite preview` reports `text/markdown` with no charset, so the local
server you pick changes the answer you get.

## Negotiate content type at the edge

A separate convention lets an agent ask for markdown on the very same URL a browser uses, with an
`Accept: text/markdown` request header instead of a `.md` suffix. cairn's engine can't answer that
header itself. The public catch-all route is prerendered
(`export const prerender = true`), so a request for a content page is served entirely by
Cloudflare's static-asset layer; the Worker, and everything cairn's `handle` hook could otherwise
inspect, never sees it. Making the Worker see the header means turning on `run_worker_first` for
content paths, which converts every public page view, the free static hit `prerender` exists to
produce, into a Worker invocation. That cost buys a feature no training crawler is documented
sending this header for in the first place (see below), so the engine doesn't pay it.

The shape that keeps static serving is zone config: a Cloudflare Transform Rule that matches the
`Accept` header on a content request and rewrites the path to the `.md` twin before the response is
served, so the rewritten path is what gets cached, under its own cache key distinct from the HTML
page at the same original URL. Cloudflare's dashboard walkthrough for creating one is at
[Create a URL Rewrite Rule](https://developers.cloudflare.com/rules/transform/url-rewrite/create-dashboard/);
follow that page for the current steps rather than a copy pasted here, since Cloudflare's own
dashboard is the thing that can change under it.

Illustrative only, not copy-paste-ready: a rewrite expression that appends `.md` to a matched
request's path looks something like `concat(http.request.uri.path, ".md")`, the same `concat`
shape Cloudflare's own documentation uses to build a rewritten path from a matched request. The
real field names, the `accept`-header match condition, and the full function list are Cloudflare's
own to maintain, not this guide's: see the
[URL Rewrite Rule reference](https://developers.cloudflare.com/rules/transform/url-rewrite/reference/fields-functions/),
the [rules-language functions reference](https://developers.cloudflare.com/ruleset-engine/rules-language/functions/),
and the [`http.request.headers` field reference](https://developers.cloudflare.com/ruleset-engine/rules-language/fields/reference/http.request.headers/)
for the syntax a real rule needs.

On ordering: Cloudflare's [request-phase list](https://developers.cloudflare.com/ruleset-engine/reference/phases-list/)
documents URL Rewrite Rules running in the `http_request_transform` phase, third in the pipeline,
and Cache Rules running in `http_request_cache_settings`, eighteenth. Cloudflare states that phase
order; it does not itself state that the rewrite therefore determines the cache key. The reading
above, that the twin ends up cached separately from the HTML page because the URL it's served
under has already changed by the time caching happens, follows from that documented ordering. It
is this guide's inference, not a sentence Cloudflare publishes.

Cloudflare also ships a managed, zero-config version of markdown serving, Markdown for Agents,
covered at [its own reference page](https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/)
and announced on [Cloudflare's blog](https://blog.cloudflare.com/markdown-for-agents/). Consult
those pages directly for which plans carry it and how to turn it on; both are Cloudflare's to keep
current, not this guide's to restate. The one distinction worth stating here, because it's the
whole reason cairn's own twin is worth having alongside or instead of the managed feature, is in
Cloudflare's own words: "Cloudflare will detect this, fetch the original HTML version from the
origin, and convert it to markdown before serving it to the client." That's a reconstruction, HTML
converted back into an approximation of markdown after the fact. cairn's twin is the opposite: the
markdown you actually wrote, served as-is. Cloudflare documents no interaction between Markdown for
Agents and URL Rewrite Rules, in the blog post, the reference page, or Cloudflare's changelog, so
running both on the same zone is an undocumented combination, not one this guide has tested or can
vouch for.

### Who actually sends the header

No training crawler in the table above documents sending `Accept: text/markdown`, or documents
anything about the header either way. So the negotiation recipe above serves a different audience: a live agent
acting on someone's actual request, not an automated training crawl. The crawling side of this
guide's goal is carried by the `.md` twins themselves, the `rel="alternate"` link pointing at them,
and simply not being edge-blocked, covered above.

One first-party counterexample is worth stating at its true scope rather than glossed over.
Anthropic's Claude Code documents its interactive `WebFetch` tool sending "an Accept header that
prefers Markdown over HTML so servers that support content negotiation can return Markdown
directly" (see [Claude Code's tools reference](https://code.claude.com/docs/en/tools-reference)).
That's a tool a person invokes mid-conversation to fetch one page they asked about, the same
user-triggered category as `ChatGPT-User` and `Perplexity-User` above, not an autonomous crawler
working through a site on its own. It's exactly why this recipe is written as serving agents, not
serving crawling.

## Why `llms.txt` isn't here

`llms.txt`, a proposed root-level file curating an AI-friendly summary of a site, is deliberately
absent from this guide's recommendations. Google's
[AI-optimization guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
states that maintaining one "will neither harm nor help your site's visibility or rankings in
Google Search, as Google Search ignores them." Two independent measurements of real traffic agree
the file goes largely unread. Ahrefs
[studied 137,210 domains](https://ahrefs.com/blog/llmstxt-study/) and found that of the roughly
38,000 carrying a valid file, 97% saw no requests for it at all in the month measured. A
[separate analysis of 6,122 domains](https://www.longato.ch/llmstxt-2026-june/) found that
verifiable AI models accounted for 1.1% of the 22,494 requests to the file over thirty days, and
that no request anywhere in those logs carried `/llms.txt` as its referrer. Neither OpenAI nor Anthropic
documents consuming a site's `llms.txt`, though both publish one for their own documentation. cairn
doesn't ship a feature built on a convention its own evidence says isn't reaching anyone.

## See the effective posture on a live site

The file cairn's `robots.txt` route generates and the file a crawler actually receives aren't
guaranteed to be the same file. Cloudflare's own managed robots.txt, when a zone has one turned on,
prepends its own rules to the origin's rather than replacing them, so the served file can carry two
separate `User-agent: *` groups with different, possibly conflicting, directives. `cairn-doctor`'s
`ai.posture-effective` check exists because of exactly that: it fetches your deployed origin's live
`/robots.txt` and reports what it actually contains, distinct from what your adapter states. See
["Make the stated AI posture effective"](./cloudflare-readiness.md#make-the-stated-ai-posture-effective)
for what each of its outcomes means and how to read a mismatch, and the
[`cairn-doctor` check table](../reference/doctor.md#the-checks) for the check's exact conditions.

A framework that doesn't know which edge it runs on can't write this check. It wouldn't know which
product to ask about, or what a managed robots.txt prepend looks like on the wire. That's narrowness
paying off, being built for one platform closely enough to reason about that platform's own layers,
rather than any special insight of cairn's own.

## Related reference

[`AiPosture`](../reference/core.md#types) is the type this whole guide configures.
[`buildRobots`](../reference/delivery-data.md#buildrobots) and
[`robotsResponse`](../reference/delivery-data.md#robotsresponse) are the builder and responder that
read it. [`AI_CRAWLERS`](../reference/delivery-data.md#ai_crawlers) and
[`AI_CRAWLERS_REVIEWED`](../reference/delivery-data.md#ai_crawlers_reviewed) are the maintained
table and its last-verified date. [`markdownResponse`](../reference/delivery-data.md#markdownresponse)
and [`createPublicRoutes`](../reference/delivery.md#createpublicroutes) build the markdown twin.
[Wire the delivery surface](./wire-the-delivery-surface.md) covers building the routes this guide
assumes already exist.
