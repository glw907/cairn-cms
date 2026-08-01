# ASC engine seams: design (2026-08-01)

The design record for the ASC consumer-brief seams
(`docs/internal/2026-08-01-asc-consumer-brief.md`), settled with Geoff at the 2026-08-01
planning sitting. Geoff ratified the two-pass split: seams 1 and 2 (auth crypto primitives,
the section-action factory) are pass one, planned from this spec; seams 3, 4, and 5
(`verifyTurnstile`, the rate-limit wrapper, the packaged D1 audit sink) are pass two. This
spec records the decisions that bind both passes and designs both; pass two's plan stays
just-in-time, written after pass one lands, by that session, from this spec.

The governing constraint, restated from the sitting: every seam must be properly generic.
ASC and ecxc are the evidence, never the shape; nothing club-, member-, or binding-layout-
specific survives into the engine surface, and the engine must not accrete hyper-specific or
idiosyncratic function on the strength of one consumer's convenience.

## Decisions settled at the sitting

**1. Seam 3 is in scope (the charter call).** A Turnstile siteverify call is an effect-free
verification fetch, the same class of traffic as the engine's own GitHub API reads, not a
send. The charter line this draws, stated here so it holds against creep: **Cloudflare-native
platform primitives are in-stack** (the charter commits to SvelteKit + Cloudflare fully, and
Turnstile is the platform's own bot defense, the same class as the `RateLimit` binding seam 4
wraps); **third-party verifiers are not**. ASC's `stripe-webhook-verify.ts`, a Discord
notifier, or any other external service's helper must never ride this precedent into the
engine. Implementation lands in pass two.

**2. Seam 1 exports one primitive, no policy.** The pure crypto exports unchanged, plus
`tokensMatch`, plus a single `cookieName(base, secure)` carrying the `__Host-` discipline. No
paired-name builder (any naming policy the engine picks is one a builder must escape; ASC's
own bases are independent), and no TTL surface at all: no engine function consumes a TTL, the
constants feed each store's own SQL, and ASC's deliberate 15-versus-10-minute divergence
proves a TTL is a site ruling. The engine's TTL constants stay unexported.

**3. Seam 2's factory reads the guard-owned access map.** The factory takes only what the
engine cannot know (the site's DB-binding resolver, an optional rate limit). The access map
is not a parameter: the wrapper reads the same guard-attached `locals.cairnAccess` that
`requireAccess` reads for loads, failing closed when absent. One source of truth, so the map
a POST checks can never drift from the map the loads enforce, and the cast ASC's
`resolveCairnAccess` bridge exists to perform disappears. The 2026-08-01 adversarial review
sharpened "the same map" into "the same decision": the wrapper mirrors `requireAccess`'s
full predicate (`hasAccessRule` and `canReach`), never `canReach` alone, whose permissive
unmapped-target reading is nav semantics and would have admitted a POST the load refuses.

## Pass one, seam 1: the `./auth-crypto` subpath

A new server-only export subpath, sibling to `./auth-store` (whose name stays honest: store
provisioning only). Export map shape matches `./auth-store` (`types` + `default`, no `svelte`
condition). It serves a site authenticating a second audience, member magic-link sessions,
offer tokens, an OTP flow, so the site stops copying the engine's cryptography and nothing
else: the store schema, session model, and the two-stores-never-blur rule stay site-owned.

Exports, all re-exported from the engine's internal `src/lib/auth/crypto.ts`:

- `generateToken()`, `generateSessionId()`, `generateCsrfToken()`: the existing 256-bit
  url-safe generators, unchanged.
- `hashToken(token)`: the lowercase-hex SHA-256, unchanged.
- `tokensMatch(a, b)`: the length-checked constant-time compare. It moves from
  `src/lib/sveltekit/csrf.ts` into the crypto module (it is crypto discipline, and ASC's
  `portal-action.ts` reimplemented it with an apologetic comment); internal callers keep
  working through an updated import or a re-export, implementer's choice. Promotion
  hardening (adversarial review): the compare byte-encodes both sides with `TextEncoder`
  and uses `crypto.subtle.timingSafeEqual` where the runtime provides it (workerd does),
  keeping the XOR loop as the fallback, and its docs state the three properties a consumer
  must know: it leaks length, `tokensMatch('', '')` is deliberately false, and it is meant
  for fixed-length CSPRNG tokens and hex hashes only.
- `cookieName(base, secure)`: new. Returns `__Host-${base}` when secure, `base` otherwise.
  The engine's own `sessionCookieName`/`csrfCookieName` become one-line delegations through
  it, so engine behavior is byte-identical. Validation at the primitive (adversarial
  review): a base that already starts with `__Host-` or `__Secure-`, or that carries a
  character outside the cookie-name token set, throws at call time, turning a
  browser-silently-rejects mystery into a build-time error. Bases beginning `cairn_` are
  the engine's reserved namespace, documented rather than thrown (the engine's own names
  delegate through this function). The engine's fixed cookie names themselves stay
  unexported; no site needs them, and colliding with them is the two-stores blur the
  reserved namespace warns against.

