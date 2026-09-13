import { test, expect, type Page } from '@playwright/test';

// The end-to-end proof of the custom-admin-screen seam (Plan 1). The cms-dev handle mints an owner
// editor and supplies a fake APP_DB on platform.env, so the create-then-delete round-trips through
// the developer's own binding. The fake APP_DB is process-global, so a row added on one request is
// visible on the next; a unique signup name per run keeps the assertions exact under Playwright's
// CI retries (a retry shares the running server, so a fixed name would accumulate duplicate rows).

/** Submits the create form with a fresh, unique name and returns that name. */
async function addSignup(page: Page, label: string): Promise<string> {
  const name = `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await page.fill('input[name="name"]', name);
  await page.fill('input[name="email"]', `${label.toLowerCase()}@test`);
  await page.getByRole('button', { name: 'Add' }).click();
  // Exact match: the actions cell's own accessible name is composed from its Delete button's
  // label, which also contains this name, so a substring match would resolve two cells.
  await expect(page.getByRole('cell', { name, exact: true })).toBeVisible();
  return name;
}

test('a custom admin screen renders in the shell, reads identity, and writes its own D1', async ({
  page,
}) => {
  await page.goto('/admin/signups');
  // The registered navLayout entry renders as a sidebar link inside the shared shell. Scope to the
  // sidebar nav: the same href also resolves in the command palette (which maps the nav items), so a
  // bare locator would match two real elements.
  await expect(
    page.getByRole('navigation', { name: 'Site content' }).getByRole('link', { name: 'Signups' }),
  ).toBeVisible();
  // The custom screen's own content renders inside that shell.
  await expect(page.getByRole('heading', { name: 'Signups' })).toBeVisible();
  // The bare CsrfField renders the shell's context token, so the create form round-trips. The dev
  // handle replaces the real guard, so this proves the token plumbing, not the guard's rejection
  // path; the guard's fail-closed CSRF and owner checks are covered in src/tests/unit/guard.test.ts.
  const name = await addSignup(page, 'Ada');
  const row = page.getByRole('row', { name: new RegExp(name) });
  // The owner-gated destructive action removes that row, gated behind the shared alertdialog: the
  // click opens the confirm rather than posting directly, so the row survives until confirmed.
  await row.getByRole('button', { name: new RegExp(`Delete ${name}`) }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('cell', { name })).toHaveCount(0);
});

test("the shell's global logout action targets the absolute catch-all path from a custom route", async ({
  page,
}) => {
  await page.goto('/admin/signups');
  await expect(page.locator('form[action="/admin?/logout"]')).toHaveCount(1);
});

test('the signups form fields resolve their accessible name through a visible label', async ({
  page,
}) => {
  await page.goto('/admin/signups');
  const nameLabel = page.locator('label').filter({ hasText: 'Name' });
  const emailLabel = page.locator('label').filter({ hasText: 'Email' });
  await expect(page.getByLabel('Name')).toBeVisible();
  await expect(nameLabel).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(emailLabel).toBeVisible();
  // toBeVisible() alone passes for an sr-only label too, since Playwright's visibility test is a
  // non-empty bounding box and Tailwind's sr-only clip rect is 1x1. A rendered box taller than that
  // clip rect is what actually discriminates a visible stacked label from an sr-only one.
  const nameBox = await nameLabel.boundingBox();
  expect(nameBox?.height ?? 0).toBeGreaterThan(8);
  const emailBox = await emailLabel.boundingBox();
  expect(emailBox?.height ?? 0).toBeGreaterThan(8);
});

test('the signups outcome region is mounted empty on first load and announces a create failure', async ({
  page,
}) => {
  await page.goto('/admin/signups');
  const outcome = page.getByRole('status');
  await expect(outcome).toBeAttached();
  await expect(outcome).toBeEmpty();
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(outcome).not.toBeEmpty();
  // Discriminates the failure path from either success outcome, since not.toBeEmpty() alone
  // passes for any content, including a success sentence.
  await expect(outcome).not.toHaveText(/Signup (added|removed)\./);
});

test("each row's Delete trigger names its own signup", async ({ page }) => {
  await page.goto('/admin/signups');
  const first = await addSignup(page, 'Grace');
  const second = await addSignup(page, 'Hedy');
  // Exact-match locators built from each row's own name: a substring match would let a shared
  // label pass, so this proves the two triggers carry genuinely different accessible names.
  await expect(page.getByRole('button', { name: `Delete ${first}`, exact: true })).toHaveCount(1);
  await expect(page.getByRole('button', { name: `Delete ${second}`, exact: true })).toHaveCount(1);
});

test('a row survives until the confirm dialog is accepted', async ({ page }) => {
  await page.goto('/admin/signups');
  const name = await addSignup(page, 'Katherine');
  const row = page.getByRole('row', { name: new RegExp(name) });
  await row.getByRole('button', { name: new RegExp(`Delete ${name}`) }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  // The row is still in the DOM: the click opened the confirm, it did not post the removal.
  // Exact match for the same reason addSignup uses one: the actions cell's own name also
  // contains this signup's name.
  await expect(page.getByRole('cell', { name, exact: true })).toHaveCount(1);
  await dialog.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('cell', { name })).toHaveCount(0);
});

test('exactly one alertdialog exists regardless of row count', async ({ page }) => {
  await page.goto('/admin/signups');
  await addSignup(page, 'Margaret');
  await addSignup(page, 'Radia');
  await expect(page.locator('[role="alertdialog"]')).toHaveCount(1);
});
