import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { makeFakeBin } from '../../test/fake-bin.mjs';
import { startFakeCloudflare } from '../../test/fake-cloudflare.mjs';
import { makeApi, SENDING_DISABLED_CODE } from './api.mjs';
import { saveSite, loadSite } from '../state.mjs';
import { createWaitForClear, consoleUrlLine } from '../hold-loop.mjs';

/** A minimal wrangler.jsonc fixture carrying the one key writePublicOrigin needs. */
const MINIMAL_WRANGLER_JSONC = JSON.stringify(
  { name: 'cairn-domain-site', vars: { PUBLIC_ORIGIN: 'https://cairn-domain-site.glw907.workers.dev' } },
  null,
  2,
);

/**
 * A minimal cairn.config.ts fixture carrying the one `email: { from: '...' }` entry
 * writeEmailFrom targets, shaped exactly like the real template's placeholder so the pattern
 * match (and its re-parse) exercise the real production shape rather than a stand-in.
 */
const MINIMAL_CAIRN_CONFIG_TS = "export default {\n  email: { from: 'cms@showcase.test' },\n};\n";

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
 * Build a fixture scaffold directory carrying a real wrangler.jsonc (for writePublicOrigin, the
 * cutover's own step) and a real src/theme/cairn.config.ts (for writeEmailFrom, the email half's
 * own rewrite step).
 * @param {import('node:test').TestContext} t
 * @returns {Promise<string>} the fixture directory's absolute path
 */
