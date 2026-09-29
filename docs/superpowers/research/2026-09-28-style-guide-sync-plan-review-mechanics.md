# Style-guide sync plan review: mechanics and feasibility

**Target:** `docs/superpowers/plans/2026-09-28-style-guide-sync.md` at `44e20e61`. **Lens:** can
each step run as written on the tools that exist, and what breaks when it lands. **Method:** reads
of `~/.claude/workflows/pass-execute-chains.js`, `~/.claude/workflows/docs-page-chain.js`,
`~/.dotfiles/tests/docs-page-chain-derivation.test.mjs`, `~/.claude/agents/cairn-implementer.md`,
`scripts/checks/{docs-gate,gate-tier}.mjs`, `vitest.config.ts`, both CI workflows,
`~/.local/bin/{cairn-run-gate,claude-tooling-sync,check-drift}`, plus live probes (below).

**Counts:** 0 blocker, 8 major, 10 minor; 2 over-ceremony items.

## What the probes settled

- **Vale 3.23.0 is already clean on the tree.** `vale --minAlertLevel=error docs README.md
  examples/showcase/README.md` at `44e20e61` under the workstation's 3.23.0 exits 0 with no
  output. Review focus 5 (pin bump changes behavior) is low risk; R2a's pre-rule gate run is a
  confirmation, not an investigation.
- **Vale exits 0 when only warnings fire, with or without `--filter`.** Probed on a scratch
  style: a `level: warning` rule firing under `--filter='.Name in ["T.Warn"]'` exits 0 in both
  line and JSON output. The promoted-rules pass cannot rely on the exit code (minor 3).
- **`~/.claude/{agents,skills,workflows,docs}` and `CLAUDE.md` are folded directory symlinks**
  into the `~/.dotfiles` main checkout's working tree (`agents -> ../.dotfiles/claude/.claude/agents`).
  A merge into dotfiles `main` is live the instant the working tree updates; a separate dotfiles
  worktree is invisible to every running agent until then. That isolation is what makes chain W
  safe to run beside chain R, including W5 editing `cairn-implementer.md` while that agent runs.
- **`curl` plus `pandoc` fetch a Google style page from the Bash tool** (`/style/procedures`,
  HTTP 200). The page opens with an AI-generated "Page Summary" block ahead of the guide text
  (minor 4).
- **`pass-execute-chains` creates no worktree and merges nothing.** It takes `chain.repo` as an
  existing path, runs tasks, and returns records with `branch`; worktree creation and every merge
  are the conductor's.

## Major

### M1. The `--pin scripts` gate launches a browser, and the plan puts it on the light lane

- **Where:** plan:21-23 ("on the light lane"), plan:102, plan:117, plan:145, plan:150, plan:157.
- **Defect:** `--pin scripts` prints `SCRIPTS_GATE` (`scripts/checks/gate-tier.mjs:58`), which
  runs `npm test`; `package.json:81` makes `npm test` end in `npm run test:component`, a
  Playwright Chromium project (`vitest.config.ts:149-153`). The light lane caps the gate at 2G
  high and 3G max and skips the machine-wide heavy lock (`cairn-run-gate:43-67`). The gate is
  either memory-killed mid-run or runs a browser beside another heavy gate, the 2026-09-14
  scenario that cost the GNOME session.
- **Fold:** chain R's `engine-logic` tasks take the default heavy lane. Set `gateLane: "light"`
  per task on chain W only (`scripts/check.sh` launches no browser), never as `args.gateLane`
  for a run that carries chain R.

### M2. A pinned task's gate string triggers the runner's blocking MISMATCH unless the plan sets it

- **Where:** plan:21-23, plan:102-122, and R3, R7, R8 (every `--pin scripts` task).
- **Defect:** with `t.gateTier` set, the implementer runs the classifier with `--pin scripts` and
  reports `gateCommand` as the printed `SCRIPTS_GATE` string
  (`pass-execute-chains.js:214, 236`). The runner's own resolution skips the classifier and uses
  `t.gate || a.gate` (`pass-execute-chains.js:334-335`), and the reviewer prompt marks any
  difference between the two as blocking (`:273-276`). Unless the task's `gate` is the exact
  `SCRIPTS_GATE` literal, every pinned task draws a spurious `fix`, burning its one fix round.
  `a.gate` is also shared with chain W, whose gate is `scripts/check.sh`.
