# Auth removal plan: fold record

Inputs: the mechanics, contract, and data reviews at `31611653b`. Revised: the plan and the design note.
Every finding was checked against the tree or the cited docs before its disposition. Dispositions:
**folded** (where), **refused** (why), or **owner fork**. There are no owner forks: the two findings tagged
as forks were ruled by the planner, and neither changes the approved design.

## Planner's rulings applied

| Ruling | Where |
|---|---|
| 1. Workflows fallback: option A | Design "What is not proved"; plan T8. No `workflows: 'write'` line remains. |
| 2. `card`: keep, list, rewrite the sentence | Plan T3, `tokens.css:21-22,27-29`; design "Calls made here". |
| 3. Class name | `token_request_refused`. See "Class name" below. |
| 4. Cut order stays | Plan "Stops" is unchanged. The path is 420, under 480, so no cut applies. |
| 5. E2e flake hold | Plan Pre-flight, named as the conductor's. |

## Class name

`token_request_refused`. GitHub's page, fetched this fold, lists one validation status: "422 - Validation
failed, or the endpoint has been spammed." Three causes come from its text or from T2's body: "cannot be
granted access to repositories that the installation was not granted access to", "cannot be granted
permissions that the app was not granted", and a stale name in `repositories`. The fourth is its own
"spammed". The data lens's reasoning holds against `repository_not_covered`, which is true of one cause.
Its own proposal, `token_scope_refused`, fails the same test on spam, so the fold took a name one step
wider. `key_refused` is the sibling for a 401, and the new name says the request was refused, not the key.

## Mechanics and feasibility

| # | Disposition | Where, or why |
|---|---|---|
| 1 | folded | T3 deletes `capture-transport.spec.ts`, and `gate-table.json:232` joins its list. |
| 2 | folded | T3 "Edit the showcase", `csrf-origin.spec.ts`. Verified at `:10-40` and `csrf-helpers.ts:14-15`. |
| 3 | folded | T3 and T5 add `events.go` and `one-warning-failure.txt:14`; `make -C tool check` joins T5's and T6's acceptance; `tool/CHANGELOG.md` line in T3. |
| 4 | folded | T3 and T5 add `events-list.ts`. T3's cite is now `:92-107`, and `events.ts:8` is listed. |
| 5 | folded | T3 lists the hits. The grep runs after the pair merges, and two permalinks are named survivors. |
| 6 | folded | T3 removes `rosterContacts()` and `:111-112`. Replacements `probe-craft` and `error-fixture` are excluded routes, and `git grep` finds neither in `templates/waymark`. |
| 7 | folded | T3 adds the `file-path:` row and `check:symbols` to its acceptance. T8 adds the `log-event:` rows and the events, and takes `runner`. `MIGRATION-NOTES.md` has no fenced import of a removed subpath, so `:517` is the one file-path hit. |
| 8 | folded | T5 acceptance rewritten, and the search rerun on the tree. `store.ts:574` and `auth-store.test.ts:445` added. T3 drops both words at `check-self-use.mjs:31,51`. |
| 9 | folded | T9 step 5 and T4. If 8787 is held, the standing answer uses 8788 and a `sed` copy instead of a wait with no bound: `BASE` at the script's `:22` is its only address. `ss -ltn 'sport = :8787'` run read-only. `pkill` replaced. |
| 10 | folded | Plan "Overlap with 1b", from 1b's plan text. `origin/audit-trim` has changed only `BACKLOG.md` so far, so the list is the plan's. Beyond the finding's list: `check-symbols.test.ts`, `check-package-files.mjs` and its test, `durable-gotchas.md`. `gate-table.json` isn't in 1b's plan text, and the sheet names it, so it stays listed. |
| 11 | folded differently | Both causes are named, but the name changes too. See "Class name". |
| 12 | folded | T3 lists all five. `stale-tokens.css` stays, as a frozen fixture `theme-conformance.test.ts:249` reads. The search also caught `docs-register.md:273`, now in T3. |
| 13 | folded | Plan "Stops" carries the refusal answer, and Pre-flight names the conductor's write check. The smoke gains the setup-cause rule. |
| 14 | folded | T9 step 5 writes out every command. T4 points at them, so they live in one place. |
| 15 | folded | All four, though tagged `optional`: they cost a line each, and the run rules require the bar answer and the flake hold. |
| 16 | folded | T5, with contract B1. |
| 17 | folded | T6, with contract M6. `CairnAdmin.svelte:45` and `auth-routes.ts:2,36` added. |
| 18 | folded | Plan Tasks intro and T3. Probed wider: `bake-template.mjs:227` also needs `dist`, so `npm run package` precedes every emit, as 1b's plan found. |
| 19 | folded | T2 names `github-credentials.test.ts`. `github-types.test.ts:22` already carries `repo`, so it needs nothing. |
| 20 | folded | T9 step 6 (docs gate), Tasks intro (draft PR after the first pair, and the CI verdict in each report). |
| 21 | folded | Tagged owner fork, ruled by the planner (2). |
| 22 | folded | Plan head: 420. |
| 23 | refused | `pass-core` asks for a host line from a pass that changes workstation config. This one changes none. |

## Contract and criteria

