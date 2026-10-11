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

A site pinned to a released engine cannot be linked and measured while `main`'s unreleased window
renames exports the site's own code calls: `npx cairn-manifest` failed with `extractMenu is not a
function` on one production site this way. Run a pre-flight against the site's pinned version first,
and measure on a scratch copy with the call sites edited, or release first.

Do not use `npm link` to try unreleased engine work in a site. It symlinks the whole engine
directory into the site's `node_modules`, and the engine's nested `node_modules` can carry a
different version of a shared dependency than the site's hoisted copy. Under Vite SSR bundling that
produced `does not provide an export named 'X'` build failures unrelated to the change under test.
A packed tarball goes through the site's own install like a published package, which is the path
`link:consumer` takes. Whatever installed the tarball, `npm ci` afterward leaves `node_modules`
matching the site's lockfile; a hand-run `npm install --no-save <tarball>` can leave
`package.json`, the lockfile, and the installed version number all reading as the registry release
while the files on disk are the unpublished build.

A consumer site's `npm run check` and `npm test` are not its whole gate. SvelteKit validates route
exports only at build time, so a `+server.ts` or `+page.server.ts` that exports a constant under
any name SvelteKit does not recognize (and that has no leading `_`) type-checks and unit-tests
clean, then fails `npm run build` with `Invalid export '<name>'`. Add `npm run build` to a site's
verification, and keep a shared constant in a plain lib module that the route and the test both
import.

## A worktree showcase e2e proves MAIN's engine

In a feature worktree, `examples/showcase/node_modules` symlinks back to the main checkout, so
the showcase resolves `@glw907/cairn-cms` and `@glw907/cairn-cms-dev` to MAIN's build, not the
worktree's, silently proving the wrong engine until a from-scratch `npm install` in the
worktree's showcase repoints both `file:` deps. The adjacent stale-`dist` trap is closed
structurally by the showcase's `pretest:e2e` repackage hook; the symlink half is not. Reinstall
before trusting a worktree e2e, or rely on CI's real checkout.

The reinstall (`rm -rf examples/showcase/node_modules examples/showcase/package-lock.json`, then
`npm --prefix examples/showcase install`) has two side effects. A fresh install can pull a newer
Playwright than the cached browser binary supports, and then every spec fails with
`browserType.launch: Executable doesn't exist`; a wall of launch errors rather than assertion
failures is the tell, and `npx playwright install chromium` inside `examples/showcase` fixes it. The
install also re-locks `examples/showcase/package-lock.json` against the current registry, which
dirties the tree for nothing the task changed. Run `git checkout -- examples/showcase/package-lock.json`
once the run has passed.

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
in one layer) and by a measured height, never by the suite alone. A passing visual snapshot is not
proof: a `min-height: 100vh` clamp hid this bug at some widths while it stayed live at others.

An inline `style="margin: 0"`, or any unlayered class rule that sets `margin`, beats every `@layer`
too. Two `<p style="margin: 0;">` children inside a `.cairn-section` painted with no gap, because
the primitive's `.cairn-section > * + *` rule lives in `@layer components`. When a demo or page
adopts a layered composition primitive, give its children a class that declares typography only and
no margin property at all.

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
sockets. Root cause unknown; full record in
`docs/superpowers/plans/2026-09-21-doctor-pretask.md`.

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

Another worktree's gate on the same machine causes the same kind of failure. A full `npm test`
then fails a different unrelated file on each run: a polled DOM wait in the component project, a
`Test timed out` on a real-corpus scan, or `Browser connection was closed while running tests`.
Check `ps aux | grep -E 'vitest|npm test'` for a process rooted in another worktree path, wait for
it to exit, and rerun. A preview server on port 4173 from another worktree is a quieter version of
this: `src/tests/unit/audit/rendered.test.ts` asserts that nothing answers on the default
`http://localhost:4173`, so a live server there fails it on an untouched `HEAD` too
(`ss -ltnp | grep 4173` confirms). Only a failure that survives a contention-free rerun is yours.

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

## Playwright `page.unroute` needs the same function reference `page.route` received

`page.unroute(matcher)` with a function matcher removes nothing unless it is handed the very function
that `page.route` registered. A helper that builds a fresh closure per call (`actionUrl(name)` in
`examples/showcase/e2e/edit-save-failure.spec.ts`) makes `unroute` a silent no-op, and the retry test
hangs until its timeout (30 seconds before the cause was found). Build the matcher once, keep it in a
variable, and pass that variable to both calls.

