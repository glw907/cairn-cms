// cairn-cms: the root package barrel (`@glw907/cairn-cms`). Everything a site's
// `cairn.config.ts` needs to declare its adapter (`defineAdapter`, `defineConcept`, the
// field/fieldset builders, `CairnAdapter` and its member types), plus the render pipeline entry
// (`createRenderer`), the composed runtime's read surface, and the content-manifest and
// GitHub-backend primitives a build script or the delivery layer calls. A
// SvelteKit route factory belongs on `/sveltekit`, and an admin Svelte component on `/admin`,
// even though a site's adapter config also feeds both: this barrel carries no server route, no
// Svelte component, and no per-request framework binding.
//
// Every public name imports from one subpath, across all the barrels, even where a signature on
// another subpath names the type. `check:surface` fails a name exported from two subpaths.
export type { Editor, EmailRecipient, EmailAttachment } from './auth/types.js';
export type { CairnEnv } from './env.js';
// Site-declared role vocabulary (extensible-roles): sites map their role names onto the three
// engine capability levels. A zero-config site declares nothing and keeps the owner/editor default.
export { defineRoles } from './auth/roles.js';
export type { Capability, RoleDeclaration, RolesDeclaration } from './auth/roles.js';
// The access map (admin access map and attention seams pass): one declaration, made on the adapter
// and read from the runtime by the guard, the dev backend's handle, and the nav resolver, and one
// authority function every enforcement and visibility point applies, so route gating and sidebar
// visibility cannot drift apart.
export { defineAccess, canReach, hasAccessRule } from './auth/access.js';
export type { AccessMap } from './auth/access.js';
export type { MagicLinkMessage, SendMagicLink, EmailSender } from './email.js';

// Content model and adapter contract.
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
  MediaConfig,
  ConceptDescriptor,
  CairnRuntime,
  SiteRender,
  // `ConceptConfig.datePrefix` and `ConceptDescriptor.routing` name these.
  RoutingRule,
  // `CairnAdapter.aiPosture` names this, and `buildRobotsResponse` on `/delivery` reads it.
  AiPosture,
} from './content/types.js';
export { defineConcept } from './content/concepts.js';
export { composeRuntime } from './content/compose.js';
export type { ComposeInput } from './content/compose.js';
export { parseMarkdown, serializeMarkdown } from './content/frontmatter.js';
export { defineAdapter } from './content/adapter.js';
// The Contract v2 field vocabulary: the one live field system.
export { fields } from './content/fields.js';
export type { FieldDescriptor } from './content/fields.js';
// The field-descriptor union's fifteen arms, each named in `FieldDescriptor` and in `fields`'s
// per-type builder signature; every one is importable by its name.
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
} from './content/fields.js';
export type {
  Fieldset,
  InferFieldset,
  // `ConceptConfig.behavior` and `Fieldset.behavior` name these.
  BehaviorTable,
  FieldBehavior,
} from './content/fieldset.js';
// `ConceptConfig.datePrefix` names this granularity type.
export type { DatePrefix } from './content/ids.js';
// The committed content manifest (content-graph design). The corpus builder and the
// request-time resolver ship from the delivery entry. `CairnRef` and `LinkResolve` name
// `createRenderer`'s link-resolution signature.
export type { CairnRef, LinkResolve } from './content/links.js';
// `Manifest.entries` names `ManifestEntry`.
export type { Manifest, ManifestEntry } from './content/manifest.js';
// Render engine: generic directive pipeline; sites own the component registry.
export { defineRegistry, defineComponent } from './render/registry.js';
export { previewMarkdown } from './render/component-grammar.js';
// `ComponentDef.build`'s parameter and `.slots` name these.
export type { ComponentDef, ComponentRegistry, ComponentContext, SlotDef } from './render/registry.js';
export { renderGlyph } from './render/glyph.js';
export type { IconSet } from './render/glyph.js';
// rehypeDispatch is deliberately not public: createRenderer is the one public render pipeline, so
// the safe plugin ordering is the only public path.
export { createRenderer } from './render/pipeline.js';
// `Renderer`'s `render`/`renderDocument` name `RenderInput`, which spreads `ResolveOptions`.
export type { RendererConfig, Renderer, RenderInput, DocHeading, ResolveOptions } from './render/pipeline.js';
// The `::include` fragment resolver type: `RenderInput.resolveFragment` and
// `SiteRender.resolveFragment` both name it, the same public-surface pattern as `LinkResolve`.
export type { FragmentResolve } from './render/resolve-include.js';
// `SiteRender` names `MediaResolve` in its `resolveMedia` option. `MediaResolve`'s parameter names
// `MediaRef`, which imports from `/media`.
export type { MediaResolve } from './render/resolve-media.js';
// `Manifest.entries[].references` names `ReferenceEdge`.
export type { ReferenceEdge } from './content/references.js';

// GitHub read-and-commit backend.
export type { RepoFile, CommitAuthor } from './github/types.js';
export { CommitConflictError, BranchExistsError } from './github/types.js';
// The Backend seam: the store interface and its default GitHub provider.
export { createGithubApp } from './github/backend.js';
export type { Backend, BackendProvider, GithubAppProvider, BackendCommit } from './github/backend.js';
export type { FileChange } from './github/repo.js';

// Nav tree and site-config helpers.
export { parseSiteConfig, readMenu, readVocabulary, SiteConfigError } from './nav/site-config.js';
// `CairnRuntime.tidy` names `TidyConfig`, whose `conventions` field names `TidyConventions`.
export type { NavNode, SiteConfig, VocabularyEntry, TidyConfig, TidyConventions } from './nav/site-config.js';
