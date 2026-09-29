# Draft docs harvest: review fold record

**Targets revised:** `docs/superpowers/specs/2026-09-29-draft-docs-harvest-design.md` and
`docs/superpowers/plans/2026-09-29-draft-docs-harvest.md`, from `add2517c`.
**Reviews folded:** contract (`CC-*`), mechanics (`MF-*`), risk (`DR-*`, with `DR-OC-*` for its
over-ceremony items), consistency (`CO-*`, with `CO-OC-*`).
**Totals:** 59 findings; 57 folded, 1 refused, 1 owner fork.

Each finding was checked against the worktree before its disposition. Spot checks that held:
cairn-pub's `package.json:15` pins `0.94.0-rc.1`; `git diff main...theme-identity-c` touches
`architecture.md`, `build-a-site-by-hand.md`, `share-a-draft-preview.md`, and
`migration-notes.md` under the arms; `f:65atya` (`facts/extend.md:143`) cites
`docs/admin/is-it-working.md:338`; 48 `Source:` lines in the container name an arm page;
`check:close` already runs `check:transcripts`, `check:visuals`, and `check:provenance`;
`test:node-projects` exists and excludes the component suite; `check-arm-indexes.mjs:32` indexes
extend at `docs/extend/README.md`; `upgrade-cairn.md` step 4 is `npx cairn-guidance install`.

## Dispositions

