import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  startFakeCloudflare,
  APP_NOT_AUTHORIZED_REFUSED_BODY,
  REPO_NOT_SELECTED_REFUSED_BODY,
} from '../../test/fake-cloudflare.mjs';
import { startFakeGithub, pointAtFake } from '../../test/fake-github.mjs';
import { createRepo, pushScaffold } from '../github/repo.mjs';
import { saveSite, loadSite } from '../state.mjs';
import { createWaitForClear, BUILD_HOLD_CLASS } from '../hold-loop.mjs';
import { makeApi } from './api.mjs';
import {
  runChapter3,
  watchAndComplete,
  reconciledConfigHash,
  CHAPTER3_TERMINAL_STEPS,
  CHAPTER3_RESUMABLE_STEPS,
} from './chapter3.mjs';

const WORKER_NAME = 'cairn-builds-site';
const WORKER_TAG = 'tag-abc123';

/** The local scaffold's own copies of the two tool-owned files, matched by default against what
 * seedGithubRepo pushes, so the reconcile diff starts empty unless a test deliberately drifts it. */
const WRANGLER_CONTENT = `${JSON.stringify({ name: WORKER_NAME }, null, 2)}\n`;
const CAIRN_CONFIG_CONTENT = "export const from = 'cms@example.test';\n";

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

/**
 * Build a fixture scaffold directory carrying both tool-owned files: wrangler.jsonc (the trigger
 * hop's own read, and one reconcile target) and src/theme/cairn.config.ts (the other reconcile
 * target). Content defaults to WRANGLER_CONTENT/CAIRN_CONFIG_CONTENT, matched by seedGithubRepo's
 * own default push, so most tests start with an empty diff.
 */
