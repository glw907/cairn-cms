// A fake GitHub, standing in for both api.github.com and github.com over plain HTTP on
// ephemeral loopback ports. It exists so the T2 chapter's manifest-flow, install-flow, and
// git-data tests run with no network call and no real GitHub App, while still exercising the
// exact request shapes (a real RSA keypair, a real JWT verify, GitHub's own error bodies) that
// would trip a naive client. Every test drives it through the returned `state` and `requests`
// rather than by asserting on the fake's internals, so a later task's dry-run and re-push tests
// can assert "zero requests happened" or "no second push happened" against the same log.
//
// Two http.Server instances, not one: apiBase plays api.github.com, webBase plays github.com.
// A real client never talks to both from the same base URL, so keeping them separate here
// catches a client that accidentally points a web-flow call at the API host or vice versa.
import { createServer } from 'node:http';
import { generateKeyPairSync, randomBytes, createVerify } from 'node:crypto';

/**
 * @typedef {object} FakeGithub
 * @property {string} apiBase the fake api.github.com base URL, `http://127.0.0.1:<port>`
 * @property {string} webBase the fake github.com base URL, `http://127.0.0.1:<port>`
 * @property {object} state mutable fixture state: apps, repos, installations, gitObjects, orgs
 * @property {Array<{ method: string, pathname: string, authorization: string | null }>} requests
 *  every request received by either server, in arrival order; append-only, never reset except
 *  by starting a new server
 * @property {(route: string, status: number, body: unknown) => void} failNext arm a one-shot
 *  status/body override for the next request matching `route`
 * @property {() => Promise<void>} close stop both servers
 */

/**
 * Start the fake GitHub servers.
 * @returns {Promise<FakeGithub>} the running fake, ready for requests
 */
export async function startFakeGithub() {
  const requests = [];
  const failNextMap = new Map();
  const state = {
    apps: [],
    repos: [],
    installations: [],
    gitObjects: new Map(),
    orgs: []
  };
  const counters = { nextAppId: 1, nextRepoId: 1 };

  // The route tables reference apiBase/webBase (for html_url and blob/commit URLs), which are
  // only known once both servers have a bound port. Route to a mutable dispatcher so the
  // servers can start listening before the route tables exist.
  let apiDispatcher = (_req, res) => sendJson(res, 503, { message: 'fake-github: not ready yet' });
  let webDispatcher = (_req, res) => sendJson(res, 503, { message: 'fake-github: not ready yet' });
  const apiServer = createServer((req, res) => apiDispatcher(req, res));
  const webServer = createServer((req, res) => webDispatcher(req, res));

  await new Promise((resolve) => apiServer.listen(0, '127.0.0.1', resolve));
  await new Promise((resolve) => webServer.listen(0, '127.0.0.1', resolve));

  const apiBase = `http://127.0.0.1:${apiServer.address().port}`;
  const webBase = `http://127.0.0.1:${webServer.address().port}`;
  const ctx = { state, counters, apiBase, webBase };

  apiDispatcher = makeHandler(
    [
      { method: 'POST', regex: compile('/app-manifests/:code/conversions'), route: 'conversions', handler: createConversionsHandler(ctx) },
      { method: 'POST', regex: compile('/user/repos'), route: 'user_repos', handler: createRepoHandler(() => 'fake-admin', ctx) },
      { method: 'POST', regex: compile('/orgs/:org/repos'), route: 'org_repos', handler: createRepoHandler((params) => params.org, ctx) },
      { method: 'PUT', regex: compile('/user/installations/:iid/repositories/:rid'), route: 'link', handler: createLinkHandler(ctx) },
      { method: 'GET', regex: compile('/user/installations/:iid/repositories'), route: 'link', handler: createListLinkedReposHandler(ctx) },
      { method: 'POST', regex: compile('/repos/:owner/:repo/git/blobs'), route: 'blobs', handler: createBlobHandler(ctx) },
      { method: 'POST', regex: compile('/repos/:owner/:repo/git/trees'), route: 'trees', handler: createTreeHandler(ctx) },
      { method: 'POST', regex: compile('/repos/:owner/:repo/git/commits'), route: 'commits', handler: createCreateCommitHandler(ctx) },
      { method: 'GET', regex: compile('/repos/:owner/:repo/git/commits/:sha'), route: 'commits', handler: createGetCommitHandler(ctx) },
      { method: 'PATCH', regex: compile('/repos/:owner/:repo/git/refs/heads/main'), route: 'refs', handler: createUpdateRefHandler(ctx) },
      { method: 'GET', regex: compile('/repos/:owner/:repo/git/ref/heads/main'), route: 'refs', handler: createGetRefHandler(ctx) },
      { method: 'POST', regex: compile('/repos/:owner/:repo/git/refs'), route: 'refs', handler: createCreateRefHandler(ctx) },
      { method: 'GET', regex: compile('/app/installations'), route: 'installations', handler: createListInstallationsHandler(ctx) },
      { method: 'GET', regex: compile('/user'), route: 'user', handler: createGetUserHandler() },
      { method: 'GET', regex: compile('/orgs/:org'), route: 'org', handler: createGetOrgHandler(ctx) },
      { method: 'GET', regex: compile('/orgs/:org/memberships/:user'), route: 'membership', handler: createGetMembershipHandler(ctx) }
    ],
    { requests, failNextMap }
  );

  webDispatcher = makeHandler(
    [
      { method: 'GET', regex: compile('/login/oauth/authorize'), route: 'authorize', handler: createAuthorizeHandler(ctx) },
      { method: 'GET', regex: compile('/apps/:slug/installations/new'), route: null, handler: createInstallStandInHandler() },
      { method: 'POST', regex: compile('/login/oauth/access_token'), route: 'access_token', handler: createAccessTokenHandler() }
    ],
    { requests, failNextMap }
  );

  return {
    apiBase,
    webBase,
    state,
    requests,
    failNext(route, status, body) {
      failNextMap.set(route, { status, body });
    },
    async close() {
      await Promise.all([
        new Promise((resolve) => apiServer.close(resolve)),
        new Promise((resolve) => webServer.close(resolve))
      ]);
    }
  };
}

