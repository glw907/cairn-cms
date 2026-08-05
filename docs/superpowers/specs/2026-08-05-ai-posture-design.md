# AI posture: design (2026-08-05)

The design for the AI-posture pass, which lands before the `0.94.0-rc.1` cut and the four site
migrations so each site adopts a posture in the session that migrates it.

Inputs, all read in full before this was written:

- [`ROADMAP.md`](../../../ROADMAP.md), the "site's AI posture" entry, which carries Geoff's dated
  rulings of 2026-08-03 and is the governing authority here.
- [`docs/internal/2026-08-03-ai-crawler-posture-research.md`](../../internal/2026-08-03-ai-crawler-posture-research.md),
  the evidence base.
- [`docs/internal/2026-08-03-ambient-defaults-audit.md`](../../internal/2026-08-03-ambient-defaults-audit.md),
  which this pass consumes.

The ROADMAP settles most of this. What follows adds only what it left open, plus three corrections
that measurement forced.

## Decisions, confirmed (Geoff, 2026-08-05)

Planned in a background session, put to Geoff, and ratified with one addition.

1. **Markdown serving stays in the pass** rather than becoming a follow-up, on the reasoning in
   "Pass size" below.
2. **The admin HSTS drops `includeSubDomains` by default**, opt back in per site. One
   `Consumers must:` line.
3. **`llms.txt` does not ship.** The guide states why, and the stale ROADMAP entry asking for
   `buildLlmsTxt` is pruned in the same pass.
4. **The doctor probe stays black-box only**, with the ROADMAP's "no API exposes this" claim
   corrected rather than carried forward as settled.

The addition: **the guide carries the `Accept: text/markdown` negotiation recipe as zone config**
rather than the engine owning negotiation. The reasoning is the corrected first finding below.

## Three corrections to this pass's own inputs

**`Accept: text/markdown` negotiation is priced out of the engine, not foreclosed.** The public
catch-all is `export const prerender = true` (`examples/showcase/src/routes/(site)/[...path]/+page.server.ts:6`),
so a content request is served by Cloudflare's static-asset layer and the Worker never sees the
header. Making it see the header means `run_worker_first` on content paths, which converts every
public page view from a free static hit into a Worker invocation, the exact cost `prerender` exists
to avoid, spent on demand the research already called thin. The shape that keeps static serving is
an edge rewrite: a Transform Rule matching the header and rewriting to the `.md` twin's path before
cache lookup, so the twin is cached under its own key and there is no same-URL-two-bodies hazard.
That is zone config, the developer's infrastructure, cairn's to document rather than own, and
Cloudflare has already claimed the layer: its managed "Markdown for Agents" feature answers the
header by reconstructing markdown from HTML, where cairn's twin is true source markdown.

**Ruled (Geoff, 2026-08-05): the engine ships the `.md` twins; the guide carries the Transform Rule
recipe, naming the managed feature as the zero-config variant; engine-owned negotiation is held
unless agent demand firms up.** One premise sharpened during the ruling: no training crawler
documents sending this header, since crawlers fetch HTML the way browsers do, so negotiation serves
live agent fetchers. For crawling, the twins, the `rel="alternate"` link, and not being edge-blocked
do the work.

**Markdown serving needs a site-owned route, and that is the correct shape rather than a
compromise.** The engine cannot serve entry bodies from its `handle` hook, because the site resolver
is built in site code from globs specifically to stay in the prerender graph and out of the runtime
Worker (`src/lib/delivery/public-routes.ts:1-6`). Serving markdown from the hook would pull every
entry into the Worker bundle and reverse a deliberate decision. So the engine ships a builder and an
enumerator, and the site wires one small prerendered route, exactly as `robots.txt/+server.ts` and
`sitemap.xml/+server.ts` already do. This costs no second visit to any site, because the pass lands
*before* the migrations and the migration session adds the route alongside the posture config.

