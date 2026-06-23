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
import { buildSanitizeSchema, rehypeAnchorRel, rehypeSinkGuard } from './sanitize-schema.js';
import { remarkDirectiveStamp } from './remark-directives.js';
import { remarkFigure } from './remark-figure.js';
import { remarkResolveCairnLinks, CAIRN_RESOLVE } from './resolve-links.js';
import { remarkResolveMedia, MEDIA_RESOLVE, type MediaResolve } from './resolve-media.js';
import { rehypeDispatch } from './rehype-dispatch.js';
import { defineRegistry, type ComponentRegistry } from './registry.js';
import type { LinkResolve } from '../content/links.js';

export interface RendererOptions {
  /**
   * Stamp a `data-rise` ordinal (0, 1, 2, …) on each top-level component so a site's
   *  CSS can drive an entrance-cascade delay off it. Omit for no stagger. The ordinal
   *  is inert, so a consumer's sanitize floor can keep `data-rise` and drop `style`.
   */
  stagger?: boolean;
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
}

/**
 * Compose a site's render pipeline from its component registry: directive syntax to
 *  stamped markers to registry-built hast. Returns `renderMarkdown` plus the remark/
 *  rehype plugin arrays (so the admin editor preview can reuse the exact same set).
 */
export function createRenderer(
  registry: ComponentRegistry = defineRegistry({ components: [] }),
  options: RendererOptions = {},
) {
  const remarkPlugins: PluggableList = [
    remarkDirective,
    [remarkDirectiveStamp, registry],
    remarkResolveCairnLinks,
    remarkFigure,
    remarkResolveMedia,
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
    [rehypeDispatch, registry, options.stagger],
    rehypeSlug,
  ];
  if (rel !== false) rehypePlugins.push([rehypeAnchorRel, rel]);
  // The sink guard runs last, over the fully-built tree, so it neutralizes a sink a component
  // build() emitted after the floor. Gated by the same switch as the floor.
  if (!options.unsafeDisableSanitize) rehypePlugins.push(rehypeSinkGuard);
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkPlugins)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypePlugins)
    .use(rehypeStringify);
  return {
    remarkPlugins,
    rehypePlugins,
    renderMarkdown: async (
      content: string,
      opts: { resolve?: LinkResolve; resolveMedia?: MediaResolve } = {},
    ): Promise<string> => {
      const file = new VFile({
        value: content,
        data: { [CAIRN_RESOLVE]: opts.resolve, [MEDIA_RESOLVE]: opts.resolveMedia },
      });
      return String(await processor.process(file));
    },
  };
}
