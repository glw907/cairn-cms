# Design: `createAuthChannel`, the second-audience login factory

Date: 2026-08-03, revised 2026-08-04 (v2, after adversarial review). Status: approved design,
pre-plan. Author: Fable sitting with Geoff. Supplements the functional spec
(`2026-05-28-cairn-rebuild-functional-spec.md`), which is unchanged; nothing here touches the
editor magic-link flow it locks.

**v2 supersedes v1 in full.** Two Opus 5 reviewers attacked v1 independently and both returned "do
not build": three critical defects, an unimplementable flow step, and several platform claims that
were factually wrong. The revision log at the end records what changed and why. Read this document,
not the review reports.

## What this is

cairn's supported way for a site to add its own login channel for a second audience (members,
athletes, boosters) without hand-writing auth crypto. The engine exports one factory,
`createAuthChannel`, that owns every security discipline; the site supplies delivery, roster
lookup, and identifier shape. Email magic-link stays the zero-config editor default and the
documented primary path. This seam is the supported second channel, not a "choose your auth" menu.

The driving consumer is the xcathletes team platform (ecxc-ski
`docs/superpowers/plans/2026-07-30-team-platform-pass-1.md`, Task 4), whose requirements are this
spec's acceptance floor. The seam lands before that task runs, so the consumer builds on the
factory instead of hand-writing `otp.ts`/`sessions.ts`/`transport.ts`. The family precedents it
retires are ASC's two hand-rolled copies (`src/member-auth/lib/crypto.ts`, waitlist-offer tokens),
both carrying comments saying they reimplemented because no supported surface existed.

## The acceptance test

A site must not be able to write a working channel that is insecure without deliberately bypassing
the factory. Every decision below serves that test.

The v1 corollary ("nothing in the site-supplied config is security-relevant") was too strong and is
withdrawn. One field carries a correctness obligation: `normalize` must be idempotent and must map
every spelling of one identity to a single canonical form. The factory bounds its output and states
the obligation in the reference page rather than pretending it does not exist.

## Decisions locked

1. **The factory owns the SQL and the schema.** cairn ships the schema; the factory runs its own
   prepared statements against a site-supplied D1 binding. The site's own database, never
   `AUTH_DB`; the two stores stay physically separate. A site-implemented store interface was
   rejected because the hardest disciplines are SQL shapes, and an interface makes them conventions
   a site can get wrong.
2. **Code only at v1.** The credential is a 6-digit one-time code for every delivery kind. The
   config reserves a credential-kind field so `'link'` can join as a later minor. The schema ships
   a `kind` column at v1 so that addition needs no consumer migration.
3. **Full altitude: the factory returns SvelteKit actions and owns the cookie write.** If the site
   sets its own session cookie it can ship a working channel missing `HttpOnly` or `__Host-`
   without bypassing anything, which fails the acceptance test.
4. **Codes are bound to the browser that requested them** (v2). This is the change that makes the
   rest safe; see Session binding below.
5. **Out of scope, filed to ROADMAP:** migrating the engine's own editor default to codes, and
   refactoring the editor magic-link flow onto this factory. `magic_token` is untouched.
6. **The consumer proof ships as a separate pass** (v2 sizing call): the showcase member fixture,
   its D1 plumbing, the scaffolder exclusion, and the e2e. This spec's Testing section covers the
   factory pass; the follow-up pass gets its own plan.

## Session binding, and the two attacks it answers

`confirm` in v1 was reachable by anyone who knew a contact string, which produced two defects that
no amount of rate limiting closes.

**The lockout attack.** An attacker POSTs wrong codes at a victim's contact, burning the attempt
budget on whatever row exists. The victim requests a code, the attacker exhausts it within a
second, and the victim gets `locked` on a code that just arrived. The victim's resend is swallowed
by the silent cooldown, so the loop is permanent and silent.

**The code-invalidation attack**, which survives a naive fix. If rows are keyed per identity, an
attacker who merely re-requests every 60 seconds replaces the victim's live code forever. Nothing
about attempt counting prevents it, because the row itself is the contested resource.

The answer to both: `request` mints a nonce, sets it as a short-lived cookie, and stores its hash
on the code row, and **the code row is keyed on identity plus nonce hash**. `confirm` rejects a
submission whose nonce does not match, before it increments anything.

