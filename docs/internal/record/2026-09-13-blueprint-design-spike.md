# Blueprint MCP design spike: making Waymark and cairn.pub less stock

Read-only spike. No repo files were edited. Raw tool responses are saved under
`scratchpad/blueprint-spike/` (readable JSON) and `scratchpad/blueprint-spike/out/` (raw JSON-RPC).

## Brief: what Blueprint can and cannot contribute

daisyUI Blueprint is a prompt library, not a design engine. Every tool call returns text
instructions and structured guidance for the calling agent to act on; nothing renders, computes a
palette from an image, or checks the result against a rendered page. `daisyui_creative_director`
returns one named trend's guidance text (fonts, color and layout language, do/don't lists).
`daisyui_page_architect` returns a generic content-inventory and component list for a named page
archetype, drawn from a fixed catalog of ~200 SaaS/e-commerce/dashboard page types, none specific
to a markdown reading site. `convert_picture_to_theme` does not accept an image at all: its input
schema is empty, and calling it just returns a recipe ("look at the image, follow these rules,
write oklch values") for the calling agent to execute with its own vision. `daisyui_rules_enforcer`
is almost entirely accessibility/component-syntax/theme-plumbing rules; the only anti-generic
content in the whole toolset lives in `creative_director`'s `creative/originality` and
`creative/composition` sections ("ask if the same visual direction describes most competitors",
"do not use nested cards, fully centered layouts, or generic SaaS shells"). So Blueprint is useful
as a structured prompt for a *different* trend or page shape than the one already built, and useful
as a checklist of generic tells to grade against, but it will not itself notice that Waymark and
cairn.pub already look like a stock daisyUI site, and it will not build the fix. Every one of the
"~8 moves" below is a human/Claude synthesis of what came back, not something Blueprint output
verbatim.

## Three creative directions

Ran `daisyui_setup_expert` -> `daisyui_rules_enforcer` -> `daisyui_creative_director` three times,
one workflowId per direction (`cairn-public-editorial-2`, `cairn-public-swiss-2`,
`cairn-public-quietluxury-2`). Full JSON: `d{1,2,3}_creative_director_*_readable.txt`.

### Direction A: Editorial Design (warmer/editorial pick)
`trend: "Editorial Design"`, tags `editorial, typographic, clean`, usecase `editorial and
publishing`.

- Kicker/headline/deck/byline/date/reading-time as distinct roles; narrow article body; captioned
  media; pull quotes used sparingly. Display serif headlines suggested (Playfair Display,
  Cormorant Garamond, Newsreader, DM Serif Display, Libre Baskerville).
- Color: "ink-black on white or warm off-white... start with paper and ink neutrals, then
  introduce one issue-like seasonal accent drawn from the lead photography."
- **Generic vs. real change.** The originality/content/motion/icon sections (about 60% of the
  payload) are the same boilerplate returned for every direction: "use domain-specific nouns,"
  "do not use lorem ipsum," "keep animations subtle." Nothing in that boilerplate would change
  Waymark's look. What would actually change it: the suggested display-serif family list (Waymark
  currently ships zero serif anywhere) and the instruction to treat imagery as "reported content"
  with a scale that varies by story importance, which Waymark's flat archive list does not do.

### Direction B: Swiss Style (quiet/typographic pick)
`trend: "Swiss Style"`, tags `minimal, typographic, geometric`, usecase `developer and technical`.

- Rational grid, disciplined grotesque sans, flush-left ragged-right text, one accent color used
  as information not decoration, sharp corners, exact geometry. Suggested fonts: Archivo, Inter,
  Work Sans, Libre Franklin, IBM Plex Sans, Helvetica, Univers.
- Color: "black or near-black text, white or off-white surfaces, and a small gray range. Add one
  strong accent only when it marks brand, priority, action, selection, or category."
