import { describe, it, expect } from 'vitest';
import { defineAdapter } from '../../lib/content/adapter.js';
import { defineRegistry } from '../../lib/render/registry.js';
import type { CairnAdapter } from '../../lib/content/types.js';

// A minimal valid adapter the tests extend, with the render subsystem the island check reads.
function baseRendering(components: ReturnType<typeof defineRegistry>) {
  return {
    render: async ({ body }: { body: string }) => body,
    components,
  };
}

const liveStub = (() => null) as never; // a stand-in Svelte component for the registry value

function adapterWith(rendering: CairnAdapter['rendering']): CairnAdapter {
  return {
    content: {},
    backend: {} as never,
    email: {} as never,
    rendering,
  };
}

describe('defineAdapter island consistency', () => {
  it('throws when a hydrate component has no island entry', () => {
    const components = defineRegistry({
      components: [{ name: 'poll', label: '', description: '', hydrate: true, build: () => ({ type: 'element', tagName: 'div', properties: {}, children: [] }) }],
    });
    expect(() => defineAdapter(adapterWith(baseRendering(components)))).toThrow(/poll/);
  });

  it('throws when an island entry has no hydrate component', () => {
    const components = defineRegistry({ components: [] });
    expect(() => defineAdapter(adapterWith({ ...baseRendering(components), islands: { ghost: liveStub } }))).toThrow(/ghost/);
  });

  it('accepts a matched hydrate component and island', () => {
    const components = defineRegistry({
      components: [{ name: 'poll', label: '', description: '', hydrate: true, build: () => ({ type: 'element', tagName: 'div', properties: {}, children: [] }) }],
    });
    expect(() => defineAdapter(adapterWith({ ...baseRendering(components), islands: { poll: liveStub } }))).not.toThrow();
  });

  it('accepts a static-only adapter with no islands', () => {
    const components = defineRegistry({
      components: [{ name: 'card', label: '', description: '', build: () => ({ type: 'element', tagName: 'div', properties: {}, children: [] }) }],
    });
    expect(() => defineAdapter(adapterWith(baseRendering(components)))).not.toThrow();
  });
});
