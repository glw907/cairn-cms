import { test, expect } from '@playwright/test';

// Task 16: the spellcheck feature, end to end against the running showcase. This is the standing
// consumer-build proof for the real spellcheck path: the editor constructs the engine's Web Worker,
// streams the 1.5MB en-US dictionary into wasm, and lints the buffer through the CodeMirror linter,
// all from the PACKAGED dist (the showcase consumes @glw907/cairn-cms via file:../.. and serves dist).
// No worker is stubbed here, unlike the component test; this exercises the delivered package.
//
// The seed entry (fake-github.ts SEED_EDITOR) carries two real misspellings the dictionary flags,
// "recieve" and "teh", so the underlines are deterministic. The spec drives the author path: open the
// entry, see the amber underline, apply a suggestion, then add a word to the personal dictionary and
// watch its underline clear.
//
// hooks.server.ts seeds the editor session, so there is no login step.

// The seed copy-edit entry id (fake-github.ts SEED_EDITOR.id). The body is
// "Please recieve this draft. It has teh same idea." with two flagged words.
const SEED = '2026-06-copyedit';

test('the worker lints the seeded misspellings, a suggestion applies, and an added word clears its underline', async ({
  page,
}) => {
  // The worker streams the 1.5MB en-US dictionary into wasm on first lint, which is slower on CI's
  // runner than Playwright's default 30s test budget allows. Raise the whole-test ceiling so the
  // dictionary load plus the suggestion and add-to-dictionary steps all fit.
  test.setTimeout(90_000);
  await page.goto('/admin');
  await page.locator(`a[href="/admin/posts/${SEED}"]`).click();
  await expect(page).toHaveURL(new RegExp(`/admin/posts/${SEED}$`));

  // The editor is on the Write surface by default. The worker streams the dictionary on first lint,
  // so allow generous time for the two underlines (recieve, teh) to paint.
  const editor = page.locator('.cm-content');
  await expect(editor).toBeVisible();
  const underlines = page.locator('.cm-lintRange-info');
  // The worker streams the 1.5MB dictionary, then the linter paints the underlines in a later frame.
  // A bare toHaveCount can resolve against a transient intermediate count as the decorations settle, so
  // require the count to hold at 2 across consecutive polls. toPass re-runs the inner expect until the
  // editor is quiescent, which is the settle cue this race needs.
  await expect(async () => {
    await expect(underlines).toHaveCount(2);
  }).toPass({ timeout: 60_000 });

  // The underline is the locked amber, wavy: the theme paints --cairn-warning-ink in a wavy style.
  // The admin sheet defines the variable as an oklch color, and the browser reports the computed
  // text-decoration-color in that same space, so compare against the resolved token rather than a
  // hard-coded RGB. The token lives on the [data-theme='cairn-admin'] scope wrapper, never on :root
  // (a load-bearing design-system rule), so resolve it through a probe appended INSIDE the scope (the
  // underline element), which inherits the custom property. Read the probe's computed `color` rather
  // than the raw property string so both sides are the browser's canonical serialization: the authored
  // value ("oklch(50% .13 70)") and the computed decoration color ("oklch(0.5 0.13 70)") are the same
  // color spelled differently. The wavy style is the distinguishing signal that this is the spell
  // underline.
  const decoration = await underlines.first().evaluate((el) => {
    const s = getComputedStyle(el);
    const probe = document.createElement('span');
    probe.style.color = 'var(--cairn-warning-ink)';
    el.appendChild(probe);
    const ink = getComputedStyle(probe).color;
    probe.remove();
    return { color: s.textDecorationColor, style: s.textDecorationStyle, ink };
  });
  expect(decoration.style).toBe('wavy');
  expect(decoration.color).toBe(decoration.ink);

  // Apply a suggestion for "recieve". Hover the underline to open the lint tooltip, then click the
  // top suggestion "receive" (SymSpell ranks the single-transposition fix first). The replace lands
  // as one transaction, so the corrected word appears in the hidden body field.
  const recieve = underlines.filter({ hasText: 'recieve' });
  await recieve.hover();
  const receiveAction = page.locator('.cm-diagnosticAction', { hasText: 'receive' }).first();
  await expect(receiveAction).toBeVisible({ timeout: 10_000 });
  await receiveAction.click();

  const body = page.locator('input[name="body"]');
  await expect(body).toHaveValue(/Please receive this draft/, { timeout: 10_000 });
  // One misspelling fixed, so only "teh" remains underlined.
  await expect(underlines).toHaveCount(1, { timeout: 10_000 });

  // Add the remaining word "teh" to the personal dictionary. The worker now answers "teh" correct,
  // the source re-lints, and the last underline clears. The commit to the dictionary file rides the
  // next save (Task 9); the underline clearing is the in-session proof the add reached the worker.
  const teh = underlines.filter({ hasText: 'teh' });
  await teh.hover();
  const addAction = page.locator('.cm-diagnosticAction', { hasText: 'Add to dictionary' }).first();
  await expect(addAction).toBeVisible({ timeout: 10_000 });
  await addAction.click();
  await expect(underlines).toHaveCount(0, { timeout: 10_000 });
});
