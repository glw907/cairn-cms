import type { PageServerLoad } from './$types';
import { posts } from '$chassis/content';

export const prerender = true;

/** The blog index, all posts newest-first, styled after `src/pages/blog/index.astro`. Foxi's
 *  own blog never paginates (six posts, one page), so this port matches that rather than
 *  reintroducing AstroPaper's numbered pagination for a listing this short. */
export const load: PageServerLoad = () => {
  const all = [...posts.all()].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  const tags = new Set<string>();
  for (const post of all) for (const tag of post.tags ?? []) tags.add(tag);
  return { posts: all, tags: [...tags].sort() };
};