- **Fold:** state in the plan header that each pinned task carries `gateTier: "scripts"` and
  `gate` set to the literal `npm run check:docs-gate && npm run check && npm test && npm test -w
  packages/create-cairn-site`, and each chain W task carries `gate: "bash scripts/check.sh"`.

### M3. Chain W under a shared `cairn-implementer` and a plan in another repo

- **Where:** plan:3-6, plan:31-34, plan:124-139, plan:169-183.
- **Defect:** four mechanics collide.
  1. `args.implementer` is one value for every chain (`pass-execute-chains.js:371, 405`).
     `cairn-implementer`'s definition of done requires `npm run check` 0/0 and `npm test` exit 0
     (`cairn-implementer.md:29-34`), and it waives them only for paint, sweep, or a reduced fix
     round (`:36-37`). `~/.dotfiles` has no `package.json`. An `engine-logic` W1 dispatch is
     likely to report BLOCKED or improvise.
  2. The runner prompt says "Plan file (committed in this repo)" (`:226`), and the plan's spec
     reference is relative (plan:17). Inside the dotfiles worktree, that path resolves to nothing.
     The prompt also orders a read of a "Ruled inputs" section and a "Task W1" section; this plan
     has neither heading (tasks are bold paragraphs, `**W1. ...**`).
  3. Plan:32 says the runner creates the dotfiles worktree. It does not.
  4. Where the conductor puts it matters: a worktree inside `~/.dotfiles` shows as untracked in
     the main checkout, and `check-drift` treats any `git status --porcelain` output there as
     drift (`check-drift:145`). A worktree anywhere under `~/.dotfiles/claude/` would be reached
     through the folded symlinks and read as live agents.
- **Fold:** the conductor creates the worktree outside `~/.dotfiles` (for example
  `~/Projects/.worktrees/dotfiles-style-guide-sync`, `git -C ~/.dotfiles worktree add <path> -b
  style-guide-sync`). Pass `planPath` as an absolute path, and give each chain W task `notes`
  that carry the absolute spec path plus one sentence: "This repo has no npm; your gate is `bash
  scripts/check.sh` alone, and items 2 and 3 of your definition of done do not apply." Say in
  the header that "invoked once per chain segment" means one invocation carrying both chains, or
  split it into one invocation per chain so chain W can name its own implementer. Either works;
  the notes line is the smaller change.

### M4. Forcing `blocking` on `source: guide` does not trigger a redraft

- **Where:** plan:61-62 (Review focus 3), plan:128-131.
- **Defect:** the chain decides a redraft from the reader's verdict, never from its findings:
  `anyFix = list.some(([, r]) => r.verdict === "fix")` (`docs-page-chain.js:343`), and a page is
  accepted when `!r1.anyFix && d1.gate === "pass"` (`:385`). A register editor that returns
  `verdict: "accept"` with a `source: guide` finding marked non-blocking is coerced to
  `blocking: true`, yet the page is still accepted. Review focus 3's test would pass while the
  trigger defect goes through.
- **Fold:** the coercion is one pure function between test markers that sets `blocking` on
  `source: guide` and sets `verdict` to `"fix"` whenever any finding is blocking after coercion.
  `runReads` applies it before computing `anyFix`. The W1 test pins both halves: a synthetic
  read with `verdict: "accept"` and one non-blocking guide finding comes back `fix`.

### M5. "A missing heading fails the step" has no runner-side check to test

- **Where:** plan:59-60 (Review focus 2), plan:128-130.
- **Defect:** the extraction runs inside the page-inputs agent, and the runtime has no
  filesystem. The test file's only mechanism is extracting a pure function between markers or
  asserting a regex over the source (`docs-page-chain-derivation.test.mjs:17-55, 126-158`). An
  instruction in the agent's prompt is untestable, and an agent that paraphrases or truncates a
  long section into a JSON string passes silently. Separately, `common` tells every stage,
  the drafter included, to "read the universal contract and the track section" of the register
  file (`docs-page-chain.js:154-158`). A drafter holding the path and the Read tool reads the
  provenance and exceptions whatever its prompt contains.
- **Fold:** (1) the page-inputs prompt extracts each section with one deterministic shell command
  (an `awk` range from the exact heading to the next `## `) and returns its stdout verbatim;
  (2) a pure validator between markers rejects a missing, empty, or wrong-heading section, and
  `chain()` escalates with a named reason; the test drives it with a synthetic empty return;
  (3) the drafter's prompt drops the register path, and the drafter-prompt guard asserts that the
  rendered prompt names no `docs-register.md` path.

