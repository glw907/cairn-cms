# Setup fix and pre-cut release gate: design

Facts are read at `main` commit `1ae692ae1` (the `0.99.0-rc.2` cut) unless marked. Initiative:
`shared-standards`, the record the cairn run's packets carry. The plan goes on this branch,
`setup-fix`.

Approved by Geoff on 2026-11-02, packet `20261102T213128-1466750`, every recommendation taken: two
installs on every candidate; the neutral sentence "Published. The live site shows this change once
the site rebuilds." with no new setting; the run's limit raised to 3,400 actual minutes.

Revision 1, 2026-11-02: after approving, Geoff asked for the real install's browser steps to be
automated, so the gate runs as a test without him. This revision makes the gate unattended on
every candidate and moves his browser leg to once per stable. It changes only the gate; the rest
stands as approved. Geoff approved it on 2026-11-02, packet `20261102T221501-1497206`, every
recommendation taken: a GitHub machine account driven by Playwright; one scoped token,
`ws-cairn-gate`, on the current account; his own install once per stable, before the cut.

Revision 2, 2026-11-02: the plan review found that Workers Builds accepts only user-owned tokens,
and two smaller calls. The three decisions above are open; the rest stands.

## Brief

A site set up on its free workers.dev address will deploy every publish once this lands, and no
candidate reaches testers again until a real install has fetched a published edit from its live
address. The release stays held until both are built and the gate passes on `rc.3`.

On `rc.2`, a site whose owner skipped the domain question never reaches the Workers Builds step, so
a publish commits to GitHub and the live site never changes, while the admin says it is
rebuilding. The fault has been in the code since `0.95.0`, and no check read the live site.

### What changes

- Skipping the domain goes straight to the Workers Builds offer, so the default path ends with
  publishes going live by themselves.
- Connecting a domain or turning on email sign-in still works after Builds is connected. The tool
  commits those settings to the repository and lets Builds deploy them, so a later publish can't
  undo them. The rule that connecting Builds ends the email offer goes away.
- Every closing screen says whether a publish goes live by itself. "This site is set up end to
  end" no longer prints before the domain and Builds steps.
- The admin's publish message stops claiming a rebuild it can't see (your call below).
- Each candidate publishes to a hidden `gate` tag first. Two real installs run from it with no one
  at the keyboard, publish an edit at every stopping point, and pass only when each edit is
  fetched from the live address. Then the candidate moves to `next`. A stable release is cut only
  from a tree a passed candidate already proved.
- A test GitHub account and a scoped Cloudflare token stand in for your sign-ins on every
  candidate. You run one install in your own browser once per stable, about 15 minutes, which
  covers the real sign-in pages the test account skips.
- Two small faults from the `rc.2` run go too: the page of build warnings on first setup and the
  stray spinner frame after the closing text.

### If you approve

1. The session merges standards#9, which adds the plan-review check this miss called for.
2. A planner writes and reviews the plan unattended, then launches the executor. It stops only on
   a standing answer that runs out.
3. The pass touches setup credentials and the publish workflow, so its PR comes to you as a packet
   with a security read and CI. The pass ends at that PR and publishes nothing.
4. After the merge, you do a one-time setup: turn on dist-tag moves for the three npm trusted
   publishers, create the GitHub test account, and make the short-lived token the session uses to
   mint the gate's Cloudflare token. The conductor then cuts `rc.3` to the hidden tag and runs the
   gate without you. The gate is the live proof: a failure is fixed forward before any tester sees
   the candidate.
5. Before the stable cut, you run your 15-minute install on the final candidate.
6. The rest of the release follows the run sheet from step 14: recapture, stable, verify.

### Decide: A user-owned gate token

Workers Builds refuses account-owned tokens today, so the approved account-owned `ws-cairn-gate`
would fail at the Builds step on every leg. Your token scheme makes a script's token
account-owned so it outlives one person's login. A user-owned gate token is an exception to that
rule, with the same eight permissions and its zone side on `carin-test.org` only.

Source: <https://developers.cloudflare.com/workers/ci-cd/builds/api-reference/> ("Account-scoped
tokens are not supported"); `~/.claude/docs/cloudflare-estate-inventory.md`, rules 2 and 6.

- Mint `ws-cairn-gate` user-owned, recorded as an exception until Builds accepts account tokens
  (recommended)
- Keep it account-owned, and the gate's Builds legs run on your browser sign-in instead

### Decide: Check the sign-in email's sender

The gate proves each publish reaches the live site. It doesn't yet prove that a site with email
sign-in sends from its own domain. Reading the From address of one sign-in email, from the ward
probe mailbox, adds about 20 minutes to one task.

