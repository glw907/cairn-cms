# The auth-channel factory: `createAuthChannel`

> **For agentic workers:** execute with `cairn-pass` plus per-task `cairn-implementer` dispatches
> from an Opus 5 session, on a fresh worktree `.claude/worktrees/auth-channel` (branch
> `auth-channel`, off `main`). The main loop reviews each diff and confirms the full gate between
> dispatches. Tasks specify outcomes, constraints, and acceptance criteria; the implementer writes
> the code test-first against them.

**Authority:** the approved design spec **v3**
[`2026-08-03-auth-channel-factory-design.md`](../specs/2026-08-03-auth-channel-factory-design.md).
Read it in full before the first dispatch. v1 and v2 were both reviewed and rejected; v3 supersedes
them entirely and carries a revision log. Every task below cites spec sections rather than
restating them.

**The rule that governs every throttle in this plan**, from the spec's own section on it: anything
that denies service keys on the **requester**; anything that bounds guessing keys on the
**identity** and **escalates** rather than denies. Two review rounds died on violations of it. Any
task that adds a check keyed on the victim's identity and returns a denial has reintroduced the
defect this design exists to avoid.

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
| `src/lib/log/events.ts` | The closed `CairnLogEvent` union gains all ten channel events. |
| `wrangler.test.jsonc` | A second D1 binding for the integration project. |
| `src/tests/integration/auth-channel-*.test.ts`, `src/tests/unit/auth-channel-*.test.ts` | The suites. |
| `docs/reference/auth-channel.md`, `docs/guides/add-a-login-channel.md` | The docs arm. |

---

### Task 1: Schema, store, and the test binding

**Files:** create `src/lib/auth-channel/store.ts`, `src/lib/auth-channel/identity.ts`; modify
`wrangler.test.jsonc`; create `src/tests/integration/auth-channel-store.test.ts`,
`src/tests/unit/auth-channel-identity.test.ts`.

**Interfaces produced (later tasks consume these exact names):** `CHANNEL_SCHEMA_SQL`,
`CHANNEL_SCHEMA_VERSION`, `verifySchema(session)`, `readSalt(session)`; `mintCode(session,
nonceHash, identity, codeHash, subject, now, ttlMs, cooldownMs): Promise<boolean>` (false means the
cooldown held); `readCodeRow(session, nonceHash, now)`; `incrementAndReadCode(session, nonceHash,
now): Promise<{codeHash: string, attempts: number} | null>` (filtered on `expires_at > now`, so an
expired row answers `expired` rather than incrementing toward `locked`); `consumeCode(session,
nonceHash, codeHash, now): Promise<{subject: string | null} | null>`; `pruneIdentityRows(session,
identity, keep)`; `createChannelSession(session, tokenHash, subject, now, ttlMs)`;
`resolveChannelSession(db, tokenHash, now)`; `destroyChannelSession(session, tokenHash)`;
`revokeChannelSessions(session, subject)`; `charge(session, bucket, scope, now, cap):
Promise<{admitted: boolean, count: number}>` (one function for all four budgets, differing only by
bucket and scope); `refund(session, bucket, scope, now)`; `sweep(session, now)`. From
`identity.ts`: `deriveIdentity(salt, subject, contact)`, `generateCode(length)`,
`canonicalizeCode(raw, length)`, `requesterBucket(event)`.

**Outcome:** the spec's Storage section in full, proven against real miniflare D1 on a **second**
binding (never `AUTH_DB`; decision 1 is physical separation and the harness must prove it, not
contradict it).

**Constraints:** the code row's primary key is `nonce_hash` alone, with `identity` an indexed
column; mint is the one conditional upsert, never check-then-write; consume is the one conditioned
`DELETE ... RETURNING subject`, never compare-then-delete; **`charge` and `refund` are each one
atomic conditional upsert with the two-bucket sliding window expressed inside the statement**,
never read-modify-write; sweeps are separate indexed statements covering all three expiring tables
including the budget table, never an `OR`; every index in the spec's DDL ships; `deriveIdentity`
takes the per-deployment salt from `cairn_channel_meta` and prefixes `'s:'` or `'c:'`;
`generateCode` is rejection-sampled and zero-padded to the configured length; `canonicalizeCode`
strips non-digits then requires exactly that length; `requesterBucket` reads
`event.getClientAddress()` (never a client-settable header) and narrows IPv6 to its /64; store
functions take an open session rather than a `db`, so one flow shares one session (`resolveSubject`
is the documented exception and takes `db`).

