// Open the admin's default browser to a URL. This is the tool's only client-facing use of a
// child process, so it is kept narrow: pick the platform's own opener, fire it detached (never
// block the tool's own event loop on the browser's lifetime), and swallow any spawn failure,
// since a missing xdg-open (a headless server, a locked-down container, an SSH session with no
// display) is a normal environment, not a bug. The one thing every call does unconditionally is
// print the URL as plain text, so a run with no working browser still tells the admin exactly
// where to go by hand.
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
 * Open the admin's browser to `url`, then log a plain-text fallback link. The spawn is
 * best-effort: a failure to launch the opener (or the opener itself not existing) never rejects
 * this function, since the fallback line already covers that case.
 * @param {string} url the URL to open
 * @param {(line: string) => void} log receives one printed line per call
 * @returns {Promise<void>} resolves once the opener has been attempted
 */
export async function openBrowser(url, log) {
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
  log(`Open this link if the browser did not open: ${url}`);
}
