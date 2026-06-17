# SvelteKit (`@glw907/cairn-cms/sveltekit`)

This subpath holds the server side of the admin. The canonical wiring is the single mount:
`createCairnAdmin` serves every admin view through one `load` and one `actions` record, which a
site's catch-all `/admin/[...path]` route re-exports, plus the `Handle` that guards `/admin` from
`hooks.server.ts`. The two files and the composer behind them are in
[the canonical admin mount](./admin-routes.md). The per-surface factories the facade wraps
(`createAuthRoutes`, `createContentRoutes`, and friends) stay public as the advanced seam for a
site that mounts routes by hand.

```ts
import { createAuthGuard, createCairnAdmin, healthLoad } from '@glw907/cairn-cms/sveltekit';
import type { AdminData, LayoutData, ListData, EditData } from '@glw907/cairn-cms/sveltekit';
```

The TypeScript types in `src/lib` are the source of truth, and the export-coverage gate checks every
name here against them.

---

## Functions

### `createAuthGuard`

```ts
declare function createAuthGuard(): ({ event, resolve }: HandleInput) => Promise<Response>;
```

Build the SvelteKit `Handle` that gates every `/admin/**` path and hardens the admin response
headers. Wire it in `hooks.server.ts`. A site with its own hook keeps it by sequencing the guard
last, so the site hook sees every request and the guard owns admin gating.

```ts
// src/hooks.server.ts
import { sequence } from '@sveltejs/kit/hooks';
import { createAuthGuard } from '@glw907/cairn-cms/sveltekit';

export const handle = sequence(theme, createAuthGuard());
```

### `createCairnAdmin`

```ts
declare function createCairnAdmin(runtime: CairnRuntime, deps?: CairnAdminDeps): {
  load: (event: AdminEvent) => Promise<AdminData>;
  actions: Record<string, (event: AdminEvent) => Promise<unknown>>;
};
```

The single-mount admin facade. It instantiates the auth, content, editor, and nav route
factories over the composed runtime and serves every admin view through one `load`, so a site
mounts the whole admin with a single catch-all route instead of a tree of per-route files. The
load parses `event.url.pathname` with `parseAdminPath` and dispatches: an unrecognized path is a
404, `/admin` redirects to the first concept's list, the public login and confirm views return
bare page data, and every authed view returns `{ layout, page }` with the layout and view
loads run concurrently. The nav view is a 404 unless the runtime configures a `navMenu`.

`deps.branding` defaults from the runtime's `siteName` and `sender`, so most sites pass no deps;
the showcase passes only a `mintToken` stub for its dev backend.

`actions` covers the full admin action vocabulary. Each named action parses the pathname the
same way the load does, throws a 404 when the parsed view does not support it, synthesizes the
params the wrapped action reads, and delegates:

| Action | Valid views | Delegates to |
| --- | --- | --- |
| `request` | login | the magic-link request |
| `confirm` | confirm | the token confirm |
| `logout` | any parsed view | the session logout |
| `create` | list | the entry create |
| `save` | edit, nav | the entry save, or the nav save (404 without a `navMenu`) |
| `publish` | edit | the entry publish |
| `discard` | edit | the pending-edit discard |
| `rename` | edit | the entry rename |
| `delete` | edit, list | the entry delete (id from the path, or from the form body on a list) |
| `publishAll` | list, edit, editors, nav | the site-wide publish |
| `addEditor`, `removeEditor`, `setRole` | editors | the owner-gated editor management |

```ts
// src/lib/cairn.server.ts
import { composeRuntime } from '@glw907/cairn-cms';
import { createCairnAdmin } from '@glw907/cairn-cms/sveltekit';
import { cairn, siteConfig } from './cairn.config.js';

export const runtime = composeRuntime({ adapter: cairn, siteConfig });
export const admin = createCairnAdmin(runtime);
```

```ts
// src/routes/admin/[...path]/+page.server.ts
import { admin } from '$lib/cairn.server.js';
export const prerender = false;
export const load = admin.load;
export const actions = admin.actions;
```

