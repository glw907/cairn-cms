import { test, expect } from '@playwright/test';

// The five-viewport responsive bar (320, 390, 768, 1440, 2560), in both color schemes. Signups
// (the consumer's own custom admin screen, the in-repo proof that a developer's route built on
// the packaged admin toolkit, `@glw907/cairn-cms/admin-toolkit`, meets the family's responsive
// standard the same way the engine's own admin screens do) was the first surface swept across
// this bar; the six motion surfaces below reuse the same array rather than declaring their own.
const WIDTH_BAR = [320, 390, 768, 1440, 2560];

// The SSR theme is selected by the `cairn-admin-theme` COOKIE, not by emulateMedia: the server reads the
// cookie to pick `cairn-admin` vs `cairn-admin-dark` before it renders, while emulateMedia only aligns the
// client-side media-query CSS (prefers-color-scheme) so the painted page matches the SSR choice. The cookie
// origin is derived from the test's `baseURL` fixture so a future preview-port change cannot desync the
// cookie origin from the navigation origin.

// The per-phase visual baseline. A sweep phase that intentionally shifts a surface updates the
// committed snapshot in the same commit; that update is the reviewed record of intended drift.
test('admin office shell — light', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'cairn-admin-theme', value: 'cairn-admin', url: baseURL! }]);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/admin/posts');
  await expect(page).toHaveScreenshot('admin-office-light.png', { fullPage: true });
});

test('admin office shell — dark', async ({ page, context, baseURL }) => {
  await context.addCookies([
    { name: 'cairn-admin-theme', value: 'cairn-admin-dark', url: baseURL! },
  ]);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/admin/posts');
  await expect(page).toHaveScreenshot('admin-office-dark.png', { fullPage: true });
});

// The vocabulary screen, the idiomatic-re-expression pilot. The Step-1 dev seed populates it (the
// listed tags, the in-use counts, the guarded delete, the unlisted seed section), so the baseline
// is the reviewed record of the populated screen, not a blank state.
test('admin vocabulary screen — light', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'cairn-admin-theme', value: 'cairn-admin', url: baseURL! }]);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/admin/vocabulary');
  await expect(page).toHaveScreenshot('vocabulary-light.png', { fullPage: true });
});

test('admin vocabulary screen — dark', async ({ page, context, baseURL }) => {
  await context.addCookies([
    { name: 'cairn-admin-theme', value: 'cairn-admin-dark', url: baseURL! },
  ]);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/admin/vocabulary');
  await expect(page).toHaveScreenshot('vocabulary-dark.png', { fullPage: true });
});

// The auth surfaces, swept in Phase 2 (office chrome). Both are public (isPublicAdminPath) and render
// unconditionally in the showcase: the dev backend mints locals.cairnEditor directly, so the seeded session is
// inert for these pathname-gated routes and there is no redirect to defend against. The login form is the
// unauthenticated entry; the confirm page renders its static "Almost there" state for any token (a GET
// consumes nothing, only the POST verifies), so the token reaches only a hidden input and the screenshot
// is deterministic. The role assertion settles the DOM before the screenshot.
test('admin login page — light', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'cairn-admin-theme', value: 'cairn-admin', url: baseURL! }]);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/admin/login');
  await expect(page.getByRole('button', { name: 'Send sign-in link' })).toBeVisible();
  await expect(page).toHaveScreenshot('auth-login-light.png', { fullPage: true });
});

test('admin login page — dark', async ({ page, context, baseURL }) => {
  await context.addCookies([
    { name: 'cairn-admin-theme', value: 'cairn-admin-dark', url: baseURL! },
  ]);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/admin/login');
  await expect(page.getByRole('button', { name: 'Send sign-in link' })).toBeVisible();
  await expect(page).toHaveScreenshot('auth-login-dark.png', { fullPage: true });
});

test('admin confirm page — light', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'cairn-admin-theme', value: 'cairn-admin', url: baseURL! }]);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/admin/auth/confirm?token=preview-token');
  await expect(page.getByRole('button', { name: 'Confirm sign-in' })).toBeVisible();
  await expect(page).toHaveScreenshot('auth-confirm-light.png', { fullPage: true });
});

