# Plan one adversarial review: plannability and execution under the chain

Lens: can a cold Sonnet implementer execute each dispatched task from the plan text alone, and can
`diff-reviewer` grade the result from the diff alone. Read-only review of
`~/.dotfiles/docs/superpowers/plans/2026-09-08-docs-standard-claude-infra.md` (committed as
`6fbc776`) against the real state of `~/.dotfiles`, `~/.claude`, the tellgrader module, the
vale-hook suite, and cairn's plan two (`docs/superpowers/plans/2026-09-08-docs-toolset-pass.md`).

**Verdict: executable with fixes.** Every task has criteria a cold implementer can act on, the gate
runs green on this machine today, and the interface names are consistent across tasks. Eleven fixes
are needed before dispatch: one false premise the plan builds two tasks' criteria on (the stow
claim), two self-defeating verification commands, one live-agent breakage, three underspecified test
designs, and four cross-plan or cross-task inconsistencies.

## Environment verification (what the plan asserts, checked)

| Claim in the plan | Reality | Verdict |
|---|---|---|
| tellgrader lives at `claude/.claude/skills/writing-voice/evals/tellgrader`, module `github.com/glw907/workstation/tellgrader`, Go 1.27, cobra only | Exact match; packages `internal/tellscan`, `internal/posthook`; binary gitignored | correct |
| Its gate is its own `Makefile` (`vet`, `golangci-lint`, `test`) | Exact match | correct |
| `scripts/check.sh` does not run it today | Correct; check.sh runs bash syntax, ruff, pytest, vale fixtures, gitleaks | correct |
| `go` and `golangci-lint` present | `go1.27.1`, `golangci-lint 2.13.2`, both Homebrew; `make check` exits 0 in 15.7 s | correct |
| pytest reachable | `uv` present; check.sh already runs the suite (7 cases) | correct |
| `~/.dotfiles/claude/.claude/CLAUDE.md` 23,995 bytes; cairn's 24,136 | Exact match; `claude-context-budget FILE...` accepts file args and exits 0/2, so task 6 criterion 6 is runnable as written | correct |
| dotfiles tree clean, plan committed | Clean; `6fbc776` names only the plan file, so task 0 is already satisfied | correct |
| Editing `~/.dotfiles/claude/.claude/...` changes `~/.claude/...` | Confirmed: `agents`, `docs`, `skills`, `output-styles`, `CLAUDE.md` are symlinks in the `claude` stow package | correct |
| **"A task that creates a new file or directory needs `stow -R claude`"** | **False.** `~/.claude/agents`, `~/.claude/docs`, and `~/.claude/skills` are whole-**directory** symlinks (stow tree-folding), so a new `agents/figure-verifier.md`, `skills/cairn-figure/`, or `docs/voice/bands/` is live the instant it is written | **wrong** |

The stow error is load-bearing. It is the stated reason tasks 4 and 5 get file-shape criteria
instead of load-the-skill or dispatch-the-agent criteria, it is one of four risks, and it is part of
task 7's work. `stow -R claude` remains harmless and idempotent, and task 7's three `readlink -f`
checks will pass either way, but the constraint that shaped two tasks' acceptance criteria does not
exist. Tasks 4 and 5 can verify the real thing.

## Task table

| # | Gradeable from the diff | Interfaces consistent | Deps complete | Gate runnable | Note |
|---|---|---|---|---|---|
| 0 | Y | Y | Y | n/a | Already done by `6fbc776`; the `pgrep` check is self-matching (below) |
| 1 | Y, with three fixes | Y | Y | Y (15.7 s) | Fixture hermeticity, `omitempty` on a legitimate 0.0, criterion 7's "same as before" has no baseline |
| 2 | Y | **N** | Y | Y | Four voice files, three band files: `technical-doc-web` and `technical-doc-go` both map to `docs.json` and the plan never says so |
| 3 | Y, with one fix | Y | Y | Y | Criterion 3 does not say what evidence proves "resolves to the Microsoft section", and needs the `StylesPath` pattern from `tests/vale/run-fixtures.sh` |
| 4 | Y | Y | Y | Y | The refuse-without-a-corpus-entry rule breaks a live agent for the whole plan-one-to-plan-two window |
| 5 | Y | Y | Y | Y | The new `## Author-facing prose` section duplicates the skill's existing `## The brief is a contract`, and criterion 4 forbids reconciling them |
| 6 | Y (unblocked half) | Y | Y | Y | The `pgrep` live-executor check self-matches; cairn-cms genuinely has two live executors right now |
| 7 | Y | Y | Y | Y | Depends on task 6, which cannot fully complete; the stow work rests on the false premise |
| 8 | Y | **N** | Y | Y | Asserts obligations plan two does not carry (`.tellgrader.json`, `figure-verifier`) |

