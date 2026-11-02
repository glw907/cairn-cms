// The email re-offer (#183), driven in process against runChapter2 through its confirm and
// promptSecretFn seams. A record that declined email sign-in is asked again on a later run, from
// `paid-plan-declined` or from `builds-connect-declined` while it still carries `emailDeclinedAt`,
// and never once Workers Builds is connected.
// bin.mjs's routing into and out of this behavior is proven in resume-chapter3.test.mjs, which
// can reach it only unprompted; the prompted paths live here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { makeFakeBin } from './fake-bin.mjs';
import { startFakeCloudflare } from './fake-cloudflare.mjs';
import { makeApi, SENDING_DISABLED_CODE } from '../src/cloudflare/api.mjs';
import { saveSite, loadSite } from '../src/state.mjs';
import { runChapter2, hasOpenEmailDecline } from '../src/cloudflare/chapter2.mjs';

const WORKERS_DEV_URL = 'https://email-reoffer-site.glw907.workers.dev';
const DOMAIN = 'email-reoffer.example';

/** Point CAIRN_STATE_DIR at a fresh temporary directory for one test. */
async function freshStateDir(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-email-reoffer-state-'));
  process.env.CAIRN_STATE_DIR = dir;
  t.after(() => {
    delete process.env.CAIRN_STATE_DIR;
    return rm(dir, { recursive: true, force: true });
  });
  return dir;
}

/** A scaffold directory with the two files the email half rewrites. */
async function fixtureScaffoldDir(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-email-reoffer-scaffold-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await writeFile(
    path.join(dir, 'wrangler.jsonc'),
    JSON.stringify({ name: 'email-reoffer-site', vars: { PUBLIC_ORIGIN: WORKERS_DEV_URL } }, null, 2),
  );
  await mkdir(path.join(dir, 'src', 'theme'), { recursive: true });
  await writeFile(
    path.join(dir, 'src', 'theme', 'cairn.config.ts'),
    "export const publicOrigin = 'https://showcase.test';\nexport default {\n  email: { from: 'cms@showcase.test' },\n};\n",
  );
  return dir;
}

/** Start a fake Cloudflare and point the API base at it. */
async function setupCloudflare(t) {
  const cloudflare = await startFakeCloudflare({ zoneStatus: 'active' });
  t.after(() => cloudflare.close());
  process.env.CAIRN_CLOUDFLARE_API_BASE = cloudflare.apiBase;
  t.after(() => {
    delete process.env.CAIRN_CLOUDFLARE_API_BASE;
  });
  return cloudflare;
}

/** Point wrangler and npm at one fake, armed for whoami, deploy, and the build. */
async function setupWrangler(t) {
  const fake = await makeFakeBin('email-reoffer-wrangler');
  t.after(() => fake.close());
  await fake.respond('whoami --json', {
    code: 0,
    stdout: JSON.stringify({ loggedIn: true, accounts: [{ id: 'acct-1', name: 'Test Account' }] }),
  });
  await fake.respond('deploy', { code: 0, stdout: `Deployed (0.1 sec)\n  ${WORKERS_DEV_URL}\n` });
  await fake.respond('run build', { code: 0, stdout: 'built.\n' });
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  process.env.CAIRN_NPM_BIN = fake.binPath;
  t.after(() => {
    delete process.env.CAIRN_WRANGLER_BIN;
    delete process.env.CAIRN_NPM_BIN;
  });
  return fake;
}

/** The propagation refusal, which parks a run one hop past onboarding with the token still saved. */
function sendingDisabledBody() {
  return {
    success: false,
    errors: [{ code: SENDING_DISABLED_CODE, message: 'email.sending.error.email.sending_disabled' }],
    messages: [],
    result: null,
  };
}

/**
 * Seed a record that finished the domain half and then declined email sign-in, at `step`, with a
 * real zone on the fake so a yes has an onboarding read to reach.
 * @param {string} siteId
 * @param {string} dir
 * @param {string} step `paid-plan-declined` or `builds-connect-declined`
 * @param {object} cloudflare
 * @param {Record<string, unknown>} [overrides] merged over the seeded `cloudflare` object
 */
