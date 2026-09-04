// cairn-cms: the seven media stories for the live-reproduction seam (Task A6a of
// docs/superpowers/plans/2026-08-15-live-reproduction-seam-plan.md). Each row's component, host,
// and props-or-pose decision comes from docs/internal/record/repro-story-audit.md's seven `media/*`
// rows, and the sweep at docs/internal/record/2026-08-17-repro-audit-verification-sweep.md's
// findings 12, 14, and 17 correct three of that row set's own details (finding 9 is a general
// shellData invariant, already carried by ./support.js and ../ReproContext.svelte).
//
// Four rows (`media/library`, `media/details-panel`, `media/bulk-selection`, `media/delete-in-use`)
// mount the same component, `CairnMediaLibrary`, so each builds its own `data` object through
// libraryData() rather than sharing one: four mounted libraries on one page would otherwise alias
// each other's load data, the same discipline ./support.js's editPageProps() follows for the three
// EditPage rows.
import type { Component } from 'svelte';
import CairnMediaLibrary from '../../components/CairnMediaLibrary.svelte';
import MediaCaptureCard from '../../components/MediaCaptureCard.svelte';
import MediaHeroField from '../../components/MediaHeroField.svelte';
import MediaInsertPopover from '../../components/MediaInsertPopover.svelte';
import type { MediaLibrary, MediaLibraryEntry } from '../../media/library-entry.js';
import { formatMediaToken } from '../../media/reference.js';
import type { MediaLibraryData } from '../../sveltekit/content-routes-media.js';
import { fixtureCaptureFile, fixtureConcept, fixtureMediaLibrary } from '../fixtures.js';
import type { ReproStory } from '../index.js';
import { ENTRY, clickWhenPresent, waitFor } from './support.js';

/**
 * Look up a fixture asset by its display slug, never by its position in
 * {@link fixtureMediaLibrary}'s array: `media/delete-in-use` needs the one asset the fixture usage
 * overlay marks in use, and reaching it by name keeps that tie explicit however the array is later
 * reordered.
 * @param slug - the asset's display slug
 * @returns the matching fixture asset
 * @throws when no fixture asset carries that slug
 */
function assetBySlug(slug: string): MediaLibraryEntry {
  const asset = fixtureMediaLibrary.assets.find((entry) => entry.slug === slug);
  if (!asset) {
    throw new Error(`cairn reproductions: fixtureMediaLibrary carries no asset with slug "${slug}"`);
  }
  return asset;
}

const TRAILHEAD_VIEW = assetBySlug('trailhead-view');
const CABIN_PORCH = assetBySlug('cabin-porch');
const TEAM_PHOTO = assetBySlug('team-photo');
const LAKE_SUNRISE = assetBySlug('lake-sunrise');

/**
 * The fixture library keyed by content hash, the shape both bare media components take. Read-only
 *  lookup data, so unlike a `CairnMediaLibrary` story's own `data`, sharing one instance across the
 *  two bare stories below carries no aliasing risk.
 */
const libraryByHash: MediaLibrary = Object.fromEntries(
  fixtureMediaLibrary.assets.map((asset) => [asset.hash, asset]),
);

/**
 * A fresh `CairnMediaLibrary` load, one call per story: `assets` and `usage` are copied so no two
 *  mounted libraries share the same object identity.
 */
function libraryData(): MediaLibraryData {
  return {
    assets: [...fixtureMediaLibrary.assets],
    usage: { ...fixtureMediaLibrary.usage },
    error: null,
    flash: null,
  };
}

/**
 * The at-caret insert panel, posed open (`media/insert-panel`). It mounts headless, exactly as the
 * real editor mounts it, and the pose calls the exported `open('chooser')` on the mounted
 * instance, which is the same mechanism the toolbar's icon button uses. The story shipped its
 * first version with `trigger: true` instead, so the one reproduction whose whole job is fidelity
 * rendered a visible "Insert image" button that exists nowhere in `/admin`; widening the pose
 * signature to carry the instance is what retired it. `open()` calls `editor.caretCoords()`
 * synchronously, so the stub must exist and deliberately return `null` (the documented centered
 * fallback) rather than be omitted (sweep finding 12).
 */
const insertPanel: ReproStory = {
  id: 'media/insert-panel',
  component: MediaInsertPopover as unknown as Component<Record<string, unknown>>,
  host: 'bare',
  props: {
    conceptId: fixtureConcept.id,
    id: ENTRY.id,
    library: libraryByHash,
    editor: {
      caretCoords: () => null,
      focus: () => {},
      placeholders: {
        begin: () => 0,
        progress: () => {},
        resolveTo: () => {},
        cancel: () => {},
      },
      insertImage: () => {},
    },
    onuploaded: () => {},
  },
  pose: async (root, instance) => {
    const popover = instance as { open?: (signal: 'chooser' | 'capture', file?: File) => void } | undefined;
    if (typeof popover?.open !== 'function') {
      throw new Error(
        'cairn reproductions: media/insert-panel poses through MediaInsertPopover\'s exported ' +
          'open(), so its mounting host must pass ReproContext an `oninstance` callback and hand ' +
          'that value to pose() as its second argument',
      );
    }
    popover.open('chooser');
    await waitFor(root, '[role="dialog"][aria-label="Insert image"]', 'the opened insert panel');
  },
};

