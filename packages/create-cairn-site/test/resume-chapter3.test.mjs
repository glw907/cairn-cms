// Dispatcher-level coverage for bin.mjs's chapter-3 routing (T4c task 9): a sibling of
// resume-chapter2.test.mjs, proving `--connect`, the plain re-entry at chapter 3's own resumable
// and terminal steps, the fresh-run fall-through into chapter 3, and the --start-over refusal all
// route through bin.mjs's own real entry point, the same way that file already proves chapter 2's
// routing (its own module tests cannot see bin.mjs's dispatch logic at all).
//
// HERMETIC-TEST CONSTRAINT, inherited from resume-chapter2.test.mjs: there is no DNS or HTTPS
// probe seam here either, so a case that must prove chapter 3 actually started (rather than a
// refusal or a cached print) uses the same deterministic stop that file established: `--yes` with
// no `CAIRN_CF_API_TOKEN` in the child env and no saved token on the record makes chapter 3's own
// token hop (`Get a fresh Cloudflare API token`, prefill.mjs's `ensureApiToken`) throw a plain
// Error with its own `Next:` line, after whichever of chapter 3's earlier hops already printed.
// That proves chapter 3 itself ran, and it does so before any Cloudflare or GitHub network call a
// fake would need to answer, so most cases here need no fake Cloudflare or fake GitHub at all.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, writeFile, chmod, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeFakeBin } from './fake-bin.mjs';
import { startFakeCloudflare } from './fake-cloudflare.mjs';
import { startFakeGithub, pointAtFake } from './fake-github.mjs';
import { saveSite, loadSite } from '../src/state.mjs';

const execFileAsync = promisify(execFile);
const BIN_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'bin.mjs');

/** Point CAIRN_STATE_DIR at a fresh temporary directory for the duration of one test. */
async function freshStateDir(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-chapter3-resume-state-'));
  process.env.CAIRN_STATE_DIR = dir;
  t.after(() => {
    delete process.env.CAIRN_STATE_DIR;
    return rm(dir, { recursive: true, force: true });
  });
  return dir;
}

/** Build a directory of harmless no-op stand-ins for every platform opener open.mjs might spawn,
 * mirroring resume-chapter2.test.mjs's own helper. */
async function makeFakeOpenerDir(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-chapter3-fake-opener-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  for (const name of ['xdg-open', 'open', 'cmd']) {
    const scriptPath = path.join(dir, name);
    await writeFile(scriptPath, '#!/bin/sh\nexit 0\n');
    await chmod(scriptPath, 0o755);
  }
  return dir;
}

/**
 * Run create-cairn-site as a real child process. `CAIRN_CF_API_TOKEN` is always stripped from the
 * child's env unless `extraEnv` supplies one, matching resume-chapter2.test.mjs's own contract, so
 * an operator's own shell can never accidentally make a token-hop-stop case pass for the wrong
 * reason.
 * @param {string[]} args the CLI arguments
 * @param {{ stateDir: string, wranglerBin: string, apiBase?: string, githubApiBase?: string,
 *  fakeOpenerDir: string, extraEnv?: Record<string, string> }} options the env seams to set
 * @returns {Promise<{ code: number, stdout: string, stderr: string }>} the run's outcome
 */
