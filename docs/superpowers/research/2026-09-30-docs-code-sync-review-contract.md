# Docs-code sync spec review: contract and criteria lens (CC)

**Target:** `docs/superpowers/specs/2026-09-30-docs-code-sync-design.md` at 15a71698, read with the
parent (`2026-09-26-draft-docs-approach-design.md`), the harvest spec, the gap-sweep record, the
runner `~/.claude/workflows/docs-page-chain.js`, and `scripts/checks/check-facts.mjs`.
**Lens:** is every promise testable, can any criterion pass vacuously, does every state a check
can meet name its report, and is each owner ruling carried by something that fails if ignored.

Counts: 2 blockers, 6 majors, 3 minors. One owner fork (CC-8).

## Blockers

### CC-1 (blocker): mechanism 1's gate passes every failure the spec cites

**Location:** `2026-09-30-docs-code-sync-design.md:85-98`.

**Defect:** the gate fails a path "that no citable fact names and no reference entry documents."
Every example the spec gives as the failure it catches was already in the reference arm before
the sweep. At `86fd134c~1` (the tree before the sweep filed), `publishActions`, `summaryFields`,
`refine`, `preview`, and `ComponentDef` each appear in `docs/reference/*.md`
(`publishActions` at `docs/reference/sveltekit.md:1913-1931`). The fact-or-reference disjunction
therefore passes all of them, and the gate would have been green on the day the sweep found 131
gaps. The lean guard's condition 2 fails for the gate as written. Only the input side (page
inputs receiving the paths) acts on the cited failure.

**Fold:** gate the assignment, not a text match. The generator's list is the input; the outline
(`docs/internal/outlines/<arm>.json`) carries an `optionPaths` field per page, and the gate fails
any generated path that no outline page lists and no reason-bearing exclusion covers. Page inputs
then disposes each of its page's paths in the existing claim inventory (carried, filed, or cut
with a reason), and the fact read's existing rule already blocks an inventory item the page
dropped without a `cut` (`docs-page-chain.js:635-644`). This is the typescript-eslint shape the
spec cites (every option has a home), rides two existing steps, and needs no fact-text matcher.
Acceptance fixture: a planted new member on `CairnAdapter.editor` with no outline assignment
fails, and the report names the path and the export it hangs from.

### CC-3 (blocker): mechanism 2's cited evidence is not drift, so the guard's condition 2 is unmet

**Location:** `2026-09-30-docs-code-sync-design.md:104-109`.

**Defect:** the spec says the four corrected facts (`f:kkp5bi`, `f:hdrzxd`, `f:7wiuwr`,
`f:i4fj93`) were each "wrong while its `Source:` still resolved," and offers them as what a
stamp-on-verify lockfile would catch. It would not. A stamp records the code at the moment a fact
is verified, and the code under each of these facts predates their verification:

- `f:kkp5bi`: the 55-minute token cache landed in `3ce8c088` (2026-07-13); the fact was harvested
  and tagged `[verified]` on 2026-09-29.
- `f:i4fj93`: the draft filter in `src/lib/delivery/site-resolver.ts:84-92` dates from May and
  July; harvested 2026-09-29.
- `f:hdrzxd`: `saveToBranch` at `content-routes-entry-write.ts:116-118` dates from `6bea7905`
  (2026-09-09); harvested 2026-09-29.
- `f:7wiuwr`: a misattribution (`defineConcept` for `normalizeConcepts`), never true.

These are verification misses at harvest, caught by independent re-reads at HEAD, which the page
chain's fact read already is. A hash stamped on 2026-09-29 would have matched on 2026-09-30 and
stayed green. The spec's own guard says a mechanism failing a condition is deferred.

