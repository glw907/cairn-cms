import test from 'node:test';
import assert from 'node:assert/strict';
import { compile, matchRoute, startLoopbackServer, sendJson } from './fake-server.mjs';

test('matchRoute matches by method and pattern and extracts named params', () => {
  const routes = [
    { method: 'GET', regex: compile('/repos/:owner/:repo'), route: 'repo', handler: () => {} }
  ];
  const { match, params } = matchRoute(routes, 'GET', '/repos/glw907/cairn-cms');
  assert.equal(match.route, 'repo');
  assert.deepEqual({ ...params }, { owner: 'glw907', repo: 'cairn-cms' });
});

test('matchRoute refuses an unregistered path: no match, no fallback', () => {
  const routes = [{ method: 'GET', regex: compile('/repos/:owner/:repo'), route: 'repo', handler: () => {} }];
  const { match, params } = matchRoute(routes, 'GET', '/nope');
  assert.equal(match, null);
  assert.deepEqual(params, {});
});

test('matchRoute refuses a right path with the wrong method', () => {
  const routes = [{ method: 'GET', regex: compile('/repos/:owner/:repo'), route: 'repo', handler: () => {} }];
  const { match } = matchRoute(routes, 'POST', '/repos/glw907/cairn-cms');
  assert.equal(match, null);
});

test('startLoopbackServer binds loopback-only and reports its own base URL', async (t) => {
  const handle = await startLoopbackServer();
  t.after(() => handle.close());
  assert.match(handle.base, /^http:\/\/127\.0\.0\.1:\d+$/);
});

test('startLoopbackServer refuses a request that arrives before setDispatcher is called', async (t) => {
  const handle = await startLoopbackServer('not ready yet, test fixture');
  t.after(() => handle.close());
  const res = await fetch(handle.base);
  assert.equal(res.status, 503);
  const body = await res.json();
  assert.equal(body.message, 'not ready yet, test fixture');
});

test('startLoopbackServer serves through the wired dispatcher once setDispatcher is called', async (t) => {
  const handle = await startLoopbackServer();
  t.after(() => handle.close());
  handle.setDispatcher((_req, res) => sendJson(res, 200, { ok: true }));
  const res = await fetch(handle.base);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
});

test('close() actually tears the socket down: a request after close is refused, not silently served', async () => {
  const handle = await startLoopbackServer();
  handle.setDispatcher((_req, res) => sendJson(res, 200, { ok: true }));
  const before = await fetch(handle.base);
  assert.equal(before.status, 200);

  await handle.close();

  await assert.rejects(() => fetch(handle.base), /fetch failed|ECONNREFUSED/);
});
