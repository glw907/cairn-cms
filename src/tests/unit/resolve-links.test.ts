import { describe, it, expect } from 'vitest';
import { createRenderer } from '../../lib/render/pipeline.js';
import { defineRegistry } from '../../lib/render/registry.js';
import type { LinkResolve } from '../../lib/content/links.js';

const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }));

describe('cairn link resolution', () => {
  it('rewrites a cairn link to the resolved permalink', async () => {
    const resolve: LinkResolve = (ref) => (ref.id === 'about' ? '/about' : undefined);
    const html = await renderMarkdown('See [about](cairn:pages/about).', { resolve });
    expect(html).toContain('href="/about"');
    expect(html).not.toContain('cairn:');
  });
  it('marks a missing target with the broken-link class and keeps the text', async () => {
    const resolve: LinkResolve = () => undefined;
    const html = await renderMarkdown('See [gone](cairn:pages/gone).', { resolve });
    expect(html).toContain('cairn-broken-link');
    expect(html).toContain('title="Broken internal link"');
    expect(html).toContain('gone');
  });
  it('leaves a non-cairn link untouched', async () => {
    const resolve: LinkResolve = () => '/x';
    const html = await renderMarkdown('[ext](https://example.com)', { resolve });
    expect(html).toContain('href="https://example.com"');
  });
  it('propagates a throwing resolver, so the build fails on a dangling token', async () => {
    const resolve: LinkResolve = () => {
      throw new Error('cairn link target not found: cairn:pages/gone');
    };
    await expect(renderMarkdown('[gone](cairn:pages/gone)', { resolve })).rejects.toThrow(/not found/);
  });
  it('leaves a cairn link inert when no resolver is provided', async () => {
    const html = await renderMarkdown('[x](cairn:pages/about)');
    expect(html).toContain('cairn:pages/about');
  });
});
