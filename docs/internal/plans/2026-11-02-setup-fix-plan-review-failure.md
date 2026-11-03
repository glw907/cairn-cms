# setup-fix plan review: data integrity and failure risk

Lens: crash, concurrency, partial write, upgrade, restore. Target: `2026-11-02-setup-fix-plan.md` at
`d67f3bdb1`, read against the source in this worktree. The design's conductor calls, revision 1, and
standing answers are taken as ruled. Counts: 1 blocker, 10 major (one an OWNER FORK), 8 minor.

## Blocker

### B1. Teardown's "build token registration" can only be found by a name every production site shares

- **Severity:** blocker. **Tag:** correctness.
- **Location:** plan:536-540 (`teardown.mjs`); `src/cloudflare/chapter3.mjs:95`, `:1089-1100`.
- **Defect:** the plan has teardown delete "the Builds trigger, repo connection, and build token
  registration" and also delete "only names starting `cairn-e2e-gate-`". The build token
  registration is named `cairn create-cairn-site build token` (`chapter3.mjs:95`), the same name on
  every site this tool ever connected on Geoff's account. It never carries the prefix. Chapter 3
  also reuses a registration by `cloudflare_token_id` (`:1090-1092`), so installs A and B share one.
  An implementer who resolves the contradiction by name deletes production sites' build tokens, and
  every production Builds deploy then fails. One who keeps the prefix rule leaves the gate token's
  secret stored in Workers Builds for good, since `createBuildToken` uploads it (`:1094-1098`).
- **Fold:** state the identity rule per resource. The build token registration is deleted only
  where `cloudflare_token_id` equals the gate token's own id, read from
  `accounts/<id>/tokens/verify`, and never by name. The trigger and connection are deleted by the
  uuids in the install's state record, after a check that the trigger's Worker and the connection's
  repository carry the prefix. Add a teardown test: a registration with the production name and a
  different token id is never deleted.

## Major

### M1. "The hash differs from the last deploy's" names a field that does not exist

- **Severity:** major. **Tag:** correctness.
- **Location:** plan:262-269; `chapter3.mjs:243-245`, `:859-865`.
- **Defect:** the plan records `buildsReconciledHash` as soon as the commit lands, then on a re-run
  kicks a build when the reconcile finds nothing to commit "and the hash differs from the last
  deploy's". No record field holds a last-deployed hash. `performReconcile` returns
  `{ changed: false }` without reading GitHub whenever the disk hash equals `buildsReconciledHash`.
  The existing `builds-live` re-entry shows where that leads: after a failed build it prints
  "Nothing to reconcile" and returns `builds-live` (`:861-865`). Without a named field, the
  implementer either kicks on every re-run, adding a build to each email re-run, or never kicks. If
  it never kicks, a failed cutover re-run writes `domain-live` while the live Worker still runs the
  workers.dev origin. The run reports success, and the origin is wrong until the next publish.
- **Fold:** name the field, for example `cloudflare.buildsDeployedHash`, written only after a
  watched `success`, in the same `updateSite` that writes `buildsLastBuildOutcome`. The kick rule
  becomes: the disk hash equals `buildsReconciledHash` and differs from `buildsDeployedHash`. Add the
  crash points to T2's acceptance, each a test:
  1. A crash after the ref PATCH and before the hash write. The re-run's diff finds no change, and
     the deployed hash differs, so the run kicks one build.
  2. A crash after the hash write. The re-run kicks one build.
  3. A crash after a watched success and before the step write. The re-run kicks nothing and still
     reaches `domain-live`.

### M2. The cutover failure row tells the owner the origin was restored when it was not

- **Severity:** major. **Tag:** correctness.
- **Location:** plan:265-268, plan:242-245 (Files); `catalogue.mjs:506-531`;
  `hostname.mjs:384-400`.
- **Defect:** on the Builds path, the plan throws `cutover-deploy-failed` "with that detail" and
  skips the restore. The row's `detail` branch prints "The tool already restored your site's
  address on disk back to its workers.dev one, so ... nothing is half-changed" (`catalogue.mjs:528`).
  That is false on this path: the repository now names the domain, and the next publish deploys it.
  T2's file list names only the `paid-plan-declined` row. A second gap: the plan's reason for
  skipping the restore, "the repository already carries it", is false when the reconcile itself
  fails before the commit lands. The OAuth trip can be declined, the ref PATCH can be refused
  (`reconcile.mjs:135-137`), or GitHub can return a 5xx. The plan doesn't say whether that failure
  restores the origin.
