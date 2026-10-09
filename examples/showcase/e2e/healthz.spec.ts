import { test, expect } from '@playwright/test';

// The health check lives at the site root (/healthz), OUTSIDE /admin, so a real site's auth
// guard never gates it. The showcase dev env has no GITHUB_APP_PRIVATE_KEY_B64, so the signing
// self-test returns ok:false with a detail string. The endpoint answers 503 JSON in that case, so
// an operator (or CI) reads the status code and still tells "key missing" from "server error" by
// the detail. The live ok:true check runs per-site at deploy time when the real Worker secret is
// present.
test('healthz returns 503 JSON with an ok field; key absent in dev so ok is false', async ({
  request,
}) => {
  const res = await request.get('/healthz');
  expect(res.status()).toBe(503);
  expect(res.headers()['content-type']).toMatch(/^application\/json/);
  const body = await res.json();
  expect(body).toHaveProperty('ok');
  expect(body.ok).toBe(false);
  expect(body.checks.githubAppSigning.ok).toBe(false);
  expect(body.checks.githubAppSigning.detail).toMatch(/not configured/);
});
