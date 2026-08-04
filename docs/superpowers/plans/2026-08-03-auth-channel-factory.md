# The auth-channel factory: `createAuthChannel`

> **For agentic workers:** execute with `cairn-pass` plus per-task `cairn-implementer` dispatches
> from an Opus 5 session, on a fresh worktree `.claude/worktrees/auth-channel` (branch
> `auth-channel`, off `main` at `7c92cc26` or later). The main loop reviews each diff and confirms
> the full gate between dispatches. Tasks specify outcomes, constraints, and acceptance criteria;
> the implementer writes the code test-first against them.

**Authority:** the approved design spec
[`2026-08-03-auth-channel-factory-design.md`](../specs/2026-08-03-auth-channel-factory-design.md).
Read it in full before the first dispatch; every task below cites its sections rather than
restating them. The consumer floor is xcathletes Task 4
(ecxc-ski `docs/superpowers/plans/2026-07-30-team-platform-pass-1.md`), already distilled into the
spec.

**Goal:** a site adds its own second-audience login channel (6-digit OTP over any site-owned
transport) by supplying only delivery, roster lookup, and identifier shape. The factory owns every
security discipline. Acceptance test for the whole pass: a site cannot write a working insecure
channel without deliberately bypassing the factory.

**Sequencing pressure:** the seam's window closes the session xcathletes runs its Task 4. Confirm
that has not happened before starting (the xcathletes pass state lives in the ecxc-ski repo).

## Global constraints (every task)

- The full CI gate list, pasted from `.github/workflows/test.yml` (do not retype into dispatches;
  copy this block): `npm run check`, `npm test`, `check:package`, `check:reference`,
  `check:reference:signatures`, `check:surface`, `check:custom-surface`, `check:chassis-boundary`,
  `check:cm-internals`, `check:invisible-craft`, `check:admin-css-classes`, `check:readiness`,
  `check:docs`, `check:arm-indexes`, `check:snippets`, `check:prose`, `check:version`,
  `check:dev-package`, `check:consumers`, showcase `check`, `check:comments`.
  Per-task dispatches run the targeted tests plus `npm run check` and `npm test`; the CI-only four
  (`check:comments`, `check:reference:signatures`, `check:surface`, `check:snippets`) run at the
  pass-end ritual and any task that touches what they gate.
- No PII in engine log records: channel events carry the 8-hex contact-hash prefix, never the
  contact (spec, Logging). `devDelivery`'s dev-only echo is the sole exception.
- All times epoch milliseconds; all hashing via the existing `hashToken`; all compares via
  `tokensMatch`; cookie names via `cookieName` (`src/lib/auth/crypto.ts`). No new crypto.
- Comments follow TSDoc per the ts-conventions skill; the em dash is banned in comments.
- Worktree discipline: edits target the worktree path; the showcase in a worktree resolves the
  MAIN checkout's engine until a from-scratch `npm install`; `pretest:e2e` repackages before every
  e2e run.

## File map

| Path | Responsibility |
|---|---|
| `src/lib/auth-channel/store.ts` | The channel's D1 statements and its DDL constant. Nothing else touches SQL. |
| `src/lib/auth-channel/factory.ts` | `createAuthChannel`: config validation, the three actions, `resolveSubject`. |
| `src/lib/auth-channel/dev.ts` | `devDelivery` and its production refusal. |
| `src/lib/auth-channel/index.ts` | The public barrel with its boundary comment. |
| `src/tests/integration/auth-channel-*.test.ts` | workerd + miniflare D1 integration suites, one per flow. |
| `src/tests/unit/auth-channel-config.test.ts` | Construction-time validation. |
| `examples/showcase/src/routes/members/**` | The member-login fixture. |
| `docs/reference/auth-channel.md`, `docs/guides/add-a-login-channel.md` | The docs arm. |

---

### Task 1: The channel store

