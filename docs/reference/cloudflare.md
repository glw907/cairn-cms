# Cloudflare (`@glw907/cairn-cms/cloudflare`)

**Server only.** The export carries a `browser` condition pointing at a stub with no exports and
a module-level throw. A named import (`import { verifyTurnstile } from '...'`) fails the build: a
bundler's static export check finds no such name on the stub and errors before any code runs. A
bare side-effect import (`import '@glw907/cairn-cms/cloudflare'`) passes the build instead and
throws at runtime, the moment that import executes in the browser.

The `worker` and `default` conditions resolve the real module. Only `browser` resolves the stub.
A Cloudflare Workers build activates `worker` and `browser` together, and the exports map declares
`worker` first, so the real module reaches the Worker. "Server only" describes where the stub
lives. A Workers deploy resolves the real module.

This subpath is for Cloudflare-native platform primitives only: Turnstile is the platform's own
bot defense, and `RateLimit` is a platform binding. A third-party service verifier, a payment
processor's webhook check, a chat platform's notifier, never belongs here, whatever precedent
these exports appear to set; that stays the site's own code.

```ts
import { verifyTurnstile, resolveRateLimit } from '@glw907/cairn-cms/cloudflare';
```

## Verifying a token

### `verifyTurnstile`

Stability tier: Extension API.

```ts
declare function verifyTurnstile(
  token: string,
  secret: string,
  opts?: VerifyTurnstileOptions,
): Promise<boolean>;
```

Verify a Turnstile token against Cloudflare's siteverify endpoint. Every failure mode, a `token`
or `secret` that isn't a string or is blank after trimming, a `token` over 2048 characters (past
the length Cloudflare's documented token format can reach), a fetch that throws or hangs past a
5-second deadline, a non-200 response, a body that fails to parse as JSON or fails validation of
every field this function reads, a `success: false` response, and a `hostname` or `action`
mismatch, returns `false` by contract, never throws: this function is fail-closed, so a future
refactor can't flip it open by accident. The `boolean` return is a deliberate exception to the
engine's discriminated-result convention: naming each failure reason in the return type would
tempt a caller into treating one refusal as more admissible than another, which this function's
fail-closed contract forbids.

`opts.ip` must come from `CF-Connecting-IP`, never a client-forwardable header such as
`X-Forwarded-For`: a request can set that header to anything, so passing it through would let a
bot supply its own IP to siteverify.

`secret` is the second parameter, not the third. Both `token` and `secret` are plain strings, so
swapping them, easy to do when porting from a hand-rolled `(token, ip, secret)` shape, still
typechecks and compiles; it just fails every submission closed with no signal beyond the
`turnstile.verify_failed` log record this function already writes.

Cloudflare documents a solved token as single-use and valid for a roughly 300-second window.
Siteverify is what enforces that, not this function, and it's a property of a remote, eventually
consistent service that this engine neither adds to nor verifies. A site gating a privileged
one-shot action on a token, an account claim, a first login, a redemption, still has to bind the
token (or a value derived from it) to its own server-side state, the way the engine's own
magic-link flow consumes its token with a single atomic delete that returns the row to the first
caller and nothing to any repeat. A Turnstile pass alone is bot resistance, not a claim ticket.

Supply `opts.hostname` and `opts.action` whenever a sitekey serves more than one form. Without
them, siteverify proves only that the token is genuine, not which form it was solved for, so a
token solved on any widget sharing the sitekey replays against every other form the site guards
with `verifyTurnstile`. With them, a response whose `hostname` or `action` does not match the
supplied value also returns `false`.

TypeScript can't tell an omitted `hostname` or `action` from one explicitly set to `undefined`,
so `verifyTurnstile(token, secret, { hostname: env.SOME_UNSET_VAR })` silently skips that check
with no type error and no log. Check your config actually holds a value before you pass it.
Don't trust `opts.hostname` or `opts.action` to be present just because your call site names
them.

This function logs on every refusal but one. The pre-flight bounds check, a non-string, blank, or
over-length `token` or `secret`, logs `reason: 'invalid_input'` with the token's length
(`tokenLength`), never the token itself. A fetch that throws or times out logs
`reason: 'request_failed'` with the error's message. A non-200 response logs
`reason: 'bad_status'` with the response `status`. A body that fails to parse or fails shape
validation logs `reason: 'unparseable'` with no other field. A `success: false` response logs
`reason: 'rejected'` with the response's `codes`, unless every code is one of the two routine
causes (`invalid-input-response`, `timeout-or-duplicate`), in which case it logs nothing, since
that's the function working as intended. A `hostname` or `action` mismatch logs
`reason: 'hostname_mismatch'` or `reason: 'action_mismatch'` with the `expected` and `actual`
values. The secret and the full response body are never logged, only the fields named here. See
[`turnstile.verify_failed`](./log-events.md) for the full table.

Degrade-to-open, skipping the check entirely when a site has no secret configured, is the
caller's own convention, never this function's: verification and that policy stay separate.
Choosing it means that branch runs with no bot protection at all, and `verifyTurnstile` is never
called, so nothing logs the skip on its own; a site adopting the convention should log or alert
on the missing-secret branch itself. The site key and any `window.turnstile` ambient declaration
for the client-side widget are also the site's own, never this package's:

