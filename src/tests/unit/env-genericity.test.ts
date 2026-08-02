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
 * every fixture below assumes. It proves NOTHING about a site whose `Platform.env` is built some
 * other way, most importantly a bare `wrangler types`-generated `Env` sourced directly from
 * `@cloudflare/workers-types` rather than through `CairnPlatformBindings`: see
 * `BareWranglerSiteEnv` below, a deliberately-disjoint stand-in that fails to assign, and is the
 * reason a site MUST intersect `CairnPlatformBindings` rather than hand-rolling a structurally
 * similar env of its own.
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
 * The KNOWN-INCOMPATIBLE case, deliberately failing (env-genericity finding 1, pre-beta C1 review
 * pass). Not a stand-in this sweep proves compatible: it models a site whose `Platform.env` is
 * built the way `wrangler types` actually generates it, straight from `@cloudflare/workers-types`,
 * never intersected with cairn's own `CairnPlatformBindings`.
 *
 * Root cause: `@cloudflare/workers-types`'s `SendEmail.send` overload returns
 * `Promise<EmailSendResult>` (`node_modules/@cloudflare/workers-types/index.d.ts`, the `SendEmail`
 * interface), while `AuthEnv['EMAIL'].send` (`../../lib/auth/types.ts:69-86`) declares
 * `Promise<void>`. `CairnPlatformBindings.EMAIL` (`../../lib/sveltekit/platform-bindings.ts:34`) is
 * typed as `NonNullable<AuthEnv['EMAIL']>`, so a bare wrangler-generated `EMAIL` binding's wider
 * return type is not assignable to the narrower one cairn declares.
 */
type BareWranglerSiteEnv = {
  AUTH_DB: D1Database;
  EMAIL: SendEmail;
  PUBLIC_ORIGIN: string;
  GITHUB_APP_PRIVATE_KEY_B64: string;
};

/**
 * The tripwire: if this line ever stops erroring, `BareWranglerSiteEnv` has started assigning into
 * `CairnPlatformBindings`, which means either `@cloudflare/workers-types` changed `SendEmail.send`'s
 * return type or `AuthEnv['EMAIL'].send` did. Either way, `npm run check` fails on an unused
 * `@ts-expect-error` (TS2578), which is the signal that this finding's constraint changed and the
 * doc comments above need revisiting, not that the fixture is broken.
 */
function typeOnlyBareWranglerEnvIsIncompatible(bare: BareWranglerSiteEnv): void {
  // @ts-expect-error known-incompatible: BareWranglerSiteEnv.EMAIL.send returns
  // Promise<EmailSendResult> (@cloudflare/workers-types), not the Promise<void> AuthEnv and
  // CairnPlatformBindings both declare. A site must intersect CairnPlatformBindings rather than
  // hand-rolling a structurally similar env straight from @cloudflare/workers-types.
  bare satisfies CairnPlatformBindings;
}
void typeOnlyBareWranglerEnvIsIncompatible;

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
// 2, pre-beta C1 review pass). Its returned function is typed `(event: AdminActionEvent<AuthEnv>)
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

// createContentRoutes: every returned load/action reads a ContentEvent (EventBase<BackendEnv>).
// Plain SiteRequestEvent covers it: with no generated `$app/types` in this repo, kit's own
// `RequestEvent['params']` already resolves to `Record<string, string>` (verified directly:
// `RequestEvent<AppLayoutParams<'/'>>`'s default falls back to that shape here), so a
// params-narrowing override would be a no-op. A generated app narrows `params` per route instead,
// always to a subtype of `Record<string, string>`, so this stays a faithful stand-in there too.
function typeOnlyContentRoutesAssignability(): void {
  const routes = createContentRoutes({} as CairnRuntime);
  routes satisfies Record<string, (event: SiteRequestEvent) => SiteActionReturn>;
}
void typeOnlyContentRoutesAssignability;

// createNavRoutes: navLoad/navSave both read the same ContentEvent slot as content-routes.
function typeOnlyNavRoutesAssignability(): void {
  const nav = createNavRoutes({} as CairnRuntime);
  nav satisfies Record<string, (event: SiteRequestEvent) => SiteActionReturn>;
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