- **Generic vs. real change.** Same shared boilerplate as Direction A for originality/content/
  motion. The part that would actually change Waymark: "keep corners sharp and geometry exact" , 
  Waymark's `--radius-box: 0.625rem` / `--radius-selector: 0.28rem` (`theme.css:131-138`) is a
  soft, generically-rounded-card aesthetic; a Swiss pass would zero every radius token, which
  Waymark's own re-skin recipe already exposes as a one-line edit.

### Direction C: Quiet Luxury (register-fit pick: understated, professional)
`trend: "Quiet Luxury"`, tags `minimal, soft, clean`, usecase `portfolios and agencies` +
`editorial and publishing`.

- "Communicates premium value with discreet, specific evidence instead of conspicuous status
  signals." Material-led photography, one calm canvas family (warm white/stone, cool white/gray,
  or charcoal/black), one primary ink color, refined serif or neo-grotesque type, hairline rules,
  near-absent radii ("refined rectangles, hairline borders, subtle insets, and small or absent
  radii"). Suggested fonts: Cormorant Garamond, Bodoni Moda, Instrument Serif, Newsreader, Canela,
  Manrope, Inter, Source Sans 3.
- **Generic vs. real change.** Closest of the three to cairn's own stated register (clean,
  conventional, polished, understated). The one instruction that would land immediately: "do not
  use default black-and-gold styling... choose warm ivory, stone, taupe, ink, and deep brown or
  navy": directly names the warm-stone family the admin already uses (Warm Stone tokens), which
  Waymark's public theme does not currently touch at all (Waymark is deliberately hue-free per
  `docs/internal/public-design-system.md:21-30`).

## Page architectures vs. current structure

Ran `daisyui_page_architect` once (`cairn-pages-audit-2`) for four PageIDs: the closest catalog
matches to Waymark's three public page types plus cairn.pub's docs front door, since the catalog
has no "static markdown blog" entry. Full JSON: `p1_page_architect_readable.txt`.

| PageID picked | Waymark/cairn.pub equivalent | Verdict |
| --- | --- | --- |
| `pages/news-homepage` | Waymark home, `examples/showcase/src/routes/(site)/+page.svelte:48-159` | Mismatch. The returned architecture wants a megamenu, a "breaking strip," edition/region/timezone controls, live-refresh-preserving-scroll, and a 19-item component list including `carousel`, `filter`, `validator`. Waymark's real home is a masthead + one lead entry + a year-grouped archive with an optional tag filter (`+page.svelte:59-159`): no megamenu, no live anything. Following this architecture literally would make Waymark look like a wire-service homepage, the opposite of "less generic." |
| `pages/blog-article` | Waymark article, `examples/showcase/src/theme/components/ArticleView.svelte:1-174` | Closer fit. Its own `anti_slop_requirements` are actually useful here: "do not make the article look like a dashboard, course player, or generic SaaS landing page," "avoid card grids inside the article body unless they represent real related content." ArticleView already honors these (a single reading column, no card grid). The suggested component list still over-fits a generic blog (`toast`, `progress`, `mockup-code` for every article) that Waymark's minimal article doesn't need. |
| `pages/blog-home` | Same as home above; the catalog has no distinct archive/list page, so this and `news-homepage` cover overlapping ground | Same mismatch pattern, milder: still wants a megamenu and a validator-backed newsletter form Waymark has no concept of (no newsletter feature exists in the chassis). |
| `pages/documentation-landing` | cairn.pub `/docs`, `src/routes/(site)/docs/+page.svelte:1-49` | Strong mismatch, instructive as a "what not to copy" example. The `signature_sections` explicitly prescribe "a highly detailed asymmetric bento grid," "a large conversion banner immediately before the footer" with "text in a distinctive creative display face... capped at 6rem," and a "start-building CTA." cairn.pub's actual `/docs` page is four lines of prose plus a plain 2x2 grid of links to Tutorial/Guides/Reference/Explanation (`docs/+page.svelte:38-49`) with no version selector, no platform picker, no conversion banner: because cairn has one product, one version, and does not sell conversions. The architecture is generated for a SaaS-docs shape cairn does not have; applying it would add scope cairn does not want (see CLAUDE.md's "leanness is the point" ruling), not just a look. |

