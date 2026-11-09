// A local HTTP server that stands in for Cloudflare's API and OAuth host and for GitHub's API and
// web host, so the recorder's tests never touch a live service. Its bodies are shaped like the
// live ones only as far as the recorder reads them; it proves the recorder's guards, ledger, scrub,
// and cleanup, not the platforms' contracts.
import { generateKeyPairSync } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';

export const ACCOUNT = 'abcdef0123456789abcdef0123456789';
export const ZONE = 'fedcba9876543210fedcba9876543210';
export const OTHER_ZONE = '0123456789abcdef0123456789abcdef';
export const EMAIL = 'geoff@example.com';
export const ESTATE_WORKER = 'estate-secret-worker';
/** A Worker name shorter than the scrubber's substring threshold. */
export const SHORT_WORKER = 'api';
/** The real names and inventory the fake's identity and inventory bodies carry; none may be staged. */
export const PERSONAL = {
  firstName: 'Geoffrey',
  lastName: 'Ward',
  telephone: '+1 907 555 0142',
  zipcode: '99501',
  organization: 'Ward Family Holdings',
  accountName: 'Estate Holdings Account',
  otherZone: 'estate-real.com',
  otherHost: 'www.estate-real.com',
  testHost: 'admin.carin-test.org',
  nameServer: 'burt.ns.cloudflare.com',
  registrar: 'pdr ltd. d/b/a publicdomainreg',
};
/** A DNS record's real content and comment; neither may be staged. */
export const DNS_CONTENT = 'google-site-verification=estate0123456789';
export const DNS_COMMENT = 'estate registrar verification';
export const TOKEN_VALUE = 'cfminted_tokenvalue_0123456789';
export const OAUTH_TOKEN = 'cfoauth_accesstoken_0123456789';
export const CLIENT_SECRET = 'app_client_secret_0123456789';
// Built at runtime so no token-shaped literal sits in the source.
const filler = 'x0123456789abcdefghijklmnopqrstuvwxyz'.slice(0, 36);
export const GH_USER_TOKEN = `ghu_${filler}`;
export const GH_REFRESH_TOKEN = `ghr_${filler}`;
export const GH_INSTALL_TOKEN = `ghs_${filler}`;
export const PEM = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs1', format: 'pem' }, publicKeyEncoding: { type: 'pkcs1', format: 'pem' } }).privateKey;

/** @param {number} n */
const tokenId = (n) => n.toString(16).padStart(32, 'a');

/**
 * @typedef {object} FakeOptions
 * @property {string} [identity] the login GitHub's `GET /user` answers
 * @property {boolean} [stubbornDb] a database delete is a no-op
 * @property {boolean} [stubbornApp] the App delete reports `deleted` and leaves the App standing
 * @property {string} [appOwner] the login a converted App names as its owner
 * @property {string} [installAccount] the login an installation names as its account
 * @property {number} [revokeStatus] what the OAuth revoke answers
 * @property {boolean} [verifyError] a bucket or repository read answers 503
 * @property {boolean} [leakKey] the D1 query body carries a personal-data field no shape removes
 * @property {string} [echo] a value the D1 query body carries, on a route no shape reduces
 * @property {'selected' | 'all'} [installSelection] the repository selection an installation answers
 * @property {number} [perPage] the token list's page size
 * @property {() => string | null} [ledgerFile] the ledger's path once the run has one
 */

