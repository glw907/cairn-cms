// cairn-cms: the cairn-idiom sublayer's first two rules, proven against the compiled sheet: the
// .btn-primary warm lift (a --btn-shadow variable, held across every interaction state) and the
// .modal-box repair (daisyUI's own flat, theme-invariant black shadow, replaced with the same
// theme-adaptive elevation pair every other floating surface carries). Both were dead in
// @layer components until the sublayer move, since a components-layer rule cannot outrank
// daisyUI's own utilities-layer declarations regardless of specificity. Each rule's test proves
// two things: it renders, and a markup utility still beats it.
import { describe, expect, it } from 'vitest';
import { renderInTheme, styleOf, type IdiomState, type Theme } from './_idiom-probe.js';

const THEMES: Theme[] = ['cairn-admin', 'cairn-admin-dark'];
const STATES: IdiomState[] = ['rest', 'hover', 'focus-visible', 'active'];

// The lift's literal --btn-shadow value per theme: light at the ratified warm lift, dark at the
// dark theme's own --cairn-shadow tint, both at the same geometry and alpha.
// Both are literal oklch colors, not a var(...)/color-mix(...) expression, so there is nothing for
// the resolveColor oracle to resolve; this is the value the rule declares, read back verbatim.
const BTN_SHADOW: Record<Theme, string> = {
  'cairn-admin': '0 1px 2px -1px oklch(35% .04 75 / .35)',
  'cairn-admin-dark': '0 1px 2px -1px oklch(10% .02 75 / .35)',
};

describe.each(THEMES)('the .btn-primary warm lift (%s)', (theme) => {
  it.each(STATES)('holds --btn-shadow at %s', async (state) => {
    const { wrapper, cleanup } = renderInTheme('<button class="btn btn-primary">Publish</button>', theme);
    try {
      const el = wrapper.querySelector('button')!;
      expect(await styleOf(el, '--btn-shadow', state)).toBe(BTN_SHADOW[theme]);
    } finally {
      cleanup();
    }
  });

  // The oracle here is a sibling render, not a hardcoded shadow string: shadow-none's own composed
  // box-shadow is an internal daisyUI/Tailwind detail this test does not need to know, only that it
  // differs from the un-utilitied button's lifted shadow.
  it('loses to a shadow-none utility the compiled sheet already carries', () => {
    const lifted = renderInTheme('<button class="btn btn-primary">Publish</button>', theme);
    const flattened = renderInTheme('<button class="btn btn-primary shadow-none">Publish</button>', theme);
    try {
      const liftedShadow = getComputedStyle(lifted.wrapper.querySelector('button')!).boxShadow;
      const flattenedShadow = getComputedStyle(flattened.wrapper.querySelector('button')!).boxShadow;
      expect(flattenedShadow).not.toBe(liftedShadow);
    } finally {
      lifted.cleanup();
      flattened.cleanup();
    }
  });

  // shadow-none proves a markup utility beats the rule on box-shadow, but box-shadow is a property
  // shadow-none sets directly, so it cannot tell a layered --btn-shadow setter from an unlayered
  // one (both would lose the same way). This host rule sets --btn-shadow itself, from the utilities
  // layer's own unnested position, the same cascade slot a real Tailwind utility compiles into, so
  // it distinguishes the layered lift from an unlayered stand-in.
  it('loses to a host utility that sets --btn-shadow directly', () => {
    const hostCss = "@layer utilities { .no-lift { --btn-shadow: 0 0 #0000; } }";
    const { wrapper, cleanup } = renderInTheme('<button class="btn btn-primary no-lift">Publish</button>', theme, {
      hostCss,
    });
    try {
      const el = wrapper.querySelector('button')!;
      const shadow = getComputedStyle(el).getPropertyValue('--btn-shadow');
      expect(shadow).toBe('0 0 #0000');
      expect(shadow).not.toBe(BTN_SHADOW[theme]);
    } finally {
      cleanup();
    }
  });
});

