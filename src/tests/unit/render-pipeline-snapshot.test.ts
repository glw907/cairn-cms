import { describe, it, expect } from 'vitest';
import { h } from 'hastscript';
import type { Element } from 'hast';
import { createRenderer } from '../../lib/render/pipeline.js';
import { defineRegistry } from '../../lib/render/registry.js';
import { glyph } from '../../lib/render/glyph.js';
import { splitHead, cardShell, markFirstList, iconSpan, type MakeIcon } from '../../lib/render/rehype-dispatch.js';

// A representative fixture registry. Stands in for a site's registry so the
// byte-identical lock lives in the engine suite with no consumer dependency.
const ICONS = { flag: 'M16 16 240 16 240 240 16 240Z' };
const makeIcon: MakeIcon = (name, role) => iconSpan(glyph(name, ICONS), role);

const registry = defineRegistry({
  components: [
    {
      name: 'card',
      label: 'Card',
      description: '',
      insertTemplate: '',
      build: (node, rise) => {
        const { head, rest } = splitHead(node, makeIcon);
        return cardShell(['card'], rise, [head, h('div', { className: ['section-body'] }, rest)]);
      },
    },
    {
      name: 'grid',
      label: 'Grid',
      description: '',
      insertTemplate: '',
      build: (node, rise) => {
        const children = node.children as Element['children'];
        markFirstList(children as never);
        const { head, rest } = splitHead(node, makeIcon);
        return cardShell(['grid'], rise, [head, h('div', { className: ['section-body'] }, rest)]);
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
    const { renderMarkdown } = createRenderer(registry, { rise: (i) => `--rise:${i}` });
    const html = await renderMarkdown(DOC);
    expect(html).toMatchSnapshot();
  });

  it('is stable across renders (no per-run nondeterminism)', async () => {
    const { renderMarkdown } = createRenderer(registry, { rise: (i) => `--rise:${i}` });
    const a = await renderMarkdown(DOC);
    const b = await renderMarkdown(DOC);
    expect(a).toBe(b);
  });
});
