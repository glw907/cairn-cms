import { describe, it, expect } from 'vitest';
import * as sveltekit from '../../lib/sveltekit/index.js';

describe('sveltekit barrel', () => {
  it('exports the guard, the admin composer, and the health load', () => {
    expect(typeof sveltekit.createAuthGuard).toBe('function');
    expect(typeof sveltekit.createCairnAdmin).toBe('function');
    expect(typeof sveltekit.loadHealth).toBe('function');
    expect(typeof sveltekit.requireSession).toBe('function');
    expect(typeof sveltekit.requireOwner).toBe('function');
  });

  it('exports the packaged D1 audit sink', () => {
    expect(typeof sveltekit.createD1AuditSink).toBe('function');
  });
});