## The full gate tier mirrors `test.yml`, and a tree-grepping helper skips generated directories

`scripts/checks/gate-tier.mjs` pins its `full` tier against the steps of `test.yml`'s test job, so the
local full gate runs every check CI runs, `check:dev-package` included. A test helper that greps the
tree must exclude `node_modules`, `.wrangler`, `.svelte-kit`, and `test-results` at the walk itself:
every `wrangler dev` run leaves a bundle under `examples/showcase/.wrangler/tmp`, and a corpus test
that greps one token at a time passed its timeout after about twenty local e2e runs while a clean CI
checkout never saw it (`check-symbols`'s `envVarInSourceTree` went from 60 s to 3 s).

## A scratch showcase copy outside the repo bundles CommonJS `yaml`

A copy of `examples/showcase` under `$HOME/.cache` links the engine by `file:`, which installs no
runtime dependencies of the engine beside it. Vite then bundles the CommonJS build of `yaml` with a
`createRequire` shim, and the shim fails under workerd. Install the engine's runtime dependencies
into the copy (`npm install` the packages in the engine's `dependencies`) before `wrangler dev`.

## A fresh worktree needs CI's setup before a full gate means anything

A new worktree starts with no install and no build output, and several checks pass, skip, or fail
for that reason alone. Run the setup before trusting a red or a green:

- `npm ci` at the root, then `npm ci --prefix examples/showcase`. Without the root install, Vitest
  resolves the main checkout's `node_modules` through the parent directories and tests the wrong
  tree. `check-public-skill.test.ts` skips itself when the showcase has no `tailwindcss` binary.
- `npm run package`, which builds `dist`. The same test skips without `dist/audit/index.js`, and
  `emit-tool-conditions.mjs` and `check-readiness.mjs` read `dist` rather than the TypeScript source.
- The baked create-cairn-site template (`test.yml`, the "Bake the create-cairn-site template" step),
  which most `packages/create-cairn-site` tests read; without it they fail with `ENOENT` or
  `scaffold: no template found`. The template is gitignored and only `prepack` bakes it, never
  `npm install` or `npm test`. From `packages/create-cairn-site`, with `V` the root package version:
  `node scripts/bake-template.mjs --to template --engine-spec "^$V" --dev-spec "^$V"`.
- `npx svelte-kit sync` in the showcase, which its `npm run check` script runs first. Without it
  `check-public-skill.test.ts` fails with `TSCONFIG_ERROR` for the missing
  `examples/showcase/.svelte-kit/tsconfig.json`. The output is gitignored.

The 20 `site-visual` failures a local e2e run reports are the expected drift described in the
CI-canonical baselines entry above, and the symlinked showcase `node_modules` has its own entry
("A worktree showcase e2e proves MAIN's engine").

## `npm run check` runs out of memory in the light gate lane

`cairn-run-gate`'s light lane caps its scope at about 3 GB, and V8 sizes its heap from that limit.
`svelte-check` over the root program then dies near 1 GB (exit 134, V8 out of memory), on a gate that
passes in seconds with room to spare. Set `NODE_OPTIONS=--max-old-space-size=6144` on the command
(`NODE_OPTIONS=--max-old-space-size=6144 npm run check`). A gate string that names a scripts or
config change must still include `npm run check`, since `svelte-check` also type-checks the JSDoc in
plain `.mjs` files: a `scripts/checks/*.mjs` that a unit test imports is checked under `checkJs`, so
it needs JSDoc parameter types and typed empty arrays. The env prefix works inside a
`cairn-run-gate` string. The measurement is in
`docs/superpowers/research/2026-10-08-pass-a-s1-reports.json`; a lane-level default is the lasting
fix and belongs to the runner, not to this repo.

## Tailwind scans every file under the project, specs included

Tailwind v4 walks up from a stylesheet to the project root and treats every string it finds in a
scanned file as a candidate class, so a class literal in an e2e spec or a doc compiles into the
sheet when it names a real utility. The admin sheet turns automatic detection off for this reason
(`scripts/build/admin-css.input.css`, `source(none)` plus explicit `@source` roots), and the
showcase's `tokens.css` excludes `.claude` with `@source not`. Keep a test fixture's class-like
strings out of any scanned root, or exclude the directory.

## `/tmp` is a size-limited tmpfs

On this workstation `/tmp` is a tmpfs of about 8 GB shared with every other session. A Go link step
that fails with a quota error is the machine, not the code: check `df -h /tmp` before reading it as
a build break. The theme fixture's template arm installs a whole site under `os.tmpdir()`, so set
`TMPDIR` to a directory on disk (`TMPDIR=$HOME/.cache/cairn-tmp`) before running it
(`scripts/lab/theme-fixture.mjs`, header).

## Never pipe a gate or `npm test` through `tail`

Piping `npm test`, `npm run check`, or a `cairn-run-gate` call into `tail` or `head` loses the
command's exit code (the pipeline reports `tail`'s, so a failing run can read as success) and hides
all output until the command exits. The workstation's `claude-tail-guard` PreToolUse hook blocks the
piped form for those commands, `ci-green`, and `gh pr checks`, with the message "piping a gate or
CI-watch command into tail or head hides its output". Run the bare command. `cairn-run-gate` saves
the full log and prints its own `gate exit: N` line.

The workarounds that look safe are not. Inside a gate string, `${PIPESTATUS[0]}` does not expand,
because the string does not reliably run under bash. One call printed "Invalid environment variable
name" and still reported exit 0 over a failing test. If you want a log copy, write a `bash` script
with `set -e` and make that the gate string, or redirect to a file and read the file.

## `cairn-run-gate` needs the Bash tool's 600000 ms timeout

`cairn-run-gate` waits up to 540 seconds by default, then prints `gate still running` and exits 75.
The Bash tool's own default foreground timeout is 120 seconds, so a call without an explicit
`timeout: 600000` is auto-backgrounded before the runner can answer. Pass the timeout on the first
call. When a call returns `gate still running`, issue the same command again with the same timeout
rather than polling the log; each reattach waits only for the remaining time. Reissue only while it
says `still running`, since a command issued after the gate finished starts a fresh run.

If the harness backgrounded the call anyway, the background notification and the last lines of the
gate log (`gate exit: N`) are authoritative over a racing second call. A light-lane gate under
contention can also pass 600 seconds, so do not poll that either.

## Do not rebuild `dist` while `npm test` runs

Several `check:*` scripts (`check:reference`, `check:surface`, `check:consumers`, `check:visuals`,
and more) run `npm run package` first, which rebuilds `dist/` in place. A few unit tests
(`sveltekit-barrel-prune.test.ts`, `delivery-media-vite-barrel-prune.test.ts`) load `.d.ts` files out
of `dist/` through `scripts/checks/reference-coverage.mjs`. A rebuild that overlaps a running
`npm test` can catch `dist/` mid-write and fail those tests with
`cannot load .../dist/sveltekit/index.d.ts`, with nothing wrong in your code. Run `npm run package`
once, then `npm test` alone, and run the `check:*` scripts before it or after it.

The opposite failure is a stale `dist/`. The packaged-bin tests (`media-seed.test.ts` and its
siblings) check `existsSync('dist/<tool>/bin.js')` and skip when it is absent, so `npm test` never
forces a build. When a `dist/` from an earlier session exists, they run against the old bin, and a
new `--help` or any other bin-level change fails with an exit code that looks like a regression. Run
`npm run package` right before the targeted run whenever the change touches a `src/lib/*/bin.ts`.
Any `check:*` script that packages first has the same effect.

## A full-page screenshot does not repaint a fixed element past the page box

A `position: fixed; inset: 0` element, such as the `[data-theme]::before` ground in
`src/lib/admin/cairn-admin.css`, paints correctly under real scrolling. In a Playwright capture with
`fullPage: true` it stops at the bottom of the tallest normal-flow box, even though
`document.documentElement.scrollHeight` includes an absolutely positioned descendant's overhang
past that point (a forced-open dropdown on a short admin page, by about 20 to 35 px). The sliver
shows the unthemed canvas in the CI baseline while a real browser looks right.

Verify a fixed or sticky fix both ways: a scroll-to-bottom screenshot proves the CSS, and a
`fullPage: true` capture of the exact scenario proves what the baseline shows. No CSS workaround
is known, because `absolute`, `sticky`, and `background-attachment` all meet the same limit. When
the two diverge, say so in the report instead of claiming the baseline moved.

## A Vitest browser-mode mock factory cannot close over a file-scope `let`

A `vi.mock('./module.js', async (importOriginal) => { ... })` factory that reads an outer `let`
throws under the browser mocker: "make sure there are no top level variables inside, since this
call is hoisted to top of the file". Declaring the `let` before the `vi.mock` call does not help,
because the browser mocker rebuilds the factory with no access to file-scope bindings. Wrap the
mutable state in `vi.hoisted()` and let the factory and the test share that reference
(`src/tests/component/MarkdownEditor.test.ts` has the `spellcheckGate` pattern). Reach for it by
default for any component-suite mock that needs behavior a test controls at run time.

## Writing a check script or a CLI bin

`findProcessExitLines` in `scripts/checks/check-idioms.mjs` flags any line containing
`process.exit(` in `scripts/checks/*.mjs`, not only at module scope. Set `process.exitCode = N` and
return. The house entry guard is `if (process.argv[1] && resolve(process.argv[1]) ===
fileURLToPath(import.meta.url)) { main(); }`, so a unit test can import the pure helpers without
running the CLI. When you restructure an existing script this way, diff its output before and after.

Vitest's SSR transform tolerates a named import that the target module does not export (it becomes
`undefined`), so a unit test can pass while `node scripts/checks/x.mjs` dies with a `SyntaxError`.
Run a new script once directly with `node` before trusting its unit test.

