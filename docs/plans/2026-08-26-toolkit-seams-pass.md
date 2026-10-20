# Toolkit Seams Pass (ASC harvest absorption, behavior half)

> **For agentic workers:** execute via `~/.claude/workflows/pass-execute.js` (six tasks,
> SERIAL, in the order 1, 3, 4, 5, 2, 6; the shared-file map is in the header notes below).
> `cairn-implementer` per task, `diff-reviewer` per diff, the full gate inside the chain.
> Steps use checkbox (`- [ ]`) syntax. Task 1 is the one candidate for a per-dispatch
> `model: opus` upshift (it shapes a new public seam); every other task is fully specified
> here and runs on the Sonnet default.

**Token ceiling:** 2.4M. **Checkpoint interval:** four tasks. **Worktree:** `toolkit-seams` off
the current `main` tip.

**Execution order and shared files (supersedes any independence claim):** run serially,
1, 3, 4, 5, 2, 6. Real collisions: `CHANGELOG.md` (every task appends), `docs/internal/engine-rulings.md`
(Tasks 1, 2, 4), `docs/reference/admin-toolkit.md` (Tasks 2, 3, 4), `src/lib/admin-toolkit/index.ts`
(Tasks 2 and 4: Task 4 adds an export, Task 2 removes `STATUS_CHIP_DOT_CLASS` at `index.ts:29`),
`docs/internal/admin-design-system.md` (Tasks 2 and 6). Task 2 runs late because it carries the
widest ripple; Task 6 last because it depends on Task 2's sheet state.

**Status: EXECUTED 2026-08-27; merged to `main`; post-mortem at the end of this file.** Two adversarial reviews ran:
the `engine-triage` re-review against the any-site audit rulings (verdicts appended verbatim,
"Re-review verdicts") and a second `engine-triage` pre-approval review of the revised draft
(summary appended, "Second-round review record"). Both are folded in. The former Task 7
(`isUniqueViolation`) is deferred per the first review; its reopen triggers are recorded below
and go into the rulings ledger at pass close.

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
task (`check:reference` enforces); every task adds its `CHANGELOG.md` line under `## Unreleased`
(the section does not exist, `CHANGELOG.md:1` is `## 0.96.0`; the FIRST task creates it), with a
`Consumers must:` line where consumer action is needed. A task that executes an open audit
ruling closes its ledger entry in `docs/internal/engine-rulings.md` in the same task and states
its position on the remediation's single `Consumers must:` window (ROADMAP, "The any-site audit
remediation"). No version bump, no publish; the pass holds unpublished. Admin visual work
follows `docs/internal/admin-design-system.md`.

---

## Task 1: Export the media picker seam

**Files:** `src/lib/admin-toolkit/index.ts`, `src/lib/components/MediaPicker.svelte`,
`src/lib/media/library-entry.ts` (comment only), `docs/reference/admin-toolkit.md`,
`docs/internal/engine-rulings.md`. (`src/lib/sveltekit/index.ts` is deliberately NOT touched;
see below. File placement of the component follows the barrel-membership rules; a re-export
from the barrel is acceptable.)

**Evidence (twice corrected by review):** `MediaPicker` exists unexported. The
`MediaLibraryEntry` TYPE is already public from `/sveltekit` (`content-routes-media.ts:42`,
`sveltekit/index.ts:62`, `docs/internal/api-surface.md:601`); only the FUNCTION
`mediaLibraryEntry` is internal, and the internal-status comment at `library-entry.ts:11` is
stale on the type half. ASC rebuilt the hero-image field (`HeroImageField.svelte` over
`readCommittedManifest`) because no legal selection UI exists; the selection-and-display need
is what `MediaPicker` serves.

- [ ] Canonical home, per the ItemLabel precedent the reopen rests on: `MediaLibraryEntry`
      publishes from `./admin-toolkit`, beside the component whose prop signature names it
      (`MediaPicker.svelte:52`), exactly as `ItemLabel` publishes beside `Pagination` and
      `ListToolbar` (`engine-rulings.md:2180`). `/media` publishes nothing new and its charter
      paragraph (`docs/reference/media.md:1-13`, node-safe render-path projections) stays
      untouched.
