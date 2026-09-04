// The admin content routes: the load and action functions a site's /admin/** shims call. The
// factory closes over the composed runtime and the GitHub token mint, so the read and commit paths
// are unit-testable against a fetch double with an injected token, mirroring the email `send`
// injection in auth-routes. A shim stays one line: `export const load = routes.editLoad`.
//
// This module is the composition root: `createContentRoutesInternal` builds the shared
// ContentRoutesContext (content-routes-context.ts) once, then merges the per-domain sibling
// factories (content-routes-shell.ts, -list.ts, -entry.ts, -preview.ts, -media.ts, -tidy.ts,
// -settings.ts, -dictionary.ts) into the one returned object. content-routes-shared.ts is not one
// of those factories, only the primitives several of them import (concept and entry-id resolution,
// the flattened action-failure shape); this file re-exports its `ContentFormFailure` type below
// alongside the domain types. Every type this file used to declare inline now lives with the
// domain that owns it and is re-exported here, so every existing
// importer (the public `/sveltekit` barrel and the admin components that import this file
// directly) sees the same names at the same path.
//
// The factory comes in two: `createContentRoutesInternal`, whose wide shape the single-mount
// composer drives, and the public `createContentRoutes`, whose declared return is the narrow
// `ContentRoutes` a hand-mounting site can wire. The narrowing is deliberate and enumerated on
// `ContentRoutes` itself; `check:surface` pins the narrow shape as the public contract.
import type { CairnRuntime } from '../content/types.js';
import { createContentRoutesContext } from './content-routes-context.js';
import type { ContentRoutesConfig } from './content-routes-context.js';
import { createShellActions } from './content-routes-shell.js';
import { createListActions } from './content-routes-list.js';
import { createEntryActions } from './content-routes-entry.js';
import { createPreviewActions } from './content-routes-preview.js';
import { createMediaActions } from './content-routes-media.js';
import { createTidyActions } from './content-routes-tidy.js';
import { createSettingsActions } from './content-routes-settings.js';
import { createDictionaryActions } from './content-routes-dictionary.js';

export type { ContentRoutesConfig, TidyClient, TidyEffort, AttentionItem } from './content-routes-context.js';

export type { AdminShellData, HelpData, WelcomeData } from './content-routes-shell.js';

export type { EntrySummary, ListData } from './content-routes-list.js';

export type { ContentFormFailure } from './content-routes-shared.js';

export type { EditData } from './content-routes-entry.js';

export type {
  MediaLibraryData,
  MediaLibraryEntry,
} from './content-routes-media.js';

export type { SettingsData, VocabularyLoadData } from './content-routes-settings.js';

export type { DictionaryAddFailure } from './content-routes-dictionary.js';

/**
 * Build every admin content route the engine's own screens need, closed over the composed runtime.
 *  This is the WIDE shape, and `cairn-admin.ts` is its only caller: the single-mount composer drives
 *  all of it, including the ten media-janitorial actions that reach no further than the engine's own
 *  Media Library screen. The public `createContentRoutes` below presents the narrow view of the same
 *  object. Reachable from no package subpath, so its shape is free to grow with the admin.
 */
