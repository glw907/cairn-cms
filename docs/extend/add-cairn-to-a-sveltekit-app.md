# Add cairn to a SvelteKit app

cairn gives a SvelteKit site an admin at `/admin`, where editors sign in by email and publish their markdown edits through a GitHub App you register. This tutorial adds it by hand, so you see every file the engine needs and why. To start a new site without the walkthrough, the setup command, `create-cairn-site`, scaffolds a complete site with its theme in one step, and [Scaffolded site files](scaffolded-site-files.md) explains what it writes.

The tutorial carries one example throughout: Field Notes, a site with one post. By the end, Field Notes runs in production, and an editor can sign in, edit the post, and publish it to the deployed site.

The tutorial assumes working knowledge of SvelteKit, TypeScript, and a terminal. If you start from an existing app, you work through the same milestones, and the tutorial notes where your app skips creating the project or its repository.

You work through four milestones, and each ends with a check:

1. Deploy a bare SvelteKit site to its `workers.dev` address.
2. Install the engine, mount the admin, and sign in to it on the dev backend.
3. Put content on disk, render an entry from it, and push the site to its GitHub repository.
4. Move the site to production with a GitHub App you register, an auth database, and the Worker's bindings and secret.

A closing section after the milestones customizes the sign-in email.

The following pages cover what this tutorial leaves out:

- [Define an adapter and schema](define-an-adapter-and-schema.md) covers every adapter option.
- [Build the public routes](build-the-public-routes.md) covers the delivery routes beyond the entry catch-all.
- The [security model](security-model.md) sets out the reasoning behind the GitHub App's repository-wide write and the CSRF design.
- [Rotate the GitHub App key](rotate-the-github-app-key.md) covers rotating the App's private key later.

## Before you begin

You need the following accounts and tools:

