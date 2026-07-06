// The AstroPaper port's adapter: the pure theme-seam proof (theme-ports-1-3, port 1). It
// declares one post-like concept and a plain page concept, a render that runs the engine
// pipeline with an EMPTY component registry, and a backend/email pair that satisfy the
// adapter's required shape but are never exercised (this port mounts no admin). AstroPaper's
// own markdown content (tutorials, release notes) uses plain prose, lists, and code fences,
// no bespoke directive components, which is exactly the capability question this port answers.
import { createRenderer, defineRegistry, fieldset, fields, defineAdapter, defineConcept, githubApp, parseSiteConfig } from '@glw907/cairn-cms';
import siteYaml from './site.config.yaml?raw';

// Zero registered components: the capability test. AstroPaper's real content (tutorials, release
// notes, FAQs) renders entirely from stock markdown (headings, lists, code fences, tables,
// blockquotes) plus the two custom prose gestures cairn already ships as raw HTML/CSS (the
// hash-tag styled inline code is plain markdown backticks). Nothing here needed a defineComponent.
const registry = defineRegistry({ components: [] });

// The real render path: parse markdown through the engine with no registered components. The
// sanitize extension admits `data-filename` on a `<div>`, the one attribute this port's raw-HTML
// code-card device needs (see the how-to-configure post): the filename tab is authored content,
// not a registered component, so it only needs a floor attribute, never a defineComponent entry.
const { renderMarkdown } = createRenderer(registry, {
  sanitizeSchema: (defaults) => ({
    ...defaults,
    attributes: { ...defaults.attributes, '*': [...(defaults.attributes?.['*'] ?? []), 'dataFilename'] },
  }),
});

export const cairn = defineAdapter({
  content: {
    posts: defineConcept({
      dir: 'src/content/posts',
      label: 'Posts',
      summaryFields: ['description', 'featured'],
      routing: 'feed',
      // A 'feed' concept is always dated (identity model); the day-level datePrefix (the
      // default) names the file `YYYY-MM-DD-slug.md` while the URL slug is date-stripped, which
      // matches AstroPaper's own plain `/posts/:slug` permalink exactly.
      permalink: '/posts/:slug',
      fields: fieldset({
        title: fields.text({ label: 'Title', required: true }),
        date: fields.date({ label: 'Published' }),
        modDate: fields.date({ label: 'Updated' }),
        description: fields.textarea({ label: 'Description' }),
        // AstroPaper's tag list per post; the "topics" taxonomy marker from the showcase, renamed
        // to match this theme's own vocabulary.
        tags: fields.multiselect({ label: 'Tags', creatable: true, taxonomy: true }),
        // Pins a post above "Recent Posts" on the home template, the same distinction AstroPaper's
        // own `data.featured` frontmatter flag draws.
        featured: fields.boolean({ label: 'Featured' }),
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
  backend: githubApp({ owner: 'astropaper-theme', repo: 'demo', branch: 'main', appId: '1', installationId: '2' }),
  email: { from: 'cms@astropaper-theme.test' },
  rendering: {
    render: ({ body, resolve }) => renderMarkdown(body, { resolve }),
    components: registry,
  },
});

export const siteConfig = parseSiteConfig(siteYaml);

// The backend's own non-secret identity, restated here rather than read back off `cairn.backend`
// (typed as the generic `BackendProvider`, which does not carry `owner`/`repo`): the single-post
// template's "Edit page" link (never wired to a real GitHub App; see the module comment above).
export const REPO = { owner: 'astropaper-theme', repo: 'demo', branch: 'main' };
