// cairn owns CSRF for the admin once a site disables SvelteKit's global checkOrigin. These helpers
// back the guard's two rules and the loads that issue the double-submit token. See
// docs/superpowers/specs/2026-06-08-cairn-login-csrf-ownership-design.md.
import { csrfCookieName, generateCsrfToken, tokensMatch, SESSION_TTL_MS } from '../auth/crypto.js';
import { isLocalHost, readPublicOrigin } from '../dev-flag.js';
import type { CairnEvent, CookieJar } from './types.js';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const FORM_CONTENT_TYPES = new Set([
  'application/x-www-form-urlencoded',
  'multipart/form-data',
  'text/plain',
]);

// `isLocalHost` is imported, not copied. It used to be duplicated here because guard.ts imports
// this module and importing back would be circular; the shared module is a leaf that imports
// nothing, so the cycle no longer exists and the audit's coherence-thirteen collapse is done.
//
// What this call site decides, which is not what the dev-backend tripwire's own call decides:
// under csrfSecure's monotonic rule the hostname is consulted only for a NON-https request, where
// it chooses between the bare dev cookie and the PUBLIC_ORIGIN branch. On an https request the
// hostname is never consulted at all, so it cannot weaken a cookie the browser is already
// receiving over TLS. On a non-https request the client-supplied Host header does still select the
// bare name over the PUBLIC_ORIGIN answer, but that is not attacker-reachable through a victim's
// own browser, which derives Host from the URL it is actually visiting. That is why this stays on
// the bare hostname predicate rather than `isDeployedHost`.

/**
 * The platform slice every CSRF cookie decision reads, declared once so the four helpers below
 * cannot drift apart on it. Required but nullable at each call site: a caller must write the
 * property even when the value is `undefined`, since an omitted property compiled fine and let a
 * writer and a reader resolve two different cookie names for the same request.
 */
type CsrfPlatform = { env?: { PUBLIC_ORIGIN?: string } } | undefined;

/**
 * Decide the Secure bit for one request's cairn-owned cookies, the single source every writer and
 * reader is meant to route through: the CSRF pair ({@link issueCsrfToken},
 * {@link validateCsrfHeader}, {@link validateCsrfToken}, `admin-action.ts`'s inline
 * defense-in-depth check) and the session cookie's own four call sites (`guard.ts`'s two reads,
 * `auth-routes.ts`'s `confirmAction` and `logoutAction`), which used to derive `secure` from the
 * bare `event.url.protocol` and now route through this same function, so the two cookies can no
 * longer disagree on one request. Feed the result to `csrfCookieName`/`sessionCookieName` for the
 * matching cookie name.
 *
 * The rule is monotonic: no configuration can downgrade a request the browser already made over
 * https. An https request resolves Secure outright, so a leftover `http://localhost:8788` in a
 * deployed site's `PUBLIC_ORIGIN` (which `env.ts`'s `requireOrigin` tolerates) cannot mint a bare
 * non-Secure thirty-day cookie a sibling subdomain is then free to overwrite, defeating the
 * double-submit compare.
 *
 * Only a non-https request consults anything further. A local host (the shared `isLocalHost`
 * list) keeps the bare name, since `__Host-` requires Secure unconditionally and local dev has no
 * TLS to set it with. Otherwise `PUBLIC_ORIGIN` decides, when configured and parseable as a URL,
 * which is what lets a deployment behind upstream TLS termination mint the cookie the browser
 * actually expects. With no usable `PUBLIC_ORIGIN` (absent, as in a bare unit-test event, or
 * unparseable) the request is http and non-local, so the answer is false.
 *
 * `PUBLIC_ORIGIN` is read through the shared {@link readPublicOrigin} (`dev-flag.ts`) at its
 * `platform-only` depth, deliberately shallower than that reader's default dual read: consulting
 * `process.env` here would break the doctor probe's external cross-check (`check-probe.ts`, whose
 * expected cookie name must derive from the probed origin alone, never a separately-resolved
 * process value), make the csrf unit suite's outcome depend on the runner's own shell, mint an
 * unusable Secure cookie for a LAN http host whenever a deployed process value happened to be
 * exported, and (since {@link issueCsrfToken}'s `secure` input also names the session cookie)
 * invalidate a live session on a TLS-terminated deploy the moment that value changed. The
 * divergence from `isDeployedHost`'s dual-depth read is consultation depth only, never direction:
 * an https request short-circuits Secure above before either depth is consulted, so no fallback
 * could ever downgrade it. This divergence persists by design; see {@link readPublicOrigin}'s own
 * doc comment for the retirement trigger that would reopen it.
 *
 * `src/lib/doctor/check-probe.ts` also calls this directly, feeding the PROBED origin as `url`
 * and no `platform`, deliberately: an external cross-check on what a deployed runtime actually
 * presents, not a fold onto the runtime's own derivation (see that file's own comment).
 */
