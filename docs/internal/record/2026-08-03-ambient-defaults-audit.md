# Ambient-defaults audit: what a deployed cairn site does that nobody decided

Run 2026-08-03. Commissioned by the ROADMAP entry of the same name, which also fixes the method
and the boundary. This document reports; it fixes nothing.

Every gap-detection mechanism the project has is driven by someone bumping into something. The
consumer briefs report what a site hit while building, the friction log reports what writing a doc
exposed, the review gates catch defects in code just written. All of them are blind to the same
class: ambient behavior a deployed site inherits without anyone choosing it, which fails silently
and so generates no report. The AI-crawler finding was one instance, where two sites were declining
AI crawlers and nobody picked that.

## Method, and what counts as a finding

Seven surfaces, one independent lens each, then a second agent per surface whose job was to refute
that lens rather than agree with it. Fourteen agents, no failures. Each lens enumerated what a
deployed site actually does on its surface and asked one question per behavior: who chose this?

- **The developer, explicitly.** The consuming site sets it. Not a finding.
- **cairn, deliberately, and it is documented.** Both halves required.
- **Nobody.** Inherited from a framework, a platform, a library, or an unexamined line. Only this
  is a finding.

Findings were measured against the four live sites wherever the surface permitted it, because the
whole premise is that what the engine emits is not always what ships. That premise paid: the single
strongest finding below was invisible in the code and obvious in one `curl`.

The verification pass earned its cost. It killed 7 of 19 lens findings outright, mostly by finding
a doc the lens failed to grep or by opening a cited line and reading it correctly. It also produced
**50 behaviors the lenses never enumerated**, several stronger than the findings they were sent to
check. Coverage, not classification, was the weak link, and most of what follows in the phase-P
bucket came from the verify pass rather than the lens pass.

## Three corrections to the audit's own inputs

**The ASC site is `dev.aksailingclub.org`.** The lenses probed the apex, which runs Hugo, not
cairn. Two lenses caught the divergence and flagged it honestly rather than folding it into a
finding, which is the correct behavior; one attributed a `/admin` 404 to a cairn deploy anomaly. The
site was re-probed at the right host: it 303s to `/admin/login`, sets `__Host-cairn_csrf`, redirects
http to https, refuses TLS 1.1, and carries the Cloudflare managed-robots prepend. It also sets the
four baseline security headers on its own public pages from `src/hooks.server.ts`, with a comment
explaining that the root `_headers` file never reaches SSR output on Cloudflare. A consuming site
independently discovering and hand-rolling that is a signal about altitude, not a site-local choice.
The managed-robots prepend is on three of four sites, not two.

**A stance recorded only in `docs/superpowers/` is not documented.** Several refutations rest on a
decision written in a spec or a landed plan's post-mortem. Those are internal write-once docs, which
this repo's own Vale config excludes from the published standard. A developer cannot reach them, so
from the developer's vantage the behavior is indistinguishable from one nobody chose. Findings that
died only on an internal-spec citation are restored below under **chosen but unreachable**. Findings
refuted by a published page stay dead, and several were: the public-output header scoping is stated
in `docs/reference/sveltekit.md:86-88` and `:1071`, in `docs/explanation/security-model.md:54`, and
in `docs/reference/auth-crypto.md:157-159`.

**An interim SPF claim made during this session was wrong and is retracted.** Reading each domain's
apex SPF record suggested three of four sites did not authorize Cloudflare to send. That was the
wrong record. Cloudflare's onboarding uses `cf-bounce.<domain>` as the return path, and SPF is
evaluated against the return path, not the From header domain. All four sites carry
`cf-bounce._domainkey.<domain>` DKIM and `v=spf1 include:_spf.mx.cloudflare.net` on the return path,
verified by `dig`. All four are correctly onboarded. What survives on that surface is narrower and
is stated accurately below.

## Findings

### Rides this window

One candidate, and it is the audit's strongest result.

**The engine pins every visitor's browser to HTTPS for two years, across the apex and every
subdomain, on zones whose owner chose not to enable HSTS.** `applySecurityHeaders`
(`src/lib/sveltekit/admin-response.ts:13`) sets `Strict-Transport-Security: max-age=63072000;
includeSubDomains` unconditionally on every admin response. Measured: `cairn.pub/admin/login` serves
it while `cairn.pub/` serves no HSTS at all, because that zone's edge HSTS is off. One editor visit
to `/admin` therefore overrides the zone owner's decision, for two years, in that browser. Only
`max-age=0` from the same host clears it. The blast radius is the subdomains: any sibling subdomain
not on HTTPS breaks for that editor.

