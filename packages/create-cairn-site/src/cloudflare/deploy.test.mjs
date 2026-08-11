import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeFakeBin } from '../../test/fake-bin.mjs';

/**
 * A realistic deploy transcript, pinned from the T3 spike's real wrangler 4.120.1 output
 * (docs/internal/2026-08-10-t3-cloudflare-spike.md, section (e)), with ANSI color codes wrapped
 * around the URL line so the test actually exercises the strip rather than assuming it.
 */
const DEPLOY_STDOUT_SAMPLE =
  '\x1b[32mTotal Upload: 512.34 KiB / gzip: 128.12 KiB\x1b[0m\n' +
  'Uploaded t3-spike-a570e2 (2.14 sec)\n' +
  'Deployed t3-spike-a570e2 triggers (0.65 sec)\n' +
  '  \x1b[1;36mhttps://t3-spike-a570e2.glw907.workers.dev\x1b[0m\n' +
  'Current Version ID: 851dd846-9968-4752-82d4-563f72c0c2d2\n';

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

test('applyMigrations invokes both databases in order, by binding name', async (t) => {
  const dir = tmpdir();
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  const { applyMigrations } = await import('./deploy.mjs');
  await applyMigrations({ dir, log: () => {} });

  const invocations = await fake.invocations();
  assert.deepEqual(invocations.map((i) => i.argv), [
    ['d1', 'migrations', 'apply', 'AUTH_DB', '--remote'],
    ['d1', 'migrations', 'apply', 'APP_DB', '--remote']
  ]);
});

test('applyMigrations names the failing database in migrations-failed', async (t) => {
  const dir = tmpdir();
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  await fake.respond('APP_DB', { code: 1, stderr: 'D1_ERROR: no such table editor' });
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  const { applyMigrations } = await import('./deploy.mjs');

  await assert.rejects(
    () => applyMigrations({ dir, log: () => {} }),
    (err) => {
      assert.equal(err.catalogue.code, 'migrations-failed');
      assert.match(err.message, /APP_DB/);
      assert.match(err.message, /no such table editor/);
      return true;
    }
  );

  const invocations = await fake.invocations();
  assert.deepEqual(invocations.map((i) => i.argv[3]), ['AUTH_DB', 'APP_DB']);
});
