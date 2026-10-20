# Style-guide sync plan review: fold record

**Fold agent:** one `claude-opus-5-5` read at `high`, 2026-09-28. **Target:** the plan at
`898485e0`, revised in place; the spec took narrow edits for rulings 12 to 14 only. **Inputs:**
the three lens reviews beside this file (contract, mechanics, domain). Every finding was checked
against the files before it was disposed; the verification notes are inline.

**IDs.** `C-` contract, `K-` mechanics, `D-` domain; `m` marks a minor, `OC` an over-ceremony item.
**Counts:** 56 finding ids (19 contract, 20 mechanics, 17 domain including its "not raised"
evals note). 52 folded, 2 folded with a part refused, 0 wholly refused, 2 owner forks (C-M5 and
D-F1, both answered by rulings 14 and 13 and applied), 0 new forks.

**Why nothing is wholly refused.** Every finding verified true at HEAD (the probes are cited
below), and each fix is a plan line or a fixture, not new machinery. Where a fix cost more than
its risk, the part that cost too much is refused and named (D-m2, C-m2).

## Owner answers applied

- **Ruling 12** (charter corrected, "no house voice" retired): spec Rulings 12, spec W4 and W6, plan
  Ruled inputs (retired phrases), W4 (charter, global `CLAUDE.md`, output style, skill), R8 (the
  repo `CLAUDE.md` Authoring section, which is this repo's file, so chain R carries it). Verified
  hits: `CLAUDE.md:296`, dotfiles `CLAUDE.md:267`, `authoring-charter.md:17`,
  `output-styles/writing-voice.md:12`, `skills/writing-voice/SKILL.md:8`. Two literals ("no house
  voice", "not a house voice") since the dotfiles files use the second form.
- **Ruling 13** (cairn.pub route now, adopt later; D-F1): W4's routing bullet; Close step 4 files
  the ROADMAP item in this repo, since cairn-pub has no `ROADMAP.md` or `CLAUDE.md` today.
- **Ruling 14** (tone read after J1; C-M5, D-M3): header "Owner time", the J1 note, the J-2 segment
  split, J3's specimen rule.

## Dispositions

### Convergent: the tripwires fail on today's tree

**C-B1, K-M7, K-m1, D-m3, C-m7, K-m10.** Folded. Verified: the repo seed hits are
`CLAUDE.md:309`, `docs-register.md:12,19`, `admin-design-system.md:56`; the dotfiles hits are
`cairn-register-editor.md:70,98`, `writing-voice/SKILL.md:24`, and the dated record
`docs/record/2026-09-19-docs-infra-audit.md:33`. Every live hit is now cleared by a task that runs
before its tripwire (R1, R6, R8 in chain R; W3, W4 in chain W; chain orders stated). R8 lands the
`CLAUDE.md` edit itself. Both checks exclude records, the list file, and fixtures (W6 also
`skills/synced/`, `evals/research/`), fail on a missing or empty list, honor a `retired-ok` line
marker, and name their twin in the list header. The descriptive seeds become literals
("25-40-word", "admin walkthroughs"). Where: Ruled inputs, R8, W6.

### Convergent: brief extraction, testability, drafter input

**C-M1, C-M2, K-M5, K-M6, D-B1.** Folded. Verified: `docs-page-chain.js:154-158` points every
stage, the drafter included, at the register path; the test file extracts only marker blocks
(`:17-19`). Fix: every heading fixed up front in Ruled inputs; the drafter's input set named
(brief, Names, Visuals, track section, page anatomies) with no register path; the page-inputs
agent runs a runner-rendered fixed command and returns stdout verbatim; a pure validator
(heading, sentinel, line count, minimum length, `q:` marker) fails the step; all renderers and the
coercion are pure functions between the test markers; a Segment B boundary probe runs the real
extraction against the landed register. Where: Ruled inputs, W1, W2, boundary step 4.

**D-m2.** Folded with a part refused. The sentinel, line count, and marker stripping are folded
into W1. The emitter's home in R7's `register-briefs.mjs` is refused: W1 runs in segment A and R7
in segment B, and a repo-side emitter makes the chain depend on a script that a cairn checkout off
`main` lacks. W1 renders the command itself.

**K-M4, D-M4.** Folded. Verified `anyFix` reads only `verdict` (`docs-page-chain.js:343, 385`).
The coercion forces `blocking` only for a `source: guide` finding whose `rule` is a `q:` id the
brief carries, then sets `verdict: fix` on any blocking finding. A missing or unknown `source`
reads as `guide` (C-M1's fail-safe). Where: W1, W3, Review focus 4.

**D-M1.** Folded. Verified: the page-inputs prompt (`:232-233`) and the drafter definition
(`cairn-docs-drafter.md:15`) imitate every exemplar for register. Per-entry `role`, anatomy
wrapping, W2's rhythm clause scoped to voice-role exemplars, R9 manifest rows carry the role.

**D-M2.** Folded. The concept paragraph is pinned: `choose-an-ai-posture.md:23-26` at `8bbe78f5`,
outside J1's restructured ranges, so it stays byte-identical. One Killed flattened rewrite; the
why-cairn opener labeled front-door and first-person-only. Where: R1.

**D-M3.** Folded: J1 runs at `model: opus`; the timing half is ruling 14.

### Promoted list, gates, and runner mechanics

**C-M4, K-m2 (promoted set part), K-m3.** Folded. The promoted set is named in Ruled inputs. The
gate fails closed on a missing or malformed list, a missing page, and an absent style file, one
fixture each; criterion 5's case uses a fixture list. The pass counts JSON alerts (the probe
showed Vale exits 0 on warnings). Where: Ruled inputs, R2a, Global constraints.

**K-M1.** Folded. Verified `SCRIPTS_GATE` runs `npm test`, which ends in the Playwright component
project. Chain R keeps the heavy lane; chain W sets `gateLane: "light"` per task; `args.gateLane`
is never set. Where: header "Gates".

**K-M2.** Folded. Verified `resolveGate` returns `t.gate || a.gate` for a pinned task and the
reviewer marks any difference blocking (`pass-execute-chains.js:274-275, 334-335`). Each pinned
task carries the literal `SCRIPTS_GATE` string. Where: header "Gates".

**K-M3.** Folded. Verified the runner reads a "Ruled inputs" section and a "Task <id>" section and
creates no worktree. The plan gains both headings, an absolute `planPath` and spec path, the
chain W `notes` line, and a conductor-created worktree outside `~/.dotfiles`. Where: header,
Ruled inputs, P2, task headings.

**K-M8.** Folded. Boundary step 2: re-run P0, `--no-ff`, merge SHA as the rollback point,
fail-closed window noted in STATUS.

**K-m7.** Folded: `claude-tooling-sync verify` moved to the boundary and the close.
**K-m8.** Folded: header resume line.
**K-m9.** Folded: `q:` and `x:` prefixed markers; stripped from the drafter's copy.
**K-OC2.** Folded: re-stow dropped (verified `~/.claude/output-styles` and siblings are folded
directory symlinks); boundary step 2 says why.

### Contract and criteria

**C-M3.** Folded. Exception rows name an `x:` passage id or the `dormant` flag; R7 adds the orphan
provenance entry, a missing heading, and a malformed or duplicate marker, reports every failure in
one run, one fixture each. Where: Ruled inputs, R7.

**C-M6, K-m2 (J2 part).** Folded. J2 is a write task: a plant under `docs/extend/`, removed, with
`git status` reported clean; the prompt rendered by W1's script; the editor dispatched on that
exact text; findings run through the script's coerce mode; one re-run on failure.

**C-M7.** Folded. Restructured ranges pinned against `8bbe78f5` (verified headings at lines 78 and
97, precondition at 6-8, 108 lines total); positive control at `feca3348`; the planted loosening
named; J4's fold re-runs `check:register-briefs` and the gate.

**C-m1.** Folded: R1's `diff-reviewer` re-fetches every quoted URL.

**C-m2, K-m6.** Folded with a part refused. Verified `.github/workflows/tool.yml:46`. R2p bumps
both pins and files a friction-log line for the frozen page's stale comment. Refused: making "CI
green on the pin commit" a per-task acceptance, which would push the branch mid-pass for a result
the probe already showed (3.23.0 is clean on the tree). The PR's CI run at the close is the proof.

**C-m3.** Folded: R2a's harness fails on a Cairn or custom rule with no fixture pair, with the
seven pre-existing Cairn rules on a named legacy allowlist (verified `.vale/styles/Cairn/`).
**C-m4.** Folded: R2a owns `.vale-structure.ini` and its Microsoft variant; R3 owns the markdownlint
structure config; R9 moved to the join, after both.
**C-m5, D-nr1.** Folded: W4's acceptance adds the routing clauses and an evals bar (no regression,
or the delta named); verified `skills/writing-voice/evals/` exists.
**C-m6.** Folded: Close step 2.
**C-m8.** Folded: R2a records `debug-your-site.md:36` as deferred in the ROADMAP entry.
**C-OC1.** Folded: R2a states criterion 3's reading (config-load proof per stock or vendored
config, full pairs for Cairn and custom rules). Owed spec erratum below.
**C-OC2.** Folded: P2 hooks probe dropped. The question is moot for this pass: the `--page` gate
enforces the promoted rules whether or not `vale-hook` reaches the drafter, and the drafter gets
`valeErrorRules` in its prompt. The spec's open item stays as written.
**C-OC3.** Folded: "plus the fixture harness" dropped from the gate string (verified the harness
runs inside `check:docs-gate`, which `SCRIPTS_GATE` includes).

