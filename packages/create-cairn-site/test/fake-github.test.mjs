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

test('a created repo is auto-added to its covering installation, and suppressAutoLink skips it once', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  github.state.installations.push({ id: 1, app_id: 1, account: { login: 'fake-admin' }, repositories: [] });

  const created = await fetch(`${github.apiBase}/user/repos`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'auto-linked', auto_init: true })
  });
  const repo = await created.json();

  const linked = await fetch(`${github.apiBase}/user/installations/1/repositories`);
  const linkedBody = await linked.json();
  assert.ok(linkedBody.repositories.some((candidate) => candidate.id === repo.id));

  github.state.suppressAutoLink = true;
  await fetch(`${github.apiBase}/user/repos`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'not-linked', auto_init: true })
  });
  const stillOnlyOne = await fetch(`${github.apiBase}/user/installations/1/repositories`);
  const stillOnlyOneBody = await stillOnlyOne.json();
  assert.equal(stillOnlyOneBody.repositories.length, 1);

  // The seam is one-shot: a third create auto-adds again.
  await fetch(`${github.apiBase}/user/repos`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'linked-again', auto_init: true })
  });
  const backToTwo = await fetch(`${github.apiBase}/user/installations/1/repositories`);
  const backToTwoBody = await backToTwo.json();
  assert.equal(backToTwoBody.repositories.length, 2);
});

test('PUT install/repositories link is refused for a user token by default, and failNext can still override it', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  github.state.installations.push({ id: 1, app_id: 1, account: { login: 'fake-admin' }, repositories: [] });

  const refused = await fetch(`${github.apiBase}/user/installations/1/repositories/99`, { method: 'PUT' });
  assert.equal(refused.status, 403);
  const refusedBody = await refused.json();
  assert.equal(refusedBody.message, 'Resource not accessible by integration');

  github.failNext('link', 204, {});
  const overridden = await fetch(`${github.apiBase}/user/installations/1/repositories/99`, { method: 'PUT' });
  assert.equal(overridden.status, 204);
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

/**
 * Create a seeded (auto_init) repo owned by `fake-admin`, via a real installation and the fake's
 * own repo-create route, and return its name. Shared setup for the Git Data read-path tests
 * below, which all need somewhere to write blobs, trees, commits, and refs before reading them
 * back.
 * @param {import('./fake-github.mjs').FakeGithub} github the running fake
 * @param {string} name the repo's name
 * @returns {Promise<void>}
 */
async function createSeededRepo(github, name) {
  github.state.installations.push({ id: 1, app_id: 1, account: { login: 'fake-admin' }, repositories: [] });
  await fetch(`${github.apiBase}/user/repos`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, auto_init: true })
  });
}

test('GET /repos/:owner/:repo returns the repo with a numeric owner id, and 404s for an unknown repo', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  await createSeededRepo(github, 'alpine-club-cms');

  const res = await fetch(`${github.apiBase}/repos/fake-admin/alpine-club-cms`);
  assert.equal(res.status, 200);
  const repo = await res.json();
  assert.equal(typeof repo.id, 'number');
  assert.equal(repo.owner.login, 'fake-admin');
  assert.equal(typeof repo.owner.id, 'number');
  assert.equal(repo.default_branch, 'main');

  const missing = await fetch(`${github.apiBase}/repos/fake-admin/does-not-exist`);
  assert.equal(missing.status, 404);
});

test('a private repo answers 404 to every anonymous read, and serves the same reads to a bearer', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  github.state.installations.push({ id: 1, app_id: 1, account: { login: 'fake-admin' }, repositories: [] });
  await fetch(`${github.apiBase}/user/repos`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'private-repo', auto_init: true, private: true })
  });

  const authorized = { headers: { authorization: 'Bearer fake-user-token' } };
  const refRead = await fetch(`${github.apiBase}/repos/fake-admin/private-repo/git/ref/heads/main`, authorized);
  assert.equal(refRead.status, 200);
  const headSha = (await refRead.json()).object.sha;

  for (const readPath of [
    '/repos/fake-admin/private-repo',
    '/repos/fake-admin/private-repo/git/ref/heads/main',
    `/repos/fake-admin/private-repo/git/commits/${headSha}`
  ]) {
    const anonymous = await fetch(`${github.apiBase}${readPath}`);
    assert.equal(anonymous.status, 404, `expected an anonymous read of ${readPath} to 404`);
    assert.equal((await anonymous.json()).message, 'Not Found');

    const withToken = await fetch(`${github.apiBase}${readPath}`, authorized);
    assert.equal(withToken.status, 200, `expected a bearer read of ${readPath} to succeed`);
  }
});

test('GET /users/:login serves an owner numeric id anonymously, matching the id a repo read reports', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  await createSeededRepo(github, 'public-repo');

  const user = await fetch(`${github.apiBase}/users/fake-admin`);
  assert.equal(user.status, 200);
  const body = await user.json();
  assert.equal(body.login, 'fake-admin');
  assert.equal(typeof body.id, 'number');

  const repo = await (await fetch(`${github.apiBase}/repos/fake-admin/public-repo`)).json();
  assert.equal(body.id, repo.owner.id, 'the public user read and the repo read must agree on the owner id');
});

test('GET /repos/:owner/:repo reports the same owner id across repos owned by the same login', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  await createSeededRepo(github, 'first-repo');
  await createSeededRepo(github, 'second-repo');

  const first = await (await fetch(`${github.apiBase}/repos/fake-admin/first-repo`)).json();
  const second = await (await fetch(`${github.apiBase}/repos/fake-admin/second-repo`)).json();
  assert.equal(first.owner.id, second.owner.id);
});

