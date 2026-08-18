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
import { createRawSnippet, type Component } from 'svelte';
import ConceptList from '../../components/ConceptList.svelte';
import EditPage from '../../components/EditPage.svelte';
import EditorToolbar from '../../components/EditorToolbar.svelte';
import MarkdownEditor from '../../components/MarkdownEditor.svelte';
import MediaFigureControl from '../../components/MediaFigureControl.svelte';
import TidyReview from '../../components/TidyReview.svelte';
import type { TidyApi } from '../../components/editor-tidy.js';
import type { NamedField, SiteRender } from '../../content/types.js';
import { defineRegistry, type ComponentRegistry } from '../../render/registry.js';
import type { EditData, ListData } from '../../sveltekit/content-routes-core.js';
import { fixtureConcept, fixtureDeskPathname, fixtureEntries, fixtureSiteName, fixtureTidyReview } from '../fixtures.js';
import type { ReproStory } from '../index.js';

/** The entry every editor story opens: the first fixture post, the one `fixtureDeskPathname` names. */
const ENTRY = fixtureEntries[0]!;

/**
 * How long a settle waits for a surface CodeMirror builds. The editor arrives through dynamic
 * imports in `onMount`, and the first one on a page pays the cold start, so this is sized like the
 * engine's own editor component tests rather than like a render tick.
 */
const SETTLE_TIMEOUT_MS = 20_000;

/**
 * Wait for a selector to appear under the mounted root, the observable condition a settle or a pose
 * waits on rather than a fixed delay.
 * @param root - the mounted story's container
 * @param selector - what the contracted surface renders as once it exists
 * @param what - the surface's name, for the failure message a capture would otherwise report as a
 * blank frame
 * @returns the matched element
 * @throws when the surface never appears
 */
