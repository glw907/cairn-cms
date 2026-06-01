// cairn-cms: the one-call descriptor helper. A delivery site needs the same per-concept
// descriptors the admin runtime uses; this wraps the two calls that derive them so the
// pairing is not tribal knowledge. The YAML URL policy stays the single source of truth.
import { normalizeConcepts } from '../content/concepts.js';
import { urlPolicyFrom } from '../nav/site-config.js';
import type { CairnAdapter, ConceptDescriptor } from '../content/types.js';
import type { SiteConfig } from '../nav/site-config.js';

/** Per-concept descriptors for a site, from its adapter content and its parsed site config. */
export function siteDescriptors(adapter: CairnAdapter, siteConfig: SiteConfig): ConceptDescriptor[] {
  return normalizeConcepts(adapter.content, urlPolicyFrom(siteConfig));
}
