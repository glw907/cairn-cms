# cairn DX feedback: login CSRF 403 when the browser sends no Origin header (ecnordic 0.34.0)

Filed 2026-06-08 from ecnordic.ski running `@glw907/cairn-cms@0.34.0`, on a deployed admin login from
Firefox. This is a direct follow-up to the [2026-06-07 login-CSRF note](./cairn-dx-feedback-2026-06-07-ecnordic-0.33-login-csrf.md).
That note led to 0.34.0, which made "force HTTPS at the edge" a deploy requirement and added a branded
"admin needs HTTPS" page for an http GET. The site applied that mitigation in full, and login still fails.
The cause is a different source of the same 403: a browser that sends no `Origin` header. Forcing HTTPS
cannot fix this, because the missing header is a client choice, not a scheme problem.

## Symptom

A real browser login at `https://ecnordic.ski/admin/login` returns the SvelteKit core text
`Cross-site POST form submissions are forbidden` (HTTP 403). The browser is Firefox. The same flow had
already failed before the 0.34 HTTPS work, and it still fails after it.

## The 0.34 HTTPS mitigation is in place and confirmed

The zone is locked to https, so the cross-scheme class the prior note described is closed:

- "Always Use HTTPS" is `on` (Cloudflare zone `ecnordic.ski`).
- HSTS is set on https responses: `max-age=63072000; includeSubDomains`.
- `http://ecnordic.ski/admin/login` returns `301` to the https URL.
- `www.ecnordic.ski` does not resolve, so a host mismatch is not reachable either.

A Cloudflare tail confirmed the failing login arrives over https, not http:

```
POST https://ecnordic.ski/admin/login - Ok @ 6/8/2026, 12:42:54 PM
```

(The tail "Ok" is the Cloudflare outcome, meaning the worker did not throw. It is not the HTTP status. A
403 from the CSRF guard is a normal Response, so it reads as "Ok" here.)

## Root cause: the request reaches the worker with no `Origin`, and the guard rejects it

SvelteKit's built-in CSRF guard rejects an unsafe form POST whose `Origin` header does not exactly equal
`url.origin`. A request with no `Origin` header at all fails that equality (`null !== 'https://ecnordic.ski'`)
and returns the 403. The server is behaving correctly. The browser is the variable.

Reproduced against the live worker with curl. The only difference between pass and fail is the presence
of the `Origin` header:

| Request | `Origin` header | Result |
|---|---|---|
| `POST https://ecnordic.ski/admin/login` | `https://ecnordic.ski` | 200, passes |
| `POST https://ecnordic.ski/admin/login` | none | 403 `Cross-site POST form submissions are forbidden` |

Commands:

```bash
# passes
curl -i -X POST https://ecnordic.ski/admin/login \
  -H "Origin: https://ecnordic.ski" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data "email=nobody@example.com"

# 403, matches the reported symptom exactly
curl -i -X POST https://ecnordic.ski/admin/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data "email=nobody@example.com"
```

The no-`Origin` row reproduces the user's failure exactly. So the browser is posting without an `Origin`.

### Why a browser omits `Origin` on a same-origin POST

Firefox has a preference, `network.http.sendOriginHeader`, that controls this:

- `2` sends the header always (the Firefox default).
- `1` sends it only cross-origin, so a same-origin POST carries no `Origin`.
- `0` never sends it.

A value of `0` or `1` is common in privacy-hardened Firefox profiles. The Arkenfox `user.js` lineage set
this in the past and later reverted it, because it breaks exactly this Origin-based CSRF pattern. The
ecnordic admin runs in such a profile, so the login POST carries no `Origin` and the guard rejects it.
The precise client value was not captured, since the server-side reproduction above already pins the
mechanism: no `Origin` in, 403 out.

This is a legitimate visitor. A privacy-conscious operator running the only admin account is locked out
of the CMS, with no way to recover from the browser side short of changing a hidden preference.

## Two problems for cairn to weigh

### 1. The auth POST depends on a header the client may withhold

`LoginPage.svelte` and `ConfirmPage.svelte` submit JS-free `<form method="POST">` forms with no `use:enhance`
and no fallback, so each one leans entirely on SvelteKit's `Origin` equality check. That check fails for any
client that omits `Origin`. Forcing HTTPS does not help, because the scheme was never the issue here.

The deploy guide and the prior note both frame the fix as "force HTTPS." That closes the cross-scheme path.
It does not close the missing-`Origin` path, and the guide does not mention it.

### 2. The rejection page is raw SvelteKit text, and a consumer cannot rebrand it

`Cross-site POST form submissions are forbidden` is emitted by SvelteKit core before any cairn or site code
runs, so a consumer `+error.svelte` cannot catch it. The branded "admin needs HTTPS" page added in 0.34 does
not cover this path either, since that page is served from the auth guard on a GET, and this is a core CSRF
rejection on a POST. The user asked for an on-brand, instructional page here, and cairn is the only layer
that can provide one.

## Fix candidates (a cairn design call)

1. **Let cairn own CSRF for the auth routes, tolerant of a missing `Origin`.** Turn off SvelteKit's built-in
   check (`csrf: { checkOrigin: false }` in the site config the engine documents, or scoped in the engine's
   hook) and validate in the engine's auth layer. Accept a request whose `Origin` matches. When `Origin` is
   absent, fall back to the `Referer` host. Reject only when neither matches. A genuine cross-site POST
   carries neither a matching `Origin` nor a matching `Referer`, so protection holds for the common case.
   The residual gap: a client that strips both `Origin` and `Referer` is still rejected. The token approach
   below covers that.

2. **Double-submit token, no header dependency.** Set a `SameSite` cookie with a random value and render it
   as a hidden field in the login and confirm forms. The action compares the cookie to the field. This does
   not read `Origin` or `Referer` at all, so it survives a hardened browser, and it stays JS-free. A
   `SameSite=Strict` or `Lax` cookie is not sent on a cross-site POST, so the token cannot be forged from
   another origin. This is the most robust option and fits the JS-free design.

3. **Relax the check on the pre-auth login request specifically.** The `POST /admin/auth/request` form only
   triggers an email to whatever address is submitted. An attacker who forges it cannot read the resulting
   link, and the confirm step is already gated by the unguessable token from the email. So the CSRF risk on
   the request form alone is low, and a lighter check there is defensible. The session-bearing routes still
   want real protection, which the `__Host-` `SameSite` session cookie already provides.

4. **Brand the rejection.** When the engine's own check rejects, return a styled page, a sibling to the 0.34
   "needs HTTPS" page, that names the likely cause and offers a recovery path, instead of the raw core text.

The combination that removes the brittleness without weakening the model: option 2 for the forms, plus
option 4 for whatever still rejects. Option 1 is the smaller change if a full token flow is more than this
needs.

## References

- The prior note: [`cairn-dx-feedback-2026-06-07-ecnordic-0.33-login-csrf.md`](./cairn-dx-feedback-2026-06-07-ecnordic-0.33-login-csrf.md).
- Deploy guide force-HTTPS step: `docs/guides/deploy-to-cloudflare.md#force-https`.
- The `Origin` dependency note: `docs/admin-smoke-test.md:84`.
- Auth forms: `src/lib/components/LoginPage.svelte`, `src/lib/components/ConfirmPage.svelte`.
- Auth actions: `src/lib/sveltekit/auth-routes.ts` (`requestAction`, `confirmAction`).
