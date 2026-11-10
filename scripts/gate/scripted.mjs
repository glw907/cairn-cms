// The scripted human leg: a script plays the owner in the interactive `cairn new`, so a release is
// proved on the path a person meets. It starts a clean-room shell in tmux, types `npm create
// cairn-site` (or runs a local `cairn` build) for a subdomain,
// answers each screen the setup tool paints, and starts the stand-in for the browser
// half. It types an answer only when the pane shows that answer's screen, fails on a screen it
// does not know, and fails at 20 minutes naming the step it reached. Run it through run-gate.sh;
// it never reads a secret store, only the environment it is handed.
import { spawn, execFile } from 'node:child_process';
import { appendFile, mkdir, open } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const execFileAsync = promisify(execFile);

/** The launcher the owner types, before the address flags. */
export const COMMAND = 'npm create cairn-site';
/**
 * The address the leg sets up: a subdomain, never the bare domain. A record on the bare address or
 * `www` is a standing stop for Geoff, and the zone's apex holds the mail records.
 */
export const HOST = 'gate.carin-test.org';
export const ZONE = 'carin-test.org';

/**
 * The line the owner types. A local build (`GATE_CAIRN_BIN`, set by `run-gate.sh scripted
 * --cairn-bin`) replaces the registry launcher with that `cairn` binary, so a fix is proved on the
 * branch before it publishes.
 * @param {Record<string, string | undefined>} env `GATE_CAIRN_BIN`
 * @returns {string}
 */
export function commandFor(env) {
  const flags = `--host ${HOST} --zone ${ZONE}`;
  return env.GATE_CAIRN_BIN ? `${env.GATE_CAIRN_BIN} new ${flags}` : `${COMMAND} -- ${flags}`;
}
/** How long the whole leg may take. */
export const LIMIT_MS = 20 * 60 * 1000;
/** The gap between looks at the pane. */
const POLL_MS = 500;
/** How long an unrecognised pane may stay unchanged before it is called an unknown screen. */
const UNKNOWN_MS = 15_000;
const PASTE_ON = '\x1b[200~';
const PASTE_OFF = '\x1b[201~';
const DEFAULT_OWNER = 'cairn-gate@probe.907.life';

/**
 * @typedef {{ type: string } | { key: string } | { paste: string }} Op
 * @typedef {object} Screen
 * @property {string} name the screen's name, written to `scripted.jsonl` and named in a failure
 * @property {(pane: string, last: string, command: string) => boolean} test whether the pane shows this screen
 * @property {((answers: { name: string, email: string, command: string }) => Op[]) | null} answer the keys it takes, or null
 *  when the screen only waits on the tool
 * @property {'fail' | 'done'} [end] a screen that ends the leg
 */

const enter = [{ key: 'Enter' }];

/**
 * Every screen the interactive `cairn new` paints, most advanced first so a receipt of an
 * earlier answer never shadows the screen being asked. The texts come from
 * `tool/internal/ui/newview/catalogue.go`; a screen's description, which shows only while its form
 * is active, tells it from the receipt that outlives it.
 * @type {Screen[]}
 */
