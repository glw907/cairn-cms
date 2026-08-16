# Diagram theme, merge gate: harvest findings

Banked 2026-08-16, from the docs-diagram-pages merge gate, where the eleven authored diagrams
went through their first themed full-page reads in cairn-pub. The engine-level mechanics rule
in `CLAUDE.md` governs the filing: a UI mechanic belongs to the engine level, a design choice
to the site. What follows is one mechanic with four instances, which is the
repeated-local-workaround signal the rule names.

## The mechanic: post-measurement metric drift in mermaid HTML labels

Mermaid lays out a diagram in two phases. It first renders each label in a sandbox, measures
it, and sizes every node, cluster, and edge to those measurements; it then places the final
SVG in the page, where the theme's CSS applies. Any styling that reaches a label AFTER that
measurement pass and changes its rendered metrics breaks the geometry mermaid already
committed to: the label paints wider, taller, or wrapped differently than the box placed
around it, and the SVG's default clipping shears whatever spills.

The class of styling that induces it is exactly the theme's most tempting toolkit: a chip
treatment on `code` tokens (padding, border), an eyebrow treatment on cluster titles
(uppercase, letter tracking), an inherited prose rule (`overflow-wrap: anywhere`), a font
substitution. Color, background, and borders inside the existing box are metric-neutral and
safe.

Four instances at one gate (cairn-pub `eae4033` and `d4e7575`):

- `.prose`'s `overflow-wrap: anywhere` broke unbreakable chip tokens mid-word onto a line the
  measurement sandbox never saw, so the foreignObject clipped the third line of a two-line box.
- The chip's block padding and border painted outside the measured line box, clipping top and
  bottom.
- The cluster eyebrow's tracking widened the title past its measured width; mermaid's label
  wrapper is an inline-styled table-cell that grows rightward only, so the spill ran past the
  SVG root's edge and sheared mid-glyph.
- A gantt has no intrinsic width at all, so under `useMaxWidth: false` it took its metrics from
  the viewport and crushed its axis at 320px.

## The rule the fixes encode

Styling must either participate in measurement or be metric-neutral; nothing may change a
label's metrics between measurement and paint. That splits the fixes into the two altitudes
the CLAUDE.md rule describes:

- **Config-level (participates in measurement):** anything mermaid's own config carries goes
  there, because the measurement pass sees it. `flowchart.subGraphTitleMargin` reserves title
  air in the measured layout (`d4e7575`, versus post-hoc CSS padding, which would drift);
  `gantt.useWidth` pins an intrinsic width the type otherwise lacks; `fontFamily`/`fontSize`
  belong in the theme variables mermaid reads, never in later CSS.
- **CSS-level (must be metric-neutral, plus containment):** the theme keeps tokens whole
  (`overflow-wrap: normal` on labels), strips metric-affecting halves of decorations
  (`padding-block: 0` on label chips), and makes residual sub-pixel spill paint instead of
  shear (`overflow: visible` on the foreignObject, flex-centered cluster labels so overflow is
  symmetric).

## Why this is a mechanic, not a site fix

Any cairn-family surface that themes mermaid output reproduces this: the drift is a property
of mermaid's measure-then-place architecture meeting any typographically ambitious theme, not
of one stylesheet. The correct composition is not discoverable from the theme file; the
cairn-pub theme session hit all four instances independently at one gate, after each looked
fine in the unthemed render. The mechanically detectable half (a rendered label's scroll box
exceeding its foreignObject box, a page-level horizontal scroll on a diagram page) is a
`cairn-audit` candidate; the containment probe that caught these
(cairn-pub `scripts/diagram-containment-probe.mjs`) is the seed.

**Filed as:** the containment rules and config pins live in cairn-pub's theme
(`eae4033`, `d4e7575`); this record carries the mechanic for the next mermaid-theming
surface; the probe is the seed for the future rendering harness.
