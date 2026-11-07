// The gate's browser half: the pages a person would click while the CLI runs, and the admin publish.
// It tails the shim's URL log, classifies each URL before acting, and fails the leg at once on any
// page it does not recognise, with a screenshot and a controls file to teach it from. Pages are
// waited on by `load` plus a short pause, never `networkidle` (GitHub keeps live connections
// open), and a page showing a secret is never screenshotted.
import { chmod, mkdir, open, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

/** @param {number} ms */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * @typedef {'manifest' | 'install' | 'authorize' | 'signin' | 'skip' | 'unknown'} UrlKind
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
    return 'unknown';
  }
  if (parsed.pathname.endsWith('/admin/auth/confirm') && parsed.searchParams.has('token')) return 'signin';
  if (parsed.hostname === 'dash.cloudflare.com') return 'skip';
  if (parsed.protocol === 'http:' && parsed.hostname === '127.0.0.1') return 'manifest';
  if (parsed.hostname === 'github.com') {
    if (/^\/apps\/[^/]+\/installations\/new/.test(parsed.pathname)) return 'install';
    if (parsed.pathname === '/login/oauth/authorize') return 'authorize';
  }
  return 'unknown';
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

/** The sentence every one of the setup tool's loopback success pages ends with. */
const LOOPBACK_DONE = 'Return to the terminal.';

/** Raised when a page is not one the gate knows how to move on from. */
export class UnrecognisedPageError extends Error {}

/**
 * `host + pathname` of a URL, never its query, which can carry a code or a token.
 * @param {string} url
 * @returns {string}
 */
function where(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname}`;
  } catch {
    return 'an unparseable address';
  }
}

/**
 * @param {string} url
 * @returns {boolean} true when the address carries a sign-in token or an OAuth code
 */
function carriesSecret(url) {
  try {
    const { searchParams } = new URL(url);
    return searchParams.has('token') || searchParams.has('code');
  } catch {
    return false;
  }
}

/**
 * @param {import('playwright').Page} page
 * @returns {Promise<string>} the page's visible text, whitespace collapsed
 */
async function pageText(page) {
  const text = await page.evaluate(() => document.body?.innerText ?? '').catch(() => '');
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * One `role<TAB>name` line per button and link, under a `host/path` header. No input value, no
 * link target, and no query string is read.
 * @param {import('playwright').Page} page
 * @returns {Promise<string>}
 */
async function controlsText(page) {
  const lines = await page
    .evaluate(() => {
      /** @type {string[]} */
      const found = [];
      for (const element of document.querySelectorAll('button, [role="button"], a[href]')) {
        const role = element.tagName === 'A' ? 'link' : 'button';
        const name = (element.getAttribute('aria-label') ?? /** @type {HTMLElement} */ (element).innerText ?? '').replace(/\s+/g, ' ').trim();
        found.push(`${role}\t${name}`);
      }
      return found;
    })
    .catch(() => /** @type {string[]} */ ([]));
  return `# ${where(page.url())}\n${lines.join('\n')}\n`;
}

/**
 * @typedef {object} Evidence
 * @property {string} leg the running leg
 * @property {string} dir where the files go (the run directory)
 * @property {string} kind what the page was meant to be
 * @property {(line: string) => void} log receives the file paths, never a value
 */

/**
 * Write the controls file for the page, for the reader who must teach the gate a new page.
 * @param {import('playwright').Page} page
 * @param {Evidence} evidence
 * @param {string} [tag] a word between the leg and the stamp, for a page that is not a failure
 * @returns {Promise<string>} the stamp the files share
 */
async function writeControls(page, evidence, tag) {
  await mkdir(evidence.dir, { recursive: true, mode: 0o700 });
  const stamp = `${evidence.leg}-${tag ? `${tag}-` : ''}${Date.now()}`;
  const file = path.join(evidence.dir, `${stamp}.controls.txt`);
  await writeFile(file, await controlsText(page), { mode: 0o600 });
  evidence.log(`controls ${file}`);
  return stamp;
}

/**
 * Fail the leg on a page the gate cannot move on from: write the screenshot (never of a sign-in
 * page or an address carrying `token=` or `code=`) and the controls file, then throw. The message
 * names the page by host and path and quotes at most 200 characters of its text, since it can
 * land in a public release body.
 * @param {import('playwright').Page} page the page
 * @param {Evidence} evidence what the page was meant to be
 * @param {string} [reason] why the page is wrong; without one the page is simply unrecognised
 * @returns {Promise<never>}
 */
export async function failPage(page, evidence, reason) {
  const stamp = await writeControls(page, evidence);
  if (evidence.kind !== 'signin' && !carriesSecret(page.url())) {
    const shot = path.join(evidence.dir, `${stamp}.png`);
    await page.screenshot({ path: shot }).catch(() => {});
    evidence.log(`screenshot ${shot}`);
  }
  const text = (await pageText(page)).slice(0, 200);
  const at = `at ${where(page.url())}: ${JSON.stringify(text)}`;
  if (reason) throw new Error(`leg ${evidence.leg}: ${reason} ${at}`);
  throw new UnrecognisedPageError(`leg ${evidence.leg}: an unrecognised page (${evidence.kind}) ${at}`);
}

