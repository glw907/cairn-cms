import { describe, it, expect } from 'vitest';
import { renderGlyph } from '../../lib/render/glyph.js';

const SET = { flag: 'M1 2 3 4Z' };

describe('renderGlyph', () => {
  it('builds an ec-glyph svg hast node with the path for the named icon', () => {
    const node = renderGlyph('flag', SET);
    expect(node.tagName).toBe('svg');
    expect(node.properties?.className).toEqual(['ec-glyph']);
    expect(node.properties?.viewBox).toBe('0 0 256 256');
    const path = node.children[0];
    expect(path).toMatchObject({ tagName: 'path', properties: { d: 'M1 2 3 4Z' } });
  });
});
