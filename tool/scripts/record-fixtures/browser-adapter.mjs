// The live browser half: github.com driven as the test account through the gate's Playwright
// driver, imported lazily so a test that injects its own adapter never loads Playwright. The
// loopback pages end with the sentence the gate's driver waits for.
import { createServer } from 'node:http';
import { join } from 'node:path';

const DONE = '<!doctype html><meta charset="utf-8"><p>Recorded. Return to the terminal.</p>';

/**
 * @param {{ env: Record<string, string | undefined>, stateDir: string, log: (line: string) => void }} options
 * @returns {Promise<import('./run.mjs').Adapter>}
 */
export async function createBrowserAdapter({ env, stateDir, log }) {
  const gate = await import('../../../scripts/gate/browser.mjs');
  const { totpFromEnv } = await import('../../../scripts/gate/totp.mjs');
  const creds = { login: /** @type {string} */ (env.GITHUB_TEST_LOGIN), password: /** @type {string} */ (env.GITHUB_TEST_PASSWORD), totp: () => totpFromEnv(env) };
  const launched = await gate.launchBrowser({ statePath: join(stateDir, 'github-session.json') });
  await gate.ensureGithubSession(launched.github, creds);

  /** @type {object | null} */
  let manifest = null;
  /** @type {((query: URLSearchParams) => void) | null} */
  let waiting = null;
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    if (url.pathname === '/manifest' && manifest) {
      const field = JSON.stringify(manifest).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(
        `<!doctype html><meta charset="utf-8"><form id="f" method="post" action="https://github.com/settings/apps/new"><input type="hidden" name="manifest" value="${field}"><button>Create the GitHub App</button></form><script>document.getElementById('f').submit()</script>`,
      );
    } else if (url.pathname === '/callback') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(DONE);
      waiting?.(url.searchParams);
    } else {
      res.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(undefined)));
  const origin = `http://127.0.0.1:${/** @type {import('node:net').AddressInfo} */ (server.address()).port}`;
  const redirectUri = `${origin}/callback`;

  /**
   * Open a URL in the driver and return the query the loopback callback received.
   * @param {string} url
   */
  async function drive(url) {
    const arrived = new Promise((resolve) => {
      waiting = resolve;
    });
    await gate.handleUrl(url, { github: launched.github, admin: launched.newAdminContext, creds, leg: 'record', evidenceDir: join(stateDir, 'evidence'), log });
    return /** @type {URLSearchParams} */ (await arrived);
  }

  return {
    async manifestFlow(body) {
      manifest = { ...body, redirect_url: redirectUri, setup_url: redirectUri, setup_on_update: false };
      const query = await drive(`${origin}/manifest`);
      return { code: /** @type {string} */ (query.get('code')) };
    },
    async installFlow(slug, state) {
      const query = await drive(`https://github.com/apps/${slug}/installations/new?state=${state}`);
      return { installation_id: /** @type {string} */ (query.get('installation_id')), state: query.get('state') };
    },
    async authorizeFlow({ clientId, state }) {
      const url = new URL('https://github.com/login/oauth/authorize');
      url.search = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, state }).toString();
      const query = await drive(url.toString());
      return { code: /** @type {string} */ (query.get('code')), redirectUri };
    },
    deleteApp: (slug) => gate.deleteGithubApp(launched.github, slug, creds),
    async close() {
      server.close();
      server.closeAllConnections();
      await launched.close();
    },
  };
}
