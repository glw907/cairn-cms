# Chassis-B intended moves

The pass-wide record `scripts/capture-surfaces.mjs` (Task 1) and every paint task write to.
The verifier reads this file, never a task's own report. A paint task that moves a baseline
without appending its row here is a blocking finding at the diff gate.

## The pass before set

Captured `docs/superpowers/plans/2026-09-07-chassis-b1-pass.md` Task 1, Step 2, at the branch
point, before any paint task ran:

- **Commit:** `2025689bee1ea45ec83d55eb40c8068408fccc5c`
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

(No rows yet; Task 1 lands no paint.)