The value appears in no published doc. `grep` for `63072000` or `includeSubDomains` across `docs/`
hits only `superpowers/plans`, `superpowers/specs`, and `internal/history`. The engine also
contradicts its own tooling here, since `checks-cloudflare.ts:140` reports the zone's HSTS as
failing on a zone whose editors are already hard-pinned by the engine, and nothing reconciles the
two.

It is not API-breaking, so it fails the strict rides-this-window bar. I recommend it rides anyway.
The fix changes a security header that four deployed sites emit, `includeSubDomains` on a
domain-wide two-year pin is the kind of decision a site owner should make rather than inherit, and
the migration sessions are when each site is open anyway. Carrying it earns one `Consumers must:`
line instead of a later visit.

### Chosen but unreachable

**The guard's unauthenticated 303 carries none of the six baseline headers.** `guard.ts:137` throws
the redirect from inside the `handle` hook, before `resolve()` and therefore before the header line
at `:153`. This was noticed at the 2026-06-02 auth-hardening pass, assessed as low impact, and left
deliberately. The record of that decision is a line in a landed plan's post-mortem and an "Out of
scope" entry in a design spec. It appears in no published doc, no ROADMAP entry, and no STATUS
carry-forward, so nothing will resurface it and a future refactor that widens the gap has no
tripwire. Practical risk today is low, since a 303 has no renderable body. Per this repo's own watch
items rule, the right disposition is a test, which is the gold standard for a watch that must not be
forgotten.

**The public/admin header split is documented, but not where a reader looks.** The scoping is real
and reachable. `security-model.md`'s "cairn handles / your site handles" table is where an operator
would check, and it does not carry the line. A docs-placement item, not an ambient default.

### Defers to phase P

Ordered by consequence.

**Cloudflare's managed robots.txt prepends rather than replaces, and cairn cannot detect it.** Three
of four sites ship a file with two `User-agent: *` groups, authored by neither layer and matching
neither layer's intent. No doctor check reads a deployed site's live robots.txt, and no published
doc mentions the managed layer. This is the audit's own seed, already written up in the AI-crawler
research, so it needs a home rather than rediscovery.

**Post-handoff mail delivery produces no signal anywhere.** `auth.link.send_failed` fires only on a
synchronous rejection from the send call, which resolves the moment Cloudflare accepts the payload.
An editor whose link is accepted and then dropped, spam-foldered, or DMARC-rejected sees the same
neutral "check your inbox" response as a success, and the operator's logs show a clean
`auth.link.requested` to `auth.token.minted` trail with no error. Cloudflare Email Sending has no
delivery webhook, so bounce handling is not cheaply available, but the boundary was never written
down. Two cheap parts sit inside this: the binding returns a `messageId` per send that
`src/lib/email.ts:52` discards by typing the send as `Promise<void>`, and Cloudflare ships delivery
telemetry (Queues event subscriptions, the Email Service GraphQL analytics API) that no cairn doc
mentions.

**Nothing in cairn reads SPF, DKIM, or DMARC, and the docs' promise is unqualified.**
`configure-auth-and-d1.md:172` says Cloudflare "adds the SPF, DKIM, and DMARC records for you." True
on a fresh domain. On a domain that already sends mail, onboarding does not touch an existing
`_dmarc` record, which is measurable here: 907.life and aksailingclub.org both carry `p=none`
records created 2026-02-04, months before their Email Sending onboarding (2026-05-25 and
2026-07-08), while cairn.pub and ecxc.ski have `p=reject` created at onboarding time. The doctor
checks only the onboarding boolean the Cloudflare API exposes.

**Admin responses carry no `Cache-Control` at all.** Only `brandedAdminPage` sets `no-store`, and it
serves the guard's error pages, not the real flow. The login page mints the CSRF cookie, and the
confirm redirect carries the session cookie. Safe today only because Workers dynamic responses are
not edge-cached by default, so a routine "cache everything" rule on HTML would break it. No `Vary`
is set anywhere either, and Cloudflare's default cache key ignores cookies.

**Public page caching rides a per-route `prerender` flag nobody verifies.** The convention lives in
guide prose and example code. Losing the line degrades a route to per-request SSR with correct
output, no error, and no failed test, so nothing surfaces it. Already true in production on
ecxc.ski's own `/`.

**Trailing-slash status diverges across the family.** 907.life answers 308 with
`x-sveltekit-normalize`, which is SvelteKit's hard-coded normalization reaching the Worker. cairn.pub
and ecxc.ski answer 307 from Cloudflare's static-asset layer, which resolves the mismatch by its own
`html_handling` config. `grep` for `html_handling` across the repo returns nothing. The same URL
mismatch on the same engine gets permanent-consolidation semantics on one site and temporary on
another.

