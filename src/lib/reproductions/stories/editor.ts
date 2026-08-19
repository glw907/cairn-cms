// cairn-cms: the eight editor stories for the live-reproduction seam (Task A5a of
// docs/superpowers/plans/2026-08-15-live-reproduction-seam-plan.md). Each row's component, host,
// and props-or-pose decision comes from docs/internal/record/repro-story-audit.md; what each render
// must SHOW comes from the page contracts in
// docs/internal/record/2026-08-15-docs-outlines-with-visuals.md, which for these eight is
// docs/editors/write-in-the-editor.md.
//
// Three of the rows mount EditPage inside the shell. Two things are load-bearing there and are easy
// to lose: the shell needs the desk pathname (off it the shell renders office chrome, which moves
// the sidebar breakpoint and drops the narrow band compaction), and every mounted editing surface
// takes `spellcheckOverride: false`, so a docs page carrying several of them starts no spellcheck
// Worker and fetches no wasm binary or dictionary per embed.
//
// The `EditPage` prop bag, the wait helper, and the settle they share moved to ./support.ts (Task
// A5b) once `publish/header-band` needed the same pieces; this module imports them back, along with
// the `ConceptList` load `publish/refusal-banner` mounts against too.
import { createRawSnippet, type Component } from 'svelte';
import ConceptList from '../../components/ConceptList.svelte';
import EditPage from '../../components/EditPage.svelte';
import EditorToolbar from '../../components/EditorToolbar.svelte';
import MarkdownEditor from '../../components/MarkdownEditor.svelte';
import MediaFigureControl from '../../components/MediaFigureControl.svelte';
import TidyReview from '../../components/TidyReview.svelte';
import type { TidyApi } from '../../components/editor-tidy.js';
import { fixtureDeskPathname, fixtureTidyReview } from '../fixtures.js';
import type { ReproStory } from '../index.js';
import {
  ENTRY,
  clickWhenPresent,
  conceptListData,
  editPageProps,
  fixtureRegistry,
  settleEditingSurface,
  waitFor,
} from './support.js';

/**
 * The stroke-icon markup the toolbar's own glyph buttons use, for the host insert controls below.
 * @param inner - the icon's shapes
 * @returns one svg element's markup
 */
function glyph(inner: string): string {
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" ' +
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
    `aria-hidden="true">${inner}</svg>`
  );
}

/**
 * One host insert control that opens a dialog, in the icon-button shape `EditPage` gives its own.
 * @param label - the control's accessible name and tooltip
 * @param inner - the icon's shapes
 * @returns one button's markup
 */
function insertButton(label: string, inner: string): string {
  return (
    '<button type="button" class="btn btn-sm btn-ghost btn-square" aria-haspopup="dialog" ' +
    `aria-label="${label}" title="${label}">${glyph(inner)}</button>`
  );
}

/**
 * The Insert group's contents, which the toolbar takes from its host rather than wiring itself.
 * `EditPage` renders these as a Svelte snippet; a story module has no markup of its own, so it
 * builds the same strip through `createRawSnippet`. Seven controls, the number the real Insert
 * group renders for this story's fixture: only "Include a fragment" is missing, gated off by the
 * fixture's `fragmentTargets: null`. The resting states are the real ones: the Tidy action is a
 * labelled button, and Edit block and the figure control each sit guarded until a caret lands on
 * what they act upon.
 */
