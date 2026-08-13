import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EventEmitter } from 'node:events';
import { startFakeCloudflare } from '../../test/fake-cloudflare.mjs';
import { makeApi } from './api.mjs';
import { makeFakeBin } from '../../test/fake-bin.mjs';
import { cloudflareError } from './catalogue.mjs';
import {
  PROPAGATION_BUDGET_MS,
  PROPAGATION_HOLD_CLASS,
  PROPAGATION_POLL_INTERVAL_MS,
  consoleUrlLine,
  createWaitForClear,
  shouldHold,
} from '../hold-loop.mjs';

/**
 * A realistic deploy transcript, the same shape deploy.test.mjs pins from the T3 spike, so
 * deployWorker's own url-parsing runs for real rather than being stubbed out from under it.
 */
const DEPLOY_STDOUT_SAMPLE =
  'Uploaded cairn-t4a-spike (2.14 sec)\n' +
  'Deployed cairn-t4a-spike triggers (0.65 sec)\n' +
  '  https://cairn-t4a-spike.glw907.workers.dev\n' +
  'Current Version ID: 851dd846-9968-4752-82d4-563f72c0c2d2\n';

const WORKERS_DEV_URL = 'https://cairn-t4a-spike.glw907.workers.dev';

/** Start a fake Cloudflare and build a `makeApi` client against it, the sibling modules' setup. */
async function setupCloudflare(t) {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());
  process.env.CAIRN_CLOUDFLARE_API_BASE = cloudflare.apiBase;
  t.after(() => {
    delete process.env.CAIRN_CLOUDFLARE_API_BASE;
  });
  const api = makeApi({ token: 'fake-token', accountId: 'acct-1', dir: '/tmp/site' });
  return { cloudflare, api };
}

/** Point CAIRN_WRANGLER_BIN at a fresh fake wrangler, armed to reply to `deploy`. */
async function setupWrangler(t, deployReply = { code: 0, stdout: DEPLOY_STDOUT_SAMPLE }) {
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  await fake.respond('deploy', deployReply);
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => {
    delete process.env.CAIRN_WRANGLER_BIN;
  });
  return fake;
}

