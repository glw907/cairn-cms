---
page: Architecture
type: concept
track: extend
exemplar: core/rust-analyzer-architecture
---

# Architecture

:::reader
**Who reads it.** A Svelte-fluent web developer, in one of three situations:
- An evaluator comparing cairn with other content systems, who arrives from the root README, `docs/why-cairn.md`, cairn.pub, or a search and reads end to end. They don't yet know whether cairn is a hosted service, a separate app, or a library, or what it commits a site to.
- A developer taking over a site that `create-cairn-site` set up, which created the GitHub App, the repository, and the Cloudflare bindings and deployed the site in one run. They know the files exist and want to know which ones rest on an engine contract. :fact[kldwss]
- A developer partway through a task page, such as adding a custom admin screen or replacing magic links, who follows a link here to see where one seam sits in the whole.

**Why they arrive:**
- To learn what cairn is, and what adopting it commits a site to, before choosing it.
- To map the files of an inherited site onto the engine's entry points, seams, and stores.
- To place one seam among the rest.

**What they already know.** SvelteKit routing, load functions, form actions, and server hooks; Cloudflare Worker bindings; and git branches and GitHub Apps at a user's level. The introduction says in one sentence that the page assumes this, and it explains no programming basics.

**What the page does for them:**
- It opens on what cairn is: the engine ships as the npm package `@glw907/cairn-cms`, a site's admin and public pages are route files in its SvelteKit app whose load functions and actions come from the engine's factories, and the app builds into one Cloudflare Worker, so no separate CMS server runs. :fact[j0ut9n]
- It says where GitHub fits: content is markdown in the site's repository, and a publish is a commit through the site's GitHub App that the site's existing deploy picks up. :fact[cjonmm]
- It says where Cloudflare fits beyond the Worker: a D1 database holds the sign-in rows, and an R2 bucket holds media bytes. :fact[i74t7g] :fact[pgy0mr]
- It says why the architecture matters to a site: one adapter declaration drives the engine, a site extends the engine through seams without forking it, and each export's stability tier states what it promises across versions. Together these decide which code a site writes and which contracts it relies on. :fact[4esdoz] :fact[6a32oy] :fact[c1ujrl]
- It names each reader's reason for arriving, and it points the developer who inherited a scaffolded site to Scaffolded site files for the file-by-file map.
- It lists what the page covers, in page order, under a lead-in that names the subjects plainly: the adapter and the runtime it composes; the files that reach the engine and the subpaths they import; the seams; the path an edit takes from a save to the deploy, and how the admin reads content back; where each kind of state lives; the platforms the engine builds on and the contract a replacement content store keeps; and what each stability tier promises.

**What it leaves to other pages:**
- The security properties of each piece, in Security model.
- Declaring the adapter field by field, in Define an adapter and schema.
- Concepts and fieldsets in depth, in Content model.
- Each export's signature, in the reference index.
- The upgrade procedure, in Upgrade cairn.
- The media store's settings, in Configure media.

**Background.** Several facts this page cites carry a clause on how earlier versions worked. The page states each design as it is now and leaves the history to Upgrade cairn and the migration notes. It states no count of the seams and no version range for the peer dependencies, claims nothing about what a head-merge retry keeps of a concurrent commit, and never says a publish is the only action that deletes a holding branch. Each section's last line is its hand-off, the closing sentence of its final paragraph. The diagram in the write path is the mermaid figure the current page carries, kept and changed only where a fact placed here changes a claim it makes.
:::

## The adapter

*Set out the premise the rest of the page builds on: one adapter declaration, composed into one runtime that every server handle reads.*

- A cairn site declares one adapter, a single `CairnAdapter` object, and every route factory, admin screen, and delivery helper reads its behavior from it. The adapter declares every concept, content directory, and field. The engine keeps a few names of its own, such as the manifest paths under `src/content/.cairn/` and the segments its admin screens own under `/admin`, which no concept id may take. :fact[4esdoz]
- The root barrel's `composeRuntime` folds the adapter into one composed runtime. `createCairnAdmin` closes over that runtime, and the site's hooks module hands the same runtime to `createAuthGuard`, or, under the dev backend, to `devBackendHandle` from the `@glw907/cairn-cms-dev` package. :fact[3rb362] :fact[f21bcz] :fact[7cv105]
- A role vocabulary or an access map declared once on the adapter therefore reaches every handle that reads it. :fact[7cv105] :fact[gun084]
- The adapter and its runtime reach the engine through a few files in the site.

