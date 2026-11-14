// The stand-in: the person at the browser while `cairn new` runs. It tails the run's `urls.log`,
// opens each URL in the machine account's browser, and follows the setup tab page by page: it reads
// the next-step control by its accessible name, pauses as a person reading the page would, and
// clicks. It ends when an admin page shows the owner signed in, and writes `stand-in.jsonl`, one
// line per action. A page it cannot read or clear in time fails through `failPage`.
import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  classifyUrl,
  clickControl,
  failPage,
  handleUrl,
  isSignedInAdminPath,
  requestSignInLink,
  requireAdmin,
  stepGithubPage,
  tailUrlLog,
} from './browser.mjs';
import { LIVE_ORIGIN } from './grade.mjs';
import { findSignInMessage } from './mail.mjs';
import { authoritativeAddress } from './resolve.mjs';
import { makeSession } from './gate.mjs';

/**
 * @typedef {object} TabPage
 * @property {string} kind the name written to `stand-in.jsonl`
 * @property {RegExp} heading the page's heading
 * @property {{ role: 'button' | 'link', name: RegExp } | null} control the next-step control, or null
 *  when the page has none and the tab moves on by itself
 */

/**
 * The pages the setup tab shows, keyed by the Go identifier after `Page` (or `page`) in
 * `tool/internal/setup/tab.go` and `loopback/pages.go`. A test reads those files and fails when a
 * kind there has no entry here, so a new tab page cannot ship unread. Headings and control names
 * come from `loopback/pages/*.html`. `Redirect` is `null`: it is a 302 the browser follows, never a
 * page.
 * @type {Record<string, TabPage | null>}
 */
export const TAB_PAGES = {
  Redirect: null,
  Wait: { kind: 'wait', heading: /^setup in progress$/i, control: null },
  Consent: { kind: 'consent', heading: /^approve setup on cloudflare$/i, control: { role: 'link', name: /^continue to cloudflare$/i } },
  Manifest: { kind: 'manifest', heading: /^continue to github$/i, control: { role: 'button', name: /^continue to github$/i } },
  ScopeError: { kind: 'scope-error', heading: /^turn on api tokens write$/i, control: { role: 'link', name: /^try again$/i } },
  Done: { kind: 'done', heading: /^approvals complete$/i, control: null },
};

/** Pages that wait on the CLI by design, so no clock runs against them. */
const WAITING = new Set(['wait', 'done']);

/**
 * Whether the site answers over HTTPS with a 200 on its home page, the check setup's own HTTPS wait
 * makes. Setup sends the sign-in mail only after that, so the mail is not looked for sooner.
 * @param {string} origin the site's origin
 * @returns {Promise<boolean>}
 */
async function siteAnswersOverHttps(origin) {
  try {
    const response = await fetch(`${origin}/`, { signal: AbortSignal.timeout(5000), redirect: 'manual' });
    return response.status === 200;
  } catch {
    return false;
  }
}

/**
 * Whether the setup tab's loopback server has gone: a connection to its origin is refused. The
 * agent lane's `--plan` serves the tab and its server goes with the plan, so a page that waits on
 * the CLI by design can wait on nothing.
 * @param {string} url the tab's address
 * @returns {Promise<boolean>}
 */
async function loopbackGone(url) {
  try {
    await fetch(new URL(url).origin, { signal: AbortSignal.timeout(2000) });
    return false;
  } catch {
    return true;
  }
}

/**
 * @typedef {object} MailConfig
 * @property {string} login the gate mailbox
 * @property {string} password its password
 * @property {string} siteName the site's name; the sign-in subject is `Sign in to <name>`
 * @property {string} owner the address the sign-in link is requested for
 * @property {string} [sessionUrl] the JMAP session URL
 * @property {typeof fetch} [fetchImpl] the fetch the mailbox read uses
 */

