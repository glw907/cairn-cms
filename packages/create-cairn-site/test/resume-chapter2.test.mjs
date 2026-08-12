// Dispatcher-level coverage for bin.mjs's chapter-2 resume paths: a sibling of
// resume-cloudflare.test.mjs, not an extension of it, since chapter 1's own resume cases already
// fill that file and chapter 2 has enough of its own to outgrow it. Every run here spawns bin.mjs
// as a real child process, the same idiom resume-cloudflare.test.mjs already established: a fake
// wrangler on CAIRN_WRANGLER_BIN, a fake-opener directory prepended onto PATH, and, new to this
// file, a fake Cloudflare on CAIRN_CLOUDFLARE_API_BASE.
//
// HERMETIC-TEST CONSTRAINT: there is no env seam for DNS or for the cutover's HTTPS probe, and
// this file adds none. A spawned run here must therefore never reach the records-read hop, the
// delegation hop, or the cutover hop; those are already proven in-process by records.test.mjs,
// zone.test.mjs, hostname.test.mjs, and chapter2.test.mjs. The deterministic stop this file uses
// instead: every case that needs to prove routing INTO chapter 2 runs with `--yes --domain
// <name>` and no `CAIRN_CF_API_TOKEN` in the child env, which makes `ensureApiToken` throw a
// plain Error with its own "Next:" line at the token hop (src/cloudflare/prefill.mjs), after
// chapter 2 has already printed its account-selection and token-hop titles. That proves which
// step routed into chapter 2, and that scaffold and the GitHub chapter were never reached,
// without ever touching DNS or a real Cloudflare token.
//
// The wait-row parks (delegation-pending, hostname-propagating, certificate-pending) are
// unreachable in a spawned run without a DNS or HTTPS seam, so this file does not attempt one:
// their own printed copy is proven in chapter2.test.mjs. What this file proves about a park is
// bin.mjs's shared contract every park exits through (return the outcome, exit 0, print a next
// step): the admission-declined cases below exercise exactly that contract, since
// admission-declined is chapter 2's own park-shaped early return.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, writeFile, chmod, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeFakeBin } from './fake-bin.mjs';
import { startFakeCloudflare } from './fake-cloudflare.mjs';
import { saveSite, loadSite } from '../src/state.mjs';

const execFileAsync = promisify(execFile);
const BIN_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'bin.mjs');

/**
 * Point CAIRN_STATE_DIR at a fresh temporary directory for the duration of one test.
 * @param {import('node:test').TestContext} t
 * @returns {Promise<string>} the state directory's absolute path
 */
async function freshStateDir(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-chapter2-resume-state-'));
  process.env.CAIRN_STATE_DIR = dir;
  t.after(() => {
    delete process.env.CAIRN_STATE_DIR;
    return rm(dir, { recursive: true, force: true });
  });
  return dir;
}

/**
 * Build a directory holding harmless no-op stand-ins for every platform opener open.mjs might
 * spawn, mirroring resume-cloudflare.test.mjs's own helper: prepending it onto PATH guarantees
 * open.mjs finds one of these before it could ever find a real browser opener.
 * @param {import('node:test').TestContext} t
 * @returns {Promise<string>} the directory's absolute path
 */
async function makeFakeOpenerDir(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-chapter2-fake-opener-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  for (const name of ['xdg-open', 'open', 'cmd']) {
    const scriptPath = path.join(dir, name);
    await writeFile(scriptPath, '#!/bin/sh\nexit 0\n');
    await chmod(scriptPath, 0o755);
  }
  return dir;
}

/**
 * Run create-cairn-site as a real child process, the same never-rejects contract as
 * resume-cloudflare.test.mjs's own runCli. `CAIRN_CF_API_TOKEN` is explicitly stripped from the
 * child's env unless `extraEnv` supplies one, so an operator's own shell can never accidentally
 * make a case that depends on the token being absent pass for the wrong reason.
 * @param {string[]} args the CLI arguments
 * @param {{ stateDir: string, wranglerBin: string, apiBase: string, fakeOpenerDir: string,
 *  extraEnv?: Record<string, string> }} options the env seams to set
 * @returns {Promise<{ code: number, stdout: string, stderr: string }>} the run's outcome
 */
