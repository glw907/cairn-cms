# Round-2 verification: the chassis-A plan review fold

Read-only. Verified against `main` at `89c98101`, the post-fold state. Every anchor below was
opened or grepped, not inferred. The plan is
`docs/superpowers/plans/2026-09-04-chassis-a-pass.md`, the spec is
`docs/superpowers/specs/2026-09-04-chassis-passes-design.md`, and the banked review is
`docs/internal/record/2026-09-04-chassis-inputs/plan-review.md`.

Headline: the fold is substantially complete and several of its departures from the reviewer's
proposals are better than the proposals. Three defects remain. One is a new grounding error the
fold introduced. One is a plan-versus-spec numbering disagreement the fold created. One is a
stale ceiling in `docs/STATUS.md`.

---

## 1. Finding by finding

### The ranked top eight

**Rank 1 (G2 with R1), the archive task. FOLDED.**
The fold took the reviewer's option (a) and moved the item whole.
`plan:23-26`: "**Rendered output does not change in this pass.** Every output-changing item is
chassis-B's, including the archive proof (review fold: proving pagination reveals the home
page's pagination block and moves at least twelve committed baselines, so it moved to B with
the entry-row extraction)."
`plan:456-459` hands it forward by name, including "the `admin-office-*` regenerated".
`spec:102`: "Proving it reveals the home page's pagination block and moves at least twelve
committed baselines, so it executes in chassis-B (plan review, 2026-09-04)."
`spec:222-228` is now B item 4, "The archive proven and the entry row once", carrying the
pagination block, `/archive/2`, and the `admin-office-*` regeneration.
The global stop rule survives intact at `plan:98-99` and is now consistent with the task list.
The non-visual halves are correctly retained: `sortNewestFirst` at `plan:381-384` in Task 10,
the two 220-post comments at `plan:407-409` in Task 11. Both are genuinely output-neutral.

**Rank 2 (G1), the workflow script name. CORRECTLY REJECTED, and the reviewer was wrong.**
`plan:5` still reads "`~/.claude/workflows/pass-execute-chains.js` with ONE chain (the pass is
sequential; see Execution)". The file exists: `ls ~/.claude/workflows/` returns
`pass-execute-chains.js` and `pass-execute.js`, and a `pass-execute-chains` skill is registered
in this session. The reviewer's G1 premise was false. Keeping the name is defensible, and the
added parenthetical answers the ambiguity the reviewer's second sentence raised. One residual:
the script's own header says it was written "for the cairn internals-B pass: five mutually
independent chains run in parallel, each in its own git worktree". Running it with one chain in
one worktree is a use it supports but has not been proven at. See section 4.

**Rank 3 (R3), the Svelte lint scoping. FOLDED, in full.**
`plan:59-66` is now a Ruled input: "**The Svelte lint half wires a parser, not a rule set.** One
`eslint.config.js` block with explicit `files: ['examples/showcase/src/**/*.svelte']`,
`svelte-eslint-parser` with `parserOptions.parser: tseslint.parser`, and the same four comment
rules the `.ts` block carries ... `eslint-plugin-svelte`'s own rule sets are deliberately not
enabled (they are a11y and reactivity rules, not a comment gate, and their `files` glob would
reach `src/lib/components`). Both devDependencies go in the ROOT `package.json`."
`plan:179-181` adds the before-and-after file-count check, and `plan:190-192` accepts on
"`eslint src/lib` lints the same file set as before; no `eslint-plugin-svelte` rule is enabled".
Every element the reviewer asked for is present.

