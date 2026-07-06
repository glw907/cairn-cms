import type { PageServerLoad } from './$types';
import { posts } from '$chassis/content';

export const prerender = true;

/** The tags landing page, styled after `src/pages/blog/tags/index.astro`
 *  (oxygenna-themes/foxi-astro-theme, MIT): every distinct tag, alphabetical, plus the full
 *  unfiltered post grid the upstream page shows below the tag row. */
export const load: PageServerLoad = () => {
  const all = [...posts.all()].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  const tags = new Set<string>();
  for (const post of all) for (const tag of post.tags ?? []) tags.add(tag);
  return { posts: all, tags: [...tags].sort() };
};
