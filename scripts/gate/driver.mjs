// The gate's prompt driver: it runs the real create-cairn-site CLI on a 100 by 40 pty and answers
// each clack prompt by the text the CLI prints, in whatever order they arrive, never with --yes.
// A prompt a run skips is simply never answered, so it cannot stall the run, and the reconcile
// runs instead of parking.
//
// A prompt is a rendered screen line carrying clack's active-prompt symbol followed by a table
// key, at the bottom of a frame that ends in clack's bare bar-end line. Any other output line is
// never a prompt, even one that repeats a table key. The pty comes from util-linux `script`, which
// ships with the gate host; Node has no pty of its own.
import { spawn, spawnSync } from 'node:child_process';
import { createWriteStream, existsSync } from 'node:fs';
import path from 'node:path';
import { renderTranscript } from '../checks/transcript-blocks.mjs';

/** clack's active-prompt symbol (`S_STEP_ACTIVE`, unicode form). */
const ACTIVE = '◆';
/** The bare bar-end line clack draws under an active prompt and removes on submit. */
const BAR_END = '└';
/** The line the CLI prints while it holds a progress page open for a long propagation wait. */
const HOLD_MARKER = 'Watch progress at';
const IDLE_MS = 10 * 60_000;
/** The CLI's propagation budget (40 minutes, `hold-loop.mjs`) plus five minutes; a test pins the two together. */
export const HOLD_IDLE_MS = 40 * 60_000 + 5 * 60_000;
const COLS = 100;
const ROWS = 40;

/**
 * @typedef {object} PromptEntry
 * @property {string} match text the active prompt line must contain
 * @property {'confirm' | 'select' | 'text' | 'password'} kind how the prompt takes its answer
 * @property {boolean} [answer] confirm: true sends `y`, false sends `n`, with no carriage return
 * @property {string} [label] select: the option to arrow to before the carriage return
 * @property {string | (() => string)} [value] text or password: what to type; absent takes the
 *  default. A function runs at answer time, so a secret is read late and a test can hook the answer.
 */

/**
 * @typedef {object} DriverOptions
 * @property {string} command the program to run
 * @property {string[]} args its arguments
 * @property {Record<string, string>} env its whole environment; nothing is inherited
 * @property {string} [cwd] its working directory
 * @property {PromptEntry[]} table the answers, matched by prompt text
 * @property {{ write(chunk: string): unknown }} [out] receives the CLI's raw output as it arrives
 * @property {string} [logPath] a file for the driver's own event lines, which never carry a value
 * @property {string} [capturePath] a file for the raw pty bytes
 * @property {number} [idleMs] how long without output before the run fails (10 minutes)
 * @property {number} [holdIdleMs] the limit while a progress page is held
 * @property {number} [settleMs] how long output must be quiet before a screen is read (150)
 */

/**
 * @typedef {object} DriverResult
 * @property {number} code the CLI's exit code, or -1 when the driver failed the run
 * @property {string} [failure] why the driver ended the run, naming the last screen
 * @property {string} screen the final rendered screen
 */

