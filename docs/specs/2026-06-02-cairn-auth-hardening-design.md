# cairn Auth-Hardening Design

**Status:** approved (brainstormed 2026-06-02). Supersedes nothing; extends the locked auth design in the
functional spec (`docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`, section 7.1).

## Goal

Close the known hygiene gaps in the self-owned auth and the GitHub App commit path. The functional spec already
flagged the consequence of owning auth: cookie, CSRF, and session hygiene are the project's responsibility now.
This pass discharges that responsibility for the gaps that exist today, and it does so without adding any new
Cloudflare binding or any per-site setup, so a consuming site upgrades by bumping the version.

## Threat model and scope

The admin authors are a small, allowlisted set of magic-link-authenticated humans. Their content does not render
live. It commits to `main`, runs through CI, and deploys as static-generated HTML, so every change has a git
audit trail. That model shapes what is worth hardening. The real risks are session and cookie handling, abuse of
the unauthenticated magic-link request endpoint, and the cost of re-minting the GitHub App token. The pass
targets those.

Two things are explicitly out of scope, each for a stated reason:

- **Content-Security-Policy on `/admin`.** A correct CSP on the admin would have to thread a SvelteKit per-request
  nonce into CodeMirror's runtime style injection and settle the markdown preview's sanitization. That work spans
  the library and each consuming site, because the nonce machinery lives in a site's `kit.csp` config, not in the
  library. The threat it would mitigate on `/admin` is weak, since an allowlisted author attacking their own
  session is low-value and the content is git-auditable. The XSS surface that matters is the public render path,
  which is governed in the delivery layer, not the admin guard. CSP is deferred to a possible future delivery-layer
  pass. This pass instead ships the high-value headers that carry no such cost (Unit 2) and records the render-path
  sanitization invariant that is the actual XSS control (see "Render-safety investigation").
- **Cross-surface backlog items.** The deferred delivery edges (the permalink impossible-date, the excerpt CJK
  counting) and the render `splitHead`/`glyph` notes belong to other verification surfaces. Folding them into an
  auth pass would muddy the auth review gate, so they stay on the backlog.

## The six units

Each unit is a distinct verification surface, provable on its own.

### Unit 1: `__Host-` session cookie

The session cookie (`cairn_session`, named once in `src/lib/auth/crypto.ts`) already carries `Path=/`,
`HttpOnly`, `SameSite=Lax`, and no `Domain`. The only blocker to the `__Host-` prefix is that the prefix requires
`Secure` unconditionally, and the current code makes `Secure` conditional on `https:` so the cookie sticks on
local http dev (`src/lib/sveltekit/auth-routes.ts`).

The resolution derives the cookie name from the protocol. On https, which is every real deploy, the cookie is
`__Host-cairn_session` with `Secure` always set. On local http dev the cookie stays `cairn_session` without the
prefix. The name lives in one shared constant that the set, read, and clear paths all consume, so the change is
local to the constant and the set call. A site upgrading and deploying invalidates existing admin sessions once,
since the cookie name changes, so logged-in editors click a fresh magic link. That is a one-time inconvenience
for a handful of editors and is called out in the release note.

Tests assert the prefixed secure form on an https request and the plain form on an http request, and that the
read and clear paths use the same derived name.

### Unit 2: `/admin` security headers

The auth guard (`src/lib/sveltekit/guard.ts`) is the single chokepoint for every `/admin/**` response, so it is
where blanket response headers belong. The guard wraps the `resolve(event)` result and sets five enforcing
headers on admin paths, including `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` with a matching
`Content-Security-Policy: frame-ancestors 'none'`, an extended `Referrer-Policy`, `Strict-Transport-Security`,
and a conservative `Permissions-Policy`. The `frame-ancestors` directive is the one CSP directive included, since
it is the modern form of the clickjacking control and carries none of the nonce cost that a full CSP would.

The confirm page already sets `Referrer-Policy: no-referrer` to keep the magic-link token out of the referrer
(`auth-routes.ts`). That folds into the blanket policy so the protection is no longer special-cased to one route.

Tests assert the five headers on an admin response and confirm the confirm-page token protection still holds.

### Unit 3: install-token in-isolate memo

The GitHub App installation token is minted fresh on every list and commit today, through the `mintToken`
closures in `src/lib/sveltekit/content-routes.ts` and `src/lib/sveltekit/nav-routes.ts`. The token lives one hour.
This unit adds a `cachedInstallationToken(creds)` wrapper around `installationToken` (`src/lib/github/signing.ts`),
backed by a module-level cache keyed by `installationId`, refreshing roughly 60 seconds before expiry. The two
`mintToken` closures call the wrapper.

This mirrors the default behavior of `@octokit/auth-app`, the reference GitHub App auth library, which caches
installation tokens in memory and reuses them until expiry. A module-global persists across requests within a warm
Worker isolate and is the documented Cloudflare idiom for this kind of cache. A cold isolate re-mints, which is
always safe and costs a single mint. Cross-isolate stores (KV, D1) were considered and rejected, because cairn's
write volume makes cross-isolate sharing worthless and they would add a binding or place a live credential at rest.
No pluggable cache seam is added, since no site will need one at this volume.

