# Engine pass B lean plan: fold record

Fold of the three plan-review lenses (`2026-10-10-engine-pass-b-lean-review-{contract,mechanics,integrity}.md`)
into `docs/superpowers/plans/2026-10-10-engine-pass-b-lean.md` and its prompt, at `69bf3e60`. The old
plan (`2026-10-08-engine-pass-pre-2b-b.md`) was not edited: every finding was fixable from the new
plan.

Counts: 76 findings. 74 folded (nine in part, with the refused part stated), 1 refused, 1 owner
fork. Integrity M2 is folded and carried a second owner fork. Geoff ruled both on 2026-10-10 ("Ruled"
below), and the verification read's findings are folded under "Verification fold".

## Probes behind the fold

Each new mechanism was quoted or probed (scratch under `$HOME/.cache/plan-fold/`):

- `gh pr merge --help` lists `--match-head-commit SHA` and `-m, --merge`.
- `gh run list --help` lists `-c, --commit SHA` and `--json`; `gh pr view 112 --json
  mergeable,isDraft,headRefOid` returns those fields. PR #112 is `OPEN`, so the launch's MERGED check
  matters.
- `claude agents --json` prints an array whose objects carry `name`, `cwd`, `status`, and `state`.
  The launch's `jq` filter returned `false`/1 on the live list, `true`/0 for a session named
  `engine-pass-b` or one with `cwd` in either worktree, `false`/1 for `engine-pass-bx`; a garbage
  listing makes `jq -e 'type=="array"'` exit 5. `bash -n` passes on the launch block.
- The EnterWorktree tool contract: `name` creates a new worktree; `path` enters an existing one and
  "also works when the session is already in a worktree". `claude --help`: `--bg` "Prints the id
  that `claude attach`, `logs`, `stop` and `rm` take"; `--resume <session-id>` continues it.
- `claude-clock-stop` reads only the `task=`, `start=`, and `estimate=` keys with `sed -n`, so a
  fourth `base=` line is safe.
- Step 2's branch (`origin/worktree-lean-cutover`): `pass-gate-tiers.md` "The fast lane" runs no
  whole node project and no e2e, and its unit leg takes only `src/`/`scripts/` paths; `vitest.config.ts`
  puts `packages/cairn-cms-dev/src/**/*.test.ts` in the `unit` project; root `package.json` has
  `test:integration`, `prepare: npm run package`, and workspaces `packages/*`; `create-cairn-site`'s
  `test` script is `node --test ...`; CI `test.yml:83-88` bakes the template before `npm --prefix
  packages/create-cairn-site test`; the bake emits from the showcase (`bake-template.mjs:1,10`);
  the bake's version quoting was run through `bash -c` and printed `^0.98.0`; showcase
  `playwright.config.ts` reads `E2E_PORT`; `e2e.yml` holds the dev-fold steps at `:83-101` and
  `:136-150`, writing `/tmp/dev-fold-*`.
- D6's home: `src/lib/delivery/manifest.ts:18` `buildSiteManifest` loops each descriptor and parses
  each entry's frontmatter; the fixed screens live at `src/lib/sveltekit/admin-nav.ts:280`
  (`ACCESS_FIXED_SCREENS`), neither a PB-T8 nor a PB-T7 overlap.
- WIP `dbdc4556` (parent `1ce14d3b`) touches 34 paths; the six outside old Tasks 1 and 2's Files were
  read hunk by hunk (`bin.mjs`, `money.mjs`, `own-tree-and-guidance.test.ts`, two facts files;
  `worker-configuration.d.ts` is inside `templates/waymark/**`).
