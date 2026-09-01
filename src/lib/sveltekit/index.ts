// cairn-cms: the public `/sveltekit` barrel. Everything a SvelteKit site wires into its routes:
// factories, wrappers, guards, and the data types they exchange. The guard plus the auth, editor,
// content, and health route factories and functions. An admin Svelte component belongs on
// `/components` instead, even though a site also wires it into a route: this barrel is server
// logic only, never a `.svelte` file.
export { createAuthGuard, requireSession, requireOwner, requireEditor, requireAccess, type AuthGuardOptions } from './guard.js';
export {
  createAuthRoutes,
  NO_PENDING_REQUEST_ERROR,
  type AuthRoutesConfig,
  type RequestResult,
  type AuthRoutes,
} from './auth-routes.js';
export { createEditorRoutes, type EditorRoutesConfig, type EditorRoutes } from './editors-routes.js';
export { createContentRoutes, type ContentRoutes } from './content-routes.js';
export { previewMint, previewLoad, type PreviewMintOutcome, type PreviewTokenConfig, type PreviewData } from './preview.js';
export { createMediaRoute } from './media-route.js';
export type {
  AdminShellData,
  ListData,
  EditData,
  HelpData,
  WelcomeData,
  SettingsData,
  VocabularyLoadData,
  MediaLibraryData,
  ContentRoutesConfig,
  AttentionItem,
  ContentFormFailure,
  // The export-rule sweep (C2 breaking-window pass, R4 ruling): every type a route factory's
  // return type names, down to its own nested shapes, becomes importable from this subpath.
  TidyClient,
  TidyEffort,
  MediaLibraryEntry,
} from './content-routes.js';
export { createNavRoutes, type NavRoutes } from './nav-routes.js';
export type { NavLoadData } from './nav-routes.js';
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
} from './admin-nav.js';
export type { PublishActionEntry } from './publish-actions.js';
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
// `RateLimitLike`'s canonical home is `/cloudflare`; a recorded R4 re-export here because
// `SectionActionConfig`'s own budget field names it.
export {
  createSectionAction,
  type RateLimitLike,
  type SectionAction,
  type SectionActionConfig,
  type SectionActionOptions,
  type SectionActionAudit,
  type SectionActionContext,
} from './section-action.js';
export { createCairnAdmin, type CairnAdminConfig, type CairnAdminRoutes, type AdminData } from './cairn-admin.js';
export { healthLoad, type HealthData } from './health.js';
export type {
  CairnEvent,
  CookieJar,
  HandleInput,
  PlatformContext,
  CookieSetOptions,
  HistoryData,
  RevertFailure,
} from './types.js';
// Re-exported here, not just from root, so the app.d.ts Platform block can name it.
export type { CairnEnv } from '../env.js';
// `AuthBranding`'s canonical home is this subpath (settled: `audit-adapter-authbranding`
// executed, conformance pass Task 2), since `AuthRoutesConfig.branding` is the one public
// signature naming it and the root barrel no longer re-exports it. `MagicLinkMessage`,
// `SendMagicLink`, and `EmailSender` keep canonical home `.`.
export type { AuthBranding, MagicLinkMessage, SendMagicLink, EmailSender } from '../email.js';
// The binding-shaped types a site's app.d.ts intersects into its own Platform.env; /sveltekit is
// their canonical home (decision: surface-pruning Task 6).
export type { CairnPlatformBindings, CairnMediaBindings } from './platform-bindings.js';

// The export-rule sweep (C2 breaking-window pass, R4 ruling): every remaining type a factory or
// wrapper's own signature names, re-exported here so a site importing only from this subpath can
// still name the value it holds. `CairnRuntime`'s own structural body in turn names most of the
// rest below it, the same recursive closure `/delivery` and root carry.
//
// Canonical home for everything below this line is the root barrel `.`, except `MediaRef` and
// `VariantSpec` (`/media`) and `MediaLibraryEntry` (`/admin-toolkit`, above). Each is a recorded
// R4 re-export, not a second home (canonical-home rule, foundations A); the full set with its
// per-name reason is `scripts/checks/check-surface-reexports.json`, and
// `docs/internal/record/2026-08-29-foundations-a-move-set.md` records why each one survives.
// Foundations B narrowed `ContentRoutes` and re-derived this closure without shrinking the list:
// the narrowing was necessary for the media-janitorial retires, not sufficient, since
// `createCairnAdmin` still named every one of those types. The conventions pass (Task 2) narrows
// `CairnAdminRoutes` the same way, which is the remaining precondition; the retire itself (the
// list actually shrinking) is 4b's job, off the re-derivation at
// `docs/internal/record/2026-08-30-r4-rederivation.md`.
export type { AccessMap } from '../auth/access.js';
export type { Backend, BackendProvider } from '../github/backend.js';
export type {
  CairnRuntime,
  NamedField,
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
export type { InboundLink } from '../content/manifest.js';
export type { NavNode, VocabularyEntry, TidyConventions, TidyConfig } from '../nav/site-config.js';
export type { RepoFile, CommitAuthor } from '../github/types.js';
export type { FileChange } from '../github/repo.js';
export type { ComponentRegistry, ComponentDef, ComponentContext, SlotDef } from '../render/registry.js';
export type { IconSet } from '../render/glyph.js';
export type { VariantSpec } from '../media/transform-url.js';
export type { FragmentResolve } from '../render/resolve-include.js';
export type { LinkResolve } from '../content/links.js';
export type { MediaResolve } from '../render/resolve-media.js';
export type { EmailAttachment, EmailRecipient } from '../auth/types.js';
