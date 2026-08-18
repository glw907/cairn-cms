import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { createRawSnippet } from 'svelte';
import CairnAdminShell from '../../lib/components/CairnAdminShell.svelte';
import { resolveNavLayout } from '../../lib/sveltekit/admin-nav.js';

const child = createRawSnippet(() => ({ render: () => '<p>page body</p>' }));

// The authed shell payload, in the shape shellLoad produces (the same builder CairnAdminShell.test.ts
// uses, trimmed to what a theme assertion needs). `theme` is the SSR'd seed the shell reads once.
function data(theme: 'cairn-admin' | 'cairn-admin-dark' = 'cairn-admin') {
  const concepts = [{ id: 'posts', label: 'Posts' }];
  const editor = {
    displayName: 'Ed',
    email: 'ed@example.com',
    role: 'owner' as const,
    capability: 'owner' as const,
  };
  return {
    public: false as const,
    siteName: 'Test Site',
    user: editor,
    concepts,
    nav: resolveNavLayout({ layout: undefined, concepts, navMenuLabel: null, editor }),
    pathname: '/admin/posts',
    theme,
    collapsedNav: null as string[] | null,
    csrf: 'test-csrf-token',
    pendingEntries: Promise.resolve(null) as Promise<{ concept: string; id: string }[] | null>,
    attention: {},
  };
}

/** A recording stand-in for `document.cookie`: the reads the shell makes and the writes it performs. */
interface CookieProbe {
  reads: number;
  writes: string[];
}

// The browser test page is served at "/", so a real path=/admin cookie is invisible to
// document.cookie here. The suite drives the cookie through an own-property accessor instead, the
// same technique the shell's own toggle test uses, which also lets a read be counted.
function probeCookie(seed: string): CookieProbe {
  const probe: CookieProbe = { reads: 0, writes: [] };
  Object.defineProperty(document, 'cookie', {
    configurable: true,
    get: () => {
      probe.reads += 1;
      return seed;
    },
    set: (value: string) => {
      probe.writes.push(value);
    },
  });
  return probe;
}

/** Every media query the shell asked about, so a `prefers-color-scheme` read is observable. */
interface MediaProbe {
  queries: string[];
}

// The shell asks matchMedia about the lg and xl sidebar breakpoints as well as the color scheme, and
// only the color-scheme read belongs to the theme. The stand-in records every query and answers the
// color-scheme one with the given OS preference.
function probeMatchMedia(prefersDark: boolean): MediaProbe {
  const probe: MediaProbe = { queries: [] };
  const fake = (query: string): MediaQueryList => {
    probe.queries.push(query);
    return {
      matches: query === '(prefers-color-scheme: dark)' ? prefersDark : false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList;
  };
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: fake });
  return probe;
}

/** The theme the shell rendered onto its bare `data-theme` root. */
function renderedTheme(container: HTMLElement): string | null {
  return container.querySelector('[data-theme]')?.getAttribute('data-theme') ?? null;
}

afterEach(() => {
  // Both accessors live on a prototype; deleting the own override restores the real one.
  delete (document as { cookie?: unknown }).cookie;
  delete (window as { matchMedia?: unknown }).matchMedia;
});

describe('CairnAdminShell theme override', () => {
  it('renders the override instead of the payload theme', async () => {
    probeCookie('');
    probeMatchMedia(false);
    const screen = render(CairnAdminShell, {
      props: { data: data('cairn-admin'), children: child, themeOverride: 'cairn-admin-dark' },
    } as never);
    expect(renderedTheme(screen.container)).toBe('cairn-admin-dark');
  });

  it('re-renders when the override prop changes', async () => {
    probeCookie('');
    probeMatchMedia(false);
    const screen = render(CairnAdminShell, {
      props: { data: data('cairn-admin'), children: child, themeOverride: 'cairn-admin-dark' },
    } as never);
    expect(renderedTheme(screen.container)).toBe('cairn-admin-dark');
    await screen.rerender({ themeOverride: 'cairn-admin' } as never);
    expect(renderedTheme(screen.container)).toBe('cairn-admin');
  });

  it('reads neither the theme cookie nor prefers-color-scheme while the override is set', async () => {
    // Both sources disagree with the override: a dark cookie choice and a dark OS preference, under
    // a light override. Consulting either would show through as a dark render.
    const cookie = probeCookie('cairn-admin-theme=cairn-admin-dark');
    const media = probeMatchMedia(true);
    const screen = render(CairnAdminShell, {
      props: { data: data('cairn-admin-dark'), children: child, themeOverride: 'cairn-admin' },
    } as never);
    expect(renderedTheme(screen.container)).toBe('cairn-admin');
    expect(cookie.reads).toBe(0);
    expect(media.queries).not.toContain('(prefers-color-scheme: dark)');
  });
});

describe('CairnAdminShell theme without an override (the real admin mount)', () => {
  it('follows the OS dark preference on a first visit with no theme cookie', async () => {
    const cookie = probeCookie('');
    const media = probeMatchMedia(true);
    const screen = render(CairnAdminShell, {
      props: { data: data('cairn-admin'), children: child },
    } as never);
    expect(renderedTheme(screen.container)).toBe('cairn-admin-dark');
    expect(cookie.reads).toBeGreaterThan(0);
    expect(media.queries).toContain('(prefers-color-scheme: dark)');
  });

  it('keeps the payload theme when a theme cookie already exists', async () => {
    probeCookie('cairn-admin-theme=cairn-admin');
    probeMatchMedia(true);
    const screen = render(CairnAdminShell, {
      props: { data: data('cairn-admin'), children: child },
    } as never);
    expect(renderedTheme(screen.container)).toBe('cairn-admin');
  });

  it('still writes the theme cookie when the toggle flips the theme', async () => {
    const cookie = probeCookie('cairn-admin-theme=cairn-admin');
    probeMatchMedia(false);
    const screen = render(CairnAdminShell, {
      props: { data: data('cairn-admin'), children: child },
    } as never);
    await screen.getByRole('button', { name: /dark mode|light mode|toggle theme/i }).click();
    expect(renderedTheme(screen.container)).toBe('cairn-admin-dark');
    expect(cookie.writes.some((w) => w.includes('cairn-admin-theme=cairn-admin-dark'))).toBe(true);
  });
});
