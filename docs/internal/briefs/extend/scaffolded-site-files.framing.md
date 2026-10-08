# Framing record: Scaffolded site files

Agent-facing; drives the introduction of `docs/extend/scaffolded-site-files.md` only; the body follows the page plan.

Written 2026-10-07 by the framing step of the docs page chain (stage 2a), against
`docs/internal/briefs/extend/scaffolded-site-files.plan.md` as committed in the worktree. No earlier
framing record existed.

## Who arrives, from where, and why

| Reader | Arrives from | Came for | Knows | Lacks |
| --- | --- | --- | --- | --- |
| A. The inheritor (the job's reader): a Svelte-fluent developer who took over a site someone else scaffolded | `docs/extend/architecture.md` paragraph 3 ("maps each file the command writes") and its related resources; the extend index's Start group once the page is listed; a search for a file the tree holds (`cairn-audit.config.json`, `migrations-app`, `.dev.vars.example`, `check.yml`) | What each file does, whether it may change it, and what the engine or a gate depends on | SvelteKit, Vite, enough Wrangler to read `wrangler.jsonc`; that the site is live and editors may already publish to it (`f:kldwss`, `f:cjonmm`) | The setup run's history: the saved record sits in the home directory of whoever ran the command (`f:3m0oxs`), and a Workers Builds connection deploys on a token that person pasted (`f:3bbeia`, `f:qca0t0`); which files carry a contract; that no engine release rewrites the tree (`f:rxj43c`, `f:jtl15v`); what `.claude/` is for (`f:0ygumq`) |
| B. The runner: a developer who ran `create-cairn-site` and now opens the tree to change it | `docs/extend/add-cairn-to-a-sveltekit-app.md` paragraph 2 ("explains what it writes"); the extend index; a search after the run. The command's hand-over text names `.github/workflows/check.yml`, `.claude/`, and `npx cairn-guidance check` but links no page (`packages/create-cairn-site/src/scaffold.mjs:230-264`, `f:kouawx`), so the output itself is not an arrival path (friction filed) | Why each file the command wrote is there, starting with the three the hand-over named | Their own answers to the setup prompts; they hold the state file | The file map; which files carry a contract; why the CI's guidance step never fails a build (`f:4ax489`, `f:jd54ph`) |
| C. The chooser: a developer deciding between the setup command and the by-hand build | `docs/extend/add-cairn-to-a-sveltekit-app.md` paragraph 2, which names this page as the account of what the command writes | A look at what the command would give them before choosing | SvelteKit; little of cairn | A scaffold to look at; the page shows it through the file tree and the ownership statement |
| D. The architecture reader: a developer mapping the engine's import points and seams onto real files | `docs/extend/architecture.md`, the crossLink "A scaffolded reader maps the architecture onto their own files" | Where the adapter, the server hook, the admin mount, and the bindings sit in the tree | The model: one adapter, the seams, the data tiers (`f:j0ut9n`) | File locations; the body's tree and per-file entries answer it |
| E. The theme reader: a developer working on the public design | `docs/extend/theme-your-public-site.md` lines 36 and 510 ("maps every file the setup command writes") | The files around the theme, and which ones outside it they may touch | Theming: tokens, cascade layers, Waymark on the chassis (`f:s23sk0`) | The rest of the tree; theming depth stays on their page, which the out-of-scope list names |
| F. Wrong place, routed: a developer adding cairn to an app they already run, or building without Waymark | A search, or the Start group, where this page sits third | Steps to wire cairn in | Their own app | That the setup command writes only into a missing or empty directory (`f:9slxqf`), and that the npm package carries no template (`f:rxj43c`); they belong on `docs/extend/add-cairn-to-a-sveltekit-app.md`, which the out-of-scope list's first item names |
| G. Wrong place, unroutable for now: a technical non-developer who ran or inherited the setup command's site | A search, since the admin arm (`docs/admin/`) holds no page yet; the register's admin track claims this reader ("inheriting a running site someone else created") | How to run the site without code | The setup command's prompts | A page in their track. The intro's prior-knowledge sentence tells them the page expects SvelteKit; no admin page exists to route them to |
| H. Minor, not addressed by the intro: an engine contributor reading the showcase | `examples/showcase/README.md` line 23, whose pointer relink 125 restores (task 9); old links through the redirect from `docs/extend/what-the-scaffold-wrote.md` | What the scaffold carries out of the showcase | The showcase and its exclude list | Nothing the intro owes them; the tree and The scaffold section answer it |

A coding agent working on a scaffolded site is not a reader: the guidance fragment sends agents to
the reference index only (`templates/waymark/.claude/cairn/CLAUDE.md:79-81`), and the register's
scripter-or-agent profile reads the reference arm.

## Background the page rests on

- **The general model.** A scaffolded site is an ordinary SvelteKit project in its own GitHub
  repository, built into one Cloudflare Worker, with the engine installed as an ordinary npm
  dependency (`f:j0ut9n`, `f:o47i0q`). The same run that wrote the tree created the site's GitHub
  App, its repository, and its Cloudflare bindings, and deployed it (`f:kldwss`), so a new owner
  meets a live site, not a starter to deploy.
- **What the tree is, and why it exists.** The setup command bakes Waymark, cairn's reference
  reading theme, on a chassis of design-neutral plumbing, from the same tree the engine tests
  itself against, with test-only material pruned (`f:n2skkz`, `f:rxj43c`). Waymark is the only
  template shipped (`f:u705t5`). The scaffold exists so a site starts from the engine's own
  reference wiring, already deployed, rather than from a by-hand build (`f:kldwss`, `f:9slxqf`).
- **Why the site owns every file.** The npm package's `files` list carries neither Waymark nor the
  chassis (`f:rxj43c`), so an engine upgrade moves the `@glw907/cairn-cms` range and leaves the
  tree as it is; each change a release needs in the site's code, a new D1 migration included, is
  the site's to make, named by the changelog's `Consumers must:` lines (`f:jtl15v`, `f:h0xykj`).
  The agent guidance under `.claude/` is refreshed only when the site runs
  `npx cairn-guidance install` (`f:0ygumq`). Caution for the drafter: the package does ship the
  engine's `migrations` and the guidance sources (`package.json:204-216`), so no sentence may say
  the package carries none of the tree's files; say what `f:rxj43c` says.
- **Why ownership still has contracts.** Three kinds of reader depend on particular files. The
  engine reads the adapter in `src/theme/cairn.config.ts` (`f:u4cfvv`), the server hook that
  installs the guard (`f:f21bcz`), and the bindings in `wrangler.jsonc` (`f:n7t4bn`). The admin
  commits editors' work into the tree: each publish lands content on the default branch
  (`f:cjonmm`, `f:gj96px`), patches the content manifest, and the media commits write the media
  registry (`f:vrue1g`); `/admin/nav` writes the primary menu in `src/theme/site.config.yaml`
  (`f:2s8u70`), and the nav, settings, and vocabulary saves commit that file (`f:0gihxq`,
  `f:shv6wv`). The CI workflow and the build fail on others: `check.yml` runs the checks
  (`f:guiavc`, `f:mrv24k`), and the prerender handlers in `vite.config.ts` throw on an unseen route
  or an HTTP error (`f:2zl3qz`, `f:34rsss`). These files share directories with files only the site
  reads, such as the adapter beside the theme's style sheets in `src/theme/` (`f:qnf469`).
- **Where SvelteKit fits.** The tree is a SvelteKit project with its config inline in
  `vite.config.ts` and no `svelte.config.js` (`f:n4rg1z`); the admin is a catch-all route pair at
  `/admin` (`f:t2t5lx`), a server hook guards it (`f:f21bcz`), and the public site is a prerendered
  route group (`f:qtm9y2`, `f:2qnqkm`).
- **Where Cloudflare fits.** `wrangler.jsonc` names the Worker the build produces and binds two D1
  databases, the Email Sending binding, and an R2 bucket (`f:o47i0q`, `f:n7t4bn`), with Workers
  Logs on (`f:prb2os`); each D1 database has its own migrations directory (`f:gepykz`,
  `f:nv0ok0`). Workers Builds deploys on every push to the default branch only when the run
  connected it (`f:qca0t0`), on the build token the run registered (`f:3bbeia`). The intro hedges
  any deploy claim accordingly and never says every push deploys.
- **Where GitHub fits.** The repository holds the code and the markdown; the site's GitHub App
  commits each editor's publish to its default branch (`f:cjonmm`); a GitHub Actions workflow runs
  install, `npm run check`, and `npm run check:cairn` on every push and pull request and never
  builds (`f:guiavc`).
- **State outside the tree, and why it matters to a new owner.** The setup command keeps its record
  of the run in `~/.config/cairn/sites/<id>.json` on the machine that ran it (`f:3m0oxs`), which a
  resumed run reads (`f:3my5c1`) and `--sign-in` needs (`f:o8uoci`); an inheritor has no copy. A
  revoked build token breaks deploys with no warning (`f:3bbeia`). This is the inheritor's sharpest
  reason to read the page, and the intro names it.

Nothing is left out on purpose: the page touches all three platforms, and the intro places each in
one clause.

## Place in the doc set

- **Group and neighbors.** The extend track's Start group, third after Architecture and Add cairn to
  a SvelteKit app. `docs/extend/README.md` lists only the first two today; the page joins its group
  when it lands.
- **What links in, and why.** `docs/extend/architecture.md` (intro paragraph 3 and related
  resources) sends the inheritor here for the file map. `docs/extend/add-cairn-to-a-sveltekit-app.md`
  (intro paragraph 2) sends the runner and the chooser here for what the command writes.
  `docs/extend/theme-your-public-site.md` (intro list and related resources) sends the theme reader
  here for the file map behind the theme. `examples/showcase/README.md` (relink 125) and the
  redirect from `docs/extend/what-the-scaffold-wrote.md` bring a contributor or an old link. No
  committed page links an anchor here. No arm index outside extend exists yet (`docs/README.md`,
  `docs/admin/`, and `docs/editors/` hold no page).
- **What links out.** The outline's crossLinks: theme-your-public-site, add-a-custom-admin-screen,
  add-cairn-to-a-sveltekit-app (and its sign-in email section), configure-media,
  run-cairn-audit-on-your-site, define-an-adapter-and-schema, build-the-public-routes, and
  upgrade-cairn. The intro carries six of them through the out-of-scope list and adds one link to
  Architecture.
- **What siblings own, so the intro words the shared ideas fresh.**
  - Architecture owns the model (subpaths, seams, data tiers, stability tiers) and opens "cairn is
    an embedded content management system". Its paragraph 3 already says the setup command
    "creates the GitHub App, the repository, and the Cloudflare bindings and deploys the site in one
    run" and that an inheritor "needs to know which of those files rest on an engine contract".
    This intro does not open on "cairn is", does not repeat that four-item list as a sentence, and
    does not reuse "rest on an engine contract".
  - Add cairn to a SvelteKit app opens "cairn is a markdown CMS embedded in a SvelteKit site" and
    calls the setup command "the much easier route". This intro makes no route comparison beyond
    one clause for the chooser.
  - Theme your public site says the npm package ships neither Waymark nor the chassis, "so no
    engine version governs the site's chrome". This intro states ownership over the whole tree and
    in upgrade terms, never in terms of chrome or design.

## Intro plan

Three paragraphs, then the plan's three bounds in its order. The intro opens on a statement about a
scaffolded site from the reader's situation, never an imperative and never a sentence about the
page. First mention is `create-cairn-site`, then "the setup command" (register, "Names").

1. **The scaffolded site and where the platforms fit.** Open on the subject: a site that
   `create-cairn-site` scaffolded arrives as a complete SvelteKit project in its own GitHub
   repository, already deployed as a Cloudflare Worker, with the engine as one npm dependency
   (`f:kldwss`, `f:o47i0q`, `f:j0ut9n`). One sentence says what the tree is: Waymark, cairn's
   reference reading theme, on the chassis, baked from the same tree the engine tests itself
   against (`f:n2skkz`, `f:rxj43c`); the definition proper waits for The scaffold. Then at most two
   sentences place the platforms: SvelteKit's routes mount the admin and the public site, a server
   hook guards `/admin`, and the config sits inline in `vite.config.ts` (`f:t2t5lx`, `f:f21bcz`,
   `f:n4rg1z`); `wrangler.jsonc` binds the Worker's D1 databases, mail binding, and R2 bucket
   (`f:n7t4bn`); the repository holds the code and the markdown, the site's GitHub App commits
   each editor's publish into it, and a workflow checks every push and pull request (`f:cjonmm`,
   `f:gj96px`, `f:guiavc`).
