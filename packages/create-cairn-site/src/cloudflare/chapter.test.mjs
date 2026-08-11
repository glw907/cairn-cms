import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, chmod, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { makeFakeBin } from '../../test/fake-bin.mjs';
import { runCloudflareChapter } from './chapter.mjs';
import { saveSite, loadSite } from '../state.mjs';

/** An obviously fake PEM, never a real key, standing in for the App's private key. */
const FAKE_PEM =
  '-----BEGIN PRIVATE KEY-----\nTOTALLYFAKEKEYMATERIAL\n-----END PRIVATE KEY-----\n';

/** A minimal wrangler.jsonc fixture carrying the one key writePublicOrigin needs. */
const MINIMAL_WRANGLER_JSONC = JSON.stringify(
  { name: 'alpine-club', vars: { PUBLIC_ORIGIN: 'http://localhost:4173' } },
  null,
  2,
);

/**
 * Point CAIRN_STATE_DIR at a fresh temporary directory for the duration of one test.
 * @param {import('node:test').TestContext} t the running test's context
 * @returns {Promise<string>} the state directory's absolute path
 */
async function freshStateDir(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-cf-chapter-state-'));
  process.env.CAIRN_STATE_DIR = dir;
  t.after(() => {
    delete process.env.CAIRN_STATE_DIR;
    return rm(dir, { recursive: true, force: true });
  });
  return dir;
}

/**
 * Build a fixture scaffold directory carrying just enough for writePublicOrigin to find its
 * target: a real wrangler.jsonc with a PUBLIC_ORIGIN var.
 * @param {import('node:test').TestContext} t the running test's context
 * @returns {Promise<string>} the fixture directory's absolute path
 */
async function fixtureScaffoldDir(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-cf-chapter-scaffold-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await writeFile(path.join(dir, 'wrangler.jsonc'), MINIMAL_WRANGLER_JSONC);
  return dir;
}

/**
 * Seed a state record shaped like a site that just finished the GitHub chapter (T2's own
 * fields), the state runCloudflareChapter always starts from in this suite.
 * @param {string} siteId the site id to seed
 * @param {string} dir the scaffold directory the record points at
 * @param {object} [overrides] fields to merge over the default record
 * @returns {Promise<void>}
 */
async function seedPushedSite(siteId, dir, overrides = {}) {
  await saveSite(siteId, {
    name: 'Alpine Club',
    dir,
    step: 'pushed',
    github: {
      appId: 42,
      appSlug: 'cairn-alpine-club',
      clientSecret: 'fake-client-secret',
      pem: FAKE_PEM,
      owner: 'alpine-club-owner',
      installationId: 77,
    },
    ...overrides,
  });
}

/**
 * Arm the whoami reply every happy-path test needs: a zero exit whose stdout carries the
 * "you are logged in" sentence ensureLogin looks for, so the chapter never tries `wrangler
 * login` (which would need a real browser trip).
 * @param {import('../../test/fake-bin.mjs').FakeBin} fake the fake wrangler bin
 * @returns {Promise<void>}
 */
async function armLoggedIn(fake) {
  await fake.respond('whoami', {
    code: 0,
    stdout: 'You are logged in with an API Token, associated with the email test@example.com\n',
  });
}

/**
 * The `--json` stdout of a seed run against a genuinely empty allowlist: the owner insert and
 * the token insert both report one changed row, matching bootstrap.mjs's own trust check.
 */
const SEED_SUCCESS_STDOUT = JSON.stringify([
  { results: [], success: true, meta: { changes: 1 } },
  { results: [], success: true, meta: { changes: 0 } },
  { results: [], success: true, meta: { changes: 1 } },
]);

/**
 * Arm the `d1 execute` reply every happy-path test needs, so the sign-in action's own trust
 * check (bootstrap.mjs) finds a token it can report as actually written.
 * @param {import('../../test/fake-bin.mjs').FakeBin} fake the fake wrangler bin
 * @returns {Promise<void>}
 */
