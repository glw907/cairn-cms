// cairn-cms: the selected-segment idiom rule (supersedes the old dark-only hardcoded .btn-active
// fill and its hover step) and the widened outline/dash ink repair, both living in cairn-idiom and
// keyed on all five forms daisyUI (and this admin) treat as selected: .btn-active,
// [aria-pressed='true'], [aria-checked='true'], a non-false non-empty [aria-current], and a
// checked radio styled as a join segment. Every color comparison resolves through the shared
// resolveColor oracle, every state read through the shared styleOf probe, and the hairline's own
// contrast numbers are painted and composited through the audit's own color module, never
// hand-rolled.
import { describe, expect, it } from 'vitest';
import { composite, contrastRatio as rgbaContrastRatio, type Rgba } from '../../lib/audit/color.js';
import { renderInTheme, resolveColor, styleOf, type IdiomState, type Theme } from './_idiom-probe.js';

const THEMES: Theme[] = ['cairn-admin', 'cairn-admin-dark'];
const STATES: IdiomState[] = ['rest', 'hover', 'focus-visible', 'active'];

const WASH = 'color-mix(in oklab, var(--color-base-content) 7%, var(--color-base-100))';
const WASH_HOVER = 'color-mix(in oklab, var(--color-base-content) 12%, var(--color-base-100))';
// The seed hairline values: light from the 55% base-content mix segmented-control.ts's
// segmentTintClass already compiles to from ring-base-content/55, dark from the superseded rule's
// own locked oklch(57% 0.012 75). Both clear 3:1 against base-100, but neither clears 3:1 against
// a resting sibling's own 22% edge composited on base-100, so the shipped HAIRLINE below moves
// each in lightness only.
const SEED_HAIRLINE: Record<Theme, string> = {
  'cairn-admin': 'color-mix(in oklab, var(--color-base-content) 55%, transparent)',
  'cairn-admin-dark': 'oklch(57% 0.012 75)',
};
// The shipped hairline, moved in lightness from the seed above: the same color-mix family in
// light (55% to 65%), the same oklch literal's own L channel in dark (57% to 70%).
const HAIRLINE: Record<Theme, string> = {
  'cairn-admin': 'color-mix(in oklab, var(--color-base-content) 65%, transparent)',
  'cairn-admin-dark': 'oklch(70% 0.012 75)',
};
// The plain button hairline edge, the resting sibling a selected segment sits beside in a join.
const RESTING_EDGE = 'color-mix(in oklab, var(--color-base-content) 22%, transparent)';

/**
 * A computed color's chroma read straight off Chromium's own serialization: a flat `oklch(L C H)`
 * literal serializes chroma as its own second channel; a `color-mix(in oklab, ...)` chain (every
 * daisyUI variant's own active-fill recipe, and the neutral wash itself) serializes to
 * `oklab(L a b)`, whose chroma is the a/b vector's magnitude, since oklab is oklch's own Cartesian
 * form. Both read the same physical quantity, so this discriminates a variant's kept accent from
 * the neutral wash without needing to know which serialization a given theme or state produces.
 */
function backgroundChroma(computedColor: string): number {
  const nums = computedColor.match(/-?[\d.]+/g);
  if (!nums || nums.length < 3) throw new Error(`not an oklch/oklab color: ${computedColor}`);
  if (computedColor.startsWith('oklch')) return Number(nums[1]);
  if (computedColor.startsWith('oklab')) {
    const a = Number(nums[1]);
    const b = Number(nums[2]);
    return Math.sqrt(a * a + b * b);
  }
  throw new Error(`not an oklch/oklab color: ${computedColor}`);
}

/**
 * A computed color as sRGB bytes, resolved by painting it rather than by parsing color syntax, the
 * discipline `src/lib/audit/color.ts` documents for the audit's own rules: every color in this
 * sheet serializes in its authored oklch/oklab space, and an out-of-gamut token renders clipped,
 * so the canvas is the one reader that reports the pixels a person actually sees.
 */