### M6. W1 runs beside R1 but only two of the section headings it extracts are fixed

- **Where:** plan:87-94, plan:128-130.
- **Defect:** W1 extracts the brief and, for the register editor, "the provenance and exceptions
  sections" by exact heading. The plan fixes the two brief headings and says only that the rest
  "sit in their own sections". W1 and R1 run in parallel in segment A, so W1 cannot read R1's
  output.
- **Fold:** fix the exact headings in R1's constraints, for example `## Provenance`, `## Recorded
  exceptions: Google`, `## Recorded exceptions: Microsoft`, and `## The tightening test`. W1 and R7
  both key on them.

### M7. R8 cannot "pass on the tree" while `CLAUDE.md:309` carries a seed phrase

- **Where:** plan:157-161, plan:205-210.
- **Defect:** the seed list includes "on top of the Google floor", and the repo `CLAUDE.md:309`
  says "On top of the Google floor", inside R8's scope. R1 and R6 clear the other current hits
  (`docs-register.md:12, 19`, `admin-design-system.md:56`), but `CLAUDE.md` waits for J5. Wired
  into the docs gate's tree mode, R8 turns `check:docs-gate` red. The scripts gate carries that
  component, so R8 fails its own gate, chain R halts, and R9 is deferred. CI on the branch goes
  red until J5.
- **Fold:** R8 lands the one-line `CLAUDE.md` erratum itself (it is owed anyway), and J5 verifies
  it. Alternatively, R8's check ships with a dated allowlist entry that J5 removes.

### M8. The Segment B merge puts the live workstation ahead of cairn `main`, with no rollback

- **Where:** plan:31-35, plan:185-186, plan:194-195.
- **Defect:** the merge is live immediately (folded symlinks). From then until the repo PR merges
  at the close, any `docs-page-chain` run against a cairn checkout off `main` fails page inputs,
  since `main`'s register has no `## Drafting brief:` heading (by W1's own design). A
  `register-check` on another cairn artifact runs the W3 lens with no provenance handed to it.
  If the join stops (J2 is "stop on any failure"), that state persists with no recorded way back.
  The plan also assumes a clean fast-forward: other sessions commit to dotfiles `main`, and P0
  checks only at pass start.
- **Fold:** at the boundary, re-run P0 against `~/.dotfiles` (a clean tree, and no running
  `docs-page-chain` or `register-check` against another cairn checkout). Merge with `--no-ff` and
  record the merge SHA in STATUS as the rollback point (`git revert -m 1 <sha>`). If the pass
  stops before the PR merges, STATUS says so and names the revert.

## Minor

