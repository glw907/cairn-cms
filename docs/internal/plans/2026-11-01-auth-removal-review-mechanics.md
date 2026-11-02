# Mechanics and feasibility review: auth-removal plan (head 31611653b)

**Verdict: not ready to launch.** The scope is sound, and the pairs are disjoint by file. T3 and T5 cannot pass their own acceptance as written, and T3 would zero out the CI e2e suite. All of it folds into the plan text.

**Method:**
- Read-only against the worktree. Greps ran at head.
- One scratch Playwright probe ran in `/tmp`, since removed.
- GitHub's REST page was fetched.
- No gate was run, because the worktree has no `node_modules`.

## Your specific questions

| Question | Answer |
|---|---|
| Cited lines | Nearly all hold. I checked the T1, T2, T5 and T6 line cites and the sampled T3 cites, and they match apart from the misses in findings 3, 5, 6 and 19. |
| T1 and T2 disjoint | Yes. Each `emit:template` touches only its own copy. `guidance-hashes.json` is built at release, not by the emit. `MANIFEST` is unchanged. |
| T3 and T4 disjoint | By file, yes. T4's files are not emitted. Their acceptance is coupled, though (finding 5). |
| T3 grep passes | No (finding 5). |
| `log.ts` via `.cairn-template.json` | Works. `isExcluded` matches a file path, as `src/lib/env-check.ts` already does. Only `signups` and `members` import `#lib/log.js`, and no test expects it. `emit-template-dir.mjs:233` removes the destination, so the stale copy goes. The empty `src/lib` disappears in git. |
| `playwright.config.ts` | The edit itself is fine. The specs break (findings 1 and 2). |
| `smoke-pass3.mjs` | Runs as T9 says, with no `.dev.vars` needed. Pass 3 got 14/15 with the known FAIL. Root `package.json:294` carries `playwright`. Shared-state gaps are in finding 9. |
| Design's removal calls | All inside scope. Evidence: `slim.md:61,147,184,211` and the E2 "What goes" list (`channel-db.ts`). `insertOwnerIfEmpty` is dead after `bootstrapOwner`, so it fits the ruling that wiring with no reader goes. |
| `/admin/signups` | Correct on the facts: 10 baselines, and `custom-screen.spec.ts` drives the route. It contradicts the sheet's text, so it must appear in `## Decisions`, as the design says it will. |
| `card` | See finding 21. |

**Gates, by read:**

| Gate | Result |
|---|---|
| `check:template` | Pass |
| `check:package` | Pass |
| `check:surface` | Pass, with the listed `check-surface-reexports.json` cut |
| `check:options` | Pass. `CairnRuntime` is in `EXCLUDED_TYPE`. The new comment count is 29 pairs, 26 distinct. |
| `check:self-use` | Pass. Stale rows do not fail. |
| `check:tiers` | Pass |
| `check:public-skill` | Pass |
| `check:snippets` | Pass |
| `check:tool-conditions` | Pass, but it reads `dist` (finding 18) |
| `check:symbols` | **Fails** (finding 7) |
| `make -C tool check` | **Fails** (finding 3) |

## Findings, ranked by consequence

### Blockers

**1. blocker, correctness. T3 `:170`, `examples/showcase/e2e/capture-transport.spec.ts:2`.**
- The spec imports `../src/members/capture-transport.js`, which T3 deletes. The spec is not on any list, and the acceptance grep cannot see that name.
- Probe, on a copy of Playwright from a sibling worktree: one good spec plus one spec with a missing import gave `Error: Cannot find module`, exit 1, and the good spec never ran. So one file zeroes the whole e2e suite.
- `gate-table.json:232` also lists the spec, and T3 cites only `:29,185,273`.
- **Fold:** delete the spec and that gate row in T3. Its subject, the transport's refusal, leaves with the transport.

**2. blocker, correctness. T3, `examples/showcase/e2e/csrf-origin.spec.ts:11-40`.**
- The first two tests use `/members/login` as the probe for SvelteKit's Origin check, including the `'A code was sent.'` assertion. The spec is on the `authData` list (`gate-table.json:108-109`).
- The standing answer "a test outside this plan" would make the executor improvise on an `auth-data` proof, and only at CI.
- **Fold:**
  - Add it to T3's edits: retarget both tests to `/admin/login`'s form, using `input[name="email"]` as the same file's `signIn` helper does.
  - Assert 403 with `KIT_CROSS_SITE_BODY`, then 200 from the same host.
  - Delete `FACTORY_ORIGIN_FRAGMENT` (`csrf-helpers.ts:14-15`) and the comment that explains it.
  - The first test must still prove Kit's body. That check is what stops it passing vacuously.

