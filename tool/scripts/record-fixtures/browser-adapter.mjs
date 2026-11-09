// The live browser half: github.com driven as the test account through the gate's Playwright
// driver, imported lazily so a test that injects its own adapter never loads Playwright. The
// loopback pages end with the sentence the gate's driver waits for.
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { TEST_LOGIN } from './guards.mjs';

const DONE = '<!doctype html><meta charset="utf-8"><p>Recorded. Return to the terminal.</p>';
const STALE = '<!doctype html><meta charset="utf-8"><p>This callback does not match the flow in progress.</p>';

/** An OAuth or manifest code. */
export const CODE = /^[A-Za-z0-9_-]+$/;
/** A GitHub installation id. */
export const INSTALLATION_ID = /^\d+$/;

/**
 * The manifest the loopback page posts: the run's fields plus the loopback as every return URL.
 * `callback_urls` is what lets the user-authorize step return to the loopback.
 * @param {object} body the run's manifest fields
 * @param {string} redirectUri the loopback callback
 * @returns {object}
 */
export function buildManifest(body, redirectUri) {
  return { ...body, redirect_url: redirectUri, callback_urls: [redirectUri], setup_url: redirectUri, setup_on_update: false };
}

/**
 * Throw unless the browser is signed in as the test account.
 * @param {string | null | undefined} login the login the page names
 */
export function requireTestLogin(login) {
  if (login !== TEST_LOGIN) throw new Error(`Refused the browser flows: github.com is signed in as ${login ? 'another account' : 'nobody'}, not ${TEST_LOGIN}.`);
}

/**
 * The loopback's one pending flow. A callback resolves the flow only when its state is the flow's
 * and its parameters pass the flow's check; any other callback is ignored and the wait goes on.
 * @returns {{ expect: (state: string, check: (query: URLSearchParams) => boolean, waitMs?: number) => Promise<URLSearchParams>, offer: (query: URLSearchParams) => boolean, cancel: () => void }}
 */
export function createCallbackWaiter() {
  /** @type {{ state: string, check: (query: URLSearchParams) => boolean, settle: (query: URLSearchParams | null) => void } | null} */
  let pending = null;
  return {
    expect(state, check, waitMs = 300_000) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending = null;
          reject(new Error('The GitHub flow never reached the loopback callback.'));
        }, waitMs);
        timer.unref();
        pending = {
          state,
          check,
          settle(query) {
            clearTimeout(timer);
            pending = null;
            if (query) resolve(query);
            else reject(new Error('The GitHub flow was abandoned.'));
          },
        };
      });
    },
    offer(query) {
      if (!pending || query.get('state') !== pending.state || !pending.check(query)) return false;
      pending.settle(query);
      return true;
    },
    cancel() {
      pending?.settle(null);
    },
  };
}

/**
 * @param {{ env: Record<string, string | undefined>, stateDir: string, log: (line: string) => void }} options
 * @returns {Promise<import('./run.mjs').Adapter>}
 */
export async function createBrowserAdapter({ env, stateDir, log }) {
  const gate = await import('../../../scripts/gate/browser.mjs');
  const { totpFromEnv } = await import('../../../scripts/gate/totp.mjs');
  const creds = { login: /** @type {string} */ (env.GITHUB_TEST_LOGIN), password: /** @type {string} */ (env.GITHUB_TEST_PASSWORD), totp: () => totpFromEnv(env) };
  const launched = await gate.launchBrowser({ statePath: join(stateDir, 'github-session.json') });

  /** @param {string} path a github.com path @returns {Promise<{ status: number, login: string | null }>} */
  async function read(path) {
    const page = await launched.github.newPage();
    try {
      const response = await page.goto(`https://github.com${path}`, { waitUntil: 'load' });
      const login = await page.locator('meta[name="user-login"]').first().getAttribute('content', { timeout: 10_000 }).catch(() => null);
      return { status: response?.status() ?? 0, login };
    } finally {
      await page.close().catch(() => {});
    }
  }

  try {
    await gate.ensureGithubSession(launched.github, creds);
    requireTestLogin((await read('/')).login);
  } catch (error) {
    await launched.close().catch(() => {});
    throw error;
  }

  /** @type {object | null} */
  let manifest = null;
  let manifestState = '';
  const waiter = createCallbackWaiter();
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    if (url.pathname === '/manifest' && manifest) {
      const field = JSON.stringify(manifest).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(
        `<!doctype html><meta charset="utf-8"><form id="f" method="post" action="https://github.com/settings/apps/new?state=${manifestState}"><input type="hidden" name="manifest" value="${field}"><button>Create the GitHub App</button></form><script>document.getElementById('f').submit()</script>`,
      );
    } else if (url.pathname === '/callback') {
      if (waiter.offer(url.searchParams)) res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(DONE);
      else res.writeHead(400, { 'content-type': 'text/html; charset=utf-8' }).end(STALE);
    } else {
      res.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(undefined)));
  const origin = `http://127.0.0.1:${/** @type {import('node:net').AddressInfo} */ (server.address()).port}`;
  const redirectUri = `${origin}/callback`;

  /**
   * Open a URL in the driver and return the query of the loopback callback that matched the flow.
   * @param {string} url
   * @param {string} state the flow's state
   * @param {(query: URLSearchParams) => boolean} check the flow's parameter check
   */
  async function drive(url, state, check) {
    const arrived = waiter.expect(state, check);
    arrived.catch(() => {});
    try {
      await gate.handleUrl(url, { github: launched.github, admin: launched.newAdminContext, creds, leg: 'record', evidenceDir: join(stateDir, 'evidence'), log });
    } catch (error) {
      waiter.cancel();
      throw error;
    }
    return arrived;
  }

  return {
    async manifestFlow(body) {
      manifestState = randomBytes(16).toString('hex');
      manifest = buildManifest(body, redirectUri);
      const query = await drive(`${origin}/manifest`, manifestState, (q) => CODE.test(q.get('code') ?? ''));
      return { code: /** @type {string} */ (query.get('code')) };
    },
    async installFlow(slug, state) {
      const query = await drive(`https://github.com/apps/${slug}/installations/new?state=${encodeURIComponent(state)}`, state, (q) => INSTALLATION_ID.test(q.get('installation_id') ?? ''));
      return { installation_id: /** @type {string} */ (query.get('installation_id')), state: query.get('state') };
    },
    async authorizeFlow({ clientId, state }) {
      const url = new URL('https://github.com/login/oauth/authorize');
      url.search = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, state }).toString();
      const query = await drive(url.toString(), state, (q) => CODE.test(q.get('code') ?? ''));
      return { code: /** @type {string} */ (query.get('code')), redirectUri };
    },
    async deleteApp(slug) {
      const outcome = await gate.deleteGithubApp(launched.github, slug, creds);
      // The settings page click is not proof: only a 404 on the App's own settings page is.
      if (outcome === 'deleted' && (await read(`/settings/apps/${slug}`)).status !== 404) throw new Error(`GitHub App ${slug} still has a settings page after its delete.`);
      return outcome;
    },
    appStatus: async (slug) => (await read(`/settings/apps/${slug}`)).status,
    async close() {
      server.close();
      server.closeAllConnections();
      await launched.close();
    },
  };
}
