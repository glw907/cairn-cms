# Plan: cairn-cms, an embedded magic-link GitHub-committing CMS for SvelteKit/Cloudflare sites

> **Scope note.** This started as "a good markdown editor for ecnordic" and, through the
> conversation, became the **genesis of `cairn-cms`**: a reusable CMS core whose first two
> consumers are **ecnordic.ski** and **907.life**. Execution does **not** happen in this
> ecnordic-rooted session. It begins with **Pass 0** (new repo + meta-workspace), after
> which a fresh Claude session runs from the workspace root. Copy this plan into the new
> `cairn-cms` repo as `docs/PLAN.md` once it exists.

## Context

EC Nordic (and 907.life) need **non-technical authors** to edit content from the browser.
A git-based CMS was the obvious reach, but the hard requirements rule the field out:

- **No GitHub accounts for editors; magic-link email login.** No off-the-shelf git CMS
  (Sveltia, Decap, Tina, Keystatic) supports passwordless email login. Sveltia's local mode
  is Chromium-only (user is on Firefox); the half-wired `static/admin/` is a dead end.
- **Must preserve directive-heavy markdown** (`:::card{}` etc.). A rich-text CMS widget
  would corrupt it.
- **GitHub-forward, no human "bot" account.**
- **Reusable across two sites with different designs** (ecnordic: DaisyUI + directive
  pipeline; 907.life: ET Book + plain `remark-html`).

Answer: a **custom in-app admin** = the core of cairn-cms.

### Locked decisions
| Area | Decision |
|---|---|
| Target stack (scope) | **Opinionated, not universal.** cairn-cms may assume a specific stack (**Cloudflare, SvelteKit, DaisyUI, Tailwind, GitHub**) and is *not* trying to be a CMS for all hosts/designs. Don't over-generalize the adapter contract or seams to abstract these away; a hard dependency on them is an acceptable answer, and "out of scope" is a valid verdict per candidate feature. Keeps the core lean (WordPress-bloat is the cautionary tale) |
| Platform usage | **Cloudflare-first.** Any Cloudflare primitive that makes architectural sense is fair game: **D1, KV, R2, Queues, Durable Objects, Cron Triggers, Images, Email**. The single fixed point: **content (pages/posts) stays markdown committed to git** (no content→DB pivot). Everything else is a free engineering choice, governed by "keep the core lean," **not** by Cloudflare-avoidance. This **narrows** the earlier "no D1/database pivot" note (Reference/Exploration) to its real intent: no *content* pivot. D1/etc. are sanctioned for non-content concerns (collection-def store, content index/cache, ephemeral state, scheduled-publish via Cron, media via R2/Images). Per-feature platform choices are made in that feature's pass. (Established 2026-05-26.) |
| Editor identity | **Magic-link email.** No passwords, no GitHub for editors |
| Auth implementation | **`better-auth` (D1 adapter + magic-link plugin).** Decided in the Architecture-Refinement pass (2026-05-26), **replacing** the shipped hand-rolled magic-link/signed-cookie/KV stack. Rationale: the project is early, so the better long-term result outweighs preserving working prod auth; better-auth is mainstream (~25k★, ~600k+ weekly npm), native on Workers+D1, and is what Pages CMS uses. Fixes C1 (single-use on strongly-consistent D1) by construction, retires the hand-rolled JWT/token lifecycle + timing-safe compare (H3), and enables DB-backed session revocation (M3). The GitHub-App commit signer **stays bespoke**. Migrated in a dedicated pass before the extraction. (Established 2026-05-26.) |
| Magic-link delivery | **Cloudflare Email Service** (`env.EMAIL.send`), *not* the Email Routing `send_email` binding (recipient-restricted). Fallback: Resend |
| Editor component | **Carta** `carta-md` v4.11.2 (Svelte 5, unified/remark-native), edits **raw** markdown. **No WordPress-style semi-WYSIWYG / rich-text editing.** Authors write markdown (with a live preview), not a contenteditable surface. A rich-text widget would corrupt directive-heavy markdown (`:::card{}` etc.); that's a core reason the off-the-shelf CMSes were ruled out |
| Preview | Each site supplies its own `renderPreview(md)` → directive-safe per design |
| Admin theme | **Neutral, fully self-contained.** One clean theme identical on every site, scoped to `/admin` (`data-theme` + font reset on the layout root), decoupled from host-site tokens/fonts. Shared admin components own their styles (→ clean Pass F extraction); only `siteName` varies via adapter `branding`. The admin is a tool, not a marketing surface |
| Editor management | **Two-tier roles**, per-site (no cross-site SSO). KV allowlist value carries a role (`owner` vs `editor`); **only `owner`s** see/use the manage-admins UI (add/remove editors, set role), regular `editor`s only edit content. The guard checks role on the management surface, which is a privilege-escalation surface. Revises the earlier "role tiers out of scope" line. Built in **Pass G** |
| Commit mechanism | **GitHub App** (short-lived install tokens; committer = `cairn-cms[bot]`, author = editor) |
| Publish flow | Commit to **`main`** → existing CI auto-deploys. `draft` frontmatter = soft gate |
| Topology | **Embedded per-site library.** Admin at each site's `/admin`, in that site's worker |
| Build sequence | Build on **ecnordic** (richer case) with cairn-core seams designed in from day one; extract after it runs on both |
| Repos | `cairn-cms` is its **own repo**; ecnordic + 907-life consume it |
| Working model | **Meta-workspace** `~/Projects/cairn/{cairn-cms,ecnordic-ski,907-life}`, npm workspaces symlink core into both sites; one Claude session at root |
| Sveltia | **Remove** `static/admin/`; reconcile backlog #4 + STATUS |

## Architecture

```
cairn-core (generic, the library)
  ├─ auth: magic-link issue/verify (Web Crypto HMAC, single-use via KV, TTL), signed session
  │        cookie, /admin/** guard, editor allowlist (KV: email→display name)
  ├─ email: pluggable sender (Cloudflare Email Service adapter; Resend adapter)
  ├─ backend: GitHub App engine — mint install token (RS256 JWT, Web Crypto), read file,
  │           commit to main with author≠committer (git-data API)
  ├─ ui shell (Svelte 5): /admin login · content list · editor (Carta + frontmatter form)
  └─ adapter contract: the TS interface each site implements ↓

site adapter (per site: src/lib/cairn.config.ts)
  ├─ collections[]: { name, label, folder, slugCodec: {parse, format}, schema, fields }
  │     ecnordic posts: YYYY-MM-slug · 907-life posts: YYYY-MM-DD-slug
  ├─ renderPreview(md): ecnordic → directive pipeline (render.ts); 907-life → remark-html
  ├─ backend: { owner, repo, branch, appId, installationId }
  ├─ branding: { siteName, theme } for admin chrome
  └─ editorialRules?(md): ecnordic → content-style-guard parity (optional)
```

The single seam that makes it "work across two designs": **Carta stores raw markdown and
previews through the site-supplied `renderPreview`.** cairn-core never assumes directives.

## Repos & working model (Pass 0)

```
~/Projects/cairn/                 # NEW parent (not a git repo) — npm workspace root
  package.json                    # { "workspaces": ["cairn-cms","ecnordic-ski","907-life"] }
  cairn-cms/                      # NEW repo: the library (its own .git + remote)
  ecnordic-ski/                   # moved here, keeps its .git/remote/Cloudflare deploy
  907-life/                       # moved here, keeps its .git/remote/Cloudflare deploy
```

- **Dev:** workspace symlinks `cairn-cms` into each site's `node_modules`. Edit core, both
  sites see it instantly, no publish.
- **CI/prod:** each site pins a **published** cairn version (GitHub Packages, or `git+ssh`
  tag dep) so deploys are reproducible and independent of the local workspace.
- One Claude session launched at `~/Projects/cairn/`; each repo's `CLAUDE.md` still loads in
  its subtree.

## Phased passes (each ≈ one cairn-pass)

- **Pass 0: Workspace + repo.** Create `~/Projects/cairn/`, init `cairn-cms` repo + npm
  workspace, move the two sites in, verify both still build/deploy. Register **one GitHub
  App** installed on both repos. Set up Cloudflare Email Service (domain auth/DKIM) or Resend.
- **Pass A: Auth skeleton (in ecnordic).** Add `AUTH_KV` binding (+ `app.d.ts`); magic-link
  request/verify via Email Service; signed session cookie; `/admin/**` guard in
  `hooks.server.ts`; KV editor allowlist. Secrets via `wrangler secret put`
  (`GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_INSTALLATION_ID`,
  `MAGIC_LINK_SECRET`, `SESSION_SECRET`, email-provider key). **Done:** log in by email → empty `/admin`.
- **Pass B: Read/list + Carta preview.** `/admin` lists posts/pages from the repo;
  `/admin/edit/...` loads current raw markdown via GitHub contents API; Carta render-only
  preview wired to ecnordic's `render.ts` plugin set.
- **Pass C: Edit + commit.** Carta editing + frontmatter form (from `content-schema.ts`);
  `POST /admin/save` commits via GitHub App (author = editor). End-to-end edit→commit→deploy.
- **Pass D: cairn-core seam refactor.** Pull generic pieces behind the adapter interface in
  `src/lib/cairn/**`; ecnordic becomes `src/lib/cairn.config.ts`. No behavior change.
- **Pass E: Extract cairn-core to the package** (reordered: was the extraction half of
  the old Pass F, pulled ahead of 907-life onboarding to avoid throwaway duplication).
  Move the six `.ts` modules into `cairn-cms` using the `publishConfig`-swap shape
  (checked-in `exports`→source for zero-config instant dev across the workspace;
  `publishConfig.exports`→`dist` for publish; `svelte-package` builds dist at
  `prepublishOnly`, ready for the Pass F admin `.svelte` shell). Repoint ecnordic to
  `import … from 'cairn-cms'`; verify check/build/tests/`/admin`. Admin routes + components
  stay per-site for now. No behavior change.
- **Pass F: Onboard 907.life** (reordered: the old Pass E, now built against the real
  package). Write 907-life's adapter (filename-based ids, no slug codec needed; plain
  `remark-html` preview; its frontmatter + a new validator), its `admin/**` routes, KV/EMAIL
  bindings, the guard, and private-repo read-token threading. Decide here whether to extract
  the shared admin Svelte shell into the package (the design difference forces the call).
  Plus the old-Pass-F cleanup: remove `static/admin/`, close backlog #4, update
  STATUS/architecture/ROADMAP.

### Planned passes beyond F (added 2026-05-25)

- **Pass F2: Extract the shared admin shell into the package** (added 2026-05-25, during F).
  Pass F deliberately onboarded 907.life by **duplication** rather than extracting the shell
  mid-pass (the size/risk re-scope: extracting + refactoring the *live* ecnordic admin in the
  same pass as a greenfield onboarding was ~2 passes of work and coupled the two riskiest
  things). With both sites now working, extract once against two concrete consumers. **Target
  is well-defined:** the admin route files are byte-identical across ecnordic and 907 **except**
  907's free-form-tags handling in `save/+server.ts` + the edit `+page.svelte` tags input (the
  one real contract gap; see Findings). Likely shape: SvelteKit routes must physically live in
  each site's `src/routes/` (filesystem routing), so extract (a) the route **server logic** as
  exported functions and (b) the **Svelte components** (login/list/editor) into the package
  behind new subpath exports (`cairn-cms/sveltekit`, `cairn-cms/components`), each needing the
  source↔dist `publishConfig` swap; new peer deps `@sveltejs/kit` (server helpers throw
  `redirect`/`error`; watch the `instanceof` identity across the peer boundary) and `carta-md`
  (editor component). Fold free-form tags into the contract properly (e.g. a `freetags` field
  type + a `frontmatterFromForm` case) so the shared editor form covers both sites. Repoint
  **both** sites; gate on both test suites + both `/admin` smokes. No behavior change.
- **Pass P: Publish / pin cairn-cms (CI deploys, NOW URGENT; added 2026-05-25 during F2).**
  Risk #5's CI half is **confirmed breaking both sites' deploys**: standalone GitHub Actions runs
  `npm ci` and can't resolve `cairn-cms` (only the local workspace symlink provides it) **and** the
  committed lockfiles are stale (ecnordic missing `carta-md`+shiki since Pass B; 907 stale since the
  F2 toolchain bump). Local builds pass via the symlink; CI cannot install. The `publishConfig`
  exports→`dist` swap (Pass E) is designed for **`npm publish`**, so a git-dependency install won't
  get the built `dist` and Vite won't transpile source `.ts`/`.svelte` from a non-symlinked
  `node_modules`. **Decision needed: distribution mechanism.** Options: (a) **GitHub Packages** (private
  registry; requires scoping the name to `@glw907/cairn-cms`, `.npmrc` + a CI auth token, `npm
  publish` applies the swap) vs (b) **git+`prepare`-built dependency** (add a `prepare` build +
  point checked-in exports at `dist`, losing the source-instant-dev elegance) vs (c) other. Then
  add the dep to each site, repoint imports if renamed, regenerate + commit each standalone
  lockfile, and confirm both CI deploys go green. Sequence **before Pass G** (Pass G ships to prod;
  prod must deploy first).
