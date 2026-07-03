// The showcase's adapter: the single seam the engine consumes. It declares one post-like concept,
// a render that runs the engine pipeline, and a backend the dev GitHub double answers for.
import { createRenderer, defineRegistry, defineComponent, fieldset, fields, defineAdapter, defineConcept, githubApp, glyph, parseSiteConfig } from '@glw907/cairn-cms';
import { cardShell, headRow, iconSpan, strAttr } from '@glw907/cairn-cms/render';
import { normalizeAssets, makeMediaResolver, readCommittedManifest } from '@glw907/cairn-cms/media';
import type { IconSet } from '@glw907/cairn-cms';
import { h } from 'hastscript';
import type { ElementContent } from 'hast';
import Banner from '$lib/islands/Banner.svelte';
import { isBannerExpired } from '$lib/islands/banner-expiry.js';
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
  // A trail-marker pennant: the icon component's own picker row, a selectable content glyph, and the
  // banner component's picker row (a banner is, literally, a flag).
  flag: 'M64 24v208M64 32h128l-32 32 32 32H64',
  // A solid right-pointing triangle, the video facade's picker row and its thumbnail glyph.
  play: 'M80 32v192l152-96Z',
  // Two stylized quote marks, for the pull-quote picker row.
  quote: 'M48 64h64v64c0 35-29 64-64 64v-32c18 0 32-14 32-32H48Zm112 0h64v64c0 35-29 64-64 64v-32c18 0 32-14 32-32h-32Z',
  // A thick right arrow, for the CTA picker row and its link glyph.
  'arrow-right': 'M32 104h128v-32l96 56-96 56v-32H32Z',
  // A thick downward chevron, echoing the native <details> disclosure marker for the FAQ picker row.
  'chevron-down': 'M32 64 128 176 224 64 224 104 128 216 32 104Z',
};

const callout = defineComponent({
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
  attributes: {
    tone: fields.select({ label: 'Tone', required: true, options: ['note', 'tip', 'warning'] }),
    icon: fields.icon({ label: 'Icon' }),
  },
  slots: [
    { name: 'title', label: 'Title', kind: 'inline', required: true },
    { name: 'body', label: 'Body', kind: 'markdown' },
    { name: 'points', label: 'Points', kind: 'repeatable', itemFields: { text: fields.text({ label: 'Item' }) } },
  ],
});

const makeIcon = (name: string, role?: string) => iconSpan(glyph(name, icons), role);

// The video facade's URL parser. Names the platform from the host so a reader knows where the link
// goes before they click; a host outside the declared set is a build-time error (loud, same posture
// as the icon component's unknown-name check).
function parseVideoUrl(raw: string): { platform: string } {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`cairn: video component references URL "${raw}", which is not a valid absolute URL`);
  }
  const host = parsed.hostname.replace(/^(www|m)\./, '');
  if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'youtu.be') {
    return { platform: 'YouTube' };
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    return { platform: 'Vimeo' };
  }
  throw new Error(`cairn: video component references URL "${raw}", which is not a supported YouTube or Vimeo link`);
}

const alert = defineComponent({
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
  attributes: {
    role: fields.select({ label: 'Role', options: ['note', 'caution'] }),
    icon: fields.icon({ label: 'Icon' }),
  },
  slots: [
    // The title is required: headRow always emits an <h2>, so a titleless alert would render an empty
    // heading (axe empty-heading). Mirror the callout, whose title is required for the same reason.
    { name: 'title', label: 'Title', kind: 'inline', required: true },
    { name: 'body', label: 'Body', kind: 'markdown' },
  ],
});

