// cairn-cms: the entry revert cluster (revertAction). The destructive cluster (delete, rename)
// lives in content-routes-entry-destructive.ts, the read cluster (createAction, editLoad,
// historyLoad) lives in content-routes-entry-read.ts, and the write cluster (saveAction,
// publishAction, publishAllAction, discardAction) lives in content-routes-entry-write.ts.
// createEntryActions closes over the shared ContentRoutesContext (content-routes-context.ts),
// which createContentRoutesInternal builds once and passes to every sibling factory; the public
// createContentRoutes is a thin wrapper around that internal factory.
import { redirect, fail, type ActionFailure } from '@sveltejs/kit';
import { parseMarkdown } from '../content/frontmatter.js';
import { resolveTaxonomyField, coerceTags } from '../content/taxonomy.js';
import { unlistedTags } from '../content/taxonomy-enforce.js';
import { filenameFromId } from '../content/ids.js';
import type { Backend } from '../github/backend.js';
import { pendingBranch } from '../content/pending.js';
import { isConflict, isBranchExists } from '../github/types.js';
import { logCommitFailed } from './commit-log.js';
import { log } from '../log/index.js';
import type { ConceptDescriptor } from '../content/types.js';
import type { ContentRoutesContext } from './content-routes-context.js';
import type { CairnEvent, RevertFailure } from './types.js';
import { requireEntryFromParams, HISTORY_LIMIT, draftFromBranchHead } from './content-routes-shared.js';

/**
 * The frontmatter keys every entry carries regardless of the site's own declared fields: the
 * engine reads these directly (`manifestEntryFromFile`, the list-row summarizer) rather than
 * gating them on a field declaration, so they are never "retired" even when a concept declares no
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
 * Build the entry revert cluster, closed over the shared content-routes context: revert to an
 *  earlier publish. The destructive cluster (delete, rename) lives in
 *  `content-routes-entry-destructive.ts`.
 */
export function createEntryActions(ctx: ContentRoutesContext) {
  const { runtime } = ctx;

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
    revertAction,
  };
}
