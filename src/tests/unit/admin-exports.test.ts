import { describe, it, expect } from 'vitest';
import * as sveltekit from '../../lib/sveltekit/index.js';

describe('sveltekit barrel', () => {
  it('exports the auth, editor, content, and health route factories', () => {
    expect(typeof sveltekit.createAuthGuard).toBe('function');
    expect(typeof sveltekit.createAuthRoutes).toBe('function');
    expect(typeof sveltekit.createEditorRoutes).toBe('function');
    expect(typeof sveltekit.createContentRoutes).toBe('function');
    expect(typeof sveltekit.healthLoad).toBe('function');
    expect(typeof sveltekit.requireSession).toBe('function');
    expect(typeof sveltekit.requireOwner).toBe('function');
  });
});
