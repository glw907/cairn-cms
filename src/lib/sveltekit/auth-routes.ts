// The SvelteKit handlers for the magic-link flow, consumed by a site's thin route shims.
// The factory takes per-site branding and an injected send, so tests run the real handlers
// against a sink. The confirm-load, confirm, and logout handlers arrive in Task 6.
import { redirect } from '@sveltejs/kit';
import { requireOrigin, requireDb } from '../env.js';
import {
  generateToken,
  generateSessionId,
  hashToken,
  TOKEN_TTL_MS,
  SESSION_TTL_MS,
  SEND_COOLDOWN_MS,
  sessionCookieName,
  csrfCookieName,
  cookieName,
} from '../auth/crypto.js';
import {
  findEditor,
  issueToken,
  consumeToken,
  createSession,
  deleteSession,
  recentlyIssued,
  rebindToken,
  insertOwnerIfEmpty,
} from '../auth/store.js';
import { buildMagicLinkMessage, cloudflareSend, emailSendFailure, errorCode, type AuthBranding, type SendMagicLink } from '../email.js';
import { issueCsrfToken, csrfSecure } from './csrf.js';
import { NO_PENDING_REQUEST_ERROR } from './auth-error-codes.js';
import { log } from '../log/index.js';
import type { CairnEvent } from './types.js';

export interface AuthRoutesConfig {
  branding: AuthBranding;
  send?: SendMagicLink;
  /**
   * A site-declared owner to seed the allowlist through the request action, in place of a
   * hand-run `wrangler d1 execute` INSERT. Grants nothing once any editor row exists; the email
   * is compared trimmed and lowercased, matching the normalization every write path already
   * applies.
   */
  bootstrapOwner?: { email: string; displayName: string };
}

/**
 * The request-action result. `status` is the discriminant; `sent` is kept for a site rendering its
 * own form against `form.sent`, so the field is additive. The neutral and send-ok paths return the
 * identical `{ status: 'sent', sent: true }`, so the common case never leaks allowlist membership.
 */
export type RequestResult =
  | { status: 'sent'; sent: true }
  | { status: 'send_error'; sent: false }
  | { status: 'throttled'; sent: false };

/**
 * The login page's data (`loginLoad`): the site name, a resolved `?error` code, and the CSRF
 * token the login form's hidden field carries.
 */
export interface LoginData {
  siteName: string;
  error: string | null;
  csrf: string;
}

/**
 * The confirm page's data (`confirmLoad`): the token to re-submit, the site name, a resolved
 * `?error` code, and the CSRF token the confirm form's hidden field carries.
 */
export interface ConfirmData {
  token: string;
  siteName: string;
  error: string | null;
  csrf: string;
}

/**
 * The pending-login cookie's base name, `__Host-` prefixed like every other cairn cookie when the
 * request resolves Secure. It holds the nonce that binds an emailed magic link to the browser
 * that asked for it; `requestAction` mints it, `confirmAction` requires it back, and both confirm
 * and logout clear it.
 */
const LOGIN_PENDING_COOKIE_BASE = 'cairn_login_pending';

// The `?error=` codes live in their own import-free leaf (./auth-error-codes.js), so a component
// branching on one never reaches through this server module to get it. Re-exported here because
// `/sveltekit` publishes them alongside the handlers that redirect with them, and imported above
// because `confirmAction` builds its own redirect from the same value.
export { NO_PENDING_REQUEST_ERROR };

/**
 * How long the pending-login cookie outlives the token it was minted alongside, as a multiple of
 * {@link TOKEN_TTL_MS}. The cookie holds an opaque nonce whose only meaning is the `nonce_hash`
 * on a live token row, and a row dies with its own ten-minute TTL, so a cookie that outlives it
 * grants nothing. What the longer life buys is the ordinary case: an editor who clicks a link
 * after the token expired arrives WITH their cookie and reads "that link expired" rather than the
 * false "different browser" message a cookie-less arrival produces.
 */
const PENDING_COOKIE_TTL_MULTIPLE = 6;

