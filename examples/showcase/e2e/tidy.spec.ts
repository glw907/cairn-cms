import { test, expect } from '@playwright/test';

// Task 16: the tidy feature, end to end against the running showcase. The model call is stubbed
// deterministically (fake-anthropic.ts returns a canned correction for the seed entry's body), the
// way the media specs use fixed bytes, so the diff and the review are stable. The tidy block is
// enabled in site.config.yaml and the fake admin env carries a dummy ANTHROPIC_API_KEY so the action
// builds the (stubbed) client instead of refusing.
//
// The seed entry (fake-github.ts SEED_EDITOR) body is
//   "Please recieve this draft. It has teh same idea."
// and the canned correction fixes the two misspellings:
//   "Please receive this draft. It has the same idea."
// so the review shows two single-word hunks.
//
// hooks.server.ts seeds the editor session, so there is no login step.

const SEED = '2026-06-copyedit';
const CORRECTED = 'Please receive this draft. It has the same idea.';

test('tidy returns the stubbed correction, the review opens, and accepting applies it to the buffer', async ({
  page,
}) => {
  await page.goto('/admin');
  await page.locator(`a[href="/admin/posts/${SEED}"]`).click();
  await expect(page).toHaveURL(new RegExp(`/admin/posts/${SEED}$`));

  // The editor is on the Write surface by default; the Tidy control sits in the toolbar.
  await expect(page.locator('.cm-content')).toBeVisible();

  // Run tidy. The action posts the buffer to ?/tidy, the stub returns the canned correction, the
  // client diffs it and opens the review dialog.
  await page.getByRole('button', { name: 'Tidy', exact: true }).click();
  const review = page.getByTestId('tidy-review');
  await expect(review).toBeVisible({ timeout: 15_000 });
  // Two single-word hunks (recieve -> receive, teh -> the).
  await expect(review).toContainText('2 changes');

  // Accept every fix, then apply. "Accept fixes" keeps all hunks; "Apply N changes" writes the kept
  // hunks into the buffer as one transaction and closes the review.
  await review.getByRole('button', { name: 'Accept fixes' }).click();
  await review.getByRole('button', { name: /Apply \d+ change/ }).click();
  await expect(review).toBeHidden({ timeout: 10_000 });

  // The corrected text is in the editor (the hidden body field mirrors the buffer). The seeded body
  // ends with a trailing newline the editor preserves, so match the corrected line within the value.
  const body = page.locator('input[name="body"]');
  await expect(body).toHaveValue(new RegExp(CORRECTED.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), {
    timeout: 10_000,
  });
});
