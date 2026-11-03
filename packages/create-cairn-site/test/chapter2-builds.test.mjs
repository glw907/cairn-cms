// Chapter 2 on a site Workers Builds deploys, driven in process against runChapter2 with a fake
// GitHub (the reconcile commit), a fake Cloudflare (the Builds watch), and a fake wrangler and
// npm that record every call. The invariant under test: on a record with Builds connected, each
// configuration change chapter 2 makes reaches the repository before the next Builds deploy, and
// chapter 2 never builds or deploys locally. Also here: the effective step a record entering
// from a chapter 3 terminal step resumes from, which these fixtures reach without Builds.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { makeFakeBin } from './fake-bin.mjs';
import { startFakeCloudflare } from './fake-cloudflare.mjs';
import { startFakeGithub, pointAtFake } from './fake-github.mjs';
import { createRepo, pushScaffold } from '../src/github/repo.mjs';
import { reconcileRepo, RECONCILE_COMMIT_MESSAGE } from '../src/github/reconcile.mjs';
import { makeApi } from '../src/cloudflare/api.mjs';
import { saveSite, loadSite } from '../src/state.mjs';
import { runChapter2 } from '../src/cloudflare/chapter2.mjs';
import { reconciledConfigHash } from '../src/cloudflare/chapter3.mjs';

const WORKER_NAME = 'builds-domain-site';
const WORKER_TAG = 'tag-builds-domain';
const TRIGGER_UUID = 'trigger-uuid-1';
const WORKERS_DEV_URL = `https://${WORKER_NAME}.glw907.workers.dev`;
const DOMAIN = 'builds-domain.example';
const CONFIG_PATH = path.join('src', 'theme', 'cairn.config.ts');

const WRANGLER_CONTENT = `${JSON.stringify({ name: WORKER_NAME, vars: { PUBLIC_ORIGIN: WORKERS_DEV_URL } }, null, 2)}\n`;
const CAIRN_CONFIG_CONTENT =
  `export const publicOrigin = '${WORKERS_DEV_URL}';\n` +
  "export default {\n  email: { from: 'cms@showcase.test' },\n};\n";

/** Point CAIRN_STATE_DIR at a fresh temporary directory for one test. */
async function freshStateDir(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-chapter2-builds-state-'));
  process.env.CAIRN_STATE_DIR = dir;
  t.after(() => {
    delete process.env.CAIRN_STATE_DIR;
    return rm(dir, { recursive: true, force: true });
  });
  return dir;
}

/** A scaffold directory carrying the two tool-owned files at their workers.dev values. */
async function scaffoldDir(t, { cairnConfig = CAIRN_CONFIG_CONTENT } = {}) {
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-chapter2-builds-scaffold-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await writeFile(path.join(dir, 'wrangler.jsonc'), WRANGLER_CONTENT);
  await mkdir(path.join(dir, 'src', 'theme'), { recursive: true });
  await writeFile(path.join(dir, CONFIG_PATH), cairnConfig);
  return dir;
}

/**
 * Start the fakes and the recording wrangler/npm bin. The fake Cloudflare knows the Worker's tag
 * and its trigger, so a kick and a build list both resolve.
 * @returns {Promise<{ cloudflare: object, github: object, bin: object }>}
 */
async function setupFakes(t) {
  const cloudflare = await startFakeCloudflare({ zoneStatus: 'active' });
  t.after(() => cloudflare.close());
  cloudflare.state.workerScripts.push({ id: WORKER_NAME, tag: WORKER_TAG });
  cloudflare.state.buildTriggersByTag.set(WORKER_TAG, [{ trigger_uuid: TRIGGER_UUID, external_script_id: WORKER_TAG }]);
  process.env.CAIRN_CLOUDFLARE_API_BASE = cloudflare.apiBase;
  t.after(() => {
    delete process.env.CAIRN_CLOUDFLARE_API_BASE;
  });

  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);
  github.state.apps.push({ id: 1, client_id: 'fake-client-1', callback_urls: ['http://127.0.0.1/callback'] });

  const bin = await makeFakeBin('chapter2-builds-bin');
  t.after(() => bin.close());
  await bin.respond('deploy', { code: 0, stdout: `Deployed (0.1 sec)\n  ${WORKERS_DEV_URL}\n` });
  await bin.respond('run build', { code: 0, stdout: 'built.\n' });
  process.env.CAIRN_WRANGLER_BIN = bin.binPath;
  process.env.CAIRN_NPM_BIN = bin.binPath;
  t.after(() => {
    delete process.env.CAIRN_WRANGLER_BIN;
    delete process.env.CAIRN_NPM_BIN;
  });
  return { cloudflare, github, bin };
}