async function fixtureScaffoldDir(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-chapter2-scaffold-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await writeFile(path.join(dir, 'wrangler.jsonc'), MINIMAL_WRANGLER_JSONC);
  await mkdir(path.join(dir, 'src', 'theme'), { recursive: true });
  await writeFile(path.join(dir, 'src', 'theme', 'cairn.config.ts'), MINIMAL_CAIRN_CONFIG_TS);
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
 * Point CAIRN_WRANGLER_BIN at a fresh fake wrangler, armed for whoami (single account) and
 * deploy, and point CAIRN_NPM_BIN at the SAME fake, armed for `npm run build`: sharing one fake
 * bin across both tools is what lets a test read one invocation log and see the real
 * build-then-deploy order the email half's rewrite hop produces.
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
  await fake.respond('run build', { code: 0, stdout: 'built.\n' });
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  process.env.CAIRN_NPM_BIN = fake.binPath;
  t.after(() => {
    delete process.env.CAIRN_WRANGLER_BIN;
    delete process.env.CAIRN_NPM_BIN;
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

/** A fetchImpl that fails at the transport level on every confirm; the no-hold park's own probe. */
function alwaysUnreachableFetch() {
  return async () => {
    throw new TypeError('fetch failed', { cause: { code: 'ENOTFOUND' } });
  };
}

/**
 * A fetchImpl that fails at the transport level for the first `rounds` confirms, then answers the
 * marker pair correctly. Mirrors hostname.test.mjs's own `unreachableForRounds`: a confirm is
 * counted by its first request, the https probe of `/`.
 * @param {number} rounds how many confirms fail before the marker pair starts answering
 * @returns {{ fetchImpl: typeof fetch, state: { rounds: number } }}
 */
function unreachableForRounds(rounds) {
  const state = { rounds: 0 };
  const fetchImpl = async (url) => {
    const u = new URL(url);
    if (u.pathname === '/' && u.protocol === 'https:') state.rounds += 1;
    if (state.rounds <= rounds) throw new TypeError('fetch failed', { cause: { code: 'ENOTFOUND' } });
    return markerResponse(u.pathname, u.origin);
  };
  return { fetchImpl, state };
}

/** A console server handle recording what the hold loop does with it, the same stand-in
 * hostname.test.mjs's own `fakeConsole` uses for the seam's own tests. */
const HOLD_CONSOLE_URL = 'http://127.0.0.1:49152/Zm9vYmFyLXNlY3JldA';
function fakeConsole() {
  const calls = { start: [], update: [], stop: 0 };
  return {
    calls,
    handle: {
      async start(observation) {
        calls.start.push(observation);
        return { url: HOLD_CONSOLE_URL };
      },
      update(observation) {
        calls.update.push(observation);
      },
      async stop() {
        calls.stop += 1;
      },
    },
  };
}

/**
 * Build a `createWaitForClearFn` test seam wrapping the real `createWaitForClear`, over a virtual
 * clock so a multi-poll hold resolves at once instead of waiting real time. Records how many holds
 * were composed, so a test can assert the seam is built exactly once.
 * @param {{ calls: string[] }} recorder pushed one entry (the hold class) per composition
 * @returns {typeof createWaitForClear} the test seam
 */
function testCreateWaitForClearFn(recorder) {
  return ({ holdClass, server, log, persist }) => {
    recorder.calls.push(holdClass);
    let clock = 0;
    return createWaitForClear({
      holdClass,
      server,
      log,
      persist,
      now: () => clock,
      sleepFn: async (ms) => {
        clock += ms;
      },
      signals: new EventEmitter(),
    });
  };
}

/**
 * An openBrowser stand-in for a path that would otherwise reach the real platform opener. Every
 * runChapter2 call here passes it: the seam defaults to the real opener, so a call that omits it
 * launches a tab at whoever is running the suite. test/no-desktop.mjs is the net underneath, but
 * the seam is the fix.
 * @returns {Promise<void>}
 */
function neverOpensBrowser() {
  return Promise.resolve();
}

/** A confirm stub that gives every gate in a run the same answer. */
function confirmAnswering(answer) {
  return async () => answer;
}

/**
 * A confirm stub that answers chapter 2's two yes/no gates differently, matched by a distinctive
 * substring of each gate's own message. Omitting a gate's answer means the record under test has
 * already passed it (or must never reach it): a call for that gate is then a defect, not just an
 * unexpected answer, so it throws rather than silently returning. A message matching neither gate
 * also throws, so a test can never pass by answering some THIRD gate the wrong way.
 * @param {{ domain?: boolean, email?: boolean }} [answers] the answer for the domain-connect gate
 *  and the email-admission gate; omit a key to assert its gate is never asked at all
 * @returns {(input: { message: string }) => Promise<boolean>}
 */
function confirmRouting({ domain, email } = {}) {
  return async ({ message }) => {
    if (message.includes('Connect a domain')) {
      if (domain === undefined) throw new Error('the domain gate must not be asked on this record');
      return domain;
    }
    if (message.includes('Workers Paid')) {
      if (email === undefined) throw new Error('the email gate must not be asked on this record');
      return email;
    }
    throw new Error(`confirmRouting: unrecognized confirm message: ${message}`);
  };
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

/**
 * Seed a record at 'domain-live', the email half's own starting point: a real zone on the fake
 * (so the email routes below have a real zoneId to key off) and the whole cloudflare shape a
 * domain half that just finished would have written.
 * @param {import('node:test').TestContext} t
 * @param {string} siteId
 * @param {string} dir
 * @param {{ domain?: string, apiToken?: string } & Record<string, unknown>} [options] `domain`
 *  and `apiToken` default to fixture values; any other key overrides the seeded cloudflare shape
 * @returns {Promise<{ cloudflare: import('../../test/fake-cloudflare.mjs').FakeCloudflare,
 *  zoneId: string, domain: string }>}
 */
async function seedDomainLiveSite(
  t,
  siteId,
  dir,
  { domain = 'email-half-test.example', apiToken = 'fake-token', ...cloudflareOverrides } = {},
) {
  const cloudflare = await setupCloudflare(t, { zoneStatus: 'active' });
  const api = makeApi({ token: apiToken, accountId: 'acct-1', dir });
  const created = await api.createZone(domain);
  const zone = await api.getZone(created.id);
  await seedLiveSite(siteId, dir, {
    step: 'domain-live',
    cloudflare: {
      url: WORKERS_DEV_URL,
      workerName: 'cairn-domain-site',
      accountId: 'acct-1',
      apiToken,
      domain,
      zoneId: zone.id,
      nameServers: zone.name_servers,
      alreadyActive: true,
      ...cloudflareOverrides,
    },
  });
  return { cloudflare, zoneId: zone.id, domain };
}

/** A `failNext('email_send', ...)` body for the propagation refusal (spike amendment 1/2). */
function sendingDisabledBody() {
  return {
    success: false,
    errors: [{ code: SENDING_DISABLED_CODE, message: 'email.sending.error.email.sending_disabled' }],
    messages: [],
    result: null,
  };
}

/** A `failNext('email_send', ...)` body for a daily-limit refusal (a derived fixture, per email.test.mjs). */
function dailyLimitBody() {
  return {
    success: false,
    errors: [{ code: 9999, message: 'email.sending.error.email.sending_daily_limit_exceeded' }],
    messages: [],
    result: null,
  };
}

/** The v4 403 envelope with no extractable permission, matching api.test.mjs's own fixture. */
const GENERIC_SCOPE_MISSING_BODY = {
  success: false,
  errors: [{ code: 9109, message: 'Unauthorized to access requested resource' }],
  messages: [],
  result: null,
};

/** The v4 400 envelope api.mjs maps onto token-invalid, matching api.test.mjs's own fixture. */
const TOKEN_INVALID_BODY = {
  success: false,
  errors: [
    {
      code: 6003,
      message: 'Invalid request headers',
      error_chain: [{ code: 6111, message: 'Invalid format for Authorization header' }],
    },
  ],
  messages: [],
  result: null,
};

// --- Admission ----------------------------------------------------------------------------

// The domain gate is answered yes; the email gate (the only other confirm this run reaches) is
// declined, so this test stays focused on the domain admission without needing the email fake
// routes or fixture at all.
test('admission: interactive consent proceeds to ask for and save the domain', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t, { zoneStatus: 'active' });
  await setupWrangler(t);
  await seedLiveSite('site-consent', dir);

  const { runChapter2 } = await import('./chapter2.mjs');
  const outcome = await runChapter2({
    openBrowser: neverOpensBrowser,
    siteId: 'site-consent',
    record: await loadSite('site-consent'),
    dir,
    args: { yes: false },
    log: () => {},
    dryRun: false,
    confirm: confirmRouting({ domain: true, email: false }),
    text: async () => 'consented-domain.example',
    promptSecretFn: async () => 'pasted-token-value',
    fetchImpl: alwaysMatchingFetch(),
  });

  assert.equal(outcome.outcome, 'paid-plan-declined');

  const state = await loadSite('site-consent');
  assert.equal(state.step, 'paid-plan-declined');
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
    openBrowser: neverOpensBrowser,
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

// --yes with no --email declines the email half unattended (never committing an owner to a
// subscription without asking), so this run is fully unattended end to end and lands on
// paid-plan-declined rather than domain-live.
test('admission: --yes --domain proceeds fully unattended, with no prompt ever called', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  await setupCloudflare(t, { zoneStatus: 'active' });
  await setupWrangler(t);
  await seedLiveSite('site-unattended', dir);

  const { runChapter2 } = await import('./chapter2.mjs');
  const outcome = await runChapter2({
    openBrowser: neverOpensBrowser,
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

  assert.equal(outcome.outcome, 'paid-plan-declined');

  const state = await loadSite('site-unattended');
  assert.equal(state.step, 'paid-plan-declined');
  assert.equal(state.cloudflare.domain, 'unattended-domain.example');
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
    openBrowser: neverOpensBrowser,
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
    openBrowser: neverOpensBrowser,
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
    openBrowser: neverOpensBrowser,
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
    openBrowser: neverOpensBrowser,
    siteId: 'site-resume-rc',
    record: await loadSite('site-resume-rc'),
    dir,
    args: { yes: false },
    log: () => {},
    dryRun: false,
    // The domain gate is already behind this record; the only confirm this run reaches is the
    // email admission, declined here so this test stays about the DNS-record claim it names.
    confirm: confirmAnswering(false),
    text: mustNotBeCalled('text'),
    resolve: () => {
      throw new Error('readCurrentRecords must not run again once records-carried is reached');
    },
    fetchImpl: alwaysMatchingFetch(),
  });

  // alreadyActive short-circuits checkDelegation to 'active' with no NS lookup, so this reaches
  // the cutover and finishes, then declines email; the load-bearing proof is that `resolve`
  // above was never called.
  assert.equal(outcome.outcome, 'paid-plan-declined');

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
    openBrowser: neverOpensBrowser,
    siteId: 'site-resume-delegated',
    record: await loadSite('site-resume-delegated'),
    dir,
    args: { yes: false },
    log: () => {},
    dryRun: false,
    // The domain gate is already behind this record; the only confirm this run reaches is the
    // email admission, declined so this test stays about the cutover's own attach count.
    confirm: confirmRouting({ email: false }),
    text: mustNotBeCalled('text'),
    fetchImpl: alwaysMatchingFetch(),
  });

  assert.equal(outcome.outcome, 'paid-plan-declined');
  const attachRequests = cloudflare.requests.filter((r) => r.path.includes('/workers/domains') && r.method === 'PUT');
  assert.equal(attachRequests.length, 1);
});

// --- The production hold seam (T4d Task 5c) ----------------------------------------------------

/** Seed a record at `delegated`, the cutover's own starting point, on a real fake-Cloudflare zone. */
async function seedDelegatedSite(siteId, dir, domain) {
  const api = makeApi({ token: 'fake-token', accountId: 'acct-1', dir });
  const created = await api.createZone(domain);
  const zone = await api.getZone(created.id);
  await seedLiveSite(siteId, dir, {
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
  return zone;
}

test('an interactive run threads waitForClear into cutOverHostname: the console URL and the hop title each print exactly once across a three-poll hold', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  await setupCloudflare(t, { zoneStatus: 'active' });
  await setupWrangler(t);
  const domain = 'held-cutover.example';
  await seedDelegatedSite('site-held-cutover', dir, domain);

  const { fetchImpl, state } = unreachableForRounds(2);
  const consoleServer = fakeConsole();
  const holdRecorder = { calls: [] };
  const lines = [];

  const { runChapter2 } = await import('./chapter2.mjs');
  const outcome = await runChapter2({
    openBrowser: neverOpensBrowser,
    siteId: 'site-held-cutover',
    record: await loadSite('site-held-cutover'),
    dir,
    args: { yes: false },
    log: (line) => lines.push(line),
    dryRun: false,
    // The domain gate is already behind this record; the only confirm this run reaches after the
    // held cutover clears is the email admission, declined so this test stays about the hold.
    confirm: confirmRouting({ email: false }),
    text: mustNotBeCalled('text'),
    fetchImpl,
    // The held probes now run the cutover's own DNS diagnosis for real; a hermetic
    // authoritative-absent stub keeps this test about the hold's own print/count contract rather
    // than a real lookup for a fictional domain.
    resolve: () => ({
      resolveNs: absentAnswer(),
      resolve4: absentAnswer(),
      resolve6: absentAnswer(),
      resolveMx: absentAnswer(),
      resolveTxt: absentAnswer(),
      resolveCaa: absentAnswer(),
      resolveCname: absentAnswer(),
    }),
    isTTY: true,
    env: {},
    createWaitForClearFn: testCreateWaitForClearFn(holdRecorder),
    createConsoleServerFn: () => consoleServer.handle,
  });

  assert.equal(outcome.outcome, 'paid-plan-declined');
  assert.equal(state.rounds, 4, 'three held probes, then the one-shot re-check after the redeploy');
  assert.equal(holdRecorder.calls.length, 1, 'the seam is composed exactly once, for the pre-redeploy confirm');
  assert.equal(consoleServer.calls.start.length, 1, 'the console starts exactly once across the hold');
  assert.equal(
    lines.filter((line) => line === consoleUrlLine(HOLD_CONSOLE_URL)).length,
    1,
    'the console URL line prints exactly once per hold',
  );
  assert.equal(
    lines.filter((line) => line === 'Connect your domain to your site').length,
    1,
    'the hop title prints exactly once, not once per poll',
  );
});

/**
 * Seed a record at `delegated` with no saved nameServers, mirroring `seedDelegatedSite` except for
 * that one omission: the cutover's own DNS diagnosis must then discover the domain's authoritative
 * nameservers itself, exactly the shape `disagreeingResolve`'s NS-discovery stub expects.
 */
async function seedDelegatedSiteNoNameServers(siteId, dir, domain) {
  const api = makeApi({ token: 'fake-token', accountId: 'acct-1', dir });
  const created = await api.createZone(domain);
  const zone = await api.getZone(created.id);
  await seedLiveSite(siteId, dir, {
    step: 'delegated',
    cloudflare: {
      url: WORKERS_DEV_URL,
      workerName: 'cairn-domain-site',
      accountId: 'acct-1',
      apiToken: 'fake-token',
      domain,
      zoneId: zone.id,
      alreadyActive: true,
      carryOver: { outcome: 'carried', at: new Date().toISOString(), count: 0, types: [] },
    },
  });
  return zone;
}

const DISAGREEING_NS_HOST = 'ns1.registrar.test';

/**
 * A resolver factory whose authoritative path already carries the apex AAAA record (the Custom
 * Domain attach's own write) while the recursive resolver still answers absent, the exact
 * negative-cache disagreement the propagation split exists to see past. Mirrors hostname.test.mjs's
 * own `disagreeingDns`, reimplemented here since this test proves the wiring at the chapter level,
 * through the `resolve` seam `runChapter2` itself exposes, not by calling `cutOverHostname` directly.
 * @param {string} domain the domain under test
 * @returns {(servers?: string[]) => object} the factory `runChapter2` passes through as `resolve`
 */
function disagreeingResolve(domain) {
  const recursive = {
    resolveNs: async () => [DISAGREEING_NS_HOST],
    resolve4: absentAnswer(),
    resolve6: async (name) => {
      if (name === DISAGREEING_NS_HOST) return ['203.0.113.9'];
      throw Object.assign(new Error('absent'), { code: 'ENODATA' });
    },
  };
  const authoritative = {
    resolve4: absentAnswer(),
    resolve6: async (name) => {
      if (name === domain) return ['2001:db8::100'];
      throw Object.assign(new Error('absent'), { code: 'ENODATA' });
    },
  };
  return (servers) => (servers ? authoritative : recursive);
}

/**
 * Build a `createWaitForClearFn` test seam that expires after exactly one probe, over a virtual
 * clock so no real time passes. Deliberately does not reuse the propagation class's own 40-minute
 * budget: the assertion this test makes is about which outcome the wiring reaches, not about how
 * many polls a held wait takes to get there.
 * @returns {typeof createWaitForClear} the test seam
 */
function oneProbeWaitForClearFn() {
  return ({ holdClass, server, log, persist }) => {
    let clock = 0;
    return createWaitForClear({
      holdClass,
      server,
      log,
      persist,
      pollIntervalMs: 1,
      budgetMs: 1,
      now: () => clock,
      sleepFn: async (ms) => {
        clock += ms;
      },
      signals: new EventEmitter(),
    });
  };
}

// The falsifiability control this test exists for: chapter2.mjs is the only production caller of
// cutOverHostname, and until this fix it forwarded no `dns` context at all, so
// hostname-resolver-lagging was unreachable from a real run no matter how carefully hostname.mjs's
// own split was proven in isolation. Deleting the `dns: { resolve, nameServers }` argument at the
// cutOverHostname call site (leaving diagnoseUnreachable itself untouched) makes this test fail
// with 'hostname-records-absent', the exact regression this pins.
test('a held cutover threads the injected resolver into the DNS diagnosis: disagreement returns hostname-resolver-lagging end to end', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  await setupCloudflare(t, { zoneStatus: 'active' });
  await setupWrangler(t);
  const domain = 'lagging-cutover.example';
  await seedDelegatedSiteNoNameServers('site-lagging-cutover', dir, domain);

  const { runChapter2 } = await import('./chapter2.mjs');
  const outcome = await runChapter2({
    openBrowser: neverOpensBrowser,
    siteId: 'site-lagging-cutover',
    record: await loadSite('site-lagging-cutover'),
    dir,
    args: { yes: false },
    log: () => {},
    dryRun: false,
    // The hold's tiny budget expires before any confirm below the cutover is ever reached.
    confirm: mustNotBeCalled('confirm'),
    text: mustNotBeCalled('text'),
    fetchImpl: alwaysUnreachableFetch(),
    resolve: disagreeingResolve(domain),
    isTTY: true,
    env: {},
    createWaitForClearFn: oneProbeWaitForClearFn(),
    createConsoleServerFn: () => fakeConsole().handle,
  });

  assert.equal(outcome.outcome, 'hostname-resolver-lagging');

  const state = await loadSite('site-lagging-cutover');
  assert.equal(state.step, 'delegated', 'a wait outcome must not advance the step');
});

test('a --yes run composes no hold at all: no console, no loop, and the seam never even builds', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  await setupCloudflare(t, { zoneStatus: 'active' });
  await setupWrangler(t);
  const domain = 'yes-no-hold.example';
  await seedDelegatedSite('site-yes-no-hold', dir, domain);

  const { runChapter2 } = await import('./chapter2.mjs');
  const outcome = await runChapter2({
    openBrowser: neverOpensBrowser,
    siteId: 'site-yes-no-hold',
    record: await loadSite('site-yes-no-hold'),
    dir,
    args: { yes: true },
    log: () => {},
    dryRun: false,
    confirm: mustNotBeCalled('confirm'),
    text: mustNotBeCalled('text'),
    fetchImpl: alwaysUnreachableFetch(),
    // The cutover's own DNS diagnosis now runs for real (the very wiring the test above this one
    // pins), so this stays hermetic with an authoritative-absent stub rather than letting the
    // default resolver attempt a real lookup for a fictional domain.
    resolve: () => ({
      resolveNs: absentAnswer(),
      resolve4: absentAnswer(),
      resolve6: absentAnswer(),
      resolveMx: absentAnswer(),
      resolveTxt: absentAnswer(),
      resolveCaa: absentAnswer(),
      resolveCname: absentAnswer(),
    }),
    // A run the policy refuses must never even call these, isTTY: true or not: --yes alone is
    // enough to refuse.
    isTTY: true,
    env: {},
    createWaitForClearFn: mustNotBeCalled('createWaitForClearFn'),
    createConsoleServerFn: mustNotBeCalled('createConsoleServerFn'),
  });

  assert.equal(outcome.outcome, 'hostname-records-absent');
});

