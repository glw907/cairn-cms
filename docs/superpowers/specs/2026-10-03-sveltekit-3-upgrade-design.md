# SvelteKit 3 upgrade: design

Status: revised after the four-lens review and its verification read, 2026-10-03; Geoff's rulings
recorded at the end. Inputs: the survey `docs/superpowers/research/2026-10-04-sveltekit-3-survey.md`,
the published tarballs (`@sveltejs/kit` 3.0.0, `@sveltejs/adapter-cloudflare` 8.0.0, both npm `latest`),
the WHATWG Fetch spec, and the probe rig at `~/.cache/kit3-review/app`. Dispositions:
`docs/superpowers/research/2026-10-03-sveltekit-3-spec-fold.md` and its verification read
`2026-10-03-sveltekit-3-spec-fold-verification.md` beside it.

## Goal

The engine, the showcase, the Waymark template, `create-cairn-site`, `@glw907/cairn-cms-dev`, and the Go
doctor move to SvelteKit 3 and adapter-cloudflare 8, so a fresh `sv create` project installs cairn. The
close proves that with a packed tarball (see "Pass class and close").

## Settled decisions (Geoff's; not re-argued)

- **Debt-free (2026-10-04).** No compatibility shim, no deprecated 3.x API, no hand-built mechanism
  Kit 3 now provides, and no site config kept only for cairn's sake. The peer range is
  `@sveltejs/kit` `^3` only.
- **The three survey opportunities are taken (2026-10-04):** retiring the hand-built Origin check, one
  env accessor, and `paths.origin` where a library can read it (no change; see "Public origin").
- **Release (2026-10-03).** The pass closes unreleased under `## Unreleased`. Kit 3 publishes together
  with draft docs stage 2a, so the release ships the rebuilt extend arm.
- **Consumers (2026-10-03).** cairn.pub is the only existing site that migrates, in its own site pass
  after the cut. ecxc-ski, 907-life, aksailingclub-org, and xcathletes-org are rebuilt from scratch on
  the new docs. The `Consumers must:` list serves cairn.pub and outside adopters.

## Evidence the design rests on

Each claim was read from the tarball, the spec, or a probe; the pass's pre-flight re-checks the ones a
task depends on.

- **`platform` is gone.** Adapter 8's worker calls `server.respond(req, { getClientAddress })` with no
  platform (#16754). `env`, `waitUntil`, and `withEnv` come from `cloudflare:workers`, `cf` from
  `request.cf`, `caches` is a global. Kit 3's `RequestEvent` still declares an optional `platform`, so
  a structural cairn event type without it accepts every Kit event.
- **`cloudflare:workers` resolves through Vite in dev and build.** The adapter's plugin stubs it with a
  proxy over `getPlatformProxy().env` through AsyncLocalStorage (`waitUntil` a no-op, `withEnv` is
  `als.run`); the build rewrites it to the literal import. cairn and the dev package are bundled via
  vite-plugin-svelte 7's `ssr.noExternal` (survey). Probe: a packed shape-equivalent tarball resolved
  it under `vite dev`, `vite build`, and `wrangler dev`. S0 repeats this with the real tarball.
- **Prerender has no platform.** Every `env` trap and `withEnv` throws `Cannot access cloudflare:workers
  in a prerenderable route` (`virtual-cloudflare-workers.js:18-20,97-99`). Probe: gating the read on
  `building` from `$app/env` made a failing build pass.
- **`vite preview` cannot host adapter 8 output** (`ERR_UNSUPPORTED_ESM_URL_SCHEME`, probe; kit#17271,
  open). The adapter's docs point build testing at `wrangler dev`.
- **`withEnv` reaches library and app code alike.** Probe: `withEnv({ ...env, X }, () =>
  resolve(event))` in a handle made `X` visible inside the packed library and in an app route, across
  an `await`, under `vite dev` and `wrangler dev`, and in workerd without `nodejs_als`.
- **workerd at the showcase's flags** (probe; wrangler 4.147.0, `compatibility_date` 2026-08-21, no
  flags). `import('node:sqlite')` resolves but `new DatabaseSync(':memory:')` throws `Illegal
  constructor`, so `createChannelDb` cannot run there. `process.env` carries `vars` values. A local
  `send_email` binding writes the message to `.wrangler/tmp/email/.../email-text/<id>.txt`.
