# Ambient-surface defaults across comparable tools — research findings (partial)

Compiled 2026-08-03. Read-only web research feeding cairn-cms's AI-crawler-posture decision,
after two consumer sites were found silently declining AI crawlers at the CDN edge with nobody
having chosen that. Reframed mid-task from "should we force a decision" to "should we ensure
informed consideration" — the classification scheme and priorities below reflect that correction.

## Coverage — read this first

| Cluster | Tools assigned | Status | Confidence |
|---|---|---|---|
| A — git-backed markdown CMSs | Decap CMS, TinaCMS, Keystatic, Sveltia CMS, Pages CMS, Front Matter CMS | **Delivered, full** | Sourced, see below |
| B — site frameworks | Astro, Eleventy, Hugo, Next.js, Nuxt, Docusaurus, Starlight, VitePress | **Delivered, full** (after two resumption attempts — the agent's own account says its internal forks partly duplicated scope and partly hallucinated waiting on non-existent sub-forks; Starlight and VitePress were finished directly in-session after its search budget ran out, so treat those two as somewhat thinner) | Sourced, see below |
| C — opinionated hosted CMSs | Ghost, WordPress, Statamic, Kirby | **Delivered, full** (after three resumption attempts — the agent looped on a hallucinated "waiting on a Kirby agent" state before finally completing its own research and reporting) | Sourced, see below; Kirby coverage is thinner than the other three (several rows self-flagged "not found" / "not independently re-confirmed this session") |
| D — hosting layers | Vercel, Netlify, Cloudflare Pages/Workers | **Delivered, full** | Sourced, see below |

**Bottom line: all four clusters delivered.** Weakest spots, named rather than hidden: Starlight and VitePress within cluster B (finished under time pressure after a mid-agent process hiccup), and Kirby within cluster C (several "not found" rows, not independently re-confirmed). Every other tool in the 22-tool survey has sourced findings below.

---

## Priority 1: tools that report EFFECTIVE state, not just configured state

This is the highest-value question: does anything probe what a deployed site *actually does*,
as opposed to reading back its own config? Our incident was exactly this class of gap — a CDN
layer overrode app-layer intent, and no config field could have caught it.

- **Cloudflare AI Crawl Control's robots.txt-compliance tab** (added 2025-10-21) is the one
  first-party example found in the entire survey. It parses the site's *actual live* robots.txt
  and cross-references it against *actually observed* AI-bot traffic, reporting per-crawler
  compliance violations — genuine effective-state reporting, not configuration readback.
  [1P] developers.cloudflare.com/changelog/post/2025-10-21-track-robots-txt
- Cloudflare Bot Analytics / Security Analytics show real-time blocked/allowed traffic counts —
  effective-state at the traffic level, though not a general header/robots.txt diff tool. [1P]
- Vercel's Observability → Edge Requests shows bot-category breakdowns with cryptographic
  bot-verification badges (is this crawler who it claims) — real traffic data, not a
  "what would a fresh request receive right now" probe. [1P] vercel.com
- **No host or CMS in the delivered clusters ships a general-purpose "fetch my own live site
  and show me what it's actually serving" diagnostic** (live header dump, live robots.txt-as-served
  checker, deploy-time diff against declared intent). Cloudflare's robots.txt tab is the closest
  approach found anywhere, and it's narrow (AI-crawler traffic only).
- **Git-backed markdown CMSs (cluster A): none.** All six (Decap, TinaCMS, Keystatic, Sveltia,
  Pages CMS, Front Matter) are editor-only — they read/write a git repo and render an admin UI;
  none fetches the deployed origin post-publish. This is structural, not an oversight: it sits
  outside every one of these tools' stated scope. [inference, corroborated by absence of any
  contrary doc across all six]
- **Site frameworks (cluster B): none, and now confirmed rather than merely unresearched.** All
  eight (Astro, Eleventy, Hugo, Next.js, Nuxt, Docusaurus, Starlight, VitePress) were checked
  specifically for this. Docusaurus's `onBrokenLinks`/`onBrokenAnchors` and VitePress's
  `ignoreDeadLinks` are the two build-time checks closest to a "doctor," and both were confirmed
  to inspect only the **local build output on disk**, never a round-trip HTTP request to the
  deployed URL. Astro's `astro check` is a type/template checker, same story. **No tool in this
  cluster can, even in principle, catch a host/CDN-layer override of the app's declared intent —
  the exact incident class that triggered this research.** [1P, per-tool docs cited in the table]
