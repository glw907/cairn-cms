# Pre-2b docs tooling pass

This pass fixes the docs tooling that cost stage 2a its rounds, so that stage 2b drafts against corrected tools. Process: `cairn-pass` for track C and `dotfiles-pass` for track D, each loading `pass-core`. Geoff approved the design on 2026-10-11: `docs/superpowers/specs/2026-10-11-overnight-2b-design.md`, item "1. The pre-2b tooling pass". Source items: `ROADMAP.md:341-394` ("Docs tooling before stage 2b"). No separate spec: the design is a page. Two executors work in parallel on disjoint repos. Track C is the cairn-cms executor, with its PR to `glw907/cairn-cms`. Track D is the dotfiles executor, with its PR to `glw907/workstation`.

## Owner rulings after planning (Geoff, 2026-10-11)

- Launch both this pass and stage 2b part 1 tonight, though both plans run past twice the design's estimate (385 task-minutes here against the 360 line). Unattended planning and launch are approved: the planning session launches both executors without Geoff's read of the plans.
- The three `src/lib` comments that use the old second-sign-in-group name move to Later, so this pass stays `runner` with no admin smoke.
- The night has a 45M token ceiling; this pass stops at 10M, metered by the planning session.

## Ruled for this pass

- **Risk class.**
  - Track C is `runner` (`scripts/checks/**`). CT2 leaves the three `src/lib` comments that use the old name, which sit on `cairn-pass`'s `auth-data` path map, for the next engine pass (Later). Geoff ruled this on 2026-10-11 so the pass stays `runner`, with no task-scope auth read and no admin smoke.
  - Track D is `runner`, because of `claude/.claude/{workflows,agents,skills}/**` and `tests/**`.
  - No `live-account` flag on either track.
- **Merges.** Both PRs go to Geoff through `review-desk`. Each executor merges its own PR only on Geoff's desk approve, with `--match-head-commit`. Merge order: cairn-cms first, then workstation, because the chain's plan prompt calls a `check-provenance.mjs --extract` mode that only CT4 adds. After the workstation merge, `make -C ~/.dotfiles/claude/.claude/skills/writing-voice/evals/tellgrader install` rebuilds `~/.local/bin/tellgrader`. That binary is not stowed, so the showcase fix does not reach `check:tellgrader` until this runs.
- **CHANGELOG.** No entry. The `check:*` and `link:consumer` scripts are internal repo tooling. CT2 changes only wording in shipped docs and guidance, with no behavior change. No `check:surface` update is needed either: `docs/internal/api-surface.md` carries none of the edited comments.
- **Line numbers.** They were probed at cairn-cms `origin/main` `b63b185f6` and dotfiles `main` `2912c95`. Each task re-reads its lines before editing. A moved line is edited where it now sits, and the commit body names any line that has vanished.
- **Friction-log triage.** It covers only entries this pass files. The R5 items this pass fixes were already promoted to ROADMAP and are not in the log.
- **Token meter (conductor ruling, 2026-10-11).** Every meter counts input + output + cache-creation tokens and excludes cache reads. The conductor computes each figure from the transcripts' `usage` fields. The 10M stop (7M for C, 3M for D) ends at hand-over, so the overnight wait for Geoff's decision is never metered against it.

## Shared wording (both tracks copy it from here, verbatim)

The register (track C) is the source. Both tracks paste these two sentences from this section, so neither track waits on the other. CT-C checks the copies against each other at its close.

- **S1, the cap's scope:** `The 26-word cap counts each sentence on its own and applies only to a step, a list item, or a sentence in a task section; an introduction or explanation sentence is exempt.`
- **S2, the hand-off owner:** `Section hand-offs belong to the page plan: a hand-off the plan places is not a tell, and a read of the page grades its wording, never whether it is there or where it sits.`

Interfaces that track C builds and track D names:

- **`--extract` (CT4).** `node scripts/checks/check-provenance.mjs --extract <file>` reads one sentence per line. It prints one `<line>\t<kind>\t<value>` row for each fact that `extractFacts` finds, passing the container's key phrases as the gate does, and nothing for a clean line. It is not a gate. It exits 0, or 2 when the file argument is missing or unreadable.
- **`local` (CT4).** A brief may carry a top-level `"local": ["<path or name>", ...]` array of non-empty strings: the site-invented paths and names the page has the reader create. The drafter is its one writer. An entry that is a name `parseApiSurface` (`check-symbols.mjs:376`) returns under any subpath is a defect, because an engine export is never site-invented.

## Conventions every task follows

- **Task fields.** Each task gives its outcome, files, risk class, acceptance check, test, and clock estimate in minutes. A task is done only when its acceptance passes.
- **Commits.** One commit per task, with the subject starting with the task id (`CT3: Refuse $lib imports in check:snippets`). Use imperative mood, commit specific files only, and never `git add -A`. The body carries the task's evidence and ends with `Pass-Clock: task=<id> start=<epoch> end=<epoch> estimate=<min> fixes=<n>`.
- **Proofs on a clean tree.** Each check-script defect gets a test that fails before the fix and passes after it. The proof runs after the task's commit, on a clean tree:
  1. Run `git checkout HEAD~1 -- <script>` (for a pair task, the dispatch commit instead of `HEAD~1`).
  2. Run the new test and quote the red result.
  3. Run `git checkout HEAD -- <script>` and confirm `git diff --quiet`.
  4. Add the evidence to the commit message with `git commit --amend`.