- **Reference (admin-shell UI inspiration; added 2026-05-25; CORRECTED during Exploration).**
  Storage stays git-committed markdown (no D1/database pivot; cairn's hand-rolled magic-link/KV auth
  stays). **The earlier `joshnuss/capriole` reference was a phantom.** That repo does not exist
  (verified during the Exploration pass: `gh api` 404, no matching repo). **Lucia**
  (`pilcrowOnPaper/lucia`) is an auth *library* with no UI, so nothing to mine for layout. **Use
  instead: [`scosman/CMSaasStarter`](https://github.com/scosman/CMSaasStarter).** Svelte 5 runes,
  MIT, pure DaisyUI `drawer`+`navbar` admin shell scoped to an `(admin)` route group (mirrors cairn's
  `/admin`). UI/layout reuse only; storage + auth seams unchanged. See `docs/FORWARD-COMPAT.md`.
- **Pass G: Manage admins (editor management UI).** Owner-gated CRUD over the per-site
  `AUTH_KV` allowlist: list/add/remove editors, set role (`owner`/`editor`). Add a `role` to
  the KV value (migrate existing flat entries → `editor`, seed the first `owner`); extend the
  guard so the manage-admins surface requires `owner`. Reuses the neutral admin chrome. See the
  "Editor management" locked-decision row. Per-site (no cross-site SSO; unchanged).
- **Pass I: neutral, self-contained admin theme (added 2026-05-26; found during 907 go-live).**
  **Bug:** the admin chrome is **not** theme-isolated. `AdminLayout` (extracted to the package in
  F2) uses DaisyUI semantic classes (`bg-base-100`, `text-base-content`, `btn`, …) but sets **no
  `data-theme` and no font reset** on its root, so `/admin` inherits the **host site's** DaisyUI
  theme + fonts (907 → `silk`/`dim` + ET Book/Spectral via the `hooks.server.ts` cookie transform;
  ecnordic → its custom `ecn` theme). Affects **both** sites. Violates the locked decision: *"Admin
  theme: neutral, fully self-contained. One clean theme identical on every site, scoped to `/admin`
  (`data-theme` + font reset on the layout root), decoupled from host-site tokens/fonts. Shared
  admin components own their styles."* The Pass H drawer+navbar *structure* was borrowed from
  `scosman/CMSaasStarter`; this pass borrows the **theming approach** too. CMSaasStarter pins a
  single custom DaisyUI theme (`saasstartertheme`, light) with `themes:false` and applies it
  globally. **DaisyUI constraint to design around:** a `data-theme="X"` on the admin root only works
  if theme X's CSS is *compiled*, which the host site's Tailwind/DaisyUI build controls. The package
  can't force a theme to exist. So either (a) **per-site config:** each site adds a shared neutral
  admin theme to its `@plugin "daisyui" { themes: … }` and the layout sets `data-theme` to it (small
  per-site CSS edit, not "fully self-contained"), or (b) **fully self-contained (preferred, matches
  the decision):** the package's admin component owns a scoped `<style>` that overrides the DaisyUI
  CSS custom properties (`--color-base-100/200/300`, `--color-base-content`, `--color-primary`, …)
  **and** `font-family` on the admin root, re-skinning the whole subtree neutrally regardless of host
  config. **Open design decisions for the pass:** light-only vs light+dark (probably light-only,
  per CMSaasStarter + "identical on every site"); accent color; neutral font stack (system-ui sans).
  Ships as a cairn-cms minor release + both-site bump (like 0.3.1). Brainstorm the aesthetic first.
  **Pass I aesthetic is now decided (2026-05-26 brainstorm): "Warm Stone".** Warm-gray neutrals,
  violet accent, light-only, system-ui font; approach (b) fully-self-contained (full DaisyUI v5
  token set + `font-family` on the admin root). Folded into the broader admin redesign below.

### Admin redesign + theme architecture (brainstormed 2026-05-26): design docs + plans

A long 2026-05-26 brainstorm (visual companion) expanded "Pass I theme" into a full admin
redesign **and** surfaced the theme architecture. Canonical artifacts (all git-backed):
- **Design spec:** `docs/superpowers/specs/2026-05-26-admin-ui-design.md`, covering requirements **R1–R12 + R10a**:
  R1 auth, R2 roles, **R3 collections-first nav (Sveltia-style)**, **R4 differentiated page-vs-story editing**,
  R5 editor mgmt, **R6 neutral self-contained "Warm Stone" theme (= Pass I)**, R7 future media (reserve IA),
  **R8 collection CRUD (own design round; committed-config vs D1 storage; defs are data so runtime-creatable)**,
  **R9 reuse site icons/images/videos in the editor (pickers; git is the archive)**, **R10 component palette**,
  **R10a component registry (single declaration; renderer + palette derive from it; components are CODE, not
  user-creatable)**, **R11 standard formatting toolbar (Carta; don't assume markdown-literacy)**, **R12 toggle the preview**,
  **R13 canonical extension model (`CairnExtension`): a site is NOT just a theme instance; one code-defined,
  build-time-composed way to add functionality separate from core (nav/routes/collections/components/fields/hooks);
  site-local or shared package; a THIRD reuse axis beside engine+theme; own design round**.
- **Site architecture:** `docs/creating-a-cairn-site.md`, covering the engine/site model. **Decided model (a) scaffold-copy:**
  engine = live `@glw907/cairn-cms` dependency that propagates; a **site template** = copied scaffold the site owns +
  diverges. The **settled engine/site line**: machinery → core; registry data + builders + icons + CSS → site code.
  **Vocabulary settled 2026-05-26: "theme" is retired** for the site-design concept (it carried WP/Hugo swap/install
  baggage that never matched the model). Use **engine** (the package), **a Cairn site** (a consumer repo; ecnordic /
  907 are Cairn sites), **a site template** (a scaffold you `create-cairn-site` from). "Admin theme" (Warm Stone, R6)
  is unrelated. It's the DaisyUI visual theme of the `/admin` chrome.
- **Platform stance:** **Cloudflare-first** locked-decision row added above (use any CF primitive that fits; only
  content stays markdown-in-git). Narrows the old "no D1/database pivot" note to "no *content* pivot."

**Architecture documented + red-teamed (2026-05-26):** `docs/ARCHITECTURE.md` (consolidated, with §10
load-bearing assumptions) + `docs/ARCHITECTURE-CRITIQUE.md` (severity-ranked, research-backed; 17 risks added
to the register below). Headline: the thesis survives, but 4 must-fix CHANGE items (KV→DO/D1 nonce, POST-confirm
for scanner prefetch, 409 fail-safe, timing-safe compare) + design refinements (engine-fat/theme-thin, drop
"Hugo-like", extension-contract governance, Trees-API+sharding, non-dev safety net). **Premise re-validated
(2026):** the magic-link + git-commit + embedded-SvelteKit/CF niche is still **unfilled** (closest, Pages CMS,
needs Postgres+Node, can't embed on Workers) → **build justified**. **Two adopt-don't-build calls surfaced:**
(P2) replace the hand-rolled auth with **`better-auth` (D1 + magic-link)**, which fixes the KV-nonce critical too;
(P3) **stay on Carta** but wrap it behind a thin `MarkdownEditor` interface (rich-doc editors mangle directives;
CM6 is the fallback). Both for the Refinement pass to decide.

> **North star (Geoff, 2026-05-26):** prioritize the **highest-quality, most-maintainable long-term code**.
> **Anything currently written may be pulled out** if a cleaner long-term design warrants it. Preserving shipped
> code is *not* a reason to avoid a better architecture while the project is small. (This is what tipped the
> better-auth decision; apply it to every pass below.)

Resulting **planned passes (sequenced)**, superseding the standalone "Pass I theme":
- **Pass 0: Architecture Refinement (DONE 2026-05-26; build nothing).** Read the four canonical docs, resolved
  every CHANGE/open decision in the critique, produced **ARCHITECTURE v2** (`docs/ARCHITECTURE.md` §11 decision
  ledger), and re-sequenced this roadmap. **Headline: adopt `better-auth` (D1 + magic-link),** replacing the
  shipped bespoke auth (new "Auth implementation" locked-decision row; Refinement progress-log entry). Other
  resolutions: stay on Carta behind a thin `MarkdownEditor` interface (P3); engine-fat/theme-thin as a hard rule
  + drop "Hugo-like" (H1/H2); Git Trees API listing (H4); governed `CairnExtension` contract (H5); 409 fail-safe
  (C3); POST-confirm (C2); CI/bundle guards (C4/M5); non-dev safety net (M1).
- **Pass AUTH: Migrate to better-auth + auth hardening (DO THIS FIRST; ships to prod).** Replace the hand-rolled
  magic-link/session/role stack with **better-auth (D1 adapter + magic-link plugin)** on each site: D1 binding +
  better-auth schema/migrations per site; Cloudflare Email Sending wired into better-auth's send hook (Resend
  fallback, H6); re-implement two-tier `owner`/`editor` + `requireOwner` + anti-lockout on better-auth; **migrate
  the 4 seeded AUTH_KV owner allowlists → the D1 user table**; build the **POST-confirm flow** (C2: confirm page
  that POSTs, `Referrer-Policy: no-referrer`, origin-is-config audit H3); rewire the `hooks.server.ts` guard +
  `mint-session.mjs`. Fixes C1 by construction, retires the JWT lifecycle, enables DB-session revocation (M3). The
  GitHub-App commit signer stays bespoke. Ships as a cairn-cms **major** + both-site repoint + per-site D1 wiring.
  May split (AUTH-1 magic-link/session/D1 + POST-confirm; AUTH-2 roles + allowlist migration + manage-admins rewire).
- **Pass ROBUST: Commit/runtime robustness (small).** **409 fail-safe** in `commitFile` (C3); `/admin/healthz`
  signing a dummy JWT + `jose`/`importPKCS8` + rotation doc (M2); CI/bundle guards (Carta-client-only test +
  `wrangler deploy --dry-run` + lazy-init audit + pin wrangler v4/`nodejs_compat`/recent compat date, C4/M5). Can
  ride with AUTH or the extraction.
- **Pass: Render-Engine Extraction (code DONE 2026-05-26; not yet released; see progress log).** (plan:
  `docs/superpowers/plans/2026-05-26-theme-architecture-extraction.md`.) Moved the generic render engine + registry
  machinery into `@glw907/cairn-cms` (`render/*`); ecnordic's site code consumes the engine; 907 trivial (keeps its
  own `remark-html` renderer, which has a different output contract). **Byte-identical output** proven by characterization
  snapshots (ecnordic 6/6, 907 8/8). Realized R10a's engine half + the `adapter.registry` field. Enforced
  engine-fat/site-thin (H1). **Also settled the vocabulary: "theme" retired** for the site-design concept → engine /
  Cairn site / site template (see the vocabulary note under "admin redesign", `creating-a-cairn-site.md`). **Deferred
  to later passes** (were listed here, out of this extraction's scope): the thin `MarkdownEditor` interface (P3), Git
  Trees API listing + 1 MB cap (H4), engine version stamp + Renovate (H1). None gate the render extraction; carry to
  the editor/scaffolder passes. Single-kit peerDep (M4) + Shiki-off-server (C4) already held (unchanged).
- **Then: New Admin UI passes** (detailed plans to be written after extraction lands): **Pass I/theme** (Warm Stone, R6;
  **code DONE 2026-05-27, not released**), **Pass J** (collections-first nav + per-collection list, R3), **Pass K** (differentiated editing R4 + component palette R10
  + icon/asset pickers R9 + preview toggle R12; may split), and a **collection-CRUD** round (R8, needs its storage decision).
  Each ships as a cairn-cms minor + both-site repoint (Pass P pattern).
- **Then: Canonical extension model** (R13, own design round; naturally follows the extraction, which establishes the
  registry/adapter aggregation core needs to also aggregate extensions). `defineExtension({...})`; site-local or shared
  package; likely paired with a `create-cairn-site` / `cairn add` scaffolder for the SvelteKit route-shim mounting.
- **Future: Admin a11y polish (NavTree DnD + pickers; logged Pass L2, 2026-05-28).** NavTree's drag-reorder uses
  native HTML5 drag, which is not keyboard-accessible, and the page-picker is a bare `<datalist>`. Revisit with
  keyboard-accessible drag-reorder and a real combobox. **Decided escape hatch: Bits UI** (the strongest Svelte-5
  headless primitive set in 2026; it ships logic + a11y only and styles via DaisyUI classes, so it composes with the
  admin theme). **Do not adopt a styled component library** (Flowbite/shadcn-svelte/Skeleton/DaisyUI Svelte wrappers):
  they bring a visual layer that fights the neutral self-contained admin theme and add a dependency to the published
  package. Unscheduled; the current admin surfaces are simple enough that the dependency cost is not yet justified.
- **Future: Manage media (image/upload UI).** Was out-of-scope; now a roadmap item, still
  unscheduled. **Open decision: storage.** Options: commit media into the site repo (fits the git-CMS
  model, reuses the GitHub App `commitFile` path with base64 binary, served as static assets)
  vs Cloudflare R2 / Images (scales, adds infra + a binding). Decide before building. The
  adapter contract will likely grow a media config (folder/URL-base, or an R2 binding ref).
- **Planned (after Pass L): Reusable content fragments (transclusion).** Added 2026-05-28 from a
  reusable-content brainstorm (research-backed; web survey of Markdoc/Hugo/WordPress/Ghost/Statamic/
  Sanity/MDX/Notion). **The decided direction:** keep *components* (code/structure) and *reusable
  content* (data) separate, the line every mature tool draws. cairn already has the "card you fill
  in each time" case via the directive registry (`:::card{...}...:::`, per-instance snapshot); the
  **gap** is edit-once-updates-everywhere reusable markdown. **Shape:** fragments are markdown files
  in git, modeled as a **collection** so they reuse the existing `/admin` list/create/Carta-edit +
  commit machinery (much like Posts/Pages), but with a distinct **`kind: 'fragment'`** (extends the
  Pass K `page`/`story` kinds): non-routable, no URL/feed/sitemap, referenced by name via the
  directive, not rendered standalone. **Opt-in, not auto-injected** (consistent with collections/
  registry/navMenu all being adapter-declared); the engine ships a one-line **`fragments()` preset**
  the site composes into `collections` (mirrors `defineRegistry`), so it is easy without being magic.
  Fragments live at `src/content/_fragments` (non-routable dir), pulled in by a new
  **`:::include{...}`** directive added to the render engine, **resolved at build time** (so a
  fragment edit propagates on the next deploy, matching commit-as-publish; build-time is the right
  call for a deploy-on-commit CMS). **A reusable "card with content" is just a fragment file that
  contains a `:::card` directive**, included anywhere; no new "reusable component" type. Both reuse
  semantics come free with no toggle: directive-components are always per-instance snapshots,
  `:::include` is always synced. The **welcome blurb** (left a `config.ts` constant in Pass L)
  becomes a fragment once this lands. **Guards to design in:** hard-error on circular includes;
  build-time broken-reference validation (renames break path refs); includes carry **no** inner
  content and **no** parameters (keep fragments static markdown, or it becomes a template language);
  fragments are non-page files (no front-matter bleed). **Meatiest open question for its own design
  round:** the Carta `/admin` preview renders in-browser and can't synchronously read a fragment
  file, so previewing an `:::include` needs a resolution strategy (preload fragments vs a
  server-rendered preview). Its own brainstorm → spec → plan; sequenced right after Pass L (Geoff,
  2026-05-28).
- **Future: Site templates (scaffold-copy starters, NOT WordPress-style themes).** Reusable
  starting points *are* a wanted capability, but the model is **scaffold-copy**, not runtime themes:
  when a user stands up a **new** Cairn site they **choose from a collection of site templates** as a
  scaffold, then **edit it** in their own repo from there (or **build a new template** if they prefer).
  It is **site-setup / scaffold-time selection + in-repo source editing**, *not* a runtime
  template-management UI inside `/admin` and *not* a marketplace. This is consistent with the
  opinionated target stack (templates are SvelteKit + DaisyUI/Tailwind) and the "admin is a tool, not a
  marketing surface" decision. The *public site* design is the site's own; the admin chrome stays
  neutral/self-contained. A site template is essentially the SvelteKit/Tailwind/DaisyUI layer + a
  default `cairn.config.ts` adapter (collections, `renderPreview`, frontmatter) + the component
  registry. Unscheduled; the open work is defining what a site template packages and how the scaffold
  picks one (e.g. a `create-cairn-site` template set). ("theme" retired here; see the vocabulary note
  above.) **Implication for now:** reusability means UI components should stay **consistent and
  restyleable.** That's a strong reason to build on **DaisyUI components where possible** (semantic classes
  that re-skin via DaisyUI themes) rather than ad-hoc bespoke markup a template can't restyle. Applies
  to site components; the admin chrome stays neutral by its own rule.
- **Exploration (research pass, not a build): CMS landscape & forward-compatibility review.**
  The real goal: survey mature CMSes (Sveltia, Decap, Keystatic, WordPress, Ghost, Statamic) to
  see *a bit into the future* and make sure **we don't design ourselves into a box**, meaning
  Cairn's extensibility seams (above all the **adapter contract**, plus the storage and auth/role
  models) stay general enough to absorb likely future features *later*, without a rewrite. **Not**
  a commitment to build any of them. Scan list (which capabilities exist, and does our current
  architecture leave the door open?): media/uploads, editorial workflow / review-before-publish,
  scheduled publish, content relations / references across collections, i18n / localization,
  revision history & rollback (we get some free from git), richer roles/permissions, multiple
  backends. *Reusable design* is **not** dropped but is **scoped to scaffold-copy** (scaffold-time
  site-template choice + in-repo editing, per the "Site templates" item above), explicitly **not**
  WordPress-style runtime theme management. **Cairn stays lean; WordPress is the cautionary tale.** Output is an architectural
  memo: "keep these doors open" notes
  + any cheap seam generalizations to make now; **"out of scope" is a valid verdict per item.**
  **Timing leverage:** most valuable **before the adapter API calcifies** for external/published
  consumption. The contract is extracted in Pass E and validated on a 2nd site in Pass F, so this
  review ideally informs/closely follows F, before the package version is pinned for outside use.

## Key new files (in ecnordic during A–D; migrate to package in F)

`src/routes/admin/`: `+layout.server.ts` (`prerender=false`, session→`locals.editor`),
`+page.svelte` (list), `login/+page.svelte`, `edit/[type]/[id]/+page.svelte`,
`auth/request/+server.ts`, `auth/callback/+server.ts`, `save/+server.ts`.
`src/lib/cairn/{auth,github,email,carta,content}.ts` · `src/lib/cairn.config.ts`.

## Changed files (ecnordic)

`wrangler.toml` (+`[[kv_namespaces]]` AUTH_KV; Email Service binding) · `src/app.d.ts`
(+bindings/secrets, `App.Locals.editor`) · `src/hooks.server.ts` (guard, keep theme logic) ·
`package.json` (+`carta-md`, `octokit`+`@octokit/auth-app`, `isomorphic-dompurify`) ·
remove `static/admin/*` · `BACKLOG.md`/`docs/STATUS.md`/`docs/architecture.md`/`ROADMAP.md`.

## Reuse (don't reinvent; verified in repo)

- Email/MIME pattern & `getRequestEvent().platform` access: `src/lib/contact.remote.ts`.
- `prerender=false` on live routes: `src/routes/contact/+page.ts` (global default true via
  `src/routes/+layout.server.ts`).
- Remark processor to reuse for preview: `src/lib/markdown/render.ts`.
- Content model + controlled tags: `src/lib/content-schema.ts`; slug parse: `src/lib/posts.ts`.
- CSRF/origin posture: SvelteKit's built-in same-origin POST check (the contact remote fn
  relies on it); apply to `/admin` POST endpoints.

## Risks / unknowns to verify (ranked)

1. ~~**Cloudflare Email Service GA + setup** (HIGH)~~ **RETIRED (both go-lives, 2026-05-25/26).**
   Workers Paid on the account; Email Sending onboarded for **both** domains (ecnordic.ski + 907.life)
   with the `cf-bounce` MX/SPF/DKIM record set in DNS. Live-verified: a real `POST /admin/auth/request`
   in prod returned `?sent=1` (dispatch succeeded) on each site, and ecnordic's link was clicked through
   to an authenticated session. Resend was never needed as a fallback.
2. ~~**GitHub App auth on Workers** (HIGH)~~ **RETIRED (Pass C).** RS256 JWT signed with
   **Web Crypto** (no `@octokit/auth-app`, no `nodejs_compat` needed; only Web Crypto + `fetch`
   + `atob`/`btoa`). The stored key is **PKCS#1** (`BEGIN RSA PRIVATE KEY`), which `importKey`
   rejects, so the Worker wraps it to PKCS#8 in-process (`pkcs1ToPkcs8`, fixed RSA algId + DER
   length octets). *Verified:* `installationToken()` minted a real `ghs_` install token from
   GitHub and read `package.json` with it (throwaway live test, since removed); the commit body
   shape (author = editor, committer omitted → bot, base64 content, sha-on-update) is unit-tested.
   A real save→commit to `origin/main` then confirmed author = editor / committer = `cairn-cms[bot]`
   live (Pass C log).
3. ~~**Carta v4.11 plugin-injection API** (MED)~~ **RETIRED (Pass B).** Inject site plugins
   as sync transformers via `extensions[].transformers` (`{execution:'sync', type, transform}`)
   at the remark/rehype phases; `rehypeOptions.allowDangerousHtml` + `sanitizer:false` mirror
   `render.ts`. SSR handled by mounting the preview client-only (`{#if browser}`), so Shiki
   never runs on the Worker, so no isomorphic-dompurify needed. Wiring shares `render.ts`'s
   plugin arrays + is unit-tested; only the in-browser visual render awaits a Firefox click.
4. **Magic-link security** (MED): single-use (KV nonce delete on redeem), 10-min TTL,
   constant-time compare, `httpOnly/Secure/SameSite=Lax`, `/admin` excluded from prerender +
   Pagefind index + sitemap/robots.
