import { describe, it, expect } from 'vitest';
import { h } from 'hastscript';
import type { Element, ElementContent } from 'hast';
import { createRenderer } from '../../lib/render/pipeline.js';
import { defineRegistry, type ComponentContext } from '../../lib/render/registry.js';
import { fields } from '../../lib/content/fields.js';
import { renderGlyph } from '../../lib/render/glyph.js';
import {
  markFirstList,
  isElement,
  strProp,
  type MakeIcon,
} from '../../lib/render/rehype-dispatch.js';

// Local fixture copies of the render trio the engine retired (chassis-A, Task 8, re-homed to
// site-owned code): kept here, byte-for-byte, so this suite's byte-identical lock stands on no
// engine export beyond the ones the engine still ships. A real site's copy lives beside its own
// icon renderer, e.g. examples/showcase/src/chassis/render.ts.
function fixtureIconSpan(glyphEl: Element, role?: string): Element {
  const className = role === 'secondary' ? ['cairn-icon', 'cairn-icon-secondary'] : ['cairn-icon'];
  return h('span', { className }, [glyphEl]);
}

function fixtureCardShell(classes: string[], body: ElementContent[]): Element {
  return h('section', { className: classes }, [h('div', { className: ['card-body'] }, body)]);
}

function fixtureHeadRow(title: ElementContent[], icon?: Element, level: number = 2): Element {
  const children: ElementContent[] = [];
  if (icon) children.push(icon);
  children.push(h(`h${level}`, { className: ['card-title'] }, title));
  return h('div', { className: ['cairn-head'] }, children);
}

// A representative fixture registry. Stands in for a site's registry so the
// byte-identical lock lives in the engine suite with no consumer dependency.
const ICONS = { flag: 'M16 16 240 16 240 240 16 240Z' };
const makeIcon: MakeIcon = (name, role) => fixtureIconSpan(renderGlyph(name, ICONS), role);

// Local fixture helper: pull the <h2> out as the head's title and build the .cairn-head row with
// an optional icon read from the declared attribute path. Mirrors what a real site build does
// with the fixture headRow above.
function fixtureHead(ctx: ComponentContext, icon: MakeIcon): { head: Element; rest: ElementContent[] } {
  const children = ctx.node.children as ElementContent[];
  const i = children.findIndex((c) => isElement(c) && c.tagName === 'h2');
  const h2 = children[i] as Element;
  const rest = children.filter((_, j) => j !== i);
  const iconName = typeof ctx.attributes.icon === 'string' ? ctx.attributes.icon : undefined;
  const role = strProp(ctx.node, 'dataRole');
  const iconEl = iconName ? icon(iconName, role) : undefined;
  return { head: fixtureHeadRow(h2.children as ElementContent[], iconEl), rest };
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
        return fixtureCardShell(['card'], [head, h('div', { className: ['section-body'] }, rest)]);
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
        return fixtureCardShell(['grid'], [head, h('div', { className: ['section-body'] }, rest)]);
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
    const { renderMarkdown } = createRenderer(registry);
    const html = await renderMarkdown(DOC);
    expect(html).toMatchSnapshot();
  });

  it('is stable across renders (no per-run nondeterminism)', async () => {
    const { renderMarkdown } = createRenderer(registry);
    const a = await renderMarkdown(DOC);
    const b = await renderMarkdown(DOC);
    expect(a).toBe(b);
  });
});
