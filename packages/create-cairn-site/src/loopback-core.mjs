// The loopback core: shared plumbing for every localhost HTTP surface this tool serves during a
// run (GitHub's callback/manifest receiver in github/loopback.mjs, and the T4d console). It
// binds an ephemeral 127.0.0.1-only port, routes requests by an exact-path map, and enforces a
// Host header allowlist on every mount (127.0.0.1, localhost, [::1], each with an optional port;
// anything else is refused with 403 before any handler runs).
//
// Fixed mounts and console mounts are deliberately DISTINCT capabilities, never unified. A fixed
// mount (`mount`) registers at the exact, unprefixed path given, for a path baked into an
// external contract. GitHub's App manifest bakes callback_urls and redirect_url at App-creation
// time, and github/oauth.mjs's own ReauthorizeInput doc comment pins a spike-observed constraint:
// GitHub's loopback leniency for a registered portless callback is PORT-ONLY, never path-flexible,
// so reauthorize's redirect_uri must always land on the literal '/callback' path. A per-start
// prefix on that path would dead-end reauthorize for every App this tool has ever registered,
// including the inherited one. A console mount (`mountConsole`) registers beneath this start's
// own secret prefix (`randomBytes(16).toString('base64url')`), unguessable and unique per start;
// GitHub's own state nonce already guards the fixed routes, so the console's secret prefix is
// what stands in for that on routes with no such nonce of their own.
import http from 'node:http';
import { randomBytes } from 'node:crypto';

const HOST_ALLOWLIST = /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/i;

/**
 * Check a request's Host header against the loopback allowlist.
 * @param {string | undefined} host the raw Host header value
 * @returns {boolean} whether host is 127.0.0.1, localhost, or [::1], each with an optional port
 */
function isAllowedHost(host) {
  return typeof host === 'string' && HOST_ALLOWLIST.test(host);
}

/**
 * @callback MountHandler
 * @param {import('node:http').IncomingMessage} req the incoming request
 * @param {import('node:http').ServerResponse} res the response to write
 * @param {URL} url the parsed request URL (pathname and searchParams)
 * @returns {void}
 */

/**
 * @typedef {object} LoopbackCore
 * @property {number} port the bound ephemeral port
 * @property {string} url `http://127.0.0.1:<port>`, the base every mount is served under
 * @property {string} consolePrefix this start's secret path segment for console mounts
 * @property {(pathname: string, handler: MountHandler) => void} mount register a fixed,
 *  unprefixed route; reserved for paths baked into an external contract (GitHub's callback_urls)
 * @property {(subpath: string, handler: MountHandler) => void} mountConsole register a route
 *  beneath this start's secret consolePrefix; the same subpath requested without the prefix 404s
 * @property {() => Promise<void>} close stop the server and free the port
 */

/**
 * Start the loopback core on an ephemeral, 127.0.0.1-only port.
 * @returns {Promise<LoopbackCore>} the running core
 */
export function startLoopbackCore() {
  return new Promise((resolve, reject) => {
    /** @type {Map<string, MountHandler>} */
    const fixedRoutes = new Map();
    /** @type {Map<string, MountHandler>} */
    const consoleRoutes = new Map();
    const consolePrefix = randomBytes(16).toString('base64url');
    const consoleBase = `/${consolePrefix}`;

    const server = http.createServer((req, res) => {
      if (!isAllowedHost(req.headers.host)) {
        res.writeHead(403, { 'content-type': 'text/plain' });
        res.end('Forbidden');
        return;
      }

      const url = new URL(req.url ?? '/', 'http://127.0.0.1');
      const { pathname } = url;

      const fixedHandler = fixedRoutes.get(pathname);
      if (fixedHandler) {
        fixedHandler(req, res, url);
        return;
      }

      if (pathname === consoleBase || pathname.startsWith(`${consoleBase}/`)) {
        const subpath = pathname.slice(consoleBase.length) || '/';
        const consoleHandler = consoleRoutes.get(subpath);
        if (consoleHandler) {
          consoleHandler(req, res, url);
          return;
        }
      }

      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('Not found');
    });

    server.on('error', reject);

    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      // listen(0, ...) always yields an AddressInfo object, never a string pipe name.
      const port = /** @type {import('node:net').AddressInfo} */ (address).port;

      resolve({
        port,
        url: `http://127.0.0.1:${port}`,
        consolePrefix,
        mount(pathname, handler) {
          fixedRoutes.set(pathname, handler);
        },
        mountConsole(subpath, handler) {
          consoleRoutes.set(subpath, handler);
        },
        close() {
          return new Promise((resolveClose) => server.close(() => resolveClose()));
        },
      });
    });
  });
}
