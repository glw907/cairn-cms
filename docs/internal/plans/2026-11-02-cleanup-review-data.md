# cleanup plan review: data integrity and failure risk

Target: `2026-11-02-cleanup-plan.md` at `4e87a478d`. `p2-p4` read at `origin/worktree-p2-p4-run`.
Findings run by consequence. Plan references are `plan:<line>`. No blocker. Eleven findings are major, and
one of those is an owner fork. No path found loses a published entry, a `publishedAt`, or the last owner
on a live site through this plan's reads, apart from finding 4's narrower effect on a dev start.

## Findings

### 1. major, correctness: the prior-row delete has no position, so it can sign someone out on a failed confirm or strand a burned link

- **Where:** `plan:399-400` (T5 step 3); `src/lib/sveltekit/auth-routes.ts:339-360`; `src/lib/auth/store.ts:228-243`.
- **Defect:** "`confirmAction` deletes the prior row when a session cookie is present" names no position. Before
  `consumeToken`, a stale or wrong-browser link click ends a live session, though `:340` holds that a failed
  confirm changes nothing. Between consume and `createSession`, a failed insert leaves the old row gone, the
  token spent, and a dead cookie. After `createSession` as a separate statement, a failed delete throws after
  the new row exists but before `Set-Cookie`, so that row is orphaned and the link is burned. The delete itself
  can't hit the wrong person: it is keyed on this browser's own cookie, whose value is about to be replaced,
  and other devices hold other ids. Acceptance's "Re-login leaves one row" holds only per browser.
- **Fold:** "`createSession` takes an optional `priorId`, and hashes it into the same `db.batch` as the expired
  sweep and the insert. `confirmAction` reads the id after `consumeToken` returns an email, with the
  two-name read `logoutAction` uses at `:444-445`." Acceptance adds: a failed confirm leaves the prior row; a
  second device's row survives re-login.

### 2. major, correctness: `event.getClientAddress()` is not on `CairnEvent`, and the plan has no branch for that

- **Where:** `plan:407-408`; `src/lib/sveltekit/types.ts:55-83`.
- **Defect:** The plan says to confirm the member and quote it. It isn't there: the interface holds `url`,
  `request`, `params`, `route`, `cookies`, `setHeaders`, and `locals`, and `git grep getClientAddress` over
  `src`, `skills`, `docs/admin`, and the showcase prints nothing. A required member changes a `@public` shape
  and every hand-built test event. The Cloudflare adapter's body is a cast that erases null, at
  `@sveltejs/adapter-cloudflare/files/worker.js:91-93`:

  ```js
  getClientAddress() {
  	return /** @type {string} */ (req.headers.get('cf-connecting-ip'));
  }
  ```

  So on Cloudflare it is the same header, possibly null, and a null reaches `limit({ key })`. Kit's fallback
  throws where an adapter gives none (`kit/src/runtime/server/respond.js:197-201`,
  `e.client_address_unsupported`).
- **Fold:** Read `event.request.headers.get('cf-connecting-ip')` directly, which needs no surface change and
  matches `src/lib/cloudflare/rate-limit.ts:56`: "derive any IP component from `CF-Connecting-IP` only". An
  absent header skips the limiter, so one null can't become a shared bucket. Key as `login:<ip>`, since
  `section-action.ts:69-70` says the same binding and key share one budget.

### 3. major, correctness: degrade-to-open covers only the `limit()` call

- **Where:** `plan:401-404`; `src/lib/sveltekit/section-action.ts:301-356`; `src/lib/cloudflare/rate-limit.ts:61-77`.
- **Defect:** `resolveRateLimit` catches only `binding.limit`. A throwing site resolver, or `getClientAddress`
  if kept, runs outside it and turns into a 500 on the sign-in POST, which fails closed. The plan adds one
  event, `auth.rate_limited`, so `failed` opens silently. `section-action.ts:304,336` logs both absent and
  failed, and the repo rule says a diagnosable path gets an event.
- **Fold:** "Resolver, key, and limit run in one guarded helper. `failed` logs `auth.rate_limit_failed` at warn
  with no address. A test: a throwing resolver lets the request through." The helper is one function shared by
  both actions, or the request action alone under finding 12.

