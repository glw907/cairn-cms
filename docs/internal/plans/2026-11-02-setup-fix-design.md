# Setup fix and pre-cut release gate: design

Facts are read at `main` commit `1ae692ae1` (the `0.99.0-rc.2` cut) unless marked. Initiative:
`shared-standards`, the record the cairn run's packets carry. The plan goes on this branch,
`setup-fix`.

Approved by Geoff on 2026-11-02, packet `20261102T213128-1466750`, every recommendation taken: two
installs on every candidate; the neutral sentence "Published. The live site shows this change once
the site rebuilds." with no new setting; the run's limit raised to 3,400 actual minutes.

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
- Each candidate publishes to a hidden `gate` tag first. The session runs two real installs from
  it, publishes an edit at every stopping point, and passes only when it fetches each edit from
  the live address. Then the candidate moves to `next`. A stable release is cut only from a tree a
  passed candidate already proved.
- Two small faults from the `rc.2` run go too: the page of build warnings on first setup and the
  stray spinner frame after the closing text.

### If you approve

1. The session merges standards#9, which adds the plan-review check this miss called for.
2. A planner writes and reviews the plan unattended, then launches the executor. It stops only on
   a standing answer that runs out.
3. The pass touches setup credentials and the publish workflow, so its PR comes to you as a packet
   with a security read and CI. The pass ends at that PR and publishes nothing.
4. After the merge, you turn on dist-tag moves for the three npm trusted publishers (a few clicks
   in one npm sign-in). The conductor cuts `rc.3` to the hidden tag, and you do the browser
   approvals in one gate sitting. The gate is the live proof: a failure is fixed forward before any
   tester sees the candidate.
5. The rest of the release follows the run sheet from step 14: recapture, stable, verify.

### Decide: How much the gate installs for each candidate

Every candidate costs you a sitting of browser approvals, about four per install. Two installs
reach every setup step at least once and every stopping point a publish can land on. A third
would add only the email-declined branch, which is a refusal the unit tests cover.

Source: `packages/create-cairn-site/src/cloudflare/chapter2.mjs:94`, `chapter3.mjs:66`, and the
`rc.2` run in the ledger.

- Two installs on every candidate, about 45 minutes of your time (recommended)
- Two installs only when setup code changed since the last passed gate, otherwise the workers.dev
  half alone
- Three installs, adding the email-declined path

### Decide: What the admin says after a publish

The admin can't see whether a site deploys on a commit. A truthful sentence fits both kinds of
site with no new setting. A setting that the setup tool writes would let the message be exact on
both, but it is new public surface for one sentence, and every site the tool sets up after this
fix deploys on publish unless its owner declined.

Source: `src/lib/admin/EditPage.svelte:1336`; the scope charter.

- "Published. The live site shows this change once the site rebuilds." with no new setting
  (recommended)
- A deploy setting the setup tool writes, with one message for each kind of site

### Decide: The run's minute limit

The run sheet stops the run at 2,900 actual minutes at the next pass boundary. The run stands near
2,520, and this pass is likely to take about 250 to 420 more, plus the gate sitting, so it lands
on the line.

Source: ledger "Rulings" 2026-11-01 and "Conductor state".

- Raise the limit to 3,400 for this pass and the release steps after it (recommended)
- Keep 2,900, and the run stops at this pass's boundary for your word

### Worth knowing

The ledger asked for a gate run from a packed tarball. That can't prove the Builds path, because
Cloudflare's builder installs the engine from the npm registry and never sees a local file. The
hidden `gate` tag gives the same protection with real registry installs: testers on `next` never
see a candidate until it passes.

### Standing answers

The run uses these without asking you.

- The plan's path estimate is 420 minutes and its ceiling 840. A plan over 840 after its cuts
  stops for you.
- A gate leg that fails is fixed forward on this branch's successor, published as the next
  candidate to `gate`, and only the legs whose path the fix touches rerun. Each rerun still needs
  your browser approvals.
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
2. **Two installs, from `create-cairn-site@gate` under `clean-env`, the session driving:**
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
4. **The harness.** The driver answers prompts by matching their text, so a prompt the run skips
   can't stall it (the `rc.2` driver matched answers in order). Each browser trip times out after
   10 minutes, as now.
5. **Promotion.** A passed gate moves the candidate to `next`, so `next` only ever names a passed
   candidate, and that is the signal the stable check reads. A stable is cut only from a commit
   whose tree matches the tag of the version `next` names, except for the version fields and the
   changelog heading. A script the release skill runs before `gh release create` enforces it; it is
   a skill step, not a CI guard. After the stable publishes, install B's first leg runs once
   against `latest`.
6. **Where it lives.** `cairn-releasing` gains the gate between "cut" and "verify", and the run
   sheet's steps 11 and 12 point at it.

### Not in scope

The email-declined path's live leg, a deploy-status read in the admin, and migrating
`cairn-rc2-install`, which stays as evidence.

### Pre-flight the design foresees

- `[you]` Turn on "Allow npm dist-tag" for `@glw907/cairn-cms`, `@glw907/cairn-cms-dev`, and
  `create-cairn-site` on npmjs.com, after the merge and before `rc.3`. The plan probes the exact
  control and the check that shows it on.
- The session checks, before the gate, that `carin-test.org` has Email Sending on and the account
  is on Workers Paid.
- The plan reads `gh workflow run publish.yml` for the promotion and the gate's teardown against
  auto mode, and brings any refusal as one pre-launch list.
- The pass ends at its PR and publishes nothing. Cutting `rc.3`, the gate, and promotion are the
  conductor's release steps after the merge, so the PR's packet claims CI and the security read,
  never the gate.
- Your gate sitting: about four browser approvals per install (the GitHub App, its install, the
  Cloudflare sign-in, and the token pages), and one GitHub sign-in per reconcile.

### Risk and estimate

The class is `auth-data` (`packages/create-cairn-site/src/{github,cloudflare}/**`) plus `runner`
(`.github/workflows/**`). The close takes `standards:web-auth-security-reviewer` and
`standards:cloudflare-workers-reviewer`. The gate on `rc.3`, after the merge, is the live proof. The
estimate is 420 path minutes: routing and closing screens 60, the Builds-aware chapter 2 180, the
message 20, the publish workflows and skill 90, the harness and fetch check 90, docs 60, with
the workflow and harness tasks paired beside chapter 2. Ten recent passes ran at 0.58 of plan.
The chapter 2 task upshifts `cairn-implementer` to Opus, since it is new correctness logic.