async function fixtureScaffoldDir(t, { wrangler = WRANGLER_CONTENT, cairnConfig = CAIRN_CONFIG_CONTENT } = {}) {
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-chapter3-scaffold-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await writeFile(path.join(dir, 'wrangler.jsonc'), wrangler);
  await mkdir(path.join(dir, 'src/theme'), { recursive: true });
  await writeFile(path.join(dir, 'src/theme/cairn.config.ts'), cairnConfig);
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
 * Seed an installation, create a repository, and push a fixture scaffold matching (by default)
 * fixtureScaffoldDir's own content, the same shape chapter 1's own GitHub chapter leaves the
 * repository in before chapter 3 ever runs. Pushing real content (rather than createRepo's bare
 * auto_init README) is what lets the reconcile diff start empty by default, matching every
 * existing production repo chapter 3 actually runs against.
 * @param {import('../../test/fake-github.mjs').FakeGithub} github
 * @param {string} dir the local scaffold to push (its own wrangler.jsonc/cairn.config.ts)
 * @param {string} [name]
 * @returns {Promise<{ id: number, owner: string, repo: string, defaultBranch: string }>}
 */
async function seedGithubRepo(github, dir, name = 'alpine-club') {
  github.state.installations.push({ id: 1, app_id: 1, account: { login: 'fake-admin' }, repositories: [] });
  const repo = await createRepo('fake-user-token', { name, ownerType: 'user', dir: '/tmp' });
  await pushScaffold('fake-user-token', { owner: repo.owner, repo: repo.repo, dir, log: () => {}, defaultBranch: repo.defaultBranch });
  return repo;
}

/**
 * Seed a state record shaped like a site that just finished chapter 2 (its own terminal already
 * cleared `cloudflare.apiToken`), carrying the App credentials the reconcile hop's OAuth trip
 * needs (`clientId`/`clientSecret`), the point every chapter-3 test starts from unless it overrides.
 */
async function seedSite(siteId, dir, repo, overrides = {}) {
  await saveSite(siteId, {
    name: 'Builds Test Site',
    dir,
    step: 'email-live',
    ownerEmail: 'owner@example.com',
    github: { clientId: 'fake-client-1', clientSecret: 'fake-secret', installationId: 1, repo },
    cloudflare: { accountId: 'acct-1', url: `https://${WORKER_NAME}.example.workers.dev`, workerName: WORKER_NAME },
    ...overrides,
  });
}

/**
 * The `cloudflare` overrides that make a seeded record read as "already reconciled": the local
 * config hash chapter 3 records at every reconcile. A test about a later hop (the build watch, the
 * connect refusals) seeds it so the run skips the sign-in trip the hash gate would otherwise owe,
 * exactly as a real second run does.
 * @param {string} dir the scaffold whose current contents the hash is taken over
 * @returns {Promise<object>} a `seedSite` overrides object
 */
async function alreadyReconciled(dir) {
  return {
    cloudflare: {
      accountId: 'acct-1',
      url: `https://${WORKER_NAME}.example.workers.dev`,
      workerName: WORKER_NAME,
      buildsReconciledHash: await reconciledConfigHash(dir),
    },
  };
}

/**
 * Assert a secret is nowhere in a site's state file on disk, falsifiably: a decoy carrying the
 * exact string is written first and confirmed detectable, so the clean result that follows is a
 * real sweep rather than an assertion that could never fail (the pattern oauth.test.mjs
 * established for the OAuth user token).
 * @param {string} stateDir the state directory in force for this test
 * @param {string} siteId the site whose record is swept
 * @param {string} secret the exact string that must not be on disk
 */
async function assertSecretSweptFromDisk(stateDir, siteId, secret) {
  const filePath = path.join(stateDir, `${siteId}.json`);
  const clean = await readFile(filePath, 'utf8');
  await writeFile(filePath, `${clean}// decoy: ${secret}\n`);
  assert.ok(
    (await readFile(filePath, 'utf8')).includes(secret),
    'the sweep must be able to detect the secret when it is present',
  );
  await writeFile(filePath, clean);
  assert.equal(
    (await readFile(filePath, 'utf8')).includes(secret),
    false,
    `the token must be nowhere in the state file, got: ${clean}`,
  );
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

/**
 * Open the browser for whichever of the two flows asked: a real redirect simulation for
 * reauthorize's `/login/oauth/authorize` trip (deferred to a macrotask, the same race
 * oauth.test.mjs itself works around), and a no-op for the token prefill's create-token page
 * (nothing to simulate there; the admin pastes the token back through promptSecretFn instead).
 */
function smartOpenBrowser() {
  return async (url) => {
    if (url.includes('/login/oauth/authorize')) {
      setTimeout(() => {
        fetch(url).catch(() => {});
      }, 0);
    }
  };
}

/** A fetchImpl answering the live marker pair on any origin, for confirmHostname's own probes. */
function alwaysMatchingFetch() {
  return async (url) => {
    const u = new URL(url);
    if (u.pathname === '/') return new Response(null, { status: 200 });
    if (u.pathname === '/admin') {
      return new Response(null, { status: 303, headers: { location: `${u.origin}/admin/login` } });
    }
    return new Response(null, { status: 404 });
  };
}

/**
 * A sleepFn that resolves every in-flight build to `stopped`/`success` on its very first call,
 * the fast-forward every test not specifically driving a poll sequence uses.
 */
function autoResolveBuilds(cloudflare) {
  return async () => {
    for (const build of cloudflare.state.builds.values()) {
      if (build.status !== 'stopped') {
        build.status = 'stopped';
        build.build_outcome = build.build_outcome ?? 'success';
        build.stopped_on = new Date().toISOString();
      }
    }
  };
}

/** The seams every test needs so the build watch and hostname confirm settle fast and green. */
function fastSeams(cloudflare) {
  return { sleepFn: autoResolveBuilds(cloudflare), fetchImpl: alwaysMatchingFetch(), pollIntervalMs: 0, maxPollAttempts: 5 };
}

/**
 * Wrap the real Cloudflare API client so its very first `listBuildsForWorker` call seeds a
 * push-triggered, already-succeeded build carrying the repository's CURRENT head commit sha,
 * simulating Cloudflare's own push webhook noticing the reconcile commit. Every other method
 * delegates straight through to the real client.
 */
function makeApiFnWithPushBuildSeed({ cloudflare, github, owner, repo, defaultBranch }) {
  let seeded = false;
  return (opts) => {
    const real = makeApi(opts);
    return {
      ...real,
      async listBuildsForWorker(tag) {
        if (!seeded) {
          seeded = true;
          const gitEntry = github.state.gitObjects.get(`${owner}/${repo}`);
          const headSha = gitEntry?.refs.get(`heads/${defaultBranch}`);
          if (headSha) {
            cloudflare.state.builds.set('push-build-1', {
              build_uuid: 'push-build-1',
              status: 'stopped',
              build_outcome: 'success',
              created_on: new Date().toISOString(),
              stopped_on: new Date().toISOString(),
              trigger: { external_script_id: tag },
              build_trigger_source: 'push_event',
              build_trigger_metadata: { commit_hash: headSha, commit_message: 'x', author: 'admin', branch: defaultBranch },
            });
          }
        }
        return real.listBuildsForWorker(tag);
      },
    };
  };
}

test('runChapter3: an interactive consent connects, creates the trigger, reconciles an identical repo through one sign-in and no commit, kicks a manual build, and watches it to builds-live', async (t) => {
  const stateDir = await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t);
  const github = await setupGithub(t);
  github.state.apps.push({ id: 1, client_id: 'fake-client-1', callback_urls: ['http://127.0.0.1/callback'] });
  const repo = await seedGithubRepo(github, dir);
  const siteId = 'builds-test-site-abc123';
  await seedSite(siteId, dir, repo);
  const commitsBefore = github.requests.filter((r) => r.method === 'POST' && r.pathname.endsWith('/git/commits')).length;

  const logs = [];
  const result = await runChapter3({
    siteId,
    record: await loadSite(siteId),
    dir,
    args: { yes: false },
    log: (line) => logs.push(line),
    dryRun: false,
    openBrowser: smartOpenBrowser(),
    confirm: confirmAnswering(true),
    promptSecretFn: async () => 'fresh-cf-token',
    ...fastSeams(cloudflare),
  });

  assert.equal(result.outcome, 'builds-live');

  const saved = await loadSite(siteId);
  assert.equal(saved.step, 'builds-live');
  assert.equal('apiToken' in saved.cloudflare, false, 'the token must be deleted at the terminal step');
  await assertSecretSweptFromDisk(stateDir, siteId, 'fresh-cf-token');
  assert.ok(saved.cloudflare.buildsConnectionUuid);
  assert.ok(saved.cloudflare.buildsTriggerUuid);
  assert.ok(saved.cloudflare.buildsLastBuildUuid);
  assert.equal(saved.cloudflare.buildsLastBuildOutcome, 'success');

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

  // A first run has no recorded config hash to compare against, and the repository is private, so
  // the only way to know whether it matches is to sign in and let reconcileRepo read it. The trip
  // happens exactly once and writes nothing, and the hash it records is what lets the next run skip
  // it (the test below proves that half).
  assert.equal(github.requests.filter((r) => r.pathname === '/login/oauth/authorize').length, 1);
  const commitsAfter = github.requests.filter((r) => r.method === 'POST' && r.pathname.endsWith('/git/commits')).length;
  assert.equal(commitsAfter - commitsBefore, 0, 'an identical repository must be committed to zero times');
  assert.equal(saved.cloudflare.buildsReconciledHash, await reconciledConfigHash(dir));

  // A manual kick, since nothing differed and no successful build was recorded yet.
  const kickRequest = cloudflare.requests.find(
    (r) => r.method === 'POST' && r.path.includes('/builds/triggers/') && r.path.endsWith('/builds'),
  );
  assert.ok(kickRequest, 'expected a manual build kick');

  // The closing copy: push-to-deploy on the default branch, the admin URL, no disposable-laptop claim.
  assert.match(result.message, /now builds and deploys itself/);
  assert.match(result.message, /\/admin/);
  assert.match(result.message, /engine update/);
  assert.doesNotMatch(result.message, /disposable/);
  void logs;
});

test('runChapter3: declining records builds-connect-declined, deletes any token, and leaves the site untouched', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t);
  const github = await setupGithub(t);
  const repo = await seedGithubRepo(github, dir);
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
  assert.match(printed, /Reconcile your deploy config/);
  assert.match(printed, /Watch your first Workers Builds deploy/);

  // The consent point must disclose what the pasted token becomes, not only what it costs in
  // money. Registering it as the build token hands Cloudflare a secret it keeps and injects into
  // every build, and the token the prefill asks for is account-wide, so a commit to the default
  // branch can read it. A security review found this stated nowhere the admin sees before
  // consenting; these assertions exist so it cannot quietly go missing again.
  assert.match(printed, /build token/, 'the admission must say the token becomes the build token');
  assert.match(printed, /every build/, 'the admission must say Cloudflare gives it to every build');
  assert.match(
    printed,
    /commit to your default branch/,
    'the admission must name who can read the token as a result',
  );

  assert.equal(cloudflare.requests.length, 0);
  assert.equal(github.requests.length, 0);
});

