# p2-p4 plan review: mechanics and feasibility

Target: `/var/home/glw907/Projects/cairn-cms/.claude/worktrees/p2-p4/docs/internal/plans/2026-11-02-p2-p4-plan.md` at `925d9ca0c`, design note beside it. Nothing edited. Two untracked files appeared in the worktree during the review (`2026-11-02-p2-p4-review-contract.md`, `-review-data.md`). They are not mine.

**Verdict: not ready to launch as written.** The design holds. T1's server mechanics, Kit's in-place failure path, and the refusal triggers mostly work. Five things will stop or mislead an unattended Sonnet run: 2 blockers and 3 of the major findings (M1, M2, M4). All are plan edits. No finding needs a redesign. The fold is about 20 lines.

Plan paths below are relative to `docs/internal/plans/`.

## Blockers

**B1. blocker, correctness. `2026-11-02-p2-p4-plan.md:205,400,429`. Every head from T2 to T10 has a red e2e job, and the plan has no answer for it.**
- T2 commits 10 `toHaveScreenshot` calls with no baseline, and T8 commits 32.
- Playwright 1.64 (`playwright/lib/matchers/expect.js:12475-12495`, default `updateSnapshots: "default"`, `lib/runner/index.js:584`): a missing snapshot returns `softError` with `shouldNotRetryTest: true`. The test fails and the CI retries don't clear it.
- `cairn-pass` says "a red stops the line". The plan's `:106` row says "Trace it and fix forward", which has nothing to fix.
- So the run either halts at T2, or it learns to ignore e2e, and then T6's and T9's new specs have no CI verdict for five tasks. Nothing makes an accepted-task report name the CI verdict on its head either.
- Fold: T2 and T8 land the tests with the heading asserts and no screenshot line. T10's first commit adds the one-line `toHaveScreenshot` to each, then dispatches. Every head stays meaningful and the dispatch needs no extra run.
- If you keep the current shape, add a standing answer: red on `A snapshot doesn't exist` for exactly `admin-zero-*` and the 32 names is expected until T10, any other e2e failure is a real red, and each task report quotes the failed-test list for its head.
- Add to the executor prompt: each accepted-task report names the CI verdict on its head.

**B2. blocker, correctness. `2026-11-02-p2-p4-plan.md:92,168`. `npm test -w packages/cairn-cms-dev` does not exist.**
- Probed: `npm error Missing script: "test"`, exit 1. The package has no `scripts` block.
- `handle.test.ts` runs under the root unit project (`vitest.config.ts:96`).
- It is T1's named test and the `small-api` merge row's check.
- Fold, at both lines: `npx vitest run --project unit packages/cairn-cms-dev/src/handle.test.ts`.

## Major

**M1. major, correctness. `2026-11-02-p2-p4-plan.md:168,272,338,399,419`. Every local e2e command is the wrong one.** The bare `npx playwright test` has four problems, and it gives no cwd (the config is in `examples/showcase`):
1. It skips `pretest:e2e` (`examples/showcase/package.json:24`), so it runs against stale `dist`. This includes `packages/cairn-cms-dev/dist`. T1's smoke would pass `content: 'empty'` into the old handle, which treats it as `'repository'` and throws under workerd. T4's `csrf-origin` run would pass on the old engine.
2. With no `E2E_PORT`, it uses 4173. The config's own comment says that port can be another project's, and `reuseExistingServer` is true locally, so it can silently test the wrong site.
3. It bypasses `cairn-run-gate`, the lane lock.
4. In T8 and T9 it hits the CI-canonical baseline gotcha (`durable-gotchas.md` line 122).

Fold, in full at each step, using the gate's own form from `gate-tier.mjs:152-154`: `cairn-run-gate "export E2E_PORT=4392 && ! ss -Htln 'sport = :4392' | grep -q . && ! ss -Htln 'sport = :4394' | grep -q . && npm --prefix examples/showcase run test:e2e -- --retries=0 e2e/<spec>"`.

**M2. major, correctness. `2026-11-02-p2-p4-plan.md:210-213,72`. T3 changes the public surface and doesn't list `scripts/checks/api-surface.md`.**
- `auth.link.sent` goes into `CairnLogEvent` and `CAIRN_LOG_EVENTS`, both snapshotted at `api-surface.md:367-368`.
- `cairn-implementer` commits "only the files the task lists", so T3 either reports BLOCKED on a red surface check, or commits an unlisted file.
- `:72` also says no task edits `scripts/checks/**`, which T7 (`:347`) contradicts.
- Fold: add the file to T3 with `npm run check:surface -- --update`, and change `:72` to except the generated `api-surface.md`.

