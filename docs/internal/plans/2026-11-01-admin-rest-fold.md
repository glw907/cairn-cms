# admin-rest plan: fold record

Fold of `2026-11-01-admin-rest-review-mechanics.md` into the plan, design note, and executor prompt. Every finding
was checked against the source first. Path 280 becomes 310: T2 35, T3 50, T7 55. T6 is 60 inside the pair's 90.
The ceiling is 380, so nothing is cut. The sheet's design stands: "a dev-only 403 that names the fix" is unchanged,
and every change below lands in the plan's note.

## New findings the review didn't carry

- **A. The admin error page hides the ergonomics 15 text (`correctness`).** `+error.svelte:15-20`, in the showcase
  and the template, replaces every 403 with fixed copy, and `admin-error-page.spec.ts` pins it. So a `requireAccess`
  text never reaches a page even with a working signal. Folded in T3: one branch on `No access rule`, plus a real
  `?case=no-rule` e2e proof. The existing fixture's message keeps the role copy.
- **B. `tool.yml` wouldn't run the new Go test (`correctness`).** Its `paths` lists omit `migrations/**` and
  `templates/waymark/migrations/**`, and `test.yml` ignores `tool/**`, so the test would never fire on the change it
  guards. Folded in T6, and the workflow's header states this rule. It's a second `runner` path.
- **C. `0003_preview` is also opt-in.** `adopt-cairn.md:98-99` names it, and the review named only 0001 and 0002. An
  adopted site would otherwise warn. Folded in the T6 constant.

## Dispositions

| # | Disposition | Where, or why |
|---|---|---|
| 1 | Folded | T6 step 4 and test, design ergonomics 19 row. See ruling 1. |
| 2 | Folded, ruling changed | T3 ergonomics 15, design row. See ruling 2. |
| 3 | Folded | T6 step 6 and acceptance. `corpus_test.go` was read: `wrangler_test.go:36-41` builds its expected struct from named fields, so a corpus case with no `migrations_dir` stays valid. |
| 4 | Folded | T6 Files, steps 3, 4, 5, 7, and head class note. `conditions.test.ts:105` was stale, `:124` is right. Also found: `doctor.go:85`, `doctor_test.go:163`, and `doctor.json`, which `-update` cuts. `schema/` enumerates no check id. `doctor-agreement.md` is a dated record with no reader. |
| 5 | Folded | T2 Mechanism, Files, minutes; shared-hunks row. |
| 6 | Folded | T5 table row, Files, `pages? (now )?links?` grep. |
| 7 | Folded | Prompt clock and red rules, plan "Standing answers". See ruling 4. |
| 8 | Folded | T3 and T5 Files; T7 already had it. "Order" says who regenerates. |
| 9 | Folded | T1 brief and prompt state the exception in words. |
| 10 | Folded | Plan sweep row, T7, design "Set aside", T9 `## Decisions`, prompt. See ruling 5. |
| 11 | Folded | T2 acceptance. |
| 12 | Folded | T9 renumbered: the three runs are now step 8, after the last docs edit. |
| 13 | Folded | T7. See ruling 6. |
| 14 | Folded | T1 test 6. The `compiledAdminSheet` plugin in `vitest.config.ts` does the redirect. |
| 15 | Folded | T1 Test intro and test 1. |
| 16 | Folded | T1 acceptance loses it, T9 step 10 and the prompt gain it. |
| 17 | Folded | T1 brief, T9 step 4, prompt. `ss -ltn` check. A server the session doesn't own moves the run to a free port, since the session can't stop it. |
| 18 | Folded | T5 Mechanism and Test, design row. See ruling 7. |
| 19 | Folded | T5 comments rule, table, acceptance grep. See ruling 8. |
| 20 | Folded | T3 #136 table. See ruling 9. |
| 21 | Folded | T6 state table, step 1's buffer. |
| 22 | Folded | Pre-flight, T8 Files, table row, regex. The regex also covers `trailMap`, and `trail[- ]?(guide|map)` was checked against the tree's hits. |
| 23 | Folded | T9 step 4 writes out the Playwright `webServer` command. Pre-flight's "Nothing here runs `wrangler d1`" was false for `--local`, so it's reworded. |
| 24 | No change | Ruling 10. The planning session commits this file before launch. |
| 25 | Folded | T9 `## Decisions`. |
| 26 | Folded | Plan head, Executor. |
| 27 | Folded | T9 step 3. |
| 28 | Kept test 4 | T1 test 4 names why. |
| Owner fork | Not a fork | Ruling 11. T9 `## Decisions` names option (a) and one line each for (b) and (c). Design row updated. |

Refused: none.

## The planner's rulings

