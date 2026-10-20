# SvelteKit 3 plan review: contract and criteria lens

Target: `docs/superpowers/plans/2026-10-03-sveltekit-3-upgrade.md` at HEAD `27b254ac`, against the
approved spec `docs/superpowers/specs/2026-10-03-sveltekit-3-upgrade-design.md` and the pass-class
table in `~/.claude/skills/pass-core/SKILL.md`. Scope: whether each acceptance criterion is testable,
names its fixture state, and would fail if the work were wrong; whether Interfaces agree; whether every
spec requirement maps to a task; class fit and ceremony. Spec rulings are not re-argued.

Each finding below was checked against the code at HEAD or the Kit sources, not recalled.

Counts: 0 blocker, 9 major, 8 minor; 5 over-ceremony items. No owner fork.

## What holds

- **Segment numbering matches the spec one for one** (S0 spike, S1 groundwork, S2 e2e host, S3 CSRF,
  S4 bump, S5 scaffold and docs). The plan's "cut after S2, never after S3" (plan:54-57) keeps the
  spec's intent: S0 to S2 change no runtime security behavior, and S3 lands with S4 in the second
  half. PC5 covers the one gap, the 80 percent trigger.
- **Spec-to-task mapping is complete.** Every spec bullet has an owner: the S3 proofs map to Tasks 8
  and 9, the doctor to 10, the public-surface table to 11, the facts, CHANGELOG, gotchas, kit#15992,
  and ROADMAP watches to 13, and Ruling 1 to close step 5. The one thin spot is the
  `CairnPlatformBindings` reference snippet, which the spec says "comes from that test"; Task 13
  does not require that (PC17).
- **The plan is outcome-only.** No task carries implementation code. The Interfaces blocks give
  names and signatures only.
- **The cross-origin pair names Kit's body** (plan:536). That is load-bearing, and PC11 explains
  why.
- **`.dev.vars` cannot leak into the template.** `scripts/build/emit-template.mjs:113` excludes
  `.dev.vars*`, so Task 5's generated file is safe from emit.

## Correctness findings, ranked by consequence

### PC1 (major): `membersDevHandle` has no double left after Task 5, and its flag stamp is an unnamed privileged channel

- **Location:** plan:412-413 (Task 5), plan:655-656 and plan:692-693 (Task 11), plan:119 (Global
  constraints).
