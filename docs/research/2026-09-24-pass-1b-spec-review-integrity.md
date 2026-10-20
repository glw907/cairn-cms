# Pass 1b spec review: measurement integrity lens

**Target:** `docs/superpowers/specs/2026-09-24-docs-reset-pass-1b-validation-design.md` at
`30083f27`. **Lens:** where the measurement can be silently corrupted or leak. **Reviewer:**
`claude-opus-5-5`, one read, with the pass 1 validation, planted-defects, and baseline records,
the pass 1 plan, and `scripts/docs-readers/` (`lib/prepare-class.ts`, `prepare-validation.ts`,
`lib/verify.ts`, `classes/*.json`) as context.

**Counts:** 1 blocker, 8 major (one an OWNER FORK), 6 minor. Line numbers are the spec's unless
a path is named.

## Blocker

### B1. Who judges a catch is unassigned, and the inherited rule makes it the unblinded conductor

- **Location:** spec:100, spec:112-114, spec:71 ("Score, by script where mechanical and by the
  blind adjudicator where judged").
- **Defect.** Every sensitivity bar rests on catch calls, and a catch call needs the plant record,
  so the blind adjudicator (spec:112-113, which rules control-run findings only) cannot make it.
  The spec defers to "pass 1's ruling 5", and ruling 5 assigns the call to "the scoring read"
  (pass 1 plan:646), which in pass 1 was the conductor's own read
  (`2026-09-23-docs-reset-validation.md:49-52`). The pass 1b conductor has read the whole
  development set, watches test reports arrive, and knows which way the gate breaks. Pass 1's
  calls were real judgment, not string matching: P03 "caught as an inconsistency, not as a
  failure", P05's rule candidate ruled not a catch, D01/D08/D12/D16 "near misses, not counted".
  Each of those could have gone the other way. The agreement bar (spec:125) covers precision
  rulings only, so recall, the bar that failed hardest last time, has no second read at all. The
  catch criterion itself (the plant's "specific subject") is also written after the reports
  exist, since the spec does not require it fixed at planting.
- **Fold.**
  1. The planter writes, per plant, the subject and a one-line catch criterion with one
     example of a near miss that does not count, in the plant record, before any planted run.
     Commit the record and put its hash in the planted batch's manifest.
  2. Catch calls go to a fresh `claude-opus-5-5` catch judge at `high` that sees the plant
     record entry and the run's four catch fields (`stalls[]`, `assumed[]`, `checks[]`,
     `diverged[]`), with model and run id stripped. Never the conductor, never the planter.
     Its prompt is in the freeze commit.
  3. Extend the agreement bar to catch calls: a second independent read on a seeded random
     sample of plant-run pairs (all 72 if cheap, since each is one short read), at least 85
     percent agreement, disagreements to the same one `fable` read.

## Major

### M1. The freeze is declared, not enforced, and its contents are incomplete for later verification

- **Location:** spec:60-62, spec:150-153.
- **Defect.** "Nothing that affects a score changes after it" names five things. Several
  score-affecting inputs are missing: the planter prompt and plant-type definitions, the catch
  judge (B1), the path-map script, the harness-exclusion list and allowlists (class files), the
  batch files and job texts, the container image (`Containerfile` digest), the Claude Code CLI
  version inside it, the agreement-sample seed, the model ids as the API resolves them (an alias
  like `claude-opus-5-5` can move), and the page commit. That last one is live:
  `prepare-validation.ts` pins the scripter's contract pages to `commit: 'HEAD'`, so a mapping
  batch and a planted batch built at different branch heads can score different pages.
  The `~/.cache/docs-readers/prepared/` trees are outside git entirely. Nothing stops a quiet
  post-freeze edit: the rule is prose, and no tool reads it.
- **Fold.**
  1. The freeze commit carries a manifest (`scripts/docs-readers/freeze.json`) listing each
     frozen path with its sha256, the image digest, the CLI version, the pinned page commit SHA
     for every job (never `HEAD`), and the seed. Tag it `docs-reset-1b-freeze`.
  2. The runner refuses a gated batch when `git diff --quiet <tag> -- <frozen paths>` fails or
     the image digest differs. It writes the tag SHA and the manifest hash into every
     `report.json`.
  3. The scoring script refuses any report without them. Prepared trees record a content hash
     at build time, and the scoring script checks it.
  4. The close's `diff-reviewer` confirms `git diff <tag>..HEAD -- <frozen paths>` is empty.
  5. The rule for an instrument fault found after the freeze (a crash, a broken export): any
     fix voids the test set. The plants are burned, a new blind planter plants, and every
     mapping and planted run reruns. That makes a quiet fix both visible and costly, which is
     what keeps "no fix round" honest.

### M2. The pass A held-out defects are not unseen, and their path map is circular

- **Location:** spec:53-55, spec:65-67, spec:133.
- **Defect.** Spec:55 says "Nothing in the test set is seen before the freeze." The held-out
  half of pass A was run and scored in pass 1: the validation record's Bar 2 names all nine
  subjects (D01 to D18), which runs caught them, and the near misses with their exact wording
  (`2026-09-23-docs-reset-validation.md:101-126`). The conductor has read that record, and
  every tuning change is shaped by someone who knows those subjects. Second, spec:66 scores the
  held-out defects against a path map built from the same three runs that then have to catch
  them. A defect counts as on-path only if those runs quoted its section, so the measure
  selects for the runs that looked there. Reported-only limits the consequence, but the spec's
  claim of blindness is false as written.
- **Fold.** Reclassify the held-out half as development-contaminated. Either drop it, or keep
  it under that label with the line "seen by the conductor in pass 1; not a blind measure."
  If it stays, build its path map from separate runs, for example the pass 1 heldout runs'
  pages-read sets, rather than from the runs it scores.

### M3. The planter can read the development set through "read access to the code"

- **Location:** spec:139-141.
- **Defect.** The planter "never sees... the development set's plants" but gets "read access to
  the code for proofs". If that is the worktree, it contains
  `docs/internal/record/2026-09-23-docs-reset-planted-defects.md` (all 17 dev plants),
  `2026-09-23-docs-reset-validation.md` (which plants readers missed and why), this spec (the
  bars), and `docs/HISTORY.md:31-51` (the miss pattern). A planter that sees what was tuned
  for can drift toward the dev plants' shape. The same six pages carry both sets, so a
  near-duplicate of a tuned-for dev plant is the likeliest silent inflation. The reverse drift,
  toward known blind spots, deflates recall.
- **Fold.** The planter reads code from the repository-class export (`REPOSITORY_EXCLUDED_PATHS`
  already drops `docs/internal/record`, `docs/superpowers`, and `scripts/docs-readers`), with
  `docs/HISTORY.md` and `docs/STATUS.md` also dropped for this dispatch. The planter prompt is
  frozen (M1). Add a scripted check after planting: no test plant shares a page and a subject
  term with a dev plant (P01 to P17). Any hit is recorded and replanted before the planted runs.

### M4. Tuning on off-path dev plants rewards wandering, which inflates `steps[]` and the path map

- **Location:** spec:78-79, spec:86-89, spec:109-111.
- **Defect.** The keep rule is "raises development recall without dropping development
  precision". The dev plants were placed anywhere on a page, and pass 1 showed its misses were
  off-path. So the change that most raises dev recall is one that makes the reader read and act
  on more of the page, or quote every line it reads into `steps[]`. Both widen the path map
  (a section is on-path when two of three runs quote inside it). In the limit every section is
  on-path, "on-path sensitivity" becomes whole-page sensitivity, and the planter's constraint
  disappears. Nothing measures or bounds that. `steps[]` is also defined as "acted on", but the
  runner can only verify that the quote exists, not that the reader acted on it.
- **Fold.**
  1. Define a `steps[]` entry as an instruction the reader executed or a statement it relied on
     for a decision, with the decision named in a short field. Cap the entries per page, or
     score none of them.
  2. Report, per job, the share of each page's sections that are on-path, for the mapping runs
     and for the pass 1 control runs' pages-read sets. A share near 100 percent means the map
     no longer constrains placement.
  3. Freeze a ceiling now, owner-set. If a job's map exceeds it, that job's plants go on
     sections with at least three of three quotes instead of two of three.

### M5. The mechanical harness exclusion can silently delete real findings and catches, and it is a tuning lever

- **Location:** spec:82-84, spec:103-104.
- **Defect.** A finding "whose subject is a path the class file lists as absent by design" is
  excluded by script. Matching a subject by path string also drops a real finding that merely
  names such a path. Pass 1 has one already: designer 2 rc 3, confirmed real, reports that the
  scaffold's theme files cite `docs/internal/public-design-system.md`
  (`2026-09-23-docs-reset-validation.md:216-220`). The spec does not say whether the exclusion
  also runs before catch scoring. If it does, a stale-path plant whose wrong path falls on the
  list gets its catch deleted. And the list lives in the class file, which tuning may change
  (spec:75). Adding a path to it lifts dev precision mechanically without changing any reader
  behavior, and the diff-reviewer rule (spec:86) does not forbid it.
- **Fold.**
  1. Derive the absent-by-design list from the export rule itself (`REPOSITORY_EXCLUDED_PATHS`
     plus `.gitignore`d paths), not by hand, and freeze it.
  2. Exclude a finding only when its whole claim is that the path is absent or the command is
     denied. Anything else goes to the adjudicator.
  3. Never apply the exclusion to catch scoring. Forbid stale-path plants that target a listed
     path.
  4. Report every excluded finding with its text, so a reader of the record can audit it.

### M6. The adjudicator is blind to the job, but the real-defect definition needs the job

- **Location:** spec:105-108 against spec:112-113.
- **Defect.** "Omits a fact the job needs that no published page supplies" cannot be ruled
  without knowing the job, yet the adjudicator "never [sees] a reader prompt or job text". An
  adjudicator missing the job either treats every omission as needed, which inflates precision,
  or infers the job from the finding's own wording, which is circular and inflates precision
  too. Pass 1 split its rulings the same way (evaluator `ruleCandidates` wishes ruled false,
  the operator's UNCHECKED reason ruled real "since its reader runs no code",
  `2026-09-23-docs-reset-validation.md:194-201`). Those calls used knowledge of the job.
- **Fold.** Give the adjudicator a one-sentence frozen job summary per job: the audience and
  goal, never the reader prompt, the report format, or anything about plants. State that the
  omission test is judged against that sentence. Put the summaries in the freeze manifest.

### M7. Reruns, crashes, and partial batches have no mechanical rule, so they are a selection lever

- **Location:** spec:93-95.
- **Defect.** "Rerun once" covers an unverified run. It says nothing about a run that crashed,
  timed out, hit a rate limit, or never produced a report, nor about who decides to rerun.
  Pass 1 used a hand-built `validation-rerun.json` in which "a rerun replaces its original"
  (validation record:19-24). After the freeze, a conductor who can rerun a verified-but-weak
  planted run as "infra", or rerun a mapping run until the map looks right, changes the
  sample. The spec also does not say what happens to a job's map when a mapping run is lost:
  "two of three" silently becomes "two of two".
- **Fold.**
  1. The runner alone decides reruns, by rule: unverified, crashed, or no report means exactly
     one automatic rerun. It keeps every attempt in the results, and the scoring script reads
     the final attempt by rule.
  2. The batch manifest fixes the denominator: a run missing after its rerun counts as a miss
     and contributes no findings, the same as an unverified run.
  3. A job with fewer than three verified Opus mapping runs gets its map from the verified runs
     it has, at a threshold fixed now (for example, a quote in every verified run). The map is
     committed, with its hash, before planting starts.
  4. The record lists every rerun and why it ran.

### M8. OWNER FORK: the test set reuses the development set's pages and jobs

- **Location:** spec:49-55, spec:63-64, spec:86.
- **Defect.** The dev plants, the tuning rounds, and the test plants all sit on the same six
  pages, under the same six job texts. "Tuning may not name a page" stops explicit leakage. It
  does not stop the implicit kind: a change is kept only if it lifts recall on these exact
  pages and jobs, so the kept instructions are selected for them. Pass 2a runs readers on new
  drafts with three or four new jobs per page, and the test set measures neither.
- **Options.**
  1. Accept, and scope the claim in the record: "fit for these six jobs on these pages;
     transfer to new drafts unmeasured."
  2. Add one or two held-out jobs on pages the development set never touched, mapped and
     planted like the rest. Add them to the gate or report them only.
  3. Hold out one of the six existing jobs from tuning entirely. Tune on five, and gate on all
     six with the held-out job reported separately.
- **Recommendation:** option 2, reported only. It costs about eight runs and a few planter
  plants, and it is the one measure of the transfer that pass 2a actually depends on.

## Minor

### m1. The seeding-bias check is contaminated

- **Location:** spec:131-132.
- **Defect.** "Recall on the known on-path real defects" uses defects the conductor tuned
  against (F1 to F6, R1 to R4, the seven scripter real defects). The development-set recall on
  them is what the tuning optimized, so the plant-versus-real gap reads small by construction.
  That is exactly the bias the comparison exists to expose.
- **Fold.** Label it "development-contaminated". For an uncontaminated comparison, count the
  real defects the adjudicator confirms in the mapping runs and report how many of those the
  planted-run readers found again on the same unplanted sections. That comparison is imperfect
  but not tuned against.

### m2. Plants may land on real defects the mapping runs find

- **Location:** spec:143-145, spec:63-71.
- **Defect.** The planter avoids "known" real defects, meaning dev-set ones. Adjudication runs
  at step 6, after planting, so a real defect first found by a mapping run can share a line or
  subject with a plant. A finding about that real defect can then be scored as a plant catch.
- **Fold.** Give the planter the line spans of every mapping-run finding, unadjudicated and
  spans only, as lines to avoid. That tells the planter where readers already complained, not
  what they said.

### m3. The Clopper-Pearson bar treats 72 clustered pairs as independent

- **Location:** spec:122.
- **Defect.** Pairs cluster by plant and by job. At n = 72, an 80 percent point estimate
  already gives a lower bound near 69 percent, so the 60 percent bound adds nothing and gives
  false assurance about uncertainty.
- **Fold.** Compute the bound by a bootstrap that resamples plants, or state the bound
  plant-level: a plant counts as caught at two of three runs, with the Clopper-Pearson bound
  over 24 plants.

### m4. The agreement sample and the Fable read need a fixed seed and a fixed order

- **Location:** spec:125-128.
- **Defect.** "Drawn at random" with no seed allows a redraw. Fable's rulings overwrite only
  the sampled findings, so precision mixes corrected and uncorrected rulings. That is harmless
  if agreement is computed first, but the spec does not say so. The spec also does not say
  whether the sample draws from Opus runs only or pools classes.
- **Fold.** Freeze the seed (for example, the freeze tag's SHA). Compute agreement before any
  Fable ruling. Draw from verified Opus control-run findings only. Record per-class counts in
  the sample.

### m5. The export has metadata and awareness leaks

- **Location:** spec:82 and spec:145, `prepare-validation.ts` (planted overlay after the control
  copy).
- **Defect.**
  1. If the `git init` commit is made in the control tree and the planted variant overlays
     pages after the copy, every plant becomes an uncommitted diff, and `.git/index` stat data
     marks exactly the planted files. That matters for any test or check that shells out to
     `git`, and the pass 1 record says the tests need a checkout.
  2. Overlaid files carry newer mtimes, and Claude Code's Glob sorts results by mtime, so
     planted pages list first.
  3. The repository export still includes `docs/HISTORY.md:31-51` and, on the 1b branch,
     `docs/STATUS.md`. Both tell a repository-class reader that planted defects exist and sit
     on its path.
- **Fold.** Run `git init` and the commit after the overlay, per variant. Normalize every
  file's mtime to one fixed timestamp. Build the export from the pinned page commit (M1), and
  add `docs/HISTORY.md`, `docs/STATUS.md`, and `ROADMAP.md` to the excluded paths for gated
  batches. Byte-check the result the way pass 1's prep did.

### m6. The ±1 quote tolerance can put a `steps[]` quote in the wrong section

- **Location:** spec:109-111, `lib/verify.ts:58`.
- **Defect.** A quote verified one line off near a heading can be counted in the adjacent
  section.
- **Fold.** Assign sections from the verified span (`startLine`/`endLine`), not the cited line.
  A quote whose span straddles a heading counts for neither section.

## Not findings

- **The mapping runs doubling as precision controls.** They run after the freeze, before any
  plant exists, on unmodified pages. The only selection effect is the one M7 closes.
- **Keeping `ruleCandidates[]` out of both catch and finding.** The spec's symmetry argument
  (spec:96-99) is sound. Asymmetric counting would bias the instrument's way.
- **The Sonnet runs.** They gate nothing, so their verification behavior cannot corrupt a bar.
