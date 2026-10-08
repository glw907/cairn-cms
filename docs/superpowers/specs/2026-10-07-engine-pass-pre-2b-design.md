# Engine pass before stage 2b: design

Status: folded after the four-lens spec review, 2026-10-07, for Geoff's read. Inputs: the owner
rulings (`docs/superpowers/specs/2026-10-07-engine-pass-pre-2b-rulings.md`), the candidate list in
`ROADMAP.md`'s Now tier on `draft-docs-2a` ("Engine pass before stage 2b"), the friction log at
`b38ef6b3` and the entries filed at `2f4ef9d8`, the charter
(`docs/internal/what-cairn-is-and-is-not.md`), and the rulings ledger
(`docs/internal/engine-rulings.md`). Every claim was checked against the code at `draft-docs-2a`;
line numbers below are that branch's. The F4 close review of the 2a close finish filed nothing
(verified at `38af392d`). The fold record is
`docs/superpowers/research/2026-10-07-engine-pass-pre-2b-spec-fold.md`.

## Goal

Fix, before draft docs stage 2b, the engine defects and design gaps whose fix improves the product,
and record a verdict on every other candidate so nothing is re-argued. The headline is one access
and role declaration that every reader uses. Rulings 2, 3, and 5 land as designed features: the
signups demo leaves the scaffold, an opt-in live GitHub key check, and a dev backend over the
site's real content.

## Settled decisions (Geoff's; not re-argued)

- **Scope (ruling 1).** An item earns its place by improving the product. A friction-log entry earns
  nothing on its own. The charter's premise test runs first on every item.
- **Signups demo (ruling 2).** It leaves the scaffold and stays in `examples/showcase` as the worked
  custom-admin-screen example.
- **Key rotation (ruling 3).** An opt-in live check mints a real installation token with the deployed
  key and reports whether GitHub accepts it. `/healthz` makes no network call unless asked.
- **Claude Code docs (ruling 4).** A fifth arm, `docs/claude-code/`, drafted by its own docs stage.
- **Dev backend content (ruling 5).** Under `npm run dev`, the dev admin reads and edits the site's
  real content files and saves to a local stand-in. `seedContent` goes.
- **Seed content (ruling 6).** The scaffold keeps `the-trail-crew.md` and `trail-safety-notice.md`.
  The genericize item is dropped and `check:leaks` keeps its exception.
- **Release shape.** Engine passes land on `main` and never release. One release follows stage 5.
  No consumer site migrates before it. A breaking change costs a `Consumers must:` line at that cut.
- **Agent guidance** stays in Claude Code's format, with no `AGENTS.md`. The general docs assume no
  coding assistant.

**This spec's own decision on batching.** `ROADMAP.md`'s boundary test (clause 1) says to fix before
the next docs stage any item whose fix would change what a page tells the reader. Ruling 1, later
and specific to this pass, allows "batch into the final engine batch" and says a friction entry
earns nothing by itself. Ruling 1 governs. A batched item that leaves a page caveat is tagged with
that page in the Next tier's batched entry, so the final batch revises the page in the same pass.
The close owes the ROADMAP amendment: clause 1 runs after ruling 1's product test, and clause 3's
"whichever engine pass runs next" reads "the final engine batch" unless a stage close pulls an item
forward.

## The lead: one access and role declaration

### What is wrong

The access map has two readers, and nothing makes them agree.

- The engine's own screens, write actions, and sidebar read the adapter's `access` through the
  composed runtime (`src/lib/content/compose.ts:41`). About forty call sites read `runtime.access`,
  for example `content-routes-media-library.ts:67` and the nav resolver at
  `content-routes-shell.ts:187`.
- `requireAccess`, `createSectionAction`, and `createAdminAction`'s `access` option read
  `locals.cairnAccess`, which only the guard attaches from its own `access` option
  (`src/lib/sveltekit/guard.ts:348,368,479`, `section-action.ts:275`, `admin-action.ts:294`).

The stock scaffold ships the split. Its hooks hand the map to both hook branches only
(`templates/waymark/src/hooks.server.ts:20,22`), and its adapter declares no `access`. So the
Signups sidebar entry (`templates/waymark/src/theme/cairn.config.ts:214`) shows to every editor,
while the route admits owners only. A developer who adds `media: ['owner']` to `src/access.ts` sees
no effect on the media screen, and no error or warning.

Roles have the same shape. The guard reads its own `roles` option (`guard.ts:174`), the engine reads
`runtime.roles` (`cairn-admin.ts:118`, `content-routes-shell.ts:304`), and per-route mounting takes
a third copy (`createEditorRoutes({ roles })`). The Go doctor's `auth.role-wiring` check exists only
to catch the roles half of this split with a text heuristic (`tool/internal/doctor/check_roles.go`).

Two comments claim the readers cannot drift (`src/lib/auth/access.ts:3-4`, `src/lib/index.ts:21-23`).
Three reference snippets import `roles` from the adapter module into an access module the adapter
then imports (`docs/reference/core.md:1020`, `sveltekit.md:131,1046`), a cycle.

### Options weighed

- **A wiring condition** (`auth.access-wiring-missing`, beside `auth.role-wiring-missing`). It detects
  the split after the fact. It needs a runtime comparison or another text heuristic, keeps two wiring
  points, and leaves the roles split and its heuristic in place.
- **The guard reads the composed runtime.** One declaration, the adapter's `roles` and `access`, read
  by every consumer. The bug class disappears instead of being detected.

### Decision: every reader takes the runtime

`createAuthGuard`, `devBackendHandle`, and `createEditorRoutes` take a bag with a required `runtime`
member, one parameter and no default, and read `runtime.roles` and `runtime.access`. Their separate
`roles` and `access` options are removed. A bare `createAuthGuard()` is a type error, so no call can
fall back to `DEFAULT_ROLES` and `{}` beside an adapter that declares more. The adapter's `roles` and
`access` members are the one declaration.

The evidence:

- **`read-from-the-source-rule`** (ledger, accepted standing rule): "a fact with one source is read
  from that source, never copied". The access map and the role vocabulary are each one fact wired by
  hand into two or three places.
- **`audit-adapter-canreach`** (keep) records `canReach` as "the single authority every enforcement
  and visibility point reads, so a site's guard and the engine's sidebar agree". Today that is false
  for any site that wires the two differently. After this change it is true by construction.
- **`convention-parameter-bags`**, amended 2026-09-08: "`runtime` is a required member of the bag
  where the factory needs one", and such a factory takes exactly one parameter with no default.
  `ContentRoutesConfig`, `NavRoutesConfig`, `MediaRouteConfig`, and `CairnAdminConfig` already
  follow it (`content-routes-context.ts:191`, `nav-routes.ts:46`, `media-route.ts:74`,
  `cairn-admin.ts:34`). The guard, the dev handle, and `createEditorRoutes` read roles or access
  without the runtime. `createAuthRoutes` also takes no runtime, but it reads neither roles nor
  access (`auth-routes.ts:35-47,165`), so the clause does not reach it and it is unchanged.
- **The import cycle goes away.** With the guard reading the runtime, a site declares `roles` and
  `access` on the adapter, or in a module the adapter imports. Nothing imports the adapter to build
  the access module.

The cost is that `hooks.server.ts` imports the site's runtime module, `src/chassis/cairn.server.ts`,
which `/healthz` and the admin mount already import. That module also builds the admin, so every
dynamic route (feeds, the sitemap, `robots.txt`, `/media`, `/preview`) now evaluates
`composeRuntime` and `createCairnAdmin` once per isolate. A composition throw (A13, A14, the access
validator) therefore fails those routes too. The build is the safety net: the prerender imports the
hooks, so a composition throw fails `vite build` before any deploy.

Ruling `access-semantics-documented-divergence` stands unchanged. `canReach` stays permissive on an
unmapped target for the engine's screens and the sidebar. `requireAccess`, `createSectionAction`,
and `createAdminAction`'s `access` option stay fail-closed. The change is who supplies the map, never
how each helper reads it.

### Two adjustments the decision forces

- **`config.access_unmapped` fires only on a map that names a screen.** Once the adapter carries
  every site's map, a map that gates only custom routes (the showcase's
  `{ '/admin/signups': ['owner'] }`) would log the warning at every composition. The warning's
  documented purpose is "to surface a map a site believed was exhaustive but is not"
  (`admin-nav.ts:295-299`). An href-only map makes no such claim. The warning now fires only when the
  map declares at least one screen-id key and leaves another concept or fixed screen unmapped.
