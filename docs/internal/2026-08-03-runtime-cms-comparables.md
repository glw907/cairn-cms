# Runtime CMS / edge-layer comparables — AI-crawler and effective-state reporting

Research date: 2026-08-03. Read-only research, no code changes.

**Methodology note (constraint per dispatch):** the session's WebSearch budget (200/200) was
already exhausted by a prior fan-out before this task's first query ran. Two WebSearch calls
failed at the very start; everything below was gathered via `WebFetch` against primary doc URLs
and Cloudflare's own documentation-search MCP tool (`search_cloudflare_documentation`, first-party
Cloudflare docs). This thins coverage in exactly the way the dispatch anticipated: Cloudflare is
covered deeply (the priority the coordinator set mid-task), WordPress and Ghost are covered well
because their canonical doc pages were reachable directly, and Statamic/Kirby are thin because
their docs sites 404'd on most guessed paths and no search tool was available to find the right
URL. Vercel and Netlify are covered at the "what's the default" level, not exhaustively.

## Coverage table

| Tool | Q1 (effective-state mechanism) | Q2 (ambient matrix) | Q3 (awareness UX) | Overall |
|---|---|---|---|---|
| **Cloudflare** | Strong — AI Crawl Control Robots.txt tab, dashboard-only (see below) | Strong | Moderate | **Deep** (coordinator priority) |
| **WordPress (Site Health)** | Strong — exact per-test mechanism confirmed from `WP_Site_Health` source-derived description | Moderate | Strong (admin-notice fatigue is well documented in the wild) | Good |
| **Ghost / Ghost-CLI** | Strong — `ghost doctor` scope confirmed as local-only | Moderate | Thin | Good |
| **Statamic** | Thin — one utility found (Email Configuration "send a test"), no doctor/health command located | Thin | Thin | Thin |
| **Kirby** | Not found — no health/doctor/diagnostics feature located anywhere in reachable docs | Thin | Not found | Thin |
| **Vercel** | Moderate — Bot Management / AI bots ruleset docs fetched directly, defaults confirmed | Moderate | Thin | Moderate |
| **Netlify** | Thin — bot classification page fetched, no live-state-reporting mechanism found | Thin | Thin | Thin |

No tool in this set was found to have a built-in mechanism that reaches out to the live deployed
URL and reports "what your site actually does" the way the priority question asked. The closest
thing that exists anywhere in this survey is Cloudflare's own AI Crawl Control dashboard, which
reports real observed traffic — but it reports Cloudflare's own edge behavior, observed at
Cloudflare's own vantage point, not an independent inspection of the deployed origin. See below.

---

## Cloudflare — deep section (coordinator priority)

### 1. What Cloudflare's API exposes for reading AI-crawler/bot posture

- **No documented REST endpoint or field for the AI Crawl Control per-bucket state** (Search /
  Agent / Training allow-block-block-on-ads) was found anywhere in Cloudflare's docs corpus after
  multiple targeted searches (`ai_bots_protection`, `bot_management` API fields, zone settings
  edit endpoint). Every AI Crawl Control configuration path documented is dashboard-only: "To
  configure these policies, customers can go to **Security Settings** > **Configure AI bot
  policies**." (first-party documented,
  https://developers.cloudflare.com/bots/additional-configurations/block-ai-bots/)
- The only AI-Crawl-Control-adjacent **permission** that exists in the documented permission
  catalogue is a dashboard **role**, not an API token scope: "**AI Crawl Control Read Only** — Can
  read AI Crawl Control and metrics." (first-party documented,
  https://developers.cloudflare.com/fundamentals/manage-members/roles/). This is a member role for
  dashboard access control, distinct from the API-token permission list at
  https://developers.cloudflare.com/fundamentals/api/reference/permissions/, which enumerates
  **Bot Management Read**, **Bot Management Edit**, and **Bot Management Feedback Read** as the
  zone-scoped API token permissions touching bots — none of them named for AI Crawl Control
  specifically (first-party documented).