async function armSeedSuccess(fake) {
  await fake.respond('d1 execute', { code: 0, stdout: SEED_SUCCESS_STDOUT });
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

/**
 * Scan every file under each of `roots` for any of `needles`, recursively, returning the first
 * one found. Proven falsifiable in its own test with a doctored fixture, so a sweep elsewhere
 * that comes back clean can be trusted to mean the secret really is absent, not that the scan
 * has a blind spot.
 * @param {string[]} roots the directories to scan
 * @param {string[]} needles the literal strings to search for
 * @returns {Promise<string | null>} the first needle found in any scanned file, or null when none matched
 */
async function findLeakedSecret(roots, needles) {
  for (const root of roots) {
    const text = await readAllFiles(root);
    for (const needle of needles) {
      if (text.includes(needle)) return needle;
    }
  }
  return null;
}

/**
 * Build a small wrangler stand-in, independent of the shared fake-bin factory, whose `deploy`
 * reply changes between its first and second call. The shared fake-bin's matcher model has no
 * way to answer the same command differently on successive calls, and this is the one seam in
 * the whole chapter that legitimately needs it: proving the chapter catches a worker name that
 * moved between the two deploys.
 * @param {import('node:test').TestContext} t the running test's context
 * @param {string[]} urls the URL to answer with on the 1st, 2nd, ... call, cycling on the last
 * @returns {Promise<string>} the stand-in's executable path
 */
async function makeSequentialDeployWrangler(t, urls) {
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-cf-chapter-sequential-wrangler-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const binPath = path.join(dir, 'wrangler.mjs');
  const counterPath = path.join(dir, 'deploy-count');
  await writeFile(counterPath, '0');
  const script = `#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
const counterPath = ${JSON.stringify(counterPath)};
const urls = ${JSON.stringify(urls)};
const argv = process.argv.slice(2);
if (argv[0] === 'whoami') {
  process.stdout.write('You are logged in with an API Token\\n');
} else if (argv[0] === 'deploy') {
  const n = parseInt(await readFile(counterPath, 'utf8'), 10);
  await writeFile(counterPath, String(n + 1));
  const url = urls[Math.min(n, urls.length - 1)];
  process.stdout.write('Deployed thing triggers (0.1 sec)\\n  ' + url + '\\n');
}
process.exitCode = 0;
`;
  await writeFile(binPath, script, 'utf8');
  await chmod(binPath, 0o755);
  return binPath;
}

test('runCloudflareChapter: the happy path returns live, walks the state hops, and calls the tools in order', async (t) => {
  const stateDir = await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  await seedPushedSite('alpine-club-000000', dir);

  // One shared fake bin standing in for BOTH wrangler and npm: since it appends every call to one
  // invocations.jsonl regardless of which env var pointed at it, the resulting log is the exact
  // chronological order the chapter made its calls in, which is the ordering instrument the
  // spike's install-before-login regression test needs.
  const fake = await makeFakeBin('cloudflare-tools');
  t.after(() => fake.close());
  await armLoggedIn(fake);
  await armSeedSuccess(fake);
  await fake.respond('deploy', {
    code: 0,
    stdout: 'Deployed thing triggers (0.1 sec)\n  https://alpine-club.glw907.workers.dev\n',
  });
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  process.env.CAIRN_NPM_BIN = fake.binPath;
  t.after(() => {
    delete process.env.CAIRN_WRANGLER_BIN;
    delete process.env.CAIRN_NPM_BIN;
  });

  const opened = [];
  const logs = [];
  const outcome = await runCloudflareChapter({
    siteId: 'alpine-club-000000',
    siteName: 'Alpine Club',
    dir,
    flags: { yes: true, deploy: true, ownerEmail: 'T3@Example.com ' },
    log: (line) => logs.push(line),
    dryRun: false,
    openBrowser: async (url) => { opened.push(url); },
  });

  assert.equal(outcome, 'live');

  const state = await loadSite('alpine-club-000000');
  assert.equal(state.step, 'live');
  assert.equal(state.cloudflare.url, 'https://alpine-club.glw907.workers.dev');
  assert.equal(state.cloudflare.workerName, 'alpine-club');
  assert.equal(state.ownerEmail, 'T3@Example.com');
  assert.equal('pem' in state.github, false, 'the pem must be gone once the key move succeeds');
  assert.equal(state.github.appId, 42, 'sibling github fields must survive the key move');

  assert.equal(opened.length, 1);
  assert.equal(opened[0].startsWith('https://alpine-club.glw907.workers.dev/admin/auth/confirm?token='), true);

  const invocations = await fake.invocations();
  const shapes = invocations.map((i) => i.argv.slice(0, 2).join(' '));
  assert.deepEqual(shapes, [
    'install',
    'whoami',
    'run build',
    'deploy',
    'd1 migrations',
    'd1 migrations',
    'deploy',
    'secret put',
    'd1 execute',
  ]);
  assert.deepEqual(
    invocations.map((i) => i.argv),
    [
      ['install'],
      ['whoami'],
      ['run', 'build'],
      ['deploy'],
      ['d1', 'migrations', 'apply', 'AUTH_DB', '--remote'],
      ['d1', 'migrations', 'apply', 'APP_DB', '--remote'],
      ['deploy'],
      ['secret', 'put', 'GITHUB_APP_PRIVATE_KEY_B64'],
      invocations[8].argv,
    ],
  );
  assert.deepEqual(invocations[8].argv.slice(0, 4), ['d1', 'execute', 'AUTH_DB', '--remote']);
  assert.equal(invocations[8].argv[4], '--command');
  assert.match(invocations[8].argv[5], /'t3@example\.com'/, 'the seeded SQL must carry the lowercased email');

  const installIndex = invocations.findIndex((i) => i.argv[0] === 'install');
  const firstWranglerIndex = invocations.findIndex((i) => i.argv[0] !== 'install' && i.argv[0] !== 'run');
  assert.ok(installIndex < firstWranglerIndex, 'npm install must run strictly before the first wrangler call');

  // The no-secret sweep: neither the PEM's own marker, its base64 form, nor the raw bootstrap
  // token (recovered here from the opened confirm URL) may appear anywhere under the scaffold
  // directory or the state store. The state's own PEM deletion and the token's already-asserted
  // in-memory-only lifetime are what should make this always come back clean; the sweep is the
  // check that proves it, rather than trusting either mechanism by inspection.
  const rawToken = decodeURIComponent(opened[0].slice(opened[0].indexOf('token=') + 'token='.length));
  const pemBase64Prefix = Buffer.from(FAKE_PEM).toString('base64').slice(0, 24);
  const leaked = await findLeakedSecret([dir, stateDir], ['PRIVATE KEY', pemBase64Prefix, rawToken]);
  assert.equal(leaked, null, `expected no secret under the scaffold or state directories, found: ${leaked}`);
});

test('findLeakedSecret: a doctored file containing PRIVATE KEY is caught, proving the sweep can fail', async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-cf-chapter-doctored-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await writeFile(
    path.join(dir, 'stray.json'),
    JSON.stringify({ note: '-----BEGIN PRIVATE KEY-----\nleaked\n-----END PRIVATE KEY-----' }),
  );

  const found = await findLeakedSecret([dir], ['PRIVATE KEY']);
  assert.equal(found, 'PRIVATE KEY', 'the sweep must catch a needle actually present in a scanned file');

  const clean = await findLeakedSecret([dir], ['SOMETHING THAT IS NOT THERE']);
  assert.equal(clean, null);
});

