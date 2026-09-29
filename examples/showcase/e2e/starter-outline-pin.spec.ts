import { test, expect, type Page } from '@playwright/test';

// The starter theme's one declared CSS rule (theme.css, "Hairline outlines"): an uncolored
// btn-outline or badge-outline takes a visible hairline edge instead of DaisyUI's stock full-ink
// outline, and a color variant (btn-outline btn-primary) keeps its own colored edge untouched. The
// pin mechanism is a `site-theme` sublayer of `@layer utilities`, mentioned later in the build than
// DaisyUI's own `daisyui` sublayer (theme.css imports the chassis, which activates the DaisyUI
// plugin, before it declares this rule), so a later-declared layer outranks an earlier one
// regardless of selector specificity: the button half needs no `:hover`/`:focus-visible`/`:active`
// selector of its own, because it only ever overrides the `--btn-border` custom property DaisyUI
// itself restates at each of those states, and the later layer always wins that same property.
//
// Each expected color is resolved through the SAME expression the rule declares, painted onto a
// throwaway probe element appended to the page's own document, never a hand-typed serialized
// string: a computed color can otherwise serialize in whatever functional notation the browser
// chooses, so a literal comparison would be guessing at that notation instead of proving the rule.

const HAIRLINE_EXPR = 'color-mix(in oklab, var(--color-base-content) 22%, transparent)';

/**
 * Paint a CSS color expression on a throwaway `<span>` appended to `document.body` and read back
 * its resolved `color`, so a `color-mix()` or `var()` expression is compared against the exact
 * string the browser itself produces for it in this page's cascade.
 */
async function resolveColor(page: Page, expr: string): Promise<string> {
  return page.evaluate((colorExpr) => {
    const probe = document.createElement('span');
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.color = colorExpr;
    document.body.appendChild(probe);
    const resolved = getComputedStyle(probe).color;
    probe.remove();
    return resolved;
  }, expr);
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/styleguide');
  await expect(page.getByRole('heading', { level: 1, name: 'Styleguide' })).toBeVisible();
});

test('an uncolored btn-outline computes the hairline edge at rest, hover, focus-visible, and active', async ({
  page,
}) => {
  const button = page.getByRole('button', { name: 'Outline' });
  await expect(button).toBeVisible();
  const hairline = await resolveColor(page, HAIRLINE_EXPR);

  await expect.poll(() => button.evaluate((el) => getComputedStyle(el).borderColor)).toBe(hairline);

  await button.hover();
  await expect.poll(() => button.evaluate((el) => getComputedStyle(el).borderColor)).toBe(hairline);

  await button.focus();
  await expect(button).toBeFocused();
  await expect(button.evaluate((el) => el.matches(':focus-visible'))).resolves.toBe(true);
  await expect.poll(() => button.evaluate((el) => getComputedStyle(el).borderColor)).toBe(hairline);

  const box = (await button.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(button.evaluate((el) => el.matches(':active'))).resolves.toBe(true);
  await expect.poll(() => button.evaluate((el) => getComputedStyle(el).borderColor)).toBe(hairline);
  await page.mouse.up();
});

test('a color variant, btn-outline btn-primary, keeps its own colored edge', async ({ page }) => {
  // Not on the styleguide page today, so the probe is injected here: an uncolored btn-outline
  // proves the fallback path, and this one proves --btn-color wins the fallback instead.
  await page.evaluate(() => {
    const probe = document.createElement('button');
    probe.id = 'starter-outline-pin-probe';
    probe.className = 'btn btn-outline btn-primary';
    probe.textContent = 'Probe';
    document.body.appendChild(probe);
  });
  const button = page.locator('#starter-outline-pin-probe');
  await expect(button).toBeVisible();

  const primaryEdge = await resolveColor(page, 'var(--color-primary)');
  await expect
    .poll(() => button.evaluate((el) => getComputedStyle(el).borderColor))
    .toBe(primaryEdge);
});

test('an uncolored badge-outline computes the hairline edge', async ({ page }) => {
  const badge = page.getByText('Markdown', { exact: true });
  await expect(badge).toBeVisible();
  const hairline = await resolveColor(page, HAIRLINE_EXPR);
  await expect.poll(() => badge.evaluate((el) => getComputedStyle(el).borderColor)).toBe(hairline);
});
