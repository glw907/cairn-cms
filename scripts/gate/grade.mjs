// The grader: reads a finished run's directory and the clean home beside it, and writes
// `run-record.json` and `run-record.md` in the run directory. A read that fails is a failed check,
// never an empty one, and the record carries each failed read by name.
//
// Usage: node scripts/gate/grade.mjs <run dir> [--end stall|budget [--reason "<text>"]]
//
// `<run dir>` is `/var/tmp/cleanroom/<name>/run`; the clean home is `../home`. The grader runs
// `cleanroom shell` and `cleanroom scan`, copies the record to `~/.local/state/cairn-gate/proving/`,
// and deletes the home's keyrings last. Every read goes through an injected dependency, so a test
// runs it on a fixture with no network.
import { execFile } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { gateFetch } from './fetch-check.mjs';
import { findSignInMessage } from './mail.mjs';
import { authoritativeAddress } from './resolve.mjs';

const execFileAsync = promisify(execFile);

/**
 * The address the proving runs serve at, read through `gateFetch`: the gate subdomain, never the bare
 * domain, whose apex holds the mail records and where any record is a standing stop. The scripted
 * leg sets this address up, and the naive owner card gives it to the agent.
 */
export const LIVE_ORIGIN = 'https://gate.carin-test.org';
/**
 * The shell command that prints the first registry record, run as the clean room's user through
 * `cleanroom shell`. The registry directory is 0700 and that user's own, so the grader cannot list it
 * from outside.
 */
export const REGISTRY_READ = 'f=$(ls ~/.config/cairn/sites/*.json 2>/dev/null | sort | head -n 1); if [ -n "$f" ]; then cat "$f"; fi';
/** How long the grade waits for a run's watcher to finish ending the room before it reads the room. */
export const SETTLE_MS = 30_000;
/** The pause between checks of the watcher while the grade waits. */
const SETTLE_POLL_MS = 500;
/** How long the grader waits for the sign-in email to reach the gate mailbox. */
const MAIL_WAIT_MS = 60_000;
/** The mailbox that owns every proving site. */
const DEFAULT_OWNER_EMAIL = 'cairn-gate@probe.907.life';
/** Setup steps that wait on a provider, so their minutes are never the agent's. */
export const PROVIDER_STEPS = ['first-deploy', 'domains'];
/** Setup steps the owner performs in the browser, which the stand-in clicks. */
const OWNER_STEPS = ['approve-cloudflare', 'approve-create-app', 'approve-install-all', 'approve-install-repo', 'summary'];
/** Over this many minutes from the goal prompt to signed in, the slowest steps go on the setup list. */
export const PASS_MINUTES = 10;
/** Over this many minutes of harness overhead, the run goes on the test-drive list. */
export const OVERHEAD_MINUTES = 5;
/** The deploy job's steps, by name, for each phase the record times. */
export const DEPLOY_PHASES = {
  install: /npm install/i,
  build: /npm run (check|build)/i,
  deploy: /wrangler/i,
};
const EVENT_KINDS = new Set(['step_started', 'step_done', 'step_failed', 'waiting', 'resumed', 'summary']);
/** The leading characters of a `waiting` sentence that count as passing it on. */
const RELAY_PREFIX = 50;

/**
 * @typedef {object} Check
 * @property {boolean} ok whether the check passed
 * @property {string} evidence one line saying what was read, never a value
 */

/**
 * @typedef {object} CmdResult
 * @property {number} code the exit code
 * @property {string} stdout what the command printed
 */

/**
 * @typedef {object} GradeDeps
 * @property {(args: string[]) => Promise<CmdResult>} cleanroom runs the workstation `cleanroom` tool
 * @property {typeof fetch} [githubFetch] the fetch for the GitHub API
 * @property {typeof gateFetch} [siteFetch] the fetch for the live site
 * @property {(host: string) => Promise<string | null | undefined>} [authority] the address the zone's nameserver gives a host; null when it answered with none; undefined when none could be asked
 * @property {typeof findSignInMessage} [findMail] the mailbox read
 * @property {string} [provingDir] where run records are kept between runs
 * @property {Record<string, string | undefined>} env the allowlisted environment
 * @property {() => number} [now] the clock, epoch milliseconds
 * @property {(name: string) => Promise<boolean>} [watcherAlive] whether the run's watcher process is still running
 * @property {number} [settleMs] how long to wait for the watcher to finish; defaults to `SETTLE_MS`
 * @property {number} [pollMs] the pause between those checks; defaults to `SETTLE_POLL_MS`
 */

/** @param {string} value @returns {number} epoch milliseconds, or NaN */
const ms = (value) => Date.parse(value);
/** @param {number} from @param {number} to @returns {number} minutes, to one decimal place */
const minutesBetween = (from, to) => Math.round(((to - from) / 60_000) * 10) / 10;
/** @param {string} text @returns {string} the text lower-cased with whitespace collapsed */
const squash = (text) => text.replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * Read a JSON file, or say why it could not be.
 * @param {string} file
 * @returns {Promise<{ ok: true, value: any } | { ok: false, reason: string }>}
 */
async function readJson(file) {
  try {
    return { ok: true, value: JSON.parse(await readFile(file, 'utf8')) };
  } catch (error) {
    return { ok: false, reason: `${path.basename(file)}: ${/** @type {Error} */ (error).message}`.slice(0, 160) };
  }
}

/**
 * @typedef {object} TranscriptLine
 * @property {number} index the 1-based line number in `transcript.jsonl`
 * @property {string} type `user` or `assistant`
 * @property {number} at epoch milliseconds
 * @property {any[]} blocks the message's content blocks
 * @property {any} raw the parsed line
 */

/**
 * Parse a transcript, skipping a line that is not JSON.
 * @param {string} text
 * @returns {TranscriptLine[]}
 */
export function parseTranscript(text) {
  /** @type {TranscriptLine[]} */
  const lines = [];
  text.split('\n').forEach((line, i) => {
    if (!line.trim()) return;
    try {
      const raw = JSON.parse(line);
      const content = raw?.message?.content;
      const blocks = typeof content === 'string' ? [{ type: 'text', text: content }] : Array.isArray(content) ? content : [];
      lines.push({ index: i + 1, type: String(raw.type ?? ''), at: ms(raw.timestamp), blocks, raw });
    } catch {
      /* a partial last line while the run was live */
    }
  });
  return lines;
}

