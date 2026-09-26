# Draft docs approach spec: fold record

**Target:** `docs/superpowers/specs/2026-09-26-draft-docs-approach-design.md`, revision 1 at
`2efcb86c`, folded to revision 2 in place. **Reviews:** `2026-09-26-draft-docs-approach-review-`
`{contract,mechanics,risk,consistency}.md` in this directory. IDs below prefix each lens: `C`
contract, `X` mechanics, `K` risk, `S` consistency. Every finding was checked against the source
before its disposition; the verification notes name what was run or read.

**Counts:** 55 findings. 52 folded (7 of them with a named part refused), 3 became owner rulings
(O1, O2), 0 refused whole. Geoff ruled both on 2026-09-26: O1 as R8, O2 as R9 (below).

## Owner rulings

| Open ruling | Ruled | Where in the spec |
| --- | --- | --- |
| O1, the ceiling | R8: about 30M, not the recommended 58M. The chain goes lean (after a redraft only the reviewer that returned `fix` re-reads; the gate reruns every time), and the six-page stage 2 pilot runs both re-reads to measure the cross-regression rate. The full scope still plans at about 42M, so the pilot checkpoint brings Geoff one combined question rather than a silent cut. | Owner rulings; Budget; stage flow step 2; chain step 5; Stage 0 "Scoped re-review"; "Pilot checkpoint" |
| O2, rule 2 | R9: as recommended. Rule 2 governs the front door only (`why-cairn.md`, `docs/README.md`, the four arm READMEs); extend, admin, and editors are drafted whole. | Owner rulings; keep/retire ledger; stage flow step 3; Budget stage 5; Stage 0 "Rule 2 scope" |

## Convergent roots

Each root folds once; every finding it covers is listed.

| Root | Findings | Disposition | Where in the spec |
| --- | --- | --- | --- |
| Heading fragments printed by shipped binaries; a redirect cannot carry a `#fragment` | K-M1, X-M5, S-M6 | Folded | Stage 0 "Shipped anchors"; outline contract table; chain step 1 `pinned` |
| Budget: 350K per page below the measured floor, shares summing to 20M, extend arithmetic | X-M1, S-M7, K-M5 | Folded (derivation, counting rule, pilot, planned 2a/2b); ceiling became O1, ruled as R8 | Budget; stage flow step 2; O1 |
| New facts filed before drafting fail `check:provenance` | X-M6, S-M4, C-m2 | Folded | Page chain steps 1 and 2 and the independence paragraph |
| Post-chain edits (consistency read, owner fold, site round) break the brief | C-M7, X-M7, K-m1, C-M3 | Folded | "Edits after the chain" |
| `check:procedures` cannot tell working from broken commands | X-M2, X-M3, X-M4, C-M4, C-M5, K-m3, S-m8, X-m3 | Folded by dropping the new check; flag pairing extends `check:symbols` | Stage 0 "Flag pairing"; Testing 2 |
| Vacuous passes: provenance with no briefs, stage 1 with no failing criterion, consistency read with no output | C-M1, C-M6, X-m5, C-M7 | Folded | Stage 0 "Brief coverage"; Stage 1; stage flow step 4 |
| Chain gate is a subset of the CI checks that read the arms | C-M2, X-m1, K-m2 | Folded | Stage 0 "Docs gate"; chain step 3; stage flow step 7 |
| "The 2026-09-08 standard stands" | S-M1 | Folded as a keep/retire ledger | "The 2026-09-08 docs standard" |
| Freeze-lift list and site-agent write path | S-M3, K-M4, C-M3 | Folded | Stage 0 "Freeze lift" and "Site-pass rule" |
| Release while arms are mixed | K-F1, K-M2 | Folded as an invariant, not a fork | Stages, "Every stage merge leaves `main` releasable" |

## Verification notes

- `check-provenance.mjs:591` returns no defects when no brief exists (corrected in the second
  fold; `:392` is the tag check); `UNCITABLE_TAGS` includes
  `candidate` (`:88`). Front-door briefs already have a track name, `front-door`
  (`docs/internal/briefs/README.md`, "Where briefs live"), which closes C-M1's path question.
- `cairn doctor examples/showcase`, `cairn doctor --bogus`, and `cairn nosuch` each exit 3 on the
  installed 1.1.0 (run 2026-09-26). No exit code distinguishes them.
