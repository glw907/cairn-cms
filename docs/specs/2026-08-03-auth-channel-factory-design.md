# Design: `createAuthChannel`, the second-audience login factory

Date: 2026-08-03. Revised 2026-08-04 (v2), 2026-08-04 (v3), 2026-08-04 (**v3.1**, current). Status: approved design,
pre-plan. Author: Fable sitting with Geoff.

**v3.1 supersedes v1, v2, and v3 in full.** Three adversarial rounds ran against this design. The
first rejected v1, the second rejected v2, and the third found a third instance of the same defect
inside the mechanism v3 added to prevent it. All three are recorded in the revision log. Read this document only; the earlier versions survive in git history and in
`docs/internal/2026-08-04-auth-channel-review-rounds.md`.

## What this is

cairn's supported way for a site to add its own login channel for a second audience (members,
athletes, boosters) without hand-writing auth crypto. The engine exports one factory,
`createAuthChannel`, that owns every security discipline; the site supplies delivery, roster
lookup, identifier shape, and a bot challenge. Email magic-link stays the zero-config editor
default and the documented primary path. This seam is the supported second channel, not a "choose
your auth" menu.

The driving consumer is the xcathletes team platform (ecxc-ski
`docs/superpowers/plans/2026-07-30-team-platform-pass-1.md`, Task 4). Its requirements are this
spec's floor, with one deliberate deviation recorded below.

## The acceptance test

A site must not be able to write a working channel that is insecure without deliberately bypassing
the factory.

Three config fields carry correctness obligations, stated rather than denied. `normalize` must be
idempotent, canonical per identity, and injective across distinct people (a lossy normalize maps
two members onto one identity and hands out a cross-person budget primitive). `lookup`'s subject
must be stable and canonical per person. And `challenge` must actually verify: the factory cannot
tell a Turnstile `siteverify` call from `async () => true`, and the entire economic bound on
guessing is that function's consequence. The factory enforces what it can (bounds, trimming,
emptiness, that a mint never runs when a challenge fails) and the reference page states the rest,
naming `challenge` as the most load-bearing of the three.

## What the threat shape taught us, and the rule it produced

Three rounds of review failed on the same move. v1 counted failed attempts on a row keyed by the
victim's contact, so an anonymous attacker could exhaust the victim's budget and lock them out
permanently. v2 bound codes to the requesting browser, which fixed that, and reintroduced the
identical defect one step earlier by keying the send budget on the victim's identity. v3 wrote the
rule below to prevent a third instance, and then produced two more anyway: an escalation path with
no result code, which could only resolve as a fail-closed denial, and a live-row cap that pruned by
identity.

The rule, now absolute, with no exception anywhere in the design:

**No control keyed on the victim's identity may deny, delay, or destroy anything. Denial keys on
the requester. Identity-keyed controls either escalate through a channel the site can act on, or
they only log.**

A control keyed on the victim is a denial-of-service primitive handed to anyone who knows a phone
number. v3's mistake was carving out two exceptions and trusting prose to keep them safe. There are
none now. The three consequences worth stating up front, because each one killed an earlier
version:

- **Escalation needs a wire representation or it is a denial.** Both result unions carry
  `challenge-required`. An escalated action returns it without charging an attempt, without
  consuming the pending row, and without failing; the site renders its widget and the member
  retries. A failed challenge on an escalated action returns `challenge-required` again, never a
  hard error, so a member always has a path through.
- **Anything that evicts rows keys on the requester bucket**, so an evictor can only ever destroy
  its own rows.
- **The anti-spam ceiling does not deny.** It logs at error and alerts the operator. Bounding a
  site's SMS spend by refusing a member's login is the trade this whole design exists to refuse.

## Decisions locked

1. **The factory owns the SQL and the schema**, running its own prepared statements against a
   site-supplied D1 binding. The site's own database, never `AUTH_DB`.
