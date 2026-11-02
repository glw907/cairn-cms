import { describe, it, expect } from 'vitest';
import { defineAdapter } from '../../lib/content/adapter.js';
import { defineRegistry } from '../../lib/render/registry.js';
import type { BackendProvider } from '../../lib/github/backend.js';
import type { BlockDef } from '../../lib/render/registry.js';
import type { CairnAdapter, SenderConfig } from '../../lib/content/types.js';
import type { Component } from 'svelte';

// A minimal valid adapter the tests extend, with the render subsystem the island check reads.
function baseRendering(blocks: BlockDef[]) {
  return {
    render: async ({ body }: { body: string }) => body,
    blocks,
  };
}

// A stand-in Svelte component for the registry value; only its identity as a distinct entry
// matters to assertIslandsConsistent, never its render output.
const liveStub = (() => null) as unknown as Component;

function adapterWith(rendering: CairnAdapter['rendering']): CairnAdapter {
  return {
    content: {},
    // assertIslandsConsistent reads only `rendering`; backend/email are structurally required
    // but never touched by the island check this file exercises.
    backend: {} as unknown as BackendProvider,
    email: {} as unknown as SenderConfig,
    rendering,
  };
}

describe('defineAdapter island consistency', () => {
  it('throws when a hydrate component has no island entry', () => {
    const blocks = [{ name: 'poll', label: '', description: '', hydrate: true, build: () => ({ type: 'element', tagName: 'div', properties: {}, children: [] }) }] satisfies BlockDef[];
    expect(() => defineAdapter(adapterWith(baseRendering(blocks)))).toThrow(/poll/);
  });

  it('refuses a reserved block name at boot, for a site that hand-writes render', () => {
    const blocks = [{ name: 'figure', label: '', description: '', build: () => ({ type: 'element', tagName: 'div', properties: {}, children: [] }) }] satisfies BlockDef[];
    expect(() => defineAdapter(adapterWith(baseRendering(blocks)))).toThrow(/reserved directive name/);
  });

  it('throws when an island entry has no hydrate component', () => {
    expect(() => defineAdapter(adapterWith({ ...baseRendering([]), islands: { ghost: liveStub } }))).toThrow(/ghost/);
  });

  it('accepts a matched hydrate component and island', () => {
    const blocks = [{ name: 'poll', label: '', description: '', hydrate: true, build: () => ({ type: 'element', tagName: 'div', properties: {}, children: [] }) }] satisfies BlockDef[];
    expect(() => defineAdapter(adapterWith({ ...baseRendering(blocks), islands: { poll: liveStub } }))).not.toThrow();
  });

  it('accepts a static-only adapter with no islands', () => {
    const blocks = [{ name: 'card', label: '', description: '', build: () => ({ type: 'element', tagName: 'div', properties: {}, children: [] }) }] satisfies BlockDef[];
    expect(() => defineAdapter(adapterWith(baseRendering(blocks)))).not.toThrow();
  });

  it('accepts a rendering with no blocks key, and a frozen blocks array', () => {
    const render = async ({ body }: { body: string }) => body;
    expect(() => defineAdapter(adapterWith({ render }))).not.toThrow();
    expect(() => defineAdapter(adapterWith({ render, blocks: Object.freeze([]) }))).not.toThrow();
  });

  it('refuses a stale components key under rendering, naming blocks', () => {
    const registry = defineRegistry({ blocks: [] });
    const stale = { render: async ({ body }: { body: string }) => body, components: registry };
    expect(() => defineAdapter(adapterWith(stale as never))).toThrow(/`blocks`/); // idioms-allow: as-never  a stale shape the refusal exists to catch
  });
});
