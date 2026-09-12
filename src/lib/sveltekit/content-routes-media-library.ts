// cairn-cms: the admin Media Library's load, closed over the shared ContentRoutesContext
// (content-routes-context.ts), built once per call by createContentRoutesInternal.
import { mediaLibraryEntry } from '../media/library-entry.js';
import type { MediaLibraryEntry } from '../media/library-entry.js';
import { buildUsageIndex } from '../media/usage.js';
import type { UsageEntry } from '../media/usage.js';
import type { MediaEntry } from '../media/manifest.js';
import { parseMediaManifest } from '../media/manifest.js';
import { PENDING_PREFIX } from '../content/pending.js';
import { emptyManifest, parseManifest } from '../content/manifest.js';
import { requireEditor, requireEngineAccess } from './guard.js';
import { distinctEntryCount } from './content-routes-media-shared.js';
import type { ContentRoutesContext } from './content-routes-context.js';
import type { CairnEvent } from './types.js';

// Re-exported here since MediaLibraryData.assets names the type; `content-routes.ts` re-exports
// this module's re-export under the same name every existing importer already sees.
export type { MediaLibraryEntry } from '../media/library-entry.js';

/**
 * One asset's where-used overlay, kept separate from MediaLibraryEntry so the picker's shared
 *  projection stays decoupled from the Library-only usage facts.
 */
export interface MediaUsageInfo {
  /** Distinct content entries that reference the asset (count by distinct concept+id). */
  count: number;
  /** Every where-used row (published and edit-branch origins), for the detail's grouped list. */
  entries: UsageEntry[];
}

/**
 * The Media Library screen's data: the unioned assets, the per-hash usage overlay, and the
 *  degraded-load error. The usage overlay is keyed by content hash; an asset with no references
 *  simply has no key, which the screen renders as "no references found".
 */
export interface MediaLibraryData {
  assets: MediaLibraryEntry[];
  /** Per-hash usage overlay, kept separate from MediaLibraryEntry so the popover stays decoupled. */
  usage: Record<string, MediaUsageInfo>;
  /** The degraded-load error: a failed token mint or media read. */
  error: string | null;
  /**
   * The success flash a redirected action carries: `deleted` from `?deleted=1`, `updated` from
   *  `?updated=1`, `replaced` from `?replaced=1`, `altPropagated` from `?altPropagated=1`,
   *  `bulkDeleted` from `?bulkDeleted=1`, `orphansPurged` from `?orphansPurged=1`, `uploaded` from
   *  `?uploaded=1`, null otherwise. The component renders a polite success strip for each.
   */
  flash: 'deleted' | 'updated' | 'replaced' | 'altPropagated' | 'bulkDeleted' | 'orphansPurged' | 'uploaded' | null;
}

/**
 * Build the Media Library load, closed over the shared content-routes context.
 */
export function createMediaLibraryActions(ctx: ContentRoutesContext) {
  const { runtime } = ctx;

  /**
   * The admin Media Library load: union the media manifest across main and every open cairn/*
   *  branch (so a not-yet-published asset shows), project each row through the shared
   *  mediaLibraryEntry helper, and attach the cross-branch where-used overlay keyed by content
   *  hash. The assets union and the usage overlay degrade independently: a usage-build failure
   *  still lists the assets with an empty overlay, and a wholesale read failure degrades to the
   *  assets gathered so far rather than a thrown 500, mirroring listLoad's posture.
   */
  async function mediaLibraryLoad(event: CairnEvent): Promise<MediaLibraryData> {
    const editor = requireEditor(event);
    requireEngineAccess(runtime.access, editor, 'media');
    // Read the flash flags a redirected action carried back: a deleted/updated/etc success flag.
    // No media action redirects with a `?error=` any more (every refusal answers in place through
    // `fail()`), so this load carries no conflict-error slot to collide with the one below.
    let flash: MediaLibraryData['flash'] = null;
    if (event.url.searchParams.get('deleted') === '1') flash = 'deleted';
    else if (event.url.searchParams.get('updated') === '1') flash = 'updated';
    else if (event.url.searchParams.get('replaced') === '1') flash = 'replaced';
    else if (event.url.searchParams.get('altPropagated') === '1') flash = 'altPropagated';
    else if (event.url.searchParams.get('bulkDeleted') === '1') flash = 'bulkDeleted';
    else if (event.url.searchParams.get('orphansPurged') === '1') flash = 'orphansPurged';
    else if (event.url.searchParams.get('uploaded') === '1') flash = 'uploaded';
    const backend = ctx.resolveBackend(event);

    // Union the media manifest by hash: main's rows first, then any branch hash not already present.
    // Identical bytes share one row, so a hash on both branches prefers main's row. A failed or
    // absent branch read degrades to no rows for that branch (the tolerant parse yields {} on null).
    // The branch list is taken ONCE here and handed to buildUsageIndex below, so the load path does
    // not enumerate the open branches twice (the per-page subrequest budget is tight at ~25+ branches).
    // The token mint is now lazy inside the first read, so a token or a network failure both land in
    // this one degrade rather than the old separate could-not-authenticate tier.
    const union = new Map<string, MediaEntry>();
    let branchNames: string[] = [];
    try {
      const mediaRaw = await backend.readFile(runtime.mediaManifestPath, backend.defaultBranch);
      for (const [hash, e] of Object.entries(parseMediaManifest(ctx.parseMediaJson(mediaRaw)))) {
        union.set(hash, e);
      }
      const names = await backend.listBranches(PENDING_PREFIX);
      branchNames = names;
      const branchManifests = await Promise.all(
        names.map((name) =>
          backend.readFile(runtime.mediaManifestPath, name)
            .then((raw) => parseMediaManifest(ctx.parseMediaJson(raw)))
            .catch(() => ({}) as Record<string, MediaEntry>),
        ),
      );
      for (const manifest of branchManifests) {
        for (const [hash, e] of Object.entries(manifest)) {
          if (!union.has(hash)) union.set(hash, e);
        }
      }
    } catch {
      // A wholesale read failure leaves whatever rows were already unioned; the screen lists them
      // with no usage overlay rather than failing.
      return { assets: [...union.values()].map(mediaLibraryEntry), usage: {}, error: 'Could not load media.', flash };
    }
    const assets = [...union.values()].map(mediaLibraryEntry);

    // Build the where-used overlay from main's content manifest plus the open branches. A failure
    // here keeps the asset list intact with an empty overlay, since the screen still lists assets.
    let usage: Record<string, MediaUsageInfo> = {};
    try {
      const manifestRaw = await backend.readFile(runtime.manifestPath, backend.defaultBranch);
      const manifest = manifestRaw === null ? emptyManifest() : parseManifest(manifestRaw);
      // Reuse the branch list from the media-union above; the Library DISPLAY keeps the default
      // best-effort behavior (a failed branch read degrades that one branch, not the screen).
      const index = await buildUsageIndex(backend, runtime.concepts, manifest, { branches: branchNames });
      for (const [hash, entries] of index) {
        usage[hash] = { count: distinctEntryCount(entries), entries };
      }
    } catch {
      usage = {};
    }

    return { assets, usage, error: null, flash };
  }

  return { mediaLibraryLoad };
}
