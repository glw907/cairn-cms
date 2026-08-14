import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import dns from 'node:dns';
import { BUILD_HOLD_CLASS, consoleUrlLine, makeObservation } from '../hold-loop.mjs';
import { cloudflareError } from '../cloudflare/catalogue.mjs';
import { escapeHtml, pickAllowlist, SERVES_DURING_RUN_SENTENCE } from './render.mjs';
import { renderParkPage } from './park-pages.mjs';
import { createConsoleServer } from './server.mjs';

const CHAPTER = 'Chapter 3: Workers Builds';
const HOP = 'Watch your first Workers Builds deploy';

/**
 * Issue a raw HTTP request against a running console with an explicit Host header, the same
 * approach loopback-core.test.mjs uses: fetch cannot set a forbidden Host header, and this test
 * needs one to exercise the Host guard and to stay usable once a test mocks the global fetch.
 * @param {number} port the port to connect to
 * @param {string} pathname the request path
 * @param {string} [host] the Host header to send; defaults to a valid loopback form
 * @returns {Promise<{ status: number, body: string }>}
 */
function rawRequest(port, pathname, host = `127.0.0.1:${port}`) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path: pathname, headers: { Host: host } }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    req.end();
  });
}

/** A trivial view stub good enough to exercise routing, the header, and the serves sentence. */
function stubRenderView() {
  return { title: 'Status', bodyHtml: '<p class="stub-view">watching</p>' };
}

test('routes over the loopback core under the console\'s own secret per-start prefix', async (t) => {
  const server = createConsoleServer({ chapter: CHAPTER, hop: HOP, record: {}, renderView: stubRenderView });
  const { url } = await server.start(makeObservation(BUILD_HOLD_CLASS));
  t.after(() => server.stop());

  const parsed = new URL(url);
  assert.match(parsed.pathname, /^\/[A-Za-z0-9_-]{20,}$/, 'expected a base64url secret prefix');

  const mounted = await rawRequest(Number(parsed.port), parsed.pathname);
  assert.equal(mounted.status, 200);
  assert.match(mounted.body, /watching/);

  const unprefixedRoot = await rawRequest(Number(parsed.port), '/');
  assert.equal(unprefixedRoot.status, 404);

  const wrongPrefix = await rawRequest(Number(parsed.port), '/not-the-real-prefix');
  assert.equal(wrongPrefix.status, 404);
});

test('two console starts mint two different unguessable prefixes', async (t) => {
  const serverA = createConsoleServer({ chapter: CHAPTER, hop: HOP, record: {}, renderView: stubRenderView });
  const serverB = createConsoleServer({ chapter: CHAPTER, hop: HOP, record: {}, renderView: stubRenderView });
  const { url: urlA } = await serverA.start(makeObservation(BUILD_HOLD_CLASS));
  const { url: urlB } = await serverB.start(makeObservation(BUILD_HOLD_CLASS));
  t.after(() => Promise.all([serverA.stop(), serverB.stop()]));

  assert.notEqual(new URL(urlA).pathname, new URL(urlB).pathname);
});

test('Host guard: a non-loopback Host is refused with 403 on the console mount', async (t) => {
  const server = createConsoleServer({ chapter: CHAPTER, hop: HOP, record: {}, renderView: stubRenderView });
  const { url } = await server.start(makeObservation(BUILD_HOLD_CLASS));
  t.after(() => server.stop());
  const parsed = new URL(url);

  const refused = await rawRequest(Number(parsed.port), parsed.pathname, 'evil.example.com');
  assert.equal(refused.status, 403);
});

