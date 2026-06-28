// cairn-cms: the server-side media rewrite planner, the shared core behind the media-library bulk
// rewrite preview and apply (replace-in-place and fill-alt). Given an asset content hash and a per
// entry transform (the closure already carries the new token or the default alt), it resolves which
// published main entries reference the hash, runs the transform over each, and returns a preview
// plan: the affected entries with their rewritten markdown and per-placement diff, plus the affected
// count. It also returns a report-only cross-branch delta, the open cairn/* edit branches that
// reference the same bytes, so the screen can warn that an apply touches main only and the drafts
// keep their own copy of the reference until they publish.
//
// It is fail-closed. The usage read runs in strict mode, so a transient branch-read failure throws
// out of here rather than degrading to an "absent reference" the way the Library display tolerates.
// A planner that fed a partial usage view into an apply would rewrite some references and silently
// leave others, so it must reject instead. This is the same gate the 3c safe-delete uses.
//
// It lives in its own node-safe module (no @codemirror, no DOM, no @sveltejs/kit): the transform is
// injected, so the planner never imports the editor surface. It is internal, exported from no package
// subpath, so it carries no reference page.
import type { ConceptDescriptor } from '../content/types.js';
import type { Backend } from '../github/backend.js';
import type { Manifest } from '../content/manifest.js';
import { findConcept } from '../content/concepts.js';
import { filenameFromId } from '../content/ids.js';
import { buildUsageIndex } from './usage.js';

/**
 * One main entry the rewrite will touch: its identity, its file path, the transform's per-placement
 *  diff, and the rewritten markdown a later apply commits. `P` is the transform's placement type
 *  (a RepointPlacement for replace, an AltPlacement for fill-alt).
 */
export interface PlannedEntry<P = unknown> {
  /** The concept id, e.g. "posts". */
  concept: string;
  /** The entry id (its filename stem). */
  id: string;
  /** The entry's repo path, `${concept.dir}/${filenameFromId(id)}`. */
  path: string;
  /** The transform's diff for this entry: one placement per rewritten reference. */
  placements: P[];
  /** The entry's markdown after the transform, byte-identical to the source apart from the rewrite. */
  newMarkdown: string;
}

/**
 * One open edit branch that also references the asset, with the entries on it. Report-only: an apply
 *  rewrites main, never a branch, so the screen surfaces these as a delta the editor handles by
 *  republishing the draft.
 */
export interface BranchRef {
  /** The cairn/* branch name. */
  branch: string;
  /** The entries on that branch that reference the asset. */
  entries: { concept: string; id: string }[];
}

/**
 * The preview plan: the main entries to rewrite, the report-only branch delta, and the distinct
 *  count of affected main entries (the entries the transform actually changed).
 */
export interface RewritePlan<P = unknown> {
  entries: PlannedEntry<P>[];
  branchDelta: BranchRef[];
  affectedCount: number;
}

/**
 * Plan a media rewrite for one asset hash. Builds the cross-branch usage index in strict mode (so an
 * unverifiable branch read rejects, failing closed), then splits the rows for `args.hash` by origin:
 *
 * - Published rows are the main work. Each entry's file is read in parallel and run through
 *   `args.transform`. An entry is included only when the transform reports at least one placement, so
 *   a row whose body holds the token in a non-image position (a code span, raw HTML) drops out rather
 *   than committing an unchanged file. A row whose concept is not configured, or whose file read
 *   returns null (a stale manifest row), is skipped.
 * - Branch rows are the report-only delta, grouped by branch in first-seen order. Branch rows are
 *   never the published origin, so main never appears in the delta.
 *
 * `affectedCount` is the number of distinct entries in `entries` (the ones the transform changed). The
 * planner does not read the media manifest: the transform closure already carries the new token or
 * the default alt, so the planner needs only the entry markdown and the usage index. Pure of the
 * editor surface and node-safe; the only IO is the usage index build and the per-entry reads.
 */
export async function planMediaRewrite<P = unknown>(args: {
  backend: Backend;
  concepts: ConceptDescriptor[];
  contentManifest: Manifest;
  hash: string;
  transform: (markdown: string) => { markdown: string; placements: P[] };
}): Promise<RewritePlan<P>> {
  // Strict so an unverifiable branch read rejects here rather than degrading to an absent reference.
  // Do NOT wrap this: the throw is the fail-closed contract the apply relies on.
  const index = await buildUsageIndex(args.backend, args.concepts, args.contentManifest, {
    strict: true,
  });
  const rows = index.get(args.hash) ?? [];

  // The main arm: read each referencing published entry in parallel (one round-trip latency floor,
  // mirroring buildUsageIndex's per-branch batch), run the transform, and keep only the entries it
  // changed. A null is a row whose concept is not configured or whose file is absent: it is skipped.
  const published = rows.filter((row) => row.origin.kind === 'published');
  const planned = await Promise.all(
    published.map(async (row): Promise<PlannedEntry<P> | null> => {
      const concept = findConcept(args.concepts, row.concept);
      if (!concept) return null;
      const path = `${concept.dir}/${filenameFromId(row.id)}`;
      const markdown = await args.backend.readFile(path, args.backend.defaultBranch);
      if (markdown === null) return null;
      const result = args.transform(markdown);
      if (result.placements.length === 0) return null;
      return { concept: row.concept, id: row.id, path, placements: result.placements, newMarkdown: result.markdown };
    }),
  );
  const entries = planned.filter((entry): entry is PlannedEntry<P> => entry !== null);

  // The branch arm: group the branch rows by branch in first-seen order, preserving the row order the
  // index emits within each group. Branch rows are never the published origin, so main never appears.
  const byBranch = new Map<string, { concept: string; id: string }[]>();
  for (const row of rows) {
    if (row.origin.kind !== 'branch') continue;
    const list = byBranch.get(row.origin.branch);
    if (list) list.push({ concept: row.concept, id: row.id });
    else byBranch.set(row.origin.branch, [{ concept: row.concept, id: row.id }]);
  }
  const branchDelta: BranchRef[] = [...byBranch].map(([branch, branchEntries]) => ({ branch, entries: branchEntries }));

  return { entries, branchDelta, affectedCount: entries.length };
}
