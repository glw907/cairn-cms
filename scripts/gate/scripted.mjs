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

/** The launcher the owner types. */
export const COMMAND = 'npm create cairn-site';
/**
 * The address the leg sets up: a subdomain, never the bare domain. A record on the bare address or
 * `www` is a standing stop for Geoff, and the zone's apex holds the mail records. The interactive
 * command takes no address flags (those belong to `--plan`), so the leg picks the zone on the domain
 * screen and types the subdomain at the summary, the way a person does.
 */
export const HOST = 'gate.carin-test.org';
export const ZONE = 'carin-test.org';
/** The summary's address row once the subdomain is saved. */
const ADDRESS_SET = new RegExp(`Address\\s+${HOST.replaceAll('.', '\\.')}`);

/**
 * The line the owner types. A local build (`GATE_CAIRN_BIN`, set by `run-gate.sh scripted
 * --cairn-bin`) replaces the registry launcher with that `cairn` binary, so a fix is proved on the
 * branch before it publishes.
 * @param {Record<string, string | undefined>} env `GATE_CAIRN_BIN`
 * @returns {string}
 */
export function commandFor(env) {
  return env.GATE_CAIRN_BIN ? `${env.GATE_CAIRN_BIN} new` : COMMAND;
}

/**
 * The index of the last line the test accepts, or -1. A screen can sit below earlier output, so the
 * last match is the one on screen.
 * @param {string[]} lines
 * @param {(line: string) => boolean} test
 */
function lastIndex(lines, test) {
  for (let i = lines.length - 1; i >= 0; i--) if (test(/** @type {string} */ (lines[i]))) return i;
  return -1;
}

/**
 * The keys that move a choose screen's selection to the row that names `target`, then Enter. The
 * screen marks its selection with a leading `>` and lists one row per line. A screen with several
 * choices starts with no selection and no marker, so the first Down selects its first row, and the
 * rows begin on the line after the one that counts them ("5 domains on your Cloudflare account").
 * Only the lines below that count are rows: on the published path npm prints `> create-cairn-site`
 * above the screen, and read as a selection it sent run 2611102143 past the end of the list.
 * @param {string} pane the captured pane text
 * @param {string} target the row's text
 * @param {string} step the screen's name, for the failure
 * @returns {Op[]}
 * @throws {ScriptedError} when the screen has no row for the target, or neither a selection nor a count line
 */
export function chooseRow(pane, target, step) {
  const lines = pane.split('\n').map((l) => l.trim());
  const count = lastIndex(lines, (l) => /^\d+ (domains?|accounts?)\b/.test(l));
  const rowsFrom = count === -1 ? 0 : count + 1;
  const marked = lines.findIndex((l, i) => i >= rowsFrom && l.startsWith('> '));
  const wanted = lines.findIndex((l, i) => i >= rowsFrom && l.replace(/^> /, '') === target);
  if (wanted === -1 || (marked === -1 && count === -1)) {
    throw new ScriptedError(`the ${step} screen offers no "${target}" row to choose:\n${pane.trim()}`, step);
  }
  // With no marker the cursor sits above the first row, one line below the count.
  const selected = marked === -1 ? count : marked;
  const keys = Array.from({ length: Math.abs(wanted - selected) }, () => ({ key: wanted > selected ? 'Down' : 'Up' }));
  return [...keys, ...enter];
}

/**
 * Whether a chooser shows a selected row, looking only below the screen's title so that a `>` line
 * above it, such as npm's banner, is never read as one.
 * @param {string} pane the captured pane text
 * @param {RegExp} titlePattern the chooser's title
 */
