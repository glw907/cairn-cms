import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { makeFakeBin } from '../../test/fake-bin.mjs';

/**
 * Build a `wrangler d1 execute --json` style result array: one entry per statement, in the
 * seed's own order (owner insert, delete, token insert), each carrying only the `meta.changes`
 * count the seed's own trust check reads.
 * @param {number} ownerChanges rows changed by the owner insert
 * @param {number} deleteChanges rows changed by the magic_token delete
 * @param {number} tokenChanges rows changed by the token insert
 * @returns {string} the JSON text pretty-printed and newline-terminated, real wrangler's shape
 */
function d1JsonStdout(ownerChanges, deleteChanges, tokenChanges) {
  // Keep the pretty-printed, newline-terminated shape. The compact single-line form this helper
  // first used ended without a newline, so the exec seam's line mirror held it back as an
  // incomplete line and no log assertion could see the payload real wrangler streams.
  const statementResults = [ownerChanges, deleteChanges, tokenChanges].map((changes) => ({
    results: [],
    success: true,
    meta: { changes }
  }));
  return JSON.stringify(statementResults, null, 2) + '\n';
}

/** The stdout of a seed against a genuinely empty allowlist: owner inserted, token inserted. */
const EMPTY_ALLOWLIST_STDOUT = d1JsonStdout(1, 0, 1);

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

test('the seed SQL carries the normalized email, an allowlist-empty owner insert, and a 64-char hex hash', async (t) => {
  const scaffoldDir = await mkdtemp(path.join(tmpdir(), 'cairn-scaffold-'));
  t.after(() => rm(scaffoldDir, { recursive: true, force: true }));

  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  await fake.respond('d1 execute', { code: 0, stdout: EMPTY_ALLOWLIST_STDOUT });
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
  assert.ok(invocation.argv.includes('--json'), 'expected --json so the seed can check what actually wrote');
  const sql = invocation.argv[5];

  assert.match(sql, /'t3-spike@example\.com'/);
  assert.doesNotMatch(sql, /Example\.COM/);
  assert.match(sql, /INSERT INTO editor .*WHERE NOT EXISTS \(SELECT 1 FROM editor\)/s);
  assert.doesNotMatch(sql, /ON CONFLICT/, 'the owner insert must key on an empty allowlist, not the address alone');
  assert.match(sql, /DELETE FROM magic_token WHERE email = 't3-spike@example\.com'/);
  assert.match(
    sql,
    /INSERT INTO magic_token .*WHERE EXISTS \(SELECT 1 FROM editor WHERE email = 't3-spike@example\.com'\)/s
  );

  const hashMatch = sql.match(/INSERT INTO magic_token \(token_hash, email, expires_at, created_at\)\s*\n?\s*SELECT '([0-9a-f]+)'/);
  assert.ok(hashMatch, 'expected the magic_token insert to carry a hex token_hash');
  assert.equal(hashMatch[1].length, 64);
  assert.equal(hashMatch[1], hashMatch[1].toLowerCase());
});

