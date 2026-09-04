# Adversarial review: `docs/superpowers/plans/2026-09-04-chassis-a-pass.md`

Read-only, three lenses, findings ranked within each. Verified against the working tree at `main`
(`9d893e34`), which is pre-internals-C-merge, the same baseline the plan itself declares. Every
`file:line` below was opened, not inferred. The spec (`2026-09-04-chassis-passes-design.md`) and its
banked review (`docs/internal/record/2026-09-04-chassis-inputs/spec-review.md`) were read in full;
findings that regress a spec-review correction are marked **REGRESSION**.

---

## Lens 1: Grounding

### G1. The plan's execution instruction names a script that does not exist

`plan:5` says "workflow mode via the chain-aware `pass-execute-chains.js` variant with ONE chain".
`~/.claude/workflows/` contains exactly one file, `pass-execute.js`. There is no
`pass-execute-chains.js` anywhere on the workstation. The exemplar names the real path
(`2026-09-03-internals-c-pass.md:3-4`, "workflow mode via `~/.claude/workflows/pass-execute.js`").

A cold session trips on this in its first minute.

**Correction:** write "workflow mode via `~/.claude/workflows/pass-execute.js`, run as a single
sequential chain". If the intent was one chain per task in strict order, say that instead, since a
one-chain workflow and per-task Agent dispatch are the same thing at twelve tasks.

### G2. The archive arithmetic is correct; the claim that no baseline moves is false

The arithmetic first, since the plan asked for it and it checks out. `(site)/+page.server.ts:15`
paginates `entries.slice(1)`. With 27 posts that slice is 26. `paginateArchive`
(`src/chassis/archive.ts:36-41`) at page size 13 yields `totalPages: 2`, page one 13 entries, page
two exactly 13 entries. `(site)/+page.svelte:16,94` gates the tag filter on `pageEntries.length > 12`,
and 13 > 12, so the filter still renders. `tag-filter.spec.ts:22-24` counts `[data-cairn-post]`
across the featured lead plus the index, which is 1 + 13 = 14 > 12, so that test stays green. Every
number in `plan:52-57` holds.

What does not hold is `plan:54` ("the filter and the home baseline are unchanged"), `plan:78-79`
("No rendered output changes except Task 6's new `/archive/2` baseline"), and `plan:239` ("every
existing baseline unchanged"). Three independent falsifiers:

1. `(site)/+page.svelte:161` renders a pagination block gated on `data.archive.totalPages > 1`,
   including a "Page 1 of 2" status at `:171` and an "Older" link at `:172-174`. Today
   `totalPages` is 1, so that block is absent from every committed `site-home-*` baseline. Task 6
   makes it 2. All ten `site-home-{light,dark}-{320,390,768,1440,2560}` baselines move.
2. The 13 new posts are "dated across the existing range" (`plan:219`), so they interleave with the
   existing 14 and change which posts the featured lead and the 13 index rows show. The home page's
   visible content changes even before the pagination block.
3. `e2e/admin-visual.spec.ts:14-15,21-22` takes a full-page screenshot of `/admin/posts` as
   `admin-office-{light,dark}.png`. A posts list going from 14 rows to 27 moves both.

So Task 6 moves at least twelve committed baselines, and `plan:79` instructs the implementer to
stop and report the moment it sees one. Task 6 cannot be executed as written.

**Correction:** see R1, which carries the two ways out.

### G3. Task 9's test targets point at paths that do not exist

`plan:300-302` creates `examples/showcase/src/chassis/islands/banner-expiry.test.ts`. There is no
`src/chassis/islands/` directory; `ls src/chassis/` returns ten `.ts` modules, three `.css` files
and a README, none of them a directory. `isBannerExpired` lives at
`src/theme/islands/banner-expiry.js` (imported as such at `src/theme/cairn.config.ts:10`), which is
`$theme`, not `$chassis`. `isAdminHref`, which the spec names as one of the four targets
(`spec:177`), lives at `src/theme/components/admin-link.ts:9` and is absent from the plan entirely.
`src/chassis/date.ts:15` exports exactly `formatDate`, which is the one target the plan sites
correctly.

The acceptance criterion at `plan:315` ("every pure chassis function has a test") then quietly drops
two of the spec's four named functions, because both are theme modules.

**Correction:** name the real paths and say the suite covers `$chassis` and `$theme` pure logic
both: `src/chassis/archive.test.ts`, `src/chassis/date.test.ts`,
`src/theme/islands/banner-expiry.test.ts`, `src/theme/components/admin-link.test.ts`. Restate the
acceptance criterion as "every pure function the spec names has a test, co-located with its module".

### G4. Tasks 5 and 8 name the wrong artifact as their byte-identity proof

`plan:208-209` says the split is proven when "the render-pipeline snapshot and the showcase e2e
suite must be byte-identical after the split". `plan:286-287` repeats it for Task 8: "with the
render-pipeline snapshot (engine side) and the showcase e2e suite proving the rendered markup is
byte-identical".

`src/tests/unit/render-pipeline-snapshot.test.ts:18-21` builds "a representative fixture registry"
and its own local `makeIcon`, with the header comment "Stands in for a site's registry so the
byte-identical lock lives in the engine suite with no consumer dependency". It never imports the
showcase. Splitting `examples/showcase/src/theme/cairn.config.ts` cannot move that snapshot, and
inlining `cardShell` into the showcase's `alert` component cannot move it either. The snapshot is
green under both changes whether or not the showcase's markup shifted, so it proves nothing about
either task.

A second consequence sits in Task 8. That same file imports the trio from the internal path
(`:8-16`, `from '../../lib/render/rehype-dispatch.js'`), so deleting the three definitions breaks
its imports. The plan lists the file for modification (`plan:270`) but never says whether the
byte-identical lock survives with local fixture copies of the three helpers, or is dropped.

**Correction:** for both tasks, name the showcase e2e suite as the proof and add a concrete
showcase-side check for Task 8 (render the `alert` directive before and after and diff the HTML, in
the task). For the engine snapshot, state the decision: keep the lock by moving `cardShell`,
`headRow` and `iconSpan` into the test's own fixture block beside `fixtureHead` (`:26`), which is
the cheaper option and preserves the lock the file exists for.

### G5. The chassis header-prefix item has the wrong denominator and the wrong direction

`plan:328-329` names "the `src/chassis/*` modules missing the `// cairn-cms:` header prefix (2 of 12
carry it today)", and `plan:338` accepts on "every chassis module headered". Two problems.

