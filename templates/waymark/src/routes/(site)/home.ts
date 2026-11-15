// The home page's split: the editor places the post list with an ordinary markdown rule (`---`),
// so the body splits at its last top-level `<hr>`. The site declares no HTML parser, so a small
// scanner walks the rendered HTML instead. It tracks element depth so a rule nested in a
// blockquote, a list, or a block's markup never counts, and it reads attribute values with their
// quotes so a `>` inside one never ends a tag early.
//
// WATCH: the quote handling in `tagEnd` assumes the render pipeline's stringify step always quotes
// attribute values (src/lib/render/pipeline.ts, `rehypeStringify`). If its options ever allow
// unquoted values, a `>` or quote inside one would miscount the depth here.

import type { HomeData, HomePost } from '#theme/components/ArticleView.svelte';

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
 * @remarks
 * A rule inside any element (a blockquote, a list, a block's markup) is not a split point. With no
 * top-level rule, `before` is the whole body and `after` is empty, so the list follows the body.
 * Whitespace at the split is trimmed, so a rule that ends the body leaves `after` empty. When the
 * scan ends with elements still open, or a closing tag has nothing to close, the markup cannot be
 * trusted, so the whole body is returned as `before`.
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
      // A close with nothing open means the scan lost count: list-after-body, never a wrong split.
      if (depth === 0) return { before: html, after: '' };
      depth--;
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

  // An unbalanced scan (elements left open) is as untrustworthy as an underflow.
  if (!rule || depth !== 0) return { before: html, after: '' };
  return { before: html.slice(0, rule.start).trimEnd(), after: html.slice(rule.end).trimStart() };
}

// How many of the newest posts the home page lists; the archive holds the rest.
const HOME_POST_COUNT = 3;

/**
 * Builds the theme's `home` prop from the home page's rendered body and the published posts.
 * @remarks
 * `posts` must be newest first, as `posts.all()` returns them, and must hold no draft. The list
 * keeps the newest three, and an empty list makes the theme render neither its heading nor the
 * archive link.
 */
export function buildHomeData(html: string, posts: HomePost[]): HomeData {
  return {
    posts: posts.slice(0, HOME_POST_COUNT),
    archiveUrl: '/archive/1',
    ...splitAtLastRule(html),
  };
}
