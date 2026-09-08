// The showcase's adapter: the single seam the engine consumes. It declares one post-like concept,
// a render that runs the engine pipeline, and a backend the dev GitHub double answers for. The
// icon set and the registered markdown components live in their own modules
// (`icons.ts`, `markdown-components.ts`); this file holds only the adapter, concepts, backend,
// and navLayout.
import {
  createRenderer,
  defineRegistry,
  defineFieldset,
  fields,
  defineAdapter,
  defineConcept,
  githubApp,
} from '@glw907/cairn-cms';
import {
  normalizeAssets,
  createMediaResolver,
  readCommittedManifest,
} from '@glw907/cairn-cms/media';
import { siteIslands } from './islands/registry.js';
import { proseTypography } from '$chassis/render.js';
import { icons } from './icons.js';
import { components } from './markdown-components.js';
// The ?url import resolves the public chrome's stylesheet to its served URL (the hashed asset in
// a build), so the editor's preview frame can link the same sheet the (site) layout loads. The
// sheet must stay ?url-only; see the header comment in site.css.
import themeCss from './theme.css?url';
import siteCss from './site.css?url';

const registry = defineRegistry({ components });

// The real render path: parse markdown through the engine so registered components render. The
// chassis's proseTypography remark plugin smartens quotes, dashes, and ellipses in body prose;
// wiring it here, at the one createRenderer call, means both the public render and the editor's
// live preview inherit it, since both read the renderMarkdown this composes.
const { renderMarkdown } = createRenderer(registry, { remarkPlugins: proseTypography });

// The committed media manifest the public render resolver reads. A bare {} until an editor uploads.
// Read through import.meta.glob so a fresh site with no committed media.json degrades to {} rather
// than failing the build: a static import of a missing file is a build-time module-not-found, but a
// glob with no match returns {}, and readCommittedManifest parses that to an empty manifest.
const mediaManifest = readCommittedManifest(
  import.meta.glob('../content/.cairn/media.json', { eager: true, import: 'default' }),
);

// The media R2 binding, hoisted once and fed to both normalizeAssets below and the adapter's
// media: member, so the binding name lives in exactly one place rather than two literals that
// could drift apart.
const media = { bucketBinding: 'MEDIA_BUCKET' };

// The default public media resolver, backing the public build over the committed manifest. The
// preview path injects its own resolveMedia from the edit page's mediaTargets; this default keeps a
// published `media:` reference from throwing when no per-call resolver is supplied. Exported so the
// public route can inject the same resolver for the frontmatter hero, one source of truth.
const resolvedAssets = normalizeAssets(media);
export const publicMediaResolver = createMediaResolver(mediaManifest, resolvedAssets);

// Whether media is configured on. The public route threads it as `assetsEnabled` so the engine logs
// `media.resolver_absent` if a future edit drops the resolveMedia wiring while media stays on.
export const mediaEnabled = resolvedAssets.enabled;