async function runCli(args, { stateDir, wranglerBin, apiBase, githubApiBase, fakeOpenerDir, extraEnv = {} }) {
  const env = {
    ...process.env,
    PATH: `${fakeOpenerDir}:${process.env.PATH ?? ''}`,
    CAIRN_STATE_DIR: stateDir,
    CAIRN_WRANGLER_BIN: wranglerBin,
    ...(apiBase ? { CAIRN_CLOUDFLARE_API_BASE: apiBase } : {}),
    ...(githubApiBase ? { CAIRN_GITHUB_API_BASE: githubApiBase } : {}),
    ...extraEnv,
  };
  if (!('CAIRN_CF_API_TOKEN' in extraEnv)) delete env.CAIRN_CF_API_TOKEN;
  try {
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
 * Seed a site record shaped like one chapter 1 (and, where the step implies it, chapter 2)
 * already finished: the GitHub and Cloudflare fields every closing print and every chapter-3 hop
 * reads. `cloudflare.apiToken` is left unset by default so every case below reaches chapter 3's
 * token hop with nothing saved, the deterministic stop this file's header describes. That is a
 * fixture choice, not a fact about the world: chapter 2 clears its own saved token only at its
 * TERMINAL steps, so a real record at `domain-live` or `email-onboarded` still carries one. The
 * case below that seeds `apiToken` covers exactly that, and chapter 3 keys its own "already
 * admitted" answer on `cloudflare.buildsTokenSavedAt`, which only chapter 3 ever writes.
 * @param {string} siteId
 * @param {string} dir
 * @param {string} step
 * @param {object} [overrides] merged over the default `cloudflare` shape
 * @returns {Promise<void>}
 */
async function seedSite(siteId, dir, step, overrides = {}) {
  await saveSite(siteId, {
    name: 'Chapter3 Resume Site',
    dir,
    step,
    ownerEmail: 'owner@example.com',
    github: {
      appId: 1,
      appSlug: 'cairn-chapter3-resume',
      repo: { owner: 'chapter3-resume-owner', repo: 'chapter3-resume-site', defaultBranch: 'main' },
      installationId: 1,
      clientId: 'fake-client-1',
      clientSecret: 'fake-secret',
    },
    cloudflare: {
      url: 'https://chapter3-resume-site.glw907.workers.dev',
      workerName: 'chapter3-resume-site',
      accountId: 'acct-1',
      ...overrides,
    },
  });
}

/**
 * Build a state-store id whose trailing dash-segment is exactly six characters, matching
 * state.mjs's own SITE_ID_SHAPE regex (`findSiteByDir` silently skips a record whose id does not
 * match it, which reads as "no saved record" and falls all the way through to the scaffolder,
 * the exact failure mode this helper exists to avoid).
 * @param {string} label a short, readable tag for the test; only its first six lowercased
 *  alphanumeric characters are used
 * @returns {string} a valid state-store id, e.g. `chapter3-builds`
 */
function makeSiteId(label) {
  const suffix = label
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .padEnd(6, '0')
    .slice(0, 6);
  return `chapter3-${suffix}`;
}

/** The scaffold hand-over line, whose absence proves a resumed run never re-scaffolded. */
const SCAFFOLD_MARKER = 'Your site is scaffolded at';
/** Chapter 3's own admission hop title. */
const CHAPTER3_ADMISSION_TITLE = 'Connect to Workers Builds';
/** Chapter 3's own token hop title (distinct from chapter 2's "Get a Cloudflare API token"). */
const CHAPTER3_TOKEN_TITLE = 'Get a fresh Cloudflare API token';
/** Chapter 2's own admission hop title, whose presence would prove a run fell into chapter 2. */
const CHAPTER2_ADMISSION_TITLE = 'Connect your own domain';

/**
 * Assert the shared negative markers proving a run reached chapter 3's token hop and stopped
 * there, never falling through to the scaffolder or into chapter 2's own admission.
 * @param {string} stdout
 */
function assertReachedChapter3TokenHop(stdout) {
  assert.ok(stdout.includes(CHAPTER3_TOKEN_TITLE), `expected chapter 3's own token hop, got: ${stdout}`);
  assert.equal(stdout.includes(SCAFFOLD_MARKER), false, `expected no scaffold output, got: ${stdout}`);
  assert.equal(
    stdout.includes(CHAPTER2_ADMISSION_TITLE),
    false,
    `expected chapter 2's own admission never to run, got: ${stdout}`,
  );
}

// === Step 1: falsifiable routing tests, through bin.mjs's own entry =============================
//
// FALSIFIABILITY: each of these four cases seeds a step that is a member of NEITHER
// GITHUB_RESUMABLE_STEPS, CLOUDFLARE_RESUMABLE_STEPS, CHAPTER2_RESUMABLE_STEPS, nor chapter 2's own
// TERMINAL_STEPS. Removing the CHAPTER3_RESUMABLE_STEPS (or CHAPTER3_TERMINAL_STEPS) branch this
// test proves would leave the step unrecognized by every other check in bin.mjs's dispatch chain,
// so it would fall through to the final `collectAnswers()` + `scaffold()` path instead: the
// SCAFFOLD_MARKER assertion below would then find the marker present rather than absent, and the
// chapter-3-specific assertion would find its own title or text missing. This was verified by hand
// during implementation: commenting out the CHAPTER3_RESUMABLE_STEPS branch in bin.mjs turned the
// first two tests below red (SCAFFOLD_MARKER present, CHAPTER3_TOKEN_TITLE absent), and commenting
// out the CHAPTER3_TERMINAL_STEPS branch turned the last two red the same way.

for (const step of ['builds-connected', 'config-reconciled']) {
  test(`bin.mjs resumes a plain re-run at ${step} into chapter 3, never falling through to the scaffolder`, async (t) => {
    const stateDir = await freshStateDir(t);
    const dir = await mkdtemp(path.join(tmpdir(), 'cairn-chapter3-resume-scaffold-'));
    t.after(() => rm(dir, { recursive: true, force: true }));

    const fake = await makeFakeBin(`chapter3-resume-${step}`);
    t.after(() => fake.close());
    const fakeOpenerDir = await makeFakeOpenerDir(t);

    const siteId = makeSiteId(`resm-${step}`);
    await seedSite(siteId, dir, step, {
      buildsConnectionUuid: 'connection-uuid-1',
      buildsTriggerUuid: 'trigger-uuid-1',
    });

    const result = await runCli(['--dir', dir, '--yes'], { stateDir, wranglerBin: fake.binPath, fakeOpenerDir });

    assert.equal(result.code, 1, `expected exit 1, got ${result.code}. stdout: ${result.stdout}`);
    assert.ok(
      result.stdout.includes(`Resuming Chapter3 Resume Site at ${step}.`),
      `expected the resume line, got: ${result.stdout}`,
    );
    assertReachedChapter3TokenHop(result.stdout);
    assert.ok(result.stderr.includes('Next:'), `expected the token hop's own Next: line, got: ${result.stderr}`);
    assert.deepEqual(
      await fake.invocations(),
      [],
      'a saved accountId means ensureAccountId enumerates nothing, so wrangler is never invoked',
    );

    const state = await loadSite(siteId);
    assert.equal(state.step, step, 'a thrown row must never advance the saved step');
  });
}

for (const [step, expectedNote] of [
  ['builds-live', 'Every commit to your default branch now builds and deploys itself'],
  ['builds-connect-declined', 'Workers Builds is not connected'],
]) {
  test(`bin.mjs at ${step} routes a plain re-run to the terminal branch, not the scaffolder`, async (t) => {
    const stateDir = await freshStateDir(t);
    const dir = await mkdtemp(path.join(tmpdir(), 'cairn-chapter3-resume-scaffold-'));
    t.after(() => rm(dir, { recursive: true, force: true }));

    const fake = await makeFakeBin(`chapter3-terminal-${step}`);
    t.after(() => fake.close());
    const fakeOpenerDir = await makeFakeOpenerDir(t);

    const siteId = makeSiteId(`term-${step}`);
    await seedSite(siteId, dir, step);

    const result = await runCli(['--dir', dir], { stateDir, wranglerBin: fake.binPath, fakeOpenerDir });

    assert.equal(result.code, 0, `expected exit 0, got ${result.code}. stderr: ${result.stderr}`);
    assert.ok(result.stdout.includes(expectedNote), `expected the terminal note, got: ${result.stdout}`);
    assert.ok(
      result.stdout.includes('Your site is live on GitHub:'),
      `expected the shared repo line, got: ${result.stdout}`,
    );
    assert.equal(result.stdout.includes(SCAFFOLD_MARKER), false, `expected no scaffold output, got: ${result.stdout}`);
    assert.equal(
      result.stdout.includes(CHAPTER3_ADMISSION_TITLE),
      false,
      `a plain re-run at a chapter-3 terminal step must never call runChapter3 again, got: ${result.stdout}`,
    );
    assert.deepEqual(await fake.invocations(), [], 'a plain re-run at a chapter-3 terminal step shells out to nothing');

    const state = await loadSite(siteId);
    assert.equal(state.step, step, 'a plain re-run must never change the saved step');
  });
}

// === Step 2: the entry matrix =====================================================================

// --- The fall-through: reaching a chapter-2 terminal step DURING this run continues into chapter 3

test('bin.mjs: a run that reaches paid-plan-declined during this call falls through into chapter 3', async (t) => {
  const stateDir = await freshStateDir(t);
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-chapter3-fallthrough-'));
  t.after(() => rm(dir, { recursive: true, force: true }));

  const fake = await makeFakeBin('chapter3-fallthrough-declined');
  t.after(() => fake.close());
  const fakeOpenerDir = await makeFakeOpenerDir(t);
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());

  const siteId = makeSiteId('fall-declined');
  // A saved token that still validates (the fake accepts any bearer) lets chapter 2's own account
  // and token hops pass silently, so this run reaches the email-admission hop and declines it
  // (--yes with no --email) without ever needing a real Cloudflare token or a DNS/HTTPS seam.
  await seedSite(siteId, dir, 'domain-live', {
    apiToken: 'fake-cf-token-for-chapter2',
    domain: 'fallthrough-declined-test.example',
  });

  const result = await runCli(['--dir', dir, '--yes'], {
    stateDir,
    wranglerBin: fake.binPath,
    apiBase: cloudflare.apiBase,
    fakeOpenerDir,
  });

  assert.equal(result.code, 1, `expected exit 1, got ${result.code}. stdout: ${result.stdout}`);
  assert.ok(
    result.stdout.includes("You chose not to turn on Cloudflare's Workers Paid plan"),
    `expected chapter 2's own decline row, got: ${result.stdout}`,
  );
  assertReachedChapter3TokenHop(result.stdout);
  assert.ok(result.stderr.includes('Next:'), `expected chapter 3's token-hop Next: line, got: ${result.stderr}`);

  const state = await loadSite(siteId);
  assert.equal(state.step, 'paid-plan-declined', 'chapter 2 wrote its own outcome before chapter 3 began');
  assert.equal('apiToken' in state.cloudflare, false, 'the decline deleted chapter 2\'s own saved token');
});

test('bin.mjs: a run that reaches email-live during this call falls through into chapter 3', async (t) => {
  const stateDir = await freshStateDir(t);
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-chapter3-fallthrough-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(path.join(dir, 'src/theme'), { recursive: true });
  const domain = 'fallthrough-live-test.example';
  // Matches defaultFromAddress(domain) exactly, so writeEmailFrom reports no change and chapter 2
  // never has to build or deploy the site to reach email-live: this file has no fake wrangler
  // build/deploy fixture, and the point of this test is chapter 3's own entry, not chapter 2's.
  await writeFile(
    path.join(dir, 'src/theme/cairn.config.ts'),
    `export default {\n  email: { from: 'no-reply@${domain}' },\n};\n`,
  );

  const fake = await makeFakeBin('chapter3-fallthrough-email-live');
  t.after(() => fake.close());
  const fakeOpenerDir = await makeFakeOpenerDir(t);
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());

  const siteId = makeSiteId('fall-emlive');
  await seedSite(siteId, dir, 'email-onboarded', {
    apiToken: 'fake-cf-token-for-chapter2',
    domain,
    emailOnboardedAt: new Date().toISOString(),
  });

  const result = await runCli(['--dir', dir, '--yes'], {
    stateDir,
    wranglerBin: fake.binPath,
    apiBase: cloudflare.apiBase,
    fakeOpenerDir,
  });

  assert.equal(result.code, 1, `expected exit 1, got ${result.code}. stdout: ${result.stdout}`);
  assert.ok(
    result.stdout.includes('Cloudflare accepted a real test message'),
    `expected chapter 2's own email-live completion line, got: ${result.stdout}`,
  );
  assertReachedChapter3TokenHop(result.stdout);
  assert.ok(result.stderr.includes('Next:'), `expected chapter 3's token-hop Next: line, got: ${result.stderr}`);

  const state = await loadSite(siteId);
  assert.equal(state.step, 'email-live', 'chapter 2 wrote its own outcome before chapter 3 began');
  assert.equal('apiToken' in state.cloudflare, false, 'email-live deleted chapter 2\'s own saved token');
});