- An attacker's request creates the attacker's own row under the attacker's own nonce. The victim's
  request creates a separate row. Independent codes, independent counters, no contention.
- A guess without the matching nonce cookie is rejected without touching `attempts`, so the budget
  belongs to the session that owns it.
- Total spend per identity is bounded by the issuance budget below, not by row replacement.

This is NIST SP 800-63B's out-of-band binding recommendation: present the authenticator output to
the session that requested it. It costs one column and one cookie, and it adds an anti-phishing
property worth stating in the guide: a code stolen in transit is useless in the thief's browser.

The cost is that a member must confirm in the browser that requested. For a typed code this is the
normal flow; the guide says so plainly, and the UI's remedy for a mismatched or missing nonce is to
request a fresh code.

## Identity, and why unknown contacts still write rows

v1 made `request` opaque and then let `confirm` give the roster away: only a known contact had a
row, so `expired` meant "not on the roster" and `bad-code` meant "on it". Two requests, no timing
analysis. The same asymmetry leaked through response timing (the known path did two D1 round trips,
the unknown path none) and through D1 failures (the known path could 500 where the unknown path
could not).

All three die together if the store does identical work for every input. So:

```
identity = hashToken('s:' + subject)   when lookup returns a subject
identity = hashToken('c:' + contact)   when it does not
```

Both are opaque, deterministic, and server-side. Every request writes a row. An unknown contact's
row carries `subject = NULL` and a code hash over a discarded random value that nothing will ever
submit, so it can never authorize even on an impossible collision. Delivery runs only for a known
contact.

Keying on the subject rather than the contact also fixes a v1 defect: with contact-keyed rows, a
site whose `normalize` accepts several spellings of one phone number gave that person several
independent cooldowns and attempt budgets. Keying on subject makes every control per person. It
also removes contacts from the code table entirely, so neither table stores PII.

## Surface

One new server-only subpath, `./auth-channel`.

```ts
import { createAuthChannel, devDelivery } from '@glw907/cairn-cms/auth-channel';

const channel = createAuthChannel<App.Platform['env']>({
  resolveDb: (env) => env?.MEMBER_DB,
  deliver: sendOtp,
  lookup: contactToPersonId,
  normalize: normalizeContact,
  cookie: { name: 'member_session' },
  challenge: verifyTurnstile,
});
```

Returns `actions: { request, confirm, logout }`, `resolveSubject(event)`, and
`revokeSessions(db, subject)`.

| Config | Contract |
|---|---|
| `resolveDb(env)` | The channel's D1 binding. Undefined or null fails the action closed. |
| `deliver(contact, code)` | Sends the code. A throw is scrubbed, logged, and deletes the pending row (see Delivery). |
| `lookup(contact)` | Normalized contact to subject id, or null. A throw is caught and treated as null. |
| `normalize(raw)` | Identifier shape. Must be idempotent and canonical per identity. Output over 254 characters is rejected as invalid. A throw is caught and treated as invalid. |
| `cookie.name` | Base name, through the existing `cookieName` builder. Names both the session and the nonce cookie (the nonce takes a `_pending` suffix). |
| `kind` | Only `'code'` at v1. |
| `challenge?(event, form)` | Awaited before any mint; false or a throw fails closed. This is where Turnstile goes. The factory reads the form once and passes it in, so the site never re-reads a consumed body. |
| `verify?(subject)` | Consulted by `resolveSubject` on every resolution. False revokes on the next request. |
| `ttl?` | Clamped overrides: `code`, `session`, `attempts`, `resendCooldown`, `sendsPerHour`. |
| `rateLimit?` | Back pressure only, mirroring section-action's degrade-to-open semantics with the deltas named below. |

Every type the surface names is exported from the subpath, per the `check:snippets` lesson.

`devDelivery` logs the code and refuses to run when the deployment is not dev. The refusal lives
**inside its body**, reading the same runtime signals `guard.ts` uses (`platform.env`), not
`$app/environment`. A construction-time identity check stays as the friendly early failure, but a
site that wraps it (`deliver: (c, code) => devDelivery(c, code)`) still gets refused at call time.
Nothing in `src/lib` imports `$app/*` today and this does not start.

## Storage

The guide carries the canonical DDL; the site copies it into its own migrations. The factory
exports `CHANNEL_SCHEMA_SQL` and `CHANNEL_SCHEMA_VERSION`, verifies the version once per isolate,
and fails closed with a message naming the migration when the deployed shape is older.

