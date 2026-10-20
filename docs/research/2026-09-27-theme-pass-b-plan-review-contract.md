# Pass B plan review: contract and criteria lens

**Target:** `docs/superpowers/plans/2026-09-27-theme-identity-pass-b.md` at `07035110`
(branch `theme-b-plan`), against the pass B spec, the parent spec's G2, Corners, The markup
sweep, and Delivery sections, and pass C's plan on `theme-c-plan` for interface checks.
Line references are to the plan unless named otherwise. Counts: **0 blockers, 4 majors,
13 minors.**

## Where the plan is sound

- **Spec trace.** Every pass B promise in the spec lands in a task: the rename and `./public`
  (task 1), the Names section with Vale enforcement (task 1, decision 8), the audit scope
  defaults and the conditional `DEFAULT_ADMIN_SCOPE` gain (decision 1), the four-part
  `Consumers must:` line and migration note (task 8, decision 23), the spec's acceptance grep
  (task 1), `radius-scale` and the three arms at advisory tier (task 3), the recipe source and
  the norms print (task 4), the guidance and exemplar (task 5), the sync test (task 6), probe 1
  (S1), and the close's shared-file edits (task 8). Decision 2's deferral of the named-root rule
  to pass C is correct: the rule needs two scopes, and pass C's decision 6 implements both
  directions.
- **Pass C's inputs.** Every input pass C's plan reads from B is produced and verified by task 8:
  the post-rename paths, `./admin` and `./public`, `public.md`, the config constants and the
  `DEFAULT_ADMIN_SCOPE` outcome, `radius-scale` in the registry, the regenerated surface, the
  merged branch green on CI, and STATUS naming the head.
- **Non-vacuity where it matters most.** The rename greps are empty-by-design checks, and task 0
  item 4 measures their nonzero counts on the base, so an empty result proves a sweep rather
  than a bad pathspec. Decision 1 and decision 3 compare findings and suppressed counts before
  and after the move, which catches a gate left pointing at a missing folder. The Vale scratch
  file proves each new token fires. Task 3's and task 6's mutation proofs show each test can
  fail. Task 2 is test-first against the unfixed editor, with a table that asserts both document
  and caret.
- **Gates.** The close's gate covers unit tests (`test:node-projects` runs the unit, unit-dist,
  and integration projects). The rename string runs the five e2e specs the move can break, and
  the segment A boundary puts the rename alone through CI's visual specs.
- **Proportionality.** The `engine-logic` default fits tasks 2 to 4. Running segment A alone
  is a justified override. The merge-forward protocol matches the real risk of pass A's S3
  corrections landing across a rename. Two findings below cover class fit and over-ceremony.

## Majors

### C1 (major): the reviewer never sees the Outcome or the decisions it must hold the task to

`plan:69-73`. `pass-execute.js` gives `diff-reviewer` only `criteria` and the implementer's
report (`~/.claude/workflows/pass-execute.js:393-400`). The implementer gets `criteria`, `notes`,
and `commonNotes`. The plan fills `criteria` with "its acceptance lines verbatim", and the
reviewer's bar blocks on an "unmet outcome". Much of the testable contract lives only in the
Outcome bullets and the numbered decisions. Examples: decision 3 (`check:prose` scans
`src/lib/public`, the ESLint glob, the `@source` move), decision 4
(`gate-tier.test.ts` and `pass-gate-tiers.md`), decision 5 (`reference-coverage.test.ts` covers
the second barrel), decision 9 (two rule comments rewritten), decision 11 (the full flag and pass
list), decision 12 (the `utilityBase()` comparison on new arms only), and task 1's surface
regeneration. A reviewer holding only the acceptance lines cannot block on any of these.

**Fold:** each task's `criteria` carries its Outcome and Acceptance verbatim, plus the full text
of every decision the task names. Each task's `notes` carries the plan path and the spec
sections to read. State this in the Execution mode paragraph.

### C2 (major): the restore instruction for `src/lib/components` silently drops the admin routes

`plan:314-320` (decision 9), `:268-274` (decision 2), `:536-538` (Review focus 2), `:737-739`,
`:964-977`. `static.scope` replaces the defaults (`config.ts:215`, `asPathList(...,
DEFAULT_STATIC_SCOPE)`). A root a site names that its tree lacks fails the run
(`cairn-audit.md:179`). A consumer following "name `src/lib/components` under the admin scope
(`static.scope`)" and writing `"scope": ["src/lib/components"]` loses `src/routes/admin` from
every static rule, with no error. A consumer who instead copies the new default list gets
`src/lib/admin`, which it probably lacks, and the run throws. The `config.test.ts` case in
Review focus 2 passes on the losing form, because it asserts only that the named root comes back.

**Fold:** the `Consumers must:` clause, the migration note, and `cairn-audit.md`'s named-root
sentence say to set `static.scope` to the default roots the site has plus `src/lib/components`,
because a configured list replaces the defaults and a named root the tree lacks fails the run.
`config.test.ts` pins both halves: a config naming only `src/lib/components` no longer reads
`src/routes/admin`, and the documented form reads both. This extends the spec's clause without
changing its four parts, so it is no owner fork.

