---
page: Scaffolded site files
type: concept
exemplar: extenders/shadcn-introduction
---

# Scaffolded site files

:::reader
**Who reads it.** A Svelte-fluent web developer who opens a site that `create-cairn-site` scaffolded, in one of these situations:
- The inheritor, the job's reader, took over a site someone else scaffolded. They arrive from the intro and related resources of Architecture, from the extend index's Start group, or from a search for a file the tree holds, such as `cairn-audit.config.json`, `wrangler.jsonc`, or `check.yml`. They know SvelteKit, Vite, and enough Wrangler to read `wrangler.jsonc`, and that the site is live and editors may already publish to it. :fact[kldwss] :fact[cjonmm]
- The inheritor lacks the setup run's history: the saved record sits in the home directory of whoever ran the command, and a Workers Builds connection deploys on a token that person pasted. They also lack which files carry a contract, that no engine release rewrites the tree, and what `.claude/` is for, whose guidance detail belongs to the guidance reference. :fact[3m0oxs] :fact[3bbeia] :fact[qca0t0] :fact[rxj43c] :fact[jtl15v] :fact[qlgggh]
- The runner ran `create-cairn-site` and now opens the tree to change it. They arrive from the intro of Add cairn to a SvelteKit app, the extend index, or a search after the run. The command's hand-over text names `.github/workflows/check.yml`, `.claude/`, and `npx cairn-guidance check` but links no page, so the output itself is no arrival path. They hold their answers to the setup prompts and the state file, and they lack the file map, which files carry a contract, and why the CI's guidance step never fails a build. :fact[kouawx] :fact[jd54ph]
- The chooser is deciding between the setup command and the by-hand build, and arrives from the intro of Add cairn to a SvelteKit app, which names this page as the account of what the command writes. They know SvelteKit and little of cairn, and the page shows them the scaffold through the file tree and the ownership statement.
- The architecture reader maps the engine's import points and seams onto real files, arriving from Architecture's cross-link. They know the model of one adapter, the seams, and the data tiers, and they lack file locations, which the tree and the per-file entries answer. :fact[j0ut9n]
- The theme reader works on the public design and arrives from the intro list and related resources of Theme your public site. They know theming (tokens, cascade layers, Waymark on the chassis) and lack the rest of the tree; theming depth stays on their page, which the out-of-scope list names. :fact[s23sk0]
- Wrong place, routed: a developer adding cairn to an app they already run, or building without Waymark, wants steps to wire cairn in. The setup command writes only into a missing or empty directory and the npm package carries no template, so they belong on Add cairn to a SvelteKit app, which the out-of-scope list's first item names. :fact[9slxqf] :fact[rxj43c]
- Wrong place, unroutable for now: a technical non-developer who ran or inherited the setup command's site arrives by search, since the admin arm holds no page yet. The prior-knowledge sentence tells them the page expects SvelteKit; no admin page exists to route them to.
- Minor, and not addressed by the introduction: an engine contributor reading the showcase, arriving from `examples/showcase/README.md` or an old link through the redirect from `docs/extend/what-the-scaffold-wrote.md`. The tree and The scaffold answer what the scaffold carries out of the showcase.
- A coding agent working on a scaffolded site is not a reader: the guidance fragment sends agents to the reference index, and the register's scripter-or-agent profile reads the reference arm.

**Why they arrive:**
- To learn what each file does, whether it may change, and what the engine or a check depends on.
- To learn why each file the command wrote is there, starting with the three the hand-over named.
- To see what the setup command would give them before choosing it over the by-hand build.
- To find where the adapter, the server hook, the admin mount, and the bindings sit in the tree.
- To find the files around the theme, and which ones outside it they may touch.

**What they already know.** Working knowledge of SvelteKit's project structure (routes, layouts, hooks, and prerendering), Vite configuration, and Wrangler configuration for a Worker's bindings and D1 migrations. A Svelte-fluent reader needs nothing more, and the page explains no SvelteKit or Cloudflare basics.

**Argument.** A scaffolded site is a complete SvelteKit project that the site owns outright, with the engine as one dependency, and a short, marked set of its files carries a contract that the engine or a build or CI check reads. A new owner who knows which files those are can change everything else freely and change those few with the contract kept. The page proves the claim file by file: it states the ownership first, draws the tree with the contract files marked, gives each file or directory a short entry saying what it does and what reads it, then states the rules that span several files and the state the setup command left outside the repository.

**What the page does for them:**
- The introduction runs as paragraphs 1 to 3, then its bounds in order. It opens on a statement about a scaffolded site from the reader's situation, never an imperative and never a sentence about the page. First mention is `create-cairn-site`, then "the setup command".
- Paragraph 1, the scaffolded site and where the platforms fit: a site that `create-cairn-site` scaffolded arrives as a complete SvelteKit project in a GitHub repository, already deployed as a Cloudflare Worker, with the engine, `@glw907/cairn-cms`, installed as one npm dependency. :fact[kldwss] :fact[o47i0q] :fact[j0ut9n]
- One sentence says what the tree is: Waymark, cairn's reference reading theme, together with the design-neutral code in `src/chassis/`; the definition proper waits for The scaffold. :fact[n2skkz] :fact[rxj43c]
- Then the platforms: on the SvelteKit side, routes mount the admin and the public site, a server hook guards `/admin`, and the whole SvelteKit config sits inline in `vite.config.ts`. :fact[t2t5lx] :fact[f21bcz] :fact[n4rg1z]
- On the Cloudflare side, `wrangler.jsonc` binds the Worker's one D1 database (the auth store), a mail binding, and an R2 bucket. :fact[n7t4bn]
- The repository holds the code and the markdown, the site's GitHub App commits each editor's publish into it, and a GitHub Actions workflow checks every push and pull request. :fact[cjonmm] :fact[gj96px] :fact[guiavc]
- Paragraph 2, ownership and the contracts inside it: every file in the tree belongs to the site. The engine's npm package carries neither Waymark nor the chassis, so an engine upgrade moves the `@glw907/cairn-cms` range and leaves the tree as it is, and any edit a release needs in the site's code is the site's to make. :fact[rxj43c] :fact[jtl15v]
- Some files still carry a contract, because something outside the site's code depends on their shape. The engine reads the adapter, the server hook, and the bindings, and the admin commits editors' work into the content, its manifests, and the primary menu in the site config. :fact[u4cfvv] :fact[f21bcz] :fact[n7t4bn] :fact[cjonmm] :fact[vrue1g] :fact[2s8u70]
- A few more feed the CI workflow and the build's prerender checks, and either one fails when such a file breaks its rule. :fact[guiavc] :fact[mrv24k] :fact[2zl3qz] :fact[34rsss]
- Those files share directories with files that only the site reads, as the adapter does with the theme's style sheets in `src/theme/`. One idea per sentence; the kinds of reader never form a reflexive triad for its own sake. :fact[qnf469]
- Paragraph 3, the readers and their reasons: a developer who ran the setup command, or who took over a site from someone who did, reads on to learn what each file does and whether to change it.
- One who took over also lacks what the command left outside the repository: its saved record of the run on the machine that ran it and, when the run connected Workers Builds, the build token it registered at Cloudflare. :fact[3m0oxs] :fact[3bbeia] :fact[qca0t0]
- A reader who knows the engine's import points and seams from Architecture finds where each one lands in the tree, and a reader working on the public theme finds the files around it. The Architecture link is the introduction's one link outside the bounds lists; the theme reader gets no link here, since the out-of-scope list carries Theme your public site.
- Someone still choosing between the setup command and a by-hand build sees what the command writes. A developer adding cairn to an app that already exists has no choice to make, because the setup command writes only into a missing or empty directory. :fact[9slxqf]
- The bounds follow. What the page covers is a bulleted list of subjects in body order. Its complete lead-in names the subjects and never the page, and the list holds the items under the next label.
- The list keeps "the themed 404 page": the numeral is the page's name and matches the Themed 404 page heading, which the no-numeral rule, aimed at counts, does not reach.
- The prior-knowledge sentence follows the subjects list, so the non-developer reader learns there that the page expects a developer.
- The out-of-scope list sits under a complete lead-in that never names the page, each item subject first and its page last.