```sql
CREATE TABLE cairn_channel_code (
  identity TEXT NOT NULL,
  nonce_hash TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  subject TEXT,
  kind TEXT NOT NULL DEFAULT 'code',
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (identity, nonce_hash)
);

CREATE TABLE cairn_channel_session (
  token_hash TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE cairn_channel_budget (
  identity TEXT PRIMARY KEY,
  sends INTEGER NOT NULL DEFAULT 0,
  failures INTEGER NOT NULL DEFAULT 0,
  window_start INTEGER NOT NULL
);

CREATE INDEX idx_cairn_channel_code_expires ON cairn_channel_code (expires_at);
CREATE INDEX idx_cairn_channel_session_subject ON cairn_channel_session (subject);
CREATE INDEX idx_cairn_channel_session_expires ON cairn_channel_session (expires_at);
```

Both `expires_at` indexes exist because the sweeps run on the login path; v1 shipped neither and
would have full-scanned on every login. The `subject` index now has a caller (`revokeSessions`),
which v1 designed and then dropped.

Mint is one conditional upsert, so the cooldown cannot be raced (v1 checked with a `SELECT` and
wrote in a separate batch, so k concurrent requests all delivered):

```sql
INSERT INTO cairn_channel_code (identity, nonce_hash, code_hash, subject, expires_at, created_at)
VALUES (?, ?, ?, ?, ?, ?)
ON CONFLICT(identity, nonce_hash) DO UPDATE SET
  code_hash = excluded.code_hash, attempts = 0,
  expires_at = excluded.expires_at, created_at = excluded.created_at
WHERE excluded.created_at - cairn_channel_code.created_at >= ?
RETURNING created_at
```

No returned row means the cooldown held: answer `{sent: true}` and send nothing, which is the
specified silent behavior, now race-free.

