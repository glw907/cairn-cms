// The install-and-authorize trip: the tool's second visit to GitHub, where the admin installs
// the App onto their account or organization and, via request_oauth_on_install, authorizes it
// in the same click. GitHub's own copy calls this page "Install & Authorize"; one browser trip
// delivers `code`, `installation_id`, and `setup_action=install` together on the callback.
//
// Poll-before-open is the load-bearing design here: every call polls GET /app/installations
// (App JWT auth) for an installation covering `owner` BEFORE it ever opens a browser. A resumed
// run whose install already completed skips the install page entirely and hands off straight to
// oauth.mjs's reauthorize, which re-runs the OAuth authorize/callback round trip with no consent
// prompt to click through.
//
// Once the install page IS opened, the browser callback wait and a second JWT poll run
// CONCURRENTLY from the start, first signal wins, rather than the poll only starting after the
// callback times out. This closes a live gap: on a resumed run the install redirect lands on the
// FIRST registered callback URL, carrying a dead port from an earlier run's own loopback (see the
// spike-observed constraint below), so the callback can never arrive even though the admin's
// install finishes in seconds. Racing the two from the start resolves that case in about one poll
// interval instead of the full maxWaitMs. When the callback wins instead (the common fresh-run
// case), the poll is cancelled and the happy path is unchanged: exchange the code and return.
//
// Spike-observed constraint (docs/internal/2026-08-10-t2-own-app-spike.md), pinned here so it is
// not later "simplified" away: the install redirect (request_oauth_on_install) lands on the
// FIRST registered callback URL verbatim, with no port-only leniency, which the manifest flow
// (Task 6) registered as this run's own ported loopback `/callback`. On a resumed run that port
// is long closed, so a second trip through the install page would dead-end on a browser tab that
// can never be reached; the concurrent poll above is exactly what recovers from that, well before
// the callback wait's own timeout. On a FRESH run, the chapter orchestrator (chapter.mjs) closes
// the gap the other way: it shares one loopback across the manifest trip and this module's own
// install trip, so the port the App's manifest registered is still the port this module is
// listening on when the install redirect fires.
import { startLoopback } from './loopback.mjs';
import { githubRequest, webBase } from './api.mjs';
import { appJwt } from './jwt.mjs';
import { chapterError } from './catalogue.mjs';
import { exchangeCode, reauthorize } from './oauth.mjs';

/**
 * Sleep for the given duration.
 * @param {number} ms milliseconds to wait; a non-positive value resolves on the next tick
 * @returns {Promise<void>} resolves after `ms` milliseconds
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(ms, 0)));
}

/**
 * Build the App's install page URL.
 * @param {string} appSlug the App's URL slug
 * @returns {string} `<webBase>/apps/<appSlug>/installations/new`
 */
export function installUrl(appSlug) {
  return `${webBase()}/apps/${appSlug}/installations/new`;
}

/**
 * @typedef {object} FindInstallationInput
 * @property {number | string} appId the GitHub App id, signed into the JWT's `iss` claim
 * @property {string} pem the App's PKCS#1 or PKCS#8 RSA private key, PEM-encoded
 * @property {string} owner the account login to look for among the App's installations
 * @property {string} dir the `--dir` value, interpolated into a bad-credentials error's message
 */

/**
 * Poll GET /app/installations (App JWT auth) for an installation whose account matches `owner`.
 * @param {FindInstallationInput} input the poll's inputs
 * @returns {Promise<object | null>} the matching installation row, or `null` when none exists yet
 */
async function findInstallation({ appId, pem, owner, dir }) {
  const jwt = appJwt(appId, pem);
  const { status, json } = await githubRequest('GET', '/app/installations', { jwt });
  if (status !== 200) {
    throw new Error(
      `github: GET /app/installations returned ${status}, which usually means this site's saved ` +
        "GitHub App identity is broken (a stale or corrupted App id and private key).\n" +
        `Next step: re-run npx create-cairn-site --dir ${dir} --start-over to set the broken ` +
        'record aside and register a new App.',
    );
  }
  return (Array.isArray(json) ? json : []).find((installation) => installation.account?.login === owner) ?? null;
}

/** The concurrent poll's own heartbeat, printed every POLL_HEARTBEAT_EVERY attempts. Never
 * printed on entry: the "waiting for the browser step" line printed just before the race starts
 * already covers that first moment, and a poll interval short enough for a test can otherwise
 * print nothing for the whole run. */
const POLL_HEARTBEAT_MESSAGE =
  'Still waiting for GitHub to report the installation; checking every few seconds. Leave this running.';
const POLL_HEARTBEAT_EVERY = 10;

/** Printed once, the moment the concurrent poll finds a matching installation before the browser
 * callback lands, so the admin understands why a second, quick browser step follows. */
const INSTALL_DETECTED_MESSAGE =
  'GitHub reports the installation is complete; finishing sign-in with one more quick browser step.';

