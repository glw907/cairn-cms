import { defineConfig } from '@playwright/test';

// Another project on this workstation can hold port 4173, so a fixed port would let a local e2e
// run connect to that project's server and silently test the wrong site. E2E_PORT overrides the
// port for a local run; CI never sets it, so CI keeps the 4173 default.
const E2E_PORT = process.env.E2E_PORT ?? '4173';

export default defineConfig({
  // CI's renderer produces run-to-run anti-aliasing jitter of a few dozen pixels;
  // baselines are CI-canonical (the regen dispatch), and a much lower allowance would go
  // flaky on that jitter. The cost is a defect-size floor, and the floor is easy to
  // underestimate: a 1.5px shift on a 16px icon measured 51 differing pixels, which
  // passes at 120 and never rewrites the baseline (measured 2026-08-07 on the admin edit
  // page at 1440). So a green screenshot run is not evidence that a small-footprint
  // defect class is absent. A defect whose whole footprint fits under the floor needs a
  // gate that measures geometry; for vertical alignment that gate is the library's
  // src/tests/component/vertical-alignment-recipes.test.ts. Re-costing this number is a
  // ROADMAP item, since it moves every baseline decision in the suite at once.
  expect: { toHaveScreenshot: { maxDiffPixels: 120 } },
  testDir: 'e2e',
  // The dev backend (the fake-github recorder, the fake R2 bucket) is module-level singleton state
  // on the one served worker, and several specs commit to the same seed post on the same branch. A
  // parallel run lets one spec's save overwrite /test/last-commit between another spec's save and its
  // read. Run the e2e suite on one worker so each spec reads back its own commit deterministically.
  workers: 1,
  fullyParallel: false,
  // Retry on CI only. The spellcheck spec streams a 1.5MB dictionary into wasm on first lint, which
  // intermittently exceeds its budget on a loaded CI runner; a retry clears the transient slowness
  // without weakening any assertion. Locally (reuseExistingServer) retries stay off for fast feedback.
  retries: process.env.CI ? 2 : 0,
  // Run a production build with VITE_CAIRN_E2E=1 so the build-foldable e2e gate includes the dev
  // backend, then serve it through `wrangler dev`, the host the adapter's output targets. A default
  // build (no flag) folds the backend out; this flagged build keeps it in for the specs, which
  // exercise the real production output path.
  //
  // Three things reach workerd only by this command. The members fixture's D1 is the local
  // `MEMBER_DB` the migration step creates, so the specs read the same binding a deployment would.
  // `--var CAIRN_DEV_BACKEND:1` is the dev-backend opt-in; an OS environment variable never reaches
  // the worker, and the flag stays out of wrangler.jsonc and any .dev.vars file so no later
  // unflagged serve inherits it. `--var PUBLIC_ORIGIN` overrides wrangler.jsonc's origin so minted
  // preview links follow E2E_PORT, since the file's own origin belongs to the flag-free `preview`
  // script. The inspector port is pinned beside the serve port so two runs never fight over
  // wrangler's default.
  webServer: {
    command: [
      'VITE_CAIRN_E2E=1 npm run build',
      'npx wrangler d1 migrations apply MEMBER_DB --local',
      `npx wrangler dev --port ${E2E_PORT} --inspector-port ${Number(E2E_PORT) + 1} --var CAIRN_DEV_BACKEND:1 --var PUBLIC_ORIGIN:http://localhost:${E2E_PORT}`,
    ].join(' && '),
    port: Number(E2E_PORT),
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: { baseURL: `http://localhost:${E2E_PORT}` },
});