/** Create the site's repository on the fake GitHub and push `dir`'s two files into it. */
async function seedRepo(github, dir) {
  github.state.installations.push({ id: 1, app_id: 1, account: { login: 'fake-admin' }, repositories: [] });
  const repo = await createRepo('fake-user-token', { name: 'builds-domain-site', ownerType: 'user', dir: '/tmp' });
  await pushScaffold('fake-user-token', { owner: repo.owner, repo: repo.repo, dir, log: () => {}, defaultBranch: repo.defaultBranch });
  return repo;
}

/** Create the domain's zone on the fake, for a record seeded past zone creation. */
async function seedZone(dir) {
  const api = makeApi({ token: 'seed-token', accountId: 'acct-1', dir });
  const created = await api.createZone(DOMAIN);
  const zone = await api.getZone(created.id);
  return { zoneId: zone.id, nameServers: zone.name_servers };
}

/**
 * Seed a record with Workers Builds connected and live, its last reconcile matching `dir`.
 * @param {string} siteId
 * @param {string} dir
 * @param {object} repo the fake repository's identity
 * @param {{ step?: string, cloudflare?: object }} [overrides]
 */
async function seedBuildsSite(siteId, dir, repo, { step = 'builds-live', cloudflare = {} } = {}) {
  await saveSite(siteId, {
    name: 'Builds Domain Site',
    dir,
    step,
    ownerEmail: 'owner@example.com',
    github: { appSlug: 'cairn-builds-domain', clientId: 'fake-client-1', clientSecret: 'fake-secret', installationId: 1, repo },
    cloudflare: {
      accountId: 'acct-1',
      url: WORKERS_DEV_URL,
      workerName: WORKER_NAME,
      buildsConnectionUuid: 'connection-uuid-1',
      buildsTriggerUuid: TRIGGER_UUID,
      buildsLastBuildOutcome: 'success',
      buildsReconciledHash: await reconciledConfigHash(dir),
      ...cloudflare,
    },
  });
}

/**
 * Open the browser for the reconcile's OAuth trip by following the authorize URL, which the fake
 * GitHub redirects to the loopback callback; any other page (the token prefill) is a no-op.
 * `trips` counts the OAuth trips.
 */
function oauthBrowser(trips = { count: 0 }) {
  const open = async (url) => {
    if (url.includes('/login/oauth/authorize')) {
      trips.count += 1;
      setTimeout(() => {
        fetch(url).catch(() => {});
      }, 0);
    }
  };
  return Object.assign(open, { trips });
}

/** A fetchImpl answering the live marker pair on any origin, for the hostname confirms. */
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
 * Simulate Cloudflare's push webhook: each build-list read seeds a settled build for the
 * repository's current head commit, once per commit, ending in `outcome.next` (default success).
 * A `fail` build carries a log naming the failure.
 */
function pushBuilds(cloudflare, github, repo, outcome = { next: 'success' }) {
  return (opts) => {
    const real = makeApi(opts);
    return {
      ...real,
      async listBuildsForWorker(tag) {
        const headSha = github.state.gitObjects.get(`${repo.owner}/${repo.repo}`)?.refs.get(`heads/${repo.defaultBranch}`);
        const seen = [...cloudflare.state.builds.values()].some((b) => b.build_trigger_metadata?.commit_hash === headSha);
        if (headSha && !seen) {
          const uuid = `push-build-${cloudflare.state.builds.size + 1}`;
          cloudflare.state.builds.set(uuid, {
            build_uuid: uuid,
            status: 'stopped',
            build_outcome: outcome.next,
            created_on: new Date(Date.now() + cloudflare.state.builds.size).toISOString(),
            stopped_on: new Date().toISOString(),
            trigger: { external_script_id: tag },
            build_trigger_source: 'push_event',
            build_trigger_metadata: { commit_hash: headSha, commit_message: 'x', author: 'admin', branch: repo.defaultBranch },
          });
          cloudflare.state.buildLogs.set(uuid, [
            { cursor: 'c1', truncated: false, lines: [[0, 'Installing'], [1, `Build ended: ${outcome.next}, Missing script: "build"`]] },
          ]);
        }
        return real.listBuildsForWorker(tag);
      },
    };
  };
}