test('resume: a declined carry-over gate never silently advances', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  await seedZoneCreatedSite(t, 'site-declined-gate', dir);
  await setupWrangler(t);

  const { runChapter2 } = await import('./chapter2.mjs');
  const outcome = await runChapter2({
    openBrowser: neverOpensBrowser,
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

// --- Already-active zone: nothing to carry over ----------------------------------------------

test('records: an already-active zone skips the read and gate entirely, and persists not-needed', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t, { zoneStatus: 'active' });
  await setupWrangler(t);
  await seedLiveSite('site-already-active', dir);

  const { runChapter2 } = await import('./chapter2.mjs');
  const outcome = await runChapter2({
    openBrowser: neverOpensBrowser,
    siteId: 'site-already-active',
    record: await loadSite('site-already-active'),
    dir,
    args: { yes: false },
    log: () => {},
    dryRun: false,
    // The domain gate is answered yes; the email gate (the only other confirm this run reaches)
    // is declined, so this test stays focused on the already-active carry-over claim it names.
    confirm: confirmRouting({ domain: true, email: false }),
    text: async () => 'already-active-domain.example',
    promptSecretFn: async () => 'pasted-token-value',
    // readCurrentRecords refuses to run once a domain is already delegated to Cloudflare (its
    // own guard, records.mjs). This seam stands in for that exact refusal so the test does not
    // need to fabricate a real matching nameserver pair; the already-active hop must skip the
    // read entirely rather than let it throw, so a call here is the failure being pinned.
    resolve: () => {
      throw new Error(
        'readCurrentRecords refuses to run: must not be called once the zone arrived already active',
      );
    },
    fetchImpl: alwaysMatchingFetch(),
  });

  assert.equal(outcome.outcome, 'paid-plan-declined');

  const state = await loadSite('site-already-active');
  assert.equal(state.step, 'paid-plan-declined');
  assert.equal(state.cloudflare.carryOver.outcome, 'not-needed');

  const dnsWrites = cloudflare.requests.filter(
    (r) => r.method === 'POST' && r.path.includes('/dns_records'),
  );
  assert.equal(dnsWrites.length, 0, 'an already-active zone must never write DNS records');
});

// The falsifiability control for the test above: a zone that is NOT already active must still
// read and carry over records through the ordinary gate, proving the new guard is not simply
// disabling the hop for everyone.
test('records: a zone that is not already active still reads and carries records through the gate', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  await setupCloudflare(t); // default zoneStatus: 'pending'
  await setupWrangler(t);
  await seedLiveSite('site-not-active', dir);

  const { runChapter2 } = await import('./chapter2.mjs');
  const outcome = await runChapter2({
    openBrowser: neverOpensBrowser,
    siteId: 'site-not-active',
    record: await loadSite('site-not-active'),
    dir,
    args: { yes: false },
    log: () => {},
    dryRun: false,
    confirm: confirmAnswering(true),
    text: async () => 'not-active-domain.example',
    promptSecretFn: async () => 'pasted-token-value',
    resolve: authoritativeResolve('not-active-domain.example'),
  });

  // The zone stays pending on this fake (it never activates), so the run parks at delegation
  // rather than reaching domain-live; the load-bearing proof is that the records gate ran and
  // recorded a real outcome before that park, not the delegation park itself.
  assert.equal(outcome.outcome, 'delegation-pending');

  const state = await loadSite('site-not-active');
  assert.equal(state.step, 'records-carried');
  assert.equal(state.cloudflare.carryOver.outcome, 'carried');
});

