// cairn-cms: the button idiom rules: the plain hairline, the emphasis ladder's btn-neutral hover
// step, button type (weight 500 on plain and ghost, 600 elsewhere), the btn-sm padding, and the
// soft primary states. Every color comparison resolves through the shared resolveColor oracle, and
// every state read goes through the shared styleOf probe, so nothing here hand-serializes a color
// or hand-drives a pseudo-class.
import { describe, expect, it } from 'vitest';
import { renderInTheme, resolveColor, styleOf, type IdiomState, type Theme } from './_idiom-probe.js';

const THEMES: Theme[] = ['cairn-admin', 'cairn-admin-dark'];
const STATES: IdiomState[] = ['rest', 'hover', 'focus-visible', 'active'];

/**
 * Mounts one button and returns it plus a cleanup function. The .btn base rule transitions
 * background-color, border-color, and color over 0.2s, so a state read taken straight after real
 * input lands would catch a mid-interpolation frame; every mount disables it up front, the same
 * discipline the BtnActiveDarkGround suite already documents for its own mounts.
 */
function mountButton(theme: Theme, className: string, extra = ''): { el: HTMLButtonElement; cleanup: () => void } {
  const { wrapper, cleanup } = renderInTheme(`<button class="${className}" ${extra}>Save</button>`, theme);
  const el = wrapper.querySelector('button')!;
  el.style.transition = 'none';
  return { el, cleanup };
}

// The Outcome table: --btn-bg and --btn-border read as painted background-color/border-top-color,
// each resolved against the same color-mix(...)/var(...) expression through the oracle.
const HAIRLINE_BORDER = 'color-mix(in oklab, var(--color-base-content) 22%, transparent)';
const HAIRLINE_REST_BG = 'var(--color-base-100)';
const HAIRLINE_LIFTED_BG = 'color-mix(in oklab, var(--color-base-content) 5%, var(--color-base-100))';