/**
 * @typedef {object} UrlHandlerOptions
 * @property {import('playwright').BrowserContext} github the machine account's context
 * @property {() => import('playwright').BrowserContext} admin the current install's admin context
 * @property {Creds} creds the machine account
 * @property {string} leg the running leg
 * @property {string} evidenceDir where a failure's screenshot and controls file, and each handled
 *  GitHub page's controls file, go
 * @property {(line: string) => void} log one line per event, never a value
 * @property {PageOptions} [page] the page waits
 */

/**
 * Wait for the page to be the setup tool's loopback success page, answering account prompts and
 * clicking `consent` once if GitHub shows it. Any other loopback page, or running out of time,
 * fails the leg.
 * @param {import('playwright').Page} page
 * @param {{ consent?: RegExp }} what the consent control to click once, when GitHub asks
 * @param {Creds} creds
 * @param {PageOptions} pageOptions
 * @param {Evidence} evidence
 * @returns {Promise<void>}
 */
async function reachLoopback(page, { consent }, creds, pageOptions, evidence) {
  const { pauseMs = 500, controlWaitMs = 30_000 } = pageOptions;
  const deadline = Date.now() + controlWaitMs;
  let clicked = false;
  for (;;) {
    let parsed;
    try {
      parsed = new URL(page.url());
    } catch {
      parsed = null;
    }
    if (parsed && parsed.protocol === 'http:' && parsed.hostname === '127.0.0.1') {
      if (parsed.pathname === '/callback' || parsed.pathname === '/manifest') {
        if ((await pageText(page)).endsWith(LOOPBACK_DONE)) return;
        await failPage(page, evidence, 'the setup tool answered the browser with an error page');
      }
    } else if (await answerAccountPrompts(page, creds, pauseMs)) {
      continue;
    } else if (consent && !clicked) {
      const button = page.getByRole('button', { name: consent });
      if (await visible(button)) {
        clicked = true;
        await button.first().click();
        await settle(page, pauseMs);
        continue;
      }
    }
    if (Date.now() > deadline) await failPage(page, evidence, "the setup tool's loopback page never came");
    await sleep(250);
  }
}

/**
 * Whether a path is a signed-in admin screen: `/admin` itself or any screen under it, such as the
 * `/admin/posts` the admin redirects a signed-in editor to. The login and auth pages mean the
 * sign-in did not take.
 * @param {string} pathname
 * @returns {boolean}
 */
function isSignedInAdminPath(pathname) {
  const path = pathname.replace(/\/$/, '');
  if (path !== '/admin' && !path.startsWith('/admin/')) return false;
  return path !== '/admin/login' && !path.startsWith('/admin/auth');
}

/**
 * After a sign-in confirm, the admin must land on a signed-in `/admin` screen.
 * @param {import('playwright').Page} page
 * @param {Evidence} evidence
 * @param {number} [waitMs]
 * @returns {Promise<void>}
 */
async function requireAdmin(page, evidence, waitMs = 30_000) {
  const atAdmin = () => isSignedInAdminPath(new URL(page.url()).pathname);
  await page.waitForURL(atAdmin, { timeout: waitMs }).catch(() => {});
  if (!atAdmin()) await failPage(page, evidence, 'the sign-in did not land on /admin');
}

/**
 * Act on one URL the CLI opened. Every GitHub kind is done when the setup tool's loopback page
 * shows its success sentence; a sign-in is done when the admin lands on `/admin`. Anything else
 * fails at once through `failPage`.
 * @param {string} url the logged URL
 * @param {UrlHandlerOptions} options
 * @returns {Promise<UrlKind>} what the URL was classified as
 */
export async function handleUrl(url, options) {
  const { github, admin, creds, leg, evidenceDir, log, page: pageOptions = {} } = options;
  const kind = classifyUrl(url);
  // A sign-in link carries a token, so no log line names it; a code never reaches a log either.
  log(`url ${kind}${kind === 'signin' ? '' : ` ${carriesSecret(url) ? where(url) : url}`}`);
  if (kind === 'skip') return kind;
  const context = kind === 'signin' ? admin() : github;
  const page = await context.newPage();
  const evidence = { leg, dir: evidenceDir, log, kind };
  const pauseMs = pageOptions.pauseMs ?? 500;
  await page.goto(url, { waitUntil: 'load' });
  await settle(page, pauseMs);
  if (kind === 'unknown') return failPage(page, evidence);
  if (kind === 'signin') {
    if (!(await clickControl(page, /^(sign in|confirm sign-in)$/i, creds, pageOptions))) await failPage(page, evidence, 'the sign-in page lacks its control');
    await requireAdmin(page, evidence, pageOptions.controlWaitMs);
  } else {
    await writeControls(page, evidence, kind);
    if (kind === 'manifest') {
      // The page submits itself; the button is for a script that did not run.
      const submit = page.getByRole('button', { name: /^create the github app$/i });
      if (await visible(submit)) await submit.first().click().catch(() => {});
      await settle(page, pauseMs);
      await clickControl(page, /^create github app\b/i, creds, pageOptions);
      await reachLoopback(page, {}, creds, pageOptions, evidence);
    } else if (kind === 'install') {
      const chooser = page.getByRole('link', { name: creds.login });
      if (!(await visible(page.getByRole('button', { name: /^install/i }))) && (await visible(chooser))) {
        await chooser.first().click();
        await settle(page, pauseMs);
      }
      await clickControl(page, /^install/i, creds, pageOptions);
      await reachLoopback(page, {}, creds, pageOptions, evidence);
    } else {
      await reachLoopback(page, { consent: /^authorize/i }, creds, pageOptions, evidence);
    }
  }
  await page.close().catch(() => {});
  return kind;
}