export const cairn = defineAdapter({
  content: {
    posts: defineConcept({
      dir: 'src/content/posts',
      label: 'Posts',
      // The create affordances read in the singular ("New post"); an omitted `singular` would
      // fall back to `label` and read "New Posts" instead (ConceptList.svelte's documented
      // fallback, exercised deliberately without one in the engine's own component tests).
      singular: 'post',
      summaryFields: ['description'],
      routing: 'feed',
      fields: defineFieldset({
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
        related: fields.array(fields.reference({ concept: 'posts', label: 'Related post' }), {
          label: 'Related posts',
        }),
        // The taxonomy marker: one creatable multiselect per concept whose validated values surface on
        // ContentSummary.tags and feed categories. cairn ships no public tag pages; a site filters its
        // own archive over this data (the size-gated template filter), so the marker carries no routing.
        topics: fields.multiselect({ label: 'Topics', creatable: true, taxonomy: true }),
        // A closed select exercising a brand-new v2 scalar arm end to end: the editor renders a
        // <select>, the value round-trips through save and reload (the golden-path e2e pins it).
        status: fields.select({
          label: 'Status',
          options: ['draft', 'published'],
          default: 'draft',
        }),
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
      // The create affordances read in the singular ("New page"); an omitted `singular` would fall
      // back to `label` and read "New Pages" instead (the same fallback `posts` names above).
      singular: 'page',
      routing: 'page',
      fields: defineFieldset({
        title: fields.text({ label: 'Title', required: true }),
        robots: fields.text({ label: 'Robots' }),
      }),
    }),
    // The Fragments concept (the reusable-content design): keyed right after pages, per the
    // documented convention, so the flat zero-config nav places it beside the other authored
    // concepts. routing: 'embedded' is required for this key; the engine's own concept
    // normalization enforces it, since the include directive resolves a fragment body through
    // this concept staying non-routable. The fieldset stays minimal: a fragment is a body plus a
    // name for the picker to show, not a full entry.
    fragments: defineConcept({
      dir: 'src/content/fragments',
      label: 'Fragments',
      singular: 'fragment',
      routing: 'embedded',
      fields: defineFieldset({
        title: fields.text({ label: 'Title', required: true }),
      }),
    }),
  },
  // prettier-ignore
  backend: githubApp({ owner: 'showcase', repo: 'demo', branch: 'main', appId: '1', installationId: '2' }),
  email: { from: 'cms@showcase.test' },
  // The media R2 binding (hoisted above so this and normalizeAssets share one literal). The fake
  // R2 double rides platform.env in dev; a real site binds it in wrangler.jsonc and mounts the
  // /media delivery route.
  media,
  // aiPosture?: 'invite' | 'decline' states this site's stance toward AI training crawlers; the
  // site's robots.txt route (docs/extend/wire-the-delivery-surface.md) passes it to
  // robotsResponse, and CairnAdapter.aiPosture (docs/reference/core.md) documents both values.
  // Left unset here on purpose: an unset posture states nothing, which is itself a legitimate
  // choice, and cairn never guesses one on a site's behalf. Set it once you have decided.
  rendering: {
    // Render through the engine so registered components (the callout) produce their markup; the
    // engine's own pipeline already wraps every table in a scrollable, labeled region by default
    // (RendererOptions.tableScroll). The default media resolver backs the public build; the
    // preview path injects its own resolveMedia. resolveFragment forwards the same way: the build
    // passes a site-resolver-backed resolver (createPublicRoutes), the preview a manifest-backed
    // one (EditPage), and this site's render never needs to vary fragment resolution itself.
    render: ({ body, resolve, resolveMedia, resolveFragment }) =>
      renderMarkdown(body, {
        resolve,
        resolveMedia: resolveMedia ?? publicMediaResolver,
        resolveFragment,
      }),
    components: registry,
    icons,
    islands: siteIslands,
  },
  editor: {
    nav: {
      configPath: 'src/theme/site.config.yaml',
      menuName: 'primary',
      label: 'Navigation',
      maxDepth: 2,
    },
    // The site's whole declared sidebar, the organize-your-admin-nav guide's own worked shape: a
    // Content group for what an editor authors and owns, then a trailing Site group for site
    // management, inbound data, configuration, and roster. The custom and engine doors both place
    // by the same razor, what an editor authors versus what the site operates: Library joins
    // Content, since uploaded, described media is
    // the editor's own material the same way posts and pages are (the WordPress-era convention of
    // Media beside Posts/Pages also matches a volunteer editor's muscle memory), while the custom
    // Signups screen lands in Site, not Content, since signups are inbound visitor data,
    // operations rather than manuscript. Tags stays in Site: vocabulary management is
    // configuration, not authoring. Settings and Editors stay trailing as admin config. Help
    // stays unreferenced, so it falls back to the shell's foot slot exactly where the default
    // arrangement already leaves it.
    navLayout: [
      {
        label: 'Content',
        children: [
          { screen: 'posts' },
          { screen: 'pages' },
          { screen: 'fragments' },
          { screen: 'media' },
        ],
      },
      {
        label: 'Site',
        children: [
          { screen: 'vocabulary' },
          { screen: 'nav' },
          { label: 'Signups', icon: 'inbox', href: '/admin/signups' },
          { screen: 'settings', label: 'Site settings' },
          { screen: 'editors' },
        ],
      },
    ],
    // The preview knob: the (site) layout renders an entry inside
    // <main class="site-main"><article class="prose">, and every typography rule in prose.css is
    // scoped to .prose, so the frame needs both classes on its one wrapper div (buildPreviewDoc
    // renders a single element, not the nested main/article pair). Neither sheet declares a
    // descendant rule between the two classes (site.css's figure-placement rules key off .site-main
    // alone; prose.css's typography keys off .prose alone), so naming both on one element reproduces
    // the real page's rendering exactly.
    preview: { stylesheets: [themeCss, siteCss], containerClass: 'site-main prose' },
  },
});

// Re-exported rather than parsed here: site-config.ts owns the one parseSiteConfig call, so a
// lean reader (the root layout server load) can pull just the parsed config and its primary menu
// without importing this whole adapter (the renderer, the icon set, the registered components).
export { siteConfig } from './site-config.js';
