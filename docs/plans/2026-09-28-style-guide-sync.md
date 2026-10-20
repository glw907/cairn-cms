# Style-guide sync (re-scoped)

> **For agentic workers:** two parallel chains (R in this repo, W in the dotfiles worktree)
> across segments A and B, then a sequential join. Chains run through the workflow runner
> `pass-execute-chains`, invoked by name once per segment with both chains in one invocation; the
> join runs per task with the Agent tool. Implementer `cairn-implementer` on `sonnet` at effort
> `high` unless a task names `model: opus`; reviewer `diff-reviewer` on `claude-opus-5-5`. **The
> conductor never reads a diff, a test log, or a gate transcript**; it consumes per-task records
> and decides accept, re-dispatch, split, or stop. One re-dispatch on `fix`; a second `fix` is the
> conductor's decision. Tasks state outcomes and acceptance criteria, never implementation code.
> **Resume:** the runner has none. After a halt, check `git status` in the affected worktree (warm
> uncommitted work means investigate, per the one-executor rule), then re-invoke with only the
> undone tasks.

**Date:** 2026-09-28 (re-scoped the same evening; the first plan is at `fb1aeba3`). **Goal:**
every published cairn page is structured to its base style guide (Google for terminal readers,
Microsoft for UI-only readers) in the cairn docs voice, through a conventional stack: stock Vale
packages, a short register supplement per guide with three to five exemplars, two custom Vale
rules at warning with `vale test` cases, and the register editor working a checklist plus Vale's
output.

**Spec:** `/var/home/glw907/Projects/cairn-cms/.claude/worktrees/style-guide-sync/docs/superpowers/specs/2026-09-28-style-guide-sync-design.md`
(rulings 1 to 20, the Sources list, and criteria 1 to 8). Leanness record:
`docs/superpowers/research/2026-09-28-style-guide-sync-leanness.md`.

**Pass class:** mixed, per task. Each task carries `passClass` in the runner args.
**Token ceiling:** 6M for the remainder (ruling 20). **Checkpoint:** every segment boundary, any
split, and before any question. At 80% (4.8M) finish the task in flight, write STATUS, and ask one
combined question at the next boundary.

**Gates (runner args, exact).**
- Chain R `engine-logic` task R2: `gateTier: "scripts"`, `gate` set to the literal `npm run
  check:docs-gate && npx vitest run src/tests/unit/docs-gate.test.ts`, `gateLane: "light"`. The
  close's full repo gate carries the rest.
- Chain R `docs` tasks (R9, R1t, R6): no pin; the classifier sizes the gate. Default lane.
- Chain R carries no `classifier` field: the runner makes one cached `haiku` existence probe for
  its repo and reuses it for every R task.
- Chain W sets `classifier: false` on its chain object. Every W task carries
  `gate: "bash scripts/check.sh"`, `reducedGate: "bash scripts/check.sh"`, `gateLane: "light"`,
  and `notes` carrying the absolute spec path.
- `args.gate` is the `SCRIPTS_GATE` literal: chain R's fallback when the classifier prints
  nothing. Never set `args.gateLane`, `args.reducedGate`, or `args.classifier`.
- Chain W's condensed `criteria` name no npm command; a W task whose section names one says "per
  the plan section" instead.

**Branches.** Chain R on `style-guide-sync` (this worktree). Chain W on `style-guide-sync` in
`~/Projects/.worktrees/dotfiles-style-guide-sync`, which already exists at `4461c1f`. `planPath`
is this file's absolute path. The repo branch merges to `main` by PR at the close. **No release,
no version bump.**

**Owner time:** one sitting, opened when J1 lands (ruling 14), with J2 running meanwhile: the R5
diff and the J2 draft beside the current `enable-tidy.md`. Nothing else waits on Geoff.

## Global constraints

- Base guide by track: `docs/editors/` and admin UI copy are Microsoft; every other published
  surface is Google.
- Ruling 16 holds on every task: no ratified register rule, voice specimen, Names entry, anatomy,
  track or front-door section, or recorded deviation is dropped. Only prose restating the base
  guide shrinks.
