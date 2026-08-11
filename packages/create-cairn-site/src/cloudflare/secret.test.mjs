import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { makeFakeBin } from '../../test/fake-bin.mjs';

/** An obviously fake PEM, never a real key, standing in for the App's private key. */
const FAKE_PEM =
  '-----BEGIN PRIVATE KEY-----\nTOTALLYFAKEKEYMATERIAL\n-----END PRIVATE KEY-----\n';

/**
 * Point CAIRN_STATE_DIR at a fresh temporary directory for the duration of one test, mirroring
 * state.test.mjs and deploy.test.mjs's own helper.
 * @param {import('node:test').TestContext} t the running test's context
 * @returns {Promise<string>} the state directory's absolute path
 */
async function freshStateDir(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-state-'));
  process.env.CAIRN_STATE_DIR = dir;
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

/**
 * Seed a state record shaped like a site that just finished the GitHub chapter, carrying a PEM
 * plus the sibling fields the deep merge must leave untouched.
 * @param {string} siteId the site id to seed
 * @returns {Promise<void>}
 */
async function seedSite(siteId) {
  const { saveSite } = await import('../state.mjs');
  await saveSite(siteId, {
    name: 'Alpine Club',
    step: 'deployed',
    github: {
      appId: 42,
      clientSecret: 'fake-client-secret',
      pem: FAKE_PEM,
      owner: 'alpine-club-owner',
      installationId: 77
    }
  });
}

/**
 * Recursively read every file under `root` and return their concatenated text, for scanning a
 * scaffold directory or the state directory for a secret that should never have landed there.
 * @param {string} root the directory to walk
 * @returns {Promise<string>} the joined contents of every file found
 */
async function readAllFiles(root) {
  let text = '';
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      text += await readAllFiles(full);
    } else {
      text += await readFile(full, 'utf8');
    }
  }
  return text;
}

test('moves the PEM to a Worker secret and deletes it from state, keeping siblings', async (t) => {
  const stateDir = await freshStateDir(t);
  const scaffoldDir = await mkdtemp(path.join(tmpdir(), 'cairn-scaffold-'));
  t.after(() => rm(scaffoldDir, { recursive: true, force: true }));
  await seedSite('alpine-club-000001');

  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  const { movePemToWorkerSecret } = await import('./secret.mjs');
  const log = [];
  await movePemToWorkerSecret({
    siteId: 'alpine-club-000001',
    dir: scaffoldDir,
    log: (line) => log.push(line)
  });

  const [invocation] = await fake.invocations();
  assert.deepEqual(invocation.argv, ['secret', 'put', 'GITHUB_APP_PRIVATE_KEY_B64']);
  assert.equal(invocation.stdin, Buffer.from(FAKE_PEM).toString('base64'));

  const { loadSite } = await import('../state.mjs');
  const state = await loadSite('alpine-club-000001');
  assert.equal('pem' in state.github, false);
  assert.equal(state.github.appId, 42);
  assert.equal(state.github.clientSecret, 'fake-client-secret');
  assert.equal(state.github.owner, 'alpine-club-owner');
  assert.equal(state.github.installationId, 77);

  const scaffoldText = await readAllFiles(scaffoldDir);
  assert.doesNotMatch(scaffoldText, /TOTALLYFAKEKEYMATERIAL/);
  const stateFileText = await readFile(path.join(stateDir, 'alpine-club-000001.json'), 'utf8');
  assert.doesNotMatch(stateFileText, /TOTALLYFAKEKEYMATERIAL/);
  assert.doesNotMatch(stateFileText, /BEGIN PRIVATE KEY/);
});

test('a second call makes zero wrangler invocations and logs the already-moved line', async (t) => {
  await freshStateDir(t);
  const scaffoldDir = tmpdir();
  await seedSite('alpine-club-000002');

  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  const { movePemToWorkerSecret } = await import('./secret.mjs');
  await movePemToWorkerSecret({ siteId: 'alpine-club-000002', dir: scaffoldDir, log: () => {} });
  assert.equal((await fake.invocations()).length, 1);

  const log = [];
  await movePemToWorkerSecret({
    siteId: 'alpine-club-000002',
    dir: scaffoldDir,
    log: (line) => log.push(line)
  });
  assert.equal((await fake.invocations()).length, 1);
  assert.ok(log.some((line) => /already a Worker secret/i.test(line)));
});

test('a failing put leaves the PEM in state and rejects with secret-put-failed', async (t) => {
  await freshStateDir(t);
  const scaffoldDir = tmpdir();
  await seedSite('alpine-club-000003');

  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  await fake.respond('secret put', { code: 1, stderr: 'Authentication error [code: 10000]' });
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  const { movePemToWorkerSecret } = await import('./secret.mjs');

  await assert.rejects(
    () => movePemToWorkerSecret({ siteId: 'alpine-club-000003', dir: scaffoldDir, log: () => {} }),
    (err) => {
      assert.equal(err.catalogue.code, 'secret-put-failed');
      return true;
    }
  );

  const { loadSite } = await import('../state.mjs');
  const state = await loadSite('alpine-club-000003');
  assert.equal(state.github.pem, FAKE_PEM);
});

test('an unspawnable wrangler rejects with wrangler-unavailable, leaves the PEM, no stream crash', async (t) => {
  await freshStateDir(t);
  const scaffoldDir = tmpdir();
  await seedSite('alpine-club-000004');

  process.env.CAIRN_WRANGLER_BIN = '/no/such/wrangler-binary-anywhere';
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  const { movePemToWorkerSecret } = await import('./secret.mjs');

  await assert.rejects(
    () => movePemToWorkerSecret({ siteId: 'alpine-club-000004', dir: scaffoldDir, log: () => {} }),
    (err) => {
      assert.equal(err.catalogue.code, 'wrangler-unavailable');
      return true;
    }
  );

  const { loadSite } = await import('../state.mjs');
  const state = await loadSite('alpine-club-000004');
  assert.equal(state.github.pem, FAKE_PEM);
});
