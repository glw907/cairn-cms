import { test, expect } from '@playwright/test';

// The health check lives at the site root (/healthz), OUTSIDE /admin, so a real site's auth
// guard never gates it. The showcase dev env has no GITHUB_APP_PRIVATE_KEY_B64, so the signing
// self-test returns ok:false with a detail string. The endpoint always returns 200 JSON so an
// operator (or CI) can tell "key missing" from "server error". The live ok:true check runs
// per-site at deploy time when the real Worker secret is present.
test('healthz returns 200 JSON with an ok field; key absent in dev so ok is false', async ({ request }) => {
  const res = await request.get('/healthz');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body).toHaveProperty('ok');
  expect(body.ok).toBe(false);
  expect(body.checks.githubAppSigning.ok).toBe(false);
  expect(body.checks.githubAppSigning.detail).toMatch(/not configured/);
});
