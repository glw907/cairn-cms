# Plan: component insert picker with live preview, and the contract additions

Source spec: `docs/superpowers/specs/2026-06-15-cairn-component-picker-design.md`. Mockup (rev. 2,
critique folded in): `docs/internal/design/2026-06-15-component-picker-mockup.html`.

Execution: one `cairn-implementer` per task, test-first, on a feature worktree off `main`. The main
loop reviews each diff and confirms the full gate (`npm run check` 0/0, `npm test` exit 0, the doc
gates, the showcase E2E) between dispatches. Tasks 6 and 7 run in the main loop. Additive contract,
so the release carries no consumer action; the version bump is a minor.

## Task 1: contract types and registry plumbing

Extend `src/lib/render/registry.ts`: add `icon?`, `group?`, `hidden?`, and the structured `preview?`
to `ComponentDef`; add `pattern?` and `validate?` to `AttributeField`; add `itemLabel?` to `SlotDef`.
Add a helper that seeds `ComponentValues` from a `preview` sample (reusing `emptyValues` as the
base). Keep every field optional so existing defs compile. Unit tests for the defaults, the preview
seed, and the type surface. No UI.

## Task 2: validation honored in the form

Wire `pattern` and `validate` into `src/lib/render/component-validate.ts` so the existing
`buildComponentInsert` path returns field-keyed errors for a failed pattern or a failing validator,
with `validate` wrapped in try/catch (a thrown validator is treated as valid, logged in dev). Confirm
required attributes and slots already produce field-keyed errors; if not, add them. Unit tests for
pattern failure, validate failure, a throwing validator, and required-empty.

## Task 3: the catalog step

Rebuild the catalog half of `ComponentInsertDialog.svelte`: group rows by `group` under eyebrow
headings in declaration order; render each row's `icon` glyph, label, description, and use; apply the
`hidden` filter in `insertableDefs`; add the search input above the list only past the threshold
constant, with focus-on-open, an `aria-live` count, and a no-match state. Keyboard: arrow/Enter over
the list, Escape closes. Component tests for grouping, the hidden filter, the threshold, and keyboard
nav.

## Task 4: the configure step and the live preview pane

Rebuild the form half across `ComponentInsertDialog.svelte` and `ComponentForm.svelte`: two panes
when the picked component declares `preview`, single column otherwise. The preview pane renders the
configured directive through the adapter `render` into a sandboxed iframe, reusing the edit page's
`preview-doc.ts` / `buildPreviewDoc` and its debounced latest-wins pattern with one persistent
iframe. Implement the three states (settling, incomplete with the called-out empty region,
render-failed). Required fields marked and Insert disabled while invalid; repeatable rows use
`itemLabel` with the `${label} ${i + 1}` fallback. Focus moves to the first field on pick and returns
to the cursor on close. Component tests for the opt-in pane, the states, and focus handling.

## Task 5: the showcase exercises the path

In `examples/showcase/src/lib/cairn.config.ts` declare `icon` and `group` on both components and a
`preview` sample on the callout (and a second `group` so grouping shows). Add or extend the E2E so
the picker opens, groups, opens the callout form with its preview pane, and inserts. Keep the showcase
building against the packaged dist.

## Task 6 (main loop): docs and the release notes

Update the component reference page(s) under `docs/reference/` for the new contract fields. Write the
CHANGELOG entry: it summarizes the research (the precedent survey and the deficiency hunt) and states
how the picker beats the alternatives (the live preview cairn alone can offer, plus the additive
contract fields). Bump the version (minor). Run `npm run check:reference` and `check:package`.

## Task 7 (main loop): post-build critique, reviewers, gate

Run a fresh frontend-design critique against the built admin on the showcase (both themes), fold in
what lands. Fan out `svelte-reviewer` and `daisyui-a11y-reviewer` (both Opus). Resolve Critical and
Important findings. Confirm the full gate at the tip, then the standard pass-end ritual (STATUS,
post-mortem, memory, commit).

## Carry-forward (noted, not built)

Round-trip editing of an existing block, the master-detail catalog rail, browse-time
preview-on-highlight, and a `/` slash trigger. Each is recorded in the spec's out-of-scope list.
