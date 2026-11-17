import { describe, it, expect } from 'vitest';
import { defineAdapter } from '../../lib/content/adapter.js';
import type { CairnAdapter } from '../../lib/content/types.js';

// Only `editor.nav` and `rendering` are read by the checks under test, so the rest of the adapter
// is left out and the literal is cast once here.
function adapterWith(nav: unknown): Parameters<typeof defineAdapter>[0] {
  return { rendering: {}, content: {}, editor: { nav } } as unknown as CairnAdapter;
}

const menu = (menuName: string) => ({ menuName, label: menuName });

describe('defineAdapter editor.nav', () => {
  it('refuses the single-object form', () => {
    expect(() => defineAdapter(adapterWith(menu('primary')))).toThrow(
      "cairn: `editor.nav` is now a list of menus. Wrap the object in brackets: `nav: [{ menuName: 'primary', label: 'Navigation' }]`.",
    );
  });

  it('refuses a repeated menuName', () => {
    expect(() => defineAdapter(adapterWith([menu('primary'), menu('actions'), menu('primary')]))).toThrow(
      'cairn: `editor.nav` declares the menu "primary" twice. Give each menu its own `menuName`.',
    );
  });

  it('refuses more than eight menus', () => {
    const nine = Array.from({ length: 9 }, (_, i) => menu(`m${i}`));
    expect(() => defineAdapter(adapterWith(nine))).toThrow(
      'cairn: `editor.nav` declares 9 menus, and the limit is 8. Remove a menu or edit it in `site.config.yaml`.',
    );
  });

  it('accepts eight distinct menus, one menu, and no nav', () => {
    const eight = Array.from({ length: 8 }, (_, i) => menu(`m${i}`));
    expect(() => defineAdapter(adapterWith(eight))).not.toThrow();
    expect(() => defineAdapter(adapterWith([menu('primary')]))).not.toThrow();
    expect(() => defineAdapter(adapterWith(undefined))).not.toThrow();
  });
});