- **Command forms.** One plain command per Bash call, with literal absolute paths. No `for` loops and no heredocs. Write intermediate output to a scratch file and never pipe it into a substitution.
  - Scratch roots: `/var/home/glw907/.cache/pre2b-tooling/` (C) and `/var/home/glw907/.cache/pre2b-tooling-dotfiles/` (D). Each holds `tmp/`, `pr-body.md`, and the CI logs.
  - Every gate and test command takes a leading `TMPDIR=<root>/tmp`.
- **Git dirs, as literal paths.** The worktree-isolation guard refuses a git dir computed at runtime (`g=$(git rev-parse --absolute-git-dir)`, `"$(git rev-parse ...)"`), so every command names it literally. Git names a worktree's dir after the worktree's basename (probed: `.claude/worktrees/overnight-2b-plan` has `.git/worktrees/overnight-2b-plan`).
  - C: `/var/home/glw907/Projects/cairn-cms/.git/worktrees/pre2b-tooling`.
  - D: `/var/home/glw907/.dotfiles/.git/worktrees/pre2b-tooling`.
  - Right after EnterWorktree, run plain `git rev-parse --absolute-git-dir` once. If it prints another path, use that path everywhere this plan names the git dir.
  - Below, `<gitdir>` means that literal path.
- **Gates (C).** The fast lane: `node scripts/checks/gate-tier.mjs --fast --range <base>..HEAD` prints the legs, and each leg runs through `cairn-run-gate` per `cairn-pass`. `<base>` is `HEAD` at the task's start, written as a fourth clock-file line, `base=<sha>`.
- **Gates (D).** `bash scripts/gate.sh`. A proof's single focused run (`node tests/...`, `go -C <dir> test ./...`) may run directly.
- **Clock.** At each task start the session writes `<gitdir>/pass-task-clock` with `task=`, `start=`, `estimate=`, and `base=`, per `pass-core`, and removes the file at the task's end. Take `start=` from a separate `date +%s` call and write the number literally. CT-C and DT-C are the exception: their clock file is removed at PR-ready, before `review-desk` (pass-core "Score" ends the clock there), so the wait for Geoff is never clocked.
- **Pairs (C).** A pair is two Agent-tool subagents, `subagent_type: "cairn-implementer"`, with `isolation: "worktree"`, dispatched in one message after the session's commit.
  - At dispatch, the session records `date +%s` and starts a background `sleep` of twice the pair estimate. If the sleep exits before both subagents return, that is the pair's clock stop.
  - Each pair prompt quotes:
    - its task block verbatim;
    - the two Anthropic scope samples from the launch prompt;
    - "Skip agent-memory maintenance.";
    - "Run the adapter's setup command first.";
    - "Do not run the fast lane; run your task's Test and Acceptance commands through `cairn-run-gate`, each with `TMPDIR=/var/home/glw907/.cache/pre2b-tooling/tmp`.";
    - "Edit only your Files. List every page fix or new check failure in your final report and do not edit pages.";
    - "Put your evidence in your commit body, commit once (the proof's `--amend` is part of that commit), and never push. Run one plain command per Bash call."
  - When both subagents return, the session:
    1. Merges each branch with `git merge --no-ff -m "<id>: Merge the pair branch" <branch>`.
    2. Applies the page fixes both reports name, as one commit, `<id>, <id>: Fix what the pair's checks flagged`, carrying the pair's `Pass-Clock:` trailer.
    3. Runs the fast lane with the dispatch commit as base, then pushes.
    4. Removes both pair worktrees with `git worktree remove` and deletes their branches with `git branch -d`.

  A merge conflict stops the line.
- **Pushes and CI (C).** Push `worktree-pre2b-tooling` to `glw907/cairn-cms` after every commit. Then start `ci-green <sha> --pr <n> --wait > /var/home/glw907/.cache/pre2b-tooling/ci-<sha>.log 2>&1` as a background Bash task, re-issued on exit 75 and never piped. Exit 1 is a red. Exit 2 is a red unless one re-push clears it. Exit 3 is re-read at the next push. No task waits for CI. Never push `main`.
  - An exit 1 whose failing step is an `npm ci` timeout is infrastructure (main's e2e run 38188696187 failed that way). Run `gh run rerun <run-id> --failed` once and re-issue the watch. It counts toward the two attempts only if it fails again.
- **Stops.** These stop the line:
  - A fired clock stop.
  - A red the session cannot fix in two attempts.
  - A merge conflict.
  - A finding that would change the approved design.
  - A snippet or symbol failure whose fix would change what a page teaches.
  - The battery at 11 percent with no mains supply.
  - The planning session's token stop. It meters 7M tokens for C and 3M for D from the transcripts, in the unit "Token meter" defines, since `claude agents --json` carries no token field.

  A usage limit is not a stop. A subagent error that names a usage limit is not a red and not an attempt: record it, let the wake-up tick wait past the reset, and re-dispatch the same task.

  A stop:
  1. Writes `<gitdir>/pass-stop` with the task, what failed, and the one question.
  2. In C only, and only before hand-over: puts the same three facts in the branch's `docs/STATUS.md`, then commits and pushes that as `Record a stop in STATUS (<task>)`. A stop after hand-over (`gh pr ready` in C, the PR's opening in D) never commits or pushes, because a new head breaks the desk's `--match-head-commit`.
  3. Runs `notify-send -u normal "pre-2b tooling (<track>) stopped at <task>; resume: claude attach <session name>"`.
  4. Ends the turn.

  Every wake-up tick first runs `test -e <gitdir>/pass-stop` and ends the turn if the file exists.
