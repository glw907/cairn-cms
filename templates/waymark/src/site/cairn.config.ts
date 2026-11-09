// This site's adapter: the single seam the engine consumes. It declares the posts, pages, and
// fragments concepts, the media wiring, the navLayout, and the preview knob, over a render that
// runs the engine pipeline and a backend the dev GitHub double answers for. The
// icon set and the directive renderers live in separate modules (`icons.ts`,
// `directives/renderers.ts`); this file holds only the adapter, concepts, backend,
// and navLayout.
import {
  createRenderer,
  fields,
  defineAdapter,
  defineConcept,
  createGithubApp,
  type MediaConfig,
} from '@glw907/cairn-cms';
import { createMediaResolver, readCommittedManifest } from '@glw907/cairn-cms/media';
import { siteIslands } from '#theme/directives/islands/registry.js';
import { proseTypography } from '#chassis/render.js';
import { icons } from '#theme/icons.js';
import { composeBlocks } from '#chassis/directives/compose.js';
import { renderers } from '#theme/directives/renderers.js';
// The ?url import resolves the public chrome's stylesheet to its served URL (the hashed asset in
// a build), so the editor's preview frame can link the same sheet the (site) layout loads. The
// sheet must stay ?url-only; see the header comment in site.css.
import themeCss from '#theme/theme.css?url';
import siteCss from '#theme/site.css?url';
import themeOptionsCss from '#site/theme-options.css?url';
import overridesCss from '#site/overrides.css?url';

/**
 * The site's public origin as a literal: the feed, sitemap, robots.txt, and canonical links read
 * it at build time. `PUBLIC_ORIGIN` in `wrangler.jsonc` is the Worker's runtime value for the same
 * host, so a hand change to the domain edits both. Setup rewrites both together, then rebuilds.
 */
export const publicOrigin = 'https://showcase.test';

// The real render path: parse markdown through the engine so registered blocks render. The
// chassis's proseTypography remark plugin smartens quotes, dashes, and ellipses in body prose;
// wiring it here, at the one createRenderer call, means both the public render and the editor's
// live preview inherit it, since both read the render this composes.

// The committed media manifest the public render resolver reads. A bare {} until an editor uploads.
// Read through import.meta.glob so a fresh site with no committed media.json degrades to {} rather
// than failing the build: a static import of a missing file is a build-time module-not-found, but a
// glob with no match returns {}, and readCommittedManifest parses that to an empty manifest.
const mediaManifest = readCommittedManifest(
  import.meta.glob('../content/.cairn/media.json', { eager: true, import: 'default' }),
);

// The media R2 binding, hoisted once and fed to both createMediaResolver below and the adapter's
// media: member, so the binding name lives in exactly one place rather than two literals that
// could drift apart.
const media: MediaConfig = { bucketBinding: 'MEDIA_BUCKET' };

// The site's one media resolver, backing the public build over the committed manifest. The preview
// path injects its resolveMedia from the edit page's mediaTargets; this default keeps a published
// `media:` reference from throwing when no per-call resolver is supplied. Exported so the public
// route can inject the same resolver for the frontmatter hero, one source of truth.
export const resolveMedia = createMediaResolver(media, mediaManifest);

// The registered directive blocks: the chassis vocabulary over this theme's icon set, with the
// theme's renderer overrides (none for Waymark).
const blocks = composeBlocks(icons, renderers);

const renderer = createRenderer({
  blocks,
  remarkPlugins: proseTypography,
  resolveMedia,
});

