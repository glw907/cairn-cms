# Engine pass before stage 2b: spec review, mechanics and feasibility lens

Reviewer lens: does every mechanism behave the way the spec says it does. Target:
`docs/superpowers/specs/2026-10-07-engine-pass-pre-2b-design.md` at `32fd9b1c`. Code read at
`draft-docs-2a` (`ccec538c`). Kit 3 and adapter-cloudflare 8 were read from freshly packed
`@sveltejs/kit@3.0.1` and `@sveltejs/adapter-cloudflare@8.0.0` tarballs, because the main working
copy's `node_modules` still holds kit 2.70. Probes ran in the session scratchpad. Spec line numbers
are the spec file's own.

Counts: 0 blockers, 7 majors, 6 minors, 2 over-ceremony items.

## Majors

### M1. A6: kit 3's `use:enhance` re-runs the load on the common failing save

- **Location:** spec `:321-329` (A6). The code is `src/lib/admin/EditPage.svelte:155,163-171,181,187-191,260-270`.
- **Defect:** the spec says enhance's documented default "applies a `failure` result in place
  without re-running any load". In kit 3 that holds only when the action's `location` equals the
  current URL. After any save, the page sits at `?saved=1`
  (`content-routes-entry-write.ts:321-322`). The next save posts to `?/save`. The failure result's
  location is then the bare path, so enhance navigates there and re-runs `editLoad`. That is the
  same GitHub error, the same bare 500, and the same lost text the item exists to fix. Two more
  breaks follow:
  - `saving` and `publishing` flip true in `onEditSubmit` and reset only on a full reload or an
    entry-key change. After an in-place failure they stay true. `busy` then disables both buttons,
    and the leave guard (`dirty && !busy && !leaving`) stands down, so the editor can navigate away
    and lose the text with no prompt.
  - "Success keeps today's redirect" is no longer a document reload. Enhance turns a redirect into
    a client `goto`, which reuses the component. `fieldsDirty` and `saving` survive, so the page
    reads "Unsaved changes" with disabled buttons. The comment at `:187-189` relies on that reload.
- **Evidence:** in kit 3.0.1, `src/runtime/server/page/actions.js:170,186-191` gives a failure
  `location = get_action_location(event.url)`, which strips the `/save` key and keeps the rest of
  the action URL's query. `src/runtime/app/forms/client.js:88-109` then does:
  `destination = navigate && result.type !== 'redirect' && result.location !== undefined ? resolve_url(result.location) : undefined;`
  It applies in place only when `is_current_location(destination.href)` (query keys compared
  exactly, `client.js:3015-3036`). Otherwise it calls `apply_action_navigation`, which is
  `_goto(..., { action_result })` and runs `load_route`.
- **Proposed fold:**
  - A6 uses a submit callback. On `failure`, it calls `update({ navigate: false, reset: false })`,
    or `applyAction(result)`, and clears `saving` and `publishing`.
  - On `redirect`, it either keeps today's semantics with a document navigation
    (`location.assign(result.location)`) or re-seeds every reset-block field. Pick the first. It
    keeps the `{#key}` remount and the dirty-reset reasoning true.
  - The acceptance test starts from a `?saved=1` URL and asserts that the buttons are re-enabled
    and the leave guard is armed after the failure.

### M2. Ruling 5: the showcase's `content: 'fixtures'` bakes into every scaffold

- **Location:** spec `:244` ("`'fixtures'`... The showcase passes it").
- **Defect:** the scaffold's `hooks.server.ts` is a byte copy of the showcase's. On
  `draft-docs-2a`, `diff` of the two files is empty. The bake copies whatever argument the
  showcase passes. A scaffolded site would therefore pass `'fixtures'`, and ruling 5 would never
  reach new sites. The spec's acceptance tests a temp directory, never the emitted scaffold, so
  nothing catches this.
- **Proposed fold:** wrap the `content: 'fixtures'` line in `cairn-template:exclude-start/-end`
  markers. These already work inside a file (`examples/showcase/src/access.ts:31-33`). Add an
  `emit-template-tree.test.ts` assertion that the emitted hooks carry no `content:` option.

### M3. Ruling 5: per-path overlay-first reads do not deliver "the site's real content"

