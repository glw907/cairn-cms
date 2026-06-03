// The showcase's adapter: the single seam the engine consumes. It declares one post-like concept,
// a render that runs the engine pipeline, and a backend the dev GitHub double answers for.
import { createRenderer, defineRegistry, defineFields, defineAdapter, cardShell, headRow, iconSpan, glyph } from '@glw907/cairn-cms';
import type { ComponentDef, IconSet } from '@glw907/cairn-cms';
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

const makeIcon = (name: string, role?: string) => iconSpan(glyph(name, icons), role);

const alert: ComponentDef = {
  name: 'alert',
  label: 'Alert',
  description: 'A bordered note whose icon defaults from its role.',
  use: 'Flag a caution in the flow of a post.',
  defaultIconByRole: { caution: 'leaf' },
  build: (ctx) => {
    const name = typeof ctx.attributes.icon === 'string' ? ctx.attributes.icon : undefined;
    const role = typeof ctx.attributes.role === 'string' ? ctx.attributes.role : undefined;
    const icon = name ? makeIcon(name, role) : undefined;
    return cardShell(['alert', `alert-${role ?? 'note'}`], [
      headRow(ctx.slot('title'), icon),
      h('div', { className: ['alert-body'] }, ctx.slot('body')),
    ]);
  },
  attributes: [
    { key: 'role', label: 'Role', type: 'select', options: ['note', 'caution'] },
    { key: 'icon', label: 'Icon', type: 'icon' },
  ],
  slots: [
    { name: 'title', label: 'Title', kind: 'inline' },
    { name: 'body', label: 'Body', kind: 'markdown' },
  ],
};

const registry = defineRegistry({ components: [callout, alert] });

// The real render path: parse markdown through the engine so registered components render.
const { renderMarkdown } = createRenderer(registry);

export const cairn = defineAdapter({
  siteName: 'Cairn Showcase',
  content: {
    posts: {
      dir: 'src/content/posts',
      label: 'Posts',
      summaryFields: ['description'],
      schema: defineFields([
        { type: 'text', name: 'title', label: 'Title', required: true },
        { type: 'date', name: 'date', label: 'Date' },
        // The post files carry a description the SEO head reads; declare it so it survives the
        // validate-once read. Every frontmatter key a site reads must be in its schema.
        { type: 'textarea', name: 'description', label: 'Description' },
        { type: 'text', name: 'image', label: 'Social image' },
        { type: 'text', name: 'author', label: 'Author' },
      ]),
    },
    pages: {
      dir: 'src/content/pages',
      label: 'Pages',
      schema: defineFields([
        { type: 'text', name: 'title', label: 'Title', required: true },
        { type: 'text', name: 'robots', label: 'Robots' },
      ]),
    },
  },
  backend: { owner: 'showcase', repo: 'demo', branch: 'main', appId: '1', installationId: '2' },
  sender: { from: 'cms@showcase.test' },
  // Render through the engine so registered components (the callout) produce their markup.
  render: (md, opts) => renderMarkdown(md, opts),
  navMenu: { configPath: 'src/lib/site.config.yaml', menuName: 'primary', label: 'Navigation', maxDepth: 2 },
  registry,
  icons,
});