function paintedRgba(color: string): Rgba {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('the browser gave no 2d canvas context');
  // A string the browser refuses leaves fillStyle at whatever it already held, so the sentinel
  // separates a refusal from a color that legitimately resolves to it.
  context.fillStyle = '#ff00ff';
  context.fillStyle = color;
  if (context.fillStyle === '#ff00ff') throw new Error(`the browser refused the color: ${color}`);
  context.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
  return { r, g, b, a: a / 255 };
}

/** The WCAG contrast ratio between two colors as `getComputedStyle` serializes them. */
function contrastRatio(a: string, b: string): number {
  return rgbaContrastRatio(paintedRgba(a), paintedRgba(b));
}

/**
 * Mounts `html` and returns its first element plus a cleanup function. The `.btn` base rule
 * transitions `background-color`, `border-color`, and `color` over 0.2s, so a state read taken
 * straight after real input would catch a mid-interpolation frame; every mount disables it up
 * front.
 */
function mount(theme: Theme, html: string): { el: HTMLElement; cleanup: () => void } {
  const { wrapper, cleanup } = renderInTheme(html, theme);
  const el = wrapper.firstElementChild as HTMLElement;
  el.style.transition = 'none';
  return { el, cleanup };
}

/**
 * The five forms a control counts as selected, each building a `<class>`-carrying element so the
 * same table drives a plain, a color-variant, and an outline/dash mount.
 */
const SELECTED_FORMS: { name: string; markup: (className: string) => string }[] = [
  { name: '.btn-active', markup: (className) => `<button class="${className} btn-active">Save</button>` },
  {
    name: "aria-pressed='true'",
    markup: (className) => `<button class="${className}" aria-pressed="true">Save</button>`,
  },
  {
    name: "aria-checked='true'",
    markup: (className) => `<button class="${className}" aria-checked="true">Save</button>`,
  },
  {
    name: "aria-current='page'",
    // A button, matching Pagination.svelte's own current-page markup (join-item btn ...
    // aria-current), not an anchor: an href-less <a> is not keyboard-focusable, which would fail
    // the focus-visible read below for a form no real call site renders as a link.
    markup: (className) => `<button class="${className}" aria-current="page">Save</button>`,
  },
  {
    name: 'a checked radio join segment',
    markup: (className) => `<input type="radio" class="${className}" checked />`,
  },
];

// Rule 11 (the outline/dash ink repair) is proven on three of the five forms, the subset the
// acceptance names explicitly: a class form, an attribute form, and the checked-input form. The
// two element forms support an exact-ink check (resolveColor's context probe needs a real child,
// which a replaced <input> element does not render); the checked-input form gets a contrast-only
// check instead.
const OUTLINE_ELEMENT_FORMS = SELECTED_FORMS.filter((f) => ['.btn-active', "aria-pressed='true'"].includes(f.name));
const OUTLINE_RADIO_FORM = SELECTED_FORMS.find((f) => f.name === 'a checked radio join segment')!;

