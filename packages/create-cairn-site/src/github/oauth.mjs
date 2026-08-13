// The OAuth code exchange and the resume path's re-authorize flow. This is the second (and, on
// a resumed run, the recurring) trip to GitHub: the manifest flow proved the App exists and
// handed back its client id and secret, and every later step (install, push) needs a user
// access token traded for a one-time code. exchangeCode is a DIRECT fetch, not routed through
// api.mjs's githubRequest: the token endpoint lives on webBase(), not apiBase(), and its default
// response is form-encoded rather than JSON, which is a different contract than every other call
// this tool makes (see api.mjs's own module comment for the same rule stated from that side).
import { randomBytes } from 'node:crypto';
import { startLoopback } from './loopback.mjs';
import { webBase } from './api.mjs';
import { chapterError } from './catalogue.mjs';

/**
 * @typedef {object} ExchangeCodeInput
 * @property {string} clientId the App's OAuth client id
 * @property {string} clientSecret the App's OAuth client secret
 * @property {string} code the one-time authorization code GitHub returned to the callback
 * @property {string} [redirectUri] the redirect_uri used on the matching authorize request; sent
 *  back only when the authorize step supplied one
 * @property {string} dir the `--dir` value, interpolated into a code-expired error's `Next:` line
 */

/**
 * Trade a one-time authorization code for a user access token.
 * @param {ExchangeCodeInput} input the exchange inputs
 * @returns {Promise<string>} the access token; never stored or logged by this module, only
 *  returned to the caller
 */
export async function exchangeCode({ clientId, clientSecret, code, redirectUri, dir }) {
  const response = await fetch(`${webBase()}/login/oauth/access_token`, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      ...(redirectUri ? { redirect_uri: redirectUri } : {}),
    }),
  });
  const json = await response.json();
  if (json.error === 'bad_verification_code') {
    throw chapterError('code-expired', { dir });
  }
  if (!json.access_token) {
    throw new Error(
      `github: the sign-in code exchange failed (${json.error ?? 'no access token in the response'}).\n` +
        `Next step: re-run npx create-cairn-site --dir ${dir}; if this repeats, run it with ` +
        '--start-over to begin the GitHub setup again.',
    );
  }
  return json.access_token;
}

/**
 * @typedef {object} AuthorizeUrlInput
 * @property {string} clientId the App's OAuth client id
 * @property {string} redirectUri the callback URL GitHub should redirect back to; must match one
 *  of the App's registered callback_urls (or the loopback's portless entry)
 * @property {string} state a per-run nonce, echoed back on the callback and verified there
 */

/**
 * Build GitHub's authorize URL for the OAuth browser step.
 * @param {AuthorizeUrlInput} input the URL's inputs
 * @returns {string} the full `<webBase>/login/oauth/authorize` URL
 */
export function authorizeUrl({ clientId, redirectUri, state }) {
  const url = new URL('/login/oauth/authorize', webBase());
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  return url.toString();
}

/**
 * @typedef {object} ReauthorizeInput
 * @property {string} clientId the App's OAuth client id
 * @property {string} clientSecret the App's OAuth client secret
 * @property {string} dir the `--dir` value, interpolated into every raised error's `Next:` line
 * @property {string} [appName] the App's display name, needed only for the timeout error's copy
 * @property {(url: string, log: (line: string) => void) => Promise<void>} openBrowser opens the
 *  admin's browser to the given URL
 * @property {(line: string) => void} log receives one printed line per call
 * @property {number} [timeoutMs] overrides the loopback wait's timeout; defaults to
 *  `startLoopback`'s own ten-minute default, and exists so a test can force a fast timeout
 */

/**
 * Re-authorize on a resumed run. The App is already installed and authorized from an earlier
 * run, so GitHub redirects straight back with no consent prompt to click through; this is the
 * resume path's own authorize/callback round trip, distinct from the manifest flow's.
 *
 * Spike-observed constraint (docs/internal/2026-08-10-t2-own-app-spike.md), pinned here so it is
 * not later "simplified" away: GitHub's loopback leniency for a registered portless callback URL
 * is PORT-ONLY, not path-flexible. The redirect_uri built here must use the exact path registered
 * in the manifest's callback_urls, `/callback`; any other path lands on GitHub's "Be careful!"
 * error page instead of redirecting.
 * @param {ReauthorizeInput} input the flow's inputs
 * @returns {Promise<string>} the access token
 */
export async function reauthorize({ clientId, clientSecret, dir, appName, openBrowser, log, timeoutMs }) {
  const loopback = await startLoopback();
  try {
    const state = randomBytes(16).toString('hex');
    const redirectUri = `${loopback.url}/callback`;
    const url = authorizeUrl({ clientId, redirectUri, state });

    await openBrowser(url, log);
    log('Waiting for the browser step to sign you in again... keep the browser window open.');

    let params;
    try {
      params = await loopback.waitFor('/callback', {
        timeoutMs,
        landingHtml:
          '<!doctype html><html><body><p>Signed in again. Return to the terminal.</p></body></html>',
      });
    } catch (err) {
      if (err.code === 'LOOPBACK_TIMEOUT') {
        throw chapterError('browser-step-abandoned', { step: 'install', dir, appName });
      }
      throw err;
    }

    if (params.get('state') !== state) {
      throw new Error(
        'The browser step returned a different state value than the one this run sent, which ' +
          'can mean the authorization link was intercepted or reused; nothing was collected.\n' +
          `Next step: re-run npx create-cairn-site --dir ${dir}.`,
      );
    }

    const code = params.get('code');
    if (!code) {
      // GitHub's own shape for a declined consent screen: the redirect still lands (and still
      // echoes state, checked above), but carries no code, only an error param. Only the
      // reconcile chapter's re-authorize trip can actually reach a live consent screen (chapter
      // 1's own call happens only once the App is already confirmed installed, which GitHub
      // never re-prompts for), so the builds-prefixed row is the right home for this even though
      // the check itself lives in the shared trip both chapters call.
      throw chapterError('builds-oauth-denied', { dir });
    }
    return await exchangeCode({ clientId, clientSecret, code, redirectUri, dir });
  } finally {
    await loopback.close();
  }
}
