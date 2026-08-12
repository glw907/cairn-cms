import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { makeFakeBin } from '../../test/fake-bin.mjs';
import { startFakeCloudflare } from '../../test/fake-cloudflare.mjs';
import { makeApi } from './api.mjs';
import { saveSite, loadSite } from '../state.mjs';

/** A minimal wrangler.jsonc fixture carrying the one key writePublicOrigin needs. */
const MINIMAL_WRANGLER_JSONC = JSON.stringify(
  { name: 'cairn-domain-site', vars: { PUBLIC_ORIGIN: 'https://cairn-domain-site.glw907.workers.dev' } },
  null,
  2,
);

const WORKERS_DEV_URL = 'https://cairn-domain-site.glw907.workers.dev';

/**
 * Point CAIRN_STATE_DIR at a fresh temporary directory for the duration of one test.
 * @param {import('node:test').TestContext} t
 * @returns {Promise<string>} the state directory's absolute path
 */
async function freshStateDir(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-chapter2-state-'));
  process.env.CAIRN_STATE_DIR = dir;
  t.after(() => {
    delete process.env.CAIRN_STATE_DIR;
    return rm(dir, { recursive: true, force: true });
  });
  return dir;
}

/**
 * Build a fixture scaffold directory carrying a real wrangler.jsonc so writePublicOrigin (the
 * cutover's own step) has something to rewrite.
 * @param {import('node:test').TestContext} t
 * @returns {Promise<string>} the fixture directory's absolute path
 */
async function fixtureScaffoldDir(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-chapter2-scaffold-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await writeFile(path.join(dir, 'wrangler.jsonc'), MINIMAL_WRANGLER_JSONC);
  return dir;
}

/**
 * Start a fake Cloudflare and point CAIRN_CLOUDFLARE_API_BASE at it, the sibling modules' own setup.
 * @param {import('node:test').TestContext} t
 * @param {{ zoneStatus?: string }} [overrides]
 * @returns {Promise<import('../../test/fake-cloudflare.mjs').FakeCloudflare>}
 */
async function setupCloudflare(t, overrides = {}) {
  const cloudflare = await startFakeCloudflare(overrides);
  t.after(() => cloudflare.close());
  process.env.CAIRN_CLOUDFLARE_API_BASE = cloudflare.apiBase;
  t.after(() => {
    delete process.env.CAIRN_CLOUDFLARE_API_BASE;
  });
  return cloudflare;
}

/**
 * Point CAIRN_WRANGLER_BIN at a fresh fake wrangler, armed for whoami (single account) and deploy.
 * @param {import('node:test').TestContext} t
 * @param {{ deployReply?: object }} [options]
 * @returns {Promise<import('../../test/fake-bin.mjs').FakeBin>}
 */
async function setupWrangler(t, { deployReply = { code: 0, stdout: `Deployed (0.1 sec)\n  ${WORKERS_DEV_URL}\n` } } = {}) {
  const fake = await makeFakeBin('chapter2-wrangler');
  t.after(() => fake.close());
  await fake.respond('whoami', {
    code: 0,
    stdout: 'You are logged in with an API Token, associated with the email test@example.com\n',
  });
  await fake.respond('whoami --json', {
    code: 0,
    stdout: JSON.stringify({ loggedIn: true, accounts: [{ id: 'acct-1', name: 'Test Account' }] }),
  });
  await fake.respond('deploy', deployReply);
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => {
    delete process.env.CAIRN_WRANGLER_BIN;
  });
  return fake;
}

/** A Response matching the site-specific marker pair exactly, for both `/` and `/admin`. */
function markerResponse(pathname, origin) {
  if (pathname === '/') return new Response(null, { status: 200 });
  if (pathname === '/admin') {
    return new Response(null, { status: 303, headers: { location: `${origin}/admin/login` } });
  }
  return new Response(null, { status: 404 });
}

/** A fetchImpl that answers the marker pair correctly for both http and https, on any origin. */
function alwaysMatchingFetch() {
  return async (url) => {
    const u = new URL(url);
    return markerResponse(u.pathname, u.origin);
  };
}

/** A confirm stub that gives every gate in a run the same answer. */
function confirmAnswering(answer) {
  return async () => answer;
}

/** A confirm/text stub that fails the test the moment it is called, for an unattended path. */
function mustNotBeCalled(label) {
  return async () => {
    throw new Error(`${label} must not be called on this path`);
  };
}

