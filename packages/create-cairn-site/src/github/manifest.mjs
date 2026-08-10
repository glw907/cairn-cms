// The manifest flow: the tool's first trip to GitHub. It builds a GitHub App manifest, serves
// it on the loopback as an auto-submitting form, waits for GitHub's redirect back with the
// one-time exchange code, and trades that code for the new App's credentials. This is the
// step that needs no standing OAuth client of its own: the App the admin creates here becomes
// its own OAuth client for every later step.
//
// Spike-observed constraints (docs/internal/2026-08-10-t2-own-app-spike.md), pinned by tests so
// neither is later "simplified" away:
//   - The install redirect (a later chapter step) uses the FIRST registered callback URL
//     verbatim. callback_urls therefore carries this run's own ported loopback URL first, and
//     the portless 'http://127.0.0.1/callback' second only as a resume fallback (port 80 is
//     unbindable by an unprivileged process, so it can never be the primary path). This is why
//     the chapter orchestrator (chapter.mjs) shares ONE loopback across the manifest trip and the
//     install trip: the install redirect needs this same port still open when it fires.
//   - hook_attributes.url is required by the manifest schema even for an App with no events;
//     omitting it produces GitHub's unhelpful "We didn't find an App Manifest" page rather than
//     a validation error. active: false keeps GitHub from ever calling the placeholder hook.
import { startLoopback } from './loopback.mjs';
import { githubRequest, webBase } from './api.mjs';
import { chapterError } from './catalogue.mjs';

const ENGINE_URL = 'https://github.com/glw907/cairn-cms';

/**
 * @typedef {object} ManifestInput
 * @property {string} appName the App's display name, as the admin will see it on GitHub
 * @property {string} siteName the site's display name, used only in printed copy
 * @property {'user' | 'org'} ownerType who will own the App
 * @property {string} loopbackUrl this run's bound loopback base URL (`http://127.0.0.1:<port>`)
 */

/**
 * @typedef {object} ManifestCredentials
 * @property {number} appId the created App's numeric id
 * @property {string} appSlug the created App's URL slug
 * @property {string} clientId the App's OAuth client id
 * @property {string} clientSecret the App's OAuth client secret
 * @property {string} pem the App's PKCS#1 RSA private key, PEM-encoded
 * @property {string} webhookSecret the App's webhook secret
 * @property {string} owner the login of the account the App was created under
 */

/**
 * Build the GitHub App manifest for this run.
 * @param {ManifestInput} input the values that vary per run
 * @returns {object} the manifest, ready to be JSON-encoded into the create-App form
 */
export function buildManifest({ appName, ownerType, loopbackUrl }) {
  return {
    name: appName,
    url: ENGINE_URL,
    redirect_url: `${loopbackUrl}/manifest`,
    callback_urls: [`${loopbackUrl}/callback`, 'http://127.0.0.1/callback'],
    hook_attributes: { url: ENGINE_URL, active: false },
    request_oauth_on_install: true,
    public: false,
    default_permissions: {
      contents: 'write',
      administration: 'write',
      ...(ownerType === 'org' ? { members: 'read' } : {}),
    },
    default_events: [],
  };
}

/**
 * HTML-escape a string for placement inside a double-quoted HTML attribute.
 * @param {string} value the raw text
 * @returns {string} the escaped text, safe for an attribute value
 */
function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Build the auto-submitting HTML page that posts a manifest to GitHub's create-App form. The
 * manifest travels as a hidden field's value, JSON-encoded and HTML-escaped; a script submits
 * the form immediately, with a visible button as the fallback for a browser that blocks the
 * auto-submit (and the same button is what the admin re-clicks after signing in, following the
 * spike-observed signed-out dead end).
 * @param {object} manifest the manifest built by `buildManifest`
 * @param {string} targetUrl the GitHub create-App URL from `manifestTarget`
 * @returns {string} the page's full HTML
 */
export function manifestFormHtml(manifest, targetUrl) {
  const manifestJson = escapeHtml(JSON.stringify(manifest));
  const action = escapeHtml(targetUrl);
  return (
    '<!doctype html>\n' +
    '<html>\n' +
    '<head><meta charset="utf-8"><title>Creating your GitHub App</title></head>\n' +
    '<body>\n' +
    `<form id="manifest-form" action="${action}" method="post">\n` +
    `<input type="hidden" name="manifest" value="${manifestJson}">\n` +
    '<button type="submit">Create the GitHub App</button>\n' +
    '</form>\n' +
    '<script>document.getElementById(\'manifest-form\').submit();</script>\n' +
    '</body>\n' +
    '</html>\n'
  );
}