// --- --connect enters chapter 3 from every allowlisted step, ahead of every other branch --------

for (const [label, step, overrides] of [
  ['live', 'live', {}],
  ['domain-live', 'domain-live', { domain: 'connect-domain-live-test.example' }],
  ['email-live', 'email-live', { domain: 'connect-email-live-test.example', emailFrom: 'no-reply@connect-email-live-test.example' }],
]) {
  test(`bin.mjs --connect enters chapter 3 from ${label}, ahead of its own normal branch`, async (t) => {
    const stateDir = await freshStateDir(t);
    const dir = await mkdtemp(path.join(tmpdir(), 'cairn-chapter3-connect-scaffold-'));
    t.after(() => rm(dir, { recursive: true, force: true }));

    const fake = await makeFakeBin(`chapter3-connect-${step}`);
    t.after(() => fake.close());
    const fakeOpenerDir = await makeFakeOpenerDir(t);

    const siteId = makeSiteId(`cnct-${label}`);
    await seedSite(siteId, dir, step, overrides);

    const result = await runCli(['--dir', dir, '--connect', '--yes'], {
      stateDir,
      wranglerBin: fake.binPath,
      fakeOpenerDir,
    });

    assert.equal(result.code, 1, `expected exit 1, got ${result.code}. stdout: ${result.stdout}`);
    assert.ok(
      result.stdout.includes(`Connecting Chapter3 Resume Site to Workers Builds.`),
      `expected the --connect entry line, got: ${result.stdout}`,
    );
    assert.ok(result.stdout.includes(CHAPTER3_ADMISSION_TITLE), `expected chapter 3's own admission hop, got: ${result.stdout}`);
    assertReachedChapter3TokenHop(result.stdout);
    assert.equal(
      result.stdout.includes('is already live.'),
      false,
      `--connect must bypass the plain-live branch's own print, got: ${result.stdout}`,
    );

    const state = await loadSite(siteId);
    assert.equal(state.step, step, 'a thrown row must never advance the saved step');
  });
}

