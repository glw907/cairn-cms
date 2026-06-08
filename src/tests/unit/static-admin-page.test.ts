import { describe, it, expect } from 'vitest';
import { renderStaticAdminPage, escapeHtml } from '../../lib/sveltekit/static-admin-page.js';

describe('renderStaticAdminPage', () => {
  it('wraps inner html in a self-contained branded document', () => {
    const html = renderStaticAdminPage({ title: 'T · Cairn', innerHtml: '<h1>Hello</h1>' });
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<h1>Hello</h1>');
    expect(html).toContain('Powered by Cairn');
    expect(html).not.toMatch(/<link[^>]+stylesheet/i);
    expect(html).not.toContain('<script');
  });

  it('escapes the title', () => {
    expect(renderStaticAdminPage({ title: '<x>', innerHtml: '' })).toContain('<title>&lt;x&gt;</title>');
  });
});

describe('escapeHtml', () => {
  it('escapes the four entities', () => {
    expect(escapeHtml('&<>"')).toBe('&amp;&lt;&gt;&quot;');
  });
});
