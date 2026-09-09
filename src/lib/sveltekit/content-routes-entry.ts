// cairn-cms: the entry write, destructive, and revert clusters (saveAction, publishAction,
// publishAllAction, discardAction, deleteAction, listDeleteAction, renameAction, revertAction).
// The read cluster (createAction, editLoad, historyLoad) lives in content-routes-entry-read.ts.
// createEntryActions closes over the shared ContentRoutesContext (content-routes-context.ts),
// which createContentRoutesInternal builds once and passes to every sibling factory; the public
// createContentRoutes is a thin wrapper around that internal factory.
//
// Five of these eight handlers (discardAction, deleteAction, listDeleteAction, renameAction,
// revertAction) folded in here from content-routes-core.ts, since retired.
import { redirect, error, fail, type ActionFailure } from '@sveltejs/kit';
import { findConcept, FRAGMENTS_CONCEPT_ID } from '../content/concepts.js';
import { extractCairnLinks, formatCairnToken, rewriteCairnLink } from '../content/links.js';
import { extractIncludes, rewriteIncludeDirective } from '../content/includes.js';
import { extractReferenceEdges, rewriteFrontmatterReference } from '../content/references.js';
import { buildReferenceIndex } from '../content/reference-index.js';
import { frontmatterFromForm, parseMarkdown, serializeMarkdown } from '../content/frontmatter.js';
import { resolveTaxonomyField, coerceTags } from '../content/taxonomy.js';
import { resolveAllowed, closeTaxonomyField, enforceTaxonomy, unlistedTags } from '../content/taxonomy-enforce.js';
import { asDate, entryIdentity } from '../content/identity.js';
import { permalinkUsesDateToken } from '../content/url-policy.js';
import { buildAddressIndex, addressCollision, type AddressEntry } from '../content/advisories.js';
import { isValidId, filenameFromId, slugFromId, renameId } from '../content/ids.js';
import type { Backend } from '../github/backend.js';
import type { FileChange } from '../github/repo.js';
import { PENDING_PREFIX, pendingBranch } from '../content/pending.js';
import {
  manifestEntryFromFile,
  serializeManifest,
  stampFirstPublish,
  upsertEntry,
  removeEntry,
  inboundLinks,
  inboundReferences,
  inboundIncludes,
  type Manifest,
  type ManifestEntry,
  type InboundLink,
} from '../content/manifest.js';
import { isConflict, isBranchExists } from '../github/types.js';
import { logCommitFailed } from './commit-log.js';
import { log } from '../log/index.js';
import { parseMediaEntries, parseMediaManifest, upsertMediaEntry, serializeMediaManifest } from '../media/manifest.js';
import { requireEditor, requireEngineAccess } from './guard.js';
import { canReach } from '../auth/access.js';
import type { ConceptDescriptor, NamedField } from '../content/types.js';
import type { Editor } from '../auth/types.js';
import type { ContentRoutesContext } from './content-routes-context.js';
import type { CairnEvent, RevertFailure } from './types.js';
import {
  conceptOf,
  requireEntryFromParams,
  clearPreviewTokens,
  manifestRow,
  pendingEntryOf,
  invalidIdMessage,
  HISTORY_LIMIT,
  draftFromBranchHead,
  type ContentFormFailure,
} from './content-routes-shared.js';


/**
 * A blocked save or publish: `fail(400)` when the body links to a target absent from main.
 *  Module-internal (`convention-internal-sibling-comment`): its fields were flattened into
 *  {@link ContentFormFailure}, the exported carrier every action's `form` prop reads,
 *  so this narrower shape stays only as the `satisfies` clause each `fail()` call site below
 *  validates its literal against.
 */
interface SaveFailure {
  /** The one-line human summary every content action failure carries. */
  error: string;
  /** The cairn tokens that resolve to no entry, for the editor's fix-it banner. */
  brokenLinks: string[];
  /** The author's edited markdown, so the editor reseeds with the unsaved work. */
  body: string;
}


/**
 * A refused delete: `fail(409)` while other entries still link to (or include) this one. Stays
 *  module-exported (`convention-internal-sibling-comment`), unlike its siblings here, because
 *  `reproductions/stories/publish.ts` imports it directly for the `publish/refusal-banner` fixture;
 *  every route action still reads the flattened, publicly exported {@link ContentFormFailure}.
 */
export interface DeleteRefusal {
  /** The one-line human summary every content action failure carries. */
  error: string;
  /** The entries whose bodies link to (or include) the refused one, for the blockers list. */
  inboundLinks: InboundLink[];
  /**
   * Which gate refused, so the admin copy names the real blocker. Absent reads as `'link'`. A
   *  fragment can be blocked by either gate, and the links gate runs first, so the concept alone
   *  does not identify the cause: only the refusing gate knows.
   */
  inboundKind?: 'link' | 'include';
  /** The refused entry's id, so a list view marks the right row. */
  id: string;
}

/**
 * A refused rename: `fail(400)` on a bad slug, `fail(409)` on a collision or pending edits.
 *  Module-internal (`convention-internal-sibling-comment`): flattened into
 *  {@link ContentFormFailure}; stays only as a `satisfies` validation shape.
 */
interface RenameFailure {
  /** The one-line human summary every content action failure carries. */
  error: string;
}


/**
 * The frontmatter keys every entry carries regardless of the site's own declared fields: the
 * engine reads these directly (`manifestEntryFromFile`, the list-row summarizer) rather than
 * gating them on a `NamedField`, so they are never "retired" even when a concept declares no
 * field of the same name. `description` feeds `deriveExcerpt` in both readers the same way.
 * Shared by `revertSchemaDrift`.
 */
const BUILTIN_FRONTMATTER_KEYS = new Set(['title', 'date', 'draft', 'description']);

/**
 * The revert schema-drift signals (spec "Part 2: revert", warn-not-refuse): frontmatter keys the
 * old version carries that the concept's current fields no longer declare, and taxonomy tags no
 * longer in the configured vocabulary. Pure and read-only; the caller decides what to do with the
 * result, since revert never refuses on it.
 */
function revertSchemaDrift(
  concept: ConceptDescriptor,
  frontmatter: Record<string, unknown>,
  vocabValues: string[],
): { retiredFields: string[]; retiredTags: string[] } {
  const known = new Set(concept.fields.map((f) => f.name));
  const retiredFields = Object.keys(frontmatter).filter((k) => !known.has(k) && !BUILTIN_FRONTMATTER_KEYS.has(k));
  const taxField = resolveTaxonomyField(concept.fields);
  const retiredTags =
    vocabValues.length > 0 && taxField !== null ? unlistedTags(vocabValues, coerceTags(frontmatter[taxField])) : [];
  return { retiredFields, retiredTags };
}