test('bin.mjs --connect at domain-live still admits chapter 3 when chapter 2\'s own token is saved', async (t) => {
  const stateDir = await freshStateDir(t);
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-chapter3-connect-scaffold-'));
  t.after(() => rm(dir, { recursive: true, force: true }));

  const fake = await makeFakeBin('chapter3-connect-ch2-token');
  t.after(() => fake.close());
  const fakeOpenerDir = await makeFakeOpenerDir(t);
  // Both fakes are pointed at, so a regression that adopted chapter 2's token would validate it and
  // walk on into the Builds calls here rather than reaching for the real Cloudflare or GitHub.
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());
  const github = await startFakeGithub();
  t.after(() => github.close());

  const siteId = makeSiteId('cnct-ch2tok');
  await seedSite(siteId, dir, 'domain-live', {
    domain: 'connect-carried-token-test.example',
    apiToken: 'chapter2-five-key-token',
  });

  const result = await runCli(['--dir', dir, '--connect', '--yes'], {
    stateDir,
    wranglerBin: fake.binPath,
    apiBase: cloudflare.apiBase,
    githubApiBase: github.apiBase,
    fakeOpenerDir,
  });

  assert.equal(result.code, 1, `expected exit 1, got ${result.code}. stdout: ${result.stdout}`);
  assert.ok(
    result.stdout.includes(CHAPTER3_ADMISSION_TITLE),
    `a saved chapter-2 token must never skip chapter 3's admission, got: ${result.stdout}`,
  );
  assertReachedChapter3TokenHop(result.stdout);
  assert.ok(
    result.stderr.includes('CAIRN_CF_API_TOKEN'),
    `chapter 2's token must not be adopted; the token hop must ask for one, got: ${result.stderr}`,
  );

  const state = await loadSite(siteId);
  assert.equal(state.step, 'domain-live', 'a thrown row must never advance the saved step');
});