## The eleven fixes

**F1. The stow premise is false.** Remove the "new file needs `stow -R`" constraint from the global
constraints, tasks 4 and 5's notes, task 7's stow step rationale, and the fourth risk. Tasks 4 and 5
can then verify by loading the skill and reading the agent frontmatter through `~/.claude/`, which is
stronger evidence than a `grep` on the stow source.

**F2. `pgrep -f <path>` always matches itself.** Verified: `pgrep -af /var/home/glw907/.dotfiles`
returns the very shell running the check, because the path appears in that shell's own command line.
Both task 0 and task 6 will report a live executor forever. Use `pgrep -f <path> | grep -v "^$$\$"`
plus a look at the matched command lines, or better, name the real signals the workstation rule
lists: `git status` for warm changes the task did not author, and other sessions' journal mtimes.

**F3. cairn-cms has live executors now, and task 6's blocked half has no owner.** Confirmed at
review time: `npm test` running in the `identity-seam` worktree and `npm run check` in `chassis-b`,
plus warm uncommitted work on `main` (`test.yml`, `package.json`, six untracked docs paths). Task 6
correctly says stand down, but the plan never says who resolves the stand-down or where the owed
edit goes. It should route the cairn `CLAUDE.md` edit into a cairn pass's own close ritual rather
than leaving a dotfiles pass reaching into a repo it does not gate.

**F4. Task 4 bricks a live agent.** `cairn-register-editor` is dispatched today by the
`register-check` skill and by cairn pass plans. Task 4 makes it "refuse to grade without a corpus
entry", and the corpus that supplies entries is plan two's Unit 2 work, which does not exist yet.
Worse, the agent's current line 29 already cites `~/.claude/docs/register-exemplars/cairn/`, **which
does not exist on this machine**. So "corpus entry" has no resolvable referent today. Either gate the
refusal on the corpus manifest existing, or ship the measurement-table requirement now and the
refusal in plan two, and either way the dispatch must tell the implementer what a corpus entry
resolves to.

**F5. Fixture tests are not hermetic.** The band default is `~/.claude/docs/voice/bands`, so a
package test that omits `--bands-dir` reads the developer's real home and its assertions change with
the machine. Fixtures B and D assert the profile is on; both must pass an explicit bands dir. State
it in the plan, or the implementer will write a test that passes here and fails in a clean checkout.

**F6. Fixture C is only true until an ancestor opts in.** Resolution walks up to `$HOME`, so a
"repo with no `.tellgrader.json`" fixture inside `~/.dotfiles` proves nothing the day anything above
it gains that file. Have the test build its tree under `t.TempDir()` with an explicit stop root, or
give the resolver a documented `stopAt` for tests.

**F7. `omitempty` swallows a real zero.** A docs file with no hinged pairs has
`hinged_pair_share: 0.0`, which `omitempty` omits, and criterion 3 demands "both share fields with
values in `[0,1]`". Use pointer fields (`*float64`) or a single nested object that is present or
absent as a unit. This is the one place the plan's interface spec will produce a failing acceptance
run on correct code.

**F8. Criterion 7 has no baseline to compare against.** "The same `findings` array and the same exit
code as before the change" cannot be run from the post-change tree. Capture the current output into
a golden file as the first step of task 1, or restate the criterion as "the existing `scan_test.go`
cases pass unchanged and no new check is registered in `checks`".

**F9. Task 3 criterion 3 does not name its evidence.** Vale reports check names, not section names,
so "resolves to the Microsoft section" must be proved by prose that trips a Microsoft-only rule and
prose that trips a Google-only one. The test also needs a `StylesPath` pointing at
`$HOME/.config/vale/styles` (both `Google` and `Microsoft` are synced there); the repo already has
that exact pattern in `tests/vale/run-fixtures.sh` and the plan should point the implementer at it.
Note also that the hook prints nothing when there are no findings, so criterion 2's "names the config
root" assertion only holds on a findings path.

**F10. Task 2's band-file arithmetic does not close.** Four voice files, three band files. The band
schema is keyed by tellgrader register (`docs`, `editor`, `agent`), while the voice files split
`docs` into web and Go. Say explicitly that both technical-doc files cite `docs.json`, or add
`bands/docs-go.json` and a register for it. As written, criterion 2's "matching the values in its
band JSON" is unresolvable for two of the four files.

**F11. Task 8 hands off obligations plan two does not carry.** Plan two's P1 verifies exactly three
outputs: the profile flag plus a readable bands file, the Vale hook change, and the two skills. It
never mentions `.tellgrader.json` (0 hits) or `figure-verifier` (0 hits). Plan one's task 8 asserts
plan two's first task "adds that file to `~/Projects/cairn-cms` and proves both halves", and task 4
asserts "plan two's figure tasks dispatch `figure-verifier`". Either trim the hand-off to the three
things plan two actually verifies and file the rest as offered surface, or amend plan two. Left as
is, the hand-off document will be graded against a plan that does not consume it.

