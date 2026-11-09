// The recorder's tests. A local fake server stands in for every live service; nothing here
// touches the network beyond loopback or reads ~/.local/secrets.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildManifest, createCallbackWaiter, isRepoOption, pickRepository, requireTestLogin, showsRepo, withoutSignalListeners } from './browser-adapter.mjs';
import { createCloudflare } from './clients.mjs';
import { createGuards } from './guards.mjs';
import { ledgerPath } from './ledger.mjs';
import { consent, SCOPES } from './oauth.mjs';
import { main, openInBrowser } from './record.mjs';
import { createRecorder } from './recorder.mjs';
import { createScrubber, findLeaks, verifyStaged } from './scrub.mjs';
import { cleanupRun, runRecording } from './run.mjs';
import {
  ACCOUNT, CLIENT_SECRET, DNS_COMMENT, DNS_CONTENT, EMAIL, ESTATE_WORKER, fakeBrowser, GH_INSTALL_TOKEN, GH_REFRESH_TOKEN, GH_USER_TOKEN, OAUTH_TOKEN,
  PEM, PERSONAL, SHORT_WORKER, startFake, TOKEN_VALUE, ZONE,
} from './fake-services.mjs';

const TEST_TOKEN = 'test_account_token_0123456789';
/** An estate database whose name the D1 name search also answers for run trun00008. */
const NEAR_NAME = 'estate-cairn-rec-trun00008-db-copy';
const HERE = fileURLToPath(new URL('.', import.meta.url));

/**
 * @param {string} runId
 * @param {import('./fake-services.mjs').FakeOptions} [options]
 */
async function setup(runId, options = {}) {
  const stateDir = mkdtempSync(join(tmpdir(), 'record-fixtures-'));
  const fake = await startFake({ ...options, ledgerFile: () => ledgerPath(join(stateDir, 'ledgers'), runId) });
  /** @type {import('./run.mjs').Context} */
  const ctx = {
    runId,
    stateDir,
    bases: fake.bases,
    clientId: 'client-id',
    testToken: TEST_TOKEN,
    openBrowser: (url) => fakeBrowser.open(url),
    makeAdapter: async () => fake.adapter(),
    port: 0,
  };
  return { stateDir, fake, ctx };
}

/** @param {string} dir */
function stagedFiles(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => join(e.parentPath, e.name));
}

/** @param {string} dir @param {string} name */
const staged = (dir, name) => JSON.parse(readFileSync(join(dir, name), 'utf8'));

/** @param {string} stateDir @param {string} runId @param {object[]} entries */
function writeLedger(stateDir, runId, entries) {
  const dir = join(stateDir, 'ledgers');
  mkdirSync(dir, { recursive: true });
  writeFileSync(ledgerPath(dir, runId), JSON.stringify(entries));
}

test('a run records each recordable route, scrubbed, and deletes everything it made', async () => {
  const { stateDir, fake, ctx } = await setup('trun00001');
  try {
    const dir = await runRecording(ctx);
    const names = stagedFiles(dir).map((f) => f.slice(dir.length + 1)).sort();
    for (const expected of [
      'cloudflare/accounts.list.200.json', 'cloudflare/user.get.200.json', 'cloudflare/zones.active.200.json',
      'cloudflare/zone_dns_records.named.200.json',
      'cloudflare/d1_database.create.200.json', 'cloudflare/r2_buckets.create.200.json', 'cloudflare/user_tokens.create.200.json',
      'cloudflare/user_tokens.delete.200.json', 'cloudflare/r2_bucket.name-check.404.json', 'cloudflare/d1_query.success.200.json',
      'github/repo_create.ok.201.json', 'github/app_manifest_conversion.created.201.json', 'github/login_oauth_access_token.ok.200.json',
      'github/app_installations.list.200.json', 'github/app_installation_access_tokens.created.201.json',
      'github/repo_actions_secrets_public_key.ok.200.json', 'github/repo_actions_secret_put.ok.201.json', 'github/app_installation.delete.204.json',
      'results.json',
    ]) assert.ok(names.includes(expected), `${expected} is staged (have ${names.join(', ')})`);

    const listing = staged(dir, 'cloudflare/accounts.list.200.json');
    assert.equal(listing.provenance.status, 200);
    assert.equal(typeof listing.provenance.captured, 'string');
    assert.ok(listing.provenance.source.includes('GET /accounts'));
    assert.equal(staged(dir, 'github/app_manifest_conversion.created.201.json').provenance.source, 'POST /app-manifests/{code}/conversions',
      'the one-time manifest code is not staged in the source');

    const all = stagedFiles(dir).map((f) => readFileSync(f, 'utf8')).join('\n');
    for (const secret of [ACCOUNT, ZONE, EMAIL, ESTATE_WORKER, TOKEN_VALUE, OAUTH_TOKEN, TEST_TOKEN, CLIENT_SECRET, GH_USER_TOKEN, GH_REFRESH_TOKEN, GH_INSTALL_TOKEN, PEM, 'whsec_0123456789']) {
      assert.ok(!all.includes(secret), 'a held value reached the staged corpus');
    }
    for (const mode of ['results.json', 'cloudflare/user.get.200.json'].map((f) => statSync(join(dir, f)).mode & 0o777)) assert.equal(mode, 0o600);

    const results = staged(dir, 'results.json');
    assert.deepEqual(results.resources.map((/** @type {{ outcome: string }} */ r) => r.outcome), ['deleted', 'deleted', 'deleted', 'deleted', 'deleted']);
    assert.equal(results.probes.oauthRevoke, 200);
    assert.equal(results.probes.subscriptions, 200);
    assert.equal(results.probes.githubInstallCallbackState, true);
    assert.equal(results.timeoutMs, 15_000);
    assert.ok(results.routes.length > 10 && results.routes.every((/** @type {{ withinTimeout: boolean }} */ r) => r.withinTimeout));

    assert.deepEqual([fake.state.dbs, fake.state.buckets, fake.state.tokens, fake.state.repos, fake.state.apps], [[], [], [], [], []]);
    assert.ok(fake.state.ledgerAtCreate.length >= 5 && fake.state.ledgerAtCreate.every(Boolean), 'every create, the App included, found its ledger entry already written');
    const ledgerFile = ledgerPath(join(stateDir, 'ledgers'), 'trun00001');
    assert.equal(statSync(ledgerFile).mode & 0o777, 0o600);
    assert.deepEqual(readdirSync(join(stateDir, 'ledgers')), ['trun00001.json'], 'no temporary ledger file is left behind');
    const ledger = JSON.parse(readFileSync(ledgerFile, 'utf8'));
    assert.match(ledger.find((/** @type {{ kind: string }} */ e) => e.kind === 'cf-token').id, /^[0-9a-f]{32}$/);
    assert.deepEqual(Object.keys(ledger.find((/** @type {{ kind: string }} */ e) => e.kind === 'github-app')).sort(), ['id', 'kind', 'name', 'slug']);
    assert.deepEqual(fake.state.mintBodies, [{ repositories: ['cairn-rec-trun00001-repo'], permissions: { secrets: 'write', metadata: 'read' } }], 'the installation token is scoped to the run repository and the secret write');
    assert.deepEqual(fake.state.installRepos, ['cairn-rec-trun00001-repo'], 'the App is installed on the run repository alone');
  } finally {
    await fake.close();
  }
});