**3. blocker, correctness. T3 and T5, Go gate.** `make -C tool check` is T3's acceptance, and two files are missing.
- `tool/internal/logs/events.go:55,78-90` is a hand-kept literal, pinned by `TestEventVocabularyMatchesEngine`. T3 must drop the 13 events and T5 must drop `editor.bootstrapped`. Until T5 lands, that one row stays.
- `tool/internal/doctor/testdata/golden/one-warning-failure.txt:14` holds the `conditions.ts:98` "member actions" sentence.
- **Fold:** add both to the lists. Add `make -C tool check` to T5's acceptance. T3's edit changes doctor copy, so add a `tool/CHANGELOG.md` `## Unreleased` line to T3 or T8.

**4. blocker, correctness. T3 `:177`, T5 `:292`, `src/lib/log/events-list.ts:61,84-96`.**
- `CAIRN_LOG_EVENTS` is a second list with a type-level assertion (`create.test.ts:219` says it fails `npm run check`). It is on the public surface.
- **Fold:** add it to both tasks. Also fix the cite: the block is `:92-107`, and `events.ts:8` uses `auth.channel.session.created` as its worked example.

**5. blocker, correctness. T3 acceptance `:235`: cannot print nothing.** Hits the plan does not list:
- `scripts/checks/check-leaks.mjs:216,497` and `src/tests/unit/check-leaks.test.ts:88`.
- `src/tests/unit/check-symbols.test.ts:316`. Swap in a dev export such as `createFakeR2`, so the `-dev` case still holds.
- `src/tests/unit/dev-fold-markers.test.ts:3` and `:36`.
- `src/tests/unit/emit-template-tree.test.ts:4`. This and `dev-fold-markers.test.ts:3` are URLs to the `pre-agent-first` specs with `auth-channel` in the path. Add a pathspec exclusion or reword the comments.
- `packages/create-cairn-site/src/cloudflare/config.test.mjs:11`.
- `.claude/skills/cairn-running-passes/SKILL.md:30` and `durable-gotchas.md:259,539`. These are T4's. T3 runs in its own worktree, so its acceptance fails there until the pair merges.

**Fold:** list the above in T3, and state that the grep runs after the T3 and T4 merge.

**6. blocker, correctness. T3 `:222`, `emit-template-tree.test.ts:86-89`.**
- `rosterContacts()` reads `src/members/channel.ts`, so the test throws, and `:112` asserts `contacts.length > 0`. The plan cites only `:113`.
- **Fold:** name both. Remove the roster helper. Keep `cairn-template:` and name a replacement token by hand.
- Do not swap in `APP_DB` blindly. `worker-configuration.d.ts` is regenerated only on the composed path, so verify it against `emitTemplate`'s tree first.

**7. blocker, correctness. T3 and T8, `check:symbols`.**
- `SCOPE` includes `MIGRATION-NOTES.md`. `:517` carries `node_modules/@glw907/cairn-cms/migrations-channel/0000_channel.sql`. `pathExists` strips that prefix and checks the repo path, which T3 deletes. By read, the docs gate goes red at T3.
- T8's notes will trip the same gate if they name `editor.bootstrapped`.
- T8's "same list" also omits the 13 `auth.channel.*` events and `editor.bootstrapped`, though the log vocabulary is public-observable. It omits `log.ts` leaving the scaffold too.
- 1b's plan `:390` met this trap and added allowlist entries.
- **Fold:** add `scripts/checks/check-symbols-allowlist.mjs` to T3 (`file-path:` entry) and T8 (`log-event:` entries, each with a reason). Add the events to T8's list. Add `npm run check:symbols` to T3's acceptance. T8 then touches `runner`, so note the class.

