# Canonical admin route structure

This is the route tree a Cairn site mounts to consume the engine's `/admin` surface. Both
production sites (907.life and ecnordic.ski) use it unchanged, and it is the shape the Plan 10
scaffolder should template. The structure is load-bearing: three of its choices fix bugs that a
naive layout hits, called out below. Copy the tree, not a guess at it.

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
      [concept]/+page.server.ts        # listLoad + createAction
      [concept]/+page.svelte           # ConceptList
      [concept]/[id]/+page.server.ts   # editLoad + saveAction
      [concept]/[id]/+page.svelte      # EditPage
      editors/+page.server.ts  # editor-management loads/actions
      editors/+page.svelte     # ManageEditors
      nav/+page.server.ts      # navLoad + navSave
      nav/+page.svelte         # NavTree
  healthz/
    +server.ts                 # healthLoad at site ROOT, not under /admin
```

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
// src/routes/admin/(app)/[concept]/[id]/+page.server.ts
import { content } from '$lib/cairn.server.js';
export const load = content.editLoad;
export const actions = { save: content.saveAction };
```

## Preserving site hooks

A site that already has a `handle` hook (for example, injecting a saved theme into the SSR'd
`<html data-theme>`) keeps it by sequencing the engine guard after its own:

```ts
// src/hooks.server.ts
export const handle = sequence(theme, createAuthGuard());
```

The guard owns `/admin` gating and runs last; the site's hook runs first and sees every request.
