# Add cairn to a SvelteKit app

A cairn site is a SvelteKit app that installs the engine's npm package and wires it in through files the app owns.
The admin mounts as SvelteKit routes at `/admin`, and a server hook guards every request to it.
A Vite plugin, `cairnManifest`, checks the committed index of the markdown content on every build.
Editors sign in from a link the engine emails them, and each publish commits the editor's change to the site's repository through a GitHub App that the site registers.
In production the site runs as a Cloudflare Worker.
The engine keeps its auth store in a D1 database bound to the Worker as `AUTH_DB`, and it sends sign-in mail through the Worker's Email Sending binding, `EMAIL`.

The usual way to start a new cairn site is the setup command, `create-cairn-site`, and it is much easier than building one by hand.
In one run it creates the GitHub App, the repository, and the Cloudflare bindings, and it deploys the site.
[Scaffolded site files](scaffolded-site-files.md) walks through the tree it writes.

This tutorial builds the same kind of site by hand.
If you already run a SvelteKit app, the setup command can't add cairn to it, because it refuses any target directory that already holds files.
A scaffolded site ships Waymark, cairn's reference reading theme.
The engine's package carries no theme, so a site without Waymark starts from a bare SvelteKit app.
If you want to know what cairn does underneath, or what the setup command wired into a scaffolded site, you can read the tutorial through without building anything.
Each file the engine needs is introduced in the milestone that needs it, with the reason it exists.

The running example is Field Notes, a site with one post.
By the end, you sign in to the deployed site as its first editor, edit the post, and publish the edit.
The tutorial assumes working knowledge of SvelteKit routes, layouts, server hooks, and the Vite config that carries the kit config, and of TypeScript, git, and a terminal.
It explains each Cloudflare and cairn step it uses and assumes the SvelteKit basics.
If you start from an existing app, you work through the same milestones, and the tutorial says where your app skips a step.

The tutorial runs in four milestones, each ending with a check you run:

