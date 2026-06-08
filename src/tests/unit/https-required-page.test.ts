import { describe, it, expect } from 'vitest';
import { httpsRequiredPage } from '../../lib/sveltekit/https-required-page.js';

describe('httpsRequiredPage', () => {
  it('renders a self-contained document with the fix and the recovery link', () => {
    const html = httpsRequiredPage('https://ecnordic.ski/admin/login');
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('Always Use HTTPS');
    expect(html).toContain('href="https://ecnordic.ski/admin/login"');
    // No external request: the styles are inline and there is no remote stylesheet or script.
    expect(html).not.toMatch(/<link[^>]+stylesheet/i);
    expect(html).not.toContain('<script');
  });

  it('escapes the recovery URL so a crafted path cannot break out of the attribute', () => {
    const html = httpsRequiredPage('https://x.dev/admin/"><script>alert(1)</script>');
    expect(html).not.toContain('"><script>alert(1)');
    expect(html).toContain('&quot;&gt;&lt;script&gt;');
  });
});
