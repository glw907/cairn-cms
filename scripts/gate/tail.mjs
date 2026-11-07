// A short `wrangler tail` of one leg Worker, so a failed sign-in mail names the engine's own verdict
// (`auth.link.send_failed` and its code) instead of only "no message arrived". The engine emits one
// structured record per operational event; the table is the cairn-extending-a-site skill's
// references/log-events.md. A summary names the event and its level, the code, condition, reason,
// and error fields the record carries (the engine scrubs its send error), and the request's method,
// path, and status. It never copies the record's email field, a query string, or a token, and each
// summary is capped at 200 characters, since a row's reason can land in a public release body.
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
  /** @type {string[]} */
  const otherEvents = [];
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
      if (record && typeof record.event === 'string' && !WANTED.test(record.event)) otherEvents.push(record.event);
      if (!record || typeof record.event !== 'string' || !WANTED.test(record.event)) continue;
      const parts = [record.event];
      if (record.level) parts.push(String(record.level));
      for (const key of ['code', 'conditionId', 'reason', 'error']) if (record[key]) parts.push(`${key}=${String(record[key])}`);
      summaries.push(`${parts.join(' ')}${where ? ` (${where.trim()})` : ''}`.slice(0, SUMMARY_LIMIT));
    }
  }
  // A request under /admin with no sign-in record still says something: it arrived, with this
  // status and outcome, and logged this many lines. That separates "the send never ran" from "the
  // tail missed it".
  if (!summaries.length && where && /\/admin/.test(where) && entry?.outcome !== undefined) {
    const names = [...new Set(otherEvents)].slice(0, 3).join(',');
    summaries.push(`request${where} outcome=${entry.outcome} logs=${(entry?.logs ?? []).length}${names ? ` events=${names}` : ''}`.slice(0, SUMMARY_LIMIT));
  }
  return summaries;
}

/**
 * Split a stream of top-level JSON objects, which wrangler prints pretty-printed over many lines.
 * @param {string} buffer text so far; a trailing partial object stays in `rest`
 * @returns {{ objects: string[], rest: string }} each complete object's text, and the unread remainder
 */
export function splitJsonObjects(buffer) {
  /** @type {string[]} */
  const objects = [];
  let depth = 0;
  let inString = false;
  let escaped = false;
  let start = -1;
  let consumed = 0;
  for (let i = 0; i < buffer.length; i++) {
    const char = buffer[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = depth > 0;
    } else if (char === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (char === '}' && depth > 0) {
      depth--;
      if (depth === 0) {
        objects.push(buffer.slice(start, i + 1));
        consumed = i + 1;
      }
    }
  }
  return { objects, rest: depth > 0 ? buffer.slice(start) : buffer.slice(consumed).replace(/^[^{]*$/, '') };
}

/**
 * Start tailing a Worker. Never throws: a tail that cannot start answers a one-line reason when stopped.
 * @param {object} input
 * @param {string} input.workerName the Worker to tail
 * @param {Record<string, string | undefined>} input.env the environment wrangler runs in (the gate token and account id)
 * @param {typeof nodeSpawn} [input.spawn] the process starter; tests inject one
 * @param {number} [input.settleMs] how long `ready` waits after the connection line and `stop` waits for late lines
 * @param {number} [input.readyMs] the longest `ready` waits for wrangler's connection line; `npx` may download wrangler first
 * @returns {{ ready: Promise<void>, stop: () => Promise<string[]> }} `ready` resolves once wrangler says the tail is open, or after `readyMs`
 */
export function startWorkerTail({ workerName, env, spawn = nodeSpawn, settleMs = 1500, readyMs = 90_000 }) {
  /** @type {string[]} */
  const summaries = [];
  /** @type {import('node:child_process').ChildProcess | null} */
  let child = null;
  let startError = '';
  let stderrText = '';
  let stdoutText = '';
  let connected = false;
  /** @type {() => void} */
  let markConnected = () => {};
  const opened = new Promise((resolve) => {
    markConnected = () => resolve(undefined);
  });
  /** @param {string} text */
  const watchForConnection = (text) => {
    if (/successfully created tail|connected to/i.test(text)) {
      connected = true;
      markConnected();
    }
  };
  try {
    child = spawn('npx', ['--yes', '--prefer-online', WRANGLER, 'tail', workerName, '--format', 'json'], { env: /** @type {NodeJS.ProcessEnv} */ (env), stdio: ['ignore', 'pipe', 'pipe'] });
    let buffer = '';
    child.stdout?.on('data', (/** @type {Buffer | string} */ chunk) => {
      watchForConnection(String(chunk));
      if (stdoutText.length < SUMMARY_LIMIT) stdoutText += String(chunk);
      const split = splitJsonObjects(buffer + String(chunk));
      buffer = split.rest;
      for (const object of split.objects) {
        // In JSON mode wrangler prints no connection line; the first event is the proof.
        connected = true;
        markConnected();
        summaries.push(...summarizeTailLine(object));
      }
    });
    child.stderr?.on('data', (/** @type {Buffer | string} */ chunk) => {
      watchForConnection(String(chunk));
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
    ready: Promise.race([opened, new Promise((resolve) => setTimeout(resolve, readyMs))]).then(wait).then(() => undefined),
    async stop() {
      await wait();
      child?.kill();
      if (startError) return [`wrangler tail did not start: ${startError}`];
      // A tail the token cannot open says why on stderr; saying "nothing logged" then would mislead.
      if (!summaries.length && /error|unauthori[sz]ed|forbidden|permission/i.test(stderrText)) {
        return [`wrangler tail said: ${stderrText.replace(/\s+/g, ' ').trim().slice(0, 150)}`];
      }
      if (!summaries.length) {
        if (connected) return ['wrangler tail was connected and saw no sign-in event'];
        // eslint-disable-next-line no-control-regex -- strips the color codes wrangler prints
        const said = `${stderrText} ${stdoutText}`.replace(/\u001b\[[0-9;]*m/g, '').replace(/\s+/g, ' ').trim().slice(0, 120);
        return [`wrangler tail never connected; no sign-in event was seen${said ? `; it printed: ${said}` : '; it printed nothing'}`];
      }
      return summaries;
    },
  };
}
