// cairn-cms: the cairn: internal-link token. An internal link is a standard CommonMark link
// whose href is `cairn:<concept>/<id>`, keyed to the target's permanent filename stem so it
// survives a slug, date, or permalink change (content-graph design). This module owns the
// grammar; the render resolver (resolve-links.ts) reuses parseCairnToken.
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import type { Link } from 'mdast';
import { isValidId, splitConceptIdToken } from './ids.js';

/** A resolved reference to a content entry by its concept and permanent id. */
export interface CairnRef {
  concept: string;
  id: string;
}

/**
 * Resolve a reference to its live permalink. Returns undefined when the target is missing (the
 *  preview marks it); the build resolver throws instead, so a dangling token fails the build.
 */
export type LinkResolve = (ref: CairnRef) => string | undefined;

/** Parse a `cairn:<concept>/<id>` href, or null for any other href or a malformed token. */
export function parseCairnToken(href: string): CairnRef | null {
  if (!href.startsWith('cairn:')) return null;
  const token = splitConceptIdToken(href.slice('cairn:'.length));
  if (!token || !isValidId(token.id)) return null;
  return token;
}

/**
 * Write the `cairn:<concept>/<id>` token for a ref. The inverse of parseCairnToken, so the editor
 *  link picker and the autocomplete write exactly the form the resolver reads back.
 */
export function formatCairnToken(ref: CairnRef): string {
  return `cairn:${ref.concept}/${ref.id}`;
}

/**
 * Escape the characters that would break a markdown link's display text: a backslash and the
 *  square brackets that delimit the text. Used where a content title becomes link display text,
 *  so an unbalanced bracket in a title cannot truncate the generated link.
 */
export function escapeLinkText(text: string): string {
  return text.replace(/[\\[\]]/g, (ch) => `\\${ch}`);
}

/**
 * The cairn links a markdown body points at, in first-occurrence order, deduped by concept/id.
 *  Parses the body as mdast, so a token inside a code span or fence is never matched.
 */
export function extractCairnLinks(body: string): CairnRef[] {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(body);
  const seen = new Set<string>();
  const refs: CairnRef[] = [];
  visit(tree, 'link', (node: { url?: string }) => {
    const ref = node.url ? parseCairnToken(node.url) : null;
    if (!ref) return;
    const key = `${ref.concept}/${ref.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    refs.push(ref);
  });
  return refs;
}

/**
 * Rewrite every cairn: link whose href is exactly `oldHref` so its href becomes `newHref`, keeping
 * the display text and any link title byte-for-byte. Rename calls this to repoint a renamed entry's
 * inbound tokens. Parsed with the same remark pipeline as extractCairnLinks, so a token inside a code
 * span is not a link node and is never touched. Each matching node's source span is rewritten from
 * last to first, replacing only the `](oldHref` run so the label and title stay exact.
 */
export function rewriteCairnLink(doc: string, oldHref: string, newHref: string): string {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(doc);
  const spans: { start: number; end: number }[] = [];
  visit(tree, 'link', (node: Link) => {
    if (node.url !== oldHref) return;
    const start = node.position?.start?.offset;
    const end = node.position?.end?.offset;
    if (start == null || end == null) return;
    spans.push({ start, end });
  });
  spans.sort((a, b) => b.start - a.start);
  let out = doc;
  for (const span of spans) {
    const src = out.slice(span.start, span.end);
    const rewritten = src.replace(`](${oldHref}`, `](${newHref}`);
    out = out.slice(0, span.start) + rewritten + out.slice(span.end);
  }
  return out;
}
