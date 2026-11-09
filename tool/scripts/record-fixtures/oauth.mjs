// Cloudflare's OAuth consent: PKCE S256, a loopback callback, and revoke. The callback answers
// with a page that closes its own tab; it never redirects anywhere.
import { createHash, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';

// Only the scopes the run's calls need. The registered client offers no read-only scope for DNS
// records or Workers routes, so their list reads ride on the write scope.
export const SCOPES = [
  'user-details.read', // GET /user
  'account-settings.read', // GET /accounts, GET /accounts/{id}/subscriptions
  'zone.read', // GET /zones
  'dns.write', // GET /zones/{id}/dns_records
  'workers-scripts.edit', // GET /accounts/{id}/workers/scripts and /workers/domains
  'workers-routes.write', // GET /zones/{id}/workers/routes
  'd1.write', // the scratch database
  'workers-r2.write', // the scratch bucket
  'user-api-tokens.write', // the minted deploy key
];
export const CALLBACK_PATH = '/cloudflare/callback';

const DONE_PAGE = '<!doctype html><meta charset="utf-8"><title>Connected</title><p>Cloudflare is connected. You can close this tab.</p><script>window.close()</script>';
const STALE_PAGE = '<!doctype html><meta charset="utf-8"><title>Not this sign-in</title><p>This callback belongs to another consent. Use the tab the recorder opened last.</p>';

/**
 * Run the consent: listen on loopback, open the authorize URL, and wait for the code. A callback
 * whose state is not this consent's is answered and ignored, and the wait goes on.
 * @param {object} options
 * @param {string} options.dashBase Cloudflare's dashboard origin
 * @param {string} options.clientId the registered client id
 * @param {(url: string) => Promise<void> | void} options.openBrowser opens the URL in the operator's browser
 * @param {number} [options.port] the loopback port, 49152 unless a test picks one
 * @param {number} [options.waitMs] how long to wait for the callback
 * @param {typeof fetch} [options.fetcher]
 * @returns {Promise<{ accessToken: string }>}
 */
export async function consent({ dashBase, clientId, openBrowser, port = 49152, waitMs = 300_000, fetcher = fetch }) {
  const verifier = randomBytes(32).toString('base64url');
  const state = randomBytes(16).toString('base64url');
  /** @type {(query: URLSearchParams) => void} */
  let arrived = () => {};
  const callback = new Promise((resolve) => {
    arrived = resolve;
  });
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    if (url.pathname !== CALLBACK_PATH) {
      res.writeHead(404).end();
      return;
    }
    if (url.searchParams.get('state') !== state) {
      res.writeHead(400, { 'content-type': 'text/html; charset=utf-8' }).end(STALE_PAGE);
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(DONE_PAGE);
    arrived(url.searchParams);
  });
  await new Promise((resolve, reject) => {
    server.once('error', (/** @type {NodeJS.ErrnoException} */ error) => {
      reject(new Error(`The Cloudflare callback cannot listen on 127.0.0.1:${port} (${error.code ?? error.message}). Stop whatever holds the port and rerun.`));
    });
    server.listen(port, '127.0.0.1', () => resolve(undefined));
  });
  const redirectUri = `http://127.0.0.1:${/** @type {import('node:net').AddressInfo} */ (server.address()).port}${CALLBACK_PATH}`;
  try {
    const authorize = new URL(`${dashBase}/oauth2/auth`);
    authorize.search = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: SCOPES.join(' '),
      state,
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256',
    }).toString();
    await openBrowser(authorize.toString());
    const query = /** @type {URLSearchParams} */ (await Promise.race([
      callback,
      new Promise((_, reject) => setTimeout(() => reject(new Error('The Cloudflare consent never reached the callback.')), waitMs).unref()),
    ]));
    const code = query.get('code');
    if (!code) throw new Error(`The Cloudflare callback carried no code${query.get('error') ? ` (${query.get('error')})` : ''}.`);
    const response = await fetcher(`${dashBase}/oauth2/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', client_id: clientId, code, redirect_uri: redirectUri, code_verifier: verifier }),
      redirect: 'error',
    });
    const json = await response.json();
    if (!response.ok || !json.access_token) throw new Error(`The Cloudflare token exchange answered ${response.status}.`);
    return { accessToken: json.access_token };
  } finally {
    server.close();
    server.closeAllConnections();
  }
}

/**
 * Revoke a token. The caller records the status and fails the run on anything but a 2xx.
 * @param {string} dashBase Cloudflare's dashboard origin
 * @param {string} clientId the registered client id
 * @param {string} token the token to revoke
 * @param {typeof fetch} [fetcher]
 * @returns {Promise<number>} the HTTP status
 */
export async function revoke(dashBase, clientId, token, fetcher = fetch) {
  const response = await fetcher(`${dashBase}/oauth2/revoke`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token, client_id: clientId }),
    redirect: 'error',
  });
  return response.status;
}