- **Fold:** add the `cutover-deploy-failed` row to T2's files, with a Builds variant (a
  `buildsCommitted` parameter). The variant says the repository already names the domain, the next
  successful build serves it, and a re-run watches that build. Restore the origin on disk exactly
  when the commit did not land, and skip the restore once it did. The build-failure acceptance
  (plan:324-327) asserts that stdout does not contain `restored`.

### M3. The reconcile commits whole local files over the repository's copies

- **Severity:** major. **Tag:** correctness.
- **Location:** plan:255-259; `reconcile.mjs:96-133`.
- **Defect:** `reconcileRepo` commits the owner's local `wrangler.jsonc` and
  `src/theme/cairn.config.ts` whole whenever either differs from the repository. Today that runs at
  `--connect` time, close to the first push. T2 makes it the routine path for a domain or email
  change that can come weeks after Builds went live. By then a developer may have edited either
  file through GitHub or another clone: adapter config, media, editor settings, or bindings. The
  commit silently reverts those edits, Builds deploys the revert, and nothing reports it. The same
  commit also ships any uncommitted local edits in those two files.
- **Fold:** on a Builds record, chapter 2's hop compares the repository's copy with the local copy
  before committing. Mask only the lines the tool owns (`PUBLIC_ORIGIN`, `publicOrigin`, and
  `email.from`). If anything else differs, stop with an act row that says the repository has
  changes this checkout lacks and that `git pull` should run first. This is a validation at an
  external boundary, so it stays inside the pass-core sample. Add one acceptance test: the fake
  GitHub's `cairn.config.ts` carries an extra line, so no commit lands and the row names the file.

### M4. `--connect` mid-chapter-2 strands a Builds record, and the effective-step table misreads it

- **Severity:** major. **Tag:** correctness.
- **Location:** plan:290-300, plan:281-283; `bin.mjs:59-65`, `:468-486`; `chapter2.mjs:626-628`;
  `records.mjs:181-190`.
- **Defect:** T2 moves a Builds record through chapter 2's steps (`zone-created` through
  `email-onboarded`) while its trigger stays saved. `--connect` admits every
  `CHAPTER2_RESUMABLE_STEPS` step (`bin.mjs:59-65`) and runs chapter 3's main flow, which writes
  `config-reconciled` and then `builds-live` over the chapter 2 step. An owner parked at delegation
  who runs `--connect` ends at `builds-live` with a domain, no `domainLiveAt`, no email field, and an
  unfinished cutover. Releases before this one already allow that path, and so does the
  email-not-ready park at `domain-live`, where the domain is in fact live.
  - The plan's routing (plan:282-283) enters chapter 2 only with "an open email decline or no
    domain", so such a record is never reopened: the domain stays half-connected and the closing
    block reads as finished.
  - If the routing is widened, the table's row 2 sends the record to `zone-created`. That re-runs
    the carry-over, and `readCurrentRecords` throws a raw `Error` for any domain already on
    Cloudflare nameservers (`records.mjs:181-190`) unless `alreadyActive` is true.
  - Under the plan's routing, rows 2 and 4 are unreachable: an open decline implies
    `emailDeclinedAt` (row 3), and no domain is row 1. Their "one test per row" tests prove dead
    paths.
- **Fold:**
  1. `--connect` on a record that `isBuildsConnected` holds, at a `CHAPTER2_RESUMABLE_STEPS` step,
     resumes chapter 2 instead of running chapter 3, so `--connect` never overwrites a chapter 2
     step.
  2. Row 2 splits on `cloudflare.carryOver`. If it's present, the effective step is
     `records-carried`; the delegation read, the attach PUT, and the origin write are all
     read-before-write or idempotent. If it's absent, the step is `zone-created`.
  3. Routing at a chapter 3 terminal step also enters chapter 2 when there's a `domain` with no
     `domainLiveAt` and no email field. That reaches row 2 and finishes stranded records from
     earlier releases. Otherwise drop rows 2 and 4 and their tests.
- **Cost of the fold:** about one more test. It removes two dead-path tests.

### M5. The settle runs after the `buildsDeclinedAt` restore, which nothing clears