- **Location:** spec `:238-243,250-252`.
- **Defect:** the spec states one rule: `readFile` and `readEntries` answer the overlay first,
  then disk. The code it lands on breaks that rule four ways.
  1. **The list reads the manifest.** It does not call `readEntries`.
     `content-routes-list.ts:141-160` reads `index.json` from main and falls back to the crawl
     only when no manifest exists. A scaffold always commits one. In dev the plugin never
     regenerates it, because `cairnManifest` only verifies at `buildStart`
     (`src/lib/vite/internal.ts:273-283`). List rows (title, date, draft) are manifest data, so "a
     disk edit shows without a restart" is true for the edit page and false for the list.
  2. **The overlay shadows disk for good after one dev publish.** A publish commits the entry and
     `index.json` (`content-routes-entry-write.ts:352,477`) into the overlay. Every later disk
     edit to that entry, and every later disk-side manifest change, stays hidden until restart.
  3. **A delete resurrects.** `createDevBackend().commit` deletes with `tree.delete(path)`
     (`packages/cairn-cms-dev/src/fake-github.ts`, `commit`). Under a read-through, a removed
     overlay key falls back to the disk file. A delete needs a tombstone.
  4. **"The fixture seeds do not run" is not enough.** The base seed post is a module
     initializer, not a seed function: `const branches = new Map([['main', new Map([[SEED_POST, ...]])]])`
     (`fake-github.ts:42-47`). In `'repository'` mode, `2026-06-hello.md` would sit in the
     overlay. It shows in the nav editor's entry picker (`nav-routes.ts:69` uses `readEntries`) and
     in any readFile.
- **Proposed fold:**
  - State that the list reads `index.json`, and that the disk manifest is the source until a dev
    publish.
  - Specify the overlay rule. Recommended: an overlay entry yields to a disk file whose mtime is
    newer than the overlay write. This one rule keeps the "edit in your own editor" promise after a
    dev publish.
  - Deletes write a tombstone.
  - Move the `SEED_POST` initializer into the fixtures path.
  - Acceptance adds: a delete stays deleted; a disk edit after a dev publish of the same entry
    shows; the test temp directory carries a committed manifest, so it exercises the real list
    path instead of the crawl fallback.

### M4. B1: the `dist/` build has an ordering trap, and more than the publish workflow consumes it

- **Location:** spec `:367-373`.
- **Defect:** "the publish workflow builds it first" covers one consumer. Every place that
  resolves `@glw907/cairn-cms-dev` by name needs `dist/` to exist:
  - the showcase's `file:../../packages/cairn-cms-dev` link (`examples/showcase/package.json:41`),
    which `e2e.yml`, `norms.yml`, and `design.yml` build and serve;
  - `scaffold.yml`'s `npm pack ./packages/cairn-cms-dev`;
  - `create-site.yml`;
  - `scripts/lab/link-consumer.mjs`.

  The natural fix, a `prepare` script on the dev package, fails on a clean `npm ci`. npm runs a
  workspace's `prepare` before the root's. The dev package's declaration build imports
  `@glw907/cairn-cms` types, which resolve to the root `dist/` that the root `prepare` has not
  built yet.
- **Evidence:** a scratch probe (npm 11.19) with a root workspace whose `prepare` writes a marker,
  and a workspace `prepare` that checks for it, printed `dev-first`. The dev handle already imports
  `type { AccessMap, Backend, RolesDeclaration } from '@glw907/cairn-cms'` (`handle.ts:15`), and
  the lead adds `CairnRuntime`.
- **Proposed fold:**
  - Build the dev package from the root `package` script, after `svelte-package`. Every CI path
    already runs that script (`npm ci` triggers the root `prepare`; `scaffold.yml` runs
    `npm run package` before the pack).
  - Give the dev package no `prepare` of its own.
  - Set `files` to `dist`.
  - Acceptance: `npm pack ./packages/cairn-cms-dev` on a clean clone contains `dist/index.js` and
    `dist/index.d.ts`, and the showcase e2e build resolves them.

### M5. B7: the template copies the showcase's own define plugin, and the e2e override has no home

