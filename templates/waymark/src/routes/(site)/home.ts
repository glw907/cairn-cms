// The home page's split: the editor places the post list with an ordinary markdown rule (`---`),
// so the body splits at its last top-level `<hr>`. The site declares no HTML parser, so a small
// scanner walks the rendered HTML instead. It tracks element depth so a rule nested in a
// blockquote, a list, or a block's markup never counts, and it reads attribute values with their
// quotes so a `>` inside one never ends a tag early.

/** The rendered body either side of the split point; the rule itself is dropped. */
export interface SplitBody {
  before: string;
  after: string;
}

// Elements that never take a closing tag, so opening one leaves the depth unchanged.
const VOID = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
]);

// Elements whose content is raw text: a `<` inside them opens no tag.
const RAW_TEXT = new Set(['script', 'style', 'textarea', 'title']);

// The index just past the `>` that ends the tag opened at `start`, honouring quoted attribute
// values; the string's length when the tag never closes.
function tagEnd(html: string, start: number): number {
  let quote: string | null = null;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '>') {
      return i + 1;
    }
  }
  return html.length;
}

/**
 * Splits rendered HTML at its last `<hr>` that is a direct child of the body.
 *
 * @remarks
 * A rule inside any element (a blockquote, a list, a block's markup) is not a split point. With no
 * top-level rule, `before` is the whole body and `after` is empty, so the list follows the body.
 * Whitespace at the split is trimmed, so a rule that ends the body leaves `after` empty.
 */
export function splitAtLastRule(html: string): SplitBody {
  let depth = 0;
  let rule: { start: number; end: number } | null = null;
  let i = 0;

  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt === -1) break;

    if (html.startsWith('<!--', lt)) {
      const close = html.indexOf('-->', lt + 4);
      i = close === -1 ? html.length : close + 3;
      continue;
    }

    const closing = html[lt + 1] === '/';
    const nameMatch = /^[a-zA-Z][a-zA-Z0-9-]*/.exec(html.slice(lt + (closing ? 2 : 1)));
    if (!nameMatch) {
      // A doctype, a processing instruction, or a bare `<` in text.
      i = html[lt + 1] === '!' || html[lt + 1] === '?' ? tagEnd(html, lt) : lt + 1;
      continue;
    }

    const name = nameMatch[0].toLowerCase();
    const end = tagEnd(html, lt);

    if (closing) {
      depth = Math.max(0, depth - 1);
      i = end;
      continue;
    }

    const selfClosing = html[end - 2] === '/';
    if (name === 'hr' && depth === 0) {
      rule = { start: lt, end };
    } else if (RAW_TEXT.has(name) && !selfClosing) {
      // Skip the raw content up to its own closing tag, which the next pass reads as a close.
      const close = html.toLowerCase().indexOf(`</${name}`, end);
      depth++;
      i = close === -1 ? html.length : close;
      continue;
    } else if (!VOID.has(name) && !selfClosing) {
      depth++;
    }
    i = end;
  }

  if (!rule) return { before: html, after: '' };
  return { before: html.slice(0, rule.start).trimEnd(), after: html.slice(rule.end).trimStart() };
}
