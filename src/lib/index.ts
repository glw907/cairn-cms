// Engine entry. Auth landed in Plan 01, the content model and adapter in Plan 02, and the
// GitHub read-and-commit backend in Plan 03; render and nav follow.
export { requireOrigin } from './env.js';
export type { Role, Editor, AuthEnv } from './auth/types.js';
export type { AuthBranding, MagicLinkMessage, SendMagicLink } from './email.js';
export { buildMagicLinkMessage, cloudflareSend } from './email.js';

// Content model and adapter contract (Plan 02).
export type {
  CairnAdapter,
  ConceptConfig,
  FrontmatterField,
  TextField,
  TextareaField,
  DateField,
  BooleanField,
  TagsField,
  FreeTagsField,
  ValidationResult,
  BackendConfig,
  SenderConfig,
  NavMenuConfig,
  AssetConfig,
  RoutingRule,
  ConceptDescriptor,
  ConceptUrlPolicy,
  CairnExtension,
  CairnRuntime,
  AdminPanel,
  FieldTypeDef,
} from './content/types.js';
export { CONCEPT_ROUTING, normalizeConcepts, findConcept } from './content/concepts.js';
export { composeRuntime } from './content/compose.js';
export {
  frontmatterFromForm,
  dateInputValue,
  serializeMarkdown,
  parseMarkdown,
} from './content/frontmatter.js';
export { defineFields } from './content/schema.js';
export { defineAdapter } from './content/adapter.js';
export type { ConceptSchema, Infer, InferFields, DefineFieldsOptions, StandardInput, StandardSchemaV1 } from './content/schema.js';
export {
  isValidId,
  idFromFilename,
  filenameFromId,
  slugify,
  slugFromId,
  composeDatedId,
} from './content/ids.js';
export type { DatePrefix } from './content/ids.js';
// Render engine (Plan 04): generic directive pipeline; sites own the component registry.
export { defineRegistry, emptyValues } from './render/registry.js';
export type {
  ComponentDef,
  ComponentRegistry,
  FieldType,
  AttributeField,
  SlotKind,
  SlotDef,
  ComponentValues,
} from './render/registry.js';
export { serializeComponent, parseComponent } from './render/component-grammar.js';
export { validateComponent } from './render/component-validate.js';
export type { ComponentValidation } from './render/component-validate.js';
export { buildComponentInsert, type ComponentInsert } from './render/component-insert.js';
export { generateComponentReference } from './render/component-reference.js';
export type { ReferenceOptions } from './render/component-reference.js';
export { glyph } from './render/glyph.js';
export type { IconSet } from './render/glyph.js';
export { remarkDirectiveStamp } from './render/remark-directives.js';
export {
  rehypeDispatch,
  isElement,
  strProp,
  iconSpan,
  cardShell,
  markFirstList,
} from './render/rehype-dispatch.js';
export type { MakeIcon } from './render/rehype-dispatch.js';
export { createRenderer } from './render/pipeline.js';
export type { RendererOptions } from './render/pipeline.js';

// GitHub read-and-commit backend (Plan 03).
export type { RepoRef, RepoFile, CommitAuthor, AppCredentials } from './github/types.js';
export { CommitConflictError } from './github/types.js';
export { appJwt, installationToken, signingSelfTest } from './github/signing.js';
export {
  treeUrl,
  markdownFilesIn,
  listMarkdown,
  contentsUrl,
  readRaw,
  fileSha,
  commitFile,
} from './github/repo.js';
export { appCredentials } from './github/credentials.js';
export type { GithubKeyEnv } from './github/credentials.js';

// Nav tree and site-config helpers (Plan 06).
export {
  parseSiteConfig,
  urlPolicyFrom,
  extractMenu,
  setMenu,
  validateNavTree,
  MAX_NAV_NODES,
  NavValidationError,
  SiteConfigError,
} from './nav/site-config.js';
export type { NavNode, SiteConfig } from './nav/site-config.js';

// Public content delivery (public-delivery design): the query index, syndication, and
// discovery surface that sites read. Pure builders plus the one permalink resolver; the
// SvelteKit loaders live under the /sveltekit subpath.
export { permalink } from './content/permalink.js';
export { createContentIndex, fromGlob } from './delivery/content-index.js';
export type {
  RawFile,
  ContentSummary,
  ContentEntry,
  ContentIndex,
} from './delivery/content-index.js';
export { createSiteIndex } from './delivery/site-index.js';
export type { SiteIndex, ConceptIndex } from './delivery/site-index.js';
export { createSiteIndexes } from './delivery/site-indexes.js';
export type { SiteIndexes, SiteGlobs } from './delivery/site-indexes.js';
export { deriveExcerpt, wordCount } from './delivery/excerpt.js';
export { buildRssFeed, buildJsonFeed } from './delivery/feeds.js';
export type { FeedChannel, FeedItem } from './delivery/feeds.js';
export { buildSitemap } from './delivery/sitemap.js';
export type { SitemapUrl } from './delivery/sitemap.js';
export { buildRobots } from './delivery/robots.js';
export { buildSeoMeta } from './delivery/seo.js';
export type { SeoInput, SeoMeta } from './delivery/seo.js';
export { paginate } from './delivery/paginate.js';
export type { Page } from './delivery/paginate.js';
