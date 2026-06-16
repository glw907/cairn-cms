import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import EditPage from '../../lib/components/EditPage.svelte';
import { defineRegistry, type ComponentDef } from '../../lib/render/registry.js';

const base = { build: (n: unknown) => n };
const callout: ComponentDef = {
  ...base, name: 'callout', label: 'Callout', description: 'A note.', use: 'Call out an idea.',
  attributes: [{ key: 'tone', label: 'Tone', type: 'select', required: true, options: ['note'] }],
  slots: [{ name: 'title', label: 'Title', kind: 'inline', required: true }],
} as ComponentDef;
const registry = defineRegistry({ components: [callout] });

const data = {
  conceptId: 'posts', id: 'hello', label: 'Post', fields: [], frontmatter: {}, body: 'Start.',
  title: 'Hello', isNew: false, saved: false, error: null, linkTargets: [], mediaTargets: {}, inboundLinks: [], siteName: 'Demo',
};

describe('EditPage guided insert', () => {
  it('exposes the Insert dialog driven by the registry', async () => {
    const screen = render(EditPage, { data, registry, icons: { snow: 'M1 1h2' } } as never);
    const openBtn = screen.getByRole('button', { name: /insert block/i });
    await expect.element(openBtn).toBeInTheDocument();
    await openBtn.click();
    await expect.element(screen.getByText(/call out an idea/i)).toBeInTheDocument();
  });
});
