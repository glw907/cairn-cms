import { isRedirect, isHttpError } from '@sveltejs/kit';
import { env } from 'cloudflare:test';
import type { CookieJar } from '../../lib/sveltekit/types.js';
import type { Editor, Role } from '../../lib/auth/types.js';

/** Insert an editor row directly. The editor table is the allowlist, so a row is "may sign in". */
export async function seedEditor(email: string, displayName: string, role: Role, now = Date.now()): Promise<void> {
  await env.AUTH_DB.prepare(
    'INSERT INTO editor (email, display_name, role, created_at) VALUES (?, ?, ?, ?)',
  )
    .bind(email, displayName, role, now)
    .run();
}

/** Count the rows in a table, for assertions that nothing was written or consumed. */
export async function countRows(table: 'editor' | 'magic_token' | 'session'): Promise<number> {
  const row = await env.AUTH_DB.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first<{ n: number }>();
  return row?.n ?? 0;
}

/** An in-memory cookie jar matching the slice of SvelteKit's `cookies` API the engine uses. */
export function makeCookies(initial: Record<string, string> = {}): CookieJar & { jar: Map<string, string> } {
  const jar = new Map(Object.entries(initial));
  return {
    jar,
    get: (name) => jar.get(name),
    set: (name, value) => void jar.set(name, value),
    delete: (name) => void jar.delete(name),
  };
}

/** Build a request event for a handler. `form` becomes a POST body. */
export function makeEvent(input: {
  url: string;
  form?: Record<string, string>;
  cookies?: CookieJar;
  editor?: Editor | null;
}) {
  const { url, form, cookies = makeCookies(), editor = null } = input;
  const request = form
    ? new Request(url, { method: 'POST', body: new URLSearchParams(form) })
    : new Request(url);
  return {
    url: new URL(url),
    request,
    cookies,
    locals: { editor },
    platform: { env: { AUTH_DB: env.AUTH_DB, PUBLIC_ORIGIN: 'https://test.dev' } },
    setHeaders: () => {},
  };
}

/** Run a handler that should throw a redirect; return its status and location. */
export async function expectRedirect(fn: () => Promise<unknown>): Promise<{ status: number; location: string }> {
  try {
    await fn();
  } catch (e) {
    if (isRedirect(e)) return { status: e.status, location: e.location };
    throw e;
  }
  throw new Error('expected a redirect, none thrown');
}

/** Run a handler that should throw an HTTP error; return its status. */
export async function expectHttpError(fn: () => Promise<unknown>): Promise<{ status: number }> {
  try {
    await fn();
  } catch (e) {
    if (isHttpError(e)) return { status: e.status };
    throw e;
  }
  throw new Error('expected an HTTP error, none thrown');
}