/** A sleepFn that settles every unsettled build as a success, the manual kick's fast-forward. */
function settleBuilds(cloudflare) {
  return async () => {
    for (const build of cloudflare.state.builds.values()) {
      if (build.status !== 'stopped') {
        build.status = 'stopped';
        build.build_outcome = 'success';
        build.stopped_on = new Date().toISOString();
      }
    }
  };
}

/** A confirm answering the domain and email gates by their messages; an omitted gate throws. */
function confirmRouting({ domain, email } = {}) {
  return async ({ message }) => {
    if (message.includes('Connect a domain')) {
      if (domain === undefined) throw new Error('the domain gate must not be asked');
      return domain;
    }
    if (message.includes('email sign-in')) {
      if (email === undefined) throw new Error('the email gate must not be asked');
      return email;
    }
    throw new Error(`unrecognized confirm: ${message}`);
  };
}

const mustNotBeCalled = (label) => async () => {
  throw new Error(`${label} must not be called on this path`);
};

/** Run chapter 2 in process with the seams every case here needs; `overrides` wins. */
async function run(siteId, dir, overrides = {}) {
  const logs = [];
  const promise = runChapter2({
    siteId,
    record: await loadSite(siteId),
    dir,
    args: { yes: false },
    log: (line) => logs.push(line),
    dryRun: false,
    openBrowser: oauthBrowser(),
    confirm: confirmRouting({ domain: true, email: false }),
    text: async () => DOMAIN,
    promptSecretFn: async () => 'pasted-token',
    fetchImpl: alwaysMatchingFetch(),
    resolve: () => {
      throw new Error('no DNS read is expected on this path');
    },
    env: {},
    argv: [],
    isTTY: false,
    stdinIsTTY: false,
    pollIntervalMs: 0,
    maxPollAttempts: 5,
    ...overrides,
  });
  return { logs, promise };
}

/**
 * Every reconcile commit on the default branch, newest first, each with its files decoded. A
 * commit whose ref update was refused never joins the branch, so it is not counted.
 */
function reconcileCommits(github, repo) {
  const entry = github.state.gitObjects.get(`${repo.owner}/${repo.repo}`);
  const onBranch = [];
  for (let sha = entry.refs.get(`heads/${repo.defaultBranch}`); sha; sha = entry.commits.get(sha)?.parents?.[0]) {
    onBranch.push(entry.commits.get(sha));
  }
  return onBranch
    .filter((commit) => commit.message === RECONCILE_COMMIT_MESSAGE)
    .map((commit) => {
      const files = {};
      for (const item of entry.trees.get(commit.tree)) {
        files[item.path] = Buffer.from(entry.blobs.get(item.sha), 'base64').toString('utf8');
      }
      return { sha: commit.sha, files };
    });
}

/** The local build and deploy calls the recording bin saw. */
async function localBuildsAndDeploys(bin) {
  return (await bin.invocations()).filter((inv) => inv.argv.includes('deploy') || inv.argv.join(' ').includes('run build'));
}

/** The manual build kicks the fake Cloudflare saw. */
function kicks(cloudflare) {
  return cloudflare.requests.filter((r) => r.method === 'POST' && r.path.endsWith(`/builds/triggers/${TRIGGER_UUID}/builds`));
}

// --- The cutover through Workers Builds -------------------------------------------------------

test('Builds cutover: the origin reaches the repository in one reconcile commit, Builds deploys it, and nothing deploys locally', async (t) => {
  await freshStateDir(t);
  const dir = await scaffoldDir(t);
  const { cloudflare, github, bin } = await setupFakes(t);
  const repo = await seedRepo(github, dir);
  await seedBuildsSite('builds-cutover', dir, repo);

  const { promise } = await run('builds-cutover', dir, { makeApiFn: pushBuilds(cloudflare, github, repo) });
  const outcome = await promise;

  assert.equal(outcome.outcome, 'paid-plan-declined');
  const commits = reconcileCommits(github, repo);
  assert.equal(commits.length, 1, 'one reconcile commit');
  assert.match(commits[0].files['wrangler.jsonc'], new RegExp(`"PUBLIC_ORIGIN": "https://${DOMAIN}"`));
  const watched = [...cloudflare.state.builds.values()].filter((b) => b.build_trigger_metadata.commit_hash === commits[0].sha);
  assert.equal(watched.length, 1, 'a build for that commit');
  assert.ok(
    cloudflare.requests.some((r) => r.method === 'GET' && r.path.includes(`/builds/workers/${WORKER_TAG}/builds`)),
    'the build list was read to find it',
  );
  assert.deepEqual(await localBuildsAndDeploys(bin), [], 'no local build or deploy');
  const state = await loadSite('builds-cutover');
  assert.equal(typeof state.cloudflare.domainLiveAt, 'string');
  assert.equal(state.cloudflare.buildsDeployedHash, await reconciledConfigHash(dir));
  assert.equal(state.cloudflare.buildsReconciledHash, await reconciledConfigHash(dir));
});

