// The container-inset-asymmetry rule against a real browser, in the shape browser-regressions.test.ts
// establishes for this rule family. Design ratchet Task 5 (the mechanical half of finding 1): the
// phantom-gutter detector, catching a card or list whose content sits closer to one edge than the
// other. The first fixtures below are constructed, an author's one-sided padding at a comfortable
// margin over the threshold; the bare-`ul` one is the ASC Assets-trial corpus's real shape, with
// its numbers taken from the rule's own output against the running site (design ratchet fix C).
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
  // The violating direction: a constructed one-sided padding utility (not the corpus's own
  // shape, which the bare-.list fixture below pins) reads as content pushed right.
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

  // The corpus's own shape, pinned from the live page rather than paraphrased (design ratchet fix
  // C). The gutter on `/admin/club/asset-requests` was never an author's padding utility: the
  // `<ul class="list">` carried NO author inset at all and kept the user agent's own 40px bullet
  // indent, which the published sheet of that moment never reset. So this fixture declares no
  // padding, and the numbers it asserts are the ones the rule reported against the running site.
  // Every other fixture here sets an explicit one-sided padding, which would let a future rewrite
  // that only reads author-declared insets stay green while missing the defect the rule exists for.
  it('fires on a bare .list keeping the user agent bullet indent, with no author padding at all', async () => {
    const findings = await findingsFor(
      `<body style="margin:0"><div data-theme="cairn-admin">
        <ul class="list" id="ua-indent-list" style="display:flex;flex-direction:column;width:400px;">
          <li style="display:grid;">Mooring &middot; Kelleher household</li>
          <li style="display:grid;">Boat storage &middot; Vaara household</li>
        </ul>
      </div></body>`
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].selector).toContain('ua-indent-list');
    expect(findings[0].message).toContain('40px left inset against a 0px right inset');
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
