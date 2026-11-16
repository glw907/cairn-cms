import { describe, it, expect } from 'vitest';
import { resolveNavLayout, type NavLayout } from '../../lib/sveltekit/admin-nav.js';
import type { ResolvedLayoutSection } from '../../lib/sveltekit/admin-nav.js';
import type { Capability } from '../../lib/auth/roles.js';
import type { Editor } from '../../lib/auth/types.js';
import type { AccessMap } from '../../lib/auth/access.js';

/**
 * The context a resolveNavLayout call needs; overrides spread over a permissive owner default.
 *  `capability`/`role` build the {@link Editor} shape resolveNavLayout now reads through
 *  `canReach`, so the many capability/role-shaped call sites below stay unchanged.
 */
function opts(
  overrides: Partial<Omit<Parameters<typeof resolveNavLayout>[0], 'editor'>> & {
    capability?: Capability;
    role?: string;
  } = {},
): Parameters<typeof resolveNavLayout>[0] {
  const { capability = 'owner', role = 'owner', ...rest } = overrides;
  return {
    layout: undefined,
    concepts: [
      { id: 'posts', label: 'Posts' },
      { id: 'pages', label: 'Pages' },
    ],
    navMenus: [{ name: 'primary', label: 'Navigation' }],
    editor: { email: `${role}@test`, displayName: role, role, capability } as Editor,
    ...rest,
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

describe('resolveNavLayout: icon override', () => {
  it('carries a declared icon override onto the resolved engine entry', () => {
    const layout: NavLayout = [{ screen: 'settings', icon: 'banknote' }];
    const resolved = resolveNavLayout(opts({ layout }));
    expect(resolved.items).toEqual([
      { screen: 'settings', label: 'Settings', href: '/admin/settings', iconName: 'banknote' },
    ]);
  });

  it('leaves iconName absent when the ref declares no override', () => {
    const layout: NavLayout = [{ screen: 'settings' }];
    const resolved = resolveNavLayout(opts({ layout }));
    expect(resolved.items[0]).not.toHaveProperty('iconName');
  });
});

describe('resolveNavLayout: omission fallback', () => {
  it('sends engine screens the tree never references to fallback, in engine order', () => {
    const layout: NavLayout = [{ screen: 'posts' }];
    const resolved = resolveNavLayout(opts({ layout, navMenus: [] }));
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
    const resolved = resolveNavLayout(opts({ layout: undefined }));
    expect(resolved.items).toEqual([
      { screen: 'posts', label: 'Posts', href: '/admin/posts', dated: false },
      { screen: 'pages', label: 'Pages', href: '/admin/pages', dated: false },
      { screen: 'media', label: 'Library', href: '/admin/media' },
      { screen: 'vocabulary', label: 'Tags', href: '/admin/vocabulary' },
      { screen: 'nav', label: 'Navigation', href: '/admin/nav/primary' },
      { screen: 'settings', label: 'Settings', href: '/admin/settings' },
      { screen: 'editors', label: 'Editors', href: '/admin/editors' },
    ]);
    expect(resolved.fallback).toEqual([{ screen: 'help', label: 'Help', href: '/admin/help' }]);
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
    const resolved = resolveNavLayout(opts({ navMenus: [] }));
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
      { label: 'Signups', icon: 'inbox', href: '/admin/signups', roles: ['manager'] },
    ] as unknown as NavLayout;
    const matching = resolveNavLayout(opts({ layout, capability: 'editor', role: 'manager' }));
    expect(matching.items).toEqual([
      { label: 'Signups', iconName: 'inbox', href: '/admin/signups', ownerOnly: false },
    ]);
    const nonMatching = resolveNavLayout(opts({ layout, capability: 'owner', role: 'owner' }));
    expect(nonMatching.items).toEqual([]);
  });

  it('gates every child at once when a section carries roles', () => {
    const layout = [
      {
        label: 'Team',
        roles: ['manager'],
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
        label: 'Team',
        roles: ['manager'],
        children: [{ screen: 'editors' }],
      },
    ] as unknown as NavLayout;
    // manager matches the section's roles, but editor capability still gates the editors screen.
    const resolved = resolveNavLayout(opts({ layout, capability: 'editor', role: 'manager' }));
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

// The access-map seam (Task 4): the resolver reads the same canReach authority the guard and the
// engine routes read, so a declared map narrows nav visibility identically to route enforcement.
const PAGES_RESTRICTED: AccessMap = { pages: ['webmaster'] };

describe('resolveNavLayout: the access map gates a concept door', () => {
  it('drops a mapped-away concept for the excluded role, keeps it for the included role and for owner', () => {
    const layout: NavLayout = [{ screen: 'posts' }, { screen: 'pages' }];
    const excluded = resolveNavLayout(
      opts({ layout, access: PAGES_RESTRICTED, capability: 'editor', role: 'publisher' }),
    );
    expect(excluded.items).not.toContainEqual(expect.objectContaining({ screen: 'pages' }));
    expect(excluded.items).toContainEqual(expect.objectContaining({ screen: 'posts' }));

    const included = resolveNavLayout(
      opts({ layout, access: PAGES_RESTRICTED, capability: 'editor', role: 'webmaster' }),
    );
    expect(included.items).toContainEqual(expect.objectContaining({ screen: 'pages' }));

    const owner = resolveNavLayout(opts({ layout, access: PAGES_RESTRICTED, capability: 'owner', role: 'owner' }));
    expect(owner.items).toContainEqual(expect.objectContaining({ screen: 'pages' }));
  });
});

describe('resolveNavLayout: the access map gates a fixed utility screen', () => {
  it('drops a mapped-away utility screen for the excluded role, keeps it for the included role and for owner', () => {
    const access = { settings: ['webmaster'] } as unknown as AccessMap;
    const layout: NavLayout = [{ screen: 'settings' }];
    const excluded = resolveNavLayout(opts({ layout, access, capability: 'editor', role: 'publisher' }));
    expect(excluded.items).toEqual([]);

    const included = resolveNavLayout(opts({ layout, access, capability: 'editor', role: 'webmaster' }));
    expect(included.items).toEqual([{ screen: 'settings', label: 'Settings', href: '/admin/settings' }]);

    const owner = resolveNavLayout(opts({ layout, access, capability: 'owner', role: 'owner' }));
    expect(owner.items).toEqual([{ screen: 'settings', label: 'Settings', href: '/admin/settings' }]);
  });
});

describe('resolveNavLayout: the access map gates a site entry', () => {
  it('drops a mapped-away site href for the excluded role, keeps it for the included role and for owner', () => {
    const access = { '/admin/money': ['webmaster'] } as unknown as AccessMap;
    const layout = [
      { label: 'Money', icon: 'wrench', href: '/admin/money' },
    ] as unknown as NavLayout;
    const excluded = resolveNavLayout(opts({ layout, access, capability: 'editor', role: 'publisher' }));
    expect(excluded.items).toEqual([]);

    const included = resolveNavLayout(opts({ layout, access, capability: 'editor', role: 'webmaster' }));
    expect(included.items).toEqual([
      { label: 'Money', iconName: 'wrench', href: '/admin/money', ownerOnly: false },
    ]);

    const owner = resolveNavLayout(opts({ layout, access, capability: 'owner', role: 'owner' }));
    expect(owner.items).toEqual([
      { label: 'Money', iconName: 'wrench', href: '/admin/money', ownerOnly: false },
    ]);
  });

  it('leaves an unmapped href visible for any editor capability, as today', () => {
    const access = { '/admin/money': ['webmaster'] } as unknown as AccessMap;
    const layout = [
      { label: 'Other', icon: 'wrench', href: '/admin/other' },
    ] as unknown as NavLayout;
    const resolved = resolveNavLayout(opts({ layout, access, capability: 'editor', role: 'publisher' }));
    expect(resolved.items).toEqual([
      { label: 'Other', iconName: 'wrench', href: '/admin/other', ownerOnly: false },
    ]);
  });
});

describe('resolveNavLayout: fallback screens obey the map', () => {
  it('omits a mapped-away screen from fallback for the excluded role, keeps it for the included role', () => {
    const layout: NavLayout = [{ screen: 'posts' }];
    const excluded = resolveNavLayout(
      opts({ layout, access: PAGES_RESTRICTED, capability: 'editor', role: 'publisher', navMenus: [] }),
    );
    expect(excluded.fallback).not.toContainEqual(expect.objectContaining({ screen: 'pages' }));

    const included = resolveNavLayout(
      opts({ layout, access: PAGES_RESTRICTED, capability: 'editor', role: 'webmaster', navMenus: [] }),
    );
    expect(included.fallback).toContainEqual(expect.objectContaining({ screen: 'pages' }));
  });
});

describe('resolveNavLayout: declarative roles and the access map both narrow', () => {
  it('renders only when both a declarative roles section and the access map admit', () => {
    // pages is gated two ways at once: the access map admits webmaster and publisher, but the
    // section's own declarative roles admits only publisher. Both must admit.
    const access = { pages: ['webmaster', 'publisher'] } as unknown as AccessMap;
    const layout = [
      { label: 'Content', roles: ['publisher'], children: [{ screen: 'pages' }] },
    ] as unknown as NavLayout;
    // webmaster passes the map but fails the section's declarative roles gate.
    const webmaster = resolveNavLayout(opts({ layout, access, capability: 'editor', role: 'webmaster' }));
    expect(webmaster.items).toEqual([]);
    // publisher passes both.
    const publisher = resolveNavLayout(opts({ layout, access, capability: 'editor', role: 'publisher' }));
    expect(publisher.items).toEqual([
      { label: 'Content', children: [{ screen: 'pages', label: 'Pages', href: '/admin/pages', dated: false }] },
    ]);
  });
});

describe('resolveNavLayout: declared collapse defaults', () => {
  it('carries a declared collapsed: true onto the resolved section', () => {
    const layout: NavLayout = [
      { label: 'Sec1', collapsed: true, children: [{ screen: 'media' }] },
    ];
    const resolved = resolveNavLayout(opts({ layout }));
    expect(resolved.items).toContainEqual(
      expect.objectContaining({ label: 'Sec1', collapsed: true }),
    );
  });

  it('leaves collapsed absent when the section declares none', () => {
    const layout: NavLayout = [{ label: 'Sec1', children: [{ screen: 'media' }] }];
    const resolved = resolveNavLayout(opts({ layout }));
    const section = resolved.items.find(
      (item): item is ResolvedLayoutSection => 'children' in item && item.label === 'Sec1',
    );
    expect(section?.collapsed).toBeUndefined();
  });
});

describe('resolveNavLayout: default-layout parity with declared-layout on the same map', () => {
  it('gates the default synthesized arrangement identically to a declared tree', () => {
    const access = { pages: ['webmaster'] } as unknown as AccessMap;
    const declared = resolveNavLayout(
      opts({ layout: [{ screen: 'posts' }, { screen: 'pages' }], access, capability: 'editor', role: 'publisher' }),
    );
    const defaulted = resolveNavLayout(opts({ layout: undefined, access, capability: 'editor', role: 'publisher' }));
    expect(declared.items.map((i) => ('screen' in i ? i.screen : i.label))).toEqual(
      defaulted.items.filter((i) => 'screen' in i && (i.screen === 'posts' || i.screen === 'pages')).map((i) =>
        'screen' in i ? i.screen : i.label,
      ),
    );
    // Both arrangements admit posts and refuse pages for this role.
    expect(declared.items).toContainEqual(expect.objectContaining({ screen: 'posts' }));
    expect(declared.items).not.toContainEqual(expect.objectContaining({ screen: 'pages' }));
    expect(defaulted.items).toContainEqual(expect.objectContaining({ screen: 'posts' }));
    expect(defaulted.items).not.toContainEqual(expect.objectContaining({ screen: 'pages' }));
  });
});

describe('resolveNavLayout: several menus', () => {
  const menus = [
    { name: 'primary', label: 'Navigation' },
    { name: 'actions', label: 'Action links' },
  ];
  const primary = { screen: 'nav', label: 'Navigation', href: '/admin/nav/primary' };
  const actions = { screen: 'nav', label: 'Action links', href: '/admin/nav/actions' };

  it('expands a nav ref in a declared section into one entry per menu, in config order', () => {
    const layout: NavLayout = [{ label: 'Site', children: [{ screen: 'nav' }, { screen: 'settings' }] }];
    const resolved = resolveNavLayout(opts({ layout, navMenus: menus }));
    expect(resolved.items).toEqual([
      { label: 'Site', children: [primary, actions, { screen: 'settings', label: 'Settings', href: '/admin/settings' }] },
    ]);
  });

  it('expands a top-level nav ref, applying a declared icon to each entry', () => {
    const layout: NavLayout = [{ screen: 'nav', icon: 'wrench' }];
    const resolved = resolveNavLayout(opts({ layout, navMenus: menus }));
    expect(resolved.items).toEqual([
      { ...primary, iconName: 'wrench' },
      { ...actions, iconName: 'wrench' },
    ]);
  });

  it('keeps one nav slot in the default arrangement, between vocabulary and settings', () => {
    const resolved = resolveNavLayout(opts({ navMenus: menus }));
    const screens = resolved.items.map((n) => ('screen' in n ? `${n.screen}:${n.href}` : n.label));
    expect(screens).toEqual([
      'posts:/admin/posts',
      'pages:/admin/pages',
      'media:/admin/media',
      'vocabulary:/admin/vocabulary',
      'nav:/admin/nav/primary',
      'nav:/admin/nav/actions',
      'settings:/admin/settings',
      'editors:/admin/editors',
    ]);
  });

  it('sends every menu to fallback when the tree never references nav', () => {
    const layout: NavLayout = [{ screen: 'posts' }];
    const resolved = resolveNavLayout(opts({ layout, navMenus: menus }));
    expect(resolved.fallback.filter((e) => 'screen' in e && e.screen === 'nav')).toEqual([primary, actions]);
  });

  it('percent-encodes a menu name in the href', () => {
    const resolved = resolveNavLayout(opts({ navMenus: [{ name: 'a b', label: 'AB' }] }));
    expect(resolved.items).toContainEqual({ screen: 'nav', label: 'AB', href: '/admin/nav/a%20b' });
  });

  it('drops every menu entry for a none-capability session', () => {
    const layout: NavLayout = [{ screen: 'nav' }];
    const resolved = resolveNavLayout(opts({ layout, navMenus: menus, capability: 'none' }));
    expect(resolved.items).toEqual([]);
    expect(resolved.fallback).toEqual([]);
  });
});