**M3. major, correctness. `2026-11-02-p2-p4-plan.md:142-168`. T1's file list misses what its own acceptance needs.**
- `hooks.server.ts:3` imports from `dev-gate.js` outside the exclude block. `content: devBackendContent()` needs a new import, and it has to be inside its own marker pair. Otherwise the template imports a name the strip removed and `templates/waymark` breaks. The plan says only that the auth branch has no changed line.
- `env.CAIRN_DEV_CONTENT` needs a declaration beside `CAIRN_DEV_BACKEND` in `examples/showcase/src/app.d.ts:32`. That file ships in the template, so it needs markers or a regenerated `templates/waymark`. It isn't listed.
- "A second test shows `devBackendContent()` returning `'fixtures'`" has no home. `handle.test.ts` can't reach it. It has to be `examples/showcase/src/chassis/dev-gate.test.ts`, and `.cairn-template.json` must exclude it or it ships testing a stripped function. Neither file is listed. An alternative is to drop that test as over-ceremony. The function is one line, and T2's zero-state tests prove the `'empty'` arm while `:167` proves the `'fixtures'` arm.
- `/admin/posts on the second port` has no spec in T1's files, because T2 adds the block. Name it, for example one test in `admin-visual.spec.ts`.
- `seedEmptySite` must also delete the module-level `SEED_POST` (`fake-github.ts:42-47`). The list crawl (`content-routes-list.ts:153`) would otherwise find it. And `handle.ts` routes the backend on `content === 'fixtures'` (`handle.ts`, `const backend =`), which must become "not repository". State both. Module state is shared per test file, so `handle.test.ts` needs a reset or its own file, or the empty test poisons the others.
- `emit-template.mjs` markers work on any comment form (confirmed, `stripMarkedBlocks`). The mechanism itself is fine.

**M4. major, correctness. `2026-11-02-p2-p4-plan.md:159-161`. The second `webServer` entry is prose, and it omits a required flag.**
- The prose names `CAIRN_DEV_CONTENT` and `PUBLIC_ORIGIN`, not `--var CAIRN_DEV_BACKEND:1`. Without that the server takes the `createAuthGuard` branch and every admin page redirects to sign-in. Write it in full: `npx wrangler dev --port ${N+2} --inspector-port ${N+3} --var CAIRN_DEV_BACKEND:1 --var CAIRN_DEV_CONTENT:empty --var PUBLIC_ORIGIN:http://localhost:${N+2}`, `port: N+2`, `timeout: 60_000`, `reuseExistingServer: !process.env.CI`.
- Verified sound: entries start in order and each setup awaits (`runner/index.js:6542`). `use.baseURL` overrides `PLAYWRIGHT_TEST_BASE_URL`, which the loop at `:1003-1011` sets to the last entry.
- Gap: the second port is not covered by `gate-tier.mjs`'s `E2E_GUARD`, and `gate-tier.mjs` is on the protected list. A stale 4394 from a crashed run or another worktree is reused silently. M1's command covers it for local runs. Add one standing answer: another session's listener on either port means wait and rerun, and an own stale server means kill the PID you started.
- The spec's port needs its own read of `E2E_PORT` (as `csrf-helpers.ts:3`). Name it, because `test.use({ baseURL })` needs a value at describe time.

