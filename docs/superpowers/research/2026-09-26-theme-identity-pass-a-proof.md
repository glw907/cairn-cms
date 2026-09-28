# Theme identity pass A, the proof

The contrast measurements, the norms ladder move, the 320/390 read, and the rendered audit
comparison this plan's proof task asks for. Every number below comes from a real run against the
compiled admin sheet; nothing here is asserted from a design comment.

## Contrast: the pair table, both themes

`examples/showcase/e2e/theme-kit-contrast.spec.ts` paints each pair to a canvas and reads it back
against a running showcase preview, one test per row group, both themes. All twelve cases passed.

### Light (`cairn-admin`)

| Pair | Measured |
| --- | --- |
| alert-error ink / panel | 5.774 |
| alert-warning ink / panel | 5.486 |
| alert-success ink / panel | 5.439 |
| alert-info ink / panel | 6.658 |
| alert-error nested link / panel | 5.774 |
| switch checked track / base-100 | 12.333 |
| switch checked knob / track | 12.333 |
| switch unchecked edge / base-100 | 3.118 |
| switch unchecked knob / base-100 | 3.118 |
| selected-segment ink / wash (btn-active) | 12.996 |
| selected-segment ink / wash (aria-current) | 12.996 |
| selected-segment ink / wash (checked radio join) | 12.996 |
| selected-segment ink / wash (aria-pressed) | 13.089 |
| selected-segment ink / wash (aria-checked) | 13.094 |
| selected hairline / base-100 | 4.862 |
| selected hairline / resting sibling edge | 3.131 |
| focus ring / base-100 (plain button) | 15.087 |
| focus ring / base-100 (neutral button) | 12.333 |
| focus ring / base-100 (soft primary button) | 5.825 |
| focus ring / base-100 (selected button) | 15.087 |
| focus ring / base-100 (checked switch) | 15.087 |
| focus ring / base-100 (unchecked switch) | 3.118 |

Every row clears its floor (4.5:1 for the two ink rows, 3:1 for the rest).

### Dark (`cairn-admin-dark`)

| Pair | Measured |
| --- | --- |
| alert-error ink / panel | 6.705 |
| alert-warning ink / panel | 6.935 |
| alert-success ink / panel | 7.229 |
| alert-info ink / panel | 7.966 |
| alert-error nested link / panel | 6.705 |
| switch checked track / base-100 | 8.802 |
| switch checked knob / track | 8.802 |
| switch unchecked edge / base-100 | 4.370 |
| switch unchecked knob / base-100 | 4.370 |
| selected-segment ink / wash (btn-active) | 11.549 |
| selected-segment ink / wash (aria-current) | 11.549 |
| selected-segment ink / wash (checked radio join) | 11.549 |
| selected-segment ink / wash (aria-pressed) | 11.559 |
| selected-segment ink / wash (aria-checked) | 11.568 |
| selected hairline / base-100 | 6.115 |
| selected hairline / resting sibling edge | 3.230 |
| focus ring / base-100 (plain button) | 13.322 |
| focus ring / base-100 (neutral button) | 8.802 |
| focus ring / base-100 (soft primary button) | 5.431 |
| focus ring / base-100 (selected button) | 13.322 |
| focus ring / base-100 (checked switch) | 13.322 |
| focus ring / base-100 (unchecked switch) | 4.370 |

Every row clears its floor here too. No floor failed; no finding to return on this row set.

## Hover, active, and lift steps (measured, not asserted)

daisyUI's own `.btn` carries a 0.2s transition on `background-color`, so each read in the spec
waits past it before recording the value; an immediate read caught an in-flight interpolated
value indistinguishable from rest on first try, fixed by adding the wait.

