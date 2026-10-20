# Fold record: pre-2b tooling plan (59d09fa05)

Review: `2026-10-11-pre-2b-tooling-review-mechanics.md`, plus the four findings from the 2b part 1 review (`2026-10-11-draft-docs-2b-part1-review-mechanics.md`) that equally apply here (M1, M2, M5, M6). Targets: the plan and both launch prompts. I checked each finding against cairn-cms `b63b185f6` and dotfiles `2912c95` before acting.

## Conductor rulings recorded (not re-opened)

- **Token unit.** Every meter counts input + output + cache-creation tokens and excludes cache reads. The conductor computes it from transcript `usage` fields. The 10M stop (7M for C, 3M for D) ends at hand-over. Recorded in the plan's "Token meter", Stops, Budget, and both prompts' stop rules.
- **Finding 5:** option (c).
- **Finding 1:** remove the clock file at PR-ready, and no commit or push after hand-over.
- **Finding 2:** drop the `types` change.
- **Finding 8:** register-editor lines 58-59, plus S1 in `editorPrompt`, with the agent guard narrowed.
- **Finding 10:** ExitWorktree keep, then pull, then install.

## Dispositions

| # | Finding | Disposition |
|---|---|---|
| 1 | Clock stop fires during the overnight wait | Folded, per the ruling. The Conventions "Clock" carries the CT-C/DT-C exception. CT-C hand-over step 1 and DT-C hand-over step 1 remove `<gitdir>/pass-task-clock`. Stops step 2 is "only before hand-over". CT-C's acceptance moves after `gh pr ready`. Both prompts say the same. Verified: pass-core "Score" says "the clock runs from the first execution commit to PR-ready". |
| 2 | CT3 `types: []` is a no-op under TS 6.0.3 | Folded, per the ruling. CT3 item 3 becomes a header comment only, covering the TS 6 default and the shared-program leak. The `node:fs` case stays as a regression lock with no red proof. Later is reworded. Verified: TypeScript is `6.0.3`, and `node_modules/vite/dist/node/index.d.ts:1` is `/// <reference types="node" />`. CT3 clock 35 to 30. |
| 3 | CT5's own corpus test goes red | Folded. The allowlist joins CT5's Files and the pair seams. The three entries (`:134`, `:164`, `:173`, verified) re-key to dotted form. The `../` case is decided: the leading trim becomes `/^(?:\.{0,2}\/)+/`. Probed in node: `.cairn/index.json` and `.svelte-kit/cloudflare/_worker.js` survive whole, and `../worker-configuration.d.ts` becomes the slash-less `worker-configuration.d.ts`, skipped as today. The `:582` real-corpus case is named in the acceptance. CT5 clock 35 to 40. |
| 4 | CT5 entry point cannot run on a temp root | Folded. `pathExists` is exported and tested directly. Verified: `check-symbols.mjs:609` is a non-exported `function pathExists`, and `findUnresolvedSymbols` reads `api-surface.md`. |
| 5 | CHANGELOG anchors red every CHANGELOG edit | Folded as (c), per the ruling. CT6 items 2 and 3 cover `package.json` only, with the message "no parseable anchor". CHANGELOG moves to Later with the reason. A grep recount gives 68 unanchored `package.json` pointers, and `extractPointers` is named as the count of record. |
| 6 | `local` is an unchecked escape hatch | Partly folded. An entry that is a `parseApiSurface` name is a defect. Verified: `createAuthChannel` matches `^- \`([^\`]+)\`:` at `api-surface.md:189`, and the case is added. The drafter is named as the one writer, in "Shared wording" and DT1's draftPrompt sentence. **Refused:** the existing-path check, because `templates/waymark/` ships files a page has the reader edit (for example `src/hooks.server.ts`), so it would refuse legitimate entries. **Refused:** fact-read grading of `local`. It adds a seat change to D for a risk the export check already narrows. |
| 7 | Pass-scoped diff guard inside a permanent test | Folded. It is now a one-time DT1 acceptance command quoted in the commit body, narrowed to `cairn-docs-drafter.md`, `cairn-figure/`, and `cairn-docs-outline`. |
| 8 | Unscoped register reads keep the whole-item cap | Folded, per the ruling. DT1 rewrites `cairn-register-editor.md:58-59` (verified text: "A step or list item over 26 words is a blocking guide finding"). `editorPrompt` carries S1 and S2, with "S1 governs over your definition's cap line". The agent file joins Files, and a derivation check confirms S1 is in it, with whitespace collapsed. Verified: `scopeNote` returns "" when unscoped (`docs-page-chain.js:1451`). DT1 clock 45 to 50. |
| 9 | CT2 misses live uses; template bake | Folded. Added `auth-crypto.md:15`, `:122`, `auth-channel.md:3`, `:10`, `:33`, `README.md:52`, `:53` (the reviewer missed `:53`; my grep found it), and `src-lib-map.md:50`, `:86`. `claude/CLAUDE.md:26` is edited with its template copy kept identical, with a `diff` check and `check:template` added. Verified: `bake-template.mjs:212` reads `claude/CLAUDE.md`, and the two files are identical today. The showcase comment `examples/showcase/src/members/channel.ts:53` goes to records and Later, beside the `src/lib` comments (a code comment, same reasoning as the owner's ruling). The acceptance grep now covers `claude` and `src-lib-map.md`. CT2 clock 35 to 40. |
| 10 | The close pulls main from inside the worktree | Folded, per the ruling. ExitWorktree keep comes first, then `git -C <checkout> pull --ff-only`, then (D) the install. A stale report is made when another live session sits there, and D then skips the install. Mechanism: the EnterWorktree tool doc says to "use `action: \"keep\"` to return to the original directory". pass-core "Close" names `git -C <checkout> pull --ff-only` and its no-live-session condition. |
| 11 | Overnight token meter undefined | Folded via the token-unit ruling (see above). |
| m-CT6 count | 84 vs 95; prose parentheticals | Folded into CT6 item 3. Prose parentheticals are rewritten into strict form, and the count of record is `extractPointers`. |
| m-CT7 count | Count over `Source:` pointers | Folded into CT7's acceptance. Verified: `extractPointers` is exported (`check-facts.mjs:358`). |
| m-Resume | CT-C commit and pair-merge gaps | Folded. Resume step 4 covers both gaps. A pair merge with no fix commit resumes at the fix. A draft PR resumes at CT-C step 5, and a ready PR at step 6. |
| m-CT4 `--extract` | Missing arg, `local: []`, several bad entries, key phrases, planPrompt `local` | Folded. A missing argument exits 2, and the key phrases load as the gate loads them, both in "Shared wording". `local: []` is valid. Each bad entry is one defect. The plan prompt can mark a name for `local`. CT4 clock 35 to 40. |
| m-CT4 `<details open>` | Tags with attributes | Dropped (optional). |
| m-CT5 `link:consumer` | Doc comment, `--restore`, test location | Doc comment folded. **Refused** the `--restore` state: link adds both packages first, so restore on a site that declares neither is not a path the tool's flow reaches. Test location dropped (optional). |
| m-CT3 `$lib` forms | `import type`, re-export, dynamic import | Dropped (optional). The probe shows 0 `$lib` imports in published docs. |
| m-CT6 `.go` | 245 resolve | Informational, no change. |
| m-planPrompt | "you do not run a gate" conflict | Folded (trivial). The prompt says the extractor is not a gate, and adds `mkdir -p` and an absolute Write path. Verified: the line is at `docs-page-chain.js:1093`. |
| m-DT1 constants | Single-line literals | Folded (trivial, correctness). |
| m-Pairs background | Say "background" | Dropped (optional). A foreground dispatch only serializes CT2 after the pair, which is slower but correct. |
| m-e2e flake | Repeated `npm ci` timeout | Folded. One `gh run rerun <id> --failed` before it counts as an attempt. Verified: `gh run rerun --help` lists `--failed` ("Rerun only failed jobs"), and the `ci-green` header says `--wait` reruns an infrastructure red once. |
| m-CT1 item 4 | No seat reads the reviewers section | Dropped (optional). It is dispatcher guidance as intended. |
| m-numbering | CT-C steps skip 4 | Folded (trivial). Renumbered to 1-6. |
| m-proof wording | "commit once" vs amend | Folded (trivial). The pair line says the amend is part of the one commit. |
| m-design vs plan merge | "Out: any merge" | Dropped (optional). pass-core's desk-approve rule reconciles them. |
| m-over-ceremony | CT1 STATUS line | Dropped (optional). |
| M1 (2b) | Fresh-session `resumeFromRunId` | Not applicable. No Workflow runs in this pass, and both prompts' resume is the launch prompt plus git and PR state. |
| M2 (2b) | Guard refuses computed git dirs | Folded. Both prompts name their literal git dir, and the plan defines `<gitdir>` in Conventions ("Git dirs, as literal paths"). The first act is split into plain calls, with `date +%s` separate from `sed`. Ticks, stop writes, clock writes, and CT-C's acceptance all use the literal path. Probed: `git -C .../worktrees/overnight-2b-plan rev-parse --absolute-git-dir` prints `/var/home/glw907/Projects/cairn-cms/.git/worktrees/overnight-2b-plan`, so the git dir is named after the worktree's basename. Dotfiles has no `.git/worktrees/` yet, so `pre2b-tooling` takes no suffix. A one-time `git rev-parse --absolute-git-dir` check after EnterWorktree covers a surprise. |
| M5 (2b) | Usage limit unnamed | Folded. A subagent error that names a usage limit is not a red, an attempt, or a stop: the tick waits past the reset and re-dispatches. It is in Stops and both prompts' tick lines. |
| M6 (2b) | Token unit | Folded via the conductor ruling. |

## Design impact

No finding changes the approved design. Two items are scope trims inside it: CT3 drops a code change, and CT6 defers CHANGELOG anchors. Both are conductor-ruled. The task-minute total rises from 385 to 400, which is 15 over the figure in Geoff's launch ruling. That ruling already approved running past the 2x line (360), so I record the increase in Budget and do not treat it as a fork.

## Budget after the fold

- C: 30 + 40 + 30 + 40 + 40 + 40 + 45 + 60 = 325.
- D: 50 + 25 = 75.
- Total: 400.
- Clock path for C: about 245 minutes. D: about 75.
