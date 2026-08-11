import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { makeFakeBin } from '../../test/fake-bin.mjs';

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

test('the seed SQL carries the normalized email, the owner insert, and a 64-char hex hash', async (t) => {
  const scaffoldDir = await mkdtemp(path.join(tmpdir(), 'cairn-scaffold-'));
  t.after(() => rm(scaffoldDir, { recursive: true, force: true }));

  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  const { seedOwnerAndToken } = await import('./bootstrap.mjs');
  await seedOwnerAndToken({
    dir: scaffoldDir,
    email: '  T3-Spike@Example.COM  ',
    log: () => {},
    now: 1000
  });

  const [invocation] = await fake.invocations();
  assert.deepEqual(invocation.argv.slice(0, 5), ['d1', 'execute', 'AUTH_DB', '--remote', '--command']);
  const sql = invocation.argv[5];

  assert.match(sql, /'t3-spike@example\.com'/);
  assert.doesNotMatch(sql, /Example\.COM/);
  assert.match(sql, /INSERT INTO editor .*ON CONFLICT\(email\) DO NOTHING/s);
  assert.match(sql, /DELETE FROM magic_token WHERE email = 't3-spike@example\.com'/);

  const hashMatch = sql.match(/INSERT INTO magic_token \(token_hash, email, expires_at, created_at\)\s*\n?\s*VALUES \('([0-9a-f]+)'/);
  assert.ok(hashMatch, 'expected the magic_token insert to carry a hex token_hash');
  assert.equal(hashMatch[1].length, 64);
  assert.equal(hashMatch[1], hashMatch[1].toLowerCase());
});

test('the returned confirmPath token hashes to the same value written in the SQL', async (t) => {
  const scaffoldDir = tmpdir();
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  const { seedOwnerAndToken } = await import('./bootstrap.mjs');
  const { confirmPath } = await seedOwnerAndToken({
    dir: scaffoldDir,
    email: 'owner@example.com',
    log: () => {},
    now: 2000
  });

  const [invocation] = await fake.invocations();
  const sql = invocation.argv[5];
  const hashMatch = sql.match(/token_hash, email, expires_at, created_at\)\s*\n?\s*VALUES \('([0-9a-f]{64})'/);
  assert.ok(hashMatch, 'expected a token_hash in the SQL');

  const prefix = '/admin/auth/confirm?token=';
  assert.ok(confirmPath.startsWith(prefix));
  const token = decodeURIComponent(confirmPath.slice(prefix.length));
  const computedHash = createHash('sha256').update(token).digest('hex');
  assert.equal(computedHash, hashMatch[1]);
});

test('an email with a quote is escaped by doubling and does not break the SQL', async (t) => {
  const scaffoldDir = tmpdir();
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  const { seedOwnerAndToken } = await import('./bootstrap.mjs');
  await seedOwnerAndToken({
    dir: scaffoldDir,
    email: "o'brien@example.com",
    log: () => {},
    now: 3000
  });

  const [invocation] = await fake.invocations();
  const sql = invocation.argv[5];

  assert.match(sql, /'o''brien@example\.com'/);
  assert.doesNotMatch(sql, /[^']o'brien/);
});

test('a failing execute rejects with the seed-failed catalogue error', async (t) => {
  const scaffoldDir = tmpdir();
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  await fake.respond('d1 execute', { code: 1, stderr: 'D1_ERROR: no such table: editor' });
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  const { seedOwnerAndToken } = await import('./bootstrap.mjs');

  await assert.rejects(
    () => seedOwnerAndToken({ dir: scaffoldDir, email: 'owner@example.com', log: () => {}, now: 4000 }),
    (err) => {
      assert.equal(err.catalogue.code, 'seed-failed');
      return true;
    }
  );
});

test('the raw token never lands under the scaffold dir or CAIRN_STATE_DIR', async (t) => {
  const scaffoldDir = await mkdtemp(path.join(tmpdir(), 'cairn-scaffold-'));
  t.after(() => rm(scaffoldDir, { recursive: true, force: true }));
  const stateDir = await mkdtemp(path.join(tmpdir(), 'cairn-state-'));
  process.env.CAIRN_STATE_DIR = stateDir;
  t.after(() => { delete process.env.CAIRN_STATE_DIR; });
  t.after(() => rm(stateDir, { recursive: true, force: true }));

  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  const { seedOwnerAndToken } = await import('./bootstrap.mjs');
  const { confirmPath } = await seedOwnerAndToken({
    dir: scaffoldDir,
    email: 'owner@example.com',
    log: () => {},
    now: 5000
  });

  const prefix = '/admin/auth/confirm?token=';
  const rawToken = decodeURIComponent(confirmPath.slice(prefix.length));

  const scaffoldText = await readAllFiles(scaffoldDir);
  assert.doesNotMatch(scaffoldText, new RegExp(rawToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  const stateText = await readAllFiles(stateDir);
  assert.doesNotMatch(stateText, new RegExp(rawToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('now injection produces an expires_at of now plus ten minutes', async (t) => {
  const scaffoldDir = tmpdir();
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  const { seedOwnerAndToken } = await import('./bootstrap.mjs');
  const now = 1_700_000_000_000;
  await seedOwnerAndToken({ dir: scaffoldDir, email: 'owner@example.com', log: () => {}, now });

  const [invocation] = await fake.invocations();
  const sql = invocation.argv[5];
  assert.match(sql, new RegExp(`VALUES \\('[0-9a-f]{64}', 'owner@example\\.com', ${now + 600000}, ${now}\\)`));
});
