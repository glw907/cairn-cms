// The doctor's opt-in live probe (--probe): one GET and one POST against a deployed admin,
// asserting the envelope a working sign-in presents. Zero side effects by construction: the
// POST submits a random non-editor address, and the engine's non-leak design answers a
// non-editor with the identical sent body while sending no email and minting no token, so the
// probe leaves nothing behind on the site. A factory rather than a check constant, the same
// shape as the live send: the check exists only when the bin receives --probe.
import { fail, info, pass, skip } from './types.js';
import type { CheckResult, DoctorCheck, DoctorContext } from './types.js';
import { csrfCookieName } from '../auth/crypto.js';
import { csrfSecure } from '../sveltekit/csrf.js';
import { isLocalHost } from '../dev-flag.js';
import { cfGet } from './cloudflare-api.js';
import { readWranglerConfig } from './wrangler-config.js';

/** A 30x status this probe treats as a redirect worth classifying, rather than a bare non-200. */
const GATE_REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
/** A `Location` host shaped like Cloudflare Access's own hostname (`<team>.cloudflareaccess.com`). */
const ACCESS_HOST = /^[a-z0-9-]+\.cloudflareaccess\.com$/i;
/** The wrangler config `name`'s valid shape for a workers.dev subdomain label. */
const WORKER_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/i;
/**
 * Every network call this check issues carries this bound, so a hung deploy fails the check
 *  rather than hanging the whole doctor run.
 */
const PROBE_TIMEOUT_MS = 10_000;

const NO_URL: CheckResult = skip(
  'pass --probe <url>, set PUBLIC_ORIGIN in the wrangler vars, or set PUBLIC_ORIGIN in the environment'
);

/** Build the live-probe check. A missing url falls back to the PUBLIC_ORIGIN input at run time. */
export function liveProbeCheck(url?: string): DoctorCheck {
  return {
    id: 'admin.login-probe',
    conditionId: 'admin.login-probe-failed',
    title: 'Live admin login probe',
    async run(ctx: DoctorContext): Promise<CheckResult> {
      // The wrangler vars hold the value the deployed Worker reads, so they beat the local
      // environment, the same precedence the public-origin check applies.
      const base =
        url ?? (await readWranglerConfig(ctx.readFile))?.publicOrigin ?? ctx.publicOrigin;
      if (base === undefined) return NO_URL;
      let origin: URL;
      try {
        origin = new URL(base);
      } catch {
        return fail(`probe URL does not parse: ${base}`);
      }
      // The two arms run independently: a thrown primary fetch (a DNS failure, a timeout) must
      // never suppress the workers.dev arm, since that arm's own exposure finding is a real gap
      // regardless of whether the primary probe itself could complete.
      const primary = await runPrimary(ctx, origin);
      const { exposure, skipNote } = await probeWorkersDevExposure(ctx, origin, primary.sawGate);
      if (exposure !== null) {
        // A failing primary probe is never downgraded by the arm's own info result: an info
        // exposure finding does not disprove a broken primary, so the fail must win. Reported
        // with the exposure detail appended, since both facts are more informative together
        // than either alone.
        if (primary.result.status === 'fail') {
          return fail(`${primary.result.detail}; ${exposure.detail}`);
        }
        return exposure;
      }
      // A missing credential or a failed subdomain lookup means the arm never ran at all, a
      // state indistinguishable from "ran and found nothing" unless the primary detail says
      // so; the note rides on any non-fail primary result, not only a pass.
      if (skipNote !== undefined && primary.result.status !== 'fail') {
        return { ...primary.result, detail: `${primary.result.detail} (${skipNote})` };
      }
      return primary.result;
    },
  };
}

/** The primary probe's outcome, never throwing: a fetch rejection becomes a fail result. */
interface PrimaryProbe {
  result: CheckResult;
  /**
   * True when this arm's own response was itself evidence of a gate in front of the primary
   * hostname: an Access redirect (a pass) or a 401/403 (an info). False for the ordinary
   * magic-link envelope, the identity hand-off page, or any failure, none of which prove a gate
   * exists.
   */
  sawGate: boolean;
}

async function runPrimary(ctx: DoctorContext, origin: URL): Promise<PrimaryProbe> {
  try {
    return await probe(ctx, origin);
  } catch (err) {
    return { result: fail(err instanceof Error ? err.message : String(err)), sawGate: false };
  }
}