test('admin confirm page — dark', async ({ page, context, baseURL }) => {
  await context.addCookies([
    { name: 'cairn-admin-theme', value: 'cairn-admin-dark', url: baseURL! },
  ]);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/admin/auth/confirm?token=preview-token');
  await expect(page.getByRole('button', { name: 'Confirm sign-in' })).toBeVisible();
  await expect(page).toHaveScreenshot('auth-confirm-dark.png', { fullPage: true });
});

// The editors page (ManageEditors), swept in Phase 3 (forms). The dev backend seeds the session owner
// plus one editor, so the table renders real rows; the heading settles the DOM before the screenshot.
test('admin editors page — light', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'cairn-admin-theme', value: 'cairn-admin', url: baseURL! }]);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/admin/editors');
  await expect(page.getByRole('heading', { level: 1, name: 'Editors' })).toBeVisible();
  await expect(page).toHaveScreenshot('admin-editors-light.png', { fullPage: true });
});

test('admin editors page — dark', async ({ page, context, baseURL }) => {
  await context.addCookies([
    { name: 'cairn-admin-theme', value: 'cairn-admin-dark', url: baseURL! },
  ]);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/admin/editors');
  await expect(page.getByRole('heading', { level: 1, name: 'Editors' })).toBeVisible();
  await expect(page).toHaveScreenshot('admin-editors-dark.png', { fullPage: true });
});

// The edit page (desk chrome), swept in Phase 4. The subject is the chrome (the topbar desk cluster, the
// Write/Preview tabs, the format toolbar, the footer environment strip), so the live CodeMirror content is
// masked (it is the walled editor theme, not the swept surface). The Write tab settles the DOM; do not focus
// any chrome element (a focus ring would pollute the captured chrome). The editor mounts unfocused, so no
// caret paints; the mask guards the seeded body text.
test('admin edit page — light', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'cairn-admin-theme', value: 'cairn-admin', url: baseURL! }]);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/admin/posts/2026-06-hello');
  await expect(page.getByRole('tab', { name: 'Write' })).toBeVisible();
  await expect(page).toHaveScreenshot('admin-edit-page-light.png', {
    fullPage: true,
    mask: [page.locator('.cm-content')],
  });
});

test('admin edit page — dark', async ({ page, context, baseURL }) => {
  await context.addCookies([
    { name: 'cairn-admin-theme', value: 'cairn-admin-dark', url: baseURL! },
  ]);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/admin/posts/2026-06-hello');
  await expect(page.getByRole('tab', { name: 'Write' })).toBeVisible();
  await expect(page).toHaveScreenshot('admin-edit-page-dark.png', {
    fullPage: true,
    mask: [page.locator('.cm-content')],
  });
});

// The desk rider's width matrix (spec §5): the edit page persists its sidebar at xl (1280px+) and
// recedes it behind the toggle through the lg-xl tablet band. 1440 sits above the persist
// breakpoint (the sidebar is a visible fixed-position column); 768 sits below it (the sidebar is
// gone, only the toggle remains), the same pair the family's responsive standard already reaches
// for at the office route (admin-shell-sidebar.spec.ts) and the site pages (site-visual.spec.ts).
test('admin edit page — 1440 (sidebar present)', async ({ page, context, baseURL }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await context.addCookies([{ name: 'cairn-admin-theme', value: 'cairn-admin', url: baseURL! }]);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/admin/posts/2026-06-hello');
  await expect(page.getByRole('tab', { name: 'Write' })).toBeVisible();
  await expect(page.locator('.drawer-side')).toBeVisible();
  await expect(page).toHaveScreenshot('admin-edit-page-1440.png', {
    fullPage: true,
    mask: [page.locator('.cm-content')],
  });
});

