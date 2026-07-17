import { describe, it, expect, vi } from 'vitest';
import { createRenderer } from '../../lib/render/pipeline.js';
import { defineRegistry } from '../../lib/render/registry.js';
import { log } from '../../lib/log/index.js';
import type { FragmentResolve, PreviewFragmentResolve } from '../../lib/render/resolve-include.js';

describe('include fragment resolution', () => {
  it('(a) splices a resolved fragment body in place of the include directive', async () => {
    const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }));
    const resolveFragment: FragmentResolve = (id) =>
      id === 'address' ? 'Our address is 12 Harbor Way.' : undefined;
    const html = await renderMarkdown('Before.\n\n::include{fragment="address"}\n\nAfter.', {
      resolveFragment,
    });
    expect(html).toContain('Our address is 12 Harbor Way.');
    expect(html).toContain('Before.');
    expect(html).toContain('After.');
  });

  it('(b) proves splice-before-stamp: a fragment body with a registered directive, a cairn: link, and a media: token all resolve downstream', async () => {
    const registry = defineRegistry({
      components: [
        {
          name: 'box',
          label: '',
          description: '',
          build: (ctx) => {
            const node = ctx.node;
            node.tagName = 'section';
            node.properties = { className: ['box'] };
            return node;
          },
        },
      ],
    });
    const { renderMarkdown } = createRenderer(registry);
    const resolveFragment: FragmentResolve = (id) =>
      id === 'facts'
        ? ':::box\nSee [about](cairn:pages/about) and ![alt](media:0123456789abcdef).\n:::'
        : undefined;
    const html = await renderMarkdown('::include{fragment="facts"}', {
      resolveFragment,
      resolve: (ref) => (ref.id === 'about' ? '/about' : undefined),
      resolveMedia: () => '/media/photo.jpg',
    });
    expect(html).toContain('class="box"');
    expect(html).toContain('href="/about"');
    expect(html).toContain('src="/media/photo.jpg"');
  });

  it('(c) replaces a missing fragment with a calm notice node and emits include.missing once', async () => {
    const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }));
    const warn = vi.spyOn(log, 'warn').mockImplementation(() => {});
    const resolveFragment: FragmentResolve = () => undefined;
    const html = await renderMarkdown('::include{fragment="gone"}', { resolveFragment });
    expect(html).toContain('cairn-include-missing');
    expect(html).toContain('Missing fragment: gone');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith('include.missing', { fragment: 'gone' });
    warn.mockRestore();
  });

  it('(d) propagates a throwing resolver, the build backstop for a dangling include', async () => {
    const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }));
    const resolveFragment: FragmentResolve = () => {
      throw new Error('cairn fragment not found: gone');
    };
    await expect(
      renderMarkdown('::include{fragment="gone"}', { resolveFragment }),
    ).rejects.toThrow(/not found/);
  });

  it('(e) leaves an include directive inert (falls through to literal-prose restore) when no resolver is supplied', async () => {
    const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }));
    const html = await renderMarkdown('::include{fragment="x"}');
    expect(html).toContain('include');
    expect(html).not.toContain('cairn-include-missing');
  });

  it('(f) resolves one pass only: a nested include inside a spliced fragment body renders as literal prose, never resolved', async () => {
    const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }));
    const warn = vi.spyOn(log, 'warn').mockImplementation(() => {});
    const resolveFragment: FragmentResolve = (id) => {
      if (id === 'outer') return 'Before inner.\n\n::include{fragment="inner"}\n\nAfter inner.';
      if (id === 'inner') return 'INNER SHOULD NOT APPEAR';
      return undefined;
    };
    const html = await renderMarkdown('::include{fragment="outer"}', { resolveFragment });
    expect(html).not.toContain('INNER SHOULD NOT APPEAR');
    expect(html).not.toContain('cairn-include-missing');
    expect(html).toContain('Before inner.');
    expect(html).toContain('After inner.');
    expect(html).toContain('include');
    // The nested include is never even seen as a miss: it falls through to the stamp restore, not
    // this plugin's miss path, so include.missing fires only for the outer, unrelated cases in
    // other tests, never here.
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('(g) treats a missing or empty fragment attribute as a miss, not a crash, with its own no-id copy', async () => {
    const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }));
    const warn = vi.spyOn(log, 'warn').mockImplementation(() => {});
    const resolveFragment: FragmentResolve = () => 'should not be reached';
    const noAttr = await renderMarkdown('::include\n', { resolveFragment });
    expect(noAttr).toContain('cairn-include-missing');
    // The no-id case gets its own copy rather than "Missing fragment: " trailing off into nothing.
    expect(noAttr).toContain("This include doesn't name a fragment.");
    expect(noAttr).not.toContain('Missing fragment:');
    const emptyAttr = await renderMarkdown('::include{fragment=""}\n', { resolveFragment });
    expect(emptyAttr).toContain('cairn-include-missing');
    expect(emptyAttr).toContain("This include doesn't name a fragment.");
    expect(warn).toHaveBeenCalledWith('include.missing', { fragment: '' });
    warn.mockRestore();
  });

  it('(h) keeps a non-include leaf directive restore-to-prose behavior byte-identical whether or not a fragment resolver is supplied', async () => {
    const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }));
    const withResolver = await renderMarkdown('::something{a="b"} inline', {
      resolveFragment: () => undefined,
    });
    const without = await renderMarkdown('::something{a="b"} inline');
    expect(withResolver).toBe(without);
  });

  it('sanitizes fragment-sourced HTML identically to native content', async () => {
    const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }));
    const resolveFragment: FragmentResolve = () => 'ok\n\n<script>alert(1)<\/script>';
    const html = await renderMarkdown('::include{fragment="x"}', { resolveFragment });
    expect(html).not.toContain('alert');
    expect(html).not.toContain('<script>');
  });

  describe('the preview-only boundary cue (ratified 4B)', () => {
    it('wraps a splice in the boundary cue only when the resolver carries previewTitle', async () => {
      const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }));
      const resolveFragment: PreviewFragmentResolve = (id) =>
        id === 'address' ? 'Our address is 12 Harbor Way.' : undefined;
      resolveFragment.previewTitle = (id) => (id === 'address' ? 'Contact us' : undefined);
      const html = await renderMarkdown('::include{fragment="address"}', { resolveFragment });
      expect(html).toContain('class="cairn-fragment-boundary"');
      expect(html).toContain('class="cairn-fragment-boundary-eyebrow"');
      expect(html).toContain('From “Contact us”');
      expect(html).toContain('Our address is 12 Harbor Way.');
    });

    it('falls back to the fragment id when previewTitle resolves nothing for it', async () => {
      const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }));
      const resolveFragment: PreviewFragmentResolve = () => 'Body text.';
      resolveFragment.previewTitle = () => undefined;
      const html = await renderMarkdown('::include{fragment="address"}', { resolveFragment });
      expect(html).toContain('From “address”');
    });

    it('never wraps a splice when the resolver carries no previewTitle (the build path)', async () => {
      const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }));
      const resolveFragment: FragmentResolve = () => 'Our address is 12 Harbor Way.';
      const html = await renderMarkdown('::include{fragment="address"}', { resolveFragment });
      expect(html).not.toContain('cairn-fragment-boundary');
      expect(html).not.toContain('From “');
    });
  });
});
