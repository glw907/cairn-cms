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
// every in-use hero as orphaned and let safe-delete remove an in-use image. An image nested in a
// container field is the same kind of reference: an image inside an object, an array of images, or
// an image inside an array's object rows (the shapes `defineFieldset` admits). The extractor walks
// the declared descriptors, so each of those reads as used, not just the top-level hero.
//
// Every match is keyed by the parsed hash, the immutable truth, never the cosmetic slug, so a bare
// `media:<hash>` and a `media:<slug>.<hash>` for the same bytes collapse to one.
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import { parseMediaToken } from '../media/reference.js';
import type { FieldDescriptor } from './fields.js';
import type { ImageValue, NamedField } from './types.js';

/**
 * Feed every image `src` a field's value holds to `add`. An `image` stores an ImageValue; an `object`
 *  recurses into its declared sub-fields; an `array` recurses into each row against its item
 *  descriptor. A value that does not match its descriptor's shape contributes nothing.
 */
function addFieldImages(field: FieldDescriptor, value: unknown, add: (href: string) => void): void {
  if (field.type === 'image') {
    if (value && typeof value === 'object' && typeof (value as ImageValue).src === 'string') {
      add((value as ImageValue).src);
    }
  } else if (field.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return;
    for (const [key, sub] of Object.entries(field.fields)) {
      addFieldImages(sub, (value as Record<string, unknown>)[key], add);
    }
  } else if (field.type === 'array') {
    if (!Array.isArray(value)) return;
    for (const row of value) addFieldImages(field.item, row, add);
  }
}

/** Whether a descriptor is an image or holds one at any depth, walking the shapes `addFieldImages` reads. */
function holdsImage(field: FieldDescriptor): boolean {
  if (field.type === 'image') return true;
  if (field.type === 'object') return Object.values(field.fields).some(holdsImage);
  if (field.type === 'array') return holdsImage(field.item);
  return false;
}

/**
 * Whether any field declares an image inside a container, at any depth: an `object` holding an
 *  image, an `array` of images, an `array` of objects holding an image, and so on down, the same walk
 *  `addFieldImages` takes. The shapes a nested-aware manifest check must treat differently from a
 *  top-level hero, since a site whose only image references are nested commits no `mediaRefs` key
 *  until it regenerates.
 */
export function declaresNestedImage(fields: Iterable<FieldDescriptor>): boolean {
  for (const field of fields) {
    if ((field.type === 'object' || field.type === 'array') && holdsImage(field)) return true;
  }
  return false;
}

/**
 * The content hashes one entry references, in first-occurrence order, deduped by hash. Reads the
 *  `image.src` of every `image`-typed field, top-level or nested one level inside an `object` or an
 *  `array`, plus every body image node. A
 *  non-media or malformed token is skipped, never thrown, so a stray `![](/x.png)` does not break
 *  the manifest build. The body is parsed as mdast, so a `media:` token inside a code span or fence
 *  is never matched.
 */
export function extractMediaRefs(
  frontmatter: Record<string, unknown>,
  body: string,
  fields: NamedField[],
): string[] {
  const seen = new Set<string>();
  const hashes: string[] = [];
  const add = (href: string) => {
    const ref = parseMediaToken(href);
    if (!ref || seen.has(ref.hash)) return;
    seen.add(ref.hash);
    hashes.push(ref.hash);
  };

  // The frontmatter arm: each `image`-typed field stores an ImageValue, so read its `.src`. A
  // container field recurses into its sub-fields or rows, in row order.
  for (const field of fields) addFieldImages(field, frontmatter[field.name], add);

  // The body arm: every image node's url. A 3a figure's inner image is a real image node.
  const tree = unified().use(remarkParse).use(remarkGfm).parse(body);
  visit(tree, 'image', (node: { url?: string }) => {
    if (node.url) add(node.url);
  });

  return hashes;
}
