---
page: Architecture
type: concept
track: ""
exemplar: core/rust-analyzer-architecture
---

# Architecture

:::reader
**Who reads it.** - **Evaluator.** Svelte-fluent developer comparing cairn with other CMSs. Arrives from the root
  README, `docs/why-cairn.md`, cairn.pub, or a search for "cairn architecture". Knows SvelteKit;
  does not know whether cairn is a hosted service, a separate app, or a library, nor what it
  locks a site into (SvelteKit, Cloudflare, GitHub) or how stable its surface is. Wants: the
  general model first, then what the boundary commits a site to. Reads end to end.
- **Inheritor.** Developer holding a site the setup command scaffolded (the usual path:
  `create-cairn-site` makes the App, repo, bindings, and deploy in one run, `f:kldwss`). Arrives
  from the extend README's "Start" group or from Scaffolded site files. Knows the files exist;
  lacks which of them are engine contracts and which are theirs. Wants: a map from files to
  import points, seams, stores, and the promise an upgrade keeps.
- **Extender in flight.** Arrives by link from a task page (custom admin screen, security model,
  replace magic links) to place one seam in the whole. Wants the seams table and the tiers; the
  intro only has to tell them the page holds the whole picture.

**Background.** - cairn is an embedded CMS: an npm package inside the site's own SvelteKit app, running in the
  site's one Cloudflare Worker, no CMS server (`f:4zpvor`, new `f:j0ut9n`).
- Where SvelteKit fits: the admin and public pages are the site's route files, their load
  functions and actions supplied by the engine's factories (`f:j0ut9n`).
- Where Cloudflare fits: the Worker host, plus D1 for sign-in rows and R2 for media bytes
  (`f:i74t7g`, `f:pgy0mr`).
- Where GitHub fits: content is markdown in git; a publish is a commit through the site's App,
  which triggers the site's existing deploy (`f:djoxr9`, `f:cjonmm`).
- Why the boundary exists: cairn owns content and the admin frame, the rest is the developer's,
  reached through a narrow versioned surface (`f:99f221`, `f:bhyvqg`, `f:gknz29`).

**Place in the doc set.** The extend track's concept anchor, first under "Start". Task pages link here for the whole;
this page links out to them for each seam. Its sibling start page (add cairn by hand) builds the
same model file by file.

**What the page does for them.** The introduction starts from the general model before any part of it. A cairn site is built to
run on Cloudflare Workers; its admin and public pages are SvelteKit route files whose behavior
comes from the engine's factories; content is markdown in the site's git repository, and a
publish is a commit through the site's GitHub App that triggers the site's existing deploy; D1
holds the sign-in rows and R2 the media bytes. Then why the architecture matters: cairn manages
markdown content and the admin frame and leaves everything else to the developer, reached
through a narrow, versioned set of seams, so the line between engine and site decides which
code a site writes and which contracts it relies on across releases.

Two readers arrive, and the introduction names each reason. A developer evaluating cairn
against other content systems reads end to end for what the boundary commits a site to. A
developer taking over a scaffolded site reads to map the files they inherited onto the
engine's entry points, seams, and stores.

A bulleted list then names what the page covers, in page order: the adapter and the runtime
it composes; the files a site touches the engine through and the subpaths they import; the
seams; the path an edit takes from a save to the deploy, how every admin commit meets a moved
head, and how the admin reads content back; where each kind of state lives; the platforms the
engine builds on directly and the contract a replacement content store keeps; and what each stability tier promises across versions. Its
lead-in names the subjects plainly, never as "parts of the boundary". :fact[i74t7g] :fact[3rb362] :fact[cjonmm] :fact[pgy0mr] :fact[bhyvqg] :fact[gknz29]

**What they already know.** The reader is Svelte-fluent and knows SvelteKit routing, load functions, form actions, and
server hooks, and Cloudflare Worker bindings, because the engine builds on both platforms
directly. Git branches and the idea of a GitHub App are assumed at a user's level.
The introduction skips programming basics and states this in one sentence.

