import { describe, expect, it } from 'vitest';
import { createRenderer, type CairnAdapter } from '@glw907/cairn-cms';
import type { SiteResolver } from '@glw907/cairn-cms/delivery';
import { feedItemsFrom } from './feed-items.js';

const ORIGIN = 'https://feed.test';

const render: CairnAdapter['rendering']['render'] = createRenderer().render;

/** A one-post site whose body includes a fragment and a media image. */
function stubSite(): SiteResolver {
  const post = {
    id: 'hello',
    concept: 'posts',
    title: 'Hello',
    permalink: '/hello',
    date: '2026-01-15',
    excerpt: 'A post.',
    tags: [],
    body: 'Intro.\n\n::include{fragment="notice"}\n\n![Summit](media:summit.00112233445566aa)\n',
  };
  const fragment = { id: 'notice', body: 'Carry the ten essentials.' };
  const index = {
    posts: { all: () => [post], byId: (id: string) => (id === post.id ? post : undefined) },
    fragments: {
      all: () => [fragment],
      byId: (id: string) => (id === fragment.id ? fragment : undefined),
    },
  } as const;
  return {
    concept: (id: string) => index[id as keyof typeof index],
    routable: (id: string) => id !== 'fragments',
  } as unknown as SiteResolver;
}

describe('feedItemsFrom', () => {
  it('throws naming the posts concept when the site has none', async () => {
    const site = { concept: () => undefined, routable: () => true } as unknown as SiteResolver;
    await expect(
      feedItemsFrom({ site, origin: ORIGIN, render, resolveMedia: () => undefined }),
    ).rejects.toThrow(/posts/);
  });

  it('renders an include through the fragment resolver and a media image at an absolute URL', async () => {
    const items = await feedItemsFrom({
      site: stubSite(),
      origin: ORIGIN,
      render,
      resolveMedia: () => '/media/summit.png',
    });
    expect(items).toHaveLength(1);
    const html = items[0].contentHtml;
    expect(html).toContain('Carry the ten essentials.');
    expect(html).not.toContain('::include');
    expect(html).toContain(`src="${ORIGIN}/media/summit.png"`);
    expect(html).not.toContain('src="/media/');
  });

  it('leaves an unresolved media token unresolved instead of inventing an origin URL', async () => {
    const items = await feedItemsFrom({
      site: stubSite(),
      origin: ORIGIN,
      render,
      resolveMedia: () => undefined,
    });
    expect(items[0].contentHtml).not.toContain(ORIGIN + '/media/');
  });
});