test('identity and inventory bodies keep only their decoded fields, with no real name staged', async () => {
  const { fake, ctx } = await setup('trun00008');
  fake.state.dbs.push({ uuid: '00000000-0000-4000-8000-0000000000ee', name: NEAR_NAME });
  try {
    const dir = await runRecording(ctx);
    assert.deepEqual(findLeaks(dir, [...Object.values(PERSONAL), ESTATE_WORKER, SHORT_WORKER]), []);
    const zones = staged(dir, 'cloudflare/zones.active.200.json').body.result;
    assert.deepEqual(zones.map((/** @type {{ name: string }} */ z) => z.name), ['carin-test.org'], 'the zones list is reduced to the test zone');
    assert.deepEqual(Object.keys(zones[0]).sort(), ['account', 'id', 'name', 'name_servers', 'status']);
    const user = staged(dir, 'cloudflare/user.get.200.json').body.result;
    assert.deepEqual(Object.keys(user).sort(), ['email', 'id', 'suspended']);
    const subscription = staged(dir, 'cloudflare/subscriptions.list.200.json').body.result[0];
    assert.deepEqual(Object.keys(subscription).sort(), ['frequency', 'id', 'rate_plan', 'state']);
    const domains = staged(dir, 'cloudflare/workers_domains.list.200.json').body.result;
    assert.deepEqual(domains.map((/** @type {{ hostname: string }} */ d) => d.hostname), ['example-1.carin-test.org', 'example-2.carin-test.org']);
    assert.deepEqual(domains.map((/** @type {{ zone_name: string }} */ d) => d.zone_name), ['carin-test.org', 'example-zone-1.org']);
    const route = staged(dir, 'cloudflare/zone_workers_routes.list.200.json').body.result[0];
    assert.equal(route.script, 'example-worker-2', 'a short Worker name is aliased like a long one');
    const scripts = staged(dir, 'cloudflare/workers_scripts.list.200.json').body.result;
    assert.deepEqual(scripts.map((/** @type {{ id: string }} */ s) => s.id), ['example-worker-1', 'example-worker-2']);
    assert.ok(scripts.every((/** @type {object} */ s) => !('routes' in s)), 'route patterns across every zone are dropped');
    const record = staged(dir, 'cloudflare/zone_dns_records.named.200.json').body.result[0];
    assert.deepEqual(Object.keys(record).sort(), ['comment', 'content', 'id', 'name', 'proxied', 'ttl', 'type']);
    assert.deepEqual([record.content, record.comment], ['example-txt-content', 'example record comment'], 'a DNS record carries made-up content and comment');
    assert.deepEqual(staged(dir, 'cloudflare/d1_database.name-check.200.json').body.result, [], 'the name check stages only a database with the run name');
    assert.deepEqual(findLeaks(dir, [DNS_CONTENT, DNS_COMMENT, NEAR_NAME]), []);
  } finally {
    await fake.close();
  }
});

test('the test account password and TOTP secret are needles too', async () => {
  const password = 'operator-password-value';
  const { fake, ctx } = await setup('trun00009', { echo: `pw ${password}` });
  ctx.needles = [password, 'TOTPSECRETBASE32'];
  try {
    const dir = await runRecording(ctx);
    const all = stagedFiles(dir).map((f) => readFileSync(f, 'utf8')).join('\n');
    assert.ok(!all.includes(password));
  } finally {
    await fake.close();
  }
});