**What it leaves to other pages.** A bulleted list under a complete lead-in, subject first and page last, one form per item:
the security properties of each piece (security-model.md); each adapter field
(define-an-adapter-and-schema.md); concepts and fieldsets in depth (content-model.md); each
export's signature (the reference index); the upgrade procedure (upgrade-cairn.md); and the
media store's settings (configure-media.md). The outline's last out-of-scope item, the role
column's former database CHECK constraint, is history rather than a subject a reader looks
for, so it is neither listed here nor stated in the body; the page states only the current
application-layer role check, through the roles subsection.

**How the introduction runs.** 1. Model paragraph, opening on a statement of what cairn is: embedded, npm package in the
   site's SvelteKit app, one Worker; markdown in git, publish = App commit -> deploy; D1 and R2
   hold the rest.
2. Boundary paragraph: the existing three contract sentences (unchanged wording, own facts).
3. Readers paragraph: evaluator's question, inheritor's question (setup command already wired
   it; Scaffolded site files maps each file), each answered by the same subjects; leads into
   the covers list.
4. Covers list, prior-knowledge + out-of-scope list, definition paragraph: unchanged.

:::

## The adapter

- A cairn site declares one adapter, a single `CairnAdapter` object, and every route factory, admin screen, and delivery helper reads its behavior from that object.
- A site declares a single `CairnAdapter` object (typically `src/theme/cairn.config.ts`); every route factory, admin screen, and delivery helper reads its behavior from that one object, and the engine never hard-codes a concept, directory, or field. :fact[4esdoz]
- The adapter is where the line between engine and site is drawn: the engine owns markdown content management and the admin frame, and the functionality, actors, auth, data, and domain logic a site needs beyond that belong to the developer, who hands them to the engine through a thin seam rather than a built-in feature. :fact[bhyvqg] :fact[99f221]
- The governing boundary: cairn owns markdown content management and the editor/admin frame and little else; everything a site needs beyond that (functionality, actors, auth, data, domain logic) belongs to the developer, served through a thin seam, not a built-in feature. Key phrase: "thin seam, not a built-in feature". :fact[bhyvqg]
- cairn is a CMS and an admin toolkit, not a platform; it manages markdown content and the admin frame and stops there deliberately. Key phrase: "not a platform". :fact[99f221]
- The root barrel's `composeRuntime` folds the adapter into one composed runtime. The admin factory, `createCairnAdmin`, closes over that runtime, and the hooks module hands the same runtime to `createAuthGuard` or to the dev backend's `devBackendHandle`, so one declaration on the adapter serves every server handle. :fact[3rb362] :fact[f21bcz] :fact[7cv105]
- `devBackendHandle`'s config takes a required `runtime`, the same composed runtime a site hands `createAuthGuard`, so one declaration serves both handles. It reads only the access map from it: `runtime.access` (or `{}` when the adapter declares none) is attached to `locals.cairnAccess` on every `/admin` request it mints an editor for, and `runtime.roles` is never read, since the handle mints the literal owner capability rather than resolving a role, so the vocabulary changes no authorization decision under the dev backend. Earlier versions took optional `access` and `roles` options of their own. :fact[7cv105]
- The adapter and the runtime it composes reach the engine through a few files in the site.

## Entry points

