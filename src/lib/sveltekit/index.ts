// cairn-cms: the public `/sveltekit` barrel. Everything a SvelteKit site wires into its routes:
// factories, wrappers, guards, and the data types they exchange. The guard, the admin composer,
// and the route loaders a site mounts itself. An admin Svelte component belongs on
// `/admin` instead, even though a site also wires it into a route: this barrel is server
// logic only, never a `.svelte` file.
export {
  createAuthGuard,
  requireSession,
  requireOwner,
  requireAccess,
  type AuthGuardConfig,
  type IdentityResolver,
  type ResolvedIdentity,
  type IdentityFailure,
} from './guard.js';
export {
  NO_PENDING_REQUEST_ERROR,
  type AuthRoutesConfig,
  type LoginRequestOutcome,
} from './auth-routes.js';
export { loadPreview, type PreviewData } from './preview.js';
// createMediaRoute is singular, not createMediaRoutes, because it mounts one kit handler for the
// single media catch-all route and returns a kit RequestHandler, the interop carve-out's form.
export { createMediaRoute, type MediaRouteConfig } from './media-route.js';
export type {
  AdminShellData,
  ListData,
  EditData,
  HelpData,
  WelcomeData,
  SettingsData,
  VocabularyData,
  MediaLibraryData,
  ContentRoutesConfig,
  AttentionItem,
  ContentFormFailure,
  TidyClient,
  TidyEffort,
} from './content-routes.js';
export type { NavData } from './nav-routes.js';
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
  UnauditedActionError,
  type AdminActionAudit,
  type AdminActionAuditRecord,
  type AdminActionAuditSink,
  type AdminActionContext,
} from './admin-action.js';
export { createD1AuditSink } from './audit-sink.js';
export {
  createSectionAction,
  type PlainSectionAction,
  type SectionAction,
  type SectionActionConfig,
  type SectionActionOptions,
  type SectionActionAudit,
  type SectionActionContext,
} from './section-action.js';
export { createCairnAdmin, type CairnAdminConfig, type CairnAdminRoutes, type AdminData } from './cairn-admin.js';
export { loadHealth, type HealthData } from './health.js';
export type {
  CairnEvent,
  CookieJar,
  HandleInput,
  CookieSetOptions,
  HistoryData,
  RevertOutcome,
} from './types.js';
// The binding-shaped types a site's generated `Env` satisfies; they import from here.
export type { CairnPlatformBindings, CairnMediaBindings } from './platform-bindings.js';