// A single glyph from the declared icon set, for a note that wants a small marker of its own without a
// card around it. The directive vocabulary is container-only (a bare colon or double-colon directive
// always restores to literal prose, never dispatches), so this renders at its own block position rather
// than truly inline in a sentence; it still serves a standalone line or a short aside. An icon name
// outside the declared set is an author-input error that only a hand-edited directive can reach (the
// picker only offers declared names), so it fails loud at render, the same build-backstop posture
// resolveMedia and resolveLinks use for a broken reference: preview catches the throw and shows the
// failed state (EditPage's preview effect), a public build lets it propagate and fails the build.
const icon = defineComponent({
  name: 'icon',
  label: 'Icon',
  description: 'A single glyph from the site icon set, for a note that wants a small marker of its own.',
  use: 'Mark a short standalone line without wrapping it in a card.',
  group: 'Notices',
  icon: 'flag',
  preview: { attributes: { name: 'flag' } },
  attributes: {
    name: fields.icon({ label: 'Icon', required: true }),
  },
  build: (ctx) => {
    const name = strAttr(ctx, 'name');
    if (!name || !(name in icons)) {
      throw new Error(`cairn: icon component references "${name ?? ''}", which is not in the declared icon set`);
    }
    return iconSpan(glyph(name, icons));
  },
});

