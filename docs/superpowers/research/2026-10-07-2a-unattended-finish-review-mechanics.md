# Plan review: 2a unattended finish, mechanics and feasibility lens

Target: `docs/superpowers/plans/2026-10-07-2a-unattended-finish.md` at `e2fc3815`. Governing plan:
`draft-docs-2a` worktree, `docs/superpowers/plans/2026-09-30-draft-docs-stage-2a.md` at `9ca04531`.

Method: I checked each claim against source, or ran it. I reproduced the R2 merge in a throwaway
detached worktree under `$HOME/.cache/review-2a` (`git merge --no-commit main` at `9ca04531`). I
resolved every hunk to `main`'s side and ran the docs-gate components that need no fresh install.
The worktree is removed and pruned, and no branch was touched. I probed the gate matcher by
extracting the real `GATE MATCHER` block into a scratch script.

Per Anthropic's guidance, the blocker and majors below affect correctness or the plan's stated
requirements. The minors are optional.

**Counts:** 1 blocker, 5 major (1 an OWNER FORK), 13 minor.

## Blocker

### B1. R2's and R3's gate acceptance cannot go green before R4 runs

- **Where:** plan L107-110 (R2) and L128 (R3).
- **Defect:** both tasks require a green whole-tree `check:docs-gate`, and R3 also requires a green
  `check:provenance`. The merged tree breaks both on the pilot pages, and only R4 edits those
  pages. These failures were reproduced on the merged tree:
  - `docs-links`: 2 broken anchors. `add-cairn-to-a-sveltekit-app.md:477` and
    `security-model.md:167` link `supported-toolchain.md#the-checkorigin-deprecation`. On `main`,
    that heading is now "The `checkOrigin` removal".
  - `check:provenance`: red on the pilot briefs. Several sentences cite facts that `main`'s Kit 3
    pass tagged `[rejected]` (`f:gncd64`, `f:d2jumm`, `f:e5hqn3`). Other sentences name things
    `main` rewrote out of the cited fact: `no-referrer` and `auth.csrf-origin-mismatch` (`f:ix10bm`),
    `platform.env` (`f:tkpmxr`), `$chassis` (`f:lwrqfd`), and `invalidateAll` (`f:jra92k`). The
    failing briefs are `security-model.json`, `add-cairn-to-a-sveltekit-app.json`,
    `add-a-custom-admin-screen.json`, and `theme-your-public-site.json`.

  R2's carve-out covers only "facts that go red ... on 2a-added bullets". It is silent on pages and
  briefs. Under the contract (L39-42), the run stops at R2. The alternative is worse: an
  implementer edits pilot pages outside R4's method.
- **Fold:** in R2 and R3, accept a docs gate that is green except for failures confined to the six
  pilot pages, `choose-an-ai-posture`, and their briefs. Record those failures verbatim in the R2
  report as R4's input. Make R4 the first task whose acceptance requires the whole-tree gate green.
  Optionally, R2 retargets the two anchors to `#the-checkorigin-removal` as a pure link
  substitution. Provenance stays red either way, so the carve-out is needed regardless.

  Note that `check:facts` goes red at R2 on 4 bullets, all 2a-added: `f:6vy0ka`
  (`section-action.ts:310` is out of range), `f:j0ut9n`, `f:2zl3qz`, and `f:34rsss` (all three
  cite `templates/waymark/svelte.config.js`, which no longer exists on `main`). The existing
  carve-out covers these, so R3's list should name them.

## Major

### M1. R4's hand-written claim lists miss Kit 3 drift that is present at the merged HEAD