The shipped bins (`src/lib/audit/bin.ts`, `media-seed/bin.ts`, `guidance/bin.ts`, `vite/bin.ts`)
end in an unguarded top-level `await main()`. Importing anything from one in a unit test runs the
whole CLI. Put a new pure helper in the sibling module the bin already imports, and have both the
bin and the test import it from there.

## Docs symbol sweep failures that name no real symbol

`scripts/checks/check-symbols.mjs` runs from `npm test` (`src/tests/unit/check-symbols.test.ts`),
not from `check:snippets`, so a docs edit can pass `npm run check` and the snippet gate and still
fail here. Three shapes recur, and `node scripts/checks/check-symbols.mjs` reproduces each in
seconds without a rebuild.

- A path inside a fenced block's `//` comment is checked against the repo root, not the doc's
  directory. `// see [x](../reference/sveltekit.md)` extracts `reference/sveltekit.md`, which does not
  exist. Cite another doc by bare filename or in prose, with no slash.
- A `--flag` in a fenced shell block resolves only against `create-cairn-site`'s own argv parser.
  `npx cairn-audit --help` in a fenced example fails as an unresolved `cli-flag` until
  `scripts/checks/check-symbols-allowlist.mjs` carries a `'cli-flag:--help'` entry with a comment
  naming the real tool. The same flag in a table cell is never scanned, which makes the failure look
  inconsistent. Grep the allowlist first, since another tool may already have claimed the flag name.
