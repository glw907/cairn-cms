// cairn-cms: the entry read cluster (createAction, editLoad, historyLoad). These three sit
// together because none of them commits anything: createAction only validates a slug and
// redirects into editLoad, and editLoad and historyLoad each assemble one entry's admin view
// from a concurrent batch of GitHub reads. createEntryReadActions closes over the shared
// ContentRoutesContext (content-routes-context.ts), the same way every other domain-cluster
// factory does; content-routes.ts merges its three members into the wide internal shape.
import { redirect, error, fail, type ActionFailure } from '@sveltejs/kit';
import { findConcept, FRAGMENTS_CONCEPT_ID } from '../content/concepts.js';
import { frontmatterFromForm, formValues, parseMarkdown } from '../content/frontmatter.js';
import { initialValues } from '../content/fieldset.js';
import { resolveTaxonomyField, coerceTags } from '../content/taxonomy.js';
import { resolveAllowed, closeTaxonomyField, unlistedTags } from '../content/taxonomy-enforce.js';
import { asString, entryIdentity } from '../content/identity.js';
import { mainAddressIndex, addressCollision, type AdvisoryNotice } from '../content/advisories.js';
import { isValidId, slugify, filenameFromId, composeDatedId, slugFromId } from '../content/ids.js';
import { pendingBranch } from '../content/pending.js';
import { parseManifest, inboundLinks, inboundIncludes, type LinkTarget, type InboundLink } from '../content/manifest.js';
import { log } from '../log/index.js';
import { dictionaryFileForDialect, DEFAULT_TIDY_MODEL, resolveTidyConventions } from '../nav/site-config.js';
import type { TidyConventions } from '../nav/site-config.js';
import { keyKnownUnhealthy } from './tidy-key-health.js';
import { parseMediaManifest } from '../media/manifest.js';
import { mediaLibraryEntry } from '../media/library-entry.js';
import type { MediaLibrary } from '../media/library-entry.js';
import { parseDictionary, mergeDictionaryWords } from '../content/site-dictionary.js';
import { requireEditor, requireEngineAccess } from './guard.js';
import { resolvePublishActions, type PublishActionLink } from './publish-actions.js';
import type { ConceptDescriptor, NamedField, PreviewConfig, ResolvedPreview } from '../content/types.js';
import type { ContentRoutesContext } from './content-routes-context.js';
import type { CairnEvent, HistoryData, HistoryEntry } from './types.js';
import {
  conceptOf,
  invalidIdMessage,
  HISTORY_LIMIT,
  commitEditorName,
  draftFromBranchHead,
  type ContentFormFailure,
} from './content-routes-shared.js';

/**
 * One published fragment: enough for the picker's listing and the preview's include resolution.
 *  `body` is the fragment's raw markdown, read from the default branch only, never a pending
 *  branch's edits.
 */
export interface FragmentTarget {
  id: string;
  title: string;
  body: string;
}

