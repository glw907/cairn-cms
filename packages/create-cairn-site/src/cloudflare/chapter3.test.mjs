import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  startFakeCloudflare,
  APP_NOT_AUTHORIZED_REFUSED_BODY,
  REPO_NOT_SELECTED_REFUSED_BODY,
} from '../../test/fake-cloudflare.mjs';
import { startFakeGithub, pointAtFake } from '../../test/fake-github.mjs';
import { createRepo } from '../github/repo.mjs';
import { saveSite, loadSite } from '../state.mjs';
import { runChapter3, CHAPTER3_TERMINAL_STEPS, CHAPTER3_RESUMABLE_STEPS } from './chapter3.mjs';

const WORKER_NAME = 'cairn-builds-site';
const WORKER_TAG = 'tag-abc123';

/** Point CAIRN_STATE_DIR at a fresh temporary directory for the duration of one test. */
async function freshStateDir(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-chapter3-state-'));
  process.env.CAIRN_STATE_DIR = dir;
  t.after(() => {
    delete process.env.CAIRN_STATE_DIR;
    return rm(dir, { recursive: true, force: true });
  });
  return dir;
}

/** Build a fixture scaffold directory carrying a real wrangler.jsonc, the trigger hop's own read. */
async function fixtureScaffoldDir(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-chapter3-scaffold-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await writeFile(path.join(dir, 'wrangler.jsonc'), JSON.stringify({ name: WORKER_NAME }, null, 2));
  return dir;
}

/** Start a fake Cloudflare, seeded with the deployed Worker's script/tag, and point the env at it. */
async function setupCloudflare(t) {
  const cloudflare = await startFakeCloudflare();
  cloudflare.state.workerScripts.push({ id: WORKER_NAME, tag: WORKER_TAG });
  t.after(() => cloudflare.close());
  process.env.CAIRN_CLOUDFLARE_API_BASE = cloudflare.apiBase;
  t.after(() => {
    delete process.env.CAIRN_CLOUDFLARE_API_BASE;
  });
  return cloudflare;
}

/** Start a fake GitHub and point CAIRN_GITHUB_API_BASE/CAIRN_GITHUB_WEB_BASE at it. */
async function setupGithub(t) {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);
  return github;
}

/**
 * Seed an installation and create a repository through the fake, the same shape chapter 1's own
 * GitHub chapter leaves on the state record: `{ id, owner, repo, defaultBranch }`.
 * @param {import('../../test/fake-github.mjs').FakeGithub} github
 * @param {string} [name]
 * @returns {Promise<{ id: number, owner: string, repo: string, defaultBranch: string }>}
 */
async function seedGithubRepo(github, name = 'alpine-club') {
  github.state.installations.push({ id: 1, app_id: 1, account: { login: 'fake-admin' }, repositories: [] });
  return createRepo('fake-user-token', { name, ownerType: 'user', dir: '/tmp' });
}

/**
 * Seed a state record shaped like a site that just finished chapter 2 (its own terminal already
 * cleared `cloudflare.apiToken`), the point every chapter-3 test starts from unless it overrides.
 */
async function seedSite(siteId, dir, repo, overrides = {}) {
  await saveSite(siteId, {
    name: 'Builds Test Site',
    dir,
    step: 'email-live',
    ownerEmail: 'owner@example.com',
    github: { repo },
    cloudflare: { accountId: 'acct-1', url: `https://${WORKER_NAME}.example.workers.dev`, workerName: WORKER_NAME },
    ...overrides,
  });
}

function confirmAnswering(answer) {
  return async () => answer;
}

function mustNotBeCalled(label) {
  return async () => {
    throw new Error(`${label} must not be called on this path`);
  };
}

function neverOpensBrowser() {
  return Promise.resolve();
}

test('runChapter3: an interactive consent connects the repository and creates the trigger, recording builds-connected', async (t) => {
  const stateDir = await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t);
  const github = await setupGithub(t);
  const repo = await seedGithubRepo(github);
  const siteId = 'builds-test-site-abc123';
  await seedSite(siteId, dir, repo);
  void stateDir;

  const logs = [];
  const result = await runChapter3({
    siteId,
    record: await loadSite(siteId),
    dir,
    args: { yes: false },
    log: (line) => logs.push(line),
    dryRun: false,
    openBrowser: neverOpensBrowser,
    confirm: confirmAnswering(true),
    promptSecretFn: async () => 'fresh-cf-token',
  });

  assert.equal(result.outcome, 'builds-connected');

  const saved = await loadSite(siteId);
  assert.equal(saved.step, 'builds-connected');
  assert.equal(saved.cloudflare.apiToken, 'fresh-cf-token');
  assert.ok(saved.cloudflare.buildsConnectionUuid);
  assert.ok(saved.cloudflare.buildsTriggerUuid);

  const putRequest = cloudflare.requests.find(
    (r) => r.method === 'PUT' && r.path.includes('/builds/repos/connections'),
  );
  assert.ok(putRequest, 'expected a connections PUT');
  const ownerId = String(github.state.ownerIds.get('fake-admin'));
  assert.equal(putRequest.body.provider_account_id, ownerId);
  assert.equal(putRequest.body.repo_id, String(repo.id));
  assert.equal(putRequest.body.repo_name, repo.repo);

  const triggerRequest = cloudflare.requests.find(
    (r) => r.method === 'POST' && r.path.includes('/builds/triggers') && !r.path.includes('/builds/triggers/'),
  );
  assert.ok(triggerRequest, 'expected a trigger create');
  assert.deepEqual(triggerRequest.body.branch_includes, [repo.defaultBranch]);
  assert.equal(triggerRequest.body.build_command, 'npm run build');
  assert.equal(triggerRequest.body.deploy_command, 'npx wrangler deploy');

  assert.equal(cloudflare.state.buildTokens.length, 1);
  assert.equal(cloudflare.state.buildTokens[0].cloudflare_token_id, 'd07b2a25f05151591830c45053186979');
});

