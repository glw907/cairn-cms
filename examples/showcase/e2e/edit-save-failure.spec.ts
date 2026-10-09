import { test, expect, type Page, type Route } from '@playwright/test';
import { stringify } from 'devalue';

// A failed save keeps the writing. The edit form submits through the enhanced path: a failure the
// server answers renders in place, a network or non-JSON failure leaves the editor untouched, and
// neither shows "Saved" or loses the text. Every forged answer here comes from page.route, so no
// failing spec ever commits to the fake GitHub double or touches the personal dictionary file.
//
// hooks.server.ts seeds the editor session, so there is no login step. Each test opens the seed
// entry from ?saved=1 so the page starts in the state a "Saved" flash would lie about.

const ENTRY = '/admin/posts/2026-06-hello?saved=1';
const TYPED = 'Words that must survive a failed save.';

/** The word "Saved" as its own word; "Unsaved changes" must not count. */
const SAVED = /\bSaved\b/;

/** A SvelteKit action envelope for a `fail()` result, the shape the client deserializes. */
function failureEnvelope(status: number, data: Record<string, unknown>): string {
  return JSON.stringify({ type: 'failure', status, data: stringify(data) });
}

/** Match a request to the edit form's action by the `?/<name>` search, however it is suffixed. */
function actionUrl(name: string): (url: URL) => boolean {
  return (url) => url.search.startsWith(`?/${name}`);
}

/** The visible alert strip carrying a message; the screen-reader live region repeats it, so a bare text match finds two. */
function alertWith(page: Page, text: string | RegExp) {
  return page.locator('.alert', { hasText: text });
}

/** Open the seed entry from ?saved=1, type over the body, and confirm the editor took it. */
async function openAndType(page: Page): Promise<void> {
  await page.goto(ENTRY);
  await expect(page.getByText(SAVED).first()).toBeVisible();
  const editor = page.locator('.cm-content');
  await expect(editor).toBeVisible();
  await editor.click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type(TYPED);
  await expect(page.locator('input[name="body"]')).toHaveValue(TYPED, { timeout: 2000 });
  await expect(page.locator('.navbar .cairn-save-state')).toContainText('Unsaved changes');
}

/** Fail every load request, and count how many the page attempts. */
async function failLoads(page: Page): Promise<() => number> {
  let loads = 0;
  await page.route('**/__data.json*', (route) => {
    loads++;
    return route.abort();
  });
  return () => loads;
}

/** The state every failure leaves behind: text intact, no "Saved", Save enabled, nothing replaced. */
async function expectWritingKept(page: Page): Promise<void> {
  await expect(page.locator('input[name="body"]')).toHaveValue(TYPED);
  await expect(page.locator('.cm-content')).toContainText(TYPED);
  await expect(page.getByText(SAVED)).toHaveCount(0);
  await expect(page.locator('.navbar .cairn-save-state')).toContainText('Unsaved changes');
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeEnabled();
}

/** Click an in-app link and report the leave guard's prompt, dismissing it so the page stays. */
async function expectLeaveGuardPrompts(page: Page): Promise<void> {
  let message = '';
  page.once('dialog', (dialog) => {
    message = dialog.message();
    void dialog.dismiss();
  });
  await page.locator('a[href="/admin/posts"]').first().click();
  await expect.poll(() => message).toContain('unsaved changes');
  // A cancelled navigation leaves the page where it was.
  expect(page.url()).toContain('/admin/posts/2026-06-hello');
}

test('a 500 failure keeps the text, shows the message, never shows Saved, and a retry saves', async ({
  page,
}) => {
  const loads = await failLoads(page);
  await openAndType(page);

  const message = 'We could not save just now. Your text is still here.';
  // unroute matches the handler by reference, so the matcher is built once.
  const saveRequest = actionUrl('save');
  await page.route(saveRequest, (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: failureEnvelope(500, { error: message }),
    }),
  );
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  await expect(alertWith(page, message)).toBeVisible();
  await expectWritingKept(page);
  expect(loads()).toBe(0);
  await expectLeaveGuardPrompts(page);

  // The same text goes through once the server answers: a retry ends in a document load that
  // reads "Saved".
  await page.unroute(saveRequest);
  await page.unroute('**/__data.json*');
  const reloaded = page.waitForEvent('load');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await reloaded;
  await expect(page).toHaveURL(/saved=1/);
  await expect(page.locator('.navbar .cairn-save-state')).toHaveText('Saved');
});

