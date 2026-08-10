# create-cairn-site Pass T2 (the GitHub chapter) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking. In this repo the executor is `cairn-implementer`
> per task, orchestrated by the main loop, except Tasks 1 and 13, which are main-loop tasks
> needing Geoff's browser.

**Spike amendments (2026-08-10, post-Task 1):** the spike ran (verdict:
`docs/internal/2026-08-10-t2-own-app-spike.md`) and the design STANDS, with four observed
corrections folded into the task briefs below: (1) the manifest requires
`hook_attributes: { url, active: false }` even with no events, and a signed-out admin
dead-ends the manifest POST, so the pre-open copy says sign in first; (2) the install
redirect uses the registered callback verbatim (a portless registration dead-ends on
unbindable port 80), and with two registered callbacks it uses the FIRST, so the tool binds
its loopback before minting the manifest and registers `[<ported>/callback,
http://127.0.0.1/callback]`; port-only leniency (path exact) is proven and backs any-port
resume against the portless second entry; (3) the repo-link PUT is refused for user tokens
(403 `Resource not accessible by integration`) and unnecessary (UAT-created repos are
auto-added to the installation, selected-mode included), so Task 8 verifies coverage by GET
instead of linking; (4) every SPIKE-marked fake status was confirmed as guessed, and the
fake additionally models the PUT refusal and the auto-add.

**Revision note (2026-08-10):** this plan was rewritten after a three-agent adversarial fold
(admin-journey, platform-correctness, plan-integrity) against the first committed version.
The architecture-level changes: install rides the manifest redirect
(`request_oauth_on_install`, two browser trips), the portless loopback callback, repo
creation after installation with an explicit repo-link call, the `auto_init` push shape
(the Git Data API 409s on an empty repo), the org branch's Members:read permission, the
deep-merging create-if-missing state writer, `--dry-run` reaching the chapter, and the
amended catalogue row set. The spec carries the same amendments.

**Goal:** After the local value moment, the tool creates a GitHub App the admin owns
(manifest flow), installs and authorizes it in one browser trip, uses the resulting user
token to create, link, and push the content repo with no git binary, parks and resumes the
org-approval state, and makes the scaffolded site's bare `npm run dev` reach the local
admin.

**Architecture:** Manifest-first: the manifest exchange needs no credential and returns the
App's `client_id`/`client_secret`/PEM, so the admin's own App is the OAuth client and no
standing OAuth infrastructure exists. The chapter is two browser trips: the manifest form,
then GitHub's install page doubling as the authorize page
(`request_oauth_on_install: true`), whose loopback redirect carries both the OAuth code and
the installation id. All GitHub traffic flows through one fetch wrapper whose base URLs come
from env seams, so the node:test suite runs against a local fake GitHub server and every
error-catalogue row is triggered, not read. Side effects stay Actions through the T1 runner,
so `--dry-run` prints the whole chapter (App, repo, install) and performs none of it.

**Tech Stack:** plain ESM `.mjs` on `node:test`; Node 22 built-ins only (`fetch`,
`node:http`, `node:crypto` for RS256); `@clack/prompts` (already a dependency). No new
dependencies.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-10-create-cairn-site-t2-design.md` (as amended by
  the fold). The umbrella: `docs/superpowers/specs/2026-08-09-admin-setup-and-docs-reset-design.md`.
- Node floor `>=22` (`engines.node`); no dependency may be added to `package.json`.
- **No secret is ever written under the project directory.** App credentials go in the T1
  state store (`saveSite`/`updateSite`, mode 0600). The user access token is held in memory
  only and never persisted anywhere.
- **Tokens are opaque** (spike F): never parse, measure, pattern-match, or truncate an
  installation or user token; nothing may assume a length or shape.
- **Every exit prints a next step.** No run may terminate on a bare error; failure paths go
  through the catalogue (Task 5) or print an explicit `Next step:` line. This includes the
  plain (non-catalogue) errors this plan creates: the OAuth state-nonce mismatch, the JWT
  401, the org-membership refusal — each message ends with its own next step.
- **Every wait prints a heartbeat.** Any step that blocks on the admin's browser prints a
  line saying what it is waiting for and that the window should stay open; a silent
  ten-minute wait is a defect.
- Env seams are read **at call time**, never cached at module load (the `state.mjs`
  precedent): `CAIRN_GITHUB_API_BASE` (default `https://api.github.com`),
  `CAIRN_GITHUB_WEB_BASE` (default `https://github.com`), `CAIRN_STATE_DIR` (existing).
- Comments follow the repo's TSDoc-shaped JSDoc style visible in `src/*.mjs`; no em dashes
  in comments. Every commit runs the package suite
  (`npm --prefix packages/create-cairn-site test`) green before it lands.
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
  src/github/oauth.mjs         code exchange + authorize-only URL for resume (+ .test.mjs)
  src/github/install.mjs       the install+authorize trip, polling, org parking (+ .test.mjs)
  src/github/repo.mjs          repo create + installation link + Git Data push (+ .test.mjs)
  src/github/chapter.mjs       orchestration: consent, prompts, actions, state machine (+ .test.mjs)
  src/github/open.mjs          cross-platform browser opener with printed-URL fallback
  test/fake-github.mjs         the fake GitHub server (test helper, not shipped)
Modified: src/args.mjs, src/state.mjs, src/scaffold.mjs, bin.mjs,
  scripts/bake-template.mjs, package.json (test glob), README.md,
  .github/workflows/create-site.yml
