// The GitHub REST API wrapper. Every call this tool makes against api.github.com (manifest
// conversion excepted, since that endpoint takes no auth) goes through githubRequest, so the
// authorization header, JSON encoding, and non-2xx handling live in exactly one place. The base
// URL is read from the environment at call time, on every call, never cached at module load:
// a test sets CAIRN_GITHUB_API_BASE after this module is already imported and expects that
// value to take effect immediately, and the same call-time read lets a future retry or a second
// site's run change environments mid-process.
//
// Scope note: the OAuth token exchange (POST /login/oauth/access_token) does NOT go through
// this wrapper. It lives on webBase(), not apiBase(), and it needs `accept: application/json`
// since the endpoint's default response is form-encoded rather than JSON; the oauth module
// calls fetch directly for it instead of stretching this wrapper to cover a different host and
// a different default accept header.

/**
 * The GitHub REST API base URL, read from the environment at call time.
 * @returns {string} `CAIRN_GITHUB_API_BASE` when set (the test seam), else `https://api.github.com`
 */
export function apiBase() {
  return process.env.CAIRN_GITHUB_API_BASE || 'https://api.github.com';
}

/**
 * The GitHub web base URL (for the OAuth and App-install browser flows), read from the
 * environment at call time.
 * @returns {string} `CAIRN_GITHUB_WEB_BASE` when set (the test seam), else `https://github.com`
 */
export function webBase() {
  return process.env.CAIRN_GITHUB_WEB_BASE || 'https://github.com';
}

/**
 * @typedef {object} GithubRequestOptions
 * @property {string} [token] a bearer token (a user or installation access token); wins over
 *  `jwt` when both are given
 * @property {string} [jwt] an App JWT, used when `token` is not given
 * @property {unknown} [body] a JSON-serializable request body
 * @property {string} [accept] the `accept` header; defaults to `application/vnd.github+json`
 */

/**
 * @typedef {object} GithubResponse
 * @property {number} status the HTTP status code
 * @property {unknown} json the parsed JSON body, or `null` when the response body is empty or
 *  not valid JSON (for example a 204)
 */

/**
 * Call the GitHub REST API. Resolves for every response GitHub itself returns, including a
 * non-2xx status: this wrapper never inspects the status to decide success, since the error
 * catalogue that maps a status to a user-facing message belongs to the caller, not here. It
 * rejects only when the request never reaches GitHub at all (DNS failure, connection refused,
 * timeout).
 * @param {string} method the HTTP method
 * @param {string} path a path (or absolute URL) resolved against `apiBase()`
 * @param {GithubRequestOptions} [options] the request options
 * @returns {Promise<GithubResponse>} the status and parsed body
 */
export async function githubRequest(method, path, { token, jwt, body, accept = 'application/vnd.github+json' } = {}) {
  const url = new URL(path, apiBase());
  const headers = { accept };
  const credential = token ?? jwt;
  if (credential) headers.authorization = `Bearer ${credential}`;

  let requestBody;
  if (body !== undefined) {
    headers['content-type'] = 'application/json';
    requestBody = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(url, { method, headers, body: requestBody });
  } catch (cause) {
    throw new Error(`github: could not reach ${url} (${cause.code ?? cause.message})`, { cause });
  }

  const raw = await response.text();
  let json = null;
  if (raw) {
    try {
      json = JSON.parse(raw);
    } catch {
      json = null;
    }
  }
  return { status: response.status, json };
}
