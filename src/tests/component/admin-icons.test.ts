import { describe, it, expect } from 'vitest';
import * as icons from '../../lib/components/admin-icons.js';

describe('admin-icons', () => {
  it('re-exports every chrome glyph the admin uses as a component', () => {
    const expected = [
      'MenuIcon', 'SearchIcon', 'ArrowUpIcon', 'ArrowDownIcon', 'ChevronsUpDownIcon',
      'PencilIcon', 'Trash2Icon', 'PlusIcon', 'LogOutIcon', 'SunIcon', 'MoonIcon',
      'ChevronLeftIcon', 'ChevronRightIcon',
    ];
    for (const name of expected) {
      expect(icons, `missing ${name}`).toHaveProperty(name);
      expect(typeof (icons as Record<string, unknown>)[name], `${name} is not a component`).toBe('function');
    }
  });
});
