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
// Only some catalogue rows accept a `detail` param for a Cloudflare-reported message
// (zone-create-failed, custom-domain-failed, and the two email rows); no dedicated row exists yet
// for a DNS-record call, so a DNS-record failure reports through dns-record-failed rather than
// borrowing the zone row: a partly written carry-over is a different situation from a zone that
// never got created, and the copy has to say so. See OPERATION_CODES.
//
// The Email Sending routes are the one exception to "keyed on HTTP status first": their 403 is
// read from the body rather than mapped to token-scope-missing, because the send's own refusal is
// a 403. The reasoning is at the discriminator in throwMapped.
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
//
// The Workers Builds routes (added T4c) are NOT threaded through OPERATION_CODES/throwMapped:
// the catalogue (docs/superpowers/plans/2026-08-12-create-cairn-site-t4c.md, Task 2) catalogued
// exactly the eight recoverable Builds conditions, a count a test guards, and none of them is a
// generic "this Builds call failed" row a genuinely unexpected failure could reuse (each row's
// copy is hardcoded, not built from a `detail` param the way zone-create-failed and its
// siblings are). throwBuildsMapped below is their parallel, smaller mapper: it still catches the
// two Builds-specific HTTP 404 authorization refusals and the family-agnostic 403/token-invalid
// rules, but falls back to a plain, redacted Error rather than inventing a ninth catalogue code.
import { cloudflareError } from './catalogue.mjs';

/**
 * The catalogue code an unmapped failure falls through to, per operation family.
 */
const OPERATION_CODES = {
  zone: 'zone-create-failed',
  dnsRecord: 'dns-record-failed',
  customDomain: 'custom-domain-failed',
  emailSubdomain: 'email-onboarding-failed',
  emailSend: 'email-send-failed',
};

/** The operation codes belonging to an Email Sending route, which throwMapped classifies apart. */
const EMAIL_OPERATION_CODES = new Set([OPERATION_CODES.emailSubdomain, OPERATION_CODES.emailSend]);

/**
 * Wording, not a code, because no numeric code for the entitlement refusal has been observed: the
 * account this was built against is on Workers Paid, so the condition was unreachable during the
 * 2026-08-12 spike and inventing a code would be a guess. The alternatives cover Cloudflare's
 * prose and its dotted-identifier style.
 */
const ENTITLEMENT_PATTERN = /workers[ _.]?paid|paid[ _.]?plan|not[ _.]?entitled|entitlement|subscription[ _.]?required/i;

/**
 * Cloudflare's code for a send refused because the sender domain is not enabled for Email
 * Sending, captured live 2026-08-12. It covers a domain that was never onboarded AND one whose
 * records are still settling; nothing in the body separates them, so the caller's own record of
 * when onboarding happened is the only discriminator.
 */
export const SENDING_DISABLED_CODE = 10203;

/**
 * A second Cloudflare code for a send refused over sender readiness, captured live 2026-08-12
 * alongside SENDING_DISABLED_CODE, carrying the dotted identifier
 * `email.sending.error.email.sender_not_configured`. It was observed only on domains that were
 * never onboarded, and not consistently even there (two domains with no sending subdomain entry
 * returned different codes); it was never observed on a domain that had just been onboarded.
 * email.mjs classifies it the same as SENDING_DISABLED_CODE, on the reasoning that both describe
 * the sender-not-ready family and this chapter only ever sends after a successful onboard.
 */
export const SENDER_NOT_CONFIGURED_CODE = 10204;

/**
 * HTTP 404 codes for the two Workers Builds GitHub-App authorization refusals, captured live
 * 2026-08-12/13 against the connections PUT (spike amendment 5,
 * docs/internal/2026-08-12-t4c-builds-spike.md): the owner's GitHub account has never
 * authorized Cloudflare's GitHub App at all (8000008), or the App is authorized but this
 * repository is not in its selection (8000012). Both are Pages-era codes reused for Builds, and
 * Cloudflare's own message text is factually wrong for this condition (spike amendment 6), so
 * the catalogue rows these map to never quote it back to the admin.
 */
export const BUILDS_APP_NOT_AUTHORIZED_CODE = 8000008;
export const BUILDS_REPO_NOT_SELECTED_CODE = 8000012;

/**
 * The most pages `getBuildLogs` will fetch for one build before giving up, rather than looping
 * forever against a `cursor` that keeps advancing (or, defensively, one that stops advancing but
 * keeps reporting `truncated: true`). A real build's log runs to at most a few hundred lines, so
 * this stays comfortably above any real log while still bounding the request count.
 */
