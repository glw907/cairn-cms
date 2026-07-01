// The single-mount admin facade. One factory closes over the composed runtime, instantiates
// the existing per-surface route factories (auth, content, editors, nav), and serves every
// admin view through the one load and one actions record a site's catch-all /admin/[...path]
// route exports. The path authority is admin-dispatch's parseAdminPath; this module only maps
// each view to the wrapped load it delegates to, and each named action validates that the
// parsed view supports it before delegating to the same wrapped factories.
import { error } from '@sveltejs/kit';
import { parseAdminPath, type AdminView } from './admin-dispatch.js';
import { createAuthRoutes } from './auth-routes.js';
import {
  createContentRoutes,
  type ContentEvent,
  type ContentRoutesDeps,
  type ListData,
  type EditData,
  type MediaLibraryData,
  type SettingsData,
  type VocabularyLoadData,
  type HelpData,
} from './content-routes.js';
import { createEditorRoutes } from './editors-routes.js';
import { createNavRoutes, type NavLoadData } from './nav-routes.js';
import type { AuthBranding, SendMagicLink } from '../email.js';
import type { AuthEnv, Editor } from '../auth/types.js';
import type { BackendEnv } from '../github/credentials.js';
import type { CairnRuntime } from '../content/types.js';
import type { CookieJar, EventBase } from './types.js';

/**
 * The structural event the single-mount load reads: the union of what the wrapped loads need
 * (ContentEvent minus params, which the dispatcher synthesizes, plus RequestContext's cookies
 * and setHeaders). A real SvelteKit RequestEvent satisfies it.
 */
export interface AdminEvent extends EventBase<BackendEnv & AuthEnv> {
  cookies: CookieJar;
  setHeaders(headers: Record<string, string>): void;
}

/**
 * Injectable dependencies. Branding defaults from the runtime's siteName and sender, so a
 *  site overrides it only to change the magic-link email identity; `send` is the same seam the
 *  underlying auth factory takes. The content backend rides `event.locals.backend` (the dev double)
 *  or the adapter's provider, so it is not a dep here.
 */
export interface CairnAdminDeps {
  branding?: AuthBranding;
  send?: SendMagicLink;
  /**
   * Build the Anthropic client for the tidy action. Forwarded to the content routes; a site that
   *  enables tidy injects a stub here to avoid a real network call. Defaults to the real SDK client.
   */
  anthropic?: ContentRoutesDeps['anthropic'];
  /** The tidy action's own request deadline in milliseconds. Forwarded to the content routes. */
  tidyTimeoutMs?: ContentRoutesDeps['tidyTimeoutMs'];
}

/**
 * One admin view's data, discriminated for the admin page component's switch. Every member
 * carries just its view's own page data; the shared chrome (nav, user, theme, pending count)
 * rides the separate shell load served through `/admin/+layout.server.ts`, not this per-view load.
 */
export type AdminData =
  | { view: 'login'; page: { siteName: string; error: string | null; csrf: string } }
  | { view: 'confirm'; page: { token: string; siteName: string; error: string | null; csrf: string } }
  | { view: 'list'; page: ListData }
  | { view: 'edit'; page: EditData }
  | { view: 'editors'; page: { editors: Editor[]; self: string } }
  | { view: 'nav'; page: NavLoadData }
  | { view: 'media'; page: MediaLibraryData }
  | { view: 'settings'; page: SettingsData }
  | { view: 'vocabulary'; page: VocabularyLoadData }
  | { view: 'help'; page: HelpData };

/**
 *
 */
