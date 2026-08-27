# Toolkit Seams Pass (ASC harvest absorption, behavior half)

> **For agentic workers:** execute via `~/.claude/workflows/pass-execute.js` (six tasks;
> Task 2 must land before Task 6, both touch `cairn-admin.css`; the other four are independent
> of everything). `cairn-implementer` per task, `diff-reviewer` per diff, the full gate inside
> the chain. Steps use checkbox (`- [ ]`) syntax. Task 1 is the one candidate for a
> per-dispatch `model: opus` upshift (it shapes a new public seam); every other task is fully
> specified here and runs on the Sonnet default.

**Token ceiling:** 1.8M. **Checkpoint interval:** four tasks. **Worktree:** `toolkit-seams` off
the current `main` tip (the earlier `0d500e4f` pin predates the verdict-folding commits).

**Status: REVISED 2026-08-26, awaiting approval.** The `engine-triage` re-review ran with the
any-site audit's rulings in hand (`docs/internal/engine-rulings.md`, audit section;
`docs/internal/record/2026-08-26-any-site-audit.md`); its verdicts are recorded verbatim at the
end of this file ("Re-review verdicts") and are now folded into the task bodies. The former
Task 7 (`isUniqueViolation`) is deferred per its verdict; its reopen triggers are recorded
below and go into the rulings ledger at pass close.

**Goal:** absorb the behavior half of the 2026-08-26 ASC harvest triage
(`docs/internal/record/2026-08-26-asc-harvest-triage.md`): six engine surfaces a consuming site
cannot legally reach or patch (a seventh, `isUniqueViolation`, deferred on membership), each
verified against `main` on 2026-08-26. Every item is a generic mechanic any cairn site hits;
nothing here encodes ASC domain vocabulary, and where ASC supplies measured evidence (Task 2)
the engine re-derives the values against its own themes rather than copying the site's tuning.

**Standing constraints (every task):** test-first against the suite; the full gate is
`npm run check` 0/0 plus `npm test` exit 0 plus the CI-derived gate list (re-derive from
`.github/workflows/` before the first commit, never from memory); `check:surface -- --update` on
any exported-type change; every public-API change updates its `docs/reference/` page in the same
task (`check:reference` enforces); every task adds its `CHANGELOG.md` line under `## Unreleased`,
with a `Consumers must:` line where consumer action is needed. A task that executes an open
audit ruling closes its ledger entry in `docs/internal/engine-rulings.md` in the same task and
states its position on the remediation's single `Consumers must:` window (ROADMAP, "The
any-site audit remediation"). No version bump, no publish; the pass holds unpublished. Admin
visual work follows `docs/internal/admin-design-system.md`.

---

## Task 1: Export the media picker seam

**Files:** `src/lib/admin-toolkit/index.ts`, `src/lib/components/MediaPicker.svelte`,
`src/lib/components/MediaHeroField.svelte`, `src/lib/media/library-entry.ts`,
`src/lib/media/index.ts`, `src/lib/sveltekit/index.ts` (drop the re-export),
`docs/reference/admin-toolkit.md`, `docs/reference/media.md`,
`docs/internal/engine-rulings.md`.

**Evidence (corrected by the re-review):** `MediaPicker` exists unexported. The
`MediaLibraryEntry` TYPE is already public from `/sveltekit` (`content-routes-media.ts:42`,
`sveltekit/index.ts:62`, `api-surface.md:601`); only the FUNCTION `mediaLibraryEntry` is
internal, and the internal-status comment at `library-entry.ts:11` is stale on the type half.
ASC rebuilt the hero-image field (`HeroImageField.svelte` over `readCommittedManifest`)
because no legal import path exists; the unexported component that evidence points at is
`MediaHeroField.svelte`.

- [ ] Argue the reopen, in the ledger: `audit-sveltekit-medialibraryentry` ruled the
      `/sveltekit` `MediaLibraryEntry` export RETIRE. This task reopens it on the ground the
      audit could not see: exporting `MediaPicker` makes the type a prop-signature necessity
      (`MediaPicker.svelte:52`), the same ground as `ItemLabel`'s keep. Close the entry with
      that argument and the new canonical home.
- [ ] One canonical home: `./media` publishes `mediaLibraryEntry` (function),
      `MediaLibraryEntry` (type), and `MediaLibrary`; the SAME commit drops the `/sveltekit`
      re-export (coherence C1: one subpath, stated home). Update the stale comment at
      `library-entry.ts:11`. CHANGELOG carries `Consumers must: import MediaLibraryEntry from
      '@glw907/cairn-cms/media' (moved from /sveltekit).`, riding the open audit-remediation
      window.
