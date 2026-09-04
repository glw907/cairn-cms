# Adversarial review: `docs/superpowers/specs/2026-09-04-chassis-passes-design.md`

Read-only review, three lenses, findings ranked within each. Verified against the working tree at
`main` (`1e019f2d`). Every file:line below was opened, not inferred.

---

## Lens 1: Grounding

### G1. `check:idioms` does not exist on `main` (spec:60)

The spec writes "The engine stays on `check:idioms`" in the present tense. There is no
`check:idioms` script in `package.json`, no `scripts/checks/check-idioms.mjs`, and no reference to
the name anywhere on `main` or in the `internals-c` worktree. The gate is *created* by internals-C
Task 2 (`docs/superpowers/plans/2026-09-03-internals-c-pass.md:157`), scoped to leading-tab
indentation in `src/lib` plus `scripts` (`*.ts`/`*.svelte`/`*.mjs`) and `process.exit(` in
`scripts/checks/*.mjs`.

**Correction:** rewrite as "the engine's indentation gate, `check:idioms`, born in internals-C Task
2, stays the engine's only formatting enforcement." Also answer the overlap question explicitly:
the gate's scope excludes `examples/showcase`, so the two do not meet today; if the gate globs
`**/scripts/**` rather than repo-root `scripts/**`, it would reach
`examples/showcase/scripts/design-probe.mjs`, and there Prettier's default `useTabs: false` agrees
with the tab ban. Print width and quote style are the axes `check:idioms` does not police, so no
disagreement exists on any axis both enforce.

### G2. The trio's allowlist is in the wrong gate (spec:72-73)

The spec says "the `check:surface-leaks` narrative-context allowlist entry for the trio goes with
it." `scripts/checks/check-surface-leaks.mjs` contains no allowlist and no mention of the trio. The
entry is `NARRATIVE_CONTEXT_ALLOWLIST` in `scripts/checks/reference-coverage.mjs:601-610`
(`page: 'docs/reference/core.md'`, `names: ['cardShell', 'headRow', 'iconSpan']`), which runs under
`check:reference`, not `check:surface`.

**Correction:** name `scripts/checks/reference-coverage.mjs:609` and `check:reference`. The entry is
also asserted by two engine unit tests that hardcode it: `src/tests/unit/reference-coverage.test.ts:403`
and `:409` (`expect(coreEntry?.names).toEqual(['cardShell', 'headRow', 'iconSpan'])`).

### G3. The render trio's blast radius is understated (spec:68-74)

Verified call sites match the spec: `iconSpan` at `examples/showcase/src/chassis/render.ts:20`
(inside `makeIconRenderer`), `cardShell`/`headRow` at
`examples/showcase/src/theme/cairn.config.ts:106-107` (the `alert` component). The spec's list of
what else moves is incomplete. Also touched:

- Four engine test files: `src/tests/unit/render-pipeline-snapshot.test.ts:9-12,21,34,47,60`,
  `src/tests/unit/render-rehype-dispatch.test.ts:4,29,164-194`,
  `src/tests/unit/render-exports.test.ts:20,32`, `src/tests/unit/reference-coverage.test.ts:276,403,409`.
- Two reference pages: `docs/reference/render.md:11,18-20` and `docs/reference/core.md:696-709`.
- `src/lib/index.ts:106`, a comment naming the three helpers and where they live.

**Correction:** enumerate these in the task, since `check:reference` and `npm test` both go red
without them.

### G4. Deleting the trio empties the `/render` subpath, and the spec never decides that

`src/lib/render/authoring.ts` exports exactly two things: the trio (line 9) and the
`ComponentContext` type (line 12). Removing the trio leaves `@glw907/cairn-cms/render` a type-only
subpath with zero runtime exports, still wired in `package.json:110-114` and still owning
`docs/reference/render.md`.

**Correction:** the spec must decide, before plan authorship, whether `/render` survives as a
type-only subpath or is retired outright. Retiring it is a larger `Consumers must:` line, a
reference-page deletion, and an arm-index change (`check:arm-indexes`). Keeping it needs a stated
reason on the barrel, since a subpath that exports one type contradicts the barrel's own header
("the component-authoring toolkit").

### G5. `check:template` does not prove what the spec says it proves (spec:54)

"`check:template` proves nothing marked is emitted" overstates the gate.
`packages/create-cairn-site/scripts/emit-template-dir.mjs:121-136` runs `diffTrees` between a fresh
bake and the committed `templates/waymark`. Marker stripping is unconditional inside the bake
(`scripts/build/emit-template.mjs:36-63`), so the gate proves only that the committed tree equals a
fresh bake. It cannot detect a block that *should* have been marked and was not, which is the
failure mode the fixture rule exists to prevent.

