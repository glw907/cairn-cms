import test from 'node:test';
import assert from 'node:assert/strict';
import { createSign } from 'node:crypto';
import { startFakeGithub } from './fake-github.mjs';

/** Sign a GitHub App JWT (RS256) with the given app id and PKCS#1 private key PEM. */
function signAppJwt(appId, privateKeyPem) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ iat: now - 60, exp: now + 540, iss: String(appId) })).toString('base64url');
  const signingInput = `${header}.${payload}`;
  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign(privateKeyPem).toString('base64url');
  return `${signingInput}.${signature}`;
}

/** Run the manifest conversion and return the parsed app registration. */
async function convertManifest(github, { name = 'App', callbackUrls = ['http://127.0.0.1/cb'] } = {}) {
  const res = await fetch(`${github.apiBase}/app-manifests/fake-code/conversions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, callback_urls: callbackUrls })
  });
  assert.equal(res.status, 201);
  return res.json();
}

test('manifest conversion registers the app', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());

  const app = await convertManifest(github);
  assert.equal(typeof app.id, 'number');
  assert.equal(typeof app.client_id, 'string');
  assert.equal(typeof app.client_secret, 'string');
  assert.ok(app.pem.includes('BEGIN RSA PRIVATE KEY'));
  assert.equal(github.state.apps.length, 1);
  assert.deepEqual(github.state.apps[0].callback_urls, ['http://127.0.0.1/cb']);

  const expired = await fetch(`${github.apiBase}/app-manifests/expired/conversions`, { method: 'POST' });
  assert.equal(expired.status, 404);
});

test('authorize with a mismatched redirect_uri does not redirect', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  const app = await convertManifest(github);

  const res = await fetch(
    `${github.webBase}/login/oauth/authorize?client_id=${app.client_id}&redirect_uri=${encodeURIComponent('http://evil.example/cb')}&state=xyz`,
    { redirect: 'manual' }
  );
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('location'), null);
});

test('authorize with a portlessly registered callback and a ported request redirects', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  const app = await convertManifest(github);

  const res = await fetch(
    `${github.webBase}/login/oauth/authorize?client_id=${app.client_id}&redirect_uri=${encodeURIComponent('http://127.0.0.1:54321/cb')}&state=xyz`,
    { redirect: 'manual' }
  );
  assert.equal(res.status, 302);
  const location = res.headers.get('location');
  assert.ok(location.startsWith('http://127.0.0.1:54321/cb'));
  assert.ok(location.includes('code=fake-code'));
  assert.ok(location.includes('state=xyz'));
});

test('repo create 404s without an installation and succeeds once one is pushed', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());

  const before = await fetch(`${github.apiBase}/user/repos`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'my-site' })
  });
  assert.equal(before.status, 404);

  github.state.installations.push({ id: 1, app_id: 1, account: { login: 'fake-admin' }, repositories: [] });

  const after = await fetch(`${github.apiBase}/user/repos`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'my-site', auto_init: true })
  });
  assert.equal(after.status, 201);
  const repo = await after.json();
  assert.equal(repo.full_name, 'fake-admin/my-site');
  assert.equal(repo.default_branch, 'main');
});

test('creating a repo with an existing name 422s with GitHub\'s error shape', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  github.state.installations.push({ id: 1, app_id: 1, account: { login: 'fake-admin' }, repositories: [] });

  await fetch(`${github.apiBase}/user/repos`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'dup' })
  });
  const res = await fetch(`${github.apiBase}/user/repos`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'dup' })
  });
  assert.equal(res.status, 422);
  const body = await res.json();
  assert.equal(body.errors[0].field, 'name');
});

test('git data 409s before auto_init seeding and works after', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  github.state.installations.push({ id: 1, app_id: 1, account: { login: 'fake-admin' }, repositories: [] });

  await fetch(`${github.apiBase}/user/repos`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'empty-repo' })
  });
  const blobBefore = await fetch(`${github.apiBase}/repos/fake-admin/empty-repo/git/blobs`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: 'hello', encoding: 'utf-8' })
  });
  assert.equal(blobBefore.status, 409);

  await fetch(`${github.apiBase}/user/repos`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'seeded-repo', auto_init: true })
  });
  const blobAfter = await fetch(`${github.apiBase}/repos/fake-admin/seeded-repo/git/blobs`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: 'hello', encoding: 'utf-8' })
  });
  assert.equal(blobAfter.status, 201);
  const blobBody = await blobAfter.json();
  assert.equal(typeof blobBody.sha, 'string');
  assert.equal(blobBody.sha.length, 40);

  const refBefore = await fetch(`${github.apiBase}/repos/fake-admin/empty-repo/git/ref/heads/main`);
  assert.equal(refBefore.status, 409);
  const refAfter = await fetch(`${github.apiBase}/repos/fake-admin/seeded-repo/git/ref/heads/main`);
  assert.equal(refAfter.status, 200);
  const refBody = await refAfter.json();
  assert.equal(typeof refBody.object.sha, 'string');

  const dupRef = await fetch(`${github.apiBase}/repos/fake-admin/seeded-repo/git/refs`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ref: 'refs/heads/main', sha: refBody.object.sha })
  });
  assert.equal(dupRef.status, 422);
});

test('GET /app/installations verifies the App JWT against the registered PEM', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  const app = await convertManifest(github);
  github.state.installations.push({ id: 1, app_id: app.id, account: { login: 'acme' }, repositories: [] });

  const jwt = signAppJwt(app.id, app.pem);
  const good = await fetch(`${github.apiBase}/app/installations`, { headers: { authorization: `Bearer ${jwt}` } });
  assert.equal(good.status, 200);
  const list = await good.json();
  assert.equal(list.length, 1);

  const bad = await fetch(`${github.apiBase}/app/installations`, { headers: { authorization: 'Bearer not-a-jwt' } });
  assert.equal(bad.status, 401);
});

test('requests logs every request across both servers', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());

  await fetch(`${github.apiBase}/user`, { headers: { authorization: 'token abc' } });
  await fetch(`${github.webBase}/login/oauth/access_token`, { method: 'POST' });

  assert.ok(github.requests.some((r) => r.method === 'GET' && r.pathname === '/user' && r.authorization === 'token abc'));
  assert.ok(github.requests.some((r) => r.method === 'POST' && r.pathname === '/login/oauth/access_token'));
});

test('failNext fires exactly once', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());

  github.failNext('user', 404, { message: 'boom' });

  const first = await fetch(`${github.apiBase}/user`);
  assert.equal(first.status, 404);
  const firstBody = await first.json();
  assert.equal(firstBody.message, 'boom');

  const second = await fetch(`${github.apiBase}/user`);
  assert.equal(second.status, 200);
  const secondBody = await second.json();
  assert.equal(secondBody.login, 'fake-admin');
});
