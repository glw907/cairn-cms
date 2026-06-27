import { describe, it, expect } from 'vitest';
import { h } from 'hastscript';
import type { Element, ElementContent } from 'hast';
import { createRenderer } from '../../lib/render/pipeline.js';
import { defineRegistry, type ComponentContext } from '../../lib/render/registry.js';
import { fields } from '../../lib/content/fields.js';
import { glyph } from '../../lib/render/glyph.js';
import {
  cardShell,
  headRow,
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

// Local fixture helper: pull the <h2> out as the head's title and build the .ec-head row with
// an optional icon read from the declared attribute path. Mirrors what a real site build does
// with headRow now that the engine ships it.
function fixtureHead(ctx: ComponentContext, icon: MakeIcon): { head: Element; rest: ElementContent[] } {
  const children = ctx.node.children as ElementContent[];
  const i = children.findIndex((c) => isElement(c) && c.tagName === 'h2');
  const h2 = children[i] as Element;
  const rest = children.filter((_, j) => j !== i);
  const iconName = typeof ctx.attributes.icon === 'string' ? ctx.attributes.icon : undefined;
  const role = strProp(ctx.node, 'dataRole');
  const iconEl = iconName ? icon(iconName, role) : undefined;
  return { head: headRow(h2.children as ElementContent[], iconEl), rest };
}

const registry = defineRegistry({
  components: [
    {
      name: 'card',
      label: 'Card',
      description: '',
      insertTemplate: '',
      attributes: { icon: fields.icon({ label: 'Icon' }) },
      build: (ctx) => {
        const { head, rest } = fixtureHead(ctx, makeIcon);
        return cardShell(['card'], [head, h('div', { className: ['section-body'] }, rest)]);
      },
    },
    {
      name: 'grid',
      label: 'Grid',
      description: '',
      insertTemplate: '',
      attributes: { icon: fields.icon({ label: 'Icon' }) },
      build: (ctx) => {
        const children = ctx.node.children as Element['children'];
        markFirstList(children);
        const { head, rest } = fixtureHead(ctx, makeIcon);
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