- Only Geoff adds a deviation row. The seed rows are the spec's.
- No skill or agent carries a copy of a brief; writers outside the chain are routed to it.
- Vendored Vale styles are never edited. New rules ship at `warning`.
- Frozen narrative arms: no page outside R5 changes on this branch. J2's draft lives only on
  `style-guide-proof`.
- Code comments in `.mjs`/`.js` follow TSDoc and the no-em-dash rule; commits are path-limited.
- A mechanism a task would add beyond its outcomes needs a published source; without one, the
  implementer lists it under uncovered decisions instead of building it (ruling 15).

## Review focus

1. **The trim dropping voice** (ruling 16). R1t's `diff-reviewer` enumerates the ratified rules
   at `feca3348` itself (criterion 2), right after R1t, before anything builds on the register.
2. **A new rule turning the tree run red.** Both rules at `warning`; the unscoped gate exits 0.
3. **The revert leaving dead references.** No code, test, prompt, agent definition, or register
   passage names `docs-chain-render.mjs`, a `q:` id, `source: guide`, "universal contract",
   `## Provenance`, "The tightening test", "Recorded exceptions", or a dispatch-extracted section
   after R1t and W1r to W3r.
4. **R5 rewording approved sentences** (G3). J1's sentence-level diff against `8bbe78f5`.

---

## Pre-flight (conductor, before segment A)

- **P0.** No other executor holds either worktree (`pgrep -f`, `git status` clean in both, no
  running workflow journal for this pass).
- **P1.** One `diff-reviewer` read of R2p (`5d82b505`) against the first plan's R2p acceptance
  (both CI pins 3.23.0, the arbiter note keeps "CI's pin governs"). A `fix` verdict adds a fix to
  chain R's first task notes.
- **P2.** One `haiku` agent checks every path and line number this plan cites against the two
  worktree HEADs and amends nothing; it reports mismatches, and the conductor amends the plan.

## Segment A

**Chain R, in order: R9, R1t, R2.**

### Task R9. Exemplar captures

Class `docs`. Files: `docs/internal/exemplars/` (new: three captures and a `README.md`),
`scripts/checks/docs-links.mjs` (skip set only).
Outcomes: the spec's R9. The two Google pages captured to markdown with `curl` plus `pandoc`
(attribution notes code samples are Apache 2.0); the Microsoft Learn procedure page taken from
the markdown source in a MicrosoftDocs repository whose `LICENSE` is CC BY 4.0, cited by that
file's URL. Each file opens with its source URL, capture date, and attribution line. The README
names each file and its role (anatomy). `check:docs` skips `docs/internal/exemplars`. Acceptance:
the three files exist with attribution; `npm run check:docs-gate` passes; the report lists the
paths and the MicrosoftDocs `LICENSE` URL.

### Task R1t. Trim the register

Class `docs`, `model: opus`. Files: `docs/internal/docs-register.md`. Notes: R9's capture paths.
Outcomes: the spec's R1t bullets. Each drafting brief becomes a supplement: the base-guide link,
a structure checklist (one line per base-guide rule, linked, unquoted), the voice with its
specimens (the why-cairn front-door specimen, the `choose-an-ai-posture.md` lines 23-26 paragraph
at `8bbe78f5` verbatim, every `Killed:` specimen), the exemplar list, and a short tell list. Every
`q:` and `x:` marker and every verbatim guide quotation inside the briefs goes; the guide-quotes provenance becomes
a plain sources list; the tightening test, the two exceptions sections, and the Provenance
voice-departure table merge into `## Deviations from the base guides`, keeping all four Google
rows with their Evidence column. Every other R1 section stays, with `## Names` and every remaining
quotation byte-identical.
Acceptance: criteria 1 and 2. The `diff-reviewer` dispatch for R1t carries criterion 2's
instruction verbatim: enumerate the ratified rules from the register at `feca3348` yourself, never
from the implementer's list. The report carries a `grep` showing no `<!-- q:` or `<!-- x:` marker,
the posture paragraph present, and every heading the spec's W1r list names present verbatim.

