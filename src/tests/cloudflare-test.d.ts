/// <reference types="@cloudflare/workers-types" />
/// <reference types="@cloudflare/vitest-pool-workers/types" />

import type { D1Migration } from '@cloudflare/vitest-pool-workers';

// Test-only bindings the integration harness relies on. `AUTH_DB` is the
// miniflare D1 database declared in wrangler.test.jsonc; `TEST_MIGRATIONS`
// carries the committed SQL migrations from Node into workerd, where
// _apply-migrations.ts replays them (see vitest.config.ts). Merged into the
// global Cloudflare.Env so `env` from "cloudflare:test" is typed.
declare global {
  namespace Cloudflare {
    interface Env {
      AUTH_DB: D1Database;
      // The auth-channel factory's own second D1 binding (wrangler.test.jsonc), physically
      // separate from AUTH_DB per the design's decision 1.
      CHANNEL_DB: D1Database;
      MEDIA_BUCKET: R2Bucket;
      TEST_MIGRATIONS: D1Migration[];
    }
  }
}

export {};
