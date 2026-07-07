import { describe, it, expect } from 'vitest';
import { normalizeAdminNav, filterNavByRole, flattenNavEntries } from '../../lib/sveltekit/admin-nav.js';
const concepts = [{ id: 'posts', label: 'Posts' }, { id: 'pages', label: 'Pages' }] as never;

describe('normalizeAdminNav: validates and defaults a custom nav entry', () => {
  it('normalizes a valid entry, defaulting ownerOnly', () => {
    expect(normalizeAdminNav([{ label: 'Signups', icon: 'inbox', href: '/admin/signups' }], concepts))
      .toEqual([{ label: 'Signups', iconName: 'inbox', href: '/admin/signups', ownerOnly: false }]);
  });
  it('rejects a reserved-segment href', () => {
    expect(() => normalizeAdminNav([{ label: 'X', icon: 'list', href: '/admin/settings' }], concepts)).toThrow(/settings/);
  });
  it('rejects the media view href (parseAdminPath claims it)', () => {
    expect(() => normalizeAdminNav([{ label: 'X', icon: 'list', href: '/admin/media' }], concepts)).toThrow(/media/);
  });
  it('rejects a concept-route href', () => {
    expect(() => normalizeAdminNav([{ label: 'P2', icon: 'list', href: '/admin/posts' }], concepts)).toThrow(/posts/);
  });
  it('rejects an unknown icon', () => {
    expect(() => normalizeAdminNav([{ label: 'X', icon: 'rocket' as never, href: '/admin/x' }], concepts)).toThrow(/icon/);
  });
});

describe('normalizeAdminNav: one-level section grouping', () => {
  it('resolves a section, its children each validated and defaulted like a flat entry', () => {
    const config = [
      {
        label: 'Club',
        children: [
          { label: 'Events', icon: 'calendar', href: '/admin/club/events' },
          { label: 'Members', icon: 'users', href: '/admin/club/members', ownerOnly: true },
        ],
      },
    ] as never;
    expect(normalizeAdminNav(config, concepts)).toEqual([
      {
        label: 'Club',
        children: [
          { label: 'Events', iconName: 'calendar', href: '/admin/club/events', ownerOnly: false },
          { label: 'Members', iconName: 'users', href: '/admin/club/members', ownerOnly: true },
        ],
      },
    ]);
  });

  it('mixes flat entries and sections, keeping declaration order', () => {
    const config = [
      { label: 'Standalone', icon: 'wrench', href: '/admin/tools' },
      { label: 'Club', children: [{ label: 'Events', icon: 'calendar', href: '/admin/club/events' }] },
    ] as never;
    const resolved = normalizeAdminNav(config, concepts);
    expect(resolved).toHaveLength(2);
    expect(resolved[0]).toEqual({ label: 'Standalone', iconName: 'wrench', href: '/admin/tools', ownerOnly: false });
    expect(resolved[1]).toMatchObject({ label: 'Club' });
  });

  it('rejects a bad icon or a colliding href inside a section child', () => {
    const badIcon = [{ label: 'Club', children: [{ label: 'X', icon: 'rocket', href: '/admin/x' }] }] as never;
    expect(() => normalizeAdminNav(badIcon, concepts)).toThrow(/icon/);
    const collision = [{ label: 'Club', children: [{ label: 'X', icon: 'list', href: '/admin/posts' }] }] as never;
    expect(() => normalizeAdminNav(collision, concepts)).toThrow(/posts/);
  });
});

describe('filterNavByRole', () => {
  const resolved = [
    { label: 'Standalone', iconName: 'wrench', href: '/admin/tools', ownerOnly: false },
    {
      label: 'Club',
      children: [
        { label: 'Events', iconName: 'calendar', href: '/admin/club/events', ownerOnly: false },
        { label: 'Members', iconName: 'users', href: '/admin/club/members', ownerOnly: true },
      ],
    },
    {
      label: 'Owner only',
      children: [{ label: 'Rollover', iconName: 'wrench', href: '/admin/club/rollover', ownerOnly: true }],
    },
  ] as never;

  it('keeps everything for an owner', () => {
    expect(filterNavByRole(resolved, 'owner')).toEqual(resolved);
  });

  it('drops owner-only children for an editor, and an all-owner-only section disappears entirely', () => {
    const out = filterNavByRole(resolved, 'editor');
    expect(out).toEqual([
      { label: 'Standalone', iconName: 'wrench', href: '/admin/tools', ownerOnly: false },
      { label: 'Club', children: [{ label: 'Events', iconName: 'calendar', href: '/admin/club/events', ownerOnly: false }] },
    ]);
  });
});

describe('flattenNavEntries', () => {
  it('flattens section children alongside flat entries, in visual order', () => {
    const resolved = [
      { label: 'Standalone', iconName: 'wrench', href: '/admin/tools', ownerOnly: false },
      {
        label: 'Club',
        children: [{ label: 'Events', iconName: 'calendar', href: '/admin/club/events', ownerOnly: false }],
      },
    ] as never;
    expect(flattenNavEntries(resolved)).toEqual([
      { label: 'Standalone', iconName: 'wrench', href: '/admin/tools', ownerOnly: false },
      { label: 'Events', iconName: 'calendar', href: '/admin/club/events', ownerOnly: false },
    ]);
  });
});
