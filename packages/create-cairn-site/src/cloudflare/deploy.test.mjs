import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
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
  {
    uuid: '0f3c1d2e-aaaa-bbbb-cccc-000000000001',
    name: 'other-site-auth',
    created_at: '2026-01-01T00:00:00.000Z',
    version: 'production',
  },
]);

/** The start of an earlier attempt's first deploy, as its resume marker records it. */
const MARKER_AT = '2026-11-01T12:00:00.000Z';

/** When that earlier attempt's deploy step stopped. */
const MARKER_ENDED_AT = '2026-11-01T12:10:00.000Z';

/** A time inside the earlier attempt's deploy window. */
const IN_WINDOW = '2026-11-01T12:03:00.000Z';

/** A time well before the earlier attempt began. */
const BEFORE_WINDOW = '2026-10-01T09:00:00.000Z';

/** A time days after the earlier attempt stopped. */
const AFTER_WINDOW = '2026-11-04T08:00:00.000Z';

/**
 * A resume marker for `alpine-club` on account `a`, the shape the chapter saves.
 * @param {object} [overrides] fields replacing the defaults
 * @returns {{ name: string, accountId: string, at: string, endedAt?: string }}
 */
function marker(overrides = {}) {
  return { name: 'alpine-club', accountId: 'a', at: MARKER_AT, endedAt: MARKER_ENDED_AT, ...overrides };
}

/**
 * The three "present" replies, each carrying the creation time the check reads.
 * @param {{ worker?: string, d1?: string, r2?: string }} times the creation time per resource
 * @returns {{ worker: object, d1: object, r2: object }} fake replies
 */
function presentAt({ worker, d1, r2 }) {
  return {
    worker: { code: 0, stdout: JSON.stringify([{ id: 'dep-1', created_on: worker, versions: [] }]) },
    d1: { code: 0, stdout: JSON.stringify([{ uuid: 'x', name: 'alpine-club-auth', created_at: d1 }]) },
    r2: { code: 0, stdout: JSON.stringify({ name: 'alpine-club-media', created: r2 }) },
  };
}

/** The wrangler.jsonc a scaffold named `alpine-club` carries, reduced to what the check parses. */
const ALPINE_WRANGLER_JSONC = `{
  // The worker's name.
  "name": "alpine-club",
  "d1_databases": [
    {
      "binding": "AUTH_DB",
      "database_name": "alpine-club-auth",
      "migrations_dir": "migrations"
    }
  ],
  // R2 bucket backing the media library.
  "r2_buckets": [{ "binding": "MEDIA_BUCKET", "bucket_name": "alpine-club-media" }]
}
`;

/**
 * Arm a fake wrangler whose three name reads all report "absent", then override any of them, and
 * build a scaffold directory whose wrangler.jsonc names the site's resources.
 * @param {import('node:test').TestContext} t the running test's context
 * @param {{ worker?: object, d1?: object, r2?: object }} [overrides] replies replacing the
 *  absent defaults for one read each
 * @param {string | null} [wranglerJsonc] the scaffold's wrangler.jsonc text; null writes none
 * @returns {Promise<{ fake: import('../../test/fake-bin.mjs').FakeBin, dir: string }>} the armed
 *  fake, already on `CAIRN_WRANGLER_BIN`, and the scaffold directory
 */
