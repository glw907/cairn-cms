# Page plan: Scaffolded site files

Page: `docs/extend/scaffolded-site-files.md`. Brief: `docs/internal/briefs/extend/scaffolded-site-files.json`
(the drafter writes it). Framing record: `docs/internal/briefs/extend/scaffolded-site-files.framing.md`
(the framing step writes it after this plan's read). Page type: concept, in the extend track's
Start group, third after Architecture and Add cairn to a SvelteKit app. Status: new page, no
committed draft. Written 2026-10-07 by the plan step of the docs page chain (stage 2a, task 8).

The drafter drafts from this plan: it is the source of the page's order, each section's claim, and
each fact's placement. The plan is Google's outline written down (Google Technical Writing Two,
"Organizing large documents", https://developers.google.com/tech-writing/two/large-docs).

Inputs read: the outline entry for `scaffolded-site-files` in `docs/internal/outlines/extend.json`
(job, covers, outOfScope, exemplars, crossLinks, and relink 125); "The page anatomies", "Structure",
"The introduction", and "Names" in `docs/internal/docs-register.md`; the two exemplars
(`~/.local/share/cairn/exemplars/extenders/shadcn-introduction/page.md`,
`~/.local/share/cairn/exemplars/designers/ghost-themes-structure/page.md`); every fact bullet named
below in `docs/internal/facts/extend.md` and `docs/internal/facts/front-door.md`; the stage plan's
known-defect table (`docs/superpowers/plans/2026-09-30-draft-docs-stage-2a.md`, "Known code defects
on 2a pages"); the reference pages this plan links (`docs/reference/guidance.md`,
`docs/reference/admin-routes.md`, `docs/reference/ambient.md`, `docs/reference/site-facts.md`,
`docs/reference/cairn-audit.md`, `docs/reference/supported-toolchain.md`, and the `createMediaRoute`
and `loadHealth` entries of `docs/reference/sveltekit.md`); the committed pages that link here
(`docs/extend/architecture.md`, `docs/extend/theme-your-public-site.md`); and the template sources
the facts cite (`templates/waymark/`, `packages/create-cairn-site/src/`, `src/lib/guidance/`).
`npx cairn-guidance check` was run read-only against `templates/waymark/` to confirm what a fresh
scaffold's check prints.

Headings in this plan are the page's headings, verbatim. A claim inventory `section` names one of
the H2 headings. The introduction is the untitled text under the H1 and is named `Introduction`.

## What the page argues

A scaffolded site is a complete SvelteKit project that the site owns outright, and only a short,
marked set of its files carries a contract that the engine or a gate reads. A new owner who knows
which files those are can change everything else freely and change those few with the contract
kept. The page proves the claim file by file: it states the ownership up front, draws the tree
with the contract files marked, gives each file or directory one short entry saying what it does,
whether it is the site's to change, and what reads it, then states the rules that span several
files, the agent guidance an engine command refreshes, and the state the setup command left
outside the repository.

The two exemplars set the shape. From shadcn's introduction: the up-front ownership statement and
one line per principle on what owning the code changes in practice, with no pitch and no call to
action. From Ghost's theme structure page: the annotated tree first, load-bearing entries marked
inline, then one short entry per file under a heading that names the file.

## The order, and why

The outline's `covers` order is an inventory. The page re-sequences it so each section introduces
information where the reader needs it, and so each section hands off to the next on a real turn in
the subject.

1. **The scaffold** (the anatomy's definition). Ownership comes first because every later answer to
   "may I change this?" rests on it, the shadcn take.
2. **File tree**. The map every later section walks, the Ghost take: the tree before any entry,
   with `[engine]` and `[gate]` markers answering the job's "which ones the engine or its gates
   depend on" at a glance.
3. **Root files**. The tree's first entries, and the CI workflow among them is the gate every push
   meets, which makes the `[gate]` marker concrete.
4. **Configuration files**. The CI workflow runs `package.json` scripts, and the build those
   scripts start reads `vite.config.ts` and deploys through `wrangler.jsonc`; the reader's first
   command, `npm run dev`, is here too. Its last entry, `wrangler.jsonc`, ends on the D1 bindings.
5. **Database migrations**. Each D1 binding names its own migrations directory, the hand-off from
   `wrangler.jsonc`.
6. **Routes and the server hook**. The signups table in `migrations-app/` backs the one custom
   screen among the routes, the hand-off from migrations. The server hook opens the section
   because the guard it installs decides which routes are gated, which `/healthz` depends on.
7. **Theme, chassis, and content**. What the routes read: the adapter, the design, the chassis,
   the markdown, and the committed manifests.
8. **Style sheets**. Two of the theme's files are style sheets, and the admin compiles its own; the
   section is short and defers depth to Theme your public site.
9. **Settings outside the admin**. The archive page size and the footer menu live in files the
   reader has now located (`src/chassis/archive.ts`, `src/theme/site.config.yaml`).
10. **Crawl rules**. The archive route the page size governs is the one route the crawl check
    exempts, the hand-off from the settings. Build-time rules come before request-time ones.
11. **Themed 404 page**. The request-time rule, spanning `wrangler.jsonc` and the root error page,
    both introduced by now.
12. **The guidance tree**. The one part of the tree written for coding agents rather than the
    site, with the commands that keep it current. In-tree material ends here.
13. **Setup state outside the tree**. What lives outside the repository closes the body, and its
    last sentence is the build-token risk, the one item there that can break a live site.
14. **Related resources** (the anatomy's ending).

### Departures from the outline's cover order, with the reason for each

- Cover 8 (the pre-scripts, `cairn:manifest`, `format`, `test:unit`) folds into cover 3's
  `package.json` entry, so the file's scripts are stated once, in one table.
- Cover 2's `.claude/` detail (the four skills, the extension reviewer agent, the `VERSION` stamp)
  and `CLAUDE.md` move to The guidance tree (cover 13). The root entries name that section in one
  sentence. One section then states every guidance file once, beside the commands that write it.
- `src/hooks.server.ts` and `src/access.ts`, which no cover names, open Routes and the server hook:
  the guard decides what "outside the guard" means for `/healthz` (cover 5). `src/app.d.ts` stays in
  Configuration files (cover 3), placed between `vite.config.ts` and `wrangler.jsonc` because it
  types what each of them provides.
- `src/chassis/`, which no cover names, joins cover 6, since the theme sits on it and the archive
  page size lives in it.
- Covers 9, 10, and 11 run as 11, 10, 9: the settings (cover 11) lead into the archive exemption
  (cover 10), and the build-time crawl precedes the request-time 404 (cover 9). All three follow
  the per-directory sections because each spans files those sections introduce.
- Cover 12 (outside the tree) follows cover 13 (guidance): everything in the tree first, then what
  is not in it.

### Heading policy

Headings are sentence case. H2 headings are noun phrases with no leading -ing word, no question,
and no teaser. An H3 under a directory section names the file or directory it covers, as a path in
code font (the Ghost take), or, for a group of files, names the group as a noun phrase (Other root
files, Endpoints at the root, Root layout and error page). No H3 carries a link. Text follows every heading before the next
one. No committed page links an anchor on this page: `docs/extend/architecture.md` (lines 7 and
193) and `docs/extend/theme-your-public-site.md` (lines 36 and 510) link it whole, and relink 125
(`examples/showcase/README.md`, restored by task 9) points at the page whole, so every slug is
free.

## Introduction

No heading. The framing step reasons the readers and writes the intro plan; the drafter writes the
introduction from that record. This section fixes what the framing keeps: Google's three parts and
the concept anatomy's requirements.

- **Opening.** A statement about a scaffolded site or the reader's situation, never about the page
  and never an imperative. The anatomy asks for a summary paragraph that introduces the concept,
  says why it matters, and overviews the page's scope.
- **Why it matters.** A new owner inherits files that the engine and its gates read beside files
  that are only the site's, and nothing in the tree says which is which. Knowing the difference is
  what lets them change the site without breaking a build, a deploy, or the admin.
- **What the page covers** (Google part 1). A bulleted list in body order, plain subjects with no
  code span or numeral, introduced by a complete sentence that names the subjects and never the
  page: what the scaffold is and who owns it; the file tree, with the files the engine or a gate
  reads marked; the root files, the build and deploy configuration, and the migrations; the routes,
  the theme, the chassis, the content, and the style sheets; the settings a new owner edits by hand;
  the build's crawl rules and the themed 404 page; the agent guidance and its commands; and the
  state the setup command left outside the repository. The framing step may merge items, but the
  list must still match the body.
- **Prior knowledge** (Google part 2). SvelteKit's project structure (routes, layouts, hooks, and
  prerendering), Vite configuration, and Wrangler configuration for a Worker's bindings and D1
  migrations. A Svelte-fluent reader needs nothing more.
- **What the page doesn't cover** (Google part 3). A bulleted list of six items under a complete
  lead-in that never names the page itself, each item subject first and page last:
  - Building the same tree by hand, in `docs/extend/add-cairn-to-a-sveltekit-app.md`
  - Changing the theme and the chassis, in `docs/extend/theme-your-public-site.md`
  - The signups screen as a pattern, in `docs/extend/add-a-custom-admin-screen.md`
  - Each delivery route's wiring, in `docs/extend/build-the-public-routes.md`
  - Media configuration behind the `MEDIA_BUCKET` binding, in `docs/extend/configure-media.md`
  - `cairn-audit.config.json` in depth, in `docs/extend/run-cairn-audit-on-your-site.md`
- **Readers the framing step weighs.** A developer who took over a site someone else scaffolded
  (the job's reader); a developer who ran the setup command and wants to know what it wrote and
  why; a reader arriving from Architecture to map the engine's import points onto real files; a
  reader arriving from Theme your public site for the file map behind the theme; and a reader who
  wants the by-hand build, routed to Add cairn to a SvelteKit app by the out-of-scope list.
- **Background facts** the framing may lean on, all placed in The scaffold: `f:kldwss`, `f:n2skkz`,
  `f:rxj43c`, `f:u705t5`.

## Sections, in order

Each section carries its heading; **Takes**, the one sentence a reader keeps, which is the section's
first sentence on the page (the drafter may re-word it to the register's voice, never change its
claim); **Draws on**, the fact ids placed there and what each contributes; and **Hand-off**, the turn
the section closes on. A hand-off is the last sentence of the section's final paragraph, never a
paragraph of its own and never a reference to the page's order ("below", "the next section"); the
following heading does the navigation. A fact "cited again" is placed in the section the
Dispositions table names and cited a second time where noted.

Every H3 entry opens on what the file or directory does. Where the job's three questions apply, the
entry answers each: what it does, whether the site changes it freely or must keep a contract, and
what reads it. The general answer to the second question is The scaffold's ownership statement, so
an entry restates it only where a contract limits it.

### 1. The scaffold

- **Takes:** A scaffolded site is Waymark, cairn's own reference theme, wired into a chassis of
  design-neutral plumbing, and the setup command bakes both from the same tree the engine tests
  itself against. (`f:n2skkz`, `f:rxj43c`)
- **Draws on:**
  - `f:n2skkz`: the source tree is `examples/showcase` in the engine repository, and the bake prunes
    its Playwright suite, its design-review routes (`theme-kit` and `probe-craft`), its test
    routes, and a members-login fixture.
  - `f:rxj43c`, the ownership statement, the shadcn take: the npm package's `files` list carries
    neither Waymark nor the chassis, so every file in the tree is the site's own and no engine
    release ships a newer copy of it. One sentence may add that a site built by hand from
    `sv create` starts with neither, linking `docs/extend/add-cairn-to-a-sveltekit-app.md`.
  - `f:u705t5`: Waymark is the only template the setup command ships; a second, Topo, is planned
    but not shipped.
  - `f:kldwss`: the same run created the site's GitHub App, its repository, and its Cloudflare
    bindings, and deployed it, so the tree arrives already live.
  - Then the shadcn principle lines: a two-item bulleted list under a complete lead-in sentence,
    each item one principle and what it changes in practice, each under 26 words. First, an engine
    update arrives through the `@glw907/cairn-cms` dependency and leaves the tree's files as they
    are (`f:o47i0q` cited again, `f:rxj43c`). Second, the agent guidance under `.claude/` changes
    when `npx cairn-guidance install` refreshes it (`f:0ygumq` cited again). No pitch line, no
    call to action, no "only" the facts do not state.
- **Hand-off:** Owning a file still leaves any contract that engine code or a gate reads from it,
  and the tree marks each such file.

### 2. File tree

- **Takes:** The setup command writes the following tree, where `[engine]` marks a file the engine
  reads or writes and `[gate]` marks a file read by a check that can fail the build or the CI run.
  (`f:qlgggh`)
- **Draws on:** `f:qlgggh` for the root and the `src/` entries, `f:qnf469` for `src/theme/`,
  `f:gj96px` and `f:vrue1g` for `src/content/`, `f:n52h8f` for `src/app.d.ts` and
  `worker-configuration.d.ts`, `f:f21bcz` for `src/hooks.server.ts`, and `f:qtm9y2` for
  `src/params.ts`. One plain-text code block, in the order a directory listing gives, with the root
  fully listed, `src/` one level deep, `src/content/` and `src/theme/` expanded one more level, and
  `src/routes/` collapsed to one line (Routes and the server hook draws its own tree). The block
  shows the entries the placed facts name and makes no claim to list every file, so `src/app.html`,
  which no placed fact names, stays out. Markers, each resting on the fact named:

  | Entry | Marker | Rests on |
  | --- | --- | --- |
  | `.claude/` | `[engine]` | `f:0ygumq` (`cairn-guidance install` writes it) |
  | `.github/workflows/check.yml` | `[gate]` | `f:guiavc` (runs the checks) |
  | `cairn-audit.config.json` | `[gate]` | `f:guiavc` (the audit reads it) |
  | `migrations/` | `[engine]` | `f:gepykz` (the auth store's schema) |
  | `package.json` | `[gate]` | `f:guiavc`, `f:mrv24k` (the scripts the CI runs) |
  | `src/access.ts` | `[engine]` | `f:qlgggh` (the guard reads the map) |
  | `src/admin.css` | `[gate]` | `f:666eg6`, `f:guiavc` (its compile is a sheet the audit reads) |
  | `src/content/.cairn/` | `[engine]` `[gate]` | `f:vrue1g` (the engine writes it; the build fails on drift) |
  | `src/content/posts/`, `pages/`, `fragments/` | `[engine]` | `f:gj96px`, `f:u4cfvv` (the adapter names each directory) |
  | `src/hooks.server.ts` | `[engine]` | `f:f21bcz` (installs the guard) |
  | `src/theme/cairn.config.ts` | `[engine]` | `f:u4cfvv` (the adapter) |
  | `src/theme/site.config.yaml` | `[engine]` | `f:2s8u70` (`/admin/nav` writes its primary menu) |
  | `vite.config.ts` | `[engine]` `[gate]` | `f:xluud1` (the manifest plugin), `f:2zl3qz`, `f:34rsss` (the prerender handlers fail the build) |
  | `wrangler.jsonc` | `[engine]` | `f:n7t4bn` (the bindings) |

  `CLAUDE.md` carries no marker: `cairn-guidance check` reads it, but that check never fails the CI
  run (`f:4ax489`, `f:jd54ph`). Every other entry is unmarked.
- **Hand-off:** Cut (scoped register read 2026-10-07: the next section's opening already carries the hand-off).
  (Was: The root holds the CI workflow that checks every push.)

### 3. Root files

- **Takes:** Beside a plain SvelteKit project's files, the root carries a CI workflow, a template
  for local secrets, the audit's config, and the agent guidance. (`f:qlgggh`, `f:guiavc`)
- **Draws on:** One H3 per entry, in this order.
  - `### .github/workflows/check.yml`: runs `npm install`, `npm run check`, and
    `npm run check:cairn` on every push and pull request (`f:guiavc`); pins `node-version: 24`
    because the scaffold ships neither an `.nvmrc` nor an `engines` field (`f:jcux9z`); and its last
    step runs `npx cairn-guidance check` under `continue-on-error: true` (`f:jd54ph`, cited again),
    which The guidance tree explains. The workflow installs no browser, which the
    `check:cairn:rendered` row in `package.json` states.
  - `### .dev.vars.example`: the template for the gitignored `.dev.vars`; it names the GitHub App's
    identity as `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`, and `GITHUB_APP_PRIVATE_KEY_B64` with
    placeholder values, plus an empty `ANTHROPIC_API_KEY` read only when tidy is enabled in
    `site.config.yaml`; its header says to copy it to `.dev.vars` and never commit a real value
    (`f:nls26c`). The drafter may link `docs/extend/turn-on-tidy.md` for tidy.
  - `### cairn-audit.config.json`: names both compiled admin sheets, the engine's
    `node_modules/@glw907/cairn-cms/dist/admin/cairn-admin.css` and the site's `.cairn/admin.css`,
    so the static audit sees every class the site's own admin routes write (`f:guiavc`). Link
    `docs/extend/run-cairn-audit-on-your-site.md` for the config in depth (the outline's
    crossLink). Why the engine path stays a `dist` path belongs to Style sheets.
  - `### CLAUDE.md and .claude/`: the root `CLAUDE.md` imports cairn's packaged fragment and keeps a
    `# Your site` section for the site's own guidance (`f:6ro1n9`, cited again), and `.claude/`
    holds the packaged skills, the review agent, and the fragment (`f:0ygumq`, cited again). One
    or two sentences, naming The guidance tree as the section that covers both.
  - `### .gitignore`: the package stores the file as `gitignore`, because npm's packlist drops a
    file named `.gitignore`, and the setup command renames it after copying and fails loudly when
    it is absent; `.gitattributes` ships under its own name (`f:qfv5iw`). Among what it ignores,
    two entries matter to the build: `.dev.vars` (`f:nls26c`, cited again) and the compiled
    `.cairn/` (`f:666eg6`, cited again).
  - `### Other root files`: `LICENSE`, `README.md`, `.prettierignore`, `.prettierrc`,
    `tsconfig.json`, and `vitest.config.ts` are a plain project's files (`f:qlgggh`);
    `worker-configuration.d.ts` is the generated `wrangler types` output that `src/app.d.ts`
    references (`f:n52h8f`, cited again); `scripts/` holds the `dev.mjs` the `dev` script runs
    (`f:o47i0q`, cited again). The two migrations directories have their own section.
- **Hand-off:** The `check` and `check:cairn` commands the CI workflow runs are scripts in
  `package.json`, the first of the site's configuration files (`f:guiavc`, `f:n4rg1z` for `package.json`).

### 4. Configuration files

- **Takes:** Three files configure how the site builds and deploys: `package.json` declares the
  engine and the scripts, `vite.config.ts` holds the whole SvelteKit config, and `wrangler.jsonc`
  describes the Worker and its bindings. (`f:o47i0q`, `f:n4rg1z`, `f:n7t4bn`) A second sentence
  adds `src/app.d.ts`, which types what the three provide (`f:n52h8f`).
- **Draws on:** One H3 per file, in this order.
  - `### package.json`.
    - `@glw907/cairn-cms` sits in `dependencies` (`f:o47i0q`); link `docs/extend/upgrade-cairn.md`
      for moving the inherited pin (the outline's crossLink).
    - `@glw907/cairn-cms-dev` sits only in `devDependencies`, behind a three-layer fence of a
      build-time flag, the `devDependency` boundary, and a runtime tripwire, so it never reaches a
      deployed site (`f:9mx680`); link the "Wire the dev backend" section of
      `docs/extend/add-cairn-to-a-sveltekit-app.md` (`#wire-the-dev-backend`).
    - The `imports` field declares `#chassis`, `#theme`, and `#lib` as subpath imports, not config
      aliases (`f:n4rg1z`).
    - The scripts, as a two-column table (script, what it runs) introduced by a complete sentence
      that states the table's purpose and claims no completeness, since `check`, `preview`,
      `build:admin-css`, and `dev:admin-css` carry no fact of their own:
      - `dev`: runs `scripts/dev.mjs`, which starts `vite dev` with `CAIRN_DEV_BACKEND=1` beside a
        Tailwind watch, so the local admin runs on the in-memory dev backend (`f:o47i0q`).
      - `build`: runs `vite build`, which produces the Worker that `wrangler.jsonc` names as `main`
        (`f:o47i0q`).
      - `predev`, `prebuild`, `precheck`: compile the gitignored `.cairn/admin.css`, so a Workers
        Builds `npm run build` needs no separate step (`f:666eg6`).
      - `check:cairn`: compiles the admin sheet, then runs `cairn-audit`, which exits 1 only on an
        unsuppressed error-tier finding and names a missing `daisyui` or `tailwindcss` peer
        (`f:mrv24k`). One row only; the rules are `docs/extend/run-cairn-audit-on-your-site.md`'s.
      - `check:cairn:rendered`: runs `cairn-audit --rendered` in a real Playwright browser against a
        running admin, and the scaffold ships neither Playwright nor a browser-install step, so it
        does not run as shipped (`f:j7fha2`).
      - `cairn:manifest`: runs `cairn-manifest`; `format` and `format:check`: Prettier;
        `test:unit`: `vitest run` (`f:690k0p`), one row each.
  - `### vite.config.ts`.
    - The scaffold carries no `svelte.config.js`; the whole SvelteKit config passes inline to
      `sveltekit({ ... })`: the Cloudflare adapter with `platformProxy: { remoteBindings: false }`,
      and a prerender `handleHttpError` that throws on every prerender HTTP error (`f:n4rg1z`). The
      sentence names `handleUnseenRoutes` and Crawl rules as the section that states both
      handlers' rules (`f:2zl3qz`, cited again).
    - The config carries no `csrf` key, so SvelteKit's Origin check runs ahead of every handle on
      every route, `/admin` included, and cairn's guard adds a double-submit token on top
      (`f:7rehzh`). SvelteKit 3 removed `csrf.checkOrigin`, and a config that sets it fails
      validation (`f:hnvweu`). Link the "CSRF protection" section of
      `docs/extend/security-model.md` (`#csrf-protection`).
    - The `cairnManifest` plugin regenerates the committed content manifest on every build
      (`f:xluud1`); `src/content/.cairn/` states what fails when it drifts.
    - The `__CAIRN_DEV_BUILD__` define is the build-time half of the dev-backend gate
      (`f:xluud1`); the server hook reads it (Routes and the server hook).
    - The page makes no claim about `resolve.dedupe`, `server.fs.allow`, or `VITE_CAIRN_E2E`: the
      page-inputs friction entry of 2026-10-07 records them as showcase leftovers no fact covers.
  - `### src/app.d.ts`.
    - Imports `@glw907/cairn-cms/ambient`, declares the `__CAIRN_DEV_BUILD__` global, types
      `App.PageData` with the optional `nav`, `footerNav`, `siteName`, and `hasIslands` the root
      layout load returns, and references `@cloudflare/workers-types` and the
      `worker-configuration.d.ts` that `wrangler types` writes (`f:n52h8f`). Link
      `docs/reference/ambient.md`.
    - Declares an optional `CAIRN_DEV_BACKEND` on `Cloudflare.Env`, because the chassis dev gate
      reads it and `wrangler types` generates only what `wrangler.jsonc` and `.dev.vars.example`
      name; the flag is a dev-only opt-in, never a production variable (`f:peks2u`).
  - `### wrangler.jsonc`.
    - The bindings, as a bulleted list introduced by a complete sentence, one binding per item,
      each under 26 words (`f:n7t4bn`): `AUTH_DB`, the D1 auth store; `APP_DB`, a second D1
      database for the signups screen; `EMAIL`, the Email Sending binding; `MEDIA_BUCKET`, the R2
      bucket, with a link to `docs/extend/configure-media.md` (the outline's crossLink); and the
      `PUBLIC_ORIGIN` variable.
    - `observability.enabled` is `true`, so Workers Logs records the Worker's logs (`f:prb2os`).
    - `assets.not_found_handling` is `"none"`, one sentence naming Themed 404 page as the section
      that says why (`f:2qnqkm`, cited again).
    - The closing paragraph states that each D1 binding names its own `migrations_dir`
      (`f:nv0ok0`, cited again) and carries the hand-off.
- **Hand-off:** Each D1 binding names its own migrations directory, so the site carries one
  directory per database.

### 5. Database migrations

- **Takes:** The site keeps two migration directories because it binds two D1 databases, and
  `wrangler d1 migrations apply` walks one directory per database. (`f:nv0ok0`)
- **Draws on:**
  - `### migrations/`: the auth store's schema for `AUTH_DB`, `0000_auth.sql`,
    `0003_preview.sql`, and `0004_login_nonce.sql` (`f:gepykz`). The engine's `0001_roles.sql`
    and `0002_audit.sql` are opt-in and absent: the first for a role vocabulary beyond the default
    owner and editor pair, linking `docs/extend/restrict-admin-access.md`; the second for a site
    that wires `createD1AuditSink`, linking the "Wire the audit sink" section of
    `docs/extend/add-a-custom-admin-screen.md` (`#wire-the-audit-sink`). The page states no
    table-per-file detail and no copy step, which no placed fact carries.
  - `### migrations-app/`: `0000_signups.sql`, the `signups` table (`id`, `name`, `email`) behind
    `/admin/signups`; `APP_DB`'s `migrations_dir` points at it, and a directory shared with
    `migrations/` would apply each schema to both databases (`f:nv0ok0`).
- **Hand-off:** The signups table backs the one custom admin screen among the scaffold's routes,
  which reads it only after `migrations-app/` is applied. (`f:onqm6k`, cited again)

### 6. Routes and the server hook

- **Takes:** `src/hooks.server.ts` installs the auth guard over `/admin`, and the routes split into
  that admin mount, a prerendered public site in the `(site)` group, and endpoints at the root.
  (`f:f21bcz`, `f:qtm9y2`, `f:paotzb`, `f:2qnqkm`) The Takes names the guard, the case every
  default build takes; the first H3 states the dev-build branch.
- **Draws on:** The route tree first, a plain-text code block from `f:qtm9y2` with `admin/` marked
  `[engine]` (`f:t2t5lx`), introduced by the Takes sentence's paragraph. Then one H3 per entry.
  - `### src/hooks.server.ts and src/access.ts`: one `if` picks `devBackendHandle` or
    `createAuthGuard`, reading the build-time `__CAIRN_DEV_BUILD__` define first and the runtime
    opt-in `CAIRN_DEV_BACKEND === '1'` second, and exports the result as `handle` (`f:f21bcz`).
    Under `vite dev` the opt-in falls back to `process.env` (`f:f21bcz`), one clause at most. The
    hook passes `{ access }`, the `defineAccess` map in `src/access.ts` (`f:qlgggh`, cited again);
    link `docs/extend/restrict-admin-access.md`. The page makes no claim about which admin screens
    that map governs: the restrict-admin-access page inputs filed the two wiring points as
    friction on 2026-10-07.
  - `### src/routes/admin/`: the mount is one catch-all pair (`[...path]/+page.server.ts` and
    `+page.svelte`) beside the shared layout pair (`+layout.server.ts` and `+layout.svelte`), the
    only files besides `signups/` (`f:t2t5lx`). Link `docs/reference/admin-routes.md`, the
    canonical mount; the page leaves out the reference's two adaptations. Then `signups/`, two
    sentences: a custom screen whose load calls `requireAccess` and reads the `signups` table
    through `env.APP_DB` from `cloudflare:workers`, failing closed with a 500 when the binding is
    absent, and whose form actions are `createSectionAction` wrappers; the table exists only after
    `migrations-app/0000_signups.sql` is applied to `APP_DB` (`f:onqm6k`). Link
    `docs/extend/add-a-custom-admin-screen.md` for the pattern (the outline's crossLink).
  - `### src/routes/(site)/`: the entry catch-all `[...path]` and its raw-markdown twin
    `[...path=md]` coexist through `createPublicRoutes`, and `src/params.ts` defines the `md`
    matcher through SvelteKit's `defineParams` (`f:4cet3p`, `f:qtm9y2`); `archive/[page]` slices
    with the chassis `archive.ts` (`f:4cet3p`); `preview/[token]` and `styleguide/` appear by name
    only (`f:qtm9y2`). Link `docs/extend/build-the-public-routes.md` for each route's wiring (the
    outline's crossLink).
  - `### Endpoints at the root`: `feed.json/`, `feed.xml/`, and `sitemap.xml/` by name, with no
    claim about what the feeds carry (the known-defect check below); `robots.txt/` reads a
    `posture` option for its stance toward AI training crawlers (`f:4cet3p`), linking
    `docs/extend/choose-an-ai-posture.md`; `media/[...path]/` exports `createMediaRoute`'s handler,
    which streams uploaded media from `MEDIA_BUCKET` at content-addressed keys with its own security
    headers, since the route sits outside `/admin` (`f:qtvesq`), linking
    `docs/extend/configure-media.md` and the `createMediaRoute` entry of
    `docs/reference/sveltekit.md` for the validation; `healthz/` sits outside `/admin`, so the guard
    does not gate it, and it returns `loadHealth`'s `{ ok, checks: { githubAppSigning } }` as JSON
    with status 200 even on failure, catches a thrown error into the same shape, and sets
    `prerender = false` (`f:paotzb`). The healthz sentence states that the `ok` field, never the
    status code, carries the verdict, and links the "Why `/healthz` lives at the site root" section
    of `docs/reference/admin-routes.md`. The path is `/healthz`, never `/admin/healthz`.
  - `### Root layout and error page`: the root `+layout.server.ts` returns `hasIslands`, the `nav`
    and `footerNav` menus, and `siteName`, reading `site-config.ts` and the island registry rather
    than the full adapter so every non-prerendered request stays light; `SiteHeader` and the root
    `+error.svelte` read that data through `page.data`, and the error page is the themed 404 and
    error page (`f:ofex2m`), which Themed 404 page explains. The drafter may add one sentence
    linking the "The root layout must be chrome-free" section of `docs/reference/admin-routes.md`,
    stated as what that reference covers, with no claim of its own.
- **Hand-off:** The menus and the site name the root layout returns come from `src/theme/`, the
  directory that also holds the adapter every route reads.

### 7. Theme, chassis, and content

- **Takes:** `src/theme/` holds the adapter and Waymark's design, `src/chassis/` the plumbing every
  scaffolded site shares, and `src/content/` the markdown and its committed manifests.
  (`f:qnf469`, `f:rxj43c`, `f:gj96px`, `f:vrue1g`)
- **Draws on:**
  - `### src/theme/`. First `cairn.config.ts`, one `defineAdapter` call over `content` (`posts`,
    `pages`, and `fragments`), `backend` (one `createGithubApp` call), `email` (`{ from }`),
    `rendering`, and an `editor` group carrying `navLayout` (`f:u4cfvv`, `f:qnf469`); the
    `render` forwarding detail stays off the page. Three links in this paragraph: changing the
    concepts, `docs/extend/define-an-adapter-and-schema.md` (the outline's crossLink); the sidebar,
    `docs/extend/arrange-the-admin-sidebar.md`; the sign-in email's sender and copy, the "Customize
    the sign-in email" section of `docs/extend/add-cairn-to-a-sveltekit-app.md`
    (`#customize-the-sign-in-email`, the outline's crossLink). Then the rest of the directory as a
    bulleted list, one file or directory per item, each under 26 words (`f:qnf469`):
    `site-config.ts`, the one `parseSiteConfig` call, over `site.config.yaml`, which holds
    `siteName`, `description`, the primary and footer menus, and the tag `vocabulary`;
    `markdown-components.ts`, nine `defineComponent` declarations, one hydrated; `icons.ts`, the
    `IconSet`; `components/`, the chrome (`ArticleView`, `EntryRow`, `SiteFooter`, `SiteHeader`,
    and `admin-link.ts`); `islands/`, `Banner.svelte`, its `registry.ts`, and `banner-expiry.ts`;
    `theme.css` and `site.css`, which Style sheets covers; `theme-names.ts`. Link
    `docs/extend/theme-your-public-site.md` once in this H3 (the outline's crossLink).
  - `### src/chassis/`: the design-neutral plumbing every scaffolded site shares, copied into the
    tree with Waymark, so an engine update leaves it unchanged (`f:rxj43c`); link the "The chassis
    boundary" section of `docs/extend/theme-your-public-site.md` (`#the-chassis-boundary`) for what
    it holds and when a port edits it. One sentence names `archive.ts` as the home of the archive
    page size, which Settings outside the admin covers.
  - `### src/content/`: one directory per concept, named by the concept's `dir`, holding markdown
    with YAML frontmatter: `posts/`, `pages/`, and `fragments/`, seeded with 14 sample posts, two
    pages (`about.md` and `the-trail-crew.md`), and one fragment (`trail-safety-notice.md`)
    (`f:gj96px`). Since the adapter names each directory, renaming one is an adapter change.
  - `### src/content/.cairn/`: three committed files (`f:vrue1g`). `index.json` is the content
    manifest: the `cairnManifest` plugin and `cairn-manifest` regenerate it, the build fails when
    it drifts from the markdown on disk, and a publish commit patches it. `media.json` is the media
    registry the admin's media upload, metadata, and delete commits write. `site-facts.json` is
    written by `cairn-manifest`. `npm run cairn:manifest` runs that command (`f:690k0p`, cited
    again). Link the `cairnManifest` section of `docs/reference/vite.md` and
    `docs/reference/site-facts.md`. The root-barrel functions named in the fact stay off the page.
- **Hand-off:** Cut (scoped register read 2026-10-07: the next section's opening already carries the hand-off).
  (Was: Waymark's look comes from two style sheets in `src/theme/`, and the admin compiles a separate
  one from `src/admin.css`.)

### 8. Style sheets

- **Takes:** The site compiles two separate sets of styles: the admin's from `src/admin.css`, and
  the public site's from `theme.css` and `site.css`. (`f:vs6k2k`, `f:s23sk0`)
- **Draws on:**
  - `### src/admin.css`: its last line imports `@glw907/cairn-cms/admin-sources.css`, an
    engine-owned file holding only the `@source` directives for the engine's shipped admin markup,
    resolved from the file's installed location (`f:vs6k2k`). The pre-scripts compile it into the
    gitignored `.cairn/admin.css` (`f:666eg6`, cited again), one of the two sheets
    `cairn-audit.config.json` names (`f:guiavc`, cited again). The config's other entry, the
    engine's precompiled `dist` sheet, is a different artifact, the compile the audit's
    `no-uncompiled-class` rule checks against, which the sources import does not replace
    (`f:vs6k2k`).
  - `### src/theme/theme.css and src/theme/site.css`: the theme's own tokens and page styling,
    layered over two lower sources, the engine's `cairn-public.css` roles (the status inks, the
    shadow, the focus ring, `--color-muted`, and `--color-card-border`), which the chassis
    `tokens.css` imports right after Tailwind, and the chassis's design-scale defaults
    (`f:s23sk0`). One paragraph; link the "Token tiers and cascade order" section of
    `docs/extend/theme-your-public-site.md` (`#token-tiers-and-cascade-order`) for which
    declaration wins.
- **Hand-off:** Cut (scoped register read 2026-10-07: the next section's opening already carries the hand-off).
  (Was: Two settings outside the style sheets shape what a new site's home page and footer show.)

### 9. Settings outside the admin

- **Takes:** The archive's page size and the footer menu are set in files, not in the admin.
  (`f:38pjqy`, `f:2s8u70`) The outline calls these the settings a new owner looks for first; the
  page states where they live and claims nothing about how often owners change them.
- **Draws on:**
  - `f:38pjqy`: `ARCHIVE_PAGE_SIZE` in `src/chassis/archive.ts`, 13 in the scaffold, is the one
    page-size setting for both the home page and `/archive/[page]`; both paginate every post after
    the newest, which the home page shows as its lead, so `/archive/2` exists only once more than
    14 posts are published. With the 14 seeded posts (`f:gj96px`, cited again), a new site has no
    second archive page until a fifteenth post is published. No claim about the comment beside the
    constant (the plan's friction entry of 2026-10-07).
  - `f:2s8u70`: `/admin/nav` edits only `menus.primary`; `menus.footer` is a flat menu edited by
    hand in `src/theme/site.config.yaml`, read through `readMenu(siteConfig, 'footer', 1)`.
- **Hand-off:** The archive route the page size governs is also the one route the build's
  unseen-route check exempts.

### 10. Crawl rules

- **Takes:** The prerender crawl fails the build on an unseen route or an HTTP error, and the
  scaffold keeps its build passing with one route exemption and one link attribute. (`f:n4rg1z`,
  `f:2zl3qz`, `f:34rsss`)
- **Draws on:**
  - `f:2zl3qz`: `handleUnseenRoutes` exempts only `/(site)/archive/[page]`, because a corpus that
    fits on page one gives that route no entries and SvelteKit's crawl-completeness check would
    otherwise fail the build; any other unseen prerenderable route still throws. The handler sits
    in the `prerender` option of the inline `sveltekit()` call.
  - `f:34rsss`: a link to `/admin` in prerendered public markup carries `rel="external"`, so the
    crawler never requests it, because every `/admin` route answers a build-time crawl with an
    error and the scaffold's `handleHttpError` throws on any HTTP error (`f:n4rg1z`, cited again);
    the header and footer apply it through the shared `isAdminHref` predicate in
    `src/theme/components/admin-link.ts`. The drafter may state the consequence the fact implies: a
    new `/admin` link in public markup takes the same attribute.
  - One external link at most, to SvelteKit's `@sveltejs/kit/vite` page for the two options
    (https://svelte.dev/docs/kit/@sveltejs-kit-vite); the page copies none of SvelteKit's option
    reference.
- **Hand-off:** A path the build never emitted is answered at request time, and the scaffold's
  `wrangler.jsonc` passes it to the Worker so the themed 404 page can render (`f:2qnqkm`).

### 11. Themed 404 page

- **Takes:** A scaffolded site serves a themed 404 page through two pieces that need each other: the
  root `src/routes/+error.svelte` and `assets.not_found_handling` set to `"none"` in
  `wrangler.jsonc`. (`f:2qnqkm`)
- **Draws on:**
  - `f:2qnqkm`, the error page's half: the prerendered `(site)` group's catch-all is stripped from
    the runtime manifest, so that group's layout never runs for an unmatched path, and the root
    `+error.svelte` rebuilds the site chrome itself. It reads the menus and the site name through
    `page.data` from the root `+layout.server.ts` (`f:ofex2m`, cited again).
  - `f:2qnqkm`, the Worker's half: `"none"` passes an unmatched request to the Worker, while
    `"404-page"` would serve an unthemed static file from the edge without invoking the Worker.
    Cloudflare's own semantics sit behind a link to its Worker script routing page
    (https://developers.cloudflare.com/workers/static-assets/routing/worker-script/), never a copy.
  - The section closes on what each half alone would do, stated only as the fact states it.
- **Hand-off:** The `.claude/` directory holds what the site's coding agents read, the guidance
  cairn installs with the scaffold (`f:0ygumq`).

### 12. The guidance tree

- **Takes:** A scaffolded site is born with cairn's agent-facing guidance installed under
  `.claude/`, and `npx cairn-guidance install` refreshes it after an engine upgrade. (`f:0ygumq`)
- **Draws on:**
  - `f:0ygumq`: the tree is `.claude/skills/` with one directory per packaged skill,
    `.claude/agents/cairn-extension-reviewer.md`, and `.claude/cairn/` with `CLAUDE.md`,
    `VERSION`, and `MANIFEST`; the root `CLAUDE.md` imports the fragment through
    `@.claude/cairn/CLAUDE.md`. The same command lets a site built without the scaffold adopt the
    tree.
  - `f:7ozknm` and `f:o7bkm0`: the four skills as a bulleted list introduced by a complete
    sentence, one skill per item in one form, name first, each under 26 words:
    `cairn-admin-screens`, for building or reviewing a screen inside `/admin`; `cairn-consult`, for
    writing a consultation brief after working around an engine behavior twice or wanting what the
    seams do not reach; `cairn-extend`, for a change that touches `/admin`, a form action, logging,
    or an engine seam; `cairn-public`, for restyling or extending the public side.
  - `f:6ro1n9`: the root `CLAUDE.md` is the import line and a `# Your site` section for the site's
    own guidance; `install` writes the fragment to `.claude/cairn/CLAUDE.md` and never rewrites the
    root file; `check` reports a root `CLAUDE.md` that lacks the import line.
  - `f:dy5cfj`: a scaffolded site's `VERSION` holds the engine dependency spec the template was
    baked against, with the caret stripped, not a version read from an installed copy. No claim
    about how the check treats that stamp (the plan's friction entry of 2026-10-07).
  - `f:4ax489`: `npx cairn-guidance check` reports seven lines and exits 0 by default; `--strict`
    exits 1 only when the guidance tree itself is stale or missing. Then `f:jd54ph` with
    `f:4ax489` in one sentence: the CI workflow's last step runs the check without `--strict` and
    under `continue-on-error: true`, so a stale or missing tree shows in the job log and the build
    passes. The sentence gives the default exit code as the reason the build passes and makes no
    other claim about `continue-on-error` (the plan's friction entry of 2026-10-07). No claim about
    any one of the seven lines' verdicts on a fresh scaffold. Link the "`check`" section of
    `docs/reference/guidance.md` for the seven lines.
  - `install`'s three behaviors, as a bulleted list introduced by a complete sentence, each under
    26 words: it never deletes, and prints any path an earlier `MANIFEST` listed that the package
    no longer ships, for the site to remove (`f:4h9fz4`); it exits 0 even when an entry is refused
    or a write fails, each printed to stderr, so a script that must detect a partial install reads
    stderr (`f:5ohm23`); it never writes `.claude/settings.json`, so the `Stop` hook that runs
    `npm run check:cairn --if-present` is a snippet in the package, `claude/snippets/settings-hook.json`,
    pasted in deliberately (`f:4nccq6`). Link the "`install`" section of
    `docs/reference/guidance.md` for how `install` treats a file the site edited.
- **Hand-off:** The setup command also saved a record of its run outside the repository, in the home
  directory of whoever ran it (`f:3m0oxs`).

### 13. Setup state outside the tree

- **Takes:** The setup command kept its record of the run on the machine that ran it, and
  registered the Cloudflare API token pasted during setup as the build token the site's deploys
  use. (`f:3m0oxs`, `f:3bbeia`)
- **Draws on:** Three paragraphs, in this order, so the body closes on the one item here that can
  break a live site.
  - The record, `f:3m0oxs`: the command saves its progress, the pasted Cloudflare token included,
    in `~/.config/cairn/sites/<id>.json` (directory mode 0700, file mode 0600), never under the
    project directory; a `--yes` run reads the token from `CAIRN_CF_API_TOKEN` and refuses a
    token-shaped command-line value. A developer who took over the site from someone else has no
    copy, since the file sits in the home directory of whoever ran the command. The page makes no
    claim about how long the token stays in the file (the plan's friction entry of 2026-10-07).
  - Resumed and scripted runs: on a resumed run, `--org`, `--repo-name`, `--app-name`, and
    `--owner-email` override the saved answer for any chapter not yet run (`f:3my5c1`);
    `--brand-color` takes a `#`-prefixed hex color, an `oklch(...)` string, or a bare number read
    as a hue in degrees, and any other shape fails (`f:498l97`). The page states no range for the
    bare number, which the flag does not enforce.
  - The build token, `f:3bbeia`: the Workers Builds chapter registers the pasted token as the build
    token named `cairn create-cairn-site build token`, reusing an existing build token that wraps
    the same token id. Revoking or rolling that token at Cloudflare breaks automatic deploys with
    no prior warning: the next commit still triggers a build, and the build fails. This is the
    body's last sentence.
- **Hand-off:** None. The build-token sentence closes the body, and the related resources follow
  under their own heading.

## Ending

### 14. Related resources

The concept anatomy's ending, grouped as how-to guides, concepts, and external resources, three to
five links a group, each group introduced by a complete sentence (the form
`docs/extend/architecture.md`, the first page in this group, uses).

- **Takes:** The following resources build on the scaffold's files, explain the engine behind
  them, or document the platforms they configure. (`no-claim`)
- **How-to guides** (five): `docs/extend/add-cairn-to-a-sveltekit-app.md` (the same tree built by
  hand), `docs/extend/theme-your-public-site.md` (the theme files),
  `docs/extend/add-a-custom-admin-screen.md` (the signups screen as a pattern),
  `docs/extend/define-an-adapter-and-schema.md` (the concepts in `cairn.config.ts`),
  `docs/extend/upgrade-cairn.md` (moving the inherited engine pin).
- **Concepts** (three): `docs/extend/architecture.md` (the import points and seams these files
  use), `docs/extend/security-model.md` (the guard, CSRF protection, and the dev-backend
  refusals), `docs/extend/content-model.md` (concepts and their directories).
- **External resources** (five): SvelteKit "Project structure"
  (https://svelte.dev/docs/kit/project-structure), SvelteKit "@sveltejs/kit/vite", the inline
  config's options (https://svelte.dev/docs/kit/@sveltejs-kit-vite), Wrangler "Configuration"
  (https://developers.cloudflare.com/workers/wrangler/configuration/), D1 "Migrations"
  (https://developers.cloudflare.com/d1/reference/migrations/), Workers "Builds"
  (https://developers.cloudflare.com/workers/ci-cd/builds/). The first four match the
  introduction's prior-knowledge sentence; the fifth is the service the build token drives. Each
  URL resolved on 2026-10-07.

Every outline crossLink from this page lands on it: `theme-your-public-site`,
`add-a-custom-admin-screen`, `add-cairn-to-a-sveltekit-app` (with the sign-in email section),
`define-an-adapter-and-schema`, and `upgrade-cairn` in Related resources and the body;
`configure-media` in `wrangler.jsonc` and Endpoints at the root; `run-cairn-audit-on-your-site` in
`cairn-audit.config.json` and the `check:cairn` row; `build-the-public-routes` in
`src/routes/(site)/`.

## Dispositions

One row per fact id the plan disposes: the 56 ids the chain requires, `f:6jxd81` disposed again as
the page inputs cut it, and two ids this plan adds and places (`f:rxj43c`, `f:prb2os`). No fact is
subordinated: every reference page this plan links is linked for detail beyond a placed claim, and
each was opened and read before it was named.

| Fact | Disposition | Section |
| --- | --- | --- |
| `f:n2skkz` | placed | The scaffold |
| `f:rxj43c` | placed (added) | The scaffold; cited again in Theme, chassis, and content (`src/chassis/`) |
| `f:u705t5` | placed | The scaffold |
| `f:kldwss` | placed | The scaffold |
| `f:qlgggh` | placed | File tree; cited again in Root files and Routes and the server hook (`src/access.ts`) |
| `f:jcux9z` | placed | Root files |
| `f:guiavc` | placed | Root files; cited again in File tree and Style sheets |
| `f:nls26c` | placed | Root files |
| `f:qfv5iw` | placed | Root files |
| `f:o47i0q` | placed | Configuration files; cited again in The scaffold and Root files |
| `f:9mx680` | placed | Configuration files |
| `f:n4rg1z` | placed | Configuration files; cited again in Crawl rules |
| `f:666eg6` | placed | Configuration files; cited again in Root files and Style sheets |
| `f:mrv24k` | placed | Configuration files (one row; the rules stay with run-cairn-audit-on-your-site) |
| `f:j7fha2` | placed | Configuration files |
| `f:690k0p` | placed | Configuration files; cited again in Theme, chassis, and content |
| `f:7rehzh` | placed | Configuration files |
| `f:hnvweu` | placed | Configuration files |
| `f:xluud1` | placed | Configuration files |
| `f:n52h8f` | placed | Configuration files; cited again in Root files |
| `f:peks2u` | placed | Configuration files |
| `f:n7t4bn` | placed | Configuration files |
| `f:prb2os` | placed (added) | Configuration files (the outline's observability item) |
| `f:gepykz` | placed | Database migrations |
| `f:nv0ok0` | placed | Database migrations; cited again in Configuration files |
| `f:f21bcz` | placed | Routes and the server hook |
| `f:qtm9y2` | placed | Routes and the server hook |
| `f:t2t5lx` | placed | Routes and the server hook (the adaptation clause not stated) |
| `f:onqm6k` | placed | Routes and the server hook; cited again in Database migrations |
| `f:4cet3p` | placed | Routes and the server hook |
| `f:qtvesq` | placed | Routes and the server hook (the key format not stated) |
| `f:paotzb` | placed | Routes and the server hook |
| `f:ofex2m` | placed | Routes and the server hook; cited again in Themed 404 page |
| `f:qnf469` | placed | Theme, chassis, and content |
| `f:u4cfvv` | placed | Theme, chassis, and content (the `render` forwarding not stated) |
| `f:gj96px` | placed | Theme, chassis, and content; cited again in Settings outside the admin |
| `f:vrue1g` | placed | Theme, chassis, and content (the root-barrel functions not stated) |
| `f:vs6k2k` | placed | Style sheets |
| `f:s23sk0` | placed | Style sheets |
| `f:38pjqy` | placed | Settings outside the admin |
| `f:2s8u70` | placed | Settings outside the admin |
| `f:2zl3qz` | placed | Crawl rules |
| `f:34rsss` | placed | Crawl rules |
| `f:2qnqkm` | placed | Themed 404 page |
| `f:0ygumq` | placed | The guidance tree; cited again in The scaffold and Root files |
| `f:7ozknm` | placed | The guidance tree |
| `f:o7bkm0` | placed | The guidance tree |
| `f:6ro1n9` | placed | The guidance tree; cited again in Root files |
| `f:dy5cfj` | placed | The guidance tree |
| `f:4ax489` | placed | The guidance tree |
| `f:jd54ph` | placed | The guidance tree; cited again in Root files |
| `f:4h9fz4` | placed | The guidance tree |
| `f:5ohm23` | placed | The guidance tree |
| `f:4nccq6` | placed | The guidance tree |
| `f:3m0oxs` | placed | Setup state outside the tree (no claim on how long the token stays) |
| `f:3my5c1` | placed | Setup state outside the tree |
| `f:498l97` | placed | Setup state outside the tree (the unenforced range not stated) |
| `f:3bbeia` | placed | Setup state outside the tree |
| `f:6jxd81` | cut | The styleguide's contents belong to `docs/extend/theme-your-public-site.md`; `f:qtm9y2` already names the route in the route tree, which is all this page needs |

## Drafting constraints

- **Known code defects** (stage plan, "Known code defects on 2a pages"). The page claims nothing the
  two defects filed against it contradict. It names `feed.json/` and `feed.xml/` and claims nothing
  about what a feed item carries, since `templates/waymark/src/chassis/feed.ts:13-20` ships
  `::include` as literal text and root-relative media URLs. It states `/healthz` at the site root
  (`f:paotzb`) and never `/admin/healthz`, the path the stale comments name.
- **Claims the page does not make**, each for want of a fact, each filed as friction: what a fresh
  scaffold's `cairn-guidance check` prints for the Tailwind exclusion line; how the check treats a
  baked `VERSION`; how long the setup command keeps the token in its state file; what
  `continue-on-error` adds beyond the default exit code; what the showcase-era comments in
  `vite.config.ts`, `archive.ts`, `+layout.server.ts`, `hooks.server.ts`, and the healthz route
  describe; which admin screens `src/access.ts` governs.
- **Names** (register, "Names"): `create-cairn-site` on first mention, then the setup command; the
  engine for the library and `@glw907/cairn-cms` where the reader types it; the package only for a
  tarball fact (the `files` list, `claude/snippets/`); cairn lowercase; `cairn-guidance` and
  `cairn-audit` by name; the GitHub App; the Worker. The page never writes "chassis component".
- **Form.** Every list and table takes a complete-sentence lead-in; every list item stays under 26
  words, which is why per-file entries are H3 paragraphs rather than list items; the two trees are
  plain-text code blocks; no em dash in prose; no "not X but Y" frames.
- **Link discipline.** Each H3 carries at most two links beyond the ones this plan requires, and no
  link repeats inside one section.

## Could not do, and friction filed

No subordination failed, since the plan subordinates no fact. Four claims a new owner would want
have no fact, so the page leaves them out and the friction log carries each: the false "not
excluded" line a fresh scaffold's guidance check prints, the stale verdict a baked `VERSION` can
draw, the token's deletion at the end of a setup run, and the showcase-era comments outside
`vite.config.ts`. Six entries were filed in `docs/internal/docs-friction-log.md` on 2026-10-07,
each headed "Found by the scaffolded-site-files page plan": the guidance check's false Tailwind
exclusion line; the two `VERSION` stamps; `f:3m0oxs`'s missing token deletion; `f:jd54ph`'s causal
clause; the further showcase-era comments; and `/healthz` answering 200 on failure.

## Ledger

- 2026-10-07, scoped register read: three hand-offs cut (sections 2, 7, 8) and five reworded (sections 3, 9, 10, 11, 12); the page and brief carry the same text, and the brief lost the three cut sentences (262 to 259 entries).
- 2026-10-07, R5 scoped redraft after the final reader read's `fix`: the `CLAUDE.md` no-marker reason now matches the `[engine]` legend (`f:6ro1n9`, `f:4ax489`, `f:jd54ph`, `f:0ygumq`); four new facts back the advisories taken, the root `.cairn/` build output (`f:xi5uwl`), `src/lib/log.ts` (`f:wnsv5x`), the checks an `src/admin.css` compile failure fails (`f:gxaxvh`), and the Workers Builds API token setting a new owner replaces (`f:skp1jv`); hand-off placement and the resumed-run wording were left as they stand (259 to 265 entries).