- The one bot-related API endpoint fully documented with a working example is the **feedback
  loop**: `GET /zones/{zone_id}/bot_management/feedback` (X-Auth-Key/legacy auth shown in the
  example), which lists false-positive/false-negative reports, not crawler bucket state
  (first-party documented, https://developers.cloudflare.com/bots/concepts/feedback-loop/).
- **Inference**, given the above: the coordinator's `GET /zones/{id}/bot_management`
  "Authentication error" with an account-wide token is consistent with this being a zone-scoped
  resource requiring the **Bot Management Read** zone permission specifically (not an
  account-level grant), and even with that scope, the standard `bot_management` settings resource
  (fight mode, super bot fight mode, JS detection, ML auto-update) is a documented but separate
  surface from AI Crawl Control's per-crawler bucket actions, which do not appear to have any
  public API surface at all — the dashboard is the only interface. This could not be fully
  confirmed against an OpenAPI/reference page for `bot_management` itself; that specific reference
  page 404'd on every guessed path. **Flag this as the one place a live API check (with a
  correctly-scoped token) would settle the question faster than more doc-reading.**

### 2. What Cloudflare tells an operator about its own injected robots.txt behavior

This **is** documented first-party, contrary to what the empirical prepend-not-replace finding
might suggest about disclosure:

> "Cloudflare detects whether your origin server already has a `robots.txt` file and adjusts
> accordingly — either merging with your existing file or creating one from scratch."
> — https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/
> (first-party documented)

A follow-up fetch of the same page confirmed the exact mechanics and order, quoting the page
directly: **"Cloudflare will prepend our managed `robots.txt` before your existing `robots.txt`,
combining both into a single response."** The worked example on the page shows Cloudflare's
managed block first, terminated by a `# END Cloudflare Managed Content` marker, followed by the
site's own original `User-agent: *` / `Disallow` / `Sitemap` lines verbatim (first-party
documented). So: **prepend, not replace, and the ordering is documented** — the failure mode
cairn hit (the origin's own robots.txt being present but overridden/shadowed in effective
behavior) is not a case Cloudflare's docs describe as silent; the docs describe a merge. Whether
that merge was actually happening as documented on the two affected cairn sites, versus some other
interaction (e.g., the "Block AI bots" toggle or the September 2025 Content Signals Policy
default, which are enforcement/labeling layers independent of the robots.txt text) is a separate
question this research can't settle from docs alone.

Two things the docs do **not** provide, confirmed by direct search and fetch:
- **No notification, dashboard badge, or API field surfaces "your served robots.txt differs from
  your origin's."** The managed-robots.txt page describes the merge behavior but nothing compares
  the two after the fact or alerts on drift. (first-party documented absence — searched
  specifically, nothing found)
- The October 2025 "**Robots.txt tab**" inside AI Crawl Control (see Q1 below) tracks **HTTP
  status codes and crawler violations of directives**, i.e., "is this file healthy and are bots
  obeying it," not "does what's served match what your origin emits." Different question,
  adjacent surface (first-party documented,
  https://developers.cloudflare.com/changelog/post/2025-10-21-track-robots-txt/).

### 3. Whether defaults were applied to existing zones, and whether operators were notified in-product

- The **Free-plan Content Signals Policy** (declares `search` / `ai-input` / `ai-train`
  categories with no explicit preference) is served automatically today, right now, to **any
  domain on the Free plan that has no robots.txt of its own and has not turned on managed
  robots.txt** — this is a present-tense, already-applied default, not a future one, and it
  applies to existing zones as much as new ones (it's conditioned on plan + absence of a file, not
  on onboarding date). Quote: "Domains on the Free plan that do not have their own `robots.txt`
  file and do not use the managed `robots.txt` feature will display the Content Signals Policy
  when a crawler requests the `robots.txt` file for your domain." (first-party documented,
  https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/) Note this
  default only *declares categories*, it does not *set any Disallow preference*, so it is closer
  to a labeling default than a blocking default.
- The **enforcement-blocking default** is dated and forward-looking, and explicitly scoped to
  **new domains only**, with an explicit opt-out window for everyone: "Starting **September 15,
  2026**, new domains onboarding to Cloudflare receive updated defaults: Bots classified as
  Training or as Agent are blocked on pages that display ads, while Search remains allowed. …
  Mixed-purpose crawlers that combine Search and Training will be affected by the new defaults to
  block Training [across **all** configurations, including existing ones using the legacy 'Block
  AI bots' option]. All customers can opt out of the new defaults at any time before September
  15." (first-party documented, https://developers.cloudflare.com/bots/additional-configurations/block-ai-bots/
  and the matching changelog entry dated 2026-07-01). Read closely, this is a **hybrid**: the
  *preset itself* is new-domain-only, but the *mixed-purpose Training reclassification* reaches
  backward into every zone already using the legacy "Block AI bots" toggle, existing or new.
