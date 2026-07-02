// cairn-cms: the shared commit-failure log and bounce. Every route factory that read-modify-commits
// a single committed file (content-routes' settings and vocabulary saves, nav-routes' save) hits the
// same last-writer-wins race: a conflict is expected and warns with a reason, anything else is
// unexpected and logs at error. A free module, not a ContentRoutesContext method, so a factory
// outside the content-routes composition (createNavRoutes) shares the one definition instead of
// reimplementing it.
import { redirect } from '@sveltejs/kit';
import { isConflict } from '../github/types.js';
import { log } from '../log/index.js';

/**
 * Log a failed commit: a conflict is the expected last-writer-wins outcome, so it warns with a
 *  reason; any other error is unexpected and logs at error with the stringified cause. Publish
 *  failures carry the same shape under their own event name.
 */
export function logCommitFailed(
  fields: { concept: string; id: string; editor: string },
  err: unknown,
  event: 'commit.failed' | 'publish.failed' = 'commit.failed',
): void {
  if (isConflict(err)) {
    log.warn(event, { ...fields, reason: 'conflict' });
  } else {
    log.error(event, { ...fields, error: String(err) });
  }
}

/**
 * The shared commit catch for a page save: log the failure, bounce a conflict back to `page`
 *  with `message` as the inline error, and rethrow anything else. `query` keeps any extra params
 *  the bounce must carry (saveAction's `&new=1`).
 */
export function commitFailure(
  fields: { concept: string; id: string; editor: string },
  err: unknown,
  page: string,
  message: string,
  opts: { event?: 'commit.failed' | 'publish.failed'; query?: string } = {},
): never {
  logCommitFailed(fields, err, opts.event);
  if (isConflict(err)) {
    throw redirect(303, `${page}?error=${encodeURIComponent(message)}${opts.query ?? ''}`);
  }
  throw err;
}
