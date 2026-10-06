# Durable gotchas

Detail moved out of `CLAUDE.md` to keep that file inside its context budget. The first five
entries are indexed from `CLAUDE.md`; the rest live only here. Read the relevant one before
touching the area it names.

## Cloudflare email

Two surfaces, two error vocabularies; the `E_` table does not cross between them. The binding
`env.EMAIL.send({...})` throws `E_SENDER_NOT_VERIFIED` (the same string Routing uses for an
unverified destination, how the ecxc outage hid); `src/lib/email.ts` parses it. The REST send
(`POST /accounts/{id}/email/sending/send`) throws no `E_` codes: `10203`/`10204` (HTTP 403)
cover an unready sender, never onboarded or still propagating; elapsed time since onboarding is
the only discriminator.

Onboarding is `wrangler email sending enable <domain>` with the zone's apex name (arbitrary
recipients need Workers Paid); it writes DNS records including an apex DMARC at `p=reject`,
which deleting the subdomain leaves behind. Full detail, measured propagation, and every
captured body: `docs/internal/record/2026-08-11-t4b-email-spike.md`.

## Pointing a consumer at unreleased engine work

`npm run link:consumer -- <site-dir>` builds, packs, installs, and verifies; `--restore` puts the
site back on `^<version>` from the registry. A `file:` path cannot merge, so the un-pin has to be
as cheap as the pin.

It exists because `npm pack` derives the tarball name from the version, so re-packing changed code
reuses the filename, and a later plain `npm install` can serve the OLD build from npm's cache while
printing "up to date." The script content-hashes each pack and verifies every installed file
against it.

## A worktree showcase e2e proves MAIN's engine

In a feature worktree, `examples/showcase/node_modules` symlinks back to the main checkout, so
the showcase resolves `@glw907/cairn-cms` and `@glw907/cairn-cms-dev` to MAIN's build, not the
worktree's, silently proving the wrong engine until a from-scratch `npm install` in the
worktree's showcase repoints both `file:` deps. The adjacent stale-`dist` trap is closed
structurally by the showcase's `pretest:e2e` repackage hook; the symlink half is not. Reinstall
before trusting a worktree e2e, or rely on CI's real checkout.

## CI-canonical baselines this workstation cannot reproduce

The visual baselines are CI-canonical (`e2e.yml`'s `update_snapshots` regen commits them). After
a regen, this workstation's Chromium renders a few surfaces a few pixels differently (chassis-B2:
the 20 home and archive2 files from `4de378ec`), so a local `CI=1 test:e2e` fails on exactly
those files and cannot go green without committing a locally biased baseline, which is
forbidden. A local gate is green when its only visual failures are exactly the files the latest
regen commit rewrote; anything else is a real red. Lasting fix, a ROADMAP chore: pin the local
e2e to the runner's Chromium build and fonts, or run it in a matching container.

## Vite 8 ships TypeScript in dist `.svelte`

Vite 8 / Rolldown parses dist `.svelte` `<script lang="ts">` as JavaScript before the consumer's
Svelte plugin runs, so shipped TypeScript fails the consumer build. The post-package step
`scripts/build/transpile-dist-svelte.mjs` (wired into `package`) transpiles each dist `<script>`
body and KEEPS the `lang="ts"` tag (the markup still carries TS the Svelte compiler must parse).
Do not remove the step or strip `lang="ts"`. Full post-mortem:
[`docs/internal/record/2026-06-21-e2e-dist-svelte-build-failure.md`](record/2026-06-21-e2e-dist-svelte-build-failure.md).

## A components-layer rule cannot cancel a utility

Tailwind v4 orders its layers theme, base, components, utilities, and cascade layers resolve
before specificity. A rule in `@layer components` therefore loses to any utility class on the
same element, whatever its selector's specificity. Chassis-B1 (2026-09-08) shipped a band-to-footer
cancel (`.cairn-band + .site-footer { margin-top: 0 }` in
`examples/showcase/src/chassis/composition.css`) that never applied, because the footer's `mt-2xl`
was a utility. The regenerated visual baselines baked the 64 to 85 px strip in; only the
fresh-context verifier's pixel probe saw it. The fix moved the base spacing out of the utility
and into the same `@layer components` rule set, so the compound selector wins on specificity
(the comment at `composition.css:42` records it). Prove a cancel in the built sheet (both rules
in one layer) and by a measured height, never by the suite alone.

