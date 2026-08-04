# Design: `createAuthChannel`, the second-audience login factory

Date: 2026-08-03. Status: approved design, pre-plan. Author: Fable sitting with Geoff; execution
runs from the implementation plan this spec feeds. Supplements the functional spec
(`2026-05-28-cairn-rebuild-functional-spec.md`), which is unchanged; nothing here touches the
editor magic-link flow it locks.

## What this is

cairn's supported way for a site to add its own login channel for a second audience (members,
athletes, boosters) without hand-writing auth crypto. The engine exports one factory,
`createAuthChannel`, that owns every security discipline; the site supplies delivery, roster
lookup, and identifier shape, none of it security-relevant. Email magic-link stays the zero-config
editor default and the documented primary path. This seam is the supported second channel, not a
"choose your auth" menu.

The driving consumer is the xcathletes team platform (ecxc-ski
`docs/superpowers/plans/2026-07-30-team-platform-pass-1.md`, Task 4), whose requirements are this
spec's acceptance floor. The seam lands before that task runs, so the consumer builds on the
factory instead of hand-writing `otp.ts`/`sessions.ts`/`transport.ts`. The family precedents it
retires are ASC's two hand-rolled copies (`src/member-auth/lib/crypto.ts`, waitlist-offer tokens),
both carrying comments saying they reimplemented because no supported surface existed.

## The acceptance test

A site must not be able to write a working channel that is insecure without deliberately bypassing
the factory. Every decision below serves that test. The corollary at the type level: nothing in the
site-supplied config is security-relevant.

## Decisions locked (Geoff, 2026-08-03)

1. **The factory owns the SQL and the schema.** cairn ships the schema; the factory runs its own
   prepared statements against a site-supplied D1 binding. The site's own database, never
   `AUTH_DB`; the two stores stay physically separate. A site-implemented store interface was
   rejected because the hardest disciplines (atomic consume, one-live-code, lockout) are SQL
   shapes, and an interface makes them conventions a site can get wrong.
2. **Code only at v1.** The credential is a 6-digit one-time code for every delivery kind. Modern
   practice favors codes over links for second-audience channels (cross-device, immune to
   email-scanner prefetch, SMS-native, mobile autofill), and the live consumer amended its own
   requirements to a uniform code flow. The config reserves a credential-kind field so `'link'`
   can join as a later minor without breaking the surface. Consumer sites change as needed to
   adopt the code shape; ASC's member retrofit adopts codes on ASC's own clock.
3. **Full altitude: the factory returns SvelteKit actions and owns the cookie write.** If the site
   sets its own session cookie, it can ship a working channel missing `HttpOnly` or `__Host-`
   without bypassing anything, which fails the acceptance test. So the factory operates where
   `createSectionAction` does and the cookie never leaves it.
4. **Out of scope, filed to ROADMAP:** migrating the engine's own editor default to codes (opened
   by the best-practice ruling, a separate initiative), and refactoring the editor magic-link flow
   onto this factory. `magic_token` is untouched; its long opaque token needs no attempt counter.

## Surface

One new server-only subpath, `./auth-channel`, beside `./auth-crypto` and `./auth-store`. Neither
existing barrel admits it: their boundary comments exclude flows and factories, correctly.

```ts
import { createAuthChannel, devDelivery } from '@glw907/cairn-cms/auth-channel';

const channel = createAuthChannel<App.Platform['env']>({
  resolveDb: (env) => env?.MEMBER_DB,
  deliver: sendOtp,            // site transport: Twilio, Resend, routed by contact kind
  lookup: contactToPersonId,   // normalized contact -> subject id | null, site roster
  normalize: normalizeContact, // raw input -> canonical contact | null (E.164, lowercased email)
  cookie: { name: 'member_session' },
});
```

The factory returns:

- `actions: { request, confirm, logout }` — SvelteKit form actions the site spreads into its login
  page's `export const actions`.
- `resolveSubject(event): Promise<string | null>` — the session check for the site's route guards.
  Reads the cookie, resolves the hashed session row, returns the subject id. The site joins the
  subject to its own roster; xcathletes' `sessionPerson` is a thin site wrapper over this.

Site-supplied config, in full:

| Field | Contract |
|---|---|
| `resolveDb(env)` | The channel's D1 binding. Undefined or null fails the action closed (the `createSectionAction` precedent). |
| `deliver(contact, code)` | Sends the code. A throw is logged as `auth.channel.send_failed`; the response stays uniform. Dispatched via `waitUntil` (see Disciplines). |
| `lookup(contact)` | Normalized contact to subject id, or null for unknown. The factory guarantees unknown answers identically and mints nothing. |
| `normalize(raw)` | Identifier shape. Null means malformed, which returns `{error: 'invalid'}`; shape validity is public knowledge, not an oracle. |
| `cookie.name` | Base name, run through the existing `cookieName` builder, which applies the `__Host-` discipline and rejects prefixed or malformed bases. The `cairn_` namespace stays reserved to the engine. |
| `kind` | Credential kind. Only `'code'` is valid at v1; the field exists so `'link'` can arrive as a minor. Defaults to `'code'`. |
| `ttl?` | Optional overrides, clamped (see Disciplines): `code`, `session`, `attempts`, `resendCooldown`. |
| `rateLimit?` | Optional volumetric limit mirroring `SectionActionConfig.rateLimit` exactly: `{ resolve(env), key?(event), message? }`, default key = client IP, degrade-to-open. Applied to `request` and `confirm`. |