/** @param {any} block @returns {string} a tool result's text */
function resultText(block) {
  const content = block?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((part) => (typeof part === 'string' ? part : (part?.text ?? ''))).join('\n');
  return '';
}

/**
 * @typedef {object} SetupEvent
 * @property {string} kind
 * @property {string} [step]
 * @property {string} [waiting]
 * @property {string} [sentence]
 * @property {number} at epoch milliseconds
 * @property {number} line the transcript line it was read on
 */

/**
 * Setup's events, read from the tool results in the transcript.
 * @param {TranscriptLine[]} lines
 * @returns {SetupEvent[]}
 */
export function setupEvents(lines) {
  /** @type {SetupEvent[]} */
  const events = [];
  // An agent that reads the same output file again repeats each event on a later line. The first
  // reading stands: a repeat would open a second row for a closed step and move a waiting event past
  // the relay that answered it.
  const seen = new Set();
  for (const entry of lines) {
    if (entry.type !== 'user') continue;
    for (const block of entry.blocks) {
      if (block?.type !== 'tool_result') continue;
      for (const text of resultText(block).split('\n')) {
        // The agent's Read tool prints a file with a line number and a tab before each line, which is how
        // the apply's events reach the transcript when the agent reads the background task's output file.
        const event = eventLine(text.replace(/^\s*\d+\t/, ''), entry.index);
        if (event && !seen.has(eventKey(event))) {
          seen.add(eventKey(event));
          events.push(event);
        }
      }
    }
  }
  return events;
}

/**
 * One setup event from a line of setup's output, or null for any other line.
 * @param {string} body
 * @param {number} line
 * @returns {SetupEvent | null}
 */
function eventLine(body, line) {
  if (!body.trim().startsWith('{')) return null;
  try {
    const event = JSON.parse(body);
    if (!event || typeof event.schemaVersion !== 'number' || !EVENT_KINDS.has(event.kind)) return null;
    return { kind: event.kind, step: event.step, waiting: event.waiting, sentence: event.sentence, at: ms(event.timestamp), line };
  } catch {
    return null;
  }
}

/** @param {SetupEvent} event @returns {string} what makes two readings of one event the same event */
function eventKey(event) {
  return `${event.kind}|${event.step}|${event.waiting}|${event.at}`;
}

/**
 * The shell command that prints every background command's output file in the clean room, run as the
 * room's user through `cleanroom shell`. An agent that runs setup in the background may read only its
 * last lines, so the transcript can lack the apply's events while the output file holds all of them.
 * `awk 1` ends every file's last line with a newline, so one file's last line never runs into the
 * next file's first event.
 */
export const TASK_OUTPUT_READ = 'find "${TMPDIR:-$HOME/tmp}" -path "*/tasks/*.output" -type f -exec awk 1 {} + 2>/dev/null; true';

/**
 * The events to time setup by: the transcript's events, plus any event only a background output file
 * holds, in time order. Only the timing reads these. An event from an output file carries line 0,
 * since no transcript line read it, so the relay check keeps reading the transcript's events.
 * @param {SetupEvent[]} transcriptEvents
 * @param {string} taskOutput the text of every background output file
 * @returns {SetupEvent[]}
 */
export function timingEvents(transcriptEvents, taskOutput) {
  const seen = new Set(transcriptEvents.map(eventKey));
  const extra = taskOutput.split('\n').flatMap((text) => {
    const event = eventLine(text, 0);
    if (!event || seen.has(eventKey(event))) return [];
    seen.add(eventKey(event));
    return [event];
  });
  if (extra.length === 0) return transcriptEvents;
  return [...transcriptEvents, ...extra].sort((a, b) => a.at - b.at);
}

/**
 * @typedef {object} StepRow
 * @property {string} step the setup step id, or the stand-in's page kind
 * @property {'tool' | 'owner' | 'provider-wait'} actor who the minutes belong to
 * @property {number} started epoch milliseconds
 * @property {number} ended epoch milliseconds
 * @property {number} minutes
 * @property {string} result `done`, `failed`, or `open`
 */

/**
 * One row per setup step, from its start to its done or failure event.
 * @param {SetupEvent[]} events
 * @returns {StepRow[]}
 */
export function stepRows(events) {
  /** @type {StepRow[]} */
  const rows = [];
  /** @type {Map<string, StepRow>} */
  const open = new Map();
  for (const event of events) {
    if (!event.step) continue;
    if (event.kind === 'step_started' && !open.has(event.step)) {
      const actor = PROVIDER_STEPS.includes(event.step) ? 'provider-wait' : OWNER_STEPS.includes(event.step) ? 'owner' : 'tool';
      /** @type {StepRow} */
      const row = { step: event.step, actor: /** @type {'tool' | 'owner' | 'provider-wait'} */ (actor), started: event.at, ended: event.at, minutes: 0, result: 'open' };
      open.set(event.step, row);
      rows.push(row);
    } else if ((event.kind === 'step_done' || event.kind === 'step_failed') && open.has(event.step)) {
      const row = /** @type {StepRow} */ (open.get(event.step));
      row.ended = event.at;
      row.minutes = minutesBetween(row.started, row.ended);
      row.result = event.kind === 'step_done' ? 'done' : 'failed';
      open.delete(event.step);
    }
  }
  return rows;
}

/** How soon the stand-in may clear an approval before a relay of its sentence was impossible. */
const RELAY_GRACE_MS = 15_000;

/**
 * The `waiting` sentences the agent never passed on: a later assistant text must hold the
 * sentence's opening words. A sentence whose approval was cleared within seconds is not counted:
 * the stand-in clicks faster than an agent reading a background task's output can pass it on.
 * @param {TranscriptLine[]} lines
 * @param {SetupEvent[]} events
 * @returns {{ sentence: string, waiting: string, line: number }[]}
 */
export function missedRelays(lines, events) {
  return events
    .filter((event) => event.kind === 'waiting' && event.sentence)
    .filter((event) => {
      const cleared = events.find((other) => other.kind === 'step_done' && other.step === event.waiting && other.at >= event.at);
      return !(cleared && cleared.at - event.at < RELAY_GRACE_MS);
    })
    .filter((event) => {
      const key = squash(/** @type {string} */ (event.sentence)).slice(0, RELAY_PREFIX);
      return !lines.some(
        (entry) =>
          entry.type === 'assistant' &&
          entry.index > event.line &&
          entry.blocks.some((block) => block?.type === 'text' && squash(String(block.text ?? '')).includes(key)),
      );
    })
    .map((event) => ({ sentence: /** @type {string} */ (event.sentence), waiting: String(event.waiting ?? ''), line: event.line }));
}

