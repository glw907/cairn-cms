import { error } from '@sveltejs/kit';
import type { PageServerLoad, EntryGenerator } from './$types';
import { posts } from '$chassis/content';
import { PER_PAGE } from '$theme/pagination';

/** Every page number past page 1 (page 1 is the static `/posts` route above). */
export const entries: EntryGenerator = () => {
  const total = posts.all().length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  return Array.from({ length: Math.max(0, totalPages - 1) }, (_, i) => ({ page: String(i + 2) }));
};

export const prerender = true;

export const load: PageServerLoad = ({ params }) => {
  const page = Number(params.page);
  const all = [...posts.all()].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  const totalPages = Math.max(1, Math.ceil(all.length / PER_PAGE));
  if (!Number.isInteger(page) || page < 2 || page > totalPages) {
    error(404, 'Not found');
  }
  const start = (page - 1) * PER_PAGE;
  return { posts: all.slice(start, start + PER_PAGE), page, totalPages };
};
