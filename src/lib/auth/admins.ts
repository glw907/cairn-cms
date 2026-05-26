// cairn-core: owner-gated editor management, on better-auth's admin API. The `user` table IS
// the allowlist (disableSignUp ⇒ only listed emails can sign in), so add/remove editor = create/
// remove user; role flips go through the admin plugin's access-control roles (owner/editor).
// These run as SvelteKit form actions; each verifies the acting user is an owner first.
import { redirect, error } from '@sveltejs/kit';
import type { Auth } from './config';
import type { CairnUser } from './guard';

export interface AdminsData {
  admins: CairnUser[];
  /** Acting owner's email, so the UI can disable self-targeted remove/demote. */
  self: string;
  saved: boolean;
  error: string | null;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * The privilege-escalation gate. better-auth's admin API also enforces this server-side (only
 * `owner` holds the admin statements), but checking `locals.user` here gives clean redirect/403
 * UX and lets the mutations guard self-lockout before calling the API. Returns the acting owner.
 */
export function requireOwner(user: CairnUser | null): CairnUser {
  if (!user) throw error(401, 'Not signed in');
  if (user.role !== 'owner') throw error(403, 'Owner access required');
  return user;
}

type Ev = { locals: { auth: Auth; user: CairnUser | null }; request: Request; url: URL };

function asCairnUser(u: { id: string; email: string; name: string; role?: string | null }): CairnUser {
  return { id: u.id, email: u.email, name: u.name, role: u.role === 'owner' ? 'owner' : 'editor' };
}

/** Find an editor by exact (lowercased) email, or undefined. */
async function findByEmail(event: Ev, email: string): Promise<CairnUser | undefined> {
  const res = await event.locals.auth.api.listUsers({
    query: { searchValue: email, searchField: 'email', limit: 100 },
    headers: event.request.headers,
  });
  const match = (res.users ?? []).find((u) => u.email.toLowerCase() === email);
  return match ? asCairnUser(match) : undefined;
}

/** List the allowlist for the manage-editors page. Owner-only. */
export async function adminsLoad(event: Ev): Promise<AdminsData> {
  const owner = requireOwner(event.locals.user);
  const res = await event.locals.auth.api.listUsers({
    query: { limit: 200 },
    headers: event.request.headers,
  });
  const admins = (res.users ?? []).map(asCairnUser).sort((a, b) => a.email.localeCompare(b.email));
  return {
    admins,
    self: owner.email,
    saved: event.url.searchParams.get('saved') === '1',
    error: event.url.searchParams.get('error'),
  };
}

/** Add an editor (create the user). Owner-only. */
export async function addAdmin(event: Ev): Promise<never> {
  requireOwner(event.locals.user);
  const form = await event.request.formData();
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const name = String(form.get('name') ?? '').trim();
  const role = form.get('role') === 'owner' ? 'owner' : 'editor';
  if (!EMAIL_RE.test(email) || !name) {
    throw redirect(303, `/admin/admins?error=${encodeURIComponent('Enter a valid email and name')}`);
  }
  // No password: a magic-link-only user (no credential account), per better-auth's createUser.
  await event.locals.auth.api.createUser({ body: { email, name, role }, headers: event.request.headers });
  throw redirect(303, '/admin/admins?saved=1');
}

/** Remove an editor (delete the user). Owner-only; owners can't remove themselves (anti-lockout). */
export async function removeAdmin(event: Ev): Promise<never> {
  const owner = requireOwner(event.locals.user);
  const form = await event.request.formData();
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  if (email === owner.email) {
    throw redirect(303, `/admin/admins?error=${encodeURIComponent("You can't remove yourself")}`);
  }
  const target = await findByEmail(event, email);
  if (!target) throw redirect(303, `/admin/admins?error=${encodeURIComponent('No such editor')}`);
  await event.locals.auth.api.removeUser({ body: { userId: target.id }, headers: event.request.headers });
  throw redirect(303, '/admin/admins?saved=1');
}

/** Change an editor's role. Owner-only; owners can't demote themselves (anti-lockout). */
export async function setAdminRole(event: Ev): Promise<never> {
  const owner = requireOwner(event.locals.user);
  const form = await event.request.formData();
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const role = form.get('role') === 'owner' ? 'owner' : 'editor';
  if (email === owner.email && role !== 'owner') {
    throw redirect(303, `/admin/admins?error=${encodeURIComponent("You can't demote yourself")}`);
  }
  const target = await findByEmail(event, email);
  if (!target) throw redirect(303, `/admin/admins?error=${encodeURIComponent('No such editor')}`);
  await event.locals.auth.api.setRole({ body: { userId: target.id, role }, headers: event.request.headers });
  // M3: revoke a demoted editor's live sessions so the privilege drop takes effect immediately.
  await event.locals.auth.api.revokeUserSessions({ body: { userId: target.id }, headers: event.request.headers });
  throw redirect(303, '/admin/admins?saved=1');
}
