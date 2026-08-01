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
`resolveCairnAccess` bridge exists to perform disappears.

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
  working through an updated import or a re-export, implementer's choice.
- `cookieName(base, secure)`: new. Returns `__Host-${base}` when secure, `base` otherwise.
  The engine's own `sessionCookieName`/`csrfCookieName` become one-line delegations through
  it, so engine behavior is byte-identical. The engine's fixed cookie names themselves stay
  unexported; no site needs them.

Not exported: the TTL constants, `SEND_COOLDOWN_MS`, the engine cookie-name functions, and
everything in `src/lib/auth/store.ts` beyond what `./auth-store` already carries. The
auth-flow functions stay engine-internal, per that barrel's own header.

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

- `RateLimitLike` is a structural type, `{ limit(options: { key: string }): Promise<{ success:
  boolean }> }`, so the surface takes no dependency on `@cloudflare/workers-types` and any
  conforming limiter serves.
- The rate limit follows degrade-to-open: a binding `resolve` cannot find never blocks (local
  dev, vitest, a not-yet-provisioned deploy); a present binding fails closed over its limit
  with a 429 and an overridable message.
- The returned wrapper takes `(handler, opts)` per call site, with
  `opts: { action: string; entity: string; ownerOnly?: boolean; deniedMessage?: string }`.
  `action`/`entity` are the call site's audit verbs, reused for denials so a refused attempt
  reads in the audit log like the write it was refused from. `ownerOnly` requires owner
  capability on top of the map check, never instead of it.
- The handler receives `{ event, form, ctx }` with `ctx: AdminActionContext & { db: Db }`, so
  no handler re-resolves the binding.

Check order, each branch audited through `ctx.audit` and returned as SvelteKit `fail(...)`
(never a throw, so a form renders the refusal):

1. `adminAction` resolves the editor, verifies CSRF, reads the form once (its own contract).
2. Rate limit, when configured: over-limit fails 429.
3. `resolveDb` returns undefined: fail 500. A missing binding is a deployment
   misconfiguration, not a denial.
4. The guard-attached `locals.cairnAccess` is absent: fail 500, same stance. An unwired map
   on a POST path must never fall through to `canReach`'s permissive absent-map reading.
5. `canReach(map, editor, event.url.pathname)` refuses, or `ownerOnly` is set and the editor
   lacks owner capability: fail 403 with `deniedMessage` (generic defaults per branch).
6. The handler runs.

## Pass two, seams 3 and 4: the `./cloudflare` subpath

A new server-only subpath for Cloudflare-native platform primitives. These are not SvelteKit
integration, and giving the charter line a physical home makes it enforceable: anything
proposed for `./cloudflare` must be a Cloudflare platform primitive, and `check:surface`
snapshots what is there. Contents:

- `verifyTurnstile(token, ip, secret)`: the siteverify fetch as evidenced in ASC's
  `src/theme/turnstile.ts` (itself ported from ecxc.ski). Degrade-to-open stays at the caller
  (`if (secret && ...)`), stated in the reference page as the convention rather than baked
  into the helper; verification and policy stay separate. ASC's site key and its
  `window.turnstile` ambient declaration stay site-side.
- `checkRateLimit(binding, key)` and `checkRateLimitKeys(binding, keys)`: both evidenced
  functions from ASC's `src/theme/rate-limit.ts`, typed against the same structural
  `RateLimitLike` seam 2 defines in pass one; one shared type, not two. ASC's
  `RATE_LIMIT_MESSAGE` does not come along: refusal copy is site voice, and the factory's
  internal default covers seam 2.

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
- `createD1AuditSink(db, waitUntil?)` on `./sveltekit`, where `AdminActionAuditSink` already
  lives: a fire-and-forget insert, kept alive past the response by `waitUntil` when provided,
  fail-open so a persist failure never fails the audited action. Two engine-grade upgrades
  over ASC's copy: the failure path logs through the structured logger as a new
  `admin.audit.sink_failed` event (the log-events reference table updates in the same pass)
  instead of a bare `console.error`, and the D1 handle is typed the way the auth store
  already types it.

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
