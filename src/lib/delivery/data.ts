// cairn-cms: the server-safe data half of /delivery; everything here imports no Svelte. The pure
// corpus projections a SvelteKit site or a plain-Node tool reads, with no @sveltejs/kit and no
// .svelte in the graph. The full ./delivery barrel re-exports this and adds the route loaders. A
// SvelteKit-route-facing loader belongs on /delivery instead, even one built from these same
// projections, and a rendering component on /delivery/head, so this barrel stays importable from
// plain Node with no kit or Svelte dependency resolved.
export type { ContentSummary, ContentEntry, ContentIndex, ContentProblem } from './content-index.js';
// Canonical home for everything below this line is the root barrel `.`; each name is a recorded R4
// re-export here, not a second home (canonical-home rule, foundations A). `buildSiteManifest`,
// `createSiteIndexes`, and `SiteIndexes`/`SiteGlobs` all name the content-model types their generic
// bounds derive from, so a site importing only this subpath can still name what it holds.
// `CairnAdapter` itself is the one deliberate exception: its own structural body reaches
// `roles`/`access`/`backend`, which in turn name auth/github-shaped types this backend-free
// barrel may not import (this file's own charter above, enforced by
// `delivery-entry-boundary.test.ts`), and a call site names `A` by inference from its own
// adapter argument in practice, never by writing `CairnAdapter` out. That cut is why the
// adapter-only members (`AssetConfig`, `SenderConfig`, `NavMenuConfig`, `PreviewConfig`,
// `SiteRender`, the component and nav-layout types) are NOT re-exported here: nothing this subpath
// publishes names them, so they resolve from their own canonical homes instead.
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
  EmailField,
  DateField,
  DatetimeField,
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
// `PublishActionsConfig` carries an open reshape verdict (`audit-adapter-publishactionsconfig`), so
// its home stays unsettled and it is left where it is until that reshape lands; `PublishActionEntry`
// rides its declaration. Canonical home for both is `/sveltekit`.
export type { PublishActionsConfig, PublishActionEntry } from '../sveltekit/publish-actions.js';
export { createLinkResolver, createFragmentResolver, resolveReferences } from './site-resolver.js';
export type { SiteResolver, ResolvedReference } from './site-resolver.js';
export { createSiteIndexes } from './site-indexes.js';
export type { SiteIndexes, SiteGlobs } from './site-indexes.js';
export { buildSiteDescriptors } from './site-descriptors.js';
export { deriveExcerpt } from '../content/excerpt.js';
export { buildRssFeed, buildJsonFeed } from './feeds.js';
export type { FeedChannel, FeedItem } from './feeds.js';
export { buildSitemap } from './sitemap.js';
export type { SitemapUrl } from './sitemap.js';
export { buildSitemapView } from './views.js';
export { buildRobots } from './robots.js';
export { buildSeoMeta } from './seo.js';
export type { SeoInput, SeoMeta } from './seo.js';
export { readSeoFields, resolveImageUrl } from './seo-fields.js';
export type { SeoFields } from './seo-fields.js';
export { rssResponse, jsonFeedResponse, sitemapResponse, robotsResponse, markdownResponse } from './responses.js';
export { renderJsonLdScript } from './json-ld.js';
export { buildSiteManifest, diffNewlyPublished } from './manifest.js';
export { parseManifest } from '../content/manifest.js';
export type { Manifest, ManifestEntry } from '../content/manifest.js';