### 4. major, correctness: #261's hold fires on entries that keep their row and freezes the whole manifest

- **Where:** `plan:288-289`; `src/lib/delivery/manifest.ts:54-58,71-75`; `src/lib/vite/internal.ts:386-395,438-450`.
- **Defect:** The predicate is "a problem names a committed row with `publishedAt`". A bad filename or a dead
  `cairn:` link is also a `ManifestProblem`, but `:74-75` keeps its row, and `carryPublishStamps` keeps its
  stamp. Those are ordinary states mid-edit. Under the plan's predicate each holds the write, so a dev session
  stops picking up every other new or changed entry in `index.json`. Nothing is lost, but the dev manifest goes
  silently stale. The report at `:444-449` then counts rows from a `next` that wasn't written.
- **Stamps:** No read shows #261 dropping a row or a stamp. `cairn-manifest` stays unchanged, so the bin still
  drops a stamp for an invalid published entry. `assemble.ts:79` exits 1 on a non-draft problem, and the loss
  shows in a git diff, so that stays a named limit and not a new item.
- **Fold:** "Hold only when a committed row with `publishedAt` is absent from `built.manifest` and a problem
  names it." Acceptance adds: a published entry with a dead link still writes. The report takes
  `held: true` and counts against `committed`. State the bin's limit in `log-events.md` or the report line.

### 5. major, correctness: T5 updates one of the seed sites T18's smoke runs, so close stops

- **Where:** `plan:398-399`, `plan:198`, `plan:869`; `.claude/skills/cairn-running-passes/references/admin-smoke-test.md:74,94,134`.
- **Defect:** The plan names `:94`. The showcase path T18 runs is `:74`, which also inserts `'smoke-owner'`
  raw. Left alone, every authed check redirects to login, and "anything else that fails is a stop". `:134`,
  `DELETE FROM session WHERE id LIKE 'smoke%'`, stops matching a digest, so a 2099 owner row stays in local D1.
  `:90`'s "Pick any `id`" also needs the digest step.
