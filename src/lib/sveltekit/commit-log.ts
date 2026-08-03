// cairn-cms: the shared commit-failure log and refusal. Every route factory that read-modify-commits
// a single committed file (content-routes' settings and vocabulary saves, nav-routes' save) hits the
// same last-writer-wins race: a conflict is expected and warns with a reason, anything else is
// unexpected and logs at error. A free module, not a ContentRoutesContext method, so a factory
// outside the content-routes composition (createNavRoutes) shares the one definition instead of
// reimplementing it.
import { fail, type ActionFailure } from '@sveltejs/kit';
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
 * The shared commit catch for a read-modify-commit action: log the failure, then answer a conflict
 *  in place with `fail(409, payload)`, so the caller's own screen shape carries the message
 *  (`SaveFailure`'s `body`, `DeleteRefusal`'s `inboundLinks`, and so on) and the page never
 *  navigates away from unsaved work. Anything else is unexpected and rethrows unchanged, so a
 *  genuine backend fault still reaches the caller's own unexpected-failure handling.
 */
export function commitFailure<T>(
  fields: { concept: string; id: string; editor: string },
  err: unknown,
  payload: T,
  opts: { event?: 'commit.failed' | 'publish.failed' } = {},
): ActionFailure<T> {
  logCommitFailed(fields, err, opts.event);
  if (isConflict(err)) {
    return fail(409, payload);
  }
  throw err;
}
