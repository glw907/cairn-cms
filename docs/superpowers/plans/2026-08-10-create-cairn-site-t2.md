# create-cairn-site Pass T2 (the GitHub chapter) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking. In this repo the executor is `cairn-implementer`
> per task, orchestrated by the main loop, except Tasks 1 and 13, which are main-loop tasks
> needing Geoff's browser.

**Goal:** After the local value moment, the tool creates a GitHub App the admin owns
(manifest flow), uses that App as its OAuth client to create and push the content repo with
no git binary, walks the guided installation, parks and resumes the org-approval state, and
makes the scaffolded site's bare `npm run dev` reach the local admin.

**Architecture:** Manifest-first (the spec's one design change against the umbrella): the
manifest exchange needs no credential and returns the App's `client_id`/`client_secret`/PEM,
so the admin's own App is the OAuth client and no standing OAuth infrastructure exists. All
GitHub traffic flows through one fetch wrapper whose base URLs come from env seams, so the
node:test suite runs against a local fake GitHub server and every error-catalogue row is
triggered, not read. Side effects stay Actions through the T1 runner, so `--dry-run` prints
the whole chapter and performs none of it.

**Tech Stack:** plain ESM `.mjs` on `node:test`; Node 22 built-ins only (`fetch`,
`node:http`, `node:crypto` for RS256); `@clack/prompts` (already a dependency). No new
dependencies.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-10-create-cairn-site-t2-design.md`. The umbrella:
  `docs/superpowers/specs/2026-08-09-admin-setup-and-docs-reset-design.md`.
- Node floor `>=22` (`engines.node`); no dependency may be added to `package.json`.
- **No secret is ever written under the project directory.** App credentials go in the T1
  state store (`saveSite`, mode 0600). The user access token is held in memory only and never
  persisted anywhere.
- **Tokens are opaque** (spike F): never parse, measure, pattern-match, or truncate an
  installation or user token; nothing may assume a length or shape.
- **Every exit prints a next step.** No run may terminate on a bare error; failure paths go
  through the catalogue (Task 5) or print an explicit `Next step:` line.
- Env seams are read **at call time**, never cached at module load (the `state.mjs`
  precedent): `CAIRN_GITHUB_API_BASE` (default `https://api.github.com`),
  `CAIRN_GITHUB_WEB_BASE` (default `https://github.com`), `CAIRN_STATE_DIR` (existing).
- Comments follow the repo's TSDoc-shaped JSDoc style visible in `src/*.mjs`; no em dashes in
  comments. Every commit runs the package suite (`npm --prefix packages/create-cairn-site
  test`) green before it lands.
- Worktree: a fresh worktree off `main`. Remember the durable gotcha: worktree edits target
  the worktree path.

## File Structure

```
packages/create-cairn-site/
  src/github/loopback.mjs      one-shot loopback HTTP receiver (+ .test.mjs)
  src/github/jwt.mjs           App JWT, RS256 via node:crypto (+ .test.mjs)
  src/github/api.mjs           fetch wrapper, env-seam base URLs (+ .test.mjs)
  src/github/catalogue.mjs     the error catalogue (+ .test.mjs)
  src/github/manifest.mjs      manifest build + flow + exchange (+ .test.mjs)
  src/github/oauth.mjs         web-flow user token against the admin's App (+ .test.mjs)
  src/github/repo.mjs          repo create + Git Data push (+ .test.mjs)
  src/github/install.mjs       install URL, JWT polling, org parking (+ .test.mjs)
  src/github/chapter.mjs       orchestration: consent, prompts, actions, state machine (+ .test.mjs)
  src/github/open.mjs          cross-platform browser opener with printed-URL fallback
  test/fake-github.mjs         the fake GitHub server (test helper, not shipped)
Modified: src/args.mjs, src/state.mjs, src/scaffold.mjs, bin.mjs,
  scripts/bake-template.mjs, package.json (test glob), README.md,
  .github/workflows/create-site.yml
```

State shape after this pass (the T1 record grows a `github` section; `step` becomes the
resume key):

```js
{
  name, dir,                 // T1 fields, unchanged
  step,                      // 'scaffolded' | 'app-created' | 'repo-created' | 'pushed'
                             //   | 'awaiting-org-approval' | 'installed'
  github: {
    appId, appSlug, clientId, clientSecret, pem, webhookSecret,
    owner, ownerType,        // ownerType: 'user' | 'org'
    repo, installationId,    // repo present from 'repo-created'; installationId from 'installed'
  },
}
```

---

### Task 1: The spike (main loop + Geoff; decision gate for Tasks 7-8)

**Files:**
- Create: `docs/internal/2026-08-10-t2-own-app-spike.md` (the recorded verdict)

The design rests on one unverified premise: **a user access token from a fine-grained GitHub
App can call `POST /user/repos`.** Verify it against real GitHub before any flow code is
dispatched. This is a main-loop task; it needs Geoff signed into github.com once.

- [ ] **Step 1: Write the throwaway spike script** at `$CLAUDE_JOB_DIR/tmp/spike.mjs` (never
  in the repo). It is the miniature of the whole chapter:

```js
// Spike: manifest flow -> own-App web-flow OAuth -> POST /user/repos. Run: node spike.mjs
import http from 'node:http';
const manifest = {
  name: `cairn-spike-${Date.now().toString(36)}`,
  url: 'https://example.com',
  redirect_url: 'http://127.0.0.1:8977/manifest',
  callback_urls: ['http://127.0.0.1:8977/callback'],
  public: false,
  default_permissions: { contents: 'write', administration: 'write' },
  default_events: [],
};
const server = http.createServer();
const once = (route) => new Promise((resolve) => {
  server.on('request', (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1:8977');
    if (url.pathname !== route) return;
    res.end('ok, return to the terminal');
    resolve(url.searchParams);
  });
});
server.listen(8977, '127.0.0.1');
// Serve the auto-submitting manifest form on /, per GitHub's manifest-flow docs.
server.on('request', (req, res) => {
  if (new URL(req.url, 'http://x').pathname !== '/') return;
  res.setHeader('content-type', 'text/html');
  res.end(`<form action="https://github.com/settings/apps/new" method="post">
    <input type="hidden" name="manifest" value='${JSON.stringify(manifest)}'>
    <button>Create the spike App</button></form>`);
});
console.log('Open http://127.0.0.1:8977/ and click the button.');
const code = (await once('/manifest')).get('code');
const conv = await fetch(`https://api.github.com/app-manifests/${code}/conversions`, {
  method: 'POST', headers: { accept: 'application/vnd.github+json' },
});
const app = await conv.json();
console.log('App created:', app.slug, app.client_id);
console.log(`Open https://github.com/login/oauth/authorize?client_id=${app.client_id}` +
  `&redirect_uri=${encodeURIComponent('http://127.0.0.1:8977/callback')}&state=spike`);
