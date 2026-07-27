# Design infrastructure Pass 1: grammar tokens

> **For agentic workers:** execute task-by-task by dispatching each task to
> `cairn-implementer` (pinned Sonnet); the main loop reviews each diff and confirms the
> full gate before the next dispatch. Pass `model: opus` only for novel
> correctness-critical logic a task does not fully specify. Steps use checkbox (`- [ ]`)
> syntax for tracking. Run on a feature worktree off `main` (`cairn-pass` conventions;
> after creating the worktree, `npm install` in `examples/showcase` so its `file:` deps
> point at the worktree, per the CLAUDE.md symlink gotcha).

**Goal:** the type and spacing grammar of cairn's admin ships as named engine tokens and
role utilities, with the toolkit and admin screens migrated onto them pixel-identically,
and the palette/grammar boundary written as a documented contract.

**Architecture:** a grammar-token block joins the existing `--cairn-*` vocabulary in
`src/lib/components/cairn-admin.css`; named role utilities (the `text-muted`/`text-subtle`
idiom extended) are the authoring interface, so builders pick relationships by name and
never write pixel values or bracketed `var()` wrappers in markup. A single
source-of-truth module lists the grammar tokens so Pass 2's `grammar-boundary` audit rule,
the boundary docs, and the definition test share one inventory. The committed
`admin-visual.spec.ts` snapshots are the no-drift proof: the migration is correct exactly
when they do not change.

**Tech stack:** Tailwind 4 `@utility` / CSS custom properties in `cairn-admin.css`; Vitest
for the definition test; the showcase Playwright suite for the no-drift gate.

**Spec:** `docs/superpowers/specs/2026-07-27-cairn-design-infrastructure-design.md`,
sections 4 and 10 (Pass 1). Read its section 4 before starting.

## Global constraints

- **Pixel identity is the pass's contract.** `examples/showcase` `admin-visual.spec.ts`
  runs with NO snapshot updates: a migration commit that changes any committed snapshot is
  wrong, full stop. Where a screen's current value does not match a role token, do NOT
  change the value: record it in the deviations ledger (Task 4) and leave the call site
  unmigrated.
- **No speculative tokens.** Every token value is measured from the current rendered
  screens or the existing CSS, never invented. If a proposed role has fewer than two real
  call sites, it is not defined; it goes in the deviations ledger as a candidate.
- **Full gate per task:** targeted test green, `npm run check` 0/0, `npm test` exit 0.
  Tasks touching admin markup additionally run `npm run check:admin-css-classes` and
  `npm run check:invisible-craft` (the new utilities must compile into the built sheet).
- **The grammar/palette boundary:** grammar tokens are type and spacing structure
  (`--cairn-type-*`, `--cairn-gap-*`, `--cairn-indent-*`); they are theme-invariant and
  are defined once, outside the light/dark theme blocks. Palette tokens stay exactly where
  they are.
- Comments follow TSDoc/repo standards; the em dash is banned in comments. CHANGELOG
  entries go under `## Unreleased`; no version bump anywhere in this pass.

---

### Task 1: Grammar-token definitions and the source-of-truth module

**Files:**
- Modify: `src/lib/components/cairn-admin.css` (new grammar-token block, adjacent to the
  existing `--cairn-*` definitions but outside the theme-specific blocks)
- Create: `src/lib/design/grammar-tokens.ts` (the canonical inventory)
- Test: `src/tests/unit/grammar-tokens.test.ts`