test('runChapter3: --yes consents silently, never prompting, reads CAIRN_CF_API_TOKEN, and still runs the whole chapter', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t);
  const github = await setupGithub(t);
  const repo = await seedGithubRepo(github, dir);
  const siteId = 'builds-yes-site-abc123';
  // Seeded as already reconciled: `--yes` never opens a browser, so it can only carry a run all the
  // way through when the local config has not drifted since the last reconcile. A `--yes` run that
  // meets drift parks instead, which the reconcile-park test below covers.
  await seedSite(siteId, dir, repo, await alreadyReconciled(dir));

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
    ...fastSeams(cloudflare),
  });

  assert.equal(result.outcome, 'builds-live');
  const putRequest = cloudflare.requests.find(
    (r) => r.method === 'PUT' && r.path.includes('/builds/repos/connections'),
  );
  assert.equal(putRequest.headers.authorization, 'Bearer env-token-value');
});

test('runChapter3: a record still carrying chapter 2\'s own saved token gets the full admission and a fresh eight-key token, never chapter 2\'s', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t);
  const github = await setupGithub(t);
  const repo = await seedGithubRepo(github, dir);
  const siteId = 'builds-ch2-token-abc123';
  // The state `--connect` actually meets at a chapter-2 resumable step: chapter 2 deletes its saved
  // token only at its own TERMINAL steps, so a record parked at `domain-live` still carries the
  // five-key token it pasted. Reading that token as "chapter 3 already ran" is what skipped this
  // chapter's consent, its cost copy, and its eight-key prefill.
  const alreadyReconciledCloudflare = (await alreadyReconciled(dir)).cloudflare;
  await seedSite(siteId, dir, repo, {
    step: 'domain-live',
    cloudflare: { ...alreadyReconciledCloudflare, apiToken: 'chapter2-five-key-token' },
  });

  const logs = [];
  const opened = [];
  let confirmCalls = 0;
  const result = await runChapter3({
    siteId,
    record: await loadSite(siteId),
    dir,
    args: { yes: false },
    log: (line) => logs.push(line),
    dryRun: false,
    openBrowser: async (url) => {
      opened.push(url);
    },
    confirm: async () => {
      confirmCalls += 1;
      return true;
    },
    promptSecretFn: async () => 'fresh-cf-token',
    ...fastSeams(cloudflare),
  });

  assert.equal(result.outcome, 'builds-live');
  assert.equal(confirmCalls, 1, 'the admission consent must still be asked');
  assert.match(logs.join('\n'), /3,000 build minutes/, 'the admission cost copy must still be stated');

  const prefill = opened.find((url) => url.includes('/profile/api-tokens'));
  assert.ok(prefill, 'the create-token page must open, rather than chapter 2\'s token being adopted');
  assert.match(decodeURIComponent(prefill), /workers_ci/, 'the prefill must request the Builds keys');

  const putRequest = cloudflare.requests.find(
    (r) => r.method === 'PUT' && r.path.includes('/builds/repos/connections'),
  );
  assert.equal(putRequest.headers.authorization, 'Bearer fresh-cf-token', 'the Builds calls must sign with the fresh token');
});

test('runChapter3: an authorization refusal parks on its own row, and a re-run after the fake flips to authorized proceeds through to builds-live', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t);
  const github = await setupGithub(t);
  github.state.apps.push({ id: 1, client_id: 'fake-client-1', callback_urls: ['http://127.0.0.1/callback'] });
  const repo = await seedGithubRepo(github, dir);
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
  assert.ok(afterPark.cloudflare.buildsTokenSavedAt, 'the park records that this chapter saved the token');

  // The re-run neither re-asks admission nor re-asks for the token: the marker above is what says
  // both already happened, and it is chapter-3-owned, so no chapter-2 token could ever stand in for
  // it (`mustNotBeCalled` on both prompts is the assertion).
  const second = await runChapter3({
    siteId,
    record: afterPark,
    dir,
    args: { yes: false },
    log: () => {},
    dryRun: false,
    openBrowser: smartOpenBrowser(),
    confirm: mustNotBeCalled('confirm'),
    promptSecretFn: mustNotBeCalled('promptSecretFn'),
    ...fastSeams(cloudflare),
  });

  assert.equal(second.outcome, 'builds-live');
  const saved = await loadSite(siteId);
  assert.equal(saved.step, 'builds-live');
  assert.ok(saved.cloudflare.buildsConnectionUuid);
});

