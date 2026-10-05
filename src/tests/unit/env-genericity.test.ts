// cairn-cms: the env-genericity sweep's compile-only fixtures (pre-beta C1, Task 2). Each block
// below proves one public factory's return value assigns into a site's own route slot: kit's real
// `RequestEvent` or `ServerLoadEvent`, which carries no bindings, since the engine reads them from
// `cloudflare:workers`. None of the functions below ever run; `npm run check` is the only gate that
// reads them, so a fixture proves its claim by compiling, or names the exact generic conversion its
// failure forces.
import { describe, it, expect } from 'vitest';
import { createCairnAdmin, type AdminData } from '../../lib/sveltekit/cairn-admin.js';
import { createAuthGuard } from '../../lib/sveltekit/guard.js';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import { createNavRoutes } from '../../lib/sveltekit/nav-routes.js';
import { createAuthRoutes, type RequestOutcome } from '../../lib/sveltekit/auth-routes.js';
import { createEditorRoutes } from '../../lib/sveltekit/editors-routes.js';
import { loadHealth, type HealthData } from '../../lib/sveltekit/health.js';
import { createAdminAction } from '../../lib/sveltekit/admin-action.js';
import { createMediaRoute } from '../../lib/sveltekit/media-route.js';
import type { AdminShellData } from '../../lib/sveltekit/content-routes-shell.js';
import type { CairnRuntime } from '../../lib/content/types.js';
import type { RequestEvent, ServerLoadEvent } from '@sveltejs/kit';

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
    expect(typeof loadHealth).toBe('function');
    expect(typeof createAdminAction).toBe('function');
    expect(typeof createMediaRoute).toBe('function');
  });
});

/** A site's generated route event; kit's own type, with the route's params already narrowed. */
type SiteRequestEvent = RequestEvent;

/** A generated `PageServerLoad`/`LayoutServerLoad`'s event. */
type SiteServerLoadEvent = ServerLoadEvent;

/**
 * The tightened action-return shape (env-genericity finding 6, pre-beta C1 review pass): faithful
 * to SvelteKit's own generated `Actions`, whose `Action` return is `MaybePromise<Record<string,
 * any> | void>` (kit's own `OutputData` default), rather than the looser `unknown` that accepts
 * any return, checked or not. `any`, not `unknown`, matches kit exactly: an interface return type
 * with no explicit index signature (`HelpData`, `NavData`, an `ActionFailure`) is not
 * structurally assignable to `Record<string, unknown>`, the same reason kit's own default reaches
 * for `any` here.
 */
type SiteActionReturn = Record<string, any> | void | Promise<Record<string, any> | void>;

// createCairnAdmin: HIGHEST PRIORITY. Every documented site writes
// `export const actions = admin.actions;`, structurally the same assignment that produced the
// original AdminActionEvent bug this sweep follows up on.
function typeOnlyCairnAdminAssignability(): void {
  const admin = createCairnAdmin({ runtime: {} as CairnRuntime });
  admin.load satisfies (event: SiteServerLoadEvent) => Promise<AdminData>;
  admin.shellLoad satisfies (event: SiteServerLoadEvent) => Promise<{ shell: AdminShellData }>;
  admin.actions satisfies Record<string, (event: SiteRequestEvent) => SiteActionReturn>;
}
void typeOnlyCairnAdminAssignability;

// createAdminAction: the one seam the sweep ruled on with no fixture behind it (env-genericity finding
// 2, pre-beta C1 review pass). Its returned function is typed `(event: CairnEvent) => Promise<T>`;
// this proves that assigns clean into a route's generated `Actions`.
function typeOnlyAdminActionAssignability(): void {
  const action = createAdminAction(async () => ({ ok: true }) as Record<string, unknown>);
  action satisfies (event: SiteRequestEvent) => SiteActionReturn;
}
void typeOnlyAdminActionAssignability;