```

State shape after this pass (the T1 record grows a `github` section; `step` is the resume
key):

```js
{
  name, dir,                 // T1 fields, unchanged
  step,                      // 'scaffolded' | 'app-created' | 'awaiting-org-approval'
                             //   | 'installed' | 'repo-created' | 'pushed'  (final)
  github: {
    appId, appSlug, clientId, clientSecret, pem, webhookSecret,
    owner, ownerType,        // ownerType: 'user' | 'org'
    installationId,          // present from 'installed'
    repo,                    // present from 'repo-created'
  },
}
```

The runtime order is manifest → install+authorize → repo create → link → push, and the
`step` values above are in that order. `awaiting-org-approval` parks out of the install
step; `pushed` is the chapter's completed state.

---

### Task 1: The spike (main loop + Geoff; decision gate for Tasks 7-9)

**Files:**
- Create: `docs/internal/2026-08-10-t2-own-app-spike.md` (the recorded verdict)

The spike must exercise the **final shape end to end**, or its verdict is about a flow the
tool does not use. Specifically it settles, in one Geoff browser sitting: (a) the manifest
flow with a **portless** callback registration and `request_oauth_on_install: true`;
(b) whether the install redirect delivers `code` and `installation_id` together on the
loopback; (c) whether GitHub's loopback port-leniency applies to GitHub Apps (the redirect
uses a real ephemeral-style port while the registration has none); (d) `POST /user/repos`
with the user token **after** installation; (e) `PUT
/user/installations/{installation_id}/repositories/{repository_id}`; (f) the `auto_init`
Git Data push (read ref → blobs → tree → commit with parent → `PATCH` ref); and (g) the
real status of a duplicate-ref create and of Git Data calls against an empty repo (to pin
the fake server's numbers).

- [ ] **Step 1: Write the spike script** at `$CLAUDE_JOB_DIR/tmp/spike.mjs` (never in the
  repo). Shape (ordering is the point; error handling can be crude):

```js
// Spike: manifest (portless callback, request_oauth_on_install) -> install+authorize ->
// POST /user/repos -> PUT repo into installation -> auto_init Git Data push. Run and follow
// the printed browser prompts; every response status is logged.
import http from 'node:http';
const PORT = 8977; // fixed for the spike only; the tool binds ephemerally (premise c)
const manifest = {
  name: `cairn-spike-${Date.now().toString(36)}`,
  url: 'https://example.com',
  redirect_url: `http://127.0.0.1:${PORT}/manifest`,
  callback_urls: ['http://127.0.0.1/callback'],       // PORTLESS: premise (c)
  request_oauth_on_install: true,                      // premise (b)
  public: false,
  default_permissions: { contents: 'write', administration: 'write' },
  default_events: [],
};
const hits = [];
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  if (url.pathname === '/') {
    res.setHeader('content-type', 'text/html');
    res.end(`<form action="https://github.com/settings/apps/new" method="post">
      <input type="hidden" name="manifest" value='${JSON.stringify(manifest)}'>
      <button>Create the spike App</button></form>`);
    return;
  }
  hits.push(url);
  res.end(`ok: ${url.pathname} received, return to the terminal`);
});
server.listen(PORT, '127.0.0.1');
const waitFor = (pathname) => new Promise((resolve) => {
  const timer = setInterval(() => {
    const hit = hits.find((u) => u.pathname === pathname);
    if (hit) { clearInterval(timer); resolve(hit.searchParams); }
  }, 200);
});
console.log(`1) Open http://127.0.0.1:${PORT}/ and click the button.`);
const code = (await waitFor('/manifest')).get('code');
const conv = await fetch(`https://api.github.com/app-manifests/${code}/conversions`, {
  method: 'POST', headers: { accept: 'application/vnd.github+json' },
});
console.log('conversion:', conv.status);
const app = await conv.json();
console.log(`2) Open https://github.com/apps/${app.slug}/installations/new and install on`
  + ' your personal account (pick "Only select repositories", select nothing if allowed,'
  + ' else All).');
const cb = await waitFor('/callback');
console.log('callback params:', Object.fromEntries(cb)); // expect code AND installation_id
const tok = await (await fetch('https://github.com/login/oauth/access_token', {
  method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/json' },
  body: JSON.stringify({ client_id: app.client_id, client_secret: app.client_secret,
    code: cb.get('code'), redirect_uri: `http://127.0.0.1:${PORT}/callback` }),
})).json();
const auth = { accept: 'application/vnd.github+json', authorization: `Bearer ${tok.access_token}` };
const repoName = `cairn-spike-repo-${Date.now().toString(36)}`;
const mk = await fetch('https://api.github.com/user/repos', { method: 'POST', headers: auth,
  body: JSON.stringify({ name: repoName, private: true, auto_init: true }) });
console.log('POST /user/repos:', mk.status);                     // premise (d)
const repo = await mk.json();
const link = await fetch(`https://api.github.com/user/installations/${cb.get('installation_id')}/repositories/${repo.id}`,
  { method: 'PUT', headers: auth });
console.log('PUT repo->installation:', link.status);             // premise (e)
const owner = repo.owner.login;
const gd = (p, body, method = 'POST') => fetch(
  `https://api.github.com/repos/${owner}/${repoName}/git/${p}`,
  { method, headers: auth, body: body && JSON.stringify(body) });
const emptyProbe = await gd('trees', { tree: [{ path: 'x', mode: '100644', type: 'blob',
  content: 'x' }] });
console.log('trees on auto_init repo:', emptyProbe.status);      // premise (f)
const ref = await (await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/ref/heads/main`,
  { headers: auth })).json();
const blob = await (await gd('blobs', { content: 'aGVsbG8=', encoding: 'base64' })).json();
const tree = await (await gd('trees', { tree: [{ path: 'hello.txt', mode: '100644',
  type: 'blob', sha: blob.sha }] })).json();
const commit = await (await gd('commits', { message: 'Initial commit from create-cairn-site',
  tree: tree.sha, parents: [ref.object.sha] })).json();
const patch = await gd('refs/heads/main', { sha: commit.sha }, 'PATCH');
console.log('PATCH ref:', patch.status);
const dupRef = await gd('refs', { ref: 'refs/heads/main', sha: commit.sha });
console.log('duplicate ref create status:', dupRef.status);      // premise (g), pins the fake
server.close();
```

- [ ] **Step 2: Run it in one Geoff browser sitting.** Two browser moments (create the
  App; install-and-authorize). Log every status.
- [ ] **Step 3: Tear down** the spike App and repo from github.com in the same sitting.
- [ ] **Step 4: Write the verdict** to `docs/internal/2026-08-10-t2-own-app-spike.md`:
  every premise (a)-(g) with its observed status, and the decision. Decision gate:
  - All green → the design stands; Tasks 2-14 proceed as written, with the fake server's
    status codes pinned to what (g) observed.
  - `POST /user/repos` refused **with the App installed** → the spec's fallback fires:
    guided browser repo-create plus installation-token push. What changes: Task 8's
    `createRepo` becomes a guided-browser step (the tool prints the exact `github.com/new`
    walk-through, then confirms the repo exists via `GET /repos/{owner}/{repo}` with the
    user token) and its push switches to an installation token minted from the App JWT;
    Task 7 (oauth) survives for the confirm call and the link `PUT`; the step enum and
    Task 11's resume list are unchanged. Amend Tasks 8 and 10 in this file before
    dispatching them, and re-verify the fallback's own premise (`PUT` repo-link with a user
    token) in the same sitting while it is open.
  - The callback arrives without `installation_id`, or the portless-callback leniency does
    not hold for Apps → STOP; these break the trip count and resume design respectively.
    Re-open the spec's flow section with what was observed before any further dispatch.
- [ ] **Step 5: Commit** the verdict doc.

### Task 2: The fake GitHub server (test helper)

**Files:**
- Create: `packages/create-cairn-site/test/fake-github.mjs`
- Test: `packages/create-cairn-site/test/fake-github.test.mjs`

**Interfaces:**
- Produces: `startFakeGithub(options?) -> Promise<FakeGithub>` where `FakeGithub` is
  `{ apiBase, webBase, state, requests, failNext(route, status, body), close() }`.
  - `requests` is an append-only array of `{ method, pathname, authorization }` for **every**
    request received; it is the instrument for the dry-run zero-requests assertion, the
    re-push no-second-push assertion, and the header checks. Tests read it; nothing resets
    it except a new server.
  - `state` exposes `{ apps: [], repos: [], installations: [], gitObjects: Map }` for
    assertions and pre-seeding (tests push installation rows to simulate the admin
    completing the browser install).