2. **Ownership and the contracts inside it (why the page matters).** Every file belongs to the
   site: the engine package carries neither Waymark nor the chassis, so an engine upgrade moves
   the dependency and leaves the tree as it is, and any edit a release needs is the site's to make
   (`f:rxj43c`, `f:jtl15v`). Owning a file does not leave it unread. The engine reads some (the
   adapter, the server hook, the bindings: `f:u4cfvv`, `f:f21bcz`, `f:n7t4bn`); the admin commits
   editors' work into others (the content, its manifests, the site config's primary menu:
   `f:cjonmm`, `f:vrue1g`, `f:2s8u70`); the CI workflow and the build's prerender checks can fail on
   a few more (`f:guiavc`, `f:mrv24k`, `f:2zl3qz`, `f:34rsss`). Those files share directories with
   files only the site reads, as the adapter shares `src/theme/` with the theme's style sheets
   (`f:qnf469`), so knowing which is which lets an owner change the rest freely and change the few
   with their contract kept. One idea per sentence; the three kinds of reader may take three
   sentences or one with a complete-sentence lead-in, never a reflexive triad for its own sake.
3. **The readers and their reasons.** A developer who ran the setup command, or who took over a
   site from someone who did, reads on to learn what each file does and whether to change it. One
   who took over also lacks what the command left outside the repository: its saved record on the
   machine that ran it, and, when the run connected Workers Builds, the build token whose
   revocation stops deploys without warning (`f:3m0oxs`, `f:3bbeia`, `f:qca0t0`). A reader who knows
   the engine's import points and seams from Architecture (link `docs/extend/architecture.md`, the
   intro's one link outside the bounds lists) finds where each lands in the tree, and a reader
   working on the theme finds the files around it (no link here; the out-of-scope list carries
   Theme your public site). A developer still choosing between the setup command and the by-hand
   build sees what the command writes; one adding cairn to an app that already exists has no
   choice to make, since the setup command writes only into a missing or empty directory
   (`f:9slxqf`), and the out-of-scope list's first item names the by-hand page.