- **Location:** spec `:391-399`.
- **Defect:** `templates/waymark/vite.config.ts` is byte-identical to the showcase's (`diff`
  empty). The spec keeps the showcase's hand-written `devBuildDefine` "for its e2e override" (the
  `VITE_CAIRN_E2E` read), so the bake ships it to every scaffold, and B7's fix never reaches
  scaffolded sites. Excluding it from the bake instead breaks `scaffold.yml`'s positive control.
  That gate runs `VITE_CAIRN_E2E=1 npm run build` on the emitted template and requires dev-fold
  markers in the bundle (`.github/workflows/scaffold.yml:57-70`). The engine define
  (`command === 'serve'` only) would leave them out.
- **Evidence:** a Vite 8.3 probe of the merge mechanics confirms the spec's "a site's own plugin
  still wins" in either plugin order (`site-first` and `engine-first` both resolve to the site's
  value), and an engine-only build resolves `false`. The gap is the e2e flag, not the merge.
- **Proposed fold:** the engine plugin defines
  `command === 'serve' || loadEnv(mode, root, 'VITE_').VITE_CAIRN_E2E === '1'`, which is the
  template's current expression. The showcase and the template both drop their plugin, and the
  flag becomes a documented row on `vite.md`.

  Two smaller points for the same task:
  - The nested verify server strips every plugin named `cairn-manifest`
    (`src/lib/vite/internal.ts:183-186`), so the define is absent there. That is harmless today,
    because no module in `cairn.config.ts`'s graph reads the global. Name it in a `WATCH:` comment.
  - See m6 for the ambient declaration.

### M6. Ruling 3: the per-isolate bound on a public mint fails under concurrency

- **Location:** spec `:200-204`.
- **Defect:** "A burst of anonymous requests costs at most one mint per isolate per minute" holds
  only if concurrent misses share one in-flight mint. A result-only cache lets N concurrent
  requests on a cold slot mint N tokens. The engine's own token cache deliberately refuses to
  cache the in-flight promise, because of the Workers cancellation incident (`signing.ts:95-103`,
  "Two concurrent misses on a cold isolate therefore each mint their own token"). So the obvious
  implementation copies that posture and loses the bound.

  `installationToken` also has no timeout (`signing.ts:66-79`). A hung GitHub hangs `/healthz`,
  and the "GitHub was unreachable" classifier never fires.

  The App's mints share GitHub's secondary limits with publishing. GitHub's rate-limit page says
  "No more than 900 points per minute are allowed for REST API endpoints", and "Most REST API
  `POST`... requests" cost 5 points. That is about 180 mint POSTs a minute. One client firing a few
  hundred concurrent `?live=1` requests could push the App into a secondary limit that also blocks
  editors' publishes.
- **Proposed fold (mechanism, required):**
  - Coalesce misses on one in-flight promise raced against `AbortSignal.timeout` of about 5 s.
    Clear the slot on settle or timeout. A dead promise then expires instead of poisoning the slot,
    which answers the incident doc's concern.
  - Give the mint fetch the same signal.
  - Acceptance adds a concurrent-burst test: N parallel `live=1` calls on a cold slot, one mint.
- **OWNER FORK, whether an anonymous caller may trigger a mint at all:**
  - (a) Public with the coalesced per-isolate cache, the spec's posture with the fix. The
    cross-isolate residual stays and is stated on the page.
  - (b) `live=1` honored only with a header that matches a site secret.
  - (c) Move the live check behind an owner session in `/admin`.

  Recommendation: (a). With coalescing, the residual is one mint per isolate per minute, and an
  uptime monitor can still use it. (b) adds a secret to provision for a rare rotation. (c) loses
  the monitor use case that B5 is built for.

### M7. D1: "one level" misses an allowed shape, and the rewrite misses the scaffold's own gallery

- **Location:** spec `:342-350`.
- **Defect:**
  - `checkContainerNesting` allows `array(object({ image }))` (`fieldset.ts:403-411`: an array
    item may be a flat object whose leaves include `image`). Reaching that image is two hops:
    array item, then object field. "Both readers descend one level into `array` and `object`
    fields" leaves the gallery-with-caption shape invisible to where-used. That keeps the
    data-loss path open.
  - "The replace rewrite edits every `src:` line it finds" fails on the scaffold's own gallery.
    The locator's key pattern is `/^(\s*)src:[ \t]?/` (`media-rewrite.ts:132`). The scaffold
    serializes `array(image)` as a block sequence: `templates/waymark/src/content/posts/2026-01-15-hello.md:20-22`
    reads `gallery:` then `  - src: media:hello-hero.00112233445566aa`. A `- src:` line never
    matches.