test('admin edit page — 768 (receded)', async ({ page, context, baseURL }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await context.addCookies([{ name: 'cairn-admin-theme', value: 'cairn-admin', url: baseURL! }]);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/admin/posts/2026-06-hello');
  await expect(page.getByRole('tab', { name: 'Write' })).toBeVisible();
  await expect(page.locator('.drawer-side')).toBeHidden();
  await expect(page).toHaveScreenshot('admin-edit-page-768.png', {
    fullPage: true,
    mask: [page.locator('.cm-content')],
  });
});

// The media library browse view (CairnMediaLibrary grid/triage), swept in Phase 5. The dev backend seeds
// media assets, so the grid renders real tiles; the triage radiogroup settles the DOM before the screenshot.
test('admin media library — light', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'cairn-admin-theme', value: 'cairn-admin', url: baseURL! }]);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/admin/media');
  await expect(page.getByRole('radiogroup', { name: 'Filter assets' })).toBeVisible();
  await expect(page).toHaveScreenshot('admin-media-light.png', { fullPage: true });
});

test('admin media library — dark', async ({ page, context, baseURL }) => {
  await context.addCookies([
    { name: 'cairn-admin-theme', value: 'cairn-admin-dark', url: baseURL! },
  ]);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/admin/media');
  await expect(page.getByRole('radiogroup', { name: 'Filter assets' })).toBeVisible();
  await expect(page).toHaveScreenshot('admin-media-dark.png', { fullPage: true });
});

// The media library slide-over detail panel (CairnMediaLibrary), swept in Phase 6. The panel is the
// non-modal labelled `region` that opens when an asset is selected, so the static browse baseline never
// reaches it; this pair is the reference for the swept slide-over/dialog surface. The triage radiogroup
// settles the grid, clicking the first `option` tile opens the panel, and the `region` (named "… details")
// settles the DOM before the screenshot.
test('admin media detail panel — light', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'cairn-admin-theme', value: 'cairn-admin', url: baseURL! }]);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/admin/media');
  await expect(page.getByRole('radiogroup', { name: 'Filter assets' })).toBeVisible();
  await page.getByRole('option').first().click();
  await expect(page.getByRole('region', { name: /details$/ })).toBeVisible();
  await expect(page).toHaveScreenshot('admin-media-detail-light.png', { fullPage: true });
});

test('admin media detail panel — dark', async ({ page, context, baseURL }) => {
  await context.addCookies([
    { name: 'cairn-admin-theme', value: 'cairn-admin-dark', url: baseURL! },
  ]);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/admin/media');
  await expect(page.getByRole('radiogroup', { name: 'Filter assets' })).toBeVisible();
  await page.getByRole('option').first().click();
  await expect(page.getByRole('region', { name: /details$/ })).toBeVisible();
  await expect(page).toHaveScreenshot('admin-media-detail-dark.png', { fullPage: true });
});

for (const width of WIDTH_BAR) {
  test(`admin signups — light — ${width}px`, async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'cairn-admin-theme', value: 'cairn-admin', url: baseURL! }]);
    await page.setViewportSize({ width, height: 800 });
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/admin/signups');
    await expect(page.getByRole('heading', { level: 1, name: 'Signups' })).toBeVisible();
    await expect(page).toHaveScreenshot(`admin-signups-light-${width}.png`, { fullPage: true });
  });

  test(`admin signups — dark — ${width}px`, async ({ page, context, baseURL }) => {
    await context.addCookies([
      { name: 'cairn-admin-theme', value: 'cairn-admin-dark', url: baseURL! },
    ]);
    await page.setViewportSize({ width, height: 800 });
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/admin/signups');
    await expect(page.getByRole('heading', { level: 1, name: 'Signups' })).toBeVisible();
    await expect(page).toHaveScreenshot(`admin-signups-dark-${width}.png`, { fullPage: true });
  });
}

// The six motion surfaces below, across the same WIDTH_BAR in both themes: the states the pass's
// migrated declarations and new behaviors actually paint, rather than the resting screens above.
// Every state check below runs before the screenshot, so a surface that failed to open still
// fails loudly instead of shipping a baseline of the wrong screen.