test('the returned confirmPath token hashes to the same value written in the SQL', async (t) => {
  const scaffoldDir = tmpdir();
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  await fake.respond('d1 execute', { code: 0, stdout: EMPTY_ALLOWLIST_STDOUT });
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
  const hashMatch = sql.match(/token_hash, email, expires_at, created_at\)\s*\n?\s*SELECT '([0-9a-f]{64})'/);
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
  await fake.respond('d1 execute', { code: 0, stdout: EMPTY_ALLOWLIST_STDOUT });
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

test('an allowlist that already holds a different editor grants no owner row and no token', async (t) => {
  const scaffoldDir = tmpdir();
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  // The owner insert's WHERE NOT EXISTS fails (an editor is already there), and the token
  // insert's WHERE EXISTS fails too (this address is not that editor), so wrangler exits 0 having
  // changed nothing at all.
  await fake.respond('d1 execute', { code: 0, stdout: d1JsonStdout(0, 0, 0) });
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  const { seedOwnerAndToken } = await import('./bootstrap.mjs');

  await assert.rejects(
    () => seedOwnerAndToken({ dir: scaffoldDir, email: 'stray@example.com', log: () => {}, now: 5000 }),
    (err) => {
      assert.equal(err.catalogue.code, 'seed-failed');
      assert.match(err.message, /stray@example\.com/);
      assert.match(err.message, /allowlist/);
      return true;
    }
  );
});

test('an address that is already an editor gets a token but no second owner row', async (t) => {
  const scaffoldDir = tmpdir();
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  // The owner insert's WHERE NOT EXISTS fails (the allowlist is non-empty), but the token
  // insert's WHERE EXISTS succeeds, since this address is already an editor.
  await fake.respond('d1 execute', { code: 0, stdout: d1JsonStdout(0, 0, 1) });
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  const { seedOwnerAndToken } = await import('./bootstrap.mjs');
  const { confirmPath } = await seedOwnerAndToken({
    dir: scaffoldDir,
    email: 'existing-editor@example.com',
    log: () => {},
    now: 6000
  });

  assert.ok(confirmPath.startsWith('/admin/auth/confirm?token='));
});

test("the child's JSON payload is parsed, never streamed to log", async (t) => {
  const scaffoldDir = await mkdtemp(path.join(tmpdir(), 'cairn-scaffold-'));
  t.after(() => rm(scaffoldDir, { recursive: true, force: true }));

  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  await fake.respond('d1 execute', { code: 0, stdout: EMPTY_ALLOWLIST_STDOUT });
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  const lines = [];
  const { seedOwnerAndToken } = await import('./bootstrap.mjs');
  await seedOwnerAndToken({
    dir: scaffoldDir,
    email: 'owner@example.com',
    log: (line) => lines.push(line),
    now: 1000
  });

  // The payload belongs to the row-count check alone, so no log line may carry any of it.
  assert.ok(lines.length > 0, 'expected the step to announce itself');
  assert.ok(
    lines.every((line) => !line.includes('"success"') && !line.includes('"meta"')),
    `expected no raw D1 JSON in log lines, got: ${lines.join('\n')}`
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
  await fake.respond('d1 execute', { code: 0, stdout: EMPTY_ALLOWLIST_STDOUT });
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
  await fake.respond('d1 execute', { code: 0, stdout: EMPTY_ALLOWLIST_STDOUT });
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  const { seedOwnerAndToken } = await import('./bootstrap.mjs');
  const now = 1_700_000_000_000;
  await seedOwnerAndToken({ dir: scaffoldDir, email: 'owner@example.com', log: () => {}, now });

  const [invocation] = await fake.invocations();
  const sql = invocation.argv[5];
  assert.match(sql, new RegExp(`SELECT '[0-9a-f]{64}', 'owner@example\\.com', ${now + 600000}, ${now}`));
});

test('the raw token is 43 characters of unpadded base64url, and two calls never produce the same one', async (t) => {
  const scaffoldDir = tmpdir();
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  await fake.respond('d1 execute', { code: 0, stdout: EMPTY_ALLOWLIST_STDOUT });
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  const { seedOwnerAndToken } = await import('./bootstrap.mjs');
  const prefix = '/admin/auth/confirm?token=';

  const first = await seedOwnerAndToken({ dir: scaffoldDir, email: 'owner@example.com', log: () => {}, now: 7000 });
  const second = await seedOwnerAndToken({ dir: scaffoldDir, email: 'owner@example.com', log: () => {}, now: 8000 });

  const firstToken = decodeURIComponent(first.confirmPath.slice(prefix.length));
  const secondToken = decodeURIComponent(second.confirmPath.slice(prefix.length));

  assert.match(firstToken, /^[A-Za-z0-9_-]{43}$/);
  assert.match(secondToken, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(firstToken, secondToken);
});
