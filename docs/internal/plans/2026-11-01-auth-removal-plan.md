# Auth removal: task plan

Pass 1a, slug `auth-removal`, class `auth-data` plus `runner`. Initiative: `shared-standards`. Base:
`d71e4401e`, then `dcd12eaa6` (the sweep verdicts). Design note:
`docs/internal/plans/2026-11-01-auth-removal-design.md`. Sources: `design-audit/run-sheet.md` "Pass
1a", `design-audit/design.md` "1a. Auth removal", ledger.md "## Rulings".

Path: 295 minutes against a design estimate of 240 and a ceiling of 480. No cut is needed.

## Pre-flight

Every task was read for owner steps and auto-mode gaps.

- **Geoff's steps:** none. No sign-in, secret, dialog, browser action, or permission rule.
- **Auto-mode writes** under workstation#192's line. A refusal is a stop, never a thing to route around.
  - T3: `claude/CLAUDE.md`, `.claude/skills/cairn-writing-docs/evals/**` (deletes),
    `.claude/skills/cairn-running-passes/references/pass-gate-tiers.md`, and through
    `npm run emit:template` the tree `templates/waymark/.claude/**`.
  - T4: `.claude/skills/cairn-running-passes/SKILL.md`,
    `.claude/skills/cairn-running-passes/references/admin-smoke-test.md`,
    `.claude/skills/cairn-writing-engine-code/references/durable-gotchas.md`.
  - **Outside the line's text:** T3's `claude/agents/cairn-extension-reviewer.md` and its generated
    copy `templates/waymark/.claude/agents/cairn-extension-reviewer.md`. The line names `CLAUDE.md`,
    `.claude/skills/`, and `.claude/rules/`. Neither file is a live agent definition, since the first is
    packaged content and the second is template output. Name them; a refusal is a stop for
    `cairn-cms-9b`.
- **`wrangler d1 --local` and stopping the session's own `wrangler dev`:** T9, under the same change.
- **Live accounts:** none. Nothing touches `--remote`, a deployed Worker, or GitHub.

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
- **Smoke:** the one known `no-pending-request` FAIL counts as a pass with a note, and T4 documents it.
  Any other failure stops the line.
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
- **Overlap with 1b:** `gate-table.json` and `api-surface.md` only. If 1b merged first, T9 merges
  `origin/main`, keeps both `## Unreleased` entries, runs `npm run emit:template` and
  `npm run check:surface -- --update`, and reruns the fast lane.
- **A pair merge conflicts:** the pairs are disjoint, so a conflict means a task left its file list.
  Resolve toward the plan and rerun the fast lane.
- **Questions:** none is expected. A stop goes to `docs/STATUS.md` for `cairn-cms-9b`, per the prompt.

## Tasks

Order: pair T1 and T2, then pair T3 and T4, then T5, T6, T7, T8, T9. Run the fast lane after each task.
Every `auth-data` task gets `standards:diff-reviewer` on its commit while the line moves, and a `fix` or
`escalate` verdict stops the line. Keep T3 ahead of T5: both edit `package.json` `exports` and
`api-surface.md`, so they never pair.

### T1. Finish the recipe, #189 (30 min, ordinary, `model: opus`)

**Outcome:** `second-sign-in-group.md`'s roll-your-own section stands alone, and the skills state one
hook order. The Channel section stays until T3.

**Files:** `skills/cairn-extending-a-site/references/second-sign-in-group.md`,
`skills/cairn-building-admin-screens/references/custom-screen.md`, and through
`npm run emit:template` their copies under `templates/waymark/.claude/skills/`.

The section at `:85` opens: "`@glw907/cairn-cms/auth-crypto` supplies stateless primitives only". Add
these to its list, each grounded in what the engine does at the cited line:

- A fresh, random session id at login, never one the visitor presented (fixation).
  `auth-routes.ts:387`: `const id = generateSessionId();`.
- The session cookie's attributes: HttpOnly, Secure, SameSite=Lax, a `Max-Age`, and a `__Host-` name on
  HTTPS through `buildCookieName`. `auth-routes.ts:398-405`. The CSRF cookie takes `__Host-` too.
- Logout deletes the server-side row, not only the cookie. `auth-routes.ts:488`:
  `const deleted = await deleteSession(db, id);`.
- One response for an unknown contact, byte-identical to a sent one. `auth-routes.ts:230`:
  `if (!editor) return { outcome: 'sent', sent: true };`.

