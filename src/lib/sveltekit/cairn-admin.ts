// The single-mount admin facade. One factory closes over the composed runtime, instantiates
// the existing per-surface route factories (auth, content, editors, nav), and serves every
// admin view through the one load and one actions record a site's catch-all /admin/[...path]
// route exports. The path authority is admin-dispatch's parseAdminPath; this module only maps
// each view to the wrapped load it delegates to, and each named action validates that the
// parsed view supports it before delegating to the same wrapped factories.
import { error, fail, isHttpError, isRedirect, redirect } from '@sveltejs/kit';
import { parseAdminPath, type AdminView } from './admin-dispatch.js';
import { log } from '../log/index.js';
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
 * Injectable dependencies, grouped into the two cohesive bags a site actually overrides. The
 *  content backend rides `event.locals.backend` (the dev double) or the adapter's provider, so it
 *  is not a dep here.
 */
export interface CairnAdminDeps {
  /** The magic-link auth seam. */
  auth?: {
    /** Defaults from the runtime's `siteName` and `sender`; override to change the email identity. */
    branding?: AuthBranding;
    /** The same seam the underlying auth factory takes. */
    send?: SendMagicLink;
  };
  /**
   * Forwarded to the content routes verbatim; a site that enables tidy injects a stub client here
   *  to avoid a real network call.
   */
  tidy?: ContentRoutesDeps['tidy'];
  /**
   * Forwarded to the content routes verbatim; a site whose own gating lives outside cairn (a role
   *  stored in its own D1, say) injects this to hide a custom adminNav section from an editor who
   *  fails that check. See `ContentRoutesDeps['navFilter']`.
   */
  navFilter?: ContentRoutesDeps['navFilter'];
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
  | { view: 'editors'; page: { editors: Editor[]; self: string; error: string | null } }
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
  const branding: AuthBranding = deps.auth?.branding ?? {
    siteName: runtime.siteName,
    from: runtime.sender.from,
    replyTo: runtime.sender.replyTo,
  };
  const auth = createAuthRoutes({ branding, send: deps.auth?.send });
  const content = createContentRoutes(runtime, { tidy: deps.tidy, navFilter: deps.navFilter });
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
        return content.indexRedirect(contentEvent(event, {}));
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
   * The editor-voiced copy for an admin action's unexpected failure: the class of bug the
   *  original ecxc save 500 exposed (an exception escaping deep inside an action, past every
   *  validated refusal). Calm and honest, no jargon: the writing survives (nothing here has
   *  discarded it) and the retry is the editor's, with a hand-off to their site developer if it
   *  keeps failing.
   */
  const UNEXPECTED_ACTION_ERROR =
    'Something went wrong and your changes were not saved. Your writing is still here. Try again, and if it keeps failing, let your site developer know.';

