# Plan: round-trip editing of a placed component

Source spec: `docs/superpowers/specs/2026-06-15-cairn-component-round-trip-design.md`. Same branch as
the picker pass (`feat/component-picker-live-preview`), bundled into one release (`0.57.0`).
Execution: one `cairn-implementer` per task, test-first, main loop reviews each diff and clears the
gate between dispatches.

## Task 1: the round-trip safety check (correctness core)

In `src/lib/render/component-grammar.ts` add `componentRoundTripSafety(markdown, def)` returning
whether guided edit is provably lossless for that block: every present attribute key is declared,
no undeclared child container directive is present, and `parse -> serialize -> parse` is idempotent.
Reuse `findComponentRoot`/`parseComponentWithRawKeys`. Unit tests: a canonical block passes; an
authored-but-equivalent block passes; an unknown attribute fails; an undeclared child directive
fails; a non-idempotent parse fails. No UI.

## Task 2: the editor seam

In `src/lib/components/markdown-directives.ts` add a helper to read a container opener line's
directive name. In `MarkdownEditor.svelte` add two seams beside `registerInsert`: a reactively
reported reader of the component at the caret (`{ name, markdown, from, to } | null`, from
`fenceScan` + `caretContainerRange` + the line text and char offsets) and a `(from, to, text) =>
void` range replace. Unit/component tests: the reader returns name+range inside a container and null
outside; the replace overwrites the right span.

## Task 3: the dialog edit mode

In `ComponentInsertDialog.svelte` / `ComponentForm.svelte` add an `editComponent(def, values, range)`
entry that skips the catalog, seeds the form from the passed values, sets the header breadcrumb to
"Edit" and the primary button to "Update", and on submit calls `onUpdate(markdown)`. The live preview
runs the same in edit mode. Component tests: seeding, the edit labels, `onUpdate` payload.

## Task 4: EditPage wiring and the Edit-block affordance

In `EditPage.svelte` hold the caret-component state from the editor seam, resolve it against the
registry, run `componentRoundTripSafety`, and render an "Edit block" toolbar control enabled only on
a safe editable component (with a plain disabled reason otherwise). On activate, `parseComponent` the
block, open the dialog via `editComponent`, and wire Update to the range-replace seam. Component
tests: the control's enabled/disabled states and the open-in-edit path.

## Task 5: the showcase exercises an edit

Extend the showcase E2E: place or open a callout, move the cursor into it, Edit block, change the
title, Update, and assert the source directive changed and the rendered output followed. Keep the
showcase building against dist.

## Task 6 (main loop): docs, the bundled changelog, and the version

Update the reference for the new editor seams and the dialog edit mode, and the admin design-system
picker recipe for the Edit affordance. Rework the changelog: fold the picker and round-trip into one
`0.57.0` entry (the picker's `0.56.2` heading becomes `0.57.0`, carrying both), and bump the version
to `0.57.0` (round-trip is a new capability, so the bundle is a minor). Run `check:reference`,
`check:reference:signatures`, `check:docs`.

## Task 7 (main loop): adversarial review, reviewers, gate, pass-end

Adversarially review the round-trip for data-loss paths the safety gate must catch. Fan out
`svelte-reviewer` and `daisyui-a11y-reviewer`. Resolve Critical/Important. Confirm the full gate and
the showcase E2E at the tip, then the pass-end ritual (STATUS, post-mortem, memory).

## Post-mortem (2026-06-15)

Landed on `feat/component-picker-live-preview`, bundled with the picker into `0.57.0`. Commits: RT1
`2ece8a0` (safety check), RT2 `90b7992` (editor seam), RT3 `69dd656` (dialog edit mode), RT4
`2d2ad44` (EditPage affordance + async gate), RT5 `beda263` (E2E), docs+version `07e7517`/`63e3ec1`,
the simplifier `7a74826`, and the review fold-in `8a3f4b1`.

What went well: the spike confirmed the substrate (the reversible grammar pair and `caretContainerRange`)
before any UI, so the build was wiring, not invention. The safety gate made the data-loss posture
explicit up front.

What the review caught (the value of the adversarial gate): the safety gate proved parse-serialize-parse
idempotency but was blind to the FIRST parse dropping content, so a markdown title silently truncated
through `readLabel` and still read safe. The caret-reporter dedupe ignored `markdown`, so an
equal-length edit went stale and Update reverted it. Both were CRITICAL data-loss paths a single
builder missed; both now have regression tests. The durable lesson, recorded as a residual: the gate
checks the form model's self-consistency, not fidelity to the author's markdown, so any future lossy
slot reader needs its own test or an original-vs-reserialized comparison in the gate.

Carry-forwards: the master-detail catalog rail and the `/` slash-trigger (still deferred); the
original-vs-reserialized gate hardening as defense-in-depth for future slot readers; editing a nested
component inside another (out of scope, `findComponentRoot` is top-level only).
