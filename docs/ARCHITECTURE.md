# cairn-cms — Architecture (v2)

> **Status: canonical architecture reference — v2 (Architecture-Refinement pass, 2026-05-26).**
> v1 (consolidated 2026-05-26) was red-teamed in `docs/ARCHITECTURE-CRITIQUE.md`; this v2 resolves every
> CHANGE/GUARD/DEFER and open decision the critique raised (see §11 for the decision ledger) and is the
> settled target the re-sequenced build passes in `docs/PLAN.md` execute against. Where a thing is **built**
> vs **planned**, it says so — several v2 decisions describe a *target* that a named future pass realizes;
> the current prod state is still the shipped bespoke implementation until that pass lands.

## 1. Purpose & scope

cairn-cms is an **embedded, magic-link, GitHub-committing CMS** for **SvelteKit sites on Cloudflare
Workers**. Non-technical authors log in by email (no GitHub account, no password), edit **raw
markdown** in a Carta editor with a live, design-accurate preview, and **saving commits to `main`**
via a GitHub App (author = editor, committer = `cairn-cms[bot]`), which triggers the site's existing
CI → redeploy. It is **opinionated, not universal**: it assumes Cloudflare + SvelteKit + DaisyUI +
Tailwind + GitHub, and does not try to abstract those away. Two live consumers: ecnordic.ski, 907.life.

**Premise re-validated (2026):** a fresh scan (Sveltia, Decap, TinaCMS, Keystatic, Pages CMS, Front
Matter, …) confirms **no tool does all three of** {magic-link email auth, no GitHub account for editors} +
{git-commit storage} + {embedded in a SvelteKit Cloudflare Worker}. Closest is **Pages CMS** (does 1+2 but
needs PostgreSQL + a Node server — fails the embed-on-Workers criterion). **Build is justified.**

## 2. The layered model

| Layer | What it is | Reuse / distribution |
|---|---|---|
| **Engine** — `@glw907/cairn-cms` | Shared CMS machinery: auth (→ better-auth on D1, see §4), `/admin` guard, GitHub-App commit, admin shell + components, the render-engine + registry machinery, the sveltekit server-logic functions | **Live, semver npm dependency.** Updates propagate on bump. **Engine-fat / site-thin is a hard rule** (H1). |
| **Site template** | A starting point: public SvelteKit/Tailwind/DaisyUI design + a component registry + a default `cairn.config.ts` adapter + sample content | **Scaffold-copy (starter model).** Copied into a new repo; the site owns + diverges; template updates do **not** propagate. *(Planned: `create-cairn-site`.)* **Not a WP/Hugo "theme"** (H2 — Hugo overlays at runtime; SvelteKit/Vite resolve at compile time; closest live analogue is Astro Starlight; "theme" retired for the site-design concept). |
| **Extension** — `CairnExtension` | Optional, composable feature module: nav entries, admin routes, collections, components, field types, save/commit hooks, declared bindings | **Code-defined, build-time-composed.** Site-local **or** shared npm package. **Governed contract** (H5). *(Planned — R13, own design round.)* |
| **Cairn site** | A full SvelteKit/Cloudflare app that **owns its code** | Composes engine + extensions + its own bespoke logic; scaffolded from a site template. |

**Engine-fat / site-thin (settled, H1).** *All* security-critical and fix-prone logic lives in the live
engine (auth, commit, admin shell/components, server logic, the render-engine + registry mechanics) so a
fix is a semver bump that propagates. The copied site code is **presentation only**: registry *data* + builders +
icons + CSS + thin route shims. This is the only robust answer to "scaffold-copy can't propagate fixes." An
**engine version stamp** + Renovate config ship in the scaffold so drift is visible (H1 mitigation).

**Engine vs site line (settled):** machinery → engine (pipeline factory, directive-stamp plugin,
rehype dispatcher + shared structural helpers, registry *type*, glyph helper); **data + builders +
icons + CSS → site code** (the registry *entries*). See `creating-a-cairn-site.md`.

