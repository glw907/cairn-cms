# Plan review, domain-risk lens: draft docs stage 2a

Target: `docs/superpowers/plans/2026-09-30-draft-docs-stage-2a.md` at `f3a013d7`. Lens: what
could ship wrong from a docs-rebuild pass on a published library with four consumer sites, plus
over-ceremony ranked by cost. Every claim below was checked against the tree at `f3a013d7` or
the dotfiles runner at HEAD; line numbers are cited.

**Counts:** 0 blockers, 6 majors, 9 minors. No owner forks: each finding has one correct answer.

## Majors

### PR-1 (major): the walker's "member of a named type" skips the adapter's inline objects

**Location:** plan:233-239 (walker), plan:258-264 (acceptance).

**Defect:** `CairnAdapter.editor` and `CairnAdapter.rendering` are inline anonymous object types
(`src/lib/content/types.ts:249` `rendering: {`, `:277` `editor?: {`), not named types. A walker
built to the letter ("a member of a named type", "keyed by its declaring type") never lists
their direct members, and those are some of the adapter's core options. The acceptance fixture
cannot catch this: it plants the new member "inside a nested named type" under `editor`, so a
walk that skips the inline level still reaches it and passes. The plan also names no behavior
for the other type shapes the real roots use:

- a generic constraint: `defineAdapter<const A extends CairnAdapter>`
  (`src/lib/content/adapter.ts:28`), and likewise `defineConcept` and `defineAccess`;
- an index signature: `content: Record<string, ConceptConfig>`;
- an inline parameter: `defineRegistry({ components }: { components: ComponentDef[] })`
  (`src/lib/render/registry.ts:165`);
- arrays, unions, and mapped types such as `Partial`, `Omit`, and `Pick`.

Each of these can be dropped silently, which is the under-reporting failure review focus 2
names.

**Fold:** in task 2's outcomes, key an inline anonymous member by the path from its nearest
named ancestor (`CairnAdapter.editor.<member>`). Walk through generic constraints, index
signatures, and array elements to the named type they carry. Report any member whose type the
walker cannot resolve as a gate failure, never skip it. Add two acceptance fixtures: a member
planted directly on the inline `editor` object, and one reached only through a generic
constraint.

### PR-2 (major): task 9 restores the `close` rearms, which the outline keys to 2b

**Location:** plan:434-438 (task 9), plan:358-359 (task 5 retag), plan:451-452 (task 10
changelog).

**Defect:** the outline tags all seven `restoredBy: "close"` rearms `batch: "2b"`: two for
`skills/cairn-extend/SKILL.md`, one for `docs/internal/docs-register.md`, and four for
`docs/internal/briefs/README.md` (`jq '.rearms[] | select(.restoredBy=="close")'`). Their own
action text reads "Decide at arm close", and the extend arm closes at 2b, when the outline is
deleted. Task 5 retags every 2b-keyed entry `"2b"`, so this batch included. Task 9 then restores
"every relink entry the outline keys to … `close`". The plan contradicts itself here, and an
executor told to "stop and report" on disagreement will stop.

The cost falls on consumers. Restoring the skill's per-pattern recipe rows at 2a, with 11 of 25
pages on disk, ships a skill change and a `Consumers must: re-run npx cairn-guidance install`.
2b likely changes the skill again. That makes two re-installs for four sites where the
changelog's batching rule wants one.

**Fold:** task 9 restores only rearms keyed to a pilot or 2a page, and the `close` entries stay
`2b`. Task 10's conditional `Consumers must:` line becomes a guard: if `skills/` changed in this
pass, the line is required, and the diff-reviewer checks it. That catches an accidental skill
edit from a relink without planning one.

### PR-3 (major): the 12 filed code defects never reach the pages that cover them

**Location:** plan:40-48 (sweep), plan:162-163 (the page documents the code as it is),
plan:376-385 (task 6).

**Defect:** the sweep sent 12 code defects to `main`'s friction log (`bd8ab1fe`) and filed them
"never into a fact". The page chain's inputs are facts, the outline, and map rows, so no
page-inputs agent sees a defect. Three defects sit squarely on 2a pages' `covers` and `job`
(checked with `jq` over the outline):

- **The feed.** `templates/waymark/src/chassis/feed.ts:20` ships `::include` as literal text,
  and `feed.ts:13-20` emits root-relative media URLs. This affects `what-the-scaffold-wrote` and
  `design-your-site`, both of which cover the feed.
