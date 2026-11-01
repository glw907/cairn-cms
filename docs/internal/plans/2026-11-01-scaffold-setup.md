# Scaffold setup pass plan

Initiative: none. A cairn-only pass; this plan lives on its branch and is deleted at close.
Design: `docs/internal/plans/2026-11-01-scaffold-pass-design.md`, a verbatim copy, approved by Geoff
on 2026-11-01: "design and scaffold-setup's merge are pre-approved".
Risk class: `auth-data`, with `runner`. Not `live-account`: every setup test runs on the fake GitHub
and Cloudflare.
Repo: glw907/cairn-cms. Main checkout `/var/home/glw907/Projects/cairn-cms`. Push target
`glw907/cairn-cms`. Branch `scaffold-setup`, worktree
`/var/home/glw907/Projects/cairn-cms/.claude/worktrees/scaffold-setup`, PR base `main`.
Executor: `cairn-cms-scaffold-setup`, Sonnet at medium, launched by `conductor-cairn-cms`. It ends at
PR-ready and never merges. Pairs go to `cairn-implementer` at `sonnet` and `medium`. Reviewers and
`docs-fact-checker` run at `opus` and `medium`.
Path estimate: 310 minutes (design 245, ceiling 490). The rise is #183: the re-offer was unreachable
on the normal path, so it became its own task. Review: three lenses, folded by the planner, then a
verification read.

Cleared items: #42, #97, #174, #175, #177, #183, #184, and #195's workflow half. #185 moves to the
release act. Nothing bumps or publishes. `RUN_GATE_IF_BUSY` is never set on this pass.

## Pre-flight

None from Geoff. Checks the conductor runs before launch: on `main` in the main checkout,
`rev-list --count HEAD..origin/main` at 0, no process on this worktree, `git status` clean in it, and
`scaffold-setup` on origin at the commit that carries this plan.

## Read this first

The design's "Scope", "#195's workflow half", "End-to-end check", "Parallel run", and "Standing
answers" sections govern. These planning findings settle what it marked unverified, or correct it.

- **#183's re-offer is unreachable from chapter 2 alone.** A decline falls straight into chapter 3
  (`bin.mjs:264-267`, pinned by `test/resume-chapter3.test.mjs:258`), which overwrites the step with
  `builds-connect-declined` or `builds-live` (`chapter3.mjs:950`, `:636`). A plain re-run from those
  steps takes `bin.mjs:569` and prints a closing block. So T3 changes `bin.mjs` too.
- **#183 can't simply drop the short-circuit.** `STEP_ORDER` in `chapter2.mjs` omits
  `paid-plan-declined`, so `stepIndex` returns 0 and `hasReached` reads a declined record as `live`.
  Falling through would rerun the zone, carry-over, and cutover hops on a finished domain.
- **`check:leaks` needs two edits.** `profileFor` returns `null` for an unknown path, so adding to
  `SCAN_ROOTS` alone scans nothing. A probe of the 49 shipped files through `scanText` at the T2 profile
  found nothing, so the check should pass with no allowance.
- **The tarball fix is proven.** With `npm` 11.20, adding `"!src/**/*.test.mjs"` to `files` in a scratch
  copy packed 51 files and no test. `npm pkg fix` rewrites `bin` to `"bin.mjs"`.
- **`npm view` exits.** A missing package and a missing version of a real package each exit 1 with
  `npm error code E404`, including under setup-node's placeholder token. So the guards read the
  code from the captured output and tell the two probes apart by which one ran.
- **`npm publish <tgz>` works from a workspace folder**, per a `--dry-run` probe without `--provenance`,
  which stays the design's unverified line.
- **Prerendered files land in `.svelte-kit/cloudflare/`**, per a showcase build in another worktree:
  `sitemap.xml`, `robots.txt`, `feed.xml`, `feed.json`, `*.html`, `*.md`, and `__data.json` files,
  beside `_worker.js` and `_app/`. Only those two skipped paths hold `showcase.test` for a reason that
  survives the rewrite: the sender, and admin code that imports the adapter.