### Mechanics minors

**K-m4, D-m8.** Folded: `curl` plus `pandoc` as the fetch path, "never the Page Summary block",
R1 at `model: opus`, provenance records URL and fetch date. Global constraints and R1.
**K-m5.** Folded: the implementer has no Skill tool and `dependency-upgrade` excludes new
packages, so the conductor runs both surveys at P3 and hands the paths in `notes`.
**K-OC1.** Folded: the pin bump is its own task, R2p.

### Domain coverage

**D-M5.** Folded: W4 names the charter, global `CLAUDE.md`, output style, `technical-doc-web.md`'s
"Applies to" line, and the output style's numbered-list clause; J5 discovers only unknowns.
**D-M6.** Folded: W5 covers `site-implementer` (verified its gate line at `:115-116` skips the
`--page` pass) and J5 names it.
**D-m1.** Folded: W2 deletes the drafter's own tell list. Owed spec erratum below.
**D-m4.** Folded: W3 deletes "25-40-word" and anchors Noir to the "qualified claims stay whole"
delta.
**D-m5.** Folded: W3 scopes "What is sanctioned" and repoints the genre line.
**D-m6.** Folded: W4 fixes `register-check` (verified its pointer to the July plan at `:70`).
**D-m7.** Folded: R6 names lines 1238 and 1243 (verified) and the `check-admin-prose.mjs` header.
The "stacking metaphor" line goes under rulings 5 and 8.