async function runCli(args, { stateDir, wranglerBin, apiBase, fakeOpenerDir, extraEnv = {} }) {
  const env = {
    ...process.env,
    PATH: `${fakeOpenerDir}:${process.env.PATH ?? ''}`,
    CAIRN_STATE_DIR: stateDir,
    CAIRN_WRANGLER_BIN: wranglerBin,
    CAIRN_CLOUDFLARE_API_BASE: apiBase,
    ...extraEnv,
  };
  if (!('CAIRN_CF_API_TOKEN' in extraEnv)) delete env.CAIRN_CF_API_TOKEN;
  try {
    // input: '' closes the child's stdin immediately, and timeout is a backstop: with neither, a
    // regression that routes this run into a real, unstubbed @clack prompt hangs the whole test
    // run forever instead of failing it (the child's stdin is otherwise an open pipe no one ever
    // writes to or closes).
    const { stdout, stderr } = await execFileAsync(process.execPath, [BIN_PATH, ...args], {
      env,
      input: '',
      timeout: 60000,
    });
    return { code: 0, stdout, stderr };
  } catch (err) {
    return { code: err.code ?? 1, stdout: err.stdout ?? '', stderr: err.stderr ?? '' };
  }
}

/**
 * Seed a site record shaped like a site partway (or all the way) through chapter 2: chapter 1's
 * own fields (github, cloudflare.url/workerName) plus whatever chapter-2 fields the step already
 * implies. `cloudflare.accountId` is always saved, so `ensureAccountId` takes its zero-enumeration
 * branch and this file never needs a wrangler `whoami` response armed.
 * @param {string} siteId the site id to seed, matching the state store's id shape
 * @param {string} dir the scaffold directory the record points at
 * @param {string} step the step to seed at
 * @param {object} [cloudflareOverrides] fields to merge over the default `cloudflare` shape
 * @returns {Promise<void>}
 */
async function seedChapter2Site(siteId, dir, step, cloudflareOverrides = {}) {
  await saveSite(siteId, {
    name: 'Chapter2 Resume Site',
    dir,
    step,
    ownerEmail: 'owner@example.com',
    github: {
      appId: 99,
      appSlug: 'cairn-chapter2-resume',
      repo: { owner: 'chapter2-resume-owner', repo: 'chapter2-resume-site' },
      installationId: 11,
    },
    cloudflare: {
      url: 'https://chapter2-resume-site.glw907.workers.dev',
      workerName: 'chapter2-resume-site',
      accountId: 'acct-1',
      ...cloudflareOverrides,
    },
  });
}

/** The scaffold hand-over line, whose absence proves a resumed run never re-scaffolded. */
const SCAFFOLD_MARKER = 'Your site is scaffolded at';
/** The GitHub chapter's own consent title, whose absence proves it never ran. */
const GITHUB_CHAPTER_MARKER = 'Confirm the GitHub App and repository';
/** Chapter 1's own consent title, whose absence proves it never ran. */
const CHAPTER1_MARKER = 'Deploy your site to Cloudflare';

/**
 * Assert the negative markers that prove a run never fell through to scaffold, the GitHub
 * chapter, or chapter 1: every case that enters chapter 2 directly needs all three absent.
 * @param {string} stdout the run's captured stdout
 */
function assertNeverFellThrough(stdout) {
  assert.equal(stdout.includes(SCAFFOLD_MARKER), false, `expected no scaffold output, got: ${stdout}`);
  assert.equal(
    stdout.includes(GITHUB_CHAPTER_MARKER),
    false,
    `expected no GitHub chapter output, got: ${stdout}`,
  );
  assert.equal(stdout.includes(CHAPTER1_MARKER), false, `expected no chapter-1 output, got: ${stdout}`);
}

// --- One case per new resumable step: enters chapter 2 directly, stops at the token hop -------

for (const [step, siteId] of [
  ['zone-created', 'chapter2-zoncr1'],
  ['records-carried', 'chapter2-recscr'],
  ['delegated', 'chapter2-delegd'],
]) {
  test(`bin.mjs resumes a record at ${step} directly into chapter 2, never re-scaffolding`, async (t) => {
    const stateDir = await freshStateDir(t);
    const dir = await mkdtemp(path.join(tmpdir(), 'cairn-chapter2-resume-scaffold-'));
    t.after(() => rm(dir, { recursive: true, force: true }));

    const fake = await makeFakeBin(`chapter2-resume-${step}`);
    t.after(() => fake.close());
    const fakeOpenerDir = await makeFakeOpenerDir(t);
    const cloudflare = await startFakeCloudflare();
    t.after(() => cloudflare.close());

    await seedChapter2Site(siteId, dir, step, {
      domain: 'resume-test.example',
      zoneId: 'fake-zone-id',
      nameServers: ['burt.ns.cloudflare.com', 'carlane.ns.cloudflare.com'],
      alreadyActive: true,
    });

    const result = await runCli(['--dir', dir, '--yes', '--domain', 'resume-test.example'], {
      stateDir,
      wranglerBin: fake.binPath,
      apiBase: cloudflare.apiBase,
      fakeOpenerDir,
    });

    assert.equal(result.code, 1, `expected exit 1, got ${result.code}. stdout: ${result.stdout}`);
    assert.ok(
      result.stdout.includes('Find your Cloudflare account'),
      `expected the account-selection hop title, got: ${result.stdout}`,
    );
    assert.ok(
      result.stdout.includes('Get a Cloudflare API token'),
      `expected the token hop title, got: ${result.stdout}`,
    );
    assertNeverFellThrough(result.stdout);

    assert.ok(
      result.stderr.includes('Next:'),
      `expected the token hop's own Next: line, got: ${result.stderr}`,
    );
    // No duplicated generic fallback line on top of the row's own Next: line.
    assert.equal(
      result.stderr.includes('Next step: fix the problem above'),
      false,
      `expected no generic fallback line, got: ${result.stderr}`,
    );

    assert.equal(cloudflare.requests.length, 0, 'the token hop must fail before any Cloudflare API call');
    assert.deepEqual(
      await fake.invocations(),
      [],
      'a saved accountId means ensureAccountId enumerates nothing, so wrangler is never invoked',
    );

    const state = await loadSite(siteId);
    assert.equal(state.step, step, 'a thrown row must never advance the saved step');
  });
}

