// cairn-cms: the cross-branch tag usage index, the in-use core of the tag delete gate. It answers
// "which entries carry this tag value" for every value, keyed by the bare value. The key is the value
// alone and never a concept/id pair (unlike reference-index.ts, which keys on the target pair), because
// a tag value is corpus-global: 'svelte' means the same thing on a post and a page, so a value is in
// use if any entry anywhere carries it. The map unions two sources: the published corpus on main and
// every open cairn/* edit branch, so a value held only in an unpublished draft still counts as in use
// and is not mistaken for safe to delete from the vocabulary.
//
// The main arm reads the content manifest's per-entry tags (the projection manifestEntryFromFile
// records) and builds the reverse map; it never crawls the files, since the manifest already carries
// the tags. The branch arm cannot use a manifest (the content manifest is never committed to a branch),
// so it reconstructs each edited entry's path from the branch name, reads that one file, resolves its
// concept's marked taxonomy field, and coerces that field's value directly. The cross-branch fan-out
// itself is the shared shape buildCrossBranchIndex owns (A2); this module supplies only its rows and
// its extractor.
import type { ConceptDescriptor } from './types.js';
import type { Backend } from '../github/backend.js';
import type { Manifest } from './manifest.js';
import { buildCrossBranchIndex, type CrossBranchIndexOptions, type CrossBranchRow } from './cross-branch-index.js';
import { resolveTaxonomyField, coerceTags } from './taxonomy.js';

/**
 * Where a tagged entry lives: the published corpus on main, or a named open edit branch. Re-declared
 *  here (rather than imported from reference-index.ts) so each index owns its own origin type.
 */
type TagUsageOrigin = { kind: 'published' } | { kind: 'branch'; branch: string };

/** One entry carrying a tag value, in a shape the tag delete gate names and groups by. */
interface TagUsageEntry {
  /** The tagged entry's concept id, e.g. "posts". */
  concept: string;
  /** The tagged entry's id (its filename stem). */
  id: string;
  /** Published vs the cairn/* branch the edit lives on. */
  origin: TagUsageOrigin;
}

/**
 * The bare tag value to the distinct entries that carry it. A value with no row is not in use anywhere
 *  the index could read (main plus the listed open branches), so it is safe to delete from the
 *  vocabulary.
 */
export type TagUsageIndex = Map<string, TagUsageEntry[]>;

/**
 * Build options. `branches` lets a caller that already listed the open cairn/* branches pass them in so
 *  the index does not list them a second time. `strict` flips the per-branch read from degrade-and-skip
 *  to fail-closed: a delete gate must not treat a transient branch-read failure as an absent use, so it
 *  rethrows instead.
 */
export type BuildTagUsageOptions = CrossBranchIndexOptions;

/**
 * Build the value-keyed tag usage index over main (from the manifest's per-entry tags) plus every open
 * cairn/* branch (parsed from its edited markdown), via the shared cross-branch builder (A2).
 *
 * By default a single branch read that throws degrades that one branch and is skipped, the way the
 * admin loaders degrade a failed read. That tolerance is wrong for the tag delete gate: a transient
 * branch-read failure would make a still-used value look free. Pass `strict: true` to rethrow a branch
 * failure so the caller fails closed (E6). Pass `branches` to reuse a branch list the caller already
 * has rather than listing them a second time.
 */
export async function buildTagUsageIndex(
  backend: Backend,
  concepts: ConceptDescriptor[],
  manifest: Manifest,
  opts: BuildTagUsageOptions = {},
): Promise<TagUsageIndex> {
  // The main arm: the manifest already carries each entry's tags, so this is a pure reverse map with no
  // per-file read. The KEY is the bare tag value; the ROW is the entry that carries it.
  const mainRows: CrossBranchRow<TagUsageEntry>[] = manifest.entries.flatMap((entry) =>
    (entry.tags ?? []).map((value) => ({
      key: value,
      entry: { concept: entry.concept, id: entry.id, origin: { kind: 'published' as const } },
    })),
  );

  return buildCrossBranchIndex(
    backend,
    concepts,
    mainRows,
    ({ concept, id, branch, frontmatter }): CrossBranchRow<TagUsageEntry>[] => {
      // The concept's marked taxonomy field names where the tags live; a concept with no taxonomy
      // field contributes no tags from this branch.
      const tf = resolveTaxonomyField(concept.fields);
      if (!tf) return [];
      return coerceTags(frontmatter[tf]).map((value) => ({
        key: value,
        entry: { concept: concept.id, id, origin: { kind: 'branch', branch } },
      }));
    },
    opts,
  );
}
