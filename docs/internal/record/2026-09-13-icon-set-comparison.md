# Lucide or Carbon for the cairn admin

A comparison for Geoff, 2026-09-13. Repo state: `main` at `a24bf4bb`. Package facts checked
against the npm registry and the extracted tarballs the same day. Verdict up front: keep Lucide
for the admin's functional glyphs, and consider `@carbon/pictograms` for empty states as a
separate, additive question.

## How Lucide enters the admin

The package depends on `@lucide/svelte` at `^1.17.0` (installed 1.33.0) as a **runtime
dependency**, not a devDependency, so every consumer site installs it transitively. Icons never
cross a public export: no subpath re-exports a Lucide component, and `/admin-toolkit` exports no
glyph.

Two barrels hold the vocabulary: `src/lib/components/admin-icons.ts` (30 per-icon re-exports, the
chrome set) and `src/lib/components/admin-nav-icons.ts` (33 per-icon imports behind
`ADMIN_NAV_ICONS`, `ENGINE_NAV_ICONS`, and two single-icon defaults). Eleven files import
`@lucide/svelte` directly, ten under `src/lib/components/` plus
`src/tests/unit/reproductions-icon-drift.test.ts`. `src/lib/admin-toolkit/ListToolbar.svelte`
reaches the barrel rather than the package.

Unique glyphs in use: **74**. The most-used are `check` (4 sites), then `triangle-alert`,
`trash-2`, `sparkles`, `plus`, and `list` at 3 each. Sizes, counted off the class attributes on
icon elements in `src/lib/components/*.svelte`:

| Class | Rendered px | Uses |
| --- | --- | --- |
| `h-4 w-4` and `size-4` | 16 | 67 |
| `h-3.5 w-3.5` and `size-3.5` | 14 | 37 |
| `h-5 w-5` and `size-5` | 20 | 20 |
| `h-3 w-3` and `size-3` | 12 | 25 |
| `h-6 w-6` and larger | 24+ | 8 |

Stroke width is Lucide's default 2 on a 24 viewBox, with round caps and joins. No component
overrides `strokeWidth` on a Lucide element. The `stroke-width` values in six other files belong
to hand-rolled inline SVGs, a second Lucide-shaped-but-not-Lucide vocabulary that exists today and
is independent of this decision.

## Where icons do and do not reach a consumer

The public-facing showcase theme uses **zero** Lucide. Its glyphs come through the render seam:
`renderGlyph(name, icons)` in `src/lib/render/glyph.ts` takes an `IconSet`, which is
`Record<string, string>` of raw path data on a 256 viewBox, and the chassis wraps it as
`makeIconRenderer` in `examples/showcase/src/chassis/render.ts`. That seam has no dependency on
Lucide's component shape, so a switch does not touch it and does not touch any theme.

Three couplings do reach a consumer.

1. `ADMIN_NAV_ICON_NAMES` and `NavIcon` in `src/lib/sveltekit/admin-nav.ts`, exported from
   `/sveltekit` and documented at `docs/reference/sveltekit.md:1635`. The 27 names are strings
   such as `anchor` and `graduation-cap`. A switch keeps the names and changes the artwork behind
   them, so it is a visible change, not a type break.
2. `src/lib/audit/norms.ts:109` declares the `icon` norm with `selector: 'svg.lucide'`, mirrored
   in `norms-manifest.json` and documented at `docs/reference/cairn-audit.md:445`. Carbon's
   components emit no `lucide` class, so this norm would silently match nothing on a switched
   admin. It is public, gated surface.
3. The transitive `@lucide/svelte` install disappears from the consumer's tree and a Carbon
   package replaces it.

So a switch is a short `Consumers must:` line, covering the audit norm and a bundled-icon
appearance change, never an API a site calls.

## Dependency weight

