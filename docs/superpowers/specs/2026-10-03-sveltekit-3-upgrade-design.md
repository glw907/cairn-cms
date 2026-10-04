# SvelteKit 3 upgrade: design

Status: revised after the four-lens adversarial review, 2026-10-03, for Geoff's read. Input: the survey
`docs/superpowers/research/2026-10-04-sveltekit-3-survey.md`, a verification read of the published
tarballs (`@sveltejs/kit` 3.0.0, `@sveltejs/adapter-cloudflare` 8.0.0, both npm `latest` with no later
patch), the WHATWG Fetch spec, and the probe rig at `~/.cache/kit3-review/app`. Review record and
per-finding dispositions: `docs/superpowers/research/2026-10-03-sveltekit-3-spec-fold.md`. Two
questions remain for Geoff, under "Rulings for Geoff" at the end.

## Goal

The engine, the showcase, the Waymark template, `create-cairn-site`, `@glw907/cairn-cms-dev`, and the Go
doctor move to SvelteKit 3 and adapter-cloudflare 8, so a fresh `sv create` project installs cairn. The
close proves that with a packed tarball (see "Pass class and close").

## Settled decisions (Geoff's; not re-argued)

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

## Evidence the design rests on

Each claim was read from the tarball, the spec, or a probe; the pass's pre-flight re-checks the ones a
task depends on.

