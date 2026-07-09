// cairn-media-seed's sync loop: download each manifest row from the deployed site and write it
// into wrangler's local R2 simulator, under the same content-addressed key the media route
// reads. Every side effect (network, filesystem, the wrangler subprocess) goes through the
// injected SeedDeps, so this stays testable without a network or a real wrangler install; the
// bin wires the real ones. A per-item failure is caught and counted, never abandoning the rest
// of the run.
import { r2Key } from '../media/naming.js';
import { downloadUrl } from './assemble.js';
import type { SeedItem } from './assemble.js';

/**
 * The filesystem, network, and subprocess seams one seed run needs. `writeTempFile` and
 *  `cleanup` own their own temp directory so the run loop never touches path construction;
 *  `putObject` is the `wrangler r2 object put --local` call.
 */
export interface SeedDeps {
  fetch: typeof fetch;
  /** Write bytes to a fresh temp file named `name` and return its path. */
  writeTempFile: (name: string, bytes: Uint8Array) => string;
  /** Remove whatever `writeTempFile` created for this run. Called once, after the loop. */
  cleanup: () => void;
  /** Write `filePath`'s bytes into `bucket` at `key` in the local R2 simulator. */
  putObject: (bucket: string, key: string, filePath: string) => void;
}

/** One item's sync failure: its slug and the error message. */
export interface SeedFailure {
  slug: string;
  message: string;
}

/** A seed run's outcome: how many of the manifest's items synced, how many failed, and why. */
export interface SeedResult {
  total: number;
  ok: number;
  failed: number;
  failures: SeedFailure[];
}

/**
 * Download every item from `from` (with `headers` on each request) and write it into `bucket`
 *  in the local R2 simulator. Idempotent: re-running overwrites each key with the same bytes.
 *  Resolves once every item has been attempted; a failed item is recorded in `failures` rather
 *  than stopping the run.
 */
export async function seedMedia(
  items: SeedItem[],
  from: string,
  headers: Record<string, string>,
  bucket: string,
  deps: SeedDeps
): Promise<SeedResult> {
  let ok = 0;
  const failures: SeedFailure[] = [];

  for (const item of items) {
    try {
      const res = await deps.fetch(downloadUrl(from, item), { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      const file = deps.writeTempFile(`${item.hash}.${item.ext}`, bytes);
      deps.putObject(bucket, r2Key(item.hash, item.ext), file);
      ok++;
    } catch (err) {
      failures.push({ slug: item.slug, message: err instanceof Error ? err.message : String(err) });
    }
  }

  deps.cleanup();
  return { total: items.length, ok, failed: failures.length, failures };
}
