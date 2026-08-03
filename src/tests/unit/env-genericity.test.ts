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
import { adminAction } from '../../lib/sveltekit/admin-action.js';
import { createMediaRoute } from '../../lib/sveltekit/media-route.js';
import type { CairnPlatformBindings, CairnMediaBindings } from '../../lib/sveltekit/platform-bindings.js';
import type { AdminShellData } from '../../lib/sveltekit/content-routes-core.js';
import type { CairnRuntime } from '../../lib/content/types.js';
import type { D1Database, SendEmail } from '@cloudflare/workers-types';
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
    expect(typeof adminAction).toBe('function');
    expect(typeof createMediaRoute).toBe('function');
  });
});

/**
 * A realistic COMPLIANT site's Platform.env: the documented `CairnPlatformBindings &
 * CairnMediaBindings` intersection plus one site-specific binding. This proves the sweep's pins
 * assign clean for a site that follows `platform-bindings.ts`'s own documented pattern, which
 * every fixture below assumes.
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

/**
 * A site whose `Platform.env` is built the way `wrangler types` actually generates it, straight
 * from `@cloudflare/workers-types`, never intersected with cairn's own `CairnPlatformBindings`
 * (env-genericity finding 1, pre-beta C1 review pass, resolved by the R5 env-story ruling, C2
 * breaking-window pass). This once failed to assign: `@cloudflare/workers-types`'s `SendEmail.send`
 * overload returns `Promise<EmailSendResult>`, while `CairnPlatformBindings.EMAIL` (via `CairnEnv`,
 * `../../lib/env.ts`) declared `Promise<void>`. `CairnEnv['EMAIL']` is now typed against
 * `EmailSender` (`../../lib/email.ts`), whose `send` returns `Promise<unknown>`, which structurally
 * accepts the wider Cloudflare return type with no cast. This fixture now stands for the opposite
 * claim of its old name: a bare wrangler-generated env assigns cleanly into
 * `CairnPlatformBindings` with no intersection required, so `CairnPlatformBindings` is a
 * recommended convenience preset (catches a forgotten binding at compile time), not a requirement
 * every route factory's structural typing depends on. The `satisfies` below, with no directive,
 * is what fails this test the day a return-type narrowing on either side reopens the gap.
 */
type BareWranglerSiteEnv = {
  AUTH_DB: D1Database;
  EMAIL: SendEmail;
  PUBLIC_ORIGIN: string;
  GITHUB_APP_PRIVATE_KEY_B64: string;
};

function typeOnlyBareWranglerEnvAssignsClean(bare: BareWranglerSiteEnv): void {
  bare satisfies CairnPlatformBindings;
}
void typeOnlyBareWranglerEnvAssignsClean;

/**
 * The tightened action-return shape (env-genericity finding 6, pre-beta C1 review pass): faithful
 * to SvelteKit's own generated `Actions`, whose `Action` return is `MaybePromise<Record<string,
 * any> | void>` (kit's own `OutputData` default), rather than the looser `unknown` that accepts
 * any return, checked or not. `any`, not `unknown`, matches kit exactly: an interface return type
 * with no explicit index signature (`HelpData`, `NavLoadData`, an `ActionFailure`) is not
 * structurally assignable to `Record<string, unknown>`, the same reason kit's own default reaches
 * for `any` here.
 */
type SiteActionReturn = Record<string, any> | void | Promise<Record<string, any> | void>;

// createCairnAdmin: HIGHEST PRIORITY. Every documented site writes
// `export const actions = admin.actions;`, structurally the same assignment that produced the
// original AdminActionEvent bug this sweep follows up on.
function typeOnlyCairnAdminAssignability(): void {
  const admin = createCairnAdmin({} as CairnRuntime);
  admin.load satisfies (event: SiteServerLoadEvent) => Promise<AdminData>;
  admin.shellLoad satisfies (event: SiteServerLoadEvent) => Promise<{ shell: AdminShellData }>;
  admin.actions satisfies Record<string, (event: SiteRequestEvent) => SiteActionReturn>;
}
void typeOnlyCairnAdminAssignability;

