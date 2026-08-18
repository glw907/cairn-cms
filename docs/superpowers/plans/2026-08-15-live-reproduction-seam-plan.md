# Live-Reproduction Seam Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (dispatch `cairn-implementer` per Pass 1 task in the cairn-cms worktree and
> `site-implementer` per Pass 2 task in cairn-pub; the conductor reviews each diff and
> verifies the full gate between dispatches). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the live-reproduction seam end to end: the engine's reproductions module
(manifest, stories, fixtures, poses, markers, injectability fixes, gates) and cairn-pub's
delivery half (fence plugins, `/repro` routes, fixture-asset route, `DocsRepro`, styleguide
section, probe), so the editors rewrite can author `repro` fences against real, posed
reproductions.

**Architecture:** Two passes with a hard boundary, split here rather than at execution
(the deliverable counts already justify it). Pass 1 lands `@glw907/cairn-cms/reproductions`
in the engine and merges to `main` at its close. Pass 2 consumes it in cairn-pub through a
packed tarball (`npm pack` + `file:` pin) on the `pass-d-docs-tracks` branch. No shipped
docs page gains a `repro` fence in this plan; fences are proven through test fixtures and
the styleguide, and the editors rewrite authors the real ones later.

**Tech Stack:** Svelte 5 + svelte-package (engine), SvelteKit 2 prerendering (cairn-pub),
remark/rehype plugins on the engine's `createRenderer` seams, vitest (the engine's `unit`,
`unit-dist-spawn`, and browser `component` projects), `playwright` for the recorded probe.

**Spec:** cairn-pub `docs/superpowers/specs/2026-08-15-live-reproduction-seam-design.md`
(branch `pass-d-docs-tracks`; as amended 2026-08-15 after the plan review). The spec is the
contract; where a task summary and the spec disagree, the spec wins and the disagreement is
raised, not resolved silently.

## Human moments

- **Before Pass 1 can start:** the `docs-diagram-pages` branch must merge, and its merge
  gate ends in Geoff's before/after read on the two marquee diagrams (the cairn-pub theme
  session's merge-gate list in cairn-cms `docs/STATUS.md`). The Pass 1 conductor raises
  this as a scheduling request at session start if the merge has not happened; it is an
  attended moment, not a mechanical gate.
- Nothing else in this plan needs Geoff, paid resources, or an attended run.

## Global Constraints

- **Precondition.** Pass 1 starts from cairn-cms `main` AFTER `docs-diagram-pages` has
  merged (it carries `scripts/checks/check-visuals.mjs`, which Task A7 grows). If it has
  not merged, stop and raise it per Human moments; do not fork the gate.
- **Worktrees and executors.** Pass 1 runs in a fresh cairn-cms worktree off `main`
  (`superpowers:using-git-worktrees`). Pass 2 runs in `~/Projects/cairn-pub` on
  `pass-d-docs-tracks`; before the first Pass 2 dispatch, run the one-executor check
  (`pgrep -f cairn-pub`, warm `git status`).
- **Scope fence.** No `repro` fence is added to any file under `docs/` in either repo. The
  inventory's 25 stories and the spec's fence schema are the whole surface; no extra
  stories, no extra fence keys. The editors rewrite is OUT. The capture pass is OUT.
- **The story arithmetic.** A4 registers 2, A5a 8, A5b 4, A6a 7, A6b 4: total 25, the
  number the manifest test and `check:visuals` both bind.
- **TDD.** Every code task writes its failing test first and proves it red before
  implementing. New gates are additionally proven red once against a deliberate violation.
- **Test projects (engine).** Component-mounting tests live in `src/tests/component/`
  (the browser project: `svelte()` plugin, chromium, the `$app/*` aliases and `_setup.ts`
  the `EditPage` family needs). Node-safe specs live in `src/tests/unit/`. Built-dist
  probes follow the `unit-dist-spawn` project pattern (`packaging-boundary.test.ts` is the
  prior art). Filing a mount test under `unit` is a defect: that project is
  `environment: 'node'` with no Svelte transform, and TDD's "expected red" would mask the
  misfile.
- **Engine gate (Pass 1 tasks).** Per task: `npm run check` 0/0, `npm test` exit 0,
  `npm run check:surface`, `npm run check:visuals`, `npm run check:vale`,
  `npm run check:comments`, and for tasks touching docs or the export map,
  `npm run check:package`, `npm run check:docs`, `npm run check:reference`,
  `npm run check:reference:signatures`, `npm run check:arm-indexes`. Task A9 additionally
  runs the full `test.yml` gate list once before the merge.
- **cairn-pub gate (Pass 2 tasks).** `npm run check` 0/0, `npm test` exit 0, `npm run
  build` clean, `npm run check:docs-links` clean, against the Task B1 tarball install.
