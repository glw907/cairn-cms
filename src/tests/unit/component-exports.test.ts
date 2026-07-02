import { describe, it, expect } from 'vitest';
import * as cairn from '../../lib/index.js';

describe('component grammar exports', () => {
  it('exposes defineComponent from the root barrel', () => {
    expect(typeof cairn.defineComponent).toBe('function');
  });

  it('omits the component-grammar and insert helpers from the root barrel but keeps them reachable from their modules', async () => {
    for (const name of ['emptyValues', 'serializeComponent', 'parseComponent', 'validateComponent', 'generateComponentReference']) {
      expect(name in cairn).toBe(false);
    }
    const registry = await import('../../lib/render/registry.js');
    const grammar = await import('../../lib/render/component-grammar.js');
    const validate = await import('../../lib/render/component-validate.js');
    const reference = await import('../../lib/render/component-reference.js');
    expect(typeof registry.emptyValues).toBe('function');
    expect(typeof grammar.serializeComponent).toBe('function');
    expect(typeof grammar.parseComponent).toBe('function');
    expect(typeof validate.validateComponent).toBe('function');
    expect(typeof reference.generateComponentReference).toBe('function');
  });
});
