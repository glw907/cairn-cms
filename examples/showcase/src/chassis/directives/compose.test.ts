import { describe, expect, it } from 'vitest';
import { h } from 'hastscript';
import type { BlockContext } from '@glw907/cairn-cms';
import { composeBlocks } from './compose.js';
import classes from './classes.json';

const icons = { flag: '<path d="M0 0"/>' };

/** A context carrying the slice every default build reads. */
function contextFor(attributes: Record<string, string>): BlockContext {
  return {
    attributes: { ...attributes },
    attr: (key) => attributes[key],
    slot: () => [],
    items: () => [],
    node: { type: 'element', tagName: 'div', properties: {}, children: [] },
  };
}

/** What a build yields for a context: its markup, or the message it threw. */
function outcome(build: (ctx: BlockContext) => unknown): unknown {
  try {
    return build(
      contextFor({
        name: 'flag',
        label: 'Go',
        url: 'https://youtu.be/x',
        title: 'T',
        question: 'Q',
        message: 'M',
        expires: '2999-01-01',
      }),
    );
  } catch (error) {
    return String(error);
  }
}

describe('composeBlocks', () => {
  it('registers the nine blocks in the documented order', () => {
    expect(composeBlocks(icons, {}).map((b) => b.name)).toEqual([
      'callout',
      'alert',
      'icon',
      'video',
      'pull-quote',
      'cta',
      'micro-cta',
      'faq',
      'banner',
    ]);
  });

  it('throws naming a renderer key outside the vocabulary', () => {
    const renderers = { 'not-a-block': () => h('div') } as never;
    expect(() => composeBlocks(icons, renderers)).toThrow(/not-a-block/);
  });

  it('replaces only the callout build when a callout renderer is passed', () => {
    const base = composeBlocks(icons, {});
    const custom = () => h('aside', { className: ['mine'] }, []);
    const composed = composeBlocks(icons, { callout: custom });
    for (const [i, block] of composed.entries()) {
      const baseBlock = base[i]!;
      if (block.name === 'callout') {
        expect(block.build).toBe(custom);
        const { build: _custom, ...rest } = block;
        const { build: _default, ...baseRest } = baseBlock;
        // Fresh validator closures differ by identity, so compare the data and the key set.
        expect(Object.keys(rest)).toEqual(Object.keys(baseRest));
        expect(JSON.stringify(rest)).toBe(JSON.stringify(baseRest));
      } else {
        expect(outcome(block.build)).toEqual(outcome(baseBlock.build));
        expect(JSON.stringify({ ...block, build: 0 })).toBe(
          JSON.stringify({ ...baseBlock, build: 0 }),
        );
      }
    }
  });
});

describe('classes.json', () => {
  it('names exactly the nine vocabulary blocks', () => {
    const names = composeBlocks(icons, {}).map((b) => b.name);
    expect(Object.keys(classes).sort()).toEqual([...names].sort());
  });
});
