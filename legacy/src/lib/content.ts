// cairn-core: reassemble a markdown file from frontmatter + body for committing.
//
// The inverse of the gray-matter parse the edit loader does on read. Kept as its own seam
// so a site adapter can own the on-disk serialization contract (quoting, key order)
// without the save endpoint reaching for gray-matter directly.
import matter from 'gray-matter';

/** Serialize frontmatter data + markdown body back into a file string. */
export function serializeMarkdown(frontmatter: object, body: string): string {
  return matter.stringify(body, frontmatter);
}