test('runChapter3: the App-not-authorized refusal maps to its own row without quoting the platform wording', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t);
  const github = await setupGithub(t);
  const repo = await seedGithubRepo(github, dir);
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

test('runChapter3: connect and trigger are idempotent across two runs, the second skips the sign-in trip entirely, one kick only, and a two-hop partial write preserves sibling cloudflare fields', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t);
  const github = await setupGithub(t);
  github.state.apps.push({ id: 1, client_id: 'fake-client-1', callback_urls: ['http://127.0.0.1/callback'] });
  const repo = await seedGithubRepo(github, dir);
  const siteId = 'builds-idempotent-site-abc123';
  await seedSite(siteId, dir, repo);

  const first = await runChapter3({
    siteId,
    record: await loadSite(siteId),
    dir,
    args: { yes: false },
    log: () => {},
    dryRun: false,
    openBrowser: smartOpenBrowser(),
    confirm: confirmAnswering(true),
    promptSecretFn: async () => 'fresh-cf-token',
    ...fastSeams(cloudflare),
  });
  assert.equal(first.outcome, 'builds-live');

  const afterFirst = await loadSite(siteId);
  const connectionUuid1 = afterFirst.cloudflare.buildsConnectionUuid;
  const triggerUuid1 = afterFirst.cloudflare.buildsTriggerUuid;
  assert.ok(connectionUuid1);
  assert.ok(triggerUuid1);

  // Regress `step` only, simulating a later `--connect` re-entry that must re-run connect and
  // trigger: the account id, the Builds uuids, and the last build stay in place, so the second
  // run's own writes are the only thing under test here. The first run's own completion already
  // deleted `cloudflare.apiToken` (the builds-live terminal), so this re-entry legitimately asks
  // admission and the token prefill again, the same as any other re-connect after a full cycle.
  await saveSite(siteId, { ...afterFirst, step: 'email-live' });

  const second = await runChapter3({
    siteId,
    record: await loadSite(siteId),
    dir,
    args: { yes: false },
    log: () => {},
    // Nothing local drifted between the two runs, so the recorded config hash still matches and
    // this run owes no sign-in trip. The opener still simulates one (the token hop opens the
    // prefill page through this same seam), so a regression that re-ran the trip would show up in
    // the authorize count below rather than hanging the suite.
    openBrowser: smartOpenBrowser(),
    confirm: confirmAnswering(true),
    promptSecretFn: async () => 'fresh-cf-token-2',
    dryRun: false,
    ...fastSeams(cloudflare),
  });
  assert.equal(second.outcome, 'builds-live');
  assert.equal(
    github.requests.filter((r) => r.pathname === '/login/oauth/authorize').length,
    1,
    'only the first run pays a sign-in trip; the recorded hash carries the second',
  );

  const afterSecond = await loadSite(siteId);
  assert.equal(afterSecond.cloudflare.buildsConnectionUuid, connectionUuid1, 'the uuid is stable across two PUTs');
  assert.equal(afterSecond.cloudflare.buildsTriggerUuid, triggerUuid1, 'the existing trigger is adopted, not recreated');
  assert.equal(afterSecond.cloudflare.accountId, afterFirst.cloudflare.accountId);
  assert.equal(afterSecond.cloudflare.url, afterFirst.cloudflare.url);

  const triggerCreates = cloudflare.requests.filter(
    (r) => r.method === 'POST' && r.path.includes('/builds/triggers') && !r.path.includes('/builds/triggers/'),
  );
  assert.equal(triggerCreates.length, 1, 'only the first run creates a trigger; the second adopts it');

  const kicks = cloudflare.requests.filter(
    (r) => r.method === 'POST' && r.path.includes('/builds/triggers/') && r.path.endsWith('/builds'),
  );
  assert.equal(kicks.length, 1, 'the already-successful build from the first run must not be kicked again');
});

test('runChapter3: a differing repo commits exactly once through exactly one reauthorize call, and a build the fake never surfaces parks on build-not-started with config-reconciled recorded', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t);
  const github = await setupGithub(t);
  github.state.apps.push({ id: 1, client_id: 'fake-client-1', callback_urls: ['http://127.0.0.1/callback'] });
  // Push a DIFFERENT wrangler.jsonc than what the local scaffold holds, so the reconcile diff is
  // real: the repo starts one commit behind the local disk.
  const repo = await seedGithubRepo(github, await fixtureScaffoldDir(t, { wrangler: `${JSON.stringify({ name: 'stale-name' }, null, 2)}\n` }));
  const siteId = 'builds-diff-site-abc123';
  await seedSite(siteId, dir, repo);
  const commitsBefore = github.requests.filter((r) => r.method === 'POST' && r.pathname.endsWith('/git/commits')).length;

  const result = await runChapter3({
    siteId,
    record: await loadSite(siteId),
    dir,
    args: { yes: false },
    log: () => {},
    dryRun: false,
    openBrowser: smartOpenBrowser(),
    confirm: confirmAnswering(true),
    promptSecretFn: async () => 'fresh-cf-token',
    ...fastSeams(cloudflare),
  });

  assert.equal(result.outcome, 'build-not-started');

  const saved = await loadSite(siteId);
  assert.equal(saved.step, 'config-reconciled');

  assert.equal(github.requests.filter((r) => r.pathname === '/login/oauth/authorize').length, 1, 'exactly one authorize trip');
  const commitsAfter = github.requests.filter((r) => r.method === 'POST' && r.pathname.endsWith('/git/commits')).length;
  assert.equal(commitsAfter - commitsBefore, 1, 'exactly one commit');

  // The commit push is not followed by a manual kick: one build kicked would be zero here, since
  // nothing ever surfaces a matching build for this test to find.
  const kicks = cloudflare.requests.filter(
    (r) => r.method === 'POST' && r.path.includes('/builds/triggers/') && r.path.endsWith('/builds'),
  );
  assert.equal(kicks.length, 0, 'a commit push must never be followed by a manual kick');
});