**Rank 4 (G3 with G4), Task 9's paths and the byte-identity proofs. FOLDED.**
`plan:348-350` now names `examples/showcase/src/chassis/archive.test.ts`,
`src/chassis/date.test.ts`, `src/theme/islands/banner-expiry.test.ts`, and
`src/theme/components/admin-link.test.ts`, "each co-located with its module". The nonexistent
`src/chassis/islands/` is gone.
`plan:363-365` restates the criterion as "every pure function the spec names
(`paginateArchive`, `formatDate`, `isBannerExpired`, `isAdminHref`) has a co-located test, in
`$chassis` or `$theme` as it lives".
For G4, `plan:79-82` rules the snapshot decision the reviewer preferred: "The engine's
render-pipeline snapshot test keeps its byte-identical lock by carrying local fixture copies of
the three helpers beside its `fixtureHead` (it imports them from the internal path today and
never touches the showcase, so it cannot prove either showcase change)."
The real proofs are now named per task: `plan:264-266` diffs the styleguide HTML for Task 6,
`plan:331-333` diffs the `alert` and `icon` directives for Task 8.

**Rank 5 (R2), the reformat's blast radius. FOLDED, with one new defect.**
`plan:113-116` pins one set: "scripts `format` and `format:check` sharing ONE target set written
once, `src/**/*.{ts,js,svelte} e2e/**/*.ts *.ts *.js`, with `format:check` never wider than
`format`".
`plan:51-58` excludes CSS with the reason: "the CSS half (`src/chassis/*.css`,
`src/theme/*.css`) rides chassis-B, after internals-C's `prose.css` rename settles and because
`check:public-tokens` and `check:chassis-boundary` read those files."
`plan:125-133` replaces the flat assertion with a procedure: run the visual suite before,
reformat, run it after, and "If any committed baseline moves, stop and report with the file ...
the offending markup gets a `prettier-ignore` line rather than a baseline regeneration."
The new defect is in the pinned set itself. See section 3.

**Rank 6 (G5, G6, G7), the three contradicted inputs. ALL THREE FOLDED.**
G5: `plan:67-69` rules "**The `// cairn-cms:` header prefix is dropped, not spread** (review 3.4:
the prefix carries no information inside a file that lives in a cairn site; the leanness test
favours removal). Eight showcase modules carry it today; after this pass none does."
`spec:184-186` matches. The count is now correct and the direction follows the review and the
charter's leanness test. Verified below.
G6: the content guide is gone from the plan's constraints. `plan:458` routes it to B as "the
posts written under the site content method since the showcase has no content guide of its
own", and `spec:223` matches.
G7: `plan:402-405` now carries the anchor, the keep, and the destination: "the type-scale
derivation at `src/theme/theme.css:191-225` (keep about five lines carrying the two facts a
re-skinner needs; move the derivation to `docs/internal/public-design-system.md`; the file's
:1-40 header is the re-skin recipe and stays)."

**Rank 7 (H2 with H1), the ceiling and task sizing. FOLDED in the plan and spec, MISSED in STATUS.**
`plan:39-41`: "**Token ceiling:** 7.5M (12 tasks; a heavier gate than internals-C's, two tasks
with unbounded finding volume; review fold: 6.5M sat at the observed per-task rate)."
`spec:203-205` matches at 7.5M.
`docs/STATUS.md:62` still reads "12 sequential tasks, ceiling 6.5M". STATUS is read in full at
session start and is the resume pointer, so it is the document a cold session trusts first.
For H1's sizing half, Task 1 shed the two workflow edits and the generated-file ignore entries
into a new Task 2 ("The scaffold's format check"), and Task 6 left the pass. Task 1 now carries
config, ignore file, two scripts, two devDependencies, the reformat, and the tab fixes, with the
tab fixes falling out of the reformat rather than being separate work. That is at or just under
the four-deliverable line. The pass stays at twelve tasks without the accretion the reviewer
warned a Task 6 split would cause.

**Rank 8 (R4, G10, H3), the three buried items. ALL THREE FOLDED.**
R4: `plan:70-74` rules "**`createSectionAction` stays unadopted in this pass.**" with the auth
and audit reasoning and the unknown input named. `plan:376-379` reduces Task 10's item to one
recording comment, `plan:388-389` keeps `e2e/custom-screen.spec.ts` and `e2e/access-map.spec.ts`
green as a step, and `plan:394` accepts on "the `createSectionAction` comment present". The fold
took the reviewer's own "Better:" branch, which is the no-change option.
G10: `plan:279-282` adds the `siteMeta` export and routes both feeds through it. `plan:293-295`
accepts on "`siteConfig.siteName` and the site description are composed for the feeds in exactly
one place; the `.md` outputs and both feed bodies byte-identical before and after".
H3: `plan:245-249` renames the module and states why: "`examples/showcase/src/theme/markdown-components.ts`
(the nine `defineComponent` declarations; NOT `components.ts`, which would share the
`$theme/components` specifier with the existing `src/theme/components/` directory six files
import through)". `plan:258-262` declares the export by name, and `plan:327` has Task 8 consume
it.

