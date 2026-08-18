// cairn-cms: the node-safe half of the live-reproduction seam.
//
// The contract that matters is not "imports nothing" (this module now re-exports ./validate.ts's
// YAML-checking logic) but that nothing in this module's static import graph is ever a `.svelte`
// specifier or pulls in Svelte's runtime: the engine's check:visuals gate and cairn-pub's fence
// validation both read this module from a bare `node` process, so a single Svelte-carrying
// specifier anywhere in the graph would break both gates at once.
// src/tests/unit/reproductions-manifest.test.ts holds the source graph to that rule and
// src/tests/unit/reproductions-manifest-dist-spawn.test.ts holds the emitted dist to it.
//
// The Svelte-importing half (component references, fixture props, poses, the context wrapper) is
// ./index.ts, on the `@glw907/cairn-cms/reproductions` subpath. Nothing here may import it.
//
// The ids, their order, and the flags come from the story inventory in cairn-pub
// docs/superpowers/specs/2026-08-15-live-reproduction-seam-design.md; the per-story mechanism
// evidence is docs/internal/record/repro-story-audit.md.

/**
 * The prerendered iframe height for each embed width a docs page may ask for, in CSS pixels.
 *
 * A width with no declared height is a width the fence schema refuses, which is how a page is kept
 * from pinning a story to a face nobody sized. Hydration refines the shipped height against the
 * measured content, so these are a good first paint rather than a promise about the render.
 */
export interface ReproHeights {
  /** The responsive default embed, filling the docs content column. */
  column?: number;
  /** The 1280px pinned embed, the only width that renders the shell's persistent sidebar. */
  wide?: number;
  /** The 860px pinned embed. */
  desktop?: number;
  /** The 390px pinned embed. */
  narrow?: number;
}

/** One story's node-safe description: everything a gate can check without mounting anything. */
export interface ReproManifestEntry {
  /** The id a `repro` fence names, `<group>/<name>`, with exactly one slash. */
  id: string;
  /** Declared iframe heights, keyed by the embed width that uses them. */
  heights: ReproHeights;
  /**
   * The stable keys the page's numbered callout list cites, one per rendered chip. Empty for a
   * story that carries no callouts. Gate 1 counts these against the keyed list on the page that
   * embeds the story, so a prose list cannot silently misnumber.
   */
  markerKeys: string[];
  /** Whether the story needs a post-mount step to reach the state its page contract names. */
  pose: boolean;
  /** Whether the story renders inside `CairnAdminShell` or on its own. */
  host: 'shell' | 'bare';
  /**
   * Whether the mounted component resolves its own theme rather than inheriting the repro route's
   * `[data-repro-root]`. True for the two auth pages, which render their wrapper from `data.theme`,
   * and for every shell-hosted story, since `CairnAdminShell` is itself an own-theme-root
   * component. The repro route hands these stories the theme as a prop and updates it when the
   * root attribute flips.
   */
  ownThemeRoot: boolean;
}

/**
 * The 25 stories, in the spec inventory's order.
 *
 * Adding, removing, or renaming an entry is a spec edit: cairn-pub docs pages cite these ids, and
 * a fence naming an id the installed manifest does not carry fails the consumer's build.
 */
