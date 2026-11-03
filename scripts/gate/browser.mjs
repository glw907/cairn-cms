// The gate's browser half: the pages a person would click while the CLI runs, and the admin publish.
// It tails the shim's URL log, classifies each URL before acting, and holds any page it does not
// recognise, headed, so Geoff can click it. Pages are waited on by `load` plus a short pause, never
// `networkidle` (GitHub keeps live connections open), and a page showing a secret is never
// screenshotted for a reader.
import { spawn } from 'node:child_process';
import { chmod, mkdir, open, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

/** One step's patience: a held page, or a control that never shows. */
export const STEP_MS = 10 * 60_000;

/** @param {number} ms */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * @typedef {'manifest' | 'install' | 'authorize' | 'signin' | 'skip' | 'hold'} UrlKind
 */

/**
 * What a URL the CLI opened is, decided before any page is touched.
 * @param {string} url the URL the shim logged
 * @returns {UrlKind} the action to take
 */
export function classifyUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return 'hold';
  }
  if (parsed.pathname.endsWith('/admin/auth/confirm') && parsed.searchParams.has('token')) return 'signin';
  if (parsed.hostname === 'dash.cloudflare.com') return 'skip';
  if (parsed.protocol === 'http:' && parsed.hostname === '127.0.0.1') return 'manifest';
  if (parsed.hostname === 'github.com') {
    if (/^\/apps\/[^/]+\/installations\/new/.test(parsed.pathname)) return 'install';
    if (parsed.pathname === '/login/oauth/authorize') return 'authorize';
  }
  return 'hold';
}

/**
 * @typedef {object} Creds
 * @property {string} login the machine account's login
 * @property {string} password its password
 * @property {() => string} totp the current six-digit code
 */

/**
 * @typedef {object} PageOptions
 * @property {number} [pauseMs] the pause after a page's `load` (500)
 * @property {number} [controlWaitMs] how long a recognised page may lack its control before it is
 *  held instead (30 seconds)
 */

/**
 * @param {import('playwright').Page} page
 * @param {number} pauseMs
 */
async function settle(page, pauseMs) {
  await page.waitForLoadState('load').catch(() => {});
  await sleep(pauseMs);
}

/** @param {import('playwright').Locator} locator */
const visible = (locator) => locator.first().isVisible().catch(() => false);

/**
 * Handle GitHub's sign-in, two-factor, and sudo prompts when the page is one.
 * @param {import('playwright').Page} page the page
 * @param {Creds} creds the machine account
 * @param {number} pauseMs the pause after the page moves on
 * @returns {Promise<boolean>} true when the page was one of those prompts and was answered
 */
export async function answerAccountPrompts(page, creds, pauseMs = 500) {
  if (await visible(page.locator('#login_field'))) {
    await page.locator('#login_field').fill(creds.login);
    await page.locator('#password').fill(creds.password);
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await settle(page, pauseMs);
    return true;
  }
  if (await visible(page.locator('#app_totp'))) {
    await page.locator('#app_totp').fill(creds.totp());
    const verify = page.getByRole('button', { name: /^verify$/i });
    if (await visible(verify)) await verify.click();
    await settle(page, pauseMs);
    return true;
  }
  if (await visible(page.locator('#sudo_password'))) {
    await page.locator('#sudo_password').fill(creds.password);
    await page.getByRole('button', { name: /^confirm/i }).click();
    await settle(page, pauseMs);
    return true;
  }
  return false;
}

/**
 * Click `control` on the current page, answering sign-in prompts on the way.
 * @param {import('playwright').Page} page the page
 * @param {RegExp} control the button's accessible name
 * @param {Creds} creds the machine account
 * @param {PageOptions} [options]
 * @returns {Promise<boolean>} true when the control was clicked, false when the wait ran out
 */
export async function clickControl(page, control, creds, options = {}) {
  const { pauseMs = 500, controlWaitMs = 30_000 } = options;
  const deadline = Date.now() + controlWaitMs;
  for (;;) {
    const button = page.getByRole('button', { name: control });
    if (await visible(button)) {
      await button.first().click();
      await settle(page, pauseMs);
      return true;
    }
    if (await answerAccountPrompts(page, creds, pauseMs)) continue;
    if (Date.now() > deadline) return false;
    await sleep(250);
  }
}

/**
 * The page's content signature: it changes when the page moves on or a person clicks through.
 * @param {import('playwright').Page} page
 * @returns {Promise<string>}
 */
