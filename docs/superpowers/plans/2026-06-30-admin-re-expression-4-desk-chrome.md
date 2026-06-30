# Admin re-expression Phase 4: desk chrome, on the frozen idiom

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. This is a token-only retirement like Phases 2 and 3, but several swaps are **entangled** (a ternary false-arm in a JS class-helper, or a line carrying other bracketed utilities) — swap only the muted/subtle token on each, per the called-out sites below.

**Goal:** Sweep the desk chrome — the `EditPage` chrome (the topbar context portal, the slide-over, the headless dialogs, the footer environment strip), `EditorToolbar`, `TidyReview`, and the component-insert dialogs — onto the frozen role idiom by retiring **46** arbitrary `text-[var(--color-muted)]` / `text-[var(--color-subtle)]` references to the named `text-muted` / `text-subtle` utilities, ratcheting the admin `retiredTokenBudget` 195 → **149**, and baselining the edit page. **No native-primitive adoption** (the `tab` and `status` candidates both resolve to KEEP, below), no `@layer` fold, no behavior change, and the CodeMirror content theme is untouched.

**Architecture:** Phase 4 follows Phases 2/3 exactly: a near-mechanical token retirement. The census found 46 retired references across 6 components (EditPage 20, TidyReview 13, ComponentInsertDialog 10, MarkdownHelpDialog 2, ComponentForm 1, EditorToolbar 0); after this phase the residual 149 is exactly the media files (Phases 5/6). The cluster carried the sweep's first two genuine native-primitive questions, and the census resolved both to **KEEP on accessibility grounds**: the Write/Preview `tab` strip is a deliberate ARIA tablist/tab/tabpanel + roving-tabindex hybrid that DaisyUI's styling-only `.tabs` cannot replace without dropping the keyboard/role contract, and the save-state `status` dot is an `aria-hidden` decoration beside a visible text label that `.status` would only churn. The CodeMirror content theme (in `MarkdownEditor.svelte` and the `editor-*.ts` modules) is the walled hard floor and is not in this cluster; the sweep touches only the chrome around the editor.

**Tech Stack:** TypeScript, Svelte 5 (runes), DaisyUI 5.6, Tailwind 4, the frozen `text-muted` / `text-subtle` role utilities; Vitest (chromium component tests); Playwright (the showcase admin visual baseline); the `check:custom-surface` ratchet gate.

## Global Constraints

