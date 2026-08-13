import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { startFakeGithub, pointAtFake } from '../../test/fake-github.mjs';
import { createRepo, pushScaffold } from './repo.mjs';
import { reconcileRepo, RECONCILE_COMMIT_MESSAGE } from './reconcile.mjs';

const WRANGLER_RELATIVE = 'wrangler.jsonc';
const CAIRN_CONFIG_RELATIVE = 'src/theme/cairn.config.ts';

/**
 * Build a fixture scaffold directory carrying the two tool-owned files plus a couple of other
 * files a real scaffold ships, so a survival check has something concrete to look for.
 * @param {import('node:test').TestContext} t the running test's context
 * @param {{ wrangler?: string, cairnConfig?: string }} [content] overrides for either file's
 *  starting content
 * @returns {Promise<string>} the fixture directory's absolute path
 */
async function fixtureDir(t, { wrangler = '{ "name": "alpine-club" }\n', cairnConfig = "export const from = 'cms@example.test';\n" } = {}) {
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-reconcile-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await writeFile(path.join(dir, 'README.md'), '# Alpine Club\n');
  await mkdir(path.join(dir, 'posts'), { recursive: true });
  await writeFile(path.join(dir, 'posts/hello.md'), '# Hello\n');
  await writeFile(path.join(dir, WRANGLER_RELATIVE), wrangler);
  await mkdir(path.join(dir, 'src/theme'), { recursive: true });
  await writeFile(path.join(dir, CAIRN_CONFIG_RELATIVE), cairnConfig);
  return dir;
}

/**
 * Seed an installation, create a repo, and push a fixture scaffold into it, mirroring exactly
 * what chapter 1 does before chapter 3's reconcile ever runs.
 * @param {import('node:test').TestContext} t the running test's context
 * @param {import('../../test/fake-github.mjs').FakeGithub} github the running fake
 * @param {{ wrangler?: string, cairnConfig?: string }} [content] overrides for the pushed content
 * @returns {Promise<{ dir: string, record: object }>} the scaffold dir and a reconcileRepo-ready record
 */
async function pushInitialRepo(t, github, content) {
  github.state.installations.push({ id: 1, app_id: 1, account: { login: 'fake-admin' }, repositories: [] });
  const dir = await fixtureDir(t, content);
  const created = await createRepo('fake-user-token', { name: 'alpine-club', ownerType: 'user', dir });
  await pushScaffold('fake-user-token', { owner: created.owner, repo: created.repo, dir, log: () => {}, defaultBranch: created.defaultBranch });
  const record = {
    clientId: 'fake-client-1',
    clientSecret: 'fake-secret',
    installationId: 1,
    repo: { id: created.id, owner: created.owner, repo: created.repo, defaultBranch: created.defaultBranch }
  };
  return { dir, record };
}

/** Read the current HEAD commit's tree entries back out of the fake's own state. */
function readHeadTree(github, owner, repo, branch = 'main') {
  const gitEntry = github.state.gitObjects.get(`${owner}/${repo}`);
  const headSha = gitEntry.refs.get(`heads/${branch}`);
  const commit = gitEntry.commits.get(headSha);
  return gitEntry.trees.get(commit.tree);
}

/**
 * Simulate an admin editing the repo directly through the GitHub UI: create a new blob, a tree
 * merged onto the current head's tree (base_tree), a commit parented on the current head, and
 * advance the ref. Everything reconcileRepo itself will later do, driven here with raw fetch
 * calls so the test does not depend on the function under test to set its own fixture up.
 */
