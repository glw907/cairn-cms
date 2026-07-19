import { describe, it, expect } from 'vitest';
import { validateNavLayout, type NavLayout } from '../../lib/sveltekit/admin-nav.js';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import { runtime } from './_content-harness.js';

/** The context a validateNavLayout call needs; overrides spread over a permissive default. */
function ctx(overrides: Partial<Parameters<typeof validateNavLayout>[1]> = {}) {
  return {
    conceptIds: ['posts', 'pages'],
    navMenuConfigured: false,
    roleNames: ['owner', 'editor'],
    hasAdminNav: false,
    ...overrides,
  };
}

describe('validateNavLayout: construction throws', () => {
  it('rejects an unknown screen id', () => {
    const layout: NavLayout = [{ screen: 'bogus' }];
    expect(() => validateNavLayout(layout, ctx())).toThrow(/unknown screen "bogus"/);
  });

  it('rejects a duplicate engine reference, a hidden one counted the same as a visible one', () => {
    const layout: NavLayout = [{ screen: 'settings' }, { screen: 'settings', hidden: true }];
    expect(() => validateNavLayout(layout, ctx())).toThrow(/screen "settings" is referenced more than once/);
  });

  it('rejects "nav" referenced with no navMenu configured', () => {
    const layout: NavLayout = [{ screen: 'nav' }];
    expect(() => validateNavLayout(layout, ctx({ navMenuConfigured: false }))).toThrow(/navMenu/);
  });

  it('accepts "nav" once a navMenu is configured', () => {
    const layout: NavLayout = [{ screen: 'nav' }];
    expect(() => validateNavLayout(layout, ctx({ navMenuConfigured: true }))).not.toThrow();
  });

  it('rejects a nested section', () => {
    const layout = [
      {
        label: 'Outer',
        children: [{ label: 'Inner', children: [{ screen: 'settings' }] }],
      },
    ] as unknown as NavLayout;
    expect(() => validateNavLayout(layout, ctx())).toThrow(/nested section/);
  });

  it('rejects an empty section', () => {
    const layout = [{ label: 'Empty', children: [] }] as NavLayout;
    expect(() => validateNavLayout(layout, ctx())).toThrow(/section "Empty" has no children/);
  });

  it('rejects an empty relabel, blank or whitespace', () => {
    const blank: NavLayout = [{ screen: 'settings', label: '' }];
    expect(() => validateNavLayout(blank, ctx())).toThrow(/empty relabel/);
    const whitespace: NavLayout = [{ screen: 'settings', label: '   ' }];
    expect(() => validateNavLayout(whitespace, ctx())).toThrow(/empty relabel/);
  });

  it('rejects an unknown icon override on an engine ref, naming the allowlist', () => {
    const layout = [{ screen: 'settings', icon: 'rocket' }] as unknown as NavLayout;
    expect(() => validateNavLayout(layout, ctx())).toThrow(/icon/);
  });

  it('rejects a roles name outside the declared vocabulary, on a top-level entry', () => {
    // 'club-admin' is not in the default owner/editor Role union; a real site's own augmented
    // vocabulary is what makes a name like this assignable, so the test casts to exercise the
    // runtime check this task adds, the same way the codebase's own custom-role fixtures do.
    const layout = [
      { label: 'Signups', icon: 'inbox', href: '/admin/signups', roles: ['club-admin'] },
    ] as unknown as NavLayout;
    expect(() => validateNavLayout(layout, ctx())).toThrow(/role "club-admin".*outside the declared vocabulary/);
  });

  it('rejects a roles name outside the declared vocabulary, on a section', () => {
    const layout = [
      { label: 'Club', roles: ['club-admin'], children: [{ screen: 'editors' }] },
    ] as unknown as NavLayout;
    expect(() => validateNavLayout(layout, ctx())).toThrow(/role "club-admin".*outside the declared vocabulary/);
  });

  it('rejects declaring both adminNav and navLayout', () => {
    const layout: NavLayout = [{ screen: 'settings' }];
    expect(() => validateNavLayout(layout, ctx({ hasAdminNav: true }))).toThrow(
      /cannot declare both adminNav and navLayout/,
    );
  });

  it('rejects a blank or whitespace-only section label', () => {
    const blank = [{ label: '', children: [{ screen: 'settings' }] }] as NavLayout;
    expect(() => validateNavLayout(blank, ctx())).toThrow(/navLayout: a section label cannot be blank/);
    const whitespace = [{ label: '   ', children: [{ screen: 'settings' }] }] as NavLayout;
    expect(() => validateNavLayout(whitespace, ctx())).toThrow(/navLayout: a section label cannot be blank/);
  });

  it('rejects two sections sharing a label', () => {
    const layout: NavLayout = [
      { label: 'Club', children: [{ screen: 'settings' }] },
      { label: 'Club', children: [{ screen: 'editors' }] },
    ];
    expect(() => validateNavLayout(layout, ctx())).toThrow(
      /navLayout: two sections share the label "Club"/,
    );
  });

  it('rejects two site entries sharing an href, one top-level and one section-embedded', () => {
    const layout = [
      { label: 'X', icon: 'inbox', href: '/admin/dup' },
      { label: 'Club', children: [{ label: 'Y', icon: 'list', href: '/admin/dup' }] },
    ] as unknown as NavLayout;
    expect(() => validateNavLayout(layout, ctx())).toThrow(/navLayout: href "\/admin\/dup" is used by more than one entry/);
  });

  it('rejects two site entries sharing an href across two different sections', () => {
    const layout: NavLayout = [
      { label: 'Club', children: [{ label: 'X', icon: 'inbox', href: '/admin/dup' }] },
      { label: 'Team', children: [{ label: 'Y', icon: 'list', href: '/admin/dup' }] },
    ];
    expect(() => validateNavLayout(layout, ctx())).toThrow(/navLayout: href "\/admin\/dup" is used by more than one entry/);
  });
});