const insertControls = createRawSnippet(() => ({
  render: () =>
    '<span style="display:contents">' +
    insertButton(
      'Insert block',
      '<path d="M10 22V7a1 1 0 0 0-1-1H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5a1 1 0 0 0-1-1H2"/>' +
        '<rect x="14" y="2" width="8" height="8" rx="1"/>',
    ) +
    // Edit block, at rest: `hasComponents` opens the same gate that renders Insert block beside it,
    // and with no caret in a component the control is unavailable, guarded the same way as the
    // figure control below (cairn-btn-guarded and cursor-not-allowed, never btn-disabled, which
    // would set pointer-events: none and suppress the title tooltip a mouse user reads for the why).
    '<button type="button" class="btn btn-sm btn-ghost btn-square cairn-btn-guarded cursor-not-allowed" ' +
    'aria-haspopup="dialog" aria-label="Place the cursor in a component to edit it" ' +
    'title="Place the cursor in a component to edit it" aria-disabled="true">' +
    glyph(
      '<path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>' +
        '<path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/>',
    ) +
    '</button>' +
    insertButton(
      'Web link (Ctrl+K)',
      '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>' +
        '<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    ) +
    insertButton(
      'Link to page',
      '<path d="M4 11V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.706.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h7"/>' +
        '<path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="m10 18 3-3-3-3"/>',
    ) +
    insertButton(
      'Insert image',
      '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/>' +
        '<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
    ) +
    '<button type="button" class="btn btn-sm btn-ghost gap-1.5" aria-label="Tidy" ' +
    'title="Tidy: a light copy-edit you review before accepting">' +
    glyph(
      '<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/>' +
        '<path d="M20 2v4"/><path d="M22 4h-4"/><circle cx="4" cy="20" r="2"/>',
    ) +
    'Tidy</button>' +
    '<button type="button" class="btn btn-sm btn-ghost btn-square cairn-btn-guarded cursor-not-allowed" ' +
    'aria-haspopup="dialog" aria-disabled="true" aria-label="Place the cursor on an image to add a figure" ' +
    'title="Place the cursor on an image to add a figure">' +
    glyph(
      '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/>' +
        '<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
    ) +
    '</button>' +
    '</span>',
}));

/**
 * The apply seam `TidyReview` drives the editor through. A story pictures the review at rest and
 * goes inert after mount, so nothing here is ever called; it exists because the prop is required
 * and there is no mounted editor under this story to take a real one from.
 */
const inertTidyApi: TidyApi = {
  enter: () => {},
  acceptOne: () => {},
  rejectOne: () => {},
  acceptMany: () => {},
  rejectAll: () => {},
  exit: () => {},
};

/** The entry the fold pill collapses: prose, one layout block, prose. */
const LAYOUT_BLOCK_BODY = [
  'The bench above the second switchback is the first place the valley opens up.',
  '',
  ':::two-up{title="Trail and map"}',
  'The ridge trail climbs steadily for the first mile, then eases along the bench.',
  '',
  'The map names both parking areas and the seasonal closure below the creek.',
  ':::',
  '',
  'Turn back at the saddle if the wind picks up; the last half mile is exposed.',
].join('\n');

/** The resting Write tab: the title field, the toolbar, both tabs, Details, the writing surface. */
const entryScreen: ReproStory = {
  id: 'editor/entry-screen',
  component: EditPage as unknown as Component<Record<string, unknown>>,
  host: 'shell',
  shellData: { pathname: fixtureDeskPathname },
  props: editPageProps(),
  settle: settleEditingSurface,
  markers: [
    { n: 1, key: 'title-field', anchor: 'input[name="title"]' },
    { n: 2, key: 'toolbar', anchor: '[role="toolbar"][aria-label="Formatting"]' },
    { n: 3, key: 'write-preview-tabs', anchor: '[role="tablist"][aria-label="Editor view"]' },
    { n: 4, key: 'details-trigger', anchor: 'button[aria-label="Details"]' },
    { n: 5, key: 'writing-surface', anchor: '#cairn-pane-write .cm-content' },
  ],
};

/** The instrument strip on its own: Format, Structure, and Insert (`editor/toolbar`). */
const toolbar: ReproStory = {
  id: 'editor/toolbar',
  component: EditorToolbar as unknown as Component<Record<string, unknown>>,
  host: 'bare',
  props: {
    format: () => {},
    mode: 'write',
    onMode: () => {},
    device: 'desktop',
    onDevice: () => {},
    onHelp: () => {},
    insertControls,
  },
};

/** The concept sidebar beside the Posts list, its status badges, and New post (`editor/sidebar-list`). */
const sidebarList: ReproStory = {
  id: 'editor/sidebar-list',
  component: ConceptList as unknown as Component<Record<string, unknown>>,
  host: 'shell',
  props: { data: conceptListData(), form: null },
};

/** The Preview tab and its width control (`editor/preview-tab`). */
const previewTab: ReproStory = {
  id: 'editor/preview-tab',
  component: EditPage as unknown as Component<Record<string, unknown>>,
  host: 'shell',
  shellData: { pathname: fixtureDeskPathname },
  props: editPageProps(),
  settle: settleEditingSurface,
  pose: async (root) => {
    await clickWhenPresent(root, '#cairn-tab-preview', 'the Preview tab');
    // The preview render is debounced, so the pane exists before its frame does; the frame is what
    // the page is showing, and waiting for it is what keeps a capture off the empty-pane message.
    await waitFor(root, '#cairn-pane-preview iframe[title="Page preview"]', 'the preview frame');
  },
};

/** The open Details panel over the entry's settings (`editor/details-panel`). */
const detailsPanel: ReproStory = {
  id: 'editor/details-panel',
  component: EditPage as unknown as Component<Record<string, unknown>>,
  host: 'shell',
  shellData: { pathname: fixtureDeskPathname },
  props: editPageProps(),
  settle: settleEditingSurface,
  pose: async (root) => {
    await clickWhenPresent(root, 'button[aria-label="Details"]', 'the Details trigger');
    await waitFor(root, '[aria-label="Entry details"]:not([hidden])', 'the Details panel');
  },
};

/** The figure form at its edit fold: caption, placement, Unwrap and Update (`editor/figure-dialog`). */
const figureDialog: ReproStory = {
  id: 'editor/figure-dialog',
  component: MediaFigureControl as unknown as Component<Record<string, unknown>>,
  host: 'bare',
  props: {
    caption: 'The upper lot, an hour after sunrise.',
    role: 'wide',
    mode: 'edit',
    decorative: false,
    onapply: () => {},
    onunwrap: () => {},
  },
};

/** A tidy review in progress, one hunk marked Review this (`editor/tidy-review`). */
const tidyReview: ReproStory = {
  id: 'editor/tidy-review',
  component: TidyReview as unknown as Component<Record<string, unknown>>,
  host: 'bare',
  props: {
    changes: fixtureTidyReview.changes,
    original: fixtureTidyReview.original,
    conventions: fixtureTidyReview.conventions,
    model: 'claude-sonnet-4-6',
    title: ENTRY.title,
    api: inertTidyApi,
    onclose: () => {},
    onshow: () => {},
  },
};

/** A layout block collapsed to its pill, with the gutter control (`editor/collapsed-layout-block`). */
const collapsedLayoutBlock: ReproStory = {
  id: 'editor/collapsed-layout-block',
  component: MarkdownEditor as unknown as Component<Record<string, unknown>>,
  host: 'bare',
  props: {
    value: LAYOUT_BLOCK_BODY,
    name: 'body',
    registry: fixtureRegistry,
    foldOnMount: true,
    // The bare editor's own spellcheck lever (EditPage's `spellcheckOverride` reaches this same
    // posture): with it off the lint extension is never installed, so no Worker starts.
    spellcheck: false,
  },
  settle: async (root) => {
    // The pill is the whole subject and it exists only after the mount-time fold runs, which is
    // itself after CodeMirror's dynamic imports land. Without this the render is a textarea.
    await waitFor(root, '.cm-cairn-fold-pill', 'the collapsed block pill');
  },
};

/** The eight editor stories, in manifest order. */
export const editorStories: ReproStory[] = [
  entryScreen,
  toolbar,
  sidebarList,
  previewTab,
  detailsPanel,
  figureDialog,
  tidyReview,
  collapsedLayoutBlock,
];
