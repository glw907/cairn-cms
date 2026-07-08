import { test, expect } from '@playwright/test';

// Two production defects in the admin shell (CairnAdminShell.svelte), reproduced and regression-
// guarded here against the real preview build, not a mock.
//
// 1. Scroll bleed: at desktop width the sidebar rode `position: sticky`, computed relative to
//    document-level scroll. A host that omits Preflight (cairn's own embed-anywhere default) leaves
//    the UA's default body margin in place, so the whole shell sat a few px off the viewport origin;
//    sticky's "before it sticks" travel is computed from that offset, so the sidebar visibly moved a
//    few px at the top and bottom of a page scroll. The fix (cairn-admin.css) overrides daisyUI's own
//    `position: sticky` with `position: fixed` for the persistent desktop sidebar, the same mechanism
//    the mobile overlay variant already used, which is anchored to the viewport outright and carries
//    no such drift.
// 2. Sidebar auto-collapse on navigate: `isDeskRoute` classified any three-segment `/admin` path as
//    an open document and receded the persistent desktop sidebar, but a developer's own custom nav
//    can be just as deep (a section entry like `/admin/club/events`) without being a document editor.
//    Navigating to a route that merely happened to sit three segments deep receded the sidebar to the
//    mobile toggle-controlled overlay, which read as the sidebar sliding away at desktop width. The
//    fix requires the second segment to name a real content concept before treating a route as a desk.

test('at desktop width, scrolling a long entry list never moves the sidebar', async ({ page }) => {
  // A short viewport (matching one of the family's five-viewport bar) forces the seeded posts list
  // to overflow the viewport, so the document itself has real scroll range.
  await page.setViewportSize({ width: 1440, height: 400 });
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/posts$/);

  const sidebar = page.locator('.drawer-side');
  const before = await sidebar.boundingBox();

  // Ten ticks comfortably scrolls past the seeded post list's own height and to the very bottom of
  // the document, the full range across which the sidebar's old sticky math could drift.
  for (let i = 0; i < 10; i += 1) {
    await page.mouse.wheel(0, 150);
  }
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

  const after = await sidebar.boundingBox();
  expect(after!.y).toBe(before!.y);
  expect(after!.x).toBe(before!.x);
});

test('at desktop width, the persistent sidebar stays open across an ordinary nav click', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/posts$/);

  const drawer = page.locator('.drawer');
  await expect(drawer).toHaveClass(/lg:drawer-open/);

  await page.locator('.drawer-side').getByRole('link', { name: 'Library' }).click();
  await expect(page).toHaveURL(/\/admin\/media$/);
  await expect(drawer).toHaveClass(/lg:drawer-open/);
  await expect(page.locator('.drawer-side')).toBeVisible();
});

test('at mobile width, the drawer still opens on demand and auto-closes after a nav click', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/posts$/);

  const sidebar = page.locator('.drawer-side');
  await expect(sidebar).toBeHidden();

  await page.locator('label[for="cairn-shell-drawer"][aria-label="Open menu"]').click();
  await expect(sidebar).toBeVisible();

  await sidebar.getByRole('link', { name: 'Library' }).click();
  await expect(page).toHaveURL(/\/admin\/media$/);
  await expect(sidebar).toBeHidden();
});