// adminAction: the one seam the sweep ruled on with no fixture behind it (env-genericity finding
// 2, pre-beta C1 review pass). Its returned function is typed `(event: AdminActionEvent<CairnEnv>)
// => Promise<T>` via the default type parameter; this proves that assigns clean into a route's
// generated `Actions`, on the same `CairnPlatformBindings` grounds as every pin above, never
// because it "does not read event.platform" (see the corrected doc comment at admin-action.ts).
function typeOnlyAdminActionAssignability(): void {
  const action = adminAction(async () => ({ ok: true }) as Record<string, unknown>);
  action satisfies (event: SiteRequestEvent) => SiteActionReturn;
}
void typeOnlyAdminActionAssignability;

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

// createContentRoutes: every returned load/action reads a CairnEvent<CairnEnv>. Plain
// SiteRequestEvent covers it: with no generated `$app/types` in this repo, kit's own
// `RequestEvent['params']` already resolves to `Record<string, string>` (verified directly:
// `RequestEvent<AppLayoutParams<'/'>>`'s default falls back to that shape here), so a
// params-narrowing override would be a no-op. A generated app narrows `params` per route instead,
// always to a subtype of `Record<string, string>`, so this stays a faithful stand-in there too.
function typeOnlyContentRoutesAssignability(): void {
  const routes = createContentRoutes({} as CairnRuntime);
  routes satisfies Record<string, (event: SiteRequestEvent) => SiteActionReturn>;
}
void typeOnlyContentRoutesAssignability;

// createNavRoutes: navLoad/navSaveAction both read the same CairnEvent slot as content-routes.
function typeOnlyNavRoutesAssignability(): void {
  const nav = createNavRoutes({} as CairnRuntime);
  nav satisfies Record<string, (event: SiteRequestEvent) => SiteActionReturn>;
}
void typeOnlyNavRoutesAssignability;

// createAuthRoutes: every handler reads a CairnEvent<CairnEnv>, the event shape a site's
// /admin/auth/* route shims assign from their own SiteRequestEvent.
function typeOnlyAuthRoutesAssignability(): void {
  const auth = createAuthRoutes({ branding: { siteName: 'Site', from: 'noreply@example.com' } });
  auth.requestAction satisfies (event: SiteRequestEvent) => Promise<RequestResult>;
  auth.loginLoad satisfies (event: SiteRequestEvent) => unknown;
  auth.confirmLoad satisfies (event: SiteRequestEvent) => unknown;
  auth.confirmAction satisfies (event: SiteRequestEvent) => Promise<never>;
  auth.logoutAction satisfies (event: SiteRequestEvent) => Promise<never>;
}
void typeOnlyAuthRoutesAssignability;

// createEditorRoutes: every handler reads the same CairnEvent slot as auth-routes.
function typeOnlyEditorRoutesAssignability(): void {
  const editors = createEditorRoutes();
  editors.editorsLoad satisfies (event: SiteRequestEvent) => unknown;
  editors.editorAddAction satisfies (event: SiteRequestEvent) => unknown;
  editors.editorRemoveAction satisfies (event: SiteRequestEvent) => unknown;
  editors.editorSetRoleAction satisfies (event: SiteRequestEvent) => unknown;
}
void typeOnlyEditorRoutesAssignability;

// healthLoad: takes CairnEvent (C2 breaking-window, R4), checked against the same
// SiteServerLoadEvent a site's `/admin/healthz` route load calls it with.
function typeOnlyHealthLoadAssignability(siteEvent: SiteServerLoadEvent, runtime: CairnRuntime): void {
  healthLoad(siteEvent, runtime) satisfies Promise<HealthData>;
}
void typeOnlyHealthLoadAssignability;

// createMediaRoute: excluded from the sweep proper (its public signature is kit's own ambient
// RequestHandler, not a cairn-declared Env-parameterized type), but its body still casts
// event.platform (env-genericity finding 6, pre-beta C1 review pass), so this closes the coverage
// gap with the same SiteHandle-style local mirror createAuthGuard's fixture uses above.
type SiteRequestHandler = (event: SiteRequestEvent) => Promise<Response> | Response;

function typeOnlyMediaRouteAssignability(runtime: CairnRuntime): void {
  const handler = createMediaRoute(runtime);
  handler satisfies SiteRequestHandler;
}
void typeOnlyMediaRouteAssignability;