- **`access_map_not_attached` gets its real cause.** The guard and the dev handle now always attach
  `runtime.access ?? {}`. The `fail(500)` then fires only on a route outside every hook's coverage.
  The comments at `guard.ts:364-367` and `section-action.ts:129-130` say so, and the
  `DevBackendConfig.access` doc comment (`packages/cairn-cms-dev/src/handle.ts:64-82`), which
  defends the old undefined default, is rewritten. The reference rows that name the old cause,
  `sveltekit.md:827-831` and `log-events.md:81` ("as `devBackendHandle` does when given no
  `access`"), are rewritten to the post-lead cause.

### The Go doctor

`auth.role-wiring` reads a site's `createAuthGuard(...)` call. A `{ runtime }` argument has a `{` and
no `roles` word, so the heuristic would report a false fail on every updated site. The check learns
that a `runtime` argument is wired. Its bare-call and `{ roles }` branches serve only a site on an
older engine, which the tool still serves. The remediation in `tmplRoleWiringUnwired`
(`check_roles.go:29`) and `auth.role-wiring-missing` (`conditions.ts:170-172`, mirrored in
`conditions.json`) names both eras. The `check:tool-heuristics` signature pin
(`scripts/checks/check-tool-heuristics.mjs:50`, the literal
`export function createAuthGuard(config: AuthGuardConfig = {}): Handle {` at `guard.ts:172`)
updates in task 1, not with the doctor. `check-tool-heuristics.test.ts:13-15` asserts the pin under
`npm test`, so task 1's signature change turns its own gate red until the regex follows. Task 2
keeps the Go heuristic and the remediations.

### Outcome and acceptance

- The scaffold, the showcase, and every reference snippet declare `roles` and `access` once, on the
  adapter, and the hooks pass `{ runtime }`.
- **Required runtime.** `// @ts-expect-error` on `createAuthGuard()`, `createAuthGuard({ access })`,
  `devBackendHandle()`, and `createEditorRoutes()`. Fails today: all four compile.
- **One map, five readers.** Fixture: one adapter with `access: { media: ['owner'], '/admin/x':
  ['owner'] }` and a declared editor-capability role, composed through `composeRuntime`. Run
  `createAuthGuard({ runtime })`'s handle over a real event with no locals set, and assert an editor
  session is refused by the media screen (`requireEngineAccess`), the nav resolver, `requireAccess`,
  `createSectionAction`, and `createAdminAction` with `access`. The dev handle cannot repeat the
  refusal, since it always mints an owner session (`packages/cairn-cms-dev/src/handle.ts:160-166`).
  Through `devBackendHandle({ runtime })`, assert instead that `locals.cairnAccess` is
  `runtime.access`, and `{}` when the adapter declares none. Fails today: the guard has no `runtime`
  input, so a hand-seeded `locals.cairnAccess` is the only way the last three see the map, and the
  dev handle attaches no map unless handed `access`.
- A declared role's capability resolves the same in the guard and the roster screen from the
  adapter alone. Fails today: the guard reads `DEFAULT_ROLES` unless handed `roles`.
- `config.access_unmapped` is silent for an href-only map and fires for a partial screen map. Fails
  today: it fires for the href-only map.
- `auth.role-wiring` passes on `createAuthGuard({ runtime })`, `{ runtime: cairn }`, and
  `{ runtime, identity }`, and keeps failing a bare call with custom roles declared (older engine).
- A fixture adapter whose composition throws fails `vite build` through the hooks import.
- **Breaking.** `Consumers must:` pass `{ runtime }` on every `createAuthGuard`,
  `devBackendHandle`, and per-route `createEditorRoutes` call, bare calls included, with `identity`
  and `includeSubDomains` unchanged; declare `roles` and `access` on the adapter; and, if the hooks
  and the adapter held different maps, reconcile them, since the adapter's now governs every reader.
- **Docs.** Reference: `sveltekit.md` (`createAuthGuard`, `AuthGuardConfig`, `createEditorRoutes`,
  the `access_map_not_attached` row), `core.md` (`defineAccess` snippet), `log-events.md`
  (`config.access_unmapped`, the `admin.action.misconfigured` row at `:81`), `cli-cairn-doctor.md`,
  and the dev package README. Extend (2a, re-armed for 2b's run, see "Docs and records"):
  restrict-admin-access, security-model, scaffolded-site-files, add-a-custom-admin-screen,
  add-cairn-to-a-sveltekit-app. Outlined 2b: arrange-the-admin-sidebar.
- **Pass class:** `auth-data` for the engine half, `tool` for the doctor.

## Designs for rulings 2, 3, and 5

### Ruling 2: the signups demo leaves the scaffold

The template is baked from the showcase (`packages/create-cairn-site/scripts/bake-template.mjs`,
`scripts/build/emit-template.mjs`), and the bake already has both mechanisms the move needs: the
path-exclusion manifest (`examples/showcase/.cairn-template.json`) and in-file
`cairn-template:exclude-start/-end` markers (already used in the showcase's `src/access.ts` and
`wrangler.jsonc`).

- **Whole files excluded:** `src/routes/admin/signups/` and `migrations-app/`.
- **Marked spans excluded:** the Signups `navLayout` entry, the `APP_DB` binding in `wrangler.jsonc`,
  the `admin.signups.misconfigured` member of `src/lib/log.ts`, the `/admin/signups` case in
  `src/theme/components/admin-link.test.ts`, and the showcase's access declaration. After the lead
  lands, the scaffold declares no `access` at all, the zero-config floor, so its `src/access.ts`
  goes (the showcase keeps its map on its adapter).
- **`create-cairn-site`** stops provisioning and migrating `APP_DB`: `MIGRATION_DATABASES`
  (`src/cloudflare/deploy.mjs:175`), the two-database announcement (`chapter.mjs:119`), the
  `-app` rename (`config.mjs:115`), and their tests and transcripts.
- **The skill exemplars.** `cairn-admin-screens`' `exemplar-list.md`, `exemplar-detail.md`, and
  `form-anatomy.md`, in both the packaged `skills/` tree and the scaffold's `.claude/`, say "the
  Signups screen every scaffolded site ships" and ask the reader to open it beside the file. The
  exemplars carry the shipped source inline and name the showcase as provenance.
  `skill-references-compile.test.ts` keeps compiling the classes they quote.
- **`@glw907/cairn-cms-dev`** keeps `fake-app-db.ts` and its `APP_DB` layering, because the showcase
  still runs the screen.

Acceptance: `emit-template-tree.test.ts` asserts `AUTH_DB` is the only D1 binding a scaffold
carries and no `src/routes/admin/signups/` exists (fails today: both present); a grep post-condition
finds no `APP_DB` or `-app` in `create-cairn-site`'s sources and transcripts; `check:template` green
on the re-emitted tree; a fresh scaffold builds with no Signups sidebar entry; the showcase e2e
suite, which still covers Signups, stays green. Not breaking for an existing site, which keeps its
route, binding, and rows. Docs: scaffolded-site-files, add-a-custom-admin-screen, and
restrict-admin-access (2a, re-armed), and the facts that say every scaffold ships the screen
(`f:pyt58u`, `f:onqm6k`, `f:qtm9y2` and the others the plan's inventory lists). Pass class: `sweep`
for the bake, tests, and exemplars; `auth-data` for `create-cairn-site`, since it edits D1
provisioning beside `AUTH_DB`.

### Ruling 3: the opt-in live key check

**Where it lives.** `loadHealth(event, runtime)` already takes the event and reads nothing from it
(`src/lib/sveltekit/health.ts:24`). It reads `?live=1` from `event.url`, so its signature does not
change. The site's `/healthz` route changes only for the 503 (B5).

**What it does.** With `live=1`, `loadHealth` mints one installation token with `installationToken`
(`src/lib/github/signing.ts:66`), the uncached mint, from the deployed key, and reports a new
`checks.githubAppToken: { ok, detail }`. `installationToken` throws a typed error carrying the HTTP
`status` in place of the bare message at `signing.ts:77`. The classifier is total: 401 is a refused
key, 404 an installation not found, 403 a suspended installation, and any other status, network
failure, or timeout is unreachable. The check never touches the shared token cache
(`cachedInstallationToken`, `signing.ts:121`), so it proves the deployed key whatever a warm isolate
holds, and the minted token is never returned or logged. A failed live mint logs the existing
`github.unreachable` event with `scope: 'health'` and the classifier as `reason`.

**Bounding a public route.** The verdict is cached per isolate for 60 seconds, with no key-hash
key: `wrangler secret put` "creates a new version of the Worker and deploys it" (Cloudflare,
"Secrets"), so an isolate never sees two keys. Only a settled mint writes the verdict.

Concurrent misses share one in-flight mint (the single-flight pattern of Go's
`golang.org/x/sync/singleflight`), and the slot must survive the hazard the engine's incident
record names: "Cross-request coalescing on a shared pending promise is exactly the hazard under
workerd's per-request cancellation" (`docs/internal/record/2026-07-13-admin-token-cache-poisoning.md`,
"Fix directions"; the reason `signing.ts:95-103` caches results only). Cloudflare states the cause:
"An async call that is neither awaited nor passed to `ctx.waitUntil()` can be canceled when the
invocation ends" ("Context", `waitUntil`). The starter's timer and its slot-clearing continuation
die with the starter's request, so neither may be the only way out.

- The slot stores `{ promise, startedAt }`. The mint's `fetch` carries `AbortSignal.timeout(5000)`.
- Every caller, the starter included, races the shared promise against a 5-second timer created in
  its own request, and a caller whose timer wins reads `unreachable`. A caller's own request is
  live while it awaits, so its timer fires whatever happened to the starter.
- A caller that finds `now - startedAt` at or past the timeout treats the slot as empty and starts
  a fresh mint. The slot clears by timestamp, never only by the starter's continuation.
- The starter hands the slot's promise to the engine's `waitUntil` (`workers-env.ts:43`, over
  `cloudflare:workers`), Cloudflare's documented way to outlive the response or a client
  disconnect, capped at "30 seconds after the response is sent or the client disconnects". The
  5-second timeout sits inside that cap.

A scratchpad probe of this shape, with an injected clock and a never-settling first mint whose
starter is never awaited, answered the later caller `unreachable` within its own timeout, and the
call after the stale point minted again. The residual, one mint per isolate per minute summed over
the fleet, is stated on the reference page. Whether an anonymous caller may trigger it at all is
Rulings for Geoff, item 2.

**The fingerprint (decided).** The old key mints until it is deleted on GitHub, so a live `ok` can
be false comfort two ways: a wrong deploy target (the friction entry's case), or an old-version
isolate still serving during rollout. Deleting the old key on either stops publishing with no
rollback. GitHub documents a SHA-256 fingerprint per App key, from the public half ("Managing
private keys for GitHub Apps", "Verifying private keys": `openssl rsa -in KEY -pubout -outform DER |
openssl sha256 -binary | openssl base64`). `signingSelfTest` reports it as `fingerprint:
'SHA256:<base64>'`, the form the App settings page displays. The documentation page's own
screenshot of the settings page (`github-apps-private-key-fingerprint-new.png`) shows
`SHA256:V5iaE4MInJc3Em4dGLQjbzG0Py64ZPJ/G8IcDaOG4MI=` under "Private key". The value needs no
network call and holds nothing secret; the review's Web Crypto probe matched the openssl value with
one extractable import. Without it, the step ruling 3 exists to support has
no safe signal, so this spec adds it rather than forking it. The rotation page reads: deploy, read
`/healthz` until the fingerprint equals the new key's on GitHub, run the live check, then delete
the old key.

**`/healthz` answers 503 when `ok` is false** (item B5). This follows the health-check
convention in the IETF draft "Health Check Response Format for HTTP APIs"
(draft-inadarei-api-health-check): a failing check maps to a 5xx status, and the body still
carries the detail. `loadHealth` returns data; the status is set by the site-owned route
(`templates/waymark/src/routes/healthz/+server.ts`, whose "always returns 200" comment changes), so
the 503 is a template change. `ok` is `githubAppSigning.ok && (githubAppToken?.ok ?? true)`. A
non-GitHub backend today reports `ok: false` with "not configured" for any provider whose `kind` is
not `github-app` (`health.ts:28-30`), which would read as a permanent 503. The signing check now
reports a non-applicable provider as `ok: true, detail: 'not-applicable'`.

Acceptance (each fails today because no live branch, fingerprint, or 503 exists):

- Stub `fetch` with 401, 404, 403, 500, a thrown `TypeError`, and a hang: each yields its class,
  the hang after the timeout.
- N parallel `live=1` calls on a cold slot make one `fetch`; an injected clock shows a second call
  inside 60 seconds makes none and one after makes one.
- **A dead slot never wedges the isolate**, mirroring `github-token-cache.test.ts`'s "never serves
  an unsettled in-flight mint to a later caller". The slot holds a never-settling promise, the
  starter is never awaited, and the injected clock never fires its timer. A later caller reads
  `unreachable` within its own timeout, and the next call past the stale point mints again.
- A fixture key pair's `fingerprint`, after its `SHA256:` prefix, equals the base64 the openssl
  pipeline above prints for it.
- The template route answers 503 on `ok: false` and 200 on `ok: true`; a non-GitHub provider reads
  `ok: true`. The showcase's `healthz.spec.ts` expects the 503 its keyless env produces.
- The plain call makes no `fetch`. This holds today; it guards the new branch and proves nothing.

Not breaking: `HealthData` gains optional members. `Consumers may:` answer 503 when
`loadHealth(...).ok` is false, so a monitor keyed on status sees a broken key. Docs:
rotate-the-github-app-key (2a, re-armed; its confirming publish and the 55-minute wait give way to
the fingerprint and the check), `sveltekit.md` (`loadHealth`, `HealthData`), `log-events.md` (the
new scope and `reason`). Pass class: `auth-data` (signing).

### Ruling 5: the dev backend over the site's real content

**The runtime boundary.** Under `vite dev` the server runs in Node, with `cloudflare:workers`
stubbed over the platform proxy (`docs/superpowers/specs/2026-10-03-sveltekit-3-upgrade-design.md`,
"Evidence"), so `node:fs` reads the working tree. The showcase e2e build runs under `wrangler dev`
in workerd (`examples/showcase/playwright.config.ts`), where it cannot. The e2e suite also asserts
against the fixture ids (`2026-06-hello`, the media seed, the vocabulary branch).

**The option.** `DevBackendConfig.seedContent` is removed. `devBackendHandle({ runtime, content })`
takes `content: 'repository' | 'fixtures'`, default `'repository'`. `'fixtures'` is today's seeded
in-memory repo, unchanged.

**`'repository'`, the overlay.** Each branch is an overlay over the working tree: a map from path to
content or to a tombstone. Nothing writes to disk (Rulings for Geoff, item 1).

- `readFile` answers the branch's overlay, then the file on disk. A tombstone reads `null`.
- `readEntries` is the union of disk and overlay, minus tombstones.
- A commit writes content or, for a delete or a rename's old path, a tombstone into the overlay.
- `createBranch` copies the source branch's overlay, tombstones included, so a `cairn/*` branch
  reads every untouched disk file.
- An overlay entry wins until the dev server restarts. A disk edit to a file the dev admin has not
  written shows on the next request; a disk edit to one it has written does not.
- The admin list reads `src/content/.cairn/index.json` from `main`
  (`content-routes-list.ts:141-160`). The disk manifest is the source until a dev publish commits
  an overlay copy, which then shadows it until restart. A new file on disk lists after
  `npx cairn-manifest`, as it must anyway for the next `npm run dev` start.
- The module-level seed post (`fake-github.ts:42-47`) moves into the `'fixtures'` path, so no
  fixture id reaches a real site's admin.
- **Workerd.** The handle detects workerd synchronously with `navigator.userAgent ===
  'Cloudflare-Workers'` (Cloudflare, "Compatibility flags", global `navigator`, default since
  2022-03-21; Node reports `Node.js/<version>`) and throws a message naming
  `content: 'fixtures'`. It imports `node:fs` dynamically inside the read, as `channel-db.ts:45`
  does for `node:sqlite`, because wrangler marks a static `node:*` import external and the Worker
  would fail at module load. Paths resolve against `process.cwd()`, the Vite root `npm run dev`
  runs from.
- **The bake.** The scaffold's hooks are a byte copy of the showcase's. The showcase's
  `content: 'fixtures'` line sits inside `cairn-template:exclude-start/-end` markers, so new sites
  get `'repository'`.

Media bytes stay in the in-memory R2 double. A fresh scaffold's `media.json` is empty, so nothing
shows broken. A site with real media sees its thumbnails missing in the dev admin. That limit is
stated on the add-cairn page, and reading local R2 through is batched.

Acceptance, against a temp directory holding entries and a committed manifest (each fails today,
where the dev admin shows only fixtures):

- The list equals the disk set exactly, with no fixture id, read through the manifest.
- A save shows in the next read and leaves the file untouched; a disk edit to an unwritten file
  shows without a restart.
- A deleted or renamed on-disk entry stays gone; a branch read of an untouched disk file returns
  its content.
- The handle throws under a stubbed `Cloudflare-Workers` user agent and not under Node.
- `emit-template-tree.test.ts` asserts the emitted hooks carry no `content:` option.
- The showcase e2e suite stays green on `'fixtures'`.

**Breaking** for the dev package: `seedContent` goes. Docs: add-cairn-to-a-sveltekit-app and
scaffolded-site-files (2a, re-armed; the fixture caveat goes, the overlay limits are stated), the
dev package README. Pass class: `engine-logic`.

## Fixes in this pass

Each item names its outcome, acceptance (the fixture, and why the test fails today), surface,
pages, and pass class. "2a" pages are written and re-armed for stage 2b's run; "2b" pages are
outlined. The verification column of each claim is in the triage table at the end.

### Access and auth

- **A1, a `none`-capability role's own screen.** `canReach` refuses a `none` session before reading
  the map (`src/lib/auth/access.ts:157-159`). So `requireAccess` and `createSectionAction` refuse the
  one kind of screen a `none` role exists for, while `RoleDeclaration.home` and a `navLayout` entry's
  `roles` admit it. Fix: `canReach` admits a `none` session to an href target whose matched rule
  names its role explicitly. Screen ids, unmapped hrefs, and `editors` stay refused. Acceptance:
  table-driven `canReach` tests over screen, mapped href, unmapped href, and a dynamic route, plus
  one row each through `requireAccess` and `createSectionAction`: a `none` session on a mapped href
  naming its role is admitted (fails today: refused), and `editors` stays refused. Surface: a
  loosening for a `none` role named in a rule, disclosed in the changelog. Pages:
  add-a-second-sign-in-group, restrict-admin-access (2a). Class `auth-data`.
- **A2, the shadowed dynamic route.** `matchHrefKey` refuses a dynamic sibling when a deeper key
  exists (`access.ts:107-127`), owner included, and only the log shows it. The behavior stays. Fix:
  `auth.access.refused` gains `reason: 'no_rule' | 'shadowed' | 'role'`. Acceptance: a map with
  `/admin/x` and `/admin/x/y/z` and a request to `/admin/x/[id]` logs `reason: 'shadowed'`, and
  every emitter carries a reason (`guard.ts:444,481`, `section-action.ts:205`, `admin-action.ts:297`,
  `content-routes-media-ingest.ts:124`). Fails today: no `reason` field. A build-time route walk was
  weighed and dropped: the Vite plugin would need a new option to find the map and the route tree.
  Pages: debug-your-site (2a), `log-events.md`. Class `auth-data`.
- **A3, the roles migration.** The scaffold ships migrations 0000, 0003, and 0004
  (`examples/showcase/migrations/`, the bake's source), so a declared role's first roster add meets
  `0000_auth.sql`'s `CHECK (role IN ('owner','editor'))` as an unhandled 500 (`store.ts:263-273`).
  Fix: ship `0001_roles.sql`. Every role-writing statement (the inserts at `store.ts:271,468` and the
  updates at `:506-509,544`) routes a constraint failure through a named remediation, the way
  `rethrowStoreFailure` names 0004 (`store.ts:20-31`); the message says the migration rebuilds
  `editor` with the engine's four columns only. Acceptance: `emit-template-tree.test.ts` asserts the
  scaffold carries {0000, 0001, 0003, 0004} and not the opt-in 0002 (`audit-sink.ts:63`), and a
  constraint failure on add and on a role change surfaces as the named condition. Fails today: 0001
  absent, raw 500. `Consumers may:` a site declaring custom roles applies `0001_roles.sql`; applying
  it after 0004 is safe. Pages: restrict-admin-access, add-a-second-sign-in-group,
  scaffolded-site-files (2a). Class `auth-data`.
- **C1, concept-less tidy and dictionary.** The two actions gate on the map only inside
  `if (event.params.concept)` (`content-routes-tidy.ts:124`, `content-routes-dictionary.ts:106`).
  A site that hand-mounts either without the param gets an ungated action. Fix: both refuse with a
  404 when the param is absent. Acceptance: both called with no `concept` param by an editor the map
  denies answer 404. Fails today: the action runs. **Breaking** only for that hand-mount. Pages:
  security-model (2a; its caveat at `:324` goes). Class `auth-data`.
- **C7, the public `/admin/auth/*` prefix.** `isPublicAdminPath` admits every path under
  `/admin/auth/` (`guard.ts:28-29`). The engine serves one view there, `/admin/auth/confirm`
  (`admin-dispatch.ts:87`), so a site route mounted under that prefix skips the session check. Fix:
  the predicate admits exactly `/admin/login` and `/admin/auth/confirm`. The charter says "An
  anonymous visitor reaches nothing behind `/admin` except the sign-in form"
  (`what-cairn-is-and-is-not.md:107`). The confirm page is the landing step of that same sign-in
  flow, the page the emailed link opens, so the predicate keeps it. The close owes a one-phrase
  charter clarification for Geoff's read: "the sign-in form and its confirm page". Acceptance: a
  table over `isPublicAdminPath` is true only for those two paths and false for
  `/admin/auth/request`, `/admin/auth/x`, `/admin/auth/confirm/x`, and `/admin/authx`; it flips
  `auth-guard.test.ts:107-111`. Fails today: `startsWith('/admin/auth/')`. The `createAuthRoutes`
  comments that teach the wider prefix (`auth-routes.ts:160,169,407`) and `sveltekit.md:938-946`
  change; the functional spec's "Request a link" and "Guard" lines get a dated amendment. **Breaking**
  for a site route under `/admin/auth/`, which becomes guarded; none of the five consumer sites has
  one. Pages: security-model (2a). Class `auth-data`.
- **A7, the missing Turnstile secret.** A blank secret logs the same `invalid_input` as a blank token
  (`src/lib/cloudflare/turnstile.ts:92-104`). Fix: a blank or non-string secret logs
  `reason: 'missing_secret'`. Acceptance: `verifyTurnstile` with `''` and with a non-string secret
  logs `missing_secret` (today `invalid_input`). Pages: add-a-second-sign-in-group (2a),
  `cloudflare.md`, `log-events.md`. Class `engine-logic`.
- **A8, `createChannelDb`'s type.** It returns a narrow `ChannelDb`
  (`packages/cairn-cms-dev/src/channel-db.ts:26-29`), so the page's test casts
  `as unknown as D1Database`. Fix: the auth channel's `resolveDb` accepts the structural subset its
  store uses, which `D1Database` satisfies. Acceptance: a tsc-checked test passes `createChannelDb()`
  to `resolveDb` with no cast (today not assignable). Not breaking. Pages: add-a-second-sign-in-group
  (2a), `auth-channel.md`. Class `engine-logic`.
- **A10, partial `auth.branding`.** A site branding replaces the default whole
  (`cairn-admin.ts:105-110`), so omitting `replyTo` drops the adapter's reply-to with no signal. Fix:
  `auth.branding` is `Partial<AuthBranding>`, merged over the runtime default. Acceptance:
  `auth.branding: { siteName }` alone sends mail that keeps the runtime's reply-to (today dropped).
  Pages: add-cairn-to-a-sveltekit-app (2a), `sveltekit.md`. Class `engine-logic`.

### Admin behavior

- **A5, the admin error page.** No `admin/+error.svelte` exists, so an admin 403 renders the root
  error page in public chrome. Fix: the showcase, and through the bake the scaffold, carry
  `src/routes/admin/+error.svelte` with calm admin copy under the admin theme wrapper. A template
  file, not an engine export. Acceptance: `check:template` asserts the scaffold carries the file, and
  a showcase e2e 403 renders inside the admin theme wrapper (today public chrome); one capture read in
  the main loop. Pages: restrict-admin-access, scaffolded-site-files (2a). Class `sweep`.
- **A6, a failed save keeps the writing.** The edit form posts full-page (`EditPage.svelte:199`).
  When a save fails on a GitHub error, `viewAction` returns the calm `fail(500)`
  (`cairn-admin.ts:236-251`), SvelteKit re-runs `editLoad` to render it, the load hits the same
  GitHub error, and a bare 500 replaces the page and the unsaved text.

  Plain `use:enhance` does not fix it. In kit 3.0.1 a failure carries the action URL minus its key as
  its location (`src/runtime/server/page/actions.js:170,186-191`), and enhance applies it in place
  only when that equals the current URL, else navigates and runs the load
  (`src/runtime/app/forms/client.js:88-109`). After any save the page sits at `?saved=1`
  (`content-routes-entry-write.ts:321-322`), so the next failure navigates. The page also assumes a
  document load ends every submit: `saving` and `publishing` reset only on an entry change
  (`EditPage.svelte:163-166,1041-1062`), and the leave guard stands down while `busy`
  (`:266,269,277`).

  Fix: `use:enhance` with a submit callback. The submit function awaits `commitPendingDictionary()`
  before the action POST, replacing today's fire-and-forget call (`EditPage.svelte:163-171`), so a
  pending word's commit to `main` lands before publish reads the head (C11, task 10). Kit 3.0.1
  awaits the submit function before it fetches: `(await submit({ ... })) ?? fallback_callback` runs
  ahead of `fetch(action, ...)` (`src/runtime/app/forms/client.js:147-155,182`).
  `postFormAction` already resolves every failure, a network throw included, to `{ ok: false }`
  (`client-action.ts:29-39`), and `commitPendingDictionary` then leaves the words pending, so the
  await never blocks the save or publish. Every result clears `saving` and `publishing`. A
  `failure` goes through `applyAction(result)`, which sets the form and status and runs no load
  (`client.js:2980-3005`). A `redirect` does `location.assign(result.location)`, keeping today's
  document reload, `{#key}` remount, and dirty reset. The `&new=1` reasoning at `:199-206` carries
  over.

  A failure applied in place clears the page's saved signals until the next load. A failure leaves
  the page at `?saved=1`, so `data.saved` still reads `true` and the flash strip says "Saved."
  (`:1139-1142`). A refusal that echoes `body`, such as a 400 or the 409 "This file changed since
  you opened it" (`content-routes-entry-write.ts:184,306`, `commit-log.ts:60-62`), also sets the
  dirty baseline `form.body` to the editor's text (`:190`), so `saveState` reads "Saved" and the
  leave guard stands down. A local flag set by the enhance callback on `failure` suppresses the
  `data.saved` flash and `saveState`'s "Saved", and the dirty baseline for an in-place failure is
  the loaded `data.body`.

  Acceptance, a showcase e2e from `?saved=1`: type text, then `page.route` (already used at
  `examples/showcase/e2e/csrf-helpers.ts:60`) answers `?/save` with a 500 failure and fails any
  following `__data.json`. The calm message shows, no "Saved" text shows, the text is intact, Save
  is enabled, a retry succeeds, and the leave guard prompts. The same forge with a 409 failure
  echoing `body` shows "Unsaved changes", no "Saved" text, and a leave guard that prompts. A
  successful save ends in a document load reading "Saved". Fails today: a bare 500 replaces the
  page (under plain enhance, the failed load does). Surface: none. Pages:
  rotate-the-github-app-key (2a). Class `engine-logic` (Svelte).

### The commit path and media

- **C11, writes to `main` that are not head-guarded.** These commit with no `expectedHead`, so the
  retry re-parents a precomputed file over a moved head (`repo.ts:295-301`):
  - Library single delete, bulk delete, and metadata update, which write `media.json`
    (`content-routes-media-delete.ts:189-193,282`, `content-routes-media-metadata.ts:187-191`).
  - Replace and alt propagation, which rewrite published entry files read earlier, replace with
    `media.json` too (`content-routes-media-metadata.ts:384,541`).
  - The dictionary add, whose own conflict-and-re-merge retry (`content-routes-dictionary.ts:133-149`)
    never fires, because it passes no head.
  - Publish and publish-all, which commit the `media.json` and `index.json` snapshots read at save
    time (`content-routes-entry-write.ts:215-231,347-354`, and the publish-all manifest fold).

  A concurrent commit can resurrect a deleted row, drop an upload's row or a dictionary word, or
  revert a just-published entry's prose under an alt or replace rewrite. Fix: each path reads
  `branchHead(defaultBranch)` before its first read of `media.json`, the content manifest, or any
  entry file, the rule the guarded writes state (`content-routes-media-ingest.ts:235-237`,
  `content-routes-settings.ts:290`, `nav-routes.ts:146`), and passes it as `expectedHead`. A
  conflict answers with the path's existing message: `MANIFEST_CONFLICT_MESSAGE` for delete and
  update, `CONTENT_CONFLICT_MESSAGE` for replace and alt, the calm conflict for publish (the entry
  stays held on its branch, so a retry is one click), and the dictionary's own re-merge retry.
  Publish takes the fail-closed guard every other main writer uses, not a merge inside the retry.
  The page's own dictionary commit is the one writer that would otherwise race every publish
  carrying a pending word: `onEditSubmit` fires `?/dictionaryAdd`, which commits to `main`
  (`content-routes-dictionary.ts:57-73`), beside the publish POST. A6's enhance submit awaits that
  commit before posting (task 8), so the publish reads a head that already holds it, and no
  conflict comes from one click. The delete docstring's stale-read note
  (`content-routes-media-delete.ts:110-114`) is updated. Acceptance, a race test per path committing
  between the head read and the commit: a deleted row stays deleted, an upload's row survives, a
  publish's prose survives a replace and an alt, a Library delete inside a publish stays deleted, and
  two concurrent dictionary adds both land. Fails today: each retry re-parents the stale file. A
  publish submitted with a pending dictionary word, through A6's submit, lands without a conflict,
  and the word commits. This holds today; it guards the new head read against the page's own commit. Surface: a publish can answer a conflict. Pages: none written; 2b configure-media drops its
  caveat. Class `auth-data` (the commit path).
- **D1, nested images are invisible to where-used.** `extractMediaRefs` reads top-level image fields
  only (`src/lib/content/media-refs.ts:45-52`), and `imageFieldKeys` skips arrays
  (`media-rewrite.ts:164-171`). `checkContainerNesting` admits four image shapes
  (`fieldset.ts:403-416`): `image`, `object({ image })`, `array(image)`, and
  `array(object({ image }))`. The scaffold's own `gallery` is `array(image)`
  (`cairn.config.ts:116`). A gallery-only asset reads as an orphan, which skips the typed-slug
  confirm, so a delete removes an asset in use. This is a data-loss defect, and the fix alone does
  not reach an existing site: the delete gate reads `mediaRefs` from the committed manifest
  (`src/lib/media/usage.ts:83-94`), and `verifyManifest` drops a built `mediaRefs` whenever the
  committed entry lacks the key (`manifest.ts:325-328`), so a stale manifest builds green.

  Fix: both readers walk all four shapes. The `src:` locator (`media-rewrite.ts:132`) admits an
  optional `- ` sequence prefix, which is how `array(image)` serializes
  (`templates/waymark/src/content/posts/2026-01-15-hello.md:20-22`), and replace rewrites every
  occurrence in an entry, not only the first. Alt propagation reports a nested placement and never
  splices it, since alt fill is optional and a sequence item's `alt:` sits at another indent.
  `verifyManifest` drops `mediaRefs` only for a manifest that predates the field (no committed entry
  carries the key), so a post-field manifest compares exactly and a stale one fails the build with
  the regenerate message. One residual passes silently: a site whose only image references are
  nested (no hero and no body image anywhere) commits no `mediaRefs` key, so its stale manifest
  reads as pre-field and still builds green. The `Consumers must:` regenerate line below covers that
  site. Acceptance: where-used, safe-delete, bulk delete, and replace run over each
  of the four shapes, including a `- src:` line and an asset twice in one array; alt propagation
  over a sequence-form entry leaves it byte-identical and reports the placement; a committed
  manifest whose gallery-only entry lacks `mediaRefs` fails `verifyManifest`. Fails today: each
  nested asset reads as unused, and the stale manifest passes. The showcase and template manifests
  are regenerated if they change. Surface: manifest output changes. **Breaking:** `Consumers must:`
  regenerate the content manifest (`npx cairn-manifest`) and commit it. Pages: 2b configure-media.
  Class `auth-data` (the commit path).

### Rotation signals

- **B9, the remediation names unread variables.** `github.app-unreachable` tells the reader to check
  `GITHUB_APP_ID` and `GITHUB_APP_INSTALLATION_ID` (`src/lib/diagnostics/conditions.ts:198`,
  mirrored at `tool/internal/spine/conditions.json:199`), and the overlay's `.dev.vars.example:7-8`
  declares them. No code reads either name. Fix: the remediation names the key secret and the
  adapter's `appId` and `installationId`, and the example file drops both lines. Acceptance: a grep
  post-condition finds neither name in the three files; `check:tool-conditions` green. Pages:
  rotate-the-github-app-key, scaffolded-site-files (2a). Class `engine-logic`.
- **B11a, the key step's closing message.** It tells the developer to "re-run this step" with a
  regenerated key (`packages/create-cairn-site/src/cloudflare/secret.mjs:43-46`), which cannot take
  one (`:25-28`). Fix: the message points at the rotation page. Acceptance: the key-step transcript
  names the page. Class `sweep`.

### Scaffold and dev package

- **B1, the dev package ships source.** `@glw907/cairn-cms-dev` exports `./src/index.ts`
  (`packages/cairn-cms-dev/package.json:20-24`), so a consumer's `svelte-check` type-checks its
  `.ts` and fails on `cloudflare:workers` and `node:sqlite` unless the site declares both.
  `skipLibCheck` skips only `.d.ts`. Fix: the package builds to `dist/` (`.js` and `.d.ts`) from the
  root `package` script, after `svelte-package`, with `files: ['dist']` and no `prepare` of its own.
  npm runs a workspace's `prepare` before the root's (the review's npm 11.19 probe), and the dev
  package's declarations import `@glw907/cairn-cms` types from the root `dist/`. Every path that
  resolves the package by name already runs the root script: `npm ci` through the root `prepare`,
  and `scaffold.yml` before its pack. Acceptance: `npm pack ./packages/cairn-cms-dev` on a clean
  clone lists `dist/index.js` and `dist/index.d.ts` and no `src/**/*.ts`; a fixture consumer with no
  `cloudflare:workers` or `node:sqlite` declarations passes `svelte-check`; the showcase e2e build
  resolves `dist/`. Fails today: `exports` points at source. Not breaking. Pages: add-cairn (2a).
  Class `engine-logic`.
- **B2, the stale-manifest message.** It says to run `npm run cairn:manifest`
  (`src/lib/content/manifest.ts:373-377`), a script only scaffolds define. Fix: `npx cairn-manifest`,
  the shipped bin. Acceptance: the error names `npx cairn-manifest` (today the script). Pages:
  add-cairn (2a). Class `engine-logic`.
- **B3, no types script.** The scaffold commits `worker-configuration.d.ts`, whose line 2 records
  the `wrangler types` command, and no script runs it. Fix: a `cf-typegen` script, the name
  Cloudflare's create-cloudflare templates use, added by the bake's `package.json` transform, and a
  tutorial step. Acceptance: `emit-template-tree.test.ts` asserts the script (today absent). Pages:
  add-cairn, scaffolded-site-files (2a). Class `sweep`.
- **B5, `/healthz` answers 200 on failure.** Covered under ruling 3. Pages: scaffolded-site-files,
  rotate-the-github-app-key (2a).
- **B6, `cairn-guidance check` misreads a fresh scaffold.** It reports `.claude/` as scanned because
  `src/admin.css` uses `source(none)` rather than the literal `@source not` line
  (`src/lib/guidance/check.ts:21,73-88`), and it hashes `VERSION`, which the bake and `install` stamp
  differently, so a scaffold reads stale after the first patch release. Fix: `source(none)` counts as
  excluded, and the tree hash leaves out `VERSION`. Acceptance: on a fresh emitted scaffold the check
  reports `.claude/` excluded, and with differing installed and packaged `VERSION` it reads `fresh`
  (today scanned and `stale`). Pages: scaffolded-site-files (2a), `guidance.md` (`VERSION` at `:30`,
  the source exclusion at `:136`), and the Claude Code arm's facts. Class `engine-logic`.
- **B7, the dev-build define.** Every site hand-writes a `devBuildDefine()` plugin
  (`templates/waymark/vite.config.ts:22-33`), byte-identical in the showcase, and a copy that routes
  the flag through a shared constant ships the dev package in the deployed Worker. Fix: the engine's
  `cairnManifest` plugin, which every site already registers, gains a `config` hook that defines
  `__CAIRN_DEV_BUILD__` as the template's current expression, `command === 'serve' ||
  loadEnv(mode, root, 'VITE_').VITE_CAIRN_E2E === '1'`. It keeps a define the site already set (the
  review's Vite 8.3 probe: the site's value wins in either plugin order). The showcase and the
  template drop their plugin, so `scaffold.yml`'s `VITE_CAIRN_E2E=1` positive control still finds
  the dev markers. `@glw907/cairn-cms/ambient` declares the global, and both `src/app.d.ts:20` copies
  of the declaration go, since with `skipLibCheck` off the two collide (`TS2451`). A `WATCH:` comment
  notes that the nested verify server strips the plugin (`src/lib/vite/internal.ts:183-186`), harmless
  while nothing in `cairn.config.ts`'s graph reads the global. Acceptance: the hook resolves `true`
  under `serve`, `false` under `build`, `true` under `build` with the flag, and keeps a site-set
  define; the e2e `wrangler deploy --dry-run` grep stays clean. Fails today: no hook. Not breaking: a
  site's own plugin still wins; the upgrade note tells a site to delete its own declaration. Pages:
  add-cairn, scaffolded-site-files (2a), `vite.md` (a row for the flag), `ambient.md`. Class
  `auth-data`: the define decides whether a handle that mints owner sessions compiles into a
  deployed Worker.
- **D2, the scaffold feed.** `feed.ts:20` renders with no fragment resolver and the public media
  resolver, so feed readers get literal `::include{...}` text and root-relative image URLs. Fix:
  pass `createFragmentResolver(site)` and an origin-prefixing media resolver. Acceptance: a feed
  test over an entry with an include and a media image yields the resolved fragment and an absolute
  `https://<origin>/media/...` URL (today literal text and a root-relative URL). Pages: 2b
  build-the-public-routes. Class `engine-logic` (template).

### Schema and composition

- **A13, duplicate publish-action labels.** `{#each data.publishActions as action (action.label)}`
  (`EditPage.svelte:1689`) keys by label, and `normalizePublishActions` never checks uniqueness.
  Fix: composition throws on a duplicate label. Acceptance: two `'Announce'` labels throw (today
  accepted). **Breaking** only for a site with duplicates. Pages: 2b act-on-newly-published-entries.
  Class `engine-logic`.
- **A14, a concept id that names an engine view.** `normalizeConcepts` accepts `help`, `settings`,
  `editors`, and the rest, whose admin views are then unreachable (`admin-dispatch.ts:42+`). Fix:
  composition throws on a reserved id, from one shared set (`admin-dispatch.ts:33`'s segments plus
  the fixed screens). Acceptance: every member of the set throws (today accepted). **Breaking** only
  for such a site. Pages: 2b define-an-adapter-and-schema. Class `engine-logic`.
- **D4, `FieldBehavior.itemLabel`.** Declared (`fieldset.ts:28`) and read nowhere; the editor cannot
  reach a function-valued behavior. `ArrayField.itemLabel` already does the job. Fix: remove the
  member. Ruling `audit-adapter-fieldbehavior` keeps the type for `validate` and is unaffected.
  Acceptance: `// @ts-expect-error` on the member, and `check:surface` shows the removal. **Breaking**
  only for a site that set the no-op. Pages: 2b define-an-adapter-and-schema, `core.md`. Class
  `engine-logic`.
- **C5, the sanitize floor.** `buildSanitizeSchema` returns the site callback's result unchecked
  (`src/lib/render/sanitize-schema.ts:62`), against its own comment that a site "cannot weaken the
  core strip" (`:22-24`). A callback can allow author `<script>`, and the shallow spread lets a
  callback that mutates `strip` in place change the module default for every renderer in the
  isolate. Fix: the callback receives a fresh copy; after it returns, the engine removes `script`
  from `tagNames` and sets `strip` to the union of the core list and the callback's, so a site's own
  additions survive. The floor is exactly that: `script` and the core `strip` entries. Attributes
  and protocols stay the callback's responsibility, stated in the comment and on `render.md`.
  Acceptance: a callback that adds `script` and mutates `strip` in place still yields stripped
  output, a second build in the same isolate gets the untouched default, and a callback that adds to
  `strip` keeps its additions. Fails today: the script survives and the default is mutated.
  **Breaking** for a site that allowed `<script>` on purpose. Pages: security-model (2a),
  `render.md`. Class `engine-logic`, with `web-auth-security-reviewer` named on it.
- **C13, `checkSiteFacts` degrades silently.** It returns `ok` when the facts derivation throws
  (`src/lib/vite/internal.ts:586-590`). Fix: one build-log warning naming the skip. Acceptance: a
  throwing derivation yields that one warning (today silent `ok`). Pages: debug-your-site (2a).
  Class `engine-logic`.
- **D5, the site-config path.** Settings and Tags find the site config through
  `runtime.navMenu?.configPath`, falling back to `src/lib/site.config.yaml`
  (`content-routes-settings.ts:124,198-200`), while the scaffold keeps the file at
  `src/theme/site.config.yaml`. A site with no nav menu gets "Site config not found" on both screens.
  Fix: the adapter's `editor.siteConfigPath` names the file once, default
  `src/theme/site.config.yaml`, and the nav editor, Settings, and Tags all read it.
  `editor.nav.configPath` is removed. Acceptance: an adapter with no `editor.nav` saves Settings to
  `src/theme/site.config.yaml` (today a 404 "Site config not found"). **Breaking**, two lines:
  `Consumers must:` move `editor.nav.configPath` to `editor.siteConfigPath`, and a site whose config
  is anywhere but `src/theme/site.config.yaml` sets `editor.siteConfigPath`. Pages: 2b
  turn-on-tidy and arrange-the-admin-sidebar, `sveltekit.md:1217`, `core.md:249,257`; the functional
  spec's adapter contract line (`2026-05-28-cairn-rebuild-functional-spec.md:390`) gets a dated
  amendment. Class `engine-logic`.
- **D6, undeclared frontmatter keys vanish.** Validate-once copies only declared keys, so `robots:
  noindex` on a concept without a `robots` field leaves the page indexed, with no signal
  (`src/lib/delivery/seo-fields.ts:18,27`). Fix: the manifest build warns once per concept, naming
  each undeclared key it found. Acceptance: a concept without `robots` and two entries carrying it
  yield one warning naming `robots` (today silent). Not breaking. Pages: 2b
  define-an-adapter-and-schema, build-the-public-routes. Class `engine-logic`.
- **D8a, `cairn-audit --fail-on advisory`.** The bin exits 0 on any advisory (`exitCodeFor`,
  `src/lib/audit/report.ts:55`), and the three public-scope rules a theme author gates on are
  advisory. Fix: a `--fail-on advisory` flag makes advisories fail. Acceptance: an advisory-only
  report exits 0 bare and non-zero with the flag (today always 0). The `--json` report is batched.
  Pages: 2b run-cairn-audit-on-your-site, `cairn-audit.md`. Class `engine-logic`.

## Rulings for Geoff

1. **Should a dev-admin save stay in memory, with a persistent notice saying so?** Ruling 5 says the
   dev admin "reads and edits the site's real content files, saving to a local stand-in". This spec
   reads the stand-in as the in-memory overlay: a save never touches disk, and a restart discards it.
   Recommended: yes, in memory, plus one persistent DaisyUI `alert` in the admin shell while the dev
   backend serves it, saying edits are held in memory and discarded when the dev server stops.
   - *Yes* builds the overlay above plus the notice, which answers the new risk: the dev admin now
     shows real content and invites real writing that a restart silently drops.
   - *No* writes publishes to disk, so `git diff` shows them and the public pages update live. The
     fake R2 starts empty, so the Library flags every real asset as broken, and cleaning those rows
     writes a real `media.json` the developer commits; a multi-file commit is not atomic on disk;
     and a dev publish overwrites a file open in the developer's editor.
2. **May an anonymous `/healthz?live=1` mint a token?** The two review lenses recommend opposite
   answers. Recommended: yes, with the coalesced per-isolate cache and the timeout above.
   - *Yes* (the mechanics lens) keeps the live check on the public route, where ruling 3 places it,
     so an uptime monitor can use it, at one mint per isolate per minute. A caller spread across
     many locations multiplies the mints, and GitHub's secondary limits (its rate-limit page: 900
     points a minute, 5 per REST `POST`) are shared with publishing, so a sustained distributed
     burst could delay publishes. Nothing is lost; the branch holds each save. The one-mint bound
     holds once the per-caller timer and the stale-slot rule under "Bounding a public route" land,
     and this spec now carries them.
   - *No* (the integrity lens) honors `live=1` only for a signed-in owner. The guard attaches the
     editor only under `/admin`, so the scaffold gains an owner-only health route there, and public
     `/healthz` keeps the no-network self-test and fingerprint. No anonymous request reaches
     GitHub, and no uptime monitor can run the live check.

## Declined, with proposed ledger entries

Each entry follows the ledger format; the close writes them. An item an existing ruling already
settles gets no new entry.

- **`admin-toolkit-shell-only`** (decline). The toolkit renders only inside the admin shell, which
  loads `cairn-admin.css` and the theme wrapper (`CairnAdminShell.svelte:43`). A member area or any
  other site surface is the site's domain under the charter, styled by the site. Shipping the admin
  sheet for use outside `/admin` would make the admin's internal CSS public surface. The reference
  states the toolkit is shell-only. Reopens on: a second site building a non-admin surface from the
  toolkit by hand.
- **`refusal-channels-per-call-site`** (decline). `requireAccess` throws `error(403)` from a load,
  `createSectionAction` returns `fail(403)` to its form, and `createAdminAction` audits and throws.
  Each matches its SvelteKit call site, and `access-semantics-documented-divergence` already keeps
  the two postures. The inner CSRF check under the action wrappers is defense in depth behind the
  guard's, and it runs before an editor exists to audit. The reference's "Refusal channels" section
  (`sveltekit.md:413`) already documents the three. Record: the pre-beta C1 pass
  (`docs/superpowers/plans/2026-08-01-pre-beta-c1-seam-shape.md`, Task 5). Reopens on: a site
  needing a uniform audit trail across the three.
- **`csrf-no-rotation-under-identity`** (decline). Under `identity`, no cairn sign-in occurs, so the
  login-moment rotation never runs, and a gate-side identity change is invisible to cairn. A cairn
  logout still clears the value (`security-model.md:411-415`). The value is a per-browser CSRF token,
  `HttpOnly`, `SameSite=Lax`, `__Host-` on https, and not a credential. Reopens on: a gate that
  switches identities within one browser session in production.
- **`admin-headers-scope`** (decline). The 303 to `/admin/login` carries an empty body, and the guard
  deliberately sends no HSTS on it (`guard.ts:59-63`). Public routes are the site's output under the
  charter. The page states both. Reopens on: a header-scanner finding on the redirect with a real
  consequence.
- **`dev-flag-strict-read`** (decline). `isDevBackendFlagSet` accepts exactly `'1'` or the boolean
  `true` (`src/lib/dev-flag.ts:30-32`), because it is also the production tripwire
  (`dev-backend-flag-refusal`), and a wider rule turns a typo into an outage. The scaffold's
  `npm run dev` sets the value through `spawn`, so the `cmd.exe` trailing space cannot reach it. The
  fact that states the broken `set` form is corrected. Reopens on: a scaffold path that delivers the
  flag through a shell.
- **`token-cache-no-401-eviction`** (decline). Evicting the shared token cache on a 401 would make a
  rotation self-heal in warm isolates. The fingerprint and the live check give rotation a verifiable
  sequence, so eviction answers no remaining defect. Reopens on: a recorded publish failure from a
  cached token after a completed rotation.
- **Settled, no new entry.** C4 (the bootstrap row's missing nonce) by
  `login-csrf-no-same-browser-binding`; C10 (no owner bootstrap under `identity`) by
  `identity-seam`; C12 (a throwing `validate` fails open) by
  `audit-log-content-field-behavior-failed`; D13 (no promised local log sink) by `log-export`,
  whose Shape keeps the sink internal.

The lead also adds an accept entry, **`access-map-one-declaration`**, recording the decision and its
evidence.

### Ledger entries this pass falsifies (the close writes a dated annotation to each)

- `access-semantics-documented-divergence`: the Shape amendment for the narrowed
  `config.access_unmapped`, and its `Verified:` line, whose test asserted an href key "never counts
  toward coverage" for a warning that now stays silent on an href-only map.
- `audit-adapter-accessmap` and `audit-adapter-rolesdeclaration`: "imports it twice, into
  createAuthGuard and the adapter" becomes once, into the adapter. The keep still holds: a site that
  declares its map in its own module annotates the export with `AccessMap`, and `defineAccess`'s
  first parameter still takes a `RolesDeclaration`.
- `audit-sveltekit-authguardoptions`: a site now writes `{ runtime }` in `hooks.server.ts`; the
  remaining members (`identity`, `includeSubDomains`) are the site's decisions.
- `audit-sveltekit-editorroutesoptions`: the `roles` member is removed; a hand-mounting site passes
  the runtime, which carries the vocabulary.
- `audit-adapter-canreach`: "the single authority" becomes true by construction, and A1 adds a third
  carve-out, a `none` role named in a rule.
- `audit-adapter-navmenuconfig`: `configPath` moves to `editor.siteConfigPath`.
- `doctor-drop-github-app`: the named gap (a never-published site has no signal before its first
  Publish) closes through `/healthz?live=1`.
- `audit-log-github-unreachable`: the event gains `scope: 'health'`, a check verdict beside the
  three degrading reads, with a `reason`.

## Ruling 4: the Claude Code arm

No arm setup belongs in an engine pass. An arm the gates have never seen reads as `absent`
(`scripts/checks/arm-state.mjs`), so registering it early changes no gate's behavior. The
registration (`ARM_NAMES`, `ARM_DIRS`, the arm-index, package-files, snippets, symbols, visuals,
leaks, and links checks, `package.json` `files`, and the register's track entry) is the first task of
the arm's own docs stage, where pages exist to test it against. This pass only places that stage in
`ROADMAP.md`'s path: a small stage right after 2b, since its facts are already in
`docs/internal/facts/extend.md` and the scaffold ships the guidance tree it documents. B6's fixes
land first, so the page can document `cairn-guidance check` without a false-positive caveat.

## Docs and records

- **Reference pages**, updated in the task that changes them: `sveltekit.md`, `core.md`,
  `log-events.md`, `cloudflare.md`, `auth-channel.md`, `render.md`, `vite.md`, `ambient.md`,
  `guidance.md`, `cairn-audit.md`, `cli-cairn-doctor.md`, and `admin-toolkit.md` (the shell-only
  sentence). `check:surface -- --update` regenerates `api-surface.md`.
- **Facts.** A bullet for every public-behavior change and a correction to every bullet a fix
  falsifies, gated by `check:facts`.
- **The extend arm.** The eleven 2a pages are written. A fix that changes one does not trigger a
  redraft in this pass. The close adds each affected page to stage 2b's re-arm list in
  `docs/internal/record/harvest/relink.json`, with the facts that changed, so 2b's page chain revises
  it from corrected facts in the same run. Affected: add-cairn-to-a-sveltekit-app,
  scaffolded-site-files, add-a-custom-admin-screen, restrict-admin-access, security-model,
  add-a-second-sign-in-group, debug-your-site, rotate-the-github-app-key. The 2b pages draft from the
  corrected facts directly.
- **Per-version records.** `CHANGELOG.md` under `## Unreleased`, `docs/extend/migration-notes.md`,
  `docs/extend/upgrade-cairn.md`, and the tool changelog for the doctor change.
- **The friction log.** Every entry this spec rules on leaves the log at the close: fixed and
  deleted, or moved to the ledger or the ROADMAP tier this spec names.
- **Ratified records the close amends, each with a dated note.** The ledger entries above; the
  functional spec's C7 and D5 lines; the 2a media design's decision 1
  (`2026-06-15-cairn-media-2a-ingest-delivery-design.md:162-168`), whose publish snapshot was
  last-writer-wins and is now head-guarded; and the charter phrase C7 proposes, for Geoff's read.
- **`ROADMAP.md`.** The engine-pass entry is removed; batched items join the Next tier's batched
  engine friction entry, each tagged with the page that carries its caveat; the boundary-test
  amendment above lands; the Claude Code stage is placed. "The pre-beta pass series and the
  two-release shape" is rewritten to the one-release path. The one release after stage 5 is a `0.x`
  minor, the old "release one". `1.0.0-beta.1` cannot be that cut: beta waits for the ASC and ecxc
  sites by Geoff's 2026-08-26 ruling ("Toward 1.0"), and no site migrates before the release. Phase
  P's open items, P8 and P9 among them, go to the final engine batch or after the release, each
  named.

### Consumers must (draft, finalized at the close)

- Pass `{ runtime }` on every `createAuthGuard`, `devBackendHandle`, and per-route
  `createEditorRoutes` call, bare calls included; `identity` and `includeSubDomains` are unchanged.
  Declare `roles` and `access` on the adapter; if the hooks and the adapter held different maps,
  reconcile them, since the adapter's now governs every reader.
- Drop `seedContent` from `devBackendHandle`. A site that runs the dev backend under `wrangler dev`
  passes `content: 'fixtures'`.
- Regenerate the content manifest (`npx cairn-manifest`) and commit it.
- Move `editor.nav.configPath` to `editor.siteConfigPath`; a site whose site config is anywhere but
  `src/theme/site.config.yaml` sets `editor.siteConfigPath`.
- Remove any `itemLabel` from a `FieldBehavior`, rename a concept whose id names an engine view, and
  make publish-action labels unique.
- Move any route under `/admin/auth/` elsewhere; it is now guarded.
- Mount `tidyAction` and `dictionaryAddAction` only on a route with a `concept` param.
- A `sanitizeSchema` callback can no longer allow `<script>`; use a registered component or island.
- Alerting on Turnstile `invalid_input` for a missing secret now matches `missing_secret`.
`Consumers may:` answer 503 from `/healthz` when `ok` is false; apply `0001_roles.sql` when declaring
custom roles; delete the site's own `devBuildDefine` plugin and `__CAIRN_DEV_BUILD__` declaration,
which the engine now supplies (the declaration collides only with `skipLibCheck` off).

## Sizing and the split

The fix set is twenty-three plan tasks after the review. Two passes keep each close's review
fan-out on one domain; a third would add a close without separating any dependency. They run in
order, and both land before stage 2b.

**Pass A, access, auth, and the commit path** (header class `auth-data`; twelve tasks):

1. The lead: required `runtime` on the guard, dev handle, and editor routes; `config.access_unmapped`
   narrowed; the comments and reference rows; the scaffold and showcase hooks; the
   `check:tool-heuristics` signature pin.
2. The Go doctor's `auth.role-wiring` learns `{ runtime }` (`tool`; gated on task 1's signature).
3. A1, A2, C1, C7: the access tightening in `access.ts` and `guard.ts`.
4. A3: the roles migration and its named failure on every role write.
5. A7, A8, A10: the auth channel and branding (`engine-logic`).
6. Ruling 3: the live check, its single-flight cache, the typed mint error, and the fingerprint.
7. B5, B9, B11a: the template's 503 and non-applicable signing check, and the rotation strings
   (`engine-logic`; B5 changes the health route's status and `ok` composition, not signing,
   session, D1, or commit-path code).
8. A6: the failed save in place (`engine-logic`).
9. C11, Library: the head guard on the five Library paths and the dictionary.
10. C11, publish: the head guard on publish and publish-all.
11. D1: nested images in where-used, replace, and the manifest verify.
12. Docs and records for pass A, the ledger entries and annotations, and the ROADMAP rewrite
    (`docs`).

**Pass B, scaffold, dev, and schema** (header class `engine-logic`; eleven tasks):

1. Ruling 2, the bake: the signups demo leaves the template, and the exemplars inline (`sweep`).
2. Ruling 2, `create-cairn-site`: `APP_DB` provisioning goes (`auth-data`).
3. Ruling 5: the dev backend over real content.
4. B1: the dev package builds to `dist/`.
5. A5, B2, B3, D2: the scaffold's error page, message, types script, and feed (`sweep` for A5 and
   B3).
6. B6: `cairn-guidance check`.
7. B7: the dev-build define in the Vite plugin (`auth-data`).
8. A13, A14, D4: composition checks and the dead member.
9. C5, C13, D6: the sanitize floor and the two build warnings.
10. D5 and D8a: the site-config path and `--fail-on advisory`.
11. Docs and records for pass B, the relink re-arm list, and the friction-log clearing (`docs`).

**The cut** is after pass A's docs task. Pass B depends on pass A: both edit the hooks and the dev
handle's signature, and ruling 2's scaffold has no access declaration only once the lead lands.
Stage 2b starts after pass B, since pass B changes 2b pages (D5, D6, and ruling 5's add-cairn
caveat).

**The docs tooling entry** ("Docs tooling before stage 2b") runs as its own pass, not in either
engine pass. Its files are disjoint (`scripts/checks/` and `~/.dotfiles`), so it can run beside pass
A in its own worktree. The `2f4ef9d8` contributor and tooling entries route to it.

Each close fans out `web-auth-security-reviewer`, `svelte-reviewer`, and
`cloudflare-workers-reviewer`, plus a `go-architecture-reader` for the doctor package (pass A), and
runs the live auth smoke on the showcase under local `wrangler dev`, as the SvelteKit 3 pass did.
Pass B carries `auth-data` tasks (B7 and the provisioning edit), so its close runs the smoke too.
A5's capture is read in the main loop; neither pass needs an owner sitting.

## Declined and batched

"Batch" means the Next tier's batched engine friction entry, taken by the final engine batch unless
a later stage close pulls it forward. A batched item that leaves a page caveat names that page, so
the final batch revises it.

| Item | Claim check | Verdict | Reason |
| --- | --- | --- | --- |
| Lead: two access readers | true | fix (pass A, task 1) | One declaration read by all; `read-from-the-source-rule` |
| A1 `none` role's own screen | true | fix | The access map refuses the screens a `none` role exists for |
| A2 shadowed dynamic route | true; docs partly fixed | fix (log reason) | Behavior stays; the record names the cause |
| A3 scaffold omits `0001_roles.sql` | true | fix | An unhandled 500 on the first custom-role add |
| A4 `access_map_not_attached` cause | partly true | fix (in the lead) | Comments and two reference rows; the lead removes the dev cause |
| A5 no admin error page | true | fix | A 403 lands in public chrome |
| A6 failed save becomes a bare 500 | true | fix | The editor loses unsaved writing |
| A7 Turnstile missing secret | true | fix | The log names the wrong cause |
| A8 `createChannelDb` cast | true | fix | An honest structural type removes the cast |
| A9 toolkit unstyled outside the shell | partly true | decline | `admin-toolkit-shell-only` |
| A10 `auth.branding` replaces whole | true | fix | Silently drops reply-to |
| A11 three refusal channels | true | decline | `refusal-channels-per-call-site` |
| A12 custom screen needs `prerender = false` | false for the scaffold | decline | The scaffold sets `prerender = true` per route under `(site)` only (`templates/waymark/src/routes/(site)/+page.server.ts:7`), so an `/admin` screen is dynamic by default; one doc sentence |
| A13 duplicate publish labels | true | fix | Loud at composition |
| A14 reserved concept ids | true | fix | Unreachable admin views |
| B1 dev package ships `.ts` | true for hand-built sites | fix | The tutorial's first `svelte-check` fails |
| B2 stale-manifest script name | true | fix | Names a script a hand-built site lacks |
| B3 no `cf-typegen` | true | fix | Cloudflare's convention |
| B4 `cmd.exe` trailing space | partly true; unreachable from the scaffold | decline | `dev-flag-strict-read` |
| B5 `/healthz` 200 on failure | true | fix | Health-check convention |
| B6 guidance check false stale | true (VERSION after a patch) | fix | A fresh scaffold should read fresh |
| B7 hand-written dev define | true | fix | A security-relevant copy every site makes |
| B8 signups in every scaffold | true | fix (ruling 2) | Ruled |
| B9 unread `GITHUB_APP_*` names | true | fix | The remediation misleads |
| B10 rotation signals | true | fix (ruling 3) | Ruled; the fingerprint is decided |
| B11a key step's message | true | fix | Points at a step that cannot work |
| B11b `.pem` input for the key step | true | batch (page: rotate-the-github-app-key) | Rotation is rare; the page carries one Node command meanwhile |
| B12 dev backend content | true | fix (ruling 5) | Ruled |
| Token-cache eviction on a 401 | n/a (new, from B10) | decline | `token-cache-no-401-eviction` |
| C1 concept-less tidy and dictionary | true, narrow | fix | Removes a security-model caveat |
| C2 CSRF under identity | true | decline | `csrf-no-rotation-under-identity` |
| C3 headers on the 303 and public routes | true | decline | `admin-headers-scope` |
| C4 bootstrap row has no nonce | true | decline | Settled: `login-csrf-no-same-browser-binding` |
| C5 sanitize callback replaces the floor | true | fix | A security floor the comment already promises |
| C6 roster miss outside `guard.refused` | true, deliberate | batch (pages: security-model, `log-events.md`) | Reference sentence in the `guard.refused` row |
| C7 every `/admin/auth/*` path public | true | fix | Closes an unguarded-route trap |
| C8 identity logout through a guarded path | true | batch | UX polish; the gate's own logout works |
| C9 `IdentityRefusal.reason` free string | true | batch (pages: replace-magic-links-with-cloudflare-access, `sveltekit.md`) | Reference: name the level words |
| C10 no owner bootstrap under identity | true | decline | Settled: `identity-seam` |
| C11 writes to main not head-guarded | true | fix | Lost or resurrected rows, dropped words, reverted prose |
| C11b dictionary's third concurrency path | true; no head passed, so its retry never fires | fix (in C11) | One argument in a task on the same pattern |
| C12 throwing `validate` fails open | true, deliberate | decline | Settled: `audit-log-content-field-behavior-failed` |
| C13 `checkSiteFacts` silent | true | fix | One build warning |
| D1 nested images invisible | true | fix | Data loss |
| D2 feed literals and relative URLs | true | fix | Wrong feed output |
| D3 media-seed ignores `publicBase` | true | batch (pages: `cli-cairn-media-seed.md`, theme-your-public-site) | Rare relocated media route; a reference sentence meanwhile |
| D4 `itemLabel` read nowhere | true | fix | A no-op on the public surface |
| D5 site-config path on `nav.configPath` | true | fix | Settings and Tags 404 without a nav menu |
| D6 undeclared keys dropped | true | fix | `noindex` silently ignored |
| D7 `deriveHeroImage` reads `image` only | true | batch (page: 2b build-the-public-routes) | Honor the `seo` marker per `audit-adapter-imagefield` by threading the field name |
| D8a `cairn-audit` advisories exit 0 | true | fix | `--fail-on advisory` |
| D8b `--json` report and stable codes | true | batch (page: 2b run-cairn-audit-on-your-site) | The report shape becomes a contract; design it once |
| D9 chassis boundary leaks | true | batch (page: theme-your-public-site) | Theme-port work, template only |
| D10 spacing keys shadow container suffixes | true | batch (page: theme-your-public-site) | A breaking theme rename; final batch |
| D11 preview frame has no `data-theme` | true | batch (page: theme-your-public-site) | New preview option; editor proofing polish |
| D12 `CAIRN_FIXED_TODAY` prefix | true | decline | No engine code; the recipe uses a site-owned name |
| D13 no promised local log sink | true | decline | Settled: `log-export` |
| Claude Code arm setup | n/a | decline for this pass | The arm's own stage registers it |
| `2f4ef9d8` contributor and tooling entries | not engine product | decline for this pass | Routed to the docs tooling pass |
| Docs tooling before stage 2b | n/a | its own pass | Disjoint files; can run beside pass A |
