// The custom-nav icon allowlist mapped to its Lucide components, each a per-icon default import so
// only these glyphs ship. The shell reads this map to render a developer's adminNav entry, or a
// navLayout engine ref's icon override; the content layer never imports it. The key set mirrors
// ADMIN_NAV_ICON_NAMES in admin-nav.ts (a component test pins the two against drift).
import AnchorIcon from '@lucide/svelte/icons/anchor';
import BanknoteIcon from '@lucide/svelte/icons/banknote';
import BellIcon from '@lucide/svelte/icons/bell';
import CalendarIcon from '@lucide/svelte/icons/calendar';
import ClipboardListIcon from '@lucide/svelte/icons/clipboard-list';
import FilePenIcon from '@lucide/svelte/icons/file-pen';
import FilesIcon from '@lucide/svelte/icons/files';
import GraduationCapIcon from '@lucide/svelte/icons/graduation-cap';
import InboxIcon from '@lucide/svelte/icons/inbox';
import KeyRoundIcon from '@lucide/svelte/icons/key-round';
import LifeBuoyIcon from '@lucide/svelte/icons/life-buoy';
import ListIcon from '@lucide/svelte/icons/list';
import ListOrderedIcon from '@lucide/svelte/icons/list-ordered';
import MailIcon from '@lucide/svelte/icons/mail';
import MegaphoneIcon from '@lucide/svelte/icons/megaphone';
import MenuGlyphIcon from '@lucide/svelte/icons/menu';
import PackageIcon from '@lucide/svelte/icons/package';
import PuzzleIcon from '@lucide/svelte/icons/puzzle';
import SendIcon from '@lucide/svelte/icons/send';
import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
import TableIcon from '@lucide/svelte/icons/table';
import TagsIcon from '@lucide/svelte/icons/tags';
import UsersIcon from '@lucide/svelte/icons/users';
import UsersRoundIcon from '@lucide/svelte/icons/users-round';
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

/**
 * Maps each allowed adminNav icon name, or navLayout engine-ref icon override, to its Lucide
 *  component, for the shell to render. `image` and `settings` reuse the same components
 *  {@link ENGINE_NAV_ICONS} carries for its own fixed screens; one Lucide glyph, two allowlists.
 */
export const ADMIN_NAV_ICONS: Record<AdminNavIcon, Component> = {
  anchor: AnchorIcon,
  banknote: BanknoteIcon,
  bell: BellIcon,
  calendar: CalendarIcon,
  'clipboard-list': ClipboardListIcon,
  'file-pen': FilePenIcon,
  files: FilesIcon,
  'graduation-cap': GraduationCapIcon,
  image: ImageIcon,
  inbox: InboxIcon,
  'key-round': KeyRoundIcon,
  'life-buoy': LifeBuoyIcon,
  list: ListIcon,
  'list-ordered': ListOrderedIcon,
  mail: MailIcon,
  megaphone: MegaphoneIcon,
  menu: MenuGlyphIcon,
  package: PackageIcon,
  puzzle: PuzzleIcon,
  send: SendIcon,
  settings: SettingsIcon,
  'shield-check': ShieldCheckIcon,
  table: TableIcon,
  tags: TagsIcon,
  users: UsersIcon,
  'users-round': UsersRoundIcon,
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