/** A scaffold root carrying just enough wrangler.jsonc for writePublicOrigin to rewrite. */
async function setupDir(t, origin = WORKERS_DEV_URL) {
  const dir = await mkdtemp(join(tmpdir(), 'cairn-hostname-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await writeFile(join(dir, 'wrangler.jsonc'), `{\n  "vars": {\n    "PUBLIC_ORIGIN": "${origin}"\n  }\n}\n`);
  return dir;
}

/** Read the scaffold's wrangler.jsonc back off disk, the load-bearing way to check the origin. */
function readOrigin(dir) {
  return readFile(join(dir, 'wrangler.jsonc'), 'utf8');
}

/** Create a real zone on the fake and wrap it in the state record cutOverHostname reads. */
async function buildRecord({ api, dir, domain = 'carin-test.org', url = WORKERS_DEV_URL }) {
  const zone = await api.createZone(domain);
  return {
    dir,
    cloudflare: {
      domain,
      zoneId: zone.id,
      workerName: 'cairn-t4a-spike',
      accountId: 'acct-1',
      url,
    },
  };
}

/** A Response for `/` and `/admin` matching the site-specific marker pair exactly. */
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

/** A fetchImpl that fails transport-level (throws) for every call, on either scheme. */
function alwaysUnreachableFetch() {
  return async () => {
    throw new TypeError('fetch failed', { cause: { code: 'ENOTFOUND' } });
  };
}

/**
 * A fetchImpl that throws on https:// (a TLS handshake failure, the exact shape addendum 2
 * captured on a zone minutes old) and answers the marker pair correctly on http://.
 */
function certificatePendingFetch() {
  return async (url) => {
    const u = new URL(url);
    if (u.protocol === 'https:') {
      throw new TypeError('fetch failed', {
        cause: { code: 'EPROTO', message: 'sslv3 alert handshake failure' },
      });
    }
    return markerResponse(u.pathname, u.origin);
  };
}

/**
 * A fetchImpl that answers a 522 (reachable, but not this site) for every request, in the shape
 * the spike observed: 16 plain-text bytes, not an HTML error page.
 */
function routeNotServingFetch() {
  return async () => new Response('error code: 522', { status: 522 });
}

/** A fetchImpl that answers 200 for `/` but never redirects `/admin`, the "wrong site" shape. */
function wrongSiteFetch() {
  return async () => new Response('<html>not cairn</html>', { status: 200 });
}

// --- DNS context fixtures, for the propagation split (Task 2) ----------------------------------

/** Build a DNS lookup error carrying the given `node:dns` code. */
function dnsError(code) {
  const err = new Error(code);
  err.code = code;
  return err;
}

/** A resolver-like stub method that always answers authoritatively absent (`ENODATA`). */
function absent() {
  return async () => {
    throw dnsError('ENODATA');
  };
}

/** A resolver-like stub method that answers `value` for exactly `name`, absent otherwise. */
function only(name, value) {
  return async (queriedName) => {
    if (queriedName === name) return value;
    throw dnsError('ENODATA');
  };
}

/** A full resolver-like stub, every method absent unless overridden. */
function stubResolver(overrides = {}) {
  return {
    resolveNs: absent(),
    resolve4: absent(),
    resolve6: absent(),
    ...overrides,
  };
}

const NS_HOST = 'ns1.registrar.test';

/**
 * A DNS context where the domain's own authoritative nameservers already carry the apex AAAA
 * record (the Custom Domain attach's own write) while the recursive resolver still answers
 * absent, the exact negative-cache disagreement this split exists to see past.
 * @param {string} domain the domain queried
 * @returns {{ resolve: (servers?: string[]) => object }}
 */
function disagreeingDns(domain) {
  const recursive = stubResolver({
    resolveNs: async () => [NS_HOST],
    resolve6: only(NS_HOST, ['203.0.113.9']),
  });
  const authoritative = stubResolver({
    resolve6: only(domain, ['2001:db8::100']),
  });
  return { resolve: (servers) => (servers ? authoritative : recursive) };
}

/**
 * A DNS context where the domain's own authoritative nameservers are reachable but genuinely
 * carry no apex AAAA record yet.
 * @param {string} domain the domain queried
 * @returns {{ resolve: (servers?: string[]) => object }}
 */
function recordsAbsentDns(domain) {
  const recursive = stubResolver({
    resolveNs: async () => [NS_HOST],
    resolve6: only(NS_HOST, ['203.0.113.9']),
  });
  const authoritative = stubResolver(); // absent for everything, including domain
  return { resolve: (servers) => (servers ? authoritative : recursive) };
}

test('the attach precedes any origin write, and the origin is updated by completion', async (t) => {
  const { cloudflare, api } = await setupCloudflare(t);
  const dir = await setupDir(t);
  await setupWrangler(t);
  const record = await buildRecord({ api, dir });

  let originDuringFirstConfirm;
  const fetchImpl = async (url) => {
    if (originDuringFirstConfirm === undefined) {
      // The very first fetch call happens inside the confirm that follows the attach; reading
      // the file here proves writePublicOrigin has not run yet at that point, which is the
      // direct, structural evidence that the attach precedes any origin write.
      originDuringFirstConfirm = await readOrigin(dir);
    }
    const u = new URL(url);
    return markerResponse(u.pathname, u.origin);
  };

  const { cutOverHostname } = await import('./hostname.mjs');
  const result = await cutOverHostname({ record, api, fetchImpl, log: () => {} });

  assert.equal(result.outcome, 'live');
  assert.ok(
    originDuringFirstConfirm.includes(WORKERS_DEV_URL),
    'origin should still be the workers.dev URL during the first confirm',
  );

  const attachRequests = cloudflare.requests.filter((r) => r.path.includes('/workers/domains'));
  assert.equal(attachRequests.length, 1);
  assert.equal(attachRequests[0].method, 'PUT');

  const finalContent = await readOrigin(dir);
  assert.ok(finalContent.includes(`https://${record.cloudflare.domain}`));
});

test('success redeploys once and returns the live outcome', async (t) => {
  const { api } = await setupCloudflare(t);
  const dir = await setupDir(t);
  const fake = await setupWrangler(t);
  const record = await buildRecord({ api, dir });

  const { cutOverHostname } = await import('./hostname.mjs');
  const result = await cutOverHostname({
    record,
    api,
    fetchImpl: alwaysMatchingFetch(),
    log: () => {},
  });

  assert.deepEqual(result, { outcome: 'live' });
  const invocations = await fake.invocations();
  assert.deepEqual(
    invocations.map((i) => i.argv),
    [['deploy']],
  );
});

test('unreachable over both http and https, with no DNS context: returns hostname-records-absent, not a throw', async (t) => {
  const { api } = await setupCloudflare(t);
  const dir = await setupDir(t);
  await setupWrangler(t);
  const record = await buildRecord({ api, dir });

  const { cutOverHostname } = await import('./hostname.mjs');
  const result = await cutOverHostname({
    record,
    api,
    fetchImpl: alwaysUnreachableFetch(),
    log: () => {},
  });

  // cutOverHostname's own call site forwards no DNS context, so confirmHostname's diagnosis
  // stays absent-safe: no lookup is attempted, and it reports the conservative default.
  assert.deepEqual(result, { outcome: 'hostname-records-absent' });
});

// --- confirmHostname: the propagation split (Task 2) --------------------------------------------

test('hostname-propagating is retired: no fixture in this parameterized set can still produce it', async () => {
  const { confirmHostname } = await import('./hostname.mjs');
  const domain = 'carin-test.org';

  const cases = [
    { name: 'matching marker', fetchImpl: alwaysMatchingFetch(), dns: undefined, expected: 'live' },
    { name: 'certificate pending', fetchImpl: certificatePendingFetch(), dns: undefined, expected: 'certificate-pending' },
    { name: '522 route', fetchImpl: routeNotServingFetch(), dns: undefined, expected: 'hostname-not-serving' },
    { name: 'wrong site', fetchImpl: wrongSiteFetch(), dns: undefined, expected: 'hostname-not-serving' },
    { name: 'unreachable, no DNS context', fetchImpl: alwaysUnreachableFetch(), dns: undefined, expected: 'hostname-records-absent' },
    { name: 'unreachable, disagreeing DNS', fetchImpl: alwaysUnreachableFetch(), dns: disagreeingDns(domain), expected: 'hostname-resolver-lagging' },
    { name: 'unreachable, records genuinely absent', fetchImpl: alwaysUnreachableFetch(), dns: recordsAbsentDns(domain), expected: 'hostname-records-absent' },
  ];

  for (const { name, fetchImpl, dns, expected } of cases) {
    const outcome = await confirmHostname(domain, fetchImpl, dns);
    assert.notEqual(outcome, 'hostname-propagating', `${name} must never produce the retired code`);
    assert.equal(outcome, expected, `${name} should report ${expected}`);
  }
});

test('the disagreement fixture (authoritative serves, resolver empty) maps to hostname-resolver-lagging', async () => {
  const { confirmHostname } = await import('./hostname.mjs');
  const domain = 'carin-test.org';

  const outcome = await confirmHostname(domain, alwaysUnreachableFetch(), disagreeingDns(domain));
  assert.equal(outcome, 'hostname-resolver-lagging');
});

test('the records-absent fixture (authoritative reachable but empty too) maps to hostname-records-absent', async () => {
  const { confirmHostname } = await import('./hostname.mjs');
  const domain = 'carin-test.org';

  const outcome = await confirmHostname(domain, alwaysUnreachableFetch(), recordsAbsentDns(domain));
  assert.equal(outcome, 'hostname-records-absent');
});

test('an authoritative answer present but the marker probe failing must not report live: the DNS answer upgrades the diagnosis, never the verdict', async (t) => {
  const domain = 'carin-test.org';
  const { confirmHostname } = await import('./hostname.mjs');

  // The site is reachable but answers the wrong content (the "wrong site" shape); the DNS
  // context claims the apex record is already present. Reachability, not DNS presence, decides
  // the verdict here, so this must stay hostname-not-serving and never live.
  const outcome = await confirmHostname(domain, wrongSiteFetch(), disagreeingDns(domain));
  assert.notEqual(outcome, 'live');
  assert.equal(outcome, 'hostname-not-serving');
});

test('a TLS transport failure with the site reachable over HTTP maps to certificate-pending, not a broken-site row', async (t) => {
  const { api } = await setupCloudflare(t);
  const dir = await setupDir(t);
  await setupWrangler(t);
  const record = await buildRecord({ api, dir });

  const { cutOverHostname } = await import('./hostname.mjs');
  const result = await cutOverHostname({
    record,
    api,
    fetchImpl: certificatePendingFetch(),
    log: () => {},
  });

  assert.deepEqual(result, { outcome: 'certificate-pending' });
});

test('a proxied hostname answering 522 maps to hostname-not-serving and is thrown', async (t) => {
  const { api } = await setupCloudflare(t);
  const dir = await setupDir(t);
  await setupWrangler(t);
  const record = await buildRecord({ api, dir });

  const { cutOverHostname } = await import('./hostname.mjs');
  await assert.rejects(
    () => cutOverHostname({ record, api, fetchImpl: routeNotServingFetch(), log: () => {} }),
    (err) => {
      assert.equal(err.catalogue.code, 'hostname-not-serving');
      assert.equal(err.catalogue.kind, 'act');
      return true;
    },
  );

  // A row this module throws directly must never have rewritten the origin: the confirm ran
  // before writePublicOrigin, and it failed the marker, so the flow never reached that write.
  const content = await readOrigin(dir);
  assert.ok(content.includes(WORKERS_DEV_URL));
});

test('a 200 that is not this site rejects the marker and maps to hostname-not-serving', async (t) => {
  const { api } = await setupCloudflare(t);
  const dir = await setupDir(t);
  await setupWrangler(t);
  const record = await buildRecord({ api, dir });

  const { cutOverHostname } = await import('./hostname.mjs');
  await assert.rejects(
    () => cutOverHostname({ record, api, fetchImpl: wrongSiteFetch(), log: () => {} }),
    (err) => {
      assert.equal(err.catalogue.code, 'hostname-not-serving');
      return true;
    },
  );
});

test('attach failure maps to custom-domain-failed and never reaches the confirm', async (t) => {
  const { cloudflare, api } = await setupCloudflare(t);
  const dir = await setupDir(t);
  await setupWrangler(t);
  const record = await buildRecord({ api, dir });

  cloudflare.failNext('workers_domain_attach', 409, {
    success: false,
    errors: [{ code: 7003, message: 'hostname already exists on another Worker' }],
    messages: [],
    result: null,
  });

  let fetchCalled = false;
  const { cutOverHostname } = await import('./hostname.mjs');
  await assert.rejects(
    () =>
      cutOverHostname({
        record,
        api,
        fetchImpl: async (...args) => {
          fetchCalled = true;
          return alwaysMatchingFetch()(...args);
        },
        log: () => {},
      }),
    (err) => {
      assert.equal(err.catalogue.code, 'custom-domain-failed');
      return true;
    },
  );
  assert.equal(fetchCalled, false, 'the confirm must never run once the attach itself failed');
});

test('redeploy failure maps to cutover-deploy-failed and restores the workers.dev origin on disk', async (t) => {
  const { api } = await setupCloudflare(t);
  const dir = await setupDir(t);
  await setupWrangler(t, { code: 1, stderr: 'ERROR: script size limit exceeded' });
  const record = await buildRecord({ api, dir });

  const { cutOverHostname } = await import('./hostname.mjs');
  await assert.rejects(
    () => cutOverHostname({ record, api, fetchImpl: alwaysMatchingFetch(), log: () => {} }),
    (err) => {
      assert.equal(err.catalogue.code, 'cutover-deploy-failed');
      assert.equal(err.catalogue.kind, 'act');
      // deployWorker throws its own already-catalogued error, which ends in its own "Next:"
      // line; catalogue.next must read as cutover-deploy-failed's own next step, not the nested
      // deploy-failed row's, which embedding the inner message whole would produce instead.
      assert.equal(
        err.catalogue.next,
        `fix what wrangler reported above, then re-run npx create-cairn-site --dir ${dir}.`,
      );
      return true;
    },
  );

  // Read the restore back off disk rather than trusting the call succeeded.
  const content = await readOrigin(dir);
  assert.ok(content.includes(WORKERS_DEV_URL));
  assert.ok(!content.includes(`https://${record.cloudflare.domain}`));
});

// --- The hold seam (Task 4a): the pre-redeploy confirm, held ------------------------------------

/** The console URL the injected server handle reports; a stand-in for the real secret prefix. */
const HOLD_CONSOLE_URL = 'http://127.0.0.1:49152/Zm9vYmFyLXNlY3JldA';

/** A console server handle recording what the hold loop does with it. */
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
 * Build a real `waitForClear` over an injected clock and console handle, plus the recorder the
 * seam tests read: `rounds` is how many confirms the loop ran, `holds` how many times the seam
 * was entered at all, and `last` the observation it answered with.
 */
function heldPropagation({ budgetMs = PROPAGATION_BUDGET_MS, lines = [] } = {}) {
  const consoleServer = fakeConsole();
  let clock = 0;
  const recorder = { holds: 0, last: null, server: consoleServer };
  const waitForClear = createWaitForClear({
    holdClass: PROPAGATION_HOLD_CLASS,
    server: consoleServer.handle,
    log: (line) => lines.push(line),
    budgetMs,
    now: () => clock,
    sleepFn: async (ms) => {
      clock += ms;
    },
    signals: new EventEmitter(),
  });
  return {
    recorder,
    lines,
    waitForClear: async (probe) => {
      recorder.holds += 1;
      recorder.last = await waitForClear(probe);
      return recorder.last;
    },
  };
}

/**
 * A fetchImpl that fails at the transport level for the first `rounds` confirms and answers the
 * marker pair from then on. A confirm is counted by its first request, the https probe of `/`.
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

/** A fetchImpl that answers the marker pair for the first `rounds` confirms, then goes dark. */
function matchingForRounds(rounds) {
  const state = { rounds: 0 };
  const fetchImpl = async (url) => {
    const u = new URL(url);
    if (u.pathname === '/' && u.protocol === 'https:') state.rounds += 1;
    if (state.rounds > rounds) throw new TypeError('fetch failed', { cause: { code: 'ENOTFOUND' } });
    return markerResponse(u.pathname, u.origin);
  };
  return { fetchImpl, state };
}

/** A fetchImpl answering 522 for the first `rounds` confirms, then the marker pair. */
function notServingForRounds(rounds) {
  const state = { rounds: 0 };
  const fetchImpl = async (url) => {
    const u = new URL(url);
    if (u.pathname === '/' && u.protocol === 'https:') state.rounds += 1;
    if (state.rounds <= rounds) return new Response('error code: 522', { status: 522 });
    return markerResponse(u.pathname, u.origin);
  };
  return { fetchImpl, state };
}

test('a held cutover polls the pre-redeploy confirm to clear, attaching once and printing its hop line once', async (t) => {
  const { cloudflare, api } = await setupCloudflare(t);
  const dir = await setupDir(t);
  await setupWrangler(t);
  const record = await buildRecord({ api, dir });
  const { fetchImpl, state } = unreachableForRounds(2);
  const { waitForClear, recorder, lines } = heldPropagation();

  const { cutOverHostname } = await import('./hostname.mjs');
  const result = await cutOverHostname({
    record,
    api,
    fetchImpl,
    log: (line) => lines.push(line),
    waitForClear,
  });

  assert.deepEqual(result, { outcome: 'live' });
  // Three held probes, then the one-shot re-check after the redeploy.
  assert.equal(state.rounds, 4);
  assert.equal(recorder.last.attempt, 3);

  const attachRequests = cloudflare.requests.filter((r) => r.path.includes('/workers/domains'));
  assert.equal(attachRequests.length, 1, 'the attach stays outside the loop');
  assert.equal(
    lines.filter((line) => line.startsWith(`Connected ${record.cloudflare.domain}`)).length,
    1,
    'the hop line prints once per hold, not once per poll',
  );
  assert.deepEqual(recorder.server.calls.start.length, 1);
  assert.equal(lines.filter((line) => line === consoleUrlLine(HOLD_CONSOLE_URL)).length, 1);
});

test("the hold expires into today's park verbatim: the same result and the same printed row as the no-seam path", async (t) => {
  const { api } = await setupCloudflare(t);
  const dir = await setupDir(t);
  await setupWrangler(t);
  const record = await buildRecord({ api, dir });

  const { cutOverHostname } = await import('./hostname.mjs');

  const parkedLines = [];
  const parked = await cutOverHostname({
    record,
    api,
    fetchImpl: alwaysUnreachableFetch(),
    log: (line) => parkedLines.push(line),
  });

  const heldLines = [];
  const { waitForClear, recorder } = heldPropagation({ lines: heldLines });
  const held = await cutOverHostname({
    record,
    api,
    fetchImpl: alwaysUnreachableFetch(),
    log: (line) => heldLines.push(line),
    waitForClear,
  });

  // The held run really held: it ran the console for the whole budget before parking.
  assert.equal(recorder.server.calls.start.length, 1);
  assert.equal(recorder.last.attempt, PROPAGATION_BUDGET_MS / PROPAGATION_POLL_INTERVAL_MS + 1);

  assert.deepEqual(held, parked);
  // The row an admin reads is composed by the caller from that outcome; both paths must compose
  // the identical row, not a lookalike.
  assert.equal(
    cloudflareError(held.outcome, { dir, domain: record.cloudflare.domain }).message,
    cloudflareError(parked.outcome, { dir, domain: record.cloudflare.domain }).message,
  );
  // The console URL is the one line a hold adds; everything else printed is byte-identical.
  assert.deepEqual(
    heldLines.filter((line) => line !== consoleUrlLine(HOLD_CONSOLE_URL)),
    parkedLines,
  );
});

test('a hostname-not-serving observation mid-hold is retried rather than thrown', async (t) => {
  const { api } = await setupCloudflare(t);
  const dir = await setupDir(t);
  await setupWrangler(t);
  const record = await buildRecord({ api, dir });
  const { fetchImpl, state } = notServingForRounds(2);
  const { waitForClear, recorder } = heldPropagation();

  const { cutOverHostname } = await import('./hostname.mjs');
  const result = await cutOverHostname({ record, api, fetchImpl, log: () => {}, waitForClear });

  assert.deepEqual(result, { outcome: 'live' });
  assert.equal(state.rounds, 4);
  assert.equal(recorder.server.calls.update.length, 2);
});

test('hostname-not-serving still at expiry throws exactly as today', async (t) => {
  const { api } = await setupCloudflare(t);
  const dir = await setupDir(t);
  await setupWrangler(t);
  const record = await buildRecord({ api, dir });
  const { fetchImpl, state } = notServingForRounds(Number.MAX_SAFE_INTEGER);
  const { waitForClear, recorder } = heldPropagation();

  const { cutOverHostname } = await import('./hostname.mjs');
  await assert.rejects(
    () => cutOverHostname({ record, api, fetchImpl, log: () => {}, waitForClear }),
    (err) => {
      assert.equal(err.catalogue.code, 'hostname-not-serving');
      assert.equal(err.catalogue.kind, 'act');
      return true;
    },
  );

  assert.equal(state.rounds, PROPAGATION_BUDGET_MS / PROPAGATION_POLL_INTERVAL_MS + 1);
  assert.equal(recorder.server.calls.stop, 1, 'the console is shut down before the throw');
});

test('only the pre-redeploy confirm is held: the re-check after the redeploy stays one-shot', async (t) => {
  const { api } = await setupCloudflare(t);
  const dir = await setupDir(t);
  await setupWrangler(t);
  const record = await buildRecord({ api, dir });
  // The pre-redeploy confirm is the only one that answers; the re-check afterwards goes dark.
  const { fetchImpl, state } = matchingForRounds(1);
  const { waitForClear, recorder } = heldPropagation();

  const { cutOverHostname } = await import('./hostname.mjs');
  const result = await cutOverHostname({ record, api, fetchImpl, log: () => {}, waitForClear });

  assert.deepEqual(result, { outcome: 'hostname-records-absent' });
  assert.equal(recorder.holds, 1, 'the seam is entered once, for the pre-redeploy confirm only');
  assert.equal(state.rounds, 2, 'the post-redeploy re-check probes once and parks');
  assert.equal(recorder.server.calls.start.length, 0);
});

test('a run the policy refuses never enters the hold: no probe, no URL line, and it returns at once', async (t) => {
  const { api } = await setupCloudflare(t);
  const dir = await setupDir(t);
  await setupWrangler(t);
  const record = await buildRecord({ api, dir });

  // Exactly the composition a chapter makes: no waitForClear at all when the policy refuses.
  const run = { yes: true, isTTY: false, env: { CI: 'true' } };
  assert.equal(shouldHold(run), false);
  let invocations = 0;
  const spy = async (probe) => {
    invocations += 1;
    return probe();
  };
  const waitForClear = shouldHold(run) ? spy : undefined;

  const lines = [];
  const startedAt = Date.now();
  const { cutOverHostname } = await import('./hostname.mjs');
  const result = await cutOverHostname({
    record,
    api,
    fetchImpl: alwaysUnreachableFetch(),
    log: (line) => lines.push(line),
    waitForClear,
  });
  const elapsed = Date.now() - startedAt;

  assert.deepEqual(result, { outcome: 'hostname-records-absent' });
  assert.equal(invocations, 0);
  assert.equal(lines.filter((line) => line.includes('Watch progress')).length, 0);
  assert.ok(
    elapsed < PROPAGATION_POLL_INTERVAL_MS,
    `a refused hold must return before one poll interval; took ${elapsed}ms`,
  );
});

test("a held confirm carries the DNS reading into its observation, so the console renders what was read rather than reading for itself", async (t) => {
  const { api } = await setupCloudflare(t);
  const dir = await setupDir(t);
  await setupWrangler(t);
  const domain = 'carin-test.org';
  const record = await buildRecord({ api, dir, domain });
  // One poll interval of budget, so the hold takes two probes and expires.
  const { waitForClear, recorder } = heldPropagation({ budgetMs: PROPAGATION_POLL_INTERVAL_MS });

  const { cutOverHostname } = await import('./hostname.mjs');
  const result = await cutOverHostname({
    record,
    api,
    fetchImpl: alwaysUnreachableFetch(),
    log: () => {},
    dns: disagreeingDns(domain),
    waitForClear,
  });

  assert.deepEqual(result, { outcome: 'hostname-resolver-lagging' });
  assert.deepEqual(recorder.last.detail, {
    authoritative: ['2001:db8::100'],
    recursive: [],
    lowConfidence: false,
    markerOutcome: 'hostname-resolver-lagging',
  });
  assert.equal(recorder.last.attempt, 2);
});

test('a repeated attach returns the same identity, with no duplicate-error branch', async (t) => {
  const { cloudflare, api } = await setupCloudflare(t);
  const dir = await setupDir(t);
  await setupWrangler(t);
  const record = await buildRecord({ api, dir });

  const { cutOverHostname } = await import('./hostname.mjs');
  const first = await cutOverHostname({
    record,
    api,
    fetchImpl: alwaysMatchingFetch(),
    log: () => {},
  });
  assert.equal(first.outcome, 'live');
  assert.equal(cloudflare.state.customDomains.length, 1);
  const [firstDomain] = cloudflare.state.customDomains;

  // A second full run (the re-entry shape a resumed chapter 2 would take) re-attaches the same
  // hostname; the fake's own idempotent PUT must not grow a duplicate and must not error.
  const second = await cutOverHostname({
    record,
    api,
    fetchImpl: alwaysMatchingFetch(),
    log: () => {},
  });
  assert.equal(second.outcome, 'live');
  assert.equal(cloudflare.state.customDomains.length, 1);
  const [secondDomain] = cloudflare.state.customDomains;
  assert.equal(secondDomain.id, firstDomain.id);
  assert.equal(secondDomain.cert_id, firstDomain.cert_id);
});
