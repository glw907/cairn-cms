// The /delivery/data barrel is the node-safe delivery surface: pure corpus projections with no
// @sveltejs/kit and no .svelte in the graph, so a plain-Node tool (the manifest plugin, the bin,
// a migration script) imports the builder from it. The kit route loaders stay in /delivery.
import { describe, it, expect } from 'vitest';

describe('delivery data split', () => {
  it('exposes the pure projections from the data barrel', async () => {
    const data = await import('../../lib/delivery/data.js');
    expect(typeof data.buildSiteManifest).toBe('function');
    expect(typeof data.createSiteIndexes).toBe('function');
    expect(typeof data.buildRssFeed).toBe('function');
  });

  it('does not export the kit route loaders from the data barrel', async () => {
    const data = await import('../../lib/delivery/data.js');
    expect('createPublicRoutes' in data).toBe(false);
  });

  it('keeps the full /delivery barrel re-exporting both the data surface and the route loaders', async () => {
    const barrel = await import('../../lib/delivery/index.js');
    expect(typeof barrel.buildSiteManifest).toBe('function');
    expect(typeof barrel.createPublicRoutes).toBe('function');
  });
});