- **`paths.origin` is build-time only**, a define read only by `respond.js` and `csrf.js`; no `$app/*`
  module exports it.
- **Kit's CSRF check.** Kit 3 (`runtime/server/csrf.js`, `respond.js:98-133`) rejects a POST, PUT,
  PATCH, or DELETE whose content type is a form type *or absent* when the Origin differs from
  `paths.origin || url.origin` and isn't in `csrf.trustedOrigins`; a missing or `null` Origin rejects.
  It runs ahead of `handle` and is skipped in dev. Kit 2.70.3 (`respond.js:73-100`) differs only in
  letting an absent content type pass and using `url.origin`. `csrf.checkOrigin` is a build error in
  Kit 3; `trustedOrigins: ['*']`, which Kit's removal note recommends, compiles the check off for every
  route (`vite/index.js:495`).
- **Referrer-Policy decides the Origin** (Chromium probe through the repo's Playwright). A JS-free form
  POST under `no-referrer` sends `Origin: null`; `strict-origin` sends the real origin and a bare-origin
  Referer; `same-origin` leaks the full URL, token included. With a `no-referrer` header, a
  `<meta name="referrer" content="strict-origin">` in the head sent the real Origin, also behind an
  earlier `no-referrer` meta (last-processed meta wins). A site meta after cairn's was not probed and
  would win.
- **Config and aliases.** `svelte.config.js` is a build error only inside the `sveltekit()` plugin's
  config hook; the plugin form `sveltekit({ adapter, ... })` works on Kit 2.70. `kit.alias` is
  deprecated in Kit 3 (`config_option_deprecated_alias`), and Kit 3 forces only `$lib`'s removal
  (`module_removed_lib`). `#` subpath imports resolve through package.json `imports` natively in Vite
  and under the generated tsconfig's `moduleResolution: "bundler"`; Kit 2.70.3 has no `#` handling.
- **`Handle` moved to `@sveltejs/kit/hooks`**; `RequestEvent`, `redirect`, `error`, `fail`, and the
  `is*` guards stay. An external `redirect` needs `{ external: true }` or an `{ external: [origins] }`
  allowlist.

## Design

### Bindings: the module, not an override

Every engine read of `event.platform` reads `cloudflare:workers` instead. Internal helpers that take
`{ url, platform }` (`csrfSecure`, `issueCsrfToken`, `csrfHeaderVerdict`, `readPublicOrigin`) drop the
member.

- **One internal module** under `src/lib/sveltekit/` imports `env` and `waitUntil` from
  `cloudflare:workers`, typed to `CairnPlatformBindings`, and is the engine's only import site. It
  takes no event and layers nothing. Nothing reachable from the Node-context entries (`.`, `/admin`,
  `/public`, `/vite`, `/cloudflare`, `/auth-crypto`, `/log`, the bins) imports it; `dev-flag.ts` and
  `env.ts` keep taking `env` as an argument.
- **No engine code touches `env` or `withEnv` while `building`** (`$app/env`). The guard's dev-flag
  tripwire (`guard.ts:195`) and the dev handles skip while building. The showcase build, which
  prerenders its `(site)` routes behind the handle, is the standing proof.
- **The dev backend uses `withEnv`.** `devBackendHandle` and the showcase's `membersDevHandle` wrap
  `resolve` in `withEnv({ ...env, ...doubles }, () => resolve(event))`, spreading the current `env`
  so the two nest. The doubles reach engine and site reads alike (`/admin/signups`, the `/test/*`
  routes). No `locals` key and no layering code exist.
- **`waitUntil` comes from the module**, always defined (a no-op in the dev stub, where the started
  promise still runs). The auth channel's inline-await branch and `auth.channel.delivery_inline`
  retire. The two consumers already attach `.catch()` before the handoff.
- **`process.env` reads in the request path retire** (the engine is Cloudflare-only by charter): the
  guard's and the auth-channel factory's dev-flag reads, with the `adapter-node` comment, and
  `readPublicOrigin`'s `process.env.PUBLIC_ORIGIN` fallback (`dev-flag.ts:89`). `readPublicOrigin`
  reads the module `env` alone; its `depth: 'platform-only'` option collapses and its adapter-node
  rationale goes. The audit tooling's `process.env` reads are Node CLI code and stay. The tripwire tests
  are rewritten, not deleted: the flag in `env` on a deployed host still gives a 503. The flag reaches
  the e2e worker through `.dev.vars` or `--var`, never `wrangler.jsonc` `vars`, which would ship it.
  The showcase's `devBackendOptIn()` (`dev-gate.ts:24-25`) keeps working under workerd (probe).
- **Tests.** Projects don't inherit a root `resolve`, so `unit` and `component` each alias
  `cloudflare:workers` to one browser-safe settable fake (no `node:async_hooks`) with a
  swap-and-restore `withEnv` and a `waitUntil` that collects promises for a test to flush (the
  `waitOnExecutionContext` idiom). A setup file resets it in `beforeEach`. `integration` runs in workerd
  on the native module.

### Public surface

Each published export carrying `platform` is ruled here; the rulings ledger notes owed are in the fold
record.

| Export | Disposition | Why |
|---|---|---|
| `CairnPlatformBindings` | Keep, re-expressed as the interface a site's `wrangler types` `Env` satisfies | A type-level test (`satisfies` under `npm run check`) asserts the showcase's committed `Env` satisfies it; the reference snippet comes from that test |
| `CairnEvent<Env>` | Keep (the `audit-sveltekit-cairnevent` case holds); `platform` member and the `Env` parameter retire | `Env` reached the event only through `platform`; a phantom parameter is debt |
| `PlatformContext` | Retire | Its keep case ("a site's own App.Platform carrying ctx still satisfies cairn") reopens: adapter 8 has no `App.Platform` |
| `resolveDb(env: Env \| undefined)` (`createSectionAction`, `AuthChannelConfig`) | Shape unchanged; the engine passes the module `env` | Kit 3 doesn't require narrowing, and the shape is ratified; only its rationale sentence changes |
| `DeliverContext` `{ env, waitUntil }`, `lookup`/`verify` `{ env }` | Shape unchanged; sourced from the module | Same; `waitUntil` is now always the platform's |
| `createD1AuditSink(db, waitUntil)` | Signature unchanged; the documented call form becomes `import { env, waitUntil } from 'cloudflare:workers'` | The sink takes its dependencies as arguments and stays out of the module's import graph |
| `auth.channel.delivery_inline` | Retire (log-events row too) | Its keep case was a deployment with no `waitUntil`, which the module rules out |
| `createChannelDb` (`@glw907/cairn-cms-dev`) | Keep; its facts gain "Node only, not under workerd" | It loses its in-repo consumer (S2) but stays the documented real-SQL double for a site's channel tests under vitest and `vite dev` on Node (`f:fcqs22`), which local D1 doesn't replace for a Node test runner. A live feature, not a shim |

Route factories that take `Env` keep it on their own config callbacks, so the site's `wrangler types`
`Env` still types `resolveDb`, `deliver`, and `lookup`.

### CSRF: Kit's check runs everywhere

Today the site sets `csrf: { checkOrigin: false }`, because cairn's admin responses serve
`Referrer-Policy: no-referrer` and their form POSTs arrive with `Origin: null`. Guard Rule 2
(`guard.ts:203-211`) rebuilds Kit's Origin check by hand for non-admin paths through `originMatches`.

After the change:

- `applySecurityHeaders` (`admin-response.ts:38`) and the confirm page (`auth-routes.ts:293`) serve
  `Referrer-Policy: strict-origin`, and every engine-rendered admin document (the admin shell, login,
  and confirm pages) emits `<meta name="referrer" content="strict-origin">` in its head. The meta keeps
  admin sign-in working when a site's outer handle, its `app.html` (a meta before `%sveltekit.head%`,
  the SvelteKit default position), or a zone Transform Rule sets `no-referrer` site-wide, which would
  otherwise lock every editor out with Kit's plain 403 (precedent: the ASC harvest site,
  `originmatches-strict-guard`). The magic-link token never reaches a Referer.
