# The /admin mount

## Contents

- [The four route files and the composer](#the-four-route-files-and-the-composer)
- [The root layout must be chrome-free](#the-root-layout-must-be-chrome-free)
- [Hooks, types, and CSRF](#hooks-types-and-csrf)
- [/healthz](#healthz)
- [Per-route mounting](#per-route-mounting)

A scaffolded site already ships this shape; copy it into a hand-built site, or compare against
it when the admin misbehaves. The engine serves every built-in view through one `load` and one
`actions` record, so a site restates no route table and wires no action names; an action-adding
release reaches the site through the version bump alone.

## The four route files and the composer

```ts
// src/chassis/cairn.server.ts: build the runtime once; every server route imports it.
import { composeRuntime } from '@glw907/cairn-cms';
import { createCairnAdmin } from '@glw907/cairn-cms/sveltekit';
import { cairn, siteConfig } from '#theme/cairn.config.js';

export const runtime = composeRuntime({ adapter: cairn, siteConfig });
export const admin = createCairnAdmin({ runtime });
```

```ts
// src/routes/admin/[...path]/+page.server.ts
import { admin } from '#chassis/cairn.server.js';

export const prerender = false;
export const load = admin.load;
export const actions = admin.actions;
```

```svelte
<!-- src/routes/admin/[...path]/+page.svelte -->
<script lang="ts">
  import { CairnAdmin } from '@glw907/cairn-cms/admin';
  import type { AdminData } from '@glw907/cairn-cms/sveltekit';
  import { cairn } from '#theme/cairn.config.js';
  import type { ActionData } from './$types';

  let { data, form }: { data: AdminData; form: ActionData } = $props();
</script>

<CairnAdmin
  {data}
  {form}
  render={cairn.rendering.render}
  registry={cairn.rendering.components}
  icons={cairn.rendering.icons}
/>
```

```ts
// src/routes/admin/+layout.server.ts
import { admin } from '#chassis/cairn.server.js';

export const load = admin.shellLoad;
```

```svelte
<!-- src/routes/admin/+layout.svelte -->
<script lang="ts">
  import { CairnAdminShell } from '@glw907/cairn-cms/admin';
  import type { AdminShellData } from '@glw907/cairn-cms/sveltekit';
  import type { Snippet } from 'svelte';
  import '../../../.cairn/admin.css';

  let { data, children }: { data: { shell: AdminShellData }; children: Snippet } = $props();
</script>

<CairnAdminShell data={data.shell}>{@render children()}</CairnAdminShell>
```

- Keep `prerender = false` on the catch-all. A site that prerenders by default would otherwise
  bake a build-time snapshot of a session-gated page.
- The layout pair is what puts a custom screen inside the shell: every `/admin/**` route renders
  as its children.
- `createCairnAdmin` takes one config with a required `runtime`. Magic-link branding defaults
  from the runtime's `siteName` and sender, so most sites add only `tidy`, `navFilter`, or
  `attention`.

## The root layout must be chrome-free

The root `+layout.svelte` wraps every route, `/admin` included. If it renders a header, a footer,
or a width cap, or imports the site's `app.css`, the admin shell cannot fill the viewport. In dev,
the shell logs one `console.error` naming the width-capping ancestor; rendering is unchanged.

Fix it by moving the public chrome into a URL-transparent group:

```text
src/routes/
  +layout.svelte        bare: {@render children()} and nothing else
  (site)/               the public pages and their layout; URLs do not change
    +layout.svelte      imports app.css, renders nav, <main>, footer
  admin/                the mount above, outside the chrome
  feed.xml/ sitemap.xml/ robots.txt/ healthz/   endpoints stay at the root
```

Keep `app.css` inside `(site)` and never import an engine admin component onto a public page. The
admin sheet's `@keyframes` and `@property` rules are document-global, and they stay harmless only
because the sheet loads on `/admin` alone.

## Hooks, types, and CSRF

The guard gates the whole `/admin` subtree before any `load` runs. A site with its own handle
keeps it first and sequences the guard after it:

```ts
// src/hooks.server.ts
import { sequence } from '@sveltejs/kit/hooks';
import { createAuthGuard } from '@glw907/cairn-cms/sveltekit';
import { runtime } from '#chassis/cairn.server.js';
import { theme } from './theme-handle.js';

export const handle = sequence(theme, createAuthGuard({ runtime }));
```

`src/app.d.ts` types `event.locals.cairnEditor` and the bindings:

<!-- snippet-check-skip: references the site's generated worker-configuration.d.ts, which only a site has -->
```ts
/// <reference types="@cloudflare/workers-types" />
/// <reference path="../worker-configuration.d.ts" />
import '@glw907/cairn-cms/ambient';
```

Write `({}) as Env satisfies CairnPlatformBindings;` in any server module to catch a missing
binding at compile time; a media-enabled site adds `CairnMediaBindings`.

Two CSRF layers apply. SvelteKit's origin check covers every route and runs before any handle; a
form POST with an absent, `null`, or foreign `Origin` gets SvelteKit's plain 403 (`Cross-site POST
form submissions are forbidden`) with no cairn log record. The admin serves
`Referrer-Policy: strict-origin` so that check passes. The guard then requires the double-submit
token (`CsrfField`) on every unsafe form POST under `/admin`. Widening `csrf.trustedOrigins`
widens `/admin` too; the `cairn` tool's `doctor` command flags `'*'` and `'null'`.

## /healthz

A deploy health check needs no session, so it lives at the site root, not under `/admin`:

```ts
// src/routes/healthz/+server.ts
import type { RequestHandler } from './$types';
import { loadHealth } from '@glw907/cairn-cms/sveltekit';
import { runtime } from '#chassis/cairn.server.js';

export const prerender = false;
export const GET: RequestHandler = async (event) => {
  const report = await loadHealth(event, runtime);
  return Response.json(report, { status: report.ok ? 200 : 503 });
};
```

`prerender = false` is required on a site that prerenders by default: without it the build
freezes a permanent `ok: false` taken when the GitHub App key is absent.

## Per-route mounting

`createAuthRoutes`, `createContentRoutes`, `createEditorRoutes`, and `createNavRoutes` stay
public for a site that must interpose on one surface. The site then owns its route tree and
tracks the action vocabulary across releases. The media library is the exception: its nine
janitorial actions (`mediaDelete`, `mediaUpdate`, the replace, alt, bulk delete, and orphan
actions) exist only on `createCairnAdmin`'s runtime object and are absent from
the declared `CairnAdminRoutes` type. `export const actions = admin.actions` still wires them;
`mediaLibraryUpload` is typed on `CairnAdminRoutes`; code that needs the rest typed spreads `{ ...admin.actions }` or casts.
