// The gate's browser half against hand-built page fixtures. Every address is answered by a route
// handler in the browser itself, so nothing reaches GitHub, Cloudflare, or a real site. The setup
// tool's loopback is a real server on 127.0.0.1, because Chromium sends a redirect that a route
// fulfils to the network, not back through the route. The browser is headless, as it is in
// production unless a run passes --headed.
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { appendFile, mkdtemp, readdir, readFile, rm, stat, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium, type BrowserContext, type Route } from 'playwright';
import * as browserModule from '../../../scripts/gate/browser.mjs';
import {
  UnrecognisedPageError,
  childEnv,
  classifyUrl,
  confirmSignIn,
  deleteGithubApp,
  handleUrl,
  launchBrowser,
  publishViaAdmin,
  requestSignInLink,
  tailUrlLog,
} from '../../../scripts/gate/browser.mjs';
import { PUBLISHED_ALERT } from '../../../scripts/gate/legs.mjs';
import { makeSession } from '../../../scripts/gate/gate.mjs';

const SITE = 'https://gate-site.example.workers.dev';
const creds = { login: 'glw907-test', password: 'fixture-password', totp: () => '246810' };

/** The setup tool's own loopback success bodies (`oauth.mjs`, `install.mjs`, `manifest.mjs`), verbatim. */
const OAUTH_DONE = '<!doctype html><html><body><p>Signed in again. Return to the terminal.</p></body></html>';
const INSTALL_DONE =
  '<!doctype html><html><body><p>Step 2 of 2 is done: the App is installed and ' + 'authorized. Return to the terminal.</p></body></html>';
const MANIFEST_DONE =
  '<!doctype html><html><body><p>Step 1 of 2 is done: your GitHub App has been ' + 'created. Return to the terminal.</p></body></html>';
let LOOPBACK: string;
let loopbackServer: Server;
const SAVED = 'Saved. Your site keeps showing the published version until you publish.';

/** What the fixture web saw. */
let seen: string[];
let signedIn: boolean;
let totpReceived: string | null;
let holdBody: string;
/** What the setup tool's loopback answers. */
let loopbackBody: string;
let authorizeMode: 'redirect' | 'consent';
let confirmMode: 'ok' | 'login' | 'posts';
let sendMode: 'ok' | 'error';
let publishMode: 'ok' | 'error';

const page = (body: string, title = 'fixture') => `<!doctype html><html><head><title>${title}</title></head><body>${body}</body></html>`;
const form = (action: string, button: string, extra = '') => `<form method="post" action="${action}">${extra}<button type="submit">${button}</button></form>`;

/** The entry editor: a dirty editor mirrors its text into `input[name="body"]`, as the real one does. */
function editorPage(search: string) {
  const published = search.includes('published=1');
  const flash = published ? PUBLISHED_ALERT : search.includes('saved=1') ? SAVED : '';
  const strip = flash ? `<div class="cairn-feedback alert alert-success">${flash}</div>` : '';
  if (published) return page(strip);
  return page(
    `${strip}<div class="navbar"><button id="save">Save</button><button id="publish">Publish</button></div>
     <input type="hidden" name="body" value="">
     <div class="cm-content" contenteditable="true"><div class="cm-line">Welcome to the trail crew page.</div><div class="cm-line"></div></div>
     <div id="out"></div>
     <script>
       const body = document.querySelector('input[name="body"]');
       const editor = document.querySelector('.cm-content');
       editor.addEventListener('input', () => { body.value = editor.innerText; });
       document.getElementById('save').onclick = async () => {
         await fetch('/admin/pages/about/save', { method: 'POST' });
         location.href = '?saved=1';
       };
       document.getElementById('publish').onclick = async () => {
         const result = await (await fetch('/admin/pages/about/publish', { method: 'POST' })).json();
         if (!result.error) { location.href = '?published=1'; return; }
         const alert = document.createElement('div');
         alert.className = 'alert alert-error';
         alert.textContent = result.error;
         document.getElementById('out').append(alert);
       };
     </script>`,
  );
}

