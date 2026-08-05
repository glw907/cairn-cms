// cairn-cms: the server-safe data half of /delivery; everything here imports no Svelte. The pure
// corpus projections a SvelteKit site or a plain-Node tool reads, with no @sveltejs/kit and no
// .svelte in the graph. The full ./delivery barrel re-exports this and adds the route loaders. A
// SvelteKit-route-facing loader belongs on /delivery instead, even one built from these same
// projections, and a rendering component on /delivery/head, so this barrel stays importable from
// plain Node with no kit or Svelte dependency resolved.
export type { ContentSummary, ContentEntry, ContentIndex, ContentProblem } from './content-index.js';
// `buildSiteManifest`, `createSiteIndexes`, and `SiteIndexes`/`SiteGlobs` all name the
// content-model types their generic bounds derive from; the export-rule sweep makes each
// importable from this subpath directly, not only from root (C2 breaking-window pass, R4 ruling).
// `CairnAdapter` itself is the one deliberate exception: its own structural body reaches
// `roles`/`access`/`backend`, which in turn name auth/github-shaped types this backend-free
// barrel may not import (this file's own charter above, enforced by
// `delivery-entry-boundary.test.ts`), and a call site names `A` by inference from its own
// adapter argument in practice, never by writing `CairnAdapter` out.
export type {
  ConceptConfig,
  ConceptDescriptor,
  NamedField,
  RoutingRule,
  AssetConfig,
  SenderConfig,
  NavMenuConfig,
  PreviewConfig,
  ValidationResult,
  ValidationIssue,
  SiteRender,
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
export type { ComponentRegistry, ComponentDef, ComponentContext, SlotDef } from '../render/registry.js';
export type { IconSet } from '../render/glyph.js';
export type { IslandRegistry } from '../islands/types.js';
export type { VariantSpec } from '../media/transform-url.js';
export type { MediaResolve } from '../render/resolve-media.js';
export type { MediaRef } from '../media/reference.js';
export type { NavLayout, NavLayoutEntry, NavLayoutEngineRef, NavLayoutSection } from '../sveltekit/admin-nav.js';
export type { PublishActionsConfig, PublishActionEntry } from '../sveltekit/publish-actions.js';
export { buildLinkResolver, buildFragmentResolver, resolveReferences } from './site-resolver.js';
export type { SiteResolver, ResolvedReference } from './site-resolver.js';
export { createSiteIndexes } from './site-indexes.js';
export type { SiteIndexes, SiteGlobs } from './site-indexes.js';
export { siteDescriptors } from './site-descriptors.js';
export { deriveExcerpt } from '../content/excerpt.js';
export { buildRssFeed, buildJsonFeed } from './feeds.js';
export type { FeedChannel, FeedItem } from './feeds.js';
export { buildSitemap, unlistedRoutes } from './sitemap.js';
export type { SitemapUrl } from './sitemap.js';
export { feedView, sitemapView } from './views.js';
export { buildRobots } from './robots.js';
export { AI_CRAWLERS, AI_CRAWLERS_REVIEWED } from './ai-crawlers.js';
export type { AiCrawler } from './ai-crawlers.js';
export { buildSeoMeta } from './seo.js';
export type { SeoInput, SeoMeta } from './seo.js';
export { readSeoFields, resolveImageUrl } from './seo-fields.js';
export type { SeoFields } from './seo-fields.js';
export { rssResponse, jsonFeedResponse, sitemapResponse, robotsResponse } from './responses.js';
export { jsonLdScript } from './json-ld.js';
export { buildSiteManifest, newlyPublishedEntries } from './manifest.js';
export { parseManifest } from '../content/manifest.js';
export type { Manifest, ManifestEntry } from '../content/manifest.js';