```ts
import { verifyTurnstile } from '@glw907/cairn-cms/cloudflare';

async function verifySubmission(token: string, secret: string | undefined): Promise<boolean> {
  // Caller's own convention: no secret configured means the check passes.
  // A site should log or alert here, since this branch runs with zero bot protection.
  if (secret && !(await verifyTurnstile(token, secret, { hostname: 'example.com', action: 'contact' }))) {
    return false;
  }
  return true;
}
```

## Checking a rate limit

`resolveRateLimit` reads a Workers
[`RateLimit`](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
binding, declared in `wrangler.jsonc`:

```jsonc
"ratelimits": [
  {
    "binding": "MY_RATE_LIMITER",
    "namespace_id": "1001",
    "simple": { "limit": 10, "period": 60 }
  }
]
```

`period` accepts only `10` or `60` (seconds); there's no third option.

### `resolveRateLimit`

Stability tier: Extension API.

```ts
declare function resolveRateLimit(
  binding: RateLimitLike | undefined,
  keys: string | string[],
): Promise<RateLimitOutcome>;
```

Resolve one or several keys against a Workers `RateLimit` binding, in order, short-circuiting at
the first key over budget: a later key's counter is never incremented once an earlier one has
already failed. The Workers limiter is per-location and eventually consistent, so this is
best-effort back pressure, never an authoritative security control. Reach for the engine's own
D1-backed send cooldown (the pattern `createAuthGuard` uses for the magic-link request rate) for
anything that must actually hold.

Returns a four-arm [`RateLimitOutcome`](#ratelimitoutcome): `{ outcome: 'allowed' }` when every
key cleared, `{ outcome: 'limited'; key }` naming the first key over budget, `{ outcome:
'no-binding' }` when `binding` is `undefined` (no call is made), and `{ outcome: 'failed'; error
}` when the underlying `limit()` call itself threw (the thrown value is carried, never rethrown).
Degrading to open on `no-binding` or `failed` is each caller's own decision to read off the
result, the same policy its predecessor `checkRateLimit` exported as an unconditional `true`; a
caller that must fail closed instead branches on the outcome explicitly.

A single string `key` behaves exactly as a one-element array. `key` is the caller's to build, and
its construction decides what the limit actually protects. Normalize an identity before keying on
it (lowercase an email, and strip a plus tag where the site's own semantics already treat
`user+tag@example.com` as `user@example.com`), or an attacker gets a fresh budget for every case
or tag variant of the same address. Derive any IP component from `CF-Connecting-IP` only, the same
rule [`verifyTurnstile`](#verifyturnstile) enforces for its own `opts.ip`, never a
client-forwardable header such as `X-Forwarded-For`. One binding carries one configured limit and
period (the preceding `simple: { limit, period }` example), applied independently to each distinct
key: two different keys draw from two separate counters, never a shared one. That's exactly why an
unnormalized identity hands an attacker a fresh budget per case or tag variant. A `key` built by
concatenating unbounded caller input can exceed the binding's own key-length limit; bound the key
yourself rather than relying on the binding's own handling of an oversized one.

Order several keys broadest first: the budget that most needs to hold goes at index 0. With the
narrower key checked first, say an email ahead of an IP, an attacker who saturates that one
email's budget then fails the check at index 0 on every later attempt, so the broader key behind
it never runs and its counter never sees the flood.

`resolveRateLimit` writes no log line of its own, by design: it has no call-site context to say
what a misspelled binding name or a not-yet-provisioned limiter should mean for the caller. A site
that needs to know reaches for that context itself.
[`createSectionAction`](./sveltekit.md#createsectionaction) is the worked example: its own
`rateLimit` option logs `admin.action.rate_limit_absent` when the configured binding resolves to
nothing, and `admin.action.rate_limit_failed` on the `failed` outcome (see
[log events](./log-events.md)). `createSectionAction`'s own `rateLimit` option is the in-engine
consumer of `RateLimitLike`; see [SvelteKit](./sveltekit.md#createsectionaction) for the wrapper
that resolves a section's own binding and key against it.

## Types

| Export | Stability | Signature | Notes |
| --- | --- | --- | --- |
| <a id="verifyturnstileoptions"></a>`VerifyTurnstileOptions` | Extension API | `interface VerifyTurnstileOptions { ip?: string; hostname?: string; action?: string }` | The narrowing [`verifyTurnstile`](#verifyturnstile) accepts as its third argument; see its own description under `verifyTurnstile` for each field. |
| <a id="ratelimitlike"></a>`RateLimitLike` | Extension API | `interface RateLimitLike { limit(options: { key: string }): Promise<{ success: boolean }> }` | The structural slice of a Workers `RateLimit` binding [`resolveRateLimit`](#resolveratelimit) calls; any conforming limiter serves, so the surface takes no dependency on `@cloudflare/workers-types`. The same declaration [`createSectionAction`](./sveltekit.md#createsectionaction) re-exports from `./sveltekit`. |
| <a id="ratelimitoutcome"></a>`RateLimitOutcome` | Extension API | `type RateLimitOutcome = { outcome: 'allowed' } \| { outcome: 'limited'; key: string } \| { outcome: 'no-binding' } \| { outcome: 'failed'; error: unknown }` | What [`resolveRateLimit`](#resolveratelimit) returns; see its own description for each arm. |