- `tool/testdata/flags.json` is a flat union written by `TestCommittedFlagListMatchesTheCommandTree`
  (`tool/cmd/cairn/flags_test.go`), whose `treeFlags` already walks every command. `check:symbols`
  resolves shell-fence flags against it and against `create-cairn-site`'s parser
  (`check-symbols.mjs:14-19`). This is the whole basis of the flag-pairing mechanism.
- `layout.go:24` (`fixAnchorBase`), `report.go:70-80` (`docsBaseAdmin` plus `docsAnchor`),
  `fixes.go` (`Anchor:` fields), and `check_referrer.go:36` print `is-it-working` fragments;
  `conditions.ts` carries 26 `docsAnchor` lines; `tool/v1.1.0`'s `conditions.json` carries 25.
- `docs-page-chain.js` already supports `pinned` slugs and a `toolGate` (`:18`, `:32`, `:139`,
  `:164`).
- Pass A: "the page chain alone was 2.64M over 24 agents" and "A contract page costs about 900K
  tokens" (`docs/HISTORY.md`). The counting rule (input, output, cache creation) and
  `session-ledger.ts` are in the reset's record (`docs/HISTORY.md`; the script is at
  `a8c57b4a^:scripts/docs-readers/session-ledger.ts`).
- The 40 percent figure is from `2026-09-21-draft-docs-design.md:191-193`, not pass A. Pass A's
  claim mining filed 51 of 61 statements and cut 10 (`docs/HISTORY.md`).
