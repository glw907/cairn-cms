// cairn-cms: the env-genericity sweep's compile-only fixtures (pre-beta C1, Task 2). Each block
// below proves whether one public factory's return value assigns into a site's own ambient-typed
// route slot when App.Platform['env'] is a realistic compliant site's env: the documented
// `CairnPlatformBindings & CairnMediaBindings` intersection (platform-bindings.ts), plus one
// site-specific binding. This mirrors section-action.test.ts's own compile-only block (its Step 5):
// a local type override, never a `declare global App.Platform`, which would leak the simulated
// platform typing across the whole suite's compile. None of the functions below ever run;
// `npm run check` is the only gate that reads them, so a fixture proves its claim by compiling, or
// names the exact generic conversion its failure forces.
import { describe, it, expect } from 'vitest';
import { createCairnAdmin, type AdminData } from '../../lib/sveltekit/cairn-admin.js';
import { createAuthGuard } from '../../lib/sveltekit/guard.js';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import { createNavRoutes } from '../../lib/sveltekit/nav-routes.js';
import { createAuthRoutes, type RequestResult } from '../../lib/sveltekit/auth-routes.js';
import { createEditorRoutes } from '../../lib/sveltekit/editors-routes.js';
import { healthLoad, type HealthData } from '../../lib/sveltekit/health.js';
import type { CairnPlatformBindings, CairnMediaBindings } from '../../lib/sveltekit/platform-bindings.js';
import type { AdminShellData } from '../../lib/sveltekit/content-routes-core.js';
import type { CairnRuntime } from '../../lib/content/types.js';
import type { D1Database } from '@cloudflare/workers-types';
import type { RequestEvent, ServerLoadEvent, ResolveOptions } from '@sveltejs/kit';

// The one runtime test in this compile-only file. Vitest fails a `.test.ts` that declares no
// suite ("No test suite found in file"), so this block is what lets the fixtures below live in a
// file the test run also collects. It asserts only that each factory this sweep covers is present
// and callable; the assignability claims are the compile-only blocks after it.
describe('env-genericity compile fixtures', () => {
  it('exercises every public factory this sweep covers', () => {
    expect(typeof createCairnAdmin).toBe('function');
    expect(typeof createAuthGuard).toBe('function');
    expect(typeof createContentRoutes).toBe('function');
    expect(typeof createNavRoutes).toBe('function');
    expect(typeof createAuthRoutes).toBe('function');
    expect(typeof createEditorRoutes).toBe('function');
    expect(typeof healthLoad).toBe('function');
  });
});

/**
 * A realistic compliant site's Platform.env: the documented `CairnPlatformBindings &
 * CairnMediaBindings` intersection plus one site-specific binding, proving the sweep against the
 * shape a real `app.d.ts` declares rather than an ad hoc, deliberately-disjoint stand-in.
 */
type SiteEnv = CairnPlatformBindings & CairnMediaBindings & { APP_DB: D1Database };

/**
 * A site's own generated `RequestEvent` once its `app.d.ts` declares `interface Platform { env:
 * SiteEnv }`: kit's real event type, with only `platform` overridden locally, so the simulated
 * platform typing never escapes this file. Matches section-action.test.ts's own `SiteRequestEvent`.
 */
type SiteRequestEvent = Omit<RequestEvent, 'platform'> & { platform: Readonly<{ env: SiteEnv }> | undefined };

/** The same local override for a generated `PageServerLoad`/`LayoutServerLoad`'s event. */
type SiteServerLoadEvent = Omit<ServerLoadEvent, 'platform'> & { platform: Readonly<{ env: SiteEnv }> | undefined };