export function createContentRoutesInternal(runtime: CairnRuntime, config: ContentRoutesConfig = {}) {
  const ctx = createContentRoutesContext(runtime, config);
  const shell = createShellActions(ctx);
  const list = createListActions(ctx);
  const entry = createEntryActions(ctx);
  const preview = createPreviewActions(ctx);
  const media = createMediaActions(ctx);
  const tidy = createTidyActions(ctx);
  const settings = createSettingsActions(ctx);
  const dictionary = createDictionaryActions(ctx);
  return {
    shellLoad: shell.shellLoad,
    helpLoad: shell.helpLoad,
    indexLoad: shell.indexLoad,
    listLoad: list.listLoad,
    mediaLibraryLoad: media.mediaLibraryLoad,
    settingsLoad: settings.settingsLoad,
    settingsSaveAction: settings.settingsSaveAction,
    vocabularyLoad: settings.vocabularyLoad,
    vocabularySaveAction: settings.vocabularySaveAction,
    createAction: entry.createAction,
    editLoad: entry.editLoad,
    historyLoad: entry.historyLoad,
    saveAction: entry.saveAction,
    publishAction: entry.publishAction,
    publishAllAction: entry.publishAllAction,
    discardAction: entry.discardAction,
    deleteAction: entry.deleteAction,
    listDeleteAction: entry.listDeleteAction,
    renameAction: entry.renameAction,
    previewMintAction: preview.previewMintAction,
    previewRevokeAction: preview.previewRevokeAction,
    revertAction: entry.revertAction,
    uploadAction: media.uploadAction,
    mediaLibraryUploadAction: media.mediaLibraryUploadAction,
    mediaDeleteAction: media.mediaDeleteAction,
    mediaBulkDeleteAction: media.mediaBulkDeleteAction,
    mediaOrphanScanAction: media.mediaOrphanScanAction,
    mediaOrphanPurgeAction: media.mediaOrphanPurgeAction,
    mediaUpdateAction: media.mediaUpdateAction,
    mediaReplacePreviewAction: media.mediaReplacePreviewAction,
    mediaReplaceAction: media.mediaReplaceAction,
    mediaAltPreviewAction: media.mediaAltPreviewAction,
    mediaAltPropagateAction: media.mediaAltPropagateAction,
    dictionaryAddAction: dictionary.dictionaryAddAction,
    tidyAction: tidy.tidyAction,
  };
}

/**
 * The wide shape `createContentRoutesInternal` returns. Named so the public view below is DERIVED
 *  from it rather than hand-mirrored, which is what keeps the two from drifting apart
 *  (coherence-v2 C3).
 */
type InternalContentRoutes = ReturnType<typeof createContentRoutesInternal>;

/**
 * What `createContentRoutes` returns: the load and action vocabulary a site can mount by hand. The
 *  member list is the deliberate public narrowing and each member's type is read from the internal
 *  shape, never copied. The key order mirrors the historical single-factory shape (routes interleave
 *  by admin surface, not by the internal domain split above), which `check:surface` pins as the
 *  public contract.
 *
 * Ten media-janitorial actions are absent on purpose. They are reachable only from the engine's own
 *  Media Library screen, so a site that wants them mounts `createCairnAdmin` instead of wiring them
 *  one by one.
 *
 * The narrowing is TYPE-LEVEL, not a runtime boundary. `createContentRoutes` returns the internal
 *  object itself, so all thirty-five members are still present at runtime: a spread
 *  (`export const actions = { ...routes }`) or a cast recovers the ten. Each of them still runs the
 *  session, CSRF, and view gates it always ran, so nothing is exposed that was not exposed before.
 *  What the narrowing withdraws is the SUPPORTED seam, not the reachability, which is why the
 *  removal is a documented capability change rather than a security fix.
 */
export type ContentRoutes = Pick<
  InternalContentRoutes,
  | 'shellLoad'
  | 'helpLoad'
  | 'indexLoad'
  | 'listLoad'
  | 'mediaLibraryLoad'
  | 'settingsLoad'
  | 'settingsSaveAction'
  | 'vocabularyLoad'
  | 'vocabularySaveAction'
  | 'createAction'
  | 'editLoad'
  | 'historyLoad'
  | 'saveAction'
  | 'publishAction'
  | 'publishAllAction'
  | 'discardAction'
  | 'deleteAction'
  | 'listDeleteAction'
  | 'renameAction'
  | 'previewMintAction'
  | 'previewRevokeAction'
  | 'revertAction'
  | 'uploadAction'
  | 'dictionaryAddAction'
  | 'tidyAction'
>;

/**
 * Build the admin content routes a site mounts by hand, closed over the composed runtime. The
 *  returned object is the internal one, presented through the narrow `ContentRoutes` view.
 */
export function createContentRoutes(runtime: CairnRuntime, config: ContentRoutesConfig = {}): ContentRoutes {
  return createContentRoutesInternal(runtime, config);
}