/**
 * Tail the shim's URL log, calling `onUrl` for each new line, one at a time.
 * @param {string} file the log
 * @param {(url: string) => Promise<void>} onUrl the handler
 * @param {{ from?: number, pollMs?: number }} [options] `from` is the byte offset to start at (0), so
 *  a tail begins at the log's current end; `pollMs` is the gap between looks (250)
 * @returns {{ stop: () => Promise<void> }} `stop` finishes the queued URLs, then ends the tail
 */
export function tailUrlLog(file, onUrl, { from = 0, pollMs = 250 } = {}) {
  let offset = from;
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
 * The environment a browser child gets: the display and session-bus names, the
 * XDG_* names, HOME, PATH, and LANG. The browser needs no secret (the page logic runs in Node), so
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
 * @param {{ statePath: string, headless?: boolean }} options `headless` is true unless the run was
 *  started with `--headed`
 * @returns {Promise<Launched>}
 */
export async function launchBrowser({ statePath, headless = true }) {
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
  // Publish is enabled while the editor is dirty, so it needs no Save first; a Save would only
  // flash a message that also says "published".
  await page.waitForFunction((text) => /** @type {HTMLInputElement | null} */ (document.querySelector('input[name="body"]'))?.value.includes(text), marker, { timeout: alertWaitMs });
  const publish = page.locator('.navbar').getByRole('button', { name: 'Publish', exact: true });
  /** @type {string} */
  let alertText;
  try {
    await Promise.all([page.waitForURL(/[?&]published=1/, { timeout: alertWaitMs }), publish.click()]);
    const feedback = page.locator('.cairn-feedback').first();
    await feedback.waitFor({ state: 'visible', timeout: alertWaitMs });
    alertText = (await feedback.innerText()).trim();
  } catch {
    const alert = page.locator('.alert:visible').first();
    const shown = (await alert.innerText({ timeout: 1000 }).catch(() => '')).trim().slice(0, 200);
    if (!shown) throw new Error(`The publish at ${where(page.url())} neither redirected nor showed an alert.`);
    alertText = shown;
  }
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
  const sent = page.getByRole('heading', { name: 'Check your email' });
  if (!(await sent.first().waitFor({ state: 'visible', timeout: 15_000 }).then(() => true, () => false))) {
    const shown = (await page.locator('.alert').first().innerText({ timeout: 1000 }).catch(() => '')) || (await pageText(page));
    throw new Error(`The sign-in link was not sent: ${where(page.url())} shows ${JSON.stringify(shown.replace(/\s+/g, ' ').trim().slice(0, 200))}.`);
  }
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
  const atAdmin = () => isSignedInAdminPath(new URL(page.url()).pathname);
  await page.waitForURL(atAdmin, { timeout: 15_000 }).catch(() => {});
  if (!atAdmin()) throw new Error(`The sign-in did not land on /admin: ${where(page.url())} shows ${JSON.stringify((await pageText(page)).slice(0, 200))}.`);
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
  const advanced = `${base}/settings/apps/${slug}/advanced`;
  /** @type {import('playwright').Response | null} */
  let response;
  try {
    response = await page.goto(advanced, { waitUntil: 'load' });
  } catch {
    // GitHub aborts the first navigation now and then (net::ERR_ABORTED); settle and try once more.
    await sleep(Math.max(pauseMs, 1000));
    await answerAccountPrompts(page, creds, pauseMs);
    response = await page.goto(advanced, { waitUntil: 'load' });
  }
  await settle(page, pauseMs);
  if (response?.status() === 404) {
    await page.close();
    return 'absent';
  }
  if (!(await clickControl(page, /^delete github app\b/i, creds, { pauseMs }))) throw new Error('The App settings page has no Delete GitHub App button.');
  // GitHub keeps the confirm button disabled until the App's name is typed into `verify`.
  const verify = page.locator('input[name="verify"]:visible').first();
  await verify.waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {});
  if (await visible(verify)) await verify.fill(slug);
  if (!(await clickControl(page, /^i understand\b.*\bdelete\b.*github app/i, creds, { pauseMs }))) throw new Error('The delete confirmation did not appear.');
  await page.close();
  return 'deleted';
}
