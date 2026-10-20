# Pre-beta engine pass: editor vocabulary, small affordances, paste conversion

> Approved by Geoff 2026-07-03 ("you can use a workflow to start as soon as the docs are
> done"). Runs as a workflow of implementer tasks on a fresh worktree off `main`, serial
> through the shared gate, with the reviewer fan-out at the end. Every task carries its docs
> rider: the docs tree just shipped describing current behavior, so each behavior change
> updates its documented lines in the same task (docs-is-a-pass-dimension).

**Goal:** close the editor-facing product gaps the docs initiative exposed before beta
freezes first impressions, plus one contained feature (rich-text paste conversion).

**Source of the findings:** `docs/internal/docs-friction-log.md` (2026-07-03 entries), the
docs fan-out's claims gates, and the pre-beta triage conversation (2026-07-03).

## Global constraints

- Svelte 5 runes; DaisyUI 5; the admin design system doc governs any visible change.
- Full gate per task: targeted test + `npm run check` 0/0 + `npm test` exit 0.
- No public-surface (export) changes anywhere in this pass; everything is internal or UI.
- CHANGELOG entries accumulate under `## Unreleased`; no version bump.

### Task 1: The Address vocabulary

**Outcome:** No editor-facing string says "Slug". The create dialog's field and any other
editor-visible use say "Address" (the details panel's group is already Address). Internal
identifiers stay `slug`.
**Docs rider:** drop the "(the dialog labels it Slug)" parenthetical from
`docs/guides/write-in-the-editor.md`; grep the guides for other Slug-label mentions.
**Acceptance:** grep of editor-facing strings clean; component tests updated; rider applied.

### Task 2: The Library nav label

**Outcome:** The admin sidebar item for the media screen says "Library" (the settled
vocabulary), not "Media".
**Docs rider:** drop the "(the Media item in the sidebar)" parentheticals from
`manage-the-media-library.md` and `manage-your-tag-vocabulary.md`.
**Acceptance:** label changed with its test; riders applied; no other "Media" nav strings.

### Task 3: The visible issue count

**Outcome:** The editor footer shows a small live count of open check issues (spelling +
mechanical), near the word count, sourced from the same diagnostics the announcer uses. The
visible count is `aria-hidden` so screen-reader users don't hear it twice (the announcer
already speaks it).
**Docs rider:** update the checks section of `write-in-the-editor.md` (the count is visible
to everyone now; keep the F8 flow and the announcer sentence for SR users).
**Acceptance:** count renders and updates live under test; no duplicate SR announcement
(a11y reviewer confirms); rider applied.

### Task 4: Undo and redo on the cheat-sheet

**Outcome:** `editor-shortcuts.ts` gains Undo (`Ctrl Z`) and Redo (`Ctrl Y`) rows, so the
in-product sheet matches the docs' shortcut tables.
**Docs rider:** none (the docs already list them); this also feeds the planned
shortcut-drift gate.
**Acceptance:** rows present, grid renders them, test updated.

### Task 5: Components fold by default

**Outcome:** Component blocks open folded when an entry loads (Geoff's standing pre-beta
ruling). The auto-unfold safety invariant is untouched: typing or cursor entry unfolds, and
hidden text can never be edited.
**Docs rider:** `write-in-the-editor.md` and `editor-welcome.md` folding sentences updated
(blocks start folded; unfold on touch).
**Acceptance:** existing folding invariant tests still green plus a new folded-on-open test;
the fold e2e updated; riders applied.

### Task 6: Showcase csrf alignment

**Outcome:** `examples/showcase/svelte.config.js` carries `csrf: { checkOrigin: false }`
exactly as the deploy guide instructs (cairn owns CSRF; the kit check must yield).
**Acceptance:** showcase builds; e2e green; the guide and showcase agree.

### Task 7: The media.upload_failed `code` field

**Outcome:** The reference documents an optional `code` field no emit site populates.
Implementer's judgment: populate it from the real failure paths if the information exists
cheaply at the emit sites, otherwise remove it from `docs/reference/log-events.md`. Either
way the reference and the emitters agree.
**Acceptance:** grep-proven agreement; log tests updated if populated.

### Task 8: Rich-text paste conversion (the feature)

**Outcome:** Pasting content with a `text/html` clipboard flavor into the editor converts
the core structures to markdown: headings, bold/italic, links, bulleted and numbered lists,
paragraphs. Everything else degrades to plain text. Plain-text paste is untouched; image
paste keeps its existing capture-card intercept; the browser's plain-paste chord still
bypasses conversion. Prefer a minimal in-repo converter over a new dependency unless the
implementer finds the hand-rolled path worse for correctness; a new dependency needs a
size/maintenance note in the report.
**Docs rider:** rewrite the paste paragraph in `write-in-the-editor.md` (formatting now
survives; name what converts and what doesn't).
**Acceptance:** conversion unit tests over representative Word/Docs/web HTML fixtures;
plain and image paste regression tests; rider applied.

### Task 9: Pass close

Code-simplifier over the pass's diff; reviewer fan-out (svelte-reviewer +
daisyui-a11y-reviewer; security reviewer not needed, no auth surface); full suite +
consumer-build proof; CHANGELOG under `## Unreleased`; friction-log entries this pass
resolves closed; STATUS updated. No version bump, no publish.