- **Where:** plan L140-154.
- **Defect:** these lines carry Kit 2 behavior and appear in no claim list. Each was verified at
  `9ca04531` against `main`.
  - **`add-cairn-to-a-sveltekit-app.md:229`:** "A custom route that reads `event.platform.env`
    needs `App.Platform` declared separately." It is brief sentence 95, which cites `f:vvgpr5`;
    `main` rewrote that fact to the wrangler `Env` type.
  - **`security-model.md:163`:** "the branded `auth.csrf-origin-mismatch` page". No source on
    `main` (`src/lib`, `tool/internal`) defines that condition.
  - **`add-a-custom-admin-screen.md:223-224` and `:234`:** `ctx.waitUntil.bind(ctx)` and the
    sentence that explains the binding. `main`'s Kit 3 form is
    `import { env, waitUntil } from 'cloudflare:workers'` (`docs/reference/sveltekit.md:728-734`).
    The 2a-added `f:ph6kjg` states the same binding advice, and R3's fact list (L122) does not
    name it.
  - **`add-a-custom-admin-screen.md:357`:** `invalidateAll()`. `main`'s `f:jra92k` now reads
    `refreshAll()`.

  R4's acceptance requires a whole-tree green gate, and provenance will flag most of these lines.
  The page then fails in a way R4's method does not route, so the run stops.
- **Fold:** define each page's claim list as the union of three sources:
  - the current hand list;
  - every `check:provenance` and `docs-links` failure on that page at R3's HEAD;
  - a grep at R3's HEAD for `\$lib|\$chassis|\$theme|svelte\.config|checkOrigin|no-referrer|platform\.env|App\.Platform|invalidateAll|csrf-origin-mismatch|waitUntil|SvelteKit 2|\^2\.70`.

  Add the four lines above explicitly, and add `f:ph6kjg` to R3's fact list.

### M2. The add-cairn reader re-test cannot install the engine from npm

- **Where:** plan L137-138.
- **Defect:** npm `latest` is `0.98.0`, whose peer range is `"@sveltejs/kit": "^2.70"` (checked
  with `npm view`). The Kit 3 engine is unreleased, and this run holds the release. In a scratch
  Kit 3 app, milestone 2's `npm install @glw907/cairn-cms` stops with `ERESOLVE`, the exact defect
  friction entry L623-630 records. Milestone 1 also runs `npx wrangler login` and
  `npx wrangler deploy` (page L165, L172). The login is a browser OAuth flow that an unattended
  agent cannot complete, and the plan does not say whether the deploy runs.
- **Fold:** the re-test installs the engine, and `@glw907/cairn-cms-dev`, from the merged HEAD
  through `npm run link:consumer -- <scratch-dir>`, as the durable gotcha "Pointing a consumer at
  unreleased engine work" describes. The page keeps the registry command, since docs on `main`
  describe `main`'s engine. Then name the deploy policy:
  - stop milestone 1 at `npm run build` and record the deploy step as unexercised; or
  - deploy with `$CLOUDFLARE_API_TOKEN` and delete the scratch Worker afterward.

  The same rule applies to any task 8 final-reader re-test that installs the engine.

### M3. Merge-resolution rules exist only for R2, but R7 and the lane PRs also merge

- **Where:** contract L36-37 and L40; R7 L222; lanes L194 and L218.
- **Defect:** the contract stops the run on "a merge hunk R2's rules do not cover". R2's rules name
  only R2's 5 files. The run makes three more merges:
  - **Second lane to merge:** L1 and L2 can both add lines under `tool/CHANGELOG.md`
    `## Unreleased` (L1's Go module bumps and L2a's behavior change). Both can also touch
    `ROADMAP.md`: the dependency skill's step 6 files held majors and any refactoring pass there.
  - **R7's merge of `main`:** 2a's branch carries 437 added friction-log lines, plus R3's triage and
    R5's `frictionFiled` entries. On `main`, L2 deletes two entries from that log
    (`docs-friction-log.md:58-67` and `:86-91`), and the lanes edit ROADMAP and CHANGELOG.

  Any one of these hunks stops the run on a mechanical conflict.
- **Fold:** add standing rules for every merge in this run, starting from `pass-gate-economy.md`'s
  orchestrator-hygiene rule:
  - STATUS takes `main`'s version.
  - HISTORY, CHANGELOG, `tool/CHANGELOG.md`, ROADMAP, and the friction log keep both sides' entries.
    A deletion on one side wins over an untouched copy on the other.
  - `package-lock.json` takes `main`'s version, followed by `npm ci`.
  - Anything else stops the run.

  The second lane to merge first brings `main` into its branch under the same rules.