/**
 * The one-step capture card, at rest (`media/upload-form`). `fixtureCaptureFile`'s stem is a real
 * name, so `proposedNameFor` renders the Suggested tag; the card previews the file through
 * `URL.createObjectURL`, so it needs no media base.
 */
const uploadForm: ReproStory = {
  id: 'media/upload-form',
  component: MediaCaptureCard as unknown as Component<Record<string, unknown>>,
  host: 'bare',
  props: {
    file: fixtureCaptureFile,
    oncapture: () => {},
  },
};

/** The committed lead picture `media/lead-picture-dialog` opens to placement. */
const leadPictureValue = {
  src: formatMediaToken({ slug: TRAILHEAD_VIEW.slug, hash: TRAILHEAD_VIEW.hash }),
  alt: TRAILHEAD_VIEW.alt,
  caption: 'The trailhead parking area at sunrise.',
  decorative: false,
};

/**
 * The lead-picture field's edit dialog, posed to its placement view (`media/lead-picture-dialog`).
 * The pose reaches `openDialog('placement')` through the edit control, not the drop handler, which
 * carries its own separate `showModal()` call (sweep finding 17). `lead: true` matches the real
 * hero field's own `seo === true` wiring (`FieldInput.svelte`), and the committed value gives the
 * 16:9 preview an image.
 */
const leadPictureDialog: ReproStory = {
  id: 'media/lead-picture-dialog',
  component: MediaHeroField as unknown as Component<Record<string, unknown>>,
  host: 'bare',
  props: {
    field: { name: 'lead', label: 'Lead picture' },
    value: leadPictureValue,
    decorative: false,
    lead: true,
    mediaLibrary: libraryByHash,
    conceptId: fixtureConcept.id,
    id: ENTRY.id,
    onuploaded: () => {},
    ondirty: () => {},
  },
  pose: async (root) => {
    await clickWhenPresent(root, 'button[aria-haspopup="dialog"]', 'the hero field edit control');
    await waitFor(root, 'dialog.modal[open]', 'the opened lead picture dialog');
  },
};

/** The Library screen at rest, carrying the manifest's four frozen marker keys (`media/library`). */
const library: ReproStory = {
  id: 'media/library',
  component: CairnMediaLibrary as unknown as Component<Record<string, unknown>>,
  host: 'shell',
  props: { data: libraryData(), form: null },
  markers: [
    { n: 1, key: 'count-header', anchor: 'header p' },
    { n: 2, key: 'search', anchor: 'input[type="search"]' },
    { n: 3, key: 'view-toggle', anchor: '[role="group"][aria-label="Layout density"]' },
    { n: 4, key: 'filters', anchor: '[role="radiogroup"][aria-label="Filter assets"]' },
  ],
};

/**
 * The detail slide-over over one selected tile, `selected` being internal state with no prop
 *  (`media/details-panel`). The pose clicks the tile the fixture's usage overlay names, so the
 *  where-used section shows a real linked entry rather than the empty face.
 */
const detailsPanel: ReproStory = {
  id: 'media/details-panel',
  component: CairnMediaLibrary as unknown as Component<Record<string, unknown>>,
  host: 'shell',
  props: { data: libraryData(), form: null },
  pose: async (root) => {
    await clickWhenPresent(root, `[role="option"][aria-label^="${TEAM_PHOTO.displayName}"]`, 'the Team Photo tile');
    await waitFor(root, 'aside[role="region"]', 'the asset details panel');
  },
};

/**
 * Three tiles checked, opening the sticky selection bar; `selectedHashes` is an internal `Set`
 *  with no prop (`media/bulk-selection`).
 */
const bulkSelection: ReproStory = {
  id: 'media/bulk-selection',
  component: CairnMediaLibrary as unknown as Component<Record<string, unknown>>,
  host: 'shell',
  props: { data: libraryData(), form: null },
  pose: async (root) => {
    for (const asset of [TRAILHEAD_VIEW, CABIN_PORCH, LAKE_SUNRISE]) {
      await clickWhenPresent(
        root,
        `input[type="checkbox"][aria-label="Select ${asset.displayName}"]`,
        `the "${asset.displayName}" checkbox`,
      );
    }
    await waitFor(root, '[role="region"][aria-label="Selection actions"]', 'the selection action bar');
  },
};

/**
 * The in-use face of the safe-delete confirm, opened on the fixture's own in-use asset
 * (`media/delete-in-use`). The pose switches to the list density and clicks the row's own delete
 * trigger (`requestDelete`), which opens the dialog straight on that asset without the slide-over.
 */
const deleteInUse: ReproStory = {
  id: 'media/delete-in-use',
  component: CairnMediaLibrary as unknown as Component<Record<string, unknown>>,
  host: 'shell',
  props: { data: libraryData(), form: null },
  pose: async (root) => {
    await clickWhenPresent(root, 'button[aria-label="List view"]', 'the list view toggle');
    await clickWhenPresent(root, `button[aria-label="Delete ${TEAM_PHOTO.displayName}"]`, 'the row delete trigger');
    await waitFor(root, 'dialog[role="alertdialog"][open]', 'the opened delete confirm');
  },
};

/** The seven media stories, in manifest order. */
export const mediaStories: ReproStory[] = [
  insertPanel,
  uploadForm,
  leadPictureDialog,
  library,
  detailsPanel,
  bulkSelection,
  deleteInUse,
];
