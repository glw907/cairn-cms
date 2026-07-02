import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { hydrateIslands } from '../../lib/islands/index.js';
import Echo from './islands/_Echo.svelte';

// Build one island boundary in the document and return it. The fallback is a <span> so we can assert it is
// replaced by the mounted component.
function boundary(props: Record<string, unknown>, opts: { name?: string; visible?: boolean } = {}): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('data-cairn-island', opts.name ?? 'echo');
  el.setAttribute('data-cairn-props', JSON.stringify(props));
  if (opts.visible) el.setAttribute('data-cairn-hydrate', 'visible');
  el.innerHTML = '<span data-testid="fallback">fallback</span>';
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('hydrateIslands', () => {
  it('mounts an eager island over its fallback', () => {
    boundary({ label: 'hello' });
    hydrateIslands({ echo: Echo });
    expect(document.querySelector('[data-testid="fallback"]')).toBeNull();
    expect(document.querySelector('[data-testid="echo"]')?.textContent).toBe('hello');
  });

  it('leaves the fallback for an unknown island name', () => {
    boundary({ label: 'x' }, { name: 'mystery' });
    hydrateIslands({ echo: Echo });
    expect(document.querySelector('[data-testid="fallback"]')?.textContent).toBe('fallback');
  });

  it('leaves the fallback when props are malformed', () => {
    const el = boundary({});
    el.setAttribute('data-cairn-props', '{not json');
    hydrateIslands({ echo: Echo });
    expect(document.querySelector('[data-testid="fallback"]')?.textContent).toBe('fallback');
  });

  it('renders a markup-bearing prop as literal text, never as HTML', () => {
    // Locks the text-only prop contract: a prop carrying markup must reach the component as data and bind
    // as escaped text, so a future fixture edit that routed a prop into a sink would fail this.
    boundary({ label: '<b>x</b>' });
    hydrateIslands({ echo: Echo });
    const echo = document.querySelector('[data-testid="echo"]');
    expect(echo?.textContent).toBe('<b>x</b>');
    expect(echo?.querySelector('b')).toBeNull();
  });

  it("defers a 'visible' island until intersection", () => {
    // Capture the IntersectionObserver callback so the test controls when intersection fires.
    let trigger: (() => void) | undefined;
    const Real = window.IntersectionObserver;
    class FakeObserver {
      constructor(private cb: IntersectionObserverCallback) {}
      observe(node: Element) {
        trigger = () => this.cb([{ isIntersecting: true, target: node } as IntersectionObserverEntry], this as never);
      }
      disconnect() {}
      unobserve() {}
      takeRecords() { return []; }
    }
    window.IntersectionObserver = FakeObserver as never;
    try {
      boundary({ label: 'later' }, { visible: true });
      hydrateIslands({ echo: Echo });
      // not mounted yet
      expect(document.querySelector('[data-testid="echo"]')).toBeNull();
      trigger?.();
      expect(document.querySelector('[data-testid="echo"]')?.textContent).toBe('later');
    } finally {
      window.IntersectionObserver = Real;
    }
  });

  it('unmounts the previous pass before re-running (navigation)', () => {
    boundary({ label: 'first' });
    hydrateIslands({ echo: Echo });
    expect(document.querySelectorAll('[data-testid="echo"]').length).toBe(1);
    // a second pass over the same DOM must not stack a second instance
    hydrateIslands({ echo: Echo });
    expect(document.querySelectorAll('[data-testid="echo"]').length).toBe(1);
  });
});