The admin side has the same root. daisyUI 5 compiles its component rules into sublayers of
`@layer utilities`, so an admin override in `@layer components` also loses to a daisyUI
component rule (the `.btn-primary` lift never rendered). Today's fix is a pinned unlayered rule
(the pinned-rule comments in `src/lib/admin/cairn-admin.css`); the theme identity spec
(`docs/superpowers/specs/2026-09-26-theme-identity-design.md`) introduces a named `cairn-idiom`
sublayer pinned after daisyUI's (`@layer utilities.daisyui, utilities.cairn-idiom;`).

## The component project stalls under file parallelism

From 2026-09-21 the component project's parallel browser pages stopped reaching the Vite
server on this workstation: every page prints `Cannot connect to the server in 60 seconds`
(`@vitest/browser` `client.js:433`), and the stock `npm test` hangs while holding the heavy gate
lock, because `cairn-run-gate` has no silence watchdog yet (ROADMAP chore). Three files in
parallel pass, twelve fail, and serial runs are clean. Ruled out with evidence: the Playwright
version, the gate's memory scope, orphaned headless shells, inotify, socket, file and process
limits, conntrack, and `localhost` resolving to `::1`. During a failing run the Vite server
listens on `[::1]:<port>`, Node is idle, and the port shows paired CLOSE-WAIT and FIN-WAIT-2
sockets. Root cause unknown; full record in `docs/HISTORY.md` (the doctor-retirement pre-task
entry).

When a component run prints that line, do not retry the stock gate. Kill the run's scope, run
`pkill -f 'chromium_headless_shel[l]'` (the bracket keeps the pattern from matching its own
shell), then run the heavy gate serialized:

```sh
cairn-run-gate 'npm run check && npx vitest run --project unit --project unit-dist-spawn --project integration && node scripts/test/contained.mjs npx vitest run --project component --no-file-parallelism'
```

That is the same project set as `npm test`, about 90 seconds for the component project. Once a
stock `npm test` passes after a reboot, delete this entry and the STATUS watch.

Contention looks similar. When two gates ran at once (2026-09-08, before the machine-wide gate
lock), a full `npm test` failed on exactly one unrelated file per run:
`src/tests/unit/audit/rendered.test.ts` (its BASE_URL contract on port 4173) or
`src/tests/unit/reference-coverage.test.ts` (the default 60-second timeout). Both reproduced green
alone with `npx vitest run <file>`. Rerun a lone failing file by itself before calling it a
regression.

## A probe site from `emit:template` sees no shipped guidance

`npm run emit:template` (`scripts/build/emit-template.mjs`) writes the template's source tree only. It omits
`.claude/`, `CLAUDE.md`, and `cairn-audit.config.json`, which the pack-time bake adds. A probe
that reads a site emitted this way sees none of the agent guidance a consumer receives, and its
audit falls back to the packaged sheet, which reports two false `no-uncompiled-class` errors
that the clean template does not. Pass B's first probe was invalid for this reason (2026-09-28).
Build a probe site the way `.github/workflows/create-site.yml` does: bake, pack the CLI, run
`create-cairn-site --yes`, then point the site's engine specs at the fresh tarballs.

## `cloudflare:workers` in the engine

The engine reads its bindings and `waitUntil` from `cloudflare:workers` through one module,
`src/lib/sveltekit/workers-env.ts`, and nothing reachable from a Node-context entry may import it
(`src/tests/unit/workers-env-reach.test.ts` walks the packed `dist`). The spike record
(`docs/superpowers/research/2026-10-03-sveltekit-3-spike/record.md`) proved the following, against a
packed engine installed into a fresh `sv create` project on Kit 3 and adapter-cloudflare 8.

- The import resolves under `vite dev`, `vite build`, and `wrangler dev` with no `ssr.noExternal`, no
  `file:` link, and no `npm link`. `env.X` returns the `wrangler.jsonc` `vars` value in all of them.
- Adapter 8's worker passes no `platform`, so a Kit 2-era engine reading `event.platform.env` answers
  `/admin/login` with a 500 (`guard.refused`, `config.bindings-missing`).
- `withEnv({ ...env, X }, () => resolve(event))` in a handle makes `X` visible to engine code and site
  code alike, across awaits, inside a `ReadableStream` `pull`, and in a promise a `load` returns.
  Spreading the current `env` is what lets two such handles nest.
- Wrangler's plain esbuild pass treats `cloudflare:*` as external, so a boundary test that bundles the
  packed engine needs `cloudflare:*` in its external list.

## Any `env` read while prerendering fails the build

