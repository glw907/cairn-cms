// Structural subsets of SvelteKit's RequestEvent. A site passes its real event, which has
// these and more, so the engine never imports a site's generated App.* ambient types.
import type { AuthEnv, Editor } from '../auth/types.js';
import type { AccessMap } from '../auth/access.js';
import type { Backend } from '../github/backend.js';

export interface CookieSetOptions {
  path: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
  maxAge?: number;
}

export interface CookieJar {
  get(name: string): string | undefined;
  set(name: string, value: string, opts: CookieSetOptions): void;
  delete(name: string, opts: { path: string }): void;
}

/** The Cloudflare platform wrapper an event carries; `context` is the legacy alias for `ctx`. */
interface PlatformContext<Env> {
  env?: Env;
  ctx?: { waitUntil(promise: Promise<unknown>): void };
  context?: { waitUntil(promise: Promise<unknown>): void };
}

/**
 * The structural core every engine event type extends, parameterized by the Worker env the
 *  surface reads. Each shared field is defined once here; the extensions add only what their
 *  surface needs (cookies, params, setHeaders).
 */
export interface EventBase<Env> {
  url: URL;
  request: Request;
  // `backend` is the per-request content store the dev-backend handle injects; the engine resolves
  // it ahead of the real provider, so typing it here makes the seam a checked contract rather than a
  // cast. A production request leaves it absent and the real `githubApp` provider connects.
  // `cairnAccess` is the site's declared access map, attached by the guard alongside `editor`; it is
  // internal (never serialized to a page payload) and exists only so `requireAccess` needs no extra
  // argument at the call site.
  locals: { editor?: Editor | null; backend?: Backend; cairnAccess?: AccessMap };
  platform?: PlatformContext<Env>;
}

export interface RequestContext extends EventBase<AuthEnv> {
  cookies: CookieJar;
  // Required so a site cannot silently drop the confirm page's Referrer-Policy header
  // (spec 7.1). A real SvelteKit RequestEvent always supplies it.
  setHeaders(headers: Record<string, string>): void;
}

export interface HandleInput {
  event: RequestContext;
  resolve(event: RequestContext): Promise<Response> | Response;
}
