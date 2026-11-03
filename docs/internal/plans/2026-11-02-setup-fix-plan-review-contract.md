# setup-fix plan review: contract and criteria lens

Target: `2026-11-02-setup-fix-plan.md` at `d67f3bdb1`, read against the approved design (revision 1)
and the source in this worktree. The design's rulings, "Calls the conductor made", and "Standing
answers" are taken as given. Line numbers are the plan's unless a file is named.

Counts: 1 blocker, 8 major (1 an OWNER FORK), 9 minor.

## Blocker

### B1. The stable check fails every real stable cut, and its tests can't see it

- **Severity:** blocker. **Tag:** `correctness`.
- **Location:** plan:389-395 (T4 part 3), plan:416-418 (its acceptance).
- **Defect:** `check-stable-source.mjs` allows only `"version":` lines in four `package.json`
  files and the lockfile, plus CHANGELOG heading and marker lines. The real `rc.2` cut commit
  (`git show --stat 1ae692ae1`) also changed `MIGRATION-NOTES.md` (its heading and a
  `CHANGELOG.md#0990-rc2` anchor), `guidance-hashes.json` (108 lines of appended hashes),
  `templates/waymark/package.json` (the `^0.99.0-rc.2` dependency pins, which aren't `"version":`
  lines), and `templates/waymark/.claude/cairn/VERSION`. `cairn-releasing` step 5 also scrubs
  stale phrasing in the CHANGELOG body and adds a MIGRATION-NOTES entry. The check as written
  refuses a legitimate stable cut, and the executor or conductor widens it ad hoc at release time.
  All six of its tests use made-up diffs, so they pass however wrong the allowlist is. This
  criterion passes vacuously against the real cut's shape.
- **Fold:** Build the allowlist from the cut's actual mechanical edits. Make the real cut diff
  (`git diff 1ae692ae1^ 1ae692ae1`, with versions substituted) a test fixture that must pass. Cover
  the template pins, `VERSION`, and the MIGRATION-NOTES heading and anchor. For
  `guidance-hashes.json`, regenerate the file with its own command and compare, instead of
  allowlisting the file. Run the step 5 body scrub before the gate candidate's tag, or name it as
  a refusal the cut must rerun. Add one more fixture that must fail: a real code line hidden in a
  template file.

## Major

### M1. T2's and T3's grep criteria can't pass when their tasks run

- **Severity:** major. **Tag:** `correctness`.
- **Location:** plan:337-338 (T2), plan:361 (T3).
- **Defect:** I ran both greps at `d67f3bdb1`. T2's grep matches `docs/admin/setup-recovery.md`,
  which belongs to T5 and runs in Pair C, after T2. It also matches
  `docs/internal/plans/2026-11-02-setup-fix-plan.md`, the plan itself, which isn't deleted until
  the close. T3's grep matches the plan file too. Each criterion fails for reasons unrelated to its
  task. The executor either edits a file outside the task or stops for the conductor.
- **Fold:** Limit T2's grep to `packages/create-cairn-site skills` and move the `docs/admin` half
  to T5's acceptance. Make T3's grep `src examples docs/admin docs/editors skills`.

### M2. Leg B2's pass bar can't fail when the Builds-aware invariant breaks

- **Severity:** major. **Tag:** `correctness`.
- **Location:** plan:533-534 (B2), design "The setup tool" 2.
- **Defect:** B2 passes when the marker is fetched from `https://carin-test.org`. The custom domain
  is attached through the API (`hostname.mjs:368`, `api.attachCustomDomain`), not through
  `wrangler.jsonc`. If chapter 2 never commits the origin, a Builds deploy from the repository
  still serves the publish on the domain. B2 passes with the design's central invariant broken:
  "every configuration change chapter 2 makes reaches the repository before the next Builds
  deploy". B2 also has no closing-block read, unlike A1, A2, and B1, so the `builds-live` settle
  copy is never read live.
