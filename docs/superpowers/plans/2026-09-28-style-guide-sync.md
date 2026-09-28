# Style-guide sync

> **For agentic workers:** two parallel chains (R in this repo, W in `~/.dotfiles`) across two
> segments, then one sequential join segment. Chains run through the workflow runner
> `pass-execute-chains`, invoked by name once per chain segment; the join runs per task with the
> Agent tool. Implementer `cairn-implementer` on `sonnet` at effort `high`; reviewer
> `diff-reviewer` on `claude-opus-5-5`. **The conductor never reads a diff, a test log, or a gate
> transcript**; it consumes per-task records and decides accept, re-dispatch, split, or stop. One
> re-dispatch on `fix`; a second `fix` is the conductor's decision. Tasks state outcomes and
> acceptance criteria, never implementation code.

**Date:** 2026-09-28. **Goal:** every published cairn page is structured to its base style guide
first (Google for terminal readers, Microsoft for UI-only readers), in the cairn docs voice, with
the register as an overlay that departs from a guide only through Geoff's recorded exceptions; and
every writer, in the chain or outside it, receives that standard as one flat drafting brief.

**Spec:** `docs/superpowers/specs/2026-09-28-style-guide-sync-design.md` (rulings 1 to 11; task
ids R1 to R7 and W1 to W7 below are the spec's). Evidence: the audit and four-lens review under
`docs/superpowers/research/2026-09-28-style-guide-sync-*`.

**Pass class:** mixed, per task below. `engine-logic` tasks are fixture-first; their gate is
`cairn-run-gate` at `--pin scripts` plus the fixture harness (repo) or `scripts/check.sh`
(dotfiles), on the light lane. `docs` tasks that are agent-facing take `diff-reviewer` against
their stated outcomes, not the register chain. R5 follows the approach spec's "Edits after the
chain".

**Token ceiling:** 12M. **Checkpoint interval:** each segment boundary (after A, B, and the join),
at any split, and before any question. At 80% (9.6M) the conductor finishes the task in flight,
writes STATUS, and asks one combined question at the next boundary.

**Branches:** chain R on `style-guide-sync` (worktree `.claude/worktrees/style-guide-sync`, this
plan's commit on it); chain W on `style-guide-sync` in a `~/.dotfiles` worktree the runner
creates. The join runs on the repo branch after chain W merges to the dotfiles default branch and
is re-stowed (`stow -R claude`), so `~/.claude` carries W's agents and chain. The repo branch
merges to `main` by PR at the close. **No release, no version bump.**

**Owner time:** one attended read, the R5 diff for tone (ruling 7), at the close. Nothing else
waits on Geoff.

## Global constraints

- Base guide by track: `docs/editors/` and admin UI copy are Microsoft; every other published
  surface (admin, extend, reference, front door, root README, changelog, cairn.pub) is Google.
- A register rule that forbids a form the base guide prescribes or recommends is an override and
  needs a recorded exception row; only Geoff adds a row. The seed rows are the spec's (R1).
- The drafter sees only its drafting brief and exemplars, never the provenance, exceptions tables,
  or rationale. No skill or agent carries a copy of a brief.
- Every guide quote is fetched from the live page when written, with its URL.
- Vendored Vale styles are never edited. New rules ship at `warning` in `.vale.ini`; enforcement
  at error comes only through the promoted-rules pass.
- Frozen narrative arms: no page outside R5 changes in this pass.
- Code comments in `.mjs`/`.js` follow TSDoc and the no-em-dash rule; commits are path-limited.

## Review focus

1. **A promoted rule leaking into the tree run** would turn CI red on frozen pages. R2a's harness
   case: the unscoped gate exits 0 on the tree while a planted defect in a promoted page fails.
2. **The brief extraction silently returning nothing** (a renamed heading) would hand the drafter
   an empty standard. W1's test: a missing heading fails the step, never passes empty.
3. **A `source: guide` finding demoted to non-blocking** by the runner's coercion would let the
   trigger defect through. W1's test pins forced `blocking` on `source: guide`.
4. **R5 rewording approved sentences** would flatten the voice (G3). J1's sentence-level diff
   against `8bbe78f5`.
5. **The Vale pin bump changing existing rule behavior** under CI. R2a runs the whole existing
   docs gate under 3.23.0 before adding any rule.

---

## Pre-flight (conductor, before segment A)

- **P0.** Confirm no other executor holds `~/.dotfiles` or this worktree (`pgrep -f`, `git
  status`, other sessions' journals), per the one-executor rule.
- **P1.** One `haiku` pre-flight lists every checkable claim in segment A's tasks (paths, line
  numbers, the chain's `common`, `FINDING`, `valeErrorRules`, the test file's marker pattern, the
  CI Vale install step) and checks each at HEAD. Amend the plan, then dispatch.
- **P2.** One `haiku` probe answers whether PostToolUse hooks fire inside workflow subagents (a
  one-agent workflow that writes a file and reports whether `vale-hook` output reached it). Record
  the answer in STATUS; no task depends on it.

## Segment A (parallel chains)

### Chain R

**R1. Register rewrite.** Class `docs`. Files: `docs/internal/docs-register.md`.
Outcomes: every R1 bullet in the spec, without the structure-plus-voice specimen (R1b adds it).
Constraints:
- Two drafting briefs under exact headings `## Drafting brief: developer docs` and
  `## Drafting brief: editor docs`, each flat in the spec's order (structure, voice with specimen,
  tells), no cross-reference and no "except where".
- Each guide quote in a brief carries a stable id marker invisible in rendered markdown (an HTML
  comment), and the provenance table records the same id with the source text and URL. The marker
  form is stated once in the register's provenance section; R7 keys on it.
- Provenance, the tightening test, and both "Recorded exceptions" tables sit in their own
  sections, outside both briefs.
- Rewritten in the cairn docs voice; meaning changes only where a ruling says so; `#names` and
  every quotation byte-identical.
Acceptance: spec criterion 1 (the implementer's report lists each quote as fetched and matched);
the Vale Google package run on a scratch copy under a Google glob reports no error; the report
lists every ratified rule as kept, reworded, or changed by ruling N (criterion 2's ledger input,
graded at J4).

**R2a. Vale harness, pin, heading rules, rollout.** Class `engine-logic`. Files: `.vale.ini`,
`.vale/styles/Cairn/Heading{Ing,Question,Teaser}.yml`, the vocab accept list,
`scripts/checks/docs-gate.mjs` and its unit test, a new `scripts/checks/vale-fixtures.mjs` and
fixtures tree, the promoted list (`scripts/checks/promoted-docs.json`: `rules` and `pages`),
`.github/workflows/test.yml` (pin), `ROADMAP.md`.
Outcomes: the spec's R2a bullets. The pin bump goes through the `dependency-upgrade` skill and
runs the existing docs gate under 3.23.0 before any new rule lands. The harness runs in the docs
gate's tree mode only. The `--page` gate adds a promoted-rules pass (`--filter` on the promoted
list) that fails on any alert; tree mode runs the same pass over the promoted pages.
`Cairn.HeadingIng`'s exception list comes from a measured tree run, listed in the report. The
reference arm and root README finding counts are measured and filed as a ROADMAP entry with that
count as its trigger.
Acceptance: criteria 3 (for R2a's rules) and 5; the pre-existing gate stays green under 3.23.0;
the report lists the vocab entries added and the `HeadingIng` exceptions.

**R2b. The remaining Vale rules.** Class `engine-logic`. Files: `.vale/styles/Cairn/{ProseProcedure,
LinkText,LinkInHeading,CodeFont,ListItemCase}.yml`, fixtures, `promoted-docs.json` (adds
`LinkText`, `LinkInHeading`).
Outcomes: the spec's R2b bullets, fixtures in the R2a harness, `ProseProcedure`'s tree-wide count
recorded as the promotion baseline in the report and in a `// WATCH:`-style note beside the rule.
Acceptance: criteria 3 (R2b) and 4.

### Chain W

**W1. `docs-page-chain.js`.** Class `engine-logic`. Files: `claude/.claude/workflows/docs-page-chain.js`,
`tests/docs-page-chain-derivation.test.mjs`.
Outcomes: the spec's W1 bullets. The page-inputs agent extracts the brief (and, for the register
editor, the provenance and exceptions sections) by exact heading and returns them in its schema;
a missing heading fails the step. The conductor passes `valeErrorRules` in args from the promoted
list. `FINDING.source` is required; the runner forces `blocking` on `source: guide`.
Acceptance: criterion 6 plus the Review focus 2 and 3 tests; `scripts/check.sh` passes.

**W2. Drafter definition.** Class `docs`. Files: `claude/.claude/agents/cairn-docs-drafter.md`.
Outcomes: the spec's W2. Acceptance: criterion 12's W2 clause.

**W3. Register-editor definition.** Class `docs`. Files: `claude/.claude/agents/cairn-register-editor.md`.
Outcomes: the spec's W3 in full, including the no-track default. Acceptance: criterion 12's W3
clause; no retired phrase from W6's seed list remains.

## Segment B (parallel chains)

### Chain R

**R3. `check:markdown`.** Class `engine-logic`. Files: `package.json` (dev dependency, script),
`scripts/checks/docs-gate.mjs` and its unit test, custom rules under `scripts/checks/markdownlint/`,
fixtures. Dependency added through the `dependency-upgrade` skill's new-package survey.
Outcomes: the spec's R3. Acceptance: criterion 3 (R3); the unscoped gate stays green.

**R7. `check:register-briefs`.** Class `engine-logic`. Files: `scripts/checks/register-briefs.mjs`,
`package.json`, `docs-gate.mjs` (tree mode), drift fixtures. Depends on R1's marker form.
Outcomes: the spec's R7 failure states, each with a fixture. Acceptance: criterion 11.

**R6. Admin design system.** Class `docs`. Files: `docs/internal/admin-design-system.md`.
Outcomes: the spec's R6. Acceptance: criterion 12's R6 clause; `check:prose` unchanged and green.

**R8. Stale-reference check, repo side.** Class `engine-logic`. Files: a retired-phrases list in
the repo (shared format with W6), a check wired into the docs gate's tree mode, fixtures. Scope:
`CLAUDE.md` and `docs/internal/**` excluding `record/`, `consultations/`, and dated
specs, plans, and research. Outcomes: the spec's W6, repo half. Acceptance: fires on a planted
phrase, passes on the tree; any current hit is reported, not fixed (J5 fixes).

**R9. Exemplar captures.** Class `docs`. Files: `~/.local/share/cairn/exemplars/` (three
captures), `docs/internal/record/docs-exemplars.md` (manifest rows). Outcomes: the spec's
Exemplars paragraph: a Google developer task page with a numbered procedure, a Google concept
page, and a Microsoft Learn procedure page, each run through the structure-only config and its
result recorded in the manifest. Acceptance: criterion 12's captures clause.

### Chain W

**W4. Voice docs and routing.** Class `docs`. Files: `claude/.claude/skills/writing-voice/SKILL.md`,
`claude/.claude/docs/voice/technical-doc-web.md`, `claude/.claude/docs/voice/editor.md`.
Outcomes: the spec's W4 and "W4 addition" (the cairn-docs route reads the track's drafting brief).
The report states whether `writing-voice/evals` re-ran and their result. Acceptance: criterion 10.