**What the page covers, in body order:**
- What the scaffold is, and why the site owns every file. :fact[rxj43c]
- The file tree, with the files the engine or a check reads marked.
- The root files and the build and deploy configuration. :fact[n7t4bn]
- The database migrations, and why an added database takes a separate directory. :fact[gepykz] :fact[nv0ok0]
- The routes and the server hook, including what the local dev server runs.
- The theme, chassis, and content directories, the committed manifests, and the two style sheets.
- The settings a developer edits by hand, outside the admin.
- The build's crawl rules and the themed 404 page. :fact[2qnqkm]
- The state the setup command left outside the repository. :fact[3m0oxs]

**What it leaves to other pages:**
- Building the same tree by hand, in Add cairn to a SvelteKit app.
- Changing the theme and the chassis, in Theme your public site.
- Building a custom admin screen, in Add a custom admin screen.
- Each delivery route's wiring, in Build the public routes.
- Media configuration behind the `MEDIA_BUCKET` binding, in Configure media. :fact[n7t4bn]
- The audit's `cairn-audit.config.json` in depth, in Run cairn-audit on your site. :fact[guiavc]

**Background:**
- The general model. A scaffolded site is an ordinary SvelteKit project in a GitHub repository, built into one Cloudflare Worker, with the engine installed as an ordinary npm dependency. The same run that wrote the tree created the site's GitHub App, its repository, and its Cloudflare bindings, and deployed it, so a new owner meets a live site, not a starter to deploy. :fact[j0ut9n] :fact[o47i0q] :fact[kldwss]
- What the tree is, and why it exists. The setup command bakes Waymark, cairn's reference reading theme, on the chassis, the design-neutral code, from the same tree the engine tests itself against, with test-only material pruned. Waymark is the one template shipped; the page never names Topo, which does not ship. The scaffold exists so a site starts from the engine's reference wiring, already deployed, rather than from a by-hand build. :fact[n2skkz] :fact[rxj43c] :fact[u705t5] :fact[kldwss] :fact[9slxqf]
- Why the site owns every file. The npm package's `files` list carries neither Waymark nor the chassis, so an engine upgrade moves the `@glw907/cairn-cms` range and leaves the tree as it is; each change a release needs in the site's code, a new D1 migration included, is the site's to make, named by the changelog's `Consumers must:` lines. The agent guidance under `.claude/` is refreshed when the site runs `npx cairn-guidance install`, guidance detail the page leaves to the guidance reference. The package does ship the engine's `migrations` and the guidance sources (`package.json:204-216`), so no sentence may say the package carries nothing of the tree. :fact[rxj43c] :fact[jtl15v] :fact[h0xykj]
- Why ownership still has contracts. Three kinds of reader depend on particular files. The engine reads the adapter in `src/theme/cairn.config.ts`, the server hook that installs the guard, and the bindings in `wrangler.jsonc`. :fact[u4cfvv] :fact[f21bcz] :fact[n7t4bn]
- The admin commits editors' work into the tree: each publish lands content on the default branch and patches the content manifest, and the media commits write the media registry; `/admin/nav` writes the primary menu in `src/theme/site.config.yaml`, and the nav, settings, and vocabulary saves commit that file. :fact[cjonmm] :fact[gj96px] :fact[vrue1g] :fact[2s8u70] :fact[0gihxq] :fact[shv6wv]
- The CI workflow and the build fail on others: `check.yml` runs the checks, and the prerender handlers in `vite.config.ts` throw on an unseen route or an HTTP error. These files share directories with files the site alone reads, such as the adapter beside the theme's style sheets in `src/theme/`. :fact[guiavc] :fact[mrv24k] :fact[2zl3qz] :fact[34rsss] :fact[qnf469]
- Where SvelteKit fits. The tree is a SvelteKit project with its config inline in `vite.config.ts` and no `svelte.config.js`; the admin is a catch-all route pair at `/admin`, a server hook guards it, and the public site is a prerendered route group. :fact[n4rg1z] :fact[t2t5lx] :fact[f21bcz] :fact[qtm9y2] :fact[2qnqkm]
- Where Cloudflare fits. `wrangler.jsonc` names the Worker the build produces and binds one D1 database, the auth store `AUTH_DB`, with no second database, plus the static-assets binding, the Email Sending binding, and an R2 bucket, with Workers Logs on. `migrations/` is that database's one migrations directory, and a database the site adds would take a separate one, stated as the general rule. :fact[o47i0q] :fact[n7t4bn] :fact[l3cxgc] :fact[prb2os] :fact[gepykz] :fact[nv0ok0]
- The setup run deploys the site once. Workers Builds deploys on each push to the default branch when the same run's Workers Builds step connected it rather than recording a decline, on the build token that step registered; `--connect` re-enters that step for a site already past its first deploy. The introduction hedges any deploy claim accordingly and never says each push deploys. :fact[kldwss] :fact[qca0t0] :fact[3bbeia]
- Where GitHub fits. The repository holds the code and the markdown; the site's GitHub App commits each editor's publish to its default branch; a GitHub Actions workflow runs install, `npm run check`, and `npm run check:cairn` on each push and pull request and never builds. :fact[cjonmm] :fact[guiavc]
- State outside the tree, and why it matters to a new owner. The setup command keeps its record of the run in `~/.config/cairn/sites/<id>.json` on the machine that ran it, which a resumed run reads and `--sign-in` needs; an inheritor has no copy. When the run connected Workers Builds, it also registered a build token at Cloudflare. This is the inheritor's sharpest reason to read the page, and the introduction names it. :fact[3m0oxs] :fact[3my5c1] :fact[o8uoci] :fact[3bbeia]
- Nothing is left out on purpose: the page touches SvelteKit, Cloudflare, and GitHub, and the introduction places each in one clause.