// The edit page in zen: Ctrl+Shift+. toggles it at every width (the footer toggle itself is
// hidden on a narrow viewport, so the keyboard chord is the one route that reaches every width in
// this bar). The page settles on the entry heading rather than the Write tab (the plain edit page
// pair's own settle signal): below sm the tab folds into the toolbar's own overflow menu, so it is
// never a tab role at every width this bar sweeps. The floating "Exit zen" chip is zen's own
// settle signal. Unmasked, unlike the plain edit page pair above: zen drops the band entirely, so
// the manuscript's own bounding box grows to meet the fixed zen chip at a narrow width (a mask
// paints its locator's bounding box onto the final image regardless of stacking order, which would
// paint over the chip too); the dev seed's own static "The original body." is what a mask would
// have hidden, not live input.
for (const width of WIDTH_BAR) {
  test(`admin edit page zen — light — ${width}px`, async ({ page, context, baseURL }) => {
    await page.setViewportSize({ width, height: 900 });
    await context.addCookies([{ name: 'cairn-admin-theme', value: 'cairn-admin', url: baseURL! }]);
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/admin/posts/2026-06-hello');
    await expect(page.getByRole('heading', { level: 1, name: 'Hello' })).toBeVisible();
    await page.keyboard.press('ControlOrMeta+Shift+.');
    await expect(page.getByRole('button', { name: /Exit zen/ })).toBeVisible();
    await expect(page).toHaveScreenshot(`admin-edit-zen-light-${width}.png`, { fullPage: true });
  });

  test(`admin edit page zen — dark — ${width}px`, async ({ page, context, baseURL }) => {
    await page.setViewportSize({ width, height: 900 });
    await context.addCookies([
      { name: 'cairn-admin-theme', value: 'cairn-admin-dark', url: baseURL! },
    ]);
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/admin/posts/2026-06-hello');
    await expect(page.getByRole('heading', { level: 1, name: 'Hello' })).toBeVisible();
    await page.keyboard.press('ControlOrMeta+Shift+.');
    await expect(page.getByRole('button', { name: /Exit zen/ })).toBeVisible();
    await expect(page).toHaveScreenshot(`admin-edit-zen-dark-${width}.png`, { fullPage: true });
  });
}

// The drawer open as an overlay: the office shell's own "Open menu" button, below each route's
// persist breakpoint, flips the checkbox that makes the nav an APG modal dialog over the
// document. Above the persist breakpoint the toggle is hidden (the persistent sidebar already
// stands in for it), so the click is conditional on the trigger's own visibility rather than
// forcing a state the shell does not offer at that width. The nav's own text sits on DaisyUI's
// transformed `.drawer-side` layer, whose glyph antialiasing varies a little more between runs
// than an untransformed surface's own (measured up to ~850 of this page's ~280,000 pixels, still
// two orders below a defect footprint); `maxDiffPixels` widens locally to this surface rather than
// raising the suite-wide floor `playwright.config.ts` sets for every other screenshot.
for (const width of WIDTH_BAR) {
  test(`admin drawer overlay — light — ${width}px`, async ({ page, context, baseURL }) => {
    await page.setViewportSize({ width, height: 900 });
    await context.addCookies([{ name: 'cairn-admin-theme', value: 'cairn-admin', url: baseURL! }]);
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/admin/posts');
    const opener = page.getByRole('button', { name: 'Open menu' });
    if (await opener.isVisible()) {
      await opener.click();
      await expect(page.getByRole('dialog', { name: 'Site content' })).toBeVisible();
    }
    await expect(page).toHaveScreenshot(`admin-drawer-overlay-light-${width}.png`, {
      fullPage: true,
      maxDiffPixels: 1000,
    });
  });

  test(`admin drawer overlay — dark — ${width}px`, async ({ page, context, baseURL }) => {
    await page.setViewportSize({ width, height: 900 });
    await context.addCookies([
      { name: 'cairn-admin-theme', value: 'cairn-admin-dark', url: baseURL! },
    ]);
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/admin/posts');
    const opener = page.getByRole('button', { name: 'Open menu' });
    if (await opener.isVisible()) {
      await opener.click();
      await expect(page.getByRole('dialog', { name: 'Site content' })).toBeVisible();
    }
    await expect(page).toHaveScreenshot(`admin-drawer-overlay-dark-${width}.png`, {
      fullPage: true,
      maxDiffPixels: 1000,
    });
  });
}

