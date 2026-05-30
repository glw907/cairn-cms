import { describe, it, expect } from 'vitest';
import { h } from 'hastscript';
import type { Root } from 'hast';
import { rehypeDispatch, splitHead, cardShell, markFirstList } from '../../lib/render/rehype-dispatch.js';
import { defineRegistry } from '../../lib/render/registry.js';

const reg = defineRegistry({
  components: [
    {
      name: 'card',
      label: '',
      description: '',
      insertTemplate: '',
      build: (node) => {
        const { head, rest } = splitHead(node);
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