/**
 * The held outcome of a validated save: everything publish needs to copy the same markdown
 *  to main without re-reading the branch. `branchSha` is the branch commit saveToBranch just
 *  made, the guard for the post-publish branch delete; `manifest` is main's manifest with
 *  this entry's row upserted from the new markdown (the same last-writer-wins manifest race
 *  as delete and rename applies, caught by the build's fail-closed backstop).
 */
interface SaveHold {
  path: string;
  markdown: string;
  /**
   * The posted body alone, frontmatter stripped: publish's own conflict reseeds SaveFailure.body
   *  from this rather than the frontmatter-bearing `markdown`, mirroring what the editor typed.
   */
  body: string;
  branch: string;
  branchSha: string;
  manifest: Manifest;
  /** This entry's row as re-derived from the posted markdown, the one `manifest` holds upserted. */
  row: ManifestEntry;
  /**
   * The row that one replaced, read off main's manifest before the upsert. Absent for a
   *  never-published entry. Publish reads both to decide the first-publish stamp, which needs the
   *  old and the new draft state in scope; save ignores them, since a save commits no manifest.
   */
  priorRow?: ManifestEntry;
  /** The draft-target tokens the body links to, for save's warning query. */
  draftLinks: string[];
  /** The absent-or-draft reference targets, for save's non-blocking reference warning. */
  referenceWarnings: string[];
  /** The backend this save resolved, so publish reuses it without a second resolve. */
  backend: Backend;
  /**
   * The merged media.json change this save committed to the branch, when media is on and the
   *  post carried records. Publish reuses it verbatim so the main commit promotes the exact same
   *  merged content (decision 1: the default-branch base is read once, here, not re-merged at
   *  publish). Absent when media is off or no records were posted.
   */
  mediaChange?: FileChange;
}

/**
 * A save refusal's payload: the one-line summary over an empty broken-link list, reseeding the
 *  posted body so the editor re-renders with the unsaved work intact. The broken-link list is
 *  empty on every refusal but the link guard's own, which builds its payload with the tokens it
 *  found.
 */
function saveRefusal(message: string, body: string): SaveFailure {
  return { error: message, brokenLinks: [], body };
}

/**
 * Build the entry write, destructive, and revert clusters, closed over the shared
 *  content-routes context: save, publish, discard, delete, rename, and revert. The read cluster
 *  (create, edit, history) lives in `content-routes-entry-read.ts`.
 */
