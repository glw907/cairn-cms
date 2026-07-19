// cairn-cms: the git-committed personal dictionary's add action (spec 1.6). createDictionaryActions
// closes over the shared ContentRoutesContext (content-routes-context.ts) built once by
// createContentRoutes.
import { fail } from '@sveltejs/kit';
import { isConflict } from '../github/types.js';
import { log } from '../log/index.js';
import type { Backend } from '../github/backend.js';
import { parseDictionary, mergeDictionaryWords, serializeDictionary, isValidDictionaryWord } from '../content/site-dictionary.js';
import { validateCsrfHeader } from './csrf.js';
import { requireEditor, requireEngineAccess } from './guard.js';
import type { Editor } from '../auth/types.js';
import type { ContentRoutesContext, ContentEvent } from './content-routes-context.js';

/**
 * The personal-dictionary add outcome (spec 1.6): the merged, canonical sorted word list after the
 *  add landed. The client reconciles its pending-additions set against this (a word now in the list is
 *  committed and dropped from pending). Admin-internal: exported for the editor host's reconcile, not
 *  on the package's sveltekit subpath, so it carries no reference page.
 */
export interface DictionaryAddResult {
  words: string[];
}

/**
 * A refused personal-dictionary add: `fail(403)` on a failed CSRF check, `fail(400)` on a body that
 *  carries no valid word. The client keeps its pending additions for the session and re-attempts on
 *  the next save, so the word is never silently dropped. Just the one-line summary.
 */
export interface DictionaryAddFailure {
  error: string;
}

/**
 * The cap on a personal-dictionary word, matched by isValidDictionaryWord. A word is one line, so
 *  this bounds an abusive input; the real authority is the per-character validation, which rejects
 *  whitespace and control bytes so a body can never inject an extra line into the committed file.
 */
const MAX_DICTIONARY_WORD = 64;
/**
 * The cap on the words a single add request carries: an editor adds a handful at save time, never
 *  a flood. Past this the body is treated as abusive and the surplus is dropped.
 */
const MAX_DICTIONARY_BATCH = 100;

