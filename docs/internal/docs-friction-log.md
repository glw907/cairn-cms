# Docs friction log

Writing a doc is also a design review. This file collects the design friction that documenting
cairn surfaces, so a rough edge becomes a tracked candidate for work instead of a lost
observation. Triage feeds `ROADMAP.md` and `docs/STATUS.md`; this repo keeps no separate backlog
file. A finding here does not block the doc that found it.

Record each finding with its perspective, the doc that surfaced it, and a short note. The
perspective is `developer` (the integrator building and deploying a site) or `editor` (the
non-technical author working in `/admin`).

## Triage (2026-06-13)

A sweep against the working tree found most of this log already addressed. It is append-only and was
never pruned, so it reads heavier than the live backlog. Status of every finding:

**Resolved (verified in the tree).** The public-surface narrowing keystone: the root `.` is now a
deliberate export list (the leaked internal helpers like `signingSelfTest`/`readRaw`/`fileSha` and
the delivery re-exports are gone), and `/sveltekit` no longer duplicates the public route-data types
or needs the `PublicListData` alias. Also resolved: the `App.Locals.editor` ambient type (the
`/ambient` subpath); `mintToken` widened to `string | Promise<string>`; the published action-`fail`
payload types (`SaveFailure`, `ContentFormFailure`, and siblings); the showcase composer alignment
(`cairn.server.ts`, no inline `createContentRoutes`); the golden-path E2E wired into CI
(`.github/workflows/e2e.yml`); the `PUBLIC_ORIGIN`/`requireOrigin` condition (registry entry
`config.public-origin-invalid`); the URL-identity explanation home (`docs/explanation/content-model.md`
plus the internal `entryIdentity` consolidation); the `CHANGELOG`/`homepage` in the published tarball;
the render-sink escalation question (answered: it stays site-developer-controlled, narrow blast
radius); and the golden-path E2E selector/double rot (fixed in `ba25359`).

**Live, assigned to the gates/tooling/DX-hardening pass (the ROADMAP "Now").**
- Gates/CI: an automated admin-render DOM check; a signature-currency check for the reference pages;
  the plain-Node dist-spawn test for `/delivery/data`; the manifest bin's `cwd`-vs-`config.root` fix;
  the editor link-picker narrowing.
- Engine DX (additive): re-export `AuthEnv` from `/sveltekit`; an optional concept `singular` label
  for the create affordances; render attribute-sink hardening (defence-in-depth, security-reviewed).
- Docs: the preview dual-emission note; doctor self-derivation tied to the `cairnManifest` plugin; the
  `app.d.ts` Platform block verbatim; the `prerender.handleHttpError` flag in the delivery docs; an
  interim `SECURITY.md` contact; steer manifest regeneration to the `cairn-manifest` bin (907's
  hand-rolled loader broke under Node 24).

**Live, deferred to the P4 scaffolder (its own output).** The fenced local dev backend; the
project-setup emission (`@types/node`, omit the skeleton `robots.txt`, the prerender policy); the
robots-collision warn.

Each live item is re-verified at plan time, since this sweep showed how stale the log had grown.

## Triage (2026-06-17, Pass A)

Pass A (`0.57.1`, `docs/superpowers/plans/2026-06-17-cairn-media-polish-and-dx.md`) closed the media
and cutover findings below. Status of each:

**Resolved (shipped in Pass A or earlier).**
- The optional concept `singular` descriptor (2026-06-13 finding) already shipped before this pass:
  `normalizeConcepts` resolves `singular: config.singular ?? label` and the create affordances render
  `New {createNoun}` from it. Marked resolved, not re-done.
- The `media:`/`cairn:` content-authoring syntax home (media foundation finding): a new
  `docs/reference/authoring-syntax.md` documents both token schemes together, independent of the
  export pages, linked from the reference index.
- The plan test-path convention (media foundation finding): a Conventions note in
  `docs/internal/README.md` records that tests live under `src/tests/{unit,integration,component}/`.
- The admin fetch-action transport (2a finding): a "Writing an admin fetch action" note in
  `docs/reference/sveltekit.md` documents the `text/plain` body, the `X-Cairn-CSRF` header, and the
  200 JSON envelope.
- Cutover finding 1, the reserved-`figure` collision (HIGH): the thrown error in `defineRegistry` now
  names the colliding component and gives a remove-or-rename hint (engine), and the upgrade guide and
  changelog carry a prominent breaking callout that states the remove-the-custom-figure case (docs).
- Cutover finding 2, the public media resolver as a required step (HIGH, docs half): the resolver
  wiring moved into the required media steps in both the upgrade guide and the wire-the-delivery
  guide, with the changelog's `Consumers must:` extended to name it. The deeper ergonomic is carried
  (below).
- Cutover finding 3, the resolver import path: the guide snippets now name
  `@glw907/cairn-cms/media` for `makeMediaResolver` and `normalizeAssets`.
- Cutover finding 4, the empty `media.json` bootstrap (docs half): the guides now tell a fresh site
  to create `src/content/.cairn/media.json` as `{}`. The resolver-tolerance alternative is carried.
- Cutover finding 5, the R2 binding dialect: the upgrade and wire guides now show both the
  `wrangler.jsonc` and the `wrangler.toml` form.
- Cutover finding 6, the figure CSS scope: the guides now call out that the `.cairn-place-*` rules are
  scoped to the showcase's `.site-main`, so a site whose content container differs must re-scope every
  selector.

**Carried (a deeper fix beyond Pass A).**
- The `runtime.publicMediaResolver` ergonomic, shared by cutover findings 2 and 4: have
  `composeRuntime` expose a ready-built public resolver so a site stops hand-assembling it and
  hand-seeding an empty `media.json`. Needs a brainstorm before a plan; tracked in `ROADMAP.md` (Next)
  and the Pass A plan's carry-forwards.

