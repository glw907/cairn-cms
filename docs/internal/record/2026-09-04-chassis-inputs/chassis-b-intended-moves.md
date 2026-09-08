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