- **Opinionated hosted CMSs (cluster C): one clear hit, one near-miss, one instructive failure.**
  - **Ghost's "Send test email" (bulk-newsletter path, Mailgun) is the single strongest
    effective-state check found in the entire 22-tool survey**: it genuinely round-trips a real
    message through the configured provider rather than just validating that credentials are
    present. [1P] docs.ghost.org/faq/mailgun-newsletters — though it only covers the newsletter
    send path, not transactional mail (invites, magic-link-equivalent), which fails silently and
    only surfaces reactively as an admin banner *after* a real failure.
  - **WordPress Site Health has a mix of real and fake live checks, and the mix matters.** Its
    loopback-request check *is* a genuine self-directed HTTP round-trip (confirms the site can
    reach itself for cron/plugin-editor purposes) — a real effective-state probe. But its HTTPS
    indicator reads the `WP-Address` **option value**, not the actual served scheme, and its
    robots.txt indicator reads a database flag, not a live fetch of `/robots.txt`. **This is
    precisely the config-vs-effective-state gap our incident exposed, reproduced inside WordPress's
    own "health check" feature**: a status page that looks like it inspected the live site but in
    two of three cases just read configuration back to itself. [1P, WordPress core docs + Trac,
    cited in the table below]
  - **Statamic's CP "Send Test Email" (Utilities → Email) is a real live-send probe that its own
    silent default defeats**: Statamic ships `MAIL_MAILER=log` out of the box, so a fresh install's
    test-email feature reports success while the message is only ever written to a log file, never
    delivered. A live-effective-state check built on top of a silent-default trap still misleads
    the developer — a cautionary case for cairn: an effective-state check is only as good as
    whether it can see through the layer beneath it. [1P + GitHub issue #9309, cited below]
  - Kirby: no effective-state check found (docs frame SMTP config as "recommended," not gated by
    any check); coverage on Kirby is the thinnest in this survey (see Coverage table).

**Conclusion, now backed by all four clusters: no tool surveyed ships a general-purpose
"fetch the live deployed site and show me what it's actually serving" diagnostic covering
headers/robots/crawler posture as a first-class feature.** Cloudflare's AI Crawl Control
robots.txt-compliance tab (cluster D) and Ghost's newsletter test-send (cluster C) are the two
strongest real-world precedents, and both are narrow — one to AI-crawler traffic, one to a single
outbound-mail path. WordPress Site Health is the most instructive negative case: it demonstrates
that a feature can *look* like a live-state check while actually reading configuration back to
itself, which is a specific trap worth naming if cairn builds its own version. **If cairn ships a
`doctor`/preflight command that fetches its own deployed origin and diffs actual served
headers/robots.txt/crawler-posture against declared config, it would be filling a real,
differentiated gap across this entire 22-tool survey — with WordPress Site Health as a concrete
example of the failure mode to avoid (reading config back to itself and calling it a check).**

## Priority 2: low-friction mechanisms that inform without obstructing

The design bar is informed consideration, not a blocking gate. What's been found:

- **Cloudflare's 2025-07-01 "Content Independence Day" new-domain onboarding prompt** is the
  strongest example of "ask once, at the moment of setup, with an explanation" found in this
  research: new domains are asked directly whether to allow AI crawlers, at signup, rather than
  inheriting a buried default. [1P] cloudflare.com/press/press-releases/2025/cloudflare-just-changed-how-ai-crawlers-scrape-the-internet-at-large
  — contrast with Cloudflare's planned 2026-09-15 default change for the *existing* install base,
  where the notice mechanism found was a blog post plus one livestream ("Office Hours"), not a
  forced re-confirmation or dashboard banner — read by third-party coverage as a materially
  weaker awareness mechanism than the new-domain prompt. [1P ambiguous + 3P interpretation]
- **Keystatic's GitHub-mode setup** (cluster A) is an interactive "Create GitHub App" wizard,
  not a single blind env var paste; a missing variable fails loudly at runtime with a specific
  config error rather than silently degrading. No data found on whether developers actually read
  the generated summary versus paste-and-move-on. [1P] keystatic.com/docs/github-mode
- **TinaCMS's CSP configuration guide** (cluster A) is a pure documented-default, not a forced
  mechanism: platform-specific copy-paste snippets exist, but nothing requires a developer to open
  the page. A developer who never visits it ships with whatever CSP their host defaults to. [1P]
  tina.io/docs/guides/csp-configuration
- **Vercel's AI-bot managed ruleset** ships inactive ("Allow") by default and is a one-click,
  explained toggle to enable logging or denial — opt-in with a low-friction single action once a
  developer finds it, but nothing prompts discovery. [1P] vercel.com/changelog/new-one-click-ai-bot-managed-ruleset
- **Astro's `@astrojs/sitemap` integration, now confirmed**: it throws if `site` is unset —
  but only once a developer has opted into installing the integration in the first place. That's
  requirement-without-obstruction in the coordinator's exact sense: nobody is blocked from
  building a site without a sitemap, but anyone who *chooses* the sitemap feature is walked
  through the one value it needs. [1P] docs.astro.build/en/guides/integrations-guide/sitemap/
- **Docusaurus's three-tier severity pattern is the best sibling found in cluster B**:
  `onBrokenLinks` defaults to hard-fail, `onBrokenAnchors` defaults to warn-only, and `noIndex`
  is a single explicit boolean — three different risk levels get three different defaults,
  chosen individually rather than uniformly forced. [1P] docusaurus.io/docs/api/docusaurus-config
  — though this pattern is applied to content integrity (broken links), not to any of the eight
  ambient surfaces in this survey; no framework tiers severity for headers/robots/AI-crawler/cookies.
- **Next.js's file-convention APIs** (`app/robots.ts`, `app/sitemap.ts`) are a different
  low-friction shape worth naming: nothing is required, but the moment a developer discovers the
  convention exists, doing the right thing costs almost nothing — awareness-through-discoverable-
  convention rather than awareness-through-prompt. [1P, inference on the friction framing]
  nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
- **Ghost's `ghost setup` CLI asks an explicit Y/N at init**: "set up with SSL (Let's Encrypt)?" —
  declinable, so it forces a *decision*, not an *outcome*, which is exactly the informed-
  consideration shape rather than obstruction. Ghost never follows up with a live check that
  HTTPS is actually being served, though, so the awareness is one-time and front-loaded, not
  durable. [1P] forum.ghost.org, github.com/TryGhost/Ghost-CLI
