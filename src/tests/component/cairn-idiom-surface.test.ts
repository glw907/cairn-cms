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

// The lift's literal --btn-shadow value per theme: light at the ratified warm violet-adjacent
// lift, dark at the dark theme's own --cairn-shadow tint, both at the same geometry and alpha.
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
