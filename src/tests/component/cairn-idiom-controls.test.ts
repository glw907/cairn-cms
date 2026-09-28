// cairn-cms: the field-edge idiom rules moved into cairn-idiom (the unchecked checkbox/radio edge
// and the unfocused input/select/textarea edge, both unchanged in mechanism), the switch's
// geometry and checked fill, the dropdown-content.menu concentric-corner rule, the bare .badge
// edge (the plain button's own 22% mix), and the Lucide stroke retune. Every color comparison
// resolves through the shared resolveColor oracle, every state read through the shared styleOf
// probe, and the Lucide cases mount a real @lucide/svelte icon rather than a hand-built <svg>, so
// the attribute shape this rule keys on is proven against the library's own output.
import { describe, expect, it } from 'vitest';
import { mount as mountSvelte, unmount as unmountSvelte } from 'svelte';
import CheckIcon from '@lucide/svelte/icons/check';
import { renderInTheme, resolveColor, styleOf, type IdiomState, type Theme } from './_idiom-probe.js';

const THEMES: Theme[] = ['cairn-admin', 'cairn-admin-dark'];
const STATES: IdiomState[] = ['rest', 'hover', 'focus-visible', 'active'];

const FIELD_EDGE = 'color-mix(in oklab, var(--color-base-content) 55%, transparent)';

describe.each(THEMES)('the unchecked checkbox/radio edge, moved into cairn-idiom (%s)', (theme) => {
  it.each(['rest', 'hover'] as const)('checkbox computes the 55%% mix at %s', async (state) => {
    const { wrapper, cleanup } = renderInTheme('<input type="checkbox" class="checkbox" />', theme);
    try {
      const el = wrapper.querySelector('input')!;
      el.style.transition = 'none';
      expect(await styleOf(el, 'border-top-color', state)).toBe(resolveColor(FIELD_EDGE, theme));
    } finally {
      cleanup();
    }
  });

  it.each(['rest', 'hover'] as const)('radio computes the 55%% mix at %s', async (state) => {
    const { wrapper, cleanup } = renderInTheme('<input type="radio" class="radio" />', theme);
    try {
      const el = wrapper.querySelector('input')!;
      el.style.transition = 'none';
      expect(await styleOf(el, 'border-top-color', state)).toBe(resolveColor(FIELD_EDGE, theme));
    } finally {
      cleanup();
    }
  });

  // A markup border utility now wins where it could not before the move: border-error is not
  // compiled into the admin sheet (the build scans only its own components), so it is supplied
  // through hostCss, the way a consumer's own site sheet would carry it.
  it('loses to a border-error utility on a checkbox', () => {
    const hostCss = '@layer utilities { .border-error { border-color: var(--color-error); } }';
    const { wrapper, cleanup } = renderInTheme('<input type="checkbox" class="checkbox border-error" />', theme, {
      hostCss,
    });
    try {
      const el = wrapper.querySelector('input')!;
      expect(getComputedStyle(el).borderTopColor).toBe(resolveColor('var(--color-error)', theme));
    } finally {
      cleanup();
    }
  });
});

describe.each(THEMES)('the unfocused field-family edge, moved into cairn-idiom (%s)', (theme) => {
  const FIELDS: { tag: string; cls: string; markup: string }[] = [
    { tag: 'input', cls: 'input', markup: '<input class="input" type="text" />' },
    { tag: 'select', cls: 'select', markup: '<select class="select"><option>x</option></select>' },
    { tag: 'textarea', cls: 'textarea', markup: '<textarea class="textarea"></textarea>' },
  ];

  it.each(FIELDS)('$cls computes the 55%% mix at rest', ({ markup }) => {
    const { wrapper, cleanup } = renderInTheme(markup, theme);
    try {
      const el = wrapper.firstElementChild as HTMLElement;
      expect(getComputedStyle(el).borderTopColor).toBe(resolveColor(FIELD_EDGE, theme));
    } finally {
      cleanup();
    }
  });

  it.each(FIELDS)('$cls computes the 55%% mix at hover', async ({ markup }) => {
    const { wrapper, cleanup } = renderInTheme(markup, theme);
    try {
      const el = wrapper.firstElementChild as HTMLElement;
      el.style.transition = 'none';
      expect(await styleOf(el, 'border-top-color', 'hover')).toBe(resolveColor(FIELD_EDGE, theme));
    } finally {
      cleanup();
    }
  });

  // A focused field matches daisyUI's own focus edge: :focus/:focus-within is excluded, so this
  // rule leaves the state to daisyUI's own --input-color: var(--color-base-content) focus rule.
  it('a focused .input matches daisyUI\'s own focus edge, not the 55% mix', async () => {
    const { wrapper, cleanup } = renderInTheme('<input class="input" type="text" />', theme);
    try {
      const el = wrapper.querySelector('input')!;
      el.style.transition = 'none';
      expect(await styleOf(el, 'border-top-color', 'focus-visible')).toBe(
        resolveColor('var(--color-base-content)', theme),
      );
    } finally {
      cleanup();
    }
  });

  // A markup border utility now wins where it could not before the move, supplied through
  // hostCss for the same reason the checkbox/radio case above needs it.
  it('loses to a border-error utility on an .input', () => {
    const hostCss = '@layer utilities { .border-error { border-color: var(--color-error); } }';
    const { wrapper, cleanup } = renderInTheme('<input class="input border-error" type="text" />', theme, {
      hostCss,
    });
    try {
      const el = wrapper.querySelector('input')!;
      expect(getComputedStyle(el).borderTopColor).toBe(resolveColor('var(--color-error)', theme));
    } finally {
      cleanup();
    }
  });
});

