import { describe, it, expect, afterEach } from 'vitest';
import { detectChromeWrap } from '../../lib/components/chrome-guard.js';

// The data-admin-root attribute is a fixture convenience for locating the test root, not a marker the
// guard looks for. Production binds the real root through bind:this on the bare data-theme wrapper.
function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.body.querySelector<HTMLElement>('[data-admin-root]')!;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('detectChromeWrap', () => {
  it('flags a width-constraining ancestor between the admin root and body', () => {
    const root = mount('<main style="max-width: 64rem"><div data-admin-root></div></main>');
    const msg = detectChromeWrap(root);
    expect(msg).toMatch(/width-constraining ancestor/);
    expect(msg).toMatch(/max-width:/);
    expect(msg).toContain('docs/admin-route-structure.md');
  });

  it('stays silent when the admin root is a direct child of body', () => {
    const root = mount('<div data-admin-root></div>');
    expect(detectChromeWrap(root)).toBeNull();
  });

  it('stays silent on a non-constraining max-width like 100%', () => {
    const root = mount('<div style="max-width: 100%"><div data-admin-root></div></div>');
    expect(detectChromeWrap(root)).toBeNull();
  });

  it('notes host siblings as context when chrome wraps the admin', () => {
    const root = mount(
      '<header class="site-nav"></header><main style="max-width: 70rem"><div data-admin-root></div></main>',
    );
    const msg = detectChromeWrap(root)!;
    expect(msg).toContain('beside the admin');
    expect(msg).toContain('site-nav');
  });
});
