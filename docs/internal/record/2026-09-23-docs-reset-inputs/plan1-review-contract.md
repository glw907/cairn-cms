# Plan 1 review: contract and criteria lens

Reviewer: `claude-opus-5-5`, 2026-09-23. Plan: `docs/superpowers/plans/2026-09-23-docs-reset-pass-1.md`.
Spec: `docs/superpowers/specs/2026-09-23-docs-reset-design.md`.

## Critical

**C1. Tasks 5 to 7 exempted from the failure-first rule (plan 188-189, Goal line 19).** Spec pass 1
item 3 (spec ~163-165): "a component with no failure behind it is dropped or deferred, and the record
says which," applied to every component below, items 4 to 7. The plan's Task 4 acceptance declares
Tasks 5, 6, 7 "structural ... built regardless," and the Goal line says the opposite ("each built only
where the baseline run shows a failure"). The plan contradicts itself and weakens the spec. Fix: either
(a) make Task 4's record carry a build-or-defer verdict for items 4 and 5 too, or (b) keep the
exemption but cite the spec line that grants it; none exists, so (b) needs an owner ruling before
approval. At minimum align the Goal line with whichever holds.

**C2. The drafter as default `drafterType` is deferrable (plan 263-264).** Spec item 5 states the
drafter "replaces `cairn-implementer` as the page chain's default `drafterType`." The plan puts that
swap inside Task 8, whose scope Task 4 may cut. Fix: move the swap into Task 7's outcome, or exempt it
from Task 4's scope cut explicitly.

## Major

**M1. Pass 2a authorship contradicts the spec (plan 315-316).** The spec (line 214-215) says "Fable 5.1
at `high` authors and folds" pass 2a. The plan's close says Opus 5.5 at `high` authors the pass 2a
plan. The branch's `CLAUDE.md` edit supports the plan. The global `~/.claude/CLAUDE.md` ("Fable plans
and adjudicates") and the spec do not. Fix: amend spec line 214 on the `docs-reset` branch before merge.
Add the global `CLAUDE.md` line to the dotfiles series ("a rule lives where it executes").

**M2. Quote verification checks less than the spec (plan 112, 120).** The spec asks for "a quote per page
read" and the runner "fails a report it cannot verify". The report shape has no `pagesRead`, and
acceptance fails only a report with *no* quote. A reader that reads three pages and quotes one passes.
Fix: the runner derives pages read from the transcript's Read/Grep calls. Acceptance: a report missing
a quote for any page read fails. Add a fixture for it.

**M3. Site-round evidence dropped from the baseline (Task 4).** Spec "Sequencing": the site round's
extender source-read log and per-page reports "feed pass 1's failure record". Task 4 never mentions
them. Fix: name them as Task 4 inputs. If none exist yet, the record should say so.

**M4. Scope verdicts are self-graded (Task 4, plan 170-189).** One Opus agent writes the record whose
verdicts cut Tasks 8 and 9, with no independent read and no owner question. Task 10 has the same
problem. Fix: one `diff-reviewer` read of the failure record against the reports. A verdict it disputes
goes to the header's single `fable` adjudication.

**M5. Task 8 acceptance does not prove the outcome (plan 271-273).** "A dry run completes both stages"
does not check most of the listed changes: profile grader removed, `check:provenance` in the gate,
Vale/`tellgrader` fed to the editor, the filter, text-only turn end, auto-continue of two, two-round
cap. The spec's filter criterion is also missing (it "drops only findings that contradict the register
or the brief"). Fix: one checkable bullet per built change, for example "the workflow source names no
profile-grader agent" or "a fixture turn ending text-only is parsed as a report". Restore the filter
criterion.

**M6. Task 1 criteria leave gaps.** The transcript scan for package fetches (outcome, plan 105) has no
criterion. The init check omits memory (ruling 9: "tools, MCP servers, or memory"). Review focus 3
(credentials refreshing mid-batch) is pinned only as "auth failure stops the batch", with no test that
a mid-batch refresh is detected. The plan also never says whether a refresh inside a per-run
credential copy can invalidate the host login. Fix: add those criteria, plus a test that simulates an
expired token partway through a batch.

**M7. Execution mode is unnamed (header).** The pass has eleven tasks. The workstation rule is
`pass-execute.js` at six or more tasks unless the plan says otherwise. The header names neither mode
nor opt-out. Fix: state the mode per segment.

**M8. Checkpoints write the plan ledger, not STATUS (plan 165, 235, 304).** The workstation rule is to
write STATUS at each checkpoint, at any split, and before any question to Geoff. Task 3's possible
owner sitting (plan 152) is a question with no STATUS write before it. Fix: have checkpoints write
STATUS, or both. Add "write STATUS before the token sitting".

## Minor

- **m1.** Interfaces are undefined before use. Task 1 creates "class declarations" and runs a
  repository-class reader. Task 2 also owns "the class declarations". Fix: say Task 1 defines the
  declaration schema and two classes, and Task 2 adds the rest. The batch file has no path, so Task 10
  cannot name its "standing regression batch". Fix: name `scripts/docs-readers/batches/`. The scripter
  job has no named class. The docs-only class has no baseline job besides the scripter, so Task 10's
  "every reader class" is ill-defined.
- **m2.** Task 10 adds its own thresholds: two of three runs, 12 of 14, and one fix round. The spec
  says "catches ... the known defects" (item 8), and failing that, pass 1 stops (item 9). A 12-of-14
  floor weakens this. Fix: cite the owner's grant, or require all 14 with two of three runs.
- **m3.** Task 6 drops parts of spec item 4. It says nothing on `[external]` and `[vendor-figure]`
  staying citable. It makes `[docs-drift]` resolution a list, where the spec wants resolution before
  drafting. Fix: add a fixture where an `[external]` citation passes and a `[docs-drift]` citation fails.
- **m4.** Task 6 bundles five deliverables: the check, the briefs directory, the reverse mode, 134
  dispositions, and conditional symbol anchors. That is past the four-deliverable flag. The rot
  branch has no acceptance criterion. Fix: split the dispositions into their own task, and add "rot
  >10%: a `src/` fixture resolves by symbol".
- **m5.** Task 7 drops the spec's effort `high` and the "two or three exemplar pages" count. The Opus
  5.5 prompt rules have no criterion. Fix: acceptance greps the agent file for each rule and the
  `effort` field.
- **m6.** Review focus 4: duplicate rejection is in Task 5's outcome, not its acceptance. Fix: add a
  duplicate-id fixture.
- **m7.** Tasks 7 to 10 name no gate command. Task 2's command is prose ("the class tests plus one
  live run"). Dotfiles tasks name no worktree or branch for the one-executor check. Dispatch effort
  is unnamed for Task 4's two agents and the reviewers. Fix: name each.
- **m8.** Task 9's acceptance covers one page and omits dry-run checks of state-changing commands and
  the spike decision. Fix: add criteria for all operator pages, one dry-run fixture, and "the spike
  record names build or adopt with evidence".
- **m9.** Spec item 3 says "through today's chain"; Task 4 omits it. State the reading.
