# Auth removal plan: contract and criteria review

Lens: is every promise testable, does each criterion name its fixture and failure reason, and can any
criterion pass vacuously. Reviewed at `31611653b`. Every grep was run against that tree. No test was
run, since this worktree has no install. Lines marked `plan:` are in
`docs/internal/plans/2026-11-01-auth-removal-plan.md`.

Count: 4 blocker, 9 major, 14 minor. No finding is an OWNER FORK. Each resolves inside the approved
scope.

## Blockers

### B1. T5's replacement test cannot be both red first and clean under T5's grep

- **Severity:** blocker. **Tag:** `correctness`.
- **Location:** plan:281-283, plan:311, plan:316; `src/tests/integration/auth-request.test.ts:451-455`.
- **Defect:** the test is "a request for an unknown email on an empty `editor` table inserts no row and
  sends nothing, whatever the config". With no `bootstrapOwner` in the config, the base already behaves
  this way, and `:451` already pins it, so the test is green on the base. It goes red only if it passes
  a matching `bootstrapOwner`. That name then fails T5's grep and `npm run check`, since the option is
  gone. An `auth-data` task's failing test is therefore either vacuous or unreachable. "Whatever the
  config" names no fixture either.
- **Fold:** state the two stages. Red stage: add the case with `createAuthRoutes({ branding,
  bootstrapOwner, send })` and the matching email on an empty table, and run it red on the base (one row
  inserted, one message sent). Green stage: drop the option in the same commit, so the case keeps a plain
  config, and assert `countRows('editor') === 0` and an empty sink. Paste the red line into the commit
  body. Say that `:451` folds into this case.

### B2. T1's acceptance cannot see the points #189 exists to add

- **Severity:** blocker. **Tag:** `correctness`.
- **Location:** plan:111-113; `BACKLOG.md:171-172`; `second-sign-in-group.md:47-84`.
- **Defect:** "#189 first" gates the whole removal, and the design promises a recipe "with no known gap".
  The check has three holes.
  - Fixation, logout deleting the server row, and one response for an unknown contact are three of
    #189's four points, and no search term covers any of them. The eight search terms are five facts, four
    terms of them the cookie line, not the eight bullets at plan:90-102.
  - Five of the eight terms already hit on the base: `__Host-`, `migrations_dir`, `cairn_`,
    `verifyTurnstile`, and `attempt`.
  - The search is file-wide, and the Channel section stays until T3, so a term in the old section
    passes. T3 then deletes that section and nothing re-checks.
- **Fold:** scope the check to the section with `sed -n '/^## Rolling your own/,/^## Server-only/p'
  <file>`, and require each of these eleven terms on that extract by its own `grep -q`: `fresh`,
  `HttpOnly`, `SameSite`, `Max-Age`, `__Host-`, `server-side row`, `byte-identical`, `migrations_dir`,
  `cairn_`, `verifyTurnstile`, `attempt`. T1 fixes those exact words in the bullets. T3's acceptance
  reruns the same lines.

### B3. T3 leaves two e2e specs on the deleted fixture, and one of them pins a surviving security path

- **Severity:** blocker. **Tag:** `correctness`.
- **Location:** plan:170, plan:203, plan:240; `examples/showcase/e2e/capture-transport.spec.ts:2`;
  `examples/showcase/e2e/csrf-origin.spec.ts:10-40`; `examples/showcase/e2e/csrf-helpers.ts:14-15`;
  `scripts/checks/gate-table.json:232`.
- **Defect:**
  - `capture-transport.spec.ts` imports `../src/members/capture-transport.js`, which T3 deletes. The plan
    names neither the spec nor its gate-table row at `:232`, and a spec that fails at import makes
    Playwright report a collection error, so green CI on the head is unreachable as written.
  - `csrf-origin.spec.ts`'s first two tests use `/members/login` as the probe for SvelteKit's framework
    Origin check. That check survives. The spec is in the `authData` set at `gate-table.json:109`, and
    these two tests are its only proof that a cross-host form POST gets Kit's exact refusal body. The
    plan's standing answer says a failing test "pins old behavior", which invites deleting them.
  - T3's grep sees neither file, because neither contains a banned name.
- **Fold:** add to T3:
  - Delete `capture-transport.spec.ts` and `gate-table.json:232`. It tests only the deleted transport.
  - Repoint the first two `csrf-origin.spec.ts` tests at `/admin/login`, which the same spec already
    drives (`input[name="email"]`, "Send sign-in link"). Keep the `KIT_CROSS_SITE_BODY` assertion as
    the failure reason.
  - Rewrite the comment at `:10-13`, and delete `FACTORY_ORIGIN_FRAGMENT` and its two assertions,
    since no cairn origin refusal remains.