**Correction:** state the invariant accurately ("the committed template always equals a fresh bake,
so an unmarked fixture becomes visible as a `templates/waymark` diff in review"), and, if a real
tripwire is wanted, add an assertion in the same task, for example a `create-site.yml` check that
`src/routes/probe-craft` and the string `siteLayoutSentinel` are absent from the scaffolded tree.
That job already carries the pattern at `.github/workflows/create-site.yml:106`
(`for (const leftover of ["e2e", "playwright.config.ts", ".claude"])`), which the spec should extend.

### G6. The marker idiom around the sentinel return is syntactically safe but leaves bad exemplar code (spec:86-87)

Verified `examples/showcase/src/routes/(site)/+layout.server.ts` is 17 lines: an import, a 12-line
TSDoc block, and a one-line `return` at :16. Wrapping only the `return` yields
`export const load: LayoutServerLoad = () => {\n};`, which parses and typechecks (a SvelteKit load
may return nothing). Three consequences the spec does not address:

1. The TSDoc block at :3-14 is outside the markers and would survive into the scaffold, describing a
   fixture field the scaffold no longer has, and citing `preview.spec.ts`, a file the scaffold never
   receives (`e2e` is excluded, `.cairn-template.json:7`).
2. The result is an exported `load` that returns nothing, which is exactly the non-exemplar code
   organizing rule 2 forbids.
3. Prettier collapses `() => {\n}` to `() => {}`, so the emitted file fails the scaffold format
   check item 2 adds. See R3.

**Correction:** mark from the import line through the closing brace, or add the whole file to
`.cairn-template.json`'s exclude list. Either removes the file from the scaffold cleanly.

### G7. `.cairn-template.json` and the marker idiom, as verified

`examples/showcase/.cairn-template.json` excludes exactly: `src/routes/test`, `src/members`,
`src/routes/members`, `migrations-members`, `e2e`, `playwright.config.ts`, `.claude`, `scripts`,
`README.md`. Markers exist in four files, not the two the spec names: `src/app.d.ts:44,49`,
`src/hooks.server.ts:21,30` (both cited correctly), plus `wrangler.jsonc:44,55` and a prose mention
at `src/members/dev-wiring.ts:2`. The `wrangler.jsonc` block is the more instructive precedent,
since it puts a leading comma inside the marked block so the surviving JSON stays valid.

**Correction:** cite `wrangler.jsonc:44-55` as the idiom's worked example; it is the one that shows
how to keep the stripped file syntactically whole.

### G8. Counts and file facts, verified

| Spec claim | Verdict | Evidence |
|---|---|---|
| `ARCHIVE_PAGE_SIZE` is 50, corpus is 14 posts | correct | `src/chassis/archive.ts:10`; `ls src/content/posts` = 14 |
| `handleUnseenRoutes` exception exists | correct | `examples/showcase/svelte.config.js:47-50` |
| Twin route retypes seven of nine fields | correct | `[...path=md]/+server.ts:13-21` versus `chassis/public-routes.ts:11-25` |
| Seven composition primitives | correct | `composition.css` defines `.cairn-card`, `-band`, `-section`, `-hero`, `-sidebar-layout`, `-site-shell`, `-site-main` |
| Focus ring 22 times across nine files | correct | `grep -c "outline: 2px solid var(--color-primary)"` = 22 in 9 files |
| Five hardcoded site-name sites | correct, and better than its input | `SiteHeader.svelte:112`, `SiteFooter.svelte:52`, `+error.svelte:23`, `archive/[page]/+page.svelte:17`, `styleguide/+page.svelte:107`. The recorded finding (`int-rank-site-chassis.md:343`) says four and misses the styleguide |
| Two unimported components, 464 lines | correct | `IntroLedger.svelte` 267 + `Carousel.svelte` 197; zero referrers anywhere in `src/` or `e2e/` |
| "Leftover one-off script" | correct | `examples/showcase/scripts/reference-capture.mjs:1-3`, "deleted after the pass". Note it lives under the excluded `scripts/`, so it never reached the scaffold; it is hygiene, not a leak |
| `COMMENT_GLOBS` in `eslint.config.js` | correct location, wrong sufficiency | `eslint.config.js:33`; see G9 |
| Showcase has no vitest project | correct | `examples/showcase/package.json` has no `test` script, no vitest dependency, no `vitest.config.*` |
| Nine `defineComponent` declarations, `$theme` self-import residue | correct | `cairn.config.ts` is 526 lines, 9 declarations, self-imports at :9-10 |
| Root `lint` is `eslint src/lib`, no Prettier config | correct | `package.json:67`; no `.prettierrc*` anywhere; no prettier dependency |

### G9. `COMMENT_GLOBS` alone does not extend the gate, and cannot reach `.svelte` (spec:57-58, 119)

Three separate gaps behind one sentence.

1. `check:comments` runs `npx eslint src/lib` (`scripts/checks/check-comments.sh:9`) and `lint` is
   `eslint src/lib` (`package.json:67`). Both hardcode the path. Extending `COMMENT_GLOBS`
   (`eslint.config.js:33`) changes which files the *config block* applies to; it does not change
   which files ESLint is asked to read.
2. The globs are `*.ts` only. `examples/showcase/src/**` holds the `.svelte` files item 10 targets.
3. No `eslint-plugin-svelte` and no `svelte-eslint-parser` are installed (`devDependencies` hold
   `eslint`, `eslint-plugin-jsdoc`, `eslint-plugin-tsdoc`, `typescript-eslint` only). `CLAUDE.md`
   states this outright: "ESLint does not parse `.svelte` yet".

**Correction:** item 2 must say which of three things it does: add the parser and plugin (a real
dependency and configuration decision), lint only the showcase's `.ts`, or drop the ESLint half.
And item 10's "Enforceable after item 2" (spec:119) is false as written: of item 10's five targets,
the 46-line `@component` blocks are `.svelte`, the 35-line derivation narrative is in
`src/theme/theme.css` (CSS, which ESLint never reads), and the `ec-*` residue is a string, not a
comment structure. Only the em-dash ban and TSDoc syntax in `.ts` files become enforceable.

### G10. The chassis README rule the spec says "becomes true" is already true (spec:73-74)

`examples/showcase/src/chassis/README.md:103-105` states a narrower rule than the spec quotes: "a
theme's `defineComponent()` build functions call the returned function and never import
`iconSpan`/`glyph` directly." That holds today. `cairn.config.ts` imports `cardShell`/`headRow`, not
`iconSpan`; `iconSpan` is imported by the chassis (`src/chassis/render.ts:8`), which the rule
permits.

**Correction:** drop the claim, and replace it with the real docs obligation: the README's
"Component-grammar wiring (`render.ts`)" paragraph (:102-105) currently describes `render.ts` as
icon wiring plus prose typography, and must gain the new chassis-local `headRow` export.

### G11. "In favour of the engine's guarantee" leans on an undocumented behavior (spec:102)

`sortNewestFirst` (`src/chassis/archive.ts:27`) can indeed be removed: the engine sorts dated
concepts newest-first at `src/lib/delivery/content-index.ts:139-140`. But that ordering appears
nowhere in `docs/reference/delivery.md` or any other reference page (grep for "sort"/"order"/
"newest" across `docs/reference/` finds only unrelated rows). The exemplar would then depend on
behavior the engine never promises.

**Correction:** either document the ordering as a contract in `docs/reference/delivery.md` in the
same task, or keep the sort. Removing it silently makes the exemplar teach an assumption a reader
cannot verify from the docs.

### G12. Minor: two named artifacts and one stale upstream claim

- The spec cites only `scripts/build/emit-template.mjs`, which is correct; the composing and baking
  halves live at `packages/create-cairn-site/scripts/emit-template-dir.mjs` and `.../bake-template.mjs`.
  Naming all three in the plan saves an implementer a search.
- `docs/STATUS.md` calls the initiative design "the amended initiative design", but
  `docs/superpowers/specs/2026-08-27-audit-remediation-initiative-design.md:119` still reads "One
  cut, after the chassis pass." The spec is right that the amendment is outstanding (item 11); STATUS
  is the stale document. Worth a line so the plan author does not assume it is done.
- `svelte.config.js:44` says "the 220-post fixture here never triggers it", and
  `src/chassis/archive.ts:7-9` derives the page size "against the 220-post review fixture". No such
  fixture is in the tree. Both comments are stale and item 5 must rewrite them, not only change the
  number.

---

## Lens 2: Risk and boundary

### R1. Lowering `ARCHIVE_PAGE_SIZE` to 5 or 6 is arithmetically incompatible with the tag filter, and breaks a test (spec:61-64, 100-102)

This is the spec's most serious defect, and it is a closed contradiction rather than a judgment call.

- `examples/showcase/src/routes/(site)/+page.svelte:16` sets `TAG_FILTER_MIN_ENTRIES = 12`, and :94
  gates the filter on `pageEntries.length > TAG_FILTER_MIN_ENTRIES`.
- The home page paginates `entries.slice(1)` (`(site)/+page.server.ts:15`), so page one holds
  `min(ARCHIVE_PAGE_SIZE, 13)` entries.
- For `/archive/2` to exist at all, `totalPages > 1`, so `ARCHIVE_PAGE_SIZE < 13`.
- For the tag filter to render, `pageEntries.length > 12`, so `ARCHIVE_PAGE_SIZE >= 13`.

With a 14-post corpus the two conditions cannot both hold. At page size 5, the tag filter disappears
from the exemplar's home page entirely, and `e2e/tag-filter.spec.ts` fails at :24
(`expect(total).toBeGreaterThan(12)`) and again at :14 (`await expect(filter).toBeVisible()`). The
spec asserts the cost is "one constant"; it is a constant, a taught feature, and a green test.

**Correction:** pick one and write it into the spec before plan authorship.
(a) Grow the corpus, for example to 26 posts, and set `ARCHIVE_PAGE_SIZE` to 13, which yields two
pages and keeps page one above the filter threshold. This costs 12 new content files and a larger
home baseline, and it is the only option that keeps both features taught.
(b) Lower `TAG_FILTER_MIN_ENTRIES` alongside the page size, and say in the spec that the threshold is
now fixture-shaped too.
(c) Drop the archive-proving decision and instead retire the never-executing route, which is the
option the recorded rank 1 left open.

### R2. Removing the `handleUnseenRoutes` exception re-arms a build failure in every scaffolded site (spec:63-64)

`examples/showcase/svelte.config.js:39-50` scopes the exception to `/(site)/archive/[page]` because
`entries` legitimately returns `[]` when the corpus fits on one page. The comment says so, and
records that the case was found in a real 14-post rehearsal. `svelte.config.js` is emitted into
`templates/waymark` (it is in the committed tree). The scaffold ships 14 sample posts, so a fresh
scaffold builds. The moment its owner deletes the sample posts down to `ARCHIVE_PAGE_SIZE + 1` or
fewer, `entries` returns `[]`, SvelteKit's unseen-route check fires, and the site's build fails hard
with a message about a prerenderable route nobody visited.

The exception is not showcase dead weight. It is the starter's own affordance for a small or empty
corpus, which is the state every real new site passes through.

**Correction:** keep the exception, rewrite its stale 220-post comment, and drop the removal from the
decision. Proving pagination and removing the exception are independent; the spec bundles them as if
one implied the other. If removal is still wanted, the plan must also state what a scaffolded site's
owner is supposed to do when they trim the corpus, and that instruction has to reach
`docs/extend/what-the-scaffold-wrote.md`.

### R3. Prettier in the scaffold collides with the marker idiom and the baked artifacts (spec:57-59, 93)

Item 2 puts `format`/`format:check` in the showcase package.json, which the bake carries into the
scaffold (`bake-template.mjs:21` prunes only `pretest:e2e`, `test:e2e`, `design:probe`), and adds the
format check to the scaffold CI job. Three things the emitted tree contains were never written by
Prettier:

1. Marker-stripped output. `stripMarkedBlocks` drops whole lines, so the stripped
   `+layout.server.ts` becomes `() => {\n}` (G6) and `app.d.ts`/`hooks.server.ts`/`wrangler.jsonc`
   can end with blank-line artifacts Prettier collapses.
2. `package.json`, rewritten by `JSON.stringify(..., 2)` (`emit-template.mjs:141`), then mutated
   again by the bake.
3. The bake's own generated files: `SITE_README` (`bake-template.mjs:29-56`) and the `DEV_SHIM`
   template literal (`:62-84`), both hand-formatted strings written straight to disk.

Any of these being non-Prettier-clean turns the scaffold job red on a change nobody made to the
showcase's source.

**Correction:** run `format:check` against the showcase in the engine's own gate, and in the scaffold
job either ship a `.prettierignore` covering the baked artifacts or add a bake step that formats its
generated output. State which. Also note that nothing in `create-cairn-site` currently assumes the
absence of a Prettier config; the risk is the presence of the check, not the config.

### R4. Prettier is a whole-tree rewrap of the showcase, which the spec's own "no repo-wide rewrap" line does not cover (spec:60)

Measured on `examples/showcase/{src,e2e}` (100 `.ts`/`.svelte` files):

- 98 of 100 files hold at least one line over 80 characters; 2,351 lines total.
- 68 of 100 files hold at least one line over 100 characters; 502 lines total.

So at Prettier's default width the entire showcase reformats, and at width 100 two thirds of it
still does, before counting quote style, trailing commas, arrow parens, and Svelte attribute
wrapping. The spec forecloses a repo-wide rewrap for the engine in the same sentence that authorizes
one for the showcase, without saying so. internals-C's ratified ruling ("Prettier adoption is out of
scope, whole-tree rewrap is the opposite of least-churn",
`docs/superpowers/plans/2026-09-03-internals-c-pass.md:59-61`) is scoped to the engine, so this is
not a contradiction of the ruling, but it inherits the same objection and needs the same explicit
answer.