- **The health route.** Comments name `GET /admin/healthz`, which no engine view serves. This
  affects `what-the-scaffold-wrote` and `rotate-the-github-app-key`, both of which cover
  healthz.
- **Media seeding.** `cairn-media-seed` ignores `assets.publicBase`. This affects
  `design-your-site`, which covers media-seed.

A drafter working from verified facts about the happy path can write "the scaffold's feed
renders your posts" with no limitation. The fact read passes it, because the claim is cited.
The page then ships documenting behavior the code does not honor. That is the lens's first
named risk.

**Fold:** zero new machinery. The runner already takes `extraChecks`, "a sentence the fact read
must also verify" (`docs-page-chain.js:53`). For each defect whose surface a pilot or 2a page
covers, the task 6 or task 8 dispatch adds one `extraChecks` line to that page: "The page claims
nothing the friction entry <quote> contradicts; where it describes <behavior>, it states the
limitation as a filed `[verified]` fact." The plan lists the defect-to-page pairs in a
three-row table.

### PR-4 (major): figures on three pilot pages have no producer

**Location:** plan:380-381 (task 6: "a figure made through the `cairn-figure` skill").

**Defect:** the runner gives the drafter only the figure note
(`docs-page-chain.js:598`). The drafter's definition says "nothing may depend on a skill
invocation", and its prompt contains no figure-production instruction; `grep -i figure` over
`cairn-docs-drafter.md` returns nothing. The figure-verifier then reads a page whose figure is
either improvised outside the `cairn-figure` method or absent. It returns `fix`, and the page
either spends its one redraft round or escalates. That is three of six pilot pages
(`architecture`, `add-a-custom-admin-screen`, `sign-in-through-your-organization`). The result
inflates the pilot's per-page rate and cross-regression count, the numbers task 7 asks Geoff to
decide on. If the conductor produces figures outside the workflow instead, their cost is
missing from `spent`.

**Fold:** in task 3's outcomes, a figure page's drafter prompt names the path of the
`cairn-figure` skill file as a file to read and follow. That is a file read, which the drafter
definition permits. The acceptance dry run shows that path in a figure page's drafter prompt.

### PR-5 (major): the pilot's cost measurement cannot produce what task 7 reports

**Location:** plan:131-133 (counting rule), plan:397-400 (task 7, FV-11), plan:123 (task 8's
share).

**Defect:** three separate problems.

1. **The runner returns no `spent`.** `docs-page-chain.js:788` returns
   `{ pages, accepted, escalated }`. The pass-execute runner returns `spent: budget.spent()`
   explicitly (`pass-execute.js:722`), which suggests the Workflow result does not carry it on
   its own. "Task 6's `spent` divided by six" then has no source.
2. **The page-inputs cost is not attributable.** The records carry no per-step cost, and with
   `inFlight: 3` a global `spent` delta interleaves three pages. The page-inputs cost "beside the
   page's total" (FV-11) cannot be read from anything the plan builds.
3. **A flat mean misprices task 8.** The pilot is deliberately the fact-heaviest set, averaging
   about 57 outline `factIds` per page (89, 80, 66, 49, 30, 28). Task 8's pages average about 26
   (49, 26, 23, 17, 13). A flat `spent/6` roughly doubles task 8's projected share, and it could
   push the checkpoint toward a scope cut the numbers do not warrant.

**Fold:** task 3 adds `spent: budget.spent()` to the runner's return, and its dry run proves the
field is present. Drop the page-inputs cost split from FV-11: report rows received, rows
disposed, and the per-page cost only. Getting the split would need the pilot run at
`inFlight: 1`, which costs clock time but no tokens; take that only if the split's answer would
change a decision. Task 7 re-derives task 8's share by scaling the pilot's per-page cost by
outline `factIds`, and it states the qualifying-page count beside the cross-regression rate,
since six pages give zero to three qualifying pages.

### PR-6 (major): relink edits reach shipped code, and their gate cannot see it

