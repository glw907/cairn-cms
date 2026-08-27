import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser } from 'playwright';
import { buildAdminCss } from '../../../scripts/build/build-admin-css.mjs';
import { composite, contrastRatio, type Rgba } from '../../lib/audit/color.js';
import { resolveColors, type RenderedPage } from '../../lib/audit/rendered.js';

// CONTRACT (Task 6, admin sheet fixes, 2026-08-27; extended 2026-08-27 fix round): daisyUI's
// `.checkbox`/`.radio` base rules border an unchecked control at a 20% `--color-base-content` mix
// when no color variant supplies `--input-color`, and no admin call site sets one, so every
// unchecked toggle in the admin falls to that fallback. `.input`/`.select`/`.textarea` resolve
// their border through the identical `--input-color` construction, and share the same gap when
// unfocused. `cairn-admin.css`'s own pinned unlayered rules 12 and 13 of 13 raise both edges to a
// 55% mix, the same one already locked for the scrollbar thumb and the outline chip border. This
// is the standing readback proof, in the same canvas-readback mold as
// status-chip-register-tuning.test.ts (paint the resolved color, then read the pixel back,
// because getComputedStyle alone hands back an unresolved oklch()/color-mix() string). Extends
// that sibling proof rather than editing it: the chip file measures a fill-vs-ground band, this
// file measures a border-vs-ground floor, on different controls.
const NON_TEXT_FLOOR = 3;

let browser: Browser;
let css: string;

beforeAll(async () => {
  browser = await chromium.launch();
  css = await buildAdminCss();
}, 60_000);

afterAll(async () => {
  await browser?.close();
});

const THEMES = ['cairn-admin', 'cairn-admin-dark'] as const;

type ControlTag = 'input' | 'select' | 'textarea';

/** One control's element markup for a tag/class pair: an `<input>` needs its own `type` attribute
 *  to match a checkbox/radio class (a `<select>` and a `<textarea>` need no `type`); a `<select>`
 *  needs a child `<option>` to have anything to render; a `<textarea>` needs no content. */
function controlMarkup(tag: ControlTag, cls: string): string {
  if (tag === 'input') {
    const type = cls === 'checkbox' ? 'checkbox' : cls === 'radio' ? 'radio' : 'text';
    return `<input class="${cls}" type="${type}" />`;
  }
  if (tag === 'select') return `<select class="${cls}"><option>x</option></select>`;
  return `<textarea class="${cls}"></textarea>`;
}

/** One control's unstyled/unchecked/unfocused border, composited onto the plain admin row ground
 *  (base-100), read from the real compiled sheet through a real page, the same substrate every
 *  other rendered contrast proof in this repo uses. `tag` selects the element (an `<input>` for
 *  the checkbox/radio family, or the matching tag for the `.input`/`.select`/`.textarea` field
 *  family); `cls` is both the class and, for an `<input>`, the `type` attribute. An optional
 *  `overrideCss` string appends after the compiled sheet, for the falsifiability proofs below. */
async function readEdge(
  theme: (typeof THEMES)[number],
  tag: ControlTag,
  cls: string,
  overrideCss = '',
): Promise<{ border: Rgba; ground: Rgba }> {
  const page = await browser.newPage();
  try {
    await page.setContent(
      `<!doctype html><html><head><style>${css}\n${overrideCss}</style></head><body>` +
        `<div data-theme="${theme}"><div style="background: var(--color-base-100); padding: 20px;">` +
        `${controlMarkup(tag, cls)}` +
        `</div></div></body></html>`,
      { waitUntil: 'load' },
    );
    const raw = await page.evaluate((cls) => {
      const el = document.querySelector('.' + cls)!;
      const ground = el.parentElement!;
      return {
        border: getComputedStyle(el).borderColor,
        ground: getComputedStyle(ground).backgroundColor,
      };
    }, cls);
    const [border, ground] = await resolveColors(page as unknown as RenderedPage, [raw.border, raw.ground]);
    if (!border || !ground) throw new Error(`could not resolve an edge color for ${cls}/${theme}`);
    return { border, ground };
  } finally {
    await page.close();
  }
}

