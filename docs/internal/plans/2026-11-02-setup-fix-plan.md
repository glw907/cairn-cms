# setup-fix plan

- **Pass:** `setup-fix`, the setup fix and the pre-cut release gate. Class `auth-data`
  (`packages/create-cairn-site/src/{github,cloudflare}/**`) plus `runner` (`.github/workflows/**`,
  `scripts/checks/**`, `scripts/gate/**`, `.claude/skills/**`). Initiative: `shared-standards`.
- **Design:** `2026-11-02-setup-fix-design.md` beside this file, approved 2026-11-02 in packet
  `20261102T213128-1466750`, revision 1 (the unattended gate) approved in packet
  `20261102T221501-1497206`. Its "Calls the conductor made" and "Standing answers" stand.
- **Base:** `main` at `1ae692ae1`, plus the design at `3c78ef3ab`. **Branch:**
  `worktree-setup-fix-pass`, pushed to `glw907/cairn-cms`.
- **Estimate:** design 540 path minutes, ceiling 1,080. Plan path **455** (below). No cut is
  planned. Cut order if a run passes the ceiling: the quiet build (T1 part 3), then T6b's App
  deletion by browser (leave the Apps for a hand cleanup and file it).
- **Executor:** Sonnet medium, `cairn-cms-setup-fix`. T2 upshifts `cairn-implementer` to Opus at
  `high`. The conductor is the session `launch-cairn-planner-session`; the executor takes
  instructions from it alone.
- **Ends at PR-ready.** No bump, no publish. The `rc.3` cut, the gate, and promotion are the
  conductor's release steps after the merge. This plan's own proofs are unit, integration, CI, and
  one read-only credential smoke (T6a).

## Sweep verdicts

A fresh scoped sweep at `5ca74df33`, by a read-only agent, against the design's sweep as
baseline. Three verdicts differ from the design: #206 and #202 fold, #245 rewords. The keeps,
rewords, and dones land in this branch's first commit. Folds close at the pass close. The drop
waits for Geoff's word in the packet.

| Item | Verdict | Reason |
|---|---|---|
| #317 | fold, T2 | The `--yes` Builds skip it would preview is deleted: `chapter3.mjs:948` `if (args.yes && !args.connect && hasOpenEmailDecline(record)) {`. |
| #206 | fold, T2 | T2 sends `builds-live` records back into chapter 2, and `chapter2.mjs:99` `return idx === -1 ? 0 : idx;` reads every chapter 3 step as `live`, so T2 must derive the effective step from the record's fields anyway. |
| #202 | fold, T2 | T2 rewrites the email hop that holds the crash window: `chapter2.mjs:918-921` writes the address, skips the deploy on `if (!addressChanged) return;`, and saves `emailFrom` only after (`:925`). |
| #185 | reword, keep after the `rc.3` gate | The quiet build removes the build-path lines; the deploy's asset list and the stale closing lines stay for the recapture. |
| #274 | keep after the gate | Needs a real recapture. |
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
  `latest`.
- `@glw907/cairn-cms` still carries a stale `rc: 0.6.0-rc.1` dist-tag.

## Findings that shape the plan

Each was checked at the cited source. None changes the approved design's outcome; each changes
how a task reaches it, and the conductor has them.

1. **The stray spinner frame is npx's, and a terminal erases it.** The `rc.2` capture's last bytes
   are `⠙ ESC[1G ESC[0K` after the closing text: npm's exec spinner draws one frame and erases its
   line. The tool has no spinner (`grep -rn spinner` over `src` finds none). Run through
   `transcript-blocks.mjs`'s `renderTranscript`, the capture's last line is the doctor line and holds
   no frame. The design's "the closing block ends cleanly" already holds, so no code changes for
   it; T1 records the evidence under `## Decisions`.
2. **`CAIRN_CF_API_TOKEN` is read only under `--yes`.** `prefill.mjs`'s `ensureApiToken` reads it
   inside `if (yes) {` and, without `--yes`, opens the prefill page and asks
   `Paste your Cloudflare API token` (`prefill.mjs:113`). The design's driver runs without `--yes`,
   so the harness answers that paste prompt with the gate token, and the `xdg-open` shim swallows
   the prefill URL. No seam is added.
3. **An account-owned token and `wrangler whoami`.** `deploy.mjs:100` skips `wrangler login` only
   when `whoami` prints `/you are logged in/i`. Whether it does for an account-owned token is
   unproven; T6a's smoke reads it. If it doesn't, the run reaches `wrangler login`'s browser trip,
   which the harness can't complete without a CLI seam the design rules out. That result stops for
   the conductor.
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

## Pre-flight

Read every task for owner steps, credentials, and writes against auto mode. The executor needs no
credential before T6a's smoke; the conductor's ruling holds the launch until the gate's credentials
are in the store, so the smoke runs in the pass.

Permissions checked: each task's writes were read against `autoMode` in `~/.claude/settings.json`
and the repo's `.claude/settings.json` (no `autoMode` block). `.claude/skills/cairn-releasing/SKILL.md`
(T4, T7) rides the run sheet's `autoMode` line for `.claude/skills/`; a write was probed here on
2026-11-02 and reverted. `.github/workflows/publish.yml` (T4) is an ordinary worktree edit on a
protected path. No task writes `CLAUDE.md`, `.claude/rules/`, settings, or hooks. T6a's smoke
runs `bash scripts/gate/run-gate.sh --smoke`, which sources `~/.local/secrets` itself, the pattern
`CLAUDE.md` names for a script; no other task reads a secret. A refused write or credential read is
a stop for the conductor, never a thing to route around, and no step reads a credential another way.

