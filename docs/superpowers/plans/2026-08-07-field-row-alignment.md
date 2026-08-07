# Field-row vertical alignment (the 0.92.0 stacked-register counterpart) — implementation plan

> **For agentic workers:** execute task-by-task per the repo's standing method: dispatch each
> task to `cairn-implementer` (pinned Sonnet), test-first; the main loop reviews each diff and
> confirms the full gate before the next dispatch. This pass GATES RELEASE ONE (Geoff,
> 2026-08-06: the beta does not ship with the alignment defect class unanswered). The governing
> evidence is the ROADMAP entry "The field register has now produced an alignment defect on
> BOTH axes" (filed 2026-08-06 by the ASC rc.2 verification) and ASC commit `f0f79bb`.

**Goal:** the engine owns form-row vertical alignment instead of advising consumers about it.
The `0.92.0` stacked register made every `FieldLabel` a two-line block whose control sits in
the lower half; a consumer row pairing a field with a bare control and written
`flex items-center` hangs the control 12.5px above the input it acts on. ASC wrote that row
three times and got it right once. The knowledge lives at the wrong altitude, so the fix is a
blessed row the engine ships, a tripwire that detects the miss, and an honest upgrade note for
the consumers already exposed.

**The diagnosis, for the record (two classes, one cause):** vertical-alignment knowledge in
cairn lives at a different altitude than vertical geometry. The STRUCTURAL class (this pass):
the engine defines the field's internal shape, the site defines the row around it, and nothing
connects the two, so an engine register change is a silent geometry break in every consumer
flex row. The OPTICAL class (chronic, small): CSS centers line boxes while the eye centers
glyphs, per-font, which is why pixel nudges never stay fixed; `text-box-trim` is the
at-the-source answer and ships here as a silent default where it is always right.

## Global constraints

- Additive only. No change to `FieldLabel`'s markup, registers, or semantics: an action
  affordance never goes inside its `<label>` (it would join the field's accessible name).
- Per-task gate: targeted tests, `npm run check` 0/0, `npm test` exit 0, `check:comments`,
  plus the four CI-only gates by name at pass end (`check:reference:signatures`,
  `check:surface`, `check:snippets`, `check:comments`) and `check:invisible-craft`.
- Admin design system doc (`docs/internal/admin-design-system.md`) updates ride the same task
  that changes the component behavior, not a docs task at the end.
- Feature worktree off `main`; mind the showcase-symlink gotcha.

### Task 0: scope confirmation (light)

Verify the ROADMAP entry's evidence still matches the code (the `field-edge-alignment` audit
rule exists and measures left edges only; `FieldLabel`'s two registers are as documented), and
sweep-list the engine's own candidate rows before task 2 sizes its work: grep
`src/lib/components` and `src/lib/admin-toolkit` for flex rows pairing a `FieldLabel`-wrapped
(or internally-wrapping, `TextInput`/`SelectInput`) child with a bare sibling control
(`ManageEditors.svelte:127`, `VocabularyAdmin.svelte:365`, `ComponentForm.svelte:334` are the
known suspects), plus the showcase and scaffold templates. The list is task 2's input.

### Task 1: `FieldRow` (the engine-owned row) and the optical default

**Files:** create `src/lib/admin-toolkit/FieldRow.svelte`, export from `/admin-toolkit`;
modify `src/lib/admin-toolkit/FieldLabel.svelte` (its `@component` block gains the row
contract) and `src/lib/components/cairn-admin.css` (the `text-box-trim` default).

**Produces:** `FieldRow`, a form-row wrapper whose children bottom-align (`items-end`), which
is correct for every mix of stacked fields and bare controls because controls sit at the
bottom of a stacked field's block, and degrades to a no-op when every child is a bare control.
Props stay minimal (a `gap` escape only if the sweep shows two real gap values in use; no
alignment prop, the alignment IS the component). Document the one known caveat in the
`@component` block: a field rendering an error line BELOW its control breaks bottom-alignment,
and the admin toolkit does not currently render such lines; revisit if it ever does. The
`text-box-trim` half: add `text-box: trim-both cap alphabetic` to the label-like recipes
(`type-label`, `type-chip`, the button recipes) in `cairn-admin.css` as a progressive
enhancement (unsupported browsers keep today's behavior), per the workstation silent-default
rule for always-right mechanics.

**Acceptance criteria:** component tests prove a stacked field beside a bare button renders
both controls' vertical centers within 1px (jsdom cannot measure; use the browser project's
real layout, the PreviewBanner precedent); a row of two bare controls is unchanged by the
wrapper; the CSS default passes `check:invisible-craft` and the visual suites (baseline churn
from trim is expected and reads on CI, Geoff sees before/after per the visual-work rule since
this moves the approved admin baseline).

### Task 2: the engine sweep

**Files:** every row on task 0's list, plus `examples/showcase` and the scaffold templates.

Re-compose each engine-owned, showcase, and scaffold row that pairs a field block with a bare
sibling control to use `FieldRow` (or `items-end` where a wrapper cannot mount). The admin
design system's form-row section documents the rule and names `FieldRow` as the recipe.

**Acceptance criteria:** no `items-center` remains on a flex row whose children mix a stacked
field and a bare control anywhere in `src/lib`, the showcase, or the scaffold (task 3's audit
rule is the proof); admin-visual baselines regenerate on CI and the diffs read as
alignment-only.

### Task 3: the tripwire (`cairn-audit` vertical rule)

**Files:** create the vertical counterpart to
`src/lib/audit/rules/rendered/field-edge-alignment.ts`; register it; unit fixtures.

**Produces:** a rendered-audit rule flagging a control inside a stacked field whose vertical
center differs from a sibling control's in the same flex row beyond a threshold (start at 4px;
the ASC case measured 12.5px). Learn from `field-edge-alignment`'s filed weaknesses (ROADMAP
~line 551: previous-member clustering, the always-recommends-stacked message): compare within
one flex row only, and the finding message recommends `FieldRow`/`items-end`, stating the
measured delta.

**Acceptance criteria:** the rule fires on a fixture reproducing ASC's season row
(items-center, 12.5px delta), stays silent on the `FieldRow` composition and on legitimately
center-aligned same-height rows, and runs green over the swept engine + showcase.

### Task 4: docs, changelog, upgrade note, roadmap

**Files:** `docs/reference/admin-toolkit.md` (FieldRow), the admin design system form-row
section (rides task 1/2 but verified here), `CHANGELOG.md` under `## Unreleased`,
`docs/guides/upgrade-cairn.md` (BOTH the new entry and a retroactive geometry note on the
`0.92.0` entry: "check any flex row pairing a field with a bare control; compose with
`FieldRow` or `items-end`" — the changelog convention covered the API, not the shape change,
and `907-life`/`cairn-pub` cross that flip in their next migration), `ROADMAP.md` (the
2026-08-06 both-axes entry closes; the `field-edge-alignment` weaknesses entry gains a note if
task 3's implementation resolves any of it).

**Acceptance criteria:** the four doc gates plus `check:surface` with the regenerated
snapshot; the upgrade guide's 0.92.0 note reads as an adopter checklist item, not an erratum
apology.