**Files:** create `src/lib/auth-channel/store.ts`; create
`src/tests/integration/auth-channel-store.test.ts`.

**Interfaces produced (later tasks consume these exact names):**
`CHANNEL_SCHEMA_SQL` (the DDL string, spec section Storage, verbatim);
`mintCode(db, contact, codeHash, now, ttlMs)` (delete-then-insert batch, sweeps expired);
`recentCode(db, contact, since): Promise<boolean>`;
`incrementAndReadCode(db, contact, now): Promise<{codeHash: string, attempts: number} | null>`
(the one-statement `UPDATE ... RETURNING`);
`consumeCode(db, contact)`;
`createChannelSession(db, tokenHash, subject, now, ttlMs)` (sweeps expired sessions in the same
batch);
`resolveChannelSession(db, tokenHash, now): Promise<string | null>`;
`destroyChannelSession(db, tokenHash)`.

**Outcome:** every storage discipline in the spec's Storage section, proven against real miniflare
D1 with tables created from `CHANNEL_SCHEMA_SQL` in test setup (the `auth-store.test.ts` pattern).

**Constraints:** the schema is the spec's verbatim; only hashes ever stored; the increment and the
read are one statement, never two; `mintCode` resets `attempts` by replacement, not by update.

**Acceptance:** tests prove one-live-code-per-contact (second mint replaces the first), expired
sweep on mint and on session create, increment-then-read atomicity (attempts advance even on
mismatch paths), consume is single-use, session resolve returns null on expiry, destroy is
idempotent. Targeted suite green; `npm run check` 0/0; `npm test` exit 0.

### Task 2: Factory construction, validation, and the subpath

**Files:** create `src/lib/auth-channel/factory.ts`, `src/lib/auth-channel/dev.ts`,
`src/lib/auth-channel/index.ts`; modify `package.json` (exports map);
create `src/tests/unit/auth-channel-config.test.ts`.

**Interfaces produced:** `createAuthChannel<Env>(config: AuthChannelConfig<Env>): AuthChannel<Env>`
per the spec's Surface section: config fields `resolveDb`, `deliver`, `lookup`, `normalize`,
`cookie.name`, `kind` (default `'code'`, sole valid value), `ttl?`, `rateLimit?`; returns
`{ actions: { request, confirm, logout }, resolveSubject }`. `devDelivery` exported. Every type
the surface names exported: `AuthChannel`, `AuthChannelConfig`, `ChannelRequestResult`,
`ChannelConfirmResult`, re-exported `RateLimitLike`. Actions are stubs in this task (each throws
`not implemented`); Tasks 3 and 4 replace them.

**Outcome:** construction is where misconfiguration dies (spec sections Surface, Defaults and
clamps). The `./auth-channel` subpath exists (types + default, server-only, no browser condition,
the `./auth-store` shape) so the surface and snippet gates bite from here on.

**Constraints:** clamps reject at construction (code TTL over 15 min, attempts over 10, cooldown
under 30 s); `kind` other than `'code'` rejects; `devDelivery` configured when `$app/environment`
`dev` is false throws with a message naming the fix; `cookie.name` goes through `cookieName`,
which already rejects malformed and prefixed bases.

**Acceptance:** unit tests cover every clamp bound (both sides), the kind rejection, the dev
refusal (mock `$app/environment` both ways), and a valid construction returning the full shape.
`check:package` passes with the new subpath. Targeted suite green; full local gate green.

### Task 3: The request action

**Files:** modify `src/lib/auth-channel/factory.ts`; create
`src/tests/integration/auth-channel-request.test.ts`.

**Interfaces consumed:** Task 1's store functions; `originMatches` and `isUnsafeFormRequest` from
`src/lib/sveltekit/csrf.ts` (already shared internals, verified present; no extraction needed);
`generateToken`-family and `hashToken` from `src/lib/auth/crypto.ts`; the `log` chokepoint.