// Task 15 item 6: a bare .badge's own border falls back to daisyUI's --color-base-200, about
// 1.05:1 against the card, so an uncolored chip reads as loose text. The rule sets border-color
// directly (never --badge-color, which also feeds --badge-bg's fallback) at the plain button's
// own 22% base-content mix, one value with no state table since a badge is not interactive.
describe.each(THEMES)('the bare .badge edge, moved into cairn-idiom (%s)', (theme) => {
  const BADGE_EDGE = 'color-mix(in oklab, var(--color-base-content) 22%, transparent)';

  it('computes the 22%% mix on an uncolored badge', async () => {
    const { wrapper, cleanup } = renderInTheme('<span class="badge">Chip</span>', theme);
    try {
      const el = wrapper.querySelector('.badge')!;
      expect(getComputedStyle(el).borderTopColor).toBe(resolveColor(BADGE_EDGE, theme));
    } finally {
      cleanup();
    }
  });

  it('leaves a colored badge-primary at its own daisyUI edge', async () => {
    const { wrapper, cleanup } = renderInTheme('<span class="badge badge-primary">Chip</span>', theme);
    try {
      const el = wrapper.querySelector('.badge')!;
      expect(getComputedStyle(el).borderTopColor).not.toBe(resolveColor(BADGE_EDGE, theme));
      expect(getComputedStyle(el).borderTopColor).toBe(resolveColor('var(--color-primary)', theme));
    } finally {
      cleanup();
    }
  });

  // A markup border utility still wins, supplied through hostCss for the same reason the
  // checkbox/radio and input cases above need it.
  it('loses to a border-error utility on a badge', () => {
    const hostCss = '@layer utilities { .border-error { border-color: var(--color-error); } }';
    const { wrapper, cleanup } = renderInTheme('<span class="badge border-error">Chip</span>', theme, {
      hostCss,
    });
    try {
      const el = wrapper.querySelector('.badge')!;
      expect(getComputedStyle(el).borderTopColor).toBe(resolveColor('var(--color-error)', theme));
    } finally {
      cleanup();
    }
  });
});

// The switch: geometry (track and knob both fully round, unconditional) and the checked fill
// (track neutral, knob base-100), on all three forms daisyUI treats as checked. Each mount reads
// the knob through getComputedStyle(el, '::before'), the only way to read a pseudo-element's own
// computed style.
const CHECKED_FORMS: { name: string; markup: string; tabindex?: true }[] = [
  { name: ':checked', markup: '<input type="checkbox" class="toggle" checked />' },
  { name: "aria-checked='true'", markup: '<input type="checkbox" class="toggle" aria-checked="true" />' },
  {
    name: ':has(> input:checked)',
    // tabindex makes the wrapping label itself keyboard-focusable purely so the focus-visible
    // probe below has something to focus: a real wrapped-icon toggle recipe puts visible focus on
    // the nested input instead, which this markup also carries checked so the :has() form matches.
    markup: '<label class="toggle" tabindex="0"><input type="checkbox" checked /></label>',
    tabindex: true,
  },
];

