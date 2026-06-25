import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// The /styleguide a11y proof. The styleguide is the single demo surface that shows the public theme:
// every color token, the type scale, the real reading surface, and the component set. Baking the
// accessibility floor in is a B2 differentiator (the field ships baseline-only), so this spec runs
// axe (WCAG 2 A/AA) over the styleguide in BOTH color schemes and over a real article, then proves the
// skip link and reduced-motion floors hold. If axe finds a real violation the fix is in the
// theme/components/engine render, never a suppressed rule.
//
// Media emulation is done per test with page.emulateMedia rather than test.use: the project's
// playwright.config has a webServer-only `use` and the context-level color-scheme/reduced-motion
// options do not reach the page here, so the explicit per-page call is the reliable lever.
//
// WCAG 2.0/2.1 levels A and AA are the gated tag set. The contrast rules ride in: the dual-gamut
// `check:public-tokens` gate proves the token pairs clear AA by math, and axe re-checks the rendered
// page, so a color used against the wrong surface in markup still fails here.
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

test('axe finds no WCAG A/AA violations on /styleguide (light)', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/styleguide');
  // The masthead heading anchors the page; wait for it so axe scans the settled DOM.
  await expect(page.getByRole('heading', { level: 1, name: 'Styleguide' })).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(results.violations).toEqual([]);
});

test('axe finds no WCAG A/AA violations on /styleguide (dark)', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/styleguide');
  await expect(page.getByRole('heading', { level: 1, name: 'Styleguide' })).toBeVisible();
  // The dark theme is the prefersdark sibling, wired to prefers-color-scheme, so emulating the dark
  // scheme is what swaps the whole token set; axe then measures contrast on the dark surface.
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(results.violations).toEqual([]);
});

test('axe finds no WCAG A/AA violations on a rendered article', async ({ page }) => {
  // The reading-surface post exercises every prose element and both directive components, so an axe
  // pass over it proves the bespoke surface itself is accessible, not only the styleguide chrome.
  await page.goto('/posts/the-reading-surface');
  await expect(page.getByRole('heading', { level: 1, name: 'The reading surface' })).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(results.violations).toEqual([]);
});

test('the skip link is the first Tab stop and targets the main content', async ({ page }) => {
  await page.goto('/styleguide');
  // The skip link sits off-screen until focused, the AstroPaper-signature affordance. The very first
  // Tab from the top of the document moves focus to it, ahead of the header nav.
  await page.keyboard.press('Tab');
  const skip = page.locator(':focus');
  await expect(skip).toHaveText('Skip to content');
  await expect(skip).toHaveAttribute('href', '#main');
  // The href targets the <main id="main"> landmark the (site) layout renders, so the link is real.
  await expect(page.locator('main#main')).toBeVisible();
});

test('with reduced motion preferred, the page renders and a known transition is neutralized', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/styleguide');
  // The page still renders fully under the preference.
  await expect(page.getByRole('heading', { level: 1, name: 'Styleguide' })).toBeVisible();
  // The styleguide's tab control carries a color transition that the @media (prefers-reduced-motion:
  // reduce) block sets to `none`. Under the preference its computed transition-duration is 0s, so no
  // motion runs. A representative element proves the motion floor holds in the rendered page.
  const tab = page.getByRole('tab', { name: 'Write' });
  await expect(tab).toBeVisible();
  await expect(tab).toHaveCSS('transition-duration', '0s');
});
