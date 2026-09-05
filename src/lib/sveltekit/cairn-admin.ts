// The single-mount admin facade. One factory closes over the composed runtime, instantiates
// the existing per-surface route factories (auth, content, editors, nav), and serves every
// admin view through the one load and one actions record a site's catch-all /admin/[...path]
// route exports. The path authority is admin-dispatch's parseAdminPath; this module only maps
// each view to the wrapped load it delegates to, and each named action validates that the
// parsed view supports it before delegating to the same wrapped factories.
import { error, fail, isHttpError, isRedirect, type ActionFailure } from '@sveltejs/kit';
import { parseAdminPath, type AdminView } from './admin-dispatch.js';
import { log } from '../log/index.js';
import { createAuthRoutes, type LoginData, type ConfirmData } from './auth-routes.js';
import {
  createContentRoutesInternal,
  type ContentRoutesConfig,
  type ListData,
  type EditData,
  type MediaLibraryData,
  type SettingsData,
  type VocabularyLoadData,
  type HelpData,
  type WelcomeData,
} from './content-routes.js';
import { createEditorRoutes, type EditorsData } from './editors-routes.js';
import { createNavRoutes, type NavLoadData } from './nav-routes.js';
import type { AuthRoutesConfig } from './auth-routes.js';
import type { AuthBranding } from '../email.js';
import type { CairnRuntime } from '../content/types.js';
import type { CairnEvent, HistoryData } from './types.js';

/**
 * Injectable dependencies, grouped into the two cohesive bags a site actually overrides. The
 *  content backend rides `event.locals.cairnBackend` (the dev double) or the adapter's provider, so it
 *  is not a dep here.
 */
export interface CairnAdminConfig {
  /**
   * The magic-link auth seam: the same members `createAuthRoutes` takes, all optional here since
   *  `branding` defaults from the runtime. See `AuthRoutesConfig`.
   */
  auth?: Partial<AuthRoutesConfig>;
  /**
   * Forwarded to the content routes verbatim; a site that enables tidy injects a stub client here
   *  to avoid a real network call.
   */
  tidy?: ContentRoutesConfig['tidy'];
  /**
   * Forwarded to the content routes verbatim; a site whose own gating lives outside cairn (a role
   *  stored in its own D1, say) injects this to hide a section or an item from the arranged
   *  sidebar for an editor who fails that check. See `ContentRoutesConfig['navFilter']`.
   */
  navFilter?: ContentRoutesConfig['navFilter'];
  /**
   * Forwarded to the content routes verbatim; a site injects this to surface per-session
   *  pending-work counts as nav badges (a queue of unread asset requests, say). See
   *  `ContentRoutesConfig['attention']`.
   */
  attention?: ContentRoutesConfig['attention'];
  /**
   * Forwarded to the content routes verbatim: the preview-link lifetime `previewMint` mints
   *  against. See `ContentRoutesConfig['preview']`.
   */
  preview?: ContentRoutesConfig['preview'];
}

/**
 * One admin view's data, discriminated for the admin page component's switch. Every member
 * carries just its view's own page data; the shared chrome (nav, user, theme, pending count)
 * rides the separate shell load served through `/admin/+layout.server.ts`, not this per-view load.
 */
export type AdminData =
  | { view: 'login'; page: LoginData }
  | { view: 'confirm'; page: ConfirmData }
  | { view: 'list'; page: ListData }
  | { view: 'edit'; page: EditData }
  | { view: 'history'; page: HistoryData }
  | { view: 'editors'; page: EditorsData }
  | { view: 'nav'; page: NavLoadData }
  | { view: 'media'; page: MediaLibraryData }
  | { view: 'settings'; page: SettingsData }
  | { view: 'vocabulary'; page: VocabularyLoadData }
  | { view: 'help'; page: HelpData }
  | { view: 'welcome'; page: WelcomeData };

