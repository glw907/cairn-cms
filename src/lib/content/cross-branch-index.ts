// cairn-cms: the shared cross-branch fan-out-with-per-item-degrade builder (A2). Four indexes
// (advisories' address index, reference-index, tag-usage-index, and media/usage.ts) each union a
// synchronous main-arm read (already-known manifest fields, no backend call) with an async per-branch
// read of every open cairn/* branch, keyed differently per index but sharing one identical fan-out
// shape underneath: resolve a branch name to its concept-scoped file path, read that one file, extract
// zero-or-more (key, entry) rows from its frontmatter and body, and fold every row into one Map. This
// module owns that shape once; each caller supplies its own main rows (built from data it already
// holds) and its own per-branch extractor.
import type { ConceptDescriptor } from './types.js';
import type { Backend } from '../github/backend.js';
import { PENDING_PREFIX, parsePendingBranch } from './pending.js';
import { findConcept } from './concepts.js';
import { isValidId, filenameFromId } from './ids.js';
import { parseMarkdown } from './frontmatter.js';

/** One (key, entry) row a main or branch read contributes to the built index. */
export interface CrossBranchRow<TEntry> {
  /** The index key this row buckets under (a permalink, a `concept/id` pair, a tag value, a hash). */
  key: string;
  /** The row itself, in the shape the caller's index reads. */
  entry: TEntry;
}

/** The per-branch extraction context a caller's `branchRows` reads: the resolved concept, entry id, and parsed file. */
export interface CrossBranchBranchContext {
  /** The branch's target concept, resolved from the branch name. */
  concept: ConceptDescriptor;
  /** The branch's target entry id, parsed from the branch name. */
  id: string;
  /** The entry's content path, derivable from the concept and id (no tree-listing needed). */
  path: string;
  /** The open branch name the row was read from. */
  branch: string;
  /** The branch file's parsed frontmatter. */
  frontmatter: Record<string, unknown>;
  /** The branch file's parsed body. */
  body: string;
}

/**
 * Build options shared by every cross-branch index. `branches` lets a caller that already listed the
 *  open cairn/* branches pass them in so the build does not list them a second time. `strict` flips
 *  the per-branch read from degrade-and-skip to fail-closed: a gate consumer must not treat a
 *  transient branch-read failure as an absent row, so it rethrows instead; an advisory consumer
 *  fails open and degrades to a thinner index (E6).
 */
export interface CrossBranchIndexOptions {
  /** The open cairn/* branch names, already listed. When present the build skips its own listing. */
  branches?: string[];
  /** When true a branch read or extraction failure rejects the whole build, so the caller can fail closed. */
  strict?: boolean;
}

/** Append a row under its key, creating the bucket on first use. Shared by every cross-branch index. */
function push<TEntry>(index: Map<string, TEntry[]>, key: string, entry: TEntry): void {
  const rows = index.get(key);
  if (rows) rows.push(entry);
  else index.set(key, [entry]);
}

/**
 * Build a key-to-entries cross-branch index over the caller's main-arm rows (already computed
 * synchronously from data the caller holds, no backend read) unioned with every open cairn/* branch's
 * edited file, extracted per branch by the caller's `branchRows`.
 *
 * A branch name that fails to parse, whose id fails the slug rule, or whose concept this site does not
 * configure is skipped with no read attempted, mirroring the branch tooling's own guard. By default a
 * read or extraction failure degrades that one branch and is skipped, so a transient failure never sinks
 * the whole build (fail open, for an advisory consumer); pass `strict: true` to rethrow instead, so a
 * gate consumer can fail closed (E6). Pass `branches` to reuse a branch list the caller already listed
 * rather than listing them a second time.
 *
 * The branches are read in one Promise.all, so the latency floor is one round trip instead of N.
 * workerd self-throttles to 6 simultaneous outbound connections, so this batch and any other fan-out a
 * caller runs in the same request must stay separate, never merged into one wider Promise.all.
 */
export async function buildCrossBranchIndex<TEntry>(
  backend: Backend,
  concepts: ConceptDescriptor[],
  mainRows: CrossBranchRow<TEntry>[],
  branchRows: (ctx: CrossBranchBranchContext) => CrossBranchRow<TEntry>[],
  opts: CrossBranchIndexOptions = {},
): Promise<Map<string, TEntry[]>> {
  const index = new Map<string, TEntry[]>();
  for (const { key, entry } of mainRows) push(index, key, entry);

  const names = opts.branches ?? (await backend.listBranches(PENDING_PREFIX));
  const perBranch = await Promise.all(
    names.map(async (name): Promise<CrossBranchRow<TEntry>[]> => {
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
        const { frontmatter, body } = parseMarkdown(raw);
        return branchRows({ concept, id: ref.id, path, branch: name, frontmatter, body });
      } catch (err) {
        // In strict mode a branch failure fails the whole build so a gate can fail closed; otherwise
        // degrade this one branch rather than sinking the whole index.
        if (opts.strict) throw err;
        return [];
      }
    }),
  );

  // Fold the per-branch rows back in, preserving branch order so the index reads stably.
  for (const rows of perBranch) {
    for (const { key, entry } of rows) push(index, key, entry);
  }

  return index;
}
