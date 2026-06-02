// cairn-cms: the cairn: internal-link token. An internal link is a standard CommonMark link
// whose href is `cairn:<concept>/<id>`, keyed to the target's permanent filename stem so it
// survives a slug, date, or permalink change (content-graph design). This module owns the
// grammar; the render resolver (resolve-links.ts) reuses parseCairnToken.
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import { isValidId } from './ids.js';

/** A resolved reference to a content entry by its concept and permanent id. */
export interface CairnRef {
  concept: string;
  id: string;
}

/** Resolve a reference to its live permalink. Returns undefined when the target is missing (the
 *  preview marks it); the build resolver throws instead, so a dangling token fails the build. */
export type LinkResolve = (ref: CairnRef) => string | undefined;

/** Parse a `cairn:<concept>/<id>` href, or null for any other href or a malformed token. */
export function parseCairnToken(href: string): CairnRef | null {
  if (!href.startsWith('cairn:')) return null;
  const rest = href.slice('cairn:'.length);
  const slash = rest.indexOf('/');
  if (slash <= 0) return null;
  const concept = rest.slice(0, slash);
  const id = rest.slice(slash + 1);
  if (!concept || !isValidId(id)) return null;
  return { concept, id };
}

/** The cairn links a markdown body points at, in first-occurrence order, deduped by concept/id.
 *  Parses the body as mdast, so a token inside a code span or fence is never matched. */
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