- `ci-green`'s header: exits 0/1/2/3/75, `--pr` required, no base check. `cairn-run-gate --records
  <toplevel> <branch>` sums one worktree's records.

## Dispositions

### Contract lens

| # | Disposition | Where, or why refused |
| --- | --- | --- |
| C1 | Folded | PB-C items 2, 3, 7 (merge sequence step 6, `Blocking findings open: 0`) and Acceptance (consumer proof, visual verdict, ROADMAP, score rows). |
| C2 | Folded | Conventions, "Evidence": the commit body. |
| C3 | Folded | Conventions, "The extra commands", and each task's Extra commands line. |
| C4 | Folded | PB-T3 Outcome and Extra commands (scratch-script captures, one-spec e2e red then green). |
| C5 | Folded | Conventions, "Base". |
| C6 | Folded | Conventions, "Pairs" (overrides) and "Order" (shared records are the session's). |
| C7 | Folded | Conventions, "`auth-data` tasks" and "Pairs": Decisions and rulings quoted verbatim. |
| C8 | Folded | PB-T1, "WIP paths outside old Tasks 1 and 2's Files": each kept with a reason. |
| C9 | Folded | "Retired phrases inside binding blocks" table. |
| C10 | Folded in part | PB-T7 Acceptance: the showcase build locally; the template adapter by CI `scaffold` (already builds the emitted template) instead of a local fresh emission, which costs an install for what CI runs anyway. |
| C11 | Folded | Conventions, "Commits" (`Pass-Clock:` trailer); PB-C item 7 (score sources). |
| C12 | Folded | PB-T0 Re-check lines and the plan's "Re-check" section; D6's home and the fixed-screen file are decided in the plan from probes. |
| C13 | Folded in part | Resume step 1 and the prompt (`path` on relaunch). Refused the git-dir skip: EnterWorktree `path` switches from inside a worktree, and step 2's run proved the `name` path from a `--bg` launch. |
| C14 | Folded | PB-C reorder: review beside CI, one blocking CI read on the final head. |
| C15 | Folded | Launch block, `gh pr view 112` MERGED check. |
| C16 | Folded | PB-C item 1: `npm ci`, the lockfile kept. |
| C17 | Folded | PB-C merge sequence step 3. |
| C18 | Folded | PB-C item 6 names the entry exactly and the path item goes past tense. |
| C19 | Folded | Conventions, "'Fails today' on an `ordinary` task". |
| C20 | Folded in part | PB-T8: C5 rows for `tagNames: null` and a callback returning nothing (the `auth-data` floor). Refused the `check-dev-package`, D6 two-key, and D8a no-value rows: no measured defect, and the close review checks coverage. |
| C21 | Folded | "Clock total", stated plainly. |
| C22 | Folded | PB-T0 at 30, with the redundant package and bake removed. |
| C23 | Folded in part | PB-T10 amendment rewords the acceptance to the engine's `github-app` provider. The extra doc-comment line is refused: the close review judges the TSDoc. |
| C24 | Folded | PB-T0 STATUS line with name and id. |
| C25 | Folded | PB-C item 1 (reference) and item 2 (STRUCTURAL joins the chain). |
| C26 | Folded | PB-C item 4 and the Retired phrases table: the session runs the smoke. |
| C27 | Folded | Conventions, "Proofs on a clean tree", and PB-T1 (revert by `git checkout <PB-T0>^1 --`, after the commit, instead of `git stash`). |
| C28 | Folded | PB-T0 records the replay line ranges. |
| C29 | Folded | Conventions, "Pairs" (`date +%s` at dispatch) and "Clock". |
| C30 | Folded | PB-C merge sequence step 7 records the ready time. |
| C31 | Folded | Conventions, "CI reads" and "Stops" (exit 2, exit 3, battery). |
| C32 | Folded | Pairs override: subagents run their own tests, the session runs the fast lane once on the merge. |
| C33 | Folded | PB-T0: `npm ci`'s `prepare` builds `dist`; the bake moved into the `create-cairn-site` command. |
| C34 | Folded | PB-C item 1, the review's extra target. |

### Mechanics lens

| # | Disposition | Where, or why refused |
| --- | --- | --- |
| B1 | Folded | Conventions, "Base"; PB-T1 Acceptance (gate and review over `<PB-T0>^1..`). |
| M1 | Folded | Conventions, "Pairs" (type, model, effort, overrides). |
| M2 | Folded | PB-T8: D6 in `buildSiteManifest`, no export, a needed export is a stop. |
| M3 | Folded | Prompt and Resume (`path` on relaunch, absolute plan paths). |
| M4 | Folded | Retired phrases table; Gates rule for the `create-cairn-site` suite by path. |
| m1 | Folded | Launch block fails closed. |
| m2 | Folded | Launch block: `origin/main..HEAD` count and #112 check. |
| m3 | Folded | Launch block runs in a subshell. |
| m4 | Folded | PB-T0: `--no-commit`, then a `PB-T0:` subject. |
| m5 | Folded | Pairs: background `sleep` at twice the pair estimate, transcript idle check. |
| m6 | Folded | Conventions, "Gates": scratch work in a subshell or with `-C`. |
| m7 | Folded | Retired phrases table (`--outdir` under the scratch root) and PB-T0's line ranges. |
| m8 | Folded | PB-C merge sequence step 3. |
| m9 | Folded | Pairs step 4 (pair records) and PB-C item 7 (CI labeled total). |
| m10 | Folded | Pairs step 4: `git worktree remove` and `git branch -d`. |
| m11 | Folded | Extra commands (one-spec e2e) and PB-T3. |
| m12 | Folded | Prompt: `sleep 43200`. |
| m13 | Folded in part | PB-T0 to 30; PB-T10 to 80, not 90: estimates are expected durations, and the stop already fires at twice them. Pair merges carry 10 each. |
| m14 | Folded | PB-T0 STATUS line. |
| OF1 | Owner fork, ruled | Ruled 2 below: normal urgency. |

### Integrity lens

| # | Disposition | Where, or why refused |
| --- | --- | --- |
| B1 | Folded | Conventions, "Stops" (`pass-stop` marker, checked first by every turn and resume, cleared only on Geoff's word) and merge sequence step 1. |
| B2 | Folded | Same root as mechanics B1; PB-T1. |
| M1 | Folded | PB-C item 7's merge sequence, with `--match-head-commit`. |
| M2 | Folded, plus owner fork | Conventions, "Merging `main`" (STATUS by hand, other conflicts stop); PB-C item 6 edits only pass B's STATUS lines; merge-ins bounded at two. The auth-data question is Ruled 1 below. |
| M3 | Folded | Resume steps 1 to 6; PB-C item marks are the PR body sections, which live on GitHub, instead of PR comments. |
| M4 | Folded in part | Launch: pre-launch push, clean worktree, local equals origin; the prompt reads the plan by absolute path. Refused `pgrep -af engine-pre-2b-b`: the launch shell's own command line holds that path, so it would refuse every launch; the `claude agents --json` `cwd` check covers a live session there. |
| M5 | Folded | Conventions, "Proofs on a clean tree". |
| M6 | Folded in part | PB-T10 amendment: fixture contents, resolved-root assertion, read-after-write per step. Refused the static `git grep` for write calls: it needs an allowlist of existing hits, and the assertions close both vacuous cases. |
| M7 | Folded | PB-T0 baseline; Conventions, "CI reads" (PB-T0 informational). |
| M8 | Folded in part | Launch: #112 check and fail-closed listing. Refused the main-checkout clean check: the checkout is shared (`cairn-pass`), and the worktree branches from the `HEAD` commit, so warm edits there never reach it. |
| M9 | Folded | Pairs overrides and "Order". |
| m1 | Folded | Stops, battery line. |
| m2 | Folded | PB-T1 WIP paths. |
| m3 | Folded | PB-T1: remedy sentence and the `MIGRATION_DATABASES` comment. |
| m4 | Folded in part | PB-T5: three malformed-value rows and `vi.stubEnv`. Refused the `envDir` read: old Task 5's Outcome fixes the channels to the template's, `process.cwd()`, which is design. |
| m5 | Refused | The `content` option cannot write to disk in either mode, TypeScript refuses a typo for typed consumers, and a construction throw is behavior outside ruling 5's outcome. |
| m6 | Folded | Conventions, "CI reads". |
| m7 | Folded | Stops: commit and push the STATUS rewrite; notify text names the PR and worktree. |
| m8 | Folded | PB-C item 8: ExitWorktree `keep`; the planning session removes both worktrees (STATUS cleanup line). |
| m9 | Folded | Same as mechanics m5. |
| m10 | Folded | Same as mechanics m4. |
| m11 | Folded | PB-C reorder: one base check, in the merge sequence. |

## Clock

Re-totaled: 605 minutes of estimates; critical path 550 minutes (9.2 hours). The success-test clock
(PB-T0's commit to `gh pr ready`) covers about 525 minutes (8.75 hours), about 15 minutes under the
9-hour test before any fix round. At the spec's price for fix rounds and reds, 40 to 90 minutes, the
expected clock is 9.4 to 10.3 hours, a miss: the test passes only with zero fix rounds and no red.
Each stop's wait for Geoff is excluded from the clock and reported as its own Score line (planner's
ruling, below). The plan's "Clock total" says so.

## Ruled

1. **A clean merge of `main` during the close that touches `cairn-pass`'s `auth-data` globs needs
   only CI green on the merged head; a conflicting merge-in stops.** Geoff, 2026-10-10: "Yes, CI
   green is enough." Folded at PB-C merge sequence step 3. For the record: integrity M2 had
   recommended re-running the review and the smoke on such a merge-in (its option b), a cheaper
   middle option was to re-run both over the merged-in range only, and CI's e2e runs under
   `CAIRN_DEV_BACKEND:1`, so it never drives the real magic-link round trip the smoke drives.
2. **Stops keep `notify-send -u normal`.** Geoff, 2026-10-10: "Normal urgency." Folded at Stops.
   Mechanics OF1 had recommended `-u critical` for stops.
3. **Planner's ruling, not Geoff's: the wait between a stop's notification and Geoff's reply is
   excluded from the success-test clock,** as a pause under ruling 13 and the spec's exclusion of
   "pauses he orders". The score reports each stop's wait as its own line. Folded at Stops, PB-C
   item 7, and "Clock total".

## Verification fold

Folded from `2026-10-10-engine-pass-b-lean-fold-verification.md` (0 blockers, 1 major, 12 minors).
Each was checked before folding; the new commands were probed under `$HOME/.cache/plan-fold/v1/` (the
stop-or-reset call reset `start=` on a stale clock and printed the marker without touching `start=`
when `pass-stop` existed; `! ss -Htln "sport = :4392" | grep -q .` exits 0 on a free port; a `sleep`
inside a Bash loop runs).

| # | Disposition | Where |
| --- | --- | --- |
| V1 | Folded | Prompt and Resume step 2: the stop check and the clock reset are one Bash call, the first after EnterWorktree; a clock-stop line before it is stale. Stops: the "go on" turn removes `pass-stop` and rewrites the clock in one call. A wake-up tick runs only the stop check, so a live overrun still fires. |
| V2 | Folded | Conventions, "CI reads", and merge sequence step 5: exit 3 at the merge is a stop. |
| V3 | Folded | Merge sequence step 8: the base check again after the CI wait. |
| V4 | Folded | Merge sequence step 7: up to three re-reads, 10 seconds apart, while `UNKNOWN`. |
| V5 | Folded | Stops: notify text names `claude attach engine-pass-b`; the commit is `Record a stop in STATUS (<task>)`, and Resume step 6 skips that subject. |
| V6 | Folded | Pairs: the sleep exiting is the pair's clock stop; the transcript-mtime check is gone. |
| V7 | Folded | PB-C Acceptance: `git show origin/main:CHANGELOG.md` carries pass B's `## Unreleased` lines. |
| V8 | Folded | Merge sequence step 3 quotes Geoff's ruling; "Ruled" records each reviewer's dissent. |
| V9 | Folded | "Clock total" and the Clock section above: the expected miss and the stop-wait exclusion. |
| V10 | Folded | The e2e extra command leads with the port guard; PB-T3's capture server runs on `E2E_PORT=4394` and is stopped after. |
| V11 | Folded | Retired phrases table: every `/tmp/dev-fold-<x>` (the `rm`, `--outdir`, and `grep`). |
| V12 | Folded | PB-T0: the re-check covers this plan's own text; each task re-checks the old bodies it reads. |
| V13 | Folded | Pairs step 3: `--allow-empty` when no record moved. |