test('the minted token expires fifteen minutes out, in seconds precision', async () => {
  const { fake, ctx } = await setup('trun00002');
  /** @type {{ expires_on: string } | undefined} */
  let seen;
  ctx.fetcher = async (input, init) => {
    if (String(input).endsWith('/user/tokens') && init?.method === 'POST') seen = JSON.parse(String(init.body));
    return fetch(input, init);
  };
  try {
    await runRecording(ctx);
    const { expires_on: expires } = /** @type {{ expires_on: string }} */ (seen);
    assert.match(expires, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
    const minutes = (Date.parse(expires) - Date.now()) / 60_000;
    assert.ok(minutes > 13 && minutes <= 15, `expires_on is ${minutes} minutes out`);
  } finally {
    await fake.close();
  }
});

for (const [label, plant] of /** @type {[string, (dir: string) => string][]} */ ([
  ['a ghu_ token', () => GH_USER_TOKEN],
  ['a ghr_ token', () => GH_REFRESH_TOKEN],
  ['a ghs_ token', () => GH_INSTALL_TOKEN],
  ['a PEM block', () => PEM],
  ['a client secret', () => CLIENT_SECRET],
  ['an email', () => EMAIL],
  ['an account id', () => ACCOUNT],
])) {
  test(`the staged-corpus check fails on ${label}`, () => {
    const dir = mkdtempSync(join(tmpdir(), 'record-leak-'));
    mkdirSync(join(dir, 'cloudflare'));
    writeFileSync(join(dir, 'cloudflare/x.ok.200.json'), JSON.stringify({ provenance: {}, body: { note: plant(dir) } }));
    assert.throws(() => verifyStaged(dir, [CLIENT_SECRET, ACCOUNT]), /leaks/);
  });
}

test('the staged-corpus check finds a short needle as a token, an escaped needle, an email key, and a personal field', () => {
  const dir = mkdtempSync(join(tmpdir(), 'record-leak2-'));
  const quoted = 'pass"word\\value';
  writeFileSync(join(dir, 'a.json'), JSON.stringify({ provenance: { note: 'api is in the note only' }, body: { route: 'api.carin-test.org/*', rapid: 1 } }));
  writeFileSync(join(dir, 'b.json'), JSON.stringify({ body: { note: quoted } }));
  writeFileSync(join(dir, 'c.json'), JSON.stringify({ body: { [EMAIL]: 1 } }));
  writeFileSync(join(dir, 'd.json'), JSON.stringify({ body: { zipcode: '00000' } }));
  const findings = findLeaks(dir, ['api', quoted]);
  assert.deepEqual(findings.map((f) => f.slice(dir.length + 1)).sort(), ['a.json: held value #0', 'b.json: held value #1', 'c.json: email', 'd.json: personal-data field']);
  const clean = mkdtempSync(join(tmpdir(), 'record-clean2-'));
  writeFileSync(join(clean, 'a.json'), JSON.stringify({ provenance: { note: 'api' }, body: { rapid: 'rapid-api-x' } }));
  assert.deepEqual(findLeaks(clean, ['api']), [], 'a short needle inside a longer token, or in the note, is no finding');
});

test('the staged-corpus check passes a clean corpus and exempts message_id', () => {
  const dir = mkdtempSync(join(tmpdir(), 'record-clean-'));
  writeFileSync(join(dir, 'a.json'), JSON.stringify({ body: { message_id: '<abc@carin-test.org>', name: 'x' } }));
  verifyStaged(dir, [CLIENT_SECRET]);
});

test('the scrubber replaces credential keys, held values, short names as tokens, and email keys', () => {
  const scrubber = createScrubber();
  const out = /** @type {any} */ (scrubber.scrub({ value: TOKEN_VALUE, note: `contains ${GH_USER_TOKEN} and ${EMAIL}`, ray_id: 'abc', [EMAIL]: 1 }));
  assert.equal(out.value, '<REDACTED>');
  assert.ok(!out.note.includes('ghu_') && !out.note.includes('@'));
  assert.equal(out.ray_id, 'ray-redacted');
  assert.ok(!Object.keys(out).some((k) => k.includes('@')), 'an email-shaped key is scrubbed');
  assert.ok(scrubber.held().includes(TOKEN_VALUE));
  assert.ok(!JSON.stringify(scrubber.scrub({ again: `x ${TOKEN_VALUE}` })).includes(TOKEN_VALUE));
  scrubber.hold('api', 'example-worker-9');
  assert.equal(scrubber.scrub('the api.carin-test.org route; rapid; api-gateway'), 'the example-worker-9.carin-test.org route; rapid; api-gateway');
  assert.equal(scrubber.scrub('api', 'script'), 'example-worker-9');
  assert.equal(scrubber.scrub('unheld-worker', 'service'), 'example-worker-1', 'a Worker key aliases a name nobody held');
});

test('a Cloudflare write that names no run resource is refused before the request is sent', async () => {
  const { fake } = await setup('trun00003');
  try {
    const guards = createGuards('trun00003');
    const recorder = createRecorder({ dir: mkdtempSync(join(tmpdir(), 'record-g-')), runId: 'trun00003', scrubber: createScrubber() });
    const cf = createCloudflare({ base: fake.bases.cf, token: () => 't', guards, recorder });
    const other = '11111111111111111111111111111111';
    await assert.rejects(cf.request('POST', `/zones/${other}/dns_records`, { body: { name: 'x' } }), /Refused Cloudflare write/);
    await assert.rejects(cf.request('DELETE', `/accounts/${ACCOUNT}/r2/buckets/estate-bucket`), /Refused Cloudflare write/);
    await assert.rejects(cf.request('POST', `/accounts/${ACCOUNT}/d1/database`, { body: { name: 'estate-db' } }), /Refused Cloudflare write/);
    await assert.rejects(cf.request('POST', `/accounts/${ACCOUNT}/d1/database`, { body: { name: 'cairn-rec-trun00003-db-estate' } }), /Refused Cloudflare write/);
    await assert.rejects(cf.request('DELETE', `/accounts/${ACCOUNT}/r2/buckets/cairn-rec-trun00003-bucket2`), /Refused Cloudflare write/);
    await assert.rejects(cf.request('DELETE', `/accounts/${ACCOUNT}/d1/database/x${ZONE}`), /Refused Cloudflare write/);
    // The run makes no zone write, and a run name in a body passes only a POST to its own create collection.
    await assert.rejects(cf.request('POST', `/zones/${ZONE}/dns_records`, { body: { name: 'x' } }), /Refused Cloudflare write/);
    await assert.rejects(cf.request('PUT', `/zones/${ZONE}/workers/routes/r1`, { body: { name: 'cairn-rec-trun00003-db' } }), /Refused Cloudflare write/);
    await assert.rejects(cf.request('POST', `/accounts/${ACCOUNT}/workers/scripts`, { body: { name: 'cairn-rec-trun00003-db' } }), /Refused Cloudflare write/);
    await assert.rejects(cf.request('PUT', `/accounts/${ACCOUNT}/d1/database`, { body: { name: 'cairn-rec-trun00003-db' } }), /Refused Cloudflare write/);
    await assert.rejects(cf.request('POST', `/accounts/${ACCOUNT}/d1/database`, { body: { name: 'cairn-rec-trun00003-bucket' } }), /Refused Cloudflare write/);
    await assert.rejects(cf.request('POST', '/user/tokens/verify', { body: { name: 'cairn-rec-trun00003-key' } }), /Refused Cloudflare write/);
    assert.equal(fake.state.requests, 0, 'no request reached the server');
    await cf.request('POST', `/accounts/${ACCOUNT}/d1/database`, { body: { name: 'cairn-rec-trun00003-db' } });
    await cf.request('POST', `/accounts/${ACCOUNT}/r2/buckets`, { body: { name: 'cairn-rec-trun00003-bucket' } });
    await cf.request('POST', '/user/tokens', { body: { name: 'cairn-rec-trun00003-key' } });
    assert.equal(fake.state.requests, 3);
  } finally {
    await fake.close();
  }
});

test('a guard refuses an empty or malformed run id or adopted id', () => {
  for (const runId of ['', 't', 'trun1', 'TRUN00001', 'trun-0001']) assert.throws(() => createGuards(runId), /run id/);
  const guards = createGuards('trun00003');
  for (const id of ['', 'abc', 'x'.repeat(32)]) assert.throws(() => guards.adopt(id), /resource id/);
  guards.adopt('00000000-0000-4000-8000-000000000001');
  guards.adopt(ZONE);
});

test('a provider call never follows a redirect', async () => {
  const { fake } = await setup('trun00010');
  try {
    const recorder = createRecorder({ dir: mkdtempSync(join(tmpdir(), 'record-r-')), runId: 'trun00010', scrubber: createScrubber() });
    const cf = createCloudflare({ base: fake.bases.cf, token: () => 't', guards: createGuards('trun00010'), recorder });
    await assert.rejects(cf.request('GET', '/redirect'), /fetch failed/);
  } finally {
    await fake.close();
  }
});

test('a GitHub write is refused unless GET /user answers glw907-test', async () => {
  const { fake, ctx } = await setup('trun00004', { identity: 'someone-else' });
  try {
    await assert.rejects(runRecording(ctx), /Refused write: GET \/user answered another account/);
    assert.deepEqual(fake.state.ghWrites, []);
    assert.deepEqual([fake.state.dbs, fake.state.buckets, fake.state.tokens], [[], [], []], 'the Cloudflare half still cleaned up');
  } finally {
    await fake.close();
  }
});

test('a recording failure and a leftover resource are reported together', async () => {
  const { fake, ctx } = await setup('trun00011', { identity: 'someone-else', stubbornDb: true });
  try {
    await assert.rejects(runRecording(ctx), (error) => {
      assert.ok(error instanceof AggregateError);
      assert.match(error.message, /Refused write: GET \/user answered another account/);
      assert.match(error.message, /Cleanup left 1 resource\(s\): d1 cairn-rec-trun00011-db\. Run record.sh --cleanup trun00011\./);
      return true;
    });
  } finally {
    await fake.close();
  }
});

test('an App owned by another account is refused before it is installed', async () => {
  const { fake, ctx } = await setup('trun00012', { appOwner: 'someone-else' });
  try {
    await assert.rejects(runRecording(ctx), /owned by another account/);
    assert.deepEqual(fake.state.mintBodies, []);
    assert.deepEqual(fake.state.apps, [], 'the App was still swept');
  } finally {
    await fake.close();
  }
});

test('an installation on another account gets no installation token', async () => {
  const { fake, ctx } = await setup('trun00013', { installAccount: 'someone-else' });
  try {
    await assert.rejects(runRecording(ctx), /installation 77 is not on glw907-test/);
    assert.deepEqual(fake.state.mintBodies, []);
  } finally {
    await fake.close();
  }
});

test('an App delete the App survives is left, read through the App JWT', async () => {
  const { stateDir, fake, ctx } = await setup('trun00014', { stubbornApp: true });
  try {
    await assert.rejects(runRecording(ctx), /Cleanup left 1 resource\(s\): github-app cairn-rec-trun00014-app/);
    const results = staged(join(stateDir, 'trun00014'), 'results.json');
    assert.equal(results.resources.find((/** @type {{ kind: string }} */ r) => r.kind === 'github-app').outcome, 'left');
  } finally {
    await fake.close();
  }
});

test('a crash sweep of an App the delete leaves standing is left, read through the settings page', async () => {
  const { stateDir, fake, ctx } = await setup('trun00015', { stubbornApp: true });
  try {
    writeLedger(stateDir, 'trun00015', [{ kind: 'github-app', name: 'cairn-rec-trun00015-app', slug: 'cairn-rec-trun00015-app', id: '4242' }]);
    fake.state.apps.push('cairn-rec-trun00015-app');
    await assert.rejects(cleanupRun(ctx), /Cleanup left 1 resource\(s\): github-app/);
  } finally {
    await fake.close();
  }
});

test('the Cloudflare callback closes its tab and never redirects to github.com', async () => {
  const { fake } = await setup('trun00005');
  try {
    fakeBrowser.callbackResponse = null;
    const { accessToken } = await consent({ dashBase: fake.bases.dash, clientId: 'c', openBrowser: (url) => fakeBrowser.open(url), port: 0 });
    assert.equal(accessToken, OAUTH_TOKEN);
    const response = /** @type {Response} */ (fakeBrowser.callbackResponse);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('location'), null);
    const page = await response.text();
    assert.ok(page.includes('window.close()'));
    assert.ok(!page.includes('github.com'));
  } finally {
    await fake.close();
  }
});