export const cairn = defineAdapter({
  content: {
    posts: defineConcept({
      dir: 'src/content/posts',
      label: 'Posts',
      // The create buttons read in the singular ("New post"); without `singular` they would fall
      // back to `label` and read "New Posts".
      singular: 'post',
      summaryFields: ['description'],
      routing: 'dated',
      fields: {
        title: fields.text({ label: 'Title', required: true }),
        date: fields.date({ label: 'Date' }),
        // The post files carry a description the SEO head reads; declare it so it survives the
        // validate-once read. Every frontmatter key a site reads must be in its schema.
        description: fields.textarea({ label: 'Description' }),
        image: fields.image({ label: 'Hero image', seo: true }),
        // A single reference to a pages entry: the typed frontmatter author edge. The editor picks
        // it from the pages concept, the build verifies it resolves, and the public route renders the
        // resolved page title linked to its permalink.
        author: fields.reference({ concept: 'pages', label: 'Author' }),
        // A many reference to other posts: an array of references, edited as a chip list and
        // delivered as a list of resolved targets.
        related: fields.array({
          item: fields.reference({ concept: 'posts', label: 'Related post' }),
          label: 'Related posts',
        }),
        // The taxonomy marker: one creatable multiselect per concept whose validated values surface on
        // ContentSummary.tags and feed categories. cairn ships no public tag pages; a site filters its
        // archive over this data (the size-gated template filter), so the marker carries no routing.
        topics: fields.multiselect({ label: 'Topics', creatable: true, taxonomy: true }),
        // A closed select: the editor renders a <select> over a fixed set of options.
        status: fields.select({
          label: 'Status',
          options: ['draft', 'published'],
          default: 'draft',
        }),
        // A repeatable flat object: the editor adds, reorders, and removes rows. The object carries
        // no label (the array labels the group, and itemLabel summarizes a row).
        faq: fields.array({
          item: fields.object({
            fields: {
              question: fields.text({ label: 'Question', required: true }),
              answer: fields.textarea({ label: 'Answer', required: true }),
            },
          }),
          label: 'FAQ',
          itemLabel: 'question',
        }),
        // A repeatable image: each row is a hero-style image field.
        gallery: fields.array({ item: fields.image({ label: 'Image' }), label: 'Gallery' }),
      },
    }),
    pages: defineConcept({
      dir: 'src/content/pages',
      label: 'Pages',
      // The create affordances read in the singular ("New page"); an omitted `singular` would fall
      // back to `label` and read "New Pages" instead (the same fallback `posts` names above).
      singular: 'page',
      routing: 'page',
      fields: {
        title: fields.text({ label: 'Title', required: true }),
        robots: fields.text({ label: 'Robots' }),
      },
    }),
    // The Fragments concept (the reusable-content design): keyed right after pages, per the
    // documented convention, so the flat zero-config nav places it beside the other authored
    // concepts. routing: 'embedded' is required for this key; the engine's concept
    // normalization enforces it, since the include directive resolves a fragment body through
    // this concept staying non-routable. The fieldset stays minimal: a fragment is a body plus a
    // name for the picker to show, not a full entry.
    fragments: defineConcept({
      dir: 'src/content/fragments',
      label: 'Fragments',
      singular: 'fragment',
      routing: 'embedded',
      fields: {
        title: fields.text({ label: 'Title', required: true }),
      },
    }),
  },
  // prettier-ignore
  backend: createGithubApp({ owner: 'showcase', repo: 'demo', branch: 'main', appId: '1', installationId: '2' }),
  // A verified sender literal, not derived from publicOrigin or any other URL host: Cloudflare Email
  // Routing verifies a sender address, not a domain owned by inference, so deriving one from a
  // URL host is exactly what E_SENDER_NOT_VERIFIED punishes on send.
  email: { from: 'cms@showcase.test' },
  // The media R2 binding (hoisted above so this and createMediaResolver share one literal). The fake
  // R2 double rides the Worker env in dev; a real site binds it in wrangler.jsonc and mounts the
  // /media delivery route.
  media,
  // aiPosture?: 'invite' | 'decline' states this site's stance toward AI training crawlers; the
  // site's robots.txt route passes it to buildRobotsResponse, and CairnAdapter.aiPosture
  // documents both values; the cairn-extending-a-site skill helps pick.
  // Left unset here on purpose: an unset posture states nothing, which is itself a legitimate
  // choice, and cairn never guesses one on a site's behalf. Set it once you have decided.
  rendering: {
    // Render through the engine so registered blocks (the callout) produce their markup; the
    // engine's pipeline already wraps every table in a scrollable, labeled region by default
    // (RendererConfig.tableScroll). The renderer's resolveMedia default backs the public build; the
    // preview path injects its own per call. renderer.render forwards resolveFragment too: the build
    // passes a site-resolver-backed resolver (createPublicRoutes), the preview a manifest-backed
    // one (EditPage).
    render: renderer.render,
    blocks,
    icons,
    islands: siteIslands,
  },
  editor: {
    nav: {
      menuName: 'primary',
      label: 'Navigation',
      maxDepth: 2,
    },
    // The site's whole declared sidebar, the organize-your-admin-nav guide's worked shape: a
    // Content group for what an editor authors and owns, then a trailing Site group for site
    // management, inbound data, configuration, and roster. The custom and engine doors both place
    // by the same razor, what an editor authors versus what the site operates: Library joins
    // Content, since uploaded, described media is
    // the editor's material the same way posts and pages are (the WordPress-era convention of
    // Media beside Posts/Pages also matches a volunteer editor's muscle memory).
    // Tags stays in Site: vocabulary management is
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
    preview: {
      stylesheets: [themeCss, siteCss, themeOptionsCss, overridesCss],
      containerClass: 'site-main prose',
    },
  },
});

// Re-exported rather than parsed here: site-config.ts owns the one parseSiteConfig call, so a
// lean reader (the root layout server load) can pull just the parsed config and its primary menu
// without importing this whole adapter (the renderer, the icon set, the registered blocks).
export { siteConfig } from './site-config.js';