### The lettered findings

| Finding | Verdict | Evidence |
|---|---|---|
| G1 workflow script | REJECTED, correctly | `plan:5` keeps `pass-execute-chains.js`; the file and the skill both exist |
| G2 archive arithmetic and baselines | FOLDED | `plan:23-26`, `plan:456-459`, `spec:102` |
| G3 Task 9 paths | FOLDED | `plan:348-350`, `plan:363-365` |
| G4 wrong byte-identity artifact | FOLDED | `plan:79-82`, `plan:264-266`, `plan:331-333` |
| G5 header prefix | FOLDED | `plan:67-69`, `plan:391-393`, `spec:184-186` |
| G6 content guide | FOLDED | removed from constraints; `plan:458`, `spec:223` |
| G7 theme.css anchor | FOLDED | `plan:402-405` |
| G8 scaffold doc row | FOLDED | `plan:229-232` cites `:131` and rewrites the row's claim |
| G9 bake paths and both-trees verification | FOLDED | `plan:144-147`, `plan:155-158` |
| G10 feed metadata | FOLDED | `plan:279-282`, `plan:293-295` |
| G11 render.md pre-C anchors | FOLDED | `plan:316-317` "re-anchor at dispatch"; `plan:36-37` repeats it |
| G12 verified anchors | PARTIAL | all preserved; `reference-coverage.test.ts:403` is still listed for modification though G12 recorded it as needing none |
| R1 output-changing work | FOLDED | option (a) taken; see rank 1 |
| R2 reformat risk | PARTIAL | procedure and CSS exclusion folded; the pinned set is not scaffold-safe (section 3) |
| R3 Svelte lint scope | FOLDED | `plan:59-66` |
| R4 createSectionAction | FOLDED | `plan:70-74` |
| R5 Task 8 prose mentions | FOLDED | `plan:300-307` names `render.ts:4`, `README.md:102-105`, `tokens.css:17` |
| R6 vitest install cost | MISSED | `plan:84-85` records the ruling with no cost sentence. The reviewer asked for one sentence and no change to the ruling. Cosmetic |
| R7 charter check | n/a | no action was required; still true, the one engine change is a removal |
| H1 task sizing | FOLDED | Task 1 slimmed, Task 6 removed, twelve tasks held |
| H2 ceiling | PARTIAL | 7.5M in plan and spec, 6.5M still in `docs/STATUS.md:62` |
| H3 Interfaces gap | FOLDED | `plan:258-262`, `plan:327` |
| H4 four mismatched criteria | FOLDED | Task 6 at `plan:269-272` adds "expected 100 to 130 lines; a larger residue is reported, not forced"; Task 7 and Task 9 covered above; the old Task 6 criterion left with the task |
| H5 three under-specified steps | FOLDED | `plan:371-373` supplies both greps; `plan:411-413` makes reading the review an explicit Step 0 with the path; `plan:205-208` states the recursive content-read shape |
| H6 writing rules | PARTIAL | zero em dashes in both documents, verified by grep; the archive paragraph and Task 1 Step 1 were rewritten; Task 8's changelog clause is still four obligations inside one parenthesis at `plan:320-322` |
| H7 checkpoint instruction | PARTIAL | the reconciliation half stands at `plan:6-9` and `plan:36-37`; the plan still never says what a checkpoint writes |

### Where the fold chose differently, judged on its own terms

Three departures, all defensible.