- No example was found anywhere across all four clusters of a **first-run summary** ("here is
  what your site will do by default across N surfaces, confirm or change") — the closest
  approaches conceptually are Cloudflare's per-decision onboarding prompt (cluster D) and Ghost's
  SSL Y/N prompt (cluster C), both scoped to one surface at a time rather than a consolidated
  posture summary. **This gap — no tool anywhere in the 22-tool survey shows a developer a single
  consolidated "here's your ambient posture" summary at any point — is itself the strongest
  argument for cairn building one, since nothing in the market currently does.**

---

## Full classification tables (delivered clusters only)

Classification: **Silent default** (ships a stance, nobody told) / **Documented default** (ships
a stance, clearly stated) / **Forced decision** (build error, required field, init prompt, failing
check — exact mechanism named) / **Absent** (no opinion, not surfaced) / **Not applicable** (tool
structurally doesn't control this layer). Source tags: **1P** = first-party documented, **3P** =
third-party measured, **inference** = reasoned, not directly cited.

### Cluster A — git-backed markdown CMSs

All six are editor-only: they generate an admin UI and commit files to a repo. None controls the
deployed site's HTTP layer, DNS, or CDN — most rows are **Not applicable**, not Absent.

| Tool | Surface | Classification | Mechanism/Evidence | Source | URL |
|---|---|---|---|---|---|
| Decap CMS | Security headers | Not applicable | Editor-only, no site-runtime control | 1P | decapcms.org/docs |
| Decap CMS | robots.txt/sitemap | Not applicable | No mention; generator/host's job | 1P | decapcms.org/docs |
| Decap CMS | AI-crawler posture | Absent | No GPTBot/CCBot mention anywhere | inference | — |
| Decap CMS | Cookies/privacy | Absent | No consent/DNT/GPC mentions | inference | — |
| Decap CMS | Auth email flow | Documented default | git-gateway historically delegated to Netlify Identity (open registration by default); OAuth flow documented, no SPF/DKIM/DMARC guidance | 1P | decapcms.org/docs/backends-overview |
| Decap CMS | Cache/CDN, errors/redirects, TLS | Not applicable | Not the CMS's layer | inference | — |
| TinaCMS | Security headers | Documented default (dev-owned) | Dedicated CSP guide: developer configures CSP, Tina doesn't set it | 1P | tina.io/docs/guides/csp-configuration |
| TinaCMS | robots.txt/sitemap | Absent | No official docs page found | 1P (absence) | tina.io/docs |
| TinaCMS | AI-crawler posture | Absent | No GPTBot/CCBot reference | inference | — |
| TinaCMS | Cookies/privacy | Documented default | Separate telemetry page; opt-out, not a gate | 1P | tina.io/telemetry |
| TinaCMS | Auth email flow | Documented, dev-chosen | Self-hosted "Auth Provider" is pluggable (Auth.js default, TinaCloud/Clerk alternatives) | 1P | tina.io/docs/reference/self-hosted/auth-provider/overview |
| TinaCMS | Cache/CDN, errors/redirects, TLS | Not applicable | Not the CMS's layer | inference | — |
| Keystatic | Security headers, robots/sitemap | Not applicable | No mention in docs | 1P | keystatic.com/docs |
| Keystatic | AI-crawler posture | Absent | No mention | inference | — |
| Keystatic | Cookies/privacy | Absent | Generic footer link only | 1P | keystatic.com |
| Keystatic | Auth email flow | Genuine-awareness init flow | GitHub-mode wizard walks setup, missing env vars fail loudly at runtime rather than silently degrading | 1P/3P | keystatic.com/docs/github-mode |
| Keystatic | Cache/CDN, errors/redirects, TLS | Not applicable | Not the CMS's layer | inference | — |
| Sveltia CMS | Security headers, robots/sitemap | Not applicable | "SPA served from a CDN," no header ownership claimed | 1P | github.com/sveltia/sveltia-cms |
| Sveltia CMS | AI-crawler posture, cookies/privacy | Absent | No mention | inference | — |
| Sveltia CMS | Auth email flow | Documented, dev-owned | GitHub/GitLab OAuth; SECURITY.md covers only vuln reporting | 1P | github.com/sveltia/sveltia-cms/blob/main/SECURITY.md |
| Sveltia CMS | Cache/CDN, errors/redirects, TLS | Not applicable | Not the CMS's layer | inference | — |
| Pages CMS | Security headers, robots/sitemap | Not applicable | No mention | 1P | pagescms.org/docs |
| Pages CMS | AI-crawler posture, cookies/privacy | Absent | No mention beyond generic footer link | 1P/inference | pagescms.org |
| Pages CMS | Auth email flow | Documented, dev-owned | GitHub user token / GitHub App installation token at runtime | 1P | pagescms.org/docs/development/authentication |
| Pages CMS | Cache/CDN, errors/redirects, TLS | Not applicable | Not the CMS's layer | inference | — |
| Front Matter CMS | Security headers, robots/sitemap | Not applicable | VS Code extension, no site-runtime control; SEO features touch frontmatter fields only | 1P | frontmatter.codes/docs |
| Front Matter CMS | AI-crawler posture, cookies/privacy | Absent | No mention | inference | — |
| Front Matter CMS | Auth email flow | Not applicable | Local tool, no login/invite flow | inference | — |
| Front Matter CMS | Cache/CDN, errors/redirects, TLS | Not applicable | Not the tool's layer | inference | — |

**Known incidents (cluster A):**
- CVE-2023-38904 (2023-08-16): stored XSS in Netlify CMS 2.10.192 markdown widget (GHSA-h864-r66v-46rc).
- Netlify Identity/Git Gateway (~Dec 2020): open self-registration default let a fake account
  submit an unauthorized PR to a client site — nobody chose the open-registration posture, the
  platform default did; "Invite only" remained opt-in afterward, i.e., the silent default
  persisted post-incident. Close analogue to our own symptom. github.com/decaporg/decap-cms/issues/4728
- CVE-2026-28792 (CVSS 9.7): TinaCMS CLI dev-server, permissive CORS + path traversal enabling
  browser drive-by file read/write/delete; fixed 2.1.8.
- CVE-2026-29066 / CVE-2026-34604: TinaCMS path-traversal, unauthenticated file read; fixed 2.2.2.
- Netlify Identity/Git Gateway are formally deprecated; Netlify walked back a full-removal plan
  after developer pushback but kept it in a deprecated state, pushing Decap users to third-party
  replacements (e.g., DecapBridge).

**Part 2 bonus (cluster A, speculative unless tagged):** Front Matter's "Content Health" panel
(readability, external-link check, freshness warnings — 1P confirmed) is a real precedent for
editor-time content-hygiene checks; a markdown CMS could plausibly run an analogous check scoped
to *site-operational* posture rather than editorial quality. Deploy previews, structured data,
feed generation, and redirect management were not found as first-party features in any of the
six — that whole tool category defers those to the SSG/host layer (speculative interpretation).

### Cluster B — site frameworks (Astro, Eleventy, Hugo, Next.js, Nuxt, Docusaurus, Starlight, VitePress)

**Headline finding, applies to all eight:** none ships a doctor/preflight/health-check command
that fetches and inspects the live deployed site. Every check found (`astro check`,
`onBrokenLinks`, `ignoreDeadLinks`, config-schema validation) operates on local source config or
local build artifacts, never a round-trip HTTP request to production. [inference, cross-tool,
based on the sourced rows below]

| Tool | Surface | Classification | Mechanism/Evidence | Source | URL |
|---|---|---|---|---|---|
| Astro | Security headers | Silent default (none) | No CSP/HSTS/X-Frame-Options/Permissions-Policy by default; CSP only via experimental `security.csp` config | 1P | docs.astro.build/en/reference/configuration-reference/#securitycsp |
| Astro | robots.txt | Absent (core) | No built-in generation, requires community `astro-robots-txt` | 1P (absence) | npmjs.com/package/astro-robots-txt |
| Astro | sitemap.xml | Documented default, opt-in | `@astrojs/sitemap` official but not installed by default; throws if `site` unset once active | 1P | docs.astro.build/en/guides/integrations-guide/sitemap/ |
| Astro | AI-crawler posture | Absent | No mention in docs | 1P (absence) | docs.astro.build |
| Astro | Trailing-slash/redirects | Silent default | `trailingSlash: 'ignore'`, `build.format: 'directory'`, no canonical-host enforcement | 1P | docs.astro.build/en/reference/configuration-reference/ |
| Astro | Cookies, email, cache/CDN, TLS | Not applicable | No app-level feature; host-dependent | inference | — |
| Eleventy | robots.txt/sitemap.xml | Absent | No official generation; both require third-party plugins | 1P (absence) | github.com/AleksandrHovhannisyan/eleventy-plugin-robotstxt |
| Eleventy | AI-crawler posture | Absent | Not in core; some community robots.txt plugins offer opt-in AI-bot blocking | 3P | github.com/AleksandrHovhannisyan/eleventy-plugin-robotstxt |
| Eleventy | All other surfaces | Not applicable | Pure file-emitting SSG, no server/headers/cookie/email concept, output paths fully developer-defined | inference | — |
| Hugo | robots.txt | Documented default, ON | Auto-generated from embedded template, zero config, overridable | 1P | gohugo.io/templates/robots/ |
| Hugo | sitemap.xml | Documented default, ON | Built-in template, zero config; **not cross-referenced** from the auto robots.txt | 1P | gohugo.io/templates/sitemap/ |
| Hugo | AI-crawler posture | Absent | Default robots.txt is permissive (`User-agent: *`), no AI-bot rules generated | 3P | mertbakir.gitlab.io/hugo/sitemap-robots/ |
| Hugo | Trailing-slash/canonical | Silent default | `uglyURLs: false`, `canonifyURLs: false`, no canonical-host enforcement | 1P | gohugo.io/configuration/all/ |
| Hugo | Security headers, cookies, email, cache | Not applicable | "Typically configured at the web server or hosting platform level" | 1P (absence) | gohugo.io/configuration/all/ |
| Next.js | Security headers | Silent default (none) | Zero headers by default; `headers()` fully opt-in. Only hard default: immutable-asset `Cache-Control` | 1P | nextjs.org/docs/app/api-reference/config/next-config-js/headers |
| Next.js | robots.txt/sitemap.xml | Documented default, opt-in convention | `app/robots.ts`/`sitemap.ts` file-convention (v13.3+); absent entirely if no file created | 1P | nextjs.org/docs/app/api-reference/file-conventions/metadata/robots |
| Next.js | AI-crawler posture | Absent | Only generic Googlebot/Applebot/Bingbot examples in docs; no GPTBot/CCBot anywhere | 1P (absence) | nextjs.org/docs/app/api-reference/file-conventions/metadata/robots |
| Next.js | Cache/CDN headers | Silent default (mixed) | Immutable-asset caching hard default; page/data caching opt-in-off since Next 15; Vercel layers host-level CDN caching on top, differing from standalone `next start` | 1P (partial) | nextjs.org/docs/app/api-reference/config/next-config-js/headers |
| Next.js | Trailing-slash/canonical | Silent default | `trailingSlash: false`, no canonical-host config at framework level | inference | — |
| Next.js | TLS | Not applicable (standalone) / host-provided (Vercel) | `next start` is plain HTTP; Vercel terminates TLS — a host behavior, not Next.js's | inference | — |
| Nuxt | Security headers | Absent (core) | No default headers; `nuxt-security` is an independent community module, opt-in | 1P+3P | nuxt.com/modules/security |
| Nuxt | robots.txt/sitemap.xml | Absent (core) | Requires `@nuxtjs/robots`/`@nuxtjs/sitemap`/`nuxt-seo`, not bundled | inference | nuxt.com/modules |
| Nuxt | AI-crawler posture, cookies | Absent | No first-party mention; cookies only via community modules | inference | — |
| Nuxt | Cache/CDN, trailing-slash | Silent default | Nitro's `routeRules` cache primitive exists but unset by default; no enforced trailing-slash policy | inference | — |
| Docusaurus | robots.txt | Absent | Sitemap plugin bundled, but **no robots.txt generation at all**; docs point to `noIndex` instead | 1P | docusaurus.io/docs/seo |
| Docusaurus | sitemap.xml | Silent default, ON | `@docusaurus/plugin-sitemap` bundled with `preset-classic`, zero config | 1P | npmjs.com/package/@docusaurus/plugin-sitemap |
| Docusaurus | AI-crawler posture | Absent | No mention | 1P (absence) | docusaurus.io/docs/seo |
| Docusaurus | Canonical host (`url`/`baseUrl`) | **Forced decision** | Required config keys; schema validation throws at `start`/`build` if missing | 1P | docusaurus.io/docs/api/docusaurus-config |
| Docusaurus | Trailing-slash | Documented default | Defaults `undefined` ("keeps URLs untouched") | 1P | docusaurus.io/docs/api/docusaurus-config |
| Docusaurus | Broken internal links | **Forced decision** (content integrity, not ambient) | `onBrokenLinks` defaults `'throw'`, fails build; checks local build output only, never a deployed URL | 1P | docusaurus.io/docs/api/docusaurus-config |
| Starlight | Security headers | Absent | Inherits Astro's absence, no Starlight-specific opinion found | inference | starlight.astro.build/reference/configuration/ |
| Starlight | robots.txt/sitemap/AI-crawler | Absent / not found | Not mentioned in the config reference page reviewed | 1P (absence) | starlight.astro.build/reference/configuration/ |
| Starlight | Required config | Documented, minimal forced field | Only `title` is required — not surface-relevant | 1P | starlight.astro.build/reference/configuration/ |
| VitePress | Security headers, robots, sitemap, AI-crawler | Absent | None found in site-config reference | 1P (absence) | vitepress.dev/reference/site-config |
| VitePress | URL shape (`cleanUrls`) | Silent default | Defaults `false` (URLs keep `.html`) | 1P | vitepress.dev/reference/site-config |
| VitePress | Dead links | **Forced decision** (content integrity, not ambient) | `ignoreDeadLinks` defaults `false`, build fails on any dead link unless disabled; checks local build output only | 1P | vitepress.dev/reference/site-config |

**Forced decisions found (cluster B):** Docusaurus's `url`/`baseUrl` (required, but gates
canonical-host *identity*, not an ambient surface); Docusaurus's `onBrokenLinks: 'throw'` default
and VitePress's `ignoreDeadLinks: false` default (both fail the build on broken/dead links, both
content-integrity gates that check local build output only); Astro's `@astrojs/sitemap` requiring
`site` once opted in. **None of the eight tools gates the header/robots/AI-crawler/cookie surfaces
specifically** — everything there is silent default or fully absent.

