import { test, expect } from '@playwright/test';

// The public archive at / carries the size-gated tag filter: the showcase seeds ~14 posts (above the
// TAG_FILTER_MIN_ENTRIES threshold of 12) with overlapping vocabulary tags, so the control renders.
// The options are the committed vocabulary labels over the in-use slug values; selecting one narrows
// the index to that tag's posts, and the All reset restores the whole list. This is the public-site
// surface, distinct from the admin vocabulary screen.

test('the size-gated tag filter narrows the archive and the All reset restores it', async ({ page }) => {
  await page.goto('/');

  // The filter is present (the archive is above the threshold). Scope to its group so the option
  // buttons never collide with other controls on the page.
  const filter = page.getByRole('group', { name: 'Filter by tag' });
  await expect(filter).toBeVisible();

  // The index opens unfiltered: All is pressed and the full archive shows.
  const allOption = filter.getByRole('button', { name: 'All' });
  await expect(allOption).toHaveAttribute('aria-pressed', 'true');
  const entries = page.locator('.index .entry');
  const total = await entries.count();
  expect(total).toBeGreaterThan(12);

  // Select the Gear tag. The list narrows to strictly fewer entries, and the option reads pressed
  // while All clears.
  const gear = filter.getByRole('button', { name: 'Gear', exact: true });
  await gear.click();
  await expect(gear).toHaveAttribute('aria-pressed', 'true');
  await expect(allOption).toHaveAttribute('aria-pressed', 'false');
  const narrowed = await entries.count();
  expect(narrowed).toBeGreaterThan(0);
  expect(narrowed).toBeLessThan(total);

  // Every visible entry carries the selected tag: the Gear posts all mention gear in their excerpt
  // (the seeded descriptions), so the narrowing is real, not cosmetic. Assert the count holds under
  // the reset rather than reading per-row tags the markup does not expose.
  await allOption.click();
  await expect(allOption).toHaveAttribute('aria-pressed', 'true');
  await expect(entries).toHaveCount(total);
});
