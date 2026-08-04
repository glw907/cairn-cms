# The auth-channel factory: `createAuthChannel`

> **For agentic workers:** execute with `cairn-pass` plus per-task `cairn-implementer` dispatches
> from an Opus 5 session, on a fresh worktree `.claude/worktrees/auth-channel` (branch
> `auth-channel`, off `main`). The main loop reviews each diff and confirms the full gate between
> dispatches. Tasks specify outcomes, constraints, and acceptance criteria; the implementer writes
> the code test-first against them.

**Authority:** the approved design spec **v2**
[`2026-08-03-auth-channel-factory-design.md`](../specs/2026-08-03-auth-channel-factory-design.md).
Read it in full before the first dispatch. v1 of that spec was reviewed and rejected; v2 supersedes
it entirely and carries a revision log. Every task below cites spec sections rather than restating
them.

**Goal:** a site adds its own second-audience login channel (6-digit OTP over any site-owned
transport) by supplying delivery, roster lookup, and identifier shape. The factory owns every
security discipline. Acceptance test for the pass: a site cannot write a working insecure channel
without deliberately bypassing the factory.

**Scope boundary (sizing call, 2026-08-04).** This pass ships the factory and proves it against the
integration harness. The consumer proof ships as **pass 2**: the showcase member fixture, its
`MEMBER_DB` binding and migration-apply step, the `.cairn-template.json` scaffolder exclusion, the
dev-gate integration, the e2e workflow markers, and the e2e itself. Consequence to carry: until
pass 2 lands, nothing proves the built package through a consumer's bundler, so **this pass is not
releasable on its own**. The window holds unpublished regardless.

**Sequencing pressure:** the seam's window closes the session xcathletes runs its Task 4. Confirm
that has not happened before starting (state lives in the ecxc-ski repo).

## Global constraints (every task)

- The CI gate list, pasted from `.github/workflows/test.yml` (copy this block into dispatches; do
  not retype): `npm run check`, `npm test`, `check:package`, `check:reference`,
  `check:reference:signatures`, `check:surface`, `check:custom-surface`, `check:chassis-boundary`,
  `check:cm-internals`, `check:invisible-craft`, `check:admin-css-classes`, `check:readiness`,
  `check:docs`, `check:arm-indexes`, `check:snippets`, `check:prose`, `check:version`,
  `check:dev-package`, `check:consumers`, showcase `check`, `check:comments`. Per-task dispatches
  run the targeted tests plus `npm run check` and `npm test`; the CI-only four (`check:comments`,
  `check:reference:signatures`, `check:surface`, `check:snippets`) run at pass end and in any task
  touching what they gate.
- No PII in engine log records: channel events carry an identity-hash prefix, never a contact, and
  never a raw provider error string (spec, Logging).
- No `$app/*` import anywhere in `src/lib`. The dev-transport refusal is a runtime check on
  `platform.env`, following `guard.ts`.
- Every D1 flow runs inside `db.withSession('first-primary')` (spec, Storage).
- All times epoch milliseconds; hashing via `hashToken`; compares via `tokensMatch`; cookie names
  via `cookieName`. No new crypto.
- Comments follow TSDoc per the ts-conventions skill; the em dash is banned in comments.
- Worktree discipline: edits target the worktree path; `npm ci` on stale modules.

## File map

| Path | Responsibility |
|---|---|
| `src/lib/auth-channel/store.ts` | Every D1 statement, the DDL constant, and the schema-version check. Nothing else touches SQL. |
| `src/lib/auth-channel/identity.ts` | Identity derivation, code generation and canonicalization, nonce handling. |
| `src/lib/auth-channel/factory.ts` | `createAuthChannel`: config validation, the three actions, `resolveSubject`, `revokeSessions`. |
| `src/lib/auth-channel/dev.ts` | `devDelivery` and its runtime refusal. |
| `src/lib/auth-channel/index.ts` | The public barrel with its boundary comment. |
| `src/lib/log/events.ts` | The closed `CairnLogEvent` union gains all nine channel events. |
| `wrangler.test.jsonc` | A second D1 binding for the integration project. |
| `src/tests/integration/auth-channel-*.test.ts`, `src/tests/unit/auth-channel-*.test.ts` | The suites. |
| `docs/reference/auth-channel.md`, `docs/guides/add-a-login-channel.md` | The docs arm. |