**Fold:** one of two, decided by evidence, not taste. Re-cite condition 2 with a real
drift-after-verification case: the harvest's `[rejected]` (88) and `[docs-drift]` records hold
old-page claims that were true when written and false at harvest; one git-dated instance (the
page's commit precedes the code change that falsified it) satisfies the guard, since a page claim
is the same class as a stamped fact. If no such case is found, defer mechanism 2 with the trigger
"a `[verified]` fact is found wrong where `git log` shows its cited code changed after the fact's
verifying commit." Either way, correct the spec's text: the four facts measure the fact read's
miss rate, not drift.

## Majors

### CC-2 (major): the option-path generator has no scope rule, so the baseline can hold everything

**Location:** `2026-09-30-docs-code-sync-design.md:90-98`.

**Defect:** "walks the option-bearing types ... down to member paths" names no rule for
recursion or unions. `FieldDescriptor` is a union of fifteen field types, `ArrayField.item`
recurses into it, and `ConceptConfig<S>` is generic (`docs/internal/api-surface.md`). A naive
walk yields thousands of paths, most of them `label`, `help`, `required` repeated per field type.
A baseline of "today's uncovered paths" then holds nearly the whole list, and "may only shrink"
is satisfied by a list nobody reads. The criterion "passes with the baseline" (`:215-216`) is then
vacuous. The spec also never says the gate fails a baseline entry that is now covered, so the
ratchet does not enforce shrinking.

**Fold:** a path stops at a named exported type and cites it by name (`ArrayField.item: FieldDescriptor`),
so each type's members are listed once under that type. The plan records the generated count
and the baseline count at generation, and the pilot checkpoint reads them. The gate fails a
baseline entry whose path is now assigned (stale entry) and a baseline entry with an empty
reason. Acceptance adds both fixtures.

### CC-4 (major): line-range hashing makes staleness fire on unrelated edits

**Location:** `2026-09-30-docs-code-sync-design.md:111-115`.

**Defect:** the container carries 2,618 `path:line` pointers against 175 `path#Symbol` pointers
(143 of 1,527 fact bullets use a symbol). For a line pointer the hash covers "the cited lines'
normalized text," so any insertion above the cited range shifts the lines and fails the fact.
`src/lib/sveltekit/auth-routes.ts` carries 48 line pointers and took 22 commits since
2026-08-01. Once the arms are stamped, most engine passes that touch a heavily cited file will
fail dozens of facts whose claims did not change. The spec calls this "more noise"; it is the
dominant case, and it produces the re-stamp-without-reading pressure the spec names as the
prior art's failure (`:123-125`). The acceptance criterion tests only a whitespace edit
(`:217-218`), not a line shift.

**Fold:** stamp symbol pointers only. When the fact read stamps a fact whose pointer is a line
range inside a `.ts`/`.js` declaration, it converts the pointer to `path#Symbol` first (the
compiler-API lookup in `check-facts.mjs:59-70` already resolves those); `.svelte` and
unenclosed line pointers stay unstamped, like any unstamped fact. Acceptance adds: inserting an
unrelated function above a stamped declaration passes; a comment-only edit inside it passes; a
changed default inside it fails.

### CC-5 (major): the staleness check's states have no named reports

**Location:** `2026-09-30-docs-code-sync-design.md:111-127`.

**Defect:** the spec names one state (hash differs, fail with ids). It leaves open:

- **Absent lockfile.** If absence passes (no stamps, nothing stale), deleting the file disables
  the gate silently.
- **Orphan entry.** A stamped id deleted from the container, or retagged `[rejected]`.
- **Source changed after stamp.** The fact read fixes a fact's `Source:` line; the stored stamp
  now describes a different pointer.
- **Multi-pointer facts.** Most facts cite several pointers (`f:kkp5bi` cites four); "a source, a
  hash" is singular.
- **Malformed entry**, and a symbol that no longer resolves (already a `check:facts` failure).
- **Many stale.** A refactor fails fifty facts; "re-verifies those facts in the same pass" puts an
  unbudgeted fact-read dispatch inside an engine pass.

**Fold:** state each report in the spec. Absent lockfile fails (commit it empty). Orphan entry
fails, naming the id. A stored source that differs from the fact's current pointer fails as stale.
One hash per pointer, and the fact is stale if any pointer's hash differs. Malformed entry fails
with its line. The stale report groups ids by source file with a count, so an engine pass sees
the re-verification cost at a glance. The engine pass's re-verification is one fact-read
dispatch over the listed ids, named as a cost line in the pass class's close.

### CC-6 (major): nothing records who stamped, so re-stamp review and "the fact read stamps" are untestable

**Location:** `2026-09-30-docs-code-sync-design.md:116-125,217`.

**Defect:** the diff-reviewer "checks each re-stamp against a fact-read record," but no per-fact
record exists. The runner keeps only verdict, summary, and a blocking count for each read
(`docs-page-chain.js:749,760`), and an engine pass's re-verification dispatch has no record shape
at all. The acceptance line "the fact read stamps each fact it verifies" has no fixture: the fact
read is an agent following a prompt, and nothing checks it ran the command.

**Fold:** the stamp command takes `--by <run label>` (the runner already labels reads
`facts:<page>:r<round>`) and writes it into the entry; the fact read's report returns a `stamped`
id list, and the runner copies it into the page record. The diff-reviewer matches lockfile ids to
that list. Acceptance: at the pilot checkpoint, every fact id cited in the six pilot briefs has a
lockfile entry whose `by` names that page's fact read. That is one scripted comparison, and it
fails if the prompt edit was skipped.

### CC-7 (major): `designFriction` passes vacuously, conflicts with the runner, and breaks the thin conductor

**Location:** `2026-09-30-docs-code-sync-design.md:158-171,221-222`.

**Defect:** four problems.

1. The drafter already reports friction: `DRAFT_SCHEMA.frictionFiled`, with the drafter writing
   straight to the friction log (`docs-page-chain.js:149,606-610`). The spec's "the conductor
   files every entry" is a second, contradictory path, and parallel drafters writing one log is a
   write race.
2. The register editor and the fact read share `READ_SCHEMA`, and the runner drops every read
   field but verdict, summary, and a count. A `designFriction` field on a read never reaches the
   conductor unless the runner copies it. The acceptance line "each report schema carries
   `designFriction`" passes with the field present and discarded.
3. "Verified against the code first" by the conductor contradicts the thin-conductor rule (the
   conductor never reads a source file). It needs a dispatch, and none is budgeted.
4. Every agent returning `[]` satisfies every criterion, including a HISTORY count of zero.

**Fold:** make `designFriction` required in the page-inputs, draft, and read schemas, replacing
`frictionFiled`, and have the runner copy it into the page record. Drop it from the register
editor, whose job is prose, not seams (three reporters, not four). At each checkpoint the
conductor sends all entries to one verifier dispatch, which files the verified ones; price that
dispatch in the budget. Vacuity cannot be gated away cheaply, so make it a measure: the pilot
checkpoint reports entries per pilot page, and a zero across six pages the plan chose as the
hardest is read there as a prompt failure.

### CC-8 (major, OWNER FORK): the release sweep has no cost cap, no stop rule, and no stated effect on the release

**Location:** `2026-09-30-docs-code-sync-design.md:129-142,219`.

**Defect:** the sweep costs a multi-agent fan-out on every release, and the only measured sweep
cost 4.4M against a 3M share (`:78-79`). The spec names no per-release ceiling. Its "yield" has
no threshold and no decision: "a falling yield is the measure that mechanisms 1 and 2 work" is
confounded by window size (releases batch, so windows vary widely), and a release with no changed
declarations records zero, which reads as success. The spec never says whether a verified gap
blocks the cut. The acceptance line checks only that the skill carries the step. This is a
recurring owner-attended and token cost outside every pass ceiling.

**Options:**

- **(a) Build with limits.** Cap the sweep per release (for example 1M, one finder per changed
  declaration up to the cap, then report the unswept remainder). Record yield beside the count of
  changed declarations swept. The sweep never blocks the cut; gaps file as facts and defects go to
  the friction log. Two consecutive releases with zero verified gaps move it to an on-demand step.
- **(b) Defer with a trigger.** "The first site round that finds a doc gap in a surface changed
  since the harvest."

**Recommendation:** (a). The scaffold traps it cites are real, and the cap plus the retire rule
turn "yield" into a decision instead of a log line.

## Minors

### CC-9 (minor): "every rebuilt stage's plan template" names nothing that exists

**Location:** `2026-09-30-docs-code-sync-design.md:220`.

**Defect:** there is no stage plan template; each stage plan is written after the previous
checkpoint (parent `:193`). The criterion cannot be checked.

**Fold:** the carrier is the parent spec's stage flow step 1 (the outline step), amended to open
with the sweep; the 2a plan already names stages 3 to 5 (`2026-09-30-draft-docs-stage-2a.md:48`).
Criterion: the parent's stage flow names the sweep.

### CC-10 (minor): S1, S5, and S6 have no failing carrier

**Location:** `2026-09-30-docs-code-sync-design.md:37-47,185-210,212-223`.

**Defect:**

- **S1.** "The mechanisms land before the pilot" (`:187`) has no acceptance line; nothing stops the
  pilot's dispatch from preceding the mechanism tasks.
- **S5.** No criterion carries Geoff's keep-or-cut on the two added pages.
- **S6.** The pass projects 16.5M planned and 18.7M at pass A's rate (`:207-208`). The 14.4M flag
  will almost certainly trip after the pilot, and the spec plans only the over-18M case, so the
  run stops a second time for a question the pilot checkpoint could have answered.
- **S2.** The acceptance line checks only that the guard's text appears in the plan. CC-1 and CC-3
  show the spec's own mechanisms fail it, so text presence is not carriage.

**Fold:** add to Acceptance:

- The 2a plan's pilot task depends on the mechanism tasks.
- The 2a outline review page marks both added pages keep-or-cut, and the fold records the ruling.
- The pilot checkpoint question states the projected point at which 14.4M trips and asks Geoff to
  pre-clear it.
- The plan review records one guard verdict per mechanism, each with its three citations.

### CC-11 (minor): a dangling cross-reference hides the defect exception's handling

**Location:** `2026-09-30-docs-code-sync-design.md:164-165`.

**Defect:** "A defect that makes a page's instruction wrong is the one exception, handled as
above." Nothing above covers it; the handling is below, at `:195-197`.

**Fold:** point to "What stage 2a inherits," or move the one-line-note rule into this bullet.

## Not findings

- Option coverage's "defaults stay facts" deferral and the four deferred mechanisms each carry a
  trigger that a record can detect. They hold.
- S3 (agent-first prior art) is carried by the prior-art record, which is an input, not a
  mechanism. It needs no criterion.
- S4 is carried by the parent's pilot checkpoint, unchanged.
