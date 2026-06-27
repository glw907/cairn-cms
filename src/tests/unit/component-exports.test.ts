import { describe, it, expect } from 'vitest';
import * as cairn from '../../lib/index.js';

describe('component grammar exports', () => {
  it('exposes the schema helper, the three grammar machines, and the reference generator', () => {
    for (const name of ['defineComponent', 'emptyValues', 'serializeComponent', 'parseComponent', 'validateComponent', 'generateComponentReference']) {
      expect(typeof (cairn as Record<string, unknown>)[name]).toBe('function');
    }
  });
});
