// The vertical-alignment recipes, measured on real layout rather than asserted from a class name.
// A class string in the markup proves nothing about where the ink lands, which is the whole reason
// the 2026-08 inventory had to render the admin to find these three rows at all.
//
// The measurement follows the same four rules the inventory's own module
// (src/tests/lab/vertical-metrics.ts) is built on, restated here because that module imports the
// audit's Node-side file reader and so cannot load in this browser project:
//   1. An icon beside a text block pairs with that block's FIRST LINE, never the block.
//   2. Type metrics resolve from the element that renders the line, never its container.
//   3. Measure INK, not element boxes: SVG geometry through the screen CTM, text geometry from a
//      Range's client rect plus the face's own canvas-measured metrics.
//   4. A padded chip is a BOX. Its padding-box centre is what the eye levels, so the row's declared
//      alignment picks the metric: a baseline row reads baselines, a levelled box reads centres.
// The numbers each test asserts were reproduced against the unfixed markup first, and matched the
// inventory's own readings for the three confirmed rows: -2.50px, +5.00px and -2.33px.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
// The compiled sheet, not the source partial: these are geometry assertions, so they need daisyUI's
// real button sizing and Tailwind's real utilities, which only the built artifact carries.
import compiledAdminCss from '../../../dist/components/cairn-admin.css?inline';
import CairnTidySettings from '../../lib/components/CairnTidySettings.svelte';
import EditorToolbar from '../../lib/components/EditorToolbar.svelte';
import FieldRowHarness from './_FieldRowHarness.svelte';
import { defaultTidyConventions } from '../../lib/nav/site-config.js';
import type { SettingsData } from '../../lib/sveltekit/content-routes.js';

/** One canvas context for every font measurement here, refused loudly rather than left nullable. */
function paintContext(): CanvasRenderingContext2D {
  const context = document.createElement('canvas').getContext('2d');
  if (!context) throw new Error('the browser gave no 2d canvas context');
  return context;
}

const paint = paintContext();

/** The first text node under `el` that renders anything, which is the node the first line draws. */
function firstTextNode(el: Element): Text {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode() as Text | null;
  while (node && !node.data.trim()) node = walker.nextNode() as Text | null;
  if (!node) throw new Error(`no rendered text under ${el.tagName}`);
  return node;
}

/**
 * The alphabetic baseline and the cap centre of `el`'s first line, both in client pixels.
 *
 * The metrics come off the element that OWNS the line (rule 2), and the baseline formula carries
 * the half-leading term so it stays exact whether the engine hands back the font box (Chromium
 * today) or the line box.
 */
function firstLine(el: Element): { baseline: number; capCentre: number; lines: number } {
  const node = firstTextNode(el);
  const owner = node.parentElement;
  if (!owner) throw new Error('a text node with no element to read metrics off');
  const range = document.createRange();
  const lead = node.data.length - node.data.trimStart().length;
  range.setStart(node, lead);
  range.setEnd(node, node.data.trimEnd().length);
  // One client rect per rendered line, so the count is what proves a wrapping fixture wraps.
  const rects = range.getClientRects();
  const rect = rects[0];
  if (!rect) throw new Error('the first line rendered no client rect');
  paint.font = getComputedStyle(owner).font;
  const face = paint.measureText('Hxy');
  const fontBox = face.fontBoundingBoxAscent + face.fontBoundingBoxDescent;
  const capHeight = paint.measureText('H').actualBoundingBoxAscent;
  const baseline = rect.top + (rect.height - fontBox) / 2 + face.fontBoundingBoxAscent;
  return { baseline, capCentre: baseline - capHeight / 2, lines: rects.length };
}

/**
 * The vertical centre of an SVG's drawn ink, mapped into client pixels through each shape's own
 * screen CTM. Only the shapes that paint are unioned: reading the root `<svg>`'s own box would take
 * in whatever a `<defs>` holds and would report the viewport rather than the ink.
 */
