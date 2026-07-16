// cairn-cms: excerpt and word count for content summaries (public-delivery design, decision
// 5). A light markdown strip keeps summaries cheap, so a list card, an og:description, and a
// summary-mode feed read one derived excerpt without a full render.

/**
 * Reduce markdown to readable plain text: drop fenced code, directive markers, images, and markup;
 * unwrap inline code and links to their text; collapse whitespace.
 */
function toPlainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    // Directive marker lines (`::include{fragment="x"}`, a `:::name` container's fences). A leaf
    // directive carries no prose of its own, and a container's own prose is on the lines between
    // its fences, so dropping the marker lines keeps the readable text and nothing else. Without
    // this an ::include in body prose reaches the excerpt verbatim, and an entry with no explicit
    // description ships the raw directive inside its meta description.
    .replace(/^\s{0,3}:{2,}[^\n]*$/gm, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}[#>]+\s*/gm, ' ')
    .replace(/^\s{0,3}[-*+]\s+/gm, ' ')
    .replace(/[*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * A plain-text excerpt. Returns a trimmed frontmatter `description` when present, else the
 * stripped body cut at a word boundary near `maxChars` (default 200) with an ellipsis.
 */
export function deriveExcerpt(body: string, opts: { description?: string; maxChars?: number } = {}): string {
  const description = opts.description?.trim();
  if (description) return description;

  const max = opts.maxChars ?? 200;
  const text = toPlainText(body);
  if (text.length <= max) return text;

  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** Count words in the stripped body. */
export function wordCount(body: string): number {
  const text = toPlainText(body);
  return text ? text.split(/\s+/).length : 0;
}