// --- --dry-run ------------------------------------------------------------------------------

test('--dry-run prints every hop, with zero shell-outs and zero fake-API requests', async (t) => {
  await freshStateDir(t);
  const cloudflare = await setupCloudflare(t);
  const wrangler = await setupWrangler(t);

  const { runChapter2 } = await import('./chapter2.mjs');
  const logs = [];
  const outcome = await runChapter2({
    openBrowser: neverOpensBrowser,
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
    'Turn on email sign-in',
    'Onboard your domain for email',
    'Send a test sign-in email',
    'Update your sign-in email address',
    'Finish setting up email',
  ];
  for (const title of titles) {
    assert.ok(logs.includes(title), `missing dry-run title: ${title}`);
  }

  assert.equal(cloudflare.requests.length, 0, 'a dry run must make no Cloudflare API request');
  assert.deepEqual(await wrangler.invocations(), [], 'a dry run must shell out to nothing');
});

// --- Completion -------------------------------------------------------------------------------

// Consenting to domain and email but running straight through would reach the chapter's real
// finish line (email-live), which deletes the token as its own terminal-state rule: that would
// prove nothing about domain-live specifically. So this test consents to email too, but arms the
// fake to refuse the test send once (the propagation shape), which parks the run one hop further
// than domain-live, at email-onboarded. That is a stronger proof than stopping exactly at
// domain-live: the token survives PAST it as well. (A disabled onboarding entry cannot fake this
// instead: the create always reports enabled immediately, spike amendment 3, and this run has not
// created its own zone yet when the test starts, so there is no zoneId to pre-seed a disabled
// entry under.)
test('completion: domain-live is not terminal, so the token survives it on disk', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t, { zoneStatus: 'active' });
  await setupWrangler(t);
  const domain = 'complete-me.example';
  await seedLiveSite('site-completion', dir);
  cloudflare.failNext('email_send', 403, sendingDisabledBody());

  const { runChapter2 } = await import('./chapter2.mjs');
  const logs = [];
  const outcome = await runChapter2({
    openBrowser: neverOpensBrowser,
    siteId: 'site-completion',
    record: await loadSite('site-completion'),
    dir,
    args: { yes: false },
    log: (line) => logs.push(line),
    dryRun: false,
    confirm: confirmRouting({ domain: true, email: true }),
    text: async () => domain,
    promptSecretFn: async () => 'complete-me-token',
    fetchImpl: alwaysMatchingFetch(),
  });

  assert.equal(outcome.outcome, 'email-sender-propagating');

  const state = await loadSite('site-completion');
  assert.equal(state.step, 'email-onboarded', 'domain-live is not terminal, so a later park must not revert past it');
  assert.equal(typeof state.cloudflare.apiToken, 'string');
  assert.ok(state.cloudflare.apiToken.length > 0, 'the pasted token must survive domain-live');

  assert.ok(logs.some((line) => line.includes(domain) && line.includes('/admin')));
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
    openBrowser: neverOpensBrowser,
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
    openBrowser: neverOpensBrowser,
    siteId: 'site-reentry',
    record: await loadSite('site-reentry'),
    dir,
    args: { yes: false },
    log: () => {},
    dryRun: false,
    // The domain gate is already behind this record; the only confirm this run reaches is the
    // email admission, declined so this test stays about the token re-validation it names.
    confirm: confirmRouting({ email: false }),
    text: mustNotBeCalled('text'),
    promptSecretFn: mustNotBeCalled('promptSecretFn'),
  });

  assert.equal(outcome.outcome, 'paid-plan-declined');

  const state = await loadSite('site-reentry');
  assert.equal(state.cloudflare.domain, 'reentry-test.example', 'the seeded domain must survive the decline');

  const zoneListCalls = cloudflare.requests
    .slice(requestsBefore)
    .filter((r) => r.method === 'GET' && r.path.startsWith('/client/v4/zones'));
  assert.equal(zoneListCalls.length, 1, 'ensureApiToken must have validated the saved token again');
});

// --- Email admission (Task 8, Step 1) --------------------------------------------------------

test('email admission: interactive consent proceeds into onboarding', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const { cloudflare, zoneId } = await seedDomainLiveSite(t, 'site-email-consent', dir);
  await setupWrangler(t);

  const { runChapter2 } = await import('./chapter2.mjs');
  await runChapter2({
    openBrowser: neverOpensBrowser,
    siteId: 'site-email-consent',
    record: await loadSite('site-email-consent'),
    dir,
    args: { yes: false },
    log: () => {},
    dryRun: false,
    confirm: confirmRouting({ email: true }),
    text: mustNotBeCalled('text'),
    fetchImpl: alwaysMatchingFetch(),
  });

  const onboardingReads = cloudflare.requests.filter(
    (r) => r.method === 'GET' && r.path.startsWith(`/client/v4/zones/${zoneId}/email/sending/subdomains`),
  );
  assert.equal(onboardingReads.length, 1, 'consent must proceed into the onboarding read');
});

test('email admission: a decline records, deletes the token, exits 0, and prints the --sign-in line', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  await seedDomainLiveSite(t, 'site-email-decline', dir);

  const { runChapter2 } = await import('./chapter2.mjs');
  const logs = [];
  const outcome = await runChapter2({
    openBrowser: neverOpensBrowser,
    siteId: 'site-email-decline',
    record: await loadSite('site-email-decline'),
    dir,
    args: { yes: false },
    log: (line) => logs.push(line),
    dryRun: false,
    confirm: confirmRouting({ email: false }),
    text: mustNotBeCalled('text'),
  });

  assert.equal(outcome.outcome, 'paid-plan-declined');

  const state = await loadSite('site-email-decline');
  assert.equal(state.step, 'paid-plan-declined');
  assert.equal('apiToken' in state.cloudflare, false, 'the token must be deleted on decline');
  assert.ok(logs.some((line) => line.includes('--sign-in')));
});

test('email admission: a re-run after a decline prints the re-offered copy', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  await seedLiveSite('site-email-reoffer', dir, {
    step: 'paid-plan-declined',
    cloudflare: { emailDeclinedAt: new Date().toISOString() },
  });

  const { runChapter2 } = await import('./chapter2.mjs');
  const logs = [];
  const outcome = await runChapter2({
    openBrowser: neverOpensBrowser,
    siteId: 'site-email-reoffer',
    record: await loadSite('site-email-reoffer'),
    dir,
    args: { yes: true },
    log: (line) => logs.push(line),
    dryRun: false,
    confirm: mustNotBeCalled('confirm'),
    text: mustNotBeCalled('text'),
  });

  assert.equal(outcome.outcome, 'paid-plan-declined');
  assert.ok(logs.some((line) => line.includes('chose again')), 'a re-run must print the reoffered copy, not the first-decline copy');
});