/**
 * Compose every admin surface (auth, content, editors, nav) into the bundle a site mounts at its
 * catch-all `/admin/[...path]` route: one `load` that dispatches on the parsed path to the
 * matching view's own data, the full `actions` record (every named admin action, each parsing
 * and validating its own view before delegating), and a separate `shellLoad` for
 * `/admin/+layout.server.ts`'s shared chrome. `config` overrides only the seams a site actually
 * needs (auth send/bootstrap, tidy, `navFilter`, `attention`); everything else derives from
 * `runtime`.
 *
 * This is the WIDE shape, mirroring the foundations-B `createContentRoutesInternal` precedent:
 *  reachable from no package subpath, so its `actions` record is free to carry every one of the
 *  ten media-janitorial actions the engine's own Media Library screen needs, which the public
 *  {@link createCairnAdmin}'s declared {@link CairnAdminRoutes} narrows away. Module-internal
 *  callers (this module's own single caller, `createCairnAdmin`, and a test proving the wide
 *  shape directly) import it by relative path; no barrel re-exports it.
 */
export function createCairnAdminInternal(runtime: CairnRuntime, config: CairnAdminConfig = {}) {
  // The runtime already composes the site name and the sender identity, so the magic-link
  // branding needs no second copy of either unless a site overrides it.
  const branding: AuthBranding = config.auth?.branding ?? {
    siteName: runtime.siteName,
    from: runtime.sender.from,
    replyTo: runtime.sender.replyTo,
  };
  const auth = createAuthRoutes({ branding, send: config.auth?.send, bootstrapOwner: config.auth?.bootstrapOwner });
  const content = createContentRoutesInternal(runtime, {
    tidy: config.tidy,
    navFilter: config.navFilter,
    attention: config.attention,
    preview: config.preview,
  });
  const editors = createEditorRoutes({ roles: runtime.roles });
  // The nav surface exists only when the site configures a menu; without one its view is a 404.
  const nav = runtime.navMenu ? createNavRoutes(runtime) : null;

  /**
   * Build the event a wrapped content load reads. The catch-all route carries only a rest
   *  param, so `concept` and `id` are synthesized from the parsed view; `route` rides through
   *  unchanged, since it names the catch-all route itself, not the synthesized view. The
   *  override names each field explicitly rather than spreading: a real RequestEvent's fields
   *  can sit behind getters a bare spread copies poorly, and the structural CairnEvent contract
   *  needs only these.
   */
  function contentEvent(event: CairnEvent, params: Record<string, string>): CairnEvent {
    return {
      url: event.url,
      params,
      route: event.route,
      request: event.request,
      locals: event.locals,
      platform: event.platform,
      cookies: event.cookies,
      setHeaders: event.setHeaders,
    };
  }

  /**
   * Serve the admin view the pathname names, or a 404 for any shape the parser refuses.
   *  Each authed view loads only its own page data; the shared chrome rides the separate shell
   *  load (`/admin/+layout.server.ts`), so this load no longer re-fetches the nav per view.
   */
  async function load(event: CairnEvent): Promise<AdminData> {
    const view = parseAdminPath(event.url.pathname, runtime.concepts);
    if (!view) throw error(404, 'Not found');
    switch (view.view) {
      case 'index':
        return content.indexLoad(contentEvent(event, {}));
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
      case 'history': {
        const delegated = contentEvent(event, { concept: view.concept.id, id: view.id });
        return { view: 'history', page: await content.historyLoad(delegated) };
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
   *  token) and answers `fail(500, { error: UNEXPECTED_ACTION_ERROR })` in place. Every action
   *  reads this the same way, form-posted or script-posted (save-500-hardening): a form-nav
   *  action keeps the editor on the page with the submitted body intact instead of navigating
   *  away, and a script-posted action (tidy, a dictionary word, an upload, all of which fetch
   *  with `redirect: 'manual'`) never sees a redirect it would otherwise fold into a false "your
   *  session expired" message. The wrapper's own return type unions in the plain shape this arm
   *  actually produces, rather than a narrowing cast to the delegate's own `R`: a delegate whose
   *  declared failure shape carries more than a bare error message (a save's broken-link list,
   *  say) never actually gets those extra fields back from this arm, so the type says exactly
   *  that, rather than promising a shape this arm cannot produce (a consumer's generated
   *  `ActionData` would otherwise read a field that is really `undefined` at runtime).
   */
  function viewAction<V extends AdminView['view'], R>(
    action: string,
    allowed: readonly V[],
    delegate: (event: CairnEvent, view: Extract<AdminView, { view: V }>) => Promise<R>,
  ): (event: CairnEvent) => Promise<R | ActionFailure<{ error: string }>> {
    return async (event) => {
      const view = parseAdminPath(event.url.pathname, runtime.concepts);
      if (!view || !(allowed as readonly string[]).includes(view.view)) throw error(404, 'Not found');
      // The includes check above proves the membership the cast asserts.
      const narrowed = view as Extract<AdminView, { view: V }>;
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
          const editor = event.locals.cairnEditor;
          if (editor) fields.editor = editor.email;
        } catch {
          // No editor to attribute; the record still names the action and the error.
        }
        log.error('admin.action.failed', fields);
        return fail(500, { error: UNEXPECTED_ACTION_ERROR });
      }
    };
  }

  // The shell posts publishAll from every authed admin page to the absolute /admin?/publishAll, which
  // parses to the index view, so 'index' is in the set alongside the per-view names; login and confirm
  // may not.
  const authedViews = ['index', 'list', 'edit', 'history', 'editors', 'nav', 'media', 'settings', 'vocabulary', 'help'] as const;
  // An editor signs out from wherever they are, so logout accepts any parsed view.
  const anyView = ['index', 'login', 'confirm', 'list', 'edit', 'history', 'editors', 'nav', 'media', 'settings', 'vocabulary', 'help'] as const;

  /**
   * The full admin action vocabulary, one named async function per action, so a site's
   *  catch-all route exports `admin.actions` directly. Each wrapper stays thin: parse,
   *  validate the view, synthesize the params the wrapped action reads, delegate. The
   *  editor actions gate themselves with requireOwner, so no second gate is added here.
   *
   *  A delegate that only ever throws keeps its own declared `Promise<never>` and needs no
   *  widening annotation at the call site: `viewAction` adds `ActionFailure<{ error: string }>`
   *  to every wrapper's return unconditionally (see the `R` note above), and `never` vanishes
   *  from that union. Confirm, logout, discard, and publishAll are the four, each ending in a
   *  deliberate redirect.
   */
  const actions = {
    request: viewAction('request', ['login'], (event) => auth.requestAction(event)),
    confirm: viewAction('confirm', ['confirm'], (event) => auth.confirmAction(event)),
    logout: viewAction('logout', anyView, (event) => auth.logoutAction(event)),
    create: viewAction('create', ['list'], (event, view) => content.createAction(contentEvent(event, { concept: view.concept.id }))),
    save: viewAction('save', ['edit', 'nav'], (event, view) => {
      if (view.view === 'edit') return content.saveAction(contentEvent(event, { concept: view.concept.id, id: view.id }));
      if (!nav) throw error(404, 'Not found');
      return nav.navSaveAction(contentEvent(event, {}));
    }),
    // The tidy settings save (spec 2.8): the editor commits the per-convention block to the
    // committed YAML. Gated to the settings view, so it 404s elsewhere; the action itself 404s again
    // when tidy is off, the server half of the truthful visibility gate.
    settingsSave: viewAction('settingsSave', ['settings'], (event) => content.settingsSaveAction(contentEvent(event, {}))),
    // The tag-vocabulary save: the editor commits the curated vocabulary to the committed
    // YAML, with the cross-branch delete gate failing closed. Gated to the vocabulary view.
    vocabularySave: viewAction('vocabularySave', ['vocabulary'], (event) => content.vocabularySaveAction(contentEvent(event, {}))),
    upload: viewAction('upload', ['edit'], (event, view) => content.uploadAction(contentEvent(event, { concept: view.concept.id, id: view.id }))),
    publish: viewAction('publish', ['edit'], (event, view) => content.publishAction(contentEvent(event, { concept: view.concept.id, id: view.id }))),
    discard: viewAction('discard', ['edit'], (event, view) => content.discardAction(contentEvent(event, { concept: view.concept.id, id: view.id }))),
    rename: viewAction('rename', ['edit'], (event, view) => content.renameAction(contentEvent(event, { concept: view.concept.id, id: view.id }))),
    // Preview (spec part 3, "Public preview for a non-editor"): mint returns the minted URL and
    // expiry directly (no redirect), so the edit screen's share panel can show and copy it in
    // place; revoke deletes every outstanding link for the entry. Both gate on the edit view,
    // where the share affordance lives.
    previewMint: viewAction('previewMint', ['edit'], (event, view) =>
      content.previewMintAction(contentEvent(event, { concept: view.concept.id, id: view.id }))),
    previewRevoke: viewAction('previewRevoke', ['edit'], (event, view) =>
      content.previewRevokeAction(contentEvent(event, { concept: view.concept.id, id: view.id }))),
    // Revert (spec "Part 2: revert"): starts a draft from an old publish. Gated to the history
    // view, where the revert forms live; concept/id are synthesized the same way every other
    // per-entry action's are.
    revert: viewAction('revert', ['history'], (event, view) => content.revertAction(contentEvent(event, { concept: view.concept.id, id: view.id }))),
    // The personal-dictionary add (spec 1.6): the editor commits its pending add-to-dictionary words at
    // save time. Gated to the edit view, where the spellcheck surface lives, so it 404s elsewhere.
    dictionaryAdd: viewAction('dictionaryAdd', ['edit'], (event, view) =>
      content.dictionaryAddAction(contentEvent(event, { concept: view.concept.id, id: view.id }))),
    // Tidy (spec 2.1): the editor posts the buffer to `?/tidy` for a light LLM copy-edit. Gated to the
    // edit view, where the review surface lives, so it 404s elsewhere.
    tidy: viewAction('tidy', ['edit'], (event, view) =>
      content.tidyAction(contentEvent(event, { concept: view.concept.id, id: view.id }))),
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
    mediaUpload: viewAction('mediaUpload', ['media'], (event) => content.uploadAction(contentEvent(event, {}))),
    mediaLibraryUpload: viewAction('mediaLibraryUpload', ['media'], (event) => content.mediaLibraryUploadAction(contentEvent(event, {}))),
    mediaReplacePreview: viewAction('mediaReplacePreview', ['media'], (event) => content.mediaReplacePreviewAction(contentEvent(event, {}))),
    mediaReplace: viewAction('mediaReplace', ['media'], (event) => content.mediaReplaceAction(contentEvent(event, {}))),
    mediaAltPreview: viewAction('mediaAltPreview', ['media'], (event) => content.mediaAltPreviewAction(contentEvent(event, {}))),
    mediaAltPropagate: viewAction('mediaAltPropagate', ['media'], (event) => content.mediaAltPropagateAction(contentEvent(event, {}))),
    // Pass C library actions: a multi-select bulk delete, the on-demand orphan scan, and the
    // irreversible byte purge. The component posts to `?/mediaBulkDelete`, `?/mediaOrphanScan`, and
    // `?/mediaOrphanPurge`. All gate on the media view.
    mediaBulkDelete: viewAction('mediaBulkDelete', ['media'], (event) => content.mediaBulkDeleteAction(contentEvent(event, {}))),
    mediaOrphanScan: viewAction('mediaOrphanScan', ['media'], (event) => content.mediaOrphanScanAction(contentEvent(event, {}))),
    mediaOrphanPurge: viewAction('mediaOrphanPurge', ['media'], (event) => content.mediaOrphanPurgeAction(contentEvent(event, {}))),
    publishAll: viewAction('publishAll', authedViews, (event) => content.publishAllAction(contentEvent(event, {}))),
    editorAdd: viewAction('editorAdd', ['editors'], (event) => editors.editorAddAction(event)),
    editorRemove: viewAction('editorRemove', ['editors'], (event) => editors.editorRemoveAction(event)),
    editorSetRole: viewAction('editorSetRole', ['editors'], (event) => editors.editorSetRoleAction(event)),
  };

  /**
   * The shared admin shell's load, wired to `/admin/+layout.server.ts`. It returns the lean shell
   *  payload (bare for a public path; the authed nav, user, and streamed pending set otherwise),
   *  so every `/admin/**` route renders inside one chrome without re-loading it per view.
   */
  const shellLoad = (event: CairnEvent) => content.shellLoad(contentEvent(event, {}));

  return { load, actions, shellLoad };
}