describe.each(THEMES)('the selected segment (%s)', (theme) => {
  const EXPECTED_BG: Record<IdiomState, string> = {
    rest: WASH,
    hover: WASH_HOVER,
    'focus-visible': WASH,
    active: WASH,
  };

  it.each(SELECTED_FORMS)('$name renders the wash, weight 600, and the hairline at every state', async ({ markup }) => {
    const { el, cleanup } = mount(theme, markup('join-item btn'));
    try {
      for (const state of STATES) {
        expect(await styleOf(el, 'background-color', state)).toBe(resolveColor(EXPECTED_BG[state], theme));
        expect(await styleOf(el, 'border-top-color', state)).toBe(resolveColor(HAIRLINE[theme], theme));
        expect(await styleOf(el, 'font-weight', state)).toBe('600');
      }
    } finally {
      cleanup();
    }
  });

  // daisyUI's own :checked rule sets --btn-fg to --color-primary-content on any checked .btn
  // regardless of variant; the selected-segment rule resets it back to the plain ink for the
  // non-variant case, so a checked radio join segment reads its own text ink, never
  // primary-content painted on the neutral wash.
  it("resolves a checked radio segment's ink to the selected ink, at 4.5:1 or better against the wash", () => {
    const { el, cleanup } = mount(theme, '<input type="radio" class="join-item btn" checked />');
    try {
      const style = getComputedStyle(el);
      expect(style.color).toBe(resolveColor('var(--color-base-content)', theme));
      expect(contrastRatio(style.color, style.backgroundColor)).toBeGreaterThanOrEqual(4.5);
    } finally {
      cleanup();
    }
  });

  // The unlayered rules this rule supersedes excluded the four disabled forms so daisyUI's own
  // disabled reset (--btn-bg/--btn-border to transparent) still wins; the sublayer rule keeps the
  // same exclusion.
  it('leaves a disabled selected control the transparent border daisyUI resets it to', () => {
    const disabledForms: Record<string, (el: HTMLElement) => void> = {
      'the .btn-disabled class': (el) => el.classList.add('btn-disabled'),
      'the disabled property': (el) => {
        (el as HTMLButtonElement).disabled = true;
      },
      'the aria-disabled attribute': (el) => el.setAttribute('aria-disabled', 'true'),
    };

    for (const [form, disable] of Object.entries(disabledForms)) {
      const { el, cleanup } = mount(theme, '<button class="join-item btn btn-active">Save</button>');
      disable(el);
      expect(getComputedStyle(el).borderTopColor, `${form} kept the active hairline`).toBe('rgba(0, 0, 0, 0)');
      cleanup();
    }
  });

  // The seed hairline values, measured against the pair table's own hairline rows: the hairline
  // composited on base-100 against base-100, and the same hairline against the resting sibling's
  // 22% edge composited on base-100. Both painted through the shared canvas oracle and measured
  // through the audit's own composite/contrastRatio, never hand-rolled.
  it('clears 3:1 on both pair-table rows, moved in lightness from the seed where the seed falls short', () => {
    const { el, cleanup } = mount(theme, '<button class="join-item btn btn-active">Save</button>');
    try {
      const border = getComputedStyle(el).borderTopColor;
      expect(border).toBe(resolveColor(HAIRLINE[theme], theme));

      const base100 = paintedRgba(resolveColor('var(--color-base-100)', theme));
      const restingEdgeOnBase100 = composite(paintedRgba(resolveColor(RESTING_EDGE, theme)), base100);

      const measure = (expr: string) => {
        const hairlineOnBase100 = composite(paintedRgba(resolveColor(expr, theme)), base100);
        return {
          ground: rgbaContrastRatio(hairlineOnBase100, base100),
          sibling: rgbaContrastRatio(hairlineOnBase100, restingEdgeOnBase100),
        };
      };

      const seed = measure(SEED_HAIRLINE[theme]);
      const shipped = measure(HAIRLINE[theme]);
      // Both ratios in each theme: the seed clears the base-100 ground row but falls short of the
      // resting-sibling row, which is why the shipped value moved in lightness.
      console.log(
        `selected-segment hairline seed (${theme}): ground ${seed.ground.toFixed(3)}:1, sibling ${seed.sibling.toFixed(3)}:1`,
      );
      console.log(
        `selected-segment hairline shipped (${theme}): ground ${shipped.ground.toFixed(3)}:1, sibling ${shipped.sibling.toFixed(3)}:1`,
      );
      expect(seed.ground).toBeGreaterThanOrEqual(3);
      expect(seed.sibling).toBeLessThan(3);
      expect(shipped.ground).toBeGreaterThanOrEqual(3);
      expect(shipped.sibling).toBeGreaterThanOrEqual(3);
    } finally {
      cleanup();
    }
  });
});