/**
 * The `Location` header of a 30x response, resolved against `origin`, or null when the status
 * isn't a redirect, no `Location` is set, or it doesn't parse.
 */
function redirectLocation(res: Response, origin: URL): URL | null {
  if (!GATE_REDIRECT_STATUSES.has(res.status)) return null;
  const location = res.headers.get('location');
  if (location === null) return null;
  try {
    return new URL(location, origin);
  } catch {
    return null;
  }
}

/**
 * The `Location` host of a 30x response, when it matches Cloudflare Access's own hostname
 * shape; null when the status isn't a redirect, no `Location` is set, it doesn't parse, or the
 * host does not carry that shape (a look-alike host with an extra prefix run into the same
 * label never matches, since the regex anchors both ends).
 */
function accessGateHost(res: Response, origin: URL): string | null {
  const location = redirectLocation(res, origin);
  return location !== null && ACCESS_HOST.test(location.hostname) ? location.hostname : null;
}

/** True when `candidate` shares `origin`'s scheme, host, and port. */
function isSameOrigin(candidate: URL, origin: URL): boolean {
  return candidate.origin === origin.origin;
}

/** True when `candidate` shares `origin`'s scheme+host+port, or its registrable domain. */
function isSameSite(candidate: URL, origin: URL): boolean {
  if (isSameOrigin(candidate, origin)) return true;
  return registrableDomain(candidate.hostname) === registrableDomain(origin.hostname);
}

/** A naive eTLD+1 (the last two dot-separated labels), sufficient for this same-site check. */
function registrableDomain(hostname: string): string {
  const labels = hostname.split('.');
  return labels.slice(-2).join('.');
}

/** GET `path` with the probe's shared timeout and manual redirect handling. */
function fetchNoRedirect(ctx: DoctorContext, url: string): Promise<Response> {
  return ctx.fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
}

/** GET /admin/login and assert the sign-in envelope, then hand the harvested token pair on. */
async function probe(ctx: DoctorContext, origin: URL): Promise<PrimaryProbe> {
  // redirect: 'manual' is required: the runtime fetch otherwise follows the gate's own 302
  // and this classifier never sees it.
  const res = await fetchNoRedirect(ctx, String(new URL('/admin/login', origin)));
  return classifyLoginResponse(ctx, origin, res);
}

/**
 * Classify one `/admin/login` response. `followed` is true only on the second call this
 * function ever makes of itself, after resolving and re-fetching a same-site redirect once;
 * that recursion never runs a second time, so this probe issues at most two requests total.
 */
async function classifyLoginResponse(
  ctx: DoctorContext,
  origin: URL,
  res: Response,
  followed = false
): Promise<PrimaryProbe> {
  const gateHost = accessGateHost(res, origin);
  if (gateHost !== null) {
    return { result: pass(`gated by ${gateHost}`), sawGate: true };
  }
  if (res.status === 401 || res.status === 403) {
    return {
      result: info(
        'the origin refused this request, which is consistent with a gate but does not prove one; if this site does not sit behind a gate, this is a deploy fault: check the route and any WAF rule'
      ),
      sawGate: true,
    };
  }
  if (GATE_REDIRECT_STATUSES.has(res.status)) {
    const location = res.headers.get('location');
    const resolved = redirectLocation(res, origin);
    if (!followed && resolved !== null && isSameSite(resolved, origin)) {
      const next = await fetchNoRedirect(ctx, resolved.toString());
      return classifyLoginResponse(ctx, origin, next, true);
    }
    return {
      result: info(redirectNotFollowedDetail(res.status, location, resolved, origin, followed)),
      sawGate: false,
    };
  }
  if (res.status !== 200) {
    return { result: fail(`GET /admin/login returned ${res.status}, expected 200`), sawGate: false };
  }
  const html = await res.text();
  if (html.includes('data-cairn-identity')) {
    return {
      result: fail(
        'the origin answers without the gate: /admin is reachable directly (the page carries the identity hand-off marker, data-cairn-identity, with no gate in front of it)'
      ),
      sawGate: false,
    };
  }
  if (!/<form[^>]*action="[^"]*\?\/request"/.test(html)) {
    return {
      result: fail(
        'the login page carries no form posting the ?/request action, an unrecognized page this probe does not know how to read (this could still sit behind a gate this probe does not recognize)'
      ),
      sawGate: false,
    };
  }
  // Deliberately NOT folded onto a config-aware derivation (F8/N3): the expected cookie
  // name derives from the PROBED origin's own scheme, an external CROSS-CHECK on what the
  // deployed runtime actually presents, so it must never consult a separately-resolved
  // PUBLIC_ORIGIN the probe itself found (which a `--url` override can legitimately diverge
  // from). Reusing csrfSecure's own body, fed the probed origin with no platform, is provably the
  // same answer as the previous hand-duplicated `origin.protocol === 'https:'` check on every
  // branch: with no platform, csrfSecure's own PUBLIC_ORIGIN consultation never fires, so an
  // https origin still resolves Secure outright and every non-https origin (local or not) still
  // resolves not-Secure, exactly as the bare protocol check did.
  const cookieName = csrfCookieName(csrfSecure({ url: origin, platform: undefined }));
  const cookieValue = setCookieValue(res.headers.getSetCookie(), cookieName);
  if (cookieValue === undefined) {
    return { result: fail(`GET /admin/login set no ${cookieName} cookie`), sawGate: false };
  }
  const field = csrfFieldValue(html);
  if (field === undefined) {
    return {
      result: fail('the login page carries no name="csrf" hidden field with a value'),
      sawGate: false,
    };
  }
  return {
    result: await postRequestAction(ctx, origin, `${cookieName}=${cookieValue}`, field),
    sawGate: false,
  };
}

