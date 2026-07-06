import type { PageServerLoad } from './$types';
import { posts } from '$chassis/content';
import { PER_PAGE } from '$theme/pagination';

export const prerender = true;

/** The posts index, page 1 of the AstroPaper-style paginated list. */
export const load: PageServerLoad = () => {
  const all = [...posts.all()].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  const totalPages = Math.max(1, Math.ceil(all.length / PER_PAGE));
  return { posts: all.slice(0, PER_PAGE), page: 1, totalPages };
};
