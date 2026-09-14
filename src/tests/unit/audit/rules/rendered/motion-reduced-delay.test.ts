// The rendered `motion-reduced-delay` rule against a real browser opened with
// `reducedMotion: 'reduce'`: a nonzero computed `transition-delay` or `animation-delay` still
// applies under reduced motion, so a reader who asked for less motion sits through a delay before
// anything moves. The five fixtures reproduce the exact shapes measured on /admin/posts: three
// DaisyUI components whose delay is ungated (fires), and cairn's own guarded tooltip and zen chip,
// whose delay is authored inside `@media (prefers-reduced-motion: no-preference)` and so computes
// to zero under reduce (does not fire).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser } from 'playwright';
import { resolveConfig } from '../../../../../lib/audit/config.js';
import { renderedRules } from '../../../../../lib/audit/rules/rendered/index.js';
import { motionReducedDelay } from '../../../../../lib/audit/rules/rendered/motion-reduced-delay.js';
import { ensurePageHelpers } from '../../../../../lib/audit/rendered.js';
import type { RenderedFinding, RenderedPage } from '../../../../../lib/audit/rendered.js';

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch();
}, 120_000);

afterAll(async () => {
  await browser?.close();
});

const config = resolveConfig('/audit-fixture', {}, () => true);

/**
 * Runs `motionReducedDelay` against `html`/`css` in a real page opened under
 * `reducedMotion: 'reduce'`, so a real `@media (prefers-reduced-motion: reduce)` gate applies and a
 * `no-preference` gate does not.
 */
async function findingsFor(css: string, html: string): Promise<RenderedFinding[]> {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  try {
    await page.setContent(`<style>${css}</style>${html}`, { waitUntil: 'load' });
    return await motionReducedDelay.check({
      page: page as unknown as RenderedPage,
      pagePath: '/fixture',
      theme: 'light',
      state: 'rest',
      axis: 'reduced-motion',
      config,
    });
  } finally {
    await page.close();
  }
}

