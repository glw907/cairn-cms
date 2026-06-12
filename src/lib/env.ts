import type { D1Database } from '@cloudflare/workers-types';
import { CairnError } from './diagnostics/index.js';

/**
 * Returns the site's public origin from configuration.
 *
 * The origin is always config-derived, never read from a request header, so a
 * forged Host header cannot redirect a magic link (spec 7.1, risk H3).
 *
 * @throws CairnError (`config.public-origin-invalid`) when `PUBLIC_ORIGIN` is unset or
 * empty, fails to parse as a URL, or uses http on a non-local host.
 */
export function requireOrigin(env: { PUBLIC_ORIGIN?: string }): string {
  const origin = env.PUBLIC_ORIGIN;
  if (!origin) {
    throw new CairnError('config.public-origin-invalid', { message: 'PUBLIC_ORIGIN is not configured' });
  }
  let hostname: string;
  try {
    hostname = new URL(origin).hostname;
  } catch {
    throw new CairnError('config.public-origin-invalid', {
      message: `PUBLIC_ORIGIN is not a valid URL, got ${origin}`,
    });
  }
  // The magic-link origin must be https in production so the link and the __Host- cookie are
  // origin-bound. http is allowed only for local dev on localhost or 127.0.0.1, matched exactly so
  // a lookalike host like localhost.example.com cannot skip the https requirement.
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
  if (!origin.startsWith('https://') && !isLocal) {
    throw new CairnError('config.public-origin-invalid', {
      message: `PUBLIC_ORIGIN must be https in production, got ${origin}`,
    });
  }
  return origin;
}

/**
 * Returns the `AUTH_DB` binding, or throws a clear error when a site has not wired it.
 *
 * The handlers read D1 off `event.platform.env`; without this a misconfigured binding
 * surfaces as a raw `TypeError` deep in a store call. This gives the failure a name.
 *
 * @throws CairnError (`config.bindings-missing`) when `AUTH_DB` is missing.
 */
export function requireDb(env: { AUTH_DB?: D1Database }): D1Database {
  if (!env.AUTH_DB) {
    throw new CairnError('config.bindings-missing', { message: 'AUTH_DB binding is not configured' });
  }
  return env.AUTH_DB;
}
