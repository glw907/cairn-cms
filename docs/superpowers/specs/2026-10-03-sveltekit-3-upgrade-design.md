# SvelteKit 3 upgrade: design

Status: draft for Geoff's read, 2026-10-03. Input: the survey
`docs/superpowers/research/2026-10-04-sveltekit-3-survey.md` and a verification read of the published
tarballs (`@sveltejs/kit` 3.0.0, `@sveltejs/adapter-cloudflare` 8.0.0, both npm `latest` with no later
patch) and the WHATWG Fetch spec, summarized under Evidence below.

## Goal

The engine, the showcase, the Waymark template, `create-cairn-site`, `@glw907/cairn-cms-dev`, and the Go
doctor move to SvelteKit 3 and adapter-cloudflare 8, so a fresh `sv create` project installs cairn.

## Settled decisions

- **Debt-free (Geoff, 2026-10-04).** No compatibility shim, no deprecated 3.x API, no hand-built
  mechanism Kit 3 now provides, and no site config kept only for cairn's sake. The peer range is
  `@sveltejs/kit` `^3` only. Supporting Kit 2 beside it would need a dual-read env shim, a local
  `Handle` type, conditional redirect typing, and a doubled test matrix (survey, "Side-by-side").
- **The three survey opportunities are taken (Geoff, 2026-10-04).** That covers retiring the
  hand-built Origin check, one env accessor, and `paths.origin` where a library can read it. The
  third resolves to no change; see "Public origin".
- **Release (Geoff, 2026-10-03).** The pass closes unreleased under `## Unreleased`. Kit 3 publishes
  together with draft docs stage 2a, so the release ships the rebuilt extend arm.
- **Consumers (Geoff, 2026-10-03).** cairn.pub is the only existing site that migrates, in its own
  site pass after the cut. ecxc-ski, 907-life, aksailingclub-org, and xcathletes-org are rebuilt
  from scratch on the new docs, and that rebuild doubles as the docs test. The `Consumers must:` list
  serves cairn.pub and outside adopters.
- **Sequencing with stage 2a.** The add-cairn tutorial's Kit 2 pin lives on the `draft-docs-2a`
  worktree. This pass doesn't edit that branch. Kit 3 lands on `main` first, and 2a rewrites the
  tutorial against Kit 3 when it rebases. STATUS carries this as a 2a carry-forward.

## Evidence the design rests on

Each claim was read from the tarball or the spec; the pass's pre-flight re-checks the ones a task
depends on.

