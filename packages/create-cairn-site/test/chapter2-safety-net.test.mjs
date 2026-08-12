// The cross-cutting safety net over chapter 2's whole hop chain (T4a Task 12), a sibling of
// chapter2.test.mjs and resume-chapter2.test.mjs rather than an extension of either.
//
// DEVIATION FROM THE PLAN'S LETTER, RECORDED HERE: the plan asked for "one spawned-CLI case per
// hop boundary", extending resume-chapter2.test.mjs. This file instead drives every case
// in-process against runChapter2 directly. A spawned bin.mjs cannot inject the resolve,
// resolveNs, and fetchImpl seams chapter2.mjs takes, and there is no env seam for DNS or for the
// cutover's HTTPS probe (resume-chapter2.test.mjs's own header comment names this same
// constraint). A spawned run past the zone hop would therefore perform real DNS lookups and real
// HTTPS requests, which is neither hermetic nor safe, and the plan's own Global Constraints bar
// adding a DNS or probe env seam to production code just to work around it. Nothing is lost:
// runChapter2 in-process still writes real state files through the real state store, still
// spawns the real fake wrangler through exec.mjs, and still rewrites the real scaffold
// wrangler.jsonc, so every artifact the sweep and the no-repeat assertions below need is
// genuinely produced. Task 11's own spawned file already proves the dispatcher's routing into
// each new step; this file proves what happens once runChapter2 itself is running.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm, stat, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { makeFakeBin } from './fake-bin.mjs';
import { startFakeCloudflare } from './fake-cloudflare.mjs';
import { makeApi, SENDING_DISABLED_CODE } from '../src/cloudflare/api.mjs';
import { saveSite, loadSite, retireSite } from '../src/state.mjs';
import { runChapter2, TERMINAL_STEPS } from '../src/cloudflare/chapter2.mjs';

/** A minimal wrangler.jsonc fixture carrying the one key writePublicOrigin needs. */
const MINIMAL_WRANGLER_JSONC = JSON.stringify(
  { name: 'cairn-safety-net-site', vars: { PUBLIC_ORIGIN: 'https://cairn-safety-net-site.glw907.workers.dev' } },
  null,
  2,
);

const WORKERS_DEV_URL = 'https://cairn-safety-net-site.glw907.workers.dev';

// --- Harness, mirroring chapter2.test.mjs's own helpers (duplicated rather than imported: they
// are not exported, and this file lives in test/ rather than src/cloudflare/). -----------------

/**
 * Point CAIRN_STATE_DIR at a fresh temporary directory for the duration of one test.
 * @param {import('node:test').TestContext} t
 * @returns {Promise<string>} the state directory's absolute path
 */
async function freshStateDir(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-safety-net-state-'));
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
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-safety-net-scaffold-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await writeFile(path.join(dir, 'wrangler.jsonc'), MINIMAL_WRANGLER_JSONC);
  return dir;
}

/**
 * Start a fake Cloudflare and point CAIRN_CLOUDFLARE_API_BASE at it.
 * @param {import('node:test').TestContext} t
 * @param {{ zoneStatus?: string }} [overrides]
 * @returns {Promise<import('./fake-cloudflare.mjs').FakeCloudflare>}
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
 * @returns {Promise<import('./fake-bin.mjs').FakeBin>}
 */
