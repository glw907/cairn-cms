// cairn-core: server-side auth helpers the site route shims delegate to. Each takes the
// SvelteKit event, typed structurally so the package never depends on a site's generated
// `App.*` ambient types, plus the per-request `Auth` from `locals`.
import { redirect } from '@sveltejs/kit';
import type { Auth } from './config';

/** The session shape the whole admin reads: layout, guards, content fns, manage-editors. */
export interface CairnUser {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'editor';
}

/** Read the better-auth session into a cairn user (or null). */
export async function loadSession(auth: Auth, request: Request): Promise<CairnUser | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return null;
  const u = session.user as { id: string; email: string; name: string; role?: string | null };
  return { id: u.id, email: u.email, name: u.name, role: u.role === 'owner' ? 'owner' : 'editor' };
}

export function requireSession(user: CairnUser | null): CairnUser {
  if (!user) throw redirect(303, '/admin/login');
  return user;
}

type ConfirmEvent = { request: Request; locals: { auth: Auth }; url: URL };

/**
 * POST-confirm verification (C2). Invoked from the confirm page's POST action: proxies the
 * token to better-auth's GET verify endpoint via the per-request handler, then forwards the
 * resulting Set-Cookie(s) onto a 303 to /admin. Scanners GET the confirm *page* (nothing is
 * consumed); only this explicit POST consumes the token.
 */
export async function confirmSignIn(event: ConfirmEvent): Promise<Response> {
  const form = await event.request.formData();
  const token = String(form.get('token') ?? '');
  if (!token) throw redirect(303, '/admin/login?error=expired');

  const verifyUrl = `${event.url.origin}/api/auth/magic-link/verify?token=${encodeURIComponent(token)}&callbackURL=/admin`;
  const res = await event.locals.auth.handler(new Request(verifyUrl, { headers: event.request.headers }));
  const cookies = res.headers.getSetCookie();
  if (cookies.length === 0) throw redirect(303, '/admin/login?error=expired');

  const headers = new Headers({ location: '/admin' });
  for (const cookie of cookies) headers.append('set-cookie', cookie);
  return new Response(null, { status: 303, headers });
}

/** Sign out via better-auth, forwarding the session-clearing cookies, then 303 to login. */
export async function signOut(event: { request: Request; locals: { auth: Auth } }): Promise<Response> {
  const origin = new URL(event.request.url).origin;
  const res = await event.locals.auth.handler(
    new Request(`${origin}/api/auth/sign-out`, { method: 'POST', headers: event.request.headers }),
  );
  const headers = new Headers({ location: '/admin/login' });
  for (const cookie of res.headers.getSetCookie()) headers.append('set-cookie', cookie);
  return new Response(null, { status: 303, headers });
}