- [ ] `MediaPicker` (two node-safe props) exports from `./admin-toolkit`, the barrel whose
      charter covers reusable building blocks; the `/components` barrel comment forbidding
      them stays intact. `MediaInsertPopover` stays internal, DEFERRED until the
      `MarkdownEditor` seam collapse (its props are CodeMirror-shaped `EditPage` wiring; the
      `MarkdownEditor` reshape rules the opposite direction on the same coupling).
- [ ] `MediaHeroField` is decided on its own merits inside this task: run the charter's
      premise check (cairn's job, leanest form). Export it beside `MediaPicker` if it clears;
      otherwise record the decline with reason in the task report and the ledger.
- [ ] A documented path exists for a site's own `/admin` route to project the committed media
      library into picker entries. First locate how cairn's own admin media route builds that
      projection (start at `CairnMediaLibrary.svelte`'s server load and
      `src/lib/media/manifest.ts`); export the smallest helper that covers it rather than a new
      abstraction. If the existing load function already fits, exporting and documenting it is
      the whole deliverable.
- [ ] Each newly public symbol gets a TSDoc contract comment and a reference entry;
      `check:surface -- --update` records the widened surface.
- [ ] A component test imports `MediaPicker` through the package subpath (the showcase or the
      component-test harness) and renders it against a manifest fixture, proving the export
      path works from a consumer's position, not just in-tree.
- [ ] Acceptance: full gate green; `check:reference` and `check:package` pass; CHANGELOG entry
      notes the new exports (additive except the type move, which carries the `Consumers
      must:` line above); ledger entry closed.

## Task 2: StatusChip register grammar, second generation

**Runs before Task 6 (both touch `cairn-admin.css`).**

**Files:** `src/lib/admin-toolkit/StatusChip.svelte`, its component tests,
`src/lib/components/cairn-admin.css` (the pinned unlayered `.cairn-chip-*` rules) and the
pinned-rule gate that inventories the sheet, the chip probe infrastructure
(`docs/internal/probes/2026-07-28-chip-registers` is the precedent),
`docs/reference/admin-toolkit.md`, `docs/internal/engine-rulings.md`, in-tree consumers
(`ConceptList.svelte`, `CairnMediaLibrary.svelte`, any other `StatusChip` call site `grep`
finds).

**Evidence:** the 2026-08-24 owner probe (ASC `docs/design-benchmark/decisions.md`) ruled the
6px tone dot illegible toolkit-wide; ASC's three-register grammar survived three consumer screens
unmodified with 26 canvas-readback measurements. The engine currently renders the dot
(`StatusChip.svelte:106`) and ships `bounded`/`quiet` only. The packaged sheet is a second
public surface: `.cairn-chip-bounded`/`.cairn-chip-quiet` are pinned unlayered rules serving
hand-composed chips, and the safelist calls the sheet inventory a de facto public API.

The ratified grammar, re-derived for the engine (generic; the numbers below are ASC's measured
starting points, and the engine tunes its own final percentages against its own admin themes):

- Three registers: `quiet` (neutral tint, settled state that recedes), `warning`
  (warning-toned tint, state needing attention), `outline` (hairline border, transparent fill,
  transient or reversible absence; the successor of `bounded`).
- The tone dot retires across all registers; the tone's color rides the chip ground (tints) or
  ink, never a dot. All registers normalize to `font-weight: 400`.
- Tinted grounds hold a 1.16–1.47:1 contrast band against the row ground, tuned per theme and
  per ground (plain row and zebra stripe; no single percentage lands all combinations, ASC's
  measured finding: their tuned values were quiet 11%/8% light/dark and warning 40%/10% mixed
  into the row ground in oklab).
- The outline border holds a >= 3:1 non-text floor:
  `color-mix(in oklab, var(--color-base-content) 55%, transparent)` cleared it in both themes.
- Warning ink carries the tone and clears >= 4.5:1 against its own chip ground per theme (ASC
  measured 5.323:1 light at a 40% warning mix, 8.342:1 dark at 70%).
- Measurement method is canvas readback (paint ground then target into a 1x1 canvas,
  `getImageData`), because `getComputedStyle` returns unresolved `oklch()`/`color-mix()`.

- [ ] Settle `tone`'s disposition first (`StatusChipTone` is a KEEP; the dot was its only
      rendering for four of five tones, so removing the dot without this step leaves tone
      visually inert). The disposition: `tone` survives and renders through the chip ground
      and ink, never a dot; in the tinted registers the ground tint takes the tone's hue at
      the register's contrast band, and in `outline` the ink carries it. Record the per-tone
      mapping in the reference page alongside the tuned values.
