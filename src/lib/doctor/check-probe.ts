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
import { cfGet } from './cloudflare-api.js';
import { readWranglerConfig } from './wrangler-config.js';

/** A 30x whose `Location` names Cloudflare Access's own hostname; the probe never follows it. */
const GATE_REDIRECT_STATUSES = new Set([301, 302, 303, 307]);
const ACCESS_HOST = /^[a-z0-9-]+\.cloudflareaccess\.com$/i;

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
      try {
        const result = await probe(ctx, origin);
        // The workers.dev arm runs independently of the primary result: exposure on the
        // account's workers.dev hostname is a real gap even when the primary hostname is
        // properly gated, so a fail here always overrides whatever the primary arm found.
        const exposure = await probeWorkersDevExposure(ctx);
        return exposure ?? result;
      } catch (err) {
        return fail(err instanceof Error ? err.message : String(err));
      }
    },
  };
}

/**
 * The `Location` host of a 30x response, when it matches Cloudflare Access's own hostname
 * shape; null when the status isn't a redirect, no `Location` is set, it doesn't parse, or the
 * host does not carry that shape (a look-alike host with an extra prefix run into the same
 * label never matches, since the regex anchors both ends).
 */
function accessGateHost(res: Response, origin: URL): string | null {
  if (!GATE_REDIRECT_STATUSES.has(res.status)) return null;
  const location = res.headers.get('location');
  if (location === null) return null;
  let host: string;
  try {
    host = new URL(location, origin).hostname;
  } catch {
    return null;
  }
  return ACCESS_HOST.test(host) ? host : null;
}

/** GET /admin/login and assert the sign-in envelope, then hand the harvested token pair on. */
async function probe(ctx: DoctorContext, origin: URL): Promise<CheckResult> {
  // redirect: 'manual' is required: the runtime fetch otherwise follows the gate's own 302
  // and this classifier never sees it.
  const res = await ctx.fetch(String(new URL('/admin/login', origin)), { redirect: 'manual' });
  const gateHost = accessGateHost(res, origin);
  if (gateHost !== null) {
    return pass(`gated by ${gateHost}`);
  }
  if (res.status === 401 || res.status === 403) {
    return info(
      'the origin refused this request, which is consistent with a gate but does not prove one'
    );
  }
  if (res.status !== 200) {
    return fail(`GET /admin/login returned ${res.status}, expected 200`);
  }
  const html = await res.text();
  if (html.includes('data-cairn-identity')) {
    return fail(
      'the origin answers without the gate: /admin is reachable directly (the page carries the identity hand-off marker, data-cairn-identity, with no gate in front of it)'
    );
  }
  if (!/<form[^>]*action="[^"]*\?\/request"/.test(html)) {
    return fail(
      'the origin answers without the gate: /admin is reachable directly (the login page carries no form posting the ?/request action, an unrecognized page this probe does not know how to read)'
    );
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
    return fail(`GET /admin/login set no ${cookieName} cookie`);
  }
  const field = csrfFieldValue(html);
  if (field === undefined) {
    return fail('the login page carries no name="csrf" hidden field with a value');
  }
  return postRequestAction(ctx, origin, `${cookieName}=${cookieValue}`, field);
}

/**
 * The second arm: a Worker reachable on its account's workers.dev hostname bypasses whatever
 * gate covers the primary hostname, since neither an Access policy nor its revocation reaches
 * that address. Returns null when the arm does not apply (`workers_dev: false`, no wrangler
 * config `name`, or no Cloudflare credentials to resolve the account's subdomain) or when the
 * hostname does not answer 200, so the caller falls back to the primary result unchanged. Any
 * thrown error (a rejected fetch, an unreachable Cloudflare API) also falls back to null rather
 * than propagating, since this arm's own failure to run must never turn a correctly gated
 * primary hostname into a check-wide FAIL.
 */
async function probeWorkersDevExposure(ctx: DoctorContext): Promise<CheckResult | null> {
  try {
    const facts = await readWranglerConfig(ctx.readFile);
    if (facts?.workersDev === false) return null;
    if (typeof facts?.name !== 'string') return null;
    if (!ctx.cfToken || !ctx.cfAccountId) return null;
    // GET /accounts/{account_id}/workers/subdomain, { result: { subdomain } } out.
    // https://developers.cloudflare.com/api/resources/workers/subresources/subdomain/
    const subdomainRes = await cfGet(ctx, `/accounts/${ctx.cfAccountId}/workers/subdomain`);
    if (!subdomainRes.ok) return null;
    const body = (await subdomainRes.json()) as { result?: { subdomain?: string } };
    const subdomain = body.result?.subdomain;
    if (typeof subdomain !== 'string') return null;
    const host = `${facts.name}.${subdomain}.workers.dev`;
    const res = await ctx.fetch(`https://${host}/admin`, { redirect: 'manual' });
    if (res.status !== 200) return null;
    return fail('the Worker serves /admin on a hostname the Access application does not cover');
  } catch {
    return null;
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