/**
 * Seed a state record shaped like a site that just finished chapter 1 (T3's own fields), the
 * state every chapter2 test starts from unless a test seeds further along.
 * @param {string} siteId
 * @param {string} dir
 * @param {object} [overrides]
 * @returns {Promise<void>}
 */
async function seedLiveSite(siteId, dir, overrides = {}) {
  await saveSite(siteId, {
    name: 'Domain Test Site',
    dir,
    step: 'live',
    ownerEmail: 'owner@example.com',
    github: { appId: 42, appSlug: 'cairn-domain-test', owner: 'domain-test-owner', installationId: 7 },
    cloudflare: { url: WORKERS_DEV_URL, workerName: 'cairn-domain-site', accountId: 'acct-1' },
    ...overrides,
  });
}

// --- Admission ----------------------------------------------------------------------------

test('admission: interactive consent proceeds to ask for and save the domain', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t, { zoneStatus: 'active' });
  await setupWrangler(t);
  await seedLiveSite('site-consent', dir);

  const { runChapter2 } = await import('./chapter2.mjs');
  const outcome = await runChapter2({
    siteId: 'site-consent',
    record: await loadSite('site-consent'),
    dir,
    args: { yes: false },
    log: () => {},
    dryRun: false,
    confirm: confirmAnswering(true),
    text: async () => 'consented-domain.example',
    promptSecretFn: async () => 'pasted-token-value',
    fetchImpl: alwaysMatchingFetch(),
  });

  assert.equal(outcome.outcome, 'domain-live');
  assert.equal(outcome.domain, 'consented-domain.example');

  const state = await loadSite('site-consent');
  assert.equal(state.step, 'domain-live');
  assert.equal(state.cloudflare.domain, 'consented-domain.example');

  const zoneCreates = cloudflare.requests.filter((r) => r.method === 'POST' && r.path === '/client/v4/zones');
  assert.equal(zoneCreates.length, 1);
});

test('admission: --yes without --domain skips with a hint, and chapter 1\'s site stays intact', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  await seedLiveSite('site-skip-hint', dir);

  const { runChapter2 } = await import('./chapter2.mjs');
  const logs = [];
  const outcome = await runChapter2({
    siteId: 'site-skip-hint',
    record: await loadSite('site-skip-hint'),
    dir,
    args: { yes: true },
    log: (line) => logs.push(line),
    dryRun: false,
    confirm: mustNotBeCalled('confirm'),
    text: mustNotBeCalled('text'),
  });

  assert.equal(outcome.outcome, 'admission-declined');
  assert.ok(logs.some((line) => line.includes('Skipping the domain chapter')));

  const state = await loadSite('site-skip-hint');
  assert.equal(state.step, 'live');
  assert.equal(state.github.appId, 42, "chapter 1's site must stay untouched");
  assert.equal(state.cloudflare.url, WORKERS_DEV_URL);
});

/**
 * A DNS stub method that answers absence, the shape a real "no such record" takes. `probe` in
 * records.mjs reads only the error's `code`, so the two absence codes are what a caller picks
 * between.
 * @param {string} [code] the `node:dns` error code to report absence with
 * @returns {() => Promise<never>} the stub method
 */
function absentAnswer(code = 'ENODATA') {
  return async () => {
    throw Object.assign(new Error('absent'), { code });
  };
}

/**
 * A resolver factory whose authoritative path SUCCEEDS, so readCurrentRecords reports
 * `lowConfidence: false`. The recursive call answers the domain's nameservers and resolves one of
 * them to an address; the authoritative call answers absence for every probe, so the carry-over
 * list is legitimately empty rather than unreadable. Without this, a test falls back to the
 * recursive path and an unattended run refuses to copy, which is the correct production behavior
 * and the wrong thing to be exercising here.
 * @param {string} domain the domain under test
 * @returns {() => object} the factory `runChapter2` passes through as `resolve`
 */
function authoritativeResolve(domain) {
  const registrarNs = 'ns1.registrar.example';
  return (servers) => {
    const authoritative = Array.isArray(servers) && servers.length > 0;
    return {
      resolveNs: async (name) => {
        if (!authoritative && name === domain) return [registrarNs];
        throw Object.assign(new Error('absent'), { code: 'ENODATA' });
      },
      resolve4: async (name) => {
        if (!authoritative && name === registrarNs) return ['192.0.2.53'];
        throw Object.assign(new Error('absent'), { code: 'ENODATA' });
      },
      resolve6: absentAnswer(),
      resolveMx: absentAnswer(),
      resolveTxt: absentAnswer(),
      resolveCaa: absentAnswer(),
      resolveCname: absentAnswer(),
    };
  };
}

