import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The seam under proof: the site's own compiled admin sheet (.cairn/admin.css) rides alongside
// the packaged one on every /admin route and nowhere else. The baseline fixture below is the
// "without" side, captured once at this pass's branch point by the post-merge ritual; there is
// no second build in this repo to diff against.
const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = resolve(__dirname, 'fixtures/admin-sheet-baseline.json');
const fixtureExists = existsSync(FIXTURE_PATH);

const ADMIN_PAGES = ['/admin/posts', '/admin/media', '/admin/settings'] as const;
const PUBLIC_PAGES = ['/', '/posts'] as const;

// Read off the admin shell's drawer root (CairnAdminShell's own theme-scoped surface, the one
// element every admin screen renders inside), never a property the site sheet itself sets, so a
// regression in the engine's own rendered output would show here rather than in the site's added
// utility.
const ENGINE_PROPERTIES = ['background-color', 'color', 'font-family'] as const;

interface AdminSheetBaseline {
  /** SHA-256 of each public page's concatenated stylesheet bodies, in document order. */
  publicDigests: Record<string, string>;
  /** Each admin page's stylesheet `<link>` hrefs, in document order. */
  adminStylesheets: Record<string, string[]>;
  /** `getComputedStyle` over `ENGINE_PROPERTIES`, read from the admin shell's drawer root. */
  computedStyle: Record<string, Record<string, string>>;
}

function loadFixture(): AdminSheetBaseline {
  return JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as AdminSheetBaseline;
}

/** Every stylesheet `<link>` href on a page, in document order, from the raw HTML response. */
function stylesheetHrefs(html: string): string[] {
  const hrefs: string[] = [];
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    if (!/rel=["']stylesheet["']/i.test(tag)) continue;
    const href = tag.match(/href=["']([^"']+)["']/i);
    if (href) hrefs.push(href[1]);
  }
  return hrefs;
}

/** SHA-256 of a page's stylesheets, concatenated by content in document order. */
async function pageStylesheetDigest(request: APIRequestContext, path: string): Promise<string> {
  const html = await (await request.get(path)).text();
  const hrefs = stylesheetHrefs(html);
  const bodies = await Promise.all(hrefs.map(async (href) => (await request.get(href)).text()));
  return createHash('sha256').update(bodies.join('')).digest('hex');
}

/** `getComputedStyle` over `ENGINE_PROPERTIES`, read from the admin shell's drawer root. */
async function drawerComputedStyle(page: Page, path: string): Promise<Record<string, string>> {
  await page.goto(path);
  return page.locator('.drawer').first().evaluate((el, props: readonly string[]) => {
    const style = getComputedStyle(el);
    return Object.fromEntries(props.map((prop) => [prop, style.getPropertyValue(prop)]));
  }, ENGINE_PROPERTIES);
}

test.describe('the site admin sheet seam', () => {
  test('public pages carry no site admin sheet', async ({ request }) => {
    test.skip(!fixtureExists, 'the baseline fixture is written by the post-merge ritual');
    const fixture = loadFixture();
    for (const path of PUBLIC_PAGES) {
      const digest = await pageStylesheetDigest(request, path);
      expect(digest, `${path} stylesheet digest`).toBe(fixture.publicDigests[path]);
    }
  });

  for (const path of ADMIN_PAGES) {
    test(`${path} carries exactly one added stylesheet, the compiled site sheet`, async ({
      request,
    }) => {
      test.skip(!fixtureExists, 'the baseline fixture is written by the post-merge ritual');
      const fixture = loadFixture();
      const html = await (await request.get(path)).text();
      const hrefs = stylesheetHrefs(html);
      const before = fixture.adminStylesheets[path];
      const removed = before.filter((href) => !hrefs.includes(href));
      const added = hrefs.filter((href) => !before.includes(href));
      expect(removed, `${path} lost a stylesheet the baseline had`).toEqual([]);
      expect(added, `${path} added stylesheet count`).toHaveLength(1);
      const addedBody = await (await request.get(added[0])).text();
      expect(addedBody, `${path} added sheet body`).toMatch(/\.pt-14\s*\{[^}]*padding-top/);
    });

    test(`${path} keeps the engine's own rendered properties unchanged`, async ({ page }) => {
      test.skip(!fixtureExists, 'the baseline fixture is written by the post-merge ritual');
      const fixture = loadFixture();
      const computed = await drawerComputedStyle(page, path);
      expect(computed, `${path} engine-owned computed style`).toEqual(fixture.computedStyle[path]);
    });
  }
});
