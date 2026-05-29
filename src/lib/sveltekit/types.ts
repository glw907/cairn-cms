// Structural subsets of SvelteKit's RequestEvent. A site passes its real event, which has
// these and more, so the engine never imports a site's generated App.* ambient types.
import type { AuthEnv, Editor } from '../auth/types.js';

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

export interface RequestContext {
  url: URL;
  request: Request;
  cookies: CookieJar;
  locals: { editor?: Editor | null };
  platform?: { env?: AuthEnv };
  // Required so a site cannot silently drop the confirm page's Referrer-Policy header
  // (spec 7.1). A real SvelteKit RequestEvent always supplies it.
  setHeaders(headers: Record<string, string>): void;
}

export interface HandleInput {
  event: RequestContext;
  resolve(event: RequestContext): Promise<Response> | Response;
}
