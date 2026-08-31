# Auth crypto (`@glw907/cairn-cms/auth-crypto`)

**Server only.** The export carries a `browser` condition pointing at a stub with no exports and
a module-level throw. A named import (`import { hashToken } from '...'`) fails the build: a
bundler's static export check finds no such name on the stub and errors before any code runs. A
bare side-effect import (`import '@glw907/cairn-cms/auth-crypto'`) passes the build instead and
throws at runtime, the moment that import executes in the browser.

The `worker` and `default` conditions resolve the real module. Only `browser` resolves the stub.
A Cloudflare Workers build activates `worker` and `browser` together, and the exports map declares
`worker` first, so the real module reaches the Worker. "Server only" describes where the stub
lives. A Workers deploy resolves the real module.

This subpath carries the stateless Web Crypto primitives, token, hash, compare, and cookie-name
functions, a second-audience login flow would otherwise copy by hand. It re-exports the token
generator, the token hash, the constant-time compare, and the `__Host-` cookie-name primitive the
engine's own magic-link guard uses, for a site that
authenticates a second audience: member magic-link sessions, offer tokens, an OTP flow. A site
building that flow stops copying the engine's cryptography by hand and reuses the same primitives
the engine's own login proves in production. A stateful provisioning read or write belongs on
[`/auth-store`](./auth-store.md) instead, even one built on the same hashes this subpath produces.

What stays out: the TTL constants and the send-cooldown constant, since a token or session
lifetime is the site's own ruling, not the engine's; the engine's own cookie-name functions,
which stay internal because no site needs the engine's exact cookie names and colliding with
them is the two-stores blur the `cairn_` reservation below warns against; and every auth-flow
and store function. Audience semantics, the store schema, and the rule that a second audience's
session store never blurs with the engine's own stay entirely site-owned.

```ts
import { generateToken, hashToken, cookieName } from '@glw907/cairn-cms/auth-crypto';
```

## Generating tokens

### `generateToken`

Stability tier: Extension API.

```ts
declare function generateToken(): string;
```

A fresh 256-bit, URL-safe token, drawn from `crypto.getRandomValues`. Use it for a magic-link
token, an offer token, a session identifier, or a double-submit CSRF token: the same generator
serves all four, since a longer or shorter identifier is a parameter on one function, never a
second public name. Pair it with `tokensMatch` for double-submit CSRF protection on a second
audience's own form routes.

## Hashing and comparing tokens

### `hashToken`

Stability tier: Extension API.

```ts
declare function hashToken(token: string): Promise<string>;
```