| Step | Light | Dark |
| --- | --- | --- |
| Plain button, rest -> hover | `oklch(0.99 0.004 75)` -> `oklab(0.9535 ...)` | `oklch(0.24 0.01 75)` -> `oklab(0.2745 ...)` |
| Neutral button, rest -> hover | `oklch(0.32 0.012 75)` -> `oklch(0.2 0.012 75)` (the `--cairn-ink-hover` target) | `oklch(0.8 0.01 75)` -> `oklch(0.9 0.008 75)` |
| Selected segment, rest -> hover | `oklab(0.9389 ...)` (7% wash) -> `oklab(0.9024 ...)` (12% wash) | `oklab(0.2883 ...)` (7% wash) -> `oklab(0.3228 ...)` (12% wash) |
| Soft primary, rest -> hover -> active | alpha `0.1` -> `0.15` -> `0.22` | alpha `0.1` -> `0.15` -> `0.22` |
| Primary lift (`box-shadow`) | `oklch(1 0 0 / 0) 0px 0.5px 0px 0.5px inset, oklch(0.35 0.04 75 / 0.35) 0px 1px 2px -1px` | `oklch(1 0 0 / 0) 0px 0.5px 0px 0.5px inset, oklch(0.1 0.02 75 / 0.35) 0px 1px 2px -1px` |

The soft primary's alpha step (10% -> 15% -> 22%) is visible in both themes, confirming decision
3's 22% active value is kept. The dark lift's tint (`oklch(0.1 0.02 75 / 0.35)`) matches dark's own
`--cairn-shadow` hue, at the light lift's geometry and alpha, per decision 3.

## The norms ladder move

`RATIFIED_NORMS` moved from the old field/box radii (10px, 16px) to the new ladder: `button-primary`,
`button-ghost`, `input-text`, and `select` at 6px, `card` at 8px. The order of steps: edit
`RATIFIED_NORMS` first; `npm run package`; build the showcase and serve its preview on 4391
(listener cwd confirmed as this worktree); `norms:generate`; `norms:check`; the rendered audit and
the two live checks against the same preview; stop the preview; confirm 4392 free; then the
contrast e2e.

Editing `RATIFIED_NORMS` alone, before regenerating the manifest, turned `norms.test.ts`'s
production-anchored test red for the right reason: five `... the render disagrees with the ratified
decision and the entry is not flagged ratified-drift ...` violations, one per moved role. Confirmed
against the current manifest, without a rebuild. `BASE_URL=http://localhost:4391 npm run
norms:generate` then regenerated `src/lib/audit/norms-manifest.json` against the built showcase;
every moved role now reads `provenance: ratified`, band `[6]` or `[8]`, no `ratified-drift` flag.
`BASE_URL=http://localhost:4391 npm run norms:check` reports the manifest fresh.
`npx vitest run --project unit src/tests/unit/audit/norms.test.ts
src/tests/unit/audit/rules/rendered/norms-bands.browser.test.ts` passes, 47 tests.

`norms-bands.browser.test.ts` restated three fixtures that hard-coded the old card radius (16px)
against the new manifest band (8px): the border-style fixture at line 93, the container-height
fixture at line 106 (this one would otherwise have produced a new `card/border-radius` finding and
failed its own `toEqual([])`), and the realistic-admin-fragment fixture at line 166. The
button-primary height fixture at line 63 also carried a stale 10px card... radius literal, moved to
6px; the second test in the file (line 73-87) already derived its expected radius from the shipped
manifest's own band, so it needed no edit.

No radius row in the regenerated manifest carries `ratified-drift`.

## The 320 and 390 check

`examples/showcase/cairn-audit.config.json` gained `rendered.extraPages`:
`/admin/theme-kit`, `/admin/posts/2026-06-hello`, `/admin/settings`, additive to the six default
routes (`/admin/posts`, `/admin/pages`, `/admin/vocabulary`, `/admin/media`, `/admin/editors`,
`/admin/login`). The route carrying each region the spec names:

- `/admin/posts` (a default route): the `ListToolbar` filter join and `Pagination`, since the
  showcase's 27 posts at `ConceptList`'s page size of 10 make three pages.
- `/admin/posts/2026-06-hello`: the toolbar row and the phone desk band, the edit route's header.
- `/admin/settings`: the chip-beside-heading row, the "Set by your developer" chip in its
  `cairn-line-slot`; below `sm` the chip drops to its own line, so the 320/390 read covers the
  dropped layout.

