# Engine pass before stage 2b: design

Status: draft for Geoff's read, 2026-10-07. Inputs: the owner rulings
(`docs/superpowers/specs/2026-10-07-engine-pass-pre-2b-rulings.md`), the candidate list in
`ROADMAP.md`'s Now tier on `draft-docs-2a` ("Engine pass before stage 2b"), the friction log at
`b38ef6b3` and the entries filed at `2f4ef9d8`, the charter
(`docs/internal/what-cairn-is-and-is-not.md`), and the rulings ledger
(`docs/internal/engine-rulings.md`). Every claim was checked against the code at `draft-docs-2a`;
line numbers below are that branch's. The F4 close review of the 2a close finish had filed nothing
when this was written; anything it files takes the same test at this pass's plan review.

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

## The lead: one access and role declaration

### What is wrong

The access map has two readers, and nothing makes them agree.

- The engine's own screens, write actions, and sidebar read the adapter's `access` through the
  composed runtime (`src/lib/content/compose.ts:41`). About forty call sites read `runtime.access`,
  for example `content-routes-media-library.ts:67` and the nav resolver at
  `content-routes-shell.ts:187`.
- `requireAccess` and `createSectionAction` read `locals.cairnAccess`, which only the guard attaches
  from its own `access` option (`src/lib/sveltekit/guard.ts:348,368,479`,
  `section-action.ts:275`).

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

`createAuthGuard`, `devBackendHandle`, and `createEditorRoutes` take `{ runtime }` and read
`runtime.roles` and `runtime.access`. Their separate `roles` and `access` options are removed. The
adapter's `roles` and `access` members are the one declaration.

The evidence:

- **`read-from-the-source-rule`** (ledger, accepted standing rule): "a fact with one source is read
  from that source, never copied". The access map and the role vocabulary are each one fact wired by
  hand into two or three places.
- **`audit-adapter-canreach`** (keep) records `canReach` as "the single authority every enforcement
  and visibility point reads, so a site's guard and the engine's sidebar agree". Today that is false
  for any site that wires the two differently. After this change it is true by construction.
- **The engine's own factory convention.** Every other route factory already takes `{ runtime }`:
  `ContentRoutesConfig`, `NavRoutesConfig`, `MediaRouteConfig`, `CairnAdminConfig`
  (`content-routes-context.ts:191`, `nav-routes.ts:46`, `media-route.ts:74`, `cairn-admin.ts:34`).
  The guard and `createEditorRoutes` are the two outliers.
- **The import cycle goes away.** With the guard reading the runtime, a site declares `roles` and
  `access` on the adapter, or in a module the adapter imports. Nothing imports the adapter to build
  the access module.

The cost is that `hooks.server.ts` imports the site's runtime module. The scaffold already composes
the runtime once in `src/chassis/cairn.server.ts`, which `/healthz` and the admin mount import, so
the hooks file imports the same module. The adapter module is already evaluated by every public
route, so this adds no new cold-start work.

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
  map declares at least one screen-id key and leaves another concept or fixed screen unmapped. The
  ledger entry gets a dated amendment to its Shape line.
- **`access_map_not_attached` gets its real cause.** The guard and the dev handle now always attach
  `runtime.access ?? {}`. The `fail(500)` then fires only on a route outside every hook's coverage.
  The comments at `guard.ts:364-367` and `section-action.ts:129-130` say so. The reference rows on
  `draft-docs-2a` are already correct (`sveltekit.md:827-831`, `log-events.md:81`).

### The Go doctor

`auth.role-wiring` reads a site's `createAuthGuard(...)` call. A `{ runtime }` argument has a `{` and
no `roles` word, so the heuristic would report a false fail on every updated site. The check learns
that a `runtime` argument is wired. It keeps its old behavior for a site on an older engine, which
the tool still serves. The `check:tool-heuristics` signature pin at `guard.ts:170` updates with it.

### Outcome and acceptance

- The scaffold, the showcase, and every reference snippet declare `roles` and `access` once, on the
  adapter, and the hooks pass `{ runtime }`.
- A test proves that an `access` rule on the adapter gates the engine screen, the sidebar entry,
  `requireAccess`, and `createSectionAction` alike. A second test proves the same for a declared
  role's capability in the guard and the roster screen.
- `config.access_unmapped` is silent for an href-only map and fires for a partial screen map.
- `auth.role-wiring` passes on `createAuthGuard({ runtime })` and keeps failing on a bare
  `createAuthGuard()` with custom roles declared.
- **Breaking.** `Consumers must:` pass `createAuthGuard({ runtime })` and
  `devBackendHandle({ runtime })` in place of `{ roles, access }`; pass `createEditorRoutes({ runtime })`
  in place of `{ roles }`; and move `roles` and `access` onto the adapter if they lived only in the
  hooks.
