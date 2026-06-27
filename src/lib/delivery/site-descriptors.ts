// cairn-cms: the one-call descriptor helper. A delivery site needs the same per-concept descriptors
// the admin runtime uses; this delegates to the shared resolveConcepts so the pairing is one path, not
// tribal knowledge. Each concept declares its own routing and URL policy, the single source of truth.
import { resolveConcepts } from '../content/concepts.js';
import type { CairnAdapter, ConceptDescriptor } from '../content/types.js';
import type { SiteConfig } from '../nav/site-config.js';

/**
 * Per-concept descriptors for a site, from its adapter content. The `siteConfig` parameter is retained
 *  for API stability and the menus and site name it still carries; the URL policy now lives on each
 *  concept, so it is not read here.
 */
export function siteDescriptors(adapter: CairnAdapter, siteConfig: SiteConfig): ConceptDescriptor[] {
  void siteConfig;
  return resolveConcepts(adapter.content);
}
