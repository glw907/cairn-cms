# Plan one adversarial review: spec coverage, charter, proportion

Reviewed: `~/.dotfiles/docs/superpowers/plans/2026-09-08-docs-standard-claude-infra.md`
against `docs/superpowers/specs/2026-09-08-docs-standard-design.md` (sections "Claude setup",
"Where each piece lives", "Unit 3c", "Owner decisions", "Rationale"),
`~/.claude/CLAUDE.md` ("Writing voice", "Pass sizing is the orchestrator's job"), and
`~/.claude/docs/authoring-charter.md`. Read-only; nothing was edited.

**Verdict: covers with fixes.** Every spec item traces to a task. Four findings must be
fixed before dispatch, three of them cross-repo behavior changes the plan does not disclose,
one of which inverts the spec's own containment requirement.

## Traceability

| Spec item | Task | Status |
|---|---|---|
| Claude setup 1: both `CLAUDE.md` gain four lines, displacing four | 6 | covered, blocked half by design |
| Claude setup 2: output style gains three tells | 2 | covered |
| Claude setup 3: voice files name corpus entries and bands | 2 | covered for 4 of 5 files (see F5) |
| Claude setup 4: scanner gains two shares, behind the profile, band file per audience | 1, bands in 2 | covered |
| Claude setup 5: Vale hook grades a draft by its path | 3 | CHANGED, upheld in part (see rulings) |
| Claude setup 6: review agents change dispatch shape, `figure-verifier` is new | 4 | covered, with F1 |
| Claude setup 7: `cairn-figure` new, writing-voice gains author-facing section | 5 | covered |
| Where each piece lives: measurement instrument as a shared definition | 1 (doc comments only) | CHARTER INVERSION, see F2 |
| Where each piece lives: the review protocol | 4, 5 | covered |
| Unit 3c criterion 1: output style, voice files, agents, skills, Vale hook change as listed | 2, 3, 4, 5 | covered |
| Unit 3c criterion 2: fixture proves the profile does not fire on site content | 1, fixture A | covered, then defeated by F1 |
| Unit 3c criterion 3: both `CLAUDE.md` within the budget hook | 6, blocked half | NOT CLOSABLE this pass; disclosed |
| Unit 3c criterion 4: the tellgrader change clears its gate | 1 | CHANGED, upheld (see rulings) |

Nothing is MISSING.

## Rulings on the two declared changes

**1. The tellgrader gate, corrected from "poplar's own `make check`" to the module's own
Makefile wired into `check.sh`. UPHELD.** Verified independently: the module is
`~/.dotfiles/claude/.claude/skills/writing-voice/evals/tellgrader/`, module path
`github.com/glw907/workstation/tellgrader`, with its own `Makefile`; `scripts/check.sh` runs
five steps today and none of them is a Go step. The spec criterion is factually wrong and
poplar is not involved. The added `check.sh` wiring goes past bare correction but is the
proportionate way to make the corrected gate real. `go` and `golangci-lint` are both on PATH
(Homebrew), so the fail-loud choice does not break the gate today; the plan's Risks section
should carry that dependency, since a future machine without golangci-lint fails every
unrelated dotfiles change.

**2. The Vale hook read as the smallest true change. UPHELD IN PART.** The reading is correct
and correctly recorded for the owner: the hook already lints from the nearest `.vale.ini` by
relative path, so path grading is Vale's section globs, not a hook feature to build. Two
defects in the task as written. First, it says it "changes nothing else" while criterion 1
changes the `/superpowers/` skip from substring to segment matching, which is a real behavior
change in every repo the hook fires in. Second, criterion 3's three cases (Microsoft under
`docs/admin/`, Google under `docs/extend/`, neither under `src/content/`) test Vale's
section resolution, not the hook's; they can pass while proving nothing about the code the
task touches. Reword criterion 3 to assert on the hook's own resolved-root and relative-path
output, which criterion 2 already introduces.

## Findings

