# p2-p4 fold record

Fold of the three reviews of `2026-11-02-p2-p4-plan.md` and `-design.md` at `925d9ca0c`. The revision
sits in those two files, uncommitted.

**Counts:** 78 findings. 71 folded, 7 refused, 0 owner forks. m12 moved to refused after the
verification read. That read's own 12 findings are counted in their own section below.

## Read first

- **Design changes: none.** No finding needs anything the sheet's Brief doesn't allow, so nothing stops.
- **Path: 580** against the ceiling of 780, up from 505. No cut applies.
- **Launch holds for Geoff: none.** `## Pre-flight` stays "Nothing for Geoff". One auto-mode line was
  added (`ci-green` exit 4 with the bot as actor, already `cairn-pass`'s procedure), and the
  `scripts/checks/**` line now excepts the generated `api-surface.md`.
- **The conductor answers S1 and S2 before launch.** Neither became a `### Decide:` block.
- **S2's recommendation flipped, for the conductor to see.** It was "leave #276 in the Cleanup round"
  and is now "fold the scroll cue into T8" (+20 on T8, +15 on the path). The sheet's May-not list
  holds "composed at 320 and 2560", both clipped screens are among the eight, and #276's own text says
  an editor can miss **Published**. Leaving it out is therefore a May-not exception, which the
  "reversible, take the recommendation" row can't cover. The plan says that reading needs an explicit
  ruling naming who gave it. If the conductor rules it out, T8 is 70 and the path is 565.
- **S1's recommendation stands**, with data finding 1's correction. Data finding 18 (no client handler)
  is now a listed option, not the recommendation: #238 records that `admin-rest` marks these fields
  with `validator`, and dropping the attributes with no handler stops that mark reporting length, so
  it isn't "no loss".
- **Next stage:** this is an `auth-data` pass, so the verification read is due on this revision.

## Mechanisms the fold introduced

| Mechanism | Proof |
| --- | --- |
| Sticky `::after` scroll cue (T8) | Measured with a Chromium probe on a 286 wide flex row: `scrollWidth` 361; at scroll start the cue covers the clipped edge, at scroll end `sl` 75, the last option's right edge 261.9, the cue's start 262. `.join` is the scrollport at `ListToolbar.svelte:287`. |
| Devalue failure envelope (T6, T9) | `devalue.stringify({error:'x',field:'title'})` printed `[{"error":1,"field":2},"x","title"]`, and `parse` round-tripped it. |
| `refreshAll` on `update()` (T6) | `app/forms/client.js:66,82`: `should_refresh_all ??= ... result.type === 'success'`. |
| `cancel()` on a repeat submit (T6) | `client.js:144-156`: `const cancel = () => (cancelled = true);`, then `if (cancelled) return;`. No guard exists there. |
| `error` path skips `update()` (T6) | `EditPage.svelte:250-253`, the existing guard and its reason. |
| `form.elements.namedItem` (T7) | Named by data finding 9. A standard DOM method; the plan's rule treats its multi-element and hidden results as no control. Not probed, since T7's tests cover those branches. |

No fix folded here is new machinery in the skill's sense. The shared helper grew two branches in a
module the design already had.

## Mechanics review

| Finding | Disposition |
| --- | --- |
| B1 CI red T2 to T10 | Folded. "Baselines wait for T10" under `## Tasks`; T2, T8, T10; standing answer. Verified at `expect.js:12484`. |
| B2 no `test` script | Folded. T1 and the overlap row. Verified: the package has no scripts, `vitest.config.ts:96` holds it. |
| M1 wrong e2e command | Folded once as "The e2e line", used by every task. |
| M2 T3 misses `api-surface.md` | Folded. T3's Files; pre-flight exception. Verified at `api-surface.md:367-368`. |
| M3 T1's missing edits | Folded in T1, with its second test cut (root shared with C9). The module-state reset part is refused: `handle.test.ts` has no fixtures-mode reader, per the data review's clearance. |
| M4 second `webServer` entry | Folded. T1 carries the command in full; the port read and the listener answer are named. |
| M5 bot head shows red | Folded. T10. Verified: `7a78afceb` has `pull_request` runs concluded `failure`. |
| M6 ceiling cut breaks May-not | Folded, root shared with C1. Cut is 16 + 10. |
| M7 T9 fixtures | Folded in T9. Verified: `fake-auth-db.ts:224` has no `consumeToken` branch, `auth-routes.ts:202` returns `sent`. |
| M8 T6 triggers | Folded in T6's acceptance, with C4. Verified at `site-config.ts:56,427` and `fake-github.ts:304`. |
| M9 T7 tests and control lookup | Folded in T7, with D9. |
| m1 T10 not after last merge | Folded with C19 and D15 at T12's rerun rule; `small-api` still open at T12 got an answer. |
| m2 branch doesn't exist | Folded as one pre-flight line: the planning session's push resolves it. |
| m3 Kit navigates on a query URL | Folded with D5: design corrected, two acceptance lines. The no-JS claim is corrected in the design. |
| m4 `_app-forms.ts` | Folded. Dropped from T6's Files; the stub and `location.assign` effects are stated. |
| m5 `ConceptList` discriminator | Folded with D8. The story read is in T6. |
| m6 `--grep editors` | Folded with C11: its own test name. |
| m7 unverifiable check, grep hits this plan | Folded. T2's computed style (with C8), T4's grep scoped to `docs/admin docs/editors`. |
| m8 inert clauses, pair hole | Folded with C24. Verified: `auth-routes.ts:344-349` quotes no retired sentence. |
| m9 overlap table omissions | Folded: two rows. |
| m10 reviewer's condition | Folded with C29: it runs. |
| m11 docs gate after the fold | Folded in T12 step 4. |
| m12 `fieldset.ts:128` | Refused in effect: the verification read showed `:128` was right, and the fold's `:127` is reverted (V10). |
| m13 zero-state copy, focus | Folded. Optional, but the hint is today's behavior (`VocabularyAdmin.svelte:260-262`), so dropping it is an unrequested regression. Costs one clause. |
| m14 T9 fix allowance | Refused. Optional, and headroom covers it. |
| O1 images read twice | Folded with C27 and D19: T10's read counts, T12 reads what changed. |
| O2 email PNGs in a pair | Folded with C28: moved to T12, two PNGs. |
| O3 T5 per-commit review | Refused. `pass-core:234` requires it on an `auth-data` task. T4 gains the same read for its comments. |

## Contract review

| Finding | Disposition |
| --- | --- |
| C1 composed fell out of May-not | Folded. `:124` restored; T8 and T10 now require composed. |
| C2 S2 sets aside a May-not (tagged OWNER FORK) | Folded into S2 as a conductor stop, per the planning session's instruction. Numbers corrected, May-not named, recommendation flipped. See "Read first". |
| C3 sixth test passes under regression | Folded: `window` marker. |
| C4 T6 fixtures, mock's false failure | Folded with M8. |
| C5 T5 "true for every status" | Folded with D14: conditional wording, the 422's own text, clauses dropped. The committed source-level test becomes a grep shown in the PR, which proves the same count with no test reading source. |
| C6 T9 can script around a finding | Folded: `test.fixme` with the BACKLOG number; refusal fixture named. |
| C7 T4 skips confirm page | Folded with D12: confirm test, six strings in the grep, `h1` stated. Adding `content-routes-shell.ts` is refused: `:310` uses `error=expired` as a URL parsing example, and that code stays, so the comment stays true. |
| C8 help fix untested, zero guard vacuous | Folded in T2. |
| C9 T1's second test, reason | Folded: test cut, reason restated, smoke named. |
| C10 dark backstop missing | Folded: six uncommitted images in T12; the design gives the cost. |
| C11 T8 test line | Folded with m6; the CI half with B1. |
| C12 other widths unread | Folded in T8. |
| C13 smoke passes with no `messageId` | Folded in T12. |
| C14 tags has no criterion | Folded in T2. |
| C15 T3 criteria short | Folded in T3. |
| C16 T7 S1 criteria | Folded: table, integration move, value-kept assert, reset clause dropped. |
| C17 T6 promises unpinned | Folded: repeat refusal, four-form grep, `{liveError}` named, Orca item names the removal. The no-JS test isn't needed once the design's claim is corrected. |
| C18 T11 over-records | Folded. |
| C19 stale baselines | Folded with m1. |
| C20 S1 corrections (tagged OWNER FORK) | Folded into S1 as a conductor stop: `## Decisions` line, saving corrected, trim's acceptance named. |
| C21 #248's reason | Folded in the plan and design. The `BACKLOG.md` line was outside this fold's files, so the planning session reworded it. |
| C22 pages and reproductions unowned | Folded in T11. |
| C23 promised items unowned | Folded: T11 files them. |
| C24 inert clause | Folded with m8. |
| C25 ten-minute assertion | Refused. Optional, no cost saving. |
| C26 scope verdicts | Refused. Optional. Both members come from approved items (#238, the zero-state proof), and `check:options` and the whole-branch review read them. |
| C27 images read three times | Folded with O1. The verifier stays: the sheet requires it. |
| C28 two PNGs prove nothing | Folded with O2. |
| C29 reviewer's condition | Folded with m10. |
| C30 size criterion | Folded: cut, a clear saving. |

## Data review

| Finding | Disposition |
| --- | --- |
| D1 emptied optional field blocked | Folded in T7 and the design, with an acceptance row. Verified at `field-rules.ts:21`. |
| D2 `error` destroys the working copy | Folded in T6 and the design. The off-screen redirect notice is refused: it's parity with today, called a bonus by the finding, and more surface than the cluster asked for. |
| D3 no in-flight guard | Folded in T6: per-form flag, `cancel()`, button state, one test. |
| D4 kept copy can overwrite (tagged OWNER FORK) | Folded, not a fork: the other two options are named out of scope by the finding, so one answer stands. The sentence is reworded in all three places; T11 files the load-time head. |
| D5 `update()` navigates from a query | Folded with m3. |
| D6 stale allowlist | Folded: `refreshAll` on a failure, select assert. |
| D7 editors success untested | Folded: design narrowed, `role="status"` line, one test. |
| D8 `ConceptList` discriminant | Folded with m5. |
| D9 control lookup | Folded with M9: `namedItem`, both reveals, hidden-input test. |
| D10 false public comments | Folded: `fields.ts` in T7, behavior in T11. |
| D11 T1's omissions | Folded with M3. |
| D12 false auth comments | Folded with C7. The cookie's TTL stays. |
| D13 `auth.link.sent` reads as universal | Folded in T3 and the design. |
| D14 T5 rate limit | Folded with C5. |
| D15 T10 and T12 merge, watch | Folded with M5 and m1. |
| D16 pre-flight contradiction | Folded with M2. |
| D17 fail loudly on a held port | Refused. Optional, and the e2e line already refuses a held port locally; CI has none. |
| D18 `setCustomValidity` unnecessary (tagged OWNER FORK) | Folded as an S1 option for the conductor, not as the recommendation. See "Read first". |
| D19 T10 and T12 read the same images | Folded with O1. |
| D20 T5's own diff review | Refused with O3. |

## Facts folded from the planning session

- The `small-api` paragraph and factories row now carry the conductor's report, and the run branch's
  head is `e31dfdb83`. `ContentFormFailure` is exported from `src/lib/sveltekit/index.ts:36` there.
  The run branch touches `admin-access.md`, `log/create.ts`, and `editors-routes.ts` among this pass's
  neighbors. T6 doesn't edit `editors-routes.ts`.
- BACKLOG: every new item goes past the highest number on `main`, so past #277.

## Verification read

From `2026-11-02-p2-p4-fold-verification.md`: 3 major, 9 minor, 0 blockers. 11 folded, 1 refused, 0 owed.
Each was verified against the source first. **No design change, no new Pre-flight item, and the path
stays 580**, because these fixes fit inside the task estimates already carried.

| Finding | Disposition |
| --- | --- |
| V1 T1 nests a marker pair (major) | Folded in T1. Verified at `emit-template.mjs:45`: two pairs, and the call changes in place. |
| V2 `refusal.ts` can't hold a read flag (major) | Folded by the finding's second option, narrowed: plain `refusal.ts`, a getter and setter for one `$state` flag on each screen. Per-row state and a `SvelteSet` are not needed: one ManageEditors flag disables all its forms, `EditPage`'s `busy` pattern (`EditPage.svelte:272-274`). |
| V3 `scroll-padding` doesn't move a partly visible option (major) | Folded in T8, S2, and the design. Reproduced: focus alone left `scrollLeft` 0 and the right edge at 327; adding `scrollIntoView` gave 61 and 266. No change to the 20 minutes. |
| V4 cue test passes today | Folded in T8. |
| V5 e2e line quoting | Folded: rule stated, and the three `--grep` values use single quotes. |
| V6 T9 grep hits `route.fulfill` | Folded in T9. |
| V7 T1 review, busy row | Folded. Verified in `pass-core`: `auth-data` task review, no `defer`. |
| V8 D6 had no select assert | Folded in T6 with a `ManageEditors.test.ts` case. The role form alone resets, since a reset on the Add form would clear what D6 keeps. The open question is answered: Svelte's `set_selected` writes the attribute (`bindings/select.js:14-16`), and a probe restored a client-created option carrying the attribute (`b`) but not one set by property (`a`). |
| V9 T7's wrong `form`, ungated banner | Folded, more simply than proposed: `editForm`, and one step in `onEditSubmit`'s `failure` branch focuses the control or the banner, so the banner uses no action and nothing races. Acceptance fails if the banner holds focus in the named-control case. T7 no longer needs `refusal.ts`; T6 stays first because both edit `EditPage.svelte`. |
| V10 two wrong line numbers | Folded: `fieldset.ts:128`, `fake-github.ts:45`, and m12's row. |
| V11 T11's line doesn't branch on S1 | Folded: "under either warn reading". |
| V12 T2 focus has no criterion | Refused. Optional, no cost saving, and the a11y reviewer reads T2 at close. |

## Owed

- `BACKLOG.md` #248's `Placement` line: reworded by the planning session in this commit, so T11 owes nothing.
- No ratified document changed meaning. The sheet stands, and the plan restores its May-not wording.
