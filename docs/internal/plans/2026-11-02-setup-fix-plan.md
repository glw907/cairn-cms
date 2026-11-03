# setup-fix plan

- **Pass:** `setup-fix`, the setup fix and the pre-cut release gate. Class `auth-data`
  (`packages/create-cairn-site/src/{github,cloudflare}/**`) plus `runner` (`.github/workflows/**`,
  `scripts/checks/**`, and `scripts/gate/**`, which T6a adds to the adapter's runner line).
  Initiative: `shared-standards`.
- **Design:** `2026-11-02-setup-fix-design.md` beside this file, approved 2026-11-02 in packet
  `20261102T213128-1466750`, revision 1 (the unattended gate) approved in packet
  `20261102T221501-1497206`. Its "Calls the conductor made" and "Standing answers" stand.
  Revision 2 (merged at `34ac945f3`) makes the gate token user-owned through `tmp-token-setup` and
  adds the machine account's GitHub token and the Workers Builds connection to its pre-flight; its
  three decisions are open for Geoff, and the conductor has ruled each recommendation as the
  default pending his word.
- **Base:** `main` at `1ae692ae1`, plus the design at `3c78ef3ab`. **Branch:**
  `worktree-setup-fix-pass`, pushed to `glw907/cairn-cms`.
- **Estimate:** design 540 path minutes, ceiling 1,080. Plan path **665** (below), after the review
  fold and the verification fold, plus 10 for the magic-link sign-in. No cut is planned. Cut order if a run passes the ceiling: the quiet build (T1 part 3), then
  T6b's App deletion by browser (leave the Apps for a hand cleanup and file it), then fork 2's email
  read.
- **Executor:** Sonnet medium, `cairn-cms-setup-fix`. T2 upshifts `cairn-implementer` to Opus at
  `high`. The conductor is the session `launch-cairn-planner-session`; the executor takes
  instructions from it alone.
- **Ends at PR-ready.** No bump, no publish. The `rc.3` cut, the gate, and promotion are the
  conductor's release steps after the merge. This plan's own proofs are unit, integration, CI, and
  one credential smoke (T6a) that writes only throwaway `cairn-e2e-gate-probe-*` resources.
- **Open points (design revision 2's three decisions, fold record "Owner forks"):** each is marked
  `FORK n` where it lands. All three are settled yes: Geoff ruled FORK 1 in packet
  `20261102T231208-1546926`, and FORK 2 and FORK 3 rode that packet as the conductor's calls,
  unreversed. The same packet granted the stable-cut rule, so the conductor cuts the stable.
- **The gate mailbox (Geoff, 2026-11-02: "we can create an email account specificially for
  automated testing"):** the gate's owner address and the machine account's GitHub email are
  `cairn-gate@probe.907.life`, a dedicated ward mailbox (password `STALWART_PASSWORD_CAIRN_GATE`),
  added by a servers-repo PR. FORK 2 grows into a real magic-link sign-in on B2.
- **The machine account is `glw907-test`,** the workstation's one shared GitHub test account
  (`~/.claude/docs/test-accounts.md`), 2FA on, its credentials in the age store as
  `GITHUB_TEST_*`. Its page gotchas, found setting it up on 2026-11-03, bind T6b: wait on `load`
  plus a short pause, never `networkidle` (GitHub holds live connections); never screenshot a page
  showing a secret, since a screenshot read into a session lands in its transcript.
  - FORK 1, a user-owned `ws-cairn-gate` minted through `tmp-token-setup`: default yes. It changes
    no task, only the Pre-flight token row.
  - FORK 2, the gate reads a sign-in email's From and signs in through its link: yes. It changes
    T6b.
  - FORK 3, promotion also moves `create-cairn-site@latest`: default yes. It changes T4.

## Sweep verdicts

A fresh scoped sweep at `5ca74df33`, by a read-only agent, against the design's sweep as
baseline. Three verdicts differ from the design: #206 and #202 fold, #245 rewords. The keeps,
rewords, and dones landed in this branch's sweep commit, `6ec019cb7` (`BACKLOG.md` only), made by the
planning session. Folds close at the pass close. The drop
waits for Geoff's word in the packet.

| Item | Verdict | Reason |
|---|---|---|
| #317 | fold, T2 | The `--yes` Builds skip it would preview is deleted: `chapter3.mjs:948` `if (args.yes && !args.connect && hasOpenEmailDecline(record)) {`. |
| #206 | fold, T2 | T2 sends `builds-live` records back into chapter 2, and `chapter2.mjs:99` `return idx === -1 ? 0 : idx;` reads every chapter 3 step as `live`, so T2 must derive the effective step from the record's fields anyway. |
| #202 | fold, T2 | T2 rewrites the email hop that holds the crash window: `chapter2.mjs:918-921` writes the address, skips the deploy on `if (!addressChanged) return;`, and saves `emailFrom` only after (`:925`). |
| #185 | reword, keep for the recapture before the final candidate | The quiet build removes the build-path lines; the deploy's asset list and the stale closing lines stay for the recapture, which lands before the final candidate's cut (T4's skill text). |
| #274 | keep for the recapture before the final candidate | Needs a real recapture. |
| #245 | reword, keep | The scoped token landed in 28ada0fba, before `rc.1`; the gate's publishes run through it. What stays unproven is a Contents-only App on the adopt path. |
| #246, #304, #204, #302, #324, #168, #331 to #335 | keep | Outside the pass's files or blocked elsewhere. |
| #205 | keep | Moving `id-token` to job level narrows nothing while every job publishes. T4 writes the new promote job with job-level permissions and no `npm ci`, so the pass doesn't widen it. |
| #195 | done | The hand publish, the trust binding, and the first OIDC run happened (`1ae692ae1`); its install half is now the gate. |
| #300 | done | `audit-rules.md` no longer carries the claim. |
| #330 | drop, for Geoff | Both CHANGELOG lines describe removals, correctly. Strongest case for keeping: one finder, no verifier. A grep of CHANGELOG and MIGRATION-NOTES finds only those two lines. |

A full sweep is due: 46 of 61 open items carry no `swept` stamp. It folds nothing here, so it goes
to the conductor as a separate triage list after this pass, not to the executor.

Found while planning, not this pass's work (the executor files them, numbered past the highest on
`main` at merge, #335 today):

- `create-cairn-site@latest` is `0.99.0-rc.1` (Geoff's hand publish), so a bare
  `npx create-cairn-site` serves the candidate with the default-path bug until a stable moves
  `latest`. FORK 3 closes it at the first promotion; file it only if FORK 3 is answered no.
- `@glw907/cairn-cms` still carries a stale `rc: 0.6.0-rc.1` dist-tag.
- A record parked mid chapter 2 with no Builds, then run with `--connect`, still has chapter 3
  overwrite its step on releases before this one. T2 finishes such a record on its next plain re-run
  (the "stranded" routing); nothing earlier repairs it.

## Findings that shape the plan

Each was checked at the cited source. None changes the approved design's outcome; finding 7 is now
design revision 2's own call. Each changes how a task reaches the outcome, and the conductor has
them.

1. **The stray spinner frame is npx's, and a terminal erases it.** The `rc.2` capture's last bytes
   are `⠙ ESC[1G ESC[0K` after the closing text: npm's exec spinner draws one frame and erases its
   line. The tool has no spinner (`grep -rn spinner` over `src` finds none). Run through
   `transcript-blocks.mjs`'s `renderTranscript`, the capture's last line is the doctor line and holds
   no frame. The design's "the closing block ends cleanly" already holds, so no code changes for
   it; T1 records the evidence under `## Decisions`.
2. **`CAIRN_CF_API_TOKEN` is read only under `--yes`.** `prefill.mjs`'s `ensureApiToken` reads it
   inside `if (yes) {` and, without `--yes`, opens the prefill page and asks
   `Paste your Cloudflare API token` (`prefill.mjs:113`). The design's driver runs without `--yes`,
   so the harness answers that paste prompt with the gate token, and the browser half skips the
   prefill URL (`prefill.mjs:282`). No seam is added.
3. **The gate token and `wrangler whoami`.** `deploy.mjs:100` skips `wrangler login` only
   when `whoami` prints `/you are logged in/i` (`deploy.mjs:48`), and a fresh run reads
   `whoami --json`'s accounts (`account.mjs:61-79`). Whether both hold for the gate token is
   unproven; T6a's smoke reads them on the template's wrangler.
4. **The teardown rule covers repositories on `glw907` only.** `settings.json` allows
   `Bash(gh repo delete glw907/cairn-e2e-* --yes)`. The gate's repositories live on the machine
   account, and no rule covers Worker, D1, R2, custom domain, Builds, or App removal, or
   `gh workflow run publish.yml`. Both go in the pre-launch permission list below.
5. **The machine account needs an API token.** Repository teardown on the machine account and the
   pre-flight `gh api user` check both need one; a password and TOTP secret reach only the browser.
6. **A domain decline now dead-ends at `builds-connect-declined` unless chapter 2 reopens there
   too.** Today a declined domain leaves the record at `live`, and a re-run asks again
   (`bin.mjs:538-561`). After T1, a declined domain goes on to the Builds offer, and a declined
   Builds offer writes `builds-connect-declined`, whose re-run branch (`bin.mjs:615-639`) only
   prints. T2 reopens the domain offer at both chapter 3 terminal steps when the record has no
   domain, which keeps the design's "connecting a domain still works after Builds".
7. **The Builds API refuses account-owned tokens (design revision 2, FORK 1).** Cloudflare: "The
   Builds API requires a **user-scoped** API token. Account-scoped tokens are not supported and will
   return 'Invalid token' errors" (<https://developers.cloudflare.com/workers/ci-cd/builds/api-reference/>),
   and for build tokens "only user tokens are supported, with account-owned token support coming
   soon" (<https://developers.cloudflare.com/workers/ci-cd/builds/configuration/>). Chapter 3 calls
   `GET /user/tokens/verify` (`api.mjs:558`) and registers the pasted token as the build token
   (`chapter3.mjs:1088-1100`). So an account-owned `ws-cairn-gate` would fail legs A2, B1, and B2,
   and revision 2 mints it user-owned, as a recorded exception to the token scheme's rule 2. No CLI
   change is planned: a user-owned token passes `/user/tokens/verify` as it is. T6a's smoke gives
   the live verdict.
8. **The reconcile commits whole files.** `reconcileRepo` uploads the local `wrangler.jsonc` and
   `src/theme/cairn.config.ts` whole when either differs (`reconcile.mjs:96-133`). Weeks after Builds
   went live that can revert a developer's edit made through GitHub, so T2's chapter 2 hop guards
   it with the tool-owned values masked.
9. **D1 and R2 have no recorded ids.** Wrangler binds them by name and "never writ[es] an id back"
   (`config.mjs:78-81`), and the record holds no build-token uuid (`chapter3.mjs:1088-1117`). So
   teardown identifies D1 and R2 by the exact names in the install's own `wrangler.jsonc`, and never
   deletes the build token registration, which every install of the gate token shares under the
   production name `cairn create-cairn-site build token` (`chapter3.mjs:95`).

## Planning misses

The conductor ruled these planning misses at the design stage (2026-11-02). The PR body's
`## Planning misses` carries each, with the planning step that should have caught it.

- **The machine account's GitHub API token** (finding 5, a Pre-flight row). Revision 1 named a
  password and a TOTP secret, which reach only the browser. Repository teardown and the `gh api user`
  check need an API token. The design's pre-flight should have walked each live action the harness
  takes to the credential that signs it.
- **The Workers Builds GitHub connection in Geoff's Cloudflare dashboard** (a Pre-flight row).
  Revision 1 had the first harness run install Cloudflare's App on the machine account, but the
  connection starts from a Cloudflare dashboard session, which Playwright doesn't hold. The same walk
  catches it: each browser step, and whose session it runs in.
- **The account-owned gate token** (finding 7, settled by design revision 2). Revision 1 picked an
  account-owned `ws-cairn-gate` by the token scheme's rule 2 without checking the Builds API's token
  requirement. The design's credential call should have quoted the API docs of every route the token
  signs.

## Pre-flight

Read every task for owner steps, credentials, and writes against auto mode. The executor needs no
credential before T6a's smoke; the conductor's ruling holds the launch until the gate's Cloudflare
token and machine-account sign-in are in the store, so the smoke runs in the pass. The two items
marked "added by the plan" (now also in design revision 2's pre-flight) block no executor task: the
smoke skips its GitHub-token checks when the token is absent, and no task connects Builds. The
conductor carries both to Geoff before the first gate run.

Permissions checked: each task's writes were read against `autoMode` in `~/.claude/settings.json`
and the repo's `.claude/settings.json` (no `autoMode` block). `.claude/skills/cairn-releasing/SKILL.md`
(T4) and `.claude/skills/cairn-running-passes/SKILL.md` (T6a) ride `autoMode` allow 10, the cairn
run sheet's rule ("edits and commits to CLAUDE.md files and to files under .claude/skills/ and
.claude/rules/ are allowed when they implement a task of a plan under that sheet"); a write was
probed here on 2026-11-02 and reverted. `.github/workflows/publish.yml` (T4) is an ordinary worktree edit on a
protected path. No task writes `CLAUDE.md`, `.claude/rules/`, settings, or hooks. T6a's smoke
runs `bash scripts/gate/run-gate.sh --smoke`, which sources `~/.local/secrets` itself, the pattern
`CLAUDE.md` names for a script; no other task reads a secret. **Merge:** this is an `auth-data` PR
and the live admin smoke is not run (see Standing answers), so `autoMode` allow 11's condition ("a
PR on an `auth-data` path also has its security read and live smoke") and the merge word in
`~/.local/state/cairn-agent-first/design-audit/run-sheet.md:27` ("an `auth-data` path adds the
security read and the live smoke") are unmet. The PR merges only under allow 7 ("after an
`approval-queue packet` call naming that PR returned a decision whose part for it has verdict
approve and that head"), on Geoff's approve verdict for its head. A refused write or credential
read is a stop for the conductor, never a thing to route around, and no step reads a credential
another way.

Reviewed: `standards:spec-plan-review` at the depth its table sets for `auth-data` plus `runner`,
with three lenses, each a fresh reviewer: mechanics and the workstation lens
(`2026-11-02-setup-fix-plan-review-mechanics.md`), contract and criteria
(`-review-contract.md`), and failure risk (`-review-failure.md`), folded per
`2026-11-02-setup-fix-fold-record.md`. A fresh verification read of the folded plan ran
(`2026-11-02-setup-fix-fold-verification.md`: 0 blockers, 4 majors, 15 minors) and was folded per
the fold record's "Verification" section.

| Item | Who, when | Check that shows it done |
|---|---|---|
| GitHub machine account on the email `cairn-gate@probe.907.life`, 2FA on, its password and TOTP secret in the age store as `GITHUB_TEST_PASSWORD` and `GITHUB_TEST_TOTP_SECRET`, its login as `GITHUB_TEST_LOGIN`, Proton Pass holding the record | Done 2026-11-03 (`glw907-test`) | `grep -oE '^export (GITHUB_TEST_LOGIN\|GITHUB_TEST_PASSWORD\|GITHUB_TEST_TOTP_SECRET)=' ~/.local/secrets` prints three names, never a value |
| A classic token for the machine account, scopes `repo` and `delete_repo`, as `GITHUB_TEST_TOKEN` (finding 5; added by the plan, now in design revision 2's pre-flight) | Done 2026-11-03, no expiry | `bash -c 'source ~/.local/secrets && GH_TOKEN="$GITHUB_TEST_TOKEN" gh api -i user'` shows the machine login and an `X-OAuth-Scopes` header naming `repo` and `delete_repo` |
| `ws-cairn-gate`, minted from chapter 3's eight keys (`CHAPTER3_PERMISSION_KEYS`, `prefill.mjs:79`: Zone, DNS, Workers Scripts, SSL and Certificates, Email Sending, Workers Builds Configuration, D1, Workers R2 Storage, each edit), every zone-level group limited to `carin-test.org`. **User-owned**, minted through `tmp-token-setup` (inventory item 6; design revision 2, **FORK 1** default), its inventory row recorded as an exception to rule 2 until Builds accepts account-owned tokens. Age store `CF_WS_CAIRN_GATE_TOKEN`; inventory row added; the temporary token deleted. If Geoff answers FORK 1 no, the token is account-owned through `tmp-account-tokens` and the gate's Builds legs run on his browser sign-in (design revision 2) | `[you]` makes the temporary token; the conductor mints, stores, and deletes, before launch | The T6a smoke's verdicts (it calls both verify routes, the Builds routes, and the write probes, through Node `fetch`, never `curl` argv) |
| Pre-launch permission list (finding 4): `Bash(bash scripts/gate/run-gate.sh *)`, `Bash(gh workflow run publish.yml -f promote=*)`, and, for the stable cut's literal sha (T4), `Bash(gh release create v* --target * --title *)`. The existing `Bash(gh release create v* --target main *)` and `Bash(gh release create v* --prerelease *)` match neither `--target <sha>` form, and a glob can't narrow a sha further | `[you]`, one workstation PR, before launch: T6a's smoke runs the first | All three strings appear in `~/.claude/settings.json`'s `permissions.allow` |
| "Allow npm dist-tag" on the `publish.yml` trusted publisher of `@glw907/cairn-cms`, `@glw907/cairn-cms-dev`, and `create-cairn-site`: npmjs.com → the package → Settings → Trusted publishing → the configuration → tick **Allow npm dist-tag** → save. Off by default (<https://docs.npmjs.com/trusted-publishers>, "Managing dist-tags with trusted publishing") | `[you]`, after the merge, before `rc.3` | The box shows ticked on all three settings pages. That is all this check proves: a no-op promotion writes nothing, since `npm dist-tag add` returns "is already set to version" before its authenticated request. The first real promotion, `rc.3` to `next`, is the probe; if it reports the trusted publisher cannot manage dist-tags, the design's fallback stands and promotion becomes Geoff's `npm dist-tag add` in a sitting |
| Added by the plan, now in design revision 2's pre-flight: Cloudflare's Workers and Pages GitHub App connected to the machine account with **All repositories**, through Geoff's Cloudflare dashboard (`catalogue.mjs:703`'s route: `https://dash.cloudflare.com/?to=/:account/workers-and-pages`), since Playwright holds no Cloudflare session and a selected-repositories install parks every new gate repository at `builds-repo-not-selected` (`chapter3.mjs:1053`) | `[you]`, before the first gate run; blocks no executor task | After `ws-cairn-gate` is minted user-owned (the Builds routes take only a user token), the conductor creates a throwaway `cairn-e2e-gate-probe-<ts>` repository on the machine account with `GITHUB_TEST_TOKEN`; `PUT .../builds/repos/connections` for it, signed with `ws-cairn-gate`, answers 200; then it deletes the connection by its returned uuid and the repository |
| `carin-test.org` has Email Sending on, and the account is on Workers Paid | conductor, before the first gate run | Email Sending: `GET /zones/:id/email/sending/subdomains` (`api.mjs:528`) with the gate token. Workers Paid: no token can read the plan (`GET /accounts/{id}/subscriptions` answers 10000), so the record is `~/.claude/docs/cloudflare-estate-inventory.md:4-6` |
| The gate's owner address accepts mail and is not Geoff's inbox | conductor, before the first gate run | `GATE_OWNER_EMAIL=cairn-gate@probe.907.life`, the gate's own ward mailbox, password `STALWART_PASSWORD_CAIRN_GATE` in the age store; the servers PR that adds it is merged and deployed, and a JMAP session request to `https://907.life/.well-known/jmap` with that login answers 200. The machine account's GitHub email is the same address |
| The gate host | conductor, before the first gate run | The host it names has the age store synced and `npx playwright install chromium` done; the smoke prints `hostname` |
| Geoff's own install, install B's first leg in his browser | `[you]`, once per stable, before the cut (design) | His published edit fetched from the workers.dev address |

The npm probe, done here from npm's docs, publishing nothing: the control is the **Allow npm
dist-tag** box on a package's trusted publisher configuration, off by default; with it on, a
workflow runs `npm dist-tag add <pkg>@<version> <tag>` directly and the CLI authenticates through
OIDC; it needs npm 11.21.0 or later on the 11 line (`npm@11` resolves 11.21.1 today); the
configuration binds the workflow filename, so a `workflow_dispatch` trigger inside `publish.yml`
itself matches (the docs' caveat is about a separate dispatcher workflow, where "validation checks
the calling workflow's name"). `npm trust` has no dist-tag flag and `npm trust list` documents no
permission field, so the settings page and the first real promotion are the checks.

## Standing answers

The design's standing answers and the run sheet's "Standing answers for every pass" all apply. For
this pass:

- **A test pins old behavior:** change it and list it. Expected: `email-reoffer.test.mjs:262-310`
  (the `builds-skipped` outcomes); `resume-chapter2.test.mjs:279-334` (`--yes`, no `--domain`, at
  `live`: now enters chapter 3 and stops at the token hop) and `:695-731` (the same shape);
  `resume-chapter2.test.mjs:529` and `resume-chapter3.test.mjs:259-299` (`Skipping Workers Builds`);
  `resume-chapter3.test.mjs:880` (the "until Workers Builds is connected" line);
  `catalogue.test.mjs:451`; `resume-chapter3.test.mjs:218-222` (the `builds-live` note);
  `chapter3.test.mjs:1603` (the id `'builds-skipped-site-abc123'`, renamed); and the four
  publish-message assertions in T3. `resume-chapter3.test.mjs:457`, `:507`, and `:802` still pass on
  the substring `Workers Builds is not connected`, which the new sentence keeps, so each gains an
  assertion on `does not change`. `chapter2.test.mjs:407` and `:641` assert the module outcome
  `admission-declined`, which T1 keeps; leave them.
- **A stale transcript block:** a fixture is never edited. T5 may end the marked block at
  `create-your-site.md:108-114` one line early, before `This site is set up end to end.` (`:113`), if
  `npm run check:transcripts` passes on it; otherwise it leaves the block and lists it for #185.
- **May escalate (set aside, filed, listed in `## Decisions`) after a cause returns past its
  structural fix:** the quiet build; T6b's App deletion by browser. **May not:** T1's routing, any
  part of T2, T3, T4's tag, promote job, and stable check, T6a's driver and fetch check. Those stop
  with one question in STATUS and a `SendMessage` to the conductor.
- **Clock:** `.pass-task-clock` at the worktree root. Past twice a task's estimate, stop for the
  conductor.
- **T6a's smoke fails a credential check** (a verify route, `wrangler whoami`, a Builds route, a
  write probe): record the verdicts under `## Decisions`, tell the conductor, and keep going. T2,
  T3, T4, T5, and T6b's unit work continue, the PR opens, and the PR body lists the harness as
  blocked on that verdict. A Builds-route failure on a user-owned token is a credential finding for
  the conductor, not a harness bug. Any other
  smoke failure with a traced cause in the harness is fixed forward.
- **CI per pair:** after each pair lands on the branch, read CI on the head and list any red check
  under `## Decisions` with its cause before the next pair starts.
- **A GitHub page the harness can't drive in T6b's tests:** T6b's tests use hand-built page
  fixtures, never live GitHub. A live page change is the gate's standing answer, not the pass's.
- **New BACKLOG item:** the next free number on `main` at merge; the PR names placeholders.
- **A conflicting PR fires no `pull_request` CI.** At the first conflict, tell the conductor and
  merge `main` on its word, keeping both `## Unreleased` entries and running `npm run emit:template`
  and `npm run check:surface -- --update`.
- **Gates:** every task is `auth-data` or `runner` except T3 and T5 (ordinary). `RUN_GATE_IF_BUSY=defer`
  is never set on T1, T2, or T6a. A diff under `packages/create-cairn-site/src/` selects
  `make -C tool check` through `toolInputs`, so Go and Vale run on T1 and T2.
- **The live admin smoke** on the close checklist is not run: no engine auth path changes here (the
  `auth-data` paths are the setup CLI's), and the gate after the merge is the live proof. The
  executor records it as not run, with this reason, under `## Decisions`. Because the run sheet's
  merge word and `autoMode` allow 11 require the smoke for an `auth-data` merge, this PR merges only
  on Geoff's approval-queue verdict (allow 7), and the PR body says so.

## Path

| Step | Tasks | Path |
|---|---|---|
| Pair A | T1 (80) beside T4 (150) | 150 |
| Pair B | T2 (275, Opus high) beside T6a (150) | 275 |
| Pair C | T6b (190) beside T5 (67) then T3 (20) | 190 |
| Close | whole-branch review, two security reads, fold, CI, PR body | 50 |
| **Total** | | **665** |

Each pair's two sides touch disjoint files. T5 reads T1's and T2's final copy, so it waits for
Pair B. T3 runs after T5 on the same side, so `CHANGELOG.md` has one writer per side at a time.
T4 carries the gate step (formerly T7), which needs only the two `run-gate.sh` commands this plan
fixes. In Pair A only T1 writes `CHANGELOG.md`; T4's line is T5's.

## Tasks

### T1. The default path reaches Builds, and every closing block says whether a publish goes live

80 min, `auth-data`. Sonnet medium.

- **Files:** `packages/create-cairn-site/bin.mjs`, `src/cloudflare/deploy.mjs`, their tests under
  `src/` and `test/`, `CHANGELOG.md`, `MIGRATION-NOTES.md`.
- **1. Routing.** Today a declined domain stops: `chapter2.mjs:551-552`
  `if (!dryRun && !consented) {` / `return { outcome: 'admission-declined' };`, and
  `continueIntoChapter2` sends every outcome outside `TERMINAL_STEPS` to `printLiveInfo`
  (`bin.mjs:310-312`, `} else {` / `await printLiveInfo(siteId);`). Make the terminal branch at
  `bin.mjs:292`, `if (TERMINAL_STEPS.includes(outcome.outcome)) {`, also take `admission-declined`,
  so it prints the repo-and-doctor block (`bin.mjs:307-308`) and runs `runChapter3AndReport`, as a
  terminal outcome does. Inside that branch `declined` is true for it, so a record still at a
  chapter 3 terminal step prints that step's block and runs no chapter 3 (`bin.mjs:303-306`). Every
  other non-terminal outcome (the parks) keeps `printLiveInfo`. A plain re-run at `live` already
  enters `continueIntoChapter2` (`bin.mjs:554-560`), so it asks the domain again and then reaches
  Builds the same way. Under `--yes` with no `--domain`, chapter 2 already skips the domain
  (`chapter2.mjs:527-534`) and chapter 3 consents (`chapter3.mjs:957-959`); the run then **connects
  and parks at the reconcile**, as `--yes --connect` does, since the first reconcile owes a sign-in
  trip that `--yes` never opens (`chapter3.mjs:247-250`, `builds-reconcile-parked`). A `--yes` run
  with no saved or `CAIRN_CF_API_TOKEN` token now exits 1 at chapter 3's token hop where it exited
  0 before; MIGRATION-NOTES names this for unattended scripts.
- **2. Closing blocks.** Remove `bin.mjs:374` `console.log('This site is set up end to end.');`.
  Print that sentence only in `printBuildsChapterInfo` for `builds-live`, as the block's first line.
  Add one shared helper returning the publish line, chosen by `isBuildsConnected(state)`, and print
  it in every closing block: `printLiveInfo` (only inside its `if (state.cloudflare?.url) {` branch,
  `bin.mjs:113`, since a site with no address has no live site), `printEmailLiveInfo`,
  `printDeclinedInfo`, and `printBuildsChapterInfo`. The two strings, verbatim:
  - Connected: `Each publish from your admin commits to GitHub, and Workers Builds deploys it, so your live site updates by itself.`
  - Not connected: `` `Workers Builds is not connected, so a publish from your admin commits to GitHub and your live site does not change. To deploy each publish, run npx create-cairn-site --dir ${state.dir} --connect, or deploy by hand.` ``

  These replace `printBuildsChapterInfo`'s two notes at `bin.mjs:226-230`. Leave the catalogue's
  `builds-connect-declined` row as it is: chapter 3 logs it just before the closing block, which
  now carries the claim. Leave the email-offer note at `bin.mjs:232-238` for T2, which removes it.
- **3. Quiet build.** `deploy.mjs:81-87`'s `buildSite` mirrors the build through `log`:
  `const result = await runNpm(['run', 'build'], { cwd: dir, log });`. Capture the lines instead
  (`log: (line) => captured.push(line)`), print one line on success (`Built your site.`), and on a
  non-zero exit print every captured line before throwing `build-failed` as now. `exec.mjs`
  doesn't change. Escalable.
- **4. The spinner.** No code. Under `## Decisions`, record finding 1 with its evidence: the
  capture's last eight bytes and `renderTranscript`'s last line.
- **Acceptance, each able to fail.** Bin-level tests run `bin.mjs` as a child, on the
  `test/resume-*.test.mjs` harness, and stop at a no-network stop, since bin.mjs has no DNS or HTTPS
  probe seam (`resume-chapter3.test.mjs:7-14`):
  - From a record at `live`, `--yes`, no `--domain`, no token: stdout holds the domain skip line,
    then the repo-and-doctor block, then the Builds admission title (`Connect to Workers Builds`),
    and no `This site is set up end to end.`; stderr holds the token hop's `Next:` line; exit 1; the
    fake Cloudflare, started for this test, recorded no Builds route.
  - From a record at `live`, `--yes`, no `--domain`, `CAIRN_CF_API_TOKEN` set, against the fake
    Cloudflare and fake GitHub on the pattern at `resume-chapter3.test.mjs:267`: the Builds title
    appears, the fake Cloudflare recorded one trigger, the `builds-reconcile-parked` row prints with
    its `Next:` line, and the saved step is `builds-connected`. (Contract M3.)
  - A seeded `builds-live` record with a domain and `emailOnboardedAt`, plain re-run: stdout holds
    `This site is set up end to end.` exactly once and the connected sentence.
  - A seeded `builds-connect-declined` record with a domain and `emailOnboardedAt`, plain re-run:
    the not-connected sentence with the site's `--dir`, and no `set up end to end`. (Both carry
    `emailOnboardedAt` so T2's reopen routing, which has no row for it, leaves them out of
    chapter 2.)
  - A park (a record at `delegated` whose plain re-run parks, the shape `src/bin-closing.test.mjs`
    seeds) prints `printLiveInfo`'s block with the not-connected sentence and no Builds title.
  - A seeded record at a chapter 1 step with no `cloudflare.url` prints no publish sentence.
  - `printEmailLiveInfo` and `printDeclinedInfo` each print the sentence `isBuildsConnected`
    selects, for a seeded record with and without `buildsTriggerUuid`.
  - Quiet build, against the fake npm bin: a successful build emitting a `[plugin vite:css-post]`
    warning line prints `Built your site.` and not the warning; a failing build prints the warning
    and the `build-failed` row.
  - `npm test -w packages/create-cairn-site` and the fast lane pass, including `make -C tool check`.
- **CHANGELOG and MIGRATION-NOTES:** one `## Unreleased` line: a site whose owner skips the domain
  is offered Workers Builds in the same run, and each closing block says whether a publish deploys.
  MIGRATION-NOTES: a `--yes` run with no `--domain` now goes on to Workers Builds, so a script that
  passes no token exits 1 at the token step; pass `CAIRN_CF_API_TOKEN` or stop the script at `live`.

### T2. Chapter 2 works on a Builds site, through the repository

275 min, `auth-data`. **`cairn-implementer` at Opus, effort `high`**: new correctness logic the
plan states as invariants, not as code.

- **Files:** `src/cloudflare/chapter2.mjs`, `chapter3.mjs`, `hostname.mjs`, `catalogue.mjs` (the
  `paid-plan-declined` and `cutover-deploy-failed` rows and one new row), `bin.mjs` (the chapter 3
  terminal branch, the `--connect` branch at `:468`, and `continueIntoChapter2`'s settle),
  `src/github/reconcile.mjs` (the guarded compare), `packages/create-cairn-site/README.md`, their
  tests, `CHANGELOG.md`, `MIGRATION-NOTES.md`.
- **The invariant (design, "The setup tool" 2):** on a record with Builds connected
  (`isBuildsConnected`, `chapter2.mjs:128-130`), every configuration change chapter 2 makes reaches
  the repository before the next Builds deploy, and chapter 2 never builds or deploys locally. The
  two local deploys it makes today:
  - the cutover, `hostname.mjs:381-383`: `await writePublicOriginFn(dir, domainOrigin);` /
    `await buildSite({ dir, log });` / `await deployWorker({ dir, log, accountId });`
  - the sender address, `chapter2.mjs:918-921`: `addressChanged = await writeEmailFrom(dir, from);`
    / `if (!addressChanged) return;` / `await buildSite({ dir, log });` /
    `await deployWorker({ dir, log, accountId });`
- **The shared hop.** On a connected record both replace build-and-deploy with one hop: commit the
  two tool-owned files through chapter 3's existing reconcile (`performReconcile`,
  `chapter3.mjs:243-262`, whose `reconcileRepo` already owns `RECONCILED_FILES`,
  `reconcile.mjs:25`), record `cloudflare.buildsReconciledHash` as soon as the commit lands, then
  find the build for that commit and watch it to a settled outcome. Extract the discovery-and-poll
  core from `watchAndComplete` (`chapter3.mjs:456-642`) so both chapters share it; chapter 2's use
  writes no `step`, deletes no token, runs no host check of its own (the cutover's
  `confirmOrThrow` after the deploy stays), and writes none of chapter 3's build fields
  (`buildsLastBuildUuid`, `buildsLastBuildOutcome`). On a watched `success` it writes one new field,
  `cloudflare.buildsDeployedHash`, set to the hash it deployed.
  - **The kick rule.** When the reconcile finds nothing to commit (`changed: false`, which
    `performReconcile` returns without reading GitHub when the disk hash equals
    `buildsReconciledHash`, `chapter3.mjs:244-245`) and `buildsDeployedHash` differs from that hash,
    kick a build (`api.kickBuild(triggerUuid, defaultBranch)`, as `chapter3.mjs:508` does) and watch
    it. When they are equal, nothing deploys and the hop is done.
  - **The guard (finding 8).** Chapter 2's hop passes reconcile an option that, before any blob is
    written, compares the repository's copy of each `RECONCILED_FILES` entry with the local copy
    after replacing the three tool-owned values with one placeholder in both:
    `PUBLIC_ORIGIN_PATTERN` (`config.mjs:122`), `PUBLIC_ORIGIN_EXPORT_PATTERN` (`:131`), and
    `EMAIL_FROM_PATTERN` (`:206`). If anything else differs, it throws a new act row,
    `builds-config-diverged`, naming each file and saying the repository has changes this checkout
    lacks, so run `git pull` in `--dir` and re-run. Chapter 3's `--connect` reconcile passes no
    option and is unchanged.
  - **Failure.** A `fail` or `terminated` build throws `builds-deploy-failed` with its log tail, as
    `chapter3.mjs:603-611` does; at the cutover it throws `cutover-deploy-failed` with that detail
    and a new `buildsCommitted: true` param. That row's variant (`catalogue.mjs:506-540`) says the
    repository already names the domain, the next successful build serves it, and a re-run watches
    one; it never says the address was restored. The origin on disk is restored exactly when the
    reconcile commit did **not** land (the OAuth trip declined, the ref PATCH refused at
    `reconcile.mjs:135-137`, a GitHub error, or `builds-config-diverged`), as today's restore at
    `hostname.mjs:384-400` does, and is left once it did, since the domain answered before the write
    (`hostname.mjs:373-374`). The one exception is the `--yes` park, which lands no commit and still
    leaves the origin on disk for the next run to commit: under `--yes`, the reconcile parks as today
    (`chapter3.mjs:247-250`, `builds-reconcile-parked`); chapter 2 returns that park, writes no step,
    and a later interactive run resumes it.
  - **The sender step on a connected record.** Today the step returns early when the address is
    already written (`chapter2.mjs:918-919`, `addressChanged = await writeEmailFrom(dir, from);` /
    `if (!addressChanged) return;`) and saves `emailFrom` after it (`:925`). On a connected record
    the shared hop runs on every pass through the sender step, whatever `writeEmailFrom` returned:
    the hash gate makes a repeat free, and a crash between the write and the commit would otherwise
    save `emailFrom` with the repository never carrying the sender (#202 on the Builds path).
    `emailFrom` is saved only after the hop's watched `success` (or its hash-equal no-op).
- **The token.** On a connected record, chapter 2's token hop asks for chapter 3's eight keys:
  pass `permissionKeys: CHAPTER3_PERMISSION_KEYS` (`prefill.mjs:79`) to the `ensureApiToken` call
  at `chapter2.mjs:585`, since the watch reads Builds.
- **Reopen the offers.**
  - `hasOpenEmailDecline` (`chapter2.mjs:144-148`) loses its Builds exclusion:
    `if (!record || record.cloudflare?.emailOnboardedAt || isBuildsConnected(record)) return false;`
    drops `|| isBuildsConnected(record)`, and the last line,
    `return record.step === 'builds-connect-declined' && Boolean(record.cloudflare?.emailDeclinedAt);`,
    holds for either chapter 3 terminal step.
  - In `bin.mjs:615-639`, a plain re-run (no `--sign-in`) at either chapter 3 terminal step enters
    `continueIntoChapter2` when the record has an open email decline, or no `cloudflare.domain`
    (finding 6), or a domain with no `domainLiveAt` and no email field (a record stranded by an
    earlier `--connect` mid chapter 2).
  - `--connect` (`bin.mjs:468`) on a record that `isBuildsConnected` holds, at a
    `CHAPTER2_RESUMABLE_STEPS` step (`bin.mjs:45`), resumes chapter 2 instead of running chapter 3,
    so `--connect` never overwrites a chapter 2 step on a Builds site.
  - Delete the `--yes` Builds skip, `chapter3.mjs:946-956` and `:965` (folds #317), the
    "offer is over" note at `bin.mjs:232-238`, and the clause in both `paid-plan-declined` forms
    (`catalogue.mjs:576-577` and `:589-590`): `before you connect Workers Builds: once Builds is
    connected, this tool no longer offers it.` becomes `any time.` Fix every comment that states the
    old rule (`chapter2.mjs:29-30`, `:120-123`, `:133-139`; `chapter3.mjs:735-738`;
    `bin.mjs:213-217`, `:280-284`, `:606-614`).
- **The effective step (#206).** A record entering chapter 2 at a chapter 3 terminal step gets its
  effective step from its fields, before any `hasReached` call, because `stepIndex` reads an
  unlisted step as `live` (`chapter2.mjs:97-100`). Write `cloudflare.domainLiveAt` in the same
  `updateSite` that writes `step: 'domain-live'` (`chapter2.mjs:801`). Then:

  | Record fields | Effective step | So chapter 2 | Its test observes |
  |---|---|---|---|
  | no `domain` | `live` | asks the domain question | the domain admission title first |
  | `domain`, no `domainLiveAt`, no email field, `carryOver` saved | `records-carried` | resumes at delegation, without re-asking admission and without `readCurrentRecords` (which throws on a delegated domain, `records.mjs:181-190`) | no admission title, no records probe, the attach call |
  | `domain`, no `domainLiveAt`, no email field, no `carryOver` | `zone-created` | re-runs the carry-over from the zone | no admission title, the zone read before any write |
  | `domain`, and `domainLiveAt` or `emailDeclinedAt`, no `emailOnboardedAt` | `domain-live` | asks the email question (or re-offers an open decline) | the email admission title first |

  A record with `emailOnboardedAt` at a chapter 3 terminal step is not routed into chapter 2, so it
  has no row.
- **The settle.** At the top of the non-dry-run handling in `continueIntoChapter2`
  (`bin.mjs:288-315`), in this order:
  1. A park (an outcome outside `TERMINAL_STEPS` and not `admission-declined`): `printLiveInfo`, as
     now.
  2. Builds went live (a saved `buildsTriggerUuid` and `buildsLastBuildOutcome === 'success'`): write
     `step: 'builds-live'` if it isn't, print the `builds-live` block, run no chapter 3. This comes
     before the restore, since `buildsDeclinedAt` is never cleared and can sit beside a live trigger.
  3. `buildsDeclinedAt` saved: the existing restore (`bin.mjs:296-300`).
  4. The record still at a chapter 3 terminal step (an `admission-declined` or decline there):
     print that step's block, run no chapter 3 (the existing check at `bin.mjs:303-306`).
  5. Otherwise the closing lines and `runChapter3AndReport`.

  So a record entering at `builds-connect-declined` keeps its decline after a park, the first
  write chapter 2 makes on it carries `buildsDeclinedAt` under the existing `buildsDeclineStands`
  rule (`chapter2.mjs:491-498`), applied to every chapter 2 step write from that entry, not only
  the open-decline path. The Go tool's step contract (`tool/internal/spine/step.go:23-27`) doesn't
  change, and the tool reads `step` for display only (`tool/cmd/cairn/sites.go:143`), so `tool/` has
  no task.
- **#202, the local path.** On a record without Builds, the sender hop deploys when
  `addressChanged || record?.cloudflare?.emailFrom !== from`, so a crash between the write and the
  deploy is redeployed on the re-run.
- **README.** Rewrite `packages/create-cairn-site/README.md:266-272` (the email-before-Builds rule)
  and `:305-316` (the `--yes` skip) to the new behavior.
- **Acceptance, each able to fail.** The watched paths are module-level tests of `runChapter2`
  with the fakes and the injected `fetchImpl`, `openBrowser`, `confirm`, and `sleepFn`
  (`chapter3.test.mjs:189-219`'s `alwaysMatchingFetch` and `autoResolveBuilds`); bin-level tests
  only reach no-network stops.
  - Builds cutover (module): a record at `builds-live` with no domain, domain yes. The fake GitHub
    holds one reconcile commit whose `wrangler.jsonc` carries `"PUBLIC_ORIGIN": "https://<domain>"`;
    the fake Cloudflare saw a build for that commit polled to `success`; the fake wrangler bin
    recorded **no** `deploy` and the fake npm bin no `run build`; `domainLiveAt` and
    `buildsDeployedHash` are set.
  - Builds email (module): a record at `builds-live` with a domain and `emailDeclinedAt`, email yes.
    A reconcile commit carries the sender in `src/theme/cairn.config.ts`, a build for it succeeds,
    no local deploy, `emailFrom` set.
  - B2's shape (module): a `builds-live` record with no domain, domain yes and email yes in one run:
    two reconcile commits, two watched builds, no local deploy. (Contract m3.)
  - Build failure at the cutover (module): the fake build ends `fail`. The run throws
    `cutover-deploy-failed` with the log tail and the Builds variant's copy, and stdout holds no
    `restored`; `wrangler.jsonc` on disk still names the domain; `buildsReconciledHash` equals the
    disk hash. A re-run kicks one build, watches it to `success`, and sets `buildsDeployedHash`.
  - A reconcile that fails before the commit lands (the fake GitHub refuses the ref PATCH): the
    origin on disk is restored to workers.dev and the row says so.
  - Crash points (module), each a test: after the ref PATCH and before the hash write, the re-run's
    diff finds the repository matching and, with `buildsDeployedHash` unset, kicks one build; after
    the hash write, the re-run kicks one build; after a watched `success` and before the step write,
    the re-run kicks nothing and still reaches `domain-live`.
  - The guard (module): the fake GitHub's `cairn.config.ts` carries one extra line; no commit lands,
    the `builds-config-diverged` row names the file, and the origin on disk is restored.
  - `--yes` at the cutover on a Builds record (module): the outcome is `builds-reconcile-parked`,
    the step is unchanged, and no commit or deploy happened.
  - The effective-step table: one module test per row, asserting its observable.
  - The settle (bin, no network): a `builds-live` record with no domain under `--yes` (chapter 2
    gives `admission-declined`): the step stays `builds-live`, no Builds title, the connected
    sentence prints. A `builds-connect-declined` record with no domain under `--yes`: the step stays,
    no Builds title, the not-connected sentence prints. A record carrying both `buildsDeclinedAt`
    and a trigger with outcome `success`, at a chapter 2 terminal outcome, settles at `builds-live`.
  - The `builds-connect-declined` reopen (module plus bin): a domain yes runs the local cutover (one
    `wrangler deploy`), the record carries `buildsDeclinedAt`, and a following plain re-run settles
    at `builds-connect-declined` with no Builds title.
  - `--connect` on a Builds record at `delegated` (bin, `--yes`, no network past the token hop):
    stdout holds `Resuming` and chapter 2's next hop, never chapter 3's admission title.
  - `--yes` without `--connect` on a record with an open email decline now connects Builds
    (replaces the `builds-skipped` tests).
  - #202 on the Builds path (module): a crash after `writeEmailFrom` and before the reconcile commit
    (the fake GitHub refuses the ref PATCH once). The re-run finds the address already written,
    still runs the hop, commits the sender, watches one build, and only then saves `emailFrom`.
  - #202: a crash after `writeEmailFrom` and before the deploy (the fake wrangler bin fails once),
    then a re-run: exactly one `wrangler deploy` on the re-run, and `emailFrom` saved.
  - `grep -rn 'builds-skipped\|no longer offers it\|offers to turn it on only until' packages/create-cairn-site skills`
    prints nothing (the docs half is T5's).
  - The fast lane passes, including `make -C tool check`.
- **CHANGELOG and MIGRATION-NOTES:** `## Unreleased` lines: connecting a domain or turning on
  email after Builds commits the change and lets Builds deploy it; the email offer no longer ends at
  Builds; `--yes` no longer skips Builds after an email decline; the setup tool refuses to commit
  over repository edits to its two config files. MIGRATION-NOTES: a site set up on an earlier
  release on workers.dev with no domain re-runs `npx create-cairn-site --dir <dir>` (answer no to the
  domain to reach Builds) or runs `--connect` directly.

### T3. The admin's publish message

20 min, ordinary. Sonnet medium. After T5, on the same side of Pair C.

- **Files:** `src/lib/admin/EditPage.svelte`, `src/tests/component/EditPage.test.ts`,
  `examples/showcase/e2e/{golden-path,keyboard-walk,publish-pending-word}.spec.ts`,
  `docs/editors/publish-and-history.md`, `docs/admin/rotate-the-github-app-key.md`, `CHANGELOG.md`.
- **Change:** `EditPage.svelte:1336`
  `if (data.flash === 'published') return 'Published. The live site is rebuilding.';` returns
  `'Published. The live site shows this change once the site rebuilds.'` Update the four
  assertions: `EditPage.test.ts:2282`, `golden-path.spec.ts:219`, `keyboard-walk.spec.ts:177`,
  `publish-pending-word.spec.ts:60`. Load `cairn-writing-docs` for the two pages (case A, which
  ends in the gate and a fresh fact-check, `SKILL.md:19`):
  `rotate-the-github-app-key.md:86` quotes the string; `publish-and-history.md:86` paraphrases it
  ("adds that the live site is updating") and changes to say the live site shows the change once
  the site rebuilds.
- **Acceptance:** `grep -rn 'The live site is rebuilding' src examples docs/admin docs/editors skills`
  prints nothing; the component test passes; CI's e2e runs the three specs;
  `npm run check:docs-gate` passes; a fresh `docs-fact-checker` run on the two pages returns no
  wrong claim.

### T4. Candidates publish to `gate`, a dispatch promotes to `next`, a stable is cut only from a passed tree, and the skill gates each candidate

150 min, `runner`. Sonnet medium.

- **Files:** `.github/workflows/publish.yml`, `src/tests/unit/workflow-yaml.test.ts`,
  `scripts/checks/check-stable-source.mjs` (new), `src/tests/unit/check-stable-source.test.ts`
  (new) with its fixture under `scripts/checks/fixtures/stable-source/` (new),
  `.claude/skills/cairn-releasing/SKILL.md` (steps 6 and 7, the gate step, and the first-release
  section), `ROADMAP.md` (the `next` wording at `:30`, `:34`, and `:36`). No `CHANGELOG.md` line: T5 writes
  it.
- **1. The tag.** In all three jobs, `*-*) TAG=next ;;` (`publish.yml:69`, `:111`, `:163`) becomes
  `*-*) TAG=gate ;;`, and the comment at `:54-59` says why: a candidate waits on `gate`, hidden from
  `next`, until the gate passes. Raise the npm floor for OIDC dist-tags:
  `- run: npm install -g npm@11` (`:36`, `:98`, `:151`) becomes `npm@^11.21.0`, and the `WATCH`
  comment names the floor and the 12 line's 12.2.0.
- **2. Promotion.** `workflow_dispatch:` (`:16`) gains one input, `promote` (string, not required,
  described as a passed candidate's version). The three publish jobs gain
  `if: github.event_name == 'release' || inputs.promote == ''`, so a bare dispatch still publishes
  as today. A new job `promote`, `if: github.event_name == 'workflow_dispatch' && inputs.promote != ''`,
  with job-level `permissions: { contents: read, id-token: write }` and no checkout of dependencies
  and no `npm ci` (the #205 note): setup-node with the registry, `npm install -g npm@^11.21.0`, then
  one `run:` block that reads the input from `env:` (never `${{ }}` inside the script), refuses
  anything but a prerelease version (`^[0-9]+\.[0-9]+\.[0-9]+-[0-9A-Za-z.-]+$`), checks
  `npm view <pkg>@$V version` prints `$V` for all three packages before moving any, then runs
  `npm dist-tag add <pkg>@$V next` for `@glw907/cairn-cms`, `@glw907/cairn-cms-dev`, and
  `create-cairn-site` last, since it is the testers' entry point. **FORK 3 (default yes):** then
  `npm dist-tag add create-cairn-site@$V latest`; the engine packages' `latest` never moves to a
  candidate. A trap prints `npm dist-tag ls <pkg>` for all three on exit, pass or fail.
- **3. The stable check.** `check-stable-source.mjs` takes no target argument: it runs
  `git fetch origin main` and refuses unless `HEAD` equals `origin/main`, then reads `next` for all
  three packages (`npm view <pkg> dist-tags.next`), refuses when they differ or when tag `v<next>`
  is absent, and reads the change set from `git diff --raw v<next> HEAD`. It refuses any status
  other than `M`, any entry whose old and new modes differ (a mode-only change reports `M` under
  `--name-status` and shows no `+` or `-` line), any file outside this list, and then reads lines
  only within the list with `git diff --text`. The list is the cut's own file set (`git show --stat 1ae692ae1`):
  - `package.json`, `package-lock.json`, `packages/cairn-cms-dev/package.json`,
    `packages/create-cairn-site/package.json`: every changed line is a `"version":` line.
  - `templates/waymark/package.json`: every changed line is a
    `"@glw907/cairn-cms": "^<version>"` or `"@glw907/cairn-cms-dev": "^<version>"` pin, the shape
    `emit-template-dir.mjs:206` derives (`` `^${enginePackage.version}` ``).
  - `templates/waymark/.claude/cairn/VERSION`: its one line is the version.
  - `CHANGELOG.md`: heading lines (`## <version>`) and the `<!-- release-size: ... -->` marker.
  - `MIGRATION-NOTES.md`: its `## <version>` heading and the `CHANGELOG.md#<anchor>` link's anchor.
  - `guidance-hashes.json`: no line rule; the check runs
    `node scripts/build/build-guidance-hashes.mjs --check` (`build-guidance-hashes.mjs:8`) and
    passes the file only on exit 0.

  Otherwise it fails naming each file and line. A changed CHANGELOG or MIGRATION-NOTES body line
  fails, so step 5's scrub runs at the candidate cut, and a stable whose diff would need a scrub
  cuts a new candidate. Keep the rules a pure exported function over parsed diff output and inject
  the command runner, so the tests need no registry or repo state.
- **4. The skill.** In `cairn-releasing`: step 6's dist-tag sentences (`SKILL.md:165-167`) say a
  candidate goes to `gate` and a stable to `latest`. Step 6's commit sentence (`:156-157`, "plus
  STATUS if it is part of this cut") says a stable cut commit carries only the version fields and
  the headings, and STATUS lands after the release. The stable cut runs
  `node scripts/checks/check-stable-source.mjs`, doesn't cut on a failure, and the check prints the
  sha it read; the stable's `gh release create` passes that sha literally, `--target <sha>`
  (replacing `--target main` at `:160` for the stable only; a candidate keeps `--target main`
  with `--prerelease`), never a `$( )` substitution. `:184`'s `--tag next` becomes `--tag gate`.
  A new paragraph in step 6 states the order the stable rule forces: a stable is cut only from the
  final gated candidate's tree, so the transcript recapture and every quoted docs block it updates
  land **before** the final candidate is cut (recapture, then `rc.N`, then the gate, promotion, and
  Geoff's own install, then the stable). A recapture merged after the final candidate fails the
  stable check by design and means one more candidate. Then two new subsections after step 6, in
  order:
  - **"Gate the candidate":** the pre-gate checks (Email Sending on `carin-test.org`, Workers Paid
    per the inventory, `bash scripts/gate/run-gate.sh --smoke`), the command
    `bash scripts/gate/run-gate.sh --all --version <v>`, the pass bar (every leg's fetch, page read,
    origin read, and, under FORK 2, the sign-in email's From, recorded under `## Gate` in the
    release body after each leg), the design's standing answers (a failed leg fixes forward to the
    next candidate and reruns only the legs its path touches; a Builds outage gets one rerun after
    15 minutes; a GitHub page the harness can't pass asks Geoff once and files the fix), and Geoff's
    own install on the final candidate before the stable cut.
  - **"Promote a passed candidate":** `gh workflow run publish.yml -f promote=<version>`, its check
    (`npm view <pkg> dist-tags.next` prints the version for all three; under FORK 3,
    `npm view create-cairn-site dist-tags.latest` does too), that a split `next` is recovered by
    re-dispatching the same version (`dist-tag add` is idempotent), and the fallback
    (`npm dist-tag add <pkg>@<version> next` by Geoff, three times, when the run reports the trusted
    publisher cannot manage dist-tags). The first real promotion is the permission's probe.

  Step 7 verifies a candidate on `gate`, and its `next` check runs after promotion.
- **Acceptance, each able to fail:**
  - `workflow-yaml.test.ts` pins, on the parsed workflow: each publish job's script maps `*-*` to
    `gate` and none maps a prerelease to `next`; each publish job's `if` skips a non-empty
    `promote`; the `promote` job's `if` is exactly
    `github.event_name == 'workflow_dispatch' && inputs.promote != ''`, it carries
    `id-token: write` at job level, has no `npm ci` step, and its script contains
    `npm dist-tag add` with `next` for each of the three package names, `create-cairn-site` last;
    every npm install step pins `^11.21.0`.
  - Run the promote job's script body under `bash` with a stub `npm` on `PATH`: `promote=0.99.0`
    exits non-zero with no `dist-tag add` call; `promote=0.99.0-rc.3` with one package missing the
    version exits non-zero with no `dist-tag add` call and prints all three tag states; with all
    three present, it calls `dist-tag add` three times naming `next`, `create-cairn-site` last (and,
    under FORK 3, once more naming `latest` for `create-cairn-site` only).
  - `check-stable-source.test.ts`: the fixture, `git show 1ae692ae1`'s diff rewritten from
    `0.99.0-rc.1`→`0.99.0-rc.2` into `0.99.0-rc.2`→`0.99.0` (versions, pins, `VERSION`, headings,
    anchor; `guidance-hashes.json` with the hashes check stubbed to exit 0), **passes**; the same
    fixture with one code line added to `templates/waymark/package.json` fails naming it; a one-line
    change in `src/` fails naming the file; a CHANGELOG body change fails; a binary file change
    fails; a pure rename fails; a mode-only change to `package.json` (a `--raw` entry `100644`→
    `100755`) fails; a `docs/STATUS.md` change fails; the hashes check exiting 1 fails; `HEAD` differing from
    `origin/main` fails; differing `next` across the three packages fails; a missing `v<next>` tag
    fails.
  - The skill: `grep -n -- '--tag next' .claude/skills/cairn-releasing/SKILL.md` prints nothing;
    `grep -c 'run-gate.sh --all --version' .claude/skills/cairn-releasing/SKILL.md` prints 1 or
    more; `grep -n 'check-stable-source' .claude/skills/cairn-releasing/SKILL.md` precedes the
    `gh release create` line; `grep -n 'rev-parse HEAD)' .claude/skills/cairn-releasing/SKILL.md`
    prints nothing; `grep -n -i 'recapture' .claude/skills/cairn-releasing/SKILL.md` names it
    before the final candidate's cut; `npm run check` passes the skill's form checks.
  - The fast lane passes. CI is green on the head (the path is protected, so the task waits for
    `ciWait`, off the path).
- **The live reads** belong to the conductor's release steps, written into the skill: after the
  `rc.3` cut, `npm view <pkg> dist-tags` shows `gate: 0.99.0-rc.3` and `next` unchanged on all
  three; after promotion, `next: 0.99.0-rc.3`.

### T5. Docs for the setup changes

67 min, ordinary (docs). Sonnet medium. Waits for Pair B.

- **Load `cairn-writing-docs`** and follow its case A, with a fresh `docs-fact-checker` run.
- **Pages, each read whole:**
  - `docs/admin/create-your-site.md`: the prose after the sign-in block ("The command then asks
    whether to connect a domain you own. Answering no changes nothing") says that answering no
    moves on to the Workers Builds offer, what connecting does, and that a publish deploys by
    itself only once Builds is connected. The marked block at `:108-114` follows the standing
    answer. Read the diagram and its caption against the new path.
  - `docs/admin/own-your-domain.md:87`: drop the email-before-Builds rule and the `--yes` skip.
  - `docs/admin/setup-recovery.md:72` (the declined-email row) the same; `:83`, "Nothing is wrong.
    Deploys still go through the setup command.", says a publish commits to GitHub and the live
    site doesn't change until `--connect` or a hand deploy. Add the `builds-config-diverged` row
    (T2) if the page lists the setup tool's act rows.
  - Then search, per `.claude/rules/docs-with-code.md`:
    `grep -rn -i --exclude=rotate-the-github-app-key.md --exclude=publish-and-history.md 'workers builds\|--connect\|rebuild\|set up end to end' docs/admin docs/editors skills`
    (T3 owns the two excluded pages), read every hit outside history, and fix what is false (`skills/cairn-extending-a-site/references/public-routes.md:28`
    is one candidate: on a Builds site, setup commits the origin and Builds rebuilds).
- **CHANGELOG:** T4's `## Unreleased` line: a candidate now publishes to the hidden `gate` tag and
  reaches `next` only after it passes the release gate.
- **Acceptance:** `npm run check:docs-gate` and `npm run check:transcripts` pass; Vale is clean;
  the fact-checker returns no wrong claim, or each dispute is under `## Decisions`;
  `grep -rn 'builds-skipped\|no longer offers it\|offers to turn it on only until' docs/admin docs/editors`
  prints nothing.

### T6a. The gate harness: driver, shim, fetch check, and the credential smoke

150 min, `runner`. Sonnet medium.

- **Files (new):** `scripts/gate/run-gate.sh`, `scripts/gate/gate.mjs`, `scripts/gate/driver.mjs`,
  `scripts/gate/xdg-open` (executable), `scripts/gate/fetch-check.mjs`, `scripts/gate/totp.mjs`,
  `scripts/gate/README.md`; tests `src/tests/unit/gate-{driver,fetch-check,totp,shim,env}.test.ts`
  and one integration test under `packages/create-cairn-site/test/`. **Edit:**
  `.claude/skills/cairn-running-passes/SKILL.md:31`, the `runner` line, gains `scripts/gate/**`.
  `gate-table.json` needs no edit: its `scripts` bucket already holds `scripts/`.
- **`run-gate.sh`** is the one entry. It sources `~/.local/secrets` (the script pattern `CLAUDE.md`
  names), creates the run directory `~/.local/state/cairn-gate/runs/<ts>` with mode 0700 (never in
  the worktree), and starts `gate.mjs` with an environment built from an allowlist, never from the
  parent. `gate.mjs` spawns each child with an explicit environment object:
  - **The CLI child** (and through it npm, Vite, and wrangler): `PATH` with `scripts/gate` first
    (for the shim), `HOME`, `TERM`, `LANG`, `CLOUDFLARE_API_TOKEN="$CF_WS_CAIRN_GATE_TOKEN"`,
    `CLOUDFLARE_ACCOUNT_ID=120c269ad6d3dfbe6d63a0bb53758ca0`, `CAIRN_STATE_DIR` under the run
    directory, and `GATE_URL_LOG`. Never a `GITHUB_TEST_*` name.
  - **The browser process** (T6b): the `GITHUB_TEST_*` names, `GATE_URL_LOG`, and no Cloudflare
    token.
  - **Teardown** (T6b): the gate token, the account id, and `GITHUB_TEST_TOKEN`.
  - `record.mjs` (T6b) runs in `run-gate.sh`'s own environment, as glw907's `gh`.

  No secret name list is committed. It never echoes a value. Modes: `--smoke`,
  `--leg <A1|A2|B1|B2>`, `--all`, `--version <v>`, `--teardown-stale` (T6b).
- **`driver.mjs`** runs the real CLI on a 100 by 40 pty (reuse the transcript `ptycapture.py`'s
  approach in Node, or spawn `python3 -I` on the committed `ptycapture.py` with a driver mode) and
  answers prompts **by text, in any order**, from a per-leg table keyed by the prompt strings the
  CLI prints (from `prompts.mjs`, `github/chapter.mjs`, `cloudflare/{chapter,chapter2,chapter3,account}.mjs`,
  and `prefill.mjs:113`'s `Paste your Cloudflare API token`, answered with the gate token; finding
  2). Never `--yes`.
  - **Detection:** a prompt is a rendered screen line, ANSI stripped, carrying clack's active-prompt
    symbol (`S_STEP_ACTIVE = unicodeOr("◆", ...)` in `@clack/prompts`' `dist/index.mjs`)
    followed by a table key. Any other output line is never a prompt.
  - **Keystrokes by kind:** each table entry names its kind. A confirm sends `y` or `n` with **no**
    CR (`@clack/core` 1.5.1 submits a confirm on the key alone, `dist/index.mjs:300`, `:463-464`,
    so a CR would answer the next prompt). A select sends arrows to the named label, then CR
    (`github/chapter.mjs:247`, `prompts.mjs:138`, `account.mjs:87`). A text prompt sends its value,
    or nothing for the default, then CR. A password prompt sends the value, then CR.
  - **Idle:** a prompt with no table entry, or no new output for 10 minutes, fails naming the last
    screen. On `Watch progress at` (`hold-loop.mjs:172`), the idle limit for that hold rises to
    `PROPAGATION_BUDGET_MS` (40 minutes, `hold-loop.mjs:35`) plus 5 minutes.
  - The token string never appears in stdout, the log, or the capture (clack prints one mask
    character per typed character; assert the token is absent, not that nothing shows).
- **`xdg-open`** appends its URL argument to `$GATE_URL_LOG` and exits 0. `open.mjs:27` already
  spawns `xdg-open`, so the CLI changes nothing. Under a pty `openBrowser` prints and logs the
  secret confirm URL in full (`open.mjs:65`), so the URL log and capture live only in the run
  directory and are deleted at teardown.
- **`fetch-check.mjs`** polls a URL (cache-busting query, no cookies) every 15 s for up to 10
  minutes for a marker string, and returns `{ found, url, status, fetchedAt, attempts }`. A 200
  without the marker never passes. An `--absent <minutes> --control <string>` mode passes only when
  every poll answered 200, held the control string (a pre-edit line of the entry, which T6b reads
  before the publish), and lacked the marker, for leg A1's "live page unchanged".
- **`totp.mjs`** is RFC 6238 over `node:crypto` (SHA-1, 30 s, 6 digits), reading its secret from
  the environment only; no new dependency.
- **The smoke**, `bash scripts/gate/run-gate.sh --smoke`, prints `hostname` and one verdict per
  check, never a value. Every HTTP call goes through Node `fetch` (no token in argv). Reads:
  - the gate token at `GET /user/tokens/verify` (what chapter 3 calls, `api.mjs:558`) and at
    `GET /accounts/<id>/tokens/verify`, each verdict recorded (finding 7);
  - the CLI's own `makeApi` routes with the gate token: `listZones` for `carin-test.org`,
    `GET .../builds/tokens`, and the zone's email sending subdomains (`api.mjs:528`);
  - `wrangler whoami` (`/you are logged in/i`, finding 3) and `wrangler whoami --json` (a non-empty
    `accounts` list naming the account id), both on the template's wrangler,
    `npx --yes wrangler@4.156.2` (`templates/waymark/package.json:55`), under the CLI child's
    environment;
  - when `GITHUB_TEST_TOKEN` is in the store: `GET /user` returns `GITHUB_TEST_LOGIN`, and its
    `X-OAuth-Scopes` names `repo` and `delete_repo`; otherwise the verdict is `skipped: not in
    store` (a pre-flight item, not the executor's);
  - a TOTP code computes.

  Writes, each a throwaway named `cairn-e2e-gate-probe-<ts>`, deleted by the id its create
  returned: one D1 database, one R2 bucket, and one build token registration
  (`POST .../builds/tokens` with the gate token as its secret and its verified id, then
  `DELETE /accounts/{account_id}/builds/tokens/{build_token_uuid}`), which proves Builds accepts
  the gate token as a build token.
- **Acceptance, each able to fail:**
  - Driver: a stub CLI printing clack-shaped prompts in a shuffled order, one table prompt never
    shown, gets every shown prompt answered and exits 0; a confirm answer is one keystroke with no
    CR; a stub printing an unknown marked prompt fails naming it; an unmarked line that matches a
    table key is never answered; the token string appears in neither stdout, the log, nor the
    capture.
  - Env: the driver spawns a stub CLI that dumps its environment; no `GITHUB_TEST_*` name is
    present, and the two `CLOUDFLARE_*` names are.
  - Integration: the driver runs `node packages/create-cairn-site/bin.mjs` against the test fakes
    (`test/fake-github.mjs`, `fake-cloudflare.mjs`, `fake-bin.mjs`, the env bases the resume tests
    use) from a seeded `live` record, with the shim first on `PATH` and the leg B1 table: the domain
    prompt is answered no by text, the run reaches the Builds admission prompt and answers yes, and
    the run reaches the chapter 3 token hop's paste prompt with `CAIRN_CLOUDFLARE_API_BASE` pointed
    at the fake. The fake accepts any bearer (`resume-chapter3.test.mjs:276-278`), so the test arms
    `failNext('zone_list', 403, ...)` twice, once for the first paste and once for the one retry
    `ensureApiToken` allows (`prefill.mjs:218`), and the table answers both pastes; the run ends on
    the token's refusal row with a non-zero exit and no live `api.cloudflare.com` call. This is what proves the table's
    domain and Builds keys match the CLI's real prompts; the first gate run proves the rest.
  - Fetch check against a local HTTP server: the marker appearing on the third poll passes with
    `attempts: 3`; never appearing fails at a test-sized budget; `--absent` passes when 200, control
    present, marker missing; fails when the marker is present; fails on a 404; fails when the control
    is missing.
  - TOTP: the RFC 6238 SHA-1 test vectors.
  - Shim: writes its argument to the log, exits 0.
  - The smoke runs once, its verdicts pasted under `## Decisions` (a failed verdict follows the
    standing answer).
  - The fast lane passes.

### T6b. The gate harness: GitHub's pages, the admin publish, the legs, teardown, and the record

190 min, `runner`. Sonnet medium. After T6a.

- **Files (new):** `scripts/gate/browser.mjs`, `scripts/gate/legs.mjs`, `scripts/gate/teardown.mjs`,
  `scripts/gate/record.mjs`, tests `src/tests/unit/gate-{browser,legs,teardown,record}.test.ts` with
  hand-built page fixtures; `gate.mjs`, `run-gate.sh`, and `README.md` extended.
- **`browser.mjs`** (root `playwright`, `package.json:269`): a stored session for the machine
  account at `~/.local/state/cairn-gate/github-session.json`, mode 0600, outside git; a fresh
  sign-in with password and a TOTP code when the session is gone, and the same code for a sudo
  prompt. Tracing and video stay off. It launches Chromium headed (`headless: false`), so a held page
  can take Geoff's click. It tails the shim's URL log while the CLI runs and classifies each URL
  before acting (the CLI's `openBrowser` call sites are `prefill.mjs:282`, `cloudflare/chapter.mjs:276`,
  `install.mjs:239`, `manifest.mjs:165`, `oauth.mjs:108`, and `bin.mjs:351`):
  - the loopback manifest page (`http://127.0.0.1:...`): submit it, then click **Create GitHub
    App** on GitHub's page;
  - a GitHub App install page: choose the machine account and **Install**;
  - a GitHub OAuth authorize page: approve;
  - the site's sign-in link (a workers.dev URL carrying the confirm path,
    `cloudflare/chapter.mjs:276`, `bin.mjs:351`): open it at once and click **Sign in**, keeping
    that install's admin session in its own browser context;
  - a `dash.cloudflare.com` prefill URL (`prefill.mjs:282`): log and skip (the driver pastes the
    token);
  - anything else (an unrecognised GitHub page, a redesign, a bot check): **hold**, the design's
    "asks for your clicks once". The page stays open in the headed window for the step's 10
    minutes, a screenshot path is logged, and `notify-send` (normal urgency, the calm-desktop rule)
    names the page and the leg. A click that moves the page on resumes the leg. Only the timeout
    fails the leg; the CLI and the exit trap wait while the page is held, so teardown never runs on
    the hold itself, only after the timeout or a later failure.

  Each step waits at most 10 minutes. **The admin half** publishes on the workers.dev admin for
  every leg: a publish needs no `PUBLIC_ORIGIN` match, since `requireOrigin` is called only by the
  login request and the preview route (`src/lib/sveltekit/auth-routes.ts:236`,
  `content-routes-preview.ts:65`). When the install's session is gone, `gate.mjs` runs the CLI's
  `--sign-in` through the driver and the browser opens the new link. It opens one existing entry,
  reads a pre-edit body line (the control), inserts a unique marker
  (`gate-<version>-<leg>-<epoch>`) into its body, selects **Publish**, and returns the alert's text,
  the control, and the entry's public path.
- **The legs** (`legs.mjs`, run by `gate.mjs`), each invoking `create-cairn-site@<exact version>`
  (never `@gate` or a bare name, so a tag moved mid-run can't change the code under test). Names
  are `cairn-e2e-gate-<v>-<a|b>-<ddhhmm>`, where `<v>` is the version with every non-alphanumeric
  character removed (`0990rc3`, 31 characters in all), checked at 34 or fewer. `<entry path>` is
  the path the browser returned.
  - **A1:** install A, domain `carin-test.org`, email on with `GATE_OWNER_EMAIL`, Builds no. The
    CLI's closing block holds the not-connected sentence. Publish; the alert reads
    `Published. The live site shows this change once the site rebuilds.`; the marker's commit is on
    the repository's default branch (GitHub API, machine token);
    `fetch-check --absent 5 --control <control>` on `https://carin-test.org/<entry path>` passes.
  - **A2:** re-run with `--connect`; the closing block holds the connected sentence. Publish; the
    fetch finds the marker on `https://carin-test.org/<entry path>` within 10 minutes;
    `https://carin-test.org/robots.txt` holds `https://carin-test.org/sitemap.xml` (prerendered
    from `publicOrigin`, `templates/waymark/src/routes/robots.txt/+server.ts:10`).
  - Teardown A, before B takes the domain.
  - **B1:** install B, domain no, Builds yes; the closing block holds
    `This site is set up end to end.` and the connected sentence. Publish; the fetch finds the
    marker on the workers.dev address.
  - **B2:** re-run, domain `carin-test.org`, email on (the Builds path, no local deploy); the
    closing block holds `This site is set up end to end.` and the connected sentence; publish; the
    fetch finds the marker on `https://carin-test.org/<entry path>`; `robots.txt` holds the domain's
    sitemap URL, which proves the origin reached the repository. **FORK 2, the real sign-in:** then, in
    a fresh browser context with no admin session, request a sign-in link for `GATE_OWNER_EMAIL`
    at `https://carin-test.org/admin/login`, noting the request time. Poll
    `cairn-gate@probe.907.life` over JMAP (`fetch` to the session at
    `https://907.life/.well-known/jmap`, basic auth with `STALWART_PASSWORD_CAIRN_GATE`, passed to
    the browser process only) every 15 s for up to 10 minutes, in every mailbox (a new domain's
    first mail can land in Junk), for a message received after the request time, addressed to the
    gate owner, with the subject `Sign in to <site name>` (`src/lib/email.ts:62`). Never "the
    newest message": GitHub's mail to the machine account lands in the same mailbox. Assert that
    message's From is `no-reply@carin-test.org`. Take the one sign-in URL from its text body (its
    origin must be `https://carin-test.org`, else the leg fails), open it in that fresh context,
    click **Sign in**, and publish a second marker (`gate-<version>-B2mail-<epoch>`) through that
    session; the fetch finds it on `https://carin-test.org/<entry path>`. No matching message
    within the budget, a wrong From, or a sign-in that doesn't reach the admin fails the leg.
  - Teardown B.

  Each leg's verdict comes from an evaluator, `evaluateLeg(leg, results)`, over the driver's
  closing text, the browser's alert text, and the fetch results; a CLI exit code is never an input
  that can pass a leg.
- **`teardown.mjs`** removes one install, identified only by what the gate recorded in the run
  directory: the uuids and names in the site's state record under the run's `CAIRN_STATE_DIR`
  (`cloudflare.workerName`, `buildsTriggerUuid`, `buildsConnectionUuid`, `github.repo`,
  `github.appSlug`) and the D1 `database_name` and R2 `bucket_name` in that install's own
  `wrangler.jsonc` (wrangler binds them by name and writes no id back, `config.mjs:78-81`). Never a
  lookup by name prefix. Every name must still start `cairn-e2e-gate-` as a second guard, checked
  before any call. It deletes the Builds trigger and repo connection by uuid
  (`DELETE /accounts/{account_id}/builds/triggers/{trigger_uuid}`,
  `DELETE /accounts/{account_id}/builds/repos/connections/{repo_connection_uuid}`), the Worker and
  its custom domain, the D1 database, the R2 bucket (expected empty: the gate uploads no media; a
  refused delete is reported, never forced), the repository (GitHub API, machine token), and the
  App (browser, its Advanced settings' delete). It **never** deletes a build token registration
  (finding 9). It leaves the `carin-test.org` zone and its Email Sending in place. A 404 counts as
  done; it attempts every delete and reports the ones left. After a clean teardown it deletes the
  install's state record, the capture, and the URL log.
  - **`--teardown-stale`** runs first in `--all` and on demand: for every earlier run directory
    with a recorded install, it runs the same teardown. `run-gate.sh` also traps exit and runs
    teardown for every install this run created; a held page (above) keeps the run alive, so the
    trap fires only after the hold times out or a later step fails.
- **`record.mjs`** writes a `## Gate` table to release `v<version>`'s body with
  `gh release edit v<version> --notes-file <file>`: leg, path, URL, commit, marker, fetch time,
  verdict. It runs after each leg. It reads the body first and replaces an earlier `## Gate`
  section rather than stacking; a failed read, or an empty body for a release that has notes,
  aborts with no write. It refuses to write any URL carrying `token=`.
- **Acceptance, each able to fail:**
  - Browser, against hand-built HTML fixtures of the manifest, install, authorize, sign-in, and
    GitHub sign-in pages served locally: the classifier sends each URL to its action; the right
    control is clicked on each; a `dash.cloudflare.com` URL is skipped; an unknown page is held
    with a screenshot path and one `notify-send` call (stubbed), resumes when the fixture page
    changes, and fails the leg only at a test-sized timeout; while it is held, no teardown call is
    made (stub records none); TOTP fills the 2FA field.
  - FORK 2's read, against a stub JMAP server: a newer GitHub message and an earlier run's
    sign-in message are both skipped, and only the message after the request time, to the owner,
    with the sign-in subject is read; a message in Junk is found; none within the budget fails; a
    sign-in URL on another origin is refused; the URL taken from the fixture's text body is the one
    the browser opens.
  - Legs: `evaluateLeg` fails a leg on `found: false`; on a wrong alert text; on a missing closing
    sentence; on a CLI exit 0 with no fetch result; on A1 when `--absent` saw the marker; on A2 or
    B2 when `robots.txt` lacks the domain's sitemap URL; under FORK 2, on B2 when the From differs or the mail session's marker isn't fetched.
    Each passes with every input right.
  - Names: `0.99.0-rc.3` and `1.0.0` each give a name of 34 characters or fewer.
  - Teardown: a name without the prefix is refused with no call made (stub fetch records none); a
    recorded install issues each delete once, in order, against stub APIs, and never a
    `builds/tokens` DELETE; a second teardown over the same install makes no failing call (each
    404 is done); a failure on the D1 delete still attempts R2 and the repository and reports D1
    left; `--teardown-stale` reaches an install recorded in an earlier run directory.
  - Record: an existing `## Gate` section is replaced, not duplicated; the table carries every
    column; a failed read makes no `gh release edit` call; a URL with `token=` is refused.
  - The fast lane passes.

## Close

- Whole-branch `standards:diff-reviewer`, then `standards:web-auth-security-reviewer` and
  `standards:cloudflare-workers-reviewer` on the `auth-data` diff, folded with no open finding. The
  whole-branch review covers the one `EditPage.svelte` string literal.
- Green CI on the head. List every retried test as flake evidence.
- Finalize the `## Unreleased` entries in `CHANGELOG.md` and `MIGRATION-NOTES.md`.
- File the found items. Close #317, #206, #202 in BACKLOG.
- The PR body per `pass-core` "Close": `## Brief`, what landed, each security verdict,
  `## Decisions` (the spinner evidence, the smoke's verdicts, the live admin smoke not run and why,
  the merge route: approval-queue verdict only, `autoMode` allow 7, and the conductor's two
  run-sheet lines below), the three FORK points as built with their defaults, `## Planning misses`, `## Tooling` (each skill, agent, gate, or hook that failed,
  misled, or was missing, with its fix or backlog number; seeds below), found items, and the score
  with the plan's path, 665, beside the actual.
- Delete the plan files in a final commit.

The conductor's release steps after the merge, recorded under `## Decisions`, both in
`~/.local/state/cairn-agent-first/design-audit/run-sheet.md`:

- Repoint steps 11 and 12 at `cairn-releasing`'s "Gate the candidate" step.
- Reorder steps 14 and 15 (`run-sheet.md:476-477`) so step 14's recapture ("Replace the fixtures,
  update `create-your-site.md` and any other quoted blocks, fact-check, merge") lands before the
  final candidate is cut, and that candidate is gated, promoted, and installed by Geoff before
  step 15 ("Stable, on your call's conditions") runs. Step 15's command becomes
  `gh release create v0.99.0 --target <sha> --title <title> --notes-file <file>`, with the sha that
  `check-stable-source.mjs` printed, in place of `--target main`.

`## Tooling` seeds from planning: the worktree guard refused a `sed` over a variable-held path to a
file outside the worktree (read with the Read tool instead); the design stated the teardown rule
covered the gate's resources when it covers `glw907` repositories only (finding 4); the design
routed the gate token through `CAIRN_CF_API_TOKEN`, which the CLI reads only under `--yes`
(finding 2); the design chose an account-owned gate token that the Builds API refuses (finding 7);
the first plan classed `scripts/gate/**` through `gate-table.json`, which holds no risk classes.