5. **Workspace/CI linking** (LOW): sites resolve local cairn in dev, pinned version in CI.
   *Dev half verified on BOTH sites across all three subpath exports (`.`, `/sveltekit`,
   `/components`; Pass E ecnordic, Pass F 907, Pass F2 both)* the symlinked package's **source**
   resolves under `svelte-check`, the Cloudflare `vite build`, and `wrangler dev` with zero
   consumer config (`publishConfig`-swap exports). *Pass F2 corollary:* because the package imports
   `@sveltejs/kit`, a **single** root kit is forced, which forces both sites onto **one vite major**
   (907 was aligned up to ecnordic's `vite@8` toolchain). The CI pinned-version half is **still
   open** (no published version yet; both sites use the local symlink); carry to Pass G / a
   publish pass.
6. ~~**kit `redirect`/`error` `instanceof` across the package→site peer boundary** (MED, Pass F2)~~
   **RETIRED (Pass F2).** The extracted `cairn-cms/sveltekit` functions throw `@sveltejs/kit`
   `redirect`/`error`; these must share class identity with the host runtime. A single workspace
   `@sveltejs/kit` (npm-deduped to root) guarantees it. Live-verified: package-thrown redirect→303
   and error→400 in both sites' workers under `wrangler dev`. (See Pass F2 log.) **Keep `@sveltejs/kit`
   a peerDependency (never a dependency) + assert one resolved version in CI** (critique M4).

### Risks added by the architecture critique (2026-05-26); see `docs/ARCHITECTURE-CRITIQUE.md`

7. **KV eventual consistency breaks single-use magic-link nonce** (CRITICAL, security). **BUILT (Pass AUTH, 2026-05-26):
   better-auth magic-link tokens are consumed atomically on first verify (GHSA-hc7v-rggr-4hvx) on strongly-consistent D1,
   single-use by construction; verified by an integration test. RETIRED at prod cutover (Phase 6).** Was: **RESOLVED
   (decision, Refinement pass): adopting `better-auth` (D1 adapter + magic-link plugin)** moves single-use onto D1. Original analysis: Deleting the KV
   nonce does NOT atomically prevent replay; deletes propagate ~60s across PoPs, RYOW is best-effort. A
   forwarded/scanned/raced link can be redeemed twice from different PoPs. **Fix before broad rollout:**
   nonce in a **Durable Object** (atomic verify-and-delete) or **D1** (`DELETE … WHERE token=? AND
   expires_at>? RETURNING *`). Invalidates assumption #6. (Auth + edge agents both flagged.) **Best option:
   adopt `better-auth` (D1 adapter + magic-link plugin).** Runs natively on Workers+D1, fixes this on strong
   consistency, and retires the hand-rolled token lifecycle (also covers risk #10). Independently recommended
   by the build-vs-adopt scan (Pages CMS uses better-auth for exactly this). Evaluate in the Refinement pass.
8. **Email-scanner prefetch consumes magic links** (CRITICAL, auth DoS). **BUILT (Pass AUTH, 2026-05-26): the magic-link
   email points at a cairn confirm page (GET renders, consumes nothing); only the "Confirm sign-in" POST verifies the
   token (`confirmSignIn` proxy). Scanners GET but don't submit forms. Integration-tested. RETIRED at prod cutover.**
   Was: **SCHEDULED (Refinement: CHANGE → POST-confirm; Pass AUTH).** better-auth GET-redeems by default. Corporate gateways GET every URL
   in mail → the link is redeemed before the user clicks → "invalid/expired." **Fix:** POST-confirm flow
   (link → page → "Confirm sign-in" button that POSTs; nonce consumed on POST; scanners don't POST). Also
   closes GET/CSRF consumption. (Better Auth #6985, Supabase #1214.)
9. **Concurrent edit → HTTP 409 lost update** (HIGH). **BUILT (Pass ROBUST, 2026-05-26): `commitFile` catches the
   stale-sha 409 → throws `CommitConflictError`; `saveCommit` bounces the editor back with "this file changed since you
   opened it; reload and reapply." Fails SAFE; full merge stays out of scope. Unit-tested. RETIRED when the release
   ships.** Was: SCHEDULED (Refinement: CHANGE → fail safe; Pass ROBUST). `commitFile`'s read-SHA-then-PUT 409s if
   anything (another editor OR the site's own CI) commits in between. Partially invalidates assumption #4.
10. **No timing-safe compare on Workers** (HIGH, trivial). **BUILT (Pass AUTH, 2026-05-26): the hand-rolled token/HMAC
    compare is gone. better-auth owns the token lifecycle; the origin is config-derived (`PUBLIC_ORIGIN`/
    `BETTER_AUTH_URL`), never request-derived (H3). RETIRED at prod cutover.** Was: **MOSTLY RESOLVED (Refinement):
    adopting better-auth retires the hand-rolled compare; cairn keeps only the origin-is-config audit.** Original: No `timingSafeEqual`; `===` on token/HMAC leaks a
    timing oracle. **Fix:** Double-HMAC compare (~10 lines). Plus `Referrer-Policy: no-referrer` on verify +
    audit that the magic-link origin is config (`PUBLIC_ORIGIN`), never request-derived.
11. **Contents-API hard caps** (HIGH). Directory listing truncates **silently at 1,000 entries** (no
    pagination) and content >**1 MB** returns null. **Fix:** list via the **Git Trees API**; shard
    collections (year/month). Affects assumptions #2/#3.
12. **Carta/Shiki bundle vs Workers size wall** (CRITICAL-if-regressed). **GUARDED (Pass ROBUST, 2026-05-26):**
    a `carta-boundary.test.ts` asserts no server-side `.ts` module imports `carta-md` (client-only by construction),
    and both sites' CI gained a `wrangler deploy --dry-run` bundle guard. Measured headroom: ~2.3 MB gzip both sites,
    well under the 10 MB Paid wall. Shiki stays off the Worker.
13. **Scaffold-copy can't propagate fixes + "Hugo-like" is wrong** (HIGH, design). Copied theme files get no
    `npm update` (Shopify Dawn: ~90% outdated; CRA deprecated over this). **Mitigation:** keep ALL
    security/fix-prone + UI logic in the live ENGINE (cairn already does); theme = presentation/registry/CSS
    + thin route shims only; add a theme/engine **version stamp** + Renovate in the scaffold. Drop the
    "Hugo-like" framing (compile-time Vite ≠ Hugo's runtime FS overlay; SvelteKit #8896). Closest good
    analogue: Astro Starlight (live integration + narrow override surface).
14. **`CairnExtension` contract calcification / peer-dep / no package routes** (HIGH, for R13). Bake in:
    narrow + versioned contract; extensions peer-dep ONLY `cairn-cms` (never kit/vite); expose data +
    components, not internals; build-time validation; admin routes via generated shims (not package-provided, per SvelteKit #8896); governance doc before the first external extension. Affects assumption #9.
15. **Commit-as-publish: no deploy feedback / no pre-commit validation / no non-dev recovery** (MED). A bad
    save breaks the live build with zero editor recovery. **Fix:** server-side frontmatter validation BEFORE
    commit; a deploy-status signal; a revert-last-change affordance. Conditions assumption #1.
16. **Cloudflare Email Sending is beta** (MED) and is the sole auth channel. Wrap with explicit errors +
    audit log; keep **Resend** as a coded fallback; track GA. (Extends the original risk #1.)
17. **Misc edge guards** (MED). **GUARDED (Pass ROBUST, 2026-05-26):** PKCS#1→PKCS#8: `/admin/healthz` signs a dummy
    JWT via `signingSelfTest` (the fixture test already covered the conversion) + `docs/github-app-key-rotation.md`
    (jose evaluated, deferred; it doesn't remove the PKCS#1 conversion); lazy-init audited (only `new TextEncoder()`
    at module scope; `createAuth` per-request, Carta client-only); wrangler pinned `^4.93.1` on both sites +
    `compatibility_date` bumped to `2025-05-05` (`nodejs_compat` already set). Original items: PKCS#1→PKCS#8
    brittle/untested → `jose` + `/admin/healthz` + document rotation; lazy-init heavy objects (1s startup CPU limit);
    pin wrangler v4 + `nodejs_compat`. **Editor
    decision (research-backed):** the rich-doc "alternatives" (TipTap/ProseMirror/Milkdown/Lexical) are NOT
    options; they use a document model and mangle `:::` directives on round-trip. Carta is textarea-based (an
    `InputEnhancer` over an `HTMLTextAreaElement`), **not** a CodeMirror 6 wrapper (corrected in Pass K); the
    fallback is a bare editor. **Stay on Carta now; add a thin `MarkdownEditor` interface** so a later engine swap
    is one file. Pass K confirmed Carta's `input.getSelection`/`insertAt` hooks suffice for the R10 palette, so the
    seam was added without a migration. cairn's own single-author bus factor remains an accepted strategic risk.

## Verification (end-to-end, per site)

`npm run build` + `npx wrangler dev` (pipe `sleep infinity`), open in **Firefox** at :8787.
1) Request magic link to an allow-listed external email → arrives → click → authenticated
`/admin`; non-allowlisted rejected. 2) Edit a prose post **and** a directive page; save;
confirm a `main` commit with **author = editor, committer = bot** and a clean `git diff`.
3) CI deploys; change live. 4) `svelte-check` clean; `/admin` absent from prerender/Pagefind.
5) Negative: expired link rejected, reused link rejected, no-session `/admin` → login.

## Out of scope (initiative)

PR-review workflow (`draft` is the gate); editing `src/content/events`; cross-site SSO
(each site has its own allowlist/session). **Moved out of "out of scope" (2026-05-25):**
*editor role tiers* are now in scope as a **two-tier** owner/editor model for admin management
(Pass G), and *media/image upload* is now a roadmap item (see "Planned passes beyond F"),
no longer excluded, just unscheduled.

## Notes / progress log

> Session-by-session execution state and post-mortems. The workspace `CLAUDE.md` stays lean
> (durable orientation only); running progress lives here, in the git-backed plan.

> **✅ Pass L2 DONE (2026-05-28): nav editing UI, the write side of the YAML site-config design. Built from the
> committed plan (`docs/superpowers/plans/2026-05-28-pass-l2-nav-editing-ui.md`); committed locally on `main` in all
> three repos, not pushed. This completes the YAML site-config design (read side was Pass L). NEXT: reusable-content
> fragments (the planned post-L feature, see the roadmap above) is the next design round; START THERE.**
> **Engine:** dropped the D1 nav store from `src/lib/nav.ts` (`readNavTree`/`writeNavTree`/`loadNav`/`NavEnv`/the
> `D1Database` import) and added `setMenu(raw, name, tree)`, which parses the YAML into a `yaml` `Document`, replaces
> only `menus.<name>`, and re-serializes, preserving every other top-level key (`siteName`, other menus, `settings`).
> YAML comments are not preserved on rewrite (the accepted trade); data keys are. The adapter `NavMenuConfig` changed
> from `{name,label,maxDepth}` to `{configPath, menuName, label, maxDepth?}`, and `navMenus?: NavMenuConfig[]` became a
> single `navMenu?: NavMenuConfig`. `navLoad` now reads the config file via the contents-API `readRaw` + `extractMenu`,
> degrading to an empty tree when the file is missing or unparsable so the editor still loads; `navSave` validates the
> submitted tree, mints an install token, reads the current file, applies `setMenu`, and commits via `commitFile`
> (author = editor, committer = bot), carrying the existing 409 `CommitConflictError` fail-safe (C3). `adminLayoutLoad`
> maps the single `navMenu` to the kept `navMenus: {name,label}[]` AdminLayoutData shape, so `AdminLayout.svelte` and
> its specs are unchanged. Deleted `migrations/0001_nav_menu.sql`. code-simplifier then tightened the `setMenu` guard
> and folded `navSave`'s null-user check into `requireCapability`'s return.
> **Sites:** each adapter gained `navMenu: { configPath: 'src/lib/site.config.yaml', menuName: 'primary', label:
> 'Navigation', maxDepth: 2 }`, plus byte-identical `src/routes/admin/nav/+page.{server.ts,svelte}` shims
> (`load = navLoad`, `actions.save = navSave`; the `.svelte` is a one-line `NavTree` shim). The `NavTree.svelte`
> editor + the AdminLayout "Navigation" entry were already built (kept from the D1-era Pass L work).
> **Verified:** engine 122/122 vitest (removed the 5 D1-store specs + the navSave D1 happy-path; added `setMenu`
> round-trip/preservation/create/reject specs and the YAML navLoad read + degrade-on-missing + navSave 500/404 gate
> specs); `npm run package` clean (`setMenu` emitted to `dist/nav.d.ts`, `readNavTree` gone). Both sites `svelte-check`
> 0/0 (after `svelte-kit sync` generated the new route's `$types`) and `npm run build` succeed.
> **Live admin smoke (read side, both sites, mint-session per `docs/admin-smoke-test.md`):** anon `/admin/nav` → 303
> to `/admin/login`; owner `/admin/nav` → 200 with `NavTree` rendered (the "Save navigation" button + the
> `cairn-admin` shell class). On ecnordic (full secrets, public repo) the editor rendered the live menu's URL values
> read from the real repo YAML via `navLoad`+`extractMenu`. On 907 (no GitHub-App creds in local `.dev.vars`, private
> repo) the tree correctly degraded to empty, exercising the graceful-degrade path live. Sessions cleaned, workers
> stopped.
> **The commit-to-`main` write round-trip stays the user's Firefox step**, per the smoke doc's standing posture: a
> real `navSave` POST commits to the live repo and triggers a prod deploy on both sites, so it is not auto-run. Its
> components are independently unit-tested (`commitFile` author/committer/sha shape in `github-commit.test.ts`,
> `setMenu` in `nav.test.ts`, navSave gating in `sveltekit.test.ts`). To finish the round-trip: log in via Firefox,
> open `/admin/nav`, reorder/edit, Save, and confirm the `site.config.yaml` commit on `main` (author = editor,
> committer = `cairn-cms[bot]`). Note: the first save reserializes the menu from flow style to block style (value-
> preserving; the read side parses both).
> **Backlog (logged this pass, see the future-items note above):** NavTree's drag-reorder uses native HTML5 drag (not
> keyboard-accessible) and the page-picker is a bare `<datalist>`. Revisit keyboard-accessible DnD + a real combobox,
> with **Bits UI** as the sanctioned headless option (it composes with DaisyUI; no styled component library, which
> would fight the self-contained admin theme). Not built here; the surfaces are simple enough that the dependency cost
> is not yet justified.
> **Release:** unreleased local commits, like Pass L. Both fold into the next cairn-cms minor with both sites
> repointed (the Pass P pattern). No D1 migration ships; the menu lives in each site's `site.config.yaml`.

> **✅ Pass L DONE (2026-05-28): canonical YAML site-config, read side + full migration. Built subagent-driven
> from the committed 11-task plan (`docs/superpowers/plans/2026-05-28-pass-l-yaml-site-config.md`); committed
> locally on `main` in all three repos, not pushed. (Pass L2, the nav editing UI, is now also done; see the entry above.)**
> **Engine:** added the `yaml` dep plus a `sideEffects` field for tree-shaking (`1c3cc6b`), and appended a
> `SiteConfig` type with `parseSiteConfig`/`extractMenu`/`SiteConfigError` to `src/lib/nav.ts`, beside the kept
> `NavNode`/`validateNavTree` (`83eea69`, additive; the D1 nav store stays for L2). `parseSiteConfig` reads the
> build-time YAML and rejects a non-mapping root or a missing `siteName`; `extractMenu` pulls one named menu and
> runs it through the existing `validateNavTree`, returning `[]` when absent. code-simplifier then tightened the
> two helpers and their comments (`8dd18b5`). **Sites:** each gained `src/lib/site.config.yaml` (identity, a
> `menus.primary` list, `email`, `settings`; ecnordic also `footer.copyrightName` + `postTags`), and `config.ts`
> now parses it once via a Vite `?raw` import and re-exports the same `SITE_*`/`POST_TAGS`/`PRIMARY_NAV` constants
> (`WELCOME_BLURB` stays a constant, since it is content). The adapter `siteName`/`sender`, the header `Nav.svelte`,
> ecnordic's footer credit, and both contact senders read from `siteConfig`, dropping the duplicated literals
> (ecnordic `45e98b7`+`e0a86d6`; 907 `8abf3ff`+`43949eb`). Values were copied verbatim, including ecnordic's
> em-dash description.
> **Verified:** engine 121/121 vitest and `npm run package` clean (`parseSiteConfig` emitted to `dist/nav.d.ts`);
> both sites `svelte-check` 0/0 and `npm run build` succeed. Characterization held: both `feed.xml` byte-identical
> and both homepages unchanged (ecnordic `index.html` byte-identical apart from per-build asset hashes and the
> hydration nonce; 907 whitespace-normalized equivalent with all three nav anchors identical before and after).
> **Method note:** `feed.xml` is a dynamic `+server.ts` endpoint, not prerendered into the Cloudflare build, so the
> baseline and post-migration captures were rendered through `vite dev` and diffed (same endpoint code, same config,
> same posts), rather than diffing a built file as the plan first assumed.
> **Accepted residual:** `config.ts` now pulls the `yaml` parser and a tree-shaken slice of the engine into the
> client bundle (`config.ts` is imported by client components for the head title); the `sideEffects` field keeps
> that slice minimal and the bundle stays well under the size guard.
> **Left for Pass L2 (teardown + editing UI):** drop the D1 nav store in `nav.ts` (`readNavTree`/`writeNavTree`/
> `loadNav`) and `migrations/0001_nav_menu.sql`; change the adapter `navMenus[]` to a `navMenu` config object
> (config-file path, YAML key, maxDepth); rework `navLoad`/`navSave` in `sveltekit/index.ts` to READ the YAML via
> the contents-API `readRaw` and COMMIT it via the GitHub-App `commitFile` (preserving other YAML keys); the
> `admin/nav` route; the `NavTree.svelte` editor. See the salvage map below and memory
> `[[cairn-yaml-site-config-architecture]]`.

> **⏭ Pass L re-planned to a git-committed YAML site-config. RE-PLAN DONE (2026-05-28); Pass L executed and DONE (see entry above).**
> The brainstorm finished and the design split along its two verification surfaces (memory
> `cairn-pass-size-by-efficacy`): **Pass L** = canonical site-config read side + full config migration (gate:
> characterization byte-identical, no `/admin` change); **Pass L2** = nav editing UI (gate: editor round-trips a commit).
> Brainstorm widened the file to the canonical home for ALL author-editable config (Geoff): identity, `menus`, `email`,
> `footer`, `settings`; the welcome blurb stays a `config.ts` constant (it is content, not config). Research on YAML
> shape + reusable content informed the design; **reusable-content fragments** are the planned post-L feature (recorded
> in the roadmap above). **Spec:** `docs/superpowers/specs/2026-05-27-pass-l-yaml-site-config-design.md` (committed).
> **Plan to execute:** `docs/superpowers/plans/2026-05-28-pass-l-yaml-site-config.md` (committed, 11 tasks). **Resume
> by executing that plan** (subagent-driven or executing-plans). All planning work is committed locally on `main`, not
> pushed. The salvage map below still describes the kept/reworked/dropped engine commits; Pass L keeps the D1 store
> intact (additive only) and Pass L2 does the teardown.
>
> _(Historical pivot rationale, 2026-05-27:)_ Mid-execution, the D1/edge-SSR nav approach was rejected for a **git-committed YAML site-config file read at BUILD
> time**. Driver (Geoff): the sites must keep compiling (stay prerendered). Nav is just another build input, so store it
> in git and edit it through cairn's existing **GitHub-App commit→deploy pipeline** (the same commit-as-publish flow
> content uses), not in D1 at runtime. Why: flipping the public sites to edge SSR (to read nav from D1 per request)
> conflicts with prerendering and **breaks Pagefind search** (it indexes prerendered HTML), and would force edge-cache
> infra + a search re-architecture to claw back what prerendering already gives. The YAML model keeps prerendering +
> Pagefind intact, needs no edge-SSR/edge-cache/D1 table, and versions config in git. End-user experience is identical,
> so the call is about the more maintainable long-term architecture. The file becomes the **canonical home for all site
> config** (`siteName`, `nav`, future settings), Hugo-style, and **must be documented in `creating-a-cairn-site.md`**.
> **Auth stays on D1.** This REVISES the locked rows "D1 for all admin storage" + edge-SSR consumption (and the memory
> note) for the static structure/config category; rewrite those rows when the spec lands.
>
> **Format decided (Geoff):** a YAML site-config file, e.g. `src/lib/site.config.yaml` (location still open: repo root
> vs `src/lib`). Shape: a top-level object with `siteName` + `nav:` (a `NavNode[]` list).
>
> **Engine work already committed on cairn-cms `main` (local, NOT pushed). Salvage map:**
> - **KEEP (storage-agnostic, all green, 114 vitest):** T1 capability matrix (`src/lib/auth/capabilities.ts` + barrel,
>   commit `b7e63d3`), T2 `src/lib/nav.ts` `NavNode`+`validateNavTree` (`7f0bfed`), T5 page-create gating + `canCreate`
>   (`c5e2448`), T7 AdminLayout nav entry + `adminLayoutLoad` navMenus/canManageNav (`38f85d3`), T8
>   `src/lib/components/NavTree.svelte` (`9ca869f`).
> - **REWORK T3** (`2f4b596`). Drop the D1 store in `nav.ts` (`readNavTree`/`writeNavTree`/`loadNav`) and add a YAML
>   parse/extract/validate read helper instead.
> - **REWORK T4** (`9353959`). Change the adapter `navMenus[]` array to a `navMenu` config object carrying the
>   config-file path, the YAML key, and maxDepth.
> - **REWORK T6** (`6206201`). Rework `navLoad`/`navSave` in `sveltekit/index.ts` to READ the config file via the
>   contents-API `readRaw` and COMMIT it via the GitHub-App `commitFile` (preserving other YAML keys), reusing the
>   content read/commit path; keep the capability gating, validation, return shapes, and the page-picker. The engine
>   needs a YAML lib (gray-matter is present; add `yaml`/js-yaml for standalone parse and serialize).
> - **DROP T9** `migrations/0001_nav_menu.sql` (`ec452bc`). No D1 table needed.
> - The dropped/reworked commits are local-only, so rework them in place (no push happened).
> - **Sites:** ecnordic's Task-10 commit (prerender flip + D1 wiring) was `git reset --hard` back to `5f038ce` (clean,
>   builds). 907 untouched. Harmless leftover: a local-dev D1 `nav_menu` table + seed row in ecnordic's `.wrangler`
>   sqlite, unused under the YAML model.
>
> **Open brainstorm questions to settle in the revised spec:** (1) config file location (repo root vs `src/lib`);
> (2) YAML shape for future multiple menus (flat `nav:` list now vs a `menus:` map); (3) public read mechanism (a Vite
> `?raw` import in the site + engine parse helper, vs a layout `load`); (4) YAML serializer choice + whether to
> preserve non-`nav` keys on rewrite (Geoff accepted comment loss on tool rewrite).
>
> **Resume:** finish the brainstorm, write the revised spec to
> `docs/superpowers/specs/2026-05-27-pass-l-yaml-site-config-design.md`, run writing-plans, then resume subagent-driven
> execution. The original D1 plan + spec (`docs/superpowers/{plans,specs}/2026-05-27-pass-l-nav-tree*.md`) are
> SUPERSEDED for storage/consumption, but their capability-layer, `NavTree`, and validation portions still describe the
> kept work. See memory `[[cairn-yaml-site-config-architecture]]`.

> **Writing-cleanup Pass 1: prose-guard infrastructure (2026-05-27).** Both prongs are built. The
> `prose-guard` tool (lexical, structural, and statistics layers, plus a JSON-deny PreToolUse hook)
> lives at `~/.local/bin/prose-guard` with source in `~/.dotfiles` and 50 passing tests. The always-on
> `writing-voice` output style is prong 2. Both are wired in the global `~/.claude/settings.json`, and
> the cairn workspace `.claude/settings.json` adds the hook there too (that file sits in the non-git
> meta-workspace). ecnordic's `content-style-guard.py` is retired, and a thin CLAUDE.md pointer
> replaces it. The guard was tuned with the user during the pass: any em dash is a tell in the docs and
> comments tiers (the general tier keeps the appendage nuance), the bold-header rule was narrowed to
> skip key-value definition lists, a filler-word check was added, and the anaphora advisory now ignores
> bullet lists. All Claude-infrastructure prose was cleaned (global and repo CLAUDE.md, authored skills,
> memory). The writing-cleanup gate is **half** cleared: infra prose is done, and the repo cleanup
> (cairn-cms docs, `render/*`, Pass ROBUST comments, and the full ecnordic/907 sweep) is Pass 2. The
> >=0.5.0 release stays held until Pass 2.

> **Writing-cleanup Pass 2: repo prose sweep (2026-05-27). DONE. The ≥0.5.0 release gate is now clear.**
> Swept every in-scope doc and code comment across all three repos with `prose-guard` and rewrote the flagged
> prose for human cadence (the user chose genuine rewrites over mechanical punctuation swaps). Scope, set with
> the user: code comments plus the living docs, plus `PLAN.md` and the published `src/content` blog posts; the
> dated `docs/superpowers/{specs,plans,archive}` and `docs/plans/2026-05-25-extract-cairn-core.md` snapshots stay
> as historical artifacts and were left untouched. Work ran as parallel subagents partitioned by repo and bucket,
> each carrying the full `writing-voice` standard and verifying its own files clean; I re-swept and spot-checked
> the output.
>
> **cairn-cms:** README, `ARCHITECTURE.md`, `creating-a-cairn-site.md`, `github-app-key-rotation.md`,
> `ARCHITECTURE-CRITIQUE.md`, `FORWARD-COMPAT.md` (the last two are top-level reference docs, not dated snapshots,
> so they belong with the living docs), `PLAN.md` (321 em dashes removed, every fact/ID/date preserved), and all
> 19 `src/lib`/`src/tests` comment files (`render/*` and the Pass ROBUST comments included). **ecnordic:** `architecture.md`,
> `design-language.md` (89), `content-guide.md`, `STATUS.md`, `BACKLOG.md`, `ROADMAP.md`, the `.claude/**` infra
> (hookify rules, skills, instructions, rules), all `src` comment files, and `pages/training.md`. **907:**
> `architecture.md`, `STATUS.md`, `BACKLOG.md`, `ROADMAP.md`, `.claude/**`, route `+page.md` pages, all `src`
> comment files, and the five blog posts (lightest faithful touch on author voice).
>
> **Accepted residuals (not tells):** `content-guide.md` still reports 25 hits, all inside quoted punctuation
> examples and the verbatim banned-word list the guide itself defines (it is the marketing-content style guide,
> and the general content tier permits em dashes); `PLAN.md` and the epoll post each report one advisory anaphora
> over hundreds of lines, which is natural variation, not a cadence problem.
>
> **Gates green (prose-only change, no logic; code-simplifier skipped per the docs-pass rule):** cairn-cms 48/48
> vitest, both sites `svelte-check` 0/0. Committed locally in each repo; not pushed (awaiting user). With this the
> release sequencing is satisfied, so the next step is the held ≥0.5.0 bundle: publish the Render-Engine Extraction
> + Pass ROBUST, repoint both sites, then the AUTH decommission (still gated on the user's prod Firefox smoke).

> **⏭ NEXT SESSION (start here): Architecture Refinement DONE; ARCHITECTURE v2 settled; build queue re-sequenced.**
> **Both ecnordic.ski AND 907.life `/admin` are LIVE in prod** (go-lives 2026-05-25/26); the core initiative
> (passes 0/A–H + Pass P + both go-lives) is complete. The **Architecture-Refinement pass (2026-05-26)** then read
> the four canonical docs, red-teamed every critique item, and produced **ARCHITECTURE v2** (`docs/ARCHITECTURE.md`,
> §11 decision ledger). **North star (Geoff): highest-quality, most-maintainable long-term code.** Anything written
> may be pulled out for a cleaner long-term design while the project is small.
>
> **Headline decision: adopt `better-auth` (D1 + magic-link), replacing the shipped bespoke auth.** New "Auth
> implementation" locked-decision row. Other resolutions (see ARCHITECTURE.md §11): stay on Carta behind a thin
> `MarkdownEditor` interface (P3); engine-fat/theme-thin hard rule + drop "Hugo-like" (H1/H2); Git Trees API listing
> (H4); governed `CairnExtension` (H5); 409 fail-safe (C3); POST-confirm (C2); CI/bundle guards (C4/M5); non-dev
> safety net (M1).
>
> **START HERE: Pass I (Warm Stone theme, R6), Pass J (collections-first nav + entries list, R3), and Pass K
> (differentiated editing + palette + toolbar + preview toggle, R4/R10/R11/R12) are all DONE + verified locally
> (2026-05-27); not yet released.** The next New Admin UI items are **Pass K2** (R9 icon/asset pickers; new adapter
> contract for asset roots + a GitHub asset-listing read path; reuses Pass K's cursor-insert pattern) and **Pass L**
> (navigation-tree management; its own storage design round). Write the next detailed plan first. Pass I + J + K
> ship together as one cairn-cms minor (Pass P pattern: publish via OIDC, both sites repoint + lockfile regen, both
> CI deploys green); none alone is worth a release. **Pass J added the per-site `scripts/mint-session.mjs`
> (better-auth cookie minter) + `docs/admin-smoke-test.md`; the cairn-pass ritual now has a step-3 live admin smoke.**
> **Pass K date-coercion bug FIXED** (the editor date input + story subtitle now surface a YAML `date` via the new
> `frontmatter.ts` `dateInputValue` helper; live-verified on ecnordic).
>
> Two user-gated items still stand, neither blocking Pass J: (1) the Firefox prod smoke on each site from Pass AUTH,
> then the legacy-auth decommission (worker secrets + AUTH_KV; see the two-user-steps note below); (2) the Firefox
> visual confirmation of the Warm Stone theme on both `/admin`s once the admin-UI minor ships. The 0.5.0 release
> bundle is otherwise done.
>
> **(Historical) Pass AUTH SHIPPED to prod as 0.4.0.**
> better-auth (D1 + magic-link + POST-confirm + owner/editor roles) **replaced the hand-rolled stack and is LIVE in prod
> on both sites** as `@glw907/cairn-cms@0.4.0` (published via OIDC; not 1.0, unproven end-to-end). All six phases ran:
> remote D1 migrated + owner (`geoff-login@907.life`) seeded as `owner` in both DBs, `AUTH_SECRET` set on both workers,
> 0.4.0 published, both sites repointed `^0.4.0` + `better-auth`/`drizzle-orm` deps + regen lockfiles, **both CI deploys
> green**, prod wiring smoked: `/admin`→303 login, `/admin/login`→200, `/api/auth/get-session`→200 `null` (proves
> `createAuth`+`loadSession` against the live remote D1 + AUTH_SECRET), old `/admin/auth/request`→404, both sites 200.
>
> **TWO USER STEPS REMAIN (browser + cleanup):** (1) **Firefox prod smoke on each site:** request a link as the owner →
> email arrives → opens the **confirm page** (no auto-login) → "Confirm sign-in" → authed `/admin`; reuse the link → fails
> (single-use); load **Editors** as owner, add a test editor → it appears (and gets a link) → remove it. (2) **After the
> smoke confirms stable, decommission the legacy auth:** `wrangler secret delete MAGIC_LINK_SECRET`/`SESSION_SECRET` on
> `ecnordic` + `907-life`; delete the `editor:*` AUTH_KV keys (or the namespaces) after a grace period; drop the AUTH_KV
> `[[kv_namespaces]]` block from each `wrangler.toml`. The previous deploy (old auth) is one `git revert` away if the
> smoke fails. (Optional bookkeeping: add `AUTH_SECRET` as a per-site worker-only secret in `~/.dotfiles/.../sync.sh` +
> `registry.md`, like the old HMAC pair; mark MAGIC_LINK/SESSION for removal.)
>
> **Pass ROBUST: RELEASED in 0.5.0 (2026-05-27).** C3 (409 fail-safe), M2 (`/admin/healthz` + signing self-test +
> rotation doc), C4 (carta-server-boundary test), M5 (wrangler v4 pin on both sites + compat-date bump + CI `wrangler
> deploy --dry-run` guard + lazy-init audit). Shipped in `@glw907/cairn-cms@0.5.0`; both sites consume it and their CI
> deploys are green. Risks #9/#12/#17 flip to RETIRED.
>
> **Render-Engine Extraction: RELEASED in 0.5.0 (2026-05-27).** The render engine moved into `@glw907/cairn-cms`
> (`render/*`: `createRenderer`/`defineRegistry`/`glyph`/directive-stamp/dispatcher); ecnordic renders through it
> **byte-identically** (characterization 6/6), 907 keeps `remark-html` (8/8), `adapter.registry` added (R10a engine
> half). The vocabulary is settled: "theme" retired in favor of engine / Cairn site / site template. Shipped in 0.5.0;
> both sites repointed and building green against the published exports.
>
> **Release sequencing (Geoff, 2026-05-26): hold the ≥0.5.0 release until AFTER the writing-cleanup pass.** DONE
> 2026-05-27. The prose pass cleared the gate, then 0.5.0 shipped (render extraction + Pass ROBUST). The AUTH
> decommission stays separate; it is a user-side prod-secret cleanup, gated on the Firefox smoke, not a package change.
>
> **Then** New Admin UI (I/theme R6 → J collections-nav R3 →
> K editing R4 + palette R10 + pickers R9 + preview-toggle R12) → collection-CRUD R8 → extension model R13.
>
> **D1 databases (Pass AUTH):** `cairn-ecnordic-auth` `83178db3-0aae-4c1d-b6ad-1626193ebefd`, `cairn-907-auth`
> `93aa929d-0228-4f8b-8d1e-5e7e0d755617` (account glw907). IDs also in the workspace `CLAUDE.md`.
>
> **Also still pending (unchanged):** server-side npm token revoke at npmjs.com → Granular Access Tokens (low
> urgency; OIDC Trusted Publishing, no stored token; website-only). **Risk #1 (Cloudflare Email Sending) fully
> RETIRED.** Future roadmap: media/uploads (R7, default R2) + the broader scaffold (`create-cairn-site`).
>
> **Release 0.3.0 is DONE** (2026-05-25; see the entry below): bumped `0.2.0`→`0.3.0`, published via the
> Trusted-Publishing OIDC workflow (GitHub Release `v0.3.0` → `publish.yml`), repointed **both** sites to
> `^0.3.0` with regenerated standalone lockfiles, both CI deploys **green**, both live sites 200.
>
> **Pass H is DONE** (2026-05-25; see the Pass H entry below): the responsive DaisyUI `drawer`+`navbar`
> admin shell with a data-driven, role-gated nav. Built in the shared `cairn-cms/components`, consumed
> by both sites as unchanged byte-identical shims; **shipped to both sites in `@glw907/cairn-cms@0.3.0`**.
>
> **Pass G is DONE** (2026-05-25; see the Pass G entry below): owner-gated editor management, Geoff seeded
> as `owner` in all four AUTH_KV namespaces; **shipped to both sites** (`@0.2.0` then carried in `@0.3.0`).

### Pass K: differentiated editing + component palette + formatting toolbar + preview toggle (R4/R10/R11/R12). Code DONE, not released (2026-05-27)

- **Goal met: the editor is now a differentiated, capable surface.** A collection `kind` (`page` vs `story`)
  drives the create flow and the header; a registry-driven insert-component palette (R10) sits above the editor;
  Carta's built-in formatting toolbar is kept (R11); and a persisted preview toggle (R12) switches the live
  preview on and off. Built subagent-driven from the pre-written plan
  (`docs/superpowers/plans/2026-05-27-pass-k-editing.md`, spec
  `docs/superpowers/specs/2026-05-27-pass-k-editing-design.md`). Committed locally on `main`; not pushed.
- **Adapter contract (one field).** `CairnCollection` gains `kind?: 'page' | 'story'` (absent defaults to
  `story`, so existing sites keep working). `kind` drives only slug/identity treatment and header emphasis; it
  never gates capability (the palette and toolbar are available to both kinds, per R4's tendency-not-rule point).
  `adapter.registry` already existed from the render extraction, so no other contract change.
- **Package (`@glw907/cairn-cms`).** `sveltekit/index.ts`: `kind` threaded into `CollectionListData` and
  `EditData` and through `collectionListLoad`/`editLoad` (both default `?? 'story'`); `createEntry` forwards a
  story's date as a `&date=` redirect suffix (suppressed for pages); `editLoad` seeds `frontmatter.date` for a
  new dated story so the editor opens with the date set. New `src/lib/slug.ts` (`slugify`, exported from the
  barrel; strips apostrophes so "Geoff's" yields `geoffs`). New `src/lib/editor.ts`: the `MarkdownEditor` cursor
  seam (decision P3) plus `cartaEditor(getCarta)`, a lazy getter so it reads `carta.input` only at call time
  (the editor populates `input` after mount). New `components/ComponentPalette.svelte` (DaisyUI dropdown over
  `registry.defs`, renders nothing when the registry is empty or absent). `EditPage.svelte` reworked to a
  content-forward two-column grid (editor wide and first, frontmatter side column), a cairn control row hosting
  the palette and the preview toggle (`split`/`tabs`, persisted in `localStorage` under `cairn-admin:preview`),
  a kind-aware subtitle, and Carta's toolbar kept. `CollectionList.svelte` gained the kind-aware create form
  (title-derived editable slug, a story-only date input, kind-specific placeholders). **New tests:** `slug.test.ts`,
  `editor.test.ts`, plus `kind`/date-forwarding/date-seeding cases in `sveltekit.test.ts`. **Package 77/77 vitest;
  `svelte-package` clean.**
- **Editor-engine finding (P3/M6 reassessment, the finding risk #17 named this pass for).** Carta's public
  `carta.input` hooks (`getSelection`, `insertAt`) are **sufficient** for the R10 palette, so the thin
  `MarkdownEditor` interface was added without any migration. **Correction recorded:** Carta is **textarea-based**
  (an `InputEnhancer` over an `HTMLTextAreaElement`), **not** a CodeMirror 6 wrapper, so the long-term escape
  hatch is a bare editor, not CM6. Fixed in PLAN.md risk #17 and ARCHITECTURE.md (§7 + §11 P3/M6 row).
- **Carta-boundary corollary (clean catch during Task 4).** The Pass ROBUST C4 guard (`carta-boundary.test.ts`)
  text-scans every `src/lib/**.ts` for `carta-md` and fails if any matches, so the plan's `import type { Carta }
  from 'carta-md'` in `editor.ts` would have tripped it. The wrapper instead uses a local structural type for the
  slice of Carta it touches (`input.getSelection`/`insertAt`). This keeps the server boundary green and is the
  cleaner seam anyway (a future engine swap needs no type-import change). `EditPage.svelte` imports `carta-md`
  freely, since the boundary test scans only `.ts`, not `.svelte`.
- **Sites (both, byte-identical shims; F2 invariant held).** ecnordic's `pages` collection marked `kind: 'page'`
  (posts stays the default story); both sites' edit `+page.svelte` pass `registry={cairn.registry}` (ecnordic's
  seven-component registry; 907's explicit empty `defineRegistry({ components: [] })`, so its palette renders
  nothing). `diff -rq` of the two `admin/` trees is empty. Both `svelte-check` **0/0**, both Cloudflare
  `npm run build` OK. A non-interactive `tabindex` on the palette `<ul>` was dropped to clear the one a11y warning
  both sites surfaced.
- **Live admin smoke (cairn-pass step 3, both sites under `wrangler dev` with a forged better-auth owner session).**
  Anon `/admin`→303 login on both; authed `/admin`→307 to the first collection; lists 200. **Differentiated create
  forms verified:** ecnordic Posts (story) shows Title + Date + Slug (placeholder `2026-05-my-entry`); ecnordic
  Pages (page) shows Title + Slug, **no Date** (placeholder `about-us`); 907 Posts (story) shows the Date input.
  **Editor verified:** content-forward grid present, `cairn-admin` shell present, the page subtitle leads with the
  path (`Page · src/content/pages/volunteers.md`), the preview toggle renders, and the **palette shows all seven
  ecnordic components and is absent on 907** (empty registry). The Carta toolbar and the in-browser palette-insert
  + toggle-persistence are client-side JS, so they stay the standing Firefox user step (curl sees the SSR textarea
  fallback). No junk committed to `main`.
- **Date-coercion bug found in the smoke, then FIXED this session.** gray-matter parses `date: 2026-05-14` into a
  JS `Date`, and the string-only `fmString` helper skipped non-strings, so the date `<input>` rendered empty for an
  existing dated post (risking a blanked date on save) and the new story subtitle fell back to the path. The empty
  date input was pre-existing (the form used `fmString` before Pass K); Pass K's subtitle inherited it. **Fix:** a
  new internal `src/lib/frontmatter.ts` `dateInputValue(value)` coerces a `Date` or ISO-ish string to `YYYY-MM-DD`
  (UTC slice, so no local-timezone shift) and returns `''` for missing, invalid, or non-date values; `EditPage`
  uses it for the date field and the subtitle. 6 unit tests (`frontmatter.test.ts`); package now **83/83**. Kept out
  of the public barrel, mirroring `utils.ts`. **Live-verified on a fresh ecnordic build:** the date input renders
  `value="2026-05-14"` and the subtitle reads `Posts · 2026-05-14`. (Smoke gotcha worth remembering: ecnordic's
  `wrangler dev` serves the pre-built `.svelte-kit/cloudflare/_worker.js`, so a package source change needs
  `npm run build` before the worker reflects it; a stale build was the source of an initial false negative here.)
- **code-simplifier** run over the changed package code: one formatting refinement (multi-lined the
  `collectionListLoad` happy-path return to match `editLoad`'s style); the rest already clean.
- **Risk register:** none flipped (R4/R10/R11/R12 are design requirements, not numbered risks); risk #17's
  editor-decision note corrected (Carta is textarea-based, not CM6; hooks sufficient). Retires the Pass K item
  from the New Admin UI queue. **Next New-Admin-UI items: Pass K2** (R9 icon/asset pickers; new adapter contract
  for asset roots + a GitHub asset-listing read path; reuses this pass's cursor-insert pattern) **and Pass L**
  (navigation-tree management; its own storage design round). **Release:** folds into the same cairn-cms minor as
  Pass I and Pass J (the Pass P publish/repoint pattern); not published this pass. Standing user step: the Firefox
  visual confirmation on both `/admin`s when the admin-UI minor ships.

### Pass J: collections-first nav + per-collection entries list (R3). Code DONE, not released (2026-05-27)

- **Goal met: the admin's single lumped "Content" page is replaced by a Sveltia-style collections IA.** Each
  `adapter.collections` entry is now its own sidebar nav item that opens a per-collection entries list at
  `/admin/[collection]` (title, date, draft badge), with a working "New entry" create flow; `/admin` redirects to the
  first collection. Plan: `docs/superpowers/plans/2026-05-27-pass-j-collections-nav.md`. Built subagent-driven
  (implementer + spec + code-quality review per task). Committed locally; not pushed.
- **Package (`@glw907/cairn-cms`).** `sveltekit/index.ts`: `adminLayoutLoad` now returns `collections: NavCollection[]`
  (`{type,label}` only, so the adapter plugin graph never crosses to the client); new `adminIndexRedirect(adapter)`
  (307 to the first collection, 404 if none); new `collectionListLoad(event, adapter)` (replaces the lumped
  `adminListLoad`; reads each entry's frontmatter in parallel for title/date/draft, degrades a failed per-file read to
  the slug, returns an inline error on a failed directory listing); new `createEntry(event, adapter)` (validates the
  slug against `/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/`, rejects an existing file, redirects to the editor with `?new=1`);
  `editLoad` gained `isNew` + a create-mode branch (a missing file with `?new=1` is a blank document, not a 404);
  `saveCommit` preserves `&new=1` across its validation and 409 error redirects. Components: new `CollectionList.svelte`
  (entries table + New entry form), `AdminLayout` nav now maps over `data.collections` (one generic document icon each)
  plus the owner-only Editors entry, `EditPage` got a create-mode header/title/button + a `/admin/<type>` back-link;
  `AdminList` retired (deleted). **16 new tests in the first `sveltekit.test.ts`; package 64/64 vitest; `svelte-package`
  clean (`CollectionList` emitted, `AdminList` gone).**
- **Sites (both, byte-identical shims; F2 invariant held).** New `admin/[collection]/+page.{server.ts,svelte}` (load to
  `collectionListLoad`, action `create` to `createEntry`, render `<CollectionList>`); `admin/+page.{server.ts,svelte}`
  rewritten to `adminIndexRedirect` + a redirect stub. `diff -rq` of the two sites' `admin/` trees is empty. Both
  `svelte-check` **0/0**, both Cloudflare `npm run build` OK.
- **Sveltia-alignment scope cuts (deliberate, lean-core), all future-additive:** no `summary` template engine (a fixed
  lean row instead), no file/singleton collections (folder collections only; a future `kind:'file'` seam), no
  title-to-slug derivation (the author types the slug stem; a Pass K concern), no per-collection icons, sorting UI,
  view filters, or thumbnails. None are R3 requirements.
- **Live admin smoke (NEW standard process; user-requested).** Verified end-to-end on **both** sites under
  `wrangler dev` with a forged better-auth owner session (see below): anon `/admin` returned 303 to login; authed
  `/admin` returned **307** to `/admin/posts`; the sidebar showed one entry per collection (**ecnordic Posts + Pages,
  907 Posts only**, so the nav grows with the adapter); `/admin/posts` returned 200 listing entries that link into the
  editor, under the neutral `cairn-admin` shell; the owner saw the Editors link, and the entries carried a New-entry
  button; an existing edit returned 200 ("Back to Posts", "Save & commit"); create mode `?new=1` returned 200 ("New
  Posts entry", "Create & commit", hidden `new=1` input); `/admin/login` returned 200. No junk was committed to `main`
  (`createEntry` only validates and redirects).
- **Smoke tooling + docs (so this is not re-derived each pass).** The old `scripts/mint-session.mjs` (hand-rolled
  `cairn_session` HMAC) had been **dead since the better-auth migration**; both sites now ship a better-auth minter
  that forges the signed `better-auth.session_token` cookie (`encodeURIComponent(token + "." +
  base64(HMAC-SHA256(AUTH_SECRET, token)))`, better-call's `signCookieValue` format) and inserts a local-D1 session
  row, so `/admin` smokes without the email loop. New **`docs/admin-smoke-test.md`** documents the procedure, and the
  **`cairn-pass` skill ritual gained a step-3 live admin smoke**. The final Firefox magic-link click stays a user step
  (the email verification token is stored hashed, so it is not locally replayable).
- **code-simplifier** run over the changed package code: two cosmetic formatting refinements in `sveltekit/index.ts`
  (multi-line the `collectionListLoad` fallback object, wrap the `editLoad` ternary); no behavior change. The
  code-quality reviews also caught two real fixes applied this pass: a `TS2339` in `editLoad` (the `{}` ternary branch
  needed `as Record<string, unknown>`) and a slug `pattern` that allowed a trailing hyphen (tightened in both the
  client input and the server `SLUG_RE`).
- **Risk register:** none flipped (R3 was a design requirement, not a numbered risk). Retires the Pass J item from the
  New Admin UI queue. **Release:** folds into the same cairn-cms minor as Pass I (and Pass K), the Pass P
  publish/repoint pattern; not published this pass. Standing user step: the Firefox visual confirmation on both
  `/admin`s when the admin-UI minor ships.

### Pass I: neutral self-contained admin theme ("Warm Stone", R6). Code DONE, not released (2026-05-27)

- **Goal met: the admin chrome is now theme-isolated.** `AdminLayout` re-skins `/admin` neutrally
  regardless of the host site's DaisyUI theme and fonts, retiring the R6 bug (ecnordic rendered the
  admin in its `ecn` crimson theme + Alegreya Sans; 907 in `silk`/`dim` + Spectral serif). Light-only,
  "Warm Stone" (warm-gray neutrals at hue ~75, violet accent, system-ui font). Plan:
  `docs/superpowers/plans/2026-05-27-pass-i-warm-stone-theme.md`. Committed locally; not pushed.
- **Approach: fully self-contained (decision (b)) via CSS custom-property inheritance, NOT a compiled
  `data-theme`.** A `cairn-admin` class on both of `AdminLayout`'s root divs (signed-in drawer shell +
  signed-out login shell) plus a scoped `<style>` that sets the full DaisyUI v5 token set, `font-family`,
  geometry tokens (`--radius-*`/`--size-*`/`--border`), and `color-scheme: light` on `.cairn-admin`.
  DaisyUI reads `var(--color-*)` at point of use and custom properties inherit, so the whole subtree
  (including the child components rendered through `{@render children()}`) re-skins from the nearest
  ancestor that sets the tokens, which is now `.cairn-admin`, overriding the host's `:root`/`[data-theme]`
  for the admin subtree. Inheritance does the work, not specificity, so Svelte scoping is a non-issue
  (only the setting selector needs the scope hash; inherited values flow to unscoped descendants). The
  package never imports DaisyUI and cannot force a host to compile a theme, which is exactly why the
  override-the-vars approach is the right one. **One file, no contract change, no per-site edit.**
- **Gotcha found + fixed:** a literal `<style>`/`<script>` token inside a `<script>`-block JS comment
  breaks Svelte's parser (`element_unclosed: "<script>" was left open`); `svelte-package` failed until
  the comment was reworded to avoid the raw tag tokens. Worth remembering for future comments.
- **Verified.** Package 48/48 vitest, `svelte-package` emits `dist/components/AdminLayout.svelte` with the
  theme block. Both sites `svelte-check` **0/0** and Cloudflare `npm run build` OK against the workspace
  symlink. Structural proof the override ships into a consumer: ecnordic's built CSS carries
  `.cairn-admin.svelte-<hash>{ … color-scheme:light; --color-primary:oklch(52% .2 293); … }` (Lightning CSS
  rewrote the OKLCH literals), and both root divs carry the class. The visual confirmation in Firefox (the
  admin looks identical + warm-gray/violet on both sites) is the standing user browser step, as in prior passes.
- **code-simplifier** run over the file: trimmed two over-long comments (the top-of-file block and the
  `closeDrawer` note); no logic touched, OKLCH token set left intact per the design-system rule.
- **Risk register:** none flipped (R6 was a locked-decision violation, not a numbered risk); retires the
  Pass I item from the New Admin UI queue. **Release:** ships as a cairn-cms minor (Pass P pattern), folded
  with the next admin-UI release; not published this pass.

### Release 0.5.0: ship render extraction + Pass ROBUST; both sites green (2026-05-27)

- **Goal met: `@glw907/cairn-cms@0.5.0` is published and both sites consume it with green CI deploys.** This is the
  held ≥0.5.0 bundle (Render-Engine Extraction + Pass ROBUST), shipped right after writing-cleanup Pass 2 cleared the
  gate. Risks #9 (C3 409 fail-safe), #12 (C4 carta boundary), and #17 (M2/M5 signer + edge guards) flip to RETIRED.
- **Trigger (a push mistake, then the planned fix).** Pushing the writing-cleanup commits with `git push origin main`
  also pushed the render-extraction and Pass ROBUST commits that had sat unpushed beneath them. Both sites' CI then
  failed at Build: the pushed `components.ts` imports render exports (`defineRegistry`/`glyph`/`createRenderer` and the
  dispatcher helpers) that existed only in the local workspace source, not in the published `0.4.0`. Prod was unharmed
  (the Deploy step is gated behind Build, so it was skipped; the live sites kept serving the prior deploy). The fix was
  to roll forward and ship 0.5.0, which the user authorized.
- **Published via OIDC.** Bumped `0.4.0`→`0.5.0` (single-line, committed `970962a`), pushed, created GitHub Release
  `v0.5.0` → `publish.yml` ran the token-free Trusted-Publishing flow green; `npm view` confirms `0.5.0` is latest.
  Verified the built `dist/render/*` carries every name the sites import before cutting the release.
- **Both sites repointed `^0.4.0`→`^0.5.0`** with standalone lockfiles regenerated by the isolated-temp-dir method
  (registry tarball, not the workspace symlink; identical integrity hash across both sites). `npm ci --dry-run` clean
  in isolation for both. Committed + pushed (ecnordic `dcccb2b`, 907 `3001175`).
- **Verified.** Both CI deploys green (build + deploy success). Prod smoke: `https://ecnordic.ski` and
  `https://907.life` both `/`→200 and `/admin`→303 (guard intact). The render exports now resolve from the published
  package in the Cloudflare build.
- **Still separate (user-gated):** the legacy-auth decommission (delete `MAGIC_LINK_SECRET`/`SESSION_SECRET` + the
  `editor:*` AUTH_KV keys, drop the AUTH_KV `wrangler.toml` block) waits on the Firefox prod smoke. It is a prod-secret
  cleanup, not a package change, so it did not gate 0.5.0.

### Render-Engine Extraction: engine owns the render machinery; sites own the registry (2026-05-26)

- **Goal met (code half): the directive/markdown render engine now lives in `@glw907/cairn-cms`, and ecnordic renders
  through it with BYTE-IDENTICAL output.** Realizes the engine half of R10a (one registry feeds the renderer; the
  editor palette will read the same registry later) and the H1 engine-fat/site-thin line. Not yet released. Rides the
  next publish (≥0.5.0) with Pass ROBUST + the pending AUTH decommission. Committed locally; not pushed.
- **Engine (new `render/*` modules + flat barrel export):** `registry.ts` (`ComponentDef`/`ComponentRegistry`/
  `defineRegistry`), `glyph.ts` (`glyph(name, iconSet)`, icon-set parameterized), `remark-directives.ts`
  (`remarkDirectiveStamp(registry)`, generic; `PRIMITIVES`→`registry.names`, alert default icon→`registry.defaultIcon`;
  literal-restore of accidental `:name` prose verbatim), `rehype-dispatch.ts` (`rehypeDispatch(registry, rise?)` + the
  shared structural helpers `isElement`/`strProp`/`iconSpan`/`splitHead`/`cardShell`/`markFirstList` + child recursion),
  `pipeline.ts` (`createRenderer(registry, { rise })`, the exact `unified` chain, returns `renderMarkdown` + the
  remark/rehype plugin arrays for Carta). Added the render stack (unified/remark/rehype/hastscript/unist-util-visit) as
  **runtime deps**; `@types/hast`/`@types/mdast`/`mdast-util-directive` are deps too (hast `Element` + mdast `Root`
  appear in the public `ComponentDef`/plugin API). **12 new render tests.** Package 48 tests green; `svelte-package`
  emits `dist/render/*`.
- **Plan correction (signature):** the plan's `createRenderer(registry)` omitted the rise stagger. `riseStyle` is the
  site's design-language motion formula (the `--rise` var + `0.16 + i*0.04` step), so the engine takes it as an
  **optional `rise` option** (ecnordic passes `riseStyle`; 907/others pass none) rather than baking it in, keeping the
  engine presentation-agnostic per engine-fat/site-thin. Likewise `iconSpan`/`splitHead` take a site **`makeIcon`**
  callback (closing over the site's icon set) so the engine never imports an icon map.
- **ecnordic (site code):** new `src/lib/markdown/components.ts` with the 7-component registry (card/grid/alert/cta/split/
  panel/passage), each `build` fn reproducing the old `rehype-ec-primitives.ts` exactly via the engine helpers +
  `glyph(name, ICON_PATHS)` + the `ec-*` class names + `insertTemplate`s (palette-ready). `render.ts` rewired to
  `createRenderer(ecnordicRegistry, { rise: riseStyle })`, still exporting `renderMarkdown`/`remarkEcPlugins`/
  `rehypeEcPlugins` for back-compat + the Carta preview. `markdown/icons.ts` keeps `ICON_PATHS` (glyph moved to the
  engine). **Deleted** `remark-ec-directives.ts` + `rehype-ec-primitives.ts`. `adapter.registry = ecnordicRegistry`.
- **907 (site code):** keeps its own `remark + remark-gfm + remark-html` renderer in `posts.ts`. Its output contract
  (remark-html, no rehype) differs from the engine's rehype-stringify path, so adopting `createRenderer` would change
  output. Added `adapter.registry = defineRegistry({ components: [] })` (no directive components). Carta preview
  unchanged (empty plugins → Carta's built-in pipeline).
- **`adapter.ts`:** new optional `registry?: ComponentRegistry` on `CairnAdapter` (R10a single-declaration; rendering
  parity already flows through `preview`).
- **File-location decision (with Geoff):** the site presentation layer is cross-cutting (registry, icon data, CSS, fonts,
  images) and SvelteKit dictates conventional/mandatory homes (`static/`, `app.css`, `lib/components`), so there is **no
  single "theme"/"site" code-folder.** Forcing one fights the framework. The render registry + icon data are
  *rendering code* → they live with the pipeline in `src/lib/markdown/`. The "site / site template" vocabulary is
  repo-level (concept + docs), not a directory.
- **Vocabulary settled (with Geoff): "theme" RETIRED for the site-design concept.** It implied an installable/swappable
  package this model never had. Use **engine** (`@glw907/cairn-cms`), **a Cairn site** (a consumer repo), **a site
  template** (a `create-cairn-site` scaffold). Locked into the living docs (`creating-a-cairn-theme.md` →
  **`creating-a-cairn-site.md`**, rewritten; `PLAN.md`; `ARCHITECTURE.md` (engine-fat/**site-thin**, engine/**site**
  line, **site template** layer), the memory note + index, and all engine/site **code comments**. Kept: "admin theme"
  (the DaisyUI `/admin` visual styling, unrelated). The two dated `docs/superpowers/` artifacts (admin-UI spec + this
  extraction plan) keep their internal "theme" prose as a historical snapshot (filename refs fixed); Geoff's call.
- **Verified.** Package 48 tests + `svelte-package` (dist/render emitted). **ecnordic** `svelte-check` 0/0, characterization
  **6/6 byte-identical** (zero snapshot diff), Cloudflare build OK. **907** `svelte-check` 0/0, characterization **8/8
  byte-identical**, build OK. code-simplifier run over the new engine + site code: two comment-only fixes
  (`cairn-core`→`cairn-cms`), rest already clean (faithful moves of already-simplified code).
- **Commits (local, not pushed):** cairn-cms: five `feat(render)` commits + the PluggableList type fix + the vocabulary
  docs commit + (pending) the adapter.registry + progress-log commit. ecnordic: characterization baseline + the
  byte-identical engine-consumption commit. 907: characterization baseline + (pending) the empty-registry adapter commit.
- **Held for the user (Task 14, unchanged release posture):** the npm publish (≥0.5.0) + both-site repoint + lockfile
  regen + CI-green confirm, folded with Pass ROBUST + the AUTH decommission into one release. Not pushed.

### Architecture Refinement: settle ARCHITECTURE v2 + re-sequence (2026-05-26)

- **Goal met: a settled, internally-consistent ARCHITECTURE v2 + a re-sequenced build roadmap; built nothing.**
  Read the four canonical docs in full (not the brainstorm transcript), worked every CHANGE/GUARD/DEFER/open
  decision in `ARCHITECTURE-CRITIQUE.md`, and wrote the resolutions into **`docs/ARCHITECTURE.md` (v2)**,
  carrying a **§11 decision ledger** (every critique item → verdict → where it lands).
- **Headline decision: adopt `better-auth` (D1 adapter + magic-link plugin), replacing the shipped bespoke auth.**
  The critique flagged this twice (P2). Confirmed with Geoff: *"We're early yet, so we can rip anything out to
  achieve a better long-term result."* better-auth is mainstream (~25k★, ~600k+ weekly npm, checked live; bus-factor
  worry evaporates), native on Workers+D1, and is what Pages CMS uses for this exact pattern. It fixes the CRITICAL
  **C1** (single-use on strongly-consistent D1) by construction, retires the hand-rolled JWT/token lifecycle + the
  missing timing-safe compare (**H3**), and enables DB-backed session revocation (**M3**). New "Auth implementation"
  locked-decision row. The GitHub-App commit signer stays bespoke (better-auth replaces only the *editor* auth).
- **Other resolutions (full reasoning in ARCHITECTURE.md §11):** stay on Carta behind a thin `MarkdownEditor`
  interface, giving a Carta→CM6 one-file escape hatch (P3/M6); **engine-fat/theme-thin as a hard rule + drop "Hugo-like"**
  (H1/H2, updated `creating-a-cairn-site.md`; closest live analogue is Astro Starlight, not Hugo's runtime overlay);
  **Git Trees API** listing + document the 1 MB body cap, shard at a trigger (H4); **409 fail-safe** in `commitFile`
  (C3); **POST-confirm** flow (better-auth GET-redeems, so scanner-prefetch still applies; C2); governed
  `CairnExtension` contract (H5, baked into the R13 round); non-dev safety net (pre-commit validate + deploy-status +
  revert, M1); GUARD items (CI bundle/startup guards + Carta-client-only C4/M5; `/admin/healthz` + `jose` for the
  App key M2; Email-send error-wrap + Resend fallback H6; keep kit a peerDep M4).
- **Re-sequenced roadmap (was: extraction first).** **Pass AUTH** (better-auth migration + POST-confirm + roles +
  AUTH_KV→D1 allowlist migration + per-site D1 wiring) is now **first**, foundational and security-critical (the two
  CRITICALs), ships to prod. Then **Pass ROBUST** (C3/M2/guards) → **Theme-Architecture Extraction** (with the H1/M4/
  C4/H4/P3 constraints folded in) → **New Admin UI** (I/theme → J/nav → K/editing+palette+pickers+preview) →
  **collection-CRUD R8** → **extension model R13**. See the updated "planned passes (sequenced)" list above.
- **Ritual.** Docs-only pass → no code-simplifier / svelte-check / tests (nothing built). Edits: `ARCHITECTURE.md`
  (full v2 rewrite), `PLAN.md` (this entry, new locked-decision row, re-sequenced passes, risk #7/#8/#9/#10
  annotations, NEXT pointer), `creating-a-cairn-site.md` (drop "Hugo-like", engine-fat/theme-thin hard rule).
  Not committed (no-push-without-asking; edits land locally). **Next: write the Pass AUTH detailed plan.**

### Pass AUTH: migrate to better-auth (D1 + magic-link + POST-confirm + roles). Phases 0–5 DONE, Phase 6 (prod) pending (2026-05-26)

- **Goal (code half) met: the hand-rolled magic-link/signed-cookie/KV auth is GONE from the package and both
  sites; better-auth (`@better-auth` 1.6.11 + drizzle-orm 0.45.2 on Cloudflare D1) is live locally on both,
  behind a scanner-safe POST-confirm flow, with two-tier owner/editor roles and DB-backed session revocation.**
  Phases 0–5 (package + both sites + local D1 + dev smokes) are done & committed (NOT pushed); **Phase 6 is the
  prod cutover** (remote D1 apply, `AUTH_SECRET` secrets, 1.0.0 publish/repoint, Firefox prod smokes, old-secret
  decommission). Left for the user (browser clicks + prod secrets). See the NEXT pointer.
- **Verified against the REAL installed better-auth (not the plan's assumptions). Several plan corrections:**
  (1) `drizzleAdapter` **requires** the generated `schema` passed in (plan omitted it → would throw "Schema not
  found"); camelCase JS keys map to the snake_case DB columns automatically. (2) `disableSignUp:true` does **not**
  stop better-auth *emailing* unknown addresses; it still fires `sendMagicLink` (anti-enumeration) and only blocks
  user creation at verify; so the **allowlist send-gate** lives inside our `sendMagicLink` callback
  (`ctx.context.internalAdapter.findUserByEmail` → skip send if no user), engine-level, inherited by both prod and
  tests. (3) `adminRoles:['owner']` must name a role defined via the **access-control system** (default admin role
  is `admin`), so owner/editor are built with `createAccessControl(defaultStatements)` (owner = all statements,
  editor = none). (4) The plan's `databaseHooks.user.create.before` allowlist guard was **circular** (would block the
  owner-gated `createUser`), so it was dropped; `disableSignUp` + no email/password + owner-gated createUser already make the
  `user` table the allowlist. (5) Magic-link tokens are **consumed atomically on first verify** (GHSA-hc7v-rggr-4hvx);
  C1 is fixed by construction. (6) Seed/migration SQL uses **snake_case cols + ms timestamps** (plan example was
  camelCase + seconds).
- **Package (cairn-cms): new `@glw907/cairn-cms/auth` subpath** (source↔dist swap): `auth/config.ts`
  (`buildAuth`/`createAuth` factory; shared plugin set so tests run the exact config over in-mem SQLite),
  `auth/guard.ts` (`loadSession`/`requireSession`/`confirmSignIn` POST-verify proxy forwarding all Set-Cookie →
  303 /admin /C2/ + `signOut`), `auth/admins.ts` (owner-gated `adminsLoad`/`addAdmin`/`removeAdmin`/`setAdminRole`
  on `auth.api` listUsers/createUser/removeUser/setRole + `revokeUserSessions` /M3/ + anti-lockout), `auth/schema.ts`
  (generated), `auth/index.ts` barrel. `sveltekit/index.ts` is now **content-only** (list/edit/save; `editor`→`user`/
  `CairnUser`; `AdminEnv` trimmed to `GITHUB_APP_*`). Components: `ConfirmPage.svelte` (JS-free POST-confirm),
  `LoginPage.svelte` (better-auth client, neutral copy), `AdminLayout`/`ManageAdmins` read `user`/`AdminsData` from
  `/auth`. Deleted `src/lib/auth.ts` + its test. The browser client is component-local in LoginPage (keeps
  better-auth's deep client types out of the emitted `.d.ts`; otherwise `svelte-package` fails to emit). Tooling:
  `auth.cli.ts` + `drizzle.config.ts` + `auth:schema`/`auth:sql` scripts; `migrations/0000_*.sql` committed (sites
  copy it). `scripts/migrate-allowlist.mjs` (KV→D1, idempotent). better-auth + drizzle-orm are **peerDeps** (engine
  dedupe, like @sveltejs/kit), not deps.
- **Tests: 7 integration tests over real better-auth + in-mem better-sqlite3** (allowlist send-gate: no email to
  strangers; positive send; single-use verify /C1/; confirmSignIn POST→303+cookie & replay→login /C2/; requireOwner
  401/403; full owner add→list→re-role(+revoke)→remove cycle; anti-lockout self-remove/demote). Package **32 tests**
  green (replaced the old hand-rolled auth suite), clean `svelte-package` (emits `dist/auth`).
- **Both sites cut over + locally verified.** Per site: `wrangler.toml` +`AUTH_DB` (D1) + `migrations_dir` + `[vars]
  BETTER_AUTH_URL` (AUTH_KV kept for rollback grace); `app.d.ts` `Locals.auth`/`user` + `AUTH_DB`/`AUTH_SECRET`/
  `BETTER_AUTH_URL`; `hooks.server.ts` per-request `createAuth`+`loadSession`+guard (theme transform preserved);
  `api/auth/[...all]` catch-all; `admin/auth/confirm` shims; `admin/auth/logout`→`signOut`; `admin/admins` shim →
  `/auth`; **removed** `admin/auth/{request,callback}` + `login/+page.server.ts` (siteName now merges from the layout
  load); committed `drizzle/migrations`. `diff -rq` confirms the two sites' `admin/`+`api/` trees stay **byte-identical**
  (F2 invariant; only `cairn.config.ts` differs). Both `svelte-check` **0/0**, Cloudflare `npm run build` OK (better-auth
  bundles fine, under the size wall). **Live `wrangler dev` (each site, local D1, owner seeded):** `/admin`→303 login,
  `/admin/login`→200 (proves `createAuth`+`loadSession`+D1 in-worker), `/`→200, `/admin/auth/confirm`→200, catch-all
  `get-session`→200, **non-allowlisted sign-in→200 with NO email sent** (allowlist gate), old `/admin/auth/request`→404.
  (Full email→click→session round-trip can't be reproduced locally, as tokens are stored hashed, so it's the user's
  Firefox step, same posture as every prior go-live; the crypto/flow is covered by the integration tests.)
- **Risks (code-resolved by construction; flip to RETIRED at prod cutover):** **C1** (single-use): atomic on D1 by
  construction. **C2** (scanner prefetch): POST-confirm built + tested. **H3** (timing-safe / token lifecycle): lib
  owns it, origin is config-derived (`PUBLIC_ORIGIN`/`BETTER_AUTH_URL`, never request-derived). **M3** (session
  revocation): `revokeUserSessions` on re-role/remove. Risks **#7/#8/#10** move to resolved-pending-prod.
- **code-simplifier** run over the new package auth code: doc-comment-only polish on `config.ts` (no logic); rest clean.
- **Phase 6: SHIPPED to prod (user-authorized "everything up to the push", 2026-05-26).** Remote D1 migrated on both;
  the Pass-G KV allowlist migrated into D1 via `migrate-allowlist.mjs --remote`. **The remote KV entries were legacy
  bare strings** (decoded as `editor`, not the JSON owner Pass G claimed), so a direct `UPDATE … role='owner'` fixed
  Geoff to `owner` in both remote DBs; `AUTH_SECRET` (distinct per site) set on both workers. Published
  **`@glw907/cairn-cms@0.4.0`** (NOT 1.0, unproven end-to-end; user's call) via the OIDC Trusted-Publishing workflow
  (`v0.4.0` release → `publish.yml` green → `npm latest`=0.4.0). Both sites repointed `^0.3.1`→`^0.4.0` + added
  `better-auth`/`drizzle-orm` deps, lockfiles regenerated (Pass P isolated-temp-dir → registry tarball), `npm ci`
  dry-run clean, symlink relinked to source for local dev. **Both CI deploys green**; prod wiring smoked (see NEXT
  pointer): `/api/auth/get-session`→200 `null` confirms `createAuth`+`loadSession` run against the live remote D1 +
  AUTH_SECRET. **Two user steps remain** (Firefox magic-link click-through + post-smoke decommission of
  MAGIC_LINK_SECRET/SESSION_SECRET/AUTH_KV; see NEXT pointer). Old secrets/KV left in place for rollback grace.

### Pass ROBUST: commit/runtime robustness (code half DONE; not released) (2026-05-26)

- **Goal met (code half): the four robustness items are built + verified locally across the package and both sites.**
  Ships to prod on the next cairn-cms release (≥0.5.0), folded into the same publish/repoint as the pending AUTH
  decommission (one release, not two). Committed locally; not pushed (no-push-without-asking).
- **C3: concurrent-edit 409 fail-safe.** `commitFile` (`src/lib/github.ts`) now catches a stale-sha `409` from the
  contents-API PUT and throws a typed **`CommitConflictError`** (defined + caught inside the package, so `instanceof`
  is reliable, no peer-boundary identity split). `saveCommit` (`sveltekit/index.ts`) translates it to a 303 back to
  the editor with `?error=This file changed since you opened it; reload and reapply your edits.` Fails **safe**; full
  three-way merge stays out of scope. Unit-tested (read-sha→409→`CommitConflictError`).
- **M2: GitHub-App signer guard.** New `signingSelfTest(appId, privateKeyB64)` in `github.ts` signs a dummy JWT
  (exercising the brittle PKCS#1→PKCS#8 conversion + Web Crypto import/sign) and returns `{ok, detail}` without
  throwing or leaking the key. New `healthLoad` (`sveltekit/index.ts`) + a byte-identical **`/admin/healthz`**
  `+server.ts` JSON shim on both sites (behind the `/admin` guard) surface it. New `docs/github-app-key-rotation.md`
  documents rotation incl. the conversion step. **`jose`/`importPKCS8` evaluated and deferred.** It removes the
  JWT-assembly code but NOT the PKCS#1→PKCS#8 conversion (GitHub issues PKCS#1), and the fixture test + healthz cover
  the real failure mode, so the lean zero-dep signer is retained (documented in the rotation doc). Unit-tested
  (self-test ok for a valid key; non-throwing failure detail for a bad key).
- **C4: Carta/Shiki server boundary.** New `src/tests/carta-boundary.test.ts` scans every `.ts` module under
  `src/lib` and asserts none imports `carta-md` (it may be imported only from `.svelte` components, which mount the
  editor client-side). Keeps Shiki out of the Worker route/auth logic by construction.
- **M5: Workers edge guards (both sites).** Pinned `wrangler` to `^4.93.1` as a devDep in **907-life** (ecnordic
  already had it; patched 907's standalone lockfile, where wrangler was already resolved at 4.94.0, dev). Bumped
  `compatibility_date` `2025-01-25`→`2025-05-05` on both (`nodejs_compat` already set). Added a **`wrangler deploy
  --dry-run`** "Bundle guard" step to both `deploy.yml` (after Build, before Deploy) to fail a deploy on a size/startup
  regression. **Lazy-init audit:** the only module-level instantiation in the package is `new TextEncoder()` (trivial);
  `createAuth` is per-request, Carta is client-only. No heavy top-level init to defer.
- **Verified.** Package **36 tests** green (+4: 409-conflict, two signing self-test, carta-boundary). Both sites
  `svelte-check` **0/0** (after `svelte-kit sync` generated the new healthz `$types`). Both `npm run build` + `wrangler
  deploy --dry-run` succeed: ecnordic **2380 KiB gzip**, 907 **2294 KiB gzip**, both well under the 10 MB Paid wall
  (and even the 3 MB Free wall). Live `wrangler dev` smoke (ecnordic): `/admin/healthz` anon → **303** `/admin/login`
  (route mounts + is guarded), `/` → 200. The authed-JSON healthz response needs a real session; folded into the same
  Firefox smoke as the pending AUTH cutover step.
- **code-simplifier** run over the changed package code: one refinement (ternary→if/else in `healthLoad`); rest clean.
- **Risks moved:** **C3 (#9)** → BUILT (fail-safe + test). **M2 (#17, key half)** → guarded (healthz self-test +
  rotation doc; fixture test already existed). **C4 (#12)** → guarded (boundary test + CI dry-run). **M5 (#17, edge
  half)** → guarded (wrangler pin + compat bump + dry-run + audit). All flip to RETIRED when the release ships them.
- **Files.** Package: `src/lib/github.ts`, `src/lib/sveltekit/index.ts`, `src/tests/github-commit.test.ts`,
  `src/tests/carta-boundary.test.ts` (new), `docs/github-app-key-rotation.md` (new), `docs/PLAN.md` (this).
  Both sites: `src/routes/admin/healthz/+server.ts` (new), `wrangler.toml`, `.github/workflows/deploy.yml`;
  907 also `package.json` + `package-lock.json`.

### Pass 0: bootstrap (2026-05-24)

- **Workspace install:** DONE. `npm install` at root clean (472 pkgs; 9 npm-audit advisories,
  none blocking; revisit before publish).
- **Both sites build:** DONE. ecnordic ~2.9s, 907-life ~4.1s, both via
  `@sveltejs/adapter-cloudflare`; no path/lockfile breakage from the move.
- **GitHub App:** registered. App ID `3847496`, Installation ID `135372268` (single install
  covering both repos). Private key stored base64 as `GITHUB_APP_PRIVATE_KEY_B64` in the
  encrypted registry (machine-local pointers in the workspace `CLAUDE.md`). Commit-path smoke
  test DONE. App JWT (RS256) → install token → read `package.json` from both repos (HTTP 200);
  risk #2 retired modulo confirming the same under `nodejs_compat` in Pass A's `wrangler dev`.
- **Email path:** Email Sending product chosen. See risk #1 follow-up below.

### Pass A: magic-link auth skeleton in ecnordic-ski (2026-05-24)

- **Built.** New: `src/lib/cairn/{auth,email}.ts`, `src/routes/admin/**`
  (login, page, `auth/request|callback|logout`), `src/tests/cairn/auth.test.ts`. Changed:
  `app.d.ts` (+`Locals.editor`, AUTH_KV/EMAIL/secrets), `hooks.server.ts` (`/admin/**` guard),
  `wrangler.toml` (+AUTH_KV `73e2f799e9864398ab5e57c02272fe04`, +EMAIL binding). Removed dead
  Sveltia `static/admin/`, which was shadowing the new `/admin` route as a static asset (backlog
  #4 / STATUS reconciliation still deferred to Pass F).
- **Verified.** `svelte-check` clean; 44/44 vitest (incl. 10 auth crypto / single-use / session
  tests). Live under `wrangler dev`: anon `/admin`→login; cross-origin POST→403; non-allowlisted
  rejected; bad/expired token rejected; synthesized valid session renders authenticated `/admin`.
  AUTH_KV seeded `editor:geoff-login@907.life`→"Geoff Wright" (local + remote).
- **DONE: verified end-to-end (2026-05-25).** Account upgraded to **Workers Paid**; **Email
  Sending** onboarded for ecnordic.ski via dashboard (cf-bounce MX/SPF/DKIM + `_dmarc`, all
  resolve). Live magic link delivered → clicked → authenticated `/admin` ("Signed in as Geoff
  Wright") in Firefox. The full chain (Email Sending → single-use KV token → session → guard)
  works in reality.
- **Origin gotcha + fix.** `wrangler dev`'s `custom_domain` route makes `url.origin` resolve to
  the prod host, so dev magic links pointed at production (404 on first click). Fix: `PUBLIC_ORIGIN`
  override (ecnordic `a4b87a3`); set in dev `.dev.vars`, unset in prod so prod uses
  `https://ecnordic.ski`. Commits: ecnordic `756c54a` (skeleton) + `a4b87a3` (origin fix).
  **cairn-cms has a private remote** (`github.com/glw907/cairn-cms`); dependency-pinning is Pass F.
- **Prod `/admin` left intentionally dormant.** Only step remaining to make it live (optional,
  not a Pass A blocker): `wrangler secret put MAGIC_LINK_SECRET` and `SESSION_SECRET` in prod
  (prod AUTH_KV allowlist already seeded; deploy already includes the routes). GitHub-App secrets
  unused until Pass C.

### Pass B: read/list + Carta preview in ecnordic-ski (2026-05-25)

- **Built.** New: `src/lib/cairn/github.ts` (contents-API read client: `listMarkdown`,
  `readRaw`, token-optional), `src/lib/cairn/carta.ts` (pure preview-options/transformer
  wiring, deliberately *no* `carta-md` import so the node test env can load it),
  `src/routes/admin/+page.server.ts` (lists collections from the repo),
  `src/routes/admin/edit/[type]/[id]/{+page.server.ts,+page.svelte}` (loads raw md, renders
  the Carta preview client-side), `scripts/mint-session.mjs` (dev smoke helper that signs a
  session cookie so the guard can be exercised without the email loop). Changed:
  `src/lib/markdown/render.ts` (now exports `remarkEcPlugins`/`rehypeEcPlugins`, the shared
  plugin set), `src/lib/config.ts` (+`CAIRN_REPO`, `CAIRN_COLLECTIONS`),
  `src/routes/admin/+page.svelte` (renders the list). Added dep: `carta-md@4.11.2`.
- **Verified.** `svelte-check` clean; 56/56 vitest (new: 9 github-client + 3 preview-wiring
  tests). Cloudflare build succeeds with Carta bundled (no SSR/Shiki breakage; preview is
  mounted client-only behind a `browser` guard). Live `GET` against the **public** repo's
  contents API confirmed the shapes `github.ts` relies on (dir listing, `Accept:
  application/vnd.github.raw` body, 404→null). Under `wrangler dev` with a minted session:
  anon `/admin`→303 login; authed `/admin`→200 listing Posts+Pages **from the live repo**;
  `/admin/edit/pages/training`→200 (title, path, SSR placeholder); missing file & unknown
  collection→404. The in-Worker GitHub read path therefore works end-to-end.
- **Carta wiring (risk #3 retired).** Carta v4.11's processor is fixed as `remarkParse → gfm
  → [remark transformers] → remark-rehype(rehypeOptions) → [rehype transformers] →
  stringify`. We inject ecnordic's exact plugin set as **sync** transformers at the two
  phases (`previewTransformers`), set `rehypeOptions.allowDangerousHtml` + `sanitizer:false`
  to match `render.ts`'s trusted-content posture (sanitizing would strip EC primitives). The
  shared `render.ts` arrays guarantee parity; the wiring (phase order, sync flag, each plugin
  registered) is unit-tested. **One manual confirmation left:** the client-side *visual*
  render of a directive page in Firefox (Carta executes JS in-browser; curl only sees the SSR
  placeholder); structurally guaranteed, same posture as Pass A's final browser-click step.
- **Read auth deferred to Pass C (by design).** Reads are anonymous today because the
  ecnordic repo is **public**; `github.ts` already accepts an optional token, so Pass C drops
  in the GitHub App installation token for the commit path, private repos (907-life), and the
  authenticated 5000/hr limit, with no refactor. Risk #2's in-Worker caveat thus stays open until
  Pass C exercises the App JWT under `nodejs_compat`.

### Pass C: edit + commit in ecnordic-ski (2026-05-25)

- **Built.** New: `src/lib/cairn/content.ts` (`serializeMarkdown`, gray-matter stringify, the
  inverse of the loader's parse), `src/routes/admin/save/+server.ts` (POST commit endpoint).
  Extended `src/lib/cairn/github.ts` with the **write path**: `appJwt` (RS256 via Web Crypto,
  incl. PKCS#1→PKCS#8 wrap), `installationToken`, `fileSha`, `commitFile` (contents-API PUT,
  author = editor / committer omitted → `cairn-cms[bot]`, sha-on-update vs create). Changed:
  `src/lib/cairn/auth.ts` (export `bytesToB64url` for the JWT encoder),
  `admin/edit/[type]/[id]/+page.server.ts` (load returns full `frontmatter` + `saved`/`error`
  flags), `+page.svelte` (render-only preview → real editor: per-type frontmatter form +
  Carta `MarkdownEditor` mounted client-only, hidden `body` input carries the value to the form).
  No new deps (zero-octokit ethos held; `gray-matter` already present).
- **Verified.** `svelte-check` clean (0 errors / 0 warnings); 62/62 vitest (new: 4 github-commit
  (JWT verifies against a PKCS#1 fixture via Web Crypto, token exchange, commit body shape for
  update + create; 2 content round-trip). Cloudflare `npm run build` succeeds with Carta's
  `MarkdownEditor` bundled (client-only mount keeps Shiki off the Worker). **Real GitHub check:**
  the hand-rolled signer minted a live `ghs_` installation token and authenticated a read; risk
  #2 retired (see register). The contents-API author≠committer attribution is structurally
  guaranteed + unit-tested.
- **CSRF/origin.** `/admin/save` relies on SvelteKit's built-in same-origin POST check (same
  posture as the contact remote fn); cross-origin form posts → 403. Bad frontmatter is caught
  from the site validators and bounced to `?error=` rather than 500ing.
- **DONE: verified end-to-end against real `main` (2026-05-25).** With the App secrets in
  `.dev.vars`, a minted session POSTed `/admin/save` for `pages/volunteers` under `wrangler dev`;
  the full chain ran live (session → frontmatter validate → serialize → real App-JWT install
  token → commit). Resulting commit on `origin/main` (`7948da0 "Update pages: volunteers"`):
  **author = Geoff Wright `<geoff-login@907.life>`, committer = `cairn-cms[bot]`**, exactly the
  attribution the spec requires. Diff was clean: the directive-heavy body (`:::passage`,
  `:::grid`) round-tripped **byte-for-byte**; the only change was gray-matter unquoting the title
  (`"Volunteers"` → `Volunteers`). Prod `/admin` stays dormant (prod Workers still lack the auth
  + App secrets).
- **Follow-up (diff noise, not a blocker).** gray-matter's `stringify` reserializes frontmatter
  on every save (unquotes scalars; would also reflow post `tags` arrays to block style, restyle
  dates). Content/directives are never touched. If minimal diffs matter, a Pass D/F task can give
  the adapter a faithful frontmatter serializer (or js-yaml flow options). Logged here, not yet
  ticketed.

### Pass D: cairn-core seam refactor in ecnordic-ski (2026-05-25)

- **Goal met: the adapter contract is real, no behavior change.** All site specifics now sit
  behind a single `CairnAdapter` the core consumes; cairn-core no longer hard-codes a repo,
  collection, tag, directive, sender, or site name.
- **Built.** New: `src/lib/cairn/adapter.ts` with the core interface (`CairnAdapter`,
  `CairnCollection`, the `CairnField` discriminated union: text/date/textarea/boolean/tags) plus
  two pure helpers `findCollection` and `frontmatterFromForm` (decodes a posted form per field
  type (boolean→`==='on'`, tags→`getAll`, else `get`). New: `src/lib/cairn.config.ts`:
  ecnordic's adapter instance (siteName, sender, backend repo, preview plugin set from
  `render.ts`, and the posts/pages collections with their `fields` + `validate` wrappers).
- **Rewired (generic now, was per-type branches).**
  `config.ts` lost `CAIRN_REPO`/`CAIRN_COLLECTIONS`/`CairnCollectionType` (moved into the
  adapter). `save/+server.ts` is fully adapter-driven: `findCollection` → `frontmatterFromForm`
  → `collection.validate` → commit, no `if (type==='posts')`. `edit/[type]/[id]/+page.server.ts`
  resolves the collection from the adapter and returns its `fields` to the form. `+page.server.ts`
  (list) iterates `cairn.collections`. `email.ts` `sendMagicLink` gained a `from` param (dropped
  the hard-coded `noreply@ecnordic.ski`); `auth/request` passes `cairn.sender`/`cairn.siteName`.
- **Generic frontmatter form (DaisyUI preserved).** The edit `+page.svelte` now renders
  `data.fields` through one `{#each}` with a branch per field type, reusing the exact DaisyUI
  markup the hand-written posts/pages forms had, producing byte-identical output, just data-driven.
  Branding (`siteName`) threads through the **admin `+layout.server.ts`** load so the login/list
  pages stay free of the adapter import (keeps the plugin graph out of those client bundles);
  the edit page already bundles the adapter for `cairn.preview`, so it reads `data.siteName` too.
- **Verified.** `npm run check` clean (0/0) after `svelte-kit sync` regenerated `$types`;
  67/67 vitest (new `adapter.test.ts`: `findCollection` hit/miss + `frontmatterFromForm` across
  posts all-fields / draft-off+no-tags / pages-title-only; guards that the generic decode
  reproduces the retired per-type code). Cloudflare `npm run build` succeeds (editor bundle
  rebuilt, Carta still client-only). code-simplifier run: one consistency fix (edit-page title
  `cairn.siteName`→`data.siteName`), rest sound.
- **Note.** No live `wrangler dev` re-run this pass. It's a pure refactor with identical wiring,
  the unit tests pin the decode equivalence, and Pass C already verified the live save→commit
  chain. The adapter shape is what Pass E's 907-life adapter will implement against.

### Pass E: extract cairn-core to the package (2026-05-25)

- **Goal met: cairn-core is now a real workspace package.** The six framework-agnostic `.ts`
  modules moved out of `ecnordic-ski/src/lib/cairn/` into `cairn-cms/src/lib/`, ecnordic now
  `import … from 'cairn-cms'`, and nothing changed behaviorally; verified by byte-identity
  diffs against the pre-move originals and the unchanged test suites.
- **Clean boundary.** Six modules (`auth`, `email`, `github`, `carta`, `content`, `adapter`)
  with only sibling `./` cross-imports (`github→auth`, `adapter→carta`/`github`). External
  surface is tiny: **`gray-matter`** is the only runtime dep; `unified` (in `carta.ts`) and
  `@cloudflare/workers-types` are **type-only** (devDeps). `carta.ts` deliberately does *not*
  import `carta-md` (it duck-types a local `PreviewCartaOptions`), so the Svelte editor stays
  ecnordic's own dep, so the core has zero Svelte-component coupling. gray-matter's `fs` require
  is a non-issue (Pass C already ran `serializeMarkdown` live in the worker).
- **Package shape: the `publishConfig` swap.** Checked-in `package.json` `exports` point all
  three conditions (`types`/`svelte`/`default`) at **source** `./src/lib/index.ts`, so every
  workspace tool (Vite dev *and* the sites' prod worker build, `svelte-check`, vitest) resolves
  straight to source, instant, no build step, zero consumer config (the npm-workspace symlink
  `node_modules/cairn-cms → ../cairn-cms` is noExternal by default, so `vite build` transpiles
  the source into the worker). `publishConfig.exports` swaps those to `./dist/**` **only at
  `npm publish`**; `svelte-package` builds `dist/` at **`prepublishOnly`** (not `prepare`, so
  `npm install` never triggers a build). `files` ships `dist` + `src/lib`; `dist` is gitignored.
  A `tsconfig.json` (scoped to `src/lib/**`) was added beyond the original file list; it's
  required for `svelte-package`'s declaration emit (the workspace root has none to inherit).
- **Why not a `development` export condition (the approach I first drafted, then rejected).**
  Primary-source research ([TS modules reference]) confirmed TypeScript **always** matches
  `"types"`/`"default"` first regardless of object order and ignores custom conditions for type
  resolution, so `customConditions:["development"]` + `types→dist` would force a `dist` build
  just to type-check, defeating instant dev. The **`publishConfig` swap is the proven pattern**
  (Skeleton's monorepo) and needs no `customConditions`, no consumer config. The source-pointing
  exports were validated against the worker build at the Task 1 gate. The documented `--watch`
  fallback was **not** needed.
- **Public API = flat `export *` barrel** (`src/lib/index.ts`) of all six modules. No
  export-name collisions (each module's identifiers are distinct).
- **Importers rewired (10).** `save/+server.ts` (Task 1) + nine more in Task 2: `app.d.ts`,
  `hooks.server.ts`, `cairn.config.ts`, `admin/+page.server.ts`, the two `edit/[type]/[id]/`
  files, and the three `auth/*` endpoints. Each `from '$lib/cairn/<mod>'` → `from 'cairn-cms'`,
  same bindings, type-only stays `import type`; multi-module imports collapsed to one cleanly.
  `+layout.server.ts` never imported a cairn *module* (only `$lib/cairn.config`), so it was
  untouched, which is correct. The in-tree `src/lib/cairn/` + `src/tests/cairn/` dirs are deleted.
- **Verified.** Package: `npm test` 33/33 across 6 suites (auth crypto/single-use/session,
  github read, github-commit JWT/commit-body, carta-preview wiring, adapter, content);
  `npm run package` emits all six modules + `index` as `.js`/`.d.ts`/`.d.ts.map` to `dist/`
  (publish path sound). ecnordic: `svelte-check` 0/0 (468 files), proving TS resolves
  `cairn-cms`→source `.ts` via the `types` condition with no `dist`; Cloudflare `npm run build`
  succeeds (Carta still client-only, source bundled from the symlink); vitest 34/34 (the six
  moved suites now live in the package). **Live `/admin` smoke** under `wrangler dev` with a
  minted session: anon→`303 /admin/login`, authed→`200` (Posts+Pages from the live repo),
  `edit/pages/training`→`200`; the moved imports load in-worker.
- **Finding: the locked-decision slug-codec seam is unneeded.** The admin is **filename-based**
  (`[id]` is the bare filename stem), so day-bearing (907-life) and dayless (ecnordic) filenames
  already flow through the Pass D abstraction unchanged. The abstraction is cleaner than planned.
  Recorded so Pass F's 907-life adapter doesn't reintroduce a codec.
- **Deferred to Pass F (unchanged scope):** sharing the admin **Svelte components**/routes (the
  package shape now supports it), private-repo read-token threading, removing `static/admin/`,
  the ROADMAP entry.
- **Two cheap cleanups surfaced by review (logged for Pass F, not blockers):** (1) `bytesToB64url`
  is exported from `auth.ts` only because `github.ts` needs it, which leaks it into the public
  `export *`; move it to an unexported `src/lib/utils.ts`. (2) the package `tsconfig.json`
  `include` omits `src/tests`, so package tests are type-checked only by vitest/esbuild, not
  `tsc`; widen it (or add a `tsconfig.test.json` + vitest `typecheck`) before the test surface
  grows. **Note on this pass's ritual:** the code-simplifier step was a no-op. The module/test
  bodies are *verbatim* moves of already-simplified Pass A–D code (running it would risk breaking
  the byte-identity the extraction guarantees), and the only truly new artifacts are config
  scaffolding (`package.json`, barrel, `svelte.config.js`, `vitest.config.ts`, `tsconfig.json`).

### Pass F: onboard 907.life (consumer #2) + cleanup (2026-05-25)

- **Goal met: the adapter abstraction is validated on a second design.** 907.life now has the
  cairn admin at `/admin`, driven by its own `src/lib/cairn.config.ts` against the real
  `cairn-cms` package. A different design (ET Book / plain markdown, no directives), filename
  ids with a day (`YYYY-MM-DD-slug`, no slug codec), free-form tags, `silk`/`dim` DaisyUI
  themes, with **no cairn-core change** required for the design difference. The core consumed
  only the adapter, exactly as designed in Pass D.
- **Scope decision (mid-pass): SPLIT into F + F2.** The initial call was "extract the shared
  admin shell now (DRY)", but on assessment that bundled a risky refactor of the *live* ecnordic
  admin with a greenfield onboarding + a speculative package-surface redesign (~2 passes). Re-scoped:
  **F = onboard 907 by duplication + cleanup** (isolated, zero ecnordic risk, directly validates
  the adapter on site #2); **F2 = extract the shared shell** against both now-working sites (added
  to Planned passes). This matches the plan's own "build on ecnordic, extract after it runs on
  both" philosophy: extract against real duplication, not a guess.
- **Built (907-life).** New: `src/lib/cairn.config.ts` (posts-only adapter; empty preview
  plugins; Carta's built-in remarkParse→gfm→remark-rehype→stringify mirrors the live
  remark+gfm+remark-html), `src/lib/content-schema.ts` (`validatePostFrontmatter`: title/date/
  description/draft + **free-form tags**, its own `isoFromValue` Date-coercion), the full
  `src/routes/admin/**` (layout, list, login, `auth/{request,callback,logout}`, `edit/[type]/[id]`,
  `save`). Changed: `wrangler.toml` (+`EMAIL` remote send_email, +`AUTH_KV`
  `9dff7ea324db4d5db8ca0e8e54078e68`, 907's **own** namespace, per-site allowlist seeded
  `editor:geoff-login@907.life`→"Geoff Wright"), `app.d.ts` (+cairn bindings/secrets,
  `Locals.editor`), `hooks.server.ts` (+`/admin/**` guard, kept the theme transform),
  `package.json` (+`carta-md@4.11.2`; `cairn-cms` resolves via the workspace symlink, same as
  ecnordic). Removed dead Sveltia `static/admin/` (config never wired).
- **Free-form tags (the one real contract gap).** ecnordic's `tags` field is a controlled-vocab
  checkbox set; 907's tags are free-form. The shared `CairnField`/`frontmatterFromForm` don't
  model that, so (since F duplicates rather than shares) 907 keeps tags **out** of the adapter
  `fields` and handles them in its own routes: a comma-separated text input in the edit page +
  a `parseTags` (split/trim/dedupe) in `save` that folds the array in before `validate`. **F2
  should fold this into the contract** (e.g. a `freetags` field type) so the shared form covers
  both. Logged in the Pass F2 scope.
- **Finding: 907.life is PUBLIC, not private.** The plan's premise was wrong. First wired
  token-threaded reads ("private repo"); a live check (App-JWT install token minted, listed 8
  files, `readRaw` 5421 bytes) confirmed token reads work, but the **anonymous** read of the
  same repo *also* succeeded → `gh repo view` confirms both ecnordic and 907 are PUBLIC.
  Realigned 907 to **match ecnordic exactly**: anonymous reads, install token minted only on
  the commit path. Deleted the bespoke `cairn-token.ts` helper; the list/edit loads + `save` are
  now byte-identical to ecnordic's (live-verified Pass A–C code) **except** the free-form-tags
  lines, which is precisely what makes F2's extraction target clean. (Authenticated reads for
  the 5000/hr limit remain a *possible* shared optimization for F2, not a per-site divergence.)
- **Verified.** Package: 33/33 vitest, clean `svelte-package`, `bytesToB64url` no longer in the
  public `dist/index.d.ts` (carry-over cleanup #1). ecnordic unaffected by the package change:
  `svelte-check` 0/0 (469 files), 34/34 vitest. 907: `svelte-check` 0/0 (370 files), Cloudflare
  `npm run build` succeeds with Carta's `MarkdownEditor` bundled (client-only mount). Live under
  `wrangler dev`: anon `/admin`→`303 /admin/login`, `/admin/login`→`200`, public `/`→`200`,
  unauth `/admin/save`→`303` (guard redirects before the handler; CSRF 403 sits behind the
  guard for authenticated cross-origin posts, same as ecnordic). Worker booted clean (bindings
  parse). **One manual confirmation left** (same posture as Pass A/B's final browser step): a
  real magic-link login + save→commit on 907 once prod secrets are set. The chain is
  byte-identical to ecnordic's verified Pass A–C path apart from `parseTags` (pure) + the
  validator (unit-simple).
- **Carry-over cleanups (both done).** (1) `bytesToB64url` moved from `auth.ts` into an
  unexported `src/lib/utils.ts` (imported by `auth.ts` + `github.ts`); no longer leaks through
  the `export *` barrel. (2) package `tsconfig.json` `include` widened to cover `src/tests`.
- **Docs.** 907 `CLAUDE.md`/`architecture.md`/`STATUS.md`/`ROADMAP.md` updated (cairn admin
  replaces Sveltia; the stale "multi-repo engine / Better Auth" ROADMAP entries reconciled).
  ecnordic backlog **#4** (Sveltia) closed → Done (resolved by removal, superseded by cairn).
- **code-simplifier.** Run over the new 907 code (verbatim route copies left alone).
  It merged a duplicate `@sveltejs/kit` import and converted an arrow-const helper to a
  `function`; it also *removed* two `as string` casts in the validator that TS actually needs
  (the `never`-fail narrowing doesn't hold here; ecnordic keeps them) → caught by `svelte-check`
  and reverted.
- **Risk #5 (workspace/CI linking): dev half re-confirmed on a 2nd site.** 907 resolves
  `cairn-cms`→source via the same workspace symlink + `publishConfig`-swap exports as ecnordic
  (check/build/wrangler-dev all clean, zero consumer config). The **CI pinned-version half is
  still open** (no published version yet; both sites rely on the local symlink); carry to F2 or
  a publish pass.

### Pass F2: extract the shared admin shell into the package (2026-05-25)

- **Goal met: the admin shell is now in `cairn-cms`, consumed by both sites as thin shims.**
  The admin route files in `ecnordic-ski/` and `907-life/` are now **byte-identical** (verified
  by `diff -rq`) except each site's `src/lib/cairn.config.ts`. All real logic moved into the
  package; no behavior change (gated by both test suites + a live `wrangler dev` smoke on both).
- **Two new package subpath exports** (each with the source↔dist `publishConfig` swap, same
  shape as the `.` entry from Pass E):
  - **`cairn-cms/sveltekit`** (`src/lib/sveltekit/index.ts`): the route **server logic** as
    plain functions taking the SvelteKit event (typed *structurally*, so the package never
    depends on the site-generated `App.*` ambient types) + the site `CairnAdapter`:
    `adminLayoutLoad`, `adminListLoad`, `loginLoad`, `editLoad`, `authRequest`, `authCallback`,
    `logout`, `saveCommit`, plus an `AdminEnv` binding interface and the load return types.
  - **`cairn-cms/components`** (`src/lib/components/index.ts`): the Svelte shell: `AdminLayout`,
    `AdminList`, `LoginPage`, `EditPage`. SvelteKit filesystem routing forces the route *files*
    to live per-site, so each is a one-line shim (`<AdminList {data} />`, etc.). `EditPage` takes
    the adapter's `preview` plugins as a prop.
- **New peer deps:** `@sveltejs/kit` (the server module throws `redirect`/`error`) and `carta-md`
  (the `EditPage` editor). Both also devDeps so `svelte-package` can type-emit.
- **The free-form-tags contract gap is closed.** Added a **`freetags`** `CairnField` type +
  a `frontmatterFromForm` case (comma-split → trim → de-dup, exactly 907's old route-local
  `parseTags`). 907's adapter now declares `{ type: 'freetags', name: 'tags' }`; its bespoke
  edit/save tag handling is gone, so its routes collapsed to the shared shims. ecnordic's
  controlled-vocabulary `tags` checkboxes are unchanged. (+2 adapter unit tests; 35/35 package.)
- **`$app/environment` avoided in the packaged editor.** The per-site edit route gated the Carta
  `MarkdownEditor` (SSR-unsafe, pulls Shiki) behind `$app/environment`'s `browser`. That module
  has no types outside a SvelteKit app, so `EditPage` uses an `onMount`-set `mounted` flag instead
  (fires only client-side), giving the same SSR-safe outcome with no kit-module coupling in the component.
- **The `instanceof`-across-the-peer-boundary risk is RETIRED.** The plan flagged that
  `redirect`/`error` thrown inside the package must share class identity with the host's
  `@sveltejs/kit` runtime or they'd 500 instead of redirecting. Live-verified under `wrangler dev`:
  a same-origin `POST /admin/auth/request` with a bad email → **303** `Location:
  /admin/login?error=invalid` (ecnordic) / `?error=config` (907); a bogus-collection `POST
  /admin/save` → **400** (not 500). Both prove the thrown kit objects are recognized. This holds
  because npm dedupes a **single** `@sveltejs/kit` to the workspace root that the package and both
  sites all resolve.
- **Forced toolchain alignment (decision, with the user).** Making the package import
  `@sveltejs/kit` forces a single root kit, and kit peer-resolves one `vite`. The two sites
  were on **different vite majors** (ecnordic `vite@8`/`plugin-svelte@7`/`adapter-cloudflare@7`,
  907 `vite@6`/`@5`/`@5`). A single shared kit can't serve two vite majors (it leaked `vite@8`
  into 907's `vite@6` type-world → `907/vite.config.ts` failed `svelte-check`). Resolved by
  **aligning 907 up to ecnordic's toolchain** (the user chose this over decoupling the package
  from kit). 907 build then hit a `vite@8`/rolldown stricter-resolution error on its Pagefind
  dynamic import (`import('/pagefind/...' + '.js')`), fixed to ecnordic's `/* @vite-ignore */`
  pattern. After a clean reinstall: one `vite@8` + one `kit@2.61.1` workspace-wide.
- **Verified.** Package: 35/35 vitest, clean `svelte-package` (components + sveltekit module emit
  `.js`/`.d.ts` to `dist/`; `bytesToB64url` still absent from the public barrel). ecnordic:
  `svelte-check` 0/0 (469 files), Cloudflare build OK, 34/34 vitest. 907: `svelte-check` 0/0
  (381 files), Cloudflare build OK on the upgraded toolchain. Live `wrangler dev` smoke on **both**:
  anon `/admin`→303 login, `/admin/login`→200, `/`→200, package-thrown redirect/error fire
  correctly in-worker (above), and on ecnordic (with a minted session + `.dev.vars`) authed
  `/admin`→200 listing, `edit/pages/training`→200, `edit/posts/<missing>`→404.
- **code-simplifier.** Run over the new package code. One change: the `EditPage` `fm*` helpers
  converted from arrow-consts to `function` declarations (no behavior change). Route shims left
  alone (trivial one-liners); component markup/DaisyUI classes untouched (host-styled).
- **Risk #5 (workspace/CI linking): CI half now CONFIRMED BROKEN (pre-existing, not caused by
  F2).** Investigating the post-push deploys exposed that **both sites' GitHub Actions deploys are
  red, and have been since the package work**. `npm ci` runs against a **stale committed
  `package-lock.json`** (ecnordic's is missing `carta-md`+shiki, unrefreshed since Pass B; 907's is
  stale from this pass's dep bump) **and** neither site declares `cairn-cms` as a resolvable
  dependency (it only resolves via the local workspace symlink, absent in a standalone CI clone).
  Local `vite build` succeeds (workspace symlink); **CI cannot install**. This is the deferred
  risk-#5 CI half, now urgent. The fix is a real **publish/pin pass**: publish or git-pin
  `cairn-cms`, add it to each site's deps, and regenerate + commit each site's standalone lockfile.
  Out of F2's scope (code extraction), flagged as the recommended immediate next task.

### Pass P: publish/pin cairn-cms; CI deploys green (2026-05-25)

- **Goal met: both sites' CI deploys are GREEN**, consuming a published package. Risk #5's CI
  half is **RETIRED**.
- **Published `@glw907/cairn-cms@0.1.0`** to the **public npm registry** (user's call: the
  best path for others to adopt cairn (`npm install`, no tokens, semver). MIT-licensed,
  `private` dropped, README refreshed.
- **Scoped name forced.** npm rejected the unscoped `cairn-cms` (too similar to an unrelated
  existing package `cairncms` (a Vue/SQL CMS). Renamed to **`@glw907/cairn-cms`**; all consumer
  imports repointed (`@glw907/cairn-cms{,/sveltekit,/components}`). The workspace symlink relinks
  under the scope, so local source-dev is unchanged.
- **Publish auth saga (resolved).** npm killed classic tokens (Nov/Dec 2025); the user has no
  TOTP (passkey/1Password only); a granular token EOTP'd (account-level "require 2FA for writes"
  overrides token bypass (npm/cli #8869); Trusted Publishing **can't do a first publish** of a
  new name. So the one bootstrap publish was done **interactively in the user's terminal**
  (passkey 2FA), then **Trusted Publishing** was set up for every release after.
- **Trusted Publishing (OIDC) wired** for future releases via `.github/workflows/publish.yml` in
  cairn-cms (`id-token: write`, npm ≥11.5.1, `npm publish` via OIDC, provenance auto). One-time
  npmjs.com trusted-publisher config required (repo `glw907/cairn-cms`, workflow `publish.yml`).
  No stored npm token thereafter.
- **Standalone lockfiles regenerated.** Each site's committed `package-lock.json` was stale
  (ecnordic missing `carta-md`+shiki since Pass B; 907 from the F2 bump) and lacked cairn-cms.
  Regenerated in an **isolated temp dir** (no workspace, so `@glw907/cairn-cms@0.1.0` resolves
  from the registry as a tarball, not a `file:` link), verified by a clean `npm ci` dry-run.
- **Second CI blocker, found + fixed (adapter-cloudflare 7 / wrangler 4.94).** Once install
  passed, prerender failed in CI: `getPlatformProxy`'s `remoteBindings` **defaults to `true`**, so
  the build tried to start a Cloudflare **remote proxy** for the `remote = true` EMAIL binding
  (which exists only so `wrangler dev` sends real mail); no Cloudflare auth in CI → "Failed to
  start the remote proxy session." Fixed in both sites' `svelte.config.js`:
  `adapter({ platformProxy: { remoteBindings: false } })`, build-time only; `wrangler dev` still
  honors `remote = true`. (Local builds had masked this; the dev box has `CLOUDFLARE_API_TOKEN`.)
- **Verified.** Published package consumed end-to-end: both sites' CI **install + build + deploy
  succeed** (`gh run` conclusion `success`); the build compiles the package's `dist` (incl. the
  `.svelte` admin components → `components.*.css`). Package 35/35 tests, both sites `svelte-check`
  0/0 and local builds clean throughout.
- **Follow-ups.** Revoke the bootstrap granular token (exposed in the working session): **local
  `~/.npmrc` copy removed + shredded 2026-05-25 (post-Pass G)**; the **server-side revoke at
  npmjs.com → Granular Access Tokens is still pending** (CLI/API can't manage granular tokens;
  website-only). Safe to revoke: releases now use Trusted Publishing (OIDC), no stored token needed
  (proven by the 0.2.0 release). cairn-cms GitHub repo stays private for now (the npm package is
  public; provenance is skipped for a private source repo, but making the repo public later would
  enable provenance).

### Pass G: manage admins (owner-gated editor management UI) (2026-05-25)

- **Goal met: owners can manage the per-site editor allowlist from `/admin`; editors can't.**
  The two-tier `owner`/`editor` model (locked-decision row) is now real end-to-end. Role lives
  in the KV value, threads through the session, gates a new manage-admins surface, and drives an
  owner-only nav link. No cross-site SSO (each site's allowlist is independent, unchanged).
- **Role model + lazy migration (`auth.ts`).** Added `Role = 'owner' | 'editor'` and `role` on
  `Editor`. The KV allowlist value, previously a **bare display-name string**, is now JSON
  (`{"name","role"}`). `parseEditorValue` reads **both** shapes. A legacy bare string decodes as
  `{name, role:'editor'}`, so existing entries migrate **lazily** (re-saving upgrades them to
  JSON); no bulk migration script needed. `verifySession` defaults `role` to `editor` for sessions
  signed before roles existed. New KV helpers: `listEditors` (prefix-list + decode, sorted by
  email), `setEditor` (JSON put, email normalized), `removeEditor`.
- **The gate (`cairn-cms/sveltekit`).** New owner-gated section: `requireOwner(event)` throws
  `error(401)` if signed out, `error(403)` if not an owner, else returns the acting owner;
  `adminsLoad` lists the allowlist; `addAdmin`/`removeAdmin`/`setAdminRole` are the mutations
  (used as SvelteKit **form actions** `?/add`/`?/remove`/`?/setRole`). **Anti-lockout:** an owner
  can't remove or demote **themselves** (guards the last owner out). The gate is the package
  function itself. `hooks.server.ts` stays unchanged/byte-identical across sites (it only enforces
  *a* session; role enforcement is centralized in the shared management functions, the actual
  privilege-escalation surface).
- **UI (`cairn-cms/components`).** New `ManageAdmins.svelte`: editor table (name/email/role badge),
  per-row role-flip + remove (disabled for yourself), an add form (email/name/role select). Reuses
  the existing neutral DaisyUI chrome (panels, `alert`, `table`, `btn` styles), grounded in the
  existing `AdminList`/`EditPage`/`LoginPage` markup per the user's "leverage existing patterns"
  steer (the Capriole/Lucia layout mining stays for the later admin-UI-polish pass). `AdminList`
  grew an owner-only **"Editors"** nav link (`{#if data.editor?.role === 'owner'}`).
- **Wiring.** `/admin/admins/{+page.server.ts (load + actions),+page.svelte (<ManageAdmins>)}` added
  to **both** sites as thin shims; `diff -rq` confirms the two sites' whole `admin/` route trees
  stay **byte-identical** (the F2 invariant holds; only `cairn.config.ts` differs). The dev
  `scripts/mint-session.mjs` gained an optional `owner` arg (role in the minted session) to smoke
  the gate without the email loop.
- **Verified.** Package **39/39 vitest** (+4 auth: legacy-vs-JSON decode, list, set round-trip,
  remove), clean `svelte-package`. Both sites `svelte-check` **0/0** (ecnordic 474, 907 386) +
  Cloudflare `npm run build` OK. **Live `wrangler dev` (ecnordic):** anon `/admin/admins`→**303**
  login; **editor** session→**403**; **owner** session→**200** (lists editors, add form, role
  badges, owner-only "Editors" link present for owner / absent for editor). Owner mutations exercised
  end-to-end against local KV: **add** new editor → appears; **setRole** → owner badge; **remove** →
  gone; **self-remove** → bounced with error; **non-owner POST** to an action → **403**. Form actions
  with a browser `Accept: text/html` return **303 → `/admin/admins?saved=1`** (curl's default `*/*`
  gets the 200 JSON action result; the redirect is browser-correct).
- **Seeded.** Geoff (`geoff-login@907.life`) set to `owner` in **all four** AUTH_KV namespaces
  (ecnordic + 907, **local and remote**), migrating each site's legacy bare-name entry to the JSON
  `owner` value. First owner exists everywhere; further editors are added through the UI.
- **code-simplifier.** Run over the new package code: string-concat redirects → template literals
  (file consistency), `parseEditorValue` catch comment reworded, `ManageAdmins` props → named
  `interface Props` + dropped a redundant `<option selected>`. No behavior change; re-verified green.
- **Not pushed / prod-dormant (carry-over).** Commits land locally per the no-push-without-asking
  rule. Prod `/admin` for both sites stays dormant until per-site `MAGIC_LINK_SECRET`/`SESSION_SECRET`
  are set (unchanged Pass A posture); the manage-admins surface needs only the already-present
  AUTH_KV. Risk #5's CI half was **retired in Pass P** (published `@glw907/cairn-cms@0.1.0`); Pass G's
  new package code will reach the sites' CI on the next publish + version bump.

### Pass H: responsive admin-UI shell (drawer+navbar, data-driven nav) (2026-05-25)

- **Goal met: the admin is now a responsive, extensible shell.** `AdminLayout` went from a
  spartan single-column container to a DaisyUI **`drawer lg:drawer-open`** shell (sidebar pinned
  on desktop, slide-over + hamburger `navbar` on mobile), patterned on `scosman/CMSaasStarter`'s
  `(admin)/(menu)` layout (the user chose to mirror it closely). Built once in the shared
  `cairn-cms/components`; both sites consume it unchanged. No behavior change to auth/list/edit/save.
- **Data-driven, role-gated nav (the extensibility point).** The shell renders a `nav` array
  (`{ href, label, icon (snippet), active, owner? }`); `visibleNav` filters owner-only entries by
  `data.editor.role`. Today: **Content** (always; active on `/admin` + `/admin/edit/*`) and
  **Editors** (owner-only; active on `/admin/admins`). Adding a surface is now **one nav entry**
  (+ its route shim + component). This is the "easy to add functionality" requirement, structural.
- **Chrome consolidated into the shell (the user's "shell owns all chrome" choice).** The site
  title, signed-in identity (name/email), Sign Out form, and the owner-only Editors link all moved
  **out of `AdminList`/`ManageAdmins`** into `AdminLayout` (navbar + sidebar footer). `AdminList`
  now renders just a "Content" heading + the collection list; `ManageAdmins` dropped its redundant
  "← Back" link (the nav owns navigation). The `EditPage` keeps its own contextual back-link (a leaf
  affordance, not global chrome).
- **Active-nav highlighting without a `$app/*` import.** The component needs the current path but
  the F2 invariant forbids `$app/*` in the package (those kit virtual modules have no types outside a
  kit app → break `svelte-package` type emit). Solution: `adminLayoutLoad` now returns
  `pathname` (reads `event.url.pathname`), threaded through `AdminLayoutData`. Reading `event.url`
  also opts the layout server load into rerunning on navigation, so the active class stays correct.
- **Signed-out fallback.** The login page lives under the same `/admin` layout but has no session,
  so when `data.editor` is null the shell renders a **minimal centered surface** (no drawer/nav),
  the old `AdminLayout` shape. Live-verified: `/admin/login` carries no `drawer` markup.
- **Shim change (both sites, byte-identical).** `admin/+layout.svelte` went from
  `<AdminLayout>{@render children()}</AdminLayout>` to forwarding `data`:
  `let { data, children } = $props(); <AdminLayout {data}>…`. `diff -rq` confirms the two sites'
  whole `admin/` route trees stay byte-identical (only `cairn.config.ts` differs; the F2 invariant).
- **Verified.** Package **39/39 vitest**, clean `svelte-package`. Both sites `svelte-check` **0/0**
  (ecnordic 474, 907 386) + Cloudflare `npm run build` OK. **Live `wrangler dev` (ecnordic, minted
  sessions):** anon `/admin`→**303** login; **editor**→**200** with Content nav + Sign out but **no**
  Editors link; **owner**→**200** with the Editors link, site chrome, and identity present; the drawer
  shell (`drawer … lg:drawer-open`) renders; `/admin/login`→**200** with **no** drawer (minimal shell);
  `/admin/admins`→Editors nav `class="active"`; `/admin/edit/pages/training`→Content nav `class="active"`.
- **code-simplifier + v5 cleanup.** Simplifier verdict: the new shell/nav/`pathname` code is already
  clean (no changes). It flagged a pre-existing DaisyUI **v4** class (`input-bordered`) in
  `ManageAdmins`; for package coherence I swept all four admin components (`Login`, `Edit`, `Manage`)
  of `input-bordered`/`textarea-bordered`/`select-bordered` → bare `input`/`textarea`/`select` (v5
  carries the border by default; both sites are DaisyUI v5, so visually identical). Re-verified green.
- **Not published / prod-dormant (carry-over).** This is package source only; both sites pin `^0.2.0`,
  so the shell reaches their CI on the next publish + version bump (now the NEXT-SESSION pointer).
  Commits land locally per the no-push-without-asking rule.

### Go-live: ecnordic.ski prod `/admin` (2026-05-25)

- **Goal met: ecnordic's `/admin` is live in prod.** The dormancy posture (since Pass A) is lifted for
  ecnordic. Login + edit + save→commit all have their required secrets on the running worker.
- **Reality check corrected a stale plan note.** The NEXT pointer claimed "GitHub-App + EMAIL secrets
  already present from Pass A/C," but `wrangler secret list` on the `ecnordic` worker showed only
  `CONTACT_EMAIL` + `TURNSTILE_SECRET_KEY`. The App secrets had only ever lived in `.dev.vars`. So a
  *usable* admin (not just login) needed **five** secrets, not two.
- **Worker name gotcha.** The deployed worker is named **`ecnordic`** (not `ecnordic-ski`, the repo/dir
  name): `wrangler.toml` `name = "ecnordic"`. `wrangler secret list --name ecnordic-ski` silently
  returns nothing; bare `secret list` from the repo dir uses the toml name. Caught when `sync.sh --verify`
  aborted under `pipefail` (empty grep). Routing/registry use `ecnordic`.
- **Secrets set (5).** `wrangler secret put` on `ecnordic`: the 3 shared `GITHUB_APP_*` (from
  `~/.local/secrets`, values verified (App `3847496`, install `135372268`, PKCS#1 PEM) + **freshly
  generated** `MAGIC_LINK_SECRET` + `SESSION_SECRET` (`openssl rand -hex 32`). The two HMAC secrets are
  **per-site & worker-only** (NOT shared via the registry; the locked "no cross-site SSO" decision means
  each site signs with its own keys; rotatable by re-putting). Secrets apply to the running worker live,
  no redeploy (routes already deployed since Pass A).
- **Managed-secrets wiring.** Added `WORKER_SECRETS["ecnordic"]="GITHUB_APP_ID GITHUB_APP_INSTALLATION_ID
  GITHUB_APP_PRIVATE_KEY_B64"` to `~/.dotfiles/scripts/secrets/sync.sh` + documented in `registry.md`
  (ecnordic worker column; the 2 HMAC secrets noted as worker-only, like CONTACT/TURNSTILE). Pushed now
  via direct `wrangler put` from env (equal values), so no 1Password decrypt was needed; future
  `sync.sh --worker ecnordic` re-pushes the App secrets reproducibly. Dotfiles commit `6430bf8` (local).
- **Verified live (prod).** `GET /admin`→**303** `→ /admin/login`; `GET /admin/login`→**200** ("Sign in"
  form); `POST /admin/auth/request` (email=owner, same-origin)→**303** `→ /admin/login?sent=1` (success
  path (an error would be `?error=…`), so the full prod chain ran: validate → AUTH_KV owner lookup →
  sign magic-link token → Email Sending dispatch. `sync.sh --verify` shows the 3 App secrets ✓ on
  `ecnordic` (HMAC pair as expected "extra"). **Confirmed end-to-end (2026-05-25):** the user received
  the magic link, clicked it, and the authenticated `/admin` loaded. The session round-trip works in
  prod. ecnordic go-live is fully verified; no manual steps remain.
- **Pre-existing drift noted (not mine, not fixed):** `sync.sh --verify` flags `CLOUDFLARE_API_TOKEN
  MISSING` on the `907-life` worker (a stale routing entry, a deploy credential, not a runtime secret).
  Untouched; out of scope for this go-live.

### Go-live: 907.life prod `/admin` (2026-05-26)

- **Goal met: 907.life's `/admin` is live in prod.** This is the second and final site go-live. With this,
  **both** consumer sites have a working prod admin; the core initiative is complete (only Future
  roadmap items remain).
- **Email Sending blocker was already cleared (corrected a stale plan note).** The NEXT pointer said
  907's Email Sending dashboard onboarding wasn't done. A DNS check proved otherwise: 907.life **already
  carries the Cloudflare Email Sending records**: `cf-bounce` MX (`route{1,2,3}.mx.cloudflare.net`),
  `cf-bounce` SPF TXT, and the `cf-bounce._domainkey` DKIM TXT, the same marker set as ecnordic's
  working domain (the `fm*._domainkey` CNAMEs are Fastmail's, unrelated). Onboarded sometime after the
  pointer was written (zone created 2026-05-25). So no dashboard step was needed this pass.
- **Five secrets set on the `907-life` worker.** `wrangler secret put`: the 3 shared `GITHUB_APP_*`
  (from `~/.local/secrets`, values verified: App `3847496`, install `135372268`, PKCS#1 b64 key) +
  **freshly generated** `MAGIC_LINK_SECRET` + `SESSION_SECRET` (`openssl rand -hex 32`, **distinct from
  ecnordic's** (the locked no-cross-site-SSO / per-site-signing decision). Pre-existing `CONTACT_EMAIL`,
  `RESEND_API_KEY` (contact form, not cairn), `TURNSTILE_SECRET_KEY` left as-is. Worker name is `907-life`
  (matches the dir, unlike ecnordic's `ecnordic`).
- **Managed-secrets wiring.** Added the 3 `GITHUB_APP_*` to `WORKER_SECRETS["907-life"]` in
  `~/.dotfiles/scripts/secrets/sync.sh`; updated `registry.md` (907-life worker column → ✓, audit
  section, the per-site HMAC "extra" note). `sync.sh --verify`: the 3 App secrets ✓ on `907-life`, the
  HMAC pair flagged "extra" as expected. **Pre-existing drift unchanged:** `CLOUDFLARE_API_TOKEN MISSING`
  on `907-life` (a stale routing entry, deploy credential, not a worker runtime secret), the same drift
  the ecnordic go-live noted; left untouched (out of scope).
- **Verified live (prod).** `GET /admin`→**303** `→ /admin/login`; `GET /admin/login`→**200**; `GET /`→**200**;
  `POST /admin/auth/request` (email=owner, same-origin `Origin: https://907.life`)→**303** `→
  /admin/login?sent=1` (the success path; an error would be `?error=…`). So the full prod chain ran:
  validate → AUTH_KV owner lookup (seeded Pass G) → sign magic-link token → **Email Sending dispatch** to
  the owner. Byte-identical to ecnordic's verified path.
- **One user-side confirmation left** (same posture as ecnordic's final step): the owner clicks the
  delivered magic link and the authenticated `/admin` loads, confirming the session round-trip in prod.
  The dispatch (`?sent=1`) is verified; the click is Geoff's to make.
- **Ritual.** No application code changed (worker secrets + machine-local `sync.sh`/`registry.md` only);
  code-simplifier / svelte-check / tests don't apply. Dotfiles changes commit locally per the
  no-push-without-asking rule.

### Hotfix 0.3.1: authenticate admin reads (prod 403 found at 907 go-live, 2026-05-26)

- **Bug, found during the 907 go-live click-through.** Login worked, but the authenticated `/admin`
  content list rendered `Couldn't load posts: GitHub list src/content/posts failed: 403`. Root cause:
  the admin **read** path (`adminListLoad` → `listMarkdown`, `editLoad` → `readRaw`) was **anonymous**
  (a deliberate Pass B/F choice: "repos are public"). Anonymous GitHub contents-API calls share the
  **60/hr-per-IP** unauthenticated budget, and a Cloudflare Worker egresses from **shared** Cloudflare
  IPs, so that budget is perpetually exhausted in prod → 403. (Local `wrangler dev` egresses from the
  dev box's own IP, so it never reproduced; that's why every prior pass's read smokes passed.) This
  is exactly the authenticated-reads upgrade the plan anticipated (Pass B/F notes, risk #5 corollary),
  now forced by a real prod failure rather than the 5000/hr nicety.
- **Fix (package).** New internal `readToken(env)` in `cairn-cms/sveltekit`: mints the GitHub App
  installation token (via the existing `installationToken`) **for reads** when the App is configured,
  catching mint failures → `undefined` (degrades to anonymous rather than 500ing; a read can still
  succeed unauthenticated, unlike the commit path where a missing App is fatal). Threaded into
  `adminListLoad` (signature widened to `(event, adapter)`) and `editLoad` (event type widened to carry
  `platform`). `listMarkdown`/`readRaw` already accepted an optional trailing `token` (Pass B), so the
  fetch layer was unchanged; only the wiring changed. `readToken` stays unexported (not in the public barrel).
- **Site shims (both, byte-identical).** `admin/+page.server.ts` went from `() => adminListLoad(cairn)`
  to `(event) => adminListLoad(event, cairn)`; the edit shim already forwarded `event`. The new
  signature ships **only** in 0.3.1, so the shim change + the version bump had to land together.
- **Verified.** Package 39/39 vitest (the existing "sends a bearer token when supplied" read test already
  pins the fetch-layer behavior), clean `svelte-package`, `readToken` absent from the public `dist`.
  Both sites `svelte-check` 0/0 + Cloudflare build OK. **Live `wrangler dev` (ecnordic, minted session):**
  authed `/admin` → 200 listing all posts+pages (the read path now mints + uses the token in-worker with
  no error in the log). code-simplifier: two comment-only refinements (fixed a self-contradictory JSDoc
  sentence, dropped a redundant call-site comment); no behavior change.
- **Published + shipped.** `@glw907/cairn-cms@0.3.1` published via the Trusted-Publishing OIDC workflow
  (push `main` `1470177` → GitHub Release `v0.3.1` → `publish.yml` run `26459797974` green; `npm view`
  → `0.3.1` is `latest`). Both sites repointed `^0.3.0`→`^0.3.1` with regenerated standalone lockfiles
  (isolated-temp-dir method, registry tarball not the symlink; isolated `npm ci --dry-run` clean for
  both). Pushed (ecnordic `c73f6b2`, 907 `c15b7c2`); **both CI deploys green** (`26459893207`,
  `26459901992`); `https://907.life` + `https://ecnordic.ski` both 200. The authenticated read now runs
  in prod from the App identity (5000/hr) instead of the shared anonymous budget.
- **One user-side confirmation left:** the owner refreshes prod `/admin` and sees the post list (no 403).
  The same code path is verified in-worker locally; only the prod-IP rate-limit condition couldn't be
  reproduced off Cloudflare.

### Release 0.3.0: ship Pass G + H to both sites (publish/version bump, 2026-05-25)

- **Goal met: both sites now consume the published Pass G + Pass H package; CI deploys GREEN.**
  The admin shell (Pass H) and manage-admins surface (Pass G) had landed in source but the sites
  still pinned `^0.2.0` (Pass G's release; Pass H was unpublished). This pass closed that gap.
- **Published `@glw907/cairn-cms@0.3.0`** via the wired **Trusted-Publishing OIDC** workflow. Bumped
  `package.json` `0.2.0`→`0.3.0` (single-line edit; reverted `npm version`'s array reformatting to keep
  the diff clean), committed (`360aae9`), pushed `main`, then created **GitHub Release `v0.3.0`** which
  triggered `publish.yml` (`release: published`). Run `26433291387` green; `npm view` confirms `0.3.0`
  is `latest`. No stored npm token (OIDC mints a short-lived credential); the Pass P Trusted-Publishing
  setup proven again.
- **Both sites repointed to `^0.3.0`** with **regenerated standalone lockfiles** (the Pass P method):
  edited each `package.json` pin, regenerated each `package-lock.json` in an **isolated temp dir** (no
  workspace, so `@glw907/cairn-cms@0.3.0` resolves from the registry as a tarball, not a `file:` link).
  Diffs are surgical: only the cairn-cms entry (version / `resolved` tarball URL / `integrity`) + the
  pin; the integrity hash is **identical across both sites** (same published tarball). `npm ci --dry-run`
  in isolation clean for both (mimics CI).
- **Local stale-install gotcha (caught + fixed; CI was never affected).** 907's local
  `node_modules/@glw907/cairn-cms` was a **materialized real copy of 0.2.0** (left from when it pinned
  `^0.2.0`), shadowing the workspace symlink, so 907 `svelte-check` failed with `'data' does not exist
  on AdminLayout props` (the pre-Pass-H component). ecnordic was unaffected (it resolves the workspace-root
  symlink → source). Fix: `rm -rf` the nested copy + reinstall → npm relinks to source. **Purely a local
  dev-env artifact**: CI does a fresh `npm ci` against the committed lockfile (correctly pointing at
  `0.3.0.tgz`), so the published path was always correct. Lesson for future bumps: after changing a
  workspace pin, drop any nested materialized copy so the symlink wins.
- **Verified.** Package 39/39 vitest + clean `svelte-package` before the bump. Both sites `svelte-check`
  **0/0** (ecnordic 474, 907 386), `npm ci --dry-run` clean. After push: **both CI deploys green**
  (ecnordic run `26433422099`, 907 `26433425327`, both conclusion `success`); live smoke
  `https://ecnordic.ski`→**200**, `https://907.life`→**200**. Risk #5's CI half stays retired (now on a
  published `0.3.0`, not `0.1.0`).
- **Ritual.** No code-simplifier / test re-run needed beyond the gates above; only version strings +
  lockfiles changed, no source code. Commits: cairn-cms `360aae9` + Release `v0.3.0`; ecnordic `0094036`;
  907 `e3a1eca`. All pushed (publish pass; pushing is the deliverable, user-authorized).

### Exploration: forward-compat review (research pass, 2026-05-25)

- **Output:** `docs/FORWARD-COMPAT.md` (the architectural memo). Research only; **no code behavior
  changes** this pass. Surveyed git-based peers (Sveltia, Decap, Keystatic, Tina) and file-based/
  traditional peers (Statamic, closest cousin; WordPress; Ghost) via parallel web-research agents,
  mapped each capability against cairn's three real seams (`adapter.ts`, `github.ts`, `auth.ts`).
- **Headline: no breaking change is required now; the contract is safe to pin for outside consumers.**
  Per-capability verdicts: media (open, additive; storage-target decision is the gate, not the
  contract), editorial workflow (open via `draft` frontmatter; branch-mode is a lift), scheduled
  publish (open, lives outside the contract via Cloudflare Cron Trigger + `publishAt` field), relations
  (unidirectional open; bidirectional needs a multi-file tree-API commit cairn lacks), i18n (open for
  file-per-locale; field inheritance is a UI lift), revision/rollback (**free from git**, additive,
  the cheapest high-value future win), roles (**cairn is ahead of the field**: the #1 industry
  retrofit-risk "role in the session" was already closed in Pass G; per-collection scoping is the
  known additive next step), backends (out of scope; opinionated GitHub-forward stack, locked), themes
  (already correct; Statamic Starter Kits = the Hugo model cairn already implements).
- **Two structural limits noted (not bugs):** `commitFile` is single-file (multi-file atomic writes
  need the git-data tree API); filename-based ids/no-codec is *cleaner* than planned and absorbs i18n
  locale suffixes for free. "Keep doors open" list + the known-shape extensions are in the memo.
- **UI half** (per the user's steer: "easy to add functionality" + "fully responsive"). Picked the
  next build: a DaisyUI `drawer`+`navbar` shell with a data-driven, role-gated nav, base
  `scosman/CMSaasStarter`. Corrected the phantom `joshnuss/capriole` reference (see Reference note
  above). Promoted to the NEXT-SESSION pointer as an admin-UI-polish build pass.
- **Ritual:** docs-only pass; no code-simplifier / svelte-check / test run needed (nothing built).
  Not committed (no-push-without-asking; the new doc + PLAN edits land locally).

### Risk #1 follow-up: Cloudflare email (design RESOLVED, provisioning BLOCKED)

Email **Sending** and Email **Routing** are two distinct products under Cloudflare Email Service:

- **Email Sending** (transactional, arbitrary recipients) = `env.EMAIL.send({ to, from, subject,
  html, text })`, the object-form call. This is what cairn uses (`src/lib/cairn/email.ts`).
- **Email Routing** (recipient-restricted) = the `cloudflare:email` `EmailMessage` + mimetext MIME
  form; only sends to *verified* destinations (else `destination address is not a verified address`).

Both ride the **same** `[[send_email]] name="EMAIL"` (+ `remote=true`) binding; the product is
selected by **call shape**. (This corrects an earlier Pass 0 note that wrongly equated Email
Sending with "`send_email` minus `destination_address`".) Email Routing for ecnordic.ski was
enabled via API (MX/SPF/DKIM `cf2024-1._domainkey`, `status: ready`). **Still blocked:** Email
Sending isn't provisioned. It needs (a) **Workers Paid plan**, (b) the domain onboarded at dashboard
**Email → Email Sending** (the `/email/sending/*` REST endpoints reject the current API token, so
it's dashboard-gated). **Resend** is the fallback.