- **Defect:** `examples/showcase/src/members/dev-wiring.ts:53-63` sets exactly two env members:
  `MEMBER_DB` (the double) and `CAIRN_DEV_BACKEND: '1'`.
  - Task 5 removes `MEMBER_DB`. That leaves the handle doing only one thing: stamping the
    privileged dev-backend flag onto env.
  - The plan never names this stamp. Global constraint 119 lists `.dev.vars` and `--var` as the
    flag's only channels, but the stamp is a third one, and it survives every grep the plan runs.
  - Task 11 then specifies `withEnv({ ...env, ...doubles })` for `membersDevHandle`. Its nesting
    test "reads a double from each" handle. After S2, `membersDevHandle` has no double, so that test
    cannot be written honestly. It either fails or gets satisfied by re-adding a double.
  - The `hooks.server.ts:22-28` comment about handle order ("MEMBER_DB merged ahead of it would be
    thrown away") also goes stale.
- **Fold:**
  - Task 5 states the handle's fate. The flag now reaches env through `.dev.vars` or `--var`, so the
    stamp is redundant and goes. If nothing remains, delete `membersDevHandle`, its dynamic import,
    and its exclude block, and correct the comment.
  - Task 5 acceptance: `git grep -n CAIRN_DEV_BACKEND -- examples/showcase/src/members` prints
    nothing.
  - Task 11's nesting test sequences `devBackendHandle` with a test-local second handle that adds
    its own double, the shape a developer writes. It fails if either handle replaces `env` instead
    of spreading it.
  - Record this as a "Decision this plan takes". It departs from the spec sentence naming
    `membersDevHandle`, and the plan's own rule (plan:23-24) otherwise forces a stop.

### PC2 (major): the referrer meta's placement duplicates it, and the "exactly one" test runs on the wrong unit

- **Location:** plan:491-505 (Task 8), plan:544-547 (Task 9, site-wide `no-referrer`).
- **Defect:** every `/admin/**` route renders inside `CairnAdminShell`
  (`examples/showcase/src/routes/admin/+layout.svelte:3-8`). The login and confirm views render as
  children of `CairnAdmin` (`src/lib/admin/CairnAdmin.svelte:77-82`) inside that shell.
  - Task 8 puts the meta in `CairnAdminShell`, `LoginPage`, and `ConfirmPage`. The login and confirm
    documents would then carry two metas.
  - The acceptance "renders each of the three documents and asserts exactly one" renders components
    in isolation. Each passes while the real document carries two.
  - Task 9's mutation "cairn's meta stripped" must then strip both metas. Stripping one leaves the
    other, so the red run never appears, or the implementer strips only one and reports a misleading
    result.
- **Fold:**
  - Pick one home. Use the shell if the documented wiring always mounts it (it covers custom admin
    routes such as `/admin/signups` too). Otherwise use the two auth pages plus the shell for the
    authed views, with the shell suppressing its meta on those views.
  - Add a document-level assertion: an e2e check that `head meta[name="referrer"]` counts exactly 1
    on the login, confirm, and edit documents.
  - Task 9's mutation strips every cairn referrer meta, and the report quotes the count before and
    after.

### PC3 (major): the "committed `wrangler types` Env" does not exist, and its contents depend on unnamed fixture state

- **Location:** plan:628-643 (Task 11 Files), plan:662-664, plan:673, plan:699-700.
- **Defect:** `git ls-files examples/showcase templates/waymark` lists only `src/app.d.ts`. There is
  no `worker-configuration.d.ts`.
  - Task 11's Files list neither the new showcase file nor the Waymark one.
  - The generated `Env` depends on the state at generation time. `wrangler types` emits `.dev.vars`
    keys and omits secrets that are absent from it, such as `GITHUB_APP_PRIVATE_KEY_B64`, which
    `CairnPlatformBindings` requires (`src/lib/sveltekit/platform-bindings.ts:34-48`). The
    `satisfies` test therefore passes or fails depending on whether a `.dev.vars` exists. Task 5's
    generated `.dev.vars` would also add `CAIRN_DEV_BACKEND` to the committed type.
  - A committed type that has gone stale makes the type test vacuous.
  - `MEMBER_DB` sits inside `cairn-template:exclude` markers in `wrangler.jsonc`. A generated `.d.ts`
    carries no markers, so emit would ship `MEMBER_DB` in Waymark's `Env`.
- **Fold:**
  - Task 11 Files add `examples/showcase/worker-configuration.d.ts` and Waymark's counterpart.
  - Name the generation input: which env file, for example `.dev.vars.example` through
    `--env-file`, or a declared secrets list.
  - Add a freshness gate. `wrangler types --check` exists in wrangler 4 (confirmed with `--help`).
  - State how the template's `Env` excludes `MEMBER_DB`: emit regenerates it, or the showcase
    generates it from the template-shaped config.
  - Mutation proof: deleting a required member from a copy of the generated `Env` turns
    `npm run check` red, quoted.

### PC4 (major): the Task 5 and Task 6 grep post-conditions contradict Decision 3 and cannot pass

- **Location:** plan:419-420 (Task 5), plan:445-455 (Task 6), plan:141-145 (Decision 3).
- **Defect:** Decision 3 keeps the `preview` script name, repointed at `wrangler dev`, and Task 6's
  outcome allows callers to go "through the repointed `preview` script".
  - Both greps match `run preview`, so they print legitimate callers. Hits at HEAD include
    `norms.yml:55,94`, `docs/internal/design/README.md:21`, and
    `docs/reference/cairn-audit.md:348,693` (a gated reference page outside the exclusions). They
    also include `examples/showcase/src/content/posts/2026-04-05-the-reading-surface.md:89` and its
    Waymark copy (site content), and
    `packages/create-cairn-site/test/fixtures/transcripts/01d-resume.txt:629` (an `sv create`
    transcript fixture).
  - Task 6's pattern `'preview'` widens the match set further.
  - The result is a forced re-dispatch, or edits to content and fixtures that should not move.
  - Task 5's grep forbids `npm run preview` in `playwright.config.ts`, the natural form under
    Decision 3.
- **Fold:** grep for `vite preview` only, excluding records and comments that quote a past
  measurement. Add a direct check that the `preview` script's value in `examples/showcase/package.json`
  and `templates/waymark/package.json` names `wrangler dev`. Drop `run preview` and `'preview'` from
  both patterns.

### PC5 (major): the 80 percent trigger can produce the forbidden split after S3

- **Location:** plan:31-37 (ceiling), plan:54-57 (split rule).
- **Defect:** at 80 percent the conductor "asks one combined question at the next segment boundary".
  - If spend crosses 9.6M during S3, the next boundary is S3's end, exactly where the spec forbids a
    cut.
  - The split rule says the conductor weighs a split only at S2 and "never earlier". It never says
    what happens when pressure arrives after S2.
- **Fold:** add one sentence. Past the S2 boundary, ceiling pressure raises a budget question but
  never a split before S4's green commit; S3 never merges to `main` alone. Also say whether a split
  after S4 is allowed. The spec forbids only S3. After S4 the CSRF handover and the Kit 3 peer are
  together, and the S5 work is scaffold and docs.

### PC6 (major): the Task 11 prerender proof names no build, and the default build never mounts the dev handles

- **Location:** plan:688-691 (Task 11 "Building"), plan:351-353 (Task 3 count), plan:174-178
  (Review focus 1).
- **Defect:** `examples/showcase/src/hooks.server.ts:19-32` mounts `devBackendHandle` and
  `membersDevHandle` only when `__CAIRN_DEV_BUILD__ && devBackendOptIn()`. That needs
  `VITE_CAIRN_E2E=1` and `CAIRN_DEV_BACKEND=1` in the build process's environment; the e2e webServer
  passes the latter through `env` (`playwright.config.ts:35-39`).
  - The default build prerenders behind `createAuthGuard`, not the dev handles.
  - "The showcase build prerenders behind `devBackendHandle`" is therefore true only of the flagged
    build. A default-build count passes while proving nothing about the dev handles' `building`
    gates.
  - Task 3's single count does not say which build it measured, so the "equal to Task 3's"
    comparison may be across builds.
- **Fold:**
  - Task 3 records two counts: the default build and the flagged build (`VITE_CAIRN_E2E=1
    CAIRN_DEV_BACKEND=1`).
  - Task 11 quotes both, each equal to its Task 3 counterpart. The default build proves the guard
    tripwire under prerender; the flagged build proves the dev handles.

### PC7 (major): the `auth-data` mutation mandate is unmet in Task 5 and unquoted in Task 11

- **Location:** plan:416-428 (Task 5), plan:680-708 (Task 11).
- **Defect:** pass-core's `auth-data` row requires "test-first, a mutation proof".
  - Task 5 is `auth-data` and has no mutation proof.
  - Task 11 says each test "fails if" its guard is removed, but never requires the red run quoted.
    The reviewer cannot confirm that any of those claims was observed.
  - Tasks 8 and 9 both demand quoted red runs, so the omission in 11 reads as accidental.
- **Fold:**
  - Task 5: with `/test/reset-members` made a no-op, the reset spec goes red (quoted).
  - Task 11's report quotes one red run per claim:
    - a `building` guard removed, per site (the tripwire and each dev handle);
    - spread replaced by replace in a dev handle;
    - the inline `waitUntil` branch restored;
    - a required member removed for the type test (PC3);
    - the redirect allowlist dropped.

### PC8 (major): the Task 11 import-graph check can pass on an empty walk

- **Location:** plan:686-687.
- **Defect:** "fails today's tree only if the module is mis-imported" accepts a check that has
  never seen `workers-env`. A walker that misses a module still passes on every tree, and the module
  the constraint protects is never proven reachable to it. Misses include `export * from`, dynamic
  `import()`, a hashed chunk name, or a wrong `exports` key.
- **Fold:** add a positive control. The walk from the `/sveltekit` entry (or a Worker-context entry)
  must reach `workers-env`, and the check fails if it does not. The report quotes the reached-module
  count per entry, so an entry that resolves zero modules shows as zero, not as a pass.

### PC9 (major): the doctor check names no report for empty, absent, unmigrated, or unreadable config

- **Location:** plan:597-601 (Task 10 acceptance).
- **Defect:** the fixtures cover `'*'`, a real origin, no `csrf` key, and a commented `'*'`. They
  leave out the states a heuristic reader meets in the field:
  - `trustedOrigins: []`;
  - a value it cannot read statically (`trustedOrigins: origins`, a spread, an env-derived list),
    where a misread `'*'` is a false pass on the one condition the check exists for;
  - no `vite.config.*` at all;
  - an unparseable config;
  - a site still on `svelte.config.js` carrying `checkOrigin: false`. This is the exact population
    the `Consumers must:` line sends to the v2 doctor. Under "no `csrf` key passes" it gets a silent
    pass.
- **Fold:** add one fixture row per state to the table, each naming its report: pass, pass with
  detail, warning, or "could not read: inconclusive". At minimum the unreadable value must not pass
  silently. The `svelte.config.js` case should report something, even a detail pointing at the
  config move.

### PC10 (minor): Task 2's response criterion rests on recalled behavior and requires a call site that does not exist

- **Location:** plan:313-317.
- **Defect:** `git grep` finds no `text` import from `@sveltejs/kit` anywhere in the three trees. The
  only `json` imports are seven showcase routes (`healthz` plus six `/test/*`).
  - The required "one text" test has nothing to test.
  - The stated risk ("`new Response(string)`'s default replaced a header the old helper set") was
    not read from source. Kit 2.70.3's `json()` (`exports/index.js:138`) sets
    `content-type: application/json`, which `Response.json` also sets.
- **Fold:** drop the text test and the per-call-site header table. Keep one assertion that
  `/healthz` returns `application/json` with its old status.

### PC11 (minor): the cross-origin pair must assert Kit's literal, because the factory also returns 403

- **Location:** plan:535-538.
- **Defect:** the members request action runs `assertOriginAndScheme`
  (`src/lib/auth-channel/factory.ts:72-74`), which throws `403 'cairn auth-channel: origin mismatch'`
  on the same cross-origin submission.
  - With Kit's check off (`trustedOrigins: ['*']`), the pair still sees a 403. A status-only
    assertion would pass vacuously.
  - The plan's "with Kit's body" is right but reads as optional.
  - "Passes" for the same-origin half is undefined.
- **Fold:**
  - The 403 half asserts the exact text `Cross-site POST form submissions are forbidden` (Kit 3
    `runtime/server/csrf.js` via `respond.js:125`) and not the factory's message.
  - The same-origin half asserts the members form's own success or validation state, never either
    403 body.

### PC12 (minor): the Admin Save case cannot fail on Task 8's work

- **Location:** plan:539.
- **Defect:** the e2e build mounts `devBackendHandle` in place of the guard, so `applySecurityHeaders`
  never runs and the admin documents carry no `Referrer-Policy` header. The browser default
  (`strict-origin-when-cross-origin`) sends the real Origin with or without Task 8. The case proves
  only that Kit admits a same-origin admin form, which is a regression pin. The real proofs are the
  rewritten-document test and the close's live smoke.
- **Fold:** label it a regression case in the acceptance, so no reviewer counts it as evidence for
  the header or the meta.

### PC13 (minor): Task 12's grep hits a legitimate test, misses two spec terms, and the class override is undeclared

- **Location:** plan:729, plan:745-746.
- **Defect:**
  - The pattern matches `packages/create-cairn-site/scripts/emit-template-dir.test.mjs:143`, which
    uses `svelte.config.js` as a linkcheck fixture filename outside any `fixtures/` directory.
  - The spec's S4 grep names `$lib` and `platform` for the scaffold, and neither Task 11 (whose grep
    omits `packages/create-cairn-site`) nor Task 12 carries them.
  - `engine-logic` runs the full gate per the class table; Task 12 runs S.