async function setupWrangler(t, { deployReply = { code: 0, stdout: `Deployed (0.1 sec)\n  ${WORKERS_DEV_URL}\n` } } = {}) {
  const fake = await makeFakeBin('chapter2-safety-wrangler');
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

/**
 * An openBrowser stand-in, passed by every runChapter2 call in this file. The seam defaults to
 * the real platform opener, so a call that omits it launches a tab at whoever is running the
 * suite; test/no-desktop.mjs is the net underneath, but passing the seam is the fix.
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
 * A confirm stub for chapter 2's three yes/no gates (domain connect, carry-over copy, email
 * admission), matched by a distinctive substring of each gate's own message, mirroring
 * chapter2.test.mjs's own `confirmRouting`. Omitting a gate's answer means the record under test
 * has already passed it (or must never reach it): a call for that gate is then a defect, not just
 * an unexpected answer, so it throws rather than silently returning. A message matching none of
 * the three also throws, so a test can never pass by answering some fourth gate silently.
 * @param {{ domain?: boolean, carryOver?: boolean, email?: boolean }} [answers] omit a key to
 *  assert its gate is never asked at all
 * @returns {(input: { message: string }) => Promise<boolean>}
 */
function confirmRouting({ domain, carryOver, email } = {}) {
  const answer = (label, value) => {
    if (value === undefined) throw new Error(`the ${label} gate must not be asked on this record`);
    return value;
  };
  return async ({ message }) => {
    if (message.includes('Connect a domain')) return answer('domain', domain);
    if (message.includes('Copy these records')) return answer('carry-over', carryOver);
    if (message.includes('Workers Paid')) return answer('email', email);
    throw new Error(`confirmRouting: unrecognized confirm message: ${message}`);
  };
}

/** A confirm/text stub that fails the test the moment it is called, proving a hop was skipped. */
function mustNotBeCalled(label) {
  return async () => {
    throw new Error(`${label} must not be called on this path`);
  };
}

/**
 * Seed a state record shaped like a site that just finished chapter 1, the state every case here
 * starts from unless it seeds further along.
 * @param {string} siteId
 * @param {string} dir
 * @param {object} [overrides]
 * @returns {Promise<void>}
 */
async function seedLiveSite(siteId, dir, overrides = {}) {
  await saveSite(siteId, {
    name: 'Safety Net Site',
    dir,
    step: 'live',
    ownerEmail: 'owner@example.com',
    github: { appId: 42, appSlug: 'cairn-safety-net', owner: 'safety-net-owner', installationId: 7 },
    cloudflare: { url: WORKERS_DEV_URL, workerName: 'cairn-safety-net-site', accountId: 'acct-1' },
    ...overrides,
  });
}

/**
 * Seed a record at 'zone-created': create a real zone on the fake, re-read it for its assigned
 * nameservers (mirroring what ensureZone itself does), and save the whole cloudflare shape a
 * fresh chapter2 run would have written.
 * @param {import('node:test').TestContext} t
 * @param {{ siteId: string, dir: string, domain: string, fakeOverrides?: object }} args
 * @returns {Promise<{ cloudflare: object, zoneId: string, nameServers: string[], domain: string,
 *  cloudflareShape: object }>}
 */
async function seedZoneCreated(t, { siteId, dir, domain, fakeOverrides = {} }) {
  const cloudflare = await setupCloudflare(t, fakeOverrides);
  const api = makeApi({ token: 'fake-token', accountId: 'acct-1', dir });
  const created = await api.createZone(domain);
  const zone = await api.getZone(created.id);
  const cloudflareShape = {
    url: WORKERS_DEV_URL,
    workerName: 'cairn-safety-net-site',
    accountId: 'acct-1',
    apiToken: 'fake-token',
    domain,
    zoneId: zone.id,
    nameServers: zone.name_servers,
    alreadyActive: zone.status === 'active',
  };
  await seedLiveSite(siteId, dir, { step: 'zone-created', cloudflare: cloudflareShape });
  return { cloudflare, zoneId: zone.id, nameServers: zone.name_servers, domain, cloudflareShape };
}

/**
 * Seed a record at 'records-carried', extending seedZoneCreated with an already-answered
 * carry-over gate.
 * @param {import('node:test').TestContext} t
 * @param {{ siteId: string, dir: string, domain: string, fakeOverrides?: object }} args
 * @returns {Promise<{ cloudflare: object, zoneId: string, nameServers: string[], domain: string,
 *  cloudflareShape: object, carryOver: object }>}
 */
async function seedRecordsCarried(t, { siteId, dir, domain, fakeOverrides = {} }) {
  const seeded = await seedZoneCreated(t, { siteId, dir, domain, fakeOverrides });
  const carryOver = { outcome: 'carried', at: new Date().toISOString(), count: 0, types: [] };
  const cloudflareShape = { ...seeded.cloudflareShape, carryOver };
  await seedLiveSite(siteId, dir, { step: 'records-carried', cloudflare: cloudflareShape });
  return { ...seeded, cloudflareShape, carryOver };
}

/**
 * Seed a record at 'delegated', extending seedRecordsCarried with delegation already active.
 * @param {import('node:test').TestContext} t
 * @param {{ siteId: string, dir: string, domain: string, fakeOverrides?: object }} args
 * @returns {Promise<{ cloudflare: object, zoneId: string, nameServers: string[], domain: string,
 *  cloudflareShape: object, carryOver: object }>}
 */
async function seedDelegated(t, { siteId, dir, domain, fakeOverrides = {} }) {
  const seeded = await seedRecordsCarried(t, { siteId, dir, domain, fakeOverrides });
  const cloudflareShape = { ...seeded.cloudflareShape, alreadyActive: true };
  await seedLiveSite(siteId, dir, { step: 'delegated', cloudflare: cloudflareShape });
  return { ...seeded, cloudflareShape };
}

/** Every wrangler `deploy` call among `invocations` (fake-bin's own recorded shape). */
function deployCalls(invocations) {
  return invocations.filter((inv) => inv.argv.includes('deploy'));
}

/**
 * A `failNext('email_send', ...)` body for the propagation refusal (spike amendment 1/2),
 * mirroring chapter2.test.mjs's own `sendingDisabledBody`: a decline is itself a terminal step
 * (T4b ruling 5) and would delete a planted token before an interruption or sweep case here ever
 * gets to observe it, so this is what several fixes below use to park past domain-live instead.
 */
function sendingDisabledBody() {
  return {
    success: false,
    errors: [{ code: SENDING_DISABLED_CODE, message: 'email.sending.error.email.sending_disabled' }],
    messages: [],
    result: null,
  };
}

// --- Deliverable 1: interruption cases, one per hop boundary -----------------------------------

test('interruption: a record at live runs every hop exactly once through to domain-live', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t, { zoneStatus: 'active' });
  const wrangler = await setupWrangler(t);
  const siteId = 'safety-live';
  const domain = 'safety-live.example';
  await seedLiveSite(siteId, dir);

  const outcome = await runChapter2({
    openBrowser: neverOpensBrowser,
    siteId,
    record: await loadSite(siteId),
    dir,
    args: { yes: false },
    log: () => {},
    dryRun: false,
    // The domain gate is answered yes; the email gate (the only other confirm this run reaches,
    // since the carry-over hop is skipped by the already-active zone below) is declined, so this
    // test stays about the domain half's own per-hop counts.
    confirm: confirmRouting({ domain: true, email: false }),
    text: async () => domain,
    promptSecretFn: async () => 'safety-live-token',
    fetchImpl: alwaysMatchingFetch(),
  });

  assert.equal(outcome.outcome, 'paid-plan-declined');

  const zoneCreates = cloudflare.requests.filter((r) => r.method === 'POST' && r.path === '/client/v4/zones');
  assert.equal(zoneCreates.length, 1, 'zone create must run exactly once');

  const attaches = cloudflare.requests.filter((r) => r.method === 'PUT' && r.path.includes('/workers/domains'));
  assert.equal(attaches.length, 1, 'the custom-domain attach must run exactly once');

  const deploys = deployCalls(await wrangler.invocations());
  assert.equal(deploys.length, 1, 'wrangler deploy must run exactly once');

  const state = await loadSite(siteId);
  assert.equal(state.step, 'paid-plan-declined');
  assert.equal(state.cloudflare.domain, domain);

  // This zone arrives already active (setupCloudflare's zoneStatus above), so the carry-over hop
  // must have skipped its read and gate entirely rather than writing anything.
  assert.equal(state.cloudflare.carryOver.outcome, 'not-needed');
  const dnsWrites = cloudflare.requests.filter((r) => r.method === 'POST' && r.path.includes('/dns_records'));
  assert.equal(dnsWrites.length, 0, 'an already-active zone must never write DNS records');
});