## Findings

Phase 1 seeds this file. Later phases append as they write.

- **developer** (npm packaging, from `cairn-dx-feedback-2026-06-04-ecnordic-0.24.md`): the
  published tarball shipped no `CHANGELOG.md` and no `homepage`, so an npm consumer could not
  reach the upgrade record from the registry page. Addressed in this phase's metadata task.
- **developer** (security policy, from `SECURITY.md`): the repo is private, so GitHub's private
  vulnerability reporting cannot be enabled. The API call
  `PUT repos/glw907/cairn-cms/private-vulnerability-reporting` returns 404, and the Security tab's
  "Report a vulnerability" flow is unavailable while the repo stays private. `SECURITY.md`
  describes the intended public-state channel. Enable private reporting when the repo goes public,
  or add an interim email fallback if the project takes outside reports before then.
- **developer** (public surface, from `reference/core.md`): the `.` entry exports 174 names, and
  several are internal helpers leaked through `export *` (`signingSelfTest`, `fileSha`, `contentsUrl`,
  `treeUrl`, `readRaw`, `strProp`, `markFirstList`, `isElement`, and similar). A site should not
  depend on them, and documenting them as public cements an accidental surface. Candidate: a future
  engine pass narrows `.` by stopping the `export *` leak, so the public surface is deliberate. The
  reference page tiers them as Low-level in the meantime.
- **developer** (delivery duplication, from `reference/core.md`): the `.` entry re-exports the whole
  delivery builder and responder set (`buildRssFeed`, `jsonFeedResponse`, `createPublicRoutes`, and
  the rest), so the same symbols document on both `core.md` and the delivery pages. The core page
  notes the overlap and points a reader at the delivery surface, but the dual home is a sign the
  root re-export is wider than a site needs from `.`. Same surface-narrowing pass would resolve it.
- **developer** (delivery duplication, from `reference/sveltekit.md`): the `/sveltekit` entry
  re-exports `createPublicRoutes` and the public route-data types (`PublicRoutesDeps`, `TagData`,
  `TagIndexData`, `EntryData`, and a second `ListData` re-aliased to `PublicListData`), whose natural
  home is `/delivery`, where the matching `CairnHead` component lives. A site imports the public
  loaders from `/delivery`, so the `/sveltekit` copy is a second home that the reference page has to
  cross-link rather than document in place. The `ListData` collision, one admin shape and one public
  shape on the same subpath, also forces the `PublicListData` alias. A surface-narrowing pass that
  keeps the public loaders on `/delivery` alone would resolve both.
- **developer** (export surface, corroborated by the Phase 3 explanation brainstorm): the over-export
  findings above show up a second time when the architecture narrative tries to draw a clean
  engine/site line, since a root that re-exports half of `/delivery` contradicts a layered story. The
  surface-narrowing pass is now a release gate (see `ROADMAP.md`, land it before the next `0.x`
  publish and before the scaffolder, so the scaffolder templates the narrowed surface).
- **developer/security** (render attribute sinks, from the Phase 3 explanation brainstorm): the
  sanitize floor records a residual where a component `build()` that routes a directive attribute
  value into an `href`, `src`, or `style` sink is not sanitized. An honest `security-model.md` has to
  state it. Today the path is site-developer code rather than editor input, so the blast radius is
  narrow, but a render-hardening pass should close it (sanitize component-built attribute values, or
  constrain what `build()` may emit into URL and style sinks). Release-gated with the surface-narrowing
  pass. If writing `security-model.md` shows the sink is broader than site-controlled code, escalate.
- **developer** (URL identity spread, from the Phase 3 explanation brainstorm): one URL is assembled
  from the YAML url policy, the catch-all `byPermalink` route, and the frontmatter `datePrefix`. It is
  the concept most likely to need a diagram to explain, which is itself a complexity signal. Candidate:
  a single overview helper or a consolidated explanation. Softer than the two above, release-gated with
  them.

- **developer** (URL identity spread, from `docs/explanation/content-model.md`): writing the URL
  identity section confirmed the spread firsthand. One URL is assembled from the frontmatter date,
  the per-concept `datePrefix`, and the YAML url policy that the catch-all `byPermalink` route reads.
  The section could not be explained in plain prose without pointing at three places and leaning on a
  diagram, which corroborates the brainstorm finding that this concept is the strongest candidate for
  a consolidating helper. Release-gated with the surface-narrowing pass.
- **developer/security** (render attribute sinks, RESOLVED check from `docs/explanation/security-model.md`):
  the render-sink entry above asked the security page to escalate if an author could reach the
  unsanitized sink. Writing the page resolved that question, and the answer is no. The source path is
  `readAttributes` in `src/lib/render/rehype-dispatch.ts`, which reads the author-supplied directive
  attribute values, then `transformNode` hands them to `def.build(ctx)`, a registry function the site
  developer writes. An author controls the attribute values, and only a `build()` decides whether a
  value reaches an `href`, `src`, or `style` sink. The hole is not reachable by an author through
  markdown alone, so it stays site-developer-controlled and the blast radius stays narrow. No
  escalation. The render-hardening candidate stays release-gated at its existing severity, a
  defence-in-depth improvement rather than an open author-reachable hole. The fix still stands:
  sanitize component-built attribute values, or constrain what `build()` may emit into URL and style
  sinks, so a site developer cannot author the hole by accident.
