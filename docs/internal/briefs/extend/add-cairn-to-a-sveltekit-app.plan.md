# Page plan: `docs/extend/add-cairn-to-a-sveltekit-app.md`

Agent-facing, committed beside the brief. Written 2026-10-03 by the plan step of the docs page
chain (stage 2a, task 7c) for the task 7b resolution run, revised once the same day on the
structural edit's findings (the repository step; "Structural edit findings on the plan, disposed"
below), and revised again the same day for resolution run 2, on the round-2 BLOCKING findings of
`docs/superpowers/research/2026-10-03-draft-docs-2a-resolution-run-record.md` alone ("Resolution
run 2 findings, disposed" below; nothing else changed). The drafter drafts from this plan: it
is the source of the page's order, each section's claim, and each fact's placement. The
structural edit seat reads it before any prose exists. Method: Google Technical Writing Two,
"Organizing large documents" (https://developers.google.com/tech-writing/two/large-docs), the
outline as the document's narrative, with information introduced where it is most relevant to
the reader; the page type's anatomy is the tutorial milestone in `docs/internal/docs-register.md`,
"The page anatomies".

Page type: tutorial milestone. Job: add cairn to a SvelteKit app, from an empty `sv create`
project or one you already have, through a working `/admin` on the dev backend to a production
deploy that commits through your own GitHub App, for a Svelte-fluent web developer with Node 24,
a GitHub account, and a Cloudflare account.

Inputs read: the page's entry and the owner rulings in
`docs/superpowers/research/2026-09-30-draft-docs-2a-pilot-job-read.md`; the page's round-2
findings and the "Not conflicts" list in
`docs/superpowers/research/2026-10-01-draft-docs-2a-rework-record.md`;
`docs/superpowers/research/2026-10-01-draft-docs-2a-page-plan-diagnosis.md`; the committed page at
`bbfb6788`; every fact bullet named below in `docs/internal/facts/extend.md`,
`docs/internal/facts/front-door.md`, `docs/internal/facts/admin.md`, and
`docs/internal/facts/reference.md`; the two exemplars,
`/var/home/glw907/.local/share/cairn/exemplars/extenders/astro-tutorial-2-pages-1/page.md`
(objectives before any step, a check ending nearly every step, the try-first prompt with a
"Show me the steps" answer, the closing "I can" checklist) and
`/var/home/glw907/.local/share/cairn/exemplars/extenders/django-custom-management-commands/page.md`
(one running example throughout, a file-location tree before each file's code).

## What the page argues

cairn is three things added to a SvelteKit app: an admin the site mounts, a content layer the
build indexes, and a production trio (a GitHub App that commits, a D1 auth database, and a sign-in
mail sender) that the dev backend fakes until the end. The page adds them in the order each can be
checked live. The deploy target comes first, so every later check has an address. The admin comes
next, on the dev backend's fakes, so the admin is proven before any credential exists:
`createGithubApp` validates nothing, so placeholder values serve (f:dujlzg), and the admin answers
only once the dev backend or the real bindings exist (f:jbt2hh). Content follows, so there is
something to publish. Production comes last, and each of its sections replaces one fake with the
real thing, until the milestone follows one publish from the deployed admin to the deployed page.
Every milestone ends live, the Astro exemplar's rhythm. The site's git repository runs beneath the
milestones: created with the project, so the content milestone can commit its manifest, and pushed
to GitHub at the content milestone's end, so the production milestone registers the App against a
repository that exists (f:rp65d2, f:0w7jar) and pulls the publish commit from it (f:m0ouh8).

The running example is Field Notes, a site with one post. Fixed names the drafter uses throughout:
project and repository `field-notes`, the GitHub account as the placeholder `your-account` (the
adapter's `owner` and the remote address), site name "Field Notes", the post
`src/content/posts/2026-08-14-first-light.md` with title "First light" (permalink
`/posts/first-light`), auth database `field-notes-auth`, production domain `notes.example.com`,
sender `cms@notes.example.com`. The post is not named `hello`: the dev backend's fixtures include a
`hello` post (the friction log's f:dqjkci and f:c7nyan entry), so a reader who opens the dev admin
would take the fixture for their own entry. No sentence on the page states the fixture behavior,
since no handed fact covers it; the name choice is enough.

### Departures from the outline's cover order, with the reason for each

1. **The site config and the minimal adapter move from milestone 3 into milestone 2.**
   `createCairnAdmin({ runtime })` takes the runtime that `composeRuntime({ adapter, siteConfig })`
   returns (f:dqe7ij, f:d0sp1t), so the admin cannot mount before the adapter and site config
   exist. Google's lesson places them where the admin needs them. Milestone 3 keeps the content
   directory, `createSiteIndexes`, the manifest plugin, and the render.
2. **The dev-backend section sits inside milestone 2, as its last build step**, under the
   outline's suggested heading so the old slug `#wire-the-dev-backend-and-the-csrf-handoff`
   survives. The milestone's check, sign in at `/admin`, is impossible without the dev backend
   (f:jbt2hh), and the pilot's job read found milestone 2 ending unverified when the section sat
   between milestones 3 and 4.
3. **The branded-500 check opens milestone 4.** The outline lists it as the milestone's check, yet
   it needs a build with no `AUTH_DB`, which exists only before the database section. Opening with
   it proves the production build dropped the dev backend and shows the reader what the milestone
   supplies (f:jbt2hh). The first deploy of a build carrying the admin is also where the Workers
   Paid plan first bites, which the prerequisites say.
4. **"Point the site at production" is no longer a section.** Its three-edits sentence (f:7bch04)
   becomes milestone 4's opening map, each production section makes its own edit, and the
   content module's `origin` edit joins the Email Sending section, where the deployed origin is at
   hand. This disposes the register editor's blocking finding on the contradiction at `:1000-1006`.
5. **"Customize the sign-in email" is a closing H2 after milestone 4's checklist**, never inside a
   milestone (the outline's cover; both round-2 blocking findings on placement). The introduction
   names it in one line after the milestone list.
6. **The Workers Paid trigger is stated once.** The plan is needed from the first deploy that
   carries the admin (f:75hawi), and the same plan covers sign-in mail to a second person
   (f:t4pwpw). The outline's wording, "the moment a second person receives email", is the later of
   the two triggers, and a reader who waited for it would meet the earlier one at milestone 4's
   first step. The friction log already records the two facts' disagreement (its f:t4pwpw and
   f:75hawi entry); the page states the trigger the reader meets first and links Cloudflare's
   pricing page for the figure, restating no price (the container's vendor rule).
7. **Milestone 3's exercise is a second post, not a second concept.** The job read called the
   about-page drill heavy. A second post exercises the manifest's drift failure (f:n0laoh) and the
   date-stem slug (f:6ebew3) in four steps, with no adapter or plugin edit.
8. **The repository is a step of its own, in two places the outline's covers leave implicit.**
   `git init` and the first commit on `main` join the project step in milestone 1, and a section
   of its own at milestone 3's end creates the `field-notes` repository on GitHub and pushes
   `main`. Milestone 3 commits the manifest, milestone 4's App installation grants the content
   repository (f:rp65d2), the adapter names its `owner` and `repo` (f:0w7jar), and the production
   check pulls the publish commit from it (f:m0ouh8), so the repository must exist locally before
   the first commit and on GitHub before the App is registered. The push closes milestone 3 rather
   than opening the App section, so milestone 4's start state is one milestone 3 produced and the
   heavier milestone takes no tenth section. No handed fact covers git or GitHub's repository
   creation, so both steps are no-claim procedure, with GitHub's create-a-repository page linked
   for the GitHub side (the plan step of 2026-10-03, on the structural edit's blocking finding).

## The introduction

No heading. Opens with what cairn is, then the usual route and why this tutorial exists; no imperative opening. Citations live in the page's brief JSON.

1. Para 1: cairn as a markdown CMS embedded in a SvelteKit site on Workers; npm package wired through site files (admin route at `/admin`, server hook guard, Vite plugin indexing content); magic-link sign-in, publish commits via the site's own GitHub App; production D1 and Email Sending binding.
2. Para 2: the usual route is `npx create-cairn-site` (Waymark starter; also creates App, repo, bindings, deploys); much easier for a new site; Scaffolded site files link.
3. Para 3: why by hand: existing SvelteKit app (setup command scaffolds only into missing or empty directories), cairn without Waymark (package carries no theme), or reading through to see what cairn does underneath.
4. Para 4: running example Field Notes, ends in production with an editor signing in, editing, publishing.
5. Para 5: prior knowledge (SvelteKit, TypeScript, terminal); existing-app readers follow the same milestones, noting skipped steps.
6. Four-milestone numbered list; closing section line (customize the sign-in email).
7. Five-item out-of-scope list: Architecture, Define an adapter and schema, Build the public routes, Security model, Rotate the GitHub App key.

Superseded 2026-10-04 by Geoff's intro ruling (framing and reader-first intros, never an imperative opening); see docs/internal/briefs/extend/add-cairn-to-a-sveltekit-app.framing.md.

## Sections, in order

Each entry: the heading, the one sentence a reader takes from it (the section's first sentence on
the page), the facts it draws on, and its hand-off. A tree precedes each file the reader creates;
`vite.config.ts` is shown whole at every edit, since the reader copies it, and the lead-in names
the lines that changed. The `compilerOptions` the scaffold wrote stays as a comment in every
sample (f:87hc1y).

### Before you begin

- Heading: `## Before you begin`
- Sentence: You need the following accounts and tools. (The lead-in names no item. The earlier
  revision's sentence listed four items inline, and the drafter carried that series onto the page
  as the first sentence, which split the prerequisites three ways; the register editor's round-2
  blocking finding at `:27-39`.)
- Facts: f:75hawi (Node 24, the two accounts, the bare deploy on the free tier, the Paid plan from
  the first deploy carrying the admin, the domain zone for mail), f:t4pwpw (the same plan covers
  sign-in mail to a second person), f:yegr67 (TypeScript stays on major version 6; `sv create`
  pins it; `svelte-check` cannot run on 7), f:xhwl32 (a `workers.dev` subdomain has no zone to
  onboard, so mail needs a domain on the account), f:1dhk1a (the `cairn` CLI is a separate Go
  module, installed once per machine with `go install github.com/glw907/cairn-cms/tool/cmd/cairn@latest`
  or from a release archive; a cross-arm citation the plan adds, since no public page yet carries
  the install).
- Shape: the lead-in sentence, then one bulleted list, and nothing else in the section: no
  inline series in the lead-in, no second list, and no paragraph or code block after the list.
  Seven items, parallel and unordered, each carrying its own qualifying clause:
  1. Node 24 or later.
  2. A GitHub account.
  3. A Cloudflare account; milestone 1's bare deploy runs on its free tier.
  4. Cloudflare's Workers Paid plan, from the first deploy that carries the admin (milestone 4's
     first step); the same plan covers sign-in mail to a second person; Cloudflare's Workers
     pricing page is linked, with no price stated.
  5. TypeScript on major version 6, which `npx sv create` already pins, since `svelte-check`
     cannot run on TypeScript 7.
  6. A domain whose zone is on the Cloudflare account, since a `workers.dev` subdomain has no
     zone to onboard for sign-in mail.
  7. The `cairn` CLI, a separate Go module installed once per machine, which runs `cairn doctor`
     (link `docs/reference/cli-cairn-doctor.md`) in the production milestone; the `go install`
     command sits as a fenced code block inside this item, and the release-archive alternative
     is one clause of the same item.
- Hand-off: the first milestone deploys with none of the engine's code, so the reader has an
  address before anything can fail.

### Milestone 1: Deploy a bare SvelteKit site

- Heading: `## Deploy a bare SvelteKit site`
- Opening (objectives and start state): this milestone ends with a plain SvelteKit site, no cairn
  code yet, answering at its `workers.dev` address. Objectives as a short list: create the
  project under version control, name the Cloudflare adapter, describe the Worker to Wrangler and
  deploy. It starts from an empty directory; an existing app skips the project step, and one that
  keeps its kit config in `svelte.config.js` makes each kit edit on this page there instead
  (f:ifuvcl).

#### Create the project on the Cloudflare adapter

- Heading: `### Create the project on the Cloudflare adapter`
- Sentence: A self-deployed site names `@sveltejs/adapter-cloudflare` itself, because the
  scaffold's `adapter-auto` guesses the deploy target at build time.
- Facts: f:7e1t0j (the `sv create` flags; `adapter-auto` as the scaffold's adapter), f:mhsere
  (why the explicit adapter), f:ifuvcl (no `svelte.config.js`; the kit config sits inline in the
  `sveltekit()` call), f:979v0a (`adapter` and `csrf` are sibling keys in that one call), f:87hc1y
  (the scaffold's call already carries `compilerOptions`; the samples keep it as a comment and
  say nothing about runes), f:ghzx9c (`sv create` scaffolds SvelteKit 3 since 2026-10-01, with a
  `tsconfig.json` that extends `$app/tsconfig`), f:skeche (the engine's `@sveltejs/kit` peer
  range `^3` admits SvelteKit 3 and rejects a project still on `^2`), f:jzm5ef (the scaffold's
  `adapter-auto` swaps for `@sveltejs/adapter-cloudflare@^8`, whose peers are `@sveltejs/kit`
  `^3.0.0-next.0` and `wrangler`; no version pin is needed), f:g48ytv (the SvelteKit 3
  `tsconfig.json` extends `$app/tsconfig` and the scaffold's file needs no replacement).
- Steps: `npx sv create --template minimal --types ts --no-add-ons field-notes`; initialize a
  git repository with `main` as its branch and commit the scaffold (no-claim procedure; the
  branch is the one `createGithubApp` names in milestone 4, f:0w7jar, and the one the production
  check reads, f:m0ouh8, so the page never has the reader rename it later); uninstall
  `adapter-auto` and install `@sveltejs/kit@^2.70` and `@sveltejs/adapter-cloudflare@^7`; replace
  `tsconfig.json` with the SvelteKit 2 form (whole file); edit `vite.config.ts` (tree, then the
  whole file). An existing app that is already a repository skips the git step.
- Hand-off: Wrangler needs to know where the adapter's build lands.

#### Describe the Worker and deploy it

- Heading: `### Describe the Worker and deploy it`
- Sentence: The minimal `wrangler.jsonc` names the Worker, sets a compatibility date, and points
  `main` and the `ASSETS` binding at the adapter's build output.
- Facts: f:q13lck (the four keys), f:9ug9mo (`wrangler login`, `wrangler deploy`, the printed
  address).
- Steps: create `wrangler.jsonc` (tree, file); `npx wrangler login`; `npm run build`;
  `npx wrangler deploy`.
- Hand-off: the deploy's last line is the address the check opens.

#### Verify the deployed site

- Heading: `### Verify the deployed site`
- Sentence: The deploy output ends with an address of the form
  `<worker name>.<account subdomain>.workers.dev`, which serves the site with no domain purchase or
  DNS change.
- Facts: f:9ug9mo. Failure checks in order, each pointing at a setting on this page: the login
  completed for the deploying account; the kit config names `@sveltejs/adapter-cloudflare`
  (f:mhsere); `main` and the assets directory point at `.svelte-kit/cloudflare` (f:q13lck).
- Hand-off: a change deployed the same way is the exercise.

#### Deploy a change (exercise)

- Heading: `### Deploy a change`, then `#### Show me the steps` (the `<details>` block the anatomy
  asks for cannot pass `check:provenance`; the defect is filed, and the heading is the fallback).
- Sentence: Change one line of the scaffold's home page, deploy again, and confirm the change at
  the same address.
- Facts: f:9ug9mo, f:ibis7z (the home page is `src/routes/+page.svelte`). Four steps in the
  answer.

#### Checklist before the engine

- Heading: `### Checklist before the engine`
- Two "I can" items: name the Cloudflare adapter in the `sveltekit()` call; deploy the Worker and
  load it at its `workers.dev` address.
- Hand-off: milestone 2 installs the engine into this deployed site.

### Milestone 2: Install and wire the engine

- Heading: `## Install and wire the engine`
- Opening: this milestone installs the engine, mounts the admin, and ends with you signed in at
  `/admin` on the dev backend, with no sign-in email. It starts from the deployed bare site. The
  admin answers only once the dev backend or real bindings exist (f:jbt2hh), so the milestone
  wires the dev backend before its check. Objectives as a short list: install the engine and let
  Vite compile it; give it a site config, a minimal adapter, and a runtime; mount the admin as one
  catch-all and a layout; wire the dev backend and hand admin CSRF to the engine's guard. The
  objectives do not promise a save or publish check (the register editor's `:187-191` finding);
  the dev backend's keep-it-local property is stated in its own section as a property.

#### Install the engine and let Vite compile it

- Heading: `### Install the engine and let Vite compile it`
- Sentence: The engine needs three lines of setup before any route exists: the package with its
  `@cloudflare/workers-types` peer, an `ssr.noExternal` entry so Vite compiles the engine's Svelte
  source, and the ambient import that types `App.Locals`.
- Facts: f:26kuvx and f:ew4uk7 (the required peer at `^5`; the shipped `.d.ts` files import
  `D1Database` and `R2Bucket` from it), f:c8efq5 (`.svelte` files ship as source under the
  `svelte` export condition; without `noExternal` the admin components fail to build), f:vvgpr5
  (the import augments `App.Locals`; the five field names go to `docs/reference/ambient.md`, linked,
  and the `App.Platform` note stays as one clause).
- Steps: `npm install @glw907/cairn-cms` and `npm install -D @cloudflare/workers-types`; add the
  `ssr` block to `vite.config.ts` (whole file); add the import to `src/app.d.ts` (tree, file).
- Hand-off: the admin reads a runtime, and the runtime reads an adapter and a site config.

#### Write the site config and a minimal adapter

- Heading: `### Write the site config and a minimal adapter`
- Sentence: The adapter declares one posts concept, a renderer, and the backend and sender that
  the dev backend stands in for until production.
- Facts: f:ebx4pv (`siteName` is the one required key; it names the site in the admin shell and
  the sign-in email's subject; `description` passes through for the site's code), f:em69ru
  (`parseSiteConfig` rejects any top-level key outside its set; the set itself is linked at
  `docs/reference/core.md#parsesiteconfig`), f:d0sp1t (the root barrel's exports, the concept's
  `dir`, `label`, `singular`, `routing`, and `fields`; `defineRegistry({ components: [] })`;
  `createRenderer`; `rendering.render`; `email.from`), f:dujlzg (`createGithubApp` builds a
  provider from five strings with no network call and no validation, and the dev double replaces
  it for every request the dev handle serves, so placeholders serve until production).
- Files: `src/lib/site.config.yaml` (two keys: `siteName`, `description`) and
  `src/lib/cairn.config.ts`, exporting `cairn` and `siteConfig`, with the placeholder
  `createGithubApp` values and `email: { from: 'cms@example.com' }`. The site config lives at
  `src/lib/site.config.yaml`; the page does not state where the doctor looks for it. Every other
  adapter option: link `docs/reference/core.md#defineadapter` and
  `docs/extend/define-an-adapter-and-schema.md`.
- Hand-off: `composeRuntime` folds both into the runtime the admin reads.

#### Compose the runtime and the admin

- Heading: `### Compose the runtime and the admin`
- Sentence: `composeRuntime` folds the adapter and the site config into the runtime, and
  `createCairnAdmin` turns the runtime into the `load`, `actions`, and `shellLoad` the admin routes
  export.
- Facts: f:d0sp1t (`composeRuntime({ adapter, siteConfig })`), f:dqe7ij (`createCairnAdmin`'s
  return), f:g81luc (`bootstrapOwner` names the first owner: when that email requests a sign-in
  and the `editor` table is empty, the engine inserts the owner row before the allowlist lookup;
  a non-matching email or a non-empty table grants nothing), f:f2vudv (it acts on the first real
  sign-in, in milestone 4, and does nothing while the dev backend is active).
- File: `src/lib/cairn.server.ts` (tree, file), with the reader's email and name in
  `bootstrapOwner`.
- Hand-off: four route files mount what this module exports.

#### Mount the admin routes

- Heading: `### Mount the admin routes`
- Sentence: The admin mounts as one catch-all page under `src/routes/admin` and one shared layout,
  and the catch-all exports `prerender = false` so a site that prerenders by default never bakes
  a session-gated page.
- Facts: f:exxsvk (`prerender = false` beside `load` and `actions`, and why), f:jzb3d0
  (`CairnAdmin` and `CairnAdminShell` import from `@glw907/cairn-cms/admin`; the removed subpath
  is not mentioned), f:dqe7ij (`CairnAdmin` takes `data`, `form`, and `render`; the layout renders
  `CairnAdminShell` over the layout load's `shell` data).
- Files: one tree, then `src/routes/admin/[...path]/+page.server.ts`,
  `src/routes/admin/[...path]/+page.svelte`, `src/routes/admin/+layout.server.ts`,
  `src/routes/admin/+layout.svelte`.
- Hand-off: nothing answers at `/admin` yet, since no `AUTH_DB` exists; the dev backend supplies
  one.

#### Wire the dev backend and the CSRF handoff

- Heading: `### Wire the dev backend and the CSRF handoff` (the outline's suggested heading; the
  slug the restored reference links use).
- Sentence: The dev backend, `devBackendHandle` from `@glw907/cairn-cms-dev`, replaces the GitHub
  backend, the auth database, and the media bucket with in-memory fakes and signs you in as an
  owner, so the admin runs before any credential exists.
- Facts: f:dqjkci (the fakes, the minted owner, state per server process, no save or publish
  leaves the machine), f:9mx680 (the three-layer fence: the build-time define strips the package
  from a production bundle, it installs as a `devDependency`, and the guard refuses a production
  build that has `CAIRN_DEV_BACKEND` set; the guard's refusal is one clause, with its detail at
  `docs/reference/log-events.md` under `guard.refused`), f:72mctx (`__CAIRN_DEV_BUILD__` is named
  directly at every call site; Vite's `define` folds a literal only in the module that names it,
  and an imported constant ships the dev import in the deployed Worker), f:f21bcz and f:eiaqkh
  (the hooks module picks between `devBackendHandle` and `createAuthGuard` in one `if`, reading
  the define first and `CAIRN_DEV_BACKEND === '1'` second, with the dev import dynamic so a
  default build never carries it; a bare `createAuthGuard()` is valid), f:e5hqn3 (SvelteKit's
  origin check runs ahead of any handle and would reject a JavaScript-free form POST that arrives
  without an `Origin` header; the guard's double-submit token tolerates the missing header, so
  the site hands the authority over), f:d2jumm (the guard needs double-submit CSRF, so kit's own
  check is disabled with `csrf: { checkOrigin: false }`; the deprecation in SvelteKit 2.61 is
  linked at `docs/reference/supported-toolchain.md#the-checkorigin-removal`, which answers the
  fact read's note that the page sets a deprecated option without saying so), f:gncd64 (the
  setting turns the check off for every route, and the guard restores an equivalent strict
  `Origin` check on every route outside `/admin`), f:n52h8f (the scaffold's `src/app.d.ts`
  declares the `__CAIRN_DEV_BUILD__` boolean global; the fact that backs step 3, a cross-arm
  citation the plan adds on the fact read's round-2 blocking finding at `:493`, which found the
  step cited f:vvgpr5 alone, a fact that says nothing about the declaration).
- Shape: three short lead-in paragraphs (what the dev backend is and the fence; the define named at
  every call site; the CSRF handoff, linking the deprecation section and
  `docs/extend/security-model.md` for the design), then one numbered procedure of four steps:
  `npm install -D @glw907/cairn-cms-dev`; add the define plugin and `csrf: { checkOrigin: false }`
  to `vite.config.ts` (whole file); declare `const __CAIRN_DEV_BUILD__: boolean` in `src/app.d.ts`
  (file; the step's sentence cites f:n52h8f and f:72mctx, never f:vvgpr5, whose claim is the
  ambient import two sections earlier); create `src/hooks.server.ts` (tree, file, with the
  snippet-check skip comment the committed page carries).
- Hand-off: start the dev server with the opt-in set.

#### Verify the dev sign-in

- Heading: `### Verify the dev sign-in`
- Sentence: With `CAIRN_DEV_BACKEND` set to `1`, the dev server opens `/admin` signed in as an
  owner, with no sign-in email.
- Facts: f:dqjkci, f:e8dr5r (the three shell forms sit inside step 1, labeled POSIX, `cmd.exe`,
  and PowerShell, so a Windows reader never runs the POSIX form first; the quoted `cmd.exe` form
  keeps a trailing space out of the value), f:f21bcz (the `=== '1'` test), f:f2vudv
  (`bootstrapOwner` does nothing here).
- Steps: start the dev server (one step, three forms); open `/admin`; confirm the admin opens
  signed in. Failure checks in order: the variable is set to `1`; the hooks module reads
  `__CAIRN_DEV_BUILD__` itself (f:72mctx). Link `docs/extend/debug-your-site.md` for the dev
  backend's other failures. No check looks for the site's own content in the dev admin.
- Hand-off: the site config is the one engine file the admin shows back to you, which the
  exercise uses.

#### Rename the site (exercise)

- Heading: `### Rename the site`, then `#### Show me the steps`
- Sentence: Change `siteName` in the site config and confirm the admin shell shows the new name,
  then change it back.
- Facts: f:ebx4pv. Four steps in the answer.

#### Checklist before content

- Heading: `### Checklist before content`
- "I can" items: sign in at `/admin` on the dev backend with no email; trace the runtime from the
  adapter through `composeRuntime` to the admin; say why every call site names
  `__CAIRN_DEV_BUILD__` directly. The third is the one "say why" item, and the section above stated
  the why.
- Hand-off: the admin has nothing to edit yet; milestone 3 puts content on disk.

### Milestone 3: Put content on disk

- Heading: `## Put content on disk`
- Opening: this milestone adds a posts directory with one markdown entry, builds the typed content
  index over it, renders the entry at its permalink, and ends with the site pushed to the GitHub
  repository cairn will commit to. It starts from the site the engine milestone left, which signs
  you in on the dev backend. Objectives: place an entry in the directory its concept declares;
  index the content and commit the manifest every build checks; render the entry at its
  permalink; push the site to its GitHub repository.

#### Add the first entry

- Heading: `### Add the first entry`
- Sentence: Content is markdown files with YAML frontmatter, one directory per concept, named by
  the concept's `dir`.
- Facts: f:gj96px (the shape half only; the scaffold's seeded content is out of scope). The
  frontmatter carries `title`, `date`, and `description`, the fields the posts concept declares.
- File: `src/content/posts/2026-08-14-first-light.md` (tree, file).
- Hand-off: the build needs an index over the directory and a manifest to check it against.

#### Index the content and commit its manifest

- Heading: `### Index the content and commit its manifest`
- Sentence: The site passes `createSiteIndexes` one literal `import.meta.glob` per concept, and
  the `cairnManifest` plugin checks a committed manifest against the markdown on every build.
- Facts: f:pdgkex (Vite needs the literal glob at the call site; a declared concept with no glob
  throws at build time), f:fj28xs (`configModule` names the module exporting `cairn` and
  `siteConfig`; `content` maps each concept id to its glob; the `manifestPath` and `siteFactsPath`
  defaults are linked at `docs/reference/vite.md#cairnmanifestoptions`), f:n0laoh (a committed
  manifest that has drifted from the markdown fails the build, so the manifest exists before the
  next build), f:vrue1g (the `cairn-manifest` bin writes it; a cross-arm citation the plan adds,
  cited only if a sentence names the bin, otherwise the command stays in its code block with
  `docs/reference/cli-cairn-manifest.md` linked for when to write it again), f:k16chc (the content
  module exports `origin`, the local dev origin for now, which the production milestone changes).
- Steps: create `src/lib/content.ts` (tree, file: the glob, `createSiteIndexes`, `site`,
  `origin`); add `cairnManifest` to `vite.config.ts` (whole file); write the manifest with
  `npx cairn-manifest`; commit `src/content`, the manifest included, to the repository milestone 1
  initialized.
- Hand-off: the entry route renders what the index holds.

#### Render the entry

- Heading: `### Render the entry`
- Sentence: The entry route is a prerendered catch-all over `createPublicRoutes`, whose load data
  carries the `entry`, its rendered `html`, its `canonicalUrl`, and its `seo` metadata.
- Facts: f:fvi8rk (the load data; `CairnHead` from `@glw907/cairn-cms/delivery/head` takes the
  `seo` prop, named in one clause with `docs/reference/delivery.md#cairnhead` linked; the page in
  this milestone renders only `html`), f:k16chc (the route builds each entry's canonical URL from
  `origin` plus the permalink, so `origin` is passed in). Link
  `docs/reference/delivery.md#createpublicroutes` for the loader and its config, and
  `docs/extend/build-the-public-routes.md` for the routes beyond this one.
- Files: `src/routes/[...path]/+page.server.ts` and `src/routes/[...path]/+page.svelte` (one tree).
- Hand-off: the dev server renders the post at its permalink.

#### Verify the rendered entry

- Heading: `### Verify the rendered entry`
- Sentence: The post renders at `/posts/first-light`, the default permalink for a `posts` concept
  with the filename's date stem stripped.
- Facts: f:6ebew3 (every concept but `pages` defaults to `/<id>/:slug`; `datePrefix` `day` strips
  the date stem), f:c4nnu9 (the entry renders unstyled because the site loads no style sheet; the
  engine ships its public defaults as `@glw907/cairn-cms/cairn-public.css`, documented at
  `docs/reference/public-css.md`; Tailwind and daisyUI are optional peers, from f:26kuvx; styling
  is `docs/extend/theme-your-public-site.md#theme-a-hand-built-site`).
- Steps: start the dev server with the opt-in; open `http://localhost:5173/posts/first-light`;
  confirm the body renders.
- Hand-off: the build's three content failures are the next section.

#### Resolve a content build failure

- Heading: `### Resolve a content build failure`
- Sentence: The content wiring fails in three ways, and only the first two stop the build.
- Facts: f:pdgkex (a declared concept with no glob throws), f:n0laoh (a drifted manifest fails the
  build until the manifest is written again and committed; a concept missing from the plugin's
  `content` option produces zero rows with no error). Three bullets.
- Hand-off: the content has a home on disk; production needs it on GitHub.

#### Push the site to GitHub

- Heading: `### Push the site to GitHub`
- Sentence: cairn publishes by committing to the site's own GitHub repository, so the repository
  exists before the production milestone registers the App that commits to it.
- Facts: f:rp65d2 (one clause: the App's single installation covers the content repository, so
  that repository must exist on the owning account first), f:0w7jar (one clause: the adapter
  names the repository as `owner` and `repo`). The git and GitHub steps are no-claim procedure;
  GitHub's page on creating a repository is linked
  (https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository),
  with the procedure itself stated on the page in three steps and nothing of GitHub's form
  restated beyond what the step needs. No handed fact covers repository creation, and none is
  needed: the page claims nothing about git or GitHub beyond the two clauses above.
- Steps: create an empty repository named `field-notes` under `your-account` on GitHub, with no
  starter files, since the push carries the history; add it as the `origin` remote, with one
  sentence telling the reader to replace the account name in the remote URL with the account that
  owns the repository (no placeholder named in the prose); push `main`.
  Check, in the same section: the repository's page lists `src/content/posts/2026-08-14-first-light.md`
  and `src/content/.cairn/index.json`. An app already on GitHub skips this section, and its
  repository and default branch are the values milestone 4 writes into `createGithubApp`.
- Hand-off: the exercise trips the drift failure on purpose.

#### Add a second post (exercise)

- Heading: `### Add a second post`, then `#### Show me the steps`
- Sentence: Add a second post, build without writing the manifest to see the drift failure, then
  write the manifest and open the new permalink.
- Facts: f:n0laoh, f:6ebew3, f:gj96px. Four steps in the answer: create the file; run the build
  and read the drift error; write the manifest and commit; open the new post's permalink.

#### Checklist before production

- Heading: `### Checklist before production`
- "I can" items: place an entry in the directory its concept's `dir` names; tell a manifest drift
  failure from a concept left out of the plugin's `content` option; open an entry at its
  permalink; push the site to the GitHub repository cairn will commit to.
- Hand-off: everything so far ran on fakes, and the site now sits in the repository the fakes stood
  in for; milestone 4 replaces them with the App that commits there.

### Milestone 4: Move the site to production

- Heading: `## Move the site to production`
- Opening: this milestone replaces the dev backend's fakes with a GitHub App you register, a D1
  auth database, and the Worker bindings and secret, and it ends with an edit published from the
  deployed admin to the public page. It starts from the content site, pushed to its GitHub
  repository, the state milestone 3's last section produced. The map (f:7bch04): moving a
  dev-backend site to production takes three edits, the
  adapter's `backend` and `email` values, the `EMAIL`, `AUTH_DB`, and `PUBLIC_ORIGIN` entries in
  `wrangler.jsonc`, and the content module's `origin`; the hooks module needs no edit, because
  `__CAIRN_DEV_BUILD__` is `false` in a build and the dev-backend import is dropped. The order
  (f:e5vm42): the App yields the App ID, Installation ID, and private key; the database yields the
  id its binding needs; the bindings and secret consume both, so each section ends with its
  `wrangler.jsonc` or adapter edit. Objectives as a short list.

#### Deploy the production build and read the refusal

- Heading: `### Deploy the production build and read the refusal`
- Sentence: A production build with no dev backend and no `AUTH_DB` binding answers every `/admin`
  path with a branded 500, **Wrangler bindings are missing**, which proves the real guard runs and
  names what this milestone supplies.
- Facts: f:jbt2hh (the branded 500 for `config.bindings-missing` on every `/admin` path, the login
  path included, an operator fault instead of a login form that could never succeed), f:ntdafg
  (the engine reads `AUTH_DB`, `EMAIL`, `PUBLIC_ORIGIN`, and `GITHUB_APP_PRIVATE_KEY_B64` from the
  platform env; a missing `AUTH_DB` throws `config.bindings-missing`).
- Steps: build; deploy; open `/admin` at the deployed address; confirm the heading.
- Hand-off: the first thing to supply is the backend that commits.

#### Register the GitHub App

- Heading: `### Register the GitHub App`
- Sentence: Each site registers its own GitHub App, with one repository permission, **Contents** at
  **Read and write**, and no webhook.
- Facts: f:gyu7jc (no App and no shared credential ships with the engine), f:vgw8x9 (the one
  permission, webhook off, since cairn receives none), f:9yi7fu (any name and homepage URL; the
  engine reads neither), f:rp65d2 (the form's installable-by question; one installation, on the
  account that owns the content repository and covering that repository), f:02g94x (the App ID on
  the settings page; the private key generated there and downloaded as a `.pem`), f:nbnq9c (the
  Installation ID is the trailing number of the installation settings address), f:gglwt4 and
  f:l5gx1t (one caution after the steps, stated as the reader's own case: the **Contents**
  permission is repository-wide, and only engine code confines writes to the declared content
  directories, so the App's token can also write the site's code in `field-notes`, since the
  repository this tutorial builds holds `src/lib`, the routes, `src/hooks.server.ts`, and
  `vite.config.ts` beside `src/content`; the reasoning is `docs/extend/security-model.md`. The
  caution never frames the reach as another arrangement's hazard, such as "a repository that also
  holds code or other teams' content": `field-notes` is that repository, and the earlier page
  left the reader believing the tutorial had avoided the case; the register editor's round-2
  blocking finding at `:890`. The facts back the two clauses, repository-wide reach and
  engine-side confinement; that `field-notes` holds the site's code is the page's own procedure,
  no-claim).
- Steps: open GitHub's registration form (link GitHub's page); name and homepage; webhook off;
  the permission; create; note the App ID; generate and download the key (link GitHub's page);
  install on the owning account (link GitHub's page); grant the `field-notes` repository
  milestone 3 pushed; note the Installation ID from the address.
- Hand-off: three values are in hand, two of them identity and one a secret.

#### Store the App's credentials

- Heading: `### Store the App's credentials`
- Sentence: The App ID and Installation ID identify the App and grant nothing, so they sit in the
  adapter source; the private key grants everything, so it lives only as the Worker secret
  `GITHUB_APP_PRIVATE_KEY_B64`.
- Facts: f:zcwf5i (non-secret identity, passed into `createGithubApp`), f:0w7jar (`owner`,
  `repo`, `branch`, `appId`, `installationId`, all required strings, `branch` the default branch),
  f:7dtrwy (the `.pem` signs the App's requests for installation tokens, so it stays out of every
  repository), f:vpieos (the one-line half only: the secret is the PEM base64-encoded onto one
  line, the form the engine documents and the form `tr -d '\n'` produces; the page gives no
  reason for the one-line form and never says a multi-line encoding fails to parse, since the
  container's rejection record f:w78j1b found on a workerd run that `atob()` ignores ASCII
  whitespace and a two-line value decoded to the same bytes, so the fact's causal clause is
  stale against it; the register editor's round-2 blocking finding at `:920`, filed in the
  friction log as the two bullets' disagreement, for the claims checker to resolve), f:gyu7jc.
- Steps: set `owner` to your GitHub account (f:rp65d2) and set `appId` and `installationId` to
  the noted values (a two-member snippet with the
  snippet-check skip comment); `base64 < <key>.pem | tr -d '\n' | npx wrangler secret put
  GITHUB_APP_PRIVATE_KEY_B64`, with one clause after the command naming what it produces, the PEM
  base64-encoded onto one line, and no sentence on `atob()`; keep the `.pem` outside every
  repository.
- Hand-off: the guard still refuses, since the database is missing.

#### Create the auth database

- Heading: `### Create the auth database`
- Sentence: The engine reads editors, tokens, and sessions through the `AUTH_DB` binding, and every
  site applies two of the five shipped migrations to it.
- Facts: f:if45on (`npx wrangler d1 create`, bound as `AUTH_DB`, `migrations_dir` pointing at a
  copied-in directory), f:xxtooz (the package ships its migrations under `migrations/`; a site
  copies the ones it needs and applies them with `wrangler d1 migrations apply <database> --local`
  or `--remote`), f:hft8s8 (`0000_auth.sql` and `0004_login_nonce.sql` for every site; the nonce
  column binds a sign-in token to the browser that requested it), f:rn62i1 (one sentence:
  `0001_roles.sql` only for a role vocabulary beyond owner and editor, `0003_preview.sql` only for
  draft-preview links), f:pkrwom (one sentence: `0002_audit.sql` belongs on a separate binding
  with its own `migrations_dir`, so audit writes never contend with session and token lookups;
  the worked hook is `docs/reference/sveltekit.md#created1auditsink`).
- Steps: `npx wrangler d1 create field-notes-auth` and note the id; copy the two migrations into
  `migrations/`; add the `d1_databases` entry at the top level of `wrangler.jsonc` (a `jsonc`
  fragment); apply with `--remote`. One
  line after the steps: `--local` applies them to the local development database (the exercise
  uses it).
- Hand-off: sign-in mail is the last binding.

#### Add the Email Sending binding and name the origin

- Heading: `### Add the Email Sending binding and name the origin`
- Sentence: Sign-in mail leaves through the `EMAIL` binding on a domain of your own, and that
  domain supplies the sender address and the origin the site writes in two places.
- Facts: f:xhwl32 (`send_email: [{ name: 'EMAIL' }]`; the domain in `PUBLIC_ORIGIN` onboarded with
  `npx wrangler email sending enable <domain>`; a `workers.dev` subdomain has no zone to onboard,
  so the production site runs on a domain of your own), f:ntdafg (`PUBLIC_ORIGIN` is the canonical
  origin for sign-in links; unset or invalid throws `config.public-origin-invalid`), f:7bch04 (the
  adapter's `email.from` and the content module's `origin` are two of the three edits), f:k16chc
  (a prerendered route writes `origin` into the build output, so it names the deployed origin
  before the production build), f:txgoyy (`observability.enabled: true` in `wrangler.jsonc`, so
  the engine's log records reach Workers Logs and the doctor's `config.observability` check passes;
  a cross-arm citation the plan adds, which keeps the verify step's doctor run free of a failure
  the page never explains, the friction log's f:m0ouh8 and f:q13lck entry), f:lbetsq (one
  hand-off sentence: a site that sends through another provider passes its own `auth.send`, the
  closing section shows the sender's shape).
- Steps: `npx wrangler email sending enable notes.example.com`; edit `wrangler.jsonc` (whole
  file: `routes` with the domain as a Custom Domain, `send_email`, `d1_databases`,
  `vars.PUBLIC_ORIGIN`, `observability`), with one sentence after the file saying the `routes`
  entry serves the Worker on the domain as a Workers Custom Domain the next deploy creates
  (f:thgmpz, linking Cloudflare's custom-domains page); set the adapter's `email.from` to an
  address on the domain; set the content module's `origin` to the same value as `PUBLIC_ORIGIN`.
- Hand-off: every edit on the opening map is made; the check runs the doctor and one publish.

#### Verify the production site

- Heading: `### Verify the production site`
- Sentence: `cairn doctor` confirms the two bindings, and a publish from the deployed admin
  confirms the App, since no command checks the App itself.
- Facts: f:m0ouh8 (`cairn doctor`, no flags, from the site's directory; its `config.bindings`
  check confirms `AUTH_DB` and `EMAIL`; the manual publish whose commit lands on `main`), f:k16chc
  (the entry route is prerendered, so a published edit reaches the deployed page after the next
  build and deploy, which the steps perform), f:5f4kmk (the commit's author is the signed-in
  editor and GitHub names the App's bot as the committer), f:f2vudv (the first real sign-in
  creates the owner row and logs `editor.bootstrapped`, linked at `docs/reference/log-events.md`).
- Steps: run `cairn doctor` and confirm `config.bindings` passes; commit this milestone's edits
  and push `main`, so the pull after the publish is a fast-forward (no-claim procedure); build and
  deploy; request a sign-in with the `bootstrapOwner` email; open the link; open the post; change
  a line; publish; confirm the commit on `main` of the `field-notes` repository and its author;
  `git pull`; build and deploy; open the permalink; confirm the edit. One numbered list, or two
  with a lead-in each. Link `docs/reference/cli-cairn-doctor.md#the-checks` for the command's
  other checks.
- Hand-off: each failed check points at one setting on this page.

#### Resolve a production failure

- Heading: `### Resolve a production failure`
- Sentence: Each failed production check points at one setting this milestone made.
- Facts, one bullet each: a failed `config.bindings` check points at a Wrangler config lacking
  `AUTH_DB` or `EMAIL` (f:m0ouh8); the **Wrangler bindings are missing** page points at a deployed
  build with no `AUTH_DB` (f:jbt2hh); `config.public-origin-invalid` points at an unset or invalid
  `PUBLIC_ORIGIN` (f:ntdafg); mail that never arrives points at a domain not onboarded for Email
  Sending (f:xhwl32); a store error naming `0004_login_nonce.sql` points at a database without that
  migration (f:hft8s8); a failed publish points at an App without **Contents** at **Read and
  write** or one not installed on the site's repository (f:vgw8x9, f:rp65d2). Link
  `docs/extend/debug-your-site.md` for the recovery.
- Hand-off: the exercise practices the opt-in migrations on the local database.

#### Apply an opt-in migration locally (exercise)

- Heading: `### Apply an opt-in migration locally`, then `#### Show me the steps`
- Sentence: Apply `0003_preview.sql` to the local development database beside the two every site
  applies, and read it in the apply output.
- Facts: f:rn62i1, f:xxtooz. Three steps in the answer (copy, apply with `--local`, confirm), then
  a fourth with its condition first: unless the site mints draft-preview links, delete the copied
  file.

#### Checklist for production

- Heading: `### Checklist for production`
- "I can" items: register a GitHub App with one repository permission and no webhook; store the
  App's private key as a single-line base64 Worker secret; apply the two migrations every site
  needs; read a passing `config.bindings` check from `cairn doctor`; carry a published edit to the
  deployed page with a build and deploy.
- Hand-off: the closing section is optional; the summary follows it.

### Customize the sign-in email (closing section)

- Heading: `## Customize the sign-in email`, after the production checklist and before the summary,
  never inside a milestone.
- Sentence: A site that keeps the engine's sign-in email needs nothing from this section.
- Facts for the lead paragraph: f:2gtftn (the subject is "Sign in to" plus the site name, the body
  carries the fixed sentence "The link expires in 10 minutes", both engine copy; the site name
  comes from the site config and the sender from the adapter's `email` group; `auth.branding`
  replaces all three together, and any other change goes through a custom `auth.send`), f:ebx4pv
  (the site name's source).
- `### Rebrand the email`: f:v72g9z (`siteName` and `from` required, `replyTo` optional and a
  single address; a supplied `branding` replaces the default whole, so one that leaves `replyTo`
  off sends with no reply-to even when the adapter's `email` group sets one; the friction log's
  f:v72g9z and f:2gtftn entry records the all-or-nothing caveat). One bullet step, the whole
  `src/lib/cairn.server.ts` with `branding`.
- `### Edit the message in a custom sender`: f:lbetsq (`auth.send` is a `SendMagicLink`, exported
  from `/sveltekit`, that replaces the Cloudflare sender and receives the same built message),
  f:1b54g7 (the `MagicLinkMessage` members, `replyTo` a single address; the text of anything the
  sender throws reaches the log scrubbed of token values and truncated, so a thrown message never
  embeds the body or the link). One bullet step, the whole `src/lib/cairn.server.ts` with `send`.
- Check: two lines, deploy and request a sign-in, then read the message for the values the site
  set.
- Hand-off: the summary.

## Ending

The tutorial anatomy's ending: a summary in different words from the overview's objectives, then
next steps.

- Heading: `## The finished site` (the Good Docs tutorial template calls this section the summary;
  the register editor reported that tellgrader flags `## Summary` as a scaffold header, and a
  noun phrase that names the content serves the template's section without the flagged word; the
  earlier `## What you built` was a conversational heading, resolution run 3's blocking finding).
  One paragraph, prose cadence (the register editor's `:1174-1176` finding), in words other than
  the introduction's: the engine is wired by hand from the kit config through the admin routes;
  a build-time define each call site names keeps the dev backend out of every production bundle;
  a committed manifest is checked against the markdown on every build; production runs on a
  GitHub App you registered, a D1 auth database, and the Worker's bindings and secret; a publish
  from the deployed admin committed to `main`, and the next build carried it to the public page.
  Facts: f:72mctx, f:n0laoh, f:e5vm42, f:m0ouh8, f:k16chc (restated, no new claim).
- Heading: `## Next steps`. Four links, one line each: `docs/extend/theme-your-public-site.md`
  (anchor `#theme-a-hand-built-site`) styles the pages this tutorial leaves unstyled;
  `docs/extend/configure-media.md` turns on uploads; `docs/extend/define-an-adapter-and-schema.md`
  grows the minimal adapter; `docs/extend/build-the-public-routes.md` adds the delivery routes
  beyond the entry catch-all. The 2b pages are pending links, which docs-links counts as such.

## Round-2 findings, disposed

- Structural edit, `:1068`, and register editor, `:~1060-1140` (the closing section inside
  milestone 4): disposed by the plan; the section is a closing H2 and the introduction names it.
- Register editor, `:1000-1006` ("Point the site at production" contradiction): disposed by the
  plan; the section is gone, the three-edits sentence is milestone 4's opening map, and each
  section makes its own edit.
- Fact read, `:3` sentence 1: applied; cite `[f:gyu7jc, f:2gtftn, f:dqjkci]`.
- Fact read, `:3` sentence 3: applied; cite `[f:u705t5]`.
- Non-blocking, carried into the plan: the two Paid-plan triggers (one trigger stated);
  milestone 2's objectives no longer promise a save check; the Windows forms sit inside the one
  step; the `checkOrigin` deprecation is linked where the option is set; the intro's sentence 5
  cites f:k16chc beside f:m0ouh8 and the production check carries the edit to the deployed page;
  the conditional step states its condition first; each exercise has its own lead sentence, so no
  "This exercise is optional" phrase recurs; the summary is prose; the closing section is named in
  the introduction.

## Structural edit findings on the plan, disposed

The structural edit read the plan on 2026-10-03, before any prose, and returned `fix` on one
blocking finding and two advisories.

- [BLOCKING] `:460-461`, milestone 4 opening from a repository no milestone produced: fixed by
  departure 8. Milestone 1's project step initializes the repository on `main` and commits the
  scaffold, and its objectives say so; milestone 3's manifest step commits to that repository;
  the new section "Push the site to GitHub" closes milestone 3 with the repository created on
  GitHub and `main` pushed, with its own check and its "I can" item; milestone 4's start state
  names that section; the App installation grants the `field-notes` repository by name; and the
  production check commits and pushes the milestone's edits before the publish, so its `git pull`
  is a fast-forward. The git and GitHub steps are no-claim procedure, since no handed fact covers
  them, with GitHub's create-a-repository page linked.
- [advisory] `:122-128`, the out-of-scope list omits the retired doctor and the `/components`
  subpath: recorded as a disposition against the outline entry in "What the page does not cover"
  (disposed by absence, with the reason) and carried by the dispositions table's f:pg2smj and
  f:jzb3d0 rows, so the next structural read finds the decision written down.
- [advisory] `:455-610`, milestone 4's weight: not blocking, and not grown. The push section landed
  in milestone 3 rather than ahead of the App section (departure 8), and the drafting constraints
  below hold every milestone 4 section's lead-in to one or two sentences, so the opening map
  carries the reader through its nine sections.

## Resolution run 2 findings, disposed

The resolution run's round 2 (2026-10-03) drafted from this plan and returned five BLOCKING
findings on the page, four from the register editor and one from the fact read, in
`docs/superpowers/research/2026-10-03-draft-docs-2a-resolution-run-record.md`, "###
add-cairn-to-a-sveltekit-app", the final escalation findings. The conductor's ruling for run 2
starts from the accepted plan and changes it only where one of these requires; each change sits
at the plan line the page defect traces to, and the round's advisories are outside the ruling's
scope, so no advisory changed the plan.

- [BLOCKING] register editor, `:27-39`, the prerequisites split across an inline series, a list,
  and a detached paragraph: traced to this plan's own Sentence line for "Before you begin", which
  enumerated four items inline and so became the page's first sentence. Fixed in that section:
  the Sentence is a lead-in that names no item, and the Shape line fixes the section as the
  lead-in plus one seven-item list with nothing after it, the install command inside its item.
- [BLOCKING] register editor, `:920`, "a multi-line encoding does not parse", a claim the
  container's rejection record f:w78j1b contradicts: fixed in "Give the adapter the identity and
  the Worker the key". f:vpieos is carried for its one-line form only, the page gives no reason
  for the form, and the two bullets' disagreement is filed in `docs/internal/docs-friction-log.md`
  for the claims checker (the entry found by the add-cairn page plan's resolution revision on
  2026-10-03, naming f:vpieos and f:w78j1b).
- [BLOCKING] register editor, `:890`, the caution framed the token's repository-wide reach as
  another arrangement's hazard while `field-notes` holds the site's code: fixed in "Register the
  GitHub App". The caution states the reader's own case, that the token can also write the site's
  code in `field-notes`, and the plan names the framing the page may not use.
- [BLOCKING] register editor, `:792, 882, 887, 1055`, the repository name `field-notes` in plain
  text where the reader types it: fixed as a drafting constraint, every fixed name of the running
  example in code font at every mention, GitHub's form steps and the publish check included.
- [BLOCKING] fact read, `:493`, the `src/app.d.ts` declaration step cited f:vvgpr5 alone: fixed
  in "Wire the dev backend and the CSRF handoff". The step cites f:n52h8f (the scaffold's
  `src/app.d.ts` declares the `__CAIRN_DEV_BUILD__` boolean global) and f:72mctx, and the fact
  joins the dispositions table as carried.

## Resolution run 3 findings, disposed

Run 3 (2026-10-03) redrafted from this plan on the combined reads; the register editor's two
heading findings traced to this plan's Heading lines, so the plan changed there and nowhere else.

- [BLOCKING] register editor, `:901`, the balanced-halves heading "Give the adapter the identity
  and the Worker the key": the section's Heading is now `### Store the App's credentials`, the
  page's earlier name and the one its own lead-in uses.
- [BLOCKING] register editor, `:1204`, the conversational heading `## What you built`: the
  Ending's Heading is now `## The finished site`.
- The register editor's other two blocking findings (two prerequisite items over 26 words; the
  Paid-plan condition after its instruction) were page defects against this plan's Shape, fixed
  on the page.
- [advisory, not taken] structural edit, `:891, :895-896, :899, :1064`, the page writes "the
  site's repository" where the drafting constraints name `field-notes`: `check:provenance` fails
  any cited sentence that carries `field-notes`, since no fact bullet holds the string (the
  friction log's code-font entry on the running example's repository name). Those four sentences
  keep "the site's repository", and `field-notes` stays in code font in the push step's name block
  and the adapter sample until the gate learns a running-example allowlist.

## Resolution run 4 findings, disposed

- [BLOCKING] register editor, `:7`, the false universal "each step that creates the project or
  its repository says when your app skips it" (two of the three skip notes sit in section prose,
  not steps): the sentence now reads "An existing app works through the same milestones, and the
  tutorial notes where that app skips creating the project or its repository", and the prior
  knowledge line above matches the page. The final reader read's scoped redraft then restored
  the second person ("If you start from an existing app, you work through the same milestones,
  and the tutorial notes where your app skips creating the project or its repository").
- [BLOCKING] final reader read, `:53, :60, :206`: `sv create` scaffolds SvelteKit 3 since
  2026-10-01, and `npm install @glw907/cairn-cms` stops with `ERESOLVE` against the engine's
  `^2.70` peer range. Milestone 1 now pins `@sveltejs/kit@^2.70` and
  `@sveltejs/adapter-cloudflare@^7` and replaces `tsconfig.json` with the SvelteKit 2 form
  (f:ghzx9c, f:skeche, f:jzm5ef, f:g48ytv), reproduced in a fresh scratch project on 2026-10-03
  (install resolves, build and check exit 0). The engine-side major is in the friction log.
- [BLOCKING] final reader read, `:907`: the credentials step now sets `owner` as well, and the push
  step tells the reader to replace the account name in the remote URL.
- [BLOCKING] scoped register read, `:828`: the push step's placeholder sentence names no
  placeholder (conductor ruling; a code-font placeholder fails `check:provenance`, the friction
  log's running-example entry). The same round splits milestone 1's opening paragraph so the
  SvelteKit 2 pin stands as its own paragraph, writes the date as October 1, 2026, and rewords the
  `tsconfig.json` and credentials steps.
- The reader read's smaller items, all taken: the `routes` entry with `custom_domain: true` joins
  the whole-file `wrangler.jsonc` and replaces the separate serve-on-the-domain step (f:thgmpz);
  the exercise names `src/routes/+page.svelte` (f:ibis7z); the `d1_databases` step says the entry
  sits at the top level.

## Dispositions, every fact id

`carried` names the section the fact is placed under (its primary home when it is cited twice).
`subordinated` names the reference page or entry that states the fact and gives the reason; the
brief records it as a cut whose reason names the link. `cut` gives the reason.

| Fact | Disposition | Section, or reference and reason |
| --- | --- | --- |
| f:5f4kmk | carried | Verify the production site |
| f:vgw8x9 | carried | Register the GitHub App |
| f:gglwt4 | carried | Register the GitHub App (the caution, with f:l5gx1t, stated as the reader's own `field-notes` case) |
| f:vpieos | carried | Store the App's credentials (the one-line form only; the `atob()` causal clause stays off the page, since the rejection record f:w78j1b contradicts it, filed in the friction log) |
| f:if45on | carried | Create the auth database |
| f:gffvfd | subordinated | `docs/reference/auth-store.md`, the D1 schema's home; the page names each migration by purpose (f:hft8s8, f:rn62i1, f:pkrwom, f:xxtooz), and which file runs a `CREATE TABLE` is detail no step depends on. The page does not state it today; see couldNotDo. |
| f:rn62i1 | carried | Create the auth database (one sentence); the exercise |
| f:pkrwom | carried | Create the auth database (one sentence, linking `docs/reference/sveltekit.md#created1auditsink`) |
| f:xhwl32 | carried | Add the Email Sending binding and name the origin |
| f:t4pwpw | carried | Before you begin (the same plan covers mail to a second person; no price stated) |
| f:zcwf5i | carried | Store the App's credentials |
| f:m0ouh8 | carried | Verify the production site; the introduction's sentence 5 |
| f:26kuvx | carried | Install the engine and let Vite compile it |
| f:xyizai | subordinated | `docs/reference/supported-toolchain.md`, "The target stack" (the `@sveltejs/adapter-cloudflare` row from the template's `package.json`); the scaffold's build choices are `docs/extend/scaffolded-site-files.md`'s subject, and the page names the adapter on f:mhsere's reason. |
| f:gyu7jc | carried | Introduction, sentence 1; Register the GitHub App |
| f:nbnq9c | carried | Register the GitHub App |
| f:ntdafg | carried | Deploy the production build and read the refusal; Add the Email Sending binding and name the origin; Resolve a production failure |
| f:hft8s8 | carried | Create the auth database; Resolve a production failure |
| f:fekvhi | subordinated | `docs/reference/sveltekit.md#created1auditsink` states `createD1AuditSink`'s signature, the `AUDIT_DB` binding, and the `0002_audit.sql` copy; the page keeps one sentence on the separate binding from f:pkrwom. |
| f:xxtooz | carried | Create the auth database; the exercise |
| f:02g94x | carried | Register the GitHub App |
| f:9yi7fu | carried | Register the GitHub App (one clause in the name step) |
| f:e5vm42 | carried | Move the site to production (the opening's order); the introduction's milestone 4 line |
| f:7dtrwy | carried | Store the App's credentials |
| f:l5gx1t | carried | Register the GitHub App (the caution, with f:gglwt4; the page states the reach over `field-notes` itself, never the fact's "a repository that also holds code or other teams' content" framing) |
| f:0w7jar | carried | Store the App's credentials; Push the site to GitHub (one clause, `owner` and `repo`); Create the project on the Cloudflare adapter (the `main` branch clause) |
| f:rp65d2 | carried | Register the GitHub App; Resolve a production failure; Push the site to GitHub (one clause, the installation covers the content repository) |
| f:75hawi | carried | Before you begin |
| f:yegr67 | carried | Before you begin |
| f:ifuvcl | carried | Deploy a bare SvelteKit site (the opening's existing-app line); Create the project on the Cloudflare adapter |
| f:mhsere | carried | Create the project on the Cloudflare adapter; Verify the deployed site |
| f:q13lck | carried | Describe the Worker and deploy it; Verify the deployed site |
| f:9mx680 | carried | Wire the dev backend and the CSRF handoff (the fence, one sentence per layer) |
| f:vvgpr5 | carried | Install the engine and let Vite compile it (the augmentation and the `App.Platform` clause; the five names at `docs/reference/ambient.md`) |
| f:pdgkex | carried | Index the content and commit its manifest; Resolve a content build failure |
| f:n0laoh | carried | Index the content and commit its manifest; Resolve a content build failure; the exercise |
| f:6ebew3 | carried | Verify the rendered entry; the exercise |
| f:c8efq5 | carried | Install the engine and let Vite compile it |
| f:72mctx | carried | Wire the dev backend and the CSRF handoff; Verify the dev sign-in (failure check); the checklist's one "say why" |
| f:f2vudv | carried | Compose the runtime and the admin; Verify the dev sign-in; Verify the production site |
| f:d2jumm | carried | Wire the dev backend and the CSRF handoff (the why; the deprecation at `docs/reference/supported-toolchain.md#the-checkorigin-removal`) |
| f:7bch04 | carried | Move the site to production (the opening map); Add the Email Sending binding and name the origin |
| f:jzb3d0 | carried | Mount the admin routes (the `/admin` import half; the removed subpath stays off the page, `docs/extend/migration-notes.md`'s subject) |
| f:7e1t0j | carried | Create the project on the Cloudflare adapter |
| f:87hc1y | carried | Create the project on the Cloudflare adapter (the `compilerOptions` comment in every sample; nothing on runes) |
| f:979v0a | carried | Create the project on the Cloudflare adapter |
| f:9ug9mo | carried | Describe the Worker and deploy it; Verify the deployed site; the exercise; the introduction's milestone 1 line |
| f:jbt2hh | carried | Deploy the production build and read the refusal; Install and wire the engine (the opening's reason for the dev backend); Resolve a production failure |
| f:d0sp1t | carried | Write the site config and a minimal adapter; Compose the runtime and the admin |
| f:dqe7ij | carried | Compose the runtime and the admin; Mount the admin routes; the introduction's sentence 1 |
| f:dqjkci | carried | Wire the dev backend and the CSRF handoff; Verify the dev sign-in; the introduction's sentence 1 and milestone 2 line |
| f:dujlzg | carried | Write the site config and a minimal adapter |
| f:e5hqn3 | carried | Wire the dev backend and the CSRF handoff |
| f:e8dr5r | carried | Verify the dev sign-in (the three forms inside step 1) |
| f:em69ru | carried | Write the site config and a minimal adapter (rejects unknown keys; the key set at `docs/reference/core.md#parsesiteconfig`; no doctor path stated) |
| f:ew4uk7 | carried | Install the engine and let Vite compile it |
| f:exxsvk | carried | Mount the admin routes |
| f:f21bcz | carried | Wire the dev backend and the CSRF handoff; Verify the dev sign-in |
| f:fj28xs | carried | Index the content and commit its manifest (the two required options; the defaults at `docs/reference/vite.md#cairnmanifestoptions`) |
| f:gj96px | carried | Add the first entry (the shape half); the introduction's milestone 3 line; the exercise |
| f:eiaqkh | carried | Wire the dev backend and the CSRF handoff (the dynamic import) |
| f:lbetsq | carried | Customize the sign-in email, Edit the message in a custom sender; the Email Sending section's hand-off sentence |
| f:1b54g7 | carried | Customize the sign-in email, Edit the message in a custom sender |
| f:2gtftn | carried | Customize the sign-in email (lead paragraph); the introduction's sentence 1 and closing-section line |
| f:c4nnu9 | carried | Verify the rendered entry (the sheet's name and the unstyled note; its contents at `docs/reference/public-css.md`) |
| f:ebx4pv | carried | Write the site config and a minimal adapter; Rename the site; Customize the sign-in email |
| f:g81luc | carried | Compose the runtime and the admin |
| f:tkpmxr | subordinated | `docs/reference/log-events.md`, the `guard.refused` row (`reason: "dev_backend_in_prod"`, a 503 when `CAIRN_DEV_BACKEND` is set in a deployed runtime); the page names the fence's third layer in one clause from f:9mx680 and leaves the two refusal sites and their terms to the reference. |
| f:gncd64 | carried | Wire the dev backend and the CSRF handoff |
| f:fvi8rk | carried | Render the entry (the load data; `CairnHead` in one clause, at `docs/reference/delivery.md#cairnhead`) |
| f:k16chc | carried | Index the content and commit its manifest (the local `origin`); Render the entry; Add the Email Sending binding and name the origin; Verify the production site; the introduction's sentence 5 |
| f:v72g9z | carried | Customize the sign-in email, Rebrand the email |
| f:pg2smj | cut | The retired JavaScript doctor's `github.app` check and its runtime substitute are `docs/extend/upgrade-cairn.md` and `docs/extend/migration-notes.md`'s subject (the outline's out-of-scope list); the page's doctor sentence (f:m0ouh8) already says no command checks the App. Cut at the pilot draft (brief at `bbfb6788`), cut again here. |
| f:dzmj90 | cut | A slug-contract test fixture for a heading no live page carries, a contributor fact with no reader need on this page. Cut at the pilot draft (brief at `bbfb6788`), cut again here. |
| f:u705t5 | carried | Introduction, sentence 3 (a front-door fact; the cross-arm citation the rework record allows) |
| f:vrue1g | carried | Index the content and commit its manifest (cited only by a sentence that names the `cairn-manifest` bin; a cross-arm citation the plan adds) |
| f:1dhk1a | carried | Before you begin (the `cairn` CLI install; a cross-arm citation the plan adds) |
| f:txgoyy | carried | Add the Email Sending binding and name the origin (`observability.enabled: true`; a cross-arm citation the plan adds) |
| f:skeche | carried | Create the project on the Cloudflare adapter (the `^3` peer range, which a project on SvelteKit 2 fails with `ERESOLVE`) |
| f:ghzx9c | carried | Create the project on the Cloudflare adapter (the SvelteKit 3 scaffold and its `tsconfig.json`) |
| f:jzm5ef | carried | Create the project on the Cloudflare adapter (the adapter 8 swap and its peers) |
| f:g48ytv | carried | Create the project on the Cloudflare adapter (the SvelteKit 3 `tsconfig.json`, which extends `$app/tsconfig`) |
| f:ibis7z | carried | Deploy a change (the home page's path) |
| f:thgmpz | carried | Add the Email Sending binding and name the origin (the `routes` Custom Domain entry) |
| f:n52h8f | carried | Wire the dev backend and the CSRF handoff (the `src/app.d.ts` declaration step, with f:72mctx; a cross-arm citation the plan adds on the fact read's round-2 finding) |

## Drafting constraints

- The disclosure block is a `#### Show me the steps` heading under each exercise, since a
  `<details>` wrapper cannot pass `check:provenance` (filed in the friction log).
- A vendor figure is linked, never restated: Cloudflare's Workers pricing page for the Paid plan.
- No sentence states what the dev admin lists, and no dev-backend check looks for the reader's
  own entry in the admin; the only dev-backend check is the sign-in.
- The doctor step asks the reader to confirm one check, `config.bindings`, and links the checks
  table for the rest; the page claims nothing about the other checks' results.
- Each exercise opens with its own lead sentence; the recycled "This exercise is optional" phrase
  does not appear. Each answer is three or four steps.
- Checklist items are "I can" statements of actions and outcomes; at most one "say why" item per
  milestone, and only for a why that milestone's prose stated.
- A conditional step states its condition first.
- Every milestone 4 section opens with a lead-in of one or two sentences, the section's first
  sentence included, and the milestone's opening map does the orienting; the App registration's
  ten steps carry no commentary between them beyond the one caution sentence after the list.
- The page commits and pushes only where a later step depends on it: the scaffold's first commit
  in milestone 1, the manifest commit and the push that close milestone 3, and the commit and
  push before the production publish. Every other edit is left to the reader's own habit, so no
  intermediate section ends in a commit step.
- The page links the stage 2b pages it names (`define-an-adapter-and-schema`,
  `build-the-public-routes`, `configure-media`, `rotate-the-github-app-key`,
  `scaffolded-site-files`, `debug-your-site`); docs-links counts them as pending.
- A brief sentence that synthesizes facts cites them as an array; a `cuts` list mirrors the
  subordinated and cut rows above, each reason naming the reference link or the reason given.
- Every fixed name of the running example sits in code font at every mention: `field-notes` (the
  project and the repository), `your-account`, `main`, `field-notes-auth`, `notes.example.com`,
  `cms@notes.example.com`, and the post's path. That holds in GitHub's form steps ("create an
  empty repository named `field-notes`", "the account that owns the `field-notes` repository",
  "grant the App access to the `field-notes` repository only") and in the publish check ("on
  `main` of the `field-notes` repository"). Only the site name, Field Notes, is prose.