/**
 * The info detail for a redirect this probe does not follow further: a missing `Location`
 * header, a `Location` header it cannot parse as a URL, a second same-site redirect after the
 * one follow this probe allows, or an off-site destination it never follows at all.
 */
function redirectNotFollowedDetail(
  status: number,
  location: string | null,
  resolved: URL | null,
  origin: URL,
  followed: boolean
): string {
  const prefix = `GET /admin/login redirected (status ${status})`;
  if (location === null) {
    return `${prefix} with no Location header, so this probe cannot classify the destination`;
  }
  if (resolved === null) {
    return `${prefix} to ${location}, a Location header this probe cannot parse as a URL`;
  }
  if (followed && isSameSite(resolved, origin)) {
    return `${prefix} to ${location}, a second same-site redirect after the one follow this probe allows`;
  }
  return `${prefix} to ${location}, an off-site destination this probe does not follow`;
}

/**
 * A cairn admin page's own marker, present regardless of which branded page rendered it: the
 * identity hand-off paragraph's `data-cairn-identity` attribute (a 200 answering the login
 * route directly) or the `renderStaticAdminPage` shell's footer text (every branded rejection
 * page the guard serves, the identity-unresolved 403 included).
 */
function carriesCairnAdminMarker(html: string): boolean {
  return html.includes('data-cairn-identity') || html.includes('Powered by Cairn');
}

/** The workers.dev exposure arm's outcome: a definitive verdict, or a note on why it didn't run. */
interface WorkersDevExposure {
  /** A fail or info result when the arm found something; null when it found nothing (or didn't run). */
  exposure: CheckResult | null;
  /**
   * A one-line reason the arm never ran, present only for a local probe origin, an invalid
   * worker name, a missing credential, or a failed subdomain lookup: the cases an operator can't
   * tell apart from "ran clean" otherwise.
   */
  skipNote?: string;
}

const NO_EXPOSURE: WorkersDevExposure = { exposure: null };

/** The arm's non-verdict when it never ran, carrying the reason as the caller's `skipNote`. */
function didNotRun(why: string): WorkersDevExposure {
  return { exposure: null, skipNote: `the workers.dev exposure arm did not run: ${why}` };
}

/**
 * A definitive exposure fail, `detail` naming what the Worker did on the workers.dev hostname.
 */
function exposed(detail: string): WorkersDevExposure {
  return {
    exposure: fail(
      `the Worker ${detail}, a hostname the gate in front of the primary hostname does not cover`
    ),
  };
}

/**
 * True when a redirect off the workers.dev hostname's own `/admin` lands on that SAME
 * hostname's `/admin/login`, the ordinary unauthenticated magic-link redirect every deploy
 * serves, gated or not, so this shape alone proves nothing beyond "the Worker runs here too".
 */
