import { describe, it, expect } from 'vitest';
import { csrfRequiredPage } from '../../lib/sveltekit/csrf-required-page.js';

describe('csrfRequiredPage', () => {
  it('renders a branded recovery page back to sign-in', () => {
    const html = csrfRequiredPage();
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('href="/admin/login"');
    expect(html).toMatch(/sign-in|sign in/i);
    expect(html).not.toContain('<script');
    expect(html).not.toMatch(/<link[^>]+stylesheet/i);
  });
});
