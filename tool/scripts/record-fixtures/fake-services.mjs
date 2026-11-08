// A local HTTP server that stands in for Cloudflare's API and OAuth host and for GitHub's API and
// web host, so the recorder's tests never touch a live service. Its bodies are shaped like the
// live ones only as far as the recorder reads them; it proves the recorder's guards, ledger, scrub,
// and cleanup, not the platforms' contracts.
import { generateKeyPairSync } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';

export const ACCOUNT = 'abcdef0123456789abcdef0123456789';
export const ZONE = 'fedcba9876543210fedcba9876543210';
export const EMAIL = 'geoff@example.com';
export const ESTATE_WORKER = 'estate-secret-worker';
export const TOKEN_VALUE = 'cfminted_tokenvalue_0123456789';
export const OAUTH_TOKEN = 'cfoauth_accesstoken_0123456789';
export const CLIENT_SECRET = 'app_client_secret_0123456789';
// Built at runtime so no token-shaped literal sits in the source.
const filler = 'x0123456789abcdefghijklmnopqrstuvwxyz'.slice(0, 36);
export const GH_USER_TOKEN = `ghu_${filler}`;
export const GH_REFRESH_TOKEN = `ghr_${filler}`;
export const GH_INSTALL_TOKEN = `ghs_${filler}`;
export const PEM = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs1', format: 'pem' }, publicKeyEncoding: { type: 'pkcs1', format: 'pem' } }).privateKey;

/**
 * @param {{ identity?: string, stubbornDb?: boolean, ledgerFile?: () => string | null }} [options]
 *  `identity` is the login `GET /user` answers on the GitHub side; `stubbornDb` makes a database
 *  delete a no-op; `ledgerFile` returns the ledger's path once the run has one
 */