**Known incidents (cluster B):**
- Docusaurus GitHub issue #7679 (2022): `onBrokenLinks: 'throw'` reproduced only in `build`, not
  `start`; closed "working as intended" — thin evidence, no broad resentment thread found either way.
- Docusaurus GitHub issue #2516: v2-era report of the bundled sitemap plugin silently failing to
  fire under certain deploy conditions — a silent-default failure mode, not a forced-decision complaint.
- Vercel (host, not framework, but directly relevant): auto-sets `X-Robots-Tag: noindex` on preview
  deployments, but explicitly *not* when a custom domain is attached to a non-production branch — a
  documented "silent default with a silent exception," a plausible near-miss for our own incident class.
- No dated Starlight- or VitePress-specific incidents found (searched, not found — not guessed).

**Part 2 bonus (cluster B, speculative unless tagged 1P):** Hugo ships both robots.txt and
sitemap.xml zero-config, most batteries-included of the eight, but doesn't cross-link them [1P].
Docusaurus/VitePress both fail the build on broken/dead links by default, a proven
"safe-by-default, override-to-relax" pattern cairn could mirror for internal link integrity — with
the caveat that neither checks a live URL. Starlight ships Pagefind search by default; VitePress
ships its own built-in local search — suggesting search-index generation as a default is an
established docs-site-generator norm. None of the eight offers redirect-management UI,
deploy-time header diffing, or a live-URL preflight — the gap a markdown CMS could differentiate on.