### C3 (major): probe 1 can pass on files the audit never read

`plan:413-422` (decision 20), `:925-937` (S1), `:867-899` (task 5). Probes 2 and 3 in the spec
require "a scanned-file count that includes every file the probe created". Probe 1's criteria
count findings on "the probe's files and page" but never prove the audit scanned those files or
visited the page. This pass creates the likeliest escape. After the rename, the default static
scope no longer reads `src/lib/components`, the conventional SvelteKit home for a shared
component. No shipped guidance says where a custom admin component lives. A grep of
`skills/cairn-admin-screens`, `skills/cairn-extend`, `claude/agents/cairn-extension-reviewer.md`,
and `claude/CLAUDE.md` for `src/lib` finds nothing. The spec's Names table assigns exactly these
files as the guidance for a custom admin component, and puts its home at `src/routes/admin` or
`src/lib/admin`. A probe that puts its status chip in `src/lib/components/StatusChip.svelte`
reports zero findings and passes.

**Fold:**
1. S1's audit agent lists the probe's created and edited files (`git status --porcelain` in the
   scratch tree). It asserts every file is in the static run's scanned set, and that the rendered
   run visited `/admin/probe`. Any probe file outside the scanned set fails the probe as a
   guidance gap.
2. Task 5 adds one line to `cairn-admin-screens/SKILL.md` and `daisyui-first.md`: a custom admin
   component lives under `src/routes/admin` or `src/lib/admin`, which are the roots the audit
   reads by default. The line stays within the budget check.

### C4 (major): the promotion promises ride the weakest mechanism when a one-line fold sits in a file the close already edits

`plan:357-365` (decision 13), `:436-439`, `:988-990`. Three constants already promise error tier
at `0.98.0`: `log-event-grammar.ts:20`, `log-secret-field.ts:25`, and
`stock-default-hazards.ts:45`. Pass C's close cuts `0.98.0`. Pass C's plan never mentions them:
a grep for `promot|PROMOTION|log-secret|guarded` finds only its own theme-rule entry. The
`cairn-release` skill has no step for them. This plan leaves the trigger in STATUS prose and a
ROADMAP entry. The repo's watch-item rule makes that the fallback, never the default, for a
machine-detectable trigger. The cost is a changelog promise broken silently at the very cut this
initiative makes. The close already commits to
`~/.dotfiles/claude/.claude/skills/cairn-release/SKILL.md` (decision 24), which is where the
rule executes.

**Fold:** the same dotfiles commit adds one checklist step to `cairn-release`. Before the cut,
grep `PROMOTION_VERSION` constants under `src/lib/audit`. Each constant at or below the cut
version is promoted with its changelog line, or re-dated with a disclosed changelog line. The
STATUS watch stays as the pointer. Promoting or re-dating at `0.98.0` changes consumers' CI, so
that choice belongs at pass C's owner sitting (S3), which already precedes the cut. It is not a
fork for this plan.

## Minors

### C5 (minor): two live forms escape all four rename greps

`plan:719-728`. Quoted `./components/<path>` strings match none of the four patterns. One case is
`src/tests/unit/components-barrel-prune.test.ts:44-46`, whose `DEMOTED_EXPORT_KEYS` are negative
assertions against `package.json` and would pass vacuously if left unchanged. Bare `components/`
prose also escapes, as at `src/lib/admin-toolkit/index.ts:46` and
`docs/internal/src-lib-map.md:166-213`.

**Fold:** add a fifth grep over `src`, `scripts`, and `docs/internal/src-lib-map.md` for
`(^|[^-a-z/])components/`. Exempt `chassis/components`, `theme/components`, and daisyUI's
`components/` group (`scripts/build/daisyui-classes.mjs`, the layer-order test), and have the
report classify each remaining hit. Rename the demoted keys to `./admin/...` so they still test
an export map that exists.

### C6 (minor): task 1's review bar is too low for its behavior changes

`plan:45-47`, `:93-94`. The `sweep` class reviews on Sonnet against grep post-conditions. Task 1
also changes consumer-facing defaults (`config.ts`), the `reference-coverage.mjs` props logic,
the `gate-tier.mjs` classifier, and adds a barrel test. The pass-core table calls a misfit class
a finding.

**Fold:** keep one task, since the spec requires the rename to run alone. Run its reviewer on
`claude-opus-5-5` with the `engine-logic` bar for those four files and the grep bar for the rest.
Pure renames diff as R100, so the added cost is small.

### C7 (minor): two acceptance tests have no gate leg that runs them

`plan:895-899`, `:941-945`. Task 5 requires decision 14's test to pass, and task 7 requires the
sync test to pass. The docs string runs no vitest.

**Fold:** add a task check to each, quoted with its `gate exit:` line:
`CAIRN_GATE_LANE=light cairn-run-gate 'npx vitest run --project unit <decision 14 test>'`. In
task 7, the check also lists the sync test file.