- **Severity:** major. **Tag:** correctness.
- **Location:** plan:302-309, plan:331-332; `bin.mjs:296-300`; `chapter2.mjs:489-498`.
- **Defect:** `buildsDeclinedAt` is written by chapter 2's open-decline path and never cleared;
  `grep` finds one writer and one reader. A record can carry it and a live trigger at the same time:
  - Builds is declined, then email is accepted on a re-run, which writes `buildsDeclinedAt`.
  - The run parks at email-not-ready, and the owner runs `--connect` to reach `builds-live`.
  - After T2, `hasOpenEmailDecline` is true at `builds-live`, so the next run turns email on.

  `continueIntoChapter2` checks `buildsDeclinedAt` first and writes `builds-connect-declined` on a
  live Builds site. The plan says "Add" the settle without fixing its order. Separately, the
  acceptance at plan:331-332 says a domain accepted at `builds-connect-declined` "settles at
  `builds-connect-declined`". No mechanism makes that true: the reopen path writes no
  `buildsDeclinedAt`, so the run falls through to `runChapter3AndReport` and asks the Builds
  question again.
- **Fold:** the settle checks the Builds-live condition before the `buildsDeclinedAt` restore.
  State how the `builds-connect-declined` reopen settles: write `buildsDeclinedAt` on entry from
  that step when no Builds signal exists, the same rule as `buildsDeclineStands`. Add a test for a
  record that carries both `buildsDeclinedAt` and a trigger with a `success` outcome, and assert it
  settles at `builds-live`.

### M6. `check-stable-source.mjs` passes changes that have no `+` or `-` lines, and checks the wrong commit

- **Severity:** major. **Tag:** correctness.
- **Location:** plan:389-395; `.claude/skills/cairn-releasing/SKILL.md:160`.
- **Defect:** the rule passes when "every changed line (`+` or `-`)" is allowed. `git diff` shows
  some changes with no `+` or `-` lines: a binary change (`Binary files ... differ`), a mode change,
  a pure rename, and a new empty file. All four pass. The skill also cuts with
  `gh release create v<x.y.z> --target main`, which tags the remote `main`, while the check diffs
  local `HEAD`. A merge that lands after the check, or a local checkout behind or ahead of `origin`,
  cuts a stable from a tree the check never read. That defeats the design's "cut only from a passed
  tree".
- **Fold:**
  - Take the changed-file set from `git diff --name-status v<next> <sha>` and refuse any file
    outside the four `package.json` and lock files and `CHANGELOG.md`, including renames and mode
    changes. Read lines only within the allowed files, with `--text`.
  - The script takes the target sha, fetches, and refuses unless that sha equals `origin/main`.
    The skill passes the same sha to `--target`.
  - Add tests: a binary file change fails, and a target sha different from `origin/main` fails.

### M7. A gate run that dies leaves resources holding `carin-test.org`, with no sweep

- **Severity:** major. **Tag:** correctness.
- **Location:** plan:520-540.
- **Defect:** teardown runs "for one install" between legs. If a leg dies (a driver timeout, the
  10-minute browser stop, a killed process, a crash), nothing removes that install's Worker. Its
  custom domain still holds `carin-test.org`, so the next attach fails. That attach is leg B2's in
  the same run, or leg A1's in the next run. Apps also pile up toward GitHub's cap of 100. Teardown's
  acceptance checks "each delete once, in order", but doesn't check that a second run treats a 404
  as done, or that one failed delete doesn't stop the rest.
- **Fold:**
  - `run-gate.sh` traps exit and runs teardown for every install the run created.
  - `gate.mjs` starts each run with a sweep that lists `cairn-e2e-gate-*` Workers, D1 databases, R2
    buckets, and repositories. Before an attach, it reads the custom domains on `carin-test.org`. A
    domain bound to a prefixed service is removed. A domain bound to any other service stops the
    run without touching it.
  - Teardown treats 404 as done, attempts every delete, and reports the ones left.
  - Add tests: a second teardown over the same install makes no failing call, and a failure on the
    D1 delete still attempts R2 and the repository.

### M8. The GitHub machine account's password and TOTP secret reach the CLI and npm lifecycle scripts

- **Severity:** major. **Tag:** correctness.
- **Location:** plan:457-463.
- **Defect:** the one allowlisted child environment carries `CLOUDFLARE_API_TOKEN` and "the
  `CAIRN_GATE_GH_*` names for the browser half". The CLI under test inherits that environment.
  The CLI then spawns `npm ci` with registry lifecycle scripts, `npm run build` with Vite plugins,
  and wrangler, so third-party code can read the machine account's password, TOTP secret, and
  `delete_repo` token. The CLI needs none of them.