Reviewed: `standards:spec-plan-review` at the depth its table sets for `auth-data` plus `runner`,
with `standards:plan-reviewer` and the workstation lens; record in
`2026-11-02-setup-fix-plan-review.md`.

| Item | Who, when | Check that shows it done |
|---|---|---|
| GitHub machine account, 2FA on, its password and TOTP secret in the age store as `CAIRN_GATE_GH_PASSWORD` and `CAIRN_GATE_GH_TOTP_SECRET`, its login as `CAIRN_GATE_GH_LOGIN`, Proton Pass holding the record | `[you]`, before launch (the conductor is gathering it) | `grep -oE '^export (CAIRN_GATE_GH_LOGIN\|CAIRN_GATE_GH_PASSWORD\|CAIRN_GATE_GH_TOTP_SECRET)=' ~/.local/secrets` prints three names, never a value |
| A token for the machine account, `repo` and `delete_repo`, as `CAIRN_GATE_GH_TOKEN` (finding 5) | `[you]`, before launch | `bash -c 'source ~/.local/secrets && GH_TOKEN="$CAIRN_GATE_GH_TOKEN" gh api user --jq .login'` prints the machine login |
| `ws-cairn-gate`, account-owned, minted through `tmp-account-tokens` (inventory item 6): Workers Scripts, D1, R2, Workers Builds, and Email Sending edit on the account; Zone, DNS, and Workers Routes edit on `carin-test.org` only. Age store `CF_WS_CAIRN_GATE_TOKEN`; inventory row added; the temporary token deleted | `[you]` makes `tmp-account-tokens`; the conductor mints, stores, and deletes, before launch | `bash -c 'source ~/.local/secrets && curl -s -H "Authorization: Bearer $CF_WS_CAIRN_GATE_TOKEN" https://api.cloudflare.com/client/v4/accounts/120c269ad6d3dfbe6d63a0bb53758ca0/tokens/verify'` answers `"status":"active"` |
| Pre-launch permission list (finding 4): `Bash(bash scripts/gate/run-gate.sh *)` and `Bash(gh workflow run publish.yml -f promote=*)` in `permissions.allow` | `[you]`, one workstation PR, before launch: T6a's smoke runs the first | Both strings appear in `~/.claude/settings.json`'s `permissions.allow` |
| "Allow npm dist-tag" on the `publish.yml` trusted publisher of `@glw907/cairn-cms`, `@glw907/cairn-cms-dev`, and `create-cairn-site`: npmjs.com → the package → Settings → Trusted publishing → the configuration → tick **Allow npm dist-tag** → save. Off by default (<https://docs.npmjs.com/trusted-publishers>, "Managing dist-tags with trusted publishing") | `[you]`, after the merge, before `rc.3` | The box shows ticked on all three settings pages, then the conductor's no-op promotion `gh workflow run publish.yml -f promote=0.99.0-rc.2` runs green and `npm view <pkg> dist-tags.next` still prints `0.99.0-rc.2` for all three. A run that says the trusted publisher cannot manage dist-tags means the box is off. If it can't be made to work, the design's fallback stands: promotion becomes Geoff's `npm dist-tag add` in a sitting |
| `carin-test.org` has Email Sending on, and the account is on Workers Paid | conductor, before the first gate run | Read through the Cloudflare API with the gate token |
| The gate's owner address accepts mail and is not Geoff's inbox | conductor, before the first gate run | Pick the ward test mailbox the store already names (`STALWART_PASSWORD_TEST`); pass it as `GATE_OWNER_EMAIL` |
| Cloudflare's Workers and Pages GitHub App on the machine account | the gate's first run, through the browser; a page that needs Geoff asks once (design standing answer) | Chapter 3 connects with no `builds-app-not-authorized` park |
| Geoff's own install, install B's first leg in his browser | `[you]`, once per stable, before the cut (design) | His published edit fetched from the workers.dev address |

The npm probe, done here from npm's docs, publishing nothing: the control is the **Allow npm
dist-tag** box on a package's trusted publisher configuration, off by default; with it on, a
workflow runs `npm dist-tag add <pkg>@<version> <tag>` directly and the CLI authenticates through
OIDC; it needs npm 11.21.0 or later on the 11 line (`npm@11` resolves 11.21.1 today); the
configuration binds the workflow filename, so a `workflow_dispatch` trigger inside `publish.yml`
itself matches (the docs' caveat is about a separate dispatcher workflow, where "validation checks
the calling workflow's name"). `npm trust` has no dist-tag flag and `npm trust list` documents no
permission field, so the settings page and the no-op dispatch are the checks.

## Standing answers

The design's standing answers and the run sheet's "Standing answers for every pass" all apply. For
this pass:

- **A test pins old behavior:** change it and list it. Expected: `email-reoffer.test.mjs:262-310`
  and `resume-chapter2.test.mjs:529` and `resume-chapter3.test.mjs:294` (the `builds-skipped`
  assertions), `resume-chapter3.test.mjs:880` (the "until Workers Builds is connected" line),
  `catalogue.test.mjs:451`, `chapter2.test.mjs:407` and `:641` (`admission-declined` as the end of
  a run), `resume-chapter3.test.mjs:220`, `:457`, `:507`, `:802` (the Builds-declined note), and
  the four publish-message assertions in T3.
- **A stale transcript block:** a fixture is never edited. T5 may end the marked block at
  `create-your-site.md:108-115` one line early, before `This site is set up end to end.`, if
  `npm run check:transcripts` passes on it; otherwise it leaves the block and lists it for #185.
- **May escalate (set aside, filed, listed in `## Decisions`) after a cause returns past its
  structural fix:** the quiet build; T6b's App deletion by browser. **May not:** T1's routing, any
  part of T2, T3, T4's tag and promote job, T6a's driver and fetch check. Those stop with one
  question in STATUS and a `SendMessage` to the conductor.
- **Clock:** `.pass-task-clock` at the worktree root. Past twice a task's estimate, stop for the
  conductor.
- **T6a's smoke fails on `wrangler whoami` (finding 3):** stop for the conductor. Any other smoke
  failure with a traced cause in the harness is fixed forward.
- **A GitHub page the harness can't drive in T6b's tests:** T6b's tests use saved page fixtures,
  never live GitHub. A live page change is the gate's standing answer, not the pass's.
- **New BACKLOG item:** the next free number on `main` at merge; the PR names placeholders.
- **A conflicting PR fires no `pull_request` CI.** At the first conflict, tell the conductor and
  merge `main` on its word, keeping both `## Unreleased` entries and running `npm run emit:template`
  and `npm run check:surface -- --update`.
- **Gates:** every task is `auth-data` or `runner`. `RUN_GATE_IF_BUSY=defer` is never set on T1,
  T2, or T6a. A diff under `packages/create-cairn-site/src/` selects `make -C tool check` through
  `toolInputs`, so Go and Vale run on T1 and T2.
- **The live admin smoke** on the close checklist covers the engine's sign-in. No engine auth path
  changes here (the `auth-data` paths are the setup CLI's), so the executor records it as not owed,
  with this reason, under `## Decisions`. The gate after the merge is the live proof.

## Path

| Step | Tasks | Path |
|---|---|---|
| Pair A | T1 (70) beside T4 (80) | 80 |
| Pair B | T2 (200, Opus high) beside T6a (110) | 200 |
| Pair C | T6b (100) beside T5 (60) | 100 |
| Pair D | T7 (25) beside T3 (20) | 25 |
| Close | whole-branch review, two security reads, fold, CI, PR body | 50 |
| **Total** | | **455** |

Each pair's two tasks touch disjoint files. T5 reads T1's and T2's final copy, so it waits for
Pair B. T7 reads T6's commands. T3 is independent and rides the last pair.

## Tasks

### T1. The default path reaches Builds, and every closing block says whether a publish goes live

70 min, `auth-data`. Sonnet medium.

- **Files:** `packages/create-cairn-site/bin.mjs`, `src/cloudflare/deploy.mjs`,
  `src/cloudflare/catalogue.mjs` (the `builds-connect-declined` row only), their tests under
  `src/` and `test/`, `CHANGELOG.md`.
- **1. Routing.** Today a declined domain stops: `chapter2.mjs:551-553`
  `if (!dryRun && !consented) {` / `return { outcome: 'admission-declined' };`, and
  `continueIntoChapter2` sends every non-terminal outcome to `printLiveInfo`
  (`bin.mjs:310-312`, `} else {` / `await printLiveInfo(siteId);`). Make `admission-declined`
  continue into `runChapter3AndReport` in the same run, as a terminal outcome does at
  `bin.mjs:309`. Every other non-terminal outcome (the parks) keeps `printLiveInfo`. A plain re-run
  at `live` already enters `continueIntoChapter2` (`bin.mjs:554-560`), so it asks the domain again
  and then reaches Builds the same way. Under `--yes` with no `--domain`, chapter 2 already skips
  the domain (`chapter2.mjs:527-534`) and chapter 3 consents (`chapter3.mjs:957-959`), so the run
  connects; leave both.
- **2. Closing blocks.** Remove `bin.mjs:374` `console.log('This site is set up end to end.');`.
  Print that sentence only in `printBuildsChapterInfo` for `builds-live`, as the block's first line.
  Add one shared helper returning the publish line, chosen by `isBuildsConnected(state)`, and print
  it in every closing block: `printLiveInfo`, `printEmailLiveInfo`, `printDeclinedInfo`, and
  `printBuildsChapterInfo`. The two strings, verbatim:
  - Connected: `Each publish from your admin commits to GitHub, and Workers Builds deploys it, so your live site updates by itself.`
  - Not connected: `` `Workers Builds is not connected, so a publish from your admin commits to GitHub and your live site does not change. To deploy each publish, run npx create-cairn-site --dir ${state.dir} --connect, or deploy by hand.` ``

  These replace `printBuildsChapterInfo`'s two notes at `bin.mjs:226-230`. Give the catalogue's
  `builds-connect-declined` row (`catalogue.mjs:722-731`) the not-connected sentence's substance:
  its first line becomes `You chose not to connect this repository to Workers Builds. Your site
  still works, but a publish from your admin commits to GitHub and your live site does not change.`
  and its `Next:` line stays. Leave the email-offer note at `bin.mjs:232-238` for T2, which removes it.
- **3. Quiet build.** `deploy.mjs:81-87` mirrors the build through `log`:
  `const result = await runNpm(['run', 'build'], { cwd: dir, log });`. Capture the lines instead
  (`log: (line) => captured.push(line)`), print one line on success
  (`Built your site.`), and on a non-zero exit print every captured line before throwing
  `build-failed` as now. `exec.mjs` doesn't change. Escalable.
- **4. The spinner.** No code. Under `## Decisions`, record finding 1 with its evidence: the
  capture's last eight bytes and `renderTranscript`'s last line.
- **Acceptance, each able to fail:**
  - A bin-level test (the `test/resume-*.test.mjs` harness, fakes only) from a record at `live`:
    the domain prompt answered no, the Builds prompt answered yes, through the fake Builds watch to
    `builds-live`. Stdout holds the Builds admission title after `No domain connected.`, holds
    `This site is set up end to end.` exactly once and after the Builds watch's lines, and holds the
    connected sentence. The fake Cloudflare recorded one trigger. The saved record's step is
    `builds-live`.
  - The same, Builds answered no: step `builds-connect-declined`, stdout holds the not-connected
    sentence with the site's `--dir`, and no `set up end to end`.
  - The same from a fresh first run (chapter 1 through `live`), domain no, Builds yes: no
    `This site is set up end to end.` before the Builds title.
  - A park outcome (delegation pending) still prints `printLiveInfo`'s block, now with the
    not-connected sentence, and never enters chapter 3 (no Builds title in stdout).
  - `printEmailLiveInfo` and `printDeclinedInfo` each print the sentence `isBuildsConnected`
    selects, for a record with and without `buildsTriggerUuid`.
  - Quiet build, against the fake npm bin: a successful build emitting a `[plugin vite:css-post]`
    warning line prints `Built your site.` and not the warning; a failing build prints the warning
    and the `build-failed` row.
  - `npm test -w packages/create-cairn-site` and the fast lane pass, including `make -C tool check`.
- **CHANGELOG:** one `## Unreleased` line: a site whose owner skips the domain is offered Workers
  Builds in the same run, and each closing block says whether a publish deploys.

### T2. Chapter 2 works on a Builds site, through the repository

200 min, `auth-data`. **`cairn-implementer` at Opus, effort `high`**: new correctness logic the
plan states as invariants, not as code.

- **Files:** `src/cloudflare/chapter2.mjs`, `chapter3.mjs`, `hostname.mjs`, `catalogue.mjs` (the
  `paid-plan-declined` row), `bin.mjs` (the chapter 3 terminal branch and `continueIntoChapter2`'s
  settle), `packages/create-cairn-site/README.md`, their tests, `CHANGELOG.md`,
  `MIGRATION-NOTES.md`. `src/github/reconcile.mjs` only if the shared hop needs it.
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
  writes no `step`, deletes no token, and runs no host check of its own (the cutover's
  `confirmOrThrow` after the deploy stays). When the reconcile finds nothing to commit
  (`changed: false`) and the hash differs from the last deploy's, kick a build
  (`api.kickBuild(triggerUuid, defaultBranch)`, as `chapter3.mjs:508` does) so the live site
  carries the config. A `fail` or `terminated` build throws `builds-deploy-failed` with its log
  tail, as `chapter3.mjs:603-611` does; at the cutover it throws `cutover-deploy-failed` with that
  detail and does **not** restore the origin on disk, because the repository already carries it and
  the domain answered before the write (`hostname.mjs:373-374`). A re-run then finds the hash equal,
  kicks a build, and finishes. Under `--yes`, the reconcile parks as today
  (`chapter3.mjs:247-250`, `builds-reconcile-parked`); chapter 2 returns that park, writes no
  step, and a later interactive run resumes it.
- **The token.** On a connected record, chapter 2's token hop asks for chapter 3's eight keys:
  pass `permissionKeys: CHAPTER3_PERMISSION_KEYS` (`prefill.mjs:79`) to the `ensureApiToken` call
  at `chapter2.mjs:585`, since the watch reads Builds.
- **Reopen the offers.**
  - `hasOpenEmailDecline` (`chapter2.mjs:144-148`) loses its Builds exclusion:
    `if (!record || record.cloudflare?.emailOnboardedAt || isBuildsConnected(record)) return false;`
    drops `|| isBuildsConnected(record)`, and the last line,
    `return record.step === 'builds-connect-declined' && Boolean(record.cloudflare?.emailDeclinedAt);`,
    holds for either chapter 3 terminal step.
  - The domain offer reopens at `builds-live` and at `builds-connect-declined` when the record has
    no `cloudflare.domain` (finding 6). In `bin.mjs:615-639`, a plain re-run (no `--sign-in`) at
    either step with an open email decline or no domain enters `continueIntoChapter2`.
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

  | Record fields | Effective step | So chapter 2 |
  |---|---|---|
  | no `domain` | `live` | asks the domain question |
  | `domain`, and none of `domainLiveAt`, `emailDeclinedAt`, `emailOnboardedAt`, `emailFrom` | `zone-created` | re-runs the domain hops from the zone, each read-before-write, without re-asking admission |
  | `domain`, and `domainLiveAt` or any email field, no `emailOnboardedAt` | `domain-live` | asks the email question (or re-offers an open decline) |
  | `emailOnboardedAt` | `email-onboarded` | re-runs the test send and the sender hop, deploying only if needed |

- **The settle.** `continueIntoChapter2` already restores a Builds decline
  (`bin.mjs:296-299`, `if (builds.buildsDeclinedAt) {` / `await updateSite(siteId, { step: 'builds-connect-declined' });`).
  Add: a record whose Builds went live (a saved `buildsTriggerUuid` and
  `buildsLastBuildOutcome === 'success'`) settles back at `builds-live` after any chapter 2
  outcome that isn't a park (a terminal step, or `admission-declined`), prints the `builds-live`
  block, and runs no chapter 3. The Go tool's step contract (`tool/internal/spine/step.go:23-27`)
  doesn't change, and the tool reads `step` for display only (`tool/cmd/cairn/sites.go:143`), so
  `tool/` has no task.
- **#202, the local path.** On a record without Builds, the sender hop deploys when
  `addressChanged || record?.cloudflare?.emailFrom !== from`, so a crash between the write and the
  deploy is redeployed on the re-run.
- **README.** Rewrite `packages/create-cairn-site/README.md:262-270` and `:305-312` (the
  email-before-Builds rule and the `--yes` skip) to the new behavior.
- **Acceptance, each able to fail, fakes only:**
  - Builds cutover: a record at `builds-live` with no domain, re-run, domain yes. The fake GitHub
    holds one reconcile commit whose `wrangler.jsonc` carries `"PUBLIC_ORIGIN": "https://<domain>"`;
    the fake Cloudflare saw a build for that commit polled to `success`; the fake wrangler bin
    recorded **no** `deploy` and the fake npm bin no `run build`; the record ends at `builds-live`
    with `domainLiveAt` set; stdout ends with the connected sentence.
  - Builds email: a record at `builds-live` with a domain and `emailDeclinedAt`, re-run, email yes.
    A reconcile commit carries the sender in `src/theme/cairn.config.ts`, a build for it succeeds,
    no local deploy, the record ends at `builds-live` with `emailFrom` set.
  - Build failure at the cutover: the fake build ends `fail`. The run exits non-zero with the
    `cutover-deploy-failed` row and the log tail; `wrangler.jsonc` on disk still names the domain;
    `buildsReconciledHash` equals the disk hash. A re-run kicks one build, watches it to `success`,
    and ends at `builds-live`.
  - `--yes` at the cutover on a Builds record: the outcome is `builds-reconcile-parked`, the step
    is unchanged, and no commit or deploy happened.
  - The effective-step table: one test per row, asserting which prompt appears first.
  - The domain reopens at `builds-connect-declined` with no domain: a domain yes runs the local
    cutover (one `wrangler deploy`), and the record settles at `builds-connect-declined`.
  - `--yes` without `--connect` on a record with an open email decline now connects Builds
    (replaces the `builds-skipped` tests).
  - #202: a crash after `writeEmailFrom` and before the deploy (the fake wrangler bin fails once),
    then a re-run: exactly one `wrangler deploy` on the re-run, and `emailFrom` saved.
  - `grep -rn 'builds-skipped\|no longer offers it\|offers to turn it on only until' packages/create-cairn-site docs skills`
    prints nothing.
  - The fast lane passes, including `make -C tool check`.
- **CHANGELOG and MIGRATION-NOTES:** `## Unreleased` lines: connecting a domain or turning on
  email after Builds commits the change and lets Builds deploy it; the email offer no longer ends at
  Builds; `--yes` no longer skips Builds after an email decline. MIGRATION-NOTES: a site set up on
  an earlier release on workers.dev with no domain re-runs `npx create-cairn-site --dir <dir>`
  (answer no to the domain to reach Builds) or runs `--connect` directly.

### T3. The admin's publish message

20 min, ordinary. Sonnet medium.

- **Files:** `src/lib/admin/EditPage.svelte`, `src/tests/component/EditPage.test.ts`,
  `examples/showcase/e2e/{golden-path,keyboard-walk,publish-pending-word}.spec.ts`,
  `docs/editors/publish-and-history.md`, `docs/admin/rotate-the-github-app-key.md`, `CHANGELOG.md`.
- **Change:** `EditPage.svelte:1336`
  `if (data.flash === 'published') return 'Published. The live site is rebuilding.';` returns
  `'Published. The live site shows this change once the site rebuilds.'` Update the four
  assertions: `EditPage.test.ts:2282`, `golden-path.spec.ts:219`, `keyboard-walk.spec.ts:177`,
  `publish-pending-word.spec.ts:60`. Load `cairn-writing-docs` for the two pages:
  `rotate-the-github-app-key.md:86` quotes the string; `publish-and-history.md:86` paraphrases it
  ("adds that the live site is updating") and changes to say the live site shows the change once
  the site rebuilds.
- **Acceptance:** `grep -rn 'The live site is rebuilding' src examples docs skills` prints nothing;
  the component test passes; CI's e2e runs the three specs; `npm run check:docs-gate` passes;
  a fresh `docs-fact-checker` run on the two pages returns no wrong claim.

### T4. Candidates publish to `gate`, a dispatch promotes to `next`, and a stable is cut only from a passed tree

80 min, `runner`. Sonnet medium.

- **Files:** `.github/workflows/publish.yml`, `src/tests/unit/workflow-yaml.test.ts`,
  `scripts/checks/check-stable-source.mjs` (new), `src/tests/unit/check-stable-source.test.ts`
  (new), `.claude/skills/cairn-releasing/SKILL.md` (steps 6 and 7 and the first-release section
  only; the gate step is T7's), `ROADMAP.md` (the `next` wording at `:30` and `:33`),
  `CHANGELOG.md`.
- **1. The tag.** In all three jobs, `*-*) TAG=next ;;` (`publish.yml:69`, `:111`, `:163`) becomes
  `*-*) TAG=gate ;;`, and the comment at `:54-59` says why: a candidate waits on `gate`, hidden from
  `next`, until the gate passes. Raise the npm floor for OIDC dist-tags:
  `- run: npm install -g npm@11` (`:36`, `:98`, `:151`) becomes `npm@^11.21.0`, and the `WATCH`
  comment names the floor and the 12 line's 12.2.0.
- **2. Promotion.** `workflow_dispatch:` (`:16`) gains one input, `promote` (string, not required,
  described as a passed candidate's version). The three publish jobs gain
  `if: github.event_name == 'release' || inputs.promote == ''`, so a bare dispatch still publishes
  as today. A new job `promote`, `if: inputs.promote != ''`, with job-level
  `permissions: { contents: read, id-token: write }` and no checkout of dependencies and no `npm ci`
  (the #205 note): setup-node with the registry, `npm install -g npm@^11.21.0`, then one `run:`
  block that reads the input from `env:` (never `${{ }}` inside the script), refuses anything but a
  prerelease version (`^[0-9]+\.[0-9]+\.[0-9]+-[0-9A-Za-z.-]+$`), checks
  `npm view <pkg>@$V version` prints `$V` for all three packages before moving any, then runs
  `npm dist-tag add <pkg>@$V next` for each and prints `npm dist-tag ls <pkg>`.
- **3. The stable check.** `check-stable-source.mjs` reads `next` for all three packages
  (`npm view <pkg> dist-tags.next`), refuses when they differ or when tag `v<next>` is absent, and
  diffs `v<next>` against `HEAD`. It passes only when every changed line (`+` or `-`) is a
  `"version":` line in `package.json`, `package-lock.json`, `packages/cairn-cms-dev/package.json`,
  or `packages/create-cairn-site/package.json`, or a heading line or `<!-- release-size: ... -->`
  marker in `CHANGELOG.md`. Otherwise it fails naming each file and line. Keep the diff rule a pure
  exported function and inject the command runner, so the tests need no registry or repo state.
- **4. The skill.** In `cairn-releasing`: step 6's dist-tag sentences (`SKILL.md:165-167`) say a
  candidate goes to `gate` and a stable to `latest`; a new subsection after step 6, "Promote a
  passed candidate", gives `gh workflow run publish.yml -f promote=<version>`, its check
  (`npm view <pkg> dist-tags.next` prints the version for all three), and the fallback
  (`npm dist-tag add <pkg>@<version> next` by Geoff, three times, when the run reports the trusted
  publisher cannot manage dist-tags); the stable cut runs `node scripts/checks/check-stable-source.mjs`
  before `gh release create` and doesn't cut on a failure; step 7 verifies a candidate on `gate`;
  `:184`'s `--tag next` becomes `--tag gate`. Leave a marked placeholder line where T7's gate step
  goes, between the cut and "Promote".
- **Acceptance, each able to fail:**
  - `workflow-yaml.test.ts` pins, on the parsed workflow: each publish job's script maps `*-*` to
    `gate` and none maps a prerelease to `next`; each publish job's `if` skips a non-empty
    `promote`; the `promote` job exists, runs only on a non-empty `promote`, carries
    `id-token: write` at job level, has no `npm ci` step, and its script contains
    `npm dist-tag add` with `next` for each of the three package names; every npm install step pins
    `^11.21.0`.
  - Run the promote job's script body under `bash` with a stub `npm` on `PATH`: `promote=0.99.0`
    exits non-zero with no `dist-tag add` call; `promote=0.99.0-rc.3` with one package missing the
    version exits non-zero with no `dist-tag add` call; with all three present, it calls
    `dist-tag add` three times, each naming `next`.
  - `check-stable-source.test.ts`: a version-lines-only diff passes; a CHANGELOG heading-only diff
    passes; a one-line change in `src/` fails naming the file; a CHANGELOG body change fails;
    differing `next` across the three packages fails; a missing `v<next>` tag fails.
  - The fast lane passes. CI is green on the head (the path is protected, so the task waits for
    `ciWait`, off the path).
- **The live reads** belong to the conductor's release steps, written into the skill: after the
  `rc.3` cut, `npm view <pkg> dist-tags` shows `gate: 0.99.0-rc.3` and `next` unchanged on all
  three; after promotion, `next: 0.99.0-rc.3`.

### T5. Docs for the setup changes

60 min, ordinary (docs). Sonnet medium. Waits for Pair B.

- **Load `cairn-writing-docs`** and follow its case A, with a fresh `docs-fact-checker` run.
- **Pages, each read whole:**
  - `docs/admin/create-your-site.md`: the prose after the sign-in block ("The command then asks
    whether to connect a domain you own. Answering no changes nothing") says that answering no
    moves on to the Workers Builds offer, what connecting does, and that a publish deploys by
    itself only once Builds is connected. The marked block at `:108-115` follows the standing answer.
    Read the diagram and its caption against the new path.
  - `docs/admin/own-your-domain.md:87`: drop the email-before-Builds rule and the `--yes` skip.
  - `docs/admin/setup-recovery.md:72` (the declined-email row) the same; `:83`, "Nothing is wrong.
    Deploys still go through the setup command.", says a publish commits to GitHub and the live
    site doesn't change until `--connect` or a hand deploy.
  - Then search, per `.claude/rules/docs-with-code.md`:
    `grep -rn -i 'workers builds\|--connect\|rebuild\|set up end to end' docs/admin docs/editors skills`,
    read every hit outside history, and fix what is false (`skills/cairn-extending-a-site/references/public-routes.md:28`
    is one candidate: on a Builds site, setup commits the origin and Builds rebuilds).
- **Acceptance:** `npm run check:docs-gate` and `npm run check:transcripts` pass; Vale is clean;
  the fact-checker returns no wrong claim, or each dispute is under `## Decisions`; the grep above
  shows no page stating the old email rule or the `--yes` skip.

### T6a. The gate harness: driver, shim, fetch check, and the credential smoke

110 min, `runner`. Sonnet medium.

- **Files (new):** `scripts/gate/run-gate.sh`, `scripts/gate/gate.mjs`, `scripts/gate/driver.mjs`,
  `scripts/gate/xdg-open` (executable), `scripts/gate/fetch-check.mjs`, `scripts/gate/totp.mjs`,
  `scripts/gate/README.md`; tests `src/tests/unit/gate-{driver,fetch-check,totp,shim}.test.ts` and
  one integration test under `packages/create-cairn-site/test/`. Add `scripts/gate/` to
  `gate-table.json` beside `scripts/checks/` so it classifies as `runner`.
- **`run-gate.sh`** is the one entry. It sources `~/.local/secrets` (the script pattern `CLAUDE.md`
  names), and builds the child environment from an allowlist, never from the parent: `PATH` with
  `scripts/gate` first (for the shim), `HOME`, `TERM`, `LANG`, then
  `CLOUDFLARE_API_TOKEN="$CF_WS_CAIRN_GATE_TOKEN"`,
  `CLOUDFLARE_ACCOUNT_ID=120c269ad6d3dfbe6d63a0bb53758ca0`, a fresh `CAIRN_STATE_DIR` under a run
  directory, `GATE_URL_LOG`, and the `CAIRN_GATE_GH_*` names for the browser half. No secret name
  list is committed. It never echoes a value. Modes: `--smoke`, `--leg <A1|A2|B1|B2>`, `--all`,
  `--version <v>`.
- **`driver.mjs`** runs the real CLI on a 100 by 40 pty (reuse the transcript `ptycapture.py`'s
  approach in Node, or spawn `python3 -I` on the committed `ptycapture.py` with a driver mode) and
  answers prompts **by text, in any order**, from a table keyed by the prompt strings the CLI prints
  (from `prompts.mjs`, `github/chapter.mjs`, `cloudflare/{chapter,chapter2,chapter3,account}.mjs`,
  and `prefill.mjs:113`'s `Paste your Cloudflare API token`, answered with the gate token; finding
  2). Never `--yes`. A prompt with no table entry, or no new output for the browser step's 10
  minutes, fails naming the last screen. The token never reaches a log or the capture file (the
  masked prompt shows no characters; assert it).
- **`xdg-open`** appends its URL argument to `$GATE_URL_LOG` and exits 0. `open.mjs:27` already
  spawns `xdg-open`, so the CLI changes nothing.
- **`fetch-check.mjs`** polls a URL (cache-busting query, no cookies) every 15 s for up to 10
  minutes for a marker string, and returns `{ found, url, fetchedAt, attempts }`. A 200 without the
  marker never passes. A `--absent <minutes>` mode passes when the marker is still missing after
  that wait, for leg A1's "live page unchanged".
- **`totp.mjs`** is RFC 6238 over `node:crypto` (SHA-1, 30 s, 6 digits); no new dependency.
- **The smoke**, `bash scripts/gate/run-gate.sh --smoke`, creates nothing: the gate token's
  `accounts/<id>/tokens/verify` answers active; `wrangler whoami` under the child environment
  prints `/you are logged in/i` (finding 3; a miss stops for the conductor); `GET /user` with
  `CAIRN_GATE_GH_TOKEN` returns `CAIRN_GATE_GH_LOGIN`; a TOTP code computes. It prints each check's
  verdict, never a value.
- **Acceptance, each able to fail:**
  - Driver: a stub CLI printing prompts in a shuffled order, one table prompt never shown, gets
    every shown prompt answered and exits 0; a stub printing an unknown prompt fails naming it; the
    token string appears in neither stdout, the log, nor the capture.
  - Integration: the driver runs `node packages/create-cairn-site/bin.mjs` against the test fakes
    (`test/fake-github.mjs`, `fake-cloudflare.mjs`, `fake-bin.mjs`, the env bases the resume tests
    use) from a fresh run, domain no, Builds yes, to `builds-live`, with the shim first on `PATH`.
    The URL log holds the manifest URL, the install URL, and the sign-in link; the record ends at
    `builds-live`. This is what proves the answer table matches the CLI's real prompts.
  - Fetch check against a local HTTP server: the marker appearing on the third poll passes with
    `attempts: 3`; never appearing fails at a test-sized budget; `--absent` passes when missing and
    fails when present.
  - TOTP: the RFC 6238 SHA-1 test vectors.
  - Shim: writes its argument to the log, exits 0.
  - The smoke passes once, its output pasted (verdicts only) under `## Decisions`.
  - The fast lane passes.

### T6b. The gate harness: GitHub's pages, the admin publish, the legs, teardown, and the record

100 min, `runner`. Sonnet medium. After T6a.

- **Files (new):** `scripts/gate/browser.mjs`, `scripts/gate/teardown.mjs`,
  `scripts/gate/record.mjs`, tests `src/tests/unit/gate-{browser,teardown,record}.test.ts` with
  saved page fixtures; `gate.mjs` and `README.md` extended.
- **`browser.mjs`** (root `playwright`, `package.json:269`): a stored session for the machine
  account at `~/.local/state/cairn-gate/github-session.json`, outside git; a fresh sign-in with
  password and a TOTP code when the session is gone, and the same code for a sudo prompt. It opens
  each URL the shim logged and acts by page: on the App manifest page it clicks **Create GitHub
  App**; on the install page it chooses the account and **Install**; an OAuth authorize page that
  appears is approved; Cloudflare's Workers and Pages App install on the machine account runs the
  same way on the first run. Each step waits at most 10 minutes. A page it can't recognize stops the
  run with a screenshot path and the design's standing answer (Geoff clicks once).
  The admin half opens the captured sign-in link, clicks **Sign in**, opens one existing entry,
  inserts a unique marker (`gate-<version>-<leg>-<epoch>`) into its body, selects **Publish**, and
  returns the alert's text.
- **The legs** (`gate.mjs`), each from `create-cairn-site@gate` at `--version`, names
  `cairn-e2e-gate-<version slug>-<a|b>-<yymmddhhmm>`, checked at 34 characters or fewer:
  - **A1:** install A, domain `carin-test.org`, email on with `GATE_OWNER_EMAIL`, Builds no. The
    CLI's closing block holds the not-connected sentence. Publish; the alert reads
    `Published. The live site shows this change once the site rebuilds.`; the marker's commit is on
    the repository's default branch (GitHub API, machine token); `fetch-check --absent 5` on
    `https://carin-test.org/<entry path>` passes.
  - **A2:** re-run with `--connect`; the closing block holds the connected sentence. Publish; the
    fetch finds the marker on `https://carin-test.org/<entry path>` within 10 minutes.
  - Teardown A, before B takes the domain.
  - **B1:** install B, domain no, Builds yes; the closing block holds
    `This site is set up end to end.` and the connected sentence. Publish; the fetch finds the
    marker on the workers.dev address.
  - **B2:** re-run, domain `carin-test.org`, email on (the Builds path, no local deploy); publish;
    the fetch finds the marker on `https://carin-test.org/<entry path>`.
  - Teardown B.
- **`teardown.mjs`** removes, for one install, only names starting `cairn-e2e-gate-`: the Worker
  and its custom domain, the D1 database, the R2 bucket (emptied first), the Builds trigger, repo
  connection, and build token registration (Cloudflare API, gate token), the repository (GitHub API,
  machine token), and the App (browser, its Advanced settings' delete). It leaves the
  `carin-test.org` zone and its Email Sending in place. It refuses any other name before any call.
- **`record.mjs`** appends a `## Gate` table to release `v<version>`'s body with
  `gh release edit v<version> --notes-file <file>`: leg, path, URL, commit, marker, fetch time,
  verdict. It reads the body first and replaces an earlier `## Gate` section rather than stacking.
- **Acceptance, each able to fail:**
  - Browser, against saved HTML fixtures of the manifest, install, authorize, and sign-in pages
    served locally: the right control is clicked on each; an unknown page stops with a screenshot
    path; TOTP fills the 2FA field.
  - Teardown: a name without the prefix is refused with no call made (stub fetch records none); a
    prefixed install issues each delete once, in order, against stub APIs.
  - Record: an existing `## Gate` section is replaced, not duplicated; the table carries every
    column.
  - `gate.mjs --plan` prints the four legs and their checks without running them, and each leg's
    pass condition is a fetch result or a page-read string, never an exit code.
  - The fast lane passes.

### T7. The gate step in `cairn-releasing`

25 min, `runner`. Sonnet medium. After T6b.

- **Files:** `.claude/skills/cairn-releasing/SKILL.md` (T4's placeholder), `CHANGELOG.md` none.
- **Content:** between the cut and "Promote a passed candidate", a "Gate the candidate" step: the
  pre-gate checks (Email Sending on `carin-test.org`, Workers Paid, the smoke), the command
  `bash scripts/gate/run-gate.sh --all --version <v>`, the pass bar (every leg's fetch or page
  read, recorded under `## Gate` in the release body), the design's standing answers (a failed leg
  fixes forward to the next candidate and reruns only the legs its path touches; a Builds outage
  gets one rerun after 15 minutes; a GitHub page the harness can't pass asks Geoff once and files
  the fix), and Geoff's own install on the final candidate before the stable cut. Step 7's verify
  runs after promotion.
- **Acceptance:** `npm run check` passes the skill's form checks; a read of steps 6 to 7 in order
  names every command the conductor runs from the merged tree, and `grep -n 'gate' SKILL.md` shows
  no `next` left where a candidate's first tag is meant. The run sheet's steps 11 and 12 live in
  the state directory, outside the repo; the conductor repoints them.

## Close

- Whole-branch `standards:diff-reviewer`, then `standards:web-auth-security-reviewer` and
  `standards:cloudflare-workers-reviewer` on the `auth-data` diff, folded with no open finding.
  `standards:svelte-reviewer` reads the one `EditPage.svelte` line.
- Green CI on the head. List every retried test as flake evidence.
- Finalize the `## Unreleased` entries in `CHANGELOG.md` and `MIGRATION-NOTES.md`.
- File the found items. Close #317, #206, #202 in BACKLOG.
- The PR body per `pass-core` "Close": `## Brief`, what landed, each security verdict,
  `## Decisions` (the spinner evidence, the smoke's verdicts, the admin smoke not owed),
  `## Planning misses`, `## Tooling` (each skill, agent, gate, or hook that failed, misled, or was
  missing, with its fix or backlog number; seeds below), found items, and the score with the plan's
  path, 455, beside the actual.
- Delete the plan files in a final commit.

`## Tooling` seeds from planning: the worktree guard refused a `sed` over a variable-held path to a
file outside the worktree (read with the Read tool instead); the design stated the teardown rule
covered the gate's resources when it covers `glw907` repositories only (finding 4); the design
routed the gate token through `CAIRN_CF_API_TOKEN`, which the CLI reads only under `--yes`
(finding 2).