- The site carries no `csrf` config, so Kit's default check covers every route, admin included.
- Guard Rule 2's call, the `auth.csrf-origin-mismatch` condition with its `REASON_CONDITION.origin`
  entry (`condition-response.ts:17`), and `config.csrf-disable-missing` are deleted.
- **`originMatches` stays** for `createAuthChannel`'s `assertOriginAndScheme`
  (`auth-channel/factory.ts:72-74`), step 1 of every member action, so a factory on any route keeps its
  own CSRF floor in dev and under a widened `trustedOrigins` (`originmatches-strict-guard` keep
  ruling). `isUnsafeFormRequest` stays for guard Rule 1.
- The admin double-submit token (`__Host-cairn_csrf`) and its current owners stay unchanged.
- `/preview/[token]` keeps `no-referrer`; a site form inside a preview render is refused, as today.
- `config.no-referrer-blanket` stays at `warning`, reworded in `conditions.ts` and
  `check_referrer.go`: a site-wide `no-referrer` makes the site's own forms and `createAuthChannel`'s
  actions fail Kit's check; cairn's admin documents pin their own policy unless a site meta follows
  `%sveltekit.head%`. The "safe only on a token-protected route" remedy goes.
- The guard comment at `guard.ts:212-217` is reworded (Kit checks before `handle`), and the
  `edge.https-not-forced` page copy is re-read for the same premise.