The lowercase-hex SHA-256 digest of `token`. Safe only for a value drawn from a CSPRNG, such as
`generateToken`'s output: never hash a password, a numeric OTP, an email address, or anything an
attacker can enumerate and check offline against a stolen digest. A low-entropy secret needs a
password key-derivation function this package does not ship; see the [OWASP Password Storage
Cheat
Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

Store only the digest, never the token itself, and look a submitted token up by its digest.

### `tokensMatch`

Stability tier: Extension API.

```ts
declare function tokensMatch(a: string, b: string): boolean;
```

A length-checked, constant-time compare, so checking a token leaks no timing beyond its length.
Four properties to design around: it leaks length, since a length mismatch is a cheap,
non-constant-time reject and length is not a secret; `tokensMatch('', '')` is deliberately
`false`, so an unset expected value can never match an unset submitted one; it is meant only
for fixed-length CSPRNG tokens and hex hashes, the shape `generateToken` and `hashToken`
produce, never for a password or anything an attacker can enumerate; and it compares UTF-8
encoded bytes (`TextEncoder`), so two distinct strings that differ only in a lone (unpaired) surrogate collapse
to the same replacement-character byte sequence and compare equal. That collapse is harmless for
a CSPRNG token or a hex digest, since neither can carry a lone surrogate in the first place, which
is exactly why this precondition is stated rather than guarded against; it stops being harmless
the moment a caller reaches for `tokensMatch` on a value that isn't one of those two shapes.

## Naming a cookie

### `cookieName`

Stability tier: Extension API.

```ts
declare function cookieName(base: string, secure: boolean): string;
```

Builds a cookie name, applying the `__Host-` prefix discipline: `` `__Host-${base}` `` when
`secure` is `true`, `base` unchanged otherwise. A browser accepts a `__Host-` cookie only when
the response also sets `Secure`, `Path=/`, and omits `Domain`; the caller owns setting those
attributes, this function owns only the name.

`secure` must reflect the scheme the browser itself sees. Behind upstream TLS termination, a
reverse proxy or a platform edge, `url.protocol` is not that scheme; derive `secure` from the
externally visible one instead, such as a trusted `CF-Visitor` or `X-Forwarded-Proto` header the
platform sets.

The engine's own two cookies derive `secure` the same way now: an `https` request always resolves
`Secure` outright, and only a non-`https` request falls back further, to a local-host check and
then the site's configured `PUBLIC_ORIGIN` rather than a header, since a site already declares
that value and a configured origin can't be spoofed by an intermediate hop the way a
forwarded-proto header can. It never downgrades an `https` request, whatever that value says. Both
cookies route through this one derivation (`csrfSecure`, internal to `/sveltekit`), so they can no
longer resolve different `secure` values on the same request; see [The session
cookie](../extend/security-model.md#the-session-cookie). A site building its own second-audience
cookie without an equivalent configured origin reaches for the preceding header-based derivation
instead.

`base` must not already carry a `__Host-` or `__Secure-` prefix (double-prefixing produces a
cookie the browser silently rejects, so this throws instead of shipping a cookie that never
sets) and must contain only characters in the RFC 6265 cookie-name token set. A base starting
`cairn_` is the engine's own reserved namespace: the engine's own session and CSRF cookie names
delegate through this same function, so a site base in that namespace does not throw, but risks
colliding with an engine cookie.

```ts
import { cookieName } from '@glw907/cairn-cms/auth-crypto';

// `secure` is derived from the externally visible scheme (here, a trusted platform header set
// by the edge that terminates TLS), never from `url.protocol`, per the warning above.
function memberSessionCookieName(request: Request): string {
  return cookieName('member-session', request.headers.get('X-Forwarded-Proto') === 'https');
}
```

## The discipline these primitives assume

These functions are building blocks, not a session system. A site composing them into a working
login flow needs the surrounding discipline the engine's own magic-link guard follows:

- Store only `hashToken`'s digest for a token or session lookup value, never the raw value.
- Consume a one-time token in one atomic statement, with the expiry check inside the same
  `WHERE` clause, so two concurrent requests cannot both consume it. The engine's own token
  consume is the pattern to copy:

  ```sql
  DELETE FROM magic_token WHERE token_hash = ? AND expires_at > ? RETURNING email
  ```

- Send a token in a POST body, never in a URL: a URL lands in server access logs, browser
  history, and the `Referer` header of any outbound link the landing page renders.
- Set `Referrer-Policy: same-origin` on the landing page that consumes the token, not
  `no-referrer`. The engine's own `/admin` responses can afford `no-referrer` because
  `/admin`'s CSRF protection is a double-submit token; a second audience's own routes, guarded
  by an origin compare instead (see `originMatches` in the engine's own guard), need `Origin` to
  survive a same-origin POST, and `same-origin` still keeps it out of a cross-origin `Referer`.
  The engine's own admin guard applies a fuller security-header set, but only under `/admin`; a
  second audience's own routes are the site's responsibility to head the same way.
- Pair `generateToken` with `tokensMatch` for double-submit CSRF protection on the second
  audience's own form routes, the same double-submit pattern the engine's own admin actions use.
- Rate limit both by email and by IP, so a token-request endpoint cannot be used to flood one
  inbox or to brute-force a short-lived code.

See the [OWASP Authentication Cheat
Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) and the
[OWASP Session Management Cheat
Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) for
the fuller discipline behind each point.