- **Fold:** Name `:74,90-99,134`. Seed the literal digest with the command that produced it
  (`printf %s smoke-owner | sha256sum`, matching `hashToken`'s lowercase hex at `src/lib/auth/crypto.ts:115-119`),
  and clean up by `email`.

### 6. major, correctness: the tag does not hold `MIGRATION-NOTES.md`, and neither pointer covers post-tag text

- **Where:** `plan:838-845`.
- **Verified:** `v0.98.0` is on origin at `a84a6853a`. `git show v0.98.0:CHANGELOG.md` holds every section,
  89 headings. No shipped code or test reads a removed section: the readers are `check-version.mjs`,
  `check-consumers-must.mjs`, `docs-links.mjs`, `check-leaks.mjs`, `check-snippets.mjs`, `check-symbols.mjs`,
  and `tool/internal/health/check_engine.go:188`, and each needs only what stays, apart from the slug test the
  plan already repoints. `check_engine.go:196` reads a missing section as nothing owed, which the sheet accepts.
- **Defect:** `git cat-file -s v0.98.0:MIGRATION-NOTES.md` fails: "exists on disk, but not in 'v0.98.0'".
  The file was `docs/extend/migration-notes.md` then, renamed at `db5ffdf7a`, and `upgrade-cairn.md` sat beside
  it. `## Unreleased` holds 1,552 changelog lines and 222 notes lines that no tag holds, so "this and earlier
  versions" gives them no home. The file ships in the npm tarball (`package.json:186-187`), where a reader has
  no clone and a bare tag name leads nowhere.
- **Fold:** Each stub carries a full GitHub URL: `blob/v0.98.0/CHANGELOG.md`, and
  `blob/v0.98.0/docs/extend/migration-notes.md`. Both name the last pre-reset commit for the Unreleased detail.
  T17 records that SHA in STATUS.

### 7. major, correctness: the reset removes an input of pass 9's release sweep

- **Where:** `plan:838-842`; run sheet step 2; `.claude/skills/cairn-releasing/SKILL.md:81-83`.
- **Defect:** The sweep's window starts at `v0.98.0`, and its third finder input is "the changelog's
  `Consumers must:` and behavior lines". T17 replaces 124-plus such lines with one rebuild line and a
  consolidation under 400 lines total. The sweep would finish and report a thin yield, a silent loss of
  coverage rather than a failure. Neither the plan nor the sheet says so.
- **Fold:** T17's STATUS note tells pass 9 to read `git show <pre-reset sha>:CHANGELOG.md` for that window, and
  adds one line to `cairn-releasing` step 3 for this window only. T17's Files gains that skill. It has the same
  fix as finding 6's SHA, about 5 minutes.

### 8. major, correctness: **OWNER FORK**: the set-aside order can't bind the clock it says it binds

- **Where:** `plan:71-73`, `plan:201-207`, `plan:220`.
- **Defect:** S1 says 840 "binds the run". The cuttable items sit in T1 to T12, and T14, T15, T16, T17, and
  T18 close the path, with R9, R1, and the close protected. Those last five tasks are 270 of the 825. A clock
  that passes 840 does so during or after them, when every listed item has landed. Reverting a green commit
  then costs clock, reruns CI, and risks conflict, as with #247 under #248's lines in `auth-routes.ts`. So
  the conductor's "ends at most about 2,930" has no mechanism behind it, and that figure sits past the 2,900
  line S1 itself raises.
- **Options:**
  1. A forecast check at each pair's acceptance: if actual so far plus the remaining estimates passes 840,
     skip the next unstarted items in the list. A landed green commit is never reverted to save time.
  2. Keep the list and accept that 840 is advisory, telling the conductor the run may end past 2,900.
  3. Raise the hold.
- **Recommendation:** Option 1. It costs one line in the plan, and only it makes S1 true.

### 9. major, correctness: T5's test claim is wrong, and `one-map-four-readers` is missing

- **Where:** `plan:397-399`, `plan:374-375`.
- **Defect:** "On insert and lookup" leaves out `deleteSession`, the third path. It must hash too, or logout
  clears the cookie and leaves a live row for 30 days. `auth-store.test.ts:318-320` would catch that, so the
  risk is a wrong spec and not a silent ship. "Every test reads the same" is false twice:
  `src/tests/integration/one-map-four-readers.test.ts:61-65` inserts `sid-${role}` by direct SQL with no entry
  in the plan, and `src/tests/unit/cairn-admin-actions.test.ts:229` asserts `c.args[0] === 'sid'`. Under the
  standing answer an implementer may loosen that second assertion, which is the only test that says logout
  sends a delete through the admin action.
- **Fold:** "`createSession`, `resolveSession`, and `deleteSession` hash. Seed through `createSession` at
  `one-map-four-readers.test.ts:61`. Assert the digest at `cairn-admin-actions.test.ts:229`." Add
  acceptance: logout removes the row, read by direct SQL.

### 10. major, correctness: #243 deletes the only two-name last-owner tests

- **Where:** `plan:394-396`; `src/tests/integration/auth-store.test.ts:113-154`.
- **Verified:** No production caller: `removeOwnerIfNotLast`, `demoteOwnerIfNotLast`, and `OwnerGuardOutcome`
  are reached only by tests and the fake's comments and branches. The surviving paths are
  `editors-routes.ts:128,148`, which call `deleteEditor` and `setEditorRole`. Both count owners inside the one
  statement (`store.ts:466-471,575-581`), and their race tests stay at `auth-store.test.ts:176,216`.
- **Defect:** "Their tests" goes too far. `:133-154` is the only proof that the count spans two owner-capability
  names and that a declared name with no rows isn't headcount. `deleteEditor` is tested only with `['owner']`
  or `[]`, and `setEditorRole`'s two-name case at `:99-101` is owner-to-owner. That is the guard production
  runs. Sites with a `president`-style role depend on it, and a shadow-owner bug would strand a roster.
- **Fold:** "Port `:133-154` to `deleteEditor` and `setEditorRole` before the delete." Also drop `ownerRoles`
  from `editorRowStillPresent` (`store.ts:393-408`) and its `role IN` fake branch at `fake-auth-db.ts:123-128`,
  since both go dead. Edit no comment in the three `0003_preview.sql` copies, which are applied migrations.

### 11. major, correctness: T15's acceptance grep can't see the two stamping paths, and the failure lands at step 17

- **Where:** `plan:767-771`, `plan:785-786`, `plan:803-804`; `tool/Makefile:7,17`; `.github/workflows/tool.yml:176,179`.
- **Verified:** Those two lines are the only non-Go module strings besides the install lines, `go.mod`, and
  `tool/tools/go.mod`. No golangci config names the path.
- **Defect:** Both are bare `.../tool`, so `git grep 'cairn-cms/tool/cmd'` passes with them stale, and neither is
  in T15's Files. Both feed `-X '${module}/internal/version.Version=...'`, so a stale path misses the moved
  package. I read no source for how the linker treats that and didn't run it. The workflow's own guard expects
  it to show as an unstamped build: `tool.yml:244-249` fails a tag whose `--version` doesn't open with the tag.
  That first fires on `tool/v2.0.0` at pass 9 step 17, after the stable release.
- **Fold:** Add both to Files. Acceptance: `git grep -n 'cairn-cms/tool$\|cairn-cms/tool"'` prints only
  `tool/tools` and changelogs, and `make -C tool build` then `tool/cairn --version` prints a stamped version.
  One `tool.yml` dispatch at T18 runs the release job's dry run (`:231-257`), named in Pre-flight beside the
  `e2e` dispatch.

### 12. minor, optional: limiting `confirmAction` costs more than it buys

- **Where:** `plan:405-406`, `plan:88`.
- **Defect:** The token is 256 bits and single use, so a limit here protects nothing the consume doesn't. If
  kept, it must sit before `consumeToken` (the plan doesn't say so), or a limited call burns the link.
  The cost is real: a live link reads as failed, with p2-p4's one wording, and the editor's re-request replaces a
  link that still worked. A sign-in is also two calls against one budget under one key.
- **Fold:** Limit `requestAction` only. The ruling entry records why. This shrinks T5 and removes finding 3's
  second call site. If kept, use a separate key and a position before the consume.

### 13. minor, correctness: address keying carries a published warning the plan doesn't state

- **Where:** `plan:84-88`.
- **Evidence:** Cloudflare's rate limit binding page: "It is not recommended to use IP addresses or locations
  (regions or countries)," "since these can be shared by many users in many valid cases." Also: "Requests
  served in another Cloudflare location count toward a separate limit, even with the same namespace and key."
- **Reading:** Keying on the address is still sound here. No identity exists before sign-in, and an email key
  is attacker-chosen: an attacker could spend a victim's budget. That is what the rate-limit doc comment asks
  for too. The limiter is back pressure, not a control, as `rate-limit.ts:36-38` says.
- **Residual:** A limited editor exits before `rebindToken` (`auth-routes.ts:226`), so an attacker sharing that
  address can pause the anti-lockout recovery for the window. Being on the same NAT is the precondition, and
  the window is 10 or 60 seconds, so accept it.
- **Fold:** The ruling and the `auth.rateLimit` doc comment state both, and tell a site to set a generous budget.

### 14. minor, correctness: the `throttled` reuse keeps the `Set-Cookie` claim only at one position, and its wording goes false

- **Where:** `plan:401-404`, `plan:412`; `auth-routes.ts:189-196`, `:47-52`, `:204-205`.
- **Verified:** A check placed directly after `:196` keeps the cookie on the fifth exit and runs before every D1
  read and write. The nonce isn't stable across requests, so "response bytes equal" can only hold when the
  cookie is reused. `auth.link.requested` still logs before the limit (`:186`), so a limited flood writes
  320-character records.
- **Defect:** Three texts go stale: the `LoginRequestOutcome` doc and the `:205` comment say `throttled`
  reveals membership, and the page tells a limited first-time user "You requested a link recently. Check your
  inbox". The last is false for them and is a taste call the ruling can record.
- **Fold:** Name "immediately after `mintOrReusePendingNonce`, before `findEditor`". The test sends a fixed
  pending cookie. Update both comments.

### 15. minor, correctness: S6 says the `/v2` install line can't resolve, and Go's rules read otherwise

- **Where:** `plan:108-112`; design note line 21.
- **Evidence:** go.dev/ref/mod: "If there are no tagged versions, `latest` selects a pseudo-version for the commit
  at the tip of the repository's default branch." It also documents `@master`-style branch queries, and says
  the major "must match the module's major version suffix". The subdirectory rule makes `tool/` the tag prefix,
  excluding the suffix, so `tool/v2.0.0` is a valid tag.
- **Reading:** `/tool/v2` has no v2 tag, so after the merge `@latest` should resolve to main's tip, unstamped, and
  not fail. That is an inference from the page and hasn't been run. Before the merge it fails, as stated.
- **Fold:** Reword S6 to "before the merge". The recommendation stands and the window is better than stated. The
  conductor runs one `go install` of the `/v2` line after the merge. If it resolves, step 12 has a working
  doctor, and no doc promises more. The rename can be reverted before the tag and not after.

### 16. minor, correctness: #240 can drop the BOM on the no-edit exit

- **Where:** `plan:284`; `src/lib/content/media-rewrite.ts:326,576`.
- **Verified:** Neither #240 nor #261 can drop a row or `publishedAt` through the BOM path. `parseMarkdown` strips
  a BOM before the manifest reads it (`frontmatter.ts:371`), and today's defect is a missed repoint.
- **Defect:** Both functions have an early `return { markdown, placements: [] }`. Stripping into a new name is
  safe, but renaming the input drops the BOM on that exit, so a no-op repoint changes bytes and commits. The
  frontmatter helpers take the document too, so all offsets must come from the stripped text.
- **Fold:** Acceptance adds: a BOM file with a non-matching hash returns byte-identical input, in both functions.

### 17. minor, correctness: the `--yes` skip has a path that still connects

- **Where:** `plan:496-500`, `plan:502`; `chapter3.mjs:932-937`; `chapter2.mjs:192-197`, `:495-498`.
- **Verified:** The resumed run and a crash are both sound. The reachable state is `paid-plan-declined`, since
  `builds-connect-declined` exits at `chapter3.mjs:834`. Chapter 2 deletes the token at `:465` or `:836` first, and
  `bin.mjs:248` hands chapter 3 a fresh record. The skip writes nothing, so a crash after it leaves the record
  unchanged, and a rerun reaches the same skip. `hasOpenEmailDecline` stays true and the email offer stays open.
- **Defect:** The check sits inside `if (!alreadyAdmitted)`. `deleteApiToken` removes only `apiToken`, so
  `buildsTokenSavedAt` survives from an earlier `--connect` that parked. A later `--yes` then connects, closing
  the email offer for good (`chapter2.mjs:138-139`). That matches "that answer stands" at `:489-490`, but the
  acceptance and the four docs lines state a flat rule.
- **Fold:** Keep the behavior, and add the case to `email-reoffer.test.mjs` and the docs wording. Return a named
  non-terminal outcome, and no step, so `bin.mjs:250` prints nothing extra.

### 18. minor, correctness: #199 adds a failure path to a truly new entry

- **Where:** `plan:438`; `content-routes-entry-write.ts:165-175`.
- **Verified:** A truly new entry reads null, `priorData` stays empty, and the save proceeds. A thrown read now
  returns 503 with `body` kept and `new=1` on the form, so no text is lost, and failing closed matches `:163-164`.
- **Defect:** The refusal says "the current version of this entry" to someone creating one, and T6 doesn't list
  a test for it. Acceptance covers only the existing-entry case.
- **Fold:** One test: a read that throws on a `new=1` save answers 503 with the body. Keep the sentence.

### 19. minor, optional: #200's head reuse widens a race to save one read

- **Where:** `plan:439-441`; `content-routes-entry-write.ts:169,316`; `src/lib/github/backend.ts:154-162`.
- **Defect:** The check moves from just before `createBranch` to before several GitHub reads (`:245`, `:256`). A
  stale null makes `createBranch` fail on an existing ref, and that call sits outside the `:326` catch. A stale
  non-null skips creating a branch a concurrent publish deleted. The plan leaves this to the implementer.
- **Fold:** Decide now and drop the half, saving part of T6's clock and a judgment call.

### 20. minor, correctness: a site script stops working silently, and the docs need one line

- **Where:** `plan:400`; `/var/home/glw907/Projects/907-life/scripts/mint-session.mjs:12-14,60`; `SECURITY.md:21`.
- **Defect:** The script inserts a raw id, and after the rebuild its cookie just redirects to login. T5 also
  writes a `Consumers must:` line that T17's acceptance deletes (`plan:859`), so the sign-out fact has no stated
  home. A site rebuild doesn't remove the script. `SECURITY.md:21`'s "opaque session rows" stays true but
  undersells the change, and T5 doesn't edit it.
- **Fold:** The sign-out becomes one sentence in T17's consolidated section. `## Tooling` names the script for
  907.life's rebuild. Add "stores only a digest of the session id" to `SECURITY.md`.

### 21. minor, correctness: small acceptance and reference errors

- **`plan:629-630`:** `git grep -n 'SHARD_TOTAL\|e2e report'` "prints nothing" can't pass at T10: this plan,
  the state read, and likely the changelog hold both until T17 and T18. Scope it to `.github scripts src`.
- **`plan:620`:** Dropping `e2e-report` also drops the HTML report on green runs, since the remaining upload is
  `if: failure()` (`e2e.yml:190`). T11's flake work reads retried tests. Change that upload to `!cancelled()`, or
  state that annotations are enough.
- **`plan:867-868`:** `standards:go-conventions` is a skill and can't be dispatched as a reviewer. Load it in the
  session, or name no reader, since `standards:go-architecture-reader` is request-only.
- **`plan:848`:** `docs/architecture.md:44`, `docs/why-cairn.md:69`, and `README.md:67` say each break sits in
  `Consumers must:` lines and the notes. After the reset that's false, and none is in T17's Files.

## Cleared, with evidence

- **#247 pre-deploy rows:** A row holding a raw id can't be reached after the deploy, since the cookie hashes to
  a value that matches nothing. It expires by `expires_at`, is swept at the next `createSession` (`store.ts:239`),
  and goes with `deleteEditor` by email (`:479`). A raw id can't be replayed against the digest column, and a
  digest in a stolen store hashes to nothing. Logout on an old cookie deletes nothing and clears the cookie.
- **Logs and audit:** The session paths read here log no session id. `auth.session.*` carries email, and
  `log-redaction.test.ts` covers it.
- **The test double:** `fake-auth-db.ts:93-97,217-223` matches SQL text and ignores the id, and `consumeToken` has
  no branch there, so the confirm path can't run against it. #247 needs no fake change unless `deleteSession`'s
  SQL text changes.
- **Rollback or restore:** Rolling the Worker back signs out sessions minted since the deploy, and revives old raw
  rows only for browsers still holding that cookie. Neither corrupts data.
- **T10, required checks:** `main` has no branch protection (`gh api` answers "Branch not protected"), and the one
  ruleset targets tags. `ci-green` reads `.github/ci-green.json` at the SHA under test (`~/.local/bin/ci-green:6`), so
  removing `scaffold.yml` from `expected` in the same commit can't hang. No workstation script greps `e2e report`,
  `e2e (shard`, `scaffold.yml`, `test-results-1`, or `blob-report`. `pass-gate-tiers.md:184`'s read at `<base>`
  is the protected-path list, which only flags.
- **T10, coverage:** `create-site.yml` has the same triggers as `scaffold.yml`. Five recent `main` runs took under
  four minutes against a 20-minute limit, so the two moved steps fit.
- **T7, a dropped token:** Covered in finding 17's verified line.
- **Run order, `main`:** Nothing reaches `main` until the conductor's merge, so a halt leaves `main` as `p2-p4` left
  it, and pass 9 then waits. T17 and T18's deletions are in git. The irreversible acts in reach are the
  `tool/v2.0.0` tag and the stable release, both in pass 9.