### C8 (minor): task 5's "no teaching in prose" grep is unnamed and contradicts decision 14

`plan:890-892` against `:371-373`. The extension reviewer must name the retired patterns in
order to check for them, and decision 14 allows that in a prose code span.

**Fold:** name the grep, scope it to fenced blocks, and state that a code span naming a retired
pattern as something to flag is allowed.

### C9 (minor): the arm fixtures skip the real inputs and leave the finding count open

`plan:824-828`. The canonical inputs are the parent spec's two full retired recipes. The ink
opener carries both `shadow-none` and `hover:bg-[var(--cairn-ink-hover)]`, and the tint carries
`shadow-none`. Neither full string is a fixture. The plan never says whether one element raises
one finding or a recipe finding plus a `shadow-none` finding. The same gap holds for
`radius-scale` on an element carrying two fixed radii.

**Fold:** add both full strings as fixtures with their exact expected finding sets.
Recommendation: one finding per element per arm group, with the `shadow-none` arm silent where a
recipe arm fired, and one `radius-scale` finding per offending token.

### C10 (minor): the two guidance tests can go vacuous later

`plan:366-374`, `:407-412`, `:915-921`. The mutation proofs run once. Nothing stops decision 14's
test or the sync test from later reading zero files or zero fences. The sync test names no
report for a missing `Write this, get this` heading, an empty table, or a malformed row.

**Fold:**
- Decision 14's test asserts a nonzero file count and a nonzero fence count.
- The sync test asserts the exemplar holds at least the seven kit sections decision 18 names.
- A missing heading or an empty table fails, naming the file.
- A malformed row fails, naming the file and the row.
- The test reports every mismatch, not the first.

### C11 (minor): the pre-mount insert path has no test

`plan:755-781`, `:321-331`. The unit table tests the pure function. Nothing shows that the
pre-mount fallback (`MarkdownEditor.svelte:1134-1136`, which appends to `value`) calls it. The
rule also leaves open whether a whitespace-only line counts as blank.

**Fold:** add one row, or a small component test, that drives the pre-mount path with a
non-empty `value`. State that a whitespace-only line counts as blank.

### C12 (minor): task 3 leaves two stated message promises untested

`plan:801-804`, `:818-823`. No fixture asserts `0.99.0` in a message. Only `btn`, `card`, and
`badge` exercise decision 11's replacement mapping. The `input`, `select`, `textarea`,
`modal-box`, and `dropdown-content` mappings go untested.

**Fold:** assert the version string in each finding's message. Add one table test over decision
11's class-to-role mapping.

### C13 (minor): the recipe strings are checked by eye only, and task 4 runs one gate too many

`plan:381-384`, `:854-863`. A typo'd class in `ROLE_RECIPES` would ship to three guidance copies,
which the sync test keeps consistent with each other, and nothing catches the typo. Separately,
the heavy `norms:check` leg cannot change result, since the recipes live outside the manifest and
task 4 already asserts `norms-manifest.json` is unchanged. That leg is one serialized admin
render on the machine lock, bought for no signal.

**Fold:** add a unit assertion that every class token in each Write string appears in the
compiled admin sheet's class inventory (the `admin-sheet-inventory` data). Drop the `norms:check`
leg from task 4.

### C14 (minor): the note to pass C points at the wrong text

`plan:475-479`. Pass C's task 0 item 1 already reads the 2026-09-27 topology. The stale text is
pass C's header paragraph "Branch topology" (`pass-c:34-36`, "Pass A has merged to `main`").

**Fold:** point task 8's STATUS note at that paragraph.

### C15 (minor): the close's facts list omits the frozen-page fixes

`plan:499-503` against `:978-980`. Global constraints promise a facts bullet for each frozen-page
deficiency task 1 fixes, on `build-a-site-by-hand.md`, `share-a-draft-preview.md`, and
`architecture.md`. Task 8's facts line, which the close drafter works from, never lists them.

**Fold:** add them to task 8's facts line.

### C16 (minor): the spec's positive import check has no command

`plan:727-730`. The spec's acceptance says "the showcase and template preview routes import
`PreviewBanner` from it". The greps prove only that the old path is gone.

**Fold:** add a command. `git grep -n "@glw907/cairn-cms/public" -- examples/showcase/src/routes
templates/waymark/src/routes` prints exactly the two preview routes.

### C17 (minor): task 1's Outcome attaches decision 1's condition to the wrong root

`plan:684-686`. The Outcome reads "`src/lib/admin-toolkit` (the latter conditional on the
measurement)", but the condition belongs to `src/lib/admin` in `DEFAULT_ADMIN_SCOPE`.

**Fold:** reword it as "`src/lib/admin` in `DEFAULT_ADMIN_SCOPE` is conditional on decision 1's
measurement".

## Owner forks

None for this plan. C4's promote-or-re-date choice at `0.98.0` belongs to pass C's S3 sitting.
The fold here only makes sure the release checklist raises it.