async function seedDeclined(siteId, dir, step, cloudflare, overrides = {}) {
  const api = makeApi({ token: 'old-token', accountId: 'acct-1', dir });
  const created = await api.createZone(DOMAIN);
  const zone = await api.getZone(created.id);
  await saveSite(siteId, {
    name: 'Email Reoffer Site',
    dir,
    step,
    ownerEmail: 'owner@example.com',
    github: { appId: 42, appSlug: 'cairn-email-reoffer', owner: 'reoffer-owner', installationId: 7 },
    cloudflare: {
      url: WORKERS_DEV_URL,
      workerName: 'email-reoffer-site',
      accountId: 'acct-1',
      apiToken: 'old-token',
      domain: DOMAIN,
      zoneId: zone.id,
      nameServers: zone.name_servers,
      alreadyActive: true,
      emailDeclinedAt: '2026-10-30T00:00:00.000Z',
      ...cloudflare,
      ...overrides,
    },
  });
  return zone.id;
}

const neverOpensBrowser = () => Promise.resolve();
const mustNotBeCalled = (label) => async () => {
  throw new Error(`${label} must not be called on this path`);
};

/** A `confirm` that records each message and answers `answer`. */
function recordingConfirm(answer, asked) {
  return async ({ message }) => {
    asked.push(message);
    return answer;
  };
}

/** Run chapter 2 against the seeded record with the reoffer-relevant seams filled in. */
async function run(siteId, dir, overrides) {
  const logs = [];
  const promise = runChapter2({
    openBrowser: neverOpensBrowser,
    siteId,
    record: await loadSite(siteId),
    dir,
    args: { yes: false },
    log: (line) => logs.push(line),
    dryRun: false,
    isTTY: true,
    stdinIsTTY: true,
    env: {},
    argv: [],
    text: mustNotBeCalled('text'),
    fetchImpl: mustNotBeCalled('fetchImpl'),
    ...overrides,
  });
  return { logs, promise };
}

/** True for a request that would create a zone or write a DNS record. */
function isZoneOrDnsWrite(request) {
  return request.method === 'POST' && /\/zones(\/[^/]+\/dns_records)?$/.test(request.path);
}

const DECLINED_AT = '2026-10-30T00:00:00.000Z';

for (const [label, record, expected] of [
  ['paid-plan-declined', { step: 'paid-plan-declined', cloudflare: {} }, true],
  ['builds-connect-declined with emailDeclinedAt', { step: 'builds-connect-declined', cloudflare: { emailDeclinedAt: DECLINED_AT } }, true],
  ['builds-connect-declined without emailDeclinedAt', { step: 'builds-connect-declined', cloudflare: {} }, false],
  ['a decline whose onboarding is done', { step: 'paid-plan-declined', cloudflare: { emailOnboardedAt: DECLINED_AT } }, false],
  ['builds-live with a trigger', { step: 'builds-live', cloudflare: { emailDeclinedAt: DECLINED_AT, buildsTriggerUuid: 't-1' } }, false],
  ['builds-live without a trigger', { step: 'builds-live', cloudflare: { emailDeclinedAt: DECLINED_AT } }, false],
  ['paid-plan-declined with a trigger', { step: 'paid-plan-declined', cloudflare: { buildsTriggerUuid: 't-1' } }, false],
  ['builds-connect-declined with a trigger', { step: 'builds-connect-declined', cloudflare: { emailDeclinedAt: DECLINED_AT, buildsTriggerUuid: 't-1' } }, false],
]) {
  test(`hasOpenEmailDecline: ${label} is ${expected ? 'open' : 'not open'}`, () => {
    assert.equal(hasOpenEmailDecline(record), expected);
  });
}