Then carry over the Channel section's facts that hold for any second store, so T3 can delete it
whole: a separate D1 binding with its own `migrations_dir`, never `AUTH_DB`'s (`:49-51`); a cookie name
that never starts with `cairn_` (`:68`); a bot challenge through `verifyTurnstile` with `hostname`,
`action`, and `ip` (`:66-67`); and for a short code, a ten-minute expiry and an attempt cap (`:83`).

Settle the hook order. `guard.ts:182` reads "A site that has a hook sequences the guard last", and
`admin-mount.md:110-111` agrees. `custom-screen.md:171-172` reads: "compose it after the guard in the
production branch: `handle = sequence(createAuthGuard({ runtime }), wireAuditSink)`." Change it to
compose the sink before the guard: `handle = sequence(wireAuditSink, createAuthGuard({ runtime }))`.

**Acceptance:** `git grep -n 'sequence(createAuthGuard' -- skills docs claude` finds only a guard with
no handle after it. `grep -c cairnAuditSink src/lib/sveltekit/guard.ts` prints 0, which is why the
sink can run first. `npm run check:template` passes. The recipe names all eight points, each checkable
by a search for `HttpOnly`, `SameSite`, `Max-Age`, `__Host-`, `migrations_dir`, `cairn_`,
`verifyTurnstile`, and "attempt".

**Test:** none; skill prose. `check:public-skill` and `check:snippets` run through the lane.

### T2. Scope the installation token, #203 (45 min, `auth-data`)

**Outcome:** every token the engine mints reaches one repository with `contents: write`, and a mint
refused for an uncovered repository names that.

**Files:** `src/lib/github/{types,credentials,signing}.ts`, `src/lib/sveltekit/health.ts`,
`src/lib/log/events.ts`, `skills/cairn-extending-a-site/references/log-events.md` and its template copy,
`docs/admin/rotate-the-github-app-key.md`, `src/tests/unit/{github-signing,github-token-cache,health-live-check}.test.ts`,
and the test that covers `appCredentials`.

Write the failing tests first, and run them red:

- `installationToken` POSTs `{"repositories":["<repo>"],"permissions":{"contents":"write"}}` with
  `Content-Type: application/json`. `github-signing.test.ts:73` already reads the URL.
- The cache holds separate tokens for two repositories on one installation.
- `classifyMintFailure` reads 422 as `repository_not_covered`, added to the table at
  `health-live-check.test.ts:96-99`, and two repositories get separate verdicts.

Then change the code:

- `types.ts:49`: `AppCredentials` gains `repo: string`, with a doc comment.
- `credentials.ts:15-17,24`: `identity: { appId: string; installationId: string }` gains `repo`, and
  the return carries it. `backend.ts:200` already passes `config`, which has it.
- `signing.ts:87-96`: add the header and the body. The body's comment says why contents alone is enough
  and cites no line numbers.
- `signing.ts:132,135`: key the cache on both, not `creds.installationId` alone.
- `health.ts:84`: add 422. `:133`: add `creds.repo` to the key. `runHealthChecks`'s literal passes
  `repo: provider.repo`. Update the mint comment at `:30-36` for the new `detail`.
- `events.ts:119-123`: add `'repository_not_covered'` to `GithubTokenCheckReason` and its doc comment.
- `log-events.md:162`: add `repository_not_covered` (422) to the `health` list.
- `rotate-the-github-app-key.md`: line 74 sends a failing `/healthz?live=1` to Recover. Add one sentence
  there saying a `detail` of `repository_not_covered` means the App's installation no longer includes
  the site's repository, and name the fix. Load `cairn-writing-docs` case A. Search `docs/admin`,
  `docs/editors`, and `skills/` for `installation`, and confirm `create-your-site.md:88` stays true.

**Acceptance:** the three new tests fail on the base and pass after. `git grep -n "access_tokens" -- src/lib`
finds the one call, and it carries `body:`. `npm run check:docs-gate` passes.

**Test:** the three above.

### T3. Remove `/auth-channel`, E2 (70 min, `auth-data` plus `runner`)

**Outcome:** no `/auth-channel`, no members fixture, and no reference to either in shipped code, skills,
or docs. Runs after T1.

**Delete:**

- `src/lib/auth-channel/`, `migrations-channel/`.
- `src/tests/integration/_channel-harness.ts`, `src/tests/integration/auth-channel-*.test.ts` (five),
  `src/tests/unit/auth-channel-*.test.ts` (seven).
