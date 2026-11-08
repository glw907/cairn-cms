// The recorder's tests. A local fake server stands in for every live service; nothing here
// touches the network beyond loopback or reads ~/.local/secrets.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createCloudflare } from './clients.mjs';
import { createGuards } from './guards.mjs';
import { ledgerPath } from './ledger.mjs';
import { consent } from './oauth.mjs';
import { createRecorder } from './recorder.mjs';
import { createScrubber, verifyStaged } from './scrub.mjs';
import { cleanupRun, runRecording } from './run.mjs';
import { ACCOUNT, EMAIL, ESTATE_WORKER, fakeBrowser, GH_INSTALL_TOKEN, GH_REFRESH_TOKEN, GH_USER_TOKEN, OAUTH_TOKEN, PEM, startFake, TOKEN_VALUE, ZONE, CLIENT_SECRET } from './fake-services.mjs';

const TEST_TOKEN = 'test_account_token_0123456789';

/** @param {string} runId */
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

test('a run records each recordable route, scrubbed, and deletes everything it made', async () => {
  const { stateDir, fake, ctx } = await setup('trun1');
  try {
    const dir = await runRecording(ctx);
    const names = stagedFiles(dir).map((f) => f.slice(dir.length + 1)).sort();
    for (const expected of [
      'cloudflare/accounts.list.200.json', 'cloudflare/user.get.200.json', 'cloudflare/zones.list.200.json',
      'cloudflare/d1_database.create.200.json', 'cloudflare/r2_buckets.create.200.json', 'cloudflare/user_tokens.create.200.json',
      'cloudflare/user_tokens.delete.200.json', 'cloudflare/r2_bucket.name-check.404.json', 'cloudflare/d1_query.success.200.json',
      'github/repo_create.ok.201.json', 'github/app_manifest_conversion.created.201.json', 'github/login_oauth_access_token.ok.200.json',
      'github/app_installations.list.200.json', 'github/app_installation_access_tokens.created.201.json',
      'github/repo_actions_secrets_public_key.ok.200.json', 'github/repo_actions_secret_put.ok.201.json', 'github/app_installation.delete.204.json',
      'results.json',
    ]) assert.ok(names.includes(expected), `${expected} is staged (have ${names.join(', ')})`);

    const listing = JSON.parse(readFileSync(join(dir, 'cloudflare/accounts.list.200.json'), 'utf8'));
    assert.equal(listing.provenance.status, 200);
    assert.equal(typeof listing.provenance.captured, 'string');
    assert.ok(listing.provenance.source.includes('GET /accounts'));

    const all = stagedFiles(dir).map((f) => readFileSync(f, 'utf8')).join('\n');
    for (const secret of [ACCOUNT, ZONE, EMAIL, ESTATE_WORKER, TOKEN_VALUE, OAUTH_TOKEN, TEST_TOKEN, CLIENT_SECRET, GH_USER_TOKEN, GH_REFRESH_TOKEN, GH_INSTALL_TOKEN, PEM, 'whsec_0123456789']) {
      assert.ok(!all.includes(secret), 'a held value reached the staged corpus');
    }

    const results = JSON.parse(readFileSync(join(dir, 'results.json'), 'utf8'));
    assert.deepEqual(results.resources.map((/** @type {{ outcome: string }} */ r) => r.outcome), ['deleted', 'deleted', 'deleted', 'deleted', 'deleted']);
    assert.equal(results.probes.oauthRevoke, 200);
    assert.equal(results.probes.subscriptions, 200);
    assert.equal(results.probes.githubInstallCallbackState, true);
    assert.equal(results.timeoutMs, 15_000);
    assert.ok(results.routes.length > 10 && results.routes.every((/** @type {{ withinTimeout: boolean }} */ r) => r.withinTimeout));

    assert.deepEqual([fake.state.dbs, fake.state.buckets, fake.state.tokens, fake.state.repos, fake.state.apps], [[], [], [], [], []]);
    assert.ok(fake.state.ledgerAtCreate.length >= 4 && fake.state.ledgerAtCreate.every(Boolean), 'every create found its ledger entry already written');
    assert.equal(statSync(ledgerPath(join(stateDir, 'ledgers'), 'trun1')).mode & 0o777, 0o600);
  } finally {
    await fake.close();
  }
});

