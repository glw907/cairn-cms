import { unified, type PluggableList } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import { remarkDirectiveStamp } from './remark-directives.js';
import { rehypeDispatch } from './rehype-dispatch.js';
import type { ComponentRegistry } from './registry.js';

export interface RendererOptions {
  /** A site's per-index motion formula for the top-level rise stagger
   *  (e.g. ecnordic's `(i) => '--rise:' + …`). Omit for no stagger. */
  rise?: (idx: number) => string;
}

/** Compose a site's render pipeline from its component registry: directive syntax to
 *  stamped markers to registry-built hast. Returns `renderMarkdown` plus the remark/
 *  rehype plugin arrays (so the Carta editor preview can reuse the exact same set). */
export function createRenderer(registry: ComponentRegistry, options: RendererOptions = {}) {
  const remarkPlugins: PluggableList = [remarkDirective, [remarkDirectiveStamp, registry]];
  const rehypePlugins: PluggableList = [rehypeRaw, [rehypeDispatch, registry, options.rise], rehypeSlug];
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
    renderMarkdown: async (content: string): Promise<string> => String(await processor.process(content)),
  };
}