for (const [step, extra] of [
  ['paid-plan-declined', {}],
  ['builds-connect-declined', { emailDeclinedAt: '2026-10-30T00:00:00.000Z' }],
]) {
  test(`reoffer at ${step}: a no asks the email question, leaves the step, and leaves no token`, async (t) => {
    await freshStateDir(t);
    const dir = await fixtureScaffoldDir(t);
    await setupCloudflare(t);
    await seedDeclined('reoffer-no', dir, step, extra);

    const asked = [];
    const { logs, promise } = await run('reoffer-no', dir, {
      confirm: recordingConfirm(false, asked),
      promptSecretFn: mustNotBeCalled('promptSecretFn'),
    });
    const outcome = await promise;

    assert.equal(outcome.outcome, 'paid-plan-declined');
    assert.deepEqual(asked, ['Turn on email sign-in for your domain now?']);
    assert.ok(logs.some((line) => line.includes('chose again')), 'the reoffered decline copy prints');
    const state = await loadSite('reoffer-no');
    assert.equal(state.step, step, 'a no leaves the step where it was');
    assert.equal('apiToken' in state.cloudflare, false, 'the saved token is deleted before the question');
    assert.equal('buildsDeclinedAt' in state.cloudflare, false, 'a no writes no Builds marker');
  });
}

test('reoffer: --yes without --email declines without a prompt and names the flag', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  await setupCloudflare(t);
  await seedDeclined('reoffer-yes', dir, 'paid-plan-declined', {});

  const { logs, promise } = await run('reoffer-yes', dir, {
    args: { yes: true },
    confirm: mustNotBeCalled('confirm'),
    promptSecretFn: mustNotBeCalled('promptSecretFn'),
  });
  const outcome = await promise;

  assert.equal(outcome.outcome, 'paid-plan-declined');
  assert.ok(logs.some((line) => line.includes('chose again')));
  assert.ok(logs.some((line) => line.includes('Re-run with --email')), `expected the flag line, got: ${logs.join('\n')}`);
  const state = await loadSite('reoffer-yes');
  assert.equal(state.step, 'paid-plan-declined');
  assert.equal('apiToken' in state.cloudflare, false);
});

test('reoffer: a run that cannot ask (no terminal, no --yes) declines without calling confirm', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  await setupCloudflare(t);
  await seedDeclined('reoffer-notty', dir, 'builds-connect-declined', {});

  const { logs, promise } = await run('reoffer-notty', dir, {
    isTTY: false,
    confirm: mustNotBeCalled('confirm'),
    promptSecretFn: mustNotBeCalled('promptSecretFn'),
  });
  const outcome = await promise;

  assert.equal(outcome.outcome, 'paid-plan-declined');
  assert.ok(logs.some((line) => line.includes('chose again')));
  assert.ok(logs.some((line) => line.includes('Re-run with --email')), `expected the flag line, got: ${logs.join('\n')}`);
  const state = await loadSite('reoffer-notty');
  assert.equal(state.step, 'builds-connect-declined', 'a decline keeps the Builds terminal step');
  assert.equal('apiToken' in state.cloudflare, false);
});

test('reoffer: a run whose stdin is not a terminal declines without calling confirm, even with a terminal stdout', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  await setupCloudflare(t);
  await seedDeclined('reoffer-nostdin', dir, 'paid-plan-declined', {});

  const { logs, promise } = await run('reoffer-nostdin', dir, {
    isTTY: true,
    stdinIsTTY: false,
    confirm: mustNotBeCalled('confirm'),
    promptSecretFn: mustNotBeCalled('promptSecretFn'),
  });
  const outcome = await promise;

  assert.equal(outcome.outcome, 'paid-plan-declined');
  assert.ok(logs.some((line) => line.includes('this run cannot ask')), `got: ${logs.join('\n')}`);
  assert.equal((await loadSite('reoffer-nostdin')).step, 'paid-plan-declined');
});

