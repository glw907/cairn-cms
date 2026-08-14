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
import { generateKeyPairSync, randomBytes, createVerify } from 'node:crypto';
import { compile, matchRoute, readRawBody, sendJson, startLoopbackServer } from './fake-server.mjs';

/**
 * @typedef {object} FakeGithub
 * @property {string} apiBase the fake api.github.com base URL, `http://127.0.0.1:<port>`
 * @property {string} webBase the fake github.com base URL, `http://127.0.0.1:<port>`
 * @property {object} state mutable fixture state: apps, repos, installations, gitObjects, orgs,
 *  ownerIds (a login-to-numeric-id map, assigned on first use by a repo create, a
 *  GET /repos/:owner/:repo read, or a GET /users/:login read); a repo created with
 *  `private: true` is readable only by a request carrying an authorization header, exactly as
 *  GitHub behaves; `state.suppressAutoLink = true` makes the next created repo
 *  skip the normal auto-add to its covering installation, for testing the otherwise-unreachable
 *  not-covered case; `state.nextDefaultBranch = '<name>'` is a one-shot: the next repo the fake
 *  creates reports that name as its `default_branch` (instead of the usual `main`), for testing
 *  a client's handling of an organization-set default other than `main`;
 *  `state.denyNextAuthorize = true` is a one-shot: the next `/login/oauth/authorize` redirect
 *  carries `error=access_denied` and no `code`, GitHub's own shape for a declined consent screen
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
    orgs: [],
    // Every owner login's fake numeric id, assigned the first time it is needed (a repo create
    // or a GET /repos/:owner/:repo read) and stable for the rest of the run: the real API's repo
    // owner carries an id alongside its login, which the connect chapter's Builds connection PUT
    // needs (providerAccountId), and nothing about repo creation itself requires one.
    ownerIds: new Map()
  };
  const counters = { nextAppId: 1, nextRepoId: 1, nextOwnerId: 1 };

  // The route tables reference apiBase/webBase (for html_url and blob/commit URLs), which are
  // only known once both servers have a bound port. Bind both first, then wire each one's real
  // dispatcher once the route tables exist.
  const apiServer = await startLoopbackServer('fake-github (api): not ready yet');
  const webServer = await startLoopbackServer('fake-github (web): not ready yet');

  const apiBase = apiServer.base;
  const webBase = webServer.base;
  const ctx = { state, counters, apiBase, webBase };

  apiServer.setDispatcher(makeHandler(
    [
      { method: 'POST', regex: compile('/app-manifests/:code/conversions'), route: 'conversions', handler: createConversionsHandler(ctx) },
      { method: 'POST', regex: compile('/user/repos'), route: 'user_repos', handler: createRepoHandler(() => 'fake-admin', ctx) },
      { method: 'POST', regex: compile('/orgs/:org/repos'), route: 'org_repos', handler: createRepoHandler((params) => params.org, ctx) },
      { method: 'PUT', regex: compile('/user/installations/:iid/repositories/:rid'), route: 'link', handler: createLinkHandler() },
      { method: 'GET', regex: compile('/user/installations/:iid/repositories'), route: 'installation_repos', handler: createListLinkedReposHandler(ctx) },
      { method: 'POST', regex: compile('/repos/:owner/:repo/git/blobs'), route: 'blobs', handler: createBlobHandler(ctx) },
      { method: 'POST', regex: compile('/repos/:owner/:repo/git/trees'), route: 'trees', handler: createTreeHandler(ctx) },
      { method: 'POST', regex: compile('/repos/:owner/:repo/git/commits'), route: 'commits', handler: createCreateCommitHandler(ctx) },
      { method: 'GET', regex: compile('/repos/:owner/:repo/git/commits/:sha'), route: 'commits', handler: createGetCommitHandler(ctx) },
      { method: 'PATCH', regex: compile('/repos/:owner/:repo/git/refs/heads/:branch'), route: 'refs-update', handler: createUpdateRefHandler(ctx) },
      { method: 'GET', regex: compile('/repos/:owner/:repo/git/ref/heads/:branch'), route: 'refs-read', handler: createGetRefHandler(ctx) },
      { method: 'POST', regex: compile('/repos/:owner/:repo/git/refs'), route: 'refs-create', handler: createCreateRefHandler(ctx) },
      { method: 'GET', regex: compile('/repos/:owner/:repo/git/trees/:sha'), route: 'trees-read', handler: createGetTreeHandler(ctx) },
      { method: 'GET', regex: compile('/repos/:owner/:repo/git/blobs/:sha'), route: 'blobs-read', handler: createGetBlobHandler(ctx) },
      { method: 'GET', regex: compile('/repos/:owner/:repo'), route: 'repo', handler: createGetRepoHandler(ctx) },
      { method: 'GET', regex: compile('/app/installations'), route: 'installations', handler: createListInstallationsHandler(ctx) },
      { method: 'GET', regex: compile('/users/:login'), route: 'users', handler: createGetPublicUserHandler(ctx) },
      { method: 'GET', regex: compile('/user'), route: 'user', handler: createGetUserHandler() },
      { method: 'GET', regex: compile('/orgs/:org'), route: 'org', handler: createGetOrgHandler(ctx) },
      { method: 'GET', regex: compile('/orgs/:org/memberships/:user'), route: 'membership', handler: createGetMembershipHandler(ctx) }
    ],
    { requests, failNextMap }
  ));

  webServer.setDispatcher(makeHandler(
    [
      { method: 'GET', regex: compile('/login/oauth/authorize'), route: 'authorize', handler: createAuthorizeHandler(ctx) },
      { method: 'GET', regex: compile('/apps/:slug/installations/new'), route: null, handler: createInstallStandInHandler() },
      { method: 'POST', regex: compile('/login/oauth/access_token'), route: 'access_token', handler: createAccessTokenHandler() }
    ],
    { requests, failNextMap }
  ));

  return {
    apiBase,
    webBase,
    state,
    requests,
    failNext(route, status, body) {
      failNextMap.set(route, { status, body });
    },
    async close() {
      await Promise.all([apiServer.close(), webServer.close()]);
    }
  };
}

/**
 * Point both GitHub base-URL env seams at a fake server for the duration of one test, and
 * register their cleanup with `t.after` so a later test never inherits a closed server's URL.
 * Lives beside the fake rather than in each suite because every module under test reads the two
 * seams at call time, so pointing them at the fake is the one setup step they all share.
 * @param {import('node:test').TestContext} t the running test's context
 * @param {{ apiBase: string, webBase: string }} github the fake server to point the seams at
 */