// --- The `live` step: continues into chapter 2 instead of the old early return -----------------

test('bin.mjs at live with --yes --domain enters chapter 2 instead of stopping at the already-live return', async (t) => {
  const stateDir = await freshStateDir(t);
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-chapter2-resume-scaffold-'));
  t.after(() => rm(dir, { recursive: true, force: true }));

  const fake = await makeFakeBin('chapter2-resume-live-domain');
  t.after(() => fake.close());
  const fakeOpenerDir = await makeFakeOpenerDir(t);
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());

  await seedChapter2Site('chapter2-livedm', dir, 'live');

  const result = await runCli(['--dir', dir, '--yes', '--domain', 'live-domain-test.example'], {
    stateDir,
    wranglerBin: fake.binPath,
    apiBase: cloudflare.apiBase,
    fakeOpenerDir,
  });

  assert.equal(result.code, 1, `expected exit 1, got ${result.code}. stdout: ${result.stdout}`);
  assert.ok(
    result.stdout.includes('is already live'),
    `expected the existing already-live line to still print, got: ${result.stdout}`,
  );
  // The admission detail's own opening words, not the hop title: printLiveInfo's re-run hint
  // opens on "Connect your own domain any time", so a title match could be satisfied by a
  // closing block rather than by the gate itself.
  assert.ok(
    result.stdout.includes('Connects a domain you already own'),
    `expected chapter 2's admission hop to have run, got: ${result.stdout}`,
  );
  assert.ok(
    result.stdout.includes('Get a Cloudflare API token'),
    `expected chapter 2 to have reached the token hop, got: ${result.stdout}`,
  );
  assertNeverFellThrough(result.stdout);
  assert.ok(result.stderr.includes('Next:'), `expected the token hop's Next: line, got: ${result.stderr}`);
});

test('bin.mjs at live with --yes and no --domain skips chapter 2 with a hint and still prints the live block', async (t) => {
  const stateDir = await freshStateDir(t);
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-chapter2-resume-scaffold-'));
  t.after(() => rm(dir, { recursive: true, force: true }));

  const fake = await makeFakeBin('chapter2-resume-live-skip');
  t.after(() => fake.close());
  const fakeOpenerDir = await makeFakeOpenerDir(t);
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());

  await seedChapter2Site('chapter2-livesk', dir, 'live');

  const result = await runCli(['--dir', dir, '--yes'], {
    stateDir,
    wranglerBin: fake.binPath,
    apiBase: cloudflare.apiBase,
    fakeOpenerDir,
  });

  assert.equal(result.code, 0, `expected exit 0, got ${result.code}. stderr: ${result.stderr}`);
  assert.ok(
    result.stdout.includes('Skipping the domain chapter'),
    `expected the unattended skip hint, got: ${result.stdout}`,
  );
  assert.ok(
    result.stdout.includes('Your site is live on GitHub:'),
    `expected the live info block, got: ${result.stdout}`,
  );
  assert.ok(
    result.stdout.includes('Connect your own domain any time by re-running'),
    `expected the reworded next-chapter copy, got: ${result.stdout}`,
  );
  // The App link and the doctor reminder are the shared closing tail printLiveInfo,
  // printDomainLiveInfo, and a completing chapter-2 run all end on; asserting them here and
  // again on the domain-live terminal case below proves they stay identical between the two.
  assert.ok(
    result.stdout.includes('The App that publishes for you:'),
    `expected the shared App link, got: ${result.stdout}`,
  );
  assert.ok(
    result.stdout.includes('Run `npx cairn-doctor` any time to check what is set up and what is still missing.'),
    `expected the shared doctor reminder, got: ${result.stdout}`,
  );
  assertNeverFellThrough(result.stdout);
  assert.equal(cloudflare.requests.length, 0, 'a declined admission must make no Cloudflare API call');

  const state = await loadSite('chapter2-livesk');
  assert.equal(state.step, 'live', 'a declined admission must not advance the saved step');
});

