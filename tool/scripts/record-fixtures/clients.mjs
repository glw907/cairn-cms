// The two API clients. Both take their origins and their fetch by injection, so a test stands a
// local server in for the live services. Each guard throws before the request is sent, and no
// call follows a redirect.
import { assertTestIdentity } from './guards.mjs';
import { TIMEOUT_MS } from './recorder.mjs';

/**
 * @typedef {object} CallOptions
 * @property {unknown} [body] a JSON body
 * @property {string} [route] the corpus route slug; absent means the call is not recorded
 * @property {string} [caseName] the corpus case, `ok` when absent
 * @property {(json: any) => void} [hold] holds the values the body carries, before the body is scrubbed
 * @property {(json: any) => unknown} [keep] reduces the body before it is staged; the caller still gets the whole body
 */

/**
 * @param {object} deps
 * @param {typeof fetch} deps.fetcher the fetch
 * @param {() => Promise<unknown>} [deps.before] runs before the request is sent
 * @param {ReturnType<import('./recorder.mjs').createRecorder>} deps.recorder where bodies go
 * @param {'cloudflare' | 'github'} deps.provider the corpus directory
 */
async function send({ fetcher, before, recorder, provider }, url, method, headers, options, source) {
  if (before) await before();
  const started = performance.now();
  const response = await fetcher(url, {
    method,
    headers: { accept: 'application/json', ...(options.body === undefined ? {} : { 'content-type': 'application/json' }), ...headers },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    // A provider call never follows a redirect: a moved endpoint fails the call rather than
    // carrying the bearer token to wherever it points.
    redirect: 'error',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await response.text();
  const latencyMs = Math.round(performance.now() - started);
  const json = text ? JSON.parse(text) : null;
  options.hold?.(json);
  if (options.route) recorder.record({ provider, route: options.route, caseName: options.caseName ?? 'ok', status: response.status, source, body: options.keep ? options.keep(json) : json, latencyMs });
  return { status: response.status, json };
}

/**
 * The Cloudflare client.
 * @param {object} options
 * @param {string} options.base the API origin and prefix, `https://api.cloudflare.com/client/v4` live
 * @param {() => string} options.token the OAuth access token
 * @param {ReturnType<import('./guards.mjs').createGuards>} options.guards the write guard
 * @param {ReturnType<import('./recorder.mjs').createRecorder>} options.recorder the stager
 * @param {typeof fetch} [options.fetcher]
 * @returns {{ request: (method: string, path: string, options?: CallOptions) => Promise<{ status: number, json: any }> }}
 */
export function createCloudflare({ base, token, guards, recorder, fetcher = fetch }) {
  return {
    async request(method, path, options = {}) {
      guards.assertCloudflare(method, path, options.body);
      const deps = { fetcher, recorder, provider: /** @type {const} */ ('cloudflare') };
      return send(deps, `${base}${path}`, method, { authorization: `Bearer ${token()}` }, options, `${method} ${path.replace(/[0-9a-f]{32}/g, '{id}')}`);
    },
  };
}

/**
 * The GitHub client. Every write first proves the test token answers as the test account.
 * @param {object} options
 * @param {string} options.apiBase the API origin
 * @param {string} options.webBase the web origin, for the OAuth code exchange
 * @param {string} options.testToken the test account's token, used only for the identity check and the repository calls
 * @param {ReturnType<import('./recorder.mjs').createRecorder>} options.recorder the stager
 * @param {typeof fetch} [options.fetcher]
 * @returns {{ request: (method: string, path: string, options: CallOptions & { auth: string, web?: boolean }) => Promise<{ status: number, json: any }>, testToken: string }}
 */
export function createGithub({ apiBase, webBase, testToken, recorder, fetcher = fetch }) {
  return {
    testToken,
    async request(method, path, options) {
      const deps = {
        fetcher,
        recorder,
        provider: /** @type {const} */ ('github'),
        before: method === 'GET' ? undefined : () => assertTestIdentity(fetcher, apiBase, testToken),
      };
      const origin = options.web ? webBase : apiBase;
      return send(deps, `${origin}${path}`, method, { ...(options.auth ? { authorization: options.auth } : {}), 'x-github-api-version': '2022-11-28' }, options, `${method} ${path.replace(/\/\d+/g, '/{id}')}`);
    },
  };
}