- **Proposed fold:** both readers walk every shape the nesting check admits: `image`,
  `object{image}`, `array(image)`, and `array(object{image})`. The `src:` locator admits an
  optional `- ` sequence prefix, and the alt arm's indent accounts for it. Acceptance covers all
  four shapes, and covers a block-sequence `- src:` line in replace and in alt propagation.

## Minors

### m1. Ruling 5 under workerd: the detection mechanism and the `node:fs` import are unspecified

- **Location:** spec `:242-243`.
- **Defect:** the showcase's `wrangler.jsonc` sets no `nodejs_compat`. Wrangler does not fail the
  bundle on a `node:*` import. It marks the import external and warns: "The package ... wasn't
  found on the file system but is built into node. Your Worker may throw errors at runtime unless
  you enable the "nodejs_compat" compatibility flag" (wrangler 4.135 `cli.js:178890-178950`).

  A static `node:fs` import in the dev package would therefore fail the e2e Worker at module load,
  before the handle could throw its friendly message. The existing `node:sqlite` read is dynamic
  for the same reason (`channel-db.ts:45`). Also, `devBackendHandle` is synchronous, so a
  try-the-import probe cannot drive a throw "at construction".
- **Proposed fold:**
  - Detect workerd synchronously with `navigator.userAgent === 'Cloudflare-Workers'`. Node
    reports `Node.js/<v>`.
  - Import `node:fs` dynamically inside the repository read.
  - Resolve paths against `process.cwd()`, which is the Vite root that `npm run dev` runs from,
    and state that this is the root.

  The Node premise itself holds. Adapter-cloudflare 8's dev path is `getPlatformProxy` plus a
  `cloudflare:workers` stub backed by `node:async_hooks` (`index.js:227-255`,
  `src/virtual-cloudflare-workers.js`).

### m2. The lead: `runtime` must be required, or the split class survives

