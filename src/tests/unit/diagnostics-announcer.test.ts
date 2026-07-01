import { describe, it, expect } from 'vitest';
import { summarizeDiagnostics } from '../../lib/components/editor-diagnostics-announcer.js';

describe('summarizeDiagnostics', () => {
  it('pluralizes and joins both kinds', () => {
    expect(summarizeDiagnostics({ spelling: 3, style: 1 })).toBe('3 spelling suggestions, 1 style issue');
  });
  it('drops a zero kind and singularizes', () => {
    expect(summarizeDiagnostics({ spelling: 1, style: 0 })).toBe('1 spelling suggestion');
    expect(summarizeDiagnostics({ spelling: 0, style: 2 })).toBe('2 style issues');
  });
  it('is empty for no diagnostics', () => {
    expect(summarizeDiagnostics({ spelling: 0, style: 0 })).toBe('');
  });
});