- [ ] `register` becomes `'quiet' | 'warning' | 'outline'` with default `'quiet'` (the current
      default at `StatusChip.svelte:96` is `'bounded'`, which this task removes); `bounded`,
      the dot, and the `STATUS_CHIP_DOT_CLASS` export (whose only stated purpose was the dot's
      legend hook) are removed. The sheet's `.cairn-chip-bounded` renames to
      `.cairn-chip-outline` (no alias; the rename rides the open audit-remediation window) and
      the pinned-rule inventory updates. `check:surface -- --update`; CHANGELOG carries
      `Consumers must: replace register="bounded" with register="outline" and the sheet class
      .cairn-chip-bounded with .cairn-chip-outline; the tone dot is gone, tones now read
      through the register grounds and ink.`
- [ ] Truncation self-defense: when the label ellipsizes and no `legend` is passed, `title`
      defaults to the label (today `title` renders only from `legend`).
- [ ] A standing verification script or browser test measures every register against both admin
      themes and both grounds (plain, zebra) by canvas readback, asserting the band, the border
      floor, and the warning-ink floor. Falsifiability is part of acceptance: break one tuned
      value and show the check reds, then restore it.
- [ ] In-tree consumers compile and render; the pass-end visual read (cairn-pass ritual) covers
      a chip-bearing screen in both themes.
- [ ] Close the two open audit ledger entries this task executes (the StatusChip
      register/dot entry and the chip sheet-class entry in the ledger's audit section), and
      state the task's position on the remediation window.
- [ ] Acceptance: full gate green; reference page documents the three registers, the tone
      mapping, and the truncation default; the probe doc records the engine's own tuned
      values.

## Task 3: ExpandableRow contract fixes

**Files:** `src/lib/admin-toolkit/ExpandableRow.svelte`, its component tests,
`docs/reference/admin-toolkit.md`.

**Evidence:** the trigger is the only way to open a row at 390; ASC's harvest claims it sits
near 24px. The engine's own ruled floor is 24x24 (Task 16b ruling 1, pinned in
`rulings.touch-targets.test.ts`; the `btn-xs` 24px case must pass), NOT ASC's 44px. The
"summary cells stay non-interactive" contract (`ExpandableRow.svelte:20`) forces consumers into
`svelte-ignore`'d `stopPropagation` wrappers for any inline-editable cell.

- [ ] Trigger target, measure-first: render the trigger in the real admin sheet at 390,
      measure its rendered rect, and record the number in the task report. Act only if it
      falls under the engine's 24x24 floor; if it clears, report and change nothing (the
      decline-with-reason posture Task 6's focus-ring bullet models). If a fix is needed, note
      the checkbox hit-slop idiom (`cairn-admin.css:600`) does not transplant into a
      `width:1px; position:sticky` cell without its own measurement; any fix is re-measured
      after.
- [ ] An interactive-cell escape: a documented `data-cairn-inert-cell` attribute (NOT
      `data-cairn-row-inert`, which collides with `RepeatableField`'s `data-cairn-row*`
      automation-hook family); the row's click handler ignores any event whose target sits
      inside an element carrying it (`closest()`), so a consumer wraps an interactive cell
      instead of hand-rolling `stopPropagation`. The guard applies to the row's `onclick`
      only; the trigger activates through the native button and carries no keydown handler by
      documented design, and that stays unchanged. Component tests: a click inside an
      inert-marked cell does not toggle; a click on an ordinary summary cell still does; the
      trigger's keyboard behavior is unchanged.
- [ ] Explicitly out of scope (standing defer, `expandablerow-colspan`): a `colspan`
      full-width summary variant.
- [ ] Acceptance: full gate green; reference page documents the attribute and the measured
      trigger result.

## Task 4: ToolbarDisclosure

**Files:** new `src/lib/admin-toolkit/ToolbarDisclosure.svelte`,
`src/lib/admin-toolkit/ListToolbar.svelte`, `src/lib/admin-toolkit/index.ts`, component tests,
`docs/reference/admin-toolkit.md`, `docs/internal/engine-rulings.md`.

