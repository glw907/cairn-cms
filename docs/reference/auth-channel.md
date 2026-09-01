# Auth channel (`@glw907/cairn-cms/auth-channel`)

This subpath holds `createAuthChannel`, a factory for a site's own second-audience login channel:
an 8-digit-by-default OTP code, requested and confirmed over any transport the site's own `deliver`
function sends (SMS, email, or another channel), backed by the site's own D1 binding rather than
`AUTH_DB`. It is server-only surface (no `svelte` export condition), for a site building a login
flow for an audience other than cairn editors: members, athletes, boosters, or any roster the
engine's own owner/editor auth was never meant to model.

This subpath carries the second-audience login discipline the factory owns: code generation and
canonicalization, identity derivation and salting, the atomic budget and lockout mechanics,
session issuance and revocation, and the D1 schema underneath all of it. The email magic-link
stays the zero-config default and the documented primary path for cairn editors. A general-purpose
auth primitive with no bearing on this discipline stays out. See [the security
model](../extend/auth-channel-security-model.md) for the threat catalogue and the rule this
design is built from: no control keyed on the victim's identity may deny, delay, or destroy
anything.

```ts
import { createAuthChannel } from '@glw907/cairn-cms/auth-channel';
```

## Building a channel

### `createAuthChannel`

Stability tier: Extension API.

```ts
declare function createAuthChannel<Env>(config: AuthChannelConfig<Env>): AuthChannel<Env>;
```

