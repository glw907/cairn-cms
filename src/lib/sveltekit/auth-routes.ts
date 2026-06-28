// The SvelteKit handlers for the magic-link flow, consumed by a site's thin route shims. The login
// primitives (sendMagicLink, confirmMagicLink, mintSession) live at module scope so the ./extend
// barrel can re-export them standalone; the factory's /admin shims are thin wrappers that pass the
// admin tier and the per-site branding/send through opts.
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
  deleteSessionsForEmail,
  recentlyIssued,
  checkAndIncrementRate,
} from '../auth/store.js';
import { buildMagicLinkMessage, cloudflareSend, emailSendFailure, errorCode, type AuthBranding, type SendMagicLink } from '../email.js';
import { validateRedirect } from './redirect.js';
import { issueCsrfToken } from './csrf.js';
import { log } from '../log/index.js';
import type { AuthTier } from '../auth/types.js';
import type { RequestContext } from './types.js';

// Re-export requireDb so the server-only signIn module imports the engine's one D1 accessor from
// here rather than reaching into env.js directly.
export { requireDb } from '../env.js';

/** Sends per IP per fixed window on the now-public magic-link request path. */
const SEND_RATE_LIMIT = 5;
/** The rate-limit window length, in milliseconds. */
const SEND_RATE_WINDOW_MS = 60 * 1000;

