// The loopback receiver: a short-lived local HTTP server that catches the browser redirects
// GitHub's device-code-free flows (manifest creation, OAuth) land after a step completes. It
// stays dependency-free and catalogue-free on purpose: every later chapter (manifest creation,
// install) maps its own LOOPBACK_TIMEOUT into its own error catalogue rather than this module
// reaching outward.
//
// Built on ../loopback-core.mjs's fixed, unprefixed mounts: GitHub bakes callback_urls and
// redirect_url at App-creation time, so this module mounts its three paths ('/', '/callback',
// '/manifest') fixed and unprefixed, never per-start prefixed (see loopback-core.mjs's own doc
// header for why). The core's Host allowlist now guards every request here too; a request whose
// Host header is not 127.0.0.1, localhost, or [::1] (each with an optional port) is refused with
// 403 before reaching any handler.
import { startLoopbackCore } from '../loopback-core.mjs';

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
export async function startLoopback() {
  const core = await startLoopbackCore();
  let formHtml = '';
  /** @type {PendingWait | null} */
  let pendingWait = null;

  /**
   * Build a fixed mount's handler: resolve the pending wait watching this exact pathname, or 404
   * when nothing is currently watching it.
   * @param {string} pathname the fixed path this handler is mounted at
   * @returns {import('../loopback-core.mjs').MountHandler} the mount handler
   */
  function pendingWaitHandler(pathname) {
    return (req, res, url) => {
      if (pendingWait && pathname === pendingWait.pathname) {
        const { landingHtml, resolve: resolveWait, timer } = pendingWait;
        clearTimeout(timer);
        pendingWait = null;
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end(landingHtml);
        resolveWait(url.searchParams);
        return;
      }
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('Not found');
    };
  }

  core.mount('/', (req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(formHtml);
  });
  core.mount('/callback', pendingWaitHandler('/callback'));
  core.mount('/manifest', pendingWaitHandler('/manifest'));

  return {
    port: core.port,
    url: core.url,
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
      return core.close();
    },
  };
}
