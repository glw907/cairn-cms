import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { startFakeGithub, pointAtFake } from '../../test/fake-github.mjs';
import { createRepo, verifyInstallationCovers, pushScaffold, TOOL_COMMIT_MESSAGE } from './repo.mjs';

/** Seed one installation covering `fake-admin`, the fake's own hardcoded /user/repos owner. */
function seedInstallation(github) {
  github.state.installations.push({ id: 1, app_id: 1, account: { login: 'fake-admin' }, repositories: [] });
}

/**
 * Build a fixture scaffold directory: a couple of real files, a nested directory, and the two
 * kinds of entries pushScaffold must skip (`node_modules`, `.git`).
 * @param {import('node:test').TestContext} t the running test's context
 * @returns {Promise<string>} the fixture directory's absolute path
 */
async function fixtureDir(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-repo-push-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await writeFile(path.join(dir, 'README.md'), '# Alpine Club\n');
  await mkdir(path.join(dir, 'posts'), { recursive: true });
  await writeFile(path.join(dir, 'posts/hello.md'), '# Hello\n');
  await mkdir(path.join(dir, 'node_modules'), { recursive: true });
  await writeFile(path.join(dir, 'node_modules/junk'), 'not shipped\n');
  await mkdir(path.join(dir, '.git'), { recursive: true });
  await writeFile(path.join(dir, '.git/config'), 'not shipped either\n');
  return dir;
}

test('createRepo: 404 without an installation is an internal invariant violation, not a catalogue error', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);

  await assert.rejects(
    () => createRepo('fake-user-token', { name: 'alpine-club', ownerType: 'user', dir: '/tmp/alpine-club' }),
    (err) => {
      assert.ok(!err.catalogue, 'a repo create before any installation is a plain Error, not a catalogue error');
      assert.match(err.message, /404/);
      assert.match(err.message, /Next step/);
      assert.match(err.message, /\/tmp\/alpine-club/);
      assert.ok(!err.message.includes('undefined'), `message must not contain "undefined": ${err.message}`);
      return true;
    }
  );
});

test('createRepo: succeeds for a user-owned repo once an installation exists, and seeds the git state', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);
  seedInstallation(github);

  const result = await createRepo('fake-user-token', { name: 'alpine-club', ownerType: 'user', dir: '/tmp/alpine-club' });
  assert.equal(result.owner, 'fake-admin');
  assert.equal(result.repo, 'alpine-club');
  assert.equal(typeof result.id, 'number');

  const gitEntry = github.state.gitObjects.get('fake-admin/alpine-club');
  assert.ok(gitEntry.seeded, 'auto_init: true must have seeded the git state');
});

test('createRepo: succeeds for an org-owned repo once an installation exists', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);
  seedInstallation(github);

  const result = await createRepo('fake-user-token', {
    name: 'alpine-club',
    ownerType: 'org',
    org: 'alpine-org',
    dir: '/tmp/alpine-club'
  });
  assert.equal(result.owner, 'alpine-org');
  assert.equal(result.repo, 'alpine-club');

  const gitEntry = github.state.gitObjects.get('alpine-org/alpine-club');
  assert.ok(gitEntry.seeded);
});

test('createRepo: a name collision raises repo-name-collision naming the passed dir, no literal undefined', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);
  seedInstallation(github);

  await createRepo('fake-user-token', { name: 'dup', ownerType: 'user', dir: '/tmp/alpine-club' });

  await assert.rejects(
    () => createRepo('fake-user-token', { name: 'dup', ownerType: 'user', dir: '/tmp/alpine-club' }),
    (err) => {
      assert.equal(err.catalogue.code, 'repo-name-collision');
      assert.match(err.message, /\/tmp\/alpine-club/);
      assert.ok(!err.message.includes('undefined'), `message must not contain "undefined": ${err.message}`);
      return true;
    }
  );
});

test('createRepo: an SSO-blocked 403 raises sso-blocked naming the passed dir, no literal undefined', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);
  seedInstallation(github);
  github.failNext('org_repos', 403, {
    message: 'Organization alpine-org has enabled SAML single sign-on and this authorization has not been granted.'
  });

  await assert.rejects(
    () =>
      createRepo('fake-user-token', {
        name: 'alpine-club',
        ownerType: 'org',
        org: 'alpine-org',
        appName: 'Alpine Club CMS',
        dir: '/tmp/alpine-club'
      }),
    (err) => {
      assert.equal(err.catalogue.code, 'sso-blocked');
      assert.match(err.message, /\/tmp\/alpine-club/);
      assert.ok(!err.message.includes('undefined'), `message must not contain "undefined": ${err.message}`);
      return true;
    }
  );
});