- S-M2 reading check. Rule 2 of the 2026-09-08 standard (`:68-69`) and the `writing-voice` skill
  (`SKILL.md:74-76`, "stop after each section and let a reader see it before the next one
  starts") are about the drafting process, not page structure. The reviewer read it correctly, so
  it is not refused. The global `CLAUDE.md` summary ("carries one section per read") is the text
  that misreads it (erratum 3).
- The site round follows all drafts: the `one-release-then-model-sites` memory, "REVISED ORDER":
  "the DRAFT DOCS are written first. Then each site is updated and rewritten, and that round tests
  the draft docs."
- Sheet 2 starts at `https://cairn.pub/` (human-reads file, Sheet 2), and cairn.pub is
  un-pinnable since `0.95.0` (`docs/STATUS.md`).
- Shipped content points at doc paths in code spans: `skills/cairn-extend/SKILL.md:29-30` and three
  scaffold template comments. `package.json` `files` ships `skills` and `claude`.

## Contract lens

| ID | Disposition |
| --- | --- |
| C-M1 | Folded: Stage 0 "Brief coverage" (rebuilt-arms list, unit test); front-door path already exists. |
| C-M2 | Folded: Stage 0 "Docs gate"; stage flow step 7 merge gate adds `make -C tool check`; outline contract table lists pinning scripts and `docsAnchor` values. |
| C-M3 | Folded, not a fork: the 2026-09-21 ruling already settles direct site edits; option (a)'s brief-sync lands in "Edits after the chain", and Stage 0 rewrites the `CLAUDE.md` cross-repo line. |
| C-M4 | Folded by the redesign (no live runs; parse-level coverage stated honestly, zero-command vacuity moot). Part refused: an exit-code and JSON-schema oracle for live runs, since no exit code distinguishes a broken command and doctor's JSON is already pinned by the Go schema tests. |
| C-M5 | Folded: no Go toolchain is needed in `test.yml`, since `check:symbols` reads the committed `flags.json` and `tool.yml`'s Go test holds it to the tree; the docs gate is a named script. |
| C-M6 | Folded: "Stage 1: reference" (outside the chain, no briefs, record with a failing criterion). |
| C-M7 | Folded: stage flow step 4 (record, kept even when empty); "Edits after the chain". |
| C-m1 | Folded: Stage 0 "Chain and agents", with a one-page dry run as proof. |
| C-m2 | Folded: page inputs write to the per-page record, file `[verified]` with `Source:`, and use Edit (ids are random, so no pre-minting). |
| C-m3 | Folded: the site round starts after stage 5 merges; "each" dropped. |
| C-m4 | Folded: the stop fires when two pages in one arm escalate. |
| C-m5 | Folded: proofs on the freeze grep and the owner-fact items; ROADMAP drops the inputs the retired list names. |
| C-m6 | Folded: Testing 4 (Logs table; fixed or filed through the site-round rule). |

## Mechanics lens

| ID | Disposition |
| --- | --- |
| X-M1 | Owner fork O1 (ceiling), ruled as R8; per-agent basis, agent counts, pilot, and 80 percent headroom folded into Budget. Its option (c), thinning the chain, was not taken at the fold; R8 takes a measured form of it (scoped re-review, kept only if the pilot's cross-regression rate is rare). |
| X-M2 | Folded: no command runs for real; the exit-3 evidence is in Testing 2. |
| X-M3 | Folded: `npx create-cairn-site` flags are covered by `check:symbols`; Stage 3's coverage claim is dropped. |
| X-M4 | Folded, path (b)'s flag half: the per-command map extends `flags.json`. Part refused: a live `doctor` Go test, since against the showcase it can assert nothing (exit 3, two structural UNCHECKED lines). |
| X-M5 | Folded with the anchor root. |
| X-M6 | Folded with the fact-tag root: page inputs file `[verified]`; the drafter files nothing. |
| X-M7 | Folded with the brief-sync root. |
| X-m1 | Folded with the gate root. |
| X-m2 | Folded: Stage 0 "Chain and agents" lists each runner and drafter edit. |
| X-m3 | Folded: flag pairing is an extension of `check:symbols`, not `--help` scraping. |
| X-m4 | Folded: chain step 3 (Vale on the page path, the not-this-page rule); Edit-only fact writes. |
| X-m5 | Folded: Stage 1 runs outside the chain. |
| X-m6 | Folded: page counts exclude READMEs and the per-version records; Exemplars gives the arm-to-slice map and the gap cases; page inputs do the trimming. |

## Risk lens

| ID | Disposition |
| --- | --- |
| K-M1 | Folded with the anchor root. Part refused: legacy `<a id>` anchors for renamed headings, since neither `docs-links.mjs` nor cairn.pub's renderer is verified to honor them; listed headings stay verbatim instead. |
| K-M2 | Folded: the releasable-at-every-merge invariant, the outline's repo-wide grep over `skills/`, `claude/`, and the template, and the `## Unreleased` entry with `Consumers must:`. Part refused: a check against the last tarball's paths, since an installed tarball carries its own docs and so stays self-consistent, and the grep catches every in-tree reference at rename time. |
| K-M3 | Folded: the claim inventory in page inputs, `[external]` vendor facts, and the fact read's carried-claim check. |
| K-M4 | Folded: write path and in-flight file-not-fix rule in Stage 0; the site round follows stage 5. Part refused: rebasing before the consistency read, since no site round runs concurrently with a stage. |
| K-M5 | Folded: pilot at stage 2a with the first owner read, 2a/2b planned as mergeable, ceiling headroom; the ceiling itself is O1, ruled as R8. |
| K-m1 | Folded: scoped reviews in "Edits after the chain"; stale facts fixed or retagged `[docs-drift]` in chain step 4. |
| K-m2 | Folded: the docs gate, the contract table's pinning gates, and the `check:editor-quotes` floor. |
| K-m3 | Folded: no live runs, so the offline-allowlist and build-from-HEAD questions are moot. Part refused: a per-page tool-version line on arm pages; the contract pages already pin `version.Documented`, and the site round runs the real binary. |
| K-m4 | Folded: page inputs retrace facts whose only source is an arm page. |
| K-m5 | Folded: stage flow step 7. |
| K-F1 | Folded, not a fork: `CLAUDE.md` already says `main` is always releasable and fixes the release triggers; option (a) would contradict them and option (c) is cairn.pub's own pass. |

## Consistency lens

| ID | Disposition |
| --- | --- |
| S-M1 | Folded: the keep/retire ledger. |
| S-M2 | Owner fork O2, after verifying the reading is correct (see the notes), ruled as R9 (its option A). |
| S-M3 | Folded: the facts README, `docs-register.md`, the `cairn-pass` skill, and the `docs-reset-initiative` memory join the list; the write path is ruled as method. |
| S-M4 | Folded with the fact-tag root. Part refused: a separate verification agent before the draft, since page inputs are already independent of the drafter and the fact read re-verifies every cited fact; an extra agent on every page costs more than the risk it removes. |
| S-M5 | Folded: attribution corrected; the claim inventory is the measured control. |
| S-M6 | Folded with the anchor root; listed headings are kept, so `conditions.json` needs no change. |
| S-M7 | Owner fork O1, ruled as R8; counting rule, derivation, and the 45M cap's retirement folded. |
| S-M8 | Folded: Testing 4 repoints Sheet 2 to GitHub `main` and updates the header before the round. |
| S-m1 | Folded: the outline lives in the stage plan; the owner read counts as one execution sitting. |
| S-m2 | Folded: stage records go to HISTORY. |
| S-m3 | Folded: `check:visuals` in the gate, a `figure-verifier` read, figures marked in the outline. |
| S-m4 | Folded: `docs/README.md` joins stage 5 as an index; the root `README.md` is out of scope; READMEs are out of the arm counts. |
| S-m5 | Folded: the per-version records are exempt and maintained in place. |
| S-m6 | Folded: the retired-rulings list keeps the register's track profiles and the scripter profile; Stage 0 updates the drafter definition and the briefs README. |
| S-m7 | Folded: one line each for reset rulings 5, 6, and 8 to 14. |
| S-m8 | Folded: the Doc Detective citation left with `check:procedures`. |
| S-m9 | Folded: the theme-guide input moves to the stage 2 outline; the claims audit stays post-`beta.1`. |
| S-m10 | Folded: stage 2 takes three owner-read pages, within R3. |

## Owed errata and planned amendments

The spec does not edit these; each is owed or planned.

1. **Erratum, `2026-09-08-docs-standard-design.md`:** a superseded-in-part note pointing at the
   new spec's keep/retire ledger, so a reader holding the standard does not treat retired units
   as live.
2. **Erratum, `2026-09-23-docs-reset-design.md`:** a note that rulings 2 to 4, 7 to 12, and 14,
   the 0.7M-per-page basis, and the 45M program cap are retired or replaced by the 2026-09-26
   spec.
3. **Erratum, global `~/.claude/CLAUDE.md` (Writing voice):** "carries one section per read"
   restates standard rule 2 as a page-structure rule; the source rule governs drafting. Correct
   it with R9's outcome (rule 2 governs front-door drafting only), together with the
   `writing-voice` skill line; Stage 0 "Rule 2 scope" carries both.
4. **Record note, the handoff (open question 6)** attributes the 40 percent figure to pass A,
   following the `draft-docs-initiative` memory; the source is the 2026-09-21 spec's review.
5. **Planned amendment (Stage 0), facts README:** new facts from the chain are filed `[verified]`
   by the page-inputs agent rather than `[candidate]` pending the fact read. Independence from the
   drafter is kept; the mechanism changes.
6. **Reading taken within R1:** the spec adds `docs/README.md`, the arms' parent index, to the
   front door beside "the arm READMEs". It treats that as within R1, not a change to it, and does
   not ask (second fold).

## Second fold

Source: `2026-09-26-draft-docs-approach-fold-verification.md` (0 blockers, 2 majors, 6 minors),
against the spec at `5a8433bd`. The conductor accepted its machinery verdicts. Every finding is
folded; none is refused.

| ID | Disposition |
| --- | --- |
| M1 | Folded: brief coverage is keyed by rebuilt page path, appended at each stage merge; the exemption list is gone and the unit test plants a listed path with no brief (Stage 0 "Brief coverage"; stage flow step 7). |
| M2 | Folded: stage 0 recounted at 13 items and 2.5M after the ledger cut; the total is about 43M (36M if every page is accepted in round 1); within 24M about 6M remains, about 15 of the 45 arm pages. R8's form is unchanged (Brief; Budget). |
| m1 | Folded: cross-regression is mechanical everywhere (a reviewer that returned `accept` in round 1 returns `fix` in round 2), derived from `record.rounds[].reads`, no classifier (Stage 0 "Scoped re-review"; stage flow step 2). |
| m2 | Folded: the two-escalations stop is dropped; an escalation is the conductor's call and reaches Geoff only on scope or taste ("Checkpoints and stops"). This supersedes C-m4's disposition. |
| m3 | Folded: the pilot owner read and the pilot checkpoint question are one sitting (stage flow steps 2 and 5; "Pilot checkpoint"). |
| m4 | Folded: the citation is `check-provenance.mjs:591`, with `:458` for a missing briefs directory (verified); the verification note above is corrected too. |
| m5 | Folded: the brief names four check extensions and the docs gate script. |
| m6 | Folded: the shipped-anchor list's sources shrink to released tool tags' `conditions.json` plus `check_referrer.go`'s one, and the spec names the residual hole it guards. |
| Machinery | Ledger restore cut: spend is scored with `/cost`, with a stage 0 fallback line if `/cost` omits the chain's agents (Budget "Counting rule"). `test.yml` calls the docs gate script (Stage 0 "Docs gate"). Flag map, editor-quotes floor, scoped re-review switch, and the stage 1 record kept as they were. |
| Section 5 | Folded: erratum item 6 no longer plans a flag to Geoff. |

## Prose review fold

Source: `2026-09-26-draft-docs-approach-prose-review.md` (0 blockers, 7 majors, 7 minors, 3
suggestions), against the spec at `61ca8c55`. The conductor accepted every finding; each was
checked against its cited source first. None is refused. Owner ruling R10 (Geoff, 2026-09-26)
landed in the same fold.

| ID | Disposition |
| --- | --- |
| M1 | Folded, R8's form kept: pass A's basis is recorded as subagent tokens (`HISTORY.md`, "Ceiling 3.5M subagent tokens"), about 900K per page over three rounds; the spec says its chain (no profile grader, one redraft) assumes faster convergence, gives the plan as a range, and the pilot measures which end holds (Brief; Budget; "Pilot checkpoint"). With M6 and s3 folded the range is about 46M to 57M, not 43M to 54M. |
| M2 | Folded: the rate counts only pages where exactly one reviewer returned `fix` in round 1; fewer than three makes the pilot inconclusive and the question prices both chains ("Pilot checkpoint"). |
| M3 | Folded: "plans within 24M"; approving the spec authorizes stages 0, 1, and the 2a pilot, the rest waiting on the pilot question (Brief; Stages; "Pilot checkpoint"). |
| M4 | Folded: verified at `check-provenance.mjs:557` (a brief is keyed by page file name) and `briefs/README.md` ("Where briefs live"). Arm READMEs brief under their own arm's track; `why-cairn.md` and `docs/README.md` under `front-door` (Stage 0 "Brief coverage"). |
| M5 | Folded: the 40 percent is the container's share on two admin pages (a 60 percent gap), and 61/51/10 is a disposition count on three contract pages, not a measured control (chain step 1). |
| M6 | Folded: stages 0 and 1 one pass, stage 2 as 2a and 2b, 2b carries no new outline, extend's freeze lifts at 2b, stage 2 overhead 2M (Brief; Budget; Stages; rulings list; flow step 7). |
| M7 | Folded: R5 governs arm order; the pilot takes hard pages on purpose (note under the rulings table; flow step 2). |
| m1 | Folded: the all-accepted figure recomputed. At the old pricing it was about 33M; with M6 and s3 it is about 36M, and the spec states the recomputed figure. |
| m2 | Folded: `check:symbols` reads shell-tagged fences only (`check-symbols.mjs:74`); it fails a `cairn` line whose first word is not a command, with or without flags (Stage 0 "Flag pairing"; Testing 2). |
| m3 | Folded: Stage 0 "Chain and agents" amends the facts README paragraph (page inputs file `[verified]`; the drafter never files). |
| m4 | Folded: "by whoever makes the edit". |
| m5 | Folded: the fallback switches to a counter that includes the chain's agents and records which. |
| m6 | Folded: the merge waits for Geoff's read and its fold (flow step 7). |
| m7 | Folded: two exemplars per page type, named on each page's line (flow step 1). |
| s1 | Folded: reference is 29 pages plus its README (verified, 30 files), and stage 5 owns the README (Budget; Stage 1). |
| s2 | Folded: the docs gate covers checks that read arm content; `check:package`, which checks the arm paths ship, keeps its own step. |
| s3 | Folded by pricing, not by stating: the indexes are not all short (`extend/README.md` has 10 sections, `reference/README.md` 4), so each index is priced at twice its 0.4M share like `why-cairn.md`, and stage 5 is 6.5M. |
| R10 | Added: owner ruling row; Stage 0 "Review page (R10)" with the round-trip proof and the PR-review fallback (asked before switching); flow steps 1, 5, and 6; budget inside stage 0's share (about 0.2M) and each stage's overhead. |

**Resulting numbers.** Stage shares 2.5M, 3.5M, 22M, 6M, 5.5M, and 6.5M, about 46M as priced
and about 57M at pass A's rate; about 36M if every page is accepted in round 1. Within 24M, stages
0, 1, and 5, the stage 2 to 4 overheads, and the pilot take about 21M, which leaves about 3M, about
10 of the 45 arm pages.