/** The fixture web: one handler answers every host. */
async function answer(route: Route) {
  const request = route.request();
  const url = new URL(request.url());
  const key = `${request.method()} ${url.host}${url.pathname}`;
  seen.push(key);
  const html = (body: string) => route.fulfill({ status: 200, contentType: 'text/html', body });
  // A same-origin redirect is a page that navigates, since a fulfilled 3xx is not routed again.
  const navigate = (to: string) => html(`<!doctype html><script>location.replace(${JSON.stringify(to)})</script>`);
  const redirect = (to: string) => route.fulfill({ status: 302, headers: { location: to }, body: '' });
  if (url.hostname === '127.0.0.1') return route.continue();
  const gated = (next: string) => {
    if (signedIn) return html(next);
    return html(page(`<form method="post" action="/session"><input id="login_field" name="login"><input id="password" name="password" type="password"><button type="submit">Sign in</button></form>`));
  };

  if (key === 'POST github.com/settings/apps/new' || key === 'GET github.com/settings/apps/new') return gated(page(form('/settings/apps/create', 'Create GitHub App for glw907-test')));
  if (key === 'POST github.com/session') return html(page(form('/sessions/two-factor', 'Verify', '<input id="app_totp" name="app_totp">')));
  if (key === 'POST github.com/sessions/two-factor') {
    totpReceived = new URLSearchParams(request.postData() ?? '').get('app_totp');
    signedIn = totpReceived === '246810';
    return html(page(signedIn ? form('/settings/apps/create', 'Create GitHub App for glw907-test') : '<p>Two-factor failed</p>'));
  }
  if (key === 'POST github.com/settings/apps/create') {
    loopbackBody = MANIFEST_DONE;
    return redirect(`${LOOPBACK}/manifest?code=manifest-code`);
  }
  if (key === 'POST github.com/apps/gate-app/installations/new') {
    loopbackBody = INSTALL_DONE;
    return redirect(`${LOOPBACK}/callback?code=install-code&state=s`);
  }
  if (url.host === 'github.com' && url.pathname === '/apps/gate-app/installations/new') return html(page(form(url.pathname, 'Install &amp; Authorize')));
  if (key === 'GET github.com/login/oauth/authorize' && authorizeMode === 'redirect') return redirect(`${LOOPBACK}/callback?code=oauth-code&state=s`);
  if (key === 'POST github.com/login/oauth/authorize') return redirect(`${LOOPBACK}/callback?code=oauth-code&state=s`);
  if (url.host === 'github.com' && url.pathname === '/login/oauth/authorize') return html(page(form('/login/oauth/authorize', 'Authorize cairn-gate')));
  if (url.host === 'github.com' && url.pathname === '/passkey-experiment') return html(page(holdBody));
  if (key === 'GET gate-site.example.workers.dev/admin/auth/confirm') return html(page(form('/admin/auth/confirm', 'Confirm sign-in')));
  if (key === 'POST gate-site.example.workers.dev/admin/auth/confirm') return navigate(confirmMode === 'ok' ? '/admin' : confirmMode === 'posts' ? '/admin/posts' : '/admin/login');
  if (key === 'GET gate-site.example.workers.dev/admin') return html(page('<h1>Dashboard</h1>'));
  if (key === 'GET gate-site.example.workers.dev/admin/posts') return html(page('<h1>Posts</h1>'));
  if (key === 'GET gate-site.example.workers.dev/admin/login') return html(page(form('/admin/login', 'Send sign-in link', '<input type="email" name="email">')));
  if (key === 'POST gate-site.example.workers.dev/admin/login') {
    seen.push(`email=${new URLSearchParams(request.postData() ?? '').get('email')}`);
    return html(page(sendMode === 'ok' ? '<h1>Check your email</h1><p>We sent a sign-in link.</p>' : '<div class="alert alert-error">Too many sign-in requests. Wait a minute.</div>'));
  }
  if (key === 'GET gate-site.example.workers.dev/admin/pages/about') return html(editorPage(url.search));
  if (key === 'POST gate-site.example.workers.dev/admin/pages/about/save') {
    seen.push('save');
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  }
  if (key === 'POST gate-site.example.workers.dev/admin/pages/about/publish') {
    seen.push('publish');
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(publishMode === 'ok' ? {} : { error: 'Publish failed. GitHub refused the commit.' }) });
  }
  if (key === 'GET github.com/settings/apps/gate-app/advanced') {
    const dialog = `<dialog open><input name="verify" oninput="document.getElementById('c').disabled = this.value !== 'gate-app'"><button id="c" disabled onclick="fetch('/settings/apps/gate-app/delete', { method: 'POST' })">I understand the consequences, delete this GitHub App</button></dialog>`;
    return html(page(`<button id="d" onclick="document.body.insertAdjacentHTML('beforeend', ${JSON.stringify(dialog).replace(/"/g, '&quot;')})">Delete GitHub App</button>`));
  }
  if (key === 'POST github.com/settings/apps/gate-app/delete') return html(page('deleted'));
  if (url.pathname.startsWith('/settings/apps/gone/')) return route.fulfill({ status: 404, contentType: 'text/html', body: page('Not Found') });
  return route.fulfill({ status: 404, body: `no fixture for ${key}` });
}