async function signature(page) {
  return `${page.url()}\n${await page.evaluate(() => document.body?.innerText ?? '')}`;
}

/**
 * @typedef {object} HoldOptions
 * @property {string} label what the page is, for the notification
 * @property {string} leg the leg that is waiting
 * @property {string} screenshotDir where the screenshot goes
 * @property {(title: string, body: string) => void} notify raises the desktop notification
 * @property {(line: string) => void} log receives the hold line (the screenshot path, never a value)
 * @property {number} [timeoutMs] how long to wait for a click (10 minutes)
 * @property {number} [pollMs] the gap between looks (1 second)
 */

/** The error a held page raises when nobody moved it on. */
export class HoldTimeoutError extends Error {}

/**
 * Keep a page open for a person's click. The leg resumes when the page's content or address
 * changes; only the timeout fails it.
 * @param {import('playwright').Page} page the page to hold
 * @param {HoldOptions} options
 * @returns {Promise<void>} resolves when the page moved on
 */
export async function holdPage(page, options) {
  const { label, leg, screenshotDir, notify, log, timeoutMs = STEP_MS, pollMs = 1000 } = options;
  await mkdir(screenshotDir, { recursive: true, mode: 0o700 });
  const shot = path.join(screenshotDir, `hold-${leg}-${Date.now()}.png`);
  await page.screenshot({ path: shot }).catch(() => {});
  log(`HOLD leg ${leg}: ${label}; screenshot ${shot}`);
  notify(`Gate leg ${leg} needs a click`, label);
  const before = await signature(page);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await sleep(pollMs);
    let now;
    try {
      now = await signature(page);
    } catch {
      return;
    }
    if (now !== before) return;
  }
  throw new HoldTimeoutError(`The page "${label}" was not clicked within ${Math.round(timeoutMs / 1000)} seconds.`);
}

/**
 * @typedef {object} UrlHandlerOptions
 * @property {import('playwright').BrowserContext} github the machine account's context
 * @property {() => import('playwright').BrowserContext} admin the current install's admin context
 * @property {Creds} creds the machine account
 * @property {string} leg the running leg, for a hold's notification
 * @property {string} screenshotDir where a hold's screenshot goes
 * @property {(title: string, body: string) => void} notify the desktop notification
 * @property {(line: string) => void} log one line per event, never a value
 * @property {number} [holdTimeoutMs] a hold's patience
 * @property {PageOptions} [page] the page waits
 */

/**
 * Act on one URL the CLI opened.
 * @param {string} url the logged URL
 * @param {UrlHandlerOptions} options
 * @returns {Promise<UrlKind>} what the URL was classified as
 */
export async function handleUrl(url, options) {
  const { github, admin, creds, leg, screenshotDir, notify, log, holdTimeoutMs, page: pageOptions } = options;
  const kind = classifyUrl(url);
  // A sign-in link carries a token, so no log line names the URL, only its kind.
  log(`url ${kind}${kind === 'signin' ? '' : ` ${url}`}`);
  if (kind === 'skip') return kind;
  const context = kind === 'signin' ? admin() : github;
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'load' });
  await settle(page, pageOptions?.pauseMs ?? 500);
  /** @type {Record<string, RegExp>} */
  const controls = {
    install: /^install/i,
    authorize: /^authorize/i,
    signin: /^(sign in|confirm sign-in)$/i,
  };
  let acted = false;
  if (kind === 'manifest') {
    // The page submits itself; the button is for a script that did not run.
    const submit = page.getByRole('button', { name: /^create the github app$/i });
    if (await visible(submit)) await submit.first().click().catch(() => {});
    await settle(page, pageOptions?.pauseMs ?? 500);
    acted = await clickControl(page, /^create github app$/i, creds, pageOptions);
  } else if (kind === 'install') {
    const chooser = page.getByRole('link', { name: creds.login });
    if (!(await visible(page.getByRole('button', { name: controls.install }))) && (await visible(chooser))) {
      await chooser.first().click();
      await settle(page, pageOptions?.pauseMs ?? 500);
    }
    acted = await clickControl(page, controls.install, creds, pageOptions);
  } else if (kind !== 'hold') {
    acted = await clickControl(page, controls[kind], creds, pageOptions);
  }
  if (acted) {
    await page.close().catch(() => {});
    return kind;
  }
  await holdPage(page, { label: `${kind === 'hold' ? 'an unrecognised page' : `the ${kind} page without its control`} (${new URL(url).host})`, leg, screenshotDir, notify, log, timeoutMs: holdTimeoutMs });
  return kind;
}

