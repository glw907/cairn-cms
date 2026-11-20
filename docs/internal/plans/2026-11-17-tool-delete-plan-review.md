# Plan review: `tool-delete`

One `standards:plan-reviewer` read (Opus, `medium`) on 2026-11-17, through the mechanics and
feasibility lens, of `2026-11-17-tool-delete-plan.md` and its executor prompt at base `79d326bed`.
The reviewer used reads, `git grep`, `git ls-files`, and the changelog script run on a copy; it
ran no suite and no Go command. The reply is kept below as returned, with paths made
repo-relative. The plan's "Plan review fold" records what was folded.

Verdict: one blocking finding, nine should-fix findings, and notes. The rest of the plan holds up
against the repo.

## Blocking

**B1. T2a and T2b are not disjoint.** Plan lines 211-212 and the executor prompt say the pair owns
disjoint files and shares only `docs-register.md`. Item 8's `CMD` search over `.claude/skills`
returns seven files, and T2b edits every one of them:

- `.claude/skills/cairn-judging-scope/references/what-cairn-is-and-is-not.md`
- `.claude/skills/cairn-proving-setup/SKILL.md`
- `.claude/skills/cairn-releasing/SKILL.md`
- `.claude/skills/cairn-running-passes/SKILL.md`
- `.claude/skills/cairn-running-passes/references/pass-gate-tiers.md`
- `.claude/skills/cairn-writing-docs/references/docs-register.md`
- `.claude/skills/cairn-writing-engine-code/references/durable-gotchas.md`

T2a adds the note near the top while T2b edits the body, in two worktrees, so the merge conflicts
or the note lands on a file whose command text T2b has removed. Fold: T2b owns all seven and adds
the note to each that still matches `CMD` after its edit; T2a keeps `docs/`, `README.md`,
`skills/`, `plugins/`, `.claude-plugin/`, and the bake. Restate it in the plan and the prompt.

## Should-fix

**S1. Two `gate-table.json` entries are unclear in T1 step 3.** `gate-table.json:24`: the
`showcase` bucket lists `"packages/create-cairn-site/"`, and `gate-tier.test.ts:64` pins it.
Line 103: `check:symbols` names the bucket `toolTestdata`, defined at line 23; line 67 puts
`tool/testdata/fixtures/` in `toolInputs`. Fold: name each edit, and remove `toolInputs` with its
readers (`allPatterns` in `gate-tier.mjs`, `gate-tier.test.ts:1085`).

**S2. T1 step 7 misses four functions.** In `check-symbols.mjs`: `cairnToolFlags` (399, exported,
reads `tool/testdata/flags.json` at 400), `commandPathsWithChildren` (455), `flagNameFromWord`
(471), and `resolveCairnLine` (519, exported). The header comment at 16-21 and the JSDoc at
391-441 name `tool/testdata/flags.json` and `make -C tool flags`, which fail item 6. Fold: add
them and both comment blocks, and drop the test cases that import them.

**S3. A `publish.yml` comment fails item 4.** `publish.yml:26` reads ``(`paths-ignore: tool/**`)``,
and item 4 needs `git grep -c "paths-ignore" -- .github/workflows` to print nothing. Fold: the
comment at 25-26 loses that clause and the sentence it supports. Name both triggers in `e2e.yml`
(6, 8) and `design.yml` (12, 14).

**S4. Item 16 passes when the classifier fails.** `gate-tier.mjs` prints nothing to stdout on an
empty range or a git failure (966-967) and on a table error (980-981), and `grep -c` still prints
`0`. Fold: require exit 0 and at least one line of output before the grep.

**S5. The `bump.mjs` line is `:70`, and part of T1 step 9 is a no-op.** `release-bump.test.ts`
pins no count and no launcher entry (its `SEVEN` list at 11-19 omits the launcher). The fixture
`src/tests/unit/fixtures/release-bump/rc3/packages/create-cairn-site/package.json` is left behind.
The fixture lockfile has four version lines (3, 7, 14, 18) and the repo's four (3, 9, 9128,
9145); each becomes three. Fold: cite `:70`, drop the test from step 9, delete the fixture's
launcher manifest with its lockfile entries.

**S6. T2b leaves contents lines for the sections it deletes.**
`durable-gotchas.md:46` (`#editing-tool-the-go-cli`) and `pass-gate-tiers.md:13`
(`#the-tool-tier-and-mixed-diffs`). `docs-links` checks anchors. Fold: remove each contents line
with its section.

**S7. T3's proof doesn't name `check:leaks` or `check:consumers-must`.** The appendix script on a
copy printed `entries: 38 -> 24`; item 14 printed `1` and `0`; the diff was 5 insertions and 144
deletions; `findOffGrammarLines` returned `[]`; `checkVersion('0.99.0-rc.4')` returned
`{ok:true,bump:"minor"}`. `check-leaks` was not run on the result. Fold: add both checks to T3,
and decide whether the `(?:darwin|linux|win32)-(?:x64|arm64)` allowance at `check-leaks.mjs:83`
stays.

**S8. The executor prompt doesn't make each task report name the CI verdict.** Fold: one line
requiring each accepted-task report to name the `ci-green` verdict on its pushed head, or that the
watch is still running.

**S9. A `workflow-yaml.test.ts` assertion could pass vacuously.** A bare `pull_request:` parses
as `null`, so a falsy check passes when the key is missing. Fold: assert
`expect(on.pull_request).toBeNull()`.

## Notes

- Items 10 and 15: no file under `docs/internal` holds the marker, nor do the plan or the prompt.
  Item 10 covers `docs/STATUS.md`, so STATUS and this file must never quote it. `docs-links`
  scans `docs/internal`, so this file holds no relative link.
- Item 5: after T1 and T2b the hits are `test.yml:36`, `test.yml:38`, and
  `workflow-yaml.test.ts:473`, provided T2b removes `durable-gotchas.md:590`, T2a removes
  `is-it-working.md:13`, and T1 removes `test.yml:84`.
- Item 6 residue: every narrow-pattern hit is named by the plan, the design, or a general clause.
  Two rest only on a general clause: `scripts/gate/README.md:60` and
  `src/tests/unit/gate-record.test.ts:143-158`. Name them.
- `fast-lane.mjs` has no tool leg; it only spawns `gate-tier.mjs --fast`. Step 6's clause is a
  no-op.
- Stray files: `git ls-files '*.go' 'go.mod' 'go.sum' 'go.work' ':!tool'` is empty; no ignored
  file sits under the deleted trees; `assert-scaffold-origin` has no caller.
- The lockfile step is written in full, with its insertion check wired to standing answer 29.
- Every stop (standing answers 27-31) routes through `advisor.md`, none says "ask Geoff", and
  `## Pre-flight` carries the three required lines and "Owner steps: none".
- The plan adds only the six declared `env-var:` allowlist entries.
- Not independently checked: `record.mjs:32-37`, `gate-stand-in.test.ts:375-401`,
  `gate-verdict.test.ts:77-82`, `docs-gate.mjs:19,88,92`, `docs-gate.test.ts:25,29`, and whether
  `check:package` or publint reads the root `workspaces` field (`["packages/*"]`, which still
  resolves to `cairn-cms-dev`).
