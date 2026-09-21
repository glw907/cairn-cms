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

test('at desktop width, the persistent sidebar stays open across an ordinary nav click', async ({
  page,
}) => {
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

test('at mobile width, the drawer still opens on demand and auto-closes after a nav click', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/posts$/);

  const sidebar = page.locator('.drawer-side');
  await expect(sidebar).toBeHidden();

  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(sidebar).toBeVisible();

  await sidebar.getByRole('link', { name: 'Library' }).click();
  await expect(page).toHaveURL(/\/admin\/media$/);
  await expect(sidebar).toBeHidden();
});

// 3. The desk rider (spec §5): a desk route (the edit page) persists its sidebar one breakpoint
//    wider than an office route, at `xl` (1280px) instead of `lg` (1024px), receding behind the
//    toggle through the `lg`-`xl` tablet band and staying an overlay below `lg` as before.

test('at 1440, a desk route persists the sidebar the same as an office route', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/admin/posts/2026-06-hello');
  await expect(page.getByRole('tab', { name: 'Write' })).toBeVisible();

  const drawer = page.locator('.drawer');
  await expect(drawer).toHaveClass(/xl:drawer-open/);
  await expect(page.locator('.drawer-side')).toBeVisible();
  // The toggle stands in for the sidebar once it persists, so it hides rather than dangling beside it.
  await expect(page.getByRole('button', { name: 'Open menu' })).toBeHidden();
});

test('at 768, a desk route recedes the sidebar behind the toggle, same as below lg on an office route', async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto('/admin/posts/2026-06-hello');
  await expect(page.getByRole('tab', { name: 'Write' })).toBeVisible();

  const sidebar = page.locator('.drawer-side');
  await expect(sidebar).toBeHidden();

  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(sidebar).toBeVisible();
});

// 3. Breadcrumb crumbs ellipsized with room to spare. daisyUI 5.7.28 gave `.breadcrumbs` a
//    `margin-inline-start: -.25rem` against a `.breadcrumbs > ul` `padding-inline-start: .25rem`,
//    so the crumb list's content box lost 4px inside a wrapper that sizes to the crumbs. The flex
//    line then overflowed by exactly that 4px and every crumb shrank, which `truncate` turned into
//    an ellipsis: "Posts" read "Pos..." beside free space. The fix cancels only the nav's own
//    margin with `ms-0`, the same opt-out the nav's own `p-0` already makes; the list keeps its
//    padding, the room the first crumb's focus ring needs. Read against the real preview build,
//    since the component project loads the variables-only stylesheet and carries no daisyUI rules.
test('at desktop width, a breadcrumb that fits is not ellipsized', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/admin/posts/2026-06-hello');
  await expect(page.getByRole('tab', { name: 'Write' })).toBeVisible();

  const labels = page.locator('nav[aria-label="Breadcrumb"] li span');
  await expect(labels).toHaveCount(2);
  // scrollWidth past clientWidth is the DOM's own record that `truncate` clipped the label.
  const overflow = await labels.evaluateAll((nodes) =>
    nodes.map((node) => ({
      text: node.textContent,
      overflowing: node.scrollWidth > node.clientWidth,
    })),
  );
  expect(overflow).toEqual([
    { text: 'Posts', overflowing: false },
    { text: '2026-06-hello', overflowing: false },
  ]);
});

// 4. The breadcrumb's own keyboard focus ring needs room on its left side: `.breadcrumbs` scroll-
//    clips (overflow-x: auto), so a ring drawn flush against the nav's left padding-box edge has
//    its left stroke clipped. The list's 4px inline padding (daisyUI's own `.breadcrumbs > ul`
//    rule, kept once `ps-0` was removed from the call site) is what holds that room; this reads
//    the admin sheet's real `:focus-visible` outline-width and outline-offset rather than a fixed
//    pixel count, so the assertion tracks the rule instead of a guess at its values.
test('at desktop width, the first breadcrumb crumb keeps room for its focus ring', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/admin/posts/2026-06-hello');
  await expect(page.getByRole('tab', { name: 'Write' })).toBeVisible();

  const nav = page.locator('nav[aria-label="Breadcrumb"]');
  const firstCrumb = nav.locator('a').first();
  await firstCrumb.focus();
  await expect(firstCrumb).toBeFocused();

  const ring = await firstCrumb.evaluate((node) => {
    const style = getComputedStyle(node);
    return { width: parseFloat(style.outlineWidth), offset: parseFloat(style.outlineOffset) };
  });
  const ringReach = ring.width + ring.offset;

  const navBox = (await nav.boundingBox())!;
  const crumbBox = (await firstCrumb.boundingBox())!;
  expect(crumbBox.x - navBox.x).toBeGreaterThanOrEqual(ringReach);
});