/**
 * Compile a `/foo/:bar/baz` path pattern into an anchored regex with named capture groups.
 * @param {string} pattern the path pattern; a `:name` segment becomes a `(?<name>[^/]+)` group
 * @returns {RegExp} the anchored regex
 */
function compile(pattern) {
  const source = pattern.replace(/:[^/]+/g, (token) => `(?<${token.slice(1)}>[^/]+)`);
  return new RegExp(`^${source}$`);
}

/**
 * Build a request listener that logs every request, matches it against a route table, decodes
 * a one-shot `failNext` override before the route's own handler ever runs, and reads and parses
 * the body for methods that carry one.
 * @param {Array<{ method: string, regex: RegExp, route: string | null, handler: Function }>} routes
 * @param {{ requests: unknown[], failNextMap: Map<string, { status: number, body: unknown }> }} shared
 * @returns {(req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => Promise<void>}
 */
function makeHandler(routes, { requests, failNextMap }) {
  return async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host ?? '127.0.0.1'}`);
    const authorization = req.headers.authorization ?? null;
    requests.push({ method: req.method, pathname: url.pathname, authorization });

    let match = null;
    let params = {};
    for (const candidate of routes) {
      if (candidate.method !== req.method) continue;
      const result = candidate.regex.exec(url.pathname);
      if (result) {
        match = candidate;
        params = result.groups ?? {};
        break;
      }
    }
    if (!match) {
      sendJson(res, 404, { message: 'Not Found' });
      return;
    }

    let body = {};
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      const raw = await readRawBody(req);
      body = parseBody(raw, req.headers['content-type']);
    }

    if (match.route) {
      const override = failNextMap.get(match.route);
      if (override) {
        failNextMap.delete(match.route);
        sendJson(res, override.status, override.body);
        return;
      }
    }

    await match.handler(req, res, params, url, body, req.headers);
  };
}

/** Buffer a request body to a UTF-8 string. Resolves with `''` for a bodyless request. */
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/**
 * Parse a request body as form-urlencoded (unwrapping a JSON `manifest` field, the real GitHub
 * manifest flow's hidden form field) or, for everything else, as JSON. A test driving this fake
 * directly with `fetch(..., { body: JSON.stringify(x) })` sends no explicit content-type, so the
 * JSON path is also the permissive fallback rather than being gated on the header.
 * @param {string} raw the raw body text
 * @param {string | undefined} contentType the request's `content-type` header
 * @returns {Record<string, unknown>} the parsed body, or `{}` when empty or unparseable
 */
function parseBody(raw, contentType) {
  if (!raw) return {};
  if (contentType && contentType.includes('x-www-form-urlencoded')) {
    const parsed = Object.fromEntries(new URLSearchParams(raw).entries());
    if (typeof parsed.manifest === 'string') {
      try {
        parsed.manifest = JSON.parse(parsed.manifest);
      } catch {
        // Not JSON after all; leave the raw string, and the caller's manifest-shape guard
        // falls back to treating the whole body as the manifest.
      }
    }
    return parsed;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/** Write a JSON response with the given status. */
function sendJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

/** A fake 40-character hex sha, good enough to stand in for a git object id. */
function randomSha() {
  return randomBytes(20).toString('hex');
}

/** Slugify an app name for use in a fake app slug; never empty. */
function slugify(name) {
  const slug = String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '');
  return slug || 'fake-app';
}

/** Seed a repo's git object store with a root commit on `heads/main`. */
function seedRepo(entry) {
  const sha = randomSha();
  entry.commits.set(sha, { sha, message: 'Initial commit' });
  entry.refs.set('heads/main', sha);
  entry.seeded = true;
}

/**
 * Verify a GitHub App JWT's RS256 signature against the registered app named by its `iss` claim.
 * @param {object} state the fake's state (for `state.apps`)
 * @param {string | undefined} authorizationHeader the received `authorization` header
 * @returns {{ ok: boolean, app?: object }} whether the JWT verified, and the app it named
 */
function verifyAppJwt(state, authorizationHeader) {
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) return { ok: false };
  const jwt = authorizationHeader.slice('Bearer '.length);
  const parts = jwt.split('.');
  if (parts.length !== 3) return { ok: false };
  const [headerB64, payloadB64, signatureB64] = parts;
  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return { ok: false };
  }
  const app = state.apps.find((candidate) => String(candidate.id) === String(payload.iss));
  if (!app) return { ok: false };
  const verifier = createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();
  try {
    const ok = verifier.verify(app._publicKeyPem, Buffer.from(signatureB64, 'base64url'));
    return { ok, app };
  } catch {
    return { ok: false };
  }
}

/**
 * Two callback URLs match when they are identical, or when the registered URL is a portless
 * `http://127.0.0.1/...` and the requested URL is the same URL on any port: GitHub's loopback
 * exception, which lets a CLI register one callback and bind an arbitrary local port per run.
 * Anything else is a mismatch, deliberately: a fake that redirected on any other near-match
 * would hide the exact defect class the portless registration exists to catch.
 */