/**
 * Each permission prompt in the session log with its command. A redraw repeats a prompt, so a
 * command is listed once per consecutive run.
 * @param {string} log the `script` log of the pane
 * @returns {{ command: string }[]}
 */
export function permissionPrompts(log) {
  // eslint-disable-next-line no-control-regex
  const plain = log.replace(/\u001b\[[0-9;?]*[A-Za-z]/g, '').replace(/\r/g, '');
  const blocks = plain.split(/Do you want to (?:proceed|run)\?/).slice(0, -1);
  /** @type {{ command: string }[]} */
  const prompts = [];
  for (const block of blocks) {
    const at = block.lastIndexOf('Bash command');
    if (at === -1) continue;
    const command = block
      .slice(at + 'Bash command'.length)
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)[0];
    if (command && prompts.at(-1)?.command !== command) prompts.push({ command });
  }
  return prompts;
}

/**
 * Flailing notes, one per kind the design names, each with the transcript lines read. A note is a
 * cue for the conductor's judgment, never a verdict.
 * @param {TranscriptLine[]} lines
 * @param {{ command: string }[]} prompts
 * @returns {{ kind: string, note: string, lines: number[], source: string }[]}
 */
export function flailingNotes(lines, prompts) {
  /** @type {{ kind: string, note: string, lines: number[], source: string }[]} */
  const notes = [];
  /** @type {Map<string, { command: string, lines: number[] }>} */
  const uses = new Map();
  /** @type {Map<string, { target: string, lines: number[] }>} */
  const reads = new Map();
  /** @type {Map<string, number[]>} */
  const failedUse = new Map();
  for (const entry of lines) {
    for (const block of entry.blocks) {
      if (block?.type === 'tool_use') {
        if (block.name === 'Bash' && typeof block.input?.command === 'string') {
          /** @type {{ command: string, lines: number[] }} */
          const held = uses.get(block.id) ?? { command: block.input.command, lines: [] };
          held.lines.push(entry.index);
          uses.set(block.id, held);
        }
        const target = block.input?.file_path ?? block.input?.url;
        if ((block.name === 'Read' || block.name === 'WebFetch') && typeof target === 'string') {
          /** @type {{ target: string, lines: number[] }} */
          const held = reads.get(target) ?? { target, lines: [] };
          held.lines.push(entry.index);
          reads.set(target, held);
        }
      } else if (block?.type === 'tool_result' && block.is_error && uses.has(block.tool_use_id)) {
        const use = /** @type {{ command: string, lines: number[] }} */ (uses.get(block.tool_use_id));
        failedUse.set(use.command, [...(failedUse.get(use.command) ?? []), ...use.lines, entry.index]);
      }
    }
  }
  for (const [command, at] of failedUse) {
    if (at.length >= 6) notes.push({ kind: 'repeated-failing-command', note: `failed ${at.length / 2} times: ${command.slice(0, 120)}`, lines: at, source: 'transcript.jsonl' });
  }
  for (const { target, lines: at } of reads.values()) {
    if (at.length >= 3) notes.push({ kind: 'circling-docs', note: `read ${at.length} times: ${target.slice(0, 120)}`, lines: at, source: 'transcript.jsonl' });
  }
  const docQuestion = /\b(should i|do you want me|which (flag|command|option)|how do i|what (flag|command))\b/i;
  const ownerCard = /\b(site name|email|crawler|ai posture)\b/i;
  const asked = lines.filter(
    (entry) =>
      entry.type === 'assistant' &&
      !entry.blocks.some((block) => block?.type === 'tool_use') &&
      entry.blocks.some((block) => block?.type === 'text' && /\?\s*$/.test(String(block.text ?? '').trim()) && docQuestion.test(String(block.text)) && !ownerCard.test(String(block.text))),
  );
  if (asked.length > 0) notes.push({ kind: 'asked-owner-what-docs-should-answer', note: `${asked.length} question(s) to the owner a doc could have answered`, lines: asked.map((entry) => entry.index), source: 'transcript.jsonl' });
  if (prompts.length >= 3) notes.push({ kind: 'stalling-on-permissions', note: `${prompts.length} permission prompts`, lines: [], source: 'session.log' });
  return notes;
}

/**
 * Cost and turns of each assistant message window: before setup's first step, then each step.
 * @param {TranscriptLine[]} lines
 * @param {StepRow[]} rows
 * @param {(file: string) => Promise<number | null>} costOf dollars for a transcript file, or null when unreadable
 * @returns {Promise<{ step: string, turns: number, dollars: number | null }[]>}
 */
