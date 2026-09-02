// Shared real-Chromium page-setup harness for chip-ground-collision's two test files
// (`rulings.chip-ground-collision.test.ts` and `chip-ground-collision-chroma-repair.test.ts`).
// Lives outside the `*.test.ts` glob deliberately: vitest's `include` pattern treats every
// `*.test.ts` file as its own test module and executes its top-level `describe`/`it` calls on
// import, so a test file importing another test file for its helpers would register (and run)
// that file's tests a second time under the importer. A plain module has no such side effect.
import { resolveConfig } from '../../../../../lib/audit/config.js';
import type { Browser } from 'playwright';
import type { RenderedFinding, RenderedPage, RenderedRule } from '../../../../../lib/audit/rendered.js';

const config = resolveConfig('/audit-fixture', {}, () => true);

/** Runs `rule` against `html` in a real page and returns what it found. */
export async function findingsFor(rule: RenderedRule, html: string, browser: Browser): Promise<RenderedFinding[]> {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await page.setContent(html, { waitUntil: 'load' });
    return await rule.check({
      page: page as unknown as RenderedPage,
      pagePath: '/fixture',
      theme: 'light',
      state: rule.states?.[0] ?? 'rest',
      config,
    });
  } finally {
    await page.close();
  }
}
