import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { startLoopbackCore } from './loopback-core.mjs';

/**
 * Issue a raw HTTP request against a running core with an explicit Host header, bypassing
 * fetch's forbidden-header restriction so the Host guard's every accepted and refused form can
 * be exercised directly, independent of what the actual TCP destination happens to be. A `null`
 * hostHeader sends no Host header at all (`setHost: false`), rather than Node's http client
 * silently filling one in for a falsy value.
 * @param {{ port: number }} core the running core to hit
 * @param {string} pathname the request path
 * @param {string | null} hostHeader the raw Host header value to send, or `null` to send none
 * @returns {Promise<number>} the response status code
 */
function requestWithHost(core, pathname, hostHeader) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: core.port,
        path: pathname,
        setHost: hostHeader !== null,
        headers: hostHeader === null ? {} : { Host: hostHeader },
      },
      (res) => {
        res.resume();
        res.on('end', () => resolve(res.statusCode));
      },
    );
    req.on('error', reject);
    req.end();
  });
}

/** A mount handler that always answers 200 with a fixed body, standing in for a real route. */
function okHandler(req, res) {
  res.writeHead(200, { 'content-type': 'text/plain' });
  res.end('ok');
}

test('binds an ephemeral port on 127.0.0.1 and reports it', async (t) => {
  const core = await startLoopbackCore();
  t.after(() => core.close());
  assert.ok(core.port > 0);
  assert.equal(core.url, `http://127.0.0.1:${core.port}`);
});

test('routes by a path map: each mounted path dispatches to its own handler', async (t) => {
  const core = await startLoopbackCore();
  t.after(() => core.close());
  core.mount('/one', (req, res) => {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('one');
  });
  core.mount('/two', (req, res) => {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('two');
  });

  const first = await fetch(`${core.url}/one`);
  assert.equal(await first.text(), 'one');
  const second = await fetch(`${core.url}/two`);
  assert.equal(await second.text(), 'two');

  const unmounted = await fetch(`${core.url}/three`);
  assert.equal(unmounted.status, 404);
});

test('regression: the fixed /callback mount is identical, unprefixed, across two separate core starts', async (t) => {
  // Ties directly to oauth.mjs's ReauthorizeInput doc comment (the spike-observed constraint):
  // GitHub bakes callback_urls at App-creation time and its loopback leniency is port-only,
  // never path-flexible, so reauthorize's redirect_uri must always land on the literal
  // '/callback' path with no per-start prefix. Never unify this fixed mount with the console's
  // per-start-prefixed mounts below.
  const core1 = await startLoopbackCore();
  t.after(() => core1.close());
  const core2 = await startLoopbackCore();
  t.after(() => core2.close());
  core1.mount('/callback', okHandler);
  core2.mount('/callback', okHandler);

  const redirectUri1 = `${core1.url}/callback`;
  const redirectUri2 = `${core2.url}/callback`;
  assert.equal(new URL(redirectUri1).pathname, '/callback');
  assert.equal(new URL(redirectUri2).pathname, '/callback');

  const response1 = await fetch(redirectUri1);
  const response2 = await fetch(redirectUri2);
  assert.equal(response1.status, 200);
  assert.equal(response2.status, 200);
});

test('console mounts carry a per-start secret prefix; the unprefixed path 404s', async (t) => {
  const core = await startLoopbackCore();
  t.after(() => core.close());
  core.mountConsole('/status', okHandler);

  const unprefixed = await fetch(`${core.url}/status`);
  assert.equal(unprefixed.status, 404);

  const prefixed = await fetch(`${core.url}/${core.consolePrefix}/status`);
  assert.equal(prefixed.status, 200);
  assert.equal(await prefixed.text(), 'ok');
});

test('the console prefix is unguessable and unique per start', async (t) => {
  const core1 = await startLoopbackCore();
  t.after(() => core1.close());
  const core2 = await startLoopbackCore();
  t.after(() => core2.close());
  assert.notEqual(core1.consolePrefix, core2.consolePrefix);
  assert.match(core1.consolePrefix, /^[A-Za-z0-9_-]{20,}$/, 'expected a base64url-shaped secret');
});

test('Host allowlist: every accepted form returns 200 (positive control)', async (t) => {
  const core = await startLoopbackCore();
  t.after(() => core.close());
  core.mount('/probe', okHandler);

  const accepted = [
    '127.0.0.1',
    `127.0.0.1:${core.port}`,
    'localhost',
    `localhost:${core.port}`,
    '[::1]',
    `[::1]:${core.port}`,
  ];
  for (const host of accepted) {
    const status = await requestWithHost(core, '/probe', host);
    assert.equal(status, 200, `expected 200 for Host: ${host}`);
  }
});

test('Host allowlist: a non-loopback Host is refused with 403 on every mount', async (t) => {
  const core = await startLoopbackCore();
  t.after(() => core.close());
  core.mount('/probe', okHandler);
  core.mountConsole('/status', okHandler);

  const refused = ['evil.example.com', '127.0.0.1.evil.example.com', 'example.com:80'];
  for (const host of refused) {
    const fixedStatus = await requestWithHost(core, '/probe', host);
    assert.equal(fixedStatus, 403, `expected 403 for Host: "${host}" on a fixed mount`);
    const consoleStatus = await requestWithHost(core, `/${core.consolePrefix}/status`, host);
    assert.equal(consoleStatus, 403, `expected 403 for Host: "${host}" on a console mount`);
  }

  // A request with no Host header at all is not even a valid HTTP/1.1 request; Node's own http
  // server refuses it with 400 before this module's handler ever runs, which already denies the
  // request the guard exists to deny.
  const noHostStatus = await requestWithHost(core, '/probe', null);
  assert.equal(noHostStatus, 400, 'expected Node\'s own HTTP/1.1 enforcement to refuse a missing Host header');
});

test('shutdown closes the socket', async () => {
  const core = await startLoopbackCore();
  const { url } = core;
  await core.close();
  await assert.rejects(() => fetch(url));
});