- `packages/cairn-cms-dev/src/channel-db.ts`, `channel-db.test.ts`.
- `.claude/skills/cairn-writing-docs/evals/site-cases/s03-second-sign-in-group.json`,
  `evals/setups/site/s03-second-sign-in-group.mjs`, `s03-second-sign-in-group-bad.mjs`.
- Showcase: `e2e/members.spec.ts`, `migrations-members/`, `src/members/`, `src/routes/members/`,
  `src/routes/test/{last-otp,reset-members,revoke-member-session}/`.

**Edit engine and packaging:**

- `package.json:163-166` (`"./auth-channel"`) and `:204` (`"migrations-channel"`).
- `src/lib/sveltekit/csrf.ts:91`: delete `originMatches`, and its block at `src/tests/unit/csrf.test.ts:80-90`.
- `src/lib/log/events.ts:92-106`: the 13 `auth.channel.*` events and their comment, so the union ends at
  `'audit.sink.write_failed'`. `log-events.md`: the `## Auth channel` section and its contents line `:20`.
- `src/lib/diagnostics/conditions.ts`: the channel clauses at `:38` ("and a member action throws a 403"),
  `:98` ("and member actions keep their origin compare" and the `resolveSubject` sentence), `:182`, `:183`
  ("every createAuthChannel action"). Update `conditions.test.ts:189`, which matches
  `/createAuthChannel/`. Regenerate `tool/internal/spine/conditions.json` with
  `scripts/build/emit-tool-conditions.mjs`.
- `tool/internal/doctor/check_referrer.go:42,172` and `tool/testdata/copy.golden.md:355`. Load
  `standards:go-conventions`. Run `make -C tool check`.
