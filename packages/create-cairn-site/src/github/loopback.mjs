// The loopback receiver: a short-lived local HTTP server that catches the browser redirects
// GitHub's device-code-free flows (manifest creation, OAuth) land after a step completes. It
// stays dependency-free and catalogue-free on purpose: every later chapter (manifest creation,
// install) maps its own LOOPBACK_TIMEOUT into its own error catalogue rather than this module
// reaching outward.

import http from 'node:http';

/**
 * @typedef {object} WaitForOptions
 * @property {number} [timeoutMs] how long to wait before rejecting, defaults to ten minutes
 * @property {string} landingHtml the page served to the browser that made the matching request
 */

/**
 * @typedef {object} Loopback
 * @property {number} port the bound ephemeral port
 * @property {string} url `http://127.0.0.1:<port>`, the base the browser is sent to
 * @property {(html: string) => void} serveForm set the body served at `/`
 * @property {(pathname: string, options: WaitForOptions) => Promise<URLSearchParams>} waitFor
 *  resolve with the query params of the first GET matching pathname
 * @property {() => Promise<void>} close stop the server and free the port
 */

/**
 * @typedef {object} PendingWait
 * @property {string} pathname the path this wait is watching for
 * @property {string} landingHtml the page served back once the path is hit
 * @property {(params: URLSearchParams) => void} resolve resolves the waitFor promise
 * @property {NodeJS.Timeout} timer the pending timeout, cleared on match or on close
 */

/**
 * Start the loopback receiver on an ephemeral, 127.0.0.1-only port.
 * @returns {Promise<Loopback>} the running receiver
 */
export function startLoopback() {
  return new Promise((resolve, reject) => {
    let formHtml = '';
    /** @type {PendingWait | null} */
    let pendingWait = null;

    const server = http.createServer((req, res) => {
      const requestUrl = new URL(req.url ?? '/', 'http://127.0.0.1');

      if (pendingWait && requestUrl.pathname === pendingWait.pathname) {
        const { landingHtml, resolve: resolveWait, timer } = pendingWait;
        clearTimeout(timer);
        pendingWait = null;
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end(landingHtml);
        resolveWait(requestUrl.searchParams);
        return;
      }

      if (requestUrl.pathname === '/') {
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end(formHtml);
        return;
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
        serveForm(html) {
          formHtml = html;
        },
        waitFor(pathname, { timeoutMs = 10 * 60 * 1000, landingHtml }) {
          return new Promise((resolveWait, rejectWait) => {
            const timer = setTimeout(() => {
              pendingWait = null;
              const timeoutError = new Error(`loopback: timed out waiting for ${pathname}`);
              timeoutError.code = 'LOOPBACK_TIMEOUT';
              rejectWait(timeoutError);
            }, timeoutMs);
            pendingWait = { pathname, landingHtml, resolve: resolveWait, timer };
          });
        },
        close() {
          if (pendingWait) {
            clearTimeout(pendingWait.timer);
            pendingWait = null;
          }
          return new Promise((resolveClose) => server.close(() => resolveClose()));
        },
      });
    });
  });
}