- **Fold:** After B2's publish deploys, read a page surface that renders the build-time origin.
  `publicOrigin` feeds `templates/waymark/src/chassis/content.ts:32`, so the sitemap's or feed's
  absolute URLs, or the canonical link, will do. Assert that it names `https://carin-test.org`; the
  builder confirms which surface carries it. Apply the same read to A2, where `--connect`
  reconciles an origin that was deployed locally. Add B2's closing-block read: it must hold
  `This site is set up end to end.` and the connected sentence. The email half is F1.

### M3. The design's `--yes`-without-`--domain` outcome has no check, and its real end is a park

- **Severity:** major. **Tag:** `correctness`.
- **Location:** plan:192-194 (T1 part 1, "leave both"), plan:215-233 (T1 acceptance), design "The
  setup tool" 1, third sentence.
- **Defect:** No T1 test runs `--yes` without `--domain`. Before T1, that run ended at
  `printLiveInfo` and never reached chapter 3. After T1, chapter 3 consents and connects, and the
  first reconcile always parks under `--yes`. `performReconcile` compares the disk hash with an
  undefined `buildsReconciledHash` (`chapter3.mjs:244-250`), so the run ends at
  `builds-reconcile-parked` with step `builds-connected`. The plan says "the run connects",
  but the owner actually sees a park row telling them to rerun with `--connect` and without `--yes`.
- **Fold:** Add a T1 bin-level test: a record at `live`, `--yes`, no `--domain`. Assert that the
  Builds title appears, a trigger is recorded, the `builds-reconcile-parked` row prints with its
  next step, and the saved step is `builds-connected`. Restate the outcome in T1 part 1 as "connects
  and parks at the reconcile, as `--yes --connect` does".

### M4. Two re-run terminal branches are unspecified, and T1's routing and T2's settle collide on them

- **Severity:** major. **Tag:** `correctness`.
- **Location:** plan:185-194 (T1 routing), plan:281-284 and plan:302-309 (T2 reopen and settle),
  `bin.mjs:288-315`.
- **Defect:** T1 sends every `admission-declined` outcome into `runChapter3AndReport`. T2 then
  reopens chapter 2 at both chapter 3 terminal steps when the record has no domain. Answering no
  to the domain there gives these outcomes:
  - **At `builds-live`:** T2's settle says "prints the `builds-live` block and runs no chapter 3".
    That contradicts T1's route unless the settle check comes first in `continueIntoChapter2`. The
    plan doesn't set the order, and no test covers this branch.
  - **At `builds-connect-declined`:** T1's route enters chapter 3. Its `alreadyAdmitted` is false,
    because a decline saves no `buildsTokenSavedAt` (`chapter3.mjs:921-924`), so the run asks the
    Builds question again on every plain re-run. The existing `buildsDeclinedAt` restore
    (`bin.mjs:296-299`) runs only inside the `TERMINAL_STEPS` branch, so it doesn't apply. The
    design says this site's live site doesn't change "until the owner runs `--connect`", which
    reads as no re-offer. The plan says nothing either way, and no test covers this branch.
- **Fold:** In T2, state that an `admission-declined` from either chapter 3 terminal step settles
  back on that step and prints its block, checked before T1's route. Extend the `buildsDeclinedAt`
  restore to `admission-declined`. Add two bin-level tests, one per step, each answering no to the
  domain. Assert the step is unchanged, no Builds title appears, and the step's closing sentence
  prints.

### M5. Nothing tests that a leg fails, and `--plan` checks only a description

- **Severity:** major. **Tag:** `correctness`. Includes an over-ceremony cost.
- **Location:** plan:552-553 (T6b acceptance), plan:520-535 (the legs).
- **Defect:** The only check on leg logic is that `gate.mjs --plan` prints each leg's pass
  condition. That checks text, not the code that decides pass or fail. Suppose a leg evaluator
  ignores `found: false`, never compares the alert text, or passes on exit 0. Every T6b criterion
  still passes, and the bug surfaces only on the live `rc.3` gate after the merge. This is exactly
  the shape rule standards#9 names. `--plan` is also a mode built only to satisfy its own check.
