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
PR-ready and never merges. Pairs go to `cairn-implementer`.
Path estimate: 265 minutes (design 245, ceiling 490). Review: three lenses, folded by the planner,
then a verification read.

Cleared items: #42, #97, #174, #175, #177, #183, #184, and #195's workflow half. #185 moves to the
release act. Nothing bumps or publishes. `RUN_GATE_IF_BUSY` is never set on this pass.

## Pre-flight

None from Geoff. Checks the conductor runs before launch: on `main` in the main checkout,
`rev-list --count HEAD..origin/main` at 0, no process on this worktree, `git status` clean in it, and
`scaffold-setup` on origin at the commit that carries this plan.

## Read this first

The design's "Scope", "#195's workflow half", "End-to-end check", "Parallel run", and "Standing
answers" sections govern. These planning findings settle what it marked unverified, or correct it.

- **#183 can't simply drop the short-circuit.** `STEP_ORDER` in `chapter2.mjs` omits
  `paid-plan-declined`, so `stepIndex` returns 0 and `hasReached` reads a declined record as `live`.
  Falling through would rerun the zone, carry-over, and cutover hops on a finished domain. T1's #183
  shape handles this, and the test must prove no zone is created.
- **`check:leaks` needs two edits.** `profileFor` returns `null` for an unknown path, so adding to
  `SCAN_ROOTS` alone scans nothing: a probe adding the roots moved no finding. Add a `profileFor` branch
  too. A probe of the 49 shipped files through `scanText` at the T2 profile found nothing, so the
  check should pass with no allowance.
- **The tarball fix is proven.** With `npm` 11.20, adding `"!src/**/*.test.mjs"` to `files` in a scratch
  copy packed 51 files and no test. `npm pkg fix` rewrites `bin` to `"bin.mjs"`.
- **`npm view` exits.** A missing package exits 1 with `npm error code E404`. A missing version of a real
  package also exits 1, which is what the sibling guards rely on. So the first-publish guard reads the
  error code, and any other failure fails the job.
- **Prerendered files land in `.svelte-kit/cloudflare/`**, per a showcase build in another worktree:
  `sitemap.xml`, `robots.txt`, `feed.xml`, `feed.json`, `*.html`, `*.md`, and `__data.json` files,
  beside `_worker.js` and `_app/`.
- **`bin.mjs:258` in the design is stale.** The unconditional `printLiveInfo` after a park is at
  `bin.mjs:269`, by symbol: the branch under `runChapter2`'s report path.
- **`openBrowser` is shared.** `src/github/open.mjs:75` serves every trip, so #174's warning can't go
  there. Print it from the App trip: `runManifestFlow`'s caller at `src/github/chapter.mjs:283-296`,
  or `manifest.mjs`.
- **`openBrowser` has no `dir`.** For #177's `--dir <dir>` line, reword to "re-run the same
  npx create-cairn-site command with --sign-in", which keeps the signature and stays inside task B.
- **Fixtures.** `writePublicOrigin` now needs `src/theme/cairn.config.ts`, so the scaffold fixtures in
  `chapter.test.mjs:37-45`, `chapter2.test.mjs:46`, `hostname.test.mjs:60`, `config.test.mjs`, and any
  `test/*.test.mjs` that reaches a deploy gain that file. `hostname.test.mjs` also needs a fake npm
  through `CAIRN_NPM_BIN`, since the cutover now builds.
- **`create-site.yml`'s seeded console probe** writes a `cairn.config.ts` with only `from` and starts at
  `config-reconciled`, which never calls `writePublicOrigin`, so it is unaffected.
- **Plan files.** These live under `docs/internal/plans/`, since `docs/plans/**` lost its Vale
  exclusion in `f9cd864c2`, and a plan there turns `check:docs-gate` red.

## Rules for every task

- Run the setup command from `cairn-running-passes` in each new worktree.
- An `auth-data` task writes its failing test first and commits each item separately, so
  `standards:diff-reviewer` can read each commit while CI runs. A `fix` or `escalate` stops the line.
- After each task: `npm run lane:fast -- --range <base>..HEAD`, through `cairn-run-gate` per `cairn-pass`.
  The package suite is `npm test -w packages/create-cairn-site` on the light lane. Gates share the
  heavy lane with the media and template passes.
- A task touching `.github/workflows/` prints `ciWait`, so wait for that head's CI before the next task.
- Any showcase or skill source change runs `npm run emit:template` and commits `templates/waymark/**`.
  Only T1 changes them in this pass.
- Write the clock file per `pass-core` "Clock stop" with the estimate below.
- A test that pins old copy changes with it, listed under `## Decisions`.
- Leave `test/fixtures/transcripts/**` and the transcript blocks that quote them alone. List each stale
  block in the PR body for #185's recapture.