### B4. T9's order lets the PR go ready with CI and the smoke on an older head

- **Severity:** blocker. **Tag:** `correctness`.
- **Location:** plan:403, plan:406, plan:409-412, plan:416-419, plan:423-424.
- **Defect:**
  - Step 2 runs CI. Step 7 then adds a commit, and step 8 marks the PR ready. No step waits for CI on
    that commit, though the acceptance demands the final head.
  - "The last two steps repeat if a fix lands" names steps 7 and 8, and neither is CI, the smoke, or the
    security read. Step 6's fix chain reruns the lane, CI, and the reader, but not the smoke, so a fix to
    `auth-routes.ts` merges on a smoke of the code before it.
  - The smoke's PR record carries no commit, so the conductor cannot tell which head it proved.
- **Fold:** reorder to fetch, review, fix chain, smoke, delete plan files, CI watch on that head, ready.
  Replace the sentence at plan:403 with: "A fix to anything under `src/lib` or `examples/showcase` after
  the smoke reruns the smoke. Any new commit reruns CI." Record the smoke's `git rev-parse HEAD` above its
  output. The plan-deletion commit touches no code, so the smoke's commit may be its parent, and the body
  says so.

## Major

### M1. T3's grep cannot go empty on the plan's edit list

- **Severity:** major. **Tag:** `correctness`.
- **Location:** plan:234-235, plan:73.
- **Defect:** the grep's 83 hit files include these the plan never edits:
  `scripts/checks/check-leaks.mjs:216,497`, `src/tests/unit/check-leaks.test.ts:88`,
  `src/tests/unit/check-symbols.test.ts:316`, `packages/create-cairn-site/src/cloudflare/config.test.mjs:11`,
  and `src/tests/unit/emit-template-tree.test.ts:4`.
  Two hits survive legitimately. `emit-template-tree.test.ts:4` is a pinned `pre-agent-first` permalink,
  and `check-symbols.test.ts:316` is a parser fixture that only needs some dev-package name.
  T3 also pairs with T4, which owns `.claude/skills/cairn-running-passes/SKILL.md:30` and
  `durable-gotchas.md:259,489,539`, so the check cannot pass in T3's own worktree.
- **Fold:** add the four real edits to T3 and swap the fixture's name for a surviving dev export. Name
  the one survivor in the acceptance ("prints only `emit-template-tree.test.ts:4`, a permalink"). State
  that the grep runs after the T3 and T4 pair merges.

### M2. T3 and T5 leave the log vocabulary out, and the Go tool's test fails on it

- **Severity:** major. **Tag:** `correctness`.
- **Location:** plan:177-178, plan:292; `src/lib/log/events-list.ts:61,84-96`; `src/lib/log/events.ts:8`;
  `tool/internal/logs/events.go:55,78-90`.
- **Defect:** the plan edits `events.ts` only. `events-list.ts` carries the same 14 names, and it is the
  source of the public `CAIRN_LOG_EVENTS`. `events.go` is held in step by
  `TestEventVocabularyMatchesEngine`, so T3's own `make -C tool check` goes red. T5 has no tool check at
  all, so its `editor.bootstrapped` row reaches CI. `events.ts:8` uses
  `auth.channel.session.created` as its worked example, which outlives the event.
- **Fold:** add `events-list.ts`, `events.go`, and the `events.ts:8` comment to T3, and the two
  `editor.bootstrapped` rows to T5. Add `make -C tool check` to T5's acceptance. Load
  `standards:go-conventions` for T5.

### M3. T3's outcome promises no members fixture, and its grep cannot test that

- **Severity:** major. **Tag:** `correctness`.
- **Location:** plan:159, plan:235.
- **Defect:** the pattern has no `members` term and no `auth\.channel`, because `auth-channel` does not
  match the dotted form. Residue it cannot see: `examples/showcase/README.md:28`,
  `examples/showcase/scripts/capture-surfaces.mjs:7,295`, and everything in M2 and B3.
- **Fold:** add `auth\.channel\.`, `/members`, `src/members`, and `migrations-members` to the pattern,
  with `':!scripts/checks/check-symbols-allowlist.mjs'` for the retired `delivery_inline` row. Add the two
  showcase files to T3's list.

### M4. T5's grep is unreachable as written