---

### Task 1: Schema, store, and the test binding

**Files:** create `src/lib/auth-channel/store.ts`, `src/lib/auth-channel/identity.ts`; modify
`wrangler.test.jsonc`; create `src/tests/integration/auth-channel-store.test.ts`,
`src/tests/unit/auth-channel-identity.test.ts`.

**Interfaces produced (later tasks consume these exact names):** `CHANNEL_SCHEMA_SQL`,
`CHANNEL_SCHEMA_VERSION`, `verifySchema(db)`; `mintCode(db, identity, nonceHash, codeHash, subject,
now, ttlMs, cooldownMs): Promise<boolean>` (the conditional upsert; false means the cooldown held);
`incrementAndReadCode(db, identity, nonceHash, now): Promise<{codeHash: string, attempts: number} |
null>`; `consumeCode(db, identity, nonceHash, codeHash, now): Promise<{subject: string | null} |
null>`; `createChannelSession(db, tokenHash, subject, now, ttlMs)`; `resolveChannelSession(db,
tokenHash, now): Promise<string | null>`; `destroyChannelSession(db, tokenHash)`;
`revokeChannelSessions(db, subject)`; `chargeSend(db, identity, now, capPerHour):
Promise<boolean>`; `chargeFailure(db, identity, now, capPerHour): Promise<boolean>`. From
`identity.ts`: `deriveIdentity(subject, contact)`, `generateCode()`, `canonicalizeCode(raw)`.

**Outcome:** the spec's Storage section in full, proven against real miniflare D1 on a **second**
binding (never `AUTH_DB`; decision 1 is physical separation and the harness must prove it, not
contradict it).

**Constraints:** the composite primary key is `(identity, nonce_hash)`; mint is the one conditional
upsert from the spec, never check-then-write; consume is the one conditioned `DELETE ... RETURNING
subject`, never compare-then-delete; sweeps are separate indexed statements, never an `OR`; both
`expires_at` indexes ship; every function wraps in `withSession('first-primary')`; `generateCode`
is rejection-sampled and zero-padded to 6 characters; `canonicalizeCode` strips non-digits then
requires exactly 6.

**Acceptance:** tests prove the cooldown upsert is race-safe (concurrent mints for one
`(identity, nonce)` deliver one write), two rows under one identity with different nonces are
independent, consume returns exactly one row under concurrent identical confirms, consume rejects
a wrong hash without deleting, decoy rows (`subject` null) never authorize, budgets roll their
window and cap, sweeps use their indexes (assert on the query plan or on absence of a full scan),
`revokeChannelSessions` clears every session for a subject, `verifySchema` fails closed on an old
shape, and `canonicalizeCode` accepts `123 456` and `042931` while rejecting `12345` and `abc123`.

### Task 2: Construction, validation, the subpath, and the log union

**Files:** create `src/lib/auth-channel/factory.ts` (construction only; actions stubbed),
`src/lib/auth-channel/dev.ts`, `src/lib/auth-channel/index.ts`; modify `package.json` (exports map),
`src/lib/log/events.ts`; create `src/tests/unit/auth-channel-config.test.ts`.

**Interfaces produced:** `createAuthChannel<Env>(config): AuthChannel<Env>` per the spec's Surface
table, returning `{ actions: { request, confirm, logout }, resolveSubject, revokeSessions }`.
Actions throw `not implemented` until Tasks 3 and 4. `devDelivery` exported. All surface types
exported: `AuthChannel`, `AuthChannelConfig`, `ChannelRequestResult`, `ChannelConfirmResult`,
`RateLimitLike`. All nine event names added to `CairnLogEvent` up front, so Tasks 3 through 5
typecheck.

**Outcome:** construction is where misconfiguration dies. The `./auth-channel` subpath exists
(types + default, server-only, no browser condition, the `./auth-store` shape).

