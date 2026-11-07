// A short `wrangler tail` of one leg Worker, so a failed sign-in mail names the engine's own verdict
// (`auth.link.send_failed` and its code) instead of only "no message arrived". The engine emits one
// structured record per operational event; the table is the cairn-extending-a-site skill's
// references/log-events.md. Summaries name the event, its code and condition, and the request's
// path and status. They never carry a query string, an address, or a token, and each is capped at
// 200 characters, since a row's reason can land in a public release body.
import { spawn as nodeSpawn } from 'node:child_process';

/** The wrangler the generated template pins (`gate.mjs` `WRANGLER`). */
const WRANGLER = 'wrangler@4.156.2';
const SUMMARY_LIMIT = 200;
/** Events worth naming: sign-in and the guard. Everything else is noise for a mail miss. */
const WANTED = /^(auth\.|guard\.)/;

/**
 * @param {string} line one JSON line of `wrangler tail --format json`
 * @returns {string[]} one summary per wanted engine record in the line; empty when the line is not JSON
 */
export function summarizeTailLine(line) {
  /** @type {any} */
  let entry;
  try {
    entry = JSON.parse(line);
  } catch {
    return [];
  }
  const request = entry?.event?.request;
  let where = '';
  if (request?.url) {
    try {
      where = ` ${request.method ?? 'GET'} ${new URL(request.url).pathname} ${entry.event?.response?.status ?? ''}`.trimEnd();
    } catch {
      where = '';
    }
  }
  /** @type {string[]} */
  const summaries = [];
  for (const log of entry?.logs ?? []) {
    for (const message of log?.message ?? []) {
      let record = message;
      if (typeof message === 'string') {
        try {
          record = JSON.parse(message);
        } catch {
          continue;
        }
      }
      if (!record || typeof record.event !== 'string' || !WANTED.test(record.event)) continue;
      const parts = [record.event];
      if (record.level) parts.push(String(record.level));
      for (const key of ['code', 'conditionId', 'reason', 'error']) if (record[key]) parts.push(`${key}=${String(record[key])}`);
      summaries.push(`${parts.join(' ')}${where ? ` (${where.trim()})` : ''}`.slice(0, SUMMARY_LIMIT));
    }
  }
  return summaries;
}

/**
 * Start tailing a Worker. Never throws: a tail that cannot start answers a one-line reason when stopped.
 * @param {object} input
 * @param {string} input.workerName the Worker to tail
 * @param {Record<string, string | undefined>} input.env the environment wrangler runs in (the gate token and account id)
 * @param {typeof nodeSpawn} [input.spawn] the process starter; tests inject one
 * @param {number} [input.settleMs] how long `ready` and `stop` wait for wrangler to connect and for late lines
 * @returns {{ ready: Promise<void>, stop: () => Promise<string[]> }} `ready` resolves once the tail has had time to connect
 */
export function startWorkerTail({ workerName, env, spawn = nodeSpawn, settleMs = 5000 }) {
  /** @type {string[]} */
  const summaries = [];
  /** @type {import('node:child_process').ChildProcess | null} */
  let child = null;
  let startError = '';
  let stderrText = '';
  try {
    child = spawn('npx', ['--yes', '--prefer-online', WRANGLER, 'tail', workerName, '--format', 'json'], { env: /** @type {NodeJS.ProcessEnv} */ (env), stdio: ['ignore', 'pipe', 'pipe'] });
    let buffer = '';
    child.stdout?.on('data', (/** @type {Buffer | string} */ chunk) => {
      buffer += String(chunk);
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) summaries.push(...summarizeTailLine(line));
    });
    child.stderr?.on('data', (/** @type {Buffer | string} */ chunk) => {
      if (stderrText.length < SUMMARY_LIMIT) stderrText += String(chunk);
    });
    child.on('error', (error) => {
      startError = error.message;
    });
  } catch (error) {
    startError = /** @type {Error} */ (error).message;
  }
  const wait = () => new Promise((resolve) => setTimeout(resolve, settleMs));
  return {
    ready: wait().then(() => undefined),
    async stop() {
      await wait();
      child?.kill();
      if (startError) return [`wrangler tail did not start: ${startError}`];
      // A tail the token cannot open says why on stderr; saying "nothing logged" then would mislead.
      if (!summaries.length && /error|unauthori[sz]ed|forbidden|permission/i.test(stderrText)) {
        return [`wrangler tail said: ${stderrText.replace(/\s+/g, ' ').trim().slice(0, 150)}`];
      }
      return summaries;
    },
  };
}