/**
 * @typedef {object} FollowOptions
 * @property {import('./browser.mjs').Creds} creds the machine account
 * @property {string} evidenceDir where a failure's screenshot and controls file go
 * @property {(line: string) => void} log one line per event, never a value
 * @property {(kind: string, action: string) => Promise<void> | void} record writes one `stand-in.jsonl` line
 * @property {MailConfig} mail the mailbox the sign-in link arrives in
 * @property {(ms: number) => Promise<void>} [sleep] the wait
 * @property {() => number} [now] the clock, epoch milliseconds
 * @property {number} [readPauseMs] the pause before a click, as a person reading (3000)
 * @property {number} [pageMs] how long one page may go unread or uncleared (2 minutes)
 * @property {number} [pollMs] the gap between looks at the page (250)
 * @property {number} [pauseMs] the pause after a page moves on, passed to the page helpers (500)
 * @property {typeof findSignInMessage} [findMail] the mailbox read
 * @property {(page: import('playwright').Page, origin: string, email: string) => Promise<number>} [requestLink] asks the site
 *  for a sign-in link and returns the request time
 * @property {(url: string) => Promise<unknown>} [openLink] opens a sign-in link and confirms the admin lands
 * @property {string} [signInOrigin] the site's origin. When the setup tab ends before the owner signs in, the
 *  stand-in signs in from the sign-in mail; without it the tab is followed to its end and a dead tab fails
 * @property {(host: string) => Promise<boolean>} [addressReady] whether the zone's nameserver answers for the host
 * @property {(url: string) => Promise<boolean>} [tabGone] whether the tab's loopback server has gone
 * @property {number} [idleMs] how long the tab must stay gone before the stand-in leaves it (20 seconds)
 * @property {number} [siteWaitMs] how long the address may take to answer (20 minutes)
 * @property {(origin: string) => Promise<boolean>} [siteAnswers] whether the site answers over HTTPS
 * @property {number} [mailWaitMs] how long to look for the sign-in mail once the site answers, before asking for a new link (3 minutes)
 */

/** @param {import('playwright').Locator} locator */
const visible = (locator) => locator.first().isVisible().catch(() => false);

/**
 * A tab page's heading as the stand-in compares it: whitespace collapsed, and any leading glyph
 * dropped, since a heading can lead with a glyph in its own span (the done page's check mark) that
 * `innerText` keeps.
 * @param {string} text the heading's text
 * @returns {string}
 */
export const tabHeading = (text) => text.replace(/\s+/g, ' ').replace(/^[^\p{L}\p{N}]+/u, '').trim();

/**
 * What a tab page is, by its heading.
 * @param {import('playwright').Page} page
 * @returns {Promise<TabPage | null>} the page, or null when the heading is not one the tab shows
 */
async function readTabPage(page) {
  const heading = tabHeading(await page.locator('h1').first().innerText({ timeout: 1000 }).catch(() => ''));
  return Object.values(TAB_PAGES).find((entry) => entry && entry.heading.test(heading)) ?? null;
}

/**
 * Follow the setup tab until the owner is signed in to the admin. Pages on the provider's site are
 * stepped through `stepGithubPage`; the tab's own pages by their control, after the reading pause;
 * the site's confirm page by its sign-in button; and the site's login page by the mailbox.
 * @param {import('playwright').Page} page the tab
 * @param {FollowOptions} options
 * @returns {Promise<void>} when the admin shows the owner signed in
 * @throws when a page is not read or cleared in `pageMs` (through `failPage`)
 */