test('runCloudflareChapter: a redeploy URL that differs from the first throws with a Next step', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  await seedPushedSite('alpine-club-mismatch', dir);

  const wranglerBin = await makeSequentialDeployWrangler(t, [
    'https://alpine-club-one.glw907.workers.dev',
    'https://alpine-club-two.glw907.workers.dev',
  ]);
  const npmFake = await makeFakeBin('npm');
  t.after(() => npmFake.close());
  process.env.CAIRN_WRANGLER_BIN = wranglerBin;
  process.env.CAIRN_NPM_BIN = npmFake.binPath;
  t.after(() => {
    delete process.env.CAIRN_WRANGLER_BIN;
    delete process.env.CAIRN_NPM_BIN;
  });

  await assert.rejects(
    () =>
      runCloudflareChapter({
        siteId: 'alpine-club-mismatch',
        siteName: 'Alpine Club',
        dir,
        flags: { yes: true, deploy: true, ownerEmail: 'owner@example.com' },
        log: () => {},
        dryRun: false,
        openBrowser: async () => {
          throw new Error('openBrowser must never be called when the redeploy check fails');
        },
      }),
    (err) => {
      assert.match(err.message, /Next step:/);
      return true;
    },
  );
});

test('runCloudflareChapter: --yes without --deploy skips with a re-run line and zero spawns', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  await seedPushedSite('alpine-club-skip', dir);

  process.env.CAIRN_WRANGLER_BIN = '/no/such/wrangler-binary-anywhere';
  process.env.CAIRN_NPM_BIN = '/no/such/npm-binary-anywhere';
  t.after(() => {
    delete process.env.CAIRN_WRANGLER_BIN;
    delete process.env.CAIRN_NPM_BIN;
  });

  const logs = [];
  const outcome = await runCloudflareChapter({
    siteId: 'alpine-club-skip',
    siteName: 'Alpine Club',
    dir,
    flags: { yes: true, deploy: false },
    log: (line) => logs.push(line),
    dryRun: false,
    openBrowser: async () => {
      throw new Error('openBrowser must never be called when the chapter is skipped');
    },
  });

  assert.equal(outcome, 'declined');
  assert.ok(logs.some((line) => line.includes('--deploy')), 'expected a re-run line naming --deploy');
});

