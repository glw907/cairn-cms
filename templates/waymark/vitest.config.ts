// The showcase's own unit run: the chassis and theme's pure logic (archive pagination, date
// formatting, banner expiry, admin-href detection), co-located with the modules it tests. Kept
// standalone rather than a project in the engine's root config, since the engine's config lives
// outside this package and a scaffolded site copies this file, not the engine's.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
