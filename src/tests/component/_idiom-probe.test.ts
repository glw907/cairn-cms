// cairn-cms: the self-test for _idiom-probe.ts, the shared helper every cairn-idiom component test
// renders through. Proves renderInTheme mounts markup under a bare data-theme wrapper with the
// compiled sheet, styleOf reaches all four interaction states through real input and throws
// naming a state it never reaches, and resolveColor resolves a color expression both inside and
// outside a context element. Also guards the precondition every one of those tests relies on: the
// compiled sheet has to be no older than the source it compiles, or a render silently proves a
// stale one.
import { afterEach, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import { renderInTheme, resolveColor, styleOf } from './_idiom-probe.js';

declare module 'vitest/internal/browser' {
  interface BrowserCommands {
    /** The mtime, in milliseconds, of the file at `path` (repo-root-relative). */
    mtimeMs: (path: string) => Promise<number>;
  }
}

const cleanups: Array<() => void> = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

describe('the compiled admin sheet this probe injects', () => {
  it('is no older than the source it compiles', async () => {
    const [distMtime, srcMtime] = await Promise.all([
      commands.mtimeMs('dist/admin/cairn-admin.css'),
      commands.mtimeMs('src/lib/admin/cairn-admin.css'),
    ]);
    expect(distMtime).toBeGreaterThanOrEqual(srcMtime);
  });
});

describe.each(['cairn-admin', 'cairn-admin-dark'] as const)('styleOf on a stock .btn (%s)', (theme) => {
  it('reaches rest, hover, and focus-visible, and moves translate off rest at active', async () => {
    const { wrapper, cleanup } = renderInTheme('<button class="btn">Plain</button>', theme);
    cleanups.push(cleanup);
    const el = wrapper.querySelector('button')!;

    const rest = await styleOf(el, 'translate', 'rest');
    await styleOf(el, 'background-color', 'hover');
    await styleOf(el, 'outline-style', 'focus-visible');
    const active = await styleOf(el, 'translate', 'active');

    // daisyUI's own .btn:active rule restates translate to `0 .5px`; getComputedStyle serializes
    // that shorthand with explicit px units.
    expect(active).not.toBe(rest);
    expect(active).toBe('0px 0.5px');
  });

  it('throws naming the state a disabled button never reaches (active)', async () => {
    const { wrapper, cleanup } = renderInTheme('<button class="btn" disabled>Off</button>', theme);
    cleanups.push(cleanup);
    const el = wrapper.querySelector('button')!;

    await expect(styleOf(el, 'translate', 'active')).rejects.toThrow(/active/);
  });
});

describe.each(['cairn-admin', 'cairn-admin-dark'] as const)('resolveColor (%s)', (theme) => {
  it('resolves through a context element and falls back to the default without one', () => {
    // alert-outline: the cairn-idiom alert rules exclude daisyUI's own style variants, so
    // --alert-color here is untouched, still daisyUI's own stock .alert-info value.
    const { wrapper, cleanup } = renderInTheme('<div class="alert alert-outline alert-info"></div>', theme);
    cleanups.push(cleanup);
    const alert = wrapper.querySelector('.alert-info')!;

    const infoColor = resolveColor('var(--alert-color, red)', theme, alert);
    const fallback = resolveColor('var(--alert-color, red)', theme);

    // .alert-info sets --alert-color to var(--color-info), so resolving inside it must equal the
    // theme's own info color, not merely some value that differs from the fallback.
    expect(infoColor).toBe(resolveColor('var(--color-info)', theme));
    expect(infoColor).not.toBe(fallback);
    expect(fallback).toBe(resolveColor('red', theme));
  });
});
