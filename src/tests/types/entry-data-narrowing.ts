// The compile-only proof of `EntryData`'s contract, against the engine's sources: the type a site
// gets from `createPublicRoutes` narrows on `concept`, and the untyped default stays what any
// site's data assigns to. `npm run check` compiles this file (./tsconfig.json). Nothing in it runs.
import { fields } from '../../lib/content/fields.js';
import { defineConcept } from '../../lib/content/concepts.js';
import type { CairnAdapter } from '../../lib/content/types.js';
import { createPublicRoutes } from '../../lib/delivery/public-routes.js';
import type { EntryData, PublicRoutesConfig } from '../../lib/delivery/public-routes.js';
import { createSiteResolver } from '../../lib/delivery/site-resolver.js';
import type { SiteResolver } from '../../lib/delivery/site-resolver.js';
import type { PreviewData } from '../../lib/sveltekit/preview.js';

type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;
const expectTrue = <T extends true>(): T | void => undefined;

const posts = defineConcept({
  dir: 'src/content/posts',
  label: 'Posts',
  routing: 'dated',
  fields: {
    title: fields.text({ label: 'Title', required: true }),
    image: fields.image({ label: 'Hero image', seo: true }),
  },
});
const pages = defineConcept({
  dir: 'src/content/pages',
  label: 'Pages',
  routing: 'page',
  fields: { robots: fields.text({ label: 'Robots' }) },
});
declare const rest: Omit<CairnAdapter, 'content'>;
const adapter = { ...rest, content: { posts, pages } };

const site = createSiteResolver(adapter, {});
type Site = typeof site;

const routes = createPublicRoutes({
  site,
  render: async () => '',
  origin: 'https://example.test',
  siteName: 'Example',
  description: 'Example',
  resolveMedia: null,
});
const data = await routes.entryLoad({ url: new URL('https://example.test/') });

// Inference: `S` comes from `{ site }`, so the data is the concept union with no annotation.
expectTrue<Equal<typeof data, EntryData<Site>>>();
expectTrue<Equal<(typeof data)['concept'], 'posts' | 'pages'>>();

// Narrowing: each arm reads its own fieldset, and neither reads the other's.
if (data.concept === 'posts') {
  const src: string | undefined = data.entry.frontmatter.image?.src;
  void src;
  // @ts-expect-error robots is declared on pages, not on posts
  void data.entry.frontmatter.robots;
} else {
  const robots: string | undefined = data.entry.frontmatter.robots;
  void robots;
  // @ts-expect-error image is declared on posts, not on pages
  void data.entry.frontmatter.image;
}

// The arm's frontmatter is the type the resolver's concept index returns, so the two reads of a
// fieldset cannot drift apart.
const postEntry = site.concept('posts').byId('hello');
expectTrue<
  Equal<Extract<typeof data, { concept: 'posts' }>['entry']['frontmatter'], NonNullable<typeof postEntry>['frontmatter']>
>();

// The untyped default: a plain string concept and a plain record, for a resolver and with no argument.
expectTrue<Equal<EntryData, EntryData<SiteResolver>>>();
expectTrue<Equal<EntryData['concept'], string>>();
expectTrue<Equal<EntryData['entry']['frontmatter'], Record<string, unknown>>>();

// Widening: typed data assigns to the default, so one helper or template takes any site's data.
const widened: EntryData = data;
void widened;
const widenedConfig: PublicRoutesConfig = {} as PublicRoutesConfig<Site>;
void widenedConfig;

// @ts-expect-error the default does not narrow back to a site's union
const narrowed: EntryData<Site> = widened;
void narrowed;

// PreviewData is the default arm plus exactly `preview`.
expectTrue<Equal<Exclude<keyof PreviewData, keyof EntryData>, 'preview'>>();
const previewed: EntryData = {} as PreviewData;
void previewed;
