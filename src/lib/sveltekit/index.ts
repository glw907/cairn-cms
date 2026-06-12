// SvelteKit server logic consumed by site route shims: the guard plus the auth, editor,
// content, and health route factories and functions.
export { createAuthGuard, requireSession, requireOwner } from './guard.js';
export { createAuthRoutes, type AuthRoutesConfig, type RequestResult } from './auth-routes.js';
export { createEditorRoutes } from './editors-routes.js';
export { createContentRoutes } from './content-routes.js';
export type {
  NavConcept,
  LayoutData,
  EntrySummary,
  ListData,
  EditData,
  ContentEvent,
  ContentRoutesDeps,
  SaveFailure,
  DeleteRefusal,
  RenameFailure,
  ContentFormFailure,
} from './content-routes.js';
export { createNavRoutes } from './nav-routes.js';
export type { NavLoadData, NavPageOption, NavRoutesDeps } from './nav-routes.js';
export { parseAdminPath, type AdminView } from './admin-dispatch.js';
export { createCairnAdmin, type CairnAdminDeps, type AdminData } from './cairn-admin.js';
export { healthLoad, type HealthData } from './health.js';
export type { RequestContext, CookieJar, HandleInput } from './types.js';
// Re-exported here, not from root, so the public ContentRoutesDeps consumer can name it.
export type { GithubKeyEnv } from '../github/credentials.js';