test('bin.mjs at builds-connect-declined routes a plain re-run to the terminal branch, never calling runChapter3', async (t) => {
  // The regression guard for the behavior a fix to the module's own short-circuit must preserve:
  // a plain re-run (no --connect) at a recorded decline reports the decline unchanged and never
  // reaches admission. This mirrors the loop test above (`'builds-connect-declined'` is one of its
  // cases) at the same dispatcher layer, named and kept standalone here so the decline-then-plain-
  // re-entry and decline-then-reconnect cases read as the deliberate pair this task adds.
  const stateDir = await freshStateDir(t);
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-chapter3-connect-scaffold-'));
  t.after(() => rm(dir, { recursive: true, force: true }));

  const fake = await makeFakeBin('chapter3-declined-plain-rerun');
  t.after(() => fake.close());
  const fakeOpenerDir = await makeFakeOpenerDir(t);

  const siteId = makeSiteId('decl-plain');
  await seedSite(siteId, dir, 'builds-connect-declined');

  const result = await runCli(['--dir', dir], { stateDir, wranglerBin: fake.binPath, fakeOpenerDir });

  assert.equal(result.code, 0, `expected exit 0, got ${result.code}. stderr: ${result.stderr}`);
  assert.ok(
    result.stdout.includes('Workers Builds is not connected'),
    `expected the terminal note naming the still-declined state, got: ${result.stdout}`,
  );
  assert.equal(
    result.stdout.includes(CHAPTER3_ADMISSION_TITLE),
    false,
    `a plain re-run at a recorded decline must never reach admission, got: ${result.stdout}`,
  );
  assert.deepEqual(await fake.invocations(), [], 'a plain re-run at a declined record shells out to nothing');

  const state = await loadSite(siteId);
  assert.equal(state.step, 'builds-connect-declined', 'a plain re-run must never change the saved step');
});