- **Fold:** build two allowlists. The CLI child gets `PATH`, `HOME`, `TERM`, `LANG`, the two
  `CLOUDFLARE_*` variables, `CAIRN_STATE_DIR`, and `GATE_URL_LOG`. Only the Playwright process and
  the teardown process get `CAIRN_GATE_GH_*`. The driver needs the Cloudflare token only to answer
  the paste prompt. Add a test that spawns the stub CLI through the driver, dumps its environment,
  and asserts that no `CAIRN_GATE_GH_*` variable is present.

### M9. Chapter 3 verifies the token at `/user/tokens/verify`, which an account-owned token fails

- **Severity:** major. **Tag:** correctness.
- **Location:** plan:110, plan:480-484 (the smoke); `src/cloudflare/api.mjs:557-560`;
  `chapter3.mjs:1088`.
- **Defect:** the gate token is account-owned, which is why the pre-flight checks it at
  `accounts/<id>/tokens/verify`. Chapter 3's trigger hop calls `api.verifyToken()`, which reads
  `GET /user/tokens/verify`. Cloudflare documents account-owned tokens as verified on the account
  endpoint, and the user endpoint rejects them. So legs A2 and B1 fail at "Create your Workers
  Builds trigger" on the first gate run, after the merge. This is the same class of risk as finding
  3 (`wrangler whoami`), but the smoke doesn't probe it, and the design forbids the CLI seam that
  would route around it.
- **Fold:** add the smoke check `GET /user/tokens/verify` with the gate token, verdict only. If it
  fails, stop for the conductor, as finding 3 does. The likely fix, which falls back to the account
  endpoint when the user endpoint rejects the token, is a change to an `auth-data` path. Name it now
  as the conductor's ruling to make, so it doesn't surface as a gate failure after the merge.

### M10. OWNER FORK: a bare `npx create-cairn-site` re-run serves `rc.1` against a record this release writes

- **Severity:** major. **Tag:** correctness.
- **Location:** plan:48-50 (filed as a found item only), plan:290-312; every catalogue `Next:` line
  that prints `npx create-cairn-site --dir`.
- **Defect:** `latest` is `0.99.0-rc.1`, and every re-run line the tool prints omits a version. A
  tester who installs `rc.3` from `next` and re-runs from a printed line gets `rc.1`. After T2, a
  Builds record can sit at a chapter 2 step (`delegated` or `email-onboarded`) with a trigger saved.
  `rc.1` resumes it with a local build and deploy at the cutover or the sender hop. That replaces
  the Builds-deployed site with the owner's checkout, which lacks every admin publish, the hazard
  T2's invariant exists to prevent. The live site loses content until the next publish.
- **Options:**
  1. Move `latest` to the gated candidate at promotion, until the stable supersedes it.
  2. Print `npx create-cairn-site@<own version>` in the re-run lines. That widens scope into the
     catalogue copy.
  3. Accept the exposure for the `rc.3` testers and say so in the tester notes.
- **Recommendation:** option 1, since it's one `npm dist-tag add` in the promote job and it closes
  the downgrade. The harness half is not a fork: every gate re-run (A2, B2) invokes
  `create-cairn-site@<exact version>`, never `@gate` or a bare name, so a tag moved mid-run can't
  swap the code under test.

## Minor

### m1. The chapter 2 watch's writes to chapter 3's build fields are unspecified

- **Severity:** minor. **Tag:** correctness.
- **Location:** plan:259-262; `chapter3.mjs:510`, `:593`, `:600`, `:926-927`.
- **Defect:** the extracted watch core writes `buildsLastBuildUuid` and `buildsLastBuildOutcome`.
  If chapter 2's use keeps those writes, a later chapter 3 main-flow run reads a failed chapter 2
  build as `lastBuildUuid`. It then calls `getBuild` on that build and throws
  `builds-deploy-failed` on every run until a diff appears. If chapter 2 tracks no in-flight build,
  every re-run during a `build-running` park kicks another build.
- **Fold:** state which fields chapter 2's watch writes. Suggested: none of chapter 3's. Its own
  in-flight uuid, which a re-run resumes watching before it considers a kick. The `success` outcome
  goes with M1's deployed hash.

### m2. An underscoped token fails only after the commit has landed

- **Severity:** minor. **Tag:** correctness.
- **Location:** plan:272-274; `prefill.mjs:208-214` (`validateToken` calls `listZones` only).
- **Defect:** a saved or pasted token that lacks the Builds keys passes validation, the reconcile
  commits, and the watch then fails with `token-scope-missing`. With M1 the state stays
  recoverable, but the owner pays an OAuth trip and a commit before learning the token is wrong.