/** The editor's data. `frontmatter` holds form-ready values (dates already `YYYY-MM-DD`). */
export interface EditData {
  conceptId: string;
  id: string;
  label: string;
  /**
   * The singular noun for the delete refusal's copy ("This post could not be deleted."); from the
   *  descriptor, which defaults it to `label`, mirroring {@link ListData.singular}.
   */
  singular: string;
  fields: NamedField[];
  frontmatter: Record<string, unknown>;
  body: string;
  title: string;
  isNew: boolean;
  saved: boolean;
  /** True after a successful rename redirect (`?renamed=1`), to confirm the new URL to the author. */
  renamed: boolean;
  /** The current URL slug (the date-stripped id for a dated concept), for the rename dialog prefill. */
  slug: string;
  /**
   * The site's link targets, for the preview resolver and the link picker; from the committed
   *  manifest, excluding any non-routable concept's rows (a fragment's gated permalink 404s, so it
   *  is never offered as a link target; it is included, never linked).
   */
  linkTargets: LinkTarget[];
  /**
   * The published fragments this entry can include, for the preview's `resolveFragment` and the
   *  fragment picker. `null` when nothing here can include one: the site declares no fragments
   *  concept, or this entry is itself a fragment (a fragment cannot include a fragment). `[]` when
   *  fragments are includable but none are published. Each body is read from the default branch
   *  only, so a pending edit to a fragment never leaks into another entry's preview; a read failure
   *  degrades the affected fragment out rather than failing the whole load.
   */
  fragmentTargets: FragmentTarget[] | null;
  /**
   * Whether this entry's concept is routable (`concept.routing.routable`), for the Address
   *  fieldset: a non-routable concept (the Fragments concept) has no permalink, so the sidebar
   *  shows a bare name instead of a URL.
   */
  routable: boolean;
  /**
   * The minimal media-resolver input the edit page builds its preview `resolveMedia` from, keyed by
   *  the 16-hex content hash and parallel to `linkTargets`. Empty when media is off or the read fails.
   */
  mediaTargets: Record<string, { slug: string; ext: string; contentType: string }>;
  /**
   * The picker's human layer for each stored asset, keyed by the 16-hex content hash and projected
   *  from the same committed media manifest read that populates `mediaTargets`. The `hash` field
   *  duplicates the key, so the picker can iterate `Object.values`. Empty when media is off or the
   *  read fails (the same degradation path as `mediaTargets`).
   */
  mediaLibrary: MediaLibrary;
  /** The entries that link to this one, for the delete guard. Empty when nothing links here. */
  inboundLinks: InboundLink[];
  /** True when the entry has a pending branch, so the body above came from that branch. */
  pending: boolean;
  /** True when the entry file exists on the default branch (the live site shows it). */
  published: boolean;
  /** True after a publish redirect (`?published=1`), for the confirmation strip. */
  publishedFlash: boolean;
  /**
   * The site's publish-actions config, resolved for this entry: filtered to this concept and
   *  templated with this entry's id. Rendered as quiet next-step links only alongside
   *  `publishedFlash`; empty when the site declares no `publishActions` (today's rendering,
   *  unchanged).
   */
  publishActions: PublishActionLink[];
  /** True after a discard redirect (`?discarded=1`), for the confirmation strip. */
  discardedFlash: boolean;
  /**
   * The adapter's preview knob resolved for this entry's concept (its `byConcept` override,
   *  when one exists, applied over the top-level values); null when the site sets none, which
   *  leaves the frame rendering unstyled markup behind a hint.
   */
  preview: ResolvedPreview | null;
  /**
   * The spellcheck dictionary file for the site's configured dialect (default US English), resolved
   *  once at compose. The editor resolves it to a real asset URL on the main thread and hands that URL
   *  to the spellcheck Worker's `init`, the same way `mediaLibrary` is threaded in. Just the filename,
   *  e.g. "dictionary-en-us.txt".
   */
  spellcheckDictionary: string;
  /**
   * The committed personal-dictionary words for the site (spec 1.6): the durable, shared, reviewable
   *  layer the editor seeds the spellcheck Worker's personal set from, the way `mediaLibrary` is handed
   *  in. Read from the git-committed `dictionary.txt` at editor load; empty when the file is absent or
   *  unreadable (the editor degrades to dialect-only). The dialect dictionary and the session ignore
   *  list are the other two layers; only this one is committed.
   */
  siteDictionary: string[];
  /**
   * The editor-tier tidy facts the review surface needs (spec 2.5): whether tidy is enabled, the model
   *  that runs (for the head pill), and the RESOLVED conventions (the only data source for a
   *  normalization's because-line and the local category inference). The API key never appears here, it
   *  is a Worker secret. `enabled` false hides the Tidy control, whether because the developer never
   *  turned tidy on or because a prior call already proved the key unhealthy (save-500-honest-errors):
   *  this is a cache read only, never an inline probe, so an edit load pays no added latency,
   *  and a dead key is absent, not disabled, until the cache's TTL clears or a fresh call succeeds.
   */
  tidy: { enabled: boolean; model: string; conventions: TidyConventions };
  /** Non-blocking editor advisories built server-side; today the cross-branch address collision. */
  advisories: AdvisoryNotice[];
  /**
   * The entry's prior tags that are not in the configured vocabulary, for the closed taxonomy
   *  picker's "not in your tag list" flag. Empty when the site configures no vocabulary, when the
   *  concept has no taxonomy field, or when every prior tag is in the vocabulary (the opt-in
   *  fallback). The picker keeps each orphan checked and removable; an unchecked save drops it.
   */
  orphanTags: string[];
}

