import { describe, it, expect } from 'vitest';
import { h } from 'hastscript';
import { visit, SKIP } from 'unist-util-visit';
import type { Root as HastRoot, Element } from 'hast';
import { createRenderer } from '../../lib/render/pipeline.js';
import { defineRegistry } from '../../lib/render/registry.js';

describe('createRenderer', () => {
  it('empty-registry renderer renders plain markdown', async () => {
    const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }));
    expect(await renderMarkdown('# Hi\n\nText')).toContain('<h1');
  });

  it('renders plain markdown with no registry argument', async () => {
    const { renderMarkdown } = createRenderer();
    const html = await renderMarkdown('# Hello\n\nA paragraph.');
    expect(html).toContain('<h1');
    expect(html).toContain('Hello');
    expect(html).toContain('<p>A paragraph.</p>');
  });

  it('exposes the remark/rehype plugin arrays for editor-preview wiring', () => {
    const r = createRenderer(defineRegistry({ components: [] }));
    expect(Array.isArray(r.remarkPlugins)).toBe(true);
    expect(Array.isArray(r.rehypePlugins)).toBe(true);
  });

  it('renders a registered component and stamps the data-rise ordinal', async () => {
    const reg = defineRegistry({
      components: [
        {
          name: 'box',
          label: '',
          description: '',
          insertTemplate: '',
          build: (ctx) => {
            const node = ctx.node;
            node.tagName = 'section';
            node.properties = { className: ['box'] };
            return node;
          },
        },
      ],
    });
    const { renderMarkdown } = createRenderer(reg);
    const html = await renderMarkdown(':::box\ncontent\n:::');
    expect(html).toContain('class="box"');
    expect(html).toContain('data-rise="0"');
  });

  it('labels GFM task-list checkboxes from their item text so axe finds no unlabeled control', async () => {
    // remark-gfm emits a real <input type="checkbox" disabled> with no accessible name, which axe's
    // `label` rule flags as a critical violation even though the box is read-only. The pipeline gives
    // each task-list checkbox an aria-label derived from its item text (the visible label), so the
    // control carries its name programmatically while the engine still ships the real disabled input.
    const { renderMarkdown } = createRenderer();
    const html = await renderMarkdown('- [x] Write the draft\n- [ ] Publish it');
    expect(html).toContain('class="task-list-item"');
    expect(html).toContain('type="checkbox"');
    // Each checkbox names itself from the adjacent item text, in source order.
    expect(html).toMatch(/<input[^>]*type="checkbox"[^>]*aria-label="Write the draft"/);
    expect(html).toMatch(/<input[^>]*type="checkbox"[^>]*aria-label="Publish it"/);
  });

  it('emits an island boundary for an empty-body attribute-only hydrate directive', async () => {
    const registry = defineRegistry({
      components: [
        {
          name: 'converter',
          label: '',
          description: '',
          hydrate: true,
          attributes: { from: { type: 'text', label: 'From' } as never, rate: { type: 'number', label: 'Rate' } as never },
          build: () => h('p', { className: ['fallback'] }, ['1 mi = 1.609 km']),
        },
      ],
    });
    const { renderMarkdown } = createRenderer(registry);
    const html = await renderMarkdown(':::converter{from="mi" rate="1.609"}\n:::');
    expect(html).toContain('data-cairn-island="converter"');
    expect(html).toContain('class="fallback"');
    // the number field is a JSON number in the escaped prop payload (rehypeStringify escapes the
    // JSON double-quotes as the &#x22; hex entity, not &quot;); the absence of a quote before 1.609
    // is what proves number coercion rather than a quoted string.
    expect(html).toMatch(/data-cairn-props="[^"]*&#x22;rate&#x22;:1\.609/);
  });

  describe('the rehype/remark plugin seam', () => {
    /** A site's own rehype step, wrapping every table so the seam has a real use case to prove. */
    function rehypeWrapTables() {
      return (tree: HastRoot) => {
        visit(tree, 'element', (node: Element, index, parent) => {
          if (node.tagName !== 'table' || !parent || index === undefined) return;
          const wrapper: Element = {
            type: 'element',
            tagName: 'div',
            properties: { className: ['table-scroll'] },
            children: [node],
          };
          parent.children[index] = wrapper;
          return SKIP;
        });
      };
    }

    it('runs a site rehypePlugins entry over the rendered tree', async () => {
      const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }), {
        rehypePlugins: [rehypeWrapTables],
      });
      const html = await renderMarkdown('| a | b |\n| - | - |\n| 1 | 2 |');
      expect(html).toContain('class="table-scroll"');
      expect(html).toContain('<table>');
    });

    it('appends site rehypePlugins after the engine sanitize floor, so a raw script never reaches them', async () => {
      let sawScript = false;
      const probe = () => (tree: HastRoot) => {
        visit(tree, 'element', (node: Element) => {
          if (node.tagName === 'script') sawScript = true;
        });
      };
      const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }), {
        rehypePlugins: [probe],
      });
      await renderMarkdown('<script>alert(1)</script>\n\nText');
      expect(sawScript).toBe(false);
    });

    it('appends site remarkPlugins after cairn: link resolution', async () => {
      let sawResolvedUrl: string | undefined;
      const probe = () => (tree: unknown) => {
        visit(tree as Parameters<typeof visit>[0], 'link', (node: { url: string }) => {
          sawResolvedUrl = node.url;
        });
      };
      const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }), {
        remarkPlugins: [probe],
      });
      await renderMarkdown('[a post](cairn:posts/hello)', {
        resolve: () => '/posts/hello',
      });
      expect(sawResolvedUrl).toBe('/posts/hello');
    });

    it('exposes the site plugins on the returned remark/rehype arrays', () => {
      const customRemark = () => () => {};
      const customRehype = () => () => {};
      const r = createRenderer(defineRegistry({ components: [] }), {
        remarkPlugins: [customRemark],
        rehypePlugins: [customRehype],
      });
      expect(r.remarkPlugins[r.remarkPlugins.length - 1]).toBe(customRemark);
      expect(r.rehypePlugins[r.rehypePlugins.length - 1]).toBe(customRehype);
    });
  });

  describe('table-scroll default', () => {
    it('wraps a rendered table in a scrollable, labeled region by default', async () => {
      const { renderMarkdown } = createRenderer();
      const html = await renderMarkdown('| Name | Age |\n| - | - |\n| Ada | 36 |');
      expect(html).toContain('class="table-scroll"');
      expect(html).toContain('role="region"');
      expect(html).toContain('tabindex="0"');
      expect(html).toContain('aria-label="Table: Name, Age"');
      // the table itself is untouched: still a real <table>, just wrapped.
      expect(html).toMatch(/<div class="table-scroll"[^>]*><table>/);
    });

    it('opts out of the default table wrap with tableScroll: false', async () => {
      const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }), {
        tableScroll: false,
      });
      const html = await renderMarkdown('| Name | Age |\n| - | - |\n| Ada | 36 |');
      expect(html).not.toContain('table-scroll');
      expect(html).toContain('<table>');
    });

    it('wraps before a site rehypePlugins entry runs, so a site sees the wrapped tree', async () => {
      let sawWrapper = false;
      const probe = () => (tree: HastRoot) => {
        visit(tree, 'element', (node: Element) => {
          const className = node.properties?.className;
          if (node.tagName === 'div' && Array.isArray(className) && className.includes('table-scroll')) {
            sawWrapper = true;
          }
        });
      };
      const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }), {
        rehypePlugins: [probe],
      });
      await renderMarkdown('| a | b |\n| - | - |\n| 1 | 2 |');
      expect(sawWrapper).toBe(true);
    });
  });
});
