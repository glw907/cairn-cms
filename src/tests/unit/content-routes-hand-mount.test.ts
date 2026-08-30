// cairn-cms: the compile-only hand-mount fixture for the narrowed public `ContentRoutes`
// (foundations B, Task 1). It pins two things about every member of the narrow public set: that the
// member is PRESENT, and that it is ASSIGNABLE into the route slot `docs/reference/sveltekit.md`
// teaches a site to assign it into. Each load goes into kit's own `ServerLoad`, which constrains
// both the event parameter and the `OutputData` a load may return; each action goes into kit's own
// `Actions` record. That is the whole claim. This file declares no generated `$app/types`, so
// nothing here instantiates a route's real `RouteParams`, `ParentData`, or `RouteId`: it stands in
// for a generated `PageServerLoad` on the same grounds `env-genericity.test.ts:136-141` records,
// that with no generated app in this repo `RequestEvent['params']` already resolves to
// `Record<string, string>` and a generated app only ever narrows it to a subtype.
//
// Nothing below ever runs; `npm run check` is the gate that reads it, so a fixture proves its claim
// by compiling. Dropping a member from `ContentRoutes` reds this file, which is the narrow
// direction of the proof. The too-wide direction is carried by `check:surface`: the ten
// media-janitorial actions must stay absent from the rendered `/sveltekit` shape in
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
import type { Actions, RequestEvent, ServerLoad, ServerLoadEvent } from '@sveltejs/kit';

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

// Every load in the narrow set, pinned into kit's own `ServerLoad`, which is what a site's
// `export const load = …` assigns into. `ServerLoad` constrains the return as well as the event: a
// load whose output stops being a `Record<string, any> | void` reds here, not just one whose event
// slot drifts. `shellLoad` carries its real payload on top, since the shell chrome type is what a
// custom `+layout.server.ts` mount consumes.
function typeOnlyNarrowLoadsMount(routes: ContentRoutes): void {
  routes.shellLoad satisfies ServerLoad;
  routes.shellLoad satisfies (event: SiteServerLoadEvent) => Promise<{ shell: AdminShellData }>;
  routes.helpLoad satisfies ServerLoad;
  routes.indexLoad satisfies ServerLoad;
  routes.listLoad satisfies ServerLoad;
  routes.mediaLibraryLoad satisfies ServerLoad;
  routes.settingsLoad satisfies ServerLoad;
  routes.vocabularyLoad satisfies ServerLoad;
  routes.editLoad satisfies ServerLoad;
  routes.historyLoad satisfies ServerLoad;
}
void typeOnlyNarrowLoadsMount;

// Every action in the narrow set except `listDeleteAction`, wired into kit's own `Actions` record:
// the exact assignment a site writes as `export const actions = { … }`. The keys are the names the
// view components actually post to, so this doubles as the hand-mount vocabulary. `listDeleteAction`
// is absent here because it shares the one `delete` name: the engine serves a single `?/delete`
// (`ConceptList.svelte`, `DeleteDialog.svelte`, and the composer's own `delete` in
// `cairn-admin.ts`), routed to `deleteAction` from an entry route and to `listDeleteAction` from a
// list route. The list half is wired under that same name in the reference-example block below,
// which is what keeps `listDeleteAction` covered.
function typeOnlyNarrowActionsMount(routes: ContentRoutes): void {
  const actions: Actions = {
    create: routes.createAction,
    save: routes.saveAction,
    publish: routes.publishAction,
    publishAll: routes.publishAllAction,
    discard: routes.discardAction,
    delete: routes.deleteAction,
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
// `[concept]/+page.server.ts` block): a concept list view mounted by hand off the public factory,
// with `listDeleteAction` under the `delete` name that page teaches.
function typeOnlyReferenceExampleMounts(): void {
  const routes = createContentRoutes({} as CairnRuntime);
  routes.listLoad satisfies ServerLoad;
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