// The lift's selector excludes every daisyUI variant and disabled form that already zeroes
// --btn-shadow itself: a sibling render with btn-secondary in place of btn-primary never matches
// the lift's selector at all, so its --btn-shadow is daisyUI's own untouched value for that markup.
// Equality against that sibling proves the exclusion, not merely that the value looks unlifted.
describe.each(THEMES)('the warm lift excludes daisyUI variants and disabled forms (%s)', (theme) => {
  const cases: { name: string; markup: (color: 'btn-primary' | 'btn-secondary') => string }[] = [
    { name: 'disabled', markup: (color) => `<button class="btn ${color}" disabled>Publish</button>` },
    { name: 'btn-disabled', markup: (color) => `<button class="btn ${color} btn-disabled">Publish</button>` },
    {
      name: "aria-disabled='true'",
      markup: (color) => `<button class="btn ${color}" aria-disabled="true">Publish</button>`,
    },
    { name: 'btn-outline', markup: (color) => `<button class="btn btn-outline ${color}">Publish</button>` },
    { name: 'btn-dash', markup: (color) => `<button class="btn btn-dash ${color}">Publish</button>` },
    { name: 'btn-ghost', markup: (color) => `<button class="btn btn-ghost ${color}">Publish</button>` },
    { name: 'btn-link', markup: (color) => `<button class="btn btn-link ${color}">Publish</button>` },
    { name: 'btn-soft', markup: (color) => `<button class="btn btn-soft ${color}">Publish</button>` },
  ];

  it.each(cases)('$name reads the same --btn-shadow as btn-secondary', ({ markup }) => {
    const primary = renderInTheme(markup('btn-primary'), theme);
    const secondary = renderInTheme(markup('btn-secondary'), theme);
    try {
      const primaryShadow = getComputedStyle(primary.wrapper.querySelector('button')!).getPropertyValue(
        '--btn-shadow',
      );
      const secondaryShadow = getComputedStyle(secondary.wrapper.querySelector('button')!).getPropertyValue(
        '--btn-shadow',
      );
      expect(primaryShadow).toBe(secondaryShadow);
    } finally {
      primary.cleanup();
      secondary.cleanup();
    }
  });
});

describe.each(THEMES)('the .modal-box repair (%s)', (theme) => {
  it('replaces the theme-invariant black shadow with the theme-adaptive elevation pair', () => {
    const { wrapper, cleanup } = renderInTheme(
      '<div class="modal-box"></div><div class="cairn-ref"></div>',
      theme,
    );
    try {
      const modal = wrapper.querySelector('.modal-box') as HTMLElement;
      // The reference element paints the same var(...) expressions the rule sets, so the
      // comparison is browser-resolved on both sides, never a hand-written serialized string.
      const ref = wrapper.querySelector('.cairn-ref') as HTMLElement;
      ref.style.boxShadow = 'var(--cairn-shadow)';
      ref.style.borderColor = 'var(--cairn-card-border)';
      ref.style.borderWidth = '1px';
      ref.style.borderStyle = 'solid';
      expect(getComputedStyle(modal).boxShadow).toBe(getComputedStyle(ref).boxShadow);
      expect(getComputedStyle(modal).borderTopColor).toBe(getComputedStyle(ref).borderTopColor);
      expect(getComputedStyle(modal).borderTopWidth).toBe('1px');
    } finally {
      cleanup();
    }
  });

  // shadow-lg is absent from the compiled sheet (the admin build scans only its own markup), so
  // this supplies it the way a consumer's own site sheet would: an unnested utilities-layer rule,
  // which outranks the nested cairn-idiom sublayer the same way a real Tailwind utility does.
  it('loses to a shadow-lg utility supplied through a host sheet', () => {
    const hostCss = '@layer utilities { .shadow-lg { box-shadow: 0 25px 50px -12px red; } }';
    const { wrapper, cleanup } = renderInTheme('<div class="modal-box shadow-lg"></div>', theme, { hostCss });
    try {
      const modal = wrapper.querySelector('.modal-box') as HTMLElement;
      expect(getComputedStyle(modal).boxShadow).toBe('rgb(255, 0, 0) 0px 25px 50px -12px');
    } finally {
      cleanup();
    }
  });
});