## 3. Data & storage model

- **Content (pages/posts) = markdown committed to git. The single source of truth. No content DB.** (Locked.)
- **Cloudflare-first** for everything else: any CF primitive that fits is fair game, governed by "keep the core lean," not CF-avoidance.
  - **D1** *(auth: planned — auth-migration pass; non-content stores: sanctioned)* — **becomes the auth store** via better-auth (users/accounts, sessions, magic-link verification tokens — strongly consistent, §4). Also the sanctioned home for a future collection-definition store (R8), a rebuildable content/asset *index*, ephemeral state. Never content.
  - **KV** *(built; auth use retired post-migration)* — today holds the per-site editor allowlist (email→{name,role}) + single-use magic-link nonces. After the better-auth migration, **users + roles live in D1** and KV's auth role retires; KV remains available for non-critical caches/indexes if needed.
  - **R2 / Images** *(future)* — media uploads (R7); default to **R2** (zero egress), URL-only in markdown — never binaries in git (M7). Browsing *existing* committed assets (R9) needs no new store (git is the archive).
- **Reads:** the GitHub **contents API** today; **switching listing to the Git Trees API** (H4) — the contents API silently truncates directory listings at **1,000 entries** and returns `null` for files **>1 MB**. Reads are authenticated via the App install token (5000/hr; anonymous shared-IP reads 403 in prod — hotfix 0.3.1). **Collection sharding** (year/month) is deferred to a documented trigger (~500 files/collection).
- **Writes:** single-file **contents-API PUT** (`commitFile`) — one file per commit, with **409 fail-safe** (C3, §5). Multi-file atomic writes (git-data tree API) remain out of scope until a feature needs them (relations, rename-with-references).

## 4. Identity, auth & roles

> **v2 decision (P2/C1/H3 — Refinement pass): adopt `better-auth` (D1 adapter + magic-link plugin), replacing
> the hand-rolled magic-link/session/role stack.** Rationale: the project is early, so the better long-term
> result outweighs preserving the shipped bespoke auth; better-auth is mainstream (~25k★, ~600k+ weekly npm),
> runs natively on Workers+D1, and is what Pages CMS uses for this exact pattern. It fixes **C1 by construction**
> (D1 strong consistency makes single-use real, not best-effort), retires the hand-rolled JWT/token lifecycle +
> the missing timing-safe compare (**H3**), and enables **DB-backed session revocation** (resolves **M3**).
> *(Migration is a dedicated pass, sequenced before the extraction — see `docs/PLAN.md`.)*