- **Fold:** exclude that test file by path. Add `\$lib\b` and `\.platform\b` to Task 12's grep.
  State the class override explicitly: `engine-logic` with gate S, because no engine source moves.

### PC14 (minor): the deprecation-warning grep passes on an empty or failed build log

- **Location:** plan:701-703.
- **Fold:** require build exit 0 and quote a line every successful build prints (the adapter's
  "Using @sveltejs/adapter-cloudflare" banner, or the prerender summary) next to the empty grep.

### PC15 (minor): the harness's `GET /admin/login` 200 accepts any page

- **Location:** plan:265-268, plan:841-842.
- **Fold:** also assert a cairn login marker in the body (the email field name, or the CSRF hidden
  input), so a site route or an error page served with 200 cannot pass.

### PC16 (minor): the live smoke's Save names no fixture state

- **Location:** plan:847-853.
- **Defect:** with the dev backend off, a Save commits through the real GitHub App to a
  `cairn/<concept>/<id>` branch. The step names neither the credential source, the target repository,
  nor cleanup of the branch it creates. Ruling 1 says "no provisioning", and the step relies on
  credentials already on the workstation.
- **Fold:** name the credential source (`docs/internal/credentials.md`, delivered through
  `.dev.vars`), the repository the showcase config targets, and the branch deletion afterward.

