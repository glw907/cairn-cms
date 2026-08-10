import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { startFakeGithub } from '../../test/fake-github.mjs';
import { runGithubChapter } from './chapter.mjs';
import { loadSite } from '../state.mjs';

/**
 * Set both GitHub base-URL env seams to a fake server for the duration of a test, and register
 * their cleanup with `t.after` so a later test never inherits a closed server's URL.
 * @param {import('node:test').TestContext} t the running test's context
 * @param {{ apiBase: string, webBase: string }} github the fake server to point the seams at
 */
function pointAtFake(t, github) {
  process.env.CAIRN_GITHUB_API_BASE = github.apiBase;
  process.env.CAIRN_GITHUB_WEB_BASE = github.webBase;
  t.after(() => {
    delete process.env.CAIRN_GITHUB_API_BASE;
    delete process.env.CAIRN_GITHUB_WEB_BASE;
  });
}

/**
 * Point CAIRN_STATE_DIR at a fresh temporary directory for the duration of one test.
 * @param {import('node:test').TestContext} t the running test's context
 * @returns {Promise<string>} the state directory's absolute path
 */
async function freshStateDir(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-chapter-state-'));
  process.env.CAIRN_STATE_DIR = dir;
  t.after(() => {
    delete process.env.CAIRN_STATE_DIR;
    return rm(dir, { recursive: true, force: true });
  });
  return dir;
}

/**
 * Build a fixture scaffold directory: a couple of real files, so pushScaffold has something to
 * ship and the secret-scan test has something to walk.
 * @param {import('node:test').TestContext} t the running test's context
 * @returns {Promise<string>} the fixture directory's absolute path
 */
async function fixtureScaffoldDir(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-chapter-scaffold-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await writeFile(path.join(dir, 'README.md'), '# Alpine Club\n');
  await mkdir(path.join(dir, 'posts'), { recursive: true });
  await writeFile(path.join(dir, 'posts/hello.md'), '# Hello\n');
  return dir;
}

/**
 * Build an `openBrowser` fake that drives the fake GitHub through both browser trips the happy
 * path makes: the manifest step (which opens the shared loopback's own root page) and the
 * install step (which opens GitHub's real install page and, on completion, redirects back to
 * that SAME loopback). Reusing the URL captured from the first call for the second call's
 * redirect is what proves the two steps share one loopback: if chapter.mjs ever went back to
 * giving each step its own loopback, the first one would already be closed by the time the
 * second call fires, and this callback fetch would fail instead of completing the install.
 * @param {import('../../test/fake-github.mjs').FakeGithub} github the running fake
 * @param {{ installOwner?: string }} [options] the account login the pushed installation covers
 * @returns {{ openBrowser: Function, opened: string[] }} the fake and every URL it opened
 */
function makeHappyPathOpenBrowser(github, { installOwner = 'fake-owner' } = {}) {
  const opened = [];
  let manifestLoopbackUrl;
  const openBrowser = async (url) => {
    opened.push(url);
    if (opened.length === 1) {
      manifestLoopbackUrl = url;
      setTimeout(() => {
        fetch(`${url}/manifest?code=goodcode`).catch(() => {});
      }, 0);
      return;
    }
    setTimeout(() => {
      github.state.installations.push({ id: 99, account: { login: installOwner } });
      fetch(`${manifestLoopbackUrl}/callback?code=fake-code&installation_id=99`).catch(() => {});
    }, 0);
  };
  return { openBrowser, opened };
}