The count: `src/chassis/` holds ten `.ts` modules, of which exactly two open with `// cairn-cms:`
(`dev-gate.ts:1`, `feed.ts:1`). The denominator is 10, not 12, whether or not the three `.css` files
are meant to be in scope (the plan does not say).

The direction: the banked showcase review's finding 3.4
(`showcase-review-at-the-exemplar-bar.md:344-350`) reads "Eight modules open with `// cairn-cms:` …
roughly thirty do not. The prefix carries no information inside a file that lives in a cairn site.
**Leanest fix: drop the prefix from all eight.**" The plan does the opposite and adds it to eight
more modules. The spec inherited the inversion at `spec:183`, so this is not strictly a spec-review
regression, but it is a plan that contradicts the input it cites, and the charter's leanness test
favours the review's answer.

**Correction:** decide it explicitly in the Ruled inputs block, with the review cited. If the ruling
is "drop", the item becomes "remove the `// cairn-cms:` prefix from the eight modules that carry it"
and the acceptance becomes "no showcase module opens with the prefix". If the ruling is "add", say
why the review's argument is rejected, and fix the denominator to 10 and the scope to `.ts` modules.

### G6. Task 6 writes 13 posts to a content guide that does not exist

`plan:218-219` requires the new posts be "written to the showcase content guide", and `plan:81`
repeats it as a global constraint. There is no such document. A search across `examples/showcase`
and `docs/` for a content or writing guide returns only `examples/showcase/README.md` and
`src/chassis/README.md` (neither of which is one), plus the spec and this plan themselves. The
workstation rule the constraint is echoing (`CLAUDE.md`, Writing voice: "Site content is the one
personal voice, in the site repo's own content guide") presupposes a guide the showcase never grew.

Thirteen invented posts ship into every scaffolded site, so the voice question is not decorative.

**Correction:** either name the real authority (the existing 14 posts as the exemplar corpus, read
before drafting, plus the `content-draft`/`content-review` skills), or make writing the guide the
first step of Task 6 and put it under `examples/showcase/`. Do not leave "the showcase content
guide" as a pointer to nothing.

### G7. Task 11's `theme.css` item lacks the anchor and reads as the wrong deletion

`plan:347` names "the 35-line derivation narrative in `src/theme/theme.css` (3.3)". The review's 3.3
(`showcase-review-at-the-exemplar-bar.md:331-339`) targets `src/theme/theme.css:191-225`, the type
scale's derivation, and prescribes a specific shape: keep about five lines carrying the two facts a
re-skinner needs, move the derivation to `docs/internal/public-design-system.md`.

Without the anchor, the nearest 35-line narrative an implementer meets is the file's own header at
`theme.css:1-40`, which is the RE-SKIN RECIPE, actionable instruction the header itself calls "The
one file a site owner edits to re-skin". Deleting that would be a straight regression and a diff a
reviewer should reject.

**Correction:** write `src/theme/theme.css:191-225`, state the five-line keep, and name
`docs/internal/public-design-system.md` as the destination.

### G8. Task 4's doc anchor is off by one, and the row names a third component

`plan:182` cites `docs/extend/what-the-scaffold-wrote.md:130`. The row is at `:131`
("`components/` | The theme's registered markdown components (`ArticleView`, `Carousel`, and the
rest)…"). `IntroLedger` is not named in that table at all, and `ArticleView` is not a registered
markdown component either, which the recorded finding already flags
(`int-rank-site-chassis.md:290`). So the edit is a rewrite of one row's claim, not a deletion of two
names.

**Correction:** cite `:131` and state the fix: the row stops calling `components/` the registered
markdown components, since the registered set lives in `cairn.config.ts`.

### G9. Task 1's cited line ranges do not hold the generated-file paths, and the stated verification
tests the wrong tree

`plan:110-111` tells the implementer to "read `bake-template.mjs:21-84` and `emit-template.mjs:141`
for the exact paths". Lines 21-84 of the bake hold `PRUNED_SCRIPTS` and the two string constants
(`SITE_README` at `:24-53`, `DEV_SHIM` at `:60-79`); the destination paths are written 110 lines
later, at `bake-template.mjs:192-197` (`README.md`, then `scripts/dev.mjs` after an `mkdir`).
`emit-template.mjs:141-145` is right for the rewritten `package.json`.

The verification is worse. `plan:112` says "Verify by emitting and running `format:check` inside a
fresh `templates/waymark`". `templates/waymark` is bake **plus overlay**
(`emit-template-dir.mjs:47-67,74-79`), and the overlay's `template-repo/README.md` replaces the
bake's `SITE_README` outright. So `templates/waymark` never contains the file
`create-site.yml`'s scaffold job actually format-checks. The same is true of `LICENSE`,
`.dev.vars.example`, and the appended `.gitignore`.

**Correction:** cite `bake-template.mjs:192-197` for the paths, and require the verification run in
BOTH trees: a fresh `templates/waymark`, and a bake-only tree
(`node packages/create-cairn-site/scripts/bake-template.mjs --to <tmp> …`, the exact command
`create-site.yml:50` runs).

### G10. Task 7's acceptance criterion does not test the half the task adds

`plan:246-248` extends Task 7 to `feed.xml/+server.ts:11-13` and `feed.json/+server.ts:11-13`,
"the same duplication one level down". Those lines hold a feed-metadata literal
(`{ title: siteConfig.siteName, description: SITE_DESCRIPTION, siteUrl: ORIGIN, feedUrl: … }`), not
a `PublicRoutesConfig`. `PublicRoutesConfig` has nine fields and is defined once at
`src/chassis/public-routes.ts:11-25`; the feeds never construct one.

`plan:254` then accepts on "exactly one `PublicRoutesConfig` literal in the showcase", which is
satisfied by the `[...path=md]` half alone and says nothing about the feeds.

**Correction:** say what the feeds consume (a `siteMeta` export from `$chassis/content.ts` holding
title, description and origin, with each route supplying only its own `feedUrl`), and add an
acceptance line: "`siteConfig.siteName` and `SITE_DESCRIPTION` are composed in exactly one place;
both feed bodies byte-identical before and after".

### G11. Task 8's `render.md` anchors are pre-internals-C

`plan:273-274` cites `docs/reference/render.md:11,18-20`. internals-C Task 4
(`2026-09-03-internals-c-pass.md`, Task 4 Files and Interfaces) rewrites that page to carry the full
emitted-class registry and the registration rule. The line numbers will have moved before this pass
starts, and the plan's own header instruction to re-verify covers it.

**Correction:** none required beyond a parenthetical, but say it where the anchor is: "(render.md is
rewritten by internals-C Task 4; re-anchor at dispatch)".

