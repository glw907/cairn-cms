import { test, expect } from '@playwright/test';

// This suite drives the shipped ./auth-channel subpath through a real browser against the
// showcase's members login fixture (src/members/channel.ts, docs/guides/add-a-login-channel.md's
// worked exemplar). Each of the five specs below uses its OWN roster contact
// (src/members/channel.ts's MEMBER_ROSTER): this is a requirement, not a convenience. The
// escalation gate and the per-window send ceiling both key on the bare contact identity, so two
// specs sharing a contact would share one budget, and CI's `retries: 2` multiplies whatever a
// spec charges by three. A shared contact across specs would make a later spec's request answer
// `throttled` depending on run order and retry history.
//
// The suite never polls or sleeps waiting for a code. `captureDeliver` records inline, in the
// same request that mints it, so the code is already readable from `/test/last-otp` by the time
// the request action's response comes back. A poll-until-present loop would hide a real
// regression that broke that inline ordering (for example, a future move to a `waitUntil`-only
// dev delivery path).
//
// Assertions go through the rendered UI and the `/test/last-otp` readback route, never the D1
// tables directly: the fixture proves the same surface a consumer's own e2e would exercise.

test.beforeAll(async ({ request }) => {
  // Reset once for the whole file. A locally reused preview server (playwright's
  // `reuseExistingServer`) keeps the channel's D1 tables and the capture map across runs, and
  // this suite's per-contact budgets would otherwise accumulate hour over hour until a request
  // starts answering `throttled`.
  const res = await request.post('/test/reset-members');
  expect(res.ok()).toBe(true);
});

/** One captured delivery, as `/test/last-otp` answers it. */
interface Capture {
  code: string;
  count: number;
}

/** Read the last captured delivery for `contact` via the dev-only readback route. */
async function readCapture(request: import('@playwright/test').APIRequestContext, contact: string): Promise<Capture> {
  const res = await request.get(`/test/last-otp?contact=${encodeURIComponent(contact)}`);
  expect(res.ok()).toBe(true);
  return (await res.json()) as Capture;
}

/** Read back just the code for `contact`, the common case outside the cooldown spec. */
async function readLastCode(request: import('@playwright/test').APIRequestContext, contact: string): Promise<string> {
  return (await readCapture(request, contact)).code;
}

test('golden path: request, confirm, the gated page renders the subject, logout, and the gated page then refuses', async ({
  page,
}) => {
  const contact = 'golden-path@showcase.test';

  await page.goto('/members/login');
  await page.locator('#member-contact').fill(contact);
  await page.getByRole('button', { name: 'Send code' }).click();
  await expect(page.getByRole('status')).toContainText('A code was sent.');

  const code = await readLastCode(page.request, contact);
  await page.locator('#member-code').fill(code);
  await page.getByRole('button', { name: 'Confirm code' }).click();

  await expect(page).toHaveURL(/\/members$/);
  await expect(page.getByText('member-golden-path')).toBeVisible();

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/members\/login$/);

  // The prerender trap: a prerendered gated page would be served as a static asset by the edge,
  // with the Worker (and therefore the auth guard) never running at all, which would answer a
  // plain 200 rather than refuse. Asserting a 303 redirect, not merely a non-200 members page,
  // proves the Worker actually ran the guard.
  const refusal = await page.request.get('/members', { maxRedirects: 0 });
  expect(refusal.status()).toBe(303);
  expect(refusal.headers().location).toContain('/members/login');
});

test('wrong code: the error renders, then the correct code still completes', async ({ page }) => {
  const contact = 'wrong-code@showcase.test';

  await page.goto('/members/login');
  await page.locator('#member-contact').fill(contact);
  await page.getByRole('button', { name: 'Send code' }).click();
  await expect(page.getByRole('status')).toContainText('A code was sent.');

  const code = await readLastCode(page.request, contact);
  const wrongCode = code === '00000000' ? '11111111' : '00000000';

  await page.locator('#member-code').fill(wrongCode);
  await page.getByRole('button', { name: 'Confirm code' }).click();
  await expect(page.getByRole('alert')).toContainText('That code did not work.');
  // A failed action (no redirect) re-renders at the literal POST target, which carries the
  // `?/confirm` action suffix; only a successful confirm's explicit redirect lands on the clean
  // `/members` URL.
  await expect(page).toHaveURL(/\/members\/login/);

  // The right code still completes: the wrong attempt did not consume or invalidate it.
  await page.locator('#member-code').fill(code);
  await page.getByRole('button', { name: 'Confirm code' }).click();
  await expect(page).toHaveURL(/\/members$/);
  await expect(page.getByText('member-wrong-code')).toBeVisible();
});

