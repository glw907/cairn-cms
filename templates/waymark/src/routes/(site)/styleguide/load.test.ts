import { describe, expect, it, vi } from 'vitest';
import type { ComponentRegistry } from '@glw907/cairn-cms';

// `#theme/cairn.config.js` pulls in the full adapter, including a Svelte island this standalone
// vitest config cannot parse. The mock keeps the adapter's two members the load reads: the
// registry and a `render` that returns its input, so the test sees exactly the markdown the load
// hands to the renderer.
const mockCairn = vi.hoisted(() => ({
  cairn: {
    rendering: {
      components: undefined as ComponentRegistry | undefined,
      render: async ({ body }: { body: string }) => `<rendered>${body}</rendered>`,
    },
  },
}));
vi.mock('#theme/cairn.config.js', () => mockCairn);

const build = () => ({ type: 'element' as const, tagName: 'div', properties: {}, children: [] });

async function loadWith(
  defs: Parameters<typeof import('@glw907/cairn-cms').defineRegistry>[0]['components'],
) {
  const { defineRegistry } = await import('@glw907/cairn-cms');
  mockCairn.cairn.rendering.components = defineRegistry({ components: defs });
  vi.resetModules();
  const { load } = await import('./+page.server.js');
  return (await load({} as Parameters<typeof load>[0])) as {
    proseHtml: string;
    components: { name: string; label: string; html: string }[];
    withoutPreview: string[];
  };
}

describe('styleguide load', () => {
  it('renders a sample for a registry entry the route has never heard of', async () => {
    const { defineComponent, fields } = await import('@glw907/cairn-cms');
    const throwaway = defineComponent({
      name: 'throwaway-note',
      label: 'Throwaway note',
      description: 'd',
      build,
      attributes: { tone: fields.text({ label: 'Tone' }) },
      slots: [{ name: 'title', label: 'Title', kind: 'inline' }],
      preview: { attributes: { tone: 'calm' }, slots: { title: 'A throwaway sample' } },
    });

    const data = await loadWith([throwaway]);

    expect(data.components).toEqual([
      {
        name: 'throwaway-note',
        label: 'Throwaway note',
        html: '<rendered>:::throwaway-note[A throwaway sample]{tone="calm"}\n:::</rendered>',
      },
    ]);
    expect(data.withoutPreview).toEqual([]);
  });

  it('lists an entry with no preview by name and renders no sample for it', async () => {
    const { defineComponent } = await import('@glw907/cairn-cms');
    const bare = defineComponent({ name: 'bare', label: 'Bare', description: 'd', build });

    const data = await loadWith([bare]);

    expect(data.components).toEqual([]);
    expect(data.withoutPreview).toEqual(['bare']);
  });

  it('renders the prose sample through the adapter render', async () => {
    const data = await loadWith([]);
    expect(data.proseHtml).toContain('<rendered>');
    expect(data.proseHtml).toContain('This is the reading surface.');
  });
});
