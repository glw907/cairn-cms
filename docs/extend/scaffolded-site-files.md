# Scaffolded site files

A site that `create-cairn-site` scaffolded arrives as a complete SvelteKit project in its own GitHub
repository, already deployed as a Cloudflare Worker, with the engine, `@glw907/cairn-cms`, listed as
one ordinary dependency in `package.json`. Its theme is Waymark, cairn's reference reading theme, on
a chassis of shared plumbing, both baked from the same tree the engine tests itself against.
SvelteKit mounts the admin as one catch-all route pair under `/admin` and the public site as a
prerendered route group, a server hook guards `/admin`, and the SvelteKit config sits inline in
`vite.config.ts` with no `svelte.config.js`. On the Cloudflare side, `wrangler.jsonc` declares the
Worker's two D1 databases, its Email Sending binding, and its R2 bucket. On the GitHub side, the
repository holds the code and the markdown, the site's GitHub App commits each editor's publish into
it, and a GitHub Actions workflow checks every push and pull request.

Every file in the tree belongs to the site, since the npm package carries neither Waymark nor the
chassis. An engine upgrade moves the `@glw907/cairn-cms` range and leaves the tree as it is. Any
change a release needs in the site's code, a new D1 migration included, is the site's to make, as
the changelog's `Consumers must:` lines name it. Owning a file does not leave it unread, since some
files carry a contract with a reader outside the site's code. The engine reads the adapter in
`src/theme/cairn.config.ts`, the server hook that installs the guard, and the bindings in
`wrangler.jsonc`. The admin commits editors' work into the content directories and their manifests,
and `/admin/nav` writes the primary menu in `site.config.yaml`. A few more can fail the CI workflow
or the build, since `check.yml` runs the checks and the prerender handlers in `vite.config.ts` throw
on an unseen route or an HTTP error. Those files share directories with files only the site reads,
as the adapter shares `src/theme/` with the theme's style sheets, so a file's directory does not
say whether it carries a contract.

A developer who ran the setup command, or who took over a site from someone who did, needs to know
what each file does and whether to change it. One who took over also lacks the state the command
left outside the repository, which includes its saved record on the machine that ran it. When the
run connected Workers Builds, that state also includes the build token the site deploys on, whose
revocation stops deploys without warning. A reader who knows the engine's import points and seams
from [Architecture](architecture.md) finds where each lands in the tree, and a reader working on the
theme finds the files around it. A developer still choosing between the setup command and the
by-hand build sees what the command writes. One adding cairn to an app that already exists has no
choice to make, since the setup command writes only into a missing or empty directory.

A new owner's questions about a scaffolded site's files and state fall under the following subjects:

- What the scaffold is and who owns it
- The file tree, with the files the engine or a gate reads marked
- The root files, the build and deploy configuration, and the database migrations
- The routes, the theme, the chassis, the content, and the style sheets
- The settings a new owner edits by hand
- The build's crawl rules and the themed 404 page
- The state the setup command left outside the repository

Reading these files takes working knowledge of SvelteKit's project structure (routes, layouts,
hooks, and prerendering), Vite configuration, and Wrangler configuration for a Worker's bindings and
D1 migrations.

Separate pages cover the following related work:

- The by-hand build of the same tree, in
  [Add cairn to a SvelteKit app](add-cairn-to-a-sveltekit-app.md)
- Changes to the theme and the chassis, in [Theme your public site](theme-your-public-site.md)
- The signups screen as a pattern, in [Add a custom admin screen](add-a-custom-admin-screen.md)
- The wiring of each delivery route, in [Build the public routes](build-the-public-routes.md)
- The media configuration behind the `MEDIA_BUCKET` binding, in
  [Configure media](configure-media.md)
- The `cairn-audit.config.json` file in depth, in
  [Run cairn-audit on your site](run-cairn-audit-on-your-site.md)

## The scaffold

