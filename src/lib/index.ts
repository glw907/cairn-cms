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
  NamedField,
  ImageValue,
  ValidationResult,
  ValidationIssue,
  BackendConfig,
  SenderConfig,
  NavMenuConfig,
  PreviewConfig,
  ResolvedPreview,
  AssetConfig,
  RoutingRule,
  ConceptDescriptor,
  ConceptUrlPolicy,
  CairnExtension,
  CairnRuntime,
  AdminPanel,
  FieldTypeDef,
} from './content/types.js';
export { normalizeConcepts, findConcept, defineConcept } from './content/concepts.js';
export { composeRuntime } from './content/compose.js';
export type { ComposeInput } from './content/compose.js';
export {
  frontmatterFromForm,
  dateInputValue,
  serializeMarkdown,
  parseMarkdown,
} from './content/frontmatter.js';
export { defineAdapter } from './content/adapter.js';
export type { StandardInput, StandardSchemaV1 } from './content/standard-schema.js';
// The Contract v2 field vocabulary: the one live field system.
export { fields } from './content/fields.js';
export type {
  FieldDescriptor,
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
} from './content/fields.js';
export { fieldset, initialValues } from './content/fieldset.js';
export type { Fieldset, InferFieldset, FieldsetOptions, BehaviorTable, FieldBehavior } from './content/fieldset.js';
export {
  isValidId,
  idFromFilename,
  filenameFromId,
  slugify,
  slugFromId,
  composeDatedId,
} from './content/ids.js';
export type { DatePrefix } from './content/ids.js';
// Internal-link token and the committed content manifest (content-graph design). The corpus
// builder and the request-time resolver ship from the delivery entry; this surface is the
// grammar, the manifest operations, and their types a migrating site adopts.
export { parseCairnToken, extractCairnLinks, formatCairnToken, escapeLinkText } from './content/links.js';
export type { CairnRef, LinkResolve } from './content/links.js';
export {
  serializeManifest,
  parseManifest,
  emptyManifest,
  verifyManifest,
  verifyReferences,
  diffManifests,
  upsertEntry,
  removeEntry,
  manifestEntryFromFile,
  manifestLinkResolver,
  inboundLinks,
} from './content/manifest.js';
export type { Manifest, ManifestEntry, ManifestDiff, ManifestEntryDiff, LinkTarget, InboundLink, InboundReference } from './content/manifest.js';
export type { ReferenceEdge } from './content/references.js';
// The read-model resolution of a reference edge to its target's identity lives at the cross-concept
// site-resolver layer (a per-concept index cannot reach a different concept's entries). The resolver
// function ships from the /delivery subpath; this is the type a route reads off the resolved map.
export type { ResolvedReference } from './delivery/site-resolver.js';
// Render engine (Plan 04): generic directive pipeline; sites own the component registry.
export { defineRegistry, defineComponent, emptyValues } from './render/registry.js';
export type {
  ComponentDef,
  ComponentRegistry,
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
// The component-authoring helpers (iconSpan, cardShell, headRow, isElement, strAttr) live on the
// @glw907/cairn-cms/render subpath, not the root barrel. rehypeDispatch is deliberately not public:
// createRenderer is the one public render pipeline, so the safe plugin ordering is the only public
// path. See docs/superpowers/specs/2026-06-05-cairn-render-authoring-surface-design.md.
export { createRenderer } from './render/pipeline.js';
export type { RendererOptions } from './render/pipeline.js';

// GitHub read-and-commit backend (Plan 03).
export type { RepoRef, RepoFile, CommitAuthor, AppCredentials } from './github/types.js';
export { CommitConflictError } from './github/types.js';

// Nav tree and site-config helpers (Plan 06).
export {
  parseSiteConfig,
  extractMenu,
  setMenu,
  validateNavTree,
  MAX_NAV_NODES,
  NavValidationError,
  SiteConfigError,
} from './nav/site-config.js';
export type { NavNode, SiteConfig } from './nav/site-config.js';