Then the plan's bounds, unchanged in substance:

- **What the page covers.** The plan's eight-item bulleted list in body order, under a complete
  lead-in that names the subjects and never the page. Keep "the themed 404 page": the numeral is
  the page's name and matches the Themed 404 page heading, which the plan's no-numeral rule (aimed
  at counts) does not reach.
- **Prior knowledge.** The plan's sentence: SvelteKit's project structure (routes, layouts, hooks,
  and prerendering), Vite configuration, and Wrangler configuration for a Worker's bindings and D1
  migrations. It follows paragraph 3, so reader G learns here that the page expects a developer.
- **What the page doesn't cover.** The plan's six-item list under a complete lead-in that never
  names the page, each item subject first and page last.

Cautions for the drafter, each from the background above: never say every push deploys (Workers
Builds is optional, `f:qca0t0`); never say the CI builds the site (`f:guiavc`); never say the
package carries none of the tree's files (it ships `migrations` and the guidance sources); keep
Topo, the shadcn principle lines, and the state file's path for the body.

## Departures from the plan's introduction

- **"Why it matters" narrowed.** The plan says "nothing in the tree says which is which". No fact
  backs that silence, and some files speak to their own role (the guidance fragment's header,
  `templates/waymark/.claude/cairn/CLAUDE.md:1-3`). Paragraph 2 states the backed version instead:
  contract files share directories with files only the site reads (`f:qnf469`).
- **One added link.** Paragraph 3 links `docs/extend/architecture.md` for the reader who wants the
  engine model the files wire in. The plan's introduction links only through its out-of-scope
  list; the addition is the reciprocal of the Architecture-to-this-page crossLink and serves a
  search arrival who lacks the model. Related resources keeps its own Architecture link.
- **Readers widened.** The plan names five readers. This record adds the chooser (C), whom
  `docs/extend/add-cairn-to-a-sveltekit-app.md` sends here, folded into paragraph 3's last
  sentence; the unroutable admin-track reader (G); and the contributor (H), whom the intro does not
  address.
