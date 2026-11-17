import { test, expect, type Page } from '@playwright/test';
import { parseSiteConfig, readMenu } from '@glw907/cairn-cms';

// Each declared menu has its own screen under /admin/nav/<name>, and saving one writes only that
// menu's key in site.config.yaml.

/** Add one item to the menu on screen, fill it, and save. */
async function addItemAndSave(page: Page, label: string, url: string): Promise<void> {
  await page.getByRole('button', { name: 'Add item' }).first().click();
  await page.locator('input[aria-label="Label"]').last().fill(label);
  await page.locator('input[aria-label="URL"]').last().fill(url);
  await page.getByRole('button', { name: 'Save navigation' }).click();
}

/** The rows the menu screen shows, as label and url pairs. */
async function rowsOnScreen(page: Page): Promise<{ label: string; url: string }[]> {
  const labels = await page
    .locator('input[aria-label="Label"]')
    .evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value));
  const urls = await page
    .locator('input[aria-label="URL"]')
    .evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value));
  return labels.map((label, i) => ({ label, url: urls[i] ?? '' }));
}

test('moving between menus client-side shows the other menu, not the first menu rows', async ({
  page,
}) => {
  await page.goto('/admin/nav/primary');
  await expect(page.getByRole('heading', { name: 'Navigation', level: 1 })).toBeVisible();
  await addItemAndSave(page, 'Trails', '/trails');
  await expect(page).toHaveURL(/\/admin\/nav\/primary\?saved=1$/);
  await expect(page.locator('input[aria-label="Label"]').last()).toHaveValue('Trails');

  await page.getByRole('link', { name: 'Action links' }).click();
  await expect(page).toHaveURL(/\/admin\/nav\/actions$/);
  await expect(page.getByRole('heading', { name: 'Action links', level: 1 })).toBeVisible();
  const labels = (await rowsOnScreen(page)).map((r) => r.label);
  expect(labels).not.toContain('Trails');
});

test('each declared menu opens by name, saves under its own key, and an unknown name is a 404', async ({
  page,
  request,
}) => {
  // The dev store's seeded site config declares no menus, so give primary a row first: then "an
  // actions save leaves primary alone" compares real content, read back from its own screen.
  await page.goto('/admin/nav/primary');
  await expect(page.getByRole('heading', { name: 'Navigation', level: 1 })).toBeVisible();
  await addItemAndSave(page, 'Trails', '/trails');
  await expect(page).toHaveURL(/\/admin\/nav\/primary\?saved=1$/);
  await expect(page.locator('input[aria-label="Label"]').last()).toHaveValue('Trails');
  const primaryRows = await rowsOnScreen(page);
  expect(primaryRows.length).toBeGreaterThan(0);

  await page.goto('/admin/nav/actions');
  await expect(page.getByRole('heading', { name: 'Action links', level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add item' }).first()).toBeVisible();
  const actionsBefore = await rowsOnScreen(page);
  await addItemAndSave(page, 'Visit us', '/about');
  await expect(page).toHaveURL(/\/admin\/nav\/actions\?saved=1$/);

  await expect(async () => {
    const commit = await (await request.get('/test/last-commit')).json();
    expect(commit.path).toBe('src/site/site.config.yaml');
    const config = parseSiteConfig(commit.content);
    expect(readMenu(config, 'actions', 1)).toEqual([
      ...actionsBefore,
      { label: 'Visit us', url: '/about' },
    ]);
    const primary = readMenu(config, 'primary', 2).map((n) => ({
      label: n.label,
      url: n.url ?? '',
    }));
    expect(primary).toEqual(primaryRows);
  }).toPass({ timeout: 15_000 });

  const unknown = await page.goto('/admin/nav/nope');
  expect(unknown?.status()).toBe(404);
});