test('interruption: a record at zone-created reaches domain-live without repeating the zone-create hop', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const siteId = 'safety-zonecr';
  const domain = 'safety-zonecr.example';
  const seeded = await seedZoneCreated(t, { siteId, dir, domain, fakeOverrides: { zoneStatus: 'active' } });
  const wrangler = await setupWrangler(t);

  const requestsBefore = seeded.cloudflare.requests.length;

  const outcome = await runChapter2({
    openBrowser: neverOpensBrowser,
    siteId,
    record: await loadSite(siteId),
    dir,
    args: { yes: false },
    log: () => {},
    dryRun: false,
    // This zone arrives already active (zoneStatus: 'active' above), so the carry-over hop skips
    // its own gate entirely; the only confirm this run reaches is the email admission, declined
    // here so this test stays about the zone-create no-repeat count below.
    confirm: confirmRouting({ email: false }),
    text: mustNotBeCalled('text'),
    fetchImpl: alwaysMatchingFetch(),
  });

  assert.equal(outcome.outcome, 'paid-plan-declined');

  const since = seeded.cloudflare.requests.slice(requestsBefore);
  assert.equal(
    since.filter((r) => r.method === 'POST' && r.path === '/client/v4/zones').length,
    0,
    'ensureZone must not run again on a resumed record',
  );

  const state = await loadSite(siteId);
  assert.equal(state.step, 'paid-plan-declined');
  assert.equal(state.cloudflare.zoneId, seeded.zoneId, 'the seeded zoneId must survive unchanged');
  assert.deepEqual(state.cloudflare.nameServers, seeded.nameServers, 'the seeded nameServers must survive unchanged');
  assert.equal(state.cloudflare.domain, domain, 'the seeded domain must survive unchanged');
});

