import { describe, it, expect } from 'vitest';
import * as sveltekit from '../../lib/sveltekit/index.js';
import * as pkg from '../../lib/index.js';

describe('nav exports', () => {
  it('the sveltekit barrel exports createNavRoutes', () => {
    expect(typeof sveltekit.createNavRoutes).toBe('function');
  });

  it('the package entry exports the nav site-config helpers', () => {
    expect(typeof pkg.parseSiteConfig).toBe('function');
    expect(typeof pkg.extractMenu).toBe('function');
    expect(typeof pkg.setMenu).toBe('function');
    expect(typeof pkg.validateNavTree).toBe('function');
  });
});