/**
 * Tail the shim's URL log, calling `onUrl` for each new line, one at a time.
 * @param {string} file the log
 * @param {(url: string) => Promise<void>} onUrl the handler
 * @param {number} [pollMs] the gap between looks (250)
 * @returns {{ stop: () => Promise<void> }} `stop` finishes the queued URLs, then ends the tail
 */
export function tailUrlLog(file, onUrl, pollMs = 250) {
  let offset = 0;
  let stopped = false;
  let buffer = '';
  const done = (async () => {
    for (;;) {
      if (existsSync(file)) {
        const size = (await stat(file)).size;
        if (size > offset) {
          const handle = await open(file, 'r');
          const chunk = Buffer.alloc(size - offset);
          await handle.read(chunk, 0, chunk.length, offset);
          await handle.close();
          offset = size;
          buffer += chunk.toString('utf8');
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) if (line.trim()) await onUrl(line.trim());
          continue;
        }
      }
      if (stopped) return;
      await sleep(pollMs);
    }
  })();
  return {
    async stop() {
      stopped = true;
      await done;
    },
  };
}

/**
 * @typedef {object} Launched
 * @property {import('playwright').Browser} browser the browser
 * @property {import('playwright').BrowserContext} github the machine account's context
 * @property {() => Promise<import('playwright').BrowserContext>} newAdminContext a fresh context
 *  with no cookies, one per install
 * @property {() => Promise<void>} close saves the machine session and closes the browser
 */

/**
 * The environment a browser or notify-send child gets: the display and session-bus names, the
 * XDG_* names, HOME, PATH, and LANG. Neither child needs a secret (the page logic runs in Node), so
 * no token, password, or mailbox name is carried.
 * @param {NodeJS.ProcessEnv} [parentEnv] the environment to draw from
 * @returns {Record<string, string>} the child's environment
 */
export function childEnv(parentEnv = process.env) {
  const names = ['DISPLAY', 'WAYLAND_DISPLAY', 'XAUTHORITY', 'DBUS_SESSION_BUS_ADDRESS', 'HOME', 'PATH', 'LANG'];
  /** @type {Record<string, string>} */
  const env = {};
  for (const [name, value] of Object.entries(parentEnv)) {
    if (value !== undefined && (names.includes(name) || name.startsWith('XDG_'))) env[name] = value;
  }
  return env;
}

/**
 * Launch Chromium with the machine account's stored session. Tracing and video stay off.
 * @param {{ statePath: string, headless?: boolean }} options `headless` is false in production, so
 *  a held page can take a click; tests set it true
 * @returns {Promise<Launched>}
 */
export async function launchBrowser({ statePath, headless = false }) {
  const browser = await chromium.launch({ headless, env: childEnv() });
  await mkdir(path.dirname(statePath), { recursive: true, mode: 0o700 });
  const github = await browser.newContext(existsSync(statePath) ? { storageState: statePath } : {});
  return {
    browser,
    github,
    newAdminContext: () => browser.newContext(),
    async close() {
      await github.storageState({ path: statePath });
      await chmod(statePath, 0o600);
      await browser.close();
    },
  };
}

/**
 * Sign the machine account in when its stored session is gone.
 * @param {import('playwright').BrowserContext} context the machine account's context
 * @param {Creds} creds the account
 * @param {{ base?: string, pauseMs?: number }} [options] `base` is GitHub's origin
 * @returns {Promise<void>}
 */
export async function ensureGithubSession(context, creds, { base = 'https://github.com', pauseMs = 500 } = {}) {
  const page = await context.newPage();
  await page.goto(`${base}/settings/profile`, { waitUntil: 'load' });
  await settle(page, pauseMs);
  for (let step = 0; step < 4; step++) {
    if (!(await answerAccountPrompts(page, creds, pauseMs))) break;
  }
  await page.close();
}

/**
 * The result of one admin publish.
 * @typedef {object} PublishResult
 * @property {string} alertText the alert the admin showed
 * @property {string} control a body line from before the edit
 * @property {string} marker the inserted marker
 * @property {string} entryPath the entry's public path
 */

/**
 * Open one existing entry, read a pre-edit body line, insert the marker, and publish.
 * @param {import('playwright').BrowserContext} context a context signed in to the install's admin
 * @param {{ origin: string, marker: string, adminPath?: string, pauseMs?: number, alertWaitMs?: number }} options
 *  `adminPath` is the entry's admin address (the Waymark template's About page)
 * @returns {Promise<PublishResult>}
 */