- [ ] The `/sveltekit` re-export STAYS. Dropping it would create the exact closure leak the R4
      ruling exists to remove: `MediaLibraryData.assets: MediaLibraryEntry[]`
      (`content-routes-media.ts:66`) stays public, the re-export comment at
      `content-routes-media.ts:38-42` cites R4, the ledger keeps the principle at
      `engine-rulings.md:1652`, and the ROADMAP already schedules the R4 closure re-derivation
      as a coherence family. A re-export from the stated canonical home is not a second home,
      so C1 is satisfied. Close `audit-sveltekit-medialibraryentry` with this argument: the
      retire is superseded by prop-signature necessity; canonical home `/admin-toolkit`;
      `/sveltekit` keeps the R4 re-export.
- [ ] `MediaPicker` exports from `./admin-toolkit` with BOTH its signature types:
      `MediaSelection` (`MediaPicker.svelte:31-38`, named by the `onselect` prop at `:57`)
      exports beside it, or `check:reference` reds on an undocumented reachable type. The
      reference entry names the `MEDIA_BASE_CONTEXT_KEY` dependency as a contract term (what
      the consumer must provide, or what default applies without it).
- [ ] The entries prop is reshaped BEFORE export to the shape the engine already produces:
      accept `MediaLibraryEntry[]` (what `mediaLibraryLoad` returns via the routes factory)
      instead of `Record<string, MediaLibraryEntry>`. This removes the need for any projection
      helper: `mediaLibraryEntry` the function stays internal, and no new helper export ships
      (the one-line `Object.fromEntries` projection the engine itself writes inline at
      `reproductions/stories/media.ts:52-54` is the `site-today-export` decline's shape,
      `engine-rulings.md:26-33`). Update the stale comment at `library-entry.ts:11` to state
      the type's new home and the function's internal status.