## Task 1 simulated as the cold implementer

Reading the plan alone, a Sonnet implementer knows the file list, the flag names, the JSON shapes,
and the eight criteria. It does not know these, and each is a conductor pre-extraction:

1. The current `Options` struct is `{Register Register; Path string}`; `Report` has nine fields in a
   fixed order; new fields must be appended, not interleaved, for criterion 7's byte-identity claim.
2. `splitSentences` and `blankFencedCode` live in `cadence.go` and are unexported package-locals;
   `Scan` calls `blankFencedCode` **after** comment extraction, so the new measures must consume
   `prose`, not `input`, or the denominator will not match `CadenceCV`.
3. The `.golangci.yml` enables `modernize`, `unparam`, `misspell`, and `errcheck` with
   `check-type-assertions`. `unparam` in particular will flag a helper whose parameter is always the
   same value, which a naive band loader invites.
4. `make check` takes about 16 s and passes today, so a red result is the implementer's own change.
5. The `run` line goes in `scripts/check.sh`, which `cd`s to the repo root first, so the make path
   must be repo-relative or absolute, and the helper signature is `run "<name>" <cmd> <args...>`.
6. Go 1.27 is on PATH via Homebrew, and the module already vendors nothing; adding a dependency
   would break the plan's "no new dependency" sizing, which the plan never states as a constraint.
7. Fixtures must live under `internal/tellscan/testdata/`, and Go tooling ignores `testdata`, so a
   `.tellgrader.json` there is inert. The implementer should be told this so it does not worry.
8. `go-conventions` must be invoked first (workstation rule); the plan says so, but the dispatch has
   to repeat it because a subagent starts with zero context.
9. Which band file a report loads is never stated. Derivable from the path shape
   (`bands/<register>.json`), but state it: the register comes from `--register`, not the profile.
10. What happens with several files on one command line, since `run` already loops and encodes an
    array. The profile must resolve per file, not once.

## Task 3 simulated as the cold implementer

The plan's reading of the spec line is sound and is correctly flagged for the checkpoint. Missing
pre-extractions:

1. The hook is `bin/.local/bin/vale-hook`, a single-file Python script with a
   `_load()`-by-SourceFileLoader test harness; the suite has 7 cases and is run by check.sh through
   `uv run --with pytest --no-project`.
2. The two substring skips are `path.endswith(".md")` and `"/superpowers/" in path`. Anchoring the
   `.md` test "to a path segment" is the wrong verb for an extension; the plan should say
   `os.path.splitext` on the basename, or the implementer will invent something.
3. Vale styles are not in the repo. They live at `~/.config/vale/styles` (populated by `vale sync`),
   and `tests/vale/run-fixtures.sh` is the in-repo precedent for generating a config against that
   path. Without this the implementer writes a test that cannot resolve a style.
4. `run_vale` ignores Vale's exit code by design and returns `None` on any failure, so a test that
   asserts "no findings and exit 0" cannot distinguish success from fail-open. Criterion 3's third
   case needs a positive control.
5. The hook returns 2 on an error-tier finding, and the PostToolUse contract depends on that; a
   change to the message strings must not change the exit codes. Say so.
6. The em dash is banned in this repo's Python comments too, and `scripts/check-py-comments.sh`
   (ruff docstring rules) runs in the gate over the same file.

## Ceiling

The 1.2M ceiling with no per-task split is plausible but front-loaded. Task 1 is the only one with
real engineering (roughly 285 lines of Go by the spec's own sizing, plus four fixtures and a gate
edit) and could take 200k to 300k with one `fix` round through an Opus reviewer. Tasks 2, 5, 7, and
8 are prose and file-shape work under 60k each. Task 6's unblocked half needs both 24 KB `CLAUDE.md`
files read in full and eight candidates byte-measured per file, call it 80k. The checkpoint after
task 4 lands at roughly half the ceiling, which is the right place for it. The risk is not the total
but the absence of a per-task ceiling on task 1, where a wrong turn in the profile resolver is the
one place this pass can burn.

## What would change the verdict to executable as written

F1, F2, F4, F7, and F11 are the five that will produce a wrong outcome rather than a slow one: a
false constraint shaping two tasks, a check that never passes, a live agent that stops answering, an
acceptance criterion that fails on correct code, and a hand-off graded against a plan that does not
consume it. F5, F6, F8, F9, and F10 cost a re-dispatch each. F3 is a coordination call for the owner.
