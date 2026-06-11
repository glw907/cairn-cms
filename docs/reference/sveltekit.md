# SvelteKit (`@glw907/cairn-cms/sveltekit`)

This subpath holds the server-side route factories. Each one composes the engine runtime into the
`load` functions and form `actions` a SvelteKit `+page.server.ts` exports, plus the `Handle` that
guards `/admin`. You import it in `src/hooks.server.ts` and in your admin route servers. The
canonical route tree these factories mount is in
[the admin route structure guide](./admin-routes.md).

```ts
import { createAuthGuard, createContentRoutes, healthLoad } from '@glw907/cairn-cms/sveltekit';
import type { LayoutData, ListData, EditData } from '@glw907/cairn-cms/sveltekit';
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

### `requireSession`

```ts
declare function requireSession(event: RequestContext): Editor;
```

Return the session the guard already resolved, or throw a redirect to `/admin/login`. Call it at the
top of a protected `load` or action when you need the signed-in editor.

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

### `createAuthRoutes`

```ts
type RequestResult =
  | { status: 'sent'; sent: true }
  | { status: 'send_error'; sent: false }
  | { status: 'throttled'; sent: false };

declare function createAuthRoutes(config: AuthRoutesConfig): {
  loginLoad: (event: RequestContext) => { siteName: string; error: string | null; csrf: string };
  requestAction: (event: RequestContext) => Promise<RequestResult>;
  confirmLoad: (event: RequestContext) => { token: string; siteName: string; error: string | null };
  confirmAction: (event: RequestContext) => Promise<never>;
  logoutAction: (event: RequestContext) => Promise<never>;
};
```

Build the magic-link login flow. `loginLoad` and `requestAction` back `/admin/login`, `confirmLoad`
and `confirmAction` back the magic-link landing at `/admin/auth/confirm`, and `logoutAction` clears
the session. The `config.branding` sets the site name and sender shown in the email; pass a custom
`config.send` to override the default Cloudflare sender.

`requestAction` awaits the send, so its `RequestResult` (exported since 0.38.0) reflects the
outcome. The `sent` status covers both a successful send and a non-allow-listed address (the two
return identical results, so the response never reveals membership). A `send_error` means the email
could not be sent; `throttled` means the same address requested a link inside the cooldown window.
`sent` mirrors the old boolean, so a site rendering against `form.sent` keeps working.

```ts
// src/routes/admin/login/+page.server.ts
import { createAuthRoutes } from '@glw907/cairn-cms/sveltekit';

const auth = createAuthRoutes({ branding: { siteName: 'My Site', from: 'cms@example.com' } });

export const load = auth.loginLoad;
export const actions = { default: auth.requestAction };
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

Build the loads and actions for the editor-management page at `/admin/editors`. `editorsLoad` lists
the editors and names the current user. The three actions add an editor, remove one, and change a
role, each returning a typed `ActionFailure` on a guard or validation error.

```ts
// src/routes/admin/(app)/editors/+page.server.ts
import { createEditorRoutes } from '@glw907/cairn-cms/sveltekit';

const editors = createEditorRoutes();

export const load = editors.editorsLoad;
export const actions = {
  add: editors.addEditorAction,
  remove: editors.removeEditorAction,
  setRole: editors.setRoleAction,
};
```

### `createContentRoutes`

```ts
declare function createContentRoutes(runtime: CairnRuntime, deps?: ContentRoutesDeps): {
  layoutLoad: (event: ContentEvent) => Promise<LayoutData>;
  indexRedirect: () => never;
  listLoad: (event: ContentEvent) => Promise<ListData>;
  createAction: (event: ContentEvent) => Promise<never>;
  editLoad: (event: ContentEvent) => Promise<EditData>;
  saveAction: (event: ContentEvent) => Promise<ReturnType<typeof fail> | never>;
  publishAction: (event: ContentEvent) => Promise<ReturnType<typeof fail> | never>;
  publishAllAction: (event: ContentEvent) => Promise<never>;
  discardAction: (event: ContentEvent) => Promise<never>;
  deleteAction: (event: ContentEvent) => Promise<ReturnType<typeof fail> | never>;
  listDeleteAction: (event: ContentEvent) => Promise<ReturnType<typeof fail> | never>;
  renameAction: (event: ContentEvent) => Promise<ReturnType<typeof fail> | never>;
  mintToken: (env: GithubKeyEnv) => Promise<string>;
};
```

