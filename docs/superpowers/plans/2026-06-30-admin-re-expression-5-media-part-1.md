# Admin re-expression Phase 5: media, part 1 (grid/listbox + triage, and MediaPicker)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax. A token-only retirement like Phases 2–4, plus the one presence-only a11y test the sweep owes (`MediaPicker.test.ts:90`). **Budget assumes Phase 4 has executed (enters at 149); execute Phase 4 first.**

**Goal:** Sweep the **Phase-5 half** of `CairnMediaLibrary` (the grid/listbox view, the list-density table, the triage radiogroup, and the browse chrome above the slide-over) plus `MediaPicker`, by retiring **24** arbitrary `text-[var(--color-muted|subtle)]` references to the named `text-muted`/`text-subtle` utilities, ratcheting the admin `retiredTokenBudget` 149 → **125**, hardening the `MediaPicker` presence-only live-region test to behavioral, and baselining the media library. No native-primitive adoption, no `@layer` fold, no behavior change. The Phase-6 half of `CairnMediaLibrary` (the slide-over, the dialogs, the `decoration-…/55` strikethrough) is **left untouched**.

**Architecture:** The spec splits `CairnMediaLibrary` (175 KB, six a11y models) across two phases along its a11y seams. The census found a clean structural boundary: the non-modal slide-over `<aside>` opens at **line 1634** (the last browse token is `:1616`; no retired token sits in the 1617–1633 gap), so **every retired token below the slide-over (`< 1627` is a safe operational cut) is Phase 5** (21 hits) and **every token at or below the slide-over is Phase 6** (105 hits). Phase 5 retires the 21 browse-view tokens plus `MediaPicker`'s 3. There is no native primitive to adopt: the grid's needs-alt/Described markers are labelled chips (a bare `.status` dot would strip the WCAG 1.4.1 label), and the triage filter is a true `role="radiogroup"` segmented control with no native 5.6 equivalent. The one non-trivial swap (`decoration-[var(--color-muted)]/55`, a decoration-color with an opacity suffix that cannot fold to `text-muted`) is at line 2322, in the Phase-6 half — out of scope here.

**Tech Stack:** TypeScript, Svelte 5 (runes), DaisyUI 5.6, Tailwind 4, the frozen `text-muted`/`text-subtle` role utilities; Vitest (chromium component tests); Playwright (the showcase admin visual baseline); the `check:custom-surface` ratchet gate.

## Global Constraints

- **The spec is canonical.** Phase 5 of `docs/superpowers/specs/2026-06-29-admin-idiomatic-re-expression-design.md` (the Phase 5/6 split, the five rules, the non-goals). The ledger `docs/internal/design/2026-06-29-custom-surface-ledger.md` is the audit of record; this plan mirrors the Phase 4 plan (entangled-swap callouts, the KEEP-on-a11y reconciliation, the gate-first ratchet).
- **THE Phase-5/Phase-6 BOUNDARY is line 1627 of `CairnMediaLibrary.svelte`.** Retire ONLY muted/subtle references on lines `< 1627` (the browse view: header, empty state, toolbar+triage, grid/listbox, density table, action bar, footer). **Do not touch any line `≥ 1627`** (the slide-over `<aside>`, the replace/push-alt/bulk/orphan/safe-delete dialogs) — those are Phase 6. After this phase, the residual in `CairnMediaLibrary` is exactly the 105 Phase-6 tokens (the file still contains them; the gate budget reflects that).
- **Rule 2, exact swap — the 21 Phase-5 sites, with 3 entangled.** The plain swaps (`text-[var(--color-muted)]` → `text-muted`, `text-[var(--color-subtle)]` → `text-subtle`): lines `1282` (the `headerLabel` const **definition** — the single counted hit; the const is interpolated at the Phase-5 table `<thead>` `:1497–1501` AND at four Phase-6 sites `:1723/:1775/:1795/:2038`, but swapping the definition is pixel-neutral, since `text-muted` resolves to the same `var(--color-muted)`, so the four Phase-6 labels render identically and need no Phase-6 action — the Phase-5 diff will show those four cross-boundary renders, which is correct), `1291`, `1293`, `1326`, `1330`, `1373`, `1395`, `1398`, `1409`, `1449`, `1535`, `1556`, `1559`, `1589`, `1616`; the subtle sites `1408`, `1454`, `1528`, `1599` → `text-subtle`. The **entangled** sites (swap ONLY the muted token; line numbers may shift, find by token):
  - `segButtonClass` (~`:1276`) and `densityButtonClass` (~`:1279`): the muted token is the **ternary false-arm** (the unselected ink). Swap the false-arm `text-[var(--color-muted)]` → `text-muted`; keep the `bg-primary/10 text-primary font-medium` true arm and (for `densityButtonClass`) the `hover:bg-base-content/[0.06]` on the false arm. The helper comment (the WCAG 1.4.1 note) means the utility stays whole.
  - `:1373` (the "Find orphaned files" toolbar button): the line also carries `border-[var(--cairn-card-border)]` — retire ONLY `text-[var(--color-muted)]`, keep the card-border.
