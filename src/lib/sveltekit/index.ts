// SvelteKit server logic consumed by site route shims: the guard plus the auth, editor,
// content, and health route factories and functions.
export { createAuthGuard, requireSession, requireOwner, isPublicAdminPath } from './guard.js';
export { createAuthRoutes, type AuthRoutesConfig, type RequestResult } from './auth-routes.js';
export { createEditorRoutes } from './editors-routes.js';
export { createContentRoutes } from './content-routes.js';
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
  MediaUsageInfo,
  MediaLibraryData,
  ContentEvent,
  ContentRoutesDeps,
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
export { createNavRoutes } from './nav-routes.js';
export type { NavLoadData, NavPageOption, NavRoutesDeps } from './nav-routes.js';
export { parseAdminPath, type AdminView } from './admin-dispatch.js';
export type { AdminNavEntry, AdminNavIcon, ResolvedNavEntry } from './admin-nav.js';
export { createCairnAdmin, type CairnAdminDeps, type AdminData } from './cairn-admin.js';
export { healthLoad, type HealthData } from './health.js';
export type { RequestContext, CookieJar, HandleInput } from './types.js';
// Re-exported here, not from root, so the consumer's app.d.ts Platform block can name it.
export type { BackendEnv } from '../github/credentials.js';
// Re-exported here, not just from root, so the app.d.ts Platform block can name it.
export type { AuthEnv } from '../auth/types.js';