- **process** (no new candidate, from the Phase 3 explanation arm): the arm surfaced no engine
  improvement beyond the three already gated. Each page instead applied adversarial pressure to a
  known finding. `architecture.md` confirmed the `.` over-export contradicts a clean engine/site line
  firsthand, `content-model.md` confirmed the URL spread, and `security-model.md` confirmed the render
  sink stays narrow. Explaining a design is good pressure on its surface, since the explanation resists
  where the surface is muddy. The arm validated the backlog rather than extending it.
- **developer** (no first-class local admin dev mode, from `docs/tutorial/build-your-first-cairn-site.md`,
  milestone 8): bringing up the admin locally needs an authenticated editor and a committing GitHub App,
  neither of which exists on a developer's machine. The engine ships no built-in local dev mode for the
  admin, so the tutorial has to hand-roll two fixtures: a fake-GitHub `fetch` double that answers
  `api.github.com` from memory, and an auth-bypass server hook gated by `CAIRN_DEV_BACKEND=1` that sets
  `event.locals.editor`. Both are copied from the showcase's `fake-github.ts` and `hooks.server.ts`. A
  newcomer must paste working-but-dangerous code before they can see the admin run. Candidate for the P4
  scaffolder: generate a fenced, flag-gated local dev backend so the loop runs out of the box without the
  reader hand-rolling an auth bypass.

- **developer** (slug codec is not adapter surface, from `docs/guides/define-an-adapter-and-schema.md`):
  the guide asked for a step that sets "the slug codec and the per-concept `datePrefix`" on the adapter,
  but the real showcase adapter carries neither. The URL policy and `datePrefix` live in the YAML site
  config, and the showcase YAML carries only a menu, so the showcase relies on the concept defaults. The
  guide step was written to point at the YAML and the URL identity explanation instead of inventing
  adapter fields. This corroborates the URL-spread finding above: a reader looking for where slugs are
  shaped has no single home to point at, which is the same complexity the surface-narrowing candidate
  targets.

- **developer** (Reproduction, from `docs/tutorial/build-your-first-cairn-site.md`, Task 6): the build-and-run
  reproduction followed the tutorial literally in a throwaway site (`/tmp/field-notes`) on the published
  `@glw907/cairn-cms@0.26.0`, no `main` tarball fallback. The result reproduces: `npm run cairn:manifest`
  and `npm run build` exit 0, the home prerenders both post summaries with their permalinks, the
  packing-list page renders the callout and the resolved `cairn:` internal link (`/2026/05/01/first-trail`),
  and the feeds, sitemap, and robots all prerender. `npm run check` is 0/0. The admin loop was driven
  headless: `/healthz` serves 200, `/admin` redirects to the posts list, the list and the editor and the nav
  editor serve 200, and a save (plain and with a `cairn:` link) commits through the dev GitHub and logs
  `[dev-github] committed`. Several steps the build proved wrong were folded back as page fixes (commit
  `1eef926`), and most of them point at the same gap the missing-local-admin-dev-mode finding above already
  names: the tutorial hand-rolls a dev backend, and the hand-rolled fixture had to grow to answer the Git
  Data API atomic-commit path and to seed the build manifest before a save would succeed. The other fixes
  were project-setup omissions a registry consumer hits but the symlinked showcase does not (`@types/node`,
  the `App.Locals.editor` declaration, deleting the skeleton's default `static/robots.txt`, and a current
  SvelteKit failing the build on the uncrawled feed and robots routes without a `handleHttpError` policy).
  Candidate for the P4 scaffolder: emit the project-setup pieces and a working dev backend so a newcomer does
  not paste a fixture that the engine's commit path has since outgrown.

The Phase 5 reproduction broke into these distinct candidates, triaged below so P4 and a hardening pass
inherit a clean list rather than one prose note.

- **developer** (CONFIRMED bug, FIXED, from the Phase 5 reproduction): the showcase golden-path E2E
  (`examples/showcase/e2e/golden-path.spec.ts`) was broken against the current engine on two fronts, both
  masked because Playwright E2E is not in `npm test`. Running it confirmed the regression. The proximate
  failure was a stale Carta-era editor selector (`textarea.carta-font-code` / the SSR `aria-label` textarea):
  the editor swapped to CodeMirror at 0.9.0, which mounts a contenteditable `.cm-content` and removes the SSR
  textarea, so the test timed out before reaching the save. Behind it sat a second break: `fake-github.ts`
  answered only single-file `PUT /contents`, but content saves now commit through the atomic `commitFiles`
  Git Data API (`GET git/ref/heads`, `GET git/commits/<sha>`, `POST git/trees`, `POST git/commits`, `PATCH
  git/refs/heads` in `src/lib/github/repo.ts`). Fixed in `ba25359`: the E2E drives `.cm-content`, and the
  double models the atomic endpoints, recording the `.md` content entry as the commit. Both golden-path tests
  pass. Open follow-up, separate from this fix: Playwright E2E is not in any gate, so this rot recurred
  silently across two engine passes; a future pass could wire the showcase E2E into CI so an engine change
  that breaks the showcase save surfaces at once.
- **developer** (engine surface, from the Phase 5 reproduction): the engine sets `event.locals.editor` but
  ships no ambient type for it, so a consumer must hand-write the `App.Locals.editor` augmentation in
  `app.d.ts`. Candidate: ship the `App.Locals` augmentation from the package (or have the scaffolder emit it).
- **developer** (engine surface, from the Phase 5 reproduction): the SvelteKit skeleton's default
  `static/robots.txt` silently collides with the engine's robots route, and nothing warns; the consumer just
  deletes the static file. Candidate: the scaffolder omits the static file, and the engine could detect and
  warn on the collision.
