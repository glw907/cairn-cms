# small-api fold record

Inputs: the three reviews beside this file, 77 findings (mechanics 26, contract 31, data 20). Rulings R1 to R14 are the planning session's dispatch. Result: 73 folded, 4 refused, 0 owner forks, no stop. Path 460 to 540, ceiling 840.

"Plan" below means `2026-11-01-small-api-plan.md`. Added: `2026-11-01-small-api-renames.mjs`, plan scaffolding that leaves with the plan files at T16.

## Mechanisms probed

| Mechanism | Probe | Result |
|---|---|---|
| Two `createSectionAction` overloads (R4) | `tsc --strict` in a scratch module against `dist` types, with exact-equality assertions | Pass. `ctx.db` is exactly `D1Database` for an inferred resolver and an explicit-generic one, and the `(e: Env | undefined) => e?.APP_DB` form compiles. `@ts-expect-error` holds on `ctx.db` under `{}`, on `createSectionAction<Env, D1Database>({})`, on a possibly-undefined resolver, and on a typo key. `createSectionAction<Env>({ rateLimit })` compiles. |
| `vi.mock('esm-env')` (R5) | A node-project test over today's `admin-action.ts`, with a getter over `vi.hoisted` | Pass. Both `DEV` branches ran: true throws `UnauditedActionError`, false logs and resolves. No existing test mocks it. |
| Workers UA stub (R7) | `Object.defineProperty` at the top of a setup file, plus the per-emit sink, over the whole unit project (5,242 tests) on a copy of `main` | Pass with a cost. It holds at import and in tests, `vi.stubGlobal` overrides it, and `unstubGlobals` returns to it. No log-record test failed. `handle.test.ts` (14), `repository.test.ts` (10), and `compose.test.ts` (1) fail because `underWorkerd()` reads the same check, so T8 lists those edits. Other failures on the copy were environmental (no git history, stale `dist`). |
| `renames.mjs routing` (R12) | Twice on a clean extract of `origin/main` | 55 files, then 0. |
| `renames.mjs block` (R12) | Twice on the same extract | 78 files, then 0. |
| Order of T7's `chmod` | Read `package.json:36` at `origin/main` | The file doesn't exist before `tsc`, so the second `chmod` follows it. |
| `ciWait` (R11) | Read `gate-tier.mjs`, `test.yml`, `pass-gate-tiers.md`, and searched for a reader | `--protected` prints the mode, no script reads it, and `test.yml` fires on `pull_request`, not branch pushes. So T6 waits through a draft PR. |
| Fast-lane reach of `check:consumers-must` | Read `decideFastGate` and `gate-table.json` `checks` | Selected through the `docs` and `scripts` buckets. A task adding a line still runs it by name. |

Not probed, carried as a test: the `/delivery` graph walk and `dist/internal.js`'s eight names are T3's acceptance, and the design's probe held four.

## Why `intlOptions` isn't a fork (R2, F17, mechanics 4)

F17 offered three options: an unexported helper (A), the fixed format with the year (B), or keeping the option (C). B changes what editors see and C keeps a name the sheet removes, while the call removes names, not behavior. A keeps the short date, changes no screen, and removes the public option. One answer is correct, so no owner question arises.

## Mechanics

