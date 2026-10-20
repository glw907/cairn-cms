# SvelteKit 3 spec review: mechanics and feasibility lens

Target: `docs/superpowers/specs/2026-10-03-sveltekit-3-upgrade-design.md` at `d5c2ca98`. Lens: does
every mechanism behave as the spec states? Pass class `auth-data`. Each verdict rests on source
quoted from the unpacked tarballs (`~/.cache/kit3-research/{kit,cf}/package`) or on a probe run.

Probe rig: `~/.cache/kit3-review/app`, a fresh Kit 3.0.0 / adapter-cloudflare 8.0.0 / Vite 8.3.2
project with no `ssr.noExternal`. It installs `fakelib`, a packed tarball (a real directory in
`node_modules`, not a symlink) shaped like cairn. Its root export carries a `svelte` condition and
ships a `.svelte` file. Its `./server` subpath has no `svelte` condition and does
`import { env } from 'cloudflare:workers'`. A Chromium probe (`refprobe.mjs`) covers
Referrer-Policy.

Counts: 2 blockers, 2 majors, 6 minors, 2 over-ceremony items.

## Verified as stated (no action)

- **CSRF conditions and ordering.** `csrf.js:37-43` rejects when the content type is absent or a
  form type, the method is POST, PUT, PATCH, or DELETE, and `request_origin !== self_origin`
  (null or missing included). The check sits at the top of `internal_respond`
  (`respond.js:101-133`). `hooks.handle(` is called at `respond.js:497`, so Kit rejects before
  cairn's `handle` runs. The block is gated `if (!__SVELTEKIT_DEV__)`, and
  `vite/index.js:493` defines `__SVELTEKIT_DEV__: s(!is_build)`.
- **Dev skip, build enforcement (probe).** `vite dev` returned 200 to a cross-origin form POST.
  Under `wrangler dev` on the build, the evil origin, `null`, and a missing Origin each got
  `403 {"message":"Cross-site POST form submissions are forbidden"}`. A same-origin POST got 200.
  An `application/json` POST is not screened.
- **`checkOrigin` is a hard error.** `options.js:94` reads
  `checkOrigin: removed(e.config_option_removed_check_origin)`. The "Delete `csrf: { checkOrigin: false }`"
  line is therefore mandatory for every consumer, which the Consumers-must list already implies.
- **Referrer-Policy governs the form POST (Chromium probe).** The page sets the policy as an HTTP
  response header and posts a JS-free form:
  - `no-referrer` sends `origin=null`.
  - `strict-origin` sends the real origin with `referer=http://localhost:4320/`, the bare origin.
  - `same-origin` sends the real origin, but its Referer carries the full URL including
    `token=SECRET`. That supports choosing `strict-origin` over `same-origin`.
- **No other Referer dependency.** `grep -rni referrer src/lib` hits only the three
  `no-referrer` header sites, the `config.no-referrer-blanket` condition, and `rel="noreferrer"`
  on rendered anchors. No engine code reads a Referer.
- **vite-plugin-svelte 7 puts cairn in `ssr.noExternal`.** `vite-plugin-svelte/src/utils/options.js:490-505`
  treats a package as a framework package when `hasSvelteCondition || hasSvelteField`.
  `vitefu/src/index.js:117-121` crawls the root's `dependencies` and `devDependencies`. At
  `:178-180`, a framework dep runs `ssrNoExternal.push(dep)` by package name, so subpaths without
  the `svelte` condition (`/auth-channel`) are included. The probe confirms it:
  - `fakelib/server` (no svelte condition) resolved `cloudflare:workers` under `vite dev`.
  - It was bundled into `.svelte-kit/output/server/entries/endpoints/env/_server.js` under
    `vite build`.
  - It served correctly under `wrangler dev`.
  - `@glw907/cairn-cms-dev` also carries a `svelte` condition, so it is noExternal too.
- **Every `.platform` read has an event in scope.** All 80 grep hits in `src/lib` (62 are reads)
  sit inside request handlers or helpers that take the event. No read happens at module init.
  - The two `waitUntil` consumers attach `.catch()` before the handoff, so the dev stub's no-op
    `waitUntil` orphans nothing: `factory.ts:848`, and `audit-sink.ts` through its own try/catch.
  - The one cached read (`factory.ts:121`, the flag cache) is lazy, on the first request.
- **The 4.0 deprecations work on Kit 2.70.3** (S1 is feasible). The installed kit has
  `src/runtime/app/env/` and `refreshAll` at `client.js:2407`.

## Correctness findings, ranked by consequence

### M1. blocker. The guard's env read crashes prerendering, so the showcase build fails