// The video facade: a link-out to the source platform, never an embedded player. cairn ships no
// iframe embed. A closed <details> reveal cannot promise "no request before consent" across
// browsers (a closed disclosure still loads its nested resources in several engines), and an
// island-hydrated click-to-embed would need the sanitize allowlist widened to iframe, a real engine
// change outside this task's scope. A static link-out gives a stronger, browser-independent
// guarantee (literally zero requests to the video platform until the reader navigates there) at no
// engine cost, so it is the only facade this component offers. The thumbnail is a generic play glyph,
// not the platform's real thumbnail image: hot-linking the real one would itself be the third-party
// request the facade exists to avoid.
const video = defineComponent({
  name: 'video',
  label: 'Video',
  description: 'A link out to a YouTube or Vimeo video, with no third-party request until the reader clicks through.',
  use: 'Point to an off-site video without loading a third-party player on every page view.',
  group: 'Media',
  icon: 'play',
  preview: { attributes: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', title: 'A short walkthrough' } },
  attributes: {
    url: fields.url({ label: 'Video URL', required: true, help: 'A YouTube or Vimeo link.' }),
    title: fields.text({ label: 'Title', required: true }),
  },
  build: (ctx) => {
    const url = strAttr(ctx, 'url') ?? '';
    const title = strAttr(ctx, 'title') ?? '';
    const { platform } = parseVideoUrl(url);
    return h('figure', { className: ['video-facade'] }, [
      h(
        'a',
        {
          className: ['video-facade-link'],
          href: url,
          target: '_blank',
          rel: 'noopener noreferrer',
          ariaLabel: `Watch "${title}" on ${platform} (opens in a new tab)`,
        },
        [
          h('span', { className: ['video-facade-thumb'] }, [makeIcon('play')]),
          h('span', { className: ['video-facade-platform'] }, [platform]),
        ],
      ),
      h('figcaption', { className: ['video-facade-caption'] }, [title]),
    ]);
  },
});

// A single sentence pulled out of the flow and set large, styled by reusing the manual `.pullquote`
// hook this site's writing guide already documents (see the-reading-surface.md), so the component and
// the raw-HTML tip render identically. The quote is a required inline slot (a pull quote is one line,
// not a paragraph); attribution is optional, since most pulled lines are the author's own words.
const pullQuote = defineComponent({
  name: 'pull-quote',
  label: 'Pull quote',
  description: 'One striking sentence, pulled out of the flow and set large.',
  use: 'Land a single sentence hard, once per post at most.',
  group: 'Quotes',
  icon: 'quote',
  preview: { slots: { title: 'Write the post you wish someone had handed you on your first day.' } },
  attributes: {
    attribution: fields.text({ label: 'Attribution' }),
  },
  slots: [{ name: 'title', label: 'Quote', kind: 'inline', required: true }],
  build: (ctx) => {
    const attribution = strAttr(ctx, 'attribution');
    const children: ElementContent[] = [
      h('p', { className: ['pull-quote-text', 'pullquote'] }, ctx.slot('title')),
    ];
    if (attribution) children.push(h('figcaption', { className: ['pull-quote-attribution'] }, [attribution]));
    return h('figure', { className: ['pull-quote'] }, children);
  },
});

// A single restrained link-button. The fuller marketing-panel CTA (title, sub-copy, a card ground)
// the styleguide already demonstrates (`.sg-cta`) is a bigger design call the design review owns; this
// component stays a label-plus-link so a post can point at one next step without pre-empting that
// question. `variant` is a closed two-value choice for the same reason.
const cta = defineComponent({
  name: 'cta',
  label: 'Call to action',
  description: 'A single prominent link, for pointing the reader at the one next step that matters.',
  use: 'Send the reader toward one destination: another post, an external tool, a signup form.',
  group: 'Actions',
  icon: 'arrow-right',
  preview: { attributes: { label: 'Read the guide', url: 'https://example.com', variant: 'primary' } },
  attributes: {
    label: fields.text({ label: 'Label', required: true }),
    url: fields.url({ label: 'URL', required: true }),
    variant: fields.select({ label: 'Variant', options: ['primary', 'secondary'] }),
  },
  build: (ctx) => {
    const label = strAttr(ctx, 'label') ?? '';
    const url = strAttr(ctx, 'url') ?? '';
    const variant = strAttr(ctx, 'variant') || 'primary';
    return h('p', { className: ['cta'] }, [
      h('a', { className: ['cta-link', `cta-${variant}`], href: url }, [label, makeIcon('arrow-right')]),
    ]);
  },
});

// A frequently-asked question on the native <details>/<summary> disclosure, so it works with no JS: a
// closed question is still fully readable by a screen reader and keyboard, it is simply collapsed. The
// question is an attribute (one line, no inline formatting need) rather than a slot, unlike the
// callout/alert title, which is a heading and so takes the inline-markdown slot treatment.
const faq = defineComponent({
  name: 'faq',
  label: 'FAQ question',
  description: 'One question and its answer, on a native disclosure widget.',
  use: 'Answer a question a reader is likely to have without lengthening the main flow.',
  group: 'Structure',
  icon: 'chevron-down',
  preview: { attributes: { question: 'Does this work without JavaScript?' }, slots: { body: 'Yes. The disclosure is native `<details>`/`<summary>`.' } },
  attributes: {
    question: fields.text({ label: 'Question', required: true }),
  },
  slots: [{ name: 'body', label: 'Answer', kind: 'markdown', required: true }],
  build: (ctx) => {
    const question = strAttr(ctx, 'question') ?? '';
    return h('details', { className: ['faq'] }, [
      h('summary', { className: ['faq-question'] }, [
        h('span', { className: ['faq-question-text'] }, [question]),
        h('span', { className: ['faq-marker'] }, [makeIcon('chevron-down')]),
      ]),
      h('div', { className: ['faq-answer'] }, ctx.slot('body')),
    ]);
  },
});

// A hydrate (island) component: a time-boxed announcement that removes itself once its `expires` date
// passes, on the server and independently again at hydration (see banner-expiry.ts, which build() and
// the live component (Banner.svelte) both call). A missing or unparsable `expires` counts as expired
// too, so a broken date fails silent-to-hidden rather than showing forever or throwing: a banner is a
// low-stakes aside, and hiding it is always the safe failure. The fallback is class-driven (no inline
// style, since rehypeSinkGuard strips it) and states the same message the live component shows, so the
// swap on mount never shifts the layout.
const banner = defineComponent({
  name: 'banner',
  label: 'Announcement banner',
  description: 'A time-boxed announcement that removes itself once its expiry date passes.',
  use: 'Post a launch, a closure, or any other announcement that should not linger past its date.',
  group: 'Notices',
  icon: 'flag',
  hydrate: true,
  insertTemplate: ':::banner{message="Announcement text" expires="2026-12-31"}\n:::',
  preview: { attributes: { message: 'The trailhead lot reopens in the spring.', expires: '2999-01-01' } },
  attributes: {
    message: fields.text({ label: 'Announcement', required: true }),
    expires: fields.date({
      label: 'Expires',
      required: true,
      help: 'The banner shows through the end of this date, then renders nothing.',
    }),
  },
  build: (ctx) => {
    const message = strAttr(ctx, 'message') ?? '';
    const expires = strAttr(ctx, 'expires');
    if (isBannerExpired(expires)) return h('div', { hidden: true, className: ['banner-expired'] }, []);
    return h('div', { className: ['banner'], role: 'status' }, [h('p', { className: ['banner-message'] }, [message])]);
  },
});

const registry = defineRegistry({ components: [callout, alert, icon, video, pullQuote, cta, faq, banner] });

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
  content: {
    posts: defineConcept({
      dir: 'src/content/posts',
      label: 'Posts',
      summaryFields: ['description'],
      routing: 'feed',
      fields: fieldset({
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
        related: fields.array(fields.reference({ concept: 'posts', label: 'Related post' }), { label: 'Related posts' }),
        // The taxonomy marker: one creatable multiselect per concept whose validated values surface on
        // ContentSummary.tags and feed categories. cairn ships no public tag pages; a site filters its
        // own archive over this data (the size-gated template filter), so the marker carries no routing.
        topics: fields.multiselect({ label: 'Topics', creatable: true, taxonomy: true }),
        // A closed select exercising a brand-new v2 scalar arm end to end: the editor renders a
        // <select>, the value round-trips through save and reload (the golden-path e2e pins it).
        status: fields.select({ label: 'Status', options: ['draft', 'published'], default: 'draft' }),
        // A repeatable flat object: array(object) exercising the v2 container editor end to end. The
        // object carries no label of its own (the array labels the group, itemLabel summarizes a row),
        // and the container e2e pins the add/reorder/remove and the save-and-reload round-trip.
        faq: fields.array(
          fields.object({
            fields: {
              question: fields.text({ label: 'Question', required: true }),
              answer: fields.textarea({ label: 'Answer', required: true }),
            },
          }),
          { label: 'FAQ', itemLabel: 'question' },
        ),
        // A repeatable image: array(image) exercising the leaf-array editor arm, each row a hero-style
        // image field whose structured value round-trips through save and reload.
        gallery: fields.array(fields.image({ label: 'Image' }), { label: 'Gallery' }),
      }),
    }),
    pages: defineConcept({
      dir: 'src/content/pages',
      label: 'Pages',
      routing: 'page',
      fields: fieldset({
        title: fields.text({ label: 'Title', required: true }),
        robots: fields.text({ label: 'Robots' }),
      }),
    }),
  },
  backend: githubApp({ owner: 'showcase', repo: 'demo', branch: 'main', appId: '1', installationId: '2' }),
  email: { from: 'cms@showcase.test' },
  // The media R2 binding. The fake R2 double rides platform.env in dev; a real site binds it in
  // wrangler.jsonc and mounts the /media delivery route.
  media: { bucketBinding: 'MEDIA_BUCKET' },
  rendering: {
    // Render through the engine so registered components (the callout) produce their markup. The
    // default media resolver backs the public build; the preview path injects its own resolveMedia.
    render: ({ body, resolve, resolveMedia }) =>
      renderMarkdown(body, { resolve, resolveMedia: resolveMedia ?? publicMediaResolver }),
    components: registry,
    icons,
    islands: { banner: Banner },
  },
  editor: {
    nav: { configPath: 'src/lib/site.config.yaml', menuName: 'primary', label: 'Navigation', maxDepth: 2 },
    // The custom-screen sidebar entry: data-only, a typed Lucide icon name, an unclaimed /admin href.
    // The /admin/signups route gates server-side; this entry only renders the link in the shell.
    adminNav: [{ label: 'Signups', icon: 'inbox', href: '/admin/signups' }],
    // The preview knob: the (site) layout renders entries inside <main class="site-main">, so the
    // frame links site.css and reproduces that container for a design-accurate proof.
    preview: { stylesheets: [themeCss, siteCss], containerClass: 'site-main' },
  },
});

export const siteConfig = parseSiteConfig(siteYaml);
