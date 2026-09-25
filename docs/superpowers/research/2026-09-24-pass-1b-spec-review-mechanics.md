# Pass 1b spec review: mechanics and feasibility

**Target:** `docs/superpowers/specs/2026-09-24-docs-reset-pass-1b-validation-design.md` at
`30083f27`. **Lens:** does each stated mechanism behave as stated against the runner's source
(`scripts/docs-readers/`), and what does the six-step sequence need that the runner cannot do
today. Every claim below was checked against source or saved run data; probes were read-only.

**Counts:** 1 blocker, 6 major, 7 minor. Two owner forks.

## Blocker

### B1. A `git init` export leaks the plants through `git diff` once git exists in the image

- **Location:** spec:82-84 (the `git init` export); `prepare-validation.ts:147-153`
  (`plantOverlayOnto` copies the control tree, then overlays the planted pages);
  `Containerfile:8-15` (image built on `node:24-slim`, installs only `ca-certificates` and `curl`);
  plan ledger `2026-09-23-docs-reset-pass-1.md:628` ("the CLI auto-allows read-only Bash inside cwd
  regardless of the allowlist").
- **Defect:** Two parts.
  1. The image has no git. Probe: `podman run localhost/docs-reader:16da07be5618 sh -c 'command -v
     git'` prints nothing. A `.git` directory alone does not fix the pass 1 harness artifact ("tests
     need a git checkout"). The tests that shell out to git (`src/tests/unit/emit-template-tree.test.ts`,
     `gate-tier.test.ts`) still fail. The `Containerfile` must install git, which changes the image's
     content-hash tag.
  2. Once git is present, the planted variant leaks. The existing flow builds the control tree, then
     copies it and overlays the planted pages. If the one commit is made at control-preparation time
     (the natural place, inside `prepareRepositoryExport`), then every planted repository-class tree
     is a clean commit plus uncommitted edits. `git diff` or `git status` then prints each plant beside
     the original text. Both are read-only git commands, which the CLI auto-allows inside cwd whatever
     the allowlist says. That hands the core-developer and scripter readers the answer key.
- **Fold:** State in the spec that the single commit is made after the planted overlay, separately
  in each control and planted tree. The committed tree must be byte-identical to what the reader
  sees, and `git status --porcelain` must be empty at preparation's end. Add git to the
  `Containerfile`. Add a preparation assert: exactly one commit, a clean status, and a tree hash
  equal to the directory's contents. Also pin the commit identity with fixed
  `GIT_AUTHOR_*`/`GIT_COMMITTER_*` values, so the host's `user.email` never reaches a reader.

## Major

### M1. `REPOSITORY_EXCLUDED_PATHS` rejects any `.git`, so the export fails preparation as written

- **Location:** `lib/prepare-class.ts:414` (`'.git'` in the excluded list), `:486` (asserted after
  every repository export), `:573` (asserted inside every contract-bundle subdirectory).
- **Defect:** `assertNoExcludedPaths` throws on the `.git` the spec adds. The exclusion's stated
  reason (`:410-413`, "the git history that could name any of them") still holds for a real clone.
  It does not hold for one synthetic commit.
- **Fold:** Replace the `.git` absence check with a synthetic-repository check (see B1's assert).
  Keep the other three exclusions. Say whether the scripter's contract bundle gets a `.git` too. The
  spec says "the repository export", but the bundle is a different builder
  (`prepareContractPagesBundle`, `:557-579`).

### M2. "A command the allowlist denies" cannot be matched to a finding mechanically

- **Location:** spec:103-104; `lib/transcript.ts:486-497` (`collectDenials`: tool name plus a
  400-character JSON excerpt of the input); `lib/runner.ts:128`.
- **Defect:** The runner records denials as tool inputs. A finding is a free-text string with no
  subject field (`REPORT_SCHEMA`, `runner.ts:44-61`). Nothing links the two. Also, denials are
  everywhere: 29 of the 39 pass 1 validation runs carry at least one. Most are the reader's own
  compound commands (`ls -la && cairn doctor; echo ...`, `npm run build 2>&1 | tail -30`), which the
  allowlist refuses by construction (ledger `:629`). The allowlist is also not the whole boundary. The
  CLI auto-allows read-only Bash (ledger `:628`), and the docs-only class has no Bash at all, so its
  "harness" gaps never appear as denials. "Excluded mechanically" therefore needs a matching rule
  that the spec does not give. Without one, the step turns into judgment, and the spec counts "a
  harness artifact the rule missed" as a false positive (spec:107-108).
- **Fold:** Pick one:
  - Define the rule. A finding is a harness report when its text contains the leading command word
    and first argument of one of that run's `permission` denials, or a path from the absent list.
    Record every exclusion so the adjudicator can audit it.
  - Add a structured `blockedBy` field to `stalls[]`/`diverged[]` entries (the denied command, or
    null), and exclude on that.

  Either way, the adjudicator should rule a missed harness artifact as "harness", excluded from the
  precision denominator, rather than as a false positive. Otherwise the precision bar measures the
  filter's recall.

### M3. The absent-by-design list does not fit the class file, and it varies by job

- **Location:** spec:82-84, 103; `lib/class-schema.ts:55-65, 89-91` (`validateClass` rejects any
  unknown field); `classes/repository.json` (one class serves core-developer's full export and the
  scripter's three-page bundle).
- **Defect:** Adding the list means a schema change in `FIELDS`, plus a loader change. More
  importantly, what is absent by design is a property of the prepared tree, not the class. For the
  scripter's bundle, the whole repository except three pages and eight schemas is absent. For
  core-developer, only `docs/internal/record`, `docs/superpowers`, and `scripts/docs-readers` are
  absent. One class-level list either over-excludes the scripter's findings about code or
  under-excludes core-developer's.
- **Fold:** Put the list on the batch job, or derive it from the builder: the builder already knows
  its exclusions (`prepare-class.ts:485`, `:571`). Write it into the prepared tree's sidecar metadata
  outside the reader mount. Name it in the spec as "the job's absent list".

### M4. On-path scoring has no path map on the development set, so tuning optimizes the wrong recall

- **Location:** spec:47-55, 86-89 ("scored on the development set with the test-set scoring
  script"), 109-111.
- **Defect:** The test-set script scores plants on path maps, and path maps come from step 3, after
  the freeze. The development plants (P01 to P17) were placed anywhere on a page. The pass 1 record
  (`2026-09-23-docs-reset-validation.md:88-94`) traces every miss to an off-path plant. Run with no
  map, "development recall" rewards exactly the exhaustive reading the spec says the instrument is
  not for (spec:33-37). The keep rule, "raises development recall without dropping precision", then
  selects for the wrong property. The rule also needs a reference score. Pass 1's scores used a
  different counting rule (with `ruleCandidates[]`), so they are not comparable.
- **Fold:** State that each tuning round's control runs build a development path map with the same
  script. Development recall counts only plants inside that map; off-path development plants are
  reported only. Rescore pass 1's saved reports offline under the new counting rule to get round 0's
  reference. `reverify.ts` already re-derives from saved transcripts, and pass 1's reports carry
  `stalls`/`assumed` to rescore.

### M5. The planter has no fallback when a job's path map is too thin for four plants

- **Location:** spec:109-111 (on-path means at least 2 of 3 Opus runs quote the section),
  spec:139-145 (four plants per job, each in an on-path section, avoiding known-defect lines,
  one per type).
- **Defect:** The map's density depends on how many `steps[]` quotes a reader gives, and pass 1's
  `quotes[]` was sparse. Operator runs gave 3 to 4 quotes across the whole docs set
  (`validation-20260924/report.json`); designer runs gave 4 to 8. Under a 2-of-3 rule, a
  wide-ranging evaluator or a thin operator path can leave one or two on-path sections, or none.
  Those sections may already hold known real defects (F1 and R4 on `is-it-working.md`), leaving no
  legal line for a plant type. The spec has no rule for that case. The planter would then either
  improvise, which is a post-freeze method change, or plant fewer than 24. That changes the 72-pair
  denominator the bar is stated on (spec:122).
- **Fold:** Pre-register the fallback before the freeze. For example: when fewer than N lines are
  plantable on the 2-of-3 map, widen to sections quoted by at least one Opus mapping run, recorded
  per job. When that still fails, plant fewer and state the bar as a proportion over the actual pairs.
  Also require `steps[]` to carry at least one quote per section the reader acted in. The report
  request's wording (`runner.ts:64-71`) is the only lever, and it is in tuning scope.

### M6. The budget omits implementer and adjudication spend, and names no counting rule

- **Location:** spec:162-166; pass 1 plan ledger `2026-09-23-docs-reset-pass-1.md:33-35` (counting
  rule), `:628-633` (per-task spend), `:649`.
- **Defect:** The reader figure is consistent with the record. Pass 1's validation counted
  1,750,056 tokens over 47 runs, 37.2k per run. Opus averaged 31.5k and Sonnet 44.7k, so a 3:1 mix
  is about 35k. 99 runs at 37k is 3.7M. That figure counts input, output, and cache creation, and
  excludes cache reads (`lib/ledger.ts:17-18`). The ceiling covers everything else too, and pass 1's
  ledger shows that work is not small. Each runner task cost 0.8M to 1.34M implementer tokens plus
  0.1M to 0.3M of review, as subagent totals that include cache reads (ledger `:632` says these
  overstate). Pass 1b has at least four such tasks before any run: `steps[]`/`diverged[]` through the
  schema, parser, types, verifier, and `reverify`; the git export and image; the absent list and
  harness filter; and the path-map and scoring scripts plus the prepare split (m1). It also has the
  adjudicator, the agreement re-read, and a `fable` read. 6M minus 3.7M leaves about 2.3M for all of
  it, which the pass 1 per-task figures do not support under either counting reading. Reruns are
  also missing: pass 1 needed 8 reruns for 39 runs, about 20 percent.
- **Fold:** State the counting rule (pass 1's: cache reads excluded). Add a line per implementer
  task from pass 1's measured figures, plus a rerun allowance of about 20 percent of Sonnet-heavy
  batches, plus the adjudication reads. Then either raise the ceiling (roughly 8M to 9M on pass 1's
  evidence) or cut a tuning round. **OWNER FORK (ceiling):** (a) raise the ceiling to about 8.5M,
  flag at 6.8M; (b) keep 6M and allow one tuning round; (c) keep 6M and drop the Sonnet mapping and
  planted runs (12 runs, about 0.55M). Recommendation: (a). The tuning rounds are where the pass 1
  failure gets fixed, and Sonnet's share decides a pass 2a question (spec:159-160).

## Minor

### m1. `prepare-validation.ts` cannot build control trees before plants exist

- **Location:** `prepare-validation.ts:147-153, 156-205`; `PLANTED_ROOT` at `:31`.
- **Defect:** Every step builds control and planted together, and `applyPlantedOverlay` throws when
  `planted/<job>/` is missing (`:84`). Step 3 (map) runs before step 4 (plant), so it needs a
  control-only mode. Separately, `planted/<job>/` today holds pass 1's development plants. The test
  planter writing to the same path overwrites the development set that tuning replays.
- **Fold:** Add `--control-only`. Key the planted root by set (`planted/dev/<job>`,
  `planted/test/<job>`).

### m2. Sections leave the page lead uncovered and do not say how `###` nests

- **Location:** spec:109-111.
- **Defect:** Every relevant page has headings, including `CONTRIBUTING.md` (9 `##`/`###`) and all
  three contract pages at `29a03eff` and `3453668f` (15, 10, and 15 `##`; no `###`). No page lacks
  them. But the lines between the H1 and the first `##` (8 to 17 lines per page) sit under no `##`
  or `###`, and real defects live there: "Seven checks" at `cli-cairn-doctor.md:10-11` (validation
  record `:264`). The spec also does not say whether a `###` line counts for both its own span and
  its parent `##`. No `##` or `###` line sits inside a code fence on the job pages today, but a
  parser should still skip fences.
- **Fold:** Define the lead as its own section. Assign a quote to the innermost heading. Skip fenced
  blocks. Identify sections by heading text, not line, so planted pages with shifted lines map
  unchanged, and forbid the planter from editing headings.

### m3. Coarse sections make "on-path" loose on the long pages

- **Location:** spec:109-111, 143.
- **Defect:** Measured at HEAD, the largest spans are 131 lines (`is-it-working.md`), 133
  (`add-a-custom-admin-screen.md`), 126 (`cli-cairn-json-output.md`, whose `site` payload section
  has no `###`), and 386 (`migration-notes.md`). One step quote marks the whole span, so a plant
  can sit 100 lines from anything any run read. That is the failure pass 1 had, one level down.
- **Fold:** Report each plant's line distance to the nearest mapping-run step quote beside the
  catch table. Optionally cap a section at a window (say 40 lines around quoted lines) for plant
  placement only.

### m4. A verified `steps[]` quote proves the text exists, not that the reader acted on it; one bad step voids the run

- **Location:** spec:78-79; `lib/verify.ts:68-93` (the tolerance is text starting on the cited line,
  a wrapped span of up to 5 lines ending at it, or one line off in either direction; otherwise it
  fails), `:174-188` (any failed quote fails the whole report; every quoted docs page must appear in
  `pagesRead` or overlap a Grep-displayed line), `lib/transcript.ts:388-415` (`pagesRead` is
  page-grain, so a whole-file Read admits a quote from any line).
- **Defect:** `steps[]` can be verified exactly like `quotes[]`. The verifier returns
  `startLine`/`endLine` (`types.ts:138-141`), so assigning a quote to a section is exact even under
  the plus-or-minus-one tolerance. But verification shows the line exists on a page the reader
  opened. It does not show the reader acted on it, so the path map inherits the reader's self-report.
  Separately, the check is all-or-nothing. Opus had 0 bad quotes in 302 (validation plus rerun) and
  Sonnet 5 in 144. At Sonnet's rate, a report of 30 or more step quotes fails about two times in three,
  which empties the reported Sonnet column.
- **Fold:** Keep the all-or-nothing check for gated Opus runs. Optionally cross-check steps against
  Read `offset`/`limit` ranges where the transcript has them. Record Sonnet's failed steps
  separately, so the reported numbers stay usable. Note the plumbing cost too:
  `transcript.ts:638-650` (`readerReport` drops unknown fields), `types.ts:145-151, 198-215`,
  `runner.ts:44-71, 116-135`, and `reverify.ts` all change. `checks[]` (spec:96) is always `[]`
  (`runner.ts:126`; the record `:28`, "No run filled `checks[]`"). Drop it from the field list or
  define what fills it.

### m5. The Clopper-Pearson lower bound never binds, and the 72 pairs are not independent

- **Location:** spec:122.
- **Defect:** The bound is computable. At n = 72, though, the first pass value of the point
  condition is 58 of 72 (80.6 percent), whose 95 percent Clopper-Pearson lower bound is 0.695.
  Every result that meets 80 percent clears 60 percent, so the second clause gates nothing. The
  interval also assumes 72 independent trials. Pairs share a plant, and a plant's detectability is
  correlated across runs. At the plant level (24 trials, 19 caught), the lower bound is 0.578, below
  60 percent.
- **Fold:** Either drop the clause, or compute the bound with plant as the cluster (a cluster
  bootstrap over the 24 plants, or Clopper-Pearson on per-plant majority catches) and keep it as the
  binding term. Per class, the 12-pair classes (docs-only, docs-and-binary) need 8 of 12. One fully
  missed plant costs 25 points there. Report that granularity.

### m6. No mechanism rules catches on planted runs

- **Location:** spec:100, 112-114, 71.
- **Defect:** The adjudicator rules findings on control runs. A catch ("names the plant's specific
  subject") is judged too, but no reader of the planted reports and the plant record is named. Nor
  is the "once per run per subject" grouping (spec:102), which is judgment, not script.
- **Fold:** Name the catch judge: the same adjudicator with the plant record, blind to job text. Say
  whether the agreement sample draws from catches as well as findings.

### m7. The held-out defects are not unseen, and they are mapped by the runs that score them

- **Location:** spec:53-55, 64-67; validation record `:96-125` (held-out results per defect, with
  near misses); baseline record `docs/internal/record/2026-09-23-docs-reset-baseline.md:250-275`.
- **Defect:** "Nothing in the test set is seen before the freeze" does not hold for the held-out
  half. Pass 1 ran and scored it twice (baseline and validation), and the conductor has read both.
  The development set (spec:49-51) includes pass 1's validation batch, which contains those
  held-out runs. The three pre-fix scripter runs also both build the path map and are scored
  against it, so "on-path held-out defect" is conditioned on the same runs.
- **Fold:** Restate the held-out half as a seen, reported-only check, which the spec already makes
  it (spec:66, 134), and drop it from the "Test set" paragraph. Or build its map from separate runs.
  The same holds, more weakly, for precision. Control runs are the same jobs on the same pages whose
  findings the conductor adjudicated in pass 1. **OWNER FORK (precision test data):** (a) accept
  this and name it in the record; (b) add one fresh job per class for precision only. Recommendation:
  (a). The tuning rule already forbids naming pages or defects, and (b) adds about 12 runs and a new
  job-authoring task.

## What the sequence needs that the runner lacks today

| Need | Where it changes | Finding |
| --- | --- | --- |
| `steps[]`, `diverged[]` in schema, parser, types, verifier, `reverify` | `runner.ts:44-71,116-135`; `transcript.ts:638-650`; `types.ts`; `verify.ts:174`; `reverify.ts` | m4 |
| git in the image; synthetic commit after overlay; new export assert | `Containerfile`; `prepare-class.ts:414,486,573`; `prepare-validation.ts:147-153` | B1, M1 |
| Per-job absent list; harness-report filter | `class-schema.ts:55-65` or batch job; new script | M2, M3 |
| Path-map builder (heading parse, lead, nesting, fences) | new script | m2 |
| Control-only preparation; dev and test planted roots | `prepare-validation.ts` | m1 |
| Scoring script: catches, findings, on-path filter, clustered interval | new script | M4, m5, m6 |
| Rerun batch generation (today hand-built, `batches/validation-rerun.json`) | batch authoring | M6 |
