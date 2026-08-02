// cairn-cms: Cloudflare Turnstile's siteverify call, hardened past the thirteen-line version two
// sites already copy by hand. Every failure mode below returns false rather than throwing, so a
// caller cannot accidentally treat an outage or a malformed response as a pass.
import { log } from '../log/index.js';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/** Narrowing a caller may supply to a {@link verifyTurnstile} call. */
export interface VerifyTurnstileOptions {
  /**
   * The visitor's address, from `CF-Connecting-IP` and never a client-forwardable header (a
   * `X-Forwarded-For` value is attacker-controlled and would let a bot supply its own IP to
   * siteverify).
   */
  ip?: string;
  /** The hostname a solved token must match; required whenever a sitekey serves more than one form. */
  hostname?: string;
  /** The Turnstile `action` a solved token must match, the per-form companion to `hostname`. */
  action?: string;
}

interface SiteverifyBody {
  success: boolean;
  hostname?: string;
  action?: string;
}

function isSiteverifyBody(value: unknown): value is SiteverifyBody {
  return typeof value === 'object' && value !== null && 'success' in value;
}

/**
 * Verify a Turnstile token against Cloudflare's siteverify endpoint.
 *
 * Every failure mode, a non-200 response, an unparseable or non-object body, a thrown fetch, and
 * a hostname or action mismatch, returns false rather than throwing: this function is fail-closed
 * by contract, so a future refactor cannot flip it open by accident. Degrade-to-open (skipping the
 * check entirely when a site has no secret configured) is the caller's own convention
 * (`if (secret && ...)`), never this function's; verification and that policy stay separate.
 * Supplying `hostname` and `action` is what stops a token solved on one widget from replaying
 * against another form that shares the same sitekey; without them, siteverify only proves the
 * token is genuine, not which form it was solved for. This function never logs the secret or the
 * response body, only a `reason` and, for a mismatch, the expected and actual values.
 */
export async function verifyTurnstile(
  token: string,
  secret: string,
  opts: VerifyTurnstileOptions = {},
): Promise<boolean> {
  if (!token.trim() || !secret.trim()) return false;

  const params = new URLSearchParams({ secret, response: token });
  if (opts.ip) params.set('remoteip', opts.ip);

  let res: Response;
  try {
    res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
  } catch (err) {
    log.warn('turnstile.verify_failed', {
      reason: 'request_failed',
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }

  if (!res.ok) {
    log.warn('turnstile.verify_failed', { reason: 'bad_status', status: res.status });
    return false;
  }

  // A body that will not parse and a body of the wrong shape are one refusal, so a parse failure
  // becomes undefined and falls into the shape guard below rather than returning on its own.
  const body: unknown = await res.json().catch(() => undefined);
  if (!isSiteverifyBody(body)) {
    log.warn('turnstile.verify_failed', { reason: 'unparseable' });
    return false;
  }
  if (!body.success) return false;

  if (opts.hostname !== undefined && body.hostname !== opts.hostname) {
    log.warn('turnstile.verify_failed', {
      reason: 'hostname_mismatch',
      expected: opts.hostname,
      actual: body.hostname,
    });
    return false;
  }
  if (opts.action !== undefined && body.action !== opts.action) {
    log.warn('turnstile.verify_failed', {
      reason: 'action_mismatch',
      expected: opts.action,
      actual: body.action,
    });
    return false;
  }

  return true;
}