// Review focus 1: a color-variant selected control must keep its own accent fill, never the
// neutral wash, on every one of the five forms. The dark Warm Stone neutral family (the wash's own
// hue) sits at 0.009-0.014 chroma; --color-primary and --color-error each sit far higher. 0.05
// sits well clear of the neutral ceiling and well under either variant's own floor, so it
// discriminates a kept accent from a collapsed one regardless of theme or form.
describe.each(THEMES)('review focus 1: a variant selected control keeps its accent (%s)', (theme) => {
  it.each(SELECTED_FORMS)(
    '$name on btn-primary keeps a colored fill, not the neutral wash, at every state',
    async ({ markup }) => {
      const { el, cleanup } = mount(theme, markup('btn btn-primary'));
      try {
        for (const state of STATES) {
          expect(backgroundChroma(await styleOf(el, 'background-color', state))).toBeGreaterThan(0.05);
        }
      } finally {
        cleanup();
      }
    },
  );

  it.each(SELECTED_FORMS)(
    '$name on btn-error keeps a colored fill, not the neutral wash, at every state',
    async ({ markup }) => {
      const { el, cleanup } = mount(theme, markup('btn btn-error'));
      try {
        for (const state of STATES) {
          expect(backgroundChroma(await styleOf(el, 'background-color', state))).toBeGreaterThan(0.05);
        }
      } finally {
        cleanup();
      }
    },
  );
});

// The selected-segment rule sets --btn-fg, not color, so a plain selected segment's own text
// utility still wins over it, an unnested Tailwind declaration beating a nested sublayer's
// variable regardless of which of the five forms selected it.
describe.each(THEMES)('a selected plain segment keeps its own text utility (%s)', (theme) => {
  it.each(SELECTED_FORMS)('$name with text-error keeps the red ink, at every state', async ({ markup }) => {
    const { el, cleanup } = mount(theme, markup('btn text-error'));
    const reference = mount(theme, '<span class="text-error"></span>');
    try {
      const expectedInk = getComputedStyle(reference.el).color;
      for (const state of STATES) {
        expect(await styleOf(el, 'color', state)).toBe(expectedInk);
      }
    } finally {
      cleanup();
      reference.cleanup();
    }
  });
});

