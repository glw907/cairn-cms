import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The seam under proof, in three assertions: (a) no public page ever serves the site admin
// sheet itself, (b) each admin page carries the site sheet's proof utility that the baseline
// build did not have, and (c) the engine's own rendered properties on those admin pages are
// unchanged from the baseline. (a) is keyed on sheet identity rather than a whole-bundle
// digest: the site's own Tailwind compile (`@tailwindcss/vite`) scans every route under `src`,
// so a utility class written on an admin page (`.scroll-mt-14`, this spec's proof utility) can land in
// the public bundle too by the site's own build, which a whole-bundle digest cannot distinguish
// from the site admin sheet leaking onto a public page. (b) and (c) still compare against the
// baseline fixture, captured once at this pass's branch point by the post-merge ritual; there is
// no second build in this repo to diff against.
const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = resolve(__dirname, 'fixtures/admin-sheet-baseline.json');

const ADMIN_PAGES = ['/admin/posts', '/admin/media', '/admin/settings'] as const;
// `/posts` is a 404 on this showcase; `/archive/2` is the archive page that renders (the bare
// `/archive` and `/archive/1` both 404, since page one of the archive is the home route).
const PUBLIC_PAGES = ['/', '/archive/2'] as const;

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
  /**
   * Each admin page's concatenated stylesheet bodies, in document order, captured before the
   * site sheet existed. Stored as content, never as a hashed href, since a Vite content hash
   * changes whenever any unrelated CSS or route moves and would make an href-keyed baseline
   * fail for reasons unconnected to this seam.
   */
  adminSheetContent: Record<string, string>;
  /** Each admin page's `ComputedStyleSnapshot`, read at `WIDE_VIEWPORT`. */
  computedStyle: Record<string, ComputedStyleSnapshot>;
}

/**
 * The chosen utility's compiled declaration, present only where the site sheet is loaded. The
 * utility is deliberately inert: `scroll-margin-top` on a status paragraph nothing scrolls to
 * changes no rendered pixel, so the proof costs the admin's visual baselines nothing.
 */
const UTILITY_DECLARATION = /\.scroll-mt-14\s*\{[^}]*scroll-margin-top/;

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

/** A page's stylesheet bodies, in document order. */
async function pageStylesheetBodies(request: APIRequestContext, path: string): Promise<string[]> {
  const html = await (await request.get(path)).text();
  const hrefs = stylesheetHrefs(html);
  return Promise.all(hrefs.map(async (href) => (await request.get(href)).text()));
}

/** A page's stylesheets, concatenated by content in document order. */
async function pageStylesheetContent(request: APIRequestContext, path: string): Promise<string> {
  const bodies = await pageStylesheetBodies(request, path);
  return bodies.join('');
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
    // The site admin sheet is identified at test time, not from the fixture: it is whichever
    // stylesheet body `/admin/posts` loads that carries the proof utility's declaration.
    const adminBodies = await pageStylesheetBodies(request, ADMIN_PAGES[0]);
    const adminSheetBody = adminBodies.find((body) => UTILITY_DECLARATION.test(body));
    expect(adminSheetBody, `${ADMIN_PAGES[0]} site admin sheet body`).toBeDefined();
    for (const path of PUBLIC_PAGES) {
      const bodies = await pageStylesheetBodies(request, path);
      expect(bodies, `${path} stylesheet bodies`).not.toContain(adminSheetBody);
    }
  });

  for (const path of ADMIN_PAGES) {
    test(`${path} carries the compiled site sheet's utility, absent from the baseline`, async ({
      request,
    }) => {
      const fixture = loadFixture();
      const content = await pageStylesheetContent(request, path);
      expect(content, `${path} stylesheet content`).toMatch(UTILITY_DECLARATION);
      expect(fixture.adminSheetContent[path], `${path} baseline stylesheet content`).not.toMatch(
        UTILITY_DECLARATION,
      );
    });

    test(`${path} keeps the engine's own rendered properties unchanged`, async ({ page }) => {
      const fixture = loadFixture();
      const computed = await pageComputedStyle(page, path);
      expect(computed, `${path} engine-owned computed style`).toEqual(fixture.computedStyle[path]);
    });
  }
});