## Tasks

### Pair 1 (path 130)

Run T1 and T2 as a pair with `isolation: "worktree"`, descriptions `scaffold-setup task T1` and
`scaffold-setup task T2`. Merge both, run the fast lane, push, and open the draft PR. T1 owns every
file under `src/cloudflare/**` and the showcase. T2 owns `src/github/**`, `bin.mjs`, `src/scaffold.mjs`,
and `src/money.mjs`. Neither edits `packages/create-cairn-site/README.md` or `docs/`; T4 does.

**T1. The Cloudflare side (#42, #183, #184, and #177's Cloudflare lines). `auth-data`. 130 minutes.**

- Files: `packages/create-cairn-site/src/cloudflare/{config,chapter,chapter2,chapter3,hostname,bootstrap,catalogue}.mjs`
  and their tests, `examples/showcase/src/chassis/content.ts`, `examples/showcase/src/theme/cairn.config.ts`,
  `skills/cairn-extending-a-site/references/public-routes.md`, and `templates/waymark/**` by emit.
- #42, 60 minutes, first:
  - `cairn.config.ts` exports one origin literal, `https://showcase.test`. `content.ts` imports it and
    its `ORIGIN` constant goes. The `email:` comment that names `ORIGIN` follows.
  - `writePublicOrigin` writes both files by key, and throws naming the file if either key is missing,
    as `writeEmailFrom` does. Update its doc comment.
  - `chapter.mjs`'s deploy step runs `buildSite` between the migrations and the second deploy, and its
    step detail says so. `cutOverHostname` runs `buildSite` inside the `try`, after the origin write,
    so a failed build restores the origin. The `chapter2.mjs:771` comment goes.
  - `public-routes.md:23-24` says setup writes both values and a hand change edits both.
  - Test: `writePublicOrigin` rewrites both from the template's literals and from a prior value. A
    fixture missing the literal throws. In the deploy chapter, fake npm records a build after the
    origin write and before the second deploy. In the cutover, the same order, and a failing fake build
    leaves both files on the workers.dev value.
  - Acceptance: every test above fails on the base commit. T5's end-to-end check proves it on a real
    build.
- #183, 45 minutes:
  - A `paid-plan-declined` re-entry with `--yes` and no `--email` stays a decline. It deletes any token,
    prints the reoffered copy and the "Re-run with --email" line, and returns as today.
  - Any other re-entry asks the email question before the token hop, using the same step title,
    detail, and prompt, so an owner who declines again pastes nothing.
  - On yes, or on `--yes --email`, the run goes on from `domain-live`'s position: `hasReached` must
    read it as past `domain-live`, by a local effective step and never by changing `STEP_ORDER`, the
    saved step name, or the Go mirror. The token hop collects a fresh token, the admission doesn't ask
    twice, and onboarding runs.
  - A no prints the reoffered decline and keeps the step. A crash mid-way leaves the record at
    `paid-plan-declined`, so the next run asks again.
  - Test: from a saved declined record, on the fake Cloudflare: yes reaches email onboarding, makes no
    `POST /zones` or DNS carry-over call, and prompts for a token once; no prompts for no token and
    keeps the step; `--yes` alone never calls `confirm`.
  - Update the comments at `chapter2.mjs:24-31,84-88,345-347` and `bin.mjs`'s branch if they now
    misstate this. `bin.mjs` itself needs no code change; T2 owns that file, so leave its comment
    unless it is false.
- #184, 15 minutes: `EMAIL_ADMISSION_DETAIL` states that onboarding writes a `p=reject` DMARC policy for
  the whole domain, governing every sender and not only cairn. It must not say whether an existing
  `_dmarc` record is replaced: word it so it is true either way. The closing copy at `chapter2.mjs:806`
  loses "add it to that record too", since a `p=reject` record has no sender list, and says to
  authenticate each new service against the domain's mail records, as `own-your-domain.md:89` already
  does.
- #177 Cloudflare lines, 10 minutes: "Sign you in" (`chapter.mjs:267`); `SIGN_IN_OPENED_NOTICE`
  (`bootstrap.mjs:29`), which must be true when no page opened; "Get a fresh Cloudflare API token"
  (`chapter3.mjs:975`), which must not promise a browser trip on a saved token; and the consent at
  `chapter.mjs:118`, which warns that an existing Worker of that name is replaced.

**T2. The GitHub side (#97, #174, #175, and the other #177 lines). `auth-data`. 60 minutes.**

- Files: `packages/create-cairn-site/src/github/{catalogue,chapter,install,open,manifest}.mjs` and their
  tests, `packages/create-cairn-site/bin.mjs`, `src/scaffold.mjs`, `src/money.mjs`, and their tests.
- #97, 20 minutes: `installation-not-covering-repo` names "All repositories" for a first run. In
  `github/chapter.mjs`, set `ctx.repo` and save `repo-created` right after `createRepo` and before
  `verifyInstallationCovers`. Add no adoption. Test: on the fake GitHub, a run whose installation lacks
  the repository fails with that row; the re-run makes no second create and reaches the push once
  the installation covers it. Fails on the base commit.
- #174, 15 minutes: beside the App trip's link, say to use this link and not GitHub's own form. The
  `browser-step-abandoned` row's App-trip branch names a fallback that needs no browser profile: copy
  the printed link into the window you work in. Don't touch `open.mjs:75`'s shared line. Test: the
  App trip's output has the warning, and the install trip's does not.
- #175, 5 minutes: `install.mjs:235` names "All repositories". Test pins the string.
- #177, 20 minutes:
  - `bin.mjs:87`: "Your site is live on GitHub:" labels a private repository.
  - `bin.mjs:269`: `printLiveInfo` must not print "Connect your own domain" right after a park that says
    the connection is in progress.
  - `src/github/chapter.mjs:161`: the default App name doesn't double a `cairn-` prefix. Test
    `cairn-docs` and `alpine-club`.
  - `src/github/open.mjs:69`: the placeholder, as found above.
  - `src/scaffold.mjs:260`: the hand-over names what the run does next.
  - `src/money.mjs:30`: drop "the honest cost picture". The opening states the costs plainly.

### Pair 2 (path 60)

Run T3 and T4 as a pair, descriptions `scaffold-setup task T3` and `scaffold-setup task T4`.

**T3. Publish readiness (#195's workflow half). `runner`. 60 minutes.**

- Files: `packages/create-cairn-site/package.json`, `package-lock.json` if `npm install
  --package-lock-only` changes it, `.github/workflows/publish.yml`, `scripts/checks/check-dev-package.mjs`,
  `scripts/checks/check-leaks.mjs`, `src/tests/unit/check-leaks.test.ts`, and
  `.claude/skills/cairn-releasing/SKILL.md`.
- Commit the `publish.yml` job alone, last, so a refused push drops one commit.
- Package: add `repository` with `directory`, exclude `*.test.mjs` from `files`, take the `npm pkg fix`
  `bin` form. `check:dev-package` reads this manifest too, at the same expected URL.
- `check:leaks`: add `bin.mjs`, `src`, and `README.md` under the package to `SCAN_ROOTS`, and a
  `profileFor` branch for them at the T2 tier, whole mode, all classes, skipping `.test.mjs`.
  Test: a package source path gets a profile, a `.test.mjs` path gets `null`, a seeded leak in package
  text is found by `scanText`.
- The job, as the design states: `publish-create-site`, `needs: [publish, publish-dev]`, the sibling's
  setup and npm pin, `npm ci` through the bounded-install action, the bake with both specs at the
  root's version, `npm pack --ignore-scripts`, then `npm publish <tgz> --access public --tag "$TAG"
  --provenance`. Guards: fails when the package's version differs from the root's; skips with a
  `::notice::` when `npm view create-cairn-site name` reports E404; skips when the version is
  published. Any other `npm view` failure fails the job. Comment the first-publish path the way the
  dev job's comment does.
- `cairn-releasing`: the third package in step 2's bump; the release-day owner steps from the design's
  second Decide; `npm view create-cairn-site version` in step 7; retiring the template-repo notice;
  `npm@latest` becomes the `npm@11` pin at line 171; and the allowed-action sentence at lines 198-200
  says a new configuration defaults to `npm stage publish` and needs publish chosen.
- Acceptance: `npm run check:dev-package` fails with `repository` removed and passes with it.
  `npm run check:leaks` passes. `node --check` isn't enough for the workflow: parse it with the repo's
  YAML reader, or `actionlint` if installed, and confirm `needs` names both jobs.

**T4. Docs and the package README. `ordinary`. 55 minutes.**

- Files: `docs/admin/{setup-recovery,own-your-domain,create-your-site}.md`,
  `packages/create-cairn-site/README.md`.
- Load `cairn-writing-docs` and follow it, with one change Geoff approved: a fresh `docs-fact-checker`
  alone, no docs review. A wrong claim is fixed; a dispute goes under `## Decisions`.
- `setup-recovery.md:35` names All repositories. `:71` says a later run asks again. Add a row or line
  for a browser trip that never reached you, if #174 changed that advice. `own-your-domain.md` states
  the new decline behavior and carries #184's prompt fact. `create-your-site.md` changes only prose
  outside transcript blocks. The README's DMARC paragraph (near line 289) loses "add it to that
  record", and "Running the command again re-offers" stays true. If #183 was escalated, change that
  line and `setup-recovery.md:71` to match the code.
- `npm run check:docs-gate` passes, with `check:transcripts` still green on the old copy, as the design
  expects.

### T5. End-to-end check (`runner`, 25 minutes, alone)

- Files: `.github/workflows/create-site.yml`, `scripts/ci/assert-scaffold-origin.mjs`.
- One new step after "Install, typecheck, and build the scaffolded site". It imports `writePublicOrigin`
  from `/tmp/create-scratch/node_modules/create-cairn-site/src/cloudflare/config.mjs`, calls it on
  `/tmp/ci-site` with `https://ci-site.example.workers.dev`, runs `npm run build`, then runs the script.
- The script takes a site directory and an origin. Under `.svelte-kit/cloudflare/` it asserts that
  `sitemap.xml`, `robots.txt`, and `feed.xml` carry the origin, that an entry's HTML has a canonical
  link on it, and that no `*.html`, `*.xml`, `*.txt`, `*.json`, or `*.md` file holds `showcase.test`.
  It skips `_worker.js` and `_app/`. A second part asserts on the tarball: `template/` present, no
  `.test.mjs`, and `package/package.json` with `repository`.
- Acceptance: the script fails, naming the file, when pointed at a build still on `showcase.test`. Run
  it locally on a showcase build for that proof, and paste the failure in the PR body. It passes in
  the `create-site` job on this head.

### T6. Close (`auth-data`, 50 minutes, alone)

Run in this order.

1. Ledgers: `CHANGELOG.md` under `## Unreleased`, and `MIGRATION-NOTES.md`. Move #42, #97, #174, #175,
   #177, #183, and #184 to `BACKLOG.md`'s `## Done`. Reword #195 to what remains for the release, and
   #185 per the design, placed in the one release.
2. `ROADMAP.md`, per the design's "Owed before the tool publishes": mark `:713`, `:460`, and `:447`
   folded; repoint `:640`'s probe and `:1294` to after the release; leave `:421` and `:437`.
3. Remove `docs/internal/plans/2026-11-01-scaffold-setup.md` and the design copy in one commit.
4. Merge `origin/main` if it moved. Keep both `## Unreleased` entries, run `npm run emit:template`, and
   rerun the fast lane. A conflict outside the design's shared list stops the line.
5. Mark the PR ready. Full suite green on the head.
6. Whole-branch `standards:diff-reviewer`, loading `standards:web-auth-security-reviewer` for
   `packages/create-cairn-site/src/{github,cloudflare}/**`. One batched fix chain, quoting each
   finding verbatim. A security `fix` stops the line, not the pass: fix forward and rerun.
7. Live admin smoke: `references/admin-smoke-test.md`, local, on `wrangler dev`, with no account and no
   sign-in, against the showcase. It is required; pass 3's executor skipped it at first and was sent
   back. Pass 3's script is at `~/.local/state/cairn-agent-first/smoke-pass3.mjs`. Its one FAIL (`/admin/login?error=no-pending-request` on the
   same link refused) counts as a pass with a note. Any other failure stops the line.
8. Update `docs/STATUS.md` once, with this session's name and id, in one small hunk.
9. PR body: `## Brief`, what landed, each `auth-data` verdict, `## Decisions`, `## Planning misses`, the
   stale transcript blocks, retried tests, and the score. End at PR-ready and tell
   `conductor-cairn-cms` the PR number and head.

## Standing answers

The design's "Standing answers" apply. For this pass:

| Event | Answer |
| --- | --- |
| Path over 490 | Cut #174, then #177's non-misstating lines. Stop only if still over. |
| A cause returns after a structural fix | Escalate #174, #177, #183, #184's clause on an existing record, in the PR, and go on. #42, #97, #175, and #195's manifest, leak-scan, and skill changes can't be escalated: that stops. |
| #183 escalates | Fix the README's "Declining costs you nothing" promise and `setup-recovery.md:71` to match the code, in T4. |
| Auto mode refuses the `publish.yml` push | Drop that commit, land everything else, record the planning miss, and file the job for the release act. No stop. |
| Cloudflare's docs don't say whether an existing `_dmarc` is replaced | Word it true either way. Leave the question to the real install. |
| A transcript block is stale | Leave page and fixture alone. List the block in the PR. |
| `check:leaks` flags the package | Remove a real leak. The public repository URL is allowed the way the check already allows it. |
| A test pins old copy | Change the test and list it under `## Decisions`. |
| The smoke prints pass 3's one FAIL | A pass with a note. |
| A security-read `fix` | Fix forward and rerun. |
| Merge conflict with another pass | The design's "Parallel run" rule. Outside the shared list it stops. |
| A retried test | List it as flake evidence. No stop. |

A stop not listed here writes one question to `docs/STATUS.md` on this branch and waits. Never run
`notify-send` and never ask Geoff: `conductor-cairn-cms` is the one asker.