- **Severity:** major. **Tag:** `correctness`.
- **Location:** plan:311-312.
- **Defect:** "no hit except the docs anchor" fails on hits the plan leaves.
  - Survive legitimately: `src/tests/unit/conditions.test.ts:87` (prose about the auth store),
    `packages/cairn-cms-dev/src/fake-auth-db.ts:1` (same), `src/tests/unit/check-package-files.test.ts:245-247`
    (an inline exports fixture), and `src/tests/unit/check-self-use.test.ts:28` (a path predicate fixture).
  - Need an edit the plan omits: `src/lib/auth/store.ts:574`, `src/tests/integration/auth-store.test.ts:445`,
    and `src/lib/log/events-list.ts:61`.
  - The pathspec also misses `tool/`, and `auth-store` repeated beside `/auth-store` adds nothing.
- **Fold:** add the three edits. Use `-E "bootstrapOwner|insertOwnerIfEmpty|editor\.bootstrapped|/auth-store"
  -- src skills claude package.json packages tool ':!src/tests/unit/check-package-files.test.ts'
  ':!src/tests/unit/check-self-use.test.ts'`, which prints nothing, since the anchor has no leading slash.

### M5. T6's grep hits two files the task never names, and one needs a specific move

- **Severity:** major. **Tag:** `correctness`.
- **Location:** plan:341-343, plan:351-357, plan:360; `src/tests/unit/sveltekit-barrel-prune.test.ts:48`;
  `src/tests/component/LoginPage.test.ts:46`.
- **Defect:** `RequestOutcome` sits in the `KEPT` list, which reads `dist` inside an `it()`, so
  `npm run check` cannot see it. `durable-gotchas.md:511-514` says a retired name moves to the demoted list
  with its "no longer resolves" assertion, never a plain delete. A rename to `LoginRequestOutcome` also
  needs the new name in `KEPT`. `LoginPage.test.ts:46` is a comment hit. Commit two also names only
  `auth-request.test.ts`, while `sent:` fixtures sit in `LoginPage.test.ts` (12), `CairnAdmin.test.ts` (1),
  and `cairn-admin-actions.test.ts` (2).
- **Fold:** add those files to commit two, with the `KEPT` and demoted move spelled out.

### M6. T6's "a branding key is a type error" names no red command, and its directive is green on the base

- **Severity:** major. **Tag:** `correctness`.
- **Location:** plan:329-330, plan:364; `src/tests/unit/factory-contracts.test.ts:41-59,86-92`.
- **Defect:** this repo pins a type error with a described `// @ts-expect-error` inside an uncalled
  `typeOnly...` function in `factory-contracts.test.ts`. `npm run check` enforces it, because `tsconfig.json`
  includes `src/tests/**`. Vitest never does, so a Vitest run of this test cannot go red.
  `// @ts-expect-error` on `createAuthRoutes({ runtime, branding })` is also satisfied on the base,
  because `runtime` is the excess key there. Only the positive line goes red, through the missing
  `branding`.
- **Fold:** write: "Change `typeOnlyAuthRoutesContract` to take `runtime`, add the positive call and a
  described `@ts-expect-error` on `createAuthRoutes({ runtime, branding: {...} })`. Red is `npm run check`
  failing on the positive line. The directive proves the after state only."

### M7. T3 and T7 are `auth-data` tasks with no failing test first

- **Severity:** major. **Tag:** `correctness`.
- **Location:** plan:240, plan:379.
- **Defect:** each `auth-data` task writes a failing test first. T3's is "the suites that remain" and T7's
  is "the existing block", and both are green on the base by construction.
- **Fold:** no new test file is needed.
  - T3: run the acceptance's `node -e` import first, and record that the base does not throw
    `ERR_PACKAGE_PATH_NOT_EXPORTED`.
  - T7: change `auth-crypto-exports.test.ts:12` first and run it red, since the base exports `tokensMatch`.

### M8. Two merge conditions cannot be checked from what T9 leaves in the PR

- **Severity:** major. **Tag:** `correctness`.
- **Location:** plan:413-415, plan:419-420, plan:423-424.
- **Defect:**
  - Step 5 says `standards:diff-reviewer`, "loading" the checklists, which include
    `standards:web-auth-security-reviewer`. That agent has no way to dispatch another, so this reads as
    a checklist, not the read Geoff's word names.
  - The body carries "the security verdict" only. "Folded" and "no open finding" need the findings and
    each one's disposition. `pass-core` also requires each `auth-data` verdict in the body, which covers
    T2, T3, T5, T6, and T7.
