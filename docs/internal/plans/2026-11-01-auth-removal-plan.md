# Auth removal: task plan

Pass 1a, slug `auth-removal`, class `auth-data` plus `runner`. Initiative: `shared-standards`. Base:
`d71e4401e`, then `dcd12eaa6` (the sweep verdicts). Design note:
`docs/internal/plans/2026-11-01-auth-removal-design.md`. Sources: `design-audit/run-sheet.md` "Pass
1a", `design-audit/design.md` "1a. Auth removal", ledger.md "## Rulings".

Path: 420 minutes against a design estimate of 240 and a ceiling of 480, with each pair at its larger
estimate (60, 120, 50, 60, 15, 40, 75). The tasks sum to 490 run one at a time. No cut is needed.

## Pre-flight

Every task was read for owner steps and auto-mode gaps.

- **Geoff's steps:** none. No sign-in, secret, dialog, browser action, or permission rule.
- **Conductor's hold, before launch:** the e2e flake in the ledger's `## Conductor state` is fixed or
  filed with evidence before this executor starts. The executor does nothing about it.
- **Auto-mode writes** under workstation#192's line. A refusal is a stop, never a thing to route around.
  - T3: `claude/CLAUDE.md`, `.claude/skills/cairn-writing-docs/evals/**` (deletes),
    `.claude/skills/cairn-writing-docs/references/docs-register.md`,
    `.claude/skills/cairn-running-passes/references/pass-gate-tiers.md`, and through
    `npm run emit:template` the tree `templates/waymark/.claude/**`.
  - T4: `.claude/skills/cairn-running-passes/SKILL.md`,
    `.claude/skills/cairn-running-passes/references/admin-smoke-test.md`,
    `.claude/skills/cairn-writing-engine-code/references/durable-gotchas.md`.
  - **Outside the line's text:** T3's `claude/agents/cairn-extension-reviewer.md` and its generated
    copy `templates/waymark/.claude/agents/cairn-extension-reviewer.md`. The line names `CLAUDE.md`,
    `.claude/skills/`, and `.claude/rules/`. Neither file is a live agent definition, since the first is
    packaged content and the second is template output. The conductor's pre-launch write check
    exercises both paths. A refusal during the run takes the standing answer below.
- **`wrangler d1 --local`, stopping the session's own `wrangler dev`, and running
  `~/.local/state/cairn-agent-first/smoke-pass3.mjs`, a script outside the worktree:** T9, under the same
  change.
- **`e2e.yml`'s `update_snapshots` dispatch on the branch:** only if a CI visual diff calls for it, per the
  sheet.
- **Live accounts:** none beyond pushing the pass branch, its draft PR, and that dispatch. Nothing touches
  `--remote` or a deployed Worker.

## Backlog sweep

Scoped sweep at `d71e4401e`, landed in `dcd12eaa6`. A full sweep isn't due: 12 of 67 open items lack a
stamp, under the 15 line, and the sheet runs one at pass 8's close.

| Item | Verdict | Reason |
|---|---|---|
| #189 | fold | T1. Tagged Pass 1a, and the pass rewrites that section. |
| #203 | fold, token half | T2. `signing.ts:85-99` is in the pass's files. The `packages/` half stays, by Geoff's ruling. T8 rewords the item to what is left. |
| #167 | fold | T3. `src/lib/auth-channel/**` leaves, and the option with it. Moves to Done at T8. |
| #96 | done | `106561156` rewrote the comment. Moved to Done in `dcd12eaa6`. |
| #136 | reword | Still real. Its log-events citation pointed at a retired page. |
| #198 | reword | The entry is confirmed removable, in lines this pass doesn't touch. |
| #24, #70, #116, #159, #182, #187, #196 | keep | Each names a pass file in lines the pass doesn't rewrite. #159, #70, and #196 are stamped on pass 1b's branch, so this branch leaves those lines alone. |

## Stops and standing answers

The sheet's standing answers apply to every task. These are this pass's.

- **Plan over 480:** cut T6's `LoginRequestOutcome` half, then T7. Those two may be set aside. #189, E2,
  E11, `bootstrapOwner`, #203, the eval and auth-data map clean-up, and the smoke addition may not.
- **#189 lands first.** T3 does not start until T1 is committed on the pass branch.
- **Smoke:** the one known FAIL counts as a pass with a note, and T4 documents it. It is known only if it
  is the "same link is refused a second time" step, its URL ends `?error=no-pending-request`, and the next
  step, "that second context holds no session", is PASS. A failure traced to setup (seed, migration, port,
  stale build) is fixed and rerun once. Any other failure stops the line.
- **Security read:** an `escalate` verdict stops the line. An open High finding is not "no open finding":
  it goes to `cairn-cms-9b` for Geoff, and nothing merges. A `fix` is folded and reread.
- **`admin-signups` baselines:** they stay. A CI visual diff there regenerates through `e2e.yml`'s
  `update_snapshots` on the branch, per the sheet, and is listed.
- **Stale transcript blocks** stay for the recapture, per the sheet.
- **A test outside this plan fails on removed code:** it pins old behavior, so change it and list it
  under `## Decisions`. A test that only exercises a removed export leaves with the export. This is not
  R6's retirement list, which waits for Geoff.
- **`docs/internal/engine-rulings.md`:** leave it. Pass 1b writes every reversed ruling. If a task
  finds a ruling only this pass can word, write it and say so in `## Decisions`.