/**
 * Reuse this browser's unexpired pending-login nonce or mint a fresh one, and (re)set the cookie
 * that carries it. Both the login load and the request action call it, so a browser holds a nonce
 * from the moment it renders the sign-in form, before it has POSTed anything: two concurrent
 * cookie-less POSTs can otherwise mint two nonces, and whichever `Set-Cookie` the browser keeps
 * last may not be the one the surviving token row is bound to.
 *
 * Reuse-unexpired-or-mint, never unconditional rotation: a browser never sends back an expired
 * cookie, so a value that arrives is live, and rotating it on a throttled resend would point the
 * browser at a nonce no live token is bound to, locking the editor out of the link already in
 * their inbox. The read and the write sit in one synchronous step with no await between them.
 */
function mintOrReusePendingNonce(event: CairnEvent): string {
  const secure = csrfSecure({ url: event.url, platform: event.platform });
  const pendingCookie = cookieName(LOGIN_PENDING_COOKIE_BASE, secure);
  const nonce = event.cookies.get(pendingCookie) ?? generateToken();
  event.cookies.set(pendingCookie, nonce, {
    path: '/',
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: Math.floor((TOKEN_TTL_MS * PENDING_COOKIE_TTL_MULTIPLE) / 1000),
  });
  return nonce;
}

/**
 * The loggable form of a send failure. The engine's own senders throw clean errors, but `send` is
 * an injection seam, and a custom sender's thrown error may embed the failed message and with it
 * the magic link. Scrub any token query value and cap the length, so the documented "records never
 * carry a token" guarantee holds for the seam too.
 */
