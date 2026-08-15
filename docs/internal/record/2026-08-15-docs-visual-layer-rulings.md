# Docs visual layer: the sitting's rulings (2026-08-15)

The Fable brainstorming sitting the ROADMAP Now entry and `docs/STATUS.md` called for. Inputs:
the starting position at [`2026-08-15-docs-outlines-with-visuals.md`](./2026-08-15-docs-outlines-with-visuals.md)
and the three-tier research at [`2026-08-15-docs-visual-practice-research.md`](./2026-08-15-docs-visual-practice-research.md),
including Geoff's binding polish constraint (diagrams carry understated professional polish,
never stock-theme output). The outlines record's per-page contracts remain the working plan
except where a ruling below amends one; nothing else in it is reopened, apart from the gate
relocation ruling 1 announces. The 320/390 release in ruling 1 is an evidenced deviation from the family
responsive standard, and it lands in [`docs-register.md`](../docs-register.md) under the
deviation rule alongside ruling 4's visuals section; the responsive-standard bullet in
`CLAUDE.md`, the one place the numeric bar is stated, gets a one-line scope note with it, so the
next reader of the standard meets the diagram exemption where the bar is stated.

## Ruling 1: the 320/390 bar does not bind authored diagrams

Released, on the research's full weight. WCAG 1.4.10 exempts diagrams from reflow by name and
asks for a text alternative instead. No platform ships small-screen diagram legibility as a
default, and no style guide states such a rule; shrinking a wide diagram to 320px shrinks its
labels proportionally. The bar remains in force for the site artifacts it was
written for, and for the live reproductions, which render at real widths by design and are the
family bar's actual subject matter.

What replaces it is the discipline the field converged on, all three parts mandatory per diagram:

1. **A complexity budget.** About 15 nodes, the strict end of the 15-to-20 community guidance.
   A diagram that needs more is split or simplified; this is the only mechanism that addresses
   legibility at the source, and it doubles as Kubernetes' "keep diagrams simple" advice.
2. **Containment, not shrinkage.** A diagram wider than the viewport scrolls inside its own
   figure container (`overflow-x: auto`); the page never scrolls horizontally because of it.
   Twilio ships this for every wide table and code block, and horizontal-scroll containers are
   the field's standard convention across Starlight, Docusaurus, MkDocs Material, GitBook, and
   VitePress.
3. **A two-part text alternative.** Short alt naming the kind and gist, plus the essential
   information in body text. The fact-survival prose each contract already preserves IS that
   body text, so this costs nothing new; the WAI complex-images tutorial and Write the Docs
   both prescribe exactly this shape.

The reinstated gate checks what the discipline actually requires: containment at 320 and 390
(diagram scrolls in its figure, no page-level horizontal scroll) and the presence of the
two-part alternative. It does not check in-diagram label legibility at those widths; that claim
has no standard behind it and the budget handles it upstream. The gate lands with the first
wave-1 diagram, proven red once, in the surface that renders the docs (cairn-pub). That is the
one relocation this record makes to the outlines record, which put the gate in the showcase
visual suite before cairn-pub was confirmed as the renderer. Its exact harness shape is decided
at that landing, not here.

## Ruling 2: themed mermaid is the vehicle, and the theme ships first

**Mermaid stays the corpus default**, for the reason Kubernetes demonstrates: a diagram that is
text in the same PR as its prose is the strongest anti-staleness mechanism authored diagrams
have, and both surfaces the corpus meets render it: cairn-pub at the polish bar, GitHub in
GitHub's own theme. That last point decides against the Astro-style bespoke component as the
default: the docs payload is markdown consumed by cairn-pub and read raw on the public GitHub
repo, and GitHub renders mermaid fences natively while a Svelte component renders nothing
there. A per-diagram component would also cost a
hand build for each of the twelve survivors below.

**The polish constraint is met by a designed cairn diagram theme, built before any diagram
lands.** One theme, applied corpus-wide: mermaid `themeVariables` plus CSS on the rendered SVG
in cairn-pub's `DocsMermaid.svelte`, driven by cairn-pub's own design tokens, light- and
dark-aware. The stock `neutral` render never ships. The theme is cairn-pub work, like the seam;
this record states the requirement and does not design it. GitHub's own mermaid render is a
courtesy fallback in GitHub's theme; the polish bar binds the surfaces cairn controls.

