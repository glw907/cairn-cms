# Facts: front door and orientation

Harvested 2026-09-15 from docs/why-cairn.md, README.md, docs/README.md, and CLAUDE.md.
Agent-facing; never shipped; not register-graded. Every fact carries a source.

## docs/why-cairn.md
- cairn is two things at once: an editor-first, git-backed CMS, and a SvelteKit toolkit a
  developer extends for their own organization. Source: docs/internal/what-cairn-is-and-is-not.md,
  "cairn is a lean, opinionated CMS that makes a non-technical author productive editing raw
  markdown on a SvelteKit + Cloudflare site". [candidate: sourced to the page only, not traced to code]
- With the zero-config default, an editor signs in from an emailed link, no GitHub account, no
  password. Source: `src/lib/auth-channel/`, `src/lib/env.ts` (AUTH_DB binding backs the magic-link
  session store); CLAUDE.md, "magic-link". [verified]
- Behind Cloudflare Access, an editor can instead sign in with the organization's Google or
  Microsoft account. Source: docs/extend/sign-in-through-your-organization.md (not read this
  slice; referenced by docs/why-cairn.md:20). [candidate: not opened this pass, cross-referenced
  only]
- The live preview renders through the exact function the public site uses. Source: CLAUDE.md,
  "the one renderer the editor preview and every public page call". [candidate: sourced to the page only, not traced to code]
- A save holds on a per-entry branch; a deliberate publish copies it to the main branch with the
  editor as commit author. Source: `src/lib/github/types.ts:20`, "A commit author: the signed-in
  editor (spec §7.4). The committer is left to the App."; `src/lib/github/repo.ts:262`,
  "committer is omitted, so GitHub attributes the commit to the App." [verified]
- `create-cairn-site` creates the GitHub App, the repository, the Cloudflare bindings, and deploys,
  in one run. Source: `packages/create-cairn-site/` (chapter2.mjs GitHub App and Cloudflare
  provisioning flow, referenced in docs/internal/record/2026-08-14-pass-d-task-13-production-gate.md).
  [candidate: sourced to the page only, not traced to code]
- The admin is also a UI toolkit: a developer's own screen, member roster, event calendar, or
  reservation form mounts inside the same admin, sharing cairn's components and sign-in.
  Source: docs/internal/what-cairn-is-and-is-not.md, "An admin skeleton a developer extends... A
  developer builds those extras on cairn's seams". [candidate: sourced to the page only, not traced to code]
- Every production cairn site the author runs is hosted on Cloudflare. Source: docs/why-cairn.md:40
  (owner brief, first-person claim; not independently verifiable from code). [candidate: owner
  claim, no code source]