test('runGithubChapter: the happy path returns pushed, walks the state hops, and reuses one loopback for both browser trips', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);

  const { openBrowser, opened } = makeHappyPathOpenBrowser(github);
  const logs = [];
  const outcome = await runGithubChapter({
    siteId: 'alpine-club-000000',
    siteName: 'Alpine Club',
    dir,
    flags: { yes: true, github: true },
    log: (line) => logs.push(line),
    dryRun: false,
    openBrowser,
  });

  assert.equal(outcome, 'pushed');
  assert.equal(github.requests.length > 0, true);

  const state = await loadSite('alpine-club-000000');
  assert.equal(state.step, 'pushed');
  assert.equal(typeof state.github.appId, 'number', 'the App id from hop 1 must survive to the final hop');
  assert.ok(state.github.pem.includes('PRIVATE KEY'), 'the pem from hop 1 must survive to the final hop');
  assert.equal(typeof state.github.installationId, 'number', 'the installation id from hop 2 must survive');
  assert.equal(typeof state.github.repo.repo, 'string', 'the repo from hop 3 must survive');

  // The shared-loopback pin: the install step's own heartbeat line names the loopback it is
  // listening on, independent of what this test's openBrowser fake assumed. It must be the same
  // port the manifest step opened, proving chapter.mjs passed the SAME loopback to both flows.
  const heartbeat = logs.find((line) => line.includes('This machine is listening for'));
  assert.ok(heartbeat, 'expected the install step\'s loopback heartbeat log line');
  const installLoopbackUrl = heartbeat.match(/http:\/\/127\.0\.0\.1:\d+/)[0];
  assert.equal(new URL(installLoopbackUrl).port, new URL(opened[0]).port);
});

test('runGithubChapter: the state record contains the pem but never the user access token', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);
  const stateDir = await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);

  const { openBrowser } = makeHappyPathOpenBrowser(github);
  await runGithubChapter({
    siteId: 'alpine-club-000001',
    siteName: 'Alpine Club',
    dir,
    flags: { yes: true, github: true },
    log: () => {},
    dryRun: false,
    openBrowser,
  });

  const raw = await readFile(path.join(stateDir, 'alpine-club-000001.json'), 'utf8');
  assert.ok(raw.includes('PRIVATE KEY'), 'positive control: the pem must actually be in the raw file');
  assert.ok(!raw.includes('fake-user-token'), 'the user access token must never be written to the state store');
});

test('runGithubChapter: a scan of the pushed scaffold directory finds no secret material', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);

  const { openBrowser } = makeHappyPathOpenBrowser(github);
  await runGithubChapter({
    siteId: 'alpine-club-000002',
    siteName: 'Alpine Club',
    dir,
    flags: { yes: true, github: true },
    log: () => {},
    dryRun: false,
    openBrowser,
  });

  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const content = await readFile(path.join(entry.parentPath ?? entry.path, entry.name), 'utf8');
    assert.ok(!content.includes('PRIVATE KEY'), `${entry.name} must not contain PRIVATE KEY`);
    assert.ok(!content.includes('fake-user-token'), `${entry.name} must not contain the user token`);
  }
});

test('runGithubChapter: the org branch parks when no installation ever appears', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  github.state.orgs.push({ login: 'alpine-org' });

  let calls = 0;
  const openBrowser = async (url) => {
    calls += 1;
    if (calls === 1) {
      // The manifest step completes normally; only the install page is never finished.
      setTimeout(() => {
        fetch(`${url}/manifest?code=goodcode`).catch(() => {});
      }, 0);
    }
  };

  const logs = [];
  const outcome = await runGithubChapter({
    siteId: 'alpine-org-000000',
    siteName: 'Alpine Club',
    dir,
    flags: { yes: true, github: true, org: 'alpine-org' },
    log: (line) => logs.push(line),
    dryRun: false,
    openBrowser,
    installPollIntervalMs: 10,
    installMaxWaitMs: 30,
  });

  assert.equal(outcome, 'parked');
  const state = await loadSite('alpine-org-000000');
  assert.equal(state.step, 'awaiting-org-approval');
  assert.ok(logs.some((line) => line.includes('requires an owner to approve')));
});

test('runGithubChapter: --yes without --github skips and prints a re-run line, no App or repo created', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);

  const logs = [];
  const outcome = await runGithubChapter({
    siteId: 'alpine-club-skip',
    siteName: 'Alpine Club',
    dir,
    flags: { yes: true, github: false },
    log: (line) => logs.push(line),
    dryRun: false,
    openBrowser: async () => {
      throw new Error('openBrowser must never be called when the chapter is skipped');
    },
  });

  assert.equal(outcome, 'declined');
  assert.equal(github.requests.length, 0);
  assert.ok(logs.some((line) => line.includes('--github')), 'expected a re-run line naming --github');
});

