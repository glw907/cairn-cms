# Draft docs on a conventional approach: design

**Date:** 2026-09-26. **Status:** amended 2026-09-29 (harvest, then delete; see the amendment section). Revision 2 folded four review lenses
(`docs/superpowers/research/2026-09-26-draft-docs-approach-fold.md`); owner rulings R8 and R9
(2026-09-26) settle its two open rulings; a second fold took the fold verification; a third took the
prose review and owner ruling R10. The 2026-09-30 errata application (owner ruling, Geoff) amends six passages in place per `docs/superpowers/research/2026-09-29-draft-docs-harvest-fold.md` ("Owed errata"). **Replaces:** the reader-validation line of
`2026-09-23-docs-reset-design.md` (stopped 2026-09-25). **Input:**
`docs/internal/record/2026-09-26-docs-approach-handoff.md`.

## Brief

cairn's published docs get rebuilt with the standard technical-writing chain: per-page inputs, a
draft, a technical review, an editorial review, and one revision, run by agents and read by Geoff as
owner and subject-matter expert. Arms go easiest first (reference, extend, admin, editors, front
door), and every stage merge leaves `main` releasable. Stages 0 and 1 share one pass, extend runs as
two (2a and 2b), and each later arm takes one. Geoff reviews outlines and sample pages on an
editable claude.ai Artifact page (R10). The budget goes to pages. No new check is built: four
existing checks each gain a small extension (a per-command flag list for `check:symbols`, a coverage
rule for `check:provenance`, a shipped-anchor list for `check:readiness`, a zero-quote floor for
`check:editor-quotes`), and one script runs the docs gate. The real-use test is the site round after
the last stage merges, plus two human task reads. No simulated reader gates anything. The ceiling is
about 30M (R8), with a lean chain whose re-review scope a measured pilot decides. Even lean, the
full scope plans at about 46M as priced here, and at about 57M at draft docs pass A's measured rate,
so the pilot checkpoint measures which end holds and brings Geoff one combined question on ceiling
and scope before most of the spend. Approving this spec authorizes stages 0 and 1 and the stage 2a
pilot only. No scope is cut silently.

## Owner rulings (this brainstorm, 2026-09-26)

| # | Ruling | Source |
| --- | --- | --- |
| R1 | Keep today's four arms (`admin/`, `editors/`, `extend/`, `reference/`) plus the front door (`why-cairn.md`, the arm READMEs). The six-audience model is dropped. | Geoff, audience question: "3" |
| R2 | Token ceiling about 20M for the whole initiative, with a checkpoint per arm. | Geoff, budget question |
| R3 | Owner review is outline plus sample: Geoff approves each arm's outline, then reads the two or three hardest pages; his notes fold across the arm. | Geoff, review question |
| R4 | Both human task sheets run during the site round, an ASC editor for Sheet 1 and an outside reader for Sheet 2. They inform and never gate. | Geoff, human-reads question |
| R5 | Easy docs first with Geoff's review, working up to hard docs. | Geoff, 2026-09-26 |
| R6 | The existing exemplar corpus stays; find new or better exemplars only where needed. | Geoff, 2026-09-26 |
| R7 | Add a consistency read per arm. | Geoff, 2026-09-26 |
| R8 | The initiative ceiling is about 30M, replacing R2's 20M, with a lean chain decided by a measured pilot: after a redraft only the reviewer that returned `fix` re-reads, and the stage 2 pilot measures whether that is safe. | Geoff, 2026-09-26 |
| R9 | The 2026-09-08 standard's rule 2 (outside-reader pages drafted one section per read) applies to the front door only. Extend, admin, and editors are drafted whole by the chain. | Geoff, 2026-09-26 |
| R10 | Geoff reviews and edits outlines and sample pages on an editable claude.ai Artifact page, one page per review batch, not in the repo. The page embeds the markdown source, renders it, and has an edit mode. His saves republish the page as new versions through the Artifact `artifact` capability (a document edited in place), and he can comment through the `comments` capability. The conductor watches the page, reads back each saved version, diffs its markdown against the repo, and applies the difference as the fold. | Geoff, 2026-09-26 |

R5 governs arm order. The stage 2a pilot takes hard pages first on purpose (stage flow step 2),
to measure the chain at its costliest; that is a measurement choice inside an arm, not a change
to R5.