The core of the admin surface. It takes the composed runtime and returns the loads and actions for
the authed admin shell, the concept list, and the entry editor. `layoutLoad` backs the `(app)`
group layout, `listLoad` with the `create`, `delete` (`listDeleteAction`), and `publishAll`
actions back a concept's list page, and `editLoad` with the `save`, `publish`, `discard`,
`delete`, and `rename` actions back the entry editor. The optional `deps.mintToken` stubs the
GitHub App token mint, which is how the showcase runs in dev without a real key.

A save holds the edit on the entry's pending branch (`cairn/<concept>/<id>`) and does not touch
the default branch, so the live site stays as it was. `publishAction` publishes what the author
sees: it validates and holds the posted form exactly like a save (the same fail shapes on a
validation or link-guard refusal), then copies that markdown to the default branch, with its
manifest row upserted, in one commit. The pending branch is deleted only when its head still
matches the commit the action just made; a concurrent save moved it, so the entry stays pending
instead of losing the newer edit. `publishAllAction` publishes the saved branch content of every
pending entry across concepts in one atomic commit, with the same guarded per-branch delete; the
admin topbar posts to it on the first concept's list route from anywhere. `discardAction` deletes
the pending branch, returning to the edit page for a published entry (`?discarded=1`) or to the
list for an entry that never published. `renameAction` refuses with a 409 `renameError` while a
pending branch exists, and a delete cascades to the pending branch after its own commit lands.

```ts
// examples/showcase/src/routes/admin/(app)/[concept]/+page.server.ts
import { cairn, siteConfig } from '$lib/cairn.config.js';
import { composeRuntime } from '@glw907/cairn-cms';
import { createContentRoutes } from '@glw907/cairn-cms/sveltekit';

const routes = createContentRoutes(composeRuntime({ adapter: cairn, siteConfig }), {
  mintToken: async () => 'dev-token',
});

export const load = routes.listLoad;
export const actions = { create: routes.createAction, delete: routes.listDeleteAction, publishAll: routes.publishAllAction };
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

```ts
// src/routes/admin/(app)/nav/+page.server.ts
import { composeRuntime } from '@glw907/cairn-cms';
import { createNavRoutes } from '@glw907/cairn-cms/sveltekit';
import { cairn, siteConfig } from '$lib/cairn.config.js';

const nav = createNavRoutes(composeRuntime({ adapter: cairn, siteConfig }));

export const load = nav.navLoad;
export const actions = { default: nav.navSave };
```

The public read-model loaders live at [`@glw907/cairn-cms/delivery`](./delivery.md), where the
matching `CairnHead` component sits. See [the delivery reference](./delivery.md) for the worked
catch-all route.

### `createCairnAdmin`

```ts
declare function createCairnAdmin(runtime: CairnRuntime, deps?: CairnAdminDeps): {
  load: (event: AdminEvent) => Promise<AdminData>;
  actions: Record<string, (event: AdminEvent) => Promise<unknown>>;
};
```

The single-mount admin facade. It instantiates the auth, content, editor, and nav route
factories over the composed runtime and serves every admin view through one `load`, so a site
mounts the whole admin with a single catch-all route instead of a tree of shims. The load
parses `event.url.pathname` with `parseAdminPath` and dispatches: an unrecognized path is a
404, `/admin` redirects to the first concept's list, the public login and confirm views return
bare page data, and every authed view returns `{ layout, page }` with the layout and view
loads run concurrently. The nav view is a 404 unless the runtime configures a `navMenu`.

`deps.branding` defaults from the runtime's `siteName` and `sender`, so most sites pass only a
`mintToken` override in dev.

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
// src/routes/admin/[...path]/+page.server.ts
import { composeRuntime } from '@glw907/cairn-cms';
import { createCairnAdmin } from '@glw907/cairn-cms/sveltekit';
import { cairn, siteConfig } from '$lib/cairn.config.js';

const admin = createCairnAdmin(composeRuntime({ adapter: cairn, siteConfig }));

export const load = admin.load;
export const actions = admin.actions;
```

### `parseAdminPath`

```ts
declare function parseAdminPath(pathname: string, concepts: ConceptDescriptor[]): AdminView | null;
```

