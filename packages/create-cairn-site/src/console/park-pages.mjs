// The console's park page: one composed source with the printed park text. A park page is never
// hand-written per code; it is built from the same catalogue row (src/cloudflare/catalogue.mjs)
// a chapter already prints to the terminal, so the two can never drift apart in wording. The
// enumeration a completeness test checks against is that catalogue module's own WAIT_KIND_CODES
// export, never a copy kept here.
import { cloudflareError } from '../cloudflare/catalogue.mjs';
import { renderParkShell } from './park-shell.mjs';

/**
 * Reduce a catalogue row's full printed text down to everything above its `Next:` line, the part
 * `renderParkShell`'s own `message` param takes; the label-stripped `Next:` text itself is already
 * exposed as `err.catalogue.next`, so this never needs to re-derive that half.
 * @param {string} fullMessage the row's full printed text, ending in a `Next:` line
 * @returns {string} `fullMessage` with its trailing `Next:` line removed
 */
function messageBody(fullMessage) {
  return fullMessage
    .split('\n')
    .filter((line) => !line.startsWith('Next:'))
    .join('\n');
}

/**
 * Render a park page for one catalogue code: the exact message and `Next:` line a chapter would
 * print for this same code and params, wrapped in the park shell. This is the one function that
 * turns a wait-kind catalogue row into a page, so the printed text and the page can never say two
 * different things.
 * @param {object} args
 * @param {string} args.code a catalogue code, ordinarily one of WAIT_KIND_CODES
 * @param {Record<string, string | string[] | boolean>} args.params the row's own interpolation
 *  params, the same shape `cloudflareError` takes
 * @param {string} args.chapter the current chapter label
 * @param {string} args.hop the current hop title
 * @returns {string} the full HTML document
 */
export function renderParkPage({ code, params, chapter, hop }) {
  const printed = cloudflareError(code, params);
  return renderParkShell({
    chapter,
    hop,
    message: messageBody(printed.message),
    next: printed.catalogue.next,
  });
}