`viewport-overflow` and `panel-width` both check 390 and 320 internally (`CHECK_WIDTHS` in each
rule), so one `--rendered` run already covers both widths for every configured page. `panel-width`
carried zero findings on every page in both runs. `viewport-overflow` carried findings on every
page, old and new, entirely under the `menu-open` interaction state (never at `rest`); zero at
`rest` on any page, including the three added ones. This matches the pre-existing, already-recorded
run-to-run variance the pass-a-before record and `docs/STATUS.md`'s watch item both name
(`viewport-overflow` was the sole source of the before-state's own 144-vs-129 swing); the three
added routes simply expose more instances of that same standing condition rather than a new one, and
this task changes no layout or CSS. Findings recorded, by page (run 2 of the rendered audit, below):
core routes carried 135 (`editors` 16, `media` 45, `pages` 23, `posts` 20, `vocabulary` 31), the
three added routes carried 239 (`posts/2026-06-hello` 6, `settings` 110, `theme-kit` 123).

`vertical-alignment-recipes.test.ts` passes (part of the full component suite run below).

## `npx cairn-audit --rendered`, two runs

Run from `examples/showcase` with `BASE_URL=http://localhost:4391`, both against the regenerated
manifest and the three added pages. Both exit 1 (findings present).

| Run | errors | advisories | suppressed |
| --- | --- | --- | --- |
| 1 | 392 | 393 | 241 |
| 2 | 378 | 393 | 241 |

The 14-count swing between the two runs is `viewport-overflow` alone (388 vs. 374), the identical
known variance named above; every other rule's finding count, including all seven tracked below, is
byte-identical between the two runs.

The seven tracked rules, run 2, compared against task 0's before-state
(`docs/internal/record/2026-09-26-theme-identity/pass-a-before/README.md`) by finding identity on
the six shared default routes; the three added routes are recorded as new, not compared:

| Rule | Before (core) | Now (core) | Now (added routes) | Now (total) |
| --- | --- | --- | --- | --- |
| `weight-budget` | 4 | 4 (`login` 2, `media` 2) | 2 (`settings`) | 6 |
| `norms-bands` | 0 | 0 | 24 (`posts/2026-06-hello` 8, `settings` 12, `theme-kit` 4) | 24 |
| `touch-targets` | 0 | 0 | 0 | 0 |
| `focus-renders` | 0 | 0 | 0 | 0 |
| `interactive-contrast` | 0 | 0 | 0 | 0 |
| `border-contrast` | 238 | 261 | 135 | 396 |
| `chip-ground-collision` | 50 | 60 | 64 | 124 |

`weight-budget`, `touch-targets`, `focus-renders`, and `interactive-contrast` match the before-state
exactly on the shared routes. `norms-bands` stays at zero on the shared routes; every one of its 24
findings sits on a route this task just added to the rendered set, which the norms generator itself
never measured before (a new observation, not a regression). `border-contrast` and
`chip-ground-collision` grew on the shared routes (+23 and +10), both advisory tier; every
`border-contrast` finding sampled carries the same `RULING 2` hairline exemption the before-state's
own findings did, consistent with the corner-ladder and markup sweep (tasks 9 and 10) adding more
hairline-bearing elements to the same routes rather than a defect this task introduces. This task
changes no CSS or markup; both counts are a read of work already landed in earlier tasks that the
wider default page set had not previously reached.

## Public-site checks

Both probe the sitemap and `/styleguide`, never the admin; the rendered-audit rules above are the
admin's own equivalents.

- `BASE_URL=http://localhost:4391 npm run check:touch-targets`: `31 files scanned, 1 rule run` /
  `0 errors, 0 advisories, 0 suppressed`.
- `BASE_URL=http://localhost:4391 npm run check:interactive-contrast`: `31 files scanned, 1 rule
  run` / `0 errors, 0 advisories, 0 suppressed`.

## Task 12's fix-round finding

Task 12's fix round (`e426f011`) found that the `@layer utilities.daisyui, utilities.cairn-idiom;`
order-pin statement only registers a layer's priority the first time it names that layer; a
minifier is free to relocate the statement below both sublayer blocks, where it sets nothing, so
emission order in the shipped, minified sheet is the guarantee that actually holds, not the pin
statement's own position. A unit test in `admin-css-build.test.ts` now reads both the unminified
`dist/components/cairn-admin.css` and a separately minified compile of that same sheet, asserting
the `daisyui` sublayer block emits before `cairn-idiom` in both, guarding the property this
sublayer split actually depends on.