Every type the surface names is exported from the subpath (`AuthChannel`, `AuthChannelConfig`,
`ChannelRequestResult`, `ChannelConfirmResult`, the re-exported `RateLimitLike`), per the
`check:snippets` lesson from the xcathletes seams pass.

`devDelivery` is the shipped dev transport: it logs the code (contact included, the one permitted
PII echo, dev only) so the local loop and the e2e run without a provider. Construction throws when
`devDelivery` is configured outside dev (read from `$app/environment`), which is xcathletes Gate 1
("production refuses to boot with the dev transport") enforced in the engine rather than by site
convention.

## Storage

The factory owns two tables on the site's database. The guide carries the canonical SQL block; the
site copies it into its own migrations directory and applies it with wrangler, the same motion as
every cairn site's `AUTH_DB` setup. Timestamps are epoch milliseconds, matching `0000_auth.sql`.

```sql
CREATE TABLE cairn_channel_code (
  contact TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL,
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

CREATE INDEX idx_cairn_channel_session_subject ON cairn_channel_session (subject);
```

The schema is itself a discipline carrier:

- `contact` as primary key makes one-live-code-per-contact structural. Minting is the engine's
  delete-then-insert batch shape (`issueToken` precedent), which also sweeps expired rows.
- Only hashes are stored. The code table stores `hashToken(code)`; the session table stores
  `hashToken(token)` while the cookie carries the raw token. Hashing the session token is one
  discipline stronger than the engine's own editor `session` table.