- Behavior (each route returns GitHub's real JSON shape for the fields the tool reads;
  status codes marked SPIKE are provisional and must be corrected to Task 1's observed
  values before Tasks 6-10 are dispatched):
  - `POST /app-manifests/:code/conversions` → 201 `{ id, slug, client_id, client_secret,
    pem, webhook_secret, html_url, owner: { login } }`. The PEM is a real throwaway RSA key
    generated per server start (`generateKeyPairSync('rsa', { modulusLength: 2048 })`) so
    JWT verification is real. Registers the app in `state.apps` **with its
    `callback_urls`**. A code of `expired` → 404.
  - `GET /login/oauth/authorize` → **validates `redirect_uri` against the registered app's
    `callback_urls`, honoring the loopback exception**: a registered `http://127.0.0.1/cb`
    matches a request `http://127.0.0.1:<any port>/cb`; any other mismatch → 200 HTML error
    page and **no redirect** (real GitHub renders an error page; a fake that redirects
    anyway would hide the exact defect class the portless registration exists to prevent).
    On match → 302 to `redirect_uri` with `?code=fake-code` and the caller's `state`
    echoed.
  - `GET /apps/:slug/installations/new` → 200 HTML (a stand-in install page; tests drive
    installation by pushing to `state.installations` and then hitting the callback route
    themselves with `code` + `installation_id`, mirroring `request_oauth_on_install`).
  - `POST /login/oauth/access_token` → JSON `{ access_token: 'fake-user-token' }`;
    `failNext('access_token', 200, { error: 'bad_verification_code' })` for the expiry row.
  - `POST /user/repos`, `POST /orgs/:org/repos` → **404 unless `state.installations` holds
    an installation for the requesting app** (the user-token-without-installation trap the
    first plan draft fell into must be a red test, not a green one); on success 201
    `{ id, name, full_name, owner: { login }, default_branch: 'main' }`, and with
    `auto_init: true` seeds `state.gitObjects` with a root commit and a `heads/main` ref. A
    duplicate name → 422 with GitHub's `name already exists` errors array.
  - `PUT /user/installations/:iid/repositories/:rid` → 204, recording the link;
    `GET /user/installations/:iid/repositories` → the linked repos.
  - Git Data: `POST git/blobs|trees|commits` and `PATCH git/refs/heads/main` succeed
    **only when the repo has a seed** (else 409 `{ message: 'Git Repository is empty.' }`
    (SPIKE)); `GET git/ref/heads/main` → 200 once seeded, 409 while empty (SPIKE);
    `POST git/refs` for an existing ref → 422 (SPIKE).
  - `GET /app/installations` → `state.installations`; requires a Bearer JWT that verifies
    against the requesting app's PEM (`createVerify`; bad signature → 401).
  - `GET /user` → 200 `{ login: 'fake-admin' }` **and echoes the received `authorization`
    header** in the JSON (`{ login, _authorization }`) so header tests need no extra seam.
  - `GET /orgs/:org` → 200 if the org is in `state`, else 404 (the unauthenticated
    org-validation seam). `GET /orgs/:org/memberships/:user` → role from `state`, default
    `admin`.
  - `failNext(route, status, body)` arms a one-shot override for the next hit on that
    route. Route names: `'conversions' | 'access_token' | 'authorize' | 'user_repos' |
    'org_repos' | 'link' | 'blobs' | 'trees' | 'commits' | 'refs' | 'installations' |
    'user' | 'org' | 'membership'`.

- [ ] **Step 1: Write the failing self-test**: manifest conversion registers the app;
  authorize with a mismatched `redirect_uri` does not redirect; authorize with a portlessly
  registered callback and a ported request does; repo create without an installation 404s
  and succeeds after `state.installations.push(...)`; Git Data 409s before `auto_init`
  seeding and works after; `requests` logged it all; `failNext` fires once.
- [ ] **Step 2: Run it to see it fail** (note: the test glob change lands in Step 3).
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
- Produces: `startLoopback() -> Promise<{ port, url, serveForm(html),
  waitFor(pathname, { timeoutMs, landingHtml }) -> Promise<URLSearchParams>, close() }>`.
  `url` is `http://127.0.0.1:<port>` (ephemeral port). `waitFor` resolves with the query
  params of the first GET whose pathname matches, responding to the browser with that
  call's `landingHtml` (callers pass per-step copy: "Step 1 of 2 done — your App is
  created. Return to the terminal."). It rejects after `timeoutMs` (default 10 minutes)
  with an error carrying `err.code = 'LOOPBACK_TIMEOUT'` so callers map it to the
  `browser-step-abandoned` catalogue row (the loopback itself stays catalogue-free).
  `serveForm(html)` sets the body served at `/` (the manifest auto-submit page).
- Consumed by Tasks 6 and 9.

- [ ] **Step 1: Write the failing tests**: binds an ephemeral port on 127.0.0.1; `waitFor`
  resolves with params when the path is hit (drive with `fetch`) and the response body is
  the per-call `landingHtml`; a different path does not resolve it; the timeout rejects
  with `code === 'LOOPBACK_TIMEOUT'` (50 ms timeout in the test); `close()` frees the port.
- [ ] **Step 2: Run to fail.** **Step 3: Implement** on `node:http`. **Step 4: Run green.**
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
- Produces: `apiBase()`, `webBase()` (env seams, call-time reads), and
  `githubRequest(method, path, { token, jwt, body, accept } = {}) -> Promise<{ status,
  json }>`. Defaults `accept: 'application/vnd.github+json'`; resolves `path` against
  `apiBase()`; sets `authorization: Bearer <token or jwt>` when given; JSON-encodes
  `body`; **never throws on a non-2xx status** (callers map statuses through the
  catalogue). It throws only on a network-level failure, wrapped as
  `new Error('github: could not reach <url> (<code>)', { cause })`.