**Place in the doc set:**
- Group and neighbors. The extend track's Start group, third after Architecture and Add cairn to a SvelteKit app.
- What links in, and why. Architecture (intro and related resources) sends the inheritor here for the file map. Add cairn to a SvelteKit app (intro) sends the runner and the chooser here for what the command writes. Theme your public site (intro list and related resources) sends the theme reader here for the file map behind the theme. `examples/showcase/README.md` and the redirect from `docs/extend/what-the-scaffold-wrote.md` bring a contributor or an old link.
- What links out. The outline's cross-links: Theme your public site, Add a custom admin screen, Add cairn to a SvelteKit app (and its sign-in email section), Configure media, Run cairn-audit on your site, Define an adapter and schema, Build the public routes, and Upgrade cairn. The introduction carries six of them through the out-of-scope list and adds one link to Architecture.
- What Architecture owns: the model (subpaths, seams, data tiers, stability tiers). It already says the setup command creates the GitHub App, the repository, and the Cloudflare bindings and deploys the site in one run, and that an inheritor needs to know which files rest on an engine contract. This introduction does not open on "cairn is", does not repeat that list as a sentence, and does not reuse "rest on an engine contract".
- What Add cairn to a SvelteKit app owns: it opens "cairn is a markdown CMS embedded in a SvelteKit site" and calls the setup command "the much easier route". This introduction makes no route comparison beyond one clause for the chooser.
- What Theme your public site owns: it says the npm package ships neither Waymark nor the chassis, "so no engine version governs the site's chrome". This introduction states ownership over the whole tree and in upgrade terms, never in terms of chrome or design.

**Order.** Ownership comes first because each later answer to "may I change this?" rests on it, and the annotated tree follows as the map the rest of the page walks. The per-file sections walk the tree from the outside in: the root files, the configuration in the order the build reads it, the migrations, the routes and the server hook, the theme, chassis, and content the routes read, and the style sheets. The rules that span several files come after each file they span is introduced, and the state outside the repository closes the body. Related resources ends the page, as the concept anatomy requires.
:::

