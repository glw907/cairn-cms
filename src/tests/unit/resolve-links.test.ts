import { describe, it, expect } from 'vitest';
import { createRenderer } from '../../lib/render/pipeline.js';
import { defineRegistry } from '../../lib/render/registry.js';
import type { LinkResolve } from '../../lib/content/links.js';

const { render } = createRenderer();

describe('cairn link resolution', () => {
  it('rewrites a cairn link to the resolved permalink', async () => {
    const resolve: LinkResolve = (ref) => (ref.id === 'about' ? '/about' : undefined);
    const html = await render({ body: 'See [about](cairn:pages/about).', resolveLink: resolve });
    expect(html).toContain('href="/about"');
    expect(html).not.toContain('cairn:');
  });
  it('marks a missing target with the broken-link class and keeps the text', async () => {
    const resolve: LinkResolve = () => undefined;
    const html = await render({ body: 'See [gone](cairn:pages/gone).', resolveLink: resolve });
    expect(html).toContain('cairn-broken-link');
    expect(html).toContain('title="Broken internal link"');
    expect(html).toContain('gone');
  });
  it('leaves a non-cairn link untouched', async () => {
    const resolve: LinkResolve = () => '/x';
    const html = await render({ body: '[ext](https://example.com)', resolveLink: resolve });
    expect(html).toContain('href="https://example.com"');
  });
  it('propagates a throwing resolver, so the build fails on a dangling token', async () => {
    const resolve: LinkResolve = () => {
      throw new Error('cairn link target not found: cairn:pages/gone');
    };
    await expect(render({ body: '[gone](cairn:pages/gone)', resolveLink: resolve })).rejects.toThrow(/not found/);
  });
  it('leaves a cairn link inert when no resolver is provided', async () => {
    const html = await render({ body: '[x](cairn:pages/about)' });
    expect(html).toContain('cairn:pages/about');
  });
});
