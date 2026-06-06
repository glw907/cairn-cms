// cairn-cms: the one-call descriptor helper. A delivery site needs the same per-concept descriptors
// the admin runtime uses; this delegates to the shared resolveConcepts so the pairing is one path, not
// tribal knowledge. The YAML URL policy stays the single source of truth.
import { resolveConcepts } from '../content/concepts.js';
import type { CairnAdapter, ConceptDescriptor } from '../content/types.js';
import type { SiteConfig } from '../nav/site-config.js';

/** Per-concept descriptors for a site, from its adapter content and its parsed site config. */
export function siteDescriptors(adapter: CairnAdapter, siteConfig: SiteConfig): ConceptDescriptor[] {
  return resolveConcepts(adapter.content, siteConfig);
}