export async function startFake({ identity = 'glw907-test', stubbornDb = false, ledgerFile = () => null } = {}) {
  const state = {
    dbs: /** @type {{ uuid: string, name: string }[]} */ ([]),
    buckets: /** @type {string[]} */ ([]),
    tokens: /** @type {{ id: string, name: string, expires_on: string }[]} */ ([]),
    repos: /** @type {string[]} */ ([]),
    apps: /** @type {string[]} */ ([]),
    cfWrites: /** @type {string[]} */ ([]),
    ghWrites: /** @type {string[]} */ ([]),
    requests: 0,
    ledgerAtCreate: /** @type {boolean[]} */ ([]),
    revoked: 0,
  };
  const server = createServer(async (req, res) => {
    state.requests++;
    const url = new URL(req.url ?? '/', 'http://x');
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString();
    const method = req.method ?? 'GET';
    const path = url.pathname;
    /** @type {(status: number, body?: unknown) => void} */
    const send = (status, body) => {
      res.writeHead(status, { 'content-type': 'application/json' }).end(body === undefined ? '' : JSON.stringify(body));
    };
    const json = () => (raw && raw.startsWith('{') ? JSON.parse(raw) : {});
    const ledgerHas = (/** @type {string} */ name) => {
      const file = ledgerFile();
      return Boolean(file && existsSync(file) && readFileSync(file, 'utf8').includes(name));
    };
    let m;

    if (path === '/dash/oauth2/auth') {
      const redirect = new URL(/** @type {string} */ (url.searchParams.get('redirect_uri')));
      redirect.search = new URLSearchParams({ code: 'cfcode', state: /** @type {string} */ (url.searchParams.get('state')) }).toString();
      return void res.writeHead(302, { location: redirect.toString() }).end();
    }
    if (path === '/dash/oauth2/token') return send(200, { access_token: OAUTH_TOKEN, token_type: 'bearer' });
    if (path === '/dash/oauth2/revoke') {
      state.revoked++;
      return send(200, {});
    }

    if (path.startsWith('/cf/client/v4/')) {
      const p = path.slice('/cf/client/v4'.length);
      if (method !== 'GET') state.cfWrites.push(`${method} ${p}`);
      if (p === '/accounts') return send(200, { success: true, result: [{ id: ACCOUNT, name: 'Estate' }] });
      if (p === '/user') return send(200, { success: true, result: { id: 'u1', email: EMAIL } });
      if (p === '/zones') return send(200, { success: true, result: [{ id: ZONE, name: 'carin-test.org' }] });
      if (p === `/zones/${ZONE}/dns_records`) return send(200, { success: true, result: [] });
      if (p === `/zones/${ZONE}/workers/routes`) return send(200, { success: true, result: [] });
      if (p === `/accounts/${ACCOUNT}/workers/domains`) return send(200, { success: true, result: [{ service: ESTATE_WORKER, hostname: 'x.carin-test.org' }] });
      if (p === `/accounts/${ACCOUNT}/workers/scripts`) return send(200, { success: true, result: [{ id: ESTATE_WORKER }] });
      if (p === `/accounts/${ACCOUNT}/subscriptions`) return send(200, { success: true, result: [] });
      if (p === `/accounts/${ACCOUNT}/d1/database` && method === 'GET') {
        return send(200, { success: true, result: state.dbs.filter((d) => d.name === url.searchParams.get('name')) });
      }
      if (p === `/accounts/${ACCOUNT}/d1/database` && method === 'POST') {
        const { name } = json();
        state.ledgerAtCreate.push(ledgerHas(name));
        const db = { uuid: `00000000-0000-4000-8000-${String(state.dbs.length + 1).padStart(12, '0')}`, name };
        state.dbs.push(db);
        return send(200, { success: true, result: db });
      }
      if ((m = p.match(/^\/accounts\/[0-9a-f]+\/d1\/database\/([^/]+)(\/query)?$/))) {
        if (m[2]) return send(200, { success: true, result: [{ results: [{ n: 1 }] }] });
        if (!stubbornDb) state.dbs = state.dbs.filter((d) => d.uuid !== m[1]);
        return send(200, { success: true, result: {} });
      }
      if (p === `/accounts/${ACCOUNT}/r2/buckets` && method === 'POST') {
        const { name } = json();
        state.ledgerAtCreate.push(ledgerHas(name));
        state.buckets.push(name);
        return send(200, { success: true, result: { name } });
      }
      if ((m = p.match(/^\/accounts\/[0-9a-f]+\/r2\/buckets\/([^/]+)$/))) {
        if (method === 'DELETE') state.buckets = state.buckets.filter((b) => b !== m[1]);
        return state.buckets.includes(m[1]) || method === 'DELETE' ? send(200, { success: true, result: { name: m[1] } }) : send(404, { success: false, errors: [{ code: 10006 }] });
      }
      if (p === '/user/tokens/permission_groups') return send(200, { success: true, result: [{ id: 'pg1', name: 'D1 Write' }, { id: 'pg2', name: 'Other' }] });
      if (p === '/user/tokens' && method === 'POST') {
        const body = json();
        state.ledgerAtCreate.push(ledgerHas(body.name));
        state.tokens.push({ id: `tok${state.tokens.length + 1}`, name: body.name, expires_on: body.expires_on });
        return send(200, { success: true, result: { id: `tok${state.tokens.length}`, name: body.name, value: TOKEN_VALUE } });
      }
      if (p === '/user/tokens') return send(200, { success: true, result: state.tokens });
      if ((m = p.match(/^\/user\/tokens\/([^/]+)$/))) {
        state.tokens = state.tokens.filter((t) => t.id !== m[1]);
        return send(200, { success: true, result: { id: m[1] } });
      }
      return send(404, { success: false });
    }

    if (path === '/ghweb/login/oauth/access_token') return send(200, { access_token: GH_USER_TOKEN, refresh_token: GH_REFRESH_TOKEN, token_type: 'bearer' });
    if ((m = path.match(/^\/ghweb\/apps\/([^/]+)$/))) return send(state.apps.includes(m[1]) ? 200 : 404, {});
    if (path.startsWith('/gh/')) {
      const p = path.slice('/gh'.length);
      if (p === '/user' && method === 'GET') return send(200, { login: identity });
      if (method !== 'GET') state.ghWrites.push(`${method} ${p}`);
      if (p === '/user/repos') {
        const { name } = json();
        state.ledgerAtCreate.push(ledgerHas(name));
        state.repos.push(name);
        return send(201, { name, full_name: `glw907-test/${name}` });
      }
      if ((m = p.match(/^\/repos\/glw907-test\/([^/]+)$/))) {
        if (method === 'DELETE') {
          state.repos = state.repos.filter((r) => r !== m[1]);
          return send(204);
        }
        return state.repos.includes(m[1]) ? send(200, { name: m[1] }) : send(404, { message: 'Not Found' });
      }
      if (/^\/app-manifests\/[^/]+\/conversions$/.test(p)) {
        return send(201, { id: 4242, slug: state.apps.at(-1), client_id: 'Iv1.abc', client_secret: CLIENT_SECRET, webhook_secret: 'whsec_0123456789', pem: PEM });
      }
      if (p === '/user/installations') return send(200, { total_count: 1, installations: [{ id: 77 }] });
      if (p === '/user/installations/77/repositories') return send(200, { total_count: 1, repositories: [] });
      if (p === '/app/installations' && method === 'GET') return send(200, [{ id: 77 }]);
      if (p === '/app/installations/77/access_tokens') return send(201, { token: GH_INSTALL_TOKEN });
      if (p === '/app/installations/77' && method === 'DELETE') return send(204);
      if (/\/actions\/secrets\/public-key$/.test(p)) return send(200, { key_id: 'k1', key: 'a2V5' });
      if (/\/actions\/secrets\/CLOUDFLARE_API_TOKEN$/.test(p)) return send(201);
      return send(404, { message: 'Not Found' });
    }
    return send(404, {});
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(undefined)));
  const origin = `http://127.0.0.1:${/** @type {import('node:net').AddressInfo} */ (server.address()).port}`;

  /** @returns {import('./run.mjs').Adapter} */
  const adapter = () => ({
    async manifestFlow(manifest) {
      state.apps.push(/** @type {{ name: string }} */ (manifest).name);
      return { code: 'mcode' };
    },
    installFlow: async (_slug, installState) => ({ installation_id: '77', state: installState }),
    authorizeFlow: async () => ({ code: 'ucode', redirectUri: 'http://127.0.0.1:1/callback' }),
    async deleteApp(slug) {
      const had = state.apps.includes(slug);
      state.apps = state.apps.filter((a) => a !== slug);
      return had ? 'deleted' : 'absent';
    },
    async close() {},
  });

  return {
    origin,
    state,
    adapter,
    bases: { cf: `${origin}/cf/client/v4`, dash: `${origin}/dash`, ghApi: `${origin}/gh`, ghWeb: `${origin}/ghweb` },
    close: () => {
      server.closeAllConnections();
      return new Promise((resolve) => server.close(resolve));
    },
  };
}

/** Follow the authorize redirect the way a browser would, landing on the recorder's callback. */
export const fakeBrowser = {
  /** @type {Response | null} */
  callbackResponse: null,
  /** @param {string} url */
  async open(url) {
    const authorize = await fetch(url, { redirect: 'manual' });
    this.callbackResponse = await fetch(/** @type {string} */ (authorize.headers.get('location')), { redirect: 'manual' });
  },
};