- **`bin.mjs:258` in the design is stale.** The unconditional `printLiveInfo` is at `bin.mjs:269`. The
  live string is "Connect your domain any time by re-running"; ROADMAP's "own domain" is old wording.
- **`openBrowser` is shared.** `src/github/open.mjs:75` serves every trip, so #174's warning goes at
  the App trip: `runManifestFlow`'s caller at `src/github/chapter.mjs:283-296`, or `manifest.mjs`.
- **`openBrowser` has no `dir`.** For #177's `--dir <dir>` line, reword to "re-run the same
  npx create-cairn-site command with --sign-in", which keeps the signature.
- **`#97`'s early save widens a backward write.** `src/github/chapter.mjs:333-334` writes
  `awaiting-org-approval` with no guard, unlike `:330`. T2 guards it.
- **`publish.yml` never runs on a pull request** (`.github/ci-green.json`), so CI proves nothing about
  the job. T4's proof is a stub run of its guards and a YAML parse.
- **Plan files** live under `docs/internal/plans/`, since `docs/plans/**` lost its Vale exclusion in
  `f9cd864c2`, and a plan there turns `check:docs-gate` red.

## Rules for every task

- Run the setup command from `cairn-running-passes` in each new worktree, including this one.
- An `auth-data` task writes its failing test first and commits each item separately, so
  `standards:diff-reviewer` can read each commit while CI runs. A `fix` or `escalate` stops the line.
- After each task: `npm run lane:fast -- --range <base>..HEAD`, through `cairn-run-gate` per `cairn-pass`.
  The package suite is `npm test -w packages/create-cairn-site` on the light lane. Gates share the
  heavy lane with the media and template passes.
- `node scripts/checks/gate-tier.mjs --range <base>..HEAD --protected` prints `ciWait` once a workflow
  path is in the range, and `fast-lane.mjs` doesn't print it. Pair 2 and T6 touch workflows, so wait for
  CI on the pushed head before starting T6 and before starting T7.
- Each accepted-task report names the CI verdict on that head.
- Any change to the showcase or `skills/` runs `npm run emit:template` and commits `templates/waymark/**`.
  Only T1 changes them in this pass.
- Write the clock file per `pass-core` "Clock stop" with the estimate below.
- A test that pins old copy changes with it, listed under `## Decisions`.
- Leave `test/fixtures/transcripts/**` and the transcript blocks that quote them alone. List each stale
  block in the PR body for #185's recapture.

## Tasks

### Pair 1 (path 85)

Run T1 and T2 as a pair with `isolation: "worktree"`, descriptions `scaffold-setup task T1` and
`scaffold-setup task T2`. Merge T2 first, then T1, run the fast lane, push, and open the draft PR.
A conflict under `packages/create-cairn-site/test/` is mechanical, not a stop.

T1 owns `src/cloudflare/**`, the showcase, and everything under `test/` except what T2 names. T2 owns
`src/github/**`, `bin.mjs`, `src/scaffold.mjs`, and `src/money.mjs`, and changes only the `live on
GitHub` assertions at `test/resume-cloudflare.test.mjs:170`, `test/resume-chapter2.test.mjs:305,438`,
and `test/resume-chapter3.test.mjs:238`. Neither edits `packages/create-cairn-site/README.md` or `docs/`.

