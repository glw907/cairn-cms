# cairn-cms admin — functionality & UI design

**Date:** 2026-05-26
**Initiative:** cairn-cms (see `docs/PLAN.md`)
**Purpose:** Document the complete admin functionality (current + planned), then design the UI holistically against it — so the neutral theme, the Sveltia-style collections nav, and the differentiated edit experiences come out of one coherent IA rather than three separate bolt-ons. This doc is the requirements + design source; it decomposes into implementation passes at the end.

## Status quo (what exists, shipped to prod on both sites)

- **Shared package shell** (`cairn-cms/components` + `cairn-cms/sveltekit`), consumed by ecnordic.ski + 907.life as byte-identical route shims; only each site's `cairn.config.ts` adapter differs.
- **Shell:** DaisyUI `drawer lg:drawer-open` + `navbar`; data-driven, role-gated nav (`AdminLayout.svelte`). Today the nav is `[Content, Editors(owner)]`.
- **Components:** `AdminLayout`, `AdminList`, `EditPage`, `LoginPage`, `ManageAdmins`.
- **Server fns** (`cairn-cms/sveltekit`): `adminLayoutLoad`, `adminListLoad`, `loginLoad`, `editLoad`, `authRequest/Callback/logout`, `saveCommit`, `adminsLoad`, `addAdmin/removeAdmin/setAdminRole`, `requireOwner`.

## Storage principle (clarified 2026-05-26)

**cairn is Cloudflare-first.** Any Cloudflare primitive that makes architectural sense is fair game — D1, KV, R2, Queues, Durable Objects, Cron Triggers, Images, Email, etc. The single fixed point: **content (pages/posts) stays markdown committed to git** — content does not move to a database. Everything else is a free engineering choice, governed by "keep the core lean" (WordPress-bloat is the cautionary tale), not by Cloudflare-avoidance. This narrows the earlier PLAN.md "no D1/database pivot" note to its real intent (no *content* pivot). Per-feature platform choices are made in that feature's pass (e.g. R8 collection store → D1 vs committed config; future scheduled-publish → Cron Triggers; media → R2/Images). Reconcile into PLAN.md locked decisions at close-out.

## Functional requirements

### R1 — Authentication & session
- Magic-link login: request by email → single-use token (KV, TTL) → callback → signed session cookie. Sign out. `/admin/**` guard → login when unauthenticated.
- Per-site KV editor allowlist; no GitHub account or password for editors.

### R2 — Roles (two-tier, per-site, no cross-site SSO)
- `editor`: content only.
- `owner`: content + editor management. Owner-only surfaces gated server-side (`requireOwner`) and hidden from editors in the nav. Both role views share identical chrome — only owners get extra entries/surfaces.

### R3 — Collections (NEW IA — Sveltia-style)
- Each adapter collection is a **first-class sidebar nav entry** (generated from `adapter.collections`), not lumped under one "Content" link.
- Selecting a collection opens its **entries list** (`/admin/[collection]`): entry title/slug, key metadata (date, draft badge), and a "new entry" affordance.
- Replaces today's single stacked list. Nav grows automatically with the adapter — ecnordic shows Posts + Pages as separate items; 907 shows Posts.

### R4 — Differentiated editing (page vs story/post)
- The edit experience adapts to the **collection kind**, driven by the adapter's per-collection `fields` (already present) plus a notion of collection "shape":
  - **Story/post:** rich frontmatter form — date, tags (controlled-vocab for ecnordic / free-form for 907), description, draft toggle — alongside the Carta markdown editor + live preview.
  - **Page:** minimal frontmatter — title + body — with the same Carta editor + preview, fewer/no taxonomy fields.
- Save commits to GitHub `main` (author = editor, committer = bot) → deploy. `draft` frontmatter is the soft publish gate.

### R5 — Editor management (owner-only)
- List editors; add/remove; set role; anti-lockout (no self-demote/remove).

### R6 — Branding & theme (neutral, self-contained)
- `siteName` is the only per-site variable in chrome.
- The admin re-skins itself neutrally regardless of the host site's DaisyUI theme + fonts: a scoped CSS-custom-property + `font-family` override on the admin root (`AdminLayout`), light-only. Direction selected in brainstorm: **"Warm Stone"** — warm-gray neutrals, violet accent, system-ui font. (Sidesteps the DaisyUI "theme must be compiled" constraint because v5 reads `var(--color-*)` at point of use and custom properties inherit through the subtree.)