- Node 24 or later.
- A GitHub account.
- A Cloudflare account, whose free tier runs the first milestone's bare deploy.
- [Cloudflare's Workers Paid plan](https://developers.cloudflare.com/workers/platform/pricing/), which the first deploy that carries the admin needs, and which also covers sign-in mail to a second person.
- TypeScript on major version 6, which `npx sv create` already pins, since `svelte-check` cannot run on TypeScript 7 yet.
- A domain whose zone is on your Cloudflare account, since a `workers.dev` subdomain has no zone to onboard for sign-in mail.
- The `cairn` CLI, which runs [`cairn doctor`](../reference/cli-cairn-doctor.md) in the production milestone. Install it once per machine with the following command or from a release archive:

  ```bash
  go install github.com/glw907/cairn-cms/tool/cmd/cairn@latest
  ```

## Deploy a bare SvelteKit site

This milestone ends with a plain SvelteKit site, with no cairn code yet, answering at its `workers.dev` address, so the deploy path works before the engine joins it. In this milestone, you do the following:

- Create the project under version control.
- Name the Cloudflare adapter in the kit config.
- Describe the Worker to Wrangler and deploy it.

The milestone starts from an empty directory. An existing app skips the project step, and an app that keeps its kit config in `svelte.config.js` makes each kit edit on this page in that file instead.

### Create the project on the Cloudflare adapter

A self-deployed site names `@sveltejs/adapter-cloudflare` explicitly, because the scaffold's `adapter-auto` guesses the deploy target at build time.

Since October 1, 2026, `sv create` scaffolds SvelteKit 3, which the engine's `@sveltejs/kit` peer range of `^2.70` does not admit. The project therefore pins SvelteKit 2 and the matching major version of the Cloudflare adapter before the engine installs.

The scaffold has no `svelte.config.js`, so the kit config sits inline in the `sveltekit()` call in `vite.config.ts`. That call takes `adapter` and `csrf` as sibling keys, beside the `compilerOptions` the scaffold already passes. Each `vite.config.ts` sample on this page keeps that `compilerOptions` setting as a comment.

To create the project, pin SvelteKit 2, and swap its adapter, follow these steps:

1. In a terminal, create a minimal TypeScript project with no add-ons:

   ```bash
   npx sv create --template minimal --types ts --no-add-ons field-notes
   cd field-notes
   ```

2. In the project directory, start a git repository on the `main` branch and commit the scaffold:

   ```bash
   git init -b main
   git add .
   git commit -m "Create the project"
   ```

   The production milestone names this branch in the adapter and reads the publish commit from it. An app that is already a repository skips this step.

3. In the project directory, replace the scaffold's adapter with the Cloudflare one and pin SvelteKit 2:

   ```bash
   npm uninstall @sveltejs/adapter-auto
   npm install -D @sveltejs/kit@^2.70 @sveltejs/adapter-cloudflare@^7
   ```

4. In `tsconfig.json`, replace the contents with the SvelteKit 2 form:

   ```json
   {
     "extends": "./.svelte-kit/tsconfig.json",
     "compilerOptions": {
       "allowJs": true,
       "checkJs": true,
       "esModuleInterop": true,
       "forceConsistentCasingInFileNames": true,
       "resolveJsonModule": true,
       "skipLibCheck": true,
       "sourceMap": true,
       "strict": true,
       "moduleResolution": "bundler"
     }
   }
   ```

   The scaffold's version extends `$app/tsconfig`, which does not resolve on SvelteKit 2.

5. In `vite.config.ts`, import the Cloudflare adapter and pass it as the `adapter` option:

   ```text
   field-notes/
   ├── src/
   ├── package.json
   └── vite.config.ts
   ```

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

### Describe the Worker and deploy it

The minimal `wrangler.jsonc` names the Worker, sets a compatibility date, and points `main` and the `ASSETS` binding at the adapter's build output. `npx wrangler login` signs Wrangler in to Cloudflare, and `npx wrangler deploy` uploads the built Worker.

To describe the Worker and deploy it, follow these steps:

1. In the project root, create `wrangler.jsonc`:

   ```text
   field-notes/
   ├── src/
   ├── package.json
   ├── vite.config.ts
   └── wrangler.jsonc
   ```

   ```jsonc
   // wrangler.jsonc
   {
     "name": "field-notes",
     "compatibility_date": "2026-09-01",
     "main": ".svelte-kit/cloudflare/_worker.js",
     "assets": { "directory": ".svelte-kit/cloudflare", "binding": "ASSETS" }
   }
   ```

2. In the project directory, sign in to Cloudflare:

   ```bash
   npx wrangler login
   ```

3. In the project directory, build the site and upload the Worker:

   ```bash
   npm run build
   npx wrangler deploy
   ```

### Verify the deployed site

The deploy output ends with an address of the form `<worker name>.<account subdomain>.workers.dev`, which serves the site with no domain purchase or DNS change.

To confirm the milestone, follow these steps:

1. In a browser, open the address the deploy printed.
2. Confirm that the page the scaffold wrote loads.

When the deploy fails or the address does not load, check the following in order:

1. Check that `npx wrangler login` completed for the Cloudflare account you deploy to.
2. Check that the kit config names `@sveltejs/adapter-cloudflare` as its adapter.
3. Check that `main` and the `assets` directory in `wrangler.jsonc` point at `.svelte-kit/cloudflare`.

### Deploy a change

Change one line of the scaffold's home page, deploy again, and confirm the change at the same address.

#### Show me the steps

The answer takes the following steps:

1. In `src/routes/+page.svelte`, change a line of text.
2. In the project directory, build the site and deploy it again:

   ```bash
   npm run build
   npx wrangler deploy
   ```

3. In a browser, reload the `workers.dev` address.
4. Confirm that the page shows the change.

### Checklist before the engine

Before you continue, confirm that each of the following statements holds:

- I can name the Cloudflare adapter explicitly in the `sveltekit()` call in `vite.config.ts`.
- I can deploy the Worker and load it at its `workers.dev` address.

## Install and wire the engine

This milestone installs the engine, mounts the admin, and ends with you signed in at `/admin` on the dev backend, with no sign-in email. It starts from the deployed bare site. The admin answers only once the dev backend or the real bindings exist, so the milestone wires the dev backend before its check.

In this milestone, you do the following:

- Install the engine and let Vite compile it.
- Give the engine a site config, a minimal adapter, and a runtime.
- Mount the admin as one catch-all route and a layout.
- Wire the dev backend and hand the admin's CSRF check to the engine's guard.

### Install the engine and let Vite compile it

Before any route exists, the engine needs its package with the `@cloudflare/workers-types` peer, an `ssr` entry that lists it under `noExternal`, and an ambient import that types `App.Locals`. The engine's shipped `.d.ts` files import `D1Database` and `R2Bucket` from `@cloudflare/workers-types`, which makes that package a required peer at `^5`. The package ships its `.svelte` files as source under its `svelte` export condition, so the site's Svelte plugin must compile them. Without the `noExternal` entry, the admin components fail to build. The ambient import augments `App.Locals` with the five fields the engine reads and writes on every admin request, which the [ambient types reference](../reference/ambient.md) names. A custom route that reads `event.platform.env` needs `App.Platform` declared separately.

To install the engine, follow these steps:

1. In the project directory, install the engine and its peer:

   ```bash
   npm install @glw907/cairn-cms
   npm install -D @cloudflare/workers-types
   ```

2. In `vite.config.ts`, add an `ssr` block that lists the engine under `noExternal`:

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

3. In `src/app.d.ts`, add the ambient import:

   ```text
   field-notes/
   └── src/
       └── app.d.ts
   ```

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

The admin reads a runtime, and the runtime reads an adapter and a site config.

### Write the site config and a minimal adapter

The adapter declares one posts concept, a renderer, and the backend and sender that the dev backend stands in for until production. `createGithubApp` builds a provider from its five strings with no network call and no validation. The dev backend replaces that provider for every request it serves, so placeholder values serve until the production milestone.

The site config is a YAML mapping whose one required key, `siteName`, names the site in the admin shell and in the sign-in email's subject. [`parseSiteConfig`](../reference/core.md#parsesiteconfig) rejects any top-level key outside the set its reference entry lists, and it passes `description` through unread for the site's code.

To write both files, follow these steps:

1. In `src/lib`, create `site.config.yaml`:

   ```text
   field-notes/
   └── src/
       └── lib/
           └── site.config.yaml
   ```

   ```yaml
   siteName: Field Notes
   description: Notes from the trail.
   ```

2. In `src/lib`, create the adapter module, which exports the adapter as `cairn` beside the parsed `siteConfig`:

   ```text
   field-notes/
   └── src/
       └── lib/
           ├── cairn.config.ts
           └── site.config.yaml
   ```

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

`defineRegistry({ components: [] })` gives an empty component registry, and `createRenderer` returns the `renderMarkdown` that the adapter's `rendering.render` calls. For every other adapter option, see the [`defineAdapter`](../reference/core.md#defineadapter) entry and [Define an adapter and schema](define-an-adapter-and-schema.md).

### Compose the runtime and the admin

[`composeRuntime`](../reference/core.md#composeruntime) folds the adapter and the site config into the runtime, and [`createCairnAdmin`](../reference/sveltekit.md#createcairnadmin) turns the runtime into the `load`, `actions`, and `shellLoad` the admin routes export. The `bootstrapOwner` pair names the site's first owner. When that email requests a sign-in while the `editor` table is empty, the engine inserts the owner row before the allowlist lookup. A non-matching email or a non-empty table grants nothing. `bootstrapOwner` acts on the first real sign-in, in the production milestone, and does nothing while the dev backend is active.

- In `src/lib`, create the server module, with your email and name in `bootstrapOwner`:

  ```text
  field-notes/
  └── src/
      └── lib/
          ├── cairn.config.ts
          ├── cairn.server.ts
          └── site.config.yaml
  ```

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

The admin mounts as one catch-all page under `src/routes/admin` and one shared layout, and the catch-all exports `prerender = false` so a site that prerenders by default never bakes a session-gated page. `CairnAdmin` and `CairnAdminShell` import from `@glw907/cairn-cms/admin`. The catch-all page passes `CairnAdmin` the route's `data` and `form` and the adapter's `render`, and the layout renders `CairnAdminShell` over the layout load's `shell` data.

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

To mount the admin, follow these steps:

1. In `src/routes/admin/[...path]`, create the route module, which exports the admin's `load` and `actions` beside `prerender`:

   ```ts
   // src/routes/admin/[...path]/+page.server.ts
   import { admin } from '$lib/cairn.server.js';

   export const prerender = false;

   export const load = admin.load;
   export const actions = admin.actions;
   ```

2. In the same directory, create the page, which renders `CairnAdmin`:

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

3. In `src/routes/admin`, create the layout server module, which exports the admin's `shellLoad`:

   ```ts
   // src/routes/admin/+layout.server.ts
   import { admin } from '$lib/cairn.server.js';

   export const load = admin.shellLoad;
   ```

4. In the same directory, create the layout, which renders `CairnAdminShell`:

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

No `AUTH_DB` binding exists yet, and the dev backend supplies a fake one.

### Wire the dev backend and the CSRF handoff

The dev backend, `devBackendHandle` from `@glw907/cairn-cms-dev`, replaces the GitHub backend, the auth database, and the media bucket with in-memory fakes and signs you in as an owner, so the admin runs before any credential exists. Its state lasts as long as the server process, so no save or publish leaves the machine. Three layers keep the dev package out of a deployed site:

- The `__CAIRN_DEV_BUILD__` define strips it from a production bundle.
- `@glw907/cairn-cms-dev` installs as a `devDependency`.
- The guard refuses to serve a production build that has `CAIRN_DEV_BACKEND` set, and the [log events reference](../reference/log-events.md) records that refusal.

Vite's `define` folds a literal only within the module that names it, so every call site names `__CAIRN_DEV_BUILD__` directly. A constant exported from one module and imported into another survives the fold and ships the dev-backend import in the deployed Worker. The hooks module is that call site, and it picks between `devBackendHandle` and [`createAuthGuard`](../reference/sveltekit.md#createauthguard) in one `if` that reads the define first and `CAIRN_DEV_BACKEND === '1'` second. It imports `devBackendHandle` dynamically, so a default build never carries it. The `if`'s other branch calls `createAuthGuard()` with no options, which the guard accepts.

SvelteKit's origin check runs ahead of any handle and would reject a JavaScript-free form POST that arrives without an `Origin` header. The guard's double-submit token tolerates the missing header, so the site sets `csrf: { checkOrigin: false }` to hand the admin's CSRF authority to the guard. The setting turns the check off for every route, and the guard restores an equivalent strict `Origin` check on every route outside `/admin`. `checkOrigin` is deprecated as of SvelteKit 2.61 and stays supported across cairn's tested range, and the [`checkOrigin` deprecation](../reference/supported-toolchain.md#the-checkorigin-deprecation) section tracks its status. For the reasoning behind the CSRF design, see the [security model](security-model.md).

To wire the dev backend, follow these steps:

1. In the project directory, install the dev package as a development dependency:

   ```bash
   npm install -D @glw907/cairn-cms-dev
   ```

2. In `vite.config.ts`, add the define plugin and the CSRF handoff:

   ```ts
   // vite.config.ts
   import adapter from '@sveltejs/adapter-cloudflare';
   import { sveltekit } from '@sveltejs/kit/vite';
   import { defineConfig, type Plugin } from 'vite';

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
     ],
     ssr: { noExternal: ['@glw907/cairn-cms'] },
   });
   ```

3. In `src/app.d.ts`, declare the define as a global boolean:

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

4. In the `src` directory, create `hooks.server.ts`:

   ```text
   field-notes/
   └── src/
       ├── app.d.ts
       └── hooks.server.ts
   ```

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

### Verify the dev sign-in

With `CAIRN_DEV_BACKEND` set to `1`, the dev server opens `/admin` signed in as an owner, with no sign-in email.

To confirm the milestone, follow these steps:

1. In the project directory, start the dev server with `CAIRN_DEV_BACKEND` set to `1`, using the form for your shell:

   - In a POSIX shell, run `CAIRN_DEV_BACKEND=1 npm run dev`.
   - In `cmd.exe`, run `set "CAIRN_DEV_BACKEND=1" && npm run dev`.
   - In PowerShell, run `$env:CAIRN_DEV_BACKEND=1; npm run dev`.

   The quotes in the `cmd.exe` form keep a trailing space out of the value, which the `=== '1'` test would otherwise fail to match.

2. In a browser, open `/admin` on the dev server.
3. Confirm that the admin opens signed in as an owner, with no sign-in email.

When the admin does not open signed in, check the following in order:

1. Check that the dev server started with `CAIRN_DEV_BACKEND` set to `1`.
2. Check that the hooks module names `__CAIRN_DEV_BUILD__` itself, with no imported constant in its place.

[Debug your site](debug-your-site.md) covers the dev backend's other failures.

### Rename the site

Change `siteName` in the site config, confirm that the admin shell shows the new name, and then change it back.

#### Show me the steps

The answer takes the following steps:

1. In the site config, set `siteName` to a new name.
2. In a browser, reload `/admin` on the dev server.
3. Confirm that the admin shell shows the new name.
4. In the site config, set `siteName` back to Field Notes.

### Checklist before content

Before you continue, confirm that each of the following statements holds:

- I can sign in at `/admin` on the dev backend with no sign-in email.
- I can trace the runtime from the adapter through `composeRuntime` to the admin.
- I can say why every call site names `__CAIRN_DEV_BUILD__` directly.

## Put content on disk

This milestone adds a posts directory with one markdown entry, indexes it, and renders the entry at its permalink. It ends with the site pushed to the GitHub repository that cairn commits to. It starts from the site the engine milestone left, which signs you in on the dev backend.

In this milestone, you do the following:

- Place an entry in the directory its concept declares.
- Index the content and commit the manifest that every build checks.
- Render the entry at its permalink.
- Push the site to its GitHub repository.

### Add the first entry

Content is markdown files with YAML frontmatter, one directory per concept, named by the concept's `dir`. The entry's frontmatter carries `title`, `date`, and `description`, the fields the posts concept declares.

- In `src/content/posts`, create the entry file the tree shows:

  ```text
  field-notes/
  └── src/
      └── content/
          └── posts/
              └── 2026-08-14-first-light.md
  ```

  ```md
  ---
  title: First light
  date: 2026-08-14
  description: The first entry on Field Notes.
  ---

  The first post on the site, written in plain markdown.
  ```

### Index the content and commit its manifest

The site passes [`createSiteIndexes`](../reference/delivery-data.md#createsiteindexes) one literal `import.meta.glob` per concept, and the [`cairnManifest`](../reference/vite.md#cairnmanifest) plugin checks a committed manifest against the markdown on every build. `createSiteIndexes` throws at build time for a declared concept with no glob, because Vite needs each literal glob pattern at its call site and cannot have one added programmatically.

The plugin's `configModule` names the module that exports `cairn` and `siteConfig`, and its `content` option maps each concept id to its glob. The [plugin's options reference](../reference/vite.md#cairnmanifestoptions) lists its optional output paths and their defaults. A committed manifest that has drifted from the markdown fails the build, so you write the manifest before the next build.

To index the content and commit the manifest, follow these steps:

1. In `src/lib`, create the content module, which passes the posts glob to `createSiteIndexes`:

   ```text
   field-notes/
   └── src/
       └── lib/
           ├── cairn.config.ts
           ├── cairn.server.ts
           ├── content.ts
           └── site.config.yaml
   ```

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

   The content module also exports `origin`, the local dev origin for now, which the production milestone changes.

2. In `vite.config.ts`, add the `cairnManifest` plugin:

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

3. In the project directory, write the manifest:

   ```bash
   npx cairn-manifest
   ```

   The command writes the manifest to `src/content/.cairn/index.json`, the default path the plugin's options reference lists.

4. In the project directory, commit the entry and its manifest to the repository the first milestone started:

   ```bash
   git add src/content
   git commit -m "Add the first post and its manifest"
   ```

The [`cairn-manifest` reference](../reference/cli-cairn-manifest.md) covers when to write the manifest again.

### Render the entry

The entry route is a prerendered catch-all built on the engine's [public routes loader](../reference/delivery.md#createpublicroutes), whose load data carries the `entry`, its rendered `html`, its `canonicalUrl`, and its `seo` metadata. The page in this milestone renders only `html`, and [`CairnHead`](../reference/delivery.md#cairnhead) from `@glw907/cairn-cms/delivery/head` takes the `seo` data as its `seo` prop. The route builds each entry's canonical URL from `origin` plus the permalink, so the route module passes `origin` in. [Build the public routes](build-the-public-routes.md) covers the routes beyond this one.

```text
field-notes/
└── src/
    └── routes/
        ├── [...path]/
        │   ├── +page.server.ts
        │   └── +page.svelte
        └── admin/
```

To render the entry, follow these steps:

1. In the new `[...path]` directory, create the route module:

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

2. In the same directory, create the page, which renders `html`:

   ```svelte
   <!-- src/routes/[...path]/+page.svelte -->
   <script lang="ts">
     import type { PageData } from './$types';

     let { data }: { data: PageData } = $props();
   </script>

   <article>{@html data.html}</article>
   ```

### Verify the rendered entry

The post renders at its default permalink, `/<id>/:slug`, which every concept except `pages` takes. The default `datePrefix` of `day` strips the filename's date stem from the slug.

To confirm the rendered entry, follow these steps:

1. In the project directory, start the dev server with `CAIRN_DEV_BACKEND` set to `1`, in the form [Verify the dev sign-in](#verify-the-dev-sign-in) gives for your shell.

2. In a browser, open the post's permalink:

   ```text
   http://localhost:5173/posts/first-light
   ```

3. Confirm that the post's body renders.

The entry renders as unstyled markup, since the site loads no style sheet yet. The engine ships its public defaults as one style sheet, `@glw907/cairn-cms/cairn-public.css`, which the [public style sheet reference](../reference/public-css.md) documents. Tailwind and daisyUI are optional peers of the engine, so a site installs them only when its pages use them. To style the entry, see [Theme your public site](theme-your-public-site.md#theme-a-hand-built-site).

### Resolve a content build failure

The content wiring fails in three ways, and only the first two stop the build:

- A declared concept with no glob passed to `createSiteIndexes` throws at build time, until the content module passes that concept's glob.
- A committed manifest that has drifted from the markdown on disk fails the build, until you write the manifest again and commit it.
- A concept missing from the plugin's `content` option produces zero manifest rows for that concept, with no error, until you add its glob to `content`.

[Debug your site](debug-your-site.md) covers the recovery from each content failure.

### Push the site to GitHub

The production milestone registers a GitHub App that commits to the site's repository, so the repository exists on GitHub first. The App's one installation covers that repository, and the adapter names it as `owner` and `repo`. An app already on GitHub skips this section, and the production milestone writes that repository and its default branch into `createGithubApp`.

To push the site, follow these steps:

1. On GitHub, create an empty repository with no starter files, following [Creating a new repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository), and give it the following name:

   ```text
   field-notes
   ```

2. In the project directory, add the GitHub repository as a remote and push the main branch:

   ```bash
   git remote add origin https://github.com/your-account/field-notes.git
   git push -u origin main
   ```

   In the remote URL, replace the account name with the GitHub account that owns the repository.

3. On GitHub, confirm that the repository lists the post under `src/content/posts` and the manifest at `src/content/.cairn/index.json`.

### Add a second post

Add a second post, build without writing the manifest to see the drift failure, then write the manifest and open the new permalink.

#### Show me the steps

The answer takes the following steps:

1. In `src/content/posts`, create a second dated entry with a `title` in its frontmatter.
2. In the project directory, build the site, and read the drift error that stops the build:

   ```bash
   npm run build
   ```

3. In the project directory, write the manifest again, and commit it with the new post:

   ```bash
   npx cairn-manifest
   git add src/content
   git commit -m "Add a second post"
   ```

4. In a browser, open the new post's permalink on the dev server.

### Checklist before production

Before you continue, confirm that each of the following statements holds:

- I can place an entry in the directory its concept's `dir` names.
- I can tell a manifest drift failure from a concept left out of the plugin's `content` option.
- I can open an entry at its permalink.
- I can push the site to the GitHub repository that cairn commits to.

## Move the site to production

This milestone replaces the dev backend's fakes with a GitHub App you register, a D1 auth database, and the Worker's bindings and secret. It starts from the content site, pushed to its GitHub repository, and it ends with an edit published from the deployed admin to the public page.

In this milestone, you do the following:

- Confirm that a production build refuses to serve the admin without its bindings.
- Register a GitHub App and store its credentials.
- Create and migrate the auth database.
- Add the Email Sending binding on a domain you control.
- Publish an edit and follow it to the deployed page.

You register the App, create the database, and set one Worker secret, and the site's files take three edits:

- The adapter's `backend` and `email` take real values.
- `wrangler.jsonc` gains the `EMAIL`, `AUTH_DB`, and `PUBLIC_ORIGIN` entries.
- The content module's `origin` names the deployed origin.

The hooks module needs no edit, because `__CAIRN_DEV_BUILD__` is `false` in a build and the build drops the dev-backend import. Each section of this milestone makes its edit once the value it needs exists. The App yields the App ID, the Installation ID, and the private key, and the database's create output carries the id the `AUTH_DB` entry needs.

### Deploy the production build and read the refusal

A production build with no dev backend and no `AUTH_DB` binding runs the real guard, which answers every `/admin` path, the sign-in path included, with a branded 500 page headed **Wrangler bindings are missing**. The engine reads `AUTH_DB`, `EMAIL`, `PUBLIC_ORIGIN`, and `GITHUB_APP_PRIVATE_KEY_B64` from the platform env, and a missing `AUTH_DB` throws `config.bindings-missing`, the condition behind that page.

This deploy is the first to carry the admin, so it needs the Workers Paid plan.

To see the refusal, follow these steps:

1. In the project directory, build the site and deploy it:

   ```bash
   npm run build
   npx wrangler deploy
   ```

2. In a browser, open `/admin` at the deployed address.
3. Confirm that the page shows the heading **Wrangler bindings are missing**.

### Register the GitHub App

Each site registers its own GitHub App, with one repository permission, **Contents** at **Read and write**, and no webhook. The engine ships no App and no shared credential, and cairn never receives a webhook.

To register and install the App, follow these steps:

1. On GitHub, open the App registration form, following [Registering a GitHub App](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app).
2. In the form, enter any name and homepage URL, since the engine reads neither.
3. In the form, turn the webhook off.
4. In the form, grant the repository permission **Contents** at **Read and write**, and grant no other permission.
5. In the form, allow installation on the account that owns the site's repository.
6. In the form, create the App.
7. On the App's settings page, note the App ID.
8. On the same page, generate a private key and download its `.pem` file, following [Managing private keys for GitHub Apps](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/managing-private-keys-for-github-apps).
9. On the same page, install the App on the account that owns the repository, following [Installing your own GitHub App](https://docs.github.com/en/apps/using-github-apps/installing-your-own-github-app).
10. In the installation form, grant the App access to the site's repository only.
11. In the installation settings address that GitHub opens after the install, note the trailing number, which is the Installation ID.

The **Contents** permission is repository-wide, and only engine code confines writes to the declared content directories, so the App's token can also write the site's code in the repository this tutorial builds. The [security model](security-model.md) sets out the reasoning.

### Store the App's credentials

The App ID and Installation ID identify the App and grant nothing, so they pass directly into `createGithubApp` in the adapter source. The private key signs the App's requests for installation tokens, so it lives only as the Worker secret `GITHUB_APP_PRIVATE_KEY_B64`, never in a tracked file.

To store the credentials, follow these steps:

1. In the adapter module, set `owner` to your GitHub account, and set `appId` and `installationId` to the values you noted:

   <!-- snippet-check-skip: one member of the adapter object that the engine milestone shows whole -->
   ```ts
   // src/lib/cairn.config.ts, the backend member
   backend: createGithubApp({
     owner: 'your-account',
     repo: 'field-notes',
     branch: 'main',
     appId: '123456',
     installationId: '7890123',
   }),
   ```

   `createGithubApp` takes `owner`, `repo`, `branch`, `appId`, and `installationId`, all required strings, with `branch` the repository's default branch.

2. In the project directory, encode the downloaded key onto one line and pipe it into the Worker secret, replacing the path with the file's location:

   ```bash
   base64 < ~/Downloads/your-app.private-key.pem | tr -d '\n' | npx wrangler secret put GITHUB_APP_PRIVATE_KEY_B64
   ```

3. Move the `.pem` file outside every repository, so git never tracks it.

To replace the key later, see [Rotate the GitHub App key](rotate-the-github-app-key.md). A deploy at this point still shows the refusal page, since the `AUTH_DB` binding does not exist yet.

### Create the auth database

The engine keeps its editors, sign-in tokens, and sessions in the D1 database bound as `AUTH_DB`, and every site applies two of the five migrations the package ships. Those two are `0000_auth.sql` and `0004_login_nonce.sql`, whose nonce column binds a sign-in token to the browser that requested it.

To create and migrate the database, follow these steps:

1. In the project directory, create the database, and note the database id in its output:

   ```bash
   npx wrangler d1 create field-notes-auth
   ```

2. In the project directory, copy the two migrations every site applies into a `migrations` directory:

   ```bash
   mkdir -p migrations
   cp node_modules/@glw907/cairn-cms/migrations/0000_auth.sql migrations/
   cp node_modules/@glw907/cairn-cms/migrations/0004_login_nonce.sql migrations/
   ```

3. In `wrangler.jsonc`, add the following entry at the top level of the file, binding the database as `AUTH_DB` with `migrations_dir` pointing at the copied directory:

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

4. In the project directory, apply the migrations to the remote database:

   ```bash
   npx wrangler d1 migrations apply field-notes-auth --remote
   ```

The same command with `--local` applies them to the local development database, which the opt-in migration exercise uses. `0001_roles.sql` serves only a role vocabulary beyond owner and editor, and `0003_preview.sql` serves only draft-preview links. A separate binding with a separate `migrations_dir` is the recommended home for `0002_audit.sql`, so audit writes never contend with session and token lookups. The [`createD1AuditSink`](../reference/sveltekit.md#created1auditsink) entry shows the hook that writes to it.

### Add the Email Sending binding and name the origin

Sign-in mail leaves through the `EMAIL` binding on a domain you control, and that domain supplies the sender address and the origin the site writes in two places. A `workers.dev` subdomain has no zone to onboard for Email Sending, so the production site runs on the onboarded domain.

To add the binding and name the origin, follow these steps:

1. In the project directory, onboard the domain for Email Sending, following Cloudflare's [domain configuration](https://developers.cloudflare.com/email-service/configuration/domains/) page:

   ```bash
   npx wrangler email sending enable notes.example.com
   ```

2. In `wrangler.jsonc`, add the `EMAIL` binding, `PUBLIC_ORIGIN`, `observability`, and a `routes` entry for the domain beside the `AUTH_DB` entry:

   ```jsonc
   // wrangler.jsonc
   {
     "name": "field-notes",
     "compatibility_date": "2026-09-01",
     "main": ".svelte-kit/cloudflare/_worker.js",
     "assets": { "directory": ".svelte-kit/cloudflare", "binding": "ASSETS" },
     "routes": [{ "pattern": "notes.example.com", "custom_domain": true }],
     "send_email": [{ "name": "EMAIL" }],
     "d1_databases": [
       {
         "binding": "AUTH_DB",
         "database_name": "field-notes-auth",
         "database_id": "<the id from the create output>",
         "migrations_dir": "migrations"
       }
     ],
     "vars": { "PUBLIC_ORIGIN": "https://notes.example.com" },
     "observability": { "enabled": true }
   }
   ```

   The `routes` entry serves the Worker on the domain as a [Workers Custom Domain](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/), which the next deploy creates with its DNS record and certificate.

   `observability.enabled: true` sends the engine's log records to Workers Logs and satisfies the `config.observability` check of `cairn doctor`.

3. In the adapter module, set the `email` group's `from` to an address on the domain:

   <!-- snippet-check-skip: one member of the adapter object that the engine milestone shows whole -->
   ```ts
   // src/lib/cairn.config.ts, the email member
   email: { from: 'cms@notes.example.com' },
   ```

4. In the content module, set `origin` to the same value as `PUBLIC_ORIGIN`:

   ```ts
   // src/lib/content.ts, the origin constant
   export const origin = 'https://notes.example.com';
   ```

   A prerendered route writes `origin` into the build output, so the content module names the deployed origin before the production build.

`PUBLIC_ORIGIN` is the canonical origin for sign-in links, and an unset or invalid value throws `config.public-origin-invalid`. A site that sends through another provider passes a custom `auth.send` instead, and [Edit the message in a custom sender](#edit-the-message-in-a-custom-sender) shows the sender's shape.

### Verify the production site

[`cairn doctor`](../reference/cli-cairn-doctor.md) confirms the two bindings, and a publish from the deployed admin confirms the App, since no command checks the App itself. The entry route is prerendered, so a published edit reaches the deployed page after the next build and deploy, which the steps perform.

To check the bindings and deploy the production build, follow these steps:

1. In the project directory, run `cairn doctor` with no flags:

   ```bash
   cairn doctor
   ```

2. In the output, confirm that the `config.bindings` check passes.
3. In the project directory, commit every uncommitted file and push the main branch, so the pull after the publish is a fast-forward:

   ```bash
   git add .
   git commit -m "Move the site to production"
   git push
   ```

4. In the project directory, build the site and deploy it:

   ```bash
   npm run build
   npx wrangler deploy
   ```

To publish an edit and confirm it on the deployed page, follow these steps:

1. On the deployed origin, request a sign-in to the admin with the `bootstrapOwner` email.
2. In the sign-in email, open the link.
3. In the admin, open the First light post.
4. In the editor, change a line.
5. In the editor, publish the edit.
6. On GitHub, confirm that the commit lands on `main` of the site's repository, with you as its author and the App's bot as its committer.
7. In the project directory, pull the published commit:

   ```bash
   git pull
   ```

8. In the project directory, build the site and deploy it:

   ```bash
   npm run build
   npx wrangler deploy
   ```

9. On the deployed origin, open the post's permalink.
10. Confirm that the post shows the edit.

The first real sign-in creates the owner row and logs [`editor.bootstrapped`](../reference/log-events.md). The [`cairn doctor` checks table](../reference/cli-cairn-doctor.md#the-checks) describes the command's other checks.

### Resolve a production failure

Each of the following failures points at a setting this milestone made:

- A failed `config.bindings` check points at a Wrangler config that lacks `AUTH_DB` or `EMAIL`.
- The **Wrangler bindings are missing** page at `/admin` points at a deployed build with no `AUTH_DB` binding.
- A `config.public-origin-invalid` error points at an unset or invalid `PUBLIC_ORIGIN`.
- A sign-in email that never arrives points at a domain that is not onboarded for Email Sending.
- A store error that names `0004_login_nonce.sql` points at a database without that migration.
- A failed publish points at an App without **Contents** at **Read and write**, or at one not installed on the site's repository.

[Debug your site](debug-your-site.md) covers the recovery for each failure.

### Apply an opt-in migration locally

Apply `0003_preview.sql` to the local development database beside the two that every site applies, and find it in the apply output.

#### Show me the steps

The answer takes the following steps:

1. In the project directory, copy `0003_preview.sql` into the `migrations` directory:

   ```bash
   cp node_modules/@glw907/cairn-cms/migrations/0003_preview.sql migrations/
   ```

2. In the project directory, apply the migrations to the local development database:

   ```bash
   npx wrangler d1 migrations apply field-notes-auth --local
   ```

3. In the output, confirm that `0003_preview.sql` is among the applied migrations.
4. Unless the site mints draft-preview links, delete the copied file.

### Checklist for production

Before you finish, confirm that each of the following statements holds:

- I can register a GitHub App with one repository permission and no webhook.
- I can store the App's private key as a single-line base64 Worker secret.
- I can apply the two migrations every site needs to the auth database.
- I can read a passing `config.bindings` check from `cairn doctor`.
- I can carry a published edit to the deployed page with a build and deploy.

## Customize the sign-in email

A site that keeps the engine's sign-in email needs nothing from this section. The engine writes the message, whose subject is “Sign in to” followed by the site name and whose body carries the fixed sentence “The link expires in 10 minutes.” By default, the site name comes from the site config and the sender from the adapter's `email` group. A supplied `auth.branding` replaces the site name, the sender, and the `replyTo` address together, and any other change goes through a custom `auth.send`.

### Rebrand the email

A supplied `branding` takes `siteName` and `from` as required strings and `replyTo` as one optional address, and it replaces the default whole. A `branding` that leaves `replyTo` off sends with no `replyTo` address, even when the adapter's `email` group sets one.

- In the server module, pass `branding` in the admin's `auth` config:

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

A custom `auth.send` is a `SendMagicLink`, exported from the engine's `/sveltekit` subpath, that replaces the Cloudflare sender and receives the same built message. That message is a `MagicLinkMessage` with `to`, `from`, `subject`, `html`, and `text`, plus optional `cc`, `bcc`, `replyTo`, and `attachments`, where `replyTo` takes one address. The engine scrubs token values from the text of anything the sender throws, and truncates it, before logging it. That scrub removes token values only, so a thrown message must never embed the message body or the sign-in link.

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

To confirm either change, follow these steps:

1. In the project directory, build the site and deploy it:

   ```bash
   npm run build
   npx wrangler deploy
   ```

2. On the deployed origin, request a sign-in to the admin.
3. In the sign-in email, confirm that the message carries the values the site set.

When the message does not arrive or still carries the engine's defaults, see [Debug your site](debug-your-site.md).

## The finished site

You wired the engine into a SvelteKit app by hand, from the kit config through the admin routes. Because each call site names the build-time define directly, the dev backend you worked against never reaches a production bundle. Every build of your site compares the committed manifest with the markdown on disk and stops when the two have drifted apart. In production, your editors sign in against the D1 auth database you created, and their edits commit through the GitHub App you registered. You published an edit from the deployed admin, found its commit on `main`, and saw the next build and deploy carry it to the public page.

## Next steps

The following pages build on the site this tutorial leaves:

- [Theme your public site](theme-your-public-site.md#theme-a-hand-built-site) styles the pages this tutorial leaves unstyled.
- [Configure media](configure-media.md) turns on uploads.
- [Define an adapter and schema](define-an-adapter-and-schema.md) grows the minimal adapter.
- [Build the public routes](build-the-public-routes.md) adds the delivery routes beyond the entry catch-all.
