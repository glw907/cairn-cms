# Plan two adversarial review: plannability and gradeability

One lens only: can each of the 39 tasks be executed by `cairn-implementer` and graded by
`diff-reviewer` from the diff plus the implementer's report, inside
`~/.claude/workflows/pass-execute-chains.js`? Read-only review, 2026-09-08, against
`docs/superpowers/plans/2026-09-08-docs-toolset-pass.md` REVISION 1 and `main` at `d565ab77`.

**Verdict: executable with fixes.** The task shapes, files, and criteria are unusually concrete
for a docs pass, and most criteria are machine-checkable. Three defect classes stop it as written:
cross-chain code dependencies that cannot resolve inside a chain's own worktree (G2-3, G2-4, G2-6,
G1-3, G1-4), tasks that require capabilities `cairn-implementer` does not have (network fetch in
C2/C3, subagent dispatch in D2, a scheduled routine in G2-8, conductor token accounting in D3),
and a chain-halting owner block placed mid-chain (G2-7) that transitively blocks chain D. Four of
these need re-planning, not editing.

## How the harness constrains a task

- `pass-execute-chains.js` takes **one** `args.gate` string for the whole run. The plan names a
  different gate per task. The implementer prompt injects `Gate command: ${a.gate}` and the
  reviewer verdicts on `review.gate === "pass"`. Per-task gates are not expressible. Fix: pass the
  strictest gate (`npm run check && npm test`) as `args.gate` and let the plan's per-task gate be
  advisory, or add a `t.gate` field to the workflow.
- `runChain` halts a chain at the first non-accepted task and marks the rest `deferred`. There is
  no wait, resume, or skip primitive. Any "stop and report" task ends its chain for that
  invocation; resuming means a second workflow call with the remaining task list.
- `cairn-implementer` tools are Read, Write, Edit, Bash, Grep, Glob. No WebFetch, no WebSearch, no
  Agent, no Skill.
- `diff-reviewer` reads `git status`, `git diff`, surrounding code, and the implementer report. It
  cannot see anything outside the repo and cannot verify a claim recorded only as prose.

## Repository facts checked (criteria that depend on them)

| Claim in the plan | Verified | Note |
|---|---|---|
| `docs/admin` nine pages, `docs/editors` eight | Yes | `docs/extend` 31, `docs/reference` 25 including READMEs |
| `measure-prose.mjs` supports `--until` and `--json` | Yes | C1/C4 criteria are runnable |
| `measure-prose.mjs` exports a sentence splitter | **No** | zero `export` statements; it is a CLI only |
| Five Cairn Vale rules already exist | Yes | Announcement, ContrastFrame, Marketing, TwoHeadedHeading, VirtueClaims |
| Vale pinned to 3.15.1 in CI | Yes | `.github/workflows/test.yml:102` |
| `.vale.ini` exempts `docs/superpowers/**`, `docs/internal/**` | Yes | |
| `npm run check` is a composite of docs gates | **No** | `check` is `svelte-check --tsconfig ./tsconfig.json` alone; docs gates run as separate CI steps |
| `docs-sweep.md` carries findings `D1`-`D30` | Partly | findings are numbered 1-30 with no `D` prefix |
| `docs-sweep.md` carries `F7`-`F10` | **No** | the `F` ids live in `exports-sweep.md` |
| `yaml` available for the brief parser | Yes | runtime dependency |
| `check:figures` on `main` | **No** | it is uncommitted working-tree state, as the plan says |

## Task table

Columns: criteria gradeable from diff + report / interfaces consistent with producers and
consumers / dependencies real and complete.