/** @param {FakeOptions} [options] */
export async function startFake({
  identity = 'glw907-test', stubbornDb = false, stubbornApp = false, appOwner = 'glw907-test', installAccount = 'glw907-test',
  revokeStatus = 200, verifyError = false, leakKey = false, echo = '', installSelection = 'selected', perPage = 20, ledgerFile = () => null,
} = {}) {
  const state = {
    dbs: /** @type {{ uuid: string, name: string }[]} */ ([]),
    buckets: /** @type {string[]} */ ([]),
    tokens: /** @type {{ id: string, name: string, expires_on: string }[]} */ ([]),
    repos: /** @type {string[]} */ ([]),
    apps: /** @type {string[]} */ ([]),
    appIds: /** @type {Map<string, string>} */ (new Map()),
    cfWrites: /** @type {string[]} */ ([]),
    ghWrites: /** @type {string[]} */ ([]),
    mintBodies: /** @type {unknown[]} */ ([]),
    installRepos: /** @type {string[]} */ ([]),
    requests: 0,
    ledgerAtCreate: /** @type {boolean[]} */ ([]),
    revoked: 0,
    tokenSerial: 0,
  };
  const ledgerHas = (/** @type {string} */ name) => {
    const file = ledgerFile();
    return Boolean(file && existsSync(file) && readFileSync(file, 'utf8').includes(name));
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
    let m;

    if (path === '/dash/oauth2/auth') {
      const redirect = new URL(/** @type {string} */ (url.searchParams.get('redirect_uri')));
      redirect.search = new URLSearchParams({ code: 'cfcode', state: /** @type {string} */ (url.searchParams.get('state')) }).toString();
      return void res.writeHead(302, { location: redirect.toString() }).end();
    }
    if (path === '/dash/oauth2/token') return send(200, { access_token: OAUTH_TOKEN, token_type: 'bearer' });
    if (path === '/dash/oauth2/revoke') {
      state.revoked++;
      return send(revokeStatus, {});
    }

    if (path.startsWith('/cf/client/v4/')) {
      const p = path.slice('/cf/client/v4'.length);
      if (method !== 'GET') state.cfWrites.push(`${method} ${p}`);
      if (p === '/redirect') return void res.writeHead(302, { location: 'http://127.0.0.1:1/elsewhere' }).end();
      if (p === '/accounts') return send(200, { success: true, result: [{ id: ACCOUNT, name: PERSONAL.accountName, type: 'standard', settings: { enforce_twofactor: false } }] });
      if (p === '/user') {
        return send(200, {
          success: true,
          result: {
            id: 'u1', email: EMAIL, first_name: PERSONAL.firstName, last_name: PERSONAL.lastName, telephone: PERSONAL.telephone,
            zipcode: PERSONAL.zipcode, country: 'US', organizations: [{ id: 'o1', name: PERSONAL.organization }], suspended: false,
          },
        });
      }
      if (p === '/zones') {
        const zone = (/** @type {string} */ id, /** @type {string} */ name) => ({
          id, name, status: 'active', name_servers: [PERSONAL.nameServer], original_registrar: PERSONAL.registrar,
          account: { id: ACCOUNT, name: PERSONAL.accountName }, owner: { email: null }, plan: { name: 'Pro', price: 25 },
        });
        return send(200, { success: true, result: [zone(OTHER_ZONE, PERSONAL.otherZone), zone(ZONE, 'carin-test.org')], result_info: { page: 1, per_page: 20, total_pages: 1, count: 2, total_count: 2 } });
      }
      if (p === `/zones/${ZONE}/dns_records`) {
        return send(200, {
          success: true,
          result: [{
            id: 'r1', name: 'carin-test.org', type: 'TXT', content: DNS_CONTENT, comment: DNS_COMMENT, proxied: false, ttl: 1,
            proxiable: false, settings: {}, meta: {}, tags: ['owner:estate'], created_on: '2026-01-01T00:00:00Z',
          }],
        });
      }
      if (p === `/zones/${ZONE}/workers/routes`) return send(200, { success: true, result: [{ id: 'rt1', pattern: 'carin-test.org/*', script: SHORT_WORKER }] });
      if (p === `/accounts/${ACCOUNT}/workers/domains`) {
        return send(200, {
          success: true,
          result: [
            { id: 'd1', zone_id: ZONE, zone_name: 'carin-test.org', hostname: PERSONAL.testHost, service: ESTATE_WORKER, environment: 'production', cert_id: 'c1' },
            { id: 'd2', zone_id: OTHER_ZONE, zone_name: PERSONAL.otherZone, hostname: PERSONAL.otherHost, service: SHORT_WORKER, environment: 'production', cert_id: 'c2' },
          ],
          result_info: { page: 1, per_page: 20, count: 2, total_count: 2 },
        });
      }
      if (p === `/accounts/${ACCOUNT}/workers/scripts`) {
        return send(200, { success: true, result: [{ id: ESTATE_WORKER, tag: 't1', routes: [{ pattern: `${PERSONAL.otherHost}/*`, script: ESTATE_WORKER }] }, { id: SHORT_WORKER, tag: 't2' }] });
      }
      if (p === `/accounts/${ACCOUNT}/subscriptions`) {
        return send(200, { success: true, result: [{ id: 's1', state: 'Paid', price: 25, currency: 'USD', frequency: 'monthly', rate_plan: { id: 'pro', public_name: 'Pro Plan', scope: 'zone' }, zone: { id: OTHER_ZONE, name: PERSONAL.otherZone } }] });
      }
      if (p === `/accounts/${ACCOUNT}/d1/database` && method === 'GET') {
        // The live docs call the name filter a search, so the fake takes its loosest reading: a substring match.
        return send(200, { success: true, result: state.dbs.filter((d) => d.name.includes(url.searchParams.get('name') ?? '')) });
      }
      if (p === `/accounts/${ACCOUNT}/d1/database` && method === 'POST') {
        const { name } = json();
        state.ledgerAtCreate.push(ledgerHas(name));
        const db = { uuid: `00000000-0000-4000-8000-${String(state.dbs.length + 1).padStart(12, '0')}`, name };
        state.dbs.push(db);
        return send(200, { success: true, result: db });
      }
      if ((m = p.match(/^\/accounts\/[0-9a-f]+\/d1\/database\/([^/]+)(\/query)?$/))) {
        if (m[2]) return send(200, { success: true, result: [{ results: [{ n: 1, ...(echo ? { echo } : {}) }], ...(leakKey ? { telephone: 'x' } : {}) }] });
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
        if (method === 'DELETE') {
          state.buckets = state.buckets.filter((b) => b !== m[1]);
          return send(200, { success: true, result: {} });
        }
        if (verifyError) return send(503, { success: false, errors: [{ code: 10001 }] });
        return state.buckets.includes(m[1]) ? send(200, { success: true, result: { name: m[1] } }) : send(404, { success: false, errors: [{ code: 10006 }] });
      }
      if (p === '/user/tokens/permission_groups') return send(200, { success: true, result: [{ id: 'pg1', name: 'D1 Write' }, { id: 'pg2', name: 'Other' }] });
      if (p === '/user/tokens' && method === 'POST') {
        const body = json();
        state.ledgerAtCreate.push(ledgerHas(body.name));
        const id = tokenId(++state.tokenSerial);
        state.tokens.push({ id, name: body.name, expires_on: body.expires_on });
        return send(200, { success: true, result: { id, name: body.name, value: TOKEN_VALUE } });
      }
      if (p === '/user/tokens') {
        const size = Math.min(perPage, Number(url.searchParams.get('per_page') ?? perPage));
        const page = Number(url.searchParams.get('page') ?? 1);
        const total = Math.max(1, Math.ceil(state.tokens.length / size));
        return send(200, { success: true, result: state.tokens.slice((page - 1) * size, page * size), result_info: { page, per_page: size, total_pages: total, count: Math.min(size, state.tokens.length), total_count: state.tokens.length } });
      }
      if ((m = p.match(/^\/user\/tokens\/([^/]+)$/))) {
        const token = state.tokens.find((t) => t.id === m[1]);
        if (method === 'DELETE') {
          state.tokens = state.tokens.filter((t) => t.id !== m[1]);
          return send(200, { success: true, result: { id: m[1] } });
        }
        return token ? send(200, { success: true, result: { id: token.id, name: token.name } }) : send(404, { success: false, errors: [{ code: 1003 }] });
      }
      return send(404, { success: false });
    }

    if (path === '/ghweb/login/oauth/access_token') return send(200, { access_token: GH_USER_TOKEN, refresh_token: GH_REFRESH_TOKEN, token_type: 'bearer' });
    if (path.startsWith('/gh/')) {
      const p = path.slice('/gh'.length);
      if (p === '/user' && method === 'GET') return send(200, { login: identity });
      if (p === '/app' && method === 'GET') {
        // Decoded, not verified: the fake needs only the issuer to find the App.
        const payload = (req.headers.authorization ?? '').replace(/^Bearer /, '').split('.')[1] ?? '';
        const iss = String(JSON.parse(Buffer.from(payload, 'base64url').toString() || '{}').iss ?? '');
        const slug = state.appIds.get(iss);
        return slug && state.apps.includes(slug) ? send(200, { id: Number(iss), slug, owner: { login: appOwner } }) : send(404, { message: 'Integration not found' });
      }
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
        if (verifyError) return send(503, { message: 'Service Unavailable' });
        return state.repos.includes(m[1]) ? send(200, { name: m[1] }) : send(404, { message: 'Not Found' });
      }
      if (/^\/app-manifests\/[^/]+\/conversions$/.test(p)) {
        const id = String(4242 + state.appIds.size);
        const slug = /** @type {string} */ (state.apps.at(-1));
        state.appIds.set(id, slug);
        return send(201, { id: Number(id), slug, owner: { login: appOwner }, client_id: 'Iv1.abc', client_secret: CLIENT_SECRET, webhook_secret: 'whsec_0123456789', pem: PEM });
      }
      if (p === '/user/installations') return send(200, { total_count: 1, installations: [{ id: 77 }] });
      if (p === '/user/installations/77/repositories') return send(200, { total_count: 1, repositories: [] });
      if (p === '/app/installations' && method === 'GET') return send(200, [{ id: 77 }]);
      if (p === '/app/installations/77' && method === 'GET') return send(200, { id: 77, account: { login: installAccount }, repository_selection: installSelection });
      if (p === '/app/installations/77/access_tokens') {
        state.mintBodies.push(json());
        return send(201, { token: GH_INSTALL_TOKEN });
      }
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
      const { name } = /** @type {{ name: string }} */ (manifest);
      state.ledgerAtCreate.push(ledgerHas(name));
      state.apps.push(name);
      return { code: 'mcode' };
    },
    async installFlow(_slug, installState, repo) {
      state.installRepos.push(repo);
      return { installation_id: '77', state: installState };
    },
    authorizeFlow: async () => ({ code: 'ucode', redirectUri: 'http://127.0.0.1:1/callback' }),
    async deleteApp(slug) {
      const had = state.apps.includes(slug);
      if (!stubbornApp) state.apps = state.apps.filter((a) => a !== slug);
      return had ? 'deleted' : 'absent';
    },
    appStatus: async (slug) => (state.apps.includes(slug) ? 200 : 404),
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