### Cluster C — opinionated hosted/self-hosted CMSs (Ghost, WordPress, Statamic, Kirby)

| Tool | Surface | Classification | Mechanism/Evidence | Source | URL |
|---|---|---|---|---|---|
| Ghost | Security headers | Absent | No CSP/HSTS/X-Frame-Options by default; TLS/HSTS deferred to reverse proxy; only `referrerPolicy` (default `origin-when-crossorigin`) ships; CSP request (#7206, 2016) never adopted | 1P | docs.ghost.org/config, github.com/TryGhost/Ghost/issues/7206 |
| Ghost | robots.txt/sitemap.xml | Documented default | Both auto-generate; default robots.txt allows all, disallows `/ghost/` and `/p/`; sitemap updates on publish; overridable via theme-root file | 1P | ghost.org/changelog/xml-sitemaps/ |
| Ghost | AI-crawler posture | Absent (blocking) / Documented, opt-in (discoverability) | Never shipped GPTBot/CCBot disallow rules; Jul 2026 "Optimize for AI search" (GEO) generates `llms.txt` + Markdown-via-URL, opt-in toggle | 1P + 3P | ghost.org/changelog/geo/, forum.ghost.org/t/blocking-openai-crawlers/40439 |
| Ghost | Cookies/privacy | Documented default | Only session cookies for member auth; analytics cookieless; docs state a consent banner "isn't a requirement on most Ghost sites"; no DNT/GPC | 1P | ghost.org/help/cookie-notice/ |
| Ghost | Outbound email/DNS auth | Documented default (transactional) / Forced decision (bulk newsletter) | Transactional mail undocumented as required at setup, failures surface reactively via admin banner; newsletter sending UI-blocked until Mailgun key entered; "Send test email" genuinely round-trips a real message | 1P + GitHub issue | docs.ghost.org/config, docs.ghost.org/faq/mailgun-newsletters, github.com/TryGhost/Ghost/issues/21882 |
| Ghost | Cache/CDN headers | Documented default | `caching` config sets `maxAge` per response type | 1P | docs.ghost.org/config |
| Ghost | Errors/redirects/trailing-slash | Documented default | Auto-canonicalizes to trailing-slash; built-in 404 fallback; `redirects.yaml`/`routes.yaml` for custom rules | 1P | ghost.org/docs/themes/routing/ |
| Ghost | TLS | Absent (core) / Forced decision (guided install) | No core TLS/HSTS handling; `ghost setup` CLI asks explicit Y/N for SSL/Let's Encrypt (declinable); no post-install live check that HTTPS is served | 1P | forum.ghost.org, github.com/TryGhost/Ghost-CLI |
| WordPress | Security headers | Absent | Core ships none of CSP/HSTS/X-Frame-Options/Permissions-Policy/Referrer-Policy | 3P | patchstack.com/articles/wordpress-security-headers/ |
| WordPress | robots.txt (virtual) | Documented default | Auto-served, allows all; "Discourage search engines" flips to `Disallow: /`, advisory only, not enforced | 1P + 3P | wordpress.org/support, liquidweb.com |
| WordPress | sitemap.xml (core since 5.5) | Silent default | `/wp-sitemap.xml` live on every fresh install, zero setup, no opt-out UI | 1P | make.wordpress.org/core/2020/07/22/ |
| WordPress | AI-crawler posture | Absent | No core handling as of Aug 2026; Trac #60805 and #62257 both open/unmerged | 1P (Trac) | core.trac.wordpress.org/ticket/60805, /62257 |
| WordPress | Privacy/cookies | Documented default (tools) / Absent (consent) | Core ships privacy-policy-page prompt, data export/erasure, opt-in comment-consent checkbox (4.9.6, 2018); no cookie banner, no DNT/GPC | 1P | pantheon.io/learning-center/wordpress/gdpr |
| WordPress | Outbound email (`wp_mail`) | Silent default; failure also silent | Wraps bundled PHPMailer; without SMTP config falls back to unauthenticated local `mail()`/sendmail; failure fires `wp_mail_failed` hook only, no admin nag unless a developer wires it | 1P (hook ref) + 3P | developer.wordpress.org/reference/hooks/wp_mail_failed/, wpmailsmtp.com |
| WordPress | Cache/CDN headers | Silent default (weak/none) | No page-caching engine in core; anonymous responses get no ETag/Cache-Control tuning | 3P + Trac | core.trac.wordpress.org/ticket/57627 |
| WordPress | 404/canonical/trailing-slash | Silent default | Pretty permalinks force trailing-slash canonical via `redirect_canonical()`; also "guesses" near-miss URLs instead of 404ing, opt-out filter only | 3P | dev.to/plank, permalinkmanager.pro |
| WordPress | TLS (`FORCE_SSL_ADMIN`) | Documented default off | Unset by default, must be hand-added to `wp-config.php`, no install prompt | 1P | developer.wordpress.org/reference/functions/force_ssl_admin/ |
| WordPress | Site Health (effective-state feature) | Mixed — see Priority 1 above | Loopback check is a genuine live HTTP round-trip; HTTPS indicator reads the option value not the served scheme; robots.txt indicator reads a DB flag not a live fetch; no core email test exists at all (lives only in third-party plugins) | 1P | wordpress.org/documentation/article/site-health-screen/ |
| Statamic | Security headers | Absent | Laravel core ships none; Statamic adds nothing; first-party marketplace addon is opt-in, paid | inference + 1P listing | statamic.com/addons/lndr/security-headers |
| Statamic | robots.txt/sitemap.xml | Absent from core | No generation in core; first-party paid SEO Pro or community addons fill the gap | 1P (addon docs) | statamic.com/addons/statamic/seo-pro/docs |
| Statamic | AI-crawler posture | Absent | No docs, blog, or changelog hit for GPTBot/CCBot/ChatGPT-User | not found | — |
| Statamic | Cookies/consent | Absent from core | Only third-party marketplace addons | 3P | statamic.com/addons/kiwikiwi/consent-manager |
| Statamic | Outbound email/DNS auth | Silent default | `.env.example` ships `MAIL_MAILER=log`; invites/resets silently vanish to a log file until manually swapped; no SPF/DKIM guidance; CP's "Send Test Email" reports success even under the default log driver, so the live probe doesn't catch the default's own trap | 1P (repo+docs) + GitHub issue | github.com/statamic/statamic/blob/master/.env.example, statamic.dev/email, github.com/statamic/cms/issues/9309 |
| Statamic | Cache/CDN headers | Documented default (off) | Static caching disabled by default; when enabled, server-side rewriting only, no documented Cache-Control/ETag headers | 1P | statamic.dev/advanced-topics/static-caching |
| Statamic | Trailing-slash/canonical/404 | Documented default, deployer-implemented | Docs state non-trailing-slash requests still accepted; enforcing one form requires web-server config | 1P | statamic.dev/knowledge-base/tips/trailing-slashes |
| Kirby | Security headers, robots/sitemap, AI-crawler, cookies, cache, error/trailing-slash, TLS | Absent / not found | No headers config surfaced; docs point to a separate hardening guide rather than shipping defaults; several rows not independently re-confirmed this session (thinnest coverage in survey) | inference | getkirby.com/security |
| Kirby | Outbound email | Documented default, not forced | SMTP transport config "highly recommended" (PHP `mail()` limits cause "delays or non-delivery"), framed as best practice not required; no feature blocked pending mail config | 1P | getkirby.com/docs/guide/emails |

**Forced decisions found (cluster C):** Ghost's `ghost setup` SSL Y/N prompt (declinable — forces
a decision, not an outcome) and its Mailgun-key gate on bulk newsletter sending (not declinable if
newsletters are wanted). **WordPress: none block** — Site Health is purely a dashboard, no core
mechanism blocks an update/publish/plugin action on its status. **Statamic/Kirby: none found.**