/**
 * A refused create: `fail(400)` on a bad slug or missing date, `fail(409)` on an address
 *  collision. Module-internal (`convention-internal-sibling-comment`): flattened into
 *  {@link ContentFormFailure}; stays only as a `satisfies` validation shape.
 */
interface CreateFailure {
  /** The one-line human summary every content action failure carries. */
  error: string;
}

/**
 * Resolve the effective preview for one concept: its `byConcept` override wins per key, with
 *  nullish coalescing so an override key that is present but undefined keeps the top-level value.
 *  Stylesheets are always shared, and the `byConcept` map never reaches the client.
 */
function resolvePreview(preview: PreviewConfig | undefined, conceptId: string): ResolvedPreview | null {
  if (!preview) return null;
  const override = preview.byConcept?.[conceptId];
  return {
    stylesheets: preview.stylesheets,
    bodyClass: override?.bodyClass ?? preview.bodyClass,
    containerClass: override?.containerClass ?? preview.containerClass,
  };
}

/**
 * The revert schema-drift advisory (spec "Part 2: revert"): "this version predates a change to
 * this content type," naming the fields and tags. Shared between the revert cluster's
 * `revertAction`, which derives the two lists from the old content it is about to commit, and
 * `editLoad`, which rehydrates the same notice from the redirect's query params, the channel
 * save's own advisories already ride. Null when neither list carries anything, so a plain revert
 * adds no notice.
 */
function retiredContentAdvisory(retiredFields: string[], retiredTags: string[]): AdvisoryNotice | null {
  if (retiredFields.length === 0 && retiredTags.length === 0) return null;
  const parts: string[] = [];
  if (retiredFields.length) {
    parts.push(`the ${retiredFields.length === 1 ? 'field' : 'fields'} ${retiredFields.join(', ')}`);
  }
  if (retiredTags.length) {
    parts.push(`the ${retiredTags.length === 1 ? 'tag' : 'tags'} ${retiredTags.join(', ')}`);
  }
  return {
    kind: 'reverted-schema-drift',
    severity: 'warn',
    message: `This version predates a change to this content type: ${parts.join(' and ')} no longer belong to it. Saving keeps only what the current form shows.`,
  };
}

/**
 * Read a comma-joined query param as a list, dropping empty segments. An absent param and an
 * empty one both read as no list, so a caller needs no separate presence check.
 */
function commaListParam(url: URL, name: string): string[] {
  return (url.searchParams.get(name) ?? '').split(',').filter(Boolean);
}

/**
 * Build the entry read cluster, closed over the shared content-routes context: create, edit, and
 *  history.
 */