While a build prerenders, every `env` trap and `withEnv` throws `Cannot access cloudflare:workers in
a prerenderable route`, because no Worker exists then. A handle that sits in front of prerendered
routes (the showcase prerenders its `(site)` routes behind the guard) must not touch `env` or
`withEnv` while `building` is true. The engine's gate is `await import('$app/env')` inside a
`try`/`catch` that falls back to `false`; a static `import { building } from '$app/env'` in a module
the `/sveltekit` barrel reaches fails the dist boundary test, since a plain bundler cannot resolve
`$app/env`. `$app/environment` is Kit 2's name for the same module.

## `vite preview` cannot serve adapter 8 output

Under adapter-cloudflare 8, `vite preview` fails with `ERR_UNSUPPORTED_ESM_URL_SCHEME`
(sveltejs/kit#17271, open). Serve a built site with `wrangler dev .svelte-kit/cloudflare/_worker.js`,
which also serves the assets. A run that needs the dev backend appends `-- --var CAIRN_DEV_BACKEND:1`
to that command. The flag never goes in `wrangler.jsonc` `vars` (it would ship), in an OS variable
(it reaches `vite preview`'s Node process, never workerd), or in a `.dev.vars` file left behind (a
lingering one turns every later default-build serve into the guard's 503).

## `node:sqlite` throws under workerd

In workerd at the showcase's flags, `await import('node:sqlite')` resolves, but `new
DatabaseSync(':memory:')` throws `Illegal constructor`. A check for "the module is absent" therefore
passes and the failure arrives at the first call. `createChannelDb` in `@glw907/cairn-cms-dev` is
Node only: it serves a vitest run or `vite dev` on Node, never a Worker, and the showcase's former
`membersDevHandle` called it, so it would have thrown this error under `wrangler dev`.

## Kit 3 emits server sourcemaps by default

A grep over a build for a dev-only identifier must skip `*.map`: Kit 3 writes a `.map` beside each
server chunk, and a map holds the authored source, so it matches every identifier the source names.
The dev-fold checks grep the executable bundle only. A Worker bundle is never served, and maps upload
only when `upload_source_maps` is set.

## A plugin must never start and close a nested Vite server under `vite dev`

Adapter-cloudflare 8 keeps one platform proxy on `globalThis.__sveltekit_cloudflare_platform`, and its
`closeServer` hook disposes it when any server closes with reason `close`. A plugin that creates a
nested Vite server (a manifest verify step, say) and closes it runs that hook against the proxy the
running dev server shares, after which every `cloudflare:workers` read throws and `/admin` answers
500 on every request. Under `vite dev`, `cairnManifest()` loads its verify module through the live
server (`configureServer`, then the SSR environment's `runner.import`); a build keeps its nested
server, since no running dev server shares the proxy there, and strips the adapter's
virtual-workers plugin from it so the verify starts no proxy at all. Filed upstream as sveltejs/kit#17344, with the fix in #17368; cairn does not
depend on it, and a scheduled routine watches the PR.

## An installed engine needs vitest's `server.deps.inline`

A vitest run over code that imports the engine's server modules, with the engine installed from a
registry or a tarball into `node_modules`, leaves the engine external, and Node's loader meets the
`cloudflare:` scheme directly and rejects it. Set `test.server.deps.inline: ['@glw907/cairn-cms']` so
vitest transforms the engine and a test's `vi.mock('cloudflare:workers')` applies to the engine's own
import. The first Kit 3 CI run, which installs the engine from a tarball, was where this surfaced.

## An e2e key press waits for hydration, not for server-rendered markup

A Playwright test that presses a keyboard shortcut must first wait on `.cm-content`, which CodeMirror
mounts client-side after hydration. The server-rendered heading shows about 130 ms before hydration
attaches `EditPage`'s window `keydown` listener, so a press in that gap is dropped (the zen-mode
tests failed 3 of 36 isolated runs until they waited, and failed 15 of 15 under a 600 ms chunk delay).

## The full gate tier mirrors `test.yml`, and a tree-grepping helper skips generated directories

`scripts/checks/gate-tier.mjs` pins its `full` tier against the steps of `test.yml`'s test job, so the
local full gate runs every check CI runs, `check:dev-package` included. A test helper that greps the
tree must exclude `node_modules`, `.wrangler`, `.svelte-kit`, and `test-results` at the walk itself:
every `wrangler dev` run leaves a bundle under `examples/showcase/.wrangler/tmp`, and a corpus test
that greps one token at a time passed its timeout after about twenty local e2e runs while a clean CI
checkout never saw it (`check-symbols`'s `envVarInSourceTree` went from 60 s to 3 s).