A scaffolded site is Waymark, cairn's reference theme, wired into a chassis of design-neutral
plumbing, both baked into the setup command's package from the engine repository's
`examples/showcase`, the tree the engine tests itself against. The bake prunes the showcase's
Playwright suite, its design-review routes (`theme-kit` and `probe-craft`), its test routes, and a
members-login fixture. Waymark is the
only template the setup command ships, and a second, Topo, is planned but not shipped. The same run
created the site's GitHub App, its repository, and its Cloudflare bindings, and deployed the site,
so the site arrives already live.

The npm package's `files` list carries neither Waymark nor the chassis, so no engine release ships a
newer copy of any file in the tree. An engine update arrives through the `@glw907/cairn-cms`
dependency and leaves the tree's files as they are.

A site built by hand from `sv create` starts with neither Waymark nor the chassis, as
[Add cairn to a SvelteKit app](add-cairn-to-a-sveltekit-app.md) describes. A file the site owns can
still carry a contract that engine code or a gate reads, and the file tree marks each such file.

## File tree

The setup command writes the following tree, where `[engine]` marks a file the engine reads or
writes, and `[gate]` marks a file a check reads that can fail the build or the CI run.

```text
.
├── .claude/                      [engine]
│   ├── agents/
│   ├── cairn/
│   └── skills/
├── .github/
│   └── workflows/
│       └── check.yml             [gate]
├── migrations/                   [engine]
├── migrations-app/
├── scripts/
│   └── dev.mjs
├── src/
│   ├── access.ts                 [engine]
│   ├── admin.css                 [gate]
│   ├── app.d.ts
│   ├── chassis/
│   ├── content/
│   │   ├── .cairn/               [engine] [gate]
│   │   ├── fragments/            [engine]
│   │   ├── pages/                [engine]
│   │   └── posts/                [engine]
│   ├── hooks.server.ts           [engine]
│   ├── lib/
│   ├── params.ts
│   ├── routes/
│   └── theme/
│       ├── components/
│       ├── islands/
│       ├── cairn.config.ts       [engine]
│       ├── icons.ts
│       ├── markdown-components.ts
│       ├── site-config.ts
│       ├── site.config.yaml      [engine]
│       ├── site.css
│       ├── theme-names.ts
│       └── theme.css
├── .dev.vars.example
├── .gitattributes
├── .gitignore
├── .prettierignore
├── .prettierrc
├── CLAUDE.md
├── LICENSE
├── README.md
├── cairn-audit.config.json       [gate]
├── package.json                  [gate]
├── tsconfig.json
├── vite.config.ts                [engine] [gate]
├── vitest.config.ts
├── worker-configuration.d.ts
└── wrangler.jsonc                [engine]
```

