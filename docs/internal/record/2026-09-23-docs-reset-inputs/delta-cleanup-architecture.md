# Cleanup-since-2026-08-15 delta vs. public docs outline

Scope: audit-remediation initiative (csrf-hardening, foundations A/B, retires,
conventions 4a/4b, internals A/B/C, chassis A/B, identity-seam, polish
11a/11b-i/11b-ii/C) plus the Go tool's own architecture (ADR 0001).

## 1. Architecture changes an extender/contributor would notice

Concrete layout/module changes since 2026-08-15:

- **`content-routes-core.ts` split into siblings** (internals-B,
  `docs/HISTORY.md:1319-1324`): retired into `content-routes-{shared,context,
  list,preview,settings,entry-read,entry-write,entry-destructive,entry-revert,
  dictionary,shell,tidy,media-library,media-shared,media-delete,media-ingest,
  media-metadata}.ts` behind an unchanged `content-routes.ts` composition
  root. `content-routes-entry.ts` (1,630 lines) is now the one monolith the
  split itself created, not yet resolved (`docs/HISTORY.md:1341-1344`).
- **`audit/rendered.ts` became a directory barrel** (`docs/HISTORY.md:1320`).
- **`CairnMediaLibrary.svelte`** shed five dialogs into their own components
  (`docs/HISTORY.md:1321`).
- **`EditPage.svelte`** collapsed 13 `EditorApi`-holder props onto one
  identity-guarded `registerEditor(api)` prop, shed `ShareLinkPanel`,
  `DetailsPanel`, and three `.svelte.ts` controllers
  (`docs/HISTORY.md:1321-1323`) — correctly documented already in
  `docs/extend/migration-notes.md:285-297`.
- **`ec-*` -> `cairn-*` emitted-class rename** (internals-C,
  `docs/HISTORY.md:1288`, the pass's one `Consumers must:` event). Zero `ec-*`
  hits remain in current `src/lib` or the live `docs/extend` arm; only
  historical archives/old rebuild plans still show it (not a live-doc finding).
- **`docs/internal/src-lib-map.md`** contributor map created
  (`docs/HISTORY.md:1289`).
- **Chassis-A structural split** (`docs/HISTORY.md:1250-1263`):
  `cairn.config.ts` split into `icons.ts` and `markdown-components.ts`; the
  render trio (`iconSpan`, `cardShell`, `headRow`) deleted from the engine and
  re-homed in the site chassis (now `src/chassis/render.ts`); `/render` is now
  type-only, with a `Consumers must:` line naming four sites' imports;
  `cardShell`'s inlined classes renamed to `cairn-alert-body`/
  `cairn-head-title` to dodge a DaisyUI/Tailwind scan collision.
- **Identity seam** (`docs/HISTORY.md:1216-1226`): `createAuthGuard({
  identity })`, an `IdentityResolver` contract (`ResolvedIdentity`/
  `IdentityRefusal`), `locals.cairnIdentity` published on every admin path.
  Fully documented in `docs/extend/security-model.md` (Identity from a gate
  section) and `docs/reference/README.md:53`.
- Foundations A/B, retires, conventions passes were surface-shape (export/type
  retires, canonical-home dedup, verb renames), not file-layout changes.

**Verdict on the four target pages — none is stale:**

- `docs/extend/architecture.md` — current. Describes the engine at the
  subpath level (`/sveltekit`, `/components`, `/admin-toolkit`, `/islands`,
  `/render`, `/delivery`, `/media`, `/auth-store`, `/auth-channel`,
  `/auth-crypto`, `/cloudflare`, `/vite`, `/ambient`); all confirmed as
  current directories. No internal-file claims broken by the splits above.
  **Gap, not staleness:** its "seams a site extends through" bullet list
  predates the identity seam and doesn't name it, even though
  `security-model.md` documents it in full — worth a docs-friction-log entry
  if architecture.md is meant to be the canonical seam index.
- `docs/extend/what-the-scaffold-wrote.md` — current. Already lists
  `src/theme/icons.ts` and `src/theme/markdown-components.ts` (lines 80, 82)
  as split from `cairn.config.ts` (line 78); table (132-134) matches the
  chassis-A outcome exactly.
- `docs/extend/build-a-site-by-hand.md` — current. No stale references to
  `ec-*`, `content-routes-core.ts`, pre-split `EditPage.svelte` internals, or
  the pre-split render trio.
- `docs/extend/design-your-site.md` — current. Chassis/theme boundary
  description matches chassis-A's outcome (composition primitives now live in
  chassis, not engine).