- [ ] `MediaHeroField` is DECLINED, pre-decided: `MediaHeroField.svelte:8-13` documents it as
      `EditPage` save-path wiring (four hidden inputs the decode arm reads, `$app/forms`
      `deserialize` at `:53`, `CSRF_CONTEXT_KEY` at `:37`, cairn's own upload endpoint), the
      same objection sustained against `MediaInsertPopover`. ASC's evidenced need was
      selection and display, which `MediaPicker` serves. Record the decline in the ledger;
      reopen trigger: a second consumer needing the full save-path field, not just selection.
      `MediaInsertPopover` likewise stays internal, deferred until the `MarkdownEditor` seam
      collapse.
- [ ] Each newly public symbol gets a TSDoc contract comment and a reference entry;
      `check:surface -- --update` records the widened surface.
- [ ] A component test imports `MediaPicker` through the package subpath (the showcase or the
      component-test harness) and renders it against a manifest-entry array fixture, proving
      the export path works from a consumer's position, not just in-tree.
- [ ] Acceptance: full gate green; `check:reference` and `check:package` pass; CHANGELOG entry
      notes the new exports (additive; the type's canonical home gains `/admin-toolkit`
      without removing `/sveltekit`, so no `Consumers must:` line); ledger entries closed
      (the reopen and the `MediaHeroField` decline).

## Task 2: StatusChip register grammar, second generation

**Runs after Tasks 1, 3, 4, 5 and before Task 6 (widest file ripple; shares
`cairn-admin.css` with Task 6 and `admin-toolkit/index.ts` with Task 4).**

**Files:** `src/lib/admin-toolkit/StatusChip.svelte` and its component tests,
`src/tests/unit/status-chip-register-parity.test.ts`, `src/lib/components/cairn-admin.css`,
`scripts/checks/custom-surface-budget.json` (the pinned-rule gate),
`src/lib/components/admin-css-safelist.ts`, `src/lib/audit/rules/static/stock-default-hazards.ts`
(its message text names `cairn-chip-bounded` and `register="bounded"` at `:16-17`),
`src/lib/admin-toolkit/index.ts` (remove `STATUS_CHIP_DOT_CLASS`, `index.ts:29`),
`docs/internal/admin-design-system.md` (the "Chip registers" section at `:371-380`),
`docs/extend/migration-notes.md` (the `.cairn-chip-quiet` recipe at `:113`),
`docs/reference/admin-toolkit.md`, `docs/internal/engine-rulings.md`, the chip probe doc
(`docs/internal/probes/2026-07-28-chip-registers` is the precedent), and the chip call sites:
component (`ConceptList.svelte`, `CairnMediaLibrary.svelte`, plus `grep`) AND hand-composed
class sites (`ReferenceField.svelte:79`, `MediaCaptureCard.svelte:94`,
`ManageEditors.svelte:114`, `CairnAdminShell.svelte:827`, `EditPage.svelte:1043`, plus
`grep`).

**Evidence:** the 2026-08-24 owner probe (ASC `docs/design-benchmark/decisions.md`, Geoff's
own ratification) ruled the 6px tone dot illegible toolkit-wide and ratified a three-register
grammar in which the register carries the tone; it survived three consumer screens unmodified
with 26 canvas-readback measurements. The engine currently renders the dot
(`StatusChip.svelte:106`), ships `bounded`/`quiet` only (default `'bounded'`,
`StatusChip.svelte:96`), and carries a five-value `tone` prop (`StatusChip.svelte:32`) whose
only rendering for four of five tones is the dot. The packaged sheet is a second public
surface: `.cairn-chip-bounded`/`.cairn-chip-quiet` are pinned unlayered rules (5 and 6 of 10,
`cairn-admin.css:758,765`, inventoried in `custom-surface-budget.json:17-18`) serving
hand-composed chips, and the safelist (`admin-css-safelist.ts:66-78,101`) calls the sheet
inventory a de facto public API.

The ratified grammar, re-derived for the engine (generic; the numbers below are ASC's measured
starting points, and the engine tunes its own final percentages against its own admin themes):

- Three registers, and ONLY three chip states: `quiet` (neutral tint, settled state that
  recedes), `warning` (warning-toned tint, state needing attention), `outline` (hairline
  border, transparent fill, transient or reversible absence; the successor of `bounded`).
  The register carries the tone; there is no separate tone axis. All registers normalize to
  `font-weight: 400`.
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
- Known interaction, state it rather than trip on it: the tinted band sits below the
  `chip-ground-collision` rule's 1.5:1 advisory floor (`chip-ground-collision.ts:102`). That
  rule is advisory, `StatusChip.svelte:84-86` already documents the tension, and its own
  reshape (`audit-cli-chip-ground-collision-rendered-rule`, `engine-rulings.md:3642`) holds it
  pending a chroma-aware repair. The probe doc records this position so measured "violations"
  read as expected.

- [ ] `tone` RETIRES with the dot; the three registers are the whole chip vocabulary. The
      reopen argument, written into the ledger: `audit-admin-statuschiptone`'s keep
      (`engine-rulings.md:2146`) described the dotted grammar; the owner probe (Geoff's
      ratification for the CHIP family) fused tone into the registers and retired the dot,
      leaving `tone` without a rendering; retiring the prop follows the ratified evidence
      rather than inventing a tone-times-register color grammar no probe measured. Distinguish
      `warning-button-tier` (`engine-rulings.md:57-62`) explicitly: that hold is the BUTTON
      family register, still Geoff's to rule; the chip warning register was ratified by the
      owner probe and invents nothing.
- [ ] Call-site migration map (in-tree now, and the `Consumers must:` line for consumers):
      `tone` neutral/info/success map to `register="quiet"`; warning/danger to
      `register="warning"`; `register="bounded"` to `register="outline"`. A state that must
      stand out beyond quiet is a `warning` chip; there is no chip-level danger tier (the
      probe ratified none).
- [ ] `register` becomes `'quiet' | 'warning' | 'outline'` with default `'quiet'`; `bounded`,
      the dot, the `tone` prop, and the `STATUS_CHIP_DOT_CLASS` export are removed. The sheet
      moves to three pinned chip rules (`.cairn-chip-quiet`, `.cairn-chip-warning`,
      `.cairn-chip-outline`); `custom-surface-budget.json` updates from two chip entries to
      three; the dot's `status-*` safelist family (13 entries, `admin-css-safelist.ts:66-78`)
      is removed with a CHANGELOG note (the safelist is de facto public);
      `stock-default-hazards.ts:16-17` message text renames so `cairn-audit` stops advising a
      class that no longer exists. `check:surface -- --update`.
- [ ] The parity contract survives by design, not by accident:
      `status-chip-register-parity.test.ts` (which asserts the sheet's chip classes equal the
      component's scoped classes declaration-for-declaration, `:50-59`) updates in the SAME
      change to the three-register inventory. Register-for-register parity stays structurally
      possible precisely because no per-tone derivation exists inside the component.
- [ ] CHANGELOG carries `Consumers must: replace register="bounded" with register="outline"
      and .cairn-chip-bounded with .cairn-chip-outline; the tone prop and the tone dot are
      removed, map neutral/info/success to quiet and warning/danger to warning;
      STATUS_CHIP_DOT_CLASS is gone. .cairn-chip-warning is new for hand-composed chips.`
- [ ] Truncation self-defense: when the label ellipsizes and no `legend` is passed, `title`
      defaults to the label (today `title` renders only from `legend`).
- [ ] A standing verification script or browser test measures every register against both admin
      themes and both grounds (plain, zebra; 3 registers x 2 themes x 2 grounds = 12
      combinations) by canvas readback, asserting the band, the border floor, and the
      warning-ink floor. Falsifiability is part of acceptance: break one tuned value and show
      the check reds, then restore it.
- [ ] All chip call sites (component and hand-composed) compile and render; the pass-end
      visual read (cairn-pass ritual) covers a chip-bearing screen in both themes.
- [ ] Ledger hygiene, corrected names: CLOSE `audit-admin-status-chip-dot-class`
      (`engine-rulings.md:1924`, retire, executed here). Do NOT close `audit-admin-statuschip`
      (`:2247`): its recorded reason includes the badge-tier gap (`badge badge-success`
      compiling to nothing), which this task does not execute; append a progress note instead.
      Append stale-case notes to the two keeps whose recorded cases described the dotted
      grammar (`audit-admin-statuschipregister` `:2138`, `audit-admin-statuschiptone` `:2146`,
      the latter now the retire above). State the task's position on the remediation window.
- [ ] Acceptance: full gate green including the updated parity test; reference page documents
      the three registers, the migration map, and the truncation default; the probe doc
      records the engine's own tuned values and the ground-collision position.

## Task 3: ExpandableRow contract fixes

**Files:** `src/lib/admin-toolkit/ExpandableRow.svelte` (including the `@component` block at
`:18-23`), its component tests, `docs/reference/admin-toolkit.md`.

**Evidence:** the trigger is the only way to open a row at 390; ASC's harvest claims it sits
near 24px. The engine's own ruled floor is 24x24 (Task 16b ruling 1, pinned in
`rulings.touch-targets.test.ts`; the `btn-xs` 24px case must pass), NOT ASC's 44px; the
trigger is `btn btn-ghost btn-xs` (`ExpandableRow.svelte:99`), so the measurement will likely
clear. The "summary cells stay non-interactive" contract (`ExpandableRow.svelte:18-23`)
forces consumers into `svelte-ignore`'d `stopPropagation` wrappers for any inline-editable
cell.

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
- [ ] The `@component` block at `ExpandableRow.svelte:18-23` is amended in the same change: it
      currently states summary cells should stay non-interactive with per-row actions never
      inline, the opposite of what the new attribute permits. The amended contract: inline
      interactive cells are supported when wrapped in `data-cairn-inert-cell`; the trailing
      button remains the one control carrying `aria-expanded`.
- [ ] Explicitly out of scope (standing defer, `expandablerow-colspan`): a `colspan`
      full-width summary variant.
- [ ] Acceptance: full gate green; reference page documents the attribute and the measured
      trigger result.

## Task 4: ToolbarDisclosure

**Files:** new `src/lib/admin-toolkit/ToolbarDisclosure.svelte`,
`src/lib/admin-toolkit/ListToolbar.svelte` (markup AND the scoped style block
`:585-720`), `src/lib/admin-toolkit/index.ts`, component tests,
`docs/reference/admin-toolkit.md`, `docs/internal/engine-rulings.md`.

**Evidence:** `ListToolbar` implements the disclosure mechanics twice, overflow
(`:174-205`) and per-`'menu'`-facet, and the one consumer that hand-copied the pattern missed
the mechanics on its first pass. The facet path carries a FIFTH dismissal mechanic the
overflow does not: tab-out via `onfocusout` closes without moving focus
(`ListToolbar.svelte:291-292`, wired at `:382`). Single-open-at-a-time is coordinated by
`openFacetId` (`:219-220`), which no self-contained primitive can enforce. Membership is
settled: `audit-admin-listtoolbar` is a RESHAPE whose assigned shape is this task; cite and
close it.

- [ ] Extract the trigger-plus-panel disclosure into `ToolbarDisclosure`, exported from
      `./admin-toolkit`, with FIVE mechanics: trigger `aria-expanded`/`aria-controls`, focus
      into the panel on open, Escape closes and returns focus to the trigger, pointerdown
      outside closes WITHOUT moving focus (both halves tested), and focus leaving the
      trigger-plus-panel closes without moving focus (the facet's `onfocusout` contract).
- [ ] The contract is CONTROLLED, matching the toolkit's own convention (`ExpandableRow.svelte:8-9`,
      `Pagination`): `open` and `onOpenChange` are props, not internal `$state`.
      Single-open-at-a-time stays in `ListToolbar`, which keeps `openFacetId` and feeds each
      disclosure its `open`.
- [ ] Both duplications fold onto the primitive: the overflow menu and each `'menu'` facet.
      The facet's ARIA-menu content layer (`role="menu"` `:406`, `role="menuitemradio"` `:413`,
      arrow-key roving `:251-256`, reset-to-first-on-open `:233-234`, `aria-haspopup="menu"`
      `:387`) stays OUTSIDE the primitive, in `ListToolbar`'s panel content: it is facet
      behavior, not disclosure mechanics, and transplanting it would ship ListToolbar-specific
      behavior in a general-purpose export. The primitive accepts the trigger's
      `aria-haspopup` value as a prop.
