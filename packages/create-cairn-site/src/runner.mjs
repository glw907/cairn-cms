// The action runner: the single seam through which every create-cairn-site side effect flows.
// --dry-run is a property of this frame, not a per-feature flag. runActions is the ONLY place
// that consults dryRun; no execute thunk ever receives it or branches on it. Every later task
// that adds a side effect expresses it as an Action and lets this module decide whether it
// actually runs, so the dry-run guarantee holds no matter how many actions the scaffold grows.

/**
 * @typedef {object} Action
 * @property {string} title one line describing the action, printed on every run
 * @property {string} detail the exact effect, printed only under --dry-run
 * @property {() => Promise<void>} execute the side effect; never receives or checks dryRun
 */

/**
 * Build a frozen Action after validating its three fields.
 * @param {{ title: string, detail: string, execute: () => Promise<void> }} fields the action's
 *  title, detail, and execute thunk
 * @returns {Action} the frozen action, safe to hold in a shared action list
 */
export function defineAction({ title, detail, execute }) {
  if (typeof title !== 'string' || title.length === 0) {
    throw new Error('defineAction: title must be a non-empty string');
  }
  if (typeof detail !== 'string' || detail.length === 0) {
    throw new Error('defineAction: detail must be a non-empty string');
  }
  if (typeof execute !== 'function') {
    throw new Error('defineAction: execute must be a function');
  }
  return Object.freeze({ title, detail, execute });
}

/**
 * Run a list of actions in order, honoring the dry-run frame. Under dryRun the title and detail
 * are logged for every action and no execute thunk runs; otherwise only the title is logged and
 * execute is awaited before moving to the next action. A throwing action stops the run
 * immediately: its error is rewrapped naming the action's title, with the original preserved as
 * `cause`, so later actions never run.
 * @param {Action[]} actions the actions to run, in order
 * @param {{ dryRun: boolean, log: (line: string) => void }} options `dryRun` selects the frame;
 *  `log` receives one line per printed message
 * @returns {Promise<{ executed: number, skipped: number }>} counts of actions whose execute ran
 *  versus actions passed over under dry-run
 */
export async function runActions(actions, { dryRun, log }) {
  let executed = 0;
  let skipped = 0;
  for (const action of actions) {
    log(action.title);
    if (dryRun) {
      log(action.detail);
      skipped += 1;
      continue;
    }
    try {
      await action.execute();
    } catch (cause) {
      throw new Error(`${action.title}: ${cause.message}`, { cause });
    }
    executed += 1;
  }
  return { executed, skipped };
}
