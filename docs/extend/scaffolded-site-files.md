# Scaffolded site files

A site that `create-cairn-site` scaffolded arrives as a complete SvelteKit project in a GitHub repository, already deployed as a Cloudflare Worker, with the engine, `@glw907/cairn-cms`, installed as one npm dependency. Its files are Waymark, cairn's reference reading theme, together with the design-neutral code in `src/chassis/`. On the SvelteKit side, routes mount the admin and the public site, and a server hook guards `/admin`. The whole SvelteKit config sits inline in `vite.config.ts`. On the Cloudflare side, `wrangler.jsonc` binds the Worker's one D1 database (the auth store), a mail binding, and an R2 bucket. The repository holds the code and the markdown, the site's GitHub App commits each editor's publish into it, and a GitHub Actions workflow checks every push and pull request.

Every file in that tree belongs to the site. The engine's npm package carries neither Waymark nor the chassis, so an engine upgrade moves the `@glw907/cairn-cms` range and leaves the tree as it is, and any edit a release needs in the site's code is the site's to make. Some files still carry a contract, because something outside the site's code depends on their shape. The engine reads the adapter, the server hook, and the bindings, and the admin commits editors' work into the content, its manifests, and the primary menu in the site config. A few more feed the CI workflow and the build's prerender checks, and either one fails when such a file breaks its rule. Those files share directories with files that only the site reads, as the adapter does with the theme's style sheets in `src/theme/`.

A developer who ran the setup command, or who took over a site from someone who did, reads on to learn what each file does and whether to change it. One who took over also lacks what the command left outside the repository: its saved record of the run on the machine that ran it and, when the run connected Workers Builds, the build token it registered at Cloudflare. A reader who knows the engine's import points and seams from [Architecture](architecture.md) finds where each one lands in the tree, and a reader working on the public theme finds the files around it. Someone still choosing between the setup command and a by-hand build sees what the command writes. A developer adding cairn to an app that already exists has no choice to make, because the setup command writes only into a missing or empty directory.

The following subjects appear in this order:

- What the scaffold is, and why the site owns every file
- The file tree, with the files the engine or a check reads marked
- The root files and the build and deploy configuration
- The database migrations, and why an added database takes a separate directory
- The routes and the server hook, including what the local dev server runs
- The theme, chassis, and content directories, the committed manifests, and the two style sheets
- The settings a developer edits by hand, outside the admin
- The build's crawl rules and the themed 404 page
- The state the setup command left outside the repository

The page assumes working knowledge of SvelteKit's project structure (routes, layouts, hooks, and prerendering), Vite configuration, and Wrangler configuration for a Worker's bindings and D1 migrations. It explains no SvelteKit or Cloudflare basics.

Other pages cover the following related subjects:

- Building the same tree by hand: [Add cairn to a SvelteKit app](add-cairn-to-a-sveltekit-app.md)
- Changing the theme and the chassis: [Theme your public site](theme-your-public-site.md)
- Building a custom admin screen: [Add a custom admin screen](add-a-custom-admin-screen.md)
- Each delivery route's wiring: [Build the public routes](build-the-public-routes.md)
- Media configuration behind the `MEDIA_BUCKET` binding: [Configure media](configure-media.md)
- The audit's `cairn-audit.config.json` in depth: [Run cairn-audit on your site](run-cairn-audit-on-your-site.md)

## The scaffold

A scaffolded site is Waymark, cairn's reference theme, wired onto the chassis, the design-neutral code every scaffolded site shares. The setup command copies both from the same tree the engine runs its tests against. That tree is `examples/showcase`, and the copy leaves out the following groups:

- The Playwright suite and the test routes
- The design-review tooling, the `theme-kit` and `probe-craft` routes
- The members-login fixture: `src/members`, `src/routes/members`, and `migrations-members/`
- The `admin/signups` example screen and its `migrations-app/` database
- The `admin/error-fixture` route
- The `env-check.ts` module in `src/lib/` and the file `src/routes/(site)/+layout.server.ts`
- The showcase's `scripts/`, `README.md`, `.claude`, `.cairn`, and `cairn-audit.config.json`
- The showcase's `package-lock.json`
- The 13 posts dated 2025, out of the showcase's 27, so the scaffold keeps the other 14