test('runChapter3: a differing repo whose push build the fake surfaces is found by commit hash and watched to builds-live, with no manual kick', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t);
  const github = await setupGithub(t);
  github.state.apps.push({ id: 1, client_id: 'fake-client-1', callback_urls: ['http://127.0.0.1/callback'] });
  const staleDir = await fixtureScaffoldDir(t, { wrangler: `${JSON.stringify({ name: 'stale-name' }, null, 2)}\n` });
  const repo = await seedGithubRepo(github, staleDir);
  const siteId = 'builds-diff-found-site-abc123';
  await seedSite(siteId, dir, repo);

  const result = await runChapter3({
    siteId,
    record: await loadSite(siteId),
    dir,
    args: { yes: false },
    log: () => {},
    dryRun: false,
    openBrowser: smartOpenBrowser(),
    confirm: confirmAnswering(true),
    promptSecretFn: async () => 'fresh-cf-token',
    sleepFn: autoResolveBuilds(cloudflare),
    fetchImpl: alwaysMatchingFetch(),
    pollIntervalMs: 0,
    maxPollAttempts: 5,
    makeApiFn: makeApiFnWithPushBuildSeed({ cloudflare, github, owner: repo.owner, repo: repo.repo, defaultBranch: repo.defaultBranch }),
  });

  assert.equal(result.outcome, 'builds-live');
  const kicks = cloudflare.requests.filter(
    (r) => r.method === 'POST' && r.path.includes('/builds/triggers/') && r.path.endsWith('/builds'),
  );
  assert.equal(kicks.length, 0, 'the push build was found; a manual kick must never fire');
});

/**
 * A minimal Cloudflare API stand-in for watchAndComplete's own discovery branch, tracking how
 * many times each method is called. `listBuildsForWorker` answers empty for its first
 * `emptyPolls` calls and `builds` from then on, so a test can script exactly how many polls a
 * discovery hold needs before it clears. `getBuild` always answers a settled, successful build:
 * these tests are about discovery, not the poll-to-stop loop pollBuildToStop already owns and
 * already has its own tests.
 * @param {{ tag: string, emptyPolls?: number, builds?: object[] }} opts
 */
function discoveryApi({ tag, emptyPolls = 0, builds = [] }) {
  const calls = { listBuildsForWorker: 0, kickBuild: 0, getBuild: 0 };
  return {
    calls,
    async findWorkerTag() {
      return tag;
    },
    async listBuildsForWorker() {
      calls.listBuildsForWorker += 1;
      return calls.listBuildsForWorker > emptyPolls ? builds : [];
    },
    async kickBuild() {
      calls.kickBuild += 1;
      throw new Error('kickBuild must not be called by the discovery hold');
    },
    async getBuild(buildUuid) {
      calls.getBuild += 1;
      return { build_uuid: buildUuid, status: 'stopped', build_outcome: 'success' };
    },
  };
}

/** A clock that advances by a fixed step on every call, for deterministic budget-expiry tests
 * that never depend on real elapsed time. */
function stepClock(stepMs) {
  let value = 0;
  return () => {
    value += stepMs;
    return value;
  };
}

const DISCOVERY_RECORD = { cloudflare: { domain: 'example.test' } };

test('watchAndComplete: the discovery hold polls listBuildsForWorker only, and never calls kickBuild, until a commit-hash match appears', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const commitSha = 'deadbeef';
  const api = discoveryApi({
    tag: WORKER_TAG,
    emptyPolls: 2,
    builds: [{ build_uuid: 'discovered-1', build_trigger_metadata: { commit_hash: commitSha } }],
  });

  const result = await watchAndComplete({
    siteId: 'discovery-commit-site',
    record: DISCOVERY_RECORD,
    dir,
    log: () => {},
    api,
    sleepFn: async () => {},
    fetchImpl: alwaysMatchingFetch(),
    pollIntervalMs: 0,
    maxPollAttempts: 5,
    triggerUuid: 'trigger-1',
    defaultBranch: 'main',
    chapter3Reached: false,
    lastBuildUuid: undefined,
    lastBuildOutcome: undefined,
    reconcileResult: { changed: true, commitSha },
    waitForClear: createWaitForClear({
      holdClass: BUILD_HOLD_CLASS,
      pollIntervalMs: 1,
      budgetMs: 60_000,
      sleepFn: async () => {},
    }),
  });

  assert.equal(result.outcome, 'builds-live');
  assert.equal(api.calls.listBuildsForWorker, 3, 'not-clear on polls 1 and 2, clear on poll 3');
  assert.ok(api.calls.kickBuild <= 1, 'kickBuild stays outside the discovery loop');
  assert.equal(api.calls.kickBuild, 0, 'a commit-hash discovery never needs to kick a build');
  assert.equal(api.calls.getBuild, 1, 'a found build composes with exactly one pollBuildToStop pass, never a second loop');
});

