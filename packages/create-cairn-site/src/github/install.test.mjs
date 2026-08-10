import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startFakeGithub, pointAtFake } from '../../test/fake-github.mjs';
import { startLoopback } from './loopback.mjs';
import { installUrl, installAndAuthorize } from './install.mjs';

const githubSrcDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Generate a real RSA keypair and register it as an App in the fake, so `GET
 * /app/installations`'s JWT verification passes. The fake verifies a JWT's signature against the
 * app it names, not against any actual GitHub App, so a locally generated keypair works.
 * @param {import('../../test/fake-github.mjs').FakeGithub} github the running fake
 * @param {{ id: number, clientId: string, callbackUrls?: string[] }} input the app's fixed fields
 * @returns {string} the PEM-encoded private key to sign JWTs with
 */
function registerFakeApp(github, { id, clientId, callbackUrls = [] }) {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
  });
  github.state.apps.push({ id, client_id: clientId, callback_urls: callbackUrls, _publicKeyPem: publicKey });
  return privateKey;
}

/** Pull the first `http://127.0.0.1:<port>` URL out of a captured log line array. */
function extractLoopbackUrl(logs) {
  for (const line of logs) {
    const match = line.match(/(http:\/\/127\.0\.0\.1:\d+)/);
    if (match) return match[1];
  }
  throw new Error(`no loopback URL found in the captured log lines: ${JSON.stringify(logs)}`);
}

test('installUrl: builds the app installations/new URL under webBase', () => {
  process.env.CAIRN_GITHUB_WEB_BASE = 'http://127.0.0.1:9999';
  try {
    assert.equal(installUrl('alpine-club-cms-1'), 'http://127.0.0.1:9999/apps/alpine-club-cms-1/installations/new');
  } finally {
    delete process.env.CAIRN_GITHUB_WEB_BASE;
  }
});

test('installAndAuthorize: a covering installation already present skips the install page and re-authorizes', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);
  const pem = registerFakeApp(github, { id: 1, clientId: 'fake-client-1', callbackUrls: ['http://127.0.0.1/callback'] });
  github.state.installations.push({ id: 42, account: { login: 'fake-owner' } });

  const opened = [];
  const logs = [];
  const result = await installAndAuthorize({
    appId: 1,
    appSlug: 'alpine-club-cms-1',
    appName: 'Alpine Club CMS',
    clientId: 'fake-client-1',
    clientSecret: 'fake-secret',
    pem,
    owner: 'fake-owner',
    ownerType: 'user',
    dir: '/tmp/alpine-club',
    openBrowser: async (url) => {
      opened.push(url);
      setTimeout(() => {
        fetch(url).catch(() => {});
      }, 0);
    },
    log: (line) => logs.push(line),
  });

  assert.equal(result.userToken, 'fake-user-token');
  assert.equal(result.installationId, 42);
  assert.equal(opened.length, 1);
  assert.ok(
    opened.every((url) => !url.includes('/installations/new')),
    'a resumed run must never open the install page',
  );
});

test('installAndAuthorize: the callback path installs, exchanges the code, and returns the token and id', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);
  const pem = registerFakeApp(github, { id: 1, clientId: 'fake-client-1' });

  const opened = [];
  const logs = [];
  const result = await installAndAuthorize({
    appId: 1,
    appSlug: 'alpine-club-cms-1',
    appName: 'Alpine Club CMS',
    clientId: 'fake-client-1',
    clientSecret: 'fake-secret',
    pem,
    owner: 'fake-owner',
    ownerType: 'user',
    dir: '/tmp/alpine-club',
    openBrowser: async (url) => {
      opened.push(url);
      // Mirror request_oauth_on_install directly: the fake's install page is a stand-in with no
      // real redirect, so push the installation row GitHub would have created, then hit this
      // run's own loopback /callback the way GitHub's install redirect would, with the loopback
      // base pulled from the heartbeat log line printed just after this call returns.
      setTimeout(() => {
        github.state.installations.push({ id: 99, account: { login: 'fake-owner' } });
        const loopbackUrl = extractLoopbackUrl(logs);
        fetch(`${loopbackUrl}/callback?code=fake-code&installation_id=99`).catch(() => {});
      }, 0);
    },
    log: (line) => logs.push(line),
  });

  assert.equal(opened.length, 1);
  assert.match(opened[0], /\/installations\/new$/);
  assert.equal(result.userToken, 'fake-user-token');
  assert.equal(result.installationId, 99);
});

