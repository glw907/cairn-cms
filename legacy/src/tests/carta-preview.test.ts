import { describe, it, expect, vi } from 'vitest';
import type { Processor } from 'unified';
import { previewTransformers } from '../lib/carta';

// Risk #3: the editor preview must run the same plugin set, in the same phase order, as the
// live render.ts. We unit-test the pure wiring here; the actual round-trip render is verified
// live in the browser (Carta's index pulls in .svelte, which the node test env can't load).
// Carta's fixed processor order is remarkParse → gfm → [remark] → remark-rehype → [rehype].
const remarkA = () => {};
const remarkB = () => {};
const rehypeA = () => {};
const rehypeB = () => {};

describe('previewTransformers', () => {
  const result = previewTransformers({
    remarkPlugins: [remarkA, remarkB],
    rehypePlugins: [rehypeA, rehypeB],
  });

  it('emits remark transformers before rehype, preserving plugin order', () => {
    expect(result.map((t) => t.type)).toEqual(['remark', 'remark', 'rehype', 'rehype']);
  });

  it('marks every transformer sync so it runs in Carta SSR', () => {
    expect(result.every((t) => t.execution === 'sync')).toBe(true);
  });

  it('registers each plugin on the processor it is handed', () => {
    const use = vi.fn();
    const processor = { use } as unknown as Processor;
    for (const t of result) t.transform({ processor });
    expect(use).toHaveBeenCalledTimes(4);
    expect(use).toHaveBeenNthCalledWith(1, [remarkA]);
    expect(use).toHaveBeenNthCalledWith(3, [rehypeA]);
  });
});
