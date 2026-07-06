import type { PageServerLoad } from './$types';
import { posts } from '$chassis/content';

export const prerender = true;

/** The home reads the whole post index; it derives featured/recent right in the template,
 *  matching AstroPaper's own `src/pages/index.astro`. */
export const load: PageServerLoad = () => ({ posts: posts.all() });
