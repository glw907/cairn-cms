// The gate's pass bar: a leg passes only when a script fetches the live address and finds the
// edit's unique marker. A success message, an exit code, or a commit on the remote never counts.
// A 200 that lacks the marker never passes.
import { pathToFileURL } from 'node:url';

/**
 * @typedef {object} FetchCheckResult
 * @property {boolean} found true when a poll answered 200 with the marker in its body
 * @property {string} url the address polled, without the cache-busting query
 * @property {number} status the last poll's HTTP status, 0 when no poll answered
 * @property {string} fetchedAt ISO time of the last poll
 * @property {number} attempts how many polls ran
 */

/**
 * @typedef {object} PollOptions
 * @property {number} [intervalMs] gap between polls (15 seconds)
 * @property {number} [budgetMs] how long to keep polling (10 minutes)
 * @property {typeof fetch} [fetchImpl] the fetch to use; tests inject one
 * @property {(ms: number) => Promise<void>} [sleep] the wait between polls; tests inject a fake clock's
 * @property {() => number} [now] the clock in epoch milliseconds
 */

const DEFAULT_INTERVAL_MS = 15_000;
const DEFAULT_BUDGET_MS = 10 * 60_000;

/** @param {number} ms */
const realSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * One cookie-less, cache-busted GET.
 * @param {string} url the address
 * @param {typeof fetch} fetchImpl the fetch to use
 * @param {number} attempt the poll number, folded into the cache-busting query
 * @returns {Promise<{ status: number, body: string }>} the answer, status 0 on a network error
 */
async function pollOnce(url, fetchImpl, attempt) {
  const busted = new URL(url);
  busted.searchParams.set('gate-poll', `${Date.now()}-${attempt}`);
  try {
    const response = await fetchImpl(busted, {
      credentials: 'omit',
      headers: { 'cache-control': 'no-cache' },
      redirect: 'follow',
    });
    return { status: response.status, body: await response.text() };
  } catch {
    return { status: 0, body: '' };
  }
}

/**
 * Poll `url` until a 200 body holds `marker`, or the budget runs out.
 * @param {string} url the live address
 * @param {string} marker the edit's unique marker
 * @param {PollOptions} [options]
 * @returns {Promise<FetchCheckResult>} the last poll's evidence
 */
export async function fetchCheck(url, marker, options = {}) {
  const { intervalMs = DEFAULT_INTERVAL_MS, budgetMs = DEFAULT_BUDGET_MS, fetchImpl = fetch, sleep = realSleep, now = Date.now } = options;
  const deadline = now() + budgetMs;
  let attempts = 0;
  let status = 0;
  let fetchedAt = new Date(now()).toISOString();
  for (;;) {
    attempts++;
    const answer = await pollOnce(url, fetchImpl, attempts);
    status = answer.status;
    fetchedAt = new Date(now()).toISOString();
    if (status === 200 && answer.body.includes(marker)) return { found: true, url, status, fetchedAt, attempts };
    if (now() + intervalMs > deadline) return { found: false, url, status, fetchedAt, attempts };
    await sleep(intervalMs);
  }
}

/**
 * Prove the live page stayed unchanged for a window: every poll answers 200, holds `control` (a
 * line from before the edit, so a blank or error page cannot pass), and lacks `marker`.
 * @param {string} url the live address
 * @param {string} marker the edit's unique marker
 * @param {string} control a pre-edit string the page must still hold
 * @param {PollOptions} [options] `budgetMs` is the window
 * @returns {Promise<FetchCheckResult & { absent: boolean, reason?: string }>} `absent` is the verdict
 */
export async function fetchCheckAbsent(url, marker, control, options = {}) {
  const { intervalMs = DEFAULT_INTERVAL_MS, budgetMs = 5 * 60_000, fetchImpl = fetch, sleep = realSleep, now = Date.now } = options;
  const deadline = now() + budgetMs;
  let attempts = 0;
  for (;;) {
    attempts++;
    const { status, body } = await pollOnce(url, fetchImpl, attempts);
    const fetchedAt = new Date(now()).toISOString();
    const base = { url, status, fetchedAt, attempts };
    if (status !== 200) return { ...base, found: false, absent: false, reason: `answered ${status}, not 200` };
    if (body.includes(marker)) return { ...base, found: true, absent: false, reason: 'the marker is already live' };
    if (!body.includes(control)) return { ...base, found: false, absent: false, reason: 'the control string is missing' };
    if (now() + intervalMs > deadline) return { ...base, found: false, absent: true };
    await sleep(intervalMs);
  }
}

/**
 * The command line: `fetch-check.mjs <url> <marker>` or
 * `fetch-check.mjs <url> <marker> --absent <minutes> --control <string>`. Prints the result as
 * JSON and exits 1 on a failed check.
 * @param {string[]} argv the arguments after the script name
 * @returns {Promise<number>} the exit code
 */
export async function main(argv) {
  const [url, marker, ...rest] = argv;
  if (!url || !marker) {
    console.error('Usage: fetch-check.mjs <url> <marker> [--absent <minutes> --control <string>]');
    return 2;
  }
  const flag = (/** @type {string} */ name) => {
    const at = rest.indexOf(name);
    return at === -1 ? undefined : rest[at + 1];
  };
  const minutes = flag('--absent');
  if (minutes !== undefined) {
    const control = flag('--control');
    if (!control) {
      console.error('--absent needs --control <string>.');
      return 2;
    }
    const result = await fetchCheckAbsent(url, marker, control, { budgetMs: Number(minutes) * 60_000 });
    console.log(JSON.stringify(result));
    return result.absent ? 0 : 1;
  }
  const result = await fetchCheck(url, marker);
  console.log(JSON.stringify(result));
  return result.found ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}