describe.each(THEMES)('the plain btn hairline (%s)', (theme) => {
  const EXPECTED: Record<IdiomState, { bg: string; border: string }> = {
    rest: { bg: HAIRLINE_REST_BG, border: HAIRLINE_BORDER },
    hover: { bg: HAIRLINE_LIFTED_BG, border: HAIRLINE_BORDER },
    'focus-visible': { bg: HAIRLINE_REST_BG, border: HAIRLINE_BORDER },
    active: { bg: HAIRLINE_LIFTED_BG, border: HAIRLINE_BORDER },
  };

  it.each(STATES)('holds the fill and edge the Outcome table states at %s', async (state) => {
    const { el, cleanup } = mountButton(theme, 'btn');
    try {
      const bg = await styleOf(el, 'background-color', state);
      const border = await styleOf(el, 'border-top-color', state);
      expect(bg).toBe(resolveColor(EXPECTED[state].bg, theme));
      expect(border).toBe(resolveColor(EXPECTED[state].border, theme));
    } finally {
      cleanup();
    }
  });

  it('keeps a focus-visible outline color other than base-100, which would vanish on a base-100 card', async () => {
    const { el, cleanup } = mountButton(theme, 'btn');
    try {
      const outline = await styleOf(el, 'outline-color', 'focus-visible');
      expect(outline).not.toBe(resolveColor('var(--color-base-100)', theme));
    } finally {
      cleanup();
    }
  });

  // A markup utility still wins over the fill variable's own downstream property: the compiled
  // sheet already carries bg-base-200 (existing markup uses it), an unnested Tailwind utility that
  // sets background-color directly, which outranks the nested sublayer's --btn-bg regardless of
  // what that variable resolves to.
  it('loses to a bg-base-200 utility the compiled sheet already carries', () => {
    const { el, cleanup } = mountButton(theme, 'btn bg-base-200');
    try {
      expect(getComputedStyle(el).backgroundColor).toBe(resolveColor('var(--color-base-200)', theme));
    } finally {
      cleanup();
    }
  });

  // bg-base-200 sets background-color directly, so it cannot tell a layered --btn-bg setter from
  // an unlayered one (both would lose the same way). This host rule sets --btn-bg itself, from the
  // utilities layer's own unnested position, the same cascade slot a real Tailwind utility
  // compiles into, so it distinguishes the sublayer rule from an unlayered stand-in.
  it('loses to a host utility that sets --btn-bg directly', () => {
    const hostCss = '@layer utilities { .no-hairline { --btn-bg: red; } }';
    const { wrapper, cleanup } = renderInTheme('<button class="btn no-hairline">Save</button>', theme, { hostCss });
    try {
      const el = wrapper.querySelector('button')!;
      expect(getComputedStyle(el).getPropertyValue('--btn-bg')).toBe('red');
    } finally {
      cleanup();
    }
  });

  // A btn-disabled plain button is excluded from the hairline rule entirely, so it must read the
  // exact same fill and edge as any other excluded variant's own disabled form: daisyUI zeroes
  // both to the same transparent values regardless of which variant class was disabled.
  it('leaves a btn-disabled plain button the same disabled look daisyUI gives every variant', () => {
    const plain = mountButton(theme, 'btn btn-disabled');
    const variant = mountButton(theme, 'btn btn-secondary btn-disabled');
    try {
      expect(getComputedStyle(plain.el).backgroundColor).toBe(getComputedStyle(variant.el).backgroundColor);
      expect(getComputedStyle(plain.el).borderTopColor).toBe(getComputedStyle(variant.el).borderTopColor);
    } finally {
      plain.cleanup();
      variant.cleanup();
    }
  });

  // Each of the five forms a control counts as selected. None of them may read the hairline's own
  // rest fill or edge; what each reads instead is proven by the selected-segment rule's own test.
  const SELECTED_FORMS: { name: string; markup: string }[] = [
    { name: '.btn-active', markup: '<button class="btn btn-active">Save</button>' },
    { name: "aria-pressed='true'", markup: '<button class="btn" aria-pressed="true">Save</button>' },
    { name: "aria-checked='true'", markup: '<button class="btn" aria-checked="true">Save</button>' },
    { name: 'aria-current (non-false, non-empty)', markup: '<a class="btn" aria-current="page">Save</a>' },
    {
      name: 'a checked radio styled as a join segment',
      markup: '<input type="radio" class="join-item btn" checked />',
    },
  ];

  it.each(SELECTED_FORMS)('$name does not take the hairline', ({ markup }) => {
    const { wrapper, cleanup } = renderInTheme(markup, theme);
    try {
      const el = wrapper.firstElementChild as HTMLElement;
      const style = getComputedStyle(el);
      expect(style.backgroundColor).not.toBe(resolveColor(HAIRLINE_REST_BG, theme));
      expect(style.borderTopColor).not.toBe(resolveColor(HAIRLINE_BORDER, theme));
    } finally {
      cleanup();
    }
  });
});

// The narrow selector: every daisyUI variant the hairline rule is not meant to restyle keeps
// daisyUI's own stock fill formula, read straight off daisyUI's own button.css, in every state.
// btn-neutral is asserted by its own ladder line below; btn-soft.btn-primary by the soft primary
// line below.
const STOCK_FILL_CASES: {
  name: string;
  className: string;
  rest: string;
  hover: string;
  focusVisible: string;
  active: string;
}[] = [
  {
    name: 'btn-ghost',
    className: 'btn btn-ghost',
    rest: '#0000',
    hover: 'color-mix(in oklab, var(--color-base-200), #000 7%)',
    focusVisible: 'var(--color-base-200)',
    active: 'color-mix(in oklab, var(--color-base-200), #000 5%)',
  },
  {
    name: 'btn-outline',
    className: 'btn btn-outline',
    rest: '#0000',
    hover: 'color-mix(in oklab, var(--color-base-200), #000 7%)',
    focusVisible: 'var(--color-base-200)',
    active: 'color-mix(in oklab, var(--color-base-200), #000 5%)',
  },
  ...(
    [
      ['btn-primary', '--color-primary'],
      ['btn-secondary', '--color-secondary'],
      ['btn-accent', '--color-accent'],
      ['btn-info', '--color-info'],
      ['btn-success', '--color-success'],
      ['btn-warning', '--color-warning'],
      ['btn-error', '--color-error'],
    ] as const
  ).map(([className, colorVar]) => ({
    name: className,
    className: `btn ${className}`,
    rest: `var(${colorVar})`,
    hover: `color-mix(in oklab, var(${colorVar}), #000 7%)`,
    focusVisible: `var(${colorVar})`,
    active: `color-mix(in oklab, var(${colorVar}), #000 5%)`,
  })),
];