- **Fold:** Drop `--plan`. Unit-test each leg's evaluator against stubbed driver, browser, and
  fetch results:
  - `found: false` fails the leg.
  - A wrong alert text fails the leg.
  - A missing closing sentence fails the leg.
  - A CLI exit 0 with no fetch result fails the leg.
  - On A1, an `--absent` that saw the marker fails.

### M6. The sign-in link expires before the first publish, and the plan doesn't say when it's used

- **Severity:** major. **Tag:** `correctness`.
- **Location:** plan:517-519 (T6b admin half), design "The harness" fifth bullet.
- **Defect:** The bootstrap link chapter 1 opens (`chapter.mjs:276`) lives ten minutes
  (`bootstrap.mjs:17`, the engine's `TOKEN_TTL_MS`). A1's publish comes after chapter 2's zone,
  DNS, cutover, and email hops, plus chapter 3's decline, which is often more than ten minutes.
  A2 and B2 are re-runs that open no fresh link. The plan says only "opens the captured sign-in
  link", with no timing and no session reuse. The first live gate can fail on an expired token,
  which is a harness defect and not a candidate defect. The plan also doesn't say which origin the
  harness signs in on after the cutover moves `PUBLIC_ORIGIN` to the domain.
- **Fold:** Have `browser.mjs` use each sign-in link as soon as the shim logs it, concurrently with
  the running CLI, and keep that install's admin session, which lasts 30 days. When the session is
  missing, run the CLI's own `--sign-in` recovery. Name the admin origin each leg publishes from.
  Have T6a's integration test assert that the link is used before the CLI exits.

### M7. A1's "live page unchanged" check passes on a wrong URL or an error page

- **Severity:** major. **Tag:** `correctness`.
- **Location:** plan:476-478 (T6a `fetch-check --absent`), plan:525-526 (A1).
- **Defect:** `--absent 5` passes when the marker is missing after five minutes. A 404, a wrong
  `<entry path>`, a DNS error, or a challenge page all lack the marker, so all of them pass. The
  plan also never says how `<entry path>` is derived from the entry the browser edited.
- **Fold:** In `--absent` mode, require HTTP 200 and a positive control string on every poll, such
  as the entry's title or a pre-edit body line read before the publish. Derive `<entry path>` from
  the entry `browser.mjs` opened and return it with the alert text. Add one test: a 404 without the
  marker fails `--absent`.

### F1. OWNER FORK: whether the gate reads the email outcome where an editor sees it

- **Severity:** major. **Tag:** `correctness`.
- **Location:** plan:522-534 (A1 and B2, email on), design "The release gate" 2 and 3.
- **Defect:** A1 and B2 both turn email on. B2 does it through the new Builds-aware path, but
  neither leg reads anything an editor would see from it. If the sender address in
  `cairn.config.ts` never reaches the repository, B2's publish redeploys without it, and sign-in
  email breaks while every leg passes. The design's pass bar names only the fetch, and email is
  half of what design item 2 promises.
- **Options:**
  - (a) Keep the bar as approved. M2's origin read covers the `wrangler.jsonc` half only.
  - (b) After B2's publish deploys, request a sign-in link for a second address on the domain's
    admin. Read the message from the ward test mailbox already in pre-flight (`GATE_OWNER_EMAIL`,
    `STALWART_PASSWORD_TEST`), and assert its From is the configured sender. This costs about 20
    path minutes in T6b and one IMAP read per gate run.
- **Recommendation:** (b). The mailbox and its credential are already in pre-flight, and without
  this read B2 can pass with broken sign-in email.

## Minor

### m1. "Stdout ends with the connected sentence" can't hold

- **Severity:** minor. **Tag:** `correctness`.
- **Location:** plan:320.
- **Defect:** Every closing block ends with the doctor line (`bin.mjs:239`), so the assertion fails
  as written or gets loosened ad hoc.
- **Fold:** Write "holds the connected sentence and `This site is set up end to end.` once".

### m2. The effective-step test has no prompt to read for two rows, and row 4 contradicts the invariant

- **Severity:** minor. **Tag:** `correctness`.
- **Location:** plan:296-301, plan:330.
- **Defect:** "Asserting which prompt appears first" passes vacuously for rows 2 and 4, which ask
  nothing. Row 4 says "deploying only if needed", but a Builds record must never deploy locally.
- **Fold:** Name each row's observable. Row 2: no admission title, and the fake Cloudflare records
  a zone read before any write. Row 4: a test-send call, and on a Builds record a reconcile instead
  of a deploy.

### m3. No fake run covers B2's shape: domain and email in one run on a Builds record

- **Severity:** minor. **Tag:** `correctness`.
- **Location:** plan:315-339.
- **Defect:** T2 tests the cutover and email separately. B2 does both in one run, which means two
  reconciles, two OAuth trips, two builds, and a hash recorded between them. The pass's first proof
  of that sequence is the live gate after the merge.
- **Fold:** Add one fake test of that run. Assert two reconcile commits and two watched builds,
  with no local deploy.

### m4. The new sentence prints in `printLiveInfo` even when the site has no address

- **Severity:** minor. **Tag:** `correctness`.
- **Location:** plan:197-199, `bin.mjs:108-138`, `bin.mjs:308`.
- **Defect:** `printLiveInfo`'s branch for a site with no `cloudflare.url` would print "your live
  site does not change" when no live site exists. The plan also doesn't say whether
  `admission-declined` prints the short repo-and-doctor block at `bin.mjs:308` before chapter 3, as
  a terminal outcome does.
- **Fold:** Print the sentence only when `cloudflare.url` is set, and state what happens on the
  `:308` print.

### m5. T7's acceptance is a reading, and T4's placeholder is never checked

- **Severity:** minor. **Tag:** `correctness`.
- **Location:** plan:569-572.
- **Defect:** "A read of steps 6 to 7" and "shows no `next` left where … meant" can't fail
  mechanically, and nothing checks that the placeholder from T4 is gone.
- **Fold:** `grep -c '<the placeholder marker>' SKILL.md` prints 0, `grep -n -- '--tag next'
  SKILL.md` prints nothing, and the gate step names `run-gate.sh --all --version`.

### m6. The design's "run sheet's steps 11 and 12 point at it" has no task or check

- **Severity:** minor. **Tag:** `correctness`.
- **Location:** plan:571-572, design "The release gate" 6.
- **Defect:** The plan hands this to the conductor in passing, and the close never lists it.
- **Fold:** Add a close line: "conductor repoints run-sheet steps 11-12; recorded under
  `## Decisions`".

### m7. Live sign-in tokens land in the URL log and the pty capture

- **Severity:** minor. **Tag:** `correctness`.
- **Location:** plan:471-474, plan:486-488 (T6a).
- **Defect:** Under a pty, `process.stdout.isTTY` is true, so `openBrowser` prints the secret
  confirm URL in full (`open.mjs` `secret` handling), and the shim logs it to `$GATE_URL_LOG`. The
  acceptance checks only the Cloudflare token.
- **Fold:** Create the run directory with mode 0700 and delete the capture and URL log at teardown.
  Test that `record.mjs` never writes a URL with a `token=` query into the release body.

### m8. The driver's prompt detection and per-leg answers aren't specified

- **Severity:** minor. **Tag:** `correctness`.
- **Location:** plan:466-471.
- **Defect:** "Answers prompts by text" doesn't say how a prompt is told apart from ordinary
  output, so the "unknown prompt fails" criterion depends on the builder's guess. The domain and
  Builds answers also differ by leg, but the plan describes one table.
- **Fold:** Key detection on the prompt library's active-prompt marker plus the prompt's text, and
  give each leg its own answer table. Test that an unmarked output line never counts as a prompt.

### m9. T1's catalogue row edit prints the same claim twice in a row

- **Severity:** minor. **Tag:** `optional`, over-ceremony.
- **Location:** plan:203-207.
- **Defect:** When Builds is declined, chapter 3 logs the row (`chapter3.mjs:921`), and then
  `printBuildsChapterInfo` prints the not-connected sentence. After the edit, both say "a publish
  commits to GitHub and your live site does not change", back to back. That costs one extra test
  rewrite for duplicated copy.
- **Fold:** Leave the row as it is. The closing sentence carries the claim.