### Task R2. The Vale rules

Class `engine-logic`. Files: `.vale.ini`, `.vale/styles/Cairn/Headings.yml` and
`Headings.test.yml`, `.vale/styles/Cairn/ProseProcedure.yml` and `ProseProcedure.test.yml`, the
fixture config `.vale/tests/vale.ini`, the vocab accept list, `scripts/checks/docs-gate.mjs` and
`src/tests/unit/docs-gate.test.ts`.
Outcomes: the spec's R2. `Cairn.Headings` fires on a leading -ing word or a trailing `?` only.
Both rules at `warning`; one pass and one fail case per rule (the `ProseProcedure` fail cases are
verbatim copies of the two passages the spec names); the docs gate's tree mode runs `vale
--config=.vale/tests/vale.ini test` over the two test files; each rule's count, measured with
plain `vale` over the tree, sits in a `WATCH` comment beside it; the vocab entries are listed in
the report.
Acceptance: criteria 3 and 4; a fail case edited clean makes `vale test` exit non-zero (shown once
in the report, then restored); the report carries both measured counts.

**Chain W, in order: W1r, W2r, W3r.** A W task whose change clears a ratchet baseline entry
removes that entry in the same commit, with `claude/.claude/tooling/ratchet-baseline.json` in its
Files.

### Task W1r. Revert W1 and wire the brief by track

Class `engine-logic`. Files: `claude/.claude/workflows/docs-page-chain.js`,
`tests/docs-page-chain-derivation.test.mjs`, `scripts/docs-chain-render.mjs` (removed).
Outcomes: the spec's W1r. `git revert 79c5e23` first, as its own commit. Then the prompts name
each register section the agent reads by exact heading (the spec's list), W1's unknown-track
throw stays, the editor runs plain `vale` on the page and grades the checklist, tells, and Vale's
alerts together, and the drafter reads the exemplar sources whole in place of trimmed excerpts.
The test covers all six track values (`editors`, `admin`, `extend`, `reference`, `front-door`,
`readme`) plus one unknown value that throws.
Acceptance: criterion 5's first clause; the prompts name exactly the spec's W1r heading list
(R1t lands those headings in parallel; the boundary checks the two agree); review focus 3;
`scripts/check.sh` passes.

### Task W2r. Drafter definition

Class `docs`. Files: `claude/.claude/agents/cairn-docs-drafter.md`.
Outcomes: the spec's W2r. Acceptance: no reference to exemplar roles, rendered sections, the
render script, trimmed excerpts, or a dispatch-extracted brief; the drafter reads the named
sections from the register file; the brief outranks the definition; `scripts/check.sh` passes.

### Task W3r. Register-editor definition

Class `docs`. Files: `claude/.claude/agents/cairn-register-editor.md`.
Outcomes: the spec's W3r. Acceptance: no `source` field, `q:` id, coercion reference, or
dispatch-handed `## Provenance`, `## The tightening test`, or `## Recorded exceptions` remains;
the definition states ruling 2's override test and that a tightening needs no row; the
base-guide-first lens and the editors-arm scoping from `4461c1f` stay; `scripts/check.sh`
passes.

## Segment B

**Chain R: R6.**

### Task R6. Admin design system and the repo `CLAUDE.md`

Class `docs`. Files: `docs/internal/admin-design-system.md`, `scripts/checks/check-admin-prose.mjs`
(header comment only), `CLAUDE.md` (Authoring section).
Outcomes: the spec's R6. The voice principle near line 56, "friendly-but-professional" (near line
1238), and "Lean on the cairn/stacking metaphor" (near line 1243) change under rulings 5 and 8;
the script header routes the release-time read to a Microsoft UI-text read. Acceptance:
`check:prose` unchanged and green; no "slightly academic", "no house voice", "On top of the
Google floor", "friendly-but-professional", or "cairn/stacking metaphor" remains in the three
files.

**Chain W, in order: W4, W5 (carrying W6).**