**Evidence:** `ListToolbar`'s overflow menu carries the four disclosure mechanics
(`aria-expanded`, `aria-controls`, focus into the panel, Escape with focus return); the one
consumer that hand-copied the pattern missed all four on its first pass. Membership is
settled: `audit-admin-listtoolbar` is a RESHAPE whose assigned shape is this task; cite and
close it.

- [ ] Extract the trigger-plus-panel disclosure into `ToolbarDisclosure`, exported from
      `./admin-toolkit`: trigger button with `aria-expanded`/`aria-controls`, panel with focus
      management, Escape closes and returns focus to the trigger, and pointerdown outside
      closes WITHOUT moving focus (both halves tested).
- [ ] The extraction covers both duplications of the four mechanics: the overflow menu AND
      each `'menu'` facet re-implement on the new component. Folding the facets is the
      extraction's proof that the component generalizes; the duplicate code deletes.
- [ ] The Svelte-scoped `:focus-within` neutralizer at `ListToolbar.svelte:684-695` MOVES with
      the markup it serves (per-component scoping orphans it silently otherwise, reopening the
      bug it closed). Acceptance for this cannot run on state alone, because component tests
      do not load the compiled daisyUI sheet: render with the packaged admin sheet loaded and
      assert the neutralized `:focus-within` outcome, or cover it as an explicit named check
      in the pass-end rendered read.
- [ ] Component tests assert each of the four mechanics on `ToolbarDisclosure` directly, plus
      the outside-pointerdown focus half.
- [ ] Acceptance: full gate green; `check:surface -- --update`; reference entry; CHANGELOG
      (additive); `audit-admin-listtoolbar` closed in the ledger.

## Task 5: CsrfField survives the enhance reset

**Files:** `src/lib/components/CsrfField.svelte`, a component or integration test beside the
existing guard tests, `docs/reference/components.md`.

**Evidence:** the field renders an unbound hidden input; a successful `use:enhance` submit calls
the native form reset, Svelte 5 sets `value` as a property so `defaultValue` is empty, the field
blanks, and the next submit 403s against cairn's own guard. One consumer hit it in July and again
in August.

- [ ] Failing test first: render the field inside a form, set its token, call
      `HTMLFormElement.reset()`, assert the input's value survives. Confirm it fails against
      today's component.
- [ ] Fix inside the component; no consumer-side requirement. Prefer Svelte's own
      `defaultValue` mirror (`set_default_value`) over a `reset` listener, which races
      Svelte's `FORM_RESET_HANDLER`. `reset: false` remains a documented good practice for
      *other* fields, but the CSRF field no longer depends on it.
- [ ] Acceptance: the new test passes; the guard's existing token tests are untouched and green;
      full gate green; components reference notes the guarantee.

## Task 6: Admin sheet fixes (checkbox edge, status text vocabulary, opt-in list reset, focus ring)

**Runs after Task 2 (both touch `cairn-admin.css`).**

**Files:** `src/lib/components/cairn-admin.css`, `docs/reference/admin-grammar-tokens.md`,
`docs/internal/admin-design-system.md` (recipes), a measured verification (extend the audit's
rendered checks or a script in the chip-verification mold from Task 2).

**Evidence:** unchecked `.checkbox` edge measured 1.50:1 light / 1.75:1 dark against the 3:1
WCAG 1.4.11 floor; `text-success`/`text-warning` compile to nothing in admin scope and no
non-error status tint exists (verified: no `text-success` in the sheet; `--cairn-warning-ink`
exists and has no success sibling, so "add if absent" resolves to "add"); bare `<ul>` inside
toolkit containers keeps the UA 40px gutter, and the standing ruling at `cairn-admin.css:468`
forbids a blanket `list-style` reset; the harvest reports field `:focus` reading a near-black
`--input-color` ring while `.btn` gets a primary-toned `:focus-visible`.

- [ ] Unchecked `.checkbox` (and any sibling control with the same faint-edge construction) gets
      an explicit edge meeting >= 3:1 in both admin themes; verified by measurement, not by eye.
- [ ] The admin sheet gains success- and warning-toned text idioms reading the existing ink
      tokens (`--cairn-warning-ink` plus the new success sibling), documented in
      `admin-grammar-tokens.md` so screens stop reaching for uncompiled Tailwind utilities.
- [ ] List reset by explicit opt-in, never by ancestry: a new `.toolkit-list` class sets
      `padding-inline-start: 0` only, never `list-style: none`. A bare `ul`/`ol` selector
      under `.toolkit-*` ancestry is rejected (it re-adopts the shape the standing ruling at
      `cairn-admin.css:465-468` refused, and the ancestry claim is falsifiable by consumers);
      extend the `:468` ruling comment to record the opt-in form. In-tree toolkit screens
      adopt the class where they carry bare lists.