export const SCREENS = [
  { name: 'done', test: (p) => / is live at /.test(p), answer: null, end: 'done' },
  {
    name: 'stopped',
    test: (p) => /Setup can't continue|Setup needs a domain on Cloudflare|The first deploy failed|Setup can't run over SSH|Setup stopped|This window is too small/.test(p),
    answer: null,
    end: 'fail',
  },
  { name: 'watch', test: (p) => /^\s*Setting up /m.test(p), answer: null },
  { name: 'browser-wait', test: (p) => /Approve each request in the setup tab/.test(p), answer: null },
  { name: 'browser-open', test: (p) => /Approve setup in your browser/.test(p) && /open your browser/.test(p), answer: () => enter },
  { name: 'summary', test: (p) => /Review the settings for /.test(p), answer: () => enter },
  { name: 'email', test: (p) => /Setup can't read your email from a Cloudflare token/.test(p), answer: ({ email }) => [{ paste: email }, ...enter] },
  { name: 'crawlers', test: (p) => /Choose whether AI companies/.test(p), answer: () => enter },
  { name: 'name', test: (p) => /Shown at the top of every page/.test(p), answer: ({ name }) => [{ type: name }, ...enter] },
  { name: 'theme', test: (p) => /How your site looks to readers/.test(p), answer: () => enter },
  { name: 'account', test: (p) => /Choose an account/.test(p), answer: () => enter },
  { name: 'domain', test: (p) => /Choose a domain/.test(p), answer: () => enter },
  { name: 'resume', test: (p) => /Resume setup/.test(p), answer: () => enter },
  { name: 'welcome', test: (p) => /Set up a cairn site/.test(p), answer: () => enter },
  // npm's own confirmation before it runs a package it has not cached.
  { name: 'npx', test: (p) => /Ok to proceed\?/.test(p), answer: () => [{ type: 'y' }, ...enter] },
  // The typed command may wrap across lines and the inline TUI leaves it above every later screen,
  // so it is the starting screen only while it is the end of the pane, whitespace aside.
  { name: 'starting', test: (p, last, command) => squash(p).endsWith(squash(command)) || /^npm (warn|notice) /.test(last), answer: null },
  { name: 'shell', test: (_p, last) => /[$#%]$/.test(last), answer: ({ command }) => [{ type: command }, ...enter] },
];

/**
 * Names the screen a pane shows.
 * @param {string} pane the captured pane text
 * @param {string} [command] the line the owner typed, which the starting screen ends with
 * @returns {Screen | null} the screen, or null when the pane matches none
 */
export function identify(pane, command = commandFor({})) {
  const lines = pane.split('\n').map((l) => l.trimEnd()).filter((l) => l.trim() !== '');
  const last = lines.at(-1) ?? '';
  return SCREENS.find((s) => s.test(pane, last, command)) ?? null;
}

/** The text with all whitespace removed, so a command the terminal wrapped still matches itself. */
const squash = (/** @type {string} */ text) => text.replace(/\s+/g, '');

/** A failure that names the step the leg reached. */
export class ScriptedError extends Error {
  /**
   * @param {string} message what went wrong
   * @param {string} step the last screen the leg saw, or `start`
   */
  constructor(message, step) {
    super(message);
    this.name = 'ScriptedError';
    this.step = step;
  }
}

/**
 * The first line of a pane that has text.
 * @param {string} pane the captured pane text
 */
function title(pane) {
  return pane.split('\n').map((l) => l.trim()).find((l) => l !== '') ?? '';
}

/**
 * @typedef {object} Deps
 * @property {(args: string[]) => Promise<string>} tmux runs tmux with the leg's arguments and returns stdout
 * @property {(args: string[], env: Record<string, string | undefined>) => { exited: Promise<number> }} startShell
 *  starts `cleanroom shell`
 * @property {() => { kill(): void }} startStandIn starts the stand-in for the browser half
 * @property {(event: Record<string, unknown>) => Promise<void> | void} record writes one `scripted.jsonl` line
 * @property {(ms: number) => Promise<void>} sleep the wait
 * @property {() => number} now the clock, epoch milliseconds
 * @property {(screen: string) => Promise<void> | void} [shot] photographs the real terminal at a new screen
 */

/**
 * The clean-room run id, which names the directory above the run directory (`<root>/<id>/run`).
 * @param {string} runDir the run directory
 * @returns {string}
 */
function runIdOf(runDir) {
  return path.basename(path.dirname(runDir));
}

const SHELL_ENV = ['PATH', 'HOME', 'TERM', 'LANG', 'XDG_RUNTIME_DIR', 'CLEANROOM_ROOT'];

/**
 * The environment `cleanroom shell` gets: a short allowlist and the dist-tag, so no inherited
 * secret reaches it. The setup token goes through `--secret`, never the environment.
 * @param {Record<string, string | undefined>} env the driver's environment
 * @returns {Record<string, string | undefined>}
 */
function shellEnv(env) {
  /** @type {Record<string, string | undefined>} */
  const out = { npm_config_tag: 'gate' };
  for (const name of SHELL_ENV) if (env[name] !== undefined) out[name] = env[name];
  return out;
}

/**
 * Plays the owner through `cairn new`.
 * @param {object} options
 * @param {string} options.runDir the run directory; the run id names its parent directory
 * @param {Record<string, string | undefined>} options.env `GATE_SITE_NAME`, `GATE_OWNER_EMAIL`, `GATE_CAIRN_BIN`, `GATE_HOST`, `GATE_ZONE`, and `HOME`
 * @param {Deps} options.deps the shell, tmux, stand-in, record, and clock
 * @returns {Promise<{ ok: true, steps: string[] }>} the screens seen, in order
 * @throws {ScriptedError} on an unknown screen, a setup stop, a return to the prompt, or 20 minutes
 */
export async function runScripted({ runDir, env, deps }) {
  const runId = runIdOf(runDir);
  const session = `cleanroom-${runId}-scripted`;
  const socket = path.join(env.HOME ?? os.homedir(), '.local', 'state', 'cleanroom', 'tmux-scripted.sock');
  const answers = { name: env.GATE_SITE_NAME || `Cairn gate ${runId}`, email: env.GATE_OWNER_EMAIL || DEFAULT_OWNER, command: commandFor(env) };
  /** @param {...string} args */
  const tmux = (...args) => deps.tmux(['-S', socket, ...args]);
  /** @param {...string} args */
  const send = (...args) => tmux('send-keys', '-t', session, ...args);

  const standIn = deps.startStandIn();
  let exitCode = null;
  const shell = deps.startShell(
    ['shell', runId, '--tmux', session, '--socket', socket, '--secret', 'CF_WS_CAIRN_CLEANROOM_TOKEN:CAIRN_CF_SETUP_TOKEN'],
    shellEnv(env),
  );
  shell.exited.then((code) => (exitCode = code));

  const started = deps.now();
  const steps = [];
  let reached = 'start';
  let last = null;
  let typed = false;
  let unknownText = null;
  let unknownSince = 0;
  try {
    for (;;) {
      if (exitCode !== null && exitCode !== 0) throw new ScriptedError(`cleanroom shell exited ${exitCode} at step "${reached}"`, reached);
      if (deps.now() - started > LIMIT_MS) throw new ScriptedError(`the leg took longer than 20 minutes; it reached step "${reached}"`, reached);
      const up = await tmux('has-session', '-t', session).then(() => true, () => false);
      const pane = up ? await tmux('capture-pane', '-p', '-t', session) : '';
      const screen = identify(pane, answers.command);
      if (screen) {
        unknownText = null;
        if (screen.name !== last) {
          if (screen.name === 'shell' && typed) {
            throw new ScriptedError(`the command ended and the pane is back at the shell prompt; it reached step "${reached}"`, reached);
          }
          last = screen.name;
          reached = screen.name;
          steps.push(screen.name);
          await deps.shot?.(screen.name);
          if (screen.end === 'fail') throw new ScriptedError(`setup stopped at "${screen.name}": ${title(pane)}\n${pane.trim()}`, reached);
          if (screen.answer) {
            for (const op of screen.answer(answers)) {
              if ('key' in op) await send(op.key);
              else if ('paste' in op) await send('-l', `${PASTE_ON}${op.paste}${PASTE_OFF}`);
              else await send('-l', op.type);
            }
            if (screen.name === 'shell') typed = true;
          }
          await deps.record({ at: new Date(deps.now()).toISOString(), screen: screen.name, action: screen.answer ? 'answered' : 'seen' });
          if (screen.end === 'done') return { ok: true, steps };
        }
      } else if (pane.trim() !== '') {
        if (pane !== unknownText) {
          unknownText = pane;
          unknownSince = deps.now();
        } else if (deps.now() - unknownSince >= UNKNOWN_MS) {
          throw new ScriptedError(`unknown screen "${title(pane)}" after step "${reached}":\n${pane.trim()}`, reached);
        }
      }
      await deps.sleep(POLL_MS);
    }
  } finally {
    standIn.kill();
  }
}

/**
 * The real dependencies: execFile for tmux, spawn for the shell and the stand-in.
 * @param {object} options
 * @param {string} options.runDir the run directory
 * @param {Record<string, string | undefined>} options.env the environment the children inherit
 * @param {string} [options.shotDir] where per-screen screenshots go; none are taken when absent
 * @returns {Promise<Deps>}
 */
async function realDeps({ runDir, env, shotDir }) {
  const log = await open(path.join(runDir, 'stand-in.log'), 'a', 0o600);
  /** @type {Deps} */
  const deps = {
    tmux: async (args) => (await execFileAsync('tmux', args)).stdout,
    startShell: (args, shellEnv) => {
      const child = spawn('cleanroom', args, { env: shellEnv, stdio: 'ignore' });
      return { exited: new Promise((resolve) => child.on('exit', (code) => resolve(code ?? 1)).on('error', () => resolve(127))) };
    },
    startStandIn: () => {
      const child = spawn(process.execPath, [path.join(HERE, 'stand-in.mjs'), runDir], {
        env: { ...env, GATE_SITE_NAME: env.GATE_SITE_NAME || `Cairn gate ${runIdOf(runDir)}` },
        stdio: ['ignore', log.fd, log.fd],
      });
      return { kill: () => child.kill('SIGTERM') };
    },
    record: (event) => appendFile(path.join(runDir, 'scripted.jsonl'), `${JSON.stringify(event)}\n`),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    now: () => Date.now(),
  };
  if (shotDir) {
    const socket = path.join(env.HOME ?? os.homedir(), '.local', 'state', 'cleanroom', 'tmux-scripted.sock');
    const session = `cleanroom-${runIdOf(runDir)}-scripted`;
    deps.shot = (name) =>
      execFileAsync('kitty-headless-shot', ['-o', shotDir, '-c', `tmux -S ${socket} attach -r -t ${session}`, 'sleep:1', `shot:${name}`]).then(() => {});
  }
  return deps;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const runDir = process.argv[2];
  const shotAt = process.argv.indexOf('--shots');
  if (!runDir) {
    console.error('Usage: scripted.mjs <run dir> [--shots <dir>] (start it through run-gate.sh)');
    process.exitCode = 2;
  } else {
    await mkdir(runDir, { recursive: true, mode: 0o700 });
    try {
      const deps = await realDeps({ runDir, env: process.env, shotDir: shotAt > 0 ? process.argv[shotAt + 1] : undefined });
      const { steps } = await runScripted({ runDir, env: process.env, deps });
      console.log(`scripted leg passed: ${steps.join(' > ')}`);
    } catch (error) {
      console.error(`scripted leg failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    }
  }
}