function inkCentre(svg: Element): number {
  let top = Infinity;
  let bottom = -Infinity;
  for (const shape of svg.querySelectorAll('path, rect, circle, ellipse, line, polyline, polygon')) {
    const graphic = shape as unknown as SVGGraphicsElement;
    const ctm = graphic.getScreenCTM();
    if (!ctm) continue;
    const box = graphic.getBBox();
    top = Math.min(top, box.y * ctm.d + ctm.f);
    bottom = Math.max(bottom, (box.y + box.height) * ctm.d + ctm.f);
  }
  if (!Number.isFinite(top)) throw new Error('the svg drew no measurable shape');
  return (top + bottom) / 2;
}

/** The vertical centre of `el`'s padding box, which is what a painted chip levels on (rule 4). */
function paddingBoxCentre(el: Element): number {
  const rect = el.getBoundingClientRect();
  const style = getComputedStyle(el);
  const top = rect.top + parseFloat(style.borderTopWidth);
  const bottom = rect.bottom - parseFloat(style.borderBottomWidth);
  return (top + bottom) / 2;
}

/** The vertical centre of the first line BOX of a single-line block, its own leading included. */
function firstLineBoxCentre(el: Element): number {
  return el.getBoundingClientRect().top + parseFloat(getComputedStyle(el).lineHeight) / 2;
}

/** The toolbar in its Write mode, the state whose tab carries the repaired glyph wrapper. */
async function renderWriteToolbar() {
  return await render(EditorToolbar, { format: () => {}, mode: 'write' as const, onMode: () => {} });
}

function settingsData(over: Partial<SettingsData> = {}): SettingsData {
  return {
    enabled: true,
    tidyEnabled: true,
    keyConfigured: true,
    keyStatus: 'valid',
    model: 'claude-sonnet-4-6',
    modelLabel: 'Claude Sonnet',
    conventions: defaultTidyConventions(),
    saved: false,
    ...over,
  };
}

/**
 * The glyph CairnTidySettings' three labels render, as raw markup. `.cairn-icon-label` is a sheet
 * recipe rather than a component, and a consumer composes it from their own icon, so the fixture
 * below is markup rather than a mounted screen. The size classes are the call sites' own.
 */
const iconLabelGlyph =
  '<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 flex-none text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M20 6 9 17l-5-5" /></svg>';

/**
 * A `.cairn-icon-label` holding `text`, mounted in a container `width` wide so the caller controls
 * how many lines the word wraps to. Returns the mounted host for the caller to remove.
 */
function mountIconLabel(width: string, text: string) {
  const host = document.createElement('div');
  host.style.width = width;
  host.innerHTML = `<span class="cairn-icon-label gap-1.5 type-meta font-medium">${iconLabelGlyph}${text}</span>`;
  document.body.appendChild(host);
  const label = host.querySelector('.cairn-icon-label');
  const glyph = host.querySelector('svg');
  if (!label || !glyph) throw new Error('the icon-label fixture did not render');
  return { host, label, glyph };
}

/** The single element under `root` whose own text is exactly `text`. */
function elementWithText(root: Element, text: string): HTMLElement {
  const found = Array.from(root.querySelectorAll<HTMLElement>('div, span, p')).filter(
    (el) => el.textContent?.trim() === text,
  );
  if (found.length === 0) throw new Error(`no element renders "${text}"`);
  return found[found.length - 1];
}

let sheet: HTMLStyleElement;

beforeAll(() => {
  // The sheet is scoped under the admin theme roots, so the mounted markup needs one above it.
  document.documentElement.setAttribute('data-theme', 'cairn-admin');
  sheet = document.createElement('style');
  sheet.textContent = compiledAdminCss;
  document.head.appendChild(sheet);
});

afterAll(async () => {
  sheet.remove();
  document.documentElement.removeAttribute('data-theme');
  await page.viewport(1280, 720);
});