test('a 409 failure that echoes the body still reads as unsaved', async ({ page }) => {
  await openAndType(page);

  await page.route(actionUrl('save'), (route) =>
    route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: failureEnvelope(409, {
        error: 'Someone else saved this entry first.',
        body: TYPED,
      }),
    }),
  );
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  await expect(alertWith(page, 'Someone else saved this entry first.')).toBeVisible();
  await expect(page.locator('.navbar .cairn-save-state')).toContainText('Unsaved changes');
  await expectWritingKept(page);
  await expectLeaveGuardPrompts(page);
});

test('a network failure keeps the text, shows no Saved, and leaves Save enabled', async ({
  page,
}) => {
  await openAndType(page);

  await page.route(actionUrl('save'), (route) => route.abort('connectionreset'));
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  await expect(alertWith(page, /your text is still here/i)).toBeVisible();
  await expectWritingKept(page);
  await expect(page).toHaveURL(/\/admin\/posts\/2026-06-hello/);
  await expectLeaveGuardPrompts(page);
});

test('a non-JSON answer keeps the text the same way a network failure does', async ({ page }) => {
  await openAndType(page);

  await page.route(actionUrl('save'), (route) =>
    route.fulfill({
      status: 403,
      contentType: 'text/html',
      body: '<p>Cross-site POST refused</p>',
    }),
  );
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  await expect(alertWith(page, /your text is still here/i)).toBeVisible();
  await expectWritingKept(page);
  await expectLeaveGuardPrompts(page);
});

test('a publish answered with a 500 failure leaves Publish enabled and the text intact', async ({
  page,
}) => {
  await openAndType(page);

  await page.route(actionUrl('publish'), (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: failureEnvelope(500, { error: 'We could not publish just now.' }),
    }),
  );
  const publish = page.getByRole('button', { name: 'Publish', exact: true });
  await expect(publish).toBeEnabled();
  await publish.click();

  await expect(alertWith(page, 'We could not publish just now.')).toBeVisible();
  await expect(publish).toBeEnabled();
  await expect(publish).toHaveText('Publish');
  await expectWritingKept(page);
});

test('a pending dictionary word commits before the save or publish request is sent', async ({
  page,
}) => {
  test.setTimeout(90_000);
  // The seed copy-edit entry carries two real misspellings ("recieve", "teh"), so the underlines
  // are deterministic. Fixing one makes the page dirty; adding the other leaves a word pending.
  await page.goto('/admin/posts/2026-06-copyedit');
  const underlines = page.locator('.cm-lintRange-info');
  await expect(async () => {
    await expect(underlines).toHaveCount(2);
  }).toPass({ timeout: 60_000 });

  const popover = page.locator('.cairn-cm-suggest');
  await underlines.filter({ hasText: 'recieve' }).click();
  await popover.getByRole('button', { name: 'receive' }).first().click();
  await expect(underlines).toHaveCount(1, { timeout: 10_000 });
  await underlines.filter({ hasText: 'teh' }).click();
  await popover.getByRole('button', { name: 'Add to dictionary' }).click();
  await expect(underlines).toHaveCount(0, { timeout: 10_000 });

  // Hold the dictionary commit and record the order of everything that follows. Neither the
  // commit nor the save reaches the real server, so the spellcheck spec's seed stays untouched.
  const order: string[] = [];
  let releaseDictionary!: (route: Route) => void;
  const held = new Promise<Route>((resolve) => (releaseDictionary = resolve));
  await page.route(actionUrl('dictionaryAdd'), (route) => {
    order.push('dictionaryAdd');
    releaseDictionary(route);
  });
  await page.route(actionUrl('save'), (route) => {
    order.push('save');
    return route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: failureEnvelope(500, { error: 'Held save answered.' }),
    });
  });
  await page.route(actionUrl('publish'), (route) => {
    order.push('publish');
    return route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: failureEnvelope(500, { error: 'Held publish answered.' }),
    });
  });

  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const dictionaryRoute = await held;
  // The commit is in flight and unanswered. A request sent in the meantime is the fire-and-forget
  // bug, so give it time to show itself before asserting it did not.
  await page.waitForTimeout(1000);
  expect(order).toEqual(['dictionaryAdd']);
  await expect(page.getByRole('button', { name: /Saving/ })).toBeDisabled();

  await dictionaryRoute.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ type: 'success', status: 200, data: stringify({ words: ['teh'] }) }),
  });
  await expect(alertWith(page, 'Held save answered.')).toBeVisible();
  expect(order).toEqual(['dictionaryAdd', 'save']);
});