/**
 * @typedef {object} CallbackSignalInput
 * @property {import('./loopback.mjs').Loopback} loopback the loopback receiver to wait on
 * @property {number} maxWaitMs how long to wait before giving up
 * @property {string} landingHtml the page served back once the callback lands
 */

/**
 * @typedef {object} CallbackSignal
 * @property {boolean} found whether the browser callback landed before `maxWaitMs` elapsed
 * @property {URLSearchParams} [params] the callback's query params, present only when `found`
 */

/**
 * Wait on the loopback's `/callback` for up to `maxWaitMs`, turning a `LOOPBACK_TIMEOUT` into a
 * plain negative signal instead of a rejection. This function always settles by resolving, never
 * by rejecting: the timeout is consumed by the `await` inside this same function's `try`/`catch`
 * regardless of which side of the outer race is still listening for the result, which is what
 * keeps an abandoned wait (the poll won the race instead) from ever producing an unhandled
 * rejection later, when its own timer eventually fires.
 * @param {CallbackSignalInput} input the wait's inputs
 * @returns {Promise<CallbackSignal>} the signal
 */
async function waitForCallbackSignal({ loopback, maxWaitMs, landingHtml }) {
  try {
    const params = await loopback.waitFor('/callback', { timeoutMs: maxWaitMs, landingHtml });
    return { found: true, params };
  } catch (err) {
    if (err.code !== 'LOOPBACK_TIMEOUT') throw err;
    return { found: false };
  }
}

/**
 * @typedef {object} PollForInstallationSignalInput
 * @property {number | string} appId the GitHub App id
 * @property {string} pem the App's PKCS#1 or PKCS#8 RSA private key, PEM-encoded
 * @property {string} owner the account login to look for
 * @property {string} dir the `--dir` value, interpolated into a bad-credentials error's message
 * @property {number} pollIntervalMs how long to wait between poll attempts
 * @property {number} maxWaitMs how long to keep polling before giving up
 * @property {(line: string) => void} log receives one printed line per periodic heartbeat
 */

/**
 * @typedef {object} PollSignal
 * @property {boolean} found whether a matching installation appeared before `maxWaitMs` elapsed
 *  or the poll was cancelled
 * @property {object} [installation] the matching installation row, present only when `found`
 */

/**
 * Poll GET /app/installations (App JWT auth) for an installation covering `owner`, running
 * alongside the browser callback wait (see this module's own header comment) rather than only
 * after it times out, so a completed install is detected within about one `pollIntervalMs`
 * instead of after the full `maxWaitMs` callback wait. The FIRST check happens only after one
 * `pollIntervalMs` has elapsed, not immediately: an in-flight `request_oauth_on_install` callback
 * already carries the OAuth code and needs no second browser bounce, so on a fresh run it should
 * win the race when both signals are genuinely close, and the initial delay gives it that window.
 * A resumed run (the case this poll actually exists for) never has a callback in flight at all, so
 * the delay costs it nothing. Re-checks every `pollIntervalMs` after that until `maxWaitMs`
 * elapses or `cancelled` is flipped true by the caller (the callback won the race instead).
 * @param {PollForInstallationSignalInput} input the poll's inputs
 * @param {{ value: boolean }} cancelled a mutable flag; the caller sets `value` true to stop
 *  polling early
 * @returns {Promise<PollSignal>} the signal
 */
async function pollForInstallationSignal({ appId, pem, owner, dir, pollIntervalMs, maxWaitMs, log }, cancelled) {
  const deadline = Date.now() + maxWaitMs;
  let attempt = 0;
  for (;;) {
    if (cancelled.value || Date.now() >= deadline) return { found: false };
    await sleep(Math.min(pollIntervalMs, deadline - Date.now()));
    if (cancelled.value) return { found: false };
    const found = await findInstallation({ appId, pem, owner, dir });
    if (found) return { found: true, installation: found };
    attempt += 1;
    if (attempt % POLL_HEARTBEAT_EVERY === 0) log(POLL_HEARTBEAT_MESSAGE);
  }
}

/**
 * @typedef {object} InstallAndAuthorizeInput
 * @property {number | string} appId the GitHub App id
 * @property {string} appSlug the App's URL slug, for the install page URL
 * @property {string} appName the App's display name, for printed copy and error messages
 * @property {string} clientId the App's OAuth client id
 * @property {string} clientSecret the App's OAuth client secret
 * @property {string} pem the App's PKCS#1 or PKCS#8 RSA private key, PEM-encoded
 * @property {string} owner the account login the App is being installed on
 * @property {'user' | 'org'} ownerType who owns the installation
 * @property {string} dir the `--dir` value, interpolated into every raised error's message
 * @property {(url: string, log: (line: string) => void) => Promise<void>} openBrowser opens the
 *  admin's browser to the given URL
 * @property {(line: string) => void} log receives one printed line per call
 * @property {number} [pollIntervalMs] how long to wait between JWT poll attempts; defaults to
 *  three seconds
 * @property {number} [maxWaitMs] the shared budget for both the browser callback wait and the
 *  concurrent JWT poll that races it; defaults to ten minutes (five was too short for a
 *  first-time admin meeting a 2FA prompt partway through)
 * @property {import('./loopback.mjs').Loopback} [loopback] a loopback to reuse rather than
 *  starting a fresh one; given by the chapter orchestrator, which shares one loopback across the
 *  manifest and install trips (see this module's own header comment for why). When given, this
 *  function does not close it; the caller owns that. Absent, this function starts and closes its
 *  own, for a caller (or a test) that only needs the install step in isolation.
 */