describe('motion-reduced-delay (rendered) against a real browser', () => {
  it('registers at advisory tier in the rendered rule registry, under its own id', () => {
    const rule = renderedRules().find((candidate) => candidate.id === 'motion-reduced-delay');
    expect(rule).toBeDefined();
    expect(rule?.tier).toBe('advisory');
    // The id must never collide with the STATIC `reduced-motion` id: `suppress.ts` resolves a
    // source-positioned directive by id, and the two rules run in modes that never execute
    // together, so a shared id here (unlike `list-role`'s deliberate one) would misdirect a
    // suppression written against either rule.
    expect(rule?.id).toBe('motion-reduced-delay');
    expect(rule?.id).not.toBe('reduced-motion');
  });

  // Fixture 1 (fires): `.drawer-side`, DaisyUI's compiled transition
  // (`opacity .2s ease-out .1s, visibility .3s ease-out .1s`), ungated by any media query.
  it('flags div.drawer-side, whose ungated transition-delay computes 0.1s on both longhands', async () => {
    const css = `.drawer-side { transition: opacity .2s ease-out .1s, visibility .3s ease-out .1s; }`;
    const findings = await findingsFor(css, '<div class="drawer-side">side</div>');
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ ruleId: 'motion-reduced-delay', tier: 'advisory' });
    expect(findings[0].message).toContain('drawer-side');
    expect(findings[0].message).toContain('transition-delay');
  });

  // Fixture 2 (fires): `.checkbox::before`, DaisyUI's compiled transition across four longhands
  // (`clip-path .3s .1s, opacity .1s .1s, rotate .3s .1s, translate .3s .1s`), ungated.
  it('flags .checkbox::before, whose ungated transition-delay computes 0.1s across four longhands', async () => {
    const css = `.checkbox::before { content: ""; transition: clip-path .3s .1s, opacity .1s .1s, rotate .3s .1s, translate .3s .1s; }`;
    const findings = await findingsFor(css, '<div class="checkbox"></div>');
    expect(findings).toHaveLength(1);
    expect(findings[0].selector).toContain('::before');
    expect(findings[0].message).toMatch(/0\.1s.*,.*0\.1s.*,.*0\.1s.*,.*0\.1s/);
  });

  // Fixture 3 (fires): `.modal-box`, DaisyUI's compiled transition
  // (`translate .3s ease-out, scale .3s ease-out, opacity .2s ease-out 50ms, box-shadow .3s
  // ease-out`), ungated; only the third longhand carries a nonzero delay.
  it('flags div.modal-box, whose ungated transition-delay computes 50ms on its third longhand', async () => {
    const css = `.modal-box { transition: translate .3s ease-out, scale .3s ease-out, opacity .2s ease-out 50ms, box-shadow .3s ease-out; }`;
    const findings = await findingsFor(css, '<div class="modal-box">box</div>');
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('modal-box');
    expect(findings[0].message).toContain('0.05s');
  });

  // Fixture 4 (does not fire): the tooltip's delay is authored inside
  // `@media (prefers-reduced-motion: no-preference)`, so under reduce the gate does not apply and
  // the computed delay is the initial value, 0s.
  it('does not flag the tooltip, whose guarded 75ms delay computes zero under reduced motion', async () => {
    const css = `@media (prefers-reduced-motion: no-preference) { .tooltip { transition-delay: 75ms; } }`;
    const findings = await findingsFor(css, '<div class="tooltip">tip</div>');
    expect(findings).toEqual([]);
  });

  // Fixture 5 (does not fire): the zen chip's own 110ms delay, guarded the same way.
  it('does not flag the zen chip, whose guarded 110ms delay computes zero under reduced motion', async () => {
    const css = `@media (prefers-reduced-motion: no-preference) { .zen-chip { transition-delay: 110ms; } }`;
    const findings = await findingsFor(css, '<div class="zen-chip">zen</div>');
    expect(findings).toEqual([]);
  });

  describe('the CSSOM walker as the fix message locator', () => {
    it("names the element's signature, the authored rule's selector, and its file condition", async () => {
      const css = `.drawer-side { transition: opacity .2s ease-out .1s; }`;
      const findings = await findingsFor(css, '<div class="drawer-side">side</div>');
      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain('drawer-side');
      expect(findings[0].message).toContain('.drawer-side');
      // `page.setContent`'s own `<style>` block is an inline sheet, with no `href`.
      expect(findings[0].message).toContain('inline style');
    });

    it('says so, and gives only the signature, when the walker finds no matching authored rule', async () => {
      // The delay is set via the element's own `style` attribute rather than a stylesheet rule, so
      // no CSSOM walk can ever locate an authoring rule for it.
      const findings = await findingsFor('', '<div class="lone" style="transition-delay: 0.2s">x</div>');
      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain('no matching authored rule was found');
      expect(findings[0].message).toContain('lone');
    });
  });

  it('never flags a plain element with no delay at all', async () => {
    const findings = await findingsFor('.plain { transition: opacity .2s; }', '<div class="plain">x</div>');
    expect(findings).toEqual([]);
  });

  // The shared CSSOM walker (`__cairnAudit.findAuthoredRules`) descends into six node shapes. Each
  // gets its own named test. Every test calls `findAuthoredRules` directly (rather than through the
  // rule), so the assertion is about the LOCATE step alone. `reducedMotion` is not needed for these:
  // the walker never evaluates a `@media` condition, so it locates a matching rule under normal
  // motion the same way it would under reduced motion.
  describe('the CSSOM walker: six node shapes', () => {
    /** Opens `html`/`css` in a real page and returns `findAuthoredRules(el, '', 'transition-delay')`. */
    async function locate(css: string, html: string, selector: string) {
      const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
      try {
        await page.setContent(`<style>${css}</style>${html}`, { waitUntil: 'load' });
        await ensurePageHelpers(page as unknown as RenderedPage);
        return await page.evaluate(
          ({ sel }) => globalThis.__cairnAudit!.findAuthoredRules(document.querySelector(sel)!, '', 'transition-delay'),
          { sel: selector }
        );
      } finally {
        await page.close();
      }
    }

    it('locates a match in an ordinary top-level style rule', async () => {
      const matches = await locate('.shape-plain { transition-delay: .2s; }', '<div class="shape-plain">x</div>', '.shape-plain');
      expect(matches.some((m) => m.selector === '.shape-plain' && m.value === '0.2s')).toBe(true);
    });

    it('locates a match trailing a nested rule, a CSSNestedDeclarations node', async () => {
      // CSS Nesting: a bare declaration AFTER a nested `&:hover` block is hoisted by the CSSOM into
      // its own CSSNestedDeclarations rule, inheriting the parent style rule's own selector rather
      // than carrying one of its own.
      const css = `.shape-nested { &:hover { color: blue; } transition-delay: .3s; }`;
      const matches = await locate(css, '<div class="shape-nested">x</div>', '.shape-nested');
      expect(matches.some((m) => m.selector === '.shape-nested' && m.value === '0.3s')).toBe(true);
    });

    it('descends into a CSSSupportsRule', async () => {
      const css = `@supports (display: grid) { .shape-supports { transition-delay: .4s; } }`;
      const matches = await locate(css, '<div class="shape-supports">x</div>', '.shape-supports');
      expect(matches.some((m) => m.selector === '.shape-supports' && m.value === '0.4s')).toBe(true);
    });

    it('descends into a CSSContainerRule', async () => {
      const css = `@container (min-width: 0px) { .shape-container { transition-delay: .5s; } }`;
      const matches = await locate(css, '<div class="shape-container">x</div>', '.shape-container');
      expect(matches.some((m) => m.selector === '.shape-container' && m.value === '0.5s')).toBe(true);
    });

    it('descends into a CSSLayerBlockRule', async () => {
      const css = `@layer walker-test-layer { .shape-layer { transition-delay: .6s; } }`;
      const matches = await locate(css, '<div class="shape-layer">x</div>', '.shape-layer');
      expect(matches.some((m) => m.selector === '.shape-layer' && m.value === '0.6s')).toBe(true);
    });

    it('descends into an @starting-style CSSStartingStyleRule', async () => {
      const css = `@starting-style { .shape-starting { transition-delay: .7s; } }`;
      const matches = await locate(css, '<div class="shape-starting">x</div>', '.shape-starting');
      expect(matches.some((m) => m.selector === '.shape-starting' && m.value === '0.7s')).toBe(true);
    });

    it('skips a stylesheet whose cssRules throws a SecurityError, rather than aborting the whole walk', async () => {
      const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
      try {
        await page.setContent(
          '<style>.shape-after-opaque { transition-delay: .8s; }</style><div class="shape-after-opaque">x</div>',
          { waitUntil: 'load' }
        );
        await ensurePageHelpers(page as unknown as RenderedPage);
        const matches = await page.evaluate(() => {
          // A cross-origin sheet loaded without CORS approval throws SecurityError reading its own
          // `cssRules`; reproduced structurally here (this sandbox reaches no second origin to load
          // a real one from) by shadowing the accessor on one sheet ahead of the real one.
          const realSheets = Array.from(document.styleSheets);
          const opaque = {
            get cssRules(): never {
              throw new DOMException('blocked', 'SecurityError');
            },
            href: 'https://cross-origin.example/opaque.css',
          };
          Object.defineProperty(document, 'styleSheets', {
            configurable: true,
            get: () => [opaque, ...realSheets],
          });
          const el = document.querySelector('.shape-after-opaque')!;
          return globalThis.__cairnAudit!.findAuthoredRules(el, '', 'transition-delay');
        });
        expect(matches.some((m) => m.selector === '.shape-after-opaque' && m.value === '0.8s')).toBe(true);
      } finally {
        await page.close();
      }
    });
  });
});
