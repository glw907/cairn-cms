// The recorder's entry: `record.sh` starts it with a scrubbed environment. A run records one
// live body per recordable route into a staging directory outside the worktree, then deletes what
// it made; `--cleanup <run id>` sweeps a crashed run from its ledger.
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createBrowserAdapter } from './browser-adapter.mjs';
import { requireRunId, TEST_LOGIN } from './guards.mjs';
import { cleanupRun, runRecording } from './run.mjs';

const CLIENT_ID_FILE = join(homedir(), 'Projects/initiatives/cairn-setup/research/cloudflare-oauth-client-id.txt');
export const LIVE_BASES = {
  cf: 'https://api.cloudflare.com/client/v4',
  dash: 'https://dash.cloudflare.com',
  ghApi: 'https://api.github.com',
  ghWeb: 'https://github.com',
};

/** The names a desktop opener needs to reach the session; `record.sh` passes these through when set. */
export const SESSION_NAMES = ['DISPLAY', 'WAYLAND_DISPLAY', 'XDG_RUNTIME_DIR', 'DBUS_SESSION_BUS_ADDRESS', 'XDG_CURRENT_DESKTOP'];

/**
 * The opener's environment: PATH, HOME, and the session names, never a test-account secret.
 * @param {Record<string, string | undefined>} env the recorder's environment
 * @returns {Record<string, string>}
 */
export function openerEnv(env) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const name of ['PATH', 'HOME', ...SESSION_NAMES]) {
    const value = env[name];
    if (value !== undefined) out[name] = value;
  }
  return out;
}

/**
 * Open a URL in the operator's browser through the desktop's opener, and print it too, since an
 * opener can fail without a word. The URL carries only a client id, a state, and a PKCE challenge.
 * @param {string} url
 * @param {{ env?: Record<string, string | undefined>, spawner?: typeof spawn, log?: (line: string) => void }} [deps]
 */
export function openInBrowser(url, { env = process.env, spawner = spawn, log = (line) => console.log(line) } = {}) {
  log(`Opening the Cloudflare consent. If no browser tab appears, open this URL:\n${url}`);
  const child = spawner('xdg-open', [url], { detached: true, stdio: 'ignore', env: openerEnv(env) });
  child.on('error', () => {});
  child.unref();
}

/**
 * @param {string[]} argv the arguments after the script name
 * @param {Record<string, string | undefined>} env the scrubbed environment
 */
export async function main(argv, env) {
  const missing = ['GITHUB_TEST_LOGIN', 'GITHUB_TEST_PASSWORD', 'GITHUB_TEST_TOTP_SECRET', 'GITHUB_TEST_TOKEN'].filter((name) => !env[name]);
  if (missing.length > 0) throw new Error(`Missing ${missing.join(', ')}.`);
  if (env.GITHUB_TEST_LOGIN !== TEST_LOGIN) throw new Error(`Refused: GITHUB_TEST_LOGIN is not ${TEST_LOGIN}.`);
  const cleanupIndex = argv.indexOf('--cleanup');
  const cleaning = cleanupIndex >= 0;
  const runId = requireRunId(cleaning ? argv[cleanupIndex + 1] : `t${Date.now().toString(36)}`);
  const stateDir = env.CAIRN_RECORD_STATE_DIR ?? join(homedir(), '.local/state/cairn-setup-s1');
  const clientId = (env.CAIRN_CF_CLIENT_ID ?? readFileSync(CLIENT_ID_FILE, 'utf8')).trim();
  const ctx = {
    runId,
    stateDir,
    bases: LIVE_BASES,
    clientId,
    testToken: /** @type {string} */ (env.GITHUB_TEST_TOKEN),
    needles: [/** @type {string} */ (env.GITHUB_TEST_PASSWORD), /** @type {string} */ (env.GITHUB_TEST_TOTP_SECRET)],
    openBrowser: (/** @type {string} */ url) => openInBrowser(url, { env }),
    makeAdapter: () => createBrowserAdapter({ env, stateDir, log: (line) => console.log(line) }),
  };
  const dir = await (cleaning ? cleanupRun(ctx) : runRecording(ctx));
  console.log(`${cleaning ? 'Cleaned' : 'Recorded'} run ${runId}: ${dir}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2), process.env).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