function redirectMatches(registeredUrls, requestedUrl) {
  return registeredUrls.some((registered) => {
    if (registered === requestedUrl) return true;
    let registeredParsed;
    let requestedParsed;
    try {
      registeredParsed = new URL(registered);
      requestedParsed = new URL(requestedUrl);
    } catch {
      return false;
    }
    const bothLoopback = registeredParsed.hostname === '127.0.0.1' && requestedParsed.hostname === '127.0.0.1';
    if (!bothLoopback || registeredParsed.port !== '') return false;
    return (
      registeredParsed.protocol === requestedParsed.protocol &&
      registeredParsed.pathname === requestedParsed.pathname &&
      registeredParsed.search === requestedParsed.search
    );
  });
}

// --- apiBase route handlers -------------------------------------------------------------

function createConversionsHandler(ctx) {
  return async (_req, res, params, _url, body) => {
    if (params.code === 'expired') {
      sendJson(res, 404, { message: 'Not Found' });
      return;
    }
    // Modeled two ways: a raw JSON body (what a test driving this fake directly sends), or a
    // form field named `manifest` holding the same JSON (the real browser flow's hidden field,
    // already unwrapped to an object by parseBody above).
    const manifest = body && typeof body.manifest === 'object' && body.manifest !== null ? body.manifest : (body ?? {});
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs1', format: 'pem' }
    });
    const id = ctx.counters.nextAppId;
    ctx.counters.nextAppId += 1;
    const slug = `${slugify(manifest.name)}-${id}`;
    const app = {
      id,
      slug,
      client_id: `fake-client-${id}`,
      client_secret: randomBytes(16).toString('hex'),
      pem: privateKey,
      webhook_secret: randomBytes(16).toString('hex'),
      html_url: `${ctx.webBase}/apps/${slug}`,
      owner: { login: 'fake-owner' },
      callback_urls: Array.isArray(manifest.callback_urls) ? manifest.callback_urls : [],
      _publicKeyPem: publicKey
    };
    ctx.state.apps.push(app);
    sendJson(res, 201, {
      id: app.id,
      slug: app.slug,
      client_id: app.client_id,
      client_secret: app.client_secret,
      pem: app.pem,
      webhook_secret: app.webhook_secret,
      html_url: app.html_url,
      owner: app.owner
    });
  };
}

