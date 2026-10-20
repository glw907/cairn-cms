# cairn owns admin CSRF: a uniform, missing-Origin-tolerant defense

Design for the login-CSRF follow-up filed 2026-06-08
(`docs/cairn-dx-feedback-2026-06-08-ecnordic-login-csrf-missing-origin.md`). The 0.34 work forced
HTTPS at the edge and closed the cross-scheme path. A second source of the same 403 stayed open: a
browser that sends no `Origin` header at all. A privacy-hardened Firefox profile suppresses `Origin`
on same-origin POSTs, and SvelteKit's built-in CSRF guard rejects any form POST whose `Origin` does
not exactly equal `url.origin`. The legitimate operator running the only admin account is locked out,
and the rejection is raw framework text a consumer cannot rebrand.

This design moves CSRF ownership for the admin from the framework to cairn, with one uniform rule that
does not depend on a header the client may withhold.

## The constraint that fixes the shape

SvelteKit's CSRF check runs inside `resolve()` and is a single global switch (`kit.csrf.checkOrigin`).
A JS-free `<form method="POST">` can only send a form content type, so it always trips the check, and a
missing `Origin` always fails it. No per-route setting, header, or `trustedOrigins` entry escapes it. To
let a no-`Origin` admin POST reach its action while keeping the forms JS-free, the consumer must set
`csrf: { checkOrigin: false }`, and cairn must then own CSRF itself. That is not a preference. It falls
out of the framework, and it is the one required consumer step.

Once the global check is off, cairn's guard hook is the natural home for the replacement. `createAuthGuard()`
is already the site's `handle`, so it sees every request. The design makes it the single CSRF authority.

## Two rules, both in the guard

The guard enforces two centralized rules over unsafe form POSTs (`POST`, `PUT`, `PATCH`, `DELETE` carrying
a form content type). Both live in one place, so the whole CSRF story is readable in `guard.ts`.

### Rule 1: every admin form POST carries a valid double-submit token

Every `/admin/**` mutation is a plain JS-free `<form method="POST">`. The set is small and known: the email
request and the magic-link confirm before sign-in, then save, create, delete, nav save, the three
editor-management forms, and logout after it. The guard requires a valid double-submit token on all of them.

- The page load that renders a form issues the token: it generates a random 256-bit value, sets it in a
  `__Host-cairn_csrf` cookie (`SameSite=Strict`, `HttpOnly`, `Secure` on https, `Path=/`), and returns it in
  the load data.
- A shared `CsrfField` component renders the value as `<input type="hidden" name="csrf">` inside each form.
- The guard, for any admin unsafe form POST, reads the cookie and the submitted field and compares them with
  a constant-time check. A match passes through to the action. A miss returns the branded 403 page.

A correct double-submit token gives a strong guarantee. A cross-site attacker cannot read the random field
value to replay it, and on https the `__Host-` prefix stops a subdomain from fixing the cookie to a value the
attacker knows. The guarantee does not lean on the browser honoring `SameSite`, and it reads no request
header, so it survives a privacy browser that strips `Origin` and `Referer` and the `Referrer-Policy:
no-referrer` the guard already sets on every admin response.

The rule is uniform and fail-closed, which is the maintainability win. A future admin form that omits
`CsrfField` is rejected in development immediately, rather than silently leaning on a cookie attribute set
elsewhere. The `SameSite=lax` session cookie stays in place as a second layer under the token.

### Rule 2: non-admin form POSTs restore the framework check

Disabling `checkOrigin` removes CSRF protection from a consuming site's own form actions, which sit outside
`/admin`. cairn caused that exposure, so cairn restores the equivalent. For any non-admin unsafe form POST,
the guard reproduces SvelteKit's check: the request passes when `Origin` equals `url.origin`, and is rejected
with a 403 otherwise. The behavior matches what the framework did before the consumer disabled it, so a site's
existing forms see no change.

One faithful-reproduction limit: the guard matches `url.origin` only and does not read a site's
`csrf.trustedOrigins`. A site that relied on `trustedOrigins` for a cross-origin form is rare, and the spec
records this as a known boundary rather than reaching for a config knob now.

## The token issued lazily and kept stable

The token must be stable across loads and tabs. If each load minted a fresh value and overwrote the cookie,
a second open admin tab would carry a stale field and the guard would 403 it. So the issuing helper is lazy:
it reuses a present, valid cookie and only generates and sets when the cookie is absent. One token serves the
whole browser session, set once on the first admin page load.

Three loads issue the token, covering every form:

- `loginLoad` (GET `/admin/login`) and `confirmLoad` (GET `/admin/auth/confirm`), for the two pre-auth forms.
- `layoutLoad`, the authed `(app)` shell load, for every authenticated form. `AdminLayout` already consumes
  this load's data, so it places the token in a Svelte context that every descendant form reads through
  `CsrfField`.

## Units

