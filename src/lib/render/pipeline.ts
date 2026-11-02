// cairn-cms: the shared render pipeline (remark parse, gfm, directives, cairn's remark and
// rehype steps in a fixed order, then sanitize and stringify). This is `renderDocument`'s wiring:
// every mdast/hast step the render pipeline owns is composed here once, so the editor preview and
// every public page call the exact same pipeline, never two divergent ones.
import { unified, type PluggableList } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import rehypeSanitize from 'rehype-sanitize';
import type { Schema } from 'hast-util-sanitize';
import { VFile } from 'vfile';
import { buildSanitizeSchema, rehypeAnchorRel, rehypeSinkGuard, rehypeTaskListA11y } from './sanitize-schema.js';
import { rehypeCairnHighlight } from './highlight.js';
import { rehypeTableScroll } from './table-scroll.js';
import { remarkDirectiveStamp } from './remark-directives.js';
import { remarkFigure } from './remark-figure.js';
import { remarkResolveCairnLinks, CAIRN_RESOLVE } from './resolve-links.js';
import { remarkResolveMedia, MEDIA_RESOLVE, type MediaResolve } from './resolve-media.js';
import { remarkResolveIncludes, FRAGMENT_RESOLVE, type FragmentResolve } from './resolve-include.js';
import { rehypeDispatch } from './rehype-dispatch.js';
import { defineRegistry, type ComponentRegistry } from './registry.js';
import { rehypeCollectHeadings, DOC_HEADINGS, type DocHeading } from './collect-headings.js';
import type { LinkResolve } from '../content/links.js';

export type { DocHeading } from './collect-headings.js';

/**
 * The per-call resolver hooks `render` and `renderDocument` both accept, threaded onto
 * the VFile's data so the cairn: link, media:, and ::include steps read them at process time.
 * @public
 */
export type ResolveOptions = {
  /** Rewrites `cairn:` links to live permalinks. Absent, a `cairn:` link is left unresolved. */
  resolveLink?: LinkResolve;
  /** Resolves `media:` references. Absent, the renderer's `resolveMedia` default applies. */
  resolveMedia?: MediaResolve;
  /** Resolves an `::include` fragment id to its raw markdown body. Absent, the directive stays literal text. */
  resolveFragment?: FragmentResolve;
};

/**
 * The one input `render`, `renderDocument`, and `SiteRender` share: the entry's body, the entry
 * context a custom renderer may vary output by, and the per-call resolvers.
 * @public
 */
export type RenderInput = ResolveOptions & {
  /** The markdown to render. */
  body: string;
  /** The entry's concept id. Absent for the standalone component-insert preview. */
  concept?: string;
  /** The entry's frontmatter. Absent for the standalone component-insert preview. */
  frontmatter?: Record<string, unknown>;
};

/**
 * The render pipeline `createRenderer` returns.
 * @public
 */
export interface Renderer {
  /**
   * Render an input to sanitized HTML. It is a standalone function, so a site passes
   * `renderer.render` straight as `rendering.render` with every resolver in `RenderInput`
   * forwarded.
   * @returns The rendered HTML string.
   */
  render(input: RenderInput): Promise<string>;
  /**
   * Render an input and also collect its headings.
   * @returns The HTML plus the document's `headings` in document order, collected from the final
   * rehype tree after `rehypeSlug` and any site `rehypePlugins` have run.
   */
  renderDocument(input: RenderInput): Promise<{ html: string; headings: DocHeading[] }>;
}

/**
 * The options `createRenderer` takes.
 * @public
 */
export interface RendererConfig {
  /**
   * The site's component registry, from `defineRegistry`. Absent, the renderer knows no
   *  components and renders plain markdown.
   */
  components?: ComponentRegistry;
  /**
   * The default `media:` resolver, used when an input carries no `resolveMedia` of its own. An
   *  input's own resolver always wins.
   */
  resolveMedia?: MediaResolve;
  /**
   * Extend the sanitize allowlist. Receives cairn's default schema (defaultSchema plus the
   *  directive markers and the common benign tags) and returns the schema to use. Add to the
   *  allowlist for the benign HTML a site's content needs; start from the argument so the
   *  dangerous strip is preserved.
   * @remarks
   * Synchronous by design: it is called inline while the pipeline composes its sanitize floor, with
   * no seam to await external data. The callback gets a fresh copy of the default schema per call, so mutating it never reaches
   * another renderer. After it returns, the engine removes `script` from `tagNames` and unions the
   * default `strip` list into the callback's own `strip`, so no `<script>` element and no body text of
   * a default-`strip` element survives. That is the whole floor: attributes and URL protocols stay the
   * callback's responsibility, and an unsafe one it admits is kept.
   * @throws When the callback returns a schema with no `tagNames` array, since an absent allowlist
   * admits every element. Set `unsafeDisableSanitize` to turn the floor off instead.
   */
  sanitizeSchema?: (defaults: Schema) => Schema;
  /**
   * Developer-only escape hatch: disable the sanitize floor entirely. This reintroduces the XSS
   *  vector the floor closes, so it is only for a site whose content is fully developer-controlled.
   *  It is a code-level adapter decision, never an editor-facing setting. It removes the sanitize
   *  floor and the sink guard together. Defaults to `false`. To allow more HTML while keeping the
   *  floor, extend the allowlist with `sanitizeSchema` instead.
   */
  unsafeDisableSanitize?: boolean;
  /**
   * The `rel` value forced on every `target="_blank"` anchor, applied last so it also covers
   *  component-built anchors. Defaults to `'noopener noreferrer'`. Set a different string to change
   *  it, or `false` to disable the injection (a site that owns its anchor hardening).
   */
  anchorRel?: string | false;
  /**
   * Wrap every rendered table in a scrollable, labeled region (WCAG 1.3.1): the table stays a real
   *  `<table>` (so it keeps its role in the accessibility tree) inside a `role="region"`,
   *  keyboard-reachable wrapper div, so a narrow viewport scrolls the wrapper instead of squeezing
   *  the table's columns. Defaults to `true`. Set to `false` for a site that supplies its table
   *  wrapping, whether its `rehypePlugins` entry or a different a11y strategy.
   */
  tableScroll?: boolean;
  /**
   * Additional remark plugins, run after cairn's remark steps (directive stamping, `cairn:`
   *  link resolution, figures, `media:` resolution) and before the remark-to-rehype conversion. A
   *  site's markdown-stage transform composes here, seeing the engine's already-resolved tree.
   */
  remarkPlugins?: PluggableList;
  /**
   * Additional rehype plugins, run after cairn's rehype steps (dispatch, the sanitize floor,
   *  heading slugs, highlighting, anchor hardening, the sink guard, the default table-scroll wrap)
   *  and before stringification. A site's post-render transform composes here over the hast
   *  tree instead of re-parsing the rendered HTML string.
   */
  rehypePlugins?: PluggableList;
}

