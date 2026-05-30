import { env, applyD1Migrations } from 'cloudflare:test';
import { beforeAll } from 'vitest';

// Apply committed SQL migrations to the per-suite miniflare D1 before any test.
// Idempotent and safe with zero migrations present (this plan ships none yet).
beforeAll(async () => {
  await applyD1Migrations(env.AUTH_DB, env.TEST_MIGRATIONS);
});