function isOrdinaryLoginRedirect(location: string | null, armOrigin: URL): boolean {
  if (location === null) return false;
  try {
    const resolved = new URL(location, armOrigin);
    return resolved.origin === armOrigin.origin && resolved.pathname === '/admin/login';
  } catch {
    return false;
  }
}

/**
 * The second arm: a Worker reachable on its account's workers.dev hostname bypasses whatever
 * gate covers the primary hostname, since neither an Access policy nor its revocation reaches
 * that address. A credential-free `GET /admin` against an exposed cairn Worker never answers
 * 200: identity mode refuses with a branded 403, magic-link mode redirects 303 to
 * `/admin/login`, so exposure is any response the Worker itself serves there, not only a 200 -
 * a bare 200 always counts and always fails, whatever the primary arm saw (a credential-free
 * `/admin` never answers 200 on a gated cairn deploy), and any other non-redirect status
 * carrying the cairn admin page's own marker counts too (a marked 403, 404, or 500 is still the
 * Worker answering, not Access's own denial page), also failing unconditionally. A redirect to
 * the SAME workers.dev hostname's own `/admin/login` is the one exception: that shape is
 * indistinguishable from the ordinary unauthenticated magic-link redirect any deploy serves, so
 * it fails only when the primary arm itself saw gate evidence (an Access redirect or a 401/403);
 * otherwise (the primary hostname carries no gate of its own, i.e. plain magic-link mode) it
 * reports info naming the remedy, since the workers.dev route most likely just reflects the
 * same ungated site rather than a bypass of a gate that exists. An unmarked non-200 (Access's
 * own denial page on a hostname the application DOES cover, just not with this credential-free
 * request) is not exposure. Only a redirect to a `*.cloudflareaccess.com` host (an Access
 * application actually covering this hostname) or a connection failure counts as not exposed.
 * `exposure` is null when the arm does not apply (`workers_dev: false`, a local probe origin, no
 * wrangler config `name`, or a `name` shaped unlike a valid workers.dev label), when the
 * hostname is gated, or when the response carries no marker, so the caller falls back to the
 * primary result unchanged. Any thrown error (a rejected fetch, an unreachable Cloudflare API)
 * also falls back to null rather than propagating, since this arm's own failure to run must
 * never turn a correctly gated primary hostname into a check-wide FAIL; a missing credential, a
 * failed subdomain lookup, or an invalid name additionally carries `skipNote` so the caller can
 * say the arm never ran.
 */
