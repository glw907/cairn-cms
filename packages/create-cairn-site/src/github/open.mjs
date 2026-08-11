// Open the admin's default browser to a URL. This is the tool's only client-facing use of a
// child process, so it is kept narrow: pick the platform's own opener, fire it detached (never
// block the tool's own event loop on the browser's lifetime), and swallow any spawn failure,
// since a missing xdg-open (a headless server, a locked-down container, an SSH session with no
// display) is a normal environment, not a bug. The one thing every call does unconditionally is
// print the URL as plain text, so a run with no working browser still tells the admin exactly
// where to go by hand.
//
// The GitHub chapter's own URLs (the manifest, the OAuth authorize, the App install page) carry
// no secret, so they print unconditionally. The Cloudflare chapter's confirm URL is different: it
// carries a raw sign-in token, and `--yes --deploy` is documented as a fully unattended run, the
// shape whose stdout gets archived (CI logs, `| tee`, scrollback). A caller opts a URL into that
// stricter handling with `{ secret: true }`, which never changes behavior at an interactive
// terminal (a human at the keyboard may still need the printed link) but keeps the token out of
// a non-interactive log, where only the origin and a re-run hint print instead.
import { spawn } from 'node:child_process';

/**
 * Build the platform opener's command and argument list.
 * @param {string} url the URL to open
 * @param {string} platform `process.platform`
 * @returns {{ command: string, args: string[] }} the command and arguments to spawn
 */
function openerFor(url, platform) {
  if (platform === 'darwin') return { command: 'open', args: [url] };
  if (platform === 'win32') return { command: 'cmd', args: ['/c', 'start', '""', url] };
  return { command: 'xdg-open', args: [url] };
}

/**
 * @typedef {object} OpenBrowserOptions
 * @property {boolean} [secret] when true and `process.stdout.isTTY` is false, the URL itself is
 *  withheld from the log (only its origin prints) since a non-interactive run's stdout is the
 *  shape most likely to be archived; defaults to false, the GitHub chapter's own URLs, which
 *  carry no secret and always print in full
 */

/**
 * Open the admin's browser to `url`, then log a plain-text fallback link. The spawn is
 * best-effort: a failure to launch the opener (or the opener itself not existing) never rejects
 * this function, since the fallback line already covers that case.
 *
 * A `secret: true` URL is withheld from a non-interactive log (an admin still at an interactive
 * terminal always sees the full link, since they may need it if the opener failed); everything
 * else prints in full regardless of TTY, unchanged from before this option existed.
 * @param {string} url the URL to open
 * @param {(line: string) => void} log receives one printed line per call
 * @param {OpenBrowserOptions} [options]
 * @returns {Promise<void>} resolves once the opener has been attempted
 */
export async function openBrowser(url, log, { secret = false } = {}) {
  const { command, args } = openerFor(url, process.platform);
  try {
    const child = spawn(command, args, { detached: true, stdio: 'ignore' });
    child.on('error', () => {
      // A missing opener binary is a normal environment, not a failure worth surfacing; the
      // fallback log line below is the real recovery.
    });
    child.unref();
  } catch {
    // spawn itself can throw synchronously (an invalid command on some platforms); swallowed for
    // the same reason as the child's own 'error' event above.
  }

  if (secret && !process.stdout.isTTY) {
    log(`Your site is at: ${new URL(url).origin}`);
    log(
      'The sign-in link carries a one-time token and is not printed to this non-interactive ' +
        'output. Next: from an interactive terminal, re-run npx create-cairn-site --dir <dir> ' +
        '--sign-in for a fresh link.',
    );
    return;
  }

  log(`Open this link if the browser did not open: ${url}`);
}