- **Code-simplifier.** Each pass's close (A9, B5) runs the `code-simplifier` agent over
  the pass's changed code before the closing commit, per the workstation rule.
- **Naming.** The subpaths are `@glw907/cairn-cms/reproductions` (Svelte-importing) and
  `@glw907/cairn-cms/reproductions/manifest` (node-safe). Story ids are exactly the spec
  inventory's 25. The validator is `validateReproFence`. The fixture asset base is the
  manifest's `fixtureMediaBase = '/repro-assets'`. Deviating from a name in an Interfaces
  block is a defect.
- **Docs dimension.** Each pass's close updates `CHANGELOG.md` under `## Unreleased`
  (engine) and the status docs per A9/B5. No version bump, no publish; the registry rides
  release one.

---

## Pass 1: the engine half (cairn-cms)

### Task A1: the per-story audit and the manifest

**Files:**
- Create: `src/lib/reproductions/manifest.ts`
- Create: `src/tests/unit/reproductions-manifest.test.ts`
- Create: `src/tests/unit/reproductions-manifest-dist-spawn.test.ts`
- Modify: `vitest.config.ts` (the dist-spawn spec joins the `unit-dist-spawn` project's
  `include` and the `unit` project's `exclude`, the coordinated pair the existing config
  uses)
- Create: `docs/internal/record/repro-story-audit.md` (fixed path; later tasks cite it)

**Interfaces:**
- Produces: `manifest: ReproManifestEntry[]` where `ReproManifestEntry = { id: string;
  heights: { column?: number; desktop?: number; narrow?: number }; markerKeys: string[];
  pose: boolean; host: 'shell' | 'bare'; ownThemeRoot: boolean }`. `ownThemeRoot` is true
  when the story's mounted component resolves its own theme rather than inheriting
  `[data-repro-root]`: true for `auth/login`, `auth/confirm`, AND every `host: 'shell'`
  entry, because `CairnAdminShell` is itself an own-theme-root component.
- Produces: the audit record at its fixed path, one line per story with evidence
  (file:line of the state that decides host, props-versus-pose, and needed exports or
  fixes). A4 through A6b execute against it.

- [ ] **Step 1:** Audit each of the spec inventory's 25 rows against the actual components
  in `src/lib/components/`: which component mounts, `shell` or `bare` host, whether the
  contracted state is prop-reachable or needs `pose`, which parts are unexported today, and
  which injectability fixes the row needs. The spec's `pose or bare` and `pose` flags are
  hypotheses to confirm or correct, not answers.
- [ ] **Step 2:** Write the failing manifest test: 25 entries, ids exactly the spec
  inventory, every marked story (`editor/entry-screen`, `media/library`, `tags/screen`)
  carries non-empty `markerKeys`, `publish/header-band` carries both `desktop` and
  `narrow` heights, `ownThemeRoot` is true for the two auth stories and every
  `host: 'shell'` entry, and no module in the manifest's static import graph ends in
  `.svelte`. Prove red, implement from the audit, prove green.
- [ ] **Step 3:** The dist-spawn spec: after `npm run package`, spawning plain `node`
  against the `@glw907/cairn-cms/reproductions/manifest` specifier resolves and reports 25
  entries (`skipIf(!built)` per the prior art). Run the engine gate. Commit.

### Task A2: the fixture set

**Files:**
- Create: `src/lib/reproductions/fixtures.ts`
- Create: `src/lib/reproductions/fixtures/` (the fixture media bytes)
- Create: `src/tests/unit/reproductions-fixtures.test.ts`
- Modify: `src/lib/reproductions/manifest.ts` (add `fixtureMediaBase = '/repro-assets'`
  and `fixtureMediaFiles: string[]`, the served filenames, so Pass 2's asset route
  enumerates them without importing Svelte code)

**Interfaces:**
- Consumes: nothing; this is data.
- Produces: `fixtureConcept`, `fixtureEntries`, `fixtureMediaLibrary`, `fixtureEditor`
  (the signed-in identity), `fixtureVocabulary`, `fixtureNavLayout` from `fixtures.ts`;
  `fixtureMediaBase` and `fixtureMediaFiles` from the manifest. Names are frozen here;
  A4 through A6b and B3 consume them.

- [ ] **Step 1:** Decide and write the fixture content: one sample concept, a handful of
  entries, a small media library with real image bytes, a tag vocabulary, the signed-in
  editor's identity, and the `navLayout` the shell stories render. Content choices follow
  the per-page contracts (an entry with history for the History list, an in-use image for
  `media/delete-in-use`). Every `fixtureMediaLibrary` asset's URL composes from
  `fixtureMediaBase`.
- [ ] **Step 2:** Failing test first: fixtures are internally consistent (every entry's
  concept is the fixture concept, the in-use image is referenced by an entry, the roster
  contains `fixtureEditor`, `fixtureMediaFiles` matches the bytes on disk). Red,
  implement, green.