test('admission: --yes --domain proceeds fully unattended, with no prompt ever called', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  await setupCloudflare(t, { zoneStatus: 'active' });
  await setupWrangler(t);
  await seedLiveSite('site-unattended', dir);

  const { runChapter2 } = await import('./chapter2.mjs');
  const outcome = await runChapter2({
    siteId: 'site-unattended',
    record: await loadSite('site-unattended'),
    dir,
    args: { yes: true, domain: 'unattended-domain.example' },
    log: () => {},
    dryRun: false,
    confirm: mustNotBeCalled('confirm'),
    text: mustNotBeCalled('text'),
    env: { CAIRN_CF_API_TOKEN: 'env-token-value' },
    argv: [],
    resolve: authoritativeResolve('unattended-domain.example'),
    fetchImpl: alwaysMatchingFetch(),
  });

  assert.equal(outcome.outcome, 'domain-live');
  assert.equal(outcome.domain, 'unattended-domain.example');

  const state = await loadSite('site-unattended');
  assert.equal(state.step, 'domain-live');
});

// The refusal this pins is the whole reason readCurrentRecords carries a confidence flag. A
// recursive resolver can answer "no such record" from a cache that has not expired, so an
// unattended run that auto-copied a low-confidence list would write a set quietly missing the
// admin's MX rows, advance the step, and report success while their mail stopped after the
// switchover. Nobody would be watching.
test('unattended: a low-confidence record read refuses to copy rather than carrying a partial set', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const { cloudflare } = await seedZoneCreatedSite(t, 'site-lowconf', dir);
  await setupWrangler(t);

  const seededRecord = await loadSite('site-lowconf');
  const { runChapter2 } = await import('./chapter2.mjs');
  await assert.rejects(
    () =>
      runChapter2({
        siteId: 'site-lowconf',
        record: seededRecord,
        dir,
        args: { yes: true, domain: 'resume-test.example' },
        log: () => {},
        dryRun: false,
        confirm: mustNotBeCalled('confirm'),
        text: mustNotBeCalled('text'),
        // No authoritative nameserver answers, so the read falls back and flags low confidence.
        resolve: () => ({
          resolveNs: absentAnswer(),
          resolve4: absentAnswer(),
          resolve6: absentAnswer(),
          resolveMx: absentAnswer(),
          resolveTxt: absentAnswer(),
          resolveCaa: absentAnswer(),
          resolveCname: absentAnswer(),
        }),
        fetchImpl: alwaysMatchingFetch(),
      }),
    (err) => {
      // Asserted on the message, not err.catalogue.code: runActions re-wraps a thrown error with
      // its action label and does not carry the catalogue property across, so the row's own
      // metadata is not readable here. The admin-visible text is what survives, and it is what
      // this refusal is for.
      assert.match(err.message, /could not be read reliably/);
      assert.match(err.message, /without --yes/);
      return true;
    },
  );

  const dnsWrites = cloudflare.requests.filter(
    (r) => r.method === 'POST' && r.path.includes('/dns_records'),
  );
  assert.equal(dnsWrites.length, 0, 'a refused carry-over must write no records at all');

  const state = await loadSite('site-lowconf');
  assert.equal(state.step, 'zone-created', 'the step must not advance past a refused carry-over');
});

test('admission: declining parks cleanly, with chapter 1\'s site intact', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  await seedLiveSite('site-declined', dir);

  const { runChapter2 } = await import('./chapter2.mjs');
  const outcome = await runChapter2({
    siteId: 'site-declined',
    record: await loadSite('site-declined'),
    dir,
    args: { yes: false },
    log: () => {},
    dryRun: false,
    confirm: confirmAnswering(false),
    text: mustNotBeCalled('text'),
  });

  assert.equal(outcome.outcome, 'admission-declined');

  const state = await loadSite('site-declined');
  assert.equal(state.step, 'live');
  assert.equal(state.github.appId, 42);
  assert.equal(state.cloudflare.url, WORKERS_DEV_URL);
  assert.equal('domain' in state.cloudflare, false);
});