The path authority behind `createCairnAdmin`. It maps a raw `URL.pathname` (never a SvelteKit
rest param) to the `AdminView` it names, or null for any shape it does not recognize, which the
caller maps to a 404. One trailing slash is tolerated; segments are percent-decoded one at a
time, so an encoded slash can never escape its segment. Reserved first segments (`login`,
`auth`, `editors`, `nav`) win before concept lookup.

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
// examples/showcase/src/routes/healthz/+server.ts
import { json } from '@sveltejs/kit';
import { healthLoad } from '@glw907/cairn-cms/sveltekit';
import { composeRuntime } from '@glw907/cairn-cms';
import { cairn, siteConfig } from '$lib/cairn.config.js';

export const prerender = false;

const runtime = composeRuntime({ adapter: cairn, siteConfig });

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
| `EntrySummary` | `interface EntrySummary { id: string; title: string; date: string \| null; draft: boolean; status: 'published' \| 'edited' \| 'new' }` | One row in a concept's list view. `status` derives from the ref set: live as-is, live with held edits, or pending-branch only. |
| `ListData` | `interface ListData { conceptId; label; dated; entries: EntrySummary[]; error: string \| null; formError: string \| null; publishedAll: number \| null }` | The concept list view's data, including a degraded-listing error, a create-form bounce error, and the publish-all flash count from `?publishedAll=`. |
| `EditData` | `interface EditData { conceptId; id; label; fields; frontmatter; body; title; isNew; saved; renamed; error; slug; linkTargets; inboundLinks; pending; published; publishedFlash; discardedFlash }` | The entry editor's data: form-ready frontmatter, the body, the link targets, the inbound links for the delete guard, and the publish state (`pending` means the body came from the entry's branch; `published` means the file exists on the default branch). |
| `ContentEvent` | `interface ContentEvent { url: URL; params; request: Request; locals: { editor? }; platform? }` | The structural event the content routes read; a real SvelteKit `RequestEvent` satisfies it. |
| `ContentRoutesDeps` | `interface ContentRoutesDeps { mintToken?: (env: GithubKeyEnv) => Promise<string> }` | Injectable dependencies for `createContentRoutes`; tests stub the token mint. |
| `NavPageOption` | `interface NavPageOption { label: string; url: string }` | One page option for the nav editor's URL picker datalist. |
| `NavLoadData` | `interface NavLoadData { menu: { name; label; maxDepth }; tree: NavNode[]; pages: NavPageOption[]; saved; error: string \| null }` | The nav editor's load data: the menu meta, the current tree, the page options, and the status flags. |
| `NavRoutesDeps` | `interface NavRoutesDeps { mintToken?: (env: GithubKeyEnv) => Promise<string> }` | Injectable dependencies for `createNavRoutes`; tests stub the token mint. |
| `CairnAdminDeps` | `interface CairnAdminDeps { branding?: AuthBranding; send?: SendMagicLink; mintToken?: ContentRoutesDeps['mintToken'] }` | Injectable dependencies for `createCairnAdmin`. Branding defaults from the runtime's `siteName` and `sender`; the other two pass through to the wrapped factories. |
| `AdminData` | `type AdminData = { view: 'login' \| 'confirm'; page } \| { view: 'list' \| 'edit' \| 'editors' \| 'nav'; layout: LayoutData; page }` | One admin view's data, discriminated on `view` for the admin page component's switch. Each `page` is the matching per-surface load's return shape (`ListData`, `EditData`, `NavLoadData`, the auth page data, or the editor list). |
| `AdminView` | `type AdminView = { view: 'index' \| 'login' \| 'confirm' \| 'editors' \| 'nav' } \| { view: 'list'; concept } \| { view: 'edit'; concept; id }` | The parsed admin view `parseAdminPath` returns, discriminated for the dispatcher's switch. |
| `HealthData` | `interface HealthData { ok: boolean; checks: { githubAppSigning: { ok: boolean; detail? } } }` | The `/healthz` payload: the overall status and the signing self-test result. |
| `RequestContext` | `interface RequestContext { url; request; cookies: CookieJar; locals; platform?; setHeaders }` | The structural request the auth helpers read; a real SvelteKit `RequestEvent` satisfies it. |
| `CookieJar` | `interface CookieJar { get; set; delete }` | The cookie accessor the auth helpers use, matching SvelteKit's `cookies`. |
| `HandleInput` | `interface HandleInput { event: RequestContext; resolve(event): Promise<Response> \| Response }` | The argument the `createAuthGuard` handle receives, matching SvelteKit's `Handle` input. |
| `GithubKeyEnv` | `interface GithubKeyEnv { GITHUB_APP_PRIVATE_KEY_B64?: string }` | The Worker secret the token mint reads; it types the `mintToken` parameter on `ContentRoutesDeps` and `healthLoad`. |
