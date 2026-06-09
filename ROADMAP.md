# Roadmap

cairn-cms runs two production sites today, [ecnordic.ski](https://ecnordic.ski) and
[907.life](https://907.life). It is `0.x` and breaks between minor versions. The author is
still working through the core-feature roadmap, and the project stays closely held until that
core lands.

This roadmap is a direction, not a commitment. Priorities shift as the production sites surface
needs. Items move up from lower tiers as the core fills in.

## Now

- **Documentation initiative (complete).** A self-contained docs set for external adopters, built
  across six phases (legibility, reference, explanation, guides, tutorial, process). All six landed,
  and documentation is now a standing dimension of every pass (the rule lives in the `cairn-pass`
  ritual and `CLAUDE.md`). It published nothing.
- **Engine hardening before the next release.** Three improvements the documentation effort
  surfaced, gated to land before the next `0.x` publish. Narrow the public export surface so the
  `.` root and `/sveltekit` stop re-exporting another subpath's symbols and the `export *` helper
  leak ends; this precedes the scaffolder so it templates the clean surface. Harden render against
  a component `build()` that routes a directive attribute value into an `href`, `src`, or `style`
  sink. Consolidate the URL-identity model, which today spreads one URL across the YAML policy, the
  catch-all route, and the frontmatter `datePrefix`.

## Next

- **Image and gallery management.** Let a non-technical author add and place images from
  `/admin`. The open fork is storage: versioned in git next to content, or in Cloudflare R2.
  Needs a brainstorm before a plan. Sequenced ahead of the scaffolder so the capstone template
  ships image support baked in.
- **`create-cairn-site` scaffolder.** The last engine deliverable, sequenced after the gallery and
  after the DX backlog is cleared, so it templates a surface that is already hardened, DX-complete, and
  image-aware. One command scaffolds a working site with the corrected defaults, the `cairnManifest()`
  Vite wiring, and the setup docs, so a new site skips the integration archaeology the first two
  migrations hit. The Phase 5 reproduction sharpened its worklist from a fresh-install seat: ship a
  fenced local dev backend so a newcomer never hand-pastes a fake GitHub and an auth bypass, emit the
  `App.Locals.editor` type augmentation, omit the skeleton's clashing `static/robots.txt`, avoid
  emitting `prerender.handleHttpError: 'warn'` so a dangling link fails the build, and declare
  `@types/node`. Much of the remaining DX backlog is the scaffolder's own output (registering all four
  admin actions by default, the single import surface, the one sanitize floor, the `cairn:` link
  constraint README), so those items land here, not ahead of it.

## Later

- **Site component registry and guided insert.** One place per site to declare UI components
  (attributes, named slots, build) that drives render, plus a guided insert form so a
  non-technical editor places a component without writing directive syntax, and an `llms-full`
  reference for the site's component vocabulary.
- **Content lifecycle ergonomics.** Follow-ups carried from the rename and delete passes,
  including a live region that re-announces a repeated error and a slug preview that matches the
  create form.
- **Wire the showcase E2E into a gate.** The Playwright golden-path E2E is in no automated gate, so
  it rotted silently across two engine passes (the editor swap and the atomic-commit save) until the
  Phase 5 reproduction caught it. Run it in CI, or at least in the cairn-pass ritual when a pass
  touches the editor or the commit path, so a showcase-breaking engine change surfaces at once.
- **Migrate cairn's CSRF-disable mechanism before SvelteKit removes `checkOrigin`.** cairn's admin
  CSRF ownership depends on `csrf: { checkOrigin: false }`, deprecated in SvelteKit 2.61 for
  `trustedOrigins`. `trustedOrigins` cannot replace it (a missing-`Origin` POST is always forbidden,
  and the check runs before the `handle` hook), so when SvelteKit removes the disable, cairn needs a
  new mechanism. The planned fallback is an edge Transform Rule that injects `Origin` for `/admin`
  POSTs; the higher-leverage path is a drafted SvelteKit issue. Track the removal and act before a
  major lands. Reasoning in `docs/cairn-dx-feedback-2026-06-09-907-0.36-retrofit.md`.

## Considering

- **Broader admin extension surface.** Widen the `CairnExtension` seam so a site owner adds
  admin panels and actions within a bounded namespace, alongside the existing build-outside-it
  path.
- **A third content concept (Fragments).** The fixed-concepts model leaves room for a Fragments
  concept beyond Posts and Pages, scoped when a production site needs it.
