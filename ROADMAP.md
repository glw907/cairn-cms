# Roadmap

cairn-cms runs two production sites today, [ecxc.ski](https://ecxc.ski) (formerly ecnordic.ski) and
[907.life](https://907.life). It is `0.x` and breaks between minor versions. The author is
still working through the core-feature roadmap, and the project stays closely held until that
core lands.

This roadmap is a direction, not a commitment. Priorities shift as the production sites surface
needs. Items move up from lower tiers as the core fills in.

## Now

- **Media polish and cutover DX (Pass A, `0.57.1`).** The first follow-on after the media stack
  shipped in `0.57.0`. It clears the small polish and DX debt the media work left, plus the friction
  the two site cutovers (ecxc and 907) surfaced: the Media Library action feedback strip and the
  slide-over Escape edge (the 3c review carry-forwards), the decorative-hero alt persistence (the 3b
  carry-forward, so a decorative hero stops reading as needs-alt after a reload), a clearer
  reserved-`figure` build error that names the colliding component, the six cutover doc findings (two
  HIGH: the public media resolver belongs in the required media steps, and the figure-collision is a
  prominent breaking callout), and this ROADMAP refresh. The full plan is
  `docs/superpowers/plans/2026-06-17-cairn-media-polish-and-dx.md`. Additive and contained, so it
  ships as a patch.

  The `0.56.0` gates, tooling, and DX-hardening pass that held this slot has shipped: the
  public-surface narrowing, the composer alignment, the published `fail` payload types, the
  `App.Locals.editor` ambient type, the `AuthEnv` re-export, the optional concept `singular`, and the
  CI-wired golden-path E2E all landed across the `0.50.0`-through-`0.56.0` window. The remaining
  friction-log items are triaged in `docs/internal/docs-friction-log.md`, carried into the passes
  below or the scaffolder.

## Next
- **Media Pass B: replace-in-place and alt propagation.** LANDED on `feat/media-pass-b` as `0.58.0`,
  HELD for merge/release/push (Geoff's call). Upload a new file and repoint every published reference
  (a `main`-only repoint with a report-only branch-delta, the slug kept so only the hash changes), and
  propagate an alt fix across every placement of an image (opt-in overwrite, decorative respected).
  Both atomic, fail-closed, preview-confirmed. Plan + post-mortem at
  `docs/superpowers/plans/2026-06-18-cairn-media-pass-b.md`.
- **Media Pass C: bulk operations and orphan collection.** Multi-select, usage-aware bulk delete, the
  destructive `reconcileMedia` sweep that collects orphaned R2 objects, and the broadened needs-alt
  scanner. Mockup-first.
- **The `runtime.publicMediaResolver` ergonomic.** A deeper fix the ecxc cutover surfaced: have
  `composeRuntime` expose a ready-built public media resolver so a site writes
  `resolveMedia: runtime.publicMediaResolver` instead of hand-assembling
  `makeMediaResolver(mediaManifest, normalizeAssets(...))` and hand-seeding an empty `media.json`. The
  open question is how the engine reaches the committed manifest at the composition point, and whether
  the read can tolerate an absent manifest. Needs a brainstorm before a plan. It would subsume several
  of Pass A's doc fixes for future sites and the scaffolder.
- **`create-cairn-site` scaffolder.** The last engine deliverable, sequenced after the media passes so
  it templates a surface that is already hardened, DX-complete, and image-aware. One command scaffolds
  a working site with the corrected defaults, the `cairnManifest()` Vite wiring, and the setup docs, so
  a new site skips the integration archaeology the first two migrations hit. The Phase 5 reproduction
  sharpened its worklist from a fresh-install seat: ship a fenced local dev backend so a newcomer never
  hand-pastes a fake GitHub and an auth bypass, emit the `App.Locals.editor` type augmentation, omit
  the skeleton's clashing `static/robots.txt`, avoid emitting `prerender.handleHttpError: 'warn'` so a
  dangling link fails the build, and declare `@types/node`. Much of the remaining DX backlog is the
  scaffolder's own output (registering all four admin actions by default, the single import surface,
  the one sanitize floor, the `cairn:` link constraint README), so those items land here.

## Later

- **Component authoring follow-ups.** The registry, the guided insert picker (with a live preview),
  round-trip editing of a placed component, and the `llms-full` component reference have all shipped
  (round-trip and the live preview as of `0.56.2`). What remains: a persistent master-detail catalog
  rail for a large catalog, and an optional `/` slash-trigger that opens the picker at the cursor
  (both recorded in the picker spec's out-of-scope list). Two issues filed 2026-06-15 from a live
  look at the picker:
  - **Picker dialog sizing.** The component-choosing dialog fills the full viewport height. On
    desktop it should inset from the top and bottom over a visible backdrop (a capped max-height,
    content scrolling within), reading as an overlay rather than a page takeover; a full-height sheet
    stays correct only on a narrow viewport.
  - **`ComponentDef.icon` guidance.** The developer spec should require an icon that logically
    represents the component, not a decorative or arbitrary glyph. Prefer distinct icons across the
    registry, but accept a duplicate over an illogical choice. Fix the picker spec, the engine's
    `defaultIconByRole` defaults, and the component-authoring docs. The matching site-side cleanup,
    re-choosing ecxc's component icons against that guidance, is a separate ecxc site-pass, not engine
    work.
- **Content lifecycle ergonomics.** Follow-ups carried from the rename and delete passes,
  including a live region that re-announces a repeated error and a slug preview that matches the
  create form.
- **Migrate cairn's CSRF-disable mechanism before SvelteKit removes `checkOrigin`.** cairn's admin
  CSRF ownership depends on `csrf: { checkOrigin: false }`, deprecated in SvelteKit 2.61 for
  `trustedOrigins`. `trustedOrigins` cannot replace it (a missing-`Origin` POST is always forbidden,
  and the check runs before the `handle` hook), so when SvelteKit removes the disable, cairn needs a
  new mechanism. The planned fallback is an edge Transform Rule that injects `Origin` for `/admin`
  POSTs; the higher-leverage path is the upstream SvelteKit issue (sveltejs/kit#15992). Track the
  removal and act before a major lands. Reasoning in
  `docs/cairn-dx-feedback-2026-06-09-907-0.36-retrofit.md`.

## Considering

- **Broader admin extension surface.** Widen the `CairnExtension` seam so a site owner adds
  admin panels and actions within a bounded namespace, alongside the existing build-outside-it
  path.
- **A third content concept (Fragments).** The fixed-concepts model leaves room for a Fragments
  concept beyond Posts and Pages, scoped when a production site needs it.