**Dropping the header prefix rather than adding it.** The evidence supports the drop. The prefix
appears in exactly eight showcase modules, and it is a provenance marker inside a tree that is
by definition cairn's own. The charter's leanness test ("prefer the leanest seam", "out of scope
is a valid answer") favours removing a marker that carries no information at its site. The
engine's own `src/lib` files keep it, for example `src/lib/render/authoring.ts:1`, which is
consistent: there the prefix distinguishes engine source inside a consumer's `node_modules`.

**Moving the archive proof to chassis-B rather than paying for it in A.** This is the reviewer's
own preferred option, and it is the cheaper one. It also removes the double-write of ten
`site-home-*` baselines that the spec review's H1 objected to, since B item 4 regenerates the
same set for the entry-row extraction. The split of visual from non-visual halves is clean: the
`sortNewestFirst` removal, the `delivery.md` contract, and the two 220-post comments genuinely
change no output, and `docs/reference/delivery.md` still documents no ordering, so Task 10's doc
obligation is real.

**Keeping `createSectionAction` unadopted in A.** Defensible and charter-aligned. The route is
the Plan 1 extension-seam proof, adoption changes its auth and audit path, and the deciding
input is internals-C Task 10's ruling, which has not landed. Deferring behavioral work with an
unlanded input out of an executing pass is exactly the process rule. The plan keeps the door
open conditionally at `plan:461` and `spec:242-243`.

---

## 2. Plan and spec agreement

**Task numbering: they disagree, and the disagreement is new.** This is the fold's own
regression.

Before the fold (`9d893e34`), plan and spec agreed slot for slot. After the fold they do not.
The plan re-slotted "The scaffold's format check" to Task 2 and pushed the comment gate,
fixtures, dead code, and the config split down one. The spec left slots 2 through 5 alone and
dropped the format check into the vacated slot 6.

| Slot | Plan | Spec |
|---|---|---|
| 1 | The Prettier reformat and the tab fixes | The Prettier reformat and the tab fixes |
| 2 | The scaffold's format check | The comment gate reaches the showcase |
| 3 | The comment gate reaches the showcase | Fixtures out of the scaffold |
| 4 | Fixtures out of the scaffold | Dead code out |
| 5 | Dead code out | `cairn.config.ts` split |
| 6 | `cairn.config.ts` split | The scaffold's format check |
| 7 to 12 | agree | agree |

Two spec cross-references now point at the wrong plan task.
`spec:197`: "The `.ts` half is gate-enforced after task 2." The plan's Task 2 is the format
check; the comment gate is Task 3.
`spec:179`: "covering the chassis's pure logic (`paginateArchive`, `formatDate`,
`isBannerExpired`, `isAdminHref`, and what task 5 exposes)." The plan's Task 5 is the dead-code
sweep; the config split that exposes new pure functions is Task 6. The plan's own Task 9 says
"a test per pure function Task 6 exposed" (`plan:350`), which is internally right and externally
in conflict with the spec.
`spec:170` ("Its non-visual halves ride task 10") does agree with the plan.

The plan's ordering is the better one: the format check belongs immediately after the reformat
that creates the scripts, not five tasks later. The fix is to renumber the spec's list to match
the plan and repair the two cross-references, not the reverse.

**Everything else the fold touched agrees.**

- Ceiling: `plan:39` and `spec:203` both read 7.5M, both with the same reasoning. `docs/STATUS.md:62`
  is stale at 6.5M.
- Checkpoints: `plan:40-41` and `spec:204` both say 4, 8, 12.
- What chassis-B carries: `plan:456-462` and `spec:215-249` agree on the archive proof, the entry
  row, the CSS format half, the twenty focus rings, the shell and primitives, site identity, CSS
  conformance, the width matrix, `createSectionAction`, waymark's adaptation, and the harvest.
  The plan adds "the 20 remaining focus rings" and the spec's item 3 says the same. No item is in
  one list and absent from the other.
- Header-prefix ruling: `plan:67-69` and `spec:184-186` agree on drop, on eight modules, and on
  citing review 3.4.
- CSS format half: `plan:51-55` and `spec:146` agree it rides chassis-B, and `spec:242` lists it
  under B item 8. Consistent in three places.
