import test from 'node:test';
import assert from 'node:assert/strict';
import { startFakeGithub } from '../../test/fake-github.mjs';
import { githubRequest } from './api.mjs';

test('a POST round-trips a JSON body', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  github.state.installations.push({ id: 1, app_id: 1, account: { login: 'fake-admin' }, repositories: [] });

  process.env.CAIRN_GITHUB_API_BASE = github.apiBase;
  t.after(() => {
    delete process.env.CAIRN_GITHUB_API_BASE;
  });

  const { status, json } = await githubRequest('POST', '/user/repos', {
    token: 'a-token',
    body: { name: 'roundtrip-repo', auto_init: true }
  });
  assert.equal(status, 201);
  assert.equal(json.name, 'roundtrip-repo');

  const seen = github.requests.find((r) => r.method === 'POST' && r.pathname === '/user/repos');
  assert.ok(seen);
  const created = github.state.repos.find((repo) => repo.name === 'roundtrip-repo');
  assert.ok(created, 'the fake saw the body and created the repo');
});

test('a 422 comes back as a status without throwing', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  github.state.installations.push({ id: 1, app_id: 1, account: { login: 'fake-admin' }, repositories: [] });

  process.env.CAIRN_GITHUB_API_BASE = github.apiBase;
  t.after(() => {
    delete process.env.CAIRN_GITHUB_API_BASE;
  });

  await githubRequest('POST', '/user/repos', { token: 'a-token', body: { name: 'dup' } });
  const { status, json } = await githubRequest('POST', '/user/repos', { token: 'a-token', body: { name: 'dup' } });
  assert.equal(status, 422);
  assert.equal(json.errors[0].field, 'name');
});

test('a 204 yields a null json body', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());

  process.env.CAIRN_GITHUB_API_BASE = github.apiBase;
  t.after(() => {
    delete process.env.CAIRN_GITHUB_API_BASE;
  });

  // No fake route 204s by default (the one that used to, PUT .../repositories/:rid, was
  // amended to the observed 403 refusal for a user token); arm a one-shot 204 to test
  // githubRequest's own empty-body handling in isolation from any particular route's status.
  github.failNext('link', 204, undefined);
  const { status, json } = await githubRequest('PUT', '/user/installations/7/repositories/42', { token: 'a-token' });
  assert.equal(status, 204);
  assert.equal(json, null);
});

test('the token lands in the authorization header', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());

  process.env.CAIRN_GITHUB_API_BASE = github.apiBase;
  t.after(() => {
    delete process.env.CAIRN_GITHUB_API_BASE;
  });

  const { status, json } = await githubRequest('GET', '/user', { token: 'my-user-token' });
  assert.equal(status, 200);
  assert.equal(json._authorization, 'Bearer my-user-token');
});

test('the jwt lands in the authorization header when no token is given', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());

  process.env.CAIRN_GITHUB_API_BASE = github.apiBase;
  t.after(() => {
    delete process.env.CAIRN_GITHUB_API_BASE;
  });

  const { json } = await githubRequest('GET', '/user', { jwt: 'a-fake-jwt' });
  assert.equal(json._authorization, 'Bearer a-fake-jwt');
});

test('base URLs are read from the env at call time', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());

  delete process.env.CAIRN_GITHUB_API_BASE;
  process.env.CAIRN_GITHUB_API_BASE = github.apiBase;
  try {
    const { status } = await githubRequest('GET', '/user', {});
    assert.equal(status, 200);
    const seen = github.requests.find((r) => r.method === 'GET' && r.pathname === '/user');
    assert.ok(seen);
  } finally {
    delete process.env.CAIRN_GITHUB_API_BASE;
  }
});

test('a network-level failure rejects with a wrapped error', async (t) => {
  const { createServer } = await import('node:net');
  const closedPortServer = createServer();
  await new Promise((resolve) => closedPortServer.listen(0, '127.0.0.1', resolve));
  const port = closedPortServer.address().port;
  await new Promise((resolve) => closedPortServer.close(resolve));

  process.env.CAIRN_GITHUB_API_BASE = `http://127.0.0.1:${port}`;
  t.after(() => {
    delete process.env.CAIRN_GITHUB_API_BASE;
  });

  await assert.rejects(
    () => githubRequest('GET', '/user', {}),
    (error) => {
      assert.match(error.message, /^github: could not reach/);
      assert.ok(error.cause);
      return true;
    }
  );
});
