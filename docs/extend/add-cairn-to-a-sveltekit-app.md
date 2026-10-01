# Add cairn to a SvelteKit app

This page takes a SvelteKit app, a new project or one you already have, to a cairn site whose admin commits through a GitHub App you register. The page carries one running example throughout, a site named Field Notes with one post, and each milestone extends the files the one before it wrote.

The work runs in four milestones, each ending with a check:

1. Deploy a bare SvelteKit site to its `workers.dev` address.
2. Install the engine and mount the admin.
3. Put content on disk and render an entry from it.
4. Move the site to production with its own GitHub App, an auth database, and the Worker bindings.

Between the third and fourth milestones, the dev backend signs you in at `/admin` with no email loop. For its setup, see [Wire the dev backend and the CSRF handoff](#wire-the-dev-backend-and-the-csrf-handoff). [Customize the sign-in email](#customize-the-sign-in-email) closes the page with the parts of the sign-in message a site can change.

## Before you begin

This page assumes the following accounts, tools, and services:

- Node 24 or later.
- TypeScript on major version 6, which `npx sv create` already pins, since `svelte-check` cannot run on TypeScript 7 yet.
- A GitHub account and a Cloudflare account.
- Cloudflare's Workers Paid plan from the first deploy that carries the admin.
- A domain whose zone is on your Cloudflare account, which real sign-in mail needs.
- The `cairn` CLI, which runs the production milestone's [`cairn doctor`](../reference/cli-cairn-doctor.md) check.

The first milestone's bare deploy runs on Cloudflare's free tier. Cloudflare's [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) page states each plan's current terms, including the plan that sign-in mail to a second person needs.

## Deploy a bare SvelteKit site

This milestone ends with a plain SvelteKit site, with no cairn code yet, answering at its `workers.dev` address. It starts from an empty directory. An existing app starts at the adapter swap and skips the step that creates the project.

### Create the project and name its adapter

A fresh `sv create` project uses `@sveltejs/adapter-auto` as its adapter. `adapter-auto` picks an adapter at build time by guessing the deploy target, so a self-deployed site names `@sveltejs/adapter-cloudflare` explicitly. A scaffolded cairn site builds with the same adapter and deploys to Cloudflare Workers.

To create the project and swap its adapter, follow these steps:

1. In a terminal, create a minimal TypeScript project with no add-ons:

   ```bash
   npx sv create --template minimal --types ts --no-add-ons field-notes
   cd field-notes
   ```

2. In the project directory, replace the scaffold's adapter with the Cloudflare one:

   ```bash
   npm uninstall @sveltejs/adapter-auto
   npm install -D @sveltejs/adapter-cloudflare
   ```


### Point the kit config at Cloudflare

A current `sv create` scaffold has no `svelte.config.js`, so the kit config, the adapter included, sits inline in the `sveltekit()` call in `vite.config.ts`. That call takes the kit options, such as `adapter` and `csrf`, as sibling keys beside the compiler options. The `sv create` scaffold also passes `compilerOptions` to that call, and its `runes` option forces runes mode for every file outside `node_modules`. Each `vite.config.ts` sample on this page shows that setting as a comment, and every edit leaves the setting in place. An existing app that keeps its kit config in `svelte.config.js` makes each kit edit on this page in that file instead.

```text
field-notes/
├── src/
├── package.json
└── vite.config.ts
```

- In `vite.config.ts`, import the Cloudflare adapter and pass it as the `adapter` option:

```ts
// vite.config.ts
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    sveltekit({
      // compilerOptions stays as sv create wrote it.
      adapter: adapter(),
    }),
  ],
});
```

### Describe the Worker to Wrangler

The minimal `wrangler.jsonc` names the Worker, sets a compatibility date, and points `main` and the `ASSETS` assets binding at the Cloudflare adapter's build output.

```text
field-notes/
├── src/
├── package.json
├── vite.config.ts
└── wrangler.jsonc
```

- In the project root, create `wrangler.jsonc`:

```jsonc
// wrangler.jsonc
{
  "name": "field-notes",
  "compatibility_date": "2026-09-01",
  "main": ".svelte-kit/cloudflare/_worker.js",
  "assets": { "directory": ".svelte-kit/cloudflare", "binding": "ASSETS" }
}
```

### Deploy the bare site

`npx wrangler login` signs Wrangler in to Cloudflare, and `npx wrangler deploy` uploads the built Worker and prints its `workers.dev` address.

To deploy the site, follow these steps:

1. In the project directory, sign in to Cloudflare:

   ```bash
   npx wrangler login
   ```

2. Build the site and upload the Worker:

   ```bash
   npm run build
   npx wrangler deploy
   ```


### Verify the deployed site

The deploy output ends with an address of the form `<worker name>.<account subdomain>.workers.dev`, which serves the site with no domain purchase or DNS change.

To confirm the milestone, follow these steps:

1. In a browser, open the address the deploy printed.
2. Confirm that the page the scaffold wrote loads.

### Checklist before the engine

Before you continue, confirm that you can do the following:

- Name the Cloudflare adapter explicitly in the `sveltekit()` call in `vite.config.ts`.
- Deploy the Worker and load it at its `workers.dev` address.

## Install and wire the engine

This milestone installs the engine, gives it a site config and a minimal adapter, and mounts the admin through one catch-all route and a shared layout. It starts from the deployed bare site. The admin answers only once the dev backend or real bindings exist, so this milestone ends with a clean build, and the sign-in check waits for the dev backend.

### Install the engine and its peer

The engine's shipped type declarations import `D1Database` and `R2Bucket` from `@cloudflare/workers-types`, which makes that package a required peer at `^5`.

- In the project directory, install the engine and its peer:

  ```bash
  npm install @glw907/cairn-cms
  npm install -D @cloudflare/workers-types
  ```


### Let Vite compile the engine

The package ships its `.svelte` files as source under its `svelte` export condition, so the site's Svelte plugin must compile them. Without a `noExternal` entry, the admin components fail to build.

- In `vite.config.ts`, add an `ssr` block that lists the engine under `noExternal`:

```ts
// vite.config.ts
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    sveltekit({
      // compilerOptions stays as sv create wrote it.
      adapter: adapter(),
    }),
  ],
  ssr: { noExternal: ['@glw907/cairn-cms'] },
});
```

### Import the ambient types

`src/app.d.ts` imports `@glw907/cairn-cms/ambient` to augment `App.Locals` with the five fields the engine reads and writes on every admin request. A custom route that reads `event.platform.env` needs `App.Platform` declared separately.

```text
field-notes/
└── src/
    └── app.d.ts
```

- In `src/app.d.ts`, add the import:

```ts
// src/app.d.ts
import '@glw907/cairn-cms/ambient';

declare global {
  namespace App {
    // interface Platform {}
  }
}

export {};
```

### Write the site config

The site config is a YAML mapping whose one required key, `siteName`, names the site in the admin shell and in the sign-in email's subject. [`parseSiteConfig`](../reference/core.md#parsesiteconfig) rejects any top-level key outside the set it knows. `parseSiteConfig` passes the optional `description`, `author`, and `locale` keys through without reading them, for the site's code to use.

```text
field-notes/
└── src/
    └── lib/
        └── site.config.yaml
```

- In `src/lib`, create `site.config.yaml`:

```yaml
siteName: Field Notes
description: Notes from the trail.
```

### Declare a minimal adapter

The adapter declares one concept for posts, a renderer, and the backend and sender values that take effect only in production. `createGithubApp` builds a provider from its five strings with no network call and no validation, so placeholder values serve until the production milestone.

```text
field-notes/
└── src/
    └── lib/
        ├── cairn.config.ts
        └── site.config.yaml
```

- In `src/lib`, create the adapter module, which exports the adapter as `cairn` beside the parsed `siteConfig`:

```ts
// src/lib/cairn.config.ts
import {
  createGithubApp,
  createRenderer,
  defineAdapter,
  defineConcept,
  defineFieldset,
  defineRegistry,
  fields,
  parseSiteConfig,
} from '@glw907/cairn-cms';
import siteYaml from './site.config.yaml?raw';

const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }));

export const cairn = defineAdapter({
  content: {
    posts: defineConcept({
      dir: 'src/content/posts',
      label: 'Posts',
      singular: 'post',
      routing: 'feed',
      fields: defineFieldset({
        title: fields.text({ label: 'Title', required: true }),
        date: fields.date({ label: 'Date' }),
        description: fields.textarea({ label: 'Description' }),
      }),
    }),
  },
  // Placeholders: the dev backend stands in for both until production.
  backend: createGithubApp({
    owner: 'your-account',
    repo: 'field-notes',
    branch: 'main',
    appId: '0',
    installationId: '0',
  }),
  email: { from: 'cms@example.com' },
  rendering: {
    render: ({ body, resolve, resolveMedia, resolveFragment }) =>
      renderMarkdown(body, { resolve, resolveMedia, resolveFragment }),
  },
});

export const siteConfig = parseSiteConfig(siteYaml);
```

`defineRegistry({ components: [] })` gives an empty component registry, and `createRenderer(registry)` returns the `renderMarkdown` that the adapter's `rendering.render` calls. For every other adapter option, see the [`defineAdapter`](../reference/core.md#defineadapter) entry.

### Compose the runtime and the admin

[`composeRuntime`](../reference/core.md#composeruntime) combines the adapter and the parsed site config into the runtime. [`createCairnAdmin`](../reference/sveltekit.md#createcairnadmin) returns the `load`, `actions`, and `shellLoad` a single-mount admin exports. The `bootstrapOwner` pair names the site's first owner. When that email requests a sign-in while the `editor` table is empty, the engine inserts the owner row before the allowlist lookup, so the first sign-in proceeds like any allow-listed editor's. A non-matching email or a non-empty table grants nothing.

```text
field-notes/
└── src/
    └── lib/
        ├── cairn.config.ts
        ├── cairn.server.ts
        └── site.config.yaml
```

- In `src/lib`, create the server module, with your email and name in `bootstrapOwner`:

```ts
// src/lib/cairn.server.ts
import { composeRuntime } from '@glw907/cairn-cms';
import { createCairnAdmin } from '@glw907/cairn-cms/sveltekit';
import { cairn, siteConfig } from './cairn.config.js';

export const runtime = composeRuntime({ adapter: cairn, siteConfig });

export const admin = createCairnAdmin({
  runtime,
  auth: {
    bootstrapOwner: { email: 'you@example.com', displayName: 'Your Name' },
  },
});
```

### Mount the admin routes

The admin mounts as a catch-all page that renders `CairnAdmin` and a shared layout that renders `CairnAdminShell`, both imported from `@glw907/cairn-cms/admin`. The catch-all route module exports `prerender = false`, because a site that prerenders by default would otherwise bake a build-time snapshot of a session-gated page.

```text
field-notes/
└── src/
    └── routes/
        └── admin/
            ├── [...path]/
            │   ├── +page.server.ts
            │   └── +page.svelte
            ├── +layout.server.ts
            └── +layout.svelte
```

- Create the catch-all route module, which exports the admin's `load` and `actions`:

```ts
// src/routes/admin/[...path]/+page.server.ts
import { admin } from '$lib/cairn.server.js';

export const prerender = false;

export const load = admin.load;
export const actions = admin.actions;
```

- Create the catch-all page, which passes `CairnAdmin` the route's `data` and `form` and the adapter's `render`:

```svelte
<!-- src/routes/admin/[...path]/+page.svelte -->
<script lang="ts">
  import { CairnAdmin } from '@glw907/cairn-cms/admin';
  import type { AdminData } from '@glw907/cairn-cms/sveltekit';
  import { cairn } from '$lib/cairn.config.js';
  import type { ActionData } from './$types';

  let { data, form }: { data: AdminData; form: ActionData } = $props();
</script>

<CairnAdmin {data} {form} render={cairn.rendering.render} />
```

- Create the layout server module, which exports the admin's `shellLoad`:

```ts
// src/routes/admin/+layout.server.ts
import { admin } from '$lib/cairn.server.js';

export const load = admin.shellLoad;
```

- Create the layout, which renders `CairnAdminShell` over the layout load's `shell` data:

```svelte
<!-- src/routes/admin/+layout.svelte -->
<script lang="ts">
  import { CairnAdminShell } from '@glw907/cairn-cms/admin';
  import type { AdminShellData } from '@glw907/cairn-cms/sveltekit';
  import type { Snippet } from 'svelte';

  let { data, children }: { data: { shell: AdminShellData }; children: Snippet } = $props();
</script>

<CairnAdminShell data={data.shell}>{@render children()}</CairnAdminShell>
```

### Verify the build

To confirm the milestone, follow these steps:

1. In the project directory, build the site:

   ```bash
   npm run build
   ```

2. Confirm that the build finishes with no error.

### Checklist before content

Before you continue, confirm that you can do the following:

- Say why the engine is listed under `noExternal` in `vite.config.ts`.
- Trace the runtime from the adapter through `composeRuntime` to the admin.
- Name the three exports the admin routes read from `createCairnAdmin`.

## Put content on disk

This milestone adds a posts directory with one markdown entry, builds the typed content index over it, and renders the entry at its permalink. It starts from the build the engine milestone left.

### Add the first entry

Content is markdown files with YAML frontmatter, one directory per concept, named by the concept's `dir`. The entry's frontmatter carries `title`, `date`, and `description`, the fields the posts concept declares.

```text
field-notes/
└── src/
    └── content/
        └── posts/
            └── 2026-08-14-hello.md
```

- In `src/content/posts`, create the entry file the tree shows:

```md
---
title: Hello
date: 2026-08-14
description: The first entry on Field Notes.
---

The first post on the site, written in plain markdown.
```

### Build the content index

Vite needs each glob's literal pattern at its call site, so the site passes [`createSiteIndexes`](../reference/delivery-data.md#createsiteindexes) one literal `import.meta.glob` per concept. `createSiteIndexes` throws at build time for a declared concept with no glob.

```text
field-notes/
└── src/
    └── lib/
        ├── cairn.config.ts
        ├── cairn.server.ts
        ├── content.ts
        └── site.config.yaml
```

- In `src/lib`, create the content module, which passes the posts glob to `createSiteIndexes`:

```ts
// src/lib/content.ts
import { createSiteIndexes } from '@glw907/cairn-cms/delivery';
import { cairn, siteConfig } from './cairn.config.js';

const postsRaw = import.meta.glob('/src/content/posts/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const indexes = createSiteIndexes(cairn, siteConfig, { posts: postsRaw });

export const site = indexes.site;

// The local dev origin, until production names the deployed one.
export const origin = 'http://localhost:5173';
```

The `origin` constant names the local origin until the production milestone points it at the deployed one.

### Add the manifest plugin

The [`cairnManifest`](../reference/vite.md#cairnmanifest) plugin reads every path it takes as app-root-absolute. `configModule` names the module that exports `cairn` and `siteConfig`, and `content` maps each concept id to its glob. The manifest lands at `/src/content/.cairn/index.json` unless `manifestPath` names another path.

- In the Vite config, add the plugin:

```ts
// vite.config.ts
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { cairnManifest } from '@glw907/cairn-cms/vite';

export default defineConfig({
  plugins: [
    sveltekit({
      // compilerOptions stays as sv create wrote it.
      adapter: adapter(),
    }),
    cairnManifest({
      configModule: '/src/lib/cairn.config.ts',
      content: { posts: '/src/content/posts/*.md' },
    }),
  ],
  ssr: { noExternal: ['@glw907/cairn-cms'] },
});
```

The build then verifies the committed manifest against the markdown on disk, so the manifest has to exist before the next build.

To write and commit the manifest, follow these steps:

1. In the project directory, write the manifest:

   ```bash
   npx cairn-manifest
   ```

2. Commit the manifest with the entry:

   ```bash
   git add src/content
   git commit -m "Add the first post and its manifest"
   ```

The [manifest command's reference](../reference/cli-cairn-manifest.md) covers when to write the manifest again.

### Render the entry

The entry route is a prerendered catch-all built on the engine's public routes. Its load data carries the `entry`, its rendered `html`, its `canonicalUrl`, and its `seo` metadata. The entry page in this milestone renders only `html`, and [`CairnHead`](../reference/delivery.md#cairnhead) from `@glw907/cairn-cms/delivery/head` takes the `seo` data as its `seo` prop. The [public routes reference](../reference/delivery.md#createpublicroutes) documents the loader and its config.

```text
field-notes/
└── src/
    └── routes/
        ├── [...path]/
        │   ├── +page.server.ts
        │   └── +page.svelte
        └── admin/
```

- Create the entry route module:

```ts
// src/routes/[...path]/+page.server.ts
import type { EntryGenerator, PageServerLoad } from './$types';
import { createPublicRoutes } from '@glw907/cairn-cms/delivery';
import { cairn, siteConfig } from '$lib/cairn.config.js';
import { origin, site } from '$lib/content.js';

export const prerender = true;

const routes = createPublicRoutes({
  site,
  render: cairn.rendering.render,
  origin,
  siteName: siteConfig.siteName,
  description: siteConfig.description ?? '',
});

export const entries: EntryGenerator = () => routes.entries();

export const load: PageServerLoad = ({ url }) => routes.entryLoad({ url });
```

- Create the entry page:

```svelte
<!-- src/routes/[...path]/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<article>{@html data.html}</article>
```

### Verify the rendered entry

Every concept except `pages` defaults to the permalink `/<id>/:slug`, and the default `datePrefix` of `day` strips the filename's date stem from the slug.

To confirm the milestone, follow these steps:

1. In the project directory, start the dev server:

   ```bash
   npm run dev
   ```

2. In a browser, open the entry's permalink:

   ```text
   http://localhost:5173/posts/hello
   ```

3. Confirm that the entry's body renders.

The entry renders as unstyled markup, since the site loads no style sheet yet. The engine ships its public defaults as one style sheet, `@glw907/cairn-cms/cairn-public.css`, which the [public style sheet reference](../reference/public-css.md) documents. Tailwind and daisyUI are optional peers of the engine, so a site installs them only when its pages use them.

### Resolve a content build failure

The content wiring fails in three ways, and only the first two stop the build:

- A declared concept with no glob passed to `createSiteIndexes` throws at build time, until the content module passes that concept's glob.
- A committed manifest that has drifted from the markdown on disk fails the build, until you write the manifest again and commit it.
- A concept missing from the plugin's `content` option produces zero manifest rows for that concept, with no error, until you add its glob to `content`.

### Add an about page

Add a `pages` concept at `src/content/pages` with one `about.md` entry, then load the page in the dev server. The `pages` concept defaults to the permalink `/:slug`, so the page's address carries no concept segment. When you finish, compare your edits with [Show me the steps](#show-me-the-steps).

#### Show me the steps

The answer takes the following steps:

1. In the adapter's `content` group, add a `pages` concept whose `dir` is `src/content/pages`.
2. In the content module, pass a second literal glob to `createSiteIndexes`.
3. In the Vite config, add the same glob to the plugin's `content` option, since a concept missing there produces zero rows.
4. Create `about.md` in `src/content/pages`, with a `title` in its frontmatter.
5. Write the manifest again.
6. In a browser, open the page at its address:

   ```text
   http://localhost:5173/about
   ```


The three module edits read as follows:

<!-- snippet-check-skip: three excerpts from the adapter, content, and Vite config files shown whole earlier -->
```ts
// src/lib/cairn.config.ts, inside content
pages: defineConcept({
  dir: 'src/content/pages',
  label: 'Pages',
  singular: 'page',
  fields: defineFieldset({
    title: fields.text({ label: 'Title', required: true }),
  }),
}),

// src/lib/content.ts
const pagesRaw = import.meta.glob('/src/content/pages/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const indexes = createSiteIndexes(cairn, siteConfig, { posts: postsRaw, pages: pagesRaw });

// vite.config.ts, inside cairnManifest
content: {
  posts: '/src/content/posts/*.md',
  pages: '/src/content/pages/*.md',
},
```

### Checklist before the dev backend

Before you continue, confirm that you can do the following:

- Place an entry in the directory its concept's `dir` names.
- Tell a manifest drift failure from a concept left out of the plugin's `content` option.

## Wire the dev backend and the CSRF handoff

This section wires the dev backend for a local sign-in and hands CSRF for the admin to the engine's guard. It starts from the site that renders its first entry.

The dev backend is `devBackendHandle` from `@glw907/cairn-cms-dev`. It installs an in-memory GitHub backend, a fake `AUTH_DB`, and a fake media bucket, and it mints an owner editor on `/admin`, so no email loop runs. Its state lasts as long as the server process, and no save or publish leaves the machine.

Three layers keep the dev package out of a deployed site:

- The `__CAIRN_DEV_BUILD__` define strips it from a production bundle.
- `@glw907/cairn-cms-dev` installs as a `devDependency`.
- The admin guard refuses to serve a production build that has `CAIRN_DEV_BACKEND` set.

### Install the dev package

- In the project directory, install the dev package as a development dependency:

  ```bash
  npm install -D @glw907/cairn-cms-dev
  ```


### Define the build flag and hand off CSRF

Vite's `define` folds a literal only within the module that names it, so every call site names `__CAIRN_DEV_BUILD__` directly, never through a shared exported constant. A constant exported from one module and imported into another survives the fold and ships the dev-backend import in the deployed Worker.

SvelteKit's origin check runs ahead of any handle and would reject a JavaScript-free form POST that arrives without an `Origin` header. The admin guard's double-submit token tolerates the missing header, so the site sets `csrf: { checkOrigin: false }` to leave CSRF to the guard. The setting turns the check off for every route, and the guard restores an equivalent strict `Origin` check on every route outside `/admin`. `checkOrigin` is deprecated as of SvelteKit 2.61 in favor of `csrf.trustedOrigins`, and it stays supported across the engine's tested range. The [`checkOrigin` deprecation](../reference/supported-toolchain.md#the-checkorigin-deprecation) section tracks the change, and the [security model](security-model.md) sets out the CSRF design.

- In `vite.config.ts`, add the define plugin and the CSRF handoff:

```ts
// vite.config.ts
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';
import { cairnManifest } from '@glw907/cairn-cms/vite';

// True while Vite serves the site, false in a build.
function devBuildDefine(): Plugin {
  return {
    name: 'cairn-dev-build-define',
    config(_config, { command }) {
      return { define: { __CAIRN_DEV_BUILD__: JSON.stringify(command === 'serve') } };
    },
  };
}

export default defineConfig({
  plugins: [
    devBuildDefine(),
    sveltekit({
      // compilerOptions stays as sv create wrote it.
      adapter: adapter(),
      // The engine's guard owns CSRF for the admin.
      csrf: { checkOrigin: false },
    }),
    cairnManifest({
      configModule: '/src/lib/cairn.config.ts',
      content: { posts: '/src/content/posts/*.md' },
    }),
  ],
  ssr: { noExternal: ['@glw907/cairn-cms'] },
});
```

- In `src/app.d.ts`, declare the define as a global boolean:

```ts
// src/app.d.ts
import '@glw907/cairn-cms/ambient';

declare global {
  const __CAIRN_DEV_BUILD__: boolean;

  namespace App {
    // interface Platform {}
  }
}

export {};
```

### Pick the handle in the hooks

The hooks module picks between `devBackendHandle` and [`createAuthGuard`](../reference/sveltekit.md#createauthguard) in one `if`. Its test reads the build-time `__CAIRN_DEV_BUILD__` define directly first and the runtime opt-in `CAIRN_DEV_BACKEND === '1'` second. Importing `devBackendHandle` dynamically behind the define keeps a default build from carrying it. `createAuthGuard` takes an optional config, and a bare call is valid.

```text
field-notes/
└── src/
    ├── app.d.ts
    └── hooks.server.ts
```

- In the `src` directory, create the hooks module:

<!-- snippet-check-skip: reads the __CAIRN_DEV_BUILD__ global that the site declares in its ambient types file -->
```ts
// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { createAuthGuard } from '@glw907/cairn-cms/sveltekit';

let handle: Handle;
if (__CAIRN_DEV_BUILD__ && process.env.CAIRN_DEV_BACKEND === '1') {
  const { devBackendHandle } = await import('@glw907/cairn-cms-dev');
  handle = devBackendHandle();
} else {
  handle = createAuthGuard();
}

export { handle };
```

### Start the dev server on the dev backend

- In the project directory, start the dev server with `CAIRN_DEV_BACKEND` set to `1`:

  ```bash
  CAIRN_DEV_BACKEND=1 npm run dev
  ```


The inline `NAME=1 command` form works only in POSIX shells. On Windows, start the dev server with the command for your shell:

- In `cmd.exe`, run `set "CAIRN_DEV_BACKEND=1" && npm run dev`.
- In PowerShell, run `$env:CAIRN_DEV_BACKEND=1; npm run dev`.

The quotes in the `cmd.exe` form keep a trailing space out of the value, which the `=== '1'` test would otherwise read as unset.

### Verify the dev sign-in

To confirm the section, follow these steps:

1. In a browser, open `/admin` on the dev server.
2. Confirm that the admin opens signed in as an owner, with no sign-in email.
3. In the admin's list, open a post.
4. In the editor, change a line.
5. In the editor, save the edit.
6. Confirm that the save completes against the in-memory backend, with nothing sent to GitHub.

`bootstrapOwner` does nothing while the dev backend is active, since the dev backend signs in without touching the auth store.

When the admin does not open signed in, check the following in order:

1. Check that the dev server started with `CAIRN_DEV_BACKEND` set to `1`.
2. Check that the hooks module reads `__CAIRN_DEV_BUILD__` itself, with no imported constant in its place.

### Checklist before production

Before you continue, confirm that you can do the following:

- Say why every call site names `__CAIRN_DEV_BUILD__` directly.
- Say why the site turns `checkOrigin` off.
- Sign in at `/admin` on the dev backend with no email.

## Move the site to production

This milestone replaces the dev backend's fakes with a GitHub App you register, a D1 auth database, and the Worker bindings and secret. It ends with a deploy whose sign-in works, and it starts from a site that signs in on the dev backend.

### Register the GitHub App

Each site registers its own GitHub App, since the engine ships no App and no shared credential. The engine commits through the App's installation token, with the signed-in editor as the commit's author.

To register and install the App, follow these steps:

1. If the project is not on GitHub yet, push it to a GitHub repository.
2. On GitHub, open the form that [registers a GitHub App](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app).
3. In the form, enter any name and homepage URL, since the engine never reads either.
4. In the form, turn the webhook off, since cairn never receives a webhook.
5. In the form, grant the repository permission **Contents** at **Read and write**, and grant no other permission.
6. In the form, create the App.
7. On the App's settings page, note the App ID.
8. On the App's settings page, generate a private key, following GitHub's page on [managing private keys for GitHub Apps](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/managing-private-keys-for-github-apps).
9. On the App's settings page, install the App on the repository owner's account, following GitHub's page on [installing your own GitHub App](https://docs.github.com/en/apps/using-github-apps/installing-your-own-github-app).
10. In the installation form, grant the App access to the site's repository.
11. In the installation settings address that GitHub opens after the install, note the trailing number, which is the Installation ID.

The **Contents** permission is repository-wide, and only engine code confines writes to the declared content directories. Installing the App on a repository that also holds code or other teams' content puts that content inside the token's write reach. The [security model](security-model.md) covers the reasoning behind that reach.

### Pass the App identity to the adapter

The App ID and Installation ID identify the App and grant nothing, so they sit in the adapter source and pass directly into `createGithubApp`. `createGithubApp` takes `owner`, `repo`, `branch`, `appId`, and `installationId`, all required strings, with `branch` the backend's default branch.

To point the adapter at the App, follow these steps:

1. In the adapter module, replace the `createGithubApp` placeholders with your repository and App values.
2. In the same module, set the `email` group's `from` to the address that sends sign-in mail.

<!-- snippet-check-skip: two members of the adapter object that the engine milestone shows whole -->
```ts
// src/lib/cairn.config.ts, the backend and email members
backend: createGithubApp({
  owner: 'your-account',
  repo: 'field-notes',
  branch: 'main',
  appId: '123456',
  installationId: '7890123',
}),
email: { from: 'cms@notes.example.com' },
```

### Store the private key as a Worker secret

The `.pem` file is the credential that signs the App's requests for installation tokens, so it stays out of the repository and lives only as the Worker secret `GITHUB_APP_PRIVATE_KEY_B64`. The engine decodes the secret with `atob()` before signing, so the value is the PEM's base64 encoding on a single line.

To store the key, follow these steps:

1. In the project directory, encode the downloaded key onto one line and pipe it into the secret, replacing the path with the file's location:

   ```bash
   base64 < ~/Downloads/your-app.private-key.pem | tr -d '\n' | npx wrangler secret put GITHUB_APP_PRIVATE_KEY_B64
   ```

2. Store the `.pem` file outside every repository, so git never tracks it.

### Confirm the guard refuses a site with no database

A production build with no dev backend and no `AUTH_DB` binding runs the real guard. The guard answers every `/admin` path, the login path included, with a branded HTTP 500 page. Seeing that page before the database exists confirms that the deployed build runs the real guard, with the dev backend dropped.

To see the refusal, follow these steps:

1. In the project directory, build and deploy the site:

   ```bash
   npm run build
   npx wrangler deploy
   ```

2. In a browser, open `/admin` at the deployed address.
3. Confirm that the page shows the heading **Wrangler bindings are missing**.

### Create the auth database

The engine reads the auth database through the `AUTH_DB` binding. The package ships five migrations under `migrations/`. A site copies the ones it needs into its `migrations_dir`.

The following list names each migration and when a site applies it:

- `0000_auth.sql`, which every site applies.
- `0004_login_nonce.sql`, which every site applies.
- `0001_roles.sql`, which a site applies only for a role vocabulary beyond the default owner and editor pair.
- `0003_preview.sql`, which a site applies only for draft-preview links.
- `0002_audit.sql`, which belongs on an optional audit database with a separate binding.

The `0004_login_nonce.sql` migration binds a sign-in token to the browser that requested it, and a store call against a database without it fails with an error naming that file.

To create and migrate the database, follow these steps:

1. In the project directory, create the database, and note the database id in the output:

   ```bash
   npx wrangler d1 create field-notes-auth
   ```

2. Copy the two migrations every site applies into a directory of the site's:

   ```bash
   mkdir -p migrations
   cp node_modules/@glw907/cairn-cms/migrations/0000_auth.sql migrations/
   cp node_modules/@glw907/cairn-cms/migrations/0004_login_nonce.sql migrations/
   ```

3. In the Wrangler config, bind the database as `AUTH_DB`, with `migrations_dir` pointing at the copied directory:

   ```jsonc
   "d1_databases": [
     {
       "binding": "AUTH_DB",
       "database_name": "field-notes-auth",
       "database_id": "<the id from the create output>",
       "migrations_dir": "migrations"
     }
   ]
   ```

4. Apply the migrations to the remote database:

   ```bash
   npx wrangler d1 migrations apply field-notes-auth --remote
   ```


The same command with `--local` applies them to the local development database.

The `0002_audit.sql` table belongs on a separate D1 binding such as `AUDIT_DB`, with a separate `migrations_dir`. That keeps audit writes off the database that serves session and token lookups. The [`createD1AuditSink`](../reference/sveltekit.md#created1auditsink) entry shows the hook that writes to it.

### Add the Email Sending binding

Sign-in mail goes out through the `EMAIL` binding, which needs the domain in `PUBLIC_ORIGIN` onboarded for Cloudflare Email Sending. A `workers.dev` subdomain has no zone to onboard, so the production site runs on a domain of your own. `PUBLIC_ORIGIN` is the canonical origin for sign-in links, and an unset or invalid value throws `config.public-origin-invalid`.

To add the binding, follow these steps:

1. In the project directory, onboard the domain for Email Sending:

   ```bash
   npx wrangler email sending enable notes.example.com
   ```

2. Serve the Worker on that domain, following Cloudflare's page on [Workers custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).
3. In `wrangler.jsonc`, add the `EMAIL` binding and set `PUBLIC_ORIGIN` to the deployed origin:

   ```jsonc
   // wrangler.jsonc
   {
     "name": "field-notes",
     "compatibility_date": "2026-09-01",
     "main": ".svelte-kit/cloudflare/_worker.js",
     "assets": { "directory": ".svelte-kit/cloudflare", "binding": "ASSETS" },
     "send_email": [{ "name": "EMAIL" }],
     "d1_databases": [
       {
         "binding": "AUTH_DB",
         "database_name": "field-notes-auth",
         "database_id": "<the id from the create output>",
         "migrations_dir": "migrations"
       }
     ],
     "vars": { "PUBLIC_ORIGIN": "https://notes.example.com" }
   }
   ```


A site that sends through another provider passes a `SendMagicLink` as `auth.send`, and that sender receives the same built magic-link message as the built-in sender. [Edit the message in a custom sender](#edit-the-message-in-a-custom-sender) shows the sender's shape.

### Point the site at production

The hooks module needs no edit, because `__CAIRN_DEV_BUILD__` is `false` on a production build and the build drops the dev-backend import. The adapter and the Wrangler config already carry their production values, so the content module's `origin` is the last edit. The entry route builds each entry's canonical URL from `origin` plus the permalink, and the same origin anchors its `og:url` and image URLs. A prerendered route writes that origin into the build output, so `origin` names the deployed origin before the production build.

- In the content module, set `origin` to the deployed origin, the same value as `PUBLIC_ORIGIN`.

### Verify the production site

`cairn doctor`, run with no flags from the site's directory, has a `config.bindings` check that confirms `AUTH_DB` and `EMAIL` are both wired. No command checks the GitHub App itself, so the last check is a manual publish whose commit lands on `main`.

To confirm the milestone, follow these steps:

1. In the project directory, run `cairn doctor`:

   ```bash
   cairn doctor
   ```

2. In the output, confirm that the `config.bindings` check passes.
3. Build and deploy the site:

   ```bash
   npm run build
   npx wrangler deploy
   ```

4. On the deployed origin, request a sign-in to the admin with the `bootstrapOwner` email.
5. In the sign-in email, open the link.
6. In the admin, open the hello post.
7. In the editor, change a line.
8. In the editor, publish the edit.
9. On GitHub, confirm that the commit lands on `main`.

   The commit's author is the signed-in editor.


The first real sign-in creates the owner row and logs [`editor.bootstrapped`](../reference/log-events.md). The [`cairn doctor` checks table](../reference/cli-cairn-doctor.md#the-checks) describes the command's other checks.

### Checklist for production

Before you finish, confirm that you can do the following:

- Register a GitHub App with one repository permission and no webhook.
- Store the App's private key as a single-line base64 Worker secret.
- Apply the two migrations every site needs to the auth database.
- Read a passing `config.bindings` check from `cairn doctor`.

## Customize the sign-in email

The sign-in email is engine copy, and a site changes its site name and sender through `auth.branding` and anything else through a custom `auth.send`. The subject is “Sign in to” followed by the site name. The body carries the fixed sentence “The link expires in 10 minutes.” By default, the site name comes from the site config and the sender from the adapter's `email` group.

### Rebrand the email

A supplied `branding` takes `siteName` and `from` as required strings and `replyTo` as one optional address, and it replaces the default whole. A `branding` that leaves `replyTo` off sends with no `replyTo` address even when the adapter's `email` group sets one.

- In the server module, pass `auth.branding` in the admin's `auth` config:

```ts
// src/lib/cairn.server.ts
import { composeRuntime } from '@glw907/cairn-cms';
import { createCairnAdmin } from '@glw907/cairn-cms/sveltekit';
import { cairn, siteConfig } from './cairn.config.js';

export const runtime = composeRuntime({ adapter: cairn, siteConfig });

export const admin = createCairnAdmin({
  runtime,
  auth: {
    bootstrapOwner: { email: 'you@example.com', displayName: 'Your Name' },
    branding: {
      siteName: 'Field Notes',
      from: 'cms@notes.example.com',
      replyTo: 'editor@notes.example.com',
    },
  },
});
```

### Edit the message in a custom sender

A custom `auth.send` is a `SendMagicLink` that receives the built `MagicLinkMessage`, with `to`, `from`, `subject`, `html`, and `text`, plus optional `cc`, `bcc`, `replyTo`, and `attachments`. Its `replyTo` takes a single address string. The engine truncates the text of anything the sender throws and scrubs token values from it before it reaches the log. A thrown message must never embed the message body or the sign-in link.

- In the server module, pass a sender that edits the message before it sends it:

```ts
// src/lib/cairn.server.ts
import { composeRuntime } from '@glw907/cairn-cms';
import { createCairnAdmin, type SendMagicLink } from '@glw907/cairn-cms/sveltekit';
import { cairn, siteConfig } from './cairn.config.js';

export const runtime = composeRuntime({ adapter: cairn, siteConfig });

const send: SendMagicLink = async (env, message) => {
  if (!env.EMAIL) throw new Error('The EMAIL binding is not wired.');
  await env.EMAIL.send({ ...message, subject: `${message.subject}: your sign-in link` });
};

export const admin = createCairnAdmin({
  runtime,
  auth: {
    bootstrapOwner: { email: 'you@example.com', displayName: 'Your Name' },
    send,
  },
});
```

### Verify the sign-in email

To confirm the change, follow these steps:

1. On the deployed origin, request a sign-in to the admin.
2. In the sign-in email, confirm that the message carries the values the site set.
