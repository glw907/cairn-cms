import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  // The dev backend (the fake-github recorder, the fake R2 bucket) is module-level singleton state
  // on the one preview server, and several specs commit to the same seed post on the same branch. A
  // parallel run lets one spec's save overwrite /test/last-commit between another spec's save and its
  // read. Run the e2e suite on one worker so each spec reads back its own commit deterministically.
  workers: 1,
  fullyParallel: false,
  // Run a production build with VITE_CAIRN_E2E=1 so the build-foldable e2e gate includes the dev
  // backend, then serve it with `preview`. A default build (no flag) folds the backend out; this
  // flagged build keeps it in for the specs, which exercise the real production output path.
  webServer: {
    command: 'VITE_CAIRN_E2E=1 npm run build && npm run preview -- --port 4173',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { CAIRN_DEV_BACKEND: '1' },
  },
  use: { baseURL: 'http://localhost:4173' },
});
