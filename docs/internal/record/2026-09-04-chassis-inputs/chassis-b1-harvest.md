# Chassis-B1 harvest

What the pass learned, banked for chassis-B2, the next theme or site chassis pass, and any
future changed-by-design pass that needs the same visual-fidelity adaptation. The second-menu
editing question the fresh showcase review raised is B2's, not this pass's, and stays there.

## The composition primitives, proven or not

- **`cairn-hero`, `cairn-section`, and `cairn-band` earned real site call sites** in this
  theme: the styleguide masthead, the home page's index, and the root error page's message
  block. Each adoption's paint delta is small and named in numbers in the intended-moves
  manifest (a hero gap, a section margin, a band ground and padding change); none of the three
  read as a visible redesign once the `.lead` reversal (see below) was applied.
- **`cairn-card` and `cairn-sidebar-layout` have no real call site in this theme.** The
  members pages are template-excluded fixtures and the home lead is not a card-shaped region;
  an article has no sidebar-shaped content either (`related` renders as a block in the reading
  flow, and giving it a rail would be a design change, not an adoption). Both are proven only
  on the styleguide's composition section, the sanctioned exception a styleguide exists for.
  A future theme with a genuine card grid or a sidebar-shaped region is the one that adopts
  these for real; do not treat their absence here as evidence the primitives are unused, only
  that this theme's content shape does not call for them.
- **A primitive landing on a page that already carries unlayered rules of the same value is
  invisible paint.** `.cairn-section` on the home page's `.index` mostly matched spacing the
  page's own CSS already declared at the same value, so most of its rows showed zero visual
  delta even though the rule genuinely changed ownership. Only rows with no prior margin (an
  entry with no year heading above it) picked up new gap. The lesson for the next adoption:
  compute the delta from the CSS diff, not from a visual diff alone, since a real paint-owning
  change can render pixel-identical to what it replaced.
- **A layered `> * + *` gap rule loses to an unlayered sibling declaration of any value,
  including zero.** The Task 4 fix round found the styleguide's Section demo paragraphs
  carrying `style="margin: 0;"` inline, which beat `.cairn-section`'s `@layer components` gap
  rule outright. The fix moved the inline style to a named class (`.sg-section-block`) that
  declares no margin at all, letting the layered rule win. Any future primitive adoption onto
  markup with inline styles or unlayered utility classes needs the same check: read computed
  specificity and layer order, not just "the class is present."
- **A full-bleed band needs `.cairn-band` on `main` itself, not on an inner wrapper still
  capped to the reading measure.** The first Task 4a landing put the band on
  `.cairn-site-main site-main`, which is already capped by `.site-main`'s `max-width`; the
  fix round moved it to `main` directly (paired with `.cairn-site-main` for the flex-item
  sizing the sticky footer needs) with a new inner `.site-main` div doing only the centering.
  The primitive's own contract, a full-bleed strip with a centered container as its child, only
  holds if the strip element and the width-capped element are different elements.

## The capture tool and the tile protocol

- **Derive, don't rebuild, when a prior tool already solved the server recipe.** The Task 1
  tool started from the last committed `reference-capture.mjs` (chassis-A deleted it) rather
  than re-deriving the preview-server webServer recipe and the admin theme cookie from scratch;
  both were already correct there. A future capture tool for a different surface set should
  look for the nearest prior tool first.
- **The preview-server availability is per-surface, not global, and worth a header comment
  next to the tool.** `vite preview` under this theme's own build serves `home`, `article`,
  `styleguide`, and `signups` (the dev backend mints an owner on every `/admin` request, so no
  session flow is needed), 404s `archive2` by design (page size exceeds the corpus), and DOES
  render the root `+error.svelte` fully for a genuinely unmatched route (full SSR, status 404,
  with the site's own nav and footer). That last fact was not assumed; it was checked, and it
  meant `error404` needed no second webServer recipe, which the plan had budgeted for as a
  live risk.
- **Tiles, never full-page files, are what a grading agent reads.** Bands of at most 1400 CSS
  px with a 60 px overlap kept every tile readable at native resolution without truncating
  content at a band boundary; the manifest (file, surface, scheme, width, tile index, pixel
  size, sha256) let every later task and the reviewer look up a tile by name instead of
  re-deriving indices.
- **`--focus <selector>` mode (Task 5) is the shape a future ring or interaction-state
  capture reuses**: tab to the first matching control, then capture, rather than trying to
  script a hover or focus state through CSS class injection.

## The baseline regen loop

- **`--update-snapshots=changed` by file path, never the bare flag, and verify the installed
  Playwright's default before trusting it.** The bare flag's default has changed across
  Playwright releases; `all` would rewrite every baseline with a workstation render, discarding
  every already-correct one. Task 1 verified the installed version accepts `=changed` before
  any task relied on it.
- **A locally regenerated baseline is provisional until the CI regen's diff is read over
  it.** Every paint task regenerated by file path locally, gated the diff-reviewer on those
  tiles, and only the CI regen (dispatched by the conductor after Task 2's new surfaces and
  again at pass end) is the baseline of record. This caught nothing different from the local
  renders in this pass, but the loop is what makes that a checked fact rather than an
  assumption.
- **`magick compare -metric AE` per tile is cheap enough to run on every touched surface for
  every paint-neutral task**, and it catches sub-pixel render-timing noise (two outliers on
  the admin signups page in Task 5, both on a surface that task's file set never touched, both
  confirmed as invisible by a diff render) that a human eye would never flag and a baseline
  hash comparison would.

## The focus ring

A single grep (`outline: 2px solid var(--color-primary)`) found every hand-written ring; the
re-derived count (20) matched the spec's number, which is worth re-deriving anyway since a
spec's count is a snapshot, not a live query. The utility carries outline and offset only,
deliberately no radius, since several call sites already carry their own unconditional
border-radius that a bundled radius would fight on focus. A theme-level radius override stays
possible as an intentional divergence from the chassis default, documented in place rather than
silently inherited.

## What did not make this pass

`.cairn-card` and `.cairn-sidebar-layout` remain proven only on the styleguide in this theme,
per above; a future theme adopting them for real is where their site-use gap closes. The
`archive2` surface stays `.missing` through this pass by design (B2's own surface). The
second-menu editing question the fresh showcase review raised, and the `.js` specifier
survivors chassis-A's grep pattern cannot reach, are both B2's to close.
