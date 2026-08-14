# AI crawler posture: what actually governs training access (2026-08-03)

Research input for ROADMAP's P8, the site AI-posture config. Commissioned when Geoff asked for
`llms.txt` support and then restated the goal as the outcome rather than the file: a cairn site
should support effective LLM training when its author wants that, and should be able to decline
when its author does not.

Evidence tiers used below: **1P** first-party provider documentation, **3P-M** third-party
measured, **3P-C** third-party claim or vendor marketing, **INF** inference. Undated claims were
excluded.

## The headline: two findings outrank the question that was asked

**1. A cairn site that wants to be trained on is probably blocked right now, by platform default.**
Since 2025-07-01, Cloudflare blocks GPTBot, ClaudeBot, and PerplexityBot **by default on every new
domain**, at the edge, before the request reaches the origin (1P, Cloudflare). Every cairn site runs
on Cloudflare. So the highest-leverage opt-in action is not publishing anything; it is not
shadow-banning yourself against a platform default you never chose. No file a site publishes can
undo an edge block.

**2. `llms.txt` does not serve this goal.** Google's AI-optimization guidance states outright that
Search ignores it and that it neither helps nor harms (1P, dated 2026-06-15). Two independent
large-N log studies agree it is near-unused in practice: Ahrefs found **97% of `llms.txt` files
received zero requests** across 137,210 domains (3P-M, 2026-06-15), and a 6,122-domain study found
only **1.1% of requests to the file came from verifiable AI models**, with **zero referrer trails**
showing a crawler entering via the file and following its links (3P-M, May 2026). Neither OpenAI nor
Anthropic documents consuming it, though both publish one for their own docs. That is
adoption-as-publisher, which the data shows is disconnected from adoption-as-consumer.

This confirms and hardens the 2026-06-29 internal finding rather than overturning it. The narrow use
that research endorsed (point a model at one curated file, deliberately) still stands, and cairn
already ships that shape in `src/lib/render/component-reference.ts`. It is simply not the goal here.

## Opt-out: a request among cooperating crawlers, never enforcement

A per-token `robots.txt` `Disallow` is honored by every major **named training crawler that
publishes a compliance commitment at all**: GPTBot, ClaudeBot, Claude-SearchBot, Google-Extended,
PerplexityBot, CCBot (all 1P). That makes it the cheapest high-value lever in this direction.

The holes are documented and must be stated to a site author rather than glossed:

- **User-triggered fetches are exempt by design, first-party.** OpenAI's `ChatGPT-User` docs say
  robots.txt rules may not apply because a user initiated the action; Perplexity says the same of
  `Perplexity-User`. A site can be fully `Disallow: /` and still be fetched live when someone asks
  an assistant about it. Anthropic is the outlier and claims all three of its bots honor robots.txt
  including `Claude-User` (1P claim, no independent audit found).
- **Compliance claims have been credibly contested.** Cloudflare published a technical report
  (2025-08-04) describing Perplexity using undeclared crawlers with rotating identities against
  sites that had blocked its declared bots. Perplexity disputes the characterization. Not
  adjudicated.
- **Bytespider publishes no compliance commitment to test against**, and multiple infrastructure
  vendors report it ignoring robots.txt (3P-M, converging, no rebuttal found).
- **Nothing retroactive.** Blocking CCBot does not remove already-published Common Crawl dumps, and
  no robots line un-trains a model.
- **No identity verification.** Any user agent string can be claimed. Web Bot Auth (HTTP Message
  Signatures, RFC 9421; IETF WG chartered 2026) is the emerging fix and is early.

**`noai` / `noimageai` meta tags are not supported by evidence.** Several SEO vendors claim major
providers honor them (3P-C). The OpenAI and Anthropic crawler docs fetched for this pass mention
neither, nor any header-based training opt-out, only robots.txt. Treat as folklore; ship only as a
courtesy signal, and never claim it does anything.

`Content-Signal` (Cloudflare, 2025-09-24, live on 3.8M+ domains) extends robots.txt with
`ai-train=no` style preferences. Additive and free, no confirmed first-party consumer beyond
Cloudflare's own tooling.

## The layer with real teeth is the edge, and it is not cairn's to own

Cloudflare AI Crawl Control (GA 2025-08-28) buckets crawlers by intent (Search, Agent, Training) and
applies edge policy independent of what any crawler chooses to honor. Its stealth-crawler detection
works on behavioral and network fingerprinting rather than trusting a claimed identity, which
robots.txt structurally cannot do. Pay Per Crawl serves HTTP 402 to non-paying crawlers.

One load-bearing caveat: **this holds only while traffic is actually proxied through Cloudflare.** A
gray-clouded record or a leaked origin IP falls all the way back to the honor system.

