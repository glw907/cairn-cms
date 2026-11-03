// The gate's browser half against hand-built page fixtures. Every address is answered by a route
// handler in the browser itself, so nothing reaches GitHub, Cloudflare, or a real site. The browser
// is headless here (production launches it headed), and the desktop notification is a stub.
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { appendFile, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { BrowserContext, Route } from 'playwright';
import {
  HoldTimeoutError,
  classifyUrl,
  confirmSignIn,
  deleteGithubApp,
  handleUrl,
  launchBrowser,
  publishViaAdmin,
  requestSignInLink,
  tailUrlLog,
} from '../../../scripts/gate/browser.mjs';
import { guardedRun } from '../../../scripts/gate/legs.mjs';

const SITE = 'https://gate-site.example.workers.dev';
const creds = { login: 'glw907-test', password: 'fixture-password', totp: () => '246810' };

/** What the fixture web saw. */
let seen: string[];
let signedIn: boolean;
let totpReceived: string | null;
let holdBody: string;

const page = (body: string, title = 'fixture') => `<!doctype html><html><head><title>${title}</title></head><body>${body}</body></html>`;
const form = (action: string, button: string, extra = '') => `<form method="post" action="${action}">${extra}<button type="submit">${button}</button></form>`;

/** The fixture web: one handler answers every host. */
async function answer(route: Route) {
  const request = route.request();
  const url = new URL(request.url());
  const key = `${request.method()} ${url.host}${url.pathname}`;
  seen.push(key);
  const html = (body: string) => route.fulfill({ status: 200, contentType: 'text/html', body });
  const gated = (next: string) => {
    if (signedIn) return html(next);
    return html(page(`<form method="post" action="/session"><input id="login_field" name="login"><input id="password" name="password" type="password"><button type="submit">Sign in</button></form>`));
  };

  if (url.host === '127.0.0.1:4555') return html(page(form('https://github.com/settings/apps/new', 'Create the GitHub App', '<input type="hidden" name="manifest" value="{}">')));
  if (key === 'POST github.com/settings/apps/new' || key === 'GET github.com/settings/apps/new') return gated(page(form('/settings/apps/create', 'Create GitHub App')));
  if (key === 'POST github.com/session') return html(page(form('/sessions/two-factor', 'Verify', '<input id="app_totp" name="app_totp">')));
  if (key === 'POST github.com/sessions/two-factor') {
    totpReceived = new URLSearchParams(request.postData() ?? '').get('app_totp');
    signedIn = totpReceived === '246810';
    return html(page(signedIn ? form('/settings/apps/create', 'Create GitHub App') : '<p>Two-factor failed</p>'));
  }
  if (key === 'POST github.com/settings/apps/create') return html(page('<p>App created</p>'));
  if (url.host === 'github.com' && url.pathname === '/apps/gate-app/installations/new') return html(page(form(url.pathname, 'Install &amp; Authorize')));
  if (url.host === 'github.com' && url.pathname === '/login/oauth/authorize') return html(page(form('/login/oauth/authorize', 'Authorize cairn-gate')));
  if (url.host === 'github.com' && url.pathname === '/passkey-experiment') return html(page(holdBody));
  if (key === 'GET gate-site.example.workers.dev/admin/auth/confirm') return html(page(form('/admin/auth/confirm', 'Confirm sign-in')));
  if (key === 'POST gate-site.example.workers.dev/admin/auth/confirm') return html(page('<p>Signed in</p>'));
  if (key === 'GET gate-site.example.workers.dev/admin/login') return html(page(form('/admin/login', 'Send sign-in link', '<input type="email" name="email">')));
  if (key === 'POST gate-site.example.workers.dev/admin/login') {
    seen.push(`email=${new URLSearchParams(request.postData() ?? '').get('email')}`);
    return html(page('<p>Check your inbox</p>'));
  }
  if (key === 'GET gate-site.example.workers.dev/admin/pages/about') {
    return html(
      page(
        `<div class="navbar"><button id="save">Save</button><button id="publish">Publish</button></div>
         <div class="cm-content" contenteditable="true"><div class="cm-line">Welcome to the trail crew page.</div><div class="cm-line"></div></div>
         <div id="out"></div>
         <script>
           document.getElementById('publish').onclick = () => {
             const alert = document.createElement('div');
             alert.className = 'alert';
             alert.textContent = 'Published. The live site shows this change once the site rebuilds.';
             document.getElementById('out').append(alert);
             window.__body = document.querySelector('.cm-content').innerText;
           };
         </script>`,
      ),
    );
  }
  if (key === 'GET github.com/settings/apps/gate-app/advanced') return html(page(`<button id="d" onclick="document.body.insertAdjacentHTML('beforeend','<button>I understand, delete this GitHub App</button>')">Delete GitHub App</button>`));
  if (url.pathname.startsWith('/settings/apps/gone/')) return route.fulfill({ status: 404, contentType: 'text/html', body: page('Not Found') });
  return route.fulfill({ status: 404, body: `no fixture for ${key}` });
}

let launched: Awaited<ReturnType<typeof launchBrowser>>;
let stateDir: string;
let context: BrowserContext;

beforeAll(async () => {
  stateDir = await mkdtemp(path.join(tmpdir(), 'gate-browser-'));
  launched = await launchBrowser({ statePath: path.join(stateDir, 'github-session.json'), headless: true });
}, 60_000);

afterAll(async () => {
  await launched.close();
  await rm(stateDir, { recursive: true, force: true });
});

beforeEach(async () => {
  seen = [];
  signedIn = false;
  totpReceived = null;
  holdBody = '<p>Try a passkey instead</p>';
  context = launched.github;
  await context.route(/.*/, answer);
});

afterEach(async () => {
  await context.unroute(/.*/, answer);
  for (const open of context.pages()) await open.close();
});

const noop = () => {};

describe('classifyUrl', () => {
  it.each([
    ['http://127.0.0.1:4555/', 'manifest'],
    ['https://github.com/apps/gate-app/installations/new', 'install'],
    ['https://github.com/login/oauth/authorize?client_id=x&state=y', 'authorize'],
    ['https://gate-site.example.workers.dev/admin/auth/confirm?token=abc', 'signin'],
    ['https://dash.cloudflare.com/profile/api-tokens?permissionGroupKeys=x', 'skip'],
    ['https://github.com/something/new', 'hold'],
    ['https://github.com/login/oauth/authorize-x', 'hold'],
    ['not a url', 'hold'],
  ])('%s is %s', (url, kind) => {
    expect(classifyUrl(url)).toBe(kind);
  });
});

describe('handleUrl', () => {
  const options = (overrides = {}) => ({
    github: context,
    admin: () => context,
    creds,
    leg: 'A1',
    screenshotDir: path.join(tmpdir(), 'gate-holds-unused'),
    notify: noop,
    log: noop,
    ...overrides,
  });

  it('submits the manifest, signs in with a TOTP code, and clicks Create GitHub App', async () => {
    const kind = await handleUrl('http://127.0.0.1:4555/', options());
    expect(kind).toBe('manifest');
    expect(totpReceived).toBe('246810');
    expect(seen).toContain('POST github.com/settings/apps/create');
  });

  it('clicks Install on the App install page and Authorize on the authorize page', async () => {
    await handleUrl('https://github.com/apps/gate-app/installations/new', options());
    expect(seen).toContain('POST github.com/apps/gate-app/installations/new');
    await handleUrl('https://github.com/login/oauth/authorize?client_id=x', options());
    expect(seen).toContain('POST github.com/login/oauth/authorize');
  });

  it('opens the sign-in link at once in the install\'s own context and clicks Confirm', async () => {
    const admin = await launched.newAdminContext();
    await admin.route(/.*/, answer);
    await handleUrl(`${SITE}/admin/auth/confirm?token=abc`, options({ admin: () => admin }));
    expect(seen).toContain('POST gate-site.example.workers.dev/admin/auth/confirm');
    await admin.close();
  });

  it('skips a dash.cloudflare.com prefill URL without opening a page', async () => {
    const before = context.pages().length;
    const kind = await handleUrl('https://dash.cloudflare.com/profile/api-tokens', options());
    expect(kind).toBe('skip');
    expect(context.pages().length).toBe(before);
    expect(seen).toEqual([]);
  });

  describe('a page it does not recognise', () => {
    let dir: string;
    beforeEach(async () => {
      dir = await mkdtemp(path.join(tmpdir(), 'gate-holds-'));
    });
    afterEach(() => rm(dir, { recursive: true, force: true }));

    it('is held with a screenshot and one notification, resumes when the page changes, and never tears down', async () => {
      const notified: Array<[string, string]> = [];
      const logged: string[] = [];
      const teardowns: string[] = [];
      const run = guardedRun(
        () =>
          handleUrl('https://github.com/passkey-experiment', options({ screenshotDir: dir, notify: (title: string, body: string) => notified.push([title, body]), log: (line: string) => logged.push(line), holdTimeoutMs: 20_000 })),
        async () => void teardowns.push('teardown'),
      );
      await expect.poll(() => notified.length, { timeout: 10_000 }).toBe(1);
      const line = logged.find((entry) => entry.startsWith('HOLD'));
      const shot = /screenshot (\S+)/.exec(line ?? '')?.[1] ?? '';
      expect(path.dirname(shot)).toBe(dir);
      expect(existsSync(shot)).toBe(true);
      expect(notified[0][0]).toContain('A1');
      expect(teardowns).toEqual([]);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      expect(teardowns).toEqual([]);

      const held = context.pages().at(-1)!;
      await held.evaluate(() => document.body.append('clicked through'));
      expect(await run).toBe('hold');
      expect(teardowns).toEqual([]);
      expect(notified).toHaveLength(1);
    }, 40_000);

    it('fails the leg only at the timeout, and teardown runs after it', async () => {
      const teardowns: string[] = [];
      const started = Date.now();
      const run = guardedRun(
        () => handleUrl('https://github.com/passkey-experiment', options({ screenshotDir: dir, holdTimeoutMs: 2500 })),
        async () => void teardowns.push('teardown'),
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
      expect(teardowns).toEqual([]);
      await expect(run).rejects.toBeInstanceOf(HoldTimeoutError);
      expect(Date.now() - started).toBeGreaterThanOrEqual(2400);
      expect(teardowns).toEqual(['teardown']);
    }, 30_000);

    it('holds a recognised page whose control never shows, and fails at the timeout', async () => {
      const notified: Array<[string, string]> = [];
      const run = handleUrl('https://github.com/apps/redesigned/installations/new', options({ screenshotDir: dir, notify: (title: string, body: string) => notified.push([title, body]), holdTimeoutMs: 1500, page: { controlWaitMs: 300 } }));
      await expect(run).rejects.toBeInstanceOf(HoldTimeoutError);
      expect(notified).toHaveLength(1);
      expect(notified[0][1]).toContain('install page without its control');
    }, 30_000);
  });
});

describe('the admin half', () => {
  it('opens an entry, reads a control line, inserts the marker, publishes, and returns the alert', async () => {
    const admin = await launched.newAdminContext();
    await admin.route(/.*/, answer);
    const result = await publishViaAdmin(admin, { origin: SITE, marker: 'gate-0.99.0-rc.3-A1-1', pauseMs: 100, alertWaitMs: 10_000 });
    expect(result).toEqual({
      alertText: 'Published. The live site shows this change once the site rebuilds.',
      control: 'Welcome to the trail crew page.',
      marker: 'gate-0.99.0-rc.3-A1-1',
      entryPath: '/about',
    });
    await admin.close();
  });

  it('requests a sign-in link and confirms a mailed one in a fresh context', async () => {
    const fresh = await launched.newAdminContext();
    await fresh.route(/.*/, answer);
    const before = Date.now();
    const requestedAt = await requestSignInLink(fresh, { origin: SITE, email: 'cairn-gate@probe.907.life', pauseMs: 100 });
    expect(requestedAt).toBeGreaterThanOrEqual(before);
    expect(seen).toContain('email=cairn-gate@probe.907.life');
    await confirmSignIn(fresh, `${SITE}/admin/auth/confirm?token=from-mail`, 100);
    expect(seen).toContain('POST gate-site.example.workers.dev/admin/auth/confirm');
    await fresh.close();
  });

  it('deletes an App through its Advanced settings, and treats a 404 page as done', async () => {
    expect(await deleteGithubApp(context, 'gate-app', creds, { pauseMs: 100 })).toBe('deleted');
    expect(await deleteGithubApp(context, 'gone', creds, { pauseMs: 100 })).toBe('absent');
  });
});

describe('the session file', () => {
  it('is written with mode 0600 when the browser closes', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'gate-session-'));
    const statePath = path.join(dir, 'nested', 'github-session.json');
    const second = await launchBrowser({ statePath, headless: true });
    await second.close();
    expect((await stat(statePath)).mode & 0o777).toBe(0o600);
    await rm(dir, { recursive: true, force: true });
  }, 30_000);
});

describe('tailUrlLog', () => {
  it('hands each logged URL to the handler once, in order, and finishes the queue on stop', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'gate-tail-'));
    const file = path.join(dir, 'urls.log');
    const got: string[] = [];
    const tail = tailUrlLog(file, async (url) => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      got.push(url);
    }, 20);
    await writeFile(file, 'https://a.example/1\n');
    await appendFile(file, 'https://a.example/2\nhttps://a.example/3\n');
    await expect.poll(() => got.length, { timeout: 5000 }).toBe(3);
    await tail.stop();
    expect(got).toEqual(['https://a.example/1', 'https://a.example/2', 'https://a.example/3']);
    await rm(dir, { recursive: true, force: true });
  });
});
