// A fake executable standing in for wrangler or npm in the Cloudflare chapter's tests. It logs
// every call it receives (argv, cwd, whatever arrived on stdin, and its env) as one JSON line to
// an `invocations.jsonl` file beside itself, then answers from a `responses.json` control file:
// the first entry whose `matcher` (a plain substring) appears in the joined argv supplies the exit
// code and output, and no match exits 0 with nothing printed. This is what keeps the chapter's
// spawn-seam tests free of a real wrangler or npm process.
//
// The logged env is filtered to variables whose names start with `CAIRN_` or `CLOUDFLARE_`, the
// two namespaces this tool's own env-passing seam ever sets. A test spawns the fake with its own
// process's full environment merged in (spawn's default, or exec.mjs's own env-merge behavior),
// so logging every variable verbatim would write whatever real secrets happen to sit in the
// operator's shell into a fake's log file on disk. Recording only the two namespaces this tool
// controls is enough to prove the env seam works without ever capturing anything unrelated.
//
// Everything lives under one fresh mkdtemp directory per fake, so parallel tests never collide,
// and `close()` removes it. `respond` PREPENDS its new entry so a later, more specific matcher
// (say `d1 migrations` added after an earlier `d1`) wins the scan, mirroring how a test usually
// arms a general default first and then narrows it for one case.
import { mkdtemp, writeFile, readFile, chmod, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * @typedef {object} FakeBinReply
 * @property {number} [code] the exit code the fake exits with (default 0)
 * @property {string} [stdout] text the fake writes to stdout (default none)
 * @property {string} [stderr] text the fake writes to stderr (default none)
 */

/**
 * @typedef {object} FakeBinInvocation
 * @property {string[]} argv the arguments the fake was called with, excluding the binary itself
 * @property {string} cwd the child process's working directory at call time
 * @property {string} stdin everything read from stdin before the fake replied
 * @property {Record<string, string>} env the fake's own environment, filtered to only the
 *  variables whose names start with `CAIRN_` or `CLOUDFLARE_`; every other variable the fake
 *  actually received (including whatever it inherited from the operator's shell) is left out of
 *  the log on purpose, so a test asserting on this field never writes an unrelated real secret to
 *  disk
 */

/**
 * @typedef {object} FakeBin
 * @property {string} binPath the executable script's path; point `CAIRN_WRANGLER_BIN` or
 *  `CAIRN_NPM_BIN` at this so a test spawns the fake instead of a real binary
 * @property {() => Promise<FakeBinInvocation[]>} invocations every call this fake has received
 *  so far, in arrival order; `[]` before the first call
 * @property {(matcher: string, reply: FakeBinReply) => Promise<void>} respond arm a reply for
 *  the next call (and any after it) whose joined argv contains `matcher` as a substring
 * @property {() => Promise<void>} close remove the fake's temp directory
 */

/**
 * Build a fake executable under a fresh temp directory.
 * @param {string} name a readable label folded into the temp directory and script names; purely
 *  for a legible path in a failure message, never behavior
 * @param {{ exitBeforeReadingStdin?: boolean }} [options] `exitBeforeReadingStdin` makes the fake
 *  answer and exit without ever reading its stdin, reproducing the race a caller's stdin write
 *  can lose to: a child that exits before the piped input drains raises an EPIPE on the write
 *  side. The ordinary fake always drains stdin to EOF first, so this is the one shape it cannot
 *  otherwise produce.
 * @returns {Promise<FakeBin>} the running fake, ready to be spawned by its `binPath`
 */
export async function makeFakeBin(name, { exitBeforeReadingStdin = false } = {}) {
  const label = String(name).replace(/[^a-zA-Z0-9-]+/g, '-') || 'bin';
  const dir = await mkdtemp(join(tmpdir(), `cairn-fake-bin-${label}-`));
  const binPath = join(dir, `${label}.mjs`);
  const responsesPath = join(dir, 'responses.json');
  const invocationsPath = join(dir, 'invocations.jsonl');

  await writeFile(responsesPath, '[]', 'utf8');
  await writeFile(
    binPath,
    exitBeforeReadingStdin ? FAKE_BIN_SCRIPT_EXIT_BEFORE_STDIN : FAKE_BIN_SCRIPT,
    'utf8',
  );
  await chmod(binPath, 0o755);

  return {
    binPath,
    async invocations() {
      let raw;
      try {
        raw = await readFile(invocationsPath, 'utf8');
      } catch {
        return [];
      }
      return raw
        .split('\n')
        .filter((line) => line.length > 0)
        .map((line) => JSON.parse(line));
    },
    async respond(matcher, reply) {
      let entries;
      try {
        entries = JSON.parse(await readFile(responsesPath, 'utf8'));
      } catch {
        entries = [];
      }
      entries.unshift({ matcher, ...reply });
      await writeFile(responsesPath, JSON.stringify(entries), 'utf8');
    },
    async close() {
      await rm(dir, { recursive: true, force: true });
    }
  };
}

// The fake's own body, written out verbatim as the spawned script. It reads stdin to EOF first
// (an empty or already-closed stream resolves immediately, so a caller that never writes
// anything never hangs it), logs the call, then answers from responses.json. Kept as one inline
// template rather than a sibling file so the factory and the spawned behavior stay together, one
// file to read and change at once.
const FAKE_BIN_SCRIPT = `#!/usr/bin/env node
import { appendFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', () => resolve(data));
    process.stdin.resume();
  });
}

const stdin = await readStdin();
const env = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key]) => key.startsWith('CAIRN_') || key.startsWith('CLOUDFLARE_')
  )
);
await appendFile(
  join(here, 'invocations.jsonl'),
  JSON.stringify({ argv, cwd: process.cwd(), stdin, env }) + '\\n',
  'utf8'
);

let responses = [];
try {
  responses = JSON.parse(await readFile(join(here, 'responses.json'), 'utf8'));
} catch {
  responses = [];
}

const joined = argv.join(' ');
const match = responses.find((entry) => joined.includes(entry.matcher));

if (match) {
  if (match.stdout) process.stdout.write(match.stdout);
  if (match.stderr) process.stderr.write(match.stderr);
}
// process.exitCode, never process.exit(): the seam that spawns this fake captures stdout, so
// stdout is always a pipe, and process.exit() abandons whatever is still buffered on one. A
// canned reply larger than the pipe buffer would arrive truncated, and the caller would read
// that as its own parsing bug. bin.mjs avoids process.exit() on its success paths for the same
// reason. Setting the code and falling off the end lets Node drain the write first.
process.exitCode = match?.code ?? 0;
`;

// A variant that never reads stdin at all, so the process can exit while a caller is still
// writing (or has yet to start writing) its piped input, the shape that raises an unhandled
// EPIPE on the write side when the caller attaches no 'error' listener of its own. Everything
// else matches FAKE_BIN_SCRIPT: same invocation log (including the filtered env), same matcher
// lookup, same reply shape; the logged \`stdin\` is always \`null\`, since this fake deliberately
// leaves it unread.
const FAKE_BIN_SCRIPT_EXIT_BEFORE_STDIN = `#!/usr/bin/env node
import { appendFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);

const env = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key]) => key.startsWith('CAIRN_') || key.startsWith('CLOUDFLARE_')
  )
);
await appendFile(
  join(here, 'invocations.jsonl'),
  JSON.stringify({ argv, cwd: process.cwd(), stdin: null, env }) + '\\n',
  'utf8'
);

let responses = [];
try {
  responses = JSON.parse(await readFile(join(here, 'responses.json'), 'utf8'));
} catch {
  responses = [];
}

const joined = argv.join(' ');
const match = responses.find((entry) => joined.includes(entry.matcher));

if (match) {
  if (match.stdout) process.stdout.write(match.stdout);
  if (match.stderr) process.stderr.write(match.stderr);
}
process.exitCode = match?.code ?? 0;
`;