- Render trio shape: `plan:75-83` and `spec:108-124` agree, including the type-only `/render`
  survival and the allowlist's home.

**The archive decision paragraph versus its execution home: PARTIAL.** `spec:95-102` keeps the
whole ratified paragraph and appends the move sentence. That is the right structure, since the
arithmetic is a ratified decision B will execute. But the paragraph's body was not corrected for
what the review proved. `spec:99` still asserts "page one keeps 13 entries (the tag filter and
the home baseline are unchanged)". The home baseline is not unchanged, which is the entire reason
the item moved, and `spec:224` two paragraphs later says B baselines "the home page's pagination
block". The spec contradicts itself in the same document. The parenthetical should read that the
tag filter is unchanged and the home baseline moves because the pagination block appears.

---

## 3. New grounding errors introduced by the fold

**One real defect, in the pinned target set.**

`plan:115` pins `src/**/*.{ts,js,svelte} e2e/**/*.ts *.ts *.js` for both `format` and
`format:check`, and `plan:113-114` ships both scripts in the showcase `package.json`, which the
bake emits into every scaffold. `examples/showcase/.cairn-template.json` excludes `e2e`, and
`templates/waymark/e2e` does not exist. Prettier 3 treats a pattern that matches no files as an
error, printing "No files matching the pattern were found" and exiting non-zero, unless
`--no-error-on-unmatched-pattern` is passed. So the emitted `format:check` fails in the scaffold
on the `e2e/**/*.ts` term alone. Task 2's acceptance criterion, "`format:check` green inside
both trees" (`plan:161`), cannot be met as written. The implementer will discover this and have
to invent a fix mid-task. Name the fix in the plan: either add
`--no-error-on-unmatched-pattern`, or drop the explicit globs and use `prettier --write .` and
`prettier --check .` with `.prettierignore` carrying the CSS exclusion and the generated files,
which is also a cleaner reading of "ONE target set written once".

**Everything else the fold added checks out.**

- `src/theme/markdown-components.ts` is a free name. `examples/showcase/src/theme/` holds
  `components/` as a directory and no `components.ts`, so the collision the plan avoids is real.
- The nine declarations carry exactly the names the plan lists. `grep -n defineComponent
  examples/showcase/src/theme/cairn.config.ts` returns, in order, `callout` (:37), `alert` (:94),
  `icon` (:131), `video` (:160), `pullQuote` (:200), `cta` (:226), `microCta` (:253), `faq`
  (:281), `banner` (:312). The plan's list at `plan:259` matches exactly, in order.
- `examples/showcase/src/theme/components/admin-link.ts:9` is
  `export function isAdminHref(href: string): boolean`. Correct.
- The banner island is `examples/showcase/src/theme/islands/banner-expiry.ts`, a TypeScript
  module imported as `$theme/islands/banner-expiry.js` at `cairn.config.ts:10`. The plan's
  `src/theme/islands/banner-expiry.test.ts` sits correctly beside it. The review's claim of a
  `.js` file on disk was wrong; the plan is right.
- `grep -rln "^// cairn-cms:" examples/showcase/src` returns exactly 8 files:
  `src/chassis/dev-gate.ts`, `src/chassis/feed.ts`, `src/members/capture-transport.ts`,
  `src/members/challenge-token.ts`, `src/members/channel.ts`, `src/members/dev-wiring.ts`,
  `src/routes/members/login/+page.server.ts`, `src/routes/members/+page.server.ts`. The plan's
  "eight" is correct. Note six of the eight live under template-excluded paths (`src/members`,
  `src/routes/members`), which strengthens the drop ruling rather than weakening it.
- `create-site.yml:50` is
  `node scripts/bake-template.mjs --to template --engine-spec "^$VERSION" --dev-spec "^$VERSION"`.
  Correct. One nuance the plan glosses: the job runs it with `working-directory:
  packages/create-cairn-site` and `--to template`, while `plan:156-157` writes it as
  `node packages/create-cairn-site/scripts/bake-template.mjs --to <tmp>` and calls that "the exact
  command". Same script, different cwd and destination. Harmless, worth one word.
