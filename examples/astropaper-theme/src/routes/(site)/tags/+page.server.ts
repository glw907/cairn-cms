import type { PageServerLoad } from './$types';
import { posts } from '$chassis/content';

export const prerender = true;

/** Every distinct tag across the post index, alphabetical, styled after
 *  `src/pages/tags/index.astro` (MIT). AstroPaper ships no public tag pages by default in cairn
 *  (a site filters its own archive over the taxonomy field, per the showcase's own cairn.config.ts
 *  comment); this theme adds its own tags index and detail routes on top of the shared post
 *  index, the same way the showcase's `/calendar` route is a theme-owned composition. */
export const load: PageServerLoad = () => {
  const tags = new Set<string>();
  for (const post of posts.all()) {
    for (const tag of post.tags ?? []) tags.add(tag);
  }
  return { tags: [...tags].sort() };
};