async function waitFor(root: HTMLElement, selector: string, what: string): Promise<HTMLElement> {
  const deadline = Date.now() + SETTLE_TIMEOUT_MS;
  for (;;) {
    const found = root.querySelector<HTMLElement>(selector);
    if (found) return found;
    if (Date.now() > deadline) {
      throw new Error(`cairn reproductions: ${what} ("${selector}") never appeared under the mounted story`);
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

/**
 * The editing surface CodeMirror replaces the server render with. Until it lands, `MarkdownEditor`
 * is a hidden input, an empty div, and a fallback textarea, so every `EditPage` story waits here
 * before a capture reads the frame.
 * @param root - the mounted story's container
 */
async function settleEditingSurface(root: HTMLElement): Promise<void> {
  await waitFor(root, '#cairn-pane-write .cm-content', 'the editing surface');
}

/** The one sample component the fold pill and the insert palette resolve their labels through. */
const fixtureRegistry: ComponentRegistry = defineRegistry({
  components: [
    {
      name: 'two-up',
      label: 'Two-up layout',
      description: 'Two short passages side by side.',
      use: 'Use to set two short passages beside each other.',
      build: () => ({ type: 'element', tagName: 'div', properties: {}, children: [] }),
    },
  ],
});

/** The concept's frontmatter form: the title, the Hidden toggle, and the three Details fields. */
const fixtureFields: NamedField[] = [
  { name: 'title', label: 'Title', type: 'text', required: true },
  { name: 'draft', label: 'Hidden', type: 'boolean' },
  { name: 'date', label: 'Date', type: 'date', required: true },
  { name: 'tags', label: 'Tags', type: 'multiselect', taxonomy: true, options: ['trail-guide', 'gear', 'community-news'] },
  { name: 'lead', label: 'Lead picture', type: 'image', seo: true },
];

/**
 * The entry body every `EditPage` story edits.
 *
 * It carries NO media image on purpose. The preview pane builds its resolver internally from
 * `data.mediaTargets` and takes `publicPath`'s hardcoded `/media` default, which no story can reach
 * past (the audit's "Out of fix 1's reach"), so an image here would ask the docs origin for the
 * production media bucket. The page contract for these rows is the screen and its tabs, never an
 * illustrated preview, so the omission costs the stories nothing.
 */
const FIXTURE_BODY = [
  'The north ridge trailhead is twenty minutes off the highway, and the last mile of it is gravel.',
  '',
  '## Before you go',
  '',
  'Park in the upper lot. The lower one floods through early June and the tow notices are real.',
  '',
  '- Two litres of water each, more on a warm day',
  '- A layer for the ridge, which stays windy until midsummer',
  '- Boots you have already broken in',
  '',
  'The first mile climbs steadily through spruce before the trail opens onto the bench.',
].join('\n');

/**
 * The design-accurate preview the Preview tab renders, the one thing a site brings rather than the
 * engine. This is a story fixture, not a markdown pipeline: it turns the fixture body's blocks into
 * a small styled document, so the pane shows a page rather than unstyled markup. The style rides in
 * the returned html, which the preview frame's srcdoc carries, so the frame fetches nothing.
 * A real adapter's render is the floored engine pipeline, which sanitizes; this one escapes its
 * input instead, since the pane renders whatever the mounted editor holds and that is a live
 * surface, not only the fixture body.
 * @param input - the preview call's body and entry context; only the body is read here
 * @returns the html the preview frame renders
 */
const fixtureRender: SiteRender = async (input) => {
  const text = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const blocks = input.body
    .split('\n\n')
    .map((block) => {
      if (block.startsWith('## ')) return `<h2>${text(block.slice(3))}</h2>`;
      if (block.startsWith('- ')) {
        const items = block
          .split('\n')
          .map((line) => `<li>${text(line.replace(/^- /, ''))}</li>`)
          .join('');
        return `<ul>${items}</ul>`;
      }
      return `<p>${text(block)}</p>`;
    })
    .join('');
  const style = [
    'body{font-family:Georgia,serif;line-height:1.6;padding:2rem 1.5rem}',
    'article{max-width:34rem;margin:0 auto}',
    'h2{font-size:1.4rem;line-height:1.3;margin:2rem 0 .5rem}',
    'p,ul{margin:0 0 1rem}',
  ].join('');
  return `<style>${style}</style><article>${blocks}</article>`;
};

/**
 * One `EditPage` prop bag, fresh per story so three mounted editors never share a frontmatter
 * object. The shape is a real edit load's, so the component sees exactly what an admin route hands
 * it.
 * @returns the full prop bag `EditPage` takes
 */
function editPageProps(): Record<string, unknown> {
  const data: EditData & { siteName: string } = {
    conceptId: fixtureConcept.id,
    id: ENTRY.id,
    label: fixtureConcept.label,
    fields: fixtureFields,
    frontmatter: {
      title: ENTRY.title,
      date: ENTRY.date,
      draft: false,
      tags: ['trail-guide'],
    },
    body: FIXTURE_BODY,
    title: ENTRY.title,
    isNew: false,
    saved: false,
    renamed: false,
    // The Address group shows the date-stripped id, the way a dated concept's edit load composes
    // it, so the pictured URL cannot drift from the entry the story opens.
    slug: ENTRY.id.replace(/^\d{4}-\d{2}-\d{2}-/, ''),
    linkTargets: [],
    fragmentTargets: null,
    routable: true,
    mediaTargets: {},
    mediaLibrary: {},
    inboundLinks: [],
    pending: false,
    published: true,
    publishedFlash: false,
    publishActions: [],
    discardedFlash: false,
    // Non-null with no stylesheets: the frame links nothing (a docs page fetches no site CSS), and
    // the "preview shows unstyled markup" hint an unset knob renders stays off a reader's screen.
    preview: { stylesheets: [] },
    spellcheckDictionary: 'dictionary-en-us.txt',
    siteDictionary: [],
    tidy: { enabled: true, model: 'claude-sonnet-4-6', conventions: fixtureTidyReview.conventions },
    advisories: [],
    orphanTags: [],
    siteName: fixtureSiteName,
  };
  return {
    data,
    registry: fixtureRegistry,
    render: fixtureRender,
    form: null,
    // Fix 3: no mounted editing surface starts a spellcheck Worker or fetches its wasm and
    // dictionary, whatever the reader's own stored preference says.
    spellcheckOverride: false,
  };
}

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
 * One host insert control, in the icon-button shape `EditPage` gives its own.
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
 * builds the same strip through `createRawSnippet`. The resting states are the real ones: the Tidy
 * action is a labelled button, and the figure control sits guarded until a caret lands on an image.
 */
const insertControls = createRawSnippet(() => ({
  render: () =>
    '<span style="display:contents">' +
    insertButton(
      'Insert block',
      '<path d="M10 22V7a1 1 0 0 0-1-1H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5a1 1 0 0 0-1-1H2"/>' +
        '<rect x="14" y="2" width="8" height="8" rx="1"/>',
    ) +
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

/** The list load behind the concept sidebar's Posts screen. */
const fixtureListData: ListData = {
  conceptId: fixtureConcept.id,
  label: fixtureConcept.label,
  singular: fixtureConcept.singular,
  dated: true,
  routable: true,
  entries: fixtureEntries,
  error: null,
  formError: null,
  publishedAll: null,
};

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
  shellPathname: fixtureDeskPathname,
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
  props: { data: fixtureListData, form: null },
};

/** The Preview tab and its width control (`editor/preview-tab`). */
const previewTab: ReproStory = {
  id: 'editor/preview-tab',
  component: EditPage as unknown as Component<Record<string, unknown>>,
  host: 'shell',
  shellPathname: fixtureDeskPathname,
  props: editPageProps(),
  settle: settleEditingSurface,
  pose: async (root) => {
    (await waitFor(root, '#cairn-tab-preview', 'the Preview tab')).click();
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
  shellPathname: fixtureDeskPathname,
  props: editPageProps(),
  settle: settleEditingSurface,
  pose: async (root) => {
    (await waitFor(root, 'button[aria-label="Details"]', 'the Details trigger')).click();
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
