// cairn-cms: the shared parts of an admin form that answers a refusal in place. Internal to the
// admin screens; a plain module, so the pending flag stays a `$state` the screen owns.
import type { ActionResult, SubmitFunction } from '@sveltejs/kit';

/** What an admin form says when the request itself failed: a thrown fetch, an action that threw, or a non-JSON answer. */
export const FAILURE_NOTICE = 'That did not go through. Your text is still here; please try again.';

/** The result types a form hands to {@link RefusalOptions.onResult}: every one except a redirect. */
export type SettledResult = Exclude<ActionResult, { type: 'redirect' }>;

/** What {@link refusalSubmit} needs from the screen that owns the form. */
export interface RefusalOptions {
  /** Reads the screen's pending flag, a `$state` boolean. */
  isPending: () => boolean;
  /** Writes the screen's pending flag. */
  setPending: (pending: boolean) => void;
  /** Runs once a request is about to be sent, before the flag is raised. */
  onStart?: () => void;
  /**
   * Runs for every result that is not a redirect, after the flag clears and before `update()`.
   * An `error` result arrives here and nowhere else, since it is never applied to the page.
   */
  onResult?: (result: SettledResult, formElement: HTMLFormElement) => void;
  /** Refresh every load after a refusal, for a screen whose data decides who can act. */
  refreshAllOnFailure?: boolean;
}

/**
 * Build the `use:enhance` submit function for one form on a screen. A repeat submit while the
 * flag is raised is cancelled, since Kit's `enhance` has no guard of its own. A redirect leaves the
 * screen with a document load, so an expired session still lands on sign-in and the page rereads
 * everything. A `success` or `failure` goes through Kit's `update()`, which keeps the screen
 * mounted. An `error` is not applied: `applyAction` would replace the screen with the error page
 * and take the working copy with it, so it reaches `onResult` and the screen shows
 * {@link FAILURE_NOTICE} instead.
 */
export function refusalSubmit(options: RefusalOptions): SubmitFunction {
  return ({ cancel }) => {
    if (options.isPending()) {
      cancel();
      return;
    }
    options.onStart?.();
    options.setPending(true);
    return async ({ result, update, formElement }) => {
      if (result.type === 'redirect') {
        window.location.assign(result.location);
        return;
      }
      options.setPending(false);
      options.onResult?.(result, formElement);
      if (result.type === 'error') return;
      await update(options.refreshAllOnFailure && result.type === 'failure' ? { refreshAll: true } : undefined);
    };
  };
}

/** A mount-time action: focus the element without scrolling, for a refusal that has just appeared. */
export function focusOnMount(node: HTMLElement): void {
  node.focus({ preventScroll: true });
}
