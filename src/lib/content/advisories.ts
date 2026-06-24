// cairn-cms: the entry editor's internal advisory channel (editor-help pass 3). An advisory is a
// non-blocking, serializable notice that rides EditData across the SSR boundary, so it carries data
// only and never a callback. Today's one notice is the cross-branch address collision: a warning,
// not a gate, that another entry already resolves to the same public address (last-write-wins).
//
// The address index mirrors buildUsageIndex (src/lib/media/usage.ts): a main arm that reads each
// manifest entry's resolved permalink with no per-file read, and a branch arm that lists every open
// cairn/* branch, reconstructs each edited entry's path from the branch name, reads that one file,
// and resolves its permalink. The map is keyed by permalink, so every entry that resolves to a given
// address shares one bucket. The build fails open: a branch read that throws, or a dated entry whose
// permalink cannot resolve, is skipped rather than thrown, so a transient failure degrades to no
// notice and never blocks the editor or the publish. The scope splits by call site: the main arm at
// edit-load (synchronous, no extra GitHub read per open) and the full cross-branch check at publish.
import type { ConceptDescriptor } from './types.js';
import type { RepoRef } from '../github/types.js';
import type { Manifest } from './manifest.js';
import { listBranches } from '../github/branches.js';
import { readRaw } from '../github/repo.js';
import { PENDING_PREFIX, parsePendingBranch } from './pending.js';
import { findConcept } from './concepts.js';
import { isValidId, filenameFromId } from './ids.js';
import { parseMarkdown } from './frontmatter.js';
import { entryIdentity } from './identity.js';

/** One action an advisory offers, as a label and an optional link target. */
export interface AdvisoryAction {
  /** The action's button or link label. */
  label: string;
  /** The link target, when the action navigates. */
  href?: string;
}

/** A non-blocking editor notice, serializable so it can ride EditData across the SSR boundary. */
export interface AdvisoryNotice {
  /** The notice kind, e.g. "address-collision". */
  kind: string;
  /** The advisory severity; warn-and-allow, never a gate. */
  severity: 'warn';
  /** The notice text shown to the editor. */
  message: string;
  /** The notice's offered actions, when any. */
  actions?: AdvisoryAction[];
}

/** One entry that resolves to an address, in a shape the collision check and the message read. */
export interface AddressEntry {
  /** The concept id, e.g. "pages". */
  concept: string;
  /** The entry id (its filename stem). */
  id: string;
  /** The entry title for display, from the manifest (main) or frontmatter (branch). */
  title: string;
  /** The published corpus on main, or an open cairn/* edit branch. */
  source: 'main' | 'branch';
}

/** Permalink to the distinct entries that resolve to it, across main and every open branch. */
export type AddressIndex = Map<string, AddressEntry[]>;

/** Append a row under its permalink, creating the bucket on first use. */
function push(index: AddressIndex, permalink: string, entry: AddressEntry): void {
  const rows = index.get(permalink);
  if (rows) rows.push(entry);
  else index.set(permalink, [entry]);
}

/**
 * The address index over main only: a synchronous reverse map of each manifest entry's resolved
 * permalink. No backend read, so an edit-load can build it for free from the manifest it already holds.
 */
export function mainAddressIndex(manifest: Manifest): AddressIndex {
  const index: AddressIndex = new Map();
  for (const entry of manifest.entries) {
    push(index, entry.permalink, { concept: entry.concept, id: entry.id, title: entry.title, source: 'main' });
  }
  return index;
}

/**
 * Build the permalink-keyed address index over main (from each manifest entry's resolved permalink)
 * plus every open cairn/* branch (resolved from its edited markdown).
 *
 * The build fails open: a branch read that throws and a permalink that cannot resolve are both caught
 * and skipped, so a transient failure degrades to a thinner index, never a thrown editor or a blocked
 * publish. The branches are read in one Promise.all, the way buildUsageIndex reads them.
 */
export async function buildAddressIndex(
  repo: RepoRef,
  token: string,
  concepts: ConceptDescriptor[],
  manifest: Manifest,
): Promise<AddressIndex> {
  // The main arm: the manifest already carries each entry's resolved permalink, so seed from the
  // synchronous main-only index and union the branch arm on top.
  const index = mainAddressIndex(manifest);

  // The branch arm: read each open cairn/* branch's one edited file and resolve its permalink. The
  // path is derivable from the branch name, so no tree-listing is needed.
  const names = await listBranches(repo, PENDING_PREFIX, token);
  const perBranch = await Promise.all(
    names.map(async (name): Promise<{ permalink: string; entry: AddressEntry } | null> => {
      // Resolve the branch name with the branch tooling's guard: a malformed name, an id that fails
      // the slug rule, or an unconfigured concept is skipped with no read attempted.
      const ref = parsePendingBranch(name);
      if (!ref || !isValidId(ref.id)) return null;
      const concept = findConcept(concepts, ref.concept);
      if (!concept) return null;

      const path = `${concept.dir}/${filenameFromId(ref.id)}`;
      try {
        const raw = await readRaw({ ...repo, branch: name }, path, token);
        if (raw === null) return null; // The file is absent on the branch: nothing to resolve.
        const { frontmatter } = parseMarkdown(raw);
        const fmTitle = frontmatter.title;
        const title = typeof fmTitle === 'string' && fmTitle.trim() ? fmTitle : ref.id;
        // entryIdentity throws for a dated entry with no date; that branch is caught and skipped.
        const { permalink } = entryIdentity(concept, path, frontmatter);
        return { permalink, entry: { concept: concept.id, id: ref.id, title, source: 'branch' } };
      } catch {
        // A failed branch read or an unresolvable permalink degrades this one branch, fail open.
        return null;
      }
    }),
  );

  // Fold the per-branch rows back in, preserving the branch order so the index reads stably.
  for (const row of perBranch) {
    if (row) push(index, row.permalink, row.entry);
  }

  return index;
}

/**
 * Find the first other entry that already resolves to an address, or null when the address is free
 * or holds only the entry itself. The self entry is identified by its concept and id together.
 */
export function addressCollision(
  index: AddressIndex,
  self: { concept: string; id: string },
  address: string,
): AddressEntry | null {
  const rows = index.get(address) ?? [];
  return rows.find((row) => row.concept !== self.concept || row.id !== self.id) ?? null;
}