The work divides into small, independently testable pieces.

### `src/lib/auth/crypto.ts` (extend)

Add the two primitives next to their session siblings.

```ts
const CSRF_COOKIE_BASE = 'cairn_csrf';

/** The CSRF cookie name, __Host- prefixed when Secure, mirroring sessionCookieName. */
export function csrfCookieName(secure: boolean): string {
  return secure ? `__Host-${CSRF_COOKIE_BASE}` : CSRF_COOKIE_BASE;
}

/** A fresh 256-bit double-submit token, url-safe. */
export function generateCsrfToken(): string {
  return randomBase64Url(32);
}
```

### `src/lib/sveltekit/csrf.ts` (new)

The SvelteKit-event glue, so the guard and the loads share one source of truth.

- `isUnsafeFormRequest(request): boolean` reproduces SvelteKit's `is_form_content_type` over the three form
  content types, gated to `POST`/`PUT`/`PATCH`/`DELETE`.
- `originMatches(event): boolean` is the faithful `Origin === url.origin` check.
- `issueCsrfToken(event): string` returns a present valid cookie value, or generates one, sets the cookie
  (session-scoped, no `maxAge`), and returns it. Lazy and stable.
- `validateCsrfToken(event): Promise<boolean>` reads the cookie, reads the submitted `csrf` field from a
  clone of the request body so the action can still read the original, and compares them constant-time.
- `tokensMatch(a, b): boolean` is a length-checked constant-time string compare.

Cloning the body (`event.request.clone().formData()`) leaves `event.request` unconsumed for the action.
`Request.clone()` is standard in workerd and the form is small.

### `src/lib/components/CsrfField.svelte` (new)

A one-line shared component that renders `<input type="hidden" name="csrf" value={token}>`. It takes an
optional `token` prop and otherwise reads the token from the admin context that `AdminLayout` provides. The
two pre-auth pages pass the prop directly; the authenticated forms drop `<CsrfField />` with no prop. A form
that omits it fails the guard, which is the intended fail-closed signal.

### `src/lib/sveltekit/static-admin-page.ts` (new, refactor)

The HTTPS page and the new CSRF page share roughly 150 lines of inlined Warm Stone CSS, the brand tile, and
the document shell. Factor that into one helper.

- `renderStaticAdminPage({ title, innerHtml }): string` owns the doctype, head, the shared `<style>`, the
  brand tile, and the `<main>` wrapper. It receives trusted inner HTML that each page builds.
- `escapeHtml` and the `CAIRN_GLYPH` constant move here from `https-required-page.ts`.

`https-required-page.ts` shrinks to a builder of its eyebrow, heading, CTA, and Cloudflare-fix block, passed
to the helper. Its public function signature and output stay stable, pinned by the existing
`https-required-page.test.ts`.

### `src/lib/sveltekit/csrf-required-page.ts` (new)

The branded 403 page for a failed token check. It names the likely cause (a page left open across a browser
restart, or blocked cookies) and offers a "Back to sign-in" link to `/admin/login`. It does not mention
`Origin` headers, because the token path does not depend on them; a real failure here is a stale page, a
cookie problem, or a genuine cross-site attempt. It builds its inner HTML and calls `renderStaticAdminPage`.

### `src/lib/sveltekit/guard.ts` (extend)

The handle gains the two-rule CSRF gate. The order is deliberate.

```ts
return async function handle({ event, resolve }) {
  const { pathname } = event.url;

  // Rule 2 — non-admin: restore the framework's strict Origin check the consumer disabled.
  if (!isAdminPath(pathname)) {
    if (isUnsafeFormRequest(event.request) && !originMatches(event)) {
      return csrfForbidden(); // plain 403, faithful to core
    }
    return resolve(event);
  }

  // Deployed http admin → HTTPS help page (unchanged).
  if (event.url.protocol === 'http:' && !isLocalHost(event.url.hostname)) {
    return httpsRequiredResponse(event.url);
  }

  // Rule 1 — admin: every unsafe form POST carries a valid double-submit token.
  if (isUnsafeFormRequest(event.request)) {
    if (!(await validateCsrfToken(event))) return csrfRequiredResponse();
  }

  // Session gate for the authenticated subtree (unchanged).
  if (!isPublicAdminPath(pathname)) {
    /* resolveSession … redirect on miss … set event.locals.editor */
  }

  const response = await resolve(event);
  applySecurityHeaders(response.headers);
  return response;
};
```

The token check sits before the session gate, so a sign-in POST is validated without a session and an
authenticated POST is validated the same way. Logout is an admin form POST, so Rule 1 covers it with no
special case.

### `src/lib/sveltekit/auth-routes.ts` (extend)

`loginLoad` and `confirmLoad` each call `issueCsrfToken(event)` and add `csrf` to their returned data. No
action code changes: the guard validates the token before `resolve()` runs the action, so `requestAction` and
`confirmAction` keep their current bodies.

