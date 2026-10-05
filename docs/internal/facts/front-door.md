# Facts: front door and orientation

Harvested 2026-09-15 from docs/why-cairn.md, README.md, docs/README.md, and CLAUDE.md.
Agent-facing; never shipped; not register-graded. Every fact carries a source.

## docs/why-cairn.md
- `f:wvediq` cairn is a lean, opinionated CMS that makes a non-technical author productive editing raw markdown on a SvelteKit + Cloudflare site, and it is also a starting framework and an admin skeleton, a developer's base for appending their own functionality. Key phrase: "lean, opinionated CMS". Source: `docs/internal/what-cairn-is-and-is-not.md:11-14`. [verified]
- `f:0ij7do` With the zero-config default, an editor signs in from an emailed link, no GitHub account, no
  password. Source: `src/lib/auth-channel/`, `src/lib/env.ts` (AUTH_DB binding backs the magic-link
  session store); CLAUDE.md, "magic-link". [verified]
- `f:8289h7` Behind Cloudflare Access, or any reverse proxy that authenticates the request before it reaches the Worker, an editor signs in through the site's own identity gate instead of magic-link: a site sets the guard's `identity` resolver, which replaces session-cookie resolution. Source: `src/lib/sveltekit/guard.ts:64-68`, "Replace magic-link session resolution with the site's own identity gate (Cloudflare Access". [verified]
- `f:dl1trb` The live preview renders through the exact function the public site uses. Source:
  `examples/showcase/src/chassis/public-routes.ts:14`, `render: cairn.rendering.render`;
  `examples/showcase/src/routes/admin/[...path]/+page.svelte:26`, `render={cairn.rendering.render}`,
  the identical binding threaded to both routes. [verified]
- `f:qehbx3` A save holds on a per-entry branch; a deliberate publish copies it to the main branch with the
  editor as commit author. Source: `src/lib/github/types.ts:20`, "A commit author: the signed-in
  editor (spec §7.4).", `src/lib/github/repo.ts:260-263` (no committer is set). [verified]
- `f:kldwss` `create-cairn-site` creates the GitHub App, the repository, the Cloudflare bindings, and deploys,
  in one run. Source: `packages/create-cairn-site/` (chapter2.mjs GitHub App and Cloudflare
  provisioning flow, referenced in docs/internal/record/2026-08-14-pass-d-task-13-production-gate.md).
  [verified]
- `f:9xthnq` The admin is also a toolkit: a developer's own route under `/admin` renders as a child of `CairnAdminShell` like the engine's own screens, can adopt the packaged admin-toolkit components, and sits behind the same `/admin` sign-in guard, since every `/admin` path except the login page and the auth endpoints is gated. Source: `examples/showcase/src/routes/admin/+layout.svelte:3-5`, "every /admin/** route renders inside CairnAdminShell"; `examples/showcase/src/routes/admin/signups/+page.svelte:1-4`, "a developer's own route rendered in CairnAdminShell"; `src/lib/sveltekit/guard.ts:24`, "everything else under /admin is gated". [verified]
- `f:i74t7g` A cairn site is built to run on Cloudflare Workers: the engine's environment contract is Cloudflare Worker bindings (the `AUTH_DB` D1 database, the Email Sending binding), so a production site built on cairn is hosted on Cloudflare. Source: `src/lib/env.ts:5,17-33`, the `CairnEnv` interface and its `D1Database` import from `@cloudflare/workers-types`. [verified: the code fixes Cloudflare as the runtime platform; where a given site is deployed is the operator's fact and is not separately confirmed]
- `f:hk24xs` cairn has no host abstraction layer: the engine's environment contract is typed to Cloudflare bindings, so swapping Cloudflare for another host is not a seam. The one swappable seam is the content store: a developer can implement `BackendProvider` against a store other than GitHub, and `createGithubApp` is the only implementation cairn ships. Source: `src/lib/env.ts:5,19`, `AUTH_DB?: D1Database`; `src/lib/github/backend.ts:78,88,162` (`BackendProvider`, `createGithubApp` the sole factory). [verified]
- `f:h0xykj` cairn is pre-1.0 (package version `0.97.0`) and its Extension API tier has broken across minors: the nav fields on `AdminShellData` and `navFilter`'s types changed at `0.86.0`, the version `navLayout` shipped, and `navLayout`'s own types were renamed at `0.94.0` (`AdminNavEntry` became `NavLayoutEntry`). Until 1.0 a break is disclosed, through the changelog's `Consumers must:` line and the migration notes, the per-version record, and never prevented. Key phrase: "two Extension-tier breaks have shipped inside 0.x minors". Source: `docs/internal/what-cairn-is-and-is-not.md:77-79`; `docs/extend/migration-notes.md:559-569,516-521`; `docs/reference/core.md:1130-1131`, `NavLayout` and `NavLayoutEntry` marked Extension API; `package.json:3`. [verified]
- `f:zzc2m5` The zero-config identity model has exactly two roles: owner and editor. Key phrase:
  "only ever knows owner/editor". Source: `docs/internal/what-cairn-is-and-is-not.md:34,69`, "A
  small default identity, owner/editor, on magic-link" and "it only ever knows owner/editor."
  [verified]