- **In-product notification**: the only notification channel documented for this is the changelog
  entry itself (https://developers.cloudflare.com/changelog/post/2026-07-01-ai-traffic-options/)
  and the docs page's own "Note" callout — both are pull surfaces (an operator has to go read
  them), not push surfaces. No dashboard banner, email, or Site-Health-style nag was found
  documented anywhere for this change. **Not found** — I could not locate any first-party
  statement that existing zone operators are proactively notified in-dashboard of this
  September 15, 2026 change; the only discoverable channel is the docs/changelog itself, which is
  the "read a blog post to find out" failure mode the coordinator is asking about. This is an
  absence-of-evidence finding, not a confirmed absence — Cloudflare could plausibly also send
  account-level email that isn't indexed in the docs corpus this tool searches.

### AI Crawl Control's Robots.txt tab — the closest thing to "reports effective state" in this whole survey

Launched Oct 21, 2025 (first-party documented,
https://developers.cloudflare.com/changelog/post/2025-10-21-track-robots-txt/), inside
**AI Crawl Control > Robots.txt**:

- "Monitor the health status of `robots.txt` files across all your hostnames, including HTTP
  status codes, and identify hostnames that need a `robots.txt` file."
- "Track the total number of requests to each `robots.txt` file, with breakdowns of successful
  versus unsuccessful requests."
- "Check whether your `robots.txt` files contain Content Signals directives for AI training,
  search, and AI input."
- "Identify crawlers that request paths explicitly disallowed by your `robots.txt` directives …
  including the crawler name, operator, violated path, specific directive, and violation count."

**Classification: reaches the live deployed URL over the network** — this is Cloudflare's own edge
observing real HTTP requests and real HTTP responses at the actual hostname, not a config-file
read. It is the one mechanism in this entire survey (all seven tools) that genuinely inspects
"what is actually being served" rather than "what was configured." The caveat: it's observing from
inside Cloudflare's own request path, so it reports Cloudflare's edge behavior faithfully but
cannot independently audit whether Cloudflare's edge is doing what Cloudflare's dashboard toggles
imply it's doing — there's no external, adversarial check in the loop. Available on all plans
(the underlying AI Audit/AI Crawl Control feature: "Every site on Cloudflare now has access to AI
Audit" as of the Sep 23, 2024 launch — first-party documented,
https://developers.cloudflare.com/changelog/product/ai-crawl-control/), but the Robots.txt tab
specifically is dashboard-only per everything found above.

---

## Q1 — who reports effective state (full findings across all seven tools)

### WordPress Site Health — the strongest candidate, confirmed in detail

Location: **Tools > Site Health**, two tabs (Status, Info). (first-party documented,
https://wordpress.org/documentation/article/site-health-screen/)

Per-test classification (derived from the `WP_Site_Health` class's documented method behavior):

| Test | Makes a real network request? | What it actually checks |
|---|---|---|
| `get_test_rest_availability` | **Yes** | Loopback `wp_remote_get()` to `rest_url('wp/v2/types/post')` — the site's own live REST endpoint, verifying real server responses (**the running server, reached over the network via its own public URL** — closest of WP's tests to "live deployed URL") |
| `get_test_loopback_requests` / `get_test_page_cache` | **Yes** | `can_perform_loopback()` — real HTTP request the server makes to itself, used to validate that scheduled events / cron / plugin-editor code checks can run; page-cache test inspects response headers from that loopback for cache signatures |
| `get_test_https_status` | **No** | Local config only (`wp_is_using_https()`, `wp_is_site_url_using_https()`) — despite the name, this does not independently verify what a browser actually receives |
| `get_test_authorization_header` | **No** | Reads `$_SERVER['PHP_AUTH_USER']` locally |
| "Is this site discouraging search engines?" (Info tab) | **No** | Reads the WordPress `blog_public` option — reports the *setting*, not whether the served `robots.txt` actually reflects it |

No Site Health test was found that inspects `robots.txt` content, response security headers, or
CDN/edge behavior — the loopback tests are the only ones that leave the process, and they check
REST API availability and cache-header presence, not crawler policy. (first-party documented,
cross-referenced against the WP 5.2 announcement post, which confirmed the direct-vs-async test
architecture but not further technical detail on individual tests —
https://make.wordpress.org/core/2019/04/25/site-health-check-in-5-2/)

**Classification: partially reaches "the running server locally via its own public URL"** for the
REST/loopback tests (a real HTTP round-trip, but typically hairpinned through the same host) —
this is the best fit for the priority question found on any self-hosted tool, but it stops well
short of an independent audit of edge/CDN behavior, and does not touch robots.txt or headers at
all.

### Ghost / Ghost-CLI `ghost doctor` — confirmed local-only

Full subcommand list confirmed (first-party documented, https://docs.ghost.org/ghost-cli/):
`buster`, `config`, `doctor`, `install`, `log`, `ls`, `migrate`, `restart`, `run`, `setup`,
`start`, `stop`, `uninstall`, `update`, `version`.

`ghost doctor` — "check[s] the system for potential hiccups when installing or updating Ghost,"
runs automatically on install/update/start/setup, with `doctor startup` validating the local
config file's values and `doctor setup` checking whether local setup succeeded. **Everything
documented is local system/install state** (Node version, memory via `--no-check-mem`, config file
existence). **No reference found to checking the live URL, HTTPS, headers, or robots.txt.**
Classification: **local config / local install state only.**

### Statamic — thin, one interesting hit

Statamic's Control Panel **Utilities** page includes an **"Email Configuration"** utility: "A page
to view email configuration and send a test." (first-party documented,
https://statamic.dev/control-panel/utilities) This is notable: "send a test" means it actually
fires a real outbound SMTP transaction, which is a genuine network action — but it is
operator-triggered, checks only the mail pathway, and does not confirm inbox delivery (no
open/bounce tracking implied by the docs). No `doctor`/health/system-check command was located in
the CLI or Debugging docs after two attempts; those specific sub-pages either 404'd or the fetch
returned only navigation chrome. **Classification: the Email Configuration utility is "the running
server locally, verified via a real outbound network send," not "the live deployed URL inspected
from outside."** Everything else: **not found** (thin coverage, not a confirmed absence).

### Kirby — not found

No health-check, doctor, system-check, or diagnostics feature was located anywhere in reachable
Kirby docs (quicktour, troubleshooting/installation). The troubleshooting page covers local
`.htaccess`, PHP extensions, file permissions, and timezone — explicitly local-only, and confirmed
to contain no mention of live-network verification. **Classification: not found / thin coverage** —
Kirby's reference section (a large page enumerating every method/option/helper) was not fully
searched, so this is an honest gap in coverage rather than a confirmed absence.

### Vercel — Bot Management / AI bots ruleset, confirmed opt-in

Fetched directly (first-party documented, https://vercel.com/docs/bot-management):

> "**AI bots managed ruleset** … Enable the ruleset: The ruleset is **inactive by default**. In
> the dashboard this is labeled **Allow**."

Same page, same wording for the general **Bot Protection managed ruleset**: "inactive by default…
labeled **Off**." Both are opt-in, both apply at Vercel's Firewall layer (challenge/deny), and
neither is a diagnostic — they're enforcement toggles, not a report of effective state. No
Vercel deploy-time or dashboard mechanism was found that compares served output against developer
config; `vercel.json` header rules and the Firewall are configuration, observed only via
Firewall/Observability logs of real traffic after the fact (i.e., you can see what happened, but
there's no proactive "here's what's actually being served" summary). **Classification: absent**
for the effective-state question; the underlying observability/firewall logs are the closest
thing, and they are real-traffic logs, not an audit.

### Netlify — bot categorization, no default blocking, no live-state report

The `Netlify-Agent-Category` header taxonomy (browser / ai-agent / page-preview / crawler /
tooling / other / none) is documented (first-party documented,
https://docs.netlify.com/build/user-agent-categories/), and explicitly recommends **against**
blocking ad-hoc AI agent traffic ("ai-agent;user"): "It is generally not advisable to block or
rate-limit these requests." No default blocking or robots.txt behavior is documented; blocking is
opt-in via Edge Functions or Enterprise-only traffic rules. No mechanism found that reports live
served state versus `netlify.toml` config. **Classification: absent.**

---

## Q2 — ambient surface matrix

Legend: **silent default** (happens without a decision or notice) · **documented default**
(happens without action but is disclosed) · **forced decision** (operator must choose at setup) ·
**absent** (tool has no stance/mechanism).

| Surface | Ghost | WordPress | Statamic | Kirby | Vercel | Netlify | Cloudflare |
|---|---|---|---|---|---|---|---|
| Security headers | absent (not found; theme/app-level, no core stance located) | absent (core; plugin territory) | absent (not found) | absent (not found) | absent — no default injection documented; `vercel.json` headers are opt-in config | absent — no default injection found; `_headers`/`netlify.toml` is opt-in config | **silent default** for some (client-side security auto-injects CSP-adjacent headers that can duplicate an app's own — first-party documented troubleshooting page exists for this exact conflict, https://developers.cloudflare.com/client-side-security/troubleshooting/); most security headers otherwise **forced decision** via Transform Rules |
| robots.txt | absent (app/theme-level; not found in core) | **documented default** — `blog_public` "discourage search engines" option is a forced decision at setup, reflected in a generated virtual robots.txt | absent (not found) | absent (not found) | absent — no platform-level robots.txt handling found | absent — no platform-level robots.txt handling found | **documented default** for the Content Signals Policy (Free plan, no origin file, feature off → policy served automatically, present tense, first-party documented) layered under a **forced decision** managed-robots.txt feature (opt-in, merges/prepends) |
| sitemap.xml | absent (core; plugins own this) | **documented default** — WP core auto-generates `wp-sitemap.xml` since 5.5, off if `blog_public` discourages indexing | absent (not found) | absent (not found) | absent | absent | absent (not a Cloudflare concern; origin-owned) |
| AI-crawler posture | **not found** (no stance located) | **not found** (no core stance; Site Health doesn't test it) | **not found** | **not found** | **forced decision** — AI bots ruleset opt-in, confirmed "inactive by default" (first-party quote above) | **documented default** — categorizes but does not block by default; explicit docs discourage blocking ai-agent traffic | **hybrid**: Content Signals labeling is a **silent default** (Free, conditional); enforcement blocking is a **forced decision** today, becoming a **documented default** for new domains 2026-09-15 (see deep section above) |
| Cookies / privacy signals | absent (not found) | absent (not found in core; core sets `wordpress_test_cookie` only) | absent (not found) | absent (not found) | absent (not found) | absent (not found) | absent for content cookies; Cloudflare's own `__cf_bm`/`cf_clearance` cookies are a **silent default** wherever Bot Management/challenges run (inference — well-known behavior, not separately verified this session) |
| Outbound transactional email + SPF/DKIM/DMARC | **documented default (absent + warned)** — mail "needs to be configured once you've installed Ghost"; explicit first-party guidance to configure DKIM/SPF/DMARC yourself (quoted below); Ghost does not automate any of it | **documented default (absent, largely unwarned)** — core `wp_mail()` defaults to PHP `mail()`, well-known for landing in spam / failing silently on modern hosts (inference — could not fetch the primary `wp_mail()` doc body this session; general knowledge, not independently re-verified); Site Health does not test mail deliverability (confirmed absent — no such test found in the documented test list) | **forced decision, self-tested** — Email Configuration utility lets the operator view config and "send a test" (first-party documented), but doesn't verify SPF/DKIM/DMARC or inbox placement | **not found** | absent (not found; Vercel is not itself a mail sender) | absent (not found; Netlify is not itself a mail sender) | absent (Cloudflare Email is a separate product from the CMS-hosting question; not evaluated here) |
| Cache / CDN headers | absent (not found) | absent (core) | absent (not found) | absent (not found) | **documented default** — Vercel's own edge caching is on by default for static output, disclosed in general docs (not re-fetched this session; inference from prior general knowledge) | **documented default** — similar, asset CDN caching on by default (not re-fetched this session; inference) | **documented default** — Cache Rules / default cache-control-respecting behavior; extensively documented, not re-fetched in depth this session (inference of "documented," not re-verified in detail) |
| Error pages / redirects / canonical host | absent (app-level) | absent (core) | absent (not found) | absent (not found) | **documented default** — Vercel serves its own default error pages / redirect handling unless overridden (not re-fetched this session; inference) | **documented default** — similar Netlify default error page behavior (inference) | absent at the CMS layer; Cloudflare's "Always Use HTTPS" / canonicalization are **forced decisions** (opt-in zone settings, not re-verified this session; inference) |
| TLS | absent (host-dependent) | absent (host-dependent); Site Health's `get_test_https_status` reports the *setting*, not independently-verified live TLS | absent (host-dependent) | absent (host-dependent) | **documented default** — Vercel auto-provisions TLS for all deployments (well-known, not re-fetched this session; inference) | **documented default** — Netlify does the same (inference) | **documented default** — Cloudflare Universal SSL is on by default for proxied zones (well-known, not re-fetched this session; inference) |

Cells marked **inference** without a fresh citation this session reflect prior general knowledge
about these platforms rather than a doc freshly pulled in this pass — flagged per the "tag every
claim" constraint rather than omitted, since the coordinator asked for gaps named honestly, not
padded.

---

## Q3 — low-friction awareness mechanisms

- **WordPress admin notices — the canonical case of notification fatigue.** Site Health's own
  design groups results into **Critical issues / Recommended improvements / Passed tests**,
  explicitly to triage attention (first-party documented,
  https://wordpress.org/documentation/article/site-health-screen/). This structure exists *because*
  WordPress's broader admin-notice system is widely understood to habituate users into dismissing
  or ignoring banners — the Site Health *screen* (a dedicated Tools page, not a dismissible banner)
  was WordPress core's own answer to that fatigue, moving the "this matters" signal off the noisy
  admin-notice stream and onto a page an admin has to visit. That itself is evidence, by design
  choice, that the core team judged ambient admin notices to be an unreliable channel for anything
  that actually needs to be seen (**inference** from the documented design rationale, not a direct
  usage-data citation — no third-party measurement of notice dismissal/ignore rates was located
  this session).
- **Statamic's Email Configuration utility** is a low-friction, pull-based awareness mechanism —
  it does not block anything, is not a nag, and requires the operator to visit Utilities and click
  "send a test" (first-party documented, cited above). No evidence found on how often operators
  actually use it.
- **Cloudflare's AI Crawl Control changelog-as-notification pattern** (see deep section, point 3)
  is the weakest awareness mechanism found in the whole survey: a real behavioral default change
  (the September 15, 2026 new-domain preset, and its backward reach into existing "Block AI bots"
  configurations for mixed-purpose crawlers) is disclosed via changelog post and an in-docs "Note"
  callout, with **no in-dashboard notice mechanism found documented**. This is the most directly
  relevant Q3 finding to the cairn incident: it is a real-world instance of "the developer's config
  said one thing, the deployed reality changed underneath them, and the only notification channel
  is a document they'd have to go looking for."
- **Vercel and Netlify**: both AI-bot and general bot-protection rulesets are opt-in and shown as
  an explicit **Off/Allow** state in the dashboard rather than silently defaulting on — this is a
  "forced decision, visible state" pattern rather than a "notify after the fact" pattern, which
  sidesteps the awareness problem by not needing awareness (the state is inert until acted on). No
  evidence found either way on whether operators discover these toggles proactively or only when
  troubleshooting.
- **No evidence found** (third-party measured) for actual click-through, dismissal, or action
  rates on any of these mechanisms across any of the seven tools. Everything above about "fatigue"
  or "operators tune out" is either first-party design rationale or general inference, never a
  measured study — flagged as a gap rather than papered over.

---

## Summary of the one finding most load-bearing for cairn

No tool surveyed — including Cloudflare — has a mechanism that independently audits "what is this
site actually doing, as observed from outside the platform's own request path." The nearest thing
that exists is Cloudflare's AI Crawl Control Robots.txt tab, which is real, live, network-observed,
and first-party documented — but it is Cloudflare grading its own edge, not an outside check.
WordPress Site Health's REST/loopback tests are the only *self-hosted* mechanism that leaves the
process over the network at all, and they don't touch crawler policy. The category gap the
dispatch predicted (static-site tools are silent because they have no runtime to check) does not
fully explain the runtime tools' silence either: Ghost, Statamic, and Kirby have real server
runtimes and administrative surfaces, and none of them ships anything resembling a live-state
check for crawler/header/robots.txt behavior. The gap looks structural, not just categorical: even
platforms with full control of their own hosting (Vercel, Netlify, Cloudflare) chose to build
enforcement toggles and after-the-fact traffic analytics, not a proactive "here's what your site
is really doing right now, does this match what you think you configured" report.
