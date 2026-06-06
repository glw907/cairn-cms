import { describe, it, expect } from 'vitest';
import type { Root, Element } from 'hast';
import { h } from 'hastscript';
import { rehypeSinkGuard } from '../../lib/render/sanitize-schema.js';

// Run the guard over a single element and return it for inspection.
function guard(el: Element): Element {
  const tree: Root = { type: 'root', children: [el] };
  rehypeSinkGuard()(tree);
  return tree.children[0] as Element;
}

function keys(el: Element): string[] {
  return Object.keys(el.properties ?? {});
}

describe('rehypeSinkGuard', () => {
  it('drops a javascript: href', () => {
    const el = guard(h('a', { href: 'javascript:alert(1)' }, 'x'));
    expect(el.properties?.href).toBeUndefined();
  });

  it('drops a data: src', () => {
    const el = guard(h('img', { src: 'data:text/html,<script>alert(1)</script>' }));
    expect(el.properties?.src).toBeUndefined();
  });

  it('drops a vbscript: href', () => {
    const el = guard(h('a', { href: 'vbscript:msgbox(1)' }, 'x'));
    expect(el.properties?.href).toBeUndefined();
  });

  it('drops a scheme obfuscated with a control character', () => {
    const el = guard(h('a', { href: 'java\tscript:alert(1)' }, 'x'));
    expect(el.properties?.href).toBeUndefined();
  });

  it('drops a scheme with leading whitespace and mixed case', () => {
    const el = guard(h('a', { href: '  JaVaScRiPt:alert(1)' }, 'x'));
    expect(el.properties?.href).toBeUndefined();
  });

  it('removes every on* event handler', () => {
    const el = guard(h('div', { onClick: 'steal()', onError: 'x' }, 'y'));
    expect(keys(el).some((k) => /^on/i.test(k))).toBe(false);
  });

  it('removes inline style wholesale', () => {
    const el = guard(h('div', { style: 'color:red' }, 'y'));
    expect(el.properties?.style).toBeUndefined();
  });

  it('drops a srcset whose one candidate is unsafe', () => {
    const el = guard(h('img', { srcSet: 'https://ok.test/a 1x, javascript:alert(1) 2x' }));
    expect(el.properties?.srcSet).toBeUndefined();
  });

  it('keeps a safe http href', () => {
    const el = guard(h('a', { href: 'https://ok.test/x' }, 'x'));
    expect(el.properties?.href).toBe('https://ok.test/x');
  });

  it('keeps a relative href', () => {
    const el = guard(h('a', { href: '/posts/x' }, 'x'));
    expect(el.properties?.href).toBe('/posts/x');
  });

  it('keeps an anchor href', () => {
    const el = guard(h('a', { href: '#section' }, 'x'));
    expect(el.properties?.href).toBe('#section');
  });

  it('keeps a mailto href', () => {
    const el = guard(h('a', { href: 'mailto:a@b.test' }, 'x'));
    expect(el.properties?.href).toBe('mailto:a@b.test');
  });

  it('keeps the cairn: token href', () => {
    const el = guard(h('a', { href: 'cairn:posts/x' }, 'x'));
    expect(el.properties?.href).toBe('cairn:posts/x');
  });

  it('keeps a srcset whose candidates are all safe', () => {
    const el = guard(h('img', { srcSet: 'https://ok.test/a 1x, https://ok.test/b 2x' }));
    expect(el.properties?.srcSet).toBeDefined();
  });
});