1. [Deploy a bare SvelteKit site](#deploy-a-bare-sveltekit-site) ends with the plain site loading at the address the deploy prints.
2. [Install the engine and render an entry](#install-the-engine-and-render-an-entry) ends with the first post rendered at its permalink on the dev server.
3. [Mount the admin on the dev backend](#mount-the-admin-on-the-dev-backend) ends with you signed in to the admin on the dev server, with no sign-in email.
4. [Move the site to production](#move-the-site-to-production) ends with an edit published from the deployed admin and showing on the deployed page.

A closing section, [Customize the sign-in email](#customize-the-sign-in-email), changes the email the engine sends.
For the model behind these files in full, see [Architecture](architecture.md).
The tutorial leaves the following topics to other pages:

- The faster path, the setup command, and the tree it writes file by file are in [Scaffolded site files](scaffolded-site-files.md#file-tree).
- Every adapter option is in [Define an adapter and schema](define-an-adapter-and-schema.md).
- The security reasoning behind the GitHub App's repository-wide write and the CSRF design is in [Security model](security-model.md).
- The delivery routes beyond the entry catch-all are in [Build the public routes](build-the-public-routes.md).
- Rotating the App's private key later is in [Rotate the GitHub App key](rotate-the-github-app-key.md).
- A custom sender's code is in the [SvelteKit reference's types section](../reference/sveltekit.md#types).
- Deploying each push automatically is in Cloudflare's [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/) docs, and this tutorial's site deploys by hand.

## Before you begin

You need the following accounts and tools:

- Node 24 or later.
- A GitHub account.
- A Cloudflare account.
  The first milestone's bare deploy runs on Cloudflare's free tier.
- The Workers Paid plan, which a cairn site needs from the first deploy that carries the admin.
  Cloudflare's [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) page describes the plan.
- A domain whose zone is on your Cloudflare account, for real sign-in mail.
  A `workers.dev` subdomain has no zone to onboard.
- TypeScript on major version 6.
  `svelte-check` can't run on TypeScript 7 until the 7.1 compiler API lands, and `npx sv create` already pins major version 6.
  An existing app keeps its `typescript` dependency on 6.
- The `cairn` CLI, which the production milestone runs as [`cairn doctor`](../reference/cli-cairn-doctor.md).
  It is a separate Go module, installed once per machine and not part of the npm package.
  On a machine with a [Go toolchain](https://go.dev/doc/install), install it with `go install`:

  ```sh
  go install github.com/glw907/cairn-cms/tool/cmd/cairn@latest
  ```

## Deploy a bare SvelteKit site

This milestone ends with a plain SvelteKit site, with no cairn code, answering at its `workers.dev` address.
Deploying it first proves the deploy path before the engine is installed.
In this milestone, you do the following:

- Create the project under version control.
- Name the Cloudflare adapter in the kit config.
- Describe the Worker to Wrangler, and deploy it.

The milestone starts from an empty directory.
An existing app skips creating the project and starting its repository, and it first makes the following changes for SvelteKit 3:

- Upgrade `@sveltejs/kit` from `^2` to SvelteKit 3 before the next milestone.
  The engine's peer range is `^3`, and an app still on `^2` stops at the engine install with `ERESOLVE`.
- Move the kit options from `svelte.config.js` into the `sveltekit()` call in `vite.config.ts`, and delete the file.
  SvelteKit 3 no longer supports it.
- Delete any `csrf.checkOrigin` setting, which fails the SvelteKit 3 build.
- Move each `$lib` import to `#lib`, which the `imports` field in `package.json` maps.
  SvelteKit 3 throws on a `$lib` import.

For the whole upgrade, see [Upgrade cairn](upgrade-cairn.md#when-your-range-crosses-sveltekit-3).

### Create the project on the Cloudflare adapter

A self-deployed site names `@sveltejs/adapter-cloudflare` explicitly, because the scaffold's `adapter-auto` guesses the deploy target at build time.
The scaffold has no `svelte.config.js`, and the kit config, the adapter included, sits inline in the `sveltekit()` call in `vite.config.ts`.
That call carries two keys: `compilerOptions`, whose `runes` setting forces runes mode, and `adapter`, imported from `@sveltejs/adapter-auto`.
Every `vite.config.ts` sample on this page keeps `compilerOptions` as a comment.

To create the project and swap its adapter, follow these steps:

1. In a terminal, create a minimal TypeScript project named `field-notes` with no add-ons, and change into its directory.
   An existing app skips this step.

   ```sh
   npx sv create --template minimal --types ts --no-add-ons field-notes
   cd field-notes
   ```

   The project's `package.json` carries the `dev`, `build`, `preview`, and `check` scripts.

2. In the project directory, start a git repository on the `main` branch, and commit the scaffold.
   An app that is already a repository skips this step.

   ```sh
   git init -b main
   git add -A
   git commit -m "Scaffold Field Notes"
   ```

   The production milestone names this branch in the adapter's GitHub App config and reads the publish commit from it.

3. In the project directory, uninstall `@sveltejs/adapter-auto`, and install `@sveltejs/adapter-cloudflare` as a development dependency:

   ```sh
   npm uninstall @sveltejs/adapter-auto
   npm install -D @sveltejs/adapter-cloudflare
   ```

4. In `vite.config.ts`, import the Cloudflare adapter, and pass it as the `adapter` key of the `sveltekit()` call.
   The call takes the kit options and the Svelte plugin options as sibling keys, so `adapter` sits beside `compilerOptions`.

   The project now has the following layout:

   ```text
   field-notes/
   ├── src/
   ├── package.json
   └── vite.config.ts
   ```

   With the adapter swapped, `vite.config.ts` reads as follows:

   ```ts
   import adapter from '@sveltejs/adapter-cloudflare';
   import { sveltekit } from '@sveltejs/kit/vite';
   import { defineConfig } from 'vite';

   export default defineConfig({
     plugins: [
       sveltekit({
         // compilerOptions stays as `sv create` wrote it.
         adapter: adapter(),
       }),
     ],
   });
   ```

[Scaffolded site files](scaffolded-site-files.md#viteconfigts) shows the scaffold's version of this file.

### Describe the Worker and deploy it

The minimal `wrangler.jsonc` names the Worker, sets a compatibility date, and points `main` and the `ASSETS` binding at the adapter's build output.
`npx wrangler login` signs Wrangler in to your Cloudflare account, and `npx wrangler deploy` uploads the built Worker.

To describe the Worker and deploy it, follow these steps:

1. In the project root, create `wrangler.jsonc` beside `vite.config.ts`:

   ```text
   field-notes/
   ├── src/
   ├── package.json
   ├── vite.config.ts
   └── wrangler.jsonc
   ```

   Give it the four keys the adapter's build output needs:

   ```jsonc
   {
     "name": "field-notes",
     "compatibility_date": "2026-08-21",
     "main": ".svelte-kit/cloudflare/_worker.js",
     "assets": {
       "directory": ".svelte-kit/cloudflare",
       "binding": "ASSETS"
     }
   }
   ```

2. In the project directory, sign in to Cloudflare with `npx wrangler login`.
3. In the project directory, build the site and upload the Worker:

   ```sh
   npm run build
   npx wrangler deploy
   ```

### Verify the deployed site

The deploy output ends with an address of the form `<worker name>.<account subdomain>.workers.dev`, which serves the site with no domain purchase or DNS change.
At that address, the scaffold's home page, `src/routes/+page.svelte`, shows a "Welcome to SvelteKit" heading and one paragraph.

To check the deploy, follow this step:

- In a browser, open the address the deploy printed, and confirm that the "Welcome to SvelteKit" page loads.

If the deploy fails or the address doesn't load the scaffold's page, check the following in order:

1. `npx wrangler login` completed for the account you deploy to.
2. The kit config in `vite.config.ts` names `@sveltejs/adapter-cloudflare` and no other adapter.
3. In `wrangler.jsonc`, `main` and the `assets` directory point at `.svelte-kit/cloudflare`.

### Deploy a change

This exercise confirms that a second deploy carries a change to the same `workers.dev` address.

<details>
<summary>Show me the steps</summary>

1. In `src/routes/+page.svelte`, change a line of text.
2. In the project directory, build the site and deploy it again.
3. In a browser, reload the `workers.dev` address, and confirm that the page shows the change.

</details>

### Checklist before the engine

Before you continue, confirm that each of the following statements holds:

- I can name the Cloudflare adapter explicitly in the `sveltekit()` call in `vite.config.ts`.
- I can deploy the Worker and load it at its `workers.dev` address.

## Install the engine and render an entry

This milestone installs the engine, declares a site with one posts concept, and ends with the site's first post rendered at its permalink on the dev server.
In this milestone, you do the following:

- Install the engine, and let Vite compile it.
- Write the site config and a minimal adapter.
- Put an entry on disk, and commit the manifest that every build checks.
- Render the entry at its permalink.

The milestone starts from the deployed bare site the previous milestone left.
Content comes before the admin because the dev backend that the next milestone wires reads the site's entries and its committed manifest from the working tree.
The Vite plugin this milestone adds also supplies the flag that the dev backend's hook reads.

### Install the engine and let Vite compile it

Before any route exists, the engine needs its package with the `@cloudflare/workers-types` peer, a `noExternal` entry under `ssr` in the Vite config, and an ambient import that types `App.Locals`.
`@cloudflare/workers-types` at `^5` is a required peer, because the engine's shipped types import `D1Database` and `R2Bucket` from it.
A scaffolded site lists the engine under `dependencies` and `@cloudflare/workers-types` under `devDependencies`, and this site does the same.
The engine ships its `.svelte` files from source under its `svelte` export condition.
Vite must compile them with the site's Svelte plugin, and without the `noExternal` entry the admin components fail to build.
The ambient import, [`@glw907/cairn-cms/ambient`](../reference/ambient.md), augments `App.Locals` with the five fields the engine reads and writes on every admin request.
Version 8 of `@sveltejs/adapter-cloudflare` declares no `App.Platform`, so a custom route that needs a Worker binding reads it from `cloudflare:workers`, typed by the `Env` that `wrangler types` generates.

To install the engine, follow these steps:

1. In the project directory, install `@glw907/cairn-cms`, and install `@cloudflare/workers-types` as a development dependency:

   ```sh
   npm install @glw907/cairn-cms
   npm install -D @cloudflare/workers-types
   ```

   If npm stops with `ERESOLVE`, your app still requires `@sveltejs/kit` `^2`.
   Upgrade it as [Upgrade cairn](upgrade-cairn.md#when-your-range-crosses-sveltekit-3) describes, and run the install again.

2. In `vite.config.ts`, add an `ssr` block that lists `@glw907/cairn-cms` under `noExternal`.
3. In `src/app.d.ts`, add `import '@glw907/cairn-cms/ambient';` above the scaffold's `declare global` block.

   The file sits at the root of `src`:

   ```text
   src/
   ├── routes/
   └── app.d.ts
   ```

   With the import added, `src/app.d.ts` reads as follows:

   ```ts
   // See https://svelte.dev/docs/kit/types#app.d.ts
   // for information about these interfaces
   import '@glw907/cairn-cms/ambient';

   declare global {
     namespace App {
       // interface Error {}
       // interface Locals {}
       // interface PageData {}
       // interface PageState {}
       // interface Platform {}
     }
   }

   export {};
   ```

The admin and the content index both read a runtime, and the runtime reads an adapter and a site config.

### Write the site config and a minimal adapter

The site config is a YAML mapping whose one required key, `siteName`, names the site.
The adapter declares one posts concept, a renderer, and placeholder backend and sender values.
The dev backend stands in for both until production.

[`parseSiteConfig`](../reference/core.md#parsesiteconfig) requires a non-empty `siteName` and rejects any top-level key outside a fixed set.
The site-config check in `cairn doctor` tries four paths, and `src/lib/site.config.yaml` is one of them.
The nav editor, the **Settings** screen's save, and the **Tags** screen read and commit the site-config file that [`editor.siteConfigPath`](../reference/core.md#siteconfigpath-adapter-editor-member) names.
It defaults to `src/theme/site.config.yaml`, the scaffold's path, so this site's adapter sets it to `src/lib/site.config.yaml`.

The adapter is built from the root barrel's helpers.
[`defineAdapter`](../reference/core.md#defineadapter) takes the concepts, and each concept comes from `defineConcept` with a `dir`, a `label`, a `singular`, a `routing`, and a `defineFieldset` of field descriptors.
`defineRegistry` with no components gives an empty registry.
`createRenderer` returns the `renderMarkdown` that `rendering.render` calls with the body and the three resolvers it forwards.
The adapter's `email` group is a sender with a `from` address.
`createGithubApp` makes no network call and validates nothing, and the dev backend replaces the provider for every request it serves.

To write both files, follow these steps:

1. In `src/lib`, create `site.config.yaml` with `siteName: Field Notes` and a one-line `description`:

   ```yaml
   siteName: Field Notes
   description: Notes from the field, published with cairn.
   ```

2. In `src/lib`, create `cairn.config.ts`, the adapter module.
   It exports the adapter as `cairn` beside the parsed `siteConfig`.

   The two files sit side by side:

   ```text
   src/lib/
   ├── cairn.config.ts
   └── site.config.yaml
   ```

   The adapter module reads as follows:

   ```ts
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
     // Placeholders: the dev backend stands in for the GitHub App and the sender until production.
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
     editor: { siteConfigPath: 'src/lib/site.config.yaml' },
   });

   export const siteConfig = parseSiteConfig(siteYaml);
   ```

[Define an adapter and schema](define-an-adapter-and-schema.md) grows the adapter past this minimum.

### Add the first entry

Content is markdown files with YAML frontmatter, one directory per concept, named by the concept's `dir`.
The entry's frontmatter carries `title`, `date`, and `description`, the fields the posts concept declares.

To add the entry, follow this step:

- In `src/content/posts`, create `2026-08-14-first-light.md` with `title: First light`, a `date`, a `description`, and one line of markdown body.

  The entry sits in the directory the posts concept names:

  ```text
  src/
  ├── content/
  │   └── posts/
  │       └── 2026-08-14-first-light.md
  └── lib/
  ```

  The entry reads as follows:

  ```md
  ---
  title: First light
  date: 2026-08-14
  description: The first post on Field Notes.
  ---

  The first entry, written by hand and committed with the site.
  ```

### Index the content and commit its manifest

The content module passes [`createSiteIndexes`](../reference/delivery-data.md#createsiteindexes) one literal `import.meta.glob` per concept.
Vite needs the pattern written at the call site, and `createSiteIndexes` throws at build time for a declared concept with no glob.
The module also exports `origin`, which holds the local dev origin until the production milestone changes it to the deployed origin.

The [`cairnManifest`](../reference/vite.md#cairnmanifestoptions) plugin checks the committed manifest, at its default path `/src/content/.cairn/index.json`, against the markdown on every build.
Its `configModule` option names the module that exports `cairn` and `siteConfig`, and its `content` option maps each concept id to that concept's glob.

To index the content and commit the manifest, follow these steps:

1. In `src/lib`, create `content.ts`, the content module.
   It passes the posts glob to `createSiteIndexes` and exports the site index and `origin`.
   The module sits beside the adapter module:

   ```text
   src/lib/
   ├── cairn.config.ts
   ├── content.ts
   └── site.config.yaml
   ```

   The content module reads as follows:

   ```ts
   import { createSiteIndexes } from '@glw907/cairn-cms/delivery';
   import { cairn, siteConfig } from './cairn.config.js';

   const posts = import.meta.glob('/src/content/posts/*.md', {
     query: '?raw',
     import: 'default',
     eager: true,
   }) as Record<string, string>;

   const indexes = createSiteIndexes(cairn, siteConfig, { posts });

   export const site = indexes.site;

   // The production milestone changes this to the deployed origin.
   export const origin = 'http://localhost:5173';
   ```

2. In `vite.config.ts`, add the `cairnManifest` plugin after `sveltekit()`, with `configModule` naming `/src/lib/cairn.config.ts` and `content` mapping `posts` to its glob.
   The whole file now reads as follows:

   ```ts
   import adapter from '@sveltejs/adapter-cloudflare';
   import { sveltekit } from '@sveltejs/kit/vite';
   import { cairnManifest } from '@glw907/cairn-cms/vite';
   import { defineConfig } from 'vite';

   export default defineConfig({
     plugins: [
       sveltekit({
         // compilerOptions stays as `sv create` wrote it.
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

3. In the project directory, write the manifest with [`npx cairn-manifest`](../reference/cli-cairn-manifest.md).
   It writes `src/content/.cairn/index.json` and, in the same run, `src/content/.cairn/site-facts.json`.
4. In the project directory, commit every uncommitted file, the entry, its manifest, and `site-facts.json` included:

   ```sh
   git add -A
   git commit -m "Add the first post and its manifest"
   ```

### Render the entry

The entry route is a prerendered catch-all built on the engine's public routes loader.
[`createPublicRoutes`](../reference/delivery.md#createpublicroutes) returns `entryLoad`, which resolves one entry by request path and throws a 404 on a miss, and `entries`, which enumerates every routable entry for the prerenderer.
The route imports the site's modules as `#lib/<file>.js`, through the `#lib/*` mapping in the `imports` field of the `package.json` that `sv create` wrote.
SvelteKit 3 throws on a `$lib` import.
An existing app whose `package.json` lacks the mapping adds it.

To render the entry, follow these steps:

1. In `src/routes/[...path]`, create `+page.server.ts`.
   It exports `prerender = true`, the loader's `entries`, and its `entryLoad` as `load`.
   The route directory sits beside the scaffold's home page and root layout:

   ```text
   src/routes/
   ├── [...path]/
   │   └── +page.server.ts
   ├── +layout.svelte
   └── +page.svelte
   ```

   The route module reads as follows:

   ```ts
   import { createPublicRoutes } from '@glw907/cairn-cms/delivery';
   import { cairn, siteConfig } from '#lib/cairn.config.js';
   import { origin, site } from '#lib/content.js';
   import type { EntryGenerator, PageServerLoad } from './$types';

   const routes = createPublicRoutes({
     site,
     render: cairn.rendering.render,
     origin,
     siteName: siteConfig.siteName,
     description: siteConfig.description ?? '',
   });

   export const prerender = true;

   export const entries: EntryGenerator = () => routes.entries();

   export const load: PageServerLoad = ({ url }) => routes.entryLoad({ url });
   ```

2. In the same directory, create `+page.svelte`, and render the load's `html` inside an `<article>`:

   ```svelte
   <script lang="ts">
     import type { PageData } from './$types';

     let { data }: { data: PageData } = $props();
   </script>

   <article>{@html data.html}</article>
   ```

The other delivery routes are in [Build the public routes](build-the-public-routes.md).

### Verify the rendered entry

The post renders at its default permalink, `/posts/first-light`, because every concept except `pages` takes `/<id>/:slug` and the default date prefix strips the filename's date stem.

To confirm the milestone, follow these steps:

1. In the project directory, build the site, and confirm that the build exits without an error:

   ```sh
   npm run build
   ```

2. In the project directory, start the dev server with `npm run dev`.
3. In a browser, open `http://localhost:5173/posts/first-light`, and confirm that the post's body renders.

The entry renders as unstyled markup, because the site loads no style sheet yet.
The engine ships its public defaults as one style sheet, `@glw907/cairn-cms/cairn-public.css`.
`tailwindcss` and `daisyui` are optional peers of the engine, so a site installs them only when its pages use them.
[Theme your public site](theme-your-public-site.md#theme-a-hand-built-site) styles a hand-built site, and the [public CSS reference](../reference/public-css.md) lists every default the sheet sets.

### Resolve a content build failure

The content wiring has four common failures, and the first three stop the build.

- The build throws that a concept has no glob passed.
  A declared concept has no glob in the content module's `createSiteIndexes` call.
  Pass that concept's literal glob in the content module.
- The build stops with the stale-manifest message, which names `npx cairn-manifest`.
  The committed manifest has drifted from the markdown on disk.
  Write the manifest again with `npx cairn-manifest`, and commit it.
- The build stops with an error that names `site-facts.json` and `npx cairn-manifest`.
  The committed `site-facts.json` no longer matches the adapter.
  Run `npx cairn-manifest`, which rewrites `site-facts.json`, and commit the result.
- The manifest that `cairn-manifest` writes holds no rows for a concept, and no error names it.
  The concept is missing from the plugin's `content` option, which `cairn-manifest` reuses.
  Add the concept's glob to that option.

If the permalink answers 404, the requested path matches no routable entry.
A path that keeps the date stem or leaves out the concept id is one example.

### Add a second post

This exercise shows the drift check at work: a second post fails the build until the manifest is written again.

<details>
<summary>Show me the steps</summary>

1. In `src/content/posts`, create a second dated entry with a `title` in its frontmatter.
2. In the project directory, build the site, and read the drift error that stops the build.
3. In the project directory, run `npx cairn-manifest`, and commit the manifest with the new post.
4. In a browser, open the new post's permalink on the dev server.

</details>

### Checklist before the admin

Before you continue, confirm that each of the following statements holds:

- I can place an entry in the directory its concept's `dir` names.
- I can tell a manifest drift failure from a concept left out of the plugin's `content` option.
- I can open an entry at its permalink.

## Mount the admin on the dev backend

This milestone mounts the admin at `/admin` and ends with you signed in to it on the dev backend, with no sign-in email, over the post in your working tree.
In this milestone, you do the following:

- Compose the runtime and the admin.
- Mount the admin as one catch-all route and a layout.
- Wire the dev backend.
- Sign in.

The milestone starts from the site the previous milestone left, with one post and its manifest committed.
Until the production milestone gives the Worker an auth database, the guard has nothing to sign anyone in against.
This milestone therefore wires the dev backend before its check.

### Compose the runtime and the admin

[`composeRuntime`](../reference/core.md#composeruntime) folds the adapter and the site config into the runtime, and [`createCairnAdmin`](../reference/sveltekit.md#createcairnadmin) turns that runtime into the `load`, `actions`, and `shellLoad` the admin routes export.
The admin and the delivery layers both read that runtime.
`createCairnAdmin` takes the runtime and an `auth` config with a `bootstrapOwner`, and a single-mount admin exports the three functions it returns.
While the dev backend is active, `bootstrapOwner` does nothing.
In production it inserts the first real owner row when its email submits the sign-in request form, before any link is sent.

To compose both, follow this step:

- In `src/lib`, create `cairn.server.ts`, the server module, with your email and name in `bootstrapOwner`.

  The server module sits beside the adapter module:

  ```text
  src/lib/
  ├── cairn.config.ts
  ├── cairn.server.ts
  ├── content.ts
  └── site.config.yaml
  ```

  The server module reads as follows:

  ```ts
  import { composeRuntime } from '@glw907/cairn-cms';
  import { createCairnAdmin } from '@glw907/cairn-cms/sveltekit';
  import { cairn, siteConfig } from './cairn.config.js';

  export const runtime = composeRuntime({ adapter: cairn, siteConfig });

  export const admin = createCairnAdmin({
    runtime,
    auth: { bootstrapOwner: { email: 'you@example.com', displayName: 'Your Name' } },
  });
  ```

### Mount the admin routes

The admin mounts as one catch-all page under `src/routes/admin` and one shared layout, and the catch-all exports `prerender = false`.
A site that prerenders by default would otherwise bake a build-time snapshot of a session-gated page.
`CairnAdmin` and `CairnAdminShell` import from `@glw907/cairn-cms/admin`.
The page passes `CairnAdmin` the route's `data` and `form` and the adapter's `render`.
The layout renders `CairnAdminShell` over the layout load's `shell` data.
This site's adapter declares no sidebar layout, and [Arrange the admin sidebar](arrange-the-admin-sidebar.md#declare-the-layout) shows how to declare one.

The admin adds four files under `src/routes/admin`:

```text
src/routes/
├── admin/
│   ├── [...path]/
│   │   ├── +page.server.ts
│   │   └── +page.svelte
│   ├── +layout.server.ts
│   └── +layout.svelte
├── [...path]/
├── +layout.svelte
└── +page.svelte
```

To mount the admin, follow these steps:

1. In `src/routes/admin/[...path]`, create `+page.server.ts`.
   It exports `prerender = false` and the admin's `load` and `actions` from `#lib/cairn.server.js`.

   ```ts
   import { admin } from '#lib/cairn.server.js';

   export const prerender = false;

   export const load = admin.load;
   export const actions = admin.actions;
   ```

2. In the same directory, create `+page.svelte`, and render `CairnAdmin` in it:

   ```svelte
   <script lang="ts">
     import { CairnAdmin } from '@glw907/cairn-cms/admin';
     import type { AdminData } from '@glw907/cairn-cms/sveltekit';
     import { cairn } from '#lib/cairn.config.js';
     import type { ActionData } from './$types';

     let { data, form }: { data: AdminData; form: ActionData } = $props();
   </script>

   <CairnAdmin {data} {form} render={cairn.rendering.render} />
   ```

3. In `src/routes/admin`, create `+layout.server.ts`, and export the admin's `shellLoad` from it as `load`:

   ```ts
   import { admin } from '#lib/cairn.server.js';

   export const load = admin.shellLoad;
   ```

4. In the same directory, create `+layout.svelte`, and render `CairnAdminShell` around the page:

   ```svelte
   <script lang="ts">
     import { CairnAdminShell } from '@glw907/cairn-cms/admin';
     import type { AdminShellData } from '@glw907/cairn-cms/sveltekit';
     import type { Snippet } from 'svelte';

     let { data, children }: { data: { shell: AdminShellData }; children: Snippet } = $props();
   </script>

   <CairnAdminShell data={data.shell}>{@render children()}</CairnAdminShell>
   ```

The root layout that `sv create` wrote, `src/routes/+layout.svelte`, sits above `src/routes/admin`, and SvelteKit renders the admin inside it.
Visible chrome in that layout around `/admin`, such as a header, a footer, or a width cap, keeps the admin shell from filling the viewport.
In development, the engine logs one console error for a width cap and leaves the layout as it is.
An existing app with chrome in its root layout moves it as the [admin routes reference](../reference/admin-routes.md#the-root-layout-must-be-chrome-free) shows.

### Wire the dev backend

The dev backend is `devBackendHandle` from `@glw907/cairn-cms-dev`.
It replaces the GitHub backend, the auth database, and the media bucket with in-memory fakes, and it signs you in as an owner.
The admin therefore runs before any credential exists.
Its state lasts as long as the server process, so no save or publish leaves the machine.
Its `content` option takes `'repository'` or `'fixtures'` and defaults to `'repository'`, which serves the site's content from the working tree.

The `cairnManifest` plugin already in `vite.config.ts` defines `__CAIRN_DEV_BUILD__`, the flag the hooks module reads.
The flag is `true` under `vite dev` and under a `VITE_CAIRN_E2E=1` build, and `false` in a default build.
The site sets no define for the flag, because a site define would override the plugin's.
Under `vite dev`, the dev package also needs an entry in `ssr.noExternal`.
It ships built JavaScript that imports `cloudflare:workers`, a scheme Node's loader rejects, and without the entry `/admin` answers 500.

To wire the dev backend, follow these steps:

1. In the project directory, install `@glw907/cairn-cms-dev` and `@types/node` as development dependencies:

   ```sh
   npm install -D @glw907/cairn-cms-dev @types/node
   ```

   On a fresh SvelteKit 3 scaffold, the hooks module's `process.env` read fails `svelte-check` until `@types/node` is installed and named.
   `$app/tsconfig` turns off automatic `@types` inclusion, so the hooks module names it with a `/// <reference types="node" />` line.

2. In `vite.config.ts`, add `@glw907/cairn-cms-dev` to `ssr.noExternal` beside the engine.
   The final file reads as follows:

   ```ts
   import adapter from '@sveltejs/adapter-cloudflare';
   import { sveltekit } from '@sveltejs/kit/vite';
   import { cairnManifest } from '@glw907/cairn-cms/vite';
   import { defineConfig } from 'vite';

   export default defineConfig({
     plugins: [
       sveltekit({
         // compilerOptions stays as `sv create` wrote it.
         adapter: adapter(),
       }),
       cairnManifest({
         configModule: '/src/lib/cairn.config.ts',
         content: { posts: '/src/content/posts/*.md' },
       }),
     ],
     ssr: { noExternal: ['@glw907/cairn-cms', '@glw907/cairn-cms-dev'] },
   });
   ```

3. In `src`, create `hooks.server.ts` beside `app.d.ts`:

   ```text
   src/
   ├── lib/
   ├── routes/
   ├── app.d.ts
   └── hooks.server.ts
   ```

   The hooks module reads as follows:

   ```ts
   /// <reference types="node" />
   import type { Handle } from '@sveltejs/kit/hooks';
   import { createAuthGuard } from '@glw907/cairn-cms/sveltekit';
   import { runtime } from '#lib/cairn.server.js';

   let handle: Handle;
   if (__CAIRN_DEV_BUILD__ && process.env.CAIRN_DEV_BACKEND === '1') {
     const { devBackendHandle } = await import('@glw907/cairn-cms-dev');
     handle = devBackendHandle({ runtime });
   } else {
     handle = createAuthGuard({ runtime });
   }

   export { handle };
   ```

The opt-in reads `process.env` because `vite dev` runs the hooks in Node, where the platform proxy's env never carries the shell variable `npm run dev` sets.
Every call site names `__CAIRN_DEV_BUILD__` directly, never through a shared exported constant.
Vite folds the define only in the module that names it, and an imported constant survives the fold and ships the dev-backend import in the deployed Worker.
The module imports `devBackendHandle` dynamically inside the gated branch, so a default build never carries it.

[`createAuthGuard`](../reference/sveltekit.md#createauthguard) and `devBackendHandle` both require `runtime`, so one declaration serves both, and a call that passes none is a type error.
For how the guard differs from per-route authorization, see the [admin routes reference](../reference/admin-routes.md#the-guard-and-the-ambient-type).

The dev package must never reach a deployed site, and three layers keep it out:

- The build-time flag that the hooks code names.
- The `devDependency` boundary that the install step set.
- The runtime tripwire that the guard enforces.

[Security model](security-model.md#the-dev-backend-flags-two-refusals) explains the flag's two refusals.
`@glw907/cairn-cms/ambient`, already imported in `src/app.d.ts`, declares `__CAIRN_DEV_BUILD__` as a boolean global, so the site needs no declaration.

In `'repository'` mode nothing is written to disk.
An edit lives in an in-memory overlay that wins until the dev server restarts, and the admin's list reads the manifest on disk until a dev publish commits an overlay copy.
The `'repository'` mode throws under workerd, so a site that runs the dev backend under `wrangler dev` passes `content: 'fixtures'`.
This tutorial runs the dev backend under `vite dev` only.

On the `createAuthGuard` branch, SvelteKit's default Origin check runs ahead of every handle, `/admin` included, because the site's kit config sets no `csrf` key.
The guard adds a double-submit token on top.
Under `vite dev`, SvelteKit skips the Origin check.
[Security model](security-model.md#csrf-protection) explains the CSRF design.

### Verify the dev sign-in

With `CAIRN_DEV_BACKEND` set to `1`, the dev server opens `/admin` signed in as an owner, listing the post from your working tree.

To confirm the milestone, follow these steps:

1. In the project directory, start the dev server with `CAIRN_DEV_BACKEND` set to `1`, using the form for your shell:

   - In a POSIX shell, run `CAIRN_DEV_BACKEND=1 npm run dev`.
   - In `cmd.exe`, run `set "CAIRN_DEV_BACKEND=1" && npm run dev`.
   - In PowerShell, run `$env:CAIRN_DEV_BACKEND=1; npm run dev`.

   The quotes in the `cmd.exe` form keep a trailing space out of the value that the `=== '1'` test reads.

2. In a browser, open `/admin` on the dev server, and confirm that the admin opens signed in as an owner and lists First light.
   The admin also shows the in-memory notice, one persistent alert that reads "Edits are held in memory. They're discarded when the dev server stops."

If the admin doesn't open signed in, the hooks module took the guard branch.
Check the following in order:

1. The dev server started with `CAIRN_DEV_BACKEND` set to `1` in your shell's form.
2. The hooks module names `__CAIRN_DEV_BUILD__` itself, with no imported constant in its place.
3. `vite.config.ts` still lists the `cairnManifest` plugin, which defines the flag.

If `/admin` answers 500 under `vite dev`, `@glw907/cairn-cms-dev` is missing from `ssr.noExternal`.
For other failures, see [Debug your site](debug-your-site.md).

### Edit the post in memory

This exercise shows where a dev-backend edit lives.
The admin shows the edit while the file on disk stays unchanged, and a restart of the dev server discards it.

<details>
<summary>Show me the steps</summary>

1. In the admin, open First light, change a line, and save.
2. In `src/content/posts`, open the entry file, and confirm that it is unchanged.
3. In the terminal, restart the dev server with `CAIRN_DEV_BACKEND` set to `1`.
4. In the admin, reopen First light, and confirm that the edit is gone.

</details>

### Checklist before production

Before you continue, confirm that each of the following statements holds:

- I can sign in at `/admin` on the dev backend with no sign-in email.
- I can trace the runtime from the adapter through `composeRuntime` to the admin and both handles.
- I can say why every call site names `__CAIRN_DEV_BUILD__` directly.
- I can say where an edit made on the dev backend lives.

## Move the site to production

This milestone replaces the dev backend's fakes with a GitHub App you register, a D1 auth database, and the Worker's bindings and secret.
It ends with an edit published from the deployed admin to the public page.
In this milestone, you do the following:

- Push the site to GitHub.
- Confirm that a production build refuses the admin without its bindings.
- Register a GitHub App, and store its credentials.
- Create and migrate the auth database.
- Add the Email Sending binding on a domain you control.
- Publish an edit, and follow it to the deployed page.

The milestone starts from the dev-backend site in its local repository.
Beside the App, the secret, and the database that the sections create, production takes three edits to files the site already has:

- The adapter's `backend` and `email` take real values.
- `wrangler.jsonc` gains the `EMAIL`, `AUTH_DB`, and `PUBLIC_ORIGIN` entries.
- The `origin` constant in the content module names the deployed origin.

The App's private key lives in a Worker secret, `GITHUB_APP_PRIVATE_KEY_B64`, which `wrangler.jsonc` never lists.
On a production build `__CAIRN_DEV_BUILD__` is `false`, and the build drops the dev-backend branch, so `hooks.server.ts` stays as it is.
The bindings come last.
Each section edits a file only once the value it needs exists.

### Push the site to GitHub

The GitHub App you register next is installed on the account that owns the site's repository and covers that repository, so the repository exists on GitHub first.
The adapter names that repository as `owner` and `repo`.
An app already on GitHub skips this section and uses that repository and its default branch in the adapter's GitHub App config.

To push the site, follow these steps:

1. In the project directory, commit every uncommitted file, so the push carries the admin routes, the hooks module, and the dev-backend wiring:

   ```sh
   git add -A
   git commit -m "Mount the admin on the dev backend"
   ```

2. On GitHub, create an empty repository named `field-notes` with no starter files, following GitHub's [Creating a new repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository) guide.
3. In the project directory, add the repository as the `origin` remote, and push the `main` branch:

   ```sh
   git remote add origin https://github.com/your-account/field-notes.git
   git push -u origin main
   ```

   Replace `your-account` in the remote URL with your GitHub username.

4. On GitHub, confirm that the repository lists the post under `src/content/posts` and the manifest at `src/content/.cairn/index.json`.

### Deploy the production build and read the refusal

A production build with no dev backend and no `AUTH_DB` binding runs the real guard, which answers every `/admin` path with a branded 500 page headed **Wrangler bindings are missing**.
The sign-in path gets the same page instead of a form that could never succeed, and the page names the `EMAIL` and `AUTH_DB` bindings to declare.
The engine reads the following values from the Worker env:

- `AUTH_DB`, the D1 database binding.
- `EMAIL`, the Email Sending binding.
- `PUBLIC_ORIGIN`, the canonical origin for sign-in links.
- `GITHUB_APP_PRIVATE_KEY_B64`, the GitHub App's private key.

A missing `AUTH_DB` throws nothing at the guard.
The guard logs `guard.refused` and returns the branded 500 page for the condition `config.bindings-missing`.
This deploy is the first to carry the admin, and it needs the Workers Paid plan.

To see the refusal, follow these steps:

1. In the project directory, build the site and deploy it:

   ```sh
   npm run build
   npx wrangler deploy
   ```

2. In a browser, open `/admin` at the deployed address, and confirm that the page shows the heading **Wrangler bindings are missing**.

### Register the GitHub App

Each site registers a GitHub App, with one repository permission, **Contents** at **Read and write**, and no webhook.
The engine ships no App and no shared credential, and it never receives a webhook.

To register and install the App, follow these steps:

1. On GitHub, open the App registration form, following GitHub's [Registering a GitHub App](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app) guide.
2. In the form, enter any name and homepage URL.
   The engine reads neither, so both are cosmetic.
3. In the form, turn the webhook off.
4. In the form, grant the repository permission **Contents** at **Read and write**, and grant no other permission.
5. In the form, allow installation on the account that owns the site's repository.
   The form's other choice, installation on any account, isn't needed.
6. In the form, create the App.
7. On the App's settings page, note the App ID.
8. On the same page, generate a private key, and download its `.pem` file, following GitHub's [Managing private keys for GitHub Apps](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/managing-private-keys-for-github-apps) guide.
9. On the same page, install the App on the account that owns the repository, following GitHub's [Installing your own GitHub App](https://docs.github.com/en/apps/using-github-apps/installing-your-own-github-app) guide.
10. In the installation form, grant the App access to the site's repository only, not to all repositories.
11. In the browser's address bar, note the trailing number of the installation settings URL that GitHub opens after the install.
    The URL has the form `https://github.com/settings/installations/<installation_id>`, and the number is the installation ID.

The installation token can write any path in the repository, and only engine code confines writes to the declared content directories.
This tutorial's repository also holds the site's code, which therefore sits inside the token's write reach.
[Security model](security-model.md#the-github-apps-reach) explains the App's reach.
Its [limits of the installation token](security-model.md#limits-of-the-installation-token) section states the same property from the token's side.

### Store the App's credentials

The App ID and installation ID identify the App and grant nothing, so they pass directly into `createGithubApp` in the adapter source.
The private key lives only as the Worker secret `GITHUB_APP_PRIVATE_KEY_B64`.
The `.pem` file is the credential that signs the App's requests for installation tokens, and it stays out of the repository.

To store the credentials, follow these steps:

1. In the adapter module, set `owner` to your GitHub account, and set `appId` and `installationId` to the values you noted.
   The adapter's `backend` member then reads as follows, with your values in place of these:

   <!-- snippet-check-skip: one member of the adapter object that the content milestone shows whole -->
   ```ts
     backend: createGithubApp({
       owner: 'your-account',
       repo: 'field-notes',
       branch: 'main',
       appId: '123456',
       installationId: '7890123',
     }),
   ```

   The [`createGithubApp`](../reference/core.md#creategithubapp) types require all five strings, and `branch` is the repository's default branch.

2. In the project directory, encode the downloaded key onto one line, and pipe it into Wrangler's secret command, replacing the filename with your key's path:

   ```sh
   base64 < your-app.private-key.pem | tr -d '\n' | npx wrangler secret put GITHUB_APP_PRIVATE_KEY_B64
   ```

   The engine expects the secret to hold the PEM's contents base64-encoded onto one line, and it decodes the secret with `atob()` before signing.

3. In a terminal, move the `.pem` file to a directory outside every repository, so git never tracks it.

To replace the key later, see [Rotate the GitHub App key](rotate-the-github-app-key.md).
A deploy at this point still shows the refusal page, because the auth database doesn't exist yet.

### Create the auth database

The engine keeps its editors, sign-in tokens, and sessions in the D1 database bound as `AUTH_DB`, and every site applies two of the five migrations the package ships, `0000_auth.sql` and `0004_login_nonce.sql`.
`0000_auth.sql` creates the three tables behind those records.
The nonce column from `0004_login_nonce.sql` binds a sign-in token to the browser that requested it.
The package ships its migrations under `migrations/`, and a site copies the ones it needs into its `migrations_dir`.

To create and migrate the database, follow these steps:

1. In the project directory, create the database, and note the database id in its output:

   ```sh
   npx wrangler d1 create field-notes-auth
   ```

2. In the project directory, copy `0000_auth.sql` and `0004_login_nonce.sql` from the package into a new `migrations` directory:

   ```sh
   mkdir migrations
   cp node_modules/@glw907/cairn-cms/migrations/0000_auth.sql migrations/
   cp node_modules/@glw907/cairn-cms/migrations/0004_login_nonce.sql migrations/
   ```

3. In `wrangler.jsonc`, add a top-level `d1_databases` entry that binds the database as `AUTH_DB`, with the id from the create output.
   Set its `migrations_dir` to `migrations`:

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

   ```sh
   npx wrangler d1 migrations apply field-notes-auth --remote
   ```

The other migrations are opt-in.
`0001_roles.sql` serves a role vocabulary beyond owner and editor, and `0003_preview.sql` serves draft-preview links.
[Build the public routes](build-the-public-routes.md#mount-the-draft-preview-route) mounts the draft-preview route.
`0002_audit.sql` is optional, and the [`createD1AuditSink`](../reference/sveltekit.md#created1auditsink) entry recommends applying it on a separate D1 binding with a separate `migrations_dir`, which keeps audit writes from contending with session and token lookups.

### Add the Email Sending binding and name the origin

Sign-in mail leaves through the `EMAIL` binding on a domain you control, and that domain also supplies the sender address and the origin the site names in two places.
The binding needs the domain's zone onboarded for Email Sending, and a `workers.dev` subdomain has no zone to onboard.
The production site therefore runs on the onboarded domain.
`PUBLIC_ORIGIN` is the canonical origin for sign-in links, and an unset or invalid value throws `config.public-origin-invalid`.

To add the binding and name the origin, follow these steps:

1. In the project directory, onboard the domain for Email Sending, following Cloudflare's [Email Sending domains](https://developers.cloudflare.com/email-service/configuration/domains/) page:

   ```sh
   npx wrangler email sending enable notes.example.com
   ```

2. In `wrangler.jsonc`, add the `routes` entry, the `EMAIL` binding, `PUBLIC_ORIGIN` as a variable, and `observability` beside the `AUTH_DB` entry.
   The `routes` entry declares the domain as a Custom Domain, which the next deploy creates with its DNS record and certificate.
   With `observability.enabled` unset, the log records go nowhere, and `cairn doctor` raises a warning for it.
   The whole file now reads as follows:

   ```jsonc
   {
     "name": "field-notes",
     "compatibility_date": "2026-08-21",
     "main": ".svelte-kit/cloudflare/_worker.js",
     "assets": {
       "directory": ".svelte-kit/cloudflare",
       "binding": "ASSETS"
     },
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
     "vars": {
       "PUBLIC_ORIGIN": "https://notes.example.com"
     },
     "observability": { "enabled": true }
   }
   ```

3. In the adapter module, set the `email` group's `from` to an address on the domain.
4. In the content module, set `origin` to the same value as `PUBLIC_ORIGIN`.

A prerendered route writes `origin` into the build output, so the content module names the deployed origin before the production build.
To send mail some other way, see [The custom sender contract](#the-custom-sender-contract).

### Verify the production site

No command checks the GitHub App, so this section verifies it with a real publish whose commit lands on `main`.
[`cairn doctor`](../reference/cli-cairn-doctor.md#the-checks), run with no flags from the site's directory, verifies the bindings: its `config.bindings` check confirms that `AUTH_DB` and `EMAIL` are both wired.
The entry route is prerendered, so a published edit reaches the deployed page only after the next build and deploy.

To check the bindings and deploy the production build, follow these steps:

1. In the project directory, run `cairn doctor` with no flags, and confirm that the `config.bindings` check passes.
2. In the project directory, commit every uncommitted file, and push the `main` branch, so the pull after the publish is a fast-forward:

   ```sh
   git add -A
   git commit -m "Move Field Notes to production"
   git push
   ```

3. In the project directory, build the site and deploy it:

   ```sh
   npm run build
   npx wrangler deploy
   ```

To publish an edit and confirm it on the deployed page, follow these steps:

1. On the deployed origin, request a sign-in to the admin with the `bootstrapOwner` email.
   With the allowlist empty, that request inserts the owner row and logs [`editor.bootstrapped`](../reference/log-events.md) before the link is sent.
2. In your mail client, open the sign-in link.
3. In the admin, open First light, change a line, and publish the edit.
4. On GitHub, confirm that the commit lands on `main` of the site's repository, with you as its author and the App's bot as its committer.
   The engine sets the signed-in editor as the author and omits the committer, so GitHub records the App's bot identity.
5. In the project directory, pull the published commit:

   ```sh
   git pull
   ```

6. In the project directory, build the site and deploy it again.
7. On the deployed origin, open the post's permalink, and confirm that the post shows the edit.

### Resolve a production failure

Each of the following failures points at a setting this milestone made.

- The `config.bindings` check fails because `wrangler.jsonc` lacks the `AUTH_DB` or `EMAIL` entry.
  Declare both entries as the database and Email Sending sections show, then deploy again.
- `/admin` on the deployed site still shows **Wrangler bindings are missing** because the deployed build has no `AUTH_DB` binding.
  Declare the entry as the database section shows, then deploy again.
- The site throws `config.public-origin-invalid` because `PUBLIC_ORIGIN` is unset or invalid.
  Set `PUBLIC_ORIGIN` under `vars` in `wrangler.jsonc` to the deployed `https` origin.
- The sign-in email never arrives because the domain isn't onboarded for Email Sending.
  Onboard the domain in the `PUBLIC_ORIGIN` zone with `npx wrangler email sending enable`.
- A store error names the missing column and `0004_login_nonce.sql` because the auth database lacks that migration.
  Copy `0004_login_nonce.sql` into `migrations`, and apply the migrations again with `--remote`.
- The publish fails because the App lacks **Contents** at **Read and write**, isn't installed on the site's repository, or the Worker has no `GITHUB_APP_PRIVATE_KEY_B64` secret.
  An unset secret raises the `github.app-unreachable` condition.
  Check the App's permission and installation on GitHub.
  If the Worker lacks the secret, set it again as [Store the App's credentials](#store-the-apps-credentials) shows.

For a failure not listed here, see [Debug your site](debug-your-site.md).

### Apply an opt-in migration locally

This exercise applies `0003_preview.sql` to the local development database beside the two migrations every site applies, and the apply output lists it.
The apply command's `--local` form leaves the deployed site as it is.

<details>
<summary>Show me the steps</summary>

1. In the project directory, copy `0003_preview.sql` from the package's `migrations` directory into `migrations`.
2. In the project directory, apply the migrations with `--local` in place of `--remote`.
3. In the output, confirm that `0003_preview.sql` is among the applied migrations.
4. Unless the site mints draft-preview links, delete the copied file from `migrations`.

</details>

### Checklist for production

Before you finish, confirm that each of the following statements holds:

- I can register a GitHub App with one repository permission and no webhook.
- I can store the App's private key as a single-line base64 Worker secret.
- I can apply the two migrations every site needs to the auth database.
- I can read a passing `config.bindings` check from `cairn doctor`.
- I can carry a published edit to the deployed page with a build and deploy.

## Customize the sign-in email

The engine writes the sign-in email, and a site that keeps its defaults needs nothing from this section.
The subject reads "Sign in to" followed by the site name, and the body carries the fixed sentence "The link expires in 10 minutes."
Both are engine copy.
The site name comes from the site config, and the sender comes from the adapter's `email` group.
A site changes the email in one of two ways:

- A supplied `auth.branding` overrides the members it names, as [Rebrand the email](#rebrand-the-email) shows.
- A custom `auth.send` makes any other change, as [The custom sender contract](#the-custom-sender-contract) describes.

### Rebrand the email

Through [`createCairnAdmin`](../reference/sveltekit.md#createcairnadmin), `auth.branding` is a partial of three members, `siteName`, `from`, and `replyTo`.
It overrides each member it names and leaves the rest at the site config's name and the adapter's sender.

To rebrand the email, follow this step:

- In the server module, pass `branding` with a `replyTo` address in the admin's `auth` config.

  With the change, the server module reads as follows:

  ```ts
  import { composeRuntime } from '@glw907/cairn-cms';
  import { createCairnAdmin } from '@glw907/cairn-cms/sveltekit';
  import { cairn, siteConfig } from './cairn.config.js';

  export const runtime = composeRuntime({ adapter: cairn, siteConfig });

  export const admin = createCairnAdmin({
    runtime,
    auth: {
      bootstrapOwner: { email: 'you@example.com', displayName: 'Your Name' },
      branding: { replyTo: 'editor@notes.example.com' },
    },
  });
  ```

The override names only `replyTo`, so the email keeps the adapter's `from`.

### The custom sender contract

A custom `auth.send` is a [`SendMagicLink`](../reference/sveltekit.md#types) that replaces the Cloudflare sender and receives the same built message.
`SendMagicLink` is exported from the `/sveltekit` subpath.
The message carries `to`, `from`, `subject`, `html`, and `text`, plus the optional `cc`, `bcc`, `replyTo`, and `attachments`.
Its `replyTo` takes one address.
The text of anything a sender throws reaches the log scrubbed of token values and truncated, and a thrown message must never embed the message body or the sign-in link.
This tutorial keeps the Cloudflare sender.

### Verify the sign-in email

The branding change shows in the next sign-in email the deployed site sends.

To confirm the change, follow these steps:

1. In the project directory, build the site and deploy it.
2. On the deployed origin, request a sign-in to the admin, and confirm that the email carries the values the site set.

If the email doesn't arrive, onboard the domain in the `PUBLIC_ORIGIN` zone with `npx wrangler email sending enable`, as [Resolve a production failure](#resolve-a-production-failure) describes.

## Summary

You added cairn to a SvelteKit app by hand, from the kit config to a GitHub App that commits your editors' work.
The engine compiles as part of your site and reads one runtime that `composeRuntime` builds from the adapter and the site config.
Every build checks the committed manifest against the markdown on disk.
The dev backend works on your content in memory, and because the hooks module names the build-time flag directly, it never reaches a production bundle.

In production, editors sign in against your D1 database, and each publish commits through your GitHub App.
Each edit reaches the public page on the next build and deploy.

## Next steps

The following pages build on the site this tutorial leaves:

- [Theme your public site](theme-your-public-site.md#theme-a-hand-built-site) styles the unstyled entry route.
- [Configure media](configure-media.md) adds media to the site.
- [Define an adapter and schema](define-an-adapter-and-schema.md) grows the adapter past one concept.
- [Build the public routes](build-the-public-routes.md) adds the delivery routes beyond the entry catch-all.
- [Restrict admin access](restrict-admin-access.md) declares an access map, which the guard reads from the runtime with no edit to the hooks module.
- [Security model](security-model.md) explains the reasoning behind the App's reach, the dev backend's exclusion from production, and the CSRF design.
- The [`createAuthChannel`](../reference/auth-channel.md#createauthchannel) entry covers a second sign-in group beside the editors.
- The [`verifyTurnstile`](../reference/cloudflare.md#verifyturnstile) entry covers Turnstile verification for a public form.
