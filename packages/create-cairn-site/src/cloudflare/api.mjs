// The Cloudflare REST API wrapper (client/v4). Every zone and DNS call chapter 2 makes goes
// through makeApi, so authorization, the v4 success envelope, error mapping onto the chapter's
// catalogue, and token redaction all live in exactly one place. The base URL is read from
// CAIRN_CLOUDFLARE_API_BASE at call time, on every call, never cached at module load, for the
// same reason src/github/api.mjs reads its base URL at call time: a test sets the env var after
// this module is already imported and expects the change to take effect immediately, and the
// same call-time read lets a retry or a second site's run change environments mid-process.
//
// Unlike src/github/api.mjs, this seam DOES interpret status codes: it maps a response onto one
// of the chapter's catalogued errors before ever handing control back to a caller, because the
// catalogue's whole point is that a run never surfaces a raw fetch error or an API's own error
// shape. The mapping is keyed on HTTP status first, and it was corrected 2026-08-11 by a spike
// against the live API (docs/internal/2026-08-11-t4a-domain-spike.md): the account-scoped
// zone-create refusal returns HTTP 403 with errors[0].code === 0 and the missing permission
// named in the message, not code 9109 as originally planned. Code 9109 is real, but observed on
// other resources (GET /user/tokens), so keying on it would miss the refusal this chapter hits
// most. The permission name is extracted from the message and passed to the
// token-scope-missing row, since it is the single most useful thing in the whole failure.
//
// Only two catalogue rows accept a `detail` param for a Cloudflare-reported message
// (zone-create-failed, custom-domain-failed); no dedicated row exists yet for a DNS-record
// call, so a DNS-record failure reports through dns-record-failed rather than borrowing the
// zone row: a partly written carry-over is a different situation from a zone that never got
// created, and the copy has to say so. See OPERATION_CODES.
//
// Retrying is GET-only, deliberately. A failed POST or PUT is reported to the caller and never
// retried automatically: a create or an attach that failed partway may or may not have taken
// effect on Cloudflare's side, and retrying blind risks a duplicate zone or a duplicate DNS
// record. The caller re-reads and reconciles instead. The one exception, a 429 on a GET, waits
// out Retry-After once and retries once; a second 429 is reported like any other failure rather
// than looped.
//
// redactToken scrubs every error message this seam constructs, and is exported so a caller can
// apply the same scrub to its own logging. A pasted API token must never reach a thrown error's
// text, because that text gets pasted into issues and screenshots.
import { cloudflareError } from './catalogue.mjs';

/**
 * The catalogue code an unmapped failure falls through to, per operation family.
 */
const OPERATION_CODES = {
  zone: 'zone-create-failed',
  dnsRecord: 'dns-record-failed',
  customDomain: 'custom-domain-failed',
};

/** How long to wait when a 429 carries no Retry-After header, in milliseconds. */
const DEFAULT_RETRY_AFTER_MS = 1000;

/**
 * The Cloudflare REST API base URL, read from the environment at call time.
 * @returns {string} `CAIRN_CLOUDFLARE_API_BASE` when set (the test seam), else
 *  `https://api.cloudflare.com/client/v4`
 */
export function apiBase() {
  return process.env.CAIRN_CLOUDFLARE_API_BASE || 'https://api.cloudflare.com/client/v4';
}

/**
 * Scrub every occurrence of a token from a message. Applied to the final constructed message,
 * not just to the raw API body, so no code path can forget to redact.
 * @param {string} message the text to scrub
 * @param {string} token the value to remove
 * @returns {string} `message` with every occurrence of `token` replaced by `[redacted]`
 */
export function redactToken(message, token) {
  if (typeof message !== 'string' || !token) return message;
  return message.split(token).join('[redacted]');
}

/**
 * Pull the permission name out of the account-scoped zone-create refusal's message
 * (`Requires permission "com.cloudflare.api.account.zone.create" ...`), the shape captured live
 * 2026-08-11. Returns `undefined` when the message carries no quoted permission, which is the
 * generic 403 shape (for example code 9109's "Unauthorized to access requested resource").
 * @param {string} message the combined error message
 * @returns {string | undefined} the permission name, or `undefined`
 */
function extractPermission(message) {
  const match = /permission\s+"([^"]+)"/i.exec(message ?? '');
  return match?.[1];
}

