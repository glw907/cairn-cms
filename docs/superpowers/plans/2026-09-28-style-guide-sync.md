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
rules at warning, stock markdownlint, and the register editor working a checklist plus Vale's
output.

**Spec:** `/var/home/glw907/Projects/cairn-cms/.claude/worktrees/style-guide-sync/docs/superpowers/specs/2026-09-28-style-guide-sync-design.md`
(rulings 1 to 20, the Sources list, and criteria 1 to 10). Leanness record:
`docs/superpowers/research/2026-09-28-style-guide-sync-leanness.md`.

**Pass class:** mixed, per task. Each task carries `passClass` in the runner args.
**Token ceiling:** 6M for the remainder (ruling 20). **Checkpoint:** every segment boundary, any
split, and before any question. At 80% (4.8M) finish the task in flight, write STATUS, and ask one
combined question at the next boundary.

**Gates (runner args, exact).**
- Chain R `engine-logic` tasks (R2, R3): `gateTier: "scripts"` and `gate` set to the literal
  `npm run check:docs-gate && npm run check && npm test && npm test -w
  packages/create-cairn-site` (the `SCRIPTS_GATE` string). Default heavy lane.
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

**Owner time:** one sitting after J2: the R5 diff and the J2 draft beside the current
`enable-tidy.md`. Nothing else waits on Geoff.

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

1. **The trim dropping voice** (ruling 16). R1t's disposition list against `feca3348`, graded at
   J4.
2. **A new rule turning the tree run red.** Both rules at `warning`; the unscoped gate exits 0.
3. **The revert leaving dead references.** No code, test, prompt, or agent definition names
   `docs-chain-render.mjs`, a `q:` id, or `source: guide` after W1r to W3r.
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
- **P3.** A new-package note for `markdownlint-cli2` (current production version, license,
  maintenance, one line of rationale) goes into R3's `notes`.

## Segment A

**Chain R, in order: R9, R1t, R2, R3.**

### Task R9. Exemplar captures

Class `docs`. Files: `docs/internal/exemplars/` (new: three captures and a `README.md`).
Outcomes: the spec's R9. Three pages captured to markdown with `curl` plus `pandoc`: a Google
developer task page with a numbered procedure, a Google concept page, and a Microsoft Learn
procedure page. Each file opens with its source URL, capture date, and a CC BY 4.0 attribution
line. The README names each file and its role (anatomy). The directory is confirmed skipped by
Vale and by every docs check the gate runs. Acceptance: the three files exist with attribution;
`npm run check:docs-gate` passes; the report lists the paths.

### Task R1t. Trim the register

Class `docs`, `model: opus`. Files: `docs/internal/docs-register.md`. Notes: R9's capture paths.
Outcomes: the spec's R1t bullets. Each drafting brief becomes a supplement under 1,000 words
(specimens and exemplar list excluded): the base-guide link, the voice with its specimens (the
why-cairn front-door specimen, the `choose-an-ai-posture.md` lines 23-26 paragraph at `8bbe78f5`
verbatim, the `Killed:` specimen), the exemplar list, and a short tell list. Every `q:` and `x:`
marker goes; the guide-quotes provenance becomes a plain sources list; the tightening test and the
two exceptions sections merge into `## Deviations from the base guides`. Every other R1 section
stays, with `## Names` and every quotation byte-identical.
Acceptance: criteria 1 and 2 (the disposition list is in the report, graded at J4); `wc -w` per
brief in the report; `grep` finds no `<!-- q:` or `<!-- x:` marker.

### Task R2. The Vale rules

Class `engine-logic`. Files: `.vale.ini`, `.vale/styles/Cairn/Headings.yml`,
`.vale/styles/Cairn/ProseProcedure.yml`, the vocab accept list, `scripts/checks/vale-rule-examples.mjs`
(new) and its examples directory, `scripts/checks/docs-gate.mjs` and its unit test.
Outcomes: the spec's R2. Both rules at `warning`; one pass and one fail example per rule (the
`ProseProcedure` fail examples are verbatim copies of the two passages the spec names); the
example script runs in the docs gate's tree mode; each rule's tree-wide count sits in a `WATCH`
comment beside it; the vocab entries are listed in the report.
Acceptance: criteria 3 and 5; the example script fails when a fail example is edited clean
(shown once in the report, then restored).

### Task R3. markdownlint

Class `engine-logic`. Files: `package.json`, `package-lock.json`, `.markdownlint-cli2.jsonc`,
`scripts/checks/docs-gate.mjs` and its unit test. Notes: P3's package note.
Outcomes: the spec's R3; each disabled rule carries its count in a comment. Acceptance: criteria 4
and 5.

**Chain W, in order: W1r, W2r, W3r.** A W task whose change clears a ratchet baseline entry
removes that entry in the same commit, with `claude/.claude/tooling/ratchet-baseline.json` in its
Files.

### Task W1r. Revert W1 and wire the brief by track

Class `engine-logic`. Files: `claude/.claude/workflows/docs-page-chain.js`,
`tests/docs-page-chain-derivation.test.mjs`, `scripts/docs-chain-render.mjs` (removed).
Outcomes: the spec's W1r. `git revert 79c5e23` first, as its own commit. Then the drafter and
editor prompts name the track's brief heading and tell the agent to read that section from the
register; the editor prompt has the editor run Vale on the page and grade the brief's tells and
Vale's alerts together. One test covers the track-to-brief mapping for every track value.
Acceptance: criterion 6's first clause; review focus 3; `scripts/check.sh` passes.