- Any SCREAMING_SNAKE_CASE token in code voice is an `env-var` claim. A vendor's error codes, such
  as jose's `ERR_JWT_EXPIRED` in a recipe's `switch (err.code)`, share the shape and have no source
  match. Add them to the allowlist, keyed `<class>:<token>`, each with a one-line reason.

## `check:self-use` refuses a showcase call on an auth path

`scripts/checks/check-self-use.mjs` accepts a showcase call site as the discharge for a zero-caller
export, except for an export declared under `src/lib/auth*` or in one of
`src/lib/sveltekit/{guard,csrf,admin-action,section-action}.ts`. A new type or interface there with
no in-engine caller goes straight to `scripts/checks/check-self-use-allowlist.json`, with the
relevant `docs/internal/engine-rulings.md` slug in the reason (`no-ledger-row: true` when no audit
row exists). The rule is deliberate: a security seam must not be discharged by a demonstrative auth
call in the exemplar that sites copy. Run `npm run check:self-use` after adding such an export.

## Adding or removing an export touches more than the barrel

`src/lib/auth/store.ts` is not the `/auth-store` entry point. `src/lib/auth-store/index.ts` is, and
it re-exports a hand-picked few, so a new function in `store.ts` publishes nothing and costs no
reference entry. Most `src/lib/<area>/` directories split the declaring file from the subpath entry
point this way. Check the barrel before assuming an `export` is public.

Removing a name from a barrel, or dropping its `export`, breaks importers that no lint rule
names. `npm run check` and `npm test` find them, so run both.

- `export` visibility is per file. Once the keyword is gone, a test that imports the name from
  `../../lib/<area>/module.js` fails to compile, just as an outside consumer would. Repoint the test
  onto a surviving public seam.
- When the declaring file is the subpath's own entry point, dropping `export` is the whole change,
  and every in-tree importer of that entry point breaks, `.svelte` files included. Give each one a
  local type alias built from the replacement expression the ledger names, instead of relocating the
  declaration.