/**
 * The wide shape `createCairnAdminInternal` returns. Named so the public view below is DERIVED
 *  from it rather than hand-mirrored, mirroring the foundations-B `InternalContentRoutes`
 *  precedent (`content-routes.ts`).
 */
type InternalCairnAdminRoutes = ReturnType<typeof createCairnAdminInternal>;

/**
 * What `createCairnAdmin` returns: the one load, the shared shell load, and the deliberately
 *  narrowed action vocabulary a site wiring the single-mount admin actually dispatches to.
 *
 *  Ten media-janitorial actions are absent on purpose, mirroring `ContentRoutes`'s own
 *  narrowing exactly (`content-routes.ts`): `mediaDelete`, `mediaUpdate`, `mediaLibraryUpload`,
 *  `mediaReplacePreview`, `mediaReplace`, `mediaAltPreview`, `mediaAltPropagate`,
 *  `mediaBulkDelete`, `mediaOrphanScan`, `mediaOrphanPurge`. Each wraps one of `ContentRoutes`'s
 *  own ten excluded internal actions, reachable only from the engine's own Media Library screen.
 *  `mediaUpload` stays: it wraps the SAME `uploadAction` the kept `upload` action wraps (the one
 *  `ContentRoutes` itself exposes), just gated to the media view instead of the edit view.
 *
 *  The narrowing is TYPE-LEVEL, not a runtime boundary, exactly as `ContentRoutes`'s own doc
 *  comment states: `createCairnAdmin` returns the internal object itself, so every action is
 *  still present at runtime, and a spread (`export const actions = { ...admin.actions }`) or a
 *  cast recovers the ten. Each of them still runs the session, CSRF, and view gates it always
 *  ran; the narrowing withdraws the SUPPORTED seam, not the reachability.
 */
export interface CairnAdminRoutes {
  load: InternalCairnAdminRoutes['load'];
  shellLoad: InternalCairnAdminRoutes['shellLoad'];
  actions: Pick<
    InternalCairnAdminRoutes['actions'],
    | 'request'
    | 'confirm'
    | 'logout'
    | 'create'
    | 'save'
    | 'settingsSave'
    | 'vocabularySave'
    | 'upload'
    | 'publish'
    | 'discard'
    | 'rename'
    | 'previewMint'
    | 'previewRevoke'
    | 'revert'
    | 'dictionaryAdd'
    | 'tidy'
    | 'delete'
    | 'mediaUpload'
    | 'publishAll'
    | 'editorAdd'
    | 'editorRemove'
    | 'editorSetRole'
  >;
}

/**
 * Build the single-mount admin bundle a site's catch-all `/admin/[...path]` route exports: the
 *  narrow, declared {@link CairnAdminRoutes} view over {@link createCairnAdminInternal}'s wide
 *  return.
 */
export function createCairnAdmin(runtime: CairnRuntime, config: CairnAdminConfig = {}): CairnAdminRoutes {
  return createCairnAdminInternal(runtime, config);
}