describe('the icon-plus-word label exposes its own text baseline', () => {
  // The three developer-tier rows in CairnTidySettings each declare `sm:items-baseline` and pair a
  // label that is a glyph plus a word with a plain run of text. Before the recipe the label handed
  // its row the icon's bottom margin edge as a baseline, and the word sat 2.50px high.
  for (const width of [768, 1280]) {
    it(`levels the label's baseline on its value's at ${width}px`, async () => {
      await page.viewport(width, 720);
      const screen = await render(CairnTidySettings, { data: settingsData() });
      const labels = screen.container.querySelectorAll<HTMLElement>('.cairn-icon-label');

      expect(labels.length).toBe(3);
      for (const label of labels) {
        const value = label.nextElementSibling;
        if (!value) throw new Error('the row rendered no value beside its label');
        const delta = firstLine(label).baseline - firstLine(value).baseline;
        // Exact, not the 1px bar the other rows carry. Label and value render the same type role
        // off the same row, so a levelled row reads 0.00 and anything else is a real defect.
        expect(Math.abs(delta), `${label.textContent?.trim()} baseline delta`).toBeLessThanOrEqual(
          0.01,
        );
      }
    });
  }
});

describe('an icon-plus-word label pairs its glyph with the FIRST line, wrapped or not', () => {
  // Rule 1 again, this time against the recipe itself rather than a call site. cairn's own three
  // labels never wrap (they sit under `sm:min-w-[8.5rem]`), but the recipe ships in the sheet and a
  // consumer's label will, so the shipped contract is what these two measure.
  it('holds the glyph on the first line of a label that wraps to three', () => {
    const { host, label, glyph } = mountIconLabel('6rem', 'Tidy conventions for this site');
    try {
      const line = firstLine(label);
      // The positive control: the fixture really wraps, so the reading exercises the trap rather
      // than passing as a single-line label in disguise.
      expect(line.lines).toBe(3);
      expect(Math.abs(inkCentre(glyph) - line.capCentre)).toBeLessThanOrEqual(1);
    } finally {
      host.remove();
    }
  });

  it('reads the same on a label that does not wrap', () => {
    // The non-wrapping case the pass originally fixed. The two readings agreeing is the point: the
    // glyph does not move when the label's word happens to wrap.
    const wide = mountIconLabel('30rem', 'Tidy conventions for this site');
    const narrow = mountIconLabel('6rem', 'Tidy conventions for this site');
    try {
      const wideLine = firstLine(wide.label);
      expect(wideLine.lines).toBe(1);
      const wideDelta = inkCentre(wide.glyph) - wideLine.capCentre;
      const narrowDelta = inkCentre(narrow.glyph) - firstLine(narrow.label).capCentre;
      expect(Math.abs(wideDelta)).toBeLessThanOrEqual(1);
      expect(Math.abs(narrowDelta - wideDelta)).toBeLessThanOrEqual(0.5);
    } finally {
      wide.host.remove();
      narrow.host.remove();
    }
  });
});

describe('a painted chip levels on the line box it labels', () => {
  it('centres the developer pill on the heading beside it', async () => {
    await page.viewport(1280, 720);
    const screen = await render(CairnTidySettings, { data: settingsData() });
    const heading = elementWithText(screen.container, 'Tidy is set up for this site');
    const slot = screen.container.querySelector('.cairn-line-slot');
    if (!slot) throw new Error('the head row rendered no line slot');
    const pill = slot.firstElementChild;
    if (!pill) throw new Error('the line slot holds no chip');

    const centre = paddingBoxCentre(pill);
    // The two readings of the same line agree here, so the chip is level on both: the line box the
    // inventory measured, and the cap band the eye actually follows.
    expect(Math.abs(centre - firstLineBoxCentre(heading))).toBeLessThanOrEqual(1);
    expect(Math.abs(centre - firstLine(heading).capCentre)).toBeLessThanOrEqual(1);
  });
});