**Acceptance:** tests prove the cooldown upsert is race-safe (concurrent mints on one nonce write
once); consume returns exactly one row under concurrent identical confirms and rejects a wrong hash
without deleting; decoy rows (`subject` null) never authorize, and neither does an empty-string
subject; **k parallel charges at cap-1 admit exactly one**; the sliding window does not admit 2x at
a window boundary; `refund` restores exactly one; sweeps use their indexes and clear budget rows
older than two windows; `pruneIdentityRows` enforces the live-row cap; `revokeChannelSessions`
clears every session for a subject; `verifySchema` fails closed on an old shape and does not cache
a failure; `deriveIdentity` yields different values for the same string as subject and as contact;
`canonicalizeCode` accepts `1234 5678` and a leading-zero code while rejecting a short one and a
non-numeric one.

### Task 2: Construction, validation, the subpath, and the log union

**Files:** create `src/lib/auth-channel/factory.ts` (construction only; actions stubbed),
`src/lib/auth-channel/dev.ts`, `src/lib/auth-channel/index.ts`; modify `package.json` (exports map),
`src/lib/log/events.ts`; create `src/tests/unit/auth-channel-config.test.ts`.

**Interfaces produced:** `createAuthChannel<Env>(config): AuthChannel<Env>` per the spec's Surface
table, returning `{ actions: { request, confirm, logout }, resolveSubject, revokeSessions }`.
Actions throw `not implemented` until Tasks 3 and 4. `devDelivery` exported. All surface types
exported: `AuthChannel`, `AuthChannelConfig`, `DeliverContext`, `ChannelRequestResult`,
`ChannelConfirmResult`, `RateLimitLike`. All ten event names added to `CairnLogEvent` up front, so
Tasks 3 through 5 typecheck.

**Outcome:** construction is where misconfiguration dies. The `./auth-channel` subpath exists
(types + default, server-only, no browser condition, the `./auth-store` shape).

**Constraints:** clamps reject at construction on both bounds for every row of the spec's Defaults
table; a missing `challenge` rejects, since it is required config; `kind` other than `'code'`
rejects; `cookie.name` goes through `cookieName`, names the `_pending` nonce cookie too, and a
`cairn_`-prefixed base is rejected (it would collide with the engine's admin cookies, which
`cookieName` itself permits); `deliver` takes `(contact, code, ctx)` and `devDelivery`'s refusal
lives **inside its body**, reading `ctx.env.CAIRN_DEV_BACKEND === '1'` as a positive signal the way
`guard.ts` does; no `$app/*` import.

**Acceptance:** unit tests cover every clamp bound, the missing-`challenge` rejection, the
`cairn_`-prefix rejection, the kind rejection, a valid construction returning the full shape, and,
critically, that `deliver: (c, code, ctx) => devDelivery(c, code, ctx)` still refuses at call time
without the dev flag (the wrapper bypass). `check:package` passes with the new subpath.

### Task 3: The request action

**Files:** modify `src/lib/auth-channel/factory.ts`; create
`src/tests/integration/auth-channel-request.test.ts`.

**Interfaces consumed:** Task 1's store and identity functions; `originMatches` from
`src/lib/sveltekit/csrf.ts`; `hashToken`, `generateToken` from `src/lib/auth/crypto.ts`;
`scrubSendError`'s pattern from `src/lib/sveltekit/auth-routes.ts`; the `log` chokepoint.

**Outcome:** the spec's request flow, all eight steps in order: the required `challenge` (the
factory reads the form once and passes the `FormData` in), salted identity derivation with decoy
writes for unknown contacts, **requester suppression**, **identity escalation**, nonce reuse and
minting, and `waitUntil` delivery.

**Constraints, and the first two are the ones two review rounds died on:**

- **Only the requester bucket may deny.** The requester charge returns `{error: 'throttled'}`; the
  identity charge never denies, it demands a fresh challenge and logs `escalated`. The one
  exception is the absolute anti-spam ceiling, logged at warn.
- **The identity charge runs after the requester charge**, so an attacker cannot spend a victim's
  escalation headroom more cheaply than their own.
- Reuse an unexpired `_pending` cookie rather than minting a fresh nonce every call, or the
  cooldown's `ON CONFLICT` branch can never fire and the cooldown silently does not exist; minting
  a new nonce prunes that identity's rows to the live-row cap.
