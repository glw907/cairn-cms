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
// file, and runs the extractor directly.
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
import type { RepoRef } from '../github/types.js';
import type { Manifest } from '../content/manifest.js';
import { listBranches } from '../github/branches.js';
import { readRaw } from '../github/repo.js';
import { PENDING_PREFIX, parsePendingBranch } from '../content/pending.js';
import { findConcept } from '../content/concepts.js';
import { isValidId, filenameFromId } from '../content/ids.js';
import { parseMarkdown } from '../content/frontmatter.js';
import { extractMediaRefs } from '../content/media-refs.js';

/** Where a reference lives: the published corpus on main, or a named open edit branch. */
export type UsageOrigin = { kind: 'published' } | { kind: 'branch'; branch: string };

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

/** Content hash to the distinct entries that reference it. A hash with no row is "no references
 *  found" (see the raw-HTML caveat above), never a proven orphan. */
export type UsageIndex = Map<string, UsageEntry[]>;

/** Build options. `branches` lets a caller that already listed the open cairn/* branches pass them
 *  in so the index does not list them a second time (the load path lists once for the media-union).
 *  `strict` flips the per-branch read from degrade-and-skip to fail-closed: a delete gate must not
 *  treat a transient branch-read failure as an absent reference, so it rethrows instead. */
export interface BuildUsageOptions {
  /** The open cairn/* branch names, already listed. When present the index skips its own listing. */
  branches?: string[];
  /** When true a branch read that throws rejects the whole build, so the caller can fail closed. */
  strict?: boolean;
}

/** Append a row under its hash, creating the bucket on first use. */
function push(index: UsageIndex, hash: string, entry: UsageEntry): void {
  const rows = index.get(hash);
  if (rows) rows.push(entry);
  else index.set(hash, [entry]);
}

/**
 * Build the hash-keyed usage index over main (from the manifest's per-entry mediaRefs) plus every
 * open cairn/* branch (parsed from its edited markdown).
 *
 * By default a single branch read that throws degrades that one branch and is skipped, the way the
 * admin loaders degrade a failed read, rather than sinking the whole screen. That tolerance is right
 * for the Library DISPLAY, but wrong for the delete gate: a transient branch-read failure would make
 * a still-referenced asset look orphaned. Pass `strict: true` (the delete path) to rethrow a branch
 * failure so the caller fails closed. Pass `branches` to reuse a branch list the caller already has
 * (the load path lists once for the media-union) rather than listing them a second time.
 */
export async function buildUsageIndex(
  repo: RepoRef,
  token: string,
  concepts: ConceptDescriptor[],
  manifest: Manifest,
  opts: BuildUsageOptions = {},
): Promise<UsageIndex> {
  const index: UsageIndex = new Map();

  // The main arm: the manifest already carries each entry's mediaRefs, so this is a pure reverse
  // map with no per-file read.
  for (const entry of manifest.entries) {
    for (const hash of entry.mediaRefs ?? []) {
      push(index, hash, {
        concept: entry.concept,
        id: entry.id,
        title: entry.title,
        permalink: entry.permalink,
        origin: { kind: 'published' },
      });
    }
  }

  // The branch arm: read each open cairn/* branch's one edited file. The path is derivable from the
  // branch name, so no tree-listing is needed. The branch list is reused when the caller passes it.
  const names = opts.branches ?? (await listBranches(repo, PENDING_PREFIX, token));
  // Read the branches in parallel rather than one at a time, so the latency floor is one round trip
  // instead of N. workerd self-throttles to 6 simultaneous outbound connections, so this batch and
  // the load path's media-union batch each stay under the limit; do NOT merge the two into one
  // wider Promise.all, since the combined fan-out would queue behind that throttle.
  const perBranch = await Promise.all(
    names.map(async (name): Promise<{ hash: string; entry: UsageEntry }[]> => {
      // Resolve the branch name to a configured entry with the same guard the branch tooling uses: a
      // malformed name, an id that fails the slug rule (entry paths are built from it, so this is the
      // path confinement), or a concept this site does not configure is skipped, no read attempted.
      const ref = parsePendingBranch(name);
      if (!ref || !isValidId(ref.id)) return [];
      const concept = findConcept(concepts, ref.concept);
      if (!concept) return [];

      const path = `${concept.dir}/${filenameFromId(ref.id)}`;
      try {
        const raw = await readRaw({ ...repo, branch: name }, path, token);
        if (raw === null) return []; // The file is absent on the branch: nothing to extract.
        const { frontmatter, body } = parseMarkdown(raw);
        const fmTitle = frontmatter.title;
        const title = typeof fmTitle === 'string' && fmTitle.trim() ? fmTitle : ref.id;
        const rows: { hash: string; entry: UsageEntry }[] = [];
        for (const hash of extractMediaRefs(frontmatter, body, concept.fields)) {
          rows.push({
            hash,
            entry: { concept: concept.id, id: ref.id, title, origin: { kind: 'branch', branch: name } },
          });
        }
        return rows;
      } catch (err) {
        // In strict mode a branch failure fails the whole build so the delete gate can fail closed;
        // otherwise degrade this one branch rather than sinking the screen.
        if (opts.strict) throw err;
        return [];
      }
    }),
  );

  // Fold the per-branch rows back in, preserving the branch order so the index reads stably.
  for (const rows of perBranch) {
    for (const { hash, entry } of rows) push(index, hash, entry);
  }

  return index;
}