Already settled before this brainstorm, and binding here: draft docs come first, then the site
round tests and fixes them, and site-pass agents may change the docs directly (Geoff, 2026-09-21,
memory `one-release-then-model-sites`, "REVISED ORDER"). The site round therefore starts after
stage 5 merges. This answers the handoff's open question 1.

### Rulings retired or closed

- Reset ruling 1 (only verified facts survive; old pages are job provenance only) stands. Reading
  an old page's claims, never its prose or structure, is job provenance under it (see the page
  chain).
- Reset ruling 2 (track structure reopened): closed by R1.
- Reset rulings 3 and 4 (six audiences, agent profile across tracks): dropped by R1. The
  `docs-reset-2a-audiences` branch stays archived and unmerged. R1 retires the reset's
  profile-file format only: the register's four track profiles and the scripter-or-agent profile
  (`docs/internal/docs-register.md`) stay as the drafter's and reviewers' input.
- Reset rulings 5 and 6 (organization size, agentic authorability) stand as register inputs.
- Reset ruling 7 ("spend on the system, not the pages"): replaced by "spend on the pages."
- Reset rulings 8 to 10 (build then test fresh, confined readers, the operator reader) and 12 (the
  chain-depth trial) retire with the harness. Ruling 11 (slot-level outline) is replaced by this
  spec's outline step. Ruling 13 (exemplars as an approved input) continues as R6. Ruling 14 (the
  design spend) is closed.
- The reset's program cap of about 45M and its 0.7M-per-page drafting basis are replaced by this
  spec's budget and R8.
- The core-developer track does not ship.
- The narrative-arm freeze lifts per arm, when that arm's stage merges (extend's at the 2b merge).

### The 2026-09-08 docs standard: what stands and what retires

Much of the standard was never built (no page-type registry, templates, `check:anatomy`,
`check:headings`, `check:prose-read`, `check:figures`, or 25-word Cairn rule exists). This
ledger replaces any reading that the whole standard stands.

| Part of the standard | Status here |
| --- | --- |
| Direction (a): rebuild, never edit; reference entries edited in place | Stands |
| Direction (b), quarantine: drafters never open the page they replace | Stands, enforced by deleting the old pages before drafting (amendment, 2026-09-29) |
| Direction (b), per-track harvest before any brief | Stands again: the harvest completes before any outline (amendment, 2026-09-29) |
| Direction (c) and decision 14: plan one, pass 2a, five stages | Replaced by this spec's stages |
| Rule 1: owner and stance claims resolve to an owner brief | Stands, enforced by the facts owner tier and `check:provenance` |
| Rule 2: an outside-reader page is drafted one section per read | Stands for the front door only (R9): `why-cairn.md`, `docs/README.md`, and the four arm READMEs are drafted one section per dispatch with a register-editor read between sections. Extend, admin, and editors are drafted whole by the chain |
| Prose rules (plain-language adoption) | Stand as carried by the register and Vale; the unbuilt numeric gates (paragraph gate, 25-word rule) retire |
| Page-type registry, templates, `check:anatomy`, `check:headings`, registry lifecycle | Retire. The page type vocabulary is the exemplar manifest's section headings |
| Figure rules (the two tests, `cairn-figure`, `figure-verifier`, `check:visuals`) | Stand. `check:figures`' seven assertions retire unbuilt |
| Decision 6: concept figure off `why-cairn.md`, ownership map to `extend/architecture.md` | Stands as an outline input for stages 2 and 5 |
| Review chain severity contract, receipt, PR-artifact ledger rows, `check:prose-read` | Replaced by the page chain and its per-page record |
| Coverage diff | Replaced by the claim inventory in page inputs, checked by the fact read |
| Part V reader test and the nine reader sittings | Replaced by R4 |
| Demonstration page (unit 4) | Retires |
| Seven-item tuning checkpoint and the gauging protocol | Replaced by this spec's checkpoints |

## Amendment: harvest, then delete (Geoff, 2026-09-29)

"The writer shouldn't ever see the original content." A 2026-09-28 proof run passed the old
`enable-tidy.md` to page inputs "for its claims only", as the quarantine row below allowed, and the
draft carried the old page's framing. The program changes order:

