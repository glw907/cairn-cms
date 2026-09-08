import { error } from '@sveltejs/kit';
import type { PageServerLoad, EntryGenerator } from './$types';
import { posts } from '$chassis/content.js';
import { paginateArchive } from '$chassis/archive.js';

export const prerender = true;

// The full archive minus the page-one lead (the same slice the home route paginates page one
// from), so this route's page count always agrees with the home page's. posts.all() is already
// newest-first (a dated concept's engine ordering contract, documented in
// docs/reference/delivery.md), so no re-sort is needed here.
function archiveEntries() {
  return posts.all().slice(1);
}

// Page one is the home route ("/"); this route only ever serves page two and on, so the
// generator starts there and stops at the last real page.
export const entries: EntryGenerator = () => {
  const { totalPages } = paginateArchive(archiveEntries(), 2);
  const pages: { page: string }[] = [];
  for (let page = 2; page <= totalPages; page++) pages.push({ page: String(page) });
  return pages;
};

export const load: PageServerLoad = ({ params }) => {
  const requested = Number(params.page);
  if (!Number.isInteger(requested) || requested < 2) error(404, 'Not found');
  const archive = paginateArchive(archiveEntries(), requested);
  // paginateArchive clamps an out-of-range page into range rather than returning nothing; a
  // request past the last real page must 404 instead of silently re-serving the last one.
  if (archive.page !== requested) error(404, 'Not found');
  return { archive };
};