This sits in the developer's infrastructure domain, not the engine's, so cairn does not configure
it. Diagnosing it is a different matter and is where cairn's existing `doctor/` and
`check:readiness` machinery already lives.

## Serving markdown: the one place cairn's architecture is a real advantage

Two competing conventions, neither consolidated: a `.md` suffix on any page URL (Mintlify, and the
llms.txt spec references it), or `Accept: text/markdown` content negotiation on the same URL (Vercel
2026-02-03, Cloudflare's edge "Markdown for Agents" 2026-02-12, which converts HTML to markdown for
any Pro/Business site). Sites doing this today tend to offer both.

Evidence that agents actually use it is thin. Vercel asserts "many agents already send
`Accept: text/markdown`" with no citation, and no log study analogous to the llms.txt ones exists.

It is still worth shipping **for cairn specifically**, on cost rather than proven demand: cairn
stores markdown natively, so serving it is re-serving a file it already has, where an HTML-first CMS
must reconstruct markdown it threw away. Near-zero cost for cairn, genuinely hard for the field.

## Estate audit, 2026-08-03 (measured, not inferred)

Method: `curl` against each origin with GPTBot, ClaudeBot, and PerplexityBot user agents, with a
browser user agent as the control. All four sites returned 200 to the browser control, so every
difference below is user-agent driven.

| Site | GPTBot / ClaudeBot / PerplexityBot | robots.txt |
|---|---|---|
| 907.life | **403 at the edge** (`server: cloudflare`, body "Your request was blocked.", no origin hit) | Cloudflare managed: `Content-Signal: search=yes,ai-train=no,use=reference` plus per-token `Disallow` for ten crawlers |
| aksailingclub.org | **403 at the edge** | same managed block |
| cairn.pub | 200 | cairn's own only |
| ecxc.ski | 200 | cairn's own only |

The ten blocked tokens: Amazonbot, Applebot-Extended, Bytespider, CCBot, ClaudeBot,
CloudflareBrowserRenderingCrawler, Google-Extended, GPTBot, meta-externalagent, plus the
`Content-Signal` group.

**Do not attribute the split to the 2025-07-01 new-domain default.** That default is real and
first-party, but it does not explain this estate: cairn.pub is among the newest zones and is not
blocked. The per-zone cause is unverified. The `bot_management` API returned `Authentication error`
with the CLAUDE_CODE token, so the setting itself was not read, only the outcome measured. Reading
the setting needs Bot Management read scope added to the token.

### The finding that changes the engine design

**Cloudflare's managed robots.txt prepends to the origin's rather than replacing it.** 907.life's
`/robots.txt` tail is byte-identical to ecxc.ski's entire file, because that tail is cairn's own
`robots.ts` output surviving underneath Cloudflare's injection. The shipped file therefore carries
**two `User-agent: *` groups** with different rules: Cloudflare's `Content-Signal` group, then
cairn's `Allow: /` plus `Disallow: /admin` group. RFC 9309 says a crawler merges groups with the
same agent, so `/admin` should remain disallowed, but the merged file is authored by neither layer
and matches neither layer's intent.

The consequence is structural: **cairn cannot assume the robots.txt it emits is the robots.txt that
ships.** Any feature that writes robots directives must detect the managed layer rather than trust
its own output, which is why the pass below puts a deployed-site probe in `doctor/` rather than
only emitting a file.

## What this means for the pass

Ranked by evidence, per direction.

**Invite:**

1. Do not be blocked by Cloudflare's own default. This is the whole ballgame and it is one account
   setting, not a cairn feature. cairn's contribution is to **diagnose and document** it.
2. Serve raw markdown at `.md` or on `Accept: text/markdown`. Cheap for cairn, uniquely.
3. Publish `llms.txt`. Cheap, harmless, low expected value. A nicety, not the headline.

**Decline:**

1. Emit per-token `Disallow` lines from a maintained crawler table, covering training tokens and
   deliberately **not** Googlebot or OAI-SearchBot, which are search rather than training.
2. Add `Content-Signal: ai-train=no` alongside. Free and additive.
3. Point at Cloudflare AI Crawl Control for actual enforcement, and say plainly that it is the only
   layer with teeth.
4. `X-Robots-Tag` or `noai` as courtesy only, with no claim attached.

**The honesty constraint, which is a design requirement and not a docs nicety.** The config copy and
the reference page must say that declining is a request most named crawlers say they honor, not an
enforcement mechanism, and must name the user-triggered-fetch exemption. Anything that reads as
"blocks AI training" would be exactly the species of unverifiable claim this project's review gates
have caught three passes running.

**A maintenance cost to accept deliberately:** a crawler token table goes stale. New bots appear and
existing ones rename. Whatever ships needs an owner and a refresh trigger, or it decays into
confidently wrong output.