// createCairnAdmin: HIGHEST PRIORITY. Every documented site writes
// `export const actions = admin.actions;`, structurally the same assignment that produced the
// original AdminActionEvent bug this sweep follows up on.
function typeOnlyCairnAdminAssignability(): void {
  const admin = createCairnAdmin({} as CairnRuntime);
  admin.load satisfies (event: SiteServerLoadEvent) => Promise<AdminData>;
  admin.shellLoad satisfies (event: SiteServerLoadEvent) => Promise<{ shell: AdminShellData }>;
  admin.actions satisfies Record<string, (event: SiteRequestEvent) => unknown>;
}
void typeOnlyCairnAdminAssignability;

// createAuthGuard: prove the returned Handle assigns into sequence()'s own site-declared slot.
// Kit's own `Handle` type is not parameterizable over Env, so SiteHandle mirrors its shape with
// SiteRequestEvent standing in for RequestEvent.
type SiteHandle = (input: {
  event: SiteRequestEvent;
  resolve: (event: SiteRequestEvent, opts?: ResolveOptions) => Promise<Response> | Response;
}) => Promise<Response> | Response;

function typeOnlyAuthGuardAssignability(): void {
  const handle = createAuthGuard();
  handle satisfies SiteHandle;
}
void typeOnlyAuthGuardAssignability;

// createContentRoutes: every returned load/action reads a ContentEvent (EventBase<BackendEnv>).
// SiteContentEvent narrows SiteRequestEvent to what ContentEvent additionally requires: params as
// a plain required record (kit's own params type is route-specific and always a subtype of that).
type SiteContentEvent = Omit<SiteRequestEvent, 'params'> & { params: Record<string, string> };

function typeOnlyContentRoutesAssignability(): void {
  const routes = createContentRoutes({} as CairnRuntime);
  routes satisfies Record<string, (event: SiteContentEvent) => unknown>;
}
void typeOnlyContentRoutesAssignability;

// createNavRoutes: navLoad/navSave both read the same ContentEvent slot as content-routes.
function typeOnlyNavRoutesAssignability(): void {
  const nav = createNavRoutes({} as CairnRuntime);
  nav satisfies Record<string, (event: SiteContentEvent) => unknown>;
}
void typeOnlyNavRoutesAssignability;

// createAuthRoutes: every handler reads a RequestContext (EventBase<AuthEnv> plus cookies and
// setHeaders), the event shape a site's /admin/auth/* route shims assign from their own
// SiteRequestEvent.
function typeOnlyAuthRoutesAssignability(): void {
  const auth = createAuthRoutes({ branding: { siteName: 'Site', from: 'noreply@example.com' } });
  auth.requestAction satisfies (event: SiteRequestEvent) => Promise<RequestResult>;
  auth.loginLoad satisfies (event: SiteRequestEvent) => unknown;
  auth.confirmLoad satisfies (event: SiteRequestEvent) => unknown;
  auth.confirmAction satisfies (event: SiteRequestEvent) => Promise<never>;
  auth.logoutAction satisfies (event: SiteRequestEvent) => Promise<never>;
}
void typeOnlyAuthRoutesAssignability;

// createEditorRoutes: every handler reads the same RequestContext slot as auth-routes.
function typeOnlyEditorRoutesAssignability(): void {
  const editors = createEditorRoutes();
  editors.editorsLoad satisfies (event: SiteRequestEvent) => unknown;
  editors.addEditorAction satisfies (event: SiteRequestEvent) => unknown;
  editors.removeEditorAction satisfies (event: SiteRequestEvent) => unknown;
  editors.setRoleAction satisfies (event: SiteRequestEvent) => unknown;
}
void typeOnlyEditorRoutesAssignability;

// healthLoad: its own inline `{ platform?: { env?: BackendEnv } }` param, checked against the same
// SiteServerLoadEvent a site's `/admin/healthz` route load calls it with.
function typeOnlyHealthLoadAssignability(siteEvent: SiteServerLoadEvent, runtime: CairnRuntime): void {
  healthLoad(siteEvent, runtime) satisfies Promise<HealthData>;
}
void typeOnlyHealthLoadAssignability;
