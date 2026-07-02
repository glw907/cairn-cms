import { describe, it, expect } from 'vitest';
import * as sveltekit from '../../lib/sveltekit/index.js';
import * as pkg from '../../lib/index.js';

describe('nav exports', () => {
  it('the sveltekit barrel exports createNavRoutes', () => {
    expect(typeof sveltekit.createNavRoutes).toBe('function');
  });

  it('the package entry exports the read-side nav helpers', () => {
    expect(typeof pkg.parseSiteConfig).toBe('function');
    expect(typeof pkg.extractMenu).toBe('function');
  });

  it('omits the nav-editor write helpers from the root barrel', async () => {
    expect('setMenu' in pkg).toBe(false);
    expect('validateNavTree' in pkg).toBe(false);
    const siteConfig = await import('../../lib/nav/site-config.js');
    expect(typeof siteConfig.setMenu).toBe('function');
    expect(typeof siteConfig.validateNavTree).toBe('function');
  });
});
