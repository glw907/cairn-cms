import type { PageServerLoad } from './$types';
import { posts } from '$chassis/content';

export const prerender = true;

/** Every distinct tag across the post index, alphabetical. */
export const load: PageServerLoad = () => {
  const tags = new Set<string>();
  for (const post of posts.all()) for (const tag of post.tags ?? []) tags.add(tag);
  return { tags: [...tags].sort() };
};
