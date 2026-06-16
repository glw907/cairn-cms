import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  // The fake backend (the fake-github recorder, the fake R2 bucket) is module-level singleton state
  // on the one preview server, and several specs commit to the same seed post on the same branch. A
  // parallel run lets one spec's save overwrite /test/last-commit between another spec's save and its
  // read. Run the e2e suite on one worker so each spec reads back its own commit deterministically.
  workers: 1,
  fullyParallel: false,
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { SHOWCASE_FAKE_BACKEND: '1' },
  },
  use: { baseURL: 'http://localhost:4173' },
});