describe('an icon sharing a row with text centres on the line, not on its baseline', () => {
  it('puts the Write tab glyph on the cap centre of its own label', async () => {
    await page.viewport(1280, 720);
    const screen = await renderWriteToolbar();
    const tab = screen.container.querySelector('#cairn-tab-write');
    if (!tab) throw new Error('the toolbar rendered no Write tab');
    const glyph = tab.querySelector('svg');
    if (!glyph) throw new Error('the Write tab rendered no glyph');

    const delta = inkCentre(glyph) - firstLine(tab).capCentre;
    expect(Math.abs(delta)).toBeLessThanOrEqual(1);
  });

  it('reads the same as an icon placed directly in a button, the shape the admin already uses', async () => {
    // The control: the thirteen correct icon-in-btn rows the inventory measured put their glyph
    // straight into the button, so it is a flex item the button centres. This asserts the Write
    // tab's repaired reading IS that reading, rather than a nudge that happens to land nearby. The
    // control's own markup is untouched by this pass, so it also measures what the repair did NOT
    // move.
    await page.viewport(1280, 720);
    const screen = await renderWriteToolbar();
    const control = document.createElement('div');
    control.innerHTML = `<button type="button" class="btn btn-sm"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 6 9 17l-5-5" /></svg>Write</button>`;
    document.body.appendChild(control);
    try {
      const button = control.querySelector('button');
      const glyph = control.querySelector('svg');
      const tab = screen.container.querySelector('#cairn-tab-write');
      const tabGlyph = tab?.querySelector('svg');
      if (!button || !glyph) throw new Error('the control button did not render');
      if (!tab || !tabGlyph) throw new Error('the toolbar rendered no Write tab');

      const controlDelta = inkCentre(glyph) - firstLine(button).capCentre;
      const tabDelta = inkCentre(tabGlyph) - firstLine(tab).capCentre;
      expect(Math.abs(tabDelta - controlDelta)).toBeLessThanOrEqual(0.5);
    } finally {
      control.remove();
    }
  });
});

describe('FieldRow', () => {
  it('levels a stacked field and a bare control on their bottom edges', async () => {
    await page.viewport(1280, 720);
    const screen = await render(FieldRowHarness, {});

    const control = screen.container.querySelector('[data-testid="field-control"]');
    const bare = screen.container.querySelector('[data-testid="bare-control"]');
    const field = screen.container.querySelector('label');
    if (!control || !bare || !field) throw new Error('the row did not render both children');

    const drop = control.getBoundingClientRect().bottom - bare.getBoundingClientRect().bottom;
    expect(Math.abs(drop)).toBeLessThanOrEqual(1);
    // The positive control: the labelled child really is the taller one, so the row exercises
    // bottom alignment rather than passing because both children happen to be the same height.
    expect(field.getBoundingClientRect().height).toBeGreaterThan(bare.getBoundingClientRect().height);
  });

  it('is still a row outside the admin theme root', async () => {
    // FieldRow ships on /admin-toolkit, so a consumer can mount it anywhere. Every rule in the
    // compiled sheet is scoped under a theme root, and `gap-control` is a cairn-only @utility a
    // consumer's own Tailwind build never even defines, so class names alone leave the component
    // computing as a stacked block: the whole contract, gone silently.
    await page.viewport(1280, 720);
    document.documentElement.removeAttribute('data-theme');
    try {
      const screen = await render(FieldRowHarness, {});
      const row = screen.container.querySelector('div');
      if (!row) throw new Error('the harness rendered no row');

      const style = getComputedStyle(row);
      expect(style.display).toBe('flex');
      expect(style.alignItems).toBe('flex-end');
      expect(parseFloat(style.columnGap)).toBeGreaterThan(0);
    } finally {
      document.documentElement.setAttribute('data-theme', 'cairn-admin');
    }
  });
});