const MAX_BUILD_LOG_PAGES = 50;

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
 * Throw `token-invalid` when a failed response carries either shape Cloudflare uses to say the
 * token itself is not usable, and return normally when it carries neither, leaving the caller's
 * own family-specific mapping to decide. Shared by `throwMapped` and `throwBuildsMapped`, which
 * apply these two rules identically; the 400 shape nests its real explanation one level down in
 * `error_chain`, which is the part worth reading off in exactly one place.
 * @param {number} status the HTTP status
 * @param {{ code?: number, message?: string, error_chain?: Array<{ message?: string }> }
 *  | undefined} primary the first entry of the response's `errors` array
 * @param {string} dir the `--dir` value, interpolated into the row
 * @param {string} token the API token, redacted from the thrown text
 * @param {{ status: number, code: number | undefined, id: string | undefined }} api the raw v4
 *  fields carried onto the thrown error
 * @returns {void}
 */
function throwIfTokenInvalid(status, primary, dir, token, api) {
  if (status === 400 && primary?.code === 6003) {
    const detail = primary.error_chain?.[0]?.message ?? primary.message;
    throwCatalogued('token-invalid', { dir, detail }, token, api);
  }
  if (status === 401 && primary?.code === 10000) {
    throwCatalogued('token-invalid', { dir, detail: primary.message }, token, api);
  }
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

  // `id` carries Cloudflare's dotted identifier (for example
  // "email.sending.error.email.sending_disabled"). A caller that catches a catalogued error never
  // sees the raw envelope, so any classification finer than the numeric code has to read it from
  // here. The Email Sending routes need exactly that, because conditions Cloudflare has not given
  // a distinct number are separable only by their identifier.
  const api = { status, code: primary?.code, id: primary?.message };

  // An Email Sending route's 403 is classified by its body, never by the blanket token rule below.
  // The send's own refusal (SENDING_DISABLED_CODE) arrives as HTTP 403, so the blanket rule would
  // tell an owner whose DNS is still settling that their API token is missing a permission, which
  // is both wrong and unactionable, and would hide the propagation park behind a scope error the
  // owner cannot fix. The cost of the trade is that an underscoped token hitting an email route
  // now lands on an email row instead of token-scope-missing. That is the right way round: the
  // refusal above is the only 403 the send has been observed to return, and a run cannot reach
  // these routes at all without a token that already passed validateToken.
  if (EMAIL_OPERATION_CODES.has(operationCode)) {
    if (ENTITLEMENT_PATTERN.test(combinedMessage)) {
      throwCatalogued('paid-plan-missing', { dir }, token, api);
    }
  } else if (status === 403) {
    const permission = extractPermission(combinedMessage);
    throwCatalogued('token-scope-missing', permission ? { dir, permission } : { dir }, token, api);
  }
  throwIfTokenInvalid(status, primary, dir, token, api);
  throwCatalogued(
    operationCode,
    combinedMessage ? { dir, detail: combinedMessage } : { dir },
    token,
    api,
  );
}

/**
 * Build and throw a catalogued error, with the token redacted from both its message and its
 * `catalogue.next` line.
 * @param {string} code a `cloudflareError` catalogue code
 * @param {Record<string, string>} params the row's interpolation params
 * @param {string} token the API token, redacted from the thrown text
 * @param {{ status: number, code: number | undefined, id: string | undefined }} api the raw v4
 *  status, `errors[0].code`, and `errors[0].message` as Cloudflare's dotted identifier, carried
 *  onto the thrown error so a caller can branch on the code rather than on Cloudflare's prose. A
 *  caller that matches free prose instead breaks silently the day Cloudflare rewords it, and the
 *  rewording ships without warning. The identifier is stable in a way the prose is not, so it is
 *  the right fallback where Cloudflare gave a condition no distinct number.
 * @returns {never}
 */
function throwCatalogued(code, params, token, api) {
  const err = cloudflareError(code, params);
  err.message = redactToken(err.message, token);
  err.catalogue.next = redactToken(err.catalogue.next, token);
  err.api = api;
  throw err;
}