- [ ] Focus-ring split: first verify whether the packaged sheet (not a consumer override) sets
      `--input-color` to `base-content` on field focus while buttons read a primary-toned ring.
      If engine-owned, both paths read one focus token; if it traces to DaisyUI defaults outside
      the sheet's control, override the token in the sheet and record why. If the split cannot be
      reproduced in-tree, report that instead of changing anything.
- [ ] Acceptance: full gate green; measured contrast numbers recorded in the task report; the
      admin design system doc carries the new recipes.

## Deferred: `isUniqueViolation` in `/cloudflare` (former Task 7)

**Verdict: REVISE to DEFER; not executed this pass.** The membership case does not clear the
gate: the Cloudflare-specific content is the workerd cause-chain nesting alone; four divergent
copies in ONE consumer is the `site-today-export` decline's shape; the engine itself never
handles `UNIQUE constraint failed` (`grep -rn` returns nothing), so this would ship as a fifth
C13 engine-unused export. The SHAPE is right (type predicate, `is` prefix,
structure-not-vocabulary) and ships unchanged if the item reopens.

**Reopens on:** a second unrelated consumer hitting the cause-chain nesting, or the cheaper
decisive check: an engine-side D1 path that can raise a UNIQUE violation and mishandles it
today (candidates: the `AUTH_DB` editor/invite inserts, `createD1AuditSink`); if one
qualifies, the engine becomes its own first consumer and the item clears both the gate and C13
in one move. The pass close records this defer and its triggers in
`docs/internal/engine-rulings.md`.

---

## Self-review notes

