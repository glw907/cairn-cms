// The showcase's adapter: the single seam the engine consumes. It declares one post-like concept,
// a render that runs the engine pipeline, and a backend the dev GitHub double answers for.
import { createRenderer, defineRegistry } from '@glw907/cairn-cms';
import type { CairnAdapter, ComponentDef, IconSet } from '@glw907/cairn-cms';
import { h } from 'hastscript';
import type { ElementContent } from 'hast';

const icons: IconSet = {
  snowflake: 'M128 24v208M44 76l168 104M212 76L44 180',
  leaf: 'M48 208c0-88 72-160 160-160 0 88-72 160-160 160Z',
};

const callout: ComponentDef = {
  name: 'callout',
  label: 'Callout',
  description: 'A highlighted note with an optional icon.',
  use: 'Draw the reader to one important idea.',
  build: (ctx) =>
    h('aside', { className: ['callout', `callout-${String(ctx.attributes.tone ?? 'note')}`] }, [
      h('p', { className: ['callout-title'] }, ctx.slot('title')),
      h('div', { className: ['callout-body'] }, ctx.slot('body')),
      h('ul', { className: ['callout-points'] }, ctx.items('points').map((item: ElementContent[]) => h('li', item))),
    ]),
  attributes: [
    { key: 'tone', label: 'Tone', type: 'select', required: true, options: ['note', 'warning'] },
    { key: 'icon', label: 'Icon', type: 'icon' },
  ],
  slots: [
    { name: 'title', label: 'Title', kind: 'inline', required: true },
    { name: 'body', label: 'Body', kind: 'markdown' },
    { name: 'points', label: 'Points', kind: 'repeatable', itemFields: [{ key: 'text', label: 'Item', type: 'text' }] },
  ],
};

const registry = defineRegistry({ components: [callout] });

// The real render path: parse markdown through the engine so registered components render.
const { renderMarkdown } = createRenderer(registry);

export const cairn: CairnAdapter = {
  siteName: 'Cairn Showcase',
  content: {
    posts: {
      dir: 'src/content/posts',
      label: 'Posts',
      fields: [
        { type: 'text', name: 'title', label: 'Title', required: true },
        { type: 'date', name: 'date', label: 'Date' },
      ],
      validate(frontmatter, _body) {
        const title = typeof frontmatter.title === 'string' ? frontmatter.title.trim() : '';
        if (!title) return { ok: false, errors: { title: 'Title is required' } };
        return { ok: true, data: { ...frontmatter, title } };
      },
    },
    pages: {
      dir: 'src/content/pages',
      label: 'Pages',
      fields: [{ type: 'text', name: 'title', label: 'Title', required: true }],
      validate(frontmatter, _body) {
        const title = typeof frontmatter.title === 'string' ? frontmatter.title.trim() : '';
        if (!title) return { ok: false, errors: { title: 'Title is required' } };
        return { ok: true, data: { ...frontmatter, title } };
      },
    },
  },
  backend: { owner: 'showcase', repo: 'demo', branch: 'main', appId: '1', installationId: '2' },
  sender: { from: 'cms@showcase.test' },
  // Render through the engine so registered components (the callout) produce their markup.
  render: (md) => renderMarkdown(md),
  navMenu: { configPath: 'src/lib/site.config.yaml', menuName: 'primary', label: 'Navigation', maxDepth: 2 },
  registry,
  icons,
};
