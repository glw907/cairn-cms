// cairn-cms: the pure per-hash usage and alt-status fact helpers the Media Library shell and its
// extracted bulk-delete/orphan-tools dialogs all read. Each takes its data explicitly (the usage
// overlay, or an asset) rather than closing over a component's own `data` prop, so a caller other
// than the shell can share one implementation instead of a second copy.

import type { MediaLibraryEntry } from '../media/library-entry.js';
import type { MediaUsageInfo } from '../sveltekit/content-routes-media.js';
import type { UsageEntry } from '../media/usage.js';

/** The distinct-entry usage count for an asset; zero when the asset has no usage key. */
export function usageCount(usage: Record<string, MediaUsageInfo>, hash: string): number {
  return usage[hash]?.count ?? 0;
}

/**
 * Empty alt is the needs-alt signal (the asset carries no caption field, so this is the only
 * per-asset alt fact). A non-image asset would read Not applicable, but the delivery route is
 * image-only today, so every committed asset here is an image.
 */
export function needsAlt(asset: MediaLibraryEntry): boolean {
  return asset.alt.trim() === '';
}

/** Every where-used row for an asset, published and edit-branch origins together. */
export function usageEntries(usage: Record<string, MediaUsageInfo>, hash: string): UsageEntry[] {
  return usage[hash]?.entries ?? [];
}

/** Published rows first, then the edit-branch rows. */
export function publishedRows(usage: Record<string, MediaUsageInfo>, hash: string): UsageEntry[] {
  return usageEntries(usage, hash).filter((e) => e.origin.kind === 'published');
}

/** The edit-branch rows for an asset, excluding the published ones. */
export function branchRows(usage: Record<string, MediaUsageInfo>, hash: string): UsageEntry[] {
  return usageEntries(usage, hash).filter((e) => e.origin.kind === 'branch');
}

/** A branch usage row's branch name, or empty for a published row. */
export const branchNameOf = (e: UsageEntry): string => (e.origin.kind === 'branch' ? e.origin.branch : '');