- **Location:** spec lines 66-68 and 161-163, plus `guard.ts:195`.
- **Defect:** The guard reads the dev-backend flag from env on every request, before the
  non-admin branch. Kit runs `handle` during prerendering. At build time
  `globalThis.__sveltekit_cloudflare_platform` is unset, because the adapter sets it only in
  `configureServer` and `configurePreviewServer` (`cf/index.js:225-241`). The stub then throws
  on any property access (`virtual-cloudflare-workers.js:19`): `Cannot access cloudflare:workers
  in a prerenderable route`.
- **Probe:** A hook doing `env.CAIRN_DEV_BACKEND` on every request, plus one
  `export const prerender = true` page, produced:
  `Error: Cannot access cloudflare:workers in a prerenderable route ... 500 GET /about ... error
  during build: [Error: Prerendering failed]`.
- **Blast radius:** The showcase prerenders its public routes
  (`examples/showcase/src/routes/(site)/...`, `feed.json`). After S2, every consumer build with a
  prerendered page fails the same way.
- **Fold:**
  - Gate the guard's flag read on `building` from `$app/env`. The probe passes with
    `if (!building) { env.CAIRN_DEV_BACKEND }`.
  - Or move the read below the non-admin early return. That trades the all-paths tripwire for
    admin-only, so prefer the `building` gate.
  - Add an acceptance criterion: no engine `cairnEnv` read is reachable from a prerendered
    request. Give S0 and the S2 gate a prerendered route.

### M2. blocker. `vite preview` cannot start once any server module imports `cloudflare:workers`

- **Location:** spec lines 41-46, 154-158 (the S0 preview arm), 164-167 (the S3 e2e), and
  `examples/showcase/playwright.config.ts:35`.
- **Defect:**
  - `adapt()` rewrites the stub to the literal specifier in place in `output/server`
    (`cf/index.js:89`, `replace_stub`).
  - Kit's preview then imports that directory in Node (`kit/src/exports/vite/preview/index.js:30-42`).
- **Probe:** `vite preview` on the built rig printed
  `Error when starting preview server: [Only URLs with a scheme in: file, data, and node are
  supported by the default ESM loader. Received protocol 'cloudflare:'] { code:
  'ERR_UNSUPPORTED_ESM_URL_SCHEME' }`. The app's own hook import triggers it, independent of
  cairn.
- **Upstream:** kit#17271 is open. A maintainer replied: "you shouldn't be using `vite preview`
  with a Cloudflare build output anyway since that currently runs Node." The adapter docs point
  build testing at `wrangler dev .svelte-kit/cloudflare/_worker.js`.