**Location:** plan:391-393 (task 7: "gate as task 5"), plan:425-438 (task 9's gate).

**Defect:** the rearms tasks 7 and 9 restore edit files outside `docs/`:

- `src/lib/sveltekit/admin-action.ts`, `src/lib/dev-flag.ts`, `src/lib/sveltekit/admin-nav.ts`,
  and `src/lib/reproductions/stories/*`;
- showcase code under `examples/showcase/src/**` and `examples/showcase/svelte.config.js`;
- the root `README.md` and `examples/cairn-theme/cairn.css`.

`examples/showcase/svelte.config.js` is byte-identical to `templates/waymark/svelte.config.js`,
because it is emitted. A restored comment there turns `check:template` red until
`npm run emit:template` runs, and the change reaches the scaffold `create-cairn-site` ships. The
docs gate runs neither `check:template` nor `check:comments` (the TSDoc and em-dash lint), nor
the showcase's own check (`docs-gate.mjs:62-94`). CI runs all three (`test.yml:84,93,117`).
Drift therefore surfaces only at task 10's `check:close`, where the fold agent repairs it with no
chain around it.

**Fold:** the relink task's gate is the string
`node scripts/checks/gate-tier.mjs --range <base>..HEAD` prints for its diff. That is the
existing classifier, and it defaults unknown paths to `full`. The relink task also runs
`npm run emit:template` whenever a showcase file the template emits changes. See PR-7 for why
this should be one relink task, not two.

## Minors

### PR-7 (minor, over-ceremony): fold task 7's relink into task 9

**Location:** plan:391-393.

**Why:** the pilot pages' `LEGACY_PATH_MAP` repoint is unnecessary at task 7.
`legacyMapProblems` only requires the replacement to exist (`docs-links.mjs:245-249`), and task
5's interim index stays on disk through 2b. The 45 pilot-keyed rearms have no reader before
task 9's consistency read.

**Fold:** one relink batch in task 9, with one agent, one PR-6 gate, and one diff-reviewer read.
Today task 7's relink runs with no diff-reviewer at all. This saves one dispatch and one gate
run, and it keeps the checkpoint task limited to measurement and Geoff's read.

### PR-8 (minor): concurrent map writes can redden a sibling's gate, and the runner then redrafts

**Location:** plan:158-161, plan:189-192.

**Defect:** the drafter's exemption covers only a red "that names another in-flight page's
*file*" (`docs-page-chain.js:456-461`). A map failure names a path, a slug, or a fact id, not a
file. The runner accepts only `gate === "pass"` (`:752`), so a transient red costs an Opus
redraft round and can escalate. Two write orders create that transient red: a row rewritten to a
fact id before the fact is filed, and a fact retagged before its row is rewritten. The plan also
never says where the pending-count constant lives.

**Fold:** add two write-order rules to the map rule so every intermediate state is green. On
disposal, file the fact first, then rewrite the row and lower the constant in one edit. On an
FV-10 retag, rewrite the row and raise the constant in one edit first, then retag the fact.
State that the constant lives in the map file, so it and the rows serialize through one file's
stale-read check.

### PR-9 (minor): gaps between the gate list, `check:close`, and `main`

**Location:** plan:246, plan:338-340, plan:444-471.

**Defects and folds:**

- **The option gate is missing from `check:close`.** Task 2 adds the gate to `docs-gate.mjs`,
  but `check:close` lists its components one by one and never calls the docs gate
  (`package.json:83`). Task 2 therefore also adds a `check:options` script and its
  `check:close` entry.
- **Task 5's gate cannot prove its acceptance.** Its acceptance asserts `check-package-files`
  is green, but the docs gate excludes `check:package` by design (`docs-gate.mjs:3-5`), and
  that check requires the interim README in the tarball. Add `npm run check:package` to task
  5's gate.
- **`main` is merged only once, at S1.** Any engine pass that lands on `main` afterward and adds
  an adapter option has no map row. The merge would then leave `main` red in CI on the new gate.
  Task 10 merges `main` into the branch before its full gate.

### PR-10 (minor): the chain's invocation and outputs have loose ends

**Location:** plan:103-106, plan:376-385.

**Defects and folds:**

- **A required argument is missing.** `args.worktree` is required (`docs-page-chain.js:225`)
  and absent from the plan's argument list. Add it.
- **Nothing commits the chain's outputs.** The runner tells its agents to "commit nothing"
  (`:610`), and no task names a commit of the pages, briefs, facts, map, index, and friction
  log. Every boundary must be a green commit. Tasks 6 and 8 end with a Sonnet agent committing
  the files the records list, after one tree-mode docs gate.

### PR-11 (minor): the reference arm keeps three claims the sweep proved wrong

**Location:** plan:40-48.

**Defect:** the friction log's misleading-text notes name three reference claims: the `Env`
"collapses to `{}`" claim at `docs/reference/sveltekit.md:805` and
`docs/reference/auth-channel.md:38`, and the `vocabularySaveAction` path at
`docs/reference/sveltekit.md:1207`. The sweep corrected the facts, so the 2a pages will state
the behavior correctly while the reference pages they link to contradict them in the same
tarball. The reference arm is not in flight, so the repo's fix rule applies: a deficiency is
fixed on the page in the same pass.

**Fold:** task 9's batch fixes those three sentences under each reference page's own gate. The
code comments stay in the friction log for an engine pass.

### PR-12 (minor, over-ceremony): the zero-friction rule invites manufactured entries

**Location:** plan:399-400.

**Defect:** "Zero entries across all six is read as a prompt failure" treats a count as proof.
A runner edit made to force entries produces the invented findings the Anthropic guidance in
the dispatch warns about.

**Fold:** tie the check to evidence. Zero entries on a pilot page whose surface carries a PR-3
defect or one of DAD-1, EXB-4, or EXB-5 is the prompt failure. Zero entries elsewhere is
accepted.

### PR-13 (minor, over-ceremony): the S1-boundary friction entries detour through `main`

**Location:** plan:98-102.

**Defect:** the three entries are written to `main`, committed there with hunk staging, and
then merged back by a second agent. That is two dispatches and a cross-branch commit for three
append-only bullets. The friction log carries no `main`-canonical rule; STATUS does.

**Fold:** write the entries on the branch. Keep the `main` detour only if another live pass
triages the log before 2a merges, and state that reason in the plan.

### PR-14 (minor): the outline's setup actions contradict task 5

**Location:** plan:353-354.

**Defect:** 19 `restoredBy: "setup"` rearms say "Repoint the `LEGACY_PATH_MAP` value at
`docs/extend/<real successor>`". Task 5 points them at the interim index instead, which is
correct, since the successors are not on disk yet. An implementer reading the outline's `action`
text hits a plan/outline disagreement.

**Fold:** task 5 states that the plan governs the setup entries' target, and `relink.json`
records the interim target together with the page that repoints it.

### PR-15 (minor): the allowlist prune can reach 2b's entries

**Location:** plan:438.

**Defect:** "prunes `check-symbols-allowlist.mjs` entries no 2a page carries" also matches the
entries keyed to 2b pages (`enable-tidy`, `migrate-existing-content`, `add-an-island`,
`reuse-content-across-entries`). Pruning those leaves their `relink.json` rearms stale.

**Fold:** "prunes the allowlist entries whose rearm the outline keys to a pilot or 2a page".

## Checked, no finding

- **Coverage gate after merge.** Every engine tier's gate includes the docs gate
  (`gate-tier.mjs`), so an engine pass that adds an option fails its own task gate, which is
  where it should fail. The way out, filing a `[verified]` fact, is the fact bullet CLAUDE.md
  already requires of every behavior-changing pass. One loophole remains: an engine implementer
  could add a `pending` row and raise the constant, since the "no other change raises the
  constant" rule is not machine-checked. The diff-reviewer is the only guard. That is
  acceptable, and building more would fail the lean guard.
- **`LEGACY_PATH_MAP` and shipped links.** The map only exempts `CHANGELOG.md` links from the
  link check (`docs-links.mjs:142-220`); it rewrites nothing a consumer sees. No released tool
  anchor points into extend (`shipped-anchors.json` holds only `is-it-working.md` anchors), and
  no `cairn.pub/docs/extend` URL appears in `tool/`, `skills/`, `src/lib`, or `templates/`. A
  repoint cannot break a shipped link.
- **The tarball's docs set.** `docs/extend` is in `files`, so the next release gains the interim
  README, 11 pages, and any figure assets. This improves on `main`'s current three kept pages.
  Name the interim index in task 10's changelog line beside the 11 pages.
- **Concurrent fact minting.** Ids come from `crypto.randomBytes` (`check-facts.mjs:136-140`), so
  concurrent minting is safe.
- **Task 4 (the release sweep).** It is cheap and the spec requires it, but the pilot never
  exercises it. Keep its cost out of the "mechanisms measured by the pilot" line at task 7.
