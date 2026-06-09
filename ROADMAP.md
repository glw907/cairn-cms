# Roadmap

cairn-cms runs two production sites today, [ecxc.ski](https://ecxc.ski) (formerly ecnordic.ski) and
[907.life](https://907.life). It is `0.x` and breaks between minor versions. The author is
still working through the core-feature roadmap, and the project stays closely held until that
core lands.

This roadmap is a direction, not a commitment. Priorities shift as the production sites surface
needs. Items move up from lower tiers as the core fills in.

## Now

- **Diagnostics initiative (Pass 1 of 3 landed).** One condition registry is the single source of
  truth for the readiness checklist, the `cairn doctor` probe, and the runtime error. Pass 1 (the
  foundation) published in `0.37.1`. Pass 2 (the email-delivery runtime arm) has a written plan and
  ships `0.38.0`, giving the login flow an awaited send with `send_error` and `throttled` feedback
  and registering the two email conditions. Pass 3 closes the initiative with the doctor and the
  generated, gated readiness checklist.
- **ecxc.ski bump to `0.38.0` after Pass 2 publishes.** Both production sites are current
  (907.life at `^0.36.0`, ecxc.ski at `^0.37.1` after its rename from ecnordic-ski). A small
  bump-and-deploy on ecxc.ski after the publish puts the send-failure feedback live where the
  originating finding was filed, the same proof role the 907.life retrofit played for CSRF
  ownership.

## Next

- **Gates and tooling pass.** One pass replaces the former DX-sweep Passes B and C. It aligns the
  showcase to the documented `$lib/cairn.server.ts` composer and wires the golden-path E2E into CI
  so the gate pins the documented pattern. It also adds an automated DOM check for the admin
  render, adds the plain-Node dist-spawn test that rot-proofs the `/delivery/data` node-safety
  guarantee, fixes the manifest bin's `cwd`-versus-Vite-`config.root` handling, narrows the editor
  link picker to real content targets, and widens `mintToken` to accept a sync return. The
  non-gate Pass C remnants (a published type for each action's `fail` payload, the
  `App.Locals.editor` ambient type) move to the scaffolder and the extension seam, where they are
  naturally exercised.
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
