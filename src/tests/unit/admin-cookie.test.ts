import { describe, expect, it } from 'vitest';
import { adminCookie } from '../../lib/admin/admin-cookie.js';

describe('adminCookie', () => {
  it('appends secure when the page is https', () => {
    expect(adminCookie('theme', 'dark', true)).toBe(
      'theme=dark; path=/admin; max-age=31536000; samesite=lax; secure',
    );
  });

  it('omits secure on http and keeps path, max-age, and samesite', () => {
    const cookie = adminCookie('theme', 'dark', false);
    expect(cookie).toBe('theme=dark; path=/admin; max-age=31536000; samesite=lax');
    expect(cookie).not.toContain('secure');
  });
});