test('email admission: --yes without --email declines and names the flag', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  await seedDomainLiveSite(t, 'site-email-yes-noflag', dir);

  const { runChapter2 } = await import('./chapter2.mjs');
  const logs = [];
  const outcome = await runChapter2({
    openBrowser: neverOpensBrowser,
    siteId: 'site-email-yes-noflag',
    record: await loadSite('site-email-yes-noflag'),
    dir,
    args: { yes: true },
    log: (line) => logs.push(line),
    dryRun: false,
    confirm: mustNotBeCalled('confirm'),
    text: mustNotBeCalled('text'),
  });

  assert.equal(outcome.outcome, 'paid-plan-declined');
  assert.ok(logs.some((line) => line.includes('--email')), 'the skip message must name --email');
});

test('email admission: --yes with --email proceeds unattended, with no prompt ever called', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const { cloudflare, zoneId } = await seedDomainLiveSite(t, 'site-email-yes-flag', dir);
  await setupWrangler(t);

  const { runChapter2 } = await import('./chapter2.mjs');
  await runChapter2({
    openBrowser: neverOpensBrowser,
    siteId: 'site-email-yes-flag',
    record: await loadSite('site-email-yes-flag'),
    dir,
    args: { yes: true, email: true },
    log: () => {},
    dryRun: false,
    confirm: mustNotBeCalled('confirm'),
    text: mustNotBeCalled('text'),
  });

  const onboardingReads = cloudflare.requests.filter(
    (r) => r.method === 'GET' && r.path.startsWith(`/client/v4/zones/${zoneId}/email/sending/subdomains`),
  );
  assert.equal(onboardingReads.length, 1, 'an unattended opt-in must proceed into onboarding with no prompt');
});

// --- Email hop order and resume (Task 8, Step 2) ---------------------------------------------

test('email hop order: a record at domain-live runs the whole half, test send before rewrite', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const { domain } = await seedDomainLiveSite(t, 'site-email-wholehalf', dir);
  const wrangler = await setupWrangler(t);

  const { runChapter2 } = await import('./chapter2.mjs');
  const logs = [];
  const outcome = await runChapter2({
    openBrowser: neverOpensBrowser,
    siteId: 'site-email-wholehalf',
    record: await loadSite('site-email-wholehalf'),
    dir,
    args: { yes: false },
    log: (line) => logs.push(line),
    dryRun: false,
    confirm: confirmRouting({ email: true }),
    text: mustNotBeCalled('text'),
    fetchImpl: alwaysMatchingFetch(),
  });

  assert.equal(outcome.outcome, 'email-live');

  const state = await loadSite('site-email-wholehalf');
  assert.equal(state.step, 'email-live');
  assert.equal(state.cloudflare.emailFrom, `no-reply@${domain}`);

  const sendIndex = logs.indexOf('Send a test sign-in email');
  const rewriteIndex = logs.indexOf('Update your sign-in email address');
  assert.ok(sendIndex !== -1 && rewriteIndex !== -1, 'both hop titles must have printed');
  assert.ok(sendIndex < rewriteIndex, 'the test send must print before the address rewrite');

  const deploys = (await wrangler.invocations()).filter((inv) => inv.argv.includes('deploy'));
  assert.equal(deploys.length, 1, 'exactly one deploy for the email address rewrite');
});

// --- Closing copy: the forward pointer to chapter 3 (T4c, Task 11) ----------------------------

test('closing copy: reaching email-live names --connect as the way to add Workers Builds', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  await seedDomainLiveSite(t, 'site-connect-pointer', dir);
  await setupWrangler(t);

  const { runChapter2 } = await import('./chapter2.mjs');
  const logs = [];
  const outcome = await runChapter2({
    openBrowser: neverOpensBrowser,
    siteId: 'site-connect-pointer',
    record: await loadSite('site-connect-pointer'),
    dir,
    args: { yes: false },
    log: (line) => logs.push(line),
    dryRun: false,
    confirm: confirmRouting({ email: true }),
    text: mustNotBeCalled('text'),
    fetchImpl: alwaysMatchingFetch(),
  });

  assert.equal(outcome.outcome, 'email-live');
  assert.ok(
    logs.some((line) => line.includes('--connect') && line.includes('Workers Builds')),
    `expected a closing line naming --connect and Workers Builds; got:\n${logs.join('\n---\n')}`,
  );
});

test('email hop order: a record at email-onboarded skips onboarding and starts at the test send', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t, { zoneStatus: 'active' });
  await setupWrangler(t);
  const domain = 'already-onboarded.example';
  await seedLiveSite('site-email-skiponboard', dir, {
    step: 'email-onboarded',
    cloudflare: {
      url: WORKERS_DEV_URL,
      workerName: 'cairn-domain-site',
      accountId: 'acct-1',
      apiToken: 'fake-token',
      domain,
      alreadyActive: true,
      emailOnboardedAt: new Date().toISOString(),
    },
  });

  const requestsBefore = cloudflare.requests.length;

  const { runChapter2 } = await import('./chapter2.mjs');
  const outcome = await runChapter2({
    openBrowser: neverOpensBrowser,
    siteId: 'site-email-skiponboard',
    record: await loadSite('site-email-skiponboard'),
    dir,
    args: { yes: false },
    log: () => {},
    dryRun: false,
    confirm: mustNotBeCalled('confirm'),
    text: mustNotBeCalled('text'),
    fetchImpl: alwaysMatchingFetch(),
  });

  assert.equal(outcome.outcome, 'email-live');

  const onboardingCalls = cloudflare.requests
    .slice(requestsBefore)
    .filter((r) => r.path.includes('/email/sending/subdomains'));
  assert.equal(
    onboardingCalls.length,
    0,
    'a record already at email-onboarded must not re-read or re-create the sending subdomain',
  );
});

test('email hop order: an onboarding park exits 0 and a resume issues no repeated create', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const { cloudflare, zoneId, domain } = await seedDomainLiveSite(t, 'site-email-onboardpark', dir);
  // The apex exists but has not finished enabling yet, so the onboarding hop parks rather than
  // posting a create, which would onboard it a second time.
  cloudflare.state.emailSubdomains.set(zoneId, [{ name: domain, enabled: false }]);

  const { runChapter2 } = await import('./chapter2.mjs');
  const firstOutcome = await runChapter2({
    openBrowser: neverOpensBrowser,
    siteId: 'site-email-onboardpark',
    record: await loadSite('site-email-onboardpark'),
    dir,
    args: { yes: false },
    log: () => {},
    dryRun: false,
    confirm: confirmRouting({ email: true }),
    text: mustNotBeCalled('text'),
  });

  assert.equal(firstOutcome.outcome, 'email-not-ready');
  const parkedState = await loadSite('site-email-onboardpark');
  assert.equal(parkedState.step, 'domain-live', 'a park must not advance the saved step');
  assert.equal(typeof parkedState.cloudflare.apiToken, 'string', 'a park is not terminal, so the token must survive');

  const requestsBeforeResume = cloudflare.requests.length;

  // The record has not advanced past domain-live, so the admission gate (indexed on the same
  // step) is genuinely re-asked on resume; this is distinct from the writes-repeated question the
  // assertion below checks.
  const secondOutcome = await runChapter2({
    openBrowser: neverOpensBrowser,
    siteId: 'site-email-onboardpark',
    record: parkedState,
    dir,
    args: { yes: false },
    log: () => {},
    dryRun: false,
    confirm: confirmRouting({ email: true }),
    text: mustNotBeCalled('text'),
  });

  assert.equal(secondOutcome.outcome, 'email-not-ready', 'the fake still reports the entry disabled');

  const since = cloudflare.requests.slice(requestsBeforeResume);
  const creates = since.filter((r) => r.method === 'POST' && r.path.includes('/email/sending/subdomains'));
  assert.equal(creates.length, 0, 'a resume must not post a second create for an entry that already exists');
});