## Entry points

*Name each file in a site that reaches the engine and the subpath it imports, then say what runs behind those calls and what stays inside the engine.*

- A site reaches the engine in four places: the adapter module, the admin mount, the public routes, and the hooks module. Between them they import the root barrel, `/media`, `/sveltekit`, `/admin`, and `/delivery`. A list names each place and what it imports. :fact[3rb362]
- The adapter module declares the adapter with `defineAdapter` from the root barrel and builds its media resolver from `/media`, and `composeRuntime` folds it into the runtime that `createCairnAdmin` from `/sveltekit` closes over. :fact[3rb362]
- The admin mount renders `CairnAdmin` and `CairnAdminShell` from `/admin` over that factory's `load`, `shellLoad`, and `actions`. :fact[3rb362]
- The public routes call `createPublicRoutes` and the feed, sitemap, and robots responders from `/delivery`. :fact[3rb362]
- The hooks module chooses between `devBackendHandle` and `createAuthGuard` from `/sveltekit` in one `if`, hands either one the composed runtime, and exports the result as `handle`. :fact[f21bcz] :fact[3rb362]
- The guard gates the whole `/admin` subtree before any load runs. It leaves each route's authorization to `requireAccess` and `createSectionAction`. :fact[2sd4if]
- See [the `createAuthGuard` reference](../reference/sveltekit.md#createauthguard).
- Behind those calls, the `/sveltekit` layer reads and writes the content repository through the `Backend`, renders through the render pipeline, and reads and writes the media store and the auth store. The admin's Svelte components on `/admin` receive what that layer loads as props. :fact[40pxcq]
- The render pipeline's directive stamping and dispatch, the commit tree shape sent to the GitHub API, and the guard's CSRF and session resolution are engine-internal. Each sits behind a stability-tiered subpath, `/render`, `/sveltekit`, or `/auth-crypto`, and none is a seam a site reaches into. :fact[n3cvf9]
- Those files import part of the export map, and placement rules fix what every subpath in the map may hold.

## Export map

*Show the whole export map as functional groups, then give the placement rules that fix what each subpath may hold and the two consequences a site meets.*

- Most of the export map falls into six functional groups, and a table lists each group with its subpaths: core and adapter (the root barrel), the SvelteKit layer (`/sveltekit`), admin and public UI (`/admin`, `/public`, `/admin-toolkit`, and `/islands`), rendering (`/render`), delivery (`/delivery` and `/media`), and auth and platform (`/auth-store`, `/auth-channel`, `/auth-crypto`, `/cloudflare`, `/vite`, and `/ambient`). :fact[a7qx4m]
- In the UI group, `/islands` is the separate client runtime that mounts a site's live components. :fact[bmxw7w]
- The map also holds subpaths outside the six groups: `/delivery/head`, `/delivery/data`, `/reproductions`, `/reproductions/manifest`, `/log`, the style sheets `/admin-sources.css` and `/cairn-public.css`, and `./package.json`. :fact[533flu]
- See [the reference index](../reference/README.md).
- The map follows three placement rules, which a list states.
- Nothing on the root barrel imports SvelteKit. :fact[0duu5p]
- Nothing on `/sveltekit` is a `.svelte` file. :fact[0duu5p]
- Admin components live on `/admin` and built-in public components on `/public`, and no `/components` subpath exists. :fact[0duu5p] :fact[bmxw7w]
- The root barrel carries no server route, no Svelte component, and no per-request framework binding. A build script can therefore import it with no request in scope, as the `cairnManifest` plugin does inside the app's Vite graph. :fact[5uhx5o]
- See [the `cairnManifest` reference](../reference/vite.md#cairnmanifest).
- A `/sveltekit` export bundled with plain esbuild outside Vite, such as `createD1AuditSink` in a Cron Worker, needs no alias for `$app/env`. `loadPreview`, on the same subpath, imports that module dynamically at call time. :fact[ppqu4v]
- See [the `loadPreview` reference](../reference/sveltekit.md#loadpreview).
- The map says where each export lives, and the seams say which exports take a site's own code or data.

## Seams

*Define a seam, then give each seam one table row that names what a site supplies through it and the page that documents it.*

- A site adds a concept, a role, or an admin screen through a seam, and none of the three forks the engine. A concept is an edit to the adapter's `content` map, a role is an edit to its `roles` declaration, and a custom admin screen is a route file under `src/routes/admin/`. :fact[6a32oy]
- A seam is a documented point where a site supplies code or data that the engine reads.
- A table lists each seam, what a site supplies through it, and the page that documents it.
- The `content` map: a `ConceptConfig` for each concept, whose `fields` member holds the fieldset built with `defineFieldset`, documented in Content model. :fact[i87sd3]
- `render`, in the adapter's `rendering` group: a renderer built with `createRenderer`, documented in Configure rendering. :fact[i87sd3]
- Roles and the access map: a role vocabulary in which each role the site names maps to one capability, `none`, `editor`, or `owner`, and an access map that narrows what an editor capability reaches and can admit a `none` role only through a route rule that names it, documented in Restrict admin access. :fact[3pposq] :fact[p1xmp5] :fact[i87sd3]
- The `identity` option on `createAuthGuard`: the site's own gate proves the editor's email in place of the built-in sign-in path, and the guard still looks that email up in the roster, documented in Replace magic links with Cloudflare Access. :fact[fhit7f] :fact[hk24xs]
- Custom admin routes: a route file under `src/routes/admin/`, which SvelteKit resolves ahead of the `[...path]` catch-all and which renders inside the `CairnAdminShell` chrome through the shared admin layout with no registration, documented in Add a custom admin screen. :fact[03zj56] :fact[brfitv] :fact[6a32oy]
- `navLayout`: a site entry under `editor.navLayout` that lists a custom screen in the sidebar, documented in Arrange the admin sidebar. :fact[i87sd3] :fact[6a32oy]
- `media`: an `AssetConfig` for the media store, documented in Configure media. :fact[i87sd3]
- `BackendProvider`: a content backend other than GitHub, with `createGithubApp` the one provider the engine ships, documented in the core reference's types table. :fact[n1om0r] :fact[i87sd3]
- See [Content model](content-model.md).
- See [Configure rendering](configure-rendering.md).
- See [Restrict admin access](restrict-admin-access.md).
- See [Replace magic links with Cloudflare Access](replace-magic-links-with-cloudflare-access.md).
- See [Add a custom admin screen](add-a-custom-admin-screen.md).
- See [Arrange the admin sidebar](arrange-the-admin-sidebar.md).
- See [Configure media](configure-media.md).
- See [the core reference's types table](../reference/core.md#types).
- Two of these seams, the role vocabulary and the access map, have several readers inside the engine.

### Roles and the access map

*Show that a site declares its role vocabulary and its access map once, on the adapter, and that every reader of either takes it from the composed runtime.*

- The access map is the adapter's `access` member, and `composeRuntime` carries it onto the runtime beside the role vocabulary. A site has no second copy to pass to the guard. :fact[iwf4nu]
- On every admin path where it signs an editor in, `createAuthGuard` reads the vocabulary from `runtime.roles` and sets `locals.cairnAccess` to the runtime's map, beside `locals.cairnEditor`. With no roles declared on the adapter, it falls back to the owner and editor pair. `devBackendHandle` attaches the same map. :fact[iwf4nu] :fact[gun084]
- The engine's own screens, their write actions, and the sidebar read the map through the runtime, and `requireAccess` and `createSectionAction` read the same map from `locals.cairnAccess`. :fact[cvzb8z]
- Because the engine's screens and a site's own routes read one declaration, the two cannot be gated by different maps. :fact[cvzb8z]
- The roster screen's routes validate a posted role against `runtime.roles`. The admin mount forwards its runtime to them, and a site passes `runtime` itself only when it wires `createEditorRoutes` by hand. :fact[mbx6q1]
- The guard's `runtime` option is required and has no default: a call without it is a type error. :fact[4xrx5f]
- The access map decides which admin actions an editor can run, and every action that changes content travels one path to the live site.

## Write path

*Follow one edit from a save to the live site, and state each guarantee at the step that creates it.*

- An edit reaches the live site in three steps: a save commits it onto a holding branch, a publish copies the branch onto the default branch, and the publish commit triggers the site's existing deploy. :fact[cjonmm] :fact[qehbx3]
- The path crosses three stores. Git holds the edit and both manifests, D1 holds the session row the guard checks on each admin request, and R2 holds media bytes. :fact[pgy0mr]
- A diagram shows the path and the three stores, as topology only: a save lands on the `cairn/<concept>/<id>` holding branch through the GitHub App, a publish copies it to the default branch, and the deploy rebuilds the manifest, with D1 and R2 beside git. Its caption names Data tiers as the section that says what each store holds, and it makes no claim about retries or guards. :fact[cjonmm] :fact[pgy0mr] :fact[e69d0l]
- The path starts where an editor saves.

### The holding branch

*Say what a save commits and where, and that nothing a save does reaches the live site.*

- A save commits the edit to a per-entry branch named `cairn/<concept>/<id>` through the site's GitHub App installation token, with the signed-in editor as author. :fact[cjonmm]
- The engine sets no committer, and GitHub records the App's bot identity in its place. :fact[cjonmm] :fact[w379wu]
- Each later save commits onto the same branch, so an editor can save many times while the entry stays off the live site. :fact[5kerxw]
- An entry is pending while its holding branch exists, and no other state marks it. The concept list finds pending entries by listing the branches under `cairn/<concept>/`. :fact[5kerxw]
- A save commits no change to the content manifest. :fact[e69d0l]
- The branch holds the edit until a deliberate publish.

### The publish commit

*Say what a publish commits to the default branch, the guard it commits under, and when the holding branch goes away.*

- A publish copies the holding branch's content onto the default branch as one fresh commit, never a merge of the branch. The editor is the author, and the entry's content-manifest row lands in the same commit. :fact[70mf58] :fact[w379wu] :fact[e69d0l]
- The content manifest changes only in a default-branch commit that changes an entry: a publish, a publish-all, a delete, or a rename, each landing the manifest change with the entry files. :fact[e69d0l]
- A publish is head-guarded. It reads the default branch's head before it reads the media manifest or the content manifest, and it commits with that head as `expectedHead`. :fact[0gihxq]
- When a commit lands after those reads, the publish is refused with "Your edits are saved. Publish again." and the entry stays held on its branch. A default branch with no head refuses the same way. :fact[0gihxq]
- Publish-all commits every pending entry the editor can reach, plus the content manifest, as one commit to the default branch, and one deploy fires. It takes the same guard, and a stale head returns the editor to the list with `?error=publish_conflict`. :fact[0oyrh6] :fact[0gihxq]
- After a publish lands, the engine deletes the holding branch only when the branch head still equals the SHA the publish captured, so a save that lands during the publish keeps the entry pending. :fact[0xxou5]
- The publish is one of many commits the admin makes against a branch that another editor may have moved.

### Concurrent writes

*Sort every commit the admin makes by the rule it follows when another commit has moved the branch head.*

- Every commit the admin makes meets a moved head under one of two rules, which a two-item list states. :fact[0gihxq]
- The head-merge retry, which tries three more times after the first attempt before it reports a conflict, covers an entry save and an entry delete or rename. :fact[0gihxq]
- The head guard, which fails on the first stale head, covers single publish, publish-all, the nav, tidy settings, the vocabulary, the media upload manifest, media delete (single and bulk), media metadata updates, media replace, media alt propagation, the personal-dictionary add, and revert. :fact[0gihxq]
- A guarded commit reads the head before any file its new contents are computed from. A commit that lands in between makes it refuse, rather than overwrite what it never read. :fact[0gihxq]
- A media delete that conflicts leaves the R2 object in place. The personal-dictionary add retries once after a conflict, re-reading the head and the file. :fact[0gihxq]
- A commit that lands on the default branch then starts the site's deploy.

### Build verification

*Say what the deploy's build checks before a published edit goes live.*

- The publish commit triggers the site's existing deploy, and the build rebuilds the content manifest from the markdown on disk and verifies it against the committed manifest. :fact[cjonmm] :fact[e69d0l]
- The `cairnManifest` plugin runs that check in `buildStart`, and a committed manifest that has drifted from the markdown fails the build. :fact[n0laoh] :fact[5uhx5o]
- See [the `cairnManifest` reference](../reference/vite.md#cairnmanifest).
- The admin reads content back from the two places the path writes it, the holding branches and the default branch.

## Read path

*Say how the admin reads one entry, and how it reads the whole corpus without crawling entry files.*

- The admin reads one entry from a concurrent batch of reads through the `Backend`, and it reads the whole corpus from the committed content manifest. :fact[cng7dr]
- An entry's edit load batches the file on the default branch, its holding branch's head, the committed content manifest, the media manifest when media is on, and the personal dictionary. Its history load batches the file's commit log, the holding branch's head, the file, and the default branch's head. :fact[cng7dr]
- The concept list, inbound links, reference and media usage, and the link check on save read the default branch's entries from its content manifest instead of crawling the entry files. The usage indexes still parse each holding branch's markdown, and the concept list crawls only in a repository with no committed manifest yet. :fact[cng7dr]
- That manifest is one kind of state the engine keeps in git, and git is one of three stores the engine places state in.

## Data tiers

*Place each kind of state in its store, say what reads it there, and say where a site's own data goes.*

- The engine keeps state in three tiers, git, D1, and R2, and places each kind of state by what reads it. :fact[pgy0mr]
- A table lists what each tier holds. Git holds the content entries, the content manifest, and the media manifest; D1 holds the `editor`, `magic_token`, and `session` tables, plus the opt-in `audit_log` and `preview_tokens` tables; and R2 holds uploaded media bytes, deduplicated by content hash. :fact[b6gquz]
- Both manifests are committed JSON under `src/content/.cairn/`. The media manifest carries what the bytes cannot, such as alt text and the original filename, and only the bytes it describes live in R2. :fact[lu67dk]
- The media manifest keys each row by a 16-hex content-hash prefix, and an upload checks it before storing anything. :fact[4t707i]
- A content-manifest row carries an entry's title, permalink, summary, links, and edges but never its body, and no D1 table stores a body. An entry's body lives only in git. :fact[6ign7q]
- Every publish is a commit on the default branch with its editor as author. The default branch's history records who published each change and when, with no audit table involved. :fact[70mf58] :fact[w379wu]
- The guard looks up the `session` row by its session-cookie id on each admin request, and sign-in looks up a `magic_token` row by its SHA-256 hash. :fact[pgy0mr]
- Only a site that wires `createD1AuditSink` writes `audit_log`, one row per audited admin action. :fact[wnvqlz]
- Only a site that mints preview links writes `preview_tokens`, one hashed token per link, each row naming the draft it shares. :fact[dtwvtz]
- See [Security model](security-model.md).
- See [the auth store reference](../reference/auth-store.md).
- R2 holds the media bytes, and the delivery route streams them directly. :fact[pgy0mr]
- See [Configure media](configure-media.md).
- A site keeps its own data, such as a member roster or an event schedule, wherever it chooses, and cairn assigns it no tier. The engine reserves the `cairn_` prefix for cookie names, and its auth-channel tables take `cairn_channel_*` names. :fact[qrwncf]
- Each of these stores is a platform the engine depends on outright, and only the content store has a seam that replaces it.

## Hard dependencies

*Name the platforms the engine depends on outright, and the one dependency a site can swap.*

- The engine builds on SvelteKit and Cloudflare directly, with no framework- or host-agnostic layer. :fact[er18kk] :fact[hk24xs]
- `svelte` and `@sveltejs/kit` are peer dependencies of the package, and the islands runtime mounts components with Svelte's own `mount()` and `unmount()`. :fact[er18kk]
- See [Supported toolchain](../reference/supported-toolchain.md).
- The admin and the public pages are SvelteKit route files over the engine's `/sveltekit` and `/delivery` factories, so every entry point assumes SvelteKit. :fact[3rb362] :fact[40pxcq]
- The engine's environment contract is Cloudflare Worker bindings, such as the `AUTH_DB` D1 database and the Email Sending binding. A production site built on cairn runs on Cloudflare Workers. :fact[i74t7g]
- No seam replaces Cloudflare as the host. The one swappable dependency is the content store, through `BackendProvider`, and `createGithubApp` is the only implementation the engine ships. :fact[hk24xs] :fact[n1om0r]
- A replacement content store keeps one contract, the interface every provider connects a route to.

## Backend contract

*State the semantics every content-store provider keeps, and leave the signatures to the reference.*

- A `BackendProvider` carries a `kind` tag and the default `branch`, and its `connect(env)` returns a live `Backend` for a route that needs one. The provider `createGithubApp` returns mints and caches its installation token lazily. :fact[gcd8h7]
- The `Backend` interface fixes semantics a provider must keep, among them the five a list states. :fact[025q6u]
- A `commit` with `expectedHead` makes one attempt and throws `CommitConflictError` on a head mismatch, and a `commit` without it keeps the head-merge retry. :fact[025q6u]
- `readFile` returns null for a missing path. :fact[025q6u]
- `listCommits` returns an empty array for a missing file instead of throwing. :fact[025q6u]
- `createBranch` returns the SHA it branched at and throws `BranchExistsError` on a name collision. :fact[025q6u]
- `deleteBranch` treats a missing branch as success. :fact[025q6u]
- `expectedHead` is the provider-level form of the head guard that a publish and the admin's other guarded commits take, and its absence is the retry that a save and an entry delete or rename take. :fact[025q6u] :fact[0gihxq]
- See [the core reference's types table](../reference/core.md#types).
- See [the core reference's error classes](../reference/core.md#error-classes).
- The contract is one exported surface among many, and each surface carries a stability tier.

## Stability tiers

*Say what each stability tier promises across versions, show a real break inside the Extension tier, and end the body on what that means for a site's code.*

- Every export carries one of three stability tiers, and the tier states what the export promises across versions. :fact[c1ujrl]
- Extension API and Scaffold API are the frozen contract, and Unstable API stays importable with no promise across minor versions. :fact[c1ujrl]
- See [Stability tiers in the reference index](../reference/README.md#stability-tiers).
- cairn is pre-1.0, so the tiers are a target discipline, and an Extension-tier break can ship in a minor release. :fact[549u00]
- The `check:surface` snapshot gate fails on any change to an export's declared shape until the golden file is regenerated to record it. Until 1.0 it detects and discloses a break rather than preventing one. :fact[gknz29]
- In `0.86.0`, the minor version that shipped `navLayout`, the nav fields on `AdminShellData` and the parameter and return types of `navFilter` changed shape, both inside the Extension API tier. A site that read those fields or declared a `navFilter` had code to change before it could upgrade. :fact[zm9tp4]
- In `0.94.0`, the `adminNav` types that `navLayout` built on were retired: `editor.adminNav` gave way to `editor.navLayout`, and `AdminNavEntry` folded into `NavLayoutEntry`. :fact[zm9tp4]
- See [the 0.86.0 migration notes](migration-notes.md#0860).
- See [the 0.94.0 migration notes](migration-notes.md#0940).
- Code a site writes against the Extension tier therefore meets each break as a named change. :fact[gknz29]
- See [Upgrade cairn](upgrade-cairn.md).

## Related resources

*Point the reader to the guides that build on this architecture, the pages that take one part of it further, and the platform documentation the page assumes.*

- The following guides build a site on these seams.
- See [Add cairn to a SvelteKit app](add-cairn-to-a-sveltekit-app.md).
- See [Define an adapter and schema](define-an-adapter-and-schema.md).
- See [Restrict admin access](restrict-admin-access.md).
- See [Add a custom admin screen](add-a-custom-admin-screen.md).
- See [Upgrade cairn](upgrade-cairn.md).
- The following pages take one part of the architecture further.
- See [Scaffolded site files](scaffolded-site-files.md).
- See [Content model](content-model.md).
- See [Security model](security-model.md).
- The following external pages document the platforms the engine builds on.
- See [SvelteKit routing](https://svelte.dev/docs/kit/routing).
- See [SvelteKit load functions](https://svelte.dev/docs/kit/load).
- See [SvelteKit form actions](https://svelte.dev/docs/kit/form-actions).
- See [Cloudflare Workers bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/).
- See [About GitHub Apps](https://docs.github.com/en/apps/overview).