describe.each(THEMES)('the narrow selector keeps daisyUI stock fill (%s)', (theme) => {
  it.each(STOCK_FILL_CASES)('$name matches its own stock formula in every state', async ({ className, ...expected }) => {
    const { el, cleanup } = mountButton(theme, className);
    try {
      expect(await styleOf(el, 'background-color', 'rest')).toBe(resolveColor(expected.rest, theme));
      expect(await styleOf(el, 'background-color', 'hover')).toBe(resolveColor(expected.hover, theme));
      expect(await styleOf(el, 'background-color', 'focus-visible')).toBe(resolveColor(expected.focusVisible, theme));
      expect(await styleOf(el, 'background-color', 'active')).toBe(resolveColor(expected.active, theme));
    } finally {
      cleanup();
    }
  });
});

describe.each(THEMES)('the btn-neutral hover step (%s)', (theme) => {
  it('hovers into --cairn-ink-hover', async () => {
    const { el, cleanup } = mountButton(theme, 'btn btn-neutral');
    try {
      expect(await styleOf(el, 'background-color', 'hover')).toBe(resolveColor('var(--cairn-ink-hover)', theme));
    } finally {
      cleanup();
    }
  });

  it('keeps daisyUI stock at rest, focus-visible, and active', async () => {
    const { el, cleanup } = mountButton(theme, 'btn btn-neutral');
    try {
      expect(await styleOf(el, 'background-color', 'rest')).toBe(resolveColor('var(--color-neutral)', theme));
      expect(await styleOf(el, 'background-color', 'focus-visible')).toBe(
        resolveColor('var(--color-neutral)', theme),
      );
      expect(await styleOf(el, 'background-color', 'active')).toBe(
        resolveColor('color-mix(in oklab, var(--color-neutral), #000 5%)', theme),
      );
    } finally {
      cleanup();
    }
  });

  // A held press still matches :hover, and this sublayer outranks daisyUI's own :active rule
  // regardless of specificity, so the hover rule's own :not(:active) guard is what lets the
  // pressed fill show through instead of the hover ink.
  it('shows the pressed fill, not the hover ink, once the button is also active', async () => {
    const { el, cleanup } = mountButton(theme, 'btn btn-neutral');
    try {
      expect(await styleOf(el, 'background-color', 'active')).not.toBe(
        resolveColor('var(--cairn-ink-hover)', theme),
      );
    } finally {
      cleanup();
    }
  });
});

describe.each(THEMES)('button type (%s)', (theme) => {
  it.each(['btn', 'btn btn-ghost'])('%s reads weight 500', (className) => {
    const { el, cleanup } = mountButton(theme, className);
    try {
      expect(getComputedStyle(el).fontWeight).toBe('500');
    } finally {
      cleanup();
    }
  });

  it.each(['btn btn-primary', 'btn btn-neutral', 'btn btn-soft btn-primary', 'btn btn-error'])(
    '%s keeps the stock weight 600',
    (className) => {
      const { el, cleanup } = mountButton(theme, className);
      try {
        expect(getComputedStyle(el).fontWeight).toBe('600');
      } finally {
        cleanup();
      }
    },
  );

  // A selected plain segment keeps the 600 every other selected control reads, rather than this
  // rule's 500: the weight rule's own exclusion list leaves it to daisyUI's default.
  it('leaves a selected plain segment at 600, not 500', () => {
    const { el, cleanup } = mountButton(theme, 'btn', 'aria-pressed="true"');
    try {
      expect(getComputedStyle(el).fontWeight).toBe('600');
    } finally {
      cleanup();
    }
  });

  // A markup utility still wins: Tailwind compiles font-semibold unnested, so it beats this
  // nested sublayer rule regardless of which weight the rule itself set.
  it('loses to a font-semibold utility the compiled sheet already carries', () => {
    const { el, cleanup } = mountButton(theme, 'btn font-semibold');
    try {
      expect(getComputedStyle(el).fontWeight).toBe('600');
    } finally {
      cleanup();
    }
  });
});

