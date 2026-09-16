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

// A viewport wide enough to cross every `sm:` breakpoint the pages under proof rely on.
const WIDE_VIEWPORT = { width: 1280, height: 900 };

interface PageHeaderFlex {
  flexDirection: string;
  alignItems: string;
  justifyContent: string;
}

/**
 * The responsive-variant proof points read from each admin page: the masthead site-name
 * element's `display` (`CairnAdminShell`'s `hidden ... sm:block` wrapper), the `PageHeader`
 * row's flex layout (`flex flex-col ... sm:flex-row sm:items-start sm:justify-between`), and,
 * on `/admin/posts` only, the `ConceptList` date column header's `display`
 * (`hidden ... sm:table-cell`). These pair a base utility with its responsive variant, so a
 * collision between the site sheet and the engine sheet's shared utilities layer shows here;
 * `background-color`/`color`/`font-family` on the drawer root cannot see that class of defect.
 */
interface ComputedStyleSnapshot {
  mastheadDisplay: string;
  pageHeaderFlex: PageHeaderFlex;
  dateCellDisplay?: string;
}

interface AdminSheetBaseline {
  /** SHA-256 of each public page's concatenated stylesheet bodies, in document order. */
  publicDigests: Record<string, string>;
  /** Each admin page's stylesheet `<link>` hrefs, in document order. */
  adminStylesheets: Record<string, string[]>;
  /** Each admin page's `ComputedStyleSnapshot`, read at `WIDE_VIEWPORT`. */
  computedStyle: Record<string, ComputedStyleSnapshot>;
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

/** `getComputedStyle().display` of a locator's first match. */
async function computedDisplay(page: Page, selector: string): Promise<string> {
  return page
    .locator(selector)
    .first()
    .evaluate((el) => getComputedStyle(el).display);
}

/** The `ComputedStyleSnapshot` for one admin page, read at `WIDE_VIEWPORT`. */
async function pageComputedStyle(page: Page, path: string): Promise<ComputedStyleSnapshot> {
  await page.setViewportSize(WIDE_VIEWPORT);
  await page.goto(path);
  const mastheadDisplay = await computedDisplay(page, '.max-w-\\[30\\%\\].sm\\:block');
  const pageHeaderFlex = await page
    .locator('header')
    .first()
    .evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        flexDirection: style.flexDirection,
        alignItems: style.alignItems,
        justifyContent: style.justifyContent,
      };
    });
  const snapshot: ComputedStyleSnapshot = { mastheadDisplay, pageHeaderFlex };
  if (path === '/admin/posts') {
    snapshot.dateCellDisplay = await computedDisplay(
      page,
      'th:has(button[aria-label="Sort by date"])',
    );
  }
  return snapshot;
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
      const computed = await pageComputedStyle(page, path);
      expect(computed, `${path} engine-owned computed style`).toEqual(fixture.computedStyle[path]);
    });
  }
});
