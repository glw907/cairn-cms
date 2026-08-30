import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';

// Throwaway evidence harness for the Wayfinder retheme-lab experiment. Not part of the shipped
// e2e suite; captures full-page screenshots of three pages in both color schemes to an
// out-of-repo scratch directory named by the OUT_DIR env var. Never committed alongside the
// token-layer redirection diffs.
const OUT_DIR = process.env.RETHEME_LAB_OUT_DIR;
if (!OUT_DIR) {
  throw new Error('RETHEME_LAB_OUT_DIR must be set');
}
mkdirSync(OUT_DIR, { recursive: true });

const pages: { name: string; path: string }[] = [
  { name: 'home', path: '/' },
  { name: 'post', path: '/posts/the-reading-surface' },
  { name: 'styleguide', path: '/styleguide' },
];

for (const { name, path } of pages) {
  for (const scheme of ['light', 'dark'] as const) {
    test(`${name} — ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: `${OUT_DIR}/${name}-${scheme}.png`, fullPage: true });
    });
  }
}
