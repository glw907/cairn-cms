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
// Spike-observed constraint (docs/internal/2026-08-10-t2-own-app-spike.md), pinned here so it is
// not later "simplified" away: the install redirect (request_oauth_on_install) lands on the
// FIRST registered callback URL verbatim, with no port-only leniency, which the manifest flow
// (Task 6) registered as this run's own ported loopback `/callback`. On a resumed run that port
// is long closed, so a second trip through the install page would dead-end on a browser tab that
// can never be reached. Poll-first is exactly how this module avoids that: a completed
// installation is detected here, before the install page is ever opened, and the resume instead
// goes through reauthorize's portless second callback entry, whose port-only loopback leniency
// (spike-confirmed) tolerates a fresh port on every run. On a FRESH run, the chapter orchestrator
// (chapter.mjs) closes that gap the other way: it shares one loopback across the manifest trip
// and this module's own install trip, so the port the App's manifest registered is still the
// port this module is listening on when the install redirect fires.
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

/**
 * @typedef {object} PollUntilInstalledInput
 * @property {number | string} appId the GitHub App id
 * @property {string} pem the App's PKCS#1 or PKCS#8 RSA private key, PEM-encoded
 * @property {string} owner the account login to look for
 * @property {string} dir the `--dir` value, interpolated into every raised error's message
 * @property {'user' | 'org'} ownerType who owns (or would own) the installation
 * @property {string} appName the App's display name, needed for the raised errors' copy
 * @property {string} clientId the App's OAuth client id
 * @property {string} clientSecret the App's OAuth client secret
 * @property {(url: string, log: (line: string) => void) => Promise<void>} openBrowser opens the
 *  admin's browser to the given URL, used by `reauthorize` once an installation is found
 * @property {(line: string) => void} log receives one printed line per call
 * @property {number} pollIntervalMs how long to wait between poll attempts
 * @property {number} maxWaitMs this phase's own poll budget
 */

/** The fallback poll's own heartbeat: printed once on entry (so a silent multi-minute wait never
 * looks hung) and again every POLL_HEARTBEAT_EVERY attempts, since a poll interval short enough
 * for a test can otherwise print nothing for the whole run. */
const POLL_HEARTBEAT_MESSAGE =
  'Still waiting for GitHub to report the installation; checking every few seconds. Leave this running.';
const POLL_HEARTBEAT_EVERY = 10;

/**
 * Fall back to JWT polling once the browser callback wait has timed out: this covers an admin
 * whose browser lost the redirect but who did complete the install, by checking for the
 * installation directly rather than waiting on a browser round trip that may never land. Checks
 * immediately (an install completed minutes ago is found on the first try), then re-checks every
 * `pollIntervalMs` until `maxWaitMs` elapses.
 * @param {PollUntilInstalledInput} input the poll's inputs
 * @returns {Promise<{ userToken: string, installationId: number }>} the token and installation id
 */
async function pollUntilInstalled({
  appId,
  pem,
  owner,
  dir,
  ownerType,
  appName,
  clientId,
  clientSecret,
  openBrowser,
  log,
  pollIntervalMs,
  maxWaitMs,
}) {
  const deadline = Date.now() + maxWaitMs;
  log(POLL_HEARTBEAT_MESSAGE);
  let attempt = 0;
  for (;;) {
    const found = await findInstallation({ appId, pem, owner, dir });
    if (found) {
      const userToken = await reauthorize({ clientId, clientSecret, dir, appName, openBrowser, log });
      return { userToken, installationId: found.id };
    }
    attempt += 1;
    if (attempt % POLL_HEARTBEAT_EVERY === 0) log(POLL_HEARTBEAT_MESSAGE);
    if (Date.now() >= deadline) break;
    await sleep(Math.min(pollIntervalMs, deadline - Date.now()));
  }
  if (ownerType === 'org') {
    throw chapterError('org-approval-pending', { org: owner, appName, dir });
  }
  throw chapterError('browser-step-abandoned', { step: 'install', appName, dir });
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
 * @property {number} [maxWaitMs] the browser callback wait's own timeout, and (independently) the
 *  post-timeout JWT poll fallback's own budget; defaults to ten minutes (five was too short for
 *  a first-time admin meeting a 2FA prompt partway through)
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

    let params;
    try {
      params = await loopback.waitFor('/callback', {
        timeoutMs: maxWaitMs,
        landingHtml:
          '<!doctype html><html><body><p>Step 2 of 2 is done: the App is installed and ' +
          'authorized. Return to the terminal.</p></body></html>',
      });
    } catch (err) {
      if (err.code !== 'LOOPBACK_TIMEOUT') throw err;
      return await pollUntilInstalled({
        appId,
        pem,
        owner,
        dir,
        ownerType,
        appName,
        clientId,
        clientSecret,
        openBrowser,
        log,
        pollIntervalMs,
        maxWaitMs,
      });
    }

    const code = params.get('code');
    const installationId = Number(params.get('installation_id'));
    const userToken = await exchangeCode({ clientId, clientSecret, code, dir });
    return { userToken, installationId };
  } finally {
    if (ownsLoopback) await loopback.close();
  }
}
