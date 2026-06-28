# Extend (`@glw907/cairn-cms/extend`)

This subpath is the developer-extensibility public contract. Everything a customization depends on is
re-exported here, and only here, so cairn can refactor the internals behind it without breaking your
code. The surface is versioned and a dedicated gate fails CI when it drifts. Phase 1 ships the identity
foundation: the principal model, the route-gating primitives, the login primitives, and the erasure
call.

```ts
import { loadPrincipal, requireScope, requireAnyScope, hasScope } from '@glw907/cairn-cms/extend';
import { sendMagicLink, confirmMagicLink, signIn, forgetPrincipal } from '@glw907/cairn-cms/extend';
import type { Principal, AuthTier, Authorize } from '@glw907/cairn-cms/extend';
```

The `/internal/*` subpaths are not part of this contract and resolve to nothing on a consumer import.
Reach for `./extend` for any customization that gates a route, reuses the editor login, or reads the
logged-in identity.

---

## `loadPrincipal`

```ts
declare function loadPrincipal(event: GateEvent, deps?: GateDeps): Promise<Principal | null>;
```

Resolve the logged-in [`Principal`](#principal) on any route, or `null` when no one is signed in. It
reads the session cookie and queries `AUTH_DB` only when the cookie is present, so an anonymous request
costs no database round trip. The result is memoized on `event.locals.principal`, so repeated calls in
one request resolve once. Pass your `authorize` callback in `deps` to grant custom scopes during
resolution.

---

## `requireScope`

```ts
declare function requireScope(event: GateEvent, scope: string, opts?: GateOpts): Promise<Principal>;
```

Gate a route on a single scope. It returns the [`Principal`](#principal) when the scope is held, throws
a 303 redirect to `loginPath` (default `/admin/login`) when no one is signed in, and throws a 403 when
the visitor is signed in but lacks the scope. Scope matching is exact: `requireScope(event, 'member')`
matches a principal holding `member`, not `member:gold`.

---

## `requireAnyScope`

```ts
declare function requireAnyScope(event: GateEvent, scopes: string[], opts?: GateOpts): Promise<Principal>;
```

Gate a route on holding any one of several scopes. The same redirect and 403 behavior as
[`requireScope`](#requirescope), passing when the principal holds at least one of `scopes`.

---

## `hasScope`

```ts
declare function hasScope(principal: Principal, scope: string): boolean;
```

Exact-match scope test against a resolved [`Principal`](#principal). Use it to branch UI or logic on a
scope without throwing, where the route is already loaded.

---

## `sendMagicLink`

```ts
declare function sendMagicLink(
  event: RequestContext,
  opts: { tier: AuthTier; redirectTo?: string; branding: AuthBranding; send?: SendMagicLink },
): Promise<RequestResult>;
```

Send a sign-in email to a verified address, the built-in magic-link authenticator. The `tier` sets the
session trust tier the link mints. Pass `tier: 'member'` to issue a member login outside `/admin`, and
`redirectTo` to land the confirmed session on your own route. This is the same primitive cairn's own
`/admin/login` form calls.

---

## `confirmMagicLink`

```ts
declare function confirmMagicLink(event: RequestContext): Promise<never>;
```

Consume a magic-link token from the POST body, mint the session, set the cookie, and redirect. It always
throws (a redirect on success, a redirect to the login page with an error on failure), so it never
returns. Mount it as the action behind the link the email carries.

---

## `signIn`

```ts
declare function signIn(
  event: RequestContext,
  verifiedEmail: string,
  opts?: { tier?: AuthTier; redirectTo?: string },
): Promise<void>;
```

Mint a session for an already-verified email, the seam for any externally verified mechanism such as
OAuth or SSO. It performs no verification and trusts the caller to have authenticated the email, so it
is server-only: import it from a `.server` module, never from client code. The tier defaults to
`member`, and a prior session for the email is rotated to defeat fixation.

---

## `forgetPrincipal`

```ts
declare function forgetPrincipal(db: D1Database, email: string): Promise<void>;
```

Delete every cairn-owned identity row for an email: its sessions and any pending magic-link tokens. Use
it to honor an erasure request. It removes only cairn's auth rows, not your own application data for the
email.

---

## `Principal`

```ts
interface Principal {
  email: string;
  displayName: string;
  scopes: string[];
  tier: AuthTier;
}
```

The identity the engine reads on any route. `email` is the verified address, `displayName` falls back to
the email for a member with no editor row, `scopes` are the granted scopes (built-in `admin:*` plus your
custom scopes), and `tier` is the session trust tier.

---

## `AuthTier`

```ts
type AuthTier = 'admin' | 'member';
```

A session's trust tier, set at mint time. An `admin` session can hold `admin:*` scopes when its email is
in the editor allowlist; a `member` session never reaches `/admin`. The tier is defense in depth, and
the allowlist is the true admin gate.

---

## `Authorize`

```ts
type Authorize = (ctx: { email: string; platform: unknown }) => Promise<string[]> | string[];
```

A site's authorize callback. cairn calls it during principal resolution to grant custom scopes for the
verified email, passing the email and the platform (for your own D1). Return the scopes to grant, or an
empty array to grant none. cairn runs it under a deadline and fail-closed: a throw, a timeout, or a
non-array return grants no custom scopes and logs `auth.authorize.failed`, never breaking the request.

---

## See also

- [Log events reference](./log-events.md): `auth.authorize.failed` and `auth.scope.denied`.
- [Core reference](./core.md): the adapter members the engine reads.
