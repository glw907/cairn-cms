// The recording run and the cleanup sweep. Both build one session: guards, ledger, scrubber,
// stager, and the two clients, all against origins and a browser adapter the caller injects.
import { createSign } from 'node:crypto';
import { rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createGithub, createCloudflare } from './clients.mjs';
import { createGuards, TEST_LOGIN, TEST_ZONE } from './guards.mjs';
import { openLedger } from './ledger.mjs';
import { consent, revoke } from './oauth.mjs';
import { createRecorder, TIMEOUT_MS } from './recorder.mjs';
import { createScrubber, verifyStaged } from './scrub.mjs';

/**
 * @typedef {object} Adapter the browser half, which drives github.com as the test account
 * @property {(manifest: object) => Promise<{ code: string }>} manifestFlow create an App from a manifest
 * @property {(slug: string, state: string) => Promise<{ installation_id: string, state: string | null }>} installFlow install it
 * @property {(options: { clientId: string, state: string }) => Promise<{ code: string, redirectUri: string }>} authorizeFlow authorize it as a user
 * @property {(slug: string) => Promise<string>} deleteApp delete the App through its settings page
 * @property {() => Promise<void>} close end the browser
 */

/**
 * @typedef {object} Context
 * @property {string} runId the run id; every resource name carries it
 * @property {string} stateDir the base directory: staging at `<runId>/`, ledgers at `ledgers/`
 * @property {{ cf: string, dash: string, ghApi: string, ghWeb: string }} bases the service origins
 * @property {string} clientId the registered Cloudflare OAuth client id
 * @property {string} testToken the test account's token
 * @property {(url: string) => Promise<void> | void} openBrowser opens a URL in the operator's browser
 * @property {() => Promise<Adapter>} makeAdapter builds the browser adapter, lazily
 * @property {typeof fetch} [fetcher]
 * @property {number} [port] the Cloudflare callback port
 */