test('cooldown resend: a second request inside the cooldown still answers sent, and the delivery count stays 1', async ({
  page,
}) => {
  const contact = 'cooldown@showcase.test';

  await page.goto('/members/login');
  await page.locator('#member-contact').fill(contact);
  await page.getByRole('button', { name: 'Send code' }).click();
  await expect(page.getByRole('status')).toContainText('A code was sent.');
  const firstCapture = await readCapture(page.request, contact);
  expect(firstCapture.count).toBe(1);

  // A second request well inside the default 60-second resend cooldown: the request action
  // always answers `sent` (the anti-enumeration discipline never distinguishes a cooldown hit
  // from a fresh delivery), but no new code is actually delivered.
  await page.getByRole('button', { name: 'Resend code' }).click();
  await expect(page.getByRole('status')).toContainText('A code was sent.');

  const secondCapture = await readCapture(page.request, contact);
  expect(secondCapture.count).toBe(1);
  expect(secondCapture.code).toBe(firstCapture.code);
});

test('same-browser discipline: a confirm from a second browser context answers no-pending-request, and the original browser still completes', async ({
  page,
  browser,
}) => {
  const contact = 'cross-browser@showcase.test';

  await page.goto('/members/login');
  await page.locator('#member-contact').fill(contact);
  await page.getByRole('button', { name: 'Send code' }).click();
  await expect(page.getByRole('status')).toContainText('A code was sent.');
  const code = await readLastCode(page.request, contact);

  // A second, cookie-isolated browser context tries to confirm with the objectively RIGHT code.
  // It has never made a request from this contact, so it carries no pending-nonce cookie at all;
  // using the correct code (rather than a wrong one) proves this is the `no-pending-request`
  // refusal, not a `bad-code` one, since a bad code would fail here regardless of context.
  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();
  await otherPage.goto('/members/login');
  await otherPage.locator('#member-code').fill(code);
  await otherPage.getByRole('button', { name: 'Confirm code' }).click();
  await expect(otherPage.getByRole('alert')).toContainText('That code did not work.');
  // A failed action re-renders at the literal `?/confirm` POST target; only a successful
  // confirm's explicit redirect lands on the clean `/members/login` URL.
  await expect(otherPage).toHaveURL(/\/members\/login/);
  await otherContext.close();

  // Back in the originating browser, the same code still confirms: the second context's failed
  // attempt did not consume or invalidate it.
  await page.locator('#member-code').fill(code);
  await page.getByRole('button', { name: 'Confirm code' }).click();
  await expect(page).toHaveURL(/\/members$/);
  await expect(page.getByText('member-cross-browser')).toBeVisible();
});

test('revocation: the test route revokes the caller\'s own session, and the gated page then refuses', async ({
  page,
}) => {
  const contact = 'revocation@showcase.test';

  await page.goto('/members/login');
  await page.locator('#member-contact').fill(contact);
  await page.getByRole('button', { name: 'Send code' }).click();
  await expect(page.getByRole('status')).toContainText('A code was sent.');

  const code = await readLastCode(page.request, contact);
  await page.locator('#member-code').fill(code);
  await page.getByRole('button', { name: 'Confirm code' }).click();
  await expect(page).toHaveURL(/\/members$/);
  await expect(page.getByText('member-revocation')).toBeVisible();

  const revoke = await page.request.post('/test/revoke-member-session');
  expect(revoke.ok()).toBe(true);

  const refusal = await page.request.get('/members', { maxRedirects: 0 });
  expect(refusal.status()).toBe(303);
  expect(refusal.headers().location).toContain('/members/login');
});