test('email hop order: a test-send propagation park exits 0 and a resume repeats only the send', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t);
  const wrangler = await setupWrangler(t);
  const domain = 'propagating-test.example';
  await seedLiveSite('site-email-sendpark', dir, {
    step: 'email-onboarded',
    cloudflare: {
      url: WORKERS_DEV_URL,
      workerName: 'cairn-domain-site',
      accountId: 'acct-1',
      apiToken: 'fake-token',
      domain,
      alreadyActive: true,
      emailOnboardedAt: new Date().toISOString(),
    },
  });
  cloudflare.failNext('email_send', 403, sendingDisabledBody());

  const { runChapter2 } = await import('./chapter2.mjs');
  const firstOutcome = await runChapter2({
    openBrowser: neverOpensBrowser,
    siteId: 'site-email-sendpark',
    record: await loadSite('site-email-sendpark'),
    dir,
    args: { yes: false },
    log: () => {},
    dryRun: false,
    confirm: mustNotBeCalled('confirm'),
    text: mustNotBeCalled('text'),
  });

  assert.equal(firstOutcome.outcome, 'email-sender-propagating');
  const parkedState = await loadSite('site-email-sendpark');
  assert.equal(parkedState.step, 'email-onboarded');
  assert.equal(typeof parkedState.cloudflare.apiToken, 'string', 'a park is not terminal, so the token must survive');

  const requestsBeforeResume = cloudflare.requests.length;

  // No failNext armed this time, so the fake's own default (success) answers, proving the resume
  // retries the send for real rather than reusing the first parked answer.
  const secondOutcome = await runChapter2({
    openBrowser: neverOpensBrowser,
    siteId: 'site-email-sendpark',
    record: parkedState,
    dir,
    args: { yes: false },
    log: () => {},
    dryRun: false,
    confirm: mustNotBeCalled('confirm'),
    text: mustNotBeCalled('text'),
  });

  assert.equal(secondOutcome.outcome, 'email-live');

  const since = cloudflare.requests.slice(requestsBeforeResume);
  const sendCalls = since.filter((r) => r.method === 'POST' && r.path.includes('/email/sending/send'));
  assert.equal(sendCalls.length, 1, 'a resume repeats the test send exactly once, by design');
  const onboardingCalls = since.filter((r) => r.path.includes('/email/sending/subdomains'));
  assert.equal(onboardingCalls.length, 0, 'a resume at email-onboarded must not repeat the onboarding read or create');

  const deploys = (await wrangler.invocations()).filter((inv) => inv.argv.includes('deploy'));
  assert.equal(deploys.length, 1, 'the resumed run must still deploy the rewritten address exactly once');
});

test('email hop order: the deploy is skipped when the sender address is already correct', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const domain = 'already-correct.example';
  // Pre-write the exact address writeEmailFrom would otherwise write, so its own skip-when-
  // correct guard fires and no build or deploy ever runs.
  await writeFile(
    path.join(dir, 'src', 'theme', 'cairn.config.ts'),
    `export default {\n  email: { from: 'no-reply@${domain}' },\n};\n`,
  );
  await setupCloudflare(t);
  const wrangler = await setupWrangler(t);
  await seedLiveSite('site-email-nodeploy', dir, {
    step: 'email-onboarded',
    cloudflare: {
      url: WORKERS_DEV_URL,
      workerName: 'cairn-domain-site',
      accountId: 'acct-1',
      apiToken: 'fake-token',
      domain,
      alreadyActive: true,
      emailOnboardedAt: new Date().toISOString(),
    },
  });

  const { runChapter2 } = await import('./chapter2.mjs');
  const outcome = await runChapter2({
    openBrowser: neverOpensBrowser,
    siteId: 'site-email-nodeploy',
    record: await loadSite('site-email-nodeploy'),
    dir,
    args: { yes: false },
    log: () => {},
    dryRun: false,
    confirm: mustNotBeCalled('confirm'),
    text: mustNotBeCalled('text'),
  });

  assert.equal(outcome.outcome, 'email-live');
  const invocations = await wrangler.invocations();
  assert.equal(
    invocations.filter((inv) => inv.argv.includes('deploy')).length,
    0,
    'the address was already correct, so no deploy should have run',
  );
  assert.equal(
    invocations.filter((inv) => inv.argv.includes('build')).length,
    0,
    'the address was already correct, so no build should have run either',
  );
});

// --- Email terminal-state token rule (Task 8, Step 3) -----------------------------------------

test('email terminal state: reaching email-live deletes the token from the re-read record, the raw bytes, and keeps the file 0600', async (t) => {
  await freshStateDir(t);
  const stateDir = process.env.CAIRN_STATE_DIR;
  const dir = await fixtureScaffoldDir(t);
  const plantedToken = 'planted-email-live-token-8f2a91c0';
  await seedDomainLiveSite(t, 'site-email-terminal-live', dir, { apiToken: plantedToken });
  await setupWrangler(t);

  const { runChapter2 } = await import('./chapter2.mjs');
  const outcome = await runChapter2({
    openBrowser: neverOpensBrowser,
    siteId: 'site-email-terminal-live',
    record: await loadSite('site-email-terminal-live'),
    dir,
    args: { yes: false },
    log: () => {},
    dryRun: false,
    confirm: confirmRouting({ email: true }),
    text: mustNotBeCalled('text'),
    fetchImpl: alwaysMatchingFetch(),
  });

  assert.equal(outcome.outcome, 'email-live');

  const state = await loadSite('site-email-terminal-live');
  assert.equal('apiToken' in state.cloudflare, false, 'the token must be gone from the re-read record');

  const rawFile = await readFile(path.join(stateDir, 'site-email-terminal-live.json'), 'utf8');
  assert.doesNotMatch(rawFile, new RegExp(plantedToken), 'the raw bytes must not carry the token either');
  // Falsifiable: the same regex against a haystack that DOES carry the planted token must match.
  assert.match(`${rawFile}\n${plantedToken}`, new RegExp(plantedToken));

  const mode = (await stat(path.join(stateDir, 'site-email-terminal-live.json'))).mode & 0o777;
  assert.equal(mode, 0o600);
});

test('email terminal state: a recorded decline deletes the token from the re-read record, the raw bytes, and keeps the file 0600', async (t) => {
  await freshStateDir(t);
  const stateDir = process.env.CAIRN_STATE_DIR;
  const dir = await fixtureScaffoldDir(t);
  const plantedToken = 'planted-decline-token-3c71e05a';
  await seedDomainLiveSite(t, 'site-email-terminal-decline', dir, { apiToken: plantedToken });

  const { runChapter2 } = await import('./chapter2.mjs');
  const outcome = await runChapter2({
    openBrowser: neverOpensBrowser,
    siteId: 'site-email-terminal-decline',
    record: await loadSite('site-email-terminal-decline'),
    dir,
    args: { yes: false },
    log: () => {},
    dryRun: false,
    confirm: confirmRouting({ email: false }),
    text: mustNotBeCalled('text'),
  });

  assert.equal(outcome.outcome, 'paid-plan-declined');

  const state = await loadSite('site-email-terminal-decline');
  assert.equal('apiToken' in state.cloudflare, false, 'the token must be gone from the re-read record');

  const rawFile = await readFile(path.join(stateDir, 'site-email-terminal-decline.json'), 'utf8');
  assert.doesNotMatch(rawFile, new RegExp(plantedToken), 'the raw bytes must not carry the token either');
  assert.match(`${rawFile}\n${plantedToken}`, new RegExp(plantedToken));

  const mode = (await stat(path.join(stateDir, 'site-email-terminal-decline.json'))).mode & 0o777;
  assert.equal(mode, 0o600);
});

test('email terminal state: a park at email-onboarded keeps the token', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t);
  const domain = 'park-keeps-token.example';
  const plantedToken = 'planted-park-token-9d24f6b1';
  await seedLiveSite('site-email-park-keeps-token', dir, {
    step: 'email-onboarded',
    cloudflare: {
      url: WORKERS_DEV_URL,
      workerName: 'cairn-domain-site',
      accountId: 'acct-1',
      apiToken: plantedToken,
      domain,
      alreadyActive: true,
      emailOnboardedAt: new Date().toISOString(),
    },
  });
  cloudflare.failNext('email_send', 403, sendingDisabledBody());

  const { runChapter2 } = await import('./chapter2.mjs');
  const outcome = await runChapter2({
    openBrowser: neverOpensBrowser,
    siteId: 'site-email-park-keeps-token',
    record: await loadSite('site-email-park-keeps-token'),
    dir,
    args: { yes: false },
    log: () => {},
    dryRun: false,
    confirm: mustNotBeCalled('confirm'),
    text: mustNotBeCalled('text'),
  });

  assert.equal(outcome.outcome, 'email-sender-propagating');

  const state = await loadSite('site-email-park-keeps-token');
  assert.equal(state.cloudflare.apiToken, plantedToken, 'a park at email-onboarded must keep the token');
});