- `bake-template.mjs:192-197` holds the package.json write (:192), `README.md` from `SITE_README`
  (:193), and `scripts/dev.mjs` from `DEV_SHIM` (:195-197). Correct.
- `emit-template.mjs:141-145` is the rewritten `package.json`. Correct.
- `emit-template-dir.mjs:47-79` covers `applyOverlay` (:47-67) and `composeTemplate` (:74-79).
  Correct as a mechanism anchor. The three overlay files the plan names do exist:
  `packages/create-cairn-site/template-repo/` holds `.dev.vars.example`, `.gitignore`, `LICENSE`,
  and `README.md`, and `OVERLAY_MERGE_RULES` at `:38` is `{ '.gitignore': 'append' }`, which is
  the "appended `.gitignore`" the plan claims.
- `~/.claude/workflows/pass-execute-chains.js` exists, and a `pass-execute-chains` skill is
  registered. The name is right.
- The Task 1 set does not sweep CSS. `src/**/*.{ts,js,svelte}` cannot match `.css`, and the four
  CSS files the plan lists (`src/chassis/prose.css`, `tokens.css`, `composition.css`,
  `src/theme/theme.css`, `site.css`) are all outside it. Correct.
- `format:check` is equal to `format`, not narrower, because the plan mandates one shared set.
  That satisfies R2's third mechanism. The mechanism for actually sharing one literal between two
  npm scripts is not specified; see section 4.

**Anchors re-verified after the fold moved them.** All correct unless noted.
`what-the-scaffold-wrote.md:67` is the `probe-craft/` tree line, `:131` is the `components/` row,
`:153` is the `probe-craft/` public-routes row. `theme.css:191` opens the type-scale narrative
and `:224` closes it, with `:225` the first declaration, so `191-225` is right to within one
line. `theme.css:1-3` is the re-skin recipe header, so the "stays" clause is warranted.
`chassis/README.md:104-105` carries the `iconSpan` prose and `:190` is the `render.ts` removal-table
row. `tokens.css:17` names `cardShell`/`headRow`. `archive.ts:7-9` is the 220-post comment and
`:26-29` is `sortNewestFirst`. `svelte.config.js:39-46` is the second 220-post comment.
`public-routes.ts:11-25` is the nine-field literal. `[...path=md]/+server.ts:13-21` is the
seven-field retype. `feed.xml/+server.ts:11-13` and `feed.json/+server.ts:11-13` are the metadata
literals. `eslint.config.js:33` is `COMMENT_GLOBS`. `package.json:67` is `"lint": "eslint src/lib"`.
`check-comments.sh:9` is the bare `eslint src/lib`. `admin/signups/+page.server.ts:32` is the
`fail` literal. `test/last-commit/+server.ts:9` is `export async function GET()`.
`archive/[page]/+page.server.ts:25` is the `throw error(404, 'Not found')`.
`rehype-dispatch.ts:20,29,39` are `iconSpan`, `cardShell`, `headRow`. `authoring.ts:9` is the
barrel line. `index.ts:106` is the comment. `render-pipeline-snapshot.test.ts:26` is `fixtureHead`,
with the trio imported at `:8-16`. `core.md:696` opens the trio paragraph, though the code block
runs to `:712` and the plan cites `:696-709`. `configure-rendering.md:49,57-58,84-85` all land.
`content-index.ts:139-140` is the newest-first sort. `wrangler.jsonc:44` and `:55` are exactly the
exclude markers. The initiative design's item 6 is `:109-115` and the publish ruling `:117-121`.
`cairn.config.ts` is 526 lines with `$theme` self-imports at `:9-10`; the icon set runs `:18-35`
and the plan says `:18-36`, one blank line over.

Two small anchor drifts, both harmless: `e2e/preview.spec.ts` asserts `cairn-showcase-site-layout`
at `:246` and `:248`, while `plan:210-212` cites `:245-247`. And `plan:315` still lists
`reference-coverage.test.ts:403` for modification, which is the synthetic fixture G12 recorded as
needing no edit.

