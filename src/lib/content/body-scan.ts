// cairn-cms: one parse of an entry body for what the manifest build reports. The manifest's link
// graph reads only inline `link` nodes, so every other way of writing a cairn: href is invisible to
// it and to the render resolver, and ships as a dead link. This names those, and the block directive
// names, so the build can check them against the site's vocabulary.
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import { visit } from 'unist-util-visit';
import type { Root } from 'mdast';
import { parseCairnToken } from './links.js';

/** An html comment, closed or running to the end of the node. */
const HTML_COMMENT = /<!--[\s\S]*?(?:-->|$)/g;

/**
 * A cairn: href or src inside a tag. `[^>]*` crosses newlines on purpose, since a tag can span lines,
 *  and stops at `>`, so text between tags never matches.
 */
const HTML_CAIRN_HREF = /<[a-z][^>]*[\s"'](?:href|src)\s*=\s*["']?(cairn:[^"'\s>]*)/gi;

/** What one entry body holds beyond the manifest's link graph. */
export interface BodyScan {
  /** Each cairn: href that can never resolve, in document order. */
  deadHrefs: string[];
  /** Each container and leaf directive name, once. A text directive is left out: `:word` is prose. */
  directives: string[];
}

/** Scan a markdown body. A token in a code span or fence is a code node, so it is never reported. */
export function scanBody(body: string): BodyScan {
  const tree = unified().use(remarkParse).use(remarkGfm).use(remarkDirective).parse(body) as Root;
  const deadHrefs: string[] = [];
  const directives = new Set<string>();
  visit(tree, (node) => {
    if (node.type === 'link') {
      if (node.url.startsWith('cairn:') && !parseCairnToken(node.url)) deadHrefs.push(node.url);
    } else if (node.type === 'definition' || node.type === 'image') {
      if (node.url.startsWith('cairn:')) deadHrefs.push(node.url);
    } else if (node.type === 'html') {
      const html = node.value.replace(HTML_COMMENT, '');
      for (const match of html.matchAll(HTML_CAIRN_HREF)) deadHrefs.push(match[1]);
    } else if (node.type === 'containerDirective' || node.type === 'leafDirective' || node.type === 'textDirective') {
      if (node.type !== 'textDirective') directives.add(node.name);
      for (const value of Object.values(node.attributes ?? {})) {
        if (value?.startsWith('cairn:')) deadHrefs.push(value);
      }
    }
  });
  return { deadHrefs, directives: [...directives] };
}