- Every input writes a row; delivery runs only for a known subject; `.catch()` is attached
  **before** the promise reaches `waitUntil`; read `platform.ctx?.waitUntil` first with
  `platform.context?.waitUntil` as the legacy fallback and log `auth.channel.delivery_inline` when
  the inline branch is taken; a delivery failure deletes the pending row **and refunds the send
  charge**.
- A throwing `lookup` logs the distinct `lookup_failed` outcome at warn while answering
  identically, so a roster outage is not indistinguishable from ordinary probing.
- Input-independent faults (binding absent, schema mismatch) answer `{error: 'unavailable'}`;
  everything downstream of `lookup` answers `{sent: true}`.
- The origin check is unconditional, not gated on `isUnsafeFormRequest`'s content-type test; plain
  http outside localhost is refused rather than degrading the cookie.

**Acceptance:** integration tests deep-equal the response bodies across known, unknown,
cooldown-held, escalated, and store-failure inputs; **an attacker's requests against a victim's
contact never prevent the victim from completing a login** (the lockout regression test, and it
must fail if the identity charge is made to deny); no delivery call on the unknown and cooldown
paths; two sequential requests from one cookie jar inside the cooldown deliver once; concurrent
requests deliver once; a throwing `deliver` leaves no row, refunds the charge, and an immediate
re-request delivers again; a `deliver` whose thrown message contains the contact produces a log
record that does not; the nonce cookie carries `Path=/`, `HttpOnly`, `SameSite=Lax`, `Max-Age`
matching the code TTL, and `Secure` whenever its name carries `__Host-`; http is refused.

### Task 4: Confirm, session, logout, resolution, revocation

**Files:** modify `src/lib/auth-channel/factory.ts`; create
`src/tests/integration/auth-channel-confirm.test.ts`,
`src/tests/integration/auth-channel-session.test.ts`.

**Interfaces consumed:** Task 1's store and identity functions; `tokensMatch`; the cookie helpers;
the same origin internals as Task 3.

**Outcome:** the spec's confirm flow in order, plus `logout`, `resolveSubject` with its `verify`
hook, and `revokeSessions`.

**Constraints:**

- **`confirm` reads no `contact` field and calls neither `normalize` nor `lookup`.** The row is
  found by nonce hash alone. A second lookup here is what v2 left unspecified, and it is where the
  roster oracle re-opens: an implementer who short-circuits on a lookup miss restores the exact v1
  defect.
- Canonicalization and the nonce read both run **before** any increment, so neither a malformed
  code nor an absent nonce spends an attempt. An absent nonce answers `no-pending-request`, which
  is a statement about the requester's own browser and reaches no store.
- The identity failure gate is charged on **every** failed compare and checked **before** the
  compare, and it escalates (demand a fresh challenge) rather than denying.
- The returned `attempts` is post-increment, so the cap check is `attempts > cap`, admitting
  exactly `cap` real guesses.
- The session mints only on a returned subject that is non-null **and** non-empty; an empty-string
  subject is a roster data fault, logged at error, never a shared session.
- Both cookies carry the full enumerated set from the spec's cookie table, `Max-Age` included, and
  `Secure` whenever the name carries `__Host-`; `secure` comes from `url.protocol`, which is what
  the engine actually does. The nonce cookie is cleared on success.

**Acceptance:** tests prove exactly `cap` wrong guesses before `locked`; a malformed code, an
absent nonce, and a mismatched nonce each cost no attempt; **confirm's `bad-code`, `locked`, and
`expired` responses are deep-equal between a decoy identity and a real one, with identical store
effects** (the v1 critical was a confirm-side leak and v2's regression test sat on the request
endpoint); **an attacker's confirms never prevent the victim from completing a login**; two
concurrent confirms with one valid code mint exactly one session; replay of a consumed code fails;
expiry returns `expired` rather than incrementing toward `locked`; a decoy row and an
empty-subject row never mint; `resolveSubject` round-trips and nulls after expiry, after logout,
and when `verify` returns false; `revokeSessions` cuts every session for a subject; both cookies'
full attribute sets assert on both schemes; no record carries a contact.

### Task 5: The rate limit

**Files:** modify `src/lib/auth-channel/factory.ts`; create
`src/tests/integration/auth-channel-rate-limit.test.ts`.

**Interfaces consumed:** `RateLimitLike`; the `SectionActionConfig.rateLimit` semantics at
`src/lib/sveltekit/section-action.ts:210-251` as the behavioral reference, transplanted with the
spec's named deltas.

