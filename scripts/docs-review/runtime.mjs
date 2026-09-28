// cairn-cms: shared logic for the R10 owner-review Artifact page. This file has no imports, so
// its source is copied verbatim (with the `export` keyword stripped) into the page's own inline
// script by the embed script; the embed script also imports it directly for the first embed.
// Both paths run the identical code, so the batch state they encode and decode never drifts
// between the Node side and the browser side.

/** @typedef {{ path: string, markdown: string }} DocsReviewFile */
/** @typedef {{ title: string, files: DocsReviewFile[] }} DocsReviewState */

export const STATE_ELEMENT_ID = 'cairn-docs-review-state';

/**
 * The literal closing tag of an HTML script element, and the literal open and close delimiters
 * of an HTML comment, each split by concatenation so this file's own source never spells one out
 * as a contiguous literal. This file is copied verbatim into the page's own inline script (see
 * the header comment above), and a real HTML parser ends a script element's raw text, or changes
 * how it tokenizes the rest of it, at these exact sequences wherever they appear in that text,
 * string and comment literals included, regardless of what the surrounding JavaScript means. Every
 * place this module needs one of these values builds it from these constants instead.
 */
const SCRIPT_CLOSE_TAG = '<' + '/script>';
const HTML_COMMENT_OPEN = '<' + '!--';
const HTML_COMMENT_CLOSE = '--' + '>';

/**
 * Serializes the review page's state as JSON safe to sit inside an HTML script element: every
 * "<" is escaped to its JSON unicode form, so a literal script closing tag inside a file's own
 * markdown (a fenced code block quoting a script element, say) can never end the element early.
 * decodeState reverses the escape through JSON.parse, which treats < as an ordinary string escape.
 * @param {DocsReviewState} state
 * @returns {string}
 */
export function encodeState(state) {
  return JSON.stringify(state).replace(/</g, '\\u003c');
}

/**
 * Parses the text encodeState produced back into the page's state.
 * @param {string} raw
 * @returns {DocsReviewState}
 */
export function decodeState(raw) {
  return /** @type {DocsReviewState} */ (JSON.parse(raw));
}

/**
 * Reads the embedded state out of a full page document's source, by locating the state script
 * element by its id, then its closing marker. Returns null when the document carries no such
 * element (so a caller can tell "no state" apart from "empty batch").
 * @param {string} html
 * @returns {DocsReviewState | null}
 */
export function extractEmbeddedState(html) {
  const marker = `id="${STATE_ELEMENT_ID}"`;
  const openIdx = html.indexOf(marker);
  if (openIdx === -1) return null;
  const tagEnd = html.indexOf('>', openIdx);
  if (tagEnd === -1) return null;
  const closeIdx = html.indexOf(SCRIPT_CLOSE_TAG, tagEnd);
  if (closeIdx === -1) return null;
  return decodeState(html.slice(tagEnd + 1, closeIdx));
}

/**
 * Decides which files to show for editing after a reload. A stashed file is restored only when
 * its markdown differs from what the reload just embedded: a save that landed (the stash matches
 * the reloaded state) restores nothing, and a save that did not (a conflict, or a publish that
 * never went out) brings its edit back. Never an unconditional restore of the whole stash.
 * @param {DocsReviewFile[] | null} stashedFiles
 * @param {DocsReviewFile[]} embeddedFiles
 * @returns {DocsReviewFile[]}
 */
export function computeRestoredFiles(stashedFiles, embeddedFiles) {
  if (!stashedFiles) return embeddedFiles;
  /** @type {Map<string, DocsReviewFile>} */
  const stashByPath = new Map();
  for (const file of stashedFiles) stashByPath.set(file.path, file);
  return embeddedFiles.map((file) => {
    const stashed = stashByPath.get(file.path);
    return stashed && stashed.markdown !== file.markdown ? stashed : file;
  });
}

/**
 * Whether a capability rejection code turns the page read-only. Member presence never signals
 * writability, so the first such rejection is the only signal there is; the caller latches it
 * for the rest of the session rather than re-checking on every save.
 * @param {string | undefined} code
 * @returns {boolean}
 */
export function isReadOnlyRejection(code) {
  return code === 'not_writer' || code === 'not_granted' || code === 'consent_required';
}

/**
 * Escapes text for placement inside HTML content (not an attribute).
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Renders one inline run of markdown text: an inline code span becomes <code>, everything else
 * is escaped literally. Bold and italic are left as literal asterisks, which the review page's
 * own content never needs and keeps the renderer small.
 * @param {string} text
 * @returns {string}
 */
function renderInline(text) {
  return text
    .split(/(`[^`]*`)/g)
    .map((part) => (part.startsWith('`') && part.endsWith('`') && part.length >= 2
      ? `<code>${escapeHtml(part.slice(1, -1))}</code>`
      : escapeHtml(part)))
    .join('');
}

/**
 * Splits one markdown table row into its cell texts.
 * @param {string} line
 * @returns {string[]}
 */
function splitTableRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
}

/**
 * Renders one markdown document to display HTML: headings, fenced code blocks, pipe tables,
 * inline code spans, HTML comments (shown inert, never parsed as markup), and paragraphs. This is
 * a small renderer sized to the review page's own display, not a commonmark implementation.
 * @param {string} markdown
 * @returns {string}
 */
export function renderMarkdown(markdown) {
  const lines = markdown.split('\n');
  /** @type {string[]} */
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const fence = /^```(\S*)\s*$/.exec(line);
    if (fence) {
      const lang = fence[1];
      /** @type {string[]} */
      const body = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        body.push(lines[i]);
        i += 1;
      }
      i += 1;
      const cls = lang ? ` class="language-${escapeHtml(lang)}"` : '';
      out.push(`<pre><code${cls}>${escapeHtml(body.join('\n'))}</code></pre>`);
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      i += 1;
      continue;
    }
    if (
      /^\s*\|.*\|\s*$/.test(line) &&
      i + 1 < lines.length &&
      /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1])
    ) {
      const header = splitTableRow(line);
      i += 2;
      /** @type {string[][]} */
      const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        rows.push(splitTableRow(lines[i]));
        i += 1;
      }
      const thead = header.map((cell) => `<th>${renderInline(cell)}</th>`).join('');
      const tbody = rows
        .map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join('')}</tr>`)
        .join('');
      out.push(
        `<div class="table-wrap"><table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table></div>`,
      );
      continue;
    }
    if (line.trim() === '') {
      i += 1;
      continue;
    }
    if (line.trim().startsWith(HTML_COMMENT_OPEN)) {
      const body = [line];
      while (!body[body.length - 1].includes(HTML_COMMENT_CLOSE) && i + 1 < lines.length) {
        i += 1;
        body.push(lines[i]);
      }
      i += 1;
      const trimmed = body.join('\n').trim();
      const withoutOpen = trimmed.startsWith(HTML_COMMENT_OPEN)
        ? trimmed.slice(HTML_COMMENT_OPEN.length)
        : trimmed;
      const inner = withoutOpen.endsWith(HTML_COMMENT_CLOSE)
        ? withoutOpen.slice(0, withoutOpen.length - HTML_COMMENT_CLOSE.length)
        : withoutOpen;
      out.push(HTML_COMMENT_OPEN + escapeHtml(inner) + HTML_COMMENT_CLOSE);
      continue;
    }
    const para = [line];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^```/.test(lines[i]) &&
      !/^#{1,6}\s/.test(lines[i])
    ) {
      para.push(lines[i]);
      i += 1;
    }
    out.push(`<p>${renderInline(para.join(' '))}</p>`);
  }
  return out.join('\n');
}