- **The spec is canonical.** Phase 4 of `docs/superpowers/specs/2026-06-29-admin-idiomatic-re-expression-design.md` (the Phase 4 list, the five rules, the CodeMirror hard floor, the non-goals). The ledger `docs/internal/design/2026-06-29-custom-surface-ledger.md` is the audit of record; this plan mirrors the Phase 2 plan, which validated the mechanism and the coupled-test reconciliation method.
- **Rule 2, exact swap — and several sites are ENTANGLED.** Replace `text-[var(--color-muted)]` with `text-muted` and `text-[var(--color-subtle)]` with `text-subtle` inside the `class` value (or JS class-string), touching nothing else on the line. Most swaps are plain. The **entangled sites** (swap ONLY the muted/subtle token, leave every other bracketed/utility token intact; line numbers may shift, find by token):
  - `EditPage.svelte` `segButtonClass` (~`:458`) and `ftrToggleClass` (~`:463`): the token is the **false-arm of a ternary** in a returned template literal. Swap the false-arm `text-[var(--color-muted)]` → `text-muted`; keep the true arm and keep the utility whole (the helper's own comment warns utilities must appear whole, never assembled from fragments).
  - `EditPage.svelte` `:1541` and `ComponentInsertDialog.svelte` `:414`: **variant-prefixed** `placeholder:text-[var(--color-muted)]` → `placeholder:text-muted` (the `@utility` is variant-composable; Phase 2 proved this; the visual baseline confirms it compiled).
  - `EditPage.svelte` `:1841` and `:1946` (the two `ftr-link` buttons): the line carries `hover:text-[var(--color-primary)]`, `[text-decoration-color:color-mix(...)]`, `[text-underline-offset:2px]` alongside the `text-[var(--color-muted)]`. Retire ONLY `text-[var(--color-muted)]` → `text-muted`; the primary hover, the decoration-color, and the underline-offset are NOT muted/subtle and STAY.
  - `TidyReview.svelte` `:352`, `:376`, `:387`: **ternary false-arms** whose true arms are the sanctioned `--cairn-warning-ink` / `--color-positive-ink` / `--cairn-error-ink` tints. Swap only the muted false-arm; leave the sanctioned true arms.
  - `TidyReview.svelte` `:363`: the line carries `decoration-[color-mix(...)]` and `hover:text-primary`; retire ONLY the `text-[var(--color-muted)]`.
  - `TidyReview.svelte` `:432` and `ComponentInsertDialog.svelte` `:455`: `text-[var(--color-subtle)]` → `text-subtle` (the only subtle in each).
- **Sanctioned tokens STAY.** Do not touch any `--cairn-warning-ink`/`--color-positive-ink`/`--cairn-error-ink` AA ink, the `--cairn-tidy-del/add-row/run` diff-tint vars, `--cairn-card-border`/`--cairn-shadow`, `--color-primary`/`--color-error`/`--color-success` references, any `decoration-[...]`/`[text-underline-offset:...]` bracketed form, or `MarkdownEditor.svelte:314`'s `color: 'var(--color-muted)'` inside the `EditorView.theme` JS object (it is the editor content theme, Tier-2, and the gate's regex does not match a JS-object `var()` anyway). Touching any is a scope error.
- **No native-primitive adoption (recorded decisions).** The `tab` strip (`EditorToolbar` Write/Preview) stays hand-rolled: it is an ARIA `role="tablist"`/`role="tab"` + `role="tabpanel"` (EditPage `#cairn-pane-write/-preview`) hybrid wired by `aria-controls`/`aria-labelledby` and integrated into the toolbar's roving-tabindex order; DaisyUI `.tabs` ships no roles and no arrow-key model, so folding would drop the contract and break the `getByRole('tab')` e2e — Rule 3 forbids it. The `status` save-state dot (band `:1291`, zen `:1940`) stays hand-rolled: it is an `aria-hidden` decoration beside the visible `{saveState}` text; folding `bg-warning`/`bg-success` to `.status-*` is a lateral move that breaks the `.cairn-save-state .bg-warning` test selectors (`EditPage.test.ts:2150,2155`) for zero a11y benefit. (The swept muted token sits on the band `.cairn-save-state` wrapper ~`:1287` and the zen `.cairn-zen-chip` wrapper ~`:1938`, not on those dot lines — find by token.) Adopt nothing. `floating-label` remains closed (decided against in Phase 3, do not re-raise).
- **No `@layer` fold, no CSS edit.** The only desk-named `cairn-admin.css` rules are `.cairn-doc-title:focus` and `.cairn-doc-title-dim:not(:focus)` (Tier-2 editor focus infra) and the pinned unlayered `.cairn-btn-guarded` (used by EditPage's Figure control). None re-creates a native primitive. **Do not edit `cairn-admin.css`.** `componentsLayerCap` stays 14, the unlayered allowlist stays 6.
- **No coupled-test migration (the reconciliation).** The ledger pre-declared EditPage's `.alert`/`.alert-*` (many lines), `.badge`/`.badge-*` (`:713,719,725,1385,1386,1417`), and `.cairn-save-state .bg-warning` (`:2150,2155`) plus `edit-page-advisories.test.ts:72`. **Phase 4 folds none of those classes:** the alerts and badges are native DaisyUI primitives the chrome keeps, and the save-state chip/dot stays hand-rolled (above). The token retirement touches no asserted class. So every coupled assertion stays green and **none migrates** this phase — same reconciliation as Phase 2's ConceptList. (If a future reviewer ever adopted `status` for the dot — this plan says do not — then and only then would `:2150/:2155` migrate.)
- **No presence-only a11y upgrade.** The census confirmed the desk-chrome a11y tests are behavioral (`tidy-review.test.ts:173,233` are the ledger's gold-standard re-announce model; `EditorToolbar.test.ts:163-211` assert roving/selected behavior). `MediaPicker.test.ts:90` (Phase 5) remains the one ledger-enumerated presence-only gap.
- **The gate is the test (red-green ratchet).** Each cluster lowers `trees.admin.budget.retiredTokenBudget` to its cumulative post-sweep count, confirms the gate FAILS, then retires the cluster's tokens and confirms PASS. Shared file → strictly sequential A→B→C. Ratchet: 195 → A (EditPage 20) → **175** → B (TidyReview 13) → **162** → C (ComponentInsertDialog 10 + MarkdownHelpDialog 2 + ComponentForm 1 = 13) → **149**. Leave the showcase tree's `0`.
- **Gate before done (each code task):** `npm run package`, then `npm run check` (0/0), `npm test` (exit 0), `npm run check:custom-surface` (PASS both trees at the cluster's budget). The bare `node scripts/check-custom-surface.mjs` reads source for the red/green ratchet; `npm run package` is for the test suite's dist imports. **At pass-end, run `npm run check:custom-surface` (which repackages, scanning docs) — not only the bare script — to catch a doc-scan break in pass prose (the Phase 3 lesson).** When writing any token in prose, use the parenthesized `var(--color-(muted|subtle))` form, never a `|` inside square brackets (the Tailwind-scans-docs gotcha).

---

## Task 1: Cluster A — EditPage chrome and the footer strip (budget 195 → 175)

Retire the 20 references in `EditPage.svelte`: the desk topbar snippet (save-state chip text, tidy-undo chip, status), the preview/device hints, the Details slide-over eyebrow/help/slug, the tidy status copy, the footer environment strip (`:1763`, the `segButtonClass`/`ftrToggleClass` helpers, the Markdown-help link), and the `:1541` title placeholder. Mind the entangled sites in the constraints (the two helpers' ternary false-arms, the placeholder variant, the two `ftr-link` lines).

**Files:**
- Modify: `src/lib/components/EditPage.svelte` (the 20 sites; see the entangled-site list).
- Modify: `scripts/custom-surface-budget.json` (`trees.admin.budget.retiredTokenBudget` 195 → 175).

**Steps:**

- [ ] **Step 1 (red): lower the budget** to `175` (`trees.admin.budget.retiredTokenBudget`; leave the showcase `0`). `node scripts/check-custom-surface.mjs` → FAILS `retired tokens: 195 > budget 175`.
- [ ] **Step 2 (green): retire the tokens.** Swap each muted/subtle reference to its named utility. For the entangled sites (`segButtonClass`/`ftrToggleClass` ternary false-arms, `:1541` `placeholder:`, `:1841`/`:1946` ftr-link), swap ONLY the muted token and leave the sanctioned/non-muted bracketed utilities (the primary hover, the decoration-color, the underline-offset). Confirm by grep that `EditPage.svelte` holds zero `var(--color-muted)`/`var(--color-subtle)` bracket forms, and that `text-[var(--color-primary)]`, the `decoration-[...]`, and the `[text-underline-offset:...]` forms remain.
- [ ] **Step 3: confirm the ratchet.** `npm run package`, `node scripts/check-custom-surface.mjs` → PASS at 175.
- [ ] **Step 4: full gate.** `npm run check` (0/0), `npm test` (exit 0 — `EditPage.test.ts`, `EditPage-insert.test.ts`, `edit-page-advisories.test.ts`, `edit-page-field-hint.test.ts`, `edit-page-v2-fields.test.ts` stay green; the coupled `.alert`/`.badge`/`.cairn-save-state` assertions stay green because no asserted class changed; the `getByRole('tab')` paths are untouched), `npm run check:custom-surface` (PASS). Fix any failure.
- [ ] **Step 5: commit.**

```bash
git add src/lib/components/EditPage.svelte scripts/custom-surface-budget.json
git commit -m "Retire muted/subtle tokens in EditPage chrome (budget 195→175)"
```

---

## Task 2: Cluster B — TidyReview (budget 175 → 162)

Retire the 13 references in `TidyReview.svelte`: the head subtitle/kbd hint/tally, the context-before/after rows, the footer commit note (8 plain), plus the 5 entangled sites (the hunk-head/Accept/Reject ternary false-arms at `:352,:376,:387` whose true arms are sanctioned inks, the show-in-editor line `:363` sharing `decoration-[...]`/`hover:text-primary`, and the because-line subtle at `:432`). None touches a `--cairn-tidy-*` diff-tint or a sanctioned ink.

**Files:**
- Modify: `src/lib/components/TidyReview.svelte` (the 13 sites).
- Modify: `scripts/custom-surface-budget.json` (`trees.admin.budget.retiredTokenBudget` 175 → 162).

**Steps:**

- [ ] **Step 1 (red): lower the budget** to `162`. `node scripts/check-custom-surface.mjs` → FAILS `retired tokens: 175 > budget 162`.
- [ ] **Step 2 (green): retire the tokens.** Swap each muted reference to `text-muted` and the `:432` subtle to `text-subtle`. For the ternary false-arms, swap only the muted arm; leave the sanctioned `--cairn-warning-ink`/`--color-positive-ink`/`--cairn-error-ink` true arms and the `--cairn-tidy-*` diff-tint vars untouched. For `:363`, leave the `decoration-[color-mix(...)]` and `hover:text-primary`. Confirm by grep that no muted/subtle bracket form remains and every sanctioned ink/tint stays.
- [ ] **Step 3: confirm the ratchet.** `npm run package`, `node scripts/check-custom-surface.mjs` → PASS at 162.
- [ ] **Step 4: full gate.** `npm run check` (0/0), `npm test` (exit 0 — `tidy-review.test.ts` stays green, including the `:173`/`:233` live-region behavioral assertions), `npm run check:custom-surface` (PASS). Fix any failure.
- [ ] **Step 5: commit.**

```bash
git add src/lib/components/TidyReview.svelte scripts/custom-surface-budget.json
git commit -m "Retire muted/subtle tokens in TidyReview (budget 175→162)"
```

---

## Task 3: Cluster C — the component-insert dialogs and help (budget 162 → 149)

Retire the 13 references in `ComponentInsertDialog.svelte` (10: breadcrumb/Preview eyebrows, settle chip, preview-failed body, search-glyph svg color, no-match copy, group heading, row description, the `:414` `placeholder:` variant, the `:455` subtle), `MarkdownHelpDialog.svelte` (2: the two `<th>` eyebrows), and `ComponentForm.svelte` (1: the repeatable-item row label). The component-preview tints (`--color-error`/`--cairn-card-border`/`--cairn-shadow` on the preview pane) are sanctioned and STAY.

**Files:**
- Modify: `src/lib/components/ComponentInsertDialog.svelte` (10 sites), `src/lib/components/MarkdownHelpDialog.svelte` (2), `src/lib/components/ComponentForm.svelte` (1).
- Modify: `scripts/custom-surface-budget.json` (`trees.admin.budget.retiredTokenBudget` 162 → 149).

**Steps:**

- [ ] **Step 1 (red): lower the budget** to `149`. `node scripts/check-custom-surface.mjs` → FAILS `retired tokens: 162 > budget 149`.
- [ ] **Step 2 (green): retire the tokens.** Swap each muted to `text-muted` (incl. the `:414` `placeholder:text-muted`) and the `:455` subtle to `text-subtle`. Leave the preview-pane `--color-error`/`--cairn-card-border`/`--cairn-shadow` references.
- [ ] **Step 3: confirm the ratchet and the desk-chrome floor.** `npm run package`, `node scripts/check-custom-surface.mjs` → PASS at 149. Confirm the desk-chrome set holds zero muted/subtle bracket forms: grep `EditPage`, `EditorToolbar`, `TidyReview`, `ComponentInsertDialog`, `ComponentForm`, `MarkdownHelpDialog`. (149 is the residual in the media files, Phases 5/6.)
- [ ] **Step 4: full gate.** `npm run check` (0/0), `npm test` (exit 0 — `ComponentInsertDialog.test.ts`, `ComponentForm.test.ts`, and the `EditPage.test.ts` transitive coverage of the help dialog stay green), `npm run check:custom-surface` (PASS). Fix any failure.
- [ ] **Step 5: commit.**

```bash
git add src/lib/components/ComponentInsertDialog.svelte src/lib/components/MarkdownHelpDialog.svelte src/lib/components/ComponentForm.svelte scripts/custom-surface-budget.json
git commit -m "Retire muted/subtle tokens in the component-insert dialogs (budget 162→149)"
```

---

## Task 4: Baseline the edit page; confirm existing baselines unchanged

The edit page (a desk route, `/admin/<concept>/<id>`) is the swept surface and is not yet baselined. Capture the desk chrome (the topbar desk cluster, the Write/Preview tabs, the toolbar, the footer environment strip) in light and dark. The retirement is zero-pixel, so the existing office/vocab/auth/editors baselines must stay byte-identical.

**Files:**
- Modify: `examples/showcase/e2e/admin-visual.spec.ts` (add the edit-page tests).
- Add: the new committed PNGs under `admin-visual.spec.ts-snapshots/`.

**Steps:**

- [ ] **Step 1: rebuild the engine dist** so the showcase symlink carries the swept components: `npm run package` at the repo root. (No reinstall, no lockfile — zero new exports. `rm -rf examples/showcase/.svelte-kit` if a cache clear is wanted.)
- [ ] **Step 2: add the edit-page baseline.** In `admin-visual.spec.ts`, add cookie-driven light/dark tests (`admin edit page — light/dark`) that navigate to a seeded post's edit route (mirror `golden-path.spec.ts`'s path, e.g. `/admin/posts/<seeded-id>`), assert `getByRole('tab', { name: 'Write' })` is visible **without focusing any chrome element** (focusing the title or a toolbar button paints a `.cairn-doc-title:focus` / focus-visible ring into the captured chrome, corrupting the baseline's own subject), then screenshot `admin-edit-page-light.png` / `admin-edit-page-dark.png` with `mask: [page.locator('.cm-content')]`. The desk **chrome** (the topbar desk cluster, the Write/Preview tabs, the toolbar, the footer environment strip) is the baseline's subject; the editor content is the walled CodeMirror theme, so mask it. The editor mounts unfocused (`MarkdownEditor` calls no `view.focus()`), so no caret paints — the mask is a defensive guard against the seeded body text and any future focus, not against a blink.
- [ ] **Step 3: generate + confirm stability.** Run `npx playwright test admin-visual.spec.ts` (first run writes the new snapshots; the existing 10 office/vocab/auth/editors tests must PASS unchanged — the zero-pixel proof). The 10 baselined routes mount no Phase-4-swept component (none renders `EditPage`/`TidyReview`/the insert dialogs), so any drift in them is a compile regression in the shared `@utility` rename, not an expected change — if any drifts, stop and investigate, do not accept it. Re-run once (single attempt, no `CI` retry) to confirm the new edit-page snapshots PASS stably.
- [ ] **Step 4: inspect** the new PNGs: confirm the desk chrome renders (the topbar desk cluster with the save-state chip, the Write/Preview tabs, the format toolbar, the footer environment strip with the Prose/Markup pair and the toggles), not a broken or mid-animation frame.
- [ ] **Step 5: commit** the spec change and the new snapshots (no lockfile).

```bash
git add examples/showcase/e2e/admin-visual.spec.ts examples/showcase/e2e/admin-visual.spec.ts-snapshots
git commit -m "Baseline the edit page (desk chrome); existing shells unchanged"
```

---

## Self-review

- **Spec coverage (Phase 4 list).** `EditPage` chrome (topbar context portal, slide-over, headless dialogs, footer strip) → Task 1. `EditorToolbar` → swept by confirmation (0 retired tokens; the `tab` strip kept). `TidyReview` → Task 2. The component-insert dialogs + help (`ComponentInsertDialog`, `MarkdownHelpDialog`, `ComponentForm`) → Task 3. The CodeMirror content theme → confirmed walled (out of cluster).
- **The two decisions are resolved to KEEP, with reasoning recorded.** `tab` (drops the ARIA tablist/roving contract) and `status` (churns an `aria-hidden` decoration, breaks test selectors). Neither is a valid Rule-3 fold.
- **Verification deliverables.** Structural invariants intact (`cairn-admin.css` untouched). Selector de-coupling: none triggers (all coupled classes are native/kept — the Phase 2 reconciliation). Presence-only a11y: none in the cluster. Per-phase baseline: the edit page added; existing baselines proven byte-identical.
- **Honest scope.** 46 token swaps, zero primitive adoption, zero fold, zero migration. The phase is bounded by what is provably excessive (the muted/subtle references); the genuine native-primitive opportunities were evaluated and correctly declined on a11y grounds, not invented away.
- **Risk.** (1) The entangled swaps (the two JS helpers' ternary arms, the two ftr-link lines, the two `placeholder:` variants, the TidyReview ternary arms) must touch ONLY the muted/subtle token — a wrong swap that hits a sanctioned ink or the primary hover is a scope error; grep-verify after each cluster. (2) `placeholder:text-muted` compile is caught only by the baseline (the gate scans source); the edit baseline does not render a `placeholder:` surface, but `ComponentInsertDialog`/`EditPage` placeholders are covered by their component tests rendering the input. (3) If an existing baseline drifts, the retirement was not zero-pixel — investigate. (4) The edit-page baseline masks `.cm-content` (the walled editor content is not the subject) and asserts chrome readiness via the Write tab without focusing any chrome element (a focus ring would pollute the captured chrome); the editor mounts unfocused, so the mask guards the seeded body text, not a cursor blink. (5) The budget ratchet is shared-file sequential A→B→C; an out-of-order red string (e.g. `retired tokens: 195 > budget 162` at Cluster B) means the clusters ran out of order — stop.

---

## Post-mortem

(Appended at pass end.)
