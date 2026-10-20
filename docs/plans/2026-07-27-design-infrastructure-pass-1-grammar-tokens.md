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

---

## Post-mortem (2026-07-27)

**Landed.** All six tasks, in seven commits on `design-infra-pass-1-grammar-tokens`
(`ddf0afbd` through `6b3a5138`). Ten grammar tokens, ten role utilities, 25 migrated components,
the deviations ledger, and the public contract page.

### What was verified, with evidence

- **Pixel identity, the pass's contract.** The 18 committed `admin-visual` snapshots do not move.
  Checked twice, after the migration and again after the safelist change, 18 passed both times.
- **Full gate.** `npm run check` 0 errors 0 warnings, `npm test` 333 files / 3968 tests exit 0,
  plus `check:comments`, `check:custom-surface`, `check:admin-css-classes`, `check:invisible-craft`,
  `check:docs`, `check:arm-indexes`, `check:reference`, `check:reference:signatures`, `check:version`.
- **From-scratch consumer proof.** `rm -rf node_modules && npm ci` in `examples/showcase`, then the
  full e2e suite: 107 passed, 6 failed. The 6 are the `admin-visual` screens characterized below,
  and every behavioral spec passed.

### Six baselines were already stale, and CI was already red

6 of the 18 `admin-visual` baselines fail on unmodified `main`: the office shell, the media library,
and the media detail panel, each in both schemes. This pass first read that as a local-vs-CI renderer
difference. **That read was wrong.** CI's own `e2e` run on the merge commit failed the same six, and
`e2e` has been failing on `main` since 2026-07-24, through the `0.90.0` and `0.90.1` release cuts.

The cause: the baselines were last regenerated 2026-07-21 (`bff6ee46`), and the `0.90.0` pass
(ExpandableRow's graduation, the ListToolbar menu facet and its flex-row recomposition, StatusChip's
border, the OfficeList fixes) plus `0.90.1` (ListToolbar select sizing) changed exactly those screens
without regenerating. The local and CI renderers agree; the committed images are simply out of date.
One genuine local quirk is unrelated: the first run on a cold font cache fails everything on a small
height delta, so discard run one.

**This pass's own drift proof is unaffected**, because it never asserted against the stale set. It
captured a local reference from the starting commit and compared pre-migration to post-migration on
one renderer, which is the drift question. Zero drift, twice. What the stale set does mean is that
CI could not independently confirm it, so the pass leaned on the captured-reference comparison.

Owed, and deliberately not done here: regenerate the six via `e2e.yml`'s `update_snapshots` dispatch.
It blesses whatever currently renders, so the six new images want an eyes-on read against the
`0.90.x` design intent first. That is a decision about someone else's shipped work, not this pass's.

### Decisions locked

1. **Role utilities set one property.** A `type-*` utility sets `font-size` and nothing else. The
   plan asked for each role's full ruled recipe; the measurement refuted the premise. Of 66 markup
   sites at the 11px label size, 24 are uppercase and 14 carry the eyebrow's tracking, so a
   full-recipe `type-label` would have matched about 14 sites and stranded 52. Weight, case, and
   tracking stay component recipes; color stays palette.
2. **Only bracketed literals migrate.** `.text-sm` sets `font-size` AND `line-height`;
   `.text-[0.8125rem]` sets font-size only. A font-size-only utility is therefore pixel-identical to
   a bracketed site and would change a named step's line-height. The named steps wait on a
   line-height ruling, which is now the largest owed design decision.
3. **No indentation role.** One call site (`NavTree`'s `depth * 1.5rem`) is below the plan's
   two-site floor. It stays a ledger candidate.
4. **The public subpath carries fallbacks.** `src/lib/admin-toolkit` scoped styles reference a token
   with the measured literal as a fallback, because those components can mount outside the admin
   theme root; `src/lib/components` references the token bare. `Pagination.test.ts` found this by
   mounting the component bare and asserting a computed 13px, which fell back to 16px.
5. **Every role utility ships, used or not.** A Tailwind `@utility` is tree-shaken, so `type-title`
   and `gap-control` were absent from the compiled sheet while the reference page presented all ten
   as the supported authoring interface. A consumer's own Tailwind never sees the `@utility`
   definitions, only the compiled sheet, so an `@source inline(...)` safelist now carries all ten.

### What went wrong, and what caught it

Three defects reached a commit and were caught downstream rather than at authorship.

- **The tree-shaking gap** survived its own test, because the test scanned a probe fixture to force
  the utilities to compile. That proved the definitions were correct while saying nothing about what
  a consumer receives. The `code-simplifier` pass found it by compiling the sheet the way `package`
  does. The test now asserts against the plain build and the fixture is deleted. Lesson: a test that
  arranges for the thing it is testing to exist is not testing the shipping path.
- **Two counting errors in the deviations ledger**, both from raw substring counts. `text-base` swept
  in DaisyUI's `text-base-content` and `text-base-100` color utilities, overstating a 19-site
  population as 68, and a seventh-type-step ruling was being sized against it. The review gate caught
  both. The ledger now states its counting method.
- **Stale recipes in the design system.** The Recipes list still prescribed the bracketed literals
  this pass removed, ten lines above the new rule forbidding them. An agent adding a screen would
  have read the recipe and reintroduced the literal.

The pattern across all three: the mechanical gates were green throughout. Every one of these was
found by a fresh context reading for meaning.

### Method notes

- The measurement ran in the main loop rather than in the first implementer dispatch. Token values
  drive every downstream task, and a wrong value propagates into 25 files and a public contract page.
- The type migration ran as a deterministic substitution rather than an agent fan-out. It is a pure
  string replacement, verified by grep and the visual gate, so a fan-out would have spent tokens to
  reach the same bytes with more variance.
- The gap migration did NOT run that way, deliberately. `gap-2` at 8px and `gap-1` at 4px each serve
  both a named relationship and unrelated inline spacing, so only sites genuinely expressing the
  relationship moved: 27 label-to-control, three control gaps, five field groups, three sections. A
  blanket substitution would have been pixel-identical and semantically wrong.
- The review gate ran as a four-lens adversarial workflow: 21 findings, 9 surviving refutation,
  deduping to 5 real defects, all documentation. 12 findings were refuted, including two that
  restated a ratified decision and one that predicted a caller that does not exist.

### Carried forward

The line-height ruling for the type roles is the largest owed decision, and it gates `type-title`
plus 127 `text-sm` sites. The 12px step (120 sites with no role) is the largest open design question.
Both live in the deviations ledger, which is Pass 2's calibration input.

`check:custom-surface` does not see the new `:root` block, since it pins only rules anchored on
`[data-theme=`. `grammar-tokens.test.ts` is the compensating guard. Nothing enforces that
`GRAMMAR_TOKENS` matches the CSS in the reverse direction, so a token added to the CSS but not the
inventory would go unguarded; that is a cheap assertion for Pass 2 to add alongside its audit rule.