describe.each(THEMES)('the switch (%s)', (theme) => {
  it('track and knob are both fully round, unconditionally', () => {
    const { wrapper, cleanup } = renderInTheme('<input type="checkbox" class="toggle" />', theme);
    try {
      const el = wrapper.querySelector('input')!;
      expect(getComputedStyle(el).borderTopLeftRadius).toBe('9999px');
      expect(getComputedStyle(el, '::before').borderTopLeftRadius).toBe('9999px');
    } finally {
      cleanup();
    }
  });

  it.each(CHECKED_FORMS)('$name fills the track neutral at every state', async ({ markup }) => {
    const { wrapper, cleanup } = renderInTheme(markup, theme);
    try {
      const el = wrapper.querySelector('.toggle') as HTMLElement;
      el.style.transition = 'none';
      for (const state of STATES) {
        expect(await styleOf(el, 'background-color', state)).toBe(resolveColor('var(--color-neutral)', theme));
      }
    } finally {
      cleanup();
    }
  });

  // The knob's own rule carries no pseudo-class of its own, but a real interaction state still
  // lands on the host element while the property under test lives on its ::before, so styleOf's
  // pseudo-element argument reads the knob at each of the four states the real element reaches.
  it.each(CHECKED_FORMS)('$name fills the knob base-100 at every state', async ({ markup }) => {
    const { wrapper, cleanup } = renderInTheme(markup, theme);
    try {
      const el = wrapper.querySelector('.toggle') as HTMLElement;
      el.style.transition = 'none';
      for (const state of STATES) {
        expect(await styleOf(el, 'background-color', state, '::before')).toBe(
          resolveColor('var(--color-base-100)', theme),
        );
      }
    } finally {
      cleanup();
    }
  });

  it.each(['toggle-primary', 'toggle-success'] as const)(
    '%s checked keeps daisyUI\'s own color, not the neutral wash',
    (variant) => {
      const { wrapper, cleanup } = renderInTheme(`<input type="checkbox" class="toggle ${variant}" checked />`, theme);
      try {
        const el = wrapper.querySelector('input')!;
        expect(getComputedStyle(el).backgroundColor).toBe(resolveColor('var(--color-base-100)', theme));
        const colorVar = variant === 'toggle-primary' ? '--color-primary' : '--color-success';
        expect(getComputedStyle(el, '::before').backgroundColor).toBe(resolveColor(`var(${colorVar})`, theme));
      } finally {
        cleanup();
      }
    },
  );

  it('a disabled checked switch matches daisyUI stock: knob transparent, track base-100', () => {
    const { wrapper, cleanup } = renderInTheme('<input type="checkbox" class="toggle" checked disabled />', theme);
    try {
      const el = wrapper.querySelector('input')!;
      // The rule excludes :disabled, so the disabled switch is left entirely to daisyUI's own
      // .toggle:checked (track background-color: base-100) and .toggle:disabled::before
      // (background-color: transparent) rules, not this rule's neutral track or base-100 knob.
      expect(getComputedStyle(el).backgroundColor).toBe(resolveColor('var(--color-base-100)', theme));
      expect(getComputedStyle(el, '::before').backgroundColor).toBe(resolveColor('transparent', theme));
    } finally {
      cleanup();
    }
  });

  // A markup utility still wins: rounded-none is supplied through hostCss, the way a consumer's
  // own site sheet would, since the admin build scans only its own components.
  it('loses to a rounded-none utility, squaring the track', () => {
    const hostCss = '@layer utilities { .rounded-none { border-radius: 0px; } }';
    const { wrapper, cleanup } = renderInTheme('<input type="checkbox" class="toggle rounded-none" />', theme, {
      hostCss,
    });
    try {
      const el = wrapper.querySelector('input')!;
      expect(getComputedStyle(el).borderTopLeftRadius).toBe('0px');
    } finally {
      cleanup();
    }
  });

  it.each(CHECKED_FORMS)('$name keeps a focus-visible outline color other than base-100', async ({ markup }) => {
    const { wrapper, cleanup } = renderInTheme(markup, theme);
    try {
      const el = wrapper.querySelector('.toggle') as HTMLElement;
      el.style.transition = 'none';
      const outline = await styleOf(el, 'outline-color', 'focus-visible');
      expect(outline).not.toBe(resolveColor('var(--color-base-100)', theme));
    } finally {
      cleanup();
    }
  });

  it('an unchecked switch also keeps a focus-visible outline color other than base-100', async () => {
    const { wrapper, cleanup } = renderInTheme('<input type="checkbox" class="toggle" />', theme);
    try {
      const el = wrapper.querySelector('input')!;
      el.style.transition = 'none';
      const outline = await styleOf(el, 'outline-color', 'focus-visible');
      expect(outline).not.toBe(resolveColor('var(--color-base-100)', theme));
    } finally {
      cleanup();
    }
  });
});