- **Fold:** on a Builds record, read `findWorkerTag` through the new token before the reconcile, so
  an underscoped token fails before anything is written.

### m3. A publish that races the reconcile reads as a refusal or a false failure

- **Severity:** minor. **Tag:** optional.
- **Location:** `reconcile.mjs:130-137`.
- **Defect:** the ref PATCH is not forced, which is correct: no data is lost. An admin publish
  between the head read and the PATCH gets a 422, which surfaces as `builds-push-refused`, whose
  copy is about branch protection. A newer publish's build can also supersede the reconcile
  commit's build. If Builds cancels the older build, chapter 2 throws `builds-not-runnable` while the
  newer build deployed the config.
- **Fold:** retry the reconcile once from the new head on a non-fast-forward. On `cancelled`, accept
  a later successful build whose commit descends from the reconcile commit. Otherwise file both for
  the gate to observe.

### m4. A partial promotion splits `next` across the three packages

- **Severity:** minor. **Tag:** correctness.
- **Location:** plan:379-388, plan:396-403.
- **Defect:** if the second of three `npm dist-tag add` calls fails, for example because one
  package's **Allow npm dist-tag** box was left off, the step leaves `next` split. The stable check
  catches the split later, but nothing tells the conductor how to recover. Separately, the promote
  job's `if: inputs.promote != ''` relies on the expression engine's loose comparison of `null` and
  `''` on a `release` event.
- **Fold:**
  - Move `create-cairn-site` last, since it's the testers' entry point.
  - Print every package's tag state on failure.
  - Say in the skill that re-dispatching the same version recovers, since `dist-tag add` is
    idempotent.
  - Make the guard explicit: `github.event_name == 'workflow_dispatch' && inputs.promote != ''`.
    Pin the guard in `workflow-yaml.test.ts`.

### m5. `record.mjs` can overwrite a release body from a failed read

- **Severity:** minor. **Tag:** correctness.
- **Location:** plan:541-543.
- **Defect:** the step reads the body, replaces `## Gate`, and writes with `--notes-file`. A failed
  or empty read followed by the write wipes the release notes. Recording once at the end also loses
  every leg's evidence when a later leg dies, which the standing answer "rerun only the legs its
  path touches" needs.
- **Fold:** abort the write when the read fails or returns nothing for a release that has notes.
  Record after each leg. Add one test: a read that fails makes no `gh release edit` call.

### m6. The plan's naming scheme exceeds its own 34-character check

- **Severity:** minor. **Tag:** correctness.
- **Location:** plan:520-521.
- **Defect:** `cairn-e2e-gate-` (15) plus `-a-` (3) plus `yymmddhhmm` (10) is 28 characters before
  the version. Any version slug over 6 characters breaks the limit, and `0.99.0-rc.3` slugs to at
  least 7. The check fails on the first real run.
- **Fold:** shorten the time to `ddhhmm`, or slug the version to its prerelease part (`rc3`). Add a
  test against `0.99.0-rc.3`.

### m7. Credentials at rest and in argv

- **Severity:** minor. **Tag:** correctness.
- **Location:** plan:457-464, plan:479-484, plan:509-511.
- **Defect:** several places leave a credential on disk or in a process list:
  - The plan doesn't say where the run directory lives. The CLI's state records under
    `CAIRN_STATE_DIR` hold the gate token at every park, plus the App's private key and client
    secret.
  - The session file's mode is unstated.
  - The smoke's checks and the pre-flight commands put bearer tokens in `curl -H` argv, which any
    local process can read.
  - How `totp.mjs` receives its secret is unstated, so it may arrive in argv.
  - A Playwright trace records filled values in plain text.
- **Fold:**
  - Put the run directory under `~/.local/state/cairn-gate/runs/<ts>` with mode `0700`, never in
    the worktree, and delete each install's state record after teardown.
  - Write the session file with mode `0600`.
  - Make the smoke's HTTP calls through Node `fetch`.
  - Have `totp.mjs` read its secret from the environment only.
  - Never enable tracing or video. Never write the bootstrap sign-in link from `GATE_URL_LOG` to the
    release body or the PR.

### m8. Over-ceremony: the dead effective-step rows

- **Severity:** minor. **Tag:** optional.
- **Location:** plan:330.
- **Defect:** "one test per row" spends Opus-high time on rows 2 and 4, which the plan's routing
  never reaches (see M4). That's two tests, about 10 minutes of T2's 200.
- **Fold:** resolved by M4. Either make the rows reachable or drop them and their tests.
