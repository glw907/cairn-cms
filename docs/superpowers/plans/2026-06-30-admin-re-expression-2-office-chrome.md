# Admin re-expression Phase 2: the office chrome, on the frozen idiom

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This is a near-mechanical retirement phase: the work is a gate-first ratchet, not a redesign.

**Goal:** Sweep the office-chrome surface — the shell, the nav, the concept list, the auth pages, the empty states, and the dialog/picker family — onto the frozen role idiom by retiring every arbitrary `text-[var(--color-muted)]` / `text-[var(--color-subtle)]` reference to the named `text-muted` / `text-subtle` utilities, ratcheting the admin `retiredTokenBudget` from 235 to its proven post-sweep floor of **198**, and extending the per-phase visual baseline over the swept surfaces. No native-primitive adoption, no `@layer` fold, no behavior change.

**Architecture:** Phase 2 is the first sweep cluster after the Phase 1 pilot. The office-chrome census (`docs/internal/design/2026-06-29-custom-surface-ledger.md` plus the Phase 2 surface read) found that the foldable surface here is **exactly the retired muted/subtle token references and nothing else**: 37 lines across 8 of the 13 components, every one a trivial 1:1 swap to the frozen role utility. There is no hand-rolled `status` dot or `tab` strip to adopt (`floating-label` would be a redesign addition, deferred — see the constraint below), no `@layer components` override that re-creates a native primitive (every rule touching these components is Tier-2 infrastructure), no presence-only a11y test to upgrade (every focus/live-region test in the set is already behavioral), and no selector-coupled test to migrate (the only coupling, ConceptList's `.badge`/`.alert` assertions, tests native classes this phase keeps, not fold targets — reconciled below). Because `text-muted` and `text-subtle` resolve to the same `--color-muted` / `--color-subtle` vars the retired bracket forms referenced, the retirement is a **zero-pixel change**: the office-shell visual baseline must stay byte-identical, which is the phase's regression proof.

**Tech Stack:** TypeScript, Svelte 5 (runes), DaisyUI 5.6, Tailwind 4, the Warm Stone design system and its frozen role layer (`text-muted` / `text-subtle` as Tailwind `@utility` classes in `scripts/admin-css.input.css`, guaranteed-value branch); Vitest (chromium component tests); Playwright (the showcase e2e and the admin visual baseline); the `check:custom-surface` ratchet gate (`scripts/check-custom-surface.mjs`, `scripts/custom-surface-budget.json`).

## Global Constraints

- **The spec is canonical.** This plan executes Phase 2 of `docs/superpowers/specs/2026-06-29-admin-idiomatic-re-expression-design.md` (the Phase 2 list under "Phases 2 to 6: the sweep", the five de-customization rules, the verification section, the non-goals). The ledger `docs/internal/design/2026-06-29-custom-surface-ledger.md` is the audit of record. Read both, plus `docs/internal/admin-design-system.md` (the recipes and voice), before touching markup.
- **Builds on Phase 0/1; never reshape the frozen interface.** The developer-facing role interface is the named `@utility` classes `text-muted` / `text-subtle`. The pilot (Phase 1) proved a real screen builds on them with zero new bespoke surface. This phase migrates the office chrome onto the same interface. It never redefines, extends, or re-opens the role interface, the walled Tier-2 home, or the gate's structural model.
- **Rule 2 is the only rule in play, and the swap is exact.** A component writes `text-muted` / `text-subtle` (the role), never the retired `text-[var(--color-muted)]` / `text-[var(--color-subtle)]` bracket forms. Every Phase 2 retirement is a literal substitution inside the `class` attribute: `text-[var(--color-muted)]` → `text-muted`, `text-[var(--color-subtle)]` → `text-subtle`, and the one variant form `placeholder:text-[var(--color-muted)]` → `placeholder:text-muted` (the `@utility` is variant-composable, so the variant prefix carries; `npm run package` regenerates `placeholder:text-muted` from the new markup, and the gate confirms). Do not touch any other class on the line, do not restructure markup, do not change copy.
- **Sanctioned bracket tokens STAY (do not "retire" them).** The gate counts only `var(--color-(muted|subtle))` inside brackets or an inline style. The Tier-2 AA inks and theme colors are sanctioned bracket references and are correct as written — leave them: `text-[var(--cairn-warning-ink)]`, `text-[var(--color-positive-ink)]`, `text-[var(--cairn-error-ink)]`, `text-[var(--color-success)]` and its `color-mix(... var(--color-success) ...)` inline style (LoginPage `:62`–`:63`), `border-[var(--cairn-card-border)]`, `shadow-[var(--cairn-shadow)]`, and surface tints like `bg-base-content/[0.04]` / `bg-primary/10`. Touching any of these is a scope error.
- **No native-primitive adoption this phase, by design.** The census found no hand-rolled `status` dot and no `tab` strip in the office chrome (Rule 3 adopts a native primitive only where one provably replaces a hand-rolled control). `floating-label` would be an **addition** (a new pattern) at the labeled inputs (LoginPage email, RenameDialog slug, WebLinkDialog's two fields), not a fold of an existing control, and adopting it mid-de-customization-sweep contradicts the spec's "no redesign" and "no invention of folds to justify scope" non-goals. It is **deferred**: a floating-label decision, if ever taken, belongs in the forms phase (Phase 3, where `FieldInput` and the field family live) or a dedicated design pass, applied consistently across all inputs rather than piecemeal on the auth field. This plan adopts zero primitives and records the deferral.
- **No `@layer` fold, no unlayered change.** The census confirmed every `cairn-admin.css` rule touching the office-chrome components is Tier-2 infrastructure (the `<details>`/`summary` disclosure reset and `.cairn-caret`, the anchor reset, the bare-button Preflight replacements, the `::selection` tint, the `:focus-visible` ring, the `.btn-primary` lift, the box-sizing reset, `prefers-reduced-motion`, and the two pinned unlayered workarounds). None re-creates a native primitive. **Do not edit `cairn-admin.css` in this phase.** The `componentsLayerCap` stays 14 and the unlayered allowlist stays the pinned 6.
- **No test migration, no a11y upgrade — and the reconciliation that proves it.** The ledger pre-declared ConceptList's `.badge` / `.badge-info` / `.badge-warning` / `.badge-ghost` / `.alert-success` / `.alert-warning` / `.alert-error` / `text-primary` assertions (`ConceptList.test.ts:51,55,57,58,59,68,133,254,296`) as selector-decoupling candidates. **Phase 2 folds none of those classes:** the status badges and the alerts are native DaisyUI primitives the design keeps, and the triage bar's segmented check-and-tint control has no native equivalent and stays hand-rolled. The token retirement does not touch any asserted class. So these assertions stay green and are **not migrated** in this phase — decoupling them now would be churn on classes that are not changing, against "behavior is ported, not rewritten". The decoupling triggers only in a phase that actually folds them (none is currently planned, since these classes are native and staying). The census also confirmed zero presence-only a11y tests in the office-chrome set (every focus and live-region assertion already asserts behavior — focus moves, region text mutates), so there is nothing to harden ahead of this cluster.
- **Coverage-gap note (no new tests required, but verify transitive green).** `ShortcutsDialog`, `ShortcutsGrid`, and `WebLinkDialog` have no dedicated component test; they are covered transitively through `EditPage.test.ts`. `WebLinkDialog` has zero retired tokens, so it is untouched. The two swaps differ in transitive strength: `ShortcutsGrid`'s swapped node (`ShortcutsGrid.svelte:15`) **is** rendered and asserted, because `EditPage.test.ts` opens the Markdown-help dialog and walks the grid rows; `ShortcutsDialog`'s swapped line (`:32`) sits behind the Ctrl+/ open path, which no test opens, so its transitive coverage is "mounts without throwing," not "renders the swapped node." For both, the binding proof of a pure-color swap is `check:custom-surface` (the budget drops) plus the office baseline; for `ShortcutsGrid` the rendered-row assertion is an extra net. Do not author a new dedicated component test for a pure class swap (test-for-test's-sake); the gate and the transitive suite are the contract. If a swap somehow changed rendered behavior (it must not), that is a finding to escalate, not to paper over.
- **The gate is the test: a per-cluster red-green ratchet.** This is the test-first structure for a mechanical phase. Each cluster task **first** lowers the admin `retiredTokenBudget` in `scripts/custom-surface-budget.json` to that cluster's cumulative post-sweep count and runs `node scripts/check-custom-surface.mjs` to confirm it **FAILS** (the not-yet-retired count exceeds the new budget — the red assertion), **then** retires that cluster's tokens and re-runs the gate to confirm it **PASSES** at exactly the new count (green). The budget is a shared file, so the clusters are strictly sequential (A → B → C); never run two retirement dispatches concurrently against it. The ratchet:
  - Seed (Phase 0): **235**.
  - After Cluster A (CairnAdminShell 13 + ConceptList 11 = 24): **211**.
  - After Cluster B (LoginPage 5 + ConfirmPage 2 = 7): **204**.
  - After Cluster C (EntryPicker 3 + RenameDialog 1 + ShortcutsDialog 1 + ShortcutsGrid 1 = 6): **198**.

  The budget is a shared, tree-wide file, so the clusters are strictly sequential (A → B → C); never run two retirement dispatches concurrently against it. The red strings at B and C presuppose the prior cluster already landed: Cluster B Step 1 reads `235 > budget 204` would mean the clusters ran out of order — stop and re-sequence.
- **Admin design system.** Before any `/admin` markup change follow `docs/internal/admin-design-system.md`: `data-theme` on a bare wrapper, scoped overrides in `@layer components` (this phase adds none), the Warm Stone tokens, the recipes, the voice. Note the doc's own recipe text still cites the old `text-[var(--color-muted)]` form; the final docs phase rewrites it. Do not "fix" the doc in this phase, and when writing any token into prose write the concrete value, never a placeholder-bracket form (the Tailwind-scans-docs gotcha, memory `tailwind-scans-docs-bad-candidate`).
- **Gate before done (each code task):** `npm run package`, then `npm run check` (svelte-check 0/0), `npm test` (exit 0, not just a passing count), and `npm run check:custom-surface` (PASS both trees, the admin `retiredTokenBudget` at the cluster's new value). `scripts/check-custom-surface.mjs` reads the `.svelte` source directly, so the bare gate (`node scripts/check-custom-surface.mjs`) reflects a token swap the instant the file is edited; `npm run package` is run before `npm test` for the dist-import flake guard, not for the surface gate. `npm run check:comments` (the TSDoc + em-dash gate) and the showcase e2e (Task 4) are their own gates. The worktree's `node_modules` and `dist` are already provisioned; if a dist import flakes, re-run `npm run package` (memory `cairn-worktree-needs-dist-build`).

---

## Task 1: Cluster A — the shell, the nav, the concept list (budget 235 → 211)

Retire the 24 muted/subtle references in `CairnAdminShell.svelte` (13) and `ConceptList.svelte` (11). `NavTree.svelte` carries zero retired tokens and no foldable surface; it is swept by confirmation only (no edit). The office shell at `/admin/posts` is already in the visual baseline; Task 4 confirms it stays byte-identical.

**Files:**
- Modify: `src/lib/components/CairnAdminShell.svelte` (lines `336, 368, 374, 397, 403, 411, 428, 461, 468, 479, 506, 525, 526`).
- Modify: `src/lib/components/ConceptList.svelte` (lines `122, 126, 193, 321, 333, 335, 338, 375, 380, 383, 419`).
- Modify: `scripts/custom-surface-budget.json` (`trees.admin.budget.retiredTokenBudget` 235 → 211; leave `trees.showcase.budget.retiredTokenBudget` at `0`).

**Steps:**

- [ ] **Step 1 (red): lower the budget.** Set `trees.admin.budget.retiredTokenBudget` to `211` in `scripts/custom-surface-budget.json` (leave the showcase tree's `0` untouched). Run `node scripts/check-custom-surface.mjs` and confirm it FAILS with `retired tokens: 235 > budget 211` (the red assertion: the count has not yet dropped).
- [ ] **Step 2 (green): retire the tokens.** In `CairnAdminShell.svelte` and `ConceptList.svelte`, replace each `text-[var(--color-muted)]` with `text-muted`, each `text-[var(--color-subtle)]` with `text-subtle`, and the `placeholder:text-[var(--color-muted)]` at `CairnAdminShell.svelte:374` with `placeholder:text-muted`. Change nothing else on any line: not the sibling classes, not the markup, not the copy. Confirm by grep that `CairnAdminShell.svelte` and `ConceptList.svelte` now contain zero `var(--color-muted)` / `var(--color-subtle)` bracket references, and that the sanctioned inks (if any) are untouched.
- [ ] **Step 3: confirm the ratchet.** `npm run package`, then `node scripts/check-custom-surface.mjs` → PASS, admin `retiredTokenBudget` 211, count 211.
- [ ] **Step 4: full gate.** `npm run check` (0/0), `npm test` (exit 0 — `CairnAdminShell.test.ts`, `ConceptList.test.ts`, `NavTree.test.ts`, `admin-layout-help-nav.test.ts`, `admin-css-build.test.ts` and the rest stay green; the coupled ConceptList `.badge`/`.alert` assertions stay green because no asserted class changed), `npm run check:custom-surface` (PASS both trees). The one overlap to confirm: the segmented-control helpers at `ConceptList.svelte:122,126` carry a retired token and the control is tested at `:277-287` (the WCAG 1.4.1 non-color-cue test), but that test asserts `aria-pressed` and the check-`<svg>` presence, never the `text-[var(--color-muted)]` class, so retiring the token leaves the protected cue test untouched. Fix any failure.
- [ ] **Step 5: commit.**

```bash
git add src/lib/components/CairnAdminShell.svelte src/lib/components/ConceptList.svelte scripts/custom-surface-budget.json
git commit -m "Retire muted/subtle tokens in the shell and concept list (budget 235→211)"
```

---

## Task 2: Cluster B — the auth pages (budget 211 → 204)

Retire the 7 references in `LoginPage.svelte` (5) and `ConfirmPage.svelte` (2). Both are public, JS-free pages; the swaps are secondary-text only. Leave the `--color-success` references on `LoginPage.svelte:62–63` untouched (Tier-1 theme color, not a muted/subtle token). No `floating-label` adoption (deferred per the constraint above).

**Files:**
- Modify: `src/lib/components/LoginPage.svelte` (lines `68, 72, 73, 89, 123`).
- Modify: `src/lib/components/ConfirmPage.svelte` (lines `42, 51`).
- Modify: `scripts/custom-surface-budget.json` (`trees.admin.budget.retiredTokenBudget` 211 → 204; leave the showcase tree's `0`).

**Steps:**

- [ ] **Step 1 (red): lower the budget** to `204`. `node scripts/check-custom-surface.mjs` → FAILS `retired tokens: 211 > budget 204`.
- [ ] **Step 2 (green): retire the tokens.** Swap each muted/subtle bracket form to its named utility in both files. `LoginPage.svelte:73` is `text-subtle`; the rest are `text-muted`. Confirm by grep that the `--color-success` references on `:62–63` remain and the muted/subtle references are gone.
- [ ] **Step 3: confirm the ratchet.** `npm run package`, `node scripts/check-custom-surface.mjs` → PASS at 204.
- [ ] **Step 4: full gate.** `npm run check` (0/0), `npm test` (exit 0 — `LoginPage.test.ts`, `ConfirmPage.test.ts`, `auth-page-loads.test.ts` green), `npm run check:custom-surface` (PASS). Fix any failure.
- [ ] **Step 5: commit.**

```bash
git add src/lib/components/LoginPage.svelte src/lib/components/ConfirmPage.svelte scripts/custom-surface-budget.json
git commit -m "Retire muted/subtle tokens on the auth pages (budget 211→204)"
```

---

## Task 3: Cluster C — the dialog and picker family (budget 204 → 198)

Retire the 6 references in `EntryPicker.svelte` (3), `RenameDialog.svelte` (1), `ShortcutsDialog.svelte` (1), and `ShortcutsGrid.svelte` (1). `DeleteDialog`, `WebLinkDialog`, `LinkPicker`, and `IconPicker` carry zero retired tokens and no foldable surface; they are swept by confirmation only (no edit). Preserve every dialog's `aria-labelledby` + `showModal()` focus trap, EntryPicker's buttons-in-a-`menu` contract (not a true `role=listbox`), and IconPicker's `role=radiogroup` roving-tabindex model — none of which this phase touches.

**Files:**
- Modify: `src/lib/components/EntryPicker.svelte` (lines `123, 126, 138`).
- Modify: `src/lib/components/RenameDialog.svelte` (line `71`).
- Modify: `src/lib/components/ShortcutsDialog.svelte` (line `32`).
- Modify: `src/lib/components/ShortcutsGrid.svelte` (line `15`).
- Modify: `scripts/custom-surface-budget.json` (`trees.admin.budget.retiredTokenBudget` 204 → 198; leave the showcase tree's `0`).

**Steps:**

- [ ] **Step 1 (red): lower the budget** to `198`. `node scripts/check-custom-surface.mjs` → FAILS `retired tokens: 204 > budget 198`.
- [ ] **Step 2 (green): retire the tokens.** Swap each `text-[var(--color-muted)]` to `text-muted` across the four files (all four are muted, no subtle in this cluster). Change nothing else.
- [ ] **Step 3: confirm the ratchet and the terminal floor.** `npm run package`, `node scripts/check-custom-surface.mjs` → PASS at 198. Confirm the whole office-chrome set now holds zero muted/subtle bracket references: `grep -rn "var(--color-muted)\|var(--color-subtle)" src/lib/components/{CairnAdminShell,NavTree,ConceptList,LoginPage,ConfirmPage,DeleteDialog,RenameDialog,ShortcutsDialog,ShortcutsGrid,WebLinkDialog,EntryPicker,LinkPicker,IconPicker}.svelte` returns nothing. (198 is the remaining count in the later-phase files: media, forms, desk chrome.)
- [ ] **Step 4: full gate.** `npm run check` (0/0), `npm test` (exit 0 — `EntryPicker.test.ts`, `RenameDialog.test.ts`, and the `EditPage.test.ts` host coverage for the shortcuts dialog stay green), `npm run check:custom-surface` (PASS). Fix any failure.
- [ ] **Step 5: commit.**

```bash
git add src/lib/components/EntryPicker.svelte src/lib/components/RenameDialog.svelte src/lib/components/ShortcutsDialog.svelte src/lib/components/ShortcutsGrid.svelte scripts/custom-surface-budget.json
git commit -m "Retire muted/subtle tokens in the dialog and picker family (budget 204→198)"
```

---

## Task 4: Extend the per-phase visual baseline over the swept surfaces

The office shell (`/admin/posts`) is already baselined; this task proves it stays byte-identical (the zero-pixel regression proof) and adds baselines for the swept auth surfaces, which are not yet captured. The retirement changes no pixels, so the existing office-shell snapshot must pass unchanged, and the new auth snapshots are the reviewed reference going forward.

> **Scope note (review-found):** the dialog/picker cluster (`EntryPicker`/`RenameDialog`/`ShortcutsDialog`/`ShortcutsGrid`) is transient overlay surface absent from any full-page screenshot, so it is intentionally **not** visually baselined; its regression proof is the gate count plus the transitive component/EditPage tests, which the spec's live-screen baseline scope (spec verification section) permits. This task's visual coverage is the shell/list/auth surfaces.

**Files:**
- Modify: `examples/showcase/e2e/admin-visual.spec.ts` (add the auth-surface tests, light and dark).
- Add: `examples/showcase/e2e/admin-visual.spec.ts-snapshots/` (the new committed PNGs).

**Steps:**

- [ ] **Step 1: rebuild the engine dist** so the showcase's symlinked `file:` dep carries the swept components. At the repo root: `npm run package`. The showcase consumes the engine through a symlink (`examples/showcase/node_modules/@glw907/cairn-cms` → the worktree root), so the rebuilt `dist` reaches the showcase build with no reinstall, and Phase 2 adds zero new exports, so there is no lockfile change to make. Do **not** `rm -rf node_modules` / reinstall / commit a lockfile — that was Phase 1's procedure for a new export and does not transfer to a token-only sweep. If the Vite/Kit cache needs clearing, `rm -rf examples/showcase/.svelte-kit` is the targeted move.
- [ ] **Step 2: add the auth baselines.** In `admin-visual.spec.ts`, add tests mirroring the existing cookie-driven office-shell pair: navigate to `/admin/login` and screenshot `auth-login-light.png` / `auth-login-dark.png` full-page; navigate to `/admin/auth/confirm?token=<any>` (its primary "Almost there" state) and screenshot `auth-confirm-light.png` / `auth-confirm-dark.png`. These render **unconditionally** in the showcase: the dev backend mints `locals.editor` directly (no engine guard is installed), and the login/confirm render is pathname-gated via `isPublicAdminPath`, so the seeded session is inert for these routes and there is no redirect to defend against. Keep the screenshots cookie-driven for the theme, like the office-shell pair. The confirm token renders only into a hidden input, so the confirm screenshot is deterministic.
- [ ] **Step 3: confirm the office shell is byte-identical.** Run the existing `admin office shell — light/dark` tests; they must pass with **no snapshot update** (the retirement is zero-pixel; this office baseline is also the sole catcher of a `placeholder:text-muted` compile failure, since the only office-chrome `placeholder:` color is `CairnAdminShell.svelte:374`, a shell input rendered on `/admin/posts`, not an auth field). If they demand an update, that is a real, unexpected visual change — stop and investigate; do not accept a drifted snapshot for a phase that should not move pixels. When **first generating** the new auth baselines, run once with `retries=0` (omit `CI=1`, or pass `--retries=0`) to confirm single-attempt stability before committing the PNGs, so a flaky first capture is not masked by the CI retry.
- [ ] **Step 4: run the suite.** `CI=1 npm --prefix examples/showcase run test:e2e` (force-fresh build, no stale preview reuse). Confirm green: the new auth baselines generated, the office-shell and vocabulary baselines unchanged, and the rest of the e2e suite (`golden-path`, `media-library`, `tag-filter`, `vocabulary-admin`, …) still green.
- [ ] **Step 5: commit** the spec change and the new snapshots (no lockfile — none changed).

```bash
git add examples/showcase/e2e/admin-visual.spec.ts examples/showcase/e2e/admin-visual.spec.ts-snapshots
git commit -m "Baseline the swept auth surfaces; confirm the office shell unchanged"
```

---

## Self-review

- **Spec coverage (Phase 2 list).** Shell / nav / concept list → Task 1. Login / confirm → Task 2. The dialog family (`DeleteDialog`, `RenameDialog`, `ShortcutsDialog`, `WebLinkDialog`, `EntryPicker`, `LinkPicker`, `IconPicker`) and the empty states → Task 3 (those with tokens) plus the sweep-by-confirmation of the zero-token members. Every named office-chrome component is accounted for: 8 edited, 5 confirmed clean. (The mapping to the spec's 13-item list is not 1:1: the plan adds `ShortcutsGrid` — the `ShortcutsDialog` child, covered under "the dialog family" — and folds the spec's "empty states" into their hosts `ConceptList`/`LoginPage`, since those are inline markup, not standalone files.)
- **Spec coverage (the sweep's terminal-state criteria).** Retired tokens gone for this cluster (budget 235 → 198, and zero muted/subtle bracket references remain in the office-chrome set) → Tasks 1–3. The genuine primitives adopted "where chosen": none chosen here, with the `status`/`tab` absence and the `floating-label` deferral recorded → the constraints. The redundant-override remainder folded: none exists in the office chrome → confirmed against `cairn-admin.css`. The per-phase screenshot baseline extended → Task 4.
- **Verification deliverables (spec's four).** Structural invariants intact: `cairn-admin.css` is untouched, so `admin-css-build.test.ts` and the `componentsLayerCap`/unlayered allowlist are unchanged. The per-phase screenshot baseline: Task 4 (auth added; office shell proven byte-identical). Selector de-coupling: none triggers — the only coupling tests native classes this phase keeps, reconciled in the constraints. Presence-only a11y upgrade: none needed — the census found every office-chrome a11y test already behavioral.
- **The ratchet is a real red-green.** Each cluster lowers the budget first (gate red), then retires (gate green at the exact new count). The shared budget file forces strict sequential execution A → B → C; the dispatch discipline (one implementer per dispatch, verified) holds.
- **Risk and what would falsify the plan.** (1) If any "trivial" swap is not 1:1 — a line where the bracket token is not a plain `text-` color (the census found none in scope; the non-trivial `decoration-[var(--color-muted)]/55` is in `CairnMediaLibrary`, Phase 5) — stop and re-scope rather than forcing it. (2) If `placeholder:text-muted` does not compile to the expected rule, the **office-shell visual baseline** catches it (the gate cannot — it scans source, and the swapped source carries no token; the only office-chrome `placeholder:` color is `CairnAdminShell.svelte:374`, on `/admin/posts`, so the office-shell snapshot is the catcher, not the auth baseline). The `@utility` is variant-composable, so it should compile. (3) If the office-shell baseline demands a snapshot update, the retirement was not zero-pixel — investigate, do not accept the drift. (4) If `/admin/login` cannot be captured headlessly without the seeded session interfering, capture without the session or defer that one surface with a recorded reason; never lower the bar silently. (5) `floating-label` is deferred, not adopted — adopting it here would be the "invent a fold to justify scope" error the spec names.

---

## Post-mortem

(Appended at pass end.)
