# SvelteKit (`@glw907/cairn-cms/sveltekit`)

This subpath holds the server-side route factories. Each one composes the engine runtime into the
`load` functions and form `actions` a SvelteKit `+page.server.ts` exports, plus the `Handle` that
guards `/admin`. A site imports it in `src/hooks.server.ts` and in its admin route servers. The
canonical route tree these factories mount is in
[the admin route structure guide](../admin-route-structure.md).

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
declare function createAuthRoutes(config: AuthRoutesConfig): {
  loginLoad: (event: RequestContext) => { siteName: string; error: string | null };
  requestAction: (event: RequestContext) => Promise<{ sent: true }>;
  confirmLoad: (event: RequestContext) => { token: string; siteName: string; error: string | null };
  confirmAction: (event: RequestContext) => Promise<never>;
  logoutAction: (event: RequestContext) => Promise<never>;
};
```

Build the magic-link login flow. `loginLoad` and `requestAction` back `/admin/login`, `confirmLoad`
and `confirmAction` back the magic-link landing at `/admin/auth/confirm`, and `logoutAction` clears
the session. The `config.branding` sets the site name and sender shown in the email; pass a custom
`config.send` to override the default Cloudflare sender.

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
  layoutLoad: (event: ContentEvent) => LayoutData;
  indexRedirect: () => never;
  listLoad: (event: ContentEvent) => Promise<ListData>;
  createAction: (event: ContentEvent) => Promise<never>;
  editLoad: (event: ContentEvent) => Promise<EditData>;
  saveAction: (event: ContentEvent) => Promise<ReturnType<typeof fail> | never>;
  deleteAction: (event: ContentEvent) => Promise<ReturnType<typeof fail> | never>;
  renameAction: (event: ContentEvent) => Promise<ReturnType<typeof fail> | never>;
  mintToken: (env: GithubKeyEnv) => Promise<string>;
};
```

The core of the admin surface. It takes the composed runtime and returns the loads and actions for
the authed admin shell, the concept list, and the entry editor. `layoutLoad` backs the `(app)`
group layout, `listLoad` and `createAction` back a concept's list page, and `editLoad` with the
`save`, `delete`, and `rename` actions back the entry editor. The optional `deps.mintToken` stubs
the GitHub App token mint, which is how the showcase runs in dev without a real key.

```ts
// examples/showcase/src/routes/admin/(app)/[concept]/+page.server.ts
import { cairn, siteConfig } from '$lib/cairn.config.js';
import { composeRuntime } from '@glw907/cairn-cms';
import { createContentRoutes } from '@glw907/cairn-cms/sveltekit';

const routes = createContentRoutes(composeRuntime({ adapter: cairn, siteConfig }), {
  mintToken: async () => 'dev-token',
});

export const load = routes.listLoad;
export const actions = { create: routes.createAction };
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

### `createPublicRoutes`

```ts
declare function createPublicRoutes(deps: PublicRoutesDeps): {
  entryLoad: (event: { url: URL }) => Promise<EntryData>;
  archiveLoad: (conceptId: string) => ListData;
  tagIndexLoad: (conceptId: string) => TagIndexData;
  tagLoad: (conceptId: string, event: { params: { tag: string } }) => TagData;
  entries: () => { path: string }[];
};
```

Build the public read-model loaders for a site's unified content index: one entry's detail, a
concept archive, the tag index, and a single tag's filtered list. This is the same factory the
delivery surface exports, and a site usually imports it from
[`@glw907/cairn-cms/delivery`](./delivery.md), where the matching `CairnHead` component lives. See
[the delivery reference](./delivery.md) for the worked catch-all route.

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
| `LayoutData` | `interface LayoutData { siteName; user: { displayName; role }; concepts: NavConcept[]; pathname; canManageEditors; navLabel: string \| null }` | The admin layout's data: site identity, the signed-in user, the nav, and the active path. |
| `NavConcept` | `interface NavConcept { id: string; label: string }` | A sidebar concept entry, just enough to render the nav without shipping validators to the client. |
| `EntrySummary` | `interface EntrySummary { id: string; title: string; date: string \| null; draft: boolean }` | One row in a concept's list view. |
| `ListData` | `interface ListData { conceptId; label; dated; entries: EntrySummary[]; error: string \| null; formError: string \| null }` | The concept list view's data, including a degraded-listing error and a create-form bounce error. |
| `EditData` | `interface EditData { conceptId; id; label; fields; frontmatter; body; title; isNew; saved; renamed; error; slug; linkTargets; inboundLinks }` | The entry editor's data: form-ready frontmatter, the body, the link targets, and the inbound links for the delete guard. |
| `ContentEvent` | `interface ContentEvent { url: URL; params; request: Request; locals: { editor? }; platform? }` | The structural event the content routes read; a real SvelteKit `RequestEvent` satisfies it. |
| `ContentRoutesDeps` | `interface ContentRoutesDeps { mintToken?: (env: GithubKeyEnv) => Promise<string> }` | Injectable dependencies for `createContentRoutes`; tests stub the token mint. |
| `NavPageOption` | `interface NavPageOption { label: string; url: string }` | One page option for the nav editor's URL picker datalist. |
| `NavLoadData` | `interface NavLoadData { menu: { name; label; maxDepth }; tree: NavNode[]; pages: NavPageOption[]; saved; error: string \| null }` | The nav editor's load data: the menu meta, the current tree, the page options, and the status flags. |
| `NavRoutesDeps` | `interface NavRoutesDeps { mintToken?: (env: GithubKeyEnv) => Promise<string> }` | Injectable dependencies for `createNavRoutes`; tests stub the token mint. |
| `HealthData` | `interface HealthData { ok: boolean; checks: { githubAppSigning: { ok: boolean; detail? } } }` | The `/healthz` payload: the overall status and the signing self-test result. |
| `RequestContext` | `interface RequestContext { url; request; cookies: CookieJar; locals; platform?; setHeaders }` | The structural request the auth helpers read; a real SvelteKit `RequestEvent` satisfies it. |
| `CookieJar` | `interface CookieJar { get; set; delete }` | The cookie accessor the auth helpers use, matching SvelteKit's `cookies`. |
| `HandleInput` | `interface HandleInput { event: RequestContext; resolve(event): Promise<Response> \| Response }` | The argument the `createAuthGuard` handle receives, matching SvelteKit's `Handle` input. |
| `PublicRoutesDeps` | `interface PublicRoutesDeps { site; render; origin; siteName; description; feeds?; defaultImage? }` | The injected dependencies for `createPublicRoutes`: the site index, the render, and the SEO defaults. |
| `PublicListData` | `interface ListData { entries: ContentSummary[] }` | The public archive and tag list data, re-exported from the public routes as `PublicListData` to avoid colliding with the admin `ListData`. |
| `TagData` | `interface TagData extends ListData { tag: string }` | A single tag's data plus the tag it filtered on. |
| `TagIndexData` | `interface TagIndexData { tags: { tag: string; count: number }[] }` | The tag-index data: every tag with its count. |
| `EntryData` | `interface EntryData { concept; entry; html; canonicalUrl; seo; newer?; older? }` | One public entry's data: the detail entry, its rendered html, and its canonical URL. |