export function createEntryReadActions(ctx: ContentRoutesContext) {
  const { runtime } = ctx;
  /** Create a new entry: validate the slug, compose a dated id when the concept is dated, refuse to clobber. */
  async function createAction(event: CairnEvent): Promise<ActionFailure<ContentFormFailure>> {
    const editor = requireEditor(event);
    const concept = conceptOf(runtime, event.params);
    requireEngineAccess(runtime.access, editor, concept.id);
    const form = await event.request.formData();
    const rawTitle = String(form.get('title') ?? '').trim();
    const slug = String(form.get('slug') ?? '').trim() || slugify(rawTitle);
    const date = String(form.get('date') ?? '').trim();
    // The form asked a non-routable concept for a Name, so the refusal names the same thing back.
    if (!isValidId(slug)) return fail(400, { error: invalidIdMessage(concept) } satisfies CreateFailure);

    let id = slug;
    if (concept.routing.dated) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return fail(400, { error: 'Pick a date for this entry.' } satisfies CreateFailure);
      }
      if (/^\d{4}-/.test(slug)) {
        return fail(400, {
          error: 'Leave the date out of the address; set it in the date field.',
        } satisfies CreateFailure);
      }
      id = composeDatedId(date, slug, concept.datePrefix);
    }

    const backend = ctx.resolveBackend(event);
    const existing = await backend.readFile(`${concept.dir}/${filenameFromId(id)}`, backend.defaultBranch);
    if (existing !== null) {
      return fail(409, { error: 'An entry with that address already exists.' } satisfies CreateFailure);
    }
    // A pending branch is an entry too (saved but not yet published); refuse to clobber it.
    if ((await backend.branchHead(pendingBranch(concept.id, id))) !== null) {
      return fail(409, {
        error: 'An unpublished entry with that address already exists.',
      } satisfies CreateFailure);
    }

    // The raw typed title (before slugification) rides the redirect so editLoad can seed the
    // title field and the breadcrumb; an explicit address can diverge from the title, so the
    // slug alone is not enough to recover it. Omit the param for a blank title rather than
    // carrying an empty string through the URL.
    const titleParam = rawTitle ? `&title=${encodeURIComponent(rawTitle)}` : '';
    // The validated create-dialog date rides the redirect too, the same way the title does, so
    // editLoad seeds it into the fresh form instead of opening blank. A dated concept always has
    // a date here (the refusal above rejects an unparseable one); a non-dated concept carries none.
    const dateParam = concept.routing.dated ? `&date=${encodeURIComponent(date)}` : '';
    throw redirect(303, `/admin/${concept.id}/${id}?new=1${dateParam}${titleParam}`);
  }

  /** Open a file for editing. A `?new=1` miss yields a blank document; any other miss is a 404. */
  async function editLoad(event: CairnEvent): Promise<EditData> {
    const editor = requireEditor(event);
    const concept = conceptOf(runtime, event.params);
    requireEngineAccess(runtime.access, editor, concept.id);
    const id = event.params.id ?? '';
    if (!isValidId(id)) throw error(400, 'Invalid entry id');
    const isNew = event.url.searchParams.get('new') === '1';
    const backend = ctx.resolveBackend(event);
    const datePrefix = concept.routing.dated ? concept.datePrefix : null;
    const path = `${concept.dir}/${filenameFromId(id)}`;
    // A pending entry reads branch-first: the editor shows the unpublished edits. The manifest
    // (link targets and the inbound-link guard) always reads main, the authoritative copy.
    // Stage 1 runs the branch probe, the main-path read, and the manifest read concurrently,
    // so the probe does not serialize ahead of the other two; stage 2 adds the branch read
    // only when the probe found a branch, with the stage-1 main read serving as the published
    // signal either way.
    const branch = pendingBranch(concept.id, id);
    // The media manifest joins the concurrent batch only when media is on, read from the default
    // branch (pending branches carry no copy). A rejected media read degrades to null so the edit
    // never throws on a missing or unreadable media.json; the projection below treats null as empty.
    // The committed personal dictionary joins the concurrent batch, read from the default branch. A
    // rejected read degrades to null so the edit never throws on a missing or unreadable dictionary;
    // the projection below treats null as an empty word list (the editor falls back to dialect-only).
    const [headSha, mainRaw, manifestRaw, mediaRaw, dictionaryRaw] = await Promise.all([
      backend.branchHead(branch),
      backend.readFile(path, backend.defaultBranch),
      backend.readFile(runtime.manifestPath, backend.defaultBranch),
      runtime.resolvedAssets.enabled
        ? backend.readFile(runtime.mediaManifestPath, backend.defaultBranch).catch(() => null)
        : Promise.resolve(null),
      backend.readFile(ctx.dictionaryFilePath(), backend.defaultBranch).catch(() => null),
    ]);
    const pending = headSha !== null;
    const raw = pending ? await backend.readFile(path, branch) : mainRaw;
    if (raw === null && !isNew) throw error(404, 'Entry not found');
    const published = mainRaw !== null;

    const parsed = raw === null ? { frontmatter: {}, body: '' } : parseMarkdown(raw);
    // A fresh entry opens prefilled from each field's `default`, resolving a `'today'` date against a
    // request-time clock. The defaults sit under the empty parsed frontmatter, never over a real read.
    // The create dialog's typed title (carried on `?new=1&title=`) sits over the schema defaults and
    // under any parsed frontmatter, since a blank new doc has none and the seeded title should win.
    const seededTitle = isNew ? event.url.searchParams.get('title')?.trim() : null;
    // The create dialog's validated date rides the same seeding contract as the title: over the
    // schema defaults, under any parsed frontmatter. A malformed or absent param is ignored (a
    // dateless new entry still opens; the save-time guards below catch it before it can throw).
    const seededDateRaw = isNew ? event.url.searchParams.get('date') : null;
    const seededDate = seededDateRaw && /^\d{4}-\d{2}-\d{2}$/.test(seededDateRaw) ? seededDateRaw : null;
    const loadFrontmatter = isNew
      ? {
          ...initialValues(concept.schema, new Date()),
          ...(seededTitle ? { title: seededTitle } : {}),
          ...(seededDate ? { date: seededDate } : {}),
          ...parsed.frontmatter,
        }
      : parsed.frontmatter;
    const title = asString(loadFrontmatter.title) ?? id;

    const manifest = manifestRaw !== null ? parseManifest(manifestRaw) : null;
    let linkTargets: LinkTarget[] = [];
    // A fragment's edit screen shows where it is used (spec §4) through the same inbound surface
    // every other concept rides for the delete guard, so no new panel is needed: for the fragments
    // concept the "linkers" are the entries that include it, not link to it.
    let inbound: InboundLink[] = [];
    if (manifest !== null) {
      // A non-routable concept's entries (the Fragments concept) are excluded from linkTargets:
      // their permalink 404s, so the link picker and the preview's resolveLink must never offer
      // one as a link target (spec §1's not-a-link-target backstop). A manifest row whose concept
      // is no longer declared keeps today's lenient behavior (no descriptor to gate on).
      linkTargets = manifest.entries
        .filter((e) => findConcept(runtime.concepts, e.concept)?.routing.routable ?? true)
        .map((e) => ({
          concept: e.concept,
          id: e.id,
          permalink: e.permalink,
          title: e.title,
          date: e.date,
          draft: e.draft,
        }));
      inbound =
        concept.id === FRAGMENTS_CONCEPT_ID ? inboundIncludes(manifest, id) : inboundLinks(manifest, concept.id, id);
    }

    // The published fragments this entry can include: null when nothing here can include
    // one, so the fragment picker and the preview's resolveFragment read the same absence signal.
    // That covers two cases. A site with no fragments concept has none to offer. A fragment's OWN
    // edit screen cannot include one either (the save refuses a nested include), and resolving them
    // here would render a nested include in the preview that Save then refuses, so the preview
    // instead shows the literal-prose fallback the engine really ships. Skipping the batch there
    // also spares a fragment's every edit-load one read per published fragment.
    // When they are offered, ids and titles come from the committed manifest's fragments rows; each
    // body is a SECOND concurrent batch (read only after the manifest is parsed, since the per-id
    // paths derive from it), from the default branch only, so a fragment's own pending edits never
    // leak into another entry's preview. A read failure degrades that one target out rather than
    // failing the whole load (the mediaTargets shape).
    const fragmentsConcept = findConcept(runtime.concepts, FRAGMENTS_CONCEPT_ID);
    let fragmentTargets: EditData['fragmentTargets'] = null;
    if (fragmentsConcept && concept.id !== FRAGMENTS_CONCEPT_ID) {
      const rows = manifest?.entries.filter((e) => e.concept === FRAGMENTS_CONCEPT_ID) ?? [];
      const bodies = await Promise.all(
        rows.map(async (row): Promise<FragmentTarget | null> => {
          try {
            const raw = await backend.readFile(`${fragmentsConcept.dir}/${filenameFromId(row.id)}`, backend.defaultBranch);
            if (raw === null) return null;
            return { id: row.id, title: row.title, body: parseMarkdown(raw).body };
          } catch (e) {
            // A transport failure degrades this one target out, and downstream the preview then
            // renders the missing-fragment notice for a fragment that is committed and fine. Log
            // it, so an editor reporting "it says the fragment is missing" is diagnosable as a
            // read failure rather than a content problem.
            log.warn('include.read_failed', { fragment: row.id, error: e instanceof Error ? e.message : String(e) });
            return null;
          }
        }),
      );
      fragmentTargets = bodies.filter((b): b is FragmentTarget => b !== null);
    }

    // The address-collision advisory: warn-and-allow, never a gate. At edit-load it checks the
    // published corpus only, built synchronously from the same manifest read above (no extra GitHub
    // read per editor open); publishAction re-checks the full cross-branch index before it lands. The
    // try/catch degrades to no notice if entryIdentity throws on a malformed-date entry. Skip the build
    // with no manifest to index.
    let advisories: AdvisoryNotice[] = [];
    if (manifest !== null) {
      try {
        const identity = entryIdentity(concept, path, parsed.frontmatter);
        const addressIndex = mainAddressIndex(manifest);
        const other = addressCollision(addressIndex, { concept: concept.id, id }, identity.permalink);
        if (other) {
          const otherConcept = findConcept(runtime.concepts, other.concept);
          const label = otherConcept ? otherConcept.label : other.concept;
          advisories = [
            {
              kind: 'address-collision',
              severity: 'warn',
              message: `Another ${label} already uses the address ${identity.permalink}. Publish this one and it replaces the other at that address.`,
              actions: [{ label: `Open ${other.title}`, href: `/admin/${other.concept}/${other.id}` }],
            },
          ];
        }
      } catch {
        // A malformed-date entry that cannot resolve its permalink degrades to no advisory, fail open.
      }
    }

    // The revert schema-drift advisory (spec "Part 2: revert"): revertAction carries its two
    // retired-name lists on the redirect query, the same channel save's own draftLinks/
    // referenceWarnings ride; this rehydrates them into the same advisories array the address-
    // collision notice above already populates, so EditPage's one generic advisory region renders
    // both with no separate code path.
    const revertNotice = retiredContentAdvisory(
      commaListParam(event.url, 'revertRetiredFields'),
      commaListParam(event.url, 'revertRetiredTags'),
    );
    if (revertNotice) advisories = [...advisories, revertNotice];

    // Project the one committed media manifest read two ways: the minimal resolver triple the preview
    // needs (`mediaTargets`) and the picker's full human layer (`mediaLibrary`), both keyed by hash.
    // A corrupt committed file degrades both to empty, not a throw.
    const mediaTargets: EditData['mediaTargets'] = {};
    const mediaLibrary: EditData['mediaLibrary'] = {};
    for (const [hash, e] of Object.entries(parseMediaManifest(ctx.parseMediaJson(mediaRaw)))) {
      mediaTargets[hash] = { slug: e.slug, ext: e.ext, contentType: e.contentType };
      mediaLibrary[hash] = mediaLibraryEntry(e);
    }

    // Tag-vocabulary enforcement, opt-in: only when the site configures a vocabulary AND this
    //  concept marks a taxonomy field. The closed field drives the checkbox picker (options sourced
    //  from the vocabulary unioned with the entry's own prior tags), and the orphan set flags any
    //  prior tag not in the vocabulary. There is no extra backend read: the vocabulary is the
    //  deployed runtime snapshot and the prior tags come from the already-parsed frontmatter.
    //  Otherwise the bare path runs: the open creatable multiselect an unadopted site has today.
    const vocabValues = runtime.vocabulary.map((v) => v.value);
    const taxField = resolveTaxonomyField(concept.fields);
    let editFields = concept.fields;
    let orphanTags: string[] = [];
    if (vocabValues.length > 0 && taxField !== null) {
      const priorTags = coerceTags(loadFrontmatter[taxField]);
      const allowed = resolveAllowed(vocabValues, priorTags);
      orphanTags = unlistedTags(vocabValues, priorTags);
      editFields = closeTaxonomyField(concept.fields, allowed);
    }

    return {
      conceptId: concept.id,
      id,
      label: concept.label,
      singular: concept.singular,
      fields: editFields,
      frontmatter: formValues(editFields, loadFrontmatter),
      body: parsed.body,
      title,
      isNew,
      saved: event.url.searchParams.get('saved') === '1',
      renamed: event.url.searchParams.get('renamed') === '1',
      slug: slugFromId(id, datePrefix),
      linkTargets,
      fragmentTargets,
      routable: concept.routing.routable,
      mediaTargets,
      mediaLibrary,
      inboundLinks: inbound,
      pending,
      published,
      publishedFlash: event.url.searchParams.get('published') === '1',
      publishActions: resolvePublishActions(ctx.publishActions, { concept: concept.id, id }),
      discardedFlash: event.url.searchParams.get('discarded') === '1',
      preview: resolvePreview(runtime.preview, concept.id),
      // composeRuntime always resolves this from the site config's dialect; default a hand-built
      // runtime that omits it to the US English dictionary so the editor always has a real filename.
      spellcheckDictionary: runtime.spellcheckDictionary ?? dictionaryFileForDialect(undefined),
      // The committed personal-dictionary words, normalized to the canonical sorted, deduplicated set
      // so the editor seeds the Worker's personal layer with a clean list. A missing or unreadable file
      // is an empty list (the dialect-only fallback).
      siteDictionary: mergeDictionaryWords(parseDictionary(dictionaryRaw), []),
      // The editor-tier tidy facts: the master switch, the model (for the head pill), and the resolved
      // conventions (the because-line and category inference read only these). The API key is never
      // exposed here. A site with no tidy block reads disabled with the default conventions.
      tidy: {
        enabled: (runtime.tidy?.enabled ?? false) && !keyKnownUnhealthy(),
        model: runtime.tidy?.model || DEFAULT_TIDY_MODEL,
        conventions: resolveTidyConventions(runtime.tidy?.conventions),
      },
      advisories,
      orphanTags,
    };
  }

  /**
   * Load one entry's publish history (spec "Part 1: entry history"): the default branch's
   * bounded commit log for the entry's file, plus a synthetic draft row when a pending branch
   * exists. Guarded exactly as `editLoad`: `requireEngineAccess` covers authentication and the
   * per-concept capability boundary; this route enforces nothing else.
   */
  async function historyLoad(event: CairnEvent): Promise<HistoryData> {
    const editor = requireEditor(event);
    const concept = conceptOf(runtime, event.params);
    requireEngineAccess(runtime.access, editor, concept.id);
    const id = event.params.id ?? '';
    if (!isValidId(id)) throw error(400, 'Invalid entry id');
    const backend = ctx.resolveBackend(event);
    const path = `${concept.dir}/${filenameFromId(id)}`;
    const branch = pendingBranch(concept.id, id);
    const [commits, headSha, mainRaw, mainHead] = await Promise.all([
      backend.listCommits(path, backend.defaultBranch, HISTORY_LIMIT),
      backend.branchHead(branch),
      backend.readFile(path, backend.defaultBranch),
      // The default branch's own head sha, carried onto the page as HistoryData.head: the
      // revert form's staleness comparand, unrelated to headSha above (the pending branch's own
      // head, read for the draft row).
      backend.branchHead(backend.defaultBranch),
    ]);
    // A deleted entry still has a commit log (git's path filter reads history, not presence), so
    // existence is checked the way editLoad checks it: the file on the default branch, or an open
    // draft. Absent both, history 404s like the edit view; undelete is deliberately out of scope.
    if (mainRaw === null && headSha === null) throw error(404, 'Entry not found');
    const truncated = commits.length > HISTORY_LIMIT;
    const entries: HistoryEntry[] = commits.slice(0, HISTORY_LIMIT).map((c) => ({
      ref: c.ref,
      editor: commitEditorName(c.author),
      date: c.date,
    }));
    const draft = await draftFromBranchHead(backend, path, branch, headSha);
    return { entries, draft, truncated, head: mainHead };
  }

  return {
    createAction,
    editLoad,
    historyLoad,
  };
}