- **Consequences:**
  - S0's preview arm fails for a reason unrelated to cairn. Under S0's own rule ("If the module
    needs site config to resolve, the pass stops"), that is a false stop.
  - S3's "real-Chromium e2e under `vite preview`" cannot run.
  - The showcase's whole e2e harness breaks at S2: `VITE_CAIRN_E2E=1 npm run build && npm run
    preview`, including the visual baselines and the CI width matrix. `norms.yml:55,94` also runs
    `CAIRN_DEV_BACKEND=1 ... run preview`.
- **Fold:** Run the e2e on `wrangler dev` against the build, where the probe shows Kit's check is
  active.
- **Cost of the fold:** The e2e build folds in the dev backend, which must then run in workerd.
  - `packages/cairn-cms-dev/src/channel-db.ts:45` does `await import('node:sqlite')`, which
    workerd lacks. The showcase members wiring uses it at `members/dev-wiring.ts:19`.
  - `norms.yml` passes the flag as an OS env var, which `wrangler dev` does not forward into
    `env`.
  - The spec plans none of this.
- **OWNER FORK (scope and budget):**
  - (a) **Recommended.** Move the showcase e2e and norms harness to `wrangler dev` in this pass,
    as its own segment between S2 and S3. Make the e2e dev backend workerd-safe: give the
    members channel DB a JS double or a real local D1, and pass the flag through `.dev.vars` or
    `--var`. Prove it in S0.
  - (b) Run the main e2e suite on `vite dev`, plus one small `wrangler dev` spec without the dev
    backend for the CSRF proof. Cheaper, but it drops production-build coverage of every other
    spec, and dev-mode CSS changes the visual baselines.
  - (c) A Node loader hook that maps `cloudflare:workers` for preview. This is a hand-built shim,
    excluded by the settled debt-free decision. Listed only to rule it out.

### M3. major. The `event.locals` override never reaches site code that reads `cloudflare:workers`

- **Location:** spec lines 70-75 and 198.
- **Defect:** The override is an engine-internal key read only by `cairnEnv`. The spec tells
  sites to read `cloudflare:workers` directly, and site code in dev then sees the real env, not
  the doubles.
- **Probe:** With `?override` setting the locals key, `vite dev` returned
  `{"lib":"from-locals","app":"from-wrangler"}`. `wrangler dev` returned the same.
- **Concrete breaks:**
  - `examples/showcase/src/routes/admin/signups/+page.server.ts:32` reads `APP_DB`, which the dev
    handle supplies as a fake (`handle.ts:143`).
  - `members/dev-wiring.ts:44-47` stamps `MEMBER_DB` and `CAIRN_DEV_BACKEND` onto env for the
    engine's auth channel. After the change, site code would have to write the engine's
    "internal, documented-as-dev-only" key.
- **What already exists:** Both the adapter's dev stub (`virtual-cloudflare-workers.js:96-101`,
  `als.run(newEnv, fn)`) and workerd export `withEnv(newEnv, fn)`. Workers-types declares it at
  `index.d.ts:16133`. The probe shows `withEnv({ ...env, MY_VAR }, () => resolve(event))` reaching
  both the library and the app, across an `await`: `{"lib":"from-withEnv","app":"from-withEnv"}`
  in `vite dev` and under `wrangler dev`.
- **Fold:**
  - `devBackendHandle` and the showcase members handle wrap `resolve` in `withEnv`, spreading the
    current `env` so the two handles nest.
  - `cairnEnv(event)` collapses to the module's `env`, so no locals key and no layering code.
  - Tests use the same idiom: native `withEnv` in the workerd integration project, a fake one
    elsewhere.
  - This is the platform-provided mechanism, so it is also what the debt-free decision asks for.
  - The dev package is noExternal (it has a `svelte` condition), so its own `cloudflare:workers`
    import resolves. Confirm it in S0 with the real package.

### M4. major. `originMatches` has a second caller the spec deletes out from under it

- **Location:** spec line 98, plus `src/lib/auth-channel/factory.ts:13,73`.
- **Defect:** `assertOriginAndScheme` runs `if (!originMatches(event)) throw error(403, ...)` as
  step 1 of every auth-channel action (`:689`, `:915`, `:1076`). Deleting `originMatches` breaks
  the build. Deleting the channel's check would also drop the only Origin enforcement those
  actions have in `vite dev`, where Kit skips.
- **Fold:**
  - Keep `originMatches`, moved next to its one remaining caller or left in `csrf.ts`.
  - Keep the channel's check as stated defense in depth.
  - Narrow cost 2 (spec line 113): non-admin forms lose dev Origin enforcement except the auth
    channel's actions.

### M5. minor. The double-submit claim misattributes coverage and overstates dev

- **Location:** spec lines 101-103 and 113-114.
- **Defect:**
  - No "guard Rule 3" exists. The token rule is labelled "Rule 1 - admin" (`guard.ts:247`), and
    it is gated by `isUnsafeFormRequest` (`:257`), which matches only form content types.
  - JSON transports are covered by per-handler `validateCsrfHeader`, not by the guard:
    `content-routes-tidy.ts:116`, `-dictionary.ts:99`, `-media-metadata.ts:218,420`, and
    `-media-ingest.ts:109`.
  - The raw-body upload is `text/plain`, which Rule 1's header witness covers. Kit also screens
    `text/plain`, at `utils/http.js:76-81`.
  - In dev-backend mode the guard does not run at all: `examples/showcase/src/hooks.server.ts:19-31`
    picks `devBackendHandle` *instead of* `createAuthGuard`. So in dev the admin token rides only
    `createAdminAction`'s inline check (`admin-action.ts:227-238`) and those handlers.
- **Fold:** Restate both sentences with the real owners. The substance holds: the token
  mechanism does not depend on `__SVELTEKIT_DEV__`. The S3 e2e under the dev-backend build
  exercises Kit's check and `createAdminAction`, never the guard.

### M6. minor. The vitest alias touches three of the four projects, each different

- **Location:** spec line 83.
- **Defect:** The `vitest.config.ts` projects do not inherit a root `resolve`, as the file's own
  comments note, so each project repeats the `$app/environment` alias.
  - `unit` (node) can alias to a settable fake.
  - `component` is browser mode (Playwright Chromium). Its graph already pulls server route
    modules (comment at the `$app/environment` alias), so it needs the alias too, and the fake
    must not use `node:async_hooks`.
  - `integration` runs in workerd, where `cloudflare:workers` and `withEnv` are native. Prefer the
    native module there over an alias.
  - About 150 `platform:` sites across 42 test files migrate. `unit-dist-spawn` imports only clean
    subpaths (see M9), so it needs nothing.
- **Fold:** Name the per-project treatment in the plan's S2 acceptance criteria. A browser-safe
  fake with a swap-and-restore `withEnv` serves both `unit` and `component`.

### M7. minor. The reworded `no-referrer-blanket` condition must drop the "safe on /admin" exemption

- **Location:** spec lines 105-106, `conditions.ts:193-194`, and the remedy text at
  `tool/internal/doctor/check_referrer.go:34`.
- **Defect:** Today's remediation says `no-referrer` "is safe only on a route whose CSRF
  protection is a double-submit token, the way cairn's own /admin responses are." Under Kit 3,
  `no-referrer` makes every form POST fail Kit's check, admin included. A site `handle`
  sequenced after the guard that sets `Referrer-Policy: no-referrer` overwrites the admin's
  `strict-origin` (`headers.set`). Admin login then dies with Kit's plain-text 403 and no cairn
  page.
- **Fold:** The reworded condition and the doctor remedy say `no-referrer` is unsafe on any route
  that receives a form POST, including `/admin`.

### M8. minor. The https help-page comment goes stale; behavior holds

- **Location:** `guard.ts:212-217`. The spec is silent on it.
- **Analysis:** The guard serves `edge.https-not-forced` on every deployed-http admin request,
  including the initial GET, so the user sees it before any form exists. A same-scheme http POST
  under `strict-origin` carries a matching Origin. Fetch's downgrade rule nulls only https to
  http. So Kit's pre-handle check never pre-empts the page. The comment's "before resolve() runs
  that check" is false once Kit checks before `handle`.
- **Fold:** Reword the comment in S3, with no code change.

### M9. minor. Keep the accessor out of Node-context entry points

- **Location:** spec line 66.
- **Evidence:** A walk of relative imports in `dist` shows only two exports reach a
  platform-reading module: `/sveltekit` and `/auth-channel` (`auth-channel/index.js >
  auth-channel/factory.js`). The rest are clean: `.`, `/admin`, `/public`, `/vite`, `/cloudflare`,
  `/auth-crypto`, `/log`, and the four `bin` entries. Those load in plain Node, in a site's
  `vite.config`, in the bins, and in `packaging-boundary.test.ts`. A static `cloudflare:workers`
  import there fails with `ERR_UNSUPPORTED_ESM_URL_SCHEME`.
- **Fold:** One constraint line: the accessor module lives under `src/lib/sveltekit/`, and nothing
  reachable from those entries imports it. `dev-flag.ts` and `env.ts` keep taking `env` as an
  argument.

### M10. minor. The root `svelte.config.js` stays; say so

- **Location:** spec lines 57-58 and 142-145.
- **Evidence:** Kit 3's error fires only in the `sveltekit()` plugin's config hook
  (`vite/index.js:275-279`, `e.config_file_unsupported`). The repo root is a library with no
  `vite.config` and no `sveltekit()` plugin. `@sveltejs/package` 2.5.8 and the component project's
  `svelte()` both read the root `svelte.config.js`.
- **Fold:**
  - Add one line saying the root file stays, so no implementer deletes it.
  - `@sveltejs/package` has a 3.0.0 major. Its `config.js` still loads `vite.config` or
    `svelte.config`, so it is not required. Taking it goes through `dependency-upgrade` and asks
    Geoff.

## Over-ceremony, ranked by cost

### O1. Shrink S0

- **Location:** spec lines 154-158.
- **What is already settled:**
  - The preview arm is known to fail upstream (M2).
  - The "locals override reaches it" arm is plain JS, and M3 replaces it anyway.
  - This lens's probe already discriminates the noExternal question with a shape-equivalent
    packed tarball: the svelte condition on the root, a condition-less server subpath, a real
    directory, and no site config. It resolves under dev, build, and `wrangler dev`.
- **What still needs proof:** the real cairn tarball, under `vite dev`, under `vite build` with a
  prerendered route (M1), and under `wrangler dev`. Add `withEnv` through `devBackendHandle` (M3)
  and the workerd-safe e2e backend (M2, fork a).
- **Fold:** Keep S0 as that smaller checklist.

### O2. Drop the doctor's "read config from the Vite config" port

- **Location:** spec lines 145-148.
- **Evidence:**
  - Within `tool/`, only `internal/doctor/check_csrf.go` reads `svelte.config`, and the spec
    deletes that check. Nothing remains to port.
  - `tool/internal/doctor/site-config-path.json` holds `{"path": "src/theme/site.config.yaml"}`.
    It has nothing to do with `svelte.config.js`, so its contract does not change.
- **Fold:** The doctor task becomes: delete `check_csrf.go`, retire its `conditions.json` entry,
  reword `check_referrer.go` (M7), and bump the dependency-floor expectations.
