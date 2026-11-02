import { describe, it, expect } from 'vitest';
import { CairnError } from '../../lib/diagnostics/error.js';

describe('CairnError', () => {
  it('carries the condition id and the resolved condition', () => {
    const err = new CairnError('edge.https-not-forced');
    expect(err.conditionId).toBe('edge.https-not-forced');
    expect(err.condition.title).toBe('Always Use HTTPS is off');
  });

  it('narrows with instanceof and defaults its message to the condition title', () => {
    const err: unknown = new CairnError('auth.csrf-token-invalid');
    expect(err instanceof CairnError).toBe(true);
    expect(err instanceof Error).toBe(true);
    if (err instanceof CairnError) {
      expect(err.message).toBe(`Admin CSRF token check failed. ${err.condition.remediation}`);
    }
  });

  it('appends the remediation to a condition with no explicit message', () => {
    const err = new CairnError('config.bindings-missing');
    expect(err.message).toContain('Wrangler bindings are missing');
    expect(err.message).toContain(err.condition.remediation);
  });

  it('preserves an overriding message and a cause', () => {
    const cause = new Error('E_SENDER_NOT_VERIFIED');
    const err = new CairnError('edge.https-not-forced', { message: 'custom', cause });
    expect(err.message).toBe(`custom. ${err.condition.remediation}`);
    expect(err.conditionId).toBe('edge.https-not-forced');
    expect(err.cause).toBe(cause);
  });

  it('throws when constructed with an unknown condition id', () => {
    expect(() => new CairnError('nope.not-real')).toThrow(/unknown cairn condition/);
  });
});