/** Build the personal-dictionary add action, closed over the shared content-routes context. */
export function createDictionaryActions(ctx: ContentRoutesContext) {
  /**
   * Read the committed personal dictionary, merge the validated additions in sorted order, and commit
   *  the canonical file back. Shared by the first attempt and the post-conflict retry, so both re-read
   *  the head and re-merge the same additions; the merge is order-independent, so a concurrent editor's
   *  word that already landed is preserved and the result is the same sorted set regardless of order.
   *  Returns the merged word list. Throws CommitConflictError (via backend.commit) when the branch
   *  moves under the commit, which the caller catches to retry once.
   */
  async function mergeAndCommitDictionary(backend: Backend, additions: string[], editor: Editor): Promise<string[]> {
    const path = ctx.dictionaryFilePath();
    // The existing file as its canonical sorted set, so a no-op add is detected against the same
    // normalization the commit would write (an already-sorted file never re-commits just to reorder).
    const canonicalExisting = mergeDictionaryWords(parseDictionary(await backend.readFile(path, backend.defaultBranch)), []);
    const merged = mergeDictionaryWords(canonicalExisting, additions);
    // Nothing new (every addition was already present): skip the commit so an idempotent add never
    // pushes an empty commit that would redeploy the site. The merged set is still returned so the
    // client reconciles its pending additions away.
    if (merged.length === canonicalExisting.length) return merged;
    await backend.commit(
      backend.defaultBranch,
      [{ path, content: serializeDictionary(merged) }],
      { name: editor.displayName, email: editor.email },
      `Add to dictionary: ${additions.join(', ')}`,
    );
    return merged;
  }

  /**
   * Add a word (or batch) to the git-committed personal dictionary (spec 1.6). The transport mirrors
   *  the media raw-body actions exactly: a `text/plain` POST, the CSRF token in `X-Cairn-CSRF` validated
   *  by validateCsrfHeader (CSRF first, then the session), and a small JSON body `{ word }` or
   *  `{ words }`. It reads the current file from the default branch, inserts the validated words in
   *  sorted order if absent (idempotent), and commits through the GitHub-App pipeline.
   *
   *  The commit is SHA-guarded with commit-and-retry: backend.commit throws CommitConflictError when the
   *  branch moved under it, which is caught here to re-read the new head, re-merge the same additions
   *  (the sorted insert is order-independent, so a concurrent editor's word is preserved), and retry
   *  once. The response is the merged word list, so the client drops the now-committed words from its
   *  pending set; a refusal rides a `fail` envelope the client reads by `type`/`status`.
   *
   *  Input validation is load-bearing here: this commits to the repo from request input, so every word
   *  is length-bounded and rejected if it carries whitespace or control characters (a word is one
   *  line), and the batch is capped. A body that yields no valid word refuses with a 400 and commits
   *  nothing, so the committed file can never gain an injected or empty line.
   */
  async function addDictionaryWordAction(event: ContentEvent): Promise<ReturnType<typeof fail> | DictionaryAddResult> {
    // CSRF first: a raw-body (JSON) POST, so the header witness is the authority, like the upload and
    // media actions. A failed check refuses before the session read or any GitHub call.
    if (!event.cookies || !validateCsrfHeader({ url: event.url, request: event.request, cookies: event.cookies })) {
      return fail(403, { error: 'csrf' } satisfies DictionaryAddFailure);
    }
    const editor = requireEditor(event);
    // The edit view always carries the concept in its params (cairn-admin.ts's contentEvent), so
    // this gates the same as editLoad/saveAction on the entry's own concept, closing the deny-at-
    // the-route gap a mapped-away concept would otherwise leave in this edit-screen action.
    if (event.params.concept) requireEngineAccess(ctx.runtime.access, editor, event.params.concept);

    let payload: { word?: unknown; words?: unknown };
    try {
      payload = JSON.parse(await event.request.text());
    } catch {
      return fail(400, { error: 'Could not read the dictionary request.' } satisfies DictionaryAddFailure);
    }

    // Collect the candidate words from `word` and/or `words`, keep only the strings, validate each
    // against the one-line word grammar, dedupe, and cap the batch. A body with no valid word refuses.
    const raw = [
      ...(typeof payload.word === 'string' ? [payload.word] : []),
      ...(Array.isArray(payload.words) ? payload.words.filter((w): w is string => typeof w === 'string') : []),
    ];
    const additions = [...new Set(raw.filter((w) => isValidDictionaryWord(w, MAX_DICTIONARY_WORD)))].slice(0, MAX_DICTIONARY_BATCH);
    if (additions.length === 0) {
      return fail(400, { error: 'No valid word to add to the dictionary.' } satisfies DictionaryAddFailure);
    }

    const backend = ctx.resolveBackend(event);
    const commitFields = { concept: 'dictionary', id: additions[0]!, editor: editor.email };
    try {
      const words = await mergeAndCommitDictionary(backend, additions, editor);
      log.info('dictionary.added', { editor: editor.email, words: additions });
      return { words };
    } catch (err) {
      if (!isConflict(err)) throw err;
      // The branch moved under the commit. Re-read the new head and re-merge the same additions, then
      // retry once. The merge is order-independent, so a concurrent editor's word that landed in the
      // window is preserved and the two adds converge on the same sorted set.
      try {
        const words = await mergeAndCommitDictionary(backend, additions, editor);
        log.info('dictionary.added', { editor: editor.email, words: additions, retried: true });
        return { words };
      } catch (retryErr) {
        if (!isConflict(retryErr)) throw retryErr;
        // A second conflict: give up rather than loop. The client keeps the words in its pending set
        // for the session and re-attempts on the next save, so the word is never silently dropped.
        log.warn('dictionary.add_conflict', { editor: editor.email, words: additions });
        return fail(409, { error: 'The dictionary changed while saving. It will retry on the next save.' } satisfies DictionaryAddFailure);
      }
    }
  }

  return { addDictionaryWordAction };
}
