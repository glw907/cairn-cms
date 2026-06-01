// cairn-cms: the SEO head builder (public-delivery design, decision 6). Returns plain data so
// the template renders it inside <svelte:head>. It covers the universal, mechanical tags;
// og:image art and richer JSON-LD types stay a template or plugin concern.

/** Inputs for the head. All URLs are absolute (built from PUBLIC_ORIGIN). */
export interface SeoInput {
  title: string;
  description: string;
  canonicalUrl: string;
  siteName: string;
  type?: 'website' | 'article';
  published?: string;
  modified?: string;
  feeds?: { rss?: string; json?: string };
  image?: string;
  /** A robots meta directive, e.g. "noindex, nofollow". Omitted from the head when absent. */
  robots?: string;
  /** Author name, emitted as article:author for the article type. */
  author?: string;
}

/** Plain-data head: a title, meta tags, link tags, and one JSON-LD object. */
export interface SeoMeta {
  title: string;
  meta: { name?: string; property?: string; content: string }[];
  links: { rel: string; type?: string; href: string; title?: string }[];
  jsonLd: Record<string, unknown>;
}

/** Build the head data for a page. */
export function buildSeoMeta(input: SeoInput): SeoMeta {
  const type = input.type ?? 'website';
  const meta: SeoMeta['meta'] = [
    { name: 'description', content: input.description },
    { property: 'og:title', content: input.title },
    { property: 'og:description', content: input.description },
    { property: 'og:type', content: type },
    { property: 'og:url', content: input.canonicalUrl },
    { property: 'og:site_name', content: input.siteName },
    { name: 'twitter:card', content: input.image ? 'summary_large_image' : 'summary' },
  ];
  if (input.image) {
    meta.push({ property: 'og:image', content: input.image });
    meta.push({ name: 'twitter:image', content: input.image });
  }

  if (input.robots) {
    meta.push({ name: 'robots', content: input.robots });
  }
  if (type === 'article') {
    if (input.published) meta.push({ property: 'article:published_time', content: input.published });
    if (input.modified) meta.push({ property: 'article:modified_time', content: input.modified });
    if (input.author) meta.push({ property: 'article:author', content: input.author });
  }

  const links: SeoMeta['links'] = [{ rel: 'canonical', href: input.canonicalUrl }];
  if (input.feeds?.rss) {
    links.push({ rel: 'alternate', type: 'application/rss+xml', href: input.feeds.rss, title: input.siteName });
  }
  if (input.feeds?.json) {
    links.push({ rel: 'alternate', type: 'application/feed+json', href: input.feeds.json, title: input.siteName });
  }

  const jsonLd: Record<string, unknown> =
    type === 'article'
      ? {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: input.title,
          description: input.description,
          url: input.canonicalUrl,
          ...(input.published ? { datePublished: input.published } : {}),
          ...(input.modified ? { dateModified: input.modified } : {}),
          ...(input.image ? { image: input.image } : {}),
        }
      : {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: input.siteName,
          description: input.description,
          url: input.canonicalUrl,
        };

  return { title: input.title, meta, links, jsonLd };
}