1. **Confirmed, with an addition.** I kept reading the package folder and excluded a one-line opt-in constant, as you
   preferred. A named required set would silently leave a new migration unchecked, while the exclusion requires it by
   default, and the Go test then fails if the template lacks it. Listing the folder is still worth keeping. The constant
   holds 0001, 0002, and 0003 (C above), so the required set is your `0000_auth` and `0004_login_nonce`. Unchecked covers an
   absent package folder, per the audit, plus a containment refusal. The test needed B to run.
2. **Changed.** No marker, because a simpler signal is already on the request, as you asked me to check. `event.locals.cairnBackend`
   is set only by the dev handle (`handle.ts:176`), for both content modes, and `ambient.ts:61` documents "a production request
   leaves it unset". It's already typed public surface, so a new member, `api-surface.md` churn, and the `handle.ts` edit all go.
   `ephemeral` is wrong: `repository.test.ts:190` shows the fixtures backend lacks it. `packages/cairn-cms-dev` is in the `engine`
   class and the unit project, so `handle.test.ts` runs and can call the real `requireAccess` under the handle. The ruling line
   says why the flag isn't read. The helper stays in `dev-flag.ts`: it imports nothing, `guard.ts` already reads it, and
   `src/lib/auth/` beside `noRuleReason` is an `auth-data` path. A also adds to T3's Files.
3. **Confirmed.** T2 is 35.
4. **Confirmed.** Both sheet rules are quoted. Read as written, the sheet's "set aside if the pass allows" needs a list, and its
   pass 5 allow list is narrow. So I named ergonomics 19, #24, #143, and #238's part, and everything else stops on an untraced
   cause. That's stricter than the review's "T1, T5, T8", and a stop on an unnamed item is the sheet's own default ("A stop not
   answered here or in its pass still stops").
5. **Confirmed.** The one-branch fix fits, so T7 takes it, with a test. Paste and trim go under the taste row.
6. **Confirmed, minimum:** a private function in `FieldInput.svelte`. `field-rules.ts` doesn't change, so its Files entry isn't
   needed. The help and bound share the one hint paragraph, so `aria-describedby` stays one id.
7. **Confirmed.** One catch on the manifest read, in the same `.then`.
8. **Confirmed.** The grep prints only `:668`, and comments follow the rename. `Shown` and `Revert` are grepped as labels
   (`label: 'Shown'`, `**Shown**`, a bare `Revert` line, `Revert to the version`), since the bare words hit unrelated comments, the
   sentence at `MediaFigureControl.svelte:104`, and the commit message in `content-routes-entry-revert.ts:157`.
9. **Confirmed.** Eight reasons from the real sites. Four fail-closed faults, two of them answering 409, take the `failed` event by
   kind and not by status. `commitFailure` logs through `logCommitFailed` at `commit-log.ts:59`, so `:233` and `:481` are excluded.
   `:402` is excluded as already logged.
10. **Confirmed.**
11. **Confirmed.**
12. **Confirmed.** 25 and 26 took one line each, and 27 one clause.

The `runner` question: the merge word covers the PR, with the conductor's merge and record packet, which the plan already had. No
live smoke is owed, `cairn-running-passes` has no `runner` checklist, and `api-surface.md` regeneration doesn't change the class.

## Mechanisms probed

- **First invalid control.** Headless Chromium (`chromium_headless_shell-1248`, `--dump-dom`, a page in `/tmp/admin-rest-fold-probe`).
  With a title and a control in a hidden aside both invalid, `input:invalid, ...` returned the title for both events, focus landed on
  the title, and the aside stayed closed. With the title filled, the aside opened and focus landed in it, through a hidden row
  wrapper. Bare `:invalid` returned the `FIELDSET`, so the plan names the control selectors.
- **`page.error.message` carries a thrown message.** SvelteKit docs, Errors: an error from `error()` is "an `App.Error` object with the
  provided `status` and `message`" and "considered safe to expose". `+error.svelte:28` already reads it for other statuses.
- **`locals.cairnBackend`.** Read `handle.ts:176`, `ambient.ts:61`, and `content-routes-context.ts:396`. `handle.test.ts:43` already
  asserts it's set on `/admin`.
- **A Go test reading repo files.** `permissions_test.go:14` does this. `tool.yml` read for triggers.
- **Push of a workflow file.** `gh auth status`: the token carries `workflow`.
- **`-update` and `doctor.json`.** `json_test.go:18,65`, `json_schema_test.go:201`.

Not probed: DaisyUI `validator` compiling stays T7's own check, as the plan already said. `requireAccess` for a target with no rule on the
showcase's map: I couldn't read that map at the path I tried, so T3 says to pick "a target no rule matches" and the e2e proves it.