- **Magic-link, passwordless** via better-auth's magic-link plugin on **D1**: email → (if permitted) a single-use verification token persisted in D1, short TTL, emailed via **Cloudflare Email Sending** (`env.EMAIL.send`, wired in better-auth's send hook). **No password, no TOTP, no GitHub account for editors** — email is the single factor.
- **POST-confirm flow (C2 — required, build during migration).** better-auth GET-redeems by default, so corporate email scanners (Defender/Proofpoint/Mimecast) prefetch and **burn the link** before the user clicks. The email link lands on a confirmation page (GET, no consumption); a **"Confirm sign-in" button POSTs**; the token is consumed on POST (scanners don't POST). Also closes the GET/CSRF/`Referer`-leak vector; set `Referrer-Policy: no-referrer` on the confirm page.
- **Two-tier roles** (`owner`/`editor`) re-implemented on better-auth (user role field / admin plugin pattern). Owner-gates the manage-editors surface (`requireOwner`). Anti-lockout (no self-demote/remove). **Per-site, no cross-site SSO.** The 4 seeded AUTH_KV owner allowlists migrate into the D1 user table during the pass.
- **Sessions are DB-backed** (better-auth) → an editor removed/demoted can have their session invalidated server-side (instant revocation; the old signed-cookie model couldn't, M3). `httpOnly/Secure/SameSite=Lax` cookies.
- **Origin is always config (`PUBLIC_ORIGIN`), never request-derived** (H3(c) — cairn already tripped this once). **Guard** in `hooks.server.ts` enforces a session on `/admin/**`; `/admin` excluded from prerender/Pagefind/sitemap.
- **Email channel guard (H6):** Cloudflare Email Sending is beta and the sole auth channel — wrap sends with explicit user-facing errors + an audit log; keep **Resend** as a coded fallback; track GA.

## 5. Commit / publish flow  *(built; 409 fail-safe planned)*

- **GitHub App**, short-lived install tokens. App JWT is **RS256 signed in-Worker with Web Crypto** (no octokit/auth-app; PKCS#1→PKCS#8 conversion in-process). **This stays bespoke** — better-auth replaces only the *editor* auth, not the GitHub-App machine identity. **GUARD (M2):** prefer `jose`/`importPKCS8`, add an `/admin/healthz` that signs a dummy JWT, and document key rotation incl. the conversion step.
- Commit attribution: **author = editor, committer = `cairn-cms[bot]`**. **Publish = commit to `main`** → the site's existing GitHub Actions build + deploy. `draft` frontmatter is the soft gate. No PR-review workflow (out of scope).
- **Concurrent-edit 409 fail-safe (C3 — required).** `commitFile` reads the blob SHA then PUTs; if anything commits in between (another editor *or the site's own CI*), GitHub returns **409**. Today it fails raw. Fix: catch 409 → re-fetch → surface "this file changed since you opened it — reload and reapply." Fail **safe**; full merge stays out of scope.
- **Non-developer safety net (M1).** Server-side frontmatter/schema **validation before commit** (already runs via `collection.validate` → bounces to `?error=`; keep it a hard pre-commit gate, never commit invalid) + a **deploy-status signal** + a **revert-last-change** affordance (folded into the new admin-UI passes).
- Frontmatter round-trips via gray-matter (a known cosmetic diff: scalar re-quoting).

## 6. Rendering pipeline & component registry  *(engine half: planned — extraction)*

- A unified pipeline: `remarkParse → gfm → remark-directive → [directive-stamp] → remark-rehype(allowDangerousHtml) → rehype-raw → [dispatch] → rehype-slug → stringify`.
- **Directive components** (`:::card`, `:::grid`, `:::cta`, …): the engine provides the generic stamp plugin + rehype **dispatcher** + shared structural helpers; the **site** supplies a **component registry** — one declaration per component `{ name, label, description, insertTemplate, build, defaultIconByRole }`. Parser names, render dispatch, and the editor **component palette** all derive from the registry (no drift — R10a).
- **Preview parity:** the Carta editor preview renders through the **same** plugins (the adapter's `renderPreview`), so the author sees the live-site design. The preview is **site-styled**, not admin-themed.
- **Bundle guard (C4/M5):** Carta/Shiki stay **client-only** (already true) — enforce the boundary in tests, keep Shiki off the server, lazy-init heavy objects, and run `wrangler deploy --dry-run` in CI to catch size/startup regressions (Workers 3 MB Free / 10 MB Paid; 1 s startup CPU).

## 7. The adapter contract — `src/lib/cairn.config.ts`  *(built; growing)*

`CairnAdapter` is the single seam the engine consumes. Today: `siteName`, `sender`, `backend
{owner,repo,branch,appId,installationId}`, `collections[] { name, label, folder, fields[], validate }`,
`renderPreview(md)`. `fields[]` is a discriminated union (`text|date|textarea|boolean|tags|freetags`),
driving the data-driven edit form. **Filename-based ids** (no slug codec needed). **Planned additions:**
`components[]` registry (R10a), asset roots + icon set (R9), `extensions[]` (R13), per-collection edit "shape" (R4).
The editor component depends on a thin **`MarkdownEditor` interface** (`getValue/setValue/onInput`), not Carta's
API directly (P3/M6) — staying on Carta now, with a one-file escape hatch to bare CodeMirror 6 if the R10 palette needs it.

## 8. The admin app  *(built; redesign planned)*

- **Routes are thin shims** in each site's `src/routes/admin/**` (SvelteKit filesystem routing forces route *files* per-site), delegating to `@glw907/cairn-cms/sveltekit` server logic + `@glw907/cairn-cms/components`. `diff -rq` across sites: byte-identical except `cairn.config.ts`.
- **Shell:** a responsive DaisyUI `drawer`+`navbar` with a **data-driven, role-gated nav**. Adding a surface = one nav entry + route shim + component.
- **Planned redesign (R1–R13):** neutral self-contained "Warm Stone" theme (R6); collections-first nav + per-collection lists (R3); page-vs-story differentiated editing (R4); component palette (R10) + icon/asset pickers (R9); standard formatting toolbar (R11); preview toggle (R12); collection-CRUD (R8); the extension model (R13).

## 9. Distribution & versioning  *(built)*

- **Engine:** published to public npm as `@glw907/cairn-cms` (MIT). The `publishConfig`-swap exports point at **source** in the workspace (instant dev via the workspace symlink) and at **`dist`** on publish (`svelte-package` builds at `prepublishOnly`). Subpath exports: `.`, `/sveltekit`, `/components`.
- **Releases:** Trusted-Publishing **OIDC** GitHub workflow (no stored npm token). Sites pin a semver range, regenerate standalone lockfiles, CI `npm ci` + build + deploy.
- **Workspace:** npm workspaces symlink the engine into both sites for zero-publish local dev; importing `@sveltejs/kit` in the package **forces a single shared kit + vite major** across all sites. **Keep `@sveltejs/kit` a `peerDependency`** (never a dependency) + assert one resolved version in CI (M4 — already retired, keep the guard). Extensions peer-dep **only `cairn-cms`**, never kit/vite (H5).

## 10. Load-bearing assumptions — v2 verdicts

The §10 assumptions from v1, with the Refinement disposition (full reasoning in `ARCHITECTURE-CRITIQUE.md` + §11):

1. **Commit-as-publish UX acceptable** — *Conditional → addressed:* pre-commit validation + deploy-status + revert (M1) folded into the admin-UI passes.
2. **No content DB suffices for read/list** — *Conditional → addressed:* switch listing to the **Git Trees API**; document the 1 MB body cap; shard at a trigger (H4).
3. **Single-file commits enough** — *Holds, boundary noted:* the git-data tree API is the escape hatch for atomic multi-file (relations/renames) — don't pre-build.
4. **Concurrent-edit rare/tolerable** — *Partially invalid → fixed:* **409 fail-safe** required (C3).
5. **Hand-rolled auth adequate** — *Superseded:* **adopting better-auth** (the project is early; better long-term result). The bespoke editor-auth retires.
6. **KV consistency OK for single-use** — *INVALID → fixed by construction:* single-use moves to **D1** (strong consistency) via better-auth (C1).
7. **Role-in-signed-cookie acceptable** — *Improved:* better-auth uses **DB-backed sessions** → instant revocation now possible (M3). Secret hygiene still applies.
8. **Scaffold-copy right** — *Yes, iff* engine-fat/site-thin (H1) + **drop "Hugo-like"** (H2). Both adopted as hard rules; version stamp + Renovate in the scaffold.
9. **Lean core, extensions absorb growth** — *Yes, iff governed:* narrow versioned `CairnExtension`, peer-dep only `cairn-cms`, data+components not internals, build-time validation, generated route shims, governance doc before the first external extension (H5).
10. **Components are code** — *Sound* (render + CSS are code; only collection *definitions* may be runtime-created).
11. **Opinionated lock-in is a feature** — *Sound* (intentional; not challenged).
12. **Bundle fits the Worker** — *Yes, with guards:* Carta/Shiki client-only enforced in tests + bundle/startup CI guards + lazy-init (C4/M5).

## 11. Decision ledger — Refinement pass (2026-05-26)

| Critique item | Severity | Verdict | Resolution (where it lands) |
|---|---|---|---|
| **C1** KV-nonce replay | CRITICAL | **CHANGE → adopt better-auth/D1** | Single-use on strongly-consistent D1; auth-migration pass |
| **C2** scanner prefetch burns link | CRITICAL | **CHANGE → POST-confirm** | Confirm page that POSTs; auth-migration pass |
| **C3** concurrent-edit 409 | CRITICAL | **CHANGE → fail safe** | Catch 409 → reload prompt; robustness pass / commit path |
| **C4** Carta/Shiki bundle wall | CRITICAL-if-regressed | **GUARD** | Client-only enforced in tests + CI dry-run |
| **P2** adopt better-auth | — | **ADOPT** | Replaces bespoke magic-link/session/roles (§4) |
| **P3/M6** editor engine | MED | **`MarkdownEditor` interface now; CM6 is the leaning long-term target** | Add the thin interface during extraction. The "stay on Carta" leg was rewrite-cost avoidance, which the north star discounts — so at R10 the burden flips to *justifying keeping Carta* (a ~753★ single-maintainer wrapper) over owning bedrock **CodeMirror 6** (ecosystem-standard, what Carta wraps; the palette wants CM-instance hooks → Carta risks being a leaky layer). Decide at R10 when the palette's editor-instance needs are known; default expectation = migrate to bare CM6 + custom toolbar. |
| **H1** scaffold-copy can't propagate | HIGH | **CHANGE the line → engine-fat/site-thin** | Hard rule (§2) + version stamp + Renovate |
| **H2** "Hugo-like" wrong | HIGH | **CHANGE terminology** | Drop "Hugo-like"; "starter/scaffold", Astro-Starlight analogue |
| **H3** timing-safe / token-in-URL / origin | HIGH | **CHANGE → mostly subsumed by better-auth** | Lib owns compare/lifecycle; we add `Referrer-Policy` + origin audit |
| **H4** contents-API caps | HIGH | **CHANGE → Git Trees API** | Listing swap + 1 MB doc; shard at trigger |
| **H5** extension contract calcification | HIGH | **CHANGE R13 principles** | Governed contract; baked into the R13 round |
| **H6** Email Sending beta | MED | **DEFER + GUARD** | Error-wrap + audit + Resend fallback; track GA |
| **M1** non-dev safety net | MED | **CHANGE** | Pre-commit validate (mostly built) + deploy-status + revert |
| **M2** PKCS#1→PKCS#8 brittle | MED | **GUARD** | `jose`/`importPKCS8` + `/admin/healthz` + rotation doc |
| **M3** role-in-cookie revocation | MED | **DEFER → improved by better-auth** | DB sessions enable revocation; secret hygiene |
| **M4** kit `instanceof` boundary | MED | **GUARD (already retired)** | Keep kit a peerDep; assert one version in CI |
| **M5** Workers edge limits | MED | **GUARD** | Lazy-init; pin wrangler v4 + nodejs_compat + recent compat date |
| **M7** media in git/LFS | MED | **DEFER** | R2, URL-only, when R7 is scoped |

## 12. Cross-references
- Locked decisions, risk register, per-pass log, **re-sequenced roadmap**: `docs/PLAN.md`.
- Red-team this doc was built against: `docs/ARCHITECTURE-CRITIQUE.md`.
- Layered model, engine/site line, extension contract, authoring guide: `docs/creating-a-cairn-site.md`.
- Admin requirements R1–R13: `docs/superpowers/specs/2026-05-26-admin-ui-design.md`.
- Forward-compat memo (capability door-opening): `docs/FORWARD-COMPAT.md`.
- Theme-architecture extraction plan: `docs/superpowers/plans/2026-05-26-theme-architecture-extraction.md`.
