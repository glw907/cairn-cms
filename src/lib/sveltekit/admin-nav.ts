// cairn-cms: the custom admin-nav config seam. A developer declares a sidebar entry for their own
// `/admin/` route as plain data; this module validates each entry and resolves it for the shell. It
// is runtime-free except for parseAdminPath, the one collision authority: an href is valid only if
// parseAdminPath returns null (genuinely unclaimed by a reserved segment, the media or index view, or
// a concept route), so a partial reserved-segment list is never reimplemented here.
import { parseAdminPath } from './admin-dispatch.js';
import type { ConceptDescriptor } from '../content/types.js';
import type { Role } from '../auth/types.js';

/** The bundled Lucide icon names a custom adminNav entry may use. Aligns with ADMIN_NAV_ICONS. */
const ADMIN_NAV_ICON_NAMES = [
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

/**
 * One level of grouping: a named section of the developer's own entries, rendered as its own
 *  collapsible sidebar group beside the built-in Core section (`ConceptList`'s concepts, Library,
 *  Tags, Settings, and the rest). A section holds only flat entries, so grouping stays exactly one
 *  level deep; nest no further.
 */
export interface AdminNavSection {
  label: string;
  children: AdminNavEntry[];
}

/** A site's raw `adminNav` config: a mix of flat entries and one-level sections, in declaration order. */
export type AdminNavConfig = (AdminNavEntry | AdminNavSection)[];

/** A validated custom-nav entry the shell renders: the icon name resolved, ownerOnly defaulted. */
export interface ResolvedNavEntry {
  label: string;
  iconName: AdminNavIcon;
  href: string;
  ownerOnly: boolean;
}

/** A validated custom-nav section: its children resolved the same way a flat entry is. */
export interface ResolvedNavSection {
  label: string;
  children: ResolvedNavEntry[];
}

/** One resolved `adminNav` item: a flat entry, or a one-level section of them. */
export type ResolvedNavItem = ResolvedNavEntry | ResolvedNavSection;

/** True when a raw config item is a section (carries `children`) rather than a flat entry. */
export function isAdminNavSection(item: AdminNavEntry | AdminNavSection): item is AdminNavSection {
  return 'children' in item;
}

/** True when a resolved item is a section (carries `children`) rather than a flat entry. */
export function isResolvedNavSection(item: ResolvedNavItem): item is ResolvedNavSection {
  return 'children' in item;
}

/** True when a resolved item is a flat entry (no `children`) rather than a section. */
export function isResolvedNavEntry(item: ResolvedNavItem): item is ResolvedNavEntry {
  return !('children' in item);
}

/**
 * Validate and resolve one flat entry: its icon must be in the bundled allowlist and its href must
 *  not collide with a built-in admin view (the parseAdminPath authority). Throws an actionable error
 *  naming the bad entry, so a misconfiguration fails at server start rather than rendering a broken
 *  or shadowing sidebar link.
 */
function resolveEntry(entry: AdminNavEntry, concepts: ConceptDescriptor[]): ResolvedNavEntry {
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
}

/**
 * Validate and resolve a site's custom adminNav config. Each flat entry's icon must be in the
 *  bundled allowlist and its href must not collide with a built-in admin view (the parseAdminPath
 *  authority); a section's children are each validated the same way. Throws an actionable error on
 *  the first bad entry, so a misconfiguration fails at server start rather than rendering a broken
 *  or shadowing sidebar link. Returns the resolved items in declaration order, `ownerOnly` defaulted
 *  to false on every flat entry.
 * @param entries - The raw config, or undefined when the site declares none.
 * @param concepts - The site's concepts, so parseAdminPath can recognize a concept-route href.
 * @returns The validated items, in declaration order.
 */
export function normalizeAdminNav(
  entries: AdminNavConfig | undefined,
  concepts: ConceptDescriptor[],
): ResolvedNavItem[] {
  if (!entries) return [];
  return entries.map((item): ResolvedNavItem => {
    if (isAdminNavSection(item)) {
      return {
        label: item.label,
        children: item.children.map((child) => resolveEntry(child, concepts)),
      };
    }
    return resolveEntry(item, concepts);
  });
}

/**
 * Role-filter a resolved adminNav for one editor: a flat entry's `ownerOnly` hides it from a
 *  non-owner, and a section keeps only the children an editor may see, disappearing entirely once
 *  every child is hidden (an all-owner-only section never teases an empty group at a non-owner).
 */
export function filterNavByRole(items: ResolvedNavItem[], role: Role): ResolvedNavItem[] {
  const visible = (entry: ResolvedNavEntry) => !entry.ownerOnly || role === 'owner';
  const out: ResolvedNavItem[] = [];
  for (const item of items) {
    if (isResolvedNavSection(item)) {
      const children = item.children.filter(visible);
      if (children.length > 0) out.push({ label: item.label, children });
    } else if (visible(item)) {
      out.push(item);
    }
  }
  return out;
}

/** Flatten a resolved adminNav into its flat entries, section children included, in visual order. */
export function flattenNavEntries(items: ResolvedNavItem[]): ResolvedNavEntry[] {
  return items.flatMap((item) => (isResolvedNavSection(item) ? item.children : [item]));
}