- **Fold:** step 5 dispatches `standards:web-auth-security-reviewer` as its own agent on the branch.
  The body lists each finding with its severity, its fix commit, and the reread's verdict, plus one line
  per `auth-data` task verdict. Checkability after the T9 folds:

  | Condition | Evidence | State after folds |
  |---|---|---|
  | Green CI on the head | `ci-green <sha> --pr <n>`, which the conductor can rerun | Checkable once B4 lands |
  | Folded security read, no open finding | The findings table | Checkable once this lands |
  | Live admin smoke | Output plus commit | Checkable once B4 lands |

### M9. T5 deletes a test that also pins surviving store paths

- **Severity:** major. **Tag:** `correctness`.
- **Location:** plan:288-290; `src/tests/integration/auth-store-roles-unmigrated.test.ts:114-119`.
- **Defect:** `:115` is one line of "leaves writes the owner/editor CHECK admits unrouted and working".
  The rest pins `insertEditor`, `setEditorRole`, and `demoteOwnerIfNotLast` on the unmigrated schema.
  The plan lists it among `insertOwnerIfEmpty`'s tests to delete, and that would drop the coverage.
- **Fold:** change `:115` to `await insertEditor(db, 'boss@x.dev', 'Boss', 'owner', 1);` and keep the
  test. The other named lines, `auth-store.test.ts:230-255,478`, test only the removed function and may go.

## Minor

### m1. T1's guard grep hits the plan itself, and a wrong edit passes

- **Severity:** minor. **Tag:** `correctness`.
- **Location:** plan:109-110.
- **Defect:** `docs` in the pathspec matches plan:106, which has a handle after the guard, so the stated
  result is false until T9 deletes the plan. A multi-line `sequence(` would pass unseen, and nothing
  asserts the new order is present.
- **Fold:** add `':!docs/internal/**'`, and add `git grep -q 'sequence(wireAuditSink, createAuthGuard' --
  skills/cairn-building-admin-screens/references/custom-screen.md`.

### m2. T2's tests are sound, but one fixture is open and one test is unnamed

- **Severity:** minor. **Tag:** `correctness`.
- **Location:** plan:129-133, plan:125, plan:152.
- **Defect:** all three fail on the base for the right reason, given the right fixtures. The body test
  sees no `body`, the cache returns the first repository's token, and 422 reads `unreachable`. The fourth
  case, "two repositories get separate verdicts", passes on the base if both mints return the same status,
  since the shared verdict then matches. "The test that covers `appCredentials`" is
  `src/tests/unit/github-credentials.test.ts:13`. "Fail on the base" leaves no record.
- **Fold:** specify 201 for one repository and 422 for the other within the verdict window, and assert two
  fetches and two different results. Name the credentials test. Put the red lines in the commit body, and
  do the same in T5 and T6.

### m3. T2's outcome promises more than the task builds

- **Severity:** minor. **Tag:** `correctness`.
- **Location:** plan:119-120; `docs/admin/rotate-the-github-app-key.md:114`.
- **Defect:** "a mint refused for an uncovered repository names that" holds for `/healthz?live=1` only. A
  save or a shell read still surfaces `InstallationTokenError` with a bare status. The design note already
  says `/healthz`.
- **Fold:** end the outcome with "and `/healthz?live=1` names a refused mint for an uncovered repository".

### m4. T6's component check passes on the base and leaves the removal unpinned

- **Severity:** minor. **Tag:** `correctness`.
- **Location:** plan:361-362.
- **Defect:** `LoginPage.test.ts` already has `{ outcome: 'sent', sent: true }`, and that fixture still
  passes if `sent` stays. Nothing shows the `|| form?.sent` branch went.
- **Fold:** drop `sent` from that fixture, and add one case: `form: { sent: true }` alone shows the email
  form. It is red on the base.

### m5. T6 can lose the only route-level pin on the sender

- **Severity:** minor. **Tag:** `correctness`.
- **Location:** plan:341-344; `src/tests/unit/cairn-admin-actions.test.ts:184-202`.
- **Defect:** this is the one test asserting `from`, `replyTo`, and subject through the routes. It looks
  like an `auth.branding` override test, so it reads as removable.
- **Fold:** name it: set `runtime.siteName` and `runtime.sender`, and keep the `toEqual`.

### m6. T8's count passes with the wrong lines

- **Severity:** minor. **Tag:** `correctness`.
- **Location:** plan:385-388, plan:396-397.
- **Defect:** the base count is 270, and nine generic lines pass. Nothing checks the `BACKLOG.md` moves.
  The list also omits the removed log events, which are public through `CAIRN_LOG_EVENTS`, and
  `createAuthRoutes`'s new required `runtime`.
