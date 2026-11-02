# p1-p8 mechanics review

`standards:plan-reviewer`, Opus medium, on the plan at `59740b032`, base `6762c2db3`. Verdict: not
approvable as written, one blocker and four majors, all cheap folds. Severity and tag lead each row.

| # | Severity, tag | Location | Finding | Proposed fold |
|---|---|---|---|---|
| 1 | blocker, correctness | T5 `forged` | `error(403, ...)` reaches `routes/admin/+error.svelte:16-20`, whose fixed 403 copy ignores the message. | Expect the 403 heading, which only a thrown error reaches. |
| 2 | major, correctness | Pre-flight, T5, T6, T8, T9 | `bake-template.mjs` copies `skills/` into the template, so T8, T6, and T9 drift `check:template` and the cumulative lane goes red until T10. | T8, T6, T9 each run `emit:template` and commit it. |
| 3 | major, correctness | T6 files | `audit/run.test.ts:74-102` pins the ids; `check-skill-budget.mjs` `checkTierMap` reads `cairn-building-admin-screens/SKILL.md:37`; `:28` states the count. | Add both files; twenty-two rules, five advisory. |
| 4 | major, correctness | T6 suppression | A finding at file start can't sit in a directive's `targetRange`, so a suppression on `probe-craft` is a dead suppression, which fails `check:cairn`. | Add `probe-craft/+page.ts` with `prerender = false`; anchor the finding on the first node past a leading comment. |
| 5 | major, correctness | T7 acceptance | The grep has no `src/lib` search, so a skipped row passes. | Grep `src/lib` for each new sentence; see it fail on base. |
| 6 | minor, correctness | T7 row | The same string is at `content-routes-shell.ts:323`. | Add the site. |
| 7 | minor, correctness | T9 | "`max-age`-only" and "public visitors get none" are false at this head. | "`max-age` by default"; scope storage to the engine's defaults. |
| 8 | minor, correctness | T9 TLS | The cited page doesn't name Edge Certificates. | Cite the Minimum TLS page too. |
| 9 | minor, correctness | T10 | No docs gate after review folds. | Rerun `check:docs-gate` after folds. |
| 10 | minor, correctness | T10 | Emit precedes review folds. | Repeat the emit after folds. |
| 11 | minor, correctness | T8 | A unit test passes if `main()` never calls the function. | Disable the `files` entry once and watch the script fail. |
| 12 | minor, correctness | T4 | The lane doesn't reach the 11 integration files using the double. | Run them by name. |
| 13 | minor, correctness | T5 `unmapped` | `hasAccessRule` matches by prefix, so a target under the route would be ruled. | Name `/admin/no-such-rule`. |
| 14 | minor, correctness | T5 `allowed` | With no `ctx.audit`, the wrapper logs `admin.action.unaudited`, or throws under `DEV`. | State that it audits. |
| 15 | minor, correctness | T5 local e2e | A worktree run proves the main checkout's engine until reinstalled, and port 4173 can attach to another session's server. | Delete the local run; CI is the proof. |
| 16 | minor, correctness | Standing answers | One failing row stops a may-not item. | Set floors for the route and the sweep. |
| 17 | minor, correctness | Executor | Task reports don't name the CI verdict. | Add a line. |
| 18 | minor, optional | Citations | `custom-screen.spec.ts:33-35`, `site-resolver.ts:116`, `url-policy.ts:45`, `admin-response.ts:53`; design says 12 rows, plan has 14. | Correct them. |
| 19 | minor, optional | T7 section string | `content-routes-settings.ts:154` already says `Let your site developer know.`, which names who can fix a binding. Marked OWNER FORK, wording only. | Reuse it. |
| 20 | minor, optional | T3 | A single deliverable with its own dispatch. | Fold beside T4. |
| 21 | minor, optional | T6 | `+page@.svelte` isn't matched, and a comment could satisfy a text scan. | Name the regex and file pattern. |

Checks passed: T4 probed in a scratch copy, 933 of 940 tests with the patched double, and the new
test fails with the check off. T5's outcomes hold under the dev handle, and `target` is real. T6's
`sources` reach a rule by default, and advisory findings exit 0. T1's redirect throws at `guard.ts:408`,
before `resolve`. T8's snapshot trips no gate. Pairs share no file, and the `auth-data` map stays empty.
