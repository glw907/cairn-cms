# Admin re-expression Phase 6: media, part 2 (the slide-over, the dialogs) — the FINAL sweep phase

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax. A token retirement like Phases 2–5, but it carries **the one decision the sweep deferred**: the `decoration-…/55` at `CairnMediaLibrary:2322`, which cannot fold to `text-muted` (see the decision below). This phase ratchets the admin `retiredTokenBudget` to **0** — the terminal floor.

**Goal:** Retire the last 125 muted/subtle references across the five media files — `CairnMediaLibrary`'s slide-over + dialog region (lines `≥ 1627`, 105), `MediaHeroField` (14), `MediaFigureControl` (4), `MediaCaptureCard` (1), `MediaInsertPopover` (1) — ratcheting the admin `retiredTokenBudget` 125 → **0**, and baseline the slide-over/dialog surfaces. After this phase the admin tree holds zero muted/subtle bracket tokens (the sweep's terminal floor). No native-primitive adoption, no `@layer` fold, no behavior change.

**Architecture:** Phase 6 completes the `CairnMediaLibrary` split begun in Phase 5 (which swept the browse view `< 1627`). This phase sweeps the `≥ 1627` region (the non-modal slide-over detail panel, the safe-delete alertdialog, and the replace / push-alt / bulk-delete / orphan-scan dialogs — six distinct a11y models, preserved verbatim) plus the four small media components. 124 of the 125 are trivial 1:1 or entangled swaps; the 125th is the non-trivial `decoration-[var(--color-muted)]/55` strikethrough, the one form the frozen role layer cannot express, resolved below.

**Tech Stack:** TypeScript, Svelte 5 (runes), DaisyUI 5.6, Tailwind 4, the frozen `text-muted`/`text-subtle` role utilities; Vitest (chromium component tests); Playwright (the showcase admin visual baseline); the `check:custom-surface` ratchet gate.

## The one decision: `decoration-[var(--color-muted)]/55` at `CairnMediaLibrary:2322`

The push-alt "alt was" diff row strikes through the old alt text with `decoration-[var(--color-muted)]/55` (a text-decoration-COLOR at 55% opacity). It **cannot fold to `text-muted`** (that sets `color`, a different property), and to reach budget 0 the `var(--color-muted)` must leave the markup brackets (the gate regex matches any `[…var(--color-muted)…]`). The census proved a plain `@utility decoration-muted` silently drops the `/55` modifier, so two clean options remain:

- **(b) The existing sanctioned decoration idiom (leaner; small recorded drift) — RECOMMENDED.** Rewrite `:2322` to `decoration-[color-mix(in_oklab,currentColor_55%,transparent)]`, the exact form `TidyReview.svelte:363` and `EditPage.svelte:1841/1946` already use and the sweep kept (the gate does not count a `color-mix` over `currentColor`; verified). No new utility, no frozen-layer change, no test touch. **Cost:** the span sets `text-base-content`, so the strikethrough color shifts from muted-at-55% to base-content-at-55% — a small, intended, screenshot-recorded color change on one strikethrough row (visually near-identical; the two differ slightly in lightness).
- **(a) A named guaranteed-value utility (pixel-identical; the alternative).** Add `@utility decoration-muted-faint { text-decoration-color: color-mix(in oklab, var(--color-muted) 55%, transparent); }` to `scripts/admin-css.input.css` (mirroring `text-muted`/`text-subtle` at `:19-24`, the same guaranteed-value branch), and change `:2322` to `decoration-muted-faint` (no bracket, the 55% baked in). Preserves the exact muted strikethrough color, at the cost of extending the frozen role layer by one utility. **Test work is small and bounded:** `admin-css-build.test.ts` uses only `toContain`/`toMatch` assertions (no byte-identity, no exhaustive present-class set — verified), so adding the utility breaks nothing; the only step is one new `it(...)` asserting `decoration-muted-faint` compiles to its `text-decoration-color` rule, mirroring the `text-muted`/`text-subtle` assertion at `admin-css-build.test.ts:31-32`. Record the addition in the ledger as a sanctioned role-layer extension.

**Recommendation: (b)** — the final phase's whole point is removing bracket customization, so adding a role utility for one site cuts against the grain; (b) reuses the existing sanctioned `currentColor` decoration idiom, reaches budget 0 with no frozen-layer change, and the color shift is negligible (a recorded baseline drift on one strikethrough). **(a)** is the pixel-exact alternative if Geoff prefers to preserve the muted hue. **This is the executor's/Geoff's call to confirm before Task 2.** Everything else in Phase 6 is mechanical. Both forms use `color-mix(in oklab, …)`, the codebase's uniform interpolation space.

## Global Constraints

