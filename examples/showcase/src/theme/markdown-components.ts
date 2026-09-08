// The theme's registered markdown components: the nine `defineComponent` declarations the
// adapter's registry lists, plus the two private helpers (`makeIcon`, `parseVideoUrl`) they share.
// Kept apart from `cairn.config.ts`, so the adapter file stays the concepts, backend, and
// navLayout, not the component grammar. Not named `components.ts`: that specifier would collide
// with the `$theme/components` directory six other files already import through.
import { defineComponent, fields } from '@glw907/cairn-cms';
import { cardShell, headRow } from '@glw907/cairn-cms/render';
import { h } from 'hastscript';
import type { ElementContent } from 'hast';
import { isBannerExpired } from './islands/banner-expiry.js';
import { makeIconRenderer } from '$chassis/render.js';
import { icons } from './icons.js';

// The chassis wires the icon set into the render helpers; this theme owns only the glyph data
// (`icons`, in its own module) and where each build() function calls makeIcon.
const makeIcon = makeIconRenderer(icons);

// The video facade's URL parser. Names the platform from the host so a reader knows where the link
// goes before they click; a host outside the declared set is a build-time error (loud, same posture
// as the icon component's unknown-name check).
function parseVideoUrl(raw: string): { platform: string } {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(
      `cairn: video component references URL "${raw}", which is not a valid absolute URL`,
    );
  }
  const host = parsed.hostname.replace(/^(www|m)\./, '');
  if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'youtu.be') {
    return { platform: 'YouTube' };
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    return { platform: 'Vimeo' };
  }
  throw new Error(
    `cairn: video component references URL "${raw}", which is not a supported YouTube or Vimeo link`,
  );
}

export const callout = defineComponent({
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
      h(
        'ul',
        { className: ['callout-points'] },
        ctx.items('points').map((item: ElementContent[]) => h('li', item)),
      ),
    ]),
  attributes: {
    tone: fields.select({ label: 'Tone', required: true, options: ['note', 'tip', 'warning'] }),
    icon: fields.icon({ label: 'Icon' }),
  },
  slots: [
    { name: 'title', label: 'Title', kind: 'inline', required: true },
    { name: 'body', label: 'Body', kind: 'markdown' },
    {
      name: 'points',
      label: 'Points',
      kind: 'repeatable',
      itemFields: { text: fields.text({ label: 'Item' }) },
    },
  ],
});

