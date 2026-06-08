# cairn DX feedback: login CSRF failure and a copy tell (ecnordic 0.33.0)

Filed 2026-06-07 from ecnordic.ski running `@glw907/cairn-cms@0.33.0`, on the first real admin login
against the deployed Worker. Two findings: a magic-link login that fails with a SvelteKit CSRF 403, and an
AI-writing tell in the login page copy. Neither is fixed yet. This note is the handoff.

## Finding 1: the JS-free auth forms are fragile to the host's HTTP/HTTPS scheme

### Symptom

Signing in at `/admin` on the deployed site returns `Cross-site POST form submissions are forbidden`. That
string is SvelteKit core's CSRF guard, not cairn code. The guard rejects any form-content-type POST whose
`Origin` header does not exactly equal the request's `url.origin` (scheme plus host).

`LoginPage.svelte` (email entry) and `ConfirmPage.svelte` (the magic-link confirm) both submit a JS-free
plain `<form method="POST">`. They carry no `use:enhance` and no fallback, so each one depends entirely on
the browser sending an `Origin` that matches the request's scheme and host. cairn already documents the
dependency in `docs/admin-smoke-test.md:84` and the auth-hardening design keeps the SvelteKit check on by
choice. The gap is a deployment requirement that the guides do not state.

### Evidence (all reproduced against the live ecnordic.ski Worker with curl)

The CSRF guard works exactly as designed. `url.origin` tracks the scheme of the incoming request:

| Request scheme | `Origin` header sent | Result |
|---|---|---|
| https | `https://ecnordic.ski` | 200, passes |
| https | none | 403 CSRF |
| https | `http://ecnordic.ski` | 403 CSRF (scheme mismatch) |
| https | `https://www.ecnordic.ski` | 403 CSRF (host mismatch) |
| http | `http://ecnordic.ski` | 200, passes |
| http | `https://ecnordic.ski` | 403 CSRF (scheme mismatch) |

So the server is correct. A compliant browser at `https://ecnordic.ski` sends `Origin: https://ecnordic.ski`
and passes. The failure is a request arriving with a mismatched or absent `Origin`.

The site config makes the mismatch reachable. The zone does not force HTTPS:

- `http://ecnordic.ski/admin/login` serves `200` over plain HTTP (no edge redirect to https).
- `http://ecnordic.ski/admin` returns `303` to `http://ecnordic.ski/admin/login`, and the redirect keeps the
  `http` scheme. The auth guard builds the redirect URL from the incoming request, so an http request
  yields an http `Location`.
- HSTS is present on https responses (`max-age=63072000; includeSubDomains`). A browser that has cached HSTS
  upgrades to https first; a first visit over http (no cached HSTS) stays on http, because a browser ignores
  HSTS delivered over http.

The two realistic real-world triggers: a cross-scheme flow, where the page loads or posts over http while
the other half is https (possible only because the site does not force https), and a request that reaches
the Worker with no `Origin` header at all. Either one produces the identical 403.

### Fix candidates (pick at the cairn or the site layer)

1. **Site/Cloudflare (smallest, highest confidence).** Turn on "Always Use HTTPS" on the zone so the edge
   redirects every http request to https before it reaches the Worker. With HSTS already set, the scheme is
   then locked and the cross-scheme class of failures is gone. This is an ecnordic config change, not a
   cairn change, but cairn should require it (see 2).

2. **cairn docs.** Add a hard requirement to `docs/guides/deploy-to-cloudflare.md`: a consuming site must
   force HTTPS (Always Use HTTPS plus HSTS), because the magic-link auth POST depends on a stable https
   `Origin`. Cross-reference the `docs/admin-smoke-test.md:84` note so the requirement and the smoke step
   sit together.

3. **cairn engine (optional, a design call).** Make the auth POST resilient to a missing or http `Origin`.
   `use:enhance` does not help, since an enhanced submit still sends a form content type and hits the same
   guard. Submitting the auth POST as a `fetch` with `application/json` would bypass SvelteKit's
   `is_form_content_type` gate, but that removes the framework's CSRF protection for the route, so cairn
   would then owe its own origin or double-submit-token check. This trades the JS-free property for
   resilience; weigh it against the auth-hardening design's intent to lean on the framework guard.

The conservative path is 1 plus 2: force HTTPS and document it. Reach for 3 only if you want the auth flow
to survive a misconfigured host.

## Finding 2: an AI-writing tell in the login copy, and why the prose gate missed it

`src/lib/components/LoginPage.svelte:46`:

> Enter your email and we'll send you a one-time sign-in link. No password to remember.

"No password to remember." is a tacked-on marketing fragment, the kind of closer the prose standard treats
as a tell. The first sentence carries the whole meaning on its own.

A plain rewrite, for the cairn voice to confirm:

> Enter your email. We'll send a one-time sign-in link.

### Why ecnordic's prose-guard did not catch it

The `prose-guard` hook runs as a `PreToolUse` guard on Write and Edit of files in the repo being edited, and
its general tier covers `src/content/**`. This string lives in the cairn-cms library and ships compiled into
`node_modules` at the consuming site, so ecnordic never writes it and the hook never sees it. The copy can
only be guarded in this repo.

Sub-finding: cairn-cms component copy is outside any consumer's prose gate, so it needs its own check here.
A prose pass over the user-facing strings in `src/lib/components/*.svelte` (login, confirm, the admin shell,
the editor) would catch this class before it ships in the package.