async function adminAddsFile(github, owner, repo, relativePath, content, branch = 'main') {
  const gitEntry = github.state.gitObjects.get(`${owner}/${repo}`);
  const headSha = gitEntry.refs.get(`heads/${branch}`);
  const headCommit = gitEntry.commits.get(headSha);

  const blob = await (
    await fetch(`${github.apiBase}/repos/${owner}/${repo}/git/blobs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: Buffer.from(content, 'utf8').toString('base64'), encoding: 'base64' })
    })
  ).json();

  const tree = await (
    await fetch(`${github.apiBase}/repos/${owner}/${repo}/git/trees`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        base_tree: headCommit.tree,
        tree: [{ path: relativePath, mode: '100644', type: 'blob', sha: blob.sha }]
      })
    })
  ).json();

  const commit = await (
    await fetch(`${github.apiBase}/repos/${owner}/${repo}/git/commits`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'Admin edit via the GitHub UI', tree: tree.sha, parents: [headSha] })
    })
  ).json();

  await fetch(`${github.apiBase}/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sha: commit.sha })
  });
}

test('reconcileRepo: an identical repo returns { changed: false } and makes zero write calls', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);

  const { dir, record } = await pushInitialRepo(t, github);
  const requestsBefore = github.requests.length;

  const result = await reconcileRepo({ record, dir, userToken: 'fake-user-token' });

  assert.deepEqual(result, { changed: false });
  const writesAfter = github.requests
    .slice(requestsBefore)
    .filter((r) => r.method === 'POST' || r.method === 'PATCH');
  assert.deepEqual(writesAfter, [], `expected zero write calls, got: ${JSON.stringify(writesAfter)}`);
});

test('reconcileRepo: a differing wrangler.jsonc commits both files in one commit, base_tree honored, ref advanced', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);

  const { dir, record } = await pushInitialRepo(t, github);
  const { owner, repo, defaultBranch } = record.repo;
  const headBefore = github.state.gitObjects.get(`${owner}/${repo}`).refs.get(`heads/${defaultBranch}`);

  await writeFile(path.join(dir, WRANGLER_RELATIVE), '{ "name": "alpine-club", "account_id": "acct-123" }\n');

  const commitsBefore = github.requests.filter((r) => r.method === 'POST' && r.pathname.endsWith('/git/commits')).length;
  const result = await reconcileRepo({ record, dir, userToken: 'fake-user-token' });

  assert.equal(result.changed, true);
  assert.equal(typeof result.commitSha, 'string');

  const commitsAfter = github.requests.filter((r) => r.method === 'POST' && r.pathname.endsWith('/git/commits')).length;
  assert.equal(commitsAfter - commitsBefore, 1, 'exactly one commit must be created');

  const gitEntry = github.state.gitObjects.get(`${owner}/${repo}`);
  assert.equal(gitEntry.refs.get(`heads/${defaultBranch}`), result.commitSha, 'the ref must advance to the new commit');
  assert.notEqual(gitEntry.refs.get(`heads/${defaultBranch}`), headBefore);

  const tree = readHeadTree(github, owner, repo, defaultBranch);
  const byPath = Object.fromEntries(tree.map((entry) => [entry.path, entry.sha]));
  assert.ok(WRANGLER_RELATIVE in byPath, 'the changed file must be in the new tree');
  assert.ok(CAIRN_CONFIG_RELATIVE in byPath, 'both tool-owned files must be in the new tree');
  // base_tree proof: files this reconcile never touched must still be present, which only
  // happens if the new tree was built onto the head's own tree rather than replacing it.
  assert.ok('README.md' in byPath, 'an untouched file must survive a base_tree-built commit');
  assert.ok('posts/hello.md' in byPath, 'an untouched nested file must survive a base_tree-built commit');

  const wranglerContent = Buffer.from(gitEntry.blobs.get(byPath[WRANGLER_RELATIVE]), 'base64').toString('utf8');
  assert.equal(wranglerContent, '{ "name": "alpine-club", "account_id": "acct-123" }\n');
});