## Two generated themes

`convert_picture_to_theme` returns no image parameter in its schema (confirmed: empty
`inputSchema.properties`, output is `{promptName, title, instructions}`): it is a fallback that
hands the calling agent a recipe, not a working conversion tool. I rendered the two reference
swatches with ImageMagick, read them directly (vision), converted the flat-color stripes to oklch
with `coloraide`, and applied the tool's own stated rules ("use neutral image colors for base,"
"use the dominant color for primary," "select semantic colors that match the palette").

Images: `scratchpad/blueprint-spike/images/warm-stone-sand.png` (`#F5EFE6` / `#E8DCC8` / `#C9A876`),
`scratchpad/blueprint-spike/images/cool-slate-graphite.png` (`#E7ECEF` / `#8D99AE` / `#2B2D42`).

### Warm stone/sand (light)

```css
@plugin "daisyui/theme" {
  name: "cairn-warm-sample";
  default: true;
  color-scheme: light;
  --color-base-100: oklch(95.4% 0.014 78);
  --color-base-200: oklch(89.9% 0.030 81);
  --color-base-300: oklch(83% 0.045 80);
  --color-base-content: oklch(28% 0.02 75);
  --color-primary: oklch(58% 0.09 76);
  --color-primary-content: oklch(99% 0.01 76);
  --color-secondary: oklch(52% 0.08 40);
  --color-secondary-content: oklch(98% 0.01 40);
  --color-accent: oklch(48% 0.07 130);
  --color-accent-content: oklch(98% 0.01 130);
  --color-neutral: oklch(30% 0.03 75);
  --color-neutral-content: oklch(96% 0.01 75);
  --color-info: oklch(55% 0.10 235);
  --color-info-content: oklch(99% 0.01 235);
  --color-success: oklch(54% 0.10 150);
  --color-success-content: oklch(99% 0.01 150);
  --color-warning: oklch(78% 0.13 78);
  --color-warning-content: oklch(26% 0.05 78);
  --color-error: oklch(58% 0.19 27);
  --color-error-content: oklch(99% 0.01 27);
  --radius-box: 0.625rem;
  --border: 1px;
  --depth: 0;
  --noise: 0;
}
```

### Cool slate/graphite (dark)

```css
@plugin "daisyui/theme" {
  name: "cairn-cool-sample";
  default: false;
  color-scheme: dark;
  --color-base-100: oklch(28% 0.035 280);
  --color-base-200: oklch(23% 0.030 280);
  --color-base-300: oklch(36% 0.035 280);
  --color-base-content: oklch(92% 0.01 260);
  --color-primary: oklch(68% 0.034 262);
  --color-primary-content: oklch(20% 0.02 262);
  --color-secondary: oklch(75% 0.02 230);
  --color-secondary-content: oklch(20% 0.01 230);
  --color-accent: oklch(70% 0.08 220);
  --color-accent-content: oklch(20% 0.03 220);
  --color-neutral: oklch(86% 0.01 260);
  --color-neutral-content: oklch(22% 0.01 260);
  --color-info: oklch(70% 0.10 235);
  --color-info-content: oklch(24% 0.04 235);
  --color-success: oklch(66% 0.12 150);
  --color-success-content: oklch(24% 0.04 150);
  --color-warning: oklch(82% 0.13 78);
  --color-warning-content: oklch(25% 0.05 78);
  --color-error: oklch(66% 0.17 27);
  --color-error-content: oklch(24% 0.05 27);
  --radius-box: 0.625rem;
  --border: 1px;
  --depth: 0;
  --noise: 0;
}
```

Neither AA contrast nor P3-gamut has been checked against `check-public-tokens.mjs`; these are
starting points for a re-skin exercise, not cleared values.