Internal file splits are invisible to these pages by design — they describe
seams/subpaths, not internal files, which is exactly the boundary the docs
freeze + `check:reference`-gated reference arm is meant to preserve.

## 2. Retired/renamed public surface vs. docs

56 total retires (38 unsanctioned deletions + 18 sanctioned-leak deletions),
full record `docs/internal/record/2026-08-30-retires-move-record.md` (18 rows)
plus `docs/internal/engine-rulings.md` ledger-close headers for the full 56.

**No remediation needed** — every remaining docs mention of a retired name is
a deliberate, correctly-worded disclosure, not staleness:

- 18 sanctioned-leak types (`AdvisoryNotice`, `LoginData`, `ConfirmData`,
  `EntrySummary`, `GettingStarted`, `MarkdownReferenceRow`,
  `TidyKeyProbeResult`, `NavPageOption`, `ReproInstance`, etc.) appear in
  `docs/reference/sveltekit.md` and `docs/reference/reproductions.md` each
  with the exact sentence "`<Name>`, named in `<field>`, carries no export row
  of its own: a consumer reaches it as `<replacement expression>`" (e.g.
  `sveltekit.md:919-922,1988,1993-1994,2006`; `reproductions.md:95`).
  `docs/reference/README.md:80` uses `EntrySummary` as its own worked example.
- `roleHome` — `docs/reference/core.md:961`, correctly past-tensed as
  retired.
- `TextInput`, `SelectInput`, `FieldRow`, `itemNoun`,
  `computeCountLine`/`computeAppliedFilters` — `docs/reference/
  admin-toolkit.md:93,103-104,164,309,517,540-551,700` explicitly say
  "retired from this subpath," explaining the surviving component that
  subsumed the behavior.
- `LinkTarget`, `LoginData`, and the chassis-deferred trio
  (`iconSpan`/`cardShell`/`headRow`) appear in `docs/extend/
  migration-notes.md:160-175` as intended per-version upgrade guidance (this
  file is explicitly exempted from the docs freeze for exactly this purpose).

No docs page claims a retired export is still importable from its old
subpath, and none omits the retirement while describing old usage as current.
(38 unsanctioned-deletion names spot-checked for zero docs hits; all clean,
not exhaustively re-verified line by line.)

## 3. The chassis

`examples/showcase` is the chassis: the seed every theme copy and
`templates/waymark` descend from (spec
`docs/superpowers/specs/2026-09-04-chassis-passes-design.md`; emitted via
`scripts/build/emit-template.mjs` / `packages/create-cairn-site/scripts/
{emit-template-dir,bake-template}.mjs`). Chassis-A (structural, merged
2026-09-08), chassis-B1 (PR #51, merged 2026-09-08), chassis-B2 (merged
2026-09-09); HISTORY at `docs/HISTORY.md:1119-1263`.

What a freshly scaffolded site now contains:

- Root config: `svelte.config.js` (Cloudflare adapter, `csrf.checkOrigin:
  false`, `$chassis`/`$theme` aliases), `vite.config.ts` (cairnManifest
  plugin), `wrangler.jsonc` (AUTH_DB, APP_DB, EMAIL, MEDIA_BUCKET,
  PUBLIC_ORIGIN bindings), `migrations/` + `migrations-app/`.
- `src/chassis/` (genre-free plumbing, new/consolidated home): `archive.ts`,
  `content.ts`, `date.ts`, `dev-gate.ts`, `entry-data.ts`, `feed.ts`,
  `public-routes.ts`, `render.ts` (now home to `headRow`; `cardShell`/
  `iconSpan` inlined at call sites), `theme-toggle.ts`, `composition.css`
  (seven primitives: `.cairn-card`, `.cairn-band`, `.cairn-section`,
  `.cairn-hero`, `.cairn-sidebar-layout`, `.cairn-site-shell`/
  `.cairn-site-main`, focus-ring), `tokens.css`, `prose.css`,
  `cairn.server.ts`, `README.md`.
- `src/theme/`: `cairn.config.ts` (now adapter/concepts/backend/navLayout
  only, post chassis-A split), `icons.ts`, `markdown-components.ts`,
  `site-config.ts`, `site.config.yaml` (now also carries `menus.footer`,
  added B2 Task 4), `site.css`, `theme.css`, `components/` (`ArticleView`,
  `SiteHeader`, `SiteFooter`, plus new `EntryRow.svelte` from B1 Task 6),
  `islands/Banner.svelte`.
