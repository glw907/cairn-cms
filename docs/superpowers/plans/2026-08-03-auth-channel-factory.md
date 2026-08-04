# The auth-channel factory: `createAuthChannel`

> **For agentic workers:** execute with `cairn-pass` plus per-task `cairn-implementer` dispatches
> from an Opus 5 session, on a fresh worktree `.claude/worktrees/auth-channel` (branch
> `auth-channel`, off `main`). The main loop reviews each diff and confirms the full gate between
> dispatches. Tasks specify outcomes, constraints, and acceptance criteria; the implementer writes
> the code test-first against them.

**Authority:** the approved design spec **v3.1**
[`2026-08-03-auth-channel-factory-design.md`](../specs/2026-08-03-auth-channel-factory-design.md).
Read it in full before the first dispatch. v1, v2, and v3 were all reviewed and amended; v3.1
supersedes them entirely and carries a revision log naming what each one got wrong. Every task below cites spec sections rather than
restating them.

**The rule that governs every throttle in this plan**, from the spec's own section on it:

> **No control keyed on the victim's identity may deny, delay, or destroy anything. Denial keys on
> the requester. Identity-keyed controls either escalate through a channel the site can act on, or
> they only log.**

Three review rounds died on violations of it, the third inside the mechanism written to prevent the
second. Any task that adds an identity-keyed check which denies, or which deletes a row it did not
create, has reintroduced the defect this design exists to avoid. The rule has no exceptions now;
v3 carved out two and both were exploited.

