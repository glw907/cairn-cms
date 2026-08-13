import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { startFakeGithub, pointAtFake } from '../../test/fake-github.mjs';
import { saveSite } from '../state.mjs';
import { exchangeCode, authorizeUrl, reauthorize } from './oauth.mjs';

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

test('exchangeCode: an error other than bad_verification_code throws naming the error code and the dir, never returns undefined', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);
  github.failNext('access_token', 200, { error: 'incorrect_client_credentials' });

  await assert.rejects(
    () =>
      exchangeCode({
        clientId: 'fake-client-1',
        clientSecret: 'fake-secret',
        code: 'fake-code',
        dir: '/tmp/alpine-club',
      }),
    (err) => {
      assert.match(err.message, /incorrect_client_credentials/);
      assert.match(err.message, /\/tmp\/alpine-club/);
      assert.ok(!err.catalogue, 'an unmapped OAuth error is a plain Error, not a catalogue error');
      return true;
    },
  );
});

test('exchangeCode: a body with neither error nor access_token still throws rather than returning undefined', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);
  github.failNext('access_token', 200, {});

  await assert.rejects(
    () =>
      exchangeCode({
        clientId: 'fake-client-1',
        clientSecret: 'fake-secret',
        code: 'fake-code',
        dir: '/tmp/alpine-club',
      }),
    (err) => {
      assert.match(err.message, /no access token in the response/);
      assert.match(err.message, /\/tmp\/alpine-club/);
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

test('reauthorize: a denied consent (error=access_denied, no code) maps to builds-oauth-denied, not a raw Error', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);
  github.state.apps.push({ id: 1, client_id: 'fake-client-1', callback_urls: ['http://127.0.0.1/callback'] });
  github.state.denyNextAuthorize = true;

  await assert.rejects(
    () =>
      reauthorize({
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
      }),
    (err) => {
      assert.equal(err.catalogue.code, 'builds-oauth-denied');
      assert.equal(err.catalogue.kind, 'act');
      assert.match(err.message, /\/tmp\/alpine-club/);
      return true;
    },
  );
});

test('reauthorize: a minted token never lands in a site state file, and the sweep is falsifiable', async (t) => {
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

  const siteId = 'alpine-club-abc123';
  const record = {
    dir: '/tmp/alpine-club',
    github: { clientId: 'fake-client-1', clientSecret: 'fake-secret', installationId: 42 },
  };
  await saveSite(siteId, record);
  const filePath = path.join(stateDir, `${siteId}.json`);
  const TOKEN = 'fake-user-token';

  // Falsifiability proof first: a decoy write carrying the exact token string IS caught by the
  // same sweep the real check below runs, so a clean result afterward is not just an unreachable
  // assertion. Restore the clean record once the decoy is confirmed detectable.
  await writeFile(filePath, `${await readFile(filePath, 'utf8')}// decoy: ${TOKEN}\n`);
  assert.ok((await readFile(filePath, 'utf8')).includes(TOKEN), 'the sweep must be able to detect the token when present');
  await saveSite(siteId, record);

  const token = await reauthorize({
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
  assert.equal(token, TOKEN);

  const bytes = await readFile(filePath, 'utf8');
  assert.ok(!bytes.includes(TOKEN), `the token must never land in the site state file, got: ${bytes}`);
});