**F1 (blocking, charter). Task 4 wires the profile's escape hatch on as the default, which
defeats unit 3c criterion 2 and owner decision 7.** Task 4 states that `prose-voice-reviewer`
and `cairn-register-editor` each run `tellgrader --profile docs-register --register <r>
<file>` as their deterministic floor. Task 1's own fixture D establishes `--profile
docs-register` as the force-on escape that bypasses the repo opt-in for any path. Both agents
are dispatched by `site-pass` (ecxc-ski, 907-life) on site content, which decision 7 exists
to keep cairn's bands away from. Fix: the agents omit `--profile` and let repo resolution
decide; force-on stays a reviewer's explicit, per-invocation act.

**F2 (blocking, charter). The shared definition lands in the wrong repo.** "Where each piece
lives" assigns "the measurement instrument as a shared definition" to the workstation. Task 1
instead makes the Go doc comments name `~/Projects/cairn-cms/scripts/checks/measure-prose.mjs`
as the reference implementation the Go tracks. That leaves the canonical definition inside the
one repo the spec says must not own it, and every other family repo inherits a scanner whose
definition of a hinged pair is a cairn file. Fix: task 1 also writes the definition as a
workstation document under `~/.claude/docs/voice/` and has both implementations cite it; the
cairn script becomes a consumer, not the source.

**F3 (blocking, cross-repo). "Must refuse to grade without a corpus entry" is a global agent
change stated as a cairn requirement.** `prose-voice-reviewer` is dispatched by `site-pass`
and `writing-voice`; `diff-reviewer` is dispatched by `pass-execute.js` and
`pass-execute-chains.js`, meaning every pass in poplar, dubplate, and all four sites. A hard
refusal rule turns those existing dispatches into failures the moment they land, since no
corpus exists outside cairn. Fix: scope the refusal to dispatches that name a docs-register
repo, or state the default (grade without corpus, note its absence) for everything else. The
plan must also say plainly that task 4 changes agent behavior for every repo.

**F4 (non-blocking, cross-repo disclosure). Tasks 2 and 3 change behavior outside cairn and
say so nowhere.** The output style is always on in every repo, so its three new tells govern
drafting for poplar, dubplate, and site content. The voice files with cairn-derived bands are
read by `writing-voice` for every repo. The `vale-hook` fires on every save everywhere. None
is harmful, and all three are spec-funded; the omission is disclosure, and the fix is one
sentence per task naming the blast radius.

**F5 (non-blocking, coverage). The voice-file work covers four of five files.**
`~/.claude/docs/voice/` holds `commit-and-pr.md` alongside the four the task modifies, and
the spec says "the voice files ... one per audience". Either cover it or state its exemption.
Relatedly, two docs voice files (`technical-doc-web.md`, `technical-doc-go.md`) share one
`docs.json` band; say so.

**F6 (non-blocking, charter). The three tells cite no external standard.** The charter's
principle is that the workstation "keeps no house voice of its own, no house lexicon". The
bands survive that test because task 1's schema carries a `source` field and task 2 criterion
2 binds each to corpus entry ids. The three tells do not: they arrive as bare prohibitions.
Fix: each tell names the standard or the corpus observation behind it.

**F7 (non-blocking, coupling). The workstation's voice files will cite ids inside
`cairn-cms/docs/internal/corpus/`.** Shared infrastructure pointing into one repo's internal
directory is the same inversion as F2 at lower stakes. Acceptable if the placeholders record
that the corpus is cairn-held and the ids are advisory; note it rather than build around it.

**F8 (non-blocking, sequencing). Task 5's `cairn-figure` skill documents gates that do not
exist.** `check:figures` at seven assertions and the `check:visuals` hole are unit 3b, which
is plan two. The skill must describe them as the standard they will enforce, not as gates a
reader can run today.

## Additions the spec does not fund

| Addition | Verdict |
|---|---|
| `figure-verifier` agent | EARNED. Claude setup bullet 6 names it. |
| `cairn-figure` skill | EARNED. Claude setup bullet 7 names it. Caveat F8. |
| Band files `{docs,editor,agent}.json` | EARNED. "the bands in a small file per audience". |
| `.tellgrader.json` repo opt-in | EARNED with a note. Not in the spec, which asks only for a profile "off outside docs paths". The opt-in file is stricter than asked and is the leanest way to guarantee no other repo is touched, and the plan fixes it as a published interface. It does export a new committed-artifact obligation into each consuming repo; plan two owns adding cairn's. |
| `scripts/check.sh` wiring | EARNED. Makes the corrected gate real for one repo only. Record the go/golangci-lint dependency in Risks. |
| Task 0 pre-bake and coordination gate | EARNED. Cheap, and the one-executor rule requires it given cairn's warm tree. |
| Task 8 handoff document | EARNED, trim. The nine items largely re-run acceptance criteria already proved per task; criterion 2 (paste real output for all of them) buys verification twice. Keep the interface contract, drop the re-proofs. |
| Task 6's candidate list, 8+ ranked candidates per file with measured byte costs | ACCRETION. The spec calls the displacement "a taste call and an owner action". Sixteen-plus measured candidates is more than an owner reads to pick four. Cut to three or four per file. |
| Task 3's segment anchoring and message naming | EARNED as the smallest true change, but it is three changes, not zero. See ruling 2. |

## Proportion

**The pass is priced five times its spec band.** The spec sizes unit 3c at "roughly three to
four tasks" and decision 10 sizes the Claude setup as "small; the scanner change is about 285
lines". The spec's own scale puts small under a quarter million tokens and medium under two
million. The plan carries nine tasks and a 1.2M ceiling. Either the size estimate was wrong,
which the plan should say and the owner should hear, or the plan has grown. Both are likely:
tasks 0, 8, and part of 6 are process the spec does not fund, and the scanner work is real.
Raise this at the checkpoint with a number, per the orchestrator's sizing duty.

**Deliverable counts.** Declared counts understate two tasks.

- Task 1 declares 4; the real list is CLI flags, profile resolution plus the opt-in file,
  two measures, new `Report` fields, the band schema plus seed file, four fixture trees, and
  the `check.sh` wiring, which is 7. **Over four.** Split: 1a takes the profile, the opt-in
  resolution, the fixtures, and the gate wiring; 1b takes the two measures and the band
  schema. 1b then depends on 1a, and task 2's dependency moves to 1b.
- Task 7 declares 4; it also carries `stow -R`, the rebuild and install, the three readlink
  proofs, and `check-drift`, which is 8. **Over four**, though the extra four are the
  mechanical ritual rather than authored deliverables. Acceptable if the declared count is
  corrected.
- Task 4 declares 4 and is at the limit. Tasks 2, 3, 5, 6, 8 are within.

**The pass cannot close unit 3c.** Criterion 3 needs the owner's displacement pick, which the
plan correctly refuses to pre-empt. The plan is honest about it and routes the debt to handoff
item 9. State in the plan header that unit 3c closes at the corpus-approval sitting, not at
this pass's end, so the ledger does not read as a clean close.

## Charter: whose job is each task

Tasks 1 through 5, 7, and 8 are the workstation's on the spec's own split, and each would
serve ecxc-ski, 907-life, aksailingclub-org, cairn-pub, and Topo on identical terms. Nothing
is misplaced from plan two. Two qualifications. Task 6's second half edits
`~/Projects/cairn-cms/CLAUDE.md`, which is cairn's file, not the global one the split names;
the spec's Claude setup bullet 1 funds it, so it is placed defensibly, but a cleaner cut hands
that edit to plan two and keeps this pass inside one repo. Task 5 creates a cairn-named skill
in the workstation package, which the split's "the skills" line permits.

**Does the profile design keep cairn's bands out of site content and out of non-opted repos?**
The mechanism does, on all three counts: no `.tellgrader.json` means no profile whatever the
directory names (fixture C), site content under a declared root stays off (fixture A), and
band echo is absent without a band file. Two holes. F1 defeats it at the agent layer, which is
where it will actually be exercised. And cairn's `paths: ["docs/"]` sweeps
`docs/internal/**`, the specs, plans, and STATUS that Vale deliberately excludes; harmless
while report-only, worth a narrower `paths` list.
