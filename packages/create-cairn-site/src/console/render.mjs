// The console's render primitives: HTML escaping, the allowlist picker that is the one sanctioned
// way a view may pull fields off the state record, the one-line chapter/hop header, and the page
// shell every console view (and the exit render, and the park-page shell) wraps its body in.
//
// A view never spreads the record or calls JSON.stringify(record) into a response: the
// secret-sentinel sweep in server.test.mjs is what proves that discipline, not a runtime
// firewall. pickAllowlist below is what a view calls instead, naming exactly the dotted field
// paths it means to show and nothing else.

/**
 * The sentence every console page carries, naming the one honest limit of what it is: a page
 * that exists only while this run is holding a wait, not a service left running after it.
 */
export const SERVES_DURING_RUN_SENTENCE =
  'This page is served only while this run is waiting; it stops when the run does.';

/**
 * Escape a value for safe inclusion in HTML text content.
 * @param {unknown} value the value to escape, coerced to a string first
 * @returns {string} the escaped string
 */
export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Read a dotted path (`'cloudflare.domain'`) out of a plain object.
 * @param {object} record the object to read
 * @param {string} field a dotted path
 * @returns {unknown} the value at that path, or undefined when any segment along it is missing
 */
function getPath(record, field) {
  return field.split('.').reduce((node, key) => (node == null ? undefined : node[key]), record);
}

/**
 * Write a dotted path into a plain object, creating intermediate objects as needed.
 * @param {object} target the object to write into
 * @param {string} field a dotted path
 * @param {unknown} value the value to set
 * @returns {void}
 */
function setPath(target, field, value) {
  const segments = field.split('.');
  const last = segments.pop();
  const node = segments.reduce((cursor, key) => (cursor[key] ??= {}), target);
  node[last] = value;
}

/**
 * Pick an explicit allowlist of dotted field paths off the state record, the one path a console
 * view is allowed to read the record through. A field the record does not have is silently
 * skipped, never written as undefined, so a view that checks `safe.cloudflare?.domain` sees the
 * same shape whether the field was absent on the record or never asked for in the first place.
 * @param {object} record the full state record, secrets and all
 * @param {string[]} fields the dotted paths to keep
 * @returns {object} a new object holding only the requested fields
 */
export function pickAllowlist(record, fields) {
  const result = {};
  for (const field of fields) {
    const value = getPath(record, field);
    if (value !== undefined) setPath(result, field, value);
  }
  return result;
}

/**
 * Render the one-line chapter/hop header every console page carries.
 * @param {{ chapter: string, hop: string }} args the current chapter label and hop title
 * @returns {string} the header HTML
 */
export function renderHeader({ chapter, hop }) {
  return `<p class="cairn-console-header">${escapeHtml(chapter)} &middot; ${escapeHtml(hop)}</p>`;
}

/**
 * Wrap a view's body in the full page shell: the doctype, an optional meta refresh, the
 * chapter/hop header, the body, and the serves-during-a-run-only sentence.
 * @param {object} args
 * @param {string} args.chapter the current chapter label
 * @param {string} args.hop the current hop title
 * @param {string} [args.title] the document title, defaults to the chapter label
 * @param {string} args.bodyHtml the view's own body markup, already escaped by its caller
 * @param {number} [args.refreshSeconds] when set, emits a meta refresh at this interval; omitted
 *  entirely renders no refresh meta at all, which is what the exit render and the park shell need
 * @returns {string} the full HTML document
 */
export function renderPage({ chapter, hop, title, bodyHtml, refreshSeconds }) {
  const refreshMeta =
    typeof refreshSeconds === 'number'
      ? `<meta http-equiv="refresh" content="${refreshSeconds}">`
      : '';
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    refreshMeta,
    `<title>${escapeHtml(title ?? chapter)}</title>`,
    '</head>',
    '<body>',
    renderHeader({ chapter, hop }),
    bodyHtml,
    `<p class="cairn-console-footer">${escapeHtml(SERVES_DURING_RUN_SENTENCE)}</p>`,
    '</body>',
    '</html>',
  ]
    .filter(Boolean)
    .join('\n');
}
