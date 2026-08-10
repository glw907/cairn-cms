import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { startFakeGithub } from '../../test/fake-github.mjs';
import { exchangeCode, authorizeUrl, reauthorize } from './oauth.mjs';

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

test('exchangeCode: the happy path returns the access token', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);

  const token = await exchangeCode({
    clientId: 'fake-client-1',
    clientSecret: 'fake-secret',
    code: 'fake-code',
    redirectUri: 'http://127.0.0.1:9999/callback',
    dir: '/tmp/alpine-club',
  });
  assert.equal(token, 'fake-user-token');
});

test('exchangeCode: bad_verification_code raises code-expired with the passed dir, no literal undefined', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);
  github.failNext('access_token', 200, { error: 'bad_verification_code' });

  await assert.rejects(
    () =>
      exchangeCode({
        clientId: 'fake-client-1',
        clientSecret: 'fake-secret',
        code: 'stale-code',
        dir: '/tmp/alpine-club',
      }),
    (err) => {
      assert.equal(err.catalogue.code, 'code-expired');
      assert.match(err.message, /\/tmp\/alpine-club/);
      assert.ok(!err.message.includes('undefined'), `message must not contain "undefined": ${err.message}`);
      return true;
    },
  );
});

test('authorizeUrl: encodes redirect_uri and carries client_id and state', async (t) => {
  process.env.CAIRN_GITHUB_WEB_BASE = 'http://127.0.0.1:9999';
  t.after(() => delete process.env.CAIRN_GITHUB_WEB_BASE);

  const url = authorizeUrl({
    clientId: 'fake-client-1',
    redirectUri: 'http://127.0.0.1:5555/callback',
    state: 'abc123',
  });
  const parsed = new URL(url);
  assert.equal(parsed.origin, 'http://127.0.0.1:9999');
  assert.equal(parsed.pathname, '/login/oauth/authorize');
  assert.equal(parsed.searchParams.get('client_id'), 'fake-client-1');
  assert.equal(parsed.searchParams.get('redirect_uri'), 'http://127.0.0.1:5555/callback');
  assert.equal(parsed.searchParams.get('state'), 'abc123');
});

test('reauthorize: round-trips through the fake authorize redirect to the loopback and resolves with the token', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);
  // The fake's own registered App exists only via the manifest flow; a resume run does not
  // re-run that flow, so seed the fake's state directly with the App this test's redirect_uri
  // must match, using the portless loopback exception the same way a real re-authorize does.
  github.state.apps.push({ id: 1, client_id: 'fake-client-1', callback_urls: ['http://127.0.0.1/callback'] });

  const opened = [];
  const logs = [];
  const token = await reauthorize({
    clientId: 'fake-client-1',
    clientSecret: 'fake-secret',
    dir: '/tmp/alpine-club',
    appName: 'Alpine Club CMS',
    openBrowser: async (url) => {
      opened.push(url);
      // Simulate the browser following GitHub's 302 from the authorize endpoint back to the
      // loopback's /callback. Deferred to a macrotask so reauthorize has already armed
      // waitFor('/callback', ...) by the time this fires (the same race manifest.test.mjs
      // works around).
      setTimeout(() => {
        fetch(url).catch(() => {});
      }, 0);
    },
    log: (line) => logs.push(line),
  });

  assert.equal(opened.length, 1);
  assert.equal(token, 'fake-user-token');
});

test('reauthorize: a tampered state rejects with a Next step message naming the passed dir', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);

  await assert.rejects(
    () =>
      reauthorize({
        clientId: 'fake-client-1',
        clientSecret: 'fake-secret',
        dir: '/tmp/alpine-club',
        appName: 'Alpine Club CMS',
        openBrowser: async (url) => {
          // Bypass the fake's own authorize endpoint (no App is even registered here) and hit
          // the loopback callback directly, as an attacker replaying a stale or intercepted
          // link would, with a state value that does not match this run's nonce.
          const redirectUri = new URL(url).searchParams.get('redirect_uri');
          const target = new URL(redirectUri);
          target.searchParams.set('code', 'fake-code');
          target.searchParams.set('state', 'tampered-value');
          setTimeout(() => {
            fetch(target.toString()).catch(() => {});
          }, 0);
        },
        log: () => {},
      }),
    (err) => {
      assert.match(err.message, /Next step/);
      assert.match(err.message, /\/tmp\/alpine-club/);
      assert.ok(!err.catalogue, 'a tampered state is a plain Error, not a catalogue error');
      return true;
    },
  );
});

test('reauthorize: LOOPBACK_TIMEOUT raises browser-step-abandoned for step install', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);

  await assert.rejects(
    () =>
      reauthorize({
        clientId: 'fake-client-1',
        clientSecret: 'fake-secret',
        dir: '/tmp/alpine-club',
        appName: 'Alpine Club CMS',
        timeoutMs: 50,
        openBrowser: async () => {
          // Never hits the loopback; the wait must time out on its own.
        },
        log: () => {},
      }),
    (err) => {
      assert.equal(err.catalogue.code, 'browser-step-abandoned');
      assert.match(err.message, /installation was never confirmed/);
      assert.match(err.message, /\/tmp\/alpine-club/);
      return true;
    },
  );
});

test('reauthorize: writes nothing under CAIRN_STATE_DIR', async (t) => {
  const stateDir = await mkdtemp(path.join(tmpdir(), 'cairn-state-'));
  const previousStateDir = process.env.CAIRN_STATE_DIR;
  process.env.CAIRN_STATE_DIR = stateDir;
  t.after(async () => {
    if (previousStateDir === undefined) delete process.env.CAIRN_STATE_DIR;
    else process.env.CAIRN_STATE_DIR = previousStateDir;
    await rm(stateDir, { recursive: true, force: true });
  });

  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);
  github.state.apps.push({ id: 1, client_id: 'fake-client-1', callback_urls: ['http://127.0.0.1/callback'] });

  await reauthorize({
    clientId: 'fake-client-1',
    clientSecret: 'fake-secret',
    dir: '/tmp/alpine-club',
    appName: 'Alpine Club CMS',
    openBrowser: async (url) => {
      setTimeout(() => {
        fetch(url).catch(() => {});
      }, 0);
    },
    log: () => {},
  });

  assert.deepEqual(await readdir(stateDir), []);
});