export function pointAtFake(t, github) {
  process.env.CAIRN_GITHUB_API_BASE = github.apiBase;
  process.env.CAIRN_GITHUB_WEB_BASE = github.webBase;
  t.after(() => {
    delete process.env.CAIRN_GITHUB_API_BASE;
    delete process.env.CAIRN_GITHUB_WEB_BASE;
  });
}

/**
 * Build a request listener that logs every request, matches it against a route table (via the
 * shared `matchRoute`), decodes a one-shot `failNext` override before the route's own handler
 * ever runs, and reads and parses the body for methods that carry one.
 * @param {Array<{ method: string, regex: RegExp, route: string | null, handler: Function }>} routes
 * @param {{ requests: unknown[], failNextMap: Map<string, { status: number, body: unknown }> }} shared
 * @returns {(req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => Promise<void>}
 */
function makeHandler(routes, { requests, failNextMap }) {
  return async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host ?? '127.0.0.1'}`);
    const authorization = req.headers.authorization ?? null;
    requests.push({ method: req.method, pathname: url.pathname, authorization });

    const { match, params } = matchRoute(routes, req.method, url.pathname);
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

/**
 * The fake numeric id for an owner login, assigned on first use and stable after that.
 * @param {{ state: object, counters: object }} ctx the fake's shared context
 * @param {string} login the owner's login
 * @returns {number} the owner's fake numeric id
 */
function ownerIdFor(ctx, login) {
  if (!ctx.state.ownerIds.has(login)) {
    ctx.state.ownerIds.set(login, ctx.counters.nextOwnerId);
    ctx.counters.nextOwnerId += 1;
  }
  return ctx.state.ownerIds.get(login);
}

/**
 * Whether this read of a repository must be refused. GitHub answers a read of a PRIVATE
 * repository with 404, never 403, when the request carries no credential: an anonymous caller is
 * not told the repository exists at all. Every repository this tool creates is private
 * (`repo.mjs`'s `createRepo` always sends `private: true`), so a client that reads one without a
 * token gets nothing back in production, and a fake that served those reads anonymously would
 * hide exactly that defect. Any bearer is accepted here: this fake cannot tell one user token
 * from another, and the failure worth catching is a missing header, not a wrong one.
 * @param {{ state: object }} ctx the fake's shared context
 * @param {{ owner: string, repo: string }} params the route's owner and repo captures
 * @param {Record<string, string | undefined> | undefined} headers the request headers
 * @returns {boolean} true when the read must answer 404
 */
function refusesAnonymousRead(ctx, params, headers) {
  const repo = ctx.state.repos.find(
    (candidate) => candidate.owner.login === params.owner && candidate.name === params.repo
  );
  return Boolean(repo?.private) && !headers?.authorization;
}

/** Seed a repo's git object store with a root commit on `heads/<branch>`. */
function seedRepo(entry, branch = 'main') {
  const sha = randomSha();
  entry.commits.set(sha, { sha, message: 'Initial commit', parents: [], tree: null });
  entry.refs.set(`heads/${branch}`, sha);
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
 *
 * spike-confirmed 2026-08-10: a repo created via the user token is auto-added to the
 * installation that covers its owner, including under "Only select repositories". Model that
 * here so `GET /user/installations/:iid/repositories` lists the new repo with no separate link
 * call. `state.suppressAutoLink` is a one-shot test seam: when true, the next created repo is
 * NOT auto-added, so the otherwise-unreachable not-covered branch of verifyInstallationCovers
 * can still be exercised.
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
    const defaultBranch = ctx.state.nextDefaultBranch ?? 'main';
    ctx.state.nextDefaultBranch = undefined;
    const repo = {
      id,
      name,
      full_name: `${owner}/${name}`,
      owner: { login: owner, id: ownerIdFor(ctx, owner) },
      // Carried so every read handler can enforce the anonymous-read refusal a private repo gets
      // from the real API. `createRepo` always sends it true; a test seeding a repo through this
      // route without it gets a public repo, readable the way this fake always served them.
      private: body?.private === true,
      default_branch: defaultBranch
    };
    ctx.state.repos.push(repo);
    const gitEntry = { seeded: false, blobs: new Map(), trees: new Map(), commits: new Map(), refs: new Map() };
    ctx.state.gitObjects.set(repo.full_name, gitEntry);
    if (body?.auto_init === true) seedRepo(gitEntry, defaultBranch);
    if (ctx.state.suppressAutoLink) {
      ctx.state.suppressAutoLink = false;
    } else {
      const installation =
        ctx.state.installations.find((candidate) => candidate.account?.login === owner) ?? ctx.state.installations[0];
      installation.repositories = installation.repositories ?? [];
      installation.repositories.push(id);
    }
    sendJson(res, 201, repo);
  };
}

/**
 * Build the PUT /user/installations/:iid/repositories/:rid handler. spike-confirmed
 * 2026-08-10: this endpoint refuses a user access token in both an all-repositories and a
 * selected-repositories install, always with a 403 "Resource not accessible by integration".
 * The route stays only to document that refusal (repo.mjs's verifyInstallationCovers never
 * calls it, and the auto-add above makes it unnecessary); `failNext('link', ...)` still lets a
 * test override the default response.
 */
function createLinkHandler() {
  return async (_req, res) => {
    sendJson(res, 403, { message: 'Resource not accessible by integration' });
  };
}

/**
 * GET /repos/:owner/:repo, the one call the Builds connect chapter needs both numeric ids from:
 * `.id` (the repository) and `.owner.id` (its owner), alongside `default_branch` for the reads
 * that follow it.
 */
function createGetRepoHandler(ctx) {
  return async (_req, res, params, _url, _body, headers) => {
    if (refusesAnonymousRead(ctx, params, headers)) return sendJson(res, 404, { message: 'Not Found' });
    const repo = ctx.state.repos.find((candidate) => candidate.owner.login === params.owner && candidate.name === params.repo);
    if (!repo) return sendJson(res, 404, { message: 'Not Found' });
    sendJson(res, 200, repo);
  };
}

/**
 * GET /users/:login, the public endpoint the Builds connect hop reads an owner's numeric id from.
 * Public in the real API for users and organizations alike (verified against api.github.com,
 * 2026-08-12), so no authorization is checked here either: this is the one GitHub read chapter 3
 * can make holding no credential at all.
 */
function createGetPublicUserHandler(ctx) {
  return async (_req, res, params) => {
    sendJson(res, 200, {
      login: params.login,
      id: ownerIdFor(ctx, params.login),
      type: ctx.state.orgs.some((candidate) => candidate.login === params.login) ? 'Organization' : 'User'
    });
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
    // spike-confirmed 2026-08-10: an empty repo's Git Data API 409s, blobs included.
    if (!entry.seeded) return sendJson(res, 409, { message: 'Git Repository is empty.' });
    const sha = randomSha();
    entry.blobs.set(sha, body?.content ?? '');
    sendJson(res, 201, { sha, url: `${ctx.apiBase}/repos/${params.owner}/${params.repo}/git/blobs/${sha}` });
  };
}

/**
 * POST /repos/:owner/:repo/git/trees. `pushScaffold` never sends `base_tree` (a first push
 * writes one full tree deliberately), but the reconcile chapter always does: its whole point is
 * committing two changed files without disturbing anything else the admin has added since the
 * scaffold push, and that survival depends on this fake actually merging onto the base rather
 * than replacing it. The merge is by path, matching the real API's own base_tree semantics
 * closely enough for a fake that (like `pushScaffold` itself) stores one flat tree of full
 * slash-joined paths rather than real git's nested per-directory tree objects: a base entry
 * survives untouched unless `tree` names the same path, and any new path is appended.
 */
function createTreeHandler(ctx) {
  return async (_req, res, params, _url, body) => {
    const entry = getGitEntry(ctx, params.owner, params.repo);
    if (!entry) return sendJson(res, 404, { message: 'Not Found' });
    // spike-confirmed 2026-08-10: an empty repo's Git Data API 409s, trees included.
    if (!entry.seeded) return sendJson(res, 409, { message: 'Git Repository is empty.' });
    const incoming = Array.isArray(body?.tree) ? body.tree : [];

    let merged = incoming;
    if (body?.base_tree) {
      const base = entry.trees.get(body.base_tree);
      if (!base) return sendJson(res, 404, { message: 'Not Found' });
      const byPath = new Map(base.map((candidate) => [candidate.path, candidate]));
      for (const candidate of incoming) byPath.set(candidate.path, candidate);
      merged = [...byPath.values()];
    }

    const sha = randomSha();
    entry.trees.set(sha, merged);
    sendJson(res, 201, { sha, url: `${ctx.apiBase}/repos/${params.owner}/${params.repo}/git/trees/${sha}` });
  };
}

/**
 * Read a stored tree back. The stored entries already carry full slash-joined paths (exactly
 * what `pushScaffold` and the reconcile write path post, one flat tree with no intermediate
 * directory objects), which is not a simplification of the real API: GitHub's own `GET .../git/
 * trees/:sha?recursive=1` returns precisely this shape, a flat array of blob entries with full
 * paths and no directory entries. A caller that reads without `recursive=1` would see the real
 * API's un-flattened, one-level view instead; this fake only ever serves the recursive shape,
 * since nothing in this package reads a tree any other way.
 */
function createGetTreeHandler(ctx) {
  return async (_req, res, params, _url, _body, headers) => {
    if (refusesAnonymousRead(ctx, params, headers)) return sendJson(res, 404, { message: 'Not Found' });
    const entry = getGitEntry(ctx, params.owner, params.repo);
    if (!entry) return sendJson(res, 404, { message: 'Not Found' });
    const tree = entry.trees.get(params.sha);
    if (!tree) return sendJson(res, 404, { message: 'Not Found' });
    sendJson(res, 200, {
      sha: params.sha,
      url: `${ctx.apiBase}/repos/${params.owner}/${params.repo}/git/trees/${params.sha}`,
      tree,
      truncated: false
    });
  };
}

/** Read a stored blob back, in the real API's `{ sha, content, encoding, size, url }` shape. */
function createGetBlobHandler(ctx) {
  return async (_req, res, params, _url, _body, headers) => {
    if (refusesAnonymousRead(ctx, params, headers)) return sendJson(res, 404, { message: 'Not Found' });
    const entry = getGitEntry(ctx, params.owner, params.repo);
    if (!entry) return sendJson(res, 404, { message: 'Not Found' });
    const content = entry.blobs.get(params.sha);
    if (content === undefined) return sendJson(res, 404, { message: 'Not Found' });
    sendJson(res, 200, {
      sha: params.sha,
      content,
      encoding: 'base64',
      size: Buffer.from(content, 'base64').length,
      url: `${ctx.apiBase}/repos/${params.owner}/${params.repo}/git/blobs/${params.sha}`
    });
  };
}

/**
 * Wrap a stored bare tree sha into the real Git Data API's commit-response shape: a commit's
 * `tree` field is `{ sha, url }`, never a bare string. Only the outgoing response is wrapped;
 * `entry.commits`' internal storage keeps the bare sha, since that is also the shape the real
 * create-commit REQUEST body sends and nothing here needs to round-trip the object form.
 * @param {{ apiBase: string }} ctx the fake's shared context
 * @param {string} owner the repository owner's login
 * @param {string} repo the repository name
 * @param {string | null} sha the stored bare tree sha, or null for a treeless seed commit
 * @returns {{ sha: string, url: string } | null} the wrapped tree reference
 */
function treeRef(ctx, owner, repo, sha) {
  if (!sha) return null;
  return { sha, url: `${ctx.apiBase}/repos/${owner}/${repo}/git/trees/${sha}` };
}

function createCreateCommitHandler(ctx) {
  return async (_req, res, params, _url, body) => {
    const entry = getGitEntry(ctx, params.owner, params.repo);
    if (!entry) return sendJson(res, 404, { message: 'Not Found' });
    // spike-confirmed 2026-08-10: an empty repo's Git Data API 409s, commit creation included.
    if (!entry.seeded) return sendJson(res, 409, { message: 'Git Repository is empty.' });
    const sha = randomSha();
    const message = body?.message ?? '';
    // parents/tree are carried in state (and echoed back), not just message: task 8's push
    // test asserts the created commit's parent is the seed sha, which needs somewhere to read
    // it back from, matching the real Git Data API's own commit response shape. tree is stored
    // as the bare sha the request body sent; treeRef wraps it for every outgoing response.
    const parents = Array.isArray(body?.parents) ? body.parents : [];
    const tree = body?.tree ?? null;
    entry.commits.set(sha, { sha, message, parents, tree });
    sendJson(res, 201, {
      sha,
      message,
      parents,
      tree: treeRef(ctx, params.owner, params.repo, tree),
      url: `${ctx.apiBase}/repos/${params.owner}/${params.repo}/git/commits/${sha}`
    });
  };
}

function createGetCommitHandler(ctx) {
  return async (_req, res, params, _url, _body, headers) => {
    if (refusesAnonymousRead(ctx, params, headers)) return sendJson(res, 404, { message: 'Not Found' });
    const entry = getGitEntry(ctx, params.owner, params.repo);
    if (!entry) return sendJson(res, 404, { message: 'Not Found' });
    const commit = entry.commits.get(params.sha);
    if (!commit) return sendJson(res, 404, { message: 'Not Found' });
    sendJson(res, 200, {
      sha: commit.sha,
      message: commit.message,
      parents: commit.parents ?? [],
      tree: treeRef(ctx, params.owner, params.repo, commit.tree ?? null)
    });
  };
}

function createUpdateRefHandler(ctx) {
  return async (_req, res, params, _url, body) => {
    const entry = getGitEntry(ctx, params.owner, params.repo);
    if (!entry) return sendJson(res, 404, { message: 'Not Found' });
    // spike-confirmed 2026-08-10: an empty repo's Git Data API 409s, the ref update included.
    if (!entry.seeded) return sendJson(res, 409, { message: 'Git Repository is empty.' });
    entry.refs.set(`heads/${params.branch}`, body?.sha);
    sendJson(res, 200, { ref: `refs/heads/${params.branch}`, object: { sha: body?.sha, type: 'commit' } });
  };
}

function createGetRefHandler(ctx) {
  return async (_req, res, params, _url, _body, headers) => {
    if (refusesAnonymousRead(ctx, params, headers)) return sendJson(res, 404, { message: 'Not Found' });
    const entry = getGitEntry(ctx, params.owner, params.repo);
    if (!entry) return sendJson(res, 404, { message: 'Not Found' });
    // spike-confirmed 2026-08-10: an empty repo's Git Data API 409s, the ref read included.
    if (!entry.seeded) return sendJson(res, 409, { message: 'Git Repository is empty.' });
    const sha = entry.refs.get(`heads/${params.branch}`);
    sendJson(res, 200, { ref: `refs/heads/${params.branch}`, object: { sha, type: 'commit' } });
  };
}

function createCreateRefHandler(ctx) {
  return async (_req, res, params, _url, body) => {
    const entry = getGitEntry(ctx, params.owner, params.repo);
    if (!entry) return sendJson(res, 404, { message: 'Not Found' });
    const refName = String(body?.ref ?? '').replace(/^refs\//, '');
    if (entry.refs.has(refName)) {
      // spike-confirmed 2026-08-10: a duplicate ref create returns 422 "Reference already exists".
      sendJson(res, 422, { message: 'Reference already exists' });
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

/**
 * GET /login/oauth/authorize. `state.denyNextAuthorize = true` is a one-shot test seam,
 * mirroring `suppressAutoLink` and `nextDefaultBranch`'s idiom: the NEXT successful-match
 * request redirects the way GitHub itself redirects when the admin declines the consent
 * screen, `error=access_denied` and no `code`, with `state` still echoed back exactly as a
 * normal approval would.
 */
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
    if (ctx.state.denyNextAuthorize) {
      ctx.state.denyNextAuthorize = false;
      target.searchParams.set('error', 'access_denied');
      target.searchParams.set('error_description', 'The user has denied your application access.');
    } else {
      target.searchParams.set('code', 'fake-code');
    }
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
