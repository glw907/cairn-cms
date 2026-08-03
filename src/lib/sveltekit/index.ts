// cairn-cms: the public `/sveltekit` barrel. Everything a SvelteKit site wires into its routes:
// factories, wrappers, guards, and the data types they exchange. The guard plus the auth, editor,
// content, and health route factories and functions. An admin Svelte component belongs on
// `/components` instead, even though a site also wires it into a route: this barrel is server
// logic only, never a `.svelte` file.
export { createAuthGuard, requireSession, requireOwner, requireEditor, requireAccess, type AuthGuardOptions } from './guard.js';
export { createAuthRoutes, type AuthRoutesConfig, type RequestResult, type AuthRoutes } from './auth-routes.js';
export { createEditorRoutes, type EditorRoutesOptions, type EditorRoutes } from './editors-routes.js';
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
  MediaDeleteRefusal,
  MediaUpdateFailure,
  MediaReplaceFailure,
  MediaAltPropagateFailure,
  MediaBulkFailure,
  ContentFormFailure,
  UploadResult,
} from './content-routes.js';
export { createNavRoutes, type NavRoutes } from './nav-routes.js';
export type { NavLoadData, NavPageOption } from './nav-routes.js';
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
  type SectionActionContext,
} from './section-action.js';
export { createCairnAdmin, type CairnAdminOptions, type CairnAdminRoutes, type AdminData } from './cairn-admin.js';
export { healthLoad, type HealthData } from './health.js';
export type { CairnEvent, CookieJar, HandleInput, PlatformContext } from './types.js';
// Re-exported here, not just from root, so the app.d.ts Platform block can name it.
export type { CairnEnv } from '../env.js';
export type { EmailSender } from '../email.js';
// The binding-shaped types a site's app.d.ts intersects into its own Platform.env; /sveltekit is
// their canonical home (decision: surface-pruning Task 6).
export type { CairnPlatformBindings, CairnMediaBindings } from './platform-bindings.js';
