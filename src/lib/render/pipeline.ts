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

// The per-call resolver hooks renderMarkdown and renderDocument both accept, threaded onto the
// VFile's data so the cairn: link, media:, and ::include steps read them at process time.
type ResolveOptions = {
  resolve?: LinkResolve;
  resolveMedia?: MediaResolve;
  resolveFragment?: FragmentResolve;
};

export interface RendererOptions {
  /**
   * Extend the sanitize allowlist. Receives cairn's default schema (defaultSchema plus the
   *  directive markers and the common benign tags) and returns the schema to use. Add to the
   *  allowlist for the benign HTML a site's content needs; start from the argument so the
   *  dangerous strip is preserved.
   */
  sanitizeSchema?: (defaults: Schema) => Schema;
  /**
   * Developer-only escape hatch: disable the sanitize floor entirely. This reintroduces the XSS
   *  vector the floor closes, so it is only for a site whose content is fully developer-controlled.
   *  It is a code-level adapter decision, never an editor-facing setting.
   */
  unsafeDisableSanitize?: boolean;
  /**
   * The `rel` value forced on every `target="_blank"` anchor, applied last so it also covers
   *  component-built anchors. Defaults to `'noopener noreferrer'`. Set a different string to change
   *  it, or `false` to disable the injection (a site that owns its own anchor hardening).
   */
  anchorRel?: string | false;
  /**
   * Wrap every rendered table in a scrollable, labeled region (WCAG 1.3.1): the table stays a real
   *  `<table>` (so it keeps its role in the accessibility tree) inside a `role="region"`,
   *  keyboard-reachable wrapper div, so a narrow viewport scrolls the wrapper instead of squeezing
   *  the table's columns. Defaults to `true`. Set to `false` for a site that supplies its own table
   *  wrapping, whether its own `rehypePlugins` entry or a different a11y strategy.
   */
  tableScroll?: boolean;
  /**
   * Additional remark plugins, run after cairn's own remark steps (directive stamping, `cairn:`
   *  link resolution, figures, `media:` resolution) and before the remark-to-rehype conversion. A
   *  site's own markdown-stage transform composes here, seeing the engine's already-resolved tree.
   */
  remarkPlugins?: PluggableList;
  /**
   * Additional rehype plugins, run after cairn's own rehype steps (dispatch, the sanitize floor,
   *  heading slugs, highlighting, anchor hardening, the sink guard, the default table-scroll wrap)
   *  and before stringification. A site's own post-render transform composes here over the hast
   *  tree instead of re-parsing the rendered HTML string.
   */
  rehypePlugins?: PluggableList;
}

/**
 * Compose a site's render pipeline from its component registry: directive syntax to
 *  stamped markers to registry-built hast. Returns `renderMarkdown` plus the fully composed
 *  remark/rehype plugin arrays, including any `RendererOptions.remarkPlugins`/`rehypePlugins`
 *  a site supplied, so the admin editor preview can reuse the exact same set. `renderDocument`
 *  takes the same options and additionally returns the document's `headings`, collected from the
 *  final rehype tree (after `rehypeSlug` and any site `rehypePlugins` have run), in document
 *  order.
 */
export function createRenderer(
  registry: ComponentRegistry = defineRegistry({ components: [] }),
  options: RendererOptions = {},
) {
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
  // component's own table output the same as an author's markdown table. Opts out with
  // `tableScroll: false`.
  if (options.tableScroll !== false) rehypePlugins.push(rehypeTableScroll);
  // A site's own rehype plugins run last of all, over the already-wrapped tree.
  rehypePlugins.push(...(options.rehypePlugins ?? []));
  // Build the processor with an optional trailing rehype step, so renderMarkdown and
  // renderDocument share every stage up to that point without either mutating the `rehypePlugins`
  // array this function returns (the editor preview reuses that exact array).
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
  // current consumer only ever calls renderMarkdown, so building it eagerly would double the
  // attacher setup cost on every Worker cold start for a site that never calls renderDocument.
  let documentProcessor: ReturnType<typeof buildProcessor> | undefined;
  const makeFile = (content: string, opts: ResolveOptions) =>
    new VFile({
      value: content,
      data: {
        [CAIRN_RESOLVE]: opts.resolve,
        [MEDIA_RESOLVE]: opts.resolveMedia,
        [FRAGMENT_RESOLVE]: opts.resolveFragment,
      },
    });
  return {
    remarkPlugins,
    rehypePlugins,
    renderMarkdown: async (content: string, opts: ResolveOptions = {}): Promise<string> => {
      return String(await processor.process(makeFile(content, opts)));
    },
    renderDocument: async (
      content: string,
      opts: ResolveOptions = {},
    ): Promise<{ html: string; headings: DocHeading[] }> => {
      // The heading-collector plugin runs after rehypePlugins (which already carries the site's own
      // options.rehypePlugins last), so it sees rehypeSlug's ids and any site rewrite of them.
      documentProcessor ??= buildProcessor([rehypeCollectHeadings]);
      const file = await documentProcessor.process(makeFile(content, opts));
      return { html: String(file), headings: (file.data[DOC_HEADINGS] as DocHeading[] | undefined) ?? [] };
    },
  };
}