test('interruption: a record at records-carried reaches domain-live without repeating the records hop', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const siteId = 'safety-recscr';
  const domain = 'safety-recscr.example';
  const seeded = await seedRecordsCarried(t, { siteId, dir, domain, fakeOverrides: { zoneStatus: 'active' } });
  const wrangler = await setupWrangler(t);

  const requestsBefore = seeded.cloudflare.requests.length;

  const outcome = await runChapter2({
    openBrowser: neverOpensBrowser,
    siteId,
    record: await loadSite(siteId),
    dir,
    args: { yes: false },
    log: () => {},
    dryRun: false,
    // The domain and carry-over gates are already answered on this seeded record; a call for
    // either proves one of them ran again, which must not happen. The only confirm this run
    // reaches is the email admission, declined here.
    confirm: confirmRouting({ email: false }),
    text: mustNotBeCalled('text'),
    fetchImpl: alwaysMatchingFetch(),
  });

  assert.equal(outcome.outcome, 'paid-plan-declined');

  const since = seeded.cloudflare.requests.slice(requestsBefore);
  assert.equal(
    since.filter((r) => r.method === 'POST' && r.path.includes('/dns_records')).length,
    0,
    'no further DNS record write once records-carried is reached',
  );
  assert.equal(since.filter((r) => r.method === 'POST' && r.path === '/client/v4/zones').length, 0);

  const state = await loadSite(siteId);
  assert.equal(state.step, 'paid-plan-declined');
  assert.deepEqual(state.cloudflare.carryOver, seeded.carryOver, 'the seeded carryOver must survive unchanged');
});