**M5. major, correctness. `2026-11-02-p2-p4-plan.md:431`. "Run the CI watch after the commit" reads a bot head that shows red.**
- Checked with `gh api`. Regen commit `7a78afceb` (PR #183) has 7 `pull_request` runs, all `completed failure`, triggered by `github-actions[bot]`, with 0 jobs. Run `41424017231` shows `total_count: 0`. `34f137788` shows the same pattern.
- `ci-green` exits 1 on that ("a run concluded anything but success or approval-held"), or 4 if it catches the held state. The plan's row sends a red to "trace and fix", and there is nothing to trace.
- I didn't establish why the runs conclude failure with no jobs.
- Fold: T10 watches only the `workflow_dispatch` run itself (the `gh run watch` on that dispatch), then pulls. The next real push, T11, carries head CI. Name `ci-green` exit 4 with actor `github-actions[bot]` per `cairn-pass`, and say that a 0-job failure on the bot sha is not a red.
- Write the dispatch in full, since T10 and any regen in T12 repeat it: `gh workflow run e2e.yml --repo glw907/cairn-cms --ref worktree-p2-p4-run -f update_snapshots=true`.
- The regen commit step is skipped if any test in those two specs fails (no `always()`), so a heading assert red yields no baselines. Say the answer: fix and redispatch.

**M6. major, correctness. `2026-11-02-p2-p4-plan.md:107,124,432` against sheet line 407. The ceiling cut breaks the may-not list.**
- `:124` says the zero-state proof at 320 and 2560 may not be set aside. `:432`'s cut, "320 only, which is 16 + 5", removes half of that proof.
- `:124` also drops the sheet's "composed at 320 and 2560" from the may-not list.
- Fold: the cut touches only the eight-screen loop, so 16 + 10 = 26 images, and 2560 for the eight is read by eye. Restore the sheet's may-not line.

**M7. major, correctness. `2026-11-02-p2-p4-plan.md:409-414`. T9's fixtures are unnamed, on shared singleton state.**
- e2e runs one worker over one fake repo. Publish moves a seed entry for every later spec (`media-*`, `spellcheck`, `tidy`, and others after `k` alphabetically). Name a per-run entry created through `page.request`, the way `SEED` specs avoid collisions.
- Sign-in leg: `fake-auth-db.ts` has no branch for `consumeToken`'s `DELETE FROM magic_token ... RETURNING email` (only `WHERE email = ?`, `:224`; unhandled SQL throws, `:275`). So the confirm leg ends on an engine failure, not a sign-in, which is why `csrf-origin.spec.ts` accepts `/This didn’t work|Sign in to/`. State the accepted landing.
- The email typed must be off the list. Otherwise `requestAction` walks token SQL. Use one such as `nobody@example.test`, which returns `sent` (`auth-routes.ts:202`).

**M8. major, correctness. `2026-11-02-p2-p4-plan.md:329-330`. Two of T6's five refusals need their triggers named, and the fixture `failure` envelope is a trap.**
- Nav blank label: real (`site-config.ts:56`, no client `required`).
- Create with a taken slug: real, but for dated `posts` the id composes date and slug (`content-routes-entry-read.ts:262`), so the test must set Date to match a seeded id, or use `pages`.
- Editors duplicate: real (`editors-routes.ts:119`, name and role still needed). `required` on Name means the test must fill both.
- Tags: "rename a tag so the save refuses" has one real trigger, a blank label, since the input has no `required` (`VocabularyAdmin.svelte:283-288`, `site-config.ts:427`). Say that. A true rename doesn't refuse.
- Tidy: no real trigger through the UI. Its controls can't produce invalid conventions, so a `page.route` fulfill is the path. The envelope must be `{ type: 'failure', status: 400, data: stringify({ error }) }` with devalue's `stringify`. Plain JSON in `data` fails `deserialize`. Name it.

**M9. major, correctness. `2026-11-02-p2-p4-plan.md:345-347,360`. T7's list misses the tests that pin its removal, and "find the control by name" is underspecified.**
- `field-input.test.ts:308-340` and `edit-page-field-hint.test.ts:105-127` assert `maxlength` and `minlength`. List them, since the implementer commits listed files only.
- `name` resolves to a hidden input on the hero field (`EditPage.svelte:321-323`), a group on tags, and nothing on a nested top key. State the rule: exactly one non-hidden match, else the banner.
- Verified sound: `onFormInvalid` is reached by `requestSubmit`, both save paths use it (`:416,457`), and there's no `novalidate` or `formnovalidate`.
- A stored value already out of bounds has no `input` event, so it reaches the server half. That's fine, but the design's "both sides count the same string" holds only after a keystroke.

## Minor

**m1. minor, correctness. `2026-11-02-p2-p4-plan.md:94,425,454`.** "T10 runs after the last `main` merge" is false: T12 merges `main` again. Fold: T12's merge reruns T10 only if the incoming diff touches a rendered path. Also add an answer for `small-api` still open at T12. `:108` covers only launch.

**m2. minor, correctness. `2026-11-02-p2-p4-plan.md:137`.** `origin/worktree-p2-p4` does not exist (`git ls-remote` returned none). T0's merge fails unless the conductor pushes first. Put it in the launch step.

**m3. minor, correctness. `2026-11-02-p2-p4-plan.md:318-319`, design `:93,103-106`.** Design's "Kit applies `form` in place" is true only on a bare URL.
- Kit 3.0.1 `app/forms/client.js:89-109`: `update()` navigates when `result.location` differs from the current URL. `get_action_location` strips the `?/save` key, so a refusal at `/admin/nav?saved=1` lands on `/admin/nav` through `_goto`, reruns the load, and resets scroll.
- My read is that it still works. `$state` survives, no `{#key}` changes, `form` comes through `load_route:1582`, and `finish_navigation` resets focus only when `activeElement === body`, which the alert's action prevents.
- But it's the common path (save, edit, refuse) and no test covers it. Add a case to `refused-forms.spec.ts`. `?saved=1` alert-success clears on this path, which is the right behavior, so keep plain `update()`.
- Also correct design `:107`: the action can't run for a no-JS post, because nothing hydrates. It runs only for a post made before hydration.

**m4. minor, correctness. `2026-11-02-p2-p4-plan.md:304`.** `_app-forms.ts` already passes `update: async () => {}`, so the "if the stand-in needs `update`" clause needs no change. Delete the file from T6's list. Two effects to state:
- The stub doesn't apply `form`, so a component test re-renders the prop.
- Component tests run in real Chromium (`vitest.config.ts:211`). A `location.assign` on the `redirect` branch would navigate the test frame, so that branch is proved only by the sixth e2e test.

**m5. minor, correctness. `2026-11-02-p2-p4-plan.md:320-324`.** `ConceptList` has one `form` for all its actions, and `CreateFailure` has no discriminator. The plan's shared submit function can't tell the alert which dialog owns it. Name a local `createRefused` flag, set in a wrapper that also clears `creating`, cleared on dialog close, so a reopened dialog is clean.
- The focus action on the page banner would also fire on `data.error` and `data.formError` at load. Put it only on the `form?.error` arm.
- The docs story `publish/refusal-banner` (`src/lib/reproductions/stories/publish.ts:112`) mounts `ConceptList` with a refusal on a published page. Confirm no focus is taken there, or use `preventScroll`. The sheet's "reproductions follow the screens" appears nowhere in the plan, so add it to T11's search.

**m6. minor, correctness. `2026-11-02-p2-p4-plan.md:399`.** `--grep editors` matches the existing `admin editors page` baselines (not reproducible locally) and the new loop's, and writes local PNGs. Fold: give the width assertion its own test, `editors table fits at 320`, in `admin-visual.spec.ts`, and grep that title.

**m7. minor, correctness. `2026-11-02-p2-p4-plan.md:204,271`.**
- "No counter glyph and no line through text" has no check. Only the class-name test can fail. Add one computed-style assert in the zero help test (`::after` content is `none`).
- T4's grep over `docs` hits this plan (`:256`) and fails its own acceptance. Scope it to `docs/admin docs/editors`.

**m8. minor, correctness. `2026-11-02-p2-p4-plan.md:266,277,493`.**
- The pair claim "share no file" has one conditional hole: T5 lists `docs/admin/troubleshooting.md` "if a quoted string changes", and T4 owns that file. The grep finds no such quote in `docs/admin`, so delete it from T5.
- `auth-routes.ts:344-349` quotes no retired sentence, so T4's "if" also resolves to no edit. Delete the clause.
- Otherwise pairs are disjoint, generated outputs included, after M2.

**m9. minor, correctness. `2026-11-02-p2-p4-plan.md:82-95`.** The overlap table omits `skills/.../admin-access.md` (T4 here, `small-api` at `:46,99,120,121`) and `scripts/checks/api-surface.md` for T3 (`:109` handles the merge). Add the rows. Other rows match the run branch (21 commits, nothing touches this pass's core files except `hooks.server.ts`, `EditPage.svelte`, `api-surface.md`, and `content-routes-context.ts`).

**m10. minor, correctness. `2026-11-02-p2-p4-plan.md:459`.** `standards:cloudflare-workers-reviewer` "if T3's log change touches the send path's behavior": it does, by construction (`cloudflareSend`). Resolve it to "run".

**m11. minor, correctness. `2026-11-02-p2-p4-plan.md:466`.** T12's fold can edit docs after T11. Add "`npm run check:docs-gate` after the last docs edit".

**m12. minor, optional. `2026-11-02-p2-p4-plan.md:44`.** The quote `fieldset.ts:128` is `:127`. Every other quoted line I checked matches at `925d9ca0c`: `NavTree`, `VocabularyAdmin`, `HelpHome`, `CairnTidySettings`, `ConceptList`, `ManageEditors`, `LoginPage`, `ConfirmPage`, `refusal-codes.ts`, `content-routes-entry-write.ts`, `EditPage`, `FieldInput`, `email.ts`, `branches.ts`, `repo.ts`, `roles.ts`, `e2e.yml:163`, `playwright.config.ts:51`, `when-something-goes-wrong.md:119`, `troubleshooting.md:40`.

**m13. minor, optional. `2026-11-02-p2-p4-plan.md:189-193`.** The zero-state copy drops today's "or seed from tags already on your entries" branch (`VocabularyAdmin.svelte:260-262`). An empty vocabulary with seed candidates loses the hint. And an `EmptyState` action that unmounts itself on Add drops focus to `body`. Say where focus goes: the first row's label.

**m14. minor, optional. `2026-11-02-p2-p4-plan.md:416`.** "Fixed in this task if it is a one-file change" is a fine rule, but T9's 60 minutes has no allowance for fixes. Headroom covers it, and the rule has a filed path.

## Over-ceremony, by cost

**O1. minor, optional. `2026-11-02-p2-p4-plan.md:430,461`.** The same 42 images are read twice in one session (T10's executor is T12's main loop), plus `standards:visual-verifier`. Fold: T12 step 2 reads only images changed since T10, plus the help panel and the emails. Saves about 42 image reads and roughly 10 to 15 minutes. CLAUDE.md's main-loop read is met by T10.

**O2. minor, optional. `2026-11-02-p2-p4-plan.md:238-239`.** T3 renders four PNGs in a pair worktree to a job tmp path that T12 must then find, and any fold makes them stale. Move the render to T12 step 2. Saves about 5 minutes and removes a cross-task artifact.

**O3. minor, optional. `2026-11-02-p2-p4-plan.md:278`.** A per-commit `diff-reviewer` on T5, when `standards:web-auth-security-reviewer` and the whole-branch review read it at T12. The change is string concatenation. Drop it, about 5 minutes.

## Estimates

- Path arithmetic is right (505, pairs at the longer task).
- T6 at 90 and T9 at 60 are the risky ones, but recent actuals (42 to 80 percent) cover them.
- T10 at 30 is tight: #183's regen ran about 15 minutes (`created_at` to `updated_at` of the follow-on run suggests this, though I did not time the dispatch itself), plus 42 image reads. It's fine with O1, and under the 780 ceiling either way.
- Each pair implementer pays the setup command. That's in the task figures only by implication and carries no risk.

## Lens items checked with no finding

- Kit's `applyAction` remount and `reset_focus` only on success (`client.js:2997-3005`).
- CSRF cookie doesn't rotate on a refusal (`csrf.ts:91-114`), so a form that stays mounted keeps a valid token.
- `miniflare` `send()` returns `{ messageId }` for the object form (`send_email.worker.js:3695`), so T12 can assert `auth.link.sent`. T3's optional read also covers the type (`EmailSender` returns `unknown`).
- `src/lib/log/index.ts` is a thin re-export, so T3's `check:public-skill` risk is low.
- `guidance-hashes.json` is built from shipped tags, so skill edits don't touch it.
- `e2e.yml:163` picks up the new tests by file. Filenames don't collide with the 92 existing snapshots.
- T5's counts are exact (13 and 8), no code parses those strings, and no doc quotes them. `failed[].error` in media-delete carries R2 errors, not these.
- All the auto-mode items are covered by `~/.claude/settings.json` lines 420-422.
- No `[you]` item is hidden: no sign-in, secret, dialog, or third-party write. N/A lens items: headless `claude -p`, clean containers, the Undo window, sitting-time community search.

## Owner forks

None. S1 and S2 are the conductor's under the sheet's row, and each has a recommendation in the plan.

## Relevant paths

- `/var/home/glw907/Projects/cairn-cms/.claude/worktrees/p2-p4/docs/internal/plans/2026-11-02-p2-p4-plan.md`
- `/var/home/glw907/Projects/cairn-cms/.claude/worktrees/p2-p4/docs/internal/plans/2026-11-02-p2-p4-design.md`
- `/var/home/glw907/Projects/cairn-cms/.claude/worktrees/p2-p4/examples/showcase/playwright.config.ts`
- `/var/home/glw907/Projects/cairn-cms/.claude/worktrees/p2-p4/scripts/checks/gate-tier.mjs`
