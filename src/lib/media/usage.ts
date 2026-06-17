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

/** Append a row under its hash, creating the bucket on first use. */
function push(index: UsageIndex, hash: string, entry: UsageEntry): void {
  const rows = index.get(hash);
  if (rows) rows.push(entry);
  else index.set(hash, [entry]);
}

/**
 * Build the hash-keyed usage index over main (from the manifest's per-entry mediaRefs) plus every
 * open cairn/* branch (parsed from its edited markdown). A single branch read that throws degrades
 * that one branch and is skipped, the way the admin loaders degrade a failed read, rather than
 * sinking the whole screen.
 */
export async function buildUsageIndex(
  repo: RepoRef,
  token: string,
  concepts: ConceptDescriptor[],
  manifest: Manifest,
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

  // The branch arm: list the open cairn/* branches and read each edited entry's one file. The path
  // is derivable from the branch name, so no tree-listing is needed.
  const names = await listBranches(repo, PENDING_PREFIX, token);
  for (const name of names) {
    // Resolve the branch name to a configured entry with the same guard the branch tooling uses: a
    // malformed name, an id that fails the slug rule (entry paths are built from it, so this is the
    // path confinement), or a concept this site does not configure is skipped, no read attempted.
    const ref = parsePendingBranch(name);
    if (!ref || !isValidId(ref.id)) continue;
    const concept = findConcept(concepts, ref.concept);
    if (!concept) continue;

    const path = `${concept.dir}/${filenameFromId(ref.id)}`;
    try {
      const raw = await readRaw({ ...repo, branch: name }, path, token);
      if (raw === null) continue; // The file is absent on the branch: nothing to extract.
      const { frontmatter, body } = parseMarkdown(raw);
      const fmTitle = frontmatter.title;
      const title = typeof fmTitle === 'string' && fmTitle.trim() ? fmTitle : ref.id;
      for (const hash of extractMediaRefs(frontmatter, body, concept.fields)) {
        push(index, hash, {
          concept: concept.id,
          id: ref.id,
          title,
          origin: { kind: 'branch', branch: name },
        });
      }
    } catch {
      // Degrade this one branch rather than failing the whole index.
      continue;
    }
  }

  return index;
}