/**
 * Build the POST /user/repos or POST /orgs/:org/repos handler. Repo creation 404s until at
 * least one installation exists in state: the T2 chapter's ordering trap is a client that tries
 * to create a repo before the admin has finished the browser install, and this fake models "an
 * installation exists" rather than threading a specific app's identity through the OAuth token,
 * since a bare user token carries no app identity for a fake to check against.
 */
function createRepoHandler(getOwner, ctx) {
  return async (_req, res, params, _url, body) => {
    if (ctx.state.installations.length === 0) {
      sendJson(res, 404, { message: 'Not Found' });
      return;
    }
    const owner = getOwner(params);
    const name = body?.name ?? 'repo';
    const exists = ctx.state.repos.some((repo) => repo.owner.login === owner && repo.name === name);
    if (exists) {
      sendJson(res, 422, {
        message: 'Repository creation failed.',
        errors: [{ resource: 'Repository', code: 'custom', field: 'name', message: 'name already exists on this account' }]
      });
      return;
    }
    const id = ctx.counters.nextRepoId;
    ctx.counters.nextRepoId += 1;
    const repo = { id, name, full_name: `${owner}/${name}`, owner: { login: owner }, default_branch: 'main' };
    ctx.state.repos.push(repo);
    const gitEntry = { seeded: false, blobs: new Map(), trees: new Map(), commits: new Map(), refs: new Map() };
    ctx.state.gitObjects.set(repo.full_name, gitEntry);
    if (body?.auto_init === true) seedRepo(gitEntry);
    sendJson(res, 201, repo);
  };
}

function createLinkHandler(ctx) {
  return async (_req, res, params) => {
    const installation = ctx.state.installations.find((candidate) => String(candidate.id) === params.iid);
    if (!installation) {
      sendJson(res, 404, { message: 'Not Found' });
      return;
    }
    installation.repositories = installation.repositories ?? [];
    installation.repositories.push(params.rid);
    res.writeHead(204);
    res.end();
  };
}

function createListLinkedReposHandler(ctx) {
  return async (_req, res, params) => {
    const installation = ctx.state.installations.find((candidate) => String(candidate.id) === params.iid);
    const repositories = (installation?.repositories ?? [])
      .map((rid) => ctx.state.repos.find((repo) => String(repo.id) === String(rid)))
      .filter(Boolean);
    sendJson(res, 200, { repositories });
  };
}

function getGitEntry(ctx, owner, repo) {
  return ctx.state.gitObjects.get(`${owner}/${repo}`);
}

function createBlobHandler(ctx) {
  return async (_req, res, params, _url, body) => {
    const entry = getGitEntry(ctx, params.owner, params.repo);
    if (!entry) return sendJson(res, 404, { message: 'Not Found' });
    if (!entry.seeded) return sendJson(res, 409, { message: 'Git Repository is empty.' }); // SPIKE: provisional status
    const sha = randomSha();
    entry.blobs.set(sha, body?.content ?? '');
    sendJson(res, 201, { sha, url: `${ctx.apiBase}/repos/${params.owner}/${params.repo}/git/blobs/${sha}` });
  };
}

function createTreeHandler(ctx) {
  return async (_req, res, params, _url, body) => {
    const entry = getGitEntry(ctx, params.owner, params.repo);
    if (!entry) return sendJson(res, 404, { message: 'Not Found' });
    if (!entry.seeded) return sendJson(res, 409, { message: 'Git Repository is empty.' }); // SPIKE: provisional status
    const sha = randomSha();
    entry.trees.set(sha, body?.tree ?? []);
    sendJson(res, 201, { sha, url: `${ctx.apiBase}/repos/${params.owner}/${params.repo}/git/trees/${sha}` });
  };
}

function createCreateCommitHandler(ctx) {
  return async (_req, res, params, _url, body) => {
    const entry = getGitEntry(ctx, params.owner, params.repo);
    if (!entry) return sendJson(res, 404, { message: 'Not Found' });
    if (!entry.seeded) return sendJson(res, 409, { message: 'Git Repository is empty.' }); // SPIKE: provisional status
    const sha = randomSha();
    const message = body?.message ?? '';
    entry.commits.set(sha, { sha, message });
    sendJson(res, 201, { sha, message, url: `${ctx.apiBase}/repos/${params.owner}/${params.repo}/git/commits/${sha}` });
  };
}