The tree shows the entries the following sections cover and leaves out files no section discusses.
`CLAUDE.md` and `.claude/` are Claude Code's files, listed under
[`CLAUDE.md` and `.claude/`](#claudemd-and-claude). `CLAUDE.md` carries no marker, since
`cairn-guidance check` reads it only to report whether it holds the import line, a report that
never fails the CI run, and `cairn-guidance install` never rewrites it. The `[engine]` marker on
`.claude/` marks the tree that `cairn-guidance install` writes.

## Root files

Beside a plain SvelteKit project's files, the root carries a CI workflow, a template for local
secrets, the audit's config, and the Claude Code guidance.

### `.github/workflows/check.yml`

The workflow runs `npm install`, `npm run check`, and `npm run check:cairn` on every push and pull
request. It pins `node-version: 24`, the only Node version the scaffold names, since it ships
neither an `.nvmrc` nor an `engines` field. Its last step reports Claude Code guidance status and
never fails the job. The [guidance reference](../reference/guidance.md) covers the step. The workflow
installs no browser, so the `check:cairn:rendered` script cannot run in it.

### `.dev.vars.example`

This file is the template for the gitignored `.dev.vars`, and its header says to copy it there and
never commit a real value. It names the GitHub App's identity as `GITHUB_APP_ID`,
`GITHUB_APP_INSTALLATION_ID`, and `GITHUB_APP_PRIVATE_KEY_B64` with placeholder values. It also
carries an empty `ANTHROPIC_API_KEY`, read only when tidy is enabled in `site.config.yaml`, as
[Turn on tidy](turn-on-tidy.md) describes.

### `cairn-audit.config.json`

The audit's config names both compiled admin sheets, the engine's
`node_modules/@glw907/cairn-cms/dist/admin/cairn-admin.css` and the site's `.cairn/admin.css`, so
the static audit sees every class the site's admin routes write. The site's sheet is a gitignored
build output in a `.cairn/` directory at the project root, separate from the committed
`src/content/.cairn/`. [Run cairn-audit on your site](run-cairn-audit-on-your-site.md) covers the config in depth.

### `CLAUDE.md` and `.claude/`

These are Claude Code's guidance files, covered in the [guidance reference](../reference/guidance.md).

### `.gitignore`

Because npm's packlist drops a file named `.gitignore`, the setup command's package stores this file
as `gitignore`. The setup command renames it after copying and stops with an error when it is
absent. The `.gitattributes` file ships under its own name. Among its entries, `.gitignore` excludes
the local `.dev.vars` and the compiled `.cairn/admin.css`, which the pre-scripts rebuild.

### Other root files

The files `LICENSE`, `README.md`, `.prettierignore`, `.prettierrc`, `tsconfig.json`, and
`vitest.config.ts` are a plain project's files. The `worker-configuration.d.ts` file is the
generated `wrangler types` output that `src/app.d.ts` references. The `scripts/` directory holds the
`dev.mjs` that the `dev` script runs. The `src/lib/` directory, imported through `#lib`, holds
`log.ts`, the site's own [`createLogger`](../reference/log.md#createlogger) instance over the site's
own event names. The two migration directories are covered under
[Database migrations](#database-migrations).

The `check` and `check:cairn` commands the CI workflow runs are scripts in `package.json`, the first
of the site's configuration files.

## Configuration files

The site builds and deploys from three configuration files, `package.json`, `vite.config.ts`, and
`wrangler.jsonc`, and `src/app.d.ts` types what they provide.

### `package.json`

The engine, `@glw907/cairn-cms`, sits in `dependencies`, and [Upgrade cairn](upgrade-cairn.md)
covers moving the range the site inherited. The `@glw907/cairn-cms-dev` package sits only in
`devDependencies`, and a build-time flag and a runtime check keep it out of a deployed site. [Wire
the dev backend](add-cairn-to-a-sveltekit-app.md#wire-the-dev-backend) in Add cairn to a SvelteKit
app explains those guards. The `imports` field declares `#chassis`, `#theme`, and `#lib` as subpath
imports, not config aliases.

The following table lists the scripts a new owner meets first and what each one runs.

| Script | What it runs |
| --- | --- |
| `dev` | Runs the `dev.mjs` script in `scripts/`, which starts `vite dev` with `CAIRN_DEV_BACKEND=1` beside a Tailwind watch, so the local admin runs on the in-memory dev backend. |
| `build` | Runs `vite build`, which produces the Worker that `wrangler.jsonc` names as `main`. |
| `predev`, `prebuild`, `precheck` | Compile the gitignored `.cairn/admin.css`, so a Workers Builds `npm run build` needs no separate step. |
| `check:cairn` | Compiles the admin sheet, then runs `cairn-audit`, which exits 1 only on an unsuppressed error-tier finding and names a missing `daisyui` or `tailwindcss` peer. |
| `check:cairn:rendered` | Runs `cairn-audit --rendered` in a real Playwright browser against a running admin, and the scaffold ships neither Playwright nor a browser-install step, so it does not run as shipped. |
| `cairn:manifest` | Runs `cairn-manifest`. |
| `format`, `format:check` | Run Prettier. |
| `test:unit` | Runs `vitest run`. |

### `vite.config.ts`

The scaffold carries no `svelte.config.js`, so the whole SvelteKit config passes inline to
`sveltekit()` in this file. That config sets the Cloudflare adapter with
`platformProxy: { remoteBindings: false }` and a prerender `handleHttpError` that throws on every
prerender HTTP error. The same `prerender` option holds `handleUnseenRoutes`, and
[Crawl rules](#crawl-rules) states what both handlers enforce.

The config carries no `csrf` key, so SvelteKit's Origin check runs ahead of every handle on every
route, `/admin` included, and cairn's guard adds a double-submit token on top. SvelteKit 3 removed
`csrf.checkOrigin`, and a config that sets it fails validation.
[CSRF protection](security-model.md#csrf-protection) in Security model covers both layers.

The `cairnManifest` plugin regenerates the committed content manifest on every build, and the
`src/content/.cairn/` entry states what fails when it drifts. The `__CAIRN_DEV_BUILD__` define is
the build-time half of the dev-backend gate, which the server hook reads.

### `src/app.d.ts`

This file imports `@glw907/cairn-cms/ambient` and declares the `__CAIRN_DEV_BUILD__` global. It
types `App.PageData` with the optional `nav`, `footerNav`, `siteName`, and `hasIslands` that the
root layout load returns. It references `@cloudflare/workers-types` and the
`worker-configuration.d.ts` that `wrangler types` writes. The
[ambient types reference](../reference/ambient.md) documents what the engine declares.

It also declares an optional `CAIRN_DEV_BACKEND` on `Cloudflare.Env`, because the chassis dev gate
reads it and `wrangler types` generates only what `wrangler.jsonc` and `.dev.vars.example` name. The
flag is a dev-only opt-in, never a production variable.

### `wrangler.jsonc`

The Worker's config declares the following bindings and one variable:

- `AUTH_DB`, the D1 auth store
- `APP_DB`, a second D1 database for the signups screen
- `EMAIL`, the Email Sending binding
- `MEDIA_BUCKET`, the R2 bucket that [Configure media](configure-media.md) sets up
- `PUBLIC_ORIGIN`, a plain variable

The `observability.enabled` setting is `true`, so Workers Logs records the Worker's logs. The
`assets.not_found_handling` setting is `"none"`, and [Themed 404 page](#themed-404-page) explains
why.

Each D1 binding names its own `migrations_dir`, so the site carries one migration directory per
database.

## Database migrations

The site keeps two migration directories because it binds two D1 databases, and
`wrangler d1 migrations apply` walks one directory per database.

### `migrations/`

This directory holds the auth store's schema for `AUTH_DB`, in `0000_auth.sql`, `0003_preview.sql`,
and `0004_login_nonce.sql`. The engine's `0001_roles.sql` and `0002_audit.sql` are opt-in and
absent. The first serves a site that declares a role vocabulary beyond the default owner and editor
pair, as [Restrict admin access](restrict-admin-access.md) describes. The second serves a site that
wires `createD1AuditSink`, as
[Wire the audit sink](add-a-custom-admin-screen.md#wire-the-audit-sink) in Add a custom admin screen
describes.

### `migrations-app/`

This directory holds `0000_signups.sql`, the `signups` table with `id`, `name`, and `email` columns
behind `/admin/signups`. The `migrations_dir` of `APP_DB` points at it, because a directory shared
with `migrations/` would apply each schema to both databases. The signups table backs the one custom
admin screen among the scaffold's routes, which reads it only after `migrations-app/` is applied.

## Routes and the server hook

The server hook in `src/hooks.server.ts` installs the auth guard over `/admin`, and the routes split
into that admin mount, a prerendered public site in the `(site)` group, and endpoints at the root.
In the following route tree, `[engine]` marks the admin mount.

```text
src/
├── params.ts
└── routes/
    ├── (site)/
    │   ├── [...path]/
    │   ├── [...path=md]/
    │   ├── archive/[page]/
    │   ├── preview/[token]/
    │   ├── styleguide/
    │   ├── +layout.svelte
    │   ├── +page.server.ts
    │   └── +page.svelte
    ├── admin/                    [engine]
    │   ├── [...path]/
    │   ├── signups/
    │   ├── +layout.server.ts
    │   └── +layout.svelte
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

### `src/hooks.server.ts` and `src/access.ts`

The hook picks `devBackendHandle` or `createAuthGuard` in one `if` and exports the result as
`handle`. Its test reads the build-time `__CAIRN_DEV_BUILD__` define first and the runtime opt-in
`CAIRN_DEV_BACKEND === '1'` second. Under `vite dev`, the opt-in falls back to `process.env`. Both
handles receive `{ access }`, the `defineAccess` map in `src/access.ts`. [Restrict admin
access](restrict-admin-access.md) configures that map.

### `src/routes/admin/`

The admin mount is one catch-all pair, `[...path]/+page.server.ts` and `+page.svelte`, beside the
shared layout pair, `+layout.server.ts` and `+layout.svelte`. Those are the only files directly
under `admin/` besides `signups/`, and [The canonical admin mount](../reference/admin-routes.md)
documents the pairs.

The `signups/` route is a custom screen whose load calls `requireAccess` and reads the `signups`
table through `env.APP_DB` from `cloudflare:workers`, and it fails closed with a 500 when the
binding is absent. Its form actions are `createSectionAction` wrappers, and its table exists only
after `0000_signups.sql` in `migrations-app/` is applied to `APP_DB`.
[Add a custom admin screen](add-a-custom-admin-screen.md) covers the pattern the screen follows.

### `src/routes/(site)/`

The entry catch-all `[...path]` and its raw-markdown twin `[...path=md]` coexist through
`createPublicRoutes`, and `params.ts` in `src/` defines the `md` matcher through SvelteKit's
`defineParams`. The `archive/[page]` route slices its page with the chassis `archive.ts`, and the
group also holds `preview/[token]` and `styleguide/`.
[Build the public routes](build-the-public-routes.md) covers each route's wiring.

### Endpoints at the root

The root also holds `feed.json/`, `feed.xml/`, and `sitemap.xml/`. The `robots.txt/` route reads a
`posture` option for its stance toward AI training crawlers, which
[Choose an AI posture](choose-an-ai-posture.md) sets.

The `media/[...path]/` route exports the `createMediaRoute` handler, which streams uploaded media
from `MEDIA_BUCKET` at content-addressed keys with its own security headers, since the route sits
outside `/admin`. [Configure media](configure-media.md) sets up the bucket, and the
[`createMediaRoute`](../reference/sveltekit.md#createmediaroute) entry documents the validation.

The `healthz/` route sits outside `/admin`, so the guard does not gate it. It returns the
`loadHealth` payload `{ ok, checks: { githubAppSigning } }` as JSON with status 200 even on failure,
catches a thrown error into the same shape, and sets `prerender = false`. Because the status is 200
either way, a monitor reads the `ok` field for the verdict.
[Why `/healthz` lives at the site root](../reference/admin-routes.md#why-healthz-lives-at-the-site-root)
in the admin mount reference explains the placement.

### Root layout and error page

The root `+layout.server.ts` returns `hasIslands`, the `nav` and `footerNav` menus, and `siteName`.
It reads `site-config.ts` and the island registry rather than the full adapter, so the layout load
that runs on every non-prerendered request never imports the adapter. The `SiteHeader` component and
the root `+error.svelte` read that data through `page.data`. The error page is the site's themed 404
and error page, which [Themed 404 page](#themed-404-page) explains. The admin mount reference covers
the root layout's limits in [The root layout must be
chrome-free](../reference/admin-routes.md#the-root-layout-must-be-chrome-free). The menus and the
site name the root layout returns come from `src/theme/`, the directory that also holds the adapter.

## Theme, chassis, and content

The `src/theme/` directory holds the adapter and Waymark's design, `src/chassis/` holds the plumbing
every scaffolded site shares, and `src/content/` holds the markdown and its committed manifests.

### `src/theme/`

The adapter, `cairn.config.ts`, is one `defineAdapter` call over `content`, which declares `posts`,
`pages`, and `fragments`, plus `backend`, `email`, `rendering`, and an `editor` group carrying
`navLayout`. Its `backend` is one `createGithubApp` call, and its `email` is `{ from }`.
[Define an adapter and schema](define-an-adapter-and-schema.md) covers changing the concepts, and
[Arrange the admin sidebar](arrange-the-admin-sidebar.md) covers `navLayout`.
[Customize the sign-in email](add-cairn-to-a-sveltekit-app.md#customize-the-sign-in-email) in Add
cairn to a SvelteKit app covers the email's sender and copy.

The rest of the directory holds the following files:

- `site-config.ts`, the one `parseSiteConfig` call, over `site.config.yaml`
- `site.config.yaml`, which holds `siteName`, `description`, the primary and footer menus, and the
  tag `vocabulary`
- `markdown-components.ts`, with nine `defineComponent` declarations, one of them hydrated
- `icons.ts`, the `IconSet` the components and the picker draw from
- `components/`, the chrome: `ArticleView`, `EntryRow`, `SiteFooter`, `SiteHeader`, and
  `admin-link.ts`
- `islands/`, which holds `Banner.svelte`, its `registry.ts`, and `banner-expiry.ts`
- `theme.css` and `site.css`, which [Style sheets](#style-sheets) covers
- `theme-names.ts`

[Theme your public site](theme-your-public-site.md) covers changing these files.

### `src/chassis/`

The chassis is the design-neutral plumbing every scaffolded site shares, copied into the tree with
Waymark, so an engine update leaves it unchanged.
[The chassis boundary](theme-your-public-site.md#the-chassis-boundary) in Theme your public site
covers what it holds and when a port edits it. Its `archive.ts` holds the archive's page size, which
[Settings outside the admin](#settings-outside-the-admin) covers.

### `src/content/`

Content is markdown with YAML frontmatter, one directory per concept, named by the concept's `dir`.
The scaffold seeds `posts/` with 14 sample posts, `pages/` with `about.md` and `the-trail-crew.md`,
and `fragments/` with `trail-safety-notice.md`. Because the adapter names each directory, renaming
one is an adapter change.

### `src/content/.cairn/`

This directory holds three committed files. The `index.json` file is the content manifest, which the
`cairnManifest` plugin and `cairn-manifest` regenerate and a publish commit patches. The build fails
when `index.json` drifts from the markdown on disk. The `media.json` file is the media registry that
the admin's media upload, metadata, and delete commits write. The `site-facts.json` file is written
by `cairn-manifest`, which the `cairn:manifest` script runs. The
[`cairnManifest`](../reference/vite.md#cairnmanifest) entry documents the plugin, and
[The `site-facts.json` contract](../reference/site-facts.md) documents the facts file.

## Style sheets

The site compiles two separate sets of styles, the admin's from `src/admin.css` and the public
site's from `theme.css` and `site.css`.

### `src/admin.css`

Its last line imports `@glw907/cairn-cms/admin-sources.css`, an engine-owned file that holds only
the `@source` directives for the engine's shipped admin markup, resolved from the file's installed
location. The pre-scripts compile it into the gitignored `.cairn/admin.css` at the project root, one
of the two sheets `cairn-audit.config.json` names. The config's other entry is the engine's
precompiled `dist` sheet, a different artifact that the sources import does not replace. The audit's
`no-uncompiled-class` rule checks classes against that compile. A compile failure in this file fails
`npm run check`, `npm run build`, and `npm run check:cairn`, since each compiles it first.

### `src/theme/theme.css` and `src/theme/site.css`

These hold the theme's tokens and page styling, layered over the engine's `cairn-public.css` roles
and the chassis's design-scale defaults. The roles are the status inks, the shadow, the focus ring,
`--color-muted`, and `--color-card-border`, and the chassis `tokens.css` imports them right after
Tailwind. [Token tiers and cascade order](theme-your-public-site.md#token-tiers-and-cascade-order)
in Theme your public site covers which declaration wins.

## Settings outside the admin

The archive's page size and the footer menu are set in files, outside the admin.

The `ARCHIVE_PAGE_SIZE` constant in the chassis `archive.ts`, 13 in the scaffold, is the one
page-size setting for both the home page and `/archive/[page]`. Both paginate every post after the
newest one, which the home page shows as its lead, so a new site with its 14 seeded posts has no
`/archive/2` until a fifteenth post is published.

The `/admin/nav` screen edits only `menus.primary`. The footer menu, `menus.footer`, is a flat menu
the developer edits by hand in `site.config.yaml`, read through `readMenu(siteConfig, 'footer', 1)`.

The archive route the page size governs is also the one route the build's unseen-route check
exempts.

## Crawl rules

The prerender crawl fails the build on an unseen route or an HTTP error, and the scaffold keeps its
build passing with one route exemption and one link attribute. The two handlers behind those
failures, `handleUnseenRoutes` and `handleHttpError`, sit in the `prerender` option of the inline
`sveltekit()` call in `vite.config.ts`.
[SvelteKit's Vite plugin reference](https://svelte.dev/docs/kit/@sveltejs-kit-vite) documents their
options.

The `handleUnseenRoutes` handler exempts only `/(site)/archive/[page]`, because a corpus that fits
on page one gives that route no entries, and SvelteKit's crawl-completeness check would otherwise
fail the build. Any other unseen prerenderable route still throws.

A link to `/admin` in prerendered public markup carries `rel="external"`, so the crawler never
requests it. Every `/admin` route answers a build-time crawl with an error, and the scaffold's
`handleHttpError` throws on any HTTP error. The header and footer apply the attribute through the
shared `isAdminHref` predicate in `admin-link.ts` under `src/theme/components/`. A new `/admin` link
in public markup needs the same attribute.

A path the build never emitted is answered at request time, and the scaffold's `wrangler.jsonc`
passes it to the Worker so the themed 404 page can render.

## Themed 404 page

A scaffolded site serves a themed 404 page through two pieces that need each other, the root
`src/routes/+error.svelte` and the `assets.not_found_handling` setting of `"none"` in
`wrangler.jsonc`.

The prerendered `(site)` group's catch-all is stripped from the runtime manifest, so that group's
layout never runs for an unmatched path. The root `+error.svelte` therefore rebuilds the site chrome
itself. It reads the menus and the site name through `page.data` from the root `+layout.server.ts`.

The `"none"` value passes an unmatched request to the Worker, where the error page renders. The
`"404-page"` value would serve an unthemed static file from the edge without invoking the Worker.
Cloudflare's
[Worker script routing page](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/)
documents both values. With `"404-page"`, the error page never runs, and without the root error
page, no layout rebuilds the chrome for an unmatched path.

## Setup state outside the tree

The setup command kept its record of the run on the machine that ran it. When the run connected
Workers Builds, it also registered the Cloudflare API token pasted during setup as the build token
the site's deploys use.

The record is `~/.config/cairn/sites/<id>.json`, with directory mode 0700 and file mode 0600, never
under the project directory, and it includes the pasted Cloudflare token. A `--yes` run reads the
token from `CAIRN_CF_API_TOKEN` and refuses a token-shaped command-line value. A developer who took
over the site from someone else has no copy, since the file sits in the home directory of whoever
ran the command.

A resumed run reads the saved answers from that record, so the run resumes only on a machine that
holds the file. On a resumed run, `--org`, `--repo-name`, `--app-name`, and `--owner-email`
override the saved answer for any setup step not yet run. The `--brand-color` flag takes a
`#`-prefixed hex color, an `oklch(...)` string, or a bare number read as a hue in degrees, and any
other shape fails.

The build token is named `cairn create-cairn-site build token`, and the Workers Builds step reuses
an existing build token that wraps the same token id. Revoking or rolling that token at Cloudflare
breaks automatic deploys with no prior warning. The next commit still triggers a build, and the
build fails. The API token setting in the Worker's Workers Builds build configuration holds the
token its builds authenticate with. A new owner can create an API token of their own and select it
there, as Cloudflare's
[build configuration page](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/#api-token)
describes.

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
- [SvelteKit Vite plugin options](https://svelte.dev/docs/kit/@sveltejs-kit-vite)
- [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)
- [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/)
