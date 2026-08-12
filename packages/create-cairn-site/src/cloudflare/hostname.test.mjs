import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startFakeCloudflare } from '../../test/fake-cloudflare.mjs';
import { makeApi } from './api.mjs';
import { makeFakeBin } from '../../test/fake-bin.mjs';

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

test('still-propagating DNS: unreachable over both http and https returns the wait outcome, not a throw', async (t) => {
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

  assert.deepEqual(result, { outcome: 'hostname-propagating' });
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