Consume is the authorization event, one statement, conditioned on the hash, mirroring the engine's
own `consumeToken` (v1's compare-then-`DELETE` let two concurrent confirms both mint):

```sql
DELETE FROM cairn_channel_code
 WHERE identity = ? AND nonce_hash = ? AND code_hash = ? AND expires_at > ?
RETURNING subject
```

A session is minted only when exactly one row returns **and** its `subject` is non-null.

Sweeps are separate indexed statements in the same batch, never an `OR` (SQLite cannot use an index
for an `OR` whose other branch is unindexable, so v1's `WHERE contact = ? OR expires_at <= ?`
full-scanned every mint).

Every flow runs inside `db.withSession('first-primary')`. The database is site-supplied, so read
replication is the site's toggle, and without this a logout can fail to log out and the cooldown
can be bypassed against a lagging replica.

A pepper is still rejected for the session table, where the 256-bit token makes at-rest hashing
meaningful. For the 6-digit code the spec now says plainly what v1 overclaimed: hashing a code from
a 10⁶ space is a speed bump, not a protection, and read-only D1 exposure (a Read-scoped API token,
a Time Travel export) recovers every live code. The accepted mitigation is that codes live 10
minutes and are session-bound, so a recovered code is useless without the matching nonce cookie.

## Flows

All three actions verify request origin (`originMatches`, `isUnsafeFormRequest` from the shared
`csrf.ts`) and refuse plain http outside localhost outright, mirroring `guard.ts`'s admin rule. v1
degraded the cookie instead, which meant a site on Cloudflare "Flexible" SSL wrote a member session
token with no `Secure` and no `__Host-`. Refusing is the only safe reading. The `secure` flag comes
from `url.protocol`, which is what the engine actually does; v1's plan told the implementer to use
a derivation that does not exist.

**request** (form field `contact`):

1. Origin and scheme checks; `rateLimit` when configured.
2. `challenge` when configured; false or throw fails closed.
3. `normalize`; invalid returns `{error: 'invalid'}` (shape validity is public knowledge).
4. `lookup`; derive `identity` from the subject or from the contact.
5. Issuance budget: over `sendsPerHour` for this identity returns `{sent: true}` and sends nothing.
6. Mint the nonce, set its cookie, run the conditional upsert. No returned row means the cooldown
   held: answer `{sent: true}`, send nothing.
7. Deliver, only for a known subject, through `waitUntil` with a `.catch()` attached **before** the
   promise is handed over.

Every store failure is caught and answers `{sent: true}`, so an induced D1 error is not an
enumeration oracle either.

Return: `{sent: true} | {error: 'invalid' | 'throttled'}`.

**confirm** (form fields `contact`, `code`):

1. Origin and scheme checks; `rateLimit` when configured.
2. Canonicalize the submitted code: strip non-digits, then require exactly 6. Malformed returns
   `{error: 'bad-code'}` **without** touching attempts, so an SMS autofill's `123 456` costs
   nothing. Minted codes are zero-padded 6-character strings and the hash is over that exact form.
3. Read the nonce cookie. Absent or non-matching returns `{error: 'bad-code'}` without touching
   attempts.
4. Increment and read in one statement. No row returns `{error: 'expired'}`. The returned
   `attempts` is post-increment, so the cap check is `attempts > cap`, which admits exactly `cap`
   real guesses.
5. Over the cap returns `{error: 'locked'}` without comparing, and increments the identity's
   failure budget.
6. Constant-time compare, then the conditioned `DELETE ... RETURNING subject`. A returned non-null
   subject mints the session (sweeping expired rows in the same batch), sets the cookie with the
   full attribute set including `Max-Age` derived from the session TTL, clears the nonce cookie,
   and returns `{ok: true}`.

Return: `{ok: true} | {error: 'bad-code' | 'expired' | 'locked' | 'throttled'}`. These values are
safe to distinguish now, because every input has a row and the whole flow is unreachable without
the nonce.

**logout** — origin check, delete by token hash, clear the cookie.

**resolveSubject(event)** — read the cookie, hash, select the unexpired row, call `verify(subject)`
when configured, return the subject or null. **`revokeSessions(db, subject)`** deletes every
session for a subject; the guide's roster-removal exemplar calls it, and the guide states that
without either `verify` or a `revokeSessions` call, removing a member does not cut their session
for up to the session TTL.

## Defaults and clamps

| Parameter | Default | Clamp |
|---|---|---|
| Code TTL | 10 min | at most 15 min |
| Attempt cap (per code row) | 5 | at most 10 |
| Resend cooldown (per identity, per nonce) | 60 s | at least 30 s |
| Sends per hour (per identity) | 5 | at most 20 |
| Failed confirms per hour (per identity) | 20 | at most 50 |
| Session TTL | 30 days (xcathletes passes 90) | at most 1 year |
| Code length | 6 digits, zero-padded, rejection-sampled | fixed |

The two budget rows are what actually bound brute force. v1 relied on the per-code cap plus the
Cloudflare limiter, which does not close: 5 guesses per code with a 60-second reissue is 7200
guesses a day against 10⁶, roughly a coin flip across a 90-day season, and the Workers rate-limit
binding cannot express a daily cap (its period is 10 or 60 seconds, it counts per colo, and it
degrades open). With a 20-failure hourly budget the same attack needs decades.

`rateLimit` stays optional and stays back pressure only, which is what the engine's own
`rate-limit.ts` says it is. The spec no longer claims it as a security control. Its deltas from
`SectionActionConfig.rateLimit`, since v1 wrongly said "mirrors exactly": the key callback takes
the event rather than an admin context, it is optional (defaulting to the client IP for `request`
and to the identity for `confirm`, since an IP-keyed limit on `confirm` would lock out a whole team
sharing one venue's wifi), and there is no `message` field, because the result shape carries a code
rather than a sentence.

## Delivery

Delivery runs through `waitUntil` so the provider round trip never shapes response timing. Three
corrections v1 got wrong, all verified in the installed toolchain:

- Read `platform.ctx?.waitUntil` first, with `platform.context?.waitUntil` as the legacy fallback.
  The adapter marks `context` deprecated, and a silent fall-through to the inline branch would
  quietly reinstate the timing oracle on a dependency bump.
- Under `vite dev` and `vite preview` the emulated `waitUntil` is a **no-op that discards the
  promise**, so v1's "awaited inline in dev" was false. The promise runs detached; the inline
  branch exists only for a runtime with no platform at all.
- Attach `.catch()` before handing the promise over. An orphaned rejection terminates the preview
  server under Node and surfaces as an uncaught exception in workerd.

On a delivery failure the pending code row is **deleted**, which lifts the cooldown immediately so
the member's next resend actually re-sends. v1 left the row, so a provider outage put the member in
a loop where every attempt reported success and none delivered. The engine's magic-link path awaits
its send deliberately for the same reason; this design takes the other trade to close the timing
oracle and pays for it with the compensating delete rather than by ignoring the cost.

## Logging

Events: `auth.channel.requested`, `.send_failed`, `.confirmed`, `.locked`, `.session.created`,
`.session.destroyed`, plus the rate-limit trio. All nine names go into the `CairnLogEvent` union in
`src/lib/log/events.ts`, which is closed and will not typecheck otherwise.

The correlation id is a prefix of the **identity** hash, not of a contact hash. v1's 8-hex prefix
over an unsalted contact hash was reversible against a known roster in seconds, which defeated the
consumer's no-PII gate while advertising the reversal as an operator feature. The identity hash has
an opaque input, so it correlates without identifying.

`auth.channel.requested` is emitted identically for known, unknown, cooldown-suppressed, and
budget-suppressed inputs, with the outcome in a field, so the record's existence carries no roster
signal. `send_failed` logs a scrubbed, length-capped error through the existing `scrubSendError`
pattern, never a raw provider message: Twilio and Resend both embed the recipient in their error
strings.

## Testing (this pass)

Unit and integration against real miniflare D1. The integration harness gains a second binding in
`wrangler.test.jsonc`, so the physical-separation decision is proven rather than contradicted by
running channel tables inside `AUTH_DB`.

Coverage: the clamps at both bounds; the wrapped-`devDelivery` refusal; nonce absence, mismatch,
and reuse; concurrent confirms with one valid code mint exactly one session; concurrent requests
deliver once; known, unknown, cooldown-suppressed, and budget-suppressed responses are deep-equal;
an induced store failure still answers `{sent: true}`; a throwing `deliver` leaves no row and an
immediate re-request mints again; a throwing `lookup` and a throwing `normalize` take the uniform
paths; exactly `cap` wrong guesses before `locked`; a spaced and a leading-zero code; single-use
consume under replay; session round-trip, `verify` revocation, `revokeSessions`, `Max-Age`, and the
full cookie attribute set on both schemes; http refusal; and no record carrying a contact, proven
with a `deliver` whose thrown message contains one.

The consumer proof (showcase fixture, its D1 plumbing, the scaffolder exclusion, the e2e) is the
follow-up pass. Until it lands, nothing proves the built package through a consumer's bundler, so
this pass is not releasable on its own. The window holds unpublished regardless.

## Documentation

Reference page `docs/reference/auth-channel.md`; `docs/reference/log-events.md` gains the nine
events; guide `docs/guides/add-a-login-channel.md` carrying the DDL, the `challenge` hook as the
Turnstile home, the same-browser confirmation rule and its anti-phishing upside, the
`autocomplete="one-time-code"` note, the client-side resend timer (the cooldown is deliberately
silent), the roster-removal exemplar calling `revokeSessions`, the read-replication constraint, the
operator correlation one-liner, and the statement that email magic-link stays the default.
`CHANNEL_SCHEMA_SQL` is documented as migration-only, never a request path. Changelog under
`## Unreleased`, additive, no version bump.

## Revision log (v1 to v2)

Adopted from review: session binding via nonce cookie; identity-keyed rows with decoy writes for
unknown contacts; atomic conditioned consume; subject stored on the code row; D1-backed issuance
and failure budgets; `revokeSessions` plus the `verify` hook; `withSession('first-primary')`;
`expires_at` indexes and split sweeps; the conditional upsert replacing check-then-write; the
`challenge` config hook replacing the Turnstile wrap (which could not be written without a
double body read); code canonicalization and zero-padding; `Max-Age` and the session TTL clamp;
scrubbed delivery errors; identity-based correlation ids; runtime `devDelivery` refusal off
`$app/environment`; `ctx` before `context`, `.catch()` before `waitUntil`, and the corrected dev
note; http refusal instead of cookie degradation; `attempts > cap` stated; the schema version
check; the `kind` column reserved at v1; the closed log-event union named; the second test binding;
the honest read of the rate-limit binding and of hashing a 6-digit code.

Added beyond review: the identity-plus-nonce composite key, which closes the code-invalidation
attack that survives session binding alone.

Withdrawn: the claim that no site-supplied config is security-relevant; the "mirrors
`SectionActionConfig.rateLimit` exactly" claim; the single-digit-millisecond timing estimate; the
pepper-rejection reasoning as applied to codes.
