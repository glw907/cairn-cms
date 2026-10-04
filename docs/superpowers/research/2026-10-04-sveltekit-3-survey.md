# SvelteKit 3 and cairn: survey for the upgrade pass (2026-10-04)

Agent-facing input for planning the SvelteKit 3 upgrade pass. One research agent read the primary sources and the
published tarballs (`npm pack` of kit 3.0.0, kit 2.70.3, adapter-cloudflare 8.0.0) and grepped the repo. The planning
session re-verifies each claim at HEAD before a task depends on it; items marked UNVERIFIED have no primary source yet.
Governing goal (Geoff, 2026-10-04): the upgrade takes on no technical debt.

Sources: kit CHANGELOG 3.0.0 (https://github.com/sveltejs/kit/blob/main/packages/kit/CHANGELOG.md), adapter-cloudflare
CHANGELOG 8.0.0 (https://github.com/sveltejs/kit/blob/main/packages/adapter-cloudflare/CHANGELOG.md), the migration
guide (https://svelte.dev/docs/kit/migrating-to-sveltekit-3), and the announcement
(https://svelte.dev/blog/sveltekit-3-is-here).

## Floors

Kit 3.0.0 peers on vite ^8.0.12, svelte ^5.57.1, typescript ^6.0.0, and @sveltejs/vite-plugin-svelte ^7.0.0, with
engines node >=22.17. adapter-cloudflare 8.0.0 peers on wrangler ^4.118.0 and kit ^3, and depends on
@cloudflare/workers-types ^5.20260813. cairn already meets these except its svelte peer (`^5.56.10`, package.json:222).

## Required changes, by blast radius

1. **adapter 8 removes `event.platform`** (#16754). The guide says to import `env` and `waitUntil` from
   `cloudflare:workers` and type them with `wrangler types`. cairn has 62 `.platform` reads in 25 files under src/lib
   (guard, csrf, env, dev-flag, auth-channel factory, audit sink, media route, every content route), 9 in the showcase
   and Waymark, and `App.Platform` in both app.d.ts files. `CairnPlatformBindings` (docs/reference/admin-routes.md:191)
   is a public seam. Debt-free form: one internal env accessor over `cloudflare:workers`, `CairnPlatformBindings`
   re-expressed as the shape a site's `wrangler types` `Env` satisfies, and `App.Platform` deleted. Open: how vitest
   fakes `cloudflare:workers` once fake events stop carrying `platform` (UNVERIFIED).
2. **`csrf.checkOrigin` is removed** (#15437); setting it is a build error. The typed replacement is
   `trustedOrigins: ['*']`. Kit 3's check still rejects a missing or mismatched Origin, now also a POST with no
   Content-Type, with no per-path exemption and no token. New primitive: `paths.origin`. Affected: both
   svelte.config.js files (:55), `src/lib/diagnostics/conditions.ts:103-111`, `tool/internal/doctor/check_csrf.go`, and
   three reference pages. The minimal swap keeps a site config held only for cairn and keeps guard Rule 2
   (`guard.ts:202-209`), which rebuilds Kit's Origin check by hand. Debt-free candidate, needing a
   web-auth-security-reviewer read: cairn's own `Referrer-Policy: no-referrer` (`admin-response.ts:38`,
   `auth-routes.ts:293`) is what makes admin POSTs send `Origin: null`. Serving `same-origin` or `strict-origin`
   instead would let Kit's built-in check run everywhere, deleting guard Rule 2, `originMatches` (`csrf.ts:94`), the
   doctor check, the condition, and the site's `csrf` config. Open: real-browser behavior of a JS-free POST without
   `no-referrer`, and the magic-link token's Referer exposure on same-origin navigations (UNVERIFIED).
3. **Hook types moved to `@sveltejs/kit/hooks`** (#16737). `createAuthGuard(): Handle` (`guard.ts:4`, `:166`) and three
   site hooks files import `Handle` from the old path. Kit 2.70's `/hooks` does not export it.
4. **External redirects need an opt-in** (#16198): `redirect(status, url, { external: true })`. Affects
   `auth-routes.ts:474` (the identity `logoutUrl`, validated at `guard.ts:127-150`).
5. **Config moves into the Vite plugin**; svelte.config.js is no longer supported. Affects the showcase, Waymark, the
   create-cairn-site scaffold, and the doctor's svelte.config.js heuristics.
6. **Template-only:** `$lib` becomes `#lib` (3 imports); `json()` is deprecated, so the healthz routes use
   `Response.json`.

## Deprecated in 3.x, removed in 4.0, with cairn hits

`$app/environment` to `$app/env` (`EditPage.svelte:25`, `preview.ts:436`); `invalidateAll` to `refreshAll` (11 admin
hits); the `json` and `text` helpers in the templates. Each replacement also exists in kit 2.70.

## Opportunities, ranked

1. Retire cairn's hand-built Origin check and the site's `csrf` config (required item 2). Leanest win on offer.
2. One env accessor over `cloudflare:workers` in place of 62 scattered reads (required item 1). Changes the public
   bindings contract.
3. `paths.origin` might replace cairn's `PUBLIC_ORIGIN` logic in `csrfSecure` and `readPublicOrigin`; no public runtime
   export found (UNVERIFIED, a lead only).
4. `handleError` changes: re-read the comments at `section-action.ts:118` and `admin-action.ts:60`; likely docs only.

## Not adopted or irrelevant

Remote functions stay experimental (`experimental.remoteFunctions` plus async Svelte); adopting them would make every
site opt into an experimental flag, so form actions stay. Unaffected: `$app/manifest`, service-worker changes, shallow
routing, `QUERY`, polling and preload defaults, Node polyfills, the Builder API, param matchers, OTel tracing, cookie v2
and the cookie `path` default (every cairn `cookies.set` passes a path). `fail()` status as HTTP status touches only
tests asserting 200. Enhanced cross-page actions don't apply (the shell's publishAll and logout forms aren't enhanced).
The `$app`-free root-barrel rule still matters.

## Side-by-side Kit 2 and 3

The env access (adapter 7 `platform` vs adapter 8 `cloudflare:workers`), the `Handle` import path, and the `redirect`
signature cannot be shared. Supporting both needs a dual-read env shim, a local handle type, conditional redirect
typing, two app.d.ts shapes, and a doubled test matrix, all debt under the governing goal. A `^3`-only peer instead
puts the four sites through one `Consumers must:` list: Vite-plugin config, `#lib`, `wrangler types`, delete
`App.Platform`, drop or replace the `csrf` config, wrangler >=4.118, svelte >=5.57.1.
