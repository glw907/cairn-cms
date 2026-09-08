# Chassis-B intended moves

The pass-wide record `scripts/capture-surfaces.mjs` (Task 1) and every paint task write to.
The verifier reads this file, never a task's own report. A paint task that moves a baseline
without appending its row here is a blocking finding at the diff gate.

## The pass before set

Captured `docs/superpowers/plans/2026-09-07-chassis-b1-pass.md` Task 1, Step 2, at the branch
point, before any paint task ran:

- **Commit:** `f223994f80f3cc3b67f771211e2f4c4437889be8` (the branch point; the capture tool
  lands in e7721c37 and changes no rendered output)
- **Location:** `~/.cache/cairn-chassis-b/pass/before/`
- **Tool:** `examples/showcase/scripts/capture-surfaces.mjs`, full surface matrix (no `--only`)
- **Surfaces:** `home`, `article` (plus its light-only 1920 extra), `styleguide`, `archive2`,
  `error404`, `signups`
- **Widths:** 320, 390, 768, 1440, 2560 (plus 1920 for `article`, light only)
- **Schemes:** light, dark
- **Manifest entries:** 264 (42 home, 92 article, 90 styleguide, 20 error404, 20 signups)

### `.missing` entries in the before set

Ten, all `archive2` at every width in both schemes:

- `archive2-light-320.missing`, `archive2-light-390.missing`, `archive2-light-768.missing`,
  `archive2-light-1440.missing`, `archive2-light-2560.missing`
- `archive2-dark-320.missing`, `archive2-dark-390.missing`, `archive2-dark-768.missing`,
  `archive2-dark-1440.missing`, `archive2-dark-2560.missing`

This is the ONE known expectation: `ARCHIVE_PAGE_SIZE` is 50 (`src/chassis/archive.ts`) and the
showcase's own corpus fits on page one, so `/archive/2` 404s for real under `vite preview` and
every capture at every width and scheme writes `.missing`. `archive2` is B2's surface, not B1's;
this before set exists so B2 has one.