const oauthCode = (await once('/callback')).get('code');
const tok = await (await fetch('https://github.com/login/oauth/access_token', {
  method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/json' },
  body: JSON.stringify({ client_id: app.client_id, client_secret: app.client_secret,
    code: oauthCode, redirect_uri: 'http://127.0.0.1:8977/callback' }),
})).json();
const repo = await fetch('https://api.github.com/user/repos', {
  method: 'POST',
  headers: { accept: 'application/vnd.github+json', authorization: `Bearer ${tok.access_token}` },
  body: JSON.stringify({ name: `cairn-spike-repo-${Date.now().toString(36)}`, private: true }),
});
console.log('POST /user/repos ->', repo.status, JSON.stringify(await repo.json()).slice(0, 300));
server.close();
```

- [ ] **Step 2: Run it in one Geoff browser sitting** (`! node
  $CLAUDE_JOB_DIR/tmp/spike.mjs` or backgrounded). Two clicks: create the App, authorize it.
  Record the `POST /user/repos` status.
- [ ] **Step 3: Also record** whether the manifest `callback_urls` loopback form worked
  as-is (it verifies the loopback-redirect premise for GitHub Apps), and delete the spike App
  and repo from github.com settings in the same sitting.
- [ ] **Step 4: Write the verdict** to `docs/internal/2026-08-10-t2-own-app-spike.md`: the
  exact requests, statuses, and the decision.
  - **201 Created** → the design stands; proceed with Tasks 2-14 as written.
  - **403/404** → STOP and re-plan Tasks 7-8 against the spec's named fallback (guided
    browser repo-create plus installation-token push; the OAuth module and Task 7's
    `createRepo` are what change; the manifest, install, and push layers survive). Amend this
    plan file before dispatching further tasks.
- [ ] **Step 5: Commit** the verdict doc.

### Task 2: The fake GitHub server (test helper)

**Files:**
- Create: `packages/create-cairn-site/test/fake-github.mjs`
- Test: `packages/create-cairn-site/test/fake-github.test.mjs`

**Interfaces:**
- Produces: `startFakeGithub(options?) -> Promise<FakeGithub>` where `FakeGithub` is
  `{ apiBase, webBase, state, failNext(route, status, body), close() }`. `state` exposes
  `{ apps: [], repos: [], installations: [], gitObjects: Map }` for assertions. Every later
  module test consumes this by setting `CAIRN_GITHUB_API_BASE = apiBase` and
  `CAIRN_GITHUB_WEB_BASE = webBase` around the test.

One `node:http` server, in-memory state, both "web" and "api" personalities on one port
(paths distinguish them; the wrapper only needs the bases to resolve). Routes to implement,
each returning GitHub's real JSON shape for the fields the tool reads:

- `POST /app-manifests/:code/conversions` → 201 `{ id, slug, client_id, client_secret, pem,
  webhook_secret, html_url, owner: { login } }`. The PEM is a real throwaway RSA key
  generated once per server start with `generateKeyPairSync('rsa', { modulusLength: 2048 })`
  so Task 9's JWT verification is real. A code of `expired` → 404 (the catalogue row).
- `GET /login/oauth/authorize` → 302 to the request's `redirect_uri` with `?code=fake-code`
  and the caller's `state` echoed (the tests follow the redirect manually).
- `POST /login/oauth/access_token` → `{ access_token: 'fake-user-token' }`; after
  `failNext('access_token', 200, { error: 'bad_verification_code' })`, that body instead.
- `POST /user/repos`, `POST /orgs/:org/repos` → 201 `{ name, full_name, owner: { login },
  default_branch: 'main' }`; a duplicate name → 422 with GitHub's `name already exists`
  errors array.
- `POST /repos/:owner/:repo/git/blobs|trees|commits`, `POST /repos/:owner/:repo/git/refs` →
  shas recorded in `state.gitObjects`; the refs route rejects a second create of the same
  ref (409) so idempotent re-push must go through a ref check.
- `GET /repos/:owner/:repo/git/ref/heads/main` → 200 with the ref once created, else 404
  (the re-push detection seam).
- `GET /app/installations` → the array in `state.installations`; requires a `Bearer` header
  that parses as a JWT signed by the server's PEM (verify with `createVerify`; a bad
  signature → 401). Tests push `{ id, account: { login } }` rows to simulate the admin
  completing the browser install.
- `GET /user` → `{ login: 'fake-admin' }`; `GET /orgs/:org/memberships/:user` → role from
  `state`, default `admin`.
- `failNext(route, status, body)` arms a one-shot override for the next hit on that route
  (route names: `'conversions' | 'access_token' | 'authorize' | 'user_repos' | 'org_repos' |
  'blobs' | 'trees' | 'commits' | 'refs' | 'installations' | 'user' | 'membership'`). This is
  how every catalogue row is triggered.

- [ ] **Step 1: Write the failing self-test** (`test/fake-github.test.mjs`): start the
  server, exchange a manifest code, create a repo, arm `failNext('user_repos', 403, {
  message: 'Resource not accessible' })`, see the 403 once and 201 after, close.
- [ ] **Step 2: Run it to see it fail** (`npm --prefix packages/create-cairn-site test` —
  note: the test glob change lands in Step 3).
- [ ] **Step 3: Implement `fake-github.mjs`**, and widen the package test script to
  `"test": "node --test \"src/*.test.mjs\" \"src/github/*.test.mjs\" \"scripts/*.test.mjs\"
  \"test/*.test.mjs\""`.
- [ ] **Step 4: Run the suite green.**
- [ ] **Step 5: Commit** (`test: add a fake GitHub server for the T2 chapter suite`).

### Task 3: The loopback receiver

**Files:**
- Create: `packages/create-cairn-site/src/github/loopback.mjs`
- Test: `packages/create-cairn-site/src/github/loopback.test.mjs`

**Interfaces:**
- Produces: `startLoopback({ landingHtml }) -> Promise<{ port, url, serveForm(html),
  waitFor(pathname, { timeoutMs }) -> Promise<URLSearchParams>, close() }>`. `url` is
  `http://127.0.0.1:<port>`. `waitFor` resolves with the query params of the first GET whose
  pathname matches, responding to the browser with `landingHtml` (default: "You can return
  to the terminal."). It rejects with `new Error('loopback: timed out waiting for
  <pathname>')` after `timeoutMs` (default 10 minutes). `serveForm(html)` sets the body
  served at `/` (the manifest auto-submit page). Tasks 6 and 7 consume this.

- [ ] **Step 1: Write the failing tests**: binds an ephemeral port on 127.0.0.1; `waitFor`
  resolves with params when the path is hit (drive it with `fetch`); a hit on a different
  path does not resolve it; the timeout rejects (use a 50 ms timeout in the test); `close()`
  frees the port.
- [ ] **Step 2: Run to fail.**
- [ ] **Step 3: Implement** on `node:http` (the T1 `checkLoopback` shows the listen
  pattern; one server, listeners registered per `waitFor`).
- [ ] **Step 4: Run green.**
- [ ] **Step 5: Commit** (`feat: add the loopback receiver for the GitHub chapter`).

### Task 4: App JWT and the API wrapper

**Files:**
- Create: `packages/create-cairn-site/src/github/jwt.mjs`,
  `packages/create-cairn-site/src/github/api.mjs`
- Test: `packages/create-cairn-site/src/github/jwt.test.mjs`,
  `packages/create-cairn-site/src/github/api.test.mjs`

**Interfaces:**
- Produces: `appJwt(appId, pem, nowSeconds?) -> string` (RS256; payload `{ iat: now - 60,
  exp: now + 540, iss: String(appId) }`; base64url segments; `createSign('RSA-SHA256')`).
- Produces: `apiBase()`, `webBase()` (env seams, call-time reads, defaults above), and
  `githubRequest(method, path, { token, jwt, body, accept } = {}) -> Promise<{ status,
  json }>`. It sets `accept: 'application/vnd.github+json'` by default,
  `authorization: Bearer <token or jwt>` when given, JSON-encodes `body`, and **never throws
  on a non-2xx status**: callers map statuses through the catalogue. It throws only on a
  network-level failure, wrapped as `new Error('github: could not reach <url> (<code>)',
  { cause })`.
- Consumes: nothing from other tasks (the fake server tests it).

- [ ] **Step 1: Write the failing tests.** `jwt.test.mjs`: generate a keypair in the test,
  sign, verify the signature with `node:crypto` `createVerify` and assert the decoded payload
  fields (this is a real verification, not a shape check). `api.test.mjs`: against the fake
  server, a `POST` round-trips a body; a 422 comes back as `{ status: 422 }` without
  throwing; the token lands in the `authorization` header (fake echoes it via `GET /user`);
  base URLs come from the env at call time (set the env inside the test, not at import).
- [ ] **Step 2: Run to fail.** **Step 3: Implement.** **Step 4: Run green.**
- [ ] **Step 5: Commit** (`feat: add App JWT signing and the GitHub API wrapper`).

### Task 5: The error catalogue

**Files:**
- Create: `packages/create-cairn-site/src/github/catalogue.mjs`
- Test: `packages/create-cairn-site/src/github/catalogue.test.mjs`

**Interfaces:**
- Produces: `chapterError(code, params) -> Error` with `err.catalogue = { code, kind,
  next }` and `err.message` the full printed text. `kind` is `'wait' | 'act' |
  'ask-someone'`. Codes (the spec's rows, exact set): `consent-denied`, `code-expired`,
  `manifest-window-expired`, `app-name-collision`, `repo-name-collision`,
  `org-approval-pending`, `sso-blocked`, `push-interrupted`. Tasks 6-10 consume
  `chapterError`; bin.mjs prints `err.message` and exits per `kind` (`org-approval-pending`
  parks, everything else exits 1).

Each message is literal text ending in the one next command. Write them exactly; the tests
pin them. Two examples to set the register (the implementer writes the rest to match; every
message names what happened, what it means, and ends with a `Next:` line):

```
manifest-window-expired:
  "GitHub's one-hour window for collecting the new App's credentials has passed, so the App
   ({appName}) may exist while its key was never collected and cannot be recovered.
   Next: delete the App at {webBase}/settings/apps if it exists, then re-run
   npx create-cairn-site --dir {dir} (pick a new name with --app-name if the old one is taken)."
kind: act

org-approval-pending:
  "Your organization ({org}) requires an owner to approve the App installation. The request
   is filed; nothing is lost, and this run has saved its progress.
   Next: ask an owner of {org} to approve the installation of {appName} (Settings ->
   Third-party access -> GitHub Apps), then re-run npx create-cairn-site --dir {dir}."
kind: ask-someone
```

- [ ] **Step 1: Failing tests**: every code produces a message containing `Next:`; unknown
  code throws; params are interpolated; `kind` matches the table.
- [ ] **Step 2-4: Fail, implement, green.**
- [ ] **Step 5: Commit** (`feat: add the GitHub chapter's error catalogue`).

### Task 6: The manifest flow

**Files:**
- Create: `packages/create-cairn-site/src/github/manifest.mjs`
- Test: `packages/create-cairn-site/src/github/manifest.test.mjs`

**Interfaces:**
- Consumes: `startLoopback` (Task 3), `githubRequest`/`webBase` (Task 4), `chapterError`
  (Task 5), `slugify` (T1).
- Produces: `buildManifest({ appName, loopbackUrl }) -> object` (exactly the spike's shape:
  `default_permissions: { contents: 'write', administration: 'write' }`, `public: false`,
  `default_events: []`); `manifestFormHtml(manifest, targetUrl) -> string` (the auto-submit
  form, value HTML-escaped); `manifestTarget({ ownerType, org }) -> string`
  (`<web>/settings/apps/new` or `<web>/organizations/<org>/settings/apps/new`);
  `runManifestFlow({ appName, ownerType, org, openBrowser, log }) -> Promise<{ appId,
  appSlug, clientId, clientSecret, pem, webhookSecret, owner }>`.
- Failure mapping: conversion 404 → `chapterError('manifest-window-expired', ...)`; the
  browser form's own name-taken error cannot be seen by the tool, so `runManifestFlow`
  passes a `state` nonce and treats a second `/manifest` hit with no code as
  `app-name-collision` guidance printed by the chapter (Task 10 wires the copy: the printed
  line under the wait tells the admin what a "name already taken" page means and that
  `--app-name` is the recovery).

- [ ] **Step 1: Failing tests** against the fake server: the flow serves the form, follows
  a scripted "browser" (the test fetches the loopback `/manifest?code=...` route directly),
  exchanges the code, and returns the credential set; `expired` code maps to the catalogue
  error; the manifest carries exactly the two permissions and `public: false`; the form
  HTML-escapes the JSON.
- [ ] **Step 2-4: Fail, implement, green.** `openBrowser` and `log` are injected; tests
  inject fakes.
- [ ] **Step 5: Commit** (`feat: add the App manifest flow`).

### Task 7: Web-flow OAuth against the admin's App

**Files:**
- Create: `packages/create-cairn-site/src/github/oauth.mjs`
- Test: `packages/create-cairn-site/src/github/oauth.test.mjs`

**Interfaces:**
- Consumes: Tasks 3, 4, 5.
- Produces: `obtainUserToken({ clientId, clientSecret, openBrowser, log }) ->
  Promise<string>`. The token is returned, never stored; a `state` nonce
  (`randomBytes(16).toString('hex')`) is sent and verified on the callback (mismatch throws
  a plain error naming a possible interception, next step re-run); a
  `bad_verification_code` response maps to `chapterError('code-expired', ...)`.

- [ ] **Step 1: Failing tests** against the fake: happy path returns the token; the state
  nonce round-trips and a tampered value throws; `bad_verification_code` maps to the
  catalogue; nothing is written under `CAIRN_STATE_DIR` by this module (assert the dir is
  untouched).
- [ ] **Step 2-4: Fail, implement, green.**
- [ ] **Step 5: Commit** (`feat: add the own-App web-flow user token`).

### Task 8: Repo create and the Git Data push

**Files:**
- Create: `packages/create-cairn-site/src/github/repo.mjs`
- Test: `packages/create-cairn-site/src/github/repo.test.mjs`

**Interfaces:**
- Consumes: Tasks 4, 5.
- Produces: `createRepo(token, { name, ownerType, org }) -> Promise<{ owner, repo }>`
  (`POST /user/repos` or `POST /orgs/<org>/repos`, `private: true`; 422 name-exists →
  `chapterError('repo-name-collision', ...)`; 403 with an SSO header or SAML message →
  `chapterError('sso-blocked', ...)`). And `pushScaffold(token, { owner, repo, dir, log })
  -> Promise<{ commitSha }>`: walks `dir` recursively skipping `node_modules`, `.git`, and
  the scaffold sentinel (Task 11's `SCAFFOLD_SENTINEL`, imported from `scaffold.mjs`);
  creates blobs (base64), one tree, one parentless commit (`message: 'Initial commit from
  create-cairn-site'`), then `POST git/refs` for `refs/heads/main`. **Idempotent re-push:**
  it first `GET`s `git/ref/heads/main`; if the ref already exists the push is done (T2 only
  ever pushes the initial commit) and it returns the existing sha with a log line. A network
  or 5xx failure mid-push maps to `chapterError('push-interrupted', ...)` whose next step is
  the re-run (the re-run re-walks and re-pushes; blobs are content-addressed so re-creating
  them is safe).
- File count guard: the walk logs `Pushing <n> files`; nothing else is printed per file.

- [ ] **Step 1: Failing tests** against the fake: creates the repo (both owner types);
  collision and SSO rows trigger via `failNext`; a push lands blobs/tree/commit/ref in
  `state.gitObjects` with every scaffold file path present and `node_modules` absent (build
  the fixture dir in the test with a nested file and a `node_modules/junk` file); a second
  `pushScaffold` against the same fake returns without creating a second ref (the fake 409s
  a duplicate ref, so passing proves the ref check ran); a mid-push `failNext('commits',
  502, {})` maps to `push-interrupted`.
- [ ] **Step 2-4: Fail, implement, green.**
- [ ] **Step 5: Commit** (`feat: add repo creation and the git-data push`).

### Task 9: Installation discovery and the org branch

**Files:**
- Create: `packages/create-cairn-site/src/github/install.mjs`
- Test: `packages/create-cairn-site/src/github/install.test.mjs`

**Interfaces:**
- Consumes: Tasks 4 (`appJwt`, `githubRequest`), 5.
- Produces: `installUrl(appSlug) -> string` (`<web>/apps/<slug>/installations/new`); and
  `discoverInstallation({ appId, pem, owner, ownerType, openBrowser, log, pollIntervalMs,
  maxWaitMs }) -> Promise<number>` (the installation id). It opens the install URL, then
  polls `GET /app/installations` with a fresh JWT per poll, matching
  `account.login === owner`. Defaults: poll 3000 ms, max wait 300000 ms. On timeout:
  `ownerType === 'org'` → `chapterError('org-approval-pending', ...)` (the parkable state);
  `ownerType === 'user'` → a plain retryable error ("the installation was not completed";
  next step: re-run, the App and repo are saved).
- Consumed by Task 10, which catches `org-approval-pending` and parks.

- [ ] **Step 1: Failing tests** against the fake: with an installation row pre-pushed, it
  resolves the id (poll interval 10 ms in tests); with none and `ownerType: 'org'`, a 100 ms
  max wait maps to the catalogue's parked row; the fake 401s a bad JWT, so a test signing
  with the wrong key proves the polling authenticates (expect the module to surface the 401
  as a plain error, not loop forever).
- [ ] **Step 2-4: Fail, implement, green.**
- [ ] **Step 5: Commit** (`feat: add installation discovery with the org parked state`).

### Task 10: The chapter orchestration

**Files:**
- Create: `packages/create-cairn-site/src/github/chapter.mjs`,
  `packages/create-cairn-site/src/github/open.mjs`
- Modify: `packages/create-cairn-site/src/args.mjs`, `packages/create-cairn-site/bin.mjs`,
  `packages/create-cairn-site/src/state.mjs`
- Test: `packages/create-cairn-site/src/github/chapter.test.mjs` (+ new cases in
  `src/args.test.mjs`, `src/state.test.mjs`)

**Interfaces:**
- Consumes: everything above, plus T1's `defineAction`/`runActions`, `saveSite`/`loadSite`,
  `collectAnswers` result, `@clack/prompts` (`confirm`, `select`, `text`).
- Produces: `runGithubChapter({ siteId, siteName, dir, flags, log, dryRun, openBrowser? })
  -> Promise<'installed' | 'parked' | 'declined'>`, and in `state.mjs`:
  `updateSite(id, patch) -> Promise<object>` (load, shallow-merge, save, return; throws if
  the record is missing). In `args.mjs`, three new string options `app-name`, `org`,
  `repo-name` and one boolean `github` (default false), surfaced as `appName`, `org`,
  `repoName`, `github`.
- New `open.mjs`: `openBrowser(url, log)` spawns `xdg-open`/`open`/`start` per platform
  (detached, errors swallowed) and **always logs the URL** ("Open this link if the browser
  did not open: <url>"), so a headless or SSH session is never stuck.

Chapter flow (each numbered piece is an Action through `runActions`, so `--dry-run` prints
the whole chapter's titles and details and executes nothing):

1. **Consent.** Interactive: `confirm` with a printed summary first: what will be created
   (a GitHub App named `<appName>` that only this site uses, a private repository
   `<repoName>`, one browser sign-in), including the Administration permission named in
   plain terms and why ("the App can also manage the repository's settings; this is what
   lets the tool create the repository for you"). Non-interactive (`--yes` without
   `--github`): the chapter is skipped with a printed line naming the re-run. `--github`
   opts in non-interactively. Declined → `'declined'`, and the hand-over prints the re-run
   line.
2. **Account prompt.** `select`: personal (`<owner from GET /user>` later; label "My
   personal account") or organization (then `text` for the org name, prefilled from
   `--org`). Repo name: `text` defaulting to the site slug (`--repo-name` short-circuits).
   App name: default `cairn-<slug>` (`--app-name` short-circuits).
3. **Actions**, in order, each saving state on success via `updateSite`:
   - `Create your GitHub App` → `runManifestFlow`; state → `step: 'app-created'`,
     `github: { ...credentials, owner: <manifest owner login>, ownerType }`.
   - `Sign in to GitHub` + `Create the private repository <name>` → `obtainUserToken`, then
     an **authenticated pre-flight**: `GET /user` (identity printed: "Signed in as
     <login>"), and for orgs `GET /orgs/<org>/memberships/<login>` (a 404 or non-member →
     plain error naming the org and asking membership); then `createRepo`; state →
     `'repo-created'`, `github.repo`.
   - `Push your site to GitHub` → `pushScaffold`; state → `'pushed'`. The user token is a
     local variable spanning only these two actions and is never written anywhere.
   - `Install the App on the repository` → `discoverInstallation`; state → `'installed'`,
     `github.installationId`. An `org-approval-pending` catalogue error is caught here:
     state → `'awaiting-org-approval'`, the message prints, and the chapter returns
     `'parked'` (exit code 0; parking is a success state, not a failure).
4. **Chapter hand-over** (returned to bin.mjs to print): repo URL, App URL, "deploy arrives
   with the next chapter" stub, and the doctor line.

- [ ] **Step 1: Failing tests.** Drive `runGithubChapter` end to end against the fake with
  injected `openBrowser`/`log` and a scripted "browser" (the test hits the loopback routes
  the way Tasks 6-7's tests do), `flags: { yes: true, github: true, ... }` for
  non-interactivity: happy path returns `'installed'` and the state record walks
  `scaffolded → app-created → repo-created → pushed → installed` (assert each hop by reading
  the store between fake-server checkpoints); org path with no installation row parks
  (`'awaiting-org-approval'` in state, `'parked'` returned); `--yes` without `--github`
  skips; `--dry-run` returns with **zero** fake-server requests logged and prints every
  action detail; no file under `CAIRN_STATE_DIR` ever contains the string
  `fake-user-token` (grep the store after the happy path; this pins "user token never
  persisted").
- [ ] **Step 2-4: Fail, implement, green.** Wire bin.mjs: after a non-dry scaffold, call
  `runGithubChapter` before printing the hand-over; thread `siteId` out of the scaffold
  state save (change `scaffold()` to return `{ executed, skipped, siteId }`, generating the
  id up front instead of inside the action).
- [ ] **Step 5: Commit** (`feat: wire the GitHub chapter into create-cairn-site`).

### Task 11: The resume frame and the atomic target claim

**Files:**
- Modify: `packages/create-cairn-site/src/state.mjs`,
  `packages/create-cairn-site/src/scaffold.mjs`, `packages/create-cairn-site/bin.mjs`
- Test: new cases in `src/state.test.mjs`, `src/scaffold.test.mjs`, plus
  `src/github/chapter.test.mjs` re-entry cases

**Interfaces:**
- Produces (state.mjs): `findSiteByDir(dir) -> Promise<{ id, data } | null>`: readdir the
  state dir (ENOENT → null), parse each `*.json`, match on `path.resolve(data.dir) ===
  path.resolve(dir)`; newest mtime wins on duplicates; a malformed record is skipped, never
  fatal.
- Produces (scaffold.mjs): `SCAFFOLD_SENTINEL = '.cairn-scaffold-claim'` (exported; Task 8's
  walk skips it). The copy action's execute becomes claim-copy-release:

```js
execute: async () => {
  try {
    await mkdir(dir);                       // atomic create when dir is new
  } catch (cause) {
    if (cause.code !== 'EEXIST') throw cause;   // ENOTDIR etc. surface via the guard's text
  }
  const sentinel = path.join(dir, SCAFFOLD_SENTINEL);
  try {
    await writeFile(sentinel, String(process.pid), { flag: 'wx' });  // atomic claim
  } catch (cause) {
    if (cause.code === 'EEXIST') {
      throw new Error(
        `scaffold: another create-cairn-site run is already scaffolding ${dir} ` +
          '(or one was interrupted). Wait for it, or remove the directory and retry.',
      );
    }
    throw cause;
  }
  try {
    await cp(templateDir, dir, { recursive: true });
  } finally {
    await rm(sentinel, { force: true });
  }
},
```

  The read-only `assertTargetDirEmpty` stays as the early guard (both modes fail fast); the
  claim closes its race window inside the action, so `--dry-run` still writes nothing.
- Resume (bin.mjs): when the target dir exists and is non-empty, consult
  `findSiteByDir(dir)` **before** the guard error. A record at a resumable step
  (`scaffolded`, `app-created`, `repo-created`, `pushed`, `awaiting-org-approval`) → print
  "Resuming <name> at <step>" and run `runGithubChapter` with the saved state (chapter.mjs
  gains re-entry: it skips completed actions by `step`, re-detecting rather than waiting on
  org approval per the spec). `installed` → print "This site's GitHub chapter is complete"
  plus the stub hand-over. No record → the T1 guard message, unchanged.

- [ ] **Step 1: Failing tests.** `findSiteByDir`: match, no-match, malformed-file
  tolerance. Claim: two concurrent `scaffold()` calls against one fresh dir (drive the race
  by stubbing `cp` in one with a delay via a small injectable seam or by pre-writing the
  sentinel: pre-write it with `wx` in the test, then assert the crafted "already
  scaffolding" message); sentinel is gone after a successful scaffold (assert with the real
  template fixture); dry-run creates neither dir nor sentinel. Resume: with a state record
  at `app-created` and a scaffolded dir, a re-run reaches the repo-create action without a
  second manifest exchange (fake server records zero `conversions` hits); with
  `awaiting-org-approval` and an installation row now present, resume completes to
  `installed`.
- [ ] **Step 2-4: Fail, implement, green.**
- [ ] **Step 5: Commit** (`feat: add resume and make the scaffold's target claim atomic`).

### Task 12: The dev shim (bare `npm run dev`)

**Files:**
- Modify: `packages/create-cairn-site/scripts/bake-template.mjs`,
  `packages/create-cairn-site/src/scaffold.mjs` (hand-over copy),
  `.github/workflows/create-site.yml`
- Test: `packages/create-cairn-site/scripts/bake-template.test.mjs`,
  `packages/create-cairn-site/src/scaffold.test.mjs`

The showcase's `scripts/` directory is excluded by `.cairn-template.json`, so the shim is
**written by the bake**, not copied from the showcase. The showcase itself is untouched.

**Interfaces:**
- Produces (bake): the baked template contains `scripts/dev.mjs` (content below), and the
  emitted `package.json`'s `dev` script is rewritten from exactly `"vite dev"` to
  `"node scripts/dev.mjs"`, behind a rot gate: any other current value throws
  `bake: expected the showcase dev script to be "vite dev", found "<value>"` (the
  `pruneShowcaseOnlyPackageFields` precedent).

```js
// scripts/dev.mjs: start the dev server with the local admin's backend enabled.
// CAIRN_DEV_BACKEND=1 is the runtime half of the dev-backend gate. It is deliberately a
// runtime variable, not a build define, so no production build can fold the dev backend
// into a deployed Worker; this shim exists so you can type plain `npm run dev` on any
// platform instead of setting the variable by hand.
import { spawn } from 'node:child_process';

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const child = spawn(npx, ['--no-install', 'vite', 'dev', ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, CAIRN_DEV_BACKEND: '1' },
});
child.on('exit', (code) => process.exit(code ?? 1));
```

- Produces (scaffold.mjs): `handoverText({ dir })` loses its `platform` parameter and the
  PowerShell branch; the dev line is plain `npm run dev`; the stand-in paragraph stays but
  the sentence naming `CAIRN_DEV_BACKEND=1` is replaced by "the scaffold's own dev script
  turns the stand-in on." bin.mjs's call site drops the `platform` argument.

- [ ] **Step 1: Rewrite the locking tests first, failing.** In `bake-template.test.mjs`:
  the baked template has `scripts/dev.mjs` whose content names `CAIRN_DEV_BACKEND`; the
  emitted `package.json.scripts.dev` equals `node scripts/dev.mjs`; a doctored input whose
  `dev` script is not `"vite dev"` throws the rot-gate message. In `scaffold.test.mjs`:
  replace the T1 flag-locking tests (`:225-252`) with: the hand-over contains the bare
  `cd/npm install/npm run dev` sequence; the string `CAIRN_DEV_BACKEND` appears **nowhere**
  in the hand-over (the inversion of T1's lock, so a regression that reintroduces the flag
  fails loudly); `handoverText` no longer accepts a platform.
- [ ] **Step 2: Run to fail.** **Step 3: Implement** (bake writes the shim file and
  rewrites the script; hand-over simplification; bin call site).
- [ ] **Step 4: Extend `create-site.yml`** with a live admin probe after the existing build
  step, so "bare `npm run dev` reaches the admin" is proven by a falsifiable gate, not a
  string assertion (the site there already installs the packed dev-backend tarball):

```yaml
      - name: Dev server reaches the admin
        working-directory: ${{ env.SITE_DIR }}
        run: |
          npm run dev -- --port 4173 --strictPort &
          DEV_PID=$!
          for i in $(seq 1 60); do
            code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4173/admin || true)
            [ "$code" = "200" ] && break
            sleep 1
          done
          kill $DEV_PID
          [ "$code" = "200" ] || { echo "admin returned '$code', not 200"; exit 1; }
```

  (Adjust `working-directory`/env names to the workflow's existing scaffold-dir variable at
  implementation time; the probe's shape is the requirement.)
- [ ] **Step 5: Run the package suite green, commit** (`feat: make bare npm run dev start
  the scaffolded admin`), **push, and confirm the `create-site` workflow is green on CI**
  before the pass continues (this gate is CI-only).

### Task 13: The live e2e (main loop + Geoff)

**Files:**
- Create: evidence recorded in this plan's post-mortem; scratch-org note in
  `docs/internal/2026-08-10-t2-own-app-spike.md` (appended)

One Geoff browser sitting, late in the pass, after Tasks 2-12 are green.

- [ ] **Step 1: Personal run.** From a scratch directory, run the real CLI (baked via the
  CI bake pattern: `node scripts/bake-template.mjs --to template --engine-spec
  <packed-engine-tarball> --dev-spec <packed-dev-tarball>`, then `node bin.mjs --name
  "T2 Live" ...`) through the full chapter against glw907: manifest → OAuth → repo → push →
  install. Verify on github.com: the App exists with exactly contents:write +
  administration:write, the private repo carries the scaffold at `refs/heads/main` in one
  commit, the installation covers the repo. Verify locally: the state record is at
  `installed`, mode 0600, and contains no `access_token` key or user token value.
- [ ] **Step 2: Org run.** Geoff creates a free scratch org in the same sitting; run the
  org path (`--org <scratch>`): manifest at the org URL, repo under the org, install
  completes (Geoff is the owner, so approval is immediate; the parked state stays
  fake-proven per the spec).
- [ ] **Step 3: Tear down** both Apps and both repos in the same sitting.
- [ ] **Step 4: Record the evidence** (commands, URLs seen, request outcomes, teardown) in
  the post-mortem, including any divergence between the fake server's behavior and real
  GitHub's; a divergence is a Task-2 bug to fix in this pass, with the fake corrected and
  the suite re-run.

### Task 14: Docs, tracking, and pass close

**Files:**
- Modify: `packages/create-cairn-site/README.md`, `CHANGELOG.md`,
  `docs/internal/docs-friction-log.md`, `ROADMAP.md`, `docs/STATUS.md`, this plan
  (post-mortem)

- [ ] **Step 1: README.** The package README gains the GitHub chapter: what gets created
  and why (the own-App shape, the Administration permission stated plainly), the flags
  (`--github`, `--app-name`, `--org`, `--repo-name`), resume behavior, and the org-approval
  parked state. Follow the existing README's register.
- [ ] **Step 2: CHANGELOG.** Extend the `## Unreleased` create-cairn-site entry (T1's
  paragraph sets the convention) with the chapter: manifest-first own-App design, no
  standing OAuth client, the resume frame, the atomic claim, the dev shim (`npm run dev`
  now reaches the local admin bare). `Consumers must: nothing` (the tool is unpublished;
  no engine surface changed).
- [ ] **Step 3: Friction log.** Complete-or-move: delete the "scaffolded `dev` script"
  entry (shipped, Task 12) and the "check-then-copy" entry (shipped, Task 11), each with
  the one-line disposition the log's header requires. The `SiteConfig` comment entry stays,
  untouched (spec: not a T2 rider).
- [ ] **Step 4: ROADMAP.** Mark the T2 slice of the create-cairn-site item done in place
  (the umbrella queue lives in STATUS; the roadmap's scaffolder line should reflect that
  the GitHub chapter exists and T3 remains).
- [ ] **Step 5: Doc gates.** Run all four: `npm run check:reference`,
  `check:reference:signatures`, `check:docs`, `check:package` (no engine export changed, so
  these prove the absence of drift), plus `check:snippets` if any fenced block was touched.
- [ ] **Step 6: Pass-end ritual** per `cairn-pass`: code-simplifier over the pass's changed
  files; root `npm run check` 0/0; root `npm test` exit 0; `check:comments`;
  `check:surface` (no engine change expected; if it flags, something leaked and must be
  understood, not snapshotted); the showcase e2e via CI on the pushed branch (the branch
  push already runs `test`, `e2e`, `design`, `scaffold`, `create-site` on the PR). Append
  the post-mortem to this plan; update STATUS (T2 done, T3 next, the resume prompt for the
  T3 planning sitting); prep the context clear.

---

## Self-review notes

Spec coverage: manifest-first flow (Tasks 6-10), the spike and its decision gate (Task 1,
gating 7-8), consent gate with authenticated pre-flight (Task 10), repo create + no-git push
(Task 8), installation discovery + org parking (Task 9), hand-over stub (Task 10), resume
table rows as the state machine (Tasks 10-11), check-then-copy fix (Task 11), dev shim +
bake + copy-lock inversion (Task 12), token opacity (global constraint; no module parses a
token), catalogue triggered-not-read (Tasks 5-10 tests via `failNext`), fake server (Task
2), live e2e personal + scratch org (Task 13), security rules (constraints + Task 10's
grep-the-store test), CI (Task 2's glob, Task 12's admin probe). Out-of-scope items
(Worker-secret move, deploy, console, PAT build-out, `SiteConfig`) appear in no task.
Type consistency: `chapterError` (5) consumed by 6-10; `startLoopback` (3) by 6-7;
`githubRequest`/`appJwt` (4) by 6-9; `SCAFFOLD_SENTINEL` exported (11) and skipped (8);
`updateSite`/`findSiteByDir` (10/11) consistent with T1's `saveSite`/`loadSite`; the
`FakeGithub.failNext` route names used in Tasks 8-9 match Task 2's list. Known sequencing
nit: Task 8 imports `SCAFFOLD_SENTINEL`, defined in Task 11; the implementer of Task 8
defines the constant in `scaffold.mjs` with a one-line comment if Task 11 has not landed
yet (Task 11 then moves the claim logic around it), noted here so neither dispatch stalls.
