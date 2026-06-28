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
// runs the schema extractor directly.
import type { ConceptDescriptor } from './types.js';
import type { Backend } from '../github/backend.js';
import type { Manifest } from './manifest.js';
import { PENDING_PREFIX, parsePendingBranch } from './pending.js';
import { findConcept } from './concepts.js';
import { isValidId, filenameFromId } from './ids.js';
import { parseMarkdown } from './frontmatter.js';
import { extractReferenceEdges } from './references.js';

/**
 * Where a reference lives: the published corpus on main, or a named open edit branch. Re-declared here
 *  (rather than imported from media/usage.ts) so the content layer does not depend on the media layer.
 */
export type UsageOrigin = { kind: 'published' } | { kind: 'branch'; branch: string };

/** One entry that references a target, in a shape the rename and delete gates name and group by. */
export interface ReferenceUsageEntry {
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
export interface BuildReferenceOptions {
  /** The open cairn/* branch names, already listed. When present the index skips its own listing. */
  branches?: string[];
  /** When true a branch read that throws rejects the whole build, so the caller can fail closed. */
  strict?: boolean;
}

/** Append a row under its target pair key, creating the bucket on first use. */
function push(index: ReferenceIndex, key: string, entry: ReferenceUsageEntry): void {
  const rows = index.get(key);
  if (rows) rows.push(entry);
  else index.set(key, [entry]);
}

/**
 * Build the pair-keyed reference index over main (from the manifest's per-entry references) plus every
 * open cairn/* branch (parsed from its edited markdown).
 *
 * By default a single branch read that throws degrades that one branch and is skipped, the way the
 * admin loaders degrade a failed read. That tolerance is wrong for the rename and delete gates: a
 * transient branch-read failure would make a still-referenced target look free. Pass `strict: true` to
 * rethrow a branch failure so the caller fails closed. Pass `branches` to reuse a branch list the
 * caller already has rather than listing them a second time.
 */
export async function buildReferenceIndex(
  backend: Backend,
  concepts: ConceptDescriptor[],
  manifest: Manifest,
  opts: BuildReferenceOptions = {},
): Promise<ReferenceIndex> {
  const index: ReferenceIndex = new Map();

  // The main arm: the manifest already carries each entry's reference edges, so this is a pure reverse
  // map with no per-file read. The KEY is the edge's TARGET (concept, id); the ROW is the source entry.
  for (const entry of manifest.entries) {
    for (const edge of entry.references ?? []) {
      push(index, `${edge.concept}/${edge.id}`, {
        concept: entry.concept,
        id: entry.id,
        title: entry.title,
        permalink: entry.permalink,
        field: edge.field,
        origin: { kind: 'published' },
      });
    }
  }

  // The branch arm: read each open cairn/* branch's one edited file. The path is derivable from the
  // branch name, so no tree-listing is needed. The branch list is reused when the caller passes it.
  const names = opts.branches ?? (await backend.listBranches(PENDING_PREFIX));
  // Read the branches in parallel rather than one at a time, so the latency floor is one round trip
  // instead of N. workerd self-throttles to 6 simultaneous outbound connections, so this batch and
  // the load path's media-union and linker reads each stay under the limit; do NOT run this fan-out
  // concurrently with those (a future combined safety gate must not wrap them in one Promise.all),
  // since the merged fan-out would queue behind that throttle.
  const perBranch = await Promise.all(
    names.map(async (name): Promise<{ key: string; entry: ReferenceUsageEntry }[]> => {
      // Resolve the branch name to a configured entry with the same guard the branch tooling uses: a
      // malformed name, an id that fails the slug rule (entry paths are built from it, so this is the
      // path confinement), or a concept this site does not configure is skipped, no read attempted.
      const ref = parsePendingBranch(name);
      if (!ref || !isValidId(ref.id)) return [];
      const concept = findConcept(concepts, ref.concept);
      if (!concept) return [];

      const path = `${concept.dir}/${filenameFromId(ref.id)}`;
      try {
        const raw = await backend.readFile(path, name);
        if (raw === null) return []; // The file is absent on the branch: nothing to extract.
        const { frontmatter } = parseMarkdown(raw);
        const fmTitle = frontmatter.title;
        const title = typeof fmTitle === 'string' && fmTitle.trim() ? fmTitle : ref.id;
        const rows: { key: string; entry: ReferenceUsageEntry }[] = [];
        for (const edge of extractReferenceEdges(frontmatter, concept.fields)) {
          rows.push({
            key: `${edge.concept}/${edge.id}`,
            entry: {
              concept: concept.id,
              id: ref.id,
              title,
              field: edge.field,
              origin: { kind: 'branch', branch: name },
            },
          });
        }
        return rows;
      } catch (err) {
        // In strict mode a branch failure fails the whole build so the gate can fail closed; otherwise
        // degrade this one branch rather than sinking the screen.
        if (opts.strict) throw err;
        return [];
      }
    }),
  );

  // Fold the per-branch rows back in, preserving the branch order so the index reads stably.
  for (const rows of perBranch) {
    for (const { key, entry } of rows) push(index, key, entry);
  }

  return index;
}