test('Builds email: the sender reaches the repository, Builds deploys it, and only then is emailFrom saved', async (t) => {
  await freshStateDir(t);
  const dir = await scaffoldDir(t);
  const { cloudflare, github, bin } = await setupFakes(t);
  const repo = await seedRepo(github, dir);
  const zone = await seedZone(dir);
  await seedBuildsSite('builds-email', dir, repo, {
    cloudflare: { domain: DOMAIN, ...zone, alreadyActive: true, domainLiveAt: '2026-11-01T00:00:00.000Z', emailDeclinedAt: '2026-11-01T00:00:00.000Z' },
  });

  // A terminal on both ends, so the re-offer can ask.
  const { promise } = await run('builds-email', dir, {
    isTTY: true,
    stdinIsTTY: true,
    confirm: confirmRouting({ email: true }),
    makeApiFn: pushBuilds(cloudflare, github, repo),
  });
  const outcome = await promise;

  assert.equal(outcome.outcome, 'email-live');
  const commits = reconcileCommits(github, repo);
  assert.equal(commits.length, 1);
  assert.match(commits[0].files['src/theme/cairn.config.ts'], new RegExp(`from: 'no-reply@${DOMAIN}'`));
  assert.equal(
    [...cloudflare.state.builds.values()].filter((b) => b.build_trigger_metadata.commit_hash === commits[0].sha).length,
    1,
  );
  assert.deepEqual(await localBuildsAndDeploys(bin), []);
  assert.equal((await loadSite('builds-email')).cloudflare.emailFrom, `no-reply@${DOMAIN}`);
});

test('Builds domain then email in one run: two reconcile commits, two watched builds, no local deploy', async (t) => {
  await freshStateDir(t);
  const dir = await scaffoldDir(t);
  const { cloudflare, github, bin } = await setupFakes(t);
  const repo = await seedRepo(github, dir);
  await seedBuildsSite('builds-both', dir, repo);
  const browser = oauthBrowser();

  const { promise } = await run('builds-both', dir, {
    confirm: confirmRouting({ domain: true, email: true }),
    openBrowser: browser,
    makeApiFn: pushBuilds(cloudflare, github, repo),
  });
  const outcome = await promise;

  assert.equal(outcome.outcome, 'email-live');
  const commits = reconcileCommits(github, repo);
  assert.equal(commits.length, 2, 'one commit for the origin, one for the sender');
  for (const commit of commits) {
    const builds = [...cloudflare.state.builds.values()].filter((b) => b.build_trigger_metadata.commit_hash === commit.sha);
    assert.equal(builds.length, 1, `a watched build for ${commit.sha}`);
    assert.equal(builds[0].build_outcome, 'success');
  }
  assert.equal(browser.trips.count, 2, 'one sign-in per commit');
  assert.deepEqual(await localBuildsAndDeploys(bin), []);
  assert.deepEqual(kicks(cloudflare), [], 'each commit was found by its push build, never kicked');
});

