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

### Task 5: one focus ring

Before set at `~/.cache/cairn-chassis-b/task-5/before/`, a fresh capture at ff3320e3 (Task 4's
fix commit, the clean parent of this task), covering every surface the tool knows (home,
article, styleguide, archive2, error404, signups); after set at
`~/.cache/cairn-chassis-b/task-5/after/`. The re-derived grep count
(`grep -rn "outline: 2px solid var(--color-primary)" examples/showcase/src`) was 20 (6 in
prose.css, 14 across the theme and route files), matching the spec's number.

- No surface moves. `tokens.css` defines `--cairn-focus-ring-outline`/`-offset`/`-radius` and a
  top-level `@utility cairn-focus-ring` (outline and offset only, deliberately no radius: several
  call sites already carry their own unconditional border-radius, a pill or a DaisyUI field
  radius, and a radius bundled into the utility's `:focus-visible` state would fight that on
  focus). `theme.css` drops its own `--cairn-focus-ring-radius` (the chassis default is already
  2px, so the value is unchanged, only its owning file moves). prose.css's six directive sites and
  seven descendant-selector sites (`.lead__title a`, `.lead__link`, `.entry__title a` on the home
  and archive pages, `.site-nav a` on SiteHeader and SiteFooter, `.meta a` on ArticleView) read
  the two tokens in place; seven element-direct sites (`.tag-filter__option`, `.pagination__link`
  on the home and archive pages, `.sg-tab`, `.sg-summary`, `.sg-cta-btn`, `.theme-toggle`) drop
  their hand-written rule and take the `cairn-focus-ring` class in markup instead. `magick compare
  -metric AE` is 0 on every one of the 227 compared tiles across home, article, styleguide,
  error404, and signups except two sub-pixel outliers with no visible content
  (`signups-light-2560-00`: AE 0.27 of 2,048,000 px, normalized 1.3e-07; `signups-dark-320-00`: AE
  0.0065, normalized 2.6e-08), both on the admin signups page, which this task's file set never
  touches; a diff render of the larger outlier shows no visible pixels, consistent with render
  timing/anti-aliasing noise rather than a paint change. `archive2` stayed `.missing` in both sets
  (the known page-two 404, unrelated to this task). The unmodified visual suite
  (`site-visual.spec.ts` + `admin-visual.spec.ts`) ran green (74 passed) with zero failing
  snapshot names, so no baseline moves.

### Task 6: the entry row once

Before set at `~/.cache/cairn-chassis-b/task-6/before/`, a symlink to `~/.cache/cairn-chassis-b/
task-5/after/` (Task 5's own after set, captured at the same commit, `c4c396ad`, this task's
clean parent; no predecessor since Task 5 moved paint under this task's surfaces, so a fresh
capture would only reproduce that same after set); after set at `~/.cache/cairn-chassis-b/
task-6/after/`, a `--only home,article` capture (this task's file set touches only the home page
and the `/archive/[page]` route's markup, both feeding into the new `EntryRow` component; the
archive route is not itself a baselined surface, so `home` and `article` are the tile-bearing
surfaces to check).

- `home` and `article` 320/390/768/1440/2560 (plus `article-light-1920`) light and dark: NO
  surface moves. `src/theme/components/EntryRow.svelte` is created, carrying the `.site-entry*`
  markup and stylesheet (renamed from `.entry*`) and the `@media (max-width: 34rem)` narrow-width
  block, moved byte-for-byte from the home page's and the archive route's own `<style>` blocks;
  the three `<article class="entry">` call sites (two on the home page: the filtered list and the
  year-grouped archive; one on `/archive/[page]`) are replaced by `<EntryRow {post} />`; the
  title link now carries `cairn-focus-ring` in place of its own hand-written
  `.entry__title a:focus-visible` rule (the same token pair Task 5 already wired), a pure rename
  and relocation with no value change. `magick compare -metric AE` is 0 on every one of the 115
  compared tiles across `home` and `article` in both schemes; the unmodified visual suite
  (`site-visual.spec.ts` + `admin-visual.spec.ts`) ran green (74 passed) with zero failing
  snapshot names, so no baseline moves.

## `.missing` reconciliation (Task 7)