Costs, accepted:

1. **Opaque refusals.** A form POST with a null or foreign Origin, admin or not, gets Kit's plain 403
   (`Cross-site POST form submissions are forbidden`) before `handle`; no cairn event records it, and
   `guard.refused` loses its `origin` reason. The branded `auth.csrf-token-invalid` page fires only for
   token failures. The diagnostic is the Workers Logs invocation record (method, path, status 403);
   `log-events.md` and the `is-it-working` facts carry an anchor keyed on Kit's literal message.
2. **Dev.** Non-admin forms lose Origin enforcement in `vite dev`, except `createAuthChannel`'s
   actions. Sites on the dev backend never ran Rule 2 in dev anyway.

A `web-auth-security-reviewer` reads the fold's three CSRF deltas before S3 is dispatched: the Kit 2
ordering, the admin referrer meta, and the doctor's `trustedOrigins` check.

### Public origin

`paths.origin` can't replace `PUBLIC_ORIGIN` in `csrfSecure` and `readPublicOrigin`, because a library
can't read it at runtime, and the magic-link URL must come from configuration rather than the request's
Host. `PUBLIC_ORIGIN` stays. A site behind a proxy whose request URL origin differs from the browser's
sets `paths.origin`, or Kit refuses its admin POSTs; that is a facts bullet.

### Kit 3 API moves

- `Handle` imports from `@sveltejs/kit/hooks` in the engine (`guard.ts`), the dev package, and every
  template `hooks.server.ts`.
- The identity `logoutUrl` redirect (`auth-routes.ts:474`) passes `{ external: [<the validated
  logoutUrl's origin>] }`; the relative fallback needs no option. The guard's validation
  (`guard.ts:126-154`) stays.
- The 4.0 deprecations move now: `$app/environment` to `$app/env`, `invalidateAll` to `refreshAll`,
  and the `json` and `text` helpers to `Response.json` and `new Response`.
- Subpath imports replace aliases: `$lib` becomes `#lib`, and `$chassis` and `$theme` become `#chassis`
  and `#theme`, each through a package.json `imports` field, in the showcase, Waymark, and the scaffold.
- The `handleError` comments at `section-action.ts:118` and `admin-action.ts:60` are re-read against
  Kit 3, which now passes every error, and fixed only if they misstate it.
- Peers: cairn's `@sveltejs/kit` peer becomes `^3` and svelte `^5.57.1`; the dev package's kit peer
  becomes `^3`. cairn declares no vite peer; vite `^8.0.12`, vite-plugin-svelte `^7`, and wrangler
  `^4.118` are consumer floors already met by the template pins. Node `>=22.17` is already met.
- `@sveltejs/package` moves to `^3` (Ruling 2). It peers on svelte and typescript `^6` (the repo is on
  6.0.3), not on Kit.

### Config in the Vite plugin

The showcase, Waymark, and the `create-cairn-site` scaffold move their configuration into
`sveltekit({ ... })` in `vite.config` and delete `svelte.config.js`. The repo root's
`svelte.config.js` stays: the root is a library with no `sveltekit()` plugin, and `@sveltejs/package`
and the component project read it.

### Doctor (tool major)

