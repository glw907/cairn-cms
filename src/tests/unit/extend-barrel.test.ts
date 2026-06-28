// src/tests/unit/extend-barrel.test.ts
import { describe, it, expect } from 'vitest';
import * as extend from '../../lib/extend/index.js';

describe('./extend barrel', () => {
  it('exports the phase-1 extension surface', () => {
    for (const name of ['loadPrincipal', 'requireScope', 'requireAnyScope', 'hasScope', 'sendMagicLink', 'confirmMagicLink', 'signIn', 'forgetPrincipal']) {
      expect(typeof (extend as Record<string, unknown>)[name]).toBe('function');
    }
  });
});