- **developer** (engine surface, from the Phase 5 reproduction): a current SvelteKit fails the build on the
  uncrawled feed, sitemap, and robots routes unless `prerender.handleHttpError: 'warn'` is set, which the
  consumer has to discover. Candidate: the scaffolder emits the prerender policy, and the delivery docs name
  the flag where they introduce the feeds.
- **developer** (docs and type, from the Phase 5 reproduction): `mintToken` returns `Promise<string>`, but the
  `admin-route-structure.md` canonical example showed a sync `() => 'dev-token'`, which is a type error. Action:
  fix the doc example; consider widening the type to `string | Promise<string>` so the simple case just works.
- **developer** (consistency, from the Phase 5 reproduction): the showcase inlines `createContentRoutes(...)`
  per route, while the docs prescribe the `$lib/cairn.server.ts` composer; the canonical pattern was not
  validated end to end until the tutorial reproduction. Candidate: align the showcase to the composer so the
  documented path stays exercised.
- **developer** (engine surface, from the admin UX rebuild plan 2, 2026-06-07): the self-styling CSS build
  scoped DaisyUI's nested rules incorrectly, so the `lg:drawer-open` sidebar never rendered, and that defect
  shipped in plan 1 unseen because the plan-1 visual proof confirmed only that components were styled, not
  that the full drawer shell laid out. A render check that asserts a specific surface is present catches what
  a "looks styled" glance misses. Action taken: plan 2 fixed the build (flatten nesting before scoping) and
  the layout (`data-theme` on a wrapper), and added a regression test plus a light-and-dark showcase proof.
  Candidate: the showcase admin render belongs in an automated visual or DOM check so a scoping regression
  cannot reach a release on a glance again.
