import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeFakeBin, clearAmbientAccountId } from '../../test/fake-bin.mjs';

/**
 * A realistic deploy transcript, pinned from the T3 spike's real wrangler 4.120.1 output
 * (https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/record/2026-08-10-t3-cloudflare-spike.md, section (e)), with ANSI color codes wrapped
 * around the URL line so the test actually exercises the strip rather than assuming it.
 */
const DEPLOY_STDOUT_SAMPLE =
  '\x1b[32mTotal Upload: 512.34 KiB / gzip: 128.12 KiB\x1b[0m\n' +
  'Uploaded t3-spike-a570e2 (2.14 sec)\n' +
  'Deployed t3-spike-a570e2 triggers (0.65 sec)\n' +
  '  \x1b[1;36mhttps://t3-spike-a570e2.glw907.workers.dev\x1b[0m\n' +
  'Current Version ID: 851dd846-9968-4752-82d4-563f72c0c2d2\n';

/**
 * A stdout line carrying two URLs run together with no whitespace between them (an embedded
 * redirect target, the shape an unanchored greedy regex would splice), used to prove the anchored
 * per-line parse never hands back a spliced string.
 */
const REDIRECT_STYLE_STDOUT =
  'Deployed thing triggers (0.1 sec)\n' +
  '  https://real-worker.glw907.workers.dev/?next=https://evil.attacker.workers.dev\n';

/** The subdomain-missing error text wrangler prints, per the spike's section (c). */
const SUBDOMAIN_STDERR =
  'You need a workers.dev subdomain in order to proceed. Please go to the dashboard and open ' +
  'the Workers menu. Opening the Workers landing page for the first time will create a ' +
  'workers.dev subdomain automatically. [code: 10063]';

test('ensureInstalled skips with zero npm invocations when node_modules exists', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'cairn-deploy-installed-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(join(dir, 'node_modules'));

  const fake = await makeFakeBin('npm');
  t.after(() => fake.close());
  process.env.CAIRN_NPM_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_NPM_BIN; });

  const { ensureInstalled } = await import('./deploy.mjs');
  const log = [];
  await ensureInstalled({ dir, log: (line) => log.push(line) });

  assert.deepEqual(await fake.invocations(), []);
  assert.ok(log.some((line) => /already installed|skip/i.test(line)));
});

test('ensureInstalled runs npm install when node_modules is absent', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'cairn-deploy-uninstalled-'));
  t.after(() => rm(dir, { recursive: true, force: true }));

  const fake = await makeFakeBin('npm');
  t.after(() => fake.close());
  process.env.CAIRN_NPM_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_NPM_BIN; });

  const { ensureInstalled } = await import('./deploy.mjs');
  const log = [];
  await ensureInstalled({ dir, log: (line) => log.push(line) });

  const [invocation] = await fake.invocations();
  assert.deepEqual(invocation.argv, ['install']);
  assert.ok(log.some((line) => /installing your site's dependencies/i.test(line)));
});

test('buildSite failure maps to build-failed with the fake stderr in the message', async (t) => {
  const dir = tmpdir();
  const fake = await makeFakeBin('npm');
  t.after(() => fake.close());
  await fake.respond('run build', { code: 1, stderr: 'Error: Cannot find module vite' });
  process.env.CAIRN_NPM_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_NPM_BIN; });

  const { buildSite } = await import('./deploy.mjs');

  await assert.rejects(
    () => buildSite({ dir, log: () => {} }),
    (err) => {
      assert.equal(err.catalogue.code, 'build-failed');
      assert.match(err.message, /Cannot find module vite/);
      return true;
    }
  );
});

test('buildSite prints one line on success and keeps the build output off the log', async (t) => {
  const dir = tmpdir();
  const fake = await makeFakeBin('npm');
  t.after(() => fake.close());
  await fake.respond('run build', { code: 0, stdout: '[plugin vite:css-post] unused selector\nbuilt.\n' });
  process.env.CAIRN_NPM_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_NPM_BIN; });

  const { buildSite } = await import('./deploy.mjs');
  const log = [];
  await buildSite({ dir, log: (line) => log.push(line) });

  assert.ok(log.includes('Built your site.'), `got: ${log.join('|')}`);
  assert.equal(log.some((line) => line.includes('vite:css-post')), false, `got: ${log.join('|')}`);
});