test('reconcileRepo: a file the admin added after the scaffold push survives the reconcile', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);

  const { dir, record } = await pushInitialRepo(t, github);
  const { owner, repo, defaultBranch } = record.repo;

  await adminAddsFile(github, owner, repo, 'posts/admin-wrote-this.md', '# Admin post\n', defaultBranch);
  await writeFile(path.join(dir, WRANGLER_RELATIVE), '{ "name": "alpine-club", "account_id": "acct-123" }\n');

  const result = await reconcileRepo({ record, dir, userToken: 'fake-user-token' });
  assert.equal(result.changed, true);

  const tree = readHeadTree(github, owner, repo, defaultBranch);
  const paths = tree.map((entry) => entry.path);
  assert.ok(paths.includes('posts/admin-wrote-this.md'), 'the admin-added file must survive the reconcile commit');
});

test('reconcileRepo: a missing repo file is treated as differing', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);
  github.state.installations.push({ id: 1, app_id: 1, account: { login: 'fake-admin' }, repositories: [] });

  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-reconcile-missing-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const wranglerContent = '{ "name": "alpine-club" }\n';
  await writeFile(path.join(dir, WRANGLER_RELATIVE), wranglerContent);
  await mkdir(path.join(dir, 'src/theme'), { recursive: true });
  await writeFile(path.join(dir, CAIRN_CONFIG_RELATIVE), "export const from = 'cms@example.test';\n");

  // A repo pushed carrying only wrangler.jsonc, matching the local copy exactly: cairn.config.ts
  // was never pushed at all, the shape a from-scratch repo or a stripped-down fixture takes.
  const created = await createRepo('fake-user-token', { name: 'alpine-club', ownerType: 'user', dir });
  await adminAddsFile(github, created.owner, created.repo, WRANGLER_RELATIVE, wranglerContent);

  const record = {
    clientId: 'fake-client-1',
    clientSecret: 'fake-secret',
    installationId: 1,
    repo: { id: created.id, owner: created.owner, repo: created.repo, defaultBranch: created.defaultBranch }
  };

  const result = await reconcileRepo({ record, dir, userToken: 'fake-user-token' });
  assert.equal(result.changed, true, 'a repo missing one of the two tool-owned files must be treated as differing');

  const tree = readHeadTree(github, created.owner, created.repo, created.defaultBranch);
  assert.ok(tree.some((entry) => entry.path === CAIRN_CONFIG_RELATIVE), 'the missing file must be added by the reconcile commit');
});

test('reconcileRepo: a rejected ref PATCH maps to builds-push-refused', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);

  const { dir, record } = await pushInitialRepo(t, github);
  await writeFile(path.join(dir, WRANGLER_RELATIVE), '{ "name": "alpine-club", "account_id": "acct-123" }\n');

  github.failNext('refs-update', 422, { message: 'Update is not a fast forward' });

  await assert.rejects(
    () => reconcileRepo({ record, dir, userToken: 'fake-user-token' }),
    (err) => {
      assert.equal(err.catalogue.code, 'builds-push-refused');
      assert.equal(err.catalogue.kind, 'act');
      assert.match(err.message, /main/);
      assert.match(err.message, new RegExp(`${record.repo.owner}/${record.repo.repo}`));
      return true;
    }
  );
});

test('RECONCILE_COMMIT_MESSAGE is never read back as an idempotence sentinel', async (t) => {
  // Documents the deliberate choice, rather than asserting behavior a future refactor could
  // silently break without a red test: the message constant exists for the commit body only.
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);

  const { dir, record } = await pushInitialRepo(t, github);
  await writeFile(path.join(dir, WRANGLER_RELATIVE), '{ "name": "alpine-club", "account_id": "acct-123" }\n');
  const result = await reconcileRepo({ record, dir, userToken: 'fake-user-token' });

  const gitEntry = github.state.gitObjects.get(`${record.repo.owner}/${record.repo.repo}`);
  const commit = gitEntry.commits.get(result.commitSha);
  assert.equal(commit.message, RECONCILE_COMMIT_MESSAGE);

  // A second reconcile against the now-identical repo must report no change by DIFFING content,
  // not by reading this message back off HEAD.
  const second = await reconcileRepo({ record, dir, userToken: 'fake-user-token' });
  assert.deepEqual(second, { changed: false });
});