**Correction:** pin the config in the spec (`printWidth`, `singleQuote`, `useTabs`, plugin list) and
state the expected diff size, so the plan author sizes the task honestly rather than discovering it.
Then sequence it: a tree-wide reformat must be the first or the last commit on the branch, or every
other task's diff arrives unreadable. See H2.

### R5. Deleting the trio is a four-consumer breaking change and the migration note must carry the code (spec:68-74, 177-178)

Verified imports of `@glw907/cairn-cms/render` outside this repo:

| Repo | Files |
|---|---|
| `ecxc-ski` | `src/chassis/render.ts:7` (`iconSpan`), `src/theme/markdown/components.ts:25` (`cardShell`, `headRow`) |
| `aksailingclub-org` | `src/chassis/render.ts:12` (`iconSpan`), `src/theme/markdown/components.ts:19` (`headRow`) |
| `xcathletes-org` | `src/chassis/render.ts:8` (`iconSpan`), `src/theme/cairn.config.ts:7` (`cardShell`, `headRow`) |
| `cairn-pub` | `src/chassis/render.ts:8` (`iconSpan`), `src/theme/cairn.config.ts:4` (`cardShell`, `headRow`) |

Every consuming site in the family uses at least two of the three. The `Consumers must:` line
therefore has to do more than announce a removal: it has to hand each site the replacement source,
or four repos re-derive the same twelve lines independently, which is the repeated-local-workaround
signal the workstation rules call an automatic filing trigger.