**Goal:** a site adds its own second-audience login channel (8-digit OTP over any site-owned
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
  `ctx.env.CAIRN_DEV_BACKEND`, following `guard.ts`.
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
| `src/lib/log/events.ts` | The closed `CairnLogEvent` union gains all twelve channel events. |
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
nonceHash, codeHash, now): Promise<{subject: string | null} | null>`; `pruneRequesterRows(session,
bucket, keep)`; `createChannelSession(session, tokenHash, subject, now, ttlMs)`;
`resolveChannelSession(db, tokenHash, now)`; `destroyChannelSession(session, tokenHash)`;
`revokeChannelSessions(session, subject)`; `charge(session, bucket, scope, now, cap):
Promise<{admitted: boolean, count?: number}>` (one function for every budget, differing only by
bucket and scope; `count` is absent on the rejected branch, since a conditional upsert whose
predicate fails returns no row); `refund(session, bucket, scope, now)` (clamped at zero, and a
no-op against a window that has already rolled); `provisionSalt(session)`; `sweep(session, now)`. From
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
strips non-digits then requires exactly that length; `requesterBucket` pairs
`event.getClientAddress()` (never a client-settable header, and IPv6 narrowed to its /64) with the
identity; **`provisionSalt` is one `INSERT OR IGNORE` of 32 random hex followed by a read-back, so
two independently migrated databases hold different salts, and an absent salt after that insert
fails closed rather than defaulting to an empty string**; store functions take an open session
rather than a `db`, so one flow shares one session (`resolveSubject` is the documented exception
and takes `db`).

**Acceptance:** tests prove the cooldown upsert is race-safe (concurrent mints on one nonce write
once); consume returns exactly one row under concurrent identical confirms and rejects a wrong hash
without deleting; decoy rows (`subject` null) never authorize, and neither does an empty-string
subject; **k parallel charges at cap-1 admit exactly one**; the sliding window does not admit 2x at
a window boundary; `refund` restores exactly one, never drives the count negative, and does not
resurrect a rolled window; sweeps use their indexes and clear budget rows older than two windows;
**`pruneRequesterRows` never deletes a row created by a different requester bucket**; **two
independently migrated databases derive different identities for the same contact, and an absent
salt row fails closed**; a re-mint on a reused nonce resets `attempts` to zero; `revokeChannelSessions`
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
`ChannelConfirmResult`, `RateLimitLike`. All twelve event names added to `CairnLogEvent` up front, so
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
writes for unknown contacts, **requester suppression**, the **log-only identity ceiling**, nonce
reuse and minting, and `waitUntil` delivery. There is no request-side escalation: `challenge`
already runs unconditionally, so a second demand there is either a no-op or a re-verification of a
single-use token that fails closed.

**Constraints, and the first two are the ones two review rounds died on:**

- **Only the requester bucket may deny**, and that bucket is the pair of client address and
  identity. The identity send ceiling **only logs** (`auth.channel.ceiling_exceeded`, error level);
  it must not deny, delay, or suppress delivery. An implementer who makes it deny has rebuilt the
  defect that killed v3.
- A failed or throwing `challenge` answers `{error: 'challenge-required'}`, writes no row, calls no
  `deliver`, and charges nothing.
- Reuse an unexpired `_pending` cookie rather than minting a fresh nonce every call, or the
  cooldown's `ON CONFLICT` branch can never fire and the cooldown silently does not exist; minting
  a new nonce prunes **the requester bucket's own** oldest rows, never the identity's.
- **The requester charge is refunded when the cooldown holds**, or a member tapping resend spends
  their whole hourly bucket on one delivered message.
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

**Acceptance, and the first criterion is the structural guard the last three rounds needed:**

- **The lockout regression test.** The victim requests first and holds a valid code, in its own
  cookie jar. A separate attacker jar then exceeds **every identity-keyed cap in the Defaults
  table**, the send ceiling included. The victim then completes a login **with no interaction
  beyond the ordinary flow** (no extra challenge, no waiting, no re-request). This test must fail
  if any identity-keyed control is made to deny, or if pruning is re-keyed on the identity. A
  version of it that lets the victim act last, or shares one cookie jar, proves nothing.
- A `challenge` returning false writes no row, calls no `deliver`, charges nothing, and answers
  `challenge-required`.
- Response bodies deep-equal across known, unknown, cooldown-held, and store-failure inputs; no
  delivery call on the unknown and cooldown paths; two sequential requests from one cookie jar
  inside the cooldown deliver once **and leave the requester bucket charged once**; concurrent
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
  compare. Over the threshold it returns `{error: 'challenge-required'}` **without charging an
  attempt and without consuming the row**, and the factory then awaits `challenge` on the retry. A
  failed challenge returns `challenge-required` again, never a hard error: a member under attack
  meets friction, never a wall. v3 specified escalation with no result code, which could only
  resolve as a fail-closed denial keyed on the victim.
- The returned `attempts` is post-increment, so the cap check is `attempts > cap`, admitting
  exactly `cap` real guesses.
- The session mints only on a returned subject that is non-null **and** non-empty; an empty-string
  subject is a roster data fault, logged at error, never a shared session.
- The `DELETE ... RETURNING subject` is the sole authority on whether the code matched; do not
  precede it with a separate compare, or the redundancy invites an unconditional delete.
- Both cookies carry the full enumerated set from the spec's cookie table, `Max-Age` included, and
  `Secure` whenever the name carries `__Host-`; `secure` comes from `url.protocol`, which is what
  the engine actually does. The nonce cookie is cleared on success **and on logout**, and a
  successful confirm deletes any session row named by an incoming session cookie.

**Acceptance:** **the confirm-side lockout regression test**, run against a site whose confirm form
carries no challenge token (the realistic configuration): the victim holds a valid code, an
attacker in a separate cookie jar exceeds the identity failure gate, and the victim still completes
with no interaction beyond rendering the challenge their own site chose to add. Then: exactly `cap`
wrong guesses before `locked`; a re-mint after the cooldown resets `attempts` so a locked member
has an exit; a malformed code, an absent nonce, a mismatched nonce, and a `challenge-required`
response each cost no attempt and consume no row; **confirm's `bad-code`, `locked`, and
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

**Constraints:** the default key is `requesterBucket(event)`, which is already the pair of client
address and identity, and **never the identity alone**, which would be an attacker-triggerable
per-victim denial of the kind the rule forbids; because that bucket needs the derived identity, the
limiter runs **after** identity derivation rather than at step 1, or falls back to the client
address alone when it must run earlier (v3 specified a key that could not be computed where it
placed the check); the address comes from `event.getClientAddress()`, never a client-settable
header; `result?.success !== true` reads as blocked; a thrown SvelteKit `redirect()`/`error()` from
a site callback rethrows rather than degrading; no `message` field, since the result shape carries
a code rather than a sentence.

**Acceptance:** tests cover absent binding, throwing `key()` and `limit()` (open, logged;
redirect/error rethrown), blocked on both actions, the log trio's shapes, and **the key
composition: two different requester buckets against one identity do not share a limit**, which is
what stops the default key silently collapsing to the identity alone. The reference page
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
consumer proof) as its own entry. ROADMAP also files a passkey layer (added 2026-08-04 at Geoff's
direction): returning-member passkeys on the auth-channel session model, post-1.0 tier. Passkeys
cannot replace the code channel (enrollment and recovery still need the roster-contact bootstrap);
they layer on top via the `kind` discriminator, and a design for them earns its own adversarial
rounds before implementation.

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

---

## Post-mortem (2026-08-04, pass complete on branch `auth-channel`)

**What was built.** All eight tasks, nine commits on `.claude/worktrees/auth-channel` off `main`
at `d504f958`. The `./auth-channel` subpath ships `createAuthChannel`, `devDelivery`,
`CHANNEL_SCHEMA_SQL`/`CHANNEL_SCHEMA_VERSION`, and seven exported types (including
`AuthChannelEvent`, added at the review gate). The store is single-statement atomic throughout;
the factory implements the spec's flows with the throttle rule intact end to end. Docs: the
reference page, the guide, the security-model explanation page (twenty threat-catalogue entries,
each citing a real test name), the log-events reconciliation, the changelog entry under
`## Unreleased`, and the ROADMAP delta (auth-seam entry pruned as shipped; pass 2, the
editor-default-to-codes question, and the passkey layer filed).