test('runChapter3: declining records builds-connect-declined, deletes any token, and leaves the site untouched', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t);
  const github = await setupGithub(t);
  const repo = await seedGithubRepo(github);
  const siteId = 'builds-decline-site-abc123';
  await seedSite(siteId, dir, repo);
  const cloudflareRequestsBefore = cloudflare.requests.length;
  const githubRequestsBefore = github.requests.length;

  const result = await runChapter3({
    siteId,
    record: await loadSite(siteId),
    dir,
    args: { yes: false },
    log: () => {},
    dryRun: false,
    openBrowser: neverOpensBrowser,
    confirm: confirmAnswering(false),
    promptSecretFn: mustNotBeCalled('promptSecretFn'),
  });

  assert.equal(result.outcome, 'builds-connect-declined');
  assert.match(result.message ?? '', /--connect/);

  const saved = await loadSite(siteId);
  assert.equal(saved.step, 'builds-connect-declined');
  assert.equal('apiToken' in saved.cloudflare, false);
  assert.equal('buildsConnectionUuid' in saved.cloudflare, false);
  assert.equal('buildsTriggerUuid' in saved.cloudflare, false);

  // Setting up the fixture repo itself makes a GitHub request (the repo create); what matters is
  // that DECLINING makes no request of its own, on either fake, past that setup.
  assert.equal(cloudflare.requests.length, cloudflareRequestsBefore);
  assert.equal(github.requests.length, githubRequestsBefore);
});

test('runChapter3: the admission copy states the App authorization, the token paste, the sign-in click, and the free-tier figures with their date, under --dry-run with zero network', async (t) => {
  await freshStateDir(t);
  const cloudflare = await setupCloudflare(t);
  const github = await setupGithub(t);

  const logs = [];
  const result = await runChapter3({
    siteId: 'builds-dryrun-site-abc123',
    record: null,
    dir: '/does-not-exist-under-dry-run',
    args: { yes: false },
    log: (line) => logs.push(line),
    dryRun: true,
    openBrowser: neverOpensBrowser,
    confirm: mustNotBeCalled('confirm'),
    promptSecretFn: mustNotBeCalled('promptSecretFn'),
  });

  assert.equal(result.outcome, 'dry-run');
  const printed = logs.join('\n');
  assert.match(printed, /GitHub App/);
  assert.match(printed, /API token/);
  assert.match(printed, /sign-in/);
  assert.match(printed, /3,000 build minutes/);
  assert.match(printed, /2026-08-12/);

  assert.equal(cloudflare.requests.length, 0);
  assert.equal(github.requests.length, 0);
});

test('runChapter3: --yes consents silently, never prompting, and reads CAIRN_CF_API_TOKEN', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  await setupCloudflare(t);
  const github = await setupGithub(t);
  const repo = await seedGithubRepo(github);
  const siteId = 'builds-yes-site-abc123';
  await seedSite(siteId, dir, repo);

  const result = await runChapter3({
    siteId,
    record: await loadSite(siteId),
    dir,
    args: { yes: true },
    log: () => {},
    dryRun: false,
    openBrowser: mustNotBeCalled('openBrowser'),
    confirm: mustNotBeCalled('confirm'),
    promptSecretFn: mustNotBeCalled('promptSecretFn'),
    env: { CAIRN_CF_API_TOKEN: 'env-token-value' },
  });

  assert.equal(result.outcome, 'builds-connected');
  const saved = await loadSite(siteId);
  assert.equal(saved.cloudflare.apiToken, 'env-token-value');
});