// --- Hop order and resume ------------------------------------------------------------------

/**
 * Seed a record at 'zone-created': create a real zone on the fake, re-read it for its assigned
 * nameservers (mirroring what ensureZone itself does), and save the whole cloudflare shape a
 * fresh chapter2 run would have written.
 * @param {import('node:test').TestContext} t
 * @param {string} siteId
 * @param {string} dir
 * @param {{ zoneStatus?: string }} [fakeOverrides]
 * @returns {Promise<{ cloudflare: object, zoneId: string, nameServers: string[], domain: string }>}
 *  the started fake alongside the zone the seeded record points at
 */
async function seedZoneCreatedSite(t, siteId, dir, fakeOverrides = {}) {
  const cloudflare = await setupCloudflare(t, fakeOverrides);
  const api = makeApi({ token: 'fake-token', accountId: 'acct-1', dir });
  const domain = 'resume-test.example';
  const created = await api.createZone(domain);
  const zone = await api.getZone(created.id);
  await seedLiveSite(siteId, dir, {
    step: 'zone-created',
    cloudflare: {
      url: WORKERS_DEV_URL,
      workerName: 'cairn-domain-site',
      accountId: 'acct-1',
      apiToken: 'fake-token',
      domain,
      zoneId: zone.id,
      nameServers: zone.name_servers,
      alreadyActive: zone.status === 'active',
    },
  });
  return { cloudflare, zoneId: zone.id, nameServers: zone.name_servers, domain };
}

test('resume: a record at zone-created advances into the records gate without recreating the zone', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const { cloudflare } = await seedZoneCreatedSite(t, 'site-resume-zc', dir);
  await setupWrangler(t);

  const requestsBefore = cloudflare.requests.length;

  const { runChapter2 } = await import('./chapter2.mjs');
  const outcome = await runChapter2({
    siteId: 'site-resume-zc',
    record: await loadSite('site-resume-zc'),
    dir,
    args: { yes: false },
    log: () => {},
    dryRun: false,
    confirm: confirmAnswering(true),
    text: mustNotBeCalled('text'),
    resolve: () => ({
      resolveNs: async () => [],
      resolve4: absentAnswer('ENOTFOUND'),
      resolve6: absentAnswer('ENOTFOUND'),
      resolveMx: absentAnswer(),
      resolveTxt: absentAnswer(),
      resolveCaa: absentAnswer(),
      resolveCname: absentAnswer(),
    }),
  });

  // The delegation state is still 'pending' (no matching NS answered), so this run parks there;
  // the load-bearing assertion is that it got that far without a second zone_create call.
  assert.equal(outcome.outcome, 'delegation-pending');

  const zoneCreatesAfter = cloudflare.requests
    .slice(requestsBefore)
    .filter((r) => r.method === 'POST' && r.path === '/client/v4/zones');
  assert.equal(zoneCreatesAfter.length, 0, 'ensureZone must not run again on a resumed record');

  const state = await loadSite('site-resume-zc');
  assert.equal(state.step, 'records-carried');
});

test('resume: a record at records-carried never re-reads records', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t, { zoneStatus: 'active' });
  await setupWrangler(t);
  const api = makeApi({ token: 'fake-token', accountId: 'acct-1', dir });
  const domain = 'records-carried-test.example';
  const created = await api.createZone(domain);
  const zone = await api.getZone(created.id);
  await seedLiveSite('site-resume-rc', dir, {
    step: 'records-carried',
    cloudflare: {
      url: WORKERS_DEV_URL,
      workerName: 'cairn-domain-site',
      accountId: 'acct-1',
      apiToken: 'fake-token',
      domain,
      zoneId: zone.id,
      nameServers: zone.name_servers,
      alreadyActive: true,
      carryOver: { outcome: 'carried', at: new Date().toISOString(), count: 0, types: [] },
    },
  });

  const { runChapter2 } = await import('./chapter2.mjs');
  const outcome = await runChapter2({
    siteId: 'site-resume-rc',
    record: await loadSite('site-resume-rc'),
    dir,
    args: { yes: false },
    log: () => {},
    dryRun: false,
    confirm: confirmAnswering(true),
    text: mustNotBeCalled('text'),
    resolve: () => {
      throw new Error('readCurrentRecords must not run again once records-carried is reached');
    },
    fetchImpl: alwaysMatchingFetch(),
  });

  // alreadyActive short-circuits checkDelegation to 'active' with no NS lookup, so this reaches
  // the cutover and finishes; the load-bearing proof is that `resolve` above was never called.
  assert.equal(outcome.outcome, 'domain-live');

  const dnsCreatesAfterSeed = cloudflare.requests.filter(
    (r) => r.method === 'POST' && r.path.includes('/dns_records'),
  );
  assert.equal(dnsCreatesAfterSeed.length, 0, 'no record was ever written into this zone by this run');
});