- `src/content/`: `pages/`, `fragments/`, `posts/` — 14 sample entries ship;
  B2's extra 27-post archive-proving corpus is excluded from the scaffold by
  path.
- Routes: admin catch-all + `admin/signups` custom-screen example; public
  `(site)` catch-all, markdown twin route, `archive/[page]/`,
  `preview/[token]/`, `styleguide/`, feeds, sitemap, robots, media route,
  healthz, error page.
- Excluded/deleted, never scaffolded: `probe-craft/` fixture route,
  `IntroLedger.svelte`, `Carousel.svelte`, `scripts/reference-capture.mjs`
  (dead code removed chassis-A Task 5).
- Prettier config and a standalone `vitest.config.ts` + `test:unit` covering
  chassis pure functions now ship too.

**Docs accuracy:** `docs/extend/what-the-scaffold-wrote.md` is accurate and
current (correctly omits `probe-craft/`, states 14 sample posts, reflects the
`cairn.config.ts` split). `docs/extend/design-your-site.md:14,107-108`
correctly documents the five composition primitives chassis-B1 made the
showcase actually use. No staleness found, though the pages stay terse by
design (e.g., `EntryRow.svelte` and the exact `site.config.yaml`/
`menus.footer` shape aren't separately narrated beyond the file table — not
wrong, just terse).

## 4. New conventions/gates a contributor would need

New/changed gates from this initiative:

- **csrf-hardening**: no new `check:*`; added discriminated CSRF-guard log
  fields (`docs/reference/log-events.md:39,68`).
- **conventions 4a** (`2026-08-30-conventions-pass.md`): no new top-level
  gate; extends `check:surface`, `check:rulings-format`, `check:dev-package`,
  `check:template`, `check:consumers`; establishes the `Failure`/`Refusal`
  naming convention.