export const alert = defineComponent({
  name: 'alert',
  label: 'Alert',
  description: 'A bordered note whose icon defaults from its role.',
  use: 'Flag a caution in the flow of a post.',
  group: 'Notices',
  icon: 'alert',
  defaultIconByRole: { caution: 'leaf' },
  build: (ctx) => {
    const name = ctx.attr('icon');
    const role = ctx.attr('role');
    const icon = name ? makeIcon(name, role) : undefined;
    return cardShell(
      ['alert', `alert-${role ?? 'note'}`],
      [headRow(ctx.slot('title'), icon), h('div', { className: ['alert-body'] }, ctx.slot('body'))],
    );
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
export const icon = defineComponent({
  name: 'icon',
  label: 'Icon',
  description:
    'A single glyph from the site icon set, for a note that wants a small marker of its own.',
  use: 'Mark a short standalone line without wrapping it in a card.',
  group: 'Notices',
  icon: 'flag',
  preview: { attributes: { name: 'flag' } },
  attributes: {
    name: fields.icon({ label: 'Icon', required: true }),
  },
  build: (ctx) => {
    const name = ctx.attr('name');
    if (!name || !(name in icons)) {
      throw new Error(
        `cairn: icon component references "${name ?? ''}", which is not in the declared icon set`,
      );
    }
    return makeIcon(name);
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
export const video = defineComponent({
  name: 'video',
  label: 'Video',
  description:
    'A link out to a YouTube or Vimeo video, with no third-party request until the reader clicks through.',
  use: 'Point to an off-site video without loading a third-party player on every page view.',
  group: 'Media',
  icon: 'play',
  preview: {
    attributes: {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'A short walkthrough',
    },
  },
  attributes: {
    url: fields.url({ label: 'Video URL', required: true, help: 'A YouTube or Vimeo link.' }),
    title: fields.text({ label: 'Title', required: true }),
  },
  build: (ctx) => {
    const url = ctx.attr('url') ?? '';
    const title = ctx.attr('title') ?? '';
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
export const pullQuote = defineComponent({
  name: 'pull-quote',
  label: 'Pull quote',
  description: 'One striking sentence, pulled out of the flow and set large.',
  use: 'Land a single sentence hard, once per post at most.',
  group: 'Quotes',
  icon: 'quote',
  preview: {
    slots: { title: 'Write the post you wish someone had handed you on your first day.' },
  },
  attributes: {
    attribution: fields.text({ label: 'Attribution' }),
  },
  slots: [{ name: 'title', label: 'Quote', kind: 'inline', required: true }],
  build: (ctx) => {
    const attribution = ctx.attr('attribution');
    const children: ElementContent[] = [
      h('p', { className: ['pull-quote-text', 'pullquote'] }, ctx.slot('title')),
    ];
    if (attribution)
      children.push(h('figcaption', { className: ['pull-quote-attribution'] }, [attribution]));
    return h('figure', { className: ['pull-quote'] }, children);
  },
});

// A single restrained link-button. The fuller marketing-panel CTA (title, sub-copy, a card ground)
// the styleguide already demonstrates (`.sg-cta`) is a bigger design call the design review owns; this
// component stays a label-plus-link so a post can point at one next step without pre-empting that
// question. `variant` is a closed two-value choice for the same reason.
export const cta = defineComponent({
  name: 'cta',
  label: 'Call to action',
  description:
    'A single prominent link, for pointing the reader at the one next step that matters.',
  use: 'Send the reader toward one destination: another post, an external tool, a signup form.',
  group: 'Actions',
  icon: 'arrow-right',
  preview: {
    attributes: { label: 'Read the guide', url: 'https://example.com', variant: 'primary' },
  },
  attributes: {
    label: fields.text({ label: 'Label', required: true }),
    url: fields.url({ label: 'URL', required: true }),
    variant: fields.select({ label: 'Variant', options: ['primary', 'secondary'] }),
  },
  build: (ctx) => {
    const label = ctx.attr('label') ?? '';
    const url = ctx.attr('url') ?? '';
    const variant = ctx.attr('variant') || 'primary';
    return h('p', { className: ['cta'] }, [
      h('a', { className: ['cta-link', `cta-${variant}`], href: url }, [
        label,
        makeIcon('arrow-right'),
      ]),
    ]);
  },
});

// The cta's compact sibling: a further-reading pointer at the end of a section, not a marketing
// button. It carries the same label-plus-link shape but drops the primary/secondary variant
// choice (a micro-cta is always the same restrained chip) and adds an optional note line for a
// short gloss on where the link goes.
export const microCta = defineComponent({
  name: 'micro-cta',
  label: 'Micro CTA',
  description: 'A compact pointer link, for further reading at the end of a section.',
  use: 'Point the reader at one related page without the weight of a full call to action.',
  group: 'Actions',
  icon: 'arrow-right',
  preview: {
    attributes: {
      label: 'Read the guide',
      url: 'https://example.com',
      note: 'a short gloss on the link',
    },
  },
  attributes: {
    label: fields.text({ label: 'Label', required: true }),
    url: fields.url({ label: 'URL', required: true }),
    note: fields.text({ label: 'Note' }),
  },
  build: (ctx) => {
    const label = ctx.attr('label') ?? '';
    const url = ctx.attr('url') ?? '';
    const note = ctx.attr('note');
    const children: ElementContent[] = [h('span', { className: ['micro-cta-label'] }, [label])];
    if (note) children.push(h('span', { className: ['micro-cta-note'] }, [note]));
    children.push(makeIcon('arrow-right'));
    return h('p', { className: ['micro-cta'] }, [
      h('a', { className: ['micro-cta-link'], href: url }, children),
    ]);
  },
});

// A frequently-asked question on the native <details>/<summary> disclosure, so it works with no JS: a
// closed question is still fully readable by a screen reader and keyboard, it is simply collapsed. The
// question is an attribute (one line, no inline formatting need) rather than a slot, unlike the
// callout/alert title, which is a heading and so takes the inline-markdown slot treatment.
export const faq = defineComponent({
  name: 'faq',
  label: 'FAQ question',
  description: 'One question and its answer, on a native disclosure widget.',
  use: 'Answer a question a reader is likely to have without lengthening the main flow.',
  group: 'Structure',
  icon: 'chevron-down',
  preview: {
    attributes: { question: 'Does this work without JavaScript?' },
    slots: { body: 'Yes. The disclosure is native `<details>`/`<summary>`.' },
  },
  attributes: {
    question: fields.text({ label: 'Question', required: true }),
  },
  slots: [{ name: 'body', label: 'Answer', kind: 'markdown', required: true }],
  build: (ctx) => {
    const question = ctx.attr('question') ?? '';
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
export const banner = defineComponent({
  name: 'banner',
  label: 'Announcement banner',
  description: 'A time-boxed announcement that removes itself once its expiry date passes.',
  use: 'Post a launch, a closure, or any other announcement that should not linger past its date.',
  group: 'Notices',
  icon: 'flag',
  hydrate: true,
  insertTemplate: ':::banner{message="Announcement text" expires="2026-12-31"}\n:::',
  preview: {
    attributes: { message: 'The trailhead lot reopens in the spring.', expires: '2999-01-01' },
  },
  attributes: {
    message: fields.text({ label: 'Announcement', required: true }),
    expires: fields.date({
      label: 'Expires',
      required: true,
      help: 'The banner shows through the end of this date, then renders nothing.',
    }),
  },
  build: (ctx) => {
    const message = ctx.attr('message') ?? '';
    const expires = ctx.attr('expires');
    if (isBannerExpired(expires)) {
      // An expired banner never needs a live re-check: a past expires date stays past, so hydration
      // has nothing to catch that this build() has not already caught. The engine serializes
      // ctx.attributes into data-cairn-props right after build() returns, reading the same object
      // this function holds, so clearing it here keeps the announcement text and date out of the
      // static markup entirely rather than shipping them inert in an attribute a reader's view-source
      // still exposes. The island still mounts with no props, and Banner.svelte's own expiry check (a
      // missing expires counts as expired) renders the same empty output.
      ctx.attributes = {};
      return h('div', { hidden: true, className: ['banner-expired'] }, []);
    }
    return h('div', { className: ['banner'], role: 'status' }, [
      h('p', { className: ['banner-message'] }, [message]),
    ]);
  },
});

export const components = [callout, alert, icon, video, pullQuote, cta, microCta, faq, banner];
