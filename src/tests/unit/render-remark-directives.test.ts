import { describe, it, expect } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { remarkDirectiveStamp } from '../../lib/render/remark-directives.js';
import { defineComponent, defineRegistry } from '../../lib/render/registry.js';
import { fields } from '../../lib/content/fields.js';

const reg = defineRegistry({
  components: [
    defineComponent({
      name: 'card',
      label: '',
      description: '',
      insertTemplate: '',
      build: (ctx) => ctx.node,
      attributes: { icon: fields.icon({ label: 'Icon' }) },
    }),
    defineComponent({
      name: 'alert',
      label: '',
      description: '',
      insertTemplate: '',
      build: (ctx) => ctx.node,
      defaultIconByRole: { caution: 'warning' },
      attributes: { icon: fields.icon({ label: 'Icon' }) },
    }),
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
    expect(html).toContain('data-attr-icon="flag"');
    expect(html).toContain('data-role="secondary"');
  });
  it('applies the role default icon for alert', async () => {
    const html = await run(':::alert{role=caution}\n## H\n:::');
    expect(html).toContain('data-attr-icon="warning"');
  });
  it('falls back to the role default when the author icon is blank', async () => {
    const html = await run(':::alert{role=caution icon=""}\n## H\n:::');
    expect(html).toContain('data-attr-icon="warning"');
  });
  it('leaves an unknown container directive unstamped', async () => {
    const html = await run(':::mystery\n## H\n:::');
    expect(html).not.toContain('data-primitive');
  });
  it('restores an accidental prose colon (text directive) verbatim', async () => {
    const html = await run('meet at 9:30 today');
    expect(html).toContain('9:30');
  });
  it('drops an empty label on a title-less component', async () => {
    const html = await run(':::card[]{icon=flag}\nbody\n:::');
    expect(html).not.toContain('<p></p>');
  });
  it('drops a non-empty unclaimed label on a title-less component', async () => {
    const html = await run(':::card[Stray]\nbody\n:::');
    expect(html).not.toContain('Stray');
  });
});

describe('icon attribute round-trip', () => {
  it('stamps a fields.icon value and reads it back into the component context', async () => {
    const { createRenderer } = await import('../../lib/render/pipeline.js');
    const seen: Array<string | boolean | undefined> = [];
    const iconReg = defineRegistry({
      components: [
        defineComponent({
          name: 'badge',
          label: '',
          description: '',
          build: (ctx) => {
            seen.push(ctx.attributes.icon);
            return ctx.node;
          },
          attributes: { icon: fields.icon({ label: 'Icon' }) },
        }),
      ],
    });
    await createRenderer(iconReg).renderMarkdown(':::badge{icon=flag}\nbody\n:::');
    expect(seen[0]).toBe('flag');
  });
});