/** @param {string} appId @param {string} pem */
function appJwt(appId, pem) {
  const part = (/** @type {object} */ value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const data = `${part({ alg: 'RS256', typ: 'JWT' })}.${part({ iat: now - 60, exp: now + 540, iss: appId })}`;
  return `${data}.${createSign('RSA-SHA256').update(data).sign(pem, 'base64url')}`;
}

/** @param {Context} ctx */
function openSession(ctx) {
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
  return {
    stagingDir, scrubber, recorder, guards, ledger, cf, gh, fetcher,
    /** @param {string} token */
    setToken(token) {
      accessToken = token;
      scrubber.hold(token);
    },
  };
}

/**
 * Delete what the ledger names and verify each delete by a read.
 * @param {Context} ctx
 * @param {ReturnType<typeof openSession>} session
 * @param {() => Promise<Adapter>} adapter lazy adapter
 * @returns {Promise<{ kind: string, name: string, outcome: 'deleted' | 'absent' | 'left' }[]>}
 */
async function sweep(ctx, session, adapter) {
  const { cf, gh, guards, fetcher } = session;
  const results = [];
  const bearer = `Bearer ${ctx.testToken}`;
  for (const { kind, name, accountId } of session.ledger.entries()) {
    /** @type {'deleted' | 'absent' | 'left'} */
    let outcome = 'absent';
    try {
      if (kind === 'd1') {
        const find = async () => (await cf.request('GET', `/accounts/${accountId}/d1/database?name=${name}`)).json.result.filter((/** @type {{ name: string }} */ d) => d.name === name);
        const [found] = await find();
        if (found) {
          guards.adopt(found.uuid);
          await cf.request('DELETE', `/accounts/${accountId}/d1/database/${found.uuid}`, { route: 'd1_database', caseName: 'delete' });
          outcome = (await find()).length === 0 ? 'deleted' : 'left';
        }
      } else if (kind === 'r2') {
        const before = await cf.request('GET', `/accounts/${accountId}/r2/buckets/${name}`);
        if (before.status === 200) {
          await cf.request('DELETE', `/accounts/${accountId}/r2/buckets/${name}`, { route: 'r2_bucket', caseName: 'delete' });
          outcome = (await cf.request('GET', `/accounts/${accountId}/r2/buckets/${name}`)).status === 404 ? 'deleted' : 'left';
        }
      } else if (kind === 'cf-token') {
        const find = async () => (await cf.request('GET', '/user/tokens')).json.result.filter((/** @type {{ name: string }} */ t) => t.name === name);
        const [found] = await find();
        if (found) {
          guards.adopt(found.id);
          await cf.request('DELETE', `/user/tokens/${found.id}`, { route: 'user_tokens', caseName: 'delete' });
          outcome = (await find()).length === 0 ? 'deleted' : 'left';
        }
      } else if (kind === 'repo') {
        const path = `/repos/${TEST_LOGIN}/${name}`;
        if ((await gh.request('GET', path, { auth: bearer })).status === 200) {
          await gh.request('DELETE', path, { auth: bearer, route: 'repo_delete', caseName: 'ok' });
          outcome = (await gh.request('GET', path, { auth: bearer })).status === 404 ? 'deleted' : 'left';
        }
      } else if (kind === 'github-app') {
        const deleted = await (await adapter()).deleteApp(name);
        const gone = (await fetcher(`${ctx.bases.ghWeb}/apps/${name}`)).status === 404;
        outcome = !gone ? 'left' : deleted === 'deleted' ? 'deleted' : 'absent';
      }
    } catch (error) {
      outcome = 'left';
      results.push({ kind, name, outcome, error: error instanceof Error ? error.message : String(error) });
      continue;
    }
    results.push({ kind, name, outcome });
  }
  return results;
}

/**
 * Record every recordable route once, then clean up.
 * @param {Context} ctx
 * @returns {Promise<string>} the staging directory
 */
export async function runRecording(ctx) {
  const session = openSession(ctx);
  const { scrubber, stagingDir } = session;
  const probes = /** @type {Record<string, unknown>} */ ({});
  /** @type {Awaited<ReturnType<typeof sweep>>} */
  let resources = [];
  let adapter = /** @type {Adapter | null} */ (null);
  const getAdapter = async () => (adapter ??= await ctx.makeAdapter());
  /** @type {unknown} */
  let failure = null;
  let accessToken = '';
  try {
    ({ accessToken } = await consent({ dashBase: ctx.bases.dash, clientId: ctx.clientId, openBrowser: ctx.openBrowser, port: ctx.port, fetcher: session.fetcher }));
    session.setToken(accessToken);
    await recordCloudflare(ctx, session, probes);
    await recordGithub(ctx, session, probes, getAdapter);
  } catch (error) {
    failure = error;
  }
  try {
    resources = await sweep(ctx, session, getAdapter);
  } finally {
    if (accessToken) probes.oauthRevoke = await revoke(ctx.bases.dash, ctx.clientId, accessToken, session.fetcher).catch(() => null);
    if (adapter) await /** @type {Adapter} */ (adapter).close();
  }
  return finish(ctx, session, scrubber, stagingDir, resources, probes, failure);
}

/**
 * Sweep a crashed run from its ledger.
 * @param {Context} ctx
 * @returns {Promise<string>} the staging directory
 */
export async function cleanupRun(ctx) {
  const session = openSession(ctx);
  /** @type {Adapter | null} */
  let adapter = null;
  let revokeToken = '';
  const probes = {};
  try {
    const { accessToken } = await consent({ dashBase: ctx.bases.dash, clientId: ctx.clientId, openBrowser: ctx.openBrowser, port: ctx.port, fetcher: session.fetcher });
    session.setToken(accessToken);
    revokeToken = accessToken;
    const resources = await sweep(ctx, session, async () => (adapter ??= await ctx.makeAdapter()));
    await revoke(ctx.bases.dash, ctx.clientId, revokeToken, session.fetcher).catch(() => null);
    return finish(ctx, session, session.scrubber, session.stagingDir, resources, probes, null);
  } finally {
    if (adapter) await /** @type {Adapter} */ (adapter).close();
  }
}

/**
 * Write the results file, verify the staged corpus, and fail on a leftover resource or a leak.
 * @param {Context} ctx
 * @param {ReturnType<typeof openSession>} session
 * @param {ReturnType<typeof createScrubber>} scrubber
 * @param {string} stagingDir
 * @param {Awaited<ReturnType<typeof sweep>>} resources
 * @param {Record<string, unknown>} probes
 * @param {unknown} failure an error from the recording, rethrown after cleanup
 * @returns {string}
 */
function finish(ctx, session, scrubber, stagingDir, resources, probes, failure) {
  const results = { runId: ctx.runId, resources, probes, timeoutMs: TIMEOUT_MS, routes: session.recorder.latencies() };
  writeFileSync(join(stagingDir, 'results.json'), `${JSON.stringify(results, null, 2)}\n`);
  try {
    verifyStaged(stagingDir, scrubber.held());
  } catch (error) {
    rmSync(join(stagingDir, 'cloudflare'), { recursive: true, force: true });
    rmSync(join(stagingDir, 'github'), { recursive: true, force: true });
    throw error;
  }
  if (failure) throw failure;
  const left = resources.filter((r) => r.outcome === 'left');
  if (left.length > 0) throw new Error(`Cleanup left ${left.length} resource(s): ${left.map((r) => `${r.kind} ${r.name}`).join(', ')}. Run record.sh --cleanup ${ctx.runId}.`);
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
  await cf.request('GET', '/user', { route: 'user', caseName: 'get', hold: (json) => scrubber.hold(json.result.email, 'editor-redacted') });
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
  await cf.request('GET', `/zones/${zone.id}/dns_records?name=${TEST_ZONE}`, { route: 'zone_dns_records', caseName: 'list' });
  await cf.request('GET', `/accounts/${accountId}/workers/domains`, {
    route: 'workers_domains', caseName: 'list',
    hold: (json) => (json.result ?? []).forEach((/** @type {{ service: string }} */ d) => scrubber.hold(d.service, 'scratch-worker')),
  });
  await cf.request('GET', `/zones/${zone.id}/workers/routes`, { route: 'zone_workers_routes', caseName: 'list' });
  await cf.request('GET', `/accounts/${accountId}/workers/scripts`, {
    route: 'workers_scripts', caseName: 'list',
    hold: (json) => (json.result ?? []).forEach((/** @type {{ id: string }} */ s) => scrubber.hold(s.id, 'scratch-worker')),
  });
  const database = `cairn-rec-${runId}-db`;
  const bucket = `cairn-rec-${runId}-bucket`;
  await cf.request('GET', `/accounts/${accountId}/d1/database?name=${database}`, { route: 'd1_database', caseName: 'name-check' });
  await cf.request('GET', `/accounts/${accountId}/r2/buckets/${bucket}`, { route: 'r2_bucket', caseName: 'name-check' });
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
  const tokenName = `cairn-rec-${runId}-key`;
  ledger.add({ kind: 'cf-token', name: tokenName, accountId });
  await cf.request('POST', '/user/tokens', {
    body: {
      name: tokenName,
      policies: [{ effect: 'allow', resources: { [`com.cloudflare.api.account.${accountId}`]: '*' }, permission_groups: permissionGroups }],
      expires_on: new Date(Date.now() + 3_600_000).toISOString(),
    },
    route: 'user_tokens',
    caseName: 'create',
  });
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
  const repo = `cairn-rec-${ctx.runId}-repo`;
  ledger.add({ kind: 'repo', name: repo });
  await gh.request('POST', '/user/repos', { auth: bearer, body: { name: repo, private: true, auto_init: true }, route: 'repo_create', caseName: 'ok' });

  const adapter = await getAdapter();
  const appName = `cairn-rec-${ctx.runId}-app`;
  ledger.add({ kind: 'github-app', name: appName });
  const { code } = await adapter.manifestFlow({
    name: appName,
    url: `https://${TEST_ZONE}`,
    public: false,
    hook_attributes: { url: `https://${TEST_ZONE}/hook`, active: false },
    default_permissions: { contents: 'write', secrets: 'write', metadata: 'read' },
    default_events: [],
  });
  const app = (await gh.request('POST', `/app-manifests/${code}/conversions`, { auth: '', route: 'app_manifest_conversion', caseName: 'created' })).json;
  const installed = await adapter.installFlow(app.slug, 'probe');
  probes.githubInstallCallbackState = installed.state === 'probe';
  const state = 'probe-user';
  const authorized = await adapter.authorizeFlow({ clientId: app.client_id, state });
  const exchange = await gh.request('POST', '/login/oauth/access_token', {
    web: true, auth: '', route: 'login_oauth_access_token', caseName: 'ok',
    body: { client_id: app.client_id, client_secret: app.client_secret, code: authorized.code, redirect_uri: authorized.redirectUri },
  });
  session.scrubber.hold(exchange.json.access_token);
  const user = `Bearer ${exchange.json.access_token}`;
  await gh.request('GET', '/user/installations', { auth: user, route: 'user_installations', caseName: 'list' });
  await gh.request('GET', `/user/installations/${installed.installation_id}/repositories`, { auth: user, route: 'user_installation_repositories', caseName: 'list' });

  const jwt = `Bearer ${appJwt(String(app.id), app.pem)}`;
  await gh.request('GET', '/app/installations', { auth: jwt, route: 'app_installations', caseName: 'list' });
  const minted = await gh.request('POST', `/app/installations/${installed.installation_id}/access_tokens`, { auth: jwt, route: 'app_installation_access_tokens', caseName: 'created' });
  const installation = `Bearer ${minted.json.token}`;
  const key = await gh.request('GET', `/repos/${owner}/${repo}/actions/secrets/public-key`, { auth: installation, route: 'repo_actions_secrets_public_key', caseName: 'ok' });
  await gh.request('PUT', `/repos/${owner}/${repo}/actions/secrets/CLOUDFLARE_API_TOKEN`, {
    auth: installation, route: 'repo_actions_secret_put', caseName: 'ok',
    body: { encrypted_value: Buffer.from('dummy-sealed-value').toString('base64'), key_id: key.json.key_id },
  });
  await gh.request('DELETE', `/app/installations/${installed.installation_id}`, { auth: jwt, route: 'app_installation', caseName: 'delete' });
}
