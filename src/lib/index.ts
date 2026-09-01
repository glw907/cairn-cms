// cairn-cms: the root package barrel (`@glw907/cairn-cms`). Everything a site's own
// `cairn.config.ts` needs to declare its adapter (`defineAdapter`, `defineConcept`, the
// field/fieldset builders, `CairnAdapter` and its member types), plus the render pipeline entry
// (`createRenderer`), the composed runtime's read surface, and the content-manifest and
// GitHub-backend primitives a build script or the delivery layer calls. Auth landed in Plan 01,
// the content model and adapter in Plan 02, and the GitHub read-and-commit backend in Plan 03. A
// SvelteKit route factory belongs on `/sveltekit`, and an admin Svelte component on `/components`,
// even though a site's adapter config also feeds both: this barrel carries no server route, no
// Svelte component, and no per-request framework binding.
//
// The canonical-home rule (ratified foundations A, `canonical-home-rule` in the rulings ledger)
// governs every barrel: each name has exactly one declaring subpath, and any other barrel that
// publishes it does so as a recorded R4 re-export naming that home and the signature that requires
// it. A name below whose home is another subpath carries that note on its own export line; every
// other name here is at home. `check:surface` fails an unrecorded duplicate.
export type { Editor, EmailRecipient, EmailAttachment } from './auth/types.js';
export type { CairnEnv } from './env.js';
// Site-declared role vocabulary (extensible-roles): sites map their own role names onto the three
// engine capability levels. A zero-config site declares nothing and keeps the owner/editor default.
export { defineRoles, resolveCapability, resolveOwnerLevelRoles } from './auth/roles.js';
export type { Capability, RoleDeclaration, RolesDeclaration } from './auth/roles.js';
// The access map (admin access map and attention seams pass): one declaration a site reads twice
// (the guard and the adapter), and one authority function every enforcement and visibility point
// reads, so route gating and sidebar visibility cannot drift apart.
export { defineAccess, canReach, hasAccessRule } from './auth/access.js';
export type { AccessMap } from './auth/access.js';
export type { MagicLinkMessage, SendMagicLink, EmailSender } from './email.js';

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
  ConceptDescriptor,
  CairnRuntime,
  SiteRender,
  // `ConceptConfig.datePrefix` and `ConceptDescriptor.routing` name these (export-rule sweep,
  // C2 breaking-window pass, R4 ruling).
  RoutingRule,
  // `CairnAdapter.aiPosture` names this, so it reaches root the way every other adapter member
  // type does. `/delivery` and `/delivery/data` export it too, since that is where `buildRobots`
  // and `robotsResponse` read it.
  AiPosture,
} from './content/types.js';
export { defineConcept } from './content/concepts.js';
export { composeRuntime } from './content/compose.js';
export type { ComposeInput } from './content/compose.js';
export { parseMarkdown } from './content/frontmatter.js';
export { defineAdapter } from './content/adapter.js';
export type { StandardInput } from './content/standard-schema.js';
// The Contract v2 field vocabulary: the one live field system.
export { fields } from './content/fields.js';
export type { FieldDescriptor } from './content/fields.js';
// The field-descriptor union's fifteen arms, each named in `FieldDescriptor` and in `fields`'s own
// per-type builder signature; the export-rule sweep makes every one importable by its own name
// (C2 breaking-window pass, R4 ruling).
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
} from './content/fields.js';
export { defineFieldset } from './content/fieldset.js';
export type {
  Fieldset,
  InferFieldset,
  FieldsetOptions,
  // `FieldsetOptions.behavior` and `Fieldset.behavior` name these.
  BehaviorTable,
  FieldBehavior,
} from './content/fieldset.js';
// `ConceptConfig.datePrefix` names this granularity type.
export type { DatePrefix } from './content/ids.js';
// The committed content manifest (content-graph design). The corpus builder and the
// request-time resolver ship from the delivery entry; only the manifest's serialize and verify
// operations stay public, for a build script or a custom regenerate tool. `CairnRef` and
// `LinkResolve` name `createRenderer`'s link-resolution signature.
export type { CairnRef, LinkResolve } from './content/links.js';
export { serializeManifest, verifyManifest, verifyReferences } from './content/manifest.js';
// `Manifest.entries` names `ManifestEntry`.
export type { Manifest, ManifestEntry } from './content/manifest.js';
// Render engine (Plan 04): generic directive pipeline; sites own the component registry.
export { defineRegistry, defineComponent } from './render/registry.js';
// `ComponentDef.build`'s parameter and `.slots` name these.
export type { ComponentDef, ComponentRegistry, ComponentContext, SlotDef } from './render/registry.js';
export { renderGlyph } from './render/glyph.js';
export type { IconSet } from './render/glyph.js';
// The component-authoring helpers (iconSpan, cardShell, headRow) live on the
// @glw907/cairn-cms/render subpath, not the root barrel. rehypeDispatch is deliberately not public:
// createRenderer is the one public render pipeline, so the safe plugin ordering is the only public
// path. See docs/superpowers/specs/2026-06-05-cairn-render-authoring-surface-design.md.
export { createRenderer } from './render/pipeline.js';
// `createRenderer`'s returned `renderMarkdown`/`renderDocument` name `ResolveOptions` in their own
// `opts` parameter.
export type { RendererOptions, Renderer, DocHeading, ResolveOptions } from './render/pipeline.js';
// The `::include` fragment resolver type: `renderMarkdown`'s `resolveFragment` option and
// `SiteRender.resolveFragment` both name it, the same public-surface pattern as `LinkResolve`.
export type { FragmentResolve } from './render/resolve-include.js';
// `SiteRender` and `CairnRuntime.render` name `MediaResolve` in their own `resolveMedia` option;
// `MediaResolve`'s own parameter names `MediaRef`.
export type { MediaResolve } from './render/resolve-media.js';
// Canonical home `/media`; a recorded R4 re-export here because `MediaResolve`'s own parameter
// names it and `MediaResolve` reaches this barrel through `SiteRender`.
export type { MediaRef } from './media/reference.js';
// `Manifest.entries[].references` names `ReferenceEdge`.
export type { ReferenceEdge } from './content/references.js';