test('the Cloudflare callback ignores a stale state and keeps waiting', async () => {
  const { fake } = await setup('trun00016');
  try {
    let stale = 0;
    const { accessToken } = await consent({
      dashBase: fake.bases.dash, clientId: 'c', port: 0,
      async openBrowser(url) {
        const redirect = /** @type {string} */ (new URL(url).searchParams.get('redirect_uri'));
        stale = (await fetch(`${redirect}?code=attacker&state=stale`)).status;
        await fakeBrowser.open(url);
      },
    });
    assert.equal(stale, 400);
    assert.equal(accessToken, OAUTH_TOKEN);
  } finally {
    await fake.close();
  }
});

test('the Cloudflare callback fails clearly when its port is taken', async () => {
  const holder = createServer();
  await new Promise((resolve) => holder.listen(0, '127.0.0.1', () => resolve(undefined)));
  const { port } = /** @type {import('node:net').AddressInfo} */ (holder.address());
  try {
    await assert.rejects(consent({ dashBase: 'http://127.0.0.1:1', clientId: 'c', openBrowser: () => {}, port }), new RegExp(`cannot listen on 127.0.0.1:${port} \\(EADDRINUSE\\)`));
  } finally {
    holder.close();
  }
});

test('the consent asks only for the scopes the run uses', () => {
  assert.ok(!SCOPES.includes('offline_access'));
  assert.ok(!SCOPES.includes('email-sending.write'));
});

