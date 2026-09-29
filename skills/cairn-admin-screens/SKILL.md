---
name: cairn-admin-screens
description: Build or review a screen inside a cairn site's /admin, to the register cairn's own admin holds itself to. Load before touching anything under /admin routes, admin-toolkit components, or cairn-admin.css. Points at cairn-audit's mechanical checks and cairn-audit norms rather than restating them.
---

# cairn admin screens

This skill teaches an agent to build or review a screen inside a cairn site's `/admin`, to the
same register cairn's own admin holds itself to. Load it before touching anything under `/admin`
routes, admin-toolkit components, or `cairn-admin.css`.

The rules a builder needs to hold in working memory are only the ones no tool can check. Every
mechanical rule already runs as a `cairn-audit` check; this file points at the check rather than
restating its formula, and `cairn-audit norms <selector-or-role>` answers "what does this
component usually measure" as data instead of inference from a screenshot.

## Tier map

`cairn-audit` (static: `npx cairn-audit`; rendered: `npx cairn-audit --rendered`, against a
running dev server, both themes) runs thirty-eight rules across two modes: twenty-one static,
fifteen error tier and six advisory, and seventeen rendered, seven error and ten advisory. Full
descriptions live at `node_modules/@glw907/cairn-cms/docs/reference/cairn-audit.md`, a path from
your site's root (the installed package's copy).

**Static, error tier:** `no-uncompiled-class`, `type-scale`, `gap-scale`,
`stock-default-hazards`, `token-colors`, `grammar-boundary`, `focus-parity`, `motion-band`,
`motion-property`, `motion-vocabulary`, `motion-hover-gate`, `reduced-motion`,
`stripe-trim-parity`, `unlayered-font-clobber`, `list-role`.

**Static, advisory tier**, each promoted to error tier at its own named version: `radius-scale`
(`0.99.0`), `log-event-grammar` (`0.98.0`), `log-secret-field` (`0.98.0`). `public-literals` reads
the site's public files instead of the admin surfaces and stays advisory for a consumer, so it has
no promotion version. `theme-conformance` and `theme-contrast` also read the site's public files,
need daisyUI installed beside the site (`theme-conformance` needs Tailwind too), and promote to
error tier at the first minor cut after every consumer site reports none of their findings.

**Rendered, error tier:** `one-filled-action`, `focus-renders`, `interactive-contrast`,
`touch-targets`, `viewport-overflow`, `panel-width`, `list-role`.

**Rendered, advisory tier** (a compositional question a legitimately novel component can answer
differently on purpose; reported, never gating): `chip-ground-collision`, `border-contrast`,
`weight-budget`, `norms-bands`, `screen-anatomy`, `relational-spacing`, `form-font-parity`
(registered provisionally at advisory; the intended tier is error, pending a CI re-check),
`field-edge-alignment`, `container-inset-asymmetry`, `motion-reduced-delay`.

## Screen anatomy

