// cairn-cms: the custom admin-nav config seam. A developer declares a sidebar entry for their own
// `/admin/` route as plain data; this module validates each entry and resolves it for the shell. It
// is runtime-free except for parseAdminPath, the one collision authority: an href is valid only if
// parseAdminPath returns null (genuinely unclaimed by a reserved segment, the media or index view, or
// a concept route), so a partial reserved-segment list is never reimplemented here.
import { parseAdminPath } from './admin-dispatch.js';
import type { ConceptDescriptor } from '../content/types.js';

/** The bundled Lucide icon names a custom adminNav entry may use. Aligns with ADMIN_NAV_ICONS. */
export const ADMIN_NAV_ICON_NAMES = [
  'anchor',
  'calendar',
  'clipboard-list',
  'list',
  'users',
  'package',
  'inbox',
  'table',
  'wrench',
] as const;

/** One of the bundled custom-nav icon names. */
export type AdminNavIcon = (typeof ADMIN_NAV_ICON_NAMES)[number];

/** A developer's raw custom-nav config: a sidebar link to one of their own `/admin/` routes. */
export interface AdminNavEntry {
  label: string;
  icon: AdminNavIcon;
  href: string;
  /** Hides the link from a non-owner; cosmetic only, so the route must still gate server-side. */
  ownerOnly?: boolean;
}

/** A validated custom-nav entry the shell renders: the icon name resolved, ownerOnly defaulted. */
export interface ResolvedNavEntry {
  label: string;
  iconName: AdminNavIcon;
  href: string;
  ownerOnly: boolean;
}

/**
 * Validate and resolve a site's custom adminNav config. Each entry's icon must be in the bundled
 *  allowlist, and its href must not collide with a built-in admin view (the parseAdminPath authority).
 *  Throws an actionable error on the first bad entry, so a misconfiguration fails at server start
 *  rather than rendering a broken or shadowing sidebar link. Returns the resolved entries with
 *  `ownerOnly` defaulted to false.
 *
 * @param entries - The raw config, or undefined when the site declares none.
 * @param concepts - The site's concepts, so parseAdminPath can recognize a concept-route href.
 * @returns The validated entries, in declaration order.
 */
export function normalizeAdminNav(
  entries: AdminNavEntry[] | undefined,
  concepts: ConceptDescriptor[],
): ResolvedNavEntry[] {
  if (!entries) return [];
  return entries.map((entry) => {
    if (!ADMIN_NAV_ICON_NAMES.includes(entry.icon)) {
      throw new Error(
        `adminNav icon "${entry.icon}" is not one of ${ADMIN_NAV_ICON_NAMES.join(', ')}`,
      );
    }
    // Strip a query or hash so the path alone is checked for a collision.
    const path = entry.href.split(/[?#]/)[0];
    const parsed = parseAdminPath(path, concepts);
    if (parsed) {
      throw new Error(
        `adminNav href "${entry.href}" collides with cairn's built-in "${parsed.view}" view; choose an unclaimed /admin/<segment>`,
      );
    }
    return {
      label: entry.label,
      iconName: entry.icon,
      href: entry.href,
      ownerOnly: entry.ownerOnly ?? false,
    };
  });
}