:::constraints
- From the front-matter exemplar (`extenders/shadcn-introduction`, a concept page), take the up-front ownership statement (you own and edit this code) and one line per principle on what it changes in practice; leave the pitch lines and the deploy CTA.
- From the second exemplar, `designers/ghost-themes-structure` (a reference entry), take the annotated file tree first, with load-bearing files marked inline, then one short entry per file saying what it does and what breaks without it; leave Handlebars helpers and Ghost routing.
- Each of these claims lands in one section: the dev admin's content option in `src/hooks.server.ts`; no second database in `wrangler.jsonc` and Database migrations, and no signups route in the route tree; the admin error page in `src/routes/admin/`; `cf-typegen` in the table of `package.json`; the guidance check in `.github/workflows/check.yml`; the engine-supplied define in `vite.config.ts`; the health route's 200 and 503 in Endpoints at the root; the roles migration in Database migrations. :fact[zzjrza] :fact[p1v88s] :fact[cgt4tk] :fact[n7t4bn] :fact[nv0ok0] :fact[qtm9y2] :fact[ty4ehh] :fact[n0fg3w] :fact[jd54ph] :fact[xluud1] :fact[paotzb] :fact[gepykz] :fact[rn62i1]
- No coding assistant is assumed (register, owner ruling). Claude Code appears in the file tree's one line that labels `CLAUDE.md` and `.claude/` and links the Claude Code page, and in the `check.yml` entry's label for the `npx cairn-guidance check` step. The introduction, the out-of-scope list, and every other section name no coding agent, and no sentence addresses one. The `check.yml` entry names that step as a CI step, states only that it cannot fail the job, and omits what the check reads. :fact[qlgggh] :fact[jd54ph]
- Scaffold claims only. The page never states that the scaffold carries a signups screen, `APP_DB`, `migrations-app/`, or `src/access.ts`. The example site, `examples/showcase`, appears only as the scaffold's source in The scaffold; the example-site halves of these facts stay off the page. :fact[zzjrza] :fact[3z1uxv] :fact[tycp7k] :fact[nv0ok0] :fact[q07rd5]
- `/healthz`: state only what its fact carries (outside the guard, the JSON payload, 200 or 503, the fixed detail on a thrown error, `cache-control: no-store`, `prerender = false`). Never call it a liveness or uptime check, and leave what the signing check proves to the `loadHealth` link. The path is `/healthz`, never `/admin/healthz`. :fact[paotzb]
- The feeds and the sitemap appear by name only; no placed fact describes what they carry.
- Names (register "Names"): `create-cairn-site` on first mention, then the setup command; the engine for the library and `@glw907/cairn-cms` where the reader types it; the package only for a tarball fact; cairn lowercase; `cairn-audit`, `cairn-manifest`, and `cairn-guidance` by name; the GitHub App; the Worker. Never "chassis component". Say "step", never "chapter", for the setup run's steps, and never the internal term "bake".
- Form: every list and table takes a complete-sentence lead-in; every list item and table cell sentence stays under 26 words; the two trees are plain-text code blocks; an H3 for a single file names it in code font; a group H3 takes a noun phrase; no em dash; no heading carries a link.
- The table in `package.json` has two columns, the script and what it runs. Its lead-in claims no completeness, since `check`, `preview`, `build:admin-css`, and `dev:admin-css` carry no fact and stay out of the table. The list in `src/theme/` after its lead-in is a bulleted list with one file or directory per item.
- Hand-offs: the page places one, at the end of The scaffold, and the headings do the rest of the navigation. A hand-off carries no extractable fact.
- Omit Topo: it does not ship, and the "planned" half of the one-template fact rests on no code (`ROADMAP.md:1086`). :fact[u705t5]
- In `wrangler.jsonc`, omit the doctor report the observability fact also names. In the media route entry, omit the key format and the validation detail, which the reference carries. In the build-token entry, omit what revoking or rolling the token does. In `.cairn/`, omit the root-barrel function names. For `--brand-color`, state no range for the number. :fact[l3cxgc] :fact[qtvesq] :fact[3bbeia] :fact[vrue1g] :fact[498l97]
- In Database migrations, omit the roles fact's "opt-in" label for `0003_preview.sql`, since the scaffold ships it; only `0002_audit.sql` is opt-in here. :fact[rn62i1] :fact[gepykz]
- Never call the two route pairs the only entries under `src/routes/admin/`, since the directory also holds `+error.svelte`. :fact[t2t5lx] :fact[ty4ehh]
- Claude Code guidance stays off this page by the owner ruling, left to the guidance reference: the four packaged skills and when each loads ([the four skills](../reference/guidance.md#the-four-skills)); the baked guidance tree, `cairn-guidance install`, its never-delete behavior, its exit code, and the `VERSION` stamp ([install](../reference/guidance.md#install)); the check's seven lines and its exit codes ([check](../reference/guidance.md#check)); the `Stop` hook snippet and the never-written `.claude/settings.json` ([what ships under `claude/`](../reference/guidance.md#what-ships-under-claude)); and how the check judges the Tailwind exclusion and hashes the tree ([the `.claude/` exclusion](../reference/guidance.md#the-claude-exclusion-from-the-tailwind-build)). The file tree names `.claude/` in one labeled line. :fact[7ozknm] :fact[o7bkm0] :fact[0ygumq] :fact[dy5cfj] :fact[4h9fz4] :fact[5ohm23] :fact[4ax489] :fact[4nccq6] :fact[1kwkl0]
- The signups screen is the example site's, not the scaffold's, so this page states no claim about it; the custom-screen guide owns the pattern ([Gate it](add-a-custom-admin-screen.md#gate-it)). :fact[onqm6k]
- The workerd refusal of `'repository'` mode matters only to a site that runs the dev backend under `wrangler dev`, which a default scaffold build never does, and the admin's in-memory notice is admin UI detail beyond the hook entry; the migration notes state both ([Unreleased](migration-notes.md#unreleased)). :fact[2fqe3l] :fact[7qwrb9]
- The example site's hooks are not the scaffold's; the scaffold's branch is placed through the hook fact, and the tutorial's dev-backend section explains the dynamic import ([Wire the dev backend](add-cairn-to-a-sveltekit-app.md#wire-the-dev-backend)). :fact[eiaqkh]
- The guard's config shape and its history, which `locals` it sets, the access map declared once on the adapter, and which readers see the adapter's `access` member belong to the guard's reference entry ([`createAuthGuard`](../reference/sveltekit.md#createauthguard)); the hook entry names only what the file does. :fact[4xrx5f] :fact[gun084] :fact[iwf4nu] :fact[cvzb8z]
- `devBackendHandle`'s config shape and its earlier options are upgrade detail ([the one-declaration change](upgrade-cairn.md#when-your-range-crosses-the-one-declaration-change)). `createEditorRoutes` is not a file in the tree ([`createEditorRoutes`](../reference/sveltekit.md#createeditorroutes)). :fact[7cv105] :fact[mbx6q1]
- Log events, access-map validation at composition time, and `config.access_unmapped` with its fields are diagnosis for the debugging page ([`adminAction.misconfigured`](debug-your-site.md#adminactionmisconfigured), [`config.access_unmapped`](debug-your-site.md#configaccess_unmapped)); a `cairn doctor` condition for custom roles belongs to the doctor reference ([the checks](../reference/cli-cairn-doctor.md#the-checks)). :fact[u78zg6] :fact[8ciz2s] :fact[mou1li] :fact[pfy9cw] :fact[hwffph]
- Auth store behavior stays on its reference: the condition a missing `0001_roles.sql` raises ([`insertEditor`](../reference/auth-store.md#inserteditor)) and editor deletion's cascade ([`deleteEditor`](../reference/auth-store.md#deleteeditor)). The nonce match is a sign-in security property ([limits of the browser binding](security-model.md#limits-of-the-browser-binding)). What the signing check proves is `loadHealth`'s contract ([`loadHealth`](../reference/sveltekit.md#loadhealth)). :fact[xffr6i] :fact[lml542] :fact[5iqvmt] :fact[5dwnh1]
- Key rotation is a separate task with its guide ([Rotate the GitHub App key](rotate-the-github-app-key.md)); the page names the key as the placeholder in the `templates/waymark/` copy's `.dev.vars.example`, in `.dev.vars`. :fact[3jpoi3]
- Cut, never placed: the restatement of one D1 database, one R2 bucket, and no second database, which the `wrangler.jsonc` entry already places; the admin-track inventory of what the setup command creates, since The scaffold places the run's outcome and this page lists files, not accounts; the setup command's closing summary, console output a new owner never inherits; and which conditions no tool check raises, operator diagnosis unrelated to the files. :fact[gcuj1j] :fact[vfpai6] :fact[xw0bit] :fact[bw5uk0]
- Cut, never placed: the rejected claim f:orz556 that `/healthz` is a bare liveness check; the `/healthz` fact states what the route does. :fact[paotzb]
:::

## The scaffold

*States the ownership every later answer to "may I change this?" rests on: defines the scaffold and says that the site owns every file.*

- A scaffolded site is Waymark, cairn's reference theme, wired onto the chassis, the design-neutral code every scaffolded site shares. :fact[n2skkz] :fact[rxj43c]
- The setup command copies both from the same tree the engine runs its tests against. That tree is `examples/showcase`, and a list under a lead-in names the groups the copy leaves out. :fact[n2skkz]
- The Playwright suite and the test routes. :fact[n2skkz]
- The design-review tooling, the `theme-kit` and `probe-craft` routes. :fact[n2skkz]
- The members-login fixture: `src/members`, `src/routes/members`, and `migrations-members/`. :fact[n2skkz]
- The `admin/signups` example screen and its `migrations-app/` database. :fact[n2skkz]
- The `admin/error-fixture` route. :fact[n2skkz]
- The `env-check.ts` module in `src/lib/` and the file `src/routes/(site)/+layout.server.ts`. :fact[n2skkz]
- The showcase's `scripts/`, `README.md`, `.claude`, `.cairn`, and `cairn-audit.config.json`. :fact[n2skkz]
- The showcase's `package-lock.json`, which the template build deletes. :fact[n2skkz]
- The 13 posts dated 2025, out of the showcase's 27, so the scaffold keeps the other 14. :fact[n2skkz]
- When the setup command's package is packed, its build writes a fresh `README.md`, `scripts/dev.mjs`, `.claude` guidance, and `cairn-audit.config.json` into the package in place of the showcase's. The setup command copies those files with the rest of the tree, so the scaffold still carries them. :fact[n2skkz]
- Waymark is the one template the setup command ships. :fact[u705t5]
- The same run that writes the tree creates the site's GitHub App and repository, provisions its Cloudflare bindings, and deploys it, so the tree arrives already live. The Workers Builds connection is a separate step of the same run, left to Setup state outside the tree. :fact[kldwss]
- A site built by hand starts with no template, no chassis, and no deploy, and Add cairn to a SvelteKit app walks through that build. :fact[rxj43c] :fact[kldwss]
- See [Add cairn to a SvelteKit app](add-cairn-to-a-sveltekit-app.md).
- Owning a file does not remove a contract on it. A file that the engine or a check reads can still break the build, the deploy, or the admin when it changes, which is why the tree marks those files.
- The file tree marks each file that carries such a contract.

## File tree

*Gives the map every later section walks, with markers that answer at a glance whether the engine or a check reads a file.*

- In the tree the setup command writes, `[engine]` marks a file the engine reads, writes, or requires a shape of. `[gate]` marks a file that runs or feeds a check that can fail the build or the CI run.
- The tree leaves out files no section discusses, such as `src/app.html` and the theme's test files, and the gitignored root `.cairn/` that the pre-scripts build. The sentence keeps a reader from taking the listing as complete. :fact[i3rn6f] :fact[666eg6]
- Code: one plain-text tree in directory-listing order, drawn from the source directory less the files the `templates/waymark/` copy adds. It lists the root fully, `src/` one level deep, and `src/content/` and `src/theme/` one more level. It collapses `src/routes/` to one line, since the routes section draws a separate tree. Each marker rests on a cited fact. `CLAUDE.md` and `.claude/` appear unmarked. The tree has no `src/access.ts`, `migrations-app/`, `src/routes/admin/signups/`, `.dev.vars.example`, or `LICENSE`. :source[/templates/waymark] :fact[guiavc] :fact[mrv24k] :fact[gepykz] :fact[666eg6] :fact[vs6k2k] :fact[vrue1g] :fact[gj96px] :fact[f21bcz] :fact[q07rd5] :fact[2s8u70] :fact[xluud1] :fact[2zl3qz] :fact[34rsss] :fact[n7t4bn] :fact[qlgggh]

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

- The scaffold has no `src/access.ts`, no `.dev.vars.example`, and no `LICENSE`. :fact[qlgggh]
- `CLAUDE.md` and `.claude/` hold Claude Code's guidance files, in one line that labels the tool and links its page. :fact[qlgggh]
- See [Work on a cairn site with Claude Code](../claude-code/work-on-a-cairn-site-with-claude-code.md).

## Root files

*Starts the per-file walk at the outside of the tree, with the root's files, among them the CI workflow each push meets.*

- Beside a plain SvelteKit project's files, the root carries a CI workflow, the audit's config, and a `.gitignore`. Local secrets go in a `.dev.vars` the developer creates there. :fact[qlgggh] :fact[nls26c]

### `.github/workflows/check.yml`

*Describes the check each push and pull request meets, which is why it leads the root files.*

- On every push and pull request, the workflow installs dependencies and runs `npm run check` and `npm run check:cairn`. :fact[guiavc]
- It uses Node 24. Nothing else in the scaffold names a Node version: there is no `.nvmrc` and no `engines` field. :fact[jcux9z]
- The last step runs `npx cairn-guidance check`, the check of the site's Claude Code guidance, without `--strict` and under `continue-on-error: true`, and that step never fails the job. :fact[jd54ph]
- No browser is installed, so `check:cairn:rendered` cannot run in the workflow. :fact[j7fha2]

### `.dev.vars`

*Tells a developer who looks for a secrets template at the root that none is there, and what the file holds.*

- The scaffold ships no `.dev.vars.example`. Local secrets go in a `.dev.vars` file that the developer creates and the `.gitignore` keeps out of the repository. :fact[nls26c]
- An example of that file exists in the cairn-cms repository alone, committed at `packages/create-cairn-site/template-repo/.dev.vars.example` and copied into the `templates/waymark/` directory. That directory is a separate committed copy of the Waymark template, generated from the same source as the scaffold, with a few files added or replaced. :fact[nls26c] :fact[rxj43c]
- In that copy, `.dev.vars.example` names two entries, listed under a lead-in that names the copy. :fact[nls26c]
- `GITHUB_APP_PRIVATE_KEY_B64`, the GitHub App's private key, with a placeholder value. The App id and installation id are not secrets and live in the adapter, so the file omits them. :fact[nls26c]
- `ANTHROPIC_API_KEY`, left empty. Tidy reads it when tidy is enabled in `site.config.yaml`, and the scaffold's `site.config.yaml` ships with tidy enabled. :fact[nls26c]
- See [Turn on tidy](turn-on-tidy.md).
- See [Rotate the GitHub App key](rotate-the-github-app-key.md).

### `cairn-audit.config.json`

*Places the audit's config beside the other root files, since it feeds the `check:cairn` gate the CI workflow runs.*

- The audit's config names both compiled admin sheets, so the static audit sees each class that a site's admin route writes. The two sheets are the engine's `node_modules/@glw907/cairn-cms/dist/admin/cairn-admin.css` and the site's `.cairn/admin.css`. :fact[guiavc]
- See [Run cairn-audit on your site](run-cairn-audit-on-your-site.md) for the rest of the config.

### `.gitignore`

*Explains the file that hides paths other entries name, `.dev.vars` and the `.cairn/` directory that holds the compiled admin sheet, and that the setup command renames.*

- The file ignores `.dev.vars` and each `.dev.vars.*` file, and no line re-includes any of them. :fact[nls26c]
- It also ignores the whole root `.cairn/` directory (`/.cairn/`), where the pre-scripts rebuild the compiled `.cairn/admin.css`. :fact[666eg6]
- This root `.cairn/` is separate from the committed `src/content/.cairn/`, which holds the content manifests. :fact[666eg6] :fact[vrue1g]
- In a second paragraph, the rename: the setup command's package stores this file as `gitignore`, because npm's packlist drops a file named `.gitignore`. The setup command renames it after copying and fails with an error when the file is absent. `.gitattributes` ships with its name unchanged. :fact[qfv5iw]

### Other root files

*Closes the root group with the entries that carry no contract.*

- The remaining root entries are a plain project's files, plus a generated types file and the directory that holds the dev server's launcher. :fact[qlgggh]
- The plain files are `README.md`, `.prettierignore`, `.prettierrc`, `tsconfig.json`, and `vitest.config.ts`. :fact[qlgggh]
- `worker-configuration.d.ts` is generated `wrangler types` output, and `src/app.d.ts` references it. :fact[n52h8f]
- The `dev` script runs `scripts/dev.mjs`. :fact[o47i0q]

## Configuration files

*Opens the configuration group, which runs in the order the build reads it: the scripts start the build, Vite runs it, and Wrangler deploys its output.*

- `package.json`, `vite.config.ts`, and `wrangler.jsonc` configure how the site builds and deploys, and `src/app.d.ts` types what they provide. :fact[o47i0q] :fact[n4rg1z] :fact[n52h8f]
- `npm run build` runs `vite build`, and the build produces the Worker that `wrangler.jsonc` names as `main`. :fact[o47i0q]

### `package.json`

*Opens the configuration group with the scripts that start the build, stating each script in the table once.*

- The engine, `@glw907/cairn-cms`, sits in `dependencies`, and Upgrade cairn covers moving its range. :fact[o47i0q]
- See [Upgrade cairn](upgrade-cairn.md).
- The `imports` field declares `#chassis`, `#theme`, and `#lib` as subpath imports rather than config aliases. :fact[n4rg1z]
- It maps `#lib/*` to `./src/lib/*`, which holds one file, `log.ts`, the site's [`createLogger`](../reference/log.md#createlogger) instance typed over the site's log event names. :fact[wnsv5x]
- The following table describes what the scaffold's main scripts run. :fact[o47i0q] :fact[666eg6] :fact[mrv24k] :fact[j7fha2] :fact[690k0p] :fact[n0fg3w]

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

*Covers the file that runs the build the scripts start, whose inline SvelteKit config carries the prerender checks that can fail the build.*

- The scaffold carries no `svelte.config.js`, so the whole SvelteKit config passes inline to `sveltekit()` in this file. That config sets the Cloudflare adapter and a prerender `handleHttpError` that throws on any HTTP error during prerendering. :fact[n4rg1z]
- See [Crawl rules](#crawl-rules) for what the build needs to keep passing.
- The config sets no `csrf` key, so SvelteKit's Origin check runs ahead of each handle, `/admin` included, and cairn's double-submit token sits on top of it. :fact[7rehzh]
- SvelteKit 3 removed `csrf.checkOrigin`, and a config that sets it fails validation. :fact[hnvweu]
- See [CSRF protection](security-model.md#csrf-protection).
- The `cairnManifest` plugin verifies the committed content manifest on build. The scaffold's config sets no `define` entry; the plugin's `config` hook defines `__CAIRN_DEV_BUILD__`, which the dev backend gates on. :fact[xluud1]
- The config also lists `@glw907/cairn-cms-dev`, the dev backend's package, in `ssr.noExternal`. Without that entry, `/admin` answers 500 under `vite dev`, because the package ships built JavaScript that imports `cloudflare:workers`, a module Node's loader rejects. :fact[2pv4r5] :fact[dqjkci]

### `wrangler.jsonc`

*Covers the config that deploys the build's output, whose bindings are what the engine reads at run time.*

- The Worker's config declares four bindings and one variable, a bulleted list with one item each, and `AUTH_DB` is its one D1 database. :fact[n7t4bn]
- `ASSETS`, the static-assets binding, on the `assets` block. :fact[n7t4bn]
- `AUTH_DB`, the D1 database that holds the auth store. :fact[n7t4bn]
- `EMAIL`, the Email Sending binding. :fact[n7t4bn]
- `MEDIA_BUCKET`, the R2 bucket. :fact[n7t4bn]
- `PUBLIC_ORIGIN`, a variable. :fact[n7t4bn]
- See [Configure media](configure-media.md) for the media settings behind the bucket.
- The config sets `observability.enabled` to `true`. :fact[l3cxgc]
- [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/) records a Worker's logs with that setting on. :fact[prb2os]
- The config also sets `assets.not_found_handling` to `"none"`, in one sentence that names Themed 404 page as the place that explains why. :fact[2qnqkm]
- See [Themed 404 page](#themed-404-page).

### `src/app.d.ts`

*Closes the configuration group with the file that types what the other three provide: the define `vite.config.ts` sets and the bindings `wrangler.jsonc` declares.*

- This file imports `@glw907/cairn-cms/ambient`, which declares the `__CAIRN_DEV_BUILD__` global. It types `App.PageData` with the optional `nav`, `footerNav`, `siteName`, and `hasIslands` fields that the root layout load returns. :fact[n52h8f]
- It references `@cloudflare/workers-types` and `worker-configuration.d.ts`, whose `Env` types the Worker bindings that `cloudflare:workers` exposes. :fact[n52h8f]
- See [Ambient types](../reference/ambient.md).

## Database migrations

*Follows the configuration with the one migrations directory the auth binding needs.*

- The `migrations/` directory holds the auth store's schema for `AUTH_DB`, and it is the scaffold's one migrations directory. :fact[gepykz] :fact[n7t4bn]
- It carries `0000_auth.sql`, `0001_roles.sql`, `0003_preview.sql`, and `0004_login_nonce.sql`. The opt-in `0002_audit.sql` is absent, because a site applies it when it wires `createD1AuditSink`. :fact[gepykz]
- See [Wire the audit sink](add-a-custom-admin-screen.md#wire-the-audit-sink) for adding it.
- The scaffold ships `0001_roles.sql`, which a site needs once it declares roles beyond the default `owner` and `editor` pair. The migration rebuilds the `editor` table with the engine's four columns alone. :fact[rn62i1]
- Any automated `wrangler d1 migrations apply` runs it, so a site that added columns to that table carries them over to the rebuilt table first. `0003_preview.sql` serves draft-preview links. :fact[rn62i1]
- A database the site adds takes a separate migrations directory, stated as the general rule and never as the example site's directory. `wrangler d1 migrations apply` walks one directory per database, and a directory shared with `migrations/` would apply each schema to both databases. :fact[nv0ok0]

## Routes and the server hook

*Enters `src/` after the configuration, starting with the routes and the server hook that the guard and the dev backend run through.*

- The server hook installs the auth guard over `/admin`, and the routes split into that admin mount, a prerendered public site in the `(site)` group, and endpoints at the root. :fact[f21bcz] :fact[2sd4if] :fact[qtm9y2]
- Code: a plain-text tree of `src/params.ts` and the route directories and root files under `src/routes/`, with `admin/` marked `[engine]`. `admin/` lists `[...path]/`, `+error.svelte`, `+layout.server.ts`, and `+layout.svelte`, and nothing else. :source[/templates/waymark/src/routes] :fact[qtm9y2] :fact[t2t5lx]

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

*Opens the routes group with the file that holds both the guard over `/admin` and the dev backend's content behavior.*

- The hook picks `devBackendHandle` or `createAuthGuard` in one `if` and exports the result as `handle`. :fact[f21bcz]
- The condition checks the build-time `__CAIRN_DEV_BUILD__` define first, then the runtime opt-in `CAIRN_DEV_BACKEND === '1'`. The opt-in reads the Worker env and falls back to `process.env`, because `vite dev` runs the hooks in Node, where the platform proxy's env never carries the shell variable that `npm run dev` sets. :fact[f21bcz]
- Both handles take the composed `runtime` from `#chassis/cairn.server.js`. :fact[f21bcz]
- The guard gates the whole `/admin` subtree before any load runs. Per-route authorization belongs to [`requireAccess`](../reference/sveltekit.md#requireaccess) and [`createSectionAction`](../reference/sveltekit.md#createsectionaction). :fact[2sd4if]
- The [`createAuthGuard`](../reference/sveltekit.md#createauthguard) entry documents the guard's config. :fact[f21bcz]
- The scaffold's adapter declares no `access` member and takes the zero-config `owner` and `editor` roles, and the tree holds no `src/access.ts`. :fact[3z1uxv]
- See [Restrict admin access](restrict-admin-access.md) for declaring an access map.
- In a second paragraph on the dev branch: when the dev backend is on, `devBackendHandle` installs in-memory stand-ins for the GitHub backend, the media bucket, and `AUTH_DB`, and it signs in an `owner` without an email loop. Nothing leaves the machine. :fact[dqjkci]
- The hook passes no `content` option, so the dev admin runs in the default `'repository'` mode and lists the site's entries from its working tree. :fact[zzjrza] :fact[p1v88s]
- Edits land in an in-memory overlay over that tree. Nothing is written to disk, and the overlay lasts until the dev server restarts. :fact[cgt4tk]
- The `'fixtures'` mode seeds an in-memory repository with sample content instead. :fact[p1v88s]

### `src/routes/admin/`

*Follows the hook with the admin mount its guard gates.*

- The admin mount is one catch-all pair, `[...path]/+page.server.ts` and `+page.svelte`, beside the shared layout pair, `+layout.server.ts` and `+layout.svelte`. :fact[t2t5lx]
- The [canonical admin mount](../reference/admin-routes.md#the-route-files-plus-the-composer) reference reproduces both pairs. :fact[t2t5lx]
- The directory also holds `+error.svelte`. It renders an error inside `/admin` within the admin shell. :fact[ty4ehh]
- Each status shows a **Back to the dashboard** link to `/admin`. A 403 and a 404 each show a fixed message, and any other status shows the thrown message, or a fallback line when there is none. A failure in the admin layout's load still falls to the root error page. :fact[ty4ehh]
- See [Add a custom admin screen](add-a-custom-admin-screen.md) for adding a screen under this mount.

### `src/routes/(site)/`

*Covers the prerendered public route group, the other half of the routes split.*

- The entry catch-all `[...path]` and its raw-markdown counterpart `[...path=md]` coexist through [`createPublicRoutes`](../reference/delivery.md#createpublicroutes), and `src/params.ts` defines the `md` matcher. :fact[4cet3p] :fact[qtm9y2]
- That file uses SvelteKit's `defineParams`. The group also holds the `preview/[token]/` route. :fact[qtm9y2]
- The `archive/[page]` route slices its page with the chassis `archive.ts` helper. :fact[4cet3p] :fact[qtm9y2]
- The `styleguide/` route renders the type scale, the component recipes, and each registered markdown component, with a sample for each component that declares a `preview`. :fact[6jxd81] :fact[qtm9y2]
- See [Build the public routes](build-the-public-routes.md) for each route's wiring.

### Endpoints at the root

*Covers the root endpoints after the two route groups, including the two routes that sit outside `/admin`.*

- The root holds the feed, sitemap, and robots endpoints beside two routes that sit outside `/admin`, the media route and `/healthz`. :fact[qtm9y2] :fact[qtvesq] :fact[paotzb]
- The feed and sitemap endpoints are `feed.json/`, `feed.xml/`, and `sitemap.xml/`. :fact[qtm9y2]
- The `robots.txt/` route reads a `posture` option that sets its stance toward AI training crawlers. :fact[4cet3p] :fact[qtm9y2]
- See [Choose an AI posture](choose-an-ai-posture.md).
- The `media/[...path]/` route exports the [`createMediaRoute`](../reference/sveltekit.md#createmediaroute) handler. It validates each request and streams the object from `MEDIA_BUCKET`, adding security headers because the route sits outside `/admin`. :fact[qtvesq]
- The `/healthz` route sits outside the guard. It answers with the payload that [`loadHealth`](../reference/sveltekit.md#loadhealth) returns, as JSON with status 200 when `ok` is true and 503 when it is false. :fact[paotzb]
- A thrown error becomes a 503 with the fixed detail `health check failed`. Each answer carries `cache-control: no-store`, and the route exports `prerender = false`. :fact[paotzb]

### Root layout and error page

*Ends the routes group with the root layout, whose data feeds the root error page that the themed 404 relies on.*

- The root `+layout.server.ts` load returns the menus, the site name, and whether the site registers any island, as `nav`, `footerNav`, `siteName`, and `hasIslands`. :fact[ofex2m]
- It reads them from `site-config.ts` and the island registry, not the full adapter, to keep each request that is not prerendered light. `SiteHeader` and the root `+error.svelte` read those values through `page.data`. :fact[ofex2m]
- The root `+error.svelte` is the themed 404 and error page that Themed 404 page describes. :fact[ofex2m]
- See [Themed 404 page](#themed-404-page).

## Theme, chassis, and content

*Groups the directories the routes read: the theme, the chassis, and the content.*

- The adapter and Waymark's design share `src/theme/`. :fact[qnf469]
- The chassis sits in `src/chassis/`, and the markdown and its committed manifests sit in `src/content/`. :fact[rxj43c] :fact[gj96px] :fact[vrue1g]

### `src/theme/`

*Opens the group with the directory that holds the adapter the engine reads.*

- The adapter, `cairn.config.ts`, is one [`defineAdapter`](../reference/core.md#defineadapter) call over `content`, `backend`, `email`, `media`, `rendering`, and an `editor` group carrying `nav`, `navLayout`, and `preview`. :fact[qnf469]
- The site imports it as `#theme/cairn.config.js`, and the `cairnManifest` `configModule` in `vite.config.ts` names it. :fact[q07rd5]
- In `navLayout`, the `Site` group carries engine screens alone (`vocabulary`, `nav`, `settings`, and `editors`), and the `Content` group carries the `media` entry. :fact[tycp7k]
- See [Define an adapter and schema](define-an-adapter-and-schema.md).
- See [Arrange the admin sidebar](arrange-the-admin-sidebar.md).
- See [Customize the sign-in email](add-cairn-to-a-sveltekit-app.md#customize-the-sign-in-email).
- Besides the adapter, the directory holds the files a bulleted list names, one file or directory per item with what it holds. :fact[qnf469]
- `site-config.ts`: the one [`parseSiteConfig`](../reference/core.md#parsesiteconfig) call site, over `site.config.yaml`. :fact[qnf469]
- `site.config.yaml`: the site name, the description, the primary and footer menus, the tag `vocabulary`, `spellcheck` with its `dialect`, and `tidy`, shipped enabled. :fact[qnf469]
- `markdown-components.ts`: nine [`defineComponent`](../reference/core.md#definecomponent) declarations, one of them hydrated. :fact[qnf469]
- `icons.ts`: the `IconSet` that the components and the icon picker draw from. :fact[qnf469]
- `components/`: `ArticleView.svelte`, `EntryRow.svelte`, `SiteFooter.svelte`, `SiteHeader.svelte`, and `admin-link.ts`. :fact[qnf469]
- `islands/`: `Banner.svelte`, `banner-expiry.ts`, and a `registry.ts` that maps `banner` to `Banner.svelte`. :fact[qnf469]
- `theme.css` and `site.css`: the theme's tokens and page styling. :fact[qnf469] :fact[s23sk0]
- `theme-names.ts`: the daisyUI theme names, which `src/app.html` and `theme.css` repeat. :fact[qnf469] :fact[i3rn6f]
- See [Theme your public site](theme-your-public-site.md) for changing the design.

### `src/chassis/`

*Places the chassis beside the theme and points to where the chassis ends and the theme begins.*

- The chassis is the design-neutral code every scaffolded site shares, copied into `src/chassis/` with Waymark. :fact[rxj43c]
- See [Port your theme onto the chassis](theme-your-public-site.md#port-your-theme-onto-the-chassis) for where the chassis ends and the theme begins.
- The chassis also holds the archive's page size, described in Settings outside the admin. :fact[38pjqy]
- See [Settings outside the admin](#settings-outside-the-admin).

### `src/content/`

*Follows the theme and the chassis with the content directories the adapter names.*

- Content is markdown with YAML frontmatter, one directory per concept, named by the concept's `dir`. :fact[gj96px]
- The scaffold declares `posts`, `pages`, and `fragments`, seeded with 14 sample posts, two pages, and one fragment. :fact[gj96px]
- Because the adapter names each directory, renaming one changes the concept's `dir` in the adapter and the matching `cairnManifest` content glob in `vite.config.ts`. :fact[gj96px]

### `src/content/.cairn/`

*Gives the committed manifests their own entry, since the engine and its build tools write them.*

- This directory holds three committed files, which the engine and its build tools write, one list item each with what writes, patches, or checks it. :fact[vrue1g]
- `index.json`: the content manifest. `cairn-manifest` regenerates it, the `cairnManifest` plugin fails the build when it drifts from the markdown, and each publish commit patches it. :fact[vrue1g]
- `media.json`: the media registry, written by the admin's media upload, metadata, and delete commits. :fact[vrue1g]
- `site-facts.json`: the adapter's media bucket binding, plus its roles and AI posture when the adapter declares them, which `cairn-manifest` writes. The scaffold's file carries the bucket binding alone. :fact[vrue1g] :fact[ve30i2]
- The `cairn:manifest` script runs `cairn-manifest`. :fact[690k0p]
- See [the `cairnManifest` reference](../reference/vite.md#cairnmanifest).
- See [The `site-facts.json` contract](../reference/site-facts.md).

## Style sheets

*Closes the per-file walk with the two style sheets, both compiled from files the earlier sections introduced.*

- The site compiles two separate sets of styles, the admin's from `src/admin.css` and the public site's from `theme.css` and `site.css`. :fact[vs6k2k] :fact[666eg6] :fact[s23sk0]
- `src/admin.css` ends with an import of `@glw907/cairn-cms/admin-sources.css`. That engine file holds the `@source` directives for the engine's shipped admin markup and nothing else. :fact[vs6k2k]
- The pre-scripts compile `src/admin.css` into `.cairn/admin.css`, inside the gitignored root `.cairn/` directory. :fact[666eg6]
- The import does not replace the engine's precompiled `dist` sheet, and the audit config names both sheets, as [`cairn-audit.config.json`](#cairn-auditconfigjson) describes. :fact[vs6k2k] :fact[guiavc]
- In a second paragraph, `theme.css` and `site.css` hold the theme's tokens and page styling. Beneath them sit two lower layers: the engine's `cairn-public.css` roles, which the chassis `tokens.css` imports right after Tailwind, and the chassis's design-scale defaults. :fact[s23sk0]
- See [Re-skin Waymark](theme-your-public-site.md#re-skin-waymark) for how the layers combine.

## Settings outside the admin

*Starts the rules that span several files, once each file they span is introduced, and leads into the crawl rules: the archive route the page size governs is the route the crawl exempts.*

- The archive's page size and the footer menu are set in files, outside the admin. :fact[38pjqy] :fact[2s8u70]
- `ARCHIVE_PAGE_SIZE` in `src/chassis/archive.ts` is the one page-size setting for both the home page and the archive, and the scaffold sets it to 13. :fact[38pjqy]
- Both paginate each post after the newest one, and the home page shows that one as its lead. The page `/archive/2` therefore first exists once more than 14 posts are published. :fact[38pjqy]
- `/admin/nav` edits the primary menu alone. The footer menu is a flat menu that the developer edits by hand in `site.config.yaml`. :fact[2s8u70]

## Crawl rules

*Explains the build-time crawl, after the setting whose route it exempts and before the request-time 404.*

- The prerender crawl fails the build on an unseen route or an HTTP error, and the scaffold keeps its build passing with one route exemption and one link attribute. :fact[2zl3qz] :fact[34rsss]
- `handleUnseenRoutes` exempts one route, `/(site)/archive/[page]`. When each post fits on page one, the crawl finds no page of that route, and without the exemption SvelteKit's unseen-route check would fail the build. Any other unseen prerenderable route still throws. :fact[2zl3qz]
- A link to `/admin` in prerendered public markup carries `rel="external"` so that the crawler never requests it. Each `/admin` route answers a build-time crawl with an error, and `handleHttpError` throws on any HTTP error. :fact[34rsss]
- The header and footer apply the attribute through the shared `isAdminHref` predicate. A new `/admin` link in public markup needs the same attribute. :fact[34rsss]
- See [SvelteKit's Vite plugin reference](https://svelte.dev/docs/kit/@sveltejs-kit-vite) for the prerender options.

## Themed 404 page

*Explains the request-time 404, a rule that spans files because it rests on two files from different sections.*

- A scaffolded site serves a themed 404 page when two settings are both in place: the root `src/routes/+error.svelte` and `assets.not_found_handling` set to `"none"` in `wrangler.jsonc`. :fact[2qnqkm]
- The prerendered `(site)` group's catch-all is stripped from the runtime manifest, so that group's layout never runs for an unmatched path. The root `+error.svelte` therefore rebuilds the site chrome itself. :fact[2qnqkm]
- It reads the menus and the site name through `page.data` from the root `+layout.server.ts`. :fact[ofex2m]
- On the Worker's side, `"none"` passes an unmatched request to the Worker. The `"404-page"` setting would instead serve an unthemed static file from the edge without running the Worker. :fact[2qnqkm]
- See [Cloudflare's Worker script routing page](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/), which documents the setting.

## Setup state outside the tree

*Closes the body with what lives outside the repository, ending on the build token the Workers Builds step registered at Cloudflare.*

- The setup command left its record of the run on the machine that ran it and, when the run connected Workers Builds, a build token at Cloudflare. :fact[3m0oxs] :fact[3bbeia] :fact[qca0t0]
- The record sits at `~/.config/cairn/sites/<id>.json`, never under the project directory. Its directory has mode 0700 and the file has mode 0600. :fact[3m0oxs]
- Two setup steps use a Cloudflare API token, and each asks for its own token rather than reusing the other's. Each step keeps its pasted token in the record until the step ends, whether it completes or the developer declines it, and then deletes the token. :fact[3m0oxs]
- Each step also deletes its token when the token is invalid or lacks a permission it needs, and the Workers Builds step deletes its token when a `--yes` run stops because it cannot open a browser. A `--yes` run reads the token from `CAIRN_CF_API_TOKEN` and refuses a token-shaped value on the command line. :fact[3m0oxs]
- A resumed run reads the record, and `--sign-in` needs it. :fact[3my5c1] :fact[o8uoci]
- A developer who took over the site from someone else has no copy of that record, which sits in the home directory of whoever ran the command. That developer can neither resume the run nor use `--sign-in`. :fact[3m0oxs] :fact[3my5c1] :fact[o8uoci]
- On a resumed run, `--org`, `--repo-name`, `--app-name`, and `--owner-email` override a saved answer for any step that has not yet run. :fact[3my5c1]
- The `--brand-color` flag accepts a `#`-prefixed hex color, an `oklch(...)` string, or a bare number read as a hue in degrees, and any other shape fails. :fact[498l97]
- The setup run's Workers Builds step either connects the repository or records a decline. The `--connect` flag re-enters that step for a site at or past its first deploy. :fact[qca0t0]
- In the body's last paragraph: when the Workers Builds step connects the repository, it registers the pasted token as the build token named `cairn create-cairn-site build token` and binds the site's build trigger to it. If a build token for the same Cloudflare token already exists, the step reuses it. :fact[3bbeia]

## Related resources

*Closes the page, as the concept anatomy requires, with the guides that change or rebuild parts of the tree, the pages that explain the engine, and the platform documentation.*

- The following guides cover changing or rebuilding parts of the tree.
- See [Add cairn to a SvelteKit app](add-cairn-to-a-sveltekit-app.md).
- See [Theme your public site](theme-your-public-site.md).
- See [Add a custom admin screen](add-a-custom-admin-screen.md).
- See [Define an adapter and schema](define-an-adapter-and-schema.md).
- See [Upgrade cairn](upgrade-cairn.md).
- The following pages explain the engine these files wire in.
- See [Architecture](architecture.md).
- See [Security model](security-model.md).
- See [Content model](content-model.md).
- The following external pages document the platforms the files configure.
- See [SvelteKit project structure](https://svelte.dev/docs/kit/project-structure).
- See [SvelteKit Vite plugin](https://svelte.dev/docs/kit/@sveltejs-kit-vite).
- See [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/).
- See [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/).
- See [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/).