| # | Finding | Disposition |
|---|---|---|
| 1 | T3 leaves `check:surface` red | Folded. T3 "Record", T5 Files (the `parseManifest` row). |
| 2 | `check-surface-leaks.json` missing from T3 and T4 | Folded with F18. Plan "Surface tasks", each task's named rows. |
| 3 | T4 breaks `CairnHistory.svelte`'s import | Folded. T4 E10 and Files. |
| 4 | T9 removes an option the engine uses | Folded, R2. T9 "`intlOptions`". |
| 5 | Content-rest collides with T3 and T4 | Folded, R12. Standing answers. |
| 6 | T10 and T14 rewrite content-rest's test lines | Folded, R12. `renames.mjs`, standing answer. |
| 7 | T8 ergonomics 21 breaks unlisted tests | Folded, R7, with F14 and data 4. T8 "Test setup", T5's showcase test. |
| 8 | T4's E4 line has no answer for `access` and `isDev` | Folded, R5, with data 9. T4 "Test, E4" and "Test, readers". |
| 9 | Three tasks hit `gate-table.json`, `ciWait` unstated | Folded, R11. T6 holds both edits, T7 none. |
| 10 | Stale base, merged work called unmerged | Folded, R1, with F15. Header, T7 cites, standing answers. |
| 11 | T14 cites docs that don't exist | Folded with F12. T14 Files. |
| 12 | Auto-mode list short of the real writes | Folded. `## Pre-flight`, refused-eval standing answer. |
| 13 | Orphaned public types after hiding | Refused. `optional`; the leak gate fails what must stay, and `AdminActionOptions` goes anyway. A stale allowlist reason has no runtime cost. |
| 14 | T3 omits `vitest.config.ts` | Folded. T3 Files. |
| 15 | T6 omits `check-surface-leaks.test.ts`; retirement may not be needed | Folded, R3. T6, design "The leak gate". |
| 16 | T4 and T5 test lists miss prune tests | Folded. T4 and T5 Files. |
| 17 | Template guidance is wrong | Folded. Plan "Template". |
| 18 | T4's acceptance can't run | Folded with F7. T4 and T5 acceptance. |
| 19 | Pairs share `CHANGELOG.md` | Folded, R10. Pair headers, "Records". |
| 20 | T12 contradicts the set-aside list | Folded with F27. T12. |
| 21 | T11's cites are off | Folded, free. T11 Files. |
| 22 | T7 leaves stale pointers and an unversioned peer | Folded in part, free: `BIN` via F3, Go comments in T7. The peer falls to data 16. |
| 23 | T6 and T15 both claim the moved-name table | Folded, R9: no committed table, a one-off list in T6. |
| 24 | Close doesn't rerun the docs gate after folds | Folded. T16. |
| 25 | No executor prompt exists at this commit | Refused for this plan. The prompts are the planning session's output after the fold, handed back in the report. |
| 26 | Over-ceremony: T15's sweep | Folded, R9. T15. |

## Contract

| # | Finding | Disposition |
|---|---|---|
| F1 | T5's reorder proof can't be true | Folded with data 8. T5 "Reorder proof". |
| F2 | T6 never proves the gate fails a duplicate | Folded, R3. T6 "Test", mutation in acceptance. |
| F3 | T7 turns bin tests into silent skips | Folded. T7 "Test". |
| F4 | T5's `ttlMs` grep can never print nothing | Folded with data 6. T5 row and acceptance. |
| F5 | Showcase proofs name no install | Folded. Plan "Showcase proofs", T3, T13. |
| F6 | T3's dist test unspecified | Folded. T3 "Tests". |
| F7 | `Object.keys` of the admin barrel can't run | Folded. T4 and T5 acceptance. |
| F8 | T4's type test can pass on the wrong type | Folded. T4 "Test, `resolveDb`". |
| F9 | T1's grep tests readers, not the promise | Folded. T1 test and acceptance. |
| F10 | T1's `Consumers must:` covers one of four members | Folded. T1. |
| F11 | T10's error criterion passes today | Folded. T10 test and hand edits. |
| F12 | T14's grep and string list miss live places | Folded. T14; "Unfold" goes under `## Decisions`. |
| F13 | T15 has no criterion, nothing owns the evals | Folded. Dead-name table, T5 evals. |
| F14 | T8's logger breaks unlisted tests | Merged into mechanics 7. |
| F15 | `check:consumers-must` merged, no task runs it | Merged into mechanics 10; standing answers, T15, T16. |
| F16 | T3 has no grep for the retired subpaths | Folded. T3 row. |
| F17 | `intlOptions` has two internal readers (marked OWNER FORK) | Folded, R2. Not a fork, see above. |
| F18 | Leak rows go stale before T6 | Merged into mechanics 2. |
| F19 | T5's test-first names one signature | Folded. T5 "Test first", Files. |
| F20 | T4's `createAdminAction` criterion is a judgment | Folded. T4 narrowed row, Files. |
| F21 | T9's acceptance covers five of eight options | Folded. T9 row and test. |
| F22 | T2's #98 breaks a pruning test, no files line | Folded. T2. |
| F23 | T12's acceptance is `npm run package` | Folded. T12 row and `cmp`. |
| F24 | T8's secret and remediation criteria are a read | Folded. T8 test on `CairnError`, the acceptance states the static-text rule. |
| F25 | `Consumers must:` gaps in T10 and T8 | Folded. T10, T8. |
| F26 | T15 closes items that may be set aside | Folded. T15. |
| F27 | T12 sets aside a name the sheet doesn't list | Merged into mechanics 20. |
| F28 | T6 names a script that doesn't exist | Folded. T6 uses `check:surface` and the file path, table edit stated. |
| F29 | Dev package peer range | Folded. T7 "at the engine's version". The peer stays, see data 16. |
| F30 | T3 doesn't prove the 404 once bundled | Folded. T3 names both specs. |
| F31 | Three items cost more than they buy | Folded, R9. T15, T16. |