| IDs | Disposition | Where the revision carries it |
| --- | --- | --- |
| DR-2, CO-2, MF-3 | **Folded, as a decision, not a fork.** The file-disjointness premise is false (four deletion-list pages edited, about 57 bullets rewritten in place, `components.md` renamed). STATUS already orders pass C's `0.98.0` first, so one answer dominates: task 1 runs now, everything after waits for the theme merge and a `main` merge-in. | Spec H5 (marked corrected by the review, with the findings cited), "Timing"; plan Approach, Execution mode "Hold", task 2. |
| CC-1, DR-1 | Folded. Each claim carries a `lines` span; the verifier fails any uncovered non-blank line and an empty `claims`. | Spec "The claim ledger", "The verifier"; plan task 1 fixtures. |
| CC-3 | Folded. Scoped runs fail a missing ledger; `--pages` typos, absent directory, malformed JSON, page/location mismatch, and duplicate ledgers each fail; every failure is reported. | Spec "The verifier"; plan task 1. |
| CC-4, DR-5, CO-11 | Folded. `duplicate-of` is removed rather than resolved: it meant the same as `fact <id>` and the spec never said what its id named, so the leaner fix is one disposition (a Claude call CC-4 offers). Cross-chain rule: a match only on another chain's `[candidate]` files a verified `new-fact` in the auditor's own section. The reviewer's sample now covers near-miss mappings, new facts, judgment cuts, every `[rejected]` retag, and fan-in ids. | Spec "The claim ledger", "The audit" step 2 and reviewer paragraph; plan review focus 3. |
| CC-6, DR-3, CO-1, MF-2 | Folded. Audit step 5 re-sources every bullet citing a deletion-list page; task 6 owns the kept pages' sections and unsectioned bullets for this step (`f:65atya`); the verifier fails any container bullet whose `Source:` names a deletion-list page; `check:provenance` joins every audit gate. | Spec "The audit" step 5, "The verifier"; plan tasks 2 to 6 gates, task 6 outcomes. |
| DR-9 | Folded in part. A retagged or re-sourced bullet drops its quotation of the old page. Moving each facts file's `## Harvest record` out of the container is refused: both sections are part of the container's gated format (`check-facts.mjs:15,79`), and the measured leak is in bullets, which the fold covers. | Spec "The audit" step 5. |
| CC-2, MF-1, CO-3 | Folded. The kept set may be edited for link repair only; a changed `choose-an-ai-posture.md` sentence changes its brief in the same commit; `migration-notes.md:263` takes the `check:symbols` allowlist; each entry lands in `relink.json`. | Spec "Scope", "Delete and relink"; plan global constraints, tasks 8 and 9. |
| CC-5, DR-4, CO-4, DR-12, CO-OC-2 | Folded. The unmeetable clean-grep acceptance is replaced by an allowed-residue class list; the basename grep is link-shaped; the implementer prints and classifies the residue for the reviewer. DR-4's per-file `contract, unchanged` entries are carried by the class list instead of one `relink.json` row per golden. | Spec "Allowed residue"; plan task 9 discovery and acceptance. |
| CC-13, MF-4 | Folded. Task 8 splits into task 8 (gate narrowing, Opus, test-first against fixtures while the pages exist) and task 9 (delete and relink, Sonnet). The relink share is re-projected from the measured 204 plus 37 files. | Plan tasks 8 and 9, derivation table. |
| MF-5 | Folded. `docs-links` permanently accepts deletion-list links from dated records (`CHANGELOG.md`, `docs/internal/record/**`, `history/**`, `feedback/**`) and accepts `LEGACY_PATH_MAP` targets on the deletion list until the arm is rebuilt. | Spec "Gate narrowing"; plan task 8. |
| MF-6, CC-7 | Folded. `check:transcripts` and `check:visuals` join the narrowing list. Each arm has three states (absent, kept-only, rebuilt) read from `deletion-list.json`; the trigger is never a directory or index existing; extend's three fixtures are named. | Spec "Gate narrowing"; plan task 8 acceptance. |
| DR-OC-1 | Folded. One shared arm-state function carries the three-state test; each gate gets one narrowed-state test; full three-state pinning only where a contract rides (`check:arm-indexes`, `check:package-files`, readiness). | Spec "Gate narrowing"; plan task 8. |
| MF-7, DR-10 | Folded. The create-cairn-site prepack and test, and `test:emit`, join task 9's gate; the `AI_POSTURE_COMMENT_BLOCK` four-place lockstep is named. | Spec "Delete and relink"; plan task 9. |
| DR-7, CC-12, MF-14 | Folded. List mode holds only while the admin arm has no page; once it has any, `is-it-working.md` must exist and every shipped anchor resolve, so a rename fails instead of disarming. The list is `shipped-anchors.json` itself (MF-14 found every live anchor already in it), which drops the spec's separate committed list. CC-12's fixture states are named. `tool.yml` filters add `shipped-anchors.json`; task 2's anchor sources are widened. | Spec H5, "Gate narrowing"; plan tasks 2 and 8. |
| CC-8, DR-11, MF-13 | Folded. The deletion and kept lists are one committed `deletion-list.json` read by the verifier and the gates; the verifier fails when the list disagrees with the tree; the verifier test is fixture-only. | Spec "Scope", "The verifier"; plan global constraints, task 1. |
| CC-9, DR-6 | Folded, with the conventional fix: the pass record names the verifier's commit, and task 10 checks `git diff <task 7 main SHA>..origin/main` over the 49 paths before merging; a non-empty result or a modify/delete conflict stops the merge for a targeted re-audit. DR-6's `--ref` verifier mode is not built: the git diff detects the same edit with no new code. | Spec "The verifier"; plan task 7 ledger record, task 10. |
| CC-10 | Folded. A stale-`blob` re-audit's diff gets one `diff-reviewer` read. | Plan tasks 7 and 10. |
| CC-11 | Folded. `npm pack --dry-run` docs are exactly `docs/reference/**` plus the kept set. | Spec acceptance; plan review focus 6, task 9. |
| MF-8 | Folded. The conductor reads tokens from Agent usage blocks and the chains run's `spent`, re-projects per page line, and tasks 3 to 6 take one ledger row. | Plan counting rule, checkpoints, task 2, ledger. |
| MF-9 | Folded. No task edits a deletion-list page before task 9; a false claim is a `[rejected]` fact, overriding the implementer definition's fix-the-page rule. | Plan global constraints. |
| MF-10 | Folded. `npm ci` runs once in this worktree before task 1; the chain worktrees get none. | Plan Execution mode. |
| MF-11, CO-14 | Folded. Tasks 8 and 9 gate on `test:node-projects && check:close` (no browser, light lane) plus their named suites; `check:package` is no longer run twice; CI runs the component suite. | Plan tasks 8 and 9. |
| CO-12, MF-12 | Folded. Every merge and conflict goes to a dispatched Sonnet agent. The "keep both sides" rule is fixed: distinct ids are all kept; a same-id conflict keeps one bullet, retraced to source, and is reported. | Plan global constraints, Execution mode, task 7. |
| MF-15 | Folded. Auditors never edit `## Harvest record`, `## Provenance`, or another chain's section; counts live in the verifier output. | Plan global constraints. |
| DR-8, CO-5 | Folded. The spec states the real pin (`0.94.0-rc.1`, docs already 404) and the pin ceiling (the last release cut before the deletion merges); the close writes it into the cairn-pub handoff record, which a cairn-pub pass reads. No cross-repo edit or new mechanism. | Spec "Delete and relink" closing paragraphs; plan task 10. |
| CO-6 | Folded. The changelog entry carries one `Consumers must:` line (re-run `npx cairn-guidance install`), meeting the parent's shipped-skill trigger. | Spec changelog paragraph; plan task 9. |
| CO-7 | Folded as owed errata (below); the spec's acceptance now requires the errata as a STATUS open decision rather than the pointer that already exists. | Spec acceptance; plan task 10. |
| CO-8 | Folded. `docs-register.md`'s freeze line joins task 9's sweep; the two user-scope skills are owed errata; a STATUS watch covers the kept records' hardcoded paths. | Spec "Delete and relink"; plan tasks 9 and 10. |
| CO-9 | Folded. Step 4's scope is the deletion-list pages' sections; the kept pages' sections are out of scope except step 5 (task 6). | Spec "The audit"; plan tasks 4 and 6. |
| CO-10 | Folded. "Five batches, run as one rate-checkpoint batch and three parallel chains". | Spec "The audit". |
| CO-13 | Folded. The close names one `go-architecture-reader` per touched Go package and records the register-chain waiver with its reason. | Plan task 10. |
| CO-15 | **Owner fork: R1.** The re-derived plan (7.8 to 9.5M) exceeds the approved 7M, so the ceiling is Geoff's. | Plan "Rulings for Geoff". |
| CO-OC-1 | **Refused.** The verifier's fixture-only unit test is one cheap Node file and is the record the spec intends; tagging it for later removal costs more attention than it saves. | None. |