**Correction:** the `Consumers must:` line names the chassis `render.ts` shape the showcase adopts,
and gives the inline forms for `cardShell` and `iconSpan` verbatim, so a site's update is a paste.
Add a note that the trio's `ec-head`/`card-title` class names become `cairn-head`/`card-title` after
internals-C, so a site pasting the old body against a renamed stylesheet gets unstyled output.
(The three retire rulings themselves, `engine-rulings.md:3894`, `:3907`, `:3920`, are ratified; this
is about executing them without pushing five copies of the cost outward silently.)

### R6. The `$members` alias would put a fixture pointer in every scaffolded site (spec:113)

All six `../../members` traversals live in files that are themselves excluded from the template:
`src/routes/members/+page.server.ts:7`, `src/routes/members/login/+page.svelte:15`,
`.../login/+page.server.ts:8`, `src/routes/test/reset-members/+server.ts:18`,
`.../revoke-member-session/+server.ts:16`, `.../last-otp/+server.ts:17`. The alias table lives in
`examples/showcase/svelte.config.js:15-20`, which *is* emitted. Adding `$members` therefore ships a
scaffolded site an alias pointing at `src/members`, a directory the scaffold does not contain. That
is organizing rule 1 violated by the pass that states it.

**Correction:** either wrap the two `$members` alias lines in `cairn-template:exclude` markers (the
file is `.js`, so the idiom applies), or leave the relative traversal and record why: the importers
are fixture-only, so the traversal never appears in exemplar code a reader copies.

