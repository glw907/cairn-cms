// The /admin guard, plus the per-load owner/session gates. A site's hooks.server.ts sets
// `export const handle = createAuthGuard()`. Events are typed structurally, so the engine
// stays free of a site's App.* ambient types.
import { redirect, error } from '@sveltejs/kit';
import { resolveSession } from '../auth/store.js';
import { COOKIE_NAME } from '../auth/crypto.js';
import type { Editor } from '../auth/types.js';
import type { HandleInput, RequestContext } from './types.js';

/** The login page and the auth endpoints are public; everything else under /admin is gated. */
function isPublicAdminPath(pathname: string): boolean {
  return pathname === '/admin/login' || pathname.startsWith('/admin/auth/');
}

function isAdminPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

/** The SvelteKit `Handle` that guards `/admin/**`. */
export function createAuthGuard() {
  return async function handle({ event, resolve }: HandleInput): Promise<Response> {
    const { pathname } = event.url;
    if (!isAdminPath(pathname) || isPublicAdminPath(pathname)) {
      return resolve(event);
    }
    const env = event.platform?.env ?? {};
    const id = event.cookies.get(COOKIE_NAME);
    const editor = id && env.AUTH_DB ? await resolveSession(env.AUTH_DB, id, Date.now()) : null;
    if (!editor) throw redirect(303, '/admin/login');
    event.locals.editor = editor;
    return resolve(event);
  };
}

/** For a protected load/action: the session the guard already resolved, or a login redirect. */
export function requireSession(event: RequestContext): Editor {
  const editor = event.locals.editor;
  if (!editor) throw redirect(303, '/admin/login');
  return editor;
}

/** For the management surface: a signed-in owner, or 403 for an editor. */
export function requireOwner(event: RequestContext): Editor {
  const editor = requireSession(event);
  if (editor.role !== 'owner') throw error(403, 'Owner access required');
  return editor;
}