- The session table stores the subject id, never the contact, so session rows carry no PII.
- Verification is one statement: `UPDATE cairn_channel_code SET attempts = attempts + 1 WHERE
  contact = ? AND expires_at > ? RETURNING code_hash, attempts`, followed by a constant-time
  `tokensMatch` compare. Consume on success is a single `DELETE`. Session creation sweeps expired
  session rows in the same batch (the engine's no-cron pattern).

A pepper (HMAC with a Worker secret) was considered and rejected: an attacker who can read this D1
can also write it, and writing a session row defeats any at-rest scheme, so the pepper buys
nothing. Plain `hashToken` (SHA-256) matches the engine and the peer systems.

## Flows

All three actions verify request origin themselves, fail closed, reusing the engine guard's origin
discipline (internal share, not a new export). SvelteKit's `checkOrigin` is an active deprecation
(kit#15992, under watch), so the factory leans on nothing from it.

**request** — form field `contact`.

1. Origin check; volumetric rate limit when configured (degrade-to-open; blocked returns
   `{error: 'throttled'}`).
2. `normalize`; null returns `{error: 'invalid'}`.
3. `lookup`; unknown contact returns `{sent: true}` with no mint and no delivery call, byte-identical
   to the known-contact response.
4. Cooldown, silent: a code row for this contact younger than the resend cooldown returns
   `{sent: true}` and sends nothing. A `throttled` error here would be an enumeration oracle
   (only known contacts have rows, so only they could answer throttled); the cooldown therefore
   never speaks. The site's UI runs its own client-side resend timer, and the `throttled` error
   comes only from the IP-keyed volumetric limit, which carries no roster signal.
5. Mint: 6 digits from `crypto.getRandomValues`, hash at rest, delete-then-insert batch.
6. Deliver via `event.platform.context.waitUntil` when present (production), awaited inline in dev.
   The response never waits on the provider, so response timing does not distinguish known from
   unknown contacts (the residual delta is one D1 batch, single-digit milliseconds; the real
   oracle was the provider round trip). A delivery throw logs `auth.channel.send_failed`; the
   response has already answered `{sent: true}`.

Return shape: `{sent: true} | {error: 'invalid' | 'throttled'}`.

**confirm** — form fields `contact`, `code`.

1. Origin check; rate limit when configured.
2. `normalize`; null returns `{error: 'bad-code'}` (no shape oracle on the confirm step).
3. One-statement attempt increment with `RETURNING`; no live row returns `{error: 'expired'}`.
4. Attempts over the cap returns `{error: 'locked'}` without comparing.
5. Constant-time compare; mismatch returns `{error: 'bad-code'}`.
6. Match: single `DELETE` consume, mint session (`generateToken`, hash at rest, sweep expired in
   the same batch), set the cookie (`HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, `__Host-` on
   https; `secure` derived the same way the engine guard derives it), return `{ok: true}`.

Return shape: `{ok: true} | {error: 'bad-code' | 'expired' | 'locked' | 'throttled'}`. The
`throttled` member extends the consumer spec's union by one value, for the volumetric limit on
`confirm`; without it a rate-limited verify would have to lie as `bad-code`.

**The lockout is per-code, never per-account.** Five failed entries kill that code; the member
requests a fresh one after the cooldown, which replaces the row and resets the count. Nobody is
locked out of an account by mistyping, and the brute-force math holds because each code is a fresh
uniform draw behind the cooldown and the volumetric limit. This matches better-auth and Twilio
Verify behavior. The UI can act on `'locked'` by offering the resend.

**logout** — origin check, delete the session row by token hash, clear the cookie, `{ok: true}`.

**resolveSubject(event)** — read the cookie, hash, select the unexpired session row, return
`subject` or null. No sliding renewal: expiry is absolute (simpler, and revocation stays one row
deletion), per the consumer spec's 90-day fixed sessions.

Post-login navigation stays site-owned: `confirm` returns data and the site's page redirects where
it wants. Turnstile also stays site-owned: a site wraps `actions.request` with its fail-closed
check before delegating (the ecxc registration precedent); the factory's own throttles run
regardless.

## Defaults and clamps

| Parameter | Default | Clamp |
|---|---|---|
| Code TTL | 10 min (consumer spec; SMS carrier latency argues for 10 over 5) | at most 15 min |
| Attempt cap | 5 | at most 10 |
| Resend cooldown | 60 s | at least 30 s |
| Session TTL | 30 days (engine parity; xcathletes passes 90) | none |
| Code length | 6 digits | fixed |

An override cannot quietly disable a discipline: the clamps reject, at construction, values outside
the bounds.

## Logging

New events extend the existing vocabulary and land in `docs/reference/log-events.md` in the same
pass: `auth.channel.requested`, `auth.channel.send_failed`, `auth.channel.confirmed`,
`auth.channel.locked`, `auth.channel.session.created`, `auth.channel.session.destroyed`, plus the
rate-limit trio mirroring the section-action names (`auth.channel.rate_limit_absent`,
`auth.channel.rate_limit_failed`, `auth.channel.rate_limited`).

Unlike the editor events, channel events never carry the contact (the consumer's no-PII gate).
Each carries a short hash prefix (first 8 hex of `hashToken(contact)`) for correlation. The
operator guide carries the correlation one-liner (hash a known contact locally, grep the prefix),
so "a member says they can't log in" stays a two-minute question. `devDelivery`'s local code echo
is the sole, dev-only exception.

## External benchmark (verified 2026-08-03)

The design matches or exceeds NIST 800-63B-derived guidance and the library peers (better-auth
email-OTP, Supabase OTP, Twilio Verify) on every shared discipline: 6-digit CSPRNG codes, TTL
inside the ≤10-minute norm, attempt cap in the strict zone (peers run 3 to 5), single-use consume,
hash at rest, enumeration resistance, opaque hashed session tokens. Two gaps the comparison
surfaced are folded in above: the volumetric rate limit (SMS-pumping fraud; peers treat it as
first-class) and `waitUntil` delivery (closing the provider-latency timing oracle). No server
secret exists anywhere in the design, which is one less rotation story than better-auth requires.

## Testing

Unit and integration against real miniflare D1, matching the engine's auth tests: expiry, lockout
at the cap and per-code recovery after re-request, cooldown, unknown-contact opacity (identical
body, no row, no delivery call), silent-cooldown opacity (identical body, no second send),
single-use consume, session round-trip, cookie attributes on both
schemes, origin refusal, dev-transport refusal outside dev, clamp rejection at construction,
rate-limit degrade-to-open and blocked paths, no contact PII in any emitted log record.

The showcase gains a small member-login fixture built from the xcathletes Task 4 shapes (per the
fixture-inputs rule: consumer sources, not invented ones), using `devDelivery`, giving the e2e a
full request, confirm, guarded-page loop against the built package.

## Documentation

- New reference page `docs/reference/auth-channel.md`; `docs/reference/log-events.md` gains the
  channel rows.
- New guide `docs/guides/add-a-login-channel.md`: the canonical schema SQL block, the Turnstile
  wrap pattern, the `autocomplete="one-time-code"` input note (mobile SMS autofill), the client-side
  resend-timer note (the cooldown is deliberately silent server-side), the operator
  correlation one-liner, and the plain statement that email magic-link stays the default and this
  is the supported second channel.
- Changelog under `## Unreleased` (additive; no `Consumers must:` line).
- ROADMAP: mark the Now-tier auth-seam entry shipped at pass end; file the editor-default-to-codes
  question as a new entry.
- Gates: the full list from `.github/workflows/test.yml`, pasted not retyped, including all four
  CI-only checks (`check:comments`, `check:reference:signatures`, `check:surface` with the
  regenerated snapshot committed, `check:snippets`). This pass adds an export subpath, so
  `check:snippets` and `check:package` are the ones most likely to bite.
