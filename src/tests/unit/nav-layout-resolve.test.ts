import { describe, it, expect } from 'vitest';
import { resolveNavLayout, type NavLayout } from '../../lib/sveltekit/admin-nav.js';
import type { ResolvedNavItem } from '../../lib/sveltekit/admin-nav.js';

/** The context a resolveNavLayout call needs; overrides spread over a permissive owner default. */
function opts(overrides: Partial<Parameters<typeof resolveNavLayout>[0]> = {}) {
  return {
    layout: undefined,
    adminNav: [] as ResolvedNavItem[],
    concepts: [
      { id: 'posts', label: 'Posts' },
      { id: 'pages', label: 'Pages' },
    ],
    navMenuLabel: 'Navigation',
    capability: 'owner' as const,
    role: 'owner',
    ...overrides,
  };
}

describe('resolveNavLayout: arrangement', () => {
  it('renders a declared tree in declared order, mixing engine refs, site entries, and sections', () => {
    const layout: NavLayout = [
      { screen: 'settings' },
      { label: 'Loose', icon: 'wrench', href: '/admin/loose' },
      { label: 'Sec1', children: [{ screen: 'media' }] },
      { screen: 'posts' },
    ];
    const resolved = resolveNavLayout(opts({ layout }));
    // A concept-matched engine entry always carries `dated` (the concept-kind glyph field); the
    // fixture concepts here declare no `routing`, so it resolves false for both.
    expect(resolved.items).toEqual([
      { screen: 'settings', label: 'Settings', href: '/admin/settings' },
      { label: 'Loose', iconName: 'wrench', href: '/admin/loose', ownerOnly: false },
      { label: 'Sec1', children: [{ screen: 'media', label: 'Library', href: '/admin/media' }] },
      { screen: 'posts', label: 'Posts', href: '/admin/posts', dated: false },
    ]);
  });
});

describe('resolveNavLayout: relabel', () => {
  it('relabels an engine ref while its icon/href stay engine-owned', () => {
    const layout: NavLayout = [{ screen: 'settings', label: 'Site settings' }];
    const resolved = resolveNavLayout(opts({ layout }));
    expect(resolved.items).toEqual([{ screen: 'settings', label: 'Site settings', href: '/admin/settings' }]);
  });
});

describe('resolveNavLayout: omission fallback', () => {
  it('sends engine screens the tree never references to fallback, in engine order', () => {
    const layout: NavLayout = [{ screen: 'posts' }];
    const resolved = resolveNavLayout(opts({ layout, navMenuLabel: null }));
    expect(resolved.fallback).toEqual([
      { screen: 'pages', label: 'Pages', href: '/admin/pages', dated: false },
      { screen: 'media', label: 'Library', href: '/admin/media' },
      { screen: 'vocabulary', label: 'Tags', href: '/admin/vocabulary' },
      { screen: 'settings', label: 'Settings', href: '/admin/settings' },
      { screen: 'editors', label: 'Editors', href: '/admin/editors' },
      { screen: 'help', label: 'Help', href: '/admin/help' },
    ]);
  });

  it('yields an empty fallback when every engine screen is referenced', () => {
    const layout: NavLayout = [
      { screen: 'posts' },
      { screen: 'pages' },
      { screen: 'media' },
      { screen: 'vocabulary' },
      { screen: 'nav' },
      { screen: 'settings' },
      { screen: 'editors' },
      { screen: 'help' },
    ];
    const resolved = resolveNavLayout(opts({ layout }));
    expect(resolved.fallback).toEqual([]);
  });
});

describe('resolveNavLayout: hidden', () => {
  it('removes a hidden engine ref from items and keeps it out of fallback', () => {
    const layout: NavLayout = [
      { screen: 'posts' },
      { screen: 'pages' },
      { screen: 'media' },
      { screen: 'vocabulary' },
      { screen: 'nav' },
      { screen: 'settings' },
      { screen: 'editors' },
      { screen: 'help', hidden: true },
    ];
    const resolved = resolveNavLayout(opts({ layout }));
    expect(resolved.items).not.toContainEqual(expect.objectContaining({ screen: 'help' }));
    expect(resolved.fallback).toEqual([]);
  });
});

describe('resolveNavLayout: default synthesis', () => {
  it('reproduces the locked default arrangement for an undeclared layout, as loose top-level nodes', () => {
    const adminNav: ResolvedNavItem[] = [
      { label: 'Signups', iconName: 'inbox', href: '/admin/signups', ownerOnly: false },
      {
        label: 'Tools',
        children: [{ label: 'X', iconName: 'wrench', href: '/admin/x', ownerOnly: false }],
      },
    ];
    const resolved = resolveNavLayout(opts({ layout: undefined, adminNav }));
    expect(resolved.items).toEqual([
      { screen: 'posts', label: 'Posts', href: '/admin/posts', dated: false },
      { screen: 'pages', label: 'Pages', href: '/admin/pages', dated: false },
      { label: 'Signups', iconName: 'inbox', href: '/admin/signups', ownerOnly: false },
      { screen: 'media', label: 'Library', href: '/admin/media' },
      { screen: 'vocabulary', label: 'Tags', href: '/admin/vocabulary' },
      { screen: 'nav', label: 'Navigation', href: '/admin/nav' },
      { screen: 'settings', label: 'Settings', href: '/admin/settings' },
      { screen: 'editors', label: 'Editors', href: '/admin/editors' },
      {
        label: 'Tools',
        children: [{ label: 'X', iconName: 'wrench', href: '/admin/x', ownerOnly: false }],
      },
    ]);
    expect(resolved.fallback).toEqual([{ screen: 'help', label: 'Help', href: '/admin/help' }]);
  });

  it('yields a loose site entry with no section for a none-capability session', () => {
    const adminNav: ResolvedNavItem[] = [
      { label: 'Signups', iconName: 'inbox', href: '/admin/signups', ownerOnly: false },
    ];
    const resolved = resolveNavLayout(opts({ layout: undefined, adminNav, capability: 'none' }));
    expect(resolved.items).toEqual([
      { label: 'Signups', iconName: 'inbox', href: '/admin/signups', ownerOnly: false },
    ]);
    expect(resolved.fallback).toEqual([]);
  });
});

