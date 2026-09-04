// cairn-cms: the content-routes primitives every domain sibling shares: concept and entry-id
// resolution off the route params, the preview-token cleanup helper, the manifest row lookup, the
// pending-branch-ref parser, and the one flattened action-failure shape every route's `form` prop
// reads. No sibling module owns these outright, so they live here instead of in whichever module
// happened to need them first. Every function here is a plain function of its explicit arguments,
// not a closure over ContentRoutesContext, so a caller passes `runtime` (or nothing) directly
// rather than threading `ctx`.
//
// Name-collision note: `content-routes-media.ts` declares its own block-scoped `const manifestRow`
// inside `mediaAltPreviewAction`, unrelated to this module's exported `manifestRow`. That module
// does not import this one's export today; if it ever does, the local `const` must be renamed
// first, since the two would otherwise shadow silently.
import { error } from '@sveltejs/kit';
import { findConcept } from '../content/concepts.js';
import { isValidId } from '../content/ids.js';
import { parsePendingBranch } from '../content/pending.js';
import type { Manifest, ManifestEntry, InboundLink } from '../content/manifest.js';
import type { UsageEntry } from '../media/usage.js';
import { requireEditor, requireEngineAccess } from './guard.js';
import { requireDb } from '../env.js';
import { deletePreviewTokens } from '../auth/preview-store.js';
import { CairnError } from '../diagnostics/index.js';
import { log } from '../log/index.js';
import type { CairnRuntime, ConceptDescriptor } from '../content/types.js';
import type { Editor } from '../auth/types.js';
import type { CairnEvent } from './types.js';

/**
 * What a route's single `form` export presents to a view component: whichever content action
 *  last failed, merged with every field optional. `error` is always set on a failure; the richer
 *  keys identify which guard refused. The media refusals ride here too, so the Media Library's one
 *  `form` prop carries a `?/mediaDelete`, `?/mediaUpdate`, `?/mediaReplace`, or `?/mediaAltPropagate`
 *  refusal without a second type. One flat interface (the conventions pass,
 *  `audit-sveltekit-contentformfailure`): every field optional, replacing the earlier
 *  `Partial<>` intersection over the eleven now-module-internal arm shapes.
 */
export interface ContentFormFailure {
  /** The one-line human summary every content action failure carries. */
  error?: string;
  /** The cairn tokens that resolve to no entry, set by a blocked `saveAction`/`publishAction`. */
  brokenLinks?: string[];
  /** The author's edited markdown, set by a blocked `saveAction`/`publishAction` so the editor reseeds with the unsaved work. */
  body?: string;
  /** The entries whose bodies link to (or include) the refused one, set by a blocked `deleteAction`/`listDeleteAction`. */
  inboundLinks?: InboundLink[];
  /** Which gate refused a blocked delete, set by `deleteAction`/`listDeleteAction`. Absent reads as `'link'`. */
  inboundKind?: 'link' | 'include';
  /** The refused entry's id, set by a blocked `deleteAction`/`listDeleteAction` so a list view marks the right row. */
  id?: string;
  /** The refused asset's content hash, set by a blocked media delete, update, replace, or alt-propagate action. */
  hash?: string;
  /** The where-used rows, set by a blocked media delete or replace action. */
  usage?: UsageEntry[];
  /** The distinct-entry count behind a media refusal, set by a blocked media delete or replace action. */
  foundIn?: number;
}

/** Look up the concept named by the `[concept]` route param, or a 404. */
export function conceptOf(runtime: CairnRuntime, params: Record<string, string>): ConceptDescriptor {
  const concept = findConcept(runtime.concepts, params.concept ?? '');
  if (!concept) throw error(404, `Unknown content type: ${params.concept ?? ''}`);
  return concept;
}