- **Overlap with 1b:** the ledger orders 1b first, and 1b's plan carries a "Pass 1a merges first" branch,
  so plan on merging `main` either way. Files both plans edit, by 1b's plan at `28c484784`:
  - Regenerate, never hand-merge: `scripts/checks/api-surface.md`, `templates/waymark/**`.
  - Keep both sides: `CHANGELOG.md` and `MIGRATION-NOTES.md` (`## Unreleased`), `BACKLOG.md`,
    `scripts/checks/check-symbols-allowlist.mjs`.
  - Different hunks, so keep both: `package.json` (1b's scripts, this pass's `exports` and `files`),
    `claude/CLAUDE.md` (`:33-34` and `:25-26`), `examples/showcase/.cairn-template.json`,
    `src/tests/unit/check-symbols.test.ts`, `scripts/checks/check-package-files.mjs` and its test,
    `.claude/skills/cairn-writing-engine-code/references/durable-gotchas.md` (`:194,204` and `:255` on).
  - `scripts/checks/gate-table.json`: the run sheet names it, and 1b's plan text does not. Keep both if
    it moved.

  When `origin/main` has moved, run in order: `git merge origin/main`, then `npm run package`, then
  `npm run emit:template`, then `npm run check:surface -- --update`, then
  `npm run lane:fast -- --range <base>..HEAD`, with `<base>` moved to the merge commit.
- **A pair merge conflicts:** the pairs are disjoint, so a conflict means a task left its file list.
  Resolve toward the plan and rerun the fast lane.
- **An auto-mode refusal on `claude/agents/cairn-extension-reviewer.md` or its template copy:** finish
  everything else, record the owed one-line edit in `docs/STATUS.md`, and list the file's T3 search hits in
  the PR's `## Decisions`. `cairn-cms-9b` lands the edit. Any other refusal stops the line.
- **Run bar unreachable:** if green CI, the security read, or the smoke can't be met, the docs and
  changelog tasks finish, nothing merges, and `docs/STATUS.md` reports the bar unmet.
- **May be escalated to `cairn-cms-9b`:** an `escalate` verdict, an open High, a smoke failure that isn't
  setup, a cause that can't be traced or that returns after one structural fix, and a refusal other than
  the one above. T6's `LoginRequestOutcome` half and T7 may be set aside instead of holding the line.
  Nothing else may.
- **Questions:** none is expected. A stop goes to `docs/STATUS.md` for `cairn-cms-9b`, per the prompt.

## Tasks

Order: pair T1 and T2, then pair T3 and T4, then T5, T6, T7, T8, T9. Run the fast lane after each task.
Every `auth-data` task gets `standards:diff-reviewer` on its commit while the line moves, and a `fix` or
`escalate` verdict stops the line. Keep T3 ahead of T5: both edit `package.json` `exports` and
`api-surface.md`, so they never pair.

- Open the draft PR after the first pair lands. Each accepted-task report names its head, its lane
  verdict, its review verdict, and the CI verdict on that head.
- `npm run emit:template` reads `dist`: `bake-template.mjs:227` throws "Run \"npm run package\" first."
  Run `npm run package` before every emit, and before `scripts/build/emit-tool-conditions.mjs`, which reads
  `dist/diagnostics/conditions.js`.
- A failing test written first has its red line pasted in the commit body.
- Line numbers are at `dcd12eaa6`. Where an earlier task moves a file, find the line by its quoted text.

### T1. Finish the recipe, #189 (40 min, ordinary, `model: opus`)

**Outcome:** `second-sign-in-group.md`'s roll-your-own section stands alone, and the skills state one
hook order. The Channel section stays until T3.

**Files:** `skills/cairn-extending-a-site/references/second-sign-in-group.md`,
`skills/cairn-building-admin-screens/references/custom-screen.md`, and through
`npm run emit:template` their copies under `templates/waymark/.claude/skills/`.

The section at `:85` opens: "`@glw907/cairn-cms/auth-crypto` supplies stateless primitives only". Add
these to its list, each grounded in what the engine does at the cited line:

- A fresh session id from `generateToken` at login, never one the visitor presented (fixation).
  `auth-routes.ts:387`: `const id = generateSessionId();`. `/auth-crypto` doesn't export that name, and its
  barrel says the body is byte-identical to `generateToken`.
- The session cookie's attributes: HttpOnly, Secure, SameSite=Lax, a `Max-Age`, and a `__Host-` name on
  HTTPS through `buildCookieName`. `auth-routes.ts:398-405`. The CSRF cookie takes `__Host-` too.
- Logout deletes the server-side row, not only the cookie. `auth-routes.ts:488`:
  `const deleted = await deleteSession(db, id);`.
- One response for an unknown contact, byte-identical to a sent one in its body and its `Set-Cookie`.
  `auth-routes.ts:230`: `if (!editor) return { outcome: 'sent', sent: true };`. `:210-211`: "A cookie
  emitted only on the editor path would be a one-request allowlist oracle".

Then carry over the Channel section's facts that hold for any second store, so T3 can delete it
whole: a separate D1 binding with its own `migrations_dir`, never `AUTH_DB`'s (`:49-51`); a cookie name
that never starts with `cairn_` (`:68`); a bot challenge through `verifyTurnstile` with `hostname`,
`action`, and `ip` (`:66-67`); for a short code, a ten-minute expiry and an attempt cap (`:83`);
`prerender = false` on login and member routes, since a prerendered member page ships to everyone
(`:69,72`); ending a removed person's sessions at removal (`:74-75`); normalizing the contact the same way
on every path (`:65`); and never setting `locals.cairnEditor` (`:21`). That last one matters more after
this task: `requireSession` trusts the value at `guard.ts:459`, and the guard writes it only on guarded
admin paths, so a value a site handle sets survives on every other path.

Settle the hook order. `guard.ts:182` reads "A site that has a hook sequences the guard last", and
`admin-mount.md:110-111` agrees. `custom-screen.md:171-172` reads: "compose it after the guard in the
production branch: `handle = sequence(createAuthGuard({ runtime }), wireAuditSink)`." Change it to
compose the sink before the guard: `handle = sequence(wireAuditSink, createAuthGuard({ runtime }))`. The
sink can run first because `guard.ts` never reads `cairnAuditSink`; `admin-action.ts:310` does.

Use the acceptance's words in the bullets, so the search means what it says.

**Acceptance:** this prints nothing, and T3 reruns it:

```sh
f=skills/cairn-extending-a-site/references/second-sign-in-group.md
for t in fresh generateToken HttpOnly SameSite Max-Age __Host- 'server-side row' byte-identical Set-Cookie migrations_dir cairn_ verifyTurnstile attempt prerender normaliz locals.cairnEditor removal; do sed -n '/^## Rolling your own/,/^## Server-only/p' "$f" | grep -qi -- "$t" || echo "missing: $t"; done
```