- **`platform` is gone.** Adapter 8's worker calls `server.respond(req, { getClientAddress })` with
  no platform (changelog #16754). `env`, `waitUntil`, and `withEnv` come from `cloudflare:workers`,
  `cf` from `request.cf`, and `caches` is a global. Kit 3's `RequestEvent` still declares an optional
  `platform`, so a structural cairn event type without it still accepts every Kit event.
- **`cloudflare:workers` resolves through Vite in dev and build.** The adapter's plugin resolves the id
  to a stub that proxies `getPlatformProxy().env` through AsyncLocalStorage; `waitUntil` is a no-op
  there, and `withEnv(newEnv, fn)` is `als.run`. The build rewrites the stub to the literal import.
  vite-plugin-svelte 7 puts any dependency with a `svelte` export condition in `ssr.noExternal` by
  package name, subpaths included, so cairn and `@glw907/cairn-cms-dev` are bundled, not loaded by
  Node. Probe: a packed shape-equivalent tarball resolved the module under `vite dev`, `vite build`,
  and `wrangler dev`. S0 repeats this with the real cairn tarball.
- **Prerender has no platform.** During `vite build` prerender the stub's proxy is unset, and every
  `env` trap and `withEnv` throws `Cannot access cloudflare:workers in a prerenderable route`
  (`virtual-cloudflare-workers.js:18-20,97-99`). Probe: a hook reading env on every request failed the
  build; gating the read on `building` from `$app/env` passed.
- **`vite preview` cannot host adapter 8 output.** `adapt()` rewrites the stub to the literal
  specifier, and Kit's preview imports the output in Node: `ERR_UNSUPPORTED_ESM_URL_SCHEME` (probe;
  kit#17271, open; a maintainer: don't use `vite preview` with a Cloudflare build output). The
  adapter's docs point build testing at `wrangler dev`.
- **`withEnv` reaches library and app code alike.** Probe: a handle doing
  `withEnv({ ...env, X }, () => resolve(event))` made `X` visible to a read inside the packed library
  and a read in the app's own route, across an `await`, under `vite dev` and `wrangler dev`.
- **`paths.origin` is build-time only.** Kit bakes it into a define read only by `respond.js` and
  `csrf.js`. No `$app/*` module exports it.
- **Kit's CSRF check.** Kit 3 (`runtime/server/csrf.js`, `respond.js:98-133`) rejects a POST, PUT,
  PATCH, or DELETE whose content type is a form type *or absent*, when the Origin differs from
  `paths.origin || url.origin` and isn't in `csrf.trustedOrigins`. A missing Origin and `null` both
  reject. It runs ahead of `handle` and is skipped in dev. Kit 2.70.3's check (`respond.js:73-100`)
  is the same except that an absent content type passes and the self origin is `url.origin`.
  `csrf.checkOrigin` is a removed-option build error in Kit 3, and `trustedOrigins: ['*']` compiles the
  check off for every route (`vite/index.js:495`); Kit's own removal note recommends that literal.
- **Referrer-Policy decides the Origin (Chromium probe).** For a JS-free form POST, `no-referrer`
  sends `Origin: null`; `strict-origin` sends the real origin and a bare-origin Referer;
  `same-origin` sends the real origin but leaks the full URL, token included, in the Referer. A
  `<meta name="referrer">` in the document sets the document's policy and overrides a header-delivered
  one (W3C Referrer Policy, HTML `meta name=referrer`).
- **Config moves into the Vite plugin.** `svelte.config.js` is a build error only inside the
  `sveltekit()` plugin's config hook. The plugin form `sveltekit({ adapter, ... })` works on Kit 2.70.
  `kit.alias` is `@deprecated` in Kit 3 and warns `config_option_deprecated_alias`; `#` subpath
  imports resolve through a package.json `imports` field.
- **`Handle` moved to `@sveltejs/kit/hooks`.** `RequestEvent`, `redirect`, `error`, `fail`, and the
  `is*` guards stay on `@sveltejs/kit`. An external `redirect` needs `{ external: true }` or
  `{ external: [origins] }`, an allowlist.

## Design

### Bindings: the module, not an override

Every engine read of `event.platform` reads `cloudflare:workers` instead. The surface is wider than the
62 `.platform` reads in 25 files: `platform` appears 141 times across 39 non-test files under `src/lib`,
including internal helper signatures that take `{ url, platform }` (`csrfSecure`, `issueCsrfToken`,
`csrfHeaderVerdict`, `readPublicOrigin`), which drop the member.

- **One internal module** under `src/lib/sveltekit/` imports `env` and `waitUntil` from
  `cloudflare:workers`, typed to `CairnPlatformBindings`, and is the engine's only import site. It
  takes no event and layers nothing. Nothing reachable from the Node-context entries (`.`, `/admin`,
  `/public`, `/vite`, `/cloudflare`, `/auth-crypto`, `/log`, the bins) imports it; `dev-flag.ts` and
  `env.ts` keep taking `env` as an argument.
- **No engine code touches `env` or `withEnv` while `building`** (`$app/env`, Kit's documented
  build-time switch). The guard's dev-flag tripwire (`guard.ts:195`) is skipped while building; a
  prerender never serves a deployed request. The dev handles below follow the same rule. The
  showcase build, which prerenders its `(site)` routes behind the handle, is the standing proof.
- **The dev backend uses `withEnv`.** `devBackendHandle` and the showcase's `membersDevHandle` wrap
  `resolve` in `withEnv({ ...env, ...doubles }, () => resolve(event))`, spreading the current `env`
  so the two handles nest. The doubles then reach engine reads and site reads alike, so the dev
  package's no-cloud-accounts promise covers a site's own routes (`/admin/signups`, the `/test/*`
  harness routes). No `locals` key and no layering code exist. `withEnv` is the platform's mechanism,
  which is what the debt-free decision asks for.
- **`waitUntil` comes from the module.** It is always defined there (a no-op in the dev stub, where
  the already-started promise still runs), so the auth channel's inline-await branch and the
  `auth.channel.delivery_inline` event are unreachable and retire. The two consumers already attach
  `.catch()` before the handoff.
- **`process.env` reads in the request path retire.** The engine is Cloudflare-only by charter, so
  the guard's and the auth-channel factory's `process.env` reads of the dev-backend flag retire with
  the `adapter-node` comment; the plan checks `dev-flag.ts:89`'s `PUBLIC_ORIGIN` fallback against the
  same rule. The audit tooling's `process.env` reads are Node CLI code and stay. The tripwire tests are
  rewritten, not deleted: the flag in `env` on a deployed host still gives a 503. The flag reaches the
  e2e worker through `.dev.vars` or `--var`, never `wrangler.jsonc` `vars`, which would ship it.
- **Tests.** Each vitest project gets its own treatment, since projects don't inherit a root
  `resolve`: `unit` and `component` alias `cloudflare:workers` to one browser-safe settable fake
  (no `node:async_hooks`) with a swap-and-restore `withEnv` and a `waitUntil` that collects promises
  for a test to flush (the `waitOnExecutionContext` idiom of Cloudflare's vitest pool). A setup file
  resets the fake in `beforeEach`. `integration` runs in workerd and uses the native module. About 150
  `platform:` sites across 42 test files migrate.

### Public surface

The published surface carries `platform` in more places than `CairnPlatformBindings`. Each is ruled
here; the rulings ledger notes owed are listed in the fold record.

| Export | Disposition | Why |
|---|---|---|
| `CairnPlatformBindings` | Keep, re-expressed as the interface a site's `wrangler types` `Env` satisfies | A type-level test (`satisfies` under `npm run check`) asserts the showcase's committed `Env` satisfies it; the reference snippet comes from that test |
| `CairnEvent<Env>` | Keep (the `audit-sveltekit-cairnevent` case holds); `platform` member and the `Env` parameter retire | `Env` reached the event only through `platform`; a phantom parameter is debt |
| `PlatformContext` | Retire | Its keep case ("a site's own App.Platform carrying ctx still satisfies cairn") reopens: adapter 8 has no `App.Platform` |
| `resolveDb(env: Env \| undefined)` (`createSectionAction`, `AuthChannelConfig`) | Shape unchanged; the engine passes the module `env` | Narrowing is not required by Kit 3, and the shape is ratified; only its rationale sentence changes |
| `DeliverContext` `{ env, waitUntil }`, `lookup`/`verify` `{ env }` | Shape unchanged; sourced from the module | Same; `waitUntil` is now always the platform's |
| `createD1AuditSink(db, waitUntil)` | Signature unchanged; the documented call form becomes `import { env, waitUntil } from 'cloudflare:workers'` | The sink takes its dependencies as arguments, like `db`, and stays out of the module's import graph |
| `auth.channel.delivery_inline` | Retire (log-events row too) | Its keep case was a deployment with no `waitUntil`, which the module rules out |

Route factories that take `Env` keep it on their own config callbacks, so the site's `wrangler types`
`Env` still types `resolveDb`, `deliver`, and `lookup`.

### CSRF: Kit's check runs everywhere

Today the site sets `csrf: { checkOrigin: false }`, because cairn's admin responses serve
`Referrer-Policy: no-referrer` and a form POST from them arrives with `Origin: null`. Guard Rule 2
(`guard.ts:203-211`) then rebuilds Kit's Origin check by hand for non-admin paths through
`originMatches`.

After the change:

- `applySecurityHeaders` (`admin-response.ts:38`) and the confirm page (`auth-routes.ts:293`) serve
  `Referrer-Policy: strict-origin`, and every engine-rendered admin document (the admin shell and the
  login and confirm pages) also emits `<meta name="referrer" content="strict-origin">` in its head.
  The meta keeps admin sign-in working when a site's outer handle, its `app.html`, or a zone Transform
  Rule sets `no-referrer` site-wide, which would otherwise lock every editor out with Kit's plain 403
  and no cairn page or log (precedent: the ASC harvest site that shipped site-wide `no-referrer`,
  `originmatches-strict-guard`). The magic-link token never reaches a Referer, and every same-origin
  POST carries its real Origin.
- The site carries no `csrf` config, so Kit's default check covers every route, admin included.
- Guard Rule 2's call, the `auth.csrf-origin-mismatch` condition with its `REASON_CONDITION.origin`
  entry (`condition-response.ts:17`), and `config.csrf-disable-missing` are deleted.
- **`originMatches` stays** for its remaining caller, `createAuthChannel`'s `assertOriginAndScheme`
  (`auth-channel/factory.ts:72-74`), step 1 of every member action. A factory a site mounts on any route
  keeps its own CSRF floor, which holds in dev and under a widened `trustedOrigins`; the
  `originmatches-strict-guard` keep ruling protects it. `isUnsafeFormRequest` stays for guard Rule 1.
- The admin double-submit token (`__Host-cairn_csrf`) stays. Its owners: guard Rule 1 (form content
  types, `guard.ts:247-257`), `createAdminAction`'s inline check (`admin-action.ts:227-238`), and the
  per-handler `validateCsrfHeader` on the JSON transports (tidy, dictionary, media metadata, media
  ingest). None depends on `__SVELTEKIT_DEV__`. Under the dev backend the guard doesn't run at all,
  so dev rides `createAdminAction` and the handlers.
- `/preview/[token]` keeps `no-referrer`. A site form inside a preview render is refused, as it is
  today under Rule 2.
- `config.no-referrer-blanket` stays at `warning`, reworded in `conditions.ts` and
  `check_referrer.go`: a site-wide `no-referrer` makes the site's own forms and `createAuthChannel`'s
  actions fail Kit's check; cairn's admin documents pin their own policy. The "safe only on a
  token-protected route, the way /admin is" remedy goes.
- The guard comment at `guard.ts:212-217` ("before resolve() runs that check") is reworded; Kit checks
  before `handle`. Behavior holds: a same-scheme http POST under `strict-origin` carries a matching
  Origin, so the `edge.https-not-forced` page is never pre-empted. Its copy is re-read for the same
  premise.

Costs, accepted:

1. **Opaque refusals.** Any form POST with a null or foreign Origin, admin or not, gets Kit's plain
   403 (`Cross-site POST form submissions are forbidden`) before `handle`, so no cairn event records
   it, and `guard.refused` loses its `origin` reason. The branded `auth.csrf-token-invalid` page now
   fires only for token failures. The surviving diagnostic is the Workers Logs invocation record
   (method, path, status 403); `log-events.md` and the `is-it-working` facts carry an anchor keyed on
   Kit's literal message.
2. **Dev.** Non-admin forms lose Origin enforcement in `vite dev`, except `createAuthChannel`'s
   actions. Sites on the dev backend never ran Rule 2 in dev anyway.

A `web-auth-security-reviewer` reads this section before S3 is dispatched. The risk lens already
answered the original two questions (the confirm URL's Referer exposure under `strict-origin`, the
303 hop included, and cross-site simple-content-type requests: see its "Verified non-gaps"), so the
read covers what the fold changed: the Kit 2 ordering, the admin referrer meta, and the doctor's
`trustedOrigins` check.

### Public origin

`paths.origin` can't replace `PUBLIC_ORIGIN` in `csrfSecure` and `readPublicOrigin`, because a library
can't read it at runtime. The magic-link URL must keep coming from configuration rather than the
request's Host, so `PUBLIC_ORIGIN` stays. A site served behind a proxy whose request URL origin
differs from the browser's sets `paths.origin`, or Kit's check refuses its admin POSTs; that is a
facts bullet.

### Kit 3 API moves

- `Handle` imports from `@sveltejs/kit/hooks` in the engine (`guard.ts`), the dev package, and every
  template `hooks.server.ts`.
- The identity `logoutUrl` redirect (`auth-routes.ts:474`) passes Kit's allowlist form,
  `{ external: [<the validated logoutUrl's origin>] }`; the relative fallback needs no option. The
  guard's validation (`guard.ts:126-154`) stays.
- The 4.0 deprecations move now: `$app/environment` becomes `$app/env`, `invalidateAll` becomes
  `refreshAll`, and the `json` and `text` helpers become `Response.json` and `new Response`.
- Subpath imports replace aliases: `$lib` becomes `#lib`, and the showcase's and Waymark's
  `$chassis` and `$theme` become `#chassis` and `#theme`, each through a package.json `imports` field,
  in the showcase, Waymark, and the scaffold.
- The `handleError` comments at `section-action.ts:118` and `admin-action.ts:60` are re-read against
  Kit 3, which now passes every error. Each is fixed only if it misstates the behavior.
- Peers: cairn's `@sveltejs/kit` peer becomes `^3` and svelte `^5.57.1`; `@glw907/cairn-cms-dev`'s
  kit peer becomes `^3`. cairn declares no vite peer; vite `^8.0.12`, vite-plugin-svelte `^7`, and
  wrangler `^4.118` are consumer floors from Kit's and the adapter's own peers, already met by the
  template pins. Node `>=22.17` is already met.

### Config in the Vite plugin

The showcase, Waymark, and the `create-cairn-site` scaffold move their configuration into
`sveltekit({ ... })` in `vite.config` and delete `svelte.config.js`. The repo root's
`svelte.config.js` stays: the root is a library with no `sveltekit()` plugin, and `@sveltejs/package`
and the component project read it.

### Doctor (tool major)

`check_csrf.go` is repurposed rather than deleted: it reads the `csrf` key in the Vite config and
fails on a `trustedOrigins` entry of `'*'`, the literal Kit's own removal note recommends, which turns
the check off on every route and leaves the admin's form POSTs on the token alone. Other entries pass
with a detail that they widen `/admin` too. It reports under a new check id with a new condition in the
engine registry, mirrored to `conditions.json`. `config.csrf-disable`, `config.csrf-disable-missing`,
and `auth.csrf-origin-mismatch` retire. `check_referrer.go`'s remedy is reworded (above), and the
dependency-floor expectations bump.

`cli-cairn-json-output.md` freezes doctor check ids and condition ids from tool `v1.0`, and removing
one is major, so the tool goes to `v2.0.0` under its changelog's Unreleased and releases with the
engine cut. That is the contract's one answer: tombstone ids are a compatibility shim, and repurposing
`config.csrf-disable` changes a frozen id's meaning without a version signal. The released `v1.1.0`
doctor tells Kit 3 sites to set `checkOrigin: false`, now a build error, so the tool upgrade is a
Consumers must line. The `docsAnchor` fragments `non-admin-origin-rejected` and
`wire-cairns-csrf-guard` stay on `scripts/checks/shipped-anchors.json`, since released binaries print
them; facts bullets record that the admin arm keeps those headings. `site-config-path.json` is
unrelated (`src/theme/site.config.yaml`) and doesn't change.

### Sequencing with stage 2a (the spec's call)

The add-cairn tutorial's Kit 2 pin, `f:skeche`, `f:ghzx9c`, and `facts/extend.md:144`'s `^2.70` claim
all live on the `draft-docs-2a` worktree, which another executor owns. This pass doesn't edit that
branch: Kit 3 lands on `main` first, and 2a rewrites them against Kit 3 when it rebases. STATUS
currently scopes the tutorial pin into this pass, so the close rewrites STATUS to carry these as 2a
carry-forwards.

### ROADMAP watches this pass trips

Three entries trigger on "the next pass that touches `packages/cairn-cms-dev`": the `APP_DB` overwrite
(`ROADMAP.md:938-946`), the in-memory `MEDIA_BUCKET` hiding seeded media (`:872-882`), and the missing
`cairnAccess` (`:1556-1582`). The Kit 3 port changes how the doubles travel, not which doubles exist, so
all three defer with the trigger re-armed to "the next pass that changes the dev package's double set
or `DevBackendConfig`".

## Segments

Each segment ends on a green commit. The plan sets tasks, files, and gates. Kit 2.70 hosts S1 through
S3, so the bump carries only what Kit 3 forces.

- **S0, spike (gate for the bindings and harness design).** On a scratch branch, add a probe
  `cloudflare:workers` read in a module reached from `@glw907/cairn-cms/sveltekit`; `npm pack`; install
  the `.tgz` by path into a fresh Kit 3 / adapter 8 project outside the repo, with no `ssr.noExternal`,
  no `file:`, and no `npm link`. A route echoes one binding value. Prove:
  1. the value arrives under `vite dev`, `vite build` plus `wrangler dev` on the output, and a
     prerendered route through cairn's handle builds (with the `building` gate);
  2. a `withEnv` set in a handle shaped like `devBackendHandle` reaches an engine read and a site read
     across an `await` and a streamed load, using the real dev package;
  3. the showcase's e2e build boots under `wrangler dev` with the dev backend: whether workerd
     supports `node:sqlite` (`channel-db.ts:45`, used by `members/dev-wiring.ts:19`), how the opt-in
     flag reaches the worker (`.dev.vars` or `--var`; the showcase declares no `nodejs_compat`).

  Stop rules: `vite build`, prerender, or `wrangler dev` needing site config stops the pass as an
  architectural fork for Geoff. `vite dev` failing alone is a recorded gotcha and the pass goes on. If
  `node:sqlite` is absent, the showcase's members fixture moves to a local D1 binding (a
  showcase-only fixture, not the dev package's double set). The harness script is kept so the close
  re-runs it against the final tarball.
- **S1, groundwork on Kit 2.70.** The 4.0 deprecations, and config into the Vite plugin for the
  showcase and Waymark.
- **S2, the e2e host moves to `wrangler dev` (Kit 2.70).** The showcase e2e, its visual baselines and
  CI width matrix, and `norms.yml` serve the build through `wrangler dev` instead of `vite preview`,
  with the dev-backend flag delivered per S0. Adapter 7's output runs there too, so the move lands green
  before the bump, and baselines are unchanged because the build is. Acceptance: the whole existing
  suite green on the new host.
- **S3, CSRF on Kit 2.70 (after the security read).** Kit 2.70's check already rejects `Origin: null`
  before `handle`, so the change lands green without the opt-out and without any interim
  `trustedOrigins`. Contents: the Referrer-Policy header and meta, deleting `checkOrigin: false` from
  the showcase, Waymark, and the scaffold, the deletions above, the condition rewording, the guard
  comment, and the doctor task (pass class `tool`), which shares the condition registry. Proofs:
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
  `building` gate, and `withEnv` in both dev handles; the public-surface rulings; `App.Platform`
  deleted from the showcase, Waymark, and the scaffold; `Handle`; the redirect allowlist; subpath
  imports; the vitest per-project fakes; the two e2e helpers that POST with no content type
  (`members.spec.ts:26,177`) send a body. Acceptance, one grep-zero line: no `\.platform\b`,
  `App.Platform`, `PlatformContext`, `platform:` in test event literals, `$app/environment`,
  `invalidateAll`, `json(`/`text(` from `@sveltejs/kit`, or `$lib` across `src/lib`, the dev package,
  the showcase, Waymark, and the scaffold; zero Kit `config_option_deprecated*` warnings in the three
  builds; the showcase build prerenders; the full e2e suite is green under `wrangler dev`.
- **S5, scaffold, docs, and records.** `create-cairn-site` at the Kit 3 shape, the docs, and the
  kit#15992 cleanup. The scheduled routine (`trig_0193pPNoyxsTGeUhF1xx7woa`) was already rewritten on
  2026-10-03 at Geoff's request, its `checkOrigin` watch replaced by a "remote functions reach stable"
  watch, so that step is done. Owed: the `CLAUDE.md` watch line (`:211`), whose standing example needs
  a replacement, not only a deletion, and the four ROADMAP entries (`:52`, `:402`, `:1710-1716`,
  `:2150`).

## Pass class and close

The pass class is `auth-data`, because S3 and S4 touch the guard, the CSRF path, and the auth store's
binding reads. The doctor task is `tool`, and the docs task is `docs`. The close runs the full gate,
then re-runs S0's harness against the final tarball as the consumer proof: `npx sv create` (current
release, minimal TypeScript); `npm install <tgz>` exits 0 with no `--legacy-peer-deps` or `--force`;
the documented wiring and `wrangler types` applied; `svelte-check` 0 errors and 0 warnings; `vite
build` exits 0; `wrangler dev` answers `GET /admin/login` with 200. It fans out four reviewers:
`web-auth-security-reviewer`, `svelte-reviewer`, `cloudflare-workers-reviewer`, and a
`go-architecture-reader` per touched Go package. The live auth smoke follows, with Geoff's magic-link
click, on the target Ruling 1 sets; `docs/internal/admin-smoke-test.md`'s POST steps send an `Origin`
matching the Worker URL, since curl sends none and Kit's check now refuses it.

## Docs and records

- Reference pages: `admin-routes.md` (`CairnPlatformBindings`, the CSRF handoff), `sveltekit.md`
  (`CairnEvent`, `PlatformContext`, `resolveDb`'s rationale, the `createD1AuditSink` example),
  `auth-channel.md` (`DeliverContext`, `waitUntil`, the `process.env` sentence at `:140`), `core.md`,
  `cli-cairn-doctor.md`, `cli-cairn-json-output.md` (the frozen-id list), `supported-toolchain.md`, and
  `log-events.md` (`guard.refused` loses `origin`, `auth.channel.delivery_inline` retires, Kit's 403
  anchor). Any page naming `svelte.config.js`, `platform.env`, `platform.ctx`, `PlatformContext`,
  `checkOrigin`, or `process.env` for the flag is repointed. `check:surface -- --update` regenerates
  `api-surface.md`.
- Facts: a bullet for every public-behavior change, and corrections to the bullets this pass falsifies:
  `facts/admin.md` `f:ex1604`, `f:biealg`, `f:4dolfa`, and the anchor bullets `f:3mggl1` and
  `f:b66soa` (anchors kept, conditions marked retired); `facts/extend.md` `f:ix10bm`;
  `facts/reference.md` lines 591 and 1563. New bullets include the bodyless server-to-server POST
  refusal, the `custom_domain`-under-`wrangler dev` Origin mismatch, and `paths.origin` behind a proxy.
- The CHANGELOG under `## Unreleased`, the tool changelog (major), `migration-notes.md`, and
  `upgrade-cairn.md`.
- `docs/internal/durable-gotchas.md` gains the `cloudflare:workers` facts S0 proves, the prerender
  rule, and the `vite preview` limit.

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
- The kit#15992 scheduled routine: already rewritten (see S5).

## Rulings for Geoff

1. **Run the close's live auth smoke against the showcase under local `wrangler dev`, rather than a
   throwaway https `workers.dev` deploy?** Recommendation: yes. Yes builds a local D1, migrated and
   seeded, with the dev backend off and the magic link printed by the logging transport, reusing S2's
   `wrangler dev` host; it costs no provisioning, but it runs over http, so the `__Host-` prefix and the
   Secure branch go unexercised until cairn.pub's migration. No builds a throwaway deploy with a real D1
   and email, exercising https and the real Origin path, plus provisioning and teardown. (Deferring the
   smoke entirely to cairn.pub would leave nothing proving the engine live before the 2a release; not
   recommended.)
2. **Take `@sveltejs/package` 3.0.0, a major, in this pass through `dependency-upgrade`?**
   Recommendation: yes, unless its changelog survey finds a break beyond the config read. Kit 3 doesn't
   require it (3.0.0 still reads `vite.config` or `svelte.config`), but a release starts from every
   dependency's newest version and this pass already moves the toolchain. Yes adds one upgrade task with
   its survey to S1 or S4. No keeps `^2` and files the major as a ROADMAP entry.