describe.each(THEMES)('btn-sm padding (%s)', (theme) => {
  it('btn-sm reads 14px padding', () => {
    const { el, cleanup } = mountButton(theme, 'btn btn-sm');
    try {
      expect(getComputedStyle(el).paddingLeft).toBe('14px');
      expect(getComputedStyle(el).paddingRight).toBe('14px');
    } finally {
      cleanup();
    }
  });

  it('leaves the default btn padding unchanged', () => {
    const { el, cleanup } = mountButton(theme, 'btn');
    try {
      expect(getComputedStyle(el).paddingLeft).toBe('16px');
    } finally {
      cleanup();
    }
  });

  // A markup utility still wins over the padding variable's own downstream property.
  it('loses to a px-2 utility the compiled sheet already carries, which keeps 8px', () => {
    const { el, cleanup } = mountButton(theme, 'btn btn-sm px-2 font-semibold');
    try {
      expect(getComputedStyle(el).paddingLeft).toBe('8px');
      expect(getComputedStyle(el).fontWeight).toBe('600');
    } finally {
      cleanup();
    }
  });
});

describe.each(THEMES)('soft primary states (%s)', (theme) => {
  const EXPECTED_BG: Record<IdiomState, string> = {
    rest: 'color-mix(in oklab, var(--color-primary) 10%, transparent)',
    hover: 'color-mix(in oklab, var(--color-primary) 15%, transparent)',
    'focus-visible': 'color-mix(in oklab, var(--color-primary) 15%, transparent)',
    active: 'color-mix(in oklab, var(--color-primary) 22%, transparent)',
  };

  it.each(STATES)('holds its own fill step at %s, with text pinned to --color-primary', async (state) => {
    const { el, cleanup } = mountButton(theme, 'btn btn-soft btn-primary');
    try {
      expect(await styleOf(el, 'background-color', state)).toBe(resolveColor(EXPECTED_BG[state], theme));
      expect(await styleOf(el, 'color', state)).toBe(resolveColor('var(--color-primary)', theme));
    } finally {
      cleanup();
    }
  });

  it('keeps a transparent edge at rest', () => {
    const { el, cleanup } = mountButton(theme, 'btn btn-soft btn-primary');
    try {
      expect(getComputedStyle(el).borderTopColor).toBe(resolveColor('transparent', theme));
    } finally {
      cleanup();
    }
  });

  it('leaves disabled to daisyUI entirely', () => {
    const soft = mountButton(theme, 'btn btn-soft btn-primary btn-disabled');
    const otherDisabled = mountButton(theme, 'btn btn-secondary btn-disabled');
    try {
      expect(getComputedStyle(soft.el).backgroundColor).toBe(getComputedStyle(otherDisabled.el).backgroundColor);
    } finally {
      soft.cleanup();
      otherDisabled.cleanup();
    }
  });

  // A markup utility still wins over the fill variable's own downstream property.
  it('loses to a bg-base-200 utility the compiled sheet already carries', () => {
    const { el, cleanup } = mountButton(theme, 'btn btn-soft btn-primary bg-base-200');
    try {
      expect(getComputedStyle(el).backgroundColor).toBe(resolveColor('var(--color-base-200)', theme));
    } finally {
      cleanup();
    }
  });
});

// A developer's own rounded-* utility on a plain daisyUI button still wins over the button
// family's own corner geometry, unaffected by any rule this file adds (none of them touch
// border-radius). rounded-full is already compiled into the admin sheet from existing markup, so
// it renders directly; rounded-none is not (the admin build scans only its own components), so it
// is supplied through a host sheet the way a consumer's own site sheet would.
describe.each(THEMES)("a developer's own rounded utility on a plain btn (%s)", (theme) => {
  it('rounded-full stays fully round', () => {
    const { wrapper, cleanup } = renderInTheme(
      '<button class="btn rounded-full">Save</button><span class="rounded-full cairn-ref"></span>',
      theme,
    );
    try {
      const btn = wrapper.querySelector('button')!;
      const ref = wrapper.querySelector('.cairn-ref')!;
      expect(getComputedStyle(btn).borderTopLeftRadius).toBe(getComputedStyle(ref).borderTopLeftRadius);
    } finally {
      cleanup();
    }
  });

  it('rounded-none stays square, supplied through a host sheet', () => {
    const hostCss = '@layer utilities { .rounded-none { border-radius: 0px; } }';
    const { wrapper, cleanup } = renderInTheme('<button class="btn rounded-none">Save</button>', theme, { hostCss });
    try {
      const btn = wrapper.querySelector('button')!;
      expect(getComputedStyle(btn).borderTopLeftRadius).toBe('0px');
    } finally {
      cleanup();
    }
  });
});