### The authed shell load (`content.layoutLoad`) (extend)

The `(app)` layout load issues the token and returns it, so the whole authenticated shell has it. `AdminLayout`
reads it from the layout data and sets the admin context the authenticated forms consume.

### Components that render an admin form (extend)

`LoginPage` and `ConfirmPage` gain `csrf: string` on their `data` prop and render `<CsrfField token={data.csrf} />`.
`AdminLayout` sets the context and renders `<CsrfField />` in its logout form. `EditPage`, `ConceptList`,
`NavTree`, and `ManageEditors` render `<CsrfField />` in each of their forms, reading the token from context. A
consuming site passes `{data}` straight through, so the site's `+page.svelte` shims need no edit.

## Security analysis

- One guard check validates every admin mutation, before and after sign-in, against the double-submit token.
  A cross-site forgery cannot supply the random field value, and the `__Host-` cookie on https blocks
  fixation. The check reads no request header, so a privacy browser passes and an attacker does not.
- The `SameSite=lax` session cookie remains as a second layer beneath the token on authenticated routes.
- The pre-auth endpoints carry low CSRF value to begin with (the request form only emails a link to the
  submitted address, and the confirm form still needs the unguessable token from the email), and the uniform
  token closes them anyway.
- Non-admin form POSTs keep the strict `Origin` check, equal to the prior framework behavior.

## What does not change

- The HTTPS-required behavior for a deployed http admin request stays exactly as 0.34 shipped it.
- `createAuthGuard()` keeps its signature. No new option is added.
- The auth actions keep their bodies and their non-leak properties.
- No public export is removed. `CsrfField` is added to the components surface, and the
  `LoginPage`/`ConfirmPage`/`AdminLayout` data shapes each gain one field, all noted in the changelog and the
  reference.

## Consumer migration

A breaking deploy requirement, stated on a `Consumers must:` line.

1. Add `csrf: { checkOrigin: false }` to `kit` in `svelte.config.js`. cairn now owns CSRF for the whole
   request surface through its guard.
2. Upgrade to the new version. The token wiring flows automatically through the engine's loads and components;
   a site using the canonical route structure changes no route code.

Both production sites are currently locked out of admin login under a privacy browser, so this publishes and
both sites adopt it at their retrofit.

## Testing

- `csrf.ts` unit: `isUnsafeFormRequest` across methods and content types, `originMatches` match and miss,
  `tokensMatch` equal and unequal and unequal-length, `issueCsrfToken` generates when absent and reuses a
  present cookie, `validateCsrfToken` with a matching cookie, a missing cookie, a mismatched field, and a body
  the action can still read after the clone.
- `crypto.ts` unit: `csrfCookieName` prefix on https and bare on http, `generateCsrfToken` length and
  url-safety.
- `auth-guard` integration: a non-admin unsafe POST rejected on `Origin` mismatch and passed on match; a safe
  GET passed; a non-form POST passed; an admin form POST passed with a valid token and served the branded 403
  without one; an authenticated admin POST with no `Origin` but a valid token passed; the deployed-http HTTPS
  page regression held.
- `auth-routes` unit: `loginLoad` and `confirmLoad` set the CSRF cookie and return a non-empty `csrf`; the
  shell load returns the token.
- Component: `CsrfField` renders the hidden field from a prop and from context; `LoginPage`, `ConfirmPage`,
  and each authenticated form component include it.
- `static-admin-page` unit: both pages render, and a hostile href is escaped (the HTTPS page test is extended
  or mirrored).
- `csrf-required-page` unit: status, the brand marker, and the recovery link are present.

## Documentation

- `docs/guides/deploy-to-cloudflare.md`: add the `csrf: { checkOrigin: false }` step and why it is required,
  alongside the existing force-HTTPS step.
- `docs/guides/upgrade-cairn.md` and `CHANGELOG.md`: the `Consumers must:` line.
- `docs/explanation/security-model.md`: document cairn as the CSRF authority, the uniform double-submit token,
  the lazy-stable issuance, and the non-admin restoration.
- `docs/admin-route-structure.md`: a note that the canonical structure now assumes `checkOrigin: false`.
- `docs/reference/components.md`: the new `CsrfField` export and the updated data shapes.

## Versioning

A breaking minor over the published `0.34.0`, so `0.35.0`, with a `Consumers must:` line. The window publishes
before the site retrofits consume it.

## Out of scope

- A `csrf.trustedOrigins` equivalent in the guard. Recorded as a known boundary of the non-admin reproduction.
- An opt-out option on `createAuthGuard()` for a site that wants to manage non-admin CSRF itself. No site needs
  it today, so it stays out under YAGNI.
- A synchronizer (server-stored) token. The double-submit token with the `__Host-` prefix is the right weight
  for a sessionless form and needs no D1 write or signing secret.