async function costByStep(lines, rows, costOf) {
  const windows = [{ step: 'agent', from: -Infinity, to: rows[0]?.started ?? Infinity }, ...rows.map((row) => ({ step: row.step, from: row.started, to: row.ended || Infinity }))];
  const dir = await mkdtemp(path.join(tmpdir(), 'gate-cost-'));
  try {
    /** @type {{ step: string, turns: number, dollars: number | null }[]} */
    const out = [];
    for (const [i, win] of windows.entries()) {
      const inside = lines.filter((entry) => entry.at >= win.from && entry.at < win.to);
      const ids = new Set(inside.filter((entry) => entry.type === 'assistant' && entry.raw?.message?.usage).map((entry) => entry.raw.message.id ?? `line-${entry.index}`));
      const file = path.join(dir, `${i}.jsonl`);
      await writeFile(file, inside.map((entry) => JSON.stringify(entry.raw)).join('\n'));
      out.push({ step: win.step, turns: ids.size, dollars: ids.size === 0 ? 0 : await costOf(file) });
    }
    return out;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/**
 * Versions installed by npx in the clean home: the launcher and the platform package.
 * @param {string} home
 * @returns {Promise<{ launcher?: string, platform?: string }>}
 */
async function npxVersions(home) {
  const root = path.join(home, '.npm', '_npx');
  /** @type {{ launcher?: string, platform?: string }} */
  const found = {};
  for (const hash of await readdir(root)) {
    const modules = path.join(root, hash, 'node_modules');
    const launcher = await readJson(path.join(modules, 'create-cairn-site', 'package.json'));
    if (launcher.ok) found.launcher = launcher.value.version;
    const scope = path.join(modules, '@glw907');
    for (const name of await readdir(scope).catch(() => /** @type {string[]} */ ([]))) {
      if (!name.startsWith('cairn-') || name === 'cairn-cms') continue;
      const platform = await readJson(path.join(scope, name, 'package.json'));
      if (platform.ok) found.platform = platform.value.version;
    }
  }
  return found;
}

/**
 * @param {string} text
 * @returns {number | null} the first dollar figure in the text
 */
function dollarsIn(text) {
  const found = /\$?\s*([0-9]+(?:\.[0-9]+)?)/.exec(text);
  return found ? Number(found[1]) : null;
}

/** @param {any} state @param {RegExp} key @returns {number | null} the first numeric value under a key matching `key` */
function numberUnder(state, key) {
  for (const [name, value] of Object.entries(state ?? {})) if (key.test(name) && typeof value === 'number') return value;
  return null;
}

/**
 * Whether a process's command line is the watcher of one run: `cleanroom _watch <name>`, matched on
 * its arguments so a shell command that merely mentions those words does not count.
 * @param {string} cmdline the process's `/proc/<pid>/cmdline`, arguments separated by NUL
 * @param {string} name the run id
 * @returns {boolean}
 */
export function isRunWatcher(cmdline, name) {
  const args = cmdline.split('\0');
  return args.some((arg, index) => arg === '_watch' && args[index + 1] === name);
}

/**
 * Whether the run's watcher process is still alive. The watcher records `exited` and then ends the
 * session by sending SIGTERM to every process of the room and only then removing its tmux sessions,
 * the watcher's included. The watcher is gone once those kills are done, and a read inside the
 * room that starts while it runs can be killed.
 * @param {string} name
 * @returns {Promise<boolean>}
 */
async function watcherRunning(name) {
  for (const entry of await readdir('/proc').catch(() => /** @type {string[]} */ ([]))) {
    if (!/^\d+$/.test(entry)) continue;
    const cmdline = await readFile(path.join('/proc', entry, 'cmdline'), 'utf8').catch(() => '');
    if (isRunWatcher(cmdline, name)) return true;
  }
  return false;
}

/**
 * Wait for the run's watcher to finish, up to the limit. A watcher that is still alive at the limit
 * is a failed read, because the room may be mid-kill.
 * @param {string} name
 * @param {(name: string) => Promise<boolean>} alive
 * @param {number} limitMs
 * @param {number} pollMs
 * @returns {Promise<{ ok: boolean, evidence: string }>}
 */
async function settle(name, alive, limitMs, pollMs) {
  const deadline = Date.now() + limitMs;
  while (await alive(name)) {
    if (Date.now() >= deadline) return { ok: false, evidence: `the run's watcher was still running after ${limitMs / 1000} s` };
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
  return { ok: true, evidence: "the run's watcher had finished" };
}

/**
 * Grade a run.
 * @param {{ runDir: string, deps: GradeDeps, end?: 'stall' | 'budget', reason?: string }} input `reason` is why the executor ended a stall
 * @returns {Promise<any>} the record, as written to `run-record.json`
 */
export async function grade({ runDir, deps, end, reason }) {
  const { cleanroom, env } = deps;
  const githubFetch = deps.githubFetch ?? fetch;
  const siteFetch = deps.siteFetch ?? gateFetch;
  const authority = deps.authority ?? ((/** @type {string} */ host) => authoritativeAddress(host));
  const findMail = deps.findMail ?? findSignInMessage;
  const provingDir = deps.provingDir ?? path.join(homedir(), '.local', 'state', 'cairn-gate', 'proving');
  const watcherAlive = deps.watcherAlive ?? watcherRunning;
  const home = path.join(path.dirname(runDir), 'home');
  const name = path.basename(path.dirname(runDir));
  /** @type {{ name: string, ok: boolean, evidence: string }[]} */
  const reads = [];
  /** @param {string} what @param {boolean} ok @param {string} evidence */
  const note = (what, ok, evidence) => reads.push({ name: what, ok, evidence });

  // `run-gate.sh scripted` also makes a gate-state directory that holds only `shots/`. A directory
  // with none of a run's files is refused outright, because grading it would read as a meaningless fail.
  if (!['harness.json', 'transcript.jsonl', 'stand-in.jsonl'].some((file) => existsSync(path.join(runDir, file)))) {
    throw new Error(
      `${runDir} is not a run directory: it holds no harness.json, transcript.jsonl, or stand-in.jsonl.` +
        (existsSync(path.join(runDir, 'shots')) ? " It looks like a scripted leg's shot directory; grade the run dir that `run-gate.sh scripted` printed." : ''),
    );
  }
  // The room is read only once its watcher has finished ending it. A run the executor ends by hand may
  // still have a live room, so that grade reads it as it stands.
  if (!end) {
    const settled = await settle(name, watcherAlive, deps.settleMs ?? SETTLE_MS, deps.pollMs ?? SETTLE_POLL_MS);
    note('room settled', settled.ok, settled.evidence);
  }
  const harnessRead = await readJson(path.join(runDir, 'harness.json'));
  const harness = harnessRead.ok ? harnessRead.value : {};
  note('harness.json', harnessRead.ok, harnessRead.ok ? 'read' : harnessRead.reason);
  const id = String(harness.id ?? name);
  const siteName = String(harness.siteName ?? `Cairn gate ${id}`);
  const owner = String(env.GATE_OWNER_EMAIL || DEFAULT_OWNER_EMAIL);

  const transcriptText = await readFile(path.join(runDir, 'transcript.jsonl'), 'utf8').catch(() => null);
  note('transcript.jsonl', transcriptText !== null, transcriptText === null ? 'could not be read' : 'read');
  const lines = parseTranscript(transcriptText ?? '');
  const events = setupEvents(lines);
  const standInText = await readFile(path.join(runDir, 'stand-in.jsonl'), 'utf8').catch(() => null);
  note('stand-in.jsonl', standInText !== null, standInText === null ? 'could not be read' : 'read');
  /** @type {{ kind: string, action: string, at: number }[]} */
  const standIn = (standInText ?? '')
    .split('\n')
    .filter(Boolean)
    .flatMap((line) => {
      try {
        const parsed = JSON.parse(line);
        return [{ kind: String(parsed.kind), action: String(parsed.action), at: ms(parsed.at) }];
      } catch {
        return [];
      }
    });
  const stateRead = await readJson(path.join(runDir, 'state.json'));
  note('state.json', stateRead.ok, stateRead.ok ? 'read' : stateRead.reason);
  const state = stateRead.ok ? stateRead.value : {};
  const sessionLog = await readFile(path.join(runDir, 'session.log'), 'utf8').catch(() => '');

  // The registry record and what `cairn new status` says of it. The record is read as the clean room's
  // user: its directory is closed to everyone else, so a read from here would find nothing.
  const recordRead = await cleanroom(['shell', name, '-c', REGISTRY_READ]);
  /** @type {{ ok: true, value: any } | { ok: false, reason: string }} */
  let registryRead = { ok: false, reason: recordRead.code === 0 ? 'no registry record under .config/cairn/sites' : `exited ${recordRead.code}` };
  if (recordRead.code === 0 && recordRead.stdout.trim() !== '') {
    try {
      registryRead = { ok: true, value: JSON.parse(recordRead.stdout) };
    } catch {
      registryRead = { ok: false, reason: 'the registry record is not JSON' };
    }
  }
  note('registry record', registryRead.ok, registryRead.ok ? 'read' : registryRead.reason);
  const registry = registryRead.ok ? registryRead.value : {};
  // The gate tag, as a naive agent's shell carries it: without it npx resolves `latest`, which no
  // launcher serves a version of, and the read exits 1 from npm before `cairn new status` runs.
  const status = await cleanroom(['shell', name, '-c', 'npm_config_tag=gate npx --yes create-cairn-site status']);
  note('cairn new status', status.code === 0, status.code === 0 ? status.stdout.split('\n')[0].slice(0, 120) : `exited ${status.code}`);
  const taskRead = await cleanroom(['shell', name, '-c', TASK_OUTPUT_READ]);
  note('background output', taskRead.code === 0, taskRead.code === 0 ? 'read' : `exited ${taskRead.code}`);
  const timed = timingEvents(events, taskRead.code === 0 ? taskRead.stdout : '');

  // Installed versions, against the candidate the run recorded.
  const installed = await npxVersions(home).catch(() => /** @type {{ launcher?: string, platform?: string }} */ ({}));
  note('npx cache', Boolean(installed.launcher && installed.platform), `launcher ${installed.launcher ?? 'missing'}, platform ${installed.platform ?? 'missing'}`);
  let repoOwner = registry?.github?.repo?.owner;
  let repoName = registry?.github?.repo?.repo;
  const token = env.GITHUB_TEST_TOKEN;
  // A record that names no repository leaves it to the run: the site name's slug, on the test account
  // the token belongs to.
  if (!repoName) repoName = siteName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!repoOwner && token) {
    try {
      const me = await githubFetch('https://api.github.com/user', { headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'user-agent': 'cairn-gate-grade' } });
      if (me.status === 200) repoOwner = /** @type {any} */ (await me.json()).login;
    } catch {
      // The read of the repository below reports the miss.
    }
  }
  /** @param {string} route @returns {Promise<any>} */
  const github = async (route) => {
    if (!token || !repoOwner || !repoName) throw new Error('no token or repository to read');
    const response = await githubFetch(`https://api.github.com/repos/${repoOwner}/${repoName}${route}`, { headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'user-agent': 'cairn-gate-grade' } });
    if (response.status !== 200) throw new Error(`GitHub answered ${response.status} for ${route.split('?')[0]}`);
    return response.json();
  };
  /** @type {string | undefined} */
  let engine;
  try {
    const file = await github('/contents/package.json');
    const pkg = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));
    engine = String(pkg.dependencies?.['@glw907/cairn-cms'] ?? pkg.devDependencies?.['@glw907/cairn-cms'] ?? '').replace(/^[\^~]/, '');
    note('repository package.json', Boolean(engine), engine ? `engine pin ${engine}` : 'no engine dependency');
  } catch (error) {
    note('repository package.json', false, /** @type {Error} */ (error).message);
  }
  const candidate = harness.candidate ?? {};
  const mismatches = [
    ...(candidate.engine && engine !== candidate.engine ? [`engine ${engine ?? 'unread'} is not ${candidate.engine}`] : []),
    // A local build runs a binary, not an npx-installed launcher, so only the engine pin is compared.
    ...(candidate.tool && !harness.local && installed.launcher !== candidate.tool ? [`launcher ${installed.launcher ?? 'unread'} is not ${candidate.tool}`] : []),
    ...(candidate.tool && !harness.local && installed.platform !== candidate.tool ? [`platform ${installed.platform ?? 'unread'} is not ${candidate.tool}`] : []),
  ];
  const versionsOk = Boolean(candidate.engine && candidate.tool) && mismatches.length === 0;

  // The first Actions deploy's phases.
  /** @type {Record<string, number | null>} */
  const phases = { install: null, build: null, deploy: null };
  try {
    const list = await github('/actions/runs?per_page=100&event=push');
    const first = [...(list.workflow_runs ?? [])].filter((run) => run.name === 'deploy').sort((a, b) => ms(a.created_at) - ms(b.created_at))[0];
    if (!first) throw new Error('the repository has no deploy run');
    const jobs = await github(`/actions/runs/${first.id}/jobs`);
    for (const step of (jobs.jobs ?? []).flatMap((/** @type {any} */ job) => job.steps ?? [])) {
      for (const [phase, pattern] of Object.entries(DEPLOY_PHASES)) {
        if (pattern.test(step.name) && step.started_at && step.completed_at) phases[phase] = (phases[phase] ?? 0) + minutesBetween(ms(step.started_at), ms(step.completed_at));
      }
    }
    note('first deploy jobs', true, `run ${first.id}`);
  } catch (error) {
    note('first deploy jobs', false, /** @type {Error} */ (error).message);
  }

  // End-state checks.
  /** @type {Check} */
  let live;
  try {
    // A resolver asked for a host its zone does not have yet keeps that answer for up to 30 minutes, and
    // the next run's site then looks dead to this computer. A run that failed before its site existed
    // must not ask for it, so the zone's nameserver is asked first.
    // Only a nameserver's own answer of no address skips the read. When none could be asked (port 53
    // blocked, resolvers down) the zone is unknown, so the ordinary read goes ahead and says so.
    const zoneAnswer = await authority(new URL(LIVE_ORIGIN).hostname);
    if (zoneAnswer === null) {
      live = { ok: false, evidence: `the zone has no address for ${new URL(LIVE_ORIGIN).hostname}, so the live read was skipped` };
    } else {
      const [home1, admin] = [await siteFetch(`${LIVE_ORIGIN}/`), await siteFetch(`${LIVE_ORIGIN}/admin`)];
      const unasked = zoneAnswer === undefined ? '; no nameserver could be asked, so the zone was not checked first' : '';
      live = { ok: home1.status === 200 && admin.status === 200, evidence: `GET / answered ${home1.status}, GET /admin answered ${admin.status}${unasked}` };
    }
  } catch (error) {
    live = { ok: false, evidence: `the live read failed: ${/** @type {Error} */ (error).message}`.slice(0, 160) };
  }
  const signedInEntry = standIn.find((entry) => entry.kind === 'admin' && entry.action === 'signed-in');
  /** @type {Check} */
  const signedIn = signedInEntry ? { ok: true, evidence: `the stand-in reached the admin at ${new Date(signedInEntry.at).toISOString()}` } : { ok: false, evidence: 'stand-in.jsonl holds no admin signed-in line' };
  const goalAt = lines.find((entry) => entry.type === 'user' && entry.blocks.some((block) => block?.type === 'text'))?.at ?? NaN;
  /** @type {Check} */
  let mail;
  try {
    const found = await findMail({
      login: owner,
      password: env.STALWART_PASSWORD_CAIRN_GATE ?? '',
      siteName,
      owner,
      // A scripted run has no transcript, so its mail is read from the run's start. The wait is
      // real: setup sends the sign-in email as its last step, and a read of the mailbox the instant
      // the leg ends can come before it lands.
      sinceMs: Number.isNaN(goalAt) ? (Number.isNaN(ms(String(harness.begin ?? ''))) ? 0 : ms(String(harness.begin))) : goalAt,
      expectedOrigin: LIVE_ORIGIN,
      budgetMs: MAIL_WAIT_MS,
      intervalMs: 3000,
    });
    mail = found.found ? { ok: true, evidence: `a "Sign in to ${siteName}" message from ${found.from} reached the mailbox` } : { ok: false, evidence: `no sign-in mail: ${found.reason}`.slice(0, 200) };
  } catch (error) {
    mail = { ok: false, evidence: `mailbox error: ${/** @type {Error} */ (error).message}`.slice(0, 200) };
  }
  /** @type {Check} */
  const versions = candidate.engine && candidate.tool ? { ok: versionsOk, evidence: versionsOk ? `engine ${engine}, launcher ${installed.launcher}, platform ${installed.platform}` : mismatches.join('; ') } : { ok: false, evidence: 'harness.json records no candidate to compare with' };

  // Timing: setup's events, else the stand-in's lines, else state.json.
  const rows = stepRows(timed);
  /** @type {'setup events' | 'stand-in.jsonl' | 'state.json' | 'none'} */
  let timingSource = 'none';
  if (rows.length > 0) timingSource = 'setup events';
  else if (standIn.length > 0) timingSource = 'stand-in.jsonl';
  else if (numberUnder(state, /elapsed/i) !== null) timingSource = 'state.json';
  const signedAt = signedInEntry?.at ?? NaN;
  const total = Number.isNaN(goalAt) || Number.isNaN(signedAt) ? numberUnder(state, /elapsed/i) : minutesBetween(goalAt, signedAt);
  /** @type {StepRow[]} */
  let table = rows;
  if (timingSource === 'stand-in.jsonl') {
    const kinds = [...new Set(standIn.map((entry) => entry.kind))];
    table = kinds.map((kind) => {
      const own = standIn.filter((entry) => entry.kind === kind);
      return { step: kind, actor: /** @type {const} */ ('owner'), started: own[0].at, ended: own.at(-1)?.at ?? own[0].at, minutes: minutesBetween(own[0].at, own.at(-1)?.at ?? own[0].at), result: 'done' };
    });
  }
  const sum = (/** @type {string} */ actor) => Math.round(table.filter((row) => row.actor === actor).reduce((acc, row) => acc + row.minutes, 0) * 10) / 10;
  const providerWait = timingSource === 'setup events' ? sum('provider-wait') : null;
  const agentMinutes = timingSource === 'setup events' && total !== null ? Math.max(0, Math.round((total - (providerWait ?? 0) - sum('owner') - sum('tool')) * 10) / 10) : null;
  const domains = rows.find((row) => row.step === 'domains' && row.result === 'done');
  const httpsMinutes = domains ? domains.minutes : null;
  /** @type {string[]} */
  const gaps = [];
  if (timingSource === 'none') gaps.push('no timing source: no setup events, no stand-in lines, and no elapsed time in state.json');
  for (const [phase, value] of Object.entries(phases)) if (value === null) gaps.push(`the first deploy's ${phase} phase is missing`);
  if (httpsMinutes === null) gaps.push('the HTTPS wait is missing: no finished domains step in setup events');
  if (total === null) gaps.push('the goal-to-signed-in time cannot be computed');
  const timing = { ok: gaps.length === 0, evidence: gaps.length === 0 ? `source ${timingSource}` : gaps.join('; ') };
  const slowest = [...table].sort((a, b) => b.minutes - a.minutes).slice(0, 3).map((row) => ({ step: row.step, minutes: row.minutes }));

  // The agent's side of the transcript.
  const relays = missedRelays(lines, events);
  const prompts = permissionPrompts(sessionLog);
  const flailing = flailingNotes(lines, prompts);
  const costs = await costByStep(lines, rows, async (file) => {
    const result = await cleanroom(['cost', file]);
    return result.code === 0 ? dollarsIn(result.stdout) : null;
  });

  // Harness overhead: from the harness's own start to the goal prompt.
  const beginAt = ms(String(harness.begin ?? ''));
  const overhead = Number.isNaN(beginAt) || Number.isNaN(goalAt) ? { minutes: null, over: false, note: 'harness.json records no start' } : { minutes: minutesBetween(beginAt, goalAt), over: minutesBetween(beginAt, goalAt) > OVERHEAD_MINUTES, note: '' };

  // The step reached, and each step against the last record.
  const stepReached = registry?.step ?? rows.filter((row) => row.result !== 'open').at(-1)?.step ?? null;
  const previousFiles = (await readdir(provingDir).catch(() => /** @type {string[]} */ ([]))).filter((file) => file.endsWith('.json') && file !== `${id}.json`).sort();
  const previous = previousFiles.length > 0 ? await readJson(path.join(provingDir, previousFiles.at(-1) ?? '')) : null;
  const before = new Map((previous?.ok ? (previous.value.steps ?? []) : []).map((/** @type {any} */ row) => [row.step, row.minutes]));
  const changes = previous?.ok
    ? table.map((row) => ({ step: row.step, minutes: row.minutes, previous: before.get(row.step) ?? null, change: before.has(row.step) ? Math.round((row.minutes - /** @type {number} */ (before.get(row.step))) * 10) / 10 : null }))
    : [];

  const stateName = String(state.state ?? '');
  const failedReads = reads.filter((read) => !read.ok);
  const endState = { live, ownerSignedIn: signedIn, signInMail: mail, versionsMatchCandidate: versions };
  const standInFailed = (await readdir(runDir).catch(() => /** @type {string[]} */ ([]))).some((file) => file.endsWith('.controls.txt'));
  /** @type {{ result: 'pass' | 'fail', reason?: string, detail?: string }} */
  let outcome = { result: 'pass' };
  // A scripted run has no agent transcript, session state, or setup events to time, so it is judged on
  // the end state and on reaching the done screen. The leg's log says why it stopped, and that cause
  // comes before a guess from what was never installed.
  const scriptedText = harness.leg === 'scripted' ? await readFile(path.join(runDir, 'scripted.jsonl'), 'utf8').catch(() => '') : null;
  const scriptedFailure = (scriptedText ?? '').split('\n').flatMap((line) => {
    try {
      const event = JSON.parse(line);
      return event?.action === 'failed' ? [event] : [];
    } catch {
      return [];
    }
  }).at(-1);
  if (stateName === 'stopped:cost') outcome = { result: 'fail', reason: 'cost', detail: 'the cost cap stopped the session' };
  else if (stateName === 'stopped:time') outcome = { result: 'fail', reason: 'time', detail: 'the time cap stopped the session' };
  else if (end === 'stall') {
    // The reason is operator text that lands in a record file: control characters become spaces and
    // the length is capped.
    const why = (reason ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200).trim();
    outcome = { result: 'fail', reason: 'stall', detail: `the executor ended the run as a stall${why ? `: ${why}` : '; no reason was recorded'}` };
  }
  else if (end === 'budget') outcome = { result: 'fail', reason: 'budget', detail: 'the loop budget ended the run' };
  else if (scriptedFailure) outcome = { result: 'fail', reason: 'other', detail: `the scripted leg failed at "${scriptedFailure.screen}": ${scriptedFailure.reason}` };
  else if (!versions.ok && candidate.engine && candidate.tool && mismatches.length > 0) outcome = { result: 'fail', reason: 'other', detail: `wrong candidate: ${mismatches.join('; ')}` };
  else if (standInFailed && !signedIn.ok) outcome = { result: 'fail', reason: 'page', detail: 'the stand-in failed a page; see its controls file' };
  else if (stateName.startsWith('stopped:')) outcome = { result: 'fail', reason: 'other', detail: `the watcher ended the run as ${stateName}` };
  else {
    const failedChecks = Object.entries(endState).filter(([, check]) => !check.ok).map(([key]) => key);
    const detail = scriptedText !== null
      ? [...failedChecks.map((key) => `end-state check ${key} failed`), ...(/"screen":"done"/.test(scriptedText) ? [] : ['the scripted leg never reached the done screen'])]
      : [...failedChecks.map((key) => `end-state check ${key} failed`), ...(timing.ok ? [] : [`timing check failed: ${timing.evidence}`]), ...failedReads.map((read) => `read ${read.name} failed: ${read.evidence}`)];
    if (detail.length > 0) outcome = { result: 'fail', reason: 'other', detail: detail.join('; ') };
  }

  const record = {
    id,
    leg: String(harness.leg ?? 'naive'),
    commit: String(harness.commit ?? ''),
    // A local build proves a fix on a branch; it is never the published candidate's row.
    local: harness.local === true,
    installed: { engine: engine ?? null, tool: installed.platform ?? null, launcher: installed.launcher ?? null },
    candidate: { engine: candidate.engine ?? null, tool: candidate.tool ?? null },
    start: Number.isNaN(beginAt) ? null : new Date(beginAt).toISOString(),
    end: standIn.at(-1) ? new Date(standIn.at(-1)?.at ?? 0).toISOString() : null,
    outcome,
    endState,
    timing: { ...timing, source: timingSource },
    minutesToSignedIn: { minutes: total, overTen: total !== null && total > PASS_MINUTES, slowest },
    steps: table.map((row) => ({ step: row.step, actor: row.actor, minutes: row.minutes, result: row.result })),
    split: { agentMinutes, providerWaitMinutes: providerWait, ownerMinutes: timingSource === 'setup events' ? sum('owner') : null, toolMinutes: timingSource === 'setup events' ? sum('tool') : null },
    firstDeploy: { install: phases.install, build: phases.build, deploy: phases.deploy },
    httpsWaitMinutes: httpsMinutes,
    stepReached,
    cost: { dollars: Math.max(numberUnder(state, /statusline.*cost/i) ?? 0, numberUnder(state, /transcript.*cost/i) ?? 0), byStep: costs },
    permissionPrompts: prompts,
    missedRelays: relays,
    flailing,
    overhead,
    changes,
    reads,
  };
  const markdown = renderMarkdown(record);
  const jsonFile = path.join(runDir, 'run-record.json');
  const mdFile = path.join(runDir, 'run-record.md');
  await writeFile(jsonFile, `${JSON.stringify(record, null, 2)}\n`, { mode: 0o600 });
  await writeFile(mdFile, markdown, { mode: 0o600 });

  // The scan: a handed-in value in either file fails the record, which is then rewritten without it.
  /** @type {any} */
  let written = record;
  try {
    const scan = await cleanroom(['scan', name, jsonFile, mdFile]);
    if (scan.code !== 0) {
      written = {
        id,
        leg: record.leg,
        commit: record.commit,
        outcome: { result: 'fail', reason: 'other', detail: `the value scan matched (exit ${scan.code})` },
        scan: { ok: false, evidence: `scan exit ${scan.code}` },
      };
      await writeFile(jsonFile, `${JSON.stringify(written, null, 2)}\n`, { mode: 0o600 });
      await writeFile(mdFile, renderMarkdown(written), { mode: 0o600 });
    } else {
      await mkdir(provingDir, { recursive: true, mode: 0o700 });
      await copyFile(jsonFile, path.join(provingDir, `${id}.json`));
    }
  } finally {
    // The clean room's user owns the keyrings, and the caller cannot remove them: report that and
    // keep the record, which `cleanroom init <name> --fresh --discard` clears with the home.
    const keyrings = path.join(home, '.local', 'share', 'keyrings');
    await rm(keyrings, { recursive: true, force: true }).catch((error) => {
      if (error?.code !== 'EACCES' && error?.code !== 'EPERM') throw error;
      console.error(`grade: left ${keyrings} in place (${error.code}); the clean room's user owns it`);
    });
  }
  return written;
}