Build a second-audience login channel: request, confirm, and logout actions, session resolution,
and roster-removal revocation, all backed by the D1 binding `config.resolveDb` names. Construction
validates every clamp in [Defaults and clamps](#defaults-and-clamps), the required `challenge`, the
`kind` restriction, and the cookie-name discipline, throwing an `Error` on any misconfiguration
before serving any request.

`Env` does not infer from `resolveDb`'s parameter alone; annotate it explicitly, as the example
below does, or it collapses to `{}` and every downstream binding read stops typechecking usefully.

```ts
import { createAuthChannel } from '@glw907/cairn-cms/auth-channel';
import { verifyTurnstile } from '@glw907/cairn-cms/cloudflare';
import type { D1Database } from '@cloudflare/workers-types';

interface Env {
  MEMBER_DB?: D1Database;
  TURNSTILE_SECRET?: string;
}

declare function sendOtp(
  contact: string,
  code: string,
  ctx: { env: Env | undefined; waitUntil: (promise: Promise<unknown>) => void },
): Promise<void>;
declare function contactToPersonId(contact: string, ctx: { env: Env | undefined }): Promise<string | null>;
declare function normalizeContact(raw: string): string;

const channel = createAuthChannel<Env>({
  resolveDb: (env) => env?.MEMBER_DB,
  deliver: sendOtp,
  lookup: contactToPersonId,
  normalize: normalizeContact,
  challenge: (event, form) =>
    verifyTurnstile(String(form.get('cf-turnstile-response') ?? ''), event.platform?.env?.TURNSTILE_SECRET ?? ''),
  cookie: { name: 'member_session' },
});
```

`config`'s fields:

- **`resolveDb(env)`**: the channel's own D1 binding, read off the platform env. Never `AUTH_DB`: a
  second audience's roster and sessions live in their own database, physically separate from the
  engine's own editor store. An action whose binding resolves to `undefined`, or whose schema
  version does not match the schema the packaged migration installs (see [Storage](#storage)),
  answers `{error: 'unavailable'}` without touching a row.
- **`deliver(contact, code, ctx)`**: sends the code to `contact`. `ctx` carries `{ env, waitUntil }`;
  `waitUntil` is Cloudflare's background-task hook (`platform.ctx.waitUntil`, with the deprecated
  `platform.context.waitUntil` as a fallback), or a no-op when neither is present, in which case
  `request` awaits `deliver` inline and logs
  [`auth.channel.delivery_inline`](./log-events.md). A throw is caught. The error is scrubbed
  before logging (every occurrence of `contact` redacted, the message capped at 300 characters),
  the pending code row is deleted, and the requester's send charge is refunded, so a provider
  outage costs a member nothing but a retry.
- **`lookup(contact, ctx)`**: normalized contact to subject id, or `null` for an unknown contact.
  `ctx` carries `{ env }`, the resolved platform env and nothing else, so a roster read reaches its
  own binding. The returned subject must be stable and canonical per person (see [Config
  obligations](#config-obligations)). A throw is caught, logged as the distinct `lookup_failed`
  outcome on [`auth.channel.requested`](./log-events.md), and treated the same as an unknown
  contact. Don't read request-shaped data here: this callback decides subject-versus-decoy, and a
  verdict the requester can influence makes roster membership requester-controlled.
- **`normalize(raw)`**: identifier shape. Must be idempotent, canonical per identity, and injective
  across distinct people (see [Config obligations](#config-obligations)). Pure and synchronous,
  unlike every other config function here. Output over 254 characters, or a thrown error, answers
  `{error: 'invalid'}`.
- **`challenge(event, form)`**: the bot challenge, required, and the most load-bearing of the three
  correctness obligations (see [Config obligations](#config-obligations)). `event` is a
  [`CairnEvent`](#types), which every real SvelteKit `RequestEvent` satisfies. Awaited before any
  code is minted on `request`, and on
  a `confirm` whose identity has crossed the escalation threshold. A `false` return or a thrown
  error never hard-fails: `request` answers `{error: 'challenge-required'}` with no row written
  and no `deliver` call; an escalated `confirm` answers `{error: 'challenge-required'}` with no
  attempt charged and no row consumed, so a member always has a retry path.
- **`cookie.name`**: the session cookie's base name, through
  [`cookieName`](./auth-crypto.md#cookiename); the same base plus a `_pending` suffix names the
  nonce cookie. A `cairn_`-prefixed base throws at construction, since it would collide with the
  engine's own admin cookies.
- **`verify?(subject, ctx)`**: consulted by `resolveSubject` on every resolution, with the same
  `{ env }` context `lookup` receives. A `false` return revokes the session on the spot (deletes the
  row and answers `null`); a thrown error refuses the resolution (answers `null`) without touching
  the row, so a transient roster-backend outage can't mass-revoke every session. Don't read
  request-shaped data here either: a `false` destroys the session row, on every authenticated
  request.
- **`kind?`**: reserved for a future authenticator kind. Only `'code'` is implemented; any other
  value throws at construction.
- **`limits?`**: clamped overrides in three groups (`code`, `throttle`, `session`); see [Defaults
  and clamps](#defaults-and-clamps). Every group and every field is optional, so tuning one knob
  names one knob. An out-of-range or non-integer override throws at construction, naming the group,
  the field, and its bound.
- **`rateLimit?`**: optional back pressure, never a security control; see [Rate
  limiting](#rate-limiting).

`AuthChannel<Env>`, the return value, carries `actions: { request, confirm, logout }` (each a
SvelteKit action handler for the named form), `resolveSubject(event)` (read the session cookie and
return the resolved subject, or `null` when absent, expired, or refused by `verify`), and
`revokeSessions(db, subject)` (delete every session for a subject; a roster-removal handler's own
call). See [Types](#types) for each result union's exact shape.

Two signature notes. `request` and `confirm` need `getClientAddress()` alongside the `CairnEvent`
members, because the requester bucket keys on the client address; `logout` and `resolveSubject`
take the bare `CairnEvent`, so your own session helper can declare `(event: CairnEvent<Env>)`.
`revokeSessions` takes a binding rather than an event, deliberately: it is the one member callable
outside a request, from a roster-archive path, a cron trigger, or a queue consumer that has a `db`
and no event to resolve one from.

## Config obligations

Three config fields carry correctness obligations the factory cannot itself verify. `normalize`
must be idempotent, canonical per identity, and injective across distinct people: a lossy
`normalize` maps two people onto one identity and hands out a cross-person rate-limit and session
budget. `lookup`'s returned subject must be stable and canonical per person. `challenge` is the
most load-bearing of the three: the factory awaits its return value and treats a truthy result as a
passed check, with no way to distinguish a real Turnstile `siteverify` call from `async () => true`,
and the whole economic bound on guessing a code (see [the security
model](../extend/auth-channel-security-model.md)) is `challenge`'s consequence.

## Defaults and clamps

Every group and every field below is optional on `config.limits` and independently clamped; an
out-of-range or non-integer override throws at construction. A non-positive value always throws,
even where the clamp states only a ceiling. The groups are what a site tunes together, so a single
change stays a single knob:

<!-- snippet-check-skip: illustrates the limits member in isolation; the worked example above shows a full createAuthChannel call -->

```ts
const channel = createAuthChannel<Env>({
  // ...
  limits: { session: { ttlMs: 90 * 24 * 60 * 60 * 1000 } },
});
```

| `limits` field | Meaning | Default | Clamp |
| --- | --- | --- | --- |
| `code.length` | Digits per code | 8 | 8 to 10 |
| `code.ttlMs` | Code lifetime, in ms | 600000 (10 minutes) | at most 900000 (15 minutes) |
| `code.attemptCap` | Wrong-guess cap per code row | 5 | at most 10 |
| `throttle.cooldownMs` | Resend cooldown per nonce, in ms; UX only (see [Residual risks](../extend/auth-channel-security-model.md)) | 60000 (60 seconds) | at least 30000 (30 seconds) |
| `throttle.requesterCap` | Requester sends per hour, keyed on the address-and-identity bucket | 20 | 5 to 100 |
| `throttle.identityCeiling` | Identity send ceiling per hour; logs [`auth.channel.ceiling_exceeded`](./log-events.md) only, never denies | 30 | at least 10 |
| `throttle.escalationThreshold` | Identity failure-escalation threshold per hour, past which `confirm` answers `challenge-required` | 20 | at least 10 |
| `throttle.liveRowCap` | Live code rows kept per requester bucket; a re-mint prunes the requester's own oldest rows past this | 5 | at most 20 |
| `session.ttlMs` | Session lifetime, in ms | 2592000000 (30 days) | at most 31536000000 (1 year) |

## Rate limiting

`config.rateLimit`, when set, applies an optional Workers `RateLimit` binding to `request` and
`confirm`, back pressure only and never a security control: an unresolved binding degrades to open,
and a throwing `key()` or `limit()` call degrades to open as well (see
[`auth.channel.rate_limit_absent`](./log-events.md) and
[`auth.channel.rate_limit_failed`](./log-events.md)). The default key is the requester bucket
(the client address paired with the derived identity), never the identity alone; `key(event)`
overrides it, where `event` is the same [`CairnEvent`](#types) `challenge` receives. Both actions apply the check after deriving the identity the default key needs, not
before every other step. The Workers `RateLimit` binding is per-location and eventually
consistent, the same caveat [`/cloudflare`](./cloudflare.md#checking-a-rate-limit) states for its
own wrapper; the engine's own test suite exercises `rateLimit` against a structural
[`RateLimitLike`](#types) stub, not a real binding, so the real binding's period and per-colo
behavior are unproven by this package's own suite.

## Storage

### The packaged migration

The factory's own D1 schema ships as a migration file in the package, at
`migrations-channel/0000_channel.sql`: the `cairn_channel_meta`, `cairn_channel_code`,
`cairn_channel_session`, and `cairn_channel_budget` tables, their indexes, and one `INSERT` that
seeds `schema_version`. Point your channel binding's `migrations_dir` at a copy of that directory,
never at the `migrations` directory your site's `AUTH_DB` uses; see [Add a second
audience](../extend/add-a-second-audience.md) for the wiring. A shared `migrations_dir` applies
cairn's auth migrations to the channel database and the channel's schema to the auth store.

Every statement is idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, and
`INSERT OR IGNORE` for the version row), so a database provisioned by running the DDL directly
adopts the file the same way any other does: run `wrangler d1 migrations apply <channel-db>`, which
changes nothing and records the `d1_migrations` marker itself. Insert that marker by hand only if
you can't run the migration runner.

`createAuthChannel`'s own actions only ever read the `schema_version` row back to confirm a
channel's binding has already been migrated. None of them re-runs the migration.

The per-deployment identity salt is deliberately absent from the file: a migration published on npm
and pinned byte for byte by a test can't carry a per-deployment random value. `createAuthChannel`
provisions it lazily on first use instead, an `INSERT OR IGNORE` of 32 random bytes under the
`identity_salt` key in `cairn_channel_meta`, so two independently migrated databases end up with
different salts and no migration file carries a secret.

Expired rows never need a site-side cleanup job. Each successful code mint also sweeps expired
code rows, expired sessions, and budget rows more than two windows stale, through `waitUntil` so
the cleanup never delays a response.

## Types

| Export | Stability | Signature | Meaning |
| --- | --- | --- | --- |
| <a id="authchannel"></a>`AuthChannel` | Extension API | `interface AuthChannel<Env> { actions: { request: (event: CairnEvent<Env> & { getClientAddress(): string }) => Promise<ChannelRequestResult>; confirm: (event: CairnEvent<Env> & { getClientAddress(): string }) => Promise<ChannelConfirmResult>; logout: (event: CairnEvent<Env>) => Promise<{ ok: true }> }; resolveSubject: (event: CairnEvent<Env>) => Promise<string \| null>; revokeSessions: (db: D1Database, subject: string) => Promise<void> }` | What [`createAuthChannel`](#createauthchannel) returns. `request` and `confirm` need the client address for the requester bucket; `logout` and `resolveSubject` take the bare event; `revokeSessions` takes a binding, so a caller outside a request can reach it. |
| <a id="authchannelconfig"></a>`AuthChannelConfig` | Extension API | `interface AuthChannelConfig<Env> { resolveDb: (env: Env \| undefined) => D1Database \| undefined; deliver: (contact: string, code: string, ctx: DeliverContext<Env>) => Promise<void>; lookup: (contact: string, ctx: { env: Env \| undefined }) => Promise<string \| null>; normalize: (raw: string) => string; challenge: (event: CairnEvent<Env>, form: FormData) => Promise<boolean>; cookie: { name: string }; verify?: (subject: string, ctx: { env: Env \| undefined }) => Promise<boolean>; kind?: 'code'; limits?: { code?: { length?: number; ttlMs?: number; attemptCap?: number }; throttle?: { cooldownMs?: number; requesterCap?: number; identityCeiling?: number; escalationThreshold?: number; liveRowCap?: number }; session?: { ttlMs?: number } }; rateLimit?: { resolve: (env: Env \| undefined) => RateLimitLike \| undefined; key?: (event: CairnEvent<Env>) => string } }` | Construction-time configuration for [`createAuthChannel`](#createauthchannel); see [Building a channel](#building-a-channel) for every field, and [Defaults and clamps](#defaults-and-clamps) for every `limits` field. |
| <a id="delivercontext"></a>`DeliverContext` | Extension API | `interface DeliverContext<Env> { env: Env \| undefined; waitUntil: (promise: Promise<unknown>) => void }` | The context [`deliver`](#createauthchannel) receives alongside the contact and code: the resolved platform env and Cloudflare's background-task hook. |
| <a id="channelrequestresult"></a>`ChannelRequestResult` | Extension API | `type ChannelRequestResult = { sent: true } \| { error: 'invalid' \| 'throttled' \| 'challenge-required' \| 'unavailable' }` | The `request` action's result. `sent` is `true` even for an unknown contact, so the response never leaks roster membership. |
| <a id="channelconfirmresult"></a>`ChannelConfirmResult` | Extension API | `type ChannelConfirmResult = { ok: true } \| { error: 'bad-code' \| 'expired' \| 'locked' \| 'throttled' \| 'challenge-required' \| 'no-pending-request' \| 'unavailable' }` | The `confirm` action's result. `challenge-required` is a retry invitation, never a hard failure: the site's confirm form renders its challenge widget and the member submits again. |
| <a id="ratelimitlike"></a>`RateLimitLike` | Extension API | `interface RateLimitLike { limit(options: { key: string }): Promise<{ success: boolean }> }` | The structural slice of a Workers `RateLimit` binding [`config.rateLimit.resolve`](#rate-limiting) returns; the same declaration [`/cloudflare`](./cloudflare.md#types) and [`/sveltekit`](./sveltekit.md#types) export. |
| <a id="cairnevent"></a>`CairnEvent` | Extension API | See [`/sveltekit`](./sveltekit.md#the-event-shape) for the full declaration. | The engine's one structural event shape, which every real SvelteKit `RequestEvent` satisfies. Re-exported here because [`challenge`](#createauthchannel) and [`rateLimit.key`](#rate-limiting) name it; its canonical home is [`/sveltekit`](./sveltekit.md). |
