import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Wait until hydration has attached a delegated `onclick` to the element.
 *
 * Svelte 5 stores a delegated handler in a map on the element under a symbol key
 * (`element[event_symbol].click`, `delegated()` in `internal/client/dom/elements/events.js`).
 * Server-rendered markup is visible and actionable before that assignment, so a click at first
 * actionability on a loaded page can land on a dead element. A non-delegated handler such as
 * `onchange` is attached the same hydration step but is not visible to this probe, so wait on an
 * element that also carries an `onclick`.
 * @param target - The element whose `onclick` must be attached.
 */
export async function awaitClickHandler(target: Locator): Promise<void> {
  await expect
    .poll(() =>
      target.evaluate((el) =>
        Object.getOwnPropertySymbols(el).some(
          (s) =>
            typeof (el as unknown as Record<symbol, { click?: unknown }>)[s]?.click === 'function',
        ),
      ),
    )
    .toBe(true);
}

/**
 * Click an element once hydration has attached its delegated `onclick`.
 *
 * It adds no re-click and replaces no assertion.
 * @param target - The element to click.
 */
export async function clickWhenHydrated(target: Locator): Promise<void> {
  await awaitClickHandler(target);
  await target.click();
}

/**
 * Open the header's create dialog and return it, clicking again until it is open.
 *
 * The button's `onclick` attaches on hydration, and the markup shows about 130 ms before that,
 * so a click on a freshly loaded page can land on a dead button and leave the dialog hidden.
 * Each pass checks whether the dialog is open before it clicks, since a re-click behind an open
 * modal cannot land. Every line after this call therefore runs on a hydrated page. The retry
 * ends at 15 seconds, so a dialog that never opens still fails here.
 * @param page - The page showing the header.
 * @param name - The header button's accessible name.
 */
export async function openCreateDialog(page: Page, name = 'New post'): Promise<Locator> {
  const button = page.locator('header').getByRole('button', { name });
  const dialog = page.locator('dialog[aria-labelledby="cairn-create-dialog-title"]');
  let attempt = 0;
  await expect(async () => {
    const isOpen = await dialog.evaluate((d) => (d as HTMLDialogElement).open, undefined, {
      timeout: 1000,
    });
    if (!isOpen) {
      attempt += 1;
      const handler = await button.evaluate(
        (el) => Object.getOwnPropertySymbols(el).length > 0,
        undefined,
        { timeout: 1000 },
      );
      await button.click({ timeout: 2000 });
      const opened = await dialog.evaluate((d) => (d as HTMLDialogElement).open, undefined, {
        timeout: 1000,
      });
      console.log(`[create-dialog-trace] attempt=${attempt} handler=${handler} opened=${opened}`);
    }
    await expect(dialog).toBeVisible({ timeout: 500 });
  }).toPass({ timeout: 15_000 });
  return dialog;
}

/**
 * Fill the editor's title input on a freshly opened entry and assert the value took.
 *
 * The editor mounts CodeMirror only once the page has hydrated, so waiting for `.cm-content`
 * is the readiness signal: a `fill` issued before it can be reset by hydration between the
 * select-all and the insert, which doubles the title. The closing `toHaveValue` makes a
 * doubled title fail here rather than leak a mis-titled post into later specs.
 * @param page - The page showing the editor.
 * @param title - The exact title the input must hold afterwards.
 */
export async function fillTitleWhenHydrated(page: Page, title: string): Promise<void> {
  await expect(page.locator('.cm-content')).toBeVisible();
  const titleInput = page.locator('input[name="title"]');
  await titleInput.fill(title);
  await expect(titleInput).toHaveValue(title);
}
