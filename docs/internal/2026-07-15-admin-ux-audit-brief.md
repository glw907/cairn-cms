# Admin UI/UX audit brief (2026-07-15)

The entry point for the admin design arc that follows 0.86.0. Purpose: turn the design charter
into a ranked, verified deficiency list that feeds, in order, the admin reorganization pass
(spec already ratified: `docs/superpowers/specs/2026-07-14-admin-reorganization-design.md`), a
design-refinement arc for the material findings (color, type), and the component-kit design
(ROADMAP Next).

## Grounding (read first, in this order)

1. `docs/internal/admin-design-system.md` — the design charter and its calibration block
   (Geoff, 2026-07-15) are the grading rubric. Anchor in spirit: iA Writer. Archetype: the ASC
   volunteer. Voice: professional, restrained, slightly academic. A phone is a full writing
   device.
2. This brief's seeded findings (below) — Geoff's own grades plus two known papercuts.
3. The reorganization spec and its research docs (evidence + comparables, both
   `docs/internal/2026-07-14-admin-nav-*.md`) for the nav-adjacent context.

## Seeded findings (pre-verified; the audit ranks them, it does not re-litigate them)

- Color reads a little too aggressive, and there are probably too many popping colors per
  screen (Geoff). Corroborating observation from the 0.86.0 baseline render-reads: the posts
  list carries six competing accent moments (purple publish button, purple New Posts, purple
  active-nav state, blue New badges, a column of red delete icons, purple links).
- The sidebar looks a little too complex at a glance (Geoff).
- The editor's icons and help affordances may challenge a less technical writer (Geoff).
- The base font size might be a little too small (Geoff, hedged — verify against the anchor's
  generosity, do not assume).
- The topbar site name renders with rn-to-m keming ambiguity at its size/weight ("Cairn" reads
  as "Caim"); every cairn admin carries the word.
- A collapsed sidebar section containing the active route's link does not auto-expand
  (review finding, filed in ROADMAP Later).

## Method

1. **Renders.** A capture set was produced at
   `/tmp/claude-1000/-home-glw907-Projects-cairn-cms/04ae3538-46dc-432e-8b12-63c25e18ba53/scratchpad/audit-renders/`
   (showcase admin: login, posts, edit page, media, settings, editors, help, palette-open, dark
   variants; widths 320/390/768/1440/2560 by screen; plus edit-390 at heights 844 and 500 for
   the keyboard-open case). If the directory is missing or stale (a /tmp cleanup or a repo
   change since 0.86.0), recapture: main checkout, `CAIRN_DEV_BACKEND=1 npx vite dev` from
   examples/showcase, reuse the e2e suite's session mechanism, full-page PNGs per the list
   above.
2. **Critique fan-out.** Fresh-context agents (Sonnet), ONE narrow lens each, over the relevant
   render subset; each returns concrete findings with the render filename and region:
   (a) iA Writer spirit — restraint/calm; count attention-demanding accents per screen;
   (b) non-technical-editor approachability — toolbar icons, help affordances, jargon;
   (c) sidebar at-a-glance complexity — what makes it read complex (density, chrome, type);
   (d) phone as a writing device — 320/390 edit renders incl. h500, touch targets, reach;
   (e) polish — keming, alignment, spacing-rhythm defects, inconsistencies, all renders;
   (f) microcopy voice vs professional/restrained/slightly-academic;
   (g) responsive composition at 320 and 2560 — composed vs merely unbroken;
   (h) idiom consistency — does the custom Signups screen read native; what a component kit
   must cover (page header, card, table shell, form rows, empty state).
3. **Triage in the main loop** (the conductor's seat): refute weak findings rather than count
   votes; merge duplicates; rank by charter weight (editor-facing beats developer-facing;
   material beats cosmetic) and by edit cost. Type-scale and color-system findings route to a
   DESIGN-REFINEMENT ARC (fully local iteration with Geoff per the design-iteration-economics
   memory — color and type need his eyes per round, not a one-shot pass). Structural/small
   fixes fold into the reorganization pass's plan where adjacent, or a small refinement pass.
4. **Output.** Commit the ranked list as `docs/internal/2026-07-15-admin-ux-audit.md`; update
   ROADMAP/STATUS; then `superpowers:writing-plans` for the reorganization pass with the
   folded-in adjacent fixes.

## Sequencing note

The ASC bump (roles + navLayout, one bump) runs in ASC's own session and does not wait on any
of this. The reorganization pass ships the flat default regardless of audit outcomes; the
audit decides what rides with it.
