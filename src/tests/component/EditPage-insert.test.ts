import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import EditPage from '../../lib/components/EditPage.svelte';
import { defineComponent, defineRegistry } from '../../lib/render/registry.js';
import { fields } from '../../lib/content/fields.js';
import type { EditData } from '../../lib/sveltekit/content-routes.js';

const base = { build: () => ({ type: 'element' as const, tagName: 'div', properties: {}, children: [] }) };
const callout = defineComponent({
  ...base, name: 'callout', label: 'Callout', description: 'A note.', use: 'Call out an idea.',
  attributes: { tone: fields.select({ label: 'Tone', required: true, options: ['note'] }) },
  slots: [{ name: 'title', label: 'Title', kind: 'inline', required: true }],
});
const registry = defineRegistry({ components: [callout] });

const data: EditData & { siteName: string } = {
  conceptId: 'posts', id: 'hello', label: 'Post', singular: 'Post', fields: [], frontmatter: {}, body: 'Start.',
  title: 'Hello', isNew: false, saved: false, renamed: false, slug: 'hello', linkTargets: [], fragmentTargets: null,
  routable: true, mediaTargets: {}, mediaLibrary: {}, inboundLinks: [], pending: false, published: true,
  publishedFlash: false, publishActions: [], discardedFlash: false, preview: null,
  spellcheckDictionary: 'dictionary-en-us.txt', siteDictionary: [], siteName: 'Demo',
  tidy: { enabled: false, model: 'claude-sonnet-4-6', conventions: { fixes: true, enDashRanges: false, smartQuotes: false, brandCaps: false } },
  advisories: [], orphanTags: [],
};

describe('EditPage guided insert', () => {
  it('exposes the Insert dialog driven by the registry', async () => {
    const screen = await render(EditPage, { data, registry, icons: { snow: 'M1 1h2' } });
    const openBtn = screen.getByRole('button', { name: /insert block/i });
    await expect.element(openBtn).toBeInTheDocument();
    await openBtn.click();
    await expect.element(screen.getByText(/call out an idea/i)).toBeInTheDocument();
  });
});
