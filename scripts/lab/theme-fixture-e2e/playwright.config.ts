import { defineConfig } from '@playwright/test';

// The fixture harness starts and stops the preview server itself, so this config has no webServer.
// The harness copies this file and the spec into the throwaway showcase copy and runs Playwright
// from there, where `@playwright/test` resolves through the copy's node_modules link.
const PORT = process.env.THEME_FIXTURE_PORT ?? '4393';

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: { baseURL: `http://localhost:${PORT}` },
});