**W5. Implementer definition.** Class `docs`. Files: `claude/.claude/agents/cairn-implementer.md`.
Outcomes: the spec's W5. Acceptance: criterion 12's W5 clause.

**W6. Stale-reference tripwire, dotfiles side.** Class `engine-logic`. Files: a retired-phrases
list (same format as R8), a check in `scripts/check.sh`, fixtures. Scope: `claude/.claude/`
agents, skills, workflows, `docs/`, and the global `CLAUDE.md`. Acceptance: fires on a planted
phrase, passes on the tree after W2 to W5; `scripts/check.sh` and `claude-tooling-sync verify`
pass (criterion 13).

**Segment B boundary:** merge chain W to the dotfiles default branch, `stow -R claude`, verify
`claude-tooling-sync verify`; confirm chain R is green on `style-guide-sync`. STATUS written.

## Join segment (sequential, Agent tool, repo branch)

**J1. R5, the trigger page.** Class `docs`, under "Edits after the chain". Files:
`docs/extend/choose-an-ai-posture.md`, its brief, `promoted-docs.json` (adds the page).
Outcomes: the spec's R5. Acceptance: criterion 9 except Geoff's read, which comes at the close.

**J2. Proof run.** Read-only, one `claude-opus-5-5` agent. Outcome: criterion 7 (a), (b), (c),
run against the chain's rendered register-editor prompt and the docs gate. Stop on any failure.

