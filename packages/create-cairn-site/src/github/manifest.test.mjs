import test from 'node:test';
import assert from 'node:assert/strict';
import { startFakeGithub } from '../../test/fake-github.mjs';
import { buildManifest, manifestFormHtml, manifestTarget, runManifestFlow } from './manifest.mjs';

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

test('buildManifest: the personal branch carries exactly the base permission pair', () => {
  const manifest = buildManifest({
    appName: 'Alpine Club CMS',
    siteName: 'Alpine Club',
    ownerType: 'user',
    loopbackUrl: 'http://127.0.0.1:5555',
  });
  assert.deepEqual(manifest.default_permissions, { contents: 'write', administration: 'write' });
  assert.equal(manifest.public, false);
  assert.equal(manifest.request_oauth_on_install, true);
  assert.deepEqual(manifest.default_events, []);
  assert.equal(manifest.name, 'Alpine Club CMS');
});

test('buildManifest: the org branch adds members read', () => {
  const manifest = buildManifest({
    appName: 'Alpine Club CMS',
    siteName: 'Alpine Club',
    ownerType: 'org',
    loopbackUrl: 'http://127.0.0.1:5555',
  });
  assert.deepEqual(manifest.default_permissions, {
    contents: 'write',
    administration: 'write',
    members: 'read',
  });
});

test('buildManifest: callback_urls carries the ported loopback entry first, portless second', () => {
  const manifest = buildManifest({
    appName: 'Alpine Club CMS',
    siteName: 'Alpine Club',
    ownerType: 'user',
    loopbackUrl: 'http://127.0.0.1:5555',
  });
  assert.deepEqual(manifest.callback_urls, [
    'http://127.0.0.1:5555/callback',
    'http://127.0.0.1/callback',
  ]);
});

test('buildManifest: hook_attributes is present with active false and a non-empty url', () => {
  const manifest = buildManifest({
    appName: 'Alpine Club CMS',
    siteName: 'Alpine Club',
    ownerType: 'user',
    loopbackUrl: 'http://127.0.0.1:5555',
  });
  assert.ok(manifest.hook_attributes);
  assert.equal(manifest.hook_attributes.active, false);
  assert.ok(manifest.hook_attributes.url.length > 0);
});

test('manifestFormHtml escapes the manifest JSON', () => {
  const manifest = buildManifest({
    appName: `Alpine's "Club" <CMS> & Co`,
    siteName: 'Alpine Club',
    ownerType: 'user',
    loopbackUrl: 'http://127.0.0.1:5555',
  });
  const html = manifestFormHtml(manifest, 'http://127.0.0.1:9999/settings/apps/new');
  assert.ok(!html.includes(`Alpine's "Club" <CMS> & Co`), 'the raw unescaped name must not appear');
  assert.ok(html.includes('&#39;'));
  assert.ok(html.includes('&quot;'));
  assert.ok(html.includes('&lt;CMS&gt;'));
  assert.ok(html.includes('&amp;'));
});

test('manifestTarget: personal branch', () => {
  process.env.CAIRN_GITHUB_WEB_BASE = 'http://127.0.0.1:9999';
  try {
    assert.equal(
      manifestTarget({ ownerType: 'user' }),
      'http://127.0.0.1:9999/settings/apps/new',
    );
  } finally {
    delete process.env.CAIRN_GITHUB_WEB_BASE;
  }
});

test('manifestTarget: org branch', () => {
  process.env.CAIRN_GITHUB_WEB_BASE = 'http://127.0.0.1:9999';
  try {
    assert.equal(
      manifestTarget({ ownerType: 'org', org: 'alpine-club' }),
      'http://127.0.0.1:9999/organizations/alpine-club/settings/apps/new',
    );
  } finally {
    delete process.env.CAIRN_GITHUB_WEB_BASE;
  }
});

test('runManifestFlow: the happy path returns the full credential set', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);

  const logs = [];
  const opened = [];
  const credentials = await runManifestFlow({
    appName: 'Alpine Club CMS',
    siteName: 'Alpine Club',
    ownerType: 'user',
    org: undefined,
    openBrowser: async (url) => {
      opened.push(url);
      // Simulate the admin's browser landing back on the loopback's /manifest redirect after
      // GitHub converts the manifest. Deferred to a macrotask so runManifestFlow has already
      // armed waitFor('/manifest', ...) by the time this fires.
      setTimeout(() => {
        fetch(`${url}/manifest?code=goodcode`).catch(() => {});
      }, 0);
    },
    log: (line) => logs.push(line),
  });

  assert.equal(opened.length, 1);
  assert.deepEqual(Object.keys(credentials).sort(), [
    'appId',
    'appSlug',
    'clientId',
    'clientSecret',
    'owner',
    'pem',
    'webhookSecret',
  ].sort());
  assert.equal(typeof credentials.appId, 'number');
  assert.equal(typeof credentials.appSlug, 'string');
  assert.equal(typeof credentials.clientId, 'string');
  assert.equal(typeof credentials.clientSecret, 'string');
  assert.ok(credentials.pem.includes('PRIVATE KEY'));
  assert.equal(typeof credentials.webhookSecret, 'string');
  assert.equal(credentials.owner, 'fake-owner');
});

test('runManifestFlow: an expired code raises manifest-window-expired', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);

  await assert.rejects(
    () =>
      runManifestFlow({
        appName: 'Alpine Club CMS',
        siteName: 'Alpine Club',
        ownerType: 'user',
        org: undefined,
        openBrowser: async (url) => {
          setTimeout(() => {
            fetch(`${url}/manifest?code=expired`).catch(() => {});
          }, 0);
        },
        log: () => {},
      }),
    (err) => {
      assert.equal(err.catalogue.code, 'manifest-window-expired');
      return true;
    },
  );
});

test('runManifestFlow: an abandoned browser step raises browser-step-abandoned for step manifest', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);

  await assert.rejects(
    () =>
      runManifestFlow({
        appName: 'Alpine Club CMS',
        siteName: 'Alpine Club',
        ownerType: 'user',
        org: undefined,
        timeoutMs: 50,
        openBrowser: async () => {
          // Never hits the loopback; the wait must time out on its own.
        },
        log: () => {},
      }),
    (err) => {
      assert.equal(err.catalogue.code, 'browser-step-abandoned');
      // The manifest branch's wording (not the install branch's) names the App and its
      // name-already-taken recovery, which is how the test pins step: 'manifest'.
      assert.match(err.message, /App name is already taken/);
      assert.match(err.message, /Alpine Club CMS/);
      return true;
    },
  );
});

test('runManifestFlow: the pre-open log line covers opening the create-App page and signing in first', async (t) => {
  const github = await startFakeGithub();
  t.after(() => github.close());
  pointAtFake(t, github);

  const logs = [];
  await runManifestFlow({
    appName: 'Alpine Club CMS',
    siteName: 'Alpine Club',
    ownerType: 'user',
    org: undefined,
    openBrowser: async (url) => {
      setTimeout(() => {
        fetch(`${url}/manifest?code=goodcode`).catch(() => {});
      }, 0);
    },
    log: (line) => logs.push(line),
  });

  const preOpen = logs.find(
    (line) => line.includes('Create GitHub App') || line.includes("Create a GitHub App"),
  );
  assert.ok(preOpen, 'expected a log line about GitHub\'s Create GitHub App page');
  assert.match(preOpen, /sign in to GitHub/i);
});