test('buildSite prints the captured build output before build-failed when the build fails', async (t) => {
  const dir = tmpdir();
  const fake = await makeFakeBin('npm');
  t.after(() => fake.close());
  await fake.respond('run build', { code: 1, stdout: '[plugin vite:css-post] unused selector\n', stderr: 'Error: boom' });
  process.env.CAIRN_NPM_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_NPM_BIN; });

  const { buildSite } = await import('./deploy.mjs');
  const log = [];
  await assert.rejects(
    () => buildSite({ dir, log: (line) => log.push(line) }),
    (err) => err.catalogue?.code === 'build-failed' && /boom/.test(err.message),
  );

  assert.ok(log.some((line) => line.includes('vite:css-post')), `got: ${log.join('|')}`);
  assert.equal(log.includes('Built your site.'), false);
});

test('ensureLogin makes zero further calls when whoami reports an account', async (t) => {
  const dir = tmpdir();
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  await fake.respond('whoami', {
    code: 0,
    stdout:
      '👋 You are logged in with an API Token, associated with the email test@example.com\n' +
      '┌─────────────┬──────────────┐\n│ Account Name │ Account ID │\n'
  });
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  const { ensureLogin } = await import('./deploy.mjs');
  await ensureLogin({ dir, log: () => {} });

  const invocations = await fake.invocations();
  assert.equal(invocations.length, 1);
  assert.deepEqual(invocations[0].argv, ['whoami']);
});

test('ensureLogin runs login when not signed in, and a failing login maps to login-abandoned', async (t) => {
  const dir = tmpdir();
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  await fake.respond('login', { code: 1, stderr: 'browser closed without completing sign-in' });
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  const { ensureLogin } = await import('./deploy.mjs');

  await assert.rejects(
    () => ensureLogin({ dir, log: () => {} }),
    (err) => {
      assert.equal(err.catalogue.code, 'login-abandoned');
      return true;
    }
  );

  const invocations = await fake.invocations();
  assert.deepEqual(invocations.map((i) => i.argv[0]), ['whoami', 'login']);
});

test('deployWorker parses the workers.dev url out of a realistic stdout sample with ANSI escapes', async (t) => {
  const dir = tmpdir();
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  await fake.respond('deploy', { code: 0, stdout: DEPLOY_STDOUT_SAMPLE });
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  const { deployWorker } = await import('./deploy.mjs');
  const result = await deployWorker({ dir, log: () => {} });

  assert.equal(result.url, 'https://t3-spike-a570e2.glw907.workers.dev');
});

test('deployWorker maps a workers.dev subdomain stderr to subdomain-unregistered', async (t) => {
  const dir = tmpdir();
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  await fake.respond('deploy', { code: 1, stderr: SUBDOMAIN_STDERR });
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  const { deployWorker } = await import('./deploy.mjs');

  await assert.rejects(
    () => deployWorker({ dir, log: () => {} }),
    (err) => {
      assert.equal(err.catalogue.code, 'subdomain-unregistered');
      return true;
    }
  );
});

test('deployWorker never splices two URLs on one line: it returns only the real host\'s origin', async (t) => {
  const dir = tmpdir();
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  await fake.respond('deploy', { code: 0, stdout: REDIRECT_STYLE_STDOUT });
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  const { deployWorker } = await import('./deploy.mjs');
  const result = await deployWorker({ dir, log: () => {} });

  // The correct origin, with no path or query, and never the spliced string an unanchored
  // greedy match would have produced (the whole line, up to the LAST .workers.dev).
  assert.equal(result.url, 'https://real-worker.glw907.workers.dev');
  assert.doesNotMatch(result.url, /evil/);
});

test('deployWorker treats two separate bare URLs on one line as no match, never a splice', async (t) => {
  const dir = tmpdir();
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  await fake.respond('deploy', {
    code: 0,
    stdout:
      'Deployed thing triggers (0.1 sec)\n' +
      '  see https://old-worker.example.com and https://new-worker.glw907.workers.dev\n',
  });
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  const { deployWorker } = await import('./deploy.mjs');

  // Neither the correct origin nor a spliced string: the line carries surrounding prose, so the
  // whole-line anchor rejects it outright rather than guessing which URL was meant.
  await assert.rejects(
    () => deployWorker({ dir, log: () => {} }),
    (err) => {
      assert.equal(err.catalogue.code, 'deploy-failed');
      return true;
    }
  );
});

test('deployWorker maps a urlless zero-exit success to deploy-failed', async (t) => {
  const dir = tmpdir();
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  await fake.respond('deploy', { code: 0, stdout: 'Deployed nothing-here triggers (0.1 sec)\n' });
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  const { deployWorker } = await import('./deploy.mjs');

  await assert.rejects(
    () => deployWorker({ dir, log: () => {} }),
    (err) => {
      assert.equal(err.catalogue.code, 'deploy-failed');
      assert.match(err.message, /carried no workers\.dev URL/i);
      return true;
    }
  );
});