**Outcome:** the spec's request flow, all seven steps in its exact order, including the silent
cooldown (spec's Flows section: a within-cooldown request answers `{sent: true}` and sends
nothing, because a spoken cooldown is an enumeration oracle) and `waitUntil` delivery (the
provider round trip never shapes response timing; inline await only when
`event.platform?.context?.waitUntil` is absent, the dev case).

**Constraints:** code is 6 digits from `crypto.getRandomValues` with rejection sampling (no
modulo bias); unknown contact returns the byte-identical body with no mint and no `deliver` call;
a `deliver` throw logs `auth.channel.send_failed` and never surfaces; events
`auth.channel.requested` and `auth.channel.send_failed` carry the hash prefix only.

**Acceptance:** integration tests prove response-body identity across known, unknown, and
within-cooldown contacts (deep-equal the three bodies); no delivery call for unknown and cooldown
cases (spy); origin mismatch refuses; malformed contact returns `{error: 'invalid'}`; a throwing
`deliver` still answers `{sent: true}`; emitted records never contain the contact (assert over a
captured log sink). Targeted suite green; full local gate green.

### Task 4: Confirm, session, logout, resolveSubject

**Files:** modify `src/lib/auth-channel/factory.ts`; create
`src/tests/integration/auth-channel-confirm.test.ts`,
`src/tests/integration/auth-channel-session.test.ts`.

**Interfaces consumed:** Task 1's store functions; `tokensMatch`; the cookie helpers; the same
origin internals as Task 3.

**Outcome:** the spec's confirm flow in its exact order (increment before compare; locked before
compare; constant-time compare; single-`DELETE` consume; session mint with sweep; cookie write
with the full attribute set), plus `logout` and `resolveSubject` per the spec's Flows section.

**Constraints:** the lockout is per-code (a fresh request after cooldown resets it, spec's Flows
section); `secure` derives the way the engine guard derives it, never from `url.protocol` blindly;
the confirm error union is exactly `'bad-code' | 'expired' | 'locked' | 'throttled'`; session
expiry is absolute, no sliding renewal; events `auth.channel.confirmed`, `auth.channel.locked`,
`auth.channel.session.created`, `auth.channel.session.destroyed` carry the hash prefix only.

**Acceptance:** integration tests prove expiry, lockout at exactly the cap, recovery via
re-request after cooldown, bad-code increments attempts, consume is single-use (replay of the
same code fails), the cookie carries `HttpOnly`, `Path=/`, `SameSite=Lax`, and `Secure` plus
`__Host-` on https but not on http, `resolveSubject` round-trips and nulls on expiry and after
logout, and no record carries the contact. Targeted suites green; full local gate green.

### Task 5: The volumetric rate limit

**Files:** modify `src/lib/auth-channel/factory.ts`; create
`src/tests/integration/auth-channel-rate-limit.test.ts`.

**Interfaces consumed:** `RateLimitLike` (`src/lib/cloudflare/rate-limit.js`); the
`SectionActionConfig.rateLimit` semantics at `src/lib/sveltekit/section-action.ts:210-251` as the
behavioral reference, transplanted, not imported.

**Outcome:** the spec's `rateLimit` config on `request` and `confirm`: resolve off the platform
env, key defaults to client IP, degrade-to-open with `auth.channel.rate_limit_absent` /
`auth.channel.rate_limit_failed`, blocked answers `{error: 'throttled'}` and logs
`auth.channel.rate_limited`.

**Constraints:** mirror the section-action semantics exactly, including `result?.success !== true`
reads as blocked, and a thrown SvelteKit `redirect()`/`error()` from site callbacks rethrows
rather than degrading; the rate-limit check runs before any store read, after the origin check.

**Acceptance:** tests cover absent binding (open, logged), throwing `key()` and `limit()` (open,
logged; redirect/error rethrown), blocked on both actions, and the log trio's shapes. Targeted
suite green; full local gate green.

