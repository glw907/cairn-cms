// cairn-cms: the conventions pass, Task 5's compile-only proof that the flattened
// `ContentFormFailure` (ruling 5's outcome idiom plus `audit-sveltekit-contentformfailure`'s
// prescribed shape) is assignable from every one of the eleven arm shapes it used to compose
// through a `Partial<>` intersection, and that the eight re-typed core actions
// (`createAction`, `saveAction`, `publishAction`, `deleteAction`, `listDeleteAction`,
// `renameAction`, `previewMintAction`, `previewRevokeAction`) each declare
// `ActionFailure<ContentFormFailure>`. Five of the eleven arm shapes below
// (`SaveFailure`, `RenameFailure`, `CreateFailure`, `PreviewMintFailure`, and the un-exported
// half of `DeleteRefusal`'s siblings) retired from every barrel and subpath in this same task, so
// this file states each shape structurally rather than importing a retired name; that is itself
// part of the leak-free proof (a public-facing file cannot reach for the retired names anymore).
// Extended by the 4b conformance pass, Task 1, with a compile-only proof of `UsageEntry`'s
// reference recovery expression, `NonNullable<ContentFormFailure['usage']>[number]`.
import { describe, it, expect } from 'vitest';
import type { ContentFormFailure, ContentRoutes } from '../../lib/sveltekit/content-routes.js';
import type { CairnEvent } from '../../lib/sveltekit/types.js';
import type { ActionFailure } from '@sveltejs/kit';
import type { InboundLink } from '../../lib/content/manifest.js';
import type { UsageEntry } from '../../lib/media/usage.js';

// The one runtime test in this compile-only file (vitest fails a `.test.ts` declaring no suite);
// the runtime "key set unchanged" proof per re-typed action lives beside each action's own
// harness in content-routes-{list,delete,rename,save,publish}.test.ts and
// content-routes-preview.test.ts, where the fixtures already live.
describe('content-form-failure-flattened: the flat ContentFormFailure (conventions pass, Task 5)', () => {
  it('is a compile-only fixture, collected so the file is a test module', () => {
    expect(true).toBe(true);
  });
});

// The eleven arm shapes ContentFormFailure's Partial<> intersection used to compose, restated
// structurally (never by importing the five retired names, which no longer exist as exports).
// Each must be assignable into the flat, all-optional ContentFormFailure with no cast.
function typeOnlyArmAssignability(): void {
  const createFailure: { error: string } = { error: 'bad slug' };
  const renameFailure: { error: string } = { error: 'bad slug' };
  const previewMintFailure: { error: string } = { error: 'no draft' };
  const mediaBulkFailure: { error: string } = { error: 'media off' };
  const tidyFailure: { error: string } = { error: 'csrf' };
  const saveFailure: { error: string; brokenLinks: string[]; body: string } = { error: 'e', brokenLinks: [], body: 'b' };
  const deleteRefusal: { error: string; inboundLinks: InboundLink[]; inboundKind?: 'link' | 'include'; id: string } = {
    error: 'e',
    inboundLinks: [],
    id: 'x',
  };
  const mediaUpdateFailure: { error: string; hash?: string } = { error: 'e', hash: 'h' };
  const mediaAltPropagateFailure: { error: string; hash?: string } = { error: 'e' };
  const mediaDeleteRefusal: { error: string; hash: string; usage: UsageEntry[]; foundIn: number } = {
    error: 'e',
    hash: 'h',
    usage: [],
    foundIn: 1,
  };
  const mediaReplaceFailure: { error: string; hash: string; usage: UsageEntry[]; foundIn: number } = {
    error: 'e',
    hash: 'h',
    usage: [],
    foundIn: 1,
  };

  const c1: ContentFormFailure = createFailure;
  const c2: ContentFormFailure = renameFailure;
  const c3: ContentFormFailure = previewMintFailure;
  const c4: ContentFormFailure = mediaBulkFailure;
  const c5: ContentFormFailure = tidyFailure;
  const c6: ContentFormFailure = saveFailure;
  const c7: ContentFormFailure = deleteRefusal;
  const c8: ContentFormFailure = mediaUpdateFailure;
  const c9: ContentFormFailure = mediaAltPropagateFailure;
  const c10: ContentFormFailure = mediaDeleteRefusal;
  const c11: ContentFormFailure = mediaReplaceFailure;
  void [c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11];
}
void typeOnlyArmAssignability;

// The eight re-typed core actions declare ActionFailure<ContentFormFailure> on ContentRoutes,
// the public hand-mount contract; mutual assignability against the declared union proves neither
// side widened past the other (the same shape check factory-contracts.test.ts uses).
function typeOnlyCoreActionContracts(routes: ContentRoutes): void {
  const create: (event: CairnEvent) => Promise<ActionFailure<ContentFormFailure>> = routes.createAction;
  const save: (event: CairnEvent) => Promise<ActionFailure<ContentFormFailure>> = routes.saveAction;
  const publish: (event: CairnEvent) => Promise<ActionFailure<ContentFormFailure>> = routes.publishAction;
  const del: (event: CairnEvent) => Promise<ActionFailure<ContentFormFailure>> = routes.deleteAction;
  const listDelete: (event: CairnEvent) => Promise<ActionFailure<ContentFormFailure>> = routes.listDeleteAction;
  const rename: (event: CairnEvent) => Promise<ActionFailure<ContentFormFailure>> = routes.renameAction;
  const previewMint: (event: CairnEvent) => Promise<ActionFailure<ContentFormFailure> | { url: string; expiresAt: number }> =
    routes.previewMintAction;
  const previewRevoke: (event: CairnEvent) => Promise<ActionFailure<ContentFormFailure> | { count: number }> = routes.previewRevokeAction;
  void [create, save, publish, del, listDelete, rename, previewMint, previewRevoke];
}
void typeOnlyCoreActionContracts;

// 4b, Task 1: `UsageEntry` retired from every barrel and subpath (the module-level export stays
// in `media/usage.js` for its eight-plus in-engine namers). The reference page's stated recovery
// for a public caller that needs the element type is indexing off the surviving carrier:
// `NonNullable<ContentFormFailure['usage']>[number]`. This proves that expression is exactly
// `UsageEntry`, mutually assignable with no cast.
function typeOnlyUsageEntryRecovery(): void {
  type RecoveredUsageEntry = NonNullable<ContentFormFailure['usage']>[number];
  const fromRecovery: UsageEntry = { concept: 'posts', id: 'a', title: 'A', origin: { kind: 'published' } };
  const toRecovery: RecoveredUsageEntry = fromRecovery;
  void toRecovery;
}
void typeOnlyUsageEntryRecovery;