test('runCloudflareChapter: declining the interactive consent returns declined', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  await seedPushedSite('alpine-club-decline', dir);

  process.env.CAIRN_WRANGLER_BIN = '/no/such/wrangler-binary-anywhere';
  process.env.CAIRN_NPM_BIN = '/no/such/npm-binary-anywhere';
  t.after(() => {
    delete process.env.CAIRN_WRANGLER_BIN;
    delete process.env.CAIRN_NPM_BIN;
  });

  const outcome = await runCloudflareChapter({
    siteId: 'alpine-club-decline',
    siteName: 'Alpine Club',
    dir,
    flags: { yes: false, deploy: true },
    log: () => {},
    dryRun: false,
    confirm: async () => false,
    openBrowser: async () => {
      throw new Error('openBrowser must never be called when consent is declined');
    },
  });

  assert.equal(outcome, 'declined');
});

test('runCloudflareChapter: a dry run makes zero fake-bin invocations and prints every action title', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  // A dry run never reads the state store, so no record needs seeding here.

  const fake = await makeFakeBin('cloudflare-tools-dry');
  t.after(() => fake.close());
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  process.env.CAIRN_NPM_BIN = fake.binPath;
  t.after(() => {
    delete process.env.CAIRN_WRANGLER_BIN;
    delete process.env.CAIRN_NPM_BIN;
  });

  const logs = [];
  const outcome = await runCloudflareChapter({
    siteId: 'alpine-club-dry',
    siteName: 'Alpine Club',
    dir,
    flags: { yes: true, deploy: true, ownerEmail: 'owner@example.com' },
    log: (line) => logs.push(line),
    dryRun: true,
    openBrowser: async () => {
      throw new Error('openBrowser must never be called under --dry-run');
    },
  });

  assert.equal(outcome, 'declined');
  assert.deepEqual(await fake.invocations(), []);
  assert.ok(logs.some((line) => line.includes("Install your site's dependencies")));
  assert.ok(logs.some((line) => line.includes('Sign in to Cloudflare')));
  assert.ok(logs.some((line) => line.includes('Build your site')));
  assert.ok(logs.some((line) => line.includes('Deploy to workers.dev')));
  assert.ok(logs.some((line) => line.includes("Protect your site's App key")));
  assert.ok(logs.some((line) => line.includes('Sign you in')));
});