### Task 6: The showcase member-login fixture and e2e

**Files:** create `examples/showcase/src/routes/members/**` (login page with the three actions
wired, a guarded member page, the capture transport, a test-only code-readback route); create the
e2e spec in the showcase Playwright suite beside its existing specs.

**Interfaces consumed:** the built package's `./auth-channel` subpath only (never `src/lib`
relative imports; the fixture is the consumer stand-in).

**Outcome:** a full request, confirm, guarded-page, logout loop against the BUILT package. The
fixture's shapes come from xcathletes Task 4 (contact field, code field, guarded member area), per
the fixture-inputs rule. The transport is site-authored capture (module variable plus test-only
readback route), because the e2e runs the built showcase under preview where `devDelivery`
refuses by design; the fixture carries a comment saying the readback route exists for the e2e and
must not be copied into a real site.

**Constraints:** the showcase's D1 gains the two channel tables via `CHANNEL_SCHEMA_SQL`'s
verbatim block in the showcase's migrations; the fixture supplies a roster of two seeded members;
the login page's code input carries `autocomplete="one-time-code"` (it is the guide's own
exemplar).

**Acceptance:** e2e proves request, code capture, confirm, guarded page renders the subject,
logout locks the page again, and a wrong code five times answers locked. `npm --prefix
examples/showcase run test:e2e` green after a from-scratch showcase install in the worktree (the
symlink gotcha), or on CI's real checkout.

### Task 7: Documentation, surface, and tracking

**Files:** create `docs/reference/auth-channel.md`, `docs/guides/add-a-login-channel.md`; modify
`docs/reference/log-events.md`, `docs/reference/README.md` (arm index), `CHANGELOG.md`,
`ROADMAP.md`; regenerate `docs/internal/api-surface.md`.

**Outcome:** the docs arm per the spec's Documentation section. The guide carries the canonical
schema block, the Turnstile wrap pattern, the `autocomplete="one-time-code"` note, the client-side
resend-timer note, the operator correlation one-liner, and the plain statement that email
magic-link stays the default. The reference page documents every export and the clamped defaults
table. `log-events.md` gains all nine channel events with triggers and fields.

**Constraints:** a test (placed with the store suite) asserts the guide's SQL block equals
`CHANNEL_SCHEMA_SQL`, so the doc cannot drift from the code; the changelog entry is additive under
`## Unreleased` with no `Consumers must:` line and no version bump; ROADMAP marks the Now-tier
auth-seam entry shipped and files the editor-default-to-codes question as a new entry; every
fenced `ts` block in the new docs typechecks against the built package.

**Acceptance:** `check:reference`, `check:reference:signatures`, `check:docs`, `check:arm-indexes`,
`check:snippets`, `check:package`, and `check:surface -- --update` (snapshot committed) all green,
run by name. Full local gate green.

### Task 8: Pass close

The `cairn-pass` ending ritual, whole: code-simplifier over the pass's changes; the full gate
including the four CI-only checks by name; reviewer fan-out with `web-auth-security-reviewer`
mandatory (auth surface) plus `svelte-reviewer` and `cloudflare-workers-reviewer`, findings folded
before merge; the from-scratch consumer build or a CI e2e run before calling it releasable; no
version bump (the window holds unpublished per STATUS); post-mortem appended to this plan; STATUS
updated on `main` (the AI-posture pass becomes the immediate next action); worktree merged per the
user's call; context-clear prep with the exact resume prompt.

## Deviations from the spec, recorded at plan time

1. The showcase fixture uses a site-authored capture transport, not `devDelivery` (the spec's
   Testing section was amended in the same commit as this plan): the e2e runs the built showcase
   under preview, where `dev` is false and `devDelivery` refuses by design.
2. No origin-check extraction task exists: `originMatches`/`isUnsafeFormRequest` already live in
   the shared internal `src/lib/sveltekit/csrf.ts`, so the factory imports them as the guard does.