- `f:99f221` cairn is a CMS and an admin toolkit, not a platform; it manages markdown content and
  the admin frame and stops there deliberately. Key phrase: "not a platform". Source:
  `docs/internal/what-cairn-is-and-is-not.md:11-14,56`, "a starting framework and an admin skeleton,
  not a platform" and "cairn owns its core job, managing markdown content and the editor/admin
  frame, and little else." [verified]
- `f:zpjl8k` `create-cairn-site` still requires a GitHub account, a Cloudflare account, and a paid Cloudflare plan from the first deploy. Source: `packages/create-cairn-site/src/github/oauth.mjs:67`, `authorizeUrl` building GitHub's OAuth authorize step; `packages/create-cairn-site/src/cloudflare/account.mjs:47`, resolving the Cloudflare account id every chapter-1 call needs; `packages/create-cairn-site/src/cloudflare/catalogue.mjs:543-544`, the setup command's own declined-plan message: "a cairn site needs that plan from its first deploy" (the Workers Paid plan). [verified]
- `f:oyiv3h` Every publish is a git commit, so content lives in a repository the organization needs a GitHub
  account to reach, even though editors never see it directly. Source:
  `src/lib/github/repo.ts:262`, commit-per-publish mechanics. [verified]
- `f:mpy6za` cairn treats GitHub as a hard dependency with no layer abstracting it, the same as SvelteKit and Cloudflare. Source: `src/lib/github/backend.ts:78,162`, `BackendProvider` and `createGithubApp`. [rejected: GitHub sits behind the `BackendProvider` seam, so a developer can implement another content store; only the Cloudflare host and SvelteKit have no such layer, and `createGithubApp` is the only implementation shipped]
- `f:djoxr9` cairn commits fully to SvelteKit and Cloudflare: the stack is a hard dependency with no framework- or host-agnostic layer, content is markdown in git, and publishing goes through a GitHub App. Key phrase: "A hard dependency on the stack is the point." Source: `docs/internal/what-cairn-is-and-is-not.md:11-12,18-20,22`. [verified]
- `f:7iwb7f` The zero-config posture is tuned for a small editorial team, one to a handful of editors who share context and not a large or anonymous contributor pool; it is a floor, not a ceiling, since the auth and authorization seams let a developer scale past it. Key phrase: "Tuned for a small editorial team, by default." Source: `docs/internal/what-cairn-is-and-is-not.md:36-41`. [verified]
- `f:u77pea` Under the zero-config default cairn itself is the identity system for its editors: its own D1 store (`AUTH_DB`) holds the editor allowlist, the sessions, and the single-use sign-in tokens, and a site's own identity gate replaces session resolution only when the site configures one. Source: `src/lib/env.ts:18`, "The self-owned magic-link auth store: the allowlist, sessions, and single-use tokens."; `src/lib/sveltekit/guard.ts:66`, "Omitted, the guard resolves the session cookie exactly as today." [verified]
- `f:zxdoaf` Magic-link sign-in with the owner/editor pair is cairn's default identity so that a content site runs with zero config, and auth exists only to gate the admin. Key phrase: "so a content site runs with zero config". Source: `docs/internal/what-cairn-is-and-is-not.md:34-35`, "A small default identity, owner/editor, on magic-link, so a content site runs with zero config." and "Auth exists only to gate the admin."; `src/lib/env.ts:18`, the self-owned magic-link auth store. [verified]
- `f:gw1oas` Cloudflare Access offers Google and Microsoft among its identity providers, so an editor behind Access can sign in with the organization's Google or Microsoft account. Source: https://developers.cloudflare.com/cloudflare-one/identity/idp-integration/. [external: Cloudflare Access]
- `f:dpbswc` In the default admin a signed-in editor writes and publishes entries, manages the media library, and edits the tag vocabulary with no code; declaring a content type (`defineConcept`), adding a custom admin screen (a route under `src/routes/admin`), and changing what a role can do (`defineAccess`, `defineRoles`) are site code. Source: `src/lib/sveltekit/content-routes-entry-write.ts:426`; `src/lib/sveltekit/content-routes-media-library.ts:66`, `requireEditor(event)` on the media load; `src/lib/sveltekit/cairn-admin.ts:260`, the `authedViews` list including `vocabulary`; `src/lib/content/concepts.ts:49`; `src/lib/auth/access.ts:70`; `src/lib/auth/roles.ts:58`; `examples/showcase/src/routes/admin/signups/+page.svelte:1-4`. [verified]
- `f:5jbaej` None of cairn's git plumbing, the per-entry branch, the commit, or the deploy, reaches the editor, who never sees any of it. Source: `src/lib/admin/CairnMediaLibrary.svelte:1087-1097,1206-1210`, `src/lib/admin/media-library-helpers.ts:41-43` (`branchNameOf`). [rejected: the media library's usage panel and its delete dialog list an image's unpublished uses under In an unpublished edit, with the raw per-entry branch name, `cairn/<concept>/<id>`, beneath each entry title; an editor still needs no GitHub account and never works in the repository directly]
- `f:0on5qx` Decap CMS's GitHub backend has each editor log in with their own GitHub account, needs every editor to have push access to the content repository, and runs that login through an OAuth app and an authentication server the site must host or rent, since GitHub requires a server for authentication. Source: https://decapcms.org/docs/github-backend/. [external: Decap CMS]
- `f:8p1cjx` Cloudflare hosts a small cairn site on a free tier that stays free at the site's real traffic. Source: `packages/create-cairn-site/src/cloudflare/catalogue.mjs:529-538`. [rejected: the setup command requires the Workers Paid plan from a site's first deploy, and its declined-plan message says a cairn site needs that plan from its first deploy, so no cairn site runs on the free Workers plan]
- `f:tf4vfb` SvelteKit server-renders each page by default before hydrating it in the browser, a page can opt out with `ssr = false`, and it generates `./$types` for route files so load functions and handlers are typed without hand-written annotations. Source: https://svelte.dev/docs/kit/page-options, https://svelte.dev/docs/kit/types. [external: SvelteKit]
- `f:hcydfe` An entry's history, attribution, and rollback come from git: the history screen reads the default branch's commit log for the entry's file and names each commit's author as the publisher, and Revert opens a new draft from one of those listed commits. Source: `src/lib/sveltekit/content-routes-entry-read.ts:511-538` (`listCommits`, `commitEditorName`), `src/lib/sveltekit/content-routes-entry-revert.ts:82-104`, `src/lib/github/types.ts:20`. [verified]
- `f:u6cp78` The setup command narrates as it goes: the scaffold, the GitHub chapter, and each Cloudflare chapter run every side effect as an action whose one-line title prints as it runs, and `--dry-run` prints each action's title and exact effect without running any. Source: `packages/create-cairn-site/src/runner.mjs:7-12` (`title`, `detail`), `packages/create-cairn-site/src/runner.mjs:45-63` (`runActions`), `packages/create-cairn-site/src/args.mjs:10` (`dry-run`). [verified]