### R7. Removing `probe-craft` and the two dead components falsifies published docs, and CI's leftover list needs updating

`docs/extend/what-the-scaffold-wrote.md` documents all three:

- `:67` lists `probe-craft/` in the scaffold's directory tree.
- `:153` gives it a Public-routes row ("A leftover fixture from the engine's own admin design work
  ... safe to delete").
- `:130` describes `IntroLedger`/`Carousel` as registered markdown components, which the recorded
  finding already flags as wrong (`int-rank-site-chassis.md:250`).

`.github/workflows/create-site.yml:106` asserts a leftover list of `["e2e", "playwright.config.ts",
".claude"]` against the scaffolded tree; `probe-craft` belongs in it once excluded.

The other references to the route are internal records and the craft-chapter acceptance protocol
(`docs/internal/record/2026-07-craft-chapter-acceptance.md:12,32,55,285`), which reset and drive
`examples/showcase/src/routes/probe-craft/` by path. Excluding the route from the template does not
move it, so that protocol keeps working unchanged. No e2e spec references the route; `design:probe`
(`examples/showcase/scripts/design-probe.mjs`) is a generic band-composition gate that takes a
`BASE_URL` and does not name it.

**Correction:** add both doc edits and the CI assertion to items 1 and 4. Note that this makes
`docs/extend/what-the-scaffold-wrote.md` a file two A items write, which matters for H3.

### R8. Keeping the leak-sentinel e2e working

The spec does not say how, and the answer is not obvious from the spec text, so the plan must state
it. `e2e/preview.spec.ts:245-247` asserts the string `cairn-showcase-site-layout` appears in both a
minted preview payload and a public page payload. Marking the return excludes it from the *scaffold*
only; `examples/showcase` itself keeps the field, so the e2e keeps passing unchanged. That is the
correct and lowest-cost answer.

**Correction:** say so in one sentence in item 1 ("the fixture stays in the showcase and the e2e is
untouched; only the emitted copy loses it"), because a reader of the current text can reasonably
believe the sentinel is being deleted.

### R9. Charter check

Almost nothing here is engine scope creep. Every A and B item lands in `examples/showcase`,
`templates/waymark`, the emitter, or the repo's own gates, all of which are the engine project's
tooling rather than published engine surface. Two items deserve a sentence of justification the spec
does not give:

- **Prettier in the scaffold** is the only item that adds opinion to what a developer receives. It is
  defensible under the charter, since the emitted site is the developer's own repo and not engine
  surface, and `sv create` offers the same choice. It is worth one explicit sentence, because the
  same logic could be used to justify shipping anything into the scaffold. The line to hold: engine
  gates never depend on the scaffold's formatter.
- **The chassis unit-test project** ships a `test` script and a vitest devDependency into every
  scaffolded site by default, since `PRUNED_SCRIPTS` covers only three names. That is an implicit
  decision (see H6).

The render-trio deletion is charter-aligned in direction (leanness) but see R5 on where the cost
lands. Nothing here is a site design choice cairn should not own: the visual items in B are the
showcase's own theme, which cairn does own as the exemplar.

---

## Lens 3: Hygiene and sizing

### H1. The A/B seam leaks visual work into A

Chassis-B is declared "This is visual work: the `visual-fidelity` skill governs it" (spec:134-136),
which implies A is not. Four A items change rendered output:

- Item 5 lowers the page size (changes the home page's entry count) and rewrites the entry row as one
  component with its CSS once instead of twice. `int-rank-site-chassis.md:302` records the source:
  three copies of a 15-line `<article class="entry">` and about 120 lines of duplicated CSS across
  `(site)/+page.svelte:181-424` and `archive/[page]/+page.svelte:68-187`. Extracting that is a markup
  and CSS refactor of the two most-baselined pages.
- Item 4 deletes two components carrying focus-ring CSS.
- Item 3 splits `cairn.config.ts`, which owns the icon set the rendered components use.
- Item 10 rewrites comments in `.svelte` files, low risk but in the same files.

So A regenerates the `site-home-*` baselines (ten combinations, `e2e/site-visual.spec.ts:23-33`),
and B then regenerates the same set again for items 1, 2, 3 and 5. The baselines are written twice
and reviewed twice, and A's rewrites happen without the fresh-context `visual-verifier` gate the
family rule requires for output-changing work.

**Correction:** either move item 5's entry-row extraction into B (leaving A the constant and the
route plumbing), or state that A carries the visual gate for those items and budget for it. The
current text leaves an implementer to decide, and the cheap decision is the wrong one.

### H2. Item 2 must be first or last, which the spec does not say, and it defeats the parallel-chain claim

A tree-wide Prettier reformat (R4) rewrites 68 to 98 of the showcase's 100 source files. If it lands
mid-pass, every earlier task's committed diff is re-touched and every later task's diff is measured
against a moved baseline. Any `diff-reviewer` reading a task after it will read a diff dominated by
reflow.

**Correction:** pin the ordering explicitly. Landing the reformat as A's first commit is the cheaper
option, because it makes every subsequent diff clean; landing it last preserves reviewability of the
substantive work but forces one enormous final diff. Say which, and say that the reformat commit is
reviewed as a mechanical change, not read line by line.

### H3. "Disjoint-file chains" is not available to chassis-A, and the spec asserts it (spec:128)

`templates/waymark` is committed (96 files tracked) and `check:template` runs in CI
(`.github/workflows/test.yml:88`) as well as in the spec's own per-task gate list. `diffTrees`
compares the committed tree against a fresh bake, so *any* change to an emitted showcase file makes
the gate red until `npm run emit:template` is re-run and the regenerated tree is committed. That is
true of items 1, 3, 4, 5, 6, 7, 9 and 10, which is to say almost all of A.

Every one of those chains therefore writes `templates/waymark/**`. Two parallel chains produce
conflicting regenerated trees, and a chain that forgets the re-emit fails its own gate. The
contended resource is not any source file; it is the generated template.

A second contention sits underneath: STATUS records from internals-C that "three concurrent full
gates on this 15 GB / 8-core machine cause load-induced timeouts; two is the ceiling." A chassis
gate is heavier than an internals gate, since it adds the showcase's Playwright suite and the
from-scratch `npm install` the `cairn-pass` rule requires.

**Correction:** drop the disjoint-file framing. State instead that every task ends with
`npm run emit:template` plus a commit of the regenerated tree, and that at most two chains run
concurrently. Genuinely independent work that does not touch emitted files is small: item 2's
`playwright.config.ts` and e2e tab fixes (excluded from the template), item 8's unit-test project
(new files, though its package.json edit is emitted), and item 11's records. Everything else
serializes on the template.

### H4. Item versus task, and the doubling risk

Eleven A items and nine B items, each described as "a task or a task's step; the plan fixes the
grouping" (spec:83). The spec is right not to fix the grouping, but two items are not tasks and
cannot be sized as such:

- **Item 2** carries a formatter adoption, an ESLint scope extension with an unresolved `.svelte`
  question (G9), a tab-and-space sweep, an unbounded set of comment findings, and a CI change. The
  spec names the unbounded half as a risk (spec:175-176) and answers it with "the plan splits by
  directory rather than lowering the bar", which is a task split inside the pass. The pass-sizing
  rule names that exact move as the failure that feels like discipline while changing nothing.
- **Item 5** carries a constant change, a config-gate removal, a baseline addition, a component
  extraction, a CSS de-duplication, and a function deletion. That is six deliverables, past the
  roughly-four line, and R1 shows the first of them is not yet decided.

**Correction:** split item 2 into "formatter adoption plus the tab fixes" and "the comment gate plus
its findings", and decide R1 before item 5 is written, since its shape depends on the answer. Then
count: A is realistically thirteen to fifteen tasks, which is where the spec's own two-pass decision
said one plan would double.

### H5. Ceilings

Reference points: internals-B spent 4.06M across 14 tasks (0.29M per task) against an 8M ceiling;
internals-C's phase 1 spent 1.57M plus about 0.6M of fix and review dispatches across 4 tasks
(about 0.54M per task) against a 6.5M ceiling.

- **Chassis-A at about 5M**: thirteen to fifteen tasks at internals-B's rate is 3.8M to 4.4M, which
  fits; at internals-C's rate it is 7.0M to 8.1M, which does not. Chassis-A's gate is heavier than
  either (showcase e2e plus a from-scratch install per task), and it contains one item with
  explicitly unbounded volume. 5M is the optimistic end of a range whose pessimistic end is 60 per
  cent over.
- **Chassis-B at about 5M**: understated. B is nine visual items governed by `visual-fidelity`,
  which adds reference capture before the build and a fresh-context `visual-verifier` grade. Image
  reads dominate that budget, and B regenerates at least the ten `site-home-*` baselines plus the
  four new surfaces item 6 adds, in two color schemes.

**Correction:** raise A to 6.5M, matching internals-C's ceiling for comparable task count and a
heavier gate, and raise B to 6M with a stated screenshot budget per task. A ceiling that the first
checkpoint blows is worse than a generous one, because it forces the combined-question stop at 80
per cent for a reason that was predictable at authoring time.

### H6. Implicit decisions

Five places where a plan author must invent an answer the spec should give.

1. **What "vitest project" means** (spec:107). The word "project" is the engine root config's own
   term (`npm test` runs `--project unit --project unit-dist-spawn --project integration`). The
   showcase has no vitest at all. A new project in the root config and a standalone vitest inside
   `examples/showcase` are different builds with different consequences for the scaffold. The term
   is used one way in the engine and another way here.
2. **Whether the test suite ships to the scaffold.** `PRUNED_SCRIPTS` (`bake-template.mjs:21`)
   prunes exactly three names and `pruneShowcaseOnlyPackageFields` throws on a missing key but never
   removes an extra. So a `test` script and a vitest devDependency reach every scaffolded site by
   default. Decide: prune them (and update `bake-template.test.mjs:200,213`) or ship them and say why.
3. **Whether `/render` survives** (G4).
4. **Whether item 2 wires a Svelte parser** (G9).
5. **What `createSectionAction` does** (spec:114-115). The item defers to internals-C's Task 10
   ruling, which means chassis-A's plan cannot be authored until C's Task 10 lands. The spec says
   plans follow through `writing-plans` with A first (spec:3-4); it should add that A's authorship
   is gated on C's Task 10 output, not merely on C's merge.

### H7. Terms used two ways

- **Slice numbering.** The spec titles itself "slices 8 and 9" (STATUS's numbering, where 6 is
  internals-B and 7 is internals-C) and then refers to "the initiative design's slice-6 second half"
  (spec:158) and "chassis-A amends that spec's slice-6 and publish paragraphs" (spec:76). The
  initiative design numbers the chassis pass 6 (`2026-08-27-...:109`), and so does the rulings
  ledger (`engine-rulings.md:3928`, "The chassis pass (slice 6)"). One document uses "slice 6" to
  mean two different passes.
  **Correction:** write "the initiative design's item 6, the chassis pass" wherever the old
  numbering is meant, and note the renumbering once at the top.
- **"Marked or excluded"** (spec:40-42) reads as two interchangeable mechanisms, but they are not:
  path exclusion removes a file, markers remove lines from a kept file, and only the latter can
  leave broken or vacuous output (G6). One sentence distinguishing them would prevent an implementer
  reaching for markers where exclusion is correct.

### H8. Small internal inconsistencies

- **The 22 rings become fewer before B runs.** `IntroLedger.svelte` and `Carousel.svelte` each hold
  one of the 22 (verified by count), and A item 4 deletes both. B item 3's "the 22 hand-written
  rings" is stale on arrival. Write "the remaining hand-written rings, 20 after A's deletions".
- **B items 1 and 2 overlap.** `.cairn-site-shell` and `.cairn-site-main` are two of the seven
  primitives, and item 1 adopts them. Item 2 then says "each of the seven primitives appears in
  showcase markup." Say that item 2 covers the remaining five.
- **B item 3 adds an eighth primitive.** The review calls the focus ring "the single highest-value
  composition primitive the chassis could add" (`showcase-review...:414-415`). If it becomes a chassis
  primitive, item 2's proof rule (baselined, proven at 320 and 2560) applies to it too.
- **A item 6 covers one of three duplications.** The recorded finding
  (`int-rank-site-chassis.md:167`) names `feed.xml/+server.ts:11-13` and `feed.json/+server.ts:11-13`
  as "the same duplication one level down". The spec's item 6 names only the `[...path=md]` twin.
  Either include the feeds or say they are deliberately out of scope.

### H9. Writing rules

Clean overall. Zero em dashes. No marketing words. Sentences are mostly one idea each. Three notes:

- "in favour" (spec:102) is a British spelling; the repo writes to Google style. `.vale.ini` excludes
  internal planning docs, so no gate catches it.
- Spec:24-29 is one 79-word sentence carrying five clauses ("The showcase carries three jobs at
  once ... a script whose own header says it should be gone"). It is the most important paragraph in
  the document and the hardest to parse. Split it after "and only the first is stated."
- Spec:10 runs a parenthetical bank of paths past the line's own width and then opens a second
  parenthetical on the next line ("(the record internals-C's Task 10 names and this spec creates)").
  The nesting is hard to follow; give the record its own sentence.

---

## Ranked top eight across lenses

1. **R1.** Lowering `ARCHIVE_PAGE_SIZE` to 5 or 6 is arithmetically incompatible with the tag
   filter's `> 12` gate on a 14-post corpus. It removes a taught feature from the exemplar's home
   page and fails `e2e/tag-filter.spec.ts:14,24`. The decision must be remade before item 5 is
   written.
2. **R2.** Removing the `handleUnseenRoutes` exception re-arms a hard build failure in every
   scaffolded site whose owner trims the sample corpus below the page size. The exception is the
   starter's own affordance, not showcase dead weight.
3. **H3.** `check:template` makes the committed `templates/waymark` a file that nearly every A task
   must regenerate and commit, so the "disjoint-file chains" parallelism the spec plans on does not
   exist, and each task needs an explicit re-emit step it currently lacks.
4. **R4 with H2.** Prettier in the showcase is a whole-tree rewrap (98 of 100 files at width 80, 68
   at width 100), unsized in the spec and unordered against the other ten A items, whose diffs it
   would otherwise swamp.
5. **G9.** Extending `COMMENT_GLOBS` does not extend the gate: `lint` and `check-comments.sh`
   hardcode `src/lib`, the globs are `.ts` only, and no Svelte parser is installed. Item 10's
   "Enforceable after item 2" is false for its three largest targets.
6. **G2 with G3 and G4.** The trio's allowlist is in `reference-coverage.mjs`, not
   `check:surface-leaks`; the deletion also touches four engine test files and two reference pages,
   and it leaves `/render` a runtime-empty subpath the spec never decides the fate of.
7. **H1.** The A/B seam leaks output-changing work into A (the page size, the entry-row extraction,
   the dead-component deletion) without the visual-fidelity governance B claims, and writes the same
   baselines twice.
8. **R7 with H5.** Three published doc lines and one CI leftover assertion go stale on items 1 and 4
   and are unlisted; and both ceilings are set at the optimistic end of the observed per-task range
   for a heavier gate than either reference pass ran.

## Verdict

The spec is close and worth correcting rather than rewriting. Its diagnosis is right, its two
organizing rules are the correct frame, its A/B cut is defensible, and its factual grounding is
better than average: the counts, the file paths, the marker idiom, the primitive inventory, the
`defineComponent` and `$theme` residue, and the seven-of-nine retyped fields all check out, and its
five hardcoded site-name sites improve on the recorded finding's four. But two of its five ratified
decisions do not survive contact with the tree. The archive decision is arithmetically impossible as
stated, and the exception removal breaks scaffolded sites rather than only the showcase. Those are
not plan-authorship details; they are the decisions a plan would encode. The third structural
problem is that `check:template` serializes the pass on one generated tree, which invalidates the
execution mode the spec chose and the ceiling that mode implied. Fix those three, resolve the five
implicit decisions in H6, correct the two wrong gate names, add the three doc edits and the CI
assertion, re-size both ceilings, and the spec is ready. Without them a plan author will either
encode the contradictions or stop mid-pass to ask, which is the human interaction point the process
exists to avoid. Estimated correction effort is one focused revision pass, not a re-brainstorm.
