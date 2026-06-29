# The canonical admin mount

A cairn site mounts the whole `/admin` surface with one catch-all route pair plus one server
composer. The engine's `createCairnAdmin` facade serves every admin view through a single `load`
and a single `actions` record, so the site restates no route table and wires no action names by
hand. The showcase at `examples/showcase` is the working model of this shape; copy its files, not
a guess at them.

This wiring assumes the site sets `csrf: { checkOrigin: false }` in `svelte.config.js`, since
cairn's guard owns CSRF for the admin through a double-submit token. See the
[deploy guide](../guides/deploy-to-cloudflare.md#disable-checkorigin) for that step.

## The route files plus the composer

The catch-all route pair, reproduced from the showcase:

```ts
// src/routes/admin/[...path]/+page.server.ts
// The single-mount admin route: one catch-all serves every /admin view through the engine's
// load and actions. The composition (runtime, deps) lives in $lib/cairn.server.
import { admin } from '$lib/cairn.server.js';

// The admin must never be prerendered; a site that defaults to prerender=true would bake a
// build-time snapshot of a session-gated page.
export const prerender = false;

export const load = admin.load;
export const actions = admin.actions;
```

```svelte
<!-- src/routes/admin/[...path]/+page.svelte -->
<script lang="ts">
  import { CairnAdmin } from '@glw907/cairn-cms/components';
  import type { AdminData } from '@glw907/cairn-cms/sveltekit';
  import { cairn } from '$lib/cairn.config.js';
  import type { ActionData } from './$types';

  let { data, form }: { data: AdminData; form: ActionData } = $props();
</script>

<CairnAdmin {data} {form} render={cairn.rendering.render} registry={cairn.rendering.components} icons={cairn.rendering.icons} />
```

The shared shell layout pair wraps the whole `/admin` subtree in cairn's chrome. The catch-all
`+page.svelte` shown earlier renders bare inside it: the chrome (the sidebar, the top bar, the command palette,
the theme) moved out of `CairnAdmin` into this `/admin/+layout`, so every `/admin/**` route, the
engine's views and any custom screen a site adds, renders inside one shell. Reproduced from the
showcase:

```ts
// src/routes/admin/+layout.server.ts
// The shared admin shell's load: the chrome (nav, user, theme, streamed pending count) for every
// /admin/** route, including a developer's own custom screens.
import { admin } from '$lib/cairn.server.js';

export const load = admin.shellLoad;
```

```svelte
<!-- src/routes/admin/+layout.svelte -->
<script lang="ts">
  import { CairnAdminShell } from '@glw907/cairn-cms/components';
  import type { AdminShellData } from '@glw907/cairn-cms/sveltekit';
  import type { Snippet } from 'svelte';

  let { data, children }: { data: { shell: AdminShellData }; children: Snippet } = $props();
</script>

<CairnAdminShell data={data.shell}>{@render children()}</CairnAdminShell>
```

A site adds its own admin screen by dropping a concrete route under `/admin/` (for example
`/admin/signups`), which wins over the catch-all and renders inside this same shell. See
[Add a custom admin screen](../guides/add-a-custom-admin-screen.md) for the worked route.

The composer builds the runtime once, and every server route that needs it (the admin mount,
`/healthz`) imports it rather than re-running `composeRuntime` per route:

```ts
// src/lib/cairn.server.ts
import { composeRuntime } from '@glw907/cairn-cms';
import { createCairnAdmin } from '@glw907/cairn-cms/sveltekit';
import { cairn, siteConfig } from './cairn.config.js';

export const runtime = composeRuntime({ adapter: cairn, siteConfig });
export const admin = createCairnAdmin(runtime);
```

`createCairnAdmin` defaults the magic-link branding from the runtime's `siteName` and `sender`,
so most sites pass no deps at all. The showcase reads markdown through a fake GitHub backend in
development, which rides `event.locals.backend` from a fenced dev handle rather than through a dep.
A deployed site connects the real backend and mints installation tokens on demand, so it passes no
backend dep.

Keep the `prerender = false` line. The admin is session-gated, and a site that prerenders by
default would otherwise try to bake a build-time snapshot of it; the explicit opt-out keeps the
whole subtree request-time.

## What the catch-all serves

The one route answers every admin URL. `createCairnAdmin`'s load parses `event.url.pathname`
(never the rest param, so an encoded segment cannot confuse the split) and dispatches:

| URL | View | Notes |
| --- | --- | --- |
| `/admin` | index | Redirects to the first concept's list. |
| `/admin/login` | login | The magic-link request form. Public. |
| `/admin/auth/confirm` | confirm | The magic-link landing. Public. |
| `/admin/<concept>` | list | One concept's entries, with create, delete, and publish-all. |
| `/admin/<concept>/<id>` | edit | The entry editor. |
| `/admin/editors` | editors | The owner-gated editor management. |
| `/admin/nav` | nav | The nav tree editor. A 404 unless the adapter configures `editor.nav`. |
| `/admin/media` | media | The media library. |
| `/admin/settings` | settings | The tidy settings screen. |
| `/admin/help` | help | The Help home: getting started, the formatting reference, and the support hand-off. |

Any other shape is a 404, and one trailing slash is tolerated. Logout has no URL of its own; the
admin shell posts it as the named `?/logout` action on whatever page the editor is on.

## The actions vocabulary

`actions` covers the full admin vocabulary in one static record. Each named action parses the
pathname the same way the load does and throws a 404 when the parsed view does not support it,
so a `save` posted to a list URL refuses rather than misfiring:

| Action | Valid views | Delegates to |
| --- | --- | --- |
| `request` | login | the magic-link request |
| `confirm` | confirm | the token confirm |
| `logout` | any parsed view | the session logout |
| `create` | list | the entry create |
| `save` | edit, nav | the entry save, or the nav save (404 without `editor.nav`) |
| `publish` | edit | the entry publish |
| `discard` | edit | the pending-edit discard |
| `rename` | edit | the entry rename |
| `delete` | edit, list | the entry delete (id from the path, or from the form body on a list) |
| `publishAll` | list, edit, editors, nav | the site-wide publish |
| `addEditor`, `removeEditor`, `setRole` | editors | the owner-gated editor management |

The engine's components post these names, so an action-adding release reaches a site through the
version bump alone; there is no per-site action table to keep in sync.

## The guard and the ambient type

The engine's auth guard (`createAuthGuard()`, wired in `hooks.server.ts`) gates the whole
`/admin/*` subtree before any load runs. The mount itself does no access control; the guard owns
it. The guard sets `event.locals.editor`, and one line in `src/app.d.ts` types it:
`import '@glw907/cairn-cms/ambient';` (see the [ambient types reference](./ambient.md)).

A site that already has a `handle` hook (for example, injecting a saved theme into the SSR'd
`<html data-theme>`) keeps it by sequencing the engine guard after its own:

```ts
// src/hooks.server.ts
export const handle = sequence(theme, createAuthGuard());
```

The guard owns `/admin` gating and runs last; the site's hook runs first and sees every request.

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
  admin/+layout.{server.ts,svelte}   the shared shell that wraps every /admin route
  admin/[...path]/      the catch-all mount; outside the chrome
  feed.xml/ sitemap.xml/ robots.txt/ healthz/   endpoints; no layout, stay at the root
```

Group folders are invisible in the URL, so moving the public pages into `(site)/` changes no paths.
Endpoints render no layout, so they stay at the root. The admin sits outside the group, so the host
chrome never wraps it.

A dev-only guard in the admin backs this rule. In development, the admin shell and the login page
walk their ancestor chain on mount, and when a width-constraining ancestor sits between the admin
root and `<body>` they log one `console.error` that names the ancestor and points here. The guard
compiles out of production and changes no rendering.

**A known limitation this rule contains.** The compiled admin stylesheet carries DaisyUI `@keyframes`
and Tailwind `@property` rules that are document-global by CSS spec; a selector scope cannot bound them.
They cause no collision because the sheet is code-split to the routes that import it, and only the admin
roots import it, so it loads only on `/admin`, where this rule keeps the host's CSS away. Two things
preserve that boundary: keep `app.css` in the `(site)` group so it never loads on `/admin`, and do not
import the engine's admin components onto a host page.

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
`ok:false` that also 404s at runtime. The admin mount carries its own `prerender = false`; this
root endpoint needs its own opt-out.

## Per-route mounting (advanced)

The per-surface factories behind the facade (`createAuthRoutes`, `createContentRoutes`,
`createEditorRoutes`, `createNavRoutes`) remain public, so a site that needs to interpose on one
surface, or to mount a single admin view inside its own shell, can wire routes by hand against
them. That path trades the single mount's stability for control: the site then owns its route
tree and must track the action vocabulary across releases itself. The factory signatures, the
view components' named-action contracts, and worked per-route examples live in
[the SvelteKit reference](./sveltekit.md).