**J3. R1b.** Class `docs`. Files: `docs/internal/docs-register.md`. Outcomes: the spec's R1b;
`check:register-briefs` passes after the edit.

**J4. Register review.** One fresh `cairn-register-editor` read under the new lens, positive
control first (criterion 8), plus a fresh `claude-opus-5-5` meaning-ledger read of the pre-pass
and post-pass register (criterion 2). Blocking findings fold through one `cairn-implementer`
dispatch and one re-read.

**J5. W7 infra read.** One fresh `claude-opus-5-5` reader, no part in the pass, returns the
spec's W7 file list with a verdict per file. Every mismatch is fixed in one implementer dispatch
per repo (repo edits on this branch; dotfiles edits committed and re-stowed), including the owed
`CLAUDE.md` erratum ("On top of the Google floor" becomes "base", naming the drafting briefs).
Every new phrase joins both retired-phrase lists. Acceptance: a re-run of both tripwires is
clean, and the reader's list has no open mismatch.

## Close

1. `code-simplifier` over the changed code (`.mjs`, `.js`, Vale YAML), refinements applied.
2. The full repo gate and `scripts/check.sh`, green.
3. Owed errata recorded (not edited): the approach spec's "No new check is built" and retirement
   row; `docs/internal/record/2026-08-15-docs-outlines-with-visuals.md:58`.
4. STATUS, HISTORY, ROADMAP per `cairn-pass`; a facts bullet only if a public behavior changed
   (none expected); `CHANGELOG.md` untouched unless the gate says otherwise.
5. **Geoff reads the R5 diff once for tone** (ruling 7). Then the PR merges.
6. Score both budgets: tokens against 12M, attended time as planning misses and sittings.