  /**
   * Wrap a delegate in the parse-and-check every action shares: parse the pathname exactly
   *  as load does, 404 on a null parse or a view outside the allowed set, then hand the
   *  narrowed view to the delegate. An unexpected throw from the delegate (a bug, not a
   *  validated refusal the action already turned into a redirect or a `fail()`) never escapes
   *  as SvelteKit's raw 500: a redirect or an `HttpError` is the action's own deliberate control
   *  flow and passes through untouched (an `ActionFailure` from `fail()` is a return value, not
   *  a throw, so it already passes through with no help from this wrapper); anything else logs
   *  `admin.action.failed` (the action name, the concept and id when the view carries them, the
   *  signed-in editor when there is one, and the thrown error's message, never a stack or a
   *  token) and bounces back to the posted path with the calm `?error=` every view's own
   *  validated failures already redirect through.
   *
   *  `carriesNewFlag` opts an action into preserving its posted `new=1` form flag on that bounce:
   *  a first save or publish of a brand-new entry posts `new=1` (saveToBranch's `suffix`), and
   *  `editLoad` 404s an unsaved entry with no `?new=1` on the next GET, so losing the flag here
   *  would strand the editor's draft behind a 404, exactly the P0's scenario. Only `save` and
   *  `publish` set it: cloning the request has a real cost for a large upload body, so every other
   *  action skips the clone entirely.
   *
   *  `scriptPosted` opts an action into `fail(500, { error: UNEXPECTED_ACTION_ERROR })` instead of
   *  the redirect (save-500-hardening): a form-nav action's redirect lands cleanly on the next
   *  page, but a script-posted action (tidy, a dictionary word, an upload, all of which fetch with
   *  `redirect: 'manual'` so the guard's own expired-session 303 reads as an opaque, status-0
   *  response) sees THIS redirect the identical way, and the client helpers fold that shape into
   *  "your session expired, sign in again," a false and pointless re-login loop for what is
   *  actually an unrelated server bug. A `fail(500)` reaches the same client code as a genuine
   *  status, so it renders the calm copy inline instead. Set only on the actions whose own client
   *  posts with `redirect: 'manual'`: `upload`, `mediaUpload`, `mediaLibraryUpload`,
   *  `addDictionaryWord`, and `tidy`. Every other script-posted media action (a preview, a bulk
   *  apply, a scan) posts with the default `redirect: 'follow'`, so this wrapper's own redirect
   *  never reaches them as an opaque response in the first place. The return type only proves out
   *  for a call site whose delegate's own declared return already includes
   *  `ReturnType<typeof fail>`, so the cast below just names that fact; `R` is abstract inside this
   *  generic wrapper, unlike the `throw redirect(...)` fallback, which needs no cast because a
   *  throw satisfies every instantiation of R.
   */
  function viewAction<V extends AdminView['view'], R>(
    action: string,
    allowed: readonly V[],
    delegate: (event: AdminEvent, view: Extract<AdminView, { view: V }>) => Promise<R>,
    opts: { carriesNewFlag?: boolean; scriptPosted?: boolean } = {},
  ): (event: AdminEvent) => Promise<R> {
    return async (event) => {
      const view = parseAdminPath(event.url.pathname, runtime.concepts);
      if (!view || !(allowed as readonly string[]).includes(view.view)) throw error(404, 'Not found');
      // The includes check above proves the membership the cast asserts.
      const narrowed = view as Extract<AdminView, { view: V }>;
      // Cloned before the delegate ever reads the body, so the clone is never locked; read only
      // in the catch below, well after the delegate's own formData() call has consumed the
      // original.
      const clonedRequest = opts.carriesNewFlag ? event.request.clone() : null;
      try {
        return await delegate(event, narrowed);
      } catch (err) {
        if (isRedirect(err) || isHttpError(err)) throw err;
        const fields: Record<string, unknown> = { action, error: err instanceof Error ? err.message : String(err) };
        // `view`, not `narrowed`: it is the concrete AdminView union, so the `in` checks below
        // narrow it cleanly, unlike the generic-parameterized `narrowed`.
        if ('concept' in view) fields.concept = view.concept.id;
        if ('id' in view) fields.id = view.id;
        // A failure reading the editor must never mask the original error logged above.
        try {
          const editor = event.locals.editor;
          if (editor) fields.editor = editor.email;
        } catch {
          // No editor to attribute; the record still names the action and the error.
        }
        log.error('admin.action.failed', fields);
        if (opts.scriptPosted) {
          // Verified per call site (see the doc comment above): R for every scriptPosted action
          // already includes ReturnType<typeof fail>, so this genuinely satisfies R at runtime.
          return fail(500, { error: UNEXPECTED_ACTION_ERROR }) as R;
        }
        // A failure reading the cloned form must never mask the original error either; it just
        // bounces without the flag, the same as an action that never carried one.
        let newSuffix = '';
        if (clonedRequest) {
          try {
            const form = await clonedRequest.formData();
            if (form.get('new') === '1') newSuffix = '&new=1';
          } catch {
            // No posted form to read; bounce without the flag.
          }
        }
        throw redirect(303, `${event.url.pathname}?error=${encodeURIComponent(UNEXPECTED_ACTION_ERROR)}${newSuffix}`);
      }
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
    request: viewAction('request', ['login'], (event) => auth.requestAction(event)),
    confirm: viewAction('confirm', ['confirm'], (event) => auth.confirmAction(event)),
    logout: viewAction('logout', anyView, (event) => auth.logoutAction(event)),
    create: viewAction('create', ['list'], (event, view) => content.createAction(contentEvent(event, { concept: view.concept.id }))),
    save: viewAction('save', ['edit', 'nav'], (event, view) => {
      if (view.view === 'edit') return content.saveAction(contentEvent(event, { concept: view.concept.id, id: view.id }));
      if (!nav) throw error(404, 'Not found');
      return nav.navSave(contentEvent(event, {}));
    }, { carriesNewFlag: true }),
    // The tidy settings save (spec 2.8, Task 15): the editor commits the per-convention block to the
    // committed YAML. Gated to the settings view, so it 404s elsewhere; the action itself 404s again
    // when tidy is off, the server half of the truthful visibility gate.
    saveSettings: viewAction('saveSettings', ['settings'], (event) => content.settingsSave(contentEvent(event, {}))),
    // The tag-vocabulary save (Plan 3): the editor commits the curated vocabulary to the committed
    // YAML, with the cross-branch delete gate failing closed. Gated to the vocabulary view.
    saveVocabulary: viewAction('saveVocabulary', ['vocabulary'], (event) => content.vocabularySave(contentEvent(event, {}))),
    upload: viewAction('upload', ['edit'], (event, view) => content.uploadAction(contentEvent(event, { concept: view.concept.id, id: view.id })), { scriptPosted: true }),
    publish: viewAction('publish', ['edit'], (event, view) => content.publishAction(contentEvent(event, { concept: view.concept.id, id: view.id })), { carriesNewFlag: true }),
    discard: viewAction('discard', ['edit'], (event, view) => content.discardAction(contentEvent(event, { concept: view.concept.id, id: view.id }))),
    rename: viewAction('rename', ['edit'], (event, view) => content.renameAction(contentEvent(event, { concept: view.concept.id, id: view.id }))),
    // The personal-dictionary add (spec 1.6): the editor commits its pending add-to-dictionary words at
    // save time. Gated to the edit view, where the spellcheck surface lives, so it 404s elsewhere.
    addDictionaryWord: viewAction('addDictionaryWord', ['edit'], (event, view) =>
      content.addDictionaryWordAction(contentEvent(event, { concept: view.concept.id, id: view.id })), { scriptPosted: true }),
    // Tidy (spec 2.1): the editor posts the buffer to `?/tidy` for a light LLM copy-edit. Gated to the
    // edit view, where the review surface lives, so it 404s elsewhere.
    tidy: viewAction('tidy', ['edit'], (event, view) =>
      content.tidyAction(contentEvent(event, { concept: view.concept.id, id: view.id })), { scriptPosted: true }),
    delete: viewAction('delete', ['edit', 'list'], (event, view) =>
      view.view === 'edit'
        ? content.deleteAction(contentEvent(event, { concept: view.concept.id, id: view.id }))
        : content.listDeleteAction(contentEvent(event, { concept: view.concept.id })),
    ),
    mediaDelete: viewAction('mediaDelete', ['media'], (event) => content.mediaDeleteAction(contentEvent(event, {}))),
    mediaUpdate: viewAction('mediaUpdate', ['media'], (event) => content.mediaUpdateAction(contentEvent(event, {}))),
    // The Library is not entry-scoped, so a replace uploads its new file through the same content-
    // addressed ingest mounted media-scoped (uploadAction reads no concept/id), then previews and
    // applies the repoint. Alt propagation previews and applies the alt fill. The preview pair are 2a
    // fetch actions; the apply pair are form posts. All gate on the media view.
    mediaUpload: viewAction('mediaUpload', ['media'], (event) => content.uploadAction(contentEvent(event, {})), { scriptPosted: true }),
    mediaLibraryUpload: viewAction('mediaLibraryUpload', ['media'], (event) => content.mediaLibraryUploadAction(contentEvent(event, {})), { scriptPosted: true }),
    mediaReplacePreview: viewAction('mediaReplacePreview', ['media'], (event) => content.mediaReplacePreviewAction(contentEvent(event, {}))),
    mediaReplace: viewAction('mediaReplace', ['media'], (event) => content.mediaReplaceApplyAction(contentEvent(event, {}))),
    mediaAltPreview: viewAction('mediaAltPreview', ['media'], (event) => content.mediaAltPreviewAction(contentEvent(event, {}))),
    mediaAltPropagate: viewAction('mediaAltPropagate', ['media'], (event) => content.mediaAltApplyAction(contentEvent(event, {}))),
    // Pass C library actions: a multi-select bulk delete, the on-demand orphan scan, and the
    // irreversible byte purge. The component posts to `?/mediaBulkDelete`, `?/mediaOrphanScan`, and
    // `?/mediaPurge` (the purge key is short of its content method name). All gate on the media view.
    mediaBulkDelete: viewAction('mediaBulkDelete', ['media'], (event) => content.mediaBulkDeleteAction(contentEvent(event, {}))),
    mediaOrphanScan: viewAction('mediaOrphanScan', ['media'], (event) => content.mediaOrphanScanAction(contentEvent(event, {}))),
    mediaPurge: viewAction('mediaPurge', ['media'], (event) => content.mediaPurgeOrphansAction(contentEvent(event, {}))),
    publishAll: viewAction('publishAll', authedViews, (event) => content.publishAllAction(contentEvent(event, {}))),
    addEditor: viewAction('addEditor', ['editors'], (event) => editors.addEditorAction(event)),
    removeEditor: viewAction('removeEditor', ['editors'], (event) => editors.removeEditorAction(event)),
    setRole: viewAction('setRole', ['editors'], (event) => editors.setRoleAction(event)),
  };

  /**
   * The shared admin shell's load, wired to `/admin/+layout.server.ts`. It returns the lean shell
   *  payload (bare for a public path; the authed nav, user, and streamed pending set otherwise),
   *  so every `/admin/**` route renders inside one chrome without re-loading it per view.
   */
  const shellLoad = (event: AdminEvent) => content.shellPayload(contentEvent(event, {}));

  return { load, actions, shellLoad };
}