test('watchAndComplete: on the resumed no-diff path, the discovery hold picks the newest build, the same predicate the branch uses today', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const api = discoveryApi({
    tag: WORKER_TAG,
    emptyPolls: 2,
    builds: [{ build_uuid: 'newest-build' }, { build_uuid: 'older-build' }],
  });

  const result = await watchAndComplete({
    siteId: 'discovery-resumed-site',
    record: DISCOVERY_RECORD,
    dir,
    log: () => {},
    api,
    sleepFn: async () => {},
    fetchImpl: alwaysMatchingFetch(),
    pollIntervalMs: 0,
    maxPollAttempts: 5,
    triggerUuid: 'trigger-1',
    defaultBranch: 'main',
    chapter3Reached: true,
    lastBuildUuid: undefined,
    lastBuildOutcome: undefined,
    reconcileResult: undefined,
    waitForClear: createWaitForClear({
      holdClass: BUILD_HOLD_CLASS,
      pollIntervalMs: 1,
      budgetMs: 60_000,
      sleepFn: async () => {},
    }),
  });

  assert.equal(result.outcome, 'builds-live');
  assert.equal(api.calls.listBuildsForWorker, 3, 'not-clear on polls 1 and 2, clear on poll 3');
  assert.equal(api.calls.kickBuild, 0, 'a resumed watch never kicks a second build');

  const saved = await loadSite('discovery-resumed-site');
  assert.equal(saved.cloudflare.buildsLastBuildUuid, 'newest-build', 'the newest build is the one discovered and watched');
});

test('watchAndComplete: a discovery hold that never clears within its budget parks on build-not-started, the exact row the no-hold path would have parked on', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);

  const withoutHold = await watchAndComplete({
    siteId: 'discovery-expiry-baseline',
    record: DISCOVERY_RECORD,
    dir,
    log: () => {},
    api: discoveryApi({ tag: WORKER_TAG, emptyPolls: Infinity }),
    sleepFn: async () => {},
    fetchImpl: alwaysMatchingFetch(),
    pollIntervalMs: 0,
    maxPollAttempts: 5,
    triggerUuid: 'trigger-1',
    defaultBranch: 'main',
    chapter3Reached: false,
    lastBuildUuid: undefined,
    lastBuildOutcome: undefined,
    reconcileResult: { changed: true, commitSha: 'never-found' },
  });

  const heldApi = discoveryApi({ tag: WORKER_TAG, emptyPolls: Infinity });
  const withHold = await watchAndComplete({
    siteId: 'discovery-expiry-held',
    record: DISCOVERY_RECORD,
    dir,
    log: () => {},
    api: heldApi,
    sleepFn: async () => {},
    fetchImpl: alwaysMatchingFetch(),
    pollIntervalMs: 0,
    maxPollAttempts: 5,
    triggerUuid: 'trigger-1',
    defaultBranch: 'main',
    chapter3Reached: false,
    lastBuildUuid: undefined,
    lastBuildOutcome: undefined,
    reconcileResult: { changed: true, commitSha: 'never-found' },
    waitForClear: createWaitForClear({
      holdClass: BUILD_HOLD_CLASS,
      pollIntervalMs: 1,
      budgetMs: 50,
      sleepFn: async () => {},
      now: stepClock(100),
    }),
  });

  assert.equal(withHold.outcome, 'build-not-started');
  assert.equal(withHold.outcome, withoutHold.outcome);
  assert.equal(withHold.message, withoutHold.message, 'the held expiry parks on the exact same row as today');
  assert.ok(heldApi.calls.listBuildsForWorker >= 1, 'the hold must have actually probed before giving up');
});

test('runChapter3: --yes with a real config diff parks on builds-reconcile-parked, opening no browser', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t);
  const github = await setupGithub(t);
  const staleDir = await fixtureScaffoldDir(t, { wrangler: `${JSON.stringify({ name: 'stale-name' }, null, 2)}\n` });
  const repo = await seedGithubRepo(github, staleDir);
  const siteId = 'builds-yes-park-site-abc123';
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

  assert.equal(result.outcome, 'builds-reconcile-parked');
  assert.match(result.message, /without --yes/);
  const saved = await loadSite(siteId);
  assert.notEqual(saved.step, 'config-reconciled', 'a park must not advance step');
});

test('runChapter3: the build watch polls through queued, initializing, and running, printing a heartbeat before it reaches stopped', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t);
  const github = await setupGithub(t);
  const repo = await seedGithubRepo(github, dir);
  const siteId = 'builds-poll-sequence-site-abc123';
  // Seeded as already reconciled: this test is about the poll sequence, not the sign-in trip a
  // first, unreconciled run owes.
  await seedSite(siteId, dir, repo, await alreadyReconciled(dir));

  const sequence = new Array(9).fill('queued').concat(['initializing', 'running', 'stopped']);
  let call = 0;
  const scriptedSleep = async () => {
    const build = [...cloudflare.state.builds.values()][0];
    const next = sequence[Math.min(call, sequence.length - 1)];
    build.status = next;
    if (next === 'stopped') build.build_outcome = 'success';
    call += 1;
  };

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
    sleepFn: scriptedSleep,
    fetchImpl: alwaysMatchingFetch(),
    pollIntervalMs: 0,
    maxPollAttempts: 20,
  });

  assert.equal(result.outcome, 'builds-live');
  assert.ok(
    logs.some((line) => line.includes('Still watching the build')),
    'expected a heartbeat line while the build was still in flight',
  );
});