- **The spec is canonical.** Phase 6 of `docs/superpowers/specs/2026-06-29-admin-idiomatic-re-expression-design.md` (the Phase 6 list, the five rules, the non-goals, the "Tier 3 to its proven floor" success criterion). The ledger and the Phase 5 plan are the pattern.
- **Boundary: `CairnMediaLibrary` `≥ 1627` only.** Phase 5 swept `< 1627` (now 0 tokens there). This phase sweeps the `≥ 1627` region. The `</script>` closes at `:1283`, so every one of the 105 is live markup (no JS const; `headerLabel`/`segButtonClass`/`densityButtonClass` were Phase-5 swaps and are not in the 105).
- **Rule 2, exact swap — the entangled sites (swap ONLY the muted/subtle token, find by token):**
  - `CairnMediaLibrary:1841` — delete-in-use inline ternary; the muted token is the **false-arm** (`… : 'bg-base-content/[0.07] text-[var(--color-muted)]'`). Keep the `cairn-error-tint`/`cairn-error-ink` true arm.
  - `CairnMediaLibrary:1988, :1993, :2353, :2570, :2877, :2951` — each line also carries `border-[var(--cairn-card-border)]` (`:2353` is `…/70`). Keep the card-border.
  - `CairnMediaLibrary:2874` — the line carries a nested `bg-[var(--cairn-code-chip)]`. Keep the code-chip.
  - `MediaFigureControl:179` — the roving-radio segment class ternary; the muted token is the **false-arm** (`… : 'text-[var(--color-muted)]'`). Keep the `bg-primary/10 text-primary` true arm.
  - The two **subtle** sites in `CairnMediaLibrary` are `:1651` and `:1966` → `text-subtle`.
  - Trivial note: lines carrying `opacity-60`/`opacity-65` or `bg-base-content/[0.06]` alongside the muted token are still trivial 1:1 (those modifiers are separate utilities; swap only the `text-[var(--color-muted)]`).
