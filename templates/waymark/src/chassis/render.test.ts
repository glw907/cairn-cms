import { describe, expect, it } from 'vitest';
import { h } from 'hastscript';
import { headRow } from './render.js';

describe('headRow', () => {
  it('builds a heading with no icon at the default level', () => {
    const row = headRow([{ type: 'text', value: 'Title' }]);
    expect(row.tagName).toBe('div');
    expect(row.properties.className).toEqual(['cairn-head']);
    expect(row.children).toHaveLength(1);
    const [heading] = row.children;
    expect(heading).toMatchObject({
      tagName: 'h2',
      properties: { className: ['cairn-head-title'] },
    });
  });

  it('puts the icon before the heading when one is given', () => {
    const icon = h('span', { className: ['cairn-icon'] });
    const row = headRow([{ type: 'text', value: 'Title' }], icon);
    expect(row.children).toHaveLength(2);
    expect(row.children[0]).toBe(icon);
    expect(row.children[1]).toMatchObject({ tagName: 'h2' });
  });

  it('renders the requested heading level', () => {
    const row = headRow([{ type: 'text', value: 'Title' }], undefined, 3);
    expect(row.children[0]).toMatchObject({ tagName: 'h3' });
  });
});