**cairn's one deliberate public-output header does not survive to the wire.**
`src/lib/delivery/responses.ts` sets `charset=utf-8` on the feed, sitemap, and robots content types.
None of the four sites serves it; the prerendered static-asset path re-derives a bare
`application/xml` or `text/plain`. Reading the code says the engine chose correctly, which is why
this needed measuring.

**The admin's client-written cookies skip the engine's own discipline.** `cairn-admin-theme` and
`cairn-admin-nav-collapsed` are written as a raw `document.cookie` string with a one-year lifetime
and no `Secure` attribute, while every other engine cookie derives its name and prefix from
`cookieName()`. Alongside them sit seven `cairn-editor-*` localStorage keys with no expiry,
enumerated in no doc. No single page inventories what a cairn site stores, so an operator writing a
privacy notice from `security-model.md` under-reports.

**`CairnAdminShell` carries no robots meta or `X-Robots-Tag`,** unlike every other admin page, all
of which carry `noindex`. Defense in depth rather than live exposure, since the guard redirects
first. One line in `applySecurityHeaders` covers the shell and every other admin response at once.

**The sitemap-completeness net is inert in the reference implementation.** `unlistedRoutes` exists
and is documented as the guard against silent sitemap gaps, and the showcase never calls it. The
concrete instance is `(site)/styleguide`, a static prerendered public page absent from the
showcase's own sitemap. Separately, `/probe-craft` ships into every scaffolded site, crawlable,
because the template exclude list does not name it. `buildSitemap` also has no size ceiling and no
sitemap-index support.

**Minimum TLS Version is documented nowhere and checked by nothing,** on the same SSL/TLS dashboard
panel the deploy guide already walks the developer through for Always Use HTTPS and HSTS. Cloudflare
defaults the floor to TLS 1.0.

### Not cairn's job

Operator items on the estate, listed so they land somewhere rather than in conversation. cairn.pub
serves `http://` with a 200 and no redirect, and carries no zone HSTS on public pages. 907.life has
a proxied `www` record with no working origin, returning 522. 907.life and aksailingclub.org run
magic-link auth under DMARC `p=none` records that predate cairn's use of those domains. A site's
`*.workers.dev` hostname stays live and crawlable after a custom domain is attached, mitigated by a
fixed-origin canonical tag on every page.

## What terminates

The method requires the enumeration to close, and it does. Media delivery is the surface cairn gets
right end to end: content-addressed, immutable, deliberate, documented, and matching between the
served header and the stored R2 metadata. Public visitors receive zero cookies. No analytics,
telemetry, or third-party script ships in the engine or the showcase. Error bodies leak nothing on a
production build, and explicit `error()` calls all pass non-sensitive messages. The guard's branded
refusals for CSRF, HTTPS, and missing bindings are deliberate and documented. Absolute URLs derive
from `PUBLIC_ORIGIN` rather than the arrival host, so a wrong host cannot mint a broken magic link.

## What the next passes consume

**The AI-posture pass** gets its answer to the shared-shape question. The ambient defaults do not
want one policy surface. They split cleanly into behavior the engine emits (headers, cache
directives, cookie attributes) and behavior the engine can only observe (the managed robots layer,
zone TLS settings, DNS mail authentication). A posture config belongs to the first group and should
not try to absorb the second. What the second group wants is a check, which is the same conclusion
the setup work reaches from the other direction.

**The setup and provisioning work** gets a specification and a sharper premise. The comparables
survey found no tool among 22 that fetches its own live deployed site and reports what it is
actually serving, with WordPress Site Health as the named cautionary case, since two of its three
checks read configuration back to itself while looking like live probes. cairn's doctor currently
sits on the same side of that line for its three Cloudflare checks. Every finding in this audit that
required measurement rather than reading was reachable with `curl` and `dig` and no credential at
all, including HSTS presence, the http-to-https redirect, the TLS floor, the served robots.txt, the
trailing-slash status, and the full DKIM and return-path SPF picture. The effective-state check is
therefore cheaper than the config-readback check it would replace, and it needs no API token, which
answers the token question the setup work was circling.

## Coverage and limits

Seven surfaces, 14 agents, no agent errors. Weakest spots, named rather than hidden: the four-site
measurements were taken against the wrong ASC host and re-taken by hand for the surfaces where that
mattered, so ASC's cookie and cache rows rest on three sites plus a targeted re-probe rather than a
full fourth pass. No live cache-poisoning test was attempted, since that would mean mutating a
production Cloudflare rule, so the admin `Cache-Control` finding rests on the measured absence plus
Cloudflare's documented default rather than a reproduced exploit. The zones' actual minimum-TLS
floors could not be measured from this workstation for all four, because the local OpenSSL refuses
to offer TLS 1.0 and 1.1; ASC was confirmed to refuse TLS 1.1 and the others were not established.
Whether an Email Routing rule exists on any zone that would surface bounces was not determined.