// GitHub read-and-commit backend (Plan 03).
export type { RepoFile, CommitAuthor } from './github/types.js';
export { CommitConflictError, BranchExistsError } from './github/types.js';
// The Backend seam (Contract v2 backend phase): the store interface and its default GitHub provider.
export { githubApp } from './github/backend.js';
export type { Backend, BackendProvider, GithubAppProvider, BackendCommit } from './github/backend.js';
export type { FileChange } from './github/repo.js';

// Nav tree and site-config helpers (Plan 06).
export { parseSiteConfig, readMenu, readVocabulary, SiteConfigError } from './nav/site-config.js';
// `CairnRuntime.tidy` names `TidyConfig`, whose own `conventions` field names `TidyConventions`.
export type { NavNode, SiteConfig, VocabularyEntry, TidyConfig, TidyConventions } from './nav/site-config.js';
// Canonical home `/sveltekit`; a recorded R4 re-export here because `CairnAdapter.editor.navLayout`
// names `NavLayout`, whose own union names its three member shapes in turn. Type-only imports, so
// no `/sveltekit` module ever executes here (export-rule sweep, C2 breaking-window pass, R4 ruling).
export type { NavLayout, NavLayoutEntry, NavLayoutEngineRef, NavLayoutSection } from './sveltekit/admin-nav.js';
// Canonical home `/sveltekit`; a recorded R4 re-export here because
// `CairnAdapter.editor.publishActions` and `CairnRuntime.publishActions` name it directly as
// `PublishActionEntry[]`.
export type { PublishActionEntry } from './sveltekit/publish-actions.js';
// Canonical home `/islands`; a recorded R4 re-export here because `CairnAdapter.rendering.islands`
// names it.
export type { IslandRegistry } from './islands/types.js';
// Canonical home `/media`; a recorded R4 re-export here because `AssetConfig.variants` and
// `CairnRuntime.resolvedAssets` name it.
export type { VariantSpec } from './media/transform-url.js';