**Known incidents (cluster C):**
- CVE-2013-0235 (Feb 2013): WP XML-RPC pingback SSRF/port-scan; patched request validation but
  left pingback-relay DDoS amplification and `system.multicall` brute-force batching by design;
  still enabled by default in 2026.
- CVE-2016-10033 / CVE-2016-10045 (Dec 2016): PHPMailer unauthenticated RCE via crafted header,
  inherited by every WP site through the bundled dependency; first patch incomplete.
- CVE-2017-5487 (Jan 2017): WP REST API `/wp-json/wp/v2/users` unauthenticated enumeration; 4.7.1
  narrowed but didn't eliminate it; base behavior persists today.
- Google/Yahoo bulk-sender DMARC enforcement, Feb–Apr 2024: phased rejection of unauthenticated
  bulk senders over ~5,000 msgs/day; because `wp_mail()`'s default transport authenticates nothing,
  this degraded default-configuration WP mail deliverability industry-wide. Well-corroborated
  across sources but no single named WordPress postmortem found — flagged as inference from
  correlated 1P (DMARC timeline) + 3P (WP-specific fix guides), not one citable event.
- CVE-2026-54003 (Critical, 9.1): Kirby ≤4.9.3, 5.0.0–5.4.3, reverse-proxy setups trusting
  `Forwarded`/`X-Client-IP`/`X-Real-IP` headers by default — an ambient trust default nobody opted
  into, directly on-theme; fixed 4.9.4/5.4.4.