test('interruption: a record at delegated reaches domain-live via exactly one custom-domain attach', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const siteId = 'safety-delegd';
  const domain = 'safety-delegd.example';
  const seeded = await seedDelegated(t, { siteId, dir, domain, fakeOverrides: { zoneStatus: 'active' } });
  const wrangler = await setupWrangler(t);

  const requestsBefore = seeded.cloudflare.requests.length;

  const outcome = await runChapter2({
    openBrowser: neverOpensBrowser,
    siteId,
    record: await loadSite(siteId),
    dir,
    args: { yes: false },
    log: () => {},
    dryRun: false,
    // The domain and carry-over gates are already behind this record; the only confirm this run
    // reaches is the email admission, declined here.
    confirm: confirmRouting({ email: false }),
    text: mustNotBeCalled('text'),
    fetchImpl: alwaysMatchingFetch(),
  });

  assert.equal(outcome.outcome, 'paid-plan-declined');

  const since = seeded.cloudflare.requests.slice(requestsBefore);
  assert.equal(since.filter((r) => r.method === 'POST' && r.path === '/client/v4/zones').length, 0);
  assert.equal(since.filter((r) => r.method === 'POST' && r.path.includes('/dns_records')).length, 0);

  const attaches = since.filter((r) => r.method === 'PUT' && r.path.includes('/workers/domains'));
  assert.equal(attaches.length, 1, 'exactly one custom-domain attach on the resumed run');

  const deploys = deployCalls(await wrangler.invocations());
  assert.equal(deploys.length, 1, 'wrangler deploy must run exactly once');

  const state = await loadSite(siteId);
  assert.equal(state.step, 'paid-plan-declined');
});

test('interruption: a resume that parks before the cutover shells out to wrangler for nothing', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const siteId = 'safety-parkbc';
  const domain = 'safety-parkbc.example';
  // Default zoneStatus 'pending': the zone never reaches alreadyActive, and this domain's real NS
  // lookup answers nothing, so the delegation hop parks rather than reaching the cutover.
  await seedZoneCreated(t, { siteId, dir, domain });
  const wrangler = await setupWrangler(t);

  const outcome = await runChapter2({
    openBrowser: neverOpensBrowser,
    siteId,
    record: await loadSite(siteId),
    dir,
    args: { yes: false },
    log: () => {},
    dryRun: false,
    confirm: confirmAnswering(true),
    text: mustNotBeCalled('text'),
  });

  assert.equal(outcome.outcome, 'delegation-pending');
  assert.deepEqual(await wrangler.invocations(), [], 'a park before the cutover must shell out to wrangler for nothing');

  const state = await loadSite(siteId);
  assert.equal(state.step, 'records-carried', 'a park must not advance the saved step');
});

