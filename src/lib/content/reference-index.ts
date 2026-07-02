// cairn-cms: the cross-branch reference index, the where-referenced core of the rename and delete
// gates. It answers "which entries reference this target entry" for every reference edge, keyed by the
// target's (concept, id) PAIR. The key is the pair and never an id alone (unlike media/usage.ts, which
// keys on a globally-unique content hash), because an id is unique only within a concept: pages/about
// and posts/about are distinct targets, and reverse-mapping by id alone would cross that boundary and
// refuse a rename or delete on a phantom inbound. The map unions two sources: the published corpus on
// main and every open cairn/* edit branch, so a target referenced only in an unpublished draft still
// counts as referenced and is not mistaken for safe to delete or freely rename.
//
// The main arm reads the content manifest's per-entry references (the edges manifestEntryFromFile
// records) and builds the reverse map; it never crawls the files, since the manifest already carries
// the edges. The branch arm cannot use a manifest (the content manifest is never committed to a
// branch), so it reconstructs each edited entry's path from the branch name, reads that one file, and
// runs the schema extractor directly. The cross-branch fan-out itself is the shared shape
// buildCrossBranchIndex owns (A2); this module supplies only its rows and its extractor.
import type { ConceptDescriptor } from './types.js';
import type { Backend } from '../github/backend.js';
import type { Manifest } from './manifest.js';
import { buildCrossBranchIndex, type CrossBranchIndexOptions, type CrossBranchRow } from './cross-branch-index.js';
import { extractReferenceEdges } from './references.js';
import { asString } from './identity.js';

/**
 * Where a reference lives: the published corpus on main, or a named open edit branch. Re-declared here
 *  (rather than imported from media/usage.ts) so the content layer does not depend on the media layer.
 */
type UsageOrigin = { kind: 'published' } | { kind: 'branch'; branch: string };

/** One entry that references a target, in a shape the rename and delete gates name and group by. */
interface ReferenceUsageEntry {
  /** The referencing (source) entry's concept id, e.g. "posts". */
  concept: string;
  /** The referencing (source) entry's id (its filename stem). */
  id: string;
  /** The referencing entry's title for display, from the manifest (published) or frontmatter (branch). */
  title: string;
  /** The referencing entry's public permalink, present for a published entry (carried from the manifest). */
  permalink?: string;
  /** The frontmatter field the edge was declared on. */
  field: string;
  /** Published vs the cairn/* branch the edit lives on. */
  origin: UsageOrigin;
}

/**
 * The target's `${concept}/${id}` pair to the distinct entries that reference it. A pair with no row is
 *  not referenced anywhere the index could read (main plus the listed open branches).
 */
export type ReferenceIndex = Map<string, ReferenceUsageEntry[]>;

/**
 * Build options. `branches` lets a caller that already listed the open cairn/* branches pass them in so
 *  the index does not list them a second time. `strict` flips the per-branch read from degrade-and-skip
 *  to fail-closed: a delete or rename gate must not treat a transient branch-read failure as an absent
 *  reference, so it rethrows instead.
 */
export type BuildReferenceOptions = CrossBranchIndexOptions;

/**
 * Build the pair-keyed reference index over main (from the manifest's per-entry references) plus every
 * open cairn/* branch (parsed from its edited markdown), via the shared cross-branch builder (A2).
 *
 * By default a single branch read that throws degrades that one branch and is skipped, the way the
 * admin loaders degrade a failed read. That tolerance is wrong for the rename and delete gates: a
 * transient branch-read failure would make a still-referenced target look free. Pass `strict: true` to
 * rethrow a branch failure so the caller fails closed (E6). Pass `branches` to reuse a branch list the
 * caller already has rather than listing them a second time.
 */
export async function buildReferenceIndex(
  backend: Backend,
  concepts: ConceptDescriptor[],
  manifest: Manifest,
  opts: BuildReferenceOptions = {},
): Promise<ReferenceIndex> {
  // The main arm: the manifest already carries each entry's reference edges, so this is a pure reverse
  // map with no per-file read. The KEY is the edge's TARGET (concept, id); the ROW is the source entry.
  const mainRows: CrossBranchRow<ReferenceUsageEntry>[] = manifest.entries.flatMap((entry) =>
    (entry.references ?? []).map((edge) => ({
      key: `${edge.concept}/${edge.id}`,
      entry: {
        concept: entry.concept,
        id: entry.id,
        title: entry.title,
        permalink: entry.permalink,
        field: edge.field,
        origin: { kind: 'published' as const },
      },
    })),
  );

  return buildCrossBranchIndex(
    backend,
    concepts,
    mainRows,
    ({ concept, id, branch, frontmatter }): CrossBranchRow<ReferenceUsageEntry>[] => {
      const title = asString(frontmatter.title) ?? id;
      return extractReferenceEdges(frontmatter, concept.fields).map((edge) => ({
        key: `${edge.concept}/${edge.id}`,
        entry: { concept: concept.id, id, title, field: edge.field, origin: { kind: 'branch', branch } },
      }));
    },
    opts,
  );
}