## Anti-generic rule grading of Waymark

`daisyui_rules_enforcer`'s six rule groups (`accessibility`, `component-code`, `media`,
`project-quality`, `responsive`, `theme-usage`) contain almost nothing about avoiding a generic
look: that material lives in `creative_director`'s `originality`/`composition`/`colors` sections
instead (see Brief above). Grading Waymark and cairn.pub against those:

- **"Ask if the same visual direction describes most competitors."** Fails. Waymark's
  `--color-primary: oklch(45% 0.1 248)` (`examples/showcase/src/theme/theme.css:108`) is a
  desaturated ink-blue at almost exactly the lightness/chroma most default Tailwind/shadcn/daisyUI
  starter themes ship. Combined with a hue-free near-white/near-black base ladder
  (`theme.css:103-106`), the palette alone is indistinguishable from a generic SaaS starter at a
  glance: which the design doc names as a deliberate choice ("neutral by default," `2026-07-04`
  ruling), not an oversight, but it is exactly the condition this rule flags.
- **Typography stereotype.** Fails. Figtree (display) + Source Sans 3 (body)
  (`theme.css:187-188`) are two of the most common "AI-generated site" Google Fonts choices right
  now. `creative_director`'s own instruction: "select a typeface that matches the product voice,
  do not use a category stereotype": reads directly against this pairing.
  `docs/internal/public-design-system.md:191-212` already names the fix path: the cairn theme
  (Fraunces display serif + warm paper) exists as an opt-in layer specifically because the neutral
  default was expected to read generic.
- **"Do not use nested cards, fully centered layouts, or generic SaaS shells."** Passes. The home
  page (`+page.svelte:48-159`) is a flat, text-first archive with no card grid; the article view
  is one reading column. Waymark does not commit this specific sin.
  `examples/showcase/src/chassis/composition.css`'s `.cairn-card` primitive exists but per
  `src/chassis/README.md:154-156` has zero real call sites in the theme today: it is scaffolding,
  not a rendered defect.
- **Geometry.** Borderline. `--radius-box: 0.625rem` / `--radius-field: 0.4rem`
  (`theme.css:131-135`) is commented "modest, stone-grade... not bubbly," a considered choice, but
  it is still the same soft-rounded-card silhouette shared by nearly every default daisyUI theme;
  Direction B's "keep corners sharp and geometry exact" is the concrete counter-move.
- **cairn.pub specifically fails hardest.** `cairn-pub/src/theme/theme.css:108-109,133,187-188` are
  byte-identical to Waymark's own defaults (`oklch(45% 0.1 248)` primary, `0.625rem` radius,
  Figtree/Source Sans 3). cairn.pub's own doc comment calls itself "the living demo of making
  Waymark your own" (`public-design-system.md:196`), but the shipped theme has made zero of the
  edits its own re-skin recipe describes. This is the single largest generic-look finding in the
  whole spike, and Blueprint had no way to surface it on its own: the tool has no notion that a
  site's theme is unmodified from a template default; that comparison had to be made by hand
  against the two files.

## What a designer would take from this

Skeptical framing: only items 1, 5, and 6 came from Blueprint's own output; the rest are
inferences a human still had to draw by comparing Blueprint's generic checklist against the actual
files. None of this is a design decision: cairn decides, Blueprint (and this spike) only propose.