## Rulings for Geoff (verbatim from the plan)

**R1. Raise the pass's token ceiling from 7M to 12M?** The review enlarged the pass (coverage
spans, facts re-sourcing, two deletion tasks, about four times the relink files first counted),
and the re-derived plan is about 7.8 to 9.5M, above the approved 7M. **Recommendation: yes.**
- **Yes** builds the plan as written: 9.5M sits at 80% of 12M, so the global 80% stop fires only
  on an overrun, and the task 2 checkpoint still re-projects from measured cost.
- **No** keeps 7M: the 80% stop (5.6M) fires inside the audit chains on a run that stays within
  plan, so the pass stops at the task 2 checkpoint to ask again or splits, with the deletion
  (tasks 8 and 9) moving to a follow-up pass.

## Owed errata (ratified documents this fold did not edit)

**Parent spec** (`docs/superpowers/specs/2026-09-26-draft-docs-approach-design.md`):
1. Amendment "Release": cairn.pub pins `0.94.0-rc.1`, not `0.97.0`; `0.98.0` carries the old
   arms (the harvest orders after the theme lineage); the pin ceiling is the last release cut
   before the deletion merges.
2. Flow step 1 and R10: the outline is `docs/internal/outlines/<arm>.json`, reviewed as rendered
   cards with edits folded back to JSON; `relink.json` replaces the per-stage contract table
   grepped against today's pages.
3. Stages: a stage plan cites its JSON outline by path and commit, so plan approval stays outline
   approval (R3).
4. Flow step 7: the arm READMEs and `docs/README.md` are deleted; each rebuilding stage recreates
   its index.
5. Stage 0 "Shipped anchors": `check:readiness` checks live anchors against
   `shipped-anchors.json` while the admin arm is empty, and re-arms against
   `is-it-working.md` when the arm holds any page.
6. Stages' changelog rule: the harvest's `## Unreleased` entry names the removal once, with its
   `Consumers must:` line; later stage entries list only paths they restore or change.

**User-scope skills:**
7. `~/.claude/skills/cairn-pass/SKILL.md` close text ("Narrative arms are frozen … fixed on the
   page"): the deleted arms are empty until their stages rebuild them; a deficiency is filed
   into the facts container.
8. `~/.claude/skills/site-pass/SKILL.md` (the admin and extend pages as written): the same.

## Measures

- **New-mechanism findings:** 1 folded, 1 refused.
  - Folded: the claim line-span coverage rule (CC-1, DR-1). Source: line coverage as code
    coverage tools run it (Istanbul, c8: every executable line attributed or reported
    uncovered). Measured defect: an empty or partial ledger passes every original verifier rule.
  - Refused: DR-6's `--ref` verifier mode; a `git diff` over the 49 paths detects the same edit.
  - Mechanism removed: the spec's separate committed anchor list, replaced by the existing
    `shipped-anchors.json`.
- **Line counts:** spec 163 before, 261 after; plan 254 before, 339 after; 417 total before, 600
  after.
- **Token ceiling:** 7M pending R1; 12M (flag 9.6M) on yes, re-derived as 7.8 to 9.5M planned.