1. **W6's scope trips on a dated dotfiles record** (plan:179-183). `claude/.claude/docs/record/
   2026-09-19-docs-infra-audit.md:33` quotes "A floor is not a ceiling", and W6's `docs/` scope
   has no records exclusion (the spec attaches that exclusion only to cairn's `docs/internal`).
   **Fold:** exclude `claude/.claude/docs/record/`, the list file, and the fixtures from the
   scan. Name the scope as `claude/.claude/docs/`, not the dotfiles root `docs/` (which holds
   HISTORY). Store every list entry as a literal string: "admin walkthroughs routed to
   Microsoft" cannot be matched as written.
2. **J2 cannot run as written** (plan:194-195). The chain's `editorPrompt` is a closure over `WT`,
   and after W1 it depends on the extracted sections, so it cannot be rendered outside the
   workflow. Running the whole chain on a plant would redraft the plant. Criterion 7(b) needs
   `Cairn.HeadingIng` to fail the gate, which happens only if R2a promotes it; the plan never
   names R2a's promoted set. A plant outside `docs/**` draws no Google-arm rule, and inside the
   worktree it makes J2 not read-only. **Fold:** W1 puts the prompt renderers in a marker block
   as pure functions and adds a tiny node render entry point reusing the test's extraction. R2a
   names its promoted set (the three `Cairn.Heading*` rules plus `Google.Headings` and
   `Microsoft.Headings` once vocab lands). J2 plants under `docs/extend/`, runs the promoted-rules
   Vale pass the gate builds (not the full gate, whose `check:arm-indexes` may flag an unindexed
   page), deletes the plant, and reports `git status` clean.
3. **The promoted-rules pass must read Vale's JSON** (plan:108-110). Vale exits 0 on warning
   alerts (probed above, and in the spec review). **Fold:** one clause in R2a: count alerts from
   `--output=JSON`; the exit code is not the verdict. The criterion 5 harness case would catch
   the mistake, at the cost of one fix round.
4. **R1 and R9 fetch the web through a tool that lacks WebFetch** (plan:49, plan:97, plan:163-167).
   `cairn-implementer` has Read, Write, Edit, Bash, Grep, and Glob. `curl` plus `pandoc` works
   (probed). Google's pages open with an AI-generated "Page Summary" block, and quoting it would
   pass R7 while quoting no guide rule. **Fold:** name the fetch path in R1 and R9's notes, and
   add to R1's constraints: "quote the guide body, never the Page Summary block". R9's captures
   land outside the worktree, so its report lists their paths for the reviewer.
5. **The `dependency-upgrade` route does not fit R3 and cannot be invoked by the implementer**
   (plan:107, plan:147). The skill scopes out a brand-new dependency (its description, line 8)
   and has no "new-package survey". The implementer has no Skill tool. The skill's survey record
   file is also missing from R2a's Files. **Fold:** R2a's notes point at
   `~/.claude/skills/dependency-upgrade/SKILL.md` to read, and Files adds the survey record. R3
   pins markdownlint-cli2's current production version with one line of rationale, without the
   skill.
6. **A second Vale pin exists** (plan:106). `.github/workflows/tool.yml:46` sets `VALE_VERSION:
   '3.15.1'` for the Go tool's three-OS check. **Fold:** R2a bumps it too, or records why the
   tool's CI stays on 3.15.1. The frozen page `docs/editors/when-something-goes-wrong.md:46`
   carries a comment naming the old pin; per the freeze, leave it as-is and file a friction-log
   line.
7. **`claude-tooling-sync verify` is vacuous inside the worktree** (plan:182-183). It hardcodes
   `~/.dotfiles/claude/.claude/...` (`claude-tooling-sync:27-30`), so in W6 it checks the main
   checkout, not W's changes. **Fold:** W6's acceptance keeps `scripts/check.sh`, and the tooling
   verify stays at the Segment B boundary, where the plan already runs it.
8. **The runner has no resume** (plan:5). A crashed or halted chain re-invoked with the same args
   reruns every task. **Fold:** one header line: after a halt, check `git status` in the affected
   worktree (warm uncommitted work means investigate, per the one-executor rule), then re-invoke
   with only the undone tasks.
9. **R7's marker must not collide with Vale directives** (plan:90-92). The register already
   carries `<!-- vale Google.Units = NO -->` comments (`docs-register.md:195-198`). Vale applies no
   style to `docs/internal/**` (`.vale.ini:51-52`), and markdownlint and rendering ignore
   comments, so the markers are safe there. They do reach the drafter inside the extracted brief.
   **Fold:** a prefixed form (for example `<!-- q:<id> -->`), stated with a one-line note that the
   drafter ignores it.
10. **R8 and W6 twin lists have no sync** (plan:157, plan:179, plan:209). J5's manual "joins both
    lists" is the only link. **Fold:** each list file's header names its twin's path. A
    cross-repo sync check is not worth building (CI cannot see the workstation).

## Over-ceremony, ranked by cost

1. **R2a is several tasks in one** (plan:102-115): pin bump, harness, three rules, the promoted
   list and gate pass, vocab, measured exceptions, and a ROADMAP measurement. It is a likely
   split. Splitting out the pin bump as its own accepted commit costs nothing and makes Review
   focus 5 a separate green point. Optional.
2. **`stow -R claude` at the boundary is a no-op** here (plan:33-34, plan:185). The package is
   folded at directory level, so new files appear through the existing symlinks. It is harmless;
   keep it only as a habit, or drop it and say why.
