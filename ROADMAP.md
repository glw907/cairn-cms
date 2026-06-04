# Roadmap

cairn-cms runs two production sites today, [ecnordic.ski](https://ecnordic.ski) and
[907.life](https://907.life). It is `0.x` and breaks between minor versions. The author is
still working through the core-feature roadmap, and the project stays closely held until that
core lands.

This roadmap is a direction, not a commitment. Priorities shift as the production sites surface
needs. Items move up from lower tiers as the core fills in.

## Now

- **Documentation initiative.** A self-contained docs set for external adopters, built in six
  phases across the four Diátaxis arms. Phase 1 (legibility and split) is in progress.
- **Publish the rolled version window.** `0.24.0` is the registry `latest`; `main` carries an
  unpublished `0.25.0` and `0.26.0`. Publish the window before any consumer imports the new
  `@glw907/cairn-cms/vite`, `@glw907/cairn-cms/delivery/data`, or `cairn-manifest` entries.

## Next

- **`create-cairn-site` scaffolder.** The engine capstone of the DX sequence. One command
  scaffolds a working site with the corrected defaults, the `cairnManifest()` Vite wiring, and
  the setup docs, so a new site skips the integration archaeology the first two migrations hit.
- **Image and gallery management.** Let a non-technical author add and place images from
  `/admin`. The open fork is storage: versioned in git next to content, or in Cloudflare R2.
  Needs a brainstorm before a plan.

## Later

- **Site component registry and guided insert.** One place per site to declare UI components
  (attributes, named slots, build) that drives render, plus a guided insert form so a
  non-technical editor places a component without writing directive syntax, and an `llms-full`
  reference for the site's component vocabulary.
- **Content lifecycle ergonomics.** Follow-ups carried from the rename and delete passes,
  including a live region that re-announces a repeated error and a slug preview that matches the
  create form.

## Considering

- **Broader admin extension surface.** Widen the `CairnExtension` seam so a site owner adds
  admin panels and actions within a bounded namespace, alongside the existing build-outside-it
  path.
- **A third content concept (Fragments).** The fixed-concepts model leaves room for a Fragments
  concept beyond Posts and Pages, scoped when a production site needs it.
