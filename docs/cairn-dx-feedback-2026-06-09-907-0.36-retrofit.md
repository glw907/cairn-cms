# cairn DX feedback: two findings from the 907.life 0.36.0 retrofit

Filed 2026-06-09 while retrofitting 907.life from `@glw907/cairn-cms@^0.24.0` to `^0.36.0` (the first
site to cross the `0.35.0` CSRF and `0.36.0` logging window). The retrofit landed and deployed clean,
and the live site verified cairn's CSRF ownership end to end (see the closing note). Two engine-level
findings surfaced along the way. Neither blocks a consumer today; both are worth an engine pass.

## Finding 1: `csrf.checkOrigin` is deprecated in SvelteKit 2.61

cairn's `0.35.0` guidance is to set `csrf: { checkOrigin: false }` in `svelte.config.js`. SvelteKit
2.61.1 prints this on every `svelte-check` and build:

```
`config.kit.csrf.checkOrigin` has been deprecated in favour of `csrf.trustedOrigins`. It will be
removed in a future version
```

The setting still works in 2.61, so the consumer build stays green and the admin login works. The
warning is the issue. cairn documents the deprecated spelling across `docs/guides/deploy-to-cloudflare.md`,
`docs/admin-route-structure.md`, `docs/guides/upgrade-cairn.md`, `CHANGELOG.md`, and `docs/STATUS.md`, so
every consumer that follows the guide inherits a standing deprecation warning, and the setting is on a
removal path.

`trustedOrigins` is not a drop-in replacement. cairn's own login-CSRF design spec records that no
`trustedOrigins` entry escapes the check for a request that sends no `Origin` header, which is the exact
JS-free magic-link case `0.35.0` fixed. So a consumer cannot simply switch to `trustedOrigins: ['*']`
without risking the bug back. The fix is an engine decision, not a per-site one: settle the
forward-compatible CSRF-disable story (what a consumer sets once SvelteKit removes `checkOrigin`), then
update the guide, the upgrade guide, and both consumer sites together. The engine spec already names a
`trustedOrigins` equivalent in the guard as a known boundary; this is the deprecation that puts a clock
on it.

## Finding 2: the local admin smoke is unreachable on a `custom_domain` site

`docs/admin-smoke-test.md` says "wrangler dev over http is exempt" from the `0.34.0` HTTPS-required page,
and its curl checklist expects `http://localhost:8787/admin/login` to return `200`. On 907.life that
returns `400`, the branded "admin needs a secure connection" page.

The cause is the site's route. 907's `wrangler.toml` declares `[[routes]] pattern = "907.life"` with
`custom_domain = true`. Under `wrangler dev`, the worker then resolves `event.url` to `https://907.life`
regardless of the local request host, so the guard's deployed-http branch
(`event.url.protocol === 'http:' && !isLocalHost(event.url.hostname)`) sees host `907.life`, not
`localhost`, and serves the help page. Hitting `127.0.0.1` or sending `Host: localhost` does not change
it, because the host is fixed by the route, not read from the request. `isLocalHost` is correct; it never
gets a local hostname to match.

The effect is that the documented local http smoke cannot reach `/admin/login` on any site that uses a
`custom_domain` route, which both production consumers do. The smoke's value (an inserted-session authed
checklist with no email loop) is blocked at the first step. Options for the engine: note the
`custom_domain` caveat in `docs/admin-smoke-test.md` and give a local-smoke recipe that works (for
example a dev-only origin override, or a documented way to run `wrangler dev` without the custom-domain
route), or treat a `wrangler dev` request as local by a signal other than the hostname.

## Closing note: the live retrofit verified CSRF ownership

The engine deferred the real-runtime CSRF verification to the first site retrofit. The deployed
`https://907.life` confirms it: `/admin` redirects to `/admin/login`, and the login page returns `200`,
renders chrome-free with the `cairn-admin` shell, sets the `__Host-cairn_csrf` cookie, and carries the
`name="csrf"` hidden field. The `0.34.0` HTTPS-required page does not fire over https. The one step left
manual is the magic-link email click, since the token is emailed and cannot be scripted.
