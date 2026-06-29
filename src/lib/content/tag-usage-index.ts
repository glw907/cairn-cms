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
// concept's marked taxonomy field, and coerces that field's value directly.
import type { ConceptDescriptor } from './types.js';
import type { Backend } from '../github/backend.js';
import type { Manifest } from './manifest.js';
import { PENDING_PREFIX, parsePendingBranch } from './pending.js';
import { findConcept } from './concepts.js';
import { isValidId, filenameFromId } from './ids.js';
import { parseMarkdown } from './frontmatter.js';
import { resolveTaxonomyField, coerceTags } from './taxonomy.js';

/**
 * Where a tagged entry lives: the published corpus on main, or a named open edit branch. Re-declared
 *  here (rather than imported from reference-index.ts) so each index owns its own origin type.
 */
export type TagUsageOrigin = { kind: 'published' } | { kind: 'branch'; branch: string };

/** One entry carrying a tag value, in a shape the tag delete gate names and groups by. */
export interface TagUsageEntry {
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
export interface BuildTagUsageOptions {
  /** The open cairn/* branch names, already listed. When present the index skips its own listing. */
  branches?: string[];
  /** When true a branch read that throws rejects the whole build, so the caller can fail closed. */
  strict?: boolean;
}

/** Append a row under its value key, creating the bucket on first use. */
function push(index: TagUsageIndex, key: string, entry: TagUsageEntry): void {
  const rows = index.get(key);
  if (rows) rows.push(entry);
  else index.set(key, [entry]);
}

/**
 * Build the value-keyed tag usage index over main (from the manifest's per-entry tags) plus every open
 * cairn/* branch (parsed from its edited markdown).
 *
 * By default a single branch read that throws degrades that one branch and is skipped, the way the
 * admin loaders degrade a failed read. That tolerance is wrong for the tag delete gate: a transient
 * branch-read failure would make a still-used value look free. Pass `strict: true` to rethrow a branch
 * failure so the caller fails closed. Pass `branches` to reuse a branch list the caller already has
 * rather than listing them a second time.
 */
export async function buildTagUsageIndex(
  backend: Backend,
  concepts: ConceptDescriptor[],
  manifest: Manifest,
  opts: BuildTagUsageOptions = {},
): Promise<TagUsageIndex> {
  const index: TagUsageIndex = new Map();

  // The main arm: the manifest already carries each entry's tags, so this is a pure reverse map with no
  // per-file read. The KEY is the bare tag value; the ROW is the entry that carries it.
  for (const entry of manifest.entries) {
    for (const value of entry.tags ?? []) {
      push(index, value, {
        concept: entry.concept,
        id: entry.id,
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
    names.map(async (name): Promise<{ key: string; entry: TagUsageEntry }[]> => {
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
        if (raw === null) return []; // The file is absent on the branch: nothing to read.
        const { frontmatter } = parseMarkdown(raw);
        // The concept's marked taxonomy field names where the tags live; a concept with no taxonomy
        // field contributes no tags from this branch.
        const tf = resolveTaxonomyField(concept.fields);
        if (!tf) return [];
        const rows: { key: string; entry: TagUsageEntry }[] = [];
        for (const value of coerceTags(frontmatter[tf])) {
          rows.push({
            key: value,
            entry: {
              concept: concept.id,
              id: ref.id,
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
