# The live-reproduction seam: requirements brief (2026-08-15)

The consolidated input for the seam's design sitting in cairn-pub, pulled forward on Geoff's
2026-08-15 sequencing call: the seam is the longest pole in the docs-visual queue (it gates the
editors rewrite, which gates the editors read, which gates release one), so its design starts in
parallel with the theme work rather than after the diagram waves. This record consolidates what
the consuming pages need, which is scattered across
[`2026-08-15-docs-outlines-with-visuals.md`](./2026-08-15-docs-outlines-with-visuals.md) (the
per-page contracts) and
[`2026-08-15-docs-visual-layer-rulings.md`](./2026-08-15-docs-visual-layer-rulings.md)
(rulings 4 and 6). It states requirements and open questions; the design belongs to the sitting,
in cairn-pub, with that repo's code in front of it.

## What the seam is

Real engine components rendered through cairn-pub's `/help` pipeline with fixture data, standing
where a screenshot would otherwise go. The anti-staleness mechanism is identity: the
reproduction IS the component from the installed engine, pinned to the engine version the docs
ship with, so it cannot drift from the product the way a captured image does.

## The consuming pages (the demand side)

Editors track, the bulk: `welcome.md` (sign-in page, confirm page), `write-in-the-editor.md`
(the annotated entry screen, the sidebar/list view, the Preview tab with width control, the open
Details panel, the figure dialog, a Tidy review in progress, a collapsed layout block),
`publish-and-history.md` (the header band at TWO widths, the History list, the pending-publish
list), `when-something-goes-wrong.md` (one refusal banner), `add-an-image.md` (insert panel,
upload form, lead-picture dialog with social-crop preview), `manage-the-media-library.md`
(library screen annotated, an image's details panel, bulk selection in grid view, the
delete-in-use confirmation), `manage-your-tag-vocabulary.md` (the Tags screen, annotated).
Admin: `invite-editors.md` (the roster, including the reader's-own-row disabled state). Extend:
`organize-your-admin-nav.md` (the sidebar rendered from the page's own worked `navLayout`) and
`add-a-custom-admin-screen.md` (the worked toolkit screen inside `CairnAdminShell`).

## Requirements

1. **Real components, fixture data.** A sample concept, sample entries, and a small fixture
   media library, rendered through the actual engine components, never mocked markup.
2. **Posed state, not just defaults.** The contracts need specific UI states: an open Details
   panel, a Tidy review mid-flight with one change marked **Review this**, grid-view bulk
   selection with the selection bar showing, the delete-in-use confirmation, the roster row
   whose controls are disabled because it is the signed-in reader's own. The seam must be able
   to pose component state, which is a harder requirement than rendering.
3. **Two-width rendering** where a contract states a narrow-screen variant.
   `publish-and-history.md`'s header band is the decider: if the seam ships single-width, that
   page's narrow-screen sentence stays prose (the contract says so explicitly).
4. **Theme-aware**, both schemes, consistent with the family artifact rules.
5. **Callout-marker overlays** for the three annotated locate-many-controls screens (ruling 6):
   numbered markers on the reproduction, detail in a keyed list in the page prose. Fallback if
   overlays miss the first version: the keyed list keys to visible on-screen labels, and the
   pattern stands.
6. **Engine-version pinning with a regeneration obligation.** Reproductions correspond to the
   engine version the docs ship with; an engine upgrade that changes an admin surface
   regenerates them, and something (a gate or the release ritual) makes a stale reproduction
   visible rather than silent.
7. **Alt and caption per the register.** The Visuals section of
   [`docs-register.md`](../docs-register.md) governs reproductions too; whatever reference form
   markdown uses must carry alt and caption, and `check:visuals` grows to cover it when the
   form exists.
8. **The no-stub rule.** No shipped page references a reproduction that does not exist; the
   editors rewrite happens once, against real reproductions.

## Open design questions (the sitting's agenda)

- **Render-time versus capture-time.** Live render at cairn-pub build (Tailwind's model;
  staleness-proof by construction, but reaches only cairn.pub) versus rendering to committed
  images at engine-upgrade time (reaches GitHub and the tarball, but reintroduces a
  regeneration discipline). Note the editors track publishes ONLY through `cairn.pub/help`, so
  the live-render option's narrow reach may be acceptable for the bulk of the demand; the
  two-part text alternative covers the markdown-only reader either way.
- **The reference form:** how a docs markdown page names a reproduction (a directive, a fenced
  block, a component-plus-props token), what GitHub and the engine's own sanitize pipeline do
  with that form (the SVG lesson from the adversarial review applies: prove the delivery path
  end to end before authoring against it), and how alt/caption attach to it.
- **Where fixtures live** (engine package, cairn-pub, a fixtures module) and how they stay
  representative without becoming a second content corpus to maintain.
- **How state posing works:** per-reproduction props/state snapshots, a story-registry
  pattern, or fixture routes; and how posed state survives engine refactors.
- **Auth context:** admin components assume a guard and session; the seam renders them without
  a real auth flow, so the fixture locals need designing.
- **Crop and framing:** full component versus region, and who decides (the contract names what
  each reproduction shows; the seam needs a mechanism, not a policy).
- **Overlay mechanics:** how marker positions attach (data attributes on engine components
  would put a docs concern in the engine; coordinates rot; the sitting picks the seam).

## The pipeline notes from the theme session (read these first)

The cairn-pub theme session banked `/help` pipeline notes for this sitting at cairn-pub
`docs/2026-08-15-help-pipeline-notes.md` (commit `f0de31b`): the routing and the editors-arm
alias, the **build-time-only rendering path and its no-per-page-component constraint** (which
bears directly on the render-time-versus-capture-time question and on what reference form is
even possible), the diagram layer's two-path theme awareness as reusable prior art, and two
inherited caveats (the installed engine does not yet ship the four-track corpus, and `/help`
content versions with the engine package). Read them before the open questions below; several
questions narrow once that constraint is in view.

## Prior art worth reading before the sitting

Tailwind's live preview boxes (the render-the-real-thing precedent at scale), Payload's
`LightDarkImage` theme-paired captures (the capture-time counter-model), Astro's
`IslandsDiagram` (a bespoke theme-native component as documentation), and cairn-pub's own
styleguide route (the closest in-house chassis for rendering engine components with fixture
props). The research record's editor-product findings (Ghost, WordPress) set the prose-to-
visual division the reproductions serve: the render carries the locating, prose carries only
what the render cannot show.
