// The showcase's own unit run: the chassis and theme's pure logic (archive pagination, date
// formatting, banner expiry, admin-href detection), co-located with the modules it tests. Kept
// standalone rather than a project in the engine's root config, since the engine's config lives
// outside this package and a scaffolded site copies this file, not the engine's.
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    // Mirrors svelte.config.js's kit.alias so a cross-seam unit test (one importing both a
    // $chassis and a $theme module) resolves outside the SvelteKit dev/build pipeline too. `$lib`
    // is SvelteKit's own built-in alias rather than one this site declares, and it needs restating
    // here for the same reason: a route module under test reaches its site-owned helpers through it.
    alias: {
      $chassis: path.resolve('./src/chassis'),
      $lib: path.resolve('./src/lib'),
      $theme: path.resolve('./src/theme'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
