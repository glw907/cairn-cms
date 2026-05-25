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
| Editor identity | **Magic-link email** — no passwords, no GitHub for editors |
| Magic-link delivery | **Cloudflare Email Service** (`env.EMAIL.send`), *not* the Email Routing `send_email` binding (recipient-restricted). Fallback: Resend |
| Editor component | **Carta** `carta-md` v4.11.2 (Svelte 5, unified/remark-native), edits **raw** markdown |
| Preview | Each site supplies its own `renderPreview(md)` → directive-safe per design |
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
- **Pass E — 907.life onboarding.** Write 907-life's adapter (day-bearing slug codec,
  `remark-html` preview, its frontmatter). Validates the abstraction on a different design.
- **Pass F — Extract + cleanup.** Move `src/lib/cairn/**` into the `cairn-cms` package;
  both sites depend on it. **Remove `static/admin/`**; close backlog #4; update
  `docs/STATUS.md`, `docs/architecture.md`, `ROADMAP.md` (log the cairn initiative).

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
2. **GitHub App auth on Workers** (HIGH) — RS256 JWT signing via Web Crypto +
   `@octokit/auth-app` under `nodejs_compat`. *Verify:* mint an install token + make one test
   commit from `wrangler dev`. *Fallback:* fine-grained PAT on a service account (user OK'd).
3. **Carta v4.11 plugin-injection API** (MED) — exact extension/transformer shape to add the
   site's remark/rehype plugins; SSR (disable Shiki server-side); sanitizer
   (isomorphic-dompurify). *Verify:* round-trip an `about.md` directive page → diff = clean.
4. **Magic-link security** (MED) — single-use (KV nonce delete on redeem), 10-min TTL,
   constant-time compare, `httpOnly/Secure/SameSite=Lax`, `/admin` excluded from prerender +
   Pagefind index + sitemap/robots.
5. **Workspace/CI linking** (LOW) — sites resolve local cairn in dev, pinned version in CI.

## Verification (end-to-end, per site)

`npm run build` + `npx wrangler dev` (pipe `sleep infinity`), open in **Firefox** at :8787.
1) Request magic link to an allow-listed external email → arrives → click → authenticated
`/admin`; non-allowlisted rejected. 2) Edit a prose post **and** a directive page; save;
confirm a `main` commit with **author = editor, committer = bot** and a clean `git diff`.
3) CI deploys; change live. 4) `svelte-check` clean; `/admin` absent from prerender/Pagefind.
5) Negative: expired link rejected, reused link rejected, no-session `/admin` → login.

## Out of scope (initiative)

Media/image upload UI; role tiers / PR-review workflow (`draft` is the gate); editing
`src/content/events`; cross-site SSO (each site has its own allowlist/session).

## Notes / progress log

> Session-by-session execution state and post-mortems. The workspace `CLAUDE.md` stays lean
> (durable orientation only); running progress lives here, in the git-backed plan.

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
- **Outstanding for sign-off.** Live magic-link delivery (blocked on Email Sending provisioning,
  risk #1). `.dev.vars` holds dev `MAGIC_LINK_SECRET`/`SESSION_SECRET` (gitignored); prod still
  needs `wrangler secret put` for both. GitHub-App secrets unused until Pass C. Not yet committed.

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
