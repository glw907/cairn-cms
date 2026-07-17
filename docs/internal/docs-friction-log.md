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

- **developer** (`navLayout`'s screen ids catch a typo only at server start, not in the editor):
  `EngineScreenId` widens to `(string & {})` so a dynamic concept id stays assignable, which means
  a misspelled built-in screen (`{ screen: 'setings' }`) shows no red squiggle; it surfaces only
  when the runtime composes and `validateNavLayout` throws. This is the same tradeoff
  `AdminNavIcon`'s bundled allowlist avoids by staying a closed literal union, so the asymmetry is
  worth naming even though a wider net (a template-literal union of the site's own known concept
  ids, resolved from the adapter's `content` block) would need type-level access to the adapter
  this module doesn't have today. LOW: the construction throw is loud and names the bad value, so
  the miss costs a `npm run dev` restart, not a silent wrong render.
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
- **editor** (the Library upload capture card says "Insert image"): the direct-upload flow reuses
  `MediaCaptureCard` verbatim, and its submit button is labeled "Insert image", the wording the editor
  insert popover needs. In the Library upload dialog there is no post to insert into: the author is
  adding the image to the library. The shared label reads slightly off in the new host. Candidate: let
  `MediaCaptureCard` take an optional submit-label prop (default "Insert image", the Library passes
  "Add to library"), or confirm the shared wording is acceptable. LOW.
- **editor** (the diagnostics-summary announcer has no visual counterpart): the debounced live region
  ("2 spelling suggestions, 1 style issue") speaks the count to a screen reader, but a sighted mouse user
  has no on-screen equivalent, such as a small badge near the word count in the editor footer, and must
  still scan the page for underlines. Left out of the a11y hardening pass because it is a new UI surface,
  not a gap in the existing one. Resurfaced 2026-07-03 while writing the editor guide, whose draft had
  claimed a visible count that does not exist; now queued in the pre-beta engine pass plan. LOW.

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
- **developer** (docs on-ramp gap: no "after scaffolding" orientation): an "after scaffolding: what you got
  and what to change" orientation page is still open, gated on the scaffolder landing so it can describe
  real generated output rather than a hypothetical one. The rest of this finding is resolved: the docs IA
  ruling deliberately keeps no separate quickstart pre-scaffolder, and the positioning page and the
  day-two operability guide shipped as `why-cairn.md` and `troubleshooting.md` in the docs rewrite.

### From extensibility Plan 1 (2026-06-28)

- **developer** (a worktree showcase e2e tests the wrong engine without a fresh install): in a feature
  worktree, `examples/showcase/node_modules` symlinks to the main checkout, so the showcase resolves
  `@glw907/cairn-cms` and `@glw907/cairn-cms-dev` to MAIN, not the worktree. A showcase e2e in a worktree
  silently builds against main's engine until a from-scratch `npm install` in the worktree showcase
  repoints both `file:` deps to the worktree. Candidate: document the worktree e2e setup (or a helper
  script) so a future worktree pass running the showcase e2e does not prove the wrong engine.

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

## 2026-07-03 — conflict recovery is a manual copy-reload-reapply (editor perspective)

The editor guide's recovery section had to teach: copy your whole draft somewhere safe,
reload to get your colleague's version, re-apply your changes by hand. The refusal itself is
right (never merge by guesswork), but the editor's own text could be preserved for them --
shown side by side, or held in a recoverable buffer -- instead of asking a non-technical
writer to improvise a backup. A docs section this procedural is a UX gap wearing a hat.

## 2026-07-03 — no rich-text paste conversion (editor perspective)

The guide instructs "re-mark any emphasis or headings with the toolbar after a large paste"
because pasting from Word or Google Docs drops all formatting. For a writer-first tool whose
audience lives in those apps, HTML-to-markdown paste conversion (headings, emphasis, lists,
links surviving the paste) is a real editor-experience item. The image-paste path already
shows the pattern: intercept, convert, offer.

## 2026-07-03 — showcase omits csrf checkOrigin while the deploy guide instructs it (developer)

The claims gate caught examples/showcase/svelte.config.js missing the `csrf: { checkOrigin:
false }` the deploy guide teaches (cairn owns CSRF; the kit check must yield). Align the
showcase with its own guide.

## 2026-07-03 — sidebar says "Media", everything else says "the Library" (editor)

The admin nav labels the screen "Media" (CairnAdminShell.svelte:82) while the docs vocabulary
and the initiative memory call it the Library. One word, two names; rename the nav item or
settle the vocabulary.

## 2026-07-13 — a required checkbox-group multiselect has no honest client-side signal (editor)

The required-attribute pass fixed the textarea, date, and open-multiselect arms, but the CLOSED
multiselect (the checkbox group) stayed server-side only, deliberately: native `required` on a
set of same-named checkboxes means "check every box," not "check at least one," so the attribute
would lie. The validator enforces at-least-one; matching that client-side needs a small
setCustomValidity wiring on the group. An editor who misses a required tag set still learns it
only from the save bounce.

## 2026-07-13 — required image/reference fields are invisible to constraint validation (editor)

The image and reference arms submit through hidden inputs, which the browser's constraint API
ignores regardless of `required`. A required hero image or author reference therefore never
trips the capture-phase invalid handler that opens the Details panel; the failure surfaces only
server-side. Wiring true required-visibility needs new props threaded into
MediaHeroField/ReferenceField (an aria-invalid + focus-target pattern, not a native attribute).

## 2026-07-14 — e2e specs assume the seed post sits on the admin list's first page (developer)

The media-insert and media-slice e2e specs opened the seed post by clicking its list link on
`/admin/posts`, but the list paginates at ten rows newest-first, and sibling entries created by
earlier specs in the run pushed the June seed to page two, so the click timed out (green on the
0.84.3 window, red on the next merge as the entry count crossed ten). Fixed both by navigating to
the edit URL directly. golden-path.spec.ts keeps four convenience seed-clicks that pass only
because it runs earlier with fewer entries; they share the latent fragility and should convert to
direct navigation the next time that file is touched (its first test legitimately exercises the
list-click path and stays a click). Deeper signal: the e2e suite's cross-spec entry accumulation
against a paginated list is an ordering coupling; a per-spec content reset (or a seed post dated
in the future so it stays on page one) would remove the whole class.
