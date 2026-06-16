// cairn-cms: the media reconcile read. Storage is put-first and idempotent, so an upload whose entry
// is never saved leaves R2 bytes with no manifest row (an orphan), and a manifest row whose bytes
// were never stored (or were collected) points at nothing. This module reads both directions: the
// stored R2 keys under the media/ prefix versus the manifest's content-hash keys. It only reads and
// reports; no path here deletes (destructive collection is deferred to Phase 4). The module is
// engine-internal and on no public subpath, so the narrow bucket seam below is a local interface, not
// a re-export of any @cloudflare/workers-types name.
import type { MediaManifest } from './manifest.js';
import { log } from '../log/index.js';

/** A stored media object key parses to its short hash via `media/<aa>/<shortHash>.<ext>`. */
const MEDIA_KEY_RE = /^media\/[0-9a-f]{2}\/([0-9a-f]{16})\.[a-z0-9]{1,5}$/;

/** What a reconcile read found in either direction. `orphanedObjects` are stored R2 keys whose hash
 *  has no manifest row; `missingObjects` are manifest hashes with no stored object. */
export interface ReconcileResult {
  /** Stored keys (full R2 keys) whose content hash is absent from the manifest. */
  orphanedObjects: string[];
  /** Manifest content-hash keys with no matching stored object. */
  missingObjects: string[];
}

/** The pure core: compare the stored R2 keys against the manifest's content-hash keys and report
 *  both orphan directions. A stored key that does not match the media-key grammar is ignored, since
 *  it is not a content-addressed media object this reconcile owns. */
export function reconcileMedia(storedKeys: string[], manifest: MediaManifest): ReconcileResult {
  const manifestHashes = new Set(Object.keys(manifest));
  const storedHashes = new Set<string>();
  const orphanedObjects: string[] = [];
  for (const key of storedKeys) {
    const hash = MEDIA_KEY_RE.exec(key)?.[1];
    if (hash === undefined) continue;
    storedHashes.add(hash);
    if (!manifestHashes.has(hash)) orphanedObjects.push(key);
  }
  const missingObjects: string[] = [];
  for (const hash of manifestHashes) {
    if (!storedHashes.has(hash)) missingObjects.push(hash);
  }
  return { orphanedObjects, missingObjects };
}

/** One page of an R2 list, the narrow subset the reconcile read consumes. */
interface ReconcileListPage {
  objects: { key: string }[];
  truncated: boolean;
  cursor?: string;
}

/** The R2 bucket surface the reconcile read needs: a single prefixed, paginated list. A local
 *  structural interface so no @cloudflare/workers-types name is imported (the module is internal and
 *  on no public subpath, but the narrow seam keeps the build self-contained either way). */
export interface ReconcileBucket {
  list(opts?: { prefix?: string; cursor?: string }): Promise<ReconcileListPage>;
}

/** The glue runner: list every stored key under the media/ prefix (paginating through R2's
 *  cursor/truncated), reconcile against the manifest, log the count summary, and return the result.
 *  The log record carries counts only, never bytes or a key list; the keys are content hashes and so
 *  carry no PII, but the count summary is all an operator needs to size the orphan state. */
export async function runReconcile(
  bucket: ReconcileBucket,
  manifest: MediaManifest,
): Promise<ReconcileResult> {
  const storedKeys: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await bucket.list({ prefix: 'media/', cursor });
    for (const object of page.objects) storedKeys.push(object.key);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor !== undefined);

  const result = reconcileMedia(storedKeys, manifest);
  log.info('media.orphan_reconcile', {
    orphaned: result.orphanedObjects.length,
    missing: result.missingObjects.length,
  });
  return result;
}
