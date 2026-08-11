// Learning the Cloudflare account id, once, so every chapter-1 wrangler call can be pointed at
// it explicitly instead of whatever account a multi-account session happens to default to.
// Chapter 2 needs the same id for its own zone and DNS calls, so this module learns it here and
// the chapter persists it, rather than re-deriving it per chapter.
import { isCancel } from '@clack/prompts';
import { exitOnCancel } from '../prompts.mjs';
import { runWrangler } from './exec.mjs';
import { cloudflareError } from './catalogue.mjs';

/**
 * Parse `wrangler whoami --json`'s stdout into its payload. Captured live 2026-08-11 against
 * wrangler 4.97.0: the command does not always print bare JSON on stdout. A skills-availability
 * banner line ("Cloudflare agent skills are available for...") can land ahead of the opening
 * brace, and other chatter (an update-available notice) shares the same stream too, so this
 * locates the first `{` and parses from there rather than trusting the whole stdout to already
 * be JSON, the same hazard `bootstrap.mjs`'s `parseD1JsonResults` guards against for `--json`
 * on a different subcommand.
 * @param {string} stdout the child's captured stdout
 * @returns {{ loggedIn?: boolean, accounts?: Array<{ id: string, name: string }> } | null} the
 *  parsed payload, or null when stdout carried nothing that parses as an object from its first `{`
 */
function parseWhoamiJson(stdout) {
  const start = stdout.indexOf('{');
  if (start === -1) return null;
  try {
    const parsed = JSON.parse(stdout.slice(start));
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * @typedef {object} EnsureAccountIdInput
 * @property {object | null} [record] the site's current in-memory state record; read only for
 *  `record.cloudflare?.accountId`, never persisted by this function
 * @property {string} dir the scaffold root, used as the wrangler invocation's cwd
 * @property {boolean} yes true for a non-interactive run; several accounts with no saved id then
 *  throws instead of prompting, since there is no one to ask
 * @property {(options: { message: string, options: Array<{ value: string, label: string }> }) =>
 *  Promise<string | symbol>} prompt the account picker, a test seam defaulting in the caller to
 *  `@clack/prompts`' own `select`
 * @property {(line: string) => void} log receives progress lines
 */

/**
 * Resolve the Cloudflare account id every chapter-1 wrangler call needs once a session exists.
 * Pure over the in-memory record: this returns its outcome and never writes to the state store
 * itself, mirroring the pure-step-function rule chapter 2 states for its own steps (chapter 1
 * already owns its own persistence, so its caller writes the result back).
 * @param {EnsureAccountIdInput} args
 * @returns {Promise<{ accountId: string, learned: boolean }>} the resolved id, and whether this
 *  call had to enumerate accounts at all, so the caller knows whether it needs to persist it
 */
export async function ensureAccountId({ record, dir, yes, prompt, log }) {
  const saved = record?.cloudflare?.accountId;
  if (saved) {
    return { accountId: saved, learned: false };
  }

  const result = await runWrangler(['whoami', '--json'], { cwd: dir, log: () => {} });

  // A non-zero exit and an unreadable body are different failures and must not share a row.
  // `whoami --json` documents that it "exits with a non-zero status if not authenticated", so a
  // non-zero exit really is the sign-in problem login-abandoned describes. Exiting 0 while
  // carrying no readable account list is something else entirely, and telling that admin to redo
  // a browser sign-in would send them to fix a thing that is not broken.
  if (result.code !== 0) {
    throw cloudflareError('login-abandoned', { dir });
  }

  const accounts = parseWhoamiJson(result.stdout)?.accounts;
  if (!Array.isArray(accounts) || accounts.length === 0) {
    throw cloudflareError('account-lookup-failed', { dir });
  }

  if (accounts.length === 1) {
    log(`Using your Cloudflare account: ${accounts[0].name}.`);
    return { accountId: accounts[0].id, learned: true };
  }

  if (yes) {
    throw cloudflareError('account-ambiguous', { dir });
  }

  const chosen = await prompt({
    message: 'Which Cloudflare account should this site deploy to?',
    options: accounts.map((account) => ({ value: account.id, label: account.name })),
  });
  if (isCancel(chosen)) exitOnCancel();
  return { accountId: chosen, learned: true };
}
