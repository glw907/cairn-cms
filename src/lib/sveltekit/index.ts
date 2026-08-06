// cairn-cms: the public `/sveltekit` barrel. Everything a SvelteKit site wires into its routes:
// factories, wrappers, guards, and the data types they exchange. The guard plus the auth, editor,
// content, and health route factories and functions. An admin Svelte component belongs on
// `/components` instead, even though a site also wires it into a route: this barrel is server
// logic only, never a `.svelte` file.
export { createAuthGuard, requireSession, requireOwner, requireEditor, requireAccess, type AuthGuardOptions } from './guard.js';
export {
  createAuthRoutes,
  type AuthRoutesConfig,
  type RequestResult,
  type AuthRoutes,
  type LoginData,
  type ConfirmData,
} from './auth-routes.js';
export { createEditorRoutes, type EditorRoutesOptions, type EditorRoutes, type EditorsData } from './editors-routes.js';
export { createContentRoutes, type ContentRoutes } from './content-routes.js';
export { createMediaRoute } from './media-route.js';
export type {
  NavConcept,
  AdminShellData,
  EntrySummary,
  ListData,
  EditData,
  AdvisoryNotice,
  AdvisoryAction,
  HelpData,
  WelcomeData,
  SettingsData,
  VocabularyLoadData,
  MediaUsageInfo,
  MediaLibraryData,
  ContentRoutesOptions,
  AttentionItem,
  SaveFailure,
  DeleteRefusal,
  RenameFailure,
  CreateFailure,
  MediaDeleteRefusal,
  MediaUpdateFailure,
  MediaReplaceFailure,
  MediaAltPropagateFailure,
  MediaBulkFailure,
  ContentFormFailure,
  UploadResult,
  MediaUploadFailure,
  SettingsSaveFailure,
  VocabularySaveFailure,
  // The export-rule sweep (C2 breaking-window pass, R4 ruling): every type a route factory's
  // return type names, down to its own nested shapes, becomes importable from this subpath.
  FragmentTarget,
  TidyClient,
  TidyResult,
  DictionaryAddResult,
  MediaBulkDeleteResult,
  MediaOrphanPurgeResult,
  MediaReplacePreviewEntry,
  MediaReplacePreviewPlan,
  MediaAltPreviewPlan,
  MediaAltPreviewEntry,
  MediaLibraryEntry,
  UsageEntry,
  MediaOrphanScanResult,
  OrphanByteRow,
  BrokenRefRow,
  RepointPlacement,
  AltPlacement,
  BranchRef,
  BulkDeleteSkip,
} from './content-routes.js';
export { createNavRoutes, type NavRoutes } from './nav-routes.js';
export type { NavLoadData, NavPageOption, NavSaveFailure } from './nav-routes.js';
export type {
  NavIcon,
  ResolvedNavEntry,
  EngineScreenId,
  NavLayout,
  NavLayoutEntry,
  NavLayoutEngineRef,
  NavLayoutSection,
  ResolvedEngineNavEntry,
  ResolvedLayoutChild,
  ResolvedLayoutSection,
  ResolvedLayoutNode,
  ResolvedNavLayout,
  ResolveNavLayoutOptions,
} from './admin-nav.js';
export { validateNavLayout, resolveNavLayout } from './admin-nav.js';
export type { PublishActionEntry, PublishActionsConfig, PublishActionLink } from './publish-actions.js';
export {
  adminAction,
  UnauditedActionError,
  type AdminActionAudit,
  type AdminActionAuditRecord,
  type AdminActionAuditSink,
  type AdminActionContext,
  type AdminActionOptions,
} from './admin-action.js';
export { createD1AuditSink } from './audit-sink.js';
export {
  createSectionAction,
  type RateLimitLike,
  type SectionActionConfig,
  type SectionActionOptions,
  type SectionActionAudit,
  type SectionActionContext,
} from './section-action.js';
export { createCairnAdmin, type CairnAdminOptions, type CairnAdminRoutes, type AdminData } from './cairn-admin.js';
export { healthLoad, type HealthData } from './health.js';
export type {
  CairnEvent,
  CookieJar,
  HandleInput,
  PlatformContext,
  CookieSetOptions,
  HistoryData,
  HistoryEntry,
  RevertFailure,
} from './types.js';
// Re-exported here, not just from root, so the app.d.ts Platform block can name it.
export type { CairnEnv } from '../env.js';
export type { AuthBranding, MagicLinkMessage, SendMagicLink, EmailSender } from '../email.js';
// The binding-shaped types a site's app.d.ts intersects into its own Platform.env; /sveltekit is
// their canonical home (decision: surface-pruning Task 6).
export type { CairnPlatformBindings, CairnMediaBindings } from './platform-bindings.js';

// The export-rule sweep (C2 breaking-window pass, R4 ruling): every remaining type a factory or
// wrapper's own signature names, re-exported here so a site importing only from this subpath can
// still name the value it holds. `CairnRuntime`'s own structural body in turn names most of the
// rest below it, the same recursive closure `/delivery` and root carry.
export type { AccessMap } from '../auth/access.js';
export type { Backend, BackendProvider } from '../github/backend.js';
export type {
  CairnRuntime,
  NamedField,
  ResolvedPreview,
  ConceptDescriptor,
  SenderConfig,
  NavMenuConfig,
  AssetConfig,
  PreviewConfig,
  RoutingRule,
  ValidationResult,
  ValidationIssue,
} from '../content/types.js';
export type { FieldDescriptor } from '../content/fields.js';
// `FieldDescriptor`'s own union names each of its fifteen arms.
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
export type { Fieldset, BehaviorTable, FieldBehavior } from '../content/fieldset.js';
export type { CairnRef } from '../content/links.js';
export type { MediaRef } from '../media/reference.js';
export type { Capability, RolesDeclaration, RoleDeclaration } from '../auth/roles.js';
export type { Editor } from '../auth/types.js';
export type { MediaEntry } from '../media/manifest.js';
export type { GettingStarted } from '../content/getting-started.js';
export type { MarkdownReferenceRow } from '../components/markdown-reference.js';
export type { InboundLink, LinkTarget } from '../content/manifest.js';
export type { NavNode, VocabularyEntry, TidyConventions, TidyConfig } from '../nav/site-config.js';
export type { TidyKeyProbeResult } from './tidy-key-health.js';
export type { RepoFile, CommitAuthor } from '../github/types.js';
export type { FileChange } from '../github/repo.js';
export type { ComponentRegistry, ComponentDef, ComponentContext, SlotDef } from '../render/registry.js';
export type { IconSet } from '../render/glyph.js';
export type { VariantSpec } from '../media/transform-url.js';
export type { FragmentResolve } from '../render/resolve-include.js';
export type { LinkResolve } from '../content/links.js';
export type { MediaResolve } from '../render/resolve-media.js';
export type { EmailAttachment, EmailRecipient } from '../auth/types.js';
