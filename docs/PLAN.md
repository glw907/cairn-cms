# Plan: cairn-cms — an embedded, magic-link, GitHub-committing CMS for SvelteKit/Cloudflare sites

> **Scope note.** This started as "a good markdown editor for ecnordic" and, through the
> conversation, became the **genesis of `cairn-cms`**: a reusable CMS core whose first two
> consumers are **ecnordic.ski** and **907.life**. Execution does **not** happen in this
> ecnordic-rooted session — it begins with **Pass 0** (new repo + meta-workspace), after
> which a fresh Claude session runs from the workspace root. Copy this plan into the new
> `cairn-cms` repo as `docs/PLAN.md` once it exists.

## Context

EC Nordic (and 907.life) need **non-technical authors** to edit content from the browser.
A git-based CMS was the obvious reach, but the hard requirements rule the field out:

- **No GitHub accounts for editors; magic-link email login.** No off-the-shelf git CMS
  (Sveltia, Decap, Tina, Keystatic) supports passwordless email login. Sveltia's local mode
  is Chromium-only (user is on Firefox); the half-wired `static/admin/` is a dead end.
- **Must preserve directive-heavy markdown** (`:::card{}` etc.) — a rich-text CMS widget
  would corrupt it.
- **GitHub-forward, no human "bot" account.**
- **Reusable across two sites with different designs** (ecnordic: DaisyUI + directive
  pipeline; 907.life: ET Book + plain `remark-html`).

Answer: a **custom in-app admin** = the core of cairn-cms.

### Locked decisions
| Area | Decision |
|---|---|
| Target stack (scope) | **Opinionated, not universal.** cairn-cms may assume a specific stack — **Cloudflare, SvelteKit, DaisyUI, Tailwind, GitHub** — and is *not* trying to be a CMS for all hosts/designs. Don't over-generalize the adapter contract or seams to abstract these away; a hard dependency on them is an acceptable answer, and "out of scope" is a valid verdict per candidate feature. Keeps the core lean (WordPress-bloat is the cautionary tale) |
| Editor identity | **Magic-link email** — no passwords, no GitHub for editors |
| Magic-link delivery | **Cloudflare Email Service** (`env.EMAIL.send`), *not* the Email Routing `send_email` binding (recipient-restricted). Fallback: Resend |
| Editor component | **Carta** `carta-md` v4.11.2 (Svelte 5, unified/remark-native), edits **raw** markdown. **No WordPress-style semi-WYSIWYG / rich-text editing** — authors write markdown (with a live preview), not a contenteditable surface. A rich-text widget would corrupt directive-heavy markdown (`:::card{}` etc.); that's a core reason the off-the-shelf CMSes were ruled out |
| Preview | Each site supplies its own `renderPreview(md)` → directive-safe per design |
| Admin theme | **Neutral, fully self-contained** — one clean theme identical on every site, scoped to `/admin` (`data-theme` + font reset on the layout root), decoupled from host-site tokens/fonts. Shared admin components own their styles (→ clean Pass F extraction); only `siteName` varies via adapter `branding`. The admin is a tool, not a marketing surface |
| Editor management | **Two-tier roles**, per-site (no cross-site SSO). KV allowlist value carries a role (`owner` vs `editor`); **only `owner`s** see/use the manage-admins UI (add/remove editors, set role), regular `editor`s only edit content. The guard checks role on the management surface — it's a privilege-escalation surface. Revises the earlier "role tiers out of scope" line. Built in **Pass G** |
| Commit mechanism | **GitHub App** (short-lived install tokens; committer = `cairn-cms[bot]`, author = editor) |
| Publish flow | Commit to **`main`** → existing CI auto-deploys. `draft` frontmatter = soft gate |
| Topology | **Embedded per-site library** — admin at each site's `/admin`, in that site's worker |
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

- **Dev:** workspace symlinks `cairn-cms` into each site's `node_modules` — edit core, both
  sites see it instantly, no publish.
- **CI/prod:** each site pins a **published** cairn version (GitHub Packages, or `git+ssh`
  tag dep) so deploys are reproducible and independent of the local workspace.
- One Claude session launched at `~/Projects/cairn/`; each repo's `CLAUDE.md` still loads in
  its subtree.

## Phased passes (each ≈ one cairn-pass)