export const manifest: ReproManifestEntry[] = [
  {
    id: 'auth/login',
    heights: { column: 520 },
    markerKeys: [],
    pose: false,
    host: 'bare',
    ownThemeRoot: true,
  },
  {
    id: 'auth/confirm',
    heights: { column: 420 },
    markerKeys: [],
    pose: false,
    host: 'bare',
    ownThemeRoot: true,
  },
  {
    // Pinned, not responsive: the frozen marker `write-preview-tabs` names an element inside the
    // toolbar's `sm:`-gated wrapper (EditorToolbar.svelte:423), which a docs column narrower than
    // 640 hides outright. 860 clears that gate and stays under the shell's 1024 sidebar
    // breakpoint, so the whole width goes to the document body the row is about.
    id: 'editor/entry-screen',
    heights: { desktop: 760 },
    markerKeys: [
      'title-field',
      'toolbar',
      'write-preview-tabs',
      'details-trigger',
      'writing-surface',
    ],
    pose: false,
    host: 'shell',
    ownThemeRoot: true,
  },
  {
    // Pinned to the same width as `editor/entry-screen`, and for the same `sm:` gate seen from the
    // other side: the strip is this row's whole subject, and below 640 EditorToolbar.svelte:423
    // hides the Write/Preview tablist (the real editor folds it into `moreExtra`, which this story
    // does not supply) and every cluster's micro-eyebrow goes with it. A responsive `column` embed
    // renders in a narrow docs column, so it would show the subject stripped of the parts the row
    // exists to name.
    id: 'editor/toolbar',
    heights: { desktop: 220 },
    markerKeys: [],
    pose: false,
    host: 'bare',
    ownThemeRoot: false,
  },
  {
    // Pinned wide: half this row's contract is the concept sidebar, which is a DaisyUI drawer that
    // only sits persistently open from `lg` (1024) off a desk path and `xl` (1280) on one
    // (CairnAdminShell.svelte:561-563). Below that the sidebar is off-canvas and the story shows
    // half its subject. At 1280 the fixed nav stack governs the height rather than the four-entry
    // list beside it, since the content column is the part that widens.
    id: 'editor/sidebar-list',
    heights: { wide: 620 },
    markerKeys: [],
    pose: false,
    host: 'shell',
    ownThemeRoot: true,
  },
  {
    // Pinned to the same width and box as `editor/entry-screen`: the pose clicks the Preview tab,
    // which lives in the same `sm:`-gated toolbar wrapper, and a page showing both faces should
    // read as one screen switching tabs rather than two differently sized screens.
    id: 'editor/preview-tab',
    heights: { desktop: 760 },
    markerKeys: [],
    pose: true,
    host: 'shell',
    ownThemeRoot: true,
  },
  {
    id: 'editor/details-panel',
    heights: { column: 760 },
    markerKeys: [],
    pose: true,
    host: 'shell',
    ownThemeRoot: true,
  },
  {
    id: 'editor/figure-dialog',
    heights: { column: 560 },
    markerKeys: [],
    pose: false,
    host: 'bare',
    ownThemeRoot: false,
  },
  {
    id: 'editor/tidy-review',
    heights: { column: 620 },
    markerKeys: [],
    pose: false,
    host: 'bare',
    ownThemeRoot: false,
  },
  {
    id: 'editor/collapsed-layout-block',
    heights: { column: 320 },
    markerKeys: [],
    pose: false,
    host: 'bare',
    ownThemeRoot: false,
  },
  {
    // The only two-width row. It declares no `column` height on purpose: the page pins both faces,
    // and a responsive band render is not a thing that page asks for, so a responsive fence
    // against this story fails gate 1 for want of a declared height.
    id: 'publish/header-band',
    heights: { desktop: 180, narrow: 300 },
    markerKeys: [],
    pose: true,
    host: 'shell',
    ownThemeRoot: true,
  },
  {
    id: 'publish/history-list',
    heights: { column: 640 },
    markerKeys: [],
    pose: false,
    host: 'shell',
    ownThemeRoot: true,
  },
  {
    id: 'publish/pending-list',
    heights: { column: 640 },
    markerKeys: [],
    pose: true,
    host: 'shell',
    ownThemeRoot: true,
  },
  {
    id: 'publish/refusal-banner',
    heights: { column: 480 },
    markerKeys: [],
    pose: false,
    host: 'bare',
    ownThemeRoot: false,
  },
  {
    id: 'media/insert-panel',
    heights: { column: 480 },
    markerKeys: [],
    pose: true,
    host: 'bare',
    ownThemeRoot: false,
  },
  {
    id: 'media/upload-form',
    heights: { column: 560 },
    markerKeys: [],
    pose: false,
    host: 'bare',
    ownThemeRoot: false,
  },
  {
    id: 'media/lead-picture-dialog',
    heights: { column: 620 },
    markerKeys: [],
    pose: true,
    host: 'bare',
    ownThemeRoot: false,
  },
  {
    id: 'media/library',
    heights: { column: 720 },
    markerKeys: ['count-header', 'search', 'view-toggle', 'filters'],
    pose: false,
    host: 'shell',
    ownThemeRoot: true,
  },
  {
    id: 'media/details-panel',
    heights: { column: 720 },
    markerKeys: [],
    pose: true,
    host: 'shell',
    ownThemeRoot: true,
  },
  {
    id: 'media/bulk-selection',
    heights: { column: 720 },
    markerKeys: [],
    pose: true,
    host: 'shell',
    ownThemeRoot: true,
  },
  {
    id: 'media/delete-in-use',
    heights: { column: 720 },
    markerKeys: [],
    pose: true,
    host: 'shell',
    ownThemeRoot: true,
  },
  {
    id: 'tags/screen',
    heights: { column: 700 },
    markerKeys: ['add-field', 'tag-list', 'unused-tag', 'not-on-list', 'save-changes'],
    pose: false,
    host: 'shell',
    ownThemeRoot: true,
  },
  {
    id: 'roster/own-row',
    heights: { column: 640 },
    markerKeys: [],
    pose: false,
    host: 'shell',
    ownThemeRoot: true,
  },
  {
    // Pinned wide for the same reason as `editor/sidebar-list`, and more strictly: the nav groups
    // render inside `.drawer-side`, so below the persistent breakpoint the whole subject is
    // off-canvas. The contract names the fallback group under the divider, the bottom of the same
    // nav stack, so both rows are sized by that one measurement.
    id: 'nav/worked-navlayout',
    heights: { wide: 620 },
    markerKeys: [],
    pose: false,
    host: 'shell',
    ownThemeRoot: true,
  },
  {
    id: 'toolkit/custom-screen',
    heights: { column: 640 },
    markerKeys: [],
    pose: false,
    host: 'shell',
    ownThemeRoot: true,
  },
];

/**
 * The path segment every fixture media URL mounts under on `/repro` pages, cairn-pub's own asset
 * route (never `/media`, the real admin's default): `${fixtureMediaBase}/<file>` for a file named in
 * {@link fixtureMediaFiles}.
 */
export const fixtureMediaBase = '/repro-assets';

/**
 * The fixture media bytes' filenames, exactly as packaged under `dist/reproductions/fixtures/`, so
 * cairn-pub's asset route (`src/routes/repro-assets/[...file]/+server.ts`) can enumerate them for
 * `entries()` without importing the Svelte-carrying `./index.js` half of this module.
 */
export const fixtureMediaFiles: string[] = [
  'trailhead-view.4dcfd814c4ebd018.png',
  'cabin-porch.53bf374ac4d3c1fc.png',
  'team-photo.25bb1ae176664419.png',
  'lake-sunrise.f0225d64bbac1d37.png',
  'trail-map.59be2d4d416f67cf.png',
];

// Re-exported from ./validate.ts so a consumer of the node-safe manifest subpath (this gate,
// cairn-pub's fence plugin) gets the validator from the same specifier as the data it checks
// against, with no second import path to keep in sync.
export { validateReproFence, type ReproFenceValidation } from './validate.js';
