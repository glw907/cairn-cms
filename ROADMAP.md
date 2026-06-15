# Roadmap

cairn-cms runs two production sites today, [ecxc.ski](https://ecxc.ski) (formerly ecnordic.ski) and
[907.life](https://907.life). It is `0.x` and breaks between minor versions. The author is
still working through the core-feature roadmap, and the project stays closely held until that
core lands.

This roadmap is a direction, not a commitment. Priorities shift as the production sites surface
needs. Items move up from lower tiers as the core fills in.

## Now

- **Gates, tooling, and DX-hardening pass (`0.56.0`).** One pass clears the live friction-log
  backlog that is not the scaffolder's own output (the full triage is in
  `docs/internal/docs-friction-log.md`). A 2026-06-13 sweep found most of the log already addressed,
  including the public-surface narrowing it had treated as the release-gating keystone: the root `.`
  is now a deliberate export list, the leaked internal helpers and the delivery re-exports are gone,
  and `/sveltekit` no longer duplicates the public route-data types. The `0.50.0` window absorbed the
  composer alignment, the `mintToken` widening, the published `fail` payload types, the
  `App.Locals.editor` ambient type, and the `PUBLIC_ORIGIN` condition; the golden-path E2E is already
  wired into CI. What remains is robustness and polish, mostly small and independent:
  - **Gates/CI:** an automated DOM check for the admin render (the drawer-scoping regression that
    shipped on a glance); a signature-currency check that compares each reference page's declared
    types against the real exports; the plain-Node dist-spawn test that rot-proofs the
    `/delivery/data` node-safety guarantee; the manifest bin's `cwd`-versus-`config.root` fix; the
    editor link-picker narrowing to real content targets.
  - **Engine DX (additive):** re-export `AuthEnv` from `/sveltekit` (it is consumed there, and
    `skipLibCheck` hid the missing member through two retrofits); an optional `singular` on a concept
    descriptor for the create affordances ("New post", not "New Posts"); render attribute-sink
    hardening so a component `build()` cannot route a value into an `href`/`src`/`style` sink
    unsanitized (defence-in-depth, site-developer-controlled today, gated by the security reviewer).
  - **Docs:** the preview frame's dual client/server emission; doctor self-derivation tied to the
    `cairnManifest` plugin; the `app.d.ts` Platform block verbatim; the `prerender.handleHttpError`
    flag where the delivery docs introduce the feeds; an interim security contact in `SECURITY.md`
    while the repo stays private; steering manifest regeneration to the `cairn-manifest` bin.

  The tasks are mostly independent, so this pass is a good candidate for the Workflow tool on opt-in.
  Each item is re-verified at plan time, since the friction-log sweep showed how stale the log had grown.

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

- **Component authoring follow-ups.** The registry, the guided insert picker (with a live preview as
  of `0.56.2`), and the `llms-full` component reference have shipped. What remains: round-trip editing
  of a placed component (re-open a directive into the guided form, which the parser and a
  serialize/parse identity test already position), a persistent master-detail catalog rail for a
  large catalog, and an optional `/` slash-trigger that opens the same picker at the cursor. All three
  were deferred from the `0.56.2` picker pass and are recorded in its spec's out-of-scope list.
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