describe('validateNavLayout: reuses adminNav entry validation for embedded site entries', () => {
  it('rejects an unknown icon on a top-level entry, the same way normalizeAdminNav does', () => {
    const layout = [{ label: 'X', icon: 'rocket', href: '/admin/x' }] as unknown as NavLayout;
    expect(() => validateNavLayout(layout, ctx())).toThrow(/icon/);
  });

  it('rejects a colliding href on a section-embedded entry, the same way normalizeAdminNav does', () => {
    const layout: NavLayout = [{ label: 'Club', children: [{ label: 'X', icon: 'list', href: '/admin/posts' }] }];
    expect(() => validateNavLayout(layout, ctx())).toThrow(/posts/);
  });
});

describe('validateNavLayout: a valid tree', () => {
  it('validates without throwing: a relabel, a hidden ref, a roles-gated section mixing engine and site nodes, and a loose entry', () => {
    const layout: NavLayout = [
      { screen: 'settings', label: 'Site settings' },
      { screen: 'help', hidden: true },
      {
        label: 'Club',
        roles: ['owner'],
        children: [{ screen: 'editors' }, { label: 'Signups', icon: 'inbox', href: '/admin/signups' }],
      },
      { label: 'Standalone', icon: 'wrench', href: '/admin/tools' },
    ];
    expect(() => validateNavLayout(layout, ctx())).not.toThrow();
  });

  it('accepts an engine ref carrying a valid icon override', () => {
    const layout: NavLayout = [{ screen: 'settings', icon: 'banknote' }];
    expect(() => validateNavLayout(layout, ctx())).not.toThrow();
  });

  it('validates without throwing: two sections with distinct labels, each entry with a distinct href', () => {
    const layout: NavLayout = [
      { label: 'Club', children: [{ label: 'X', icon: 'inbox', href: '/admin/club-x' }] },
      { label: 'Team', children: [{ label: 'Y', icon: 'list', href: '/admin/team-y' }] },
    ];
    expect(() => validateNavLayout(layout, ctx())).not.toThrow();
  });
});

describe('validateNavLayout: wired at admin construction', () => {
  it('throws building createContentRoutes from a runtime carrying a bad navLayout', () => {
    expect(() =>
      createContentRoutes(runtime({ navLayout: [{ screen: 'bogus' }] })),
    ).toThrow(/navLayout: unknown screen "bogus"/);
  });

  it('throws building createContentRoutes from a runtime declaring both adminNav and navLayout', () => {
    expect(() =>
      createContentRoutes(
        runtime({
          adminNav: [{ label: 'X', icon: 'wrench', href: '/admin/x' }],
          navLayout: [{ screen: 'settings' }],
        }),
      ),
    ).toThrow(/cannot declare both adminNav and navLayout/);
  });

  it('does not throw building createContentRoutes from a runtime carrying a valid navLayout', () => {
    expect(() =>
      createContentRoutes(runtime({ navLayout: [{ screen: 'posts' }, { screen: 'settings' }] })),
    ).not.toThrow();
  });

  it('skips validation entirely when navLayout is undeclared, the common case', () => {
    expect(() => createContentRoutes(runtime())).not.toThrow();
  });
});
