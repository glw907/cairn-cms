// cairn-cms: the one-call descriptor helper. A delivery site needs the same per-concept descriptors
// the admin runtime uses; this delegates to the shared normalizeConcepts so the pairing is one path, not
// tribal knowledge. Each concept declares its routing and URL policy, the single source of truth.
// It also holds the one place a site's content files meet their concepts, so the site resolver and
// the manifest builder cannot disagree on which file belongs where.
import { normalizeConcepts } from '../content/concepts.js';
import type { CairnAdapter, ConceptDescriptor } from '../content/types.js';

/** The root every concept's `dir` sits under, the one the engine's content glob reads. */
const CONTENT_ROOT = 'src/content';

/** One concept's descriptor paired with its share of the site's raw files. */
export interface ConceptFiles {
  descriptor: ConceptDescriptor;
  files: Record<string, string>;
}

/**
 * Per-concept descriptors for a site, from its adapter content.
 * @public
 */
export function buildSiteDescriptors(adapter: CairnAdapter): ConceptDescriptor[] {
  return normalizeConcepts(adapter.content);
}

/**
 * Split a site's raw content files by concept. A file belongs to the concept whose `dir` equals its
 * parent directory, so a concept with no files gets an empty record, and adding a concept takes no
 * edit beyond its adapter entry.
 * @throws When a concept's `dir` sits outside `src/content`, or a file sits under no concept's `dir`.
 */
export function bucketConceptFiles(adapter: CairnAdapter, files: Record<string, string>): ConceptFiles[] {
  const buckets: ConceptFiles[] = buildSiteDescriptors(adapter).map((descriptor) => {
    const { id, dir } = descriptor;
    if (dir !== CONTENT_ROOT && !dir.startsWith(`${CONTENT_ROOT}/`)) {
      throw new Error(`cairn: concept "${id}" dir "${dir}" is outside ${CONTENT_ROOT}`);
    }
    return { descriptor, files: {} };
  });
  for (const [path, raw] of Object.entries(files)) {
    const parent = path.replace(/^\//, '').replace(/\/[^/]*$/, '');
    const owners = buckets.filter(({ descriptor }) => descriptor.dir === parent);
    if (owners.length === 0) {
      const dirs = buckets.map(({ descriptor }) => descriptor.dir).join(', ');
      throw new Error(`cairn: content file "${path}" sits under no concept's dir. Declared dirs: ${dirs}`);
    }
    for (const owner of owners) owner.files[path] = raw;
  }
  return buckets;
}
