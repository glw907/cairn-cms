// src/lib/auth/authorize.ts
// Runs a site's authorize callback to grant custom scopes, but never lets it break the request. The
// callback is wrapped in try/catch and an engine-owned deadline; any throw, timeout, or non-array
// return falls back to [] (custom scopes denied; built-in editor scopes are added by the caller), and
// logs auth.authorize.failed. See the extensibility spec, "Scope resolution: live, lazy, fail-closed".
import { log } from '../log/index.js';

/** The context cairn passes the callback: the verified email and the platform (for the dev's own D1). */
export interface AuthorizeContext {
  email: string;
  platform: unknown;
}

/** A site's authorize callback. Returns the custom scopes to grant this email, or [] to grant none. */
export type Authorize = (ctx: AuthorizeContext) => Promise<string[]> | string[];

/** The engine-owned deadline for the authorize callback. Not a callback parameter, so it cannot drift. */
export const AUTHORIZE_TIMEOUT_MS = 1000;

/**
 * Resolve custom scopes from a site's authorize callback, fail-closed. A missing callback yields []
 * silently; a throw, a timeout past `deadlineMs`, or a non-array return yields [] and an error log.
 */
export async function runAuthorize(
  authorize: Authorize | undefined,
  ctx: AuthorizeContext,
  deadlineMs = AUTHORIZE_TIMEOUT_MS,
): Promise<string[]> {
  if (!authorize) return [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('timeout')), deadlineMs);
    });
    const result = await Promise.race([Promise.resolve(authorize(ctx)), timeout]);
    if (!Array.isArray(result) || result.some((s) => typeof s !== 'string')) {
      log.error('auth.authorize.failed', { email: ctx.email, error: 'non-array return' });
      return [];
    }
    return result;
  } catch (err) {
    log.error('auth.authorize.failed', { email: ctx.email, error: err instanceof Error ? err.message : String(err) });
    return [];
  } finally {
    if (timer) clearTimeout(timer);
  }
}