/**
 * Run the install-and-authorize trip: check whether the App is already installed for `owner`
 * (a resume), and if not, send the admin through GitHub's install page and collect the resulting
 * user access token and installation id.
 * @param {InstallAndAuthorizeInput} input the flow's inputs
 * @returns {Promise<{ userToken: string, installationId: number }>} the access token (never
 *  stored or logged by this module) and the installation's numeric id
 */
export async function installAndAuthorize({
  appId,
  appSlug,
  appName,
  clientId,
  clientSecret,
  pem,
  owner,
  ownerType,
  dir,
  openBrowser,
  log,
  pollIntervalMs = 3000,
  maxWaitMs = 600000,
  loopback: givenLoopback,
}) {
  const existing = await findInstallation({ appId, pem, owner, dir });
  if (existing) {
    const userToken = await reauthorize({ clientId, clientSecret, dir, appName, openBrowser, log });
    return { userToken, installationId: existing.id };
  }

  const loopback = givenLoopback ?? (await startLoopback());
  const ownsLoopback = !givenLoopback;
  try {
    log(`Your browser will open GitHub's install page for ${appName}; choose where to install it and approve.`);
    await openBrowser(installUrl(appSlug), log);
    log(
      `Waiting for the browser step to finish installing and authorizing ${appName}... keep the ` +
        `browser window open. (This machine is listening for GitHub's redirect on ${loopback.url}/callback.)`,
    );

    const cancelPoll = { value: false };
    const callbackSignal = waitForCallbackSignal({
      loopback,
      maxWaitMs,
      landingHtml:
        '<!doctype html><html><body><p>Step 2 of 2 is done: the App is installed and ' +
        'authorized. Return to the terminal.</p></body></html>',
    });
    const pollSignal = pollForInstallationSignal({ appId, pem, owner, dir, pollIntervalMs, maxWaitMs, log }, cancelPoll);

    const raced = await Promise.race([
      callbackSignal.then((result) => ({ source: 'callback', result })),
      pollSignal.then((result) => ({ source: 'poll', result })),
    ]);

    let callback;
    let poll;
    if (raced.source === 'callback' && raced.result.found) {
      cancelPoll.value = true;
      callback = raced.result;
      poll = { found: false };
      // pollSignal is abandoned here, not awaited: its outcome no longer matters once the
      // callback has already won, and a cancellation only stops the NEXT poll iteration, not a
      // findInstallation call already in flight (a JWT sign plus a round trip), which can still
      // reject later (a non-200 status, or the fake server closing once a test's own cleanup
      // runs). Promise.race already attaches its own handler to the derived promise fed into it
      // above, so that late rejection is not actually unhandled today; this explicit no-op catch
      // is belt-and-suspenders against a future refactor that races these two signals some other
      // way and loses that implicit protection.
      pollSignal.catch(() => {});
    } else if (raced.source === 'poll' && raced.result.found) {
      callback = { found: false };
      poll = raced.result;
      // Mirrors the guard above for the other side of the race.
      callbackSignal.catch(() => {});
    } else {
      // The first settlement was negative. That does not mean the other side has also concluded:
      // their independent deadlines (each Date.now() + maxWaitMs, computed a tick apart) can
      // differ by a few milliseconds, so wait for both before deciding neither arrived.
      [callback, poll] = await Promise.all([callbackSignal, pollSignal]);
      if (callback.found) cancelPoll.value = true;
    }

    if (callback.found) {
      const code = callback.params.get('code');
      const installationId = Number(callback.params.get('installation_id'));
      const userToken = await exchangeCode({ clientId, clientSecret, code, dir });
      return { userToken, installationId };
    }
    if (poll.found) {
      log(INSTALL_DETECTED_MESSAGE);
      const userToken = await reauthorize({ clientId, clientSecret, dir, appName, openBrowser, log });
      return { userToken, installationId: poll.installation.id };
    }
    if (ownerType === 'org') {
      throw chapterError('org-approval-pending', { org: owner, appName, dir });
    }
    throw chapterError('browser-step-abandoned', { step: 'install', appName, dir });
  } finally {
    if (ownsLoopback) await loopback.close();
  }
}