/** @param {string} word */
const shellQuote = (word) => `'${word.replace(/'/g, `'\\''`)}'`;

/**
 * The active prompt in a rendered frame, if the frame ends in one.
 * @param {string} frame the rendered screen
 * @returns {{ row: number, line: string, options: string[], selected: number } | null} the prompt's
 *  row, its message line, and for a select its option labels and the highlighted index
 */
export function findActivePrompt(frame) {
  const lines = frame.split('\n');
  let end = lines.length - 1;
  while (end >= 0 && lines[end].trim() === '') end--;
  if (end < 0 || lines[end].trim() !== BAR_END) return null;
  let row = -1;
  for (let i = end; i >= 0; i--) {
    if (lines[i].includes(ACTIVE)) {
      row = i;
      break;
    }
  }
  if (row === -1) return null;
  const line = lines[row].slice(lines[row].indexOf(ACTIVE) + 1).trim();
  /** @type {string[]} */
  const options = [];
  let selected = -1;
  for (const body of lines.slice(row + 1, end)) {
    const option = /^[│|]\s+([●○])\s+(.*)$/.exec(body);
    if (!option) continue;
    if (option[1] === '●') selected = options.length;
    options.push(option[2].trim());
  }
  return { row, line, options, selected };
}

/**
 * The keystrokes that answer a prompt.
 * @param {PromptEntry} entry the matching table entry
 * @param {{ options: string[], selected: number }} prompt the parsed prompt
 * @returns {string[] | { error: string }} the writes to make in order, or why the entry cannot answer
 */
export function keystrokesFor(entry, prompt) {
  if (entry.kind === 'confirm') return [entry.answer ? 'y' : 'n'];
  if (entry.kind === 'select') {
    const target = prompt.options.findIndex((option) => option.startsWith(entry.label ?? '\0'));
    if (target === -1) return { error: `the select offers no option "${entry.label}": ${prompt.options.join(' | ')}` };
    const delta = target - Math.max(prompt.selected, 0);
    const arrow = delta >= 0 ? '\x1b[B' : '\x1b[A';
    return [...Array(Math.abs(delta)).fill(arrow), '\r'];
  }
  const value = typeof entry.value === 'function' ? entry.value() : entry.value;
  return value ? [value, '\r'] : ['\r'];
}

/**
 * Run a command on a pty and answer its prompts from a table.
 * @param {DriverOptions} options
 * @returns {Promise<DriverResult>} how the run ended
 */
export function runDriver(options) {
  const { command, args, env, cwd, table, out, logPath, capturePath } = options;
  const idleMs = options.idleMs ?? IDLE_MS;
  const holdIdleMs = options.holdIdleMs ?? HOLD_IDLE_MS;
  const settleMs = options.settleMs ?? 150;
  const logStream = logPath ? createWriteStream(logPath, { flags: 'a', mode: 0o600 }) : null;
  const captureStream = capturePath ? createWriteStream(capturePath, { flags: 'a', mode: 0o600 }) : null;
  /** @param {string} event */
  const log = (event) => logStream?.write(`${new Date().toISOString()} ${event}\n`);

  const scriptBin = (process.env.PATH ?? '').split(path.delimiter).map((dir) => path.join(dir, 'script')).find((p) => existsSync(p));
  if (!scriptBin) return Promise.resolve({ code: -1, failure: 'util-linux `script` is not on PATH, so no pty can be made.', screen: '' });

  const inner = `stty cols ${COLS} rows ${ROWS}; exec ${[command, ...args].map(shellQuote).join(' ')}`;
  const child = spawn(scriptBin, ['-qefc', inner, '/dev/null'], { env, cwd, stdio: ['pipe', 'pipe', 'pipe'] });
  child.stdin.on('error', () => {});
  child.stdout.setEncoding('utf8');

  let raw = '';
  /** @type {string | undefined} */
  let failure;
  let holding = false;
  /** @type {Set<number>} */
  const answered = new Set();
  /** @type {NodeJS.Timeout | undefined} */
  let settleTimer;
  /** @type {NodeJS.Timeout | undefined} */
  let idleTimer;

  const screen = () => renderTranscript(raw);

  /** @param {string} reason */
  function fail(reason) {
    if (failure) return;
    failure = `${reason}\nLast screen:\n${screen().split('\n').slice(-15).join('\n')}`;
    log(`FAIL ${reason}`);
    stopPtyChild('TERM');
    setTimeout(() => stopPtyChild('KILL'), 3000).unref();
  }

  // `script` does not pass SIGTERM on to the program under the pty, so signal that program (its
  // direct child) itself; `script` exits when it does.
  /** @param {'TERM' | 'KILL'} signal */
  function stopPtyChild(signal) {
    spawnSync('pkill', [`-${signal}`, '-P', String(child.pid)]);
  }

  function armIdle() {
    clearTimeout(idleTimer);
    const limit = holding ? holdIdleMs : idleMs;
    idleTimer = setTimeout(() => fail(`no output for ${Math.round(limit / 1000)} seconds`), limit);
  }

  function readScreen() {
    if (failure) return;
    const prompt = findActivePrompt(screen());
    if (!prompt || answered.has(prompt.row)) return;
    const entry = table.find((candidate) => prompt.line.includes(candidate.match));
    if (!entry) return fail(`a prompt has no table entry: "${prompt.line}"`);
    const keys = keystrokesFor(entry, prompt);
    if ('error' in keys) return fail(keys.error);
    answered.add(prompt.row);
    holding = false;
    log(`answered "${entry.match}" (${entry.kind})`);
    for (const key of keys) child.stdin.write(key);
  }

  return new Promise((resolve) => {
    child.stdout.on('data', (/** @type {string} */ chunk) => {
      raw += chunk;
      out?.write(chunk);
      captureStream?.write(chunk);
      if (chunk.includes(HOLD_MARKER)) holding = true;
      armIdle();
      clearTimeout(settleTimer);
      settleTimer = setTimeout(readScreen, settleMs);
    });
    child.stderr.on('data', (/** @type {Buffer} */ chunk) => out?.write(String(chunk)));
    armIdle();
    child.on('close', (code) => {
      clearTimeout(settleTimer);
      clearTimeout(idleTimer);
      log(`exit ${code}`);
      logStream?.end();
      captureStream?.end();
      resolve(failure ? { code: -1, failure, screen: screen() } : { code: code ?? -1, screen: screen() });
    });
    child.on('error', (error) => {
      resolve({ code: -1, failure: `could not start the pty: ${error.message}`, screen: '' });
    });
  });
}