export async function followTab(page, options) {
  const {
    creds,
    evidenceDir,
    log,
    record,
    mail,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    now = Date.now,
    readPauseMs = 3000,
    pageMs = 120_000,
    pollMs = 250,
    pauseMs = 500,
    findMail = findSignInMessage,
    requestLink = (tab, origin, email) => requestSignInLink(tab.context(), { origin, email, pauseMs }),
    openLink,
    signInOrigin,
    addressReady = async (/** @type {string} */ host) => typeof (await authoritativeAddress(host)) === 'string',
    tabGone = loopbackGone,
    siteAnswers = siteAnswersOverHttps,
    idleMs = 20_000,
    siteWaitMs = 20 * 60_000,
    mailWaitMs = 3 * 60_000,
  } = options;
  const startedAt = now();
  /** @type {number | null} */
  let goneSince = null;
  let recovered = false;
  const stamp = (/** @type {string} */ kind) => ({ leg: 'stand-in', dir: evidenceDir, log, kind });
  let key = '';
  let since = now();
  let clicked = '';
  for (;;) {
    const url = page.url();
    const { host, pathname } = new URL(url);
    // A sign-in or auth page is never shot, whatever the address carries.
    const onSignInPage = pathname.startsWith('/admin/login') || pathname.startsWith('/admin/auth');
    /** @type {string} */
    let kind = 'unknown';
    /** @type {TabPage | null} */
    let tab = null;
    if (host === 'github.com') kind = 'github';
    else if (isSignedInAdminPath(pathname)) kind = 'admin';
    else if (pathname === '/admin/auth/confirm') kind = 'confirm';
    else if (pathname === '/admin/login') kind = 'login';
    else if (new URL(url).hostname === '127.0.0.1') {
      tab = await readTabPage(page);
      kind = tab?.kind ?? 'unknown';
    }
    const here = `${kind}@${host}${pathname}`;
    if (here !== key) {
      key = here;
      since = now();
    }

    // The tab ended before the owner signed in. In the agent lane `--plan` opens the tab and its
    // server goes with the plan, and `--apply` opens none, so the owner signs in the way a person does:
    // from the mail setup sent. The stand-in waits for the site's address to answer from its zone's
    // nameservers, opens that mail's link, and asks for a new link only when no mail has come.
    if (signInOrigin && !recovered) {
      const hostname = new URL(url).hostname;
      const gone = url.startsWith('chrome-error:') || (hostname === '127.0.0.1' && (kind === 'unknown' || WAITING.has(kind)) && (await tabGone(url)));
      goneSince = gone ? (goneSince ?? now()) : null;
      if (goneSince !== null && now() - goneSince >= idleMs) {
        recovered = true;
        const siteHost = new URL(signInOrigin).hostname;
        const until = now() + siteWaitMs;
        while (!(await addressReady(siteHost))) {
          if (now() > until) await failPage(page, stamp('signin'), `the site's address ${siteHost} never answered from its zone's nameservers in ${Math.round(siteWaitMs / 60_000)} minutes`);
          await sleep(5000);
        }
        // The record exists before the site answers, and setup sends the mail after the HTTPS wait.
        while (!(await siteAnswers(signInOrigin))) {
          if (now() > until) await failPage(page, stamp('signin'), `the site at ${siteHost} never answered over HTTPS in ${Math.round(siteWaitMs / 60_000)} minutes`);
          await sleep(5000);
        }
        const found = await findMail({ ...mail, sinceMs: startedAt, expectedOrigin: signInOrigin, budgetMs: mailWaitMs, sleep, now });
        if (found.found) {
          await record('login', 'read sign-in mail');
          await (openLink ?? ((link) => handleUrl(link, { github: page.context(), admin: () => page.context(), creds, leg: 'stand-in', evidenceDir, log, page: { pauseMs } })))(found.url);
          await record('login', 'open sign-in link');
          // The link signed in on another page of this context, so the tab loads the admin itself.
          await page.goto(`${signInOrigin}/admin`, { waitUntil: 'load' });
          await requireAdmin(page, stamp('signin'), pageMs);
          await record('admin', 'signed-in');
          return;
        }
        await page.goto(`${signInOrigin}/admin/login`, { waitUntil: 'load' });
        continue;
      }
    }

    if (kind === 'admin') {
      await requireAdmin(page, stamp('signin'), 1000);
      await record('admin', 'signed-in');
      return;
    }
    if (kind === 'confirm') {
      if (clicked !== here) {
        clicked = here;
        if (!(await clickControl(page, /^(sign in|confirm sign-in)$/i, creds, { pauseMs, controlWaitMs: pageMs }))) {
          await failPage(page, stamp('signin'), 'the sign-in page lacks its control');
        }
        await record('confirm', 'click sign in');
      }
    } else if (kind === 'login') {
      if (clicked !== here) {
        clicked = here;
        const origin = new URL(url).origin;
        const requestedAt = await requestLink(page, origin, mail.owner);
        const found = await findMail({ ...mail, sinceMs: requestedAt, expectedOrigin: origin, sleep, now });
        if (!found.found) await failPage(page, stamp('signin'), `no sign-in message: ${found.reason}`);
        await record('login', 'read sign-in mail');
        await (openLink ?? ((link) => handleUrl(link, { github: page.context(), admin: () => page.context(), creds, leg: 'stand-in', evidenceDir, log, page: { pauseMs } })))(
          /** @type {{ url: string }} */ (found).url,
        );
        await record('login', 'open sign-in link');
        // The link signed in on another page of this context, so the tab loads the admin itself.
        await page.goto(`${origin}/admin`, { waitUntil: 'load' });
        await requireAdmin(page, stamp('signin'), pageMs);
        await record('admin', 'signed-in');
        return;
      }
    } else if (kind === 'github') {
      const action = await stepGithubPage(page, creds, pauseMs);
      if (action) {
        await record('github', action);
        since = now();
        continue;
      }
    } else if (tab?.control && clicked !== here) {
      const control = page.getByRole(tab.control.role, { name: tab.control.name });
      if (await visible(control)) {
        await sleep(readPauseMs);
        clicked = here;
        await control.first().click();
        await page.waitForLoadState('load').catch(() => {});
        await record(tab.kind, `click ${tab.control.role}`);
        continue;
      }
    }

    if (!WAITING.has(kind) && now() - since > pageMs) {
      await failPage(page, stamp(onSignInPage ? 'signin' : kind), kind === 'unknown' ? undefined : `the ${kind} page did not clear in ${Math.round(pageMs / 1000)} seconds`);
    }
    await sleep(pollMs);
  }
}

