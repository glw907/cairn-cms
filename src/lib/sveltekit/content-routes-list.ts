// cairn-cms: the concept list load, listLoad, and its GitHub-backed row summarizers. createListActions
// closes over the shared ContentRoutesContext (content-routes-context.ts), built once per
// createContentRoutesInternal call and passed to every sibling factory; the public
// createContentRoutes is only a thin wrapper around it.
import { asString } from '../content/identity.js';
import { deriveExcerpt } from '../content/excerpt.js';
import { filenameFromId } from '../content/ids.js';
import { PENDING_PREFIX, pendingBranch } from '../content/pending.js';
import { parseMarkdown, dateInputValue } from '../content/frontmatter.js';
import { parseManifest } from '../content/manifest.js';
import { requireEditor, requireEngineAccess } from './guard.js';
import { resolveRefusalCode, refusalMessage } from './refusal-codes.js';
import { conceptOf, pendingEntryOf } from './content-routes-shared.js';
import type { Backend } from '../github/backend.js';
import type { ConceptDescriptor } from '../content/types.js';
import type { ContentRoutesContext } from './content-routes-context.js';
import type { CairnEvent } from './types.js';

/** One row in a concept's list view. */
export interface EntrySummary {
  id: string;
  title: string;
  date: string | null;
  draft: boolean;
  /** Publish state derived from the ref set: live as-is, live with pending edits, or branch-only. */
  status: 'published' | 'edited' | 'new';
  /**
   * The row's one-line summary: the manifest's indexed excerpt for a published row, the branch
   *  frontmatter/body excerpt for a pending one, and null when neither yields text.
   */
  summary: string | null;
}

/** The concept list view's data. */
export interface ListData {
  conceptId: string;
  label: string;
  /**
   * The singular noun for the create affordances ("New post"); from the descriptor, which defaults
   *  it to `label`.
   */
  singular: string;
  /** Posts carry a date in the new-entry form; pages do not (concept routing, spec §7.2). */
  dated: boolean;
  /**
   * Whether this concept is routable (`concept.routing.routable`), for the create form: a
   *  non-routable concept (the Fragments concept) has no permalink, so the form asks for a name
   *  rather than an address, matching the edit screen's own treatment.
   */
  routable: boolean;
  entries: EntrySummary[];
  /** A listing failure degrades to an inline message rather than a thrown 500. */
  error: string | null;
  /**
   * A publish-all bounce's engine copy, resolved server-side from a `?error=` code through
   *  {@link resolveRefusalCode} (`refusal-codes.ts`); an unrecognized value resolves to `null`, so
   *  a crafted query never reaches this field.
   */
  formError: string | null;
  /** The entry count from a publish-all redirect (`?publishedAll=`), for the list page's flash. */
  publishedAll: number | null;
}