test('GET .../git/trees/:sha round-trips a posted tree verbatim, matching the real recursive=1 shape', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  await createSeededRepo(github, 'tree-repo');

  const posted = [
    { path: 'wrangler.jsonc', mode: '100644', type: 'blob', sha: 'a'.repeat(40) },
    { path: 'src/theme/cairn.config.ts', mode: '100644', type: 'blob', sha: 'b'.repeat(40) }
  ];
  const created = await fetch(`${github.apiBase}/repos/fake-admin/tree-repo/git/trees`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tree: posted })
  });
  const { sha } = await created.json();

  const read = await fetch(`${github.apiBase}/repos/fake-admin/tree-repo/git/trees/${sha}?recursive=1`);
  assert.equal(read.status, 200);
  const body = await read.json();
  assert.equal(body.sha, sha);
  assert.equal(body.truncated, false);
  assert.deepEqual(body.tree, posted);

  const missing = await fetch(`${github.apiBase}/repos/fake-admin/tree-repo/git/trees/${'0'.repeat(40)}`);
  assert.equal(missing.status, 404);
});

test('GET .../git/blobs/:sha round-trips posted base64 content', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  await createSeededRepo(github, 'blob-repo');

  const encoded = Buffer.from('account_id placeholder', 'utf8').toString('base64');
  const created = await fetch(`${github.apiBase}/repos/fake-admin/blob-repo/git/blobs`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: encoded, encoding: 'base64' })
  });
  const { sha } = await created.json();

  const read = await fetch(`${github.apiBase}/repos/fake-admin/blob-repo/git/blobs/${sha}`);
  assert.equal(read.status, 200);
  const body = await read.json();
  assert.equal(body.sha, sha);
  assert.equal(body.encoding, 'base64');
  assert.equal(body.content, encoded);
  assert.equal(Buffer.from(body.content, 'base64').toString('utf8'), 'account_id placeholder');

  const missing = await fetch(`${github.apiBase}/repos/fake-admin/blob-repo/git/blobs/${'0'.repeat(40)}`);
  assert.equal(missing.status, 404);
});

test('a created and re-read commit carries tree as { sha, url }, never a bare string', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  await createSeededRepo(github, 'commit-repo');

  const refBefore = await (await fetch(`${github.apiBase}/repos/fake-admin/commit-repo/git/ref/heads/main`)).json();
  const treeCreated = await fetch(`${github.apiBase}/repos/fake-admin/commit-repo/git/trees`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tree: [] })
  });
  const { sha: treeSha } = await treeCreated.json();

  const commitCreated = await fetch(`${github.apiBase}/repos/fake-admin/commit-repo/git/commits`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: 'reconcile', tree: treeSha, parents: [refBefore.object.sha] })
  });
  assert.equal(commitCreated.status, 201);
  const createdBody = await commitCreated.json();
  assert.equal(createdBody.tree.sha, treeSha);
  assert.equal(typeof createdBody.tree.url, 'string');

  const read = await fetch(`${github.apiBase}/repos/fake-admin/commit-repo/git/commits/${createdBody.sha}`);
  const readBody = await read.json();
  assert.equal(readBody.tree.sha, treeSha);
  assert.equal(typeof readBody.tree.url, 'string');
});

test('POST .../git/trees with base_tree merges onto the base by path, rather than replacing it', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  await createSeededRepo(github, 'merge-repo');

  const baseCreated = await fetch(`${github.apiBase}/repos/fake-admin/merge-repo/git/trees`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      tree: [
        { path: 'wrangler.jsonc', mode: '100644', type: 'blob', sha: 'a'.repeat(40) },
        { path: 'posts/hello.md', mode: '100644', type: 'blob', sha: 'c'.repeat(40) }
      ]
    })
  });
  const { sha: baseSha } = await baseCreated.json();

  const mergedCreated = await fetch(`${github.apiBase}/repos/fake-admin/merge-repo/git/trees`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      base_tree: baseSha,
      tree: [{ path: 'wrangler.jsonc', mode: '100644', type: 'blob', sha: 'd'.repeat(40) }]
    })
  });
  assert.equal(mergedCreated.status, 201);
  const { sha: mergedSha } = await mergedCreated.json();

  const read = await fetch(`${github.apiBase}/repos/fake-admin/merge-repo/git/trees/${mergedSha}`);
  const body = await read.json();
  const byPath = Object.fromEntries(body.tree.map((entryItem) => [entryItem.path, entryItem.sha]));
  assert.equal(byPath['wrangler.jsonc'], 'd'.repeat(40), 'the named path must be overridden');
  assert.equal(byPath['posts/hello.md'], 'c'.repeat(40), 'an untouched base path must survive the merge');
  assert.equal(body.tree.length, 2, 'no extra entries beyond the base plus the override');
});

test('refs-read and refs-update are independently failable: failNext on one never intercepts the other', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  await createSeededRepo(github, 'refs-repo');

  github.failNext('refs-update', 422, { message: 'Update is not a fast forward' });

  // The read route must be untouched by the update route's armed failure.
  const read = await fetch(`${github.apiBase}/repos/fake-admin/refs-repo/git/ref/heads/main`);
  assert.equal(read.status, 200);
  const readBody = await read.json();

  const update = await fetch(`${github.apiBase}/repos/fake-admin/refs-repo/git/refs/heads/main`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sha: readBody.object.sha })
  });
  assert.equal(update.status, 422);

  // The one-shot override is now spent; a second update succeeds normally.
  const secondUpdate = await fetch(`${github.apiBase}/repos/fake-admin/refs-repo/git/refs/heads/main`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sha: readBody.object.sha })
  });
  assert.equal(secondUpdate.status, 200);
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