The existing `deps.mintToken` injection seam stays, so tests bypass the memo. Tests cover a second call within the
window reusing the cached token, and a call past expiry re-minting.

### Unit 4: magic-link request hardening

Two changes to `requestAction` (`src/lib/sveltekit/auth-routes.ts`), the unauthenticated endpoint that issues a
magic link.

A per-email cooldown guards against inbox-bombing a known editor and burning the email quota. Before issuing,
the endpoint checks whether a `magic_token` row for that email was created within roughly the last 60 seconds. If
one was, it suppresses the issue and the send but still returns `{ sent: true }` identically, so the endpoint's
non-leak property holds. The `magic_token` row already carries `created_at` and there is one active token per
email, so this needs no schema change and no new table. With a 60-second cooldown across a handful of allowlisted
editors, the maximum send rate is a few emails a minute, which is trivial quota, so a per-IP limit and an hourly
cap are unnecessary and stay out.

The second change moves the email send off the response path. The endpoint awaits the token-issue, which is the
security-critical D1 write the email depends on, then backgrounds the `env.EMAIL.send` call through
`platform.context.waitUntil`. This decouples the response from Cloudflare Email Sending latency and is the
idiomatic Workers pattern for a post-response side effect. It needs a small widening of the `RequestContext` type
(`src/lib/sveltekit/types.ts`) to expose `platform.context.waitUntil`, with an inline `await` fallback when
`waitUntil` is absent, which covers local dev and tests. A send failure is logged inside the backgrounded promise,
so observability survives. The response was already `{ sent: true }` regardless of the send outcome, so
backgrounding it changes nothing the caller can observe.

Tests cover the cooldown suppressing a second request inside the window and allowing one after it, the response
staying `{ sent: true }` in both the sent and suppressed cases, and the send running through `waitUntil` when
present and inline when absent.

### Unit 5: rewrite the stale admin smoke doc

`docs/admin-smoke-test.md` still describes the retired better-auth world, including signed cookies, an
`AUTH_SECRET`, and a `user` table. The current code is the self-owned D1 model with an `editor`/`session`/
`magic_token` schema and an opaque session-id cookie. The doc is rewritten for that model. The smoke mints a
session by inserting a `session` row directly and sending `Cookie: __Host-cairn_session=<id>`, with no HMAC and
no secret. The `cairn-admin-smoke-test-process` memory is updated to match. This unit is docs only, and it is what
the live admin smoke at the pass-end gate runs against.

### Unit 6: lazy expired-row cleanup

Nothing prunes expired `session` and `magic_token` rows today. The confirm flow deletes the one consumed token and
logout deletes the one session, so abandoned expired rows accumulate in `AUTH_DB` indefinitely. This unit adds a
lazy opportunistic sweep that needs no Cron Trigger and no wrangler change, consistent with the no-new-binding
stance. Token issue also runs `DELETE FROM magic_token WHERE expires_at < now`, and expired sessions are swept on
session validation or logout. The cleanup functions live in `src/lib/auth/store.ts`, the home for D1 access. This
is hygiene rather than a fix, since cairn's volume keeps the row count small and D1's limits are generous, but it
belongs with this pass because it shares the auth-store surface.

Tests cover an expired token being removed on the next issue and an expired session being removed on validation.

## Acceptance criteria baked in beyond the units

- SvelteKit's built-in CSRF origin check stays on for the auth form actions. The framework defaults it on, so this
  is a verification that no site config disabled it, confirmed at the review gate.
- `PUBLIC_ORIGIN` is asserted to be https when not in local dev, since the magic-link origin comes from it. This is
  a one-line guard at config load.

## Render-safety investigation

This is an investigation, not a code change in this pass. Confirm the showcase reference `render(md)` does not emit
raw author HTML or `javascript:` URIs, and document that render-safety expectation in the adapter contract, since
it is the real XSS control behind the deferred CSP. A genuine gap is escalated to its own pass rather than fixed
inline here, so this pass stays scoped to auth.

## Versioning and review gate

The pass bumps the package to `0.16.0`. The cookie rename is the one externally visible change, and it logs
existing editors out on upgrade, so the release note tells a site's editors to re-click a magic link once.
Everything else is additive or internal, including the type widening, the new headers, the token memo, the
cooldown, and the lazy cleanup.

The pass touches auth, session, cookie, and Worker code, so the pass-end review gate adds the
`web-auth-security-reviewer` and the `cloudflare-workers-reviewer` (both Opus) alongside the simplifier and
`/code-review`. The plan touches the `/admin` surface, so the live admin smoke runs against a real Worker using
the rewritten doc from Unit 5.

## What this pass leaves for later

- A full CSP, if cairn ever renders untrusted input, adds third-party scripts to the public site, or has to meet a
  compliance bar. The stronger version targets the public render path and deserves its own design.
- A scheduled cleanup via a Cron Trigger, if the lazy sweep ever proves insufficient at a higher volume.
