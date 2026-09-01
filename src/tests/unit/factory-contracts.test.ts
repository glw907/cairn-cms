// cairn-cms: the conventions pass, Task 2's compile-only proof for the six contract-first
// factory returns (ruling 2, `convention-contract-first-returns`). Each block below imports one
// factory and its declared return type by relative path (never through a package subpath; the
// shipped-subpath proof that a consumer installing the tarball sees the same shape is
// check:surface/check:consumers, not this file), then binds a call's result to the named type
// directly and back again, proving the declared contract and the factory's actual return are
// mutually assignable with no `ReturnType<typeof f>` detour anywhere in the chain. The
// CairnAdminRoutes block additionally proves the ten media-janitorial actions the membership
// decision withdraws are genuinely absent from the narrowed type, not merely unlisted, the same
// shape model `retires-task2-sanctioned-leak-replacements.test.ts` uses for a leak proof.
import { describe, it, expect } from 'vitest';
import { createCairnAdmin, createCairnAdminInternal, type CairnAdminRoutes } from '../../lib/sveltekit/cairn-admin.js';
import { createAuthRoutes, type AuthRoutes } from '../../lib/sveltekit/auth-routes.js';
import { createEditorRoutes, type EditorRoutes } from '../../lib/sveltekit/editors-routes.js';
import { createNavRoutes, type NavRoutes } from '../../lib/sveltekit/nav-routes.js';
import { createPublicRoutes, type PublicRoutes } from '../../lib/delivery/public-routes.js';
import { createSectionAction, type SectionAction } from '../../lib/sveltekit/section-action.js';
import type { CairnRuntime } from '../../lib/content/types.js';
import type { CairnEvent } from '../../lib/sveltekit/types.js';

// The one runtime test in this compile-only file, the same reason env-genericity.test.ts and
// retires-task2-sanctioned-leak-replacements.test.ts each carry one: vitest fails a `.test.ts`
// that declares no suite. The `typeOnly*` functions below never run; `npm run check` reads them.
describe('factory-contracts: contract-first declared returns (conventions pass, Task 2)', () => {
  it('is a compile-only fixture, collected so the file is a test module', () => {
    expect(true).toBe(true);
  });
});

// createCairnAdmin: CairnAdminRoutes is a hand-declared, Pick-composed contract over the
// internal wide shape (never `ReturnType<typeof createCairnAdmin>`), mutually assignable against
// the factory's own actual call-site result.
function typeOnlyCairnAdminContract(runtime: CairnRuntime): void {
  const admin: CairnAdminRoutes = createCairnAdmin(runtime);
  const roundTrip: ReturnType<typeof createCairnAdmin> = admin;
  void roundTrip;

  // The membership decision (Task 2's own ledger annotation): the ten media-janitorial actions
  // genuinely do not exist on the narrowed contract, a type-level capability withdrawal proven
  // here the same way the sanctioned-leak fixture proves a retired name's absence.
  // @ts-expect-error mediaDelete is one of the ten actions CairnAdminRoutes withdraws.
  void admin.actions.mediaDelete;
  // @ts-expect-error mediaUpdate is one of the ten actions CairnAdminRoutes withdraws.
  void admin.actions.mediaUpdate;
  // @ts-expect-error mediaLibraryUpload is one of the ten actions CairnAdminRoutes withdraws.
  void admin.actions.mediaLibraryUpload;
  // @ts-expect-error mediaReplacePreview is one of the ten actions CairnAdminRoutes withdraws.
  void admin.actions.mediaReplacePreview;
  // @ts-expect-error mediaReplace is one of the ten actions CairnAdminRoutes withdraws.
  void admin.actions.mediaReplace;
  // @ts-expect-error mediaAltPreview is one of the ten actions CairnAdminRoutes withdraws.
  void admin.actions.mediaAltPreview;
  // @ts-expect-error mediaAltPropagate is one of the ten actions CairnAdminRoutes withdraws.
  void admin.actions.mediaAltPropagate;
  // @ts-expect-error mediaBulkDelete is one of the ten actions CairnAdminRoutes withdraws.
  void admin.actions.mediaBulkDelete;
  // @ts-expect-error mediaOrphanScan is one of the ten actions CairnAdminRoutes withdraws.
  void admin.actions.mediaOrphanScan;
  // @ts-expect-error mediaOrphanPurge is one of the ten actions CairnAdminRoutes withdraws.
  void admin.actions.mediaOrphanPurge;
  // mediaUpload stays: it wraps the same uploadAction the kept `upload` action wraps, just
  // gated to the media view instead of the edit view.
  void admin.actions.mediaUpload;
}
void typeOnlyCairnAdminContract;

