import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseSiteConfig, extractMenu } from '@glw907/cairn-cms';

// Proves the public header renders from site.config.yaml's menus.primary rather than a hardcoded
// array in SiteHeader.svelte: read the same YAML file the site parses, extract the same menu the
// engine's own extractMenu resolves, and assert the header shows exactly those entries, in order.
// A hardcoded header can only pass this test by coincidence of matching content; a menu entry
// added to the YAML with nothing else changed proves the wiring (see the plan's red-state note).

const configPath = fileURLToPath(new URL('../src/theme/site.config.yaml', import.meta.url));

test('the public header renders every top-level entry declared in menus.primary, in order', async ({ page }) => {
  const raw = readFileSync(configPath, 'utf-8');
  const config = parseSiteConfig(raw);
  const primaryNav = extractMenu(config, 'primary', 2);
  const topLevel = primaryNav.filter((item) => item.url !== undefined);
  expect(topLevel.length).toBeGreaterThan(0);

  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Primary' });
  const links = nav.getByRole('link');
  await expect(links).toHaveCount(topLevel.length);

  for (const [index, item] of topLevel.entries()) {
    const link = links.nth(index);
    await expect(link).toHaveText(item.label);
    await expect(link).toHaveAttribute('href', item.url!);
  }
});

// The load lives in the ROOT +layout.server.ts precisely so the +error.svelte mount of SiteHeader
// gets the same nav; if that load ever stopped running for the error render, the header's `?? []`
// fallback would mask the regression as a silently empty nav. This locks the contract.
test('the error page renders the same config-declared header nav', async ({ page }) => {
  const raw = readFileSync(configPath, 'utf-8');
  const config = parseSiteConfig(raw);
  const topLevel = extractMenu(config, 'primary', 2).filter((item) => item.url !== undefined);

  const response = await page.goto('/no-such-page-e2e-probe');
  expect(response?.status()).toBe(404);
  const nav = page.getByRole('navigation', { name: 'Primary' });
  await expect(nav.getByRole('link')).toHaveCount(topLevel.length);
});