`git grep -n 'sequence(createAuthGuard' -- skills claude docs/admin docs/editors` finds only a guard with
no handle after it, and `git grep -q 'sequence(wireAuditSink, createAuthGuard' --
skills/cairn-building-admin-screens/references/custom-screen.md` exits 0. `npm run check:template` passes.

**Test:** none; skill prose. `check:public-skill` and `check:snippets` run through the lane.

### T2. Scope the installation token, #203 (60 min, `auth-data`)

**Outcome:** every token the engine mints reaches one repository with `contents: write`, and
`/healthz?live=1` reports a mint GitHub refuses as a bad request, with a recovery path that doesn't send
the owner to replace the key.

**Files:** `src/lib/github/{types,credentials,signing}.ts`, `src/lib/sveltekit/health.ts`,
`src/lib/log/events.ts`, `skills/cairn-extending-a-site/references/log-events.md` and its template copy,
`docs/admin/rotate-the-github-app-key.md`,
`src/tests/unit/{github-signing,github-token-cache,health-live-check,github-credentials}.test.ts`, and any
other credentials literal `npm run check` flags for the missing `repo`.

Write the failing tests first, and run them red:

- `installationToken` POSTs `{"repositories":["<repo>"],"permissions":{"contents":"write"}}` with
  `Content-Type: application/json`. `github-signing.test.ts:73` already reads the URL.
- The cache holds separate tokens for two repositories on one installation.
- `classifyMintFailure` reads 422 as `token_request_refused`, added to the table at
  `health-live-check.test.ts:96-99`. It reads `unreachable` on the base.
- Two repositories get separate verdicts: 201 for one and 422 for the other, inside the verdict window,
  asserting two fetches and two different results. Equal statuses would pass on the base.

Then change the code:

- `types.ts:49`: `AppCredentials` gains `repo: string`, with a doc comment.
- `credentials.ts:15-17,24`: `identity: { appId: string; installationId: string }` gains `repo`, and
  the return carries it. `backend.ts:200` already passes `config`, which has it.
- `signing.ts:87-96`: add the header and the body. The body's comment says why contents alone is enough
  and cites no line numbers.
- `signing.ts:132,135`: key the cache on both, not `creds.installationId` alone.
- `health.ts:84`: add 422, and update "anything that is not a 401, 403, or 404" at `:80`. `:133`: add
  `creds.repo` to the key. `runHealthChecks`'s literal at `:228` passes `repo: provider.repo`. Update the
  mint comment at `:30-36` for the new `detail`.
- `events.ts:119-123`: add `'token_request_refused'` to `GithubTokenCheckReason` and its doc comment, which
  says GitHub refused the mint's request (a 422), not the key.
- `log-events.md:162`: add `token_request_refused` (422) to the `health` list, with its causes.
- `rotate-the-github-app-key.md`: line 74 sends a failing `/healthz?live=1` to Recover, and Recover's step 3
  sends any `<status>` to a rollback or a third key. Add a step ahead of it, and narrow it to a status other
  than 422. The new step covers a `detail` of `token_request_refused` and a `github.unreachable` record
  carrying `GitHub installation token failed: 422`. It says the key is not at fault and not to replace it,
  then has the owner compare the adapter's `repo` with the repository's current name, confirm the App's
  installation includes that repository, and confirm the App holds Contents read and write. A plain
  `/healthz` stays `ok: true` here, since that check never mints. Load `cairn-writing-docs` case A. Search
  `docs/admin`, `docs/editors`, and `skills/` for `installation`, and confirm `create-your-site.md:88` stays
  true.

**Acceptance:** the new tests fail on the base and pass after. `npm run check:docs-gate` passes. In
`rotate-the-github-app-key.md`, no step that covers a 422 links to `#roll-back-to-the-old-key` or
`#generate-a-third-key`.

**Test:** the four above.

### T3. Remove `/auth-channel`, E2 (120 min, `auth-data` plus `runner`)

**Outcome:** no `/auth-channel`, no members fixture, and no reference to either in shipped code, skills,
or docs. Runs after T1.

First, after the setup command and `npm run package`, run the acceptance's `node -e` import, and put its
result in the commit body: the base must not answer `ERR_PACKAGE_PATH_NOT_EXPORTED`.

**Delete:**

- `src/lib/auth-channel/`, `migrations-channel/`.
- `src/tests/integration/_channel-harness.ts`, `src/tests/integration/auth-channel-*.test.ts` (five),
  `src/tests/unit/auth-channel-*.test.ts` (seven).
- `packages/cairn-cms-dev/src/channel-db.ts`, `channel-db.test.ts`.
- `.claude/skills/cairn-writing-docs/evals/site-cases/s03-second-sign-in-group.json`,
  `evals/setups/site/s03-second-sign-in-group.mjs`, `s03-second-sign-in-group-bad.mjs`.
- Showcase: `e2e/members.spec.ts`, `e2e/capture-transport.spec.ts`, `migrations-members/`, `src/members/`,
  `src/routes/members/`, `src/routes/test/{last-otp,reset-members,revoke-member-session}/`. A spec that
  can't resolve its import fails the whole Playwright run, and the transport is that spec's only subject.

**Edit engine and packaging:**

- `package.json:163-166` (`"./auth-channel"`) and `:204` (`"migrations-channel"`).
- `src/lib/sveltekit/csrf.ts:91`: delete `originMatches`, and its block at `src/tests/unit/csrf.test.ts:80-90`.
  `:2`: "the auth channel's" Origin compare goes from the header comment.
- `src/lib/dev-flag.ts:84`: delete `isDeployedHost` and its doc comment. `auth-channel/factory.ts:123` is its
  only production reader. Fix what names it at `dev-flag.ts:39,58` and `csrf.ts:31`. `isLocalHost` and
  `readPublicOrigin` stay.