## README.md
- `f:4zpvor` cairn is an embedded, magic-link, GitHub-committing CMS for SvelteKit sites on Cloudflare.
  Source: `package.json:2-3` (`@glw907/cairn-cms`, framework/platform deps); CLAUDE.md line 1,
  same description verbatim. [verified]
- `f:kn5rze` Content is a fixed set of concepts the site declares via `defineConcept`, Posts and
  Pages available out of the box, with no open-ended collection model. Key phrase: "never an
  open-ended collection model". Source: `docs/internal/what-cairn-is-and-is-not.md:22-23`, "in one
  fixed concept shape (`defineConcept`); the set is the site's to declare, with Posts and Pages out
  of the box, and never an open-ended collection model." [verified]
- `f:k6aopn` The admin is built in DaisyUI and Tailwind, the idiom a developer's own screens extend
  it in. Key phrase: "built with DaisyUI + Tailwind". Source:
  `docs/internal/what-cairn-is-and-is-not.md:42-43`, "An admin skeleton a developer extends, built
  with DaisyUI + Tailwind (the idiom custom admin screens follow". [verified]
- `f:u705t5` `create-cairn-site` scaffolds a complete starter called Waymark; a second template, Topo, is planned but not shipped. Source: `packages/create-cairn-site/package.json:4`, "scaffold a branded Waymark starter"; `packages/create-cairn-site/src/prompts.mjs:15`, `DEFAULTS = { name: 'Waymark', ... }`; no `Topo` package or directory found under `packages/` or `examples/` (`find . -iname "*topo*"` matched only spec and record docs under `docs/`). [verified: Waymark and the absence of any Topo template trace to the tree; "planned" rests on the specs and ROADMAP.md, not code]
- `f:4sxnxp` cairn is pre-1.0 and runs in production on two sites today, ecxc.ski and 907.life. Source:
  CLAUDE.md credentials section, "a single installation on glw907 covering ecxc-ski and 907-life."
  [candidate: excluded, the pre-1.0 half traces to `package.json:3` but "runs in production on
  ecxc.ski and 907.life today" is an operational deployment claim this repo's code cannot confirm]
- `f:3utth1` The published version, unpublished window, and next action live in `docs/STATUS.md`. Source:
  `docs/STATUS.md:8`, "Published: **`0.97.0`**..."; `docs/STATUS.md:19`, "## Immediate next
  action". [verified]

## docs/README.md
- `f:zmih7p` cairn publishes through a GitHub App. Source: `src/lib/github/repo.ts:262` (App-attributed
  commits); CLAUDE.md credentials, GITHUB_APP_ID `3847496`. [verified]
- `f:k439hm` The reference docs are one page per package subpath plus the CLI commands, gated by
  `check:reference`. Source: `package.json:39`, `"check:reference": "npm run package && node
  scripts/checks/reference-coverage.mjs"`. [verified]
- `f:vrt55t` `check:package` checks the package entry points (publint, attw, package-file and skill-budget
  checks). Source: `package.json:37`. [verified]
- `f:yvfzr2` The setup command is invoked as `npx create-cairn-site`: the package is named `create-cairn-site` and exposes a bin of the same name. Source: `packages/create-cairn-site/package.json:2,8`. [verified]
- `f:am80o6` `docs/internal/` holds cairn's maintainer-facing planning and design records, none of them part of the adopter docs, and the npm package's `files` list ships the doc arms, `docs/README.md`, and `docs/why-cairn.md`, never `docs/internal/`. Source: `docs/internal/README.md:1-4`, `package.json:194-207`. [verified]

## CLAUDE.md
- `f:psrfdx` A publish commit is authored by the editor and sets no committer, so GitHub records the App's bot identity as the committer: `<app name>[bot]`, which is `cairn-cms[bot]` for an App named cairn-cms. The scaffold names a site's App `cairn-<site slug>` by default, and that name is the App's, not a commit field the engine sets. Source: `src/lib/github/types.ts:20`, `src/lib/github/repo.ts:260-263`, `packages/create-cairn-site/src/github/chapter.mjs:161`. [verified: the engine omits the committer; observed on `glw907/907-life` commit `18644a55` (2026-05-30, an "Update posts" publish): author Geoff Wright, committer `cairn-cms[bot]`]
- `f:9093mg` The GitHub App id is `3847496`; a single installation, id `135372268`, covers both ecxc-ski and
  907-life. Source: CLAUDE.md, "Credentials" section. [verified: values live in
  `~/.dotfiles/secrets/values.age` and `~/.local/secrets`, outside this repo, not independently
  checkable from inside the repo]
- `f:8l1ii4` Two D1 auth databases back magic-link sessions, one per site: `cairn-ecxc-auth`
  (`a47c56d2-25ef-4131-a505-8c9fd5a92f1f`) and `cairn-907-auth`
  (`93aa929d-0228-4f8b-8d1e-5e7e0d755617`), each bound as `AUTH_DB`. Source: `src/lib/env.ts:19`,
  `AUTH_DB?: D1Database`; CLAUDE.md credentials section for the concrete database ids. [verified]
- `f:mgimvs` Two Cloudflare Email error vocabularies never cross: the `env.EMAIL.send` binding throws
  `E_SENDER_NOT_VERIFIED` (also used by Email Routing for an unverified destination); the REST
  send (`POST /accounts/{id}/email/sending/send`) throws no `E_` codes, instead `10203`
  (`email.sending.error.email.sending_disabled`) and `10204`
  (`email.sending.error.email.sender_not_configured`), both HTTP 403, and elapsed time since
  onboarding is the only discriminator between "never onboarded" and "still propagating". Source:
  `src/lib/email.ts:80-102`; `src/lib/diagnostics/conditions.ts:65`;
  `docs/internal/record/2026-08-11-t4b-email-spike.md:33,44,147-148,214,275,281`. [verified]
- `f:2rzcvv` `npm run link:consumer -- <site-dir>` builds, packs, installs, and content-hashes every installed
  file against the pack, because `npm pack` reuses the tarball filename across versions and a plain
  `npm install` can silently serve a stale cached build; `--restore` un-pins the site back to
  `^<version>` from the registry. Source: `package.json:85`, `"link:consumer": "node
  scripts/lab/link-consumer.mjs"`; CLAUDE.md, "Pointing a consumer at unreleased engine work".
  [verified]
- `f:h6ca98` In a feature worktree, `examples/showcase/node_modules` symlinks back to the main checkout, so
  the showcase's e2e suite silently proves main's engine build rather than the worktree's, unless
  the worktree's showcase gets a from-scratch `npm install`; the stale-`dist` half of this trap is
  closed structurally by the showcase's `pretest:e2e` repackage hook. Source:
  `examples/showcase/package.json:13`, `"pretest:e2e": "npm --prefix ../.. run package"`.
  [verified]
- `f:mf00hq` Visual e2e baselines are CI-canonical, regenerated by `e2e.yml`'s `update_snapshots` job; this workstation's local Chromium renders a few surfaces a few pixels differently than the CI runner's, so a local gate is green only when its visual failures are exactly the files the latest regen commit rewrote. Source: `.github/workflows/e2e.yml:11`, the `update_snapshots` workflow_dispatch input; `.github/workflows/e2e.yml:121-130`, "baselines are CI-canonical and a workstation render is never an acceptable substitute" and the `--update-snapshots` regen run; `docs/internal/durable-gotchas.md:44` (chassis-B2 example: 20 files from commit `4de378ec`). [verified: the CI-canonical regen traces to e2e.yml; the workstation's pixel difference and the local-green rule are an operational observation recorded in durable-gotchas.md, not code]
- `f:t4aj07` Vite 8 / Rolldown parses shipped `.svelte` `<script lang="ts">` as plain JavaScript before the
  consumer's Svelte plugin runs, so the post-package step `transpile-dist-svelte.mjs` transpiles
  each dist `<script>` body while KEEPING the `lang="ts"` attribute, because the markup still
  carries TypeScript the Svelte compiler must parse. Source: `package.json:36`, `"package":
  "svelte-package && node scripts/build/build-admin-css.mjs && node
  scripts/build/transpile-dist-svelte.mjs && chmod +x ..."`. [verified]
- `f:eywrq8` The engine emits a JSON structured-log record for every operationally meaningful event through
  one internal chokepoint at `src/lib/log/`, with event names forming a stable, public-observable
  vocabulary (`area[.subject].verb_phrase`) documented in `docs/reference/log-events.md`; the
  logger module itself is exported from no package subpath, so its API can change freely while the
  event names cannot. Source: `src/lib/log/events.ts:1-16` (module comment: "renaming one is a
  breaking change... See docs/reference/log-events.md, kept in step with this union.");
  `src/lib/log/` contains `emit.ts`, `events.ts`, `index.ts`. [verified]
- `f:w379wu` Every publish is a commit with the editor as author and no committer set, so GitHub attributes
  the commit to the App. Source: `src/lib/github/types.ts:20`, `src/lib/github/repo.ts:260-263`. [verified]
- `f:ab9kzr` The current published version is `0.97.0`. Source: `package.json:3`. [verified]
- `f:0xsi67` `check:surface` runs a public-surface snapshot gate (`check-surface.mjs`) plus a leak check
  (`check-surface-leaks.mjs`). Source: `package.json:41`. [verified]
- `f:usjir5` `check:version` is a standalone gate script. Source: `package.json:54`. [verified]

## docs/internal/what-cairn-is-and-is-not.md (owner brief, source for stance claims)
- `f:bhyvqg` The governing boundary: cairn owns markdown content management and the editor/admin
  frame and little else; everything a site needs beyond that (functionality, actors, auth, data,
  domain logic) belongs to the developer, served through a thin seam, not a built-in feature. Key
  phrase: "thin seam, not a built-in feature". Source:
  `docs/internal/what-cairn-is-and-is-not.md:56-58`, the boundary stated in bold under "## The one
  boundary that governs everything". [verified]
- `f:y3ljm0` cairn's defaults (owner/editor roles, magic-link) are floors, not ceilings: a developer
  can replace admin auth with their own framework, and cairn then mints no session and reads an
  owner/editor identity through a defined hand-off. Key phrase: "floors, not ceilings". Source:
  `docs/internal/what-cairn-is-and-is-not.md:62-64`, "The defaults are floors, not ceilings." and
  "cairn then mints no session and reads an owner/editor identity through a defined hand-off".
  [verified]
- `f:nguseg` cairn never names or models a domain actor beyond owner/editor; a site's own domain
  (members, customers, assets, dues, a directory) is the developer's to build. Key phrase: "A site's
  domain is the site's". Source: `docs/internal/what-cairn-is-and-is-not.md:67-69`, "A site's domain
  is the site's." and "cairn never names or models a domain actor". [verified]
- `f:gknz29` The seams form a narrow, versioned public surface across kind-based export subpaths, held by a
  public-surface snapshot gate plus gated Extension-API/Scaffold-API stability tiers; until 1.0 the
  gate detects and discloses a break rather than preventing one. Key phrase: "every break is disclosed". Source: same file, "The contract
  is stable, and every break is disclosed," cross-referenced with `check:surface`
  (`package.json:41`). [verified]
- `f:k27p36` The Go `cairn` tool is a separate operator cockpit over every cairn site a machine
  knows; it replicates admin operations as a second front over the same contracts and never adds to
  the engine's public surface or models a domain actor. Key phrase: "operator's cockpit". Source:
  `docs/internal/what-cairn-is-and-is-not.md:83-90`, "The `cairn` tool is the operator's cockpit,
  not engine surface", "a second front over the same contracts", and "never adds to the engine's
  public surface or models a domain actor". [verified]
- `f:8n6qc8` cairn's public output stays design-agnostic: the admin is built with DaisyUI and
  Tailwind, while each site brings its own `render` for its public pages, the adapter's required
  `rendering.render` member. Key phrase: "Public output stays design-agnostic". Source:
  `docs/internal/what-cairn-is-and-is-not.md:42-44`, "Public output stays design-agnostic, each
  site brings its own `render`.", cross-referenced with `src/lib/content/types.ts#CairnAdapter`.
  [verified]
- `f:xh2mwb` `cairn-audit` ships whole as a consumer product: 35 of the 38 registered rules (18 static, 17 rendered) audit the `/admin` surface, which is itself cairn's own admin toolkit, so design-conformance auditing is the product being shipped, not engine-internal apparatus. The other three, `public-literals`, `theme-conformance`, and `theme-contrast`, audit a site's public files under the public scope and run at advisory tier on a consumer. Key phrase: "ships whole, as consumer product". Source: `docs/internal/what-cairn-is-and-is-not.md:45-55`, "`cairn-audit` ships whole, as consumer product," citing `docs/reference/cairn-audit.md`, and `src/lib/audit/rules/static/index.ts#staticRules`, `src/lib/audit/rules/rendered/index.ts#renderedRules`. [verified]

## Harvest record
Decisions/opinions found, not harvested as facts:
- "None of these choices is reversible piece by piece" (docs/why-cairn.md:49) is a design stance,
  covered instead by the concrete no-second-`BackendProvider` fact above.
- "cairn is built for a small, coordinated editorial team, not a large or anonymous one"
  (docs/why-cairn.md:63) restates the owner-brief "Tuned for a small editorial team, by default"
  line already captured under what-cairn-is-and-is-not.md; kept once there.
- "Getting a git-backed CMS running by hand means wiring an OAuth flow... yourself" (docs/why-cairn.md:28)
  is comparative framing, not a checkable fact about cairn.
- README's "The premise is that the people who write an organization's content are often the same
  people who know what the organization needs next" is a design rationale, not a fact.

Pitch-shaped sentences on the front door that carry no independently checkable fact (5, all from
docs/why-cairn.md, the page most exposed to an evaluator):
1. "cairn's tool does that work so the setup a non-developer runs is a handful of questions, not a
   checklist of accounts to configure correctly." (docs/why-cairn.md:29-30)
2. "None of that plumbing reaches the editor." (docs/why-cairn.md:24)
3. "SvelteKit is the framework a fixed CMS could commit to and get real leverage from." (docs/why-cairn.md:42)
4. "GitHub is where a small organization's content already belongs even when nobody there has used
   git before." (docs/why-cairn.md:44-45)
5. "The writing does the persuading by being excellent, never by selling." (docs/internal/docs-register.md,
   the keystone itself, quoted here only as the standard this page is measured against, not as a
   front-door sentence.)

## Provenance

Harvested 2026-09-15 from docs/why-cairn.md, README.md, docs/README.md, and CLAUDE.md. No
separate tightening pass ran on this arm.