/**
 * The GitHub URL that receives the manifest form POST.
 * @param {{ ownerType: 'user' | 'org', org?: string }} input who the App will belong to
 * @returns {string} `<webBase>/settings/apps/new` for a personal App, or
 *  `<webBase>/organizations/<org>/settings/apps/new` for an org App
 */
export function manifestTarget({ ownerType, org }) {
  if (ownerType === 'org') {
    return `${webBase()}/organizations/${org}/settings/apps/new`;
  }
  return `${webBase()}/settings/apps/new`;
}

/**
 * Run the manifest flow end to end: serve the auto-submit form on a loopback, open the admin's
 * browser to it, wait for GitHub's redirect back with the exchange code, and trade that code for
 * the new App's credentials.
 * @param {object} input the flow's inputs
 * @param {string} input.appName the App's display name
 * @param {string} input.siteName the site's display name, used only in printed copy
 * @param {'user' | 'org'} input.ownerType who will own the App
 * @param {string} [input.org] the org login, required when `ownerType` is `'org'`
 * @param {(url: string, log: (line: string) => void) => Promise<void>} input.openBrowser opens
 *  the admin's browser to the given URL
 * @param {(line: string) => void} input.log receives one printed line per call
 * @param {string} input.dir the `--dir` value, interpolated into every raised error's message
 * @param {number} [input.timeoutMs] overrides the loopback wait's timeout; defaults to
 *  `startLoopback`'s own ten-minute default, and exists so a test can force a fast timeout
 * @param {import('./loopback.mjs').Loopback} [input.loopback] a loopback to reuse rather than
 *  starting a fresh one; given by the chapter orchestrator, which shares one loopback across the
 *  manifest and install trips (see this module's own header comment for why). When given, this
 *  function does not close it; the caller owns that. Absent, this function starts and closes its
 *  own, for a caller (or a test) that only needs the manifest step in isolation.
 * @returns {Promise<ManifestCredentials>} the created App's credentials
 */
export async function runManifestFlow({ appName, siteName, ownerType, org, openBrowser, log, dir, timeoutMs, loopback: givenLoopback }) {
  const loopback = givenLoopback ?? (await startLoopback());
  const ownsLoopback = !givenLoopback;
  try {
    const manifest = buildManifest({ appName, siteName, ownerType, loopbackUrl: loopback.url });
    const targetUrl = manifestTarget({ ownerType, org });
    loopback.serveForm(manifestFormHtml(manifest, targetUrl));

    log(
      `Your browser will open GitHub's "Create GitHub App" page for ${siteName}; click the ` +
        `"Create the GitHub App" button there to create ${appName}.\n` +
        'Sign in to GitHub first if you are not already. A signed-out click lands on ' +
        '"We didn\'t find an App Manifest for your request"; if you see that page, sign in, ' +
        'then return to this browser tab and click the button again (it stays open).',
    );
    await openBrowser(loopback.url, log);
    log(
      `Waiting for the browser step to finish creating ${appName}... keep the browser window ` +
        'open.\n' +
        `If GitHub says the name "${appName}" is already taken, press Ctrl+C and re-run with ` +
        '--app-name <a-new-name>.',
    );

    let params;
    try {
      params = await loopback.waitFor('/manifest', {
        timeoutMs,
        landingHtml:
          '<!doctype html><html><body><p>Step 1 of 2 is done: your GitHub App has been ' +
          'created. Return to the terminal.</p></body></html>',
      });
    } catch (err) {
      if (err.code === 'LOOPBACK_TIMEOUT') {
        throw chapterError('browser-step-abandoned', { step: 'manifest', appName, webBase: webBase(), dir });
      }
      throw err;
    }

    const code = params.get('code');
    const { status, json } = await githubRequest('POST', `/app-manifests/${code}/conversions`);
    if (status === 404) {
      throw chapterError('manifest-window-expired', { appName, webBase: webBase(), dir });
    }

    return {
      appId: json.id,
      appSlug: json.slug,
      clientId: json.client_id,
      clientSecret: json.client_secret,
      pem: json.pem,
      webhookSecret: json.webhook_secret,
      owner: json.owner.login,
    };
  } finally {
    if (ownsLoopback) await loopback.close();
  }
}