let launched: Awaited<ReturnType<typeof launchBrowser>>;
let stateDir: string;
let context: BrowserContext;

beforeAll(async () => {
  loopbackServer = createServer((request, response) => {
    const { pathname } = new URL(request.url ?? '/', 'http://x');
    response.writeHead(200, { 'content-type': 'text/html' });
    if (pathname === '/callback' || pathname === '/manifest') response.end(loopbackBody);
    else response.end(page(form('https://github.com/settings/apps/new', 'Create the GitHub App', '<input type="hidden" name="manifest" value="{}">')));
  });
  await new Promise<void>((resolve) => loopbackServer.listen(0, '127.0.0.1', resolve));
  LOOPBACK = `http://127.0.0.1:${(loopbackServer.address() as AddressInfo).port}`;
  stateDir = await mkdtemp(path.join(tmpdir(), 'gate-browser-'));
  launched = await launchBrowser({ statePath: path.join(stateDir, 'github-session.json') });
}, 60_000);

afterAll(async () => {
  loopbackServer.close();
  await launched.close();
  await rm(stateDir, { recursive: true, force: true });
});

beforeEach(async () => {
  seen = [];
  signedIn = false;
  totpReceived = null;
  holdBody = '<p>Try a passkey instead</p>';
  loopbackBody = OAUTH_DONE;
  authorizeMode = 'consent';
  confirmMode = 'ok';
  sendMode = 'ok';
  publishMode = 'ok';
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
    ['https://github.com/something/new', 'unknown'],
    ['https://github.com/login/oauth/authorize-x', 'unknown'],
    ['not a url', 'unknown'],
  ])('%s is %s', (url, kind) => {
    expect(classifyUrl(url)).toBe(kind);
  });
});