- **internals A**: introduces `check:self-use` (renamed from a rejected
  `check:dogfood`, plan:124-125,169,826) — proves the engine dogfoods its own
  exports; folds an "F-1 leak-class rider" into `check:surface` rather than
  naming a new gate; extends `check:reference` with a props-vs-reference
  clause (plan:440-442). Plan explicitly treats gate-name proliferation as a
  cost (plan:157-160, "~30 [check:*] names already; each new name is
  [justified individually]").
- **internals B**: introduces `check:cm-internals` (CI-only, allowlist-gated
  coupling floor on CodeMirror internals; plan:404,419,610-653), documented
  only in `docs/internal/cm-editing-surface-alignment.md` and
  `docs/internal/admin-design-system.md:858` — maintainer docs, not
  CONTRIBUTING.md.
- **internals C**: introduces `check:idioms` (plan:157,170,205,227,240),
  "born green," with a full rule catalogue (E1-E7/V1-V4/F1-F4/M1-M4/N1-N6/
  A1-A5/L1-L3/T1-T6/S1-S4) in the companion `docs/internal/code-idioms.md`.
- **Polish 11a/11b-i/11b-ii/C**: no new gate names; 11a/11b hold
  `check:surface` byte-identical, polish-C explicitly changes it with full
  disclosure (plan:609-618).

Current roster: 34 `check:*` npm scripts (package.json:37-87), all confirmed
present and mapped to real `scripts/checks/*.mjs`/shell scripts.

**Documentation is scattered, with an explicit gap:**

- `docs/internal/docs-maintenance.md` tabulates only the 10 docs-checking
  gates (`check:reference`, `check:reference:signatures`, `check:snippets`,
  `check:docs`, `check:arm-indexes`, `check:readiness`, `check:symbols`,
  `check:package`, `check:consumers`, `check:vale`).
- `CONTRIBUTING.md` deliberately refuses to enumerate the full list
  ("CI is the authority... derive the list from
  [`.github/workflows/`]," CONTRIBUTING.md:64-67), naming only
  `check:docs`, `check:comments`, `check:reference`, `check:surface`.
- `docs/internal/pass-gate-tiers.md` documents gate *tiering* (which files
  trigger which subset) for 10 gates, not a full roster/explanation.
- The remaining ~20 gates (`check:idioms`, `check:self-use`,
  `check:cm-internals`, `check:chassis-boundary`, `check:public-tokens`,
  `check:custom-surface`, `check:visuals`, `check:touch-targets`,
  `check:interactive-contrast`, `check:invisible-craft`,
  `check:admin-css-classes`, `check:prose`, `check:tool-*`,
  `check:target-stack`, `check:version`, `check:transcripts`, `check:facts`,
  `check:rulings-format`, `check:editor-quotes`, `check:dev-package`) each
  live only in their own script source plus scattered pass-plan mentions —
  **no single contributor-facing doc lists all ~34 gates together.**

Go tool (`tool/`) architecture: `tool/docs/adr/0001-the-spine-is-the-product.md`
— every capability lives behind a package boundary (`store`, `health`,
`logs`, `render`) a view (CLI today, a bubbletea HUD in 2.0) calls with no I/O
of its own. Its own gate (`tool/Makefile:56`, `make check` = `tidy-check
fmt-check vet lint vulncheck vale-comments check-copy test`) is entirely
separate from the npm `check:*` roster and undocumented in any cairn-cms-root
doc — its own README/ADRs are its contributor doc.

## 5. The building-block system (admin custom screens)

**What exists:**

- `docs/internal/admin-design-system.md` (1557 lines, internal/agent-facing):
  Warm Stone tokens, type system, 18 grammar-token CSS custom properties + 11
  role utilities (canonical source `src/lib/design/grammar-tokens.ts`), and
  ~20 component recipes (floating card, nav sections, brand mark, chip
  registers, empty states, command palette, dialog, busy idiom, segmented
  control, etc., lines 359-686+).
- `docs/reference/admin-toolkit.md` (1031 lines, public): `FieldLabel`,
  `StatusChip`, `Pagination`, `AdminTable`, `ListToolbar`,
  `ToolbarDisclosure`, `PageHeader`, `EmptyState`, `ExpandableRow`,
  `MediaPicker`, `Tooltip`, etc. — the public "Extension API."
- `docs/reference/admin-grammar-tokens.md` (180 lines, public): the same 18
  tokens + 11 role utilities as a frozen versioned contract, plus 2
  container-role utilities (`card-shell`, `card-shadow`) and 2 status-text
  utilities.
- `docs/reference/components.md` (883 lines): cairn's own admin views
  (`CairnAdmin`, `CairnAdminShell`, `ConceptList`, `EditPage`, etc.) —
  explicitly states (lines 9-12) these are cairn's own concepts, not
  general-purpose building blocks.
- `CairnAdminShell` seam: `src/lib/components/CairnAdminShell.svelte:58`,
  props `{ data: AdminShellData, children: Snippet, themeOverride? }`,
  documented `docs/reference/components.md:83-172`.

**What public docs cover, mapped:**

| Piece | Doc | Linked from extend/? |
|---|---|---|
| Route registration/gating | `add-a-custom-admin-screen.md` | native page |
| admin-toolkit components | `admin-toolkit.md` | linked (lines 91,97,107,227,315) |
| Floating-card recipe | internal design-system doc | linked once (line 97) — the only extend->internal link at all |
| Grammar tokens page | `admin-grammar-tokens.md` | **zero links from any extend/ page** |
| `components.md` | — | **zero links from any extend/ page** |
| Motion tokens | `animate-a-custom-screen.md` | native page; cites "the internal admin design system" by name with **no link** (line 13) |
| Nav placement (`navLayout`) | `organize-your-admin-nav.md` | native, pure config, no design-system dependency |

**Explicit gaps:**

1. No conceptual "building block system" overview page in `docs/extend/`
   explaining what pieces exist (toolkit vs. components vs. grammar-tokens vs.
   internal design-system doc) and when to use which.
2. `admin-grammar-tokens.md` is orphaned from the extend arm — zero links.
   An extender wanting token utilities for hand-rolled markup has no
   discovery path except the reference README listing or a repo grep.
3. Most of the internal design-system's component recipes (eyebrow groups,
   brand tile, chip-register rationale, busy idiom, segmented control,
   command palette) never surface publicly beyond the one floating-card link;
   `add-a-custom-admin-screen.md` doesn't bridge to them.
4. `animate-a-custom-screen.md:13` cites "the internal admin design system"
   by name with no link — a dead end for an external reader.
5. No cross-reference from `add-a-custom-admin-screen.md` to
   `admin-grammar-tokens.md` or `components.md`; the page shows composing
   toolkit components but gives no fallback guidance for building UI outside
   the ~9 toolkit primitives.

**Bottom line:** mechanics (CairnAdminShell, route registration, gating,
toolkit components) are well documented and linked. The conceptual bridge —
"here is the full building-block system and how the pieces relate" — doesn't
exist as a page, and two of the four layers (grammar tokens, and the
internal design-system's non-toolkit recipes) are effectively undiscoverable
from the extend arm.