test('interruption: a genuine park then a later re-run continues from the same step with no repeated writes', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const siteId = 'safety-genpark';
  const domain = 'safety-genpark.example';
  // Default zoneStatus 'pending', so alreadyActive is false and the delegation check runs the
  // NS-lookup path this test drives directly.
  const seeded = await seedRecordsCarried(t, { siteId, dir, domain });
  const wrangler = await setupWrangler(t);

  let resolveNsCalls = 0;
  const resolveNsStub = async () => {
    resolveNsCalls += 1;
    // First run: the domain has not switched yet, so nothing matches the assigned pair.
    if (resolveNsCalls === 1) return [];
    // Second run: the domain now answers the exact pair Cloudflare assigned this zone.
    return seeded.nameServers;
  };

  const firstOutcome = await runChapter2({
    openBrowser: neverOpensBrowser,
    siteId,
    record: await loadSite(siteId),
    dir,
    args: { yes: false },
    log: () => {},
    dryRun: false,
    confirm: mustNotBeCalled('confirm'),
    text: mustNotBeCalled('text'),
    resolveNs: resolveNsStub,
  });
  assert.equal(firstOutcome.outcome, 'delegation-pending');

  const afterPark = await loadSite(siteId);
  assert.equal(afterPark.step, 'records-carried', 'a park must not advance the saved step');
  assert.deepEqual(await wrangler.invocations(), [], 'a park before the cutover shells out to nothing');

  // The zone itself finishes activating between the two runs (mutated directly on the fake's own
  // state, not through a request, so this does not count against the no-repeated-writes proof
  // below).
  const zoneRecord = seeded.cloudflare.state.zones.find((zone) => zone.id === seeded.zoneId);
  zoneRecord.status = 'active';

  const requestsBeforeSecondRun = seeded.cloudflare.requests.length;

  const secondOutcome = await runChapter2({
    openBrowser: neverOpensBrowser,
    siteId,
    record: await loadSite(siteId),
    dir,
    args: { yes: false },
    log: () => {},
    dryRun: false,
    // The domain and carry-over gates are already behind this record; the only confirm this run
    // reaches is the email admission, declined here.
    confirm: confirmRouting({ email: false }),
    text: mustNotBeCalled('text'),
    resolveNs: resolveNsStub,
    fetchImpl: alwaysMatchingFetch(),
  });
  assert.equal(secondOutcome.outcome, 'paid-plan-declined');
  assert.equal(resolveNsCalls, 2, 'the second run must re-detect delegation, not reuse the first answer');

  const since = seeded.cloudflare.requests.slice(requestsBeforeSecondRun);
  assert.equal(since.filter((r) => r.method === 'POST' && r.path === '/client/v4/zones').length, 0);
  assert.equal(since.filter((r) => r.method === 'POST' && r.path.includes('/dns_records')).length, 0);

  const finalState = await loadSite(siteId);
  assert.equal(finalState.step, 'paid-plan-declined');
});

// --- Deliverable 2: the secret sweep ------------------------------------------------------------

/**
 * Recursively list every file under `dir`, walking the whole tree rather than checking a
 * hardcoded list of names.
 * @param {string} dir the directory to walk
 * @returns {Promise<string[]>} every regular file's absolute path
 */
async function walkFiles(dir) {
  const out = [];
  async function recurse(current) {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await recurse(full);
      else if (entry.isFile()) out.push(full);
    }
  }
  await recurse(dir);
  return out;
}

/**
 * Sweep every surface a secret must never leak onto, returning one description per hit. Shared
 * by every case below rather than repeated inline, per the plan's own requirement. Covers, in
 * order: the scaffold tree (walked, not a hardcoded list, wrangler.jsonc included), every
 * captured log line, every captured thrown-error message, the joined argv of every fake-bin
 * invocation, and every file currently under the state directory (a retired record is just
 * another file there, so no special case is needed for `*.retired-*.json`).
 * @param {object} surfaces
 * @param {string} surfaces.scaffoldDir the scaffolded project directory to walk
 * @param {string[]} [surfaces.logs] every line captured from the run's log callback
 * @param {string[]} [surfaces.errorMessages] every message a thrown row carried
 * @param {Array<{ label: string, argv: string[] }>} [surfaces.invocations] every fake-bin call
 * @param {string} surfaces.stateDir the state directory to sweep, file by file
 * @param {string} secret the distinctive value to search for
 * @returns {Promise<string[]>} one description per hit; `[]` when the secret was found nowhere
 */