- [ ] The scoped-CSS migration is the full facet/overflow style block, roughly
      `ListToolbar.svelte:585-720` (~15 rules: `.toolkit-toolbar-facet*`, `-overflow*`, and
      the `:focus-within` neutralizer at `:684-696`), not the neutralizer alone. Every rule
      serving moved markup moves with it (per-component scoping orphans them silently, and
      component tests cannot see it because they do not load the compiled daisyUI sheet).
      Acceptance check that does not run on state alone: no `.toolkit-toolbar-facet*` or
      `-overflow*` selector remains in `ListToolbar`'s style block for markup that moved, and
      a rendered check with the packaged admin sheet loaded (or an explicit named check in the
      pass-end rendered read) covers the neutralized `:focus-within` outcome.
- [ ] Component tests assert each of the five mechanics on `ToolbarDisclosure` directly, the
      controlled contract (parent-driven `open`), and `ListToolbar`'s single-open behavior
      after the fold. `ListToolbar`'s existing tests still pass, as the behavior-preservation
      floor, not the whole proof.
- [ ] Acceptance: full gate green; `check:surface -- --update`; reference entry; CHANGELOG
      (additive); `audit-admin-listtoolbar` closed in the ledger. File collision with Task 2
      on `admin-toolkit/index.ts` and `admin-toolkit.md` is absorbed by the serial order (this
      task runs first).

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
      `defaultValue` mirror (available on the pinned Svelte, peer `^5.56.10`) over a `reset`
      listener, which races Svelte's `FORM_RESET_HANDLER`. `reset: false` remains a
      documented good practice for *other* fields, but the CSRF field no longer depends on it.