describe('unchecked checkbox/radio edge contrast', () => {
  describe.each(THEMES)('%s', (theme) => {
    it('checkbox edge clears the >= 3:1 non-text floor against base-100', async () => {
      const { border, ground } = await readEdge(theme, 'input', 'checkbox');
      const ratio = contrastRatio(composite(border, { ...ground, a: 1 }), ground);
      expect(ratio).toBeGreaterThanOrEqual(NON_TEXT_FLOOR);
    });

    it('radio edge clears the >= 3:1 non-text floor against base-100', async () => {
      const { border, ground } = await readEdge(theme, 'input', 'radio');
      const ratio = contrastRatio(composite(border, { ...ground, a: 1 }), ground);
      expect(ratio).toBeGreaterThanOrEqual(NON_TEXT_FLOOR);
    });
  });

  // FALSIFIABILITY, part of this task's own acceptance: the assertions above have to be capable
  // of failing, not merely capable of passing. Overriding the pinned rule's 55% mix back down to
  // daisyUI's stock 20% fallback (the exact construction the rule replaces) reproduces the
  // pre-fix measurement (1.492:1 light / 1.773:1 dark, both under the 3:1 floor this suite
  // checks), proving the assertions above are load-bearing rather than vacuous. Restoring 55%
  // (what the shipped sheet actually ships, exercised by every case above) turns it green again.
  // Covers all four theme/control combinations, not only light/checkbox: a combined
  // `:is(.checkbox, .radio):not(..., :indeterminate, ...)` revert looked right but silently never
  // applied to the radio arm, since an unnamed, ungrouped `<input type="radio">` matches
  // `:indeterminate` by the HTML spec's radio-button-group algorithm (confirmed empirically, the
  // same fact the real pinned rule's own comment records), so excluding `:indeterminate` excludes
  // the very radio the override exists to hit; the radio cases silently measured the shipped 55%
  // rule instead of the reverted 20% one and passed for the wrong reason. Each control's revert
  // below mirrors the real pinned rule's own asymmetric exclusion set exactly (`.checkbox`
  // excludes `:indeterminate`, `.radio` does not), swapping only the mix percentage.
  describe.each([
    ['cairn-admin', 'checkbox'],
    ['cairn-admin-dark', 'checkbox'],
    ['cairn-admin', 'radio'],
    ['cairn-admin-dark', 'radio'],
  ] as const)('is falsifiable: reverting the pinned mix on %s/%s', (theme, cls) => {
    it('fails the same check', async () => {
      const exclude = cls === 'checkbox' ? ':not(:checked, :indeterminate, [aria-checked=\'true\'])' : ':not(:checked, [aria-checked=\'true\'])';
      const revert =
        ":where([data-theme='cairn-admin'], [data-theme='cairn-admin-dark']) " +
        `.${cls}${exclude} ` +
        '{ border-color: color-mix(in oklab, var(--color-base-content) 20%, transparent) !important; }';
      const { border, ground } = await readEdge(theme, 'input', cls, revert);
      const ratio = contrastRatio(composite(border, { ...ground, a: 1 }), ground);
      expect(ratio).toBeLessThan(NON_TEXT_FLOOR);
    });
  });
}, 60_000);

describe('unfocused field-family edge contrast', () => {
  const FIELDS: { tag: ControlTag; cls: string }[] = [
    { tag: 'input', cls: 'input' },
    { tag: 'select', cls: 'select' },
    { tag: 'textarea', cls: 'textarea' },
  ];

  describe.each(THEMES)('%s', (theme) => {
    it.each(FIELDS)('$cls edge clears the >= 3:1 non-text floor against base-100', async ({ tag, cls }) => {
      const { border, ground } = await readEdge(theme, tag, cls);
      const ratio = contrastRatio(composite(border, { ...ground, a: 1 }), ground);
      expect(ratio).toBeGreaterThanOrEqual(NON_TEXT_FLOOR);
    });
  });

  // Same falsifiability discipline as the checkbox/radio suite above, for the sibling rule
  // (pinned unlayered rule 13 of 13) this task adds: reverting the field family's mix back to the
  // daisyUI 20% fallback reproduces the pre-fix measurement (1.492:1 light / 1.773:1 dark, both
  // under the 3:1 floor), proving the field-family assertions above are load-bearing too.
  it('is falsifiable: reverting the pinned field-family mix to the daisyUI 20% fallback fails the same check', async () => {
    const revert =
      ":where([data-theme='cairn-admin'], [data-theme='cairn-admin-dark']) " +
      ':is(.input, .select, .textarea):not(:focus, :focus-within) ' +
      '{ border-color: color-mix(in oklab, var(--color-base-content) 20%, transparent) !important; }';
    const { border, ground } = await readEdge('cairn-admin', 'input', 'input', revert);
    const ratio = contrastRatio(composite(border, { ...ground, a: 1 }), ground);
    expect(ratio).toBeLessThan(NON_TEXT_FLOOR);
  });
}, 60_000);
