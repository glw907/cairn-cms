// cairn-cms: the pure core of the bulk-delete safety floor. Given a STRICT usage index, the selected
// hashes, and the media manifest, it partitions the selection into what is safe to delete and what is
// skipped, with the reason. The gate is membership in the passed strict index, never a display count:
// the caller builds the index with strict:true (see usage.ts) so a transient branch-read failure
// fails the whole build rather than making a still-referenced asset look orphaned. This function
// stays pure so the same verdict is testable without a repo round trip and so the destructive action
// that consumes it can be reviewed against a fixed input.
import type { UsageEntry, UsageIndex } from './usage.js';
import type { MediaManifest } from './manifest.js';

/** One selected hash that is not deleted, with why and (for the where-used) its usage rows. The rows
 *  are present only for 'still-referenced'; an 'uncommitted' skip carries an empty list. */
export interface BulkDeleteSkip {
  hash: string;
  reason: 'still-referenced' | 'uncommitted';
  usage: UsageEntry[];
}

/** The partitioned selection: the hashes safe to purge and the hashes held back. Both arrays keep the
 *  input order of `selected` so the screen reports them in the order the user picked. */
export interface BulkDeletePlan {
  deletable: string[];
  skipped: BulkDeleteSkip[];
}

/**
 * Partition `selected` against a strict usage index and the media manifest.
 *
 * A hash with one or more usage rows is skipped 'still-referenced', carrying those rows for the
 * where-used. A hash with no usage row and no committed manifest row is skipped 'uncommitted', since
 * there is nothing committed to delete. A hash with no usage row and a committed manifest row is
 * deletable. The input order of `selected` is preserved in both output arrays.
 */
export function planBulkDelete(
  selected: string[],
  index: UsageIndex,
  manifest: MediaManifest,
): BulkDeletePlan {
  const deletable: string[] = [];
  const skipped: BulkDeleteSkip[] = [];

  for (const hash of selected) {
    const usage = index.get(hash);
    if (usage && usage.length > 0) {
      skipped.push({ hash, reason: 'still-referenced', usage });
    } else if (manifest[hash]) {
      deletable.push(hash);
    } else {
      skipped.push({ hash, reason: 'uncommitted', usage: [] });
    }
  }

  return { deletable, skipped };
}
