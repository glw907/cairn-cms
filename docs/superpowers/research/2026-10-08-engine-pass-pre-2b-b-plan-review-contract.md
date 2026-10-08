# Plan review, contract and criteria lens: engine pass B before stage 2b

Target: `docs/superpowers/plans/2026-10-08-engine-pass-pre-2b-b.md` at `57baf01b`, re-targeted from
`a9fa3436` by the conductor. Line numbers are `57baf01b`'s. The code was read on `main` at `57baf01b`.
Read alongside: the spec (`2026-10-07-engine-pass-pre-2b-design.md`), the owner rulings, pass A's plan,
`pass-core`, and `cairn-pass`.

Scope: correctness gaps ranked by consequence, and over-ceremony ranked by cost. Nothing else.

**Counts:** 0 blocker, 5 major, 7 minor. No OWNER FORK. The ceiling number in M5 is Geoff's budget
to set, but its basis is a correctness item, so the finding proposes a number.

## Majors

### M1. The notice signal needs a third public member the plan does not name, and that trips a stop rule

- **Where:** plan:219-226 (Decision 3), plan:787-791 (Task 10 Files), plan:819-823, and plan:140-141
  (the no-new-surface stop).
- **Defect:** Decision 3 counts one optional `App.Locals` member plus one `AdminShellData` member.
  But `shellLoad` takes a `CairnEvent` (`src/lib/sveltekit/content-routes-shell.ts:133`). It reads
  locals through the structural mirror at `src/lib/sveltekit/types.ts:66-72`. That mirror is public:
  `docs/internal/api-surface.md:183` lists it. So the load can read the new member only if
  `CairnEvent.locals` gains it too, or if the implementer adds a cast. Neither Task 10's Files nor
  Decision 3 names the mirror. Under plan:140-141 the implementer must "stop and report". That stops
  the unattended run at S4.
- **Leanest form:** the notice describes the content store, not the request. The dev handle already
  injects its store as `locals.cairnBackend`, which `CairnEvent.locals` already types. Fork 1 could use
  one optional read-only member on `Backend`, for example "this store does not persist". The dev
  package's `'repository'` backend sets it, and `createGithubApp`'s backend never does. The shell
  load maps it to the one `AdminShellData` member. That is two public members instead of three. It
  adds no sixth ambient key, and `ambient.ts`'s "the five members" contract comment stays as it is.
  "A production request never sets it" then holds by construction, not by convention.
- **Fold:** Decision 3 takes the `Backend` member, and Task 10's Files swap `src/lib/ambient.ts` for
  `src/lib/github/backend.ts` and `docs/reference/core.md`. Task 11's reference bullet at plan:886
  follows. The other option keeps the `App.Locals` member and names `src/lib/sveltekit/types.ts`
  (`CairnEvent.locals`) in Decision 3, Task 10's Files, and Task 11's reference rows. Its Task 10
  acceptance then gains a `check:surface` line that shows all three members.

### M2. The owner's magic-link click buys nothing that pass B changed

- **Where:** plan:303 (owner step 2), plan:1019-1020 (close step 6), plan:976.
- **Defect:** the smoke exists for the two `auth-data` tasks. Task 2 changes `create-cairn-site`
  provisioning, which the smoke cannot reach (plan:1021-1022 says so). Task 5 changes the dev-build
  define. That change is proved by the unauthenticated `GET /admin` redirect (plan:1014-1015) and by
  the `wrangler deploy --dry-run` marker grep (plan:624-626). Pass B touches no line on the
  magic-link path. Pass A already settled this smoke differently. Its Decision 14
  (`2026-10-08-engine-pass-pre-2b-a.md:221-224`) drives the round trip in headless Chromium with no
  owner click. `pass-core` also rules that verification a plan parks "for the owner" is Claude's
  (Geoff, 2026-09-21). The step spends Geoff's attended time and blocks the close on a check with no
  pass B criterion behind it.