| # | Disposition | Where, or why |
|---|---|---|
| B1 | folded | T5, red and green stages. `:451` folds in. |
| B2 | folded | T1 acceptance: a section-scoped search, per term, rerun by T3. Run on the base: 15 of 17 terms miss. `__Host-` and `generateToken` hit because the section already names them. |
| B3 | folded | At the root with mechanics 1 and 2. |
| B4 | folded | T9 reordered, with the rerun rule and the smoke's commit in the PR. |
| M1 | folded | With mechanics 5. |
| M2 | folded | With mechanics 3 and 4. |
| M3 | folded | T3's pattern widened and rerun. Every hit file is on T3's or T4's list. `/members` became `/members/` and `\.\./members`, since a bare `/members` hits `/admin/team/members` fixtures and `create-cairn-site`'s routes. |
| M4 | folded | With mechanics 8, using this finding's search. |
| M5 | folded | T6: `KEPT` to `DEMOTED`, and `AuthBranding` also moves. Fixtures named. The grep excludes the barrel test, since `DEMOTED` names the old names on purpose. |
| M6 | folded | T6 "Write first". Verified against `factory-contracts.test.ts:85-90`. |
| M7 | folded | T3's first step, T7's "Write first". |
| M8 | folded | T9 steps 3 and 9. |
| M9 | folded | T5. `:115` becomes `insertEditor`. Verified at `:114-119`. |
| m1 | folded | T1 acceptance. `docs/admin docs/editors` replaces `docs`. |
| m2 | folded | T2 tests; Tasks intro for the red lines. |
| m3 | folded | T2 Outcome. |
| m4 | folded | T6 commit two. |
| m5 | folded | T6. Verified at `:184-202`. |
| m6 | folded | T8 acceptance. It reads added lines only: a read of the section passes on the base for five of the thirteen items. |
| m7 | folded | T3. Tagged `optional`, but it cost one sentence and settled an open reading. Verified at `:26,69`. |
| m8 | folded | T3 `dev-flag.ts:84`. `factory.ts:123` is the only reader. |
| m9 | folded | T9 step 7. |
| m10 | folded | Plan "Stops", Smoke. The script's step names match. |
| m11 | folded | Fell out of B2's rewrite. The fact stays as a sentence in T1. |
| m12 | folded | Fell out of the acceptance rewrite. `body:` never sat on the grep's output line, so the check was false. |
| m13 | folded | T4 acceptance. Anchor `nodesqlite-throws` verified at `:22`. |
| m14 | folded | Fell out of the T5 rewrite. |

## Data integrity and failure risk

| # | Disposition | Where, or why |
|---|---|---|
| 1 | folded | T2 and T8; design. `rotate-the-github-app-key.md`'s Recover gains a step ahead of step 3, which narrows to a status other than 422. The name differs from the proposal: see "Class name". |
| 2 | folded | Ruled by the planner (1). Design and T8. |
| 3 | folded | T1 carries the four facts and two corrections. `generateSessionId` isn't on `/auth-crypto`; `:210-211` quoted. |
| 4 | folded | T5 SQL, symptom row, and T8's line. `editor` columns verified at `0000_auth.sql`. D1's docs page says only "Refer to the source code for the full list of supported functions", so the fold read workerd's `ALLOWED_SQLITE_FUNCTIONS`, which lists `lower`, `trim`, and `unixepoch`. No new check, as proposed. |
| 5 | folded | T9's rerun rule, wider than `auth-data` paths. `INSERT OR REPLACE` in T9 step 5. |
| 6 | folded | With mechanics 3 and 4. |
| 7 | folded | With mechanics 8. |
| 8 | folded | T6, with the acceptance search and `make -C tool check`. `email.from` is the name `adopt-cairn.md:103` uses. |
| 9 | folded | With contract m8. The contract lens tagged it `correctness`, and the ledger's rule that wiring with no reader goes applies. |
| 10, T7 review | refused | Tagged `optional`, and `pass-core` puts `standards:diff-reviewer` on every `auth-data` task. One exemption costs more to reason about than the review. |
| 10, Metadata bullet | refused | Tagged `optional`. The bullet is an honest statement of what isn't proved, and it costs a line. |

## Probes behind new mechanisms

- GitHub REST, create an installation access token: fetched, with the quoted sentences and status table.
- `sed 's/localhost:8787/localhost:8788/'`: `smoke-pass3.mjs:22` is the script's only `localhost` address.
  `require` resolves through `ROOT`, so a copy under `/tmp` still finds Playwright.
- `wrangler d1 execute cairn-showcase-auth`: `admin-smoke-test.md:55` names the database by its
  `database_name`, and `wrangler.jsonc:31` gives it.
- `--inspector-port`: `playwright.config.ts` passes it for the same reason.
- `INSERT OR REPLACE`: `editor.email` and `session.id` are primary keys in `0000_auth.sql`.
- `ci-green <sha> --pr <n> --wait`: `cairn-pass` "CI watch".

## Path

T1 and T2 at 60, T3 and T4 at 120, T5 50, T6 60, T7 15, T8 40, T9 75: 420 against the ceiling of 480. The
fold added 135 to the 285 the old estimates gave, nearly all in T3's list and T9's order. Run one at a
time the tasks sum to 490, which is not the path.

## Owed

No erratum is owed on a ratified document. The sheet's line that `admin-signups` baselines leave with the
members code stays contradicted by the design note's call, which `## Decisions` carries, and 1a's overlap
line in the sheet and in `design.md` is narrower than 1b's real list. Both are planner-known and recorded
here only.