async function probeWorkersDevExposure(
  ctx: DoctorContext,
  origin: URL,
  sawGate: boolean
): Promise<WorkersDevExposure> {
  try {
    // A local probe origin (wrangler dev, a local preview) has no workers.dev route at all.
    if (isLocalHost(origin.hostname)) {
      return didNotRun('the probed origin is local; a workers.dev route only exists for a deployed Worker');
    }
    const facts = await readWranglerConfig(ctx.readFile);
    if (facts?.workersDev === false) return NO_EXPOSURE;
    if (typeof facts?.name !== 'string') return NO_EXPOSURE;
    if (!WORKER_NAME_PATTERN.test(facts.name)) {
      return didNotRun(`the wrangler config's name (${facts.name}) is not a valid workers.dev subdomain label`);
    }
    if (!ctx.cfToken || !ctx.cfAccountId) {
      return didNotRun('set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID to enable it');
    }
    // GET /accounts/{account_id}/workers/subdomain, { result: { subdomain } } out.
    // https://developers.cloudflare.com/api/resources/workers/subresources/subdomain/
    const subdomainRes = await cfGet(ctx, `/accounts/${ctx.cfAccountId}/workers/subdomain`, {
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    if (!subdomainRes.ok) return didNotRun('the account subdomain lookup failed');
    const body = (await subdomainRes.json()) as { result?: { subdomain?: string } };
    const subdomain = body.result?.subdomain;
    if (typeof subdomain !== 'string') return didNotRun('the account subdomain lookup failed');
    const host = `${facts.name}.${subdomain}.workers.dev`;
    const armOrigin = new URL(`https://${host}`);
    const res = await fetchNoRedirect(ctx, String(new URL('/admin', armOrigin)));
    if (GATE_REDIRECT_STATUSES.has(res.status)) {
      if (accessGateHost(res, armOrigin) !== null) return NO_EXPOSURE;
      const location = res.headers.get('location');
      if (isOrdinaryLoginRedirect(location, armOrigin) && !sawGate) {
        return {
          exposure: info(
            `the Worker redirects from /admin on ${host} to /admin/login, the same magic-link redirect an unauthenticated visitor sees anywhere; the primary hostname itself carries no gate of its own (magic-link mode), so this most likely just reflects the same site reachable at its own workers.dev address rather than a bypass. To close it, set workers_dev: false (and preview_urls: false) in the wrangler config.`
          ),
        };
      }
      const to = location ?? 'a response with no Location header';
      return exposed(`redirects from /admin on ${host} to ${to}`);
    }
    if (res.status === 200) {
      return exposed(`serves /admin directly on ${host}`);
    }
    const html = await res.text();
    if (carriesCairnAdminMarker(html)) {
      return exposed(`serves its own branded admin page (status ${res.status}) on ${host}`);
    }
    return NO_EXPOSURE;
  } catch {
    return NO_EXPOSURE;
  }
}

/** The named cookie's value from the Set-Cookie lines, or undefined when no line names it. */
function setCookieValue(lines: string[], name: string): string | undefined {
  for (const line of lines) {
    const eq = line.indexOf('=');
    if (eq === -1 || line.slice(0, eq).trim() !== name) continue;
    const rest = line.slice(eq + 1);
    const semi = rest.indexOf(';');
    return semi === -1 ? rest : rest.slice(0, semi);
  }
  return undefined;
}

/** The csrf hidden field's value, tolerant of attribute order, or undefined when absent or empty. */
function csrfFieldValue(html: string): string | undefined {
  const input = (html.match(/<input[^>]*>/g) ?? []).find((tag) => /name="csrf"/.test(tag));
  if (input === undefined) return undefined;
  return /value="([^"]+)"/.exec(input)?.[1];
}

/**
 * POST the request action and read its serialized result. The address is random and non-editor
 * at the reserved example.invalid domain, so even a delivery bug could send nothing anywhere,
 * and the engine's non-leak design makes the response indistinguishable from a real send.
 */
async function postRequestAction(
  ctx: DoctorContext,
  origin: URL,
  cookie: string,
  csrf: string
): Promise<CheckResult> {
  const email = `cairn-doctor-probe-${Math.random().toString(36).slice(2, 10)}@example.invalid`;
  const res = await ctx.fetch(String(new URL('/admin/login?/request', origin)), {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      cookie,
    },
    body: new URLSearchParams({ email, csrf }).toString(),
    signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
  });
  if (res.status !== 200) {
    return fail(`POST ?/request returned ${res.status}, expected 200`);
  }
  // A no-Accept action POST answers with SvelteKit's serialized form-action JSON, shaped
  // {"type":"success","status":200,"data":"<devalue array string>"}. The data field is a
  // devalue encoding the probe reads by containment for the status literals, tolerant of
  // encoding details it does not own, instead of pulling in a devalue parser.
  let envelope: { type?: unknown; data?: unknown };
  try {
    envelope = (await res.json()) as { type?: unknown; data?: unknown };
  } catch {
    return fail('POST ?/request did not answer with the serialized action JSON');
  }
  if (envelope.type !== 'success') {
    return fail(`POST ?/request answered type ${String(envelope.type)}, expected success`);
  }
  const data = typeof envelope.data === 'string' ? envelope.data : '';
  if (data.includes('"send_error"')) {
    return fail(
      'the request action answered send_error; the magic-link send path is failing (see the email checks and the auth.link.send_failed log records)'
    );
  }
  // Every payload carries the "sent" field name, so the distinct status spellings go first.
  if (data.includes('"throttled"')) {
    return pass(
      `sign-in envelope verified at ${origin.origin}; the request action answered throttled (a real cooldown window is active), which still proves the path`
    );
  }
  if (data.includes('"sent"')) {
    return pass(
      `sign-in envelope verified at ${origin.origin}; the request action answered sent for a non-editor probe address`
    );
  }
  return fail('POST ?/request answered success with an unrecognized payload');
}