When the setup command's package is packed, its build writes a fresh `README.md`, `scripts/dev.mjs`, `.claude` guidance, and `cairn-audit.config.json` into the package in place of the showcase's. The setup command copies those files with the rest of the tree, so the scaffold still carries them. Waymark is the only template the setup command ships.

The same run that writes the tree creates the site's GitHub App and repository, provisions its Cloudflare bindings, and deploys it, so the tree arrives already live. A hand-built site starts with no template, no chassis, and no deploy, and [Add cairn to a SvelteKit app](add-cairn-to-a-sveltekit-app.md) walks through that build.

Owning a file does not remove a contract on it, and a file that the engine or a check reads can still break the build, the deploy, or the admin when it changes. The file tree marks each file that carries such a contract.

## File tree

In the tree the setup command writes, `[engine]` marks a file the engine reads, writes, or requires a shape of, and `[gate]` marks a file that runs or feeds a check that can fail the build or the CI run. The tree leaves out files no section discusses, such as `src/app.html` and the theme's test files, and the gitignored root `.cairn/` that the pre-scripts build.

```text
.
├── .claude/
├── .github/
│   └── workflows/
│       └── check.yml                [gate]
├── .gitattributes
├── .gitignore
├── .prettierignore
├── .prettierrc
├── CLAUDE.md
├── README.md
├── cairn-audit.config.json          [gate]
├── migrations/                      [engine]
├── package.json                     [gate]
├── scripts/
│   └── dev.mjs
├── src/
│   ├── admin.css                    [gate]
│   ├── app.d.ts
│   ├── chassis/
│   ├── content/
│   │   ├── .cairn/                  [engine] [gate]
│   │   ├── fragments/               [engine]
│   │   ├── pages/                   [engine]
│   │   └── posts/                   [engine]
│   ├── hooks.server.ts              [engine]
│   ├── lib/
│   │   └── log.ts
│   ├── params.ts
│   ├── routes/
│   └── theme/
│       ├── cairn.config.ts          [engine]
│       ├── components/
│       ├── icons.ts
│       ├── islands/
│       ├── markdown-components.ts
│       ├── site-config.ts
│       ├── site.config.yaml         [engine]
│       ├── site.css
│       ├── theme-names.ts
│       └── theme.css
├── tsconfig.json
├── vite.config.ts                   [engine] [gate]
├── vitest.config.ts
├── worker-configuration.d.ts
└── wrangler.jsonc                   [engine]
```

The scaffold has no `src/access.ts`, no `.dev.vars.example`, and no `LICENSE`. `CLAUDE.md` and `.claude/` hold Claude Code's guidance files; see [Work on a cairn site with Claude Code](../claude-code/work-on-a-cairn-site-with-claude-code.md).

## Root files

Beside a plain SvelteKit project's files, the root carries a CI workflow, the audit's config, and a `.gitignore`, and local secrets go in a `.dev.vars` the developer creates there.

### `.github/workflows/check.yml`

On every push and pull request, the workflow installs dependencies and runs `npm run check` and `npm run check:cairn`. It uses Node 24. Nothing else in the scaffold names a Node version: there is no `.nvmrc` and no `engines` field. The last step runs `npx cairn-guidance check`, the check of the site's Claude Code guidance, without `--strict` and under `continue-on-error: true`, and that step never fails the job. No browser is installed, so `check:cairn:rendered` cannot run in the workflow.

### `.dev.vars`

The scaffold ships no `.dev.vars.example`. Local secrets go in a `.dev.vars` file that the developer creates and the `.gitignore` keeps out of the repository. An example of that file exists only in the cairn-cms repository, committed at `packages/create-cairn-site/template-repo/.dev.vars.example` and copied into the `templates/waymark/` directory. That directory is a separate committed copy of the Waymark template, generated from the same source as the scaffold, with a few files added or replaced.

In that copy, `.dev.vars.example` names the following two entries:

- `GITHUB_APP_PRIVATE_KEY_B64`, the GitHub App's private key, with a placeholder value. The App id and installation id are not secrets and live in the adapter, so the file omits them.
- `ANTHROPIC_API_KEY`, left empty. Tidy reads it only when tidy is enabled in `site.config.yaml`, and the scaffold's `site.config.yaml` ships with tidy enabled.