// The persistent sidebar: the office shell's resting nav at whatever state the width's own
// breakpoint puts it in, distinct from the overlay pair above only in that this one never clicks
// the toggle. `.drawer-side`'s presence in the DOM is unconditional; only its own responsive CSS
// decides whether it reads as the fixed column or the off-canvas overlay this width bar sweeps.
for (const width of WIDTH_BAR) {
  test(`admin sidebar persistent — light — ${width}px`, async ({ page, context, baseURL }) => {
    await page.setViewportSize({ width, height: 900 });
    await context.addCookies([{ name: 'cairn-admin-theme', value: 'cairn-admin', url: baseURL! }]);
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/admin/posts');
    await expect(page.locator('.drawer-side')).toBeAttached();
    await expect(page).toHaveScreenshot(`admin-sidebar-persistent-light-${width}.png`, {
      fullPage: true,
    });
  });

  test(`admin sidebar persistent — dark — ${width}px`, async ({ page, context, baseURL }) => {
    await page.setViewportSize({ width, height: 900 });
    await context.addCookies([
      { name: 'cairn-admin-theme', value: 'cairn-admin-dark', url: baseURL! },
    ]);
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/admin/posts');
    await expect(page.locator('.drawer-side')).toBeAttached();
    await expect(page).toHaveScreenshot(`admin-sidebar-persistent-dark-${width}.png`, {
      fullPage: true,
    });
  });
}

// A dialog open: DeleteDialog, the smallest instance, opened from the edit page's own More
// actions popover. Its role="alertdialog" is the settle signal. Unmasked, unlike the plain edit
// page pair above: the modal-box sits centered over the same screen region the CodeMirror content
// occupies, so masking `.cm-content` here would paint over the dialog itself (a mask paints its
// locator's bounding box onto the final image regardless of stacking order); the sliver of
// manuscript the dialog leaves visible is the dev seed's own static "The original body.", not live
// input, so nothing here is exposed that a mask exists to guard.
for (const width of WIDTH_BAR) {
  test(`admin delete dialog — light — ${width}px`, async ({ page, context, baseURL }) => {
    await page.setViewportSize({ width, height: 900 });
    await context.addCookies([{ name: 'cairn-admin-theme', value: 'cairn-admin', url: baseURL! }]);
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/admin/posts/2026-06-hello');
    await page.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await expect(page).toHaveScreenshot(`admin-delete-dialog-light-${width}.png`, {
      fullPage: true,
    });
  });

  test(`admin delete dialog — dark — ${width}px`, async ({ page, context, baseURL }) => {
    await page.setViewportSize({ width, height: 900 });
    await context.addCookies([
      { name: 'cairn-admin-theme', value: 'cairn-admin-dark', url: baseURL! },
    ]);
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/admin/posts/2026-06-hello');
    await page.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await expect(page).toHaveScreenshot(`admin-delete-dialog-dark-${width}.png`, {
      fullPage: true,
    });
  });
}

// The command palette open: the office shell's own quick jump-to, opened from its band trigger
// (visible at every width in this bar, unlike the desk band's own trigger which folds away below
// sm). The dialog's own aria-label is the settle signal.
for (const width of WIDTH_BAR) {
  test(`admin command palette — light — ${width}px`, async ({ page, context, baseURL }) => {
    await page.setViewportSize({ width, height: 900 });
    await context.addCookies([{ name: 'cairn-admin-theme', value: 'cairn-admin', url: baseURL! }]);
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/admin/posts');
    await page.getByRole('button', { name: /Search or jump to/ }).click();
    await expect(page.getByRole('dialog', { name: 'Commands' })).toBeVisible();
    await expect(page).toHaveScreenshot(`admin-command-palette-light-${width}.png`, {
      fullPage: true,
    });
  });

  test(`admin command palette — dark — ${width}px`, async ({ page, context, baseURL }) => {
    await page.setViewportSize({ width, height: 900 });
    await context.addCookies([
      { name: 'cairn-admin-theme', value: 'cairn-admin-dark', url: baseURL! },
    ]);
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/admin/posts');
    await page.getByRole('button', { name: /Search or jump to/ }).click();
    await expect(page.getByRole('dialog', { name: 'Commands' })).toBeVisible();
    await expect(page).toHaveScreenshot(`admin-command-palette-dark-${width}.png`, {
      fullPage: true,
    });
  });
}

