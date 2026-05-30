// /admin must never be prerendered. The authed shell load lives in the (app) group, so the
// public login and auth pages a real site adds here do not run the session-requiring layout
// load and cannot loop back to /admin/login. The showcase fakes auth in hooks.server.ts.
export const prerender = false;