- A site's adapter module, admin mount, and public routes each import from a different subpath, and its hooks module installs the guard over the same composed runtime.
- A site touches the engine in four places, and they reach different subpaths. The adapter is declared with the root barrel's `defineAdapter` and folded by the root barrel's `composeRuntime` into the runtime that `createCairnAdmin` from `/sveltekit` closes over; the admin mount renders `CairnAdmin` and `CairnAdminShell` from `/admin` over that factory's `load`, `shellLoad`, and `actions`; the public routes call `createPublicRoutes` and the feed, sitemap, and robots responders from `/delivery`; and the hooks module hands the runtime to `createAuthGuard` from `/sveltekit`. :fact[3rb362]
- The scaffold's hooks module picks between `devBackendHandle` and `createAuthGuard` in one `if` whose test reads the build-time `__CAIRN_DEV_BUILD__` define directly and then the runtime opt-in `CAIRN_DEV_BACKEND === '1'`, and exports the result as `handle`; both handles take the composed `runtime` the hooks import from `#chassis/cairn.server.js` (`createAuthGuard({ runtime })` and `devBackendHandle({ runtime })`), where earlier versions took optional `roles` and `access` options and a bare `createAuthGuard()` was valid. The opt-in reads the Worker env first and falls back to `process.env`, since `vite dev` runs the hooks in Node, where the platform proxy's env never carries the shell variable `npm run dev` sets. :fact[f21bcz]
- `createAuthGuard({ runtime })` gates the whole `/admin` subtree before any load runs, but does not decide per-route authorization; that is `requireAccess`/`createSectionAction`'s job. :fact[2sd4if]
- See [../reference/sveltekit.md#createauthguard](../reference/sveltekit.md#createauthguard).
- The `/sveltekit` source reads and writes the content repository through the GitHub Backend (`../github/`), renders through the render pipeline (`../render/`), reads and writes media through the media store (`../media/`), composes entry data through the delivery module for the preview route (`../delivery/public-routes.js`), reads and writes the auth store and crypto helpers (`../auth/`), and imports two helper modules from `../admin/`; the admin Svelte components sit on `/admin`, which receives the loaded data as props. :fact[40pxcq]
- The directive-stamping and dispatch machinery inside the render pipeline, the exact commit tree-operation shape against the GitHub API, and the guard's internal CSRF/session resolution are engine-internal, not seams a site reaches into; each is instead covered by a stability-tiered public surface (`/render`, `/sveltekit`, `/auth-crypto`). :fact[n3cvf9]
- Those files import only part of the export map, and placement rules fix what every subpath in the map may contain.

## Export map

- Most of the export map falls into six functional groups, and a short set of placement rules fixes what each subpath may contain.
- The engine's export map splits into six functional groups: core/adapter (root barrel), the SvelteKit layer (`/sveltekit`), admin UI (`/admin`, `/public`, `/admin-toolkit`, `/islands`), rendering (`/render`), delivery (`/delivery`, `/media`), and auth/platform (`/auth-store`, `/auth-channel`, `/auth-crypto`, `/cloudflare`, `/vite`, `/ambient`). :fact[a7qx4m]
- The engine has no `/components` export subpath: the admin UI is exported on `/admin` (`CairnAdmin`, `CairnAdminShell`, and the rest of the admin screens) and `/admin-toolkit`, a built-in public component such as `PreviewBanner` is exported on `/public`, and `/islands` is the separate client runtime that mounts a site's live components. :fact[bmxw7w]
- The export map holds subpaths that sit in none of the diagram's six boxes: `./delivery/head` and `./delivery/data`, `./reproductions` and `./reproductions/manifest`, `./log`, and the asset exports `./admin-sources.css` and `./cairn-public.css`; the `/log`, `/reproductions`, and `/delivery/data` subpaths each have their own reference page, and `check:reference` fails an undocumented export. :fact[533flu]
- See [../reference/README.md](../reference/README.md).
- Nothing on the root barrel imports SvelteKit, and nothing on `/sveltekit` is a `.svelte` file; a Svelte admin component lives on `/admin`, and a built-in public component on `/public`. :fact[0duu5p]
- The content model runs from a build script with no request in scope: the `cairnManifest` plugin's virtual module imports `formatManifest`, `verifyManifest`, and `verifyReferences` from the root barrel and `buildSiteManifest` from `/delivery/data`, loads the site's adapter from its `configModule`, and builds the manifest inside the app's own Vite graph. The root barrel states its scope as no server route, no Svelte component, and no per-request framework binding. :fact[5uhx5o]
- See [../reference/vite.md#cairnmanifest](../reference/vite.md#cairnmanifest).
- `loadPreview` asks `isBuilding()` at call time, which imports `$app/env` (the SvelteKit 3 module; `$app/environment` survives there only as a deprecated alias) dynamically inside a try/catch and answers `false` when the import rejects, so bundling a `/sveltekit` export (such as `createD1AuditSink` for a Cron Worker) with plain esbuild outside Vite needs no `$app/env` alias. :fact[ppqu4v]
- See [../reference/sveltekit.md#loadpreview](../reference/sveltekit.md#loadpreview).
- The map says where each export lives, and the seams say which of them a site hands its own code or data to.

## Seams

- A site adds a concept, a role, or an admin screen through a seam, and none of the three forks the engine.
- A seam is a documented point where a site supplies code or data that the engine reads.
- Adding a concept is an edit to the adapter's `content` map and adding a role is an edit to its `roles` declaration, while a custom admin screen is a route file under `src/routes/admin/` that SvelteKit resolves ahead of the catch-all, shown in the sidebar through an `editor.navLayout` site entry; none of these forks the engine. :fact[6a32oy]
- Six of the seams a site extends through (the identity resolver and the custom admin route seam are further ones): the adapter's `content` map (`ConceptConfig`/`fieldset`), `render` (built with `createRenderer`), the access map and role vocabulary (`defineAccess`, `defineRoles`), `navLayout`, the Backend interface (`createGithubApp` the only shipped implementation), and `AssetConfig` (media). :fact[i87sd3]
- The table's `identity` row: the optional `identity` option on `createAuthGuard` replaces the built-in sign-in path, not a store. :fact[hk24xs] :fact[4xrx5f]
- `BackendProvider` (documented in the core reference) is the seam for a content backend other than GitHub; `createGithubApp(...)` is the one provider cairn ships today, and none ships besides it. :fact[n1om0r]
- See [content-model.md](content-model.md).
- See [configure-rendering.md](configure-rendering.md).
- See [restrict-admin-access.md](restrict-admin-access.md).
- See [replace-magic-links-with-cloudflare-access.md](replace-magic-links-with-cloudflare-access.md).
- See [add-a-custom-admin-screen.md](add-a-custom-admin-screen.md).
- See [arrange-the-admin-sidebar.md](arrange-the-admin-sidebar.md).
- See [configure-media.md](configure-media.md).
- See [../reference/core.md#types](../reference/core.md#types).
- Two of these seams, the role vocabulary and the access map, are read by several parts of the engine at once.

### Roles and the access map

- A site declares its role vocabulary and its access map once, on the adapter, and every reader of either takes it from the composed runtime.
- Vocabulary defined once for the whole extend track: Concept, Adapter, Render, Seam, Island, Holding branch (`cairn/<concept>/<id>`), Manifest, Role/capability (role is a site-defined name; capability is one of `none`/`editor`/`owner`). :fact[3pposq]
- A site declares its access map once, as the adapter's `access` member; `composeRuntime` carries it onto the runtime, and `createAuthGuard({ runtime })` attaches `runtime.access ?? {}` to `locals.cairnAccess` on every admin path where it signs an editor in, so there is no second copy to pass to the guard. Earlier versions took the map as a separate `access` option on the guard, and the same `access` value had to be passed to both it and the adapter's `access` member. :fact[iwf4nu]
- `createAuthGuard` takes one bag with a required `runtime` (the composed runtime, no default), `includeSubDomains`, and `identity`; it reads the declared role vocabulary from `runtime.roles` (defaulting to the owner and editor pair) and the access map from `runtime.access`, and on every guarded request it sets `event.locals.cairnAccess = runtime.access ?? {}` beside `event.locals.cairnEditor`. `devBackendHandle` takes the same required `runtime` and attaches the same `runtime.access ?? {}`. :fact[gun084]
- The engine's own screens, their write actions, and the sidebar read the adapter's `access` member through the composed runtime, and `requireAccess` and `createSectionAction` read the same map from `event.locals.cairnAccess`, which the guard (and the dev backend's handle) set to `runtime.access ?? {}`; the adapter's `access` member is the one declaration every reader sees. Earlier versions took the guard's map as its own `access` option, so a map passed only to the hook handles, as the scaffold's `src/hooks.server.ts` did, gated the site's own routes and left every engine screen open to any editor-capability session until the adapter carried the map too; that split cannot arise now. :fact[cvzb8z]
- Because the engine's own screens and a site's own routes read one declaration, the two cannot be gated by different maps. :fact[cvzb8z]
- `createEditorRoutes(config)` takes `EditorRoutesConfig`, whose one member `runtime` is the composed runtime, required with no default; the routes read `runtime.roles`, the site's declared role vocabulary (see `defineRoles`): the add and role-change actions validate the posted role against it, and a posted role it does not declare is refused. When the adapter declares no roles the routes validate and resolve against the implicit owner/editor pair (`DEFAULT_ROLES`), so a zero-config site sees no behavior change. The admin mount (`createCairnAdmin`) forwards its own runtime, so a site that mounts the admin sets the vocabulary once on the adapter and passes `runtime` itself only when it wires `createEditorRoutes` by hand. :fact[mbx6q1]
- `createAuthGuard(config)` takes a required `runtime`, the composed runtime with no default, and optional `includeSubDomains` and `identity`; it reads the declared role vocabulary (`roles`) from `runtime.roles` and the declared access map (`access`) from `runtime.access`, so a call that passes no `runtime` is a type error. Earlier versions took optional `roles` and `access` options and resolved a bare `createAuthGuard()` against the implicit owner/editor pair; a runtime whose adapter declares no roles still resolves every session that way. :fact[4xrx5f]
- What an editor is allowed to do decides which admin actions run, and every action that changes content travels one path to the live site.

## Write path

- An edit reaches the live site through a save onto a holding branch, a publish that copies the branch onto the default branch, and the deploy that the publish commit triggers.
- The write path: an editor's save commits to a per-entry holding branch named `cairn/<concept>/<id>` through the site's GitHub App installation token, with the signed-in editor as commit author and no committer set, so GitHub records the App's bot identity as the committer (see `f:5f4kmk`); a separate Publish action copies that branch's content onto the default branch, which triggers the site's existing deploy. :fact[cjonmm]
- A save holds on a per-entry branch; a deliberate publish copies it to the main branch with the editor as commit author. :fact[qehbx3]
- cairn places each kind of state by what reads it: editor-authored content and both manifests are committed files in git; D1 holds auth and operational rows, the `session` row the guard looks up by its session-cookie id on each admin request (joined to its `editor` row by email) and the `magic_token` rows sign-in looks up by SHA-256 hash, plus the opt-in `audit_log` and `preview_tokens`, and never an entry body; R2 holds media bytes that the delivery route streams directly. :fact[pgy0mr]
- One diagram of the write path and the three data tiers, topology only, no branding: an editor's save lands on the `cairn/<concept>/<id>` holding branch through the GitHub App, a publish copies it to the default branch, and the deploy rebuilds the manifest; D1 and R2 sit beside git with what each holds. The caption names Data tiers as the section that states what each store holds. The diagram makes no claim about retries or guards.
- The path starts where an editor saves.

### The holding branch

- A save commits the edit to a per-entry branch named `cairn/<concept>/<id>` through the site's GitHub App installation token, with the signed-in editor as author and no committer set.
- The write path: an editor's save commits to a per-entry holding branch named `cairn/<concept>/<id>` through the site's GitHub App installation token, with the signed-in editor as commit author and no committer set, so GitHub records the App's bot identity as the committer (see `f:5f4kmk`); a separate Publish action copies that branch's content onto the default branch, which triggers the site's existing deploy. :fact[cjonmm]
- A pending entry is the existence of its `cairn/<concept>/<id>` branch and nothing else; each save commits onto that same branch, so an editor iterates across saves, and the concept list finds the pending entries by listing branches under `cairn/<concept>/`, so the admin shows what is pending without it being live. :fact[5kerxw]
- The content manifest is rebuilt at build time, and the `cairnManifest` plugin verifies it against the markdown on disk in `buildStart`; it is patched only in a commit to the default branch that changes an entry (a publish, a publish-all, a delete, or a rename), each landing the manifest change together with the entry files, while a save to the pending branch commits no manifest change. :fact[e69d0l]
- The branch holds the edit until a deliberate publish.

### The publish commit

- A publish copies the holding branch's content onto the default branch as one fresh commit, with the editor as author, and the entry's manifest row lands in the same commit.
- Every save and every publish is a git commit with the signed-in editor as author, with no audit table involved. A publish is a fresh commit on the default branch carrying the entry file and the manifest, never a merge of the holding branch, and the holding branch is deleted once that commit lands with the branch head unmoved, so the default branch's history records who published each change and when, never each intermediate save. :fact[70mf58]
- Every publish is a commit with the editor as author and no committer set, so GitHub attributes the commit to the App. :fact[w379wu]
- The content manifest is rebuilt at build time, and the `cairnManifest` plugin verifies it against the markdown on disk in `buildStart`; it is patched only in a commit to the default branch that changes an entry (a publish, a publish-all, a delete, or a rename), each landing the manifest change together with the entry files, while a save to the pending branch commits no manifest change. :fact[e69d0l]
- A publish is head-guarded: it reads the default branch's head before its first read of the media manifest or the content manifest and commits with that head as `expectedHead`, so a commit that lands after those reads refuses the publish with "Your edits are saved. Publish again." while the entry stays held on its branch, and a default branch with no head refuses the same way. This is the guarantee the step creates. :fact[0gihxq]
- Publish-all commits every pending entry the editor can reach, plus the content manifest, as one commit to the default branch titled 'Publish N entries' (or 'Publish 1 entry'), so one deploy fires. :fact[0oyrh6]
- After a publish lands, the engine deletes the entry's pending branch only when the branch head still equals the sha the publish captured, so a save that lands during the publish keeps the entry pending. :fact[0xxou5]
- The publish is one of many commits the admin makes against a branch that another editor may have moved.

### Concurrent writes

- Every commit the admin makes meets a moved head under one of two rules: a head-merge retry, or a head guard that fails on the first stale head.
- Entry save and entry delete and rename use the head-merge retry (three retries after the first attempt, then a conflict), while single publish, publish-all, the nav, tidy-settings, vocabulary, media upload manifest, media delete (single and bulk), media metadata update, media replace, media alt propagation, personal-dictionary add, and revert commits are head-guarded and fail on the first stale head. Each head-guarded media commit reads `branchHead(defaultBranch)` before its first read of `media.json`, the content manifest, or an entry file, answers a conflict or a missing head with its own message (`MANIFEST_CONFLICT_MESSAGE` for delete and metadata update, `CONTENT_CONFLICT_MESSAGE` for replace and alt), and a media delete that conflicts leaves the R2 object in place. The dictionary add retries once after a conflict, re-reading the head and the file. Single publish reads `branchHead(defaultBranch)` before its first read of `media.json` or the content manifest (inside the save half it shares with Save), and publish-all reads it before the content manifest; each commits with it as `expectedHead`, so a commit landing after those reads answers the calm conflict ("Your edits are saved. Publish again." for single publish, `?error=publish_conflict` for publish-all) with the entry still held on its branch, and a default branch with no head refuses the same way without a main commit. :fact[0gihxq]
- A guarded commit reads the head before any file its new contents are computed from, so a commit that lands in between makes it refuse rather than overwrite what it never read. :fact[0gihxq]
- A commit that lands on the default branch then starts the site's deploy.

### Build verification

- The publish commit triggers the site's existing deploy, and the build rebuilds the content manifest and verifies it against the markdown on disk.
- The content manifest is rebuilt at build time, and the `cairnManifest` plugin verifies it against the markdown on disk in `buildStart`; it is patched only in a commit to the default branch that changes an entry (a publish, a publish-all, a delete, or a rename), each landing the manifest change together with the entry files, while a save to the pending branch commits no manifest change. :fact[e69d0l]
- See [../reference/vite.md#cairnmanifest](../reference/vite.md#cairnmanifest).
- The admin reads content back from the two places the path writes it, the holding branches and the default branch.

## Read path

- The admin reads one entry from a concurrent batch of reads through the `Backend`, and it reads the whole corpus from the committed content manifest.
- The admin reads content two ways: an entry's edit load and history load assemble one entry's view from a concurrent batch of GitHub reads of the file itself, its pending branch head, the committed manifest, and the media manifest, all through the Backend; corpus-wide admin facts, the concept list, inbound links, reference and media usage, and the link check on save, read the committed content manifest from the default branch through the Backend instead of crawling entry files. :fact[cng7dr]
- That manifest is one kind of state the engine keeps in git, and git is one of three places the engine keeps state.

## Data tiers

- The engine keeps state in three tiers, git, D1, and R2, and places each kind of state by what reads it.
- cairn places each kind of state by what reads it: editor-authored content and both manifests are committed files in git; D1 holds auth and operational rows, the `session` row the guard looks up by its session-cookie id on each admin request (joined to its `editor` row by email) and the `magic_token` rows sign-in looks up by SHA-256 hash, plus the opt-in `audit_log` and `preview_tokens`, and never an entry body; R2 holds media bytes that the delivery route streams directly. :fact[pgy0mr]
- Three data tiers: Git (content entries, content manifest, media manifest, keyed by concept/id or content-hash prefix), D1 (`editor`/`magic_token`/`session` baseline plus `audit_log`/`preview_tokens` opt-in, keyed by email for `editor`, a SHA-256 token hash for `magic_token` and `preview_tokens`, a random session id stored as-is for `session`, and an integer row id for `audit_log`), R2 (uploaded media bytes, keyed by content hash, deduplicated). :fact[b6gquz]
- R2 holds media bytes because git does not carry binary assets at real scale and D1 is not sized for anything measured in megabytes; both manifests (content and media) stay committed JSON under `src/content/.cairn/`, and only the bytes they describe live in R2. :fact[lu67dk]
- The media manifest is keyed by a 16-hex content-hash prefix and is the dedup lookup an ingest checks before writing anything, distinct from the content manifest, which keys by concept and id. :fact[4t707i]
- No table in the five migrations stores an entry body, and a manifest row carries an entry's title, permalink, summary, links, and edges but never its body, so no copy of a body exists outside git. :fact[6ign7q]
- Every save and every publish is a git commit with the signed-in editor as author, with no audit table involved. A publish is a fresh commit on the default branch carrying the entry file and the manifest, never a merge of the holding branch, and the holding branch is deleted once that commit lands with the branch head unmoved, so the default branch's history records who published each change and when, never each intermediate save. :fact[70mf58]
- `audit_log` (`0002_audit.sql`) holds one row per audited admin action (`actor`/`action`/`entity`/`entity_id`/`detail`), timestamped in ISO 8601 at millisecond resolution, written only by a site that wires `createD1AuditSink`. :fact[wnvqlz]
- `preview_tokens` (`0003_preview.sql`) holds a hashed, single-use-per-link token naming the shared draft, swept on expiry the same no-cron way `magic_token` is; written only by a site that mints preview links. :fact[dtwvtz]
- See [security-model.md](security-model.md).
- See [../reference/auth-store.md](../reference/auth-store.md).
- See [configure-media.md](configure-media.md).
- A site's own extension data (a member roster, an event schedule) is unconstrained by cairn's own three tiers, beyond the reserved `cairn_` cookie and table-naming conventions. :fact[qrwncf]
- Each of these stores is a platform the engine depends on outright, and only the content store has a seam that replaces it.

## Hard dependencies

- The engine builds on SvelteKit and Cloudflare directly, so a production site built on cairn runs on Cloudflare Workers.
- A cairn site is built to run on Cloudflare Workers: the engine's environment contract is Cloudflare Worker bindings (the `AUTH_DB` D1 database, the Email Sending binding), so a production site built on cairn is hosted on Cloudflare. :fact[i74t7g]
- The admin and the public pages are SvelteKit route files over the engine's `/sveltekit` and `/delivery` factories, so SvelteKit is the framework every entry point assumes. :fact[3rb362] :fact[40pxcq]
- See [../reference/supported-toolchain.md](../reference/supported-toolchain.md).
- cairn has no host abstraction layer: the engine's environment contract is typed to Cloudflare bindings, so swapping Cloudflare for another host is not a seam. The one swappable storage seam is the content store (the `identity` option on `createAuthGuard` replaces the sign-in path, not a store): a developer can implement `BackendProvider` against a store other than GitHub, and `createGithubApp` is the only implementation cairn ships. :fact[hk24xs]
- `BackendProvider` (documented in the core reference) is the seam for a content backend other than GitHub; `createGithubApp(...)` is the one provider cairn ships today, and none ships besides it. :fact[n1om0r]
- A replacement content store keeps one contract, the interface every provider connects a route to.

## Backend contract

- A `BackendProvider` connects to a live `Backend` for a route that needs one, and the `Backend` interface fixes the semantics every provider keeps.
- A `BackendProvider` carries a `kind` tag and the default `branch` and connects with `connect(env)`, which returns a live `Backend` for a route that needs one; `createGithubApp(...)` is the one provider cairn ships, returning a provider whose `connect` mints and caches the installation token lazily. :fact[gcd8h7]
- The `Backend` interface contract: `commit` with `expectedHead` makes one attempt and throws `CommitConflictError` on a head mismatch, while omitting `expectedHead` keeps the head-merge retry; `readFile` returns null for a missing path; `listCommits` returns an empty array rather than throwing for a missing file; `createBranch` returns the sha it branched at and throws `BranchExistsError` on a name collision; `deleteBranch` treats a missing branch as success. :fact[025q6u]
- `expectedHead` is the provider-level form of the head guard that a publish and the admin's other guarded commits take, and its absence is the retry that a save and an entry delete or rename take. :fact[025q6u] :fact[0gihxq]
- See [../reference/core.md#types](../reference/core.md#types).
- See [../reference/core.md#error-classes](../reference/core.md#error-classes).
- The contract is one exported surface among many, and each surface carries a stability tier.

## Stability tiers

- Every export carries one of three stability tiers, and the tier states what the export promises across versions.
- The engine defines three export stability tiers: Extension API, Scaffold API (both frozen contracts), and Unstable API (importable today, no promise across minors). :fact[c1ujrl]
- See [../reference/README.md#stability-tiers](../reference/README.md#stability-tiers).
- cairn is pre-1.0, so the stability tiers are a target discipline and an Extension-tier break can ship in a minor release. :fact[549u00]
- The seams form a narrow, versioned public surface across kind-based export subpaths, held by a public-surface snapshot gate plus gated Extension-API/Scaffold-API stability tiers; until 1.0 the gate detects and discloses a break rather than preventing one. Key phrase: "every break is disclosed". :fact[gknz29]
- The nav fields on `AdminShellData` and `navFilter`'s parameter/return types changed shape at `0.86.0` (the version `navLayout` shipped), and `navLayout`'s own types were renamed at `0.94.0` (`AdminNavEntry` folded into `NavLayoutEntry`), both breaking changes inside the documented Extension API tier despite the stability promise. :fact[zm9tp4]
- See [migration-notes.md#0860](migration-notes.md#0860).
- See [migration-notes.md#0940](migration-notes.md#0940).
- Code a site writes against the Extension tier therefore meets each break as a named change. :fact[gknz29]
- See [upgrade-cairn.md](upgrade-cairn.md).

## Related resources

- The following resources build on this architecture, take one part of it in depth, or document the platforms the engine builds on.
- The following guides build a site on these seams.
- See [add-cairn-to-a-sveltekit-app.md](add-cairn-to-a-sveltekit-app.md).
- See [define-an-adapter-and-schema.md](define-an-adapter-and-schema.md).
- See [restrict-admin-access.md](restrict-admin-access.md).
- See [add-a-custom-admin-screen.md](add-a-custom-admin-screen.md).
- See [upgrade-cairn.md](upgrade-cairn.md).
- See [migration-notes.md](migration-notes.md).
- The following pages take one part of the architecture in more depth.
- See [scaffolded-site-files.md](scaffolded-site-files.md).
- See [content-model.md](content-model.md).
- See [security-model.md](security-model.md).
- The following external pages document the platforms the engine builds on.
- See [https://svelte.dev/docs/kit/routing](https://svelte.dev/docs/kit/routing).
- See [https://svelte.dev/docs/kit/load](https://svelte.dev/docs/kit/load).
- See [https://svelte.dev/docs/kit/form-actions](https://svelte.dev/docs/kit/form-actions).
- See [https://developers.cloudflare.com/workers/runtime-apis/bindings/](https://developers.cloudflare.com/workers/runtime-apis/bindings/).
- See [https://docs.github.com/en/apps/overview](https://docs.github.com/en/apps/overview).