- **Docs.** Reference: `sveltekit.md` (`createAuthGuard`, `AuthGuardConfig`, `createEditorRoutes`,
  the `access_map_not_attached` row), `core.md` (`defineAccess` snippet), `log-events.md`
  (`config.access_unmapped`), `cli-cairn-doctor.md`. Extend (2a, re-armed for 2b's run, see "Docs
  and records"): restrict-admin-access, security-model, scaffolded-site-files,
  add-a-custom-admin-screen, add-cairn-to-a-sveltekit-app. Outlined 2b: arrange-the-admin-sidebar.
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
  Signups screen every scaffolded site ships" and ask the reader to open it beside the file. After
  the move that file is not in the site. The exemplars carry the shipped source inline and name the
  showcase as provenance. They stop pointing at a file in the reader's site.
  `skill-references-compile.test.ts` keeps compiling the classes they quote.
- **`@glw907/cairn-cms-dev`** keeps `fake-app-db.ts` and its `APP_DB` layering, because the showcase
  still runs the screen. It is a developer-binding example, not scaffold plumbing.
- `emit-template-tree.test.ts` asserts `AUTH_DB` is the only D1 binding a scaffold carries.

Acceptance: `check:template` green on the re-emitted tree; a fresh scaffold builds, has no
`/admin/signups` route, no `APP_DB` binding, and no Signups sidebar entry; the showcase e2e suite,
which still covers Signups, stays green. Not breaking for an existing site. Docs: scaffolded-site-files,
add-a-custom-admin-screen, and restrict-admin-access (2a, re-armed), `README.md:28`, and the facts
that say every scaffold ships the screen (`f:pyt58u`, `f:onqm6k`, `f:qtm9y2` and the others B8's
inventory lists in the plan). Pass class: `sweep` for the bake and tests, `engine-logic` for
`create-cairn-site`.

### Ruling 3: the opt-in live key check

**Where it lives.** `loadHealth(event, runtime)` already takes the event and reads nothing from it
(`src/lib/sveltekit/health.ts:24`). It reads `?live=1` from `event.url`. So the site's `/healthz`
route does not change, and `loadHealth`'s signature does not change.

**What it does.** With `live=1`, `loadHealth` mints one installation token with `installationToken`
(`src/lib/github/signing.ts:66`), the uncached mint, from the deployed key. It reports a new
`checks.githubAppToken: { ok, detail }`, where `detail` is a fixed classifier: GitHub refused the
key, the installation was not found, or GitHub was unreachable. It never touches the shared token
cache (`cachedInstallationToken`, `signing.ts:121`), so the check proves the deployed key whatever a
warm isolate holds. Without `live=1`, nothing changes and no network call is made. A failed live
mint logs the existing `github.unreachable` event with a new `scope: 'health'`.

**Bounding a public route.** `/healthz` is public. The live verdict is cached per isolate for 60
seconds, keyed by a hash of the key secret, so a changed secret never reads a stale verdict, and a
burst of anonymous requests costs at most one mint per isolate per minute. The mint never shares the
token cache's entry. That residual (an anonymous caller can trigger one mint a minute per isolate) is
stated on the reference page.

**`/healthz` answers 503 when `ok` is false** (item B5 below). This follows the health-check
convention in the IETF draft "Health Check Response Format for HTTP APIs"
(draft-inadarei-api-health-check): a failing check maps to a 5xx status, the body still carries the
detail. An uptime monitor that reads only the status then sees a broken key.

**The fingerprint (Rulings for Geoff, item 2).** A live mint with the old key still succeeds until
the old key is deleted on GitHub. So the live check alone cannot tell the operator that the Worker
holds the new key. A wrong deploy target, the friction entry's case, passes every check, and
deleting the old key then stops publishing with no rollback. GitHub documents a SHA-256 fingerprint
per App private key, computed from the public half ("Managing private keys for GitHub Apps",
"Verifying private keys"). `signingSelfTest` can report the same fingerprint with no network call
and nothing secret disclosed. The rotation page then reads: deploy, compare the fingerprint with the
new key's on GitHub, run the live check, then delete the old key. This spec recommends adding it.

Acceptance: a test with a stubbed mint proves `live=1` mints once, bypasses the cache, reports each
classifier, and caches by key hash; the plain call makes no fetch; the route answers 503 on
`ok: false`. Not breaking: `HealthData` gains an optional member. Docs: rotate-the-github-app-key
(2a, re-armed; its confirming publish and the 55-minute wait give way to the check),
`sveltekit.md` (`loadHealth`, `HealthData`), `log-events.md` (the new scope). Pass class: `auth-data`
(signing).

### Ruling 5: the dev backend over the site's real content

**The runtime boundary.** Under `vite dev` the server runs in Node, with `cloudflare:workers`
stubbed over the platform proxy (`docs/superpowers/specs/2026-10-03-sveltekit-3-upgrade-design.md`,
"Evidence"), so `node:fs` reads the working tree. The showcase e2e build runs under `wrangler dev`
in workerd (`examples/showcase/playwright.config.ts`), where it cannot. The e2e suite also asserts
against the fixture ids (`2026-06-hello`, the media seed, the vocabulary branch).

**The option.** `DevBackendConfig.seedContent` is removed. `devBackendHandle({ runtime, content })`
takes `content: 'repository' | 'fixtures'`, default `'repository'`.

- `'repository'`: the in-memory repo's `main` reads through to the working tree. `readFile` and
  `readEntries` answer the overlay first, then the file on disk, so an edit the developer makes in
  their own editor shows in the dev admin on the next request. Saves, publishes, branches, and
  deletes land in the in-memory overlay. Nothing writes to disk (Rulings for Geoff, item 1). The
  fixture seeds do not run. Under workerd, the handle throws at construction with a message naming
  `content: 'fixtures'`.
- `'fixtures'`: today's seeded in-memory repo, unchanged. The showcase passes it.

Media bytes stay in the in-memory R2 double. A fresh scaffold's `media.json` is empty, so nothing
shows broken. A site with real media sees its thumbnails missing in the dev admin. That limit is
stated on the add-cairn page, and reading local R2 through is batched.

Acceptance: against a temp directory, a test proves the dev admin's list shows the files on disk, a
save shows in the next read without touching the file, and a disk edit shows without a restart; the
showcase e2e suite stays green on `'fixtures'`. **Breaking** for the dev package: `seedContent`
goes. Its `Consumers must:` line rides the lead's `devBackendHandle({ runtime })` line. Docs:
add-cairn-to-a-sveltekit-app and scaffolded-site-files (2a, re-armed; the fixture caveat goes), the
dev package README. Pass class: `engine-logic`.

## Fixes in this pass

Each item names its outcome, acceptance, surface, pages, and pass class. "2a" pages are written and
re-armed for stage 2b's run; "2b" pages are outlined. The verification column of each claim is in
the triage table at the end.

### Access and auth

- **A1, a `none`-capability role's own screen.** `canReach` refuses a `none` session before reading
  the map (`src/lib/auth/access.ts:157-159`). So `requireAccess` and `createSectionAction` refuse the
  one kind of screen a `none` role exists for, while `RoleDeclaration.home` and a `navLayout` entry's
  `roles` admit it. The page hand-rolls a role check. Fix: `canReach` admits a `none` session to an
  href target whose matched rule names its role explicitly. Screen ids, unmapped hrefs, and
  `editors` stay refused. Acceptance: table-driven tests over screen, mapped href, unmapped href,
  and a dynamic route. Surface: a loosening for a `none` role named in a rule, disclosed in the
  changelog. Pages: add-a-second-sign-in-group, restrict-admin-access (2a). Class `auth-data`.
- **A2, the shadowed dynamic route.** `matchHrefKey` refuses a dynamic sibling when a deeper key
  exists (`access.ts:107-127`), owner included, and only the log shows it. The behavior stays; it is
  documented on restrict-admin-access already. Fix: `auth.access.refused` gains
  `reason: 'no_rule' | 'shadowed' | 'role'`, so the record names the cause. A build-time route walk
  was weighed and dropped: the Vite plugin would need a new option to find the map, and the route
  tree. Surface: one log field. Pages: debug-your-site (2a), `log-events.md`. Class `auth-data`.
- **A3, the roles migration.** The scaffold ships migrations 0000, 0003, and 0004
  (`examples/showcase/migrations/`, the bake's source), so a declared role's first roster add meets
  `0000_auth.sql`'s `CHECK (role IN ('owner','editor'))` as an unhandled 500 (`store.ts:263-273`).
  Fix: ship `0001_roles.sql`, and have the store name it on the constraint failure the way
  `rethrowStoreFailure` names 0004 (`store.ts:20-31`). Acceptance: a fresh scaffold's migration set
  matches the engine's required set, and the constraint failure surfaces as the named remediation.
  Surface: none. Pages: restrict-admin-access, add-a-second-sign-in-group, scaffolded-site-files (2a).
  Class `auth-data`.
- **C1, concept-less tidy and dictionary.** The two actions gate on the map only inside
  `if (event.params.concept)` (`content-routes-tidy.ts:124`, `content-routes-dictionary.ts:106`).
  The shipped mount always passes the param. A site that hand-mounts either without it gets an
  ungated action. Fix: both refuse with a 404 when the param is absent, since both are
  concept-scoped by contract. **Breaking** only for that hand-mount. Pages: security-model (2a; its
  caveat at `:324` goes). Class `auth-data`.
- **C7, the public `/admin/auth/*` prefix.** `isPublicAdminPath` admits every path under
  `/admin/auth/` (`guard.ts:28-29`). The engine serves one view there, `/admin/auth/confirm`
  (`admin-dispatch.ts:87`), so a site route mounted under that prefix skips the session check. Fix:
  the predicate admits exactly `/admin/login` and `/admin/auth/confirm`. The charter's sentence
  "nothing behind `/admin` except the sign-in form" (`what-cairn-is-and-is-not.md:107`) names the
  confirm page too. **Breaking** for a site route under `/admin/auth/`, which becomes guarded.
  Pages: security-model (2a). Class `auth-data`.
- **A7, the missing Turnstile secret.** A blank secret logs the same `invalid_input` as a blank token
  (`src/lib/cloudflare/turnstile.ts:92-104`). Fix: a blank or non-string secret logs
  `reason: 'missing_secret'`. Surface: a new value of an existing field, disclosed. Pages:
  add-a-second-sign-in-group (2a), `cloudflare.md`, `log-events.md`. Class `engine-logic`.
- **A8, `createChannelDb`'s type.** It returns a narrow `ChannelDb` (`packages/cairn-cms-dev/src/channel-db.ts:26-29`),
  so the page's test casts `as unknown as D1Database`. The SvelteKit 3 spec keeps the double. Fix:
  the auth channel's `resolveDb` accepts the structural subset its store uses, which `D1Database`
  satisfies. The double then needs no cast. Not breaking. Pages: add-a-second-sign-in-group (2a),
  `auth-channel.md`. Class `engine-logic`.
- **A10, partial `auth.branding`.** A site branding replaces the default whole
  (`cairn-admin.ts:105-110`), so omitting `replyTo` drops the adapter's reply-to with no signal. Fix:
  `auth.branding` is `Partial<AuthBranding>`, merged over the runtime default. A non-breaking
  widening. Pages: add-cairn-to-a-sveltekit-app (2a), `sveltekit.md`. Class `engine-logic`.

### Admin behavior

- **A5, the admin error page.** No `admin/+error.svelte` exists, so an admin 403 renders the root
  error page in public chrome. Fix: the showcase, and through the bake the scaffold, carry
  `src/routes/admin/+error.svelte` with calm admin copy under the admin theme wrapper. A template
  file, not an engine export. Pages: restrict-admin-access, scaffolded-site-files (2a). Class
  `paint`.
- **A6, a failed save keeps the writing.** The edit form posts full-page (`EditPage.svelte:199`).
  When a save fails on a GitHub error, `viewAction` returns the calm `fail(500)`
  (`cairn-admin.ts:236-251`), SvelteKit re-runs `editLoad` to render it, the load hits the same
  GitHub error, and a bare 500 replaces the page and the unsaved text. Fix: the edit form uses
  `use:enhance`, whose documented default applies a `failure` result in place without re-running
  any load (SvelteKit docs, "Form actions", "Progressive enhancement"). Success keeps today's
  redirect. The `&new=1` reasoning in the comment at `:199-206` carries over. Acceptance: a
  component or e2e test with a failing backend shows the calm message with the typed text intact.
  Surface: none. Pages: rotate-the-github-app-key (2a). Class `engine-logic` (Svelte).

### The commit path and media

- **C11, media writes are not head-guarded.** Single delete, bulk delete, update, replace, and alt
  propagation commit `media.json` with no `expectedHead`
  (`content-routes-media-delete.ts:189-193,282`, `content-routes-media-metadata.ts:187-191,384,541`).
  The retry re-parents a precomputed manifest. A concurrent edit can resurrect a deleted asset's row,
  or drop a fresh upload's row. The upload path already fails closed on this file
  (`content-routes-media-ingest.ts:238-249`), because `media.json` has no regenerate-from-files
  backstop. Fix: the five paths read the head and pass `expectedHead`, answering a conflict with the
  existing `MANIFEST_CONFLICT_MESSAGE`. Acceptance: a race test per path. Surface: none. Pages: none
  written; 2b configure-media drops its caveat. Class `auth-data` (the commit path).
- **D1, nested images are invisible to where-used.** `extractMediaRefs` reads top-level image fields
  only (`src/lib/content/media-refs.ts:45-52`), and `imageFieldKeys` skips arrays
  (`media-rewrite.ts:164-171`). `checkContainerNesting` allows `array(image())` and an image inside
  an `object` (`fieldset.ts:388-419`), and the scaffold's own `gallery` is one
  (`cairn.config.ts:116`). A gallery-only asset reads as an orphan, which skips the typed-slug
  confirm, so a delete removes an asset in use. This is a data-loss defect. Fix: both readers descend
  one level into `array` and `object` fields, and the replace rewrite edits every `src:` line it
  finds. Acceptance: tests for a gallery asset in where-used, safe-delete, and replace. Surface:
  none. Pages: 2b configure-media. Class `auth-data` (the commit path).

### Rotation signals

- **B9, the remediation names unread variables.** `github.app-unreachable` tells the reader to check
  `GITHUB_APP_ID` and `GITHUB_APP_INSTALLATION_ID` (`src/lib/diagnostics/conditions.ts:198`,
  mirrored at `tool/internal/spine/conditions.json:199`), and the overlay's `.dev.vars.example:7-8`
  declares them. No code reads either name. The values come from the adapter's `createGithubApp`.
  Fix: the remediation names the key secret and the adapter's `appId` and `installationId`, and the
  example file drops both lines. Pages: rotate-the-github-app-key, scaffolded-site-files (2a). Class
  `engine-logic`, with `check:tool-conditions`.
- **B11a, the key step's closing message.** It tells the developer to "re-run this step" with a
  regenerated key (`packages/create-cairn-site/src/cloudflare/secret.mjs:43-46`), which cannot take
  one (`:25-28`). Fix: the message points at the rotation page. Class `engine-logic`.

### Scaffold and dev package

- **B1, the dev package ships source.** `@glw907/cairn-cms-dev` exports `./src/index.ts`
  (`packages/cairn-cms-dev/package.json:20-24`), so a consumer's `svelte-check` type-checks its
  `.ts` and fails on `cloudflare:workers` and `node:sqlite` unless the site declares both. A scaffold
  does; a hand-built site does not. `skipLibCheck` skips only `.d.ts`. Fix: the package builds to
  `dist/` with `.js` and `.d.ts`, the shape the engine package already has, and the publish workflow
  builds it first. Not breaking: the import specifier is unchanged. Pages: add-cairn (2a). Class
  `engine-logic`.
- **B2, the stale-manifest message.** It says to run `npm run cairn:manifest`
  (`src/lib/content/manifest.ts:373-377`), a script only scaffolds define. Fix: `npx cairn-manifest`,
  the shipped bin. Pages: add-cairn (2a). Class `engine-logic`.
- **B3, no types script.** The scaffold commits `worker-configuration.d.ts`, whose line 2 records
  the `wrangler types` command, and no script runs it. Fix: a `cf-typegen` script, the name
  Cloudflare's create-cloudflare templates use, added by the bake's `package.json` transform, and a
  tutorial step. Pages: add-cairn, scaffolded-site-files (2a). Class `sweep`.
- **B5, `/healthz` answers 200 on failure.** Covered under ruling 3. The showcase route answers 503
  when `ok` is false, and `healthz.spec.ts` expects it. Pages: scaffolded-site-files,
  rotate-the-github-app-key (2a).
- **B6, `cairn-guidance check` misreads a fresh scaffold.** It reports `.claude/` as scanned because
  `src/admin.css` uses `source(none)` rather than the literal `@source not` line
  (`src/lib/guidance/check.ts:21,73-88`), and it hashes `VERSION`, which the bake and `install` stamp
  differently, so a scaffold reads stale after the first patch release. Fix: `source(none)` counts as
  excluded, and the tree hash leaves out `VERSION`. Surface: CLI behavior. Pages:
  scaffolded-site-files (2a), `guidance.md:28`, and the Claude Code arm's facts. Class
  `engine-logic`.
- **B7, the dev-build define.** Every site hand-writes a `devBuildDefine()` plugin
  (`templates/waymark/vite.config.ts:22-33`), and a copy that routes the flag through a shared
  constant ships the dev package in the deployed Worker. A plugin-supplied define is still a literal
  substitution per module, so the template comment's Rollup reasoning does not block it. Fix: the
  engine's `cairnManifest` plugin, which every site already registers, gains a `config` hook that
  defines `__CAIRN_DEV_BUILD__` as `command === 'serve'`. It respects a define the site already
  set, so the showcase keeps its e2e override. `@glw907/cairn-cms/ambient` declares the global. No
  new export. Not breaking: a site's own plugin still wins. Pages: add-cairn, scaffolded-site-files
  (2a), `vite.md`, `ambient.md`. Class `engine-logic`.
- **D2, the scaffold feed.** `feed.ts:20` renders with no fragment resolver and the public media
  resolver, so feed readers get literal `::include{...}` text and root-relative image URLs. Fix:
  pass `createFragmentResolver(site)` and an origin-prefixing media resolver. Pages: 2b
  build-the-public-routes. Class `engine-logic` (template).

### Schema and composition

- **A13, duplicate publish-action labels.** `{#each data.publishActions as action (action.label)}`
  (`EditPage.svelte:1689`) keys by label, and `normalizePublishActions` never checks uniqueness.
  Fix: composition throws on a duplicate label. **Breaking** only for a site with duplicates. Pages:
  2b act-on-newly-published-entries. Class `engine-logic`.
- **A14, a concept id that names an engine view.** `normalizeConcepts` accepts `help`, `settings`,
  `editors`, and the rest, whose admin views are then unreachable (`admin-dispatch.ts:42+`). Fix:
  composition throws on a reserved id, from one shared set. **Breaking** only for such a site. Pages:
  2b define-an-adapter-and-schema. Class `engine-logic`.
- **D4, `FieldBehavior.itemLabel`.** Declared (`fieldset.ts:28`) and read nowhere; the editor cannot
  reach a function-valued behavior. `ArrayField.itemLabel` already does the job. Fix: remove the
  member. Ruling `audit-adapter-fieldbehavior` keeps the type for `validate` and is unaffected.
  **Breaking** only for a site that set the no-op. Pages: 2b define-an-adapter-and-schema, `core.md`.
  Class `engine-logic`.
- **C5, the sanitize floor.** `buildSanitizeSchema` returns the site callback's result unchecked
  (`src/lib/render/sanitize-schema.ts:62`), against its own comment that a site "cannot weaken the
  core strip" (`:22-24`). A callback can allow author `<script>`. The shallow spread also lets a
  callback that mutates `strip` in place change the module default for every renderer in the
  isolate. Fix: after the callback, the engine removes `script` from `tagNames` and restores the
  core `strip`, from a fresh copy. Embedded behavior belongs in registered components and islands.
  **Breaking** for a site that allowed `<script>` on purpose. Pages: security-model (2a), `render.md`.
  Class `auth-data` (a security floor; `web-auth-security-reviewer`).
- **C13, `checkSiteFacts` degrades silently.** It returns `ok` when the facts derivation throws
  (`src/lib/vite/internal.ts:586-590`). Fix: one build-log warning naming the skip. Pages:
  debug-your-site (2a). Class `engine-logic`.
- **D5, the site-config path.** Settings and Tags find the site config through
  `runtime.navMenu?.configPath`, falling back to `src/lib/site.config.yaml`
  (`content-routes-settings.ts:124,198-200`), while the scaffold keeps the file at
  `src/theme/site.config.yaml`. A site with no nav menu gets "Site config not found" on both screens.
  Fix: the adapter's `editor.siteConfigPath` names the file once, default
  `src/theme/site.config.yaml`, and the nav editor, Settings, and Tags all read it.
  `editor.nav.configPath` is removed. **Breaking.** Pages: 2b turn-on-tidy and
  arrange-the-admin-sidebar, `sveltekit.md:1207`. Class `engine-logic`.
- **D6, undeclared frontmatter keys vanish.** Validate-once copies only declared keys, so `robots:
  noindex` on a concept without a `robots` field leaves the page indexed, with no signal
  (`src/lib/delivery/seo-fields.ts:18,27`). The manifest build sees both the raw frontmatter and the
  schema. Fix: it warns once per concept, naming each undeclared key it found. Not breaking. Pages:
  2b define-an-adapter-and-schema, build-the-public-routes. Class `engine-logic`.
- **D8a, `cairn-audit --fail-on advisory`.** The bin exits 0 on any advisory (`report.ts:60-62`), and
  the three public-scope rules a theme author gates on are advisory. Fix: a `--fail-on advisory` flag
  makes advisories fail. The `--json` report is batched below, because its shape becomes a contract.
  Pages: 2b run-cairn-audit-on-your-site, `cairn-audit.md`. Class `engine-logic`.

## Rulings for Geoff

1. **Where does a dev-admin save land?** Ruling 5 says the dev admin "reads and edits the site's real
   content files, saving to a local stand-in". This spec reads the stand-in as the in-memory overlay:
   a save never touches disk, and a restart discards it. The other reading writes publishes to the
   working tree, so `git diff` shows them and the public pages update live. The in-memory reading is
   recommended. A disk write mixes a real `media.json` with bytes held only in the fake R2, so a
   developer could commit a manifest that points at nothing, and a dev-admin publish would overwrite a
   file the developer has open. Which reading did you mean?
2. **Add the key fingerprint beside the live check?** The live check proves GitHub accepts the
   deployed key. It cannot tell the old key from the new one, because both are accepted until the
   old one is deleted. GitHub publishes a fingerprint per App key, and `/healthz` can report the
   deployed key's fingerprint with no network call. Recommended: add it, so the rotation page can
   say "compare the fingerprint, then delete the old key".

## Declined, with proposed ledger entries

Each entry follows the ledger format; the close writes them. The two items an existing ruling
already settles get no new entry.

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
  guard's, and it runs before an editor exists to audit. The reference gets one table of the three
  channels. Reopens on: a site needing a uniform audit trail across the three.
- **`csrf-no-rotation-under-identity`** (decline). Under `identity`, the double-submit value is not
  rotated, because no cairn sign-in or sign-out event occurs. The value is a per-browser CSRF token,
  `HttpOnly`, `SameSite=Lax`, `__Host-` on https, and not a credential. `security-model.md:411-415`
  states it. Reopens on: a gate that switches identities within one browser session in production.
- **`admin-headers-scope`** (decline). The 303 to `/admin/login` carries an empty body, and the guard
  deliberately sends no HSTS on it (`guard.ts:59-63`). Public routes are the site's output under the
  charter. The page states both. Reopens on: a header-scanner finding on the redirect with a real
  consequence.
- **`field-behavior-validate-fails-open`** (keep the current posture). A throwing `behavior.validate`
  is a developer bug, logged at warn as `content.field_behavior_failed`, and the save proceeds
  (`fieldset.ts:459-471`). Failing closed would block every editor's saves on a bug only the
  developer can fix. The debug page names the record. Reopens on: a site whose validator guards data
  integrity that a bad save would corrupt.
- **`dev-flag-strict-read`** (decline). `isDevBackendFlagSet` accepts exactly `'1'`
  (`src/lib/dev-flag.ts:30-32`), because it is also the production tripwire, and a wider rule turns a
  typo into an outage. The scaffold's `npm run dev` sets the value through `spawn`, so the `cmd.exe`
  trailing space cannot reach it. The fact that states the broken `set` form is corrected. Reopens
  on: a scaffold path that delivers the flag through a shell.
- **`log-sink-not-promised`** (decline). `docs/reference/log.md:14-15` keeps the sink unpromised; the
  console is what both dev servers show. The page says so. Reopens on: a sink change the docs would
  otherwise hide.
- **C4, the bootstrap row's missing nonce.** Settled by `login-csrf-no-same-browser-binding`: the
  unbound bootstrap row is the single-owner lockout escape hatch. No new entry.
- **C10, no owner bootstrap under `identity`.** Settled by `identity-seam`: the first owner is seeded
  out of band. No new entry.

The lead also adds an accept entry, **`access-map-one-declaration`**, recording the decision and its
evidence, and a dated Shape amendment to `access-semantics-documented-divergence` for the narrowed
`config.access_unmapped`.

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
- **`ROADMAP.md`.** The engine-pass entry is removed; batched items join the Next tier's batched
  engine friction entry; the Claude Code stage is placed. "The pre-beta pass series and the
  two-release shape" is rewritten to the one-release path. The one release after stage 5 is a `0.x`
  minor, the old "release one". `1.0.0-beta.1` cannot be that cut: beta waits for the ASC and ecxc
  sites by Geoff's 2026-08-26 ruling ("Toward 1.0"), and no site migrates before the release. Phase
  P's open items, P8 and P9 among them, go to the final engine batch or after the release, each
  named.

### Consumers must (draft, finalized at the close)

- Pass `createAuthGuard({ runtime })` and `devBackendHandle({ runtime })` in place of
  `{ roles, access }`, and `createEditorRoutes({ runtime })` in place of `{ roles }`. Declare `roles`
  and `access` on the adapter.
- Drop `seedContent` from `devBackendHandle`. A site whose e2e relies on the old fixtures passes
  `content: 'fixtures'`.
- Move `editor.nav.configPath` to `editor.siteConfigPath`.
- Remove any `itemLabel` from a `FieldBehavior`, rename a concept whose id names an engine view, and
  make publish-action labels unique.
- Move any route under `/admin/auth/` elsewhere; it is now guarded.
- Mount `tidyAction` and `dictionaryAddAction` only on a route with a `concept` param.
- A `sanitizeSchema` callback can no longer allow `<script>`; use a registered component or island.
- Alerting on Turnstile `invalid_input` for a missing secret now matches `missing_secret`.

## Sizing and the split

The fix set is about twenty plan tasks, past the twelve-task line, so this is two passes, run in
order. Both land before stage 2b.

**Pass A, access, auth, and the commit path** (class `auth-data`; ten tasks):

1. The lead: guard, dev handle, and editor routes read the runtime; `config.access_unmapped`
   narrowed; the comments; the scaffold and showcase hooks.
2. The Go doctor's `auth.role-wiring` learns `{ runtime }` (`tool`; independent of task 1's code,
   gated on its signature).
3. A1, A2, C1, C7: the access tightening in `access.ts` and `guard.ts`.
4. A3: the roles migration and its named failure.
5. A7, A8, A10: the auth channel and branding.
6. Ruling 3, B5, B9, B11a: the live key check, the 503, and the rotation strings (plus the
   fingerprint if ruled).
7. A6: the failed save in place.
8. C11: the head-guarded media writes.
9. D1: nested images in where-used and replace.
10. Docs and records for pass A, the ledger entries, and the ROADMAP rewrite.

**Pass B, scaffold, dev, and schema** (mixed classes; ten tasks):

1. Ruling 2: the signups demo leaves the scaffold.
2. Ruling 5: the dev backend over real content.
3. B1: the dev package builds to `dist/`.
4. A5, B2, B3, D2: the scaffold's error page, message, types script, and feed.
5. B6: `cairn-guidance check`.
6. B7: the dev-build define in the Vite plugin.
7. A13, A14, D4: composition checks and the dead member.
8. C5, C13, D6: the sanitize floor and the two build warnings.
9. D5 and D8a: the site-config path and `--fail-on advisory`.
10. Docs and records for pass B, the relink re-arm list, and the friction-log clearing.

**The cut** is after pass A's docs task. Pass B depends on pass A: both edit the hooks and the dev
handle's signature, and ruling 2's scaffold has no access declaration only once the lead lands. Each
pass ends on a green `main`, so stage 2b could start between them if Geoff chose, with pass B's
pages re-armed later.

**The docs tooling entry** ("Docs tooling before stage 2b") runs as its own pass, not in either
engine pass. Its files are disjoint (`scripts/checks/` and `~/.dotfiles`), so it can run beside pass
A in its own worktree. The `2f4ef9d8` contributor and tooling entries route to it.

The close of each pass fans out `web-auth-security-reviewer`, `svelte-reviewer`,
`cloudflare-workers-reviewer`, and a `go-architecture-reader` for the doctor package (pass A), and
runs the live auth smoke on the showcase under local `wrangler dev`, as the SvelteKit 3 pass did.

## Declined and batched

"Batch" means the Next tier's batched engine friction entry, taken by the final engine batch unless
a later stage close pulls it forward.

| Item | Claim check | Verdict | Reason |
| --- | --- | --- | --- |
| Lead: two access readers | true | fix (pass A, task 1) | One declaration read by all; `read-from-the-source-rule` |
| A1 `none` role's own screen | true | fix | The access map refuses the screens a `none` role exists for |
| A2 shadowed dynamic route | true; docs partly fixed | fix (log reason) | Behavior stays; the record names the cause |
| A3 scaffold omits `0001_roles.sql` | true | fix | An unhandled 500 on the first custom-role add |
| A4 `access_map_not_attached` cause | partly true; reference already fixed | fix (in the lead) | Comments only; the lead removes the dev cause |
| A5 no admin error page | true | fix | A 403 lands in public chrome |
| A6 failed save becomes a bare 500 | true | fix | The editor loses unsaved writing |
| A7 Turnstile missing secret | true | fix | The log names the wrong cause |
| A8 `createChannelDb` cast | true | fix | An honest structural type removes the cast |
| A9 toolkit unstyled outside the shell | partly true | decline | `admin-toolkit-shell-only` |
| A10 `auth.branding` replaces whole | true | fix | Silently drops reply-to |
| A11 three refusal channels | true | decline | `refusal-channels-per-call-site` |
| A12 custom screen needs `prerender = false` | false for the scaffold | decline | No export needed; one doc sentence |
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
| B10 rotation signals | true | fix (ruling 3) | Ruled; fingerprint to Geoff |
| B11a key step's message | true | fix | Points at a step that cannot work |
| B11b `.pem` input for the key step | true | batch | Rotation is rare; the page carries one Node command meanwhile |
| B12 dev backend content | true | fix (ruling 5) | Ruled |
| Token-cache eviction on a 401 | n/a (new, from B10) | batch | Self-healing rotation; not needed once the live check exists |
| C1 concept-less tidy and dictionary | true, narrow | fix | Removes a security-model caveat |
| C2 CSRF under identity | true | decline | `csrf-no-rotation-under-identity` |
| C3 headers on the 303 and public routes | true | decline | `admin-headers-scope` |
| C4 bootstrap row has no nonce | true | decline | Settled: `login-csrf-no-same-browser-binding` |
| C5 sanitize callback replaces the floor | true | fix | A security floor the comment already promises |
| C6 roster miss outside `guard.refused` | true, deliberate | batch | Reference sentence in the `guard.refused` row |
| C7 every `/admin/auth/*` path public | true | fix | Closes an unguarded-route trap |
| C8 identity logout through a guarded path | true | batch | UX polish; the gate's own logout works |
| C9 `IdentityRefusal.reason` free string | true | batch | Reference: name the level words |
| C10 no owner bootstrap under identity | true | decline | Settled: `identity-seam` |
| C11 media writes not head-guarded | true | fix | Lost or resurrected manifest rows |
| C11b dictionary's third concurrency path | true, low risk | batch | Sorted, idempotent file |
| C12 throwing `validate` fails open | true, deliberate | decline | `field-behavior-validate-fails-open` |
| C13 `checkSiteFacts` silent | true | fix | One build warning |
| D1 nested images invisible | true | fix | Data loss |
| D2 feed literals and relative URLs | true | fix | Wrong feed output |
| D3 media-seed ignores `publicBase` | true | batch | Rare relocated media route; a reference sentence meanwhile |
| D4 `itemLabel` read nowhere | true | fix | A no-op on the public surface |
| D5 site-config path on `nav.configPath` | true | fix | Settings and Tags 404 without a nav menu |
| D6 undeclared keys dropped | true | fix | `noindex` silently ignored |
| D7 `deriveHeroImage` reads `image` only | true | batch | Honor the `seo` marker per `audit-adapter-imagefield` by threading the field name |
| D8a `cairn-audit` advisories exit 0 | true | fix | `--fail-on advisory` |
| D8b `--json` report and stable codes | true | batch | The report shape becomes a contract; design it once |
| D9 chassis boundary leaks | true | batch | Theme-port work, template only |
| D10 spacing keys shadow container suffixes | true | batch | A breaking theme rename; final batch |
| D11 preview frame has no `data-theme` | true | batch | New preview option; editor proofing polish |
| D12 `CAIRN_FIXED_TODAY` prefix | true | decline | No engine code; the recipe uses a site-owned name |
| D13 no promised local log sink | true | decline | `log-sink-not-promised` |
| Claude Code arm setup | n/a | decline for this pass | The arm's own stage registers it |
| `2f4ef9d8` contributor and tooling entries | not engine product | decline for this pass | Routed to the docs tooling pass |
| Docs tooling before stage 2b | n/a | its own pass | Disjoint files; can run beside pass A |