export interface AuthRoutesConfig {
  branding: AuthBranding;
  send?: SendMagicLink;
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

/** The client IP for the rate bucket, from the Cloudflare-set header, with a logged degraded fallback. */
function clientIp(event: RequestContext): string {
  return event.request.headers.get('cf-connecting-ip') ?? 'unknown';
}

/**
 * Mint a fresh session of `tier` for `email`, rotating any prior session first (fixation defense),
 * and set the session cookie with its prefix and attributes keyed off the request protocol.
 */
export async function mintSession(
  event: RequestContext,
  db: import('@cloudflare/workers-types').D1Database,
  email: string,
  tier: AuthTier,
): Promise<void> {
  const now = Date.now();
  await deleteSessionsForEmail(db, email);
  const id = generateSessionId();
  await createSession(db, id, email, tier, now + SESSION_TTL_MS, now);
  const secure = event.url.protocol === 'https:';
  event.cookies.set(sessionCookieName(secure), id, {
    path: '/',
    httpOnly: true,
    // __Host- needs Secure unconditionally on https; local http dev drops the prefix and Secure.
    secure,
    sameSite: 'lax',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

/**
 * Issue a magic link to any email, per-IP rate-limited, persisting the server-authoritative tier and
 * the validated redirect with the token so neither rides the confirm URL. The neutral and send-ok
 * paths return the identical result, so the common case never leaks allowlist membership. branding
 * and send arrive through opts so this function closes over nothing from the factory.
 */
export async function sendMagicLink(
  event: RequestContext,
  opts: { tier: AuthTier; redirectTo?: string; branding: AuthBranding; send?: SendMagicLink },
): Promise<RequestResult> {
  const send = opts.send ?? cloudflareSend;
  const env = event.platform?.env ?? {};
  const origin = requireOrigin(env);
  const db = requireDb(env);
  const form = await event.request.formData();
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  // `email` here is unvalidated request input logged before any check, so bound the logged value to
  // the RFC 5321 maximum to cap an abusive record's size. A real address fits well under this.
  log.info('auth.link.requested', { email: email.slice(0, 320) });

  // Per-IP fixed-window limit on the now-public send path, applied before any per-email cooldown.
  // The throttle collapses into the neutral signal so it never leaks membership or invites probing.
  if (!(await checkAndIncrementRate(db, `ip:${clientIp(event)}`, Date.now(), SEND_RATE_WINDOW_MS, SEND_RATE_LIMIT))) {
    log.warn('auth.link.rate_limited', { ip: clientIp(event) });
    return { status: 'sent', sent: true };
  }

  const editor = email ? await findEditor(db, email) : null;
  // Non-editor: byte-identical to the editor send-ok path, so the response body never leaks
  // membership. Phase 1 only sends to allowlisted editors; member self-service arrives later.
  if (!editor) return { status: 'sent', sent: true };

  const now = Date.now();
  // Per-email cooldown: an editor who requested within the window gets the throttled signal rather
  // than a second email. This reveals editor membership, the deliberate relaxed-non-leak posture.
  if (await recentlyIssued(db, email, now - SEND_COOLDOWN_MS)) {
    return { status: 'throttled', sent: false };
  }

  const safeRedirect = validateRedirect(opts.redirectTo ?? null, origin);
  const token = generateToken();
  await issueToken(db, email, await hashToken(token), opts.tier, safeRedirect, now + TOKEN_TTL_MS, now);
  log.info('auth.token.minted', { email, expiresAt: now + TOKEN_TTL_MS });
  const link = `${origin}/admin/auth/confirm?token=${encodeURIComponent(token)}`;
  // The token row is the security-critical write the email depends on, so it is awaited first. The
  // send is awaited too (no backgrounding), so its outcome drives the response: confirm the link
  // went out before telling an editor to check their inbox.
  try {
    await send(env, buildMagicLinkMessage({ to: email, branding: opts.branding, link }));
  } catch (err) {
    // Map the binding failure to its registered condition and log the greppable code plus the
    // conditionId. The editor sees only a generic message, never this detail.
    const failure = emailSendFailure(err);
    log.error('auth.link.send_failed', { email, error: scrubSendError(err), code: errorCode(err), conditionId: failure.conditionId });
    return { status: 'send_error', sent: false };
  }
  return { status: 'sent', sent: true };
}

/**
 * Consume a submitted token atomically and, on success, mint a session of the token's
 * server-authoritative tier, rotating any prior session, and redirect to the validated target the
 * token carried (default `/admin` for an admin tier, `/` for a member). An invalid, replayed, or
 * expired token redirects to the login page.
 */
export async function confirmMagicLink(event: RequestContext): Promise<never> {
  const env = event.platform?.env ?? {};
  const db = requireDb(env);
  const form = await event.request.formData();
  const token = String(form.get('token') ?? '');
  if (!token) throw redirect(303, '/admin/login?error=expired');

  const now = Date.now();
  const { email, tier, redirectTo } = (await consumeToken(db, await hashToken(token), now)) ?? {};
  if (!email) throw redirect(303, '/admin/login?error=expired');
  log.info('auth.token.confirmed', { email });

  await mintSession(event, db, email, tier ?? 'admin');
  log.info('auth.session.created', { email });

  // Re-validate the stored redirect against the origin only when one was persisted; the common path
  // carries none and falls back to the tier default, so it never needs PUBLIC_ORIGIN for confirm.
  const safe = redirectTo ? validateRedirect(redirectTo, requireOrigin(env)) : null;
  throw redirect(303, safe ?? (tier === 'admin' ? '/admin' : '/'));
}

/**
 * The SvelteKit handlers for a site's `/admin` magic-link route shims. The shims are thin wrappers
 * over the module-level primitives, passing the admin tier and the per-site branding/send.
 */
export function createAuthRoutes(config: AuthRoutesConfig) {
  /** POST /admin/auth/request. The admin send shim: delegates to sendMagicLink with the admin tier. */
  function requestAction(event: RequestContext): Promise<RequestResult> {
    return sendMagicLink(event, { tier: 'admin', branding: config.branding, send: config.send });
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
   * GET /admin/auth/confirm. Renders the confirm page and consumes nothing; only the POST verifies.
   * Sets Referrer-Policy: no-referrer so the token does not leak to a referrer, and issues the CSRF
   * token so the confirm form can render the hidden field.
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

  /** POST /admin/auth/confirm. The admin confirm shim: delegates to confirmMagicLink. */
  function confirmAction(event: RequestContext): Promise<never> {
    return confirmMagicLink(event);
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