`screen-anatomy` checks the negative half mechanically: one `PageHeader`, one `h1`, and no
accent- or ink-filled action stray outside the header slot or the card region (desk routes are
exempt; see `node_modules/@glw907/cairn-cms/docs/reference/cairn-audit.md`, a path from your
site's root).

The affirmative half is guidance, not a lint: **the primary action sits in the header slot.** The
rule cannot enforce this because it cannot know whether a given screen has a primary action to
place, and declaring one in config would put per-screen ceremony on every consumer to feed a
single check. Hold it as the rule instead: when a screen has one deliberate primary action, it
belongs in the header slot beside the `h1`, not trailing the content in a footer row below it (the
traced defect this guards against: a duplicate New button once sat below `ConceptList`'s table,
after the header already carried one). The annotated exemplars (`references/exemplar-list.md`,
`references/exemplar-detail.md`) show the placement applied, and the grader prompt's checklist
reads for it.

## Component contracts

A component's measured shape (control height, padding, border treatment, radius) is data, not
prose to recall: `npx cairn-audit norms <role>` returns the measured band with its provenance,
ratified against a written decision or observed-only. Query by role id (`button-primary`,
`status-chip`, `card`, `table-cell`, `page-title`, and the rest; the full role table is at
`node_modules/@glw907/cairn-cms/docs/reference/cairn-audit.md`, again a path from your site's
root) before inventing a height or a padding value from scratch.

## Write this, get this

Write the plain daisyUI or cairn role class a screen needs; the theme layer, not the markup, carries the ratified look.

| Write | Get |
|---|---|
| `type-title font-[550] font-[family-name:var(--font-display)]` | the page heading, 24px at weight 550, no bold, in the display face. |
| `type-label font-semibold uppercase tracking-[0.08em] text-muted` | an eyebrow: quiet, uppercase, tracked out. |
| `font-medium text-subtle` | a resting sidebar item; CairnAdminShell renders the nav itself, no screen writes one directly. |
| `btn btn-primary` | the one accent-filled commit action on a surface. |
| `btn btn-ghost` | a quiet button for chrome actions, toolbar controls, and row affordances. |
| `input` | a single-line text field. |
| `select` | a native select control. |
| `card-shell card-shadow` | a floating card surface: the box radius, a hairline edge, and elevation. |
| `btn` | the plain button: a hairline edge, no fill accent. |
| `btn btn-neutral` | the ink opener: a solid neutral fill, the first commit-adjacent step up from plain. |
| `btn btn-soft btn-primary` | the soft primary: a tinted act-on state, softer than the solid commit. |
| `join-item btn btn-active` | the selected segment in a join or segmented control: a neutral wash plus a state hairline. |
| `rounded-selector` | the corner for a chip, tag, count, or other small inline marker. |
| `rounded-field` | the corner for a control, button-like element, or small thumbnail. |
| `rounded-box` | the corner for a panel, card, tile, popover, sheet, or the brand tile. |

The kit as written markup, from buttons through a card, is in `references/exemplar-kit.md`.

Put a custom admin component under `src/routes/admin` or `src/lib/admin`. Those are the two roots the site's admin sheet compiles (`@source` in `src/admin.css`), and both sit inside `cairn-audit`'s default static scope. A component anywhere else, such as `src/lib/components`, is outside the default audit scope, and a utility only it uses is missing from the compiled admin sheet, so it renders unstyled.

## Register rules

Three register rules the audit cannot check mechanically, because they need the builder's own
judgment about what the screen is for:

- **One filled action, chosen deliberately.** `one-filled-action` catches a second accent fill;
  it cannot tell you which control on a new screen deserves the one it allows.
- **Chip passivity.** `StatusChip` carries three registers: `quiet` (`register="quiet"`, the
  default) for a settled or put-away state that should recede rather than announce itself,
  `warning` (`register="warning"`) for a state that needs attention, and `outline`
  (`register="outline"`) for a transient or reversible absence (a removable tag, a
  not-yet-confirmed suggestion). Use quiet for the state a list mostly sits in (Published,
  Closed); reserve warning for a state that needs attention (Draft, Overdue, Pending). Both
  tinted registers, quiet and warning, are tuned to a contrast band that sits under the audit's
  own 1.5 ground-collision floor by design on every row ground, not only near `base-300`: a
  `quiet` or `warning` chip measures as an advisory camouflaged finding on some row/theme pairs,
  expected rather than a regression.
- **Facet quietness.** A filter control is a "facet" in `ListToolbar`'s own vocabulary (its
  `'menu'` display): quiet bordered-button chrome at rest, showing only its own name. It picks up
  its applied treatment, a primary-tinted border and background, only once a value departs the
  filter's default. A facet never competes with the surface's one filled action.

## The done-gate

A screen is done, in order, only after:

1. **The static audit passes.** `npx cairn-audit` against the routes and components you touched.
2. **The rendered audit passes**, both themes, against your own running dev server:
   `npx cairn-audit --rendered`.
3. **For a derivation or any composition the toolkit doesn't already cover**, run the shipped
   grader prompt (`references/grader-prompt.md`) against your own multi-state captures, and fix
   what it finds.

Run all three before you call a screen finished, not only when someone else reviews it: the
rendered checks catch what static analysis cannot see, and running them for the first time at
review turns every one of their catches into the refinement round this skill exists to avoid.

A clean audit means the screen's vocabulary is correct. It does not mean the screen is done: a
screen can be vocabulary-clean and still not compose. Report a green audit as exactly that, never
as design-done.

If you added a suppression to get here, say so in your own report. A build that passes by
suppressing a finding is a disguised failure, not a pass.

## References

`references/` carries the material that does not need to load every time: the annotated
exemplars, the plain-class kit, the form-anatomy contract, the extension grammar, the craft
chapter, and the grader prompt. See `references/README.md` for what is there and when to reach for it.