export function createEntryActions(ctx: ContentRoutesContext) {
  const { runtime } = ctx;

  /**
   * The shared core of save and publish: parse the posted form, validate the frontmatter,
   *  guard the body's cairn links, ensure the pending branch, and commit the entry file there
   *  with the session editor as author. Returns the held state, or the `fail()` the page renders
   *  in place: a broken-link refusal, a validation refusal (invalid frontmatter, a nested
   *  include, a missing date, an out-of-vocabulary tag), or a branch-commit conflict. Main stays
   *  untouched.
   */
  async function saveToBranch(
    event: CairnEvent,
    editor: Editor,
    concept: ConceptDescriptor,
    id: string,
  ): Promise<ActionFailure<ContentFormFailure> | SaveHold> {
    const path = `${concept.dir}/${filenameFromId(id)}`;
    const form = await event.request.formData();
    const body = String(form.get('body') ?? '');
    const isNew = form.get('new') === '1';

    // The backend is resolved up front: the branch-first prior-tags read below (the orphan union)
    //  needs it before the validate.
    const backend = ctx.resolveBackend(event);

    // Tag-vocabulary enforcement, opt-in: only when the site configures a vocabulary AND this
    //  concept marks a taxonomy field. Otherwise the bare path runs unchanged (the open creatable
    //  multiselect an unadopted site has today). When enforced, the allowed set is the vocabulary
    //  unioned with the entry's own prior committed tags, so a re-saved pre-existing orphan passes
    //  while a genuinely new value is rejected; the closed field drives the getAll decode.
    const vocabValues = runtime.vocabulary.map((v) => v.value);
    const taxField = resolveTaxonomyField(concept.fields);

    let decoded: Record<string, unknown>;
    let allowed: string[] | null = null;
    if (vocabValues.length === 0 || taxField === null) {
      decoded = frontmatterFromForm(concept.fields, form);
    } else {
      // Read the entry's prior tags branch-first, mirroring editLoad: the pending branch when its
      //  head is non-null, else the default branch. A create has no prior tags. A failed read
      //  degrades to no prior tags so it never blocks the save.
      let priorTags: string[] = [];
      if (!isNew) {
        try {
          const branch = pendingBranch(concept.id, id);
          const priorBranch = (await backend.branchHead(branch)) !== null ? branch : backend.defaultBranch;
          const priorRaw = await backend.readFile(path, priorBranch);
          if (priorRaw !== null) priorTags = coerceTags(parseMarkdown(priorRaw).frontmatter[taxField]);
        } catch {
          priorTags = [];
        }
      }
      allowed = resolveAllowed(vocabValues, priorTags);
      decoded = frontmatterFromForm(closeTaxonomyField(concept.fields, allowed), form);
    }

    const result = concept.validate(decoded, body);
    if (!result.ok) {
      const message = Object.values(result.errors)[0] ?? 'Invalid frontmatter';
      return fail(400, saveRefusal(message, body));
    }

    // A fragment can never include another fragment (the engine resolves an include only one
    // pass deep; see resolve-include.ts). Keyed on the concept being the fragments concept, not on
    // routability in general, since routability describes URL behavior and this is a fragments-only
    // nesting rule. The check runs extractIncludes, the same extraction the manifest builds its
    // includes row from, so the refusal and the where-used index agree on what counts as an include.
    if (concept.id === FRAGMENTS_CONCEPT_ID && extractIncludes(body).length > 0) {
      return fail(400, saveRefusal("A fragment can't include another fragment.", body));
    }

    // Belt and braces: normalizeConcepts already forces a date-token concept's `date` field to
    // required, so an ordinary validate() failure should have caught a missing date before this
    // point. A hand-rolled validate (or a descriptor built outside normalizeConcepts) could still
    // pass with no usable date, and manifestEntryFromFile's resolvePermalink below throws on
    // exactly that case. Catch it here with the same editor-voiced refusal every other save
    // failure uses, rather than letting that throw escape as a raw 500.
    if (permalinkUsesDateToken(concept.permalink) && !asDate(result.data.date)) {
      return fail(400, saveRefusal('Pick a date for this entry.', body));
    }

    if (allowed !== null && taxField !== null) {
      const tagError = enforceTaxonomy(coerceTags(decoded[taxField]), allowed);
      if (tagError) {
        return fail(400, saveRefusal(tagError, body));
      }
    }

    const markdown = serializeMarkdown(result.data, body);

    // Merge the editor's optimistic media records into the media manifest, gated on media being on
    // and at least one valid record posted. The base is read from the default branch (never the
    // pending branch), so each save's union starts from main's committed rows, and decision 1's
    // last-writer-wins-by-hash race is the accepted trade. The merged file rides the branch commit
    // below and, carried on SaveHold, the publish commit, so both reuse the same content with no
    // second read. When media is off or no records arrive, nothing touches media.json.
    let mediaChange: FileChange | undefined;
    if (runtime.resolvedAssets.enabled) {
      const records = parseMediaEntries(form.get('media'));
      if (records.length > 0) {
        const baseRaw = await backend.readFile(runtime.mediaManifestPath, backend.defaultBranch);
        let mediaManifest = parseMediaManifest(ctx.parseMediaJson(baseRaw));
        for (const record of records) {
          mediaManifest = upsertMediaEntry(mediaManifest, record);
        }
        mediaChange = { path: runtime.mediaManifestPath, content: serializeMediaManifest(mediaManifest) };
      }
    }

    // Upsert this entry's row into main's manifest in memory, for the link guard here and for
    // the publish commit. The save commits no manifest change; publish lands the upsert on main.
    const manifest = await ctx.readManifest(backend);
    const row = manifestEntryFromFile(concept, { path, raw: markdown });
    // Capture the committed row BEFORE the upsert replaces it. The upsert result carries the merged
    // row, so publish could not otherwise tell a first publish from a re-publish.
    const priorRow = manifestRow(manifest, concept.id, id);
    const upserted = upsertEntry(manifest, row);

    // Save guard: resolve the body's cairn links against main's manifest with this entry upserted,
    // so a self-link and a link to any published target resolves. A link to a target absent from
    // main hard-blocks the save (publishing this entry before its target would red the deploy
    // build); a link to a draft target commits with a warning, since it is valid and resolves once
    // the target is published.
    const byKey = new Map(upserted.entries.map((e) => [`${e.concept}/${e.id}`, e]));
    const absent: string[] = [];
    const draftLinks: string[] = [];
    for (const ref of extractCairnLinks(body)) {
      // A self-link is valid by construction (the upserted manifest holds this very entry), so
      // skip it before classifying. Mirrors inboundLinks's self-exclusion.
      if (ref.concept === concept.id && ref.id === id) continue;
      const target = byKey.get(`${ref.concept}/${ref.id}`);
      if (!target) absent.push(formatCairnToken(ref));
      else if (target.draft) draftLinks.push(formatCairnToken(ref));
    }
    if (absent.length) {
      const noun = absent.length === 1 ? 'page' : 'pages';
      return fail(400, {
        error: `This page links to ${absent.length} missing ${noun}.`,
        brokenLinks: absent,
        body,
      } satisfies SaveFailure);
    }

    // Frontmatter reference warning: classify each typed reference edge against the same upserted
    // manifest. This is best-effort against the committed (possibly stale) main manifest and advisory
    // like draftLinks, NEVER the integrity guarantee; references have no prerender re-resolve backstop,
    // so verifyReferences at the build is the only authority. A reference NEVER blocks the save: unlike
    // a body link, an absent or draft target only warns, since the build gate fails a true dangling.
    const referenceWarnings: string[] = [];
    for (const edge of extractReferenceEdges(result.data, concept.fields)) {
      if (edge.concept === concept.id && edge.id === id) continue;
      const target = byKey.get(`${edge.concept}/${edge.id}`);
      if (!target || target.draft) referenceWarnings.push(`${edge.concept}/${edge.id}`);
    }

    // Ensure the entry's pending branch exists (cut lazily from main's head on first save), then
    // commit only the entry file there. Main stays untouched until publish, so the branch differs
    // from main at exactly this entry's path.
    const branch = pendingBranch(concept.id, id);
    if ((await backend.branchHead(branch)) === null) {
      // The default-branch head read distinguishes a first save from a re-save; a null is the
      // unreadable-default-branch case the create cannot recover from, so fail with the 500.
      const mainHead = await backend.branchHead(backend.defaultBranch);
      if (mainHead === null) throw error(500, 'Cannot read the default branch');
      await backend.createBranch(branch, backend.defaultBranch);
    }

    const commitFields = { concept: concept.id, id, editor: editor.email, branch };
    let branchSha: string;
    try {
      branchSha = await backend.commit(
        branch,
        mediaChange ? [{ path, content: markdown }, mediaChange] : [{ path, content: markdown }],
        { name: editor.displayName, email: editor.email },
        `Update ${concept.label.toLowerCase()}: ${id}`,
      );
      log.info('commit.succeeded', commitFields);
    } catch (err) {
      return ctx.commitFailure(
        commitFields,
        err,
        saveRefusal('This file changed since you opened it. Reload and reapply your edits.', body),
      );
    }
    return { path, markdown, body, branch, branchSha, manifest: upserted, row, priorRow, draftLinks, referenceWarnings, backend, mediaChange };
  }

  /**
   * Save an edit: validate, then commit to the entry's pending branch with the session editor
   *  as author. Main and its manifest stay untouched until publish. Fails safe on 409.
   */
  async function saveAction(event: CairnEvent): Promise<ActionFailure<ContentFormFailure>> {
    const { editor, concept, id } = requireEntryFromParams(runtime, event);
    const held = await saveToBranch(event, editor, concept, id);
    if (!('branchSha' in held)) return held;
    let savedQuery = held.draftLinks.length
      ? `saved=1&drafts=${encodeURIComponent(held.draftLinks.join(','))}`
      : 'saved=1';
    if (held.referenceWarnings.length)
      savedQuery += `&refs=${encodeURIComponent(held.referenceWarnings.join(','))}`;
    throw redirect(303, `/admin/${concept.id}/${id}?${savedQuery}`);
  }

  /**
   * Publish an entry: validate and hold the posted form exactly like save (the branch gets the
   *  same commit), then copy that markdown to main with the manifest row upserted in one atomic
   *  commit. Publish-what-you-see: the posted form is the published content, so text typed
   *  after the last save goes live too, and publish works regardless of prior branch state.
   *  The branch is deleted only when its head still matches the commit this action made; a
   *  concurrent save moved it, so the entry stays pending and the next publish picks it up.
   */
  async function publishAction(event: CairnEvent): Promise<ActionFailure<ContentFormFailure>> {
    const { editor, concept, id } = requireEntryFromParams(runtime, event);
    const held = await saveToBranch(event, editor, concept, id);
    if (!('branchSha' in held)) return held;
    const { path, markdown, body, branch, branchSha, manifest: upserted, row, priorRow, backend, mediaChange } = held;

    // Stamp the first publish here, not in saveToBranch: a save commits no manifest, so the moment an
    // entry goes live is this commit. The stamped row replaces the unstamped one saveToBranch
    // upserted, keyed the same, so the manifest this commit lands carries the stamp.
    const manifest = upsertEntry(upserted, stampFirstPublish(priorRow, row, new Date().toISOString()));

    // The publish commit reuses the exact merged media.json saveToBranch already built (decision 1:
    // no re-read or re-merge here). Promote it to main alongside the body and the content manifest
    // in one atomic commit, or commit those two alone when the save touched no media.
    const changes: FileChange[] = [
      { path, content: markdown },
      { path: runtime.manifestPath, content: serializeManifest(manifest) },
    ];
    if (mediaChange) changes.push(mediaChange);

    // The cross-branch address-collision re-check: warn-and-allow, last-write-wins, never a gate.
    // Resolve this entry's own address the way editLoad does and look it up in the index built from
    // the same manifest the publish carries. The read fails open: a thrown index build degrades to
    // no event and the publish proceeds, so a transient GitHub error never blocks a publish.
    let address = '';
    let collision: AddressEntry | null = null;
    try {
      const { frontmatter } = parseMarkdown(markdown);
      address = entryIdentity(concept, path, frontmatter).permalink;
      const addressIndex = await buildAddressIndex(backend, runtime.concepts, manifest);
      collision = addressCollision(addressIndex, { concept: concept.id, id }, address);
    } catch (err) {
      // Fail open, the same as editLoad: a thrown index build degrades to no event and the publish
      // proceeds. Log it so a persistently failing advisory build is diagnosable, not invisible.
      collision = null;
      log.warn('github.unreachable', { scope: 'publish_advisories', error: String(err) });
    }

    const commitFields = { concept: concept.id, id, editor: editor.email };
    try {
      await backend.commit(
        backend.defaultBranch,
        changes,
        { name: editor.displayName, email: editor.email },
        `Publish ${concept.label.toLowerCase()}: ${id}`,
      );
      log.info('entry.published', { ...commitFields, batch: false });
      // Only after the publish lands: a diagnostic that a live address now has a new owner.
      if (collision) {
        log.warn('publish.address_collided', {
          editor: editor.email,
          address,
          displacedConcept: collision.concept,
          displacedId: collision.id,
        });
      }
    } catch (err) {
      // The branch already holds the just-committed edits, so a conflict here loses nothing.
      return ctx.commitFailure(
        commitFields,
        err,
        saveRefusal('Your edits are saved. Reload and publish again.', body),
        { event: 'publish.failed' },
      );
    }
    // Only after the main commit lands, and only when the branch head is still the commit this
    // action made: a head that moved is a concurrent save, and deleting it would destroy edits.
    // No log event for the skip; the pending badge is the surface.
    if ((await backend.branchHead(branch)) === branchSha) {
      await backend.deleteBranch(branch);
    }
    // Deliberately no clearPreviewTokens call here, unlike discard/rename/delete: the ended page
    // (previewLoad) needs a published entry's outstanding rows to outlive the branch, so it can
    // still answer a stale link with "this preview has ended" rather than a bare 404. This
    // coupling is stated, not an oversight; do not "fix" it with a cleanup call later.
    throw redirect(303, `/admin/${concept.id}/${id}?published=1`);
  }

  /**
   * Publish every pending entry site-wide: one atomic commit on main carrying each branch's
   *  entry file plus the manifest with every row upserted, then delete the consumed branches.
   *  Mounted on the concept list shim, but the topbar posts here from anywhere, so the route's
   *  concept param is ignored and the redirect lands on the first configured concept. This is
   *  the one engine action that spans every concept in a single call, so it cannot gate with a
   *  single `requireEngineAccess(runtime.access, editor, target)` call the way every other
   *  concept route does: instead each pending entry is filtered by `canReach` against its own
   *  concept id, so a role mapped away from a concept never has that concept's entries published
   *  on its behalf, the same deny-at-the-route guarantee applied per entry instead of per route.
   */
  async function publishAllAction(event: CairnEvent): Promise<never> {
    const editor = requireEditor(event);
    const first = runtime.concepts[0];
    if (!first) throw error(404, 'No content types configured');
    const backend = ctx.resolveBackend(event);
    const listPage = `/admin/${first.id}`;

    // Each cairn/ ref names a pending entry; the shared predicate skips a stray ref rather
    // than failing the whole batch on it. A concept the access map denies this editor is
    // skipped the same way: this batch only ever acts on entries the editor could also reach
    // one at a time through the concept's own publish action.
    const names = await backend.listBranches(PENDING_PREFIX);
    const pending = names.flatMap((name) => {
      const entry = pendingEntryOf(runtime, name);
      if (!entry || !canReach(runtime.access, editor, entry.concept.id)) return [];
      return [{ ...entry, branch: name, path: `${entry.concept.dir}/${filenameFromId(entry.id)}` }];
    });

    // Read every branch in parallel, capturing each head sha BEFORE its file read: the sha
    // guards the post-publish delete, and probing first fails safe (a save landing between the
    // probe and the read moves the head past the capture, so the delete is skipped and the
    // entry stays pending). A ghost ref whose entry file is missing is skipped (discard can
    // clean it up); it carries nothing to publish.
    const reads = await Promise.all(
      pending.map(async (entry) => {
        const sha = await backend.branchHead(entry.branch);
        const raw = await backend.readFile(entry.path, entry.branch);
        return { ...entry, sha, raw };
      }),
    );

    // Fold main's manifest once over every row, so the batch lands content and index together,
    // the same shape as a single publish.
    let next = await ctx.readManifest(backend);
    const changes: FileChange[] = [];
    const published: { concept: string; id: string; branch: string; sha: string }[] = [];
    // One clock read for the batch, so every entry this commit first publishes carries the same
    // moment, the way one commit is one publish.
    const publishedAt = new Date().toISOString();
    for (const entry of reads) {
      if (entry.raw === null || entry.sha === null) continue;
      changes.push({ path: entry.path, content: entry.raw });
      // The same stamp rule as the single publish: the prior row is still in `next` at this point,
      // since the upsert that replaces it is the very next call.
      const prior = manifestRow(next, entry.concept.id, entry.id);
      const row = manifestEntryFromFile(entry.concept, { path: entry.path, raw: entry.raw });
      next = upsertEntry(next, stampFirstPublish(prior, row, publishedAt));
      published.push({ concept: entry.concept.id, id: entry.id, branch: entry.branch, sha: entry.sha });
    }
    if (published.length === 0) {
      throw redirect(303, `${listPage}?error=nothing_to_publish`);
    }
    changes.push({ path: runtime.manifestPath, content: serializeManifest(next) });

    const noun = published.length === 1 ? 'entry' : 'entries';
    try {
      await backend.commit(
        backend.defaultBranch,
        changes,
        { name: editor.displayName, email: editor.email },
        `Publish ${published.length} ${noun}`,
      );
      for (const entry of published) {
        log.info('entry.published', { concept: entry.concept, id: entry.id, editor: editor.email, batch: true });
      }
    } catch (err) {
      // One record per entry in the failed batch, so the log names what did not go live.
      for (const entry of published) {
        logCommitFailed({ concept: entry.concept, id: entry.id, editor: editor.email }, err, 'publish.failed');
      }
      if (isConflict(err)) {
        throw redirect(303, `${listPage}?error=publish_conflict`);
      }
      // Every other outcome of this action is its own redirect to listPage (above and below), so
      // an unexpected commit failure gets the same treatment rather than escaping to viewAction's
      // generic fail(500): this action posts to the bare /admin, whose own load (indexLoad)
      // always redirects away before ever rendering a component that reads `form`, so a fail()
      // here would be silently discarded before an editor ever saw it. The bounded publish_failed
      // code carries the same calm copy viewAction's own unexpected-failure fallback uses.
      throw redirect(303, `${listPage}?error=publish_failed`);
    }
    // Only after the main commit lands: a failure above keeps every branch and its edits. Each
    // branch deletes only when its head still matches the captured sha; a moved head is a
    // concurrent save, so the entry stays pending and the next publish picks it up (no log
    // event for the skip; the pending badge is the surface). A failed delete leaves an
    // idempotent straggler (re-publishing copies the same content), so one failure does not
    // abort the remaining deletes.
    for (const entry of published) {
      try {
        if ((await backend.branchHead(entry.branch)) === entry.sha) {
          await backend.deleteBranch(entry.branch);
        }
      } catch {
        // The entry is live; the straggler just shows as still pending until the next publish.
      }
    }
    throw redirect(303, `${listPage}?publishedAll=${published.length}`);
  }

  /**
   * Discard an entry's pending edits: delete the branch (tolerant of already-gone) and return to
   *  the edit page when the entry lives on main, else to the list (the entry is gone entirely).
   */
  async function discardAction(event: CairnEvent): Promise<never> {
    const { editor, concept, id } = requireEntryFromParams(runtime, event);
    const backend = ctx.resolveBackend(event);

    await backend.deleteBranch(pendingBranch(concept.id, id));
    log.info('entry.discarded', { concept: concept.id, id, editor: editor.email });

    const onMain = await backend.readFile(`${concept.dir}/${filenameFromId(id)}`, backend.defaultBranch);
    if (onMain !== null) throw redirect(303, `/admin/${concept.id}/${id}?discarded=1`);
    // Only a never-published entry's discard clears preview-token rows: the id is now free for an
    // unrelated future entry to claim, the id-reuse collision the clear closes. Discarding an EDIT
    // of a live entry leaves its rows alone (the same "publish does not clear" coupling), since the
    // id still names the same, still-live entry and the ended page (previewLoad's own branch-gone,
    // main-exists path) is the correct answer for an outstanding link, never a bare 404 implying the
    // link never existed.
    await clearPreviewTokens(event, concept, id);
    throw redirect(303, `/admin/${concept.id}`);
  }

  /**
   * The shared delete core. Block-until-clean: refuse while inbound links exist (naming them), else
   *  commit the file removal and the manifest patch in one commit. The inbound recheck here is the
   *  authoritative gate, closing the load-to-delete race. Both the editor delete (id from params) and
   *  the list delete (id from the form body) call this with an already-validated id, so the guard is
   *  enforced once.
   */
  async function deleteEntry(
    event: CairnEvent,
    concept: ConceptDescriptor,
    id: string,
    editor: Editor,
  ): Promise<ActionFailure<ContentFormFailure>> {
    const path = `${concept.dir}/${filenameFromId(id)}`;
    const backend = ctx.resolveBackend(event);

    // An absent manifest degrades the inbound gate to "allow": with no manifest there is nothing to
    // check, and the build's cairn: backstop still catches any dangling token, mirroring saveAction.
    const manifest = await ctx.readManifest(backend);
    const inbound = inboundLinks(manifest, concept.id, id);
    if (inbound.length) {
      return fail(409, {
        error: `Cannot delete ${id}: ${inbound.length} ${inbound.length === 1 ? 'page links' : 'pages link'} to it.`,
        inboundLinks: inbound,
        id,
      } satisfies DeleteRefusal);
    }

    // The fragments-concept delete guard: a fragment id is unique within the fragments concept (the
    // only concept an ::include directive can target), so only this concept's entries need the check.
    // Same degrade-to-allow posture as the links gate above; a dangling include is the build's
    // include-resolver backstop, not this request-time gate.
    if (concept.id === FRAGMENTS_CONCEPT_ID) {
      const includers = inboundIncludes(manifest, id);
      if (includers.length) {
        return fail(409, {
          error: `Cannot delete ${id}: ${includers.length} ${includers.length === 1 ? 'entry includes' : 'entries include'} it. Remove the include first.`,
          inboundLinks: includers,
          inboundKind: 'include',
          id,
        } satisfies DeleteRefusal);
      }
    }

    // Cross-branch reference gate (fail-closed). A strict reference index unions main's published edges
    // and every open cairn/* branch; unlike the main-only body-link gate above, it does NOT degrade to
    // allow when it cannot read, because the build's verifyReferences backstop only sees main. A
    // transient branch-read failure that looked like "no references" would let a delete strand an
    // inbound edge held in an unpublished draft, so refuse with a 503 rather than proceed.
    let refIndex: Awaited<ReturnType<typeof buildReferenceIndex>>;
    try {
      refIndex = await buildReferenceIndex(backend, runtime.concepts, manifest, { strict: true });
    } catch {
      return fail(503, {
        error: 'Could not verify where this entry is referenced. Try again.',
        inboundLinks: [],
        id,
      } satisfies DeleteRefusal);
    }
    const refRows = refIndex.get(`${concept.id}/${id}`) ?? [];
    if (refRows.length > 0) {
      // Carry each referencing entry into the InboundLink shape the blockers list renders. A branch row
      // has no permalink (the edit is unpublished), so default it to empty.
      const referencingEntries: InboundLink[] = refRows.map((row) => ({
        concept: row.concept,
        id: row.id,
        title: row.title,
        permalink: row.permalink ?? '',
      }));
      const n = referencingEntries.length;
      return fail(409, {
        error: `Cannot delete ${id}: ${n} ${n === 1 ? 'entry references' : 'entries reference'} it.`,
        inboundLinks: referencingEntries,
        id,
      } satisfies DeleteRefusal);
    }

    // When the entry was never published (absent from main), the branch delete is the whole
    // operation; main has nothing to commit, so the only honest log record is the discard of
    // the pending edits.
    const onMain = await backend.readFile(path, backend.defaultBranch);
    if (onMain === null) {
      await backend.deleteBranch(pendingBranch(concept.id, id));
      log.info('entry.discarded', { concept: concept.id, id, editor: editor.email });
      await clearPreviewTokens(event, concept, id);
      throw redirect(303, `/admin/${concept.id}`);
    }

    const nextManifest = serializeManifest(removeEntry(manifest, concept.id, id));
    const commitFields = { concept: concept.id, id, editor: editor.email };
    try {
      await backend.commit(
        backend.defaultBranch,
        [
          { path, content: null },
          { path: runtime.manifestPath, content: nextManifest },
        ],
        { name: editor.displayName, email: editor.email },
        `Delete ${concept.label.toLowerCase()}: ${id}`,
      );
      log.info('commit.succeeded', commitFields);
    } catch (err) {
      return ctx.commitFailure(commitFields, err, {
        error: 'This file changed since you opened it. Reload and try again.',
        inboundLinks: [],
        id,
      } satisfies DeleteRefusal);
    }
    // Cascade to the pending branch only after the removal lands on main, so a commit conflict
    // keeps the unpublished edits. A straggler ref left by a failure here is idempotent and
    // recoverable (it lists as a never-published row a discard can clean up), matching
    // publish's posture, so the entry's deletion still completes.
    try {
      await backend.deleteBranch(pendingBranch(concept.id, id));
    } catch {
      // The entry is gone from main; the straggler shows as a pending row until discarded.
    }
    // The entry is gone from both main and its branch; any outstanding preview link would 404 on
    // its own (branch_gone), but clearing here closes the id-reuse window instead of leaving it to
    // that natural expiry. Deliberately run for both success exits above: both delete paths route
    // through deleteEntry, the sole delete-path caller of clearPreviewTokens, so the list-initiated
    // delete (listDeleteAction) cannot bypass it.
    await clearPreviewTokens(event, concept, id);
    throw redirect(303, `/admin/${concept.id}`);
  }

  /** Delete an entry from its editor. The id comes from the route param. */
  async function deleteAction(event: CairnEvent): Promise<ActionFailure<ContentFormFailure>> {
    const { editor, concept, id } = requireEntryFromParams(runtime, event);
    return deleteEntry(event, concept, id, editor);
  }

  /** Delete an entry from the concept list. The id comes from the form body. */
  async function listDeleteAction(event: CairnEvent): Promise<ActionFailure<ContentFormFailure>> {
    const editor = requireEditor(event);
    const concept = conceptOf(runtime, event.params);
    requireEngineAccess(runtime.access, editor, concept.id);
    const form = await event.request.formData();
    const id = String(form.get('id') ?? '');
    if (!isValidId(id)) throw error(400, 'Invalid entry id');
    return deleteEntry(event, concept, id, editor);
  }

  /**
   * Rename an entry: change its slug, move the file, and rewrite every inbound cairn token in one
   *  atomic commit, so no internal link breaks. The collision check and the inbound recompute here
   *  are the authoritative gate. The same last-writer-wins manifest race as save and delete applies,
   *  caught by the build's fail-closed backstop.
   */
  async function renameAction(event: CairnEvent): Promise<ActionFailure<ContentFormFailure>> {
    const { editor, concept, id } = requireEntryFromParams(runtime, event);
    const backend = ctx.resolveBackend(event);

    // Pending edits on the branch are keyed to the old id; renaming underneath them would strand
    // them, so refuse until the editor publishes or discards.
    if ((await backend.branchHead(pendingBranch(concept.id, id))) !== null) {
      return fail(409, { error: 'This entry has unpublished edits. Publish or discard them, then rename.' } satisfies RenameFailure);
    }

    const form = await event.request.formData();
    const newSlug = String(form.get('slug') ?? '').trim();
    if (!isValidId(newSlug)) {
      return fail(400, { error: invalidIdMessage(concept) } satisfies RenameFailure);
    }
    const datePrefix = concept.routing.dated ? concept.datePrefix : null;
    if (concept.routing.dated && /^\d{4}-/.test(newSlug)) {
      return fail(400, { error: 'Leave the date out of the address.' } satisfies RenameFailure);
    }
    if (newSlug === slugFromId(id, datePrefix)) {
      return fail(400, { error: 'That is already the address.' } satisfies RenameFailure);
    }
    const newId = renameId(id, newSlug, datePrefix);
    const oldPath = `${concept.dir}/${filenameFromId(id)}`;
    const newPath = `${concept.dir}/${filenameFromId(newId)}`;

    // Collision guard: refuse if a file already exists at the new path. This 409 covers two cases a
    // single readRaw cannot tell apart: a static collision with an existing entry, and a
    // concurrent-rename race where another editor renamed onto this path between load and submit.
    const clobber = await backend.readFile(newPath, backend.defaultBranch);
    if (clobber !== null) {
      return fail(409, { error: 'An entry with that address already exists.' } satisfies RenameFailure);
    }

    const [entryRaw, manifest] = await Promise.all([
      backend.readFile(oldPath, backend.defaultBranch),
      ctx.readManifest(backend),
    ]);
    if (entryRaw === null) throw error(404, 'Entry not found');

    // Cross-branch reference gate (fail-closed). A reference index unions main's published edges and
    // every open cairn/* branch; if it cannot be built (a transient branch read failure), refuse
    // rather than rename a still-referenced target and strand the inbound edge.
    let refIndex: Awaited<ReturnType<typeof buildReferenceIndex>>;
    try {
      refIndex = await buildReferenceIndex(backend, runtime.concepts, manifest, { strict: true });
    } catch {
      return fail(409, { error: 'Could not verify references. Try again.' } satisfies RenameFailure);
    }

    // Refuse when a THIRD-PARTY open branch holds an inbound reference (symmetric with the pending-edits
    // guard). The strict index unions main and every branch, so filter before refusing: gate
    // origin.kind === 'branch' FIRST (a published row has no .branch, so a bare branch-name compare would
    // trip on every main-side inbound and over-refuse), then exclude the entry's OWN pending branch
    // (already refused above and absent by construction here). Published (main) inbound rows are NOT
    // refused; they are repointed below.
    const ownBranch = pendingBranch(concept.id, id);
    const conflictBranches = (refIndex.get(`${concept.id}/${id}`) ?? [])
      .filter((row) => row.origin.kind === 'branch' && row.origin.branch !== ownBranch)
      .map((row) => `${row.concept}/${row.id}`);
    if (conflictBranches.length > 0) {
      const names = [...new Set(conflictBranches)].join(', ');
      return fail(409, { error: `Another editor has unpublished edits referencing this entry: ${names}. Ask them to publish or discard, then rename.` } satisfies RenameFailure);
    }

    const oldHref = formatCairnToken({ concept: concept.id, id });
    const newHref = formatCairnToken({ concept: concept.id, id: newId });

    // The moved file keeps its content, except a self-token rewrite and a self-reference rewrite.
    let movedRaw = rewriteCairnLink(entryRaw, oldHref, newHref);
    // The moved entry is excluded from inboundReferences, so it must repoint its OWN frontmatter
    // self-references (e.g. `related` listing its own old id), or the re-derived row would carry the
    // old id and verifyReferences would flag a dangling edge at the deploy gate.
    for (const f of concept.fields) {
      if (f.type === 'reference' || (f.type === 'array' && f.item.type === 'reference')) {
        movedRaw = rewriteFrontmatterReference(movedRaw, f.name, id, newId);
      }
    }
    // Re-derive its manifest row from the new path so the row carries the new id and permalink by
    // construction (and the rewritten self-reference edge at the new id).
    const changes: FileChange[] = [
      { path: oldPath, content: null },
      { path: newPath, content: movedRaw },
    ];
    // The rename changes the entry's key, so the upsert preservation chokepoint cannot reach the old
    // row's first-publish stamp: read it off the old key here and carry it onto the new one. A
    // renamed entry is the same published entry at a new address, so its stamp must not reset.
    const priorPublishedAt = manifestRow(manifest, concept.id, id)?.publishedAt;
    let next = removeEntry(manifest, concept.id, id);
    const movedRow = manifestEntryFromFile(concept, { path: newPath, raw: movedRaw });
    next = upsertEntry(next, priorPublishedAt ? { ...movedRow, publishedAt: priorPublishedAt } : movedRow);

    // Repoint every inbound linker so its outbound edges point at the new id, both body `cairn:` links
    // and frontmatter reference fields. One entry can hold BOTH kinds at the same target, and the Git
    // Trees API resolves a duplicate path to the LAST entry, so a separate FileChange per kind would let
    // the second clobber the first. Union the two inbound sets keyed by linker PATH, read each file once
    // from main, apply every rewrite to the SAME buffer, then push ONE FileChange per path and re-derive
    // its row from the merged buffer. inboundReferences reads the committed (last-writer-wins stale)
    // manifest, so a real inbound edge not yet recorded there is left to verifyReferences at the deploy
    // gate; third-party open-branch inbounds were already refused above, so these are main-only.
    interface InboundRepoint {
      concept: string;
      id: string;
      hasLink: boolean;
      hasInclude: boolean;
      fields: string[];
    }
    const repoints = new Map<string, InboundRepoint>();
    const linkerPathFor = (linkerConcept: ConceptDescriptor, linkerId: string): string =>
      `${linkerConcept.dir}/${filenameFromId(linkerId)}`;
    // The three loops below look like a jscpd near-dupe (same lookup-and-guard shape), but their
    // merge semantics diverge: a link or an include sets a boolean flag, a reference unions a
    // field-name set. Parameterizing the difference would need a callback per loop, which is not
    // simpler than the three short loops it would replace; left as is.
    for (const linker of inboundLinks(manifest, concept.id, id)) {
      const linkerConcept = findConcept(runtime.concepts, linker.concept);
      if (!linkerConcept) continue;
      const path = linkerPathFor(linkerConcept, linker.id);
      const existing = repoints.get(path);
      if (existing) existing.hasLink = true;
      else repoints.set(path, { concept: linker.concept, id: linker.id, hasLink: true, hasInclude: false, fields: [] });
    }
    for (const linker of inboundReferences(manifest, concept.id, id)) {
      const linkerConcept = findConcept(runtime.concepts, linker.concept);
      if (!linkerConcept) continue;
      const path = linkerPathFor(linkerConcept, linker.id);
      const existing = repoints.get(path);
      if (existing) existing.fields = [...new Set([...existing.fields, ...linker.fields])];
      else repoints.set(path, { concept: linker.concept, id: linker.id, hasLink: false, hasInclude: false, fields: linker.fields });
    }
    // A fragment id is unique across the site, so inboundIncludes only matters when the renamed
    // entry IS a fragment; gated the same way the delete guard gates its own inboundIncludes call.
    if (concept.id === FRAGMENTS_CONCEPT_ID) {
      for (const includer of inboundIncludes(manifest, id)) {
        const includerConcept = findConcept(runtime.concepts, includer.concept);
        if (!includerConcept) continue;
        const path = linkerPathFor(includerConcept, includer.id);
        const existing = repoints.get(path);
        if (existing) existing.hasInclude = true;
        else repoints.set(path, { concept: includer.concept, id: includer.id, hasLink: false, hasInclude: true, fields: [] });
      }
    }
    for (const [linkerPath, repoint] of repoints) {
      const linkerConcept = findConcept(runtime.concepts, repoint.concept);
      if (!linkerConcept) continue;
      let linkerRaw = await backend.readFile(linkerPath, backend.defaultBranch);
      if (linkerRaw === null) continue;
      if (repoint.hasLink) linkerRaw = rewriteCairnLink(linkerRaw, oldHref, newHref);
      if (repoint.hasInclude) linkerRaw = rewriteIncludeDirective(linkerRaw, id, newId);
      for (const field of repoint.fields) {
        linkerRaw = rewriteFrontmatterReference(linkerRaw, field, id, newId);
      }
      changes.push({ path: linkerPath, content: linkerRaw });
      next = upsertEntry(next, manifestEntryFromFile(linkerConcept, { path: linkerPath, raw: linkerRaw }));
    }

    changes.push({ path: runtime.manifestPath, content: serializeManifest(next) });

    const commitFields = { concept: concept.id, id: newId, editor: editor.email };
    try {
      await backend.commit(
        backend.defaultBranch,
        changes,
        { name: editor.displayName, email: editor.email },
        `Rename ${concept.label.toLowerCase()}: ${id} to ${newId}`,
      );
      log.info('commit.succeeded', commitFields);
    } catch (err) {
      return ctx.commitFailure(commitFields, err, {
        error: 'This file changed since you opened it. Reload and try again.',
      } satisfies RenameFailure);
    }
    // Keyed to the OLD id: renaming refuses above while a pending branch exists, so a live preview
    // link for this entry (if any survived an earlier discard/publish's own cleanup) would now
    // resolve to whatever NEW draft later reuses the old id, an id-reuse collision closed here.
    await clearPreviewTokens(event, concept, id);
    throw redirect(303, `/admin/${concept.id}/${newId}?renamed=1`);
  }

  /**
   * The revert collision refusal (spec "Part 2: revert"): a pending branch already blocks this
   * entry, from either entry point (`revertAction`'s own fast pre-check, or `createBranch`'s
   * authoritative collision under a race). Re-reads the blocking draft through
   * `draftFromBranchHead`, so the refusal names the same person the history screen shows rather
   * than answering a bare 409. A branch that vanished between the collision and this re-read (an
   * unlucky discard) degrades to "unknown" rather than throwing: the refusal still stands, since
   * the caller's own attempt already failed.
   */
  async function draftExistsFailure(backend: Backend, path: string, branch: string): Promise<ActionFailure<RevertFailure>> {
    const draft = await draftFromBranchHead(backend, path, branch, await backend.branchHead(branch));
    return fail(409, {
      reason: 'draft_exists',
      draftEditor: draft?.editor ?? 'unknown',
      draftLastSavedAt: draft?.lastSavedAt ?? '',
    } satisfies RevertFailure);
  }

  /**
   * Revert an entry to an earlier publish (spec "Part 2: revert"): start a draft from an old
   * version, never a time machine. In order: (1) the posted `ref` must be a member of a FRESH
   * `listCommits` read (full-sha exact match), so only the listed recent publishes are revertable
   * through the UI; (2) the posted `head` must still match `branchHead(defaultBranch)`, or someone
   * published since the history page rendered; (3) the old content is read and inspected for
   * schema drift, which only ever warns, never refuses; (4) a pending branch already blocking this
   * entry refuses fail-closed, from the fast pre-check or from `createBranch`'s own typed
   * collision under a race; (5) the old markdown commits onto the new branch with `expectedHead`
   * set to the sha `createBranch` just made, so a save landing in that narrow window answers 409
   * instead of being silently overwritten; (6) `commit.reverted` logs alongside the ordinary
   * `commit.succeeded`; (7) the action lands on the edit screen's post-save redirect, carrying any
   * schema-drift advisory the same way save's own advisories ride. There is no force path: every
   * refusal here is a fail-closed `ActionFailure` that stays on the page.
   */
  async function revertAction(event: CairnEvent): Promise<ActionFailure<RevertFailure>> {
    const { editor, concept, id } = requireEntryFromParams(runtime, event);
    const backend = ctx.resolveBackend(event);
    const path = `${concept.dir}/${filenameFromId(id)}`;
    const branch = pendingBranch(concept.id, id);

    const form = await event.request.formData();
    const ref = String(form.get('ref') ?? '');
    const head = String(form.get('head') ?? '');

    // (1) Full-sha exact membership in a fresh read, not a trust of the posted row.
    const commits = await backend.listCommits(path, backend.defaultBranch, HISTORY_LIMIT);
    if (!commits.slice(0, HISTORY_LIMIT).some((c) => c.ref === ref)) {
      return fail(404, { reason: 'ref_unknown' } satisfies RevertFailure);
    }

    // (2) main must not have moved since the history page rendered.
    const mainHead = await backend.branchHead(backend.defaultBranch);
    if (mainHead !== head) {
      return fail(409, { reason: 'history_stale' } satisfies RevertFailure);
    }

    // (3) Read and inspect the old content; this never refuses the revert on schema drift, only
    // carries an advisory forward, so an old version is never permanently unrevertable. A listed
    // sha can still read as null, though: a delete commit touches the path (so listCommits offers
    // it) but leaves nothing to read back. That refuses in place, the same as any other listed
    // ref this action cannot honor, rather than escaping as a full 404 page.
    const raw = await backend.readFile(path, ref);
    if (raw === null) return fail(404, { reason: 'ref_unknown' } satisfies RevertFailure);
    const { frontmatter } = parseMarkdown(raw);
    const vocabValues = runtime.vocabulary.map((v) => v.value);
    const { retiredFields, retiredTags } = revertSchemaDrift(concept, frontmatter, vocabValues);

    // (4) The pre-check is a fast path for a friendly message; createBranch's typed collision,
    // caught below, is the authoritative refusal for a race this pre-check cannot see.
    if ((await backend.branchHead(branch)) !== null) {
      return draftExistsFailure(backend, path, branch);
    }
    let createdAtSha: string;
    try {
      createdAtSha = await backend.createBranch(branch, backend.defaultBranch);
    } catch (err) {
      if (isBranchExists(err)) return draftExistsFailure(backend, path, branch);
      throw err;
    }

    // (5) Fail-closed on the sha createBranch actually created the branch at, never the mainHead
    // read back in (2): createBranch re-reads the default branch's own head internally, several
    // round trips after (2)'s read, so a publish of any entry landing in that window can move main
    // between the two reads and make mainHead stale by the time the branch exists. Using
    // createBranch's own returned sha keeps this commit anchored to the branch's real starting
    // point, so it never conflicts on a change createBranch itself already absorbed. Re-reading
    // branchHead here instead would reopen the race this guards (a save landing between
    // createBranch and the re-read would be read back as the expected head and then silently
    // overwritten); any commit that sneaks onto the new branch after creation still makes this
    // commit conflict, mapped to the collision refusal.
    const commitFields = { concept: concept.id, id, editor: editor.email, branch };
    let newSha: string;
    try {
      newSha = await backend.commit(
        branch,
        [{ path, content: raw }],
        { name: editor.displayName, email: editor.email },
        `Revert ${concept.label.toLowerCase()}: ${id} to ${ref.slice(0, 7)}`,
        createdAtSha,
      );
    } catch (err) {
      logCommitFailed(commitFields, err);
      if (isConflict(err)) return draftExistsFailure(backend, path, branch);
      // A non-conflict failure means nothing else touched the branch this request just created;
      // best-effort delete it so it never lingers as an authorless pending branch in the counts
      // and publishAll. A failed cleanup swallows here, since the original error is what matters.
      try {
        await backend.deleteBranch(branch);
      } catch {
        // Best-effort: an orphaned branch is a lesser evil than masking the original error.
      }
      throw err;
    }

    // (6) commit.succeeded mirrors every other commit path; commit.reverted is revert's own
    // record, carrying the reverted-to ref and the branch sha the revert commit landed at.
    log.info('commit.succeeded', commitFields);
    log.info('commit.reverted', { concept: concept.id, id, editor: editor.email, ref, branchSha: newSha });

    // (7) The edit screen's post-save redirect, carrying the schema-drift advisory (if any)
    // through the same query-string channel save's draftLinks/referenceWarnings ride.
    let query = 'saved=1';
    if (retiredFields.length) query += `&revertRetiredFields=${encodeURIComponent(retiredFields.join(','))}`;
    if (retiredTags.length) query += `&revertRetiredTags=${encodeURIComponent(retiredTags.join(','))}`;
    throw redirect(303, `/admin/${concept.id}/${id}?${query}`);
  }

  return {
    saveAction,
    publishAction,
    publishAllAction,
    discardAction,
    deleteAction,
    listDeleteAction,
    renameAction,
    revertAction,
  };
}
