// The custom-nav icon allowlist mapped to its Lucide components, each a per-icon default import so
// only these nine glyphs ship. The shell reads this map to render a developer's adminNav entry; the
// content layer never imports it. The key set mirrors ADMIN_NAV_ICON_NAMES in admin-nav.ts.
import AnchorIcon from '@lucide/svelte/icons/anchor';
import CalendarIcon from '@lucide/svelte/icons/calendar';
import ClipboardListIcon from '@lucide/svelte/icons/clipboard-list';
import ListIcon from '@lucide/svelte/icons/list';
import UsersIcon from '@lucide/svelte/icons/users';
import PackageIcon from '@lucide/svelte/icons/package';
import InboxIcon from '@lucide/svelte/icons/inbox';
import TableIcon from '@lucide/svelte/icons/table';
import WrenchIcon from '@lucide/svelte/icons/wrench';
import FileTextIcon from '@lucide/svelte/icons/file-text';
import SignpostIcon from '@lucide/svelte/icons/signpost';
import SettingsIcon from '@lucide/svelte/icons/settings';
import ImageIcon from '@lucide/svelte/icons/image';
import TagIcon from '@lucide/svelte/icons/tag';
import HelpCircleIcon from '@lucide/svelte/icons/circle-help';
import type { Component } from 'svelte';
import type { AdminNavIcon } from '../sveltekit/admin-nav.js';

/** Maps each allowed adminNav icon name to its Lucide component, for the shell to render. */
export const ADMIN_NAV_ICONS: Record<AdminNavIcon, Component> = {
  anchor: AnchorIcon,
  calendar: CalendarIcon,
  'clipboard-list': ClipboardListIcon,
  list: ListIcon,
  users: UsersIcon,
  package: PackageIcon,
  inbox: InboxIcon,
  table: TableIcon,
  wrench: WrenchIcon,
};

/** The glyph shown when a custom-nav entry's icon name has no map entry, a defensive fallback. */
export const ADMIN_NAV_FALLBACK_ICON = ListIcon;

/**
 * Maps each of the engine's fixed utility screen ids to its Lucide icon; a content concept's id is
 *  never a key here (its glyph is {@link ENGINE_NAV_FALLBACK_ICON}), since a concept id is dynamic
 *  per site and shares one door glyph the way it always has.
 */
export const ENGINE_NAV_ICONS: Record<string, Component> = {
  media: ImageIcon,
  vocabulary: TagIcon,
  nav: SignpostIcon,
  settings: SettingsIcon,
  editors: UsersIcon,
  help: HelpCircleIcon,
};

/** The glyph shown for a resolved engine screen with no entry in {@link ENGINE_NAV_ICONS}: a content concept's door. */
export const ENGINE_NAV_FALLBACK_ICON = FileTextIcon;