test('Builds cutover: a failed build throws the committed form of cutover-deploy-failed, keeps the domain on disk, and a re-run kicks and watches one build', async (t) => {
  await freshStateDir(t);
  const dir = await scaffoldDir(t);
  const { cloudflare, github } = await setupFakes(t);
  const repo = await seedRepo(github, dir);
  await seedBuildsSite('builds-cutover-fail', dir, repo);

  const failing = await run('builds-cutover-fail', dir, { makeApiFn: pushBuilds(cloudflare, github, repo, { next: 'fail' }) });
  const err = await failing.promise.then(
    () => assert.fail('the run should have thrown'),
    (error) => error,
  );

  assert.match(err.message, /Your repository now names your domain/);
  assert.match(err.message, /Missing script: "build"/, 'the build log tail is carried');
  assert.doesNotMatch(err.message, /restored/);
  assert.equal(failing.logs.some((line) => line.includes('restored')), false, 'nothing claims a restore');
  assert.match(await readFile(path.join(dir, 'wrangler.jsonc'), 'utf8'), new RegExp(`https://${DOMAIN}`));
  const afterFail = await loadSite('builds-cutover-fail');
  assert.equal(afterFail.cloudflare.buildsReconciledHash, await reconciledConfigHash(dir));
  assert.equal(afterFail.cloudflare.buildsDeployedHash, undefined);

  const rerunBrowser = oauthBrowser();
  const rerun = await run('builds-cutover-fail', dir, { openBrowser: rerunBrowser, sleepFn: settleBuilds(cloudflare) });
  assert.equal((await rerun.promise).outcome, 'paid-plan-declined');
  assert.equal(rerunBrowser.trips.count, 0, 'the hash gate skips the sign-in');
  assert.equal(kicks(cloudflare).length, 1, 'the re-run kicks exactly one build');
  assert.equal(reconcileCommits(github, repo).length, 1, 'and commits nothing new');
  const state = await loadSite('builds-cutover-fail');
  assert.equal(state.cloudflare.buildsDeployedHash, await reconciledConfigHash(dir));
  assert.equal(typeof state.cloudflare.domainLiveAt, 'string');
});