/**
 * @typedef {object} StandInOptions
 * @property {string} runDir the run directory, holding `urls.log`
 * @property {import('./browser.mjs').Launched} browser the machine account's browser
 * @property {import('./browser.mjs').Creds} creds the machine account
 * @property {MailConfig} mail the mailbox
 * @property {AbortSignal} [signal] ends the tail early
 * @property {string} [signInOrigin] the site's origin: when the setup tab ends first, the owner signs in from the sign-in mail
 * @property {(line: string) => void} [log] one line per event
 */

/**
 * Tail the run's URL log and handle each URL until the owner is signed in. A loopback URL is the
 * setup tab and is followed; any other URL goes through `handleUrl`.
 * @param {StandInOptions} options
 * @returns {Promise<void>} when the admin shows the owner signed in
 */
export async function runStandIn({ runDir, browser, creds, mail, signal, signInOrigin, log = console.log }) {
  await mkdir(runDir, { recursive: true, mode: 0o700 });
  const out = path.join(runDir, 'stand-in.jsonl');
  /** @param {string} kind @param {string} action */
  const record = (kind, action) => appendFile(out, `${JSON.stringify({ kind, action, at: new Date().toISOString() })}\n`, { mode: 0o600 });
  let finish = () => {};
  /** @type {Promise<void>} */
  const signedIn = new Promise((resolve) => (finish = resolve));
  /** @type {unknown} */
  let failure = null;
  const tail = tailUrlLog(path.join(runDir, 'urls.log'), async (url) => {
    if (failure) return;
    try {
      const kind = classifyUrl(url);
      if (kind === 'manifest') {
        const page = await browser.github.newPage();
        await page.goto(url, { waitUntil: 'load' });
        await followTab(page, { creds, evidenceDir: runDir, log, record, mail, signInOrigin });
        await page.close().catch(() => {});
        finish();
        return;
      }
      await handleUrl(url, { github: browser.github, admin: () => browser.github, creds, leg: 'stand-in', evidenceDir: runDir, log });
      await record(kind, 'handled');
      if (kind === 'signin') finish();
    } catch (error) {
      failure = error;
      finish();
    }
  });
  signal?.addEventListener('abort', finish);
  await signedIn;
  await tail.stop();
  if (failure) throw failure;
}

/**
 * The `stand-in.jsonl` line for a stand-in that stopped. It carries the error's first line, since the
 * stand-in's terminal goes with its tmux session (run 2611140447 lost its reason that way). A
 * Playwright navigation error quotes the whole address, and a sign-in link's carries its token, so
 * every query string is cut.
 * @param {unknown} error what the stand-in threw
 * @param {Date} at when it stopped
 * @returns {string} one JSON line, without the newline
 */
export function failureLine(error, at) {
  const message = error instanceof Error ? error.message : String(error);
  const reason = message.split('\n')[0].replace(/(https?:\/\/[^\s?"]+)\?[^\s"]*/g, '$1?[query removed]').slice(0, 400);
  return JSON.stringify({ kind: 'stand-in', action: 'failed', reason, at: at.toISOString() });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const runDir = process.argv[2];
  const env = process.env;
  if (!runDir || !env.GATE_SITE_NAME || !env.STALWART_PASSWORD_CAIRN_GATE) {
    console.error('Usage: GATE_SITE_NAME=<name> stand-in.mjs <run dir> (start it through run-gate.sh, which holds the mailbox password)');
    process.exitCode = 2;
  } else {
    const session = makeSession(env, { headed: process.argv.includes('--headed') });
    const owner = env.GATE_OWNER_EMAIL || 'cairn-gate@probe.907.life';
    try {
      const browser = await session.getBrowser();
      await runStandIn({ runDir, browser, creds: session.creds, signInOrigin: LIVE_ORIGIN, mail: { login: owner, password: env.STALWART_PASSWORD_CAIRN_GATE, siteName: env.GATE_SITE_NAME, owner } });
    } catch (error) {
      console.error(`stand-in failed: ${error instanceof Error ? error.message : String(error)}`);
      // A line in stand-in.jsonl too, so whoever watches that file sees the stand-in stop. Round four's
      // stand-in failed on a GitHub page and the run waited twelve minutes before anyone knew.
      const line = failureLine(error, new Date());
      await appendFile(path.join(runDir, 'stand-in.jsonl'), `${line}\n`, { mode: 0o600 }).catch(() => {});
      process.exitCode = 1;
    } finally {
      await session.close();
    }
  }
}
