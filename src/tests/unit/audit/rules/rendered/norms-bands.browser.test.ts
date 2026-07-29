// norms-bands against a real browser, mirroring browser-regressions.test.ts's own shape: a real
// Chromium page, real computed styles, the rule's `check()` called exactly as `runRendered` calls
// it. What this file proves that the pure evaluateNormsBandCandidate tests (norms-bands.test.ts)
// cannot: the DOM walk itself runs without a ReferenceError against a real page, it reads the SAME
// shipped manifest cairn-audit ships (not a fixture standing in for one), the family/property scope
// (control and container only) actually excludes what it claims to, and the viewport it borrows to
// match the manifest's own 1440x900 generation size is restored afterward.
//
// Kept as its own file rather than appended to browser-regressions.test.ts: five advisory rules
// landed in the same pass, each registering itself in the same rendered/index.ts, and a shared test
// file every one of them also edits is a needless collision surface for no shared behavior.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser } from 'playwright';
import { resolveConfig } from '../../../../../lib/audit/config.js';
import { loadNormsManifest } from '../../../../../lib/audit/norms.js';
import { normsBands } from '../../../../../lib/audit/rules/rendered/norms-bands.js';
import { renderedRules } from '../../../../../lib/audit/rules/rendered/index.js';
import type { RenderedFinding, RenderedPage, RenderedRule } from '../../../../../lib/audit/rendered.js';

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch();
}, 120_000);

afterAll(async () => {
  await browser?.close();
});

const config = resolveConfig('/audit-fixture', {}, () => true);
const manifest = loadNormsManifest();

/** Runs `rule` against `html` in a real page and returns what it found. */
async function findingsFor(rule: RenderedRule, html: string): Promise<RenderedFinding[]> {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await page.setContent(html, { waitUntil: 'load' });
    return await rule.check({
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

function entry(role: string, property: string) {
  const found = manifest.entries.find((candidate) => candidate.role === role && candidate.property === property);
  if (!found) throw new Error(`the shipped manifest carries no ${role}/${property}; this fixture needs a live one`);
  return found;
}

describe('norms-bands against a real browser', () => {
  it('catches a control whose rendered height falls outside the shipped band', async () => {
    // The real button-primary height band tops out at 40px (norms-manifest.json). 96px is a
    // deliberate, unmistakable miss, not a boundary case a rounding edge could hide.
    const findings = await findingsFor(
      normsBands,
      `<style>.btn-primary { display:inline-flex; align-items:center; height:96px; padding:1px 16px;
              border:1px solid #000; border-radius:10px; font-size:14px; }</style>
       <body><button class="btn btn-primary" type="button">Publish</button></body>`
    );
    const heightFindings = findings.filter((f) => f.message.includes('button-primary/height'));
    expect(heightFindings).toHaveLength(1);
    expect(heightFindings[0].selector).toBe('button.btn.btn-primary');
    expect(heightFindings[0].tier).toBe('advisory');
    expect(heightFindings[0].message).toContain('96.0px');
  });

  it('passes a control rendered inside the shipped band on every checked property', async () => {
    const heightBand = entry('button-primary', 'height');
    const radiusBand = entry('button-primary', 'border-radius');
    // Picking the band's own max keeps this fixture correct even if the manifest is regenerated
    // with a slightly different admin render, rather than hard-coding today's numbers twice.
    const height = heightBand.band.kind === 'length' ? heightBand.band.max : 40;
    const radius = radiusBand.band.kind === 'length' ? radiusBand.band.max : 10;
    const findings = await findingsFor(
      normsBands,
      `<style>.btn-primary { display:inline-flex; align-items:center; height:${height}px; padding:1px 16px;
              border:1px solid #000; border-radius:${radius}px; font-size:14px; }</style>
       <body><button class="btn btn-primary" type="button">Publish</button></body>`
    );
    expect(findings.filter((f) => f.selector === 'button.btn.btn-primary')).toEqual([]);
  });

  it('catches a border-style outside the shipped keyword vocabulary', async () => {
    const findings = await findingsFor(
      normsBands,
      `<style>.card-shell { display:block; width:200px; height:100px;
              border:1px dashed #000; border-radius:16px; }</style>
       <body><div class="card-shell"></div></body>`
    );
    const styleFindings = findings.filter((f) => f.message.includes('card/border-style'));
    expect(styleFindings).toHaveLength(1);
    expect(styleFindings[0].message).toContain('"dashed"');
  });

  // A container role carries no height entry in the manifest at all (the card recipe composes its
  // own padding and height per screen), so nothing here should be measured or flagged on that axis.
  it('does not check height on a container role', async () => {
    const findings = await findingsFor(
      normsBands,
      `<style>.card-shell { display:block; width:200px; height:900px; border:1px solid #000; border-radius:16px; }</style>
       <body><div class="card-shell"></div></body>`
    );
    expect(findings.filter((f) => f.selector.includes('card-shell'))).toEqual([]);
  });

  // icon is excluded by family even though its own manifest property is also named "height": the
  // scope is spec 6.3's four categories on control and container roles, not every length-kind
  // property the manifest happens to carry under a matching name.
  it('does not check an icon glyph, even though the manifest carries an icon/height band', async () => {
    const findings = await findingsFor(
      normsBands,
      `<body><svg class="lucide" width="96" height="96" viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg></body>`
    );
    expect(findings).toEqual([]);
  });

  // A text role (nav-item, page-title, eyebrow, table-cell, table-header-cell) carries no property
  // in this rule's checked set at all; its bands are all typography, out of scope by the file header.
  it('does not check a text role', async () => {
    const findings = await findingsFor(
      normsBands,
      `<body><h1 class="page-h1" style="font-size:400px">Way outside any plausible title size</h1></body>`
    );
    expect(findings).toEqual([]);
  });

  it('restores the caller viewport after borrowing the manifest generation size', async () => {
    const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
    try {
      await page.setContent('<body></body>', { waitUntil: 'load' });
      await normsBands.check({
        page: page as unknown as RenderedPage,
        pagePath: '/fixture',
        theme: 'light',
        state: 'rest',
        config,
      });
      expect(page.viewportSize()).toEqual({ width: 800, height: 600 });
    } finally {
      await page.close();
    }
  });

  it('is registered advisory tier, and every finding it raises carries that tier', async () => {
    expect(renderedRules().some((rule) => rule.id === 'norms-bands' && rule.tier === 'advisory')).toBe(true);
    const findings = await findingsFor(
      normsBands,
      `<style>.btn-primary { display:inline-flex; height:96px; padding:1px 16px; border:1px solid #000;
              border-radius:2px; font-size:14px; }</style>
       <body><button class="btn btn-primary" type="button">Publish</button></body>`
    );
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.every((finding) => finding.tier === 'advisory')).toBe(true);
  });

  it('executes without a serialization failure against a realistic admin fragment', async () => {
    const html = `<body><div data-theme="cairn-admin"><main>
      <h1 class="page-h1">Posts</h1>
      <button class="btn btn-primary" type="button">New post</button>
      <div class="card-shell" style="border:1px solid #000;border-radius:16px;padding:16px">
        <input class="input" type="text" placeholder="Search" style="height:32px;padding:4px 12px">
        <select class="select" style="height:32px;padding:4px 12px"><option>All</option></select>
        <span class="status-chip" style="display:inline-block;padding:0 7px;height:16px;border-radius:8px;font-size:10px">Draft</span>
      </div>
    </main></div></body>`;
    await expect(findingsFor(normsBands, html)).resolves.toBeInstanceOf(Array);
  });
});