test('resume: a record at delegated skips straight to the cutover', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t, { zoneStatus: 'active' });
  await setupWrangler(t);
  const api = makeApi({ token: 'fake-token', accountId: 'acct-1', dir });
  const domain = 'delegated-test.example';
  const created = await api.createZone(domain);
  const zone = await api.getZone(created.id);
  await seedLiveSite('site-resume-delegated', dir, {
    step: 'delegated',
    cloudflare: {
      url: WORKERS_DEV_URL,
      workerName: 'cairn-domain-site',
      accountId: 'acct-1',
      apiToken: 'fake-token',
      domain,
      zoneId: zone.id,
      nameServers: zone.name_servers,
      alreadyActive: true,
      carryOver: { outcome: 'carried', at: new Date().toISOString(), count: 0, types: [] },
    },
  });

  const { runChapter2 } = await import('./chapter2.mjs');
  const outcome = await runChapter2({
    siteId: 'site-resume-delegated',
    record: await loadSite('site-resume-delegated'),
    dir,
    args: { yes: false },
    log: () => {},
    dryRun: false,
    confirm: mustNotBeCalled('confirm'),
    text: mustNotBeCalled('text'),
    fetchImpl: alwaysMatchingFetch(),
  });

  assert.equal(outcome.outcome, 'domain-live');
  const attachRequests = cloudflare.requests.filter((r) => r.path.includes('/workers/domains') && r.method === 'PUT');
  assert.equal(attachRequests.length, 1);
});

test('resume: a declined carry-over gate never silently advances', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  await seedZoneCreatedSite(t, 'site-declined-gate', dir);
  await setupWrangler(t);

  const { runChapter2 } = await import('./chapter2.mjs');
  const outcome = await runChapter2({
    siteId: 'site-declined-gate',
    record: await loadSite('site-declined-gate'),
    dir,
    args: { yes: false },
    log: () => {},
    dryRun: false,
    confirm: confirmAnswering(false),
    text: mustNotBeCalled('text'),
  });

  assert.equal(outcome.outcome, 'carry-over-declined');

  const state = await loadSite('site-declined-gate');
  assert.equal(state.step, 'zone-created', 'a declined gate must not advance the step');
  assert.equal('carryOver' in state.cloudflare, false);
});

// --- --dry-run ------------------------------------------------------------------------------

test('--dry-run prints every hop, with zero shell-outs and zero fake-API requests', async (t) => {
  await freshStateDir(t);
  const cloudflare = await setupCloudflare(t);
  const wrangler = await setupWrangler(t);

  const { runChapter2 } = await import('./chapter2.mjs');
  const logs = [];
  const outcome = await runChapter2({
    siteId: 'site-dry-run',
    record: null,
    dir: '/tmp/dry-run-does-not-exist',
    args: { yes: false },
    log: (line) => logs.push(line),
    dryRun: true,
    confirm: mustNotBeCalled('confirm'),
    text: mustNotBeCalled('text'),
    promptSecretFn: mustNotBeCalled('promptSecretFn'),
  });

  assert.equal(outcome.outcome, 'dry-run');

  const titles = [
    'Connect your own domain',
    'Find your Cloudflare account',
    'Get a Cloudflare API token',
    'Create your Cloudflare zone',
    'Copy your current DNS records',
    'Wait for your domain to switch to Cloudflare',
    'Connect your domain to your site',
    'Finish connecting your domain',
  ];
  for (const title of titles) {
    assert.ok(logs.includes(title), `missing dry-run title: ${title}`);
  }

  assert.equal(cloudflare.requests.length, 0, 'a dry run must make no Cloudflare API request');
  assert.deepEqual(await wrangler.invocations(), [], 'a dry run must shell out to nothing');
});

// --- Completion -------------------------------------------------------------------------------

