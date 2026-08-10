# create-cairn-site Pass T3 (the Cloudflare chapter) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking. In this repo the executor is `cairn-implementer`
> per task, orchestrated by the main loop, except Task 1 (the spike, main-loop, no Geoff
> browser needed) and Task 12 (the live e2e, main loop with Geoff's two small moments).

**Goal:** After the GitHub chapter's `pushed` state, the tool builds and deploys the site to
the admin's free `workers.dev` hostname, provisions and migrates both D1 databases, moves the
App's PEM from the local state store to a Worker secret, seeds the owner row plus a bootstrap
magic-link token directly in D1, and opens the site's own confirm page so the admin signs in
with one click and no email.

**Architecture:** Everything Cloudflare rides wrangler's own session (spike A: chapter 1
lives inside `workers:write`/`workers_scripts:write`/`d1:write`), so the chapter holds no
credential of its own. All shell-outs flow through one spawn seam whose binaries come from
call-time env seams, so the node:test suite runs against fake `wrangler`/`npm` shims on a
controlled PATH-free path and every catalogue row is triggered, not read. The bootstrap
needs no engine change: the engine stores magic-link tokens as lowercase-hex SHA-256 in D1
(`src/lib/auth/crypto.ts`) and the allowlist is the D1 `editor` table, so the tool seeds
rows via `wrangler d1 execute --remote` and rides the engine's own
`/admin/auth/confirm?token=…` page. The GitHub App's identity is source-carried by design
(`src/lib/github/backend.ts:105`: "the non-secret GitHub App identity an adapter carries in
source"), so a new pre-push finalize step writes the real owner/repo/appId/installationId
into the scaffold's `cairn.config.ts` before the T2 push, and the repo is born correct.

**Tech Stack:** plain ESM `.mjs` on `node:test`; Node 22 built-ins only (`node:child_process`
spawn, `node:crypto` for the token and its SHA-256); `@clack/prompts` (already a dependency).
No new dependencies. wrangler is the scaffold's own devDependency (`^4`), never this
package's.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-10-create-cairn-site-t3-design.md`. The umbrella:
  `2026-08-09-admin-setup-and-docs-reset-design.md`. Platform verdicts:
  `docs/internal/2026-08-09-tool-passes-platform-spikes.md`.
- Node floor `>=22` (`engines.node`); no dependency may be added to `package.json`.
- **No secret is ever written under the project directory.** The raw bootstrap token exists
  only in memory and in the confirm URL handed to the browser opener (it is the admin's own
  sign-in link, the same class as a magic-link email); it is never persisted. After the key
  move, the state record holds **no PEM**; the Worker secret is its only home.
- **Every exit prints a next step; every wait prints a heartbeat.** `npm install`,
  `npm run build`, and `wrangler deploy` are the chapter's long steps: each prints a line
  saying what is running and that it can take a few minutes, and their child output is
  streamed to the terminal so the admin watches real progress rather than silence.
- Env seams are read **at call time**, never cached at module load (the `state.mjs`
  precedent): `CAIRN_WRANGLER_BIN` (default: `npx --no-install wrangler` in the scaffold
  dir), `CAIRN_NPM_BIN` (default `npm`, `npm.cmd` on win32), `CAIRN_STATE_DIR` (existing).
- **The desktop-side-effect constraint (T2's standing rule): no test may spawn a real
  browser, a real wrangler, or a real npm.** Browser opening stays behind the injected
  `openBrowser` (T2's `src/github/open.mjs`); process spawning stays behind the Task 3 seam,
  and tests always set both env seams to fake bins.
- Comments follow the repo's TSDoc-shaped JSDoc style visible in `src/*.mjs`; no em dashes
  in comments. Every commit runs the package suite
  (`npm --prefix packages/create-cairn-site test`) green before it lands.
- Worktree: `worktree-t3-cloudflare-chapter` (this plan's worktree, off `main`). Remember
  the durable gotcha: worktree edits target the worktree path.

## File Structure

```
packages/create-cairn-site/
  src/cloudflare/exec.mjs        the spawn seam: runWrangler / runNpm (+ .test.mjs)
  src/cloudflare/catalogue.mjs   the chapter's error catalogue (+ .test.mjs)
  src/cloudflare/config.mjs      wrangler.jsonc naming + PUBLIC_ORIGIN write (+ .test.mjs)
  src/cloudflare/deploy.mjs      install, build, deploy, migrations (+ .test.mjs)
  src/cloudflare/secret.mjs      the PEM's move to a Worker secret (+ .test.mjs)
  src/cloudflare/bootstrap.mjs   owner + token seed, confirm URL (+ .test.mjs)
  src/cloudflare/chapter.mjs     orchestration: consent, prompt, actions, hops (+ .test.mjs)
  src/github/finalize.mjs        pre-push cairn.config.ts identity finalize (+ .test.mjs)
  test/fake-bin.mjs              fake-executable factory for wrangler/npm (test helper)
Modified: src/args.mjs, src/scaffold.mjs, src/github/chapter.mjs, bin.mjs,
  package.json (test glob), README.md
```

State shape after this pass (the record grows a `cloudflare` section; `step` remains the
resume key):

```js
{
  name, dir, step,           // step gains: 'deployed' | 'live'  ('live' is final)
  ownerEmail,                // new: the sign-in address, prompted in this chapter
  github: { ... },           // T2 fields; `pem` is DELETED at the key move
  cloudflare: {
    url,                     // https://<worker>.<subdomain>.workers.dev, from the deploy
    workerName,              // the slug-derived worker name
  },
}
```

The runtime order is finalize-config (inside T2's push) → install → login → build → deploy
→ origin write → migrations → redeploy → secret move → seed → open confirm. `updateSite`'s
deep merge only covers `github`; the chapter writes `cloudflare` whole per hop, which is
safe because each hop rewrites every field it knows.

> **Amended by Task 1's spike (2026-08-10).** The verdict doc is
> [`docs/internal/2026-08-10-t3-cloudflare-spike.md`](../../internal/2026-08-10-t3-cloudflare-spike.md);
> read it before Tasks 3, 4, 7, 9, and 10. The six changes it forces, each marked **[spike]**
> at the task it changes:
> 1. **No id write-back.** Wrangler provisions id-less bindings by name and writes nothing back
>    into `wrangler.jsonc`, and every later command (migrations, redeploy, a re-run meeting
>    existing resources) resolves by name anyway. Task 7 parses no ids and writes none.
> 2. **`--command` takes several statements.** Task 9 drops its `--file` fallback entirely.
> 3. **Migrations take the binding name.** Task 7 needs no `names` param.
> 4. **Install before login** (see 6 below), so the runtime order above changed.
> 5. **`wrangler-unavailable` is an exit-1 from npx, not an `ENOENT`.** The seam owns it and
>    raises the catalogue row, so Task 4 is dispatched **before** Task 3.
> 6. **A missing `node_modules` breaks a login-first order**, which is why 4 exists.

---

### Task 1: The spike (main loop; estate account, no Geoff browser; decision gate for Tasks 5-10)

**Files:**
- Create: `docs/internal/2026-08-10-t3-cloudflare-spike.md` (the recorded verdict)

The spike rehearses the whole chapter by hand against the glw907 account (the standing
`CLOUDFLARE_API_TOKEN` from `~/.local/secrets` makes wrangler non-interactive; `wrangler
whoami` confirms). It settles, with observed statuses:

(a) **Id-less auto-provisioning and write-back.** A `wrangler.jsonc` whose `d1_databases`
entries carry `database_name` + `migrations_dir` but **no `database_id`**, plus an
`r2_buckets` entry: does `wrangler deploy` create the resources and write the ids back into
the file, and in what textual form? (The umbrella's claim, dated 2026-08-09.)
(b) **The `send_email` binding on an account that has it un-configured for the new site.**
Does the deploy succeed with the binding present? Note the estate is Workers Paid; record
the free-plan question as unresolvable here and check Cloudflare's current docs for a
stated answer.
(c) **Non-TTY behavior.** Run deploy with stdout piped (the tool's shape): no interactive
prompt may hang; record what a subdomain-less account would see per current docs (the
estate already has one).
(d) **Command shapes.** `wrangler d1 migrations apply AUTH_DB --remote` (binding name
accepted?); `wrangler d1 execute AUTH_DB --remote --command "<sql>"` with **two statements
separated by `;`** (multi-statement accepted, or does it need `--file`?); `printf '%s' "$PEM"
| wrangler secret put GITHUB_APP_PRIVATE_KEY_B64` (stdin accepted?).
(e) **URL parseability.** The exact deploy stdout line carrying the workers.dev URL.
(f) **Local resolution.** From the scaffold dir after `npm install`, `npx --no-install
wrangler --version` resolves the devDependency.
(g) **Existing-name behavior.** Deploying a name that already exists updates it silently;
confirm, for the consent copy's wording.

- [ ] **Step 1: Bake and scaffold a scratch site** under `$CLAUDE_JOB_DIR/tmp` using the CI
  pattern (`npm pack` the engine and dev packages, `node scripts/bake-template.mjs --to
  <tmp>/template --engine-spec <tarball> --dev-spec <tarball>`, then run the T1 scaffold or
  copy the template and hand-substitute), name it `t3-spike-<random>`.
- [ ] **Step 2: Hand-edit `wrangler.jsonc`** to the id-less slug-named shape, then run the
  chapter's commands in order, recording every exit code and the write-back diff.
- [ ] **Step 3: Seed and click.** Insert an owner row and a hashed token by hand (the Task 9
  SQL), open the confirm URL, and verify the signed-in admin loads. This proves the whole
  bootstrap premise before any code exists.
- [ ] **Step 4: Tear down** (`wrangler delete`, `wrangler d1 delete <name>` twice,
  `wrangler r2 bucket delete <name>`) and verify with `wrangler d1 list`.
- [ ] **Step 5: Write the verdict doc** with every premise (a)-(g) and its observed result.
  Decision gate: write-back absent in (a) → Task 7 parses the created ids from deploy
  output and writes them into `wrangler.jsonc` itself; multi-statement refused in (d) →
  Task 9 switches to `--file` with a temp file under `os.tmpdir()` (never the project);
  anything hanging in (c) → Task 7 sets `CI=1` in the child env and re-verifies. Amend the
  affected task briefs in this file before dispatching them.
- [ ] **Step 6: Commit** the verdict doc.

### Task 2: The fake-bin factory (test helper)

**Files:**
- Create: `packages/create-cairn-site/test/fake-bin.mjs`
- Test: `packages/create-cairn-site/test/fake-bin.test.mjs`

**Interfaces:**
- Produces: `makeFakeBin(name) -> Promise<FakeBin>` where `FakeBin` is
  `{ binPath, invocations(), respond(matcher, { code, stdout, stderr }), close() }`.
  - The factory writes, under a fresh `mkdtemp` directory, an executable Node script
    (`#!/usr/bin/env node` shebang, `chmod 0o755`) plus a `responses.json` control file.
    On every run the script appends `{ argv, cwd, stdin }` as one JSON line to
    `invocations.jsonl` beside itself (reading stdin to EOF first, non-blocking when
    empty), then scans `responses.json` for the first entry whose `matcher` (a substring)
    appears in `argv.join(' ')`, prints its `stdout`/`stderr`, and exits with its `code`.
    No match → exit 0 with empty output.
  - `respond(matcher, reply)` rewrites `responses.json` (prepending, so a later, more
    specific matcher wins); `invocations()` parses and returns the JSONL log;
    `close()` removes the directory.
- Consumed by every `src/cloudflare/*.test.mjs`: tests set `CAIRN_WRANGLER_BIN` and
  `CAIRN_NPM_BIN` to `binPath` values, which is what keeps the suite free of real spawns.

- [ ] **Step 1: Write the failing self-test**: a spawned fake bin logs argv, cwd, and piped
  stdin; `respond('deploy', { code: 0, stdout: 'x' })` drives the reply; an unmatched call
  exits 0; two sequential calls append two log lines; `close()` removes the directory.
- [ ] **Step 2: Run it to see it fail** (the test glob change lands with this task: widen
  the package `test` script to add `"src/cloudflare/*.test.mjs"`).
- [ ] **Step 3: Implement `fake-bin.mjs`.** **Step 4: Run the suite green.**
- [ ] **Step 5: Commit** (`test: add the fake-bin factory for the Cloudflare chapter suite`).

### Task 3: The spawn seam

**Files:**
- Create: `packages/create-cairn-site/src/cloudflare/exec.mjs`
- Test: `packages/create-cairn-site/src/cloudflare/exec.test.mjs`

**Interfaces:**
- Produces: `runWrangler(args, { cwd, log, input }) -> Promise<{ code, stdout, stderr }>`
  and `runNpm(args, { cwd, log }) -> Promise<{ code, stdout, stderr }>`. Both spawn via one
  internal `runCommand(bin, binArgs, options)`:
  - `runWrangler` reads `CAIRN_WRANGLER_BIN` **at call time**; when set, spawns that path
    with `args` directly; when unset, spawns `npx` (`npx.cmd` on win32) with
    `['--no-install', 'wrangler', ...args]` in `cwd`.
  - `runNpm` reads `CAIRN_NPM_BIN` at call time; default `npm` (`npm.cmd` on win32).
  - `input`, when given, is written to the child's stdin, which is then ended (the
    secret-put pipe). Never passed through a shell; `shell: false` everywhere but win32
    `.cmd` (the T2 `open.mjs` precedent).
  - stdout/stderr are captured **and** mirrored line-by-line through `log` as they arrive,
    which is the heartbeat rule made structural: a long child is never silent.
  - Non-zero exit does **not** throw (callers map it through the catalogue), with one
    exception the spike forced. **[spike]** "Could not run wrangler at all" is distinct from
    "wrangler ran and failed", and it is not an `ENOENT`: with no `node_modules`, `npx
    --no-install wrangler` exits **1** with `npx canceled due to missing packages and no YES
    option` on stderr. `runWrangler` recognizes that stderr and a spawn `ENOENT` as the same
    condition and rejects with `cloudflareError('wrangler-unavailable', { dir })`; every other
    non-zero exit still comes back as `{ code }`. Every command failure a caller can
    interpret stays the caller's to map.
- Consumes: Task 4's `cloudflareError` **[spike]**, and nothing else above Node built-ins.
- Consumed by Tasks 6-10.

- [ ] **Step 1: Write the failing tests** against Task 2 fake bins: argv and cwd land in the
  invocation log; `input` arrives as the logged stdin; a `respond` non-zero code comes back
  as `{ code }` without throwing; stdout is both captured and mirrored to the injected
  `log`; the env seams are read at call time (set inside the test, not at import); an
  ENOENT bin path rejects with a `wrangler-unavailable` catalogue error; **[spike]** a fake
  bin replying exit 1 with `npx canceled due to missing packages and no YES option` on
  stderr rejects with the same row, while an ordinary exit 1 with other stderr returns
  `{ code: 1 }` without throwing (the two cases must be separable, not merged).
- [ ] **Step 2: Run to fail.** **Step 3: Implement.** **Step 4: Run green.**
- [ ] **Step 5: Commit** (`feat: add the Cloudflare chapter's spawn seam`).

### Task 4: The error catalogue

**Files:**
- Create: `packages/create-cairn-site/src/cloudflare/catalogue.mjs`
- Test: `packages/create-cairn-site/src/cloudflare/catalogue.test.mjs`

**Interfaces:**
- Produces: `cloudflareError(code, params) -> Error` with `err.catalogue = { code, kind,
  next }`, the same shape as T2's `chapterError` so bin.mjs's existing printer needs no
  change. `kind` is `'act'` for every row (nothing here parks or waits on a third party).
  Codes, exact: `wrangler-unavailable`, `login-abandoned`, `install-failed`,
  `build-failed`, `deploy-failed`, `subdomain-unregistered`, `migrations-failed`,
  `secret-put-failed`, `seed-failed`. Rows carrying child output take a `detail` param (the
  child's trailing stderr lines) rendered above the `Next:` line.
- **[spike]** This task is dispatched **before Task 3**, which consumes it: the seam raises
  `wrangler-unavailable` itself. That row's copy names the real cause the spike found (the
  site's dependencies are not installed, so its own wrangler is not on disk) and its `Next:`
  line is `run npm install in {dir}, then re-run npx create-cairn-site --dir {dir}`.

Three examples set the register; the implementer writes the rest to match (every message
names what happened, what it means, and ends with a `Next:` line):

```
deploy-failed:
  "Deploying to Cloudflare did not finish. wrangler reported:
   {detail}
   Nothing on your machine was changed; a deploy that fails part-way is safe to retry.
   Next: fix what wrangler reported above (its message names the setting or limit), then
   re-run npx create-cairn-site --dir {dir}."

subdomain-unregistered:
  "Your Cloudflare account does not have its free workers.dev subdomain yet, so the site
   has nowhere to deploy.
   Next: open https://dash.cloudflare.com/?to=/:account/workers-and-pages and accept the
   suggested workers.dev subdomain (one click, free), then re-run
   npx create-cairn-site --dir {dir}."

seed-failed:
  "The site deployed, but writing your sign-in row to its database did not finish.
   wrangler reported:
   {detail}
   Next: re-run npx create-cairn-site --dir {dir}; the deploy is already done and will be
   skipped, and the sign-in step starts fresh."
```

- [ ] **Step 1: Failing tests**: every code produces a message containing `Next:`; unknown
  code throws; params interpolate; `kind` is `act`; `detail` renders when given.
- [ ] **Step 2-4: Fail, implement, green.**
- [ ] **Step 5: Commit** (`feat: add the Cloudflare chapter's error catalogue`).

### Task 5: wrangler.jsonc naming at scaffold time

**Files:**
- Create: `packages/create-cairn-site/src/cloudflare/config.mjs`
- Modify: `packages/create-cairn-site/src/scaffold.mjs` (the substitution action)
- Test: `packages/create-cairn-site/src/cloudflare/config.test.mjs`, new cases in
  `src/scaffold.test.mjs`

**Interfaces:**
- Produces: `nameWranglerResources(dir, slug) -> Promise<void>`, exact-string and
  fail-loud in the `substitute.mjs` tradition (a missing target names the file and string;
  that throw is the rot gate against showcase drift). On the scaffold's `wrangler.jsonc`:
  - `"name": "cairn-showcase"` → `"name": "<slug>"`
  - `"database_name": "cairn-showcase-auth"` → `"database_name": "<slug>-auth"`, and the
    line `"database_id": "00000000-0000-0000-0000-000000000000",` **removed** (id-less
    binding: deploy auto-provisions; the trailing comma goes with the line)
  - `"database_name": "cairn-showcase-app"` → `"database_name": "<slug>-app"`, and its
    `"database_id": "00000000-0000-0000-0000-000000000001",` line removed
  - `"bucket_name": "cairn-showcase-media"` → `"bucket_name": "<slug>-media"`
  - `PUBLIC_ORIGIN` is left as the template's localhost value; Task 7 writes the real one
    after the first deploy.
  - **Idempotent**: when the file already carries `"name": "<slug>"`, return without
    touching it (a resumed run must not throw the rot gate on its own output).
- Produces: `writePublicOrigin(dir, url) -> Promise<void>`: replaces the value of the
  `PUBLIC_ORIGIN` var (matching `"PUBLIC_ORIGIN": "<any>"` by regex on the one known key,
  since after a resume the old value may already be a workers.dev URL, not localhost);
  used by Task 7.
- Modify `scaffold.mjs`: the existing personalize action's execute calls
  `nameWranglerResources(dir, workerNameFor(answers.name))` after `applySubstitutions`; its
  `detail` grows one sentence naming the wrangler config personalization.
- **[review]** Two corrections to the brief as first written, both caught before dispatch:
  - It said `slugify(answers.name, 'site')`, but `scaffold.mjs` already slugs the package
    name with the fallback `'cairn-site'` and `src/github/chapter.mjs:133` slugs the App and
    repo names the same way. A third fallback would make a site whose name slugs to nothing
    (`!!!`) carry a worker named `site` while its repo is named `cairn-site` and Task 10
    records `workerName: 'cairn-site'`. Use **`'cairn-site'`**, the value already in use.
  - The worker name becomes a **DNS label** in the `workers.dev` hostname, so Cloudflare
    caps it at **63 characters** and forbids a leading or trailing dash. `slugify` handles
    the character set and the dashes but not the length, so a long site name would slug to a
    name the deploy rejects. Produce the name through one small exported helper,
    `workerNameFor(name)`, that slugs with the `'cairn-site'` fallback, truncates to 63, and
    re-trims any trailing dash the cut created. Task 10 imports the same helper rather than
    slugging again, so the consent copy, the config, and `cloudflare.workerName` cannot
    disagree. Test the 63-character boundary and the truncated-to-a-trailing-dash case.
- Consumed by: Task 7; the T2 push (which now pushes a correctly named config, for free,
  because scaffolding precedes the GitHub chapter).

- [ ] **Step 1: Failing tests** against a fixture `wrangler.jsonc` copied verbatim from the
  baked template's: names substituted, both `database_id` lines gone, the result parses as
  JSONC (strip `//` comments, then `JSON.parse`), `migrations_dir` entries untouched,
  second call is a no-op, a doctored fixture missing a target throws naming file and
  string; `writePublicOrigin` replaces localhost and replaces a previous workers.dev value.
  In `scaffold.test.mjs`: a real scaffold run's `wrangler.jsonc` carries the slug names and
  no ids.
- [ ] **Step 2-4: Fail, implement, green.**
- [ ] **Step 5: Commit** (`feat: name wrangler resources for the site at scaffold time`).

### Task 6: The pre-push identity finalize (amends the T2 chapter)

**Files:**
- Create: `packages/create-cairn-site/src/github/finalize.mjs`
- Modify: `packages/create-cairn-site/src/github/chapter.mjs` (the push action)
- Test: `packages/create-cairn-site/src/github/finalize.test.mjs`, new cases in
  `src/github/chapter.test.mjs`

**Interfaces:**
- Produces: `finalizeGithubIdentity(dir, { owner, repo, appId, installationId }) ->
  Promise<void>`. On the scaffold's `src/theme/cairn.config.ts`, replaces the template
  literal (pin the baked template's exact text in a test against the bake output):
  `githubApp({ owner: 'showcase', repo: 'demo', branch: 'main', appId: '1',
  installationId: '2' })` → the same call with the real values (single-quoted strings;
  `appId`/`installationId` are strings, per `githubApp`'s config type). **Idempotent**: when
  the file already contains `owner: '<owner>'` with the real owner, return without
  touching it. Any other state throws the rot-gate error naming the file and the missing
  string (the engine's identity is source-carried by design, `backend.ts:105`; if the
  showcase's backend line changes shape, this must fail loud, not push a broken config).
- Modify `chapter.mjs`: the `Push your site to GitHub` action's execute calls
  `finalizeGithubIdentity(dir, { owner, repo: repoName, appId, installationId })` (all four
  are in scope from the chapter's state at that point) **before** `pushScaffold`, so the
  pushed tree is born with a working backend config. The re-push idempotence is untouched:
  a resumed run at `repo-created` re-runs finalize (no-op the second time) and then
  `pushScaffold`'s existing message check still short-circuits a completed push.
- Consumed by: nothing later; the deployed Worker reads this config from the built site.

- [ ] **Step 1: Failing tests.** `finalize.test.mjs` against a fixture carrying the exact
  template literal: values written; strings stay single-quoted; second call no-op; doctored
  fixture throws naming the file. In `chapter.test.mjs` (fake GitHub): after the happy-path
  chapter, the fake's pushed blob for `src/theme/cairn.config.ts` contains the real
  owner/repo/appId/installationId and not `'showcase'`; the re-push case still makes zero
  additional Git Data POSTs. Add a bake-side lock in `scripts/bake-template.test.mjs`: the
  baked template's `cairn.config.ts` contains the exact literal `finalizeGithubIdentity`
  targets, so showcase drift fails the bake test, not a live run.
- [ ] **Step 2-4: Fail, implement, green.**
- [ ] **Step 5: Commit** (`feat: finalize the App identity into the scaffold before the push`).

### Task 7: Install, build, deploy, migrate

**Files:**
- Create: `packages/create-cairn-site/src/cloudflare/deploy.mjs`
- Test: `packages/create-cairn-site/src/cloudflare/deploy.test.mjs`

**Interfaces:**
- Consumes: Tasks 3 (`runWrangler`, `runNpm`), 4 (`cloudflareError`), 5
  (`writePublicOrigin`).
- Produces (each takes `{ dir, log }` and maps non-zero exits to its catalogue row with the
  child's trailing stderr as `detail`):
  - `ensureInstalled({ dir, log })` — skips with a log line when `<dir>/node_modules`
    exists; else prints the heartbeat ("Installing your site's dependencies; this can take
    a few minutes.") and `runNpm(['install'])`. Failure → `install-failed`.
  - `buildSite({ dir, log })` — heartbeat, `runNpm(['run', 'build'])`. Failure →
    `build-failed`.
  - `ensureLogin({ dir, log, openBrowser }) -> Promise<void>` — `runWrangler(['whoami'])`;
    a zero exit whose stdout carries an account line means logged in (also satisfied by a
    `CLOUDFLARE_API_TOKEN` env, which wrangler honors). Otherwise print the pre-open line
    ("Your browser will open Cloudflare's sign-in; approve wrangler's access") and run
    `runWrangler(['login'])`, which drives its own browser and local callback; non-zero →
    `login-abandoned`. (The tool opens no browser itself here; wrangler owns this trip.)
  - `deployWorker({ dir, log }) -> Promise<{ url }>` — heartbeat, then
    `runWrangler(['deploy'])`; non-zero → `deploy-failed`, except stderr naming the
    subdomain → `subdomain-unregistered`. **[spike]** Match on `workers.dev subdomain` or
    the API code `10063`, the strings wrangler actually prints, not the plan's original
    `/subdomain/i`. The url is parsed from stdout by the spike-(e)-pinned pattern
    (`/https:\/\/[^\s]+\.workers\.dev/`, first match), **after stripping ANSI escapes**:
    **[spike]** wrangler emits them even when stdout is a pipe. No match on a zero exit →
    `deploy-failed` with a detail saying the deploy output carried no URL. **[spike]** No id
    parsing and no write-back into `wrangler.jsonc`: wrangler binds id-less resources by
    name, on the first deploy and on every later one.
  - `applyMigrations({ dir, log })` — `runWrangler(['d1', 'migrations', 'apply', 'AUTH_DB',
    '--remote'])` then the same for `APP_DB`. **[spike]** The binding-name form is confirmed
    against an id-less config, so there is no `names` param and no database-name fallback.
    Failure → `migrations-failed` naming which database.
- Consumed by Task 10 in the order: **[spike]** ensureInstalled → ensureLogin → buildSite →
  deployWorker → writePublicOrigin → applyMigrations → deployWorker again (the origin
  redeploy; its url must equal the first, asserted, since a changed url would mean the
  worker name moved between deploys). The install comes first because the chapter shells out
  through the site's OWN wrangler devDependency, which does not exist until `npm install`
  has run; the login stays ahead of the build so the admin's one browser moment lands before
  the long step rather than after it.

- [ ] **Step 1: Failing tests** with fake bins: `ensureInstalled` skips when node_modules
  exists (zero npm invocations) and runs `install` when absent; `buildSite` failure maps to
  `build-failed` with the fake's stderr in the message; `ensureLogin` with a whoami reply
  carrying an account makes zero further calls, and a failing login maps to
  `login-abandoned`; `deployWorker` parses the url out of a realistic deploy stdout
  (**[spike]** use the verdict doc's real sample, ANSI escapes included, so the strip is
  proven rather than assumed), maps a `workers.dev subdomain` stderr to
  `subdomain-unregistered`, and a urlless success to `deploy-failed`; `applyMigrations`
  invokes both databases in order, by binding name, and names the failing one.
- [ ] **Step 2-4: Fail, implement, green.**
- [ ] **Step 5: Commit** (`feat: add install, build, deploy, and migrations for the chapter`).

### Task 8: The key move

**Files:**
- Create: `packages/create-cairn-site/src/cloudflare/secret.mjs`
- Test: `packages/create-cairn-site/src/cloudflare/secret.test.mjs`

**Interfaces:**
- Consumes: Tasks 3, 4; T1's `loadSite`/`updateSite`.
- Produces: `movePemToWorkerSecret({ siteId, dir, log }) -> Promise<void>`:
  1. `loadSite(siteId)`; when `github.pem` is absent, log "The App's key is already a
     Worker secret." and return (the resume path; also the idempotence).
  2. Base64-encode the PEM (`Buffer.from(pem).toString('base64')`, one line, matching the
     engine's `GITHUB_APP_PRIVATE_KEY_B64` contract in `src/lib/env.ts`) and pipe it as
     stdin to `runWrangler(['secret', 'put', 'GITHUB_APP_PRIVATE_KEY_B64'], { input })`.
     Non-zero → `secret-put-failed`.
  3. Only on success: `updateSite(siteId, { github: { pem: undefined } })` (the deep merge
     spreads the undefined over the old value and `JSON.stringify` drops the key), then log
     that the key now lives only in the Worker and that regenerating it at the App's
     settings page is the recovery if it is ever lost.
- Consumed by Task 10 after the redeploy.

- [ ] **Step 1: Failing tests** with a fake wrangler and a seeded state record: the fake's
  invocation log shows `secret put GITHUB_APP_PRIVATE_KEY_B64` with the base64 PEM as
  stdin; the state record afterwards has **no `pem` key** while `appId`, `clientSecret`,
  and the rest survive (the deep-merge survival assertion); a second call makes zero
  wrangler invocations; a failing put leaves the PEM in state (assert present) and maps to
  `secret-put-failed`.
- [ ] **Step 2-4: Fail, implement, green.**
- [ ] **Step 5: Commit** (`feat: move the App key from local state to a Worker secret`).

### Task 9: The bootstrap seed

**Files:**
- Create: `packages/create-cairn-site/src/cloudflare/bootstrap.mjs`
- Test: `packages/create-cairn-site/src/cloudflare/bootstrap.test.mjs`

**Interfaces:**
- Consumes: Tasks 3, 4; `node:crypto`.
- Produces: `seedOwnerAndToken({ dir, email, log, now }) -> Promise<{ confirmPath }>`
  (`now` injectable for tests, default `Date.now()`):
  1. Normalize the email (trim, lowercase), matching the store's own invariant
     (`src/lib/auth/store.ts` normalizes every path; the seed writes what a lookup finds).
  2. Generate the raw token exactly as the engine does: 32 random bytes, base64url, no
     padding (`randomBytes(32).toString('base64url')`); hash it the engine's way:
     `createHash('sha256').update(token).digest('hex')` (lowercase hex,
     `src/lib/auth/crypto.ts`'s `hashToken`).
  3. Build the SQL (single-quote-escape the email by doubling; the hash and numbers are
     generated, not user input):

```sql
INSERT INTO editor (email, display_name, role, created_at)
  VALUES ('<email>', '<local part of email>', 'owner', <now>)
  ON CONFLICT(email) DO NOTHING;
DELETE FROM magic_token WHERE email = '<email>';
INSERT INTO magic_token (token_hash, email, expires_at, created_at)
  VALUES ('<hash>', '<email>', <now + 600000>, <now>);
```

     (Ten minutes, the engine's own `TOKEN_TTL_MS`. The DELETE mirrors `issueToken`'s
     replace-any-prior semantics so a re-run never leaves two live tokens. The owner's
     display name defaults to the email's local part; the admin edits it later in the
     admin. The `session` table is never touched; the confirm click mints the session
     through the engine.)
  4. `runWrangler(['d1', 'execute', 'AUTH_DB', '--remote', '--command', sql])`. **[spike]**
     Multi-statement `--command` is confirmed accepted (all three statements ran as one
     invocation), so the `--file` fallback is **dropped**: no temp file, no `finally`
     cleanup, no branch. Non-zero → `seed-failed`.
  5. Return `{ confirmPath: '/admin/auth/confirm?token=' + encodeURIComponent(token) }`.
     The raw token is returned only inside this path string and is never written to disk
     or state.
- Consumed by Task 10, which joins it to `cloudflare.url` and hands the full URL to
  `openBrowser`.

- [ ] **Step 1: Failing tests** with a fake wrangler: the invocation's `--command` SQL
  contains the normalized (lowercased) email, an `ON CONFLICT` owner insert, the DELETE,
  and a 64-char lowercase-hex hash; the returned `confirmPath` carries a token whose
  Node-computed sha256 hex equals the hash in the SQL (the round-trip proof that the
  engine's lookup will match); an email with a quote (`o'brien@…`) is escaped by doubling;
  a failing execute maps to `seed-failed`; nothing under the scaffold dir or
  `CAIRN_STATE_DIR` gains the raw token (scan both).
- [ ] **Step 2-4: Fail, implement, green.**
- [ ] **Step 5: Commit** (`feat: seed the owner and a bootstrap sign-in token in D1`).

### Task 10: The chapter orchestration

**Files:**
- Create: `packages/create-cairn-site/src/cloudflare/chapter.mjs`
- Modify: `packages/create-cairn-site/src/args.mjs`, `packages/create-cairn-site/bin.mjs`
- Test: `packages/create-cairn-site/src/cloudflare/chapter.test.mjs` (+ new cases in
  `src/args.test.mjs`)

**Interfaces:**
- Consumes: everything above, plus T1's `defineAction`/`runActions`, `updateSite`/
  `loadSite`, T2's `openBrowser` (`../github/open.mjs`) and its single-action-batch
  `runStep` pattern (`src/github/chapter.mjs:69`).
- Produces (args.mjs): string option `owner-email` (surfaced `ownerEmail`), booleans
  `deploy` and `sign-in` (surfaced `deploy`, `signIn`, default false).
- Produces (chapter.mjs): `runCloudflareChapter({ siteId, siteName, dir, flags, log,
  dryRun, openBrowser? }) -> Promise<'live' | 'declined'>`. Flow, each numbered piece an
  Action through the runner so `--dry-run` prints every title and detail and executes
  nothing:
  1. **Consent.** Printed summary first: "The tool will now install your site's
     dependencies, build it, and deploy it to Cloudflare's free workers.dev hosting on
     your account: one Worker named `<slug>` (deploying again later updates it), two
     databases (`<slug>-auth`, `<slug>-app`), and one storage bucket (`<slug>-media`).
     The free plan is enough; nothing in this step costs money. One browser trip to sign
     in to Cloudflare if you are not already, then one click to sign in to your own site."
     Then `confirm`. Non-interactive: `--yes` without `--deploy` skips with a printed
     re-run line naming `--deploy`; `--yes --deploy` opts in. Declined → `'declined'`.
  2. **Owner prompt.** `text` for the sign-in email, prefilled from `--owner-email`;
     validation: must contain `@` with a non-empty local and domain part; re-prompt
     otherwise. Persist immediately: `updateSite(siteId, { ownerEmail })`.
  3. **Actions**, in order, catalogue errors propagating to bin.mjs's existing printer.
     **[spike]** The install action comes FIRST, ahead of the login: the chapter shells out
     through the site's own wrangler devDependency, and on a fresh scaffold `node_modules`
     does not exist yet, so a login-first order fails on every fresh run.
     - `Install your site's dependencies` → `ensureInstalled`.
     - `Sign in to Cloudflare` → `ensureLogin`.
     - `Build your site` → `buildSite`.
     - `Deploy to workers.dev` → `deployWorker` → `writePublicOrigin(dir, url)` →
       `applyMigrations` → `deployWorker` again (assert same url) → `updateSite(siteId,
       { step: 'deployed', cloudflare: { url, workerName } })`, where `workerName` comes from
       Task 5's exported `workerNameFor(siteName)` **[review]**, never a second slug call, so
       the consent copy, `wrangler.jsonc`, and the state record cannot disagree.
     - `Protect your site's App key` → `movePemToWorkerSecret`.
     - `Sign you in` → `seedOwnerAndToken` (email from state) → open
       `<url><confirmPath>` via `openBrowser` with the printed-URL fallback → print "A
       sign-in page just opened; click Sign in there. The link works for ten minutes; if
       it expires, re-run with --sign-in for a fresh one." → `updateSite(siteId,
       { step: 'live' })`.
  4. Return `'live'`.
- Produces (bin.mjs):
  - `RESUMABLE_STEPS` gains `'pushed'` and `'deployed'` (the GitHub-chapter list is
    unchanged; the resume dispatcher now picks the chapter by step: GitHub steps →
    `runGithubChapter` then fall through to the Cloudflare chapter on `'pushed'`;
    `'pushed'`/`'deployed'` → `runCloudflareChapter` directly).
  - The fresh-run path calls `runCloudflareChapter` when `runGithubChapter` returns
    `'pushed'`; `'parked'`/`'declined'` stop as today.
  - A record at `'live'`: print "This site is set up end to end." plus `printLiveInfo`,
    which grows the live site line (`Your site is live at: <cloudflare.url>` and its
    `/admin`) above the repo/App lines, and drops the "next chapter" stub when
    `cloudflare.url` exists. With `--sign-in`, reseed and reopen (steps 3's last action
    only) instead of just printing.
  - Dry-run: after the GitHub chapter's dry-run listing, `runCloudflareChapter` runs with
    `dryRun: true` (prompts nothing, defaults the owner email to a placeholder note in the
    detail text, spawns nothing).
- The user-facing hand-over (the `'live'` return in bin.mjs) prints: the live URL and
  `/admin`, what exists now (Worker, two databases, bucket, the key as a Worker secret),
  "your domain and email arrive with the next chapter", and the doctor line.

- [ ] **Step 1: Failing tests.** Drive `runCloudflareChapter` end to end with fake bins,
  injected `openBrowser`/`log`, a state record at `'pushed'` carrying T2-shaped `github`
  fields, `flags: { yes: true, deploy: true, ownerEmail: 'T3@Example.com ' }`: the happy
  path returns `'live'`; the state walks `pushed → deployed → live` with `cloudflare.url`
  set, `ownerEmail` normalized on insert (the SQL shows lowercase), and `github.pem` gone
  at `'live'` while `appId` survives; **[spike]** the fake bins' logs show the exact order
  npm install → wrangler whoami → npm run build → deploy → migrations ×2 → deploy → secret
  put → d1 execute, with the install strictly before the first wrangler call (the assertion
  that keeps the spike's ordering defect from coming back); the
  second deploy's url mismatch case throws with a `Next step:`; `--yes` without `--deploy`
  skips with the re-run line and zero spawns; declining the interactive consent returns
  `'declined'`; dry-run makes **zero** fake-bin invocations (the instrument) and prints
  every action title; a `deploy-failed` run leaves step at `'pushed'` and a re-run
  re-enters at the install action (node_modules now present → skip line). In
  `args.test.mjs`: the three new flags parse and default.
- [ ] **Step 2-4: Fail, implement, green.**
- [ ] **Step 5: Commit** (`feat: wire the Cloudflare chapter into create-cairn-site`).

### Task 11: Resume, re-entry, and the cross-cutting safety net

**Files:**
- Modify: `packages/create-cairn-site/bin.mjs` (only if Task 10 left gaps),
  `packages/create-cairn-site/src/cloudflare/chapter.mjs` (re-entry skips)
- Test: new cases in `src/cloudflare/chapter.test.mjs` and (bin-level) a new
  `packages/create-cairn-site/test/resume-cloudflare.test.mjs`

**Interfaces:**
- Chapter re-entry by `step`, mirroring T2's Task 11: a record at `'deployed'` skips
  consent re-confirmation (one log line: "Resuming <name> at deployed."), skips the
  deploy action group entirely (zero deploy/migrations invocations, asserted), and runs
  only the key move (no-op when the PEM is gone) and the sign-in action; a record at
  `'pushed'` runs the whole chapter without re-asking the owner email when
  `state.ownerEmail` exists (`--owner-email` overrides it, noted in the resume line, the
  T2 override convention).
- The no-secret sweep, extended: after a full happy path, scan the scaffold dir and every
  state file for `PRIVATE KEY`, the base64 PEM prefix, and the raw bootstrap token; all
  three must be absent (the state's PEM was deleted at the key move; the token was never
  written).

- [ ] **Step 1: Failing tests**: the `'deployed'` re-entry (fake-bin log shows zero
  deploy invocations, one secret/no-op line, one seed); the `'pushed'` re-entry with saved
  `ownerEmail` prompts nothing (inject a prompt fake that throws if called); `--sign-in`
  at `'live'` reseeds (exactly one `d1 execute` invocation, no deploys) and reopens the
  browser (injected opener called once); the secret sweep passes on the happy path and is
  falsifiable (doctor a state file to contain `PRIVATE KEY` and assert the sweep's helper
  catches it, so the assertion is proven able to fail).
- [ ] **Step 2-4: Fail, implement, green.**
- [ ] **Step 5: Commit** (`feat: add Cloudflare chapter resume and the secret sweep`).

### Task 12: The live e2e (main loop + Geoff's two small moments)

**Files:**
- Create: evidence recorded in this plan's post-mortem; divergence notes appended to
  `docs/internal/2026-08-10-t3-cloudflare-spike.md`

After Tasks 2-11 are green. One sitting on the glw907 account; Geoff's moments are at most
`wrangler login` (skippable if the env token stands in) and the one confirm click.

- [ ] **Step 1: Full run.** From a scratch directory with tarball-baked template (the CI
  pattern), run the T1+T2+T3 flow end to end (`--yes --github --deploy` with flags for the
  names) against real GitHub and real Cloudflare. Verify: the site loads at its
  workers.dev URL; `/admin` redirects to login; the bootstrap confirm click signs in (this
  is Geoff's click). **[spike]** If any part of the confirm is scripted rather than clicked,
  post to `?/confirm` (the bare path 404s) and send a browser-like `Accept` header, or
  SvelteKit returns its action-result envelope under HTTP 200 instead of the 303. Also
  verify: the pushed repo's `cairn.config.ts` carries the real identity; **[spike]** the
  deployed `wrangler.jsonc` is UNCHANGED and still id-less (wrangler writes nothing back,
  and the bindings resolve by name anyway); `wrangler secret list` shows
  `GITHUB_APP_PRIVATE_KEY_B64`; the state record is at `'live'`, mode 0600, with no PEM
  and no token material; a save in the signed-in admin commits to the repo through the
  App (the whole chain proven).
- [ ] **Step 2: Interrupted resume.** Kill a second run after `deployed`, re-run, confirm
  it resumes without re-deploying (watch the output for the skip) and completes to
  `'live'`.
- [ ] **Step 3: Tear down** both runs' artifacts: Workers, D1 pairs, buckets, the GitHub
  repos and Apps (App deletion is by hand on github.com, the T2 lesson). Verify by listing,
  never by assuming. **[spike]** `wrangler delete` deletes the Worker and then fails on the
  way out (`Unable to get membership roles`), because the standing estate token lacks
  `User->Memberships->Read`; `DELETE /accounts/{id}/workers/scripts/{name}?force=true` is
  the clean path and the token covers it. Confirm the `workers.dev` hostname 404s, since the
  edge serves the deleted Worker for a short while after.
- [ ] **Step 4: Record the evidence** (commands, statuses, Geoff-moment count, teardown)
  in the post-mortem. Any divergence between the fake bins and real tools is a Task 2/3
  bug to fix in this pass, with the fakes corrected and the suite re-run.

### Task 13: Docs, tracking, and pass close

**Files:**
- Modify: `packages/create-cairn-site/README.md`, `CHANGELOG.md`, `ROADMAP.md`,
  `docs/internal/docs-friction-log.md` (triage check), `docs/STATUS.md`, this plan
  (post-mortem)

- [ ] **Step 1: README.** The package README gains the Cloudflare chapter: what gets
  created and where, the free-plan framing, the new flags (`--deploy`, `--owner-email`,
  `--sign-in`), resume behavior, the key move (the PEM's home is the Worker; regeneration
  is the recovery), and the bootstrap sign-in. Follow the existing README's register.
- [ ] **Step 2: CHANGELOG.** Extend the `## Unreleased` create-cairn-site entry with the
  chapter (deploy, migrations, key move, bootstrap sign-in, the pre-push identity
  finalize). `Consumers must: nothing` (the tool is unpublished; no engine surface
  changed).
- [ ] **Step 3: Friction log.** Complete-or-move per the log's header **if** this pass
  touched the files its hardening entry names; otherwise leave it, untouched, for the pass
  that does.
- [ ] **Step 4: ROADMAP.** Mark the T3 slice done in place; record the three-pass split
  (T4 chapter 2 + Builds, T5 the browser door) where the create-cairn-site item lives, so
  the spec's briefs have a roadmap home.
- [ ] **Step 5: Doc gates by name**: `npm run check:reference`,
  `check:reference:signatures`, `check:docs`, `check:package`; `check:snippets` only if a
  fenced block under `docs/guides` or `docs/reference` was touched (none is expected).
- [ ] **Step 6: Pass-end ritual** per `cairn-pass`: code-simplifier over the pass's changed
  files; root `npm run check` 0/0; root `npm test` exit 0; `check:comments`;
  `check:surface` (no engine change expected; a flag means a leak to understand, not
  snapshot); push the branch and confirm all six CI workflows green. Append the
  post-mortem to this plan; update STATUS (T3 done, T4 planning sitting next, with the
  resume prompt); prep the context clear.

---

## Self-review notes

Spec coverage: consent with free-plan framing and named resources (Task 10.1, spec flow 1);
wrangler-session-only, no tool credential (Tasks 3, 7; spec flow 2); the owner prompt
persisted to state, never the scaffold (Task 10.2, spec flow 3); scaffold-time naming with
id-less bindings and the source-carried identity finalize before the push (Tasks 5, 6; spec
flow 4, as amended by the sitting's `backend.ts` verification); deploy-then-migrate with
the two-deploy origin shape and same-url assertion (Task 7, spec flow 5); the key move with
state deletion and recovery copy (Task 8, spec flow 6); the bootstrap riding the engine's
own tables, hashing, TTL, and confirm page, session table untouched (Task 9, spec flow 7);
the hand-over with the T4 stub and doctor line (Task 10, spec flow 8); steps
`deployed`/`live`, the `cloudflare` state section, resume by step with `--sign-in`
recovery (Tasks 10, 11); the catalogue rows all triggered (Tasks 4, 7-10; the
`bootstrap-token-expired` row became the `--sign-in` recovery printed in the sign-in
action's copy rather than a detectable error, since the tool cannot observe the click);
fake bins and the desktop rule (Tasks 2, 3, global); dry-run zero-invocations (Task 10);
the spike with decision gates (Task 1); the live e2e with resume and teardown (Task 12);
docs, ROADMAP split recording, friction-log condition (Task 13). Out-of-scope items
(chapter 2, Builds, console, template repo, Registrar) appear in no task.

Type consistency: `runWrangler`/`runNpm` (3) consumed by 7-9; `cloudflareError` (4) by
7-10; `nameWranglerResources`/`writePublicOrigin` (5) by scaffold and 7;
`finalizeGithubIdentity` (6) by the T2 chapter; `ensureLogin`/`ensureInstalled`/
`buildSite`/`deployWorker`/`applyMigrations` (7), `movePemToWorkerSecret` (8), and
`seedOwnerAndToken` (9) by 10; `FakeBin` (2) by every cloudflare test; the step enum
(header) matches Task 10's hops and Task 11's re-entry list; flags `deploy`/`ownerEmail`/
`signIn` consistent across args, chapter, and bin.