function scrubSendError(err: unknown): string {
  return String(err)
    .replace(/([?&]token=)[^&\s"'<]+/g, '$1[redacted]')
    .slice(0, 300);
}

/**
 * Build the magic-link auth surface: the login and confirm loads, plus the request, confirm,
 * and logout actions, the handlers a site's `/admin/auth/*` routes call directly or
 * `createCairnAdmin` composes into its own dispatch. `config.send` overrides the default
 * Cloudflare Email sender for tests or a custom transport; `config.bootstrapOwner` seeds the
 * very first owner row through the request action, in place of a hand-run D1 insert.
 */
export function createAuthRoutes(config: AuthRoutesConfig): AuthRoutes {
  const send = config.send ?? cloudflareSend;

  /**
   * POST /admin/auth/request. Looks the email up in the allowlist; on a match, issues a token,
   * emails the confirmation link, and awaits the send so the status reflects its outcome. The
   * neutral and send-ok responses are identical, so the common case never leaks membership.
   */
  async function requestAction(event: CairnEvent): Promise<RequestResult> {
    const env = event.platform?.env ?? {};
    const origin = requireOrigin(env);
    const db = requireDb(env);
    const form = await event.request.formData();
    const email = String(form.get('email') ?? '').trim().toLowerCase();
    // `email` here is unvalidated request input logged before the allowlist check, so bound the
    // logged value to the RFC 5321 maximum to cap an abusive record's size. A real editor's address
    // fits well under this; only a junk payload is truncated.
    log.info('auth.link.requested', { email: email.slice(0, 320) });

    const now = Date.now();
    // The pending-login nonce, set BEFORE anything branches on whether this email is an editor,
    // so all four exits below (send-ok, the non-editor neutral answer, throttled, and
    // send-failed) carry one byte-identical Set-Cookie. A cookie emitted only on the editor path
    // would be a one-request allowlist oracle sitting in the response headers, which is exactly
    // the leak the neutral answer exists to close. Only the server-side binding rides token issue.
    // `loginLoad` already ran this for any browser that rendered the sign-in form, so the usual
    // case here is a reuse, not a mint.
    const nonce = mintOrReusePendingNonce(event);

    // Bootstrap: an empty allowlist plus a matching configured owner inserts the owner row
    // atomically, before the lookup below, so the normal flow finds it and proceeds exactly as
    // it would for any other allow-listed editor. A non-matching email or a non-empty table
    // grants nothing, so this encodes exactly the trust the hand-seed SQL already encodes.
    if (config.bootstrapOwner && email && email === config.bootstrapOwner.email.trim().toLowerCase()) {
      const inserted = await insertOwnerIfEmpty(db, email, config.bootstrapOwner.displayName, now);
      if (inserted) log.info('editor.bootstrapped', { email });
    }

    const editor = email ? await findEditor(db, email) : null;
    // Non-editor: byte-identical to the editor send-ok path, so the response body never leaks
    // membership. Response timing still differs (the editor path awaits the send), the side-channel
    // the design accepts as strictly weaker than the explicit throttled signal below.
    if (!editor) return { status: 'sent', sent: true };

    // Per-email cooldown: an editor who requested within the window gets the throttled signal rather
    // than a second email. This reveals editor membership, the deliberate relaxed-non-leak posture.
    if (await recentlyIssued(db, email, now - SEND_COOLDOWN_MS)) {
      // Rebind the live token to THIS browser before answering (Geoff, 2026-08-31: "rebind, no
      // email"). Without it the same-browser binding is a lockout: an attacker POSTing this form
      // once a minute keeps the live row bound to their own nonce, and this very cooldown then
      // throttles the editor's recovery re-request, so the editor can neither confirm the link
      // sitting in their inbox nor earn a new one. The ratified semantics are
      // last-requester-wins, and they cost nothing an attacker did not already have: the email
      // only ever goes to the editor's own address, so asking grants no token, and the editor
      // recovers by simply asking again.
      //
      // No new token, no send, and the cooldown window is untouched, so the response is
      // byte-identical to a throttled answer that rebound nothing. This is a server-side write
      // only; anything observable here would reintroduce an oracle the neutral exits close.
      // rebindToken's own WHERE holds the expiry, unbound-row, and same-nonce guards.
      await rebindToken(db, email, await hashToken(nonce), now);
      return { status: 'throttled', sent: false };
    }

    const token = generateToken();
    await issueToken(db, email, await hashToken(token), now + TOKEN_TTL_MS, now, await hashToken(nonce));
    log.info('auth.token.minted', { email, expiresAt: now + TOKEN_TTL_MS });
    const link = `${origin}/admin/auth/confirm?token=${encodeURIComponent(token)}`;
    // The token row is the security-critical write the email depends on, so it is awaited first.
    // The send is now awaited too (no waitUntil backgrounding), so its outcome drives the response:
    // confirm the link went out before telling an editor to check their inbox. The cost is one
    // email-API round trip on the login POST, the right trade for a login flow.
    try {
      await send(env, buildMagicLinkMessage({ to: email, branding: config.branding, link }));
    } catch (err) {
      // Map the binding failure to its registered condition (carried as a CairnError with the
      // original as cause), and log the greppable code plus the conditionId so the next onboarding
      // gap reads straight to its fix. The editor sees only a generic message, never this detail.
      const failure = emailSendFailure(err);
      log.error('auth.link.send_failed', { email, error: scrubSendError(err), code: errorCode(err), conditionId: failure.conditionId });
      // A plain 200 with a status field, not fail(): the result stays one uniform union for the
      // page, and the failure is already observable through the error-level log record.
      return { status: 'send_error', sent: false };
    }
    return { status: 'sent', sent: true };
  }

  /**
   * GET /admin/login. Public. Carries the site name, an optional `?error`, and the CSRF token.
   *
   * It also leaves the pending-login nonce in this browser, the same reuse-or-mint the CSRF token
   * already gets, so the browser holds one before it POSTs anything. Two concurrent cookie-less
   * POSTs would otherwise each mint their own nonce, and the browser keeps only one of the two
   * `Set-Cookie` values, which may not be the one the surviving token row is bound to.
   */
  function loginLoad(event: CairnEvent): LoginData {
    mintOrReusePendingNonce(event);
    return {
      siteName: config.branding.siteName,
      error: event.url.searchParams.get('error'),
      csrf: issueCsrfToken({ url: event.url, cookies: event.cookies, platform: event.platform }),
    };
  }

  /**
   * GET /admin/auth/confirm. Renders the confirm page and consumes nothing; only the POST
   * verifies. Sets Referrer-Policy: no-referrer so the token does not leak to a referrer, and
   * issues the CSRF token so the confirm form can render the hidden field.
   */
  function confirmLoad(event: CairnEvent): ConfirmData {
    event.setHeaders({ 'Referrer-Policy': 'no-referrer' });
    return {
      token: event.url.searchParams.get('token') ?? '',
      siteName: config.branding.siteName,
      error: event.url.searchParams.get('error'),
      csrf: issueCsrfToken({ url: event.url, cookies: event.cookies, platform: event.platform }),
    };
  }

  /**
   * POST /admin/auth/confirm. Requires the pending-login cookie the request action left in this
   * browser, then hashes the submitted token and consumes it atomically against that nonce. A
   * valid token yields the email; the handler creates a session, sets the cookie, and redirects
   * to /admin. An invalid, replayed, or expired token redirects to the login page.
   *
   * The same-browser check lives inside the consuming `DELETE`'s own predicate, so a link opened
   * in another browser (a forwarded message, a mail scanner following the link, an attacker
   * putting their own link in front of a victim) refuses without burning the token the requesting
   * browser can still use: the row is not deleted unless its `nonce_hash` matches.
   *
   * A browser carrying no pending cookie is NOT short-circuited before the consume. It passes
   * `null`, which is exactly what an unbound row (`nonce_hash IS NULL`, written before
   * migrations/0004_login_nonce.sql, by `create-cairn-site`'s bootstrap INSERT, or by a
   * hand-seeded recovery row) needs in order to stay confirmable; a bound row compares against
   * NULL in SQL, which is never true, so it is neither consumed nor confirmed and the handler
   * falls through to the no-pending-request redirect below. A present-but-wrong nonce is
   * indistinguishable from a stale link and reads as expired.
   */
  async function confirmAction(event: CairnEvent): Promise<never> {
    const db = requireDb(event.platform?.env ?? {});
    const form = await event.request.formData();
    const token = String(form.get('token') ?? '');
    if (!token) throw redirect(303, '/admin/login?error=expired');

    // One variable for the whole handler, per Task 6's rule: this same `secure` names the
    // pending cookie read and deleted here, the session cookie set below, and the CSRF cookie
    // rotated after it.
    const secure = csrfSecure({ url: event.url, platform: event.platform });
    const pendingCookie = cookieName(LOGIN_PENDING_COOKIE_BASE, secure);
    const nonce = event.cookies.get(pendingCookie);

    const now = Date.now();
    const email = await consumeToken(db, await hashToken(token), now, nonce ? await hashToken(nonce) : null);
    // A failed confirm leaves the pending cookie alone. Deleting it here would turn one mistyped
    // or stale attempt into a lockout: the next click would refuse for the absent cookie instead,
    // and the editor would have to notice they must request the link again from this browser.
    //
    // Which refusal the editor reads is decided here, after the consume, since only the consume's
    // own predicate knows whether the row was bound. A cookie-less browser that failed against a
    // bound row gets the distinct no-pending-request code, because "request a new one" is the
    // exact advice that reproduces the failure on a second device; everything else, including a
    // present-but-wrong nonce, reads as expired.
    if (!email) {
      if (!nonce) {
        log.warn('auth.link.refused', { reason: 'no_pending_cookie' });
        throw redirect(303, `/admin/login?error=${NO_PENDING_REQUEST_ERROR}`);
      }
      throw redirect(303, '/admin/login?error=expired');
    }
    log.info('auth.token.confirmed', { email });

    const id = generateSessionId();
    await createSession(db, id, email, now + SESSION_TTL_MS, now);
    log.info('auth.session.created', { email });
    // The nonce has done its job; a spent pending cookie left in the browser would outlive the
    // token it was bound to. `secure` here is the same variable the pending cookie was read
    // under above, one csrfSecure call for the whole handler (Task 6, N-4): the session cookie
    // used to derive `secure` from the bare `event.url.protocol`, independently of the CSRF
    // pair's own PUBLIC_ORIGIN-aware derivation, which could resolve the cookies to different
    // `secure` values on one request. An https request always resolves Secure either way;
    // PUBLIC_ORIGIN can only raise a non-https request's answer, never lower it.
    event.cookies.delete(pendingCookie, { path: '/', secure });
    event.cookies.set(sessionCookieName(secure), id, {
      path: '/',
      httpOnly: true,
      // __Host- needs Secure unconditionally on https; local http dev drops the prefix and Secure.
      secure,
      sameSite: 'lax',
      maxAge: Math.floor(SESSION_TTL_MS / 1000),
    });

    // Rotate the CSRF token now that the session exists, so a value fixed on this browser before
    // sign-in cannot carry into the authenticated session. Deleting first is what forces the mint:
    // issueCsrfToken reuses a present cookie by design.
    //
    // This is a deliberate exception to issueCsrfToken's never-rotate rule, which exists so a
    // second open admin tab's already-rendered form field keeps matching the cookie. At this
    // instant another open tab holds at most a sign-in form, which is meaningless once this
    // session is signed in, except when an already-signed-in browser re-authenticates through
    // /admin/auth/confirm (a public admin path): another tab there can hold a real authenticated
    // form whose field then mismatches the rotated cookie, taking one generic 403 (detail
    // mismatch, witness field) that a reload recovers from. Rotating at any later point would
    // break a real authenticated form outside that narrow case, and binding the token to
    // authentication epochs outweighs the self-healing edge, which is why this is the only place
    // it happens.
    event.cookies.delete(csrfCookieName(secure), { path: '/', secure });
    issueCsrfToken({ url: event.url, cookies: event.cookies, platform: event.platform });
    throw redirect(303, '/admin');
  }

  /**
   * POST /admin/auth/logout. Clears both cookies first, so a fault below still kills the
   *  browser-side credentials rather than leaving the session both server- and client-side valid
   *  (the cookie is the only thing a subsequent request can present); then best-effort deletes
   *  the session row. The CSRF cookie is deleted alongside the session cookie: a persistent
   *  double-submit token must not survive a sign-out.
   *
   *  Each delete carries the same `secure` flag its own setter used, since SvelteKit's delete
   *  defaults `secure` on for every host but `localhost` itself, and a browser discards a Secure
   *  `Set-Cookie` sent over http, which would leave both cookies alive on an http dev host such as
   *  `127.0.0.1`.
   *
   *  Belt-and-braces (Task 6, security round N1): BOTH cookie-name forms delete for BOTH cookies
   *  (bare and `__Host-`, session and CSRF), each with its matching `secure`, not just the one
   *  `csrfSecure` derives for this request. A `PUBLIC_ORIGIN` change between login and logout
   *  changes which name this request's own derivation produces, and the bare-derived-name-only
   *  delete would strand whichever form the browser actually holds from the earlier login. The
   *  session id to invalidate is read the same way: from the derived name first, the other form
   *  when that one is absent, so a stranded id is found too.
   *
   *  A `deleteSession` fault is caught and logged here, never rethrown to `viewAction`'s generic
   *  `fail(500)`: this action posts to the bare `/admin`, whose own load (`indexLoad`) always
   *  redirects away before ever rendering a component that reads `form`, so a `fail()` here would
   *  be silently discarded. The editor is already signed out either way, so the redirect to
   *  `/admin/login` stays unconditional; a lingering D1 row with no valid cookie presenting it is
   *  not reachable.
   */
  async function logoutAction(event: CairnEvent): Promise<never> {
    const db = requireDb(event.platform?.env ?? {});
    // One variable, one csrfSecure call (Task 6, N-4): the session cookie used to derive
    // `secure` independently from the CSRF pair's own derivation. `!secure` is this same value's
    // complement, not a second independent derivation.
    const secure = csrfSecure({ url: event.url, platform: event.platform });
    const id =
      event.cookies.get(sessionCookieName(secure)) ?? event.cookies.get(sessionCookieName(!secure));
    event.cookies.delete(sessionCookieName(secure), { path: '/', secure });
    event.cookies.delete(sessionCookieName(!secure), { path: '/', secure: !secure });
    event.cookies.delete(csrfCookieName(secure), { path: '/', secure });
    event.cookies.delete(csrfCookieName(!secure), { path: '/', secure: !secure });
    // The pending-login nonce is a cairn-owned credential too, so a sign-out clears it. One
    // name form only, this request's own: a stranded nonce under the other form names a token
    // row that its ten-minute TTL has already swept, so nothing can confirm against it.
    event.cookies.delete(cookieName(LOGIN_PENDING_COOKIE_BASE, secure), { path: '/', secure });
    if (id) {
      try {
        await deleteSession(db, id);
        log.info('auth.session.destroyed');
      } catch (err) {
        log.error('auth.session.destroy_failed', { error: String(err) });
      }
    }
    throw redirect(303, '/admin/login');
  }

  return { loginLoad, requestAction, confirmLoad, confirmAction, logoutAction };
}

/** What `createAuthRoutes` returns: the magic-link login, confirm, and logout handlers. */
export interface AuthRoutes {
  loginLoad: (event: CairnEvent) => LoginData;
  requestAction: (event: CairnEvent) => Promise<RequestResult>;
  confirmLoad: (event: CairnEvent) => ConfirmData;
  confirmAction: (event: CairnEvent) => Promise<never>;
  logoutAction: (event: CairnEvent) => Promise<never>;
}