| Package | Version | Unpacked | Deps | Weekly downloads |
| --- | --- | --- | --- | --- |
| `@lucide/svelte` | 1.33.0 | 31 MB on disk | 0 | high |
| `carbon-icons-svelte` | 13.15.0 | 3.36 MB | 0 | 27,999 |
| `@carbon/icons` | 11.88.0 | 54.2 MB, 24,923 files | 1 (`@ibm/telemetry-js`) | 62,907 |
| `@carbon/pictograms` | 12.84.0 | 36.8 MB, 6,314 files | 1 (`@ibm/telemetry-js`) | 5,138 |

Both sets tree-shake per icon, so installed size is a disk cost, not a bundle cost. The
`@carbon/*` packages carry `@ibm/telemetry-js`, a build-time telemetry collector. Lucide has no
dependencies.

## What Carbon ships

`@carbon/icons` 11.88.0 carries **2,630 icon directories** in `es/`, covering 2,762 metadata
families and 11,030 output variants. License is Apache-2.0 across the family, standard notice
retention, no Carbon-specific attribution clause. `@carbon/icons-svelte` and
`@carbon/pictograms-svelte` do not exist; `carbon-icons-svelte` is the separately maintained
Svelte package.

Carbon icons are **filled paths, never strokes**. Verified in the tarball: `svg/32/add.svg` is a
single `<path>` of a plus-shaped polygon, and `trash-can.svg` is four filled rects and one filled
outline. Color comes from `fill="currentColor"`. Terminals are square, joins are hard, and the
artwork sits on a 2px-on-32 grid, a 1px effective stroke at 16px.

The four advertised sizes are not four drawings. In the tarball, `svg/32` holds 2,620 files,
`svg/16` holds 66, `svg/20` holds 9, and `svg/24` holds 8. Outside those short lists,
`es/<name>/16.js` carries `viewBox="0 0 32 32"` with `width: 16`, the 32 artwork scaled. Only
about 66 icons get a true small-size redraw.

`@carbon/pictograms` 12.84.0 holds **1,575 pictograms**, one size, `viewBox="0 0 32 32"`, also
filled paths. IBM positions them as illustrative marks for empty states, onboarding, and
marketing, distinct from the functional icon set.

## Svelte 5 support, the finding that matters

`carbon-icons-svelte` 13.15.0 published 2026-08-27 and works under Svelte 5, but it is not a
runes library, and it declares no Svelte peer range at all.

Read from the extracted `lib/Add.svelte`:

```svelte
<script>
  export let size = 16;
  export let title = undefined;
  $: labelled = $$props["aria-label"] || $$props["aria-labelledby"] || title;
  $: attributes = { ... };
</script>
```