/**
 * Map a failed Workers Builds response onto a catalogued or plain error and throw it. See the
 * module doc comment for why Builds routes carry their own smaller mapper rather than joining
 * OPERATION_CODES/throwMapped: the two Builds-specific 404 refusals and the family-agnostic
 * 403/token-invalid rules are still caught here, but anything else throws a plain error carrying
 * only the numeric code(s), never a catalogued one, since no catalogued Builds row exists to
 * reuse truthfully.
 *
 * The two refusal codes are matched against `errors.some(...)`, independent of both the error's
 * position in the array and the response's HTTP status (the T4c review's B3 finding): the spike
 * observed both as HTTP 404 with the refusal at `errors[0]`, but that was one observation, and a
 * warning ahead of the refusal, or Cloudflare re-statusing these Pages-era codes, must not make
 * the row fall through to the plain fallback below, which is the one branch that could otherwise
 * leak Cloudflare's own factually-wrong Pages prose (spike amendment 6).
 * @param {number} status the HTTP status
 * @param {unknown} json the parsed body
 * @param {string} dir the `--dir` value, interpolated into a catalogued row
 * @param {string} token the API token, redacted from the thrown text
 * @param {{ owner?: string, repo?: string }} [refusalParams] the owner/repo to interpolate into
 *  builds-repo-not-selected; only the connections PUT, the one route the two refusals were
 *  captured against, ever passes this
 * @returns {never}
 */