/**
 * The record as a page the conductor reads.
 * @param {any} record
 * @returns {string}
 */
export function renderMarkdown(record) {
  const out = [`# Run ${record.id} (${record.leg}${record.local ? ', local build' : ''})`, ''];
  const outcome = record.outcome;
  out.push(`Outcome: ${outcome.result}${outcome.reason ? `, ${outcome.reason}` : ''}${outcome.detail ? ` (${outcome.detail})` : ''}`, '');
  if (!record.endState) return `${out.join('\n')}\n`;
  out.push('## End state', '');
  for (const [key, check] of Object.entries(/** @type {Record<string, Check>} */ (record.endState))) out.push(`- ${check.ok ? 'ok' : 'FAIL'} ${key}: ${check.evidence}`);
  out.push('', '## Time', '');
  out.push(`- goal prompt to signed in: ${record.minutesToSignedIn.minutes ?? 'unknown'} minutes${record.minutesToSignedIn.overTen ? ' (OVER 10)' : ''}`);
  if (record.minutesToSignedIn.overTen) for (const row of record.minutesToSignedIn.slowest) out.push(`  - slowest: ${row.step} ${row.minutes} minutes`);
  out.push(`- timing source: ${record.timing.source}; ${record.timing.ok ? 'complete' : `GAP: ${record.timing.evidence}`}`);
  out.push(`- agent ${record.split.agentMinutes ?? 'n/a'}, provider wait ${record.split.providerWaitMinutes ?? 'n/a'}, owner ${record.split.ownerMinutes ?? 'n/a'}, setup tool ${record.split.toolMinutes ?? 'n/a'} minutes`);
  out.push(`- first deploy: install ${record.firstDeploy.install ?? 'missing'}, build ${record.firstDeploy.build ?? 'missing'}, deploy ${record.firstDeploy.deploy ?? 'missing'} minutes`);
  out.push(`- HTTPS wait: ${record.httpsWaitMinutes ?? 'missing'} minutes`);
  out.push(`- harness overhead: ${record.overhead.minutes ?? 'unknown'} minutes${record.overhead.over ? ' (OVER 5)' : ''}`, '', '## Steps', '', '| Step | Actor | Minutes | Result | Cost | Turns | Change |', '| --- | --- | --- | --- | --- | --- | --- |');
  /** @type {Map<string, any>} */
  const costs = new Map(record.cost.byStep.map((/** @type {any} */ row) => [row.step, row]));
  /** @type {Map<string, any>} */
  const changes = new Map(record.changes.map((/** @type {any} */ row) => [row.step, row]));
  for (const row of record.steps) {
    const cost = costs.get(row.step);
    const change = changes.get(row.step);
    out.push(`| ${row.step} | ${row.actor} | ${row.minutes} | ${row.result} | ${cost?.dollars ?? ''} | ${cost?.turns ?? ''} | ${change?.change ?? ''} |`);
  }
  out.push('', `Step reached: ${record.stepReached ?? 'unknown'}. Cost: $${record.cost.dollars}.`, '', '## Friction', '');
  for (const prompt of record.permissionPrompts) out.push(`- permission prompt: ${prompt.command}`);
  for (const relay of record.missedRelays) out.push(`- missed relay (${relay.waiting}): ${relay.sentence}`);
  for (const flail of record.flailing) out.push(`- flailing, ${flail.kind}: ${flail.note} (${flail.source} lines ${flail.lines.join(', ') || 'n/a'})`);
  if (record.permissionPrompts.length + record.missedRelays.length + record.flailing.length === 0) out.push('- none recorded');
  const failed = record.reads.filter((/** @type {any} */ read) => !read.ok);
  if (failed.length > 0) out.push('', '## Failed reads', '', ...failed.map((/** @type {any} */ read) => `- ${read.name}: ${read.evidence}`));
  return `${out.join('\n')}\n`;
}