- **Pass 0 — Workspace + repo.** Create `~/Projects/cairn/`, init `cairn-cms` repo + npm
  workspace, move the two sites in, verify both still build/deploy. Register **one GitHub
  App** installed on both repos. Set up Cloudflare Email Service (domain auth/DKIM) or Resend.
- **Pass A — Auth skeleton (in ecnordic).** Add `AUTH_KV` binding (+ `app.d.ts`); magic-link
  request/verify via Email Service; signed session cookie; `/admin/**` guard in
  `hooks.server.ts`; KV editor allowlist. Secrets via `wrangler secret put`
  (`GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_INSTALLATION_ID`,
  `MAGIC_LINK_SECRET`, `SESSION_SECRET`, email-provider key). **Done:** log in by email → empty `/admin`.
- **Pass B — Read/list + Carta preview.** `/admin` lists posts/pages from the repo;
  `/admin/edit/...` loads current raw markdown via GitHub contents API; Carta render-only
  preview wired to ecnordic's `render.ts` plugin set.
- **Pass C — Edit + commit.** Carta editing + frontmatter form (from `content-schema.ts`);
  `POST /admin/save` commits via GitHub App (author = editor). End-to-end edit→commit→deploy.
- **Pass D — cairn-core seam refactor.** Pull generic pieces behind the adapter interface in
  `src/lib/cairn/**`; ecnordic becomes `src/lib/cairn.config.ts`. No behavior change.
- **Pass E — Extract cairn-core to the package** (reordered: was the extraction half of
  the old Pass F, pulled ahead of 907-life onboarding to avoid throwaway duplication).
  Move the six `.ts` modules into `cairn-cms` using the `publishConfig`-swap shape
  (checked-in `exports`→source for zero-config instant dev across the workspace;
  `publishConfig.exports`→`dist` for publish; `svelte-package` builds dist at
  `prepublishOnly`, ready for the Pass F admin `.svelte` shell). Repoint ecnordic to
  `import … from 'cairn-cms'`; verify check/build/tests/`/admin`. Admin routes + components
  stay per-site for now. No behavior change.
- **Pass F — Onboard 907.life** (reordered: the old Pass E, now built against the real
  package). Write 907-life's adapter (filename-based ids — no slug codec needed; plain
  `remark-html` preview; its frontmatter + a new validator), its `admin/**` routes, KV/EMAIL
  bindings, the guard, and private-repo read-token threading. Decide here whether to extract
  the shared admin Svelte shell into the package (the design difference forces the call).
  Plus the old-Pass-F cleanup: remove `static/admin/`, close backlog #4, update
  STATUS/architecture/ROADMAP.

### Planned passes beyond F (added 2026-05-25)

- **Pass G — Manage admins (editor management UI).** Owner-gated CRUD over the per-site
  `AUTH_KV` allowlist: list/add/remove editors, set role (`owner`/`editor`). Add a `role` to
  the KV value (migrate existing flat entries → `editor`, seed the first `owner`); extend the
  guard so the manage-admins surface requires `owner`. Reuses the neutral admin chrome. See the
  "Editor management" locked-decision row. Per-site (no cross-site SSO — unchanged).
- **Future — Manage media (image/upload UI).** Was out-of-scope; now a roadmap item, still
  unscheduled. **Open decision: storage** — commit media into the site repo (fits the git-CMS
  model, reuses the GitHub App `commitFile` path with base64 binary, served as static assets)
  **vs** Cloudflare R2 / Images (scales, adds infra + a binding). Decide before building. The
  adapter contract will likely grow a media config (folder/URL-base, or an R2 binding ref).
- **Future — Themes (Hugo-style, NOT WordPress-style).** Themes *are* a wanted capability, but
  the model is **Hugo's**, not WordPress's: when a user stands up a **new** cairn site they
  **choose from a collection of default themes** as a scaffold, then **edit it** in their own
  repo from there (or **build a new theme** if they prefer). It is **site-setup / scaffold-time
  selection + in-repo source editing**, *not* a runtime theme-management UI inside `/admin` and
  *not* a marketplace. This is consistent with the opinionated target stack (themes are
  SvelteKit + DaisyUI/Tailwind) and the "admin is a tool, not a marketing surface" decision — the
  *public site* design is themed; the admin chrome stays neutral/self-contained. A theme is
  essentially the SvelteKit/Tailwind/DaisyUI layer + the site's `cairn.config.ts` adapter
  (collections, `renderPreview`, frontmatter). Unscheduled; the open work is defining what a
  "cairn theme" packages and how the scaffold picks one (e.g. a `create-cairn-site` template set).
  **Implication for now:** themeability means UI components should stay **consistent and
  themeable** — a strong reason to build on **DaisyUI components where possible** (semantic,
  theme-driven classes that re-skin via DaisyUI themes) rather than ad-hoc bespoke markup a theme
  can't restyle. Applies to site components; the admin chrome stays neutral by its own rule.