test('installAndAuthorize: an org owner with no installation ever appearing raises org-approval-pending', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);
  const pem = registerFakeApp(github, { id: 1, clientId: 'fake-client-1' });

  await assert.rejects(
    () =>
      installAndAuthorize({
        appId: 1,
        appSlug: 'alpine-club-cms-1',
        appName: 'Alpine Club CMS',
        clientId: 'fake-client-1',
        clientSecret: 'fake-secret',
        pem,
        owner: 'alpine-club',
        ownerType: 'org',
        dir: '/tmp/alpine-club',
        openBrowser: async () => {
          // Never hits the callback; both the browser wait and the poll fallback must time out.
        },
        log: () => {},
        pollIntervalMs: 10,
        maxWaitMs: 30,
      }),
    (err) => {
      assert.equal(err.catalogue.code, 'org-approval-pending');
      assert.match(err.message, /alpine-club/);
      assert.match(err.message, /Alpine Club CMS/);
      assert.match(err.message, /\/tmp\/alpine-club/);
      assert.ok(!err.message.includes('undefined'), `message must not contain "undefined": ${err.message}`);
      return true;
    },
  );
});

test('installAndAuthorize: a user owner with no installation ever appearing raises browser-step-abandoned', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);
  const pem = registerFakeApp(github, { id: 1, clientId: 'fake-client-1' });

  await assert.rejects(
    () =>
      installAndAuthorize({
        appId: 1,
        appSlug: 'alpine-club-cms-1',
        appName: 'Alpine Club CMS',
        clientId: 'fake-client-1',
        clientSecret: 'fake-secret',
        pem,
        owner: 'fake-owner',
        ownerType: 'user',
        dir: '/tmp/alpine-club',
        openBrowser: async () => {},
        log: () => {},
        pollIntervalMs: 10,
        maxWaitMs: 30,
      }),
    (err) => {
      assert.equal(err.catalogue.code, 'browser-step-abandoned');
      assert.match(err.message, /installation was never confirmed/);
      assert.match(err.message, /saved its progress/);
      assert.match(err.message, /Alpine Club CMS/);
      assert.match(err.message, /\/tmp\/alpine-club/);
      return true;
    },
  );
});

test('installAndAuthorize: an installation appearing during the post-timeout poll still resolves via reauthorize', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);
  const pem = registerFakeApp(github, { id: 1, clientId: 'fake-client-1', callbackUrls: ['http://127.0.0.1/callback'] });

  const opened = [];
  setTimeout(() => {
    github.state.installations.push({ id: 7, account: { login: 'fake-owner' } });
  }, 55);

  const result = await installAndAuthorize({
    appId: 1,
    appSlug: 'alpine-club-cms-1',
    appName: 'Alpine Club CMS',
    clientId: 'fake-client-1',
    clientSecret: 'fake-secret',
    pem,
    owner: 'fake-owner',
    ownerType: 'user',
    dir: '/tmp/alpine-club',
    openBrowser: async (url) => {
      opened.push(url);
      if (url.includes('/installations/new')) return; // never completes the install callback
      setTimeout(() => {
        fetch(url).catch(() => {});
      }, 0); // the later reauthorize trip does complete
    },
    log: () => {},
    pollIntervalMs: 10,
    maxWaitMs: 40,
  });

  assert.equal(result.userToken, 'fake-user-token');
  assert.equal(result.installationId, 7);
  assert.equal(opened.length, 2);
});

