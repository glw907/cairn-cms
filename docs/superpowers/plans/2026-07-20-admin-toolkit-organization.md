# The admin-toolkit organization pass (harvest wave 1 + engine adoption)

Spec: `docs/superpowers/specs/2026-07-20-admin-toolkit-organization-design.md` (approved
2026-07-20). Scope in one line: establish `@glw907/cairn-cms/admin-toolkit`, graduate the
ASC-born components into it, and re-express cairn's own admin screens on the toolkit so no
parallel bespoke implementation survives where a component fits.

Branch: an `admin-toolkit` worktree off `main`. Method: `cairn-implementer` per task,
test-first, full gate per task; the main loop reviews each diff, holds the design rulings
(the adoption map, the PageHeader recipe), and runs the close-out ritual (`cairn-pass`).
After creating the worktree, run a from-scratch `npm install` in `examples/showcase` before
trusting any local e2e (the symlink gotcha in `CLAUDE.md`).

The source contracts live in aksailingclub-org at `src/admin-club/toolkit/` with their
contract docs in that directory's `README.md`. Graduation is re-expression, not file copy:
the contracts and test cases are the seed; cairn's standards (TSDoc/`@component`, the test
projects, the five-viewport bar, `check:invisible-craft`, the Warm Stone idiom in
`docs/internal/admin-design-system.md`) govern the result. The ASC repo is read-only from
this pass.

## Verified baseline (2026-07-20, main at `2d88d229`)

- `package.json` `exports` carries per-subpath triples (`types` / `svelte` / `default`
  pointing into `dist/<subpath>/`); there is no `publishConfig`. The `./admin-toolkit`
  entry follows the same triple. `check:package` (publint + attw + the files check) is the
  live verifier for the wiring.
- v0.88.3's `src/lib/components/admin-css-safelist.ts` already compiles the blessed daisy
  set (the `status-*` family, `join-item`, `table-zebra`, ...) into `cairn-admin.css`, so
  every class the ASC components lean on is available in the engine's admin sheet.
- Test projects: `src/tests/unit/` (node), `src/tests/integration/` (workerd),
  `src/tests/component/` (real browser). ASC's toolkit tests
  (`aksailingclub-org/src/tests/toolkit-*.test.ts`) are the porting seed.
- The audit inventory for the sweep is finding 11 in
  `docs/internal/2026-07-15-admin-ux-audit.md` (page-header idiom five ways, counts three
  ways, search placement two).

## Tasks

### T1 — The adoption survey and map (main loop, with a dispatched read)

Walk every engine admin screen against the finding-11 inventory and the five ASC contracts,
and record the adoption map as an appendix to this plan file. The map states, per screen:
which toolkit components it adopts, which bespoke markup dies, where PageHeader lands, and
what stays bespoke (with the reason). It also rules: whether any engine screen pulls
ExpandableRow (if none does, it stays ASC-local this wave, per the spec), whether EmptyState
or a count device earn minting (only on demonstrated repetition), and the screen groupings
for T6/T7 (the groupings below are the draft; the map may redraw them).

Candidate screens (from `src/lib/components/`): `ConceptList.svelte`,
`ManageEditors.svelte`, `VocabularyAdmin.svelte`, `OfficeList.svelte`,
`CairnMediaLibrary.svelte`, `HelpHome.svelte`, `WelcomeView.svelte`, plus the header bands
of the remaining admin views the finding-11 inventory names. Dispatch the screen reading
(Explore, haiku); the map itself is a main-loop ruling. No code changes in this task; commit
the map with the plan file.

### T2 — Toolkit skeleton, `format.ts`, and the subpath surface

Create `src/lib/admin-toolkit/` with `index.ts` and `format.ts` (the four formatters:
`formatMoney`, `formatCivilDate`, `formatTimestamp`, `ageFromBirthdate`), and wire the
`./admin-toolkit` export. Constraints and acceptance:

- Contract adjustment at graduation: `formatTimestamp` must not default to
  `America/Anchorage`. Default `options.timeZone` to `'UTC'` and document that a site passes
  its zone; keep the other contracts as the ASC README states them (locale/currency options
  with neutral defaults, `formatCivilDate`'s local-midnight parse and `'Not yet'` fallback,
  `ageFromBirthdate`'s null on unparseable input).
- Tests first in `src/tests/unit/admin-toolkit-format.test.ts`, seeded from ASC's
  `toolkit-format.test.ts` cases plus the changed-default case (a SQLite datetime with no
  zone option renders as UTC).
- `package.json` gains the `./admin-toolkit` triple pointing at
  `dist/admin-toolkit/index.*`. Verify the packaging mechanics live at this first touch
  (`npm run check:package` green), per the Plan 07 lesson about locked build assumptions.
- Start `docs/reference/admin-toolkit.md` with the page frame and the `format.ts` entries.
  Each entry follows the contract-doc convention this pass imports from the ASC README: the
  contract, then (for components, in later tasks) the daisy assembly and the **exact class
  inventory**. Wire the page into the reference arm's index (`check:arm-indexes`).
- Gates for this task: `check:package`, `check:reference`, `check:reference:signatures`,
  `check:surface -- --update` with the regenerated `docs/internal/api-surface.md`
  committed, plus the standard full gate.

### T3 — Graduate StatusChip and Pagination

Re-express `StatusChip.svelte` and `Pagination.svelte` in `src/lib/admin-toolkit/`, exported
from the barrel. Constraints and acceptance:

- Contracts as the ASC README states them: StatusChip's five-tone vocabulary with the
  `status-<tone>` dot carrying color (never the badge fill), the exported
  `STATUS_CHIP_DOT_CLASS` map, the `legend` hook; Pagination's controlled `page`/`pageCount`/
  `onPageChange` with the optional item-range line, `computePageWindow` and
  `computeItemRange` exported from module context.
- The compiled-CSS rule verbatim: daisy component classes only from the blessed set;
  spacing, truncation, and wrapper layout in each component's own scoped `<style>`.
- Tests first: pure functions in `src/tests/unit/`, rendering in `src/tests/component/`
  (seed: ASC's `toolkit-components.test.ts`), following the component project's existing
  file conventions.
- Reference entries with daisy assembly and exact class inventory; both components meet the
  five-viewport bar and `check:invisible-craft`.

### T4 — Graduate AdminTable and ListToolbar (and ExpandableRow only if T1 pulled it)

Same discipline as T3. Constraints and acceptance:

- AdminTable: `density`/`zebra` (zebra defaults false), `header`/`children` snippets so the
  component owns chrome and never a row shape, `rowCount`/`empty` snippet, the
  `white-space: nowrap` cell contract with caller-side truncation, the wrapper's
  `overflow-x` fallback.
- ListToolbar: the fully-controlled convention throughout (`search`/`onSearch`, the
  `filters` array with promotion and the overflow disclosure, one `primaryAction` maximum),
  `computeAppliedFilters` and `computeCountLine` exported and unit-tested, the
  count-line-always-states-its-scope contract, pills in `badge-neutral` only.
- If T1 pulled ExpandableRow: graduate it with its controlled `expanded`/`onToggle`
  contract, `aria-expanded` on the trigger button only, panel-not-summary for per-row
  actions. If not pulled: no ExpandableRow files in this pass, and the reference page does
  not mention it.
- Tests as in T3 (seeds: `toolkit-table.test.ts`, `toolkit-toolbar.test.ts`); reference
  entries with class inventories; five-viewport + invisible-craft.

### T5 — Mint PageHeader (cairn-born)

The finding-11 convergence component: the canonical admin page-header recipe as a toolkit
component, so header convergence is structural. Sequence inside the task: the main loop
rules the canonical recipe first (from the audit's five-way inventory and
`admin-design-system.md`'s eyebrow-group and page-title devices, honoring the emphasis
ladder), records the ruling in the adoption-map appendix, then dispatches the build.
Constraints and acceptance:

- The contract covers what the five-way spread actually varies: title, the eyebrow line,
  the count device (one way, not three), and the action slot; search placement is ruled
  once (with ListToolbar owning search where a toolbar exists). Props stay data-plus-slots;
  no domain knowledge.
- Same bars as T3/T4: scoped-CSS rule, tests first (unit for any pure helper, component for
  rendering), reference entry with class inventory, five-viewport, invisible-craft.
- If T1 minted EmptyState or a count device, they ride this task under the same bars;
  otherwise they do not exist.

### T6 — Adoption sweep, group A (the heavy list screens)

Per the T1 map (draft grouping: `ConceptList.svelte` and `CairnMediaLibrary.svelte`).
Re-express each screen on the toolkit: PageHeader for the header band, ListToolbar for
search/filter/action, AdminTable/Pagination/StatusChip/formatters where the map says they
fit. Constraints and acceptance:

- Behavior-preserving: every existing interaction (search, filters, selection, dialogs,
  keyboard paths) keeps working; existing component/e2e tests stay green, adjusted only
  where they assert on markup the sweep deliberately changed.
- The bespoke parallel markup dies in the same diff; no screen keeps a hand-rolled copy of
  a device the toolkit now owns.
- Where a screen's shipped polish exceeds the component's finish, move the polish INTO the
  component (a contract-compatible refinement) rather than keeping a local fork; note each
  such absorption in the task report.
- A component-level or e2e assertion per screen that the header/toolbar renders through the
  toolkit (one focused test per screen, not a suite).

### T7 — Adoption sweep, group B (the remaining screens and the header convergence)

Per the T1 map (draft grouping: `ManageEditors.svelte`, `VocabularyAdmin.svelte`,
`OfficeList.svelte`, plus PageHeader convergence across the remaining admin views the map
names). Same constraints as T6. Acceptance additionally: after this task, the finding-11
spread is closed — one header idiom, one count device, one search placement rule across the
engine's admin surface — and `grep` for the dead bespoke patterns named in the map comes
back empty.

### T8 — The daisy absorption ritual and the docs close

- Dependabot watches `daisyui`: create or extend `.github/dependabot.yml` (npm ecosystem,
  the `daisyui` dependency; keep the config minimal and stated loudly in the file).
- Document the ritual in `docs/internal/daisy-absorption-ritual.md`: per daisy release,
  read the changelog, rebuild, verify every blessed-set class still compiles into
  `cairn-admin.css`, run the visual suite, note new daisy components worth adopting; the
  reference page's per-component class inventories are the grep surface for blast radius.
  Link it from `admin-design-system.md`. State there that the safelist remains the
  compile-side consumer contract: engine adoption referencing a class organically never
  justifies pruning it from the blessed set.
- `admin-design-system.md`: every component recipe the toolkit now owns points at the
  component (import and use), keeping the recipe prose only for what remains hand-written.
- Drift hunt: grep `docs/` and `README.md` for recipes, screens, and idioms this pass
  changed; repoint every hit (`check:docs` catches links, not stale prose, so this is a
  read).
- CHANGELOG under `## Unreleased`: the new `admin-toolkit` surface (no `Consumers must:`)
  and a behavior-change note for the visible header convergence; mirror in
  `docs/guides/upgrade-cairn.md`.
- ROADMAP: rewrite the "admin toolkit" entry to reflect what shipped and what the next
  wave holds (ASC's import swap, ExpandableRow's Classes-pass shakedown if held); file any
  new friction into the log.

## Close-out (the `cairn-pass` ritual, in full)

Simplifier over the pass's code; `npm run check` 0/0, `npm test` exit 0, `check:comments`;
the doc gates by name (`check:reference`, `check:reference:signatures`, `check:package`,
`check:docs`, `check:arm-indexes`) and `check:surface`; a from-scratch showcase consumer
build or a CI e2e run before calling it releasable; the live admin smoke per
`docs/internal/admin-smoke-test.md` (the whole pass is `/admin` surface); reviewer fan-out:
`daisyui-a11y-reviewer` and `svelte-reviewer` (add `web-auth-security-reviewer` only if any
auth-adjacent file moved, none expected); visual baselines regenerate on CI
(`gh workflow run e2e.yml --ref <branch> -f update_snapshots=true`, then approve the
re-triggered runs); the main loop reads full-page admin renders, and Geoff gets the
header-convergence before/after renders before merge. Then PR, CI green, merge, STATUS
update on `main`.

## Release

The pass ends with a cut via the `cairn-release` skill: a 0.x **minor** (the new
`admin-toolkit` public surface meets the sizing rule's "new subsystem or public surface"
bar, so no size-mismatch confirmation is expected this time). Verify the number free with
`npm view @glw907/cairn-cms versions --json` at the cut; the release body rolls the
changelog window since the last published tag. ASC's swap to the subpath imports rides
ASC's next screen pass, in its own sessions.

## Appendix: the adoption map (T1 output)

Recorded by T1 before any graduation task runs.
