import { describe, it, expect } from 'vitest';
import { h } from 'hastscript';
import type { Root, Element, ElementContent } from 'hast';
import { rehypeDispatch, cardShell, headRow, markFirstList, isElement, strAttr } from '../../lib/render/rehype-dispatch.js';
import { defineRegistry } from '../../lib/render/registry.js';
import type { ComponentContext } from '../../lib/render/registry.js';

// Local fixture helper: pull the <h2> out as a .card-title and wrap it in an
// .ec-head row. The engine no longer ships a heading-sniffing splitHead, so the
// fixture builds its own head from the stamped section.
function fixtureHead(node: Element): { head: Element; rest: ElementContent[] } {
  const children = node.children as ElementContent[];
  const i = children.findIndex((c) => isElement(c) && c.tagName === 'h2');
  const h2 = children[i] as Element;
  h2.properties = { ...h2.properties, className: ['card-title'] };
  const rest = children.filter((_, j) => j !== i);
  return { head: h('div', { className: ['ec-head'] }, [h2]), rest };
}

const reg = defineRegistry({
  components: [
    {
      name: 'card',
      label: '',
      description: '',
      insertTemplate: '',
      build: (ctx) => {
        const { head, rest } = fixtureHead(ctx.node);
        return cardShell(['card'], [head, h('div', { className: ['section-body'] }, rest)]);
      },
    },
  ],
});

describe('rehypeDispatch', () => {
  it('dispatches a stamped element through its registry build fn', () => {
    const tree: Root = {
      type: 'root',
      children: [h('div', { dataPrimitive: 'card' }, [h('h2', ['Title']), h('p', ['Body'])])],
    } as Root;
    rehypeDispatch(reg)(tree);
    const section = tree.children[0] as never as {
      tagName: string;
      children: { children: { properties: { className: string[] } }[] }[];
    };
    expect(section.tagName).toBe('section');
    // section > div.card-body > [div.ec-head, div.section-body]
    const cardBody = section.children[0];
    expect(cardBody.children[0].properties.className).toContain('ec-head');
  });

  it('stamps a data-rise ordinal on top-level primitives in document order', () => {
    const tree: Root = {
      type: 'root',
      children: [
        h('div', { dataPrimitive: 'card' }, [h('h2', ['First'])]),
        h('p', ['interleaved non-primitive']),
        h('div', { dataPrimitive: 'card' }, [h('h2', ['Second'])]),
      ],
    } as Root;
    rehypeDispatch(reg, true)(tree);
    const first = tree.children[0] as never as { properties: { dataRise?: string } };
    const second = tree.children[2] as never as { properties: { dataRise?: string } };
    // The index counts primitives only, so the interleaved <p> does not bump it.
    expect(first.properties.dataRise).toBe('0');
    expect(second.properties.dataRise).toBe('1');
  });

  it('omits data-rise when no stagger is requested', () => {
    const tree: Root = {
      type: 'root',
      children: [h('div', { dataPrimitive: 'card' }, [h('h2', ['T'])])],
    } as Root;
    rehypeDispatch(reg)(tree);
    const section = tree.children[0] as never as { properties: { dataRise?: string } };
    expect(section.properties.dataRise).toBeUndefined();
  });

  it('markFirstList tags the first <ul> with ec-grid', () => {
    const ul = h('ul', [h('li', ['a'])]);
    const out = markFirstList([h('p', ['x']), ul]);
    expect(out?.properties?.className).toContain('ec-grid');
  });
});

function ctxWith(attributes: Record<string, string | boolean>): ComponentContext {
  return { attributes, slot: () => [], items: () => [], node: { type: 'element', tagName: 'div', properties: {}, children: [] } };
}

describe('strAttr', () => {
  it('returns a string attribute value', () => {
    expect(strAttr(ctxWith({ icon: 'leaf' }), 'icon')).toBe('leaf');
  });
  it('returns undefined for a boolean attribute', () => {
    expect(strAttr(ctxWith({ wide: true }), 'wide')).toBeUndefined();
  });
  it('returns undefined for an absent attribute', () => {
    expect(strAttr(ctxWith({}), 'icon')).toBeUndefined();
  });
});

describe('headRow', () => {
  it('builds an ec-head with an h2.card-title and no icon when none is given', () => {
    const row = headRow([{ type: 'text', value: 'Hello' }]);
    expect(row.tagName).toBe('div');
    expect(row.properties?.className).toEqual(['ec-head']);
    expect(row.children).toHaveLength(1);
    const heading = row.children[0] as Element;
    expect(heading.tagName).toBe('h2');
    expect(heading.properties?.className).toEqual(['card-title']);
    expect((heading.children[0] as { value: string }).value).toBe('Hello');
  });

  it('places a pre-built icon before the heading when given', () => {
    const icon = h('span', { className: ['ec-icon'] }, []);
    const row = headRow([{ type: 'text', value: 'Hi' }], icon);
    expect(row.children).toHaveLength(2);
    const first = row.children[0] as Element;
    expect(first.tagName).toBe('span');
    expect(first.properties?.className).toEqual(['ec-icon']);
    expect((row.children[1] as Element).tagName).toBe('h2');
  });
});
