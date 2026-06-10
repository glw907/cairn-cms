# Canonical admin route structure

This is the route tree a Cairn site mounts to consume the engine's `/admin` surface. Both
production sites (907.life and ecnordic.ski) use it unchanged, and it is the shape the Plan 10
scaffolder should template. The structure is load-bearing: three of its choices fix bugs that a
naive layout hits, called out below. Copy the tree, not a guess at it.

This structure assumes the site sets `csrf: { checkOrigin: false }` in `svelte.config.js`, since
cairn's guard owns CSRF for the admin through a double-submit token. See the
[deploy guide](../guides/deploy-to-cloudflare.md#disable-checkorigin) for that step.

```
src/routes/
  admin/
    +layout.server.ts          # prerender = false only; no session load
    +layout.svelte             # pass-through (<slot/> or {@render children()})
    login/
      +page.server.ts          # createAuthRoutes().loginLoad + requestAction
      +page.svelte
    auth/
      confirm/+page.server.ts  # confirmLoad + confirmAction (magic-link landing)
      confirm/+page.svelte
      logout/+server.ts         # logoutAction
    (app)/                      # URL-transparent group: still /admin/*
      +layout.server.ts        # content.layoutLoad  (the authed shell load)
      +layout.svelte           # AdminLayout
      +page.server.ts          # indexRedirect
      [concept]/+page.server.ts        # listLoad + create/delete/publishAll actions
      [concept]/+page.svelte           # ConceptList
      [concept]/[id]/+page.server.ts   # editLoad + save/publish/discard/delete/rename actions
      [concept]/[id]/+page.svelte      # EditPage
      editors/+page.server.ts  # editor-management loads/actions
      editors/+page.svelte     # ManageEditors
      nav/+page.server.ts      # navLoad + navSave
      nav/+page.svelte         # NavTree
  healthz/
    +server.ts                 # healthLoad at site ROOT, not under /admin
```

## The root layout must be chrome-free

The host root layout wraps every route, including `/admin`. If it renders site chrome (a nav, a
footer, a width-constraining container) or imports the host's `app.css`, that chrome wraps the admin,
and the admin shell cannot fill the viewport. The admin self-styles and does not need the host's CSS,
so the fix is to keep the root layout bare and move all public chrome plus `app.css` into a
URL-transparent `(site)` group.

```
src/routes/
  +layout.svelte        bare: {@render children()} and nothing else
  (site)/               URL-transparent group; the public URLs do not change
    +layout.svelte      imports app.css, renders the nav, <main>, and footer
    +page.svelte ...    the home page and the public pages, moved in
  admin/   ...          unchanged; now outside the chrome
  feed.xml/ sitemap.xml/ robots.txt/ healthz/   endpoints; no layout, stay at the root
```

Group folders are invisible in the URL, so moving the public pages into `(site)/` changes no paths.
Endpoints render no layout, so they stay at the root. The admin sits outside the group, so the host
chrome never wraps it.

A dev-only guard in the admin backs this rule. In development, `AdminLayout` and `LoginPage` walk their
ancestor chain on mount, and when a width-constraining ancestor sits between the admin root and
`<body>` they log one `console.error` that names the ancestor and points here. The guard compiles out
of production and changes no rendering.

**A known limitation this rule contains.** The compiled admin stylesheet carries DaisyUI `@keyframes`
and Tailwind `@property` rules that are document-global by CSS spec; a selector scope cannot bound them.
They cause no collision because the sheet is code-split to the routes that import it, and only the admin
roots import it, so it loads only on `/admin`, where this rule keeps the host's CSS away. Two things
preserve that boundary: keep `app.css` in the `(site)` group so it never loads on `/admin`, and do not
import the engine's admin components onto a host page.

The scaffolder (Plan 10) emits this shape from the start: a bare root layout and a `(site)` group for
the public chrome.

## Why the `(app)` group

`content.layoutLoad` calls `requireSession` and redirects a sessionless visitor to
`/admin/login`. If the login page rendered under that same layout, the redirect would land on a
page whose own layout load redirects again, and the request loops forever.

The fix is the `(app)` route group. SvelteKit group folders (`(app)`) do not appear in the URL,
so every page inside still resolves under `/admin/*`, but only that group runs the
session-requiring `layoutLoad`. The login and auth pages sit as siblings one level up, under a
bare `admin/+layout` that does nothing but mark the subtree dynamic:

```ts
// src/routes/admin/+layout.server.ts
export const prerender = false;
```

```ts
// src/routes/admin/(app)/+layout.server.ts
import { content } from '$lib/cairn.server.js';
export const load = content.layoutLoad;
```

A sessionless visitor to `/admin/posts` runs `layoutLoad`, gets redirected to `/admin/login`,
and the login page renders without ever touching `layoutLoad`. No loop.

The engine's auth guard (`createAuthGuard()`, wired in `hooks.server.ts`) gates the whole
`/admin/*` subtree, so the group boundary is about which pages run the *layout load*, not about
access control.

## Why `/healthz` lives at the site root

The auth guard gates every `/admin/*` path. A deploy health check has to be reachable without a
session, so it cannot live under `/admin`. Mount it at the site root and call the engine's
`healthLoad(event, runtime)` (event first):

```ts
// src/routes/healthz/+server.ts
export const prerender = false;  // see below
export const GET = async (event) => json(await healthLoad(event, runtime));
```

On a site that prerenders by default, the explicit `prerender = false` is required. Without it
the endpoint prerenders at build time, when the GitHub App key is absent, freezing a permanent
`ok:false` that also 404s at runtime. The `/admin` subtree inherits dynamic rendering from its
`+layout.server.ts`; this root endpoint needs its own opt-out.

## Why the editor is `/admin/[concept]/[id]`

The edit page nests under its concept. The engine reads `params.concept` and `params.id`
natively at that path, and `ConceptList` links plus every save, create, and error redirect
target `/admin/<concept>/<id>`. A flat `edit/[type]/[id]` path (the shape the showcase aliased
during Plan 07) 404s on a list click and again after a save, because those redirects point at
the nested path. Use the nested route and skip the aliasing.

## The composer: `$lib/cairn.server.ts`

Each site composes the runtime once and builds all handler groups, so every `+page.server.ts` is
a one-line re-export:

```ts
// src/lib/cairn.server.ts (sketch)
import { composeRuntime, createContentRoutes /* …auth, editor, nav… */ } from '@glw907/cairn-cms/sveltekit';
import { adapter } from './cairn.config.js';

export const runtime = composeRuntime(adapter);
export const content = createContentRoutes(runtime);
// export const auth = createAuthRoutes({ branding: { siteName, from } });
// export const editors = createEditorRoutes();
// export const nav = createNavRoutes(runtime);
```

```ts
// src/routes/admin/(app)/[concept]/+page.server.ts
import { content } from '$lib/cairn.server.js';
export const load = content.listLoad;
export const actions = {
  create: content.createAction,
  delete: content.listDeleteAction,
  publishAll: content.publishAllAction,
};
```

```ts
// src/routes/admin/(app)/[concept]/[id]/+page.server.ts
import { content } from '$lib/cairn.server.js';
export const load = content.editLoad;
export const actions = {
  save: content.saveAction,
  publish: content.publishAction,
  discard: content.discardAction,
  delete: content.deleteAction,
  rename: content.renameAction,
};
```

The list shim's `publishAll` line is load-bearing even on a one-concept site: the topbar's
"Publish site" form posts to the first concept's `?/publishAll` from every admin page.

## Preserving site hooks

A site that already has a `handle` hook (for example, injecting a saved theme into the SSR'd
`<html data-theme>`) keeps it by sequencing the engine guard after its own:

```ts
// src/hooks.server.ts
export const handle = sequence(theme, createAuthGuard());
```

The guard owns `/admin` gating and runs last; the site's hook runs first and sees every request.
