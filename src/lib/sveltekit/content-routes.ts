// The admin content routes: the load and action functions a site's /admin/** shims call. The
// factory closes over the composed runtime and the GitHub token mint, so the read and commit paths
// are unit-testable against a fetch double with an injected token, mirroring the email `send`
// injection in auth-routes. A shim stays one line: `export const load = routes.editLoad`.
//
// This module is the composition root: `createContentRoutes` builds the shared
// ContentRoutesContext (content-routes-context.ts) once, then merges the per-domain sibling
// factories (content-routes-core.ts, -media.ts, -tidy.ts, -settings.ts, -dictionary.ts) into the
// one returned object, so its public shape stays exactly what it has always been. Every type this
// file used to declare inline now lives with the domain that owns it and is re-exported here, so
// every existing importer (the public `/sveltekit` barrel and the admin components that import this
// file directly) sees the same names at the same path.
import type { CairnRuntime } from '../content/types.js';
import { createContentRoutesContext } from './content-routes-context.js';
import type { ContentRoutesDeps } from './content-routes-context.js';
import { createCoreActions } from './content-routes-core.js';
import type { SaveFailure, DeleteRefusal, RenameFailure } from './content-routes-core.js';
import { createMediaActions } from './content-routes-media.js';
import type {
  MediaDeleteRefusal,
  MediaUpdateFailure,
  MediaReplaceFailure,
  MediaAltPropagateFailure,
  MediaBulkFailure,
} from './content-routes-media.js';
import { createTidyActions } from './content-routes-tidy.js';
import type { TidyFailure } from './content-routes-tidy.js';
import { createSettingsActions } from './content-routes-settings.js';
import { createDictionaryActions } from './content-routes-dictionary.js';

// The advisory notice types are defined alongside the cross-branch address index in the content
// layer; re-export them here so EditData's advisories and the /sveltekit subpath carry one shape.
export type { AdvisoryNotice, AdvisoryAction } from '../content/advisories.js';

export type { ContentEvent, ContentRoutesDeps, TidyClient } from './content-routes-context.js';

export type {
  NavConcept,
  AdminShellData,
  EntrySummary,
  ListData,
  EditData,
  HelpData,
  WelcomeData,
  SaveFailure,
  DeleteRefusal,
  RenameFailure,
} from './content-routes-core.js';

export type {
  MediaUsageInfo,
  MediaLibraryData,
  MediaDeleteRefusal,
  MediaUpdateFailure,
  MediaReplaceFailure,
  MediaAltPropagateFailure,
  MediaBulkFailure,
  MediaBulkDeleteResult,
  MediaOrphanPurgeResult,
  MediaReplacePreviewEntry,
  MediaReplacePreviewPlan,
  MediaAltPreviewPlan,
  UploadResult,
} from './content-routes-media.js';

export type { TidyResult } from './content-routes-tidy.js';

export type { SettingsData, VocabularyLoadData } from './content-routes-settings.js';

export type { DictionaryAddResult, DictionaryAddFailure } from './content-routes-dictionary.js';

/**
 * What a route's single `form` export presents to a view component: whichever content action
 *  last failed, merged with every field optional. `error` is always set on a failure; the richer
 *  keys identify which guard refused. The media refusals ride here too, so the Media Library's one
 *  `form` prop carries a `?/mediaDelete`, `?/mediaUpdate`, `?/mediaReplace`, or `?/mediaAltPropagate`
 *  refusal without a second type.
 */
export type ContentFormFailure = Partial<
  SaveFailure & DeleteRefusal & RenameFailure & MediaDeleteRefusal & MediaUpdateFailure & MediaReplaceFailure & MediaAltPropagateFailure & MediaBulkFailure & TidyFailure
>;

/**
 * Build the admin content routes' load and action functions, closed over the composed runtime.
 *  The returned object's key order mirrors the historical single-factory shape (routes interleave
 *  by admin surface, not by the internal domain split below), which `check:surface` pins as the
 *  public contract.
 */
export function createContentRoutes(runtime: CairnRuntime, deps: ContentRoutesDeps = {}) {
  const ctx = createContentRoutesContext(runtime, deps);
  const core = createCoreActions(ctx);
  const media = createMediaActions(ctx);
  const tidy = createTidyActions(ctx);
  const settings = createSettingsActions(ctx);
  const dictionary = createDictionaryActions(ctx);
  return {
    shellPayload: core.shellPayload,
    helpLoad: core.helpLoad,
    indexRedirect: core.indexRedirect,
    listLoad: core.listLoad,
    mediaLibraryLoad: media.mediaLibraryLoad,
    settingsLoad: settings.settingsLoad,
    settingsSave: settings.settingsSave,
    vocabularyLoad: settings.vocabularyLoad,
    vocabularySave: settings.vocabularySave,
    createAction: core.createAction,
    editLoad: core.editLoad,
    saveAction: core.saveAction,
    publishAction: core.publishAction,
    publishAllAction: core.publishAllAction,
    discardAction: core.discardAction,
    deleteAction: core.deleteAction,
    listDeleteAction: core.listDeleteAction,
    renameAction: core.renameAction,
    uploadAction: media.uploadAction,
    mediaLibraryUploadAction: media.mediaLibraryUploadAction,
    mediaDeleteAction: media.mediaDeleteAction,
    mediaBulkDeleteAction: media.mediaBulkDeleteAction,
    mediaOrphanScanAction: media.mediaOrphanScanAction,
    mediaPurgeOrphansAction: media.mediaPurgeOrphansAction,
    mediaUpdateAction: media.mediaUpdateAction,
    mediaReplacePreviewAction: media.mediaReplacePreviewAction,
    mediaReplaceApplyAction: media.mediaReplaceApplyAction,
    mediaAltPreviewAction: media.mediaAltPreviewAction,
    mediaAltApplyAction: media.mediaAltApplyAction,
    addDictionaryWordAction: dictionary.addDictionaryWordAction,
    tidyAction: tidy.tidyAction,
  };
}