`check_csrf.go` is repurposed: it reads the `csrf` key in the Vite config and fails on a
`trustedOrigins` entry of `'*'`, which turns the check off on every route and leaves the admin's form
POSTs on the token alone. Other entries pass with a detail that they widen `/admin` too. It reports
under a new check id with a new condition in the engine registry, mirrored to `conditions.json`.
`config.csrf-disable`, `config.csrf-disable-missing`, and `auth.csrf-origin-mismatch` retire.
`check_referrer.go`'s remedy is reworded (above), and the dependency-floor expectations bump.

`cli-cairn-json-output.md` freezes check and condition ids from tool `v1.0`, so the tool goes to
`v2.0.0` under its changelog's Unreleased and releases with the engine cut. The upgrade is a Consumers
must line, since `v1.1.0`'s doctor recommends `checkOrigin: false`. The `docsAnchor` fragments
`non-admin-origin-rejected` and `wire-cairns-csrf-guard` stay on `scripts/checks/shipped-anchors.json`,
since released binaries print them.

### Sequencing with stage 2a (the spec's call)

The add-cairn tutorial's Kit 2 pin, `f:skeche`, `f:ghzx9c`, and `facts/extend.md:144`'s `^2.70` claim
live on the `draft-docs-2a` worktree, which another executor owns. This pass doesn't edit that branch:
Kit 3 lands on `main` first, 2a rewrites them when it rebases, and the close carries them in STATUS as
2a carry-forwards.

### ROADMAP watches this pass trips

Three entries trigger on "the next pass that touches `packages/cairn-cms-dev`": the `APP_DB` overwrite
(`ROADMAP.md:938-946`), the in-memory `MEDIA_BUCKET` hiding seeded media (`:872-882`), and the missing
`cairnAccess` (`:1556-1582`). The port changes how the doubles travel, not which exist, so all three
defer, re-armed to "the next pass that changes the dev package's double set or `DevBackendConfig`".

## Segments

Each segment ends on a green commit; the plan sets tasks, files, and gates. Kit 2.70 hosts S1 through
S3, so the bump carries only what Kit 3 forces.

**Split point.** One pass holds the six segments. If the token ceiling forces a split, cut after S2,
never after S3, because `main` must stay releasable. S0 through S2 change no runtime security behavior.
After S3, guard Rule 2 and the old doctor checks are gone while the engine still peers on Kit `^2.70`,
so a site still carrying `checkOrigin: false` (as the v1 doctor and old templates told every site)
loses its only non-admin Origin check, and the v2 doctor, which flags only `'*'`, stays silent. The
second half runs S3 through S5, landing the CSRF handover and the Kit 3 peer on `main` together.