test('reoffer: a yes from paid-plan-declined reaches onboarding without redoing the zone or DNS, and saves the new token', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t);
  await setupWrangler(t);
  const zoneId = await seedDeclined('reoffer-yes-ppd', dir, 'paid-plan-declined', {});
  cloudflare.failNext('email_send', 403, sendingDisabledBody());
  const requestsBefore = cloudflare.requests.length;

  const prompts = [];
  const asked = [];
  const { promise } = await run('reoffer-yes-ppd', dir, {
    confirm: recordingConfirm(true, asked),
    promptSecretFn: async (message) => {
      prompts.push(message);
      return 'new-token';
    },
    fetchImpl: async () => new Response(null, { status: 200 }),
  });
  const outcome = await promise;

  assert.equal(outcome.outcome, 'email-sender-propagating');
  assert.equal(asked.length, 1, 'the email question is asked once, not again at the normal admission');
  assert.equal(prompts.length, 1, 'the token is prompted for once, since the old one was deleted');
  const state = await loadSite('reoffer-yes-ppd');
  assert.equal(state.cloudflare.apiToken, 'new-token');
  assert.equal(state.step, 'email-onboarded');
  const after = cloudflare.requests.slice(requestsBefore);
  assert.deepEqual(after.filter(isZoneOrDnsWrite), [], 'no zone create or DNS write on a finished domain');
  assert.ok(
    after.some((r) => r.method === 'GET' && r.path.startsWith(`/client/v4/zones/${zoneId}/email/sending/subdomains`)),
    'the onboarding read happens',
  );
});

test('reoffer: a yes from builds-connect-declined writes the Builds decline marker', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t);
  await setupWrangler(t);
  await seedDeclined('reoffer-yes-bcd', dir, 'builds-connect-declined', {});
  cloudflare.failNext('email_send', 403, sendingDisabledBody());

  const { promise } = await run('reoffer-yes-bcd', dir, {
    confirm: recordingConfirm(true, []),
    promptSecretFn: async () => 'new-token',
    fetchImpl: async () => new Response(null, { status: 200 }),
  });
  await promise;

  const state = await loadSite('reoffer-yes-bcd');
  assert.equal(typeof state.cloudflare.buildsDeclinedAt, 'string', 'the earlier Builds decline is recorded');
  assert.equal(state.step, 'email-onboarded');
});

for (const [label, marker] of [
  ['a saved chapter 3 token', { buildsTokenSavedAt: '2026-10-31T00:00:00.000Z' }],
  ['a Builds connection', { buildsConnectionUuid: 'connection-1' }],
]) {
  test(`reoffer: a yes from builds-connect-declined after a --connect that consented (${label}) writes no Builds decline`, async (t) => {
    await freshStateDir(t);
    const dir = await fixtureScaffoldDir(t);
    const cloudflare = await setupCloudflare(t);
    await setupWrangler(t);
    await seedDeclined('reoffer-consent', dir, 'builds-connect-declined', {}, marker);
    cloudflare.failNext('email_send', 403, sendingDisabledBody());

    const { promise } = await run('reoffer-consent', dir, {
      confirm: recordingConfirm(true, []),
      promptSecretFn: async () => 'new-token',
      fetchImpl: async () => new Response(null, { status: 200 }),
    });
    await promise;

    const state = await loadSite('reoffer-consent');
    assert.equal('buildsDeclinedAt' in state.cloudflare, false, 'a later consent outranks the earlier Builds decline');
    assert.equal(state.step, 'email-onboarded');
  });
}