- **Exploration (research pass, not a build) — CMS landscape & forward-compatibility review.**
  The real goal: survey mature CMSes (Sveltia, Decap, Keystatic, WordPress, Ghost, Statamic) to
  see *a bit into the future* and make sure **we don't design ourselves into a box** — i.e. that
  Cairn's extensibility seams (above all the **adapter contract**, plus the storage and auth/role
  models) stay general enough to absorb likely future features *later*, without a rewrite. **Not**
  a commitment to build any of them. Scan list (which capabilities exist, and does our current
  architecture leave the door open?): media/uploads, editorial workflow / review-before-publish,
  scheduled publish, content relations / references across collections, i18n / localization,
  revision history & rollback (we get some free from git), richer roles/permissions, multiple
  backends. *Theming* is **not** dropped but is **scoped Hugo-style** (scaffold-time theme choice +
  in-repo editing, per the "Themes" item above), explicitly **not** WordPress-style runtime theme
  management — **Cairn stays lean; WordPress is the cautionary tale.** Output is an architectural
  memo: "keep these doors open" notes
  + any cheap seam generalizations to make now; **"out of scope" is a valid verdict per item.**
  **Timing leverage:** most valuable **before the adapter API calcifies** for external/published
  consumption — the contract is extracted in Pass E and validated on a 2nd site in Pass F, so this
  review ideally informs/closely follows F, before the package version is pinned for outside use.

## Key new files (in ecnordic during A–D; migrate to package in F)

`src/routes/admin/` — `+layout.server.ts` (`prerender=false`, session→`locals.editor`),
`+page.svelte` (list), `login/+page.svelte`, `edit/[type]/[id]/+page.svelte`,
`auth/request/+server.ts`, `auth/callback/+server.ts`, `save/+server.ts`.
`src/lib/cairn/{auth,github,email,carta,content}.ts` · `src/lib/cairn.config.ts`.

## Changed files (ecnordic)

`wrangler.toml` (+`[[kv_namespaces]]` AUTH_KV; Email Service binding) · `src/app.d.ts`
(+bindings/secrets, `App.Locals.editor`) · `src/hooks.server.ts` (guard, keep theme logic) ·
`package.json` (+`carta-md`, `octokit`+`@octokit/auth-app`, `isomorphic-dompurify`) ·
remove `static/admin/*` · `BACKLOG.md`/`docs/STATUS.md`/`docs/architecture.md`/`ROADMAP.md`.

## Reuse (don't reinvent — verified in repo)

- Email/MIME pattern & `getRequestEvent().platform` access — `src/lib/contact.remote.ts`.
- `prerender=false` on live routes — `src/routes/contact/+page.ts` (global default true via
  `src/routes/+layout.server.ts`).
- Remark processor to reuse for preview — `src/lib/markdown/render.ts`.
- Content model + controlled tags — `src/lib/content-schema.ts`; slug parse — `src/lib/posts.ts`.
- CSRF/origin posture — SvelteKit's built-in same-origin POST check (the contact remote fn
  relies on it); apply to `/admin` POST endpoints.

## Risks / unknowns to verify (ranked)

1. **Cloudflare Email Service GA + setup** (HIGH) — confirm it's enabled on the account,
   domain authenticated (DKIM/SPF), arbitrary-recipient send works. *Verify:* send a test
   magic link to a non-verified Gmail in `wrangler dev`. *Fallback:* Resend.
