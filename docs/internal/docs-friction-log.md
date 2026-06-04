# Docs friction log

Writing a doc is also a design review. This file collects the design friction that documenting
cairn surfaces, so a rough edge becomes a tracked candidate for work instead of a lost
observation. Triage feeds `ROADMAP.md` and the backlog. A finding here does not block the doc
that found it.

Record each finding with its perspective, the doc that surfaced it, and a short note. The
perspective is `developer` (the integrator building and deploying a site) or `editor` (the
non-technical author working in `/admin`).

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