**Constraints:** clamps reject at construction on both bounds for every row of the spec's Defaults
table; `kind` other than `'code'` rejects; `cookie.name` goes through `cookieName` and also names
the `_pending` nonce cookie; `devDelivery`'s refusal lives **inside its body** reading
`platform.env` the way `guard.ts` does, with the construction-time identity check as a friendly
early failure only; no `$app/*` import.

**Acceptance:** unit tests cover every clamp bound, the kind rejection, a valid construction
returning the full shape, and, critically, that `deliver: (c, code) => devDelivery(c, code)` still
refuses at call time in a non-dev runtime (the wrapper bypass). `check:package` passes with the new
subpath.

### Task 3: The request action

**Files:** modify `src/lib/auth-channel/factory.ts`; create
`src/tests/integration/auth-channel-request.test.ts`.

**Interfaces consumed:** Task 1's store and identity functions; `originMatches`,
`isUnsafeFormRequest` from `src/lib/sveltekit/csrf.ts`; `hashToken`, `generateToken` from
`src/lib/auth/crypto.ts`; `scrubSendError`'s pattern from `src/lib/sveltekit/auth-routes.ts`; the
`log` chokepoint.

**Outcome:** the spec's request flow, all seven steps in order, including the `challenge` hook
(the factory reads the form once and passes the `FormData` in), identity derivation with decoy
writes for unknown contacts, the issuance budget, nonce minting and its cookie, and `waitUntil`
delivery.

**Constraints:** every input writes a row; delivery runs only for a known subject; `.catch()` is
attached **before** the promise reaches `waitUntil`; read `platform.ctx?.waitUntil` first with
`platform.context?.waitUntil` as the legacy fallback, and log a warn-level event when the inline
fallback is taken in a non-dev build; a delivery failure deletes the pending row; a throwing
`lookup`, a throwing `normalize`, a `normalize` output over 254 characters, and any store failure
all take the uniform path; plain http outside localhost is refused, never degraded to a
non-`Secure` cookie; `auth.channel.requested` is emitted identically for all four outcomes with the
outcome in a field.

**Acceptance:** integration tests deep-equal the response bodies across known, unknown,
cooldown-suppressed, budget-suppressed, and store-failure inputs; no delivery call on the unknown,
cooldown, and budget paths; concurrent requests for one identity and nonce deliver once; a throwing
`deliver` leaves no row and an immediate re-request mints and delivers again; a `deliver` whose
thrown message contains the contact produces a log record that does not; the nonce cookie carries
`HttpOnly`, `Path=/`, `SameSite=Lax`, and `Max-Age` matching the code TTL; http is refused.

### Task 4: Confirm, session, logout, resolution, revocation

**Files:** modify `src/lib/auth-channel/factory.ts`; create
`src/tests/integration/auth-channel-confirm.test.ts`,
`src/tests/integration/auth-channel-session.test.ts`.

**Interfaces consumed:** Task 1's store and identity functions; `tokensMatch`; the cookie helpers;
the same origin internals as Task 3.

**Outcome:** the spec's confirm flow in order, plus `logout`, `resolveSubject` with its `verify`
hook, and `revokeSessions`.

**Constraints:** canonicalization and the nonce check both run **before** any increment, so neither
a malformed code nor a missing nonce spends an attempt; the returned `attempts` is post-increment
and the cap check is `attempts > cap`, admitting exactly `cap` real guesses; the session mints only
on a returned non-null subject; the session cookie carries the full attribute set **including
`Max-Age`** derived from the session TTL, with `__Host-` and `Secure` on https; the nonce cookie is
cleared on success; `secure` comes from `url.protocol`, which is what the engine does.

**Acceptance:** tests prove exactly `cap` wrong guesses before `locked`; a malformed code and a
missing or mismatched nonce cost no attempt; two concurrent confirms with one valid code mint
exactly one session; replay of a consumed code fails; expiry returns `expired`; a decoy row can
never mint; `resolveSubject` round-trips, nulls after expiry, after logout, and when `verify`
returns false; `revokeSessions` cuts every session for a subject; `Max-Age` is present and matches
the TTL; cookie attributes differ correctly across schemes; no record carries a contact.

### Task 5: The rate limit