test('verifyInstallationCovers: passes once the fake auto-adds the created repo', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);
  seedInstallation(github);

  await createRepo('fake-user-token', { name: 'alpine-club', ownerType: 'user', dir: '/tmp/alpine-club' });

  await verifyInstallationCovers('fake-user-token', {
    installationId: 1,
    owner: 'fake-admin',
    repo: 'alpine-club',
    dir: '/tmp/alpine-club'
  });
});

test('verifyInstallationCovers: raises installation-not-covering-repo when suppressAutoLink kept it off', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);
  seedInstallation(github);
  github.state.suppressAutoLink = true;

  await createRepo('fake-user-token', { name: 'alpine-club', ownerType: 'user', dir: '/tmp/alpine-club' });

  await assert.rejects(
    () =>
      verifyInstallationCovers('fake-user-token', {
        installationId: 1,
        owner: 'fake-admin',
        repo: 'alpine-club',
        dir: '/tmp/alpine-club'
      }),
    (err) => {
      assert.equal(err.catalogue.code, 'installation-not-covering-repo');
      assert.match(err.message, /\/tmp\/alpine-club/);
      assert.ok(!err.message.includes('undefined'), `message must not contain "undefined": ${err.message}`);
      return true;
    }
  );
});

test('pushScaffold: pushes blobs, a full tree, and a commit parented on the seed sha, then patches the ref', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);
  seedInstallation(github);
  const dir = await fixtureDir(t);

  const { owner, repo } = await createRepo('fake-user-token', { name: 'alpine-club', ownerType: 'user', dir });
  const gitEntry = github.state.gitObjects.get(`${owner}/${repo}`);
  const seedSha = gitEntry.refs.get('heads/main');

  const logs = [];
  const result = await pushScaffold('fake-user-token', { owner, repo, dir, log: (line) => logs.push(line) });

  assert.equal(typeof result.commitSha, 'string');
  assert.ok(logs.some((line) => line === 'Pushing 2 files'), `expected a "Pushing 2 files" log line, got: ${logs.join(' | ')}`);

  const commit = gitEntry.commits.get(result.commitSha);
  assert.deepEqual(commit.parents, [seedSha]);
  assert.equal(commit.message, TOOL_COMMIT_MESSAGE);

  const tree = gitEntry.trees.get(commit.tree);
  const paths = tree.map((entry) => entry.path);
  assert.ok(paths.includes('README.md'));
  assert.ok(paths.includes('posts/hello.md'));
  assert.ok(!paths.includes('node_modules/junk'));
  assert.ok(!paths.some((p) => p.startsWith('.git/')));

  assert.equal(gitEntry.refs.get('heads/main'), result.commitSha);
});

test('pushScaffold: re-running after a completed push is idempotent, verified by request count', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);
  seedInstallation(github);
  const dir = await fixtureDir(t);

  const { owner, repo } = await createRepo('fake-user-token', { name: 'alpine-club', ownerType: 'user', dir });
  const first = await pushScaffold('fake-user-token', { owner, repo, dir, log: () => {} });

  const gitDataPosts = (r) =>
    r.filter(
      (entry) =>
        entry.method === 'POST' &&
        (entry.pathname.endsWith('/git/blobs') || entry.pathname.endsWith('/git/trees') || entry.pathname.endsWith('/git/commits'))
    ).length;
  const before = gitDataPosts(github.requests);

  const logs = [];
  const second = await pushScaffold('fake-user-token', { owner, repo, dir, log: (line) => logs.push(line) });

  const after = gitDataPosts(github.requests);
  assert.equal(second.commitSha, first.commitSha);
  assert.equal(after, before, 'a completed re-push must create zero new blobs/trees/commits');
  assert.ok(logs.length > 0, 'a re-push should still log that it found the push already landed');
});

test('pushScaffold: a mid-push 502 raises push-interrupted naming the passed dir', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);
  seedInstallation(github);
  const dir = await fixtureDir(t);

  const { owner, repo } = await createRepo('fake-user-token', { name: 'alpine-club', ownerType: 'user', dir });
  github.failNext('commits', 502, {});

  await assert.rejects(
    () => pushScaffold('fake-user-token', { owner, repo, dir, log: () => {} }),
    (err) => {
      assert.equal(err.catalogue.code, 'push-interrupted');
      assert.match(err.message, new RegExp(dir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      assert.ok(!err.message.includes('undefined'), `message must not contain "undefined": ${err.message}`);
      return true;
    }
  );
});
