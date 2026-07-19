import { describe, it, expect } from 'vitest';
import { ADMIN_NAV_ICON_NAMES } from '../../lib/sveltekit/admin-nav.js';
import { ADMIN_NAV_ICONS } from '../../lib/components/admin-nav-icons.js';

describe('the bundled icon allowlist and its component map', () => {
  it('carry exactly the same names, so a widened allowlist cannot drift from an unbundled glyph', () => {
    expect(Object.keys(ADMIN_NAV_ICONS).sort()).toEqual([...ADMIN_NAV_ICON_NAMES].sort());
  });

  it('widens the allowlist to the full working set', () => {
    expect([...ADMIN_NAV_ICON_NAMES].sort()).toEqual(
      [
        'anchor',
        'banknote',
        'bell',
        'calendar',
        'clipboard-list',
        'file-pen',
        'files',
        'graduation-cap',
        'image',
        'inbox',
        'key-round',
        'life-buoy',
        'list',
        'list-ordered',
        'mail',
        'megaphone',
        'menu',
        'package',
        'puzzle',
        'send',
        'settings',
        'shield-check',
        'table',
        'tags',
        'users',
        'users-round',
        'wrench',
      ].sort(),
    );
  });
});