Spec coverage: the behavior survivors in the triage record map onto Tasks 1–6 (survivor 8, the
list reset, and survivor 10, the focus ring, ride Task 6 with survivors 6 and 7, which share
the same file; survivor 9's `isUniqueViolation` defers per the re-review). No task references
a symbol another task defines. Tasks 2 and 6 share `cairn-admin.css` and serialize (2 first);
the other four are independent. Every fork the re-review left open is locked in the body:
`MediaPicker` publishes from `./admin-toolkit`; the chip class renames with no alias; the
`'menu'` facets fold into `ToolbarDisclosure`; the list reset is the opt-in `.toolkit-list`.

---

## Re-review verdicts (`engine-triage`, 2026-08-26, against the any-site audit rulings)

Recorded verbatim from the triage dispatch; folded into the task bodies 2026-08-26 (this
section is the revision record).

### Task 1 (media picker seam): REVISE, four changes

1. The stated evidence is falsified for half the item: `MediaLibraryEntry` the TYPE is
   already public (`content-routes-media.ts:42`, `sveltekit/index.ts:62`,
   `api-surface.md:601`); only the function `mediaLibraryEntry` is internal. The
   `library-entry.ts:11` comment is stale.
2. That public export is ruled RETIRE (`audit-sveltekit-medialibraryentry`), and the task
   would re-publish it under a second name. The reopen must be argued, not assumed; the
   good argument the audit could not see is that exporting `MediaPicker` makes the type a
   prop-signature necessity (`MediaPicker.svelte:52`), the same ground as `ItemLabel`'s
   keep. Write it into the task, name the ledger entry it reopens, and publish from ONE
   subpath.
3. Coherence C1's ordering warning applies: sequence behind the canonical-home
   ratification, or state the chosen canonical home and drop the `/sveltekit` publication
   in the same commit.
4. `MediaInsertPopover` is the wrong component to export (its props are CodeMirror-shaped
   EditPage wiring; the `MarkdownEditor` reshape rules the opposite direction on the same
   coupling), and the component the evidence actually points at, the unexported
   `MediaHeroField.svelte`, is never named. Export `MediaPicker` (two node-safe props),
   decide `MediaHeroField` on its own merits, defer `MediaInsertPopover` until the editor
   seam is collapsed. Also: the `/components` barrel comment forbids reusable building
   blocks; either the picker goes to `/admin-toolkit` or the comment is amended
   deliberately.

### Task 2 (StatusChip second-generation grammar): REVISE, four changes

The constraint-3 handling (re-tune ASC's measured values against the engine's own themes)
stands and should be preserved verbatim. Changes: (1) name the `tone` prop's disposition;
removing the dot removes tone's only rendering for four of five tones, and `StatusChipTone`
is a KEEP. (2) Specify the new default register (`StatusChip.svelte:96` defaults
`'bounded'`, which the task removes). (3) The packaged sheet is a second public surface:
`.cairn-chip-bounded`/`.cairn-chip-quiet` are pinned unlayered rules serving hand-composed
chips, and the safelist calls the sheet inventory a de facto public API; add
`cairn-admin.css` and the pinned-rule gate to the file list and extend `Consumers must:` to
the class rename or ship an alias. (4) That puts Tasks 2 and 6 in the same file: serialize
them or move the chip-class rename into Task 6. Task 2 executes two open audit rulings;
close both ledger entries or run inside the remediation window.

### Task 3 (ExpandableRow contract fixes): REVISE; DROP the 44px target as written

The 44px floor is ASC's number and contradicts the engine's own ruling: the floor is 24x24
(Task 16b ruling 1, pinned in `rulings.touch-targets.test.ts`; the `btn-xs` 24px case must
pass). The acceptance criterion is unfalsifiable (the touch-targets rule passes today).
Rewrite to: measure the trigger's rendered rect at 390 in the real sheet, record the
number, act only if under 24, and report-and-change-nothing if it clears (Task 6's
focus-ring posture). Further: "both density tiers" does not exist on ExpandableRow (no
`density` prop); the "click and keydown handlers" claim names a keydown handler that does
not exist (native button activation, by documented design; the inert guard applies to the
row's `onclick` only); `data-cairn-row-inert` collides with `RepeatableField`'s
`data-cairn-row*` automation-hook family, rename for the structure it marks; the hit-slop
idiom does not transplant into a `width:1px; position:sticky` cell without measurement. The
escape-hatch half stands; keeping `expandablerow-colspan` out of scope correctly cites the
standing defer.

### Task 4 (ToolbarDisclosure): REVISE, three changes

Membership is settled: `audit-admin-listtoolbar` is a RESHAPE whose assigned shape is this
task verbatim; cite and close it. Changes: (1) "existing tests still pass" is falsely
load-bearing: the Svelte-scoped `:focus-within` neutralizer at `ListToolbar.svelte:684-695`
orphans when the markup moves (per-component scoping), silently reopening the bug it
closed, and component tests cannot see it (they do not load the compiled daisyUI sheet).
Move the neutralizer with the markup and add an acceptance check that does not run on state
alone. (2) Write "pointerdown outside closes WITHOUT moving focus", both halves. (3) State
the extraction's scope: the same four mechanics exist twice (overflow + each `'menu'`
facet); fold the facets or state why they are out of scope.

### Task 5 (CsrfField enhance reset): STANDS

No change required. Implementation note: prefer Svelte's own `set_default_value` /
`defaultValue` mirror over a `reset` listener (a listener races Svelte's
`FORM_RESET_HANDLER`).

### Task 6 (admin sheet fixes): STANDS, one change

The checkbox edge and status-text vocabulary stand (verified: no `text-success` in the
sheet; `--cairn-warning-ink` exists, no success sibling, so "add if absent" resolves to
"add"). The scoped list reset REVISES: a bare `ul`/`ol` selector under `.toolkit-*`
ancestry re-adopts the shape the standing ruling rejected (`cairn-admin.css:465-468`), and
the ancestry claim is falsifiable by consumers; use an explicit opt-in class (extend
`.list` or add `.toolkit-list`). The focus-ring bullet's decline-with-reason wording is the
model; preserve verbatim. Carry the Task 2 file collision.

### Task 7 (`isUniqueViolation` in `/cloudflare`): REVISE to DEFER

The membership case does not clear the gate: the Cloudflare-specific content is the
workerd cause-chain nesting alone; four divergent copies in ONE consumer is the
`site-today-export` decline's shape (same date); the engine itself never handles `UNIQUE
constraint failed` (`grep -rn` returns nothing), so this ships as a fifth C13
engine-unused export, into the barrel whose engine-unused member was just reshaped. The
SHAPE is right (type predicate, `is` prefix, structure-not-vocabulary) and ships unchanged
if the item reopens. **Reopens on:** a second unrelated consumer hitting the cause-chain
nesting, or the cheaper decisive check: an engine-side D1 path that can raise a UNIQUE
violation and mishandles it today (candidates: the `AUTH_DB` editor/invite inserts,
`createD1AuditSink`); if one qualifies, the engine becomes its own first consumer and the
item clears both the gate and C13 in one move.
