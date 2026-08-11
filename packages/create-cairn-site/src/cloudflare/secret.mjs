// The App key's move from local state to a Worker secret. The order here is a safety property,
// never a preference: the state record keeps its copy of the PEM until wrangler confirms the
// secret is written, so a failed put can never leave the key with no recoverable home. Only a
// successful put earns the state deletion.
import { loadSite, updateSite } from '../state.mjs';
import { runWrangler } from './exec.mjs';
import { cloudflareError, trailingStderr } from './catalogue.mjs';

/**
 * Move the App's private key out of local state and into a Worker secret named
 * `GITHUB_APP_PRIVATE_KEY_B64`, matching the engine's own env contract (`src/lib/env.ts`, which
 * base64-decodes that variable before handing the PEM to `@octokit/auth-app`). Resumable: once
 * the state record carries no `github.pem`, a later call is a no-op, which doubles as the
 * idempotence check for a re-run that already moved the key.
 * @param {object} args
 * @param {string} args.siteId the site's state id
 * @param {string} args.dir the scaffold root, used as the wrangler invocation's cwd
 * @param {(line: string) => void} args.log receives progress lines
 * @param {string} [args.accountId] the Cloudflare account the Worker lives in, from
 *  `ensureAccountId`; when given, it is passed to wrangler as `CLOUDFLARE_ACCOUNT_ID`
 * @returns {Promise<void>}
 */
export async function movePemToWorkerSecret({ siteId, dir, log, accountId }) {
  const state = await loadSite(siteId);
  const pem = state?.github?.pem;
  if (!pem) {
    log("The App's key is already a Worker secret.");
    return;
  }

  const input = Buffer.from(pem).toString('base64');
  const result = await runWrangler(['secret', 'put', 'GITHUB_APP_PRIVATE_KEY_B64'], {
    cwd: dir,
    log,
    input,
    ...(accountId ? { env: { CLOUDFLARE_ACCOUNT_ID: accountId } } : {}),
  });
  if (result.code !== 0) {
    throw cloudflareError('secret-put-failed', { dir, detail: trailingStderr(result.stderr) });
  }

  await updateSite(siteId, { github: { pem: undefined } });
  log(
    "The App's private key now lives only in your Worker's secret store, not on this machine. " +
      "If it is ever lost, regenerate it at the App's settings page on github.com and re-run " +
      'this step.'
  );
}
