import { describe, it, expect } from 'vitest';
import { condition, allConditions, CairnError } from '../../lib/diagnostics/index.js';

describe('diagnostics barrel', () => {
  it('re-exports the registry helpers and CairnError', () => {
    expect(typeof condition).toBe('function');
    expect(allConditions().length).toBeGreaterThan(0);
    expect(new CairnError('edge.https-not-forced')).toBeInstanceOf(CairnError);
  });
});