test('runChapter3: fail surfaces builds-deploy-failed carrying the log tail', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t);
  const github = await setupGithub(t);
  const repo = await seedGithubRepo(github, dir);
  const siteId = 'builds-fail-site-abc123';
  await seedSite(siteId, dir, repo, await alreadyReconciled(dir));

  const failingSleep = async () => {
    const build = [...cloudflare.state.builds.values()][0];
    build.status = 'stopped';
    build.build_outcome = 'fail';
    cloudflare.state.buildLogs.set(build.build_uuid, [{
      cursor: 'x',
      truncated: false,
      lines: [[Date.now(), 'a distinctive deploy failure marker']],
      events: [],
    }]);
  };

  await assert.rejects(
    async () =>
      runChapter3({
        siteId,
        record: await loadSite(siteId),
        dir,
        args: { yes: false },
        log: () => {},
        dryRun: false,
        openBrowser: neverOpensBrowser,
        confirm: confirmAnswering(true),
        promptSecretFn: async () => 'fresh-cf-token',
        sleepFn: failingSleep,
        fetchImpl: alwaysMatchingFetch(),
        pollIntervalMs: 0,
        maxPollAttempts: 5,
      }),
    (err) => {
      // Asserted on the message, not err.catalogue.code: runActions re-wraps a thrown error with
      // its action label and does not carry the catalogue property across (chapter2.test.mjs's
      // own idiom for exactly this).
      assert.match(err.message, /did not finish successfully/);
      assert.match(err.message, /a distinctive deploy failure marker/);
      return true;
    },
  );
});

test('runChapter3: skipped surfaces builds-not-runnable naming the outcome', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t);
  const github = await setupGithub(t);
  const repo = await seedGithubRepo(github, dir);
  const siteId = 'builds-skipped-site-abc123';
  await seedSite(siteId, dir, repo, await alreadyReconciled(dir));

  const skippingSleep = async () => {
    const build = [...cloudflare.state.builds.values()][0];
    build.status = 'stopped';
    build.build_outcome = 'skipped';
  };

  await assert.rejects(
    async () =>
      runChapter3({
        siteId,
        record: await loadSite(siteId),
        dir,
        args: { yes: false },
        log: () => {},
        dryRun: false,
        openBrowser: neverOpensBrowser,
        confirm: confirmAnswering(true),
        promptSecretFn: async () => 'fresh-cf-token',
        sleepFn: skippingSleep,
        fetchImpl: alwaysMatchingFetch(),
        pollIntervalMs: 0,
        maxPollAttempts: 5,
      }),
    (err) => {
      assert.match(err.message, /did not run/);
      assert.match(err.message, /skipped/);
      return true;
    },
  );
});

test('runChapter3: a null build_outcome at a stopped status keeps polling rather than reporting a false success (B1)', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t);
  const github = await setupGithub(t);
  const repo = await seedGithubRepo(github, dir);
  const siteId = 'builds-null-outcome-site-abc123';
  await seedSite(siteId, dir, repo, await alreadyReconciled(dir));

  // Cloudflare's own write ordering (docs/internal/2026-08-12-t4c-builds-spike.md) writes
  // `status: "stopped"` before `build_outcome`, so a real poll can observe exactly this
  // combination for a tick. A poll that stops on `status` alone reads this as a finished build
  // and, downstream, as a success; this proves it keeps polling instead.
  let call = 0;
  const scriptedSleep = async () => {
    const build = [...cloudflare.state.builds.values()][0];
    call += 1;
    if (call === 1) {
      build.status = 'stopped';
      build.build_outcome = null;
    } else {
      build.build_outcome = 'success';
    }
  };

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
    sleepFn: scriptedSleep,
    fetchImpl: alwaysMatchingFetch(),
    pollIntervalMs: 0,
    maxPollAttempts: 5,
  });

  assert.equal(result.outcome, 'builds-live');
  assert.ok(call >= 2, 'the poll must have taken at least the null-outcome tick before settling');
});

test('runChapter3: an unrecognized build_outcome maps to builds-not-runnable rather than a false success (B1)', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t);
  const github = await setupGithub(t);
  const repo = await seedGithubRepo(github, dir);
  const siteId = 'builds-weird-outcome-site-abc123';
  await seedSite(siteId, dir, repo, await alreadyReconciled(dir));

  const weirdOutcomeSleep = async () => {
    const build = [...cloudflare.state.builds.values()][0];
    build.status = 'stopped';
    build.build_outcome = 'some-future-outcome-cloudflare-has-not-documented-yet';
  };

  await assert.rejects(
    async () =>
      runChapter3({
        siteId,
        record: await loadSite(siteId),
        dir,
        args: { yes: false },
        log: () => {},
        dryRun: false,
        openBrowser: neverOpensBrowser,
        confirm: confirmAnswering(true),
        promptSecretFn: async () => 'fresh-cf-token',
        sleepFn: weirdOutcomeSleep,
        fetchImpl: alwaysMatchingFetch(),
        pollIntervalMs: 0,
        maxPollAttempts: 5,
      }),
    (err) => {
      assert.match(err.message, /did not run/);
      assert.match(err.message, /some-future-outcome-cloudflare-has-not-documented-yet/);
      return true;
    },
  );
});

