// Setup file for the projects that alias `cloudflare:workers` to the fake: a fresh, empty,
// non-throwing fake before every test.
import { beforeEach } from 'vitest';
import { resetFakeEnv } from './cloudflare-workers-fake.js';

beforeEach(() => {
  resetFakeEnv();
});