The pass before set listed ten `.missing` entries, all `archive2` at every width in both
schemes. None of the six landed tasks (2 through 6) touch `archive2`: it never joins the
width matrix in Task 2 (only `error404` and `signups` do), and no paint task's surfaces list
names it. The marker is unchanged and expected to remain unchanged through this pass's own
after set for the reason recorded above: `ARCHIVE_PAGE_SIZE` is 50 and the showcase's own
corpus fits on page one, so `/archive/2` has no real page to render until B2's archive proof
(27 posts at page size 13) gives it one. `archive2` is B2's surface by the reconciliation
block at the top of this plan's Task 7, not an unaccounted-for gap in B1's own after set.

## Task 7 fix round: the band-to-footer seam and the message measure

Before set at `~/.cache/cairn-chassis-b/task-7-fix/before/`, a symlink to
`~/.cache/cairn-chassis-b/task-5/after/` (this fix round's file set never touches Task 6's
surfaces, so Task 5's own after set, at the last commit before the harvest, is the correct
parent); after set at `~/.cache/cairn-chassis-b/task-7-fix/after/`, a `--only
error404,styleguide` capture (the two surfaces the pass-end verifier named).

- `error404` (attempted, did not move; corrected in the Task 7 fix 2 round below): RULING 1's
  band adoption left `.cairn-band` on `<main>` full-bleed and the plain `SiteFooter`'s own
  `mt-2xl` still fired below it, so a base-100 strip (the page's own ground, since neither the
  band nor the footer paint it) sat between the band's base-200 ground and the footer's own
  base-200 ground. This round added `.cairn-band + .site-footer { margin-top: 0; }` to
  `src/chassis/composition.css`, intending the band to own its own exit, but the rule never
  applied: it sits in `@layer components`, and `mt-2xl` is a Tailwind utility in `@layer
  utilities`, which Tailwind v4 orders AFTER `components` regardless of the two rules' relative
  selector specificity, so the utility kept winning and the strip stayed open. The 320 tile
  height was unchanged (864px) and the strip measured 64 to 85px at every width; see the Task 7
  fix 2 round for the working fix.
- `error404` 320/390/768/1440/2560 light and dark: the message measure and the 320 inset return
  to their pre-pass values. RULING 2's "unbleed" commit (`ff3320e3`) moved `.cairn-band` onto
  `<main>` itself and dropped the `site-main` class from `<main>`, leaving only one level of
  `.site-main` padding/max-width around the message block where the pre-pass markup had two
  (the pre-pass `<main class="site-main">` wrapped an inner `<div class="mx-auto max-w-measure
  px-m ...">`). `src/routes/+error.svelte` restores that inner wrapper
  (`<div class="mx-auto max-w-measure px-m">`) around the h1/p/a inside `.cairn-site-main`'s
  `.site-main` child, so the text block again measures against the doubled padding and
  max-width the pre-pass page used; the band's full-bleed structure from RULING 2 is untouched.
  Verified against the pass's own before set (`~/.cache/cairn-chassis-b/pass/before/`): the
  320 and 1440 light tiles' text wraps ("This page doesn't exist. It / may have moved, or the
  link took a / wrong turn." at 320; "This page doesn't exist. It may have moved, or the link
  took a / wrong turn." at 1440) match byte-for-byte with the fixed after tiles.
- `magick compare -metric AE` on `styleguide`'s full tile set (92 tiles across five widths and
  both schemes) is 0 for every tile: the `.cairn-band + .site-footer` rule never matches inside
  the Composition section, where the Band demo's own footer never directly follows it. The
  unmodified visual suite (`site-visual.spec.ts` + `admin-visual.spec.ts`) failed exactly the
  ten `error404` baselines at all five widths in both schemes, matching this round's own
  `INTENDED MOVES:`; every other baseline (`site-home`, `reading-surface-article`,
  `styleguide`, `signups`, the clamp-slope and no-background-seam probes) stayed green, so
  those ten are the full `MOVED BASELINES:` list, regenerated by file path
  (`site-visual.spec.ts --update-snapshots=changed`).

## Task 7 fix 2 round: the band-to-footer seam, actually closed