1. **[cairn.pub] Actually re-skin the theme.** `cairn-pub/src/theme/theme.css` currently ships
   Waymark's stock palette/fonts/radius verbatim. Following the theme's own documented re-skin
   recipe (rotate `--color-primary`'s hue, retune the base ladder, swap `--font-display`) is a
   same-file edit and the single highest-leverage move in this whole spike.
2. **[waymark] Retire the blue-ish neutral primary as the shipped-template default color.**
   `examples/showcase/src/theme/theme.css:108-109,154-155`. Not necessarily by changing the
   default (neutral-by-default is a deliberate ruling), but the getting-started scaffold could
   ship a rotated hue out of the box rather than the exact ink-blue every fresh `waymark` init
   currently gets, so day-one sites do not all converge on the same accent.
3. **[waymark] Swap the display face away from Figtree for a distinct default.** `theme.css:187`.
   Direction A/C's suggested serif families (Newsreader, Instrument Serif) are drop-in candidates
   via the documented "swap the two `--font` tokens" step; a serif display over the same Source
   Sans 3 body is a two-line change under the existing re-skin recipe.
4. **[waymark] Sharpen or zero the corner radii for a "Swiss" variant.** `theme.css:131-135`.
   `--radius-box`/`--radius-field`/`--radius-selector` to `0` is Direction B's single concrete,
   cairn-compatible move; worth prototyping as an alternate starting palette in the getting-started
   scaffold rather than the current universally-rounded default.
5. **[waymark] Vary card/entry scale on the home page instead of one flat lead-plus-list shape.**
   `+page.svelte:66-136`. `news-homepage`/`blog-home`'s own anti-slop line ("do not give each item
   equal visual weight... vary section scale by importance") already partially describes what
   Waymark's lead treatment does; extending unequal weight one step further (e.g., a slightly
   larger second entry, not just the lead) is a small, evidence-backed refinement, not new scope.
6. **[cairn.pub, alternate] Try the warm-stone sample theme above as cairn.pub's literal palette.**
   The Quiet Luxury direction's explicit "warm ivory, stone, taupe, ink" instruction is the same
   family the admin's Warm Stone tokens already use (`docs/internal/admin-design-system.md`); using
   it on cairn.pub's public theme would be the first real instance of the admin/public "one design
   system" rule (`public-design-system.md:255-261`) actually meeting in one site.
7. **[cairn.pub] Do not adopt `documentation-landing`'s bento-grid/conversion-banner architecture
   for `/docs`.** `src/routes/(site)/docs/+page.svelte:1-49` vs.
   `p1_page_architect_readable.txt:579-586`. This is a negative finding worth recording precisely
   because it is the opposite of "adopt Blueprint's output": the returned architecture assumes a
   multi-version, multi-platform SaaS product cairn is not, and building it would add surface
   cairn's own scope charter rules out (`CLAUDE.md`, "cairn owns its core job... little else").
8. **[waymark] Treat the archive's tag-filter and pagination rows as a place to add one Swiss-style
   move: flush-left, ragged-right, sharp-cornered pills instead of the current 999px pill shape.**
   `+page.svelte:273-289` (`--tag-filter-radius: 999px`). Small, already token-driven, and directly
   testable against Direction B without touching the reading surface.

## Raw outputs

- `scratchpad/blueprint-spike/out/`: every raw JSON-RPC response (`d1`-`d3`, `p1`, `r1` prefixes).
- `scratchpad/blueprint-spike/*_readable.txt`: the same responses with embedded JSON strings
  pretty-printed.
- `scratchpad/blueprint-spike/script.json`, `script2.json`, `script3.json`: the probe driver
  scripts actually run (script.json and script2.json failed on ordering: see below: and are kept
  for the record; script3.json is the one that produced the readable outputs above).
- `scratchpad/blueprint-spike/images/`: the two generated reference swatches.

One tool-ordering finding worth recording for future use of this server: `daisyui_creative_director`
and `daisyui_page_architect` both hard-require `daisyui_rules_enforcer` to have run for that exact
`workflowId` first ("Call mandatory daisyui_rules_enforcer before optional design roles"), and
workflow state is held in the running server process, not any client-visible token: a fresh
`npx daisyui-blueprint@latest` process (as a fresh Python driver invocation starts) has no memory of
a previous run's `workflowId`, so `setup_expert`, `rules_enforcer`, and every downstream call for one
workflow must happen inside a single server process/session, not split across separate script runs.