test('bin.mjs --connect at builds-connect-declined proceeds into admission, not the stale decline report', async (t) => {
  const stateDir = await freshStateDir(t);
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-chapter3-connect-scaffold-'));
  t.after(() => rm(dir, { recursive: true, force: true }));

  const fake = await makeFakeBin('chapter3-connect-declined');
  t.after(() => fake.close());
  const fakeOpenerDir = await makeFakeOpenerDir(t);

  const siteId = makeSiteId('cnct-decl');
  await seedSite(siteId, dir, 'builds-connect-declined');

  const result = await runCli(['--dir', dir, '--connect', '--yes'], { stateDir, wranglerBin: fake.binPath, fakeOpenerDir });

  // The bug this guards: chapter3.mjs's own top-of-function short-circuit used to fire
  // unconditionally at this step, so `--connect` here just re-reported the stale decline and
  // deleted the token again, with no way back in despite the catalogue row's own promise ("re-run
  // npx create-cairn-site --dir <dir> --connect"). The fix gates that short-circuit on the absence
  // of `--connect`, so an explicit `--connect` now proceeds into the same admission every other
  // entry step goes through, and reaches this suite's own deterministic token-hop stop.
  assert.equal(
    result.code,
    1,
    `expected exit 1 (the deterministic token-hop stop), got ${result.code}. stdout: ${result.stdout}`,
  );
  assert.ok(
    result.stdout.includes('Connecting Chapter3 Resume Site to Workers Builds.'),
    `expected the --connect entry line, got: ${result.stdout}`,
  );
  assert.ok(
    result.stdout.includes(CHAPTER3_ADMISSION_TITLE),
    `--connect must reach chapter 3's own admission, got: ${result.stdout}`,
  );
  assertReachedChapter3TokenHop(result.stdout);
  assert.ok(result.stderr.includes('Next:'), `expected the token hop's own Next: line, got: ${result.stderr}`);
  assert.equal(
    result.stdout.includes('Workers Builds is not connected'),
    false,
    'the stale decline note must never print again once --connect has proceeded past it',
  );
  assert.deepEqual(
    await fake.invocations(),
    [],
    '--connect at a declined record with a saved accountId shells out to nothing',
  );

  const state = await loadSite(siteId);
  assert.equal(state.step, 'builds-connect-declined', 'a thrown row must never advance the saved step');
});

// --- --connect refuses ahead of `live`, naming what has to finish first --------------------------

for (const [label, step] of [
  ['scaffolded', 'scaffolded'],
  ['deployed', 'deployed'],
]) {
  test(`bin.mjs --connect refuses at ${label}, naming what must finish first`, async (t) => {
    const stateDir = await freshStateDir(t);
    const dir = await mkdtemp(path.join(tmpdir(), 'cairn-chapter3-connect-refuse-'));
    t.after(() => rm(dir, { recursive: true, force: true }));

    const fake = await makeFakeBin(`chapter3-connect-refuse-${step}`);
    t.after(() => fake.close());
    const fakeOpenerDir = await makeFakeOpenerDir(t);

    const siteId = makeSiteId(`refuse-${label}`);
    await saveSite(siteId, { name: 'Chapter3 Refuse Site', dir, step });

    const result = await runCli(['--dir', dir, '--connect'], { stateDir, wranglerBin: fake.binPath, fakeOpenerDir });

    assert.equal(result.code, 1, `expected exit 1, got ${result.code}. stdout: ${result.stdout}`);
    assert.ok(
      result.stderr.includes('has not finished its first deploy yet'),
      `expected the refusal naming the unfinished deploy, got: ${result.stderr}`,
    );
    assert.ok(result.stderr.includes(step), `expected the refusal to name the current step, got: ${result.stderr}`);
    assert.ok(result.stderr.includes('Next:'), `expected a Next: line, got: ${result.stderr}`);
    assert.deepEqual(await fake.invocations(), [], '--connect refusing must shell out to nothing');

    const state = await loadSite(siteId);
    assert.equal(state.step, step, 'a refused --connect must never change the saved step');
  });
}

// --- --connect at builds-live runs the re-reconcile path, not a no-op ----------------------------

test('bin.mjs --connect at builds-live runs the re-reconcile hop rather than a no-op', async (t) => {
  const stateDir = await freshStateDir(t);
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-chapter3-reconcile-'));
  t.after(() => rm(dir, { recursive: true, force: true }));

  const fake = await makeFakeBin('chapter3-connect-builds-live');
  t.after(() => fake.close());
  const fakeOpenerDir = await makeFakeOpenerDir(t);
  const github = await startFakeGithub();
  t.after(() => github.close());

  const siteId = makeSiteId('recon-live');
  // The record carries no `buildsReconciledHash`, and this scaffold directory holds neither
  // tool-owned file, so the reconcile's hash gate cannot say "nothing drifted" and the hop owes a
  // sign-in trip, which `--yes` parks on rather than opening a browser. That park is the proof this
  // is the real reconcile hop running, not a no-op: a no-op would never reach it, and this run's
  // own token hop is never touched (the token hop for builds-live only runs after a real commit,
  // which this test never lets happen).
  await seedSite(siteId, dir, 'builds-live', {
    buildsConnectionUuid: 'connection-uuid-1',
    buildsTriggerUuid: 'trigger-uuid-1',
    buildsLastBuildUuid: 'build-uuid-1',
    buildsLastBuildOutcome: 'success',
  });

  const result = await runCli(['--dir', dir, '--connect', '--yes'], {
    stateDir,
    wranglerBin: fake.binPath,
    githubApiBase: github.apiBase,
    fakeOpenerDir,
  });

  assert.equal(result.code, 0, `expected exit 0, got ${result.code}. stderr: ${result.stderr}`);
  assert.ok(
    result.stdout.includes('Reconcile your deploy config'),
    `expected the reconcile hop to have actually run, got: ${result.stdout}`,
  );
  assert.ok(
    result.stdout.includes('the reconcile found a real difference'),
    `expected the reconcile-parked row, proving a real diff check ran, got: ${result.stdout}`,
  );
  assert.equal(
    result.stdout.includes(CHAPTER3_TOKEN_TITLE),
    false,
    'a parked reconcile must never reach the token hop a second time in this run',
  );
  assert.deepEqual(await fake.invocations(), [], '--connect at builds-live must shell out to nothing here');

  const state = await loadSite(siteId);
  assert.equal(state.step, 'builds-live', 'a parked reconcile must never advance the saved step');
});