test('installAndAuthorize: the post-timeout poll fallback logs a heartbeat on entry and again every ~10 polls', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);
  const pem = registerFakeApp(github, { id: 1, clientId: 'fake-client-1', callbackUrls: ['http://127.0.0.1/callback'] });

  // Each poll signs a fresh App JWT (real RSA, ~10-20ms) and round-trips it, which dominates a
  // near-zero pollIntervalMs. maxWaitMs below gates BOTH the initial browser-callback wait (which
  // always times out here, since openBrowser never completes it) and the fallback poll's own
  // budget, so the installation is scheduled to appear only after the browser wait has already
  // elapsed, comfortably inside the fallback's own window, with enough polls (well over 10)
  // happening before it is found.
  setTimeout(() => {
    github.state.installations.push({ id: 7, account: { login: 'fake-owner' } });
  }, 1300);

  const logs = [];
  const result = await installAndAuthorize({
    appId: 1,
    appSlug: 'alpine-club-cms-1',
    appName: 'Alpine Club CMS',
    clientId: 'fake-client-1',
    clientSecret: 'fake-secret',
    pem,
    owner: 'fake-owner',
    ownerType: 'user',
    dir: '/tmp/alpine-club',
    openBrowser: async (url) => {
      if (url.includes('/installations/new')) return; // never completes the install callback
      setTimeout(() => {
        fetch(url).catch(() => {});
      }, 0); // the later reauthorize trip does complete
    },
    log: (line) => logs.push(line),
    pollIntervalMs: 1,
    maxWaitMs: 1000,
  });

  assert.equal(result.installationId, 7);
  const heartbeats = logs.filter((line) =>
    line.includes('Still waiting for GitHub to report the installation'),
  );
  assert.ok(
    heartbeats.length >= 2,
    `expected at least 2 heartbeat lines (entry plus at least one periodic), got ${heartbeats.length}: ${logs.join(' | ')}`,
  );
});

test('installAndAuthorize: a given loopback is reused, not closed, and its port matches the opened install callback', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);
  const pem = registerFakeApp(github, { id: 1, clientId: 'fake-client-1' });

  const loopback = await startLoopback();
  t.after(() => loopback.close());

  const opened = [];
  const result = await installAndAuthorize({
    appId: 1,
    appSlug: 'alpine-club-cms-1',
    appName: 'Alpine Club CMS',
    clientId: 'fake-client-1',
    clientSecret: 'fake-secret',
    pem,
    owner: 'fake-owner',
    ownerType: 'user',
    dir: '/tmp/alpine-club',
    loopback,
    openBrowser: async (url) => {
      opened.push(url);
      setTimeout(() => {
        github.state.installations.push({ id: 99, account: { login: 'fake-owner' } });
        fetch(`${loopback.url}/callback?code=fake-code&installation_id=99`).catch(() => {});
      }, 0);
    },
    log: () => {},
  });

  assert.equal(result.installationId, 99);
  assert.match(opened[0], /\/installations\/new$/);
  // Proof the loopback was not closed by installAndAuthorize: a second request against it still
  // gets a response (a 404 for an unmatched path) rather than a connection refusal.
  const stillOpen = await fetch(`${loopback.url}/anything`);
  assert.equal(stillOpen.status, 404);
});

test('installAndAuthorize: a JWT that fails to verify surfaces a plain Next step error, no infinite loop', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);
  registerFakeApp(github, { id: 1, clientId: 'fake-client-1' });
  const { privateKey: wrongPem } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
  });

  const start = Date.now();
  await assert.rejects(
    () =>
      installAndAuthorize({
        appId: 1,
        appSlug: 'alpine-club-cms-1',
        appName: 'Alpine Club CMS',
        clientId: 'fake-client-1',
        clientSecret: 'fake-secret',
        pem: wrongPem,
        owner: 'fake-owner',
        ownerType: 'user',
        dir: '/tmp/alpine-club',
        openBrowser: async () => {
          throw new Error('openBrowser must never be called when the JWT does not verify');
        },
        log: () => {},
      }),
    (err) => {
      assert.ok(!err.catalogue, 'a bad-credentials error is a plain Error, not a catalogue error');
      assert.match(err.message, /401/);
      assert.match(err.message, /Next step/);
      assert.match(err.message, /--start-over/);
      assert.ok(!err.message.includes('--app-id'), 'the recovery must never name a flag that does not exist');
      return true;
    },
  );
  assert.ok(Date.now() - start < 5000, 'a bad JWT must fail fast, not fall into a poll loop');
});

test('src/github/: no implementation file names the nonexistent --app-id flag', async () => {
  const nonexistentFlag = ['-', '-app-id'].join('-');
  const entries = await readdir(githubSrcDir, { withFileTypes: true });
  for (const entry of entries) {
    // Excludes this suite itself: its own assertions name the flag to prove it is gone.
    if (!entry.isFile() || entry.name.endsWith('.test.mjs')) continue;
    const content = await readFile(path.join(githubSrcDir, entry.name), 'utf8');
    assert.ok(!content.includes(nonexistentFlag), `${entry.name} must not name the nonexistent ${nonexistentFlag} flag`);
  }
});
