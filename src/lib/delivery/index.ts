// cairn-cms: the public delivery entry (@glw907/cairn-cms/delivery). The corpus projections and
// response helpers a site or a plain-Node tool reads, plus the SvelteKit catch-all route loaders.
// Nothing here loads `@sveltejs/kit` or a `.svelte` module on import, so a plain-Node script imports
// this barrel directly; `delivery-dist-spawn.test.ts` proves that against the packaged output. The
// route loaders reach kit through a dynamic import on their 404 paths, and `CairnHead` lives on
// `/public`.
export type { ContentSummary, ContentEntry, ContentIndex, ContentProblem } from './content-index.js';
// `CairnAdapter` is deliberately absent. Its body reaches `roles`, `access`, and `backend`, which
// name auth and github types this backend-free barrel may not import
// (`delivery-entry-boundary.test.ts` enforces that), and a call site names `A` by inference from
// its adapter argument. The adapter-only members resolve from their canonical homes for the same
// reason.
export type {
  ConceptConfig,
  ConceptDescriptor,
  NamedField,
  RoutingRule,
  ValidationResult,
  ValidationIssue,
  AiPosture,
} from '../content/types.js';
export type { FieldDescriptor } from '../content/fields.js';
export type {
  TextField,
  TextareaField,
  NumberField,
  SelectField,
  MultiselectField,
  UrlField,
  DateField,
  BooleanField,
  IconField,
  ImageField,
  ObjectField,
  ReferenceField,
  ArrayField,
} from '../content/fields.js';
export type { Fieldset, InferFieldset, BehaviorTable, FieldBehavior } from '../content/fieldset.js';
export type { DatePrefix } from '../content/ids.js';
export type { CairnRef, LinkResolve } from '../content/links.js';
export type { FragmentResolve } from '../render/resolve-include.js';
export type { ReferenceEdge } from '../content/references.js';
export type { SiteConfig, VocabularyEntry, TidyConfig, TidyConventions } from '../nav/site-config.js';
export {
  createSiteResolver,
  createLinkResolver,
  createFragmentResolver,
  resolveReferences,
} from './site-resolver.js';
export type {
  SiteResolver,
  TypedSiteResolver,
  UntypedSiteResolver,
} from './site-resolver.js';
export { buildSiteDescriptors } from './site-descriptors.js';
export { buildExcerpt } from '../content/excerpt.js';
export type { FeedChannel, FeedItem } from './feeds.js';
export type { SitemapUrl } from './sitemap.js';
export { buildSitemapView } from './views.js';
export { buildSeoMeta } from './seo.js';
export type { SeoInput, SeoMeta } from './seo.js';
export { readSeoFields, resolveImageUrl } from './seo-fields.js';
export type { SeoFields } from './seo-fields.js';
export { rssResponse, jsonFeedResponse, sitemapResponse, robotsResponse, markdownResponse } from './responses.js';
export { buildSiteManifest } from './manifest.js';
export type { Manifest, ManifestEntry, EntryRef, SiteManifestBuild, ManifestProblem } from '../content/manifest.js';
export { createPublicRoutes } from './public-routes.js';
export type { PublicRoutesConfig, PublicRoutes, EntryData, EntryDataOverrides } from './public-routes.js';
// `PublicRoutesConfig.render` names `SiteRender`, and its `resolveMedia` names `MediaResolve` and
// that type's `MediaRef` parameter.
export type { SiteRender } from '../content/types.js';
export type { MediaResolve } from '../render/resolve-media.js';
export type { MediaRef } from '../media/reference.js';