- [ ] Acceptance: the new test passes; the guard's existing token tests are untouched and green;
      full gate green; components reference notes the guarantee.

## Task 6: Admin sheet fixes (checkbox edge, status text vocabulary, list-reset opt-in, focus ring)

**Runs last (after Task 2; both touch `cairn-admin.css` and the design-system doc).**

**Files:** `src/lib/components/cairn-admin.css`, `docs/reference/admin-grammar-tokens.md`,
`docs/internal/admin-design-system.md` (recipes), a measured verification (extend the audit's
rendered checks or a script in the chip-verification mold from Task 2).

**Evidence:** unchecked `.checkbox` edge measured 1.50:1 light / 1.75:1 dark against the 3:1
WCAG 1.4.11 floor; `text-success`/`text-warning` compile to nothing in admin scope and no
non-error status tint exists (verified: no `text-success` in the sheet; `--cairn-warning-ink`
exists and has no success sibling, so "add if absent" resolves to "add"); bare `<ul>` inside
toolkit containers keeps the UA 40px gutter, and the sheet ALREADY ships an opt-in reset:
`ul.list, ol.list { padding-inline-start: 0 }` under the standing ruling at
`cairn-admin.css:466-477` that forbids `list-style: none`; the harvest reports field `:focus`
reading a near-black `--input-color` ring while `.btn` gets a primary-toned `:focus-visible`.