## Rulings for Geoff

None. The two forks the reviews raised are answered (rulings 13 and 14), and every other call
here is method or scheduling.

## Owed errata (ratified documents, recorded, not edited)

- **Design spec, criterion 3:** stock markdownlint and vendored Headings rules are proven by one
  config-load fixture per config, not a pair per rule (C-OC1).
- **Design spec, W2:** "The setup-colon tell gains the list remedy" is superseded; the drafter's
  tell list is deleted and the list remedy lives in the brief's `### Tells` (D-m1).
- **Design spec, R6:** also covers lines 1238 and 1243 and the `check-admin-prose.mjs` header
  (D-m7).
- **Design spec, W5 and W6:** W5 also covers `site-implementer`; W6's dotfiles scope adds
  `output-styles` and excludes `docs/record/`, `skills/synced/`, `evals/research/` (D-M6, K-m1).
- **Design spec, Pass shape:** the task set gains R2p and R8, and R9 moves to the join.
- **Design spec, Open for the plan:** resolved by the plan (markers, the extraction home, the
  `debug-your-site.md:36` deferral); the hooks item is moot (C-OC2).
- Carried from the plan: the approach spec's "No new check is built" and its retirement row;
  `docs/internal/record/2026-08-15-docs-outlines-with-visuals.md:58`.

## Infra re-baseline (2026-09-28, after the infra sweep's A-core and B merged)

The plan took the ten amendments in the dotfiles infra sweep spec
(`/var/home/glw907/.dotfiles/docs/superpowers/specs/2026-09-28-claude-infra-sweep-design.md`,
"Amendments to the style-guide-sync plan"). No ruling above is undone: K-M1's lanes, K-M2's
pinned `SCRIPTS_GATE`, K-M3's notes spec path and conductor-made worktree, and K-m1's W6 scope all
stand; W6's scope is now met by the A-core scanner, a superset of it.

**P1, re-run** against this branch at `a9af1c92` and dotfiles `main` at `d7f0581`: 75 claims
checked. Line numbers this record cites have moved on dotfiles `main` (`docs-page-chain.js`
register path now `:154-155`, `site-implementer.md` docs gate now `:106`); the plan carries the
current ones. Three plan claims were wrong or incomplete and were fixed: `test.yml` carries the
Vale pin in a step name and URL, not `VALE_VERSION` (R2p); the runner requires `args.gate`, which
the plan never set (now the `SCRIPTS_GATE` literal); the runner reads `reducedGate` per task or
from `args`, never per chain (each W task carries it; `args.reducedGate` stays unset so it cannot
reach chain R).

**Amendment 10.** B1's style-guide-sync fixture, re-run from a scratch copy with both segments'
real Gates-block arguments, passes (exit 0); the pre-amendment arguments fail it (negative
control, exit 1). The two workarounds (the chain W notes override of the definition of done, and
W6 deferring the tooling check to the boundary) have no hit in the plan.