function createGetCommitHandler(ctx) {
  return async (_req, res, params) => {
    const entry = getGitEntry(ctx, params.owner, params.repo);
    if (!entry) return sendJson(res, 404, { message: 'Not Found' });
    const commit = entry.commits.get(params.sha);
    if (!commit) return sendJson(res, 404, { message: 'Not Found' });
    sendJson(res, 200, { sha: commit.sha, message: commit.message });
  };
}

function createUpdateRefHandler(ctx) {
  return async (_req, res, params, _url, body) => {
    const entry = getGitEntry(ctx, params.owner, params.repo);
    if (!entry) return sendJson(res, 404, { message: 'Not Found' });
    if (!entry.seeded) return sendJson(res, 409, { message: 'Git Repository is empty.' }); // SPIKE: provisional status
    entry.refs.set('heads/main', body?.sha);
    sendJson(res, 200, { ref: 'refs/heads/main', object: { sha: body?.sha, type: 'commit' } });
  };
}

function createGetRefHandler(ctx) {
  return async (_req, res, params) => {
    const entry = getGitEntry(ctx, params.owner, params.repo);
    if (!entry) return sendJson(res, 404, { message: 'Not Found' });
    if (!entry.seeded) return sendJson(res, 409, { message: 'Git Repository is empty.' }); // SPIKE: provisional status
    const sha = entry.refs.get('heads/main');
    sendJson(res, 200, { ref: 'refs/heads/main', object: { sha, type: 'commit' } });
  };
}

function createCreateRefHandler(ctx) {
  return async (_req, res, params, _url, body) => {
    const entry = getGitEntry(ctx, params.owner, params.repo);
    if (!entry) return sendJson(res, 404, { message: 'Not Found' });
    const refName = String(body?.ref ?? '').replace(/^refs\//, '');
    if (entry.refs.has(refName)) {
      sendJson(res, 422, { message: 'Reference already exists' }); // SPIKE: provisional status
      return;
    }
    entry.refs.set(refName, body?.sha);
    sendJson(res, 201, { ref: `refs/${refName}`, object: { sha: body?.sha, type: 'commit' } });
  };
}

function createListInstallationsHandler(ctx) {
  return async (_req, res, _params, _url, _body, headers) => {
    const verified = verifyAppJwt(ctx.state, headers.authorization);
    if (!verified.ok) {
      sendJson(res, 401, { message: 'Bad credentials' });
      return;
    }
    sendJson(res, 200, ctx.state.installations);
  };
}

function createGetUserHandler() {
  return async (_req, res, _params, _url, _body, headers) => {
    sendJson(res, 200, { login: 'fake-admin', _authorization: headers.authorization ?? null });
  };
}

function createGetOrgHandler(ctx) {
  return async (_req, res, params) => {
    const org = ctx.state.orgs.find((candidate) => candidate.login === params.org);
    if (!org) {
      sendJson(res, 404, { message: 'Not Found' });
      return;
    }
    sendJson(res, 200, { login: org.login });
  };
}

function createGetMembershipHandler(ctx) {
  return async (_req, res, params) => {
    const org = ctx.state.orgs.find((candidate) => candidate.login === params.org);
    if (!org) {
      sendJson(res, 404, { message: 'Not Found' });
      return;
    }
    const role = org.memberships?.[params.user] ?? 'admin';
    sendJson(res, 200, { role, state: 'active', user: { login: params.user }, organization: { login: org.login } });
  };
}

// --- webBase route handlers -------------------------------------------------------------

function createAuthorizeHandler(ctx) {
  return async (_req, res, _params, url) => {
    const clientId = url.searchParams.get('client_id');
    const redirectUri = url.searchParams.get('redirect_uri') ?? '';
    const callerState = url.searchParams.get('state') ?? '';
    const app = ctx.state.apps.find((candidate) => candidate.client_id === clientId);
    const callbackUrls = app?.callback_urls ?? [];
    if (!redirectMatches(callbackUrls, redirectUri)) {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end('<html><body>The redirect_uri did not match a registered callback URL.</body></html>');
      return;
    }
    const target = new URL(redirectUri);
    target.searchParams.set('code', 'fake-code');
    if (callerState) target.searchParams.set('state', callerState);
    res.writeHead(302, { location: target.toString() });
    res.end();
  };
}

function createInstallStandInHandler() {
  return async (_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end('<html><body>Install cairn-cms on your account or organization.</body></html>');
  };
}

function createAccessTokenHandler() {
  return async (_req, res) => {
    sendJson(res, 200, { access_token: 'fake-user-token' });
  };
}