### M4. R7 can deadlock on a lane that halted

- **Where:** owner ruling L22-23 ("A lane at its stop halts alone, and 2a carries on") and R7
  L222 ("after both lanes have merged").
- **Defect:** a lane can halt unmerged for several reasons:
  - its 3.2M stop;
  - the dependency skill's own stops (an undeclared visual-baseline move, an `npm audit fix` that
    needs `--force`);
  - a second `fix` verdict.

  R7 then never starts, and 2a's close never merges. That breaks the stated goal.
- **Fold:** R7 starts when each lane is merged or halted. A halted lane's branch stays open, and
  STATUS names it with its resume point.

### M5. The lane estimates sum to the lane ceiling, so the stop fires first (OWNER FORK)

- **Where:** plan L21-22 and the Budget table at L66-67.
- **Defect:** L1's 1.5M plus L2's 2.5M is 4.0M, the hard ceiling. The plan sets the lane stop at
  3.2M, so on its own estimate the lanes stop before both finish. For 2a the plan acknowledges the
  equivalent overrun (L69-70). For the lanes it says nothing, and the lane ordering is unspecified.
- **Recommendation:** raise the lane ceiling to 5M, which puts the stop at 4M and the whole-run cap
  at 25M. If the ceiling holds at 4M, run L2b before L2a (the flakes cost CI time every pass) and
  accept that L2a may be cut.

## Minor (optional)

1. **R1's line range is wrong (L77).** The `GATE MATCHER` block runs L395-421 in
   `pass-execute.js` and L316-342 in `pass-execute-chains.js`, not L395-455. The two blocks are
   identical today, and a parity test already asserts it (`pass-execute-runners.test.mjs:216`).
2. **One of R1's "new" forms already matches.** A `VAR=value` prefix outside the
   `cairn-run-gate` quotes matches today, because `gateCore`'s unanchored
   `/cairn-run-gate\s+'([^']+)'/` discards the prefix. The probe of
   `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check'` against `npm run check` returns true.
   Only the in-quotes assignment and the `&&` superset fail today. Mark the outside-quotes case as
   a regression pin, so a test-first implementer does not chase a red test that never appears.
   HISTORY's `export E2E_PORT=4392 &&` case is an `&&` step, which the superset rule covers.
3. **The superset rule would accept a gate run in the wrong worktree.** A reported
   `cd <other-worktree> && <gate>` would pass when the resolved gate carries no `cd`. This is the
   wrong-worktree failure the reviewer prompt already warns about. Fold: an extra `cd` step must
   resolve to the task's `repo`, or reject extra `cd` steps outright.
4. **R1 has no consumer in this run.** No task names `pass-execute`. Every chain has fewer than
   six tasks, so each one runs per task through the Agent tool. `docs-page-chain.js` has no gate
   matcher (grep finds no `gateMatches`). That makes R1's "persisted runner `cmp`s equal"
   acceptance vacuous. Fold: run R1 beside R2 (`~/.dotfiles` is a disjoint repo) and defer the
   persisted-runner `cmp` to its first launch. Also name the execution mode per task.
5. **R3's script bullet (L120-121) is already done by the merge.** The merged
   `scripts/checks/tool-check-ids.mjs` carries `config.csrf-trusted-origins` and marks
   `config.csrf-disable` as retired. 2a touched no script that names it. Reduce the bullet to a
   grep check.
6. **The ceiling count starts from the wrong number (L49-51).** The executing session's `/cost`
   starts at 0, but 2a's 20M ceiling includes the 1.0M planning share. Record that offset in the
   ledger, and add it at each boundary. Also say whether in-flight lanes run on to their merge
   when 2a hits its stop.
7. **"STATUS on `main`" collides with lane PRs merging on GitHub.** Name the sequence: pull,
   commit, push. Local `main` is already 1 ahead of `origin/main`.
8. **The lane worktrees need the same `npm ci` as R2 (root and `examples/showcase`).** The main
   checkout's own `node_modules` is stale: it holds `@sveltejs/kit` 2.70.3 while `main` is on
   Kit 3. Never run a gate there.