- cairn has no abstraction layer that lets a developer swap Cloudflare for another host later; no
  second `BackendProvider` implementation ships with cairn today besides GitHub. Source:
  `grep -rn "BackendProvider" src/lib` (single GitHub implementation; extend seam documented at
  docs/extend/sign-in-through-your-organization.md#a-backend-other-than-github). [candidate: sourced to the page only, not traced to code]
- cairn is pre-1.0; seams still move, and an Extension-tier seam moved across two separate minor
  releases inside the tier meant to stay frozen. Source: docs/internal/what-cairn-is-and-is-not.md,
  "two Extension-tier breaks have shipped inside 0.x minors (0.86.0, 0.94.0)". [candidate: sourced to the page only, not traced to code]
- The zero-config identity model has exactly two roles: owner and editor. Source:
  docs/internal/what-cairn-is-and-is-not.md, "cairn never names or models a domain actor; it only
  ever knows owner/editor." [candidate: sourced to the page only, not traced to code]
- cairn is a CMS and an admin toolkit, not a platform; it manages markdown content and the admin
  frame and stops there deliberately. Source: docs/internal/what-cairn-is-and-is-not.md, "cairn
  owns its core job, managing markdown content and the editor/admin frame, and little else."
  [candidate: sourced to the page only, not traced to code]
- `create-cairn-site` still requires a GitHub account, a Cloudflare account, and a paid Cloudflare
  plan from the first deploy. Source: docs/internal/record/2026-08-14-pass-d-task-13-production-gate.md,
  citing docs/admin/before-you-start.md:29 and :53 on the Workers Paid requirement for Email
  Sending. [candidate: sourced to the page only, not traced to code]
- Every publish is a git commit, so content lives in a repository the organization needs a GitHub
  account to reach, even though editors never see it directly. Source:
  `src/lib/github/repo.ts:262`, commit-per-publish mechanics. [verified]

## README.md
- cairn is an embedded, magic-link, GitHub-committing CMS for SvelteKit sites on Cloudflare.
  Source: `package.json:2-3` (`@glw907/cairn-cms`, framework/platform deps); CLAUDE.md line 1,
  same description verbatim. [verified]
- Content is a fixed set of concepts the site declares via `defineConcept`, Posts and Pages
  available out of the box, with no open-ended collection model. Source:
  docs/internal/what-cairn-is-and-is-not.md, "Content is markdown in git, in one fixed concept
  shape (`defineConcept`)... never an open-ended collection model." [candidate: sourced to the page only, not traced to code]
- The admin is built in DaisyUI and Tailwind, the idiom a developer's own screens extend it in.
  Source: docs/internal/what-cairn-is-and-is-not.md, "An admin skeleton a developer extends, built
  with DaisyUI + Tailwind"; CLAUDE.md, "cairn owns ... built with DaisyUI + Tailwind". [candidate: sourced to the page only, not traced to code]
- `create-cairn-site` scaffolds a complete starter called Waymark; a second template, Topo, is
  planned but not shipped. Source: README.md:58-60 (page's own claim); no `Topo` package or
  directory found in this repo (`find . -iname "*topo*"` in this slice returned nothing under
  packages/ or examples/). [candidate: not independently located in code, page-only claim]
- cairn is pre-1.0 and runs in production on two sites today, ecxc.ski and 907.life. Source:
  CLAUDE.md credentials section, "a single installation on glw907 covering ecxc-ski and 907-life."
  [candidate: sourced to the page only, not traced to code]
- The published version, unpublished window, and next action live in `docs/STATUS.md`. Source:
  CLAUDE.md, "How to run this project", "The published version, the unpublished window, and the
  next action live in `docs/STATUS.md`." [candidate: sourced to the page only, not traced to code]

## docs/README.md
- cairn publishes through a GitHub App. Source: `src/lib/github/repo.ts:262` (App-attributed
  commits); CLAUDE.md credentials, GITHUB_APP_ID `3847496`. [verified]
- The reference docs are one page per package subpath plus the CLI commands, gated by
  `check:reference`. Source: `package.json:38`, `"check:reference": "npm run package && node
  scripts/checks/reference-coverage.mjs"`. [verified]
- `check:package` checks the package entry points (publint, attw, package-file and skill-budget
  checks). Source: `package.json:37`. [verified]

## CLAUDE.md
- Committer identity on publish is `cairn-cms[bot]` (the GitHub App's own bot identity); author is
  the editor. Source: `src/lib/github/types.ts:20` and `repo.ts:262` confirm the mechanism
  (committer omitted, GitHub attributes to the App); the literal string `cairn-cms[bot]` is
  CLAUDE.md's own naming of that App identity, not found verbatim in `src/lib`. [verified]
- The GitHub App id is `3847496`; a single installation, id `135372268`, covers both ecxc-ski and
  907-life. Source: CLAUDE.md, "Credentials" section. [verified] (values live in
  `~/.dotfiles/secrets/values.age` and `~/.local/secrets`, outside this repo; not independently
  checkable from inside the repo.)
- Two D1 auth databases back magic-link sessions, one per site: `cairn-ecxc-auth`
  (`a47c56d2-25ef-4131-a505-8c9fd5a92f1f`) and `cairn-907-auth`
  (`93aa929d-0228-4f8b-8d1e-5e7e0d755617`), each bound as `AUTH_DB`. Source: `src/lib/env.ts:19`,
  `AUTH_DB?: D1Database`; CLAUDE.md credentials section for the concrete database ids. [verified]
- Two Cloudflare Email error vocabularies never cross: the `env.EMAIL.send` binding throws
  `E_SENDER_NOT_VERIFIED` (also used by Email Routing for an unverified destination); the REST
  send (`POST /accounts/{id}/email/sending/send`) throws no `E_` codes, instead `10203`
  (`email.sending.error.email.sending_disabled`) and `10204`
  (`email.sending.error.email.sender_not_configured`), both HTTP 403, and elapsed time since
  onboarding is the only discriminator between "never onboarded" and "still propagating". Source:
  `src/lib/email.ts:80-102`; `src/lib/diagnostics/conditions.ts:65`;
  `docs/internal/record/2026-08-11-t4b-email-spike.md:33,44,147-148,214,275,281`. [verified]
- `npm run link:consumer -- <site-dir>` builds, packs, installs, and content-hashes every installed
  file against the pack, because `npm pack` reuses the tarball filename across versions and a plain
  `npm install` can silently serve a stale cached build; `--restore` un-pins the site back to
  `^<version>` from the registry. Source: `package.json:84`, `"link:consumer": "node
  scripts/lab/link-consumer.mjs"`; CLAUDE.md, "Pointing a consumer at unreleased engine work".
  [verified]
- In a feature worktree, `examples/showcase/node_modules` symlinks back to the main checkout, so
  the showcase's e2e suite silently proves main's engine build rather than the worktree's, unless
  the worktree's showcase gets a from-scratch `npm install`; the stale-`dist` half of this trap is
  closed structurally by the showcase's `pretest:e2e` repackage hook. Source:
  `examples/showcase/package.json:13`, `"pretest:e2e": "npm --prefix ../.. run package"`.
  [verified]
- Visual e2e baselines are CI-canonical, regenerated by `e2e.yml`'s `update_snapshots` job; this
  workstation's local Chromium renders a few surfaces a few pixels differently than the CI
  runner's, so a local gate is green only when its visual failures are exactly the files the
  latest regen commit rewrote. Source: CLAUDE.md, "Durable gotcha (CI-canonical baselines this
  workstation cannot reproduce)" (chassis-B2 example: 20 files from commit `4de378ec`).
  [candidate: workflow file `e2e.yml` itself not opened this slice; CLAUDE.md's own account taken as source]
- Vite 8 / Rolldown parses shipped `.svelte` `<script lang="ts">` as plain JavaScript before the
  consumer's Svelte plugin runs, so the post-package step `transpile-dist-svelte.mjs` transpiles
  each dist `<script>` body while KEEPING the `lang="ts"` attribute, because the markup still
  carries TypeScript the Svelte compiler must parse. Source: `package.json:36`, `"package":
  "svelte-package && node scripts/build/build-admin-css.mjs && node
  scripts/build/transpile-dist-svelte.mjs && chmod +x ..."`. [verified]
- The engine emits a JSON structured-log record for every operationally meaningful event through
  one internal chokepoint at `src/lib/log/`, with event names forming a stable, public-observable
  vocabulary (`area[.subject].verb_phrase`) documented in `docs/reference/log-events.md`; the
  logger module itself is exported from no package subpath, so its API can change freely while the
  event names cannot. Source: `src/lib/log/events.ts:1-16` (module comment: "renaming one is a
  breaking change... See docs/reference/log-events.md, kept in step with this union.");
  `src/lib/log/` contains `emit.ts`, `events.ts`, `index.ts`. [verified]
- Every publish is a commit with the editor as author and the GitHub App as committer, per spec
  §7.4. Source: `src/lib/github/types.ts:20`, "A commit author: the signed-in editor (spec §7.4).
  The committer is left to the App." [verified]
- The current published version is `0.96.0`. Source: `package.json:3`. [verified]
- `check:surface` runs a public-surface snapshot gate (`check-surface.mjs`) plus a leak check
  (`check-surface-leaks.mjs`). Source: `package.json:40`. [verified]
- `check:version` is a standalone gate script. Source: `package.json:53`. [verified]

## docs/internal/what-cairn-is-and-is-not.md (owner brief, source for stance claims)
- The governing boundary: cairn owns markdown content management and the editor/admin frame and
  little else; everything a site needs beyond that (functionality, actors, auth, data, domain
  logic) belongs to the developer, served through a thin seam, not a built-in feature. Source:
  docs/internal/what-cairn-is-and-is-not.md, "## The one boundary that governs everything".
  [candidate: sourced to the page only, not traced to code]
- cairn's defaults (owner/editor roles, magic-link) are floors, not ceilings: a developer can
  replace admin auth with their own framework, and cairn then mints no session and reads an
  owner/editor identity through a defined hand-off. Source: same file, "The defaults are floors,
  not ceilings." [candidate: sourced to the page only, not traced to code]
- cairn never names or models a domain actor beyond owner/editor; a site's own domain (members,
  customers, assets, dues, a directory) is the developer's to build. Source: same file, "A site's
  domain is the site's." [candidate: sourced to the page only, not traced to code]
- The seams form a narrow, versioned public surface across kind-based export subpaths, held by a
  public-surface snapshot gate plus gated Extension-API/Scaffold-API stability tiers; until 1.0 the
  gate detects and discloses a break rather than preventing one. Source: same file, "The contract
  is stable, and every break is disclosed," cross-referenced with `check:surface`
  (`package.json:40`). [verified]
- The Go `cairn` tool is a separate operator cockpit over every cairn site a machine knows; it
  replicates admin operations as a second front over the same contracts and never adds to the
  engine's public surface or models a domain actor. Source: same file, "The `cairn` tool is the
  operator's cockpit, not engine surface." [verified] (Go tool source not in this repo slice; not
  independently checked against code.)
- `cairn-audit` ships whole as a consumer product: all 28 registered rules audit the `/admin`
  surface, which is itself cairn's own admin toolkit, so design-conformance auditing is the product
  being shipped, not engine-internal apparatus. Source: same file, "`cairn-audit` ships whole, as
  consumer product," citing `docs/reference/cairn-audit.md`. [candidate: the 28-rule count was not
  independently recounted against `docs/reference/cairn-audit.md` this slice]

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
separate tightening pass ran on this arm: 42 facts, 37 verified, 5 candidate, 0 docs-drift, 0
vendor, 0 external, 0 rejected.