`error404` (an unmatched path) is NOT in the `.missing` list: the tool's header comment records
that the root `+error.svelte` renders fully under `vite preview` for a genuinely unmatched route
(full SSR, status 404, with the site's own nav and footer), so the capture tool treats a 404
there as the surface under test rather than a capture gap, and every `error404` capture in the
before set is a real file.

## Row log

Format: `surface width scheme: what moves / why / baseline names it moves`. Appended by every
paint task in the same commit as its change.

(No rows for Task 1; it lands no paint.)

### Task 2: width matrix coverage

Both surfaces are NEW to the matrix, so nothing moves and every baseline listed here is a
first-time addition (no prior baseline existed to diff against).

- `error404` 320/390/768/1440/2560 light and dark: new to the width matrix / the root
  `+error.svelte` renders fully under `vite preview` for an unmatched path (confirmed by
  `scripts/capture-surfaces.mjs`'s availability header), so it joins `site-visual.spec.ts`'s
  width loop the same way home/article/styleguide do / adds
  `error404-{light,dark}-{320,390,768,1440,2560}.png` (10 files, all new).
- `signups` (`/admin/signups`) 320/390/768/1440/2560 light and dark: new to the width matrix /
  the consumer's own custom admin screen (built on the packaged admin toolkit) meets the
  five-viewport bar through the `cairn-admin-theme` cookie, the same as the engine's own admin
  screens / adds `admin-signups-{light,dark}-{320,390,768,1440,2560}.png` (10 files, all new).

### Task 3: the shell from the chassis

Paint-neutral by design: `(site)/+layout.svelte` and `+error.svelte` swap their hand-rolled
`flex min-h-screen flex-col` / `flex-1` classes for `.cairn-site-shell` / `.cairn-site-main`
(`src/chassis/composition.css`), and `site.css`'s `.site-main` drops the `width: 100%` /
`min-width: 0` declarations the chassis pair now supplies. The chassis rule reproduces the same
computed geometry (`display: flex; flex-direction: column; min-height: 100vh` on the shell;
`flex: 1 1 0%; width: 100%; min-width: 0` on main), so no surface moves.

- `home` / `article` / `styleguide` / `error404` 320/390/768/1440/2560 light and dark (plus
  `article` 1920 light): nothing moves / the chassis shell pair reproduces the hand-rolled
  flex-column geometry byte-for-byte / no baseline names change; `magick compare -metric AE`
  is 0 on every one of the 203 compared before/after tiles and the full `site-visual.spec.ts`
  suite (44 tests) passes unmodified against the existing baselines.

### Task 4a: the composition primitives, site adoptions

Two real site uses stand as adopted: `.cairn-hero` on the styleguide masthead, `.cairn-section`
on the home page's `.index`. `.cairn-band` on the root error page's message block. Before set:
symlinked to the pass before set (`~/.cache/cairn-chassis-b/pass/before/`), since Task 3 (the
only predecessor to touch these surfaces) is itself paint-neutral, confirmed by its own row
above.

- `styleguide` 320/390/768/1440/2560 light and dark: no move / the masthead's `<header>`/`<h1>`/
  `<p>` move onto `.cairn-hero`/`.cairn-hero-title`/`.cairn-hero-lead`, and the scoped
  `.sg-title`/`.sg-lead` rules are deleted; the primitive's flex-column gap
  (`--cairn-hero-gap`, `--spacing-s`, 1rem) reproduces the deleted `.sg-lead`'s former
  `margin-top: var(--spacing-s)` exactly, and `.cairn-hero-title` carries no explicit
  `color: var(--color-base-content)` (unlike the deleted `.sg-title`) but inherits the
  identical value from `.cairn-site-shell`'s `text-base-content` class / no baseline names
  change; `magick compare -metric AE` is 0 on every one of the 44 compared before/after tiles.
- `home` 320/390/768/1440/2560 light and dark, `.index` gaps only: on `.index` (previously no
  box geometry of its own) `.cairn-section` adds a top and bottom `margin-block` of
  `--spacing-l` plus a `> * + *` rule opening a `--spacing-l` gap between `.index__head` and the
  tag filter, year heading, or entry that follows it (most already carried their own
  `--spacing-l` top spacing via unlayered rules of equal value and absorb the primitive
  unchanged; the entry immediately under `.index__head`, and any entry following another entry
  with no year heading between them, gains the new gap, since `.entry` itself declares no
  margin-top) / moves `site-home-{light,dark}-{320,390,768,1440,2560}.png` (10 files).
- `error404` 320/390/768/1440/2560 light and dark: the message block moves onto `.cairn-band`
  wrapping a centered `.mx-auto max-w-measure px-m` child; `--cairn-band-padding-block`
  (`--spacing-xl`, 3rem/48px) replaces the former `py-2xl` (`--spacing-2xl`, 4rem/64px), a
  16px reduction top and bottom, and the band gains its ground, `--color-base-200`, where the
  block previously painted transparent over `--color-base-100` / moves
  `error404-{light,dark}-{320,390,768,1440,2560}.png` (10 files).

The implementer's own read against the redesign rule: the home page change is a modest
loosening of vertical rhythm (added top/bottom margins at existing spacing values), with no
change to layout structure, color, or type; a `diff-reviewer` read confirms or overturns this
at the gate, and an overturn's reason and revert land here in the same commit as the fix.

### Task 4 fix round: the lead reversal and the two band bleeds

The `diff-reviewer` escalated five findings against 5ebdef55/c3d4ffc6; the conductor ruled two.
Before set: a fresh capture at `~/.cache/cairn-chassis-b/task-4-fix/before/` (home, error404,
styleguide only, taken on the clean c3d4ffc6 worktree, since Task 4a/4b's own before/after
already covers the paint this fix reopens). After set at
`~/.cache/cairn-chassis-b/task-4-fix/after/`.

- `home` 320/390/768/1440/2560 light and dark: RULING 1 takes `.cairn-section` off `.lead` and
  restores its pre-4a `padding-bottom: var(--spacing-l)` / `margin-bottom: var(--spacing-l)`
  (the reviewer measured a visible redesign of the lead's internal gaps at
  home-light-2560-00: 26px moved to 48px above the date, 49px moved to 81px above the link,
  50px moved to 17px below the link). `.cairn-section` STAYS on `.index`; those gaps are
  unchanged from the 4a row above / moves `site-home-{light,dark}-{320,390,768,1440,2560}.png`
  (10 files, the same ten 4a moved, now reverted on the `.lead` portion only).
- `error404` 320/390/768/1440/2560 light and dark: RULING 2 moves `.cairn-band` off the
  `.cairn-site-main site-main` main element and onto `main` directly (paired with
  `.cairn-site-main`, so the flex-item fix for the sticky footer still applies to `main`), with
  a new inner `.site-main` div (the centering-only concern) as the band's child; the band now
  reads edge to edge at every width instead of capped to the measure, so its `--color-base-200`
  ground fills the full viewport width behind the centered message / moves
  `error404-{light,dark}-{320,390,768,1440,2560}.png` (10 files).
- `styleguide` 320/390/768/1440/2560 light and dark: the Band demo gains
  `.cairn-place-full` (the figure-placement breakout in `src/theme/site.css`, reused rather than
  invented, since the demo already sits inside `.site-main` the way a figure does) so it bleeds
  off the styleguide's reading column the same as the real call site; the Section demo's two
  `<p>` children move off `.sg-note style="margin: 0;"` onto a new `.sg-section-block` class
  that declares no margin at all, so `.cairn-section`'s layered `> * + *` rule is no longer
  fought by `.sg-note`'s unlayered bottom margin and the gap actually paints; every tile above
  the Composition section stays AE 0 (confirmed per tile), the Card/Band/Section/Sidebar tiles
  move / moves `styleguide-{light,dark}-{320,390,768,1440,2560}.png` (10 files, the same ten
  Task 3/4a/4b left unchanged; non-zero AE confined to tile indices `-06`/`-07` at 1440,
  `-07`/`-08` at 2560, `-09`/`-10` at 320, `-07`/`-08`/`-09` at 390, and `-06`/`-07` at 768 in
  both schemes, all within or after the Composition section; every earlier tile at every width
  and scheme is AE 0 or within single-digit rounding).

Mechanical, non-paint-moving: the false "this page's own sections are `.cairn-section`" claim
(the comment above the Composition section and its visible paragraph) corrected to name the
home page's `.index` as the real call site; the card demo's "Nothing here is page-local
styling" sentence corrected to name `.sg-card-title`/`.sg-card-body` as page-local; the README's
"the home page's `.lead` and `.index` are `.cairn-section`" corrected to name `.index` only.

### Task 4b: the styleguide's composition section

A "Composition" section added to the styleguide (after "Components"). It shows `.cairn-card`,
`.cairn-band`, `.cairn-section`, and `.cairn-sidebar-layout` with two-sentence captions,
alongside the two primitives the page already carries a real call site for elsewhere
(`.cairn-hero` on the masthead, `.cairn-section` on the home page's `.index`). No composition
claim; the section is a demonstration, the sanctioned exception the ruled inputs name.

(Deviation from the task's stated files: `~/.cache/cairn-chassis-b/task-4b/before/` is a
symlink to `~/.cache/cairn-chassis-b/task-4/after/` (Task 4a's own after set), not a fresh
capture, since 4b builds directly on 4a's landed paint and a fresh before capture would only
reproduce that same after set.)

- `styleguide` 320/390/768/1440/2560 light and dark: the page grows by one section, so every
  tile at or after the previous end-of-page pushes down and new tiles appear past the former
  page length (confirmed by `magick compare -metric AE`: 0 on every tile before the new
  content, non-zero starting at the last pre-existing tile of each width, identical index in
  both schemes: `-06` at 768 and 1440, `-07` at 390 and 2560, `-09` at 320; every tile after
  that index is new, appended past the former page length) / moves
  `styleguide-{light,dark}-{320,390,768,1440,2560}.png` (10 files, the same ten Task 3/4a left
  unchanged).
