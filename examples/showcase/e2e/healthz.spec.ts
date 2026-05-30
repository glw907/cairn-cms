import { test, expect } from '@playwright/test';

// The showcase dev env has no GITHUB_APP_PRIVATE_KEY_B64, so the signing self-test returns
// ok:false with a detail string. The endpoint always returns 200 JSON so an operator (or CI)
// can tell "key missing" from "server error". The live green ok:true check runs per-site at
// Plan 08 deploy time when the real Worker secret is present.
test('healthz returns 200 JSON with an ok field; key absent in dev so ok is false', async ({ request }) => {
  const res = await request.get('/admin/healthz');
  // The endpoint wraps all errors and always returns 200 so the runbook check step is safe.
  expect(res.status()).toBe(200);
  const body = await res.json();
  // The health payload always has an ok field.
  expect(body).toHaveProperty('ok');
  // In the dev env there is no key, so the signing check fails.
  expect(body.ok).toBe(false);
  // The nested check exposes the specific reason.
  expect(body.checks.githubAppSigning.ok).toBe(false);
  expect(body.checks.githubAppSigning.detail).toMatch(/not configured/);
});