**8. blocker, correctness. T5 acceptance `:311`: cannot pass.** The plan allows only the docs anchor as an exception. Other hits on `auth-store`:
- `packages/cairn-cms-dev/src/fake-auth-db.ts:1`
- `src/lib/auth/store.ts:574`, which T5 misses (it cites only `:8,432`)
- `src/tests/integration/auth-store.test.ts:445`
- `src/tests/unit/check-package-files.test.ts:245-247`, a synthetic fixture
- `src/tests/unit/check-self-use.test.ts:28`
- `src/tests/unit/conditions.test.ts:87`

Outside the grep's paths, `check-self-use.mjs:31,51` goes stale.

**Fold:**
- Tighten the grep to `/auth-store|auth-store/index|cairn-cms/auth-store`, or list every line.
- Add the `store.ts:574` edit.
- Have T3 drop both words at `check-self-use.mjs:31,51` in one edit.

**9. blocker, correctness. T9 step 4 and T4, smoke against shared state.**
- `smoke-pass3.mjs` hard-codes `http://localhost:8787`. The ledger has five worktrees active: `audit-trim`, `audit-trim-run`, `wiring-core`, `field-values`, `tidy-lists`. If another session's worker holds 8787, the script's first step passes on any status, and the admin checks then read that session's engine. A pass recorded that way proves the wrong code.
- `admin-smoke-test.md` step 4 also says `pkill -f workerd`, which kills other sessions' workers and exceeds the allow line.
- **Fold:**
  - Have T9 require a free port first, for example `ss -ltn 'sport = :8787'` prints no listener. If it is held, wait or free nothing and retry once the holder exits. The script takes no port argument, so this is the rerun rule.
  - Confirm the new server's log says Ready.
  - Have T4 replace the `pkill` with stopping only the session's own PIDs.

**10. blocker, correctness. Plan `:64`, "Overlap with 1b: `gate-table.json` and `api-surface.md` only".**
- 1b's plan, read from `origin/audit-trim`, also edits `examples/showcase/.cairn-template.json` (T3 edits it too), root `package.json` scripts, `claude/CLAUDE.md` (`:33-34`, different hunk), `BACKLOG.md`, `CHANGELOG.md`, `MIGRATION-NOTES.md`, and `check-symbols-allowlist.mjs`.
- Ledger merge order is 1b, then 1a, but 1b's plan `:52` also carries a "Pass 1a merges first" branch. So plan for merging `main`, not "if".
- "A pair merge conflicts means a task left its file list" does not cover this.
- **Fold:** replace the sentence with the real list, a merge-keep-both rule for each file, and this rerun sequence, each command written in full: `npm run emit:template`, `npm run check:surface -- --update`, `npm run lane:fast -- --range <base>..HEAD`.

### Majors

**11. major, correctness. T2, `repository_not_covered`.**
- GitHub's page also says "The installation access token cannot be granted permissions that the app was not granted", and 422 is the only validation status it lists. So an App without `contents: write` would plausibly read as an uncovered repository.
- **Fold:** keep the name. Have T2's sentence in `rotate-the-github-app-key.md` and `log-events.md` name both causes.
- `repo` as a bare name holds: the showcase uses `repo: 'demo'`, and the docs example is `Hello-World`.

**12. major, correctness. T3 `:197-205`, unlisted stale references.** The acceptance regex misses these, so the T3 outcome "no reference to either" is false without them:
- `examples/showcase/README.md:28`
- `examples/showcase/scripts/capture-surfaces.mjs:7,295`
- `scripts/build/emit-template.mjs:170`
- `src/lib/sveltekit/csrf.ts:2`
- `csrf-helpers.ts:14`
- `src/tests/unit/audit/fixtures/theme/stale-tokens.css:22`, which I did not trace. Name a leave-or-update answer.

**Fold:** list them, or widen the acceptance with `auth channel|members fixture|src/members`.

**13. major, correctness. Stops without a cheap-case answer (`:15,:25-26,:52-53`).**
- A refusal on `claude/agents/cairn-extension-reviewer.md` stops the line for one sentence. **Fold:** finish everything else, exclude that file and its template copy from the grep, record the owed one-line edit in `docs/STATUS.md`, and let `cairn-cms-9b` land it. The line stops only if the conductor cannot land it. Or exercise that write before launch, as the sheet's pre-launch check requires.
- The smoke's "any other failure stops the line" has no setup-cause rule. **Fold:** a failure traced to setup (seed, migration, port, stale build) is fixed and rerun once. Only an engine failure stops the line.