describe('handleUrl', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'gate-evidence-'));
  });
  afterEach(() => rm(dir, { recursive: true, force: true }));

  const options = (overrides = {}) => ({
    github: context,
    admin: () => context,
    creds,
    leg: 'A1',
    evidenceDir: dir,
    log: noop,
    page: { pauseMs: 100, controlWaitMs: 5000 },
    ...overrides,
  });
  const files = async (suffix: string) => (await readdir(dir)).filter((name) => name.endsWith(suffix));

  it('submits the manifest, signs in with a TOTP code, clicks Create GitHub App, and is done at the loopback page', async () => {
    const kind = await handleUrl(`${LOOPBACK}/`, options());
    expect(kind).toBe('manifest');
    expect(totpReceived).toBe('246810');
    expect(seen).toContain('POST github.com/settings/apps/create');
  });

  it('clicks Install on the App install page and is done at the loopback page', async () => {
    await handleUrl('https://github.com/apps/gate-app/installations/new', options());
    expect(seen).toContain('POST github.com/apps/gate-app/installations/new');
  });

  it('is done when authorize redirects straight to the loopback, within the control wait and with no click', async () => {
    authorizeMode = 'redirect';
    const logged: string[] = [];
    const started = Date.now();
    const kind = await handleUrl('https://github.com/login/oauth/authorize?client_id=x&state=s', options({ log: (line: string) => logged.push(line), page: { pauseMs: 100, controlWaitMs: 8000 } }));
    expect(kind).toBe('authorize');
    expect(Date.now() - started).toBeLessThan(8000);
    expect(seen).not.toContain('POST github.com/login/oauth/authorize');
    expect(logged.join('\n')).not.toContain('code=');
  });

  it('clicks consent once when GitHub shows it, then is done at the loopback', async () => {
    await handleUrl('https://github.com/login/oauth/authorize?client_id=x', options());
    expect(seen.filter((entry) => entry === 'POST github.com/login/oauth/authorize')).toHaveLength(1);
  });

  it('never logs or throws a URL carrying code=', async () => {
    authorizeMode = 'redirect';
    loopbackBody = page('Not found');
    const logged: string[] = [];
    const failure = await handleUrl('https://github.com/login/oauth/authorize?code=zzz', options({ log: (line: string) => logged.push(line) })).catch((error: Error) => error);
    expect(failure).toBeInstanceOf(Error);
    expect(`${logged.join('\n')}\n${(failure as Error).message}`).not.toContain('code=');
  });

  it.each(['Not found', 'Forbidden'])('fails the leg when the loopback answers %s', async (answerText) => {
    authorizeMode = 'redirect';
    loopbackBody = answerText;
    await expect(handleUrl('https://github.com/login/oauth/authorize?client_id=x', options())).rejects.toThrow(answerText);
  });

  it('opens the sign-in link at once in the install\'s own context, clicks Confirm, and requires /admin', async () => {
    const admin = await launched.newAdminContext();
    await admin.route(/.*/, answer);
    await handleUrl(`${SITE}/admin/auth/confirm?token=abc`, options({ admin: () => admin }));
    expect(seen).toContain('POST gate-site.example.workers.dev/admin/auth/confirm');
    expect(seen).toContain('GET gate-site.example.workers.dev/admin');
    await admin.close();
  });

  it('accepts a confirm that the admin redirects to its first screen under /admin', async () => {
    confirmMode = 'posts';
    const admin = await launched.newAdminContext();
    await admin.route(/.*/, answer);
    await handleUrl(`${SITE}/admin/auth/confirm?token=secret-token`, options({ admin: () => admin }));
    await admin.close();
    expect(seen).toContain('GET gate-site.example.workers.dev/admin/posts');
  });

  it('accepts a mailed link that lands on a screen under /admin', async () => {
    confirmMode = 'posts';
    const fresh = await launched.newAdminContext();
    await fresh.route(/.*/, answer);
    await confirmSignIn(fresh, `${SITE}/admin/auth/confirm?token=from-mail`, 100);
    await fresh.close();
    expect(seen).toContain('GET gate-site.example.workers.dev/admin/posts');
  });

  it('fails a confirm that lands on /admin/login with the page text, no screenshot, and no query in the message', async () => {
    confirmMode = 'login';
    const admin = await launched.newAdminContext();
    await admin.route(/.*/, answer);
    const failure = await handleUrl(`${SITE}/admin/auth/confirm?token=secret-token`, options({ admin: () => admin })).catch((error: Error) => error);
    await admin.close();
    expect((failure as Error).message).toContain('gate-site.example.workers.dev/admin/login');
    expect((failure as Error).message).toContain('Send sign-in link');
    expect((failure as Error).message).not.toContain('secret-token');
    expect(await files('.png')).toEqual([]);
    expect(await files('.controls.txt')).toHaveLength(1);
  });

  it('skips a dash.cloudflare.com prefill URL without opening a page', async () => {
    const before = context.pages().length;
    const kind = await handleUrl('https://dash.cloudflare.com/profile/api-tokens', options());
    expect(kind).toBe('skip');
    expect(context.pages().length).toBe(before);
    expect(seen).toEqual([]);
  });

  it('writes a controls file for every handled GitHub page', async () => {
    authorizeMode = 'redirect';
    await handleUrl('https://github.com/login/oauth/authorize?client_id=x', options());
    await handleUrl('https://github.com/apps/gate-app/installations/new', options());
    expect(await files('.controls.txt')).toHaveLength(2);
  });

  describe('a page it does not recognise', () => {
    beforeEach(() => {
      holdBody = '<p>Try a passkey instead</p><input name="secret" value="s3cr3t-value"><button>Use a passkey</button><a href="/help?ticket=77">Get help</a>';
    });

    it('fails at once with UnrecognisedPageError, a screenshot, and a controls file with no input value or query', async () => {
      const started = Date.now();
      const failure = await handleUrl('https://github.com/passkey-experiment', options()).catch((error: Error) => error);
      expect(Date.now() - started).toBeLessThan(4000);
      expect(failure).toBeInstanceOf(UnrecognisedPageError);
      expect((failure as Error).message).toContain('github.com/passkey-experiment');
      expect((failure as Error).message).toContain('Try a passkey instead');
      const png = await files('.png');
      const controls = await files('.controls.txt');
      expect(png).toHaveLength(1);
      expect(png[0]).toMatch(/^A1-\d+\.png$/);
      expect(controls).toEqual([png[0].replace('.png', '.controls.txt')]);
      const text = await readFile(path.join(dir, controls[0]), 'utf8');
      expect(text).toContain('button\tUse a passkey');
      expect(text).toContain('link\tGet help');
      expect(text).not.toContain('s3cr3t-value');
      expect(text).not.toContain('ticket');
      expect(text).not.toContain('?');
    });

    it.each(['token=abc', 'code=abc'])('writes no screenshot when the address carries %s', async (query) => {
      const failure = await handleUrl(`https://github.com/passkey-experiment?${query}`, options()).catch((error: Error) => error);
      expect(failure).toBeInstanceOf(UnrecognisedPageError);
      expect(await files('.png')).toEqual([]);
      expect(await files('.controls.txt')).toHaveLength(1);
      expect((failure as Error).message).not.toContain(query);
    });

    it('quotes at most 200 characters of page text', async () => {
      holdBody = `<p>${'long '.repeat(200)}</p>`;
      const failure = (await handleUrl('https://github.com/passkey-experiment', options()).catch((error: Error) => error)) as Error;
      expect(failure.message.length).toBeLessThan(400);
    });

    it('fails a recognised page whose control never shows, at the control wait', async () => {
      const failure = await handleUrl('https://github.com/apps/redesigned/installations/new', options({ page: { pauseMs: 100, controlWaitMs: 300 } })).catch((error: Error) => error);
      expect((failure as Error).message).toContain('github.com/apps/redesigned/installations/new');
      expect(await files('.controls.txt')).not.toHaveLength(0);
    }, 30_000);
  });
});

