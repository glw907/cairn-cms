import { describe, it, expect } from 'vitest';
import { h } from 'hastscript';
import { visit, SKIP } from 'unist-util-visit';
import type { Root as HastRoot, Element } from 'hast';
import { createRenderer } from '../../lib/render/pipeline.js';
import { defineRegistry } from '../../lib/render/registry.js';

describe('createRenderer', () => {
  it('empty-registry renderer renders plain markdown', async () => {
    const { render } = createRenderer();
    expect(await render({ body: '# Hi\n\nText' })).toContain('<h1');
  });

  it('renders plain markdown with no registry argument', async () => {
    const { render } = createRenderer();
    const html = await render({ body: '# Hello\n\nA paragraph.' });
    expect(html).toContain('<h1');
    expect(html).toContain('Hello');
    expect(html).toContain('<p>A paragraph.</p>');
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
    const { render } = createRenderer({ components: reg });
    const html = await render({ body: ':::box\ncontent\n:::' });
    expect(html).toContain('class="box"');
    expect(html).toContain('data-rise="0"');
  });

  it('labels GFM task-list checkboxes from their item text so axe finds no unlabeled control', async () => {
    // remark-gfm emits a real <input type="checkbox" disabled> with no accessible name, which axe's
    // `label` rule flags as a critical violation even though the box is read-only. The pipeline gives
    // each task-list checkbox an aria-label derived from its item text (the visible label), so the
    // control carries its name programmatically while the engine still ships the real disabled input.
    const { render } = createRenderer();
    const html = await render({ body: '- [x] Write the draft\n- [ ] Publish it' });
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
          attributes: { from: { type: 'text', label: 'From' }, rate: { type: 'number', label: 'Rate' } },
          build: () => h('p', { className: ['fallback'] }, ['1 mi = 1.609 km']),
        },
      ],
    });
    const { render } = createRenderer({ components: registry });
    const html = await render({ body: ':::converter{from="mi" rate="1.609"}\n:::' });
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
      const { render } = createRenderer({ rehypePlugins: [rehypeWrapTables] });
      const html = await render({ body: '| a | b |\n| - | - |\n| 1 | 2 |' });
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
      const { render } = createRenderer({ rehypePlugins: [probe] });
      await render({ body: '<script>alert(1)</script>\n\nText' });
      expect(sawScript).toBe(false);
    });

    it('appends site remarkPlugins after cairn: link resolution', async () => {
      let sawResolvedUrl: string | undefined;
      const probe = () => (tree: unknown) => {
        visit(tree as Parameters<typeof visit>[0], 'link', (node: { url: string }) => {
          sawResolvedUrl = node.url;
        });
      };
      const { render } = createRenderer({ remarkPlugins: [probe] });
      await render({ body: '[a post](cairn:posts/hello)', resolveLink: () => '/posts/hello' });
      expect(sawResolvedUrl).toBe('/posts/hello');
    });

    it('applies the bag resolveMedia when an input has none, and an input one wins', async () => {
      const { render } = createRenderer({ resolveMedia: () => '/bag.png' });
      const md = '![alt](media:blue-running-shoes.a1b2c3d4e5f6a7b8)';
      expect(await render({ body: md })).toContain('/bag.png');
      const own = await render({ body: md, resolveMedia: () => '/own.png' });
      expect(own).toContain('/own.png');
      expect(own).not.toContain('/bag.png');
    });
  });

  describe('renderDocument', () => {
    it('returns ordered headings with depth and id, alongside the rendered html', async () => {
      const { renderDocument } = createRenderer();
      const { html, headings } = await renderDocument({ body: '# Title\n\n## Section One\n\nText\n\n### Sub A\n\n## Section Two' });
      expect(html).toContain('<h1');
      expect(headings).toEqual([
        { id: 'title', text: 'Title', depth: 1 },
        { id: 'section-one', text: 'Section One', depth: 2 },
        { id: 'sub-a', text: 'Sub A', depth: 3 },
        { id: 'section-two', text: 'Section Two', depth: 2 },
      ]);
    });

    it('includes an h1 heading at depth 1', async () => {
      const { renderDocument } = createRenderer();
      const { headings } = await renderDocument({ body: '# Just A Title' });
      expect(headings).toEqual([{ id: 'just-a-title', text: 'Just A Title', depth: 1 }]);
    });

    it('flattens an inline-code heading to plain text and strips backticks from the slug', async () => {
      const { renderDocument } = createRenderer();
      const { headings } = await renderDocument({ body: '## The `renderMarkdown` helper' });
      expect(headings).toEqual([{ id: 'the-rendermarkdown-helper', text: 'The renderMarkdown helper', depth: 2 }]);
    });

    it('suffixes a duplicate heading id the same way github-slugger does', async () => {
      const { renderDocument } = createRenderer();
      const { headings } = await renderDocument({ body: '## How it went\n\nText\n\n## How it went' });
      expect(headings.map((heading) => heading.id)).toEqual(['how-it-went', 'how-it-went-1']);
    });

    it('collects a heading a site rehypePlugins entry adds, since the collector runs last', async () => {
      const addHeading = () => (tree: HastRoot) => {
        tree.children.push(h('h2', { id: 'appended' }, 'Appended By Site') as unknown as Element);
      };
      const { renderDocument } = createRenderer({ rehypePlugins: [addHeading] });
      const { headings } = await renderDocument({ body: '# Title' });
      expect(headings).toContainEqual({ id: 'appended', text: 'Appended By Site', depth: 2 });
    });
  });

  describe('table-scroll default', () => {
    it('wraps a rendered table in a scrollable, labeled region by default', async () => {
      const { render } = createRenderer();
      const html = await render({ body: '| Name | Age |\n| - | - |\n| Ada | 36 |' });
      expect(html).toContain('class="table-scroll"');
      expect(html).toContain('role="region"');
      expect(html).toContain('tabindex="0"');
      expect(html).toContain('aria-label="Table: Name, Age"');
      // the table itself is untouched: still a real <table>, just wrapped.
      expect(html).toMatch(/<div class="table-scroll"[^>]*><table>/);
    });

    it('opts out of the default table wrap with tableScroll: false', async () => {
      const { render } = createRenderer({ tableScroll: false });
      const html = await render({ body: '| Name | Age |\n| - | - |\n| Ada | 36 |' });
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
      const { render } = createRenderer({ rehypePlugins: [probe] });
      await render({ body: '| a | b |\n| - | - |\n| 1 | 2 |' });
      expect(sawWrapper).toBe(true);
    });
  });
});
