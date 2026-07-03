# Docs friction log

Writing a doc is also a design review. This file collects the design friction that documenting and
building cairn surfaces, so a rough edge becomes a tracked candidate for work instead of a lost
observation. Triage feeds `ROADMAP.md` and `docs/STATUS.md`; this repo keeps no separate backlog file.
A finding here does not block the doc that found it.

Record each finding with its perspective and a short note. The perspective is `developer` (the
integrator building and deploying a site), `editor` (the non-technical author working in `/admin`),
`maintainer`, or `operator`.

This log holds only live findings, the tombstones below, and the Plan 1 additions. Resolved findings
are pruned here once shipped; their detail lives in the per-plan post-mortems and `docs/STATUS.md`, the
homes for shipped history. The append-only prose that accumulated through 2026-06-26 was pruned on
2026-06-28 (extensibility Plan 1); git history holds the full record.

## Tombstones (decided, do not resurface)

- **Point-of-typing writing coach.** KILLED 2026-06-26. The help-shell adversarial review discarded it
  as the Clippy pattern. Do not re-propose a per-keystroke formatting coach.
- **`runtime.publicMediaResolver`.** DROPPED 2026-06-24. An adversarial review, verified first-hand,
  found it inverts the prerender/Worker boundary and that the "three wire-points" was a miscount of two,
  both prerender-side and already sharing one `cairn.config` export. The real wart (silently broken
  public images) is fixed instead by the `media.resolver_absent` warn event at `createPublicRoutes`
  construction. Do not re-propose the runtime member.

## Open findings

### Engine and DX

- **developer** (security policy): `SECURITY.md` describes the public-state vulnerability channel, but
  GitHub private vulnerability reporting cannot be enabled while the repo is private (the API returns
  404). Enable it when the repo goes public, or add an interim email fallback if the project takes
  outside reports before then.
- **developer** (URL identity has no single home): one URL is assembled from the frontmatter date, the
  per-concept `datePrefix`, and the YAML url policy the catch-all `byPermalink` route reads. The
  explanation page (`docs/explanation/content-model.md`) documents it, but the concept still cannot be
  stated without pointing at three places, which is a complexity signal. Candidate: a consolidating
  helper so a reader and a developer have one home for slug shaping.
- **developer** (`supportContact` is a bare string): the adapter's `supportContact` is one freeform
  string, so the in-admin help hand-off cannot greet the author by the owner's name or offer a named
  button. Candidate: a richer shape (a name plus a contact), weighed against the one-string simplicity
  that needs no schema. LOW.
- **editor** (the suggestion popover shows a literal backtick): the popover's message line renders
  `Diagnostic.message` as `textContent`, so a message like `` `teh` may be misspelled. `` shows the
  backticks verbatim instead of styling the flagged word. The built-in `@codemirror/lint` tooltip this
  popover replaced had the same behavior, so it is not a regression, but it is a rough edge worth
  closing. Candidate: parse the backtick-quoted span in `spellcheck.ts`'s message string into a
  `<code>` or emphasis span; this belongs to the message string, not the generic popover renderer that
  serves both diagnostic kinds, so it was left out of this pass's scope. LOW. The a11y hardening pass's
  1.4.13 audit (Task 6) re-checked the popover end to end and confirmed this is still the only rough edge
  in its message rendering; still open, still LOW.
- **editor** (the Library upload capture card says "Insert image"): the direct-upload flow reuses
  `MediaCaptureCard` verbatim, and its submit button is labeled "Insert image", the wording the editor
  insert popover needs. In the Library upload dialog there is no post to insert into: the author is
  adding the image to the library. The shared label reads slightly off in the new host. Candidate: let
  `MediaCaptureCard` take an optional submit-label prop (default "Insert image", the Library passes
  "Add to library"), or confirm the shared wording is acceptable. LOW.
- **editor** (the diagnostics-summary announcer has no visual counterpart): the debounced live region
  ("2 spelling suggestions, 1 style issue") speaks the count to a screen reader, but a sighted mouse user
  has no on-screen equivalent, such as a small badge, and must still scan the page for underlines. Left
  out of the a11y hardening pass because it is a new UI surface, not a gap in the existing one. Candidate
  for a future pass if editors ask for one. LOW.

### Gates and test infrastructure

- **maintainer** (`check:dev-package` is owed): `check:comments`, `check:reference`, and
  `check:reference:signatures` scope to `src/lib`, so the `@glw907/cairn-cms-dev` package's TSDoc,
  exports, and types pass through ungated. `scaffold.yml` type-checks the shipped dev source against a
  packed tarball, which catches some drift, but a dedicated `tsc --noEmit` plus the comment lint over
  `packages/**` is owed before the scaffolder pass publishes the package.