test('reoffer: a parked Builds consent survives a no, and the later yes writes no Builds decline', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t);
  await setupWrangler(t);
  const marker = '2026-10-31T00:00:00.000Z';
  await seedDeclined('reoffer-parked', dir, 'builds-connect-declined', {}, { buildsTokenSavedAt: marker });

  const declined = await run('reoffer-parked', dir, {
    confirm: recordingConfirm(false, []),
    promptSecretFn: mustNotBeCalled('promptSecretFn'),
  });
  await declined.promise;
  const afterNo = await loadSite('reoffer-parked');
  assert.equal(afterNo.step, 'builds-connect-declined', 'a no changes nothing');
  assert.equal(afterNo.cloudflare.buildsTokenSavedAt, marker, 'a no keeps the parked consent marker');
  assert.equal('buildsDeclinedAt' in afterNo.cloudflare, false);

  cloudflare.failNext('email_send', 403, sendingDisabledBody());
  const accepted = await run('reoffer-parked', dir, {
    confirm: recordingConfirm(true, []),
    promptSecretFn: async () => 'new-token',
    fetchImpl: async () => new Response(null, { status: 200 }),
  });
  await accepted.promise;
  const afterYes = await loadSite('reoffer-parked');
  assert.equal('buildsDeclinedAt' in afterYes.cloudflare, false, 'the parked consent outranks a Builds decline');
  assert.equal(afterYes.step, 'email-onboarded');
});

test("reoffer: chapter 2's own token clears chapter 3's saved-token marker, so chapter 3 never adopts it", async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t);
  await setupWrangler(t);
  // A `--connect` that consented and parked before its trigger left chapter 3's marker behind.
  await seedDeclined('reoffer-marker', dir, 'builds-connect-declined', {}, {
    buildsTokenSavedAt: '2026-10-31T00:00:00.000Z',
  });
  cloudflare.failNext('email_send', 403, sendingDisabledBody());

  const { promise } = await run('reoffer-marker', dir, {
    confirm: recordingConfirm(true, []),
    promptSecretFn: async () => 'chapter2-token',
    fetchImpl: async () => new Response(null, { status: 200 }),
  });
  await promise;

  const state = await loadSite('reoffer-marker');
  assert.equal(state.cloudflare.apiToken, 'chapter2-token');
  assert.equal('buildsTokenSavedAt' in state.cloudflare, false, "the saved token is no longer chapter 3's");
});

test('reoffer: --yes --email with CAIRN_CF_API_TOKEN reaches onboarding with no prompt', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t);
  await setupWrangler(t);
  const zoneId = await seedDeclined('reoffer-yes-email', dir, 'builds-connect-declined', {});
  cloudflare.failNext('email_send', 403, sendingDisabledBody());
  const requestsBefore = cloudflare.requests.length;

  const { promise } = await run('reoffer-yes-email', dir, {
    args: { yes: true, email: true },
    isTTY: false,
    env: { CAIRN_CF_API_TOKEN: 'env-token' },
    confirm: mustNotBeCalled('confirm'),
    promptSecretFn: mustNotBeCalled('promptSecretFn'),
    fetchImpl: async () => new Response(null, { status: 200 }),
  });
  const outcome = await promise;

  assert.equal(outcome.outcome, 'email-sender-propagating');
  const state = await loadSite('reoffer-yes-email');
  assert.equal(state.cloudflare.apiToken, 'env-token');
  assert.equal(state.step, 'email-onboarded');
  assert.ok(
    cloudflare.requests
      .slice(requestsBefore)
      .some((r) => r.method === 'GET' && r.path.startsWith(`/client/v4/zones/${zoneId}/email/sending/subdomains`)),
  );
});

test('reoffer: a throw after the token hop leaves the record at domain-live', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t);
  await setupWrangler(t);
  await seedDeclined('reoffer-throw', dir, 'paid-plan-declined', {});
  cloudflare.failNext('email_subdomain_list', 500, { success: false, errors: [{ code: 1000, message: 'boom' }], messages: [], result: null });

  const { promise } = await run('reoffer-throw', dir, {
    confirm: recordingConfirm(true, []),
    promptSecretFn: async () => 'new-token',
    fetchImpl: async () => new Response(null, { status: 200 }),
  });
  await assert.rejects(promise);

  const state = await loadSite('reoffer-throw');
  assert.equal(state.step, 'domain-live', 'a crash mid-reoffer resumes at domain-live under the normal rules');
});