- CVE-2026-54004/54005 and an unnumbered file-upload permission bypass: Kirby path-traversal/
  permission issues, fixed by 5.5.2 (2026).
- Ghost and Statamic: no CVEs tied to a silent default; Ghost has a persistent forum-thread
  cluster of transactional-mail-silence frustration; Statamic's closest hit is GitHub #9309
  (UX confusion on invite-email failure), not a security incident.

**Part 2 bonus (cluster C, speculative unless tagged 1P):** Ghost's sitemap/RSS generation and
`redirects.yaml`/`routes.yaml` are genuine first-party site-hygiene features [1P]. WordPress Site
Health's loopback-check pattern (a real self-directed HTTP round-trip) is a reusable model for a
"does the deployed site actually work" preflight distinct from config validation. Statamic and
Kirby both lean on git-friendly flat files as their implicit backup/versioning story rather than
shipping a separate export feature — a speculative parallel for a markdown CMS already doing the same.

### Cluster D — hosting layers (Vercel, Netlify, Cloudflare Pages/Workers)

| Tool | Surface | Classification | Mechanism/Evidence | Source | URL |
|---|---|---|---|---|---|
| Cloudflare | Security headers | Absent (app layer) / Documented (edge TLS only) | No CSP/X-Frame-Options/Permissions-Policy injected; HSTS is an opt-in dashboard toggle | 1P | developers.cloudflare.com/ssl/edge-certificates/additional-options/http-strict-transport-security |
| Cloudflare | robots.txt/sitemap | Documented default (opt-in), confused in practice | AI Crawl Control's managed robots.txt prepends Cloudflare's block ahead of the site's own file when enabled; users report it persisting after disabling | 1P + 3P | developers.cloudflare.com/bots/additional-configurations/managed-robots-txt ; community.cloudflare.com/t/874870 |
| Cloudflare | AI-crawler posture | Silent-default-adjacent / opt-out for existing zones (full timeline below) | "AI Scrapers and Crawlers" toggle, Security→Bots | 1P + 3P | blog.cloudflare.com/content-independence-day-ai-options |
| Cloudflare | Cookies/privacy | Silent default (necessary cookies) / Absent (GPC) | `__cf_bm`, `__cflb` auto-set when Bot Management/Load Balancing active; no confirmed GPC honoring | 1P | developers.cloudflare.com/fundamentals/reference/policies-compliances/cloudflare-cookies |
| Cloudflare | Email/DNS auth | Absent (opt-in) | `env.EMAIL.send()` requires explicit `wrangler email sending enable <domain>`; Routing is a separate opt-in forward path | 1P | — |
| Cloudflare | Cache/CDN headers | Documented default | Pages: `Cache-Control: public, max-age=0, must-revalidate` + ETag revalidation; no stale-while-revalidate by default | 1P | developers.cloudflare.com/pages/configuration/serving-pages |
| Cloudflare | Errors/redirects/canonical | Absent | No automatic 404, www/apex canonicalization, or trailing-slash policy | inference | — |
| Cloudflare | TLS | Documented default / partial forced decision | TLS 1.0 floor by default; Minimum TLS Version is an explicit dashboard field (not configurable for Pages custom hostnames) | 1P | developers.cloudflare.com/ssl/edge-certificates/additional-options/minimum-tls |
| Vercel | Security headers | Documented default (partial) | HSTS auto-applied + preloaded, `X-Content-Type-Options` on static files; CSP/X-Frame-Options/Permissions-Policy/Referrer-Policy not set | 3P | vibeappscanner.com/security-issue/vercel-insecure-headers ; vercel.com/docs/cdn-security |
| Vercel | robots.txt/sitemap | Absent | Static-file convention only, no edge injection | 3P/inference | freetooldev.com |
| Vercel | AI-crawler posture | Documented default, opt-in | AI-bot managed ruleset ships inactive ("Allow"); explicit toggle to log/deny, free on all plans | 1P | vercel.com/changelog/new-one-click-ai-bot-managed-ruleset |
| Vercel | Cookies/privacy | Not found | — | — | — |
| Vercel | Email/DNS auth | Absent | Not a sending host | inference | — |
| Vercel | Cache/CDN headers | Documented default | `Cache-Control: public, max-age=0, must-revalidate` default; static assets cached 31 days at edge | 1P | vercel.com/docs/caching/cache-control-headers |
| Vercel | Errors/redirects/canonical | Absent | Developer-configured via `vercel.json`, no forced canonical policy | inference | — |
| Vercel | TLS | Documented default | Automatic Let's Encrypt provisioning; no customer-facing minimum-TLS control found | 3P | ahmadawais.com |
| Netlify | Security headers | Silent default (functionally absent) | No CSP/HSTS/X-Frame-Options added; entirely dev-configured via `_headers`/`netlify.toml` | 3P | vibeappscanner.com/security-issue/netlify-insecure-headers |
| Netlify | robots.txt/sitemap | Absent | Build-time convention only, no edge injection | 1P/3P | docs.netlify.com/robots.txt |
| Netlify | AI-crawler posture | Documented default, opt-in | "User Agent Blocker" extension, must be installed + configured | 1P | docs.netlify.com/build/build-with-ai/block-ai-crawlers |
| Netlify | Cookies/privacy | Not found | — | — | — |
| Netlify | Email/DNS auth | Absent | Not a sending host | inference | — |
| Netlify | Errors/redirects/canonical | Documented default | Trailing-slash normalization ("Pretty URLs") on by default; custom `404.html` auto-served if present | 1P/3P | docs.netlify.com/manage/routing/redirects/redirect-options |
| Netlify | TLS | Documented default | Automatic Let's Encrypt HTTPS | 3P | andrewlock.net |
| Netlify | Bot blocking (non-AI) | **Silent default, retroactive** | PHP-path bot-scan blocking rolled out automatically to all plans, edge-level, 2025-12-28, no customer action | 1P | netlify.com/changelog/2026-02-27-php-scan-blocking |