Source: the planner's fold record, task T6b.

- Read the sender of one sign-in email after install B turns email on (recommended)
- Leave email delivery to the domain chapter's own test send

### Decide: Move the setup tool's latest tag on promotion

`npx create-cairn-site@latest` serves `0.99.0-rc.1`, since its first publish was by hand, and the
re-run lines the tool prints carry no version. A tester's re-run can fetch `rc.1`, which deploys a
stale local copy over a live Builds site. The engine packages' `latest` stays on the last stable.

Source: `npm view create-cairn-site dist-tags`; the planner's fold record, task T4.

- Promotion moves `create-cairn-site@latest` to each passed candidate until the stable ships
  (recommended)
- Leave `latest` alone, and testers re-run with an explicit version

### Worth knowing

The ledger asked for a gate run from a packed tarball. That can't prove the Builds path, because
Cloudflare's builder installs the engine from the npm registry and never sees a local file. The
hidden `gate` tag gives the same protection with real registry installs: testers on `next` never
see a candidate until it passes.

### Your earlier calls

You approved the first version with every recommendation: two installs on every candidate, the
neutral publish sentence with no new setting, and the run's limit at 3,400 actual minutes. They
stand. Two installs now cost you no time per candidate. On revision 1 you chose a GitHub machine
account driven by Playwright, one scoped Cloudflare token on the current account, and your own
install once per stable. Revision 2 changes only the token's ownership.

### Standing answers

The run uses these without asking you.

- The plan's path estimate is 540 minutes and its ceiling 1,080. A plan over 1,080 after its
  cuts stops for you.
- A gate leg that fails is fixed forward on this branch's successor, published as the next
  candidate to `gate`, and only the legs whose path the fix touches rerun.
- A GitHub page the harness can't get past (a redesign, a bot check) stops that run and asks for
  your clicks once; the harness fix lands as a backlog item for the next pass.
- A Builds deploy that fails for a cause outside the change (a Cloudflare outage, a registry
  delay) gets one rerun after 15 minutes; a second failure stops for you.
- The first install's Worker is removed before the second install takes the test domain. Both
  installs are named `cairn-e2e-gate-*`, which the existing teardown permission covers.
- The `cairn-rc2-install` site is left as it is.

### Backlog sweep

Scoped to setup and the release. Approving applies these.

- #317 (a `--yes --dry-run` preview of the Builds skip): fold. The skip it previews is removed.
- #185 and #274 (transcript recaptures): keep, placed after the `rc.3` gate passes.
- #245 (a publish through the scoped token): keep at the real install; the gate's publishes run
  through the scaffolded App only.
- #202 (a crash between the sender write and its deploy): keep after the release. On a Builds site
  the new path closes it, since the reconcile compares the files on disk.
- #206, #246, #304: keep as placed.

### Calls the conductor made

A fresh reviewer read this design as its builder would, and these four answers came from that
read. Each is a method call, open to your reversal.

- Promotion runs inside `publish.yml`, since npm binds each trusted publisher to that file name.
- `next` naming a version is the record that its gate passed, and the stable check reads it.
- A Builds site settles back at `builds-live` after a later domain or email run, so the Go tool's
  step names don't change.
- The pass ends at its PR. The `rc.3` cut and the gate are release steps after the merge.

## Design

### Why the default path fails

`runChapter2` returns `admission-declined` when the owner says no to the domain
(`chapter2.mjs:551-553`). `continueIntoChapter2` sends any outcome outside chapter 2's
`TERMINAL_STEPS` to `printLiveInfo` and stops (`bin.mjs:288-312`), and both members of
`TERMINAL_STEPS` (`email-live`, `paid-plan-declined`) need a domain. Chapter 3 already handles a
workers.dev site: its completion check falls back to the workers.dev host
(`chapter3.mjs:626`), and `--connect` admits a record at `live` (`bin.mjs:59-60`). The admin's
message is a fixed string (`EditPage.svelte:1336`), and `golden-path.spec.ts:219` asserts only
that string.

### The setup tool

1. **Routing.** A declined domain admission continues into chapter 3 in the same run, as a terminal
   outcome does. A plain re-run at `live` asks the domain question again, then reaches chapter 3
   the same way. Under `--yes` without `--domain`, chapter 3 connects, as `--yes` already does.
