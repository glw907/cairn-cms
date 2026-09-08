import { describe, expect, it } from 'vitest';
import { isAdminHref } from './admin-link.js';

describe('isAdminHref', () => {
  it.each([
    { href: '/admin', expected: true },
    { href: '/admin/signups', expected: true },
    { href: '/admin/', expected: true },
    { href: '/', expected: false },
    { href: '/archive', expected: false },
    { href: '/administrator', expected: false },
  ])('$href is admin: $expected', ({ href, expected }) => {
    expect(isAdminHref(href)).toBe(expected);
  });
});