// createCairnAdminInternal: the wide shape the single-mount composer and the engine's own media
// components keep driving in full, module-internal (no package subpath re-exports it). Every one
// of the ten actions withdrawn above is still reachable here, proving the narrowing above is
// type-level only, never a runtime boundary.
function typeOnlyCairnAdminInternalContract(runtime: CairnRuntime): void {
  const admin = createCairnAdminInternal(runtime);
  void admin.actions.mediaDelete;
  void admin.actions.mediaUpdate;
  void admin.actions.mediaLibraryUpload;
  void admin.actions.mediaReplacePreview;
  void admin.actions.mediaReplace;
  void admin.actions.mediaAltPreview;
  void admin.actions.mediaAltPropagate;
  void admin.actions.mediaBulkDelete;
  void admin.actions.mediaOrphanScan;
  void admin.actions.mediaOrphanPurge;
}
void typeOnlyCairnAdminInternalContract;

// createAuthRoutes: AuthRoutes replaces the retired `ReturnType<typeof createAuthRoutes>` alias.
function typeOnlyAuthRoutesContract(): void {
  const auth: AuthRoutes = createAuthRoutes({ branding: { siteName: 'Site', from: 'noreply@example.com' } });
  const roundTrip: ReturnType<typeof createAuthRoutes> = auth;
  void roundTrip;
}
void typeOnlyAuthRoutesContract;

// createEditorRoutes: EditorRoutes replaces the retired `ReturnType<typeof createEditorRoutes>`.
function typeOnlyEditorRoutesContract(): void {
  const editors: EditorRoutes = createEditorRoutes();
  const roundTrip: ReturnType<typeof createEditorRoutes> = editors;
  void roundTrip;
}
void typeOnlyEditorRoutesContract;

// createNavRoutes: NavRoutes replaces the retired `ReturnType<typeof createNavRoutes>`.
function typeOnlyNavRoutesContract(runtime: CairnRuntime): void {
  const nav: NavRoutes = createNavRoutes(runtime);
  const roundTrip: ReturnType<typeof createNavRoutes> = nav;
  void roundTrip;
}
void typeOnlyNavRoutesContract;

// createPublicRoutes: PublicRoutes is the Task 1 reopen, a deliberately AUTHORED contract under
// the same name the retires pass previously removed as a mechanically derived alias.
function typeOnlyPublicRoutesContract(config: Parameters<typeof createPublicRoutes>[0]): void {
  const routes: PublicRoutes = createPublicRoutes(config);
  const roundTrip: ReturnType<typeof createPublicRoutes> = routes;
  void roundTrip;
}
void typeOnlyPublicRoutesContract;

// createSectionAction: SectionAction<Env, Db> declares the curried wrapper's own generic shape,
// never inferred from the factory's return.
function typeOnlySectionActionContract<Env, Db>(resolveDb: (env: Env | undefined) => Db | undefined): void {
  const wrap: SectionAction<Env, Db> = createSectionAction<Env, Db>({ resolveDb });
  const roundTrip: ReturnType<typeof createSectionAction<Env, Db>> = wrap;
  void roundTrip;
  const action = wrap(async () => ({ ok: true }) as const, { action: 'test', entity: 'thing' });
  action satisfies (event: CairnEvent<Env>) => Promise<unknown>;
}
void typeOnlySectionActionContract;