// === Step 3: preservation =========================================================================

// --- --sign-in works at every chapter-3 state, since the site is live throughout ------------------

for (const step of ['builds-connected', 'config-reconciled', 'builds-live', 'builds-connect-declined']) {
  test(`bin.mjs --sign-in works at ${step}, without touching chapter 3 at all`, async (t) => {
    const stateDir = await freshStateDir(t);
    const dir = await mkdtemp(path.join(tmpdir(), 'cairn-chapter3-signin-'));
    t.after(() => rm(dir, { recursive: true, force: true }));

    const fake = await makeFakeBin(`chapter3-signin-${step}`);
    t.after(() => fake.close());
    await fake.respond('d1 execute', {
      code: 0,
      stdout: JSON.stringify([
        { results: [], success: true, meta: { changes: 1 } },
        { results: [], success: true, meta: { changes: 0 } },
        { results: [], success: true, meta: { changes: 1 } },
      ]),
    });
    const fakeOpenerDir = await makeFakeOpenerDir(t);

    const siteId = makeSiteId(`sign-${step}`);
    await seedSite(siteId, dir, step);

    const result = await runCli(['--dir', dir, '--sign-in'], { stateDir, wranglerBin: fake.binPath, fakeOpenerDir });

    assert.equal(result.code, 0, `expected exit 0, got ${result.code}. stderr: ${result.stderr}`);
    assert.ok(result.stdout.includes('--sign-in'), `expected the re-run hint naming --sign-in, got: ${result.stdout}`);
    assert.equal(
      result.stdout.includes(CHAPTER3_ADMISSION_TITLE),
      false,
      `--sign-in must never call runChapter3, got: ${result.stdout}`,
    );

    const invocations = await fake.invocations();
    assert.equal(
      invocations.filter((i) => i.argv.slice(0, 2).join(' ') === 'd1 execute').length,
      1,
      'expected exactly one seed invocation',
    );
    assert.equal(invocations.length, 1, '--sign-in must touch wrangler only for the reseed');

    const state = await loadSite(siteId);
    assert.equal(state.step, step, '--sign-in must never change the saved step');
  });
}

// --- The declined-email re-offer keys on the record's fields, not the step ------------------------
//
// A record whose email admission was declined before it ever reached chapter 3 keeps
// `emailDeclinedAt` set (chapter 2's own reoffered flag reads that field, never the step, per
// paid-plan-declined's own admission logic in chapter2.mjs). This proves bin.mjs's chapter-3
// routing carries that field through unchanged, rather than the state store's flat-merge losing
// it: a record already at `builds-connected` still has it on disk after a plain re-run, so it
// would still drive the reoffered copy on any later path that DOES re-enter chapter 2's own
// admission (this codebase has none today, but the field surviving is what makes that possible).

test('bin.mjs: a record advanced to builds-connected still carries its earlier emailDeclinedAt', async (t) => {
  const stateDir = await freshStateDir(t);
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-chapter3-reoffer-'));
  t.after(() => rm(dir, { recursive: true, force: true }));

  const fake = await makeFakeBin('chapter3-reoffer-builds-connected');
  t.after(() => fake.close());
  const fakeOpenerDir = await makeFakeOpenerDir(t);

  const siteId = makeSiteId('reoffer');
  const emailDeclinedAt = new Date().toISOString();
  await seedSite(siteId, dir, 'builds-connected', {
    buildsConnectionUuid: 'connection-uuid-1',
    buildsTriggerUuid: 'trigger-uuid-1',
    emailDeclinedAt,
  });

  const result = await runCli(['--dir', dir, '--yes'], { stateDir, wranglerBin: fake.binPath, fakeOpenerDir });

  assert.equal(result.code, 1, `expected exit 1, got ${result.code}. stdout: ${result.stdout}`);
  const state = await loadSite(siteId);
  assert.equal(
    state.cloudflare.emailDeclinedAt,
    emailDeclinedAt,
    'the chapter-3 routing must never drop a sibling cloudflare field it does not itself own',
  );
  assert.equal('emailOnboardedAt' in state.cloudflare, false);
});

