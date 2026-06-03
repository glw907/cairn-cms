import type { PageServerLoad } from './$types';
import { posts } from '$lib/content';

export const prerender = true;

export const load: PageServerLoad = () => ({ posts: posts.all() });