**Files:** modify `src/lib/auth-channel/factory.ts`; create
`src/tests/integration/auth-channel-rate-limit.test.ts`.

**Interfaces consumed:** `RateLimitLike`; the `SectionActionConfig.rateLimit` semantics at
`src/lib/sveltekit/section-action.ts:210-251` as the behavioral reference, transplanted with the
spec's named deltas.

**Outcome:** optional back-pressure on `request` and `confirm`: resolve off the platform env,
degrade to open with `auth.channel.rate_limit_absent` / `auth.channel.rate_limit_failed`, blocked
answers `{error: 'throttled'}` and logs `auth.channel.rate_limited`.

**Constraints:** default key is the client IP for `request` and the identity for `confirm` (an
IP-keyed limit on `confirm` would lock out a team sharing one venue's wifi); `result?.success !==
true` reads as blocked; a thrown SvelteKit `redirect()`/`error()` from a site callback rethrows
rather than degrading; the check runs after the origin and scheme checks and before any store read;
no `message` field.

**Acceptance:** tests cover absent binding, throwing `key()` and `limit()` (open, logged;
redirect/error rethrown), blocked on both actions, and the log trio's shapes. The reference page
(Task 6) must say the tests use a structural stub, so the real binding's period and per-colo
semantics are unproven by this suite.

### Task 6: Documentation, surface, and tracking

**Files:** create `docs/reference/auth-channel.md`, `docs/guides/add-a-login-channel.md`; modify
`docs/reference/log-events.md`, `docs/reference/README.md`, `CHANGELOG.md`, `ROADMAP.md`;
regenerate `docs/internal/api-surface.md`.

**Outcome:** the docs arm per the spec's Documentation section.

**Constraints:** a test asserts the guide's DDL block equals `CHANNEL_SCHEMA_SQL`, so the doc
cannot drift; the guide carries the same-browser confirmation rule with its anti-phishing upside,
the `challenge` hook as Turnstile's home, the client-side resend timer, the roster-removal
exemplar calling `revokeSessions`, the read-replication constraint, and the operator correlation
one-liner; `CHANNEL_SCHEMA_SQL` is documented as migration-only, never a request path; the
changelog entry is additive under `## Unreleased` with no version bump; ROADMAP marks the Now-tier
auth-seam entry shipped, files the editor-default-to-codes question, and files **pass 2** (the
consumer proof) as its own entry.

**Acceptance:** `check:reference`, `check:reference:signatures`, `check:docs`, `check:arm-indexes`,
`check:snippets`, `check:package`, and `check:surface -- --update` (snapshot committed) all green,
run by name.

### Task 7: Pass close

The `cairn-pass` ending ritual, whole: code-simplifier over the pass's changes; the full gate
including the four CI-only checks by name; reviewer fan-out with `web-auth-security-reviewer`
mandatory plus `svelte-reviewer` and `cloudflare-workers-reviewer`, findings folded before merge;
no version bump; post-mortem appended to this plan; STATUS updated on `main` naming pass 2 and the
AI-posture pass; worktree merged per the user's call; context-clear prep with the exact resume
prompt.

**Do not claim releasable.** Pass 2 owns the consumer-bundler proof.

## Pass 2 (queued, not planned here)

The consumer proof: the showcase `/members` fixture and its site-authored capture transport, a
`MEMBER_DB` binding in `examples/showcase/wrangler.jsonc`, a migration-apply step plus
`.wrangler/state` reset in the Playwright `webServer` command (so the lockout and cooldown specs
are not order-dependent), dev-gate integration for the readback route following
`examples/showcase/src/chassis/dev-gate.ts`, the `.cairn-template.json` exclusion **plus a test
asserting the emitted template contains no readback route**, the `.github/workflows/e2e.yml` fold
grep markers, and the e2e itself. Plan it after this pass lands.

The scaffolder exclusion is the load-bearing item: `scripts/emit-template.mjs` copies the showcase
verbatim minus four excluded paths, so a `/members` fixture with a code-readback route would ship
into every scaffolded site as an unauthenticated OTP oracle. A comment in the file is not a
mitigation, because the emitter does not read comments.