- Some internal files import a sibling subpath through its own public barrel. Internal components
  import from `../admin-toolkit/index.js`, not from `format.js`. Grep `\bName\b` across `src/lib` and
  read each hit's import path before dropping a barrel line.
- A name can pass through a mid-layer re-export before the public barrel
  (`sveltekit/content-routes.ts` forwards from the `content-routes-*.ts` files, then `index.ts`
  forwards again). A forwarding line is dead weight only if no real `import { type X }` reaches it.
  Check every layer.
- The barrel-membership tests (`*-barrel-prune.test.ts`, `*-exports.test.ts`) read the packaged
  `dist/*.d.ts` inside an `it()` block, so `npm run check` never sees a stale `KEPT` entry. Grep
  every one of them for each retired name, and move a retired name to the file's demoted list with
  its "no longer resolves" assertion instead of deleting the line.

## Adding a diagnostic condition or a log event

A new entry in `REGISTRY` (`src/lib/diagnostics/conditions.ts`) has coupled edits that
`npm run check` does not see. `src/tests/unit/conditions.test.ts` pins `allConditions()` at an
exact length, so bump it. `check:readiness` requires a `docsAnchor` that is on the append-only
`scripts/checks/shipped-anchors.json` list (or, once the admin arm holds a page, a real heading
there), unless an allowlist entry excuses it, and the allowlist is deliberately empty. Two
conditions may share one anchor, which is the cheap path when an existing section covers the
reader's situation. The registry is mirrored into `tool/internal/spine/conditions.json`, which
`check:tool-conditions` compares byte for byte; regenerate it with
`node scripts/build/emit-tool-conditions.mjs`. Throw it as `CairnError(id, { cause, message })`; the
custom `message` should name the fix, since the default is the condition's `title`.

A new `CairnLogEvent` is two edits. Add the union arm in `src/lib/log/events.ts` and a row in the
matching section of `docs/reference/log-events.md`. `src/tests/unit/log-events-table.test.ts`
parses both and asserts the sorted name lists are equal, so one without the other is red under
`npm test`. `check:symbols` resolves a dotted lowercase name in docs prose against the same union,
so the arm must exist before a CHANGELOG line can mention the event.

## A D1 statement change needs the dev fake database

`packages/cairn-cms-dev/src/fake-auth-db.ts` dispatches on the store's exact SQL strings, matched as
normalized substrings, and throws with the SQL in the message on any statement it does not
recognize. Rewording a statement in `src/lib/auth/store.ts` or `src/lib/auth-channel/store.ts`, or
adding a column to a `RETURNING` clause (as `deleteSession` does for `expires_at`), breaks the dev
backend until the handler's match string and the mirrored literal in its own test file change with
it. That test file sits in the root `unit` project, so plain `npm test` runs it.

## `check:comments` rejects shapes the other gates accept

`npm run check` and `npm test` both pass these; only `npm run check:comments` (ESLint with the TSDoc
and jsdoc plugins) fails. Run it after any doc-comment edit in `src/lib`.

- A backticked code span that wraps across a line break inside a `/** */` block fails with
  `tsdoc-code-span-missing-delimiter`, once per line. Keep each span on one line, or reword.
- A doc comment that spans more than one physical line must open with a bare `/**` line. Text after
  the `/**` is fine only in a true one-line comment. A literal `@layer` or `@media` in prose reads as
  an unknown tag, so wrap it in backticks.
- For a destructured options parameter, write no `@param` tags at all. `jsdoc/check-param-names`
  wants one `@param options.field` per field, and `tsdoc/syntax` rejects a dotted name, so the two
  rules agree only on prose. Describe each field in the main paragraph and keep `@returns` and
  `@throws`. A non-destructured `options` can keep `@param options`.

## A local `check:vale` can differ from CI's pinned Vale