test('runChapter3: an authorization refusal parks on its own row, and a re-run after the fake flips to authorized proceeds', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t);
  const github = await setupGithub(t);
  const repo = await seedGithubRepo(github);
  const siteId = 'builds-park-site-abc123';
  await seedSite(siteId, dir, repo);

  cloudflare.failNext('builds_connection_put', 404, REPO_NOT_SELECTED_REFUSED_BODY);

  const firstLogs = [];
  const first = await runChapter3({
    siteId,
    record: await loadSite(siteId),
    dir,
    args: { yes: false },
    log: (line) => firstLogs.push(line),
    dryRun: false,
    openBrowser: neverOpensBrowser,
    confirm: confirmAnswering(true),
    promptSecretFn: async () => 'fresh-cf-token',
  });

  assert.equal(first.outcome, 'builds-repo-not-selected');
  assert.match(first.message ?? '', /github\.com\/settings\/installations/);
  assert.doesNotMatch(firstLogs.join('\n'), /no longer exists/);

  const afterPark = await loadSite(siteId);
  assert.equal(afterPark.step, 'email-live');
  assert.equal(afterPark.cloudflare.apiToken, 'fresh-cf-token');

  const second = await runChapter3({
    siteId,
    record: afterPark,
    dir,
    args: { yes: false },
    log: () => {},
    dryRun: false,
    openBrowser: mustNotBeCalled('openBrowser'),
    confirm: mustNotBeCalled('confirm'),
    promptSecretFn: mustNotBeCalled('promptSecretFn'),
  });

  assert.equal(second.outcome, 'builds-connected');
  const saved = await loadSite(siteId);
  assert.equal(saved.step, 'builds-connected');
  assert.ok(saved.cloudflare.buildsConnectionUuid);
});

test('runChapter3: the App-not-authorized refusal maps to its own row without quoting the platform wording', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t);
  const github = await setupGithub(t);
  const repo = await seedGithubRepo(github);
  const siteId = 'builds-not-authorized-site-abc123';
  await seedSite(siteId, dir, repo);

  cloudflare.failNext('builds_connection_put', 404, APP_NOT_AUTHORIZED_REFUSED_BODY);

  const result = await runChapter3({
    siteId,
    record: await loadSite(siteId),
    dir,
    args: { yes: false },
    log: () => {},
    dryRun: false,
    openBrowser: neverOpensBrowser,
    confirm: confirmAnswering(true),
    promptSecretFn: async () => 'fresh-cf-token',
  });

  assert.equal(result.outcome, 'builds-app-not-authorized');
  assert.doesNotMatch(result.message ?? '', /disconnected from your Git account/);
});

test('runChapter3: connect and trigger are idempotent across two runs, and a two-hop partial write preserves sibling cloudflare fields', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t);
  const github = await setupGithub(t);
  const repo = await seedGithubRepo(github);
  const siteId = 'builds-idempotent-site-abc123';
  await seedSite(siteId, dir, repo);

  const first = await runChapter3({
    siteId,
    record: await loadSite(siteId),
    dir,
    args: { yes: false },
    log: () => {},
    dryRun: false,
    openBrowser: neverOpensBrowser,
    confirm: confirmAnswering(true),
    promptSecretFn: async () => 'fresh-cf-token',
  });
  assert.equal(first.outcome, 'builds-connected');

  const afterFirst = await loadSite(siteId);
  const connectionUuid1 = afterFirst.cloudflare.buildsConnectionUuid;
  const triggerUuid1 = afterFirst.cloudflare.buildsTriggerUuid;
  assert.ok(connectionUuid1);
  assert.ok(triggerUuid1);

  // Regress `step` only, simulating a later `--connect` re-entry that must re-run connect and
  // trigger: everything else this run wrote (the token, the account id, the two Builds uuids)
  // stays in place, so the second run's own writes are the only thing under test here.
  await saveSite(siteId, { ...afterFirst, step: 'email-live' });

  const second = await runChapter3({
    siteId,
    record: await loadSite(siteId),
    dir,
    args: { yes: false },
    log: () => {},
    dryRun: false,
    openBrowser: mustNotBeCalled('openBrowser'),
    confirm: mustNotBeCalled('confirm'),
    promptSecretFn: mustNotBeCalled('promptSecretFn'),
  });
  assert.equal(second.outcome, 'builds-connected');

  const afterSecond = await loadSite(siteId);
  assert.equal(afterSecond.cloudflare.buildsConnectionUuid, connectionUuid1, 'the uuid is stable across two PUTs');
  assert.equal(afterSecond.cloudflare.buildsTriggerUuid, triggerUuid1, 'the existing trigger is adopted, not recreated');
  assert.equal(afterSecond.cloudflare.accountId, afterFirst.cloudflare.accountId);
  assert.equal(afterSecond.cloudflare.url, afterFirst.cloudflare.url);
  assert.equal(afterSecond.cloudflare.apiToken, afterFirst.cloudflare.apiToken);

  const triggerCreates = cloudflare.requests.filter(
    (r) => r.method === 'POST' && r.path.includes('/builds/triggers') && !r.path.includes('/builds/triggers/'),
  );
  assert.equal(triggerCreates.length, 1, 'only the first run creates a trigger; the second adopts it');
});

test('CHAPTER3_TERMINAL_STEPS and CHAPTER3_RESUMABLE_STEPS carry the exported step names', () => {
  assert.deepEqual(CHAPTER3_TERMINAL_STEPS, ['builds-live', 'builds-connect-declined']);
  assert.deepEqual(CHAPTER3_RESUMABLE_STEPS, ['builds-connected', 'config-reconciled']);
});