## Data

| # | Finding | Disposition |
|---|---|---|
| 1 | A missed `components` rename publishes no blocks | Folded, R8. T14 refusal, kept if riders go. |
| 2 | Appending remediation changes editor messages | Folded, R6. The append applies to a title and an explicit message; the three subclasses restore theirs with `this.message = message;`. T8 pins the exact strings. |
| 3 | Optional `resolveDb` can lose fail-closed | Folded, R4. T4. Its ask to replace the standing answer is refused: the sheet's sentence stays verbatim. |
| 4 | T8's sink turns console records to strings | Merged into mechanics 7. The probe measured fewer failures than the finding's estimate. |
| 5 | Merge answer misses `content-routes-preview.ts` | Folded. Standing answers. |
| 6 | T5's grep can't pass | Merged into F4. |
| 7 | Stale `loadPreview` and `loadHealth` fail at runtime | Folded. T5 Consumers line. |
| 8 | T5's test claims don't match the suites | Merged into F1. T5 "Lifetime pin". |
| 9 | `isDev` conditional already resolves | Merged into mechanics 8. |
| 10 | Moving off `createAdminAction` adds an access-map need | Folded. T4 recipe and Consumers line. |
| 11 | Stale `spellcheck:` gets a generic message | Refused. `optional`; the build refuses and lists the known keys. |
| 12 | `includeSubDomains` consequence unstated | Folded, free. T9 Consumers line. |
| 13 | `JSON.stringify` changes what a record carries | Folded, free. T8 `@remarks`. |
| 14 | Moved `chmod` must follow `tsc` | Folded. T7. |
| 15 | Node-entry walk loses the bin, never gains `./internal` | Folded, free. T3 Files. |
| 16 | Dev package peers on `*` | Refused. `optional`; local R2 only, and T7 says to install at the engine's version. |
| 17 | `ContentRoutesConfig` import in the dev package | Folded. T5. |
| 18 | Greps aren't rerun after a sibling merge | Folded. Standing answers. |
| 19 | T4 and T5 don't name known site hits | Folded, free. T4 and T5 Consumers lines. |
| 20 | T1 doesn't need an upshift | Folded, R9. T1. |

## Owed

No ratified document changes meaning, so no erratum. The run sheet is unchanged: "rewriting the leak gate" stays under "May not", and T6 retires one model as R3 rules.

The planning session owes the executor and conductor prompts (mechanics 25). They name the CI verdict per accepted task and `cairn-cms-9b`.