test('the minted token expires one hour out', async () => {
  const { fake, ctx } = await setup('trun2');
  /** @type {{ expires_on: string } | undefined} */
  let seen;
  const original = ctx.fetcher ?? fetch;
  ctx.fetcher = async (input, init) => {
    if (String(input).endsWith('/user/tokens') && init?.method === 'POST') seen = JSON.parse(String(init.body));
    return original(input, init);
  };
  try {
    await runRecording(ctx);
    const hours = (Date.parse(/** @type {{ expires_on: string }} */ (seen).expires_on) - Date.now()) / 3_600_000;
    assert.ok(hours > 0.9 && hours <= 1, `expires_on is ${hours} hours out`);
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

test('the staged-corpus check passes a clean corpus and exempts message_id', () => {
  const dir = mkdtempSync(join(tmpdir(), 'record-clean-'));
  writeFileSync(join(dir, 'a.json'), JSON.stringify({ body: { message_id: '<abc@carin-test.org>', name: 'x' } }));
  verifyStaged(dir, [CLIENT_SECRET]);
});

test('the scrubber replaces credential keys and held values in later bodies', () => {
  const scrubber = createScrubber();
  const out = /** @type {any} */ (scrubber.scrub({ value: TOKEN_VALUE, note: `contains ${GH_USER_TOKEN} and ${EMAIL}`, ray_id: 'abc' }));
  assert.equal(out.value, '<REDACTED>');
  assert.ok(!out.note.includes('ghu_') && !out.note.includes('@'));
  assert.equal(out.ray_id, 'ray-redacted');
  assert.ok(scrubber.held().includes(TOKEN_VALUE));
  assert.ok(!JSON.stringify(scrubber.scrub({ again: `x ${TOKEN_VALUE}` })).includes(TOKEN_VALUE));
});

test('a Cloudflare write off the test zone is refused before the request is sent', async () => {
  const { fake } = await setup('trun3');
  try {
    const guards = createGuards('trun3');
    guards.setZone(ZONE);
    const recorder = createRecorder({ dir: mkdtempSync(join(tmpdir(), 'record-g-')), runId: 'trun3', scrubber: createScrubber() });
    const cf = createCloudflare({ base: fake.bases.cf, token: () => 't', guards, recorder });
    const other = '11111111111111111111111111111111';
    await assert.rejects(cf.request('POST', `/zones/${other}/dns_records`, { body: { name: 'x' } }), /Refused Cloudflare write/);
    await assert.rejects(cf.request('DELETE', `/accounts/${ACCOUNT}/r2/buckets/estate-bucket`), /Refused Cloudflare write/);
    await assert.rejects(cf.request('POST', `/accounts/${ACCOUNT}/d1/database`, { body: { name: 'estate-db' } }), /Refused Cloudflare write/);
    assert.equal(fake.state.requests, 0, 'no request reached the server');
    await cf.request('POST', `/accounts/${ACCOUNT}/d1/database`, { body: { name: 'cairn-rec-trun3-db' } });
    await cf.request('POST', `/zones/${ZONE}/dns_records`, { body: { name: 'x' } }).catch(() => {});
    assert.equal(fake.state.requests, 2);
  } finally {
    await fake.close();
  }
});

test('a GitHub write is refused unless GET /user answers glw907-test', async () => {
  const { fake, ctx } = await setup('trun4', { identity: 'someone-else' });
  try {
    await assert.rejects(runRecording(ctx), /Refused write: GET \/user answered another account/);
    assert.deepEqual(fake.state.ghWrites, []);
    assert.deepEqual([fake.state.dbs, fake.state.buckets, fake.state.tokens], [[], [], []], 'the Cloudflare half still cleaned up');
  } finally {
    await fake.close();
  }
});

test('the Cloudflare callback closes its tab and never redirects to github.com', async () => {
  const { fake } = await setup('trun5');
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

test('a cleanup that leaves a resource fails and names it', async () => {
  const { stateDir, fake, ctx } = await setup('trun6', { stubbornDb: true });
  try {
    await assert.rejects(runRecording(ctx), /Cleanup left 1 resource\(s\): d1 cairn-rec-trun6-db/);
    const results = JSON.parse(readFileSync(join(stateDir, 'trun6', 'results.json'), 'utf8'));
    assert.deepEqual(results.resources.filter((/** @type {{ outcome: string }} */ r) => r.outcome === 'left').map((/** @type {{ kind: string }} */ r) => r.kind), ['d1']);
    assert.equal(fake.state.dbs.length, 1);
  } finally {
    await fake.close();
  }
});

test('--cleanup sweeps a crashed run from its ledger', async () => {
  const { stateDir, fake, ctx } = await setup('trun7');
  try {
    const ledgerDir = join(stateDir, 'ledgers');
    mkdirSync(ledgerDir, { recursive: true });
    writeFileSync(ledgerPath(ledgerDir, 'trun7'), JSON.stringify([
      { kind: 'd1', name: 'cairn-rec-trun7-db', accountId: ACCOUNT },
      { kind: 'r2', name: 'cairn-rec-trun7-bucket', accountId: ACCOUNT },
      { kind: 'cf-token', name: 'cairn-rec-trun7-key', accountId: ACCOUNT },
      { kind: 'repo', name: 'cairn-rec-trun7-repo' },
      { kind: 'github-app', name: 'cairn-rec-trun7-app' },
    ]));
    fake.state.dbs.push({ uuid: '00000000-0000-4000-8000-0000000000aa', name: 'cairn-rec-trun7-db' });
    fake.state.buckets.push('cairn-rec-trun7-bucket');
    fake.state.tokens.push({ id: 'tokx', name: 'cairn-rec-trun7-key', expires_on: '' });
    fake.state.repos.push('cairn-rec-trun7-repo');
    fake.state.apps.push('cairn-rec-trun7-app');
    const dir = await cleanupRun(ctx);
    assert.deepEqual([fake.state.dbs, fake.state.buckets, fake.state.tokens, fake.state.repos, fake.state.apps], [[], [], [], [], []]);
    const results = JSON.parse(readFileSync(join(dir, 'results.json'), 'utf8'));
    assert.deepEqual(results.resources.map((/** @type {{ outcome: string }} */ r) => r.outcome), ['deleted', 'deleted', 'deleted', 'deleted', 'deleted']);
  } finally {
    await fake.close();
  }
});