export async function publishViaAdmin(context, { origin, marker, adminPath = '/admin/pages/about', pauseMs = 500, alertWaitMs = 60_000 }) {
  const page = await context.newPage();
  await page.goto(`${origin}${adminPath}`, { waitUntil: 'load' });
  await settle(page, pauseMs);
  const editor = page.locator('.cm-content');
  await editor.waitFor({ state: 'visible', timeout: 60_000 });
  const lines = await page.locator('.cm-line').allInnerTexts();
  const control = lines.map((line) => line.trim()).find((line) => line.length >= 12);
  if (!control) throw new Error(`The entry at ${adminPath} has no body line to use as a control.`);
  await editor.click();
  await page.keyboard.press('Control+End');
  await page.keyboard.type(`\n\n${marker}\n`);
  const navbar = page.locator('.navbar');
  const save = navbar.getByRole('button', { name: 'Save', exact: true });
  if (await save.isEnabled().catch(() => false)) {
    await save.click();
    await settle(page, pauseMs);
  }
  await navbar.getByRole('button', { name: 'Publish', exact: true }).click();
  const alert = page.locator('.alert', { hasText: 'Published' }).first();
  await alert.waitFor({ state: 'visible', timeout: alertWaitMs });
  const alertText = (await alert.innerText()).trim();
  await page.close();
  return { alertText, control, marker, entryPath: adminPath.replace(/^\/admin\/pages\//, '/') };
}

/**
 * Ask the install for a sign-in link, as a visitor with no session.
 * @param {import('playwright').BrowserContext} context a fresh context
 * @param {{ origin: string, email: string, pauseMs?: number }} options
 * @returns {Promise<number>} the request time, epoch milliseconds, taken just before the submit
 */
export async function requestSignInLink(context, { origin, email, pauseMs = 500 }) {
  const page = await context.newPage();
  await page.goto(`${origin}/admin/login`, { waitUntil: 'load' });
  await settle(page, pauseMs);
  await page.locator('input[type=email]').fill(email);
  const requestedAt = Date.now();
  await page.getByRole('button', { name: /^send sign-in link$/i }).click();
  await settle(page, pauseMs);
  await page.close();
  return requestedAt;
}

/**
 * Open a sign-in link in a context and confirm it, leaving that context signed in.
 * @param {import('playwright').BrowserContext} context the context to sign in
 * @param {string} url the sign-in URL
 * @param {number} [pauseMs]
 * @returns {Promise<void>}
 */
export async function confirmSignIn(context, url, pauseMs = 500) {
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'load' });
  await settle(page, pauseMs);
  await page.getByRole('button', { name: /^(sign in|confirm sign-in)$/i }).click();
  await settle(page, pauseMs);
  await page.close();
}

/**
 * Delete a GitHub App through its Advanced settings.
 * @param {import('playwright').BrowserContext} context the machine account's context
 * @param {string} slug the App's slug
 * @param {Creds} creds the account
 * @param {{ base?: string, pauseMs?: number }} [options]
 * @returns {Promise<'deleted' | 'absent'>} `absent` when the settings page is a 404
 */
export async function deleteGithubApp(context, slug, creds, { base = 'https://github.com', pauseMs = 500 } = {}) {
  const page = await context.newPage();
  const response = await page.goto(`${base}/settings/apps/${slug}/advanced`, { waitUntil: 'load' });
  await settle(page, pauseMs);
  if (response?.status() === 404) {
    await page.close();
    return 'absent';
  }
  if (!(await clickControl(page, /^delete github app$/i, creds, { pauseMs }))) throw new Error('The App settings page has no Delete GitHub App button.');
  if (!(await clickControl(page, /^i understand, delete this github app$/i, creds, { pauseMs }))) throw new Error('The delete confirmation did not appear.');
  await page.close();
  return 'deleted';
}

/**
 * The desktop notification, at normal urgency (the calm-desktop rule).
 * @param {string} title the title
 * @param {string} body the body
 * @param {NodeJS.ProcessEnv} [parentEnv] the environment `notify-send` draws its own from
 * @returns {void}
 */
export function notifyDesktop(title, body, parentEnv = process.env) {
  const child = spawn('notify-send', ['-u', 'normal', title, body], { stdio: 'ignore', detached: true, env: childEnv(parentEnv) });
  child.on('error', () => {});
  child.unref();
}