- [ ] Unchecked `.checkbox` (and any sibling control with the same faint-edge construction) gets
      an explicit edge meeting >= 3:1 in both admin themes; verified by a check that can red,
      not by eye: extend the chip-verification readback script from Task 2 (or the live
      `check:interactive-contrast`, which is deliberately outside `npm run check`,
      `scripts/checks/check-interactive-contrast.mjs:18-21`; name which carries it). Break one
      value, show the red, restore, same as Task 2.
- [ ] The admin sheet gains success- and warning-toned text idioms reading the existing ink
      tokens (`--cairn-warning-ink` plus the new success sibling), documented in
      `admin-grammar-tokens.md` so screens stop reaching for uncompiled Tailwind utilities.
- [ ] List reset: verify-first against the rule the sheet already ships. If the existing
      `ul.list`/`ol.list` opt-in (`cairn-admin.css:466-477`) serves a plain bullet list
      without pulling unwanted DaisyUI `.list` component semantics from the packaged sheet,
      the deliverable is documentation plus in-tree adoption (the design-system recipe names
      it; toolkit screens carrying bare lists adopt it), and NO new class ships. Only if
      `.list` demonstrably carries baggage that breaks a plain list does a `.toolkit-list`
      sibling land (`padding-inline-start: 0` only, never `list-style: none`), with the
      argument against extending `.list` recorded in the ruling comment. Either way a bare
      `ul`/`ol` ancestry selector is rejected, and the harvest-detection pass's list rule
      references whichever class this task ships (record the outcome in the task report for
      that pass).
- [ ] Focus-ring split: first verify whether the packaged sheet (not a consumer override) sets
      `--input-color` to `base-content` on field focus while buttons read a primary-toned ring.
      If engine-owned, both paths read one focus token; if it traces to DaisyUI defaults outside
      the sheet's control, override the token in the sheet and record why. If the split cannot be
      reproduced in-tree, report that instead of changing anything.
- [ ] Acceptance: full gate green; measured contrast numbers recorded in the task report with
      the red-proof; the admin design system doc carries the new recipes.

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
list reset, and survivor 10, the focus ring, ride Task 6 with survivors 6 and 7; survivor 9's
`isUniqueViolation` defers). Execution is serial (1, 3, 4, 5, 2, 6) because the shared-file
map in the header falsifies independence. Locks after the second review: the type's canonical
home is `/admin-toolkit` and the `/sveltekit` R4 re-export stays; `MediaPicker` takes
`MediaLibraryEntry[]` and no projection helper ships; `MediaHeroField` is declined;
`tone` retires and the registers carry the whole chip vocabulary; `ToolbarDisclosure` is
controlled, five-mechanic, with the ARIA-menu layer staying in `ListToolbar`; the list reset
prefers the existing `.list` opt-in over a new class, verify-first.

---

## Second-round review record (`engine-triage`, 2026-08-26, pre-approval)

A second adversarial review ran against the first revision. Verdicts: Tasks 3 and 5 approve
(one fix each, folded), Tasks 1, 4, 6 fix (folded), Task 2 escalate. Its load-bearing
findings, all folded above: the first revision's tone-survives lock invented a 15-cell color
grammar from the 6-cell ratified one and broke the `status-chip-register-parity` contract
test (resolved: tone retires); the `/sveltekit` drop would have created the closure leak R4
removes (resolved: the re-export stays); the ItemLabel precedent points the canonical home at
`/admin-toolkit`, not `/media` (resolved); Task 2's ledger bullet named a nonexistent entry
and missed `audit-admin-status-chip-dot-class`/`audit-admin-statuschip` (resolved, with the
badge-tier half explicitly not closed); Task 4's CSS migration is ~15 rules with a fifth
dismissal mechanic and needs the controlled contract (resolved); Task 6's `.toolkit-list`
duplicated the shipped `ul.list`/`ol.list` rule (resolved: verify-first); `MediaSelection`
and `MEDIA_BASE_CONTEXT_KEY` were missing from Task 1 (resolved); the header's independence
claim was falsified (resolved: serial order); the ceiling rose to 2.4M. The chip band's
known interaction with `chip-ground-collision`'s 1.5 advisory floor is stated in Task 2's
evidence rather than left for a reviewer to trip on.

