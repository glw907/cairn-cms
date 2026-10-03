// cairn-cms: shared logic for the owner-review Artifact page. This file has no imports, so
// its source is copied verbatim (with the `export` keyword stripped) into the page's own inline
// script by the embed script; the embed script also imports it directly for the first embed.
// Both paths run the identical code, so the batch state they encode and decode never drifts
// between the Node side and the browser side.

/** @typedef {{ path: string, markdown: string, plan?: string }} DocsReviewFile */
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
  const stashByPath = new Map(stashedFiles.map((file) => [file.path, file]));
  return embeddedFiles.map((file) => {
    const stashed = stashByPath.get(file.path);
    return stashed && stashed.markdown !== file.markdown ? stashed : file;
  });
}

/**
 * The read-only page plan shown beside one file's preview: a collapsed `details` element holding
 * the plan's rendered markdown, or an empty string for a file with no plan, so a page without one
 * shows nothing extra. The plan is displayed only; the page never edits or saves it.
 * @param {DocsReviewFile} file
 * @param {(markdown: string) => string} renderDoc The page's markdown renderer.
 * @returns {string}
 */
export function planSectionHtml(file, renderDoc) {
  if (typeof file.plan !== 'string' || file.plan.trim() === '') return '';
  return (
    '<details class="doc-file-plan"><summary>Page plan</summary>' +
    '<div class="doc-file-plan-body">' + renderDoc(file.plan) + '</div></details>'
  );
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
 * own content never needs and keeps the renderer small. Splitting on a capturing group puts
 * every matched code span at an odd index, so the index alone tells a span from plain text.
 * @param {string} text
 * @returns {string}
 */
function renderInline(text) {
  return text
    .split(/(`[^`]*`)/g)
    .map((part, index) => {
      if (index % 2 === 1) return `<code>${escapeHtml(part.slice(1, -1))}</code>`;
      return escapeHtml(part);
    })
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
      const withoutOpen = body.join('\n').trim().slice(HTML_COMMENT_OPEN.length);
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

/**
 * Picks the renderer the page uses for its previews. When the page's two CDN libraries loaded
 * (marked and DOMPurify, both as globals on `scope`), previews are full CommonMark plus GFM,
 * sanitized; raw HTML comments in the markdown parse to comment nodes, which DOMPurify drops, so
 * they stay invisible and inert. When either is missing (an offline copy, a blocked host), the
 * built-in renderMarkdown keeps the page working. Links are made to open in a new tab, since a
 * click that navigated the sandboxed page would replace the review in place.
 * @param {any} scope The global object, or an object standing in for it.
 * @returns {(markdown: string) => string}
 */
export function selectMarkdownRenderer(scope) {
  const marked = scope && scope.marked;
  const purify = scope && scope.DOMPurify;
  if (
    !marked ||
    typeof marked.parse !== 'function' ||
    !purify ||
    typeof purify.sanitize !== 'function'
  ) {
    return renderMarkdown;
  }
  if (typeof purify.addHook === 'function') {
    purify.addHook('afterSanitizeAttributes', (/** @type {any} */ node) => {
      if (node.tagName === 'A' && node.hasAttribute('href')) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    });
  }
  return (markdown) => purify.sanitize(marked.parse(markdown, { gfm: true, async: false }));
}