9. **L1 lists `templates/waymark` as a manifest to bump (L187).** That tree is emitted wholesale by
   `packages/create-cairn-site/scripts/emit-template-dir.mjs`, and `check:template` fails on a hand
   edit. Bump at the source, then run `npm run emit:template`.
10. **L2b's repeat run and assertion form need narrowing.** `admin-visual.spec.ts` carries 34
    `toHaveScreenshot` assertions. Running the whole spec with `--repeat-each=10` locally runs into
    the CI-canonical-baseline gotcha, so scope it with `-g` to the zen test. "Asserts the
    animation's start and end values" would drop the property the test exists for: it animates
    through more than two `margin-left` values. Keep the sample-until-settled form or an
    intermediate-value check.
11. **L2b's deletion reason needs both causes (L213-215).** The friction entry at L86-91 covers
    two specs: `tidy.spec.ts`, which `fbac121f` fixed, and `preview.spec.ts:371`, which L2b fixes.
    The deletion reason cites both.
12. **The guards are missing two details.** The lid-switch hold
    (`systemd-inhibit --what=handle-lid-switch ... sleep NNN`) needs a duration at least as long
    as the run. The 11 percent battery stand-down from `unattended-work-guards.md` is not named.
13. **R4's commit owner is unspecified.** R4 runs three pages in flight in one worktree, and each
    page says "the brief changes in the same commit". Name one agent that commits serially after
    the scoped reads, to avoid `index.lock` races. Gates are already serialized by the light-lane
    lock.

## Verified as stated

- **R2's merge shape:** 5 files and 14 hunks: `extend.md` 9, `admin.md` 1, `reference.md` 1,
  `docs-register.md` 2, `package.json` 1.
- **R2's rules:** they cover every hunk. The one-sided id lists match: every listed 2a id is absent
  from `main`, every listed `main` id is absent from 2a, and no id collides. `f:67pwmj` and
  `f:xg1per` are as described. The `package.json` combine is clean, and `check:options` already
  sits in `docs-gate.mjs`.
- **R4's Kit 3 facts on `main`:**
  - `#lib/*`, `#chassis/*`, and `#theme/*` are subpath imports in the template's `package.json`;
  - the tsconfig `extends` `$app/tsconfig`;
  - `@sveltejs/adapter-cloudflare` is `^8` and `@sveltejs/kit` is `^3`;
  - a `strict-origin` referrer meta appears in `CairnAdminShell`, `LoginPage`, and `ConfirmPage`,
    and `admin-response.ts:28` sets it as a header;
  - `supported-toolchain.md:105` is "The `checkOrigin` removal", which slugs to
    `#the-checkorigin-removal`;
  - `env` comes from `cloudflare:workers`, typed by wrangler's `Env` through
    `worker-configuration.d.ts`.
- **Claim-list line numbers:** every line number the plan cites at `9ca04531` matches.
- **Task 8 inputs:** the outline fact counts are 49, 18, 27, 13, and 26. Pending map rows are 3
  for `restrict-admin-access` and 19 for `add-a-second-sign-in-group`. None of the five pages
  exists yet.
- **R5's arguments:** `outline`, `inFlight`, `bothReviewers`, `gate`, `gateLane`, and per-page
  `extraChecks` all exist in `docs-page-chain.js`. The runner requires `worktree`, `gate`, and
  `pages`; the governing plan's task 8 supplies `worktree` and `pages` through "as the governing
  plan's task 8".
- **Lane sources:**
  - L2a: `doctor.go:72` calls `doctor.Results`, `spine/condition.go:74` holds the "2.0 seam", and
    the friction lines 58-67 and 86-91 are as cited.
  - L1: the npm `latest` versions are wrangler 4.148.0, Vite 8.3.3, Svelte 5.57.2, devalue 6.0.2,
    TypeScript 7.0.2, Vitest 5.0.3, and `@types/node` 26.6.4.
- **Guard tools:** `claude-wf-guard` exists with tiers `implementer` and `writer`. `/loop` and
  `ListAgents` exist and are in use.