test('the one-line chapter/hop header renders on the view page, the exit render, and the error page', async (t) => {
  const server = createConsoleServer({ chapter: CHAPTER, hop: HOP, record: {}, renderView: stubRenderView });
  const { url } = await server.start(makeObservation(BUILD_HOLD_CLASS));
  const parsed = new URL(url);

  const view = await rawRequest(Number(parsed.port), parsed.pathname);
  assert.match(view.body, /Chapter 3: Workers Builds/);
  assert.match(view.body, /Watch your first Workers Builds deploy/);

  server.update(makeObservation(BUILD_HOLD_CLASS, { cleared: true }));
  const stopPromise = server.stop();
  const exitPage = await rawRequest(Number(parsed.port), parsed.pathname);
  assert.match(exitPage.body, /Chapter 3: Workers Builds/);
  assert.match(exitPage.body, /Watch your first Workers Builds deploy/);
  await stopPromise;

  const errorServer = createConsoleServer({
    chapter: CHAPTER,
    hop: HOP,
    record: {},
    renderView: () => {
      throw new Error('boom');
    },
  });
  const { url: errorUrl } = await errorServer.start(makeObservation(BUILD_HOLD_CLASS));
  t.after(() => errorServer.stop());
  const errorParsed = new URL(errorUrl);
  const errorPage = await rawRequest(Number(errorParsed.port), errorParsed.pathname);
  assert.equal(errorPage.status, 500);
  assert.match(errorPage.body, /Chapter 3: Workers Builds/);
  assert.match(errorPage.body, /Watch your first Workers Builds deploy/);
});

