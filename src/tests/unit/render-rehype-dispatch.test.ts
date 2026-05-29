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
      build: (node, rise) => {
        const { head, rest } = splitHead(node);
        return cardShell(['card'], rise, [head, h('div', { className: ['section-body'] }, rest)]);
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

  it('applies a rise stagger to top-level primitives only', () => {
    const tree: Root = {
      type: 'root',
      children: [h('div', { dataPrimitive: 'card' }, [h('h2', ['T'])])],
    } as Root;
    rehypeDispatch(reg, (i) => `--rise:${i}`)(tree);
    const section = tree.children[0] as never as { properties: { style?: string } };
    expect(section.properties.style).toBe('--rise:0');
  });

  it('markFirstList tags the first <ul> with ec-grid', () => {
    const ul = h('ul', [h('li', ['a'])]);
    const out = markFirstList([h('p', ['x']), ul]);
    expect(out?.properties?.className).toContain('ec-grid');
  });
});