// Rule 11, widened: daisyUI fills an outline or dashed button carrying any of the five selected
// forms (its own selected rule sits directly in daisyui.l1.l2, which outranks
// .btn-outline/.btn-dash in the nested daisyui.l1.l2.l3) but leaves color at the variant's own
// --btn-color, so an outline or dashed selected control would otherwise paint its own ink on its
// own fill. Restating color off --btn-fg repairs it on either theme, for a neutral or a
// color-variant outline control alike.
describe.each(THEMES)("rule 11 widened: an outline/dash selected control's ink (%s)", (theme) => {
  it.each(OUTLINE_ELEMENT_FORMS)(
    '$name on a neutral btn-outline takes --btn-fg ink, legible at AA, at every state',
    async ({ markup }) => {
      const { el, cleanup } = mount(theme, markup('btn btn-outline'));
      try {
        for (const state of STATES) {
          const color = await styleOf(el, 'color', state);
          const backgroundColor = await styleOf(el, 'background-color', state);
          expect(color).toBe(resolveColor('var(--btn-fg, var(--color-base-content))', theme, el));
          expect(contrastRatio(color, backgroundColor)).toBeGreaterThanOrEqual(4.5);
        }
      } finally {
        cleanup();
      }
    },
  );

  it.each(OUTLINE_ELEMENT_FORMS)(
    '$name on btn-outline btn-primary takes --btn-fg ink, legible at AA, at every state',
    async ({ markup }) => {
      const { el, cleanup } = mount(theme, markup('btn btn-outline btn-primary'));
      try {
        for (const state of STATES) {
          const color = await styleOf(el, 'color', state);
          const backgroundColor = await styleOf(el, 'background-color', state);
          expect(color).toBe(resolveColor('var(--btn-fg, var(--color-base-content))', theme, el));
          expect(contrastRatio(color, backgroundColor)).toBeGreaterThanOrEqual(4.5);
        }
      } finally {
        cleanup();
      }
    },
  );

  // A replaced <input> element renders no child box, so resolveColor's context probe (a mounted
  // child) cannot read a cascaded value from it; the checked-radio form is proven by contrast
  // instead, the same legibility property the two element forms above prove exactly, still read
  // per state through the shared styleOf probe.
  it(`${OUTLINE_RADIO_FORM.name} on a neutral btn-outline reads legible ink at AA, at every state`, async () => {
    const { el, cleanup } = mount(theme, OUTLINE_RADIO_FORM.markup('btn btn-outline'));
    try {
      for (const state of STATES) {
        const color = await styleOf(el, 'color', state);
        const backgroundColor = await styleOf(el, 'background-color', state);
        expect(contrastRatio(color, backgroundColor)).toBeGreaterThanOrEqual(4.5);
      }
    } finally {
      cleanup();
    }
  });

  it(`${OUTLINE_RADIO_FORM.name} on btn-outline btn-primary reads legible ink at AA, at every state`, async () => {
    const { el, cleanup } = mount(theme, OUTLINE_RADIO_FORM.markup('btn btn-outline btn-primary'));
    try {
      for (const state of STATES) {
        const color = await styleOf(el, 'color', state);
        const backgroundColor = await styleOf(el, 'background-color', state);
        expect(contrastRatio(color, backgroundColor)).toBeGreaterThanOrEqual(4.5);
      }
    } finally {
      cleanup();
    }
  });
});

describe.each(THEMES)('loses to a utility (%s)', (theme) => {
  it('a selected segment with font-normal renders 400', () => {
    const { el, cleanup } = mount(theme, '<button class="join-item btn btn-active font-normal">Save</button>');
    try {
      expect(getComputedStyle(el).fontWeight).toBe('400');
    } finally {
      cleanup();
    }
  });

  it('btn-outline btn-active text-error keeps the red ink against rule 11', () => {
    const { el, cleanup } = mount(theme, '<button class="btn btn-outline btn-active text-error">Save</button>');
    const reference = mount(theme, '<span class="text-error"></span>');
    try {
      expect(getComputedStyle(el).color).toBe(getComputedStyle(reference.el).color);
    } finally {
      cleanup();
      reference.cleanup();
    }
  });
});

// Review focus 5: an aria-pressed segment in dark on a base-100 card, in every state, shows the
// wash, weight 600, and the hairline, with a focus ring that resolves to a color other than
// base-100 (which would vanish on the card it sits on).
describe('review focus 5: an aria-pressed segment on a dark base-100 card', () => {
  it('shows the wash, weight 600, the hairline, and a focus ring that is not base-100 at every state', async () => {
    const theme: Theme = 'cairn-admin-dark';
    const { wrapper, cleanup } = renderInTheme(
      '<div class="bg-base-100 p-4"><button class="join-item btn" aria-pressed="true">Save</button></div>',
      theme,
    );
    try {
      const el = wrapper.querySelector('button')!;
      el.style.transition = 'none';
      for (const state of STATES) {
        const expectedBg = state === 'hover' ? WASH_HOVER : WASH;
        expect(await styleOf(el, 'background-color', state)).toBe(resolveColor(expectedBg, theme));
        expect(await styleOf(el, 'border-top-color', state)).toBe(resolveColor(HAIRLINE[theme], theme));
        expect(await styleOf(el, 'font-weight', state)).toBe('600');
      }
      const outline = await styleOf(el, 'outline-color', 'focus-visible');
      expect(outline).not.toBe(resolveColor('var(--color-base-100)', theme));
    } finally {
      cleanup();
    }
  });
});