test('completion: domain-live is not terminal, so the token survives it on disk', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  await setupCloudflare(t, { zoneStatus: 'active' });
  await setupWrangler(t);
  await seedLiveSite('site-completion', dir);

  const { runChapter2 } = await import('./chapter2.mjs');
  const logs = [];
  const outcome = await runChapter2({
    siteId: 'site-completion',
    record: await loadSite('site-completion'),
    dir,
    args: { yes: false },
    log: (line) => logs.push(line),
    dryRun: false,
    confirm: confirmAnswering(true),
    text: async () => 'complete-me.example',
    promptSecretFn: async () => 'complete-me-token',
    fetchImpl: alwaysMatchingFetch(),
  });

  assert.equal(outcome.outcome, 'domain-live');

  const state = await loadSite('site-completion');
  assert.equal(state.step, 'domain-live');
  assert.equal(typeof state.cloudflare.apiToken, 'string');
  assert.ok(state.cloudflare.apiToken.length > 0, 'the pasted token must survive domain-live');

  assert.ok(logs.some((line) => line.includes('complete-me.example') && line.includes('/admin')));
});

test('completion: a synthesized terminal state deletes the token, on both re-read and raw bytes', async (t) => {
  await freshStateDir(t);
  const stateDir = process.env.CAIRN_STATE_DIR;
  const dir = await fixtureScaffoldDir(t);

  const { runChapter2, TERMINAL_STEPS } = await import('./chapter2.mjs');
  assert.ok(TERMINAL_STEPS.length > 0);
  const terminalStep = TERMINAL_STEPS[0];

  const plantedToken = 'planted-terminal-secret-8f2a91c0';
  await seedLiveSite('site-terminal', dir, {
    step: terminalStep,
    cloudflare: {
      url: WORKERS_DEV_URL,
      workerName: 'cairn-domain-site',
      accountId: 'acct-1',
      apiToken: plantedToken,
      domain: 'terminal-test.example',
    },
  });

  const outcome = await runChapter2({
    siteId: 'site-terminal',
    record: await loadSite('site-terminal'),
    dir,
    args: { yes: true },
    log: () => {},
    dryRun: false,
    confirm: mustNotBeCalled('confirm'),
    text: mustNotBeCalled('text'),
  });

  assert.equal(outcome.outcome, terminalStep);

  const state = await loadSite('site-terminal');
  assert.equal('apiToken' in state.cloudflare, false, 'the token must be gone from the re-read record');
  assert.equal(state.cloudflare.domain, 'terminal-test.example', 'sibling fields must survive the scrub');

  const rawFile = await readFile(path.join(stateDir, 'site-terminal.json'), 'utf8');
  assert.doesNotMatch(rawFile, new RegExp(plantedToken), 'the raw bytes must not carry the token either');

  const mode = (await stat(path.join(stateDir, 'site-terminal.json'))).mode & 0o777;
  assert.equal(mode, 0o600);

  // Falsifiable: the same regex against a haystack that DOES carry the planted token must match,
  // proving the assertion above is not vacuous.
  assert.match(`${rawFile}\n${plantedToken}`, new RegExp(plantedToken));
});

test('completion: re-entry at domain-live re-runs ensureApiToken', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t);
  await seedLiveSite('site-reentry', dir, {
    step: 'domain-live',
    cloudflare: {
      url: WORKERS_DEV_URL,
      workerName: 'cairn-domain-site',
      accountId: 'acct-1',
      apiToken: 'still-good-token',
      domain: 'reentry-test.example',
    },
  });

  const requestsBefore = cloudflare.requests.length;

  const { runChapter2 } = await import('./chapter2.mjs');
  const outcome = await runChapter2({
    siteId: 'site-reentry',
    record: await loadSite('site-reentry'),
    dir,
    args: { yes: false },
    log: () => {},
    dryRun: false,
    confirm: mustNotBeCalled('confirm'),
    text: mustNotBeCalled('text'),
    promptSecretFn: mustNotBeCalled('promptSecretFn'),
  });

  assert.equal(outcome.outcome, 'domain-live');
  assert.equal(outcome.domain, 'reentry-test.example');

  const zoneListCalls = cloudflare.requests
    .slice(requestsBefore)
    .filter((r) => r.method === 'GET' && r.path.startsWith('/client/v4/zones'));
  assert.equal(zoneListCalls.length, 1, 'ensureApiToken must have validated the saved token again');
});
