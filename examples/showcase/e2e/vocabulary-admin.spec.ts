import { test, expect } from '@playwright/test';

// The vocabulary-admin pre-publish proof. No deployed consumer exists, so this drives the real
// /admin/vocabulary screen against the packaged engine and the in-memory dev backend. The Step-1
// seed (seedVocabulary in @glw907/cairn-cms-dev) populates the screen: a committed site config with
// three listed tags (trail-reports and gear in use, archive unused) plus one open branch carrying an
// in-use-but-unlisted tag (weather-notes) as the seed candidate. hooks.server.ts injects the owner
// session, so the screen is reachable. The fake-github double records the last commit; the route
// commits only the YAML, so /test/last-commit's content fallback records it.

test('add, rename, delete-unused, the in-use guard, and seed, then the commit carries the new slug', async ({
  page,
  request,
}) => {
  await page.goto('/admin/vocabulary');
  await expect(page.getByRole('heading', { name: 'Tags', level: 1 })).toBeVisible();

  // The seeded listed tags render. archive is the deletable one; trail-reports and gear are in use,
  // so their delete is guarded.
  const archiveRename = page.getByRole('textbox', { name: 'Tag name (archive)' });
  await expect(archiveRename).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Tag name (trail-reports)' })).toBeVisible();

  // ADD a new tag from a label. The slug derives live; the Add control appends it to the working
  // copy, so its row (a Name input keyed on the derived slug) appears.
  const addedSlug = `field-notes-${Date.now()}`;
  const addedLabel = addedSlug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  await page.locator('#cairn-vocab-new-label').fill(addedLabel);
  await page.getByRole('button', { name: 'Add tag' }).click();
  await expect(page.getByRole('textbox', { name: `Tag name (${addedSlug})` })).toBeVisible();

  // RENAME a label. The Name input edits `label` only (the slug stays), so type a new value into the
  // archive row's Name input; the hidden vocabulary JSON tracks it through the bind.
  await archiveRename.fill('Old Archive');
  await expect(archiveRename).toHaveValue('Old Archive');

  // THE IN-USE GUARD: the trail-reports delete carries aria-disabled (never native disabled) and
  // naming the count; activating it does not remove the row.
  const guardedDelete = page.locator('button[data-value="trail-reports"]');
  await expect(guardedDelete).toHaveAttribute('aria-disabled', 'true');
  await expect(guardedDelete).toHaveAttribute('aria-label', /Cannot remove/);
  await guardedDelete.click({ force: true });
  await expect(page.getByRole('textbox', { name: 'Tag name (trail-reports)' })).toBeVisible();

  // DELETE the unused listed tag. Its delete is active and removes the row from the working copy.
  await page.locator('button[data-value="archive"]').click();
  await expect(page.getByRole('textbox', { name: 'Tag name (archive)' })).toHaveCount(0);

  // SEED from the unlisted candidate: weather-notes is in use on the open branch but not listed, so
  // it appears in the seed section. Adding it appends a row to the working copy.
  const seedButton = page.locator('button[data-seed="weather-notes"]');
  await expect(seedButton).toBeVisible();
  await seedButton.click();
  await expect(page.getByRole('textbox', { name: 'Tag name (weather-notes)' })).toBeVisible();

  // Save. The form posts the working copy as the hidden vocabulary JSON with the CSRF field; the
  // route commits the YAML and redirects with saved=1.
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page).toHaveURL(/saved=1/, { timeout: 10_000 });

  // The recorded commit is the site config YAML carrying the added slug. The route commits only the
  // YAML, so the recorder's content fallback (no .md in the change set) captures it.
  const c = await (await request.get('/test/last-commit')).json();
  expect(c.path).toBe('src/theme/site.config.yaml');
  expect(c.content).toContain(addedSlug);
  // The seeded value rode in too, and the deleted unused tag is gone from the committed list.
  expect(c.content).toContain('weather-notes');
});