- **Resume.** A relaunch reruns the launch prompt:
  1. It finds the PR with `gh pr list --head worktree-pre2b-tooling --state all` and never opens a second one.
  2. It merges any `worktree-agent-*` branch whose commits carry a pair task id.
  3. It starts at the first task with no commit whose subject begins with its id. Subjects starting `Record a stop` are skipped.
  4. Two exceptions. If the last commit is a pair's `Merge the pair branch` with no `Fix what the pair's checks flagged` commit after it, it starts at that fix commit. If the `CT-C: Close the pass records` commit exists, it keys on the PR: a draft PR resumes at CT-C's step 5 (the PR body), and a ready PR at step 6 (hand-over).

## Order

**Track C:**

1. CT1.
2. The CT3 and CT4 pair. While it runs, the session runs CT2.
3. The CT5 and CT6 pair.
4. CT7.
5. CT-C.

The pair seams:

- CT3 writes `scripts/checks/check-snippets.mjs` and `src/tests/unit/check-snippets.test.ts`.
- CT4 writes `scripts/checks/check-provenance.mjs`, `src/tests/unit/check-provenance.test.ts`, `scripts/checks/fixtures/provenance/**`, and `docs/internal/briefs/README.md`.
- CT2, in the session, writes neither set of files.
- CT5 writes `scripts/checks/check-symbols.mjs`, `scripts/checks/check-symbols-allowlist.mjs`, `src/tests/unit/check-symbols.test.ts`, `scripts/lab/link-consumer.mjs`, and a new `src/tests/unit/link-consumer.test.ts`.
- CT6 writes `scripts/checks/check-facts.mjs`, `src/tests/unit/check-facts.test.ts`, `scripts/checks/fixtures/facts/**`, `docs/internal/facts/*.md`, and `docs/internal/facts/README.md`.

CT2, CT6, and CT7 all edit `docs/internal/facts/*.md`, so they stay serial.

**Track D:** DT1, then DT-C, independent of C except for the shared wording and the merge order.

## Track C tasks (cairn-cms)

### CT1. Re-entry and the register

- **Outcome.**
  - **Re-entry.**
    - The session is in worktree `pre2b-tooling` on branch `worktree-pre2b-tooling`, made from local `main`.
    - `git merge --no-edit overnight-2b-plan` (the local branch; worktrees share refs) brings in this plan and the design.
    - The setup command has run: `npm ci && npm ci --prefix examples/showcase && (cd examples/showcase && npx svelte-kit sync)`.
    - One line in the branch's `docs/STATUS.md` names the session (`pre2b-tooling-cairn`, its id from `claude agents --json`) and the branch.
  - **`docs/internal/docs-register.md`.** No heading is renamed, because the chain reads register sections by exact heading.
    1. `:90-91`: the bullet states that a sentence in a step, a list item, or a task section stays under 26 words, with its accessibility link, followed by S1.
    2. `:1102`, the Google table's Accessibility row:
       - "What cairn does instead" keeps the qualified-claim sentence, carries S1, and says that a sentence over the cap in a step, list item, or task section is a blocking guide finding.
       - The Ruling cell appends "per-sentence scope, Geoff, 2026-10-11 (pre-2b tooling scope)".
    3. `:165-175` and `:506-516`, the two "A page is drafted from its committed page plan" bullets: each ends with S2.
    4. `## For reviewers grading against this standard` (`:1195`): one new bullet saying that a dispatch which scopes a review quotes S1 verbatim, because a broader wording drew three false blocking findings on a scoped read (2026-10-07).
    5. The symptom-row anatomy (`:812-816`) names its closing section: a page of symptom rows ends with a see-also section, as `docs/extend/debug-your-site.md:405` does.
    6. `## Names`, the table at `:620-632`:
       - A new row. Thing: the people an auth channel signs in beside the editors. Name: "a second sign-in group". Rule: never "second audience" or "second population"; the page "Add a second sign-in group" fixes the name.
       - The "Retired as names" row gains "second audience" and "second population".
  - Commit, push, open the draft PR against `main` in `glw907/cairn-cms`, and start the watch.
- **Files.** `docs/internal/docs-register.md` and `docs/STATUS.md` (one line).
- **Risk.** `ordinary`.
- **Acceptance.**
  - `git merge-base --is-ancestor overnight-2b-plan HEAD` exits 0.
  - With the register flattened (`tr '\n' ' '`, then `tr -s ' '`, written to a scratch file), `grep -o -F "<S1>"` counts 3 and `grep -o -F "<S2>"` counts 2.
  - `git diff -U0 overnight-2b-plan..HEAD -- docs/internal/docs-register.md` shows no changed `#` heading line.
  - The fast lane is green, and the draft PR exists.
- **Test.** The counts and the fast lane.
- **Clock.** 30.

### CT2. One name for the second sign-in group (session, during the CT3 and CT4 pair)

- **Outcome.** Every live use of "second audience", "second-audience", and "second population" reads "second sign-in group", or is rewritten around that name.
  - **Reference.** `docs/reference/auth-crypto.md:15`, `:18`, `:27`, `:122`, `:170`, and `:173`; `docs/reference/auth-channel.md:3`, `:10`, `:33`, and `:79`; `docs/reference/README.md:52` and `:53`.
  - **Guidance.** `skills/cairn-extend/SKILL.md:33` and `:43`, with `templates/waymark/.claude/skills/cairn-extend/SKILL.md` kept identical to it. `claude/CLAUDE.md:26`, with `templates/waymark/.claude/cairn/CLAUDE.md:26` kept identical to it: `check:template` compares the template's `.claude/` to the bake from `claude/` (`packages/create-cairn-site/scripts/bake-template.mjs:212`), so editing only the template copy goes red.
  - **Internal map.** `docs/internal/src-lib-map.md:50` and `:86`.
  - **Published pages and their briefs, edited in step.**
    - `docs/extend/restrict-admin-access.md:51` and `:363`, with `docs/internal/briefs/extend/restrict-admin-access.json:187` and `:970`.
    - `docs/extend/replace-magic-links-with-cloudflare-access.md:34` and `:409`, with its brief's `:88` and `:645`.
  - **Facts.** `f:nz890r` (`docs/internal/facts/extend.md:255`), `f:tkpmxr` (`:722`), and `f:hcjb3o` (`:72`): rename in claim prose only. A claim or anchor that quotes a `src/lib` comment verbatim stays as it is, because the comment itself stays; `f:qqy4uq` (`:256`, whose anchor quotes "the second-audience login factory") is one.
  - **Left as records:** every file under `src/` (Later), the code comment at `examples/showcase/src/members/channel.ts:53` (Later, with the `src/lib` comments), `docs/superpowers/**`, `*.plan.md` and `*.framing.md` under `docs/internal/briefs/`, `docs/internal/outlines/**`, `CHANGELOG.md`, `ROADMAP.md`, `docs/internal/engine-rulings.md`, and the facts heading `## docs/extend/add-a-second-audience.md` (`extend.md:68`, which absorbed-page coverage reads).
- **Files.** As listed above.
- **Risk.** `ordinary`. The diff is prose only, and nothing under `src/` changes.
- **Acceptance.**
  - `git diff --name-only HEAD~1 -- src` prints nothing.
  - `grep -rn -i -E 'second[- ]audience|second population'` over `docs/reference docs/extend skills templates claude docs/internal/src-lib-map.md docs/internal/facts docs/internal/briefs/extend/*.json` prints only the `extend.md:68` heading and fact lines that quote a `src/lib` comment verbatim, each listed in the commit body.
  - `diff -r skills/cairn-extend templates/waymark/.claude/skills/cairn-extend` prints nothing.
  - `diff claude/CLAUDE.md templates/waymark/.claude/cairn/CLAUDE.md` prints nothing, and `npm run check:template` is green.
  - The fast lane (which includes `check:facts`, `check:provenance`, and Vale's error tier) is green.
- **Test.** The fast lane. There is no behavior to test.
- **Clock.** 40.

### CT3. `check:snippets`: `$lib`, list-indented fences, and the type-environment comment (pair with CT4)

- **Outcome.**
  1. **`$lib`.** An import whose specifier is `$lib`, or starts with `$lib/`, is a problem at its doc line: "SvelteKit 3 removes `$lib`; import from `#lib`". Today the script stubs every `$` specifier (`:78`, comments `:21-23` and `:69-70`). Other `$` aliases stay stubbed.
  2. **List-indented fences.** `FENCE_OPEN_RE` and `FENCE_CLOSE_RE` (`:59-60`) and the skip-comment match accept a fence indented under a list item. The block's body is dedented by the fence's indent, and `fenceLine` still maps to the doc's line. 31 such fences in `docs/extend` are unchecked today.
  3. **Type environment: a comment, no code change.** TypeScript 6.0 already defaults `types` to `[]`, so `typecheckUnits` (`:378-396`) changes nothing. The header comment states that default and its leak: all units share one program, and `vite`'s `.d.ts` carries `/// <reference types="node" />`, so any vite-importing block exposes Node's globals to every unit. A block that needs Node's types still carries `/// <reference types="node" />`, as the r4 hooks sample does. A per-unit environment stays in Later.
  - The subagent runs `npm run check:snippets` over the real docs and reports each newly failing block by file, line, and message.
- **Files.** `scripts/checks/check-snippets.mjs` and `src/tests/unit/check-snippets.test.ts`.
- **Risk.** `runner`.
- **Acceptance.** New unit cases:
  - a `$lib/x` import is a problem, while a `#lib/x` import is not;
  - a fence indented under a list item is extracted with a dedented body;
  - a `node:fs` call with the reference directive is clean. This is a regression lock with no red proof, since the script already passes it.

  Each other case fails with the script reverted, per "Proofs on a clean tree". After the merge, the session fixes each reported block in its page where the fix keeps what the page teaches (a `#lib` specifier, the reference directive, a missing import). Fenced code sits outside the brief (`check-provenance.mjs:506`). Any other failure is a stop.
- **Test.** The unit cases, through `cairn-run-gate 'npx vitest run --project unit src/tests/unit/check-snippets.test.ts'`, and `cairn-run-gate 'npm run check:snippets'`.
- **Clock.** 30. The pair estimate with CT4 is 55: the longer task, plus 15 for the merge and the page fixes.

### CT4. `check:provenance`: page-local names, the extractor mode, and `<details>` (pair with CT3)

- **Outcome.**
  1. **`local`.** A brief may carry a top-level `local` array, per "Shared wording". An extracted `path` or `name` fact whose value equals an entry passes, in a cited sentence and in a `no-claim` sentence alike. A malformed `local` (not an array, or a non-string or empty entry) is a defect, one per bad entry, and so is an entry that names an engine export (import `parseApiSurface` from `check-symbols.mjs`). `local: []` is valid and changes nothing. Today the extractor gives a site-invented path no citable form (classes at `:46-55`).
  2. **`--extract <file>`.** The CLI mode exactly as "Shared wording" states it.
  3. **`<details>`.** `pageProse` (`:503-511`) sets aside the `<details>`, `</details>`, `<summary>`, and `</summary>` tags. The summary's text stays as prose the brief carries. `extractFacts` drops those four tags before the path classes run, so `PROSE_PATH_RE` (`:135-136`) no longer reads `</details>` as a path.
  - The header comment and `docs/internal/briefs/README.md` document `local` and `--extract`.
- **Files.** `scripts/checks/check-provenance.mjs`, `src/tests/unit/check-provenance.test.ts`, `scripts/checks/fixtures/provenance/**`, and `docs/internal/briefs/README.md`.
- **Risk.** `runner`.
- **Acceptance.** New cases:
  - a `no-claim` sentence naming `src/members/channel.ts` passes with the path in `local` and fails without it;
  - a malformed `local` fails, and so does a `local` entry `createAuthChannel` (an engine export);
  - a page with a `<details>` block passes coverage when its summary and body sentences are in the brief;
  - a sentence ending at `</details>` extracts no path;
  - `--extract` on a two-line fixture prints the expected rows.

  Each case fails with the script reverted. `npm run check:provenance` is green over the corpus.
- **Test.** The cases, through `cairn-run-gate 'npx vitest run --project unit src/tests/unit/check-provenance.test.ts'`.
- **Clock.** 40.

### CT5. `check:symbols` and `link:consumer` read a fresh site (pair with CT6)

- **Outcome.**
  1. **Leading dot-directory.** The leading half of the token trim at `check-symbols.mjs:319` becomes `/^(?:\.{0,2}\/)+/`, which removes any run of `./`, `../`, and `/` but keeps a leading dot-directory. The trailing half stays. So `.cairn/index.json` survives whole, and `../worker-configuration.d.ts` (`docs/reference/admin-routes.md:203`) still reduces to a slash-less token that is skipped, as today (probed).
     - The trim change surfaces 12 corpus tokens in dotted form (reviewer's simulation): `.cairn/admin.css` ×5, `.svelte-kit/cloudflare/_worker.js` ×4, `.claude/settings.json` ×3. Re-key the three allowlist entries that held their mangled forms (`check-symbols-allowlist.mjs:134`, `:164`, `:173`) to the dotted tokens, and update their comments, so the real-corpus case at `check-symbols.test.ts:582` stays green.
  2. **The dev package.** The import match at `:290-292` takes a specifier suffix that is empty or starts with `/`. `@glw907/cairn-cms-dev` is no longer read as an engine subpath `-dev`. The dev package's imports go unresolved by this class (Later).
  3. **Site-relative paths.** `pathExists` (`:609-615`) also resolves a site-relative path against `templates/waymark/`. It is exported, so the test calls it directly: `findUnresolvedSymbols` cannot run on a temp root (it reads `docs/internal/api-surface.md` and four other repo files).
  4. **`link:consumer`.** In `scripts/lab/link-consumer.mjs`, `consumerPackages` (`:141-148`) returns both `PACKAGES` when the consumer declares neither. It prints one line saying it adds both, instead of failing at `:146`, and its doc comment (`:136-139`) says so. It is exported, and the top-level run sits behind the repo's `runIfMain` (`scripts/checks/reference-coverage.mjs:808`, as `check-snippets.mjs:44` and `:463` use it), so a unit test can import it.
  - The subagent runs `npm run check:symbols` and reports each newly failing token. After the merge, the session fixes the page, or adds an entry with its reason to `check-symbols-allowlist.mjs` when the token is right and the resolver cannot see it.
- **Files.** `scripts/checks/check-symbols.mjs`, `scripts/checks/check-symbols-allowlist.mjs`, `src/tests/unit/check-symbols.test.ts`, `scripts/lab/link-consumer.mjs`, and `src/tests/unit/link-consumer.test.ts` (new).
- **Risk.** `runner` (`scripts/checks/**`). The `scripts/lab` part is `ordinary`.
- **Acceptance.** New cases:
  - `.cairn/index.json` is extracted whole;
  - a fenced `@glw907/cairn-cms-dev` import yields no `-dev` subpath candidate, while `@glw907/cairn-cms/sveltekit` still does;
  - `pathExists` resolves a path present only under a temp root's `templates/waymark/`;
  - `consumerPackages` on a temp directory whose `package.json` is `{}` returns both names.

  Each case fails with its script reverted. The existing real-corpus case stays green.
- **Test.** The cases, through `cairn-run-gate 'npx vitest run --project unit src/tests/unit/check-symbols.test.ts src/tests/unit/link-consumer.test.ts'`.
- **Clock.** 40. The pair estimate with CT6 is 55.

### CT6. `check:facts`: `.go` pointers and anchored `package.json` pointers (pair with CT5)

- **Outcome.**
  1. **`.go` pointers.** `POINTER_RE` (`check-facts.mjs:350-351`) adds `go`. A `.go` pointer then resolves and range-checks like any other, with bare names going through the basename index (`:336-342`). The container holds 245 `.go` pointers, 5 of them anchored. Each pointer that now fails is repointed in this commit.
  2. **Manifest pointers.** In `validatePointer` (`:691-711`), a pointer whose resolved basename is `package.json` and that carries no parseable anchor is a defect, with the message "no parseable anchor" and a request for the cited line's key as the anchor. `CHANGELOG.md` pointers are out of scope (Later): new entries go at the top, so every CHANGELOG edit shifts its lines past the 10-line anchor window (conductor ruling, 2026-10-11).
  3. **The anchor sweep.** Each unanchored `package.json` pointer gets its cited line's key as an anchor: about 68 by a plan-time grep, and `extractPointers` is the count of record. A pointer with a prose parenthetical rather than a strict `` (`x`) `` (for example `` `package.json:198-203` (`bin` field ``) counts as unanchored and is rewritten into strict form. First, read the cited line against the bullet's claim, and repoint any pointer whose line no longer carries the claim. A scratch script under `/var/home/glw907/.cache/pre2b-tooling/` may list each pointer beside its cited line.
  4. **README.** `docs/internal/facts/README.md` "The gate" (`:166-172`) names both rules.
- **Files.** `scripts/checks/check-facts.mjs`, `src/tests/unit/check-facts.test.ts`, `scripts/checks/fixtures/facts/**`, `docs/internal/facts/*.md`, and `docs/internal/facts/README.md`.
- **Risk.** `runner`.
- **Acceptance.**
  - New cases: an out-of-range `.go` pointer fails while an in-range one passes; an unanchored `package.json` pointer fails while an anchored one passes. Each fails with the script reverted.
  - `npm run check:facts` and `npm run check:provenance` are green.
  - The commit body counts the anchors added, the pointers repointed, and the `.go` pointers resolved.
- **Test.** The cases, through `cairn-run-gate 'npx vitest run --project unit src/tests/unit/check-facts.test.ts'`.
- **Clock.** 40.

### CT7. Move `.ts` line pointers to `path#Symbol`

- **Outcome.**
  - **What converts.** Each `src/**/*.ts` `path:line` pointer in `docs/internal/facts/*.md` (1242 at plan time, 325 of them anchored) whose cited lines all fall inside one named declaration becomes `path#Symbol`, keeping any anchor. The symbol is the deepest declaration that `check-facts.mjs`'s resolver can name (`:59-71`): a top-level first segment, and each later segment a direct declaration of the one before.
  - **What stays.** A pointer stays in line form when its range spans two declarations, sits in top-level statements, or lands in an unnamed declaration.
  - **The script.** The work is done by a scratch script at `/var/home/glw907/.cache/pre2b-tooling/migrate-symbol-pointers.mjs`, using the TypeScript compiler API. It is never committed, since this is a one-time operation, and the commit body quotes it whole.
  - **Drift.** After the conversion, `check:facts` runs. An anchored pointer whose anchor now misses its symbol's lines is drift: read the claim, then repoint it to the right symbol, or restore its line form and list it.
- **Files.** `docs/internal/facts/*.md`.
- **Risk.** `ordinary`.
- **Acceptance.**
  - `npm run check:facts` and `npm run check:provenance` are green.
  - The commit body gives the counts (converted, and left in line form by reason) and ten sampled conversions, each read against its claim and quoted.
  - The remaining count of `src/...ts:N` `Source:` pointers, counted with `check-facts.mjs`'s `extractPointers`, equals the body's "left" count. Pointers in claim prose and bare-name `.ts` pointers are outside the count, since the converter only reads `Source:` pointers with a `src/` path.
- **Test.** The two checks.
- **Clock.** 45.

### CT-C. Close (track C)

- **Outcome.** In order, per `pass-core` "Close" and `cairn-pass`:
  1. **Beside CI.**
     - **The review.** One whole-branch `diff-reviewer` (`model: "opus"`, effort `medium`) re-derives each task's class. Its brief is this plan, the design, and the ROADMAP item text.
     - **The wording check.** Fetch the dotfiles branch's chain with `gh api 'repos/glw907/workstation/contents/claude/.claude/workflows/docs-page-chain.js?ref=worktree-pre2b-tooling' -H 'Accept: application/vnd.github.raw' > <scratch>/chain.js`, flatten it, and confirm that S1 and S2 appear verbatim. Record the result, or "not yet pushed", in `Shared wording`.
  2. **One batched fix chain.** Each blocking finding and each red is quoted verbatim (location, finding, and fix) as its acceptance. Then the fast lane and a push.
  3. **The `cairn-pass` close checklist.** No admin smoke: the pass is `runner`, with nothing on the `auth-data` path map. No `CHANGELOG.md` entry: the scripts are internal and CT2 changes wording only. No public-behavior facts bullet, and no surface update. The facts README and briefs README are updated (CT4, CT6).
  4. **Ledgers.**
     - **STATUS.** In `docs/STATUS.md`, remove CT1's session line. State that the two tooling PRs wait for Geoff's desk read, that cairn-cms merges first, then workstation, then `make install` of tellgrader, and that stage 2b is next. Keep it present tense, 60 lines or fewer.
     - **ROADMAP.** In `ROADMAP.md`, rewrite the "Docs tooling before stage 2b" entry (`:341-394`) to its residue, the "Later" items below.
     - Commit both as `CT-C: Close the pass records`, push, and start the watch.
  5. **The PR body.** It is kept at `<scratch>/pr-body.md` and published with `gh pr edit <n> --body-file`. Its sections, in order:
     - `What landed`;
     - `Shared wording`;
     - `Dotfiles PR`;
     - `Review`;
     - `Smoke`;
     - `End-to-end check`: each defect's test, red before and green after;
     - `Retried tests`;
     - `Merge order`;
     - `Found, not done`, each item with now, defer, or drop and a one-line reason;
     - `Score`, with `pass-core`'s rows and gate time from `cairn-run-gate --records <toplevel> worktree-pre2b-tooling`.
  6. **Hand-over.** When `ci-green` exits 0 on the final head:
     1. Run `gh pr ready <n>`, then remove `<gitdir>/pass-task-clock` (the clock ends at PR-ready). From here a stop never commits or pushes.
     2. Run `review-desk pr glw907/cairn-cms "Pre-2b docs tooling: register, checks, and fact pointers" <n>` as a background Bash task, and hand `Found, not done` over as one `review-desk triage` item (a JSON file under the scratch root).
     3. Wait until each command exits with Geoff's decision.
     4. On approve, run `gh pr merge <n> --merge --match-head-commit <head>`, with `<head>` taken from the decision. Then call ExitWorktree with `action: "keep"` first, because the isolation guard blocks git commands aimed at the main checkout from inside a worktree. Then pull the main checkout per `pass-core` "Close" (`git -C /var/home/glw907/Projects/cairn-cms pull --ff-only`), or report it stale if another live session sits there (`claude agents --json`). Then act on each triage row, notify, and end.
     5. On reject, fix forward from the note and hand over again.
- **Files.** The fix chain's files, `docs/STATUS.md`, and `ROADMAP.md`.
- **Risk.** `runner` (the pass's class).
- **Acceptance.**
  - `ci-green` exits 0 on the final head.
  - The review's blocking findings are fixed, or overruled with a reason in `Review`.
  - `wc -l < docs/STATUS.md` prints 60 or less.
  - `test ! -e <gitdir>/pass-task-clock` holds after `gh pr ready`.
- **Test.** CI.
- **Clock.** 60.

## Track D tasks (dotfiles)

### DT1. The chain's prompts, the drafter's brief shape, and the showcase tell

- **Outcome.**
  - **The chain.** `claude/.claude/workflows/docs-page-chain.js` holds S1 and S2 as two string constants, verbatim from "Shared wording", each a single-line literal (a `+` concatenation breaks CT-C's flattened verbatim grep).
    - `planPrompt` (`:1090-1153`) carries S1, S2, and one instruction. The instruction: run `mkdir -p ~/.cache/docs-page-chain`, then write each sentence the plan quotes and marks `no-claim` (a hand-off or a lead-in) one per line to `/var/home/glw907/.cache/docs-page-chain/<slug>.no-claim.txt` (an absolute path for Write). Run `node scripts/checks/check-provenance.mjs --extract <that file>` from the worktree, and for each row it prints, cite the fact's id, reword the sentence, or, for a path or name the page has the reader create, mark it for the brief's `local`. The prompt says the extractor is not a gate, since `planPrompt` today says "you do not run a gate" (`:1093`).
    - `structurePrompt` (`:1585-1684`) carries S1 and S2 in both modes.
    - `editorPrompt` (`:1494-1505`, the register seat) carries S1 and S2, with S1 introduced by "S1 governs over your definition's cap line". Stage 2b runs the chain from this branch while the register editor's definition loads from stowed main, so on an unscoped read (where `scopeNote` returns "") the prompt is the only carrier of S1 until merge (conductor ruling, 2026-10-11).
    - `claude/.claude/agents/cairn-register-editor.md:58-59`, the whole-item cap ("A step or list item over 26 words is a blocking guide finding ..."), is rewritten to S1's scope: a sentence over 26 words in a step, a list item, or a task section is a blocking guide finding, followed by S1 verbatim. This lands at merge.
    - `scopeNote` (`:1450-1459`) carries S1, so every scoped read states the cap's scope in the register's words.
  - **The drafter.** `draftPrompt` in the chain gains the brief's `"local": ["<a path or name the page has the reader create>"]` field, with one sentence on when to use it. It goes in the chain, never in `claude/.claude/agents/cairn-docs-drafter.md`: stage 2b runs the chain from this branch's worktree before Geoff merges it, while agent definitions load from the stowed main checkout (conductor ruling, 2026-10-11). Leave `cairn-docs-drafter.md` untouched. The sentence names the drafter as `local`'s one writer.
  - **The tellgrader.** In `claude/.claude/skills/writing-voice/evals/tellgrader/internal/tellscan/lexicon.go:15`, the pattern becomes `(?i)\bshowcas(?:es|ed|ing)\b`, with a one-line comment that the bare noun is the cairn example site's name. The commit body states the trade-off: the bare infinitive "to showcase" no longer flags.
- **Files.** `docs-page-chain.js`, `claude/.claude/agents/cairn-register-editor.md`, `lexicon.go`, `tests/docs-page-chain-derivation.test.mjs`, and `internal/tellscan/scan_test.go` beside `lexicon.go`.
- **Risk.** `runner`.
- **Acceptance.**
  - `bash scripts/gate.sh` exits 0, quoted in the commit body.
  - New checks in `docs-page-chain-derivation.test.mjs`, in the style of `:252-256`:
    - each constant equals its "Shared wording" text exactly;
    - each named function's source interpolates the constant this task names;
    - `planPrompt` names `--extract`;
    - `draftPrompt`'s source carries `"local": [`;
    - `cairn-register-editor.md` carries S1 verbatim, with whitespace collapsed (the file wraps at about 100 columns).
  - A one-time acceptance command, run once and quoted in the commit body, never added to a test (a pass-scoped diff in a permanent test reds every later branch): `git diff --name-only origin/main...HEAD` lists neither `claude/.claude/agents/cairn-docs-drafter.md` nor anything under `claude/.claude/skills/cairn-figure/`, and not `bin/.local/bin/cairn-docs-outline`.
  - New `scan_test.go` cases: "the showcase" under the docs register yields no `slop-hard`, while "showcases" and "showcasing" still do.
  - Each new check fails with its source reverted, per "Proofs on a clean tree", run with `node tests/docs-page-chain-derivation.test.mjs` and `go -C claude/.claude/skills/writing-voice/evals/tellgrader test ./internal/tellscan/`.
  - `tests/docs-page-chain-outline.test.mjs` still passes.
- **Test.** The new checks and the gate.
- **Clock.** 50.

### DT-C. Close (track D)

- **Outcome.** In order, per `pass-core` "Close" and `dotfiles-pass`:
  1. `bash scripts/gate.sh` on the head. Dotfiles has no PR CI, so this is the full-suite home.
  2. One whole-branch `diff-reviewer` (`model: "opus"`, effort `medium`), loading `ts-conventions` for `*.js` and `go-conventions` for `*.go`. Its brief is this plan's Track D, "Shared wording", and the design.
  3. One batched fix chain, with verbatim criteria, then the gate again.
  4. `claude-tooling-sync verify`, and one `gitleaks git` branch-history scan. No install manifest changes, and `settings.json` is untouched.
  5. Push `worktree-pre2b-tooling` to `glw907/workstation` and open the PR against `main`. Body sections:
     - `What landed`;
     - `Shared wording`, with S1 and S2 verbatim;
     - `Cairn-cms PR`: the one from `glw907/cairn-cms` branch `worktree-pre2b-tooling`, merged first;
     - `After merge`: `make -C ~/.dotfiles/claude/.claude/skills/writing-voice/evals/tellgrader install`;
     - `Review`;
     - `Found, not done`, with dispositions;
     - `Score`.
  6. **Hand-over.**
     1. Remove `<gitdir>/pass-task-clock` (the clock ends at PR-ready). From here a stop never pushes.
     2. Run `review-desk pr glw907/workstation "Pre-2b docs tooling: chain prompts and the showcase tell" <n>` as a background Bash task, plus one `review-desk triage` item, and wait for Geoff's decision.
     3. On approve, run `gh pr merge <n> --merge --match-head-commit <head>`. Then, in this order:
        1. Call ExitWorktree with `action: "keep"`, because the isolation guard blocks git commands aimed at the main checkout from inside a worktree.
        2. Pull `~/.dotfiles` per `pass-core` "Close" (`git -C /var/home/glw907/.dotfiles pull --ff-only`), or report it stale if another live session sits there (`claude agents --json`). On a stale report, skip the install and say so in the notification.
        3. Run the `After merge` install, and confirm that `tellgrader --register docs` on a scratch file reading "the showcase" prints no `slop-hard`.
        4. Notify and end.
     4. On reject, fix forward and hand over again.
- **Files.** The fix chain's files.
- **Risk.** `runner`.
- **Acceptance.** The gate is green on the final head. The review's blockers are fixed or overruled with a reason. The PR exists with every section above.
- **Test.** The gate.
- **Clock.** 25.

## Budget

- **Task minutes.**
  - C: 30 + 40 + 30 + 40 + 40 + 40 + 45 + 60 = 325 (CT1 through CT-C).
  - D: 50 + 25 = 75.
  - Total: 400, against the design's 180. That is over the 2x line of 360. The owner ruling above approved launch at 385; the review fold added 15 (CT2's missed uses, CT4's `local` export refusal, CT5's allowlist re-key, DT1's register-editor fix) and removed 5 (CT3's dropped `types` change).
- **Clock path.** Track C runs about 245 minutes: 30 + 55 (the CT3 and CT4 pair, with CT2 beside it) + 55 (the CT5 and CT6 pair) + 45 + 60. Track D runs about 75 minutes beside it.
- **Tokens.** A stop at 10M for both tracks: 7M for C and 3M for D, in the unit and window "Token meter" defines. The planning session meters them from the transcripts.

## Later

Not built in this pass:

- The second-sign-in-group rename in `src/lib/auth-channel/factory.ts:1` and `:537` and `src/lib/auth-crypto/index.ts:2`, with `f:qqy4uq`'s anchor, at the next engine pass (Geoff, 2026-10-11). The same rename in the showcase comment at `examples/showcase/src/members/channel.ts:53`.
- Anchored `CHANGELOG.md` pointers. New entries go at the top, so every CHANGELOG edit shifts its lines past the 10-line anchor window. A fix checks a CHANGELOG anchor within its version section, or anywhere in the file (conductor ruling, 2026-10-11).

- `tellgrader` in CI (vendoring the binary).
- The unreproduced `cairn-run-gate` "gate vanished".
- Resolving `@glw907/cairn-cms-dev` import identifiers in `check:symbols`, which has no surface snapshot for the dev package.
- `path#Symbol` outside `src/`, for `.go`, and for `.svelte`. Latent drift in unanchored pointers that CT7 converted from a stale line.
- The pointer-repair half of the pass A item: a moved `Source:` path should not force a claim edit for provenance matching.
- A `Cairn.NamesRetired` Vale entry for "second audience" and "second population".
- A per-unit type environment in `check:snippets`, for a reader on a create-cairn-site scaffold, which names `node`. Today all units share one program, so a vite-importing block exposes Node's globals to every unit.
- HTML tags other than `<details>` and `<summary>` in `pageProse`.

