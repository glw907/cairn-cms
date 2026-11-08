// Cloudflare's OAuth consent: PKCE S256, a loopback callback, and revoke. The callback answers
// with a page that closes its own tab; it never redirects anywhere.
import { createHash, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';

export const SCOPES = [
  'user-details.read', 'account-settings.read', 'zone.read', 'dns.write', 'workers-scripts.edit',
  'workers-routes.write', 'd1.write', 'workers-r2.write', 'email-sending.write', 'user-api-tokens.write', 'offline_access',
];
export const CALLBACK_PATH = '/cloudflare/callback';

const DONE_PAGE = '<!doctype html><meta charset="utf-8"><title>Connected</title><p>Cloudflare is connected. You can close this tab.</p><script>window.close()</script>';

/**
 * Run the consent: listen on loopback, open the authorize URL, and wait for the code.
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
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(DONE_PAGE);
    arrived(url.searchParams);
  });
  await new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(undefined)));
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
    if (query.get('state') !== state || !query.get('code')) throw new Error('The Cloudflare callback carried the wrong state or no code.');
    const response = await fetcher(`${dashBase}/oauth2/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', client_id: clientId, code: /** @type {string} */ (query.get('code')), redirect_uri: redirectUri, code_verifier: verifier }),
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
 * Revoke a token, as a probe: the outcome is recorded either way.
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
  });
  return response.status;
}
