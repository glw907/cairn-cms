import { it, expect } from 'vitest';
import { normalizeAdminNav } from '../../lib/sveltekit/admin-nav.js';
const concepts = [{ id: 'posts', label: 'Posts' }, { id: 'pages', label: 'Pages' }] as never;

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