### PC17 (minor): small Interfaces and mapping gaps

- **Component stubs.** Task 2 Files omit the component project's own `$app/environment` stubs. The
  header of `src/tests/_app-environment.ts` places them under `src/tests/component/`. Task 2's grep
  also excludes `src/tests` and `vitest.config.ts`, so a stale alias key survives. Fold: add both to
  the grep.
- **`env` typing.** Task 11's Interfaces type `env` as `CairnPlatformBindings` and say site bindings
  such as the media bucket are "read by name from the same object". `MEDIA_BUCKET` lives on
  `CairnMediaBindings` (`platform-bindings.ts:55-58`), not on `CairnPlatformBindings`. Fold: name
  the type, for example `CairnPlatformBindings & Partial<CairnMediaBindings>`, or say how a site
  binding is read.
- **Reference snippet.** Task 13 should source the `CairnPlatformBindings` reference snippet from the
  type test, per the spec's public-surface table.

## Over-ceremony, ranked by cost

- **OC1: Task 6 runs F**, the whole showcase e2e plus `admin-visual`, for edits to CI workflows, lab
  scripts, and a docs line, with no engine or showcase runtime change (Task 5 repoints the script).
  The two quoted runs it already requires (theme fixture, `norms:check`) are the real proof. Gate:
  the two runs plus `npm run check` and `check:comments`, light lane. This saves one full gate run.