### G12. Anchors and assumptions verified as correct

Everything below was checked and holds, so no task needs to re-derive it.

| Plan claim | Verdict | Evidence |
|---|---|---|
| Four tab-indented files, exactly those named | correct | `grep -rlP '^\t'` over the showcase returns `playwright.config.ts`, `e2e/masthead-responsive.spec.ts`, `e2e/site-visual.spec.ts`, `e2e/theme-toggle.spec.ts` |
| `.cairn-template.json` can exclude a single FILE path | correct | `emit-template.mjs:96-99`, `norm === ex \|\| norm.startsWith(ex + '/')`; the exact-match arm accepts `src/routes/(site)/+layout.server.ts` |
| Excluding `(site)/+layout.server.ts` leaves the scaffold building | correct | its only export returns `{ siteLayoutSentinel }` (`:15-17`) and `(site)/+layout.svelte` never reads layout data (no `$props`/`data` reference) |
| The leak-sentinel e2e is untouched | correct | `e2e/` is excluded (`.cairn-template.json`), so `preview.spec.ts` keeps asserting against the showcase's own copy |
| `create-site.yml:105-106` is the leftover-assertion site | correct | the `for (const leftover of ["e2e", "playwright.config.ts", ".claude"])` loop, inside a `node -e` block |
| `check:surface -- --update` | correct, including the `--` | `check-surface.mjs:22,445` print that exact form |
| Trio has no engine-internal callers | correct | `grep` over `src/lib` finds only the three definitions (`rehype-dispatch.ts:20,29,39`), the barrel line (`authoring.ts:9`) and one comment (`index.ts:106`) |
| `NARRATIVE_CONTEXT_ALLOWLIST` is in `reference-coverage.mjs` under `check:reference` | correct | and pinned by `reference-coverage.test.ts:409`. Note `:403` is a synthetic fixture inside a different test and needs no edit |
| `docs/reference/delivery.md` documents no ordering | correct | zero hits for sort/order/newest; the source is `src/lib/delivery/content-index.ts:139-142`. Task 6's doc obligation is real |
| `sortNewestFirst` has two call sites | correct | `(site)/+page.server.ts:13`, `(site)/archive/[page]/+page.server.ts:11` |
| `wrangler.jsonc:44-55` is the marker's worked example | correct | the leading comma sits inside the marked block at `:45`, keeping the JSON valid |
| `cairn.config.ts` is 526 lines, nine `defineComponent`, `$theme` self-imports at `:9-10` | correct | verified all three |
| `admin/signups/+page.server.ts:32` is the `fail` literal | correct | `if (!name \|\| !email) return fail(400, { error: 'missing' });` |
| `test/last-commit/+server.ts:9` is the untyped handler | correct | `export async function GET()` |
| `lint` and `check-comments.sh:9` accept extra path arguments | correct | `package.json:67` is `eslint src/lib`; `check-comments.sh:9` is `npx --no-install eslint src/lib`. Both are bare arg lists |
| The showcase has no transitive vitest | correct | no `examples/showcase/node_modules/vitest`; the showcase installs from its own lockfile (`test.yml:91`). Task 9's devDependency is required, as the plan says |
| The four new dependencies exist at compatible versions | correct | prettier 3.9.6; prettier-plugin-svelte 4.1.1 (peers `prettier ^3.0.0`, `svelte ^5.0.0`); eslint-plugin-svelte 3.23.0 (peers `eslint ^8.57.1 \|\| ^9 \|\| ^10`, root has `eslint ^10.9.0`); svelte-eslint-parser 1.8.1 (peer `svelte ^3 \|\| ^4 \|\| ^5`, root and showcase have `^5.56.10`) |
| Initiative design item 6 and the publish paragraph at `:109-121` | correct | item 6 at `:109-115`, "One cut, after the chassis pass" at `:119` |