- **Fold:** drop the magic-link round trip from close step 6 and delete owner step 2 at plan:303. If
  a round trip is still wanted as a regression net, run it headless by pass A's Decision 14 and cite
  it. Either way, the owner steps shrink to fork 1 (see m1) and the merge.

### M3. The facts candidate set misses the admin-track facts that Tasks 1 and 2 falsify

- **Where:** plan:892-898 (Task 11 candidate set), plan:395-396 (Task 0's keyword re-grep), and
  plan:953 (acceptance).
- **Defect:** the candidate set holds only `extend.md` and `front-door.md` ids. Four facts in
  `docs/internal/facts/admin.md` state the two-database scaffold that Tasks 1 and 2 remove:
  - `f:vfpai6` (`:10`, "one Worker, two D1 databases");
  - `f:gcuj1j` (`:40`, "`APP_DB` open for developer use");
  - `f:xw0bit` (`:51`, the closing summary's "two databases");
  - `f:l3cxgc` (`:116`, "`AUTH_DB` (beside `APP_DB`)").

  The re-grep keywords (`signups`, `APP_DB`, ...) catch `f:gcuj1j` and `f:l3cxgc` only if the grep
  runs over the whole facts directory. They never catch `f:vfpai6` or `f:xw0bit`. The acceptance,
  "the facts triage covers every id in the candidate set", then passes while those facts stay false.
  The admin arm's stage drafts from these facts.
- **Fold:** add the four ids to the candidate set. Run the Task 0 re-grep over all of
  `docs/internal/facts/` and add `two (D1 )?databases` and `-app\b` to its keywords. `f:xw0bit`
  cites the now-stale `01d-resume.txt`, so its correction notes that the capture is stale until the
  next live capture, the same as Task 2's friction entry.

### M4. Task 4's `exports` outcome omits the `svelte` condition, which would publish a broken manifest

- **Where:** plan:564-565 (outcome), plan:582 (the `check-dev-package` case).
- **Defect:** `packages/cairn-cms-dev/package.json:20-24` carries three conditions, `types`,
  `svelte`, and `default`, and all three point at `./src/index.ts`. The outcome moves only `types`
  and `default`. With `files: ['dist', 'README.md']`, a registry install has no `src/`. Vite resolves
  the `svelte` condition first, so a consumer's dev server and build fail to resolve the package.
  The monorepo hides the defect. The showcase symlinks the package, so `src/` still exists and the
  `svelte` condition still resolves. The `npm pack --dry-run` listing passes too. Only the "report
  shows the resolved file" line (plan:584) and the close's tarball bake would catch it. The
  permanent guard is the `check-dev-package` case, and as worded it would not pin it: "a manifest
  whose `exports` points at `src/`" does not say per condition.
- **Fold:** the outcome reads "every `exports` condition (`types`, `default`, and `svelte` if kept)
  points into `dist/`". Dropping `svelte` is also fine, since the package ships no `.svelte` files
  (`packages/cairn-cms-dev/src` holds only `.ts`). The `check-dev-package` case fails when any
  condition string falls outside `dist/`, with one table row per condition.

### M5. The ceiling's basis misreads the SvelteKit 3 record and under-prices the full-tier chains

- **Where:** plan:34-50.
- **Defect:** plan:48-50 says the SvelteKit 3 close "overran its budget by about a third, so the
  close line carries that margin". The record says otherwise: "The close's fix chain cost about 1.95M
  against about 1.45M budgeted for the whole close"
  (`2026-10-03-sveltekit-3-upgrade.md:1562`). The fix chain alone ran a third over the whole close.
  The close as a whole, with the simplifier, four reviewer seats, the consumer proof, the smoke, and
  the ledgers on top, ran roughly double. Pass B's 2.2M close covers that fix chain plus 0.25M, and
  pass B's close has more seats (five, plus a `visual-verifier` read). The chain rate is also low.
  Pass A (plan A:32-34) and SvelteKit 3 (`:33-35`) both price a full-tier chain at 0.55M, "raised
  for the e2e". Pass B prices all nine chains at 0.50M, though Tasks 1, 3, 4, and 5 gate on F and
  Tasks 1 and 4 also run fresh installs. The SvelteKit 3 pass ended at 14.7M against 12.4M, and its
  ceiling was raised twice.
- **Consequence:** the 80 percent stop (8.64M) is a stop rule in an unattended run. An under-priced
  ceiling trips it in S4 or the close, and that costs an owner turn.
- **Fold:** price the chains at 0.55M (+0.45M) and the close at about 3.0M (+0.8M), giving a ceiling
  of about 12.0M with the 80 percent line near 9.6M. Restate the basis sentence with the record's
  actual figure.

## Minors

### m1. The fork-1-open path makes Task 11's criteria contradictory; make fork 1 a precondition

- **Where:** plan:209-213, plan:297, plan:204-205.
- **Defect:** with fork 1 open, Task 11 runs before Task 10. Several of its criteria then describe
  behavior that has not shipped:
  - the `seedContent` repoint grep (plan:951);
  - the CHANGELOG `seedContent` line (plan:901-902);
  - the ruling-5 relink items (plan:924-925);
  - ROADMAP's B12 removal (plan:937);
  - the notice reference rows (plan:886).

  The implementer has two bad options: write records for an unshipped change, or call live hits
  "intentional", which makes the grep criterion vacuous.
- **Fold:** execution already waits for Geoff's spec read (rulings file, "Overnight pipeline"), and
  fork 1 is in that read. Make "fork 1 ruled" a Task 0 precondition and delete the Task-11-first
  branch. This also removes ceremony. The fallback is to list Task 11's ruling-5 items as moving to
  Task 10's own docs delta.

### m2. The smoke's D5 bullet cannot meet its fixture on the showcase

- **Where:** plan:1016-1018.
- **Defect:** the bullet asks for "a Settings save on a site without `editor.nav`". The showcase
  declares `editor.nav` (`examples/showcase/src/theme/cairn.config.ts:181`), so the bullet passes
  vacuously. D5 is `engine-logic`, and Task 9's integration test (plan:761-765) already proves it.
- **Fold:** drop the D5 clause from the smoke, and keep the session-row `/admin` reach.

### m3. One overlay outcome has no criterion

- **Where:** plan:809-810, plan:827-845.
- **Defect:** the spec (`:340-341`) and the outcome both say an overlay entry wins until restart: a
  disk edit to a file the dev admin has written does not show. No acceptance line tests it. The
  `engine-logic` bar blocks on unmet outcomes, so the reviewer either invents the test or misses it.
- **Fold:** add one line: "after a save, a disk edit to that file does not show until restart".

### m4. Task 5's privileged define does not name its channels

- **Where:** plan:606-608, plan:618-621.
- **Defect:** `__CAIRN_DEV_BUILD__` decides whether the owner-minting handle compiles in.
  `loadEnv(mode, dir, 'VITE_')` takes `VITE_CAIRN_E2E` from the process env and also from `.env`,
  `.env.local`, `.env.<mode>`, and `.env.<mode>.local`. The plan writes `root`, the template uses
  `process.cwd()` (`templates/waymark/vite.config.ts:28`), and Vite's own env loading reads `envDir`.
  The criteria test one unnamed channel.
- **Fold:**
  - Name the channels: process env, and the `.env*` files in a named directory, which should equal
    the template's `process.cwd()` so behavior stays identical.
  - Add one unit case where only a `.env.production` file sets the flag, so the file channel is
    pinned. A narrower channel (process env only) would change today's behavior, so the plan keeps
    the template's channels and states them.
  - The runtime tripwire stays the second fence. The `web-auth-security-reviewer` brief at
    plan:995 names the channels.

### m5. Task 5's "no `TS2451`" cannot fail

- **Where:** plan:627.
- **Defect:** the template sets `"skipLibCheck": true` (`templates/waymark/tsconfig.json:14`).
  Every consumer site checked (ecxc-ski, 907-life, aksailingclub-org, xcathletes-org, cairn-pub)
  sets it too. `TS2451` between two `.d.ts` declarations is never reported, so the parenthetical
  claims a proof the run does not make. The 0/0 itself is meaningful: it proves the ambient
  declaration reaches the template's `__CAIRN_DEV_BUILD__` reads.
- **Fold:** drop "(no `TS2451`)", or replace it with "the template's reads of the global resolve
  through `/ambient`". The spec's own reasoning is unchanged: `Consumers may:` is correct, since no
  known site has `skipLibCheck` off.

### m6. Ruling 5's default flip has no consumer record

- **Where:** plan:899-912.
- **Defect:** `content` defaults to `'repository'`. A site that runs the dev backend under `vite
  dev` with no `seedContent` sees its real content, not the fixtures, after upgrading.
  `xcathletes-org` does this today (`src/hooks.server.ts:62-63`). Its options bag never named
  `seedContent`, so the drafted `seedContent` line does not reach it.
- **Fold:** add one `Consumers may:` clause: "pass `content: 'fixtures'` to keep the seeded dev
  content". `migration-notes.md` mirrors it.

### m7. Task 1's F floor is over-ceremony

- **Where:** plan:411-412, plan:454.
- **Cost:** one full gate run, including the whole showcase e2e and the admin-visual run.
- **Defect:** Task 1's showcase edits are exclusion markers (comments) and `.cairn-template.json`
  entries. The showcase's runtime stays byte-identical, so the e2e proves nothing new. Other checks
  already catch a misplaced marker: `check:template`, `test:emit`, the showcase's own `npm run check`
  inside E, and the fresh bake's check and build.
- **Fold:** set the floor to E plus S, and let `gate-tier.mjs` raise it if the committed diff
  warrants.

## Checked and sound (no finding)

- **Spec coverage.** Every pass B item lands in a task with its criterion and its fails-today reason
  intact, in the spec's pass B list order 1 to 11. Decision 10 (unedited transcripts) and Decision 5
  (narrowed grep) are recorded departures. `check:transcripts` compares doc blocks against fixtures,
  not against code (`scripts/checks/transcript-blocks.mjs:5-6`), so the unedited fixtures stay green.
- **`Consumers must:` lines.** Every pass B breaking change carries one: `seedContent`,
  `configPath`, `itemLabel`, reserved ids, label uniqueness, and the sanitize floor. The
  `devBuildDefine` `Consumers may:` line is right: every consumer has `skipLibCheck` on.
- **The dev package's move to `dist/`.** This is the convention, and it is not breaking: `exports`
  exposes only `"."`. It needs no consumer line beyond M4's correctness fix. Decision 2's
  publish-path catch is real: `publish-dev` runs no install and no build
  (`.github/workflows/publish.yml`).
- **The worker types after `APP_DB` leaves.** `worker-configuration.d.ts` carries `APP_DB` today,
  and the emit regenerates it from the emitted `wrangler.jsonc` (`scripts/build/emit-template.mjs:165-168`).
  Task 1's grep is not vacuous and needs no added file.
- **D6 on the scaffold.** Every frontmatter key in the template's seed content is declared on its
  concept, so a fresh build prints no D6 warning.
- **A14's shared set.** If the dispatcher reads the union with `media`, its routing does not change.
  `/admin/media` returns its view before the reserved check, and `/admin/media/<x>` already 404s
  (`src/lib/sveltekit/admin-dispatch.ts:69-90`).
- **Task 10's `process.cwd()` tests.** The unit project runs on Vitest 4's forks pool, where
  `process.chdir` works, so a temp-directory fixture needs no `root` option and no new surface.
- **Proportionality.** The classes fit the risk, and Task 2's S gate override is justified by
  blast radius. The one over-ceremony finding is m7.
- **Ceiling arithmetic.** The rows sum to 10.80M. Only the basis is wrong (M5).