2. **Codes are 8 digits by default, clamped 8 to 10** (v3; floor raised from 6 in v3.1). This is
   the deliberate deviation from the consumer's spec'd 6. Six digits is the root cause of every
   hard trade in v1 and v2: at 10⁶ the only way to bound guessing is an aggressive per-identity
   throttle, and every such throttle is a lockout vector. Leaving 6 inside the clamp would have let
   a site take the consumer's original spec and land in exactly the regime this design was rebuilt
   to escape, so the floor is 8. `autocomplete="one-time-code"` and mobile SMS autofill both work
   unchanged.
3. **Codes are bound to the browser that requested them** via a nonce cookie, and `confirm` keys on
   the nonce alone.
4. **`challenge` is required config**, not optional. cairn runs on Cloudflare, where Turnstile is
   free and native, so requiring a bot challenge on an endpoint that spends a site's SMS budget
   costs a developer one function and closes the economics (see Residual risks). This is the
   whole-chain positioning paying off rather than a burden.
5. **Full altitude:** the factory returns SvelteKit actions and owns both cookie writes.
6. **Out of scope, filed to ROADMAP:** migrating the engine's editor default to codes; refactoring
   the editor magic-link flow onto this factory. `magic_token` is untouched.
7. **The consumer proof is a separate pass** (pass 2): the showcase fixture, its D1 plumbing, the
   scaffolder exclusion, and the e2e.

## Surface

One new server-only subpath, `./auth-channel`.

```ts
import { createAuthChannel } from '@glw907/cairn-cms/auth-channel';

const channel = createAuthChannel<App.Platform['env']>({
  resolveDb: (env) => env?.MEMBER_DB,
  deliver: sendOtp,
  lookup: contactToPersonId,
  normalize: normalizeContact,
  challenge: verifyTurnstile,
  cookie: { name: 'member_session' },
});
```

Returns `actions: { request, confirm, logout }`, `resolveSubject(event)`, and
`revokeSessions(db, subject)`.

| Config | Contract |
|---|---|
| `resolveDb(env)` | The channel's D1 binding. Absent fails the action closed with `{error: 'unavailable'}`. |
| `deliver(contact, code, ctx)` | Sends the code. `ctx` carries `{ env, waitUntil }`, which is what lets `devDelivery` refuse at runtime (v2 specified a refusal its own two-argument signature made impossible). A throw is scrubbed, logged, deletes the pending row, and refunds the send charge. |
| `lookup(contact)` | Normalized contact to subject id, or null. A throw is caught, logged as a distinct `lookup_failed` outcome, and treated as a miss. |
| `normalize(raw)` | Identifier shape. Must be idempotent and canonical per identity. Output over 254 characters is invalid. A throw is caught and treated as invalid. |
| `challenge(event, form)` | **Required, and it must genuinely verify.** Awaited before any mint on `request`, and on a `confirm` the factory has escalated. On `request` a false or throwing challenge answers `{error: 'challenge-required'}`, writes no row, calls no `deliver`, and charges nothing. On an escalated `confirm` it answers `{error: 'challenge-required'}` without charging an attempt. It never hard-fails, so a member always has a retry path. |
| `cookie.name` | Base name, through `cookieName`. Names the session cookie and, with a `_pending` suffix, the nonce cookie. A `cairn_`-prefixed base is rejected at construction, since it would collide with the engine's own admin cookies. |
| `verify?(subject)` | Consulted by `resolveSubject` on every resolution. False revokes on the next request. |
| `ttl?` | Clamped overrides, per the Defaults table. |
| `rateLimit?` | Back pressure only, never a security control. |

`devDelivery` logs the code and refuses unless `ctx.env.CAIRN_DEV_BACKEND === '1'`, the same
positive signal `guard.ts` reads. The refusal lives inside its body, so wrapping it
(`deliver: (c, code, ctx) => devDelivery(c, code, ctx)`) does not bypass it. Nothing in `src/lib`
imports `$app/*` and this does not start.

## Storage

The factory exports `CHANNEL_SCHEMA_SQL` and `CHANNEL_SCHEMA_VERSION`, and verifies the deployed
version against a row in `cairn_channel_meta`, caching only a positive result (caching a failure
would let one transient D1 error pin an isolate into refusing every login for its lifetime).

