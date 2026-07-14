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
} from '../auth/crypto.js';
import {
  findEditor,
  issueToken,
  consumeToken,
  createSession,
  deleteSession,
  recentlyIssued,
  insertOwnerIfEmpty,
} from '../auth/store.js';
import { buildMagicLinkMessage, cloudflareSend, emailSendFailure, errorCode, type AuthBranding, type SendMagicLink } from '../email.js';
import { issueCsrfToken } from './csrf.js';
import { log } from '../log/index.js';
import type { RequestContext } from './types.js';

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
 *
 */
export function createAuthRoutes(config: AuthRoutesConfig) {
  const send = config.send ?? cloudflareSend;

  /**
   * POST /admin/auth/request. Looks the email up in the allowlist; on a match, issues a token,
   * emails the confirmation link, and awaits the send so the status reflects its outcome. The
   * neutral and send-ok responses are identical, so the common case never leaks membership.
   */
  async function requestAction(event: RequestContext): Promise<RequestResult> {
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
      return { status: 'throttled', sent: false };
    }

    const token = generateToken();
    await issueToken(db, email, await hashToken(token), now + TOKEN_TTL_MS, now);
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

  /** GET /admin/login. Public. Carries the site name, an optional `?error`, and the CSRF token. */
  function loginLoad(event: RequestContext): { siteName: string; error: string | null; csrf: string } {
    return {
      siteName: config.branding.siteName,
      error: event.url.searchParams.get('error'),
      csrf: issueCsrfToken(event),
    };
  }

  /**
   * GET /admin/auth/confirm. Renders the confirm page and consumes nothing; only the POST
   * verifies. Sets Referrer-Policy: no-referrer so the token does not leak to a referrer, and
   * issues the CSRF token so the confirm form can render the hidden field.
   */
  function confirmLoad(
    event: RequestContext,
  ): { token: string; siteName: string; error: string | null; csrf: string } {
    event.setHeaders({ 'Referrer-Policy': 'no-referrer' });
    return {
      token: event.url.searchParams.get('token') ?? '',
      siteName: config.branding.siteName,
      error: event.url.searchParams.get('error'),
      csrf: issueCsrfToken(event),
    };
  }

  /**
   * POST /admin/auth/confirm. Hashes the submitted token and consumes it atomically. A valid
   * token yields the email; the handler creates a session, sets the cookie, and redirects to
   * /admin. An invalid, replayed, or expired token redirects to the login page.
   */
  async function confirmAction(event: RequestContext): Promise<never> {
    const db = requireDb(event.platform?.env ?? {});
    const form = await event.request.formData();
    const token = String(form.get('token') ?? '');
    if (!token) throw redirect(303, '/admin/login?error=expired');

    const now = Date.now();
    const email = await consumeToken(db, await hashToken(token), now);
    if (!email) throw redirect(303, '/admin/login?error=expired');
    log.info('auth.token.confirmed', { email });

    const id = generateSessionId();
    await createSession(db, id, email, now + SESSION_TTL_MS, now);
    log.info('auth.session.created', { email });
    const secure = event.url.protocol === 'https:';
    event.cookies.set(sessionCookieName(secure), id, {
      path: '/',
      httpOnly: true,
      // __Host- needs Secure unconditionally on https; local http dev drops the prefix and Secure.
      secure,
      sameSite: 'lax',
      maxAge: Math.floor(SESSION_TTL_MS / 1000),
    });
    throw redirect(303, '/admin');
  }

  /** POST /admin/auth/logout. Deletes the session row and clears the cookie. */
  async function logoutAction(event: RequestContext): Promise<never> {
    const db = requireDb(event.platform?.env ?? {});
    const name = sessionCookieName(event.url.protocol === 'https:');
    const id = event.cookies.get(name);
    if (id) {
      await deleteSession(db, id);
      log.info('auth.session.destroyed');
    }
    event.cookies.delete(name, { path: '/' });
    throw redirect(303, '/admin/login');
  }

  return { loginLoad, requestAction, confirmLoad, confirmAction, logoutAction };
}