- Comments: `src/lib/cloudflare/rate-limit.ts:11`, `src/lib/dev-flag.ts:3-13` (three readers become two,
  and the two refusals' note goes), `src/lib/sveltekit/guard.ts:252-255`,
  `src/tests/unit/peer-deps.test.ts:41`, `packages/cairn-cms-dev/src/repository-backend.ts:28`.
- `packages/cairn-cms-dev/src/index.ts:8-9`. `scripts/checks/dev-fold-markers.txt:12` and
  `dev-fold-markers.test.ts:50`.
- `wrangler.test.jsonc`'s `CHANNEL_DB` block and `src/tests/cloudflare-test.d.ts:15-17`.
- `src/tests/unit/worker-wait-until.test.ts`: it imports `createAuthChannel` at `:11`. Delete the file
  if channel is all it covers, otherwise cut that half.

**Edit `runner`:**

- `scripts/checks/check-options.mjs:11`, and the count above it, "30 pairs, 27 distinct exports".
- `scripts/checks/check-package-files.mjs:37-65,456` (`checkChannelMigrationPacked` and its call), and
  its block at `check-package-files.test.ts:7,48-70`.
- `scripts/checks/check-self-use.mjs:31,51` and `check-self-use.test.ts:26`.
- `scripts/checks/check-self-use-allowlist.json:8,9,17,18,19,25`.
- `scripts/checks/check-surface-reexports.json:54-65`.
- `scripts/checks/gate-table.json:29,185,273`, `src/tests/unit/gate-tier.test.ts:64`, and
  `.claude/skills/cairn-running-passes/references/pass-gate-tiers.md:79`.
- `npm run check:surface -- --update`.

**Edit the showcase:**

- `wrangler.jsonc`: the `MEMBER_DB` block and its exclude markers. `worker-configuration.d.ts:7`.
- `playwright.config.ts:47` (`'npx wrangler d1 migrations apply MEMBER_DB --local',`) and the sentence
  at `:36-37`.
- `.cairn-template.json`: drop `"src/members"`, `"src/routes/members"`, `"migrations-members"`, and add
  `"src/lib/log.ts"`.
- `src/lib/log.ts`: the union becomes `'admin.signups.misconfigured'` alone, with the markers gone.
- `src/routes/test/test-routes.test.ts`: the members routes go. Delete the file if nothing remains.
- `src/routes/+layout.server.ts:4,14`, and `src/chassis/README.md:194` ("the members pages are
  template-excluded fixtures").
- `src/chassis/tokens.css:27-29`: "`card` stays enabled because this site's members fixture renders one
  (`routes/members`), a route the template excludes; a scaffolded site with no `.card` in its markup may
  exclude it too." Say instead that no route renders it now, so a site may exclude it. Keep the
  component enabled.
- `src/tests/unit/emit-template-tree.test.ts:113` and `packages/create-cairn-site/scripts/emit-template-dir.test.mjs:82-87`:
  keep each guard meaningful without the removed names.
- `npm run emit:template`.

**Edit docs:**

- `SECURITY.md:26`, `docs/architecture.md:33,57`, `docs/why-cairn.md:20,24`.
- `claude/CLAUDE.md:25-26`, `claude/agents/cairn-extension-reviewer.md:19`.
- `skills/cairn-extending-a-site/SKILL.md:39`.
- `second-sign-in-group.md`: delete `## Channel path`, its contents line, and the `Choose` table's channel
  column, and rewrite `## Choose` for two mechanisms: a role, or a flow the site builds on `/auth-crypto`.

**Acceptance:** this prints nothing:
`git grep -n -E "createAuthChannel|auth-channel|AuthChannel|createChannelDb|migrations-channel|MEMBER_DB|CHANNEL_DB|originMatches" -- . ':!CHANGELOG.md' ':!MIGRATION-NOTES.md' ':!ROADMAP.md' ':!BACKLOG.md' ':!docs/internal/**'`.
`node -e "import('@glw907/cairn-cms/auth-channel')"` from the showcase fails with
`ERR_PACKAGE_PATH_NOT_EXPORTED`. `npm run check:template`, `npm run check:package`,
`npm run check:tool-conditions`, and `make -C tool check` pass.

**Test:** the suites that remain. The lane plus CI's `e2e` prove the showcase still builds.

### T4. Smoke prerequisites and repo skill clean-up (20 min, ordinary)

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
  nothing, so the round trip needs that second row. Name the sole-owner mint id `smoke-owner`.
- Same file, step 5: a second context that follows a spent link lands on
  `/admin/login?error=no-pending-request`. That is the correct refusal, and a check reading "not signed in"
  must allow it.
- `SKILL.md:30`: drop `auth-channel`, `auth-store`, and `` `**/members/login/**` `` from the `auth-data`
  map. Keep `` `**/admin/signups/**` ``.
- `durable-gotchas.md`: delete the "`node:sqlite` throws under workerd" section at `:255-261`, since
  `createChannelDb` was its case. `:489-492`: "`src/lib/auth/store.ts` is not the `/auth-store` entry
  point." Rewrite it on a subpath that stays, such as `src/lib/auth/crypto.ts` and `/auth-crypto`.
  `:539`: drop "or `src/lib/auth-channel/store.ts`".

**Acceptance:** `git grep -n -E "auth-channel|auth-store|createChannelDb|members/login" -- .claude/skills/cairn-running-passes .claude/skills/cairn-writing-engine-code`
prints nothing except what T3 owns. The durable-gotchas index line for the deleted section is gone.

**Test:** none; repo skills. T9 runs the procedure for real.

### T5. Remove `bootstrapOwner` and `/auth-store`, E11 (35 min, `auth-data` plus `runner`)

**Outcome:** the first owner is seeded by SQL or by `create-cairn-site`. No public editor-roster path.

**Files:** `src/lib/sveltekit/auth-routes.ts`, `src/lib/sveltekit/cairn-admin.ts`, `src/lib/auth/store.ts`,
`src/lib/auth-store/` (delete), `src/lib/index.ts`, `src/lib/auth-crypto/index.ts`, `src/lib/log/events.ts`,
`package.json`, tests, `scripts/checks/check-self-use-allowlist.json`, `api-surface.md`, skills,
`packages/create-cairn-site/src/cloudflare/bootstrap.mjs` (comments).

Write first: a test in `src/tests/integration/auth-request.test.ts` that a request for an unknown email
on an empty `editor` table inserts no row and sends nothing, whatever the config. It replaces the
`bootstrapOwner` block at `:391-460`.

- `auth-routes.ts:44-59`: the option. `:180-181`: the doc sentence. `:217-224`: the bootstrap block.
  `:25`: the `insertOwnerIfEmpty` import.
- `cairn-admin.ts:118`: drop the `bootstrapOwner` argument. `:99`: "auth send/bootstrap".
- `store.ts:539`: delete `insertOwnerIfEmpty` and its doc comment, and its tests at
  `auth-store.test.ts:230-255,478` and `auth-store-roles-unmigrated.test.ts:115`. Remove any `fake-auth-db.ts`
  handler that matched only this statement.
- `store.ts:8` and `:432`: comments that call `/auth-store` public.
- `events.ts` and `log-events.md:106`: `editor.bootstrapped`.
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
  becomes `createCairnAdmin({ runtime })`. `:105`: "Sign in with the `bootstrapOwner` email (logs
  `editor.bootstrapped`)". Add the SQL step: `npx wrangler d1 execute <auth-db> --remote --command
  "INSERT INTO editor (email, display_name, role, created_at) VALUES (...)"`, lowercased and trimmed.
  `:124`: drop `bootstrapOwner` from the list.
- `cloudflare-access.md:19`: "`bootstrapOwner` runs only on the magic-link path, which identity mode never
  reaches." Name the same SQL step.
- `npm run check:surface -- --update`, `npm run emit:template`.

**Acceptance:** `git grep -n -E "bootstrapOwner|insertOwnerIfEmpty|editor\.bootstrapped|auth-store|/auth-store" -- src skills claude package.json packages`
finds no hit except the docs anchor `#provision-the-auth-store`, which is a page heading.
`git grep -n resolveOwnerLevelRoles -- src/lib/index.ts` prints nothing, and `editors-routes.ts:11` still
imports it. `npm run check:self-use` and `npm run check:options` pass.

**Test:** the replacement block above, red first.

### T6. Auth routes take the runtime, shape 13 (45 min, `auth-data`)

**Outcome:** one factory shape, and `AuthBranding` gone. The `LoginRequestOutcome` half is the first cut
if the plan runs over; it runs as its own commit, second.

**Files:** `src/lib/sveltekit/{auth-routes,cairn-admin,index}.ts`, `src/lib/email.ts`,
`src/lib/admin/{LoginPage,CairnAdmin}.svelte`, the test files below, `scripts/checks/check-self-use-allowlist.json`,
`api-surface.md`, `adopt-cairn.md`, `admin-mount.md`.

Commit one, config:

- Write first: `src/tests/unit/factory-contracts.test.ts` asserts `createAuthRoutes({ runtime })` type-checks and
  a `branding` key is a type error.
- `auth-routes.ts:39-41`: `AuthRoutesConfig` becomes `{ runtime: CairnRuntime; send?: SendMagicLink }`,
  with doc comments on both, and `:36`. `:268`:
  `buildMagicLinkMessage({ to: email, branding: config.branding, link })`, and `:297,317`:
  `siteName: config.branding.siteName`, read the runtime.
- `email.ts:36-43`: delete `AuthBranding`. `:66-77`: `buildMagicLinkMessage` takes `{ to, siteName, sender, link }`
  with `sender: SenderConfig`, and `src/tests/unit/email.test.ts` follows.
- `cairn-admin.ts:39-47`: `auth?: Pick<AuthRoutesConfig, 'send'>`, with its doc. `:25,110-118`: drop the
  override and call `createAuthRoutes({ runtime, send: config.auth?.send })`.
- `sveltekit/index.ts:106-110`: `AuthBranding` and the comment that explains it. The
  `check-surface-reexports.json:645` row for `SendMagicLink` stays.
- Tests that pass `branding`: `admin-referrer-policy`, `auth-confirm`, `auth-load-csrf`, `auth-request`,
  `auth-routes-identity`, `log-redaction` (integration); `auth-page-loads`, `cairn-admin-actions`,
  `cairn-admin-load`, `env-genericity`, `factory-contracts`, `sveltekit-mount-contract-reshape` (unit). Use
  `runtime()` from `src/tests/unit/_content-harness.ts:42`.
- `adopt-cairn.md:116`: "`auth.branding` (`siteName`, `from`, `replyTo`) overrides members;" goes: the name
  and sender come from the runtime. `admin-mount.md:82`: "Magic-link branding defaults from the runtime's
  `siteName` and sender" becomes a plain statement.

Commit two, outcome:

- Write first: `auth-request.test.ts` asserts `{ outcome: 'sent' }` by `toEqual`, so a stray `sent` fails.
- `auth-routes.ts:62-74`: `RequestOutcome` becomes `LoginRequestOutcome`, a union on `outcome` alone, and
  its doc comment drops the `form.sent` sentence. `:196,230,256,277,279,519-520` follow.
- `LoginPage.svelte:29-32,48,111`: `{:else if (form?.outcome === 'sent' || form?.sent) && !dismissed}`
  becomes the `outcome` test, and the prop type drops `sent`. `CairnAdmin.svelte:28,76,81`.
- `sveltekit/index.ts:21`. `check-self-use-allowlist.json:61`: the name changes, and `ledger` stays
  `audit-sveltekit-req...`, since pass 1b updates that entry.
- `npm run check:surface -- --update`, `npm run emit:template`.

**Acceptance:** `git grep -n -E "AuthBranding|config\.branding|\bRequestOutcome\b|form\?\.sent" -- src skills claude`
prints nothing. A component test that renders `LoginPage` with `{ outcome: 'sent' }` still shows the sent
panel. `npm run check:options` passes on the new members.

**Test:** the two written first, plus the `LoginPage` component test.

### T7. Rename `tokensMatch` to `compareTokens` (15 min, `auth-data`)

**Outcome:** the name follows the live verb ruling. Second cut if the plan runs over.

**Files:** `src/lib/auth/crypto.ts:88,129,138`, `src/lib/auth-crypto/index.ts:11`,
`src/lib/sveltekit/csrf.ts:4,143`, `src/lib/sveltekit/preview.ts:420`, `src/tests/unit/auth-crypto.test.ts`,
`src/tests/unit/auth-crypto-exports.test.ts:12` (the sorted list becomes
`['buildCookieName', 'compareTokens', 'generateToken', 'hashToken']`), `second-sign-in-group.md:88,108`,
`api-surface.md`, and the template copy. Behavior doesn't change.

**Acceptance:** `git grep -n tokensMatch -- . ':!CHANGELOG.md' ':!MIGRATION-NOTES.md' ':!docs/internal/**'`
prints nothing. The existing `auth-crypto.test.ts` block passes under the new name.

**Test:** the existing block.

### T8. Changelog, notes, backlog (30 min, ordinary)

**Files:** `CHANGELOG.md`, `MIGRATION-NOTES.md`, `BACKLOG.md`.

- `## Unreleased`: one entry for the pass, under Removed, Changed, and Security, with one `Consumers must:`
  line per action: `/auth-channel` and `migrations-channel`, `createChannelDb`, `/auth-store`,
  `resolveOwnerLevelRoles`, `bootstrapOwner`, `auth.branding` and `AuthBranding`, `RequestOutcome` and `sent`,
  `tokensMatch`, and the scoped token with `repository_not_covered`. Finalize it. No bump, no publish.
- `MIGRATION-NOTES.md`: the per-version record for the same list.
- `BACKLOG.md`: #189 and #167 move to Done. #203 stays open, reworded to the closing-block line telling an
  owner to narrow the installation after the first run, since a leaked App key can still mint unscoped
  tokens, with `Placement: Cleanup round.` File one item through `standards:log-issue`, `Placement:
  Release, real install`: confirm a publish through the scoped token, and if a ref write is refused for
  workflows, add `workflows: 'write'` to the mint.

**Acceptance:** `npm run check:version` and `npm run check:docs-gate` pass. `git grep -c "Consumers must:" -- CHANGELOG.md`
rises by at least nine.

**Test:** none.

### T9. Close (45 min, `auth-data`)

Run in this order. The last two steps repeat if a fix lands.

1. `git fetch origin`. If pass 1b merged, follow "Overlap with 1b" above.
2. Full-suite home: CI on the head, through `ci-green`, per `cairn-pass`. List every retried test.
3. `docs-fact-checker` on the `docs/admin` and `docs/architecture.md` changes, fresh context. A wrong claim
   is fixed, and no docs review is sent, per the sheet.
4. Live admin smoke: `admin-smoke-test.md`'s showcase path, from this worktree after the setup command,
   driven by `node ~/.local/state/cairn-agent-first/smoke-pass3.mjs <worktree>`. Seed `smoke4@example.com`
   as the editor, which that script requests. Record the output in the PR. Stop only the `wrangler dev` this
   session started.
5. Whole-branch `standards:diff-reviewer`, loading the `cairn-running-passes` checklists:
   `standards:web-auth-security-reviewer` (every `auth-data` path), `standards:svelte-reviewer` (T6's
   components), `standards:cloudflare-workers-reviewer` (`wrangler.*`), `standards:go-conventions` (`tool/`).
6. One batched fix chain, quoting each finding verbatim, then the lane, CI, and the security reader again on
   the fixes. No open finding. An open High goes to `cairn-cms-9b`.
7. Delete the plan files under `docs/internal/plans/` in the last commit, so CI runs on the tree that merges.
8. Mark the PR ready. The body opens with `## Brief` per `~/.claude/docs/voice/approval-brief.md`, then
   what landed, the security verdict, `## Decisions`, `## Planning misses`, retried tests, the smoke
   output, and the score. Stop there. `cairn-cms-9b` merges.

**Acceptance:** CI green on the final head, the security read with no open finding, and the smoke at the known
result, all three named in the PR body.