test('runGithubChapter: a dry run prints the App/repo/install action details and makes zero network calls', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);

  const logs = [];
  const outcome = await runGithubChapter({
    siteId: 'alpine-club-dry',
    siteName: 'Alpine Club',
    dir,
    flags: { yes: true, github: true },
    log: (line) => logs.push(line),
    dryRun: true,
    openBrowser: async () => {
      throw new Error('openBrowser must never be called under --dry-run');
    },
  });

  assert.equal(outcome, 'declined');
  assert.equal(github.requests.length, 0);
  assert.ok(logs.some((line) => line.includes('Create your GitHub App')));
  assert.ok(logs.some((line) => line.includes(`Create the private repository`)));
  assert.ok(logs.some((line) => line.includes('Install the App and sign in')));
});

/**
 * Register a real App in the fake, exactly as the manifest action would have, without ever
 * driving runGithubChapter through it. Every resume test needs a real, JWT-verifiable App
 * already sitting in `github.state.apps` before it can exercise install.mjs's own poll-first
 * check, which authenticates with a JWT signed by the saved pem. The portless callback URL is
 * what lets a resumed run's reauthorize trip (its own, freshly-bound loopback port) still pass
 * the fake's redirect_uri match, the same loopback leniency a real registered App relies on.
 * @param {import('../../test/fake-github.mjs').FakeGithub} github the running fake
 * @returns {Promise<object>} the fake's raw conversion response (id, slug, client_id, ...)
 */