test('Builds cutover: a reconcile refused before the commit lands restores the origin on disk, and the row says so', async (t) => {
  await freshStateDir(t);
  const dir = await scaffoldDir(t);
  const { cloudflare, github, bin } = await setupFakes(t);
  const repo = await seedRepo(github, dir);
  await seedBuildsSite('builds-cutover-refused', dir, repo);
  github.failNext('refs-update', 422, { message: 'Update is not a fast forward' });

  const { promise } = await run('builds-cutover-refused', dir, { makeApiFn: pushBuilds(cloudflare, github, repo) });
  const err = await promise.then(
    () => assert.fail('the run should have thrown'),
    (error) => error,
  );

  assert.match(err.message, /Committing your site's new address/);
  assert.match(err.message, /restored your site's address on disk/);
  assert.equal(await readFile(path.join(dir, 'wrangler.jsonc'), 'utf8'), WRANGLER_CONTENT, 'the origin on disk is back');
  assert.deepEqual(await localBuildsAndDeploys(bin), []);
  assert.equal(cloudflare.state.builds.size, 0, 'no build was watched');
});

test('Builds cutover: the repository carrying an edit this checkout lacks refuses the commit, names the file, and restores the origin', async (t) => {
  await freshStateDir(t);
  const dir = await scaffoldDir(t);
  const { cloudflare, github } = await setupFakes(t);
  // The repository's cairn.config.ts carries one line the checkout does not.
  const repoDir = await scaffoldDir(t, { cairnConfig: `${CAIRN_CONFIG_CONTENT}export const editedInGithub = true;\n` });
  const repo = await seedRepo(github, repoDir);
  await seedBuildsSite('builds-guard', dir, repo);

  const { promise } = await run('builds-guard', dir, { makeApiFn: pushBuilds(cloudflare, github, repo) });
  const err = await promise.then(
    () => assert.fail('the run should have thrown'),
    (error) => error,
  );

  assert.match(err.message, /Your repository has changes to src\/theme\/cairn\.config\.ts that this checkout does not have/);
  assert.doesNotMatch(err.message, /changes to wrangler\.jsonc/, 'the origin is a tool-owned value, so wrangler.jsonc is not named');
  assert.match(err.message, /git pull/);
  assert.equal(reconcileCommits(github, repo).length, 0, 'no commit landed');
  assert.equal(await readFile(path.join(dir, 'wrangler.jsonc'), 'utf8'), WRANGLER_CONTENT, 'the origin on disk is restored');
});

test('Builds cutover under --yes parks at the reconcile, writes no step, and commits or deploys nothing', async (t) => {
  await freshStateDir(t);
  const dir = await scaffoldDir(t);
  const { cloudflare, github, bin } = await setupFakes(t);
  const repo = await seedRepo(github, dir);
  const zone = await seedZone(dir);
  await seedBuildsSite('builds-yes-park', dir, repo, {
    step: 'delegated',
    cloudflare: { domain: DOMAIN, ...zone, alreadyActive: true, carryOver: { outcome: 'not-needed' } },
  });

  const { logs, promise } = await run('builds-yes-park', dir, {
    args: { yes: true },
    confirm: mustNotBeCalled('confirm'),
    env: { CAIRN_CF_API_TOKEN: 'env-token' },
    openBrowser: mustNotBeCalled('openBrowser'),
  });
  const outcome = await promise;

  assert.equal(outcome.outcome, 'builds-reconcile-parked');
  assert.equal(logs.filter((line) => line.includes('This run is unattended (--yes)')).length, 1, 'the park prints once');
  assert.equal((await loadSite('builds-yes-park')).step, 'delegated');
  assert.equal(reconcileCommits(github, repo).length, 0);
  assert.deepEqual(await localBuildsAndDeploys(bin), []);
  assert.deepEqual(kicks(cloudflare), []);
});

// --- Crash points: each seeds the record a run that stopped there leaves --------------------------

/**
 * Seed a connected record at `delegated` whose checkout already names the domain and whose
 * repository already carries it, the shape a cutover leaves once its commit landed.
 */
async function seedCommittedCutover(t, siteId, { reconciled, deployed }) {
  const dir = await scaffoldDir(t);
  const fakes = await setupFakes(t);
  const repo = await seedRepo(fakes.github, dir);
  const zone = await seedZone(dir);
  const wrangler = path.join(dir, 'wrangler.jsonc');
  const config = path.join(dir, CONFIG_PATH);
  await writeFile(wrangler, (await readFile(wrangler, 'utf8')).replace(WORKERS_DEV_URL, `https://${DOMAIN}`));
  await writeFile(config, (await readFile(config, 'utf8')).replace(WORKERS_DEV_URL, `https://${DOMAIN}`));
  await reconcileRepo({ record: { repo }, dir, userToken: 'fake-user-token' });
  const hash = await reconciledConfigHash(dir);
  await seedBuildsSite(siteId, dir, repo, {
    step: 'delegated',
    cloudflare: {
      domain: DOMAIN,
      ...zone,
      alreadyActive: true,
      carryOver: { outcome: 'not-needed' },
      ...(reconciled ? { buildsReconciledHash: hash } : { buildsReconciledHash: 'hash-before-the-cutover' }),
      ...(deployed ? { buildsDeployedHash: hash } : {}),
    },
  });
  return { dir, repo, hash, ...fakes };
}

test('crash after the commit landed and before the hash write: the re-run finds the repository matching and kicks one build', async (t) => {
  await freshStateDir(t);
  const { dir, repo, hash, cloudflare, github } = await seedCommittedCutover(t, 'crash-before-hash', { reconciled: false });

  const { promise } = await run('crash-before-hash', dir, { sleepFn: settleBuilds(cloudflare) });
  assert.equal((await promise).outcome, 'paid-plan-declined');

  assert.equal(reconcileCommits(github, repo).length, 1, 'the diff found the repository matching and committed nothing');
  assert.equal(kicks(cloudflare).length, 1);
  const state = await loadSite('crash-before-hash');
  assert.equal(state.cloudflare.buildsReconciledHash, hash);
  assert.equal(state.cloudflare.buildsDeployedHash, hash);
});

test('crash after the hash write: the re-run skips the sign-in and kicks one build', async (t) => {
  await freshStateDir(t);
  const { dir, hash, cloudflare } = await seedCommittedCutover(t, 'crash-after-hash', { reconciled: true });

  const browser = oauthBrowser();
  const { promise } = await run('crash-after-hash', dir, { openBrowser: browser, sleepFn: settleBuilds(cloudflare) });
  assert.equal((await promise).outcome, 'paid-plan-declined');

  assert.equal(browser.trips.count, 0, 'the hash gate skips the sign-in');
  assert.equal(kicks(cloudflare).length, 1);
  assert.equal((await loadSite('crash-after-hash')).cloudflare.buildsDeployedHash, hash);
});

test('crash after a watched success and before the step write: the re-run kicks nothing and reaches domain-live', async (t) => {
  await freshStateDir(t);
  const { dir, cloudflare } = await seedCommittedCutover(t, 'crash-after-deploy', { reconciled: true, deployed: true });

  const browser = oauthBrowser();
  const { logs, promise } = await run('crash-after-deploy', dir, { openBrowser: browser });
  assert.equal((await promise).outcome, 'paid-plan-declined');

  assert.equal(browser.trips.count, 0, 'the hash gate skips the sign-in');
  assert.deepEqual(kicks(cloudflare), []);
  assert.equal(cloudflare.state.builds.size, 0, 'no build was watched');
  assert.ok(logs.some((line) => line.includes(`${DOMAIN} is now live`)));
  assert.equal(typeof (await loadSite('crash-after-deploy')).cloudflare.domainLiveAt, 'string');
});

test('#202 on the Builds path: a run that stopped before the sender commit landed commits it on the re-run, then saves emailFrom', async (t) => {
  await freshStateDir(t);
  const dir = await scaffoldDir(t);
  const { cloudflare, github, bin } = await setupFakes(t);
  const repo = await seedRepo(github, dir);
  const zone = await seedZone(dir);
  await seedBuildsSite('builds-sender-crash', dir, repo, {
    step: 'email-onboarded',
    cloudflare: {
      domain: DOMAIN,
      ...zone,
      alreadyActive: true,
      domainLiveAt: '2026-11-01T00:00:00.000Z',
      emailOnboardedAt: '2026-11-01T00:00:00.000Z',
      apiToken: 'saved-token',
    },
  });
  github.failNext('refs-update', 422, { message: 'Update is not a fast forward' });

  const first = await run('builds-sender-crash', dir, { makeApiFn: pushBuilds(cloudflare, github, repo) });
  await assert.rejects(first.promise);
  assert.match(await readFile(path.join(dir, CONFIG_PATH), 'utf8'), new RegExp(`no-reply@${DOMAIN}`), 'the address is written');
  assert.equal((await loadSite('builds-sender-crash')).cloudflare.emailFrom, undefined, 'and not yet saved');

  const rerun = await run('builds-sender-crash', dir, { makeApiFn: pushBuilds(cloudflare, github, repo) });
  assert.equal((await rerun.promise).outcome, 'email-live');

  const commits = reconcileCommits(github, repo);
  assert.equal(commits.length, 1, 'the re-run commits the sender');
  assert.match(commits[0].files['src/theme/cairn.config.ts'], new RegExp(`no-reply@${DOMAIN}`));
  assert.equal(cloudflare.state.builds.size, 1, 'one build watched');
  assert.deepEqual(await localBuildsAndDeploys(bin), []);
  assert.equal((await loadSite('builds-sender-crash')).cloudflare.emailFrom, `no-reply@${DOMAIN}`);
});

// --- The effective step of a record entering from a chapter 3 terminal step --------------------

test('effective step: no domain at builds-live asks the domain question first', async (t) => {
  await freshStateDir(t);
  const dir = await scaffoldDir(t);
  const { github } = await setupFakes(t);
  const repo = await seedRepo(github, dir);
  await seedBuildsSite('effective-live', dir, repo);

  const { logs, promise } = await run('effective-live', dir, { confirm: confirmRouting({ domain: false }) });
  assert.equal((await promise).outcome, 'admission-declined');
  assert.equal(logs[0], 'Connect your domain', `the domain admission title prints first, got: ${logs.join('\n')}`);
});

/**
 * Seed a record at `builds-connect-declined` with no Builds connection, its domain partway: the
 * shape an earlier `--connect` mid chapter 2 strands.
 */
async function seedStrandedDomain(t, siteId, extra) {
  const dir = await scaffoldDir(t);
  const fakes = await setupFakes(t);
  const zone = await seedZone(dir);
  await saveSite(siteId, {
    name: 'Stranded Domain Site',
    dir,
    step: 'builds-connect-declined',
    ownerEmail: 'owner@example.com',
    github: { appSlug: 'cairn-stranded', installationId: 1 },
    cloudflare: { accountId: 'acct-1', url: WORKERS_DEV_URL, workerName: WORKER_NAME, domain: DOMAIN, ...zone, ...extra },
  });
  return { dir, ...fakes };
}

test('effective step: a domain with its carry-over saved resumes at delegation, never re-asking admission or re-reading records', async (t) => {
  await freshStateDir(t);
  const { dir, cloudflare, bin } = await seedStrandedDomain(t, 'effective-carried', {
    alreadyActive: true,
    carryOver: { outcome: 'not-needed' },
  });

  const { logs, promise } = await run('effective-carried', dir, { confirm: confirmRouting({ email: false }) });
  assert.equal((await promise).outcome, 'paid-plan-declined');

  assert.equal(logs.includes('Connect your domain'), false, 'no admission title');
  assert.equal(logs.includes('Copy your current DNS records'), false, 'no records probe');
  const attaches = cloudflare.requests.filter((r) => r.method === 'PUT' && r.path.includes('/workers/domains'));
  assert.equal(attaches.length, 1, 'the attach call');
  assert.equal((await localBuildsAndDeploys(bin)).filter((inv) => inv.argv.includes('deploy')).length, 1, 'the local cutover deploys once');
  const state = await loadSite('effective-carried');
  assert.equal(typeof state.cloudflare.buildsDeclinedAt, 'string', 'the first step write records the Builds decline');
});

test('effective step: a domain with no carry-over re-runs it from the zone, reading it before any write', async (t) => {
  await freshStateDir(t);
  const { dir, cloudflare } = await seedStrandedDomain(t, 'effective-zone', { alreadyActive: false });
  const requestsBefore = cloudflare.requests.length;
  let recordsRead = 0;
  const absent = async () => {
    throw Object.assign(new Error('absent'), { code: 'ENODATA' });
  };

  // The carry-over gate is declined, so this run reads the zone's records and writes nothing.
  const { logs, promise } = await run('effective-zone', dir, {
    confirm: async () => false,
    resolve: () => {
      recordsRead += 1;
      return {
        resolveNs: async () => [],
        resolve4: absent,
        resolve6: absent,
        resolveMx: absent,
        resolveTxt: absent,
        resolveCaa: absent,
        resolveCname: absent,
      };
    },
    resolveNs: async () => [],
  });
  assert.equal((await promise).outcome, 'carry-over-declined');

  assert.equal(logs.includes('Connect your domain'), false, 'no admission title');
  assert.ok(logs.includes('Copy your current DNS records'), 'the carry-over runs again');
  assert.ok(recordsRead > 0, 'the zone records were read');
  const writes = cloudflare.requests.slice(requestsBefore).filter((r) => r.method !== 'GET');
  assert.deepEqual(writes, [], 'nothing was written: no zone create and no record copied');
});

test('effective step: a domain that went live asks the email question first', async (t) => {
  await freshStateDir(t);
  const dir = await scaffoldDir(t);
  const { github, cloudflare } = await setupFakes(t);
  const repo = await seedRepo(github, dir);
  const zone = await seedZone(dir);
  await seedBuildsSite('effective-domain-live', dir, repo, {
    cloudflare: { domain: DOMAIN, ...zone, alreadyActive: true, domainLiveAt: '2026-11-01T00:00:00.000Z' },
  });
  const asked = [];

  const { logs, promise } = await run('effective-domain-live', dir, {
    confirm: async ({ message }) => {
      asked.push(message);
      return false;
    },
  });
  assert.equal((await promise).outcome, 'paid-plan-declined');

  assert.deepEqual(asked, ['Turn on email sign-in for your domain now?'], 'the email admission is the first question');
  assert.equal(logs.includes('Connect your domain'), false);
  assert.equal(cloudflare.requests.some((r) => r.method === 'PUT' && r.path.includes('/workers/domains')), false, 'no cutover');
});

test('builds-connect-declined with no domain: a domain yes runs the local cutover once and records the Builds decline', async (t) => {
  await freshStateDir(t);
  const dir = await scaffoldDir(t);
  const { bin } = await setupFakes(t);
  await saveSite('declined-reopen', {
    name: 'Declined Reopen Site',
    dir,
    step: 'builds-connect-declined',
    ownerEmail: 'owner@example.com',
    github: { appSlug: 'cairn-declined-reopen', installationId: 1 },
    cloudflare: { accountId: 'acct-1', url: WORKERS_DEV_URL, workerName: WORKER_NAME },
  });

  const { promise } = await run('declined-reopen', dir, { confirm: confirmRouting({ domain: true, email: false }) });
  assert.equal((await promise).outcome, 'paid-plan-declined');

  const deploys = (await bin.invocations()).filter((inv) => inv.argv.includes('deploy'));
  assert.equal(deploys.length, 1, 'one local wrangler deploy');
  const state = await loadSite('declined-reopen');
  assert.equal(typeof state.cloudflare.buildsDeclinedAt, 'string');
  assert.equal(state.cloudflare.domain, DOMAIN);
});
