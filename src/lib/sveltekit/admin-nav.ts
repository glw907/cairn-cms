// cairn-cms: the custom admin-nav config seam. A developer declares a sidebar entry for their own
// `/admin/` route as plain data; this module validates each entry and resolves it for the shell. It
// is runtime-free except for parseAdminPath, the one collision authority: an href is valid only if
// parseAdminPath returns null (genuinely unclaimed by a reserved segment, the media or index view, or
// a concept route), so a partial reserved-segment list is never reimplemented here.
import { parseAdminPath } from './admin-dispatch.js';
import type { ConceptDescriptor } from '../content/types.js';
import type { Capability } from '../auth/roles.js';
import type { Editor, Role } from '../auth/types.js';
import { canReach, hasAccessRule, type AccessMap } from '../auth/access.js';

/**
 * The bundled Lucide icon names a custom adminNav entry, or a navLayout engine ref's {@link
 *  NavLayoutEngineRef.icon} override, may use. Aligns with ADMIN_NAV_ICONS (a component-test
 *  pins the two against drift): stays an allowlist rather than the whole Lucide catalog, so the
 *  bundle stays bounded.
 */
export const ADMIN_NAV_ICON_NAMES = [
  'anchor',
  'banknote',
  'bell',
  'calendar',
  'clipboard-list',
  'file-pen',
  'files',
  'graduation-cap',
  'image',
  'inbox',
  'key-round',
  'life-buoy',
  'list',
  'list-ordered',
  'mail',
  'megaphone',
  'menu',
  'package',
  'puzzle',
  'send',
  'settings',
  'shield-check',
  'table',
  'tags',
  'users',
  'users-round',
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
 *  collapsible sidebar group beside the default's loose top-level nodes (the concepts, Library,
 *  Tags, Settings, and the rest, rendered as a plain header-less list rather than a built-in
 *  section). A section holds only flat entries, so grouping stays exactly one level deep; nest no
 *  further.
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
 * Capability-filter a resolved adminNav for one editor: a flat entry's `ownerOnly` hides it from a
 *  non-owner-capability session (owner-capability *only*, not the literal `'owner'` role name, so a
 *  vocabulary with a second owner-level role name sees the same entries as `'owner'` does), and a
 *  section keeps only the children an editor may see, disappearing entirely once every child is
 *  hidden (an all-owner-only section never teases an empty group at a non-owner).
 */
