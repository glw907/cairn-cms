# cleanup plan fold record

Fold of the three reviews into `2026-11-02-cleanup-plan.md` and `2026-11-02-cleanup-design.md`, at `154a1ff28`.
Every finding was checked against source or a published page before it folded. Verified corrections are noted.

**Final path:** 839 calibrated, 1,173 at reader sizes. No cut taken. **Counts:** 81 findings: 79 folded, 2
refused, 0 owner forks. Two folded findings had one part refused, named below.

## Path

| Task or pair | Was | Now | Why |
| --- | --- | --- | --- |
| T1+T2 | 85 | 88 | T2's added cases |
| T3+T4 | 80 | 80 | |
| T5+T6 | 105 | 108 | T5 stays 105: no confirm limit, no new arm, offset by `priorId`, the port, and the guarded helper. Session adds T6's event, +3. T6 falls to 95 |
| T7+T8 | 100 | 103 | T7's added cases. T8 falls to 85 |
| T9+T10 | 110 | 110 | T9 rises to 108, T10 holds the pair |
| T11+T12 | 65 | 69 | Decision rule and rerun; probe and baseline compare |
| T14+T15 | 80 | 70 | The grade leaves T15, which falls to 58. T14 holds the pair |
| T16 | 30 | 34 | The grade runs beside the CI wait |
| T17 | 70 | 77 | Stubs, SHA, release line, docs lines, health case |
| T0, T18 | 100 | 100 | |

Additions are at 0.7 of a reader's minutes, as the rest of the plan is. The sheet's cuts weren't needed, since 839
is under 840. S1 carries the reader figures: 1,173, 1,160 after the sheet's cuts, and option (b)'s list ending near
834. The run limit reads about 2,770 and not the 2,760 of ruling 1, because the 0.58 now applies to 1,173.

## Mechanisms probed

| Mechanism | Source |
| --- | --- |
| `cf-connecting-ip` as the address | Quoted from `@sveltejs/adapter-cloudflare/files/worker.js` (read from an installed copy in `~/Projects/phonebook`); `rate-limit.ts:56` |
| Token entropy, confirm limit dropped | `crypto.ts:91-93`, `randomBase64Url(32)`; `auth-routes.ts:339` |
| `--check` behavior | developers.cloudflare.com/workers/wrangler/commands/workers/, quoted in T8 |
| `-X` with a stale path | `go doc cmd/link`, quoted in T15 |
| `latest`, tag prefix | go.dev/ref/mod, quoted in S6 |
| Stop hook, exit 2, `stop_hook_active` | code.claude.com/docs/en/hooks, quoted in T9 |
| Deny-rule matching | code.claude.com/docs/en/permissions, quoted in T12. The real session probe was refused; see "Refusals" |
| Usage-limit exit | `run.mjs:1304-1307` |
| Eval length | `~/.local/state/cairn-docs-evals`, runs `20261101-184223-be57` and `-191925-cb19`, median 18 and 19 seconds; `-084326-e5a1`, median 220 seconds |
| `pass-core` on per-commit reads | `pass-core/SKILL.md:234`: "On an `auth-data` task, `standards:diff-reviewer` reads the commit while CI runs" |
| Whether a gate needs per-task changelog lines | `git grep` of `gate-tier.mjs`, `docs-gate.mjs`: none |

New machinery and its answer: the `sed` and flag denies answer #191's measured defect, on Anthropic's documented
permission rules. The sign-in limiter answers #248's security-read finding, on Cloudflare's binding and the
repo's `resolveRateLimit`. The Stop hook wrap answers the review's "exit 1 is non-blocking" finding, on Anthropic's
hooks reference.

## Mechanics

| # | Disposition | Where |
| --- | --- | --- |
| 1 | Folded | Standing answers, T0 |
| 2 | Folded | T5 step 4, ruling 7 |
| 3 | Folded | T5 step 3 |
| 4 | Folded | T17 acceptance: `api-surface.md` is absent at `v0.98.0`, confirmed. Proxy is `## Removed` and `Consumers must:` at the pre-reset SHA, `createNavRoutes` seeded |
| 5 | Folded | S1, ruling 1 |
| 6 | Folded | Set-aside order, ruling 3 |
| 7 | Folded | S1: about 2,770 |
| 8 | Folded | T12's rule reading, ruling 10 |
| 9 | Folded | T12: named patterns, `cp -a`, measured length, `deniedFaults` cited. `sed` is denied whole, since a glob over-matches and a removed allow rule alone is unproved under `acceptEdits` |
| 10 | Folded | T15, T16 |
| 11 | Folded | T9 |
| 12 | Folded | Standing answers; pre-flight allows a second dispatch for a T18 fold |
| 13 | Folded | T8 acceptance, from the hit list |
| 14 | Folded | S5, `BACKLOG.md`, sweep, design call 5, ruling 4. No other plan text reads a credential |
| 15 | Folded | T6, Tasks intro, Files of T2, T5, T6, T15, ruling 13 |
| 16 | Folded | Tasks intro, T11 step 3, T15's light lane |
| 17 | Folded | T13 |
| 18 | Folded | T17 Placement line; #248 is 12th in the order |
| 19 | Folded | Set-aside order, S1's option (b) |
| 20 | Folded | T7 `:81`, T9 `:56`, both confirmed |
| 21 | Folded | T15, pre-flight. Class gains `runner` |
| 22 | Folded | T10 acceptance |
| 23 | Folded | T11 step 2 |
| 24 | Folded | T8 |
| 25 | Folded | T18, T5 line dropped, row in Standing answers, pre-flight, T9, T7. `check:docs-gate` rerun in T18 |
| 26 | Folded | Sweep verdicts |
| 27 | Folded | Tasks intro, T17. No gate reads per-task lines |
| 28 | Folded | T3, T5 |

