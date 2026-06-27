// The showcase's adapter: the single seam the engine consumes. It declares one post-like concept,
// a render that runs the engine pipeline, and a backend the dev GitHub double answers for.
import { createRenderer, defineRegistry, fieldset, fields, defineAdapter, glyph, parseSiteConfig } from '@glw907/cairn-cms';
import { cardShell, headRow, iconSpan, strAttr } from '@glw907/cairn-cms/render';
import { normalizeAssets, makeMediaResolver, readCommittedManifest } from '@glw907/cairn-cms/media';
import type { ComponentDef, IconSet } from '@glw907/cairn-cms';
import { h } from 'hastscript';
import type { ElementContent } from 'hast';
import siteYaml from './site.config.yaml?raw';
// The ?url import resolves the public chrome's stylesheet to its served URL (the hashed asset in
// a build), so the editor's preview frame can link the same sheet the (site) layout loads. The
// sheet must stay ?url-only; see the header comment in site.css.
import themeCss from './theme.css?url';
import siteCss from './site.css?url';

const icons: IconSet = {
  snowflake: 'M128 24v208M44 76l168 104M212 76L44 180',
  leaf: 'M48 208c0-88 72-160 160-160 0 88-72 160-160 160Z',
  // A speech glyph for the callout picker row and a triangle-bang for the alert row.
  callout: 'M216 48H40a8 8 0 0 0-8 8v160l40-32h144a8 8 0 0 0 8-8V56a8 8 0 0 0-8-8Z',
  alert: 'M128 24 8 224h240L128 24Zm0 72v56m0 32v8',
};

const callout: ComponentDef = {
  name: 'callout',
  label: 'Callout',
  description: 'A highlighted note with an optional icon.',
  use: 'Draw the reader to one important idea.',
  group: 'Callouts',
  icon: 'callout',
  // A structured sample so the configure step opens two-pane with a live preview.
  preview: {
    attributes: { tone: 'note' },
    slots: {
      title: 'A worked example',
      body: 'This is what the callout looks like while you fill it in.',
      points: ['First takeaway', 'Second takeaway'],
    },
  },
  build: (ctx) =>
    h('aside', { className: ['callout', `callout-${String(ctx.attributes.tone ?? 'note')}`] }, [
      h('p', { className: ['callout-title'] }, ctx.slot('title')),
      h('div', { className: ['callout-body'] }, ctx.slot('body')),
      h('ul', { className: ['callout-points'] }, ctx.items('points').map((item: ElementContent[]) => h('li', item))),
    ]),
  attributes: [
    { key: 'tone', label: 'Tone', type: 'select', required: true, options: ['note', 'tip', 'warning'] },
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
  group: 'Notices',
  icon: 'alert',
  defaultIconByRole: { caution: 'leaf' },
  build: (ctx) => {
    const name = strAttr(ctx, 'icon');
    const role = strAttr(ctx, 'role');
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
    // The title is required: headRow always emits an <h2>, so a titleless alert would render an empty
    // heading (axe empty-heading). Mirror the callout, whose title is required for the same reason.
    { name: 'title', label: 'Title', kind: 'inline', required: true },
    { name: 'body', label: 'Body', kind: 'markdown' },
  ],
};

const registry = defineRegistry({ components: [callout, alert] });

// The real render path: parse markdown through the engine so registered components render.
const { renderMarkdown } = createRenderer(registry);

// The committed media manifest the public render resolver reads. A bare {} until an editor uploads.
// Read through import.meta.glob so a fresh site with no committed media.json degrades to {} rather
// than failing the build: a static import of a missing file is a build-time module-not-found, but a
// glob with no match returns {}, and readCommittedManifest parses that to an empty manifest.
const mediaManifest = readCommittedManifest(
  import.meta.glob('../content/.cairn/media.json', { eager: true, import: 'default' }),
);

// The default public media resolver, backing the public build over the committed manifest. The
// preview path injects its own resolveMedia from the edit page's mediaTargets; this default keeps a
// published `media:` reference from throwing when no per-call resolver is supplied. Exported so the
// public route can inject the same resolver for the frontmatter hero, one source of truth.
const resolvedAssets = normalizeAssets({ bucketBinding: 'MEDIA_BUCKET' });
export const publicMediaResolver = makeMediaResolver(mediaManifest, resolvedAssets);

// Whether media is configured on. The public route threads it as `assetsEnabled` so the engine logs
// `media.resolver_absent` if a future edit drops the resolveMedia wiring while media stays on.
export const mediaEnabled = resolvedAssets.enabled;

export const cairn = defineAdapter({
  siteName: 'Cairn Showcase',
  content: {
    posts: {
      dir: 'src/content/posts',
      label: 'Posts',
      summaryFields: ['description'],
      schema: fieldset({
        title: fields.text({ label: 'Title', required: true }),
        date: fields.date({ label: 'Date' }),
        // The post files carry a description the SEO head reads; declare it so it survives the
        // validate-once read. Every frontmatter key a site reads must be in its schema.
        description: fields.textarea({ label: 'Description' }),
        image: fields.image({ label: 'Hero image', seo: true }),
        // A single reference to a pages entry: the typed frontmatter author edge. The editor picks
        // it from the pages concept, the build verifies it resolves, and the public route renders the
        // resolved page title linked to its permalink (the reference e2e pins the round-trip and the
        // resolved render end to end).
        author: fields.reference({ concept: 'pages', label: 'Author' }),
        // A many reference to other posts: array(reference) exercising the chip-list editor arm and
        // the multi-edge extractor, delivered as a list of resolved targets.
        related: fields.array(fields.reference({ concept: 'posts' }), { label: 'Related posts' }),
        // A closed select exercising a brand-new v2 scalar arm end to end: the editor renders a
        // <select>, the value round-trips through save and reload (the golden-path e2e pins it).
        status: fields.select({ label: 'Status', options: ['draft', 'published'], default: 'draft' }),
      }),
    },
    pages: {
      dir: 'src/content/pages',
      label: 'Pages',
      schema: fieldset({
        title: fields.text({ label: 'Title', required: true }),
        robots: fields.text({ label: 'Robots' }),
      }),
    },
  },
  backend: { owner: 'showcase', repo: 'demo', branch: 'main', appId: '1', installationId: '2' },
  sender: { from: 'cms@showcase.test' },
  // The media R2 binding. The fake R2 double rides platform.env in dev; a real site binds it in
  // wrangler.jsonc and mounts the /media delivery route.
  assets: { bucketBinding: 'MEDIA_BUCKET' },
  // Render through the engine so registered components (the callout) produce their markup. The
  // default media resolver backs the public build; the preview path injects its own resolveMedia.
  render: (md, opts) => renderMarkdown(md, { ...opts, resolveMedia: opts?.resolveMedia ?? publicMediaResolver }),
  navMenu: { configPath: 'src/lib/site.config.yaml', menuName: 'primary', label: 'Navigation', maxDepth: 2 },
  // The preview knob: the (site) layout renders entries inside <main class="site-main">, so the
  // frame links site.css and reproduces that container for a design-accurate proof.
  preview: { stylesheets: [themeCss, siteCss], containerClass: 'site-main' },
  registry,
  icons,
});

export const siteConfig = parseSiteConfig(siteYaml);