---

## 4. What a cold implementer would still have to invent

1. **How to write one target set once in `package.json`.** `plan:113-116` mandates it. npm scripts
   have no variable mechanism, so the implementer must choose between duplicating the literal,
   chaining `format:check` off `format`, or moving the set into `.prettierignore` and using
   `prettier .`. The `e2e` defect above makes the third option the right one, so saying it in the
   plan solves both.
2. **Which error idiom is canonical.** `plan:375` asks for "one `error(404, ...)` idiom across the
   tree" without naming it. The showcase writes `throw error(404, 'Not found')` at
   `(site)/archive/[page]/+page.server.ts:25`. SvelteKit 2 idiom is a bare `error(404, ...)`. The
   plan should name the target.
3. **Whether `SITE_DESCRIPTION` and `ORIGIN` survive Task 7.** `plan:279-282` adds a `siteMeta`
   export to `$chassis/content.ts` but does not say whether the existing named constants stay.
   They have other importers, including `public-routes.ts` and `[...path=md]/+server.ts`. Leaving
   both forms is the duplication the task exists to remove; removing them widens the task. One
   sentence settles it.
4. **Whether `eslint-plugin-svelte` is installed at all.** `plan:65` says "Both devDependencies go
   in the ROOT `package.json`", while `plan:169-172` says the plugin goes in "only if the parser
   package requires it as a peer, otherwise the parser alone". The two are in tension inside one
   plan. The correct answer is the parser alone, since no plugin rule is enabled.
5. **What a checkpoint writes.** `plan:40-41` names the interval and not the content. The global
   rule covers it, and the reviewer's one-sentence fix is still worth taking given the ceiling.
6. **How the single chain is defined for `pass-execute-chains.js`.** The script is written around
   parallel chains in per-chain worktrees. The plan says one chain in `.claude/worktrees/chassis-a`.
   The implementer must read the script to learn the chain-definition shape. Acceptable, and one
   sentence in the header would remove the read.
7. **The harvest document's filename.** `plan:433-435` banks it "under
   `docs/internal/record/2026-09-04-chassis-inputs/`" with no name.

Minor incoherence worth one edit: Task 8's acceptance grep at `plan:339-341` searches
`src/lib examples/showcase templates` and then excuses "the snapshot test's fixture block", which
lives in `src/tests` and is outside the search. The same line says `headRow` "resolves only to the
chassis", but the emitted copy under `templates/waymark` will also carry it, which the grep does
search.

---

## Verdict

**Not yet ready for dispatch. Four corrections owed, three of them one-line edits.**

1. **Fix the pinned Prettier target set so the emitted `format:check` can pass.** `e2e/**/*.ts`
   matches nothing in a scaffold, and Prettier 3 errors on an unmatched pattern. Either add
   `--no-error-on-unmatched-pattern` or move the set into `.prettierignore` and run `prettier .`.
   This is the only blocker that would stop a task mid-flight.
2. **Renumber the spec's chassis-A task list to match the plan**, and repair `spec:197` ("after
   task 2", now task 3) and `spec:179` ("what task 5 exposes", now task 6). The plan's order is
   the correct one.
3. **Correct `spec:99`.** The home baseline is not unchanged, and `spec:224` already says so.
4. **Update `docs/STATUS.md:62` from 6.5M to 7.5M.**

Optional, all cosmetic: the R6 install-cost sentence, the H7 checkpoint sentence, splitting Task
8's changelog clause out of its parenthesis, the `reference-coverage.test.ts:403` note, and the
seven invention gaps in section 4, of which items 1 through 4 are worth taking because each
removes a decision from the implementer.

The fold itself is strong. It took every substantive finding, it took the cheaper of the
reviewer's two options on the one blocking item, it correctly rejected the reviewer's single
false finding, and it improved on the reviewer's proposal in at least one place by re-slotting
the format check to Task 2 rather than parking the workflow edits in Task 12. With the four
corrections above, the plan is ready for dispatch after internals-C merges.