// --- --start-over refuses from any chapter-3 state, naming the connection, trigger, and live site -

for (const step of ['builds-connected', 'builds-live']) {
  test(`bin.mjs --start-over at ${step} refuses, naming the connection, trigger, and live site`, async (t) => {
    const stateDir = await freshStateDir(t);
    const dir = await mkdtemp(path.join(tmpdir(), 'cairn-chapter3-startover-'));
    t.after(() => rm(dir, { recursive: true, force: true }));

    const fake = await makeFakeBin(`chapter3-startover-${step}`);
    t.after(() => fake.close());
    const fakeOpenerDir = await makeFakeOpenerDir(t);

    const siteId = makeSiteId(`sover-${step}`);
    await seedSite(siteId, dir, step, {
      buildsConnectionUuid: 'connection-uuid-1',
      buildsTriggerUuid: 'trigger-uuid-1',
    });
    const before = await loadSite(siteId);

    const result = await runCli(['--dir', dir, '--start-over'], { stateDir, wranglerBin: fake.binPath, fakeOpenerDir });

    assert.equal(result.code, 1, `expected exit 1, got ${result.code}. stdout: ${result.stdout}`);
    assert.ok(
      result.stderr.includes('connection') && result.stderr.includes('trigger') && result.stderr.includes('live'),
      `expected the refusal to name the connection, trigger, and live site, got: ${result.stderr}`,
    );
    assert.ok(result.stderr.includes('Next:'), `expected a Next: line, got: ${result.stderr}`);
    assert.deepEqual(await fake.invocations(), [], '--start-over must never shell out to wrangler');

    const after = await loadSite(siteId);
    assert.deepEqual(after, before, 'the state record must be present and unchanged on disk');
  });
}

// === Step 4: --dry-run =============================================================================

test('bin.mjs --dry-run prints every chapter-3 hop title too, from record: null', async (t) => {
  const stateDir = await freshStateDir(t);
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-chapter3-dry-run-'));
  t.after(() => rm(dir, { recursive: true, force: true }));

  const fake = await makeFakeBin('chapter3-dry-run-plain');
  t.after(() => fake.close());
  const fakeOpenerDir = await makeFakeOpenerDir(t);

  const result = await runCli(
    ['--dry-run', '--yes', '--dir', path.join(dir, 'site'), '--name', 'Chapter3 Dry Run Site'],
    { stateDir, wranglerBin: fake.binPath, fakeOpenerDir },
  );

  assert.equal(result.code, 0, `expected exit 0, got ${result.code}. stderr: ${result.stderr}`);
  for (const title of [CHAPTER3_ADMISSION_TITLE, 'Find your Cloudflare account', CHAPTER3_TOKEN_TITLE, 'Reconcile your deploy config', 'Watch your first Workers Builds deploy']) {
    assert.ok(result.stdout.includes(title), `expected the chapter-3 dry-run title "${title}", got: ${result.stdout}`);
  }
  assert.deepEqual(await fake.invocations(), [], 'a dry run must shell out to nothing');
});

test('bin.mjs --connect --dry-run prints the whole chapter without a record, same as plain --dry-run', async (t) => {
  const stateDir = await freshStateDir(t);
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-chapter3-dry-run-connect-'));
  t.after(() => rm(dir, { recursive: true, force: true }));

  const fake = await makeFakeBin('chapter3-dry-run-connect');
  t.after(() => fake.close());
  const fakeOpenerDir = await makeFakeOpenerDir(t);

  // Resume detection is skipped entirely under --dry-run (bin.mjs never looks up a saved record),
  // so --connect has no priorRecord to act on here and this takes the exact same fresh-scaffold
  // dry-run path the plain --dry-run test above does; --connect must not fight that.
  const result = await runCli(
    ['--connect', '--dry-run', '--yes', '--dir', path.join(dir, 'site'), '--name', 'Chapter3 Connect Dry Run'],
    { stateDir, wranglerBin: fake.binPath, fakeOpenerDir },
  );

  assert.equal(result.code, 0, `expected exit 0, got ${result.code}. stderr: ${result.stderr}`);
  for (const title of [CHAPTER3_ADMISSION_TITLE, CHAPTER3_TOKEN_TITLE]) {
    assert.ok(result.stdout.includes(title), `expected the chapter-3 dry-run title "${title}", got: ${result.stdout}`);
  }
  assert.equal(
    result.stdout.includes('has not finished its first deploy yet'),
    false,
    '--connect --dry-run must never take the refusal path (there is no priorRecord under dry-run)',
  );
  assert.deepEqual(await fake.invocations(), [], 'a dry run must shell out to nothing');
});
