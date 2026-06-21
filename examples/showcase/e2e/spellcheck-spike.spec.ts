import { test, expect } from '@playwright/test';

// Task 1, the spellcheck delivery go/no-go spike. It proves that a Web Worker plus a wasm module plus
// a 1.5MB dictionary survive the real consumer build: the showcase consumes @glw907/cairn-cms via
// file:../.. and serves dist, so this asserts delivery from the PACKAGED dist, not from src. The page
// constructs the engine's worker the dynamic-import way CodeMirror is loaded, points it at the wasm
// and dictionary the consumer build resolved out-of-bundle, and round-trips a check and a suggest.
test('the spellcheck worker constructs, the dictionary loads, and check/suggest round-trip in the built showcase', async ({
  page,
}) => {
  await page.goto('/spike/spellcheck');

  // The worker streams the 1.5MB dictionary into wasm memory on first init, so allow generous time.
  await expect(page.getByTestId('ready')).toHaveText('yes', { timeout: 30_000 });
  await expect(page.getByTestId('status')).toHaveText('ready');
  await expect(page.getByTestId('error-detail')).toHaveText('');

  // Both assets resolved to emitted out-of-bundle URLs, the fetched-asset delivery the budget needs.
  await expect(page.getByTestId('wasm-url')).toHaveText(/\.wasm/);
  await expect(page.getByTestId('dictionary-url')).toHaveText(/\.txt/);

  // The check protocol: a batch of { id, word } answered by { id, correct }. "hello" is correct,
  // "wrold" is not, so the verdict is keyed to the word and not a constant.
  const checkRaw = await page.getByTestId('check-result').textContent();
  expect(checkRaw).toBeTruthy();
  const checked = JSON.parse(checkRaw ?? '[]') as Array<{ id: number; correct: boolean }>;
  const byId = new Map(checked.map((entry) => [entry.id, entry.correct]));
  expect(byId.get(1)).toBe(true);
  expect(byId.get(2)).toBe(false);

  // The suggest protocol: one word in, a ranked replacement list out. SymSpell ranks "world" first
  // for "wrold" (a single transposition), so it leads the list.
  const suggestRaw = await page.getByTestId('suggest-result').textContent();
  expect(suggestRaw).toBeTruthy();
  const suggestions = JSON.parse(suggestRaw ?? '[]') as string[];
  expect(suggestions.length).toBeGreaterThan(0);
  expect(suggestions).toContain('world');
});