**Evidence.** Final state: 394 test files, 4932 tests, exit 0; `npm run check` 0/0; all four
CI-only gates run by name and green (`check:comments`, `check:reference:signatures`,
`check:surface`, `check:snippets`); `check:docs`, `check:arm-indexes`, `check:reference`,
`check:package`, `check:prose` green. 164 tests across the seven auth-channel suites. The
lockout regression tests complete the victim through the real actions in separate cookie jars.

**Decisions locked during execution** (all spec-compatible, none reviewed by an adversarial
round, flagged for pass 2's context): `cairn_channel_code` gained a `requester_bucket` column
(the spec's own prune rule required it; its DDL lacked it) and `mintCode` a ninth parameter; the
requester bucket composes as `${addressHalf}|${saltedIdentity}`; `requesterBucket()` unwraps
IPv4-mapped IPv6 literals; the `ttl` config name stays spec-literal though it bundles counts
(friction-logged); housekeeping sweeps ride each successful mint through `waitUntil` (the
simplifier found `sweep()` implemented but unreachable, the exact table-growth defect v2 was
rejected for); the escalation gate charges provisionally and refunds on success, `locked`, and
the expired race (no compare, no charge); the identity ceiling refunds on cooldown-held resends;
`charge()` tolerates backwards timestamps without rolling a window back; a throwing `verify`
refuses resolution without destroying the session row; both actions parse a clone of the request
body.

**The review gate ran as an adversarial find-and-verify workflow** (Geoff's opt-in): three
Opus reviewer lenses, 24 raw findings, one Opus skeptic per finding, 12 confirmed (11 unique),
all folded in commit `9df1d956`. Two majors: the unclosed `formData()` consumption and the
guide's shared-migrations-directory cross-apply. Twelve findings dropped at the per-lens top-8
cap, inspected by the orchestrator: all minor, three folded cheaply, the rest design-accepted.
The refute-by-default verify step killed exactly the false positives a flat fan-out would have
surfaced (re-reported residual risks, misread code).

**Process notes.** Two implementer dispatches parked themselves waiting on their own background
test runs and had to be resumed; future dispatches should say "run gates in the foreground" (both
dispatches after the first correction carried that line and the problem stopped). One dispatch
committed despite a do-not-commit instruction; the commit contained exactly its reviewed files,
so it stood. The CI gate list was pasted from the workflow file into every dispatch per the
standing warning, and no gate was dropped. `main`'s own CI is red on `docs-links` (the provenance
doc committed during planning links to the Task 6 page that now exists only on this branch);
merging clears it. Main-loop review caught real defects the implementers' green gates did not:
the IPv4-mapped bucket collapse, the negative-clamp gap (reported as present, absent in code),
the double `lookup_failed` emission, and the verify-throw mass-revocation.

**Budgets.** Subagent tokens roughly 5.4M total: ~2.6M across ten implementer/simplifier/docs
dispatches, ~2.3M for the 27-agent review workflow, ~0.2M for the register pass. Geoff
interaction points: zero blocking questions during execution; the pass's one open decision (merge
timing) is presented at close as designed.

**Not done, by design.** No version bump, no publish (the window holds at `0.93.0` unpublished);
no consumer-bundler proof (pass 2 owns it: the showcase `/members` fixture, `MEMBER_DB`,
the `.cairn-template.json` exclusion plus its emitted-template test, the e2e); no release claim.