- **`platform` is gone.** Adapter 8's worker calls `server.respond(req, { getClientAddress })` with
  no platform, and its types carry no `Platform` (changelog: "remove cloudflare `platform`, emulate
  the `cloudflare:workers` module instead", #16754). `env` and `waitUntil` come from
  `cloudflare:workers`, `cf` from `request.cf`, and `caches` is a global.
- **`cloudflare:workers` resolves through Vite in dev.** The adapter's plugin resolves the
  id to a stub that proxies `getPlatformProxy().env` through AsyncLocalStorage, with `waitUntil`
  a no-op. The build rewrites the stub to the literal import. A dependency that Vite externalizes
  in SSR is loaded by Node, which can't resolve the id. Cairn ships `.svelte` files, so
  vite-plugin-svelte normally bundles it, but nothing proves this for an installed tarball yet.
  `vite preview` behavior is also unproven.
- **`paths.origin` is build-time only.** It is a config key that Kit bakes into a define, read only
  by `respond.js` and `csrf.js`. No `$app/*` module exports it.
- **Kit 3's CSRF check** (`runtime/server/csrf.js`, `respond.js:98-133`) rejects a POST, PUT, PATCH,
  or DELETE whose content type is a form type or absent, when the Origin header differs from
  `paths.origin || url.origin` and isn't in `csrf.trustedOrigins`. A missing Origin and `null` both
  reject. The check runs ahead of `handle`, and it is skipped in dev.
- **Referrer-Policy decides the Origin.** In a non-CORS POST, the Fetch spec's "append a request
  `Origin` header" serializes `null` under `no-referrer`. Under `strict-origin` it sends the real
  origin over HTTPS. `strict-origin` also limits every Referer to the bare origin, so a token in the
  URL never travels in one.
- **Config moves into the Vite plugin.** `svelte.config.js` is a build error in Kit 3. The plugin form
  `sveltekit({ adapter, ... })` has worked since Kit 2.62.
- **`Handle` moved to `@sveltejs/kit/hooks`.** `RequestEvent`, `redirect`, `error`, `fail`, and the
  `is*` guards stay on `@sveltejs/kit`. An external `redirect` needs `{ external: true }`.

## Design

### Bindings: one accessor over `cloudflare:workers`

Every engine read of `event.platform` (62 reads across 25 files under `src/lib`) goes through one
internal accessor, `cairnEnv(event)`. It returns the site's bindings from `cloudflare:workers`'s
`env`. Background work that used `platform.context.waitUntil` uses the module's `waitUntil`.

The dev backend needs a way in, since `@glw907/cairn-cms-dev` installs its D1, R2, and Anthropic
doubles on `platform.env` today. The accessor reads an override that the dev handle sets on
`event.locals` (an internal, documented-as-dev-only key), layered over the real `env`. This keeps
the dev package's no-cloud-accounts promise. Swapping its doubles for wrangler's local emulation
would add a local D1 migration and seed step to every developer's setup, so that change stays out
of this pass.

`CairnPlatformBindings` stays the public name for the binding shape. Its definition is re-expressed
as the interface a site's `wrangler types` `Env` satisfies, and the reference page shows that
check. `App.Platform` is deleted from the showcase, Waymark, and the scaffold.

The engine is Cloudflare-only by charter, so the guard's and the auth-channel factory's
`process.env` reads of the dev-backend flag retire with the `adapter-node` comment. Tests fake the
module with a vitest alias for `cloudflare:workers` that points at a settable fake.

### CSRF: Kit's check runs everywhere

Today the site sets `csrf: { checkOrigin: false }`, because cairn's admin responses serve
`Referrer-Policy: no-referrer` and a form POST from them arrives with `Origin: null`. Guard Rule 2
(`guard.ts:202-209`) then rebuilds Kit's Origin check by hand for non-admin paths, through
`originMatches` (`csrf.ts`).

After the change:

- `applySecurityHeaders` (`admin-response.ts:38`) and the confirm page (`auth-routes.ts:293`)
  serve `Referrer-Policy: strict-origin`. The magic-link token still never reaches a Referer, and
  every same-origin POST carries its real Origin.
- The site carries no `csrf` config, so Kit's default check covers every route, admin included.
- Guard Rule 2, `originMatches`, the `auth.csrf-origin-mismatch` condition, the
  `config.csrf-disable-missing` condition, and the doctor's `check_csrf.go` are deleted.
  `isUnsafeFormRequest` goes too unless another caller remains.
- The admin's double-submit token (`__Host-cairn_csrf`, guard Rule 3, `createAdminAction`) stays.
  It covers what Kit's check doesn't: JSON and raw-body transports authenticated by the
  `X-Cairn-CSRF` header, and dev, where Kit skips its check.
- `/preview/[token]` keeps `no-referrer`. It serves GET only, so no POST depends on its Origin.
- The `config.no-referrer-blanket` condition stays, reworded: a site-wide `no-referrer` now trips
  Kit's own check instead of cairn's.

Two costs, both accepted:

1. **Logging.** A cross-origin form POST on a non-admin path gets Kit's plain 403 ("Cross-site POST
   form submissions are forbidden") instead of cairn's condition page. `guard.refused` loses its
   `origin` reason, because Kit rejects before `handle` runs, so no cairn log event records it.
2. **Dev.** Non-admin forms lose Origin enforcement in `vite dev`, where Kit skips its check. Admin
   forms keep the double-submit token in dev.

A `web-auth-security-reviewer` reads this section before the CSRF task is dispatched. The read
covers the Referer exposure of the confirm URL under `strict-origin`, including the redirect hop
after the POST. It also covers whether any engine endpoint accepts a cross-site simple-content-type
request that neither Kit's check nor the token covers.

### Public origin

`paths.origin` can't replace `PUBLIC_ORIGIN` in `csrfSecure` and `readPublicOrigin`, because a
library can't read it at runtime. The magic-link URL must keep coming from configuration rather than
the request's Host, so `PUBLIC_ORIGIN` stays. The spec records this as the evidence the survey asked
for.

### Kit 3 API moves

- `Handle` imports from `@sveltejs/kit/hooks` in the engine (`guard.ts`), the dev package, and every
  template `hooks.server.ts`.
- The identity `logoutUrl` redirect (`auth-routes.ts:474`) passes `{ external: true }`. The guard's
  existing validation (`guard.ts:127-150`) stays.
- The 4.0 deprecations move now: `$app/environment` becomes `$app/env`, `invalidateAll` becomes
  `refreshAll`, and the `json` and `text` helpers become `Response.json` and `new Response`.
- Templates use `#lib` in place of `$lib`.
- The `handleError` comments at `section-action.ts:118` and `admin-action.ts:60` are re-read
  against Kit 3, which now passes every error. Each is fixed only if it misstates the behavior.
- Peer floors follow Kit 3: svelte `^5.57.1`, vite `^8.0.12`, `@sveltejs/vite-plugin-svelte` `^7`,
  wrangler `^4.118`, and Node `>=22.17` (already met).

### Config in the Vite plugin

The showcase, Waymark, and the `create-cairn-site` scaffold move their configuration into
`sveltekit({ ... })` in `vite.config` and delete `svelte.config.js`. The Go doctor reads config from
the Vite config wherever it read `svelte.config.js`. Its CSRF check retires, and its live
`tool/internal/spine/conditions.json` and `doctor/site-config-path.json` contracts change, a break
the tool's changelog discloses.

## Segments

Each segment ends on a green commit. The plan sets tasks, files, and gates.

- **S0, spike (throwaway; gate for the bindings design).** Install a packed cairn tarball in a fresh
  Kit 3 / adapter 8 project that has no `ssr.noExternal`. Prove that a `cloudflare:workers` import
  inside cairn resolves under `vite dev`, `vite build`, `vite preview`, and `wrangler dev`. Prove that
  a `locals` override reaches it, and that a vitest alias fakes it. If the module needs site config to
  resolve, the pass stops. That is an architectural fork for Geoff.
- **S1, groundwork on Kit 2.** The 4.0 deprecations, plus moving config into the Vite plugin for the
  showcase and Waymark. Both work on Kit 2.70, which keeps S2 small.
- **S2, the bump (one atomic task, upshifted to Opus).** The versions and peer floors, the bindings
  accessor across the engine and the dev package, `CairnPlatformBindings`, `App.Platform`,
  `Handle`, the external redirect, and `#lib`.
- **S3, CSRF.** After the security read: the Referrer-Policy change, the deletions, and the
  condition rewording. A real-Chromium e2e under `vite preview` proves three things: an admin form
  POST and a non-admin form POST pass, and a cross-origin form POST is refused. A mutation proof
  shows that restoring `no-referrer` fails the e2e.
- **S4, scaffold, doctor, and docs.** `create-cairn-site` at the Kit 3 shape, the doctor change
  (pass class `tool`), the docs, and the kit#15992 watch retirement, which covers the scheduled
  routine, the `CLAUDE.md` watch line, and the two ROADMAP mentions.

## Pass class and close

The pass class is `auth-data`, because S2 and S3 touch the guard, the CSRF path, and the auth store's
binding reads. The doctor task is `tool`, and the docs task is `docs`. The close runs the full gate.
It proves the consumer build from scratch and fans out four reviewers: `web-auth-security-reviewer`,
`svelte-reviewer`, `cloudflare-workers-reviewer`, and a `go-architecture-reader` per touched Go
package. The live auth smoke follows, and it needs Geoff's magic-link click.

## Docs and records

- Reference pages: `admin-routes.md` (`CairnPlatformBindings`, the CSRF handoff),
  `cli-cairn-doctor.md`, `cli-cairn-json-output.md`, `supported-toolchain.md`, and `log-events.md`
  (`guard.refused` loses `origin`). Any page that names `svelte.config.js`, `platform.env`, or
  `checkOrigin` is repointed. `check:surface -- --update` regenerates `api-surface.md`.
- Facts bullets for every public-behavior change. The CHANGELOG under `## Unreleased`, plus
  `migration-notes.md` and `upgrade-cairn.md`.
- Friction log: `f:skeche` and `f:ghzx9c` close.
- `docs/internal/durable-gotchas.md` gains the `cloudflare:workers` resolution facts S0 proves.

### Consumers must (draft, finalized at the close)

- Move `svelte.config.js` into `sveltekit({ ... })` in `vite.config`, and delete the file.
- Delete `csrf: { checkOrigin: false }`, and add no `csrf` config.
- Delete `App.Platform` from `app.d.ts`. Run `wrangler types`, and type bindings from its `Env`.
- Import `Handle` from `@sveltejs/kit/hooks`, and replace `$lib` with `#lib`.
- Upgrade to wrangler `>=4.118` and svelte `>=5.57.1`.
- A site that read `event.platform` in its own code switches to `cloudflare:workers`.

## Out of scope

- Remote functions, which stay experimental in Kit 3.
- Draft docs task 8 and the add-cairn tutorial rewrite (2a's).
- cairn.pub's migration (its own site pass) and the four site rebuilds.
- Replacing the dev package's doubles with wrangler local emulation.
