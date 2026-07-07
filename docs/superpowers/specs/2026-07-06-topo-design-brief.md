# The Topo design brief (Fable, 2026-07-06)

Topo: the family's documentation theme — Starlight's anatomy, gently brought into the
cairn fold with a Waymark identity, aiming to be a best-of-breed example of the type
(Geoff's rulings, 2026-07-06, all binding). First consumer: handbook.aksailingclub.org
(87 real markdown files across technical/user/style-guide arms — the evidence sweep
mapped it; today a Hextra static build behind an Access-gated worker with a
Sveltia OAuth shim). Second consumer: cairn.pub's docs door.

## The identity equation

- **Anatomy-faithful to Starlight** (the proven docs UX, kept recognizable per "gently"):
  the sidebar-from-content-tree with collapsible groups; Pagefind search modal; prev/next
  pagination; the right-rail in-page TOC with scroll-spy; the three-pane responsive
  collapse (sidebar → drawer, TOC → disclosure); keyboard affordances; the content-width
  discipline. A Starlight user should feel at home in Topo without noticing why.
- **Identity-faithful to the family**: the chassis underneath (tokens, prose foundation,
  composition primitives, the themed-404 pattern); Waymark's voice on top — Figtree-class
  display, the family type scale, quiet chrome, bands-mark-sections; the family five-
  viewport standard, composed at the extremes where docs sites usually merely survive.
- **The inspiration absorptions** (the best-of-breed mandate; final picks with fresh eyes
  at build time, these are the brief's bets): from **VitePress** — the reading rhythm:
  generous line-height, restrained content width, the calm that makes long technical
  pages readable (the single thing its users praise most); from **Fumadocs** — the
  search ergonomics (instant, keyboard-first, result grouping by section) and the API/
  reference page patterns if cairn.pub's reference arm wants them; from **Mintlify** —
  the polish floor for interactive details (copy buttons, anchor affordances, tab
  groups) WITHOUT its weight.

## What Topo is, structurally

A theme on the chassis (the ontology's fourth first-party proof) plus ONE new capability
the chassis lacks: **the tree** — sidebar navigation derived from content hierarchy.
Docs-shaped hierarchy over cairn's flat concepts is the known content-model question (the
gallery port's album evidence applies): the bet is a `docs` concept whose entries carry
`section`/`order` frontmatter, the tree derived at build (the same one-fieldset-
polymorphism pattern the gallery proved), with NO contract change unless building it
proves otherwise — the additive streak defends itself.

## The build's manifest discipline (the doctrine applies to anatomy too)

Starlight's manifest gets enumerated exhaustively before building (every behavior: the
sidebar's states, search's every keystroke, the TOC's spy thresholds, mobile drawers,
theme switching, the 404) — anatomy verified against the MANIFEST per the hardened
method. The handbook's 87 files are the acceptance corpus: the tutorial-class proof is
"the real handbook renders navigable and searchable with zero content edits."

## Sequencing (unchanged, made explicit)

After the ASC completion + the consolidating release, as its own effort: the inspiration
review refreshed (fresh popularity data, the shortlist above as priors) → the Starlight
manifest → mockup candidates to Geoff (the design-sitting method: the three-pane at
1440, the phone collapse, one long real handbook page) → build on the chassis → the
handbook migrates as the acceptance test → cairn.pub's docs door adopts it. The
handbook's Access/CMS-shim worker pattern stays (the simplest worker in the estate —
evidence sweep §6); only the static build behind it changes.