test('a revoke that fails is a failure of the run, and its status is still recorded', async () => {
  const { stateDir, fake, ctx } = await setup('trun00017', { revokeStatus: 500 });
  try {
    await assert.rejects(runRecording(ctx), /revoke answered 500/);
    assert.equal(staged(join(stateDir, 'trun00017'), 'results.json').probes.oauthRevoke, 500);
    assert.deepEqual([fake.state.dbs, fake.state.repos, fake.state.apps], [[], [], []], 'cleanup ran before the revoke');
  } finally {
    await fake.close();
  }
});

test('a staged leak removes every staged file, results included, and names the leak', async () => {
  const { stateDir, fake, ctx } = await setup('trun00018', { leakKey: true });
  try {
    await assert.rejects(runRecording(ctx), /personal-data field/);
    assert.deepEqual(readdirSync(join(stateDir, 'trun00018')), []);
  } finally {
    await fake.close();
  }
});

test('a same-name resource found by a name check stops the run before any create', async () => {
  const { fake, ctx } = await setup('trun00019');
  const planted = { uuid: '00000000-0000-4000-8000-0000000000ff', name: 'cairn-rec-trun00019-db' };
  fake.state.dbs.push(planted);
  try {
    await assert.rejects(runRecording(ctx), /A D1 database named cairn-rec-trun00019-db already exists/);
    assert.deepEqual(fake.state.dbs, [planted], 'the same-name database is untouched');
    assert.deepEqual(fake.state.cfWrites, []);
  } finally {
    await fake.close();
  }
});

test('a cleanup that leaves a resource fails and names it', async () => {
  const { stateDir, fake, ctx } = await setup('trun00006', { stubbornDb: true });
  try {
    await assert.rejects(runRecording(ctx), /Cleanup left 1 resource\(s\): d1 cairn-rec-trun00006-db/);
    const results = staged(join(stateDir, 'trun00006'), 'results.json');
    assert.deepEqual(results.resources.filter((/** @type {{ outcome: string }} */ r) => r.outcome === 'left').map((/** @type {{ kind: string }} */ r) => r.kind), ['d1']);
    assert.equal(fake.state.dbs.length, 1);
  } finally {
    await fake.close();
  }
});

test('the run id and its sweep command are printed before the consent opens', async () => {
  const { fake, ctx } = await setup('trun00022');
  const lines = /** @type {string[]} */ ([]);
  ctx.log = (line) => lines.push(line);
  ctx.openBrowser = async (url) => {
    lines.push('<consent>');
    await fakeBrowser.open(url);
  };
  try {
    await runRecording(ctx);
    const at = lines.findIndex((line) => line.includes('Run trun00022') && line.includes('record.sh --cleanup trun00022'));
    assert.ok(at >= 0 && at < lines.indexOf('<consent>'), lines.join('\n'));
  } finally {
    await fake.close();
  }
});

/**
 * A fetch that raises a signal in this process just as the bucket create is about to be sent.
 * @param {number} times how many signals to raise
 * @returns {typeof fetch}
 */
const signalAtBucketCreate = (times) => async (input, init) => {
  if (String(input).endsWith('/r2/buckets') && init?.method === 'POST') for (let n = 0; n < times; n++) process.emit('SIGINT');
  return fetch(input, init);
};

test('a SIGINT mid-run halts the recording, sweeps and revokes, then prints the sweep command', async () => {
  const { fake, ctx } = await setup('trun00023');
  const lines = /** @type {string[]} */ ([]);
  ctx.log = (line) => lines.push(line);
  ctx.fetcher = signalAtBucketCreate(1);
  try {
    await assert.rejects(runRecording(ctx), /interrupted by SIGINT/);
    assert.ok(!fake.state.cfWrites.some((write) => write.startsWith('POST') && (write.endsWith('/r2/buckets') || write === 'POST /user/tokens')), 'no create reached the server after the signal');
    assert.deepEqual([fake.state.dbs, fake.state.buckets], [[], []], 'the sweep deleted the database the run made');
    assert.equal(fake.state.revoked, 1);
    assert.match(/** @type {string} */ (lines.at(-1)), /If anything is left, run: record\.sh --cleanup trun00023$/);
    assert.equal(process.listenerCount('SIGINT') + process.listenerCount('SIGTERM'), 0, 'the run removes its signal listeners');
  } finally {
    await fake.close();
  }
});

test('a second SIGINT exits at once with the sweep command', async () => {
  const { fake, ctx } = await setup('trun00028');
  const lines = /** @type {string[]} */ ([]);
  const exits = /** @type {number[]} */ ([]);
  ctx.log = (line) => lines.push(line);
  ctx.exit = (code) => exits.push(code);
  ctx.fetcher = signalAtBucketCreate(2);
  try {
    await assert.rejects(runRecording(ctx), /interrupted by SIGINT/);
    assert.deepEqual(exits, [130]);
    assert.ok(lines.some((line) => /^SIGINT again: .*record\.sh --cleanup trun00028$/.test(line)), lines.join('\n'));
  } finally {
    await fake.close();
  }
});

test('the browser launch leaves no SIGINT or SIGTERM listener of its own', async () => {
  const mine = () => {};
  process.on('SIGINT', mine);
  try {
    const launched = await withoutSignalListeners(async () => {
      process.on('SIGINT', () => {});
      process.on('SIGTERM', () => {});
      return 'launched';
    });
    assert.equal(launched, 'launched');
    assert.deepEqual(process.listeners('SIGINT'), [mine]);
    assert.equal(process.listenerCount('SIGTERM'), 0);
  } finally {
    process.off('SIGINT', mine);
  }
});

test('an installation that reaches every repository is refused before any user call or token', async () => {
  const { stateDir, fake, ctx } = await setup('trun00024', { installSelection: 'all' });
  try {
    await assert.rejects(runRecording(ctx), /installation 77 reaches every repository/);
    assert.deepEqual(fake.state.mintBodies, []);
    assert.ok(!existsSync(join(stateDir, 'trun00024', 'github', 'user_installation_repositories.list.200.json')));
    assert.deepEqual(fake.state.apps, [], 'the App was still swept');
  } finally {
    await fake.close();
  }
});