- **OC2: Task 2's per-call-site header table and its text-helper test** (PC10). Seven identical
  `json` sites need one assertion.
- **OC3: Task 9 runs the same browser observation twice.** The stale-tab browser case (null Origin,
  Kit's literal) is the same observation as the site-wide test's mutation (cairn's meta stripped
  under `no-referrer`). Fold them into one test that asserts the literal body.
- **OC4: Task 1's fresh-agent re-run** of the harness. Task 11 re-runs it against its own tarballs,
  and the close runs it again. Keep it only if the spike agent's environment is suspect; otherwise
  Task 11's run is the reproduction check.
- **OC5: the S5 pre-flight overlaps Task 13's own keyword re-grep** of the facts candidate set.
  Either can go; keep the in-task grep.

## Class fit

- Tasks 8, 9, and 11 are correctly `auth-data`.
- Task 5's `auth-data` is defensible because it moves the privileged flag's delivery channel, but it
  must then carry the mutation proof (PC7).
- Task 2 is closer to `sweep`: only `$app/env`, `refreshAll`, and seven `Response.json` sites move,
  and no header changes. Its F gate is harmless, but its test-first demand is ceremony. Optional.
- Task 10 (`tool` plus the light TypeScript check) and Task 13 (`docs`, gate D) fit.