```sql
CREATE TABLE cairn_channel_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- The migration inserts schema_version only. The identity salt is NOT in this constant:
-- a static string published on npm and pinned byte-for-byte by a doc test cannot carry a
-- per-deployment random value. The factory provisions it lazily instead (see below).

CREATE TABLE cairn_channel_code (
  nonce_hash TEXT PRIMARY KEY,
  identity TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  subject TEXT,
  kind TEXT NOT NULL DEFAULT 'code',
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE cairn_channel_session (
  token_hash TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE cairn_channel_budget (
  bucket TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  window_start INTEGER NOT NULL,
  prev_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_cairn_channel_code_identity ON cairn_channel_code (identity);
CREATE INDEX idx_cairn_channel_code_expires ON cairn_channel_code (expires_at);
CREATE INDEX idx_cairn_channel_session_subject ON cairn_channel_session (subject);
CREATE INDEX idx_cairn_channel_session_expires ON cairn_channel_session (expires_at);
CREATE INDEX idx_cairn_channel_budget_window ON cairn_channel_budget (window_start);
```

**The code row is keyed on the nonce alone** (v3). The nonce is a 256-bit server-minted value in an
HttpOnly cookie, so it is already a sufficient and unguessable row key. This removes the second
`lookup` at confirm time that v2 left unspecified, and with it the identity-flip failure mode where
a transient roster error turned a real member into a decoy and answered `expired`.

**Identity is salted**: `hashToken(salt + 's:' + subject)` for a known subject,
`hashToken(salt + 'c:' + contact)` otherwise. v2 used a bare hash, which reverses against a 10¹⁰
phone space in seconds, so the "no PII" and "correlates without identifying" claims were false for
every unknown contact. The salt is per deployment, needs no rotation story, and lives beside the
schema version rather than in a secret store. **The factory provisions it, the migration does
not** (v3.1): on first use it runs one `INSERT OR IGNORE` of 32 random hex under the
`identity_salt` key and reads the row back, so two independently migrated databases hold different
salts. A salt row that is missing after that insert, or a read that throws, fails the action closed
with `{error: 'unavailable'}` rather than defaulting to an empty string, which would silently
revert to v2's rejected unsalted hash. The `'s:'` and
`'c:'` prefixes make a subject-derived and a contact-derived identity non-confusable even when a
site sets subject to an email address.

**Every budget is one atomic conditional upsert** with the window roll inside the statement, and
each charge returns whether it was admitted. v2 left the charges unspecified, so a read-modify-write
implementation would have passed every acceptance criterion while 50 parallel requests all
admitted. Windows are two-bucket sliding (`count` plus `prev_count`), because a single tumbling
window admits twice the cap at its boundary.

**Mint** is a conditional upsert on the nonce row, so the cooldown lives where it can actually fire
(v2 put a cooldown in an `ON CONFLICT` branch that a fresh-nonce-per-request policy made
unreachable, which silently deleted the cooldown). **Consume** is the authorization event, one
statement, mirroring the engine's `consumeToken`:

```sql
DELETE FROM cairn_channel_code
 WHERE nonce_hash = ? AND code_hash = ? AND expires_at > ?
RETURNING subject
```

A session mints only when exactly one row returns and its `subject` is non-null and non-empty.

Sweeps are separate indexed statements, never an `OR`, and cover all three expiring tables
including the budget table, which v2 left to grow one permanent row per distinct probed contact in
the site's own production database.

Each flow opens one `db.withSession('first-primary')` and threads it, so a flow's reads and writes
share a session rather than each store call opening its own. `resolveSubject` is the exception: it
runs on every authenticated request, so it uses the default constraint and accepts replica lag on
the revocation path, with `revokeSessions` documented as taking effect within the replica window.

## Flows

All three actions check origin unconditionally (not gated on `isUnsafeFormRequest`'s content-type
test) and refuse plain http outside localhost outright, mirroring `guard.ts`'s admin rule.

**request** (form field `contact`):