| Task | Grad. | Iface | Deps | Defect |
|---|---|---|---|---|
| P1 | N | Y | Y | Its substance is verifying files under `~/.claude`, `~/.dotfiles`, `~/Projects/poplar`. The diff carries only prose asserting the verification ran; the reviewer cannot confirm it. Requires pasted command output in the report as the gradeable artifact. Deliverables says 1; Files creates 2 and modifies 1. |
| H1 | Y | N | Y | `tier` is fixed as "one of `gate`, `read`, `owner`, `unverified`" and then a fifth value `retired` is introduced. G2-6 inherits the same split enumeration. Fix the tier set to five up front. |
| H2 | Y | N | Y | Produces `--track` and `--json` only, but H3, H7 and H9 gates demand per-page or per-subset scoping ("scoped to the one page", "over the harvested subset"). No such flag is specified anywhere. Also modifies `package.json`, which the Reconciliation table lists as written by G1-7 and G2-8 only. |
| H3 | Y | N | Y | Gate `check:fact-coverage -- --track extend` "(scoped to the one page)" is not runnable against H2's stated CLI. |
| H4 | Y | N | N | Requires the twelve canonical ids including the front-door split, but the global constraint says every artifact before G1-3 merges names eleven, and G1-3 is another chain. The published set is defined as `package.json` `files` plus root `README.md`, which also ships `CHANGELOG.md` and `skills/**`; the criterion then enumerates only the four tracks plus three front-door pages. Two rules, two different sets. |
| H5 | Y | Y | Y | Sound. Sweep findings 16 and 21 are assigned to no harvest task (union of H5-H10 covers 1-15, 17-20, 22-30). |
| H6 | Y | Y | Y | Sound. |
| H7 | N | Y | Y | "the first half of the track, in path order" fixes no boundary, so "every page in the first half has entries" is not checkable and the H7/H8 partition is not reproducible. Name the split page. |
| H8 | Y | Y | N | Criterion "every page under `docs/extend/` appears in `page-types.md`" consumes H4, which is not a declared dependency. |
| H9 | N | Y | Y | Same undefined "first half" as H7, over 25 reference pages. |
| H10 | Y | N | N | Consumes "docs-sweep findings F7, F8, F9, F10"; those ids are in `exports-sweep.md`. Also asserts against `page-types.md` (H4) without depending on it. |
| H11 | Y | N | Y | "That entry is the fixture G2-5 reproduces" is wrong: the front-door fixture is G2-4's. |
| H12 | Y | Y | Y | Blocked-on-owner mid-chain, see the blocking section. Feasibility: one Sonnet dispatch must read five ledgers covering 76 pages to collect every `unverified` row. That plausibly exceeds a single context. Extract the rows with a script (a `--json` mode on `check:fact-coverage` or `check:ledger`) rather than by reading. |
| H13 | Y | N | Y | Files list is conditional: "`package.json` if the mode gets its own script name". Name the script or state that the mode ships flag-only. Its output is consumed by D1, which does not depend on it. |
| C1 | Y | N | Y | Contradiction: the entry id is fixed as `<type-id>-<source-slug>`, yet the SQLite entry's file is `concept-sqlite-scope.md` while its required type is `front-door-evaluator`. `corpus_entry` is a brief field, so the id format is load-bearing. |
| C2 | N | N | Y | Requires fetching external candidates and determining licenses. `cairn-implementer` has no WebFetch and no WebSearch; only `curl` through Bash, in a sandbox whose network access the plan never states. Also cites a manifest `note` column that C1's sixteen-column set does not contain. |
| C3 | N | Y | Y | Same fetch problem, plus "hand-copy each entry" and "chosen by hand", which name a human act inside an implementer dispatch. |
| C4 | Y | Y | Y | Gradeable, but `reference-only` rows require re-fetching the source to measure it. Same network question. |
| C5 | Y | Y | Y | Blocked-on-owner, last in chain: stops cleanly. |
| G1-1 | Y | N | Y | Requires `type` to be one of the twelve canonical ids while the global constraint says eleven until G1-3, which is two tasks later in this same chain. |
| G1-2 | Y | Y | Y | Sound. |
| G1-3 | Y | N | N | "The registry table's type ids match `docs/internal/record/docs-rebuild/page-types.md` exactly, checked by name" reads a chain-H file that does not exist in the G1 worktree. Not gradeable there and not a declared dependency. |
| G1-4 | Y | N | N | "It refuses a brief whose `corpus_entry` names a manifest row whose `approved` column is empty" consumes the chain-C manifest, absent in the G1 worktree; the pass fixture cannot be built without inventing one. |
| G1-5 | Y | Y | Y | Sound. |
| G1-6 | N | Y | Y | "Every one of the seven rules has a fixture that fires and a fixture that passes, and all fourteen run in the unit test" contradicts the criterion two lines above it, which says rules 2 and 3 are deliberately not implemented and belong to markdownlint. Ten fixtures, not fourteen, or the two markdownlint fixtures move to G1-7. |
| G1-7 | Y | N | Y | "`npm run check` runs `check:anatomy`, `check:headings`, and `lint:markdown`" silently converts `check` from `svelte-check` into a composite. That changes the gate every other task in the pass and every CI job runs, and it is stated nowhere. Also "clear or scope every existing violation" over 76 published pages under stock markdownlint is unbounded work inside a task whose deliverable count says 3. |
| G2-1 | Y | Y | Y | Vendoring the PDF needs a network fetch, same question as chain C but a single file. |
| G2-2 | Y | N | N | Files list is conditional: "`ParagraphBounds.yml` or the equivalent script check if Vale cannot hold a paragraph measure". The KEP-2400 fixture needs the corpus sample, which chain C is concurrently moving from `docs/internal/record/2026-09-08-polish-inputs/` to `docs/internal/corpus/`; whichever merges second breaks a path this criterion names. |
| G2-3 | Y | N | N | Two blockers. It depends on G1-1's `scripts/checks/brief.mjs`, a file in another chain's worktree. And the criterion "the sentence splitter is imported from `measure-prose.mjs`" cannot hold: that script exports nothing today, and G2-3's Files list does not include modifying it. |
| G2-4 | Y | N | N | Hard blocker. "The token classes are imported from `check-fact-coverage.mjs`" imports chain H's file, which does not exist in the G2 worktree. A `grep`-provable single definition across two chains is unachievable without moving `check-fact-coverage.mjs` into G2 or into a shared preflight task. |
| G2-5 | Y | Y | Y | Gradeable. Depends on the scope file G1-4 creates; see the shared-scope note below. |
| G2-6 | Y | Y | N | Declares the cross-chain edge honestly and then says "the task waits rather than inventing a schema". The workflow has no wait primitive; the implementer will block or invent. Make `ledger-schema.md` a preflight (P) deliverable so both chains branch from it. |
| G2-7 | Y | Y | Y | Criteria are gradeable, but the block placement is wrong; see below. |
| G2-8 | N | N | Y | Three problems. "Create the scheduled link-rot routine through the `schedule` skill" needs the Skill tool, which `cairn-implementer` lacks. "The tell scanner is invoked in report mode" depends on plan one's tellgrader, a workstation binary CI does not have; the criterion does not say what CI does when it is absent beyond "non-blocking". And "an exclusion with no named remover fails the scope file's own self-check, which runs inside `check:anatomy`" asserts behavior of a G1 script that is not in this worktree. |
| D1 | N | Y | N | Depends on H3, C5, G1-7, G2-8, but consumes `page-types.md` (H4) and `drafting-dispatch.md` (H13), neither declared. The quarantine is also not executable by one dispatch: the implementer must produce a diff that replaces `add-a-custom-admin-screen.md` while never opening it, and `diff-reviewer` reads the old text to grade "no unchanged prose line". This needs a drafter dispatch under quarantine plus a separate assembler, which the one-implementer chain does not provide. |
| D2 | N | Y | N | Steps 2 and 3 dispatch a fresh reviewer and a separate coverage-diff agent, "a different model family from the drafter". `cairn-implementer` has no Agent tool. These are conductor acts, not task steps. Also runs `check:ledger` over all five ledgers, which requires H5, H6, H8, H10, H11 and H12 merged, while chain D depends only on H3. |
| D3 | N | Y | Y | The reader test is a human sitting (correctly marked blocked-on-owner and last in chain), but "the token spend for the page end to end broken down by step" is conductor accounting the implementer cannot observe. Say the conductor supplies the numbers and the task records them. |
| R1 | Y | Y | Y | Sound. |
| R2 | Y | N | Y | "`docs/STATUS.md` ... its next action is authoring plan two" should read plan three; plan two is this plan. |