- **Location:** spec `:77-79,136-137`.
- **Defect:** today `createAuthGuard(config: AuthGuardConfig = {})` is all-optional
  (`guard.ts:172`), and the docstring's zero-config form is `createAuthGuard()`. If `runtime`
  stays optional, a bare call attaches `{}` while the sidebar reads the adapter's map. That is the
  same split, so "true by construction" fails. The doctor acceptance line ("keeps failing on a bare
  `createAuthGuard()`") reads as if a bare call stays legal.
- **Proposed fold:** make `runtime` a required member. The doctor's bare-call branch then serves
  older engines only, so say so.

### m3. The lead: hooks importing `cairn.server.ts` pulls in admin construction

- **Location:** spec `:97-100`.
- **Defect:** "The adapter module is already evaluated by every public route" is not the relevant
  fact. The `(site)` pages are prerendered, and only `/media`, `/preview`, `/healthz`, and `/admin`
  import `cairn.server.ts` (git grep over `templates/waymark/src`). Importing it from hooks also
  evaluates `createCairnAdmin(...)` and its startup validation (`content-routes-context.ts:340-356`)
  for every dynamic route: feeds, the sitemap, and `robots.txt`. A composition throw (A13, A14,
  and the access validator) then fails those routes as well as `/admin`.
- **Proposed fold:** either state the wider blast radius as intended (fail loud), or have hooks
  import `runtime` from a module that only composes, with `admin` built in the module the admin
  routes import. Recommend the split. It is a three-line change, and it keeps the claim true.

### m4. Ruling 3 and B5 contradict each other on the route

- **Location:** spec `:189-190` against `:206-209,381-382`.
- **Defect:** "the site's `/healthz` route does not change" conflicts with the route answering
  503. The route builds its own `Response.json(...)` with an implicit 200, and its header comment
  says "Always returns 200 JSON so the response is safe to assert in E2E"
  (`templates/waymark/src/routes/healthz/+server.ts:1-5,15-21`).
- **Proposed fold:** say the route changes: `status: data.ok ? 200 : 503`, plus the comment. Then
  `loadHealth`'s signature is the only thing that stays fixed.

### m5. Ruling 3's classifier needs a structured mint error

- **Location:** spec `:194-195`.
- **Defect:** `installationToken` throws `new Error(\`GitHub installation token failed: ${res.status}\`)`
  (`signing.ts:77`). The classifier would have to parse a message string. A suspended
  installation answers 403, which none of the three classes covers.
- **Proposed fold:** `installationToken` throws a typed error that carries `status`. The classifier
  maps 401 to a refused key, 404 to installation not found, 403 to a suspended installation, and a
  network failure or timeout to unreachable.

### m6. B7's ambient global collides with every existing site's own declaration

- **Location:** spec `:397`.
- **Defect:** the showcase and template `src/app.d.ts:20` already declare
  `declare global { const __CAIRN_DEV_BUILD__: boolean; }`. A tsc 6.0.3 probe declared the same
  global in a package `.d.ts` and in a site file. With `skipLibCheck: true` it exits 0, which is
  the scaffold's setting. With `skipLibCheck` off it fails `TS2451: Cannot redeclare block-scoped
  variable '__CAIRN_DEV_BUILD__'` in both files.
- **Proposed fold:** the same task deletes the declaration from both `app.d.ts` files. The upgrade
  note tells a site to delete its own copy.

### m7. D1 changes manifest output, so "Surface: none" is wrong

- **Location:** spec `:349-350`.
- **Defect:** `manifestEntryFromFile` records `extractMediaRefs`' result as `mediaRefs`
  (`manifest.ts:90`). An entry with a gallery-only asset gains a `mediaRefs` value. The committed
  `index.json` of any site with one goes stale, and `cairnManifest`'s `buildStart` fails the build
  until the site regenerates. The showcase seed escapes only because its gallery reuses the hero's
  hash.
- **Proposed fold:** add `Consumers must: regenerate the manifest with npx cairn-manifest after
  upgrading`, and add a manifest-verify test over a gallery-only fixture.

## Over-ceremony (ranked by cost)

1. **A5 is classed `paint`** (spec `:316-320`). Under the pass-core class table, `paint` brings an
   owner glance, a fresh-context `visual-verifier` read, and the owner sitting. That spends Geoff's
   attended time on one calm-copy `+error.svelte` inside an existing theme wrapper. Fold: class it
   `sweep` with one capture read by the main loop. Keep `paint` only if Geoff wants a sitting.
2. **C5 is classed `auth-data`** (spec `:427`). That class makes pass B's close run the live auth
   smoke (the pass-core table's settle step for `auth-data`). Pass B touches no auth, session, or
   commit code: C5 is a render sanitize floor. Fold: class C5 `engine-logic` and name
   `web-auth-security-reviewer` on it explicitly. Pass B's close then drops the wrangler-dev auth
   smoke.

## Checked and sound

- The lead: no import cycle. `cairn.server.ts` imports only `#theme/cairn.config.js` and the dev
  gate. Nothing in the adapter's graph imports the hooks or the runtime module. Every reader
  already has `runtime.roles` and `runtime.access` (`compose.ts:41-42`). `createEditorRoutes` has
  one engine caller (`cairn-admin.ts:118`).
- The doctor: `createAuthGuardCallPattern` captures `{ runtime }`, so a `\bruntime\b` wired branch
  works (`check_roles.go:55-95`).
- C7: no consumer repository has a route under `src/routes/admin/auth/`, checked with
  `git ls-files` in all five sites. The engine serves only `confirm` there
  (`admin-dispatch.ts:87`).
- C11: the dev double already fails closed on `expectedHead` (`fake-github.ts:761-763`), and the
  ingest path reads the head before the manifest. The five paths can copy that order.
- The fingerprint (Rulings for Geoff, item 2) is feasible with no network call. A Web Crypto probe
  imports the key as extractable, exports it as JWK, re-imports `n` and `e` as a public key, takes
  SHA-256 of the SPKI export, and base64-encodes it. The result equals GitHub's documented
  `openssl rsa -in PATH_TO_PEM_FILE -pubout -outform DER | openssl sha256 -binary | openssl base64`
  on a fresh PKCS#1 key. That needs one extractable import, separate from the signing import.
- The two-pass order holds. Pass B's ruling 2 and ruling 5 build on pass A's hooks and
  dev-handle signature. Doctor task A2 cannot go green before task A1, because
  `check:tool-heuristics` pins the guard signature, so it is sequential, as the spec implies.
  Nothing in pass A depends on pass B.
