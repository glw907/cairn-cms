# setup-fix plan: fold verification

The verification read of `standards:spec-plan-review` on the folded plan at `0f6dc52c6`
(`2026-11-02-setup-fix-plan.md`), against the fold record, the three reviews, and the design.
I had no part in the reviews or the fold. Every claim was checked against source, settings, npm,
or Cloudflare's docs.

## Result

- 0 blockers, 4 majors, 15 minors (5 of them `optional`).
- Every blocker and major from the three reviews closes at the location the fold record cites,
  with two partial closes: Fail M6 (a mode change still passes, m4) and Mech 8 (its check can't
  run under FORK 1's default, m7).
- The fold introduced two of the majors. The exit trap collides with the design's "Geoff clicks
  once" standing answer (major 4). The stable check's `--target <sha>` falls outside the granted
  release rule (major 2). Major 1 comes from the design's own stable rule and the run sheet, and
  the fold didn't catch it.
- One OWNER FORK is surfaced (inside major 1). The three existing forks can be ruled on the
  evidence the fold record gives.

## Majors

### 1. The run sheet's recapture lands after the gate, and the stable check refuses it

- **Severity:** major. **Tag:** `correctness`. Part of the fold is an **OWNER FORK**.
- **Location:** plan:533-554 (T4 part 3), plan:41-42 (#185 and #274 "keep after the gate");
  `~/.local/state/cairn-agent-first/design-audit/run-sheet.md:476-477`; design:61.
- **Defect:** Run-sheet step 14 lands the transcript recapture before step 15 cuts the stable:
  "Replace the fixtures, update `create-your-site.md` and any other quoted blocks, fact-check,
  merge". The design keeps that order ("follows the run sheet from step 14: recapture, stable,
  verify"). The stable check then reads `git diff --name-status v<next> HEAD`, and a fixture or
  docs change between `v0.99.0-rc.3` and `HEAD` is outside the nine-file list. So the check
  refuses the stable that the run sheet cuts next. No task, skill line, or close line names the
  conflict.
- **Fold:** In T4's skill text, land the recapture before the final candidate's cut (recapture,
  then `rc.N`, then the gate, then the stable). Add a close line that has the conductor reorder
  run-sheet steps 14 and 15. The other way out is an allowlist that admits the transcript
  fixtures and their docs blocks. That choice is an **OWNER FORK**: may a stable carry docs and
  fixture changes that no gated candidate carried? The design's "except for the version fields
  and the changelog heading" says no, so the reorder is the default.

### 2. The stable cut's `--target <sha>` falls outside the granted permission rule

- **Severity:** major. **Tag:** `correctness`.
- **Location:** plan:555-559 (T4 part 4); plan:168 (the pre-launch permission list).
- **Defect:** `~/.claude/settings.json` `permissions.allow` grants
  `Bash(gh release create v* --target main *)` and `Bash(gh release create v* --prerelease *)`.
  The run sheet's line 154 granted the first one for the stable cut. T4 changes the skill to
  `--target "$(git rev-parse HEAD)"`, which neither rule matches, so the irreversible cut meets a
  prompt or a refusal mid-step. A `$( )` substitution in the argument also makes the command
  harder for auto mode to read.
- **Fold:** Have the skill print the sha the check read and pass it literally
  (`--target <sha>`). Add `Bash(gh release create v* --target * --title *)`, or the narrowest
  form that fits, to the pre-launch permission row at plan:168, with its check.

### 3. On a Builds site, the plan doesn't say whether the email hop runs when the address is already written

- **Severity:** major. **Tag:** `correctness`.
- **Location:** plan:335-352 (the shared hop), plan:426-428 (#202), plan:451-454 (the crash
  points); `chapter2.mjs:918-925`.
- **Defect:** Today the sender step is `addressChanged = await writeEmailFrom(dir, from); if
  (!addressChanged) return;`, and `emailFrom` is saved after the step. The plan names a fix for
  this window only on the local path (`addressChanged || emailFrom !== from`). Take a crash after
  `writeEmailFrom` and before the reconcile commit lands. If the Builds hop keeps the
  `addressChanged` gate, the re-run finds the address already written and skips the hop. It then
  saves `emailFrom`, and the repository never gets the sender. That is #202 on the Builds path,
  which this pass claims to fold. The kick rule's `changed: false` branch implies the hop runs
  unconditionally, but no sentence or test says so. The listed crash points start only after the
  ref PATCH.
- **Fold:** State that on a connected record, the hop runs on every pass through the sender step,
  whatever `writeEmailFrom` returned, since the hash gate makes it free. Add a crash test: after
  `writeEmailFrom`, before the commit (the fake GitHub refuses once). The re-run commits the
  sender, watches one build, and saves `emailFrom`.

### 4. The exit trap tears down the install that the "Geoff clicks once" answer needs

- **Severity:** major. **Tag:** `correctness`. Introduced by the fold (Mech 21, Fail M7).
- **Location:** plan:757-758 (an unknown page "stop[s] the run with a screenshot path"),
  plan:814-816 (`run-gate.sh` traps exit and runs teardown); design:125-126.
- **Defect:** The design's standing answer is that a GitHub page the harness can't get past "stops
  that run and asks for your clicks once". In the plan, an unknown page stops the run, the exit
  trap fires, and teardown deletes the repository, Worker, and App. Geoff is left nothing to
  click, and the run can't continue after his click. The plan also never says the browser is
  headed, which a click by hand needs.
- **Fold:** On an unknown page, `browser.mjs` holds the page open in a headed window and waits up
  to the step's 10 minutes for the click, under a notification at normal urgency. Only a timeout
  fails the leg, and the trap runs after that. A test checks that the trap doesn't run while the
  page is held.

## Minors

### m1. T1's seeded Chapter 3 records route into chapter 2 once T2 lands

- **Severity:** minor. **Tag:** `correctness`.
- **Location:** plan:301-304 (T1 acceptance), plan:381-384 (T2 routing), plan:190-200 (the pin
  list).
- **Defect:** T1 seeds "a `builds-live` record with a domain" and "a `builds-connect-declined`
  record with a domain and no open email decline". Without `domainLiveAt` (a field T2 adds) and
  without an email field, T2's "stranded" rule sends both into chapter 2. Neither test is on the
  pin list.
- **Fold:** T1 seeds both with `emailOnboardedAt`, which keeps them out of chapter 2 under T2
  (plan:406).

### m2. FORK 2's "newest message" can be the monitor's probe

- **Severity:** minor. **Tag:** `correctness`.
- **Location:** plan:789-793 (B2, FORK 2).
- **Defect:** `probe@probe.907.life` also receives "the monitor's daily inbound probe"
  (`~/Projects/servers/docs/addresses.md:60`). Its newest message can therefore be that probe or
  an earlier run's mail. A new domain's first mail may also arrive late or land in Junk (the
  CLI's own warning, `chapter2.mjs` completion copy).
- **Fold:** Poll within a stated budget for a message received after the request, addressed to
  the gate owner, with the sign-in subject, in any mailbox. Then assert its From.

### m3. The `autoMode` allow numbers are off by one, and the run sheet has no path

- **Severity:** minor. **Tag:** `correctness`.
- **Location:** plan:145-154, plan:229-230, plan:851; fold record:63, :141.
- **Defect:** In `~/.claude/settings.json`, the approval-queue merge is allow 7, the cairn
  worktree `.claude/skills/` rule is allow 10, and the live-smoke merge word is allow 11, not 6,
  9, and 10. Allow 6 is the worktree stash rule, and allow 9 is the mail cutover. The content the
  plan quotes is right. `run-sheet.md:27` is cited with no path; the merge word sits around line
  27 of `~/.local/state/cairn-agent-first/design-audit/run-sheet.md`.
- **Fold:** Cite each rule by a quoted phrase, and cite the run sheet by its full path.

### m4. The stable check still passes a mode change

- **Severity:** minor. **Tag:** `correctness`.
- **Location:** plan:533-537; fold record:30 ("a binary, mode, or rename change fails").
- **Defect:** `git diff --name-status` reports a mode-only change as `M`. On an allowlisted file
  that change shows no `+` or `-` line, so it passes. That's half of Fail M6, still open.
- **Fold:** Read `git diff --raw` and refuse a change of mode. Add the test.

### m5. One classifier entry has no source, and it contradicts the pre-flight

- **Severity:** minor. **Tag:** `correctness`.
- **Location:** plan:751; plan:170.
- **Defect:** "Cloudflare's Workers and Pages App install, on the first run" has no
  `openBrowser` call behind it. Every call site is `prefill.mjs:282`, `chapter.mjs:276`,
  `install.mjs:239`, `manifest.mjs:165`, `oauth.mjs:108`, and `bin.mjs:351`. The pre-flight row
  added by the plan now installs the App by hand in the dashboard.
- **Fold:** Delete the entry. Its fixture and test go with it.

### m6. T6a's integration test has no source for the token error

- **Severity:** minor. **Tag:** `correctness`.
- **Location:** plan:718-724.
- **Defect:** The fake Cloudflare accepts any bearer, as `resume-chapter3.test.mjs:276-278`
  notes. So "answers with an invalid token and asserts the token error" can't raise the error
  there. Without `apiBase`, `validateToken` instead calls the live `api.cloudflare.com` from a
  unit test. An underscoped paste also gets a second ask (`prefill.mjs` "exactly one more
  try").
- **Fold:** Point the test at the fake, arm `failNext('zone_list', ...)` for both tries, and give
  the table both answers.

### m7. The Builds-connection pre-flight check can't run under FORK 1's default

- **Severity:** minor. **Tag:** `correctness`.
- **Location:** plan:170.
- **Defect:** `PUT .../builds/repos/connections` is a Builds route. Cloudflare says it "requires a
  user-scoped API token", so with the default account-owned gate token the check fails whether
  or not the App is connected.
- **Fold:** Name the token the check signs with, and order the check after FORK 1 is ruled.

### m8. The restore rule doesn't name the `--yes` park

- **Severity:** minor. **Tag:** `correctness`.
- **Location:** plan:366-371; plan:457-458.
- **Defect:** "Restored exactly when the reconcile commit did not land" lists four causes. A park
  also lands no commit, and the `--yes` test expects the origin left on disk, which the
  following interactive run needs.
- **Fold:** Add "except the `--yes` park, which leaves the origin for the next run to commit".

### m9. A `docs/STATUS.md` edit in the stable cut commit fails the check

- **Severity:** minor. **Tag:** `correctness`.
- **Location:** plan:555-559; `.claude/skills/cairn-releasing/SKILL.md:157-158` ("plus STATUS
  if it is part of this cut").
- **Defect:** The skill invites a STATUS edit in the cut commit, and the new check refuses it.
- **Fold:** T4's step-6 edit says a stable cut commit carries only the version fields and the
  headings, and STATUS lands after the release.

### m10. No task owns the sweep commit

- **Severity:** minor. **Tag:** `correctness`.
- **Location:** plan:32-34.
- **Defect:** "The keeps, rewords, and dones land in this branch's first commit", but no task or
  standing answer gives that `BACKLOG.md` edit to anyone.
- **Fold:** Name the owner, the executor before T1, and its clock.

### m11. T1's "if started" clause passes when the fake never starts

- **Severity:** minor. **Tag:** `optional`.
- **Location:** plan:296.
- **Defect:** "The fake Cloudflare, if started, recorded no Builds request" passes vacuously when
  the fake isn't started.
- **Fold:** Start the fake and assert zero Builds routes, or drop the clause.

### m12. `standards:svelte-reviewer` on one string literal is over-ceremony

- **Severity:** minor. **Tag:** `optional` (over-ceremony).
- **Location:** plan:845.
- **Defect:** The reviewer is dispatched to read one string literal change.
- **Fold:** Drop it. The whole-branch review covers that line.

### m13. The ROADMAP line numbers are off

- **Severity:** minor. **Tag:** `optional`.
- **Location:** plan:513.
- **Defect:** The `next` wording sits at `ROADMAP.md:30`, `:34`, and `:36`, and the beta line at
  `:36` also says `next`, not at `:30` and `:33`.
- **Fold:** Cite the three lines.

### m14. A fold record row contradicts itself

- **Severity:** minor. **Tag:** `optional`.
- **Location:** fold record:111.
- **Defect:** The Fail M10 row reads "Forked (fork 3). Not a fork, and folded into T6b".
- **Fold:** Write it as "Forked (fork 3); its exact-version half is folded into T6b".

### m15. T5's `rebuild` search reaches T3's two pages

- **Severity:** minor. **Tag:** `optional`.
- **Location:** plan:624-627.
- **Defect:** T5's search for `rebuild` runs before T3, and its hits include the two pages T3 owns.
- **Fold:** Exclude `rotate-the-github-app-key.md` and `publish-and-history.md` from T5's search.
## The six questions

1. **Blockers and majors at their cited locations.** All close in the plan text: Mech 1 and Fail
   M9 (finding 7, the pre-flight token row, FORK 1); Mech 2 (T1 and T2 acceptance are module-level
   or bin stops at no network); Mech 3 and Con M1 (the scoped greps, which I ran: every hit is in
   the owning task's files); Con B1, Mech 4, and Fail M6 (T4 part 3, partial, m4); Fail B1
   (teardown identity); Mech 5 to 7 (T6a and T6b); Mech 8 (the pre-flight row, partial, m7); Mech
   9 to 14; Con M2 to M7; and Fail M1 to M8. Mech 12's captured fixtures and Fail m2 and m3 are
   refused, each with a stated reason.
2. **Contradictions and order.** The Path table sums to 620, each pair's files are disjoint, and
   `CHANGELOG.md` has one writer at a time. T5 waits for Pair B, T6b follows T6a, and T3 follows
   T5. The fold's contradictions are majors 2 and 4, and m1 (T1 against T2's routing) and m5
   (the classifier against the pre-flight).
3. **New mechanisms against source.** All correct:
   - The effective-step table: `chapter2.mjs:97-100` reads an unlisted step as `live`;
     `domain-live` is written at `:801`; `records.mjs:181-190` throws on a delegated domain.
   - The settle order: `bin.mjs:292-312`, where `declined` is true for `admission-declined`;
     `buildsDeclineStands` sits at `chapter2.mjs:491-498`.
   - The kick rule: `performReconcile` returns `changed: false` on the hash match
     (`chapter3.mjs:244-245`), and the kick call has the shape quoted.
   - Teardown identity: `config.mjs:91-115` names D1 `<slug>-auth` and R2 `<slug>-media`, both
     carrying the prefix; the uuids sit at `chapter3.mjs:1066` and `:1117`; the shared build token
     name is at `:95`; adoption by `cloudflare_token_id` is at `:1088-1100`.
   - The stable allowlist matches `git show --stat 1ae692ae1` exactly: 9 files, and the line
     shapes check out.
   - The keystroke rules match `@clack/core` 1.5.1 at `dist/index.mjs:300` and `:463-464`, and
     `S_STEP_ACTIVE = unicodeOr("◆", "*")` in `@clack/prompts` 1.8.1. `S_SUCCESS` shares
     that glyph, but the CLI never calls `log.success`.
   - The Builds docs quotes are verbatim on both pages. The three DELETE routes appear in
     Cloudflare's `workers_builds` API reference.
   - The remaining citations check out: `open.mjs:65` prints the URL on a TTY; `hold-loop.mjs:35`
     and `:172`; `robots.txt/+server.ts:10` is prerendered; `requireOrigin` is called only at
     `auth-routes.ts:236` and `content-routes-preview.ts:65`; the App name equals the slug
     (`github/chapter.mjs:161`), so 31 characters.
4. **Forks.** Each one can be ruled on the evidence given:
   - FORK 1: the docs quotes and the inventory's rule 2 (`cloudflare-estate-inventory.md:42-44`).
     A "no" leaves the gate unable to pass at all, which the record says.
   - FORK 2: needs m2's fold to be sound, though not to be ruled.
   - FORK 3: `npm view` today shows `create-cairn-site` `latest: 0.99.0-rc.1`, `next:
     0.99.0-rc.2`.
5. **Acceptance that passes vacuously, or a grep the task can't clear.** All three greps clear in
   their own tasks. The vacuous ones left are m11 and T6a's token error (m6). T6b's hand-built
   GitHub fixtures prove only the classifier, a limit the fold record states and the standing
   answer accepts.
6. **Live resources, credentials, and publishes.** Only T6a's smoke reads a credential or writes a
   live resource. Its writes are `cairn-e2e-gate-probe-*` D1, R2, and build-token rows, each
   deleted by its returned id. No task publishes, and no task touches `cairn-rc2-install`: the
   teardown reads only the gate's own run directories and checks the prefix. The pre-flight
   Builds-connection check creates a machine-account repository, but the conductor runs it after
   the merge, so it isn't a pass task. No step reads a refused credential another way.
