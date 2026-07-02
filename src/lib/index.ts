// Engine entry. Auth landed in Plan 01, the content model and adapter in Plan 02, and the
// GitHub read-and-commit backend in Plan 03; render and nav follow.
export type { Role, Editor, AuthEnv } from './auth/types.js';
export type { AuthBranding, MagicLinkMessage, SendMagicLink } from './email.js';

// Content model and adapter contract (Plan 02).
export type {
  CairnAdapter,
  ConceptConfig,
  NamedField,
  ImageValue,
  ValidationResult,
  ValidationIssue,
  SenderConfig,
  NavMenuConfig,
  PreviewConfig,
  AssetConfig,
  RoutingRule,
  ConceptDescriptor,
  ConceptUrlPolicy,
  CairnRuntime,
  SiteRender,
} from './content/types.js';
export { defineConcept } from './content/concepts.js';
export { composeRuntime } from './content/compose.js';
export type { ComposeInput } from './content/compose.js';
export { parseMarkdown } from './content/frontmatter.js';
export { defineAdapter } from './content/adapter.js';
export type { StandardInput, StandardSchemaV1 } from './content/standard-schema.js';
// The Contract v2 field vocabulary: the one live field system.
export { fields } from './content/fields.js';
export type { FieldDescriptor } from './content/fields.js';
export { fieldset } from './content/fieldset.js';
export type { Fieldset, InferFieldset, FieldsetOptions } from './content/fieldset.js';
// The committed content manifest (content-graph design). The corpus builder and the
// request-time resolver ship from the delivery entry; only the manifest's serialize and verify
// operations stay public, for a build script or a custom regenerate tool. `CairnRef` and
// `LinkResolve` name `createRenderer`'s link-resolution signature.
export type { CairnRef, LinkResolve } from './content/links.js';
export { serializeManifest, verifyManifest, verifyReferences } from './content/manifest.js';
export type { Manifest } from './content/manifest.js';
// Render engine (Plan 04): generic directive pipeline; sites own the component registry.
export { defineRegistry, defineComponent } from './render/registry.js';
export type { ComponentDef, ComponentRegistry } from './render/registry.js';
export { glyph } from './render/glyph.js';
export type { IconSet } from './render/glyph.js';
// The component-authoring helpers (iconSpan, cardShell, headRow, isElement, strAttr) live on the
// @glw907/cairn-cms/render subpath, not the root barrel. rehypeDispatch is deliberately not public:
// createRenderer is the one public render pipeline, so the safe plugin ordering is the only public
// path. See docs/superpowers/specs/2026-06-05-cairn-render-authoring-surface-design.md.
export { createRenderer } from './render/pipeline.js';
export type { RendererOptions } from './render/pipeline.js';

// GitHub read-and-commit backend (Plan 03).
export type { RepoFile, CommitAuthor } from './github/types.js';
export { CommitConflictError } from './github/types.js';
// The Backend seam (Contract v2 backend phase): the store interface and its default GitHub provider.
export { githubApp } from './github/backend.js';
export type { Backend, BackendProvider, GithubAppProvider, BackendEnv } from './github/backend.js';
export type { FileChange } from './github/repo.js';

// Nav tree and site-config helpers (Plan 06).
export { parseSiteConfig, extractMenu, extractVocabulary, SiteConfigError } from './nav/site-config.js';
export type { NavNode, SiteConfig, VocabularyEntry } from './nav/site-config.js';