**Interfaces:**
- Produces: CSS custom properties `--cairn-type-title`, `--cairn-type-subtitle`,
  `--cairn-type-body`, `--cairn-type-meta`, `--cairn-type-label`, `--cairn-type-chip`;
  `--cairn-gap-control`, `--cairn-gap-label`, `--cairn-gap-group`, `--cairn-gap-section`;
  measured `--cairn-indent-*` roles. And `GRAMMAR_TOKENS: readonly string[]` exported from
  `src/lib/design/grammar-tokens.ts`, listing exactly those names (Tasks 2 and 5 and Pass
  2's audit consume it).

- [ ] **Step 1: Measure before defining.** Survey the current values: the ruled six-role
  type scale is 24 title / 14–15 subtitle / 14 body / 13 meta / 11 label / 10 chip (spec
  section 4). For the subtitle, measure the rendered admin screens (PageHeader subtitle,
  card subtitles) and set the token to the dominant observed value; any screen at the
  other value goes in the deviations ledger (Task 4 collects it). For the gap roles,
  measure the recurring vertical rhythm on Members-genre screens (control-to-control,
  label-to-control, group, section) in the current CSS/utilities. For indentation, measure
  the sidebar nav and ExpandableRow indents; define only roles with two or more real call
  sites.
- [ ] **Step 2: Write the failing test.** `grammar-tokens.test.ts` asserts: (a) every name
  in `GRAMMAR_TOKENS` is defined exactly once in the built `dist/components/cairn-admin.css`
  (run after `npm run package`); (b) the type-role values match the measured scale; (c) no
  grammar token appears inside a theme-scoped block (theme-invariance).
- [ ] **Step 3: Run it to confirm it fails** (tokens not yet defined).
- [ ] **Step 4: Define the tokens** in `cairn-admin.css` with a block comment naming the
  contract (grammar tokens are the structural vocabulary; sites re-tune palette tokens,
  never these) and create `grammar-tokens.ts` with the inventory and a one-line TSDoc per
  export.
- [ ] **Step 5: `npm run package`, run the test to green, then the full gate.**
- [ ] **Step 6: Commit** (`feat(admin): define the grammar-token layer`).

### Task 2: The role-utility authoring interface

**Files:**
- Modify: `src/lib/components/cairn-admin.css` (`@utility` definitions)
- Test: extend `src/tests/unit/grammar-tokens.test.ts`

**Interfaces:**
- Consumes: the Task 1 tokens.
- Produces: utilities `type-title`, `type-subtitle`, `type-body`, `type-meta`,
  `type-label`, `type-chip` (each carries its role's FULL ruled recipe: size from the
  token, plus the recipe's weight/tracking/case where the standard fixes them, e.g. the
  11px label recipe); utilities `gap-control`, `gap-label`, `gap-group`, `gap-section`
  (setting the `gap` property from the tokens, for flex/grid contexts). Tasks 3 and 4
  write ONLY these names in markup.

- [ ] **Step 1: Verify the names are free.** Confirm none of the utility names shadows an
  existing Tailwind/DaisyUI utility that compiles in the admin sheet today (the `gap-*`
  role names sit beside Tailwind's numeric `gap-2` scale and must not collide with any
  name in use; if a collision exists, prefix the colliding family `cairn-` and record the
  decision in the ledger).
- [ ] **Step 2: Extend the test**: each utility name, used in a probe component string,
  compiles into the built sheet (reuse `check:admin-css-classes`'s resolution approach or
  assert the selector exists in `dist/components/cairn-admin.css`), and each `type-*`
  utility's declarations reference its `--cairn-type-*` token rather than a literal.
- [ ] **Step 3: Run to confirm it fails, define the utilities, run to green.**
- [ ] **Step 4: Scoped-style rule.** Add one sentence to the `cairn-admin.css` header
  comment: component `<style>` blocks reference `var(--cairn-gap-*)` directly (CSS is not
  markup); markup uses only the named utilities.
- [ ] **Step 5: Full gate, commit** (`feat(admin): add the role-utility interface`).

### Task 3: Pixel-identical migration of admin-toolkit

**Files:**
- Modify: `src/lib/admin-toolkit/*.svelte` (PageHeader, ListToolbar, AdminTable,
  StatusChip, Pagination, EmptyState, ExpandableRow)
- Test: the existing showcase `admin-visual.spec.ts` snapshots, unchanged

**Interfaces:**
- Consumes: the Task 2 utilities, and only those names.

- [ ] **Step 1: Baseline first.** In `examples/showcase`: `npm install`, then
  `npx playwright test admin-visual` to confirm the committed snapshots pass BEFORE any
  change (a dirty baseline invalidates the whole task; stop and report if red).
- [ ] **Step 2: Migrate one component (StatusChip) as the worked instance:** replace its
  literal type sizes/tracking/weights and spacing values with the role utilities where the
  current value equals the role's value; leave mismatches untouched and note them for the
  ledger. Re-run `admin-visual` and confirm zero snapshot diffs.
- [ ] **Step 3: Migrate the remaining six components** the same way, re-running the visual
  spec after each.
- [ ] **Step 4: Run `check:admin-css-classes`, `check:invisible-craft`, and the full
  gate** (the showcase `pretest:e2e` hook repackages the library, so the e2e run proves
  the worktree's build).
- [ ] **Step 5: Commit** (`refactor(admin-toolkit): migrate to grammar tokens, pixel-identical`).

### Task 4: Pixel-identical migration of the engine admin screens, plus the deviations ledger

**Files:**
- Modify: `src/lib/components/*.svelte` (the admin screens and chrome)
- Create: `docs/internal/2026-07-design-infrastructure-pass-1-deviations.md`
- Test: `admin-visual.spec.ts` snapshots, unchanged; full gate

**Interfaces:**
- Consumes: the Task 2 utilities.
- Produces: the deviations ledger — every call site whose current value matches no role
  (off-scale sizes, one-off gaps, the losing subtitle value if any), each with file:line,
  the current value, the nearest role, and no fix. Pass 2's audit calibration and the
  Pass 3 standard read this ledger; resolving a deviation is future design work, never
  this pass's.

- [ ] **Step 1: Sweep `src/lib/components` in review-sized slices** (editor chrome,
  media/gallery, help, settings, list screens), migrating exact-match call sites to the
  role utilities and ledgering mismatches. Re-run `admin-visual` per slice; zero diffs.
- [ ] **Step 2: Write the deviations ledger** with the collected entries grouped by kind,
  and a header stating its contract (a catalog, not a to-do list; entries leave only via a
  ratified design decision).
- [ ] **Step 3: Full gate plus `check:admin-css-classes` and `check:invisible-craft`.**
- [ ] **Step 4: Commit** (`refactor(admin): migrate admin screens to grammar tokens`).

### Task 5: The palette/grammar boundary contract in the docs

**Files:**
- Modify: `docs/internal/admin-design-system.md` (a "Grammar tokens" section: the roles,
  the utilities, the boundary rule, the scoped-style rule)
- Create: `docs/reference/admin-grammar-tokens.md` (the public contract page: the token
  inventory from `grammar-tokens.ts`, the role-utility names, the rule that sites re-tune
  palette tokens and never redeclare grammar tokens, and that palette re-tuning's
  acceptance test is a clean consumer-side rendered audit in both themes once
  `cairn-audit` ships)
- Modify: `docs/reference/README.md` (arm index), `CHANGELOG.md` (under `## Unreleased`:
  the grammar-token layer, the role utilities, the boundary contract; no consumer action)

**Interfaces:**
- Consumes: `GRAMMAR_TOKENS` from Task 1 (the page's inventory must match it name-for-name).

- [ ] **Step 1: Write the reference page** to the Google developer-docs standard and the
  docs-register contract (`docs/internal/docs-register.md`); Vale must pass clean.
- [ ] **Step 2: Update the internal design-system doc** so an agent extending the admin
  reads the grammar vocabulary in the same place as the component recipes.
- [ ] **Step 3: Run the docs gates:** `npm run check:docs`, `npm run check:arm-indexes`,
  and the full gate (`check:reference` does not cover non-subpath pages, but the arm index
  does).
- [ ] **Step 4: Commit** (`docs(reference): the grammar-token contract`).

### Task 6: Pass-end verification

- [ ] **Step 1: From-scratch proof:** in the worktree's showcase, `npm ci` then the full
  e2e suite; every admin-visual snapshot byte-stable against the committed baselines.
- [ ] **Step 2: The whole repo gate battery** (`npm run check`, `npm test`, and every
  `check:*` the touched surfaces own).
- [ ] **Step 3: `code-simplifier` over the pass's diff**, apply what survives review.
- [ ] **Step 4: Reviewer fan-out** (`svelte-reviewer`, `daisyui-a11y-reviewer` at minimum;
  both now on Opus 5), triage findings, fix what's real.
- [ ] **Step 5: Pass-end ritual per `cairn-pass`:** CHANGELOG finalized under
  `## Unreleased`, STATUS.md updated (Pass 1 landed; next = Pass 2, enforcement), plan
  post-mortem appended to this file, merge the worktree to `main`. No version bump, no
  publish (the initiative cuts once at its boundary, spec section 10).