**The escalation path is hand-authored SVG, not a component.** A diagram the themed render
cannot carry at the polish bar is authored as SVG in cairn's visual voice, checked into the
repo: MDN's format arguments apply (editable as text, diffs in git, stays sharp), and an SVG
still renders everywhere markdown does. The two marquee candidates (the `architecture.md`
block diagram and `before-you-start.md`'s ownership map) get themed-mermaid drafts first and
upgrade only if a fresh-context polish read fails the draft. The eight-diagram restoration
does not proceed until the theme exists, per the constraint's own terms.

## Ruling 3: the diagram inventory, re-tested against the threshold

The research pressured the proposed density, and the sitting re-tested every proposed diagram
against Twilio's evidenced threshold, three or more actors or branching paths, plus one
criterion the sitting adds on its own judgment: a spanning relation, where which elements a
fence or switch covers is the fact being taught. Three of the survivors below rest on the added
criterion alone, and they are the sitting's calls, not the research's findings. Enumerable
content goes to a table or list instead, the pattern Stripe, Tailwind, and Rails all show.
Seventeen were proposed; twelve survive.

**Kept, extend track (8):**

- `architecture.md`: the system block diagram (multi-actor topology) and the write-path
  sequence (five-plus actors).
- `security-model.md`: the trust-boundary diagram (multi-actor, and the two-model split is the
  page's hardest spatial fact).
- `data-tiers.md`: the media-storage flow (two paths branch and converge).
- `link-content-with-references.md`: the delete-guard decision diagram (genuine branching).
- `render-safety.md`: the pipeline-order diagram, kept on the added spanning criterion. The
  pipeline is linear, but which two stages the `unsafeDisableSanitize` switch covers is the
  fact being taught, and a span is what an ordered list cannot state.
- `build-a-site-by-hand.md`: the milestone map, kept on the same criterion for the dev-backend
  fence across milestones 2 through 4.
- `rotate-the-github-app-key.md`: the overlap timeline, the third spanning keep; the two keys'
  overlapping validity is the whole substance of the page's no-downtime claim.

**Kept, admin track (3):** the ownership map (five assets plus the tool as connector), the
setup-journey diagram (a forking path with flagged browser moments), and the
one-domain-two-jobs diagram (three actors and the page's central conflation).

**Kept, editors track (1):** the save-publish loop, the track's argued exception, unchanged.

**Cut (5), each with its replacement form:**

- `security-model.md`, the guard-order diagram. Six sequential steps, one actor, no branching.
  The dense sentence becomes an ordered list carrying each step's rationale clause; the
  `guard.rejected` fact survives as before.
- `content-model.md`, the fieldset fan-out. The existing single sentence ("the single source of
  truth for three things at once") already carries it; a three-arrow drawing fails Google's
  otherwise-difficult-to-express test.
- `data-tiers.md`, the three-tier map. Three stores each with contents, keying, and a selection
  rule is enumerable: it becomes a table, one row per tier, and the per-tier reasoning stays
  prose. The `media`-never-`assets` fold and the manifests' keying difference move into the table
  and its surrounding prose.
- `wire-the-delivery-surface.md`, the index fan-out. Five consumers of one index is an
  enumeration; the matcher-precedence claim is one clear sentence. Both stay textual.
- `own-your-domain.md`, the nameserver before/after. The existing sentence stands alone; the
  propagation window and nothing-is-broken-while-you-wait stay prose, as the contract's caption
  would have carried them anyway.

The fenced directory tree on `what-the-scaffold-wrote.md` is plain text, not a diagram, and
stands. Every cut page keeps its must-survive list intact; those lists ride the page, not the
visual. Twelve diagrams across the extend and admin tracks sits between Astro's one-in-418 and
Kubernetes' roughly one per concept page, with each survivor individually defended.

## Ruling 4: an alt-and-caption standard, written and gated

Adopted. The research is unambiguous that this is where corpora without written rules ship
defects, including two exemplars otherwise worth imitating (Rails, Ghost). The rules, synthesized
from the two standards cairn already follows plus the Kubernetes caption mandate:

- Every image and diagram carries alt text; a decorative image gets `alt=""`, never an omitted
  attribute. Cap at 150 characters (the tighter of Google's 155 and Microsoft's 150).
- Alt starts by naming the kind (diagram, screenshot, reproduction), never "Image of", and
  describes what the reader learns in context, not what the pixels depict; MDN's
  settings-icon example and Kubernetes' control-plane alt are the exemplars.
- A complex diagram carries the two-part alternative from ruling 1; the mermaid fence's
  accessible description travels through cairn-pub's existing marker convention
  (`src/lib/docs/mermaid-marker.ts` feeding `src/theme/components/DocsMermaid.svelte`'s hidden
  description).
- Every authored diagram and every live reproduction carries a caption: complete sentences,
  carrying the code-verified facts its contract assigns, never redundant with the alt, never
  referenced spatially ("the image above"). Figure numbering only where a page cross-references
  a figure from elsewhere in its text; otherwise omitted, which Google permits.

The standard's text lands as a visuals section in `docs-register.md`, where writers already
look. The mechanical half (alt presence and length, decorative
explicitness, caption presence, the mermaid description marker) becomes a `check:` gate in the
Astro shape (missing alt is a build failure, not advice), landing with the first wave-1 visual
and proven red once before it is trusted.

## Ruling 5: motion is out, by decision

The visual layer ships static. TinaCMS's per-claim silent looping `.webm` is the strongest
single technique the competitor tier showed, and the sitting still declines it. Motion assets
are the study's clearest maintenance liability: WordPress tracks its videos with their own
staleness lines, and Kubernetes' interactive terminals were shut down outright in 2023. The
seam motion would depend on does not exist yet, and no page contract currently fails without
it. Deciding this deliberately, rather than by omission, is what the research asked of the
sitting.

The revisit trigger: the editors rewrite, running against the built seam, finds a page where a
static reproduction demonstrably cannot carry an interaction that matters. The named
candidates are already known (the Tidy review flow; the figure dialog's cursor-dependent
button label). If motion is ever adopted, its form is banked now: silent, looping,
fluid-width, placed immediately after the one claim it illustrates, generated from the same
seam against fixture data and pinned to the engine version, never a hand-recorded video. A
Later-tier ROADMAP line carries the trigger.

## Ruling 6: numbered callouts, adopted narrowly

The WordPress numbered-callout-plus-keyed-prose pattern is adopted for exactly one reproduction
shape, the locate-many-controls shot. Three contracts hold one: the entry screen at
`write-in-the-editor.md`'s `## The screen`, the Tags screen, and the media-library screen. Each
of those three gains numbered markers and a keyed list, the list carrying what the render
cannot show (shortcuts, behavior, alternate paths), per Google's rule that callouts are numbers
only and detail lives in text. The research's further suggestion, collapsing a contract's
several reproductions into one annotated shot, is declined: reproductions of distinct states
and dialogs (the Tidy review in progress, the figure dialog, the delete confirmation, the open
Details panel) stay separate, because one screenshot cannot hold two states.

This appends to the seam's stated needs, alongside what the outlines record already lists
(fixture data, theme awareness, engine-version pinning, two-width rendering for
`publish-and-history.md`): a callout-marker overlay capability. If the seam's first version
lacks overlays, the pattern still stands with the keyed list keying to visible on-screen labels
instead of numbers; the fallback is harder to scan and states the same things.

## Confirmations, and the amended build order

Four things stand unchanged, on differing authority. The research confirmed two outright: the
editors track's live-reproduction vocabulary and the admin track's transcript vocabulary with
its no-invented-output precondition. The reference arm stays visual-free on the research's
indirect support (Astro's 187 reference pages and Kubernetes' reference tier both carry zero
images by design), and the front door stays visual-free on the sitting's own judgment, since
the research did not study front doors. The vendor-link rule holds as before: no
vendor-dashboard screenshots, ever.

The build order from the outlines record stands with one insertion at the front and ruling 3's
shrinkage applied:

1. **The cairn diagram theme** (cairn-pub work; nothing lands before it).
2. The extend track's eight surviving diagrams, `architecture.md` first, with the containment
   gate and the alt/caption gate landing at the first diagram.
3. The admin track's three diagrams and the transcript blocks (the recorded-run fixture
   question is unchanged: if no recorded run covers a stage, that stage waits).
4. The live-reproduction seam (cairn-pub work, now carrying the appended needs).
5. The editors track rewrite against real reproductions, then the three blocked one-off
   reproductions.

Two questions stay open because the sitting cannot reach them from here: whether the
recorded-run fixtures exist in consumable form, and the seam's actual contract, both owned as
before. The release-one sequencing question (prose corpus now versus waiting for the rewrite)
is Geoff's call and is deliberately not ruled here. These rulings change its cost picture in
both directions: the diagram waves still need no live-reproduction seam, but nothing in them
lands before the diagram theme, which is cairn-pub work.