describe('resolveNavLayout: capability gates', () => {
  it('strips every engine screen (wherever placed) for a none session but keeps site entries', () => {
    const layout: NavLayout = [
      { screen: 'settings' },
      { label: 'Loose', icon: 'wrench', href: '/admin/loose' },
      { label: 'Sec1', children: [{ screen: 'media' }] },
    ];
    const resolved = resolveNavLayout(opts({ layout, capability: 'none' }));
    expect(resolved.items).toEqual([{ label: 'Loose', iconName: 'wrench', href: '/admin/loose', ownerOnly: false }]);
    expect(resolved.fallback).toEqual([]);
  });

  it('strips the editors screen for editor capability', () => {
    const resolved = resolveNavLayout(opts({ capability: 'editor', role: 'editor' }));
    expect(resolved.items).not.toContainEqual(expect.objectContaining({ screen: 'editors' }));
  });

  it('omits the nav screen from the default arrangement when no navMenu is configured', () => {
    const resolved = resolveNavLayout(opts({ navMenuLabel: null }));
    expect(resolved.items).not.toContainEqual(expect.objectContaining({ screen: 'nav' }));
    expect(resolved.fallback).not.toContainEqual(expect.objectContaining({ screen: 'nav' }));
  });
});

describe('resolveNavLayout: ownerOnly', () => {
  it('drops an ownerOnly site entry inside the tree for a non-owner capability', () => {
    const layout: NavLayout = [{ label: 'X', icon: 'wrench', href: '/admin/x', ownerOnly: true }];
    const editorResolved = resolveNavLayout(opts({ layout, capability: 'editor', role: 'editor' }));
    expect(editorResolved.items).toEqual([]);
    const ownerResolved = resolveNavLayout(opts({ layout, capability: 'owner', role: 'owner' }));
    expect(ownerResolved.items).toEqual([
      { label: 'X', iconName: 'wrench', href: '/admin/x', ownerOnly: true },
    ]);
  });
});

describe('resolveNavLayout: roles', () => {
  it('renders a roles-gated entry only for a matching role, capability irrelevant', () => {
    const layout = [
      { label: 'Signups', icon: 'inbox', href: '/admin/signups', roles: ['club-admin'] },
    ] as unknown as NavLayout;
    const matching = resolveNavLayout(opts({ layout, capability: 'editor', role: 'club-admin' }));
    expect(matching.items).toEqual([
      { label: 'Signups', iconName: 'inbox', href: '/admin/signups', ownerOnly: false },
    ]);
    const nonMatching = resolveNavLayout(opts({ layout, capability: 'owner', role: 'owner' }));
    expect(nonMatching.items).toEqual([]);
  });

  it('gates every child at once when a section carries roles', () => {
    const layout = [
      {
        label: 'Club',
        roles: ['club-admin'],
        children: [{ screen: 'editors' }, { label: 'Signups', icon: 'inbox', href: '/admin/signups' }],
      },
    ] as unknown as NavLayout;
    const nonMatching = resolveNavLayout(opts({ layout, capability: 'owner', role: 'owner' }));
    expect(nonMatching.items).toEqual([]);
    // The referenced editors screen never leaks into fallback even though the section is hidden
    // for this role.
    expect(nonMatching.fallback).not.toContainEqual(expect.objectContaining({ screen: 'editors' }));
  });

  it('never widens access: an engine ref in a roles-granted section still obeys the capability gate', () => {
    const layout = [
      {
        label: 'Club',
        roles: ['club-admin'],
        children: [{ screen: 'editors' }],
      },
    ] as unknown as NavLayout;
    // club-admin matches the section's roles, but editor capability still gates the editors screen.
    const resolved = resolveNavLayout(opts({ layout, capability: 'editor', role: 'club-admin' }));
    expect(resolved.items).toEqual([]);
  });
});

describe('resolveNavLayout: empty sections disappear', () => {
  it('drops a section left with no visible children after filtering', () => {
    const layout: NavLayout = [{ label: 'Owner only', children: [{ screen: 'editors' }] }];
    const resolved = resolveNavLayout(opts({ layout, capability: 'editor', role: 'editor' }));
    expect(resolved.items).toEqual([]);
  });
});