// --- Email closing copy (Task 8, Step 4) -------------------------------------------------------

test('email closing copy: names the from-address, its override, the DMARC consequence, and the doctor command', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const { domain } = await seedDomainLiveSite(t, 'site-email-closing-copy', dir);
  await setupWrangler(t);

  const { runChapter2 } = await import('./chapter2.mjs');
  const logs = [];
  const outcome = await runChapter2({
    openBrowser: neverOpensBrowser,
    siteId: 'site-email-closing-copy',
    record: await loadSite('site-email-closing-copy'),
    dir,
    args: { yes: false },
    log: (line) => logs.push(line),
    dryRun: false,
    confirm: confirmRouting({ email: true }),
    text: mustNotBeCalled('text'),
    fetchImpl: alwaysMatchingFetch(),
  });

  assert.equal(outcome.outcome, 'email-live');
  const closing = logs.find((line) => line.includes('cairn-doctor'));
  assert.ok(closing, 'expected a closing message naming the doctor command');
  assert.match(closing, new RegExp(`no-reply@${domain}`), 'must name the from-address');
  assert.match(closing, /cairn\.config\.ts/, 'must name the one-line override file');
  assert.match(closing, /_dmarc\./, 'must name the DMARC record');
  assert.match(closing, /reject/i, 'must name the record\'s policy');
  assert.match(closing, /newsletter/, 'must name the consequence for a later newsletter tool');
  assert.match(closing, /turn Email Sending off again/, 'must say the record outlives turning Email Sending back off (amendment 9)');
  assert.match(closing, /cairn-doctor --from .* --send-test/, 'must name the doctor re-proof command');
});

// --- T4b.1 defect harvest: the tool never promises delivery, anywhere (live e2e finding) -------

test('email closing copy: proves acceptance, not delivery, and promises no arrival timeline', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  await seedDomainLiveSite(t, 'site-email-no-delivery-claim', dir);
  await setupWrangler(t);

  const { runChapter2 } = await import('./chapter2.mjs');
  const logs = [];
  const outcome = await runChapter2({
    openBrowser: neverOpensBrowser,
    siteId: 'site-email-no-delivery-claim',
    record: await loadSite('site-email-no-delivery-claim'),
    dir,
    args: { yes: false },
    log: (line) => logs.push(line),
    dryRun: false,
    confirm: confirmRouting({ email: true }),
    text: mustNotBeCalled('text'),
    fetchImpl: alwaysMatchingFetch(),
  });

  assert.equal(outcome.outcome, 'email-live');
  const closing = logs.find((line) => line.includes('cairn-doctor'));
  assert.ok(closing, 'expected a closing message naming the doctor command');
  assert.equal(
    closing.includes('proving delivery works'),
    false,
    'the CLI only ever sees acceptance, never delivery, so it must never claim to prove delivery',
  );
  assert.match(closing, /Cloudflare accepted/, 'must name the claim actually proven: acceptance');
  assert.match(closing, /2026-08-12/, 'must date the reputation claim');
  assert.doesNotMatch(
    closing,
    /\b\d+\s*(hours?|days?|minutes?|weeks?)\b/i,
    'must promise no arrival timeline',
  );
});

test('email send hop: the detail line proves acceptance, not delivery', async (t) => {
  await freshStateDir(t);
  const cloudflare = await setupCloudflare(t);
  const wrangler = await setupWrangler(t);

  const { runChapter2 } = await import('./chapter2.mjs');
  const logs = [];
  await runChapter2({
    openBrowser: neverOpensBrowser,
    siteId: 'site-dry-run-send-detail',
    record: null,
    dir: '/tmp/dry-run-does-not-exist',
    args: { yes: false },
    log: (line) => logs.push(line),
    dryRun: true,
    confirm: mustNotBeCalled('confirm'),
    text: mustNotBeCalled('text'),
    promptSecretFn: mustNotBeCalled('promptSecretFn'),
  });

  assert.equal(cloudflare.requests.length, 0, 'a dry run must make no Cloudflare API request');
  assert.deepEqual(await wrangler.invocations(), [], 'a dry run must shell out to nothing');

  const titleIndex = logs.indexOf('Send a test sign-in email');
  assert.notEqual(titleIndex, -1, 'expected the send hop title to print');
  const detail = logs[titleIndex + 1];
  assert.equal(
    detail.includes('proving delivery works'),
    false,
    'the send hop only proves acceptance, never delivery',
  );
  assert.match(detail, /accepts/, 'must name what is actually proven: Cloudflare acceptance');
});

// --- Amendment 13: sendTestMessage's dir-less rows are rebuilt with a real --dir before printing

test('amendment 13: email-sender-propagating carries the real --dir, never the string undefined', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t);
  const domain = 'amendment13-propagating.example';
  await seedLiveSite('site-a13-propagating', dir, {
    step: 'email-onboarded',
    cloudflare: {
      url: WORKERS_DEV_URL,
      workerName: 'cairn-domain-site',
      accountId: 'acct-1',
      apiToken: 'fake-token',
      domain,
      alreadyActive: true,
      emailOnboardedAt: new Date().toISOString(),
    },
  });
  cloudflare.failNext('email_send', 403, sendingDisabledBody());

  const { runChapter2 } = await import('./chapter2.mjs');
  const outcome = await runChapter2({
    openBrowser: neverOpensBrowser,
    siteId: 'site-a13-propagating',
    record: await loadSite('site-a13-propagating'),
    dir,
    args: { yes: false },
    log: () => {},
    dryRun: false,
    confirm: mustNotBeCalled('confirm'),
    text: mustNotBeCalled('text'),
  });

  assert.equal(outcome.outcome, 'email-sender-propagating');
  assert.doesNotMatch(outcome.message, /undefined/);
  assert.ok(outcome.message.includes(`--dir ${dir}`), `expected the real --dir in: ${outcome.message}`);
});

test('amendment 13: email-daily-limit carries the real --dir, never the string undefined', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t);
  const domain = 'amendment13-dailylimit.example';
  await seedLiveSite('site-a13-dailylimit', dir, {
    step: 'email-onboarded',
    cloudflare: {
      url: WORKERS_DEV_URL,
      workerName: 'cairn-domain-site',
      accountId: 'acct-1',
      apiToken: 'fake-token',
      domain,
      alreadyActive: true,
      emailOnboardedAt: new Date().toISOString(),
    },
  });
  cloudflare.failNext('email_send', 429, dailyLimitBody());

  const { runChapter2 } = await import('./chapter2.mjs');
  const outcome = await runChapter2({
    openBrowser: neverOpensBrowser,
    siteId: 'site-a13-dailylimit',
    record: await loadSite('site-a13-dailylimit'),
    dir,
    args: { yes: false },
    log: () => {},
    dryRun: false,
    confirm: mustNotBeCalled('confirm'),
    text: mustNotBeCalled('text'),
  });

  assert.equal(outcome.outcome, 'email-daily-limit');
  assert.doesNotMatch(outcome.message, /undefined/);
  assert.ok(outcome.message.includes(`--dir ${dir}`), `expected the real --dir in: ${outcome.message}`);
});

