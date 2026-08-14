// Shared HTTP plumbing for this package's fake services (test/fake-github.mjs,
// test/fake-cloudflare.mjs). Both fakes bind an ephemeral 127.0.0.1 port, route a request against
// a table of `{ method, regex, route, handler }` entries compiled from `/foo/:bar` path patterns,
// and write JSON responses; fake-cloudflare.mjs copied that plumbing wholesale from
// fake-github.mjs (T4d carry-forward 7), and the T4d console tests would otherwise mint a third
// and fourth copy. This module is the one place that plumbing lives now.
//
// Deliberately NOT unified here: request logging shape, request-body parsing strategy (GitHub's
// fake also unwraps a form-encoded `manifest` field; Cloudflare's is JSON-only), the not-found
// envelope (GitHub's fake echoes GitHub's bare `{ message }` shape; Cloudflare's echoes the v4
// `{ success, errors, messages, result }` envelope), and the handler argument list (GitHub's fake
// passes the request headers through to every handler; Cloudflare's does not). Each of those
// differences encodes a real difference between the two platforms' own APIs, so folding them into
// one shared dispatcher would either lose that fidelity or hide it behind a flag. A fake's own
// `makeHandler` stays local and composes the primitives below.
import { createServer } from 'node:http';

/**
 * Compile a `/foo/:bar/baz` path pattern into an anchored regex with named capture groups.
 * @param {string} pattern the path pattern; a `:name` segment becomes a `(?<name>[^/]+)` group
 * @returns {RegExp} the anchored regex
 */
export function compile(pattern) {
  const source = pattern.replace(/:[^/]+/g, (token) => `(?<${token.slice(1)}>[^/]+)`);
  return new RegExp(`^${source}$`);
}

/**
 * Match a request against a route table by method and path, in table order: the first entry
 * whose method matches and whose compiled pattern matches the pathname wins, and nothing beyond
 * that first match is inspected. A request that matches no entry, whether because the path is
 * unregistered or because the method is wrong for an otherwise-matching path, gets no match at
 * all; the caller is the one that turns that into a refusal response, so this function's own
 * contract is exact: it never falls back to a near-match.
 * @param {Array<{ method: string, regex: RegExp, route: string | null, handler: Function }>} routes
 * @param {string | undefined} method the request method
 * @param {string} pathname the request's URL pathname
 * @returns {{ match: { method: string, regex: RegExp, route: string | null, handler: Function } | null, params: Record<string, string> }}
 */
export function matchRoute(routes, method, pathname) {
  for (const candidate of routes) {
    if (candidate.method !== method) continue;
    const result = candidate.regex.exec(pathname);
    if (result) return { match: candidate, params: result.groups ?? {} };
  }
  return { match: null, params: {} };
}

/** Buffer a request body to a UTF-8 string. Resolves with `''` for a bodyless request. */
export function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/** Write a JSON response with the given status. */
export function sendJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

/**
 * Start an http.Server bound to an ephemeral 127.0.0.1-only port, with a mutable dispatcher so a
 * fake can learn its own base URL (needed to build response bodies like `html_url` or a Git Data
 * `url` field) before its route table exists, and wire the real dispatcher in once it does. A
 * request that arrives before `setDispatcher` is called gets a 503 under `notReadyMessage`,
 * mirroring the "not configured yet" shape both existing fakes served during their own
 * bind-then-wire window.
 * @param {string} [notReadyMessage] the message a pre-`setDispatcher` request sees, under a 503
 * @returns {Promise<{ base: string, setDispatcher: (dispatcher: (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => void | Promise<void>) => void, close: () => Promise<void> }>}
 *  `base` is `http://127.0.0.1:<port>`, the fake's own bound port
 */
export function startLoopbackServer(notReadyMessage = 'fake server: not ready yet') {
  return new Promise((resolve, reject) => {
    let dispatcher = (_req, res) => sendJson(res, 503, { message: notReadyMessage });
    const server = createServer((req, res) => dispatcher(req, res));
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      // listen(0, ...) always yields an AddressInfo object, never a string pipe name.
      const port = /** @type {import('node:net').AddressInfo} */ (address).port;
      resolve({
        base: `http://127.0.0.1:${port}`,
        setDispatcher(fn) {
          dispatcher = fn;
        },
        close() {
          return new Promise((resolveClose) => server.close(() => resolveClose()));
        }
      });
    });
  });
}