### R8 — Collection CRUD (create/manage collections from the admin) — NEEDS ITS OWN DESIGN ROUND
- Owners can create/edit/remove **collections** from the UI (name, label, folder, fields, slug pattern), Sveltia/Decap-style — not just entries within a collection.
- **Open architectural decisions (the largest in this initiative):**
  - **Source of truth for user-created collections.** Today collections are compile-time TS in `cairn.config.ts`. Runtime CRUD needs a persisted, editable definition. Candidates to weigh: (a) a **config file committed to the repo** (e.g. `cairn.collections.json`) loaded by the adapter — keeps everything in git, reuses the GitHub-App commit path, one backup/rollback story; (b) **D1** — now sanctioned (see Storage principle), trades the single-git-source story for queryable schema; (c) KV (weakest — opaque, no relations). Decide in the dedicated round.
  - **`renderPreview` is code — hard limit.** A UI-created collection can't author a bespoke directive/render pipeline from a form; it falls back to a **default (plain-markdown) preview**. Code-defined collections (ecnordic's directive pipeline) keep their bespoke preview. The contract must distinguish code-defined vs config-defined collections.
  - Reshapes the adapter contract and touches the locked "adapter is code" decision — to be reconciled in PLAN.md when designed.
- **Not designed this round.** Captured here; gets its own brainstorm (architecture + the manage-collections UI) before any pass.

### R9 — Reuse existing site assets in the editor (icons / images / videos)
- The editor should let authors **insert references to assets that already exist on the live site**, not just type raw paths/names:
  - **Icon picker** — browse + insert from the site's fixed Phosphor set (`icons.ts`) for `icon=` directive attributes (and inline glyphs). Names are a closed vocabulary per site → a visual picker, no memorization.
  - **Asset browser** — list images/videos already committed (e.g. `static/**`) and insert a Markdown/HTML reference. This is the **browse/reuse** half of media; it needs no new storage decision (assets are already in git) and is independent of the **upload** half (R7), which does.
