// cairn-cms: the orphan-scan projection, the pure model behind the admin Media Library's scan
// surface. It folds reconcileMedia's two directions together with the usage index into the two rows
// the screen renders: the purgeable byte-rows and the read-only broken-reference rows (manifest rows
// whose bytes are gone). It only projects; no path here reads R2, the manifest, or git. The module
// is engine-internal and on no public subpath.
//
// An orphaned byte is a stored R2 object whose hash has NO manifest row AND appears in NO usage row,
// so it is referenced nowhere across main and every open branch. Reconcile only checks main's
// manifest, so a branch-only upload (bytes in R2, manifest row only on the open cairn/* branch) gets
// flagged as an orphaned object even though a colleague's in-progress draft references it. The byte
// purge is irreversible, so we intersect reconcile's verdict with the strict cross-branch usage
// index here: any hash the index references is in use and is dropped from orphanedBytes, which keeps
// a live draft's bytes from ever reaching the purge surface.
import { MEDIA_KEY_RE, type ReconcileResult } from './reconcile.js';
import type { MediaManifest } from './manifest.js';
import type { UsageEntry, UsageIndex } from './usage.js';

/** A purgeable orphan: a stored R2 key with no manifest row, plus the 16-hex hash parsed from it. */
export interface OrphanByteRow {
  /** The full R2 object key, e.g. "media/ff/ffffffffffffffff.webp". */
  key: string;
  /** The 16-hex content hash parsed from the key. */
  hash: string;
}

/** A broken reference: a manifest row whose bytes are gone. Read-only, since purging it would drop a
 *  still-referenced asset's record; the screen shows where it is used so an operator can re-ingest. */
export interface BrokenRefRow {
  /** The 16-hex content hash of the manifest row whose bytes are missing. */
  hash: string;
  /** The manifest row's display slug, or '' when the row is somehow absent. */
  slug: string;
  /** Where the asset is referenced, from the usage index. Empty when no reference was found. */
  usage: UsageEntry[];
}

/** The scan surface model: the two row sets the Library renders. */
export interface OrphanScan {
  orphanedBytes: OrphanByteRow[];
  brokenRefs: BrokenRefRow[];
}

/**
 * Project a reconcile read plus the usage index into the scan surface model.
 *
 * `orphanedBytes` come from `reconcile.orphanedObjects`: each key is parsed to its hash via the
 * shared media-key grammar, and a key that does not match (so it is not a content-addressed media
 * object) is skipped. A key whose hash the usage index references is also skipped: it is referenced
 * on main or some open branch, so its bytes are in use, not orphaned. `brokenRefs` come from
 * `reconcile.missingObjects`: each hash carries its
 * manifest slug (falling back to '' when the row is absent) and its where-used rows from the index
 * (an empty list when no reference was found). Both directions keep their input order.
 */
export function buildOrphanScan(
  reconcile: ReconcileResult,
  manifest: MediaManifest,
  index: UsageIndex,
): OrphanScan {
  const orphanedBytes: OrphanByteRow[] = [];
  for (const key of reconcile.orphanedObjects) {
    const hash = MEDIA_KEY_RE.exec(key)?.[1];
    if (hash === undefined) continue;
    if (index.has(hash)) continue;
    orphanedBytes.push({ key, hash });
  }

  const brokenRefs: BrokenRefRow[] = reconcile.missingObjects.map((hash) => ({
    hash,
    slug: manifest[hash]?.slug ?? '',
    usage: index.get(hash) ?? [],
  }));

  return { orphanedBytes, brokenRefs };
}