2. ~~**GitHub App auth on Workers** (HIGH)~~ — **RETIRED (Pass C).** RS256 JWT signed with
   **Web Crypto** (no `@octokit/auth-app`, no `nodejs_compat` needed — only Web Crypto + `fetch`
   + `atob`/`btoa`). The stored key is **PKCS#1** (`BEGIN RSA PRIVATE KEY`), which `importKey`
   rejects, so the Worker wraps it to PKCS#8 in-process (`pkcs1ToPkcs8`, fixed RSA algId + DER
   length octets). *Verified:* `installationToken()` minted a real `ghs_` install token from
   GitHub and read `package.json` with it (throwaway live test, since removed); the commit body
   shape (author = editor, committer omitted → bot, base64 content, sha-on-update) is unit-tested.
   A real save→commit to `origin/main` then confirmed author = editor / committer = `cairn-cms[bot]`
   live (Pass C log).
3. ~~**Carta v4.11 plugin-injection API** (MED)~~ — **RETIRED (Pass B).** Inject site plugins
   as sync transformers via `extensions[].transformers` (`{execution:'sync', type, transform}`)
   at the remark/rehype phases; `rehypeOptions.allowDangerousHtml` + `sanitizer:false` mirror
   `render.ts`. SSR handled by mounting the preview client-only (`{#if browser}`), so Shiki
   never runs on the Worker — no isomorphic-dompurify needed. Wiring shares `render.ts`'s
   plugin arrays + is unit-tested; only the in-browser visual render awaits a Firefox click.
4. **Magic-link security** (MED) — single-use (KV nonce delete on redeem), 10-min TTL,
   constant-time compare, `httpOnly/Secure/SameSite=Lax`, `/admin` excluded from prerender +
   Pagefind index + sitemap/robots.
5. **Workspace/CI linking** (LOW) — sites resolve local cairn in dev, pinned version in CI.
   *Dev half verified (Pass E):* the symlinked package's **source** resolves under `svelte-check`,
   the Cloudflare `vite build`, and `wrangler dev` with zero consumer config (`publishConfig`-swap
   exports). The CI pinned-version half is a Pass F concern.

## Verification (end-to-end, per site)

`npm run build` + `npx wrangler dev` (pipe `sleep infinity`), open in **Firefox** at :8787.
1) Request magic link to an allow-listed external email → arrives → click → authenticated
`/admin`; non-allowlisted rejected. 2) Edit a prose post **and** a directive page; save;
confirm a `main` commit with **author = editor, committer = bot** and a clean `git diff`.
3) CI deploys; change live. 4) `svelte-check` clean; `/admin` absent from prerender/Pagefind.
5) Negative: expired link rejected, reused link rejected, no-session `/admin` → login.

## Out of scope (initiative)

PR-review workflow (`draft` is the gate); editing `src/content/events`; cross-site SSO
(each site has its own allowlist/session). — **Moved out of "out of scope" (2026-05-25):**
*editor role tiers* are now in scope as a **two-tier** owner/editor model for admin management
(Pass G), and *media/image upload* is now a roadmap item (see "Planned passes beyond F"),
no longer excluded — just unscheduled.

## Notes / progress log

> Session-by-session execution state and post-mortems. The workspace `CLAUDE.md` stays lean
> (durable orientation only); running progress lives here, in the git-backed plan.

> **⏭ NEXT SESSION (start here) — Pass F: onboard 907.life.** Pass E (extract cairn-core into
> the `cairn-cms` package) is **DONE** (2026-05-25 — see the Pass E entry below). Pass F is the
> **907.life onboarding** (the reordered old Pass E) **+ old-Pass-F cleanup**. Write 907-life's
> adapter against the real package (filename-based ids — **no slug codec**; plain `remark-html`
> preview; its frontmatter + a new validator), its `admin/**` routes, KV/EMAIL bindings, the
> guard, and private-repo read-token threading (`github.ts` already takes an optional token).
> **Decide in F** whether to extract the shared admin Svelte shell into the package — the package
> shape (`svelte-package`, `files` ships `src/lib`) already supports dropping in uncompiled
> `.svelte` components. Then the cleanup: remove `static/admin/`, close backlog #4, update
> STATUS/architecture/ROADMAP. Two carry-over cleanups noted in the Pass E entry: `bytesToB64url`
> leaks into the public `export *` (move to an unexported `utils.ts`), and the package
> `tsconfig.json` `include` omits `src/tests` (tests type-checked only by vitest/esbuild today).

### Pass 0 — bootstrap (2026-05-24)