**Outcome:** optional back-pressure on `request` and `confirm`: resolve off the platform env,
degrade to open with `auth.channel.rate_limit_absent` / `auth.channel.rate_limit_failed`, blocked
answers `{error: 'throttled'}` and logs `auth.channel.rate_limited`.

**Constraints:** the default key is the **pair** of requester bucket and identity on both actions,
which bounds one host against one member while leaving a team on one venue's wifi unaffected (each
member is a different key), and never the identity alone, which would be an attacker-triggerable
per-victim denial of the kind the spec's throttle rule forbids; the requester bucket comes from
`requesterBucket(event)`, never a client-settable header; `result?.success !== true` reads as
blocked; a thrown SvelteKit `redirect()`/`error()` from a site callback rethrows rather than
degrading; the check runs after the origin and scheme checks and before any store read; no
`message` field, since the result shape carries a code rather than a sentence.

**Acceptance:** tests cover absent binding, throwing `key()` and `limit()` (open, logged;
redirect/error rethrown), blocked on both actions, and the log trio's shapes. The reference page
(Task 7) must say the tests use a structural stub, so the real binding's period and per-colo
semantics are unproven by this suite.

### Task 6: The security model as a published document

**Added 2026-08-04 at Geoff's direction, after Tasks 1 through 5 were written.** It is its own task
rather than a bullet inside the docs task because it is a distinct deliverable with a distinct
audience: a developer who wants to improve the model, not one who wants to use the surface.

**Files:** create `docs/explanation/auth-channel-security-model.md`; modify
`docs/explanation/README.md` (arm index) and
`docs/internal/2026-08-04-auth-channel-review-rounds.md` (already written during the planning
sitting, since the reviewer reports lived in agent transcripts that do not survive a context clear;
this task adds round 3's outcome and any accepted residuals).

**Outcome:** the spec's "The security model is a published document" section, in full. The
explanation page carries the trust boundary, the threat catalogue (one entry per attack, each
naming the attack, the mechanism, and the test that proves it), the named residual risks, and the
how-to-propose-a-change section. The internal doc records both adversarial rounds: what was
attacked, what was confirmed, what was rejected and why.

**Constraints:** every threat-catalogue entry cites a real test by name from Tasks 1 through 5, so
the page cannot claim a mechanism the suite does not prove; the page leads with the throttle rule
(deny on the requester, escalate on the identity) and says plainly that two earlier designs failed
by violating it, because that is the single most useful thing a future contributor can know; the
residual-risk list is the spec's, carried verbatim with its numbers, including that the bound on
guessing is economic rather than absolute; the page follows the explanation-arm register in
`docs/internal/docs-register.md`; it is written for a developer improving the model, never as
reassurance prose.

**Acceptance:** `check:docs` (link and anchor gate) and `check:arm-indexes` green; the page's every
named test exists in the suite (grep each name); `check:prose` and Vale's Google package green over
the new explanation page; a fresh reader can answer "why does the nonce cookie exist" from the page
alone.

### Task 7: Documentation, surface, and tracking

**Files:** create `docs/reference/auth-channel.md`, `docs/guides/add-a-login-channel.md`; modify
`docs/reference/log-events.md`, `docs/reference/README.md`, `CHANGELOG.md`, `ROADMAP.md`;
regenerate `docs/internal/api-surface.md`.

**Outcome:** the docs arm per the spec's Documentation section.

**Constraints:** a test asserts the guide's DDL block equals `CHANNEL_SCHEMA_SQL`, so the doc
cannot drift; the reference page and the guide both link the security-model page from Task 6; the
guide carries the same-browser confirmation rule with its anti-phishing upside,
the `challenge` hook as Turnstile's home, the client-side resend timer, the roster-removal
exemplar calling `revokeSessions`, the read-replication constraint, and the operator correlation
one-liner; `CHANNEL_SCHEMA_SQL` is documented as migration-only, never a request path; the
changelog entry is additive under `## Unreleased` with no version bump; ROADMAP marks the Now-tier
auth-seam entry shipped, files the editor-default-to-codes question, and files **pass 2** (the
consumer proof) as its own entry.

**Acceptance:** `check:reference`, `check:reference:signatures`, `check:docs`, `check:arm-indexes`,
`check:snippets`, `check:package`, and `check:surface -- --update` (snapshot committed) all green,
run by name.

### Task 8: Pass close

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