- Per-site: the available icon set + asset roots come from the adapter (the icon set is already site-specific; ecnordic's directive pipeline owns it). Likely a small adapter addition (asset roots / icon list) consumed by an editor toolbar control.
- **Source of truth for the available-assets list (no separate archive — git is the archive):**
  - **Icons:** the site's `icons.ts` — a code-defined **closed vocabulary** the adapter exposes; part of the build, not a runtime list.
  - **Images/videos:** enumerated **live from the repo asset root(s)** (e.g. `static/**`) via the **GitHub contents API** — the same read path cairn uses for content. Whatever is committed is what the picker shows; nothing extra to maintain.
  - **Adapter config:** asset roots (browsable folders) + the public URL base to emit in the inserted reference.
  - **Optional (Cloudflare-first):** cache the listing in **D1** as a rebuildable index if a folder grows large; git stays source of truth. Not needed initially.
- **Editor toolbar (Carta):** the picker(s) live as Carta toolbar actions that insert at the cursor. Sequence with Pass K (editing) or the media work — decide when scoping.

### R10 — Component palette (insert site components in the editor)
- The editor offers a **palette of the site's available components** so authors insert a ready-made block instead of hand-typing directive syntax. Selecting a component inserts a scaffolded snippet at the cursor, e.g. `:::card{icon=flag}\n## Heading\nBody…\n:::`.
- **Per-site, adapter-driven.** ecnordic exposes seven container directives — `passage`, `grid`, `card`, `cta`, `alert`, `split`, `panel` (`remark-ec-directives.ts` `PRIMITIVES`); 907.life has none (plain markdown). So the palette is populated from a **component catalog the adapter supplies** (name, label, description, the insert template, allowed attributes like `icon`/`role`). A site with no components shows no palette.
- **Contract addition:** `CairnAdapter` grows an optional `components[]` (or the collection/preview config carries it). The editor reads it; cairn-core stays directive-agnostic (consistent with the locked preview seam). Ties into R9 (the `icon=`/asset attributes within an inserted component use the icon/asset pickers).
- **Source of truth for the component list (code-defined — git is the archive, NO DB):** a component carries **render logic** (`remark-ec-directives.ts` `PRIMITIVES` + `rehype-ec-primitives.ts`) and **preview CSS** — it's code, the same hard limit as `renderPreview`. So, unlike collections (R8, where user-created defs may need D1/committed-config storage), **components are NOT user-creatable from the UI.** The set is intrinsic to the site's committed directive pipeline.

#### R10a — Component registry (single declaration; eliminates drift)
- **Problem:** today a component is defined implicitly across three files (parser `PRIMITIVES`, render `transform()` switch, icons/CSS). There is no single list the admin can discover, so a hand-maintained palette catalog would **drift** from what actually renders.
- **Design:** introduce a per-site **component registry** — one module declaring each component **once**: `{ name, label, description, insertTemplate, attributes (icon?, role options, …) }`. Everything derives from it:
  - parser `PRIMITIVES` = `registry.map(c => c.name)`;
  - the render `transform()` switch keys off the same names;
  - the adapter exposes the registry → the editor **palette renders from it automatically** (add to registry ⇒ appears in palette; no separate catalog to sync).
- **Creating a new component = a developer task, not runtime.** A new component needs a registry entry **+ a render transform (code) + preview CSS**. The registry entry alone yields the palette button + insert template but renders unstyled without the transform/CSS — the same boundary as `renderPreview`. The registry's job is to make a developer-authored component **appear in the admin automatically** once written. **No UI "create component".**
- **Work implied:** refactor ecnordic's implicit pipeline into an explicit registry; add the registry/`components[]` to the `CairnAdapter` contract. Its own pass (sequence with R10/Pass K). cairn-core stays directive-agnostic.
- **Carta integration:** a toolbar "Insert ▾" menu (or slash-style command) listing the catalog; insertion is a cursor-level text edit (Carta edits raw markdown, so a snippet insert is faithful — no WYSIWYG).

### R11 — Standard formatting toolbar (don't assume markdown-literacy)
- Authors are **not assumed to know markdown.** The editor surfaces a **formatting toolbar** for common operations — bold, italic, heading, link, list (bullet/ordered), quote, code — plus a **Write/Preview** toggle. Clicking a button inserts the markdown at the cursor; typing raw markdown still works for those who prefer it.
- **Provided by Carta** out of the box (its default toolbar covers these); cairn keeps it and adds the R10 component palette + R9 pickers as extra toolbar controls. No custom rich-text surface — the toolbar writes markdown, preserving the raw-markdown / directive-safe model (locked Carta decision).

### R12 — Toggle the preview
- The editor's side-by-side **site preview** pane is **toggleable on/off**, so the editor can expand to full width when the author doesn't need it. State persists across edits (per-user, local). This is distinct from Carta's built-in **Write/Preview** tabs (its own internal pane); R12 is about showing/hiding cairn's directive-safe site-preview column.

### R13 — Canonical extension model (`CairnExtension`) — NEEDS ITS OWN DESIGN ROUND
- **A site is NOT just a theme instance.** It's a full SvelteKit/Cloudflare app that owns its code and grows idiosyncratic features (ecnordic: contact form + Turnstile + Email Workers, `@schedule-x` calendar, Pagefind, events). Core + theme must be **seams, not a frame.**
- **Goal:** one **canonical way to add functionality separate from core** — a typed, **code-defined, build-time-composed** extension contract (NOT a runtime plugin marketplace; honors the lean-core / no-WordPress-bloat locked decision).
- **`defineExtension({ name, navItems?, adminRoutes?, collections?, components?, fields?, hooks?, bindings? })`** — the site's `cairn.config.ts` composes `extensions: [...]`; cairn-core **aggregates** (nav, registry, collections, hooks) without extension code in core.
- **Third reuse axis** beside engine + theme: extensions are **site-local** (never extracted) or a **shared package** (`@glw907/cairn-*`).
- **SvelteKit routing constraint:** `adminRoutes` mount via thin **shim files** (F2 pattern), ideally generated by a `cairn add` / `create-cairn-site` scaffolder; nav/collections/components/hooks compose with no shims.
- **Sequence:** its own design round (reshapes the adapter contract + admin mounting). Naturally **follows the theme-architecture extraction** (which establishes the registry/adapter aggregation cairn-core needs to also aggregate extensions). Detail: `docs/creating-a-cairn-theme.md` → "The canonical extension contract".

### R7 — Future (reserve IA space, do NOT design now)
- Media/image uploads, scheduled publish, revision/rollback. The nav IA must leave room for one more top-level entry (e.g. Media) without a redesign; no screens designed this round.

## UI design

*(To be filled from the holistic companion mockups — full shell with collections nav, per-collection entries list, the two edit variants, manage-editors, and login — all under the Warm Stone theme. Mockups validated with the user before this section is finalized.)*

## Implementation passes (decomposition — finalize after UI sign-off)

The validated design decomposes into shippable passes, each its own plan + minor release + both-site repoint (the established Pass P pattern):

- **Pass I — Neutral self-contained theme (R6).** Scoped CSS-var + font override on `AdminLayout`; one file; light-only Warm Stone. Smallest, ships first.
- **Pass J — Collections-first nav + per-collection entries list (R3).** Data-driven nav from `adapter.collections`; `/admin/[collection]` route + entries view; retire the lumped "Content" page.
- **Pass K — Differentiated editing (R4).** Page vs story/post edit experiences from collection shape + `fields`. (May merge into J if small after the J design lands.)

R1/R2/R5 are already shipped; this round refines IA/UX around them, not their logic.

## Verification (per pass)

Package `svelte-package` + vitest; both sites `svelte-check` 0/0 + Cloudflare build; live `wrangler dev` smoke on **both** sites (different host themes — the real test that neutrality holds) with minted editor + owner sessions; visual confirmation in Firefox. Release via Trusted-Publishing OIDC + both-site lockfile repoint; both CI deploys green.
