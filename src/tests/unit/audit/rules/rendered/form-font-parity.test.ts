// The form-font-parity rule against a real browser, in the shape browser-regressions.test.ts
// establishes for this rule family: no page.evaluate test double, the in-page function executed
// for real. Design ratchet Task 5 (the mechanical half of findings 1 and 6): this rule is the UA
// reset layer's regression tripwire, catching a control whose sheet never loaded.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser } from 'playwright';
import { resolveConfig } from '../../../../../lib/audit/config.js';
import { formFontParity } from '../../../../../lib/audit/rules/rendered/form-font-parity.js';
import type { RenderedFinding, RenderedPage } from '../../../../../lib/audit/rendered.js';

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch();
}, 120_000);

afterAll(async () => {
  await browser?.close();
});

const config = resolveConfig('/audit-fixture', {}, () => true);

/** Runs `formFontParity` against `html` in a real page and returns what it found. */
async function findingsFor(html: string): Promise<RenderedFinding[]> {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await page.setContent(html, { waitUntil: 'load' });
    return await formFontParity.check({
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

describe('form-font-parity against a real browser', () => {
  // The violating direction: the admin root declares the admin's own body face, but the built
  // sheet's base-layer reset never reached the textarea, so it falls back to the UA monospace
  // default. This is exactly the shape a stripped or unloaded admin sheet produces.
  it('fires when a control computes a different first font-family than the admin root', async () => {
    const findings = await findingsFor(
      `<style>
        [data-theme='cairn-admin'] { font-family: "Figtree", system-ui, sans-serif; }
      </style>
      <body><div data-theme="cairn-admin">
        <textarea id="unreset-textarea" style="font-family: monospace;"></textarea>
      </div></body>`
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ ruleId: 'form-font-parity', tier: 'advisory' });
    expect(findings[0].selector).toContain('unreset-textarea');
    expect(findings[0].message).toContain('monospace');
    expect(findings[0].message).toContain('figtree');
  });

  // The conforming direction: the reset layer's `font: inherit` rule is what makes a bare control
  // compute the same face as its root, modeled here directly rather than depending on the built
  // sheet.
  it('stays quiet when every control inherits the admin root face', async () => {
    const findings = await findingsFor(
      `<style>
        [data-theme='cairn-admin'] { font-family: "Figtree", system-ui, sans-serif; }
        button, input, select, textarea { font: inherit; }
      </style>
      <body><div data-theme="cairn-admin">
        <textarea id="reset-textarea"></textarea>
        <input id="reset-input" type="text">
        <select id="reset-select"><option>One</option></select>
        <button id="reset-button" type="button">Save</button>
      </div></body>`
    );
    expect(findings).toEqual([]);
  });

  // The walk is scoped to the theme root's own subtree (design ratchet Batch B): a control that
  // sits outside every `[data-theme]` wrapper has no root to be compared against and must not be
  // read as a mismatch, even when its own font-family plainly differs.
  it('ignores a mismatched control that renders outside the theme root', async () => {
    const findings = await findingsFor(
      `<style>
        [data-theme='cairn-admin'] { font-family: "Figtree", system-ui, sans-serif; }
      </style>
      <body>
        <textarea id="outside-textarea" style="font-family: monospace;"></textarea>
        <div data-theme="cairn-admin"></div>
      </body>`
    );
    expect(findings).toEqual([]);
  });

  // A control that opts into its own face on purpose is a mismatch by construction, not by
  // omission: CairnMediaLibrary's slug and type-to-confirm inputs, and MarkdownEditor's no-JS
  // fallback textarea, all carry one of these two class shapes.
  it('exempts a control carrying an explicit face class from the parity check', async () => {
    const findings = await findingsFor(
      `<style>
        [data-theme='cairn-admin'] { font-family: "Figtree", system-ui, sans-serif; }
      </style>
      <body><div data-theme="cairn-admin">
        <input id="mono-input" class="input font-mono" style="font-family: monospace;">
        <textarea id="arbitrary-face-textarea" class="textarea font-[family-name:var(--font-editor)]"
          style="font-family: monospace;"></textarea>
      </div></body>`
    );
    expect(findings).toEqual([]);
  });

  // The exemption net closed (conformance pass, 2026-09-01, any-site audit rank 6): a variant
  // prefix on an otherwise-exempt utility (`md:font-mono`, `dark:font-mono`) used to slip past the
  // bare `font-mono` string test and false-positive as a mismatch.
  it('exempts a variant-prefixed font utility, however many prefixes stack', async () => {
    const findings = await findingsFor(
      `<style>
        [data-theme='cairn-admin'] { font-family: "Figtree", system-ui, sans-serif; }
      </style>
      <body><div data-theme="cairn-admin">
        <input id="md-mono-input" class="input md:font-mono" style="font-family: monospace;">
        <input id="dark-md-mono-input" class="input dark:md:font-mono" style="font-family: monospace;">
      </div></body>`
    );
    expect(findings).toEqual([]);
  });

  // The `font-serif`/`font-sans` families were never in the net at all.
  it('exempts font-serif and font-sans, not only font-mono', async () => {
    const findings = await findingsFor(
      `<style>
        [data-theme='cairn-admin'] { font-family: "Figtree", system-ui, sans-serif; }
      </style>
      <body><div data-theme="cairn-admin">
        <input id="serif-input" class="input font-serif" style="font-family: serif;">
        <input id="sans-input" class="input font-sans" style="font-family: sans-serif;">
      </div></body>`
    );
    expect(findings).toEqual([]);
  });

  // Tailwind 4's `font-(family-name:--x)` shorthand is a different syntax from the v3
  // `font-[family-name:...]` arbitrary-value form the net already matched, and stacks with a
  // variant prefix the same way `font-mono` does.
  it('exempts the Tailwind 4 font-(family-name:--x) shorthand, with or without a variant prefix', async () => {
    const findings = await findingsFor(
      `<style>
        [data-theme='cairn-admin'] { font-family: "Figtree", system-ui, sans-serif; }
      </style>
      <body><div data-theme="cairn-admin">
        <textarea id="shorthand-textarea" class="textarea font-(family-name:--font-editor)"
          style="font-family: monospace;"></textarea>
        <textarea id="dark-shorthand-textarea" class="textarea dark:font-(family-name:--font-editor)"
          style="font-family: monospace;"></textarea>
      </div></body>`
    );
    expect(findings).toEqual([]);
  });
});