2. **Builds-aware domain and email.** Today, connecting Builds closes the email offer because
   chapter 2's email hop ends in a local build and deploy, which would replace what Builds deploys
   from the repository (`chapter2.mjs:132-148`, `chapter3.mjs:946-955`). The invariant replaces
   that rule: on a record with Builds connected, every configuration change chapter 2 makes
   reaches the repository before the next Builds deploy, and chapter 2 never deploys locally.
   Chapter 2 writes its files as it does now, then commits them through chapter 3's existing
   reconcile hop (`reconcileRepo`, which already owns `wrangler.jsonc` and
   `src/theme/cairn.config.ts`), watches the Builds deploy, and checks the host. That covers both
   local deploys chapter 2 makes today: the domain cutover's (`hostname.mjs:382-383`) and the
   email hop's. The domain offer at a `builds-live` record with no domain, and the email offer
   after Builds, both reopen. `hasOpenEmailDecline` loses its Builds exclusion, and the `--yes`
   skip and its closing copy go. The builder decides where the shared hop lives; the existing
   reconcile's local hash gate stays the resume signal.

   A Builds record that finishes chapter 2 settles back at `builds-live`, as `continueIntoChapter2`
   already settles a Builds decline back at `builds-connect-declined` (`bin.mjs:296-299`). Its
   domain and email facts live in the record's fields, so the step contract the Go tool mirrors
   (`tool/internal/spine/step.go:23-27`) doesn't change. The plan checks how `cairn doctor` reads
   a site's domain and email state; if it reads `step`, that read joins the pass under the tool's
   gate. (Builder check, 2026-11-02; conductor's call.)
3. **Closing screens.** Each terminal block states whether a publish deploys by itself. A
   `builds-connect-declined` site on workers.dev says plainly that a publish commits to GitHub and
   the live site does not change until the owner runs `--connect` or deploys by hand.
   "This site is set up end to end." prints only at a terminal step.
4. **Quieter first run.** Build output prints in full only when the build fails; a successful
   build prints one line. The closing block ends cleanly, with no spinner frame after it.

### The admin message

Per the decision above. With the recommended choice, the string changes in `EditPage.svelte`,
the e2e assertion, and every page that quotes it (`docs/editors/publish-and-history.md:86`,
`docs/admin/rotate-the-github-app-key.md:86`), with a `CHANGELOG.md` line. No setting is added.

### The release gate

1. **Hidden tag.** `publish.yml` sends a prerelease to the `gate` dist-tag instead of `next`. A
   `workflow_dispatch` trigger with a version input, in `publish.yml` itself, moves `next` to that
   version for all three packages through the trusted publisher's opt-in dist-tag permission
   (GitHub changelog, 2026-09-30:
   <https://github.blog/changelog/2026-09-30-opt-in-dist-tag-permissions-for-npm-trusted-publishing>).
   It stays in `publish.yml` because each trusted publisher is bound to that file name
   (`publish.yml:121-123`, `cairn-releasing` step 7), so a separate workflow would fail OIDC. The
   plan probes the permission on a throwaway dispatch before any task depends on it; if the probe
   fails, promotion becomes a `[you]` `npm dist-tag add` in the gate sitting. A version on `gate`
   still matches a caret range pinned to an earlier candidate; no site pins one.
2. **Two installs, from `create-cairn-site@gate` under `clean-env`, unattended:**
   - Install A, domain first: connect the test domain `carin-test.org` (its zone is already active
     on the account), turn email on, decline Builds. Publish an edit. The admin message reads as
     decided, and a fetch shows the live page unchanged. Run `--connect`, publish again, and fetch
     the edit from the domain.
   - Remove install A's Worker.
   - Install B, the default path: decline the domain, accept Builds. Publish, then fetch the edit
     from the workers.dev address. Re-run, connect `carin-test.org`, turn email on through the
     Builds-aware path, publish, and fetch from the domain.
3. **The pass bar.** A leg passes only when a script fetches the live address and finds the
   edit's unique marker, polling for up to 10 minutes. A success message, an exit code, or a commit
   on the remote never passes a leg. Each leg's record (path, URL, commit, marker, fetch time)
   goes in that candidate's GitHub release body, under a `## Gate` heading.
4. **The harness.** No CLI seam is added; the harness drives the real CLI.
   - The driver answers prompts by matching their text, without `--yes`, so a prompt the run
     skips can't stall it (the `rc.2` driver matched answers in order) and the reconcile runs
     rather than parking.
   - Every browser trip goes through `xdg-open` (`src/github/open.mjs`). A shim earlier on `PATH`
     captures each URL and hands it to Playwright.
   - Playwright runs a stored session for the GitHub machine account, with its TOTP secret for a
     fresh sign-in or a sudo prompt. It clicks Create on the real manifest page and Install on the
     install page (<https://docs.github.com/en/apps/sharing-github-apps/registering-a-github-app-from-a-manifest>,
     <https://docs.github.com/en/rest/apps/installations>). The reconcile's repeat authorize needs
     no click (<https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps>).
     The session file stays out of git (<https://playwright.dev/docs/auth>).
   - The gate token reaches wrangler as `CLOUDFLARE_API_TOKEN` with `CLOUDFLARE_ACCOUNT_ID`
     (<https://developers.cloudflare.com/workers/wrangler/system-environment-variables/>), and the
     CLI's chapters 2 and 3 as `CAIRN_CF_API_TOKEN` (`src/cloudflare/prefill.mjs`).
   - Playwright opens the captured bootstrap sign-in link, publishes the edit, and the fetch
     script checks the live address.
   - After each run the harness deletes the Apps it made, through the same browser, since GitHub
     offers no API for it and caps an account at 100 Apps
     (<https://docs.github.com/en/apps/maintaining-github-apps/deleting-a-github-app>). It removes
     the test repositories and the Workers with them.
   - Each browser step times out after 10 minutes, as now.
   - GitHub's terms allow one machine account per person
     (<https://docs.github.com/en/site-policy/github-terms/github-terms-of-service>).
5. **Promotion.** A passed gate moves the candidate to `next`, so `next` only ever names a passed
   candidate, and that is the signal the stable check reads. A stable is cut only from a commit
   whose tree matches the tag of the version `next` names, except for the version fields and the
   changelog heading. A script the release skill runs before `gh release create` enforces it; it is
   a skill step, not a CI guard. Before the cut, Geoff runs install B's first leg on the final
   candidate in his own browser, with his own accounts.
6. **Where it lives.** `cairn-releasing` gains the gate between "cut" and "verify", and the run
   sheet's steps 11 and 12 point at it.

### Not in scope

The email-declined path's live leg, a deploy-status read in the admin, and migrating
`cairn-rc2-install`, which stays as evidence.

### Pre-flight the design foresees

- `[you]` Turn on "Allow npm dist-tag" for `@glw907/cairn-cms`, `@glw907/cairn-cms-dev`, and
  `create-cairn-site` on npmjs.com, after the merge and before `rc.3`. The plan probes the exact
  control and the check that shows it on.
- `[you]` Create the GitHub machine account, unless you already hold one, with 2FA on. Its
  password and TOTP secret reach the session through `secret-receive`, and Proton Pass keeps the
  record.
- `[you]` Make `tmp-token-setup` (My Profile > API Tokens, the "Create Additional Tokens"
  template, TTL ending tomorrow; `~/.claude/docs/cloudflare-estate-inventory.md`, item 6), so the
  session can mint the user-owned gate token `ws-cairn-gate` (age store `CF_WS_CAIRN_GATE_TOKEN`)
  with the CLI's eight Edit groups (`prefill.mjs:44-50`), its zone groups on `carin-test.org`
  only, add its row to the inventory as an exception to rule 2, and delete the temporary token.
- `[you]` For the machine account: a classic personal access token with `repo` and `delete_repo`,
  for repository teardown and the account check. Store names `GITHUB_TEST_LOGIN`,
  `GITHUB_TEST_PASSWORD`, `GITHUB_TEST_TOTP_SECRET`, `GITHUB_TEST_TOKEN`. (Planning miss:
  the plan review found it.)
- `[you]` Before the first gate run: connect the machine account's GitHub to Workers Builds in the
  Cloudflare dashboard, with All repositories. (Planning miss: the plan review found it.)
- The session checks, before the gate, that `carin-test.org` has Email Sending on and the account
  is on Workers Paid.
- The plan reads `gh workflow run publish.yml` for the promotion and the gate's teardown against
  auto mode, and brings any refusal as one pre-launch list.
- The pass ends at its PR and publishes nothing. Cutting `rc.3`, the gate, and promotion are the
  conductor's release steps after the merge, so the PR's packet claims CI and the security read,
  never the gate.
- Your one install per stable: the default path in your own browser, about 15 minutes.

### Risk and estimate

The class is `auth-data` (`packages/create-cairn-site/src/{github,cloudflare}/**`) plus `runner`
(`.github/workflows/**`). The close takes `standards:web-auth-security-reviewer` and
`standards:cloudflare-workers-reviewer`. The gate on `rc.3`, after the merge, is the live proof. The
estimate is 540 path minutes: routing and closing screens 60, the Builds-aware chapter 2 180, the
message 20, the publish workflows and skill 90, the unattended harness and fetch check 210, docs
60, with
the workflow and harness tasks paired beside chapter 2. Ten recent passes ran at 0.58 of plan.
The chapter 2 task upshifts `cairn-implementer` to Opus, since it is new correctness logic.