### Task W2r. Drafter definition

Class `docs`. Files: `claude/.claude/agents/cairn-docs-drafter.md`.
Outcomes: the spec's W2r. Acceptance: no reference to exemplar roles, rendered sections, or the
render script; the brief outranks the definition; `scripts/check.sh` passes.

### Task W3r. Register-editor definition

Class `docs`. Files: `claude/.claude/agents/cairn-register-editor.md`.
Outcomes: the spec's W3r. Acceptance: no `source` field, `q:` id, or coercion reference remains;
the base-guide-first lens and the editors-arm scoping from `4461c1f` stay; `scripts/check.sh`
passes.

## Segment B

**Chain R: R6.**

### Task R6. Admin design system and the repo `CLAUDE.md`

Class `docs`. Files: `docs/internal/admin-design-system.md`, `scripts/checks/check-admin-prose.mjs`
(header comment only), `CLAUDE.md` (Authoring section).
Outcomes: the spec's R6. The voice principle near line 56, "friendly-but-professional" (near line
1238), and "Lean on the cairn/stacking metaphor" (near line 1243) change under rulings 5 and 8;
the script header routes the release-time read to a Microsoft UI-text read. Acceptance:
`check:prose` unchanged and green; no "slightly academic", "no house voice", or "On top of the
Google floor" remains in the three files.

**Chain W, in order: W4, W5, W6.**

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
procedure as prose; `writing-voice/evals` re-run with no regression, or each delta named;
`scripts/check.sh` passes.

### Task W5. Implementer definitions

Class `docs`. Files: `claude/.claude/agents/cairn-implementer.md`,
`claude/.claude/agents/site-implementer.md`.
Outcomes: the spec's W5, per the plan section: the "plain voice" line in both points docs prose
at the track's drafting brief, and `site-implementer`'s cairn-cms docs gate adds
`npm run check:docs-gate -- --page <page>` for each page it touches. Acceptance: both lines
present; `scripts/check.sh` passes.

### Task W6. Retired phrases

Class `sweep`. Files: `claude/.claude/tooling/retired-phrases.txt`.
Outcomes: these phrases appended, each with a comment naming its ruling: "Vale-enforced floor",
"a floor is not a ceiling", "academic introduction", "slightly academic", "25-40-word", "on top of
the Google floor", "admin walkthroughs", "no house voice", "not a house voice". A line recording a
retirement carries `retired-ok`. Acceptance: the existing scanner passes on the tree with no new
baseline entry; `scripts/check.sh` passes.

### Segment B boundary (conductor)

1. Confirm chain R green on `style-guide-sync`.
2. Re-run P0 against `~/.dotfiles`. Merge chain W into dotfiles `main` with `--no-ff`; record the
   merge SHA in STATUS as the rollback point.
3. `claude-tooling-sync verify` passes on the merged `main`.
4. STATUS written.

## Join (sequential, Agent tool)

### Task J1. R5, the trigger page

Class `docs`, `model: opus`, under "Edits after the chain". Files:
`docs/extend/choose-an-ai-posture.md` and its brief.
Outcomes: the spec's R5. Acceptance: criterion 7 except Geoff's read; the register editor's voice
verdict on the diff is in the report.

### Task J2. Proof run

The conductor creates branch `style-guide-proof` off `style-guide-sync` in a new worktree and runs
the `docs-page-chain` workflow by name on `docs/extend/enable-tidy.md`, with `exemplarSources`
from the developer brief's exemplar list and the page's existing facts. The draft commits to that
branch only. Acceptance: criterion 8 except Geoff's read.

**Then Geoff's one sitting:** the J1 diff with the register editor's verdict, and the J2 draft
beside the current page. A rejected J1 diff reopens J1; a rejected J2 draft reopens R1t's voice
section and the exemplar list before J4.

### Task J4. Register review

One fresh `cairn-register-editor` read of the trimmed register, plus one fresh `claude-opus-5-5`
read grading R1t's disposition list against `feca3348` (criterion 2). Blocking findings fold
through one `cairn-implementer` dispatch, then one re-read. Acceptance: criteria 2 and 9.

### Task J5. W7 infra read

One fresh `claude-opus-5-5` reader, with no part in the pass, returns the spec's W7 file list
with a verdict per file, naming `site-implementer`, the output style, the authoring charter, the
global `CLAUDE.md`, and `check-admin-prose.mjs` explicitly. Mismatches are fixed in one
implementer dispatch per repo; new phrases join W6's list. Acceptance: criterion 10.

## Close

1. `code-simplifier` over the changed code (`.mjs`, `.js`), refinements applied.
2. The full repo gate, the dotfiles `scripts/check.sh`, and `claude-tooling-sync verify`, green.
3. `ROADMAP.md` gains two Planned items: cairn-pub adopts Vale and routes to the developer brief
   (ruling 13); each warning rule and disabled markdownlint rule is promoted as its count reaches
   zero, tied to the arm stages.
4. STATUS, HISTORY, ROADMAP per `cairn-pass`; no facts bullet (no public behavior changes);
   `CHANGELOG.md` untouched.
5. PR opened; its CI run is R2p's proof. Merge on green.
6. Score both budgets: tokens against 6M, attended time as planning misses and sittings.
