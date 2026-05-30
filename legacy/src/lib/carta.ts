// cairn-core: pure Carta options/transformer wiring for render-only preview.
//
// Plugins are passed in rather than imported; that seam is what the Pass D adapter formalises.
// No `carta-md` import: its index re-exports Svelte components that the node test env
// can't load. The Svelte component calls `new Carta(previewCartaOptions(...))` directly.
import type { Pluggable, Processor } from 'unified';

export interface PreviewPlugins {
  /** remark plugins, injected after gfm and before remark-rehype. */
  remarkPlugins: Pluggable[];
  /** rehype plugins, injected after remark-rehype. */
  rehypePlugins: Pluggable[];
}

interface PreviewTransformer {
  execution: 'sync';
  type: 'remark' | 'rehype';
  transform: (ctx: { processor: Processor }) => void;
}

function phase(plugins: Pluggable[], type: PreviewTransformer['type']): PreviewTransformer[] {
  return plugins.map((plugin) => ({
    execution: 'sync',
    type,
    transform: ({ processor }) => {
      processor.use([plugin]);
    },
  }));
}

/**
 * Map the site's plugin set to Carta sync transformers, remark phase before rehype.
 * Carta's processor is remarkParse → gfm → [remark] → remark-rehype → [rehype] → stringify,
 * so this ordering reproduces render.ts exactly. Pure (no Carta) so it is unit-testable.
 */
export function previewTransformers({ remarkPlugins, rehypePlugins }: PreviewPlugins): PreviewTransformer[] {
  return [...phase(remarkPlugins, 'remark'), ...phase(rehypePlugins, 'rehype')];
}

/** Minimal Options subset we populate (avoids importing carta-md, which re-exports Svelte components). */
interface PreviewCartaOptions {
  sanitizer: false;
  rehypeOptions: { allowDangerousHtml: boolean };
  extensions: Array<{ transformers: PreviewTransformer[] }>;
}

/**
 * Carta options for a render-only preview: site plugins wired in, raw HTML allowed, no
 * sanitizer. Authors are trusted and the directive pipeline emits intentional raw HTML
 * (render.ts uses allowDangerousHtml + rehype-raw); sanitizing here would strip EC
 * primitives. The Svelte component passes this to `new Carta(...)`.
 */
export function previewCartaOptions(plugins: PreviewPlugins): PreviewCartaOptions {
  return {
    sanitizer: false,
    rehypeOptions: { allowDangerousHtml: true },
    extensions: [{ transformers: previewTransformers(plugins) }],
  };
}
