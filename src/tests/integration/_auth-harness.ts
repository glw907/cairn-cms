import { env } from 'cloudflare:test';
import type { CookieJar, CookieSetOptions } from '../../lib/sveltekit/types.js';
import type { Editor, Role } from '../../lib/auth/types.js';

export { expectRedirect, expectHttpError } from '../_redirect-assertions.js';

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

/** Like makeCookies, but records every set call's name and options, for cookie-attribute asserts. */
export function makeRecordingCookies(
  initial: Record<string, string> = {},
): CookieJar & { sets: { name: string; value: string; opts: CookieSetOptions }[] } {
  const jar = new Map(Object.entries(initial));
  const sets: { name: string; value: string; opts: CookieSetOptions }[] = [];
  return {
    sets,
    get: (name) => jar.get(name),
    set: (name, value, opts) => {
      jar.set(name, value);
      sets.push({ name, value, opts });
    },
    delete: (name) => void jar.delete(name),
  };
}

/** Build a request event for a handler. `form` becomes a POST body. */
export function makeEvent(input: {
  url: string;
  form?: Record<string, string>;
  cookies?: CookieJar;
  editor?: Editor | null;
  waitUntil?: (promise: Promise<unknown>) => void;
}) {
  const { url, form, cookies = makeCookies(), editor = null, waitUntil } = input;
  const request = form
    ? new Request(url, { method: 'POST', body: new URLSearchParams(form) })
    : new Request(url);
  return {
    url: new URL(url),
    request,
    cookies,
    locals: { editor },
    platform: {
      env: { AUTH_DB: env.AUTH_DB, PUBLIC_ORIGIN: 'https://test.dev' },
      ctx: waitUntil ? { waitUntil } : undefined,
    },
    setHeaders: () => {},
  };
}