- **`MediaPicker` (3 sites):** `:181` `text-[var(--color-muted)]` (search glyph), `:187` `placeholder:text-[var(--color-muted)]` → `placeholder:text-muted` (variant-composable, Phase 2/4 proved it), `:213` `text-[var(--color-muted)]` (empty-results copy). All trivial (one variant-prefixed).
- **Sanctioned tokens STAY.** Do not touch any `--cairn-warning-ink` (the needs-alt label ink), `--cairn-card-border`/`--cairn-shadow`, `--color-error`/`--color-primary` reference, the `bg-primary/10 text-primary` selected-state, `hover:bg-base-content/[0.06]`, or — critically — the `decoration-[var(--color-muted)]/55` at `:2322` (Phase 6, a decoration-color with `/55` opacity that has no named utility and cannot fold to `text-muted`). Touching any is a scope error.
- **No native-primitive adoption (recorded decisions).** No `status`: the grid tile needs-alt/Described markers (`:1471–1478`) and the table cell (`:1543–1549`) are **labelled chips** (`role="img" aria-label="Needs alt text"`/`"Described"`), not bare dots — a `.status` dot would strip the WCAG 1.4.1 non-color label (same call as Phase 4's save-state dot). No `tab` in the browse view. The **triage radiogroup stays hand-rolled**: it is a true `role="radiogroup"`/`role="radio"` + `aria-checked` segmented control with a `CheckIcon` non-color cue (`:1359`) and the ARIA radio keyboard model (`onTriageKeydown` `:161–171`); the spec is explicit that segmented/check-and-tint has no native 5.6 primitive (`.filter` breaks the cue). `floating-label` is closed (Phase 3). Adopt nothing. **Preserve the radio keyboard model — this is a real `radiogroup` (pick-one, `aria-checked`), distinct from ConceptList's `aria-pressed` toggle-button group; do not "modernize" it toward either.**
- **No `@layer` fold, no CSS edit.** No `cairn-admin.css` rule targets the media grid/picker (no `--cairn-media-*` tokens exist; the needs-alt label uses the Tier-2 `--cairn-warning-ink`). **Do not edit `cairn-admin.css`.** `componentsLayerCap` stays 14, the unlayered allowlist stays 6.
- **No coupled-test migration.** The census found zero `.badge`/`.alert`/`.status`/`.tab`/state-color class assertions in `CairnMediaLibrary.test.ts` (1592 lines) or `MediaPicker.test.ts`; the tests bind to roles (`[role="radiogroup"]`, `[role="status"]`, `[role="alert"]`, `getByRole`), not fold-target classes, and the radiogroup stays hand-rolled. No assertion folds → none migrates. Same reconciliation as Phases 2/4.
- **Presence-only a11y: harden `MediaPicker.test.ts:90` BEFORE re-expressing `MediaPicker`** (the spec's deliverable; this is the one ledger-enumerated presence-only gap, `MediaPicker.test.ts:90` = `expect(live.length).toBeGreaterThanOrEqual(2)`). The two regions are genuinely separately sourced: the count region = `filtered.length` (`:199–201`), the narration region = `activeNarration` (`:121–125`) embedding `` `${activeIndex + 1} of ${filtered.length}` `` with a `, needs alt text` suffix for alt-empty entries. See Task 2.
- **The gate is the test (red-green ratchet), strictly sequential A→B.** Ratchet: 149 → A (`CairnMediaLibrary` 21) → **128** → B (`MediaPicker` 3) → **125**. Leave the showcase tree's `0`. The gate reads `.svelte` source; the bare `node scripts/check-custom-surface.mjs` drives red/green, `npm run package` is for the test suite's dist imports.
- **Gate before done (each code task):** `npm run package`, `npm run check` (0/0), `npm test` (exit 0), `npm run check:custom-surface` (PASS both trees at the cluster's budget). **At pass-end run `npm run check:custom-surface` (repackages, scans docs), not only the bare script** (the Phase 3 lesson). Write prose tokens as `var(--color-(muted|subtle))`, never a `|` inside square brackets.

---

## Task 1: Cluster A — CairnMediaLibrary browse view (lines < 1627; budget 149 → 128)

Retire the 21 muted/subtle references in the `CairnMediaLibrary` browse view (everything above the slide-over at line 1627): the header/count, the empty state, the toolbar + triage radiogroup, the grid/listbox tiles, the density table, the action bar, the footer. Mind the entangled sites (`segButtonClass`/`densityButtonClass` ternary false-arms, the `:1373` card-border line). **Touch no line `≥ 1627`.**

**Files:**
- Modify: `src/lib/components/CairnMediaLibrary.svelte` (the 21 sites `< 1627`; see the constraint list).
- Modify: `scripts/custom-surface-budget.json` (`trees.admin.budget.retiredTokenBudget` 149 → 128).

**Steps:**

- [ ] **Step 1 (red): lower the budget** to `128` (leave the showcase `0`). `node scripts/check-custom-surface.mjs` → FAILS `retired tokens: 149 > budget 128`.
- [ ] **Step 2 (green): retire the tokens.** Swap each of the 21 `< 1627` muted/subtle references (the subtle sites `1408,1454,1528,1599` → `text-subtle`, the rest → `text-muted`). For the entangled helpers, swap only the muted false-arm and keep the selected-state/hover utilities; for `:1373` keep the `--cairn-card-border`. Confirm by grep that (a) no muted/subtle bracket form remains on lines `< 1627`, (b) the `≥ 1627` Phase-6 tokens are untouched (the count there is still 105), and (c) the `--cairn-warning-ink` needs-alt label and the selected-state `bg-primary/10 text-primary` are intact.
- [ ] **Step 3: confirm the ratchet.** `npm run package`, `node scripts/check-custom-surface.mjs` → PASS at 128.
- [ ] **Step 4: full gate.** `npm run check` (0/0), `npm test` (exit 0 — `CairnMediaLibrary.test.ts`'s `grid`/`list density`/`triage radiogroup`/`pagination`/`empty and broken states`/`multi-select`/`no-references rename` describe blocks stay green; the radiogroup keyboard test `:190` and the live-region tests stay green), `npm run check:custom-surface` (PASS). Fix any failure.
- [ ] **Step 5: commit.**

```bash
git add src/lib/components/CairnMediaLibrary.svelte scripts/custom-surface-budget.json
git commit -m "Retire muted/subtle tokens in CairnMediaLibrary browse view (budget 149→128)"
```

---

## Task 2: Cluster B — MediaPicker: harden the live-region test, then retire (budget 128 → 125)

Harden the presence-only live-region test first (the spec's "harden before re-expressing" deliverable), then retire `MediaPicker`'s 3 tokens. The component already announces correctly; the hardened test proves it.

**Files:**
- Modify: `src/tests/component/MediaPicker.test.ts` (harden the live-region test).
- Modify: `src/lib/components/MediaPicker.svelte` (3 token swaps).
- Modify: `scripts/custom-surface-budget.json` (`trees.admin.budget.retiredTokenBudget` 128 → 125).

**Steps:**

- [ ] **Step 1: harden the presence-only test.** Replace `MediaPicker.test.ts:90`'s `expect(live.length).toBeGreaterThanOrEqual(2)` with a **behavioral** assertion modeled on `tidy-review.test.ts:233` (re-announce) and `:181–187` (separation): render with the `IMAGES_ONLY` fixture (two entries: "Blue shoes" alt-set, "Red hat" alt-empty), capture the count region text and the narration region text (the narration starts empty — `activeIndex` is `-1` on mount), press ArrowDown (move 1: index 0, "Blue shoes, 1 of 2"; move 2: index 1, "Red hat, needs alt text, 2 of 2"), and assert (a) **separation** — the narration region text changes but the count region text does NOT; (b) **the real per-move announce text** — the narration matches the `` `${displayName}${needsAlt ? ', needs alt text' : ''}, ${i+1} of ${n}` `` format (e.g. the alt-empty entry narrates a string containing `, needs alt text` and the position `2 of 2`), and a second in-range move changes it again (the `${i+1} of ${n}` makes each in-range move distinct). **Do NOT assert a re-announce at the list boundary:** `MediaPicker` clamps at the last row (`activeIndex = Math.min(activeIndex + 1, filtered.length - 1)`, `:137`), so a repeated ArrowDown at the end produces a stable string — that is the picker's deliberate wiring, not a defect, and forcing a boundary re-announce is out of scope. Assert per-move distinctness for in-range moves only.
- [ ] **Step 2: run; confirm the hardened test passes** against the current component. `npm test -- MediaPicker` → PASS (the component already behaves; this asserts it). If it fails, the assertion text does not match the component's announce format — fix the assertion, not the component.
- [ ] **Step 3 (red): lower the budget** to `125`. `node scripts/check-custom-surface.mjs` → FAILS `retired tokens: 128 > budget 125`.
- [ ] **Step 4 (green): retire the 3 tokens.** `:181` and `:213` → `text-muted`; `:187` `placeholder:text-[var(--color-muted)]` → `placeholder:text-muted`. `npm run package`, `node scripts/check-custom-surface.mjs` → PASS at 125.
- [ ] **Step 5: full gate.** `npm run check` (0/0), `npm test` (exit 0 — `MediaPicker.test.ts` green, including the hardened test), `npm run check:custom-surface` (PASS). Fix any failure.
- [ ] **Step 6: commit.**

```bash
git add src/tests/component/MediaPicker.test.ts src/lib/components/MediaPicker.svelte scripts/custom-surface-budget.json
git commit -m "Harden MediaPicker live-region test; retire its tokens (budget 128→125)"
```

---

## Task 3: Baseline the media library; confirm existing baselines unchanged

The media library browse view (`/admin/media`, the `CairnMediaLibrary` grid/triage) is the swept surface and is not yet baselined. The showcase dev backend seeds media assets (`seedMediaLibrary`), so the grid renders real tiles. Capture light and dark. The retirement is zero-pixel, so the existing baselines stay byte-identical.

**Files:**
- Modify: `examples/showcase/e2e/admin-visual.spec.ts` (add the media-library tests).
- Add: the new committed PNGs.

**Steps:**

- [ ] **Step 1: rebuild the engine dist** so the showcase symlink carries the swept components: `npm run package` at the repo root. (No reinstall, no lockfile — zero new exports.)
- [ ] **Step 2: add the media-library baseline.** In `admin-visual.spec.ts`, add cookie-driven light/dark tests (`admin media library — light/dark`) that navigate to `/admin/media`, assert a stable browse element (the triage `getByRole('radiogroup')` or the grid `getByRole('listbox')`) is visible, then screenshot `admin-media-light.png` / `admin-media-dark.png` full-page. If thumbnail image loads cause flakiness, mask the tile `img` elements (the chrome — header, triage, grid frame, action bar — is the subject). `MediaPicker` is an editor dialog covered by its component tests and the hardened a11y test; it is not separately baselined (opening it is fragile and Phase 5 changed no pixels in it).
- [ ] **Step 3: generate + confirm stability.** Run `npx playwright test admin-visual.spec.ts` (first run writes the new snapshots; the existing office/vocab/auth/editors and any Phase-4 edit-page baselines must PASS unchanged — none renders `CairnMediaLibrary`, so any drift is a shared-`@utility` compile regression, stop and investigate). Re-run once (single attempt) to confirm the new media snapshots PASS stably.
- [ ] **Step 4: inspect** the new PNGs: the grid of seeded tiles, the triage radiogroup, the density toggle, the action bar — not a blank or mid-load frame.
- [ ] **Step 5: commit** the spec change and the new snapshots (no lockfile).

```bash
git add examples/showcase/e2e/admin-visual.spec.ts examples/showcase/e2e/admin-visual.spec.ts-snapshots
git commit -m "Baseline the media library browse view; existing shells unchanged"
```

---

## Self-review

- **Spec coverage (Phase 5).** `CairnMediaLibrary` grid/listbox + triage radiogroup (+ table density + browse chrome, all `< 1627`) → Task 1. `MediaPicker` → Task 2. The Phase-6 half (slide-over, dialogs) → explicitly left at lines `≥ 1627`.
- **The split is clean and verified.** 126 tokens = 21 (browse view, Phase 5) + 105 (slide-over/dialogs, Phase 6); the boundary is the slide-over `<aside>` at line 1634 (no token in the 1617–1633 gap). The two entangled helpers are toolbar-only. The `headerLabel` const is interpolated in both halves, but only its definition (`:1282`) carries the token and the swap is pixel-neutral, so retiring it is a single Phase-5 hit that leaves the four Phase-6 labels rendering identically (no Phase-6 action). The one non-trivial form (`decoration-…/55`, `:2322`) is in the Phase-6 half.
- **Native-primitive decisions: none adopted, recorded.** `status` (labelled chips, not dots), `tab` (none), the triage radiogroup (a true `role=radiogroup`, no native equivalent, keyboard model preserved).
- **Presence-only a11y hardened.** `MediaPicker.test.ts:90` upgraded to behavioral before the re-expression — the one ledger-enumerated gap, now closed (only the boundary-clamp re-announce is out of scope, by the picker's deliberate wiring).
- **Verification.** `cairn-admin.css` untouched; no coupled-test migration (role-bound tests, native-kept); the media-library baseline added; existing baselines proven byte-identical.
- **Risk.** (1) The line-1627 boundary is load-bearing: a swap on a `≥ 1627` line steals a Phase-6 token and corrupts both phases' budgets — grep-verify the Phase-6 count stays 105 after Cluster A. (2) The entangled false-arms must touch only the muted token. (3) The hardened MediaPicker test must match the real announce format and must NOT require a boundary-clamp re-announce. (4) If an existing baseline drifts, the retirement was not zero-pixel — investigate. (5) **This plan assumes Phase 4 executed first (budget 149); if the budget is not 149 at Step 1, Phase 4 has not run — stop and run it first, or the ratchet numbers are wrong.**

---

## Post-mortem

(Appended at pass end.)