async function sweepForSecret({ scaffoldDir, logs = [], errorMessages = [], invocations = [], stateDir }, secret) {
  const hits = [];

  for (const file of await walkFiles(scaffoldDir)) {
    const content = await readFile(file, 'utf8').catch(() => '');
    if (content.includes(secret)) hits.push(`scaffold:${path.relative(scaffoldDir, file)}`);
  }

  logs.forEach((line, index) => {
    if (String(line).includes(secret)) hits.push(`log[${index}]`);
  });

  errorMessages.forEach((message, index) => {
    if (String(message).includes(secret)) hits.push(`error[${index}]`);
  });

  invocations.forEach((invocation, index) => {
    if (invocation.argv.join(' ').includes(secret)) hits.push(`argv[${index}]:${invocation.label}`);
  });

  let entries = [];
  try {
    entries = await readdir(stateDir);
  } catch {
    entries = [];
  }
  for (const entry of entries) {
    const content = await readFile(path.join(stateDir, entry), 'utf8').catch(() => '');
    if (content.includes(secret)) hits.push(`state:${entry}`);
  }

  return hits;
}

test('secret sweep: the helper can actually fail before it can be trusted (falsifiability)', async (t) => {
  const stateDir = await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const planted = 'cairn-plant-Zq7xK3vT9wR2mB5nJ8hL';
  const plantPath = path.join(dir, 'deliberately-leaked.txt');

  const clean = await sweepForSecret({ scaffoldDir: dir, stateDir }, planted);
  assert.deepEqual(clean, [], 'the sweep must report nothing before anything is planted');

  await writeFile(plantPath, `leaked: ${planted}\n`);
  const dirty = await sweepForSecret({ scaffoldDir: dir, stateDir }, planted);
  assert.ok(dirty.length > 0, 'the sweep must report the deliberately planted secret');
  assert.ok(
    dirty.some((hit) => hit.includes('deliberately-leaked.txt')),
    `expected the plant's location among the hits, got: ${JSON.stringify(dirty)}`,
  );

  await rm(plantPath);
  const cleanedAgain = await sweepForSecret({ scaffoldDir: dir, stateDir }, planted);
  assert.deepEqual(cleanedAgain, [], 'the sweep must go clean again once the plant is removed');
});

// A decline would delete the planted token as its own terminal step (T4b ruling 5), proving
// nothing about where a LIVE token does and does not leak. So this run consents to email too, and
// arms the fake to refuse the test send once (the propagation shape), which parks the run one hop
// past domain-live rather than declining: the token stays live and on disk for the sweep below.
test('secret sweep: a full run to domain-live confines the planted token to the live state record', async (t) => {
  const stateDir = await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t, { zoneStatus: 'active' });
  const wrangler = await setupWrangler(t);
  const siteId = 'sweep-live';
  const domain = 'sweep-live.example';
  const plantedToken = 'cairn-plant-Zq7xK3vT9wR2mB5nJ8hL';
  await seedLiveSite(siteId, dir);
  cloudflare.failNext('email_send', 403, sendingDisabledBody());

  const logs = [];
  const outcome = await runChapter2({
    openBrowser: neverOpensBrowser,
    siteId,
    record: await loadSite(siteId),
    dir,
    args: { yes: false },
    log: (line) => logs.push(line),
    dryRun: false,
    confirm: confirmRouting({ domain: true, email: true }),
    text: async () => domain,
    // Supplied through the same path a real run uses: pasted back through promptSecretFn, the
    // way the admin's own paste reaches this chapter.
    promptSecretFn: async () => plantedToken,
    fetchImpl: alwaysMatchingFetch(),
  });
  assert.equal(outcome.outcome, 'email-sender-propagating');

  const state = await loadSite(siteId);
  assert.equal(state.cloudflare.apiToken, plantedToken, 'the live record must carry the pasted token');

  const invocations = (await wrangler.invocations()).map((inv) => ({ label: 'wrangler', argv: inv.argv }));
  const hits = await sweepForSecret({ scaffoldDir: dir, logs, invocations, stateDir }, plantedToken);
  assert.deepEqual(
    hits,
    [`state:${siteId}.json`],
    `the token must appear only in the live state record, found: ${JSON.stringify(hits)}`,
  );

  // Retiring the same record (an abandoned run, or a start-over from a later chapter) must scrub
  // the token out of the file that survives it: this is what "including *.retired-*.json" means
  // in practice, and it needs a real retired file on disk to sweep.
  await retireSite(siteId);
  assert.equal(await loadSite(siteId), null, 'retiring removes the live record under its own id');

  const entries = await readdir(stateDir);
  const retired = entries.find((entry) => entry.includes('.retired-'));
  assert.ok(retired, 'a retired file must exist for the sweep below to actually cover');

  const hitsAfterRetire = await sweepForSecret({ scaffoldDir: dir, logs, invocations, stateDir }, plantedToken);
  assert.deepEqual(
    hitsAfterRetire,
    [],
    `the token must not survive retirement anywhere, found: ${JSON.stringify(hitsAfterRetire)}`,
  );
});