**14. major, correctness. T9 step 4, live commands not written out.**
- The smoke sequence is the prelude to a step that repeats after fixes. Per the checklist it needs the full commands inline. The two flags that matter are 8787 and the ids.
- **Fold:** write out in T9, and match in T4:
  - `npm run package` at the root
  - `npm run build` in `examples/showcase`
  - `npx wrangler d1 migrations apply AUTH_DB --local`
  - both seed `INSERT`s with `smoke4@example.com`
  - the `smoke-owner` session `INSERT` with `expires_at` 4070908800000
  - `npx wrangler dev --port 8787`
  - the script line

**15. major, optional. Standing answers the run needs.**
- **Bar unreachable:** no line says which items still run. **Fold:** docs and CHANGELOG tasks finish, nothing merges, and STATUS reports the bar unmet. Skip reruns of a traced cause.
- **E2e flake hold:** the ledger's `## Conductor state` holds 1a's executor until the flake is fixed or filed. Pre-flight does not carry it.
- **`update_snapshots` dispatch:** it is an auto-mode-relevant action, and it is not named in Pre-flight.
- **Out-of-worktree script:** T9 runs a script from `~/.local/state`. Pre-flight should name it, since the isolated-session hook refused several compound commands during this review.

### Minors

**16. minor, correctness. T5 `:281`, red-first proof.** "An unknown email on an empty table inserts no row" passes on the base unless the fixture sets `bootstrapOwner`. **Fold:** name that fixture, cast it as removed config, and state that it is red on the base.

**17. minor, correctness. T6 `:329`.** Vitest does not type-check, so the "type error" test goes red only under `npm run check`. Name that as the red proof and use `@ts-expect-error`, per the file's own convention. Also add `CairnAdmin.svelte:45` and `auth-routes.ts:2,36`'s prose to the list.

**18. minor, correctness. T3 `:182`.** `emit-tool-conditions.mjs` reads `dist/diagnostics/conditions.js`, so state `npm run package` first.

**19. minor, correctness. T2 file list.** Name `src/tests/unit/github-credentials.test.ts`, whose `:13` `toEqual` breaks. Check `github-types.test.ts:22`, and name the literals `npm run check` will flag. No surface update is needed: neither type is in `api-surface.md`.

**20. minor, correctness. T9.**
- There is no `npm run check:docs-gate` after step 3's fixes or before the last commit, which the close must have.
- No step opens the draft PR that CI needs.
- The executor prompt is not committed yet, and the plan has no line making each accepted-task report name the CI verdict on that head.

**Fold:** add all three, or put them in the prompt.

**21. minor, optional, OWNER FORK. T3 `:218`, `card`.** After T3, no route uses `.card`, and `tokens.css:21-22` says the set is "scoped to what the public template genuinely renders". The ledger says a keep with no reader is a candidate listed for Geoff.
- **Options:** (a) keep and list it, or (b) exclude `card` now.
- **Recommendation:** (a). List it in `## Decisions` and take it at pass 8, since the design's reason (it would change scaffolded CSS for no gain this pass) stands.
- Whichever is chosen, rewrite the "genuinely renders" sentence too, or it contradicts the keep.

**22. minor, optional. Plan `:8`.** Task estimates sum to 335, or 285 with both pairs parallel. The plan says 295. Findings 1 to 8 add to T3, so restate it. It stays under 480.

**23. minor, optional. Pre-flight.** It has no line stating what each host gets. Add "No workstation config change; neither host gets anything."

## Checked, no finding

- Pre-flight's "Geoff's steps: none" holds across all nine tasks.
- No task writes settings, hooks, `autoMode`, permissions or memory.
- `.claude/skills/**` and `claude/CLAUDE.md` are under the allow line.
- T1's hook order holds: `grep -c cairnAuditSink` on `guard.ts` prints 0, and `custom-screen.md:172` is the only reversed site.
- `verifyTurnstile` stays on `/cloudflare`.
- All engine GitHub routes are `git/*`, `contents`, or `commits`.
- No over-ceremony worth cutting.

**Files:**
- `/var/home/glw907/Projects/cairn-cms/.claude/worktrees/auth-removal/docs/internal/plans/2026-11-01-auth-removal-plan.md`
- `/var/home/glw907/Projects/cairn-cms/.claude/worktrees/auth-removal/docs/internal/plans/2026-11-01-auth-removal-design.md`
