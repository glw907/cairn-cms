// cairn-cms: the platform-binding guards. A site's env carries PUBLIC_ORIGIN, AUTH_DB, and its
// media bucket only if wired correctly; each guard here turns a missing or malformed binding into
// a named CairnError instead of a raw TypeError deep in a store or backend call, so a
// misconfiguration surfaces as a doctor condition rather than an opaque crash.
import type { D1Database } from '@cloudflare/workers-types';
import { CairnError } from './diagnostics/index.js';
import type { DeliveryBucket } from './media/delivery-bucket.js';
import type { EmailSender } from './email.js';

/**
 * The Worker bindings and vars the whole engine reads, all optional: the auth layer's D1 store
 * and origin config, the dev-backend tripwire flag, the Email Sending binding, and the GitHub
 * App's private-key secret. One shape serves every factory that needs platform bindings, rather
 * than a per-layer split (auth vs backend), since the split's only purpose, typing which routes
 * need what, is better served by reference-page prose than by a second declaration.
 */
export interface CairnEnv {
  /** The self-owned magic-link auth store: the allowlist, sessions, and single-use tokens. */
  AUTH_DB?: D1Database;
  /** Canonical origin for confirmation links, never read from a request header (spec 7.1, risk H3). */
  PUBLIC_ORIGIN?: string;
  /**
   * Dev-backend tripwire flag. The dev backend sets this in local development; if it is ever set
   * in a deployed runtime the guard refuses (the consumer's build-time flag should have eliminated
   * the dev backend, so a set flag signals a polluted environment). A string from a Worker var or
   * a boolean.
   */
  CAIRN_DEV_BACKEND?: string | boolean;
  /** Cloudflare Email Sending binding, or an injected sender with the same structural shape. */
  EMAIL?: EmailSender;
  /** The GitHub App's private key, base64 of the PEM on one line, decoded with `atob()` before signing. */
  GITHUB_APP_PRIVATE_KEY_B64?: string;
}

/**
 * Returns the site's public origin from configuration.
 *
 * The origin is always config-derived, never read from a request header, so a
 * forged Host header cannot redirect a magic link (spec 7.1, risk H3).
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
 * @throws CairnError (`config.bindings-missing`) when `AUTH_DB` is missing.
 */
export function requireDb(env: { AUTH_DB?: D1Database }): D1Database {
  if (!env.AUTH_DB) {
    throw new CairnError('config.bindings-missing', { message: 'AUTH_DB binding is not configured' });
  }
  return env.AUTH_DB;
}

/**
 * Returns the media R2 bucket named by `bindingName`, or throws a clear error when a site has not
 * wired it. The binding name is config-derived (the adapter's `bucketBinding`), so it is read off
 * `env` dynamically rather than as a fixed key.
 *
 * The return type is the narrow structural `DeliveryBucket` seam, never the `@cloudflare/workers-types`
 * `R2Bucket`, so no workers-types name reaches the public `.d.ts` (the delivery route is a public
 * export and that package is only a devDependency). The cast through `unknown` is sound because the
 * seam models a subset of the real R2 bucket API.
 *
 * The guard rejects a value wired to the wrong kind of binding too (a KV namespace, a string var),
 * which is truthy but carries no callable `get`. Without that check the cast would succeed and the
 * first `bucket.get(...)` would throw an uncaught 500 rather than the drained 503 a missing binding
 * earns.
 * @throws CairnError (`config.bindings-missing`) when the named binding is absent or not an R2 bucket.
 */
export function requireBucket(env: Record<string, unknown>, bindingName: string): DeliveryBucket {
  const bucket = env[bindingName];
  if (!bucket || typeof (bucket as { get?: unknown }).get !== 'function') {
    throw new CairnError('config.bindings-missing', {
      message: `${bindingName} binding is not configured`,
    });
  }
  return bucket as unknown as DeliveryBucket;
}
