// Dispatcher-level coverage for bin.mjs's resume path: no other file spawns the CLI itself, so
// this is where the `--sign-in` recovery and the resume-line override note get proven against
// the real entry point rather than against a chapter function called directly. Every run here
// spawns bin.mjs as a real child process (its `await main()` at module scope makes it otherwise
// unimportable) with a fake wrangler on CAIRN_WRANGLER_BIN and a fake platform opener
// prepended onto PATH: emptying PATH outright (src/github/open.test.mjs's own technique) would
// also stop the fake wrangler/npm scripts from running, since they are invoked through their own
// `#!/usr/bin/env node` shebang and need PATH to resolve `node`. The fake opener is a harmless
// no-op script, so nothing here ever launches a real browser, and openBrowser's own unconditional
// fallback line is still what proves an open was attempted.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, writeFile, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeFakeBin } from './fake-bin.mjs';
import { saveSite } from '../src/state.mjs';

const execFileAsync = promisify(execFile);
const BIN_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'bin.mjs');

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
 * Point CAIRN_STATE_DIR at a fresh temporary directory for the duration of one test, so
 * `saveSite` here and the spawned CLI's own state reads agree on where records live.
 * @param {import('node:test').TestContext} t the running test's context
 * @returns {Promise<string>} the state directory's absolute path
 */
async function freshStateDir(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-resume-state-'));
  process.env.CAIRN_STATE_DIR = dir;
  t.after(() => {
    delete process.env.CAIRN_STATE_DIR;
    return rm(dir, { recursive: true, force: true });
  });
  return dir;
}

/**
 * Build a directory holding harmless no-op stand-ins for every platform opener open.mjs might
 * spawn (`xdg-open`, `open`, `cmd`), so prepending it onto PATH guarantees open.mjs finds one of
 * these before it could ever find a real browser opener.
 * @param {import('node:test').TestContext} t the running test's context
 * @returns {Promise<string>} the directory's absolute path
 */
async function makeFakeOpenerDir(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-fake-opener-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  for (const name of ['xdg-open', 'open', 'cmd']) {
    const scriptPath = path.join(dir, name);
    await writeFile(scriptPath, '#!/bin/sh\nexit 0\n');
    await chmod(scriptPath, 0o755);
  }
  return dir;
}

/**
 * Run create-cairn-site as a real child process, with a fake opener prepended onto PATH so no
 * real browser can ever launch. Never rejects: a non-zero exit is returned rather than thrown, so
 * a test can assert on the failure path's own stdout/stderr and exit code.
 * @param {string[]} args the CLI arguments, e.g. `['--dir', dir, '--sign-in']`
 * @param {{ stateDir: string, wranglerBin: string, npmBin?: string, fakeOpenerDir: string }} options
 *  the env seams to set
 * @returns {Promise<{ code: number, stdout: string, stderr: string }>} the run's outcome
 */
async function runCli(args, { stateDir, wranglerBin, npmBin, fakeOpenerDir }) {
  const env = {
    ...process.env,
    PATH: `${fakeOpenerDir}:${process.env.PATH ?? ''}`,
    CAIRN_STATE_DIR: stateDir,
    CAIRN_WRANGLER_BIN: wranglerBin,
  };
  if (npmBin) env.CAIRN_NPM_BIN = npmBin;
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [BIN_PATH, ...args], { env });
    return { code: 0, stdout, stderr };
  } catch (err) {
    return { code: err.code ?? 1, stdout: err.stdout ?? '', stderr: err.stderr ?? '' };
  }
}

/**
 * Save a site record already at step `live`, the shape `printLiveInfo` and `reseedAndOpen`
 * both read from.
 * @param {string} siteId the site id to seed, matching the state store's id shape
 * @param {string} dir the scaffold directory the record points at
 * @param {object} [overrides] fields to merge over the default record
 * @returns {Promise<void>}
 */
async function seedLiveSite(siteId, dir, overrides = {}) {
  await saveSite(siteId, {
    name: 'Alpine Club',
    dir,
    step: 'live',
    ownerEmail: 'owner@example.com',
    github: {
      appId: 42,
      appSlug: 'cairn-alpine-club',
      repo: { owner: 'alpine-club-owner', repo: 'alpine-club' },
      installationId: 77,
    },
    cloudflare: { url: 'https://alpine-club.glw907.workers.dev', workerName: 'alpine-club' },
    ...overrides,
  });
}

test('bin.mjs --sign-in at live reseeds exactly once and reopens the browser', async (t) => {
  const stateDir = await freshStateDir(t);
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-resume-scaffold-'));
  t.after(() => rm(dir, { recursive: true, force: true }));

  const fake = await makeFakeBin('resume-sign-in');
  t.after(() => fake.close());
  await fake.respond('d1 execute', { code: 0, stdout: SEED_SUCCESS_STDOUT });
  const fakeOpenerDir = await makeFakeOpenerDir(t);

  await seedLiveSite('alpine-club-abcdef', dir);

  // --yes (with no --domain) is what keeps this hermetic now that a `live` record continues
  // straight into chapter 2's own admission gate after the --sign-in recovery: with no --yes,
  // that gate would ask a real, unstubbed @clack confirm prompt this spawned run has no stdin
  // answer for. --yes with no --domain takes the gate's unattended skip-hint branch instead,
  // which returns with no further wrangler calls, so the assertions below are unaffected.
  const result = await runCli(['--dir', dir, '--sign-in', '--yes'], { stateDir, wranglerBin: fake.binPath, fakeOpenerDir });

  assert.equal(result.code, 0, `expected exit 0, got ${result.code}. stderr: ${result.stderr}`);
  // This run's stdout is piped rather than a TTY (execFile always pipes), so the sign-in URL's raw
  // token must never appear in it: only the site's origin and a re-run hint print instead.
  assert.equal(
    result.stdout.includes('token='),
    false,
    `expected no token-bearing link in this non-interactive run's stdout, got: ${result.stdout}`,
  );
  assert.ok(
    result.stdout.includes('Your site is at: https://alpine-club.glw907.workers.dev'),
    `expected the site's origin in stdout, got: ${result.stdout}`,
  );
  assert.ok(
    result.stdout.includes('--sign-in'),
    `expected a re-run hint naming --sign-in, got: ${result.stdout}`,
  );

  const invocations = await fake.invocations();
  assert.equal(invocations.filter((i) => i.argv[0] === 'deploy').length, 0, 'expected zero deploy invocations');
  assert.equal(
    invocations.filter((i) => i.argv.slice(0, 2).join(' ') === 'd1 execute').length,
    1,
    'expected exactly one seed invocation',
  );
  assert.equal(invocations.length, 1, '--sign-in must touch wrangler only for the reseed');
});