test('the error a run throws is scrubbed of every held value', async () => {
  const { fake, ctx } = await setup('trun00026');
  ctx.fetcher = async (input, init) => {
    if (String(input).endsWith('/workers/scripts')) throw new Error(`upstream echoed ${TEST_TOKEN} and ${OAUTH_TOKEN}`);
    return fetch(input, init);
  };
  try {
    await assert.rejects(runRecording(ctx), (error) => {
      assert.ok(error instanceof Error);
      assert.equal(error.message, 'upstream echoed <REDACTED> and <REDACTED>');
      return true;
    });
  } finally {
    await fake.close();
  }
});

test('the state, ledger, and staging directories are made private, an existing one included', async () => {
  const { stateDir, fake, ctx } = await setup('trun00027');
  const ledgers = join(stateDir, 'ledgers');
  for (const dir of [stateDir, ledgers, join(stateDir, 'trun00027'), join(stateDir, 'trun00027', 'cloudflare')]) {
    mkdirSync(dir, { recursive: true });
    chmodSync(dir, 0o755);
  }
  try {
    const dir = await runRecording(ctx);
    for (const path of [stateDir, ledgers, dir, join(dir, 'cloudflare'), join(dir, 'github')]) assert.equal(statSync(path).mode & 0o777, 0o700, path);
  } finally {
    await fake.close();
  }
});

test('node prunes its environment to the allowed names before main runs', () => {
  // A preload prints the names node holds as it exits, after record.mjs has started.
  const report = 'process.on("exit", () => console.log(JSON.stringify(Object.keys(process.env).sort())))';
  const result = spawnSync(process.execPath, ['--import', `data:text/javascript,${encodeURIComponent(report)}`, join(HERE, 'record.mjs')], {
    env: { PATH: process.env.PATH, HOME: mkdtempSync(join(tmpdir(), 'record-env-')), 'weird-name': 'x', CLOUDFLARE_API_TOKEN: 'estate', DISPLAY: ':0' },
    encoding: 'utf8',
  });
  assert.equal(result.status, 1, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout.trim().split('\n').at(-1) ?? '[]'), ['DISPLAY', 'HOME', 'PATH']);
});

test('--cleanup sweeps a crashed run from its ledger, paging the token list for a token with no id', async () => {
  const { stateDir, fake, ctx } = await setup('trun00007');
  try {
    writeLedger(stateDir, 'trun00007', [
      { kind: 'd1', name: 'cairn-rec-trun00007-db', accountId: ACCOUNT },
      { kind: 'r2', name: 'cairn-rec-trun00007-bucket', accountId: ACCOUNT },
      { kind: 'cf-token', name: 'cairn-rec-trun00007-key', accountId: ACCOUNT },
      { kind: 'repo', name: 'cairn-rec-trun00007-repo' },
      { kind: 'github-app', name: 'cairn-rec-trun00007-app' },
    ]);
    fake.state.dbs.push({ uuid: '00000000-0000-4000-8000-0000000000aa', name: 'cairn-rec-trun00007-db' });
    fake.state.buckets.push('cairn-rec-trun00007-bucket');
    for (let n = 1; n <= 60; n++) fake.state.tokens.push({ id: n.toString(16).padStart(32, 'b'), name: `estate-token-${n}`, expires_on: '' });
    fake.state.tokens.push({ id: 'c'.repeat(32), name: 'cairn-rec-trun00007-key', expires_on: '' });
    fake.state.repos.push('cairn-rec-trun00007-repo');
    fake.state.apps.push('cairn-rec-trun00007-app');
    const original = join(stateDir, 'trun00007', 'cloudflare');
    mkdirSync(original, { recursive: true });
    writeFileSync(join(original, 'accounts.list.200.json'), '{}');
    const dir = await cleanupRun(ctx);
    assert.equal(dir, join(stateDir, 'trun00007-cleanup'), 'the sweep stages into its own directory');
    assert.deepEqual(readdirSync(join(stateDir, 'trun00007'), { recursive: true }).sort(), ['cloudflare', 'cloudflare/accounts.list.200.json'], 'the run corpus is untouched');
    assert.deepEqual([fake.state.dbs, fake.state.buckets, fake.state.repos, fake.state.apps], [[], [], [], []]);
    assert.equal(fake.state.tokens.length, 60, 'only the run token was deleted');
    assert.ok(!fake.state.tokens.some((t) => t.name === 'cairn-rec-trun00007-key'));
    const results = staged(dir, 'results.json');
    assert.deepEqual(results.resources.map((/** @type {{ outcome: string }} */ r) => r.outcome), ['deleted', 'deleted', 'deleted', 'deleted', 'deleted']);
  } finally {
    await fake.close();
  }
});

test('a sweep read that answers neither 200 nor 404 leaves the resource', async () => {
  const { stateDir, fake, ctx } = await setup('trun00020', { verifyError: true });
  try {
    writeLedger(stateDir, 'trun00020', [
      { kind: 'r2', name: 'cairn-rec-trun00020-bucket', accountId: ACCOUNT },
      { kind: 'repo', name: 'cairn-rec-trun00020-repo' },
    ]);
    await assert.rejects(cleanupRun(ctx), /Cleanup left 2 resource\(s\): r2 cairn-rec-trun00020-bucket, repo cairn-rec-trun00020-repo/);
  } finally {
    await fake.close();
  }
});

test('--cleanup refuses a ledger entry whose slug is not its own App name, before any call', async () => {
  const { stateDir, fake, ctx } = await setup('trun00025');
  try {
    for (const entry of [
      { kind: 'github-app', name: 'cairn-rec-trun00025-app', slug: 'estate-app' },
      { kind: 'repo', name: 'cairn-rec-trun00025-repo', slug: 'cairn-rec-trun00025-repo' },
    ]) {
      writeLedger(stateDir, 'trun00025', [entry]);
      await assert.rejects(cleanupRun(ctx), /slug that is not its own name/);
    }
    assert.equal(fake.state.requests, 0);
  } finally {
    await fake.close();
  }
});