- **Fold:** grep the `## Unreleased` section for each named item, and add the two lines. If
  `MIGRATION-NOTES.md` writes `editor.bootstrapped` in code voice, add a `log-event:` row to
  `check-symbols-allowlist.mjs`, as `:51` does, and add that file to T8.

### m7. T3 leaves a settled question open on `worker-wait-until.test.ts`

- **Severity:** minor. **Tag:** `optional`.
- **Location:** plan:192-193; `src/tests/unit/worker-wait-until.test.ts:1-5,68-92`.
- **Defect:** the D1 audit sink half tests a surviving path, so deleting the file loses it. The question
  needs no conditional.
- **Fold:** "Cut the channel half and its imports, keep the `createD1AuditSink` block, and reword the
  header."

### m8. T3 leaves `isDeployedHost` with no reader and no test

- **Severity:** minor. **Tag:** `correctness`.
- **Location:** plan:186-187; `src/lib/dev-flag.ts:84`; `src/lib/sveltekit/csrf.ts:31`.
- **Defect:** `auth-channel/factory.ts` is its only production reader, and
  `auth-channel-dev-backend-tripwire.test.ts` is its only test. T3 treats `dev-flag.ts` as comments only,
  so a security predicate stays dead and untested, against the ledger's "wiring with no reader goes".
- **Fold:** delete it with its doc, and fix the mentions at `dev-flag.ts:39,58` and `csrf.ts:31`.

### m9. T9 checks for pass 1b once

- **Severity:** minor. **Tag:** `correctness`.
- **Location:** plan:405.
- **Defect:** 1b can merge after step 1, which moves the head after CI.
- **Fold:** fetch again before the deletion commit, and rerun CI if `main` moved.

### m10. The known smoke FAIL is matched by name alone

- **Severity:** minor. **Tag:** `correctness`.
- **Location:** plan:52.
- **Defect:** the step's FAIL text would also cover a real failure on the same step.
- **Fold:** the allowance holds only if the FAIL's URL ends `?error=no-pending-request` and the next step,
  "that second context holds no session", is PASS.

### m11. Over-ceremony: T1's `cairnAuditSink` count

- **Severity:** minor. **Tag:** `optional`. **Cost:** one command per run, plus a false sense of proof.
- **Location:** plan:110.
- **Defect:** it prints 0 on the base and cannot change. The real reader is `admin-action.ts:310`.
- **Fold:** cut it. Keep the fact as one sentence in the task body.

### m12. Over-ceremony: T2's `access_tokens` grep

- **Severity:** minor. **Tag:** `optional`. **Cost:** a hand read of a multi-line call.
- **Location:** plan:152-153.
- **Defect:** the output is the `fetch(` line, which never carries `body:`, and the first new test proves
  the body. Its one use is showing a single mint site, and that is already true.
- **Fold:** cut it.

### m13. Over-ceremony: T4's dead exception

- **Severity:** minor. **Tag:** `optional`. **Cost:** a judgment call on every read of the output.
- **Location:** plan:267-268.
- **Defect:** the grep's four hits are all T4's own, so "except what T3 owns" excuses nothing and could
  hide a miss. The index-line check names no command.
- **Fold:** "prints nothing". Add `grep -c 'nodesqlite-throws' <durable-gotchas.md>` prints 0.

### m14. Over-ceremony: T5's trailing checks

- **Severity:** minor. **Tag:** `optional`. **Cost:** two commands that the barrel test replaces.
- **Location:** plan:313-314.
- **Defect:** `editors-routes.ts:11` already imports from `../auth/roles.js`, and T5 does not touch it. The
  `DEMOTED` entry in `root-barrel-prune.test.ts` proves the barrel line left.
- **Fold:** cut both.

## Checked and sound

- T3's `node -e` import is a good check once the setup command has run. `npm ci --prefix examples/showcase`
  points the showcase at this worktree, and only a missing `exports` entry gives that error code. Before
  the setup command it gives `ERR_MODULE_NOT_FOUND`.
- `AppCredentials.repo` is a bare name, not `owner/name`, in `createGithubApp` and the fixtures, so
  `repositories: [repo]` matches the API's shape.
- `installationToken` has two callers, and both get `repo` through `appCredentials` or the health literal,
  which the required type field holds.
- T7's grep and file list match the tree. `verifyTurnstile` loses its showcase mention but stays on the
  self-use allowlist at row `:96`.
- `/admin/signups` holds no members code, so keeping its baselines is a sound call, and the design note
  discloses it.