test('applyMigrations invokes AUTH_DB alone, by binding name', async (t) => {
  const dir = tmpdir();
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  const { applyMigrations } = await import('./deploy.mjs');
  await applyMigrations({ dir, log: () => {} });

  const invocations = await fake.invocations();
  assert.deepEqual(invocations.map((i) => i.argv), [
    ['d1', 'migrations', 'apply', 'AUTH_DB', '--remote']
  ]);
});

test('deployWorker passes accountId through as CLOUDFLARE_ACCOUNT_ID', async (t) => {
  const dir = tmpdir();
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  await fake.respond('deploy', { code: 0, stdout: DEPLOY_STDOUT_SAMPLE });
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  const { deployWorker } = await import('./deploy.mjs');
  await deployWorker({ dir, log: () => {}, accountId: 'planted-account-id' });

  const [invocation] = await fake.invocations();
  assert.equal(invocation.env.CLOUDFLARE_ACCOUNT_ID, 'planted-account-id');
});

test('deployWorker called with no accountId shows no CLOUDFLARE_ACCOUNT_ID in the recorded env', async (t) => {
  const dir = tmpdir();
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  await fake.respond('deploy', { code: 0, stdout: DEPLOY_STDOUT_SAMPLE });
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  clearAmbientAccountId(t);

  const { deployWorker } = await import('./deploy.mjs');
  await deployWorker({ dir, log: () => {} });

  const [invocation] = await fake.invocations();
  assert.equal(invocation.env.CLOUDFLARE_ACCOUNT_ID, undefined);
});

test('applyMigrations passes accountId through as CLOUDFLARE_ACCOUNT_ID on its migration call', async (t) => {
  const dir = tmpdir();
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  const { applyMigrations } = await import('./deploy.mjs');
  await applyMigrations({ dir, log: () => {}, accountId: 'planted-account-id' });

  const invocations = await fake.invocations();
  assert.deepEqual(
    invocations.map((i) => i.env.CLOUDFLARE_ACCOUNT_ID),
    ['planted-account-id'],
  );
});

test('applyMigrations called with no accountId shows no CLOUDFLARE_ACCOUNT_ID in the recorded env', async (t) => {
  const dir = tmpdir();
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  clearAmbientAccountId(t);

  const { applyMigrations } = await import('./deploy.mjs');
  await applyMigrations({ dir, log: () => {} });

  const invocations = await fake.invocations();
  assert.deepEqual(
    invocations.map((i) => i.env.CLOUDFLARE_ACCOUNT_ID),
    [undefined],
  );
});

test('applyMigrations names the failing database in migrations-failed', async (t) => {
  const dir = tmpdir();
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  await fake.respond('AUTH_DB', { code: 1, stderr: 'D1_ERROR: no such table editor' });
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  const { applyMigrations } = await import('./deploy.mjs');

  await assert.rejects(
    () => applyMigrations({ dir, log: () => {} }),
    (err) => {
      assert.equal(err.catalogue.code, 'migrations-failed');
      assert.match(err.message, /AUTH_DB/);
      assert.match(err.message, /no such table editor/);
      return true;
    }
  );

  const invocations = await fake.invocations();
  assert.deepEqual(invocations.map((i) => i.argv[3]), ['AUTH_DB']);
});

/**
 * The stderr wrangler 4.158 prints when a read names a Worker the account does not have: its
 * fetch error renders the API's code as `[code: 10007]`, the code wrangler's own deploy treats as
 * "no Worker by that name".
 */
const WORKER_ABSENT_STDERR =
  '✘ [ERROR] A request to the Cloudflare API (/accounts/test-account-id/workers/scripts/alpine-club/deployments) failed.\n\n' +
  '  This Worker does not exist on your account. [code: 10007]\n';

/** The stderr for a bucket the account does not have, R2's `[code: 10006]`. */
const BUCKET_ABSENT_STDERR =
  '✘ [ERROR] A request to the Cloudflare API (/accounts/test-account-id/r2/buckets/alpine-club-media) failed.\n\n' +
  '  The specified bucket does not exist. [code: 10006]\n';

/** A `d1 list --json` reply naming one database that belongs to some other site. */
const D1_LIST_OTHER_SITE = JSON.stringify([
  { uuid: '0f3c1d2e-aaaa-bbbb-cccc-000000000001', name: 'other-site-auth', version: 'production' },
]);

