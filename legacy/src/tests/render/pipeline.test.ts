import { describe, it, expect } from 'vitest';
import { createRenderer } from '../../lib/render/pipeline';
import { defineRegistry } from '../../lib/render/registry';

describe('createRenderer', () => {
	it('empty-registry renderer renders plain markdown', async () => {
		const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }));
		expect(await renderMarkdown('# Hi\n\nText')).toContain('<h1');
	});

	it('exposes the remark/rehype plugin arrays for Carta wiring', () => {
		const r = createRenderer(defineRegistry({ components: [] }));
		expect(Array.isArray(r.remarkPlugins)).toBe(true);
		expect(Array.isArray(r.rehypePlugins)).toBe(true);
	});

	it('renders a registered component and applies the rise stagger', async () => {
		const reg = defineRegistry({
			components: [
				{
					name: 'box',
					label: '',
					description: '',
					insertTemplate: '',
					build: (node, rise) => {
						node.tagName = 'section';
						node.properties = { className: ['box'], ...(rise ? { style: rise } : {}) };
						return node;
					},
				},
			],
		});
		const { renderMarkdown } = createRenderer(reg, { rise: (i) => `--rise:${i}` });
		const html = await renderMarkdown(':::box\ncontent\n:::');
		expect(html).toContain('class="box"');
		expect(html).toContain('--rise:0');
	});
});
