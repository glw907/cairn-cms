# Admin re-expression Phase 3: forms and settings, on the frozen idiom

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. This is a small phase: a 3-token retirement, one a11y-test hardening, and a modest baseline extension. No redesign, no primitive adoption.

**Goal:** Sweep the forms-and-settings cluster onto the frozen role idiom. The census found the foldable surface here is tiny: **3 retired `text-[var(--color-muted)]` references** (`FieldInput`, `ReferenceField`, `ManageEditors`), ratcheting the admin `retiredTokenBudget` 198 → **195**. The one named decision (`floating-label`) is **resolved: not adopted** (below). Additionally close the one presence-only a11y test the census surfaced in this cluster, and extend the visual baseline to the one swept office-route surface.

**Architecture:** Phase 3 follows Phase 2's pattern exactly. The forms cluster carries almost no foldable surface: `CairnTidySettings` was already retired in Phase 0, `HelpHome`'s muted references live in its scoped `<style>` block (sanctioned token consumption, not markup), and `ObjectGroupField`/`RepeatableField` delegate inputs to `FieldInput` and carry no retired tokens. So the retirement is 3 trivial 1:1 swaps. `floating-label` is **not adopted**: every admin input uses the native persistent stacked-label / `fieldset` idiom, so it would be a redesign addition at ~10 sites with an a11y-migration cost and zero de-customization benefit. Geoff closed the question on 2026-06-30 (keep persistent labels); it is not pursued and not logged as a future pass.

**Tech Stack:** TypeScript, Svelte 5 (runes), DaisyUI 5.6, Tailwind 4, the frozen `text-muted` / `text-subtle` role utilities; Vitest (chromium component tests); Playwright (the showcase admin visual baseline); the `check:custom-surface` ratchet gate.

## Global Constraints

- **The spec is canonical.** Phase 3 of `docs/superpowers/specs/2026-06-29-admin-idiomatic-re-expression-design.md` (the Phase 3 list, the five rules, the non-goals). The ledger `docs/internal/design/2026-06-29-custom-surface-ledger.md` is the audit of record; this plan mirrors the Phase 2 plan (`2026-06-30-admin-re-expression-2-office-chrome.md`), which validated the mechanism.
- **Rule 2, exact swap.** Replace `text-[var(--color-muted)]` with `text-muted` inside the `class` value (or the JS class-string const), touching nothing else on the line. The `ManageEditors` hit is a `const` class string in the `<script>`, not markup; the gate's line scan counts it the same and the swap is identical.
- **Sanctioned tokens STAY.** Do not touch `FieldInput.svelte:200` `text-[var(--cairn-warning-ink)]` (Tier-2 ink), `HelpHome`'s scoped-`<style>` `color: var(--color-muted)` declarations (idiomatic token consumption, not a markup bracket form, not counted by the gate), or any `--cairn-error-ink`/`--color-positive-ink`/`--cairn-card-border`/`--cairn-shadow`/`--color-success` reference.
- **No native-primitive adoption.** `floating-label` is resolved as not-adopted (above). The census found no hand-rolled `status` dot or `tab` strip anywhere in the cluster. `CairnTidySettings`' check-and-tint toggles and `role="radiogroup"` choosers stay hand-rolled (no native 5.6 equivalent; spec). Adopt nothing.
- **No `@layer` fold, no CSS edit.** The census confirmed no `cairn-admin.css` rule targets a Phase 3 component to re-create a native primitive. **Do not edit `cairn-admin.css`.** `componentsLayerCap` stays 14, the unlayered allowlist stays 6.
- **No coupled-test migration.** The census found no Phase 3 test binds an assertion to a fold-target DaisyUI class (the `tidy-settings`/`repeatable-field` tests bind to ARIA roles and `data-cairn-*` hooks, not fold classes). Nothing migrates.
- **The gate is the test (red-green ratchet).** Task 1 lowers `trees.admin.budget.retiredTokenBudget` to 195, confirms the gate FAILS (`retired tokens: 198 > budget 195`), then retires the 3 tokens and confirms it PASSES at 195. Leave `trees.showcase.budget.retiredTokenBudget` at 0.
- **Admin design system.** Follow `docs/internal/admin-design-system.md`. Write any token in prose as its concrete value, never a placeholder-bracket form (the Tailwind-scans-docs gotcha).
- **Gate before done (each code task):** `npm run package`, then `npm run check` (0/0), `npm test` (exit 0), `npm run check:custom-surface` (PASS both trees at the new budget). `scripts/check-custom-surface.mjs` reads `.svelte` source directly, so the bare gate reflects a swap immediately; `npm run package` is for the test suite's dist imports. `check:comments` and the showcase e2e (Task 3) are their own gates.