// createAuthGuard: annotated `: Handle`, kit's own type (the conventions pass's interop
// carve-out, `convention-interop-carve-out`), not a cairn-declared type the way every other
// factory in this sweep is. This proves a site's own generated event assigns cleanly into the
// `event` member `Handle` declares, the same check `createMediaRoute` carries below.
function typeOnlyAuthGuardAssignability(siteEvent: SiteRequestEvent): void {
  const handle = createAuthGuard();
  void handle;
  siteEvent satisfies Parameters<typeof handle>[0]['event'];
}
void typeOnlyAuthGuardAssignability;

// createContentRoutes: every returned load/action reads a CairnEvent. Plain
// SiteRequestEvent covers it: with no generated `$app/types` in this repo, kit's own
// `RequestEvent['params']` already resolves to `Record<string, string>` (verified directly:
// `RequestEvent<AppLayoutParams<'/'>>`'s default falls back to that shape here), so a
// params-narrowing override would be a no-op. A generated app narrows `params` per route instead,
// always to a subtype of `Record<string, string>`, so this stays a faithful stand-in there too.
// Since foundations B narrowed the public return, this pin covers 25 members, not the old 35. The
// ten media-janitorial actions are covered transitively by the `admin.actions` pin above, which is
// where the composer registers them; do not re-add them here, since the public factory's declared
// `ContentRoutes` no longer carries them and naming one would simply fail to compile.
function typeOnlyContentRoutesAssignability(): void {
  const routes = createContentRoutes({ runtime: {} as CairnRuntime });
  routes satisfies Record<string, (event: SiteRequestEvent) => SiteActionReturn>;
}
void typeOnlyContentRoutesAssignability;

// createNavRoutes: navLoad/navSaveAction both read the same CairnEvent slot as content-routes.
// Checked per member, not as a whole against Record<string, X>, since NavRoutes is now a
// hand-declared interface (the conventions pass, contract-first returns) rather than a `Pick`-
// derived mapped type; a plain interface carries no index signature, so the same
// Record<string, X> cast the Pick-derived ContentRoutes tolerates above does not apply here,
// mirroring AuthRoutes' and EditorRoutes' own per-member checks below.
function typeOnlyNavRoutesAssignability(): void {
  const nav = createNavRoutes({ runtime: {} as CairnRuntime });
  nav.navLoad satisfies (event: SiteRequestEvent) => unknown;
  nav.navSaveAction satisfies (event: SiteRequestEvent) => unknown;
}
void typeOnlyNavRoutesAssignability;

// createAuthRoutes: every handler reads a CairnEvent, the event shape a site's
// /admin/auth/* route shims assign from their own SiteRequestEvent.
function typeOnlyAuthRoutesAssignability(): void {
  const auth = createAuthRoutes({ branding: { siteName: 'Site', from: 'noreply@example.com' } });
  auth.requestAction satisfies (event: SiteRequestEvent) => Promise<RequestOutcome>;
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

// loadHealth: takes CairnEvent (C2 breaking-window, R4), checked against the same
// SiteServerLoadEvent a site's `/admin/healthz` route load calls it with.
function typeOnlyHealthLoadAssignability(siteEvent: SiteServerLoadEvent, runtime: CairnRuntime): void {
  loadHealth(siteEvent, runtime) satisfies Promise<HealthData>;
}
void typeOnlyHealthLoadAssignability;

// createMediaRoute: excluded from the sweep proper (its public signature is kit's own
// RequestHandler, not a cairn-declared type), so this closes the coverage gap with the same
// local mirror createAuthGuard's fixture uses above.
type SiteRequestHandler = (event: SiteRequestEvent) => Promise<Response> | Response;

function typeOnlyMediaRouteAssignability(runtime: CairnRuntime): void {
  const handler = createMediaRoute({ runtime });
  handler satisfies SiteRequestHandler;
}
void typeOnlyMediaRouteAssignability;