Totals: criteria not gradeable as written 10 of 39; interfaces inconsistent 17 of 39;
dependencies incomplete or unresolvable 13 of 39.

## The cross-chain problem, stated once

The plan says the H1 to G2-6 edge is "the one cross-chain edge inside this plan besides the join".
It is not. Counted from the task text there are at least six:

1. G2-6 consumes H1's `ledger-schema.md` (declared).
2. G2-3 consumes G1-1's `scripts/checks/brief.mjs` (declared as a dependency, not as cross-chain).
3. G2-4 imports H2's `scripts/checks/check-fact-coverage.mjs` (undeclared, blocking).
4. G1-3 grades against H4's `page-types.md` (undeclared).
5. G1-4 reads chain C's corpus manifest (undeclared).
6. G2-2's fixture cites a corpus sample chain C moves (undeclared path race).

Every one of these is a file the consuming chain's worktree does not contain, so the implementer
sees a missing file and either stubs it or reports BLOCKED, and the reviewer cannot grade the
criterion either way. Two fixes cover all six: move the shared substrate (`ledger-schema.md`,
`brief.mjs`, `check-fact-coverage.mjs`, `page-types.md`) into the preflight chain so all four
producers branch from it, and move the corpus-approval dependency out of G1-4 into D1, where the
manifest exists.

