// The recording run and the cleanup sweep. Both build one session: guards, ledger, scrubber,
// stager, and the two clients, all against origins and a browser adapter the caller injects.
import { createSign, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { createGithub, createCloudflare } from './clients.mjs';
import { createGuards, requireRunId, resourceName, TEST_LOGIN, TEST_ZONE } from './guards.mjs';
import { ledgerPath, openLedger } from './ledger.mjs';
import { consent, revoke } from './oauth.mjs';
import { createRecorder, TIMEOUT_MS, writePrivate } from './recorder.mjs';
import { createScrubber, verifyStaged } from './scrub.mjs';

/** How long the minted deploy key lives: long enough to verify and delete it, no longer. */
export const KEY_LIFETIME_MS = 15 * 60_000;

/**
 * @typedef {object} Adapter the browser half, which drives github.com as the test account
 * @property {(manifest: object) => Promise<{ code: string }>} manifestFlow create an App from a manifest
 * @property {(slug: string, state: string) => Promise<{ installation_id: string, state: string | null }>} installFlow install it
 * @property {(options: { clientId: string, state: string }) => Promise<{ code: string, redirectUri: string }>} authorizeFlow authorize it as a user
 * @property {(slug: string) => Promise<'deleted' | 'absent'>} deleteApp delete the App through its settings page; `deleted` only once the settings page is gone
 * @property {(slug: string) => Promise<number>} appStatus the HTTP status of the App's settings page, read as the test account
 * @property {() => Promise<void>} close end the browser
 */

/**
 * @typedef {object} Context
 * @property {string} runId the run id; every resource name carries it
 * @property {string} stateDir the base directory: staging at `<runId>/`, ledgers at `ledgers/`
 * @property {{ cf: string, dash: string, ghApi: string, ghWeb: string }} bases the service origins
 * @property {string} clientId the registered Cloudflare OAuth client id
 * @property {string} testToken the test account's token
 * @property {string[]} [needles] more values no staged file may carry: the test account's password and TOTP secret
 * @property {(url: string) => Promise<void> | void} openBrowser opens a URL in the operator's browser
 * @property {() => Promise<Adapter>} makeAdapter builds the browser adapter, lazily
 * @property {typeof fetch} [fetcher]
 * @property {number} [port] the Cloudflare callback port
 */

/** @typedef {{ kind: string, name: string, outcome: 'deleted' | 'absent' | 'left', error?: string }} Outcome */

/** @param {string} appId @param {string} pem */
function appJwt(appId, pem) {
  const part = (/** @type {object} */ value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const data = `${part({ alg: 'RS256', typ: 'JWT' })}.${part({ iat: now - 60, exp: now + 540, iss: appId })}`;
  return `${data}.${createSign('RSA-SHA256').update(data).sign(pem, 'base64url')}`;
}

/** @param {unknown} error */
const message = (error) => (error instanceof Error ? error.message : String(error));

/** @param {Context} ctx */
function openSession(ctx) {
  requireRunId(ctx.runId);
  const stagingDir = join(ctx.stateDir, ctx.runId);
  mkdirSync(stagingDir, { recursive: true, mode: 0o700 });
  const scrubber = createScrubber();
  const recorder = createRecorder({ dir: stagingDir, runId: ctx.runId, scrubber });
  const guards = createGuards(ctx.runId);
  const ledger = openLedger(join(ctx.stateDir, 'ledgers'), ctx.runId);
  const fetcher = ctx.fetcher ?? fetch;
  let accessToken = '';
  const cf = createCloudflare({ base: ctx.bases.cf, token: () => accessToken, guards, recorder, fetcher });
  const gh = createGithub({ apiBase: ctx.bases.ghApi, webBase: ctx.bases.ghWeb, testToken: ctx.testToken, recorder, fetcher });
  scrubber.hold(ctx.testToken);
  for (const needle of ctx.needles ?? []) scrubber.hold(needle);
  return {
    stagingDir, scrubber, recorder, guards, ledger, cf, gh, fetcher,
    /** The run's GitHub Apps by slug, with the credentials a post-delete check signs with. @type {Map<string, { id: string, pem: string }>} */
    apps: new Map(),
    /** @param {string} token */
    setToken(token) {
      accessToken = token;
      scrubber.hold(token);
    },
  };
}

/**
 * Find a token by name across every page of the token list.
 * @param {ReturnType<typeof openSession>} session
 * @param {string} name
 * @returns {Promise<{ id: string } | undefined>}
 */
async function findToken(session, name) {
  for (let page = 1; ; page++) {
    const listed = await session.cf.request('GET', `/user/tokens?page=${page}&per_page=50`);
    if (listed.status !== 200) throw new Error(`GET /user/tokens answered ${listed.status}.`);
    const found = listed.json.result.find((/** @type {{ name: string }} */ t) => t.name === name);
    if (found) return found;
    const info = listed.json.result_info ?? {};
    if (listed.json.result.length === 0 || page >= (info.total_pages ?? 1)) return undefined;
  }
}

/**
 * Delete what the ledger names and verify each delete by a read. Only a 404 (or, for an App read
 * with its own JWT, a 401) proves a resource absent; any other answer leaves it `left`.
 * @param {Context} ctx
 * @param {ReturnType<typeof openSession>} session
 * @param {() => Promise<Adapter>} adapter lazy adapter
 * @returns {Promise<Outcome[]>}
 */
async function sweep(ctx, session, adapter) {
  const { cf, gh, guards } = session;
  /** @type {Outcome[]} */
  const results = [];
  const bearer = `Bearer ${ctx.testToken}`;
  for (const entry of session.ledger.entries()) {
    const { kind, name, accountId } = entry;
    /** @type {Outcome['outcome']} */
    let outcome = 'absent';
    try {
      if (kind === 'd1') {
        const find = async () => {
          const listed = await cf.request('GET', `/accounts/${accountId}/d1/database?name=${name}`);
          if (listed.status !== 200) throw new Error(`The D1 list answered ${listed.status}.`);
          return listed.json.result.filter((/** @type {{ name: string }} */ d) => d.name === name);
        };
        const [found] = await find();
        if (found) {
          guards.adopt(found.uuid);
          await cf.request('DELETE', `/accounts/${accountId}/d1/database/${found.uuid}`, { route: 'd1_database', caseName: 'delete' });
          outcome = (await find()).length === 0 ? 'deleted' : 'left';
        }
      } else if (kind === 'r2') {
        const path = `/accounts/${accountId}/r2/buckets/${name}`;
        const before = (await cf.request('GET', path)).status;
        if (before === 200) {
          await cf.request('DELETE', path, { route: 'r2_bucket', caseName: 'delete' });
          outcome = (await cf.request('GET', path)).status === 404 ? 'deleted' : 'left';
        } else if (before !== 404) outcome = 'left';
      } else if (kind === 'cf-token') {
        const id = entry.id ?? (await findToken(session, name))?.id;
        if (id) {
          guards.adopt(id);
          const read = () => cf.request('GET', `/user/tokens/${id}`);
          const before = await read();
          if (before.status === 200) {
            if (before.json?.result?.name !== name) throw new Error(`Token ${id} is not named ${name}; it was left alone.`);
            await cf.request('DELETE', `/user/tokens/${id}`, { route: 'user_tokens', caseName: 'delete' });
            outcome = (await read()).status === 404 ? 'deleted' : 'left';
          } else if (before.status !== 404) outcome = 'left';
        }
      } else if (kind === 'repo') {
        const path = `/repos/${TEST_LOGIN}/${name}`;
        const before = (await gh.request('GET', path, { auth: bearer })).status;
        if (before === 200) {
          await gh.request('DELETE', path, { auth: bearer, route: 'repo_delete', caseName: 'ok' });
          outcome = (await gh.request('GET', path, { auth: bearer })).status === 404 ? 'deleted' : 'left';
        } else if (before !== 404) outcome = 'left';
      } else if (kind === 'github-app') {
        const slug = entry.slug ?? name;
        const creds = session.apps.get(slug);
        const viaJwt = async () => (creds ? (await gh.request('GET', '/app', { auth: `Bearer ${appJwt(creds.id, creds.pem)}` })).status : null);
        // The JWT read proves deletion only if it answered 200 while the App stood.
        const before = await viaJwt();
        const deleted = await (await adapter()).deleteApp(slug);
        const gone = before === 200
          ? [401, 404].includes(/** @type {number} */ (await viaJwt()))
          : (await (await adapter()).appStatus(slug)) === 404;
        outcome = !gone ? 'left' : deleted === 'deleted' ? 'deleted' : 'absent';
      }
    } catch (error) {
      results.push({ kind, name, outcome: 'left', error: message(error) });
      continue;
    }
    results.push({ kind, name, outcome });
  }
  return results;
}

/**
 * Revoke the consent's access token, recording the status as a probe. A non-2xx answer or a
 * failed call is a failure of the run: the token would otherwise outlive it.
 * @param {Context} ctx
 * @param {ReturnType<typeof openSession>} session
 * @param {string} accessToken
 * @param {Record<string, unknown>} probes
 * @param {unknown[]} failures
 */
async function revokeAccess(ctx, session, accessToken, probes, failures) {
  try {
    const status = await revoke(ctx.bases.dash, ctx.clientId, accessToken, session.fetcher);
    probes.oauthRevoke = status;
    if (status < 200 || status >= 300) failures.push(new Error(`The Cloudflare access token revoke answered ${status}; revoke the recorder's grant on the dashboard.`));
  } catch (error) {
    probes.oauthRevoke = null;
    failures.push(new Error(`The Cloudflare access token revoke failed (${message(error)}); revoke the recorder's grant on the dashboard.`));
  }
}

/**
 * Record every recordable route once, then clean up.
 * @param {Context} ctx
 * @returns {Promise<string>} the staging directory
 */
export async function runRecording(ctx) {
  const session = openSession(ctx);
  const probes = /** @type {Record<string, unknown>} */ ({});
  /** @type {Outcome[]} */
  let resources = [];
  let adapter = /** @type {Adapter | null} */ (null);
  const getAdapter = async () => (adapter ??= await ctx.makeAdapter());
  /** @type {unknown[]} */
  const failures = [];
  let accessToken = '';
  try {
    ({ accessToken } = await consent({ dashBase: ctx.bases.dash, clientId: ctx.clientId, openBrowser: ctx.openBrowser, port: ctx.port, fetcher: session.fetcher }));
    session.setToken(accessToken);
    await recordCloudflare(ctx, session, probes);
    await recordGithub(ctx, session, probes, getAdapter);
  } catch (error) {
    failures.push(error);
  }
  try {
    resources = await sweep(ctx, session, getAdapter);
  } catch (error) {
    failures.push(error);
  } finally {
    if (accessToken) await revokeAccess(ctx, session, accessToken, probes, failures);
    if (adapter) await /** @type {Adapter} */ (adapter).close().catch((error) => failures.push(error));
  }
  return finish(ctx, session, resources, probes, failures);
}

/**
 * Sweep a crashed run from its ledger. A run id with no ledger is refused before any consent.
 * @param {Context} ctx
 * @returns {Promise<string>} the staging directory
 */
export async function cleanupRun(ctx) {
  requireRunId(ctx.runId);
  if (!existsSync(ledgerPath(join(ctx.stateDir, 'ledgers'), ctx.runId))) throw new Error(`No ledger exists for run ${ctx.runId}; there is nothing to sweep.`);
  const session = openSession(ctx);
  /** @type {Adapter | null} */
  let adapter = null;
  /** @type {Outcome[]} */
  let resources = [];
  const probes = /** @type {Record<string, unknown>} */ ({});
  /** @type {unknown[]} */
  const failures = [];
  let accessToken = '';
  try {
    ({ accessToken } = await consent({ dashBase: ctx.bases.dash, clientId: ctx.clientId, openBrowser: ctx.openBrowser, port: ctx.port, fetcher: session.fetcher }));
    session.setToken(accessToken);
    resources = await sweep(ctx, session, async () => (adapter ??= await ctx.makeAdapter()));
  } catch (error) {
    failures.push(error);
  } finally {
    if (accessToken) await revokeAccess(ctx, session, accessToken, probes, failures);
    if (adapter) await /** @type {Adapter} */ (adapter).close().catch((error) => failures.push(error));
  }
  return finish(ctx, session, resources, probes, failures);
}

/**
 * Stage the bodies, write the scrubbed results file, and verify the staged corpus. Every failure
 * is reported together: the recording's, the revoke's, a leak (which removes everything staged),
 * and any resource the sweep left, with the command that sweeps it.
 * @param {Context} ctx
 * @param {ReturnType<typeof openSession>} session
 * @param {Outcome[]} resources
 * @param {Record<string, unknown>} probes
 * @param {unknown[]} failures
 * @returns {string}
 */
function finish(ctx, session, resources, probes, failures) {
  const { scrubber, stagingDir } = session;
  const errors = [...failures];
  try {
    session.recorder.flush();
    const results = { runId: ctx.runId, resources, probes, timeoutMs: TIMEOUT_MS, routes: session.recorder.latencies() };
    writePrivate(join(stagingDir, 'results.json'), `${JSON.stringify(scrubber.scrub(results), null, 2)}\n`);
    verifyStaged(stagingDir, scrubber.held());
  } catch (error) {
    for (const part of ['cloudflare', 'github', 'results.json']) rmSync(join(stagingDir, part), { recursive: true, force: true });
    errors.push(error);
  }
  const left = resources.filter((r) => r.outcome === 'left');
  if (left.length > 0) errors.push(new Error(`Cleanup left ${left.length} resource(s): ${left.map((r) => `${r.kind} ${r.name}`).join(', ')}. Run record.sh --cleanup ${ctx.runId}.`));
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) throw new AggregateError(errors, errors.map(message).join('\n'));
  return stagingDir;
}

/**
 * @param {Context} ctx
 * @param {ReturnType<typeof openSession>} session
 * @param {Record<string, unknown>} probes
 */
async function recordCloudflare(ctx, session, probes) {
  const { cf, guards, ledger, scrubber } = session;
  const { runId } = ctx;
  const accounts = await cf.request('GET', '/accounts', { route: 'accounts', caseName: 'list' });
  await cf.request('GET', '/user', { route: 'user', caseName: 'get', hold: (json) => scrubber.hold(json?.result?.email, 'editor-redacted') });
  /** @type {{ id: string } | undefined} */
  let zone;
  let accountId = '';
  for (const account of accounts.json.result) {
    const zones = await cf.request('GET', `/zones?account.id=${account.id}&status=active`, { route: 'zones', caseName: 'list' });
    zone = zones.json.result.find((/** @type {{ name: string }} */ z) => z.name === TEST_ZONE);
    if (zone) {
      accountId = account.id;
      break;
    }
  }
  if (!zone) throw new Error(`No active ${TEST_ZONE} zone on any account the consent reaches.`);
  scrubber.hold(accountId, '00000000000000000000000000000001');
  scrubber.hold(zone.id, '00000000000000000000000000000002');
  guards.setZone(zone.id);
  // The scripts list first: every Worker name is a needle before any body that may name one.
  await cf.request('GET', `/accounts/${accountId}/workers/scripts`, {
    route: 'workers_scripts', caseName: 'list',
    hold: (json) => (json?.result ?? []).forEach((/** @type {{ id: string }} */ s) => scrubber.alias(s.id, 'worker')),
  });
  await cf.request('GET', `/zones/${zone.id}/dns_records?name=${TEST_ZONE}`, { route: 'zone_dns_records', caseName: 'list' });
  await cf.request('GET', `/accounts/${accountId}/workers/domains`, { route: 'workers_domains', caseName: 'list' });
  await cf.request('GET', `/zones/${zone.id}/workers/routes`, { route: 'zone_workers_routes', caseName: 'list' });
  const database = resourceName(runId, 'd1');
  const bucket = resourceName(runId, 'r2');
  const sameDb = await cf.request('GET', `/accounts/${accountId}/d1/database?name=${database}`, { route: 'd1_database', caseName: 'name-check' });
  if (sameDb.status !== 200 || sameDb.json.result.some((/** @type {{ name: string }} */ d) => d.name === database)) throw new Error(`A D1 database named ${database} already exists, or the name check failed; nothing was created.`);
  const sameBucket = await cf.request('GET', `/accounts/${accountId}/r2/buckets/${bucket}`, { route: 'r2_bucket', caseName: 'name-check' });
  if (sameBucket.status !== 404) throw new Error(`An R2 bucket named ${bucket} already exists, or the name check failed; nothing was created.`);
  const subscriptions = await cf.request('GET', `/accounts/${accountId}/subscriptions`, { route: 'subscriptions', caseName: 'list' });
  probes.subscriptions = subscriptions.status;

  ledger.add({ kind: 'd1', name: database, accountId });
  const created = await cf.request('POST', `/accounts/${accountId}/d1/database`, { body: { name: database }, route: 'd1_database', caseName: 'create' });
  guards.adopt(created.json.result.uuid);
  await cf.request('POST', `/accounts/${accountId}/d1/database/${created.json.result.uuid}/query`, { body: { sql: 'select 1 as n' }, route: 'd1_query', caseName: 'success' });
  ledger.add({ kind: 'r2', name: bucket, accountId });
  await cf.request('POST', `/accounts/${accountId}/r2/buckets`, { body: { name: bucket }, route: 'r2_buckets', caseName: 'create' });

  const groups = await cf.request('GET', '/user/tokens/permission_groups', { route: 'user_token_permission_groups', caseName: 'list' });
  const wanted = new Set(['Workers Scripts Write', 'D1 Write', 'Workers R2 Storage Write']);
  const permissionGroups = groups.json.result.filter((/** @type {{ name: string }} */ g) => wanted.has(g.name)).map((/** @type {{ id: string }} */ g) => ({ id: g.id }));
  if (permissionGroups.length === 0) throw new Error('None of the deploy key permission groups exist.');
  const tokenName = resourceName(runId, 'cf-token');
  ledger.add({ kind: 'cf-token', name: tokenName, accountId });
  const minted = await cf.request('POST', '/user/tokens', {
    body: {
      name: tokenName,
      policies: [{ effect: 'allow', resources: { [`com.cloudflare.api.account.${accountId}`]: '*' }, permission_groups: permissionGroups }],
      expires_on: new Date(Date.now() + KEY_LIFETIME_MS).toISOString().replace(/\.\d{3}Z$/, 'Z'),
    },
    route: 'user_tokens',
    caseName: 'create',
  });
  const tokenId = minted.json?.result?.id;
  if (typeof tokenId === 'string') {
    ledger.update('cf-token', { id: tokenId });
    guards.adopt(tokenId);
  }
}

/**
 * @param {Context} ctx
 * @param {ReturnType<typeof openSession>} session
 * @param {Record<string, unknown>} probes
 * @param {() => Promise<Adapter>} getAdapter
 */
async function recordGithub(ctx, session, probes, getAdapter) {
  const { gh, ledger } = session;
  const owner = TEST_LOGIN;
  const bearer = `Bearer ${ctx.testToken}`;
  const repo = resourceName(ctx.runId, 'repo');
  ledger.add({ kind: 'repo', name: repo });
  await gh.request('POST', '/user/repos', { auth: bearer, body: { name: repo, private: true, auto_init: true }, route: 'repo_create', caseName: 'ok' });

  const adapter = await getAdapter();
  const appName = resourceName(ctx.runId, 'github-app');
  ledger.add({ kind: 'github-app', name: appName });
  const { code } = await adapter.manifestFlow({
    name: appName,
    url: `https://${TEST_ZONE}`,
    public: false,
    hook_attributes: { url: `https://${TEST_ZONE}/hook`, active: false },
    default_permissions: { contents: 'write', secrets: 'write', metadata: 'read' },
    default_events: [],
  });
  const conversion = await gh.request('POST', `/app-manifests/${code}/conversions`, { auth: '', route: 'app_manifest_conversion', caseName: 'created' });
  if (conversion.status !== 201) throw new Error(`The manifest conversion answered ${conversion.status}.`);
  const app = conversion.json;
  ledger.update('github-app', { slug: app.slug, id: String(app.id) });
  session.apps.set(app.slug, { id: String(app.id), pem: app.pem });
  session.scrubber.hold(app.pem);
  if (app.owner?.login !== TEST_LOGIN) throw new Error(`Refused: the converted GitHub App is owned by another account, not ${TEST_LOGIN}.`);

  const installState = randomBytes(16).toString('hex');
  const installed = await adapter.installFlow(app.slug, installState);
  probes.githubInstallCallbackState = installed.state === installState;
  if (!/^\d+$/.test(installed.installation_id)) throw new Error('The install callback carried a malformed installation id.');
  const state = randomBytes(16).toString('hex');
  const authorized = await adapter.authorizeFlow({ clientId: app.client_id, state });
  const exchange = await gh.request('POST', '/login/oauth/access_token', {
    web: true, auth: '', route: 'login_oauth_access_token', caseName: 'ok',
    body: { client_id: app.client_id, client_secret: app.client_secret, code: authorized.code, redirect_uri: authorized.redirectUri },
  });
  session.scrubber.hold(exchange.json.access_token);
  session.scrubber.hold(exchange.json.refresh_token);
  const user = `Bearer ${exchange.json.access_token}`;
  await gh.request('GET', '/user/installations', { auth: user, route: 'user_installations', caseName: 'list' });
  await gh.request('GET', `/user/installations/${installed.installation_id}/repositories`, { auth: user, route: 'user_installation_repositories', caseName: 'list' });

  const jwt = `Bearer ${appJwt(String(app.id), app.pem)}`;
  await gh.request('GET', '/app/installations', { auth: jwt, route: 'app_installations', caseName: 'list' });
  const installation = await gh.request('GET', `/app/installations/${installed.installation_id}`, { auth: jwt });
  if (installation.status !== 200 || installation.json?.account?.login !== TEST_LOGIN) throw new Error(`Refused: installation ${installed.installation_id} is not on ${TEST_LOGIN}.`);
  const minted = await gh.request('POST', `/app/installations/${installed.installation_id}/access_tokens`, {
    auth: jwt, route: 'app_installation_access_tokens', caseName: 'created', body: { repositories: [repo] },
  });
  const scoped = `Bearer ${minted.json.token}`;
  const key = await gh.request('GET', `/repos/${owner}/${repo}/actions/secrets/public-key`, { auth: scoped, route: 'repo_actions_secrets_public_key', caseName: 'ok' });
  await gh.request('PUT', `/repos/${owner}/${repo}/actions/secrets/CLOUDFLARE_API_TOKEN`, {
    auth: scoped, route: 'repo_actions_secret_put', caseName: 'ok',
    body: { encrypted_value: Buffer.from('dummy-sealed-value').toString('base64'), key_id: key.json.key_id },
  });
  await gh.request('DELETE', `/app/installations/${installed.installation_id}`, { auth: jwt, route: 'app_installation', caseName: 'delete' });
}