test('--cleanup refuses a run with no ledger, and a ledger entry that names another resource', async () => {
  const { stateDir, fake, ctx } = await setup('trun00021');
  try {
    await assert.rejects(cleanupRun(ctx), /No ledger exists for run trun00021/);
    assert.equal(fake.state.requests, 0);
    writeLedger(stateDir, 'trun00021', [{ kind: 'repo', name: 'estate-site' }]);
    await assert.rejects(cleanupRun(ctx), /names no resource of this run/);
    assert.equal(fake.state.requests, 0);
  } finally {
    await fake.close();
  }
});

test('main refuses another login and a malformed cleanup id before any call', async () => {
  const env = { GITHUB_TEST_LOGIN: 'glw907-test', GITHUB_TEST_PASSWORD: 'p', GITHUB_TEST_TOTP_SECRET: 's', GITHUB_TEST_TOKEN: 't', CAIRN_CF_CLIENT_ID: 'c' };
  await assert.rejects(main([], { ...env, GITHUB_TEST_LOGIN: 'someone-else' }), /GITHUB_TEST_LOGIN is not glw907-test/);
  for (const id of ['', 'x', 'trun1']) await assert.rejects(main(['--cleanup', id], env), /run id/);
});

test('the opener gets only PATH, HOME, and the session names, and the URL is printed', () => {
  /** @type {{ command: string, args: string[], env: Record<string, string> } | null} */
  let spawned = null;
  const lines = /** @type {string[]} */ ([]);
  const spawner = /** @type {any} */ ((/** @type {string} */ command, /** @type {string[]} */ args, /** @type {{ env: Record<string, string> }} */ options) => {
    spawned = { command, args, env: options.env };
    return { on() {}, unref() {} };
  });
  const env = { PATH: '/bin', HOME: '/h', DISPLAY: ':0', WAYLAND_DISPLAY: 'wayland-0', XDG_RUNTIME_DIR: '/run/user/1', GITHUB_TEST_PASSWORD: 'pw', GITHUB_TEST_TOKEN: 'tok' };
  openInBrowser('https://dash.example/oauth2/auth?client_id=c', { env, spawner, log: (line) => lines.push(line) });
  const { command, env: given } = /** @type {{ command: string, env: Record<string, string> }} */ (/** @type {unknown} */ (spawned));
  assert.equal(command, 'xdg-open');
  assert.deepEqual(Object.keys(given).sort(), ['DISPLAY', 'HOME', 'PATH', 'WAYLAND_DISPLAY', 'XDG_RUNTIME_DIR']);
  assert.ok(lines.join('\n').includes('https://dash.example/oauth2/auth?client_id=c'));
});