async function seedFakeApp(github) {
  const response = await fetch(`${github.apiBase}/app-manifests/seed-code/conversions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'cairn-alpine-club', callback_urls: ['http://127.0.0.1/callback'] }),
  });
  return response.json();
}

test('runGithubChapter: resume at app-created skips the manifest action, reaching install with zero conversions hits', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);

  const appJson = await seedFakeApp(github);
  const { updateSite } = await import('../state.mjs');
  await updateSite('alpine-club-resume-app', {
    name: 'Alpine Club',
    dir,
    step: 'app-created',
    github: {
      appId: appJson.id,
      appSlug: appJson.slug,
      clientId: appJson.client_id,
      clientSecret: appJson.client_secret,
      pem: appJson.pem,
      webhookSecret: appJson.webhook_secret,
      owner: appJson.owner.login,
      ownerType: 'user',
    },
  });

  const logs = [];
  const openBrowser = async (url) => {
    logs.push(`opened ${url}`);
    setTimeout(() => {
      github.state.installations.push({ id: 99, account: { login: appJson.owner.login } });
      const heartbeat = logs.find((line) => line.includes('This machine is listening for'));
      const loopbackUrl = heartbeat.match(/http:\/\/127\.0\.0\.1:\d+/)[0];
      fetch(`${loopbackUrl}/callback?code=fake-code&installation_id=99`).catch(() => {});
    }, 0);
  };

  // seedFakeApp above already hit /conversions once, standing in for an earlier run's own
  // manifest action; only requests from THIS call onward prove (or disprove) that the resumed
  // chapter skips its own.
  const requestsBefore = github.requests.length;
  const outcome = await runGithubChapter({
    siteId: 'alpine-club-resume-app',
    siteName: 'Alpine Club',
    dir,
    flags: { yes: true, github: true },
    log: (line) => logs.push(line),
    dryRun: false,
    openBrowser,
  });

  assert.equal(outcome, 'pushed');
  const conversionsHits = github.requests.slice(requestsBefore).filter((r) => r.pathname.includes('/conversions'));
  assert.equal(conversionsHits.length, 0, 'the manifest action must never run on a resumed chapter');
});

test('runGithubChapter: resume at awaiting-org-approval, once installed, completes to pushed without opening the install page again', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);
  await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);
  github.state.orgs.push({ login: 'alpine-org' });

  const appJson = await seedFakeApp(github);
  // The org owner approved the install since the last run: the installation now exists, so
  // install.mjs's own poll-first check must find it before ever opening a browser.
  github.state.installations.push({ id: 77, account: { login: appJson.owner.login } });

  const { updateSite } = await import('../state.mjs');
  await updateSite('alpine-org-resume-park', {
    name: 'Alpine Club',
    dir,
    step: 'awaiting-org-approval',
    github: {
      appId: appJson.id,
      appSlug: appJson.slug,
      clientId: appJson.client_id,
      clientSecret: appJson.client_secret,
      pem: appJson.pem,
      webhookSecret: appJson.webhook_secret,
      owner: appJson.owner.login,
      ownerType: 'org',
    },
  });

  const opened = [];
  const openBrowser = async (url) => {
    opened.push(url);
    setTimeout(() => {
      fetch(url).catch(() => {});
    }, 0);
  };

  const outcome = await runGithubChapter({
    siteId: 'alpine-org-resume-park',
    siteName: 'Alpine Club',
    dir,
    flags: { yes: true, github: true, org: 'alpine-org' },
    log: () => {},
    dryRun: false,
    openBrowser,
  });

  assert.equal(outcome, 'pushed');
  assert.ok(
    opened.every((url) => !url.includes('installations/new')),
    'the install page must never open once an installation already exists',
  );
});

test('runGithubChapter: after a stale record is retired (the --start-over path), the same siteId runs a full fresh chapter', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);
  const stateDir = await freshStateDir(t);
  const dir = await fixtureScaffoldDir(t);

  const { updateSite, retireSite } = await import('../state.mjs');
  await updateSite('alpine-club-startover', {
    name: 'Alpine Club',
    dir,
    step: 'awaiting-org-approval',
    github: {
      appId: 1,
      appSlug: 'stale-app',
      clientId: 'stale-client',
      clientSecret: 'stale-secret',
      pem: 'STALE PEM DATA',
      owner: 'fake-owner',
      ownerType: 'org',
    },
  });

  // What bin.mjs's --start-over branch does before falling through to a fresh run: set the stale
  // record aside so it is never found (or resumed from) again.
  await retireSite('alpine-club-startover');

  const { openBrowser } = makeHappyPathOpenBrowser(github);
  const outcome = await runGithubChapter({
    siteId: 'alpine-club-startover',
    siteName: 'Alpine Club',
    dir,
    flags: { yes: true, github: true },
    log: () => {},
    dryRun: false,
    openBrowser,
  });

  assert.equal(outcome, 'pushed');
  assert.ok(
    github.requests.some((r) => r.pathname.includes('/conversions')),
    'a fresh run must hit the manifest conversions route rather than resuming the stale App',
  );

  const entries = await readdir(stateDir);
  assert.ok(
    entries.some((name) => name.startsWith('alpine-club-startover.retired-')),
    'the stale record must still exist, retired',
  );
  assert.ok(
    entries.includes('alpine-club-startover.json'),
    'a fresh record must be created under the same siteId',
  );
});

test('runGithubChapter: a store pre-check failure stops before any GitHub request', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);
  const dir = await fixtureScaffoldDir(t);

  const outDir = await mkdtemp(path.join(tmpdir(), 'cairn-chapter-blocked-'));
  const blockedStatePath = path.join(outDir, 'blocked-state');
  await writeFile(blockedStatePath, 'not a directory\n');
  process.env.CAIRN_STATE_DIR = blockedStatePath;
  t.after(() => {
    delete process.env.CAIRN_STATE_DIR;
    return rm(outDir, { recursive: true, force: true });
  });

  await assert.rejects(
    () =>
      runGithubChapter({
        siteId: 'alpine-club-blocked',
        siteName: 'Alpine Club',
        dir,
        flags: { yes: true, github: true },
        log: () => {},
        dryRun: false,
        openBrowser: async () => {
          throw new Error('openBrowser must never be called when the store pre-check fails');
        },
      }),
    (err) => {
      assert.match(err.message, /Next step/);
      return true;
    },
  );
  assert.equal(github.requests.length, 0);
});