For more information, see [Turn on tidy](turn-on-tidy.md) and [Rotate the GitHub App key](rotate-the-github-app-key.md).

### `cairn-audit.config.json`

The audit's config names both compiled admin sheets, so the static audit sees every class that a site's admin route writes. The two sheets are the engine's `node_modules/@glw907/cairn-cms/dist/admin/cairn-admin.css` and the site's `.cairn/admin.css`. For the rest of the config, see [Run cairn-audit on your site](run-cairn-audit-on-your-site.md).

### `.gitignore`

The file ignores `.dev.vars` and every `.dev.vars.*` file, and no line re-includes any of them. It also ignores the whole root `.cairn/` directory (`/.cairn/`), where the pre-scripts rebuild the compiled `.cairn/admin.css`. This root `.cairn/` is separate from the committed `src/content/.cairn/`, which holds the content manifests.

The setup command's package stores this file as `gitignore`, because npm's packlist drops a file named `.gitignore`. The setup command renames it after copying and fails with an error when the file is absent. `.gitattributes` ships with its name unchanged.

### Other root files

The remaining root entries are a plain project's files, plus a generated types file and the directory that holds the dev server's launcher. The plain files are `README.md`, `.prettierignore`, `.prettierrc`, `tsconfig.json`, and `vitest.config.ts`. `worker-configuration.d.ts` is generated `wrangler types` output, and `src/app.d.ts` references it. The `dev` script runs `scripts/dev.mjs`.

## Configuration files

`package.json`, `vite.config.ts`, and `wrangler.jsonc` configure how the site builds and deploys, and `src/app.d.ts` types what they provide. `npm run build` runs `vite build`, and the build produces the Worker that `wrangler.jsonc` names as `main`.

### `package.json`

The engine, `@glw907/cairn-cms`, sits in `dependencies`, and [Upgrade cairn](upgrade-cairn.md) covers moving its range. The `imports` field declares `#chassis`, `#theme`, and `#lib` as subpath imports rather than config aliases. It maps `#lib/*` to `./src/lib/*`, which holds only `log.ts`, the site's [`createLogger`](../reference/log.md#createlogger) instance typed over the site's log event names.

The following table describes what the scaffold's main scripts run.

| Script | What it runs |
| --- | --- |
| `dev` | It compiles the admin sheet, then runs `scripts/dev.mjs`, which starts `vite dev` with `CAIRN_DEV_BACKEND=1` beside a Tailwind watch compile. The local admin runs on the in-memory dev backend. |
| `build` | It runs `vite build` after the same compile. |
| `predev`, `prebuild`, `precheck` | Each compiles `src/admin.css` into `.cairn/admin.css`, so a Workers Builds build needs no separate admin-stylesheet step. |
| `check:cairn` | It compiles the admin sheet, then runs `cairn-audit`, which fails only on an unsuppressed error-tier finding. Public-scope findings print as advisories. A missing `daisyui` or `tailwindcss` peer fails the run with a message that names the peer. |
| `check:cairn:rendered` | It runs `cairn-audit --rendered`, which needs a real browser against a running admin. The scaffold ships no Playwright dependency, so the script does not run as shipped. |
| `cairn:manifest` | It runs `cairn-manifest`. |
| `format`, `format:check` | They run Prettier. |
| `test:unit` | It runs `vitest run`. |
| `cf-typegen` | It runs `wrangler types --include-runtime=false`, the arguments the committed `worker-configuration.d.ts` records. Only the `templates/waymark/` copy's script adds `--env-file=.dev.vars.example`. |

### `vite.config.ts`