1. Origin and scheme checks; `rateLimit` when configured.
2. `challenge`; false or throw fails closed.
3. `normalize`; invalid returns `{error: 'invalid'}`.
4. `lookup`; derive the salted identity.
5. **Requester suppression**: charge the requester bucket, which is the pair of the client address
   (from `event.getClientAddress()`, IPv6 narrowed to its /64) and the identity. Over cap returns
   `{error: 'throttled'}`. This is the **only** control in the design that denies, and pairing it
   with the identity means one hostile host cannot exhaust a shared venue's wifi bucket for
   everyone (each member is a different key) while still bounding one host against one member.
6. **Identity observation, which never denies**: read the identity's send count. Over the
   anti-spam ceiling, log `auth.channel.ceiling_exceeded` at error so the operator sees an SMS
   pumping attack and can act at the edge. The flow continues. v3 let this ceiling deny, which
   made it an attacker-triggerable lockout sustainable indefinitely for about a dollar a day.
7. Reuse the unexpired `_pending` nonce cookie when present; mint one only when absent or expired.
   Run the conditional upsert. **No returned row means the cooldown held: refund the requester
   charge**, answer `{sent: true}`, send nothing. Minting a new nonce prunes the **requester
   bucket's** own oldest rows to the live-row cap, never the identity's, so an evictor can only
   destroy rows it created.
8. Deliver, only for a known subject, through `waitUntil` with `.catch()` attached first.

There is no request-side escalation. `challenge` already runs unconditionally at step 2, so a
"demand a fresh challenge" step there was either a no-op or a second verification of a single-use
token that fails closed. v3 specified exactly that, which is v2's unreachable-branch defect wearing
new clothes.

Every input writes a row: an unknown contact gets a decoy (`subject` NULL, a code hash over a
discarded random value) so store state, timing, and failure modes are uniform. Failures downstream
of `lookup` answer `{sent: true}`; input-independent faults (binding absent, schema mismatch)
answer `{error: 'unavailable'}`, since reporting those leaks nothing and v2's blanket uniformity
would have let a site with a forgotten binding tell every member "we sent it" forever.

Return: `{sent: true} | {error: 'invalid' | 'throttled' | 'challenge-required' | 'unavailable'}`.

**confirm** (form field `code` only; `contact` is not submitted):

1. Origin and scheme checks; `rateLimit` when configured.
2. Canonicalize: strip non-digits, then require exactly the configured length. Malformed returns
   `{error: 'bad-code'}` without touching attempts, so an autofilled `1234 5678` costs nothing.
3. Read the `_pending` nonce cookie. Absent returns `{error: 'no-pending-request'}`, which leaks
   nothing about the roster (it is a statement about the requester's own browser, evaluated before
   any store access) and gives a cookie-blocked or cross-browser member an exit instead of an
   endless `bad-code` loop.
4. Read the row by nonce hash, filtered on `expires_at > now`. No row returns `{error: 'expired'}`.
5. **Identity failure gate**, checked before the compare and charged on every failed compare (not
   only after a row locks, which is where v3 put it and why it gated nothing): over the threshold,
   return `{error: 'challenge-required'}` without charging an attempt and without consuming the
   row. The site's confirm form renders its widget and the member retries; the factory then awaits
   `challenge` on that retry. A challenge that fails returns `challenge-required` again rather than
   a hard error, so a member under attack faces friction, never a wall.
6. Increment and read in one statement. The returned `attempts` is post-increment, so the cap check
   is `attempts > cap`, admitting exactly `cap` real guesses.
7. Over the cap returns `{error: 'locked'}` without comparing.
8. The conditioned `DELETE ... RETURNING subject` is the sole authority on whether the code was
   right, matching the hash inside the statement. Do not precede it with a separate compare, which
   invites an implementer to resolve the redundancy by making the delete unconditional. A returned
   non-null, non-empty subject mints the session, clears the nonce cookie, and returns
   `{ok: true}`.