// The media library with a selection: the grid's own per-tile checkbox opens the sticky
// "Selection actions" bar, distinct from the detail slide-over pair above, which opens by
// clicking the tile itself rather than its checkbox.
for (const width of WIDTH_BAR) {
  test(`admin media selected — light — ${width}px`, async ({ page, context, baseURL }) => {
    await page.setViewportSize({ width, height: 900 });
    await context.addCookies([{ name: 'cairn-admin-theme', value: 'cairn-admin', url: baseURL! }]);
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/admin/media');
    await expect(page.getByRole('radiogroup', { name: 'Filter assets' })).toBeVisible();
    await page.getByRole('checkbox').first().check();
    await expect(page.getByRole('region', { name: 'Selection actions' })).toBeVisible();
    await expect(page).toHaveScreenshot(`admin-media-selected-light-${width}.png`, {
      fullPage: true,
    });
  });

  test(`admin media selected — dark — ${width}px`, async ({ page, context, baseURL }) => {
    await page.setViewportSize({ width, height: 900 });
    await context.addCookies([
      { name: 'cairn-admin-theme', value: 'cairn-admin-dark', url: baseURL! },
    ]);
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/admin/media');
    await expect(page.getByRole('radiogroup', { name: 'Filter assets' })).toBeVisible();
    await page.getByRole('checkbox').first().check();
    await expect(page.getByRole('region', { name: 'Selection actions' })).toBeVisible();
    await expect(page).toHaveScreenshot(`admin-media-selected-dark-${width}.png`, {
      fullPage: true,
    });
  });
}

// The zen toggle's frame offset, the pass's only real proof that the persistent-frame margin
// actually animates rather than merely carrying the right CSS on paper. Both tests sample
// `.drawer-content`'s computed margin-left over the toggle window at a fixed cadence; the count of
// distinct values seen is the signal, not any particular frame interval. Neither test screenshots:
// a resting frame either side of the toggle proves nothing about the travel between them.
async function sampleDrawerMarginLeft(page: import('@playwright/test').Page, windowMs: number) {
  const drawerContent = page.locator('.drawer-content');
  const samples = new Set<string>();
  const deadline = Date.now() + windowMs;
  while (Date.now() < deadline) {
    samples.add(await drawerContent.evaluate((el) => getComputedStyle(el).marginLeft));
    await page.waitForTimeout(20);
  }
  return samples;
}

test('admin edit page zen toggle — the frame offset animates through more than two margin-left values', async ({
  page,
  context,
  baseURL,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await context.addCookies([{ name: 'cairn-admin-theme', value: 'cairn-admin', url: baseURL! }]);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/admin/posts/2026-06-hello');
  const zenToggle = page.getByRole('button', { name: 'Zen' });
  await expect(zenToggle).toBeVisible();
  await zenToggle.click();
  const samples = await sampleDrawerMarginLeft(page, 400);
  expect(samples.size).toBeGreaterThan(2);
});

test('admin edit page zen toggle — reduced motion samples at most two margin-left values', async ({
  page,
  context,
  baseURL,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await context.addCookies([{ name: 'cairn-admin-theme', value: 'cairn-admin', url: baseURL! }]);
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.goto('/admin/posts/2026-06-hello');
  const zenToggle = page.getByRole('button', { name: 'Zen' });
  await expect(zenToggle).toBeVisible();
  await zenToggle.click();
  const samples = await sampleDrawerMarginLeft(page, 400);
  expect(samples.size).toBeLessThanOrEqual(2);
});