test('amendment 13: email-sender-unavailable carries the real --dir, never the string undefined', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t);
  const domain = 'amendment13-unavailable.example';
  await seedLiveSite('site-a13-unavailable', dir, {
    step: 'email-onboarded',
    cloudflare: {
      url: WORKERS_DEV_URL,
      workerName: 'cairn-domain-site',
      accountId: 'acct-1',
      apiToken: 'fake-token',
      domain,
      alreadyActive: true,
      // Well past PROPAGATION_WINDOW_MS, so classification falls to the "did not take" row.
      emailOnboardedAt: new Date(0).toISOString(),
    },
  });
  cloudflare.failNext('email_send', 403, sendingDisabledBody());

  const { runChapter2 } = await import('./chapter2.mjs');
  await assert.rejects(
    async () =>
      runChapter2({
        openBrowser: neverOpensBrowser,
        siteId: 'site-a13-unavailable',
        record: await loadSite('site-a13-unavailable'),
        dir,
        args: { yes: false },
        log: () => {},
        dryRun: false,
        confirm: mustNotBeCalled('confirm'),
        text: mustNotBeCalled('text'),
      }),
    (err) => {
      assert.doesNotMatch(err.message, /undefined/);
      assert.ok(err.message.includes(`--dir ${dir}`), `expected the real --dir in: ${err.message}`);
      assert.ok(err.message.includes(domain), `expected the real domain in: ${err.message}`);
      return true;
    },
  );
});

// --- T4b.1: a scope failure clears the saved token; a park (or an unrelated act row) keeps it --
//
// The live defect this repairs: a saved token that passes validateToken's read (listZones) but
// lacks a write permission could never be replaced, because nothing cleared it once a later WRITE
// call (zone create, DNS, the attach) came back token-scope-missing or token-invalid. The row
// already tells the owner to re-run; this makes the re-run actually re-collect a token instead of
// silently reusing the bad one.

test('token lifecycle: a token-scope-missing failure creating the zone clears the saved token and rethrows unchanged', async (t) => {
  await freshStateDir(t);
  const stateDir = process.env.CAIRN_STATE_DIR;
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t);
  const plantedToken = 'planted-scope-secret-71a2f930';
  await seedLiveSite('site-token-scope', dir, {
    cloudflare: { url: WORKERS_DEV_URL, workerName: 'cairn-domain-site', accountId: 'acct-1', apiToken: plantedToken },
  });
  cloudflare.failNext('zone_create', 403, GENERIC_SCOPE_MISSING_BODY);

  const { runChapter2 } = await import('./chapter2.mjs');
  await assert.rejects(
    async () =>
      runChapter2({
        openBrowser: neverOpensBrowser,
        siteId: 'site-token-scope',
        record: await loadSite('site-token-scope'),
        dir,
        args: { yes: true, domain: 'token-scope-test.example' },
        log: () => {},
        dryRun: false,
        confirm: mustNotBeCalled('confirm'),
        text: mustNotBeCalled('text'),
        env: {},
      }),
    (err) => {
      assert.equal(err.cause?.catalogue?.code, 'token-scope-missing');
      return true;
    },
  );

  const state = await loadSite('site-token-scope');
  assert.equal('apiToken' in state.cloudflare, false, 'a re-run must re-collect a token, not reuse the bad one');
  assert.equal(state.cloudflare.url, WORKERS_DEV_URL, 'sibling fields must survive the scrub');
  assert.equal(state.cloudflare.accountId, 'acct-1', 'sibling fields must survive the scrub');

  const rawFile = await readFile(path.join(stateDir, 'site-token-scope.json'), 'utf8');
  assert.doesNotMatch(rawFile, new RegExp(plantedToken), 'the raw bytes must not carry the token either');

  // Falsifiable: the same regex against a haystack that DOES carry the planted token must match.
  assert.match(`${rawFile}\n${plantedToken}`, new RegExp(plantedToken));
});

test('token lifecycle: a token-invalid failure creating the zone clears the saved token and rethrows unchanged', async (t) => {
  await freshStateDir(t);
  const stateDir = process.env.CAIRN_STATE_DIR;
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t);
  const plantedToken = 'planted-invalid-secret-9c40e812';
  await seedLiveSite('site-token-invalid', dir, {
    cloudflare: { url: WORKERS_DEV_URL, workerName: 'cairn-domain-site', accountId: 'acct-1', apiToken: plantedToken },
  });
  cloudflare.failNext('zone_create', 400, TOKEN_INVALID_BODY);

  const { runChapter2 } = await import('./chapter2.mjs');
  await assert.rejects(
    async () =>
      runChapter2({
        openBrowser: neverOpensBrowser,
        siteId: 'site-token-invalid',
        record: await loadSite('site-token-invalid'),
        dir,
        args: { yes: true, domain: 'token-invalid-test.example' },
        log: () => {},
        dryRun: false,
        confirm: mustNotBeCalled('confirm'),
        text: mustNotBeCalled('text'),
        env: {},
      }),
    (err) => {
      assert.equal(err.cause?.catalogue?.code, 'token-invalid');
      return true;
    },
  );

  const state = await loadSite('site-token-invalid');
  assert.equal('apiToken' in state.cloudflare, false, 'a re-run must re-collect a token, not reuse the bad one');
  assert.equal(state.cloudflare.url, WORKERS_DEV_URL, 'sibling fields must survive the scrub');

  const rawFile = await readFile(path.join(stateDir, 'site-token-invalid.json'), 'utf8');
  assert.doesNotMatch(rawFile, new RegExp(plantedToken), 'the raw bytes must not carry the token either');
  assert.match(`${rawFile}\n${plantedToken}`, new RegExp(plantedToken));
});

// The widen guard: an unrelated thrown act row (here, email-sender-unavailable, reused from
// amendment 13's own fixture above) must never cost the owner a working token. Only the two exact
// codes clear it.
test('token lifecycle: an unrelated act-row failure (email-sender-unavailable) does not clear the saved token', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t);
  const domain = 'unrelated-act-row.example';
  const plantedToken = 'planted-unrelated-secret-4b0e2f17';
  await seedLiveSite('site-unrelated-act', dir, {
    step: 'email-onboarded',
    cloudflare: {
      url: WORKERS_DEV_URL,
      workerName: 'cairn-domain-site',
      accountId: 'acct-1',
      apiToken: plantedToken,
      domain,
      alreadyActive: true,
      // Well past PROPAGATION_WINDOW_MS, same as amendment 13's own unavailable case above, so
      // classification falls to the "did not take" act row rather than a park.
      emailOnboardedAt: new Date(0).toISOString(),
    },
  });
  cloudflare.failNext('email_send', 403, sendingDisabledBody());

  const { runChapter2 } = await import('./chapter2.mjs');
  await assert.rejects(
    async () =>
      runChapter2({
        openBrowser: neverOpensBrowser,
        siteId: 'site-unrelated-act',
        record: await loadSite('site-unrelated-act'),
        dir,
        args: { yes: false },
        log: () => {},
        dryRun: false,
        confirm: mustNotBeCalled('confirm'),
        text: mustNotBeCalled('text'),
      }),
    (err) => {
      assert.equal(err.cause?.catalogue?.code, 'email-sender-unavailable');
      return true;
    },
  );

  const state = await loadSite('site-unrelated-act');
  assert.equal(state.cloudflare.apiToken, plantedToken, 'an unrelated act row must never cost the token');
});

// The regression guard on the untouched half of the rule: a propagation park (a returned
// outcome, never thrown) must still keep the token. This mirrors the pre-existing "a park at
// email-onboarded keeps the token" coverage above, restated here as the direct T4b.1 guard.
test('token lifecycle: a propagation park still keeps the token', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t);
  const domain = 'park-still-keeps-token.example';
  const plantedToken = 'planted-still-parked-secret-2e91';
  await seedLiveSite('site-still-parked', dir, {
    step: 'email-onboarded',
    cloudflare: {
      url: WORKERS_DEV_URL,
      workerName: 'cairn-domain-site',
      accountId: 'acct-1',
      apiToken: plantedToken,
      domain,
      alreadyActive: true,
      emailOnboardedAt: new Date().toISOString(),
    },
  });
  cloudflare.failNext('email_send', 403, sendingDisabledBody());

  const { runChapter2 } = await import('./chapter2.mjs');
  const outcome = await runChapter2({
    openBrowser: neverOpensBrowser,
    siteId: 'site-still-parked',
    record: await loadSite('site-still-parked'),
    dir,
    args: { yes: false },
    log: () => {},
    dryRun: false,
    confirm: mustNotBeCalled('confirm'),
    text: mustNotBeCalled('text'),
  });

  assert.equal(outcome.outcome, 'email-sender-propagating');

  const state = await loadSite('site-still-parked');
  assert.equal(state.cloudflare.apiToken, plantedToken, 'a park must keep the token');
});
