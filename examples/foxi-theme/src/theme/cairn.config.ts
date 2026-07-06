// The Foxi port's adapter: the composed-page/marketing-section capability test (theme-ports-1-3,
// port 2). It declares a `posts` concept for the blog (Foxi's own tutorial/announcement posts,
// content-managed markdown) and a `pages` concept for long-form static content (Terms of
// Service). Every marketing route (home, features, pricing, FAQ, contact, changelog) is instead a
// hard-coded Svelte page built from theme components: cairn's content model manages markdown
// documents, not page-builder sections, so a pricing table or a testimonial wall is the theme's
// own composition, the same as any SvelteKit route, never a cairn concept. The render pipeline
// runs with an EMPTY component registry: Foxi's own blog posts (ported verbatim from the upstream
// repo's content, MIT) use stock markdown, no bespoke directive components.
import { createRenderer, defineRegistry, fieldset, fields, defineAdapter, defineConcept, githubApp, parseSiteConfig } from '@glw907/cairn-cms';
import siteYaml from './site.config.yaml?raw';

const registry = defineRegistry({ components: [] });

const { renderMarkdown } = createRenderer(registry);

export const cairn = defineAdapter({
  content: {
    posts: defineConcept({
      dir: 'src/content/posts',
      label: 'Posts',
      summaryFields: ['description', 'author', 'image'],
      routing: 'feed',
      // A 'feed' concept is always dated (identity model); the day-level datePrefix (the
      // default) names the file `YYYY-MM-DD-slug.md` while the URL slug is date-stripped,
      // matching Foxi's own plain `/blog/:slug` permalink.
      permalink: '/blog/:slug',
      fields: fieldset({
        title: fields.text({ label: 'Title', required: true }),
        date: fields.date({ label: 'Published' }),
        description: fields.textarea({ label: 'Description' }),
        author: fields.text({ label: 'Author' }),
        // Foxi's own post tags ('productivity', 'announcement', ...), the taxonomy this port's
        // /blog/tags index and per-tag filter read.
        tags: fields.multiselect({ label: 'Tags', creatable: true, taxonomy: true }),
        image: fields.text({ label: 'Cover image path' }),
      }),
    }),
    pages: defineConcept({
      dir: 'src/content/pages',
      label: 'Pages',
      routing: 'page',
      permalink: '/:slug',
      fields: fieldset({
        title: fields.text({ label: 'Title', required: true }),
      }),
    }),
  },
  // Never wired to a real GitHub App or email sender: this port ships no admin mount, so
  // nothing reads these beyond satisfying the adapter's required shape.
  backend: githubApp({ owner: 'foxi-theme', repo: 'demo', branch: 'main', appId: '1', installationId: '2' }),
  email: { from: 'cms@foxi-theme.test' },
  rendering: {
    render: ({ body, resolve }) => renderMarkdown(body, { resolve }),
    components: registry,
  },
});

export const siteConfig = parseSiteConfig(siteYaml);

// The backend's own non-secret identity, restated here rather than read back off `cairn.backend`:
// the single-post template's "Edit page" link (never wired to a real GitHub App; see the module
// comment above).
export const REPO = { owner: 'foxi-theme', repo: 'demo', branch: 'main' };