test('runCloudflareChapter: a deploy-failed run leaves step at pushed, and a re-run re-enters at the install action', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  await seedPushedSite('alpine-club-retry', dir);

  const fake = await makeFakeBin('cloudflare-tools-retry');
  t.after(() => fake.close());
  await armLoggedIn(fake);
  await armSeedSuccess(fake);
  await fake.respond('deploy', { code: 1, stderr: 'A network request to the Cloudflare API failed.' });
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  process.env.CAIRN_NPM_BIN = fake.binPath;
  t.after(() => {
    delete process.env.CAIRN_WRANGLER_BIN;
    delete process.env.CAIRN_NPM_BIN;
  });

  const flags = { yes: true, deploy: true, ownerEmail: 'owner@example.com' };

  await assert.rejects(() =>
    runCloudflareChapter({
      siteId: 'alpine-club-retry',
      siteName: 'Alpine Club',
      dir,
      flags,
      log: () => {},
      dryRun: false,
      openBrowser: async () => {
        throw new Error('openBrowser must never be called when the deploy fails');
      },
    }),
  );

  const stateAfterFailure = await loadSite('alpine-club-retry');
  assert.equal(stateAfterFailure.step, 'pushed');

  // The failed run's own install action already succeeded (only the deploy failed), so a real
  // re-run would already have node_modules on disk; simulate that here rather than re-running
  // npm install for real.
  await mkdir(path.join(dir, 'node_modules'));
  await fake.respond('deploy', {
    code: 0,
    stdout: 'Deployed thing triggers (0.1 sec)\n  https://alpine-club.glw907.workers.dev\n',
  });

  const logs = [];
  const outcome = await runCloudflareChapter({
    siteId: 'alpine-club-retry',
    siteName: 'Alpine Club',
    dir,
    flags,
    log: (line) => logs.push(line),
    dryRun: false,
    openBrowser: async () => {},
  });

  assert.equal(outcome, 'live');
  assert.ok(logs.some((line) => /already installed|skip/i.test(line)), 'expected the install skip line');

  const invocations = await fake.invocations();
  assert.equal(invocations.filter((i) => i.argv[0] === 'install').length, 1, 'install must run exactly once total');
});

test('runCloudflareChapter: a record at deployed skips consent and the deploy group, running only the key move and sign-in', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  await seedPushedSite('alpine-club-deployed', dir, {
    step: 'deployed',
    ownerEmail: 'owner@example.com',
    // No `pem` here: the key move already succeeded before this run was interrupted, so the
    // resumed key-move action must find nothing to move and log its no-op line.
    github: {
      appId: 42,
      appSlug: 'cairn-alpine-club',
      clientSecret: 'fake-client-secret',
      owner: 'alpine-club-owner',
      installationId: 77,
    },
    cloudflare: { url: 'https://alpine-club.glw907.workers.dev', workerName: 'alpine-club' },
  });

  const fake = await makeFakeBin('cloudflare-tools-resume-deployed');
  t.after(() => fake.close());
  await armSeedSuccess(fake);
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  process.env.CAIRN_NPM_BIN = fake.binPath;
  t.after(() => {
    delete process.env.CAIRN_WRANGLER_BIN;
    delete process.env.CAIRN_NPM_BIN;
  });

  const opened = [];
  const logs = [];
  const throwingPrompt = async () => {
    throw new Error('a prompt must never be called when resuming at deployed');
  };
  const outcome = await runCloudflareChapter({
    siteId: 'alpine-club-deployed',
    siteName: 'Alpine Club',
    dir,
    flags: { yes: true, deploy: true },
    log: (line) => logs.push(line),
    dryRun: false,
    openBrowser: async (url) => { opened.push(url); },
    confirm: throwingPrompt,
    text: throwingPrompt,
  });

  assert.equal(outcome, 'live');
  // The chapter prints no resume line of its own: bin.mjs announces the resume before it
  // dispatches, and a second line here duplicated it in a real run.
  assert.equal(
    logs.some((line) => line.startsWith('Resuming ')),
    false,
    'bin.mjs owns the resume announcement; a line here duplicates it',
  );
  assert.ok(
    logs.some((line) => line.includes("The App's key is already a Worker secret.")),
    'expected the key move to log its no-op line',
  );
  assert.equal(logs.some((line) => line.includes('Deploy your site to Cloudflare')), false);
  assert.equal(logs.some((line) => line.includes("Install your site's dependencies")), false);
  assert.equal(logs.some((line) => line.includes('Build your site')), false);
  assert.equal(logs.some((line) => line.includes('Deploy to workers.dev')), false);

  const invocations = await fake.invocations();
  assert.equal(invocations.filter((i) => i.argv[0] === 'deploy').length, 0, 'expected zero deploy invocations');
  assert.equal(
    invocations.filter((i) => i.argv.slice(0, 2).join(' ') === 'd1 migrations').length,
    0,
    'expected zero migrations invocations',
  );
  assert.equal(
    invocations.filter((i) => i.argv.slice(0, 2).join(' ') === 'd1 execute').length,
    1,
    'expected exactly one seed invocation',
  );
  assert.equal(invocations.length, 1, 'the key move must no-op with no wrangler call, leaving only the seed');

  const state = await loadSite('alpine-club-deployed');
  assert.equal(state.step, 'live');

  assert.equal(opened.length, 1);
  assert.equal(
    opened[0].startsWith('https://alpine-club.glw907.workers.dev/admin/auth/confirm?token='),
    true,
  );
});