1. **Harvest.** Every factual claim on every old narrative page and front-door page gets a fact in
   `docs/internal/facts/` (verified against source) or a recorded cut. The harvest is complete
   before any outline is approved; page inputs no longer harvest from an old page.
2. **Outline.** Each arm's outline is drawn fresh from the jobs it serves and approved as before
   (flow step 1).
3. **Delete.** The old narrative arms (`docs/admin/`, `docs/editors/`, `docs/extend/`) and the front
   door (`docs/why-cairn.md`, `docs/README.md`) are deleted on `main` right after the harvest. The
   reference arm stays; it is maintained against the code every pass. The deletion is the
   enforcement: no input guard is built ("I'm not sure we need to rule if we simply remove the old
   content").
4. **Draft.** Stages run as below against an empty arm, from the facts, the job, and the register's
   exemplars only.

**Release.** cairn.pub stays pinned to `0.94.0-rc.1`'s docs until the rebuilt arms ship. `0.98.0`
carries the old arms, since the harvest orders after the theme lineage. The pin ceiling is the last
release cut before the deletion merges; a release cut after it publishes with the reference arm
only, and its changelog says so.

**Design.** The harvest pass's design, and the answers to the four questions this amendment left
open (harvest proof, the per-version records, arm order, outline format), are in
`docs/superpowers/specs/2026-09-29-draft-docs-harvest-design.md`.

**Superseded:** the quarantine row's "the page-inputs agent reads the old page's claims only", the
"per-page harvest in page inputs" row, and the per-arm freeze with its discovered-deficiency fixes
on frozen pages (nothing remains to freeze once the old pages are deleted).

## Budget

**Counting rule.** Spend is what `/cost` reports for each stage's session, per the global rule,
read at the pilot checkpoint and at each stage close. One counter from stage 0 onward keeps
shares and measurements comparable. If `/cost` is found not to include the chain's subagent and
workflow agents, the stage 0 pass records that, switches to a counter that includes them, and
records which one it uses.

**Per page.** Draft docs pass A's page chain cost 2.64M over 24 agents on three contract pages,
about 110K per agent, counted as subagent tokens (`docs/HISTORY.md`, pass A, "Both budgets":
"Ceiling 3.5M subagent tokens"). That is about 900K per page, and pass A records three rounds per
page as the shape that converged. This spec's chain is lighter: it drops pass A's profile grader
and allows one automatic redraft. The prices below assume it converges faster than pass A's
chain did; the pilot measures whether it does. A page's cost is its agent runs times 110K:

| Path | Agent runs | Per page |
| --- | --- | --- |
| Accepted in round 1 | 4: page inputs, draft, two reviews | about 0.45M |
| Lean redraft (R8 default) | 6: the four, the redraft, a re-read by the one reviewer that returned `fix` | about 0.65M |
| Full redraft (the pilot, or both reviewers flag) | 7: the four, the redraft, both reviewers | about 0.75M |

Pass A accepted no page in round 1, so the plan prices every page at a redraft path: the six
pilot pages at 0.75M and every later arm page at 0.65M, which assumes one reviewer flags. A page
where both reviewers flag costs the full-redraft 0.75M, and a second round is a conductor
escalation outside these prices. Short index pages (the READMEs) are estimated at 0.4M drafted
whole. Every front-door page is drafted one section per dispatch (R9), so `why-cairn.md` and each
index are priced at about twice their whole-page share. Each stage adds about 1M for planning,
the outline, the consistency read, the owner fold (its R10 review pages included), and the close; stage 2 adds 2M, since 2a and 2b
each carry a consistency read and a close.

**Pages.** Admin 8, editors 7, and extend 30, each excluding the arm README (stage 5 owns it) and
excluding extend's two per-version records (`migration-notes.md`, `upgrade-cairn.md`), which stay
maintained in place. The front door is `why-cairn.md` plus five indexes (`docs/README.md` and the
four arm READMEs). The root `README.md` is out of scope. Reference is 29 pages, checked in place
outside the chain; its README is stage 5's. Outlines may merge pages; the counts here do not
assume it.

| Stage | Scope | Derivation | Planned |
| --- | --- | --- | --- |
| 0 Setup | Rule, runner, and fact cleanup; four check extensions, the docs gate script, and the R10 review page | 13 items (the owner-fact settling and the freeze-lift sweep one task each), one implementer and diff-reviewer chain each; the review page and its round-trip proof about 0.2M inside the share | 2.5M |
| 1 Reference | Claim check in place (below) | 29 pages x one fact-read agent (about 0.1M), plus fixes and close | 3.5M |
| 2 Extend | Rebuild, as 2a (with the six-page pilot) and 2b | 6 x 0.75M + 24 x 0.65M + 2M | 22M |
| 3 Admin | Rebuild | 8 x 0.65M + 1M | 6M |
| 4 Editors | Rebuild in the Microsoft register | 7 x 0.65M + 1M | 5.5M |
| 5 Front door | `why-cairn.md` and five indexes, each one section per dispatch | 2 x 0.75M + 5 x 0.8M + 1M | 6.5M |
| | | Total | about 46M |

At pass A's measured 0.9M for every arm page and for each half of `why-cairn.md`, the same scope
plans at about 57M. The plan is therefore a range, about 46M as priced to about 57M at pass A's
rate, and the pilot measures which end holds. With every page accepted in round 1 it would still
plan at about 36M.

The planned total must sit at or below 80 percent of the ceiling, about 24M under R8's 30M, so the
global 80 percent stop fires only on an overrun. **The full scope does not fit 30M, even lean.**
Within 24M, stages 0, 1, and 5, the stage 2 to 4 overheads, and the pilot take about 21M, which
leaves about 3M: roughly four more arm pages at the lean rate, so about 10 of the 45 arm pages.
The pilot checkpoint (under "Checkpoints and stops") settles the gap with one combined question to
Geoff. Every share resets from the pilot's measured cost and again at each checkpoint.

## Stages

Stages 0 and 1 run as one pass. Stage 2 runs as two passes, 2a (the pilot and the rest of its
half) and 2b, each mergeable with its own consistency read, link repair, and close. Stages 3, 4,
and 5 each run as one pass. Every pass has its own worktree and merges to `main` before the next
starts. Each later stage's plan is written after the previous checkpoint and carries that stage's
outline, cited by its path and commit, so plan approval is outline approval (R3), reviewed on the
R10 page. The 2a plan carries
the whole extend outline; 2b carries no new outline, and extend's freeze lifts at the 2b merge.

Approving this spec authorizes stages 0 and 1 and the stage 2a pilot. The rest of 2a, and every
later stage, waits on Geoff's answer to the pilot checkpoint question.

**Every stage merge leaves `main` releasable.** Releases keep the triggers in `CLAUDE.md`
(a consumer needs the change now, or a coherent capability lands), so a cut can fall between stage
merges and ship some arms rebuilt and some not. A mixed register is a polish cost. Broken paths and
anchors are correctness costs, and the merge gate and the outline's contract table (below) remove
those. cairn.pub's pin bump stays cairn.pub's own pass. Each stage merge adds a `## Unreleased`
entry listing renamed and removed doc paths, with a `Consumers must:` line when a shipped skill,
`claude/` file, or scaffold template pointed at one. The harvest's `## Unreleased` entry names the
removal once, with its `Consumers must:` line; later stage entries list only the paths they restore
or change.

### Stage 0 acceptance

- **Freeze lift.** The narrative-arm freeze and the cross-repo "a site-pass agent never edits the
  cairn-cms checkout" rule are rewritten in every place that carries them: `CLAUDE.md`
  ("Documentation is a pass dimension"), `docs/internal/facts/README.md` ("How this container
  grows" and "Cross-repo path"), `docs/internal/docs-register.md` (the frozen-arms sweep line), the
  `site-pass`, `engine-consult`, and `cairn-pass` skills, STATUS, and the `docs-rebuild-not-edit`
  and `docs-reset-initiative` memories (the latter also drops "the six-audience ruling" as a
  survivor). The new text says the freeze lifts per arm at its stage merge and states the site-pass
  write path below. Proof: a grep for the old freeze and cross-repo wording across those files
  returns only the new text.
- **Site-pass rule.** The `site-pass` skill tells a site-pass agent to follow the admin and extend
  pages exactly as written during the round, and to fix or file every divergence between page and
  reality, under "Edits after the chain" below. The write path: the site pass's own agents edit on
  a `site-docs/<site>-<pass>` branch off cairn-cms `main`, merged by PR under the docs gate before
  the site pass closes. A site edit to an arm whose stage is in flight is filed, never fixed, and
  feeds that stage's page inputs.
- **Owner facts.** The four stale owner-fact items are settled: the rule count in
  `what-cairn-is-and-is-not.md:49` against the audit's modules, `f:ab9kzr` (published version),
  `f:75hawi` (free tier), and `why-cairn.md:41` against line 84. Each is checked against its source
  first (code, the registry, Cloudflare's published limits). Only owner wording goes to Geoff, in
  one combined question. Proof: each bullet edited and retagged, `check:facts` green, its STATUS
  line removed.
- `CLAUDE.md` no longer cites the missing `docs-is-a-pass-dimension` memory.
- The ROADMAP "Now" entry names this spec and drops the retired inputs listed above. The designer
  theme-guide content input (Geoff, 2026-09-24) moves into the stage 2 outline as a required topic.
  The Toward 1.0 claims-verification audit stays a separate post-`beta.1` gate.
- **Flag pairing.** The Go test that writes `tool/testdata/flags.json` from the cobra tree
  (`TestCommittedFlagListMatchesTheCommandTree`, run by `make -C tool flags`) also writes a
  per-command map: each command path to the long flags it accepts, inherited ones included.
  `check:symbols`, which already resolves every `--flag` in a shell fence against that file and the
  setup command's own parser, resolves a `cairn <path> --flag` line against the map. The command
  path is the longest run of leading words that matches the tree. The check reads shell-tagged
  fences only. It fails a `cairn` line whose first word is not a command, with or without flags,
  and a flag the matched path does not accept. Unit tests plant both.
- **Brief coverage.** `check:provenance` today passes with no briefs (`check-provenance.mjs:591`;
  a missing briefs directory holds none, `:458`). It gains a committed list of rebuilt page paths,
  to which each stage merge appends the paths its chain rebuilt, and fails any listed path that
  has no brief. Keying by page path covers a half-rebuilt arm (2a before 2b) and the arm READMEs
  (briefed in stage 5) with no exemption list. Briefs are keyed by file name within a track
  (`check-provenance.mjs:557`), so five READMEs under one track would collide. Each arm README's
  brief goes under its own arm's track (`briefs/admin/README.json`, and so on); only
  `why-cairn.md` and `docs/README.md` use the `front-door` track. A unit test plants a listed path
  with no brief.
- **Shipped anchors.** `fixes.go`'s anchors are already pinned to the live headings
  (`tool/internal/health/fixes_test.go`, under `make -C tool check`) and `conditions.ts`'s by
  `check:readiness`. The residual hole is a heading renamed together with its registry entry,
  which leaves released binaries pointing at the old heading. So a committed, append-only list
  snapshots the `is-it-working` fragments released binaries print: each released tool tag's
  `conditions.json` anchors (today `tool/v1.1.0`) plus `check_referrer.go`'s one.
  `check:readiness` checks the live anchors against `shipped-anchors.json` while the admin arm is
  empty, and re-arms against `docs/admin/is-it-working.md` when the arm holds any page, failing
  when a listed anchor stops resolving as a heading there. A fragment never reaches a server, so no redirect can repair a
  renamed heading.
- `check:editor-quotes` fails when the page it pins carries zero quotes.
- **Docs gate.** One `package.json` script runs every CI check that reads the doc arms' content
  (`check:package`, which checks that the arm paths ship in the tarball, keeps its own step):
  `check:docs`, `check:vale`, `check:facts`, `check:provenance`, `check:symbols`,
  `check:snippets`, `check:transcripts`, `check:visuals`, `check:arm-indexes`,
  `check:editor-quotes`, `check:readiness`, `check:tool-conditions`, `check:target-stack`,
  `check:reference`, and `check:reference:signatures`. `test.yml` calls this script in place of
  those separate steps, so the chain gate and CI read one list.
- **Chain and agents.** `docs-page-chain.js` matches the chain below: no `args.profile`, no profile
  injection, no profile grader, and no "Profile" section in the editor prompt. It adds the
  page-inputs step, runs `cairn-docs-drafter`, points the fact read at the brief's fact ids and
  their sources, runs the gate string below, and writes a per-page record. The
  `cairn-docs-drafter` definition drops the audience-profile input and matches the fact rules
  below. `docs/internal/briefs/README.md` and the facts README's "New facts from the page chain"
  stop naming the removed `docs-page-chain-v2.js`, and that facts README paragraph is amended to
  say the page-inputs agent files new facts `[verified]` and the drafter never files one. Proof: a dry run on one page yields a per-page
  record with the brief path, the page-inputs output, and no grader read.
- **Rule 2 scope.** The `writing-voice` skill's line ("stop after each section and let a reader see
  it before the next one starts") and the global `CLAUDE.md` Writing voice summary say the rule
  governs front-door drafting only (R9), and the `CLAUDE.md` line stops reading as a page-structure
  rule.
- **Scoped re-review.** `docs-page-chain.js` re-runs only the reviewer that returned `fix` after a
  redraft, with a switch that re-runs both. When both run, it records a cross-regression flag per
  page: a reviewer that returned `accept` in round 1 returns `fix` in round 2. The flag is derived
  from the verdicts the record already stores (`record.rounds[].reads`); no classifier is built.
- **Review page (R10).** One reusable Artifact page template for owner review: it embeds a
  batch's markdown source, renders it, has an edit mode that saves new versions through the
  `artifact` capability, and takes comments through the `comments` capability. The stage 0 pass
  proves the round trip on one real page: publish, Geoff edits and saves, the conductor reads the
  saved version back with the Artifact tool's read action, diffs the markdown against the repo,
  and applies it as a fold with the page's brief updated. Proof: the round trip's record (the
  published version, the saved version, the applied diff, `check:provenance` green on the brief).
  If the round trip is clumsy, the fallback is GitHub PR review, and the conductor asks Geoff
  before switching.

### Stage 1: reference

Stage 1 runs outside the page chain and writes no briefs, since reference pages are edited in
place and pinned by the signature check. One fact-read agent per page checks each prose claim
against the container, the export surface, and the code, and fixes discrepancies in place. The
stage record lists every page, the claims checked, and the discrepancies found and fixed; a page
missing from the record fails the stage. `docs/reference/README.md` is not in stage 1; stage 5
owns it. Edits gate on the docs gate plus `make -C tool check`
for the three CLI contract pages. Stage 1 skips the outline and the owner read unless the check
turns up a structural problem.

## Each rebuilt stage's flow

1. **Outline**, at `docs/internal/outlines/<arm>.json`, reviewed as rendered cards with edits
   folded back to the JSON; the stage's plan cites it by path and commit. A page list drawn fresh from the jobs the arm serves, one line
   per page with its page type, the two exemplars assigned to that page type (named on each page's
   line), and whether it keeps or gains a figure. It carries the arm's term list and planned
   cross-links. Its contract is `relink.json`, which replaces the per-stage contract table grepped against
   today's pages: for every rename or removal, the redirect row for cairn.pub, and every inbound
   reference for the old path (other arms, `skills/`, `claude/`, the scaffold template, `conditions.ts`, and check scripts
   that pin a page). It also lists every heading slug a shipped binary, `conditions.ts`, or a gate
   names; those pages keep their paths and headings verbatim, and the chain passes them as
   `pinned`. `is-it-working.md` keeps its path. Geoff reviews and edits the outline on that stage's
   R10 page and approves it with the plan; the conductor reads back his saved version and applies
   the diff to the plan before execution starts.
2. **Pilot (stage 2a only).** The first six pages through the chain are among the arm's hardest,
   chosen on purpose to measure the chain at its costliest (R5 still governs arm order). Both
   reviewers re-read after every redraft, and each page's record carries the cross-regression flag
   (a reviewer that returned `accept` in round 1 returns `fix` in round 2). Their measured cost and
   the cross-regression rate feed the pilot checkpoint. Geoff's owner read of three of them and the
   pilot checkpoint question are one sitting, before the rest of the arm is dispatched.
3. **Draft.** Every page goes through the page chain, three pages in flight at once. Front-door
   pages (stage 5) are drafted one section per dispatch, with a register-editor read between
   sections (R9).
4. **Consistency read.** After the arm's pages pass, one Opus 5.5 agent reads the whole arm for
   terms, cross-links, overlap, and uneven depth. It returns a record: every page read, and each
   finding with `file:line`, its class (term, link, overlap, depth), and a proposed edit. The record
   goes into the stage record even when it has no findings. An implementer applies the batch under
   "Edits after the chain."
5. **Owner read.** Geoff reads the two or three hardest pages, chosen by the conductor; stage 2
   takes three, in the pilot checkpoint sitting. The pages go on one R10 page for the batch, where
   he edits in place and comments. The read counts as one execution sitting in the pass score.
6. **Fold.** The conductor reads back each saved version of the R10 page, diffs its markdown
   against the repo, and applies the difference; an edit to a page sentence updates that page's
   brief under "Edits after the chain." Geoff's notes and comments apply across the whole arm
   under the same rule. A note that generalizes becomes a rule where it runs: the register, the
   drafter prompt, or the runner.
7. **Merge and checkpoint.** The arm branch passes the docs gate plus `make -C tool check`, merges,
   appends its rebuilt page paths to the brief-coverage list, and its freeze lifts (extend's at the
   2b merge). The arm READMEs and `docs/README.md` are deleted; each rebuilding stage recreates
   its index. The merge waits for Geoff's read and
   its fold. The read is a wait, never a gate on the arm's quality bar.

## The page chain

The standard editorial chain, run by `docs-page-chain.js`.

1. **Page inputs.** One agent per page writes the page's job, its type, its two exemplar excerpts
   (it does the trimming), and the fact ids it will draw on, all into the per-page record. It reads
   the old page for its claims only, never its prose or structure, and gives each claim a
   disposition: carried by a cited fact, newly filed, or cut with a reason. This claim inventory is
   the control against fact loss. The 2026-09-21 draft-docs review measured the container holding
   40 percent of the actionable claims on two admin pages, a 60 percent gap
   (`2026-09-21-draft-docs-design.md:191-193`). Pass A's claim mining gave a disposition count on
   three contract pages (61 statements, 51 filed, 10 cut; `docs/HISTORY.md`), not a measured
   control. A fact the job needs that the container lacks is
   traced to code, config, or a vendor doc and filed `[verified]` with its `Source:` line, or
   `[external]` with the vendor URL for a Cloudflare or GitHub step. A cited fact whose only source
   is an arm page is retraced to code, config, or a vendor doc first, or retagged `[candidate]` and
   not cited. The agent writes facts with the Edit tool, never a shell append.
2. **Draft.** `cairn-docs-drafter` (Opus 5.5, high) writes the page and its sentence-to-fact
   brief at `docs/internal/briefs/<track>/<page>.json`. The drafter files no facts. A missing fact
   is a `couldNotDo` for the conductor, who re-runs page inputs for it.
3. **Gate.** The docs gate, with Vale on the page path and `check:provenance` on the page's brief,
   plus `make -C tool check` for a page carrying pinned slugs. A red whole-tree check that names
   another in-flight page's file does not count against this page.
4. **Two reviews in parallel, both Opus 5.5.** The editorial review is `cairn-register-editor`.
   The technical review is a fact read: each claim matches its cited fact, each cited fact still
   matches its source, and every claim the inventory marks carried or filed appears on the page. A
   stale fact is fixed or retagged `[docs-drift]` in the same chain. A page with a figure also gets
   a `figure-verifier` read.
5. **One redraft** on the combined findings. The gate reruns on every redraft. By default only
   the reviewer that returned `fix` re-reads (R8); after the stage 2 pilot, the pilot checkpoint
   may restore both. A second `fix` from a re-reading review goes to the conductor. There is no
   third automatic round.

The page-inputs agent and the fact read are both independent of the drafter, so a page never
vouches for its own citations; the facts README's rule is amended to say so. The conductor reads
only per-page records, never pages or diffs.

### Edits after the chain

Three sources change a page after its chain accepts it: the consistency read, the owner fold, and
the site round. One rule covers all three. Any edit to a page with a brief updates the brief's
`sentences` in the same change. A changed or new claim cites a citable fact; a new fact is filed
`[candidate]` by whoever makes the edit and retagged only by the fact read. Changed sentences get both reviews,
scoped to those sentences, except a pure term or link substitution. `check:provenance` in CI is the
tripwire. The rule lands in the consistency and fold dispatch prompts and the `site-pass` skill.

### Exemplars

The 68-capture corpus stays (`docs/internal/record/docs-exemplars.md`), unreviewed as a set. Its
slices map to arms: admin to Operators, editors to Editors, extend to Extenders plus Designers
(and Core's architecture overview), the front door to Evaluators. The page type vocabulary is the
manifest's section headings. Each outline assigns two exemplars per page type from different
sources, since one example invites copying its structure, phrasing, and content. The drafter prompt
names what to take (structure, register, detail per step) and what to leave (content, terms,
product names). Known "no capture fits" cases, to fill only when an outline needs one: editors
concept (both captures from one source), the evaluator support-and-versioning page (one capture),
and extend troubleshooting (none). A weak exemplar is swapped at a checkpoint, never mid-arm.

## Testing

1. **Static gates** on every page, as listed in the chain and the merge gate.
2. **Procedures at parse level.** `check:symbols` with flag pairing covers every `cairn` line
   and every `npx create-cairn-site` flag in a shell-tagged fence; `check:transcripts` covers quoted setup-command
   runs against their recorded fixtures. No command runs for real in CI: against
   `examples/showcase`, `cairn doctor`, an unknown flag, and an unknown subcommand all exit 3
   (verified 2026-09-26), so an exit code cannot tell a working command from a broken one.
3. **The site round** follows the admin and extend pages as written and fixes or files every
   divergence (stage 0 puts this rule in the `site-pass` skill). It is the execution test for
   procedures.
4. **Human task reads,** per R4, from `docs/superpowers/research/2026-09-25-docs-reset-2a-human-reads.md`.
   Before the round, Sheet 2 is repointed from cairn.pub, which renders the pinned tarball and
   cannot show drafts, to the drafts on GitHub `main`, and the sheets' header names where logs go
   now. Logs land in that file's Logs table; findings are fixed or filed through the site-round
   rule.

The Go drift tests on the three CLI contract pages stay. A job-doing reader is an optional check
at about 35K per page, used only on a page Geoff's read flags as confusing. No planted-defect bar
and no simulated-reader gate exist in this design.

## Checkpoints and stops

At each stage close, `docs/HISTORY.md` records spend against the share, the measured cost per page
(which resets later shares), exemplar swaps, rules landed from the fold, and the consistency
record. STATUS carries only the current shares and the next stage. A stage stops and asks Geoff
when it runs 25 percent over its share or at 80 percent of the ceiling, about 24M (the global stop
rule). A page escalated to the conductor is the conductor's call under the global rule; it reaches
Geoff only when it touches scope or taste.

**Pilot checkpoint** (after stage 2a's six pilot pages). The conductor re-derives every share from
the pilot's measured per-page cost, the extend outline's page count, and today's counts for the
later arms. The measured cost says which end of the 46M to 57M range holds. The conductor then
reads the cross-regression rate over qualifying pages only: those where exactly one reviewer
returned `fix` in round 1, the only pages where the lean chain would skip a re-read. Rare
cross-regressions (at most one qualifying page shows one) keep the lean chain. Common ones price
the both-reviewer chain from the pilot's measurement. Fewer than three qualifying pages makes the
pilot inconclusive, and the question prices both chains. If the re-derived plan for the chosen
chain sits at or below 24M, the stage continues. Otherwise, which the current figures predict,
Geoff gets one combined question: the cross-regression rate (or its inconclusive result) and the
measured cost of keeping both re-reads, the full-scope total and the ceiling it needs, and the
named scope that plans within 24M. He answers it in the same sitting as the pilot owner read. No
page or arm leaves scope before he answers, and no work past the pilot is dispatched.

## Out of scope

- cairn.pub's pin, redirect routes, nav, and `/schema/` route: cairn.pub's own pass. The redirect
  rows each outline produces are its input.
- Cutting releases. Drafts accumulate on `main` under `## Unreleased`, releasable at every merge.
- The root `README.md`.
- A core-developer track, audience-profile files, and any reader harness.