### Task W4. Voice docs and the charter correction

Class `docs`. Files: `claude/.claude/skills/writing-voice/SKILL.md`,
`claude/.claude/docs/voice/{technical-doc-web,editor,technical-doc-go,commit-and-pr,agent-facing}.md`,
`claude/.claude/docs/authoring-charter.md`, `claude/.claude/CLAUDE.md` ("Writing voice"),
`claude/.claude/output-styles/writing-voice.md`, `claude/.claude/skills/register-check/SKILL.md`.
Outcomes: the spec's W4, as the first plan's W4 task at `fb1aeba3` (lines 342-384) minus its
"one sanctioned copy" parity sentence. Ruling 12 lands in the charter, the global `CLAUDE.md`,
the output style, and the skill; the cairn-docs route names the drafting brief by track and
cairn.pub's prose as developer-brief; the output style gains "a sequence of actions is a numbered
list"; `technical-doc-web.md` and `editor.md` replace their prose-procedure exemplars with numbered
procedures; `register-check` names the register as its rule set; the five voice files keep one
pointer line to the tellgrader measures in place of their measures sections; the global
`CLAUDE.md` names the register's developer brief as the cairn docs standard.
Acceptance: no voice exemplar in `technical-doc-web.md` or `editor.md` writes a cross-screen
procedure as prose; `writing-voice/evals` re-run with no regression, or each named delta gets the
conductor's accept or fix ruling; `scripts/check.sh` passes.

### Task W5. Implementer definitions and retired phrases (W5 and W6)

Class `docs`. Files: `claude/.claude/agents/cairn-implementer.md`,
`claude/.claude/agents/site-implementer.md`, `claude/.claude/tooling/retired-phrases.txt`.
Outcomes: the spec's W5, per the plan section: the "plain voice" line in both points docs prose
at the track's drafting brief, and `site-implementer`'s cairn-cms docs gate adds
`npm run check:docs-gate -- --page <page>` for each page it touches. The spec's W6: these phrases
appended, each with a comment naming its ruling: "Vale-enforced floor", "a floor is not a
ceiling", "academic introduction", "slightly academic", "25-40-word", "on top of the Google
floor", "admin walkthroughs", "no house voice", "not a house voice"; a line recording a retirement
carries `retired-ok`; the header's R8-twin sentence goes. Acceptance: both lines present; the
existing scanner passes on the tree with no new baseline entry; `scripts/check.sh` passes.

### Segment B boundary (conductor)

1. Confirm chain R green on `style-guide-sync`.
2. Re-run P0 against `~/.dotfiles`. Merge chain W into dotfiles `main` with `--no-ff`; record the
   merge SHA in STATUS as the rollback point.
3. `claude-tooling-sync verify` passes on the merged `main`.
4. One `grep` confirms every register heading `docs-page-chain.js`'s prompts name exists verbatim
   in the register at `style-guide-sync`'s HEAD; a miss is fixed before J1.
5. STATUS written.

## Join (sequential, Agent tool)

### Task J1. R5, the trigger page

Class `docs`, `model: opus`, under "Edits after the chain". Files:
`docs/extend/choose-an-ai-posture.md` and its brief.
Outcomes: the spec's R5. Acceptance: criterion 6 except Geoff's read, the no-alert check run
with plain `vale` on the page. After J1 lands, the conductor dispatches one `cairn-register-editor`
read of the diff for the voice verdict (the implementer cannot dispatch agents).

### Task J2. Proof run