**AI-crawler blocking timeline (Cloudflare, the richest history found in this entire survey):**
1. **2024-07-03**: "Declare your AIndependence" — opt-in dashboard toggle, free tier included.
2. **2024-08-20**: Button refresh; >90,000 zones opted in within weeks.
3. **2024-09-23**: AI Audit ships — free analytics showing AI-crawler hits, no setup, not blocking.
4. **2025-07-01**: "Content Independence Day" — Cloudflare becomes the first major host to make
   AI-crawler blocking the **default at signup for new domains**, via an onboarding prompt.
   cloudflare.com/press/press-releases/2025/cloudflare-just-changed-how-ai-crawlers-scrape-the-internet-at-large
5. **2025-08-27/28**: AI Audit rebrands to AI Crawl Control, GA; robots.txt compliance tracking
   added (the effective-state feature flagged above).
6. **~2026-07-01/02**: Bots split into Search / Agent / Training categories, independently controllable.
7. **2026-09-15 (upcoming)**: Training and Agent bots blocked by default on ad-monetized pages for
   **existing** domains too, per most-recent coverage — though Cloudflare's own language is
   ambiguous on scope, and existing customers can opt out via Security settings before the date.
   Notice mechanism found: blog post + one livestream, not a forced dashboard re-confirmation or
   email. hosting.com/blog/cloudflares-new-ai-crawler-defaults-and-what-they-mean-for-site-owners
8. **Independent of the above**: Super Bot Fight Mode / Bot Fight Mode can inject the
   managed-robots.txt block at the edge for AI-provider IPs **regardless of the visible dashboard
   toggle state** — a Feb 2026 case (godmode.ph) found this happening even after the customer set
   "Block AI training bots" to allow, requiring a Worker override to fully defeat. A Jun 2026
   third-party warning documents the same failure class. **This is the closest documented analogue
   to our own triggering incident** — a toggle reading "allowed" while edge behavior reads
   "blocked." godmode.ph/blog/cloudflare-blocking-ai-crawlers-philippines ; ai.aeo.press/blog/a-cloudflare-managed-robots-txt-warning

Vercel: AI-bot ruleset always shipped inactive, no default-on or bundling found. Netlify: no
native AI-crawler blocking; requires manually installing the User Agent Blocker extension.

**Other known incidents (cluster D):**
- Feb 2026, ren.ph: AI invisibility traced to Cloudflare edge-injecting a managed robots.txt block
  for AI-provider IPs regardless of dashboard state; fixed only via a Worker override.
- Jun 2026: third-party warning of "select 'Do not block' and still disallow all bots" on Cloudflare.
- HN discussion of the 2025-07-01 announcement (news.ycombinator.com/item?id=44443480) surfaces
  passive-adoption concern: customers using Cloudflare only for DNS/mail not realizing their
  crawler-facing behavior changed underneath them.
- 2025-12-28, Netlify: automatic PHP bot-scan blocking rolled to all plans with no opt-in —
  the same "silently applied edge behavior on an existing site" pattern, non-AI context, second host.

**Part 2 bonus (cluster D, speculative unless tagged):** Cloudflare's AI Crawl Control
robots.txt-compliance view is a strong UI model for a cairn "what's actually being served"
self-check. Deploy-preview URLs and redirect-management UIs (Netlify, Vercel) are mature and
well-documented; a CMS could plausibly surface a "preview + diff before publish" pattern inspired
by these (speculative). Vercel's cryptographic bot-verification badges are a more rigorous
primitive than user-agent-string matching, noted for awareness only.

---

## What still needs doing

All four clusters delivered; the survey is complete at the tool level. Two residual soft spots,
both named honestly in the Coverage table rather than hidden: Starlight and VitePress within
cluster B were finished under time/search-budget pressure after a mid-agent process hiccup and
could use a second, calmer pass; Kirby within cluster C has several "not found"/"not
independently re-confirmed" rows and would benefit from a dedicated follow-up given how directly
relevant its CVE-2026-54003 (silent reverse-proxy header trust) is to this research's theme.

The standout cross-cluster finding worth carrying into the design decision: **nothing surveyed —
across all 22 tools in four categories — ships a consolidated "here is your ambient posture,
confirm or change" summary at any point in a developer's workflow.** The nearest approaches are
all single-surface (Cloudflare's AI-crawler onboarding prompt, Ghost's SSL Y/N prompt, Astro's
sitemap `site` requirement). That absence, combined with WordPress Site Health's demonstrated
failure mode (a "health check" that reads configuration back to itself on 2 of 3 checks rather
than probing live state), is the strongest evidence found that a market gap exists for cairn to fill.