test('runChapter3: a budget-exceeded poll parks as build-running, and a re-run resumes the same build rather than kicking another', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t);
  const github = await setupGithub(t);
  const repo = await seedGithubRepo(github, dir);
  const siteId = 'builds-budget-site-abc123';
  await seedSite(siteId, dir, repo, await alreadyReconciled(dir));

  const neverAdvances = async () => {};

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
    sleepFn: neverAdvances,
    fetchImpl: alwaysMatchingFetch(),
    pollIntervalMs: 0,
    maxPollAttempts: 2,
  });
  assert.equal(first.outcome, 'build-running');

  const afterFirst = await loadSite(siteId);
  assert.ok(afterFirst.cloudflare.buildsLastBuildUuid);
  assert.equal(afterFirst.step, 'config-reconciled');

  const kicksAfterFirst = cloudflare.requests.filter(
    (r) => r.method === 'POST' && r.path.includes('/builds/triggers/') && r.path.endsWith('/builds'),
  ).length;
  assert.equal(kicksAfterFirst, 1);

  const second = await runChapter3({
    siteId,
    record: afterFirst,
    dir,
    args: { yes: false },
    log: () => {},
    dryRun: false,
    openBrowser: mustNotBeCalled('openBrowser'),
    confirm: mustNotBeCalled('confirm'),
    promptSecretFn: mustNotBeCalled('promptSecretFn'),
    sleepFn: neverAdvances,
    fetchImpl: alwaysMatchingFetch(),
    pollIntervalMs: 0,
    maxPollAttempts: 2,
  });
  assert.equal(second.outcome, 'build-running');
  assert.equal(second.message, first.message);

  const kicksAfterSecond = cloudflare.requests.filter(
    (r) => r.method === 'POST' && r.path.includes('/builds/triggers/') && r.path.endsWith('/builds'),
  ).length;
  assert.equal(kicksAfterSecond, 1, 'the second run must resume the same build, never kicking another');
});

test('runChapter3: a builds-live re-entry with nothing changed reports "nothing to reconcile"', async (t) => {
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t);
  const github = await setupGithub(t);
  const repo = await seedGithubRepo(github, dir);
  const siteId = 'builds-live-noop-site-abc123';
  await seedSite(siteId, dir, repo, {
    step: 'builds-live',
    cloudflare: {
      accountId: 'acct-1',
      url: `https://${WORKER_NAME}.example.workers.dev`,
      workerName: WORKER_NAME,
      buildsConnectionUuid: 'conn-1',
      buildsTriggerUuid: 'trig-1',
      buildsLastBuildUuid: 'build-1',
      buildsLastBuildOutcome: 'success',
      // What a site that finished the chapter carries: the config hash its own reconcile recorded.
      buildsReconciledHash: await reconciledConfigHash(dir),
    },
  });

  const result = await runChapter3({
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

  assert.equal(result.outcome, 'builds-live');
  assert.match(result.message, /[Nn]othing to reconcile/);
  assert.equal(github.requests.filter((r) => r.pathname === '/login/oauth/authorize').length, 0);
});

test('runChapter3: a builds-live re-entry with a real diff commits the change, re-runs the token prefill, and leaves no token behind when it parks', async (t) => {
  const stateDir = await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  const cloudflare = await setupCloudflare(t);
  const github = await setupGithub(t);
  github.state.apps.push({ id: 1, client_id: 'fake-client-1', callback_urls: ['http://127.0.0.1/callback'] });
  const repo = await seedGithubRepo(github, dir);
  const siteId = 'builds-live-reentry-site-abc123';
  await seedSite(siteId, dir, repo, {
    step: 'builds-live',
    cloudflare: {
      accountId: 'acct-1',
      url: `https://${WORKER_NAME}.example.workers.dev`,
      workerName: WORKER_NAME,
      buildsConnectionUuid: 'conn-1',
      buildsTriggerUuid: 'trig-1',
      buildsLastBuildUuid: 'build-1',
      buildsLastBuildOutcome: 'success',
    },
  });

  // Simulate a stale-origin cutover: the local wrangler.jsonc now differs from what is committed.
  await writeFile(path.join(dir, 'wrangler.jsonc'), `${JSON.stringify({ name: WORKER_NAME, account_id: 'acct-1' }, null, 2)}\n`);

  const logs = [];
  const result = await runChapter3({
    siteId,
    record: await loadSite(siteId),
    dir,
    args: { yes: false },
    log: (line) => logs.push(line),
    dryRun: false,
    openBrowser: smartOpenBrowser(),
    confirm: mustNotBeCalled('confirm'),
    promptSecretFn: async () => 'fresh-cf-token-2',
  });

  // Nothing seeds a matching push build here, so the watch parks; what this test proves is the
  // commit itself and the re-run of the token prefill.
  assert.equal(result.outcome, 'build-not-started');
  assert.ok(logs.some((line) => /re-running the token prefill/i.test(line)));

  const gitEntry = github.state.gitObjects.get(`${repo.owner}/${repo.repo}`);
  const headSha = gitEntry.refs.get(`heads/${repo.defaultBranch}`);
  const commit = gitEntry.commits.get(headSha);
  const tree = gitEntry.trees.get(commit.tree);
  const wranglerEntry = tree.find((entry) => entry.path === 'wrangler.jsonc');
  const wranglerContent = Buffer.from(gitEntry.blobs.get(wranglerEntry.sha), 'base64').toString('utf8');
  assert.match(wranglerContent, /account_id/);

  const saved = await loadSite(siteId);
  // The record's step never leaves `builds-live` on this branch, and a terminal step must not carry
  // a live credential: a later re-entry re-runs the prefill for itself rather than reusing this one.
  assert.equal('apiToken' in saved.cloudflare, false, 'a builds-live re-entry must leave no token behind');
  await assertSecretSweptFromDisk(stateDir, siteId, 'fresh-cf-token-2');
  assert.equal(
    saved.cloudflare.buildsReconciledHash,
    await reconciledConfigHash(dir),
    'the commit it just made is what the next run compares against',
  );
  void cloudflare;
});

test('CHAPTER3_TERMINAL_STEPS and CHAPTER3_RESUMABLE_STEPS carry the exported step names', () => {
  assert.deepEqual(CHAPTER3_TERMINAL_STEPS, ['builds-live', 'builds-connect-declined']);
  assert.deepEqual(CHAPTER3_RESUMABLE_STEPS, ['builds-connected', 'config-reconciled']);
});
