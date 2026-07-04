/**
 * Rich-text paste conversion: turns a clipboard `text/html` payload into markdown for the
 * structures the editor already offers through its own toolbar and typed syntax: headings,
 * bold and italic emphasis (including Google Docs' style-attribute spans, which carry no `<b>`
 * or `<i>` tag at all), links, bulleted and numbered lists, and paragraphs. Every other
 * element (a table, an image, inline or block code, a blockquote, strikethrough, an embed) is
 * treated as plain text: its own markup drops away and only its text content survives, so a
 * rich paste never introduces a mark the toolbar cannot also produce and never leaves the
 * document in a state the markdown parser cannot read back.
 *
 * Built on the rehype/remark family the render pipeline already depends on. `rehype-parse`
 * tolerates the malformed, deeply nested markup real word processors and web pages emit (stray
 * vendor namespaces, conditional comments, unclosed tags); a hand-rolled tokenizer would have
 * to reimplement that tolerance itself for a feature this size. `rehype-remark` walks the
 * parsed tree to markdown, and `remark-stringify` (already a dependency) renders it with this
 * project's own list and emphasis marker conventions. `rehype-parse` and `rehype-remark` are
 * the two new dependencies this adds; both are official unified.js packages already in the
 * same family as `rehype-sanitize` and `remark-rehype`, which this project depends on for
 * `render()`.
 */
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeRemark, { type Options as RehypeRemarkOptions } from 'rehype-remark';
import remarkGfm from 'remark-gfm';
import remarkStringify from 'remark-stringify';
import type { Element } from 'hast';
import type { PhrasingContent } from 'mdast';

type ElementHandle = NonNullable<NonNullable<RehypeRemarkOptions['handlers']>[string]>;
type CommentHandle = NonNullable<NonNullable<RehypeRemarkOptions['nodeHandlers']>[string]>;

/** An element's inline `style` attribute, lowercased, or the empty string when it carries none. */
function styleOf(node: Element): string {
  const style = node.properties?.style;
  return typeof style === 'string' ? style.toLowerCase() : '';
}

/**
 * Whether `style` declares a bold or non-bold weight, or null when it says nothing either way.
 * Recognizes the keyword and numeric CSS forms (`bold`, `700`); a numeric weight of 600 or more
 * reads as bold, matching the browser's own bold threshold.
 */
function weightIsBold(style: string): boolean | null {
  const match = /font-weight\s*:\s*([a-z0-9]+)/.exec(style);
  if (!match) return null;
  const value = match[1];
  if (value === 'bold' || value === 'bolder') return true;
  if (value === 'normal' || value === 'lighter') return false;
  const numeric = Number.parseInt(value, 10);
  return Number.isNaN(numeric) ? null : numeric >= 600;
}

/** Whether `style` declares an italic or oblique font style, or null when it says nothing either way. */
function styleIsItalic(style: string): boolean | null {
  const match = /font-style\s*:\s*([a-z]+)/.exec(style);
  if (!match) return null;
  if (match[1] === 'italic' || match[1] === 'oblique') return true;
  if (match[1] === 'normal') return false;
  return null;
}

/**
 * Build a handler for a bold- or italic-carrying element (`b`, `strong`, `i`, `em`, or a bare
 * `span`) that reads the element's own inline style before falling back to the tag's default.
 * A Google Docs paste carries every run in a `<span style="font-weight:700;...">`, sometimes
 * inside an outer `<b style="font-weight:normal">` wrapper that cancels the tag's own default,
 * so the style always wins over the tag when it says something explicit.
 */
function styledWrap(defaultBold: boolean, defaultItalic: boolean): ElementHandle {
  return (state, node) => {
    const style = styleOf(node);
    const bold = weightIsBold(style) ?? defaultBold;
    const italic = styleIsItalic(style) ?? defaultItalic;
    // b/strong/i/em/span are all inline elements, so their converted children are always
    // phrasing content; mdast's Emphasis and Strong nodes require that narrower type for
    // their own children, which state.all's general RootContent[] return does not carry.
    let children = state.all(node) as PhrasingContent[];
    if (italic) children = [{ type: 'emphasis', children }];
    if (bold) children = [{ type: 'strong', children }];
    return children;
  };
}

/** Drop the element's own markup and keep its text content, unwrapped into the surrounding flow. */
const plainInline: ElementHandle = (state, node) => state.all(node);

/** Drop the element's own markup and keep its content as its own block(s) of plain paragraphs. */
const plainBlock: ElementHandle = (state, node) => state.toFlow(state.all(node));

/** Drop the element entirely (a rule, a form control, an embed with no useful text). */
const dropElement: ElementHandle = () => undefined;

/** Keep only an image's alt text, if any, as plain prose; the image itself is never referenced. */
const imageAltText: ElementHandle = (state, node) => {
  const alt = node.properties?.alt;
  return typeof alt === 'string' && alt.trim() !== '' ? { type: 'text', value: alt } : undefined;
};

/**
 * Element handlers for every structure outside the converted set (headings, bold/italic
 * emphasis, links, lists, and paragraphs keep their defaults). Table, quote, code, strike, and
 * embed elements each degrade to plain text per the outcome; `del`/`s`/`strike` and
 * `table`/`tr`/`td`/`th` specifically also guard against a downstream stringify error, since
 * their unconverted default maps to a GFM-only mdast node this pipeline does not otherwise
 * render.
 */
const degradeHandlers: Record<string, ElementHandle> = {
  blockquote: plainBlock,
  hr: dropElement,
  code: plainInline,
  kbd: plainInline,
  samp: plainInline,
  var: plainInline,
  tt: plainInline,
  pre: plainBlock,
  listing: plainBlock,
  plaintext: plainBlock,
  xmp: plainBlock,
  table: plainBlock,
  tr: plainBlock,
  td: plainInline,
  th: plainInline,
  del: plainInline,
  s: plainInline,
  strike: plainInline,
  mark: plainInline,
  u: plainInline,
  q: plainInline,
  dl: plainBlock,
  dt: plainInline,
  dd: plainBlock,
  img: imageAltText,
  image: imageAltText,
  input: dropElement,
  iframe: dropElement,
  audio: dropElement,
  video: dropElement,
};

/**
 * Drop an HTML comment entirely; a real-world paste's `<!--StartFragment-->` markers and Word's
 * `<!--[if ...]>` conditional comments must never surface as literal text in the document.
 */
const dropComment: CommentHandle = () => undefined;

/**
 * Convert a clipboard `text/html` payload to markdown. Returns the empty string when the markup
 * carries no convertible or plain-text content (an image-only or script-only fragment, say), so
 * the caller can fall back to the clipboard's plain-text flavor instead of pasting nothing.
 */
export function htmlToMarkdown(html: string): string {
  const file = unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeRemark, {
      handlers: {
        b: styledWrap(true, false),
        strong: styledWrap(true, false),
        i: styledWrap(false, true),
        em: styledWrap(false, true),
        span: styledWrap(false, false),
        ...degradeHandlers,
      },
      nodeHandlers: { comment: dropComment },
    })
    .use(remarkGfm)
    .use(remarkStringify, { bullet: '-', emphasis: '_' })
    .processSync(html);
  return String(file).replace(/\n+$/, '');
}