**Cloudflare's AI Crawl Control now writes a WAF custom rule, so the "dashboard-only" claim is no
longer safe to assert.** The docs page (last updated 2026-08-03) states that blocking a crawler
creates or updates a WAF custom rule on the zone, and WAF rulesets are an API-readable object class.
This was not confirmed: `CLOUDFLARE_API_TOKEN` returns `Authentication error` on
`/zones/{id}/rulesets/phases/http_request_firewall_custom/entrypoint` for all four estate zones, the
same scope gap the audit hit on `bot_management`. The design does not act on this. It corrects the
record, because "no API exposes per-crawler state" is currently written in the ROADMAP as a finished
finding and would otherwise be carried into the next pass that asks the question.

## Pass size

Six deliverables, past the four the workstation guidance treats as the line. The cut was considered
and rejected at the one place it looked natural, and the reasoning belongs in the record.

Splitting at the invite/decline line is the obvious cut and it is wrong: the ROADMAP rules the two
directions co-equal, "not a feature and its off switch." Shipping decline first and leaving invite
would answer the incident and abandon the half that motivated the original request.

Markdown serving is the one item that could leave without breaking a ruling. It stays, because
deferring it past the migrations turns a one-file addition made during a session that is already
open into a separate visit to four repositories. If it grows past the shape described below, that is
the cut point, and the pass splits rather than absorbing it.

## The posture config

One optional field on `CairnAdapter`, beside `roles` and `media`:

```
aiPosture?: 'invite' | 'decline'
```

Unset means the engine emits nothing and guesses nothing, and every current site's output is
byte-identical to today. That is the ROADMAP's ruling and the whole point: a fabricated default is
what produced the estate split this pass exists to fix.

The doctor derives it off the adapter through `adapterFacts()`, the mechanism `roles` and
`mediaBucketBinding` already use (`src/lib/doctor/assemble.ts:145-183`). No new plumbing.

The site's `robots.txt/+server.ts` passes it to `robotsResponse`. That keeps the posture a site
policy the site hands to the engine, rather than an engine behavior a site inherits, which is the
charter line the ROADMAP draws.

### Consistency with per-entry state

An entry carrying `robots: noindex` in its frontmatter (`src/lib/delivery/seo-fields.ts:14`) is
excluded from the markdown enumeration, so a page asking not to be indexed does not acquire a
machine-readable twin. This copies Docusaurus's rule that a `noindex` page cannot appear in the
sitemap, which the ROADMAP names as worth copying outright: two related surfaces must not be able to
disagree.

## Decline: the robots emitter

`buildRobots` gains an optional `posture`. The signature stays additive, so nothing breaks:

```
buildRobots(opts: { sitemapUrl: string; disallow?: string[]; posture?: AiPosture })
```

Under `decline` it emits one `User-agent: <token>` / `Disallow: /` group per training crawler, plus
`Content-Signal: ai-train=no`. Under `invite` it emits `Content-Signal: search=yes, ai-train=yes`
and nothing else, because there is no robots directive that invites.

The crawler table lives at `src/lib/delivery/ai-crawlers.ts`, one record per token carrying the
token, its operator, its category, and a first-party citation URL. Training tokens only. Googlebot,
OAI-SearchBot, and Claude-SearchBot are search and are deliberately absent, since disallowing them
costs a site its search presence for no training benefit. Cloudflare's own managed list, measured on
two estate zones, is the starting prior art: Amazonbot, Applebot-Extended, Bytespider, CCBot,
ClaudeBot, Google-Extended, GPTBot, meta-externalagent.

Every token is verified against its operator's own published documentation during implementation. A
token that no first-party page documents does not ship, however widely it is repeated.

### The honesty constraint, which is a build requirement

The reference page, the guide, and the config's own doc comment must say that declining is a request
that named crawlers say they honor, and must name the user-triggered-fetch exemption: OpenAI's
`ChatGPT-User` and Perplexity's `Perplexity-User` are exempt from robots.txt by their own
first-party design, so a fully declining site can still be fetched live when someone asks an
assistant about it. Bytespider publishes no commitment at all. Nothing in this pass may read as
"blocks AI training."