/**
 * The real `cleanroom` runner.
 * @param {string[]} args
 * @returns {Promise<CmdResult>}
 */
async function cleanroomDefault(args) {
  try {
    const { stdout } = await execFileAsync('cleanroom', args, { timeout: 120_000, maxBuffer: 16 * 1024 * 1024 });
    return { code: 0, stdout };
  } catch (error) {
    const failure = /** @type {{ code?: number, stdout?: string }} */ (error);
    return { code: typeof failure.code === 'number' ? failure.code : 1, stdout: failure.stdout ?? '' };
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const runDir = process.argv[2];
  const endAt = process.argv.indexOf('--end');
  const end = endAt === -1 ? undefined : process.argv[endAt + 1];
  const reasonAt = process.argv.indexOf('--reason');
  const reason = reasonAt === -1 ? undefined : process.argv[reasonAt + 1];
  if (!runDir || (endAt !== -1 && end !== 'stall' && end !== 'budget') || (reasonAt !== -1 && reason === undefined)) {
    console.error('Usage: node scripts/gate/grade.mjs <run dir> [--end stall|budget [--reason "<text>"]]');
    process.exitCode = 2;
  } else {
    const record = await grade({ runDir: path.resolve(runDir), end: /** @type {'stall' | 'budget' | undefined} */ (end), reason, deps: { cleanroom: cleanroomDefault, env: process.env } }).catch((/** @type {Error} */ error) => {
      console.error(error.message);
      process.exit(2);
    });
    console.log(`Graded ${record.id}: ${record.outcome.result}${record.outcome.reason ? `, ${record.outcome.reason}` : ''}. Record: ${path.join(runDir, 'run-record.md')}`);
    process.exitCode = record.outcome.result === 'pass' ? 0 : 1;
  }
}