The scaffold carries no `svelte.config.js`, so the whole SvelteKit config passes inline to `sveltekit()` in this file. That config sets the Cloudflare adapter and a prerender `handleHttpError` that throws on every HTTP error during prerendering. [Crawl rules](#crawl-rules) explains what the build needs to keep passing.

The config sets no `csrf` key, so SvelteKit's Origin check runs ahead of every handle, `/admin` included, and cairn's double-submit token sits on top of it. SvelteKit 3 removed `csrf.checkOrigin`, and a config that sets it fails validation. For more information, see [CSRF protection](security-model.md#csrf-protection).

The `cairnManifest` plugin verifies the committed content manifest on build. The scaffold's config sets no `define` entry. The plugin's `config` hook defines `__CAIRN_DEV_BUILD__`, which the dev backend gates on. The config also lists `@glw907/cairn-cms-dev`, the dev backend's package, in `ssr.noExternal`. Without that entry, `/admin` answers 500 under `vite dev`, because the package ships built JavaScript that imports `cloudflare:workers`, a module Node's loader rejects.

### `wrangler.jsonc`

The Worker's config declares the following four bindings and one variable, and `AUTH_DB` is its only D1 database:

- `ASSETS`, the static-assets binding, on the `assets` block
- `AUTH_DB`, the D1 database that holds the auth store
- `EMAIL`, the Email Sending binding
- `MEDIA_BUCKET`, the R2 bucket
- `PUBLIC_ORIGIN`, a variable

[Configure media](configure-media.md) covers the media settings behind the bucket. The config sets `observability.enabled` to `true`. [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/) records a Worker's logs only with that setting on. The config also sets `assets.not_found_handling` to `"none"`, and [Themed 404 page](#themed-404-page) explains why.

### `src/app.d.ts`

This file imports `@glw907/cairn-cms/ambient`, which declares the `__CAIRN_DEV_BUILD__` global, and it types `App.PageData` with the optional `nav`, `footerNav`, `siteName`, and `hasIslands` fields that the root layout load returns. It references `@cloudflare/workers-types` and `worker-configuration.d.ts`, whose `Env` types the Worker bindings that `cloudflare:workers` exposes. For more information, see [Ambient types](../reference/ambient.md).

## Database migrations

The `migrations/` directory holds the auth store's schema for `AUTH_DB`, and it is the scaffold's only migrations directory. It carries `0000_auth.sql`, `0001_roles.sql`, `0003_preview.sql`, and `0004_login_nonce.sql`. The opt-in `0002_audit.sql` is absent, because only a site that wires `createD1AuditSink` applies it. [Wire the audit sink](add-a-custom-admin-screen.md#wire-the-audit-sink) covers adding it.

The scaffold ships `0001_roles.sql`, which a site needs once it declares roles beyond the default `owner` and `editor` pair. The migration rebuilds the `editor` table with only the engine's four columns. Any automated `wrangler d1 migrations apply` runs it, so a site that added columns to that table carries them over to the rebuilt table first. `0003_preview.sql` serves draft-preview links.

A database the site adds takes a separate migrations directory. `wrangler d1 migrations apply` walks one directory per database, and a directory shared with `migrations/` would apply each schema to both databases.

## Routes and the server hook

The server hook installs the auth guard over `/admin`, and the routes split into that admin mount, a prerendered public site in the `(site)` group, and endpoints at the root. The following tree shows `src/params.ts` and the route directories and root files under `src/routes/`.

```text
src/
├── params.ts
└── routes/
    ├── admin/                       [engine]
    │   ├── [...path]/
    │   ├── +error.svelte
    │   ├── +layout.server.ts
    │   └── +layout.svelte
    ├── (site)/
    │   ├── [...path]/
    │   ├── [...path=md]/
    │   ├── archive/[page]/
    │   ├── preview/[token]/
    │   ├── styleguide/
    │   ├── +layout.svelte
    │   ├── +page.server.ts
    │   └── +page.svelte
    ├── feed.json/
    ├── feed.xml/
    ├── healthz/
    ├── media/[...path]/
    ├── robots.txt/
    ├── sitemap.xml/
    ├── +error.svelte
    ├── +layout.server.ts
    └── +layout.svelte
```

### `src/hooks.server.ts`

The hook picks `devBackendHandle` or `createAuthGuard` in one `if` and exports the result as `handle`. The condition checks the build-time `__CAIRN_DEV_BUILD__` define first, then the runtime opt-in `CAIRN_DEV_BACKEND === '1'`. The opt-in reads the Worker env and falls back to `process.env`, because `vite dev` runs the hooks in Node, where the platform proxy's env never carries the shell variable that `npm run dev` sets. Both handles take the composed `runtime` from `#chassis/cairn.server.js`.

The guard gates the whole `/admin` subtree before any load runs. Per-route authorization belongs to [`requireAccess`](../reference/sveltekit.md#requireaccess) and [`createSectionAction`](../reference/sveltekit.md#createsectionaction). The [`createAuthGuard`](../reference/sveltekit.md#createauthguard) entry documents the guard's config. The scaffold's adapter declares no `access` member and takes the zero-config `owner` and `editor` roles, and the tree holds no `src/access.ts`. [Restrict admin access](restrict-admin-access.md) covers declaring an access map.

When the dev backend is on, `devBackendHandle` installs in-memory stand-ins for the GitHub backend, the media bucket, and `AUTH_DB`, and it signs in an `owner` without an email loop. Nothing leaves the machine. The hook passes no `content` option, so the dev admin runs in the default `'repository'` mode and lists the site's entries from its working tree. Edits land in an in-memory overlay over that tree. Nothing is written to disk, and the overlay lasts until the dev server restarts. The `'fixtures'` mode seeds an in-memory repository with sample content instead. The example site in the cairn-cms repository passes `content: 'fixtures'`, because its end-to-end suite runs under `wrangler dev`.

### `src/routes/admin/`

The admin mount is one catch-all pair, `[...path]/+page.server.ts` and `+page.svelte`, beside the shared layout pair, `+layout.server.ts` and `+layout.svelte`. The [canonical admin mount](../reference/admin-routes.md#the-route-files-plus-the-composer) reference reproduces both pairs. The directory also holds `+error.svelte`. It renders an error inside `/admin` within the admin shell. Every status shows a **Back to the dashboard** link to `/admin`. A 403 and a 404 each show a fixed message, and any other status shows the thrown message, or a fallback line when there is none. A failure in the admin layout's load still falls to the root error page. [Add a custom admin screen](add-a-custom-admin-screen.md) covers adding a screen under this mount.

### `src/routes/(site)/`

The entry catch-all `[...path]` and its raw-markdown counterpart `[...path=md]` coexist through [`createPublicRoutes`](../reference/delivery.md#createpublicroutes), and `src/params.ts` defines the `md` matcher. That file uses SvelteKit's `defineParams`. The group also holds the `preview/[token]/` route. The `archive/[page]` route slices its page with the chassis `archive.ts` helper. The `styleguide/` route renders the type scale, the component recipes, and every registered markdown component, with a sample for each component that declares a `preview`. [Build the public routes](build-the-public-routes.md) covers each route's wiring.

### Endpoints at the root

The root holds the feed, sitemap, and robots endpoints beside two routes that sit outside `/admin`, the media route and `/healthz`. The feed and sitemap endpoints are `feed.json/`, `feed.xml/`, and `sitemap.xml/`. The `robots.txt/` route reads a `posture` option that sets its stance toward AI training crawlers. [Choose an AI posture](choose-an-ai-posture.md) covers the choice.

The `media/[...path]/` route exports the [`createMediaRoute`](../reference/sveltekit.md#createmediaroute) handler. It validates each request and streams the object from `MEDIA_BUCKET`, adding security headers because the route sits outside `/admin`.

The `/healthz` route sits outside the guard. It answers with the payload that [`loadHealth`](../reference/sveltekit.md#loadhealth) returns, as JSON with status 200 when `ok` is true and 503 when it is false. A thrown error becomes a 503 with the fixed detail `health check failed`. Every answer carries `cache-control: no-store`, and the route exports `prerender = false`.

### Root layout and error page

The root `+layout.server.ts` load returns the menus, the site name, and whether the site registers any island, as `nav`, `footerNav`, `siteName`, and `hasIslands`. It reads them from `site-config.ts` and the island registry, not the full adapter, to keep each request that is not prerendered light. `SiteHeader` and the root `+error.svelte` read those values through `page.data`. The root `+error.svelte` is the themed 404 and error page that [Themed 404 page](#themed-404-page) describes.

## Theme, chassis, and content

The adapter and Waymark's design share `src/theme/`. The chassis sits in `src/chassis/`, and the markdown and its committed manifests sit in `src/content/`.

### `src/theme/`

The adapter, `cairn.config.ts`, is one [`defineAdapter`](../reference/core.md#defineadapter) call over `content`, `backend`, `email`, `media`, `rendering`, and an `editor` group carrying `nav`, `navLayout`, and `preview`. The site imports it as `#theme/cairn.config.js`, and the `cairnManifest` `configModule` in `vite.config.ts` names it. In `navLayout`, the `Site` group carries only engine screens (`vocabulary`, `nav`, `settings`, and `editors`), and the `Content` group carries the `media` entry. For more information, see [Define an adapter and schema](define-an-adapter-and-schema.md), [Arrange the admin sidebar](arrange-the-admin-sidebar.md), and [Customize the sign-in email](add-cairn-to-a-sveltekit-app.md#customize-the-sign-in-email).

Besides the adapter, the directory holds the following files:

- `site-config.ts`: the one [`parseSiteConfig`](../reference/core.md#parsesiteconfig) call site, over `site.config.yaml`
- `site.config.yaml`: the site name, the description, the primary and footer menus, the tag `vocabulary`, `spellcheck` with its `dialect`, and `tidy`, shipped enabled
- `markdown-components.ts`: nine [`defineComponent`](../reference/core.md#definecomponent) declarations, one of them hydrated
- `icons.ts`: the `IconSet` that the components and the icon picker draw from
- `components/`: `ArticleView.svelte`, `EntryRow.svelte`, `SiteFooter.svelte`, `SiteHeader.svelte`, and `admin-link.ts`
- `islands/`: `Banner.svelte`, `banner-expiry.ts`, and a `registry.ts` that maps `banner` to `Banner.svelte`
- `theme.css` and `site.css`: the theme's tokens and page styling
- `theme-names.ts`: the daisyUI theme names, which `src/app.html` and `theme.css` repeat

[Theme your public site](theme-your-public-site.md) covers changing the design.

### `src/chassis/`

The chassis is the design-neutral code every scaffolded site shares, copied into `src/chassis/` with Waymark. [Port your theme onto the chassis](theme-your-public-site.md#port-your-theme-onto-the-chassis) describes where the chassis ends and the theme begins. The chassis also holds the archive's page size, described in [Settings outside the admin](#settings-outside-the-admin).

### `src/content/`

Content is markdown with YAML frontmatter, one directory per concept, named by the concept's `dir`. The scaffold declares `posts`, `pages`, and `fragments`, seeded with 14 sample posts, two pages, and one fragment. Because the adapter names each directory, renaming one changes the concept's `dir` in the adapter and the matching `cairnManifest` content glob in `vite.config.ts`.

### `src/content/.cairn/`

This directory holds the following committed files, which the engine and its build tools write:

- `index.json`: the content manifest. `cairn-manifest` regenerates it, the `cairnManifest` plugin fails the build when it drifts from the markdown, and each publish commit patches it.
- `media.json`: the media registry, written by the admin's media upload, metadata, and delete commits.
- `site-facts.json`: the adapter's media bucket binding, plus its roles and AI posture when the adapter declares them, which `cairn-manifest` writes. The scaffold's file carries only the bucket binding.

The `cairn:manifest` script runs `cairn-manifest`. For more information, see the [`cairnManifest`](../reference/vite.md#cairnmanifest) reference and [The `site-facts.json` contract](../reference/site-facts.md).

## Style sheets

The site compiles two separate sets of styles, the admin's from `src/admin.css` and the public site's from `theme.css` and `site.css`. `src/admin.css` ends with an import of `@glw907/cairn-cms/admin-sources.css`. That engine file holds only the `@source` directives for the engine's shipped admin markup. The pre-scripts compile `src/admin.css` into `.cairn/admin.css`, inside the gitignored root `.cairn/` directory. The import does not replace the engine's precompiled `dist` sheet, and the audit config names both sheets, as [`cairn-audit.config.json`](#cairn-auditconfigjson) describes.

`theme.css` and `site.css` hold the theme's tokens and page styling. Beneath them sit two lower layers: the engine's `cairn-public.css` roles, which the chassis `tokens.css` imports right after Tailwind, and the chassis's design-scale defaults. [Re-skin Waymark](theme-your-public-site.md#re-skin-waymark) covers how the layers combine.

## Settings outside the admin

The archive's page size and the footer menu are set in files, outside the admin. `ARCHIVE_PAGE_SIZE` in `src/chassis/archive.ts` is the one page-size setting for both the home page and the archive, and the scaffold sets it to 13. Both paginate every post after the newest one, and the home page shows that one as its lead. The page `/archive/2` therefore first exists once more than 14 posts are published. `/admin/nav` edits only the primary menu. The footer menu is a flat menu that the developer edits by hand in `site.config.yaml`.

## Crawl rules

The prerender crawl fails the build on an unseen route or an HTTP error, and the scaffold keeps its build passing with one route exemption and one link attribute. `handleUnseenRoutes` exempts only `/(site)/archive/[page]`. When every post fits on page one, the crawl finds no page of that route. Without the exemption, SvelteKit's unseen-route check would fail the build. Any other unseen prerenderable route still throws.

A link to `/admin` in prerendered public markup carries `rel="external"` so that the crawler never requests it. Every `/admin` route answers a build-time crawl with an error, and `handleHttpError` throws on any HTTP error. The header and footer apply the attribute through the shared `isAdminHref` predicate. A new `/admin` link in public markup needs the same attribute. For the prerender options, see SvelteKit's [Vite plugin reference](https://svelte.dev/docs/kit/@sveltejs-kit-vite).

## Themed 404 page

A scaffolded site serves a themed 404 page only when two settings are both in place: the root `src/routes/+error.svelte` and `assets.not_found_handling` set to `"none"` in `wrangler.jsonc`. The prerendered `(site)` group's catch-all is stripped from the runtime manifest, so that group's layout never runs for an unmatched path. The root `+error.svelte` therefore rebuilds the site chrome itself. It reads the menus and the site name through `page.data` from the root `+layout.server.ts`.

On the Worker's side, `"none"` passes an unmatched request to the Worker. The `"404-page"` setting would instead serve an unthemed static file from the edge without running the Worker. Cloudflare's [Worker script routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/) page documents the setting.

## Setup state outside the tree

The setup command left its record of the run on the machine that ran it and, when the run connected Workers Builds, a build token at Cloudflare.

The record sits at `~/.config/cairn/sites/<id>.json`, never under the project directory. Its directory has mode 0700 and the file has mode 0600. Two setup steps use a Cloudflare API token, and each asks for its own token rather than reusing the other's. Each step keeps its pasted token in the record only until the step ends, whether it completes or the developer declines it, and then deletes the token. Each step also deletes its token when the token is invalid or lacks a permission it needs, and the Workers Builds step deletes its token when a `--yes` run stops because it cannot open a browser. A `--yes` run reads the token from `CAIRN_CF_API_TOKEN` and refuses a token-shaped value on the command line.

A resumed run reads the record, and `--sign-in` needs it. A developer who took over the site from someone else has no copy of that record, which sits in the home directory of whoever ran the command. That developer can neither resume the run nor use `--sign-in`.

On a resumed run, `--org`, `--repo-name`, `--app-name`, and `--owner-email` override a saved answer for any step that has not yet run. The `--brand-color` flag accepts a `#`-prefixed hex color, an `oklch(...)` string, or a bare number read as a hue in degrees, and any other shape fails. The setup run's Workers Builds step either connects the repository or records a decline. The `--connect` flag re-enters that step only for a site at or past its first deploy.

When the Workers Builds step connects the repository, it registers the pasted token as the build token named `cairn create-cairn-site build token` and binds the site's build trigger to it. If a build token for the same Cloudflare token already exists, the step reuses it.

## Related resources

The following guides cover changing or rebuilding parts of the tree.

- [Add cairn to a SvelteKit app](add-cairn-to-a-sveltekit-app.md)
- [Theme your public site](theme-your-public-site.md)
- [Add a custom admin screen](add-a-custom-admin-screen.md)
- [Define an adapter and schema](define-an-adapter-and-schema.md)
- [Upgrade cairn](upgrade-cairn.md)

The following pages explain the engine these files wire in.

- [Architecture](architecture.md)
- [Security model](security-model.md)
- [Content model](content-model.md)

The following external pages document the platforms the files configure.

- [SvelteKit project structure](https://svelte.dev/docs/kit/project-structure)
- [SvelteKit Vite plugin](https://svelte.dev/docs/kit/@sveltejs-kit-vite)
- [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)
- [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/)