Two lines are load-bearing and go in the prose verbatim in substance: nothing here is retroactive
(blocking CCBot does not withdraw published Common Crawl dumps, and no robots line untrains a
model), and the only layer with teeth is Cloudflare AI Crawl Control, which is the developer's
infrastructure and not the engine's to configure.

## Invite: markdown serving

The engine ships two things in `delivery`:

- `markdownResponse({ body })`, returning `text/markdown; charset=utf-8`, a sibling of
  `robotsResponse` and `sitemapResponse` in `src/lib/delivery/responses.ts`.
- A markdown path enumerator on `createPublicRoutes`, returning one path per routable entry minus
  the `noindex` exclusions above, so the site's route prerenders the whole set.

The site wires one route. Task 1 of the plan determines its exact shape by experiment against
SvelteKit 2, preferring a `.md` suffix on the content URL and falling back to a `/md/<path>` prefix
if no valid route shape yields the suffix. Guessing this from memory is how a plan wastes a
dispatch.

`CairnHead` gains a `<link rel="alternate" type="text/markdown">` pointing at the twin, since a
resource nothing links to is one nothing finds.

### The disclosure hazard is closed structurally

The ROADMAP names the hazard: anything inlining body content must serve published `main` content
only, never a `cairn/*` pending branch, because a pending edit reaching a public file is a
disclosure bug rather than a formatting one. Prerendering closes it by construction. The route is
built from the site resolver, which is built from committed globs at build time, and a build runs
against `main`. There is no request path by which a pending branch reaches it. A test asserts this
rather than leaving it to the argument.

### The content type must be measured, not read

The audit found that cairn's one deliberate public-output header does not survive to the wire: the
prerendered static-asset path re-derives a bare `application/xml` or `text/plain` and drops the
charset the engine set. Whatever `markdownResponse` sets is therefore a claim about the origin, not
about the deployed site. The acceptance criterion for this deliverable is the content type measured
off a real build, not the value in the source. If the static-asset layer will not serve
`text/markdown`, that is a finding to record, not a failure to paper over.

## The doctor probe

A new check in `src/lib/doctor/check-posture.ts`, registered in `defaultChecks()`. It fetches the
deployed origin's live `/robots.txt` and reports the site's actual posture. It needs no credential,
which is what lets it sit in the default registry rather than behind a flag like `--probe`, and a
plain GET has none of the side-effect concerns that made the login probe opt-in.

It resolves its origin exactly as `liveProbeCheck` does, wrangler vars beating the environment
(`src/lib/doctor/check-probe.ts:25-27`), and skips with a remediation line when none resolves.

Three cases it must flag, the third being the one that actually happened:

1. **No stance stated.** The adapter sets no `aiPosture` and the live file carries no AI directives.
   Reported, not failed. Absence is honest and the check's job is to make it visible.
2. **A stance stated that the live site contradicts.** The adapter says `decline` and the served
   robots.txt carries none of the tokens cairn emits, or says `invite` while the file declines.
3. **A managed layer overriding what cairn emitted.** Detected by the served file carrying a second
   `User-agent: *` group, or `Content-Signal` directives cairn did not write. This is Cloudflare's
   managed robots.txt prepending rather than replacing, measured on three of four estate zones, and
   only a live fetch can see it.

The report names the Cloudflare dashboard as where to look for cause, and does not claim to know the
cause. Reading the WAF rule that AI Crawl Control writes is the one path that might supply it later,
and it is unverified, so the check says what it observed.

The differentiation claim, wherever it appears in prose, is stated as the ROADMAP requires: this is
narrowness paying off rather than insight. A host-agnostic framework cannot reason about an edge
layer it cannot identify. cairn is Cloudflare-specific by design, so it can.

## The HSTS rider

From the audit, and the one finding it recommended for this window.
`applySecurityHeaders` (`src/lib/sveltekit/admin-response.ts:14`) sets
`Strict-Transport-Security: max-age=63072000; includeSubDomains` on every admin response. One editor
visit to `/admin` pins the apex and every sibling subdomain to HTTPS for two years in that browser,
on zones whose owner left edge HSTS off. Only `max-age=0` from the same host clears it. Measured:
`cairn.pub/admin/login` serves it while `cairn.pub/` serves no HSTS at all.