test('secret sweep: reaching a terminal step deletes the token everywhere, and the state file stays 0600', async (t) => {
  const stateDir = await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  await setupCloudflare(t, { zoneStatus: 'active' });
  const wrangler = await setupWrangler(t);
  const siteId = 'sweep-terminal';
  const domain = 'sweep-terminal.example';
  const plantedToken = 'cairn-plant-Zq7xK3vT9wR2mB5nJ8hL';
  await seedLiveSite(siteId, dir);

  const logs = [];
  const outcome = await runChapter2({
    openBrowser: neverOpensBrowser,
    siteId,
    record: await loadSite(siteId),
    dir,
    args: { yes: false },
    log: (line) => logs.push(line),
    dryRun: false,
    // Declines the email admission, this file's own default: this test's own point is the
    // terminal-step deletion rule itself, not the email half, and a decline is a terminal step in
    // its own right (T4b ruling 5).
    confirm: confirmRouting({ domain: true, email: false }),
    text: async () => domain,
    promptSecretFn: async () => plantedToken,
    fetchImpl: alwaysMatchingFetch(),
  });
  assert.equal(outcome.outcome, 'paid-plan-declined');

  assert.ok(TERMINAL_STEPS.length > 0);
  const terminalStep = TERMINAL_STEPS[0];
  // The decline above already deleted the token as part of reaching its OWN terminal step
  // (paid-plan-declined); replant it here so the short-circuit below has a real token to prove it
  // deletes, rather than proving nothing against an already-empty field. This still synthesizes
  // arriving at TERMINAL_STEPS[0] ('email-live') the way chapter2.test.mjs already does for the
  // token-deletion rule itself.
  const liveRecord = await loadSite(siteId);
  await saveSite(siteId, {
    ...liveRecord,
    step: terminalStep,
    cloudflare: { ...liveRecord.cloudflare, apiToken: plantedToken },
  });

  const errorMessages = [];
  let terminalOutcome;
  try {
    terminalOutcome = await runChapter2({
    openBrowser: neverOpensBrowser,
      siteId,
      record: await loadSite(siteId),
      dir,
      args: { yes: true },
      log: (line) => logs.push(line),
      dryRun: false,
      confirm: mustNotBeCalled('confirm'),
      text: mustNotBeCalled('text'),
    });
  } catch (err) {
    errorMessages.push(err.message);
    throw err;
  }
  assert.equal(terminalOutcome.outcome, terminalStep);

  const invocations = (await wrangler.invocations()).map((inv) => ({ label: 'wrangler', argv: inv.argv }));
  const hits = await sweepForSecret({ scaffoldDir: dir, logs, errorMessages, invocations, stateDir }, plantedToken);
  assert.deepEqual(hits, [], `the token must be gone from every surface, found: ${JSON.stringify(hits)}`);

  const rawFile = await readFile(path.join(stateDir, `${siteId}.json`), 'utf8');
  assert.doesNotMatch(rawFile, new RegExp(plantedToken), 'the raw state bytes must not carry the token either');

  const mode = (await stat(path.join(stateDir, `${siteId}.json`))).mode & 0o777;
  assert.equal(mode, 0o600);
});