---

## Lens 2: Risk and boundary

### R1. Task 6 is output-changing work inside a pass that forbids output changes, with no visual gate
and no baseline-regeneration mechanism

The evidence is G2. The consequences are three.

First, the plan's own stop rule (`plan:79`) fires on Task 6, so an implementer following the plan
literally halts the pass at task six and escalates. That is the human interaction point the process
exists to remove.

Second, twelve moved baselines are exactly the A/B seam leak the spec review's H1 raised, and the
spec answered it only halfway: it moved the entry-row extraction to chassis-B (`spec:169`) but kept
the page-size change in A, and `spec:99` still asserts the home baseline is unchanged. So the spec
review's correction was folded incompletely, and the plan inherited the hole. **REGRESSION**, in the
sense that the review's H1 remains unanswered for the item that actually moves the pixels.

Third, the plan gives no mechanism for producing the new baselines. `playwright.config.ts:4-14`
records that "baselines are CI-canonical (the regen dispatch)", and `CLAUDE.md` states the gate is
the CI width matrix with baselines regenerated on CI as the canonical renderer. `plan:234` says only
"the baselines for `/archive/2` (new baselines only…)". A locally generated `-linux` PNG is not the
same artifact.

**Correction, pick one and write it in:**

(a) Move Task 6 to chassis-B, where `visual-fidelity` governs and the `site-home-*` set is already
being regenerated for the shell, the primitives, the focus ring and the entry row. Chassis-A keeps
only the two stale comment rewrites (`archive.ts:7-9`, `svelte.config.js:39-46`), the
`sortNewestFirst` removal and the `delivery.md` ordering contract, which change no output. This is
the cheaper option and it removes the double-write of the same ten baselines the spec review's H1
objected to.

(b) Keep it in A and pay for it: name the CI regen dispatch as the baseline mechanism, enumerate the
twelve baselines that legitimately move (`site-home-*` ten, `admin-office-*` two), budget the
fresh-context `visual-verifier` grade for the home page, and rewrite `plan:78-79`, `plan:54` and
`plan:239` so the constraint reads "no baseline moves except the twelve enumerated in Task 6".

### R2. Task 1's reformat is asserted to be baseline-neutral with no mitigation, and its two globs
disagree

`plan:120-121` accepts Task 1 on "no behavior change (the showcase e2e suite green unchanged; no
baseline changes)". That is an assertion about a whole-tree rewrap of 68 to 98 source files, and
three mechanisms can falsify it.