test('bin.mjs --sign-in on a record with no saved Cloudflare URL fails loud before seeding', async (t) => {
  const stateDir = await freshStateDir(t);
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-resume-scaffold-'));
  t.after(() => rm(dir, { recursive: true, force: true }));

  const fake = await makeFakeBin('resume-sign-in-no-url');
  t.after(() => fake.close());
  const fakeOpenerDir = await makeFakeOpenerDir(t);

  await seedLiveSite('alpine-club-nourl1', dir, { cloudflare: undefined });

  const result = await runCli(['--dir', dir, '--sign-in'], { stateDir, wranglerBin: fake.binPath, fakeOpenerDir });

  assert.equal(result.code, 1, `expected exit 1, got ${result.code}. stdout: ${result.stdout}`);
  assert.ok(
    result.stderr.includes('Next step:'),
    `expected a next step, got: ${result.stderr}`,
  );
  assert.equal(result.stderr.includes('TypeError'), false, `expected no raw TypeError, got: ${result.stderr}`);
  assert.deepEqual(await fake.invocations(), [], 'seedOwnerAndToken must never be reached with no saved url');
});

test('bin.mjs --sign-in on a record with no ownerEmail prints a next step, not a bare TypeError', async (t) => {
  const stateDir = await freshStateDir(t);
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-resume-scaffold-'));
  t.after(() => rm(dir, { recursive: true, force: true }));

  const fake = await makeFakeBin('resume-sign-in-no-email');
  t.after(() => fake.close());
  const fakeOpenerDir = await makeFakeOpenerDir(t);

  await seedLiveSite('alpine-club-nomail', dir, { ownerEmail: undefined });

  const result = await runCli(['--dir', dir, '--sign-in'], { stateDir, wranglerBin: fake.binPath, fakeOpenerDir });

  assert.equal(result.code, 1, `expected exit 1, got ${result.code}. stdout: ${result.stdout}`);
  assert.ok(
    result.stderr.includes('Next step:') && result.stderr.includes('--owner-email'),
    `expected a next step naming --owner-email, got: ${result.stderr}`,
  );
  assert.equal(result.stderr.includes('TypeError'), false, `expected no raw TypeError, got: ${result.stderr}`);

  assert.deepEqual(await fake.invocations(), [], 'seedOwnerAndToken must never be reached with no ownerEmail');
});

test('bin.mjs resumes a pushed record and notes an --owner-email override in the resume line', async (t) => {
  const stateDir = await freshStateDir(t);
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-resume-scaffold-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await writeFile(
    path.join(dir, 'wrangler.jsonc'),
    JSON.stringify({ name: 'alpine-club', vars: { PUBLIC_ORIGIN: 'http://localhost:4173' } }, null, 2),
  );

  const fake = await makeFakeBin('resume-pushed-override');
  t.after(() => fake.close());
  await fake.respond('whoami', { code: 0, stdout: 'You are logged in with an API Token\n' });
  await fake.respond('whoami --json', {
    code: 0,
    stdout: JSON.stringify({
      loggedIn: true,
      accounts: [{ id: 'test-account-id', name: 'Test Account' }],
    }),
  });
  await fake.respond('deploy', {
    code: 0,
    stdout: 'Deployed thing triggers (0.1 sec)\n  https://alpine-club.glw907.workers.dev\n',
  });
  await fake.respond('d1 execute', { code: 0, stdout: SEED_SUCCESS_STDOUT });

  await saveSite('alpine-club-pushd1', {
    name: 'Alpine Club',
    dir,
    step: 'pushed',
    ownerEmail: 'old@example.com',
    github: {
      appId: 42,
      appSlug: 'cairn-alpine-club',
      owner: 'alpine-club-owner',
      installationId: 77,
      repo: { owner: 'alpine-club-owner', repo: 'alpine-club' },
    },
  });

  const fakeOpenerDir = await makeFakeOpenerDir(t);
  const result = await runCli(
    ['--dir', dir, '--yes', '--deploy', '--owner-email', 'new@example.com'],
    { stateDir, wranglerBin: fake.binPath, npmBin: fake.binPath, fakeOpenerDir },
  );

  assert.equal(result.code, 0, `expected exit 0, got ${result.code}. stderr: ${result.stderr}`);
  assert.ok(
    result.stdout.includes(
      "Resuming Alpine Club at pushed (using this run's --owner-email instead of the saved answer).",
    ),
    `expected the resume line to note the --owner-email override, got: ${result.stdout}`,
  );
});