Return: `{ok: true} | {error: 'bad-code' | 'expired' | 'locked' | 'throttled' | 'challenge-required' | 'no-pending-request' | 'unavailable'}`.

A re-mint on a reused nonce resets `attempts` to zero, so a member who locks a code has an exit
after the cooldown rather than waiting out the full TTL; the cumulative bound is the identity
failure gate, which is why that gate has to work. `logout` also clears the `_pending` cookie, and a
successful `confirm` deletes any session row named by an incoming session cookie, so neither leaves
an orphan.

**logout** — origin check, delete by token hash, clear the cookie.

**resolveSubject(event)** — read the cookie, hash, select the unexpired row, call `verify` when
configured, return the subject or null. **`revokeSessions(db, subject)`** deletes every session for
a subject; the guide's roster-removal exemplar calls it.

**Cookies, enumerated** (v2 named the session cookie's attributes only as "the full set", which a
test could satisfy while shipping without `HttpOnly`):

| Cookie | Attributes |
|---|---|
| `<name>` (session) | `path: '/'`, `httpOnly: true`, `secure` (from `url.protocol`), `sameSite: 'lax'`, `maxAge` from the session TTL, `__Host-` prefix on https |
| `<name>_pending` (nonce) | the same set, `maxAge` from the code TTL |

Whenever the name carries `__Host-`, the response carries `Secure`. A browser silently discards a
`__Host-` cookie set without it, which would present as a total login outage reading "the code
doesn't work".

## Defaults and clamps

| Parameter | Default | Clamp |
|---|---|---|
| Code length | 8 digits, zero-padded, rejection-sampled | 8 to 10 |
| Code TTL | 10 min | at most 15 min |
| Attempt cap (per code row) | 5 | at most 10 |
| Resend cooldown (per nonce; UX only, see Residual risks) | 60 s | at least 30 s |
| Requester sends per hour (per address-and-identity bucket) | 20 | 5 to 100 |
| Identity send ceiling (logs only, never denies) | 30 per hour | at least 10 |
| Identity failure escalation threshold (returns `challenge-required`) | 20 per hour | at least 10 |
| Live rows per requester bucket | 5 | at most 20 |
| Session TTL | 30 days (xcathletes passes 90) | at most 1 year |

## Delivery

Delivery runs through `waitUntil` so the provider round trip never shapes response timing. Read
`platform.ctx?.waitUntil` first with `platform.context?.waitUntil` as the legacy fallback (the
adapter marks `context` deprecated, and a silent fall-through would quietly reinstate the oracle on
a dependency bump). Attach `.catch()` before handing the promise over: under `vite dev` and
`vite preview` the emulated `waitUntil` is a **no-op that discards the promise**, so an orphaned
rejection terminates the preview server under Node. The inline-await branch exists only for a
runtime with no platform at all, which is the unit-test environment; it logs
`auth.channel.delivery_inline` at warn.

A delivery failure deletes the pending row **and refunds the send charge**, so a provider outage
neither strands the member behind a cooldown nor burns their escalation budget.

## Logging

Twelve events: `auth.channel.requested`, `.send_failed`, `.delivery_inline`, `.confirmed`,
`.locked`, `.escalated`, `.ceiling_exceeded`, `.session.created`, `.session.destroyed`, plus the
rate-limit trio, all added to the closed `CairnLogEvent` union in `src/lib/log/events.ts`.

The correlation id is the first 16 hex of the **salted** identity hash, long enough that it does
not collide across a roster. `auth.channel.requested` is emitted for every outcome with the outcome
in a field (`delivered`, `unknown`, `cooldown`, `challenge_failed`, `suppressed`, `lookup_failed`),
so the record's *existence* carries no roster signal and an operator can still alert on
`ceiling_exceeded` and `lookup_failed`. The record's *content* does distinguish a known contact
from an unknown one, deliberately, because an operator needs it. Channel logs are therefore safe to
retain and query, and are not safe to paste somewhere the roster is not already known. `send_failed` logs a
scrubbed, length-capped error, never a raw provider message: Twilio and Resend both embed the
recipient in their error strings.