The fix keeps `max-age` and drops `includeSubDomains` unless a site opts in. The admin surface is
the one place the engine has standing to insist on HTTPS. Asserting policy over sibling subdomains
the engine knows nothing about is a decision that belongs to whoever owns the domain.

This is a behavior change on four deployed sites and earns one `Consumers must:` line. The engine
also currently contradicts its own tooling here, since `checks-cloudflare.ts:140` reports a zone's
HSTS as failing while the engine has already hard-pinned that zone's editors; the two are reconciled
in the same task.

## The setup path

The ROADMAP calls this the half that matters and the one most likely to be skipped: it is not enough
that the capability exists, a developer has to meet it while setting up. The tutorial and the
getting-started scaffold both raise the posture as a deliberate choice, with both directions and
their real consequences present at the moment the developer is already making decisions.

The scaffolder is not built and stays last in the queue, so its share is written down as a standing
input for the scaffolder pass to consume rather than pretended into existence here.

## The guide and the reference

A guide covering the posture, the Cloudflare interaction, and an honest account of what each
direction actually buys, under the register standard at `docs/internal/docs-register.md`. It states
plainly that invite and decline are not equally achievable: a site can decline credibly, and no site
can make crawlers arrive.

It also states why `llms.txt` is absent, with the evidence, so a developer does not read the
omission as an oversight: Google states Search ignores it, Ahrefs measured 97% of published files
receiving zero requests across 137,210 domains, and a second study found 1.1% of requests to the
file came from verifiable AI models with no referrer trails.

The reference page for every new export, since `check:reference` fails on an undocumented one.

## The watch routine

Two triggers, both external or time-based, so both become a scheduled routine rather than a backlog
line someone has to remember to reread. This is the repo's own watch-items doctrine.

- **2026-09-15**, Cloudflare's mixed-purpose-crawler default change, which reaches backward into
  existing "Block AI bots" configurations with no in-dashboard notice. That is a behavior change
  arriving on live consumer sites without anyone being told, the same species as the finding that
  started this.
- **Crawler table staleness**, accepted deliberately as a maintenance cost. Bots appear and rename,
  and a table nobody refreshes decays into confidently wrong output.

The machine-detectable half rides in the suite instead: a test asserting every table record carries
a first-party citation and the table carries a reviewed date. Structural, not time-based, so it
cannot fail CI on a date nobody chose.

## What this pass does not do

- It does not configure Cloudflare AI Crawl Control. That is the developer's infrastructure, and the
  engine diagnoses it rather than owning it.
- It does not ship `llms.txt`.
- It does not implement `Accept: text/markdown` in the engine, which the architecture prices out;
  the guide's Transform Rule recipe is the negotiation story.
- It does not read the WAF rule for probe cause, on an unverified premise and a token that cannot
  currently read it.
- It does not touch the phase-P bucket of the ambient-defaults audit beyond the HSTS item.

## Acceptance

Per deliverable, in the terms a test can hold:

- Unset posture produces byte-identical robots.txt output to today, proven by a test, so no existing
  site changes behavior on upgrade.
- `decline` emits one group per table token plus `Content-Signal: ai-train=no`; `invite` emits the
  affirmative signal and no `Disallow`.
- Every table token carries a first-party citation, enforced by a test.
- The markdown enumeration excludes `noindex` entries, proven by a test.
- No `cairn/*` branch content can reach the markdown route, proven by a test.
- The served markdown content type is measured off a real build and recorded, whatever it turns out
  to be.
- The doctor check flags all three cases, each proven against a fixture of a real served
  robots.txt, including the two-group managed-prepend shape measured on the estate.
- Admin responses carry `max-age` without `includeSubDomains` by default, and carry it when a site
  opts in.
- The four CI-only gates pass by name: `check:comments`, `check:reference:signatures`,
  `check:surface`, `check:snippets`.
