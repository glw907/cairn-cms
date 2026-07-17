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
import LayersIcon from '@lucide/svelte/icons/layers';
import NewspaperIcon from '@lucide/svelte/icons/newspaper';
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
 *  never a key here, with one exception: `fragments` is the engine-reserved concept id
 *  ({@link FRAGMENTS_CONCEPT_ID} in content/concepts.ts), so it carries its own glyph (layers,
 *  "one thing present in many places"; puzzle stays reserved for component blocks). Every other
 *  concept's glyph follows its kind instead: dated concepts take {@link ENGINE_CONCEPT_DATED_ICON}
 *  and undated ones {@link ENGINE_NAV_FALLBACK_ICON}, so adjacent concepts (Posts beside Pages)
 *  stop sharing one document silhouette.
 */
export const ENGINE_NAV_ICONS: Record<string, Component> = {
  media: ImageIcon,
  vocabulary: TagIcon,
  nav: SignpostIcon,
  settings: SettingsIcon,
  editors: UsersIcon,
  help: HelpCircleIcon,
  fragments: LayersIcon,
};

/** The glyph for a dated concept's door (posts-like: feed entries with dates). */
export const ENGINE_CONCEPT_DATED_ICON = NewspaperIcon;

/** The glyph for an undated concept's door, and the fallback for any unmapped engine screen. */
export const ENGINE_NAV_FALLBACK_ICON = FileTextIcon;