- **developer** (the admin-prose gate has a coverage hole): `scripts/check-admin-prose.mjs` reads only
  `*.svelte` markup and strips `<script>` blocks, so copy held in script-level data arrays and in `.ts`
  copy modules (`markdown-reference.ts`, `editor-shortcuts.ts`) is never scanned. Candidate: extend the
  extractor to scan string literals in `<script>`/`.ts` copy modules, and fold a `prose-voice-reviewer`
  pass into the pass-end gate whenever a pass adds substantial admin UI copy.
- **developer** (`docs/internal` has no blocking voice gate): the internal design docs ride only the
  advisory Vale Google package through the on-save hook, with no blocking floor. Candidate: state plainly
  that the internal docs are Vale-advisory only, or extend a prose gate over `docs/internal/` if a
  blocking floor is wanted. LOW.
- **maintainer** (a worktree's `dist/` goes stale after the first package): a feature worktree runs
  `npm run package` once at setup to get `dist/`, but every later source edit leaves that `dist/` stale.
  The showcase consumes the library through `file:../..` (its `dist/`), so an e2e or consumer-build run
  against the stale `dist/` silently proves OLD code until you re-package. This pass had to re-`npm run
  package` before the showcase e2e so it saw the new upload UI. The `cairn-worktree-needs-dist-build`
  memory notes the build-once need; the goes-stale-after-edits half is the sharper trap. Candidate: a
  `pretest:e2e` (or a `package` step folded into the showcase e2e command) that repackages `dist/` so a
  consumer run can never read a stale build. LOW.
- **developer** (the `delivery-*` cold-import spawn tests flake under full-suite load): the tests that
  spawn a fresh Node process to prove a `/delivery/data` import does not pull `@sveltejs/kit` or Svelte
  into the graph (`delivery-data-dist-spawn.test.ts`) can time out when the full suite runs them under
  concurrent IO load; they pass in isolation. WATCH: if the flake recurs at a release gate, raise the
  spawn timeout or serialize the cold-import specs into their own non-concurrent project.

### Operability and live smoke

- **developer** (no documented media live-smoke recipe): `admin-smoke-test.md` covers minting a session
  but not the media-action transport (the orphan scan, purge, and bulk delete are form actions needing
  the CSRF double-submit, a multipart body, and devalue-encoded `ActionResult` decoding). Candidate: a
  media-smoke appendix with the curl recipe for scan/purge/bulk-delete on throwaway assets. MEDIUM.
- **developer** (`wrangler --json` prepends a non-JSON notice): `wrangler ... --json` writes a
  "Cloudflare agent skills are available" line to stdout ahead of the JSON, which breaks any
  `JSON.parse` of the piped output. Any cutover or doctor tooling consuming wrangler `--json` needs a
  slice-from-`[` guard, or wrangler should send the notice to stderr. MEDIUM.
- **operator** (R2 delete propagation lag): after a purge, the Worker's own orphan scan (an R2 `list`)
  reflects the deletion immediately, but `wrangler r2 object get` by exact key can still return the byte
  for a short window. Verify a purge via the orphan scan, not a direct `wrangler r2 object get`. Worth a
  one-line caveat in the media-smoke recipe above.

### External watch

- **developer** (`csrf.checkOrigin: false` deprecation, kit#15992): kit deprecates `checkOrigin` for
  `trustedOrigins` and prints a build warning, yet `false` is still required and `trustedOrigins` cannot
  replace it. Tracked by the scheduled kit#15992 watch (see the login-CSRF initiative memory); the deploy
  guide names the warning as expected until the removal lands.

### Scaffolder-deferred

The `create-cairn-site` scaffolder initiative owns these; each is re-verified at its plan time.

- **editor/developer** (starter/seed content): the strongest empty-state activator is an editable,
  labeled starter post, but the engine has no mechanism to commit labeled starter `.md` entries on a
  fresh site or distinguish them from authored content. Candidate: the scaffolder seeds
  concept-differentiated starters (a Post and a Page), and the empty-state recipe gains a starter slot.
- **developer** (project-setup emission and the robots collision): a fresh site needs `@types/node`
  declared, the skeleton's default `static/robots.txt` removed (it silently collides with the engine's
  robots route), and the `prerender.handleHttpError: 'warn'` policy for the uncrawled feed and robots
  routes. Part B (the showcase as the deployable template) fixes most of this by construction; confirm
  the remainder and have the engine detect and warn on the robots collision.
- **developer** (docs on-ramp gaps the scaffolder makes acute): a quickstart distinct from the full
  tutorial, a positioning ("is cairn right for you?") page, a day-two operability and troubleshooting
  guide, and an "after scaffolding: what you got and what to change" orientation. Candidates for the docs
  rewrite that lands with the scaffolder.

### From extensibility Plan 1 (2026-06-28)

- **developer** (a worktree showcase e2e tests the wrong engine without a fresh install): in a feature
  worktree, `examples/showcase/node_modules` symlinks to the main checkout, so the showcase resolves
  `@glw907/cairn-cms` and `@glw907/cairn-cms-dev` to MAIN, not the worktree. A showcase e2e in a worktree
  silently builds against main's engine until a from-scratch `npm install` in the worktree showcase
  repoints both `file:` deps to the worktree. Candidate: document the worktree e2e setup (or a helper
  script) so a future worktree pass running the showcase e2e does not prove the wrong engine.
- **developer** (a process-global dev double breaks a fixed-seed e2e under retries): the Plan 1
  custom-screen e2e wrote to the fake `APP_DB`, which is process-global, and CI runs `retries: 2`, so a
  fixed seed name accumulated duplicate rows across retries and a strict-count assertion failed. The fix
  was a unique per-run row name with a row-scoped delete. Lesson for any e2e writing to a process-global
  dev double: assert on unique per-run data, not a fixed seed.
- **developer** (reference prose drift not covered by a gate): `sveltekit.md` and `admin-routes.md` still
  describe a `mintToken` dep on `createCairnAdmin`/`createContentRoutes` that `CairnAdminDeps` no longer
  carries (the dev backend rides `event.locals.backend`). No doc gate covers this prose. Candidate: a
  reference-prose cleanup pass; the signature gates only check declared types, not surrounding prose.
- **developer** (`LayoutData` is dead public surface) — RESOLVED in extensibility Plan 2 (`0.77.0`):
  `LayoutData` was removed from `/sveltekit`, its declaration, re-export, and reference row deleted and the
  surviving comparative prose reworded, with a `Consumers must` line and a regenerated `check:surface`
  snapshot recording the drop. The new `check:surface` gate now catches a dead or drifted public type at
  build time, so this class of friction surfaces loud rather than lingering as documented-but-unused surface.

### From the surface-pruning pass (2026-07-01)

- **developer** (a `SiteConfigError` surfaces as a bare 500 on the save paths): `settingsSave` and
  `vocabularySave` call `parseSiteConfig` unguarded, so a malformed or misplaced site-config key at
  save time propagates as an uncaught throw and SvelteKit's generic 500, while the loads catch and
  log. Pre-existing (the auth review traced it; no reflection risk, production hides the message).
  Candidate: catch and `fail(400)` with the actionable boundary message the parser now writes.
- **developer** (the dev sibling package breaks silently on a public reshape): the Task 6 deps
  regroup broke `packages/cairn-cms-dev/src/fake-anthropic.ts` (typed against the retired
  `ContentRoutesDeps['anthropic']`) and no root gate failed; the miss surfaced only in a manual
  showcase `svelte-check` two tasks later. The already-logged owed `check:dev-package` gate now has
  its concrete incident; wiring the showcase check (or a dev-package `tsc`) into the root gate would
  have caught it in-task.
- **developer** (the site-config allowlist rejects editor-tooling keys by design): the new
  unknown-key error means a YAML-LSP `$schema:` key would fail the parse. Conscious strictness, per
  the loud-boundary posture; add the key to `KNOWN_TOP_LEVEL_KEYS` only when a real tool wants it.
- **developer** (`AdminData` satellite types are inconsistently barrel-exported):
  `VocabularyLoadData` and `SettingsData` are facade-returned members like `ListData`/`EditData` but
  are not exported from `/sveltekit` (the tier sweep's reverse check caught a stale doc row for the
  former). Additive fix if a consumer ever needs to name them; decide then, not now.

## 2026-07-03 — editor vocabulary: "Slug" label vs the docs' "address" (editor perspective)

Writing the editor guide's create-entry section forced a vocabulary fork: the docs say
"address" (the editor-friendly word for a URL), but the create dialog labels the field
"Slug", a developer term no non-technical writer knows. The guide papers over it with a
parenthetical. The friendlier fix is in the product: label the field "Address" (or "Web
address") in the create dialog and the details panel, matching the docs vocabulary.

## 2026-07-03 — no visible open-issues count (editor perspective)

The diagnostics system announces a running issue count to screen-reader users but shows
sighted editors nothing beyond the underlines; the guide originally claimed a visible count
because one plausibly should exist. A small count near the word count in the editor footer
would give sighted editors the same pre-publish sweep signal. Candidate for a future
editor-experience pass.
