import type { D1Database } from '@cloudflare/workers-types';

/**
 * Returns the site's public origin from configuration.
 *
 * The origin is always config-derived, never read from a request header, so a
 * forged Host header cannot redirect a magic link (spec 7.1, risk H3).
 *
 * @throws Error when `PUBLIC_ORIGIN` is unset or empty.
 */
export function requireOrigin(env: { PUBLIC_ORIGIN?: string }): string {
  const origin = env.PUBLIC_ORIGIN;
  if (!origin) {
    throw new Error('PUBLIC_ORIGIN is not configured');
  }
  return origin;
}

/**
 * Returns the `AUTH_DB` binding, or throws a clear error when a site has not wired it.
 *
 * The handlers read D1 off `event.platform.env`; without this a misconfigured binding
 * surfaces as a raw `TypeError` deep in a store call. This gives the failure a name.
 *
 * @throws Error when `AUTH_DB` is missing.
 */
export function requireDb(env: { AUTH_DB?: D1Database }): D1Database {
  if (!env.AUTH_DB) {
    throw new Error('AUTH_DB binding is not configured');
  }
  return env.AUTH_DB;
}
