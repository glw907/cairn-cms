# Cloudflare (`@glw907/cairn-cms/cloudflare`)

**Server only.** The export carries a `browser` condition pointing at a stub with no exports and
a module-level throw. A named import (`import { verifyTurnstile } from '...'`) fails the build: a
bundler's static export check finds no such name on the stub and errors before any code runs. A
bare side-effect import (`import '@glw907/cairn-cms/cloudflare'`) passes the build instead and
throws at runtime, the moment that import executes in the browser.

This subpath is for Cloudflare-native platform primitives only: Turnstile is the platform's own
bot defense, and `RateLimit` is a platform binding. A third-party service verifier, a payment
processor's webhook check, a chat platform's notifier, never belongs here, whatever precedent
these exports appear to set; that stays the site's own code.

```ts
import { verifyTurnstile, checkRateLimit, checkRateLimitKeys } from '@glw907/cairn-cms/cloudflare';
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

Verify a Turnstile token against Cloudflare's siteverify endpoint. Every failure mode, a
non-200 response, an unparseable or non-object body, a thrown fetch, and a hostname or action
mismatch, returns `false` by contract, never throws: this function is fail-closed, so a future
refactor cannot flip it open by accident. A blank `token` or `secret` also returns `false`
without a request.

`opts.ip` must come from `CF-Connecting-IP`, never a client-forwardable header such as
`X-Forwarded-For`: a request can set that header to anything, so passing it through would let a
bot supply its own IP to siteverify. A solved token is single-use and valid for a roughly
300-second window; siteverify itself enforces both, and a second call against the same token
returns `false`.

Supply `opts.hostname` and `opts.action` whenever a sitekey serves more than one form. Without
them, siteverify proves only that the token is genuine, not which form it was solved for, so a
token solved on any widget sharing the sitekey replays against every other form the site guards
with `verifyTurnstile`. With them, a response whose `hostname` or `action` does not match the
supplied value also returns `false`.

This function never logs the secret or the response body, only a `reason` and, for a mismatch,
the expected and actual values; see [`turnstile.verify_failed`](./log-events.md).

Degrade-to-open, skipping the check entirely when a site has no secret configured, is the
caller's own convention, never this function's: verification and that policy stay separate. The
site key and any `window.turnstile` ambient declaration for the client-side widget are also the
site's own, never this package's:

```ts
import { verifyTurnstile } from '@glw907/cairn-cms/cloudflare';

async function verifySubmission(token: string, secret: string | undefined): Promise<boolean> {
  // Caller's own convention: no secret configured means the check passes.
  if (secret && !(await verifyTurnstile(token, secret, { hostname: 'example.com', action: 'contact' }))) {
    return false;
  }
  return true;
}
```

## Checking a rate limit

### `checkRateLimit`

Stability tier: Extension API.

```ts
declare function checkRateLimit(binding: RateLimitLike | undefined, key: string): Promise<boolean>;
```

Check one key against a Workers `RateLimit` binding. The Workers limiter is per-location and
eventually consistent, so this is best-effort back pressure, never an authoritative security
control; reach for the engine's own D1-backed send cooldown (the pattern `createAuthGuard` uses
for the magic-link request rate) for anything that must actually hold. An absent `binding`
degrades to open and returns `true` without a call, the convention for local dev, vitest, and a
not-yet-provisioned deploy. A throwing `limit()` propagates to the caller rather than being
swallowed here: a caller decides its own degrade-to-open-on-throw policy, the same way
[`createSectionAction`](./sveltekit.md#createsectionaction)'s wrapper does for its own rate-limit
branch.

### `checkRateLimitKeys`

Stability tier: Extension API.

```ts
declare function checkRateLimitKeys(binding: RateLimitLike | undefined, keys: string[]): Promise<boolean>;
```

Check several keys against a Workers `RateLimit` binding, in order, short-circuiting at the
first failing key: a later key's counter is never incremented once an earlier one has already
failed. An absent `binding` degrades to open and returns `true` with no call, even with several
keys.

`createSectionAction`'s own `rateLimit` option is the in-engine consumer of `RateLimitLike`; see
[SvelteKit](./sveltekit.md#createsectionaction) for the wrapper that resolves a section's own
binding and key against it.

## Types

| Export | Stability | Signature | Notes |
| --- | --- | --- | --- |
| <a id="verifyturnstileoptions"></a>`VerifyTurnstileOptions` | Extension API | `interface VerifyTurnstileOptions { ip?: string; hostname?: string; action?: string }` | The narrowing [`verifyTurnstile`](#verifyturnstile) accepts as its third argument; see its own description under `verifyTurnstile` for each field. |
| <a id="ratelimitlike"></a>`RateLimitLike` | Extension API | `interface RateLimitLike { limit(options: { key: string }): Promise<{ success: boolean }> }` | The structural slice of a Workers `RateLimit` binding [`checkRateLimit`](#checkratelimit) and [`checkRateLimitKeys`](#checkratelimitkeys) call; any conforming limiter serves, so the surface takes no dependency on `@cloudflare/workers-types`. The same declaration [`createSectionAction`](./sveltekit.md#createsectionaction) re-exports from `./sveltekit`. |