function throwBuildsMapped(status, json, dir, token, refusalParams = {}) {
  const errors = Array.isArray(json?.errors) ? json.errors : [];
  const primary = errors[0];
  const combinedMessage = errors.map((e) => e.message).filter(Boolean).join('; ');
  const api = { status, code: primary?.code, id: primary?.message };

  if (errors.some((e) => e.code === BUILDS_APP_NOT_AUTHORIZED_CODE)) {
    throwCatalogued('builds-app-not-authorized', { dir }, token, api);
  }
  if (errors.some((e) => e.code === BUILDS_REPO_NOT_SELECTED_CODE)) {
    throwCatalogued(
      'builds-repo-not-selected',
      { dir, owner: refusalParams.owner, repo: refusalParams.repo },
      token,
      api,
    );
  }
  if (status === 403) {
    const permission = extractPermission(combinedMessage);
    throwCatalogued('token-scope-missing', permission ? { dir, permission } : { dir }, token, api);
  }
  throwIfTokenInvalid(status, primary, dir, token, api);

  // No catalogued Builds row exists for anything else, and the platform's own message must never
  // reach the admin on a /builds/ route: both captured refusals were Pages-era prose that is
  // factually wrong for the condition they actually describe here, and there is no way to know in
  // general whether an unmapped Builds failure carries the same problem. So the fallback names
  // only the numeric code(s) Cloudflare returned, never `combinedMessage`.
  const codes = errors.map((e) => e.code).filter((code) => code !== undefined);
  const codeText = codes.length > 0 ? codes.join(', ') : 'unknown';
  const err = new Error(`Cloudflare Builds API error (HTTP ${status}, code ${codeText})`);
  err.api = api;
  throw err;
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
 *   listSendingSubdomains(zoneId: string): Promise<object[]>,
 *   createSendingSubdomain(zoneId: string, name: string): Promise<object>,
 *   sendMessage(message: { from: string, to: string, subject: string, text: string }): Promise<void>,
 *   verifyToken(): Promise<{ id: string, status: string }>,
 *   putBuildConnection(repo: { providerAccountId: string, providerAccountName: string, repoId: string, repoName: string }): Promise<object>,
 *   listBuildTriggers(workerTag: string): Promise<object[]>,
 *   createBuildTrigger(trigger: { workerTag: string, repoConnectionUuid: string, buildTokenUuid: string, triggerName?: string, branchIncludes?: string[], buildCommand?: string, deployCommand?: string }): Promise<object>,
 *   getBuildTokens(): Promise<object[]>,
 *   createBuildToken(token: { name: string, secret: string, cloudflareTokenId: string }): Promise<object>,
 *   findWorkerTag(workerName: string): Promise<string | undefined>,
 *   listBuildsForWorker(tag: string): Promise<object[]>,
 *   kickBuild(triggerUuid: string, branch: string): Promise<object>,
 *   getBuild(buildUuid: string): Promise<object>,
 *   getBuildLogs(buildUuid: string): Promise<object>,
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
   * Throw a mapped catalogued error when `status`/`json` is not a success; otherwise return.
   * Closes over this client's `dir` and `token`, which every mapped row needs and which never
   * vary per call.
   * @param {number} status
   * @param {unknown} json
   * @param {string} operationCode
   */
  function ensureSuccess(status, json, operationCode) {
    if (isSuccess(status, json)) return;
    throwMapped(status, json, operationCode, dir, token);
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
      ensureSuccess(status, json, operationCode);
      results.push(...(json.result ?? []));
      const info = json.result_info;
      if (!info || page >= info.total_pages || results.length >= info.total_count) break;
      page += 1;
    }
    return results;
  }

  /**
   * The Builds-family twin of `listPaginated`: same page-walking loop, but a failure routes
   * through `throwBuildsMapped` rather than `OPERATION_CODES`/`throwMapped` (see that
   * function's doc comment). Also tolerates a route with no `result_info` at all (the triggers
   * list, per the spike, returns a bare array), since the loop simply stops after page one when
   * `info` is absent.
   */
  async function listBuildsPaginated(basePath) {
    const results = [];
    let page = 1;
    for (;;) {
      const qs = buildQuery({ page });
      const { status, json } = await get(`${basePath}${qs}`);
      if (!isSuccess(status, json)) throwBuildsMapped(status, json, dir, token);
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
      ensureSuccess(status, json, OPERATION_CODES.zone);
      return json.result;
    },

    async getZone(zoneId) {
      const { status, json } = await get(`/zones/${zoneId}`);
      ensureSuccess(status, json, OPERATION_CODES.zone);
      return json.result;
    },

    async listZones({ name } = {}) {
      return listPaginated('/zones', { name }, OPERATION_CODES.zone);
    },

    async createDnsRecord(zoneId, record) {
      const { status, json } = await write('POST', `/zones/${zoneId}/dns_records`, record);
      ensureSuccess(status, json, OPERATION_CODES.dnsRecord);
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
      ensureSuccess(status, json, OPERATION_CODES.customDomain);
      return json.result;
    },

    async listCustomDomains() {
      return listPaginated(`/accounts/${accountId}/workers/domains`, {}, OPERATION_CODES.customDomain);
    },

    async listSendingSubdomains(zoneId) {
      return listPaginated(`/zones/${zoneId}/email/sending/subdomains`, {}, OPERATION_CODES.emailSubdomain);
    },

    // A write, so it is never retried: the caller lists first and creates only when no entry
    // matches, which is what keeps a resumed run from onboarding the same domain twice.
    async createSendingSubdomain(zoneId, name) {
      const { status, json } = await write('POST', `/zones/${zoneId}/email/sending/subdomains`, { name });
      ensureSuccess(status, json, OPERATION_CODES.emailSubdomain);
      return json.result;
    },

    // The result carries a message id and three delivery arrays that came back empty on every
    // live send, so nothing in it is worth returning: reaching the next line is the whole answer.
    async sendMessage({ from, to, subject, text }) {
      const { status, json } = await write('POST', `/accounts/${accountId}/email/sending/send`, {
        from,
        to,
        subject,
        text,
      });
      ensureSuccess(status, json, OPERATION_CODES.emailSend);
    },

    // --- Workers Builds ---------------------------------------------------------------------
    //
    // `GET /user/tokens/verify` is a bare user-scoped route, not under `/accounts/:id` (the
    // spike's fixture doc: docs/internal/2026-08-12-t4c-builds-spike.md). `result.id` is the
    // `cloudflare_token_id` the chapter needs when it registers the admin's own pasted token as
    // the build token.
    async verifyToken() {
      const { status, json } = await get('/user/tokens/verify');
      if (!isSuccess(status, json)) throwBuildsMapped(status, json, dir, token);
      return json.result;
    },

    // A true upsert (spike amendment 8): the identical PUT run twice returns the same
    // `repo_connection_uuid`, only `modified_on` advancing, which is what lets a caller adopt an
    // existing connection with no separate list route. `providerAccountName`/`repoName` are
    // carried through unconditionally so a `builds-repo-not-selected` refusal can name the repo.
    async putBuildConnection({ providerAccountId, providerAccountName, repoId, repoName }) {
      const { status, json } = await write('PUT', `/accounts/${accountId}/builds/repos/connections`, {
        provider_type: 'github',
        provider_account_id: providerAccountId,
        provider_account_name: providerAccountName,
        repo_id: repoId,
        repo_name: repoName,
      });
      if (!isSuccess(status, json)) {
        throwBuildsMapped(status, json, dir, token, { owner: providerAccountName, repo: repoName });
      }
      return json.result;
    },

    // Per worker, never account-wide (spike amendment 9): there is no other way to list a
    // repo's triggers, since there is no connections-list route either.
    async listBuildTriggers(workerTag) {
      return listBuildsPaginated(`/accounts/${accountId}/builds/workers/${workerTag}/triggers`);
    },

    async createBuildTrigger({
      workerTag,
      repoConnectionUuid,
      buildTokenUuid,
      triggerName,
      branchIncludes,
      buildCommand,
      deployCommand,
    }) {
      const { status, json } = await write('POST', `/accounts/${accountId}/builds/triggers`, {
        external_script_id: workerTag,
        repo_connection_uuid: repoConnectionUuid,
        build_token_uuid: buildTokenUuid,
        trigger_name: triggerName,
        branch_includes: branchIncludes,
        build_command: buildCommand,
        deploy_command: deployCommand,
      });
      if (!isSuccess(status, json)) throwBuildsMapped(status, json, dir, token);
      return json.result;
    },

    async getBuildTokens() {
      return listBuildsPaginated(`/accounts/${accountId}/builds/tokens`);
    },

    // The route REGISTERS a Cloudflare API token the caller already holds; it mints nothing
    // (spike Step 4). The chapter calls this with the admin's own pasted token and
    // `verifyToken()`'s `result.id`.
    async createBuildToken({ name, secret, cloudflareTokenId }) {
      const { status, json } = await write('POST', `/accounts/${accountId}/builds/tokens`, {
        build_token_name: name,
        build_token_secret: secret,
        cloudflare_token_id: cloudflareTokenId,
      });
      if (!isSuccess(status, json)) throwBuildsMapped(status, json, dir, token);
      return json.result;
    },

    // There is no id-based Workers Scripts lookup by name; the tag a Builds trigger needs is
    // read off the full list and matched on `id`, the script's own name.
    async findWorkerTag(workerName) {
      const scripts = await listBuildsPaginated(`/accounts/${accountId}/workers/scripts`);
      return scripts.find((script) => script.id === workerName)?.tag;
    },

    async listBuildsForWorker(tag) {
      return listBuildsPaginated(`/accounts/${accountId}/builds/workers/${tag}/builds`);
    },

    // The branch is REQUIRED in the body (spike amendment 9); Cloudflare 400s an empty body
    // with code 12002. The caller always has a branch to hand (the repo's default branch), so
    // this is a client-side contract check that never makes a request, not a mapped condition.
    async kickBuild(triggerUuid, branch) {
      if (!branch) {
        throw new Error('kickBuild requires a branch: Cloudflare rejects an empty-body kick with code 12002');
      }
      const { status, json } = await write('POST', `/accounts/${accountId}/builds/triggers/${triggerUuid}/builds`, { branch });
      if (!isSuccess(status, json)) throwBuildsMapped(status, json, dir, token);
      return json.result;
    },

    async getBuild(buildUuid) {
      const { status, json } = await get(`/accounts/${accountId}/builds/builds/${buildUuid}`);
      if (!isSuccess(status, json)) throwBuildsMapped(status, json, dir, token);
      return json.result;
    },

    // Pages the `cursor` the logs route returns until a page reports `truncated: false` (the
    // real end, per the captured shape), the cursor stops advancing, or MAX_BUILD_LOG_PAGES is
    // hit, concatenating every page's `lines` and `events` in the oldest-first order the route
    // already serves them in. The prior version read only page one and NEVER inspected `cursor`
    // or `truncated`, so a failed build with its actual error past the first page silently
    // printed the log's HEAD (build-environment setup chatter) under a heading that promised the
    // tail (T4c review finding B2). `cappedAtPageLimit` tells the caller the page cap, not the
    // log's real end, was reached, so a caller must not claim these are the log's true last lines.
    async getBuildLogs(buildUuid) {
      const lines = [];
      const events = [];
      let cursor;
      let page;
      let pagesRead = 0;
      let cappedAtPageLimit = false;
      for (;;) {
        const qs = buildQuery({ cursor });
        const { status, json } = await get(`/accounts/${accountId}/builds/builds/${buildUuid}/logs${qs}`);
        if (!isSuccess(status, json)) throwBuildsMapped(status, json, dir, token);
        page = json.result;
        pagesRead += 1;
        if (Array.isArray(page.lines)) lines.push(...page.lines);
        if (Array.isArray(page.events)) events.push(...page.events);
        if (!page.truncated) break;
        if (page.cursor === cursor || pagesRead >= MAX_BUILD_LOG_PAGES) {
          cappedAtPageLimit = true;
          break;
        }
        cursor = page.cursor;
      }
      return { ...page, lines, events, cappedAtPageLimit };
    },
  };
}