**T1. The Cloudflare side (#42, #184, and #177's Cloudflare lines). `auth-data`. 85 minutes.**

- Files: `packages/create-cairn-site/src/cloudflare/{config,chapter,chapter2,chapter3,hostname,bootstrap,catalogue}.mjs`
  and their tests, `packages/create-cairn-site/test/**`, `examples/showcase/src/chassis/content.ts`,
  `examples/showcase/src/theme/cairn.config.ts`,
  `skills/cairn-extending-a-site/references/public-routes.md`, and `templates/waymark/**` by emit.
- #42, 60 minutes, first:
  - `cairn.config.ts` exports `publicOrigin`, the literal `https://showcase.test`. `content.ts` imports
    it and its `ORIGIN` constant goes, with the comments at `:34-35` and `:45`, and the `email:` comment
    that names `ORIGIN`. Search `src/tests` and `examples/showcase/e2e` for `ORIGIN` and fix any hit.
  - `writePublicOrigin` reads and validates both files before writing either, and throws naming the
    file if a key is missing, as `writeEmailFrom` does. Update its doc comment.
  - `chapter.mjs`'s deploy step runs `buildSite` between the migrations and the second deploy, and its
    step detail says so. `cutOverHostname` runs `buildSite` inside the `try`, after the origin write,
    so a failed build restores the origin. Update the `chapter2.mjs:594` detail and the `hostname.mjs`
    comments. The `chapter2.mjs:771` comment goes. Reword the `cutover-deploy-failed` row so a build
    failure doesn't read as wrangler's.
  - `public-routes.md:23-25` says setup writes both values and a hand change edits both.
  - Fixtures: `writePublicOrigin` now needs `src/theme/cairn.config.ts`, so the scaffolds in
    `chapter.test.mjs:37-45`, `chapter2.test.mjs:46`, `hostname.test.mjs:60`, `config.test.mjs`, and any
    `test/*.test.mjs` that reaches a deploy gain that file. Tests that reach a deploy or the cutover,
    `hostname.test.mjs`, `chapter2.test.mjs`, and `test/chapter2-safety-net.test.mjs` among them, need
    a fake npm through `CAIRN_NPM_BIN`.
  - Test: `writePublicOrigin` rewrites both from a real copy of the showcase's literals and from a
    prior value. A fixture missing the literal throws and leaves both files byte-identical. For order,
    the fake npm and fake wrangler append to one log, and the npm line carries the literal it read
    from `cairn.config.ts`. In the deploy chapter and in the cutover, the last deploy follows a build
    that saw the new origin. A failing fake build in the cutover leaves both files on the workers.dev
    value and prints the reworded row.
  - Acceptance: the tests fail on the base commit. An ablation also runs once: move the write after
    the build, watch the order test fail, restore, and say so in the commit. T6 proves it on a real
    build.
- #184, 15 minutes: `EMAIL_ADMISSION_DETAIL` states that onboarding writes a `p=reject` DMARC policy for
  the whole domain, governing every sender and not only cairn. It must not say whether an existing
  `_dmarc` record is replaced: word it so it is true either way. The closing copy at `chapter2.mjs:806`
  loses "add it to that record too", since a `p=reject` record has no sender list, and says to
  authenticate each new service against the domain's mail records, as `own-your-domain.md:89` does.
  Test: the detail holds `p=reject`, and the closing copy lacks the old phrase.
- #177 Cloudflare lines, 10 minutes, one assertion per string:
  - "Sign you in" (`chapter.mjs:267`).
  - `SIGN_IN_OPENED_NOTICE` (`bootstrap.mjs:29`), which must be true when no page opened.
  - The detail at `chapter3.mjs:976-978`, which must not promise a browser trip on a saved token. The
    title stays.
  - The consent at `chapter.mjs:118`, which warns that an existing Worker of that name is replaced.

**T2. The GitHub side (#97, #174, #175, and the other #177 lines). `auth-data`. 60 minutes.**

- Files: `packages/create-cairn-site/src/github/{catalogue,chapter,install,open,manifest}.mjs` and their
  tests, `packages/create-cairn-site/bin.mjs`, `src/scaffold.mjs`, `src/money.mjs`, their tests, and
  the four assertions named above.
- #97, 20 minutes: `installation-not-covering-repo` names "All repositories" for a first run. In
  `github/chapter.mjs`, set `ctx.repo` and save `repo-created` right after `createRepo` and before
  `verifyInstallationCovers`, and at `:334` write no step when `resumeStep === 'repo-created'`. Add no
  adoption. Test on the fake GitHub, using its one-shot `suppressAutoLink`: a run whose installation
  lacks the repository fails with that row, naming "All repositories". The test then links it, and the
  re-run passes the install and authorize hop, reaches the push, and leaves exactly one repository
  `POST`. A second test: a timed-out install on a `repo-created` record keeps that step. Both fail on
  the base commit.
- #174, 15 minutes: beside the App trip's link, say to use this link and not GitHub's own form. The
  `browser-step-abandoned` row's App-trip branch names a fallback that needs no browser profile: copy
  the printed link into the window you work in. Don't touch `open.mjs:75`. Test: the App trip's output
  has the warning, the install trip's does not, and the row carries the fallback.
- #175, 5 minutes: `install.mjs:235` names "All repositories". Test pins the string.
- #177, 20 minutes, one assertion per string:
  - `bin.mjs:87`: "Your site is live on GitHub:" labels a private repository.
  - `bin.mjs:117`: print "Connect your domain any time" only when `state.cloudflare.domain` is absent.
    Test: a delegation park prints no such line, an email park prints none, and an admission decline
    prints it. This fails on the base commit.
  - `src/github/chapter.mjs:161`: the default App name doesn't double a `cairn-` prefix. Test
    `cairn-docs` and `alpine-club`.
  - `src/github/open.mjs:69`: the placeholder, as found above.
  - `src/scaffold.mjs:260`: the hand-over names what the run does next and lacks "next release".
  - `src/money.mjs:30`: drop "the honest cost picture". The opening states the costs plainly.

### T3. The email re-offer (#183) (`auth-data`, 90 minutes, alone)

- Files: `packages/create-cairn-site/src/cloudflare/chapter2.mjs`, `packages/create-cairn-site/bin.mjs`,
  and `packages/create-cairn-site/test/**`.
- An open decline is a record with `cloudflare.emailDeclinedAt` set and `cloudflare.emailOnboardedAt`
  absent. The step may be `paid-plan-declined`, `builds-connect-declined`, or `builds-live`.
- `bin.mjs`: a plain re-run with no `--connect` or `--sign-in` at either chapter 3 terminal step, with
  an open decline, routes to `continueIntoChapter2`, ahead of the closing block at `:569`. If chapter 2
  returns the decline from such a step, print the builds closing block and stop, with no chapter 3.
  Rewrite the comment at `:475-481` to match.
- `runChapter2`, at entry on an open decline:
  1. Always call `deleteApiToken(siteId)`, then go on from a copy of `record` with no `apiToken`, the
     shape of `withoutSavedToken` in chapter 3, so nothing reuses a deleted token.
  2. `--yes` with no `--email` is a decline: reoffered copy, the "Re-run with --email" line, step
     unchanged, returning `paid-plan-declined`. It never calls `confirm`.
  3. Anything else asks the email question before the token hop, with the same step title, detail, and
     prompt. A no prints the reoffered decline, leaves the step, and returns the same outcome.
  4. A yes, or `--yes --email`, saves `step: 'domain-live'` before the token hop, holds it in a local
     since `record` is stale, and skips the `:667` admission once. Every `hasReached` then reads right.
     `STEP_ORDER`, the saved names, and the Go mirror don't change. After a crash the run resumes at
     `domain-live` under the normal rules, where `:667` asks again.
- `builds-live` needs one more step. Chapter 2 rewrites `cairn.config.ts`, and the next Workers Build
  reverts the sender unless the repository gets it. So when chapter 2 reaches `email-live` on a record
  carrying the completed Builds connection fields chapter 3 saved, `bin.mjs` saves `step: 'builds-live'`
  before `runChapter3AndReport`, whose `builds-live` re-entry reconciles. Read those fields; add none.
  It keys on the record, so a park and a later resume take the same path.
- Test, through `bin.mjs` with the fake Cloudflare, from each of the three steps: a no prompts for no
  token, leaves none on disk (seed one), keeps the step, and doesn't enter chapter 3 from a builds
  step. A yes from `paid-plan-declined` reaches onboarding, makes no `POST /zones` or carry-over DNS
  write, prompts once, and saves the new token. A yes from `builds-live` ends at `builds-live` with
  the sender reconciled. `--yes` alone never calls `confirm`. `--yes --email` with
  `CAIRN_CF_API_TOKEN` set reaches onboarding. A throw after the token hop leaves `domain-live`.
- One more test, since pair 1 is merged: a non-TTY `--sign-in` prints no literal `<dir>` and doesn't
  claim a page opened.
- Acceptance: each decline and yes case fails on the base commit.

### Pair 2 (path 60)

Run T4 and T5 as a pair, descriptions `scaffold-setup task T4` and `scaffold-setup task T5`. Merge T5
first, then T4, so the job commit stays the tip. Run the fast lane, push, and wait for CI on that head.

**T4. Publish readiness (#195's workflow half). `runner`. 60 minutes.**

- Files: `packages/create-cairn-site/package.json`, `.github/workflows/publish.yml`,
  `scripts/checks/check-dev-package.mjs`, `src/tests/unit/check-dev-package.test.ts`,
  `scripts/checks/check-leaks.mjs`, `src/tests/unit/check-leaks.test.ts`, and
  `.claude/skills/cairn-releasing/SKILL.md`.
- Commit the `publish.yml` job alone, last, so a refused push drops one commit.
- Package: add `repository` with `directory`, exclude `*.test.mjs` from `files`, take the `npm pkg fix`
  `bin` form. `package-lock.json` should not change; commit it if it does.
- `check:dev-package`: export a pure `checkRepository(manifest, path)` and run it over both manifests
  at the same expected URL. Leave the version check alone, since the package stays at `0.0.0`.
- `check:leaks`: add `bin.mjs`, `src`, and `README.md` under the package to `SCAN_ROOTS`, and a
  `profileFor` branch for them at the T2 tier, whole mode, all classes, skipping `.test.mjs`.
- The job, as the design states: `publish-create-site`, `needs: [publish, publish-dev]`, the sibling's
  setup and npm pin, `npm ci` through the bounded-install action, then this order, all before the bake:
  1. Probe the package name. `code E404` gives a `::notice::` and exit 0. Any other failure fails.
  2. Fail when the package's version differs from the root's. This follows step 1 so a cut before the
     first publish stays green while the package is at `0.0.0`.
  3. Probe the version. Success with output skips. `code E404` goes on. Any other failure fails.
  Capture with `if ! out=$(npm view ... 2>&1)`, since `bash -e` aborts on a bare capture.
  Then the bake with both specs at the root's version, `npm pack --ignore-scripts --silent | tail -n1`
  for the tarball, as `create-site.yml` does, and `npm publish <tgz> --access public --tag "$TAG"
  --provenance`. Comment the first-publish path the way the dev job's comment does.
- `cairn-releasing`: the third package in step 2's bump; the release-day owner steps from the design's
  second Decide; `npm view create-cairn-site version` in step 7; retiring the template-repo notice;
  `npm@latest` becomes the `npm@11` pin at line 171; and the allowed-action sentence at lines 198-200
  says a new configuration defaults to `npm stage publish` and needs publish chosen. List these six in
  the task report for the diff reviewer.
- Test: `check-dev-package.test.ts` runs `checkRepository` on a good manifest, one with no `repository`,
  and both real ones. `check-leaks.test.ts` uses `runLeakCheck(tmpRoot)` with a leak seeded in the
  package's `bin.mjs`, `src/x.mjs`, and `README.md`, each found, and one in `src/x.test.mjs`, not found.
- Acceptance: copy the step's `run:` block to a scratch file and run it with a stub `npm` on `PATH`,
  four cases: version mismatch exits 1 before any publish; package E404 prints the notice and exits 0;
  version published skips; E500 exits 1. Run it once read-only against the real registry for the
  absent-package case, and paste the results in the PR body. `npm run check:leaks` passes. Parse the
  workflow with the repo's YAML reader, or `actionlint` if installed, and confirm `needs` names both.

**T5. Docs and the package README. `ordinary`. 55 minutes.**

- Files: `docs/admin/{setup-recovery,own-your-domain}.md`, `packages/create-cairn-site/README.md`, and
  `docs/admin/create-your-site.md` only if the fact-check finds a wrong claim.
- Load `cairn-writing-docs` and follow it, with one change Geoff approved: a fresh `docs-fact-checker`
  alone, no docs review. A wrong claim is fixed; a dispute goes under `## Decisions`.
- `setup-recovery.md:35` names All repositories. `:71` says a later run asks again, and names `--email`
  for an unattended run. Add a row or line for a browser trip that never reached you. `own-your-domain.md`
  states the new decline behavior and carries #184's prompt fact. In the README, the DMARC paragraph
  (`:291`) loses "add it to that record", `:268`'s re-offer stays true, and `:381` adds
  `src/theme/cairn.config.ts` to what a re-run commits. If #183 was escalated, change the lines the
  standing answer names to match the code.
- Have the fact-checker read `create-your-site.md:70,88` too.
- `npm run check:docs-gate` passes, with `check:transcripts` still green on the old copy, as the design
  expects.

### T6. End-to-end check (`runner`, 25 minutes, alone)

- Files: `.github/workflows/create-site.yml`, `scripts/ci/assert-scaffold-origin.mjs`.
- One new step after "Install, typecheck, and build the scaffolded site", with
  `working-directory: /tmp/ci-site`. It imports `writePublicOrigin` from
  `/tmp/create-scratch/node_modules/create-cairn-site/src/cloudflare/config.mjs` through
  `node --input-type=module -e`, calls it with `https://ci-site.example.workers.dev`, runs
  `npm run build`, then runs `node "$GITHUB_WORKSPACE/scripts/ci/assert-scaffold-origin.mjs" /tmp/ci-site
  <origin> "$TGZ"`, with `TGZ` from `steps.create-pack.outputs.create`.
- The script takes a site directory, an origin, and an optional tarball. Under
  `.svelte-kit/cloudflare/` it asserts that `sitemap.xml`, `robots.txt`, and `feed.xml` carry the origin;
  that at least one `*.html` has a canonical link and every canonical link is on the origin; and that
  no `*.html`, `*.xml`, `*.txt`, `*.json`, or `*.md` file holds `showcase.test`. It skips `_worker.js` and
  `_app/`, and fails if it scanned no file. With a tarball it asserts `template/` present, no
  `.test.mjs`, and `package/package.json` with `repository`.
- Acceptance: run it locally on a showcase build still on `showcase.test`, with another origin, and
  paste the named failure in the PR body. It passes in the `create-site` job on this head.

### T7. Close (`auth-data`, 50 minutes, alone)

Run in this order.

1. Ledgers: `CHANGELOG.md` under `## Unreleased`, and `MIGRATION-NOTES.md`. Move #42, #97, #174, #175,
   #177, #183, and #184 to `BACKLOG.md`'s `## Done`. Reword #195 to what remains for the release, and
   #185 per the design, placed in the one release. File the crash between `writeEmailFrom` and its
   deploy (`chapter2.mjs:781-784`) through `/standards:log-issue`.
2. `ROADMAP.md`, per the design's "Owed before the tool publishes", finding each entry by its opening
   words, since parallel passes move the lines: mark the `check:leaks` note, the DMARC instruction,
   and the two copy defects folded; repoint the alike-names probe and "Declare required Worker secrets"
   to after the release; leave the template-repo notice and the placeholder sender.
3. `docs/STATUS.md` once, with this session's name and id, in one small hunk.
4. Merge `origin/main` if it moved. Keep both `## Unreleased` entries, then always run
   `npm run emit:template`, commit if it changed, and rerun the fast lane. A conflict outside the
   design's shared list stops the line.
5. Push and mark the PR ready.
6. Whole-branch `standards:diff-reviewer`, loading `standards:web-auth-security-reviewer` for
   `packages/create-cairn-site/src/{github,cloudflare}/**`, with the plan and design paths in its prompt.
   One batched fix chain, quoting each finding verbatim. A security `fix` stops the line, not the pass:
   fix forward and rerun.
7. Live admin smoke, required, per `references/admin-smoke-test.md`, against this worktree's showcase:
   build; confirm port 8787 is free with `ss -ltn`; run `npx wrangler dev --port 8787` from
   `examples/showcase` and wait for "Ready"; run
   `node ~/.local/state/cairn-agent-first/smoke-pass3.mjs <this worktree>`; stop wrangler. The script
   needs no account and no sign-in.
8. Remove this plan, the design copy, and both prompt files in one commit, then `npm run check:docs-gate`.
9. Full suite green on the final head (`ci-green <sha> --pr <n> --wait`).
10. PR body: `## Brief`, what landed, each `auth-data` verdict, the security verdict, the smoke result
    with its FAIL note, `## Decisions`, `## Planning misses`, the stale transcript blocks, retried tests,
    the T4 and T6 proofs, the score, and the final head with its CI run.
11. If `git rev-list --count HEAD..origin/main` isn't 0, go back to step 4. Rerun the smoke only if the
    merged commits touch an `auth-data` path. Then end at PR-ready and tell `conductor-cairn-cms` the PR
    number and head.

## Standing answers

The design's "Standing answers" apply. For this pass:

| Event | Answer |
| --- | --- |
| Path over 490 | Cut #174, then #177's non-misstating lines. Stop only if still over. Most of these sit in T2 under a longer T1, so note in the PR if the cut barely moves the path. |
| A cause returns after a structural fix | Escalate #174, #177, #183, #184's clause on an existing record, in the PR, and go on. #42, #97, #175, and #195's manifest, leak-scan, and skill changes can't be escalated: that stops. |
| #183 at `builds-live` won't hold | Escalate that step only. Keep the re-offer from `paid-plan-declined` and `builds-connect-declined`. A plain re-run at `builds-live` prints a line saying the offer ends once Builds is connected, and T5 says so in the README and `setup-recovery.md:71`. |
| #183 escalates whole | Fix the README's "Declining costs you nothing" promise, `setup-recovery.md:71`, and both decline rows to match the code, in T5. |
| Auto mode refuses the `publish.yml` push | Drop that commit, revert the skill's job text, land everything else, record the planning miss, and file the job and that text for the release act. No stop. |
| Cloudflare's docs don't say whether an existing `_dmarc` is replaced | Word it true either way. Leave the question to the real install. |
| A transcript block is stale | Leave page and fixture alone. List the block in the PR. |
| `check:leaks` flags the package | Remove a real leak. The public repository URL is allowed the way the check already allows it. |
| A test pins old copy | Change the test and list it under `## Decisions`. |
| The smoke prints pass 3's one FAIL (the same link refused, landing at `/admin/login?error=no-pending-request`) | A pass with a note. Any other failure stops the line. |
| Port 8787 is busy | Wait for the other session and retry. A long wait is not a stop. |
| A security-read `fix` | Fix forward and rerun. |
| Merge conflict with another pass | The design's "Parallel run" rule. Outside the shared list it stops. |
| A retried test | List it as flake evidence. No stop. |

A stop not listed here writes one question to `docs/STATUS.md` on this branch and waits. Never run
`notify-send` and never ask Geoff: `conductor-cairn-cms` is the one asker.
