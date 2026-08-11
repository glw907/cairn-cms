// The Cloudflare chapter's one spawn seam. Every wrangler and npm call in this chapter flows
// through runCommand, so the child's argv, cwd, and captured output are exactly what a test
// against a fake bin can assert on, and the heartbeat rule (long child, never silent) lives in
// one place rather than being reimplemented per caller.
//
// The one thing this module knows that a caller should not have to: on a fresh scaffold whose
// dependencies are not installed, `npx --no-install wrangler ...` does not fail the way a
// missing binary usually does. It is a clean exit 1 from npm itself
// ("npx canceled due to missing packages and no YES option"), not a spawn-level ENOENT. Both
// that case and a genuine ENOENT (a bad CAIRN_WRANGLER_BIN path) mean the same thing to a
// caller, wrangler could not run at all, so runWrangler recognizes both and rejects with the
// catalogue's wrangler-unavailable row. Every other non-zero exit is wrangler having run and
// failed, which stays the caller's to interpret.
import { spawn } from 'node:child_process';
import { cloudflareError } from './catalogue.mjs';

/**
 * The stderr fragment npx prints when it refuses to auto-install a missing package rather than
 * running it, the shape a scaffold with no node_modules produces for every wrangler call.
 */
const NPX_CANCELED_STDERR = 'npx canceled due to missing packages';

/**
 * @typedef {object} RunCommandOptions
 * @property {string} cwd the child process's working directory
 * @property {(line: string) => void} log receives each stdout and stderr line as it arrives
 * @property {string} [input] text written to the child's stdin, then the stream is ended; when
 *  omitted, stdin is ended immediately with nothing written
 */

/**
 * @typedef {object} CommandResult
 * @property {number} code the child's exit code
 * @property {string} stdout everything the child wrote to stdout
 * @property {string} stderr everything the child wrote to stderr
 */

/**
 * Split a stream's buffered text into complete lines for mirroring through `log`, holding back
 * any trailing partial line until more data (or the stream's end) completes it.
 * @param {(line: string) => void} log receives one complete line per call
 * @returns {(chunk: string) => void} feed this to a stream's `data` event
 */
function lineMirror(log) {
  let held = '';
  return (chunk) => {
    held += chunk;
    const lines = held.split('\n');
    held = lines.pop() ?? '';
    for (const line of lines) log(line);
  };
}

/**
 * Spawn one command, capturing and mirroring its output, without ever routing through a shell.
 * @param {string} command the executable to spawn
 * @param {string[]} args the arguments to invoke it with
 * @param {RunCommandOptions} options
 * @returns {Promise<CommandResult>} resolves with the exit code and full captured output; a
 *  spawn-level failure (for example ENOENT) rejects instead
 */
function runCommand(command, args, { cwd, log, input }) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, shell: false });

    let stdout = '';
    let stderr = '';
    const mirrorStdout = lineMirror(log);
    const mirrorStderr = lineMirror(log);

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      mirrorStdout(chunk.toString());
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
      mirrorStderr(chunk.toString());
    });

    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));

    // A child that spawns successfully and then exits before draining stdin (the T3 review's
    // finding: npx canceled due to missing packages exits immediately, ahead of the App-key
    // move's large piped input) raises an 'error' event on the stdin stream itself, separate
    // from the child-level 'error' handled above. With no listener here, that is an unhandled
    // EPIPE that crashes the whole CLI with a raw stack. The child's exit code and stderr already
    // carry the real failure (mapped to a catalogue row by the caller), so swallowing this stream
    // error loses no information.
    child.stdin.on('error', () => {});

    if (input) child.stdin.write(input);
    child.stdin.end();
  });
}

/**
 * Resolve the executable and leading arguments for a chapter tool, honoring a call-time env
 * override or falling back to running it through `npx` in the scaffold directory.
 * @param {string | undefined} override the env var's current value, read by the caller at call
 *  time, never cached
 * @param {string} defaultBin the executable name to fall back to (`npx` or `npm`)
 * @param {string[]} defaultArgs the leading arguments to prefix onto the fallback invocation
 * @returns {{ command: string, leadingArgs: string[] }}
 */
function resolveBin(override, defaultBin, defaultArgs) {
  if (override) return { command: override, leadingArgs: [] };
  const command = process.platform === 'win32' ? `${defaultBin}.cmd` : defaultBin;
  return { command, leadingArgs: defaultArgs };
}

/**
 * Run wrangler with `args`, resolving the binary from `CAIRN_WRANGLER_BIN` (read at call time)
 * or, when unset, from the scaffold's own `wrangler` devDependency via `npx --no-install`.
 * @param {string[]} args the wrangler subcommand and its arguments
 * @param {RunCommandOptions} options
 * @returns {Promise<CommandResult>} the exit code and captured output for every failure a caller
 *  can interpret itself; rejects with the catalogue's `wrangler-unavailable` error when wrangler
 *  could not run at all (a missing binary, or npx refusing to install it on an unbuilt scaffold)
 */
export async function runWrangler(args, options) {
  const { command, leadingArgs } = resolveBin(
    process.env.CAIRN_WRANGLER_BIN,
    'npx',
    ['--no-install', 'wrangler']
  );

  let result;
  try {
    result = await runCommand(command, [...leadingArgs, ...args], options);
  } catch {
    throw cloudflareError('wrangler-unavailable', { dir: options.cwd });
  }

  if (result.code !== 0 && result.stderr.includes(NPX_CANCELED_STDERR)) {
    throw cloudflareError('wrangler-unavailable', { dir: options.cwd });
  }
  return result;
}

/**
 * Run npm with `args`, resolving the binary from `CAIRN_NPM_BIN` (read at call time) or, when
 * unset, from `npm` on the platform's own PATH.
 * @param {string[]} args the npm subcommand and its arguments
 * @param {RunCommandOptions} options
 * @returns {Promise<CommandResult>} the exit code and captured output; never throws for a
 *  non-zero exit, since every npm failure here is the caller's to map through its own catalogue
 *  row
 */
export function runNpm(args, options) {
  const { command, leadingArgs } = resolveBin(process.env.CAIRN_NPM_BIN, 'npm', []);
  return runCommand(command, [...leadingArgs, ...args], options);
}
