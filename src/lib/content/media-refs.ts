// cairn-cms: the media-reference extractor. Given one entry's parsed frontmatter and body, it
// returns the deduped content hashes the entry references. This is the main side of the media
// where-used index: manifestEntryFromFile records the result per entry, and the usage-index
// builder runs it directly over each open branch's edited markdown. It mirrors extractCairnLinks
// (the same remark pipeline, the same first-occurrence dedup) but visits image nodes and the
// frontmatter hero rather than link nodes.
//
// A media reference lives in two places, and both are load-bearing. Body image nodes carry the
// inline `![](media:...)` placements (a 3a :::figure also lands here, since the figure directive
// wraps a real image node). The frontmatter hero is the other site: a hero is `image: { src }` in
// frontmatter, outside the markdown body, so an extractor that visited only body nodes would read
// every in-use hero as orphaned and let safe-delete remove an in-use image.
//
// Every match is keyed by the parsed hash, the immutable truth, never the cosmetic slug, so a bare
// `media:<hash>` and a `media:<slug>.<hash>` for the same bytes collapse to one.
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import { parseMediaToken } from '../media/reference.js';
import type { FrontmatterField, ImageValue } from './types.js';

/** The content hashes one entry references, in first-occurrence order, deduped by hash. Reads the
 *  frontmatter hero `image.src` for each `image`-typed field plus every body image node. A
 *  non-media or malformed token is skipped, never thrown, so a stray `![](/x.png)` does not break
 *  the manifest build. The body is parsed as mdast, so a `media:` token inside a code span or fence
 *  is never matched. */
export function extractMediaRefs(
  frontmatter: Record<string, unknown>,
  body: string,
  fields: FrontmatterField[],
): string[] {
  const seen = new Set<string>();
  const hashes: string[] = [];
  const add = (href: string) => {
    const ref = parseMediaToken(href);
    if (!ref || seen.has(ref.hash)) return;
    seen.add(ref.hash);
    hashes.push(ref.hash);
  };

  // The frontmatter hero arm: each `image`-typed field stores an ImageValue, so read its `.src`.
  for (const field of fields) {
    if (field.type !== 'image') continue;
    const value = frontmatter[field.name];
    if (value && typeof value === 'object' && typeof (value as ImageValue).src === 'string') {
      add((value as ImageValue).src);
    }
  }

  // The body arm: every image node's url. A 3a figure's inner image is a real image node.
  const tree = unified().use(remarkParse).use(remarkGfm).parse(body);
  visit(tree, 'image', (node: { url?: string }) => {
    if (node.url) add(node.url);
  });

  return hashes;
}