---

## Re-review verdicts (`engine-triage`, 2026-08-26, against the any-site audit rulings)

Recorded verbatim from the triage dispatch; folded into the task bodies 2026-08-26 (this
section is the first-round revision record).

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


---

## Post-mortem (2026-08-27)

**What was built.** All six tasks landed: the media picker seam (`MediaPicker`, `MediaSelection`,
`MediaLibraryEntry` from `/admin-toolkit`, entries prop reshaped to the loader's array, no helper
export, `MediaHeroField` declined), the ExpandableRow inert-cell escape (`data-cairn-inert-cell`,
trigger measured and cleared at the 24x24 floor, contract comment amended), `ToolbarDisclosure`
(controlled, five dismissal mechanics plus primitive-owned `hidden` panel hiding, both ListToolbar
duplications folded, ARIA-menu layer kept in the caller), the CsrfField `defaultValue` hardening
(the "reset blanks the token" premise proven spec-impossible by two independent reviews; docs
state the invariant honestly), the StatusChip second-generation grammar (three registers, tone and
dot retired per the 2026-08-24 owner probe, engine-tuned bands, parity test carried, twelve
combinations measured by canvas readback), and the admin sheet fixes (checkbox/radio and field
family edges to >= 3:1 with disabled/error exclusions, status-text utilities with fallbacks,
`.toolkit-list` kept on the corrected flex/font-size evidence, focus-ring decline recorded).

**How it ran.** Six tasks through `pass-execute.js` (workflow `wf_fd4dd9fa-c0c`): two accepted
first-pass, four escalated to the conductor; six fix rounds followed (A, B, A2, A3, A4, A5), each
prescribed from review findings, plus the code-simplifier. Every fix round cleared the full gate;
final state 5,768 tests, all six CI-only gates green by name, from-scratch showcase consumer
build green, 137-test e2e green, live admin smoke green against wrangler dev (anon guard, minted
session, owner affordances, graceful `github.unreachable` degradation), and the conductor's own
visual read of the chip probe in both themes (registers distinct, quiet correctly recedes beside
saturated badges, brand pill legible at 400).

**What review caught that the gates could not.** The re-review chain earned its cost repeatedly:
the tone-survives lock would have invented a 15-cell grammar and broken the parity test; the
`/sveltekit` drop would have recreated the R4 closure leak; the CsrfField defect was
spec-impossible (hidden inputs' value setter IS the default-value setter); the `.list`
marker-suppression measurement was false (the true baggage is flex-column plus forced 14px type);
`custom-surface-budget.json` carried a stale selector that would have shipped main red; daisyUI's
`.menu` display rule beats the UA `[hidden]` rule, falsifying the first hiding claim; the safelist
comment's literal tokens kept two "removed" classes compiling; and the facet-chrome deferral had
recorded measurements taken without the Svelte scope class (real numbers 1.192/1.203, both
selectors now recorded and pinned).

**Found for later, recorded.** The strongest CSRF-403 diagnosis to date (the confirm-load
`SameSite=Strict` token re-mint, plus the empty-token fallback and cookie-name flip paths) sits in
the friction log with two proposed remedies pending a ruling: `SameSite=Lax` on the CSRF cookie
and a `detail` discriminator on csrf rejection log records. The e2e visual suite proved
structurally blind to the chip regrammar (no chip-bearing surface within its 120px budget); filed.
`.toolkit-toolbar-select`/`.toolkit-toolbar-facet` sub-3:1 chrome moved to ROADMAP Next with
corrected numbers. `cairn-text-error` gap filed. The `isUniqueViolation` defer and its reopen
triggers are in the ledger.

**Budgets, honestly.** The plan's 2.4M ceiling covered the task chains; the chains spent 2.14M.
The whole pass, with six fix rounds, three domain reviews, four diff reviews, and the simplifier,
landed near 4.3M. The overrun bought real defects (the list above), but future plans should
budget the ritual, not only the chains. Attended interaction points: two batched questions (plan
approval with the adversarial-review gate; tone retirement plus launch), zero mid-execution
questions.