test('the serves-during-a-run-only sentence renders on the view page, the exit render, and the error page', async (t) => {
  const server = createConsoleServer({ chapter: CHAPTER, hop: HOP, record: {}, renderView: stubRenderView });
  const { url } = await server.start(makeObservation(BUILD_HOLD_CLASS));
  const parsed = new URL(url);

  const view = await rawRequest(Number(parsed.port), parsed.pathname);
  assert.match(view.body, new RegExp(SERVES_DURING_RUN_SENTENCE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  server.update(makeObservation(BUILD_HOLD_CLASS, { cleared: true }));
  const stopPromise = server.stop();
  const exitPage = await rawRequest(Number(parsed.port), parsed.pathname);
  assert.match(exitPage.body, new RegExp(SERVES_DURING_RUN_SENTENCE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  await stopPromise;

  const errorServer = createConsoleServer({
    chapter: CHAPTER,
    hop: HOP,
    record: {},
    renderView: () => {
      throw new Error('boom');
    },
  });
  const { url: errorUrl } = await errorServer.start(makeObservation(BUILD_HOLD_CLASS));
  t.after(() => errorServer.stop());
  const errorParsed = new URL(errorUrl);
  const errorPage = await rawRequest(Number(errorParsed.port), errorParsed.pathname);
  assert.match(errorPage.body, new RegExp(SERVES_DURING_RUN_SENTENCE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('exit render: no refresh meta, cleared text, served through a grace window before shutdown', async (t) => {
  const server = createConsoleServer({
    chapter: CHAPTER,
    hop: HOP,
    record: {},
    renderView: stubRenderView,
    graceMs: 500,
  });
  const { url } = await server.start(makeObservation(BUILD_HOLD_CLASS, { attempt: 1 }));
  const parsed = new URL(url);

  server.update(makeObservation(BUILD_HOLD_CLASS, { attempt: 2, cleared: true }));
  const stopPromise = server.stop();

  // An in-flight refresh during the grace window must land on the exit render.
  const duringGrace = await rawRequest(Number(parsed.port), parsed.pathname);
  assert.equal(duringGrace.status, 200);
  assert.match(duringGrace.body, /This wait cleared\. The run is continuing in your terminal\./);
  assert.doesNotMatch(duringGrace.body, /http-equiv="refresh"/);

  await stopPromise;
  await assert.rejects(() => rawRequest(Number(parsed.port), parsed.pathname));
});

test('exit render: with no fetch during the grace window, the server still shuts down on its own', async (t) => {
  const server = createConsoleServer({
    chapter: CHAPTER,
    hop: HOP,
    record: {},
    renderView: stubRenderView,
    graceMs: 40,
  });
  const { url } = await server.start(makeObservation(BUILD_HOLD_CLASS, { attempt: 1 }));
  const parsed = new URL(url);

  server.update(makeObservation(BUILD_HOLD_CLASS, { attempt: 2, cleared: true }));
  const startedAt = Date.now();
  await server.stop();
  assert.ok(Date.now() - startedAt >= 40, 'expected the stop to wait out the grace window');

  await assert.rejects(() => rawRequest(Number(parsed.port), parsed.pathname));
});

test('park page: a hold that ends un-cleared with a park serves that catalogue code\'s own page through the grace window before closing', async (t) => {
  const server = createConsoleServer({
    chapter: CHAPTER,
    hop: HOP,
    record: {},
    renderView: stubRenderView,
    graceMs: 500,
  });
  const { url } = await server.start(makeObservation(BUILD_HOLD_CLASS, { attempt: 1 }));
  const parsed = new URL(url);

  // Not cleared: this is the hold ending on a wait-kind park, exactly what a budget expiry or an
  // interrupt hands `stop`, never the exit render's cleared path.
  server.update(makeObservation(BUILD_HOLD_CLASS, { attempt: 2, cleared: false }));
  const park = { code: 'build-not-started', params: { dir: '/tmp/park-server-test' } };
  const stopPromise = server.stop(park);

  const duringGrace = await rawRequest(Number(parsed.port), parsed.pathname);
  assert.equal(duringGrace.status, 200);
  // Served through the REAL server route, compared against the SAME production renderParkPage a
  // deleted wiring would leave unreachable: this is not a call to renderParkPage in isolation.
  assert.equal(duringGrace.body, renderParkPage({ chapter: CHAPTER, hop: HOP, ...park }));
  const printed = cloudflareError(park.code, park.params);
  assert.ok(duringGrace.body.includes(escapeHtml(printed.catalogue.next)));
  assert.doesNotMatch(duringGrace.body, /http-equiv="refresh"/, 'a park is a terminal state for the console');

  await stopPromise;
  await assert.rejects(() => rawRequest(Number(parsed.port), parsed.pathname));
});

test('park page: a cleared observation always wins over a park argument, so the exit render still shows', async (t) => {
  const server = createConsoleServer({
    chapter: CHAPTER,
    hop: HOP,
    record: {},
    renderView: stubRenderView,
    graceMs: 500,
  });
  const { url } = await server.start(makeObservation(BUILD_HOLD_CLASS, { attempt: 1 }));
  const parsed = new URL(url);

  server.update(makeObservation(BUILD_HOLD_CLASS, { attempt: 2, cleared: true }));
  const stopPromise = server.stop({ code: 'build-not-started', params: { dir: '/tmp/park-server-test' } });

  const duringGrace = await rawRequest(Number(parsed.port), parsed.pathname);
  assert.match(duringGrace.body, /This wait cleared\. The run is continuing in your terminal\./);

  await stopPromise;
});

test('park page: with no fetch during the grace window, the server still shuts down on its own', async (t) => {
  const server = createConsoleServer({
    chapter: CHAPTER,
    hop: HOP,
    record: {},
    renderView: stubRenderView,
    graceMs: 40,
  });
  const { url } = await server.start(makeObservation(BUILD_HOLD_CLASS, { attempt: 1 }));
  const parsed = new URL(url);

  server.update(makeObservation(BUILD_HOLD_CLASS, { attempt: 2, cleared: false }));
  const startedAt = Date.now();
  await server.stop({ code: 'build-not-started', params: { dir: '/tmp/park-server-test' } });
  assert.ok(Date.now() - startedAt >= 40, 'expected the stop to wait out the grace window');

  await assert.rejects(() => rawRequest(Number(parsed.port), parsed.pathname));
});

test('render purity: rendering never issues an API or DNS call', async (t) => {
  const server = createConsoleServer({ chapter: CHAPTER, hop: HOP, record: {}, renderView: stubRenderView, graceMs: 20 });
  // Binding the loopback socket itself resolves '127.0.0.1' through Node's own net internals, so
  // the mocks are installed only once the server is up: what this test guards is RENDERING, a
  // request landing on the console's route, never issuing an API call or a DNS lookup of its own.
  const { url } = await server.start(makeObservation(BUILD_HOLD_CLASS));
  const parsed = new URL(url);

  const fetchMock = t.mock.method(globalThis, 'fetch', () => {
    throw new Error('render purity violated: fetch was called during render');
  });
  const resolveMock = t.mock.method(dns, 'resolve', () => {
    throw new Error('render purity violated: dns.resolve was called during render');
  });
  const lookupMock = t.mock.method(dns, 'lookup', () => {
    throw new Error('render purity violated: dns.lookup was called during render');
  });

  const view = await rawRequest(Number(parsed.port), parsed.pathname);
  assert.equal(view.status, 200);
  const notFound = await rawRequest(Number(parsed.port), `${parsed.pathname}-missing`);
  assert.equal(notFound.status, 404);
  const forbidden = await rawRequest(Number(parsed.port), parsed.pathname, 'evil.example.com');
  assert.equal(forbidden.status, 403);

  server.update(makeObservation(BUILD_HOLD_CLASS, { cleared: true }));
  await server.stop();

  assert.equal(fetchMock.mock.callCount(), 0);
  assert.equal(resolveMock.mock.callCount(), 0);
  assert.equal(lookupMock.mock.callCount(), 0);
});

// The sentinel-sweep fixture: distinctive, unmistakable strings planted in apiToken and every
// other credential-shaped field a real site record carries. If any route's rendered bytes ever
// contain one of these, the allowlist discipline has a hole.
const SENTINEL_TOKEN = 'SENTINEL-CLOUDFLARE-API-TOKEN-DO-NOT-RENDER';
const SENTINEL_PEM = 'SENTINEL-GITHUB-APP-PEM-DO-NOT-RENDER';
const SENTINEL_INSTALL_TOKEN = 'SENTINEL-GITHUB-INSTALL-TOKEN-DO-NOT-RENDER';
const SENTINELS = [SENTINEL_TOKEN, SENTINEL_PEM, SENTINEL_INSTALL_TOKEN];

const sentinelRecord = {
  id: 'sentinel-site-a1b2c3',
  dir: '/tmp/sentinel-site',
  github: {
    appId: 42,
    pem: SENTINEL_PEM,
    installationToken: SENTINEL_INSTALL_TOKEN,
    repo: { id: 1, name: 'sentinel-site' },
  },
  cloudflare: {
    accountId: 'acct-1',
    apiToken: SENTINEL_TOKEN,
    zoneId: 'zone-1',
    domain: 'sentinel.example.com',
    workerName: 'sentinel-worker',
  },
};

/** The allowlisted view a real production view would use: named fields only, never a spread. */
const SAFE_RECORD_FIELDS = ['id', 'cloudflare.domain', 'cloudflare.workerName'];

function safeSweepRenderView(observation, record) {
  const safe = pickAllowlist(record, SAFE_RECORD_FIELDS);
  return {
    title: 'Status',
    bodyHtml: `<p>Site ${escapeHtml(safe.id)} watching ${escapeHtml(safe.cloudflare?.domain ?? '')} (${escapeHtml(
      safe.cloudflare?.workerName ?? '',
    )})</p>`,
  };
}

test('secret-sentinel sweep: every route and the printed console URL line carry zero sentinel occurrences', async (t) => {
  const server = createConsoleServer({
    chapter: CHAPTER,
    hop: HOP,
    record: sentinelRecord,
    renderView: safeSweepRenderView,
  });
  const { url } = await server.start(makeObservation(BUILD_HOLD_CLASS, { attempt: 1 }));
  const parsed = new URL(url);

  const view = await rawRequest(Number(parsed.port), parsed.pathname);
  // Positive control: the allowlisted fields must still render, so the sentinel absence below
  // means the allowlist worked, not that nothing rendered at all.
  assert.match(view.body, /sentinel-site-a1b2c3/);
  assert.match(view.body, /sentinel\.example\.com/);

  const notFound = await rawRequest(Number(parsed.port), '/not-the-real-prefix');
  const forbidden = await rawRequest(Number(parsed.port), parsed.pathname, 'evil.example.com');

  const errorServer = createConsoleServer({
    chapter: CHAPTER,
    hop: HOP,
    record: sentinelRecord,
    renderView: () => {
      throw new Error('boom');
    },
  });
  const { url: errorUrl } = await errorServer.start(makeObservation(BUILD_HOLD_CLASS));
  t.after(() => errorServer.stop());
  const errorParsed = new URL(errorUrl);
  const errorPage = await rawRequest(Number(errorParsed.port), errorParsed.pathname);
  assert.equal(errorPage.status, 500);

  server.update(makeObservation(BUILD_HOLD_CLASS, { cleared: true }));
  const stopPromise = server.stop();
  const exitPage = await rawRequest(Number(parsed.port), parsed.pathname);
  await stopPromise;

  const printedLine = consoleUrlLine(url);

  const renderedBytes = [view.body, notFound.body, forbidden.body, errorPage.body, exitPage.body, printedLine];
  for (const sentinel of SENTINELS) {
    for (const bytes of renderedBytes) {
      assert.equal(bytes.includes(sentinel), false, `expected no occurrence of ${sentinel}`);
    }
  }
});
