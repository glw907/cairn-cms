// cairn-core: capability checks. Management surfaces gate on a capability, not on a role name,
// so the two-tier owner/editor model can grow finer capabilities (and a future role) additively.
// Creating a page and changing the nav are structural acts, so they sit with owner; editing a
// page's content and running the story feed are everyday editor work.
import { error } from '@sveltejs/kit';
import type { CairnUser } from './guard';

export type Capability =
  | 'story:create'
  | 'story:edit'
  | 'page:edit'
  | 'page:create'
  | 'nav:manage'
  | 'user:manage';

// One source of truth. `'all'` means every capability; otherwise the explicit grant list. A future
// `manager` role is one more row here, no call-site changes.
const CAPS_BY_ROLE: Record<CairnUser['role'], readonly Capability[] | 'all'> = {
  owner: 'all',
  editor: ['story:create', 'story:edit', 'page:edit'],
};

/** Does this user hold the capability? A signed-out (null) user holds nothing. */
export function can(user: CairnUser | null, cap: Capability): boolean {
  if (!user) return false;
  const grants = CAPS_BY_ROLE[user.role];
  return grants === 'all' || grants.includes(cap);
}

/** Assert the capability for a route load/action: 401 when signed out, 403 when under-privileged. */
export function requireCapability(user: CairnUser | null, cap: Capability): CairnUser {
  if (!user) throw error(401, 'Not signed in');
  if (!can(user, cap)) throw error(403, 'You do not have permission to do that');
  return user;
}