## Contract

| # | Disposition | Where |
| --- | --- | --- |
| 1 | Folded | T15's claims, T16's grade, ruling 6. "Nine of nine" stays out of T15's brief |
| 2 | Folded | T16 steps 1 and 5, acceptance |
| F1 | Folded | T16 acceptance, ruling 6. Not a fork |
| 3 | Folded | T5 step 1: keep the line, reword the acceptance, name it for the security read |
| 4 | Folded | T5 step 3, acceptance |
| 5 | Folded | T5 step 4, S2. Address source is the header, per ruling 7, not its optional member |
| 6 | Folded | T11's decision rule |
| 7 | Folded | T12, T17's first bullet, T18 |
| 8 | Folded | T17 acceptance, T7's notice grep |
| 9 | Folded | T18 acceptance, T17 |
| 10 | Folded | T16 |
| 11 | Folded | T13, T10, pre-flight |
| 12 | Folded | T13 |
| 13 | Folded | T8 |
| 14 | Folded | T7, with data 17's fourth case |
| 15 | Folded | T4, T10 |
| 16 | Folded | T4. T9's half is in contract 21's fold |
| 17 | Folded | T2 |
| 18 | Folded | T1 |
| 19 | Folded | T3 |
| 20 | Folded | T6 |
| 21 | Folded | T9. `check:skill-budget` has no script, so T9 names `check:package` |
| 22 | Folded | T17 |
| 23 | Folded | T17, T15's #287 line |
| 24 | Folded in part | Line count dropped. Its `git diff v0.98.0` is refused: mechanics 4 shows that diff has no removed names |
| 25 | Folded | T14 |
| 26 | Folded | T15, header |
| 27 | Folded | T5 |
| F2 | Folded | T8, ruling 5: worked case only. Not a fork |
| 28 | Refused | `optional`. R7's wrapper fold is sheet scope, and its proof condition and set-aside slot already cap it |
| 29 | Refused | `optional`. `pass-core:234` names the commit, and T18's reads don't replace a stop-the-line read |
| 30 | Folded | T18, with mechanics 25 |

## Data

| # | Disposition | Where |
| --- | --- | --- |
| 1 | Folded | T5 step 3, acceptance |
| 2 | Folded | T5, ruling 7 |
| 3 | Folded | T5 step 4 |
| 4 | Folded | T2 |
| 5 | Folded | T5 step 3 |
| 6 | Folded | T17 stubs |
| 7 | Folded | T17, Files |
| 8 | Folded | Set-aside order, ruling 3 |
| 9 | Folded | T5 step 3 |
| 10 | Folded | T5 step 2 |
| 11 | Folded | T15, T18 |
| 12 | Folded | S2, T5. `confirmAction` takes no limit: 32 random bytes, single use, and #248's closure names it |
| 13 | Folded | T5 step 4 |
| 14 | Folded | T5 step 4, acceptance |
| 15 | Folded | S6 |
| 16 | Folded | T2 |
| 17 | Folded | T7 |
| 18 | Folded | T6 |
| 19 | Folded | T6: `optional`, but a line that removes a call. The head reuse is dropped |
| 20 | Folded | T5 step 3, T17 |
| 21 | Folded in part | T10, T18, T17. `README.md:67` is refused: `git grep` finds no `Consumers must` there, so only `docs/architecture.md:44` and `docs/why-cairn.md:69` change |

## Owner forks

None.

## Refusals

- The T12 permission probe: one `claude -p` session against the proposed denies, in a scratch repo. The worktree guard
  refused the command as written, and it was left. T12 runs that probe first, and the plan says so. Deny-rule behavior
  here rests on the permissions page.
- One read-only `grep` over a saved fetch was refused for backticks in its pattern. The guard's message asks for the
  plain command, and that ran.