- `src/lib/log/events.ts:92-107`: the 13 `auth.channel.*` events and their comment, so the union ends at
  `'audit.sink.write_failed'`. `:8`: its worked example becomes a surviving event of the same shape.
  `src/lib/log/events-list.ts:84-96`: the same 13, since `create.test.ts:219` holds the list and the
  union in step. `tool/internal/logs/events.go:78-90`: the same 13, pinned by
  `TestEventVocabularyMatchesEngine`. `log-events.md`: the `## Auth channel` section and its contents line
  `:20`.
- `src/lib/diagnostics/conditions.ts`: the channel clauses at `:38` ("and a member action throws a 403"),
  `:98` ("and member actions keep their origin compare" and the `resolveSubject` sentence), `:182`, `:183`
  ("every createAuthChannel action"). Update `conditions.test.ts:189`, which matches
  `/createAuthChannel/`. Run `npm run package`, then regenerate `tool/internal/spine/conditions.json` with
  `scripts/build/emit-tool-conditions.mjs`.
- `tool/internal/doctor/check_referrer.go:42,172`, `tool/testdata/copy.golden.md:355`, and
  `tool/internal/doctor/testdata/golden/one-warning-failure.txt:14`, which holds the `conditions.ts:98`
  sentence. Add a `tool/CHANGELOG.md` `## Unreleased` line for the doctor copy. Load
  `standards:go-conventions`. Run `make -C tool check`.