export function hasSelection(pane, titlePattern) {
  const lines = pane.split('\n').map((l) => l.trim());
  const from = lastIndex(lines, (l) => titlePattern.test(l));
  return lines.some((l, i) => i > from && l.startsWith('> '));
}
/** How long the whole leg may take. */
export const LIMIT_MS = 20 * 60 * 1000;
/** The gap between looks at the pane. */
const POLL_MS = 500;
/** How long a screen may stay unchanged after it was answered before the leg calls it stuck. */
export const ANSWER_MS = 60_000;
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
 * @property {((answers: { name: string, email: string, command: string }, pane: string) => Op[]) | null} answer the keys it takes, or null
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
  // The address is typed on the summary: `a` opens it filled with the zone, then Ctrl+U clears it and
  // Enter saves. Setup rechecks the address, and only a summary that shows the subdomain is confirmed.
  { name: 'summary-set', test: (p) => /Review the settings for /.test(p) && /Enter set up/.test(p) && ADDRESS_SET.test(p), answer: () => enter },
  // The edit opens only once the pane shows it open, so no Enter is ever sent while the summary is
  // still unedited: an Enter there would confirm the bare domain.
  { name: 'summary-editing', test: (p) => /Review the settings for /.test(p) && /Enter save/.test(p), answer: () => [{ key: 'C-u' }, { type: HOST }, ...enter] },
  { name: 'summary', test: (p) => /Review the settings for /.test(p) && /Enter set up/.test(p), answer: () => [{ key: 'a' }] },
  // Enter was sent, or the summary is otherwise waiting: the screen takes no key until it changes.
  { name: 'summary-wait', test: (p) => /Review the settings for /.test(p), answer: null },
  { name: 'email', test: (p) => /Setup can't read your email from a Cloudflare token/.test(p), answer: ({ email }) => [{ paste: email }, ...enter] },
  { name: 'crawlers', test: (p) => /Choose whether AI companies/.test(p), answer: () => enter },
  { name: 'name', test: (p) => /Shown at the top of every page/.test(p), answer: ({ name }) => [{ type: name }, ...enter] },
  { name: 'theme', test: (p) => /How your site looks to readers/.test(p), answer: () => enter },
  // A chooser with several accounts shows no selection until the first arrow key, and Enter alone
  // does nothing there, so the first Down selects the first account.
  { name: 'account', test: (p) => /Choose an account/.test(p), answer: (_answers, pane) => (hasSelection(pane, /Choose an account/) ? enter : [{ key: 'Down' }, ...enter]) },
  { name: 'domain', test: (p) => /Choose a domain/.test(p), answer: (_answers, pane) => chooseRow(pane, ZONE, 'domain') },
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
 * The first line of a pane that has text, leaving out npm's `> ` banner lines above the screen.
 * @param {string} pane the captured pane text
 */
function title(pane) {
  return pane.split('\n').map((l) => l.trim()).find((l) => l !== '' && !l.startsWith('> ')) ?? '';
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
    // npm exports the dist-tag to the launcher it runs; a local binary gets it only from here, and
    // without it `cairn new` fetches the engine at `latest`, which carries no template.
    ['shell', runId, '--tmux', session, '--socket', socket, '--secret', 'CF_WS_CAIRN_CLEANROOM_TOKEN:CAIRN_CF_SETUP_TOKEN', '--env', 'npm_config_tag=gate'],
    shellEnv(env),
  );
  shell.exited.then((code) => (exitCode = code));

  const started = deps.now();
  /** @type {string[]} */
  const steps = [];
  let reached = 'start';
  let last = null;
  let typed = false;
  let answeredPane = '';
  let answeredAt = 0;
  let unknownText = null;
  let unknownSince = 0;
  try {
    for (;;) {
      if (exitCode !== null && exitCode !== 0) throw new ScriptedError(`cleanroom shell exited ${exitCode} at step "${reached}"`, reached);
      if (deps.now() - started > LIMIT_MS) throw new ScriptedError(`the leg took longer than 20 minutes; it reached step "${reached}"`, reached);
      const up = await tmux('has-session', '-t', session).then(() => true, () => false);
      let pane = up ? await tmux('capture-pane', '-p', '-t', session) : '';
      const screen = identify(pane, answers.command);
      if (screen) {
        unknownText = null;
        // The prompt again with the typed command above it means the command ended, whether or not the
        // screen before it was also the shell.
        if (screen.name === 'shell' && typed && squash(pane).includes(squash(answers.command))) {
          throw new ScriptedError(`the command ended and the pane is back at the shell prompt; it reached step "${reached}":\n${pane.trim()}`, reached);
        }
        if (screen.name !== last) {
          if (screen.name === 'shell' && typed) {
            throw new ScriptedError(`the command ended and the pane is back at the shell prompt; it reached step "${reached}":\n${pane.trim()}`, reached);
          }
          if (screen.name === 'summary' && steps.includes('summary-editing')) {
            throw new ScriptedError(`the summary shows the bare domain again after the address was saved, so setup refused it; it was not confirmed:\n${pane.trim()}`, reached);
          }
          last = screen.name;
          reached = screen.name;
          steps.push(screen.name);
          await deps.shot?.(screen.name);
          if (screen.end === 'fail') throw new ScriptedError(`setup stopped at "${screen.name}": ${title(pane)}\n${pane.trim()}`, reached);
          if (screen.answer) {
            // The screenshot takes seconds, and the pane can move on in that time. A key sent for a
            // screen that is gone lands on the next one: run 2611101855's Enter, meant for the browser
            // screen, accepted the domain screen's first row, 907.life. So the pane is read again, and
            // only a screen that is still showing is answered, from the fresh pane.
            const fresh = await tmux('capture-pane', '-p', '-t', session);
            if (identify(fresh, answers.command)?.name !== screen.name) {
              last = '';
              await deps.sleep(POLL_MS);
              continue;
            }
            pane = fresh;
            for (const op of screen.answer(answers, pane)) {
              if ('key' in op) await send(op.key);
              else if ('paste' in op) await send('-l', `${PASTE_ON}${op.paste}${PASTE_OFF}`);
              else await send('-l', op.type);
            }
            if (screen.name === 'shell') typed = true;
            answeredPane = pane;
            answeredAt = deps.now();
          }
          await deps.record({ at: new Date(deps.now()).toISOString(), screen: screen.name, action: screen.answer ? 'answered' : 'seen' });
          if (screen.end === 'done') return { ok: true, steps };
        } else if (screen.answer && pane === answeredPane && deps.now() - answeredAt >= ANSWER_MS) {
          throw new ScriptedError(`the "${screen.name}" screen did not take its answer in ${ANSWER_MS / 1000} seconds:\n${pane.trim()}`, reached);
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
  } catch (error) {
    // Every end of the leg is in the log, so a reader of scripted.jsonl learns why it stopped.
    const reason = (error instanceof Error ? error.message : String(error)).split('\n')[0];
    // The log is best effort: a write that fails must not replace the error that ended the leg.
    try {
      await deps.record({ at: new Date(deps.now()).toISOString(), screen: reached, action: 'failed', reason });
    } catch {
      // Nothing more to report: the original error goes on to the caller.
    }
    throw error;
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