/** Build the concept list load, closed over the shared content-routes context. */
export function createListActions(ctx: ContentRoutesContext) {
  const { runtime } = ctx;

  /**
   * Read a file's frontmatter for its list row, degrading to the id on any read failure. The
   *  repo defaults to main; a pending entry (edited or branch-only) passes its pending branch.
   */
  async function summarize(
    file: { id: string; path: string },
    backend: Backend,
    status: EntrySummary['status'],
    ref = backend.defaultBranch,
  ): Promise<EntrySummary> {
    try {
      const raw = await backend.readFile(file.path, ref);
      if (raw === null) return { id: file.id, title: file.id, date: null, draft: false, status, summary: null };
      const { frontmatter, body } = parseMarkdown(raw);
      const title = asString(frontmatter.title) ?? file.id;
      const date = dateInputValue(frontmatter.date) || null;
      // Normalize an empty excerpt to null, so a pending row matches EntrySummary's `string | null`
      // contract (the published builder already coalesces with `?? null`).
      const summary = deriveExcerpt(body, { description: asString(frontmatter.description) }) || null;
      return { id: file.id, title, date, draft: frontmatter.draft === true, status, summary };
    } catch {
      return { id: file.id, title: file.id, date: null, draft: false, status, summary: null };
    }
  }

  /**
   * Read an entry's list row from its pending branch, so a pending title or draft change shows
   *  in the list instead of reading as a lost save. summarize degrades a failed or empty read to
   *  an id-only row, so a ghost ref still lists.
   */
  function pendingRow(concept: ConceptDescriptor, id: string, status: EntrySummary['status'], backend: Backend): Promise<EntrySummary> {
    return summarize({ id, path: `${concept.dir}/${filenameFromId(id)}` }, backend, status, pendingBranch(concept.id, id));
  }

  /**
   * The per-file crawl, kept only for a repo with no committed manifest yet: list main's files
   *  and read each one for its row, with edited and new rows reading branch-first.
   */
  async function crawlEntries(concept: ConceptDescriptor, pendingIds: Set<string>, backend: Backend): Promise<EntrySummary[]> {
    const files = await backend.readEntries(concept.dir, backend.defaultBranch);
    const entries = await Promise.all(
      files.map((f) => (pendingIds.has(f.id) ? pendingRow(concept, f.id, 'edited', backend) : summarize(f, backend, 'published'))),
    );
    // A ref with no main file is a never-published entry; its row reads from its branch.
    const listed = new Set(files.map((f) => f.id));
    const newRows = await Promise.all(
      [...pendingIds].filter((id) => !listed.has(id)).map((id) => pendingRow(concept, id, 'new', backend)),
    );
    return [...entries, ...newRows];
  }

  /**
   * List a concept's entries with their publish status. Published rows project straight from
   *  main's manifest, which publish, delete, and rename keep atomically in sync with main, so
   *  the listing costs one manifest read plus one branch read per pending entry rather than one
   *  read per file. A manifest row with a pending ref is `edited` and reads branch-first; a ref
   *  with no manifest row appends a `new` row read from its branch. A listing failure degrades
   *  to an inline error, not a thrown 500.
   */
  async function listLoad(event: CairnEvent): Promise<ListData> {
    const editor = requireEditor(event);
    const concept = conceptOf(runtime, event.params);
    requireEngineAccess(runtime.access, editor, concept.id);
    const refusalCode = resolveRefusalCode(event.url.searchParams.get('error'));
    const formError = refusalCode ? refusalMessage(refusalCode) : null;
    const publishedAllRaw = event.url.searchParams.get('publishedAll');
    const publishedAll = publishedAllRaw !== null && /^\d+$/.test(publishedAllRaw) ? Number(publishedAllRaw) : null;
    const base = { conceptId: concept.id, label: concept.label, singular: concept.singular, dated: concept.routing.dated, routable: concept.routing.routable, formError, publishedAll };
    const backend = ctx.resolveBackend(event);
    try {
      const [manifestRaw, refs] = await Promise.all([
        backend.readFile(runtime.manifestPath, backend.defaultBranch),
        backend.listBranches(`${PENDING_PREFIX}${concept.id}/`),
      ]);
      const pendingIds = new Set(
        refs.flatMap((name) => {
          const entry = pendingEntryOf(runtime, name);
          return entry && entry.concept.id === concept.id ? [entry.id] : [];
        }),
      );
      // A repo with no committed manifest yet (a fresh site before its first publish) falls back
      // to the crawl; a manifest that parses but is empty is trusted as-is.
      if (manifestRaw === null) {
        return { ...base, entries: await crawlEntries(concept, pendingIds, backend), error: null };
      }
      // Newest id first, the same order the crawl's file listing produced.
      const rows = parseManifest(manifestRaw)
        .entries.filter((e) => e.concept === concept.id)
        .sort((a, b) => b.id.localeCompare(a.id));
      const entries = await Promise.all(
        rows.map((e) =>
          pendingIds.has(e.id)
            ? pendingRow(concept, e.id, 'edited', backend)
            : { id: e.id, title: e.title, date: e.date ?? null, draft: e.draft, status: 'published' as const, summary: e.summary ?? null },
        ),
      );
      const listed = new Set(rows.map((e) => e.id));
      const newRows = await Promise.all(
        [...pendingIds].filter((id) => !listed.has(id)).map((id) => pendingRow(concept, id, 'new', backend)),
      );
      return { ...base, entries: [...entries, ...newRows], error: null };
    } catch {
      return { ...base, entries: [], error: 'Could not load this content type from GitHub.' };
    }
  }

  return { listLoad };
}