test('runCloudflareChapter: a deployed resume opens the record\'s real url, not a URL starting undefined', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  // The PEM is still present here, unlike the previous test: the key move must actually run and
  // succeed, proving deployUrl is seeded from the record even when every other resumed action
  // (not just the no-op key move) executes for real.
  await seedPushedSite('alpine-club-deployed-url', dir, {
    step: 'deployed',
    ownerEmail: 'owner@example.com',
    cloudflare: { url: 'https://alpine-club.glw907.workers.dev', workerName: 'alpine-club' },
  });

  const fake = await makeFakeBin('cloudflare-tools-resume-deployed-url');
  t.after(() => fake.close());
  await armSeedSuccess(fake);
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  process.env.CAIRN_NPM_BIN = fake.binPath;
  t.after(() => {
    delete process.env.CAIRN_WRANGLER_BIN;
    delete process.env.CAIRN_NPM_BIN;
  });

  const opened = [];
  const outcome = await runCloudflareChapter({
    siteId: 'alpine-club-deployed-url',
    siteName: 'Alpine Club',
    dir,
    flags: { yes: true, deploy: true },
    log: () => {},
    dryRun: false,
    openBrowser: async (url) => { opened.push(url); },
  });

  assert.equal(outcome, 'live');
  assert.equal(opened.length, 1);
  assert.equal(opened[0].startsWith('undefined'), false, 'the opened URL must never start with undefined');
  assert.equal(
    opened[0].startsWith('https://alpine-club.glw907.workers.dev/admin/auth/confirm?token='),
    true,
    'the opened URL must be built from the record\'s real cloudflare.url',
  );

  const invocations = await fake.invocations();
  assert.equal(invocations.filter((i) => i.argv[0] === 'deploy').length, 0, 'expected zero deploy invocations');
  assert.equal(
    invocations.some((i) => i.argv.slice(0, 2).join(' ') === 'secret put'),
    true,
    'the key move must actually run since this record still carries a pem',
  );
});