test('record.sh hands node only the allowed names, with no value on its command line', () => {
  const home = mkdtempSync(join(tmpdir(), 'record-sh-'));
  const bin = join(home, 'bin');
  mkdirSync(join(home, '.local'), { recursive: true });
  mkdirSync(bin);
  writeFileSync(join(home, '.local/secrets'), [
    'export GITHUB_TEST_LOGIN=glw907-test', 'export GITHUB_TEST_PASSWORD=pw-value-1', 'export GITHUB_TEST_TOTP_SECRET=totp-value-1',
    'GITHUB_TEST_TOKEN=token-value-1', 'export CLOUDFLARE_API_TOKEN=estate-cf-token', '',
  ].join('\n'));
  // A stand-in node that reports its arguments and environment, and a stand-in env that reports
  // being called at all, since `env NAME=value node` would put every value on a command line.
  writeFileSync(join(bin, 'node'), '#!/bin/sh\nprintf "%s\\n" "$@"\necho ---\n/usr/bin/env\n');
  writeFileSync(join(bin, 'env'), '#!/bin/sh\necho "env was called"\nexit 3\n');
  chmodSync(join(bin, 'node'), 0o755);
  chmodSync(join(bin, 'env'), 0o755);
  const result = spawnSync('bash', [join(HERE, 'record.sh'), '--cleanup', 'tabc12345'], {
    env: { HOME: home, PATH: `${bin}:/usr/bin:/bin`, DISPLAY: ':1', XDG_CURRENT_DESKTOP: 'GNOME', PARENT_SECRET: 'parent-value' },
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  const [args, envText] = result.stdout.split('---\n');
  assert.deepEqual(args.trim().split('\n'), [join(HERE, 'record.mjs'), '--cleanup', 'tabc12345']);
  const names = envText.trim().split('\n').map((line) => line.split('=')[0]).filter((name) => !['_', 'PWD', 'SHLVL', 'OLDPWD'].includes(name)).sort();
  assert.deepEqual(names, ['DISPLAY', 'GITHUB_TEST_LOGIN', 'GITHUB_TEST_PASSWORD', 'GITHUB_TEST_TOKEN', 'GITHUB_TEST_TOTP_SECRET', 'HOME', 'PATH', 'XDG_CURRENT_DESKTOP']);
  assert.ok(envText.includes('GITHUB_TEST_TOKEN=token-value-1'), 'an unexported secret is exported to node');
});

test('the App manifest names the loopback as a callback URL', () => {
  const manifest = /** @type {any} */ (buildManifest({ name: 'x' }, 'http://127.0.0.1:5/callback'));
  assert.deepEqual(manifest.callback_urls, ['http://127.0.0.1:5/callback']);
  assert.equal(manifest.redirect_url, 'http://127.0.0.1:5/callback');
});

test('the browser flows refuse any login but the test account', () => {
  requireTestLogin('glw907-test');
  for (const login of ['someone-else', null, '']) assert.throws(() => requireTestLogin(login), /Refused the browser flows/);
});

test('the loopback waiter resolves only on the flow state with well-formed parameters', async () => {
  const waiter = createCallbackWaiter();
  const isId = (/** @type {URLSearchParams} */ q) => /^\d+$/.test(q.get('installation_id') ?? '');
  const arrived = waiter.expect('s1', isId);
  assert.equal(waiter.offer(new URLSearchParams({ state: 'other', installation_id: '7' })), false);
  assert.equal(waiter.offer(new URLSearchParams({ state: 's1', installation_id: '7;rm' })), false);
  assert.equal(waiter.offer(new URLSearchParams({ installation_id: '7' })), false);
  assert.equal(waiter.offer(new URLSearchParams({ state: 's1', installation_id: '77' })), true);
  assert.equal((await arrived).get('installation_id'), '77');
  assert.equal(waiter.offer(new URLSearchParams({ state: 's1', installation_id: '78' })), false, 'a settled flow takes no second callback');
  await assert.rejects(waiter.expect('s2', isId, 10), /never reached the loopback/);
});

const OWNER = 'glw907-test';
const REPO = 'cairn-rec-trun00001-repo';

test('a picker option matches only the exact owner/repo, followed by a space or the end', () => {
  assert.equal(isRepoOption(`${OWNER}/${REPO}`, OWNER, REPO), true);
  assert.equal(isRepoOption(`${OWNER}/${REPO}\n  no description`, OWNER, REPO), true);
  assert.equal(isRepoOption(`${OWNER}/${REPO}-2 no description`, OWNER, REPO), false, 'a sibling sharing the prefix');
  assert.equal(isRepoOption(`someone-else/${REPO} no description`, OWNER, REPO), false, 'another owner');
  assert.equal(isRepoOption(`x ${OWNER}/${REPO}`, OWNER, REPO), false, 'the name must start the option');
  assert.equal(isRepoOption(REPO, OWNER, REPO), false, 'the bare name is not the option');
});

test('the selected repository shows as a whole name, never a sibling or another owner', () => {
  assert.equal(showsRepo(`Selected 1 repository. ${OWNER}/${REPO} Install`, OWNER, REPO), true);
  assert.equal(showsRepo(`Selected\n${REPO}\nInstall`, OWNER, REPO), true);
  assert.equal(showsRepo(`${OWNER}/${REPO}-2 Install`, OWNER, REPO), false);
  assert.equal(showsRepo(`someone-else/${REPO} Install`, OWNER, REPO), false);
  assert.equal(showsRepo('Install on your personal account glw907-test', OWNER, REPO), false);
});

/**
 * GitHub's install page with its repository picker open on a search: each option is a button
 * named `owner/repo` then its description, a click selects it, and Escape closes the picker.
 * @param {string[]} options the options' visible text
 * @param {{ selectionShows?: boolean }} [spec] false for a page that never shows the selection
 */
function fakeInstallPage(options, { selectionShows = true } = {}) {
  /** @type {string[]} */
  const events = [];
  let open = true;
  /** @type {string | null} */
  let selected = null;
  const page = {
    /** @param {string} selector */
    locator(selector) {
      if (selector === 'body') {
        const lines = [`Install on your personal account ${OWNER}`, ...(open ? options : []), ...(!open && selectionShows && selected ? [selected] : []), 'Install Cancel'];
        return { innerText: async () => lines.join('\n') };
      }
      const handles = (open ? options : []).map((text) => ({
        isVisible: async () => true,
        innerText: async () => text,
        click: async () => {
          events.push(`click ${text}`);
          selected = text.split(/\s/)[0];
        },
      }));
      return { elementHandles: async () => handles };
    },
    keyboard: {
      /** @param {string} key */
      press: async (key) => {
        events.push(`press ${key}`);
        if (key === 'Escape') open = false;
      },
    },
    getByRole: () => ({ first: () => ({ isEnabled: async () => selected !== null }) }),
  };
  const search = { first: () => ({ isVisible: async () => open }) };
  return { page: /** @type {any} */ (page), search: /** @type {any} */ (search), events };
}

/** @param {string} reason */
const failWith = async (reason) => {
  throw new Error(reason);
};

test('the picker clicks the exact repository once, closes, and returns only once it shows selected', async () => {
  const exact = `${OWNER}/${REPO}\nno description`;
  const { page, search, events } = fakeInstallPage([`${OWNER}/${REPO}-2\nno description`, `someone-else/${REPO}\nno description`, exact]);
  await pickRepository(page, { owner: OWNER, repo: REPO, search, fail: failWith, waitMs: 200, pollMs: 5 });
  assert.deepEqual(events, [`click ${exact}`, 'press Escape']);
});

test('the picker fails closed when only a sibling or another owner is offered', async () => {
  const { page, search, events } = fakeInstallPage([`${OWNER}/${REPO}-2 no description`, `someone-else/${REPO} no description`]);
  await assert.rejects(pickRepository(page, { owner: OWNER, repo: REPO, search, fail: failWith, waitMs: 30, pollMs: 5 }), /never offered the run repository/);
  assert.deepEqual(events, [], 'nothing is clicked');
});

test('a stale option handle is looked up again and a click that never works fails with evidence', async () => {
  const stale = fakeInstallPage([`${OWNER}/${REPO} no description`]);
  const realLocator = stale.page.locator.bind(stale.page);
  let scans = 0;
  stale.page.locator = (/** @type {string} */ selector) => {
    const found = realLocator(selector);
    if (selector === 'body') return found;
    return {
      elementHandles: async () => {
        const handles = await found.elementHandles();
        scans += 1;
        if (scans === 1) return handles.map((/** @type {any} */ h) => ({ ...h, click: async () => { throw new Error('Element is not attached to the DOM'); } }));
        return handles;
      },
    };
  };
  await pickRepository(stale.page, { owner: OWNER, repo: REPO, search: stale.search, fail: failWith, waitMs: 200, pollMs: 5 });
  assert.equal(stale.events.filter((e) => e.startsWith('click ')).length, 1, 'the second look clicks once');

  const broken = fakeInstallPage([`${OWNER}/${REPO} no description`]);
  const brokenLocator = broken.page.locator.bind(broken.page);
  broken.page.locator = (/** @type {string} */ selector) => {
    const found = brokenLocator(selector);
    if (selector === 'body') return found;
    return {
      elementHandles: async () => (await found.elementHandles()).map((/** @type {any} */ h) => ({ ...h, click: async () => { throw new Error('detached'); } })),
    };
  };
  await assert.rejects(pickRepository(broken.page, { owner: OWNER, repo: REPO, search: broken.search, fail: failWith, waitMs: 30, pollMs: 5 }), /never offered the run repository/);
});

test('the picker fails closed when the page never shows the repository selected', async () => {
  const { page, search } = fakeInstallPage([`${OWNER}/${REPO} no description`], { selectionShows: false });
  await assert.rejects(pickRepository(page, { owner: OWNER, repo: REPO, search, fail: failWith, waitMs: 30, pollMs: 5 }), /never showed as selected/);
});
