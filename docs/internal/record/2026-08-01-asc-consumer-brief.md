# ASC consumer brief: auth primitives, section actions, and platform helpers (2026-08-01)

Filed from a harvest sweep of the ASC site (`aksailingclub-org`), the first
admin-extension consumer. This brief flows in the harvest protocol's reverse direction:
functionality the site built around engine gaps, selected by one test, whether a second
consumer would rebuild it. The evidence is shipped ASC code, cited by file. Geoff
directed the filing 2026-08-01 and intends an engine pass from it. Seams 1 and 2 have a
named second consumer in the xcathletes platform's own pass queue; ASC retrofits onto
each seam as it lands.

Scope check: the sweep also examined and excluded the bulk-email and segments layer, the
`src/jobs/` runner, and the reminder senders (charter-excluded: no sends, no scheduler),
the iCal builder (events are site domain, and the engine has no events concept), and a
legacy-redirect helper (considered, held site-side by Geoff's call). The access-guide
ES-module cycle is already filed (ASC roles-adoption harvest, finding 2), and the
publish-lifecycle gap behind ASC's Announce screen is in flight as the xcathletes
brief's seam 2.

## Seam 1: exported auth primitives for a site's second audience

A cairn site that authenticates anyone besides editors rebuilds the engine's auth
cryptography by hand. ASC has done it twice: `src/member-auth/lib/crypto.ts` (member
magic-link sessions) and `src/admin-club/lib/offers.ts` (waitlist-offer tokens) each
reimplement the discipline of the engine's `src/lib/auth/crypto.ts`, and each carries
the same comment, "reimplemented small here rather than importing the engine's auth
internals." They say that because no supported surface exists (verified against the
0.92.0 export map). The xcathletes platform's member OTP auth, platform-native by
design, is the family's third reimplementation.

Ask: a server-only export of the crypto primitives: `generateToken`,
`generateSessionId`, `generateCsrfToken`, `hashToken`, and the cookie-name builders.
Unlike the xcathletes brief's seam 1 this is not a pure export-map promotion. The
cookie-name builders and the TTL constants are fixed to the editor store today, so the
promotion parameterizes them (a cookie base name, TTLs as arguments) while the pure
crypto exports as is. The audience semantics stay site-owned: the store schema, the
session model, and the two-stores-never-blur rule are untouched. A site stops copying
the cryptography, nothing else.

Timing: before the xcathletes platform builds its member auth. ASC's retrofit is two
modules swapping local functions for imports.

## Seam 2: a form-action wrapper seam for site-built sections

Every custom admin or portal section needs the same enforcement composed at the form
action, because SvelteKit dispatches a matched action directly and never re-runs an
ancestor layout's `load`. ASC hand-rolled the composition twice:
`src/admin-club/lib/club-action.ts` (access-map check via the already-public
`canReach`, DB binding resolution, per-editor rate limit, audited denial, injected
`db`) and `src/member-portal/lib/portal-action.ts` (the same shape against a member
session). The first of those documents why neither `adminAction` nor `requireAccess`
composes for this case. xcathletes platform Task 5 puts roster management in a custom
admin screen and will write the third copy.

Ask: a composable action-wrapper factory on the extension surface, taking the site's
access map, a binding resolver, and an optional rate limit, and producing the guarded
wrapper `club-action.ts` builds by hand. The engine's own `editors-routes` actions are
the in-engine proof of the shape.

Timing: wanted before xcathletes platform Task 5. Not blocking; the documented fallback
is another hand-rolled copy.

## Seam 3: a `verifyTurnstile` helper

`aksailingclub-org/src/theme/turnstile.ts` opens with "Ported from ecxc.ski's own
contact.remote.ts (the family precedent this pass follows)." Two sites already carry
the same siteverify fetch verbatim; that is measured duplication, not predicted. The
helper is thirteen lines and Cloudflare-native.

Charter question, stated rather than settled here: the engine performs no network
sends, and a siteverify call is a verification fetch, the same class of traffic as the
engine's own GitHub API commits. The call belongs to the engine pass.

Ask: a `verifyTurnstile(token, ip, secret)` export on a server-only subpath, plus the
degrade-to-open convention its callers use (no secret configured means the check
passes) stated in the reference page.

## Seam 4: a rate-limit wrapper with the degrade-to-open convention

`aksailingclub-org/src/theme/rate-limit.ts` wraps the Workers `RateLimit` binding
behind one policy: a binding absent from the running environment (local dev, vitest, a
not-yet-provisioned deploy) never blocks a request, and a present binding fails closed
over its limit. Every site with a public form re-decides that policy, and the wrapper
carries no ASC domain. Pairs naturally with seam 3; the two follow the same
degrade-to-open convention on purpose.

Ask: the wrapper as a server-only export, with the convention documented once in its
reference page instead of re-derived per site.

## Seam 5: a packaged D1 audit sink

The engine defines the seam but ships no implementation: `adminAction` calls a
site-supplied `event.locals.auditSink` (`AdminActionAuditSink`, already a public type
on `./sveltekit`), and a site that wants persistence writes its own. ASC's gap sat open
across three tasks before `src/admin-club/lib/audit-sink.ts` closed it, and the
implementation that closed it is fully generic: one `audit_log` table, a
`waitUntil`-kept fire-and-forget insert, fail-open so a persist failure never fails the
audited action. The engine already ships packaged auth migrations
(`migrations/0000_auth.sql`, `0001_roles.sql`); this is the same move.

Ask: a packaged `audit_log` migration plus a sink factory
(`createD1AuditSink(db, waitUntil?)`) a site wires in one `hooks.server.ts` line.

Timing: with the section-action seam (seam 2) if convenient; a guarded section without
a persisted audit trail is the gap ASC shipped with.

## Sequencing summary

Seams 1 and 2 carry the weight and have the xcathletes platform as a second consumer on
its own clock. Seams 3, 4, and 5 are small, and each retrofit on the ASC side deletes a
site module outright. Nothing here is deadline-bearing the way the first-publish seam
was; the cost of waiting is one more hand-rolled copy per site per seam.