That is `export let`, `$$props`, and `$:` reactive statements. Legacy mode, every one of the 5,536
components. It runs under Svelte 5 only because Svelte 5 still compiles non-runes components.
`npm view carbon-icons-svelte peerDependencies` returns empty, so nothing in the package pins a
Svelte major. The upstream issue (#195, "$$props can not be used in runes mode") is closed, and
13.0.0 declared dual Svelte 4 and 5 support by swapping the type defs rather than rewriting the
components. The repo tests against both majors and has zero open issues.

Tree-shaking works. The `exports` map publishes `./lib/*.svelte`, and the README tells you to
import `carbon-icons-svelte/lib/Add.svelte` rather than the barrel.

The escape hatch: `@carbon/icons` ships raw `.svg` files and plain JS descriptors of shape
`{elem, attrs, content, name, size}`, which a twenty-line local Svelte 5 component can render.
That costs one component and gives cairn full control of the runes contract.

## Coverage against the 74 names

Sixty-seven of the 74 map cleanly by name and meaning: `check` to `checkmark`, `plus` to `add`,
`trash-2` to `trash-can`, `x` to `close`, `pencil` and `square-pen` to `edit`, `triangle-alert` to
`warning--alt`, and onward through the chevrons, arrows, and document family. Seven have no clean
equivalent, verified by listing `package/es`:

| Lucide name | Where it is used | Nearest Carbon | Problem |
| --- | --- | --- | --- |
| `signpost` | the `nav` engine screen | `milestone`, `map` | no signpost exists |
| `newspaper` | every dated concept door | `blog`, `document--multiple-02` | changes what a dated concept looks like |
| `puzzle` | component blocks, nav allowlist | `plug` | reserved metaphor is lost |
| `blocks` | the editor Insert group | none | no assembled-blocks mark |
| `inbox` | nav allowlist | `mail--all`, `datastore` | no tray |
| `sparkles` | the AI affordances, 3 sites | `magic-wand` | wand reads as a tool, sparkles as a suggestion |
| `banknote` | nav allowlist | `currency--dollar`, `money` | the dollar mark is US-specific |

Two read differently without being worse. `menu` is four bars in Carbon and three in Lucide, so
the hamburger gets denser. `edit` is a pencil over a baseline, which arguably reads more precisely
as "edit this line". Two are clearly better in Carbon: `launch` beats `external-link` at small
sizes because it drops the boxed frame, and `view` and `view--off` are cleaner than `eye` and
`eye-off`, which crowd at 12px.

## Visual judgment

Renders: twelve of the most-used glyphs at 16 and 20, each alone and beside Figtree body text at
the admin's `--cairn-type-body` of 14px/1.25rem, on the admin's own `--color-base-100` grounds.

- the session scratchpad render `2026-09-13-icons-light.png` (not committed), ground `oklch(99% 0.004 75)`, ink `oklch(26% 0.014 75)`
- the session scratchpad render `2026-09-13-icons-dark.png` (not committed), ground `oklch(24% 0.01 75)`, ink `oklch(93% 0.006 75)`
- Source page and generator: `iconwork/compare.html` and `iconwork/gen.mjs` in the same scratchpad

**Weight.** Lucide draws 2 units on a 24 grid, a stroke-to-box ratio of 0.083. Carbon draws 2 on
32, a ratio of 0.0625. At 16px that is 1.33px against 1.0px, and the 33 percent gap is plainly
visible. Carbon reads lighter than Figtree 400 beside it. Lucide reads at or just above the text
weight, which is the correct relationship for a glyph that shares a line with a label.

**Optical size.** Carbon glyphs fill less of their box. The Carbon checkmark, plus, and chevrons
are visibly smaller than Lucide's at the same declared px. In the `Next` and `Close` rows the
Carbon mark sits as a faint tick beside the word, and the pair stops reading as one unit.

**Corner treatment.** Lucide is round-capped and round-joined, soft and slightly drawn. Carbon is
square-terminated with hard joins, crisp and engineered. Carbon's treatment is the more
disciplined one in the abstract. Against Figtree, a geometric sans with rounded terminals of its
own, Lucide is the closer fit.

**Dark ground.** The gap widens. Carbon's 1px strokes at 16 read frail on `oklch(24%)`, noticeably
below the ink weight of the label beside them. `chevron--right`, `close`, and `search` are the
worst. Lucide holds parity on both grounds.

**Against DaisyUI.** DaisyUI 5 controls at the admin's scale carry visible borders around 1px and
medium-weight labels. Lucide at 16 sits level with that. Carbon at 16 sits under it, so an icon
inside a DaisyUI button would read as a secondary mark rather than part of the control.

**The small sizes are the decider.** The admin renders 62 icons at 14px or 12px. Carbon has no 12
or 14 grid, so those scale from the 16 or 32 artwork to an effective stroke of 0.875px and 0.75px.
Sub-pixel strokes render grey and soft at 1x. Lucide at 12px lands on exactly 1.0px, and at 14px on
1.17px. This is not a taste question, it is a rendering one, and the admin's second and fourth most
common sizes are both in the bad zone.

More professional on its own: Carbon, by a little, on corner discipline. More professional inside
*this* admin: Lucide, by a clear margin, on weight parity with Figtree and with DaisyUI, and on
holding up at 12 and 14 px.

## Cost of switching

Files touched: 10 component and barrel files under `src/lib/components/`, one unit test, one audit
norm plus its manifest, and three doc pages. Roughly 15 files, most of them mechanical.

The render seam is untouched. `makeIconRenderer` binds to `IconSet` path data, never to a
component shape, so no theme and no public page changes.

Real work, beyond the renames:

- `src/tests/unit/reproductions-icon-drift.test.ts` reads `iconNode` out of installed Lucide
  `.svelte` files to hold the editor-toolbar story's transcribed paths. It would be rewritten
  against Carbon's descriptor shape, and its 6 paths in `src/lib/reproductions/stories/editor.ts`
  re-transcribed. One of the 6, `blocks`, has no Carbon equivalent.
- The audit `icon` norm's selector, its manifest, and the documented rule.
- Seven glyphs need a metaphor decision, `newspaper` most consequentially.
- `docs/internal/admin-design-system.md:1161` names Lucide as the icon system.

Visual baselines: 79 PNG baselines in the showcase e2e snapshots, **28 of them admin**. All 28
regenerate, and per the CI-canonical rule that regen happens on CI, not here.

A mixed period is not acceptable. The two sets differ in stroke weight by 33 percent and in
terminal treatment entirely, so any screen carrying both reads as a mistake rather than a
transition. If a switch happens it is one pass, all 74 names, with the baselines regenerated once.

## Recommendation

**Keep Lucide for the admin's functional glyphs.** The register cairn wants, clean and
conventional and understated, is what Lucide already delivers at the sizes the admin actually
uses. Carbon's icons are drawn for Carbon: IBM Plex, a denser grid, and interfaces that rarely go
below 16px. Dropped into a Figtree admin that renders 62 of its icons at 12 or 14 px, Carbon's
1px-on-32 weight reads thin against the text and thin against the DaisyUI controls beside it,
worse on the dark ground than the light. Adopting Carbon buys corner discipline and pays for it in
weight parity, and weight parity is the thing a reader notices.

Three supporting reasons, none decisive alone. The `carbon-icons-svelte` components are legacy
Svelte 4 syntax with no declared peer range, so a runes-first engine would depend on backward
compatibility rather than on a contract. Seven of the 74 glyphs have no equivalent, including
`newspaper`, the default door for every dated concept a site declares. The switch costs 28
regenerated baselines, an audit-norm change on gated public surface, and a rewritten drift test,
for a lateral outcome.

**Adopt `@carbon/pictograms` for empty states, as its own small question.** This is the one place
Carbon is clearly additive rather than substitutive. The admin's `EmptyState` primitive currently
has no illustrative mark, pictograms are a register cairn does not own, and 1,575 Apache-2.0
pictograms at a single 32 grid are exactly the empty-state and onboarding vocabulary IBM drew them
for. They live at a different scale from the functional glyphs, so the weight mismatch that sinks
the icon switch does not apply. Consume them as raw SVG through a small local component rather
than a Svelte package, since `@carbon/pictograms-svelte` does not exist.

**If visual identity is the real goal, the higher-leverage move is elsewhere.** Lucide reads
generic because it is the same set as everything else, and swapping in another off-the-shelf set
trades one borrowed identity for another. The admin's distinctiveness already comes from Warm
Stone, Bricolage, and the component recipes. A drawn mark or two at the places a user looks
longest, the brand tile and the empty states, buys more identity than 74 replaced glyphs.

**Worth doing regardless:** the hand-rolled inline SVGs in `EditPage.svelte`, `HelpHome.svelte`,
`MediaFigureControl.svelte`, `EditorToolbar.svelte`, `ReferenceField.svelte`, and
`editor-folding.ts` are a second, unmanaged vocabulary drawn to approximate Lucide. That is a real
consistency defect today, and folding it into the barrels is cheaper than any icon-set migration.
