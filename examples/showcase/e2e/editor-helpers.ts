import { expect, type Page } from '@playwright/test';

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