CI downloads a pinned Vale (`test.yml`'s "Install Vale" step, 3.23.0 at the time of writing) and the
workstation's copy can be newer (3.24.0). On an earlier drift the newer binary reported
`Google.EmDash` and `Microsoft.Quotes` errors in files byte-identical to `main`. Compare
`vale --version` with the pin when `check:vale` is red on a page you did not touch, and confirm with
`git diff --stat main -- <file>`. If the file matches `main`, it is a toolchain difference, not a
regression, and an unrelated task does not fix it.

## Editing `tool/`, the Go CLI

`tool/` is a separate module with its own gate (`make -C tool check`). These traps each cost a
gate round.

- `tidy-check` runs `go mod tidy` and then `git diff --exit-code -- go.mod go.sum`. It proves the
  committed module files are tidy, so a correct but uncommitted `go.mod` change fails. Commit it
  first.
- `tool/internal/render/purity_test.go` counts the module's direct requires. Importing a package that
  was only an indirect require (`github.com/spf13/pflag` through cobra) promotes it to direct and
  fails the count, because ADR-0002 makes each direct dependency a deliberate decision. Avoid the
  import, or raise the count with a comment saying why.
- `cmd/copylist` extracts only `*ast.BasicLit` constants from `cmd/cairn/messages.go`. A constant
  built with `+` never reaches `testdata/copy.golden.md`, while a single raw-string constant such as
  `agentsPage` does. Editing `agentsPage` takes `make -C tool copy-list` and a committed golden;
  editing a concatenated `Long` string does not. A help string cannot read a constant from another
  package, since the extraction parses source.
- `cairn help agents` is capped by `agentsPageLineBound` in `cmd/cairn/help_agents_test.go`. Raise it
  the way the constant's doc comment records, with the reason, not silently.
- `tool/internal/version.Documented` is the release the published contract pages state in their
  opening line. `TestThePagesDescribeTheDocumentedRelease` compares it with the pages, so a release
  that changes what the pages describe bumps the constant with them.
- `govulncheck` reports only a reachable vulnerability. To prove the gate can fail, pin a vulnerable
  module and call the vulnerable function from `main()`, confirm the red, then remove both. An unused
  import is silently excluded.
- `tool/tools/go.mod` holds the tool binaries in a `tool (...)` block. Build them with
  `go build -C tools -o <path> <package>`, never a global install, so the product module's `go.mod`
  stays free of tooling.
- A repo-wide test that greps for the literal `//go:build` finds its own source
  (`tool/internal/hygiene/buildtags_test.go` skips itself). Skip the test file's path in the walk
  instead of obfuscating the string.

## Showcase chrome traps

The header and the footer both name their nav `class="site-nav"`. A Playwright locator
`nav.site-nav a` matches both, so a bounding-box assertion measures the wrong element. Scope the
locator to `.site-header nav.site-nav a` or its footer twin.

A `.cairn-band` on the same `<main>` as `.site-main` does not go full bleed, because `.site-main`'s
`max-width` still caps it. Keep `.cairn-site-main` (the flex item that pins the footer) and
`.cairn-band` on `<main>`, and put `.site-main` on an inner `<div>` that carries the centered
column. To break a styleguide demo out of its reading column, reuse `.cairn-place-full` instead of
writing a second full-bleed mechanism. Check either with a full-page capture at a narrow and a wide
width, where the band's ground color should touch both viewport edges.

## A rename sweep and a tree deletion treat the record docs differently

A drift-hunt after a rename or a public-surface narrowing edits the living docs: `docs/reference/`,
the guides, and the `engine-rulings.md` ledger. Point-in-time documents describe what was true when
they were written, so a hit in `docs/internal/record/`, `docs/superpowers/plans/`,
`docs/internal/history/`, or a dated design or research brief is evidence to leave alone. A plan's
rename table is the task's own source text. A grep hit is also not drift when the sentence never
claims the name is public. `docs/internal/admin-smoke-test.md` names internal source paths and raw
`?/actionName` forms on purpose, to point a curl recipe at the source. Ask of each hit whether the
sentence claims the name is reachable through the narrowed public surface.

Deleting a script or tool tree is the exception, because a dead link is a mechanical defect.
`docs/internal/record/*.md` files can hold real Markdown links into the deleted files, and
`docs-links.mjs` reads them. Its allowance for dated records covers only paths on the committed
deletion list. After a `git rm -r` of a directory a record cites, grep the record tree for the
directory name and run `npm run check:docs`. Convert each broken `[`path`](../../../path)` to plain
code plus a short factual clause that the path is gone, and leave the rest of the prose alone.

## `git commit -- <path>` commits unstaged hunks too

`git commit -m "..." -- <pathspec>` commits the pathspec's full working-tree state, exactly as if
you had run `git add <pathspec>` first. It does not honor a hunk staged with `git apply --cached`
or `git add -p`. To land one hunk from a file that another process is still editing, stage it and
run `git commit` with no pathspec, then check `git status` and undo with `git reset --soft HEAD~1`
if the diff is larger than intended. A consumer-site repo can carry another session's work on a
different branch, so check `git branch --show-current` and `git status` before editing, not only at
commit time. If the branch is wrong or the file already has unrelated changes, leave your edit
uncommitted and report the conflict.
