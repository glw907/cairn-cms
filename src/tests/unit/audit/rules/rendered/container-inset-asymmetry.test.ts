// The container-inset-asymmetry rule against a real browser, in the shape browser-regressions.test.ts
// establishes for this rule family. Design ratchet Task 5 (the mechanical half of finding 1): the
// phantom-gutter detector, catching a card or list whose content sits closer to one edge than the
// other. The 57px left inset against an 8px right one mirrors the ASC Assets-trial harvest's own
// corpus measurement on `/admin/club/asset-requests` at 390.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser } from 'playwright';
import { resolveConfig } from '../../../../../lib/audit/config.js';
import { containerInsetAsymmetry } from '../../../../../lib/audit/rules/rendered/container-inset-asymmetry.js';
import type { RenderedFinding, RenderedPage } from '../../../../../lib/audit/rendered.js';

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch();
}, 120_000);

afterAll(async () => {
  await browser?.close();
});

const config = resolveConfig('/audit-fixture', {}, () => true);

/** Runs `containerInsetAsymmetry` against `html` in a real page and returns what it found. */
async function findingsFor(html: string): Promise<RenderedFinding[]> {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await page.setContent(html, { waitUntil: 'load' });
    return await containerInsetAsymmetry.check({
      page: page as unknown as RenderedPage,
      pagePath: '/fixture',
      theme: 'light',
      state: 'rest',
      config,
    });
  } finally {
    await page.close();
  }
}

describe('container-inset-asymmetry against a real browser', () => {
  // The violating direction: a one-sided padding utility, the corpus's own 57px-left/8px-right
  // gutter, reads as content pushed right.
  it('fires when a card-shell content region sits far closer to its right edge than its left', async () => {
    const findings = await findingsFor(
      `<body style="margin:0"><div data-theme="cairn-admin">
        <div class="card-shell" id="gutter-card" style="padding-left:65px;padding-right:8px;width:400px;">
          <p style="margin:0;">Reason for this request</p>
        </div>
      </div></body>`
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ ruleId: 'container-inset-asymmetry', tier: 'advisory' });
    expect(findings[0].selector).toContain('gutter-card');
    expect(findings[0].message).toContain('pushed right');
  });

  // The conforming direction: symmetric padding on both sides.
  it('stays quiet when a card-shell content region sits symmetrically inset', async () => {
    const findings = await findingsFor(
      `<body style="margin:0"><div data-theme="cairn-admin">
        <div class="card-shell" id="even-card" style="padding-left:16px;padding-right:16px;width:400px;">
          <p style="margin:0;">Reason for this request</p>
        </div>
      </div></body>`
    );
    expect(findings).toEqual([]);
  });

  // The rule's second named container, `.list`: the same asymmetry reads the same way there.
  it('fires on a .list container with a one-sided inset, not only on card-shell', async () => {
    const findings = await findingsFor(
      `<body style="margin:0"><div data-theme="cairn-admin">
        <ul class="list" id="gutter-list" style="padding-left:60px;padding-right:4px;width:400px;list-style:none;">
          <li style="margin:0;">Row one</li>
        </ul>
      </div></body>`
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].selector).toContain('gutter-list');
  });

  // A modest, sub-threshold asymmetry (ordinary sub-pixel rounding, a deliberate near-even design)
  // is not a phantom gutter.
  it('stays quiet when the asymmetry sits under the 24px threshold', async () => {
    const findings = await findingsFor(
      `<body style="margin:0"><div data-theme="cairn-admin">
        <div class="card-shell" id="close-card" style="padding-left:20px;padding-right:16px;width:400px;">
          <p style="margin:0;">Reason for this request</p>
        </div>
      </div></body>`
    );
    expect(findings).toEqual([]);
  });
});