// Concentric corners: a menu item inside a padded dropdown-content.menu panel takes the panel's
// own radius minus the inset.
describe.each(THEMES)('concentric corners (%s)', (theme) => {
  it('a menu item inside a padded dropdown-content menu panel computes border-radius of 4px', () => {
    const { wrapper, cleanup } = renderInTheme(
      '<ul class="dropdown-content menu"><li><a href="#">Item</a></li></ul>',
      theme,
    );
    try {
      const item = wrapper.querySelector('a')!;
      expect(getComputedStyle(item).borderTopLeftRadius).toBe('4px');
    } finally {
      cleanup();
    }
  });

  // Review focus 4: a rounded-none item inside the padded dropdown keeps 0 despite the concentric
  // rule, since the rule sets the variable, not border-radius directly, so an item's own utility
  // (through hostCss) still wins.
  it('a rounded-none item inside the padded dropdown keeps 0', () => {
    const hostCss = '@layer utilities { .rounded-none { border-radius: 0px; } }';
    const { wrapper, cleanup } = renderInTheme(
      '<ul class="dropdown-content menu"><li><a href="#" class="rounded-none">Item</a></li></ul>',
      theme,
      { hostCss },
    );
    try {
      const item = wrapper.querySelector('a')!;
      expect(getComputedStyle(item).borderTopLeftRadius).toBe('0px');
    } finally {
      cleanup();
    }
  });
});

/** The two @lucide/svelte props this file's own mounts exercise. */
interface IconProbeProps {
  strokeWidth?: number;
  class?: string;
  /** LucideProps itself is a Record<string, unknown> intersection; this satisfies it structurally. */
  [key: string]: unknown;
}

/** Mounts a real @lucide/svelte icon inside a themed wrapper, returning it plus a cleanup that
 *  unmounts the component and removes the wrapper. */
function mountIcon(theme: Theme, props: IconProbeProps = {}): { svg: SVGElement; cleanup: () => void } {
  const { wrapper, cleanup } = renderInTheme('<div class="icon-host"></div>', theme);
  const host = wrapper.querySelector('.icon-host')!;
  const instance = mountSvelte(CheckIcon, { target: host, props });
  const svg = host.querySelector('svg')!;
  return {
    svg,
    cleanup: () => {
      unmountSvelte(instance);
      cleanup();
    },
  };
}

describe.each(THEMES)('Lucide strokes (%s)', (theme) => {
  it('a @lucide/svelte icon at default stroke computes 1.75', () => {
    const { svg, cleanup } = mountIcon(theme);
    try {
      expect(svg.getAttribute('stroke-width')).toBe('2');
      expect(getComputedStyle(svg).strokeWidth).toBe('1.75px');
    } finally {
      cleanup();
    }
  });

  it('an icon with strokeWidth={2.5} keeps 2.5', () => {
    const { svg, cleanup } = mountIcon(theme, { strokeWidth: 2.5 });
    try {
      expect(svg.getAttribute('stroke-width')).toBe('2.5');
      expect(getComputedStyle(svg).strokeWidth).toBe('2.5px');
    } finally {
      cleanup();
    }
  });

  it('an icon with an explicit strokeWidth={2} still computes 1.75, the spec\'s stated reach', () => {
    const { svg, cleanup } = mountIcon(theme, { strokeWidth: 2 });
    try {
      expect(svg.getAttribute('stroke-width')).toBe('2');
      expect(getComputedStyle(svg).strokeWidth).toBe('1.75px');
    } finally {
      cleanup();
    }
  });

  // A markup utility still wins: stroke-[2.5] is supplied through hostCss, the way a consumer's
  // own compiled Tailwind sheet would (the admin build scans only its own components, so an
  // arbitrary-value utility written only here is never compiled into the admin sheet itself).
  it('loses to a stroke-[2.5] utility', () => {
    const hostCss = "@layer utilities { .stroke-\\[2\\.5\\] { stroke-width: 2.5; } }";
    const { wrapper, cleanup: cleanupRender } = renderInTheme('<div class="icon-host"></div>', theme, { hostCss });
    const host = wrapper.querySelector('.icon-host')!;
    const instance = mountSvelte(CheckIcon, { target: host, props: { class: 'stroke-[2.5]' } });
    try {
      const svg = host.querySelector('svg')!;
      expect(getComputedStyle(svg).strokeWidth).toBe('2.5px');
    } finally {
      unmountSvelte(instance);
      cleanupRender();
    }
  });
});