- **Workspace install:** DONE — `npm install` at root clean (472 pkgs; 9 npm-audit advisories,
  none blocking — revisit before publish).
- **Both sites build:** DONE — ecnordic ~2.9s, 907-life ~4.1s, both via
  `@sveltejs/adapter-cloudflare`; no path/lockfile breakage from the move.
- **GitHub App:** registered. App ID `3847496`, Installation ID `135372268` (single install
  covering both repos). Private key stored base64 as `GITHUB_APP_PRIVATE_KEY_B64` in the
  encrypted registry (machine-local pointers in the workspace `CLAUDE.md`). Commit-path smoke
  test DONE — App JWT (RS256) → install token → read `package.json` from both repos (HTTP 200);
  risk #2 retired modulo confirming the same under `nodejs_compat` in Pass A's `wrangler dev`.
- **Email path:** Email Sending product chosen — see risk #1 follow-up below.

### Pass A — magic-link auth skeleton in ecnordic-ski (2026-05-24)

- **Built.** New: `src/lib/cairn/{auth,email}.ts`, `src/routes/admin/**`
  (login, page, `auth/request|callback|logout`), `src/tests/cairn/auth.test.ts`. Changed:
  `app.d.ts` (+`Locals.editor`, AUTH_KV/EMAIL/secrets), `hooks.server.ts` (`/admin/**` guard),
  `wrangler.toml` (+AUTH_KV `73e2f799e9864398ab5e57c02272fe04`, +EMAIL binding). Removed dead
  Sveltia `static/admin/` — it was shadowing the new `/admin` route as a static asset (backlog
  #4 / STATUS reconciliation still deferred to Pass F).
- **Verified.** `svelte-check` clean; 44/44 vitest (incl. 10 auth crypto / single-use / session
  tests). Live under `wrangler dev`: anon `/admin`→login; cross-origin POST→403; non-allowlisted
  rejected; bad/expired token rejected; synthesized valid session renders authenticated `/admin`.
  AUTH_KV seeded `editor:geoff-login@907.life`→"Geoff Wright" (local + remote).
- **DONE — verified end-to-end (2026-05-25).** Account upgraded to **Workers Paid**; **Email
  Sending** onboarded for ecnordic.ski via dashboard (cf-bounce MX/SPF/DKIM + `_dmarc`, all
  resolve). Live magic link delivered → clicked → authenticated `/admin` ("Signed in as Geoff
  Wright") in Firefox. The full chain (Email Sending → single-use KV token → session → guard)
  works in reality.
- **Origin gotcha + fix.** `wrangler dev`'s `custom_domain` route makes `url.origin` resolve to
  the prod host, so dev magic links pointed at production (404 on first click). Fix: `PUBLIC_ORIGIN`
  override (ecnordic `a4b87a3`) — set in dev `.dev.vars`, unset in prod so prod uses
  `https://ecnordic.ski`. Commits: ecnordic `756c54a` (skeleton) + `a4b87a3` (origin fix).
  **cairn-cms has a private remote** (`github.com/glw907/cairn-cms`); dependency-pinning is Pass F.
- **Prod `/admin` left intentionally dormant.** Only step remaining to make it live (optional,
  not a Pass A blocker): `wrangler secret put MAGIC_LINK_SECRET` and `SESSION_SECRET` in prod
  (prod AUTH_KV allowlist already seeded; deploy already includes the routes). GitHub-App secrets
  unused until Pass C.

### Pass B — read/list + Carta preview in ecnordic-ski (2026-05-25)

- **Built.** New: `src/lib/cairn/github.ts` (contents-API read client — `listMarkdown`,
  `readRaw`, token-optional), `src/lib/cairn/carta.ts` (pure preview-options/transformer
  wiring, deliberately *no* `carta-md` import so the node test env can load it),
  `src/routes/admin/+page.server.ts` (lists collections from the repo),
  `src/routes/admin/edit/[type]/[id]/{+page.server.ts,+page.svelte}` (loads raw md, renders
  the Carta preview client-side), `scripts/mint-session.mjs` (dev smoke helper — signs a
  session cookie so the guard can be exercised without the email loop). Changed:
  `src/lib/markdown/render.ts` (now exports `remarkEcPlugins`/`rehypeEcPlugins`, the shared
  plugin set), `src/lib/config.ts` (+`CAIRN_REPO`, `CAIRN_COLLECTIONS`),
  `src/routes/admin/+page.svelte` (renders the list). Added dep: `carta-md@4.11.2`.
- **Verified.** `svelte-check` clean; 56/56 vitest (new: 9 github-client + 3 preview-wiring
  tests). Cloudflare build succeeds with Carta bundled (no SSR/Shiki breakage — preview is
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
  placeholder) — structurally guaranteed, same posture as Pass A's final browser-click step.
- **Read auth deferred to Pass C (by design).** Reads are anonymous today because the
  ecnordic repo is **public**; `github.ts` already accepts an optional token, so Pass C drops
  in the GitHub App installation token for the commit path, private repos (907-life), and the
  authenticated 5000/hr limit — no refactor. Risk #2's in-Worker caveat thus stays open until
  Pass C exercises the App JWT under `nodejs_compat`.

### Pass C — edit + commit in ecnordic-ski (2026-05-25)

- **Built.** New: `src/lib/cairn/content.ts` (`serializeMarkdown` — gray-matter stringify, the
  inverse of the loader's parse), `src/routes/admin/save/+server.ts` (POST commit endpoint).
  Extended `src/lib/cairn/github.ts` with the **write path** — `appJwt` (RS256 via Web Crypto,
  incl. PKCS#1→PKCS#8 wrap), `installationToken`, `fileSha`, `commitFile` (contents-API PUT,
  author = editor / committer omitted → `cairn-cms[bot]`, sha-on-update vs create). Changed:
  `src/lib/cairn/auth.ts` (export `bytesToB64url` for the JWT encoder),
  `admin/edit/[type]/[id]/+page.server.ts` (load returns full `frontmatter` + `saved`/`error`
  flags), `+page.svelte` (render-only preview → real editor: per-type frontmatter form +
  Carta `MarkdownEditor` mounted client-only, hidden `body` input carries the value to the form).
  No new deps (zero-octokit ethos held; `gray-matter` already present).
- **Verified.** `svelte-check` clean (0 errors / 0 warnings); 62/62 vitest (new: 4 github-commit
  — JWT verifies against a PKCS#1 fixture via Web Crypto, token exchange, commit body shape for
  update + create; 2 content round-trip). Cloudflare `npm run build` succeeds with Carta's
  `MarkdownEditor` bundled (client-only mount keeps Shiki off the Worker). **Real GitHub check:**
  the hand-rolled signer minted a live `ghs_` installation token and authenticated a read — risk
  #2 retired (see register). The contents-API author≠committer attribution is structurally
  guaranteed + unit-tested.
- **CSRF/origin.** `/admin/save` relies on SvelteKit's built-in same-origin POST check (same
  posture as the contact remote fn); cross-origin form posts → 403. Bad frontmatter is caught
  from the site validators and bounced to `?error=` rather than 500ing.
- **DONE — verified end-to-end against real `main` (2026-05-25).** With the App secrets in
  `.dev.vars`, a minted session POSTed `/admin/save` for `pages/volunteers` under `wrangler dev`;
  the full chain ran live (session → frontmatter validate → serialize → real App-JWT install
  token → commit). Resulting commit on `origin/main` (`7948da0 "Update pages: volunteers"`):
  **author = Geoff Wright `<geoff-login@907.life>`, committer = `cairn-cms[bot]`** — exactly the
  attribution the spec requires. Diff was clean: the directive-heavy body (`:::passage`,
  `:::grid`) round-tripped **byte-for-byte**; the only change was gray-matter unquoting the title
  (`"Volunteers"` → `Volunteers`). Prod `/admin` stays dormant (prod Workers still lack the auth
  + App secrets).
- **Follow-up (diff noise, not a blocker).** gray-matter's `stringify` reserializes frontmatter
  on every save (unquotes scalars; would also reflow post `tags` arrays to block style, restyle
  dates). Content/directives are never touched. If minimal diffs matter, a Pass D/F task can give
  the adapter a faithful frontmatter serializer (or js-yaml flow options). Logged here, not yet
  ticketed.

### Pass D — cairn-core seam refactor in ecnordic-ski (2026-05-25)

- **Goal met: the adapter contract is real, no behavior change.** All site specifics now sit
  behind a single `CairnAdapter` the core consumes; cairn-core no longer hard-codes a repo,
  collection, tag, directive, sender, or site name.
- **Built.** New: `src/lib/cairn/adapter.ts` — the core interface (`CairnAdapter`,
  `CairnCollection`, the `CairnField` discriminated union: text/date/textarea/boolean/tags) plus
  two pure helpers `findCollection` and `frontmatterFromForm` (decodes a posted form per field
  type — boolean→`==='on'`, tags→`getAll`, else `get`). New: `src/lib/cairn.config.ts` —
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
  markup the hand-written posts/pages forms had — byte-identical output, just data-driven.
  Branding (`siteName`) threads through the **admin `+layout.server.ts`** load so the login/list
  pages stay free of the adapter import (keeps the plugin graph out of those client bundles);
  the edit page already bundles the adapter for `cairn.preview`, so it reads `data.siteName` too.
- **Verified.** `npm run check` clean (0/0) after `svelte-kit sync` regenerated `$types`;
  67/67 vitest (new `adapter.test.ts`: `findCollection` hit/miss + `frontmatterFromForm` across
  posts all-fields / draft-off+no-tags / pages-title-only — guards that the generic decode
  reproduces the retired per-type code). Cloudflare `npm run build` succeeds (editor bundle
  rebuilt, Carta still client-only). code-simplifier run: one consistency fix (edit-page title
  `cairn.siteName`→`data.siteName`), rest sound.
- **Note.** No live `wrangler dev` re-run this pass — it's a pure refactor with identical wiring,
  the unit tests pin the decode equivalence, and Pass C already verified the live save→commit
  chain. The adapter shape is what Pass E's 907-life adapter will implement against.

### Pass E — extract cairn-core to the package (2026-05-25)

- **Goal met: cairn-core is now a real workspace package.** The six framework-agnostic `.ts`
  modules moved out of `ecnordic-ski/src/lib/cairn/` into `cairn-cms/src/lib/`, ecnordic now
  `import … from 'cairn-cms'`, and nothing changed behaviorally — verified by byte-identity
  diffs against the pre-move originals and the unchanged test suites.
- **Clean boundary.** Six modules (`auth`, `email`, `github`, `carta`, `content`, `adapter`)
  with only sibling `./` cross-imports (`github→auth`, `adapter→carta`/`github`). External
  surface is tiny: **`gray-matter`** is the only runtime dep; `unified` (in `carta.ts`) and
  `@cloudflare/workers-types` are **type-only** (devDeps). `carta.ts` deliberately does *not*
  import `carta-md` (it duck-types a local `PreviewCartaOptions`), so the Svelte editor stays
  ecnordic's own dep — the core has zero Svelte-component coupling. gray-matter's `fs` require
  is a non-issue (Pass C already ran `serializeMarkdown` live in the worker).
- **Package shape — the `publishConfig` swap.** Checked-in `package.json` `exports` point all
  three conditions (`types`/`svelte`/`default`) at **source** `./src/lib/index.ts`, so every
  workspace tool (Vite dev *and* the sites' prod worker build, `svelte-check`, vitest) resolves
  straight to source — instant, no build step, zero consumer config (the npm-workspace symlink
  `node_modules/cairn-cms → ../cairn-cms` is noExternal by default, so `vite build` transpiles
  the source into the worker). `publishConfig.exports` swaps those to `./dist/**` **only at
  `npm publish`**; `svelte-package` builds `dist/` at **`prepublishOnly`** (not `prepare`, so
  `npm install` never triggers a build). `files` ships `dist` + `src/lib`; `dist` is gitignored.
  A `tsconfig.json` (scoped to `src/lib/**`) was added beyond the original file list — it's
  required for `svelte-package`'s declaration emit (the workspace root has none to inherit).
- **Why not a `development` export condition (the approach I first drafted, then rejected).**
  Primary-source research ([TS modules reference]) confirmed TypeScript **always** matches
  `"types"`/`"default"` first regardless of object order and ignores custom conditions for type
  resolution — so `customConditions:["development"]` + `types→dist` would force a `dist` build
  just to type-check, defeating instant dev. The **`publishConfig` swap is the proven pattern**
  (Skeleton's monorepo) and needs no `customConditions`, no consumer config. The source-pointing
  exports were validated against the worker build at the Task 1 gate — the documented `--watch`
  fallback was **not** needed.
- **Public API = flat `export *` barrel** (`src/lib/index.ts`) of all six modules. No
  export-name collisions (each module's identifiers are distinct).
- **Importers rewired (10).** `save/+server.ts` (Task 1) + nine more in Task 2: `app.d.ts`,
  `hooks.server.ts`, `cairn.config.ts`, `admin/+page.server.ts`, the two `edit/[type]/[id]/`
  files, and the three `auth/*` endpoints. Each `from '$lib/cairn/<mod>'` → `from 'cairn-cms'`,
  same bindings, type-only stays `import type`; multi-module imports collapsed to one cleanly.
  `+layout.server.ts` never imported a cairn *module* (only `$lib/cairn.config`), so it was
  untouched — correct. The in-tree `src/lib/cairn/` + `src/tests/cairn/` dirs are deleted.
- **Verified.** Package: `npm test` 33/33 across 6 suites (auth crypto/single-use/session,
  github read, github-commit JWT/commit-body, carta-preview wiring, adapter, content);
  `npm run package` emits all six modules + `index` as `.js`/`.d.ts`/`.d.ts.map` to `dist/`
  (publish path sound). ecnordic: `svelte-check` 0/0 (468 files) — proves TS resolves
  `cairn-cms`→source `.ts` via the `types` condition with no `dist`; Cloudflare `npm run build`
  succeeds (Carta still client-only, source bundled from the symlink); vitest 34/34 (the six
  moved suites now live in the package). **Live `/admin` smoke** under `wrangler dev` with a
  minted session: anon→`303 /admin/login`, authed→`200` (Posts+Pages from the live repo),
  `edit/pages/training`→`200` — the moved imports load in-worker.
- **Finding: the locked-decision slug-codec seam is unneeded.** The admin is **filename-based**
  (`[id]` is the bare filename stem), so day-bearing (907-life) and dayless (ecnordic) filenames
  already flow through the Pass D abstraction unchanged — the abstraction is cleaner than planned.
  Recorded so Pass F's 907-life adapter doesn't reintroduce a codec.
- **Deferred to Pass F (unchanged scope):** sharing the admin **Svelte components**/routes (the
  package shape now supports it), private-repo read-token threading, removing `static/admin/`,
  the ROADMAP entry.
- **Two cheap cleanups surfaced by review (logged for Pass F, not blockers):** (1) `bytesToB64url`
  is exported from `auth.ts` only because `github.ts` needs it — it leaks into the public
  `export *`; move it to an unexported `src/lib/utils.ts`. (2) the package `tsconfig.json`
  `include` omits `src/tests`, so package tests are type-checked only by vitest/esbuild, not
  `tsc` — widen it (or add a `tsconfig.test.json` + vitest `typecheck`) before the test surface
  grows. **Note on this pass's ritual:** the code-simplifier step was a no-op — the module/test
  bodies are *verbatim* moves of already-simplified Pass A–D code (running it would risk breaking
  the byte-identity the extraction guarantees), and the only genuinely new artifacts are config
  scaffolding (`package.json`, barrel, `svelte.config.js`, `vitest.config.ts`, `tsconfig.json`).

### Risk #1 follow-up — Cloudflare email (design RESOLVED, provisioning BLOCKED)

Email **Sending** and Email **Routing** are two distinct products under Cloudflare Email Service:

- **Email Sending** (transactional, arbitrary recipients) = `env.EMAIL.send({ to, from, subject,
  html, text })` — the object-form call. This is what cairn uses (`src/lib/cairn/email.ts`).
- **Email Routing** (recipient-restricted) = the `cloudflare:email` `EmailMessage` + mimetext MIME
  form; only sends to *verified* destinations (else `destination address is not a verified address`).

Both ride the **same** `[[send_email]] name="EMAIL"` (+ `remote=true`) binding; the product is
selected by **call shape**. (This corrects an earlier Pass 0 note that wrongly equated Email
Sending with "`send_email` minus `destination_address`".) Email Routing for ecnordic.ski was
enabled via API (MX/SPF/DKIM `cf2024-1._domainkey`, `status: ready`). **Still blocked:** Email
Sending isn't provisioned — needs (a) **Workers Paid plan**, (b) the domain onboarded at dashboard
**Email → Email Sending** (the `/email/sending/*` REST endpoints reject the current API token, so
it's dashboard-gated). **Resend** is the fallback.