- **editor** (admin UX, from plan 2's review gate, 2026-06-07): the per-row delete refusal first shipped with
  a dead UI (the action returned a flat conflict shape the component did not read, and the route shim did not
  forward the `form` prop), so a blocked delete refused server-side but told the author nothing. The engine
  and the consumer route disagreed on the action result shape with no shared type to bind them. Candidate: a
  published type for each action's `fail` payload, so the component and the shim cannot drift from the action.
- **developer** (docs gates, from the Pass 2 review gate, 2026-06-10): both auth reference pages had
  drifted and every gate stayed green. `sveltekit.md` documented `requestAction`'s pre-0.38.0 return
  shape, and its `loginLoad` signature had missed the `csrf` field since 0.35.0; only the svelte
  reviewer caught either. `check:reference` verifies export coverage (a page exists per export), not
  signature currency, so a stale declared type inside an existing page is invisible to it. Candidate:
  a signature-currency check that compares a reference page's declared types against the real
  exports, or generated signature blocks; belongs with the gates-and-tooling pass.
- **developer** (types, from the 907 0.51 crossing's review gate, 2026-06-12): both site retrofits
  imported `AuthEnv` from `@glw907/cairn-cms/sveltekit`, which never exported it, and the error was
  invisible because `skipLibCheck` swallows missing-member errors inside a consumer's `app.d.ts`,
  silently degrading `Platform.env.EMAIL` to an error type. The sites copied the import from each
  other; whatever shape they first copied read naturally enough that two retrofits repeated it.
  Candidate: re-export `AuthEnv` from the `/sveltekit` subpath (it is consumed there in practice),
  and show the `app.d.ts` Platform block verbatim in the deploy guide.
- **developer** (preview knob docs, from the 907 0.51 crossing, 2026-06-12): the adapter guide says
  the preview frame links "the same sheet the site layout loads", but with `?url` imports in both
  the layout and the adapter, the client and server pipelines each emit their own differently
  transformed hashed copy (the page links the client copy, the frame the server copy; both ship,
  ecxc and 907 confirmed). Candidate: document the dual emission honestly in the adapter guide and
  the upgrade entry, so a developer diffing their build output does not read it as a defect.
- **developer** (doctor self-derivation, from the 907 0.51 crossing, 2026-06-12): a site without
  the `cairnManifest` Vite plugin gets four doctor skips (`--from`/`--repo`/zone checks) because
  the derivation rides the manifest bin's Vite machinery. The skip copy says "configure the
  cairnManifest plugin" but no doc states that the plugin is what powers doctor derivation.
  Candidate: a line in the doctor reference and the deploy guide tying derivation to the plugin.
- **editor** (concept label number, from the 0.55.0 office-list pass, 2026-06-13): the create
  affordances read `New {concept.label}`, which renders "New Posts" / "New Pages" (plural), and the
  office pass made it more prominent by adding a second create control (the trailing foot row). The
  gold-standard mockup idealized the singular "New post". A concept descriptor carries only the
  plural label, so there is no singular form to use. Candidate: an optional `singular` (or
  `labelSingular`) on the concept descriptor, defaulting to the label, used by the create button, the
  trailing row, and the create dialog title; until it lands the mockup stays aspirational on this one
  string. Tracked as a STATUS carry-forward.
- **developer** (media: scheme reference home, from the media foundation pass, 2026-06-15): the
  `media:<slug>.<hash>` reference is author-facing syntax, like `cairn:` links, but its codec is
  engine-internal (not a public export), so it has no natural home in the export-keyed reference. It
  landed as prose in the `assets` adapter-member section of `core.md`. The `cairn:` scheme has the same
  shape but is documented under its public `parseCairnToken` helper. Candidate: a content-authoring
  syntax reference section covering `cairn:` and `media:` together, independent of the export pages.
- **developer** (plan test-path convention, from the media foundation pass, 2026-06-15): the foundation
  plan named co-located test paths (`src/lib/media/*.test.ts`), but the repo's vitest config only runs
  `src/tests/{unit,integration,component}/`, so a co-located test is silently never run. Every test
  landed in `src/tests/unit/` instead. Candidate: a one-line note in the contributor or plan-authoring
  guidance that tests live under `src/tests/`, so a future plan does not specify a path the suite skips.
- **developer** (upload transport: form action vs raw body, from the media 2a pass, 2026-06-16): the 2a
  spec specified a raw-body upload with the image's real `Content-Type` and CSRF in an `X-Cairn-CSRF`
  header, wired through `createCairnAdmin` as a form action (`?/upload`). Two SvelteKit realities the
  design did not account for surfaced only when the showcase slice exercised the real wire: a form
  action 415s any POST whose content type is not form-encoded before the action runs, and the result of
  a form action rides a 200 JSON envelope (`{ type, status, data }`), so `fail(413)` is not an HTTP 413.
  The build reconciled both without leaving the single-mount admin: the client posts `text/plain` (the
  one form content type that carries raw bytes), the guard clears a valid `X-Cairn-CSRF` header before
  the body-cloning form-field check, and the docstrings now state the envelope contract. Candidate: a
  short "writing an admin fetch action" note in the SvelteKit reference or a guide, so the 2b client and
  any future fetch-style admin action build against the envelope-and-text/plain transport from the start
  rather than rediscovering the 415 and the envelope. Tracked as a 2b carry-forward in STATUS.
- **developer** (media: the reserved-figure collision is a hard build break, from the ecxc 0.57.0
  cutover, 2026-06-17): HIGH. Cairn 0.57 reserves the `figure` directive (3a), so `defineRegistry`
  throws if a site registers a component named `figure`, which fails `cairn-manifest` AND the build
  with `cairn: "figure" is a reserved directive name ... a component cannot use it`. ecxc had exactly
  one (a hand-rolled `:::figure[Caption]` that 3a now provides natively), so the upgrade did not build
  until it was removed. The upgrade guide warns about the rename, but three gaps: the error names
  neither the offending registry nor the component, so a developer must grep; the guide says "rename
  any such component" without the case that matters more (a custom figure superseded by 3a should be
  REMOVED, adopting the engine's, not renamed); and a hard build failure on a point upgrade deserves a
  prominent breaking-change callout, not a mid-paragraph aside. Candidate: name the colliding component
  in the thrown error with a "rename or remove it" hint, and raise the figure-collision note in the
  changelog and the upgrade guide.
- **developer** (media: the public media resolver is required, not hero-optional, from the ecxc 0.57.0
  cutover, 2026-06-17): HIGH. The upgrade guide's required steps (bind the bucket, mount the route,
  declare `assets`) make media work for the EDITOR (insert plus the admin preview), but a published
  body `![](media:...)` ships a bare `media:` token on the LIVE site unless the site threads a
  `makeMediaResolver` into both `render` and `createPublicRoutes`. That wiring is buried under the
  OPTIONAL "adopt the hero" section, so a developer who does only the required steps ships broken public
  images and no error says so. Candidate: move the resolver wiring into the required media steps (it is
  needed for any public media, body or hero), and consider having `composeRuntime` expose a ready-built
  public resolver (`runtime.publicMediaResolver` over the media manifest plus `resolvedAssets`) so a
  site writes `resolveMedia: runtime.publicMediaResolver` instead of hand-assembling it from `/media`.
- **developer** (media: the resolver symbols lack an import path, from the ecxc 0.57.0 cutover,
  2026-06-17): MEDIUM. The upgrade guide writes `makeMediaResolver(mediaManifest, normalizeAssets(...))`
  but never states both import from `@glw907/cairn-cms/media`; only the showcase source shows it. A
  developer cannot resolve the symbols from the guide alone. Candidate: name the `/media` subpath in
  the guide snippet.
- **developer** (media: a fresh site needs a hand-seeded empty media.json, from the ecxc 0.57.0
  cutover, 2026-06-17): MEDIUM. The showcase pattern `import mediaManifest from
  '../content/.cairn/media.json'` fails the build with a module-not-found on a site that has never
  uploaded, since no `media.json` exists yet and the upload pipeline writes it only on a branch.
  Candidate: tell the cutover to create `src/content/.cairn/media.json` as `{}` first, or have the
  resolver tolerate an absent manifest so the import is not load-bearing.
- **developer** (media: the R2 binding is documented as wrangler.jsonc only, from the ecxc 0.57.0
  cutover, 2026-06-17): LOW. Both the upgrade guide and the wire guide give the `r2_buckets` binding as
  a JSONC snippet; a `wrangler.toml` site (ecxc) must translate it to `[[r2_buckets]]`. Candidate: show
  both dialects, or note the translation.
- **developer** (media: the figure CSS reference is scoped to .site-main, from the ecxc 0.57.0 cutover,
  2026-06-17): LOW. The showcase `.cairn-place-*` rules are scoped to `.site-main`; the guide says
  "copy those rules and adjust the pixels", but a site whose content container differs (ecxc uses
  `.post-body`) must re-scope every selector, not just tune pixels. Candidate: call out the re-scope,
  or ship the placement CSS as an importable, container-agnostic stylesheet.
- **developer** (media Pass B: adding an admin action has no single documented path, from the
  `sveltekit.md` reference work, 2026-06-18): MEDIUM. A new admin action must be wired in two places
  the docs do not connect: the function on `createContentRoutes` AND a `viewAction([...])` registration
  in `createCairnAdmin`'s `actions` record (`cairn-admin.ts`). Pass B's component posted to
  `?/mediaReplacePreview` and friends before the composer registered them, so the live action would have
  405'd; only the showcase E2E (or a real cutover) would catch it, since the unit/component tests stub
  the transport. Candidate: a short "Adding an admin action" note (extending Pass A's "Writing an admin
  fetch action") that lists both registration points plus the reference-signature, log-events, and
  composer-routing-test steps, so the seam is not rediscovered each pass.

### Media 0.59.0 cutover, ecxc-ski live smoke (2026-06-20)

The first live admin smoke of the media stack (six passes deferred to this cutover) against the real
ecxc.ski Worker, real D1 (cairn-ecxc-auth), and real R2 (ecxc-media). Deploy was clean and the read paths
proved live (home 200, the /media route mounted with a clean 404 for a missing asset, admin login 200,
and /admin/media 200 rendering the empty-state Media Library off a minted D1 session). The destructive
purge was smoked on a throwaway orphaned byte. Three DX findings:

- (developer) MEDIUM. `wrangler ... --json` writes a "Cloudflare agent skills are available" notice to
  stdout ahead of the JSON, which breaks any `JSON.parse` of the piped output. Workaround used: slice from
  the first `[` (`sed -n '/^\[/,$p'`). Any cutover or doctor tooling that consumes wrangler `--json` needs
  this guard, or wrangler should send that notice to stderr.

- (developer) MEDIUM. There is no documented recipe for the live smoke of the MEDIA actions. The
  admin-smoke-test doc covers minting a session, but not the media-action transport: the orphan scan, the
  purge, and the bulk delete are SvelteKit form actions that need the CSRF double-submit (the
  `__Host-cairn_csrf` cookie value echoed in the `X-Cairn-CSRF` header), a multipart body to satisfy the
  form-action content-type, and decoding of the devalue-encoded ActionResult envelope. Candidate: a "media
  smoke" appendix to admin-smoke-test.md with the curl recipe for scan/purge/bulk-delete on throwaway
  assets, since this is the part every site cutover now has to rediscover.

- (developer / operator) MEDIUM, the noteworthy one. After a purge reported success, the Worker's own
  reconcile (the orphan scan's R2 `list`) showed the byte gone immediately, but `wrangler r2 object get` by
  exact key still returned it for a short window. This is R2 delete propagation lag on the direct-get path,
  not a cairn defect (the purge calls `bucket.delete()`, which resolved, and the Worker's list reflects the
  deletion). The lesson for the smoke procedure and for any operator verifying a purge: confirm a purge via
  the orphan scan (the Worker's list view), not a direct `wrangler r2 object get`, which can lag. Worth a
  one-line caveat in the media smoke recipe.

### Editor in-admin help design pass (2026-06-23)

Producing the in-admin editor help (the proposal, three option mockups, and a six-dimension adversarial
critique, under `docs/internal/design/2026-06-23-editor-help-mockup-{a,b,c}.html`) surfaced a cluster of
gaps the help had to compensate for. The critics converged on these independently. Several extend the
existing scaffolder and local-dev-mode candidates above.

- **editor/developer** (starter/seed content, HIGH): the strongest first-run activator across all three
  mockups is an editable, labeled starter post in the empty state (the Ghost pattern), but the engine has
  no mechanism to commit labeled starter `.md` entries on a fresh site or to distinguish them from authored
  content in the list and usage model, so the empty state's primary action opens nothing on a real site.
  Candidate: the P4 `create-cairn-site` scaffolder seeds concept-differentiated starters (a Post starter
  and a Page starter), and the empty-state recipe gains a starter-content slot. Extends the scaffolder
  seed candidates above.
- **editor/developer** (per-editor onboarding-progress state, HIGH): the resumable getting-started checklist
  implies persisted per-editor completion flags, but cairn's auth is opaque D1 session rows carrying no
  profile state, so progress resets each login or device, and the mockups leak impossible states ("2 of 5
  done" on an empty site). Onboarding-state is also conflated with content-emptiness, so a new editor on an
  established site has no first-run path. Candidate: a per-editor progress record (a D1 row keyed by editor
  and site) that separates per-editor first-run from per-site first-content, or scope progress to per-device
  storage with copy that does not over-promise.
- **developer** (frontmatter field-description channel, HIGH): schema-authored per-field help under the input
  (the Sanity/Contentful pattern, the most broadly useful affordance the help revealed) needs an optional
  author-language `description` per field on the adapter's frontmatter field contract, rendered by the Details
  slide-over and wired to `aria-describedby`. Today the hints are hardcoded in the mockups, so a real custom
  adapter renders fields with no hint. Candidate: add `description` to the field definition; the Details panel
  renders it as the field hint with a programmatic association.
- **developer/editor** (advisory validation and cross-branch address collision, MEDIUM-HIGH): the warnings an
  author can publish past (no social image; "another post already uses this address") need a per-field advisory
  channel distinct from the hard commit gates, and the address warning implies a slug-uniqueness check across
  `main` and every open `cairn/*` branch (the media usage index already unions across branches; reuse that
  shape). The underlying behavior, a later post silently shadowing an earlier one at the same URL, is a
  last-write-wins gap the copy papers over. Candidate: an editor-side advisory-validation surface, a
  cross-branch address check, and an explicit collision-resolution decision rather than silent last-write-wins.
- **editor/developer** (no configured support-contact, MEDIUM): every self-serve path ends at "Email your
  site admin," but no admin/owner contact is a configured field, so the hand-off is a button to a blank
  mailto. Candidate: an optional `supportContact` in the site config; render the hand-off only when set, and
  otherwise show self-serve copy, never a dead button.
- **developer/editor** (point-of-typing coach seam, HIGH): cairn's signature differentiator, teaching markdown
  where you type it, needs a CodeMirror seam that detects a first-formatting attempt per editor, renders a
  pinned widget at the caret line, persists a fire-once "seen" flag, gives an Escape and next-keystroke dismiss
  contract, and announces once through a debounced polite live region (the `MediaPicker`/settle-cue discipline).
  None exists, so the coach would either nag on every `##` or clobber the live region on every keystroke.
  Candidate: a writing-coach decoration-and-status seam in `MarkdownEditor`, modeled on the `MediaInsertPopover`
  at-caret focus precedent.
- **developer** (route-keyed help-content registry, MEDIUM): the on-this-screen context-following help degrades
  to a static list without a concept/route-keyed content index. One help manifest keyed by concept/route would
  also let the library, the slide-over, and the woven atoms render from a single source, which neutralizes the
  three-surface drift risk the IA critic flagged. Candidate: a small help-content registry keyed by
  concept/route.
- **editor/developer** (no standing Help home or labeled utility slot, MEDIUM-HIGH): the admin shell has no
  first-class, config-aware Help destination and no labeled utility region, so each mockup improvised one (a
  floating launcher, a sidebar entry, or nothing, the last leaving help behind an unlabeled glyph). Candidate: a
  first-class config-aware Help nav home, plus a documented disclosure-button-for-a-slide-over recipe in the
  design system (promote the launcher's `aria-haspopup` plus `aria-expanded` pattern).
- **developer** (design-system gaps the pass revealed, MEDIUM): the right slide-over region has no
  single-occupancy rule, so Help and the Details panel both claim `top:64px; right:0` with nothing saying
  opening one closes the other; there is no getting-started/progress recipe, so each mockup reinvented one; the
  empty-state recipe has no starter-content slot; and no stated rule distinguishes a non-modal help region from
  a modal dialog, which is why one mockup mislabeled non-modal panels as `role="dialog"`. Candidate: add a
  right-region single-occupancy rule, a progress/checklist recipe (built from the segmented check-and-tint and
  positive-ink tokens), an empty-state starter slot, and the rule that a help or reference panel is a non-modal
  `role="region"` with no scrim while only a destructive or commit surface is a modal `<dialog>`.
- **editor** (date-vs-publish ambiguity, LOW-MEDIUM): the date field reads as if it might schedule publishing,
  so the field hint has to pre-empt the fear ("it does not publish on its own"), and the need for that
  reassurance is a clarity signal. Candidate: a product look at the date field's label and affordance so the
  copy crutch is not load-bearing.

### Editor-help foundation Pass 1 (2026-06-23)

Pass 1 of the foundation plan closed four of the design-pass items above. The frontmatter
field-description channel landed (`FieldBase.description`, rendered by the Details panel and wired to
`aria-describedby`); the `supportContact` adapter field landed (carried through `composeRuntime`, the
hand-off rendering only when set); the date-versus-publish ambiguity got a built-in, overridable
publish-clarity default on the date field; and the design-system gaps closed as the `### Help surfaces`
recipes (the single right-slide-over slot, the disclosure-button ARIA contract, the progress checklist,
the starter-content slot, and the non-modal-region-versus-modal-dialog rule). One new friction
surfaced:

- **developer** (the internal design docs have no blocking voice gate, LOW): the Pass 1 plan named `npm
  run check:prose` the voice gate for the new `admin-design-system.md` recipes, but
  `scripts/check-admin-prose.mjs` extracts copy only from `src/lib/components/*.svelte`, so it never
  reads the internal docs. A design-doc edit clears it trivially; the doc's voice rides on the advisory
  Vale Google package through the on-save hook, with no blocking floor. Candidate: state plainly that
  the internal design docs are Vale-advisory only, or extend a prose gate over `docs/internal/` if a
  blocking floor is wanted.

### Editor-help Pass 2: the Help home (2026-06-23)

Pass 2 built the Help home (the `/admin/help` screen, the shared markdown reference, the derived
getting-started progress, and the pinned nav home). Two frictions surfaced, both developer-facing.

- **developer** (the admin prose gate had a silent coverage hole, MEDIUM, the sharp half now FIXED):
  `scripts/check-admin-prose.mjs` reported `clean (31 components scanned)` while extracting **zero**
  strings from `HelpHome.svelte`, the pass centerpiece. Two causes. First, a strip-order bug: the
  extractor stripped `<style>...</style>` before comments, so the `@component` doc comment's literal
  `<style>` mention anchored the non-greedy block strip and swallowed the whole markup body. Fixed this
  pass by stripping comments first (blast radius was one component; only HelpHome's doc comment names
  the tag). Second, a structural hole that remains: the gate strips `<script>` blocks and reads only
  `*.svelte`, so copy held in script-level data arrays (HelpHome's `steps` titles and descriptions) and
  in `.ts` data modules (`markdown-reference.ts`, `editor-shortcuts.ts`) is never scanned. The
  `prose-voice-reviewer` agent caught two real tells in that unscanned step copy this pass, which the
  mechanical gate could not have. Candidate: extend the extractor to scan string literals in
  `<script>`/`.ts` copy modules, and fold a `prose-voice-reviewer` pass into the pass-end gate whenever
  a pass adds substantial admin UI copy.
- **developer** (`supportContact` is a bare string, so the help cannot personalize the hand-off, LOW):
  the adapter's `supportContact` is one freeform string (an email, a URL, or a note). The design mockup
  personalized the hand-off with a name plus an address, so it could greet the author by the site
  owner's name and offer a named email button. With only a string the Get-help card cannot name anyone,
  so it falls back to a generic support button and a generic line about whoever set up the site.
  Candidate: a richer shape, a name plus a contact, if a personalized hand-off is worth the schema;
  weigh it against the one-string simplicity that needs none.

## Resolved by editor-help Pass 3 (advisory validation, 0.62.1)

- **developer/editor** (advisory validation and cross-branch address collision, MEDIUM-HIGH) RESOLVED:
  the editor now carries an internal advisory channel (`AdvisoryNotice`, one render region) and its
  first notice, the cross-branch address collision. The check builds an address index across `main`
  and every open `cairn/*` branch (the `buildAddressIndex` builder mirrors the media usage index), runs
  at edit-load, and re-checks at publish, emitting `publish.address_collision`. It is warn-and-allow:
  the notice makes the last-write-wins outcome visible instead of silent, rather than gating Publish.
  The needs-alt notice folded into the same channel. Deferred from the resolution: a general per-field
  advisory adapter seam (a public contract for adapter-declared validators), and live client-side
  recomputation as the author retypes the slug.

- **developer** (edit-load cross-branch fan-out on every editor open, MEDIUM-HIGH) RESOLVED by the
  address-check scope pass (0.62.2): the address advisory's cross-branch fan-out at edit-load, which the
  Pass 3 cloudflare review rated MEDIUM-HIGH for the hot path, is gone. Edit-load now builds the address
  index from the main arm only (`mainAddressIndex`, synchronous, zero extra GitHub reads), so it catches
  the published-collision case for free from the manifest it already holds. The full cross-branch
  re-check stays at publish and still emits `publish.address_collision`. The deferred branch-only case
  (a collision against an entry that exists only on a sibling edit branch) surfaces at publish rather
  than edit-load, by design.

## Scaffolder design pass: engine, DX, and docs findings (2026-06-24)

The `create-cairn-site` design brainstorm and its four-lens adversarial review
(`docs/superpowers/specs/2026-06-24-cairn-scaffolder-design.md`) surfaced these for later passes. The
scaffolder fixes several by construction in its own template; the entries below are the ones that stand
alone as engine or docs work. This is the first installment, per the standing decision that building the
scaffolder audits the engine, the DX, and the docs outline; the build itself (Parts A, B, C) will add
more.

Engine and DX:

- **developer** (the `AuthEnv` import-subpath trap): `app.d.ts` must import `AuthEnv` from `/sveltekit`,
  not the root, and `skipLibCheck` hides a mistyped binding as a silent error type, the gap two site
  retrofits hit. Candidate: re-export `AuthEnv` from the root, or ship a typed platform-env helper.
- **developer** (`csrf.checkOrigin: false` deprecation noise): kit 2.61 deprecates `checkOrigin` for
  `trustedOrigins`, prints a warning on every build, yet `false` is still required and `trustedOrigins`
  cannot replace it. Track kit#15992; until then the deploy guide should name the warning as expected.
- **developer** (`resolveMedia` plumbed by hand three times): the same `publicMediaResolver` is threaded
  into the adapter `render` default, `createPublicRoutes`, and the `/media` route. A
  `runtime.publicMediaResolver` ergonomic would subsume the three wire-points.
- **developer** (the `media.json = {}` build footgun): a fresh media site crashes the build when
  `src/content/.cairn/media.json` is absent, because the adapter imports it directly. The scaffolder
  seeds it, but the engine could degrade a missing media manifest to empty instead of crashing.
- **developer** (the showcase models a loose `app.d.ts`): it types `App.Platform.env` as
  `Record<string, unknown>`, so the example never models the real `AuthEnv` production type. Folding the
  showcase into the deployable template (the scaffolder's Part B) fixes this; noted so it is not lost.

Docs and the developer-docs outline (candidates for the docs rewrite,
`docs/superpowers/specs/2026-06-23-docs-rewrite-content-outline.md`):

- **developer** (orphaned guide): `docs/guides/rotate-the-github-app-key.md` exists but is not linked from
  `guides/README.md`. Link it or fold it into the GitHub-App guide.
- **developer** (no quickstart distinct from the tutorial): the only on-ramp is the full ten-milestone
  tutorial; the rewrite's Overview and a 60-second README quickstart have no current counterpart. The
  scaffolder makes this acute, since the quickstart becomes "run `create-cairn-site`."
- **developer** (no positioning page): there is no "is cairn right for you?" fit-and-comparison doc.
- **developer/operator** (thin operability docs): no symptom-to-event-to-fix troubleshooting lookup, and
  `read-cairn-logs.md` is a stub rather than a day-two "operate and diagnose a live site" guide.
- **developer** (the tutorial rots and buries its hardest step): it pins `@0.26.0` against a 0.62.x
  engine, and the dangerous Milestone-8 dev-backend step sits two-thirds in. Parts A and B dissolve that
  step (the dev backend becomes a package, the showcase becomes the template), so the tutorial earns a
  re-reproduction and a reorder.
- **developer** (no "after scaffolding" content): once `create-cairn-site` lands, the tutorial and README
  need a "what you got and what to change" orientation that nothing anticipates today.
- **maintainer** (gate coverage holes): `check:reference` checks coverage, not signature currency (audit
  that `check:reference:signatures` closes it); the admin-prose gate skips `.ts` data modules and
  script-level arrays; `docs/internal` has no blocking voice gate.
- **developer** (URL identity has no single home): the dated-slug, `datePrefix`, and YAML url-policy split
  cannot be explained without pointing at three places. A consolidating helper and a consolidated
  explanation are the strongest candidates.
- **developer** (the root over-export vs the engine/site line): the root subpath over-exports against the
  clean engine/site boundary the architecture draws, and reference pages document the same symbols in two
  homes. The scaffolder's template-contract work touches this.
