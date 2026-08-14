// The console module's main entry: a ConsoleServerHandle (hold-loop.mjs's own contract) built
// over the loopback core. The console renders exactly two inputs, the state record and the hold
// loop's last observation, and never issues an API or DNS call at render time; the hold loop is
// the one probe owner (see hold-loop.mjs's own header). This module owns routing, the request
// lifecycle, and the grace window a hold's ending state (cleared or parked) is served through; a
// caller's renderView owns turning an observation and the record into a view's own body markup.
//
// A HOLD THAT ENDS WITHOUT CLEARING CAN STILL SERVE A PAGE. `stop` takes an optional park
// argument (`{ code, params }`); when the hold's last observation never cleared and a park was
// handed in, the console renders that catalogue code's own park page (park-pages.mjs) through the
// same grace window the cleared path already uses, rather than closing the socket at once. A
// cleared observation always wins over a park argument, which is why the check below reads
// `lastObservation` first: the two are mutually exclusive by construction (a caller only supplies
// `park` when the observation it is stopping on did not clear), but the priority is stated here
// rather than assumed at every call site.
import { startLoopbackCore } from '../loopback-core.mjs';
import { renderExitPage } from './exit-render.mjs';
import { renderParkPage } from './park-pages.mjs';
import { renderPage } from './render.mjs';

/**
 * How long the exit render stays up after its probe cleared, so an in-flight browser refresh
 * lands on it rather than a connection reset. "One fetch or a few seconds", per the design's own
 * wording: whichever comes first ends the window early.
 */
export const DEFAULT_EXIT_GRACE_MS = 3000;

/**
 * @typedef {import('../hold-loop.mjs').HoldObservation} HoldObservation
 */

/**
 * @typedef {object} ParkInfo
 * @property {string} code a wait-kind catalogue code (park-pages.mjs's own WAIT_KIND_CODES)
 * @property {Record<string, string | string[] | boolean>} params the row's own interpolation
 *  params, the same shape `cloudflareError` takes
 */

/**
 * @typedef {object} ConsoleView
 * @property {string} [title] the document title, defaults to the chapter label
 * @property {string} bodyHtml the view's own body markup
 * @property {number} [refreshSeconds] the meta-refresh interval this view renders at; omitted
 *  renders no refresh meta at all
 */

/**
 * @callback RenderView
 * @param {HoldObservation} observation the hold loop's last observation
 * @param {object} record the full state record, secrets included; a view reads it only through
 *  render.mjs's pickAllowlist, never a spread or JSON.stringify
 * @returns {ConsoleView} the page to render
 */

/**
 * Build a console server: the ConsoleServerHandle a hold's `waitForClear` composes with (see
 * hold-loop.mjs's own typedef). Nothing here calls an API or resolves DNS; every render reads
 * only `record` and whatever observation the loop last handed in through `update`.
 * @param {object} options
 * @param {string} options.chapter the current chapter label, printed in the header on every page
 * @param {string} options.hop the current hop title, printed in the header on every page
 * @param {object} options.record the full state record, passed through to `renderView` as is
 * @param {RenderView} options.renderView turns the last observation and the record into a page
 * @param {number} [options.graceMs] the exit render's grace window, defaults to
 *  DEFAULT_EXIT_GRACE_MS
 * @returns {{
 *   start: (observation: HoldObservation) => Promise<{ url: string }>,
 *   update: (observation: HoldObservation) => void,
 *   stop: (park?: ParkInfo) => Promise<void>,
 * }} the running console server
 */
export function createConsoleServer({ chapter, hop, record, renderView, graceMs = DEFAULT_EXIT_GRACE_MS }) {
  let core = null;
  let lastObservation = null;
  let exitMode = false;
  let parkInfo = null;
  let onRequestDuringGrace = null;

  /**
   * The console's single route, mounted under the start's own secret prefix. Renders the exit
   * page once the hold has cleared, the park page once the hold has ended un-cleared with a park
   * to show, otherwise the caller's own view. A view that throws still gets a safe generic page
   * rather than a stack trace: a view's own bug is exactly the kind of mistake that could
   * otherwise leak an interpolated record, so the failure path renders nothing the view produced.
   * @param {import('node:http').IncomingMessage} _req the incoming request, unused
   * @param {import('node:http').ServerResponse} res the response to write
   * @returns {void}
   */
  function handleRoot(_req, res) {
    if (exitMode) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(renderExitPage({ chapter, hop }));
      onRequestDuringGrace?.();
      return;
    }

    if (parkInfo) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(renderParkPage({ chapter, hop, code: parkInfo.code, params: parkInfo.params }));
      onRequestDuringGrace?.();
      return;
    }

    try {
      const view = renderView(lastObservation, record);
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(
        renderPage({
          chapter,
          hop,
          title: view.title,
          bodyHtml: view.bodyHtml,
          refreshSeconds: view.refreshSeconds,
        }),
      );
    } catch {
      res.writeHead(500, { 'content-type': 'text/html; charset=utf-8' });
      res.end(
        renderPage({
          chapter,
          hop,
          title: 'Console error',
          bodyHtml: '<p class="cairn-console-error">This page could not be rendered.</p>',
        }),
      );
    }
  }

  return {
    /**
     * Start the console: bind the loopback core, mount the console's one route under its secret
     * prefix, and hand back the URL a hold prints. Called at most once per hold, only once a
     * probe has already failed to clear.
     * @param {HoldObservation} observation the first observation to render
     * @returns {Promise<{ url: string }>} the console's base URL, secret prefix included
     */
    async start(observation) {
      lastObservation = observation;
      core = await startLoopbackCore();
      core.mountConsole('/', handleRoot);
      return { url: `${core.url}/${core.consolePrefix}` };
    },

    /**
     * Hand the console the loop's latest observation; the console never probes for itself.
     * @param {HoldObservation} observation the observation to render on the next request
     * @returns {void}
     */
    update(observation) {
      lastObservation = observation;
    },

    /**
     * Shut the console down. When the last observation handed in was the one that cleared the
     * hold, this serves the exit render through its grace window first (DEFAULT_EXIT_GRACE_MS, or
     * the `graceMs` override). Otherwise, when the caller hands in a `park`, it serves that
     * catalogue code's own park page through the same grace window before closing (View 3's
     * during-a-held-wait park: expiry, an interrupt, or a park-class outcome surfacing mid-hold,
     * all reach here through the hold loop's own `stopServer`). Absent both, it closes at once.
     * @param {ParkInfo} [park] the park to serve while the socket stays open through the grace
     *  window; ignored when the last observation cleared, since a cleared hold always shows the
     *  exit render instead
     * @returns {Promise<void>} resolves once the socket is closed
     */
    stop(park) {
      return new Promise((resolve) => {
        if (!core) {
          resolve();
          return;
        }
        const closingCore = core;
        core = null;

        if (lastObservation?.cleared) {
          exitMode = true;
        } else if (park) {
          parkInfo = park;
        } else {
          closingCore.close().then(resolve);
          return;
        }

        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          closingCore.close().then(resolve);
        };
        const timer = setTimeout(finish, graceMs);
        onRequestDuringGrace = () => {
          onRequestDuringGrace = null;
          setImmediate(finish);
        };
      });
    },
  };
}