export function csrfSecure(event: { url: URL; platform: CsrfPlatform }): boolean {
  if (event.url.protocol === 'https:') return true;
  if (isLocalHost(event.url.hostname)) return false;
  const origin = readPublicOrigin(event.platform?.env, { depth: 'platform-only' });
  if (origin) {
    try {
      return new URL(origin).protocol === 'https:';
    } catch {
      // Malformed PUBLIC_ORIGIN decides nothing; fall through to the non-Secure answer below.
    }
  }
  return false;
}

/** True for a request SvelteKit's CSRF guard screens: an unsafe method with a form content type. */
export function isUnsafeFormRequest(request: Request): boolean {
  if (!UNSAFE_METHODS.has(request.method)) return false;
  const type = (request.headers.get('content-type') ?? '').split(';', 1)[0].trim().toLowerCase();
  return FORM_CONTENT_TYPES.has(type);
}

/** The faithful framework check: the Origin header equals the request's own origin. */
export function originMatches(event: Pick<CairnEvent, 'url' | 'request'>): boolean {
  return event.request.headers.get('origin') === event.url.origin;
}

/**
 * Return the session's CSRF token, minting it when absent and re-anchoring its `Max-Age` on every
 * call while present. Lazy and stable: a second open admin tab reuses the same value, so its form
 * field still matches the cookie, since re-anchoring only re-sends the existing value with a fresh
 * expiry and never rotates it. HttpOnly, `SameSite=Lax` (explicit, never attribute-omission: an
 * omitted `SameSite` gets Chrome's Lax-allowing-unsafe treatment for two minutes, and this token
 * mints moments before the form's own POST), `Max-Age` matching the session's own lifetime, and
 * `__Host-` when {@link csrfSecure} resolves this request as Secure.
 *
 * The two cookies are not one lifetime. This one's expiry re-anchors on every issue while the
 * session cookie's own thirty days run from sign-in, and its value rotates at exactly two moments:
 * a successful login (`auth-routes.ts`'s `confirmAction`, which mints a fresh value once the
 * session exists) and a logout (which deletes it). Nothing else ever changes the value.
 *
 * Re-anchoring, not rotation, matters here: a one-shot `Max-Age` would expire the cookie mid
 * session and force a re-mint (a NEW value), which would silently invalidate every other open
 * tab's already-rendered form field. Re-setting the identical value with a fresh `Max-Age` keeps
 * every tab in sync while still letting the cookie outlive a single page load.
 */
export function issueCsrfToken(event: {
  url: URL;
  cookies: CookieJar;
  platform: CsrfPlatform;
}): string {
  const secure = csrfSecure(event);
  const name = csrfCookieName(secure);
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  const existing = event.cookies.get(name);
  const token = existing ?? generateCsrfToken();
  event.cookies.set(name, token, { path: '/', httpOnly: true, secure, sameSite: 'lax', maxAge });
  return token;
}

/**
 * Why a discriminating CSRF check did not pass, log-only and never carried in the HTTP response
 * (the guard must not become an oracle): `no-cookie` (the double-submit cookie itself is absent),
 * `no-witness` (the cookie is present but this witness, the header or the field, was not sent at
 * all), `mismatch` (the witness was sent but does not match the cookie), or `unparseable-body`
 * (the field witness's body could not be read as form data at all).
 */