- [ ] **Step 3:** Verify the media bytes survive packaging: `npm pack --dry-run` lists
  them under `dist/reproductions/fixtures/`, and `npm run check:package` stays green.
  Run the engine gate. Commit.

### Task A3: the injectability fixes

**Files:**
- Modify: `src/lib/components/CairnMediaLibrary.svelte`, `MediaPicker.svelte`,
  `MediaHeroField.svelte`, and `src/lib/components/editor-media.ts` (the four `publicPath`
  callers that fall to the hardcoded `/media` default; `editor-media.ts` is the editor
  surface's own path, which `editor/entry-screen` and `media/insert-panel` render through),
  plus any caller the A1 audit added
- Modify: `src/lib/components/CairnAdminShell.svelte` (theme becomes settable as a
  reactive prop override that also skips the cookie and `matchMedia` reads, so a mounting
  context can drive it and Pass 2 can prop-update instead of re-mounting)
- Modify: `docs/internal/record/repro-story-audit.md` (append the "names frozen here"
  table: the exact prop or context names both fixes expose)
- Test: `src/tests/component/` (one mount test per fix)

**Interfaces:**
- Consumes: A1's audit (the confirmed fix list).
- Produces: a documented way for a mounting context to set the media public base (honoring
  the resolution `media/config.js`'s `publicBase` already implies, never a new parallel
  mechanism), and the shell's theme override prop. The exact names land in the audit
  record's frozen-names table; A4, A5a through A6b, and B3 dispatches cite that table by
  path.

- [ ] **Step 1:** Media base: failing component test proving a mounted media component
  renders `img src` under an injected base rather than `/media`. Red, implement, green.
- [ ] **Step 2:** Shell: failing component test proving a shell mounted with the override
  renders the given theme, reacts to a prop change, and does not read `document.cookie` or
  call `matchMedia`. Red, implement, green.
- [ ] **Step 3:** Any additional fix from the A1 audit, same shape. Existing component
  tests stay green untouched (no public behavior change for real admin mounts). Append the
  frozen-names table. Run the engine gate. Commit.

### Task A4: the stories module, context wrapper, and the first two stories

**Files:**
- Create: `src/lib/reproductions/index.ts`
- Create: `src/lib/reproductions/ReproContext.svelte` (imports the admin stylesheet
  unconditionally, so `host: 'bare'` stories render styled wherever they mount)
- Create: `src/lib/reproductions/stories/auth.ts`
- Create: `src/tests/component/reproductions-stories.test.ts`
- Modify: `package.json` (both `exports` entries in the repo's three-key shape:
  `"./reproductions": { types: "./dist/reproductions/index.d.ts", svelte:
  "./dist/reproductions/index.js", default: "./dist/reproductions/index.js" }` and
  `"./reproductions/manifest": { types: "./dist/reproductions/manifest.d.ts", default:
  "./dist/reproductions/manifest.js" }` — `check:surface` selects subpaths by their
  `types` string, so an entry without one silently falls out of the snapshot)
- Modify: `docs/internal/api-surface.md` (the `check:surface` snapshot gains both subpaths)

**Interfaces:**
- Consumes: A1 `manifest`, A2 fixtures, A3's frozen-names table.
- Produces: `ReproStory = { id: string; component: Component; host: 'shell' | 'bare';
  props: Record<string, unknown>; context?: Record<symbol | string, unknown>;
  pose?: (root: HTMLElement) => Promise<void>; markers?: { n: number; anchor: string;
  key: string }[] }`; `stories: ReproStory[]`; `getStory(id: string): ReproStory` (throws
  on unknown id); `ReproContext.svelte` (applies `context`, hosts shell stories, carries
  the stylesheet). The story-mount harness that A5a through A6b extend.

- [ ] **Step 1:** Failing story-mount test: for every manifest entry there is a story with
  the same id, and mounting `auth/login` and `auth/confirm` through `ReproContext` renders
  without error, with `data.theme` respected (these two own their theme root without the
  shell; the shell stories inherit the same obligation through A3's override). Red,
  implement the module, wrapper, and the two auth stories, green.
- [ ] **Step 2:** Extend the test: every story's `markers` keys equal the manifest's
  `markerKeys` and every anchor resolves against the mounted DOM; every `pose` runs
  without throwing. (Vacuously green for stories that lack them so far; the assertions
  bind A5a through A6b.)
- [ ] **Step 3:** `check:surface` snapshot asserts both subpaths appear in
  `docs/internal/api-surface.md`. Run the engine gate. Commit.

### Task A4b: the amendment (added at execution, 2026-08-17)

**Why this task exists.** After A4 landed, an eleven-agent read-only sweep verified the A1 audit's
25 rows against the real components. The audit had settled which component each story mounts and
how to reach its state, correctly, and had never asked whether the render would be wide enough to
show the subject. Three stories failed that question and two engine breakpoints were the reason,
both since verified in the main loop against source. Five further mechanism gaps came out of the
same sweep. Geoff ruled the fix in: `wide` joins the pinned widths (the spec is amended, cairn-pub
`4d9e492`), and the whole set lands here as one amendment task rather than being spread across the
story tasks or deferred to Pass 2. The full ranked findings are the sweep's own record; this task
is the fold.

**Split into two dispatches** (A4b-1 code, A4b-2 fixtures and records) because the deliverable count
crossed four. This is the pass's FIRST task split; a second is the prompt to propose splitting the
pass itself.

**Files:**
- Modify: `src/lib/reproductions/manifest.ts` (`ReproHeights` gains `wide`, four rows re-declare)
- Modify: `src/lib/reproductions/index.ts` (`ReproStory` gains `settle`)
- Modify: `src/lib/components/EditPage.svelte` (fix 3), `src/lib/components/MarkdownEditor.svelte`
  (fix 4)
- Modify: `src/lib/reproductions/fixtures.ts` (the Tidy fixture, the frozen admin pathname)
- Modify: `docs/internal/record/repro-story-audit.md` (the corrections and the two new fixes)
- Test: `src/tests/unit/reproductions-manifest.test.ts`, `src/tests/component/`

**Interfaces:**
- Produces: `ReproHeights` carrying `wide`, so a page may pin 1280 and the schema still refuses a
  width with no declared height. `ReproStory.settle?: (root: HTMLElement) => Promise<void>`, run
  after mount and before `pose`, for the four rows whose contracted surface exists only after
  hydration. Fix 3 and fix 4 join the audit's fix list with the same opt-in-and-absent-by-default
  bar A3 held: no real admin mount changes behavior.

- [ ] **A4b-1 Step 1:** `wide` through the manifest and its test. `editor/sidebar-list` and
  `nav/worked-navlayout` declare `wide` alone; `editor/entry-screen` and `editor/preview-tab`
  declare `desktop` alone. A row declaring only the widths its page may pin is the mechanism that
  refuses to picture a screen at a size that cannot show it.
- [ ] **A4b-1 Step 2:** Fix 3, the `EditPage` spellcheck lever, so a reproduction does not spawn a
  real Worker and fetch a wasm binary and a dictionary per embed. Fix 4, CodeMirror's `isDark`,
  which is read once in `onMount` and baked into three `EditorView.theme` calls, so A3's
  prop-update-rather-than-re-mount promise is unsafe for every editor story until it reconfigures.
- [ ] **A4b-1 Step 3:** `ReproStory.settle`, wired into the story-mount test's universal loop. Plus
  the theme root A4 left to the host: `ReproContext` renders bare stories with no `[data-theme]`
  ancestor of its own, and every admin token is scoped under one, so the eight bare stories that do
  not own their theme root load the stylesheet and take none of it. A4's own contract was that a
  bare story "renders styled wherever they mount", which today holds only inside cairn-pub's
  `[data-repro-root]`. The wrapper renders its own bare `data-theme` element from the same `theme`
  prop, per the admin design system's never-on-a-styled-element rule. Engine gate. Commit.
- [ ] **A4b-2 Step 1:** The Tidy fixture composed so one change lands outside the four objective
  kinds, which is what makes the contracted **Review this** state appear. The fixture admin
  pathname frozen at `/admin/<conceptId>/<id>`, since the shell reads exactly three segments to
  decide desk versus office chrome and a wrong path silently changes the sidebar breakpoint.
- [ ] **A4b-2 Step 2:** The audit corrections: the `editor/figure-dialog` justification names a
  string that component never renders, `editor/toolbar`'s "four groups" is a count the component
  contradicts, `media/insert-panel`'s fix-1 attribution names the wrong module and its prop bag
  wants a Note for A2, and four citations point at `interface Props {` rather than the symbol. The
  export-question section is retitled to what it actually establishes, since the same pass does add
  a prop to a publicly exported component.
- [ ] **A4b-2 Step 3:** Engine gate. Commit.

### Task A5a: the editor stories (8)

**Files:**
- Create: `src/lib/reproductions/stories/editor.ts` (`editor/entry-screen`,
  `editor/toolbar`, `editor/sidebar-list`, `editor/preview-tab`, `editor/details-panel`,
  `editor/figure-dialog`, `editor/tidy-review`, `editor/collapsed-layout-block`)
- Modify: `src/lib/reproductions/index.ts` (register them)
- Modify: `src/lib/components/index.ts` and `package.json` only as the A1 audit's export
  list requires
- Test: extend `src/tests/component/reproductions-stories.test.ts` with bespoke assertions
  where a story's contract names one (the Tidy review shows one change marked
  "Review this")

**Interfaces:**
- Consumes: A4's `ReproStory` shape and harness; A1's per-story mechanism decisions; A3's
  frozen names.
- Produces: the 8 editor stories registered; `editor/entry-screen` carries the marker set
  the manifest froze.

- [ ] **Step 1:** Implement the stories per the A1 audit, one at a time against the
  harness: `EditPage`-family stories with `host: 'shell'` and the full prop bag (`data`,
  `form`, `registry`, `render`, `icons`), poses for the interaction-only states.
- [ ] **Step 2:** Any newly exported part gets its export-map entry (three-key shape),
  `check:surface` snapshot update, and a documented signature in the reference arm (A8's
  page links them).
- [ ] **Step 3:** Run the engine gate. Commit.

### Task A5b: the publish stories (4)

**Files:**
- Create: `src/lib/reproductions/stories/publish.ts` (`publish/header-band`,
  `publish/history-list`, `publish/pending-list`, `publish/refusal-banner`)
- Modify: `src/lib/reproductions/index.ts` (register them)
- Modify: `src/lib/components/index.ts` and `package.json` only as the A1 audit's export
  list requires
- Test: extend the story-mount test (the header band poses the state its page contract
  names; both its manifest heights are exercised)

**Interfaces:**
- Consumes: as A5a.
- Produces: the 4 publish stories registered, `publish/header-band` with `host: 'shell'`
  (the band is an `EditPage` snippet reachable only through the shell, so its narrow
  render includes the shell's narrow chrome, per the spec).

- [ ] **Step 1:** Implement the four stories per the A1 audit, same shape as A5a.
- [ ] **Step 2:** Export obligations as in A5a Step 2, where the audit requires them.
- [ ] **Step 3:** Run the engine gate. Commit.

### Task A6a: the media stories (7)

**Files:**
- Create: `src/lib/reproductions/stories/media.ts` (`media/insert-panel`,
  `media/upload-form`, `media/lead-picture-dialog`, `media/library`, `media/details-panel`,
  `media/bulk-selection`, `media/delete-in-use`)
- Modify: `src/lib/reproductions/index.ts` (register them)
- Modify: `src/lib/components/index.ts` and `package.json` only as the A1 audit's export
  list requires
- Test: extend the story-mount test (`media/delete-in-use` shows the in-use face naming
  the fixture entry; every media story's `img src` values compose from `fixtureMediaBase`)

**Interfaces:**
- Consumes: A3's media base fix with `fixtureMediaBase` as the injected value; A2's
  `fixtureMediaLibrary`.
- Produces: the 7 media stories registered; `media/library` carries the marker set the
  manifest froze.

- [ ] **Step 1:** Implement the seven stories per the A1 audit, poses for the dialog and
  selection states.
- [ ] **Step 2:** Export obligations as in A5a Step 2, where the audit requires them.
- [ ] **Step 3:** Run the engine gate. Commit.

### Task A6b: the tags, roster, nav, and toolkit stories (4)

**Files:**
- Create: `src/lib/reproductions/stories/site.ts` (`tags/screen`, `roster/own-row`,
  `nav/worked-navlayout`, `toolkit/custom-screen`)
- Modify: `src/lib/reproductions/index.ts` (register them)
- Modify: `src/lib/components/index.ts` and `package.json` only as the A1 audit's export
  list requires
- Test: extend the story-mount test (`roster/own-row` disables the own row driven by
  `data.self` = `fixtureEditor`)

**Interfaces:**
- Consumes: A2's `fixtureVocabulary`, `fixtureNavLayout`.
- Produces: all 25 stories registered; the story-mount test's universal assertions bind
  the full inventory.

- [ ] **Step 1:** Implement the four stories per the A1 audit.
- [ ] **Step 2:** Run the full story-mount test: 25/25 mount, all poses run, all anchors
  resolve, marker keys match the manifest. Export obligations where the audit requires
  them. Run the engine gate. Commit.

### Task A7: the `check:visuals` growth and the shared validator

**Files:**
- Create: `src/lib/reproductions/validate.ts`
- Modify: `src/lib/reproductions/manifest.ts` (re-export `validateReproFence` and its
  issue type from `./validate.js`, so the `/reproductions/manifest` subpath carries it)
- Modify: `scripts/checks/check-visuals.mjs`
- Modify: `package.json` (the `check:visuals` script becomes
  `npm run package && node scripts/checks/check-visuals.mjs` — the validator compiles from
  TypeScript under NodeNext `.js` specifiers that a plain `node` invocation cannot resolve
  against source, the same constraint `check-skill-budget.mjs` documents; the script
  imports the built `dist/reproductions/manifest.js`)
- Modify: `docs/internal/api-surface.md` (the manifest subpath's snapshot moves again)
- Modify: `src/tests/unit/check-visuals.test.ts`
- Test: `src/tests/unit/reproductions-validate.test.ts`

**Interfaces:**
- Consumes: A1's manifest.
- Produces: `validateReproFence(body: string, manifest: ReproManifestEntry[]):
  { issues: string[] }` on the `/reproductions/manifest` subpath, one implementation for
  both gates and B2. Checks, per the spec's gate 1: YAML parses (error names the problem),
  required keys present, no unknown keys, `width` absent or `narrow`/`desktop`, alt names
  the kind and is ≤ 150 characters, the story id resolves, the fence's width has a
  declared height.
- Produces: `check-visuals.mjs` additionally scans docs pages for `repro` fences, runs the
  validator, reads captions from inside the body for `repro` (after the fence for
  `mermaid`), and for a fence whose story has `markerKeys` verifies the page carries a
  keyed list with a matching entry count.

- [ ] **Step 1:** Failing validator unit tests covering every rule with one violating
  fixture each. Red, implement, green.
- [ ] **Step 2:** Grow `check-visuals.mjs`. Prove the gate red once: a scratch docs page
  with a defective fence exits 1 with a one-line violation; remove the scratch page.
  Current corpus stays clean (it carries no `repro` fences).
- [ ] **Step 3:** Refresh the `check:surface` snapshot for the manifest subpath. Run the
  engine gate. Commit.

### Task A8: reference page, register edit, ritual line, changelog

**Files:**
- Create: `docs/reference/reproductions.md` (one page serving both subpaths, the
  `/delivery/head` precedent, plus its row in the reference index per the arm's
  conventions)
- Modify: `scripts/checks/reference-coverage.mjs` (two CONFIG rows: `/reproductions` →
  `docs/reference/reproductions.md`, `/reproductions/manifest` → the same page; without
  the rows the reference gates pass vacuously)
- Modify: `docs/internal/docs-register.md` (the Visuals section records the two
  caption-form departures for `repro` fences, verbatim from the spec's Reference form
  section)
- Modify: `~/.claude/skills/cairn-release/SKILL.md` (the release-ritual line joins the
  changelog-finalization step: a release touching an admin surface triggers a re-read of
  the affected stories' captions and keyed lists; this is the releaser's page, per the
  amended spec)
- Modify: `CHANGELOG.md` (under `## Unreleased`)

**Interfaces:**
- Consumes: the shipped surface as A4 through A7 built it; the reference page documents
  the real signatures.

- [ ] **Step 1:** Write the reference page: both subpaths, the `ReproStory` and
  `ReproManifestEntry` shapes, `getStory`, `validateReproFence`, `fixtureMediaBase`, the
  fence schema table reproduced from the spec. `npm run check:reference` and
  `npm run check:reference:signatures` green with the two CONFIG rows in place.
- [ ] **Step 2:** The register edit, the ritual line, and the changelog entry. Vale clean.
- [ ] **Step 3:** Run the engine gate. Fold `cairn-register-editor` findings on the two
  repo prose files. Commit.

### Task A9: the Pass 1 close

**Files:**
- Modify: this plan file (append the Pass 1 post-mortem)
- Modify: `docs/STATUS.md` (cairn-cms, on `main` after the merge)

**Interfaces:**
- Consumes: everything in Pass 1.

- [ ] **Step 1:** Run `code-simplifier` over `src/lib/reproductions/` and the A3
  component edits; review and apply its refinements.
- [ ] **Step 2:** Reviewer fan-out per the `cairn-pass` close (`svelte-reviewer` over the
  new components and edits; `cairn-register-editor` already ran in A8). Fold findings.
- [ ] **Step 3:** Run the full `test.yml` gate list once. Merge the worktree branch to
  `main` (no release-one hold; the registry ships when release one cuts). Update
  cairn-cms `docs/STATUS.md`: Pass 1 shipped, immediate next action is Pass 2 with its
  repo (`~/Projects/cairn-pub`), branch (`pass-d-docs-tracks`), and resume prompt
  ("Execute Pass 2 of the live-reproduction seam plan, cairn-cms
  docs/superpowers/plans/2026-08-15-live-reproduction-seam-plan.md, from Task B1").
  Commit and push `main`.

---

## Pass 2: the delivery half (cairn-pub, branch `pass-d-docs-tracks`)

### Task B1: the tarball bridge

**Files:**
- Modify: `package.json` + `package-lock.json` (the `file:` pin)

**Interfaces:**
- Produces: an installed `@glw907/cairn-cms` carrying the four-track corpus AND the
  reproductions module; every Pass 2 task builds against it.

- [ ] **Step 1:** `npm pack` in `/home/glw907/Projects/cairn-cms` (the main checkout,
  post-merge — not a worktree, whose pruning would dangle the pin). Move the tarball to
  `~/Projects/cairn-scratch/` and pin the absolute path:
  `"@glw907/cairn-cms": "file:/home/glw907/Projects/cairn-scratch/glw907-cairn-cms-<version>.tgz"`.
- [ ] **Step 2:** Acceptance: the nine parked `src/lib/docs` vitest failures clear,
  `npm run build` prerenders `/docs` and `/help`, and
  `node -e "import('@glw907/cairn-cms/reproductions/manifest').then(m => console.log(m.manifest.length))"`
  prints 25. Commit the pin. (B5 records the un-pin obligation: the branch must not merge
  while the `file:` pin stands; release one's registry bump is the un-pin.)

### Task B2: the fence plugins

**Files:**
- Create: `src/lib/docs/repro-marker.ts` (`docsReproBlocks`, remark stage)
- Create: `src/lib/docs/repro-embed.ts` (`docsReproEmbed`, rehype stage)
- Modify: `src/lib/docs/loader.ts` (wire both into `renderPage`)
- Test: `src/lib/docs/repro-marker.test.ts`, `src/lib/docs/repro-embed.test.ts`

**Interfaces:**
- Consumes: `validateReproFence` and `manifest` from
  `@glw907/cairn-cms/reproductions/manifest`.
- Produces: a ```` ```repro ```` fence in any docs source renders as
  `<figure class="docs-repro">` — plus a width modifier class `docs-repro--desktop` or
  `docs-repro--narrow` when the fence pins one — carrying `<figcaption>` and
  `<iframe src="/repro/<story>" title="<alt>" loading="lazy" height="<declared>">`, with
  an HTML `width` attribute (860 or 390) on pinned embeds for the no-CSS case. B4 styles
  these classes and adds nothing to the markup. A defective fence throws at build naming
  file, fence, and problem.

- [ ] **Step 1:** Failing tests first, including the spec's load-bearing proof: a valid
  fence rendered through the engine's full `createRenderer` (the loader's exact option
  shape) yields an iframe in the output HTML, asserting survival past the sanitize floor
  and sink guard; all three width forms (responsive, `desktop`, `narrow`) emit their
  figure class, `width` attribute, and matching declared `height`; each validator
  violation class throws with the file and fence named. Prove red.
- [ ] **Step 2:** Implement: remark validates and marks on the `mermaid-marker.ts`
  pattern; rehype (site `rehypePlugins`, running after the floor) replaces the marker with
  the figure. Height and width ride HTML attributes, never inline style (the sink guard
  strips `style` wholesale). Green.
- [ ] **Step 3:** cairn-pub gate. Commit.

### Task B3: the `/repro` routes and the fixture-asset route

**Files:**
- Create: `src/routes/repro/[...story]/+page.svelte`, `+page.server.ts`, `+layout.svelte`
  (bare layout, `noindex` meta)
- Create: `src/routes/repro-assets/[...file]/+server.ts` (prerendered GET serving the
  packaged fixture bytes out of
  `node_modules/@glw907/cairn-cms/dist/reproductions/fixtures/`, `entries()` from the
  manifest's `fixtureMediaFiles`)
- Modify: `vitest.config.ts` (the `include` gains `src/routes/**/*.test.ts`; today it
  collects only `src/lib/docs/**`, so a route test would silently never run)
- Test: `src/routes/repro/repro-routes.test.ts`

**Interfaces:**
- Consumes: `getStory` and `ReproContext` from `@glw907/cairn-cms/reproductions`;
  `manifest`, `fixtureMediaBase`, and `fixtureMediaFiles` from the manifest subpath; A3's
  frozen-names table for the media base and shell theme props.
- Produces: `/repro/<group>/<name>` prerendered for all 25 ids via an explicit `entries()`
  generator (the crawler does not follow iframe `src`); each page mounts one story through
  `ReproContext` inside a `[data-repro-root]` wrapper baked to `cairn-admin`, passes
  `fixtureMediaBase` as the injected media base, runs its `pose`, then sets `inert` on the
  mounted content; own-theme-root stories (the auth pair and every shell story) take the
  theme as the fixture prop and update it when a `MutationObserver` sees the root
  attribute change; marker chips render from resolved anchors (soft-fail: omit chip,
  `console.error` the anchor); the `<noscript>` limitation line. The `(site)` catch-all is
  untouched: the literal `/repro` segment outranks its rest parameter (the spec, as
  amended, records this).

- [ ] **Step 1:** Failing route tests: `entries()` yields exactly the manifest ids; an
  unknown story id 404s; the rendered page carries `[data-repro-root]`, the robots meta,
  and the `<noscript>` line; `/repro/media/bulk-selection` resolves to the repro route,
  not the `(site)` catch-all. Red, implement, green.
- [ ] **Step 2:** `npm run build`: all 25 routes and the fixture assets prerender;
  `/docs`, `/help`, and the catch-all are unaffected. Acceptance: in the built preview,
  every `<img>` on `/repro/media/library` resolves 200 under `/repro-assets`, none under
  `/media`; a bare-host story (`publish/refusal-banner`) renders with admin tokens
  applied.
- [ ] **Step 3:** cairn-pub gate. Commit.

### Task B4: `DocsRepro`, figure styling, styleguide section

**Files:**
- Create: `src/theme/components/DocsRepro.svelte`
- Create: `src/lib/docs/repro-theme.ts` (the pure host-to-admin theme mapping
  `DocsRepro` imports, testable in the node project)
- Modify: the component that hosts `DocsMermaid`'s scan (`DocsArticle.svelte` or its
  wiring point; follow the existing pattern)
- Modify: `src/routes/(site)/styleguide/+page.svelte` (+ its `+page.server.ts` if data is
  needed)
- Test: `src/lib/docs/repro-theme.test.ts`

**Interfaces:**
- Consumes: B2's `.docs-repro` figures and width classes; `DocsMermaid.svelte`'s flip
  watchers as prior art.
- Produces: `mapHostTheme(hostTheme: string): string` in `repro-theme.ts`
  (`cairn` → `cairn-admin`, `cairn-dark` → `cairn-admin-dark`). `DocsRepro` scans on
  `afterNavigate` (the reason `DocsMermaid` records), writes the mapped value on each
  iframe's `[data-repro-root]` on load and on both flip paths, and refines iframe height
  against measured content. The `.docs-repro` figcaption wears the diagram caption's
  rendered treatment; pinned embeds sit left-aligned with the hairline frame and scroll
  inside the figure when the column is narrower. The styleguide gains a Reproductions
  section: one responsive, one `desktop`, one `narrow` embed, at least one of them a
  bare-host story, and its markup is the exact figure shape B2 emits (same classes,
  `title`, `height`/`width` attributes), so the probe's assertions bind real structure.

- [ ] **Step 1:** Failing test for `mapHostTheme` and the width-class styling contract.
  Red, implement, green.
- [ ] **Step 2:** Styleguide section renders the three embeds against real `/repro`
  routes. Styling constraint (review criterion, since cairn-pub has no
  `check:public-tokens` script): every color, size, and radius in `DocsRepro.svelte` and
  the `.docs-repro` styles reads a `--color-*`/`--cairn-*`/`--text-step-*` token, no
  literals; the conductor's diff review enforces it.
- [ ] **Step 3:** cairn-pub gate. Commit.

### Task B5: the probe growth and the Pass 2 close

**Files:**
- Modify: `scripts/diagram-containment-probe.mjs` (grow repro coverage, or a sibling
  `scripts/repro-probe.mjs` following its shape)
- Modify: `package.json` (`playwright` as the devDependency — `playwright-core` ships no
  browser download, so it would keep borrowing a sibling repo's chromium — plus an npm
  script for the probe)
- Modify: `docs/STATUS.md` (this repo) and cairn-cms `docs/STATUS.md` per the close

**Interfaces:**
- Consumes: everything.
- Produces: the recorded probe covering the spec's gate 4, run against the built preview's
  `/styleguide` (the three B4 embeds are the target; no shipped docs page carries a fence
  during this plan): containment at 320 and 390 reader viewports for responsive and pinned
  embeds, iframe accessible name equals the authored alt, theme flip re-renders (including
  one shell story's own-theme-root update), and no control inside a `.docs-repro` iframe
  reachable by Tab. The sanitize-floor-survival half of gate 4 is discharged by B2 Step
  1's full-`createRenderer` test, and the probe record says so.

- [ ] **Step 1:** Add `playwright` and the npm script; acceptance: the probe launches on
  a machine state with no sibling-repo browser install.
- [ ] **Step 2:** Run the probe against a built preview; record the pass in the probe's
  recorded-check format. Any failure is fixed before close, not recorded around. CI
  wiring stays deferred (spec's gate 4 ruling).
- [ ] **Step 3:** Run `code-simplifier` over the Pass 2 code. Reviewer fan-out per the
  site-pass close (`svelte-reviewer`, `daisyui-a11y-reviewer` on the new routes and
  components). Full cairn-pub gate. Update both STATUS docs: the seam is built; the
  editors rewrite unblocks; alt/caption text authors against the live `/repro` pages; the
  `file:` pin stands and the branch must not merge until release one's registry bump
  replaces it. Append the Pass 2 post-mortem to this plan file. Commit.

## Execution notes

- Conductor: a fresh Opus 5 session per pass, per the plan-approval-gate rule; this plan,
  the spec, and (for Pass 2) the A1 audit record are the whole handoff.
- Dispatch order is strictly A1 → A9, then B1 → B5. Story tasks never run concurrently in
  one worktree.
- If any story task splits again at execution, that is the pass-sizing signal: count the
  splits and propose trimming scope before adding a third dispatch, per the workstation
  rule.