async function armNameReads(t, overrides = {}, wranglerJsonc = ALPINE_WRANGLER_JSONC) {
  const fake = await makeFakeBin('wrangler-names');
  t.after(() => fake.close());
  await fake.respond('deployments list', overrides.worker ?? { code: 1, stderr: WORKER_ABSENT_STDERR });
  await fake.respond('d1 list', overrides.d1 ?? { code: 0, stdout: D1_LIST_OTHER_SITE });
  await fake.respond('r2 bucket info', overrides.r2 ?? { code: 1, stderr: BUCKET_ABSENT_STDERR });
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });
  const dir = await mkdtemp(join(tmpdir(), 'cairn-deploy-names-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  if (wranglerJsonc !== null) await writeFile(join(dir, 'wrangler.jsonc'), wranglerJsonc);
  return { fake, dir };
}

/**
 * Run `ensureNamesFree` for `alpine-club` on account `a` and return the error it throws.
 * @param {string} dir the scaffold directory
 * @param {object} [extra] fields merged over the call's arguments, such as the marker
 * @returns {Promise<Error & { catalogue?: object }>} the thrown error
 */
async function namesError(dir, extra = {}) {
  const { ensureNamesFree } = await import('./deploy.mjs');
  try {
    await ensureNamesFree({ dir, log: () => {}, accountId: 'a', workerName: 'alpine-club', ...extra });
  } catch (err) {
    return err;
  }
  assert.fail('expected ensureNamesFree to stop setup');
}

test('ensureNamesFree passes when the Worker, the database, and the bucket are all absent', async (t) => {
  const { fake, dir } = await armNameReads(t);
  const { ensureNamesFree } = await import('./deploy.mjs');
  await ensureNamesFree({ dir, log: () => {}, accountId: 'planted-account-id', workerName: 'alpine-club' });

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

const PRESENT_NOW = presentAt({ worker: IN_WINDOW, d1: IN_WINDOW, r2: IN_WINDOW });

for (const [label, overrides, named] of [
  ['the Worker', { worker: PRESENT_NOW.worker }, /Worker named alpine-club\b/],
  ['the database', { d1: PRESENT_NOW.d1 }, /database named alpine-club-auth/],
  ['the bucket', { r2: PRESENT_NOW.r2 }, /bucket named alpine-club-media/],
]) {
  test(`ensureNamesFree stops with resource-names-taken when ${label} already exists`, async (t) => {
    const { dir } = await armNameReads(t, overrides);
    const err = await namesError(dir);
    assert.equal(err.catalogue?.code, 'resource-names-taken');
    assert.equal(err.catalogue.kind, 'act');
    assert.match(err.message, named);
    assert.match(err.catalogue.next, /--name/);
    assert.match(err.message, /GitHub repository and App for this site/);
    assert.doesNotMatch(err.message, /this run created/);
  });
}

test('ensureNamesFree names every clashing resource in one error, with its creation time', async (t) => {
  const { dir } = await armNameReads(t, PRESENT_NOW);
  const err = await namesError(dir);
  assert.match(err.message, /Worker named alpine-club \(created 2026-11-01T12:03:00\.000Z\)/);
  assert.match(err.message, /database named alpine-club-auth \(created 2026-11-01T12:03:00\.000Z\)/);
  assert.match(err.message, /bucket named alpine-club-media \(created 2026-11-01T12:03:00\.000Z\)/);
  assert.match(err.message, /Nothing was deployed/);
  assert.doesNotMatch(err.message, /built or deployed/, 'the check before the deploy runs after the build');
});

test('ensureNamesFree names a clash without a creation time when wrangler gives none', async (t) => {
  const { dir } = await armNameReads(t, { r2: { code: 0, stdout: '{"name":"alpine-club-media"}' } });
  const err = await namesError(dir);
  assert.match(err.message, /bucket named alpine-club-media\./);
  assert.doesNotMatch(err.message, /created/);
});

for (const [label, overrides] of [
  ['the Worker read fails for a reason other than absence', { worker: { code: 1, stderr: 'Authentication error [code: 10000]' } }],
  ['the database list fails', { d1: { code: 1, stderr: 'A network request to the Cloudflare API failed.' } }],
  ['the database list prints output that is not a JSON array', { d1: { code: 0, stdout: 'Listing databases...' } }],
  ['the database list prints a truncated array', { d1: { code: 0, stdout: 'Listing...\n[{"name": "alpine' } }],
  ['the bucket read fails for a reason other than absence', { r2: { code: 1, stderr: 'Authentication error [code: 10000]' } }],
]) {
  test(`ensureNamesFree never reads a failure as absent: ${label}`, async (t) => {
    const { dir } = await armNameReads(t, overrides);
    const err = await namesError(dir);
    assert.equal(err.catalogue?.code, 'resource-names-check-failed');
    assert.equal(err.catalogue.kind, 'act');
  });
}

test('ensureNamesFree reads a database list that follows a banner line', async (t) => {
  const { dir } = await armNameReads(t, {
    d1: { code: 0, stdout: `wrangler 4.158.0\n${JSON.stringify([{ name: 'alpine-club-auth', created_at: IN_WINDOW }])}` },
  });
  const err = await namesError(dir);
  assert.equal(err.catalogue?.code, 'resource-names-taken');
  assert.match(err.message, /database named alpine-club-auth/);
});

test('ensureNamesFree excuses resources created inside the marker window of this site and account', async (t) => {
  const { dir } = await armNameReads(t, PRESENT_NOW);
  const { ensureNamesFree } = await import('./deploy.mjs');
  await ensureNamesFree({ dir, log: () => {}, accountId: 'a', workerName: 'alpine-club', marker: marker() });
});

test('ensureNamesFree allows five minutes of clock skew before the marker', async (t) => {
  const skewed = '2026-11-01T11:56:00.000Z';
  const { dir } = await armNameReads(t, presentAt({ worker: skewed, d1: skewed, r2: skewed }));
  const { ensureNamesFree } = await import('./deploy.mjs');
  await ensureNamesFree({ dir, log: () => {}, accountId: 'a', workerName: 'alpine-club', marker: marker() });
});

for (const [label, overrides, extra, named] of [
  [
    'a Worker older than the marker',
    { worker: presentAt({ worker: BEFORE_WINDOW }).worker },
    { marker: marker() },
    /Worker named alpine-club\b/,
  ],
  [
    'a Worker created after the earlier attempt stopped (another run took the name)',
    { worker: presentAt({ worker: AFTER_WINDOW }).worker },
    { marker: marker() },
    /Worker named alpine-club\b/,
  ],
  [
    'a database older than the marker',
    { d1: presentAt({ d1: BEFORE_WINDOW }).d1 },
    { marker: marker() },
    /database named alpine-club-auth/,
  ],
  [
    'a bucket older than the marker',
    { r2: presentAt({ r2: BEFORE_WINDOW }).r2 },
    { marker: marker() },
    /bucket named alpine-club-media/,
  ],
  ['a marker for another account', PRESENT_NOW, { marker: marker({ accountId: 'b' }) }, /Worker named/],
  ['a marker for another name', PRESENT_NOW, { marker: marker({ name: 'alpine' }) }, /Worker named/],
  ['an old-shape string marker', PRESENT_NOW, { marker: 'alpine-club' }, /Worker named/],
  ['a marker with no end time (a run that never recorded stopping)', PRESENT_NOW, { marker: marker({ endedAt: undefined }) }, /Worker named/],
  [
    'a Worker reply with no creation time',
    { worker: { code: 0, stdout: '[{"id":"dep-1"}]' } },
    { marker: marker() },
    /Worker named alpine-club\b/,
  ],
  [
    'a Worker reply with ten deployments, so its first may be out of view',
    {
      worker: {
        code: 0,
        stdout: JSON.stringify(Array.from({ length: 10 }, (_, n) => ({ id: `d${n}`, created_on: IN_WINDOW }))),
      },
    },
    { marker: marker() },
    /Worker named alpine-club\b/,
  ],
  [
    'a database with an unparseable creation time',
    { d1: { code: 0, stdout: '[{"name":"alpine-club-auth","created_at":"yesterday-ish"}]' } },
    { marker: marker() },
    /database named alpine-club-auth/,
  ],
  [
    'a bucket reply with no creation time',
    { r2: { code: 0, stdout: '{"name":"alpine-club-media"}' } },
    { marker: marker() },
    /bucket named alpine-club-media/,
  ],
  [
    'a creation time Date.parse accepts but that is not ISO 8601',
    presentAt({ worker: 'Nov 1, 2026 12:03:00 GMT', d1: '2026-11-01 12:03:00', r2: 'Sun, 01 Nov 2026 12:03:00 GMT' }),
    { marker: marker() },
    /Worker named alpine-club.*database named alpine-club-auth.*bucket named alpine-club-media/s,
  ],
  [
    'a marker whose start is not ISO 8601',
    PRESENT_NOW,
    { marker: marker({ at: 'Sun, 01 Nov 2026 12:00:00 GMT' }) },
    /Worker named/,
  ],
  [
    'a marker whose stop is not ISO 8601',
    PRESENT_NOW,
    { marker: marker({ endedAt: '2026-11-01 12:10' }) },
    /Worker named/,
  ],
]) {
  test(`ensureNamesFree refuses ${label}`, async (t) => {
    const { dir } = await armNameReads(t, overrides);
    const err = await namesError(dir, extra);
    assert.equal(err.catalogue?.code, 'resource-names-taken');
    assert.match(err.message, named);
  });
}

for (const [label, jsonc] of [
  ['the Worker name', ALPINE_WRANGLER_JSONC.replace('"name": "alpine-club"', '"name": "production-site"')],
  ['the database name', ALPINE_WRANGLER_JSONC.replace('"alpine-club-auth"', '"production-auth"')],
  [
    'a second bucket',
    ALPINE_WRANGLER_JSONC.replace(
      '"bucket_name": "alpine-club-media" }]',
      '"bucket_name": "alpine-club-media" }, { "binding": "X", "bucket_name": "production-media" }]',
    ),
  ],
]) {
  test(`ensureNamesFree refuses a wrangler.jsonc whose ${label} differs from the site's names`, async (t) => {
    const { fake, dir } = await armNameReads(t, {}, jsonc);
    const err = await namesError(dir);
    assert.equal(err.catalogue?.code, 'resource-names-mismatch');
    assert.equal(err.catalogue.kind, 'act');
    assert.match(err.message, /production-/);
    assert.deepEqual(await fake.invocations(), [], 'a mismatch stops before any read');
  });
}

for (const [label, jsonc, named] of [
  [
    'a database_id',
    ALPINE_WRANGLER_JSONC.replace('"database_name": "alpine-club-auth",', '"database_name": "alpine-club-auth",\n      "database_id": "4c1d2e3f-0000-0000-0000-000000000001",'),
    /database_id/,
  ],
  [
    'an R2 jurisdiction',
    ALPINE_WRANGLER_JSONC.replace('"bucket_name": "alpine-club-media" }', '"bucket_name": "alpine-club-media", "jurisdiction": "eu" }'),
    /jurisdiction/,
  ],
  [
    'a preview binding key',
    ALPINE_WRANGLER_JSONC.replace('"bucket_name": "alpine-club-media" }', '"bucket_name": "alpine-club-media", "preview_bucket_name": "other-media" }'),
    /preview_bucket_name/,
  ],
  [
    'an env block',
    ALPINE_WRANGLER_JSONC.replace('"name": "alpine-club",', '"name": "alpine-club",\n  "env": { "staging": { "name": "alpine-club-staging" } },'),
    /env block/,
  ],
]) {
  test(`ensureNamesFree refuses a wrangler.jsonc that carries ${label}`, async (t) => {
    const { fake, dir } = await armNameReads(t, {}, jsonc);
    const err = await namesError(dir);
    assert.equal(err.catalogue?.code, 'resource-names-mismatch');
    assert.match(err.message, named);
    assert.doesNotMatch(err.message, /built or deployed/);
    assert.deepEqual(await fake.invocations(), [], 'a refused config stops before any read');
  });
}

for (const [label, jsonc] of [
  ['missing', null],
  ['not valid JSONC', '{ "name": '],
]) {
  test(`ensureNamesFree stops with resource-names-check-failed when wrangler.jsonc is ${label}`, async (t) => {
    const { dir } = await armNameReads(t, {}, jsonc);
    const err = await namesError(dir);
    assert.equal(err.catalogue?.code, 'resource-names-check-failed');
  });
}