test('runCloudflareChapter: a deployed resume validates and persists an --owner-email override', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  await seedPushedSite('alpine-club-deployed-override', dir, {
    step: 'deployed',
    ownerEmail: 'old@example.com',
    github: {
      appId: 42,
      appSlug: 'cairn-alpine-club',
      clientSecret: 'fake-client-secret',
      owner: 'alpine-club-owner',
      installationId: 77,
    },
    cloudflare: { url: 'https://alpine-club.glw907.workers.dev', workerName: 'alpine-club' },
  });

  const fake = await makeFakeBin('cloudflare-tools-deployed-override');
  t.after(() => fake.close());
  await armSeedSuccess(fake);
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  process.env.CAIRN_NPM_BIN = fake.binPath;
  t.after(() => {
    delete process.env.CAIRN_WRANGLER_BIN;
    delete process.env.CAIRN_NPM_BIN;
  });

  const outcome = await runCloudflareChapter({
    siteId: 'alpine-club-deployed-override',
    siteName: 'Alpine Club',
    dir,
    flags: { yes: true, deploy: true, ownerEmail: 'new@example.com' },
    log: () => {},
    dryRun: false,
    openBrowser: async () => {},
  });

  assert.equal(outcome, 'live');
  const state = await loadSite('alpine-club-deployed-override');
  assert.equal(state.ownerEmail, 'new@example.com', 'a deployed resume must persist an --owner-email override');

  const invocations = await fake.invocations();
  const seedInvocation = invocations.find((i) => i.argv.slice(0, 2).join(' ') === 'd1 execute');
  assert.match(seedInvocation.argv[5], /'new@example\.com'/, 'the seeded SQL must use the overridden email');
});

test('runCloudflareChapter: an invalid --owner-email on a deployed resume throws instead of silently seeding', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  await seedPushedSite('alpine-club-deployed-bad-email', dir, {
    step: 'deployed',
    ownerEmail: 'old@example.com',
    cloudflare: { url: 'https://alpine-club.glw907.workers.dev', workerName: 'alpine-club' },
  });

  process.env.CAIRN_WRANGLER_BIN = '/no/such/wrangler-binary-anywhere';
  process.env.CAIRN_NPM_BIN = '/no/such/npm-binary-anywhere';
  t.after(() => {
    delete process.env.CAIRN_WRANGLER_BIN;
    delete process.env.CAIRN_NPM_BIN;
  });

  await assert.rejects(
    () =>
      runCloudflareChapter({
        siteId: 'alpine-club-deployed-bad-email',
        siteName: 'Alpine Club',
        dir,
        flags: { yes: true, deploy: true, ownerEmail: 'not-an-email' },
        log: () => {},
        dryRun: false,
        openBrowser: async () => {
          throw new Error('openBrowser must never be called when the owner email fails validation');
        },
      }),
    (err) => {
      assert.match(err.message, /sign-in email/);
      return true;
    },
  );

  const state = await loadSite('alpine-club-deployed-bad-email');
  assert.equal(state.ownerEmail, 'old@example.com', 'a rejected override must never overwrite the saved email');
});

test('runCloudflareChapter: a pushed re-entry with a saved ownerEmail prompts nothing for the email', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  await seedPushedSite('alpine-club-prompt', dir, { ownerEmail: 'owner@example.com' });

  const fake = await makeFakeBin('cloudflare-tools-prompt');
  t.after(() => fake.close());
  await armLoggedIn(fake);
  await armSeedSuccess(fake);
  await fake.respond('deploy', {
    code: 0,
    stdout: 'Deployed thing triggers (0.1 sec)\n  https://alpine-club.glw907.workers.dev\n',
  });
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  process.env.CAIRN_NPM_BIN = fake.binPath;
  t.after(() => {
    delete process.env.CAIRN_WRANGLER_BIN;
    delete process.env.CAIRN_NPM_BIN;
  });

  const outcome = await runCloudflareChapter({
    siteId: 'alpine-club-prompt',
    siteName: 'Alpine Club',
    dir,
    // yes: false drives the interactive branch of every step, so a real prompt call for the
    // email would surface here; confirm still answers normally, since consent is asked for
    // every pushed re-entry, and only the email prompt is under test.
    flags: { yes: false, deploy: true },
    log: () => {},
    dryRun: false,
    openBrowser: async () => {},
    confirm: async () => true,
    text: async () => {
      throw new Error('text must never be called when the owner email is already saved');
    },
  });

  assert.equal(outcome, 'live');
});
