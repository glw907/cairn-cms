// cairn-cms: the full-auto typed site index (schema-source-of-truth design). It maps over a
// defineAdapter-typed adapter to give one typed per-concept index, with frontmatter typed as the
// concept's inferred schema type, plus a site resolver for the catch-all route. It is the typed
// convenience over createContentIndex and createSiteIndex, not a replacement: both stay the
// lower-level escape hatch. It imports only pure content and delivery code, so the delivery
// bundle stays backend-free.
import type { CairnAdapter, ConceptConfig } from '../content/types.js';
import type { Infer } from '../content/schema.js';
import type { SiteConfig } from '../nav/site-config.js';
import { siteDescriptors } from './site-descriptors.js';
import { createContentIndex, fromGlob } from './content-index.js';
import { createSiteIndex } from './site-index.js';
import type { ContentIndex } from './content-index.js';
import type { ConceptIndex, SiteIndex } from './site-index.js';

/** A per-concept raw glob record (`{ path: raw }`) keyed by concept id, from `import.meta.glob`. */
export type SiteGlobs<A extends CairnAdapter> = {
  [K in keyof A['content']]?: Record<string, string>;
};

/** The typed per-concept indexes plus the cross-concept `site` resolver. A concept literally named
 *  `site` is not supported, since `site` is the reserved resolver key. */
export type SiteIndexes<A extends CairnAdapter> = {
  [K in keyof A['content']]: ContentIndex<
    NonNullable<A['content'][K]> extends ConceptConfig<infer S> ? Infer<S> : Record<string, unknown>
  >;
} & { readonly site: SiteIndex };

/**
 * Build typed per-concept indexes and a site resolver from one adapter. Pass the per-concept raw
 * globs as `{ posts: import.meta.glob('...?raw', { eager: true }), ... }`; Vite needs the literal
 * glob at the call site, so the engine cannot glob on the site's behalf. `validate: false` opts out
 * of the build gate, exactly as on `createSiteIndex`.
 */
export function createSiteIndexes<const A extends CairnAdapter>(
  adapter: A,
  config: SiteConfig,
  globs: SiteGlobs<A>,
  opts: { validate?: boolean } = {},
): SiteIndexes<A> {
  const descriptors = siteDescriptors(adapter, config);
  const byConcept: Record<string, ContentIndex> = {};
  const conceptIndexes: ConceptIndex[] = [];
  for (const descriptor of descriptors) {
    const record = (globs as Record<string, Record<string, string> | undefined>)[descriptor.id] ?? {};
    const index = createContentIndex(fromGlob(record), descriptor);
    byConcept[descriptor.id] = index;
    conceptIndexes.push({ descriptor, index });
  }
  const site = createSiteIndex(conceptIndexes, opts);
  return { ...byConcept, site } as SiteIndexes<A>;
}
