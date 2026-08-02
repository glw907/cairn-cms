// cairn-cms: Cloudflare Turnstile's siteverify call, hardened past the thirteen-line version two
// sites already copy by hand. Every failure mode below returns false rather than throwing, so a
// caller cannot accidentally treat an outage or a malformed response as a pass.
import { log } from '../log/index.js';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// Cloudflare documents the solved-token format at up to 2048 characters; anything longer cannot
// be a genuine token and is rejected before it reaches the outbound fetch.
const MAX_TOKEN_LENGTH = 2048;

// A rotated or misconfigured secret is the one failure siteverify reports as HTTP 200 with
// success: false, distinguishable only by its error-codes. These two are the routine, expected
// causes (a bot's response, or a token already consumed); anything else is worth a log line.
const ROUTINE_ERROR_CODES = new Set(['invalid-input-response', 'timeout-or-duplicate']);

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
  'error-codes'?: string[];
}

function isSiteverifyBody(value: unknown): value is SiteverifyBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    typeof (value as { success: unknown }).success === 'boolean'
  );
}

/**
 * Verify a Turnstile token against Cloudflare's siteverify endpoint.
 *
 * Every failure mode, a non-200 response, an unparseable or non-object body, a thrown fetch or a
 * request that hangs past its deadline, and a hostname or action mismatch, returns false rather
 * than throwing: this function is fail-closed by contract, so a future refactor cannot flip it
 * open by accident. Degrade-to-open (skipping the check entirely when a site has no secret
 * configured) is the caller's own convention (`if (secret && ...)`), never this function's;
 * verification and that policy stay separate. Supplying `hostname` and `action` is what stops a
 * token solved on one widget from replaying against another form that shares the same sitekey;
 * without them, siteverify only proves the token is genuine, not which form it was solved for.
 * `hostname` compares case-insensitively, since siteverify reports it lowercased regardless of
 * the sitekey's configured casing. This function never logs the secret, and on a mismatch logs no
 * response field beyond `hostname` and `action` (never the full body).
 */
export async function verifyTurnstile(
  token: string,
  secret: string,
  opts: VerifyTurnstileOptions = {},
): Promise<boolean> {
  if (
    typeof token !== 'string' ||
    typeof secret !== 'string' ||
    !token.trim() ||
    !secret.trim() ||
    token.length > MAX_TOKEN_LENGTH
  ) {
    return false;
  }

  const params = new URLSearchParams({ secret, response: token });
  if (opts.ip) params.set('remoteip', opts.ip);

  let res: Response;
  try {
    res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      // A 307/308 redirect preserves method and body, which would re-POST the secret to
      // whatever the redirect target is; 'manual' stops that, and a redirect response then
      // falls through the not-ok branch below and logs as bad_status.
      redirect: 'manual',
      // Bounds how long a hung siteverify call can hold the request open; an AbortError lands
      // in the catch below and logs the same as any other network failure.
      signal: AbortSignal.timeout(5000),
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
  if (body.success !== true) {
    // siteverify reports a rotated or missing secret, or a malformed request, as HTTP 200 with
    // success: false and a configuration error-codes entry: the same shape a genuine bot
    // rejection takes. Logging only the non-routine codes surfaces a misconfigured secret
    // (which silently locks out every real visitor) without noise on ordinary bot traffic.
    const codes = body['error-codes'] ?? [];
    const isRoutine = codes.every((code) => ROUTINE_ERROR_CODES.has(code));
    if (!isRoutine) {
      log.warn('turnstile.verify_failed', { reason: 'rejected', codes });
    }
    return false;
  }

  if (
    opts.hostname !== undefined &&
    body.hostname?.toLowerCase() !== opts.hostname.toLowerCase()
  ) {
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