export function createCairnAdmin(runtime: CairnRuntime, deps: CairnAdminDeps = {}) {
  // The runtime already composes the site name and the sender identity, so the magic-link
  // branding needs no second copy of either unless a site overrides it.
  const branding: AuthBranding = deps.branding ?? {
    siteName: runtime.siteName,
    from: runtime.sender.from,
    replyTo: runtime.sender.replyTo,
  };
  const auth = createAuthRoutes({ branding, send: deps.send });
  const content = createContentRoutes(runtime, {
    anthropic: deps.anthropic,
    tidyTimeoutMs: deps.tidyTimeoutMs,
  });
  const editors = createEditorRoutes();
  // The nav surface exists only when the site configures a menu; without one its view is a 404.
  const nav = runtime.navMenu ? createNavRoutes(runtime) : null;

  /**
   * Build the event a wrapped content load reads. The catch-all route carries only a rest
   *  param, so `concept` and `id` are synthesized from the parsed view. The override names
   *  each field explicitly rather than spreading: a real RequestEvent's fields can sit behind
   *  getters a bare spread copies poorly, and the structural ContentEvent contract needs only
   *  these.
   */
  function contentEvent(event: AdminEvent, params: Record<string, string>): ContentEvent {
    return {
      url: event.url,
      params,
      request: event.request,
      locals: event.locals,
      platform: event.platform,
      cookies: event.cookies,
    };
  }

  /**
   * Serve the admin view the pathname names, or a 404 for any shape the parser refuses.
   *  Each authed view loads only its own page data; the shared chrome rides the separate shell
   *  load (`/admin/+layout.server.ts`), so this load no longer re-fetches the nav per view.
   */
  async function load(event: AdminEvent): Promise<AdminData> {
    const view = parseAdminPath(event.url.pathname, runtime.concepts);
    if (!view) throw error(404, 'Not found');
    switch (view.view) {
      case 'index':
        return content.indexRedirect();
      case 'login':
        return { view: 'login', page: auth.loginLoad(event) };
      case 'confirm':
        return { view: 'confirm', page: auth.confirmLoad(event) };
      case 'list': {
        const delegated = contentEvent(event, { concept: view.concept.id });
        return { view: 'list', page: await content.listLoad(delegated) };
      }
      case 'edit': {
        const delegated = contentEvent(event, { concept: view.concept.id, id: view.id });
        return { view: 'edit', page: await content.editLoad(delegated) };
      }
      case 'editors': {
        // editorsLoad gates itself with requireOwner, so the dispatcher adds no second gate.
        return { view: 'editors', page: await editors.editorsLoad(event) };
      }
      case 'nav': {
        if (!nav) throw error(404, 'Not found');
        return { view: 'nav', page: await nav.navLoad(contentEvent(event, {})) };
      }
      case 'media': {
        return { view: 'media', page: await content.mediaLibraryLoad(contentEvent(event, {})) };
      }
      case 'settings': {
        return { view: 'settings', page: await content.settingsLoad(contentEvent(event, {})) };
      }
      case 'vocabulary': {
        return { view: 'vocabulary', page: await content.vocabularyLoad(contentEvent(event, {})) };
      }
      case 'help': {
        return { view: 'help', page: await content.helpLoad(contentEvent(event, {})) };
      }
    }
  }

  /**
   * Wrap a delegate in the parse-and-check every action shares: parse the pathname exactly
   *  as load does, 404 on a null parse or a view outside the allowed set, then hand the
   *  narrowed view to the delegate.
   */
  function viewAction<V extends AdminView['view'], R>(
    allowed: readonly V[],
    delegate: (event: AdminEvent, view: Extract<AdminView, { view: V }>) => Promise<R>,
  ): (event: AdminEvent) => Promise<R> {
    return async (event) => {
      const view = parseAdminPath(event.url.pathname, runtime.concepts);
      if (!view || !(allowed as readonly string[]).includes(view.view)) throw error(404, 'Not found');
      // The includes check above proves the membership the cast asserts.
      return delegate(event, view as Extract<AdminView, { view: V }>);
    };
  }

  // The shell posts publishAll from every authed admin page to the absolute /admin?/publishAll, which
  // parses to the index view, so 'index' is in the set alongside the per-view names; login and confirm
  // may not.
  const authedViews = ['index', 'list', 'edit', 'editors', 'nav', 'media', 'settings', 'vocabulary', 'help'] as const;
  // An editor signs out from wherever they are, so logout accepts any parsed view.
  const anyView = ['index', 'login', 'confirm', 'list', 'edit', 'editors', 'nav', 'media', 'settings', 'vocabulary', 'help'] as const;

  /**
   * The full admin action vocabulary, one named async function per action, so a site's
   *  catch-all route exports `admin.actions` directly. Each wrapper stays thin: parse,
   *  validate the view, synthesize the params the wrapped action reads, delegate. The
   *  editor actions gate themselves with requireOwner, so no second gate is added here.
   */
  const actions = {
    request: viewAction(['login'], (event) => auth.requestAction(event)),
    confirm: viewAction(['confirm'], (event) => auth.confirmAction(event)),
    logout: viewAction(anyView, (event) => auth.logoutAction(event)),
    create: viewAction(['list'], (event, view) => content.createAction(contentEvent(event, { concept: view.concept.id }))),
    save: viewAction(['edit', 'nav'], (event, view) => {
      if (view.view === 'edit') return content.saveAction(contentEvent(event, { concept: view.concept.id, id: view.id }));
      if (!nav) throw error(404, 'Not found');
      return nav.navSave(contentEvent(event, {}));
    }),
    // The tidy settings save (spec 2.8, Task 15): the editor commits the per-convention block to the
    // committed YAML. Gated to the settings view, so it 404s elsewhere; the action itself 404s again
    // when tidy is off, the server half of the truthful visibility gate.
    saveSettings: viewAction(['settings'], (event) => content.settingsSave(contentEvent(event, {}))),
    // The tag-vocabulary save (Plan 3): the editor commits the curated vocabulary to the committed
    // YAML, with the cross-branch delete gate failing closed. Gated to the vocabulary view.
    saveVocabulary: viewAction(['vocabulary'], (event) => content.vocabularySave(contentEvent(event, {}))),
    upload: viewAction(['edit'], (event, view) => content.uploadAction(contentEvent(event, { concept: view.concept.id, id: view.id }))),
    publish: viewAction(['edit'], (event, view) => content.publishAction(contentEvent(event, { concept: view.concept.id, id: view.id }))),
    discard: viewAction(['edit'], (event, view) => content.discardAction(contentEvent(event, { concept: view.concept.id, id: view.id }))),
    rename: viewAction(['edit'], (event, view) => content.renameAction(contentEvent(event, { concept: view.concept.id, id: view.id }))),
    // The personal-dictionary add (spec 1.6): the editor commits its pending add-to-dictionary words at
    // save time. Gated to the edit view, where the spellcheck surface lives, so it 404s elsewhere.
    addDictionaryWord: viewAction(['edit'], (event, view) =>
      content.addDictionaryWord(contentEvent(event, { concept: view.concept.id, id: view.id }))),
    // Tidy (spec 2.1): the editor posts the buffer to `?/tidy` for a light LLM copy-edit. Gated to the
    // edit view, where the review surface lives, so it 404s elsewhere.
    tidy: viewAction(['edit'], (event, view) =>
      content.tidyAction(contentEvent(event, { concept: view.concept.id, id: view.id }))),
    delete: viewAction(['edit', 'list'], (event, view) =>
      view.view === 'edit'
        ? content.deleteAction(contentEvent(event, { concept: view.concept.id, id: view.id }))
        : content.listDeleteAction(contentEvent(event, { concept: view.concept.id })),
    ),
    mediaDelete: viewAction(['media'], (event) => content.mediaDeleteAction(contentEvent(event, {}))),
    mediaUpdate: viewAction(['media'], (event) => content.mediaUpdateAction(contentEvent(event, {}))),
    // The Library is not entry-scoped, so a replace uploads its new file through the same content-
    // addressed ingest mounted media-scoped (uploadAction reads no concept/id), then previews and
    // applies the repoint. Alt propagation previews and applies the alt fill. The preview pair are 2a
    // fetch actions; the apply pair are form posts. All gate on the media view.
    mediaUpload: viewAction(['media'], (event) => content.uploadAction(contentEvent(event, {}))),
    mediaLibraryUpload: viewAction(['media'], (event) => content.mediaLibraryUpload(contentEvent(event, {}))),
    mediaReplacePreview: viewAction(['media'], (event) => content.mediaReplacePreview(contentEvent(event, {}))),
    mediaReplace: viewAction(['media'], (event) => content.mediaReplaceApply(contentEvent(event, {}))),
    mediaAltPreview: viewAction(['media'], (event) => content.mediaAltPreview(contentEvent(event, {}))),
    mediaAltPropagate: viewAction(['media'], (event) => content.mediaAltApply(contentEvent(event, {}))),
    // Pass C library actions: a multi-select bulk delete, the on-demand orphan scan, and the
    // irreversible byte purge. The component posts to `?/mediaBulkDelete`, `?/mediaOrphanScan`, and
    // `?/mediaPurge` (the purge key is short of its content method name). All gate on the media view.
    mediaBulkDelete: viewAction(['media'], (event) => content.mediaBulkDelete(contentEvent(event, {}))),
    mediaOrphanScan: viewAction(['media'], (event) => content.mediaOrphanScan(contentEvent(event, {}))),
    mediaPurge: viewAction(['media'], (event) => content.mediaPurgeOrphans(contentEvent(event, {}))),
    publishAll: viewAction(authedViews, (event) => content.publishAllAction(contentEvent(event, {}))),
    addEditor: viewAction(['editors'], (event) => editors.addEditorAction(event)),
    removeEditor: viewAction(['editors'], (event) => editors.removeEditorAction(event)),
    setRole: viewAction(['editors'], (event) => editors.setRoleAction(event)),
  };

  /**
   * The shared admin shell's load, wired to `/admin/+layout.server.ts`. It returns the lean shell
   *  payload (bare for a public path; the authed nav, user, and streamed pending set otherwise),
   *  so every `/admin/**` route renders inside one chrome without re-loading it per view.
   */
  const shellLoad = (event: AdminEvent) => content.shellPayload(contentEvent(event, {}));

  return { load, actions, shellLoad };
}