The conductor creates branch `style-guide-proof` off `style-guide-sync` (after J1) in a new
worktree, runs `npm ci` there, and runs the `docs-page-chain` workflow by name with these args:
`worktree` (the new worktree), `gate: "npm run check:docs-gate -- --page {page} --brief
{brief}"`, `gateLane: "light"`, and one page, `docs/extend/enable-tidy.md`, with `track:
"extend"`, a one-paragraph `job` the conductor writes (enable-tidy as a how-to), `inputs`
pointing at `docs/internal/facts/extend.md` (the page's bullets) and the source files they cite,
and `exemplarSources` from the developer brief's list for the extend track. The draft commits to
that branch only; any `docs/internal/facts/` change is cherry-picked to `style-guide-sync` and
listed in the report. Acceptance: criterion 7 except Geoff's read.

**Then Geoff's one sitting** (opened when J1 lands): the J1 diff with the register editor's
verdict, and the J2 draft beside the current page. A rejected J1 diff reopens J1 and voids J2,
which reruns after J1's fix. A rejected J2 draft reopens R1t's voice section and exemplar list
once; a second rejection stops the pass and writes STATUS.

### Task J5. W7 infra read

One fresh `claude-opus-5-5` reader, with no part in the pass, returns the spec's W7 file list
with a verdict per file, naming `site-implementer`, the output style, the authoring charter, the
global `CLAUDE.md`, and `check-admin-prose.mjs` explicitly. Mismatches are fixed in one
implementer dispatch per repo; new phrases join W6's list. Acceptance: criterion 8.

## Close

1. `code-simplifier` over the changed code (`.mjs`, `.js`), refinements applied.
2. The full repo gate, the dotfiles `scripts/check.sh`, and `claude-tooling-sync verify`, green.
3. `ROADMAP.md` gains three Planned items: cairn-pub adopts Vale and routes to the developer
   brief (ruling 13); each warning rule is promoted as its count reaches zero, tied to the arm
   stages; the first arm stage adopts stock `markdownlint-cli2`.
4. STATUS, HISTORY, ROADMAP per `cairn-pass`; no facts bullet (no public behavior changes);
   `CHANGELOG.md` untouched.
5. PR opened; its CI run is R2p's proof. Merge on green.
6. Score both budgets: tokens against 6M, attended time as planning misses and sittings.

## Ledger

- **Pre-flight (2026-09-28):** P0 clean; P1 R2p accepted (`5d82b505`); P2 40+ citations verified.
- **Segment A** (`wf_9903c415-ce7`, 23 agents, 1.15M tokens): all six tasks accepted. R9 `63db0ca7`,
  R1t `9b32104a`, R2 `2c444b0e` (one fix round); W1r `fcfd54a` + `446e067`, W2r `18018af`,
  W3r `1a52582` (dotfiles branch). Measured: `Cairn.Headings` 49, `Cairn.ProseProcedure` 31.
  Carry: W1r renamed the chain arg `registerPaths` to `registerPath` (old name silently ignored);
  W1r's track headings are pre-R1t copies (boundary grep); ProseProcedure's verb list grows with
  arm stages. Implementers ran on `claude-sonnet-5-5`, their first pass.
- **Segment B** (`wf_12c8c764-c1f`, then `wf_9262db99-3f5`): R6 `82337de2` accepted. W4 `710a35f`
  escalated on a surviving "admin walkthroughs" and the unrun evals re-run; a one-line fix task,
  W4f `39e7ea3` (not a plan section; dispatched from the escalation), cleared the phrase. The
  conductor ruled W4's eval deltas accepted in place of a re-run: numbered procedure exemplars
  (the base guides' own rule), measures sections to a pointer line (no drafting guidance), the Go
  Applies-to correction, and ruling 12's routing. W5 `f9727ce` accepted (retired-phrase ruling
  citations are the implementer's mapping, reviewer-checked).
- **Boundary:** dotfiles merge `fc53c6e` (rollback: `git -C ~/.dotfiles revert -m 1 fc53c6e`);
  `claude-tooling-sync verify` passes; all 11 register headings the chain names exist once.
  Until this branch merges, `site-implementer`'s new `check:docs-gate -- --page` line and the
  chain's register headings match only `style-guide-sync`, not cairn-cms `main`.
- **J1:** `787c56f3` accepted by `diff-reviewer`. The register editor's voice read: voice **held**
  ("a reader still hears the same page"); flattening only in three stock lead-ins. Its findings
  1-4 folded in `851430f2` (accepted): the decline bullet's lost precision (blocking), a step an
  unset posture cannot carry out, and two rewording drifts ("that pass-through", `cairn.aiPosture`
  as the `posture` option, re-cited to `f:rh0xv5`). Left for Geoff's sitting: findings 5-8 (the
  "follow these steps" lead-ins, the "served file" echo, one `Google.Passive`, the one-item
  precondition list) and a pre-existing citation gap on the invite bullet (`f:qgtfu6`).
- **J2:** proof worktree `.claude/worktrees/style-guide-proof` at `787c56f3`; `docs-page-chain`
  run `wf_2bfd79f2-efa` on `docs/extend/enable-tidy.md`.
- **J2:** chain `wf_2bfd79f2-efa` ended `escalate` after round 2: gate pass, fact read accept (92
  claims, 24 ids), register editor one blocking finding (a 26-word refusal-list item; it recommends a
  table). Criterion 7 treats the editor's findings as reported, so J2 meets its acceptance. Draft
  `17e6cd4a` on `style-guide-proof` (not for merge); its ten new Tidy facts `b5ce3f60` cherry-picked
  here as `04dfc824` (`check:facts` OK).
- **J5:** the W7 read found 12 mismatches (8 dotfiles, 4 cairn), no retired phrase live. J5a
  `47f5c81d` (cairn routing, CONTRIBUTING, README, public design system, the editor catalogue's tell
  families moved into the briefs) took two fix rounds: `bf8a464f` (two missing developer tells; the
  editor brief's Microsoft "just/simply/obviously" claim narrowed to the one entry that exists) and
  `a15e1802` (the Google word-list claim corrected: Google prescribes "just" for "simpler than",
  so the tell now keeps that use; "micro-instructed action" scoped to prose outside steps). The
  conductor accepted `a15e1802` without a third review: its quoted page text matches the prior
  reviewer's independent fetch verbatim. J5b `6e82a36` + `4761b14` accepted; dotfiles merge
  `53c5b09` (rollback `git -C ~/.dotfiles revert -m 1 53c5b09`), verify passes.
- **Spend:** execution about 3.1M subagent tokens (runner workflows 2.24M plus single dispatches)
  against the 6M ceiling; conductor tokens not counted.
- **Sitting (Geoff, 2026-09-29; ruling 21, `01d30285`):** J1 accepted with all four taste calls.
  J7 `26827b59` (accepted by `diff-reviewer`, `check:docs-gate` green on the final tree) folded
  them, cut the intensifier "own" (register 40 uses to 5, exemplar 5 to 3), added a "No
  intensifier 'own'" tell to both briefs, and removed the announcement-scaffolding tell, which
  also left the output style (dotfiles `7c998b4`, merged `d97d9d0`). J2 dropped: the draft carried
  the old page's framing; `style-guide-proof` and its worktree are deleted, the ten Tidy facts
  (`04dfc824`) stay. The draft-docs approach spec is amended to harvest, then delete, then draft
  (`742fc54f`), with no input guard.
- **Close:** `code-simplifier` `823b3bec` (cairn) and `cbd736a` (dotfiles, merged `32a30a7`); merge
  of `main` `c84a7d40`; `npm test && npm run check:close` exit 0 after `npm ci` in
  `examples/showcase`.

### For Geoff's sitting

1. **J1, the R5 diff** (ruling 7): `git diff 8bbe78f5 851430f2 -- docs/extend/choose-an-ai-posture.md`.
   Voice read: held. Open taste calls: the three "follow these steps" lead-ins, the "served file"
   echo in Verify, one `Google.Passive` at the UNCHECKED detail, and whether a one-item precondition
   list beats a sentence.
2. **J2, the proof draft** of `docs/extend/enable-tidy.md` on `style-guide-proof` beside the current
   page on `main`. Unresolved from the chain: the refusal list as a table (blocking), the
   `timeFormat` values (need a fact), the structural-check section's placement, the spellcheck
   paragraph, "roughly 24,000" for an exact cap.
3. **One ruling:** announcement scaffolding stays out of the editor brief (Microsoft's topic intros
   state what an article covers, so the tell would need a deviation row). Confirm, or add the row.
4. **Observation, outside this pass:** the engine's default Tidy model is `claude-sonnet-5`
   (`f:fmv6m8`); Sonnet 5.5 is out.

After the sitting: the close (code-simplifier, full gate, ROADMAP's three Planned items, STATUS and
HISTORY, merge `main` into this branch, PR, the leanness record's two errata, the fold-rule
trial's fourth measure). Close notes: `prose-voice-reviewer`'s description says "the workstation
tell catalogue"; the register editor keeps two heading-rule copies that agree with the briefs.

## Post-mortem

**What worked.**

- The re-scope under ruling 15 held. It cut the first plan's invented machinery (quote markers,
  the provenance table, section extraction, finding coercion, a custom rule-test runner, a
  markdownlint ratchet) and kept every ratified voice rule. J1's register-editor read found the
  voice held on the one page rewritten under the trimmed briefs.
- Two parallel chains through `pass-execute-chains` accepted all six segment A tasks, five of them
  first time, and ran segment B with one escalation.
- The fresh W7 reader (J5) was worth its cost. Its 12 routing mismatches (8 dotfiles, 4 cairn)
  were file-level reads a phrase grep could not make, and the re-scope fold had refused the grep
  in its favour.
- The owner sitting settled every open call at once: J1 and its four taste calls, J2, the
  filler word, and the harvest ruling.
- Implementers ran on `claude-sonnet-5-5` for the first time. Fix rounds: R2 one, J5a two, and W4
  escalated once (cleared by the one-line W4f).

**What went wrong.**

- J2 passed the old `enable-tidy.md` to the drafter for its claims, as the approach spec allowed,
  and the draft carried the old page's framing. No reviewer in the chain flagged it; Geoff's read
  caught it. The fix is structural (harvest, then delete, then draft), not a guard.
- The conductor's re-scope spec said Vale 3.23.0 has no `vale test`. The fold's verification ran
  `vale test --help` and restored it. Checking a tool's own help before writing a claim about it
  would have saved a review finding.
- J5a's register edits made two unsourced claims about the base guides (Microsoft's
  "just/simply/obviously" and Google's word-list "just"), each caught by review and corrected
  against the live page. A tell that cites a guide now quotes it.
- W4 shipped with a retired phrase still live and its evals re-run skipped; the conductor ruled
  the deltas instead of re-running. W1r silently renamed a chain arg (`registerPaths` to
  `registerPath`), and its track headings were pre-R1t copies that only the boundary grep checked.
- A fresh worktree's `check:consumers` fails until `npm ci` runs in `examples/showcase`; the
  close lost a gate run to it.
- The first plan's pre-pause spend (the first design's review folds, R1, R2p, W1 to W3) was never
  measured, so the pass's whole cost is unknown.

**Measures.**

- Tokens: about 3.4M execution subagent tokens against the 6M ceiling (57%), plus about 1.2M for
  the re-scope's four review lenses, fold, verification, and two research agents. Conductor tokens
  not counted.
- Attended time: one opening sitting (three forks), mid-run approvals, and one owner sitting.
  Planning misses: 2 (J2's input choice; the false `vale test` claim).
- Fold-rule trial, review 1 of 3, fourth measure: the fold refused three findings (L-M6, the W7
  read replaced by a grep; L-m5, a lower ceiling; L-m1, DC-28 and AW-24 moved out of W4). None
  proved a real defect in execution. The W7 refusal was vindicated, and the lower ceiling would
  not have bound at 3.4M.
- Warning rules at landing: `Cairn.Headings` 49, `Cairn.ProseProcedure` 31 (30 at the close).
  Intensifier "own": register 40 to 5, exemplar 5 to 3, about 600 left across the old arms.

**Carried, not done here.** `prose-voice-reviewer`'s description (dotfiles) still names "the
workstation tell catalogue", which no longer exists as one document since `4761b14` split tell
ownership between the output style and the repo briefs. The register editor's definition keeps
two heading-rule copies; both agree with the briefs today.