describe('the admin half', () => {
  it('opens an entry, reads a control line, inserts the marker, publishes without Save, and returns the success strip', async () => {
    const admin = await launched.newAdminContext();
    await admin.route(/.*/, answer);
    const result = await publishViaAdmin(admin, { origin: SITE, marker: 'gate-0.99.0-rc.3-A1-1', pauseMs: 100, alertWaitMs: 10_000 });
    expect(result).toEqual({
      alertText: PUBLISHED_ALERT,
      control: 'Welcome to the trail crew page.',
      marker: 'gate-0.99.0-rc.3-A1-1',
      entryPath: '/about',
    });
    expect(seen).toContain('publish');
    expect(seen).not.toContain('save');
    await admin.close();
  });

  it('returns the alert text when Publish answers an error', async () => {
    publishMode = 'error';
    const admin = await launched.newAdminContext();
    await admin.route(/.*/, answer);
    const result = await publishViaAdmin(admin, { origin: SITE, marker: 'gate-x', pauseMs: 100, alertWaitMs: 3000 });
    expect(result.alertText).toBe('Publish failed. GitHub refused the commit.');
    await admin.close();
  }, 30_000);

  it('names the page and its text when the editor never appears', async () => {
    const admin = await launched.newAdminContext();
    await admin.route(/.*/, answer);
    const failure = await publishViaAdmin(admin, { origin: SITE, marker: 'gate-x', adminPath: '/admin/login', pauseMs: 100, editorWaitMs: 1500 }).catch((error: Error) => error);
    await admin.close();
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toContain('gate-site.example.workers.dev/admin/login');
    expect((failure as Error).message).toContain('Send sign-in link');
    expect((failure as Error).message).not.toContain('?');
  }, 30_000);

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

  it('throws the alert text when a send page lacks the Check your email heading', async () => {
    sendMode = 'error';
    const fresh = await launched.newAdminContext();
    await fresh.route(/.*/, answer);
    const failure = await requestSignInLink(fresh, { origin: SITE, email: 'cairn-gate@probe.907.life', pauseMs: 100 }).catch((error: Error) => error);
    await fresh.close();
    expect((failure as Error).message).toContain('Too many sign-in requests');
    expect((failure as Error).message).toContain('gate-site.example.workers.dev/admin/login');
  }, 30_000);

  it('throws with the page text when a mailed link lands on /admin/login', async () => {
    confirmMode = 'login';
    const fresh = await launched.newAdminContext();
    await fresh.route(/.*/, answer);
    const failure = await confirmSignIn(fresh, `${SITE}/admin/auth/confirm?token=from-mail`, 100).catch((error: Error) => error);
    await fresh.close();
    expect((failure as Error).message).toContain('/admin/login');
    expect((failure as Error).message).not.toContain('from-mail');
  }, 30_000);

  it('deletes an App through its Advanced settings, and treats a 404 page as done', async () => {
    expect(await deleteGithubApp(context, 'gate-app', creds, { pauseMs: 100 })).toBe('deleted');
    expect(seen).toContain('POST github.com/settings/apps/gate-app/delete');
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

describe('the children of the gate', () => {
  const parent = {
    DISPLAY: ':7',
    WAYLAND_DISPLAY: 'wayland-9',
    XAUTHORITY: '/x/auth',
    XDG_RUNTIME_DIR: '/run/user/1',
    DBUS_SESSION_BUS_ADDRESS: 'unix:path=/bus',
    HOME: '/home/someone',
    PATH: '/usr/bin',
    CF_WS_CAIRN_GATE_TOKEN: 'fake-cf',
    GITHUB_TEST_TOKEN: 'fake-gh',
    GITHUB_TEST_PASSWORD: 'fake-pw',
    GITHUB_TEST_TOTP_SECRET: 'fake-totp',
    STALWART_PASSWORD_CAIRN_GATE: 'fake-mail',
    GATE_URL_LOG: '/run/urls.log',
  };
  const secretName = /^(CF_|GITHUB_TEST_|STALWART)/;

  it('childEnv carries the display and session names and no secret', () => {
    const env = childEnv(parent);
    expect(env).toMatchObject({ DISPLAY: ':7', WAYLAND_DISPLAY: 'wayland-9', XAUTHORITY: '/x/auth', XDG_RUNTIME_DIR: '/run/user/1', DBUS_SESSION_BUS_ADDRESS: 'unix:path=/bus', HOME: '/home/someone' });
    expect(Object.keys(env).filter((name) => secretName.test(name))).toEqual([]);
  });

  it('launchBrowser hands the browser the display names and no secret', async () => {
    const saved = { ...process.env };
    Object.assign(process.env, parent);
    const spy = vi.spyOn(chromium, 'launch');
    const dir = await mkdtemp(path.join(tmpdir(), 'gate-env-'));
    try {
      const second = await launchBrowser({ statePath: path.join(dir, 's.json'), headless: true });
      await second.close();
      const env = spy.mock.calls[0][0]?.env as Record<string, string>;
      expect(env.DISPLAY).toBe(':7');
      expect(env.DBUS_SESSION_BUS_ADDRESS).toBe('unix:path=/bus');
      expect(Object.keys(env).filter((name) => secretName.test(name))).toEqual([]);
    } finally {
      spy.mockRestore();
      for (const name of Object.keys(parent)) {
        if (saved[name] === undefined) delete process.env[name];
        else process.env[name] = saved[name];
      }
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);
});

describe('host rules', () => {
  it('launchBrowser maps hostRules to --host-resolver-rules and adds no arg without them', async () => {
    const spy = vi.spyOn(chromium, 'launch');
    const dir = await mkdtemp(path.join(tmpdir(), 'gate-rules-'));
    try {
      const ruled = await launchBrowser({ statePath: path.join(dir, 'a.json'), hostRules: ['MAP carin-test.org 104.21.0.5'] });
      await ruled.close();
      const plain = await launchBrowser({ statePath: path.join(dir, 'b.json') });
      await plain.close();
      expect(spy.mock.calls[0][0]?.args).toEqual(['--host-resolver-rules=MAP carin-test.org 104.21.0.5']);
      expect(spy.mock.calls[0][0]?.headless).toBe(true);
      expect(spy.mock.calls[1][0]?.args).toBeUndefined();
    } finally {
      spy.mockRestore();
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);
});

describe('headless', () => {
  it('launchBrowser with no headless option launches headless', async () => {
    const spy = vi.spyOn(chromium, 'launch');
    const dir = await mkdtemp(path.join(tmpdir(), 'gate-headless-'));
    try {
      const second = await launchBrowser({ statePath: path.join(dir, 's.json') });
      await second.close();
      expect(spy.mock.calls[0][0]?.headless).toBe(true);
    } finally {
      spy.mockRestore();
      await rm(dir, { recursive: true, force: true });
    }
  }, 30_000);

  it('makeSession launches headed only when asked', async () => {
    const spy = vi.spyOn(chromium, 'launch').mockRejectedValue(new Error('no browser in this test'));
    try {
      await expect(makeSession({ HOME: '/nonexistent-home' }, { headed: true }).getBrowser()).rejects.toThrow('no browser');
      await expect(makeSession({ HOME: '/nonexistent-home' }).getBrowser()).rejects.toThrow('no browser');
      expect(spy.mock.calls.map((call) => call[0]?.headless)).toEqual([false, true]);
    } finally {
      spy.mockRestore();
    }
  });

  it('the hold machinery is gone from the exports', () => {
    for (const name of ['holdPage', 'HoldTimeoutError', 'STEP_MS', 'notifyDesktop']) expect(browserModule).not.toHaveProperty(name);
  });
});

describe('tailUrlLog', () => {
  it('hands each logged URL to the handler once, in order, and finishes the queue on stop', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'gate-tail-'));
    const file = path.join(dir, 'urls.log');
    const got: string[] = [];
    const tail = tailUrlLog(
      file,
      async (url) => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        got.push(url);
      },
      { pollMs: 20 },
    );
    await writeFile(file, 'https://a.example/1\n');
    await appendFile(file, 'https://a.example/2\nhttps://a.example/3\n');
    await expect.poll(() => got.length, { timeout: 5000 }).toBe(3);
    await tail.stop();
    expect(got).toEqual(['https://a.example/1', 'https://a.example/2', 'https://a.example/3']);
    await rm(dir, { recursive: true, force: true });
  });

  it('a second tail started at the file size handles none of the first tail\'s lines', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'gate-tail-'));
    const file = path.join(dir, 'urls.log');
    await writeFile(file, 'https://a.example/1\nhttps://a.example/2\n');
    const second: string[] = [];
    const tail = tailUrlLog(file, async (url) => void second.push(url), { from: (await stat(file)).size, pollMs: 20 });
    await appendFile(file, 'https://a.example/3\n');
    await expect.poll(() => second.length, { timeout: 5000 }).toBe(1);
    await tail.stop();
    expect(second).toEqual(['https://a.example/3']);
    await rm(dir, { recursive: true, force: true });
  });

  it('a tail on a file that was deleted starts at 0', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'gate-tail-'));
    const file = path.join(dir, 'urls.log');
    await writeFile(file, 'https://a.example/old\n');
    await unlink(file);
    const got: string[] = [];
    const tail = tailUrlLog(file, async (url) => void got.push(url), { from: 0, pollMs: 20 });
    await writeFile(file, 'https://a.example/new\n');
    await expect.poll(() => got.length, { timeout: 5000 }).toBe(1);
    await tail.stop();
    expect(got).toEqual(['https://a.example/new']);
    await rm(dir, { recursive: true, force: true });
  });
});
