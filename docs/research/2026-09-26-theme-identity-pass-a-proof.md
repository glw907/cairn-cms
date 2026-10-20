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

### Moved bands

The manifest had not been regenerated since long before this pass (its last touching commit was
`268c315e`, a pre-pass dependency and toolkit-seams chore), so this task's `norms:generate` run is
the first one to read every CSS and markup change tasks 1 to 12 landed. Diffing the manifest's
`entries` array, keyed by role and property, between this task's start point (`e426f011`) and this
commit surfaces every band a task before this one moved, not only the five radius rows task 13
itself ratifies. Every changed entry, its old and new band, its observation count before and
after, and the task whose change explains it:

| Role / property | Old band | New band | Observations (before to now) | Moved by |
| --- | --- | --- | --- | --- |
| `button-ghost` / `border-radius` | 10px | 6px | 31 to 31 | Task 13 (this task's `RATIFIED_NORMS` ladder move) |
| `button-ghost` / `height` | 23, 24, 30.5, 32, 40px | 25.5, 27, 34, 36, 45px | 31 to 31 | Task 4 (`--size-field` 0.25rem to 0.28125rem, commit `199471d6`) |
| `button-ghost` / `padding-inline` | 0, 8, 12px | 0, 8, 14px | 31 to 31 | Task 5 (`--btn-p: 0.875rem` on `.btn-sm`, commit `84c84aaa`) |
| `button-ghost` / `padding-inline-to-font-size` | 0, 0.75, 1 | 0, 0.75, 1.15 | 31 to 31 | Task 5 (the ratio band derived from the padding-inline move above) |
| `button-primary` / `background-color` | `var(--btn-bg)` | unchanged | 11 to 16 | Task 9 (the Publish-tint recipe collapsed onto `btn-soft btn-primary`, commit `4c82b654`, adds observation sites) |
| `button-primary` / `border-color` | `var(--btn-border)` | unchanged | 11 to 16 | Task 9 (same) |
| `button-primary` / `border-radius` | 10px | 6px | 11 to 16 | Task 13 (ladder move); the observation growth is Task 9 |
| `button-primary` / `border-style` | solid | unchanged | 11 to 16 | Task 9 |
| `button-primary` / `border-width` | 1px | unchanged | 11 to 16 | Task 9 |
| `button-primary` / `color` | (relationship, unchanged) | unchanged | 11 to 16 | Task 9 |
| `button-primary` / `font-size` | 12, 14px | unchanged | 11 to 16 | Task 9 |
| `button-primary` / `height` | 30.5, 32, 40px | 34, 36, 45px | 11 to 16 | Task 4 (`--size-field` move); the observation growth is Task 9 |
| `button-primary` / `padding-block` | 1px | unchanged | 11 to 16 | Task 9 |
| `button-primary` / `padding-block-to-font-size` | 0.05, 0.1 | unchanged | 11 to 16 | Task 9 |
| `button-primary` / `padding-inline` | 12, 16px | 14, 16px | 11 to 16 | Task 5 (`--btn-p` move); the observation growth is Task 9 |
| `button-primary` / `padding-inline-to-font-size` | 1, 1.15 | 1.15 | 11 to 16 | Task 5; the observation growth is Task 9 |
| `card` / `border-radius` | 16px | 8px | 15 to 15 | Task 13 (ladder move) |
| `input-text` / `border-radius` | 10px | 6px | 12 to 12 | Task 13 (ladder move) |
| `input-text` / `height` | 32, 38, 40px | 36, 42.5, 43, 45px | 12 to 12 | Task 4 (`--size-field` move) |
| `page-title` / `font-weight` | 700 | 550 | 5 to 5 | Task 9 (the page-heading weight dropped to `font-[550]`, commit `4c82b654`) |
| `select` / `border-radius` | 10px | 6px | 3 to 3 | Task 13 (ladder move) |
| `select` / `height` | 32, 40px | 36, 45px | 3 to 3 | Task 4 (`--size-field` move) |
| `status-chip` / `border-radius` | 8px | 4px | 16 to 16 | Task 4 (`--radius-selector` 0.5rem to 0.25rem); `StatusChip.svelte` itself is untouched this pass, only the token it reads |
| `status-chip` / `height` | 16px | 18px | 16 to 16 | Task 4 (`--size-selector` move) |
| `status-chip` / `padding-inline` | 7px | 8px | 16 to 16 | Task 4 (`--size-selector` move; the badge's own padding scales off the same token) |
| `status-chip` / `padding-inline-to-font-size` | 0.7 | 0.8 | 16 to 16 | Task 4 (same) |

Every other entry in the manifest (button-ghost's own color, border, and font properties;
select's and input-text's non-radius, non-height properties; every remaining role) is
byte-identical between the two commits.

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
(`docs/internal/record/2026-09-26-theme-identity/pass-a-before/README.md`), counting report lines
on the six shared default routes; the three added routes are recorded as new, not compared:

| Rule | Before (core) | Now (core) | Now (added routes) | Now (total) |
| --- | --- | --- | --- | --- |
| `weight-budget` | 4 | 4 (`login` 2, `media` 2) | 2 (`settings`) | 6 |
| `norms-bands` | 0 | 0 | 24 (`posts/2026-06-hello` 8, `settings` 12, `theme-kit` 4) | 24 |
| `touch-targets` | 0 | 0 | 0 | 0 |
| `focus-renders` | 0 | 0 | 0 | 0 |
| `interactive-contrast` | 0 | 0 | 0 | 0 |
| `border-contrast` | 238 | 261 | 135 | 396 |
| `chip-ground-collision` | 50 | 60 | 64 | 124 |

### By finding identity, not totals

A line count can hide a rule that lost one finding and gained another of equal weight. The
before-state's full per-finding output survives from task 0's own capture (the same run this
plan's `pass-a-before/README.md` summarizes; its totals there, 144 and 129 errors, 204 advisories,
135 suppressed over 6 files and 17 rules, match this raw output exactly). Both that output and
this task's own two runs above parse into one identity per finding, `(page, theme, state,
selector)`, and the two sides are compared on the six shared default routes; a changed identity is
new or gone, a repeated identity whose message differs only in a measured value (a contrast
number, an observation count) is unchanged in identity.

`touch-targets`, `focus-renders`, and `interactive-contrast` carry zero findings on the shared
routes on both sides, so there is nothing to diff. `weight-budget` flags the same two `/admin/media`
`<h1>` elements, light and dark, on both sides; the flagged selector's class list moved from
`h1.page-h1.m-0.type-title.font-bold` to `h1.page-h1.m-0.type-title.font-[550]` (the page-heading
weight recipe), so the identity is the same page and role, not a new violation. `norms-bands`
carries zero findings on the shared routes on both sides; every one of its 24 findings sits on a
route this task adds, which the norms generator never measured before.

`border-contrast`: 145 distinct `(page, theme, selector)` identities before, 142 now, on the shared
routes. 10 are new, 13 are gone, 8 keep their identity but change only in how many times that
identity was observed, and 124 are unchanged.

- New (10): `kbd.ml-auto.hidden.rounded-field.border`, on `/admin/editors`, `/admin/media`,
  `/admin/pages`, `/admin/posts`, and `/admin/vocabulary`, light and dark.
- Gone (13): `kbd.ml-auto.hidden.rounded.border` on the same five pages, light and dark (10);
  `button.join-item.btn.btn-sm.btn-active` on `/admin/media` light, `/admin/pages` light, and
  `/admin/posts` light (3).
- Changed only in observation count, same identity (8): `button.join-item.btn.btn-sm` on
  `/admin/media`, `/admin/pages`, and `/admin/posts`, light and dark (3 to 5 observations on
  `/admin/media`, 5 to 7 on the other two); `input.checkbox` on `/admin/media`, light and dark (8
  to 16 observations).

`chip-ground-collision`: 12 distinct identities before, 22 now. 12 are new, 2 are gone, 0 change
only in count, and 10 are unchanged.

- New (12): `span.cairn-chip-quiet.rounded-selector.px-1\.5.py-px` on `/admin/editors`,
  `/admin/media`, `/admin/pages`, `/admin/posts`, and `/admin/vocabulary`, light and dark (10);
  `span.rounded-selector.bg-base-content\/\[0.06\].px-2.py-0\.5` on `/admin/vocabulary`, light and
  dark (2).
- Gone (2): `span.rounded-full.bg-base-content\/\[0.06\].px-2.py-0\.5` on `/admin/vocabulary`,
  light and dark.

Every new and gone identity above is named, not diagnosed: this record does not assert which
earlier task's change produced it. This task changes no CSS or markup of its own; the shift is a
read of work already landed in tasks 1 to 12 that the wider default page set, and the freshly
regenerated manifest that backs `norms-bands`, had not previously reached.

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