Not exported: the TTL constants, `SEND_COOLDOWN_MS`, the engine cookie-name functions, and
everything in `src/lib/auth/store.ts` beyond what `./auth-store` already carries. The
auth-flow functions stay engine-internal, per that barrel's own header.

Misuse resistance the review demanded, carried by the subpath itself and its reference
page:

- The export entry carries a `browser` condition pointing at a stub that throws at import
  time, so "server-only" is a build failure rather than a sentence in a doc (every export
  here is Web Crypto and would otherwise run fine, and uselessly, in a client bundle).
- `hashToken`'s docs carry a precondition, on the reference page and in the barrel header a
  jump-to-definition lands on: safe only for values from `generateToken`-class CSPRNG
  draws; never for a password, a numeric OTP, an email, or anything an attacker can
  enumerate, which need a password KDF cairn does not ship.
- `cookieName`'s docs state the other half of the `__Host-` contract (the browser accepts
  the prefixed cookie only with `Secure`, `Path=/`, and no `Domain`) and the precondition
  on `secure`: derive it from the externally visible scheme; behind upstream TLS
  termination, `url.protocol` is not that scheme.
- The reference page carries a short "the discipline these primitives assume" section:
  store only the hash; consume atomically in one statement with expiry in the `WHERE`
  clause (the engine's own `consumeToken` statement is the shown pattern); token in a POST
  body, never a URL; `Referrer-Policy: no-referrer` on the landing page, with the admin
  guard's full security-header set named (the guard applies it only under `/admin`, so a
  second audience's routes must set their own); double-submit CSRF on the second audience's
  own routes, which is exactly why `generateCsrfToken` and `tokensMatch` are in the export
  list; and rate limiting per email and per IP.

## Pass one, seam 2: `createSectionAction` on `./sveltekit`

A factory composing onto the existing `adminAction`, which already provides editor identity,
the CSRF double-submit check, the single form read, and the audit contract. The factory adds
the enforcement every site-built admin section otherwise hand-rolls, because SvelteKit
dispatches a matched action directly and never re-runs an ancestor layout's `load`. The
in-engine proof of the shape is `adminAction` itself; the consumer proof is ASC's
`club-action.ts`, with xcathletes Task 5 as the named second consumer.

Surface (new module `src/lib/sveltekit/section-action.ts`):

```ts
createSectionAction<Env, Db>(config: {
  resolveDb: (env: Env | undefined) => Db | undefined;
  rateLimit?: {
    resolve: (env: Env | undefined) => RateLimitLike | undefined;
    key: (ctx: AdminActionContext) => string;
    message?: string;
  };
}): SectionActionWrapper
```

`Env` does not infer from the resolver parameter alone (the review reproduced the collapse
to `{}` under `check:snippets`' own compiler options), so every documented snippet annotates
the parameter (`resolveDb: (env: App.Platform['env'] | undefined) => env?.SECTION_DB`) or
passes explicit type arguments, and the reference page states the requirement; with
`resolveDb` annotated, `rateLimit.resolve` is contextually typed and needs nothing.

- `RateLimitLike` is a structural type, `{ limit(options: { key: string }): Promise<{ success:
  boolean }> }`, so the surface takes no dependency on `@cloudflare/workers-types` and any
  conforming limiter serves.
- The rate limit follows degrade-to-open: a binding `resolve` cannot find never blocks
  (local dev, vitest, a not-yet-provisioned deploy), and a limiter that throws also degrades
  to open (logged; a transient binding error must not become a 500 the hand-rolled code
  never produced). A present, working binding fails closed over its limit with a 429 and an
  overridable message. The open degrade is observable, never silent: the unresolved-binding
  branch logs a `warn` event each time, so a production deploy missing its `[[ratelimits]]`
  block is one Workers Logs query away from discovery.
- The returned wrapper takes `(handler, opts)` per call site, with
  `opts: { action: string; entity: string; target?: string; ownerOnly?: boolean;
  deniedMessage?: string }`. `action`/`entity` are the call site's audit verbs, reused for
  denials so a refused attempt reads in the audit log like the write it was refused from.
  `target` is the authorization target, defaulting to `event.url.pathname`; a route serving
  more than one section, or any route with a rest parameter, must declare it explicitly,
  because SvelteKit dispatches actions by `?/name` while the map matches paths, and on a
  catch-all route the pathname is attacker-chosen. `ownerOnly` requires owner capability on
  top of the map check, never instead of it.
- The handler receives `{ event, form, ctx }` with `ctx: AdminActionContext &
  { db: NonNullable<Db> }`, so no handler re-resolves the binding and explicit type
  arguments cannot re-nullify what the check order proved present.
- Typing (from the review's compile checks): `AdminActionEvent` becomes generic,
  `AdminActionEvent<Env = AuthEnv> extends EventBase<Env>`, so the factory's returned
  function is assignable to a route's generated `Actions` for a site whose `App.Platform`
  uses its own generated types (the default preserves every existing consumer's meaning),
  and `AdminActionEvent['locals']` gains the `cairnAccess?: AccessMap` the guard already
  attaches, so the wrapper reads it typed and no separate event interface exists.

Check order; refusals return SvelteKit `fail(...)` (type-verified to satisfy generated
`Actions` and render as form failures), with the read side guarded separately: the docs
state that a section's layout `load` must call `requireAccess`, so reads and writes gate on
the same fail-closed predicate and a denied POST's page render exposes nothing the load
would refuse:

1. `adminAction` resolves the editor, verifies CSRF, reads the form once (its own
   contract). Its own guards throw `AdminActionError`, which needs a site `handleError`
   mapping; the reference says so.
2. Rate limit, when configured: over-limit returns `fail(429)` and logs a `warn` event.
   This branch does not call `ctx.audit`: a limiter denial is back-pressure, not a domain
   state change, and auditing it would hand a flood one D1 insert per rejected request once
   the pass-two sink lands.
3. `resolveDb` returns undefined: audited, `fail(500)`. A missing binding is a deployment
   misconfiguration, not a denial.
4. The guard-attached `locals.cairnAccess` is absent: audited, `fail(500)`, meaning the
   guard never ran on this route. The guard itself changes one line to make that meaning
   true: it attaches `access ?? {}` (verified behavior-identical: `canReach` and
   `hasAccessRule` agree on `undefined` and `{}` in every branch), so a zero-config site
   presents an empty map here rather than a phantom 500.
5. `hasAccessRule(map, target)` false: audited, `fail(403)`. The unmapped-target refusal
   mirrors `requireAccess` exactly, owner included; a section path must carry a map rule,
   stated as a prerequisite in the guide and the reference, and the log names the remedy
   (`defineAccess` plus the guard's `access` option).
6. `canReach(map, ctx.editor, target)` refuses, or `ownerOnly` is set and the editor lacks
   owner capability: audited, `fail(403)`.
7. The handler runs once with `ctx: { ...ctx, db }`.

The two 403 branches share one user-facing default message and the two 500 branches
another: an authenticated editor learns no deployment or gating detail from the copy
(`deniedMessage` still overrides). The branch identity lives server-side: each refusal
audits its own `detail` string, the 403s additionally emit the guard's own
`auth.access.denied` `warn` event so a site alerting on load denials covers POST denials
with the same query, and the 500s emit a new `admin.action.misconfigured` `error` event.
The log-events reference gains the new rows in the same pass. Additional reference-page
clauses from the review: the rate-limit `key` must carry an actor-scoped, normalized
component, and one binding is one shared budget across every action using it; the limiter
runs after the body parse, so it never bounds request-parse cost; only `createAuthGuard`
may write `locals.editor` and `locals.cairnAccess`, and it must be the last handle to set
them; denial audits carry no `entityId`, so a handler's own audit should; and a POST
through SvelteKit remote functions never reaches form actions, so this factory does not
guard it.

## Pass two, seams 3 and 4: the `./cloudflare` subpath

A new server-only subpath for Cloudflare-native platform primitives. These are not SvelteKit
integration, and giving the charter line a physical home makes it enforceable: anything
proposed for `./cloudflare` must be a Cloudflare platform primitive, and `check:surface`
snapshots what is there. Contents:

- `verifyTurnstile(token, secret, opts?: { ip?: string; hostname?: string; action?: string })`:
  the siteverify fetch, hardened past the evidenced thirteen lines per the 2026-08-01
  adversarial review. Fail-closed throughout: a non-200 response, an unparseable body, or a
  thrown fetch returns `false`, stated in the contract so no future refactor flips it open.
  When `hostname` or `action` is supplied it must match the siteverify response (without
  them, a token solved on any widget sharing the sitekey replays across forms). The
  reference page states: `ip` must come from `CF-Connecting-IP`, never a forwardable header;
  a token is single-use with a roughly 300-second window; never log the response body or the
  secret. Degrade-to-open stays at the caller (`if (secret && ...)`), stated as the
  convention rather than baked in; verification and policy stay separate. ASC's site key and
  its `window.turnstile` ambient declaration stay site-side.
- `checkRateLimit(binding, key)` and `checkRateLimitKeys(binding, keys)`: both evidenced
  functions from ASC's `src/theme/rate-limit.ts`, typed against the same structural
  `RateLimitLike` seam 2 defines in pass one; one shared type, not two. ASC's
  `RATE_LIMIT_MESSAGE` does not come along: refusal copy is site voice, and the factory's
  internal default covers seam 2. The reference page carries two sentences the review
  demanded: the Workers limiter is per-location and eventually consistent, so it is
  best-effort, never an authoritative security control (the engine's own D1-backed send
  cooldown is the pattern for anything that must hold); and `checkRateLimitKeys`
  short-circuits at the first failing key, so later keys' counters are not incremented.

## Pass two, seam 5: the packaged D1 audit sink

The engine defines the seam (`adminAction` calls a site-supplied `locals.auditSink`;
`AdminActionAuditSink` is already public on `./sveltekit`) but ships no implementation, and
ASC's closing implementation is fully generic. This packages it, the same move as the shipped
auth migrations:

- A packaged `migrations/000N_audit.sql` at the next free number when pass two plans (0002
  today, but the queued `COLLATE NOCASE` auth migration may claim it first): one `audit_log`
  table, ASC's schema carried whole (`actor`,
  `action`, `entity`, `entity_id`, `detail`, `created_at` defaulting to `datetime('now')`).
  Opt-in: only a site wiring the sink applies it, and the reference page says so.
- `createD1AuditSink(db, waitUntil)` on `./sveltekit`, where `AdminActionAuditSink` already
  lives: a fire-and-forget insert, kept alive past the response by `waitUntil`, fail-open so
  a persist failure never fails the audited action. `waitUntil` is a required parameter
  accepting `undefined` explicitly (adversarial review): an optional parameter would make
  the common call the one that silently drops records when the isolate tears down first, so
  omitting it must be a decision on the record, and the docs state the drop risk. Fail-open
  hardening, so a persist failure cannot become log evasion: every bound field truncates to
  a documented maximum before binding (an oversized handler-composed `detail` must not be
  able to suppress its own audit row), the insert is parameterized via `prepare`/`bind`
  (stated so nobody simplifies to a template string), and the failure path logs the whole
  truncated record plus the error as a new `admin.audit.sink_failed` event (the log-events
  reference updates in the same pass), so the audit survives in Workers Logs when D1
  rejects it. The D1 handle is typed the way the auth store already types it. The reference
  notes that a site wiring the sink should configure the section-action rate limit, since
  authorization denials insert rows.

Nothing is exported for member-side audit: the `actor` column accommodates any string a
site's own wrappers write, which is as far as genericity goes without modeling site actors.

## Testing

Test-first throughout. Seam 1: an equivalence suite proving the `cookieName` refactor changed
the engine's emitted names byte-for-byte (both secure states, both cookies), plus export-shape
coverage for the new barrel. Seam 2: a unit suite beside the existing `admin-action` tests
driving fake events through every branch above, the degrade-to-open and fail-closed rate-limit
states, the audit records each denial emits, `ownerOnly` stacking on the map check, and the
happy path's `ctx.db` injection. The full gate applies, with the four CI-only gates run by
name locally (`check:comments`, `check:reference:signatures`, `check:surface`,
`check:snippets`); `check:surface` snapshots the two surface additions deliberately. Pass
two's suites (the siteverify fetch mocked both ways, both rate-limit conventions, every sink
branch including the fail-open persist failure) are specified by its just-in-time plan
against this spec, under the same gate.

## Documentation

A new reference page for `./auth-crypto`; the `./sveltekit` reference page gains
`createSectionAction` and its types; the custom-admin-screen guide (wherever the current docs
teach a site-built section) gains the factory as the default path, demoting the hand-rolled
composition it replaces. Changelog under `## Unreleased`, `Consumers must: nothing`
(additive). The pass holds unpublished and batches with the current window per the release
policy; the window's `release-size` becomes `minor` (a new public subpath).

Pass two owes the `./cloudflare` reference page, the sink and migration additions to the
`./sveltekit` page, and the `admin.audit.sink_failed` row in the log-events table.

## Out of scope for pass one

- Seams 3, 4, and 5: designed above, implemented in pass two.
- The member/portal side of ASC's duplication: a member session is not a cairn editor, so
  `portalAction` and its kin stay site-owned. What this pass gives that side is the crypto
  primitives and `tokensMatch` it currently copies.
- Consumer retrofits: ASC's two-module swap and xcathletes' member auth run on their own
  clocks in their own repos.
- Any TTL, cookie-naming-policy, or session-model surface, per decision 2.

## Adversarial review record (2026-08-01)

Two read-only reviewers (`web-auth-security-reviewer`, `svelte-reviewer`, both Opus) ran
against this spec, the pass-one plan, and the ASC evidence before implementation; both
returned do-not-implement-as-written verdicts, and their accepted findings are folded into
the sections above. The load-bearing amendments: the authorization predicate is
`requireAccess`'s own (`hasAccessRule` and `canReach`), never `canReach` alone, whose
permissive unmapped reading would have admitted POSTs the loads refuse; the authorization
target is declarable (`opts.target`) because a catch-all route's pathname is
attacker-chosen; `AdminActionEvent` goes generic over the platform env (the compile-checked
fix for route `Actions` assignability) and its `locals` admit the guard's `cairnAccess`;
the guard attaches `access ?? {}`; degrade-to-open gets a logged signal; the crypto
promotion gains misuse guards (base validation, a browser-condition import trap, the
`hashToken` precondition, the discipline section). One security finding was deliberately
not adopted: throwing for the 403/500 branches. `fail(...)` is kept (type-verified,
ASC-proven form UX), and the exposure it worried about closes by requiring `requireAccess`
in a section's `load`, so reads and writes share one fail-closed predicate. The
`applySecurityHeaders` promotion the review suggested is filed to ROADMAP rather than
adopted here; the auth-crypto reference names the header set instead.