/**
 * The shared preamble for a single-entry action addressed by the `[id]` route param:
 *  authenticate, resolve the concept, and validate the id. Confines the id to the slug rule
 *  before any commit path is built from it (the App token can write anywhere in the repo), so a
 *  malformed id is rejected before touching GitHub. Shared by save, publish, discard, the
 *  editor's own delete, and rename; the concept list's delete reads its id from the posted form
 *  instead, a different shape left to validate inline.
 */
export function requireEntryFromParams(runtime: CairnRuntime, event: CairnEvent): { editor: Editor; concept: ConceptDescriptor; id: string } {
  const editor = requireEditor(event);
  const concept = conceptOf(runtime, event.params);
  requireEngineAccess(runtime.access, editor, concept.id);
  const id = event.params.id ?? '';
  if (!isValidId(id)) throw error(400, 'Invalid entry id');
  return { editor, concept, id };
}

/** True for a D1 error whose message names a missing table (SQLite's own "no such table" text). */
export function isMissingTableError(err: unknown): boolean {
  return /no such table/i.test(String(err));
}

/**
 * Best-effort clear of every preview-token row for one entry, called after delete, discard, and
 *  rename (keyed to the OLD id, since a rename changes the entry's address). Two-tier failure
 *  handling: a missing `AUTH_DB` binding (a `CairnError` whose `conditionId` is
 *  `config.bindings-missing`, the same narrowing `media-route.ts` uses) or a missing
 *  `preview_tokens` table (a "no such table" D1 error) are the normal state for a site that has
 *  not adopted the preview feature yet, since the migration is additive, so both are silent: a
 *  site with neither loses no existing delete/rename/discard behavior over a table or binding it
 *  may never need. Any OTHER failure (a transient D1 fault on a MIGRATED site with live tokens) is
 *  still swallowed, since the primary action has already committed (or, for discard, proceeds
 *  regardless) by the time this runs and failing it outright would be worse, but it logs
 *  `preview.cleanup_failed` so a stale row, the exact id-reuse collision this cleanup exists to
 *  close, is not silently invisible to an operator. The logged `error` is the failure's stringified
 *  message; a store-level delete keyed by concept and id carries no token, so this cannot leak
 *  one. Publish deliberately never calls this: the ended page needs the row to outlive the branch,
 *  a stated coupling, not an oversight.
 */
export async function clearPreviewTokens(event: CairnEvent, concept: ConceptDescriptor, id: string): Promise<void> {
  try {
    const db = requireDb(event.platform?.env ?? {});
    await deletePreviewTokens(db, concept.id, id);
  } catch (err) {
    if (err instanceof CairnError && err.conditionId === 'config.bindings-missing') return;
    if (isMissingTableError(err)) return;
    log.warn('preview.cleanup_failed', { concept: concept.id, id, error: String(err) });
  }
}

/**
 * The row a manifest already holds for one entry, absent when it holds none, matched on the same
 *  concept+id identity `upsertEntry` uses. The publish and rename paths read it for the fields a
 *  re-derived row cannot carry, `publishedAt` above all.
 */
export function manifestRow(manifest: Manifest, conceptId: string, id: string): ManifestEntry | undefined {
  return manifest.entries.find((e) => e.concept === conceptId && e.id === id);
}

/**
 * The pending entry a `cairn/` ref names, or null for a ref the engine must ignore: a
 *  malformed name, an id that fails the slug rule (entry paths are built from it, so this is
 *  the path confinement), or a concept this site does not configure. Every ref consumer
 *  (the layout count, the list view, publish-all) applies this one predicate, so a stray
 *  hand-pushed ref cannot inflate a count it can never clear or reach a contents read.
 */
export function pendingEntryOf(runtime: CairnRuntime, name: string): { concept: ConceptDescriptor; id: string } | null {
  const ref = parsePendingBranch(name);
  if (!ref || !isValidId(ref.id)) return null;
  const concept = findConcept(runtime.concepts, ref.concept);
  return concept ? { concept, id: ref.id } : null;
}
