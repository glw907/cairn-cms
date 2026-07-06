// The hugo-theme-gallery port's adapter: the media/gallery capability test (theme-ports-1-3, port
// 3). It declares one `pages` concept and NO `posts` concept: this theme has no blog, only a
// tree of photo albums (an interior node with children, or a leaf with a photo array) plus two
// plain prose pages (About, Imprint). That is the capability question itself, answered by what
// this one fieldset can and cannot express cleanly; see this theme's README for the verdict.
//
// Every page, whatever it renders as, shares ONE fieldset (cairn's fixed-concept rule: a concept
// has one shape). `parent` (a self-reference) gives an interior node its children and a leaf its
// back link; `categories` (a taxonomy multiselect) feeds the same cross-index mechanism Foxi's
// post tags already proved; `photos` (an array of a leaf image plus plain dimension/color/credit
// fields) carries a leaf album's justified-grid content. `ImageValue` (this engine's stored image
// shape) carries only `src`/`alt`/`caption`, no intrinsic width or height, so the justified-grid
// layout (which needs each photo's aspect ratio before it loads) carries `width`/`height` as
// sibling leaf fields on the same row rather than on the image value itself; this is the one
// friction point this port's capability verdict names. Every field but `title` is optional, since
// About and Imprint use none of `parent`/`categories`/`photos` at all: the theme infers a page's
// template (prose, gallery-listing, or photo-grid) from which optional fields are populated, not
// from an explicit discriminator the schema has no room for.
import { createRenderer, defineRegistry, fieldset, fields, defineAdapter, defineConcept, githubApp, parseSiteConfig } from '@glw907/cairn-cms';
import siteYaml from './site.config.yaml?raw';

// Zero registered components: every page's body is plain prose (About, Imprint) or has no body
// at all (an album page's own markdown content is empty; its data lives entirely in frontmatter).
const registry = defineRegistry({ components: [] });

const { renderMarkdown } = createRenderer(registry);

export const cairn = defineAdapter({
  content: {
    pages: defineConcept({
      dir: 'src/content/pages',
      label: 'Pages',
      singular: 'Page',
      routing: 'page',
      permalink: '/:slug',
      summaryFields: ['description', 'parent', 'categories', 'featured'],
      fields: fieldset({
        title: fields.text({ label: 'Title', required: true }),
        // The intro paragraph under the page's h1: a leaf album's summary, an interior node's
        // "N sub-albums" lead-in, or a prose page's own dek. Optional: a leaf photo page can omit it.
        description: fields.textarea({ label: 'Description' }),
        // Self-reference: the one mechanism that gives an interior node (Animals) its children
        // (Cats, Dogs) and a leaf its back link. Only an album page sets this.
        parent: fields.reference({ label: 'Parent album', concept: 'pages' }),
        // The cross-index a leaf album opts into (the /categories/:tag pages), the same taxonomy
        // mechanism Foxi's post tags already proved; About and Imprint set none.
        categories: fields.multiselect({ label: 'Categories', creatable: true, taxonomy: true }),
        // Marks the one album shown as the home's large hero card, instead of the plain grid.
        featured: fields.boolean({ label: 'Featured on home' }),
        // A leaf album's photo list. Each row's `photo` is the real `image` field type (the
        // engine's own leaf shape, `{ src, alt, caption? }`); `width`/`height`/`color` sit beside
        // it rather than inside it (ImageValue carries no intrinsic dimensions), so the justified
        // grid can lay out every row without waiting for each image to load.
        photos: fields.array(
          fields.object({
            fields: {
              photo: fields.image({ label: 'Photo', required: true }),
              width: fields.number({ label: 'Width', integer: true, required: true }),
              height: fields.number({ label: 'Height', integer: true, required: true }),
              color: fields.text({ label: 'Placeholder color' }),
              credit: fields.text({ label: 'Credit' }),
            },
          }),
          { label: 'Photos', itemLabel: 'Photo' },
        ),
      }),
    }),
  },
  // Never wired to a real GitHub App or email sender: this port ships no admin mount, so
  // nothing reads these beyond satisfying the adapter's required shape.
  backend: githubApp({ owner: 'gallery-theme', repo: 'demo', branch: 'main', appId: '1', installationId: '2' }),
  email: { from: 'cms@gallery-theme.test' },
  rendering: {
    render: ({ body, resolve }) => renderMarkdown(body, { resolve }),
    components: registry,
  },
});

export const siteConfig = parseSiteConfig(siteYaml);

// The backend's own non-secret identity, restated here rather than read back off `cairn.backend`
// (typed as the generic `BackendProvider`, which does not carry `owner`/`repo`): never wired to a
// real GitHub App (see the module comment above); kept only for parity with the other ports.
export const REPO = { owner: 'gallery-theme', repo: 'demo', branch: 'main' };