export type CsrfRejectionDetail = 'no-cookie' | 'no-witness' | 'mismatch' | 'unparseable-body';

/** A discriminated CSRF check outcome: whether it passed, and when it did not, {@link CsrfRejectionDetail}. */
export interface CsrfVerdict {
  ok: boolean;
  detail?: CsrfRejectionDetail;
}

/** Shared verdict shape for a witness (header value or form field) read against the cookie. */
function verdictFromWitness(cookie: string | undefined, submitted: string | undefined): CsrfVerdict {
  if (!cookie) return { ok: false, detail: 'no-cookie' };
  if (submitted === undefined) return { ok: false, detail: 'no-witness' };
  return tokensMatch(submitted, cookie) ? { ok: true } : { ok: false, detail: 'mismatch' };
}

/**
 * The header-witness verdict {@link validateCsrfHeader} boolean-wraps: the same constant-time
 * double-submit compare, plus {@link CsrfRejectionDetail} naming why a failure failed. See
 * `validateCsrfHeader`'s own docstring for the header's security rationale.
 */
export function csrfHeaderVerdict(event: {
  url: URL;
  request: Request;
  cookies: CookieJar;
  platform: CsrfPlatform;
}): CsrfVerdict {
  const cookie = event.cookies.get(csrfCookieName(csrfSecure(event)));
  const header = event.request.headers.get('x-cairn-csrf');
  return verdictFromWitness(cookie, header ?? undefined);
}

/**
 * The field-witness verdict against an already-parsed form, for a caller that already read the
 * request body for its own purposes (`adminAction`) and so has no need for
 * {@link csrfTokenVerdict}'s own body clone. `form.has('csrf')` discriminates an absent field from
 * a submitted-empty one; a plain `form.get('csrf') ?? ''` collapses that distinction.
 */
export function csrfFieldVerdict(cookie: string | undefined, form: FormData): CsrfVerdict {
  return verdictFromWitness(cookie, form.has('csrf') ? String(form.get('csrf') ?? '') : undefined);
}

/**
 * The field-witness verdict {@link validateCsrfToken} boolean-wraps, reading the token from a body
 * clone. See `validateCsrfToken`'s own docstring for why a clone, not a direct read.
 */
export async function csrfTokenVerdict(event: CairnEvent): Promise<CsrfVerdict> {
  const cookie = event.cookies.get(
    csrfCookieName(csrfSecure({ url: event.url, platform: event.platform })),
  );
  if (!cookie) return { ok: false, detail: 'no-cookie' };
  let form: FormData;
  try {
    form = await event.request.clone().formData();
  } catch {
    return { ok: false, detail: 'unparseable-body' };
  }
  return csrfFieldVerdict(cookie, form);
}

/**
 * Validate the double-submit token on a raw-body upload POST, reading the submitted token from the
 * `X-Cairn-CSRF` request header rather than a form field. The upload's file bytes are the request
 * body and are read once, so the form-field path (which clones the body to read `formData`) does not
 * apply; the action carries the CSRF authority for uploads instead. Compares the header against the
 * csrf cookie the loads issue, constant-time. A boolean wrapper over {@link csrfHeaderVerdict}: kept
 * boolean deliberately, since six existing call sites negate the return, and a widened object return
 * would make every one of them truthy.
 *
 * Security rests on a custom request header being unsettable cross-origin without a CORS preflight:
 * never add a permissive `Access-Control-Allow-Headers: x-cairn-csrf` (or an allow-origin) for
 * `/admin` or `/media`, or this header witness collapses.
 */
export function validateCsrfHeader(event: {
  url: URL;
  request: Request;
  cookies: CookieJar;
  platform: CsrfPlatform;
}): boolean {
  return csrfHeaderVerdict(event).ok;
}

/**
 * Validate the double-submit token on an admin form POST, reading the field from a body clone. A
 * boolean wrapper over {@link csrfTokenVerdict}, kept boolean for the same reason
 * {@link validateCsrfHeader} is.
 */
export async function validateCsrfToken(event: CairnEvent): Promise<boolean> {
  return (await csrfTokenVerdict(event)).ok;
}
