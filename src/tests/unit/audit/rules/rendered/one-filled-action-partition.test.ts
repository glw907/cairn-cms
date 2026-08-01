// Design ratchet Task 4 (closes finding 4): Geoff's one-filled-action ruling (2026-07-30, SETTLED,
// not re-litigated here) narrows the rule's landmark partition from `main, nav, aside, header,
// footer` to `nav, aside`. The four fixtures below are the ruling made mechanical: (a) is the one
// that changes, a filled header action above a filled card action now shares main's own surface and
// the rule fires, where the old landmark set kept `header` and `main` apart and stayed quiet. (b),
// (c), and (d) pin what does NOT change: nav still partitions, the topmost open dialog layer still
// stands alone from the page beneath it, and two fills inside one dialog still fire.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser } from 'playwright';
import { resolveConfig } from '../../../../../lib/audit/config.js';
import { oneFilledAction } from '../../../../../lib/audit/rules/rendered/one-filled-action.js';
import type { RenderedFinding, RenderedPage } from '../../../../../lib/audit/rendered.js';

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch();
}, 120_000);

afterAll(async () => {
  await browser?.close();
});

const config = resolveConfig('/audit-fixture', {}, () => true);

/** Runs `oneFilledAction` against `html` in a real page and returns what it found. */
async function findingsFor(html: string): Promise<RenderedFinding[]> {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await page.setContent(html, { waitUntil: 'load' });
    return await oneFilledAction.check({
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

// The admin's own theme shape, reduced to what this rule reads: `data-theme` on a wrapper nested
// inside body, --color-primary in oklch, and the .btn-primary/.btn-ghost recipes.
const THEME = `
  <style>
    [data-theme='cairn-admin'] { --color-primary: oklch(52% 0.2 293); }
    .btn { border: 0; padding: 8px 16px; font: 500 14px system-ui; }
    .btn-primary { background-color: var(--color-primary); color: white; }
  </style>`;

describe('one-filled-action, the narrowed partition (design ratchet Task 4)', () => {
  // (a) The case the ruling changes: a filled header action above a filled card action, both inside
  // <main>. Against the old landmark set (header partitions) these sat on different surfaces and the
  // rule stayed quiet; Geoff's ruling holds that a header/main boundary removes none of the harm the
  // rule exists to catch (same visual column, same first look), so it fires now.
  it('fires when a filled header action sits above a filled card action in main', async () => {
    const findings = await findingsFor(
      `${THEME}<body><div data-theme="cairn-admin"><main>
        <header><button type="button" class="btn btn-primary" id="header-action">Publish</button></header>
        <div class="card-shell"><button type="submit" class="btn btn-primary" id="card-action">Save</button></div>
      </main></div></body>`
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ ruleId: 'one-filled-action', tier: 'error' });
    expect(findings[0].message).toContain('header-action');
    expect(findings[0].message).toContain('card-action');
  });

  // (b) Unchanged: a nav rail is persistent chrome with its own ground and spatial zone, so it still
  // partitions from main.
  it('stays quiet when a filled nav action and a filled main action are the only pair', async () => {
    const findings = await findingsFor(
      `${THEME}<body><div data-theme="cairn-admin">
        <nav><button type="button" class="btn btn-primary" id="nav-action">New</button></nav>
        <main><button type="submit" class="btn btn-primary" id="main-action">Publish</button></main>
      </div></body>`
    );
    expect(findings).toEqual([]);
  });

  // (c) Unchanged: the topmost open dialog layer stands alone. The in-page walk only reaches
  // elements inside that layer, so the page beneath contributes nothing while the dialog is open,
  // the same partition the dialog-layer logic already carries.
  it('stays quiet when two filled actions split across an open dialog and the page beneath', async () => {
    const findings = await findingsFor(
      `${THEME}<body><div data-theme="cairn-admin">
        <main><button type="button" class="btn btn-primary" id="bg-action">Background</button></main>
        <dialog open><button type="submit" class="btn btn-primary" id="dialog-action">Confirm</button></dialog>
      </div></body>`
    );
    expect(findings).toEqual([]);
  });

  // (d) Unchanged: two fills inside the same open dialog compete on the dialog's own surface.
  it('fires when two filled actions sit inside one open dialog', async () => {
    const findings = await findingsFor(
      `${THEME}<body><div data-theme="cairn-admin">
        <dialog open>
          <button type="button" class="btn btn-primary" id="dialog-one">One</button>
          <button type="submit" class="btn btn-primary" id="dialog-two">Two</button>
        </dialog>
      </div></body>`
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('dialog-one');
    expect(findings[0].message).toContain('dialog-two');
  });

  // (e) Batch B fix: two <nav> landmarks are two surfaces, keyed by their own DOM position rather
  // than the shared `<nav>` tag name. Each rail carries one filled action alone, so the rule stays
  // quiet; the old tag-name key would have merged both rails into one `'nav'` surface and reported
  // two competing fills that were never on the same surface at all.
  it('does not merge two nav landmarks into one surface', async () => {
    const findings = await findingsFor(
      `${THEME}<body><div data-theme="cairn-admin">
        <nav id="primary-nav"><button type="button" class="btn btn-primary" id="primary-nav-action">New</button></nav>
        <nav id="secondary-nav"><button type="button" class="btn btn-primary" id="secondary-nav-action">Filter</button></nav>
      </div></body>`
    );
    expect(findings).toEqual([]);
  });

  // (f) The other half of (e): two fills inside the SAME nav landmark still compete, so the fix is
  // per-element keying, not a blanket exemption for every nav.
  it('fires when two filled actions sit inside one nav landmark', async () => {
    const findings = await findingsFor(
      `${THEME}<body><div data-theme="cairn-admin">
        <nav id="primary-nav">
          <button type="button" class="btn btn-primary" id="nav-one">One</button>
          <button type="submit" class="btn btn-primary" id="nav-two">Two</button>
        </nav>
      </div></body>`
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('nav-one');
    expect(findings[0].message).toContain('nav-two');
  });
});