export function filterNavByRole(items: ResolvedNavItem[], capability: Capability): ResolvedNavItem[] {
  const visible = (entry: ResolvedNavEntry) => !entry.ownerOnly || capability === 'owner';
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

// The navLayout seam: a site's optional whole-sidebar arrangement, mixing engine screens and its
// own entries. `normalizeAdminNav`/`filterNavByRole` above stay in force for the legacy adminNav
// path and for the default arrangement navLayout's resolver synthesizes when a site declares none.

/** The engine's own fixed admin screens, each a navLayout reference target beyond a concept id. */
const ENGINE_SCREEN_IDS = ['media', 'vocabulary', 'nav', 'settings', 'editors', 'help'] as const;

/**
 * One of the engine's own admin screens, or a site's own concept id. The six literals autocomplete
 *  in an editor while a dynamic concept id, not knowable at the type level, stays assignable;
 *  {@link validateNavLayout} is the real gate against a site's declared concepts and screens.
 */
export type EngineScreenId = (typeof ENGINE_SCREEN_IDS)[number] | (string & {});

/**
 * A navLayout node that places one of the engine's own screens: a concept's list/edit pair, or one
 *  of the fixed utility screens. `label` relabels the door without touching its engine-owned icon or
 *  href; `hidden: true` removes the door deliberately (the route itself stays live, since nav
 *  placement is never authorization); `icon` overrides the engine-owned glyph with one of the
 *  bundled allowlist names (the two dated concepts otherwise share one newspaper glyph), validated
 *  the same way a site entry's own icon is.
 */
export interface NavLayoutEngineRef {
  screen: EngineScreenId;
  label?: string;
  hidden?: true;
  icon?: AdminNavIcon;
}

/** A site's own nav entry inside a navLayout tree: today's `AdminNavEntry`, plus declarative role visibility. */
export interface NavLayoutEntry extends AdminNavEntry {
  /** Renders only when the signed-in editor's role is in this list; absent renders for every role. */
  roles?: Role[];
}

/**
 * One named group inside a navLayout tree, holding a mix of site entries and engine references (no
 *  nesting, the same one-level rule `AdminNavSection` keeps). `roles` gates every child at once,
 *  composing with the capability gates each child already carries.
 */
export interface NavLayoutSection {
  label: string;
  children: (NavLayoutEntry | NavLayoutEngineRef)[];
  roles?: Role[];
  /**
   * Whether this group starts collapsed for a visitor with no persisted nav-collapse cookie;
   *  absent (or false) renders open, today's behavior. Once any header is touched, the
   *  `cairn-admin-nav-collapsed` cookie carries the full collapsed set and wins entirely, so this
   *  declaration applies only until a visitor's first toggle.
   */
  collapsed?: boolean;
}

/** A site's whole declared sidebar: engine references, its own entries, and sections, in declaration order. */
export type NavLayout = (NavLayoutEntry | NavLayoutEngineRef | NavLayoutSection)[];

/** True when a navLayout node is a section (carries `children`) rather than an entry or an engine reference. */
function isNavLayoutSection(
  node: NavLayoutEntry | NavLayoutEngineRef | NavLayoutSection,
): node is NavLayoutSection {
  return 'children' in node;
}

/** True when a navLayout child is an engine reference (carries `screen`) rather than a site entry. */
function isNavLayoutEngineRef(node: NavLayoutEntry | NavLayoutEngineRef): node is NavLayoutEngineRef {
  return 'screen' in node;
}

/**
 * Validate a site's raw navLayout tree once at construction (server start), `defineRoles`-style:
 *  throws a `navLayout`-prefixed, actionable error naming the bad node, so a misconfiguration fails
 *  at server start rather than rendering a broken or silently-wrong sidebar. Checks, in order: a site
 *  cannot declare both `adminNav` and `navLayout` (no single source of truth for the sidebar
 *  otherwise); every engine reference names a real screen (a declared concept id or one of the fixed
 *  utility screens) and is referenced at most once, a hidden reference included; `'nav'` is
 *  referenced only when the site configures a navMenu; a relabel is never blank; a section's own
 *  label is never blank and never repeats another section's label; a section carries no nested
 *  section and at least one child; two site entries, top-level or inside a section, never share an
 *  href anywhere in the tree (a duplicate would resolve to two links pointing at the same route, and
 *  the shell's key-safety fallback would otherwise be the only thing standing between that and a
 *  silent last-write-wins render); a `roles` list, on an entry or a section, names only a role the
 *  site's vocabulary actually declares. A site entry embedded in the tree is validated the same way a
 *  flat `adminNav` entry is (the bundled icon allowlist, the built-in href collision), reusing
 *  {@link resolveEntry} so the two paths can never drift.
 * @param layout - The raw config.
 *
 * The second parameter carries context this validation needs but does not itself derive: the
 *  site's concept ids (for the engine screen-id set and the embedded-entry href collision check),
 *  whether a navMenu is configured, the declared role vocabulary's names, and whether the site also
 *  declared `adminNav`.
 */
export function validateNavLayout(
  layout: NavLayout,
  ctx: {
    conceptIds: string[];
    navMenuConfigured: boolean;
    roleNames: string[];
    hasAdminNav: boolean;
  },
): void {
  if (ctx.hasAdminNav) {
    throw new Error(
      'navLayout: a site cannot declare both adminNav and navLayout; declare custom screens inside navLayout',
    );
  }
  const knownScreens = new Set<string>([...ctx.conceptIds, ...ENGINE_SCREEN_IDS]);
  // parseAdminPath's concept lookup (findConcept) reads only `.id`, so a minimal stub carries the ids
  // this validation receives without materializing full ConceptDescriptor objects (fields, schema,
  // validate) that no path here needs.
  const stubConcepts = ctx.conceptIds.map((id) => ({ id })) as unknown as ConceptDescriptor[];
  const seenScreens = new Set<string>();
  const seenSectionLabels = new Set<string>();
  const seenEntryHrefs = new Set<string>();

  function checkHref(href: string, where: string): void {
    if (seenEntryHrefs.has(href)) {
      throw new Error(`navLayout: href "${href}" is used by more than one entry (${where} duplicates an earlier one); give each entry a unique href`);
    }
    seenEntryHrefs.add(href);
  }

  function checkRoles(roles: Role[] | undefined, where: string): void {
    if (!roles) return;
    for (const name of roles) {
      if (!ctx.roleNames.includes(name)) {
        throw new Error(
          `navLayout: ${where} names role "${name}", outside the declared vocabulary (${ctx.roleNames.join(', ')})`,
        );
      }
    }
  }

  function checkEngineRef(ref: NavLayoutEngineRef): void {
    if (!knownScreens.has(ref.screen)) {
      throw new Error(`navLayout: unknown screen "${ref.screen}"`);
    }
    if (ref.screen === 'nav' && !ctx.navMenuConfigured) {
      throw new Error('navLayout: screen "nav" is referenced but no navMenu is configured');
    }
    if (seenScreens.has(ref.screen)) {
      throw new Error(`navLayout: screen "${ref.screen}" is referenced more than once`);
    }
    seenScreens.add(ref.screen);
    if (ref.label !== undefined && ref.label.trim() === '') {
      throw new Error(`navLayout: screen "${ref.screen}" has an empty relabel`);
    }
    if (ref.icon !== undefined && !ADMIN_NAV_ICON_NAMES.includes(ref.icon)) {
      throw new Error(
        `navLayout: screen "${ref.screen}" has icon "${ref.icon}", not one of ${ADMIN_NAV_ICON_NAMES.join(', ')}`,
      );
    }
  }

  for (const node of layout) {
    if (isNavLayoutSection(node)) {
      if (node.label.trim() === '') {
        throw new Error('navLayout: a section label cannot be blank');
      }
      if (seenSectionLabels.has(node.label)) {
        throw new Error(`navLayout: two sections share the label "${node.label}"; give each section a unique label`);
      }
      seenSectionLabels.add(node.label);
      if (node.children.length === 0) {
        throw new Error(`navLayout: section "${node.label}" has no children`);
      }
      checkRoles(node.roles, `section "${node.label}"`);
      for (const child of node.children) {
        if (isNavLayoutSection(child)) {
          throw new Error(`navLayout: section "${node.label}" cannot contain a nested section`);
        }
        if (isNavLayoutEngineRef(child)) {
          checkEngineRef(child);
        } else {
          resolveEntry(child, stubConcepts);
          checkHref(child.href, `an entry in section "${node.label}"`);
          checkRoles(child.roles, `an entry in section "${node.label}"`);
        }
      }
    } else if (isNavLayoutEngineRef(node)) {
      checkEngineRef(node);
    } else {
      resolveEntry(node, stubConcepts);
      checkHref(node.href, 'a top-level entry');
      checkRoles(node.roles, 'a top-level entry');
    }
  }
}

// The access-map seam: a site's defineAccess declaration validates its shape and role vocabulary
// at construction (auth/access.ts), but a screen-id key's existence needs the real concept list and
// engine-route table, which only composition has. validateAccessComposition is the second stage,
// the same split validateNavLayout uses above.

/**
 * The fixed engine screens the access map can gate a role by, beyond a site's own concept ids.
 *  `editors` stays owner-only regardless of the map (canReach's own floor) and `help` stays open
 *  to any editor capability; neither route reads the map, so the map cannot name them.
 */
const ACCESS_FIXED_SCREENS = ['media', 'vocabulary', 'nav', 'settings'] as const;

/**
 * Validate a site's declared access map once at composition (server start), after `defineAccess`'s
 *  own shape/vocabulary check: a screen-id key must name either a real concept or one of the fixed
 *  engine screens this pass enforces ({@link ACCESS_FIXED_SCREENS}), and an href key must not
 *  collide with a built-in admin route (the `parseAdminPath` authority, the same collision check
 *  `normalizeAdminNav` and `validateNavLayout` both use). Throws an actionable `access:`-prefixed
 *  error naming the bad key, so a misconfiguration fails at server start rather than silently never
 *  gating (or never even reachable) at request time.
 * @param access - The site's declared access map.
 *
 * The second parameter carries context this validation needs but does not itself derive: the
 *  site's real concept ids, the same role `validateNavLayout`'s own second parameter plays.
 */
export function validateAccessComposition(access: AccessMap, ctx: { conceptIds: string[] }): void {
  const knownScreens = new Set<string>([...ctx.conceptIds, ...ACCESS_FIXED_SCREENS]);
  // parseAdminPath's concept lookup (findConcept) reads only `.id`, mirroring validateNavLayout's
  // own stub above.
  const stubConcepts = ctx.conceptIds.map((id) => ({ id })) as unknown as ConceptDescriptor[];
  for (const key of Object.keys(access)) {
    if (key.startsWith('/')) {
      const path = key.split(/[?#]/)[0]!;
      const parsed = parseAdminPath(path, stubConcepts);
      if (parsed) {
        throw new Error(
          `access: href "${key}" collides with cairn's built-in "${parsed.view}" view; map a screen id or an unclaimed path instead`,
        );
      }
      continue;
    }
    if (!knownScreens.has(key)) {
      throw new Error(
        `access: "${key}" is neither a declared concept nor one of the fixed engine screens (${ACCESS_FIXED_SCREENS.join(', ')})`,
      );
    }
  }
}

// The resolver: turns a validated (or absent) navLayout, plus the per-request capability/role and
// the site's own concepts/navMenu/legacy adminNav, into one arranged, filtered, serializable tree
// the shell renders directly. Runs fresh per request (the capability/role gates are per-editor), but
// the arrangement itself is pure data shuffling, no I/O.

/** One resolved engine door: the fixed screen id, its label (declared default or a site relabel), and its engine-owned href. */
export interface ResolvedEngineNavEntry {
  screen: EngineScreenId;
  label: string;
  href: string;
  /**
   * Present only when the entry is a content concept: whether the concept is dated (posts-like).
   *  The shell picks the concept's kind glyph from it, so adjacent concepts stop sharing one
   *  document icon.
   */
  dated?: boolean;
  /**
   * Present only when the declared {@link NavLayoutEngineRef.icon} overrode the engine-owned
   *  glyph; the shell prefers this over its own default when set.
   */
  iconName?: AdminNavIcon;
}

/** One resolved leaf in a navLayout tree: a site's own entry, or one of the engine's own screens. */
export type ResolvedLayoutChild = ResolvedNavEntry | ResolvedEngineNavEntry;

/** One resolved named group in a navLayout tree, its children already filtered and non-empty. */
export interface ResolvedLayoutSection {
  label: string;
  children: ResolvedLayoutChild[];
  /**
   * Carried from the declared {@link NavLayoutSection.collapsed}; absent means open, today's
   *  behavior. The shell reads this only to seed a session with no nav-collapse cookie; a
   *  present cookie's own set wins regardless of this value.
   */
  collapsed?: boolean;
}

/** One resolved top-level navLayout node: a loose child, or a section of them. */
export type ResolvedLayoutNode = ResolvedLayoutChild | ResolvedLayoutSection;

/**
 * The whole resolved sidebar for one request: the arranged, filtered scroll-area tree in
 *  declaration order, plus the trailing `fallback` group of engine screens the tree never
 *  referenced (rendered in the shell's foot slot, engine order, empty when every screen was
 *  referenced).
 */
export interface ResolvedNavLayout {
  items: ResolvedLayoutNode[];
  fallback: ResolvedLayoutChild[];
}

/** The context resolveNavLayout needs to arrange and filter one request's sidebar. */
export interface ResolveNavLayoutOptions {
  /** The site's raw navLayout, or undefined for the default synthesized arrangement. */
  layout: NavLayout | undefined;
  /** The site's normalized legacy adminNav, folded into the default arrangement (locked call 6). */
  adminNav: ResolvedNavItem[];
  /**
   * The site's concepts, each a navLayout reference target beyond the fixed engine screens.
   *  `routing.dated` feeds the concept's kind glyph; a caller passing normalized concepts always
   *  carries it.
   */
  concepts: { id: string; label: string; routing?: { dated: boolean } }[];
  /** The nav-menu editor's label, or null when the site configures none (gates the `nav` screen). */
  navMenuLabel: string | null;
  /**
   * The site's declared access map, or undefined for zero-config. Every engine door is gated
   *  through {@link canReach} against this map (folding in row 4's capability floor); a site entry
   *  is additionally gated by it only when its href actually carries a matching rule, so an
   *  undeclared map or an unmapped href keeps today's behavior exactly.
   */
  access?: AccessMap;
  /**
   * The signed-in editor whose capability gates every engine screen (row 4 of the design table)
   *  and whose role is matched against a node's declarative `roles` list and against the access
   *  map. Replaces the former loose `capability`/`role` pair so the resolver reads the same
   *  authority ({@link canReach}) the guard and the route gates do.
   */
  editor: Editor;
}

/** The engine's own screen defaults (label, href) not already covered by a site's concepts. */
const ENGINE_SCREEN_DEFAULTS: Record<(typeof ENGINE_SCREEN_IDS)[number], { label: string; href: string }> = {
  media: { label: 'Library', href: '/admin/media' },
  vocabulary: { label: 'Tags', href: '/admin/vocabulary' },
  nav: { label: '', href: '/admin/nav' }, // label substituted from navMenuLabel at resolve time
  settings: { label: 'Settings', href: '/admin/settings' },
  editors: { label: 'Editors', href: '/admin/editors' },
  help: { label: 'Help', href: '/admin/help' },
};

/** The default label/href for one engine screen id: a concept's own label, or the fixed table above. */
function engineDefault(screen: string, opts: ResolveNavLayoutOptions): { label: string; href: string } {
  const fixed = (ENGINE_SCREEN_DEFAULTS as Record<string, { label: string; href: string } | undefined>)[screen];
  if (fixed) {
    return screen === 'nav' ? { label: opts.navMenuLabel ?? '', href: fixed.href } : fixed;
  }
  const concept = opts.concepts.find((c) => c.id === screen);
  return { label: concept?.label ?? screen, href: `/admin/${screen}` };
}

/**
 * Whether one engine screen is visible for the current request: `nav` additionally requires a
 *  configured navMenu (an orthogonal gate the access map cannot express, since an unconfigured
 *  `nav` is never a valid reference at all); every other screen defers entirely to
 *  {@link canReach}, which folds in the capability floor (the 0.85.0 rule), the `editors` owner
 *  floor, and the site's own map narrowing, so this generalizes the pre-map gate rather than
 *  adding a second one beside it.
 */
function engineVisible(screen: string, opts: ResolveNavLayoutOptions): boolean {
  if (screen === 'nav' && opts.navMenuLabel === null) return false;
  return canReach(opts.access, opts.editor, screen);
}

/** Resolve one engine screen into its door, applying a declared relabel and icon override when given. */
function engineEntry(
  screen: string,
  opts: ResolveNavLayoutOptions,
  labelOverride?: string,
  iconOverride?: AdminNavIcon,
): ResolvedEngineNavEntry {
  const fallback = engineDefault(screen, opts);
  const concept = opts.concepts.find((c) => c.id === screen);
  // Optional-chained on purpose: normalizeConcepts always supplies routing, but test harnesses
  // build partial descriptors, and an undated default is the correct read for both.
  return {
    screen,
    label: labelOverride ?? fallback.label,
    href: fallback.href,
    ...(concept ? { dated: concept.routing?.dated === true } : {}),
    ...(iconOverride ? { iconName: iconOverride } : {}),
  };
}

/** True when a resolved site entry stays visible: `ownerOnly` gates on capability alone. */
function ownerOnlyVisible(entry: { ownerOnly?: boolean }, opts: ResolveNavLayoutOptions): boolean {
  return !entry.ownerOnly || opts.editor.capability === 'owner';
}

/**
 * Whether a site entry's own href passes the access map's narrowing. Unlike an engine screen, a
 *  site entry is gated by the map only when its href actually carries a matching rule ({@link
 *  hasAccessRule}); an undeclared map or an href the map has no opinion on keeps today's
 *  any-editor-capability admission exactly (nav semantics, distinct from `requireAccess`'s
 *  fail-closed route contract). A matched href defers entirely to {@link canReach}.
 */
function hrefReachable(href: string, opts: ResolveNavLayoutOptions): boolean {
  if (!opts.access || !hasAccessRule(opts.access, href)) return true;
  return canReach(opts.access, opts.editor, href);
}

/**
 * The engine's canonical screen order: each declared concept (by declaration order), then the
 *  fixed utility screens, `nav` included only when a navMenu is configured (an unconfigured `nav`
 *  is never a valid reference at all, so it never appears here or in `fallback`). Both the default
 *  synthesis and the omission-fallback computation walk this same order.
 */
function engineScreenOrder(opts: ResolveNavLayoutOptions): string[] {
  return [
    ...opts.concepts.map((c) => c.id),
    'media',
    'vocabulary',
    ...(opts.navMenuLabel !== null ? ['nav'] : []),
    'settings',
    'editors',
    'help',
  ];
}

/** Resolve one navLayout site entry (embedded in the tree), dropping its declarative `roles` field. */
function resolvedLayoutEntry(entry: NavLayoutEntry): ResolvedNavEntry {
  return { label: entry.label, iconName: entry.icon, href: entry.href, ownerOnly: entry.ownerOnly ?? false };
}

/**
 * Whether a node's declarative `roles` list admits the current request's role. `roles` is typed
 *  against the site's own Register-narrowed `Role` union, while the resolver only ever carries a
 *  plain `string` (the signed-in editor's role name, unnarrowed at this generic layer); `Role`
 *  always extends `string`, so the readonly-array widening below is the one safe hop, not a
 *  blanket escape. Absent `roles` always admits.
 */
function roleMatches(roles: Role[] | undefined, role: string): boolean {
  return !roles || (roles as readonly string[]).includes(role);
}

/**
 * Arrange and filter a declared navLayout tree. Walks the tree in declaration order, resolving each
 *  engine reference against the current request's capability (dropping it, but still marking it
 *  referenced, when gated out or `hidden`) and each site entry against `ownerOnly` and its
 *  declarative `roles`; a section additionally gates every child at once by its own `roles` and
 *  disappears once its children are empty (whether from filtering or from a gated-out section). The
 *  trailing `fallback` is every engine screen the tree never referenced, in engine order, still
 *  subject to the same capability gate.
 */
function resolveDeclaredLayout(layout: NavLayout, opts: ResolveNavLayoutOptions): ResolvedNavLayout {
  const referenced = new Set<string>();

  function resolveChild(node: NavLayoutEntry | NavLayoutEngineRef): ResolvedLayoutChild | null {
    if (isNavLayoutEngineRef(node)) {
      referenced.add(node.screen);
      if (node.hidden || !engineVisible(node.screen, opts)) return null;
      return engineEntry(node.screen, opts, node.label, node.icon);
    }
    if (!ownerOnlyVisible(node, opts)) return null;
    if (!roleMatches(node.roles, opts.editor.role)) return null;
    if (!hrefReachable(node.href, opts)) return null;
    return resolvedLayoutEntry(node);
  }

  const items: ResolvedLayoutNode[] = [];
  for (const node of layout) {
    if (isNavLayoutSection(node)) {
      if (!roleMatches(node.roles, opts.editor.role)) {
        // The section itself is gated out for this role, but its engine references still count as
        // "referenced": a screen tucked inside a roles-gated section must not leak into fallback
        // just because this editor cannot see the section that names it.
        for (const child of node.children) {
          if (isNavLayoutEngineRef(child)) referenced.add(child.screen);
        }
        continue;
      }
      const children: ResolvedLayoutChild[] = [];
      for (const child of node.children) {
        const resolved = resolveChild(child);
        if (resolved) children.push(resolved);
      }
      if (children.length > 0) items.push({ label: node.label, children, collapsed: node.collapsed });
    } else {
      const resolved = resolveChild(node);
      if (resolved) items.push(resolved);
    }
  }

  const fallback: ResolvedLayoutChild[] = [];
  for (const screen of engineScreenOrder(opts)) {
    if (!referenced.has(screen) && engineVisible(screen, opts)) {
      fallback.push(engineEntry(screen, opts));
    }
  }

  return { items, fallback };
}

/**
 * Synthesize the flat zero-config default arrangement for a site that declares no navLayout: the
 *  concepts, the legacy flat adminNav entries, then the fixed engine screens in their existing order
 *  (media, vocabulary, nav when configured, settings, editors) as loose top-level nodes, followed by
 *  each legacy adminNav section in declaration order; `help` is deliberately left unreferenced, so it
 *  resolves into `fallback`. No section wraps the engine or legacy-flat nodes: at the sizes a
 *  zero-config site actually reaches, a section header pays a category-decision cost the flat list
 *  never earns back (docs/superpowers/specs/2026-07-14-admin-reorganization-design.md, §1). A legacy
 *  entry's href is gated by the access map the same way a declared navLayout entry's is ({@link
 *  hrefReachable}), so the two arrangements can never drift for the same map.
 */
function resolveDefaultLayout(opts: ResolveNavLayoutOptions): ResolvedNavLayout {
  const roleFiltered = filterNavByRole(opts.adminNav, opts.editor.capability);
  const accessFiltered: ResolvedNavItem[] = [];
  for (const item of roleFiltered) {
    if (isResolvedNavSection(item)) {
      const children = item.children.filter((child) => hrefReachable(child.href, opts));
      if (children.length > 0) accessFiltered.push({ label: item.label, children });
    } else if (hrefReachable(item.href, opts)) {
      accessFiltered.push(item);
    }
  }
  const legacyFlatEntries = accessFiltered.filter(isResolvedNavEntry);
  const legacySections = accessFiltered.filter(isResolvedNavSection);

  const items: ResolvedLayoutNode[] = [];
  for (const concept of opts.concepts) {
    if (engineVisible(concept.id, opts)) items.push(engineEntry(concept.id, opts));
  }
  items.push(...legacyFlatEntries);
  // engineVisible is the single visibility authority (nav needs a configured navMenu, editors needs
  // owner, all need capability !== 'none'), the same gate the concept loop above and the help
  // fallback below rely on.
  for (const screen of ['media', 'vocabulary', 'nav', 'settings', 'editors']) {
    if (engineVisible(screen, opts)) items.push(engineEntry(screen, opts));
  }
  items.push(...legacySections);

  const fallback: ResolvedLayoutChild[] = engineVisible('help', opts) ? [engineEntry('help', opts)] : [];

  return { items, fallback };
}

/**
 * Resolve one request's whole sidebar: a declared navLayout arranges and filters as written; an
 *  undeclared one synthesizes today's default arrangement through the same primitives, so the two
 *  paths can never drift (locked call 6). Every engine screen is gated by the current capability
 *  (row 4 of the design table); a site entry additionally gates on `ownerOnly` and its declarative
 *  `roles`; a section gates all its children at once by its own `roles` and disappears once its
 *  children resolve empty. `navFilter`, the site's per-request dynamic filter, is not applied here
 *  (it runs afterward, over `items` only, in the shell payload).
 */
export function resolveNavLayout(opts: ResolveNavLayoutOptions): ResolvedNavLayout {
  return opts.layout ? resolveDeclaredLayout(opts.layout, opts) : resolveDefaultLayout(opts);
}
