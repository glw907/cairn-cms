import { describe, it, expect } from 'vitest';
import { h } from 'hastscript';
import type { Element, ElementContent } from 'hast';
import { createRenderer } from '../../lib/render/pipeline.js';
import { defineRegistry } from '../../lib/render/registry.js';
import { glyph } from '../../lib/render/glyph.js';
import {
  cardShell,
  markFirstList,
  iconSpan,
  isElement,
  strProp,
  type MakeIcon,
} from '../../lib/render/rehype-dispatch.js';

// A representative fixture registry. Stands in for a site's registry so the
// byte-identical lock lives in the engine suite with no consumer dependency.
const ICONS = { flag: 'M16 16 240 16 240 240 16 240Z' };
const makeIcon: MakeIcon = (name, role) => iconSpan(glyph(name, ICONS), role);

// Local fixture helper: pull the <h2> out as a .card-title and build the .ec-head
// row with an optional stamped icon. The engine no longer ships splitHead, so the
// fixture reproduces the head it needs from the stamped section.
function fixtureHead(node: Element, icon: MakeIcon): { head: Element; rest: ElementContent[] } {
  const children = node.children as ElementContent[];
  const i = children.findIndex((c) => isElement(c) && c.tagName === 'h2');
  const h2 = children[i] as Element;
  h2.properties = { ...h2.properties, className: ['card-title'] };
  const rest = children.filter((_, j) => j !== i);
  const iconName = strProp(node, 'dataIcon');
  const role = strProp(node, 'dataRole');
  const headKids: ElementContent[] = [];
  if (iconName) headKids.push(icon(iconName, role));
  headKids.push(h2);
  return { head: h('div', { className: ['ec-head'] }, headKids), rest };
}

const registry = defineRegistry({
  components: [
    {
      name: 'card',
      label: 'Card',
      description: '',
      insertTemplate: '',
      build: (ctx) => {
        const { head, rest } = fixtureHead(ctx.node, makeIcon);
        return cardShell(['card'], [head, h('div', { className: ['section-body'] }, rest)]);
      },
    },
    {
      name: 'grid',
      label: 'Grid',
      description: '',
      insertTemplate: '',
      build: (ctx) => {
        const children = ctx.node.children as Element['children'];
        markFirstList(children);
        const { head, rest } = fixtureHead(ctx.node, makeIcon);
        return cardShell(['grid'], [head, h('div', { className: ['section-body'] }, rest)]);
      },
    },
  ],
});

const DOC = [
  'Intro paragraph with an accidental colon at 9:30 today.',
  '',
  ':::card{icon=flag role=secondary}',
  '## Card heading',
  '',
  'Card body text.',
  ':::',
  '',
  ':::grid',
  '## Grid heading',
  '',
  '- one',
  '- two',
  ':::',
  '',
].join('\n');

describe('render pipeline characterization', () => {
  it('produces byte-identical HTML for a representative directive document', async () => {
    const { renderMarkdown } = createRenderer(registry, { stagger: true });
    const html = await renderMarkdown(DOC);
    expect(html).toMatchSnapshot();
  });

  it('is stable across renders (no per-run nondeterminism)', async () => {
    const { renderMarkdown } = createRenderer(registry, { stagger: true });
    const a = await renderMarkdown(DOC);
    const b = await renderMarkdown(DOC);
    expect(a).toBe(b);
  });
});