`scripts/checks/docs-standard-scope.json` is a milder case. The Reconciliation table handles the
merge, but inside a worktree G2-3 and G2-5 are told to modify a file G1-4 creates in another
branch. Each G2 task must be told to create it if absent.

## The five owner blocks

The plan marks P1, H12, C5, G2-7 and D3. What the workflow does at each:

| Task | Position in chain | Behavior on block | Clean? |
|---|---|---|---|
| P1 | Alone, in the main loop before any chain | Conductor stops the pass by hand; no workflow involved | Yes |
| H12 | Twelfth of thirteen | `runChain` halts; H13 marked `deferred`. Chain H must be re-invoked after the sitting with a one-task list | Acceptable, but the plan never says the resume is a second workflow call |
| C5 | Last of five | Chain ends; nothing deferred | Yes |
| G2-7 | Seventh of eight | Chain halts; **G2-8 deferred, and D depends on G2-8**, so an uncommitted owner working tree stops the whole pass at the join | **No** |
| D3 | Last of three | Chain ends; the owner read is correctly excluded from the criteria | Yes |

Fix for G2-7: make it the last task in G2 and move the CI wiring it does not touch into G2-8
ahead of it, or make G2-8 depend on G2-4, G2-5, G2-6 only and let G2-7 append its own CI step.
The plan already says no other task reads the figures paths, so the dependency is avoidable.

## Ceiling and gate plausibility

- The per-chain allocation sums to 8.9M (0.1 + 4.0 + 0.6 + 1.6 + 2.0 + 0.4 + 0.2) against a stated
  8.8M ceiling described as leaving "the remainder slack". There is no remainder. The pass-end
  ritual then scores "against the 9.0M ceiling". Three numbers for one budget.
- H at 4.0M covers 76 pages of claim-level harvesting across ten dispatches, each a fresh context
  that re-reads the plan's global sections, `ledger-schema.md`, and the sweep. H7 and H9 each
  carry a dozen or more pages in one dispatch. 4.0M is the optimistic end of the review's own
  2.0M to 4.5M for unit 1, and this plan adds `check:fact-coverage` and the demonstration harvest
  to that unit. Expect H to overrun first.
- G1-7's "clear or scope every existing violation" under stock markdownlint over the published set
  is the single largest unsized item in the plan.
- **Worktree provisioning is unspecified.** Every chain's gate runs `node` scripts and G1/G2 run
  `npm run check && npm test`, which needs `node_modules`, `svelte-check`, and the Playwright
  browsers for the component project. The plan never says the four worktrees get their own
  `npm install`, and CLAUDE.md's standing gotcha is precisely that a worktree's `node_modules`
  can symlink back to the main checkout. Add an install step to the chain preamble.
- Two concurrent full gates is stated as the machine ceiling and the chain assignment respects it.

## Smaller corrections

- H5/H6/H7/H8/H9/H10 cite sweep findings as `D<n>`; `docs-sweep.md` numbers them 1 to 30 with no
  prefix. Either renumber the sweep or state the mapping once in the Ruled inputs.
- Sweep findings 16 and 21 are assigned to no harvest task.
- Deliverable counts follow no stated rule: P1 says 1 for three files, H1 says 3 for two, G1-4
  says 4 for six. Either count files or count artifacts, and say which.
- The Reconciliation table omits `package.json` writers H2 and H13.
- H11's pointer to "the fixture G2-5 reproduces" should read G2-4.
- R2's STATUS criterion says plan two where it means plan three.

## What would make it executable

In dependency order:

1. Move `ledger-schema.md`, `brief.mjs`, `check-fact-coverage.mjs` and `page-types.md` into the
   preflight so the four producer chains branch from a common substrate. This resolves defects in
   G1-3, G1-4, G2-3, G2-4 and G2-6 at once.
2. Reorder G2 so the owner-blocked figures task is last.
3. Split D1 into a quarantined drafter dispatch and an assembler, and move D2's reviewer and
   coverage-diff dispatches to the conductor, where the Agent tool exists.
4. Decide the corpus fetch mechanism for C2, C3, C4 and G2-1: either the conductor fetches and
   hands the implementer local files, or the plan states that `curl` from the implementer sandbox
   works and the implementer proves it.
5. Settle eleven-versus-twelve types before H4 and G1-1 rather than at G1-3.
6. Add a `--page` scope flag to `check:fact-coverage` in H2, fix the H7/H8 and H9/H10 split
   boundaries by naming the page, and add `measure-prose.mjs` to G2-3's Files list.
7. Fix the numbers: one ceiling, the sweep id prefix, F7-F10's real file, and a stated worktree
   install step.
