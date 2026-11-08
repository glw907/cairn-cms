// The recorder's entry: `record.sh` starts it with a scrubbed environment. A run records one
// live body per recordable route into a staging directory outside the worktree, then deletes what
// it made; `--cleanup <run id>` sweeps a crashed run from its ledger.
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createBrowserAdapter } from './browser-adapter.mjs';
import { cleanupRun, runRecording } from './run.mjs';

const CLIENT_ID_FILE = join(homedir(), 'Projects/initiatives/cairn-setup/research/cloudflare-oauth-client-id.txt');
export const LIVE_BASES = {
  cf: 'https://api.cloudflare.com/client/v4',
  dash: 'https://dash.cloudflare.com',
  ghApi: 'https://api.github.com',
  ghWeb: 'https://github.com',
};

/**
 * Open a URL in the operator's browser through the desktop's opener.
 * @param {string} url
 */
function openInBrowser(url) {
  spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
}

/**
 * @param {string[]} argv the arguments after the script name
 * @param {Record<string, string | undefined>} env the scrubbed environment
 */
export async function main(argv, env) {
  const missing = ['GITHUB_TEST_LOGIN', 'GITHUB_TEST_PASSWORD', 'GITHUB_TEST_TOTP_SECRET', 'GITHUB_TEST_TOKEN'].filter((name) => !env[name]);
  if (missing.length > 0) throw new Error(`Missing ${missing.join(', ')}.`);
  const cleanupIndex = argv.indexOf('--cleanup');
  const cleaning = cleanupIndex >= 0;
  const runId = cleaning ? argv[cleanupIndex + 1] : `t${Date.now().toString(36)}`;
  if (!runId || !/^[a-z0-9]+$/.test(runId)) throw new Error('--cleanup takes a run id.');
  const stateDir = env.CAIRN_RECORD_STATE_DIR ?? join(homedir(), '.local/state/cairn-setup-s1');
  const clientId = (env.CAIRN_CF_CLIENT_ID ?? readFileSync(CLIENT_ID_FILE, 'utf8')).trim();
  const ctx = {
    runId,
    stateDir,
    bases: LIVE_BASES,
    clientId,
    testToken: /** @type {string} */ (env.GITHUB_TEST_TOKEN),
    openBrowser: openInBrowser,
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
