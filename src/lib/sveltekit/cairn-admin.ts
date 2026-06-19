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
  type LayoutData,
  type ListData,
  type EditData,
  type MediaLibraryData,
} from './content-routes.js';
import { createEditorRoutes } from './editors-routes.js';
import { createNavRoutes, type NavLoadData } from './nav-routes.js';
import type { AuthBranding, SendMagicLink } from '../email.js';
import type { AuthEnv, Editor } from '../auth/types.js';
import type { GithubKeyEnv } from '../github/credentials.js';
import type { CairnRuntime } from '../content/types.js';
import type { CookieJar, EventBase } from './types.js';

/**
 * The structural event the single-mount load reads: the union of what the wrapped loads need
 * (ContentEvent minus params, which the dispatcher synthesizes, plus RequestContext's cookies
 * and setHeaders). A real SvelteKit RequestEvent satisfies it.
 */
export interface AdminEvent extends EventBase<GithubKeyEnv & AuthEnv> {
  cookies: CookieJar;
  setHeaders(headers: Record<string, string>): void;
}

/** Injectable dependencies. Branding defaults from the runtime's siteName and sender, so a
 *  site overrides it only to change the magic-link email identity; `send` and `mintToken`
 *  are the same seams the underlying factories take. */
export interface CairnAdminDeps {
  branding?: AuthBranding;
  send?: SendMagicLink;
  mintToken?: ContentRoutesDeps['mintToken'];
}

/**
 * One admin view's data, discriminated for the admin page component's switch. The public
 * views (login, confirm) carry no layout; every authed view pairs the shared layout with its
 * page data, the same shapes the per-surface loads have always returned.
 */
export type AdminData =
  | { view: 'login'; page: { siteName: string; error: string | null; csrf: string } }
  | { view: 'confirm'; page: { token: string; siteName: string; error: string | null; csrf: string } }
  | { view: 'list'; layout: LayoutData; page: ListData }
  | { view: 'edit'; layout: LayoutData; page: EditData }
  | { view: 'editors'; layout: LayoutData; page: { editors: Editor[]; self: string } }
  | { view: 'nav'; layout: LayoutData; page: NavLoadData }
  | { view: 'media'; layout: LayoutData; page: MediaLibraryData };

export function createCairnAdmin(runtime: CairnRuntime, deps: CairnAdminDeps = {}) {
  // The runtime already composes the site name and the sender identity, so the magic-link
  // branding needs no second copy of either unless a site overrides it.
  const branding: AuthBranding = deps.branding ?? {
    siteName: runtime.siteName,
    from: runtime.sender.from,
    replyTo: runtime.sender.replyTo,
  };
  const auth = createAuthRoutes({ branding, send: deps.send });
  const content = createContentRoutes(runtime, { mintToken: deps.mintToken });
  const editors = createEditorRoutes();
  // The nav surface exists only when the site configures a menu; without one its view is a 404.
  const nav = runtime.navMenu ? createNavRoutes(runtime, { mintToken: deps.mintToken }) : null;

  /** Build the event a wrapped content load reads. The catch-all route carries only a rest
   *  param, so `concept` and `id` are synthesized from the parsed view. The override names
   *  each field explicitly rather than spreading: a real RequestEvent's fields can sit behind
   *  getters a bare spread copies poorly, and the structural ContentEvent contract needs only
   *  these. */
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

  /** Serve the admin view the pathname names, or a 404 for any shape the parser refuses.
   *  The authed views run the layout load and the view load concurrently; both mint a GitHub
   *  token, and the installation-token cache coalesces the mints into one signing. */
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
        const [layout, page] = await Promise.all([content.layoutLoad(delegated), content.listLoad(delegated)]);
        return { view: 'list', layout, page };
      }
      case 'edit': {
        const delegated = contentEvent(event, { concept: view.concept.id, id: view.id });
        const [layout, page] = await Promise.all([content.layoutLoad(delegated), content.editLoad(delegated)]);
        return { view: 'edit', layout, page };
      }
      case 'editors': {
        // editorsLoad gates itself with requireOwner, so the dispatcher adds no second gate.
        const [layout, page] = await Promise.all([
          content.layoutLoad(contentEvent(event, {})),
          editors.editorsLoad(event),
        ]);
        return { view: 'editors', layout, page };
      }
      case 'nav': {
        if (!nav) throw error(404, 'Not found');
        const delegated = contentEvent(event, {});
        const [layout, page] = await Promise.all([content.layoutLoad(delegated), nav.navLoad(delegated)]);
        return { view: 'nav', layout, page };
      }
      case 'media': {
        const delegated = contentEvent(event, {});
        const [layout, page] = await Promise.all([content.layoutLoad(delegated), content.mediaLibraryLoad(delegated)]);
        return { view: 'media', layout, page };
      }
    }
  }

  /** Wrap a delegate in the parse-and-check every action shares: parse the pathname exactly
   *  as load does, 404 on a null parse or a view outside the allowed set, then hand the
   *  narrowed view to the delegate. */
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

  // The topbar posts publishAll from every authed admin page; login and confirm may not.
  const authedViews = ['list', 'edit', 'editors', 'nav', 'media'] as const;
  // An editor signs out from wherever they are, so logout accepts any parsed view.
  const anyView = ['index', 'login', 'confirm', 'list', 'edit', 'editors', 'nav', 'media'] as const;

  /** The full admin action vocabulary, one named async function per action, so a site's
   *  catch-all route exports `admin.actions` directly. Each wrapper stays thin: parse,
   *  validate the view, synthesize the params the wrapped action reads, delegate. The
   *  editor actions gate themselves with requireOwner, so no second gate is added here. */
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
    upload: viewAction(['edit'], (event, view) => content.uploadAction(contentEvent(event, { concept: view.concept.id, id: view.id }))),
    publish: viewAction(['edit'], (event, view) => content.publishAction(contentEvent(event, { concept: view.concept.id, id: view.id }))),
    discard: viewAction(['edit'], (event, view) => content.discardAction(contentEvent(event, { concept: view.concept.id, id: view.id }))),
    rename: viewAction(['edit'], (event, view) => content.renameAction(contentEvent(event, { concept: view.concept.id, id: view.id }))),
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

  return { load, actions };
}
