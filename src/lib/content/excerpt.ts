// cairn-cms: excerpt and word count for content summaries (public-delivery design, decision
// 5). A light markdown strip keeps summaries cheap, so a list card, an og:description, and a
// summary-mode feed read one derived excerpt without a full render.

/**
 * A directive's marker line: the colon fence, then either a directive name or nothing at all (a
 *  container's closing fence), plus an optional `[label]` and any trailing attributes. The label is
 *  captured, because a directive's authored prose rides there: cairn serializes a component's
 *  `title` slot to `[label]`, and a component whose only slot is a title (the showcase's
 *  `pull-quote`) carries its entire text on this line. Everything outside the label is markup.
 *
 * The name-or-nothing requirement is what keeps this off ordinary prose. Colons followed by a
 *  space are not a directive, so a heading or a quote whose text merely opens with `::` keeps its
 *  words. The `\s{0,3}` bound is deliberate for the same reason: at four spaces the line is an
 *  indented code block, and its text stays literal.
 */
const DIRECTIVE_LINE = /^\s{0,3}:{2,}(?:[A-Za-z0-9_-]+(?:\[([^\]]*)\])?[^\n]*)?$/gm;

/**
 * Reduce markdown to readable plain text: drop fenced code, directive markup, images, and markers;
 * unwrap inline code, links, and directive labels to their text; collapse whitespace.
 *
 * Order carries meaning here. The blockquote strip runs before the directive strip, because a
 * directive nested in a blockquote is still a real directive and would otherwise survive its own
 * rule only to be exposed by the blockquote's. The directive strip runs before the link strip, so a
 * label holding a link is unwrapped as a label rather than smeared into the fence name.
 */
function toPlainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/^\s{0,3}[#>]+\s*/gm, ' ')
    .replace(DIRECTIVE_LINE, ' $1 ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
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