- **S0, spike (gate for the bindings and harness design).** On a scratch branch, add a probe
  `cloudflare:workers` read in a module reached from `@glw907/cairn-cms/sveltekit`; `npm pack`; install
  the `.tgz` by path into a fresh Kit 3 / adapter 8 project outside the repo, with no `ssr.noExternal`,
  no `file:`, and no `npm link`. A route echoes one binding value. On that project, prove:
  1. the value arrives under `vite dev`, `vite build` plus `wrangler dev` on the output, and a
     prerendered route through cairn's handle builds (with the `building` gate);
  2. a `withEnv` set in a handle shaped like `devBackendHandle` reaches an engine read and a site read
     across an `await` and a streamed load, using the real dev package.

  On the Kit 2.70 / adapter 7 showcase (S2's host), prove: 3. the e2e build boots under `wrangler dev`
  with the dev backend and the members fixture on local D1, the flag delivered through `.dev.vars` or
  `--var` (`vars` delivery is probed; `.dev.vars` is not).

  Stop rules: `vite build`, prerender, or `wrangler dev` needing site config stops the pass as an
  architectural fork for Geoff. `vite dev` failing alone is a recorded gotcha and the pass goes on. The
  harness script is kept so the close re-runs it against the final tarball.
- **S1, groundwork on Kit 2.70.** The 4.0 deprecations; config into the Vite plugin for the showcase
  and Waymark; the subpath-import move, gated on `svelte-check` plus a build on 2.70 (if it fails, the
  move stays in S4 with the reason recorded); `@sveltejs/package` `^3` through `dependency-upgrade`.
- **S2, the e2e host moves to `wrangler dev` (Kit 2.70).** The showcase e2e, its visual baselines and
  CI width matrix, and `norms.yml` serve the build through `wrangler dev` instead of `vite preview`,
  with the flag delivered per S0. The members fixture moves to the local D1 binding `MEMBER_DB`
  (already in the showcase's `wrangler.jsonc`): `membersDevHandle` drops its `MEMBER_DB` double, the
  e2e `webServer` command applies `migrations-members` locally, and `/test/reset-members` resets the
  D1. This is a showcase fixture, not a change to the dev package's double set. Adapter 7 output runs
  under `wrangler dev`, so baselines are unchanged. Acceptance: the whole existing suite green on the
  new host.
- **S3, CSRF on Kit 2.70 (after the security read).** Kit 2.70 already rejects `Origin: null` before
  `handle`, so the change lands green without the opt-out or any interim `trustedOrigins`. Contents: the
  Referrer-Policy header and meta, deleting `checkOrigin: false` from the showcase, Waymark, and the
  scaffold, the deletions above, the condition rewording, the guard comment, and the doctor task (pass
  class `tool`), which shares the condition registry. Proofs:
  - Cross-origin: a page loaded at `http://127.0.0.1:$PORT` submits a native form to the members
    request form at `http://localhost:$PORT`; assert 403 and Kit's body. The same submission from
    `localhost` passes. The pair proves the check is live, so it fails under `vite dev` or `'*'`.
  - Admin: a browser-submitted form action with a form content type (Save on the edit page) passes.
  - Confirm: the browser loads the confirm page and POSTs its form; the response is cairn's (an
    invalid-token page is fine), never Kit's 403.
  - Integration tests assert `strict-origin` from `applySecurityHeaders` and `confirmLoad`, and the
    meta on the three admin documents. The e2e build runs `devBackendHandle` in place of the guard, so
    the guard's header is proven here, not in the browser.
  - Mutation proof: reverting the confirm page's header and meta to `no-referrer` turns the confirm
    case into Kit's 403; the red run's output is the evidence.
  - The whole existing e2e suite stays green.
- **S4, the bump (one atomic task, upshifted to Opus).** Versions and peers; the bindings module, the
  `building` gate, and `withEnv` in both dev handles; the public-surface rulings; the `process.env`
  retirements; `App.Platform` deleted from the showcase, Waymark, and the scaffold; `Handle`; the
  redirect allowlist; the vitest per-project fakes; the two e2e helpers that POST with no content type
  (`members.spec.ts:26,177`) send a body. Acceptance, one grep-zero line: no `\.platform\b`,
  `App.Platform`, `PlatformContext`, `platform:` in test event literals, `$app/environment`,
  `invalidateAll`, `json(`/`text(` from `@sveltejs/kit`, or `$lib` across `src/lib`, the dev package,
  the showcase, Waymark, and the scaffold; zero Kit `config_option_deprecated*` warnings in the three
  builds; the showcase build prerenders; the full e2e suite is green under `wrangler dev`.
- **S5, scaffold, docs, and records.** `create-cairn-site` at the Kit 3 shape, the docs, and the
  kit#15992 cleanup: the `CLAUDE.md` watch line (`:211`), whose standing example needs a replacement,
  not only a deletion, and the four ROADMAP entries (`:52`, `:402`, `:1710-1716`, `:2150`).

## Pass class and close

The pass class is `auth-data` (S3 and S4 touch the guard, the CSRF path, and the auth store's binding
reads); the doctor task is `tool`, the docs task `docs`. The close runs the full gate, then re-runs S0's
harness against the final tarball as the consumer proof: `npx sv create` (current release, minimal
TypeScript); `npm install <tgz>` exits 0 with no `--legacy-peer-deps` or `--force`; the documented
wiring and `wrangler types` applied; `svelte-check` 0 errors and 0 warnings; `vite build` exits 0;
`wrangler dev` answers `GET /admin/login` with 200. It fans out `web-auth-security-reviewer`,
`svelte-reviewer`, `cloudflare-workers-reviewer`, and a `go-architecture-reader` per touched Go
package. The live auth smoke follows on the Ruling 1 target, with Geoff's magic-link click;
`docs/internal/admin-smoke-test.md`'s POST steps send an `Origin` matching the Worker URL, since curl
sends none.

## Docs and records

- Reference pages: `admin-routes.md` (`CairnPlatformBindings`, the CSRF handoff), `sveltekit.md`
  (`CairnEvent`, `PlatformContext`, `resolveDb`'s rationale, the `createD1AuditSink` example),
  `auth-channel.md` (`DeliverContext`, `waitUntil`, the `process.env` sentence at `:140`), `core.md`,
  `cli-cairn-doctor.md`, `cli-cairn-json-output.md` (the frozen-id list), `supported-toolchain.md`, and
  `log-events.md` (`guard.refused` loses `origin`, `auth.channel.delivery_inline` retires, Kit's 403
  anchor). Any page naming `svelte.config.js`, `platform.env`, `platform.ctx`, `PlatformContext`,
  `checkOrigin`, or `process.env` for the flag or `PUBLIC_ORIGIN` is repointed. `check:surface --
  --update` regenerates `api-surface.md`.
- Facts: a bullet for every public-behavior change and a correction to every bullet this pass falsifies
  (anchor bullets keep their anchors, conditions marked retired; the plan inventories the ids). New
  bullets: the bodyless server-to-server POST refusal, the `custom_domain`-under-`wrangler dev` Origin
  mismatch, `paths.origin` behind a proxy, and `createChannelDb` being Node only.
- The CHANGELOG under `## Unreleased`, the tool changelog (major), `migration-notes.md`, and
  `upgrade-cairn.md`.
- `docs/internal/durable-gotchas.md` gains the `cloudflare:workers` facts S0 proves, the prerender
  rule, the `vite preview` limit, and `node:sqlite`'s illegal constructor under workerd.

### Consumers must (draft, finalized at the close)

- Move `svelte.config.js` into `sveltekit({ ... })` in `vite.config`, and delete the file.
- Delete the `csrf` block entirely. Don't replace it with `trustedOrigins: ['*']`, which Kit's removal
  note suggests: it turns off SvelteKit's Origin check on every route, `/admin` included.
- Delete `App.Platform` from `app.d.ts`. Run `wrangler types`, and type bindings from its `Env`.
- Code that read `event.platform` imports `env` and `waitUntil` from `cloudflare:workers`. A handle that
  wrote `event.platform` (dev doubles) wraps `resolve` in `withEnv` instead. Pass `createD1AuditSink`
  the module's `waitUntil`.
- Write `CairnEvent` without a type argument; `PlatformContext` is gone.
- Import `Handle` from `@sveltejs/kit/hooks`. Add `"imports": { "#lib": "./src/lib", "#lib/*":
  "./src/lib/*" }` to package.json and replace `$lib` with `#lib`; move any custom `kit.alias` the
  same way.
- Upgrade to `@sveltejs/kit` `^3`, adapter-cloudflare `^8`, svelte `>=5.57.1`, and wrangler `>=4.118`.
- If your site sets `Referrer-Policy: no-referrer` site-wide, your own forms and `createAuthChannel`
  forms now fail SvelteKit's check; serve `strict-origin-when-cross-origin` or `strict-origin`.
- An endpoint receiving a server-to-server POST with no `Content-Type` now gets SvelteKit's 403; have
  the sender set a content type such as JSON.
- Upgrade the `cairn` tool to `v2`: `v1`'s doctor recommends `checkOrigin: false`, now a build error.

## Out of scope

- Remote functions, which stay experimental in Kit 3.
- Draft docs task 8 and the add-cairn tutorial rewrite (2a's), and the two friction ids above.
- cairn.pub's migration (its own site pass) and the four site rebuilds.
- Replacing the dev package's doubles with wrangler local emulation, and the three deferred dev-package
  watches.
- The kit#15992 scheduled routine (`trig_0193pPNoyxsTGeUhF1xx7woa`), already rewritten.

## Rulings (Geoff, 2026-10-03)

1. **The close's live auth smoke runs on the showcase under local `wrangler dev`**, reusing S2's host,
   with a local D1 migrated and seeded and the dev backend off. The magic link is read from the message
   file wrangler's local `send_email` emulation writes (`.wrangler/tmp/email/.../email-text/<id>.txt`).
   No provisioning. Accepted cost: over http, the `__Host-` prefix and the Secure branch go unexercised
   until cairn.pub's migration.
2. **`@sveltejs/package` 3.0.0 is taken this pass**, in S1, through the `dependency-upgrade` skill with
   its changelog surveyed. A break found there is handled in-pass.