/**
 * Wait the given duration when no injected `sleep` is provided, the real-world default.
 * @param {number} ms milliseconds to wait
 * @returns {Promise<void>}
 */
function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(ms, 0)));
}

/**
 * Convert a `Retry-After` header value (seconds, per the HTTP spec) to milliseconds, falling
 * back to a fixed default when the header is absent or not a plain number.
 * @param {string | null} headerValue the raw header value
 * @returns {number} milliseconds to wait
 */
function parseRetryAfterMs(headerValue) {
  if (headerValue == null) return DEFAULT_RETRY_AFTER_MS;
  const seconds = Number(headerValue);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : DEFAULT_RETRY_AFTER_MS;
}

/** Read a response's body as JSON, falling back to `null` for an empty or malformed body. */
async function toResult(response) {
  const raw = await response.text();
  let json;
  try {
    json = JSON.parse(raw);
  } catch {
    json = null;
  }
  return { status: response.status, json };
}

/** Build a `?key=value` query string, skipping undefined, null, and empty values. */
function buildQuery(params) {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    usp.set(key, String(value));
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Call the Cloudflare REST API once, retrying exactly once, and only for a GET that comes back
 * 429, after waiting out `Retry-After`. Resolves for every response Cloudflare itself returns,
 * including a non-2xx status: the status/envelope inspection that decides success and maps a
 * failure onto the catalogue happens in `ensureSuccess`, not here.
 * @param {string} method the HTTP method
 * @param {string} path a path resolved against `apiBase()`
 * @param {{ token: string, body?: unknown, sleepFn: (ms: number) => Promise<void> }} options
 * @returns {Promise<{ status: number, json: unknown }>}
 */
async function cfFetch(method, path, { token, body, sleepFn }) {
  // apiBase() already carries a path (`/client/v4`), so `path` is concatenated onto it rather
  // than resolved against it as a second `new URL` argument: a leading-slash second argument
  // there replaces the whole path, which would silently drop `/client/v4`.
  const url = new URL(`${apiBase()}${path}`);
  const headers = { authorization: `Bearer ${token}`, accept: 'application/json' };
  let requestBody;
  if (body !== undefined) {
    headers['content-type'] = 'application/json';
    requestBody = JSON.stringify(body);
  }

  const response = await fetch(url, { method, headers, body: requestBody });
  if (response.status === 429 && method === 'GET') {
    const waitMs = parseRetryAfterMs(response.headers.get('retry-after'));
    await response.text();
    await sleepFn(waitMs);
    const retryResponse = await fetch(url, { method, headers, body: requestBody });
    return toResult(retryResponse);
  }
  return toResult(response);
}

/** Whether a response counts as success: an HTTP 2xx AND an explicit `success: true` envelope. */
function isSuccess(status, json) {
  return status >= 200 && status < 300 && json?.success === true;
}

/**
 * Map a failed response onto one of the chapter's catalogued errors and throw it, redacting the
 * token from the final message and from `catalogue.next`. Never returns.
 * @param {number} status the HTTP status
 * @param {unknown} json the parsed body (a v4 envelope, or `null` for an unparseable one)
 * @param {string} operationCode the catalogue code this operation falls back to when nothing
 *  more specific matches
 * @param {string} dir the `--dir` value, interpolated into every row
 * @param {string} token the API token, redacted from the thrown error's text
 * @returns {never}
 */
function throwMapped(status, json, operationCode, dir, token) {
  const errors = Array.isArray(json?.errors) ? json.errors : [];
  const primary = errors[0];
  const combinedMessage = errors.map((e) => e.message).filter(Boolean).join('; ');

  if (status === 403) {
    const permission = extractPermission(combinedMessage);
    throwCatalogued('token-scope-missing', permission ? { dir, permission } : { dir }, token);
  }
  if (status === 400 && primary?.code === 6003) {
    const detail = primary.error_chain?.[0]?.message ?? primary.message;
    throwCatalogued('token-invalid', { dir, detail }, token);
  }
  if (status === 401 && primary?.code === 10000) {
    throwCatalogued('token-invalid', { dir, detail: primary.message }, token);
  }
  throwCatalogued(operationCode, combinedMessage ? { dir, detail: combinedMessage } : { dir }, token);
}

/**
 * Build and throw a catalogued error, with the token redacted from both its message and its
 * `catalogue.next` line.
 * @param {string} code a `cloudflareError` catalogue code
 * @param {Record<string, string>} params the row's interpolation params
 * @param {string} token the API token, redacted from the thrown text
 * @returns {never}
 */
function throwCatalogued(code, params, token) {
  const err = cloudflareError(code, params);
  err.message = redactToken(err.message, token);
  err.catalogue.next = redactToken(err.catalogue.next, token);
  throw err;
}

/**
 * Throw a mapped catalogued error when `status`/`json` is not a success; otherwise return.
 * @param {number} status
 * @param {unknown} json
 * @param {string} operationCode
 * @param {string} dir
 * @param {string} token
 */
function ensureSuccess(status, json, operationCode, dir, token) {
  if (isSuccess(status, json)) return;
  throwMapped(status, json, operationCode, dir, token);
}

/**
 * Build the Cloudflare API client chapter 2 calls against. Every method reads
 * `CAIRN_CLOUDFLARE_API_BASE` at call time via `apiBase()`, never cached, so a test can point it
 * at a fake after this client is already built.
 * @param {object} options
 * @param {string} options.token the pasted Cloudflare API token
 * @param {string} options.accountId the Cloudflare account id
 * @param {string} options.dir the `--dir` value, interpolated into a catalogued error's `Next:`
 *  line
 * @param {(ms: number) => Promise<void>} [options.sleep] the wait used for the 429 retry;
 *  defaults to a real `setTimeout`-based sleep. A test injects a fast (or side-effecting)
 *  replacement so the 429 path never really waits.
 * @returns {{
 *   createZone(name: string): Promise<object>,
 *   getZone(zoneId: string): Promise<object>,
 *   listZones(filter?: { name?: string }): Promise<object[]>,
 *   createDnsRecord(zoneId: string, record: object): Promise<object>,
 *   listDnsRecords(zoneId: string): Promise<object[]>,
 *   attachCustomDomain(input: { hostname: string, zoneId: string, service: string, environment?: string }): Promise<object>,
 *   listCustomDomains(): Promise<object[]>,
 * }}
 */
export function makeApi({ token, accountId, dir, sleep = defaultSleep }) {
  async function get(path) {
    return cfFetch('GET', path, { token, sleepFn: sleep });
  }

  async function write(method, path, body) {
    return cfFetch(method, path, { token, body, sleepFn: sleep });
  }

  /**
   * Traverse every page of a v4 list route (via `result_info`) and return the concatenated
   * `result` arrays. A seam that reads only the first page fails against the fake, which
   * paginates for real.
   */
  async function listPaginated(basePath, query, operationCode) {
    const results = [];
    let page = 1;
    for (;;) {
      const qs = buildQuery({ ...query, page });
      const { status, json } = await get(`${basePath}${qs}`);
      ensureSuccess(status, json, operationCode, dir, token);
      results.push(...(json.result ?? []));
      const info = json.result_info;
      if (!info || page >= info.total_pages || results.length >= info.total_count) break;
      page += 1;
    }
    return results;
  }

  return {
    async createZone(name) {
      const { status, json } = await write('POST', '/zones', { name, account: { id: accountId } });
      ensureSuccess(status, json, OPERATION_CODES.zone, dir, token);
      return json.result;
    },

    async getZone(zoneId) {
      const { status, json } = await get(`/zones/${zoneId}`);
      ensureSuccess(status, json, OPERATION_CODES.zone, dir, token);
      return json.result;
    },

    async listZones({ name } = {}) {
      return listPaginated('/zones', { name }, OPERATION_CODES.zone);
    },

    async createDnsRecord(zoneId, record) {
      const { status, json } = await write('POST', `/zones/${zoneId}/dns_records`, record);
      ensureSuccess(status, json, OPERATION_CODES.dnsRecord, dir, token);
      return json.result;
    },

    async listDnsRecords(zoneId) {
      return listPaginated(`/zones/${zoneId}/dns_records`, {}, OPERATION_CODES.dnsRecord);
    },

    async attachCustomDomain({ hostname, zoneId, service, environment }) {
      const { status, json } = await write('PUT', `/accounts/${accountId}/workers/domains`, {
        hostname,
        zone_id: zoneId,
        service,
        environment,
      });
      ensureSuccess(status, json, OPERATION_CODES.customDomain, dir, token);
      return json.result;
    },

    async listCustomDomains() {
      return listPaginated(`/accounts/${accountId}/workers/domains`, {}, OPERATION_CODES.customDomain);
    },
  };
}