// --- The `domain-live` step: terminal, never calls runChapter2 ---------------------------------

test('bin.mjs at domain-live is terminal: prints the closing copy and never calls runChapter2', async (t) => {
  const stateDir = await freshStateDir(t);
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-chapter2-resume-scaffold-'));
  t.after(() => rm(dir, { recursive: true, force: true }));

  const fake = await makeFakeBin('chapter2-resume-domain-live');
  t.after(() => fake.close());
  const fakeOpenerDir = await makeFakeOpenerDir(t);
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());

  await seedChapter2Site('chapter2-domliv', dir, 'domain-live', {
    domain: 'already-live-test.example',
  });

  const result = await runCli(['--dir', dir], {
    stateDir,
    wranglerBin: fake.binPath,
    apiBase: cloudflare.apiBase,
    fakeOpenerDir,
  });

  assert.equal(result.code, 0, `expected exit 0, got ${result.code}. stderr: ${result.stderr}`);
  assert.ok(
    result.stdout.includes('https://already-live-test.example'),
    `expected the domain named in the closing copy, got: ${result.stdout}`,
  );
  assert.ok(
    result.stdout.includes('https://already-live-test.example/admin'),
    `expected the admin sign-in URL, got: ${result.stdout}`,
  );
  // The same shared closing tail asserted on the live-skip case above: a later re-run at
  // domain-live must show the same repo/App/doctor lines a run that just finished the chapter
  // does, not a shorter block.
  assert.ok(
    result.stdout.includes('Your site is live on GitHub:'),
    `expected the shared repo link, got: ${result.stdout}`,
  );
  assert.ok(
    result.stdout.includes('The App that publishes for you:'),
    `expected the shared App link, got: ${result.stdout}`,
  );
  assert.ok(
    result.stdout.includes('Run `npx cairn-doctor` any time to check what is set up and what is still missing.'),
    `expected the shared doctor reminder, got: ${result.stdout}`,
  );
  assert.equal(
    result.stdout.includes('Get a Cloudflare API token'),
    false,
    `runChapter2 must never run for a terminal domain-live record, got: ${result.stdout}`,
  );
  assertNeverFellThrough(result.stdout);

  assert.equal(cloudflare.requests.length, 0, 'a terminal domain-live record must make no Cloudflare API call');
  assert.deepEqual(await fake.invocations(), [], 'a terminal domain-live record must shell out to nothing');
});

// --- --start-over refuses from any chapter-2 step -----------------------------------------------

test('bin.mjs --start-over from a chapter-2 step refuses rather than retiring the record', async (t) => {
  const stateDir = await freshStateDir(t);
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-chapter2-resume-scaffold-'));
  t.after(() => rm(dir, { recursive: true, force: true }));

  const fake = await makeFakeBin('chapter2-resume-start-over');
  t.after(() => fake.close());
  const fakeOpenerDir = await makeFakeOpenerDir(t);
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());

  const siteId = 'chapter2-stovr1';
  await seedChapter2Site(siteId, dir, 'zone-created', {
    domain: 'start-over-test.example',
    zoneId: 'fake-zone-id',
    nameServers: ['burt.ns.cloudflare.com', 'carlane.ns.cloudflare.com'],
  });
  const before = await loadSite(siteId);

  const result = await runCli(['--dir', dir, '--start-over'], {
    stateDir,
    wranglerBin: fake.binPath,
    apiBase: cloudflare.apiBase,
    fakeOpenerDir,
  });

  assert.equal(result.code, 1, `expected exit 1, got ${result.code}. stdout: ${result.stdout}`);
  assert.ok(
    result.stderr.includes('zone') && result.stderr.includes('DNS') && result.stderr.includes('Worker'),
    `expected the refusal to name the zone, records, and Worker, got: ${result.stderr}`,
  );
  assert.ok(result.stderr.includes('Next:'), `expected a Next: line, got: ${result.stderr}`);
  assert.equal(cloudflare.requests.length, 0, '--start-over must never touch the Cloudflare API');
  assert.deepEqual(await fake.invocations(), [], '--start-over must never shell out to wrangler');

  const after = await loadSite(siteId);
  assert.deepEqual(after, before, 'the state record must be present and unchanged on disk');

  const entries = await readdir(stateDir);
  assert.equal(
    entries.some((entry) => entry.includes('.retired-')),
    false,
    'a refused --start-over must never write a retired record',
  );
});
