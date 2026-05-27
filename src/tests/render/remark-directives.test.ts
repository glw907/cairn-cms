import { describe, it, expect } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { remarkDirectiveStamp } from '../../lib/render/remark-directives';
import { defineRegistry } from '../../lib/render/registry';

const reg = defineRegistry({
	components: [
		{ name: 'card', label: '', description: '', insertTemplate: '', build: (n) => n },
		{
			name: 'alert',
			label: '',
			description: '',
			insertTemplate: '',
			build: (n) => n,
			defaultIconByRole: { caution: 'warning' },
		},
	],
});

async function run(md: string) {
	const f = await unified()
		.use(remarkParse)
		.use(remarkDirective)
		.use(remarkDirectiveStamp, reg)
		.use(remarkRehype, { allowDangerousHtml: true })
		.use(rehypeStringify)
		.process(md);
	return String(f);
}

describe('remarkDirectiveStamp', () => {
	it('stamps a known container directive with data-primitive/icon/role', async () => {
		const html = await run(':::card{icon=flag role=secondary}\n## H\n:::');
		expect(html).toContain('data-primitive="card"');
		expect(html).toContain('data-icon="flag"');
		expect(html).toContain('data-role="secondary"');
	});
	it('applies the role default icon for alert', async () => {
		const html = await run(':::alert{role=caution}\n## H\n:::');
		expect(html).toContain('data-icon="warning"');
	});
	it('leaves an unknown container directive unstamped', async () => {
		const html = await run(':::mystery\n## H\n:::');
		expect(html).not.toContain('data-primitive');
	});
	it('restores an accidental prose colon (text directive) verbatim', async () => {
		const html = await run('meet at 9:30 today');
		expect(html).toContain('9:30');
	});
});