- **`:2322` per the decision above** (option a or b). This is the only non-trivial site.
- **Sanctioned tokens STAY.** `--cairn-error-tint`/`--cairn-error-ink`/`--cairn-warning-ink`/`--color-positive-ink`, `--cairn-card-border`/`--cairn-shadow`, `--cairn-code-chip`, `--color-error`/`--color-primary`, `bg-base-content/[…]`, the existing `decoration-[…currentColor…]` forms. Touching any is a scope error.
- **No native-primitive adoption.** The census found none: the safe-delete/replace/bulk alertdialogs and the push-alt/orphan dialogs are native `<dialog>` (kept); the alt-status indicators (MediaHeroField/MediaFigureControl/MediaCaptureCard) are labelled chips, not bare dots (`.status` would strip the WCAG 1.4.1 label); the placement/alt radiogroups are true `role=radiogroup` segmented controls with check cues (no native 5.6 primitive). `floating-label` is closed. Adopt nothing.
- **No `@layer` fold, no `cairn-admin.css` edit.** (Option (a) edits `scripts/admin-css.input.css` — the role-layer input, NOT `cairn-admin.css`. `componentsLayerCap` stays 14, unlayered allowlist 6.)
- **No coupled-test migration.** Zero fold-target class assertions in the Phase-6 tests (they bind roles/`data-*`/hidden-input names/text). `CairnMediaLibrary.test.ts:1548` matches `/--color-error/` (sanctioned, unaffected); `:936/:941` bind `[data-cairn-alt-was]` (the attribute, not the `:2322` class); `MediaInsertPopover.test.ts:274` couples `.btn-primary` (kept Tier-2 lift). None migrates.
- **No presence-only a11y upgrade.** All Phase-6 live-region tests are behavioral (`CairnMediaLibrary.test.ts:246-266, :947-964, :1083-1096`; `MediaFigureControl.test.ts:111,:123`). The one ledger gap (`MediaPicker.test.ts:90`) was hardened in Phase 5.
- **Preserve the six a11y models** verbatim (the sweep only swaps colors): (1) the non-modal slide-over `<aside role="region">` `:1634-1821` (NOT a dialog — no focus trap, no `aria-modal`); (2) the safe-delete `<dialog role="alertdialog">` `:1828-1911`; (3) the replace `<dialog role="alertdialog">` `:1917-2165`; (4) the push-alt `<dialog role="dialog">` `:2175-2439` (deliberately `dialog` not `alertdialog`); (5) the bulk-delete `<dialog role="alertdialog">` `:2448-2670`; (6) the orphan-scan `<dialog role="dialog">` `:2679-2974` (the orphan list is plain labelled native checkboxes, NOT a listbox — do not add roving/listbox roles).
- **The gate is the test (ratchet to 0).** Because exact per-region counts are not pre-pinned, each cluster retires its region, runs `node scripts/check-custom-surface.mjs` to read the new total, sets `trees.admin.budget.retiredTokenBudget` to that measured count, and confirms PASS. The final cluster (Task 4) + the `:2322` treatment reach **0**. Leave the showcase tree's `0`.
- **Gate before done (each code task):** `npm run package`, `npm run check` (0/0), `npm test` (exit 0), `npm run check:custom-surface` (PASS both trees at the cluster's budget). **At pass-end run `npm run check:custom-surface` (repackages, scans docs), not only the bare script.** In any doc prose, write the **bare** `var(--color-(muted|subtle))`, never inside a `text-[…]` wrapper carrying a `|` (the gotcha that bit the sweep four times).

---

## Task 1: CairnMediaLibrary — the slide-over + safe-delete (lines 1634–1911)

Retire the muted/subtle references in the non-modal slide-over detail panel (a11y model 1) and the safe-delete alertdialog (model 2), including the `:1841` delete-in-use false-arm and the `:1651` subtle. Preserve the `region`-not-dialog semantics of the slide-over and the `alertdialog` of the safe-delete.

**Files:** `src/lib/components/CairnMediaLibrary.svelte` (lines ~1634–1911), `scripts/custom-surface-budget.json`.

**Steps:**
- [ ] **Retire the region's muted/subtle tokens** (`:1651` → `text-subtle`, the rest → `text-muted`; `:1841` false-arm only). Confirm by grep that lines 1634–1911 hold zero muted/subtle brackets and the sanctioned inks/card-borders are intact.
- [ ] **Ratchet:** `node scripts/check-custom-surface.mjs` reports the new total; set `trees.admin.budget.retiredTokenBudget` to it; confirm PASS.
- [ ] **Full gate** (`npm run package`, `check` 0/0, `npm test` exit 0, `check:custom-surface` PASS). The slide-over/safe-delete describe blocks in `CairnMediaLibrary.test.ts` stay green.
- [ ] **Commit** (`src/lib/components/CairnMediaLibrary.svelte`, `scripts/custom-surface-budget.json`; message: `Retire muted/subtle tokens in the media slide-over + safe-delete (budget 125→N)`).

---

## Task 2: CairnMediaLibrary — replace + push-alt dialogs (lines 1917–2439), incl. the `:2322` decision

Retire the replace alertdialog (model 3) and the push-alt dialog (model 4), including the `:1988/:1993/:2353` card-border entangled sites, the `:1966` subtle, and — per **the one decision above** — the `:2322` `decoration-…/55` (option a: add `@utility decoration-muted-faint` to `scripts/admin-css.input.css` + swap the markup + add the `admin-css-build.test.ts` assertion + record in the ledger; or option b: the `decoration-[color-mix(…currentColor 55%…)]` idiom). Confirm the decision before starting.

**Files:** `src/lib/components/CairnMediaLibrary.svelte` (lines ~1917–2439); for option (a) also `scripts/admin-css.input.css` + `src/tests/unit/admin-css-build.test.ts`; `scripts/custom-surface-budget.json`.

**Steps:**
- [ ] **Confirm the `:2322` treatment** (recommended (b), or (a)). For (b): swap `:2322`'s `decoration-[var(--color-muted)]/55` to `decoration-[color-mix(in_oklab,currentColor_55%,transparent)]` (no var bracket, gate stops counting it). For (a): define the `@utility decoration-muted-faint` in `scripts/admin-css.input.css`, swap `:2322` to `decoration-muted-faint`, and add one `it(...)` to `admin-css-build.test.ts` asserting it compiles (no other test work — the file has no byte-identity/present-class pin).
- [ ] **Retire the region's muted/subtle tokens** (`:1966` → `text-subtle`, the rest → `text-muted`; card-border lines keep the border) and apply the `:2322` treatment. Grep-confirm zero muted/subtle brackets in 1917–2439 (incl. `:2322` de-bracketed).
- [ ] **Ratchet** the budget to the measured count; full gate; the replace/push-alt describe blocks (incl. the dual live-region test `:947-964`) stay green.
- [ ] **Commit** (the component, the budget, and for option a the input.css + the test; message names the `:2322` treatment).

---

## Task 3: CairnMediaLibrary — bulk-delete + orphan dialogs (lines 2448–2974)

Retire the bulk-delete alertdialog (model 5) and the orphan-scan dialog (model 6), including the `:2570/:2874/:2877/:2951` entangled sites. Preserve the orphan list's plain-checkbox (not-listbox) model.

**Files:** `src/lib/components/CairnMediaLibrary.svelte` (lines ~2448–2974), `scripts/custom-surface-budget.json`.

**Steps:**
- [ ] **Retire** the region's tokens (all `text-muted`; entangled lines keep the card-border/code-chip). Grep-confirm zero muted/subtle brackets in 2448–2974, and that `CairnMediaLibrary.svelte` as a whole now holds **0** muted/subtle brackets (the file is swept).
- [ ] **Ratchet** to the measured count; full gate (the bulk/orphan describe blocks + the `:1548` `--color-error` assertion stay green).
- [ ] **Commit.**

---

## Task 4: the four small media files (budget → 0)

Retire `MediaHeroField` (14, all trivial), `MediaFigureControl` (4: 3 trivial + the `:179` ternary false-arm), `MediaCaptureCard` (1, `:110`), `MediaInsertPopover` (1, `:406`). This reaches the **terminal floor**.

**Files:** the four components, `scripts/custom-surface-budget.json`.

**Steps:**
- [ ] **Retire** all four files' tokens (`MediaFigureControl:179` false-arm only). Grep-confirm zero muted/subtle brackets across the whole `src/lib/components` tree.
- [ ] **Ratchet the budget to `0`** (`node scripts/check-custom-surface.mjs` reports 0; set `retiredTokenBudget: 0`; confirm PASS at 0). This is the terminal floor — the sweep's retired-token goal is met.
- [ ] **Full gate** (incl. `MediaHeroField.test.ts`, `MediaFigureControl.test.ts`, `MediaCaptureCard.test.ts`, `MediaInsertPopover.test.ts`; note `MediaHeroField` has a Playwright screenshot baseline under `src/tests/component/__screenshots__/MediaHeroField.test.ts/` — if the swap is pixel-identical it stays, else update it as recorded drift).
- [ ] **Commit.**

---

## Task 5: baseline the slide-over/dialog surfaces; confirm existing; record the terminal floor

The slide-over and dialogs open on interaction, so they are absent from the static `/admin/media` baseline (which Phase 5 added). Add a baseline that opens the slide-over (and, if option (b) shifted the `:2322` color, the push-alt dialog) so the swept surfaces have a reference. The existing 14 baselines stay byte-identical (the retirement is zero-pixel except a possible option-(b) `:2322` drift).

**Files:** `examples/showcase/e2e/admin-visual.spec.ts` + new snapshots.

**Steps:**
- [ ] `npm run package` at the repo root (symlink carries the swept dist).
- [ ] **Add a slide-over baseline:** navigate `/admin/media`, open the first tile's detail slide-over (click the tile / press Enter per the grid model), assert the `<aside>` `role="region"` detail panel is visible, screenshot `admin-media-detail-{light,dark}.png` (mask any tile `img` if needed). If option (b) was chosen, also capture the push-alt dialog so the recorded color shift is the baseline.
- [ ] **Generate + confirm stability** (the existing 14 baselines pass unchanged — the zero-pixel proof; for option (b), the only intended change is the `:2322` strikethrough color in the push-alt capture). Re-run once single-attempt.
- [ ] **Inspect** the new snapshots.
- [ ] **Commit** the spec + snapshots.

---

## Self-review

- **Spec coverage (Phase 6 list).** `CairnMediaLibrary`'s slide-over + safe-delete + dialogs (`≥ 1627`, 105) → Tasks 1–3; `MediaHeroField`/`MediaFigureControl`/`MediaCaptureCard`/`MediaInsertPopover` (20) → Task 4. The six a11y models preserved.
- **The terminal floor.** Budget 125 → 0; after Phase 6 the admin tree holds zero muted/subtle bracket tokens (the sweep's retired-token success criterion met). The residual is then only the Tier-2 sanctioned tokens (the inks, elevation, the editor system) — owned on purpose.
- **The one decision recorded.** The `:2322` `decoration-…/55` treatment (a: a named guaranteed-value utility, pixel-identical, +1 role utility; or b: the existing currentColor idiom, leaner, small recorded drift). Recommend (a); confirm before Task 2.
- **No native adoption, no `@layer` fold, no coupled-test migration, no presence-only a11y owed** — all verified by the census, consistent with Phases 2–5.
- **Risk.** (1) The entangled sites must touch only the muted/subtle token (grep-verify the sanctioned inks/card-borders/code-chip survive). (2) If option (a) is chosen, it grows the compiled sheet by one rule, but `admin-css-build.test.ts` uses only `toContain`/`toMatch` (no byte-identity, no exhaustive present-class set — verified), so it breaks nothing; just add one compile assertion. Option (b) needs no test touch. (3) The six a11y models are color-only edits — any role/markup change is out of scope. (4) The slide-over/dialog baselines need interaction to open; keep them retry-safe. (5) After Task 4 the budget is 0 and must stay 0 — the gate now blocks any new muted/subtle bracket token anywhere in the admin tree.

---

## Post-mortem

(Appended at pass end.)