- **Scope note for the implementer:** the OAuth token exchange
  (`/login/oauth/access_token`) does NOT go through this wrapper. It lives on `webBase()`
  and needs `accept: application/json` (the endpoint's default response is form-encoded);
  Task 7's `oauth.mjs` calls `fetch` directly for it. State this in `api.mjs`'s module
  comment so nobody routes it through later.

- [ ] **Step 1: Write the failing tests.** `jwt.test.mjs`: generate a keypair in the test,
  sign, verify with `createVerify`, assert the decoded payload fields (a real verification,
  not a shape check). `api.test.mjs`: against the fake server, a `POST` round-trips a body;
  a 422 comes back as `{ status: 422 }` without throwing; the token lands in the
  `authorization` header (assert via `GET /user`'s `_authorization` echo); base URLs come
  from the env at call time (set the env inside the test, not at import).
- [ ] **Step 2: Run to fail.** **Step 3: Implement.** **Step 4: Run green.**
- [ ] **Step 5: Commit** (`feat: add App JWT signing and the GitHub API wrapper`).

### Task 5: The error catalogue

**Files:**
- Create: `packages/create-cairn-site/src/github/catalogue.mjs`
- Test: `packages/create-cairn-site/src/github/catalogue.test.mjs`

**Interfaces:**
- Produces: `chapterError(code, params) -> Error` with `err.catalogue = { code, kind,
  next }` and `err.message` the full printed text. `kind` is `'wait' | 'act' |
  'ask-someone'`. Codes (the spec's amended set, exact): `browser-step-abandoned`,
  `manifest-window-expired`, `code-expired`, `repo-name-collision`, `sso-blocked`,
  `org-approval-pending`, `installation-not-covering-repo`, `push-interrupted`. There is
  **no** `consent-denied` row (declining is a normal return) and **no** `app-name-collision`
  row (the tool cannot observe GitHub's re-rendered form; that recovery is printed guidance
  in Task 6's wait copy). Tasks 6-10 consume `chapterError`; bin.mjs prints `err.message`
  and exits per `kind` (`org-approval-pending` parks with exit 0, everything else exits 1).

Each message is literal text ending in the one next command. Write them exactly; the tests
pin them. `browser-step-abandoned` is parameterized by `step` (`'manifest' | 'install'`)
because the right recovery differs (after a manifest timeout the App may exist and its name
may be taken; after an install timeout the App and its saved credentials are safe and the
plain re-run resumes). Three examples set the register; the implementer writes the rest to
match (every message names what happened, what it means, and ends with a `Next:` line):

```
browser-step-abandoned (step=manifest):
  "The browser step was not completed, so nothing was collected from GitHub. If you saw a
   GitHub page saying the App name is already taken, that is the cause.
   Next: re-run npx create-cairn-site --dir {dir} (add --app-name <a-new-name> if the name
   was taken). If an App named {appName} now exists at {webBase}/settings/apps, delete it
   there first."
kind: act

manifest-window-expired:
  "GitHub's one-hour window for collecting the new App's credentials has passed, so the App
   ({appName}) may exist while its key was never collected and cannot be recovered.
   Next: delete the App at {webBase}/settings/apps if it exists, then re-run
   npx create-cairn-site --dir {dir} (pick a new name with --app-name if the old one is taken)."
kind: act

org-approval-pending:
  "Your organization ({org}) requires an owner to approve installing {appName}. GitHub has
   already notified the owners; nothing is lost, and this run has saved its progress.
   Next: once an owner approves (they were emailed; the pending request is under the
   organization's Settings), re-run npx create-cairn-site --dir {dir} and the tool will pick
   up where it left off."
kind: ask-someone
```

- [ ] **Step 1: Failing tests**: every code produces a message containing `Next:`; unknown
  code throws; params interpolate; `kind` matches; `browser-step-abandoned` differs by
  `step`.
- [ ] **Step 2-4: Fail, implement, green.**
- [ ] **Step 5: Commit** (`feat: add the GitHub chapter's error catalogue`).

### Task 6: The manifest flow

**Files:**
- Create: `packages/create-cairn-site/src/github/manifest.mjs`
- Test: `packages/create-cairn-site/src/github/manifest.test.mjs`

**Interfaces:**
- Consumes: `startLoopback` (3), `githubRequest`/`webBase` (4), `chapterError` (5),
  `slugify` (T1).
- Produces (amended by the spike): `buildManifest({ appName, siteName, ownerType,
  loopbackUrl }) -> object`:
  `{ name: appName, url: 'https://github.com/glw907/cairn-cms',
  redirect_url: <loopbackUrl>/manifest,
  callback_urls: [<loopbackUrl>/callback, 'http://127.0.0.1/callback'],
  hook_attributes: { url: 'https://github.com/glw907/cairn-cms', active: false },
  request_oauth_on_install: true, public: false,
  default_permissions: { contents: 'write', administration: 'write',
  ...(ownerType === 'org' ? { members: 'read' } : {}) }, default_events: [] }`.
  The ported entry comes FIRST (the install redirect uses the first registered callback,
  verbatim); the portless second entry backs any-port resume via the proven port-only
  leniency. `hook_attributes` is required by the manifest schema even with no events;
  `active: false` keeps GitHub from calling it. A test pins the two-entry order and the
  hook_attributes presence so nobody "simplifies" either away. The loopback therefore binds
  BEFORE the manifest is built. (Verify at implementation time whether `members` sits under
  a separate `organization_permissions`-style key in the manifest schema; the spike's App
  settings page shows the result either way.)
- Produces: `manifestFormHtml(manifest, targetUrl) -> string` (auto-submit form, value
  HTML-escaped); `manifestTarget({ ownerType, org }) -> string` (`<web>/settings/apps/new`
  or `<web>/organizations/<org>/settings/apps/new`); `runManifestFlow({ appName, siteName,
  ownerType, org, openBrowser, log }) -> Promise<{ appId, appSlug, clientId, clientSecret,
  pem, webhookSecret, owner }>`.
- Behavior: serve the form on the loopback, print the pre-open line ("Your browser will
  open GitHub's 'Create GitHub App' page; click the create button there") and the
  heartbeat, wait for `/manifest` with a per-step landing page, exchange the code
  (conversion 404 → `chapterError('manifest-window-expired', ...)`), return the
  credentials. A `LOOPBACK_TIMEOUT` rejection maps to
  `chapterError('browser-step-abandoned', { step: 'manifest', ... })`. The wait's printed
  copy carries the name-taken guidance (Task 5's decision: guidance, not a detected error).

- [ ] **Step 1: Failing tests** against the fake: the flow serves the form, the test
  drives the loopback `/manifest?code=...` route, exchanges, returns the credential set;
  `expired` code → `manifest-window-expired`; a 50 ms timeout →
  `browser-step-abandoned` with `step: 'manifest'`; the manifest carries exactly the
  personal-branch permission pair (and the org branch adds members read), `public: false`,
  `request_oauth_on_install: true`, and the portless callback; the form HTML-escapes the
  JSON.
- [ ] **Step 2-4: Fail, implement, green** (`openBrowser`, `log` injected).
- [ ] **Step 5: Commit** (`feat: add the App manifest flow`).

### Task 7: The code exchange and the resume authorize URL

**Files:**
- Create: `packages/create-cairn-site/src/github/oauth.mjs`
- Test: `packages/create-cairn-site/src/github/oauth.test.mjs`

**Interfaces:**
- Consumes: Tasks 3, 4 (bases only), 5.
- Produces: `exchangeCode({ clientId, clientSecret, code, redirectUri }) ->
  Promise<string>` — direct `fetch` to `<webBase>/login/oauth/access_token` with
  `accept: application/json` (NOT through `githubRequest`; see Task 4's scope note);
  `bad_verification_code` → `chapterError('code-expired', ...)`. The token is returned,
  never stored.
- Produces: `authorizeUrl({ clientId, redirectUri, state }) -> string` and
  `reauthorize({ clientId, clientSecret, openBrowser, log }) -> Promise<string>`: the
  resume path's re-auth (the App is already installed, so GitHub redirects immediately);
  it generates a `state` nonce (`randomBytes(16).toString('hex')`), opens the browser,
  waits on a fresh loopback `/callback`, verifies the nonce (mismatch → plain error naming
  a possible interception, next step: re-run), and exchanges. `LOOPBACK_TIMEOUT` →
  `browser-step-abandoned` with `step: 'install'`.

- [ ] **Step 1: Failing tests** against the fake: `exchangeCode` happy path returns the
  token; `bad_verification_code` maps to the catalogue; `reauthorize` round-trips the
  nonce and a tampered value throws with a `Next step` in the message; nothing is written
  under `CAIRN_STATE_DIR` by this module (assert the dir untouched).
- [ ] **Step 2-4: Fail, implement, green.**
- [ ] **Step 5: Commit** (`feat: add the own-App code exchange and resume authorize`).

### Task 8: Repo create, installation link, and the Git Data push

**Files:**
- Create: `packages/create-cairn-site/src/github/repo.mjs`
- Test: `packages/create-cairn-site/src/github/repo.test.mjs`

**Interfaces:**
- Consumes: Tasks 4, 5.
- Produces:
  - `createRepo(token, { name, ownerType, org }) -> Promise<{ id, owner, repo }>` —
    `POST /user/repos` or `POST /orgs/<org>/repos`, body `{ name, private: true,
    auto_init: true }` (`auto_init` seeds the repo so the Git Data API works; an empty repo
    409s it). 422 name-exists → `chapterError('repo-name-collision', ...)`; 403 with a
    SAML/SSO indicator → `chapterError('sso-blocked', ...)`.
  - `verifyInstallationCovers(token, { installationId, owner, repo }) -> Promise<void>`
    (amended by the spike; replaces the planned PUT + verify) — the PUT is refused for user
    tokens (403 `Resource not accessible by integration`) and unnecessary, since a repo
    created with the App's own user token is auto-added to the installation, selected-mode
    included. So: `GET /user/installations/<installationId>/repositories` must list
    `<owner>/<repo>`; absence → `chapterError('installation-not-covering-repo', ...)`
    (next step: the install URL with "choose Only select repositories and add <repo>",
    then the re-run).
  - `pushScaffold(token, { owner, repo, dir, log }) -> Promise<{ commitSha }>` — reads the
    seed ref (`GET git/ref/heads/main`), walks `dir` recursively skipping `node_modules`,
    `.git`, and `SCAFFOLD_SENTINEL` (imported from `scaffold.mjs`; if Task 11 has not
    landed yet the implementer defines the constant there with a one-line comment and Task
    11 builds around it), creates blobs (base64), one **full** tree (no `base_tree`, so
    the `auto_init` README drops out of the tree), one commit with the seed as parent
    (`message: TOOL_COMMIT_MESSAGE`, an exported constant
    `'Initial commit from create-cairn-site'`), then **`PATCH git/refs/heads/main`**.
  - **Idempotent re-push:** before walking, `pushScaffold` reads the ref's commit
    (`GET git/commits/<sha>`); if its message equals `TOOL_COMMIT_MESSAGE` the push already
    landed and it returns that sha with a log line. A network or 5xx failure mid-push →
    `chapterError('push-interrupted', ...)` (next step: the re-run; blobs are
    content-addressed so re-creating them is safe).
  - The walk logs `Pushing <n> files`; nothing per file.

- [ ] **Step 1: Failing tests** against the fake: create (both owner types) fails 404
  without an installation (seed one in `state`), succeeds with one, and seeds the fake's
  git state; collision and SSO rows via `failNext`; the coverage-verify happy path (the
  fake auto-adds a UAT-created repo to the installation, per the spike) and a seeded
  not-covered case → `installation-not-covering-repo`; a push lands blobs, a
  tree, a commit whose parent is the seed sha, and a PATCHed ref, with every fixture file
  present and `node_modules/junk` absent; **the re-push test is falsifiable by request
  count**: after a completed push, a second `pushScaffold` returns the same sha and the
  fake's `requests` log shows **zero** additional `POST` hits on blobs/trees/commits (this
  is the assertion; "the ref didn't change" would pass even if the check never ran); a
  mid-push `failNext('commits', 502, {})` → `push-interrupted`.
- [ ] **Step 2-4: Fail, implement, green.**
- [ ] **Step 5: Commit** (`feat: add repo create, installation link, and the git-data push`).

### Task 9: The install-and-authorize trip

**Files:**
- Create: `packages/create-cairn-site/src/github/install.mjs`
- Test: `packages/create-cairn-site/src/github/install.test.mjs`

**Interfaces:**
- Consumes: Tasks 3, 4 (`appJwt`, `githubRequest`), 5, 7 (`exchangeCode`).
- Produces: `installUrl(appSlug) -> string` (`<web>/apps/<slug>/installations/new`); and
  `installAndAuthorize({ appId, appSlug, clientId, clientSecret, pem, owner, ownerType,
  openBrowser, log, pollIntervalMs, maxWaitMs }) -> Promise<{ userToken,
  installationId }>`. Behavior:
  1. **Poll once before opening anything** (`GET /app/installations` with a fresh App JWT,
     matching `account.login === owner`): a resume must re-detect a completed install, not
     bounce the admin back to GitHub's install page. If found, obtain the token via
     Task 7's `reauthorize` and return.
  2. Otherwise print the pre-open line ("Your browser will open GitHub's install page for
     <appName>; choose where to install it and approve"), open `installUrl`, and wait on
     the loopback `/callback` for `code` + `installation_id` (the
     `request_oauth_on_install` redirect), heartbeat printing while it waits. Exchange the
     code → return both.
  3. On `LOOPBACK_TIMEOUT`: fall back to JWT polling for the remainder of `maxWaitMs`
     (covers an admin whose browser lost the redirect but who did complete the install);
     then `ownerType === 'org'` → `chapterError('org-approval-pending', ...)` (the
     parkable state); `ownerType === 'user'` → `chapterError('browser-step-abandoned',
     { step: 'install', ... })` whose text says the run's progress is saved and the re-run
     resumes.
  - Defaults: poll 3000 ms, `maxWaitMs` 600000 (ten minutes; five was too short for a
    first-time admin meeting 2FA).
- Consumed by Task 10, which catches `org-approval-pending` and parks.

- [ ] **Step 1: Failing tests** against the fake (poll interval 10 ms, waits in the tens of
  ms): with an installation pre-seeded, it returns without calling `openBrowser` (assert
  the injected fake was never invoked — this pins re-detect-before-browser); the callback
  path returns token + id; timeout with `ownerType: 'org'` → parked row; timeout with
  `'user'` → `browser-step-abandoned`; a wrong-key JWT is 401'd by the fake and surfaces
  as a plain error with a next step, not an infinite loop.
- [ ] **Step 2-4: Fail, implement, green.**
- [ ] **Step 5: Commit** (`feat: add the install-and-authorize trip with org parking`).

### Task 10: The chapter orchestration

**Files:**
- Create: `packages/create-cairn-site/src/github/chapter.mjs`,
  `packages/create-cairn-site/src/github/open.mjs`
- Modify: `packages/create-cairn-site/src/args.mjs`, `packages/create-cairn-site/bin.mjs`,
  `packages/create-cairn-site/src/state.mjs`
- Test: `packages/create-cairn-site/src/github/chapter.test.mjs` (+ new cases in
  `src/args.test.mjs`, `src/state.test.mjs`)

**Interfaces:**
- Consumes: everything above, plus T1's `defineAction`/`runActions`,
  `saveSite`/`loadSite`, `@clack/prompts` (`confirm`, `select`, `text`).
- Produces (state.mjs): `updateSite(id, patch) -> Promise<object>`:
  **create-or-update, deep-merging the `github` key** — `const current = await
  loadSite(id) ?? {}; const next = { ...current, ...patch, github: { ...current.github,
  ...patch.github } }` — then `saveSite(id, next)` and return `next`. It must never throw
  on a missing record (a thrown "record missing" after the App exists orphans a
  globally-unique App name; T1's warn-don't-abort comment in `scaffold.mjs` explains the
  class). A test asserts `github.appId` and `github.pem` written at the first hop survive
  every later hop to `pushed`.
- Produces (args.mjs): string options `app-name`, `org`, `repo-name` and booleans `github`
  and `start-over` (both default false), surfaced as `appName`, `org`, `repoName`,
  `github`, `startOver`.
- Produces (open.mjs): `openBrowser(url, log)` — spawns `xdg-open`/`open`/`start` per
  platform (detached, spawn errors swallowed) and **always logs the URL** ("Open this link
  if the browser did not open: <url>"), so headless and SSH sessions are never stuck.
- Produces (chapter.mjs): `runGithubChapter({ siteId, siteName, dir, flags, log, dryRun,
  openBrowser? }) -> Promise<'pushed' | 'parked' | 'declined'>`.

Chapter flow (each numbered piece is an Action through `runActions`, so `--dry-run` prints
every title and detail and executes nothing):

1. **Store pre-check** (real mode only, before consent): `updateSite(siteId, {})` proves
   the store is writable; on failure the chapter stops **before any remote resource
   exists**: "the tool could not save its progress record under <siteStateDir()>; fix that
   first (<cause>). Next step: ...". This is the one place failing hard is cheap.
2. **Consent.** Printed summary first: what will be created (a GitHub App named
   `<appName>` that only this site uses, a private repository `<repoName>`, **two trips to
   your browser**), and the permission cost stated plainly, exactly: "The App will be able
   to write this site's content and manage the repository's settings, **including deleting
   it**. GitHub does not allow an App's permissions to be reduced later, so this stays for
   as long as the App exists. This is what lets the tool create and publish to the
   repository for you." Then `confirm`. Non-interactive: `--yes` without `--github` skips
   with a printed re-run line; `--github` opts in. Declined → `'declined'` (a normal
   return; no catalogue row).
3. **Account prompts.** `select`: personal ("My personal account") or organization; org →
   `text` prefilled from `--org`, and the typed login is validated immediately with the
   **unauthenticated** `GET /orgs/<org>` (404 → re-prompt: "GitHub has no organization
   called '<x>'. Use the name from your organization's URL: github.com/<this part>").
   Repo name: `text` defaulting to the site slug (`--repo-name` short-circuits). App name:
   default `cairn-<slug>` (`--app-name` short-circuits).
4. **Actions**, in order, each hop persisted via `updateSite`:
   - `Create your GitHub App` → `runManifestFlow`; → `{ step: 'app-created', github:
     { <credentials>, owner, ownerType } }`.
   - `Install the App and sign in` → `installAndAuthorize`; → `{ step: 'installed',
     github: { installationId } }` (the deep merge preserves the credentials). An
     `org-approval-pending` error is caught here: → `{ step: 'awaiting-org-approval' }`,
     the message prints, the chapter returns `'parked'` (exit 0; parking is a success
     state).
   - `Create the private repository <name>` → identity print via `GET /user` ("Signed in
     as <login>"), org branch membership check (`GET /orgs/<org>/memberships/<login>`,
     now permitted by the manifest's Members read; a refusal is a plain error with a next
     step), `createRepo`, `linkRepoToInstallation`; → `{ step: 'repo-created', github:
     { repo } }`.
   - `Push your site to GitHub` → `pushScaffold`; → `{ step: 'pushed' }`. The user token
     is a local variable spanning the install-through-push actions and is never written
     anywhere.
5. **Chapter hand-over** (returned to bin.mjs to print): repo URL, App URL, "deploy
   arrives with the next chapter" stub, the doctor line.

bin.mjs wiring: `runGithubChapter` is called **in both modes** — after a real scaffold, and
after a dry-run's action listing (with `dryRun: true`, where it prints the chapter's action
details, prompts for nothing, defaults to the personal branch unless `--org` was given, and
makes zero network calls). Thread `siteId` out of the scaffold (change `scaffold()` to
return `{ executed, skipped, siteId }`, generating the id up front instead of inside the
state action).

- [ ] **Step 1: Failing tests.** Drive `runGithubChapter` end to end against the fake with
  injected `openBrowser`/`log` and the test driving the loopback routes (the Task 6/9
  pattern), `flags: { yes: true, github: true, ... }`: happy path returns `'pushed'` and
  the state walks `scaffolded → app-created → installed → repo-created → pushed` (assert
  each hop by reading the store, **including that `github.appId` and `github.pem` are
  still present at `pushed`**); org path with no installation appearing parks
  (`'awaiting-org-approval'` in state, `'parked'` returned); `--yes` without `--github`
  skips; **dry-run through the bin path**: with `dryRun: true` the chapter returns after
  printing App/repo/install details and the fake's `requests` array has length **zero**;
  the state record after the happy path **contains the PEM** (positive control) and does
  **not** contain the string `fake-user-token`; a scan of the scaffold `dir` finds no
  `PRIVATE KEY`, no `clientSecret` value, and no token string (the spec's
  no-secret-under-the-project rule, automated at last); store pre-check failure (make
  `CAIRN_STATE_DIR` point at a file) stops before any fake request.
- [ ] **Step 2-4: Fail, implement, green.**
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
  path.resolve(dir)`; newest mtime wins on duplicates; a malformed record is skipped,
  never fatal. And `retireSite(id) -> Promise<void>`: renames `<id>.json` to
  `<id>.retired-<epoch-ms>.json` (kept, not deleted; `findSiteByDir` only reads `*.json`
  files whose stem matches an id, so a retired record is invisible to matching — implement
  the filter accordingly).
- Produces (scaffold.mjs): `SCAFFOLD_SENTINEL = '.cairn-scaffold-claim'` (exported). The
  copy action's execute becomes claim-copy-release:

```js
execute: async () => {
  await mkdir(dir, { recursive: true }); // parents too: --dir sites/my-site must not regress
  const sentinel = path.join(dir, SCAFFOLD_SENTINEL);
  try {
    await writeFile(sentinel, String(process.pid), { flag: 'wx' }); // the atomic claim
  } catch (cause) {
    if (cause.code === 'EEXIST') {
      throw new Error(
        `scaffold: another create-cairn-site run is already scaffolding ${dir}. Wait for ` +
          'it to finish, or if it crashed, remove the directory and run the command again.',
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

  And the early read-only guard learns the sentinel: in `assertTargetDirEmpty`, a
  directory whose **only** entry is `SCAFFOLD_SENTINEL` throws the interrupted-run
  message ("a previous create-cairn-site run was interrupted while scaffolding ${dir}.
  Remove the directory and run the command again."), which both makes the crafted message
  reachable by test and gives a crashed run's leftovers an honest recovery instead of the
  generic non-empty message.
- Resume (bin.mjs): **`findSiteByDir` runs before `collectAnswers`** — a resuming admin
  must never be re-asked the site's name. When the target dir exists non-empty and a
  record is found:
  - `--start-over` → `retireSite`, print that the old record was set aside, fall through
    to the fresh-run path (which then hits the non-empty guard honestly).
  - Record at a resumable step (`scaffolded`, `app-created`, `awaiting-org-approval`,
    `installed`, `repo-created`) → print "Resuming <name> at <step>" and run
    `runGithubChapter` with the saved state. Chapter re-entry skips completed actions by
    `step`; `awaiting-org-approval` re-enters the install action, whose poll-first
    behavior (Task 9) re-detects an approval without opening a browser. An explicit
    `--org`, `--repo-name`, or `--app-name` **overrides** the saved answer for the steps
    not yet completed (a wrong saved org must never be a permanent dead-end; note in the
    printed resume line when an override is applied).
  - Record at `pushed` → print "This site's GitHub chapter is complete" plus the stub
    hand-over.
  - No record → the T1 guard message, unchanged.

- [ ] **Step 1: Failing tests.** `findSiteByDir`: match, no-match, malformed-file
  tolerance, retired records ignored. `retireSite`: the file is renamed, not deleted.
  Claim: pre-write the sentinel with `wx` into an otherwise-empty target and assert the
  **interrupted-run** message from the early guard (reachable now by design); assert the
  sentinel is gone after a successful scaffold (real template fixture); assert
  `--dir` with a missing parent (`sites/my-site` under a fresh tmp dir) scaffolds
  (pins `recursive: true`); dry-run creates neither dir nor sentinel. Resume: with a
  record at `app-created` and a scaffolded dir, a re-run reaches the install action
  without a second manifest exchange (fake `requests` shows zero `conversions` hits) and
  without prompting for the site name (inject a prompt fake that throws if called); with
  `awaiting-org-approval` and an installation row now present, resume completes to
  `pushed` without `openBrowser` being invoked; `--start-over` retires the record and the
  run proceeds as fresh.
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
**Blast radius, enumerated** (T1 shipped the printed-command fix in one file and missed
two others; this task's copy surfaces move together): the bake's `SITE_README`
(`bake-template.mjs:38-48`) still teaches `CAIRN_DEV_BACKEND=1 npm run dev` with a
PowerShell branch and is locked by `bake-template.test.mjs:111-121`; the bake test at
`:97` asserts `scripts/` does NOT exist in the template; and `create-site.yml:104` loops
over leftovers `["e2e", "playwright.config.ts", ".claude", "scripts"]` asserting each is
absent from the scaffolded site. All three change here or the task cannot land green.

**Interfaces:**
- Produces (bake): the baked template contains `scripts/dev.mjs` (content below); the
  emitted `package.json`'s `dev` script is rewritten from exactly `"vite dev"` to
  `"node scripts/dev.mjs"` behind a rot gate (`bake: expected the showcase dev script to
  be "vite dev", found "<value>"`; the `pruneShowcaseOnlyPackageFields` precedent); and
  `SITE_README`'s dev instructions become plain `npm run dev` with one sentence saying the
  dev script starts the local admin stand-in.

```js
// scripts/dev.mjs: start the dev server with the local admin's backend enabled.
// CAIRN_DEV_BACKEND=1 is the runtime half of the dev-backend gate. It is deliberately a
// runtime variable, not a build define, so no production build can fold the dev backend
// into a deployed Worker; this shim exists so plain `npm run dev` works on any platform
// without setting the variable by hand.
import { spawn } from 'node:child_process';

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const child = spawn(npx, ['--no-install', 'vite', 'dev', ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, CAIRN_DEV_BACKEND: '1' },
});
child.on('error', (cause) => {
  console.error(`could not start the dev server: ${cause.message}`);
  console.error('Next step: run "npm install" in this directory, then "npm run dev" again.');
  process.exit(1);
});
child.on('exit', (code) => process.exit(code ?? 1));
```

- Produces (scaffold.mjs): `handoverText({ dir })` loses its `platform` parameter and the
  PowerShell branch; the dev line is plain `npm run dev`; the stand-in paragraph stays but
  the sentence naming `CAIRN_DEV_BACKEND=1` becomes "the scaffold's own dev script turns
  the stand-in on." bin.mjs's call site drops the `platform` argument.

- [ ] **Step 1: Rewrite the locking tests first, failing.** In `bake-template.test.mjs`:
  the template's `scripts/` contains **exactly** `dev.mjs` (replaces the `:97`
  scripts-absent assertion; exact-content beats mere-presence, so a future showcase-script
  leak still fails); the shim's content names `CAIRN_DEV_BACKEND`; the emitted
  `package.json.scripts.dev` equals `node scripts/dev.mjs`; a doctored input whose `dev`
  script is not `"vite dev"` throws the rot-gate message; `SITE_README` contains
  `npm run dev` and does **not** contain `CAIRN_DEV_BACKEND` or `$env:` (replaces the
  `:111-121` locks). In `scaffold.test.mjs`: replace exactly two tests, identified **by
  title, not line range** — "the hand-over block names CAIRN_DEV_BACKEND and never prints
  a bare npm run dev line" and "the win32 branch prints the PowerShell form instead of the
  env-prefix form" — with: the hand-over contains the bare `cd`/`npm install`/`npm run
  dev` sequence, the string `CAIRN_DEV_BACKEND` appears **nowhere** in it (the inversion
  of T1's lock), and `handoverText` takes no platform. The absolute-`--dir` test and the
  dry-run-closing test in the same region are T1 regression locks and **must survive
  untouched**.
- [ ] **Step 2: Run to fail.** **Step 3: Implement** (bake shim + script rewrite + README
  rewrite; hand-over simplification; bin call site).
- [ ] **Step 4: Update `create-site.yml`**: in the leftover loop at `:104`, remove
  `"scripts"` from the absent-list and add an assertion that `scripts/` contains exactly
  `dev.mjs`; then append the falsifiable admin probe after the existing build step (the
  scaffold dir there is the hardcoded `/tmp/ci-site`; the dev-gate makes a broken shim a
  303 and a dead server a 000, so 200 is load-bearing):

```yaml
      - name: Dev server reaches the admin
        working-directory: /tmp/ci-site
        run: |
          setsid npm run dev -- --port 4173 --strictPort &
          DEV_PGID=$!
          code=000
          for i in $(seq 1 60); do
            code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4173/admin || true)
            [ "$code" = "200" ] && break
            sleep 1
          done
          kill -- -"$DEV_PGID" 2>/dev/null || true
          if [ "$code" != "200" ]; then
            echo "the scaffolded site's /admin returned '$code', not 200"
            exit 1
          fi
```

  (`setsid` + negative-PID kill takes down npm's whole process group, so the vite
  grandchild cannot hold the port or the step's stdout open; every kill/curl failure path
  is `|| true`'d so the diagnostic echo is reached under `bash -e`.)
- [ ] **Step 5: Run the package suite green, commit** (`feat: make bare npm run dev start
  the scaffolded admin`), **push, and confirm the `create-site` workflow is green on CI**
  before the pass continues (this gate is CI-only).

### Task 13: The live e2e (main loop + Geoff)

**Files:**
- Create: evidence recorded in this plan's post-mortem; divergence notes appended to
  `docs/internal/2026-08-10-t2-own-app-spike.md`

One Geoff browser sitting, late in the pass, after Tasks 2-12 are green (the second of the
pass's two sittings; the spec's earlier one-sitting claim was amended).

- [ ] **Step 1: Personal run.** From a scratch directory, bake with the CI pattern
  (`node scripts/bake-template.mjs --to template --engine-spec <packed-engine-tarball>
  --dev-spec <packed-dev-tarball>`), then run `node bin.mjs --name "T2 Live" ...` through
  the full chapter against glw907: manifest → install+authorize (count the browser trips;
  the consent copy's "two" must be what happens) → repo → link → push. Verify on
  github.com: the App exists with exactly the manifest's permissions, the private repo
  holds the scaffold at `heads/main` as one tool commit atop the `auto_init` seed, the
  installation covers the repo. Verify locally: the state record is at `pushed`, mode
  0600, contains the PEM, and contains no user-token value; the scaffold dir contains no
  key or secret material.
- [ ] **Step 2: Org run.** Geoff creates a free scratch org in the same sitting; run the
  org path (`--org <scratch>`): manifest at the org URL (with Members read visible in the
  App's permissions), repo under the org, install completes (Geoff is the owner, so
  approval is immediate; the parked state stays fake-proven per the spec).
- [ ] **Step 3: Resume check, live.** Interrupt one run after `app-created` (close the
  install tab, let it park or abandon), re-run, and confirm it resumes without re-asking
  the site name and without a second manifest exchange.
- [ ] **Step 4: Tear down** both Apps, both repos, and the scratch org's artifacts in the
  same sitting.
- [ ] **Step 5: Record the evidence** (commands, statuses, trip count, teardown) in the
  post-mortem. Any divergence between the fake server and real GitHub is a Task-2 bug to
  fix in this pass, with the fake corrected and the suite re-run.

### Task 14: Docs, tracking, and pass close

**Files:**
- Modify: `packages/create-cairn-site/README.md`, `CHANGELOG.md`,
  `docs/internal/docs-friction-log.md`, `ROADMAP.md`, `docs/STATUS.md`, this plan
  (post-mortem)

- [ ] **Step 1: README.** The package README gains the GitHub chapter: what gets created
  and why (the own-App shape; the Administration permission stated with the same plainness
  as the consent copy, deletion and permanence included; the org branch's Members read),
  the two browser trips, the flags (`--github`, `--app-name`, `--org`, `--repo-name`,
  `--start-over`), resume behavior, and the org-approval parked state. Follow the existing
  README's register.
- [ ] **Step 2: CHANGELOG.** Extend the `## Unreleased` create-cairn-site entry (T1's
  paragraph sets the convention) with the chapter: manifest-first own-App design, no
  standing OAuth client, two browser trips via `request_oauth_on_install`, the resume
  frame with `--start-over`, the atomic claim, the dev shim (`npm run dev` now reaches the
  local admin bare). `Consumers must: nothing` (the tool is unpublished; no engine surface
  changed).
- [ ] **Step 3: Friction log.** Complete-or-move: delete the "scaffolded `dev` script"
  entry (shipped, Task 12) and the "check-then-copy" entry (shipped, Task 11), each with
  the one-line disposition the log's header requires. The `SiteConfig` comment entry
  stays, untouched (spec: not a T2 rider).
- [ ] **Step 4: ROADMAP.** Mark the T2 slice of the create-cairn-site item done in place;
  T3 remains.
- [ ] **Step 5: Doc gates.** Run all four by name: `npm run check:reference`,
  `check:reference:signatures`, `check:docs`, `check:package`, plus `check:snippets` if
  any fenced block under `docs/guides` or `docs/reference` was touched.
- [ ] **Step 6: Pass-end ritual** per `cairn-pass`: code-simplifier over the pass's
  changed files; root `npm run check` 0/0; root `npm test` exit 0; `check:comments`;
  `check:surface` (no engine change expected; if it flags, something leaked and must be
  understood, not snapshotted); push the branch and confirm all five CI workflows green
  (`test`, `e2e`, `design`, `scaffold`, `create-site`). Append the post-mortem to this
  plan; update STATUS (T2 done, T3 next, the resume prompt for the T3 planning sitting);
  prep the context clear.

---

## Self-review notes

Spec coverage (against the amended spec): two-trip flow with `request_oauth_on_install`
(Tasks 6, 9, 10), portless callback pinned by test (Task 6), install-before-repo ordering
(Tasks 9-10, fake enforces it in Task 2), repo link + coverage verification (Task 8),
`auto_init` push with parented commit and PATCH (Task 8), spike exercising the final shape
with the conflation fixed and fallback guidance that names its own re-verification (Task
1), org Members read and org-login validation at the prompt (Tasks 6, 10), consent copy
with deletion + permanence (Task 10), store pre-check before remote resources (Task 10),
create-or-update deep-merge state writer with credential-survival test (Task 10),
dry-run through the bin path with the zero-requests instrument (Tasks 2, 10), resume
before prompts + overrides + `--start-over` + re-detect before browser (Tasks 9, 11),
atomic claim with reachable interrupted-run message and `recursive: true` (Task 11), the
amended catalogue set with every row triggered (Tasks 5-10; `browser-step-abandoned` in 6
and 9, `manifest-window-expired` in 6, `code-expired` in 7, collision/SSO/link/push rows
in 8, parking in 9-10) and the two dropped rows dropped, heartbeat constraint (global +
Tasks 6, 9), token opacity (global; no module parses a token), PEM positive control and
scaffold-dir secret scan (Task 10), fake fidelity requirements (Task 2, with SPIKE-pinned
statuses), dev shim blast radius: SITE_README + bake test + workflow leftover list +
by-title test replacement with the two T1 regression locks preserved (Task 12), CI probe
with process-group kill and reachable diagnostics (Task 12), two Geoff sittings (Tasks 1,
13) with a live resume check (Task 13), docs/CHANGELOG/friction-log/ROADMAP (Task 14).
Out-of-scope items (Worker-secret move, deploy, console, PAT build-out, `SiteConfig`)
appear in no task.

Type consistency: `chapterError` (5) consumed by 6-10; `startLoopback`/`LOOPBACK_TIMEOUT`
(3) by 6, 7, 9; `githubRequest`/`appJwt` (4) by 6-9; `exchangeCode`/`reauthorize` (7) by
9; `installAndAuthorize` (9) by 10; `createRepo`/`linkRepoToInstallation`/`pushScaffold`/
`TOOL_COMMIT_MESSAGE` (8) by 10; `SCAFFOLD_SENTINEL` exported (11) and skipped (8, with
the landing-order note); `updateSite`/`findSiteByDir`/`retireSite` (10/11) consistent with
T1's `saveSite`/`loadSite`; the step enum (header) matches Task 10's hops and Task 11's
resumable list; `FakeGithub.failNext` route names used in 6-10 match Task 2's list;
`requests` (2) consumed by 8, 10, 11.