1. `prettier-plugin-svelte` reflows markup. Whitespace between inline elements is significant in
   HTML, and the visual suite runs at `maxDiffPixels: 120` (`playwright.config.ts:11`), which is a
   defect-size floor, not a whitespace amnesty. A rewrapped inline run in `SiteHeader.svelte` or an
   entry row is exactly the shape that moves a few pixels.
2. `plan:113` formats `examples/showcase/{src,e2e,*.ts,*.js}`, and `src/**` recursively includes
   `src/chassis/prose.css`, `src/chassis/tokens.css`, `src/chassis/composition.css`,
   `src/theme/theme.css` and `src/theme/site.css`. Those are read by `check:public-tokens` and
   `check:chassis-boundary`, and `prose.css` is the file internals-C Task 4 rewrites for the `ec-*`
   rename. Reflowing CSS in the same commit as everything else is avoidable churn against two gates
   and one just-landed rename.
3. `format` is pinned to that glob; `format:check` is not pinned at all. The conventional
   `prettier --check .` covers files `format` never wrote (`wrangler.jsonc`, `package.json`,
   `tsconfig.json`, `migrations/`, the content markdown), so the gate can be red on files the task
   never touched.

**Correction:** pin one target set used by both scripts, written once in `package.json`. Exclude
`*.css` from the first adoption and say so ("the CSS half rides chassis-B, after internals-C's
`prose.css` rename settles"), or include it and name `check:public-tokens` and
`check:chassis-boundary` in Task 1's gate. Replace the "no baseline changes" assertion with a
procedure: run the visual suite before and after the reformat commit; if any baseline moves, stop
and report, because a mechanical reformat that changes paint is not mechanical.

### R3. Task 2's Svelte block can silently reach the engine's own components, and its rule set is far
wider than a comment gate

`plan:128-130` says the new block uses "`eslint-plugin-svelte`'s recommended flat config". That
config ships its own `files: ['**/*.svelte']`. Spread verbatim into `eslint.config.js`, it matches
`src/lib/components/**/*.svelte` as well as the showcase, and since ESLint 9+ derives a directory
argument's extensions from the configs' `files` patterns, `eslint src/lib` would then start linting
the engine's forty-odd admin components. `plan:148` asserts "the engine's `src/lib` results
unchanged" as an acceptance criterion, but nothing in the steps prevents it, and `CLAUDE.md`
explicitly holds the engine's `.svelte` half unwired (`plan:136` files that to polish).

The second half of the risk is scope. `configs.recommended` is an a11y and reactivity rule set, not
a comment rule set. Turning it on over 40-plus showcase `.svelte` files produces an unbounded
finding population inside the one task the plan already flags as volume-risky (`plan:142-144`), and
those findings are behavioral fixes, not comment rewrites, which contradicts `plan:139` ("Comment
rewrites only").

**Correction:** do not spread the recommended config. Add one block with an explicit
`files: ['examples/showcase/src/**/*.svelte']`, `languageOptions.parser: svelteEslintParser` with
`parserOptions.parser: tseslint.parser`, and the same four comment rules the `.ts` block already
carries (`house/no-em-dash-in-comments`, `jsdoc/no-types`, `tsdoc/syntax`,
`jsdoc/informative-docs`). State in the Interfaces block that `eslint-plugin-svelte`'s own rule sets
are deliberately not enabled, so a later reader does not "fix" the omission. Say which package.json
gets the two devDependencies (it must be the ROOT one, since the root config runs them; they do not
ship to the scaffold, which is the right answer and worth stating).

### R4. Task 10 hides a behavioral change inside a task named "idiom conformance"

`plan:325-328` folds the `createSectionAction` decision into the same task as import specifiers,
handler typing and header prefixes. Adopting `createSectionAction` in `admin/signups` is not an
idiom swap: `docs/extend/add-a-custom-admin-screen.md:81` describes it as running "the audit and
authentication work `adminAction` does", so the adopt branch changes the route's auth and audit path.
That route is the Plan 1 extension-seam proof (`admin/signups/+page.server.ts:1`) and is driven by
`e2e/custom-screen.spec.ts`. It is also the one item whose input is not yet known, since internals-C
Task 10 has not landed.

Everything else in Task 10 is genuinely mechanical, so one behavioral item is buried among five
mechanical ones and would be reviewed as part of a mechanical diff.

**Correction:** split the `createSectionAction` item into its own step with its own acceptance line,
name `e2e/custom-screen.spec.ts` and `e2e/access-map.spec.ts` as the tests that must stay green, and
require it test-first if the adopt branch is taken. Better: default to the keep-the-raw-shape branch
in chassis-A (which is the no-change option and needs only one comment) and route the adoption to
chassis-B, so an unknown input does not sit inside an executing pass.

### R5. Task 8 is charter-clean and consumer-safe, with two gaps

The direction is right. The trio's removal is leanness, the three retire rulings require exactly
this shape, the four consuming sites get the replacement code in the `Consumers must:` line
(`plan:276-278`), and the deletion is safe: no engine-internal caller exists. Inlining is genuinely
byte-identical at the hast level, since `cardShell` is `h('section', {className}, [h('div',
{className:['card-body']}, body)])` (`rehype-dispatch.ts:30`) and `iconSpan` is
`h('span', {className}, [glyphEl])` (`:22`), both with no branching beyond the `role` ternary. The
`alert` component's output is identical after inlining, provided the inline copy is taken from the
post-internals-C source so the class literal is `cairn-icon`, not `ec-icon`, which the plan does say.

Two gaps. First, the proof artifact is wrong (G4). Second, the acceptance grep at `plan:292`
(`grep -rn "cardShell\|iconSpan" src/lib examples/showcase templates`) is stricter than the file
list looks: the names survive in prose at `examples/showcase/src/chassis/render.ts:4`,
`src/chassis/README.md:104-105` and `src/chassis/tokens.css:17`. All three files are listed for
modification, so the criterion is achievable, but the steps never say the prose mentions go too.

**Correction:** add one line to Step 1: "the three prose mentions of the removed names go with the
code (`chassis/render.ts:4`, `chassis/README.md:104-105`, `chassis/tokens.css:17`); the grep in the
acceptance criterion is what proves it".

### R6. Task 9 ships vitest into every scaffolded site, which is ruled but unpriced

`plan:64-65` records the ruling and `plan:305` leaves `PRUNED_SCRIPTS` alone, so `test:unit`,
`vitest.config.ts`, the test files and a vitest devDependency all reach every scaffolded site. The
spec review's R9 flagged this as an implicit decision; the spec made it explicit; the plan carries
it. That is correct handling. What is missing is the cost sentence: `create-site.yml:115`'s
`npm install` in the scaffolded site now pulls vitest's full transitive tree on every CI run of that
job, and every scaffolded site's first install grows accordingly.

**Correction:** one sentence in the Ruled inputs block acknowledging the install cost, so a later
reader does not treat it as an oversight. No change to the ruling.

### R7. Charter check: no engine scope creep

Every task lands in `examples/showcase`, `templates/waymark`, the emitter and bake scripts, the
repo's own gates, or the docs. The one engine-surface change is a REMOVAL (Task 8), which the charter
favours. Prettier and vitest in the scaffold add opinion to what a developer receives, and both are
defensible under the spec's stated line ("the emitted site is the developer's own repo"; engine gates
never depend on the scaffold's formatter, `plan:47-49`). Nothing in the plan adds an engine
abstraction, actor, subsystem or public export.

---

## Lens 3: Hygiene and sizing

### H1. Two tasks exceed roughly four deliverables

**Task 1** carries: a pinned Prettier config; two package scripts and two devDependencies; a
`.prettierignore` derived from the bake's generated files; a whole-showcase reformat of 68 to 98
files; the four tab-indented files; and two workflow edits. That is six, and the last one is a CI
change in a task otherwise scoped to the showcase.

**Task 6** carries: 13 authored posts; the `ARCHIVE_PAGE_SIZE` change; two stale comment rewrites in
two files; ten new `/archive/2` baselines in the width matrix; the `delivery.md` ordering contract;
and the `sortNewestFirst` removal with two call sites. That is six, and R1 shows the first two also
move twelve existing baselines.

Every other task is one coherent unit a reviewer could reject alone. Task 4 is a single deletion
sweep, Task 5 a pure move, Task 7 a single-source consolidation, Task 8 a single ruled change (large,
but genuinely one change per the rulings), Task 12 records.

**Correction:** split Task 6 into "the corpus and the constant" (the 13 posts, the page size, the two
comment rewrites, the existing baselines regenerated under the visual gate) and "the ordering
contract" (the `sortNewestFirst` removal, `delivery.md`, the `/archive/2` baselines). Leave Task 1
whole but move the two workflow edits into Task 12's records sweep, or accept six and say so at
dispatch. Note that splitting Task 6 makes A a thirteen-task pass, which is the accretion signal the
sizing rule names; option (a) in R1 avoids the split by moving the item out of the pass entirely.

### H2. The 6.5M ceiling is set at the exact number internals-C's observed rate exceeds

`plan:34` sets 6.5M for twelve tasks, which is 0.54M per task. The spec's own reference points
(`spec:198`, and H5 of the spec review) are internals-B at 0.29M per task across 14 and internals-C
at about 0.55M per task across its first four. Twelve tasks at C's rate is 6.6M, so the ceiling is
already under the pessimistic estimate before accounting for the two things that make this pass
heavier: the per-task gate adds the showcase Playwright suite and a from-scratch install
(`plan:82-86`), and two tasks carry explicitly unbounded volume (Task 2's finding count, Task 6's 13
authored posts plus 10 to 22 image baselines, where image reads dominate a budget).

A ceiling the first checkpoint blows forces the 80 per cent combined-question stop for a reason that
was predictable at authoring time, which is the failure the ceiling rule exists to prevent.

**Correction:** raise to 8M, or keep 6.5M and name in the header the four tasks (1, 2, 6, 8) expected
to exceed 0.55M with their split points pre-agreed, so the checkpoint at 4 and 8 has a decision
already made rather than a question to ask.

### H3. Interfaces blocks under-serve the tasks that consume them

Tasks 1, 2, 5, 8 and 9 carry Interfaces blocks; Tasks 3 and 6 say "none new"; Tasks 4, 7, 10, 11 and
12 have none at all, which is fine for tasks nothing downstream consumes.

The one real gap is Task 5. `plan:205-206` produces "`icons` and the component list as named
exports", but never names the second module's export or the module's own final name, and Task 8 then
refers to it obliquely as "the Task 5 module that now holds the `alert` component" (`plan:263`). A
cold Task 8 implementer has to open Task 5's diff to find out what to import.

There is also a naming hazard the plan should catch. `plan:194-195` creates
`examples/showcase/src/theme/components.ts` beside the existing `examples/showcase/src/theme/components/`
directory, which six files import through `$theme/components/…` (`(site)/+layout.svelte:39-40`,
`+error.svelte:16-17`, `(site)/[...path]/+page.svelte:3`, `(site)/preview/[token]/+page.svelte:7`).
A file and a directory sharing the specifier `$theme/components` is ambiguous to a reader and
resolver-order-dependent in practice.

**Correction:** name the module `src/theme/markdown-components.ts` and declare its export in the
Interfaces block by name (for example `export const components = [callout, alert, icon, video,
pullQuote, cta, microCta, faq, banner]`), then have Task 8 cite that name.

### H4. Four acceptance criteria do not match their steps

- **Task 6** (`plan:238-240`): "every existing baseline unchanged" is falsified by the task's own
  steps (G2, R1).
- **Task 7** (`plan:254`): tests only the `[...path=md]` half (G10).
- **Task 9** (`plan:315`): "every pure chassis function has a test" while two of the four functions
  the spec named are theme modules (G3).
- **Task 5** (`plan:212`): "the adapter file is under 200 lines" is a number with no derivation and
  no fallback. The residue after moving the icon set (`cairn.config.ts:18-36`) and the nine
  declarations is plausibly 100 to 130 lines, so the target is probably safe, but the plan should
  say what happens at 210 rather than let a hard number fail a good diff.

### H5. Three steps describe without specifying

- `plan:334`: "enumerate at dispatch (the greps are the plan's anchors)". No greps are given. The
  plan names one bare-specifier example pair and leaves the rest to be discovered. Supply the two
  commands (`grep -rn "from '\$chassis/[a-z-]*'" examples/showcase/src` and the `$theme` twin).
- `plan:344-345`: "the fourteen pass-and-plan citation sites the showcase review lists". The plan
  does not list them; the pointer is section numbers 3.1 to 3.6 in a 400-plus-line review a cold
  implementer must read in full. Either enumerate the fourteen `file:line` sites in the plan (the
  review has them) or make "read `showcase-review-at-the-exemplar-bar.md` sections 3.1 to 3.6" an
  explicit Step 0 with the file path spelled out.
- `plan:159`: "a grep asserting `siteLayoutSentinel` is absent from the scaffolded tree". The
  existing assertion block at `create-site.yml:89-111` is a `node -e` script using `fs.existsSync`;
  a content assertion needs a recursive read, not the same idiom. Say the shape (walk the scaffold,
  assert no file's contents include the string).

### H6. Writing rules

Zero em dashes across the whole plan, verified by grep. No marketing words, no three-item reflex
lists, no "not X but Y" frames. Register is close to the exemplar's. Three sentences carry more than
one idea:

- `plan:52-57`, the archive ruled input, is one paragraph whose second sentence runs 63 words across
  four clauses ("So `ARCHIVE_PAGE_SIZE` becomes 13 and the corpus grows … `/archive/2` exists").
  Split after "the corpus grows from 14 to 27 posts."
- `plan:107-112`, Task 1 Step 1, is a single 70-word sentence that also embeds a two-file reading
  instruction inside a parenthetical. Break it into three: the config and scripts; the ignore file
  and why; the verification.
- `plan:264-280`, Task 8's engine Files list, is one unbroken run of sixteen paths with inline
  parentheticals. It is a list, so it reads as one, but the changelog clause at `:276-278` carries
  four separate obligations inside one parenthesis and should be its own bullet.

### H7. Checkpoint and reconciliation instructions

The reconciliation half is good and better than the exemplar's: `plan:6-9` names both the merge
dependency and the specific item to reconcile (Task 10's conditional against internals-C's Task 10
output), and `plan:32` pins the verification commit with an explicit re-verify instruction.

Two gaps for a cold session. The workflow script name is wrong (G1), which is the first thing such a
session would act on. And `plan:34-35` names the checkpoint interval but not what a checkpoint
writes; the exemplar has the same gap, and the global rule covers it, but here the ceiling is tight
enough (H2) that the checkpoint's spend line is load-bearing. One sentence ("at each checkpoint write
STATUS: task ledger, decisions taken, spend against the ceiling, next task") closes it.

---

## Ranked top eight

1. **G2 with R1.** Task 6 moves at least twelve committed baselines (ten `site-home-*` because
   `(site)/+page.svelte:161` reveals a pagination block once `totalPages > 1`, plus two
   `admin-office-*` because `admin-visual.spec.ts:14-22` screenshots the posts list), while the plan
   asserts at `plan:54`, `plan:78-79` and `plan:239` that no existing baseline changes and instructs
   the implementer to stop if one does. The task is unexecutable as written, and no
   baseline-regeneration mechanism is named. Move it to chassis-B, or pay for it with the enumerated
   baselines, the CI regen dispatch and a `visual-verifier` grade.
2. **G1.** The plan's execution line names `pass-execute-chains.js`, which does not exist. Only
   `~/.claude/workflows/pass-execute.js` does. A cold session fails on the first instruction.
3. **R3.** Task 2's "`eslint-plugin-svelte`'s recommended flat config" carries its own
   `files: ['**/*.svelte']` and a full a11y rule set. Spread verbatim it reaches
   `src/lib/components`, contradicting the task's own acceptance line, and it turns a comment gate
   into an unbounded behavioral-fix task. Wire the parser plus the four existing comment rules,
   scoped explicitly.
4. **G3 with G4.** Task 9 names a directory that does not exist (`src/chassis/islands/`) and drops
   two of the spec's four named functions because they live in `$theme`; Tasks 5 and 8 both name
   `render-pipeline-snapshot.test.ts` as their byte-identity proof, and that file uses its own
   fixture registry "with no consumer dependency", so it cannot detect either change.
5. **R2.** Task 1 asserts a whole-tree Svelte and CSS rewrap changes no baseline, with no procedure
   if it does, formats `src/**/*.css` (including the `prose.css` internals-C just renamed) inside a
   gate-sensitive commit, and pins `format`'s target set without pinning `format:check`'s.
6. **G5 with G6 and G7.** Three items cite an input and then contradict or under-specify it: the
   header prefix inverts showcase review 3.4's "drop from all eight" (and miscounts 10 modules as
   12); Task 6 writes 13 posts to a content guide that does not exist; Task 11's `theme.css` item
   omits the `:191-225` anchor, so the nearest reading is the re-skin recipe the file exists for.
7. **H2 with H1.** 6.5M over twelve tasks is 0.54M each, below internals-C's observed 0.55M for a
   gate that adds the Playwright suite and a from-scratch install per task, with two tasks of
   unbounded volume. Tasks 1 and 6 are each six deliverables, and splitting Task 6 makes it a
   thirteen-task pass.
8. **R4 with G10 and H3.** Task 10 buries an auth-and-audit change (`createSectionAction` in the
   extension-seam proof route) among five mechanical items; Task 7's acceptance criterion tests only
   half of what its steps do; Task 5 creates `src/theme/components.ts` beside the existing
   `src/theme/components/` directory six files import through, and never names the export Task 8
   consumes.

---

## Verdict

The plan is a good plan with one item that has to move and a handful of anchors that have to be
fixed, and it should not go to the approval gate until item 1 above is settled. Its structural
instincts are right: it inherited every ratified decision from the revised spec faithfully, it
enumerates the render trio's blast radius correctly (all four engine test files, both reference
pages, the allowlist in the right gate, the `/render` type-only survival), it states the
`templates/waymark` re-emit as a per-task obligation rather than a parallelism claim, it puts the
reformat first and labels it mechanical, and its reconciliation instruction is more specific than
the exemplar's. The grounding is largely sound: fourteen of the twenty anchors I opened check out
exactly, including the two the spec review got wrong, and all four new dependencies exist at
peer-compatible versions. But Task 6 encodes a contradiction the spec review flagged in a different
form and the spec fixed only halfway: the archive proof cannot be done without moving the home page,
and the plan simultaneously requires it and forbids it. That is a decision, not a detail, and an
implementer meeting it mid-pass stops and asks. Fix that first (moving the item to chassis-B is the
cheaper answer and also removes the double-write of the same ten baselines), then the script name,
the parser scoping, the four wrong paths and the three contradicted inputs, then re-size the ceiling
or pre-agree the split points. That is one focused revision pass over the plan, not a re-authoring,
and the result is ready for the gate.