- Comments: `src/lib/cloudflare/rate-limit.ts:11`, `src/lib/dev-flag.ts:3-13,23` (three readers become two,
  and the two refusals' note goes), `src/lib/sveltekit/guard.ts:252-255`,
  `src/tests/unit/peer-deps.test.ts:41`, `packages/cairn-cms-dev/src/repository-backend.ts:28`,
  `scripts/build/emit-template.mjs:170`.
- `packages/cairn-cms-dev/src/index.ts:8-9`. `scripts/checks/dev-fold-markers.txt:12` and
  `dev-fold-markers.test.ts:36,50`.
- `wrangler.test.jsonc`'s `CHANNEL_DB` block and `src/tests/cloudflare-test.d.ts:15-17`.
- `src/tests/unit/worker-wait-until.test.ts`: cut the channel `describe` at `:26` and its imports, keep the
  `createD1AuditSink` block at `:69`, and reword the header.
- `packages/create-cairn-site/src/cloudflare/config.test.mjs:11`: the comment names a block the marker strip
  no longer removes.

**Edit `runner`:**

- `scripts/checks/check-options.mjs:11`, and the count above it: "30 pairs, 27 distinct exports" becomes
  29 pairs, 26 distinct.
- `scripts/checks/check-package-files.mjs:37-65,456` (`checkChannelMigrationPacked` and its call), and
  its block at `check-package-files.test.ts:7,48-70`.
- `scripts/checks/check-self-use.mjs:31,51`: drop both `auth-channel` and `auth-store` in one edit, since T5
  won't touch this file. `check-self-use.test.ts:26`.
- `scripts/checks/check-leaks.mjs:216,497` and `check-leaks.test.ts:88`.
- `src/tests/unit/check-symbols.test.ts:316`: swap in `createFakeR2`, a surviving dev export, so the `-dev`
  case holds.
- `scripts/checks/check-symbols-allowlist.mjs`: add a `file-path:` row with a reason for
  `node_modules/@glw907/cairn-cms/migrations-channel/0000_channel.sql`. `MIGRATION-NOTES.md:517` cites it,
  and `pathExists` strips the prefix and looks for a repo path this task deletes.
- `scripts/checks/check-self-use-allowlist.json:8,9,17,18,19,25`.
- `scripts/checks/check-surface-reexports.json:54-65`.
- `scripts/checks/gate-table.json:29,185,232,273`, `src/tests/unit/gate-tier.test.ts:64`, and
  `.claude/skills/cairn-running-passes/references/pass-gate-tiers.md:79`.
- `npm run check:surface -- --update`.

**Edit the showcase:**

- `wrangler.jsonc`: the `MEMBER_DB` block and its exclude markers. `worker-configuration.d.ts:7`.
- `playwright.config.ts:47` (`'npx wrangler d1 migrations apply MEMBER_DB --local',`) and the sentence
  at `:36-37`.
- `e2e/csrf-origin.spec.ts:10-40`: `gate-table.json:109` puts this spec on the `authData` list, and its
  first two tests are the proof that a cross-host form POST gets Kit's exact refusal, so retarget them,
  never drop them. They load `/admin/login`, fill `input[name="email"]` as the same file's `signIn` helper
  does, and post to `?/request` on the other host. The first still asserts 403 and
  `KIT_CROSS_SITE_BODY`, which stops it passing vacuously. The second asserts 200 and not that body, in
  place of the `'A code was sent.'` line. Rewrite the comment at `:10-13`, and delete
  `FACTORY_ORIGIN_FRAGMENT` (`csrf-helpers.ts:14-15`) and its two assertions, since no cairn origin refusal
  remains.
- `README.md:28` and `scripts/capture-surfaces.mjs:7,295`.
- `.cairn-template.json`: drop `"src/members"`, `"src/routes/members"`, `"migrations-members"`, and add
  `"src/lib/log.ts"`.
- `src/lib/log.ts`: the union becomes `'admin.signups.misconfigured'` alone, with the markers gone.
- `src/routes/test/test-routes.test.ts`: the members routes go. Delete the file if nothing remains.
- `src/routes/+layout.server.ts:4,14`, and `src/chassis/README.md:194` ("the members pages are
  template-excluded fixtures").
- `src/chassis/tokens.css:21-22`: "The COMPONENT SET is scoped to what the public template genuinely
  renders" stops being true of `card`. Reword it so the set is what the template renders plus `card`.
  `:27-29`: "`card` stays enabled because this site's members fixture renders one (`routes/members`), a
  route the template excludes; a scaffolded site with no `.card` in its markup may exclude it too." Say
  instead that no route renders it now, that it stays so a scaffolded site's CSS doesn't change this pass,
  and that a site may exclude it. Keep the component enabled, and list it under `## Decisions`.
- `src/tests/unit/emit-template-tree.test.ts`: `rosterContacts()` at `:86-89` reads the deleted
  `src/members/channel.ts`, so delete it and `:111-112`. `:113`'s list becomes `'cairn-template:'`,
  `'probe-craft'`, and `'error-fixture'`, excluded routes that no file in `templates/waymark` names today.
  Reword the header at `:2` and the test's title. `:4` stays, a pinned permalink.
- `packages/create-cairn-site/scripts/emit-template-dir.test.mjs:82-87`: drop the `MEMBER_DB` assertion and
  its comment. `assert.match(env, /AUTH_DB: D1Database;/)` stays as the guard.
- `src/tests/unit/audit/fixtures/theme/stale-tokens.css:21-22` stays: `theme-conformance.test.ts:249` reads
  it as a frozen stale theme.
- `npm run package`, then `npm run emit:template`.

**Edit docs:**

- `SECURITY.md:26`, `docs/architecture.md:33,57`, `docs/why-cairn.md:20,24`.
- `claude/CLAUDE.md:25-26`, `claude/agents/cairn-extension-reviewer.md:19`.
- `skills/cairn-extending-a-site/SKILL.md:39`.
- `.claude/skills/cairn-writing-docs/references/docs-register.md:273`: "The people an auth channel signs in
  beside the editors" becomes "The people a site signs in beside the editors".
- `second-sign-in-group.md`: delete `## Channel path`, its contents line, and the `Choose` table's channel
  column, and rewrite `## Choose` for two mechanisms: a role, or a flow the site builds on `/auth-crypto`.

**Acceptance:** after the T3 and T4 pair merges, since `SKILL.md:30` and `durable-gotchas.md:259,539` are
T4's, this prints only the pinned permalinks at `emit-template-tree.test.ts:4` and
`dev-fold-markers.test.ts:3`:

```sh
git grep -n -E "createAuthChannel|auth-channel|AuthChannel|createChannelDb|migrations-channel|MEMBER_DB|CHANNEL_DB|originMatches|isDeployedHost|capture-transport|auth\.channel\.|auth channel|members fixture|src/members|routes/members|/members/|\.\./members|migrations-members" -- . ':!CHANGELOG.md' ':!MIGRATION-NOTES.md' ':!ROADMAP.md' ':!BACKLOG.md' ':!docs/internal/**' ':!scripts/checks/check-symbols-allowlist.mjs' ':!src/tests/unit/audit/fixtures/**'
```

`node -e "import('@glw907/cairn-cms/auth-channel')"` from the showcase fails with
`ERR_PACKAGE_PATH_NOT_EXPORTED`. T1's section search still prints nothing. `npm run check:template`,
`npm run check:package`, `npm run check:symbols`, `npm run check:tool-conditions`, and `make -C tool check`
pass.

**Test:** the import check, run on the base first. The suites that remain, and CI's `e2e`, prove the
showcase still builds.

### T4. Smoke prerequisites and repo skill clean-up (30 min, ordinary)

**Outcome:** `admin-smoke-test.md` runs from a clean worktree, and repo skills stop naming what T3 and T5
remove.

**Files:** `.claude/skills/cairn-running-passes/references/admin-smoke-test.md`,
`.claude/skills/cairn-running-passes/SKILL.md`,
`.claude/skills/cairn-writing-engine-code/references/durable-gotchas.md`.

- `admin-smoke-test.md`, "Prerequisites": "Running `wrangler dev` once applies the migration in
  `migrations/`." is not what the showcase does. Add a showcase path: from `examples/showcase`, after
  `npm run package` at the root and a plain `npm run build` (no `VITE_CAIRN_E2E`), run
  `npx wrangler d1 migrations apply AUTH_DB --local`, then seed two editors, an `owner` for the minted
  session and an `editor` for the magic-link request. A link request for an address with no row sends
  nothing, so the round trip needs that second row. Name the sole-owner mint id `smoke-owner`. Use T9
  step 5's commands, whose `INSERT OR REPLACE` lets the seed run twice on one local D1.
- Same file, procedure step 1: check the port first with `ss -ltn 'sport = :8787'`, since another session's
  worker on that port would answer for this one. Confirm the new server's log says `Ready`.
- Same file, procedure step 4: "`pkill -f workerd` clears them" kills other sessions' workers. Replace it
  with stopping only the PIDs this session started.
- Same file, procedure step 5: a second context that follows a spent link lands on
  `/admin/login?error=no-pending-request`. That is the correct refusal, and a check reading "not signed in"
  must allow it.
- `SKILL.md:30`: drop `auth-channel`, `auth-store`, and `` `**/members/login/**` `` from the `auth-data`
  map. Keep `` `**/admin/signups/**` ``.
- `durable-gotchas.md`: delete the "`node:sqlite` throws under workerd" section at `:255-261`, since
  `createChannelDb` was its case. `:489-492`: "`src/lib/auth/store.ts` is not the `/auth-store` entry
  point." Rewrite it on a subpath that stays, such as `src/lib/auth/crypto.ts` and `/auth-crypto`.
  `:539`: drop "or `src/lib/auth-channel/store.ts`".

**Acceptance:** `git grep -n -E "auth-channel|auth-store|createChannelDb|members/login" -- .claude/skills/cairn-running-passes .claude/skills/cairn-writing-engine-code`
prints nothing. `grep -c 'nodesqlite-throws' .claude/skills/cairn-writing-engine-code/references/durable-gotchas.md`
prints 0, so the index line at `:22` went with the section. `grep -c 'pkill' .claude/skills/cairn-running-passes/references/admin-smoke-test.md` prints 0.

**Test:** none; repo skills. T9 runs the procedure for real.

### T5. Remove `bootstrapOwner` and `/auth-store`, E11 (50 min, `auth-data` plus `runner`)

**Outcome:** the first owner is seeded by SQL or by `create-cairn-site`. No public editor-roster path.

**Files:** `src/lib/sveltekit/auth-routes.ts`, `src/lib/sveltekit/cairn-admin.ts`, `src/lib/auth/store.ts`,
`src/lib/auth-store/` (delete), `src/lib/index.ts`, `src/lib/auth-crypto/index.ts`,
`src/lib/log/{events,events-list}.ts`, `tool/internal/logs/events.go`, `package.json`, tests,
`scripts/checks/check-self-use-allowlist.json`, `api-surface.md`, skills,
`packages/create-cairn-site/src/cloudflare/bootstrap.mjs` (comments). Load `standards:go-conventions` for
`events.go`.

Write first, in `src/tests/integration/auth-request.test.ts`, in two stages, since the base already refuses
when no `bootstrapOwner` is set:

- Red: on the base, add one case that passes the matching `bootstrapOwner` to `createAuthRoutes`, with the
  matching email on an empty `editor` table, and asserts `countRows('editor') === 0` and an empty sink. It
  fails on the base with one row inserted and one message sent.
- Green: in the same commit, removing the option leaves that case on a plain config. It replaces the
  `bootstrapOwner` block at `:391-460`, including `:451`'s "never inserts" case, which it folds in.

- `auth-routes.ts:44-59`: the option. `:180-181`: the doc sentence. `:217-224`: the bootstrap block.
  `:25`: the `insertOwnerIfEmpty` import.
- `cairn-admin.ts:118`: drop the `bootstrapOwner` argument. `:99`: "auth send/bootstrap".
- `store.ts:539`: delete `insertOwnerIfEmpty` and its doc comment, and its tests at
  `auth-store.test.ts:230-255,478`. Remove any `fake-auth-db.ts` handler that matched only this statement.
- `auth-store-roles-unmigrated.test.ts:115`: the rest of that test pins `insertEditor`, `setEditorRole`, and
  `demoteOwnerIfNotLast` on the unmigrated schema, so keep it. The line becomes
  `await insertEditor(db, 'boss@x.dev', 'Boss', 'owner', 1);`, and the import at `:7` goes.
- `store.ts:8`, `:432`, and `:574`, and `auth-store.test.ts:445`: comments that call `/auth-store` public.
- `events.ts:69`, `events-list.ts:61`, `tool/internal/logs/events.go:55`, and `log-events.md:106`:
  `editor.bootstrapped`.
- `package.json:159-162`. Delete `src/lib/auth-store/` and `src/tests/unit/auth-store-exports.test.ts`.
- `src/lib/index.ts:19`: `export { defineRoles, resolveCapability, resolveOwnerLevelRoles } from
  './auth/roles.js';` loses the last name. Add it to `DEMOTED` in `root-barrel-prune.test.ts`.
- `src/lib/auth-crypto/index.ts:3-4`: "belongs on `/auth-store` instead".
- Allowlist rows for names that leave the surface: `DeleteEditorOutcome` `:27`, `UnresolvedEditor` `:30`,
  `OwnerGuardOutcome` `:55`, `SetEditorRoleOutcome` `:72`, `demoteOwnerIfNotLast` `:90`,
  `removeOwnerIfNotLast` `:93` (line numbers before T3). Confirm any other row by name.
- `bootstrap.mjs:8-14,99-101`: its comments cite `insertOwnerIfEmpty` and the engine's bootstrap path.
  Restate the trust without them. Its SQL stays.
- `adopt-cairn.md:59`: `admin = createCairnAdmin({ runtime, auth: { bootstrapOwner: { email, displayName } } })`
  becomes `createCairnAdmin({ runtime })`. `:124`: drop `bootstrapOwner` from the list. `:105`: "Sign in
  with the `bootstrapOwner` email (logs `editor.bootstrapped`)" becomes a sign-in with the seeded email.
  In step 2, after the migrations command, teach this one statement, with a note to double any `'` and to
  add `--local` for `wrangler dev`:

  ```sh
  npx wrangler d1 execute <auth-db> --remote --command "INSERT INTO editor (email, display_name, role, created_at) VALUES (lower(trim('you@example.com')), 'Your Name', 'owner', unixepoch() * 1000)"
  ```

  `display_name` and `created_at` are `NOT NULL` with no default, `created_at` is epoch milliseconds, and
  `findEditor` compares exactly on the normalized value. D1 runs all three functions: workerd's
  `ALLOWED_SQLITE_FUNCTIONS` lists `lower`, `trim`, and `unixepoch`.
- `adopt-cairn.md:112`: split the "No sign-in email" row. With a send-failure record, onboard the domain.
  With no `auth.link.send_failed` record, no row exists for that address: run `SELECT email FROM editor`.
  After this task a requester on an empty table sees "sent" and nothing else.
- `cloudflare-access.md:19`: "`bootstrapOwner` runs only on the magic-link path, which identity mode never
  reaches." Name the same SQL step.
- `npm run check:surface -- --update`, `npm run package`, `npm run emit:template`.

**Acceptance:** this prints nothing. The two excluded tests hold synthetic fixtures, and the docs anchor
`#provision-the-auth-store` has no leading slash:

```sh
git grep -n -E "bootstrapOwner|insertOwnerIfEmpty|editor\.bootstrapped|/auth-store" -- src skills claude package.json packages tool ':!src/tests/unit/check-package-files.test.ts' ':!src/tests/unit/check-self-use.test.ts'
```

`DEMOTED` in `root-barrel-prune.test.ts` carries `resolveOwnerLevelRoles`. `npm run check:self-use`,
`npm run check:options`, and `make -C tool check` pass.

**Test:** the case above, red first.

### T6. Auth routes take the runtime, shape 13 (60 min, `auth-data`)

**Outcome:** one factory shape, and `AuthBranding` gone. The `LoginRequestOutcome` half is the first cut
if the plan runs over; it runs as its own commit, second.

**Files:** `src/lib/sveltekit/{auth-routes,cairn-admin,index}.ts`, `src/lib/email.ts`,
`src/lib/admin/{LoginPage,CairnAdmin}.svelte`, the test files below, `scripts/checks/check-self-use-allowlist.json`,
`api-surface.md`, `adopt-cairn.md`, `admin-mount.md`.

Commit one, config:

- Write first: in `src/tests/unit/factory-contracts.test.ts`, change `typeOnlyAuthRoutesContract` to take
  `runtime`, add the positive `createAuthRoutes({ runtime })` call, and add a described `// @ts-expect-error`
  on `createAuthRoutes({ runtime, branding: {...} })`. Vitest doesn't type-check, so red is `npm run check`
  failing on the positive line. The directive proves the after state only: on the base `runtime` is the
  excess key, so it is satisfied there.
- `auth-routes.ts:39-41`: `AuthRoutesConfig` becomes `{ runtime: CairnRuntime; send?: SendMagicLink }`,
  with doc comments on both, and `:2,36`'s prose. `:268`:
  `buildMagicLinkMessage({ to: email, branding: config.branding, link })`, and `:297,317`:
  `siteName: config.branding.siteName`, read the runtime.
- `email.ts:36-43`: delete `AuthBranding`. `:66-77`: `buildMagicLinkMessage` takes `{ to, siteName, sender, link }`
  with `sender: SenderConfig`, and `src/tests/unit/email.test.ts` follows.
- `conditions.ts:57`: "The domain must match branding.from." names a removed option, so it becomes
  `email.from`. Run `npm run package`, then regenerate `tool/internal/spine/conditions.json` with
  `scripts/build/emit-tool-conditions.mjs`.
- `cairn-admin.ts:39-47`: `auth?: Pick<AuthRoutesConfig, 'send'>`, with its doc. `:25,110-118`: drop the
  override and call `createAuthRoutes({ runtime, send: config.auth?.send })`.
- `sveltekit/index.ts:106-110`: `AuthBranding` and the comment that explains it, with the name moved to
  `DEMOTED` in `sveltekit-barrel-prune.test.ts`, per `durable-gotchas.md:511-514`. The
  `check-surface-reexports.json:645` row for `SendMagicLink` stays.
- Tests that pass `branding`: `admin-referrer-policy`, `auth-confirm`, `auth-load-csrf`, `auth-request`,
  `auth-routes-identity`, `log-redaction` (integration); `auth-page-loads`, `cairn-admin-actions`,
  `cairn-admin-load`, `env-genericity`, `factory-contracts`, `sveltekit-mount-contract-reshape` (unit). Use
  `runtime()` from `src/tests/unit/_content-harness.ts:42`. `cairn-admin-actions.test.ts:184-202` is the one
  route-level pin on the sender, so keep it: set `runtime.siteName` and `runtime.sender`, and keep its
  `toEqual`.
- `adopt-cairn.md:116`: "`auth.branding` (`siteName`, `from`, `replyTo`) overrides members;" goes: the name
  and sender come from the runtime. `admin-mount.md:82`: "Magic-link branding defaults from the runtime's
  `siteName` and sender" becomes a plain statement.

Commit two, outcome:

- Write first: `auth-request.test.ts` asserts `{ outcome: 'sent' }` by `toEqual`, so a stray `sent` fails.
  Drop `sent` from the `LoginPage.test.ts` fixtures, and add one case: `form: { sent: true }` alone shows
  the email form, which is red on the base. `CairnAdmin.test.ts` and `cairn-admin-actions.test.ts` follow.
  Fix the comment at `LoginPage.test.ts:46`.
- `auth-routes.ts:62-74`: `RequestOutcome` becomes `LoginRequestOutcome`, a union on `outcome` alone, and
  its doc comment drops the `form.sent` sentence. `:196,230,256,277,279,519-520` follow.
- `LoginPage.svelte:29-32,48,111`: `{:else if (form?.outcome === 'sent' || form?.sent) && !dismissed}`
  becomes the `outcome` test, and the prop type drops `sent`. `CairnAdmin.svelte:28,45,76,81`.
- `sveltekit/index.ts:21`. `env-genericity.test.ts:12,120`. `check-self-use-allowlist.json:61`: the name changes, and `ledger` stays
  `audit-sveltekit-req...`, since pass 1b updates that entry.
- `sveltekit-barrel-prune.test.ts:48`: that `KEPT` list reads `dist` inside an `it()`, so `npm run check`
  can't see it. Move `RequestOutcome` to `DEMOTED`, and add `LoginRequestOutcome` to `KEPT`.
- `npm run check:surface -- --update`, `npm run package`, `npm run emit:template`.

**Acceptance:** this prints nothing, with the barrel test excluded because `DEMOTED` names the old names on
purpose:

```sh
git grep -n -E "AuthBranding|branding\.from|config\.branding|\bRequestOutcome\b|form\?\.sent" -- src skills claude tool ':!src/tests/unit/sveltekit-barrel-prune.test.ts'
```

The `LoginPage` component test on `{ outcome: 'sent' }` still shows the sent panel. `npm run check:options`
and `make -C tool check` pass.

**Test:** the three written first, and the `LoginPage` component test.

### T7. Rename `tokensMatch` to `compareTokens` (15 min, `auth-data`)

**Outcome:** the name follows the live verb ruling. Second cut if the plan runs over.

**Files:** `src/lib/auth/crypto.ts:88,129,138`, `src/lib/auth-crypto/index.ts:11`,
`src/lib/sveltekit/csrf.ts:4,143`, `src/lib/sveltekit/preview.ts:420`, `src/tests/unit/auth-crypto.test.ts`,
`src/tests/unit/auth-crypto-exports.test.ts:12` (the sorted list becomes
`['buildCookieName', 'compareTokens', 'generateToken', 'hashToken']`), `second-sign-in-group.md:88,108`,
`api-surface.md`, and the template copy. Behavior doesn't change.

Write first: change `auth-crypto-exports.test.ts:12` and run it red, since the base exports `tokensMatch`.

**Acceptance:** `git grep -n tokensMatch -- . ':!CHANGELOG.md' ':!MIGRATION-NOTES.md' ':!docs/internal/**'`
prints nothing. The existing `auth-crypto.test.ts` block passes under the new name.

**Test:** `auth-crypto-exports.test.ts`, red first, and the existing block.

### T8. Changelog, notes, backlog (40 min, ordinary plus `runner`)

**Files:** `CHANGELOG.md`, `MIGRATION-NOTES.md`, `BACKLOG.md`, `scripts/checks/check-symbols-allowlist.mjs`.

- `## Unreleased`: one entry for the pass, under Removed, Changed, and Security, with one `Consumers must:`
  line per action: `/auth-channel` and `migrations-channel`, `createChannelDb`, `/auth-store`,
  `resolveOwnerLevelRoles`, `bootstrapOwner`, `auth.branding` and `AuthBranding`, `createAuthRoutes`'s
  required `runtime`, `RequestOutcome` and `sent`, `tokensMatch`, the 13 `auth.channel.*` events and
  `editor.bootstrapped` leaving `CAIRN_LOG_EVENTS`, `src/lib/log.ts` leaving the scaffold, and the scoped
  token with `token_request_refused`. The `bootstrapOwner` line says to seed the owner row before deploying
  if the table may be empty. The token line says an App needs Contents read and write, and that `repo` must
  be the repository's current name, since a stale name followed GitHub's redirect before and now reaches a
  validated body. Finalize it. No bump, no publish.
- `MIGRATION-NOTES.md`: the per-version record for the same list. `check:symbols` scans it, so add a
  `log-event:` row with a reason to `check-symbols-allowlist.mjs` for each retired event the notes write in
  code voice, as `:51` does.
- `BACKLOG.md`: #189 and #167 move to Done. #203 stays open, reworded to the closing-block line telling an
  owner to narrow the installation after the first run, since a leaked App key can still mint unscoped
  tokens, with `Placement: Cleanup round.` File one item through `standards:log-issue`, `Placement:
  Release, real install`: confirm a publish through the scoped token. A ref write refused for workflows
  stops for Geoff, who is at that sitting, with the cause in hand, and no fallback is written now. The
  rc.2 install proves only a scaffolded App, which holds `contents`, `administration`, and `workflows`,
  while the App `adopt-cairn.md` teaches holds Contents alone.

**Acceptance:** `npm run check:version`, `npm run check:symbols`, and `npm run check:docs-gate` pass. This
prints nothing:

```sh
for t in auth-channel createChannelDb auth-store resolveOwnerLevelRoles bootstrapOwner AuthBranding RequestOutcome tokensMatch auth.channel editor.bootstrapped src/lib/log.ts token_request_refused createAuthRoutes; do git diff <base> -- CHANGELOG.md | grep '^+' | grep -q -- "$t" || echo "missing: $t"; done
```

It reads added lines only, since `## Unreleased` already names five of these.

`BACKLOG.md` shows #189 and #167 under `## Done`.

**Test:** none.

### T9. Close (75 min, `auth-data`)

Run in this order. A fix to anything under `src/lib` or `examples/showcase` after the smoke reruns the smoke.
Any new commit reruns CI.

1. `git fetch origin`. If `origin/main` moved, follow "Overlap with 1b" above.
2. `docs-fact-checker` on the `docs/admin` and `docs/architecture.md` changes, fresh context. A wrong claim
   is fixed, and no docs review is sent, per the sheet.
3. Whole-branch `standards:diff-reviewer`, loading the `cairn-running-passes` checklists:
   `standards:svelte-reviewer` (T6's components), `standards:cloudflare-workers-reviewer` (`wrangler.*`),
   `standards:go-conventions` (`tool/`). Dispatch `standards:web-auth-security-reviewer` as its own agent
   on the branch, over every `auth-data` path.
4. One batched fix chain, quoting each finding verbatim, then the lane and the security reader again on the
   fixes. No open finding. An open High goes to `cairn-cms-9b`.
5. Live admin smoke, from this worktree after the setup command, on the head the fixes left. Check the port
   first: `ss -ltn 'sport = :8787'` must print no listener row. If another session holds it, stop nothing:
   use 8788 for `wrangler dev`, add `--inspector-port 8789`, and run a copy of the script made with
   `sed 's/localhost:8787/localhost:8788/' ~/.local/state/cairn-agent-first/smoke-pass3.mjs > /tmp/smoke-pass3-8788.mjs`,
   since `BASE` at its `:22` is the only address it uses. At the root run `npm run package`. Then from
   `examples/showcase`:

   ```sh
   npm run build
   npx wrangler d1 migrations apply AUTH_DB --local
   npx wrangler d1 execute cairn-showcase-auth --local --command "INSERT OR REPLACE INTO editor (email, display_name, role, created_at) VALUES ('smoke-owner@example.com', 'Smoke Owner', 'owner', 0), ('smoke4@example.com', 'Smoke Editor', 'editor', 0);"
   npx wrangler d1 execute cairn-showcase-auth --local --command "INSERT OR REPLACE INTO session (id, email, expires_at, created_at) VALUES ('smoke-owner', 'smoke-owner@example.com', 4070908800000, 0);"
   npx wrangler dev --port 8787
   ```

   Confirm its log says `Ready on http://localhost:8787`, then run
   `node ~/.local/state/cairn-agent-first/smoke-pass3.mjs <worktree>`, which requests `smoke4@example.com`.
   Record `git rev-parse HEAD` above the output in the PR. Stop only the `wrangler dev` this session started.
6. `npm run check:docs-gate`.
7. `git fetch origin` again. If `origin/main` moved, follow "Overlap with 1b". Then delete the plan files
   under `docs/internal/plans/` in the last commit, so CI runs on the tree that merges. That commit touches
   no code, so the smoke's commit may be its parent, and the PR body says so.
8. Full-suite home: `ci-green <sha> --pr <n> --wait` on that head, per `cairn-pass`. List every retried test.
9. Mark the PR ready. The body opens with `## Brief` per `~/.claude/docs/voice/approval-brief.md`, then
   what landed, the security read as one row per finding with its severity, fix commit, and reread verdict,
   one verdict line per `auth-data` task (T2, T3, T5, T6, T7), `## Decisions`, `## Planning misses`, retried
   tests, the smoke's commit and output, and the score. Stop there. `cairn-cms-9b` merges.

**Acceptance:** CI green on the final head, the security read with no open finding, and the smoke at the known
result on that head or its parent, all three named in the PR body.