The matching `+page.svelte` mounts [`CairnAdmin`](./components.md#cairnadmin) against the
discriminated `AdminData` the load returns.

### `parseAdminPath`

```ts
declare function parseAdminPath(pathname: string, concepts: ConceptDescriptor[]): AdminView | null;
```

The path authority behind `createCairnAdmin`. It maps a raw `URL.pathname` (never a SvelteKit
rest param) to the `AdminView` it names, or null for any shape it does not recognize, which the
caller maps to a 404. One trailing slash is tolerated; segments are percent-decoded one at a
time, so an encoded slash can never escape its segment. Reserved first segments (`login`,
`auth`, `editors`, `nav`) win before concept lookup.

### `requireSession`

```ts
declare function requireSession(event: { locals: { editor?: Editor | null } }): Editor;
```

Return the session the guard already resolved, or throw a redirect to `/admin/login`. Call it at the
top of a protected `load` or action when you need the signed-in editor. Its parameter is structural
and asks only for `locals`, so any event shape that carries the guard's editor satisfies it.

```ts
import { requireSession } from '@glw907/cairn-cms/sveltekit';

export const load = (event) => {
  const editor = requireSession(event);
  return { displayName: editor.displayName };
};
```

### `requireOwner`

```ts
declare function requireOwner(event: RequestContext): Editor;
```

Return a signed-in owner, or throw a 403 for an editor. Guards the management surface, such as the
editor list, where only an owner may act.

```ts
import { requireOwner } from '@glw907/cairn-cms/sveltekit';

export const load = (event) => {
  requireOwner(event);
  return { canManage: true };
};
```

The four factories below are the advanced per-route seam. `createCairnAdmin` wraps them, so a
site on the single mount never calls them directly; a site that mounts routes by hand wires each
one against its own route files. The view components post named actions (`?/request`,
`?/confirm`, `?/save`, and the rest of the vocabulary above), so a hand-mounted route must
register each handler under that name; a `default` action does not receive a named post.

### `createAuthRoutes`

```ts
type RequestResult =
  | { status: 'sent'; sent: true }
  | { status: 'send_error'; sent: false }
  | { status: 'throttled'; sent: false };

declare function createAuthRoutes(config: AuthRoutesConfig): {
  loginLoad: (event: RequestContext) => { siteName: string; error: string | null; csrf: string };
  requestAction: (event: RequestContext) => Promise<RequestResult>;
  confirmLoad: (event: RequestContext) => { token: string; siteName: string; error: string | null; csrf: string };
  confirmAction: (event: RequestContext) => Promise<never>;
  logoutAction: (event: RequestContext) => Promise<never>;
};
```

Build the magic-link login flow. `loginLoad` and `requestAction` back the sign-in view at
`/admin/login`, `confirmLoad` and `confirmAction` back the magic-link landing at
`/admin/auth/confirm`, and `logoutAction` clears the session; the admin shell posts it as the
named `?/logout` action on the current URL. The `config.branding` sets the site name and sender
shown in the email; pass a custom `config.send` to override the default Cloudflare sender.

`requestAction` awaits the send, so its `RequestResult` (exported since 0.38.0) reflects the
outcome. The `sent` status covers both a successful send and a non-allow-listed address (the two
return identical results, so the response never reveals membership). A `send_error` means the email
could not be sent; `throttled` means the same address requested a link inside the cooldown window.
`sent` mirrors the old boolean, so a site rendering against `form.sent` keeps working.

```ts
// src/routes/admin/login/+page.server.ts (per-route mounting)
import { createAuthRoutes } from '@glw907/cairn-cms/sveltekit';

const auth = createAuthRoutes({ branding: { siteName: 'My Site', from: 'cms@example.com' } });

export const load = auth.loginLoad;
export const actions = { request: auth.requestAction };
```

### `createEditorRoutes`

```ts
declare function createEditorRoutes(): {
  editorsLoad: (event: RequestContext) => Promise<{ editors: Editor[]; self: string }>;
  addEditorAction: (event: RequestContext) => Promise<ActionFailure<{ error: string }> | { ok: true }>;
  removeEditorAction: (event: RequestContext) => Promise<ActionFailure<{ error: string }> | { ok: true }>;
  setRoleAction: (event: RequestContext) => Promise<ActionFailure<{ error: string }> | { ok: true }>;
};
```

Build the loads and actions for the editor-management view at `/admin/editors`. `editorsLoad` lists
the editors and names the current user. The three actions add an editor, remove one, and change a
role, each returning a typed `ActionFailure` on a guard or validation error.

```ts
// src/routes/admin/(app)/editors/+page.server.ts (per-route mounting)
import { createEditorRoutes } from '@glw907/cairn-cms/sveltekit';

const editors = createEditorRoutes();

export const load = editors.editorsLoad;
export const actions = {
  addEditor: editors.addEditorAction,
  removeEditor: editors.removeEditorAction,
  setRole: editors.setRoleAction,
};
```

### `createContentRoutes`

```ts
declare function createContentRoutes(runtime: CairnRuntime, deps?: ContentRoutesDeps): {
  layoutLoad: (event: ContentEvent) => Promise<LayoutData>;
  indexRedirect: () => never;
  listLoad: (event: ContentEvent) => Promise<ListData>;
  mediaLibraryLoad: (event: ContentEvent) => Promise<MediaLibraryData>;
  createAction: (event: ContentEvent) => Promise<never>;
  editLoad: (event: ContentEvent) => Promise<EditData>;
  saveAction: (event: ContentEvent) => Promise<ActionFailure<unknown>>;
  publishAction: (event: ContentEvent) => Promise<ActionFailure<unknown>>;
  publishAllAction: (event: ContentEvent) => Promise<never>;
  discardAction: (event: ContentEvent) => Promise<never>;
  deleteAction: (event: ContentEvent) => Promise<ActionFailure<unknown>>;
  listDeleteAction: (event: ContentEvent) => Promise<ActionFailure<unknown>>;
  renameAction: (event: ContentEvent) => Promise<ActionFailure<unknown>>;
  uploadAction: (event: ContentEvent) => Promise<ActionFailure<unknown> | UploadResult>;
  mintToken: (env: GithubKeyEnv) => string | Promise<string>;
};
```

The core of the admin surface. It takes the composed runtime and returns the loads and actions for
the authed admin shell, the concept list, and the entry editor. `layoutLoad` backs the authed
shell, `listLoad` with the `create`, `delete` (`listDeleteAction`), and `publishAll`
actions back a concept's list view, and `editLoad` with the `save`, `publish`, `discard`,
`delete`, and `rename` actions back the entry editor. `uploadAction` ingests an image for a
media-enabled site: a raw-body JSON endpoint that stores the bytes in R2, returns a `UploadResult`
(the `media:` reference and the server-owned record), and commits nothing until the entry is saved.
`mediaLibraryLoad` backs the admin Media Library view: it unions `media.json` from the default
branch with every open `cairn/*` branch (so a not-yet-published asset shows, with the default
branch winning a same-hash tie), projects each row through the shared `mediaLibraryEntry` helper,
and attaches a per-hash where-used overlay (`MediaLibraryData`). The optional `deps.mintToken`
stubs the GitHub App token mint, which is how the showcase runs in dev without a real key.

A save holds the edit on the entry's pending branch (`cairn/<concept>/<id>`) and does not touch
the default branch, so the live site stays as it was. `publishAction` publishes what the author
sees: it validates and holds the posted form exactly like a save (the same fail shapes on a
validation or link-guard refusal), then copies that markdown to the default branch, with its
manifest row upserted, in one commit. The pending branch is deleted only when its head still
matches the commit the action just made; a concurrent save moved it, so the entry stays pending
instead of losing the newer edit. `publishAllAction` publishes the saved branch content of every
pending entry across concepts in one atomic commit, with the same guarded per-branch delete; the
admin topbar posts it as the named `?/publishAll` action from any admin page. `discardAction`
deletes the pending branch, returning to the edit page for a published entry (`?discarded=1`) or
to the list for an entry that never published. `renameAction` refuses with a 409 while a pending
branch exists, and a delete cascades to the pending branch after its own commit lands.

Every action failure carries `error: string` as its one-line summary, alongside the payload that
names what refused: a blocked save or publish returns `SaveFailure` (the broken links and the
edited body), a refused delete returns `DeleteRefusal` (the inbound linkers and the entry id),
and a refused rename returns `RenameFailure`. A page component types its `form` prop with
`ContentFormFailure`, the optional merge of the three.

```ts
// src/routes/admin/(app)/[concept]/+page.server.ts (per-route mounting)
import { cairn, siteConfig } from '$lib/cairn.config.js';
import { composeRuntime } from '@glw907/cairn-cms';
import { createContentRoutes } from '@glw907/cairn-cms/sveltekit';

const routes = createContentRoutes(composeRuntime({ adapter: cairn, siteConfig }));

export const load = routes.listLoad;
export const actions = { create: routes.createAction, delete: routes.listDeleteAction, publishAll: routes.publishAllAction };
```

### `createMediaRoute`

```ts
declare function createMediaRoute(resolved: ResolvedAssetConfig): RequestHandler;
```

The media delivery route, a SvelteKit `RequestHandler` a media-enabled site mounts at
`/media/[...path]`. It streams content-addressed bytes from the site's R2 bucket, validating the
hash and extension before any R2 read and deriving the object key from the validated values alone.
Every served response carries the load-bearing security headers (`X-Content-Type-Options: nosniff`,
`Content-Disposition: inline`, a `default-src 'none'; sandbox` CSP, and a one-year immutable cache),
which are the XSS control for the served bytes since the route sits outside `/admin`. It forwards
`If-None-Match` and `Range` for 304 and 206 responses, short-circuits the Cloudflare Images
self-loop, returns 503 on a missing bucket binding, and 404s a media-off site or a bad path. Pass it
the runtime's `resolvedAssets`.

```ts
// src/routes/media/[...path]/+server.ts
import { cairn, siteConfig } from '$lib/cairn.config.js';
import { composeRuntime } from '@glw907/cairn-cms';
import { createMediaRoute } from '@glw907/cairn-cms/sveltekit';

export const GET = createMediaRoute(composeRuntime({ adapter: cairn, siteConfig }).resolvedAssets);
```

### `createNavRoutes`

```ts
declare function createNavRoutes(runtime: CairnRuntime, deps?: NavRoutesDeps): {
  navLoad: (event: ContentEvent) => Promise<NavLoadData>;
  navSave: (event: ContentEvent) => Promise<never>;
};
```

Build the load and save for the navigation editor at `/admin/nav`. `navLoad` reads the current menu
tree and the page options for the URL picker, and `navSave` commits an edited tree to the
git-committed site-config file. Like the content routes, `deps.mintToken` stubs the token mint.
The `NavTree` component posts the named `?/save` action, so a hand-mounted route registers
`navSave` under `save`.

```ts
// src/routes/admin/(app)/nav/+page.server.ts (per-route mounting)
import { composeRuntime } from '@glw907/cairn-cms';
import { createNavRoutes } from '@glw907/cairn-cms/sveltekit';
import { cairn, siteConfig } from '$lib/cairn.config.js';

const nav = createNavRoutes(composeRuntime({ adapter: cairn, siteConfig }));

export const load = nav.navLoad;
export const actions = { save: nav.navSave };
```

The public read-model loaders live at [`@glw907/cairn-cms/delivery`](./delivery.md), where the
matching `CairnHead` component sits. See [the delivery reference](./delivery.md) for the worked
catch-all route.

### `healthLoad`

```ts
declare function healthLoad(
  event: { platform?: { env?: GithubKeyEnv } },
  runtime: CairnRuntime,
): Promise<HealthData>;
```

Run the GitHub App signing self-test against the configured App id and the Worker's key secret.
Mount it at the site root, outside `/admin`, so the auth guard does not gate the deploy health
check. The event comes first, the runtime second. On a site that prerenders by default, set
`prerender = false` so the check runs at request time rather than freezing a build-time failure.

```ts
// src/routes/healthz/+server.ts
import { json } from '@sveltejs/kit';
import { healthLoad } from '@glw907/cairn-cms/sveltekit';
import { runtime } from '$lib/cairn.server.js';

export const prerender = false;

export const GET = async (event) => json(await healthLoad(event, runtime));
```

---

## Types

These are the route-data and config shapes the factories produce and consume. A `+page.svelte`
imports the matching `*Data` type to type its `data` prop.

| Name | Signature | Meaning |
| --- | --- | --- |
| `AuthRoutesConfig` | `interface AuthRoutesConfig { branding: AuthBranding; send?: SendMagicLink }` | The config `createAuthRoutes` takes: the email branding and an optional custom sender. |
| `LayoutData` | `interface LayoutData { siteName; user: { displayName; email; role }; concepts: NavConcept[]; pathname; canManageEditors; navLabel: string \| null; theme; collapsedNav; csrf; pendingEntries: { concept; id }[] \| null }` | The admin layout's data: site identity, the signed-in user, the nav, the active path, the CSRF token, and the pending entries for the topbar's publish-all (null when GitHub is unreachable, which hides the action). |
| `NavConcept` | `interface NavConcept { id: string; label: string }` | A sidebar concept entry, just enough to render the nav without shipping validators to the client. |
| `EntrySummary` | `interface EntrySummary { id: string; title: string; date: string \| null; draft: boolean; status: 'published' \| 'edited' \| 'new'; summary: string \| null }` | One row in a concept's list view. `status` derives from the ref set: live as-is, live with held edits, or pending-branch only. `summary` is the row's one-line excerpt (the manifest's indexed summary for a published row, the branch frontmatter or body excerpt for a pending one, null when neither yields text). |
| `ListData` | `interface ListData { conceptId; label; singular; dated; entries: EntrySummary[]; error: string \| null; formError: string \| null; publishedAll: number \| null }` | The concept list view's data, including a degraded-listing error, a create-form bounce error, and the publish-all flash count from `?publishedAll=`. `singular` is the create-affordance noun ("New post"), from the descriptor (defaulted to `label`). |
| `EditData` | `interface EditData { conceptId; id; label; fields; frontmatter; body; title; isNew; saved; renamed; error; slug; linkTargets; mediaTargets: Record<string, { slug; ext; contentType }>; mediaLibrary: Record<string, { hash; slug; ext; contentType; displayName; alt; width; height; bytes }>; inboundLinks; pending; published; publishedFlash; discardedFlash; preview: ResolvedPreview \| null }` | The entry editor's data: form-ready frontmatter, the body, the link targets, the media targets (the minimal resolver input keyed by content hash, empty when media is off or the read fails), the media library (the picker's full human layer keyed by the same content hash, projected from the same committed-manifest read, with the `hash` duplicated into each value for `Object.values` iteration, and degrading to empty on the same path as `mediaTargets`), the inbound links for the delete guard, the publish state (`pending` means the body came from the entry's branch; `published` means the file exists on the default branch), and the adapter's `preview` knob resolved for this entry's concept (its `byConcept` override applied; null when the site sets none, which leaves the frame unstyled behind a hint). |
| `MediaUsageInfo` | `interface MediaUsageInfo { count: number; entries: UsageEntry[] }` | One asset's where-used overlay: the distinct-entry count (by concept and id) and every row (published and edit-branch origins), kept separate from `MediaLibraryEntry` so the picker projection stays decoupled. |
| `MediaLibraryData` | `interface MediaLibraryData { assets: MediaLibraryEntry[]; usage: Record<string, MediaUsageInfo>; error: string \| null }` | The Media Library view's data: the assets unioned across the default branch and open `cairn/*` branches, the per-hash usage overlay (an asset with no key renders as "no references found"), and the degraded-load error. |
| `ContentEvent` | `interface ContentEvent { url: URL; params; request: Request; locals: { editor? }; platform? }` | The structural event the content routes read; a real SvelteKit `RequestEvent` satisfies it. |
| `ContentRoutesDeps` | `interface ContentRoutesDeps { mintToken?: (env: GithubKeyEnv) => string \| Promise<string> }` | Injectable dependencies for `createContentRoutes`; tests stub the token mint, and a bare string return works (the routes await either way). |
| `SaveFailure` | `interface SaveFailure { error: string; brokenLinks: string[]; body: string }` | A blocked save or publish: the one-line summary, the cairn tokens that resolve to no entry, and the author's edited markdown for reseeding the editor. |
| `DeleteRefusal` | `interface DeleteRefusal { error: string; inboundLinks: InboundLink[]; id: string }` | A refused delete: the one-line summary, the entries that still link to the refused one, and its id so a list marks the right row. |
| `RenameFailure` | `interface RenameFailure { error: string }` | A refused rename (bad slug, collision, or pending edits): just the one-line summary. |
| `ContentFormFailure` | `type ContentFormFailure = Partial<SaveFailure & DeleteRefusal & RenameFailure>` | The shape a route's single `form` export presents to a view component: whichever content action last failed, every field optional, `error` always set on a failure. |
| `NavPageOption` | `interface NavPageOption { label: string; url: string }` | One page option for the nav editor's URL picker datalist. |
| `NavLoadData` | `interface NavLoadData { menu: { name; label; maxDepth }; tree: NavNode[]; pages: NavPageOption[]; saved; error: string \| null }` | The nav editor's load data: the menu meta, the current tree, the page options, and the status flags. |
| `NavRoutesDeps` | `interface NavRoutesDeps { mintToken?: (env: GithubKeyEnv) => string \| Promise<string> }` | Injectable dependencies for `createNavRoutes`; tests stub the token mint, and a bare string return works. |
| `CairnAdminDeps` | `interface CairnAdminDeps { branding?: AuthBranding; send?: SendMagicLink; mintToken?: ContentRoutesDeps['mintToken'] }` | Injectable dependencies for `createCairnAdmin`. Branding defaults from the runtime's `siteName` and `sender`; the other two pass through to the wrapped factories. |
| `AdminData` | `type AdminData = { view: 'login' \| 'confirm'; page } \| { view: 'list' \| 'edit' \| 'editors' \| 'nav' \| 'media'; layout: LayoutData; page }` | One admin view's data, discriminated on `view` for the admin page component's switch. Each `page` is the matching per-surface load's return shape (`ListData`, `EditData`, `MediaLibraryData`, `NavLoadData`, the auth page data, or the editor list). |
| `AdminView` | `type AdminView = { view: 'index' \| 'login' \| 'confirm' \| 'editors' \| 'nav' \| 'media' } \| { view: 'list'; concept } \| { view: 'edit'; concept; id }` | The parsed admin view `parseAdminPath` returns, discriminated for the dispatcher's switch. |
| `HealthData` | `interface HealthData { ok: boolean; checks: { githubAppSigning: { ok: boolean; detail? } } }` | The `/healthz` payload: the overall status and the signing self-test result. |
| `RequestContext` | `interface RequestContext { url; request; cookies: CookieJar; locals; platform?; setHeaders }` | The structural request the auth helpers read; a real SvelteKit `RequestEvent` satisfies it. |
| `CookieJar` | `interface CookieJar { get; set; delete }` | The cookie accessor the auth helpers use, matching SvelteKit's `cookies`. |
| `HandleInput` | `interface HandleInput { event: RequestContext; resolve(event): Promise<Response> \| Response }` | The argument the `createAuthGuard` handle receives, matching SvelteKit's `Handle` input. |
| `GithubKeyEnv` | `interface GithubKeyEnv { GITHUB_APP_PRIVATE_KEY_B64?: string }` | The Worker secret the token mint reads; it types the `mintToken` parameter on `ContentRoutesDeps` and `healthLoad`. |
| `AuthEnv` | `interface AuthEnv { AUTH_DB?: D1Database; PUBLIC_ORIGIN?: string; EMAIL?: { send(message): Promise<void> } }` | The Cloudflare env shape the auth and email bindings live on: the D1 session store, the canonical confirmation-link origin, and the Email Sending binding. A site names it in its `app.d.ts` Platform block so `platform.env` carries these members. |