The verifier read the built sheet and found the previous round's `.cairn-band + .site-footer {
margin-top: 0; }` never applied: it lives in `@layer components` (composition.css, imported
inside tokens.css's Tailwind stack) while the footer's `mt-2xl` is a Tailwind utility, and
Tailwind v4's layer order (theme, base, components, utilities) lets the utility win regardless of
selector specificity. Proof cited: the 320 tile height unchanged at 864px, the strip 64 to 85px at
every width.

Fix: the footer's top margin is itself a chassis mechanic, so it moves into `@layer components`.
`mt-2xl` is removed from `SiteFooter.svelte`; `src/chassis/composition.css` adds `.site-footer {
margin-top: var(--spacing-2xl); }` (the same token value `mt-2xl` read), directly above the
existing `.cairn-band + .site-footer` cancel rule, so both halves of the seam now share a layer
and the higher-specificity compound selector wins within it as intended.

Before set: `~/.cache/cairn-chassis-b/task-7-fix2/before/`, a symlink to
`~/.cache/cairn-chassis-b/task-7-fix/after/` (this round's file set never touches Task 6's
surfaces, and the prior fix round's after set is the correct, if buggy, parent). After set at
`~/.cache/cairn-chassis-b/task-7-fix2/after/`, a `--only error404,home,styleguide` capture.

- Built-sheet proof: the produced client CSS (`theme.BerVti6Q.css`) shows `.site-footer{margin-
  top:var(--spacing-2xl)}.cairn-band+.site-footer{margin-top:0}` immediately after `.cairn-band`'s
  own declaration block, both inside the same `@layer components` block; no `.mt-2xl` utility is
  emitted at all (nothing references it anymore). The 320 `error404` tile height drops from 864px
  (before) to 800px (after), closing the full 64px strip.
- `error404` 320/390/768/1440/2560 light and dark: the band-to-footer seam closes for real, and it
  closes at all ten widths, not six. 768 and 1440 were not exempt from the strip: the fix-1
  captures show it there too, 69px at 768 and 76px at 1440, measured directly. What differs at
  those two widths is that `.cairn-site-shell`'s `min-height: 100vh` and the suite's fixed 800px
  viewport already fixed the document at 800px tall before this fix, so removing the extra margin
  cannot shrink a height that was already pinned. What the fix changes there instead is color: the
  freed 64px band recolors from whatever showed through the old margin gap to the band's own
  ground, in place, with no height change to show for it. Every pixel in that band shifted by 7 to
  9 levels out of 255, a delta under `toHaveScreenshot`'s default per-pixel threshold, so the
  unmodified suite reported those four baselines unchanged even though the rendered output moved.
  This corrects the plan's working assumption of six moves; the real `MOVED BASELINES:` list is
  `error404-{light,dark}-{320,390,768,1440,2560}.png` (10 files) / `site-visual.spec.ts --update-
  snapshots=changed` regenerated only the 320/390/2560 six under the suite's own threshold,
  `magick compare -metric AE` between the task-6/after and task-7-fix2/after `home` tiles is 0 (10
  of 10), and the `styleguide` tiles against `task-7-fix/after` are 0 (10 of 10, the sanctioned
  Band-demo exception stays a nested, non-direct-sibling case).
- `home` and `styleguide` 320/390/768/1440/2560 light and dark: no move, confirmed above; neither
  page has a `.cairn-band` directly preceding its footer.
- The full suite (`site-visual.spec.ts` + `admin-visual.spec.ts`) ran green after the update: 46 +
  28 = 74 passed, 0 failed.

## B2

### The pass before set

Captured `docs/superpowers/plans/2026-09-07-chassis-b2-pass.md` Task 1, at the branch point,
before this task's own changes:

- **Commit:** `58ed9d1f` (the chassis-b merge into `main`, B2's own branch point)
- **Location:** `~/.cache/cairn-chassis-b2/pass/before/`
- **Tool:** `examples/showcase/scripts/capture-surfaces.mjs`, full surface matrix (no `--only`)
- **Surfaces:** `home`, `article` (plus its light-only 1920 extra), `styleguide`, `archive2`,
  `error404`, `signups`
- **Widths:** 320, 390, 768, 1440, 2560 (plus 1920 for `article`, light only)
- **Schemes:** light, dark
- **Manifest entries:** 278 (44 home, 92 article incl. the 1920 extra, 102 styleguide, 20
  error404, 20 signups; `archive2` writes ten `.missing` files, not manifest entries)

`archive2` is still `.missing` at every width in both schemes (`ARCHIVE_PAGE_SIZE` is still 50;
Task 2 owns the page-size change). `task-1/before/` symlinks to this set, since Task 1 is B2's
first task and no predecessor moved paint.

## Row log

### Task 1: the thirteen posts

Step 1 (the first seven 2025-dated posts) lands no paint by itself (the delivery layer already
globs every file under `src/content/posts/`, so the showcase's home page already reflects the
growing corpus mid-task, but the paint protocol only captures once at each task boundary). Step 2
adds the remaining six, bringing the showcase corpus to 27 posts (14 original plus 13 new,
2025-dated), all excluded from the scaffold by path.

- `home` 320/390/768/1440/2560 light and dark: the home page lists `entries.slice(1)` (all posts
  but the featured lead) at `ARCHIVE_PAGE_SIZE` (still 50 in this task), so the row count grows
  from 13 to 26 (27 posts minus the one featured lead) and a new "2025" year heading appears
  above those rows (the year-grouped archive shape in `src/chassis/archive.ts` groups by
  `entry.date.slice(0, 4)`, and every prior post predates 2025), and every home baseline grows
  taller with it / thirteen new posts added to `src/content/posts/`, unexcluded from the
  showcase's own delivery glob / moves `site-home-{light,dark}-{320,390,768,1440,2560}.png` (10
  files).
- `article`, `styleguide`, `error404`, `signups` at every width and scheme: no move / none of
  these surfaces render the posts index / no baseline changes; `magick compare -metric AE`
  between `task-1/before/` and `task-1/after/` is 0 on every tile of all four (193 of 193
  compared: 81 article, 92 styleguide, 10 error404, 10 signups). `archive2` stays `.missing` in
  both sets (still 404 at `ARCHIVE_PAGE_SIZE = 50`), so it has no image tile to compare.
- Produced, not asserted: the unmodified `site-visual.spec.ts` + `admin-visual.spec.ts` run
  reported exactly the 10 `site-home-*` failures listed above and 64 passed; `--update-
  snapshots=changed` regenerated exactly those 10 files, matching this row's `INTENDED MOVES:`
  name for name.

### Task 2: the archive proven

Own before set captured at this task's parent commit (`3c6fcd2d`, Task 1's own last commit),
not symlinked from `task-1/`: Task 1 moved `site-home-*` paint, so `task-1/after/` is not a
valid stand-in for `task-2/before/`.

- `home` 320/390/768/1440/2560 light and dark: `ARCHIVE_PAGE_SIZE` drops from 50 to 13, so page
  one now shows 13 rows (all still 2026) under the lead instead of all 26, closing with a new
  "Page 1 of 2 / Older→" pagination block that did not render at page size 50 / the constant
  change in `src/chassis/archive.ts` / moves `site-home-{light,dark}-{320,390,768,1440,2560}.png`
  (10 files).
- `archive2` (`/archive/2`) 320/390/768/1440/2560 light and dark: NEW, first real render. At
  page size 50 the route 404s (`.missing` in the before set); at 13 the 26-entry slice (27
  posts minus the featured lead) splits into two full pages of 13, so page two now serves the
  13 "2025" entries under one year heading and a "Page 2 of 2 / ← Newer" pagination block / the
  same constant change / adds `archive2-{light,dark}-{320,390,768,1440,2560}.png` (10 files, all
  new).
- `article`, `styleguide`, `error404`, `signups` at every width and scheme: no move / none of
  these surfaces render the paginated archive / `magick compare -metric AE` between
  `task-2/before/` and `task-2/after/` is 0 on every tile of all four (193 of 193 compared: 81
  article incl. the 1920 extra, 92 styleguide, 10 error404, 10 signups).
- `admin-office-*`: this task's plan draft expected the count line and pagination control to
  move (a 14-to-27-post corpus growth reaching `/admin/posts`'s own client-side pagination).
  The unmodified `admin-visual.spec.ts` run reported no `admin-office-*` failure: the admin
  route's post listing reads the dev backend's own seeded fixture, not the public
  `src/content/posts/` directory the showcase corpus lives in, so the thirteen new posts (added
  in Task 1) never reach that screen and `ARCHIVE_PAGE_SIZE` (a public-route constant) cannot
  move it either. This corrects the plan's working assumption; `admin-office-*` carries no row
  because it never moved.
- Produced, not asserted: the unmodified `site-visual.spec.ts` + `admin-visual.spec.ts` run
  reported exactly 20 failures (`site-home-*` and `archive-page-2-*`, both suites' full names
  listed in the implementer report) and 64 passed; `--update-snapshots=changed` scoped to `-g
  "site home|archive page 2"` regenerated exactly those 20 files, matching this row's `INTENDED
  MOVES:` name for name. `scripts/capture-surfaces.mjs`'s own `archive2` capture needed a small
  fix alongside this task's own files: the route carries no page-level `h1` (the home route's is
  the one the archive shares), so the tool's default `waitFor` (which waits on `h1`) timed out
  once the route stopped 404ing; it now waits on the route's own year heading instead.

### Task 3: site identity and one title convention

Own before set captured at this task's parent commit (`4de378ec`, Task 2's own last commit, after
its CI regen was pulled): `home`, `article` (plus its light-only 1920 extra), `styleguide`,
`archive2`, `error404`, `signups`, every width, both schemes (314 manifest entries, no
`.missing`).

- `home`, `article` (incl. the 1920 extra), `styleguide`, `archive2`, `error404`, `signups` at
  every width and scheme: no move / the wordmark text (`page.data.siteName`) resolves to the same
  literal ("Waymark") the hard-coded string it replaces already read, and every touched `<title>`
  is not part of the painted surface / `magick compare -metric AE` between `task-3/before/` and
  `task-3/after/` is 0 on every tile of all six surfaces (253 of 253 compared: 34 home, 81
  article incl. the 1920 extra, 92 styleguide, 26 archive2, 10 error404, 10 signups).
- Produced, not asserted: the unmodified `site-visual.spec.ts` run (before this task's changes,
  at the `4de378ec` parent commit, and again after) reports the identical 20 failures
  (`site home` and `archive page 2`, every width and scheme) both times, byte-for-byte the same
  test names; each failing tile's own `AE` is small (for example 220 of ~1.49M pixels on
  `site-home-light-320`, `0.000148` fraction) and the diff overlay shows no structural change,
  consistent with a local-font-rendering mismatch against the committed `-linux.png` baselines
  (regenerated by a CI run in Task 2) rather than a real paint move. This drift predates Task 3
  and this task moves no baseline, so `MOVED BASELINES:` is empty; the 20 pre-existing failures
  are not this task's to regenerate.

### Task 4: the footer nav out of code

Own before set captured at this task's parent commit (`9e472aa7`, Task 3's own last commit):
`home`, `article` (plus its light-only 1920 extra), `styleguide`, `archive2`, `error404`,
`signups`, every width, both schemes (314 manifest entries, no `.missing`).

- `home`, `article` (incl. the 1920 extra), `styleguide`, `archive2`, `error404`, `signups` at
  every width and scheme: no move / `menus.footer`'s three entries (Writing `/`, Admin
  `/admin`, Feed `/feed.xml`) are the same labels and hrefs `SiteFooter.svelte`'s removed array
  already rendered, and every surface but `signups` shows the footer / `magick compare -metric
  AE` between `task-4/before/` and `task-4/after/` is 0 on every tile of all six surfaces (253
  of 253 compared: 34 home, 81 article incl. the 1920 extra, 92 styleguide, 26 archive2, 10
  error404, 10 signups).
- Produced, not asserted: the unmodified `site-visual.spec.ts` + `admin-visual.spec.ts` run
  reports the same 20 pre-existing failures Task 3 recorded (`site home` and `archive page 2`,
  every width and scheme, byte-for-byte the same test names, `4de378ec`'s own CI-baseline list)
  and 64 passed; this task moves no baseline, so `MOVED BASELINES:` is empty.
- The second-menu editing question (`/admin/nav` is bound to `menus.primary` only, so
  `menus.footer` is developer-edited in `site.config.yaml`) is a chassis harvest item, an
  engine consultation candidate rather than a site-side patch.