/**
 * Compose a site's render pipeline from its config: directive syntax to stamped markers to
 *  registry-built hast. Returns a `Renderer` whose `render` and `renderDocument` take one
 *  `RenderInput`, so `render: renderer.render` forwards every resolver.
 * @public
 */
export function createRenderer(config: RendererConfig = {}): Renderer {
  const options = config;
  const registry = config.components ?? defineRegistry({ components: [] });
  const remarkPlugins: PluggableList = [
    remarkDirective,
    // Must run before remarkDirectiveStamp, which unconditionally restores every leaf/text
    // directive to literal prose: this is the only step that ever sees ::include as a real node.
    remarkResolveIncludes,
    [remarkDirectiveStamp, registry],
    remarkResolveCairnLinks,
    remarkFigure,
    remarkResolveMedia,
    ...(options.remarkPlugins ?? []),
  ];
  // The sanitize floor runs after rehype-raw (so author raw HTML is parsed, then cleaned) and
  // before the dispatch (so the site's trusted build() output and its inline SVG icons are never
  // sanitized). The anchor-rel hardening runs last so it also covers component-built anchors.
  const floor: PluggableList = options.unsafeDisableSanitize
    ? []
    : [[rehypeSanitize, buildSanitizeSchema(registry, options.sanitizeSchema)]];
  const rel = options.anchorRel ?? 'noopener noreferrer';
  const rehypePlugins: PluggableList = [
    rehypeRaw,
    ...floor,
    [rehypeDispatch, registry],
    rehypeSlug,
    // Name each GFM task-list checkbox from its item text. It runs after the sanitize floor (which
    // does not allow aria-label) so the added attribute survives, and is content-not-sink, so it is
    // not gated by unsafeDisableSanitize.
    rehypeTaskListA11y,
    // Build-time syntax highlighting. It emits class-only output (the cairn-tok-* ramp, no inline
    // style), so it is class-driven like the rest of the pipeline and needs no special placement
    // relative to the sanitize floor or the sink guard: the token classes survive the floor because
    // `className` is already allowed on `*`. It runs unconditionally (a code fence is content, not a
    // sink) and ships no client highlighter (Shiki is build-only behind a dynamic import).
    rehypeCairnHighlight,
  ];
  if (rel !== false) rehypePlugins.push([rehypeAnchorRel, rel]);
  // The sink guard runs last, over the fully-built tree, so it neutralizes a sink a component
  // build() emitted after the floor. Gated by the same switch as the floor.
  if (!options.unsafeDisableSanitize) rehypePlugins.push(rehypeSinkGuard);
  // The default table-scroll wrap runs over the fully sanitized, dispatched tree, so it wraps a
  // component's table output the same as an author's markdown table. Opts out with
  // `tableScroll: false`.
  if (options.tableScroll !== false) rehypePlugins.push(rehypeTableScroll);
  // A site's rehype plugins run last of all, over the already-wrapped tree.
  rehypePlugins.push(...(options.rehypePlugins ?? []));
  // Build the processor with an optional trailing rehype step, so render and renderDocument
  // share every stage up to that point without either mutating the `rehypePlugins` array.
  const buildProcessor = (extraRehype: PluggableList) =>
    unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkPlugins)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypePlugins)
      .use(extraRehype)
      .use(rehypeStringify);
  const processor = buildProcessor([]);
  // The heading-collector processor is built lazily, on renderDocument's first call, not here: every
  // current consumer only ever calls render, so building it eagerly would double the
  // attacher setup cost on every Worker cold start for a site that never calls renderDocument.
  let documentProcessor: ReturnType<typeof buildProcessor> | undefined;
  const makeFile = (input: RenderInput) =>
    new VFile({
      value: input.body,
      data: {
        [CAIRN_RESOLVE]: input.resolveLink,
        [MEDIA_RESOLVE]: input.resolveMedia ?? config.resolveMedia,
        [FRAGMENT_RESOLVE]: input.resolveFragment,
      },
    });
  return {
    render: async (input) => String(await processor.process(makeFile(input))),
    renderDocument: async (input) => {
      // The heading-collector plugin runs after rehypePlugins (which already carries the site's
      // options.rehypePlugins last), so it sees rehypeSlug's ids and any site rewrite of them.
      documentProcessor ??= buildProcessor([rehypeCollectHeadings]);
      const file = await documentProcessor.process(makeFile(input));
      return { html: String(file), headings: (file.data[DOC_HEADINGS] as DocHeading[] | undefined) ?? [] };
    },
  };
}
