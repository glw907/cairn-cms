// cairn-cms: the cross-branch media usage index, the where-used core of the admin Media Library.
// It answers "which entries reference this asset" for every committed asset, keyed by the content
// hash (the immutable truth, so a renamed slug never splits a row). The map unions two sources:
// the published corpus on main and every open cairn/* edit branch, so an asset that is referenced
// only in an unpublished draft still shows as in use and is not mistaken for an orphan.
//
// The main arm reads the content manifest's per-entry mediaRefs (the field manifestEntryFromFile
// records) and builds the reverse map; it never crawls the files, since the manifest already
// carries the refs. The branch arm cannot use a manifest (the content manifest is never committed
// to a branch), so it reconstructs each edited entry's path from the branch name, reads that one
// file, and runs the extractor directly. The cross-branch fan-out itself is the shared shape
// content/cross-branch-index.ts owns (A2); this module supplies only its rows and its extractor.
//
// A site's published use and an open-branch edit of the SAME entry are distinct origins (decision
// 4): both rows are kept, and the consumer groups by origin. Within one entry the extractor dedupes
// by hash, so an asset used twice in one entry is a single row.
//
// CAVEAT (carry it to the screen): a reference hidden inside a raw-HTML block (an <img> the markdown
// parser sees as opaque HTML, not an image node) is undetectable here. The Library's verdict wording
// is therefore "found in N entries" / "no references found", never a bare "unused": absence of a row
// means no reference was found, not a proof that none exists.
import type { ConceptDescriptor } from '../content/types.js';
import type { Backend } from '../github/backend.js';
import type { Manifest } from '../content/manifest.js';
import {
  buildCrossBranchIndex,
  type CrossBranchIndexOptions,
  type CrossBranchRow,
} from '../content/cross-branch-index.js';
import { extractMediaRefs } from '../content/media-refs.js';

/** Where a reference lives: the published corpus on main, or a named open edit branch. */
type UsageOrigin = { kind: 'published' } | { kind: 'branch'; branch: string };

/** One entry that references an asset, in a shape the screen links and groups by. */
export interface UsageEntry {
  /** The concept id, e.g. "posts". */
  concept: string;
  /** The entry id (its filename stem). */
  id: string;
  /** The entry title for display, from the manifest (published) or frontmatter (branch). */
  title: string;
  /** The public permalink, present for a published entry (carried from the manifest). */
  permalink?: string;
  /** Published vs the cairn/* branch the edit lives on. */
  origin: UsageOrigin;
}

/**
 * Content hash to the distinct entries that reference it. A hash with no row is "no references
 *  found" (see the raw-HTML caveat above), never a proven orphan.
 */
export type UsageIndex = Map<string, UsageEntry[]>;

/**
 * Build options. `branches` lets a caller that already listed the open cairn/* branches pass them
 *  in so the index does not list them a second time (the load path lists once for the media-union).
 *  `strict` flips the per-branch read from degrade-and-skip to fail-closed: a delete gate must not
 *  treat a transient branch-read failure as an absent reference, so it rethrows instead.
 */
export type BuildUsageOptions = CrossBranchIndexOptions;

/**
 * Build the hash-keyed usage index over main (from the manifest's per-entry mediaRefs) plus every
 * open cairn/* branch (parsed from its edited markdown), via the shared cross-branch builder (A2).
 *
 * By default a single branch read that throws degrades that one branch and is skipped, the way the
 * admin loaders degrade a failed read, rather than sinking the whole screen. That tolerance is right
 * for the Library DISPLAY, but wrong for the delete gate: a transient branch-read failure would make
 * a still-referenced asset look orphaned. Pass `strict: true` (the delete path) to rethrow a branch
 * failure so the caller fails closed (E6). Pass `branches` to reuse a branch list the caller already
 * has (the load path lists once for the media-union) rather than listing them a second time.
 */
export async function buildUsageIndex(
  backend: Backend,
  concepts: ConceptDescriptor[],
  manifest: Manifest,
  opts: BuildUsageOptions = {},
): Promise<UsageIndex> {
  // The main arm: the manifest already carries each entry's mediaRefs, so this is a pure reverse
  // map with no per-file read.
  const mainRows: CrossBranchRow<UsageEntry>[] = manifest.entries.flatMap((entry) =>
    (entry.mediaRefs ?? []).map((hash) => ({
      key: hash,
      entry: {
        concept: entry.concept,
        id: entry.id,
        title: entry.title,
        permalink: entry.permalink,
        origin: { kind: 'published' as const },
      },
    })),
  );

  return buildCrossBranchIndex(
    backend,
    concepts,
    mainRows,
    ({ concept, id, branch, frontmatter, body }): CrossBranchRow<UsageEntry>[] => {
      const fmTitle = frontmatter.title;
      const title = typeof fmTitle === 'string' && fmTitle.trim() ? fmTitle : id;
      return extractMediaRefs(frontmatter, body, concept.fields).map((hash) => ({
        key: hash,
        entry: { concept: concept.id, id, title, origin: { kind: 'branch', branch } },
      }));
    },
    opts,
  );
}