/**
 * Arm a fake wrangler whose three name reads all report "absent", then override any of them.
 * @param {import('node:test').TestContext} t the running test's context
 * @param {{ worker?: object, d1?: object, r2?: object }} [overrides] replies replacing the
 *  absent defaults for one read each
 * @returns {Promise<import('../../test/fake-bin.mjs').FakeBin>} the armed fake, already on
 *  `CAIRN_WRANGLER_BIN`
 */
async function armNameReads(t, overrides = {}) {
  const fake = await makeFakeBin('wrangler-names');
  t.after(() => fake.close());
  await fake.respond('deployments list', overrides.worker ?? { code: 1, stderr: WORKER_ABSENT_STDERR });
  await fake.respond('d1 list', overrides.d1 ?? { code: 0, stdout: D1_LIST_OTHER_SITE });
  await fake.respond('r2 bucket info', overrides.r2 ?? { code: 1, stderr: BUCKET_ABSENT_STDERR });
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });
  return fake;
}

test('ensureNamesFree passes when the Worker, the database, and the bucket are all absent', async (t) => {
  const fake = await armNameReads(t);
  const { ensureNamesFree } = await import('./deploy.mjs');
  await ensureNamesFree({ dir: tmpdir(), log: () => {}, accountId: 'planted-account-id', workerName: 'alpine-club' });

  const invocations = await fake.invocations();
  assert.deepEqual(invocations.map((i) => i.argv), [
    ['deployments', 'list', '--name', 'alpine-club', '--json'],
    ['d1', 'list', '--json'],
    ['r2', 'bucket', 'info', 'alpine-club-media', '--json'],
  ]);
  assert.ok(
    invocations.every((i) => i.env.CLOUDFLARE_ACCOUNT_ID === 'planted-account-id'),
    'every read must target the chosen account',
  );
});

for (const [label, overrides, named] of [
  ['the Worker', { worker: { code: 0, stdout: '[]' } }, /Worker named alpine-club\b/],
  [
    'the database',
    { d1: { code: 0, stdout: JSON.stringify([{ uuid: 'x', name: 'alpine-club-auth' }]) } },
    /database named alpine-club-auth/,
  ],
  ['the bucket', { r2: { code: 0, stdout: '{"name":"alpine-club-media"}' } }, /bucket named alpine-club-media/],
]) {
  test(`ensureNamesFree stops with resource-names-taken when ${label} already exists`, async (t) => {
    await armNameReads(t, overrides);
    const { ensureNamesFree } = await import('./deploy.mjs');
    await assert.rejects(
      () => ensureNamesFree({ dir: tmpdir(), log: () => {}, accountId: 'a', workerName: 'alpine-club' }),
      (err) => {
        assert.equal(err.catalogue.code, 'resource-names-taken');
        assert.equal(err.catalogue.kind, 'act');
        assert.match(err.message, named);
        assert.match(err.catalogue.next, /--name/);
        return true;
      },
    );
  });
}

test('ensureNamesFree names every clashing resource in one error', async (t) => {
  await armNameReads(t, {
    worker: { code: 0, stdout: '[]' },
    d1: { code: 0, stdout: JSON.stringify([{ uuid: 'x', name: 'alpine-club-auth' }]) },
    r2: { code: 0, stdout: '{}' },
  });
  const { ensureNamesFree } = await import('./deploy.mjs');
  await assert.rejects(
    () => ensureNamesFree({ dir: tmpdir(), log: () => {}, accountId: 'a', workerName: 'alpine-club' }),
    (err) => {
      assert.match(err.message, /Worker named alpine-club\b/);
      assert.match(err.message, /database named alpine-club-auth/);
      assert.match(err.message, /bucket named alpine-club-media/);
      return true;
    },
  );
});

for (const [label, overrides] of [
  ['the Worker read fails for a reason other than absence', { worker: { code: 1, stderr: 'Authentication error [code: 10000]' } }],
  ['the database list fails', { d1: { code: 1, stderr: 'A network request to the Cloudflare API failed.' } }],
  ['the database list prints output that is not a JSON array', { d1: { code: 0, stdout: 'Listing databases...' } }],
  ['the bucket read fails for a reason other than absence', { r2: { code: 1, stderr: 'Authentication error [code: 10000]' } }],
]) {
  test(`ensureNamesFree never reads a failure as absent: ${label}`, async (t) => {
    await armNameReads(t, overrides);
    const { ensureNamesFree } = await import('./deploy.mjs');
    await assert.rejects(
      () => ensureNamesFree({ dir: tmpdir(), log: () => {}, accountId: 'a', workerName: 'alpine-club' }),
      (err) => {
        assert.equal(err.catalogue.code, 'resource-names-check-failed');
        assert.equal(err.catalogue.kind, 'act');
        return true;
      },
    );
  });
}
