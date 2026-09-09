// cairn-cms: the entry write cluster (saveAction, publishAction, publishAllAction,
// discardAction). These four share one core, saveToBranch, which validates the posted form and
// commits the entry file to its pending branch; save stops there, publish reuses the same held
// state to copy that commit to main. discardAction shares no code with the other three but sits
// here because it is the write cluster's fourth branch-lifecycle verb (save, publish, discard all
// act on the entry's own pending branch, unlike the destructive and revert clusters).
// createEntryWriteActions closes over the shared ContentRoutesContext
// (content-routes-context.ts), which createContentRoutesInternal builds once and passes to every
// sibling factory; the public createContentRoutes is a thin wrapper around that internal factory.
import { redirect, error, fail, type ActionFailure } from '@sveltejs/kit';
import { FRAGMENTS_CONCEPT_ID } from '../content/concepts.js';
import { extractCairnLinks, formatCairnToken } from '../content/links.js';
import { extractIncludes } from '../content/includes.js';
import { extractReferenceEdges } from '../content/references.js';
import { buildReferenceIndex } from '../content/reference-index.js';
import { frontmatterFromForm, parseMarkdown, serializeMarkdown } from '../content/frontmatter.js';
import { resolveTaxonomyField, coerceTags } from '../content/taxonomy.js';
import { resolveAllowed, closeTaxonomyField, enforceTaxonomy } from '../content/taxonomy-enforce.js';
import { asDate, entryIdentity } from '../content/identity.js';
import { permalinkUsesDateToken } from '../content/url-policy.js';
import { buildAddressIndex, addressCollision, type AddressEntry } from '../content/advisories.js';
import { filenameFromId } from '../content/ids.js';
import type { Backend } from '../github/backend.js';
import type { FileChange } from '../github/repo.js';
import { PENDING_PREFIX, pendingBranch } from '../content/pending.js';
import {
  manifestEntryFromFile,
  serializeManifest,
  stampFirstPublish,
  upsertEntry,
  type Manifest,
  type ManifestEntry,
} from '../content/manifest.js';
import { isConflict } from '../github/types.js';
import { logCommitFailed } from './commit-log.js';
import { log } from '../log/index.js';
import { parseMediaEntries, parseMediaManifest, upsertMediaEntry, serializeMediaManifest } from '../media/manifest.js';
import { requireEditor } from './guard.js';
import { canReach } from '../auth/access.js';
import type { ConceptDescriptor } from '../content/types.js';
import type { Editor } from '../auth/types.js';
import type { ContentRoutesContext } from './content-routes-context.js';
import type { CairnEvent } from './types.js';
import {
  requireEntryFromParams,
  clearPreviewTokens,
  manifestRow,
  pendingEntryOf,
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
 * Build the entry write cluster, closed over the shared content-routes context: save, publish,
 *  publish-all, and discard.
 */
export function createEntryWriteActions(ctx: ContentRoutesContext) {
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

  return {
    saveAction,
    publishAction,
    publishAllAction,
    discardAction,
  };
}