---

## Task 1: Retire the 3 forms tokens (budget 198 → 195)

**Files:**
- Modify: `src/lib/components/FieldInput.svelte` (line `108`, the `fieldHint` snippet's `text-[var(--color-muted)]`).
- Modify: `src/lib/components/ReferenceField.svelte` (line `110`, the "Choose {field.label}" span).
- Modify: `src/lib/components/ManageEditors.svelte` (line `23`, the `col` class-string const).
- Modify: `scripts/custom-surface-budget.json` (`trees.admin.budget.retiredTokenBudget` 198 → 195; leave the showcase tree's `0`).

**Steps:**

- [ ] **Step 1 (red): lower the budget.** Set `trees.admin.budget.retiredTokenBudget` to `195`. `node scripts/check-custom-surface.mjs` → FAILS `retired tokens: 198 > budget 195`.
- [ ] **Step 2 (green): retire the tokens.** Swap each `text-[var(--color-muted)]` → `text-muted` in the three files (line numbers may have shifted; find by the token). For `ManageEditors:23` the token is inside a JS `const` class string; swap it there. Confirm by grep that no `var(--color-muted)`/`var(--color-subtle)` bracket form remains in the three files, and the sanctioned `FieldInput:200` `--cairn-warning-ink` and `HelpHome`'s scoped-`<style>` declarations are untouched.
- [ ] **Step 3: confirm the ratchet.** `npm run package`, `node scripts/check-custom-surface.mjs` → PASS at 195.
- [ ] **Step 4: full gate.** `npm run check` (0/0), `npm test` (exit 0 — `field-input.test.ts`, `reference-field.test.ts`, `ManageEditors.test.ts`, `edit-page-field-hint.test.ts` and the rest stay green), `npm run check:custom-surface` (PASS). Fix any failure.
- [ ] **Step 5: commit.**

```bash
git add src/lib/components/FieldInput.svelte src/lib/components/ReferenceField.svelte src/lib/components/ManageEditors.svelte scripts/custom-surface-budget.json
git commit -m "Retire muted tokens in the forms cluster (budget 198→195)"
```

---

## Task 2: Harden the RepeatableField presence-only live-region test

`RepeatableField` carries no retired token (swept by confirmation, no markup edit), but the census surfaced a **presence-only** a11y test in this cluster: `repeatable-field.test.ts:134` (`mounts a polite live region`) asserts only that the `[role="status"][aria-live="polite"]` region EXISTS, not that an add/remove mutates its text so a screen reader re-announces. This is the spec's standing "harden presence-only a11y" deliverable (the same gap class as `MediaPicker.test.ts:90`). No later phase re-expresses `RepeatableField`, so Phase 3 (its owning cluster) is the place to close it. The component already announces add/remove (`RepeatableField.svelte:309`); this hardens the test to assert that behavior, the model `tidy-settings.test.ts` already uses.

**Files:**
- Modify: `src/tests/component/repeatable-field.test.ts` (strengthen the live-region test).

**Steps:**

- [ ] **Step 1: read the announce contract.** Read `RepeatableField.svelte` around line 309 to confirm the exact text the live region renders on add and on remove (e.g. "Row added" / "Row removed"). The assertion must match the shipped text.
- [ ] **Step 2: harden the test.** Replace (or extend) the presence-only assertion at `repeatable-field.test.ts:134` so it captures the live region's initial text, performs an add, asserts the region text changed to the add announcement, performs a remove, and asserts it changed to the remove announcement (the behavioral pattern, not mere presence). Keep the existing presence check if useful; the new assertions are the point. Use the file's existing render/query conventions and `data-cairn-row-*` hooks.
- [ ] **Step 3: run; confirm green.** `npm test -- repeatable-field` → PASS (the component already behaves correctly; this asserts it). Then the full gate: `npm run check` (0/0), `npm test` (exit 0).
- [ ] **Step 4: commit.**

```bash
git add src/tests/component/repeatable-field.test.ts
git commit -m "Harden the RepeatableField live-region test to behavioral"
```

---

## Task 3: Extend the visual baseline to /admin/editors; confirm existing unchanged

The forms swept here render in two places: the edit page (`FieldInput`, `ReferenceField` — a desk route, baselined by Phase 4) and `/admin/editors` (`ManageEditors`). `/admin/editors` is a reachable office route not yet baselined and carries a Phase 3 edit, so it gets its baseline now. The retirement is zero-pixel, so the existing office/vocab/auth baselines must stay byte-identical. `/admin/settings` and `/admin/help` carry no Phase 3 edit (swept by confirmation), so they get no baseline this phase.

**Files:**
- Modify: `examples/showcase/e2e/admin-visual.spec.ts` (add the `/admin/editors` tests, light and dark).
- Add: `examples/showcase/e2e/admin-visual.spec.ts-snapshots/` (the new committed PNGs).

**Steps:**

- [ ] **Step 1: rebuild the engine dist** so the showcase symlink carries the swept components: `npm run package` at the repo root. (No reinstall, no lockfile — Phase 3 adds zero exports. `rm -rf examples/showcase/.svelte-kit` if a cache clear is wanted.)
- [ ] **Step 2: add the editors baseline.** In `admin-visual.spec.ts`, add tests mirroring the existing cookie-driven office-shell pair: navigate to `/admin/editors` and screenshot `admin-editors-light.png` / `admin-editors-dark.png` full-page, asserting a stable element first (e.g. the editors table or the "Add editor" control) so the DOM settles. The showcase dev backend seeds the session owner plus one editor, so the table renders real rows.
- [ ] **Step 3: generate + confirm stability.** Run `npx playwright test admin-visual.spec.ts` (first run writes the two new snapshots; the existing office/vocab/auth tests must PASS unchanged — the zero-pixel proof; if any existing baseline drifts, stop and investigate, do not accept it). Re-run once to confirm the new editors snapshots PASS on a single attempt (no `CI` retry masking).
- [ ] **Step 4: inspect** the two new PNGs to confirm they render the real editors page (the table with seeded rows, the add form), not a blank or error state.
- [ ] **Step 5: commit** the spec change and the two new snapshots (no lockfile).

```bash
git add examples/showcase/e2e/admin-visual.spec.ts examples/showcase/e2e/admin-visual.spec.ts-snapshots
git commit -m "Baseline /admin/editors; confirm office/vocab/auth shells unchanged"
```

---

## Self-review

- **Spec coverage (Phase 3 list).** `FieldInput`/`ReferenceField`/`ManageEditors` → Task 1 (edited). `ObjectGroupField`/`RepeatableField`/`CairnTidySettings`/`HelpHome` → swept by confirmation (zero retired markup tokens; CairnTidySettings retired in Phase 0, HelpHome's are scoped-`<style>`). `RepeatableField`'s presence-only a11y test → Task 2.
- **The one decision is resolved.** `floating-label` not adopted (an addition, not a fold; Geoff's call to keep persistent labels). Recorded, not deferred.
- **Verification deliverables.** Structural invariants intact (`cairn-admin.css` untouched). Selector de-coupling: none triggers (no fold-target coupling). Presence-only a11y: the one cluster gap (`repeatable-field.test.ts:134`) hardened. Per-phase baseline: `/admin/editors` added; office/vocab/auth proven byte-identical.
- **Honest scope.** Phase 3 is genuinely small because the foldable surface is small (the spec's premise). No work is invented to enlarge it: `floating-label` is declined, no primitive is adopted, no test is migrated, and only the one real presence-only gap is closed.
- **Risk.** (1) If a "trivial" swap is not a plain `text-` color, stop (the census found all 3 are). (2) The `ManageEditors` swap is in a JS const string; confirm the resulting class list is valid. (3) If `/admin/editors` does not render seeded editors, the baseline is hollow — confirm the dev backend seeds editors before committing the snapshot. (4) If an existing baseline drifts, the retirement was not zero-pixel — investigate.

---

## Post-mortem (2026-06-30)

Phase 3 swept the forms-and-settings cluster. As the census predicted, the foldable surface was tiny: 3 muted-token
swaps and nothing else. The admin `retiredTokenBudget` ratcheted 198 to 195, zero pixels moved, and the one named
decision (`floating-label`) was resolved as not-adopted.

### What was built (commits on `admin-reexpr-2-office-chrome`)

- **Plan (`c837666`).** The just-in-time plan, executed via a `cairn-implementer` workflow with a `svelte` + `daisyui-a11y`
  diff verify (both clean). No separate heavy plan-review workflow this time: the mechanism was validated and adversarially
  reviewed in Phase 2, and a 4-lens review of 3 token swaps would be disproportionate.
- **Task 1 retirement (`97adf8b`).** 3 swaps to `text-muted`: `FieldInput` (the field-hint snippet), `ReferenceField` (the
  "Choose…" placeholder span), `ManageEditors` (the column-header class const). Budget 198 to 195.
- **Build-blocker fix (`81e3d6a`).** The implementer found `npm run package` failing on the clean branch HEAD, independent
  of the swaps: my Phase 2 STATUS prose (`695573a`) wrote the token as the alternation shorthand with a `|` inside the
  brackets, and Tailwind v4's doc-scan compiled that class-shaped string into invalid CSS, breaking `build-admin-css.mjs`.
  Fixed by writing the parenthesized non-utility form. This is the Tailwind-scans-docs gotcha, third occurrence; the
  `tailwind-scans-docs-bad-candidate` memory was generalized to the `|`-alternation case.
- **Task 2 a11y hardening (`521f570`).** `RepeatableField` carries no token (swept by confirmation), but the census surfaced
  a presence-only live-region test in the cluster. Hardened it to behavioral: it now asserts the `[role="status"]
  [aria-live="polite"]` region's text mutates to "Row added"/"Row removed" on add/remove (a real WCAG 4.1.3 status-message
  check). The component already behaved correctly; the test now proves it. No later phase re-expresses `RepeatableField`, so
  Phase 3 (its owning cluster) was the place to close the gap.
- **Task 3 baseline (`ad08dbf`).** Baselined `/admin/editors` (the one swept office-route surface), light and dark; the
  eight existing baselines (office shell, vocabulary, login, confirm) passed byte-identical. The new snapshot was inspected
  and renders the real editors page.

### Verified (evidence)

- `npm run check` 0/0 (1245 files), `npm test` exit 0 (271 files, 2867 tests), `npm run check:custom-surface` PASS both trees
  at budget 195, `npm run package` exit 0 (the doc-scan gate, now green). `cairn-admin.css` untouched, `componentsLayerCap`
  14. Showcase admin-visual e2e 10/10 on a single attempt. Both reviewers clean. code-simplifier a no-op.

### Decisions and lessons

- **`floating-label` closed, not adopted.** Geoff's call (keep persistent labels). The census proved it is a redesign
  addition (every admin input uses the native persistent stacked-label / `fieldset` idiom; no hand-rolled label-floating
  mechanism exists to fold), at ~10 sites with an a11y-migration cost and zero de-customization benefit. Beyond the charter,
  persistent top-labels are the better pattern for this forms-heavy non-technical-editor audience. Not pursued, not logged.
- **Lesson: run the package-inclusive gate at pass-end.** Phase 2's pass-end ran the bare `node scripts/check-custom-surface.mjs`,
  which reads source and does not repackage, so it missed the broken-package state my own STATUS prose introduced. The fix is
  to run `npm run check:custom-surface` (which prepends `npm run package`, scanning docs) AFTER committing the pass-end prose,
  not only the bare check script. Applied this phase.
- **No CHANGELOG, no release.** Zero consumer-notable change; held per the sweep's hold-and-batch cadence.

### Carried follow-ups

- **Next: Phase 4 (desk chrome)** — `EditPage` chrome (the topbar context portal, the slide-overs, the headless dialogs),
  `EditorToolbar`, the footer environment strip. Not the CodeMirror content theme. Ratchets the budget from 195. The
  edit-page forms (`FieldInput`/`ReferenceField`) get their visual baseline there.
- **Deferred live admin smoke** (carried): a `wrangler dev` + D1-session smoke at a site cutover.
- **CI-vs-local baseline drift** (standing watch): the editors baseline was generated locally; regenerate on CI if its image
  renders differently.
