// cairn-cms: the compile-only hand-mount fixture for the narrowed public `ContentRoutes`
// (foundations B, Task 1). It wires every member of the narrow public set the way
// `docs/reference/sveltekit.md` teaches a site to wire it: each load into a generated
// `PageServerLoad`/`LayoutServerLoad` slot, each action into kit's own `Actions` record. Nothing
// below ever runs; `npm run check` is the gate that reads it, so a fixture proves its claim by
// compiling. Dropping a member from `ContentRoutes` reds this file, which is the narrow direction
// of the proof. The too-wide direction is carried by `check:surface`: the ten media-janitorial
// actions must stay absent from the rendered `/sveltekit` shape in
// `docs/internal/api-surface.md`.
//
// This file imports the source module, not the package barrel, so it proves the SOURCE type. It
// mirrors `env-genericity.test.ts`'s local platform override rather than a `declare global
// App.Platform`, which would leak the simulated platform typing across the whole suite's compile.
import { describe, it, expect } from 'vitest';
import { createContentRoutes, type ContentRoutes } from '../../lib/sveltekit/content-routes.js';
import type { AdminShellData } from '../../lib/sveltekit/content-routes-core.js';
import type { CairnPlatformBindings, CairnMediaBindings } from '../../lib/sveltekit/platform-bindings.js';
import type { CairnRuntime } from '../../lib/content/types.js';
import type { D1Database } from '@cloudflare/workers-types';
import type { Actions, RequestEvent, ServerLoadEvent } from '@sveltejs/kit';

// The one runtime test in this compile-only file. Vitest fails a `.test.ts` that declares no suite
// ("No test suite found in file"), so this block is what lets the fixtures below live in a file the
// test run also collects. It asserts only that the public factory is present and callable; the
// assignability claims are the compile-only blocks after it.
describe('content-routes hand-mount compile fixtures', () => {
  it('exposes the public content-routes factory', () => {
    expect(typeof createContentRoutes).toBe('function');
  });
});

/** A compliant site's `Platform.env`, as `platform-bindings.ts` documents it, plus one site binding. */
type SiteEnv = CairnPlatformBindings & CairnMediaBindings & { APP_DB: D1Database };

/** A site's generated `RequestEvent` once its `app.d.ts` declares `interface Platform { env: SiteEnv }`. */
type SiteRequestEvent = Omit<RequestEvent, 'platform'> & { platform: Readonly<{ env: SiteEnv }> | undefined };

/** The same local override for a generated `PageServerLoad`/`LayoutServerLoad` event. */
type SiteServerLoadEvent = Omit<ServerLoadEvent, 'platform'> & { platform: Readonly<{ env: SiteEnv }> | undefined };

// Every load in the narrow set, each pinned to the shape a site's `export const load = …` assigns
// from. `shellLoad` carries its real payload, since the shell chrome type is what a custom
// `+layout.server.ts` mount consumes; the rest pin the event slot, which is what a hand mount can
// actually get wrong.
function typeOnlyNarrowLoadsMount(routes: ContentRoutes): void {
  routes.shellLoad satisfies (event: SiteServerLoadEvent) => Promise<{ shell: AdminShellData }>;
  routes.helpLoad satisfies (event: SiteServerLoadEvent) => unknown;
  routes.indexLoad satisfies (event: SiteServerLoadEvent) => unknown;
  routes.listLoad satisfies (event: SiteServerLoadEvent) => unknown;
  routes.mediaLibraryLoad satisfies (event: SiteServerLoadEvent) => unknown;
  routes.settingsLoad satisfies (event: SiteServerLoadEvent) => unknown;
  routes.vocabularyLoad satisfies (event: SiteServerLoadEvent) => unknown;
  routes.editLoad satisfies (event: SiteServerLoadEvent) => unknown;
  routes.historyLoad satisfies (event: SiteServerLoadEvent) => unknown;
}
void typeOnlyNarrowLoadsMount;

// Every action in the narrow set, wired into kit's own `Actions` record: the exact assignment a
// site writes as `export const actions = { … }`. The action names are the ones the view components'
// named-action contracts post to, so this doubles as the hand-mount vocabulary.
function typeOnlyNarrowActionsMount(routes: ContentRoutes): void {
  const actions: Actions = {
    create: routes.createAction,
    save: routes.saveAction,
    publish: routes.publishAction,
    publishAll: routes.publishAllAction,
    discard: routes.discardAction,
    delete: routes.deleteAction,
    listDelete: routes.listDeleteAction,
    rename: routes.renameAction,
    revert: routes.revertAction,
    previewMint: routes.previewMintAction,
    previewRevoke: routes.previewRevokeAction,
    upload: routes.uploadAction,
    settingsSave: routes.settingsSaveAction,
    vocabularySave: routes.vocabularySaveAction,
    dictionaryAdd: routes.dictionaryAddAction,
    tidy: routes.tidyAction,
  };
  void actions;
}
void typeOnlyNarrowActionsMount;

// The worked example the reference page carries verbatim (`docs/reference/sveltekit.md`, the
// `[concept]/+page.server.ts` block): a concept list view mounted by hand off the public factory.
function typeOnlyReferenceExampleMounts(): void {
  const routes = createContentRoutes({} as CairnRuntime);
  routes.listLoad satisfies (event: SiteServerLoadEvent) => unknown;
  const actions: Actions = {
    create: routes.createAction,
    delete: routes.listDeleteAction,
    publishAll: routes.publishAllAction,
  };
  void actions;
}
void typeOnlyReferenceExampleMounts;

// The event slot every action reads, proved once against a site's own `RequestEvent`. Kit's
// `Actions` above already pins it, but this states the claim in the form a site hits first when it
// assigns a single action to a single route.
function typeOnlySingleActionMount(routes: ContentRoutes): void {
  routes.saveAction satisfies (event: SiteRequestEvent) => unknown;
}
void typeOnlySingleActionMount;
