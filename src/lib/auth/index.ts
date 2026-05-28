// Public surface of `@glw907/cairn-cms/auth`: the per-request factory + server-side helpers
// the site route shims and hooks delegate to. The browser client is intentionally NOT here
// (it lives component-local in LoginPage to keep better-auth's deep client types out of dist).
export { createAuth, type Auth, type AuthEnv, type AuthBranding } from './config';
export { loadSession, requireSession, confirmSignIn, signOut, type CairnUser } from './guard';
export { adminsLoad, addAdmin, removeAdmin, setAdminRole, requireOwner, type AdminsData } from './admins';
export { can, requireCapability, type Capability } from './capabilities';