## Residual risks, named

These are accepted, not solved, and the security-model page states each one.

- **Guessing is bounded economically, not absolutely.** With 8 digits and a 20-failure hourly
  gate, an attacker gets about 43,200 free guesses per member per 90-day season against 10⁸, which
  is **0.043% per targeted member**. The number that matters operationally is the roster
  aggregate: across 200 members that is a **~8.3% chance of at least one account falling per
  season**. Beyond the free tier every guess needs a solved challenge, and at commodity
  captcha-farm rates the expected marginal cost per compromised account is around six figures. Note
  precisely what that figure bounds: it is the cost of guessing *faster* than the free rate, not
  the cost of the attack. An attacker who stays in the free tier pays nothing and accumulates
  linearly. A site wanting a stronger bound raises the code length to 10, which moves the roster
  aggregate to about 0.08%.
- **The clamp floor matters.** These numbers hold at 8 digits or more, which is why the floor is 8
  rather than the consumer's original 6. At 10⁶ the same free tier gives roughly 4.3% per member
  per season and a 200-member roster is close to certain to lose an account.
- **An attacker who knows a contact can force a member to solve a captcha.** That is the honest
  cost of escalation, and it is the price of never denying: friction the member can pass through,
  rather than a wall they cannot.
- **An attacker can spend a site's SMS budget** by pumping requests at one number. Nothing denies
  this, deliberately, because denying it means denying the member. The engine logs
  `ceiling_exceeded` at error; the response is an operator one, at the edge or with the provider.
- **A 6-to-10-digit code hashed at rest is a speed bump, not a protection.** Read-only database
  exposure recovers live codes. The mitigations are the 10-minute TTL and session binding, which
  make a recovered code useless in another browser.
- **SMS is a restricted authenticator under NIST SP 800-63B.** A site choosing it owes its members
  that disclosure; the guide says so.
- **A member must confirm in the browser that requested.** This is what makes a code stolen in
  transit useless to the thief, and it costs the cross-device flow.
- **The Cloudflare rate-limit binding is back pressure only** (10 or 60 second periods, per-colo,
  eventually consistent), which the engine's own `rate-limit.ts` already says. **The per-nonce
  resend cooldown is UX only**: nonces are client-cleared at will, so an attacker never meets it.
  It bounds accidental double submission and nothing else.
- **Sessions are unbounded per subject and never rotated.** `revokeSessions` is all-or-nothing.
- **A member removed from the roster between request and confirm still gets a session**, since
  confirm deliberately runs no second lookup. Bounded by the code TTL and cured by `verify`.
- **On a multi-contact site the shared identity budget links contacts.** Exhausting the budget via
  one contact and observing a second contact's throttle state proves both belong to one member and
  both are on the roster. Sites with one contact kind per member are unaffected.
- **A shared-NAT venue can exhaust its own requester buckets**, and a CGNAT neighbour shares an
  address with strangers. The requester bucket pairs address with identity to soften this.
- **Read-replica lag affects session creation as well as revocation** when a site enables D1 read
  replication: a member can complete `confirm` and have the next `resolveSubject` miss the row.
  Carry the D1 session bookmark in the cookie, or leave replication off on this database.

## Testing (this pass)

Unit and integration against real miniflare D1, on a **second** binding in `wrangler.test.jsonc` so
the physical-separation decision is proven rather than contradicted.

Beyond the per-task criteria: every throttle is tested for the lockout property, meaning a test
asserts that an attacker's requests and confirms against a victim's contact never prevent the
victim from completing a login. Concurrency criteria on mint, consume, and both budget charges.
Confirm's error responses are deep-equal between a decoy identity and a real one across
`bad-code`, `locked`, and `expired`, with identical store-state effects, since the v1 critical was
a confirm-side leak and v2's regression test sat on the request endpoint.

## Documentation

Reference page, guide, and the ten log events, per the plan's Tasks 6 and 7.

### The security model is a published document (Geoff, 2026-08-04)

The disciplines here are worth nothing to a developer who cannot see why they exist, and a reader
who wants to improve the model needs a way in. So the model ships as
`docs/explanation/auth-channel-security-model.md`, maintained by later passes like any other doc.

It carries the trust boundary; the rule this design was built from (deny on the requester, escalate
on the identity); a threat catalogue with one entry per attack naming the mechanism and **the test
that proves it**; the residual risks above with their numbers; and a how-to-propose-a-change
section stating the acceptance test any proposal must still pass and the standing instruction that
a change to this model earns an adversarial round before implementation.

`docs/internal/2026-08-04-auth-channel-review-rounds.md` records all three rounds, including what
was rejected and why, so a later reviewer does not re-litigate settled ground. It is the raw
material the explanation page distills.

## Revision log

**v1 rejected** by two independent reviewers. Criticals: an unauthenticated permanent account
lockout via the per-code attempt counter; a two-request roster oracle in `confirm`; brute-force
math that did not close. Plus a non-atomic consume, an unimplementable subject binding, an
OTP-readback route the scaffolder would have shipped into every generated site, and three wrong
platform claims (`waitUntil` in dev, the deprecated `context` alias, `$app/environment` in
`src/lib`).

**v2 rejected** by the verification round. It fixed the consume, the platform claims, and the
confirm oracle's store-state half, and then moved the lockout onto the per-identity send budget,
left the attempt cap resettable by requesting a fresh nonce, charged the failure budget only after
lockout and gated nothing on it, specified a cooldown in a branch that could never fire, and
specified a `devDelivery` refusal its own `deliver` signature made impossible.

**v3 changes**: 8-digit codes (Geoff's call, deviating from the consumer spec); the
deny-on-requester rule applied to every throttle; required `challenge`; the code row keyed on the
nonce alone with `contact` dropped from confirm; salted identities; atomic sliding-window budget
charges; nonce reuse so the cooldown can fire; the three-argument `deliver` signature; the budget
table swept and indexed; a meta table; both cookies' attributes enumerated; `no-pending-request`
and `unavailable` added to the unions; the `lookup_failed` log outcome; send-charge refund on
delivery failure; unconditional origin checks; and a named residual-risk list replacing v2's
overclaimed "decades" arithmetic.

**v3 was rejected** by the third round, which found the defect a third time inside the mechanism v3
added to prevent it. Escalation had no wire representation, so on `request` it was a no-op (the
challenge already ran unconditionally) and on `confirm` it could only resolve as a fail-closed
denial keyed on the victim; the plan's own acceptance criterion required it to be inert. The
live-row cap pruned by identity, and because nonce reuse means legitimate users rarely mint a new
nonce, pruning fired almost only for cookie-clearing attackers and deleted almost only legitimate
rows. The absolute send ceiling denied on the identity, sustainable indefinitely for roughly a
dollar a day per victim. `challenge` was required as config but absent from the obligations list,
so `challenge: () => true` was a working insecure channel written through the factory. And the salt
could not be per-deployment while living in a static constant a doc test pins byte-for-byte.

**v3.1 changes**: the rule is now absolute, with no identity-keyed denial anywhere;
`challenge-required` added to both unions with the escalated path fully defined (no attempt
charged, no row consumed, a failed challenge retries rather than failing); request-side escalation
deleted as structurally redundant; the send ceiling downgraded to an error-level log; row eviction
re-keyed on the requester bucket; the requester bucket paired with the identity so a shared venue
is not one bucket; the code-length clamp floor raised to 8; the salt provisioned lazily by the
factory with a fail-closed absent case; the failure gate charged on every failed compare rather
than only after lockout; the requester charge refunded when the cooldown holds; `attempts` reset on
re-mint specified; `challenge` added to the config obligations; the compare folded into the
conditioned delete; twelve log events rather than a miscounted ten; the correlation prefix pinned
at 16 hex; logout clearing the nonce cookie and confirm clearing an orphan session; and the
residual-risk list rewritten with both arithmetic branches, the roster-aggregate figure, the
6-digit case, the captcha-friction cost, and the replica-lag interaction on session creation.
